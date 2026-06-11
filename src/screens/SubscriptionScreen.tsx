import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  type SubscriptionPlan,
  useGetPlansQuery,
  useSignoutMutation,
} from '../services/authApi';
import {
  type PurchaseSubscriptionResponse,
  usePurchaseSubscriptionMutation,
  useVerifyRazorpaySubscriptionMutation,
} from '../services/subscriptionApi';
import {showDialog} from '../context/DialogProvider';
import {activateSubscription} from '../features/authTokenSlice';
import {performAppLogout} from '../store';
import {useAppDispatch, useAppSelector} from '../useAppHooks';
import {
  Card,
  GradientButton,
  LoginScreenBackground,
  LogOutIcon,
  ShieldIcon,
} from '../components/ui';
import {colors, radii, spacing, typography} from '../theme';
import {formatMoney} from '../utils/currency';
import {
  getRazorpayErrorMessage,
  isRazorpayUserCancelled,
  openRazorpaySubscriptionCheckout,
} from '../utils/razorpayCheckout';
import {
  buildRazorpayContact,
  getSubscriptionPlanPrice,
  humanizeSubscriptionMessage,
  isPaidSubscriptionPlan,
} from '../utils/subscriptionPlan';
import {
  maxContentWidth,
  moderateScale,
  scale,
  verticalScale,
} from '../utils/responsive';

function formatPlanPrice(plan: SubscriptionPlan): string {
  const price = getSubscriptionPlanPrice(plan);
  if (price <= 0) {
    return 'Free';
  }
  return formatMoney(price, plan.currency, 0);
}

function getPlanButtonTitle(plan: SubscriptionPlan): string {
  return isPaidSubscriptionPlan(plan) ? 'Subscribe & Pay' : 'Activate Free Plan';
}

function PlanCard({
  plan,
  onSubscribe,
  subscribing,
  disabled,
  disabledHint,
}: {
  plan: SubscriptionPlan;
  onSubscribe: (plan: SubscriptionPlan) => void;
  subscribing: boolean;
  disabled?: boolean;
  disabledHint?: string;
}) {
  const hasDiscount =
    plan.offerPrice > 0 && plan.offerPrice < plan.amount;

  return (
    <Card
      style={{
        ...styles.planCard,
        ...(plan.isRecommended ? styles.planCardRecommended : {}),
        ...(disabled ? styles.planCardDisabled : {}),
      }}>
      {plan.isRecommended ? (
        <View style={styles.recommendedBadge}>
          <Text style={styles.recommendedText}>Recommended</Text>
        </View>
      ) : null}

      <Text style={styles.planName}>{plan.packageName}</Text>
      <Text style={styles.planType}>
        {plan.packageType.charAt(0).toUpperCase() + plan.packageType.slice(1)}{' '}
        plan
      </Text>

      <View style={styles.priceRow}>
        <Text style={styles.price}>{formatPlanPrice(plan)}</Text>
        {hasDiscount ? (
          <Text style={styles.originalPrice}>
            {formatMoney(plan.amount, plan.currency, 0)}
          </Text>
        ) : null}
      </View>

      <Text style={styles.duration}>
        {plan.durationDays} day{plan.durationDays === 1 ? '' : 's'} access
      </Text>

      {plan.additionalFeatures.length > 0 ? (
        <View style={styles.features}>
          {plan.additionalFeatures.map(feature => (
            <Text key={feature} style={styles.featureItem}>
              • {feature}
            </Text>
          ))}
        </View>
      ) : null}

      {disabledHint ? (
        <Text style={styles.disabledHint}>{disabledHint}</Text>
      ) : null}

      <GradientButton
        title={getPlanButtonTitle(plan)}
        onPress={() => onSubscribe(plan)}
        loading={subscribing}
        disabled={disabled}
        showArrow={false}
        style={styles.subscribeBtn}
      />
    </Card>
  );
}

