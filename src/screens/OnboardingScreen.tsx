import React, {useRef, useState} from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {BrandHeader, GradientButton, ScreenBackground} from '../components/ui';
import {colors, radii, spacing, typography} from '../theme';
import type {AuthStackParamList} from '../navigation/types';
import {setOnboardingComplete} from '../storage/appStorage';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

const {width: SCREEN_W} = Dimensions.get('window');

type Slide = {
  id: string;
  headline: string;
  headlineColors: string[];
  body: string;
  features: {icon: string; title: string; desc: string; color: string}[];
};

const SLIDES: Slide[] = [
  {
    id: '1',
    headline: 'Fast Billing.\nSmart Service.\nHappy Guests.',
    headlineColors: [colors.navy, colors.green, colors.orange],
    body: 'Take orders in seconds with a waiter-first POS built for restaurants.',
    features: [
      {icon: '⚡', title: 'Fast Billing', desc: 'Create orders in seconds', color: colors.green},
      {icon: '📦', title: 'Live Menu', desc: 'Synced from your kitchen', color: colors.orange},
      {icon: '👥', title: 'Table Service', desc: 'Assign tables quickly', color: colors.blue},
      {icon: '📊', title: 'Shift Overview', desc: 'Track today at a glance', color: colors.purple},
    ],
  },
  {
    id: '2',
    headline: 'Real-Time Insights.\nSmarter Decisions.\nBetter Growth.',
    headlineColors: [colors.navy, colors.green, colors.orange],
    body: 'See orders, revenue, and activity from your shift dashboard.',
    features: [
      {icon: '📈', title: 'Live Stats', desc: 'Orders and revenue today', color: colors.green},
      {icon: '📋', title: 'Order History', desc: 'Recent sales at a tap', color: colors.orange},
      {icon: '🍽', title: 'Variants & Addons', desc: 'Configure every dish', color: colors.blue},
      {icon: '🔔', title: 'Quick Alerts', desc: 'Menu and cart reminders', color: colors.purple},
    ],
  },
  {
    id: '3',
    headline: 'Manage Everything.\nFrom Anywhere.\nAnytime.',
    headlineColors: [colors.navy, colors.green, colors.orange],
    body: 'Sign in once and serve guests from any device on your floor.',
    features: [
      {icon: '🌐', title: 'Access Anywhere', desc: 'Works on your mobile', color: colors.green},
      {icon: '👤', title: 'Waiter Accounts', desc: 'Secure staff login', color: colors.orange},
      {icon: '🛡', title: 'Secure & Reliable', desc: 'Token-based sessions', color: colors.blue},
      {icon: '☁', title: 'Auto Sync', desc: 'Menu updates from server', color: colors.purple},
    ],
  },
];

export const OnboardingScreen: React.FC<Props> = ({navigation}) => {
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    setIndex(i);
  };

  const finish = async () => {
    await setOnboardingComplete();
    navigation.replace('Login');
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({index: index + 1, animated: true});
      setIndex(index + 1);
    } else {
      finish();
    }
  };

  const renderSlide = ({item}: {item: Slide}) => {
    const lines = item.headline.split('\n');
    return (
      <View style={[styles.slide, {width: SCREEN_W}]}>
        <Text style={styles.slideBody}>{item.body}</Text>
        <View style={styles.headlineBlock}>
          {lines.map((line, i) => (
            <Text
              key={line}
              style={[
                styles.headlineLine,
                {color: item.headlineColors[i] ?? colors.navy},
              ]}>
              {line}
            </Text>
          ))}
        </View>
        <View style={styles.featureList}>
          {item.features.map(f => (
            <View key={f.title} style={styles.featureRow}>
              <View style={[styles.featureIcon, {backgroundColor: `${f.color}18`}]}>
                <Text style={styles.featureEmoji}>{f.icon}</Text>
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topRow}>
          <BrandHeader compact />
          <TouchableOpacity onPress={finish} hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
            <Text style={styles.skip}>Skip</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          ref={listRef}
          data={SLIDES}
          keyExtractor={s => s.id}
          renderItem={renderSlide}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScroll}
          getItemLayout={(_, i) => ({
            length: SCREEN_W,
            offset: SCREEN_W * i,
            index: i,
          })}
        />

        <View style={styles.footer}>
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === index && styles.dotActive]}
              />
            ))}
          </View>
          <GradientButton
            title={index === SLIDES.length - 1 ? 'Get Started' : 'Next'}
            onPress={next}
          />
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1},
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  skip: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.muted,
  },
  slide: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  slideBody: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  headlineBlock: {marginBottom: spacing.xl},
  headlineLine: {
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  featureList: {gap: spacing.md},
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureEmoji: {fontSize: 22},
  featureText: {flex: 1},
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
  },
  featureDesc: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.orange,
    width: 20,
  },
});