export const SubscriptionScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.authToken.user);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [signout, {isLoading: signingOut}] = useSignoutMutation();
  const [purchaseSubscription] = usePurchaseSubscriptionMutation();
  const [verifyRazorpaySubscription] = useVerifyRazorpaySubscriptionMutation();
  const {
    data: plansRes,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetPlansQuery({lang: 'en'});

  const plans = plansRes?.plans ?? [];

  const completeActivation = useCallback(
    (payload: {
      subscriptionId?: string | null;
      endsAt?: string | null;
      isFreePlan?: boolean;
      successMessage?: string;
    }) => {
      dispatch(
        activateSubscription({
          subscription_id: payload.subscriptionId ?? null,
          subscription_end: payload.endsAt ?? null,
          is_free_plan_used: payload.isFreePlan ? true : user?.is_free_plan_used,
        }),
      );
      showDialog(
        'Subscription active',
        payload.successMessage ??
          'Your subscription is now active. You can start using the app.',
        [{text: 'Continue'}],
      );
    },
    [dispatch, user?.is_free_plan_used],
  );

  const handlePaidCheckout = useCallback(
    async (plan: SubscriptionPlan, purchase: PurchaseSubscriptionResponse) => {
      if (!purchase.key || !purchase.subscriptionId) {
        showDialog(
          'Payment unavailable',
          'Payment details are missing. Please try again or contact support.',
        );
        return;
      }

      try {
        const payment = await openRazorpaySubscriptionCheckout({
          key: purchase.key,
          subscriptionId: purchase.subscriptionId,
          planName: purchase.planName ?? plan.packageName,
          customerName: purchase.customerName ?? user?.name ?? undefined,
          customerEmail: purchase.customerEmail ?? user?.email ?? undefined,
          customerPhone: buildRazorpayContact(
            user?.phone,
            user?.phone_country_code,
          ),
          currency: purchase.currency ?? plan.currency,
        });

        const razorpaySubscriptionId =
          payment.razorpay_subscription_id ?? purchase.subscriptionId;

        if (
          !payment.razorpay_payment_id ||
          !payment.razorpay_signature ||
          !razorpaySubscriptionId
        ) {
          showDialog(
            'Verification failed',
            'Payment response is incomplete. Please contact support if amount was deducted.',
          );
          return;
        }

        const verifyRes = await verifyRazorpaySubscription({
          razorpay_payment_id: payment.razorpay_payment_id,
          razorpay_subscription_id: razorpaySubscriptionId,
          razorpay_signature: payment.razorpay_signature,
          plan_id: plan.id,
        }).unwrap();

        if (!verifyRes?.success) {
          showDialog(
            'Verification failed',
            humanizeSubscriptionMessage(verifyRes?.message),
          );
          return;
        }

        completeActivation({
          subscriptionId:
            verifyRes.subscriptionId ?? razorpaySubscriptionId,
          endsAt: verifyRes.endsAt,
          successMessage:
            verifyRes.message ??
            `Payment successful. ${purchase.planName ?? plan.packageName} is now active.`,
        });
      } catch (error) {
        if (isRazorpayUserCancelled(error)) {
          return;
        }
        const apiMessage = (error as {data?: {message?: string}})?.data?.message;
        if (apiMessage) {
          showDialog(
            'Verification failed',
            humanizeSubscriptionMessage(apiMessage),
          );
          return;
        }
        showDialog('Payment failed', getRazorpayErrorMessage(error));
      }
    },
    [completeActivation, user, verifyRazorpaySubscription],
  );

  const onSubscribe = useCallback(
    async (plan: SubscriptionPlan) => {
      if (selectedPlanId) {
        return;
      }

      const isFreePlan = !isPaidSubscriptionPlan(plan);
      if (isFreePlan && user?.is_free_plan_used) {
        showDialog(
          'Free plan unavailable',
          humanizeSubscriptionMessage('free_plan_already_used'),
        );
        return;
      }

      setSelectedPlanId(plan.id);
      try {
        const res = await purchaseSubscription({plan_id: plan.id}).unwrap();

        if (!res?.success) {
          showDialog(
            'Subscription',
            humanizeSubscriptionMessage(res?.message),
          );
          return;
        }

        if (res.action === 'free_activated') {
          completeActivation({
            subscriptionId: res.subscriptionId,
            endsAt: res.endsAt,
            isFreePlan: true,
            successMessage: humanizeSubscriptionMessage(
              res.message ?? 'free_plan_activated',
            ),
          });
          return;
        }

        if (res.action === 'checkout_ready') {
          await handlePaidCheckout(plan, res);
          return;
        }

        showDialog(
          'Subscription',
          humanizeSubscriptionMessage(res.message),
        );
      } catch (e: any) {
        showDialog(
          'Subscription failed',
          humanizeSubscriptionMessage(e?.data?.message),
        );
      } finally {
        setSelectedPlanId(null);
      }
    },
    [
      completeActivation,
      handlePaidCheckout,
      purchaseSubscription,
      selectedPlanId,
      user?.is_free_plan_used,
    ],
  );

  const onGoToLogin = useCallback(
    () => performAppLogout(dispatch, () => signout().unwrap()),
    [dispatch, signout],
  );

  return (
    <LoginScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={() => {
                void refetch();
              }}
              tintColor={colors.green}
            />
          }>
          <View style={styles.contentWrap}>
            <TouchableOpacity
              style={styles.backToLoginBtn}
              onPress={() => {
                void onGoToLogin();
              }}
              disabled={signingOut}
              activeOpacity={0.85}>
              <LogOutIcon size={moderateScale(18)} color={colors.navy} />
              <Text style={styles.backToLoginText}>
                {signingOut ? 'Signing out…' : 'Back to Login'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.title}>Choose Your Plan</Text>
            <Text style={styles.subtitle}>
              {user?.name
                ? `Hi ${user.name}, pick a plan to start using POS.`
                : 'Pick a plan to start using POS.'}
            </Text>

            {isLoading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.green} />
                <Text style={styles.loadingText}>Loading plans…</Text>
              </View>
            ) : isError ? (
              <Card style={styles.stateCard}>
                <Text style={styles.stateTitle}>Unable to load plans</Text>
                <Text style={styles.stateMessage}>
                  Check your connection and pull down to refresh.
                </Text>
                <GradientButton
                  title="Retry"
                  onPress={() => {
                    void refetch();
                  }}
                  showArrow={false}
                  style={styles.retryBtn}
                />
              </Card>
            ) : plans.length === 0 ? (
              <Card style={styles.stateCard}>
                <Text style={styles.stateTitle}>No plans available</Text>
                <Text style={styles.stateMessage}>
                  Contact support to activate your account.
                </Text>
              </Card>
            ) : (
              plans.map(plan => {
                const isFreePlan = !isPaidSubscriptionPlan(plan);
                const freePlanUsed = isFreePlan && user?.is_free_plan_used;
                return (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    onSubscribe={planItem => {
                      void onSubscribe(planItem);
                    }}
                    subscribing={selectedPlanId === plan.id}
                    disabled={Boolean(freePlanUsed)}
                    disabledHint={
                      freePlanUsed
                        ? 'You have already used the free plan.'
                        : undefined
                    }
                  />
                );
              })
            )}

            <View style={styles.noteRow}>
              <ShieldIcon size={moderateScale(16)} color={colors.muted} />
              <Text style={styles.noteText}>
                Free plans activate instantly. Paid plans open secure Razorpay
                checkout to complete your subscription.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LoginScreenBackground>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1},
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: verticalScale(24),
    paddingBottom: spacing.xxxl,
    alignItems: 'center',
  },
  contentWrap: {
    width: '100%',
    maxWidth: maxContentWidth(),
    alignItems: 'center',
  },
  backToLoginBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: spacing.md,
    paddingVertical: verticalScale(8),
    paddingHorizontal: spacing.sm,
  },
  backToLoginText: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: colors.navy,
  },
  title: {
    ...typography.hero,
    fontSize: moderateScale(34),
    textAlign: 'center',
    color: colors.navy,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: moderateScale(14),
    color: colors.muted,
    textAlign: 'center',
    lineHeight: moderateScale(20),
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  centered: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
    width: '100%',
  },
  loadingText: {
    fontSize: moderateScale(14),
    color: colors.muted,
    fontWeight: '600',
  },
  stateCard: {
    width: '100%',
    padding: moderateScale(20),
    alignItems: 'center',
  },
  stateTitle: {
    ...typography.subtitle,
    fontSize: moderateScale(18),
    color: colors.navy,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  stateMessage: {
    fontSize: moderateScale(14),
    color: colors.muted,
    textAlign: 'center',
    lineHeight: moderateScale(20),
  },
  retryBtn: {
    marginTop: spacing.lg,
    width: '100%',
  },
  planCard: {
    width: '100%',
    padding: moderateScale(20),
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  planCardRecommended: {
    borderColor: colors.green,
    borderWidth: 2,
  },
  planCardDisabled: {
    opacity: 0.72,
  },
  recommendedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: radii.pill,
    marginBottom: spacing.sm,
  },
  recommendedText: {
    fontSize: moderateScale(12),
    fontWeight: '700',
    color: colors.green,
  },
  planName: {
    ...typography.subtitle,
    fontSize: moderateScale(22),
    color: colors.navy,
  },
  planType: {
    marginTop: verticalScale(4),
    fontSize: moderateScale(13),
    color: colors.muted,
    textTransform: 'capitalize',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
    flexWrap: 'wrap',
  },
  price: {
    fontSize: moderateScale(28),
    fontWeight: '800',
    color: colors.navy,
  },
  originalPrice: {
    fontSize: moderateScale(16),
    color: colors.mutedLight,
    textDecorationLine: 'line-through',
    marginBottom: verticalScale(4),
  },
  duration: {
    marginTop: spacing.xs,
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: colors.muted,
  },
  features: {
    marginTop: spacing.md,
    gap: verticalScale(4),
  },
  featureItem: {
    fontSize: moderateScale(13),
    color: colors.muted,
    lineHeight: moderateScale(18),
  },
  disabledHint: {
    marginTop: spacing.sm,
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: colors.error,
  },
  subscribeBtn: {
    marginTop: spacing.lg,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    width: '100%',
  },
  noteText: {
    flex: 1,
    fontSize: moderateScale(13),
    color: colors.muted,
    lineHeight: moderateScale(18),
  },
});
