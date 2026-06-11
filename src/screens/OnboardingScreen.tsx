import React, { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { GradientButton, Icon, ScreenBackground } from '../components/ui';
import type { IconName } from '../components/ui';
import { colors, spacing } from '../theme';
import type { AuthStackParamList } from '../navigation/types';
import { setOnboardingComplete } from '../storage/appStorage';
import {
  maxContentWidth,
  moderateScale,
  scale,
  verticalScale,
} from '../utils/responsive';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

const SLIDE_PAD = scale(24);
const COMPACT_HEIGHT = verticalScale(680);

type CardFeature = {
  iconName: IconName;
  title: string;
};

type Slide = {
  id: string;
  titleLines: string[];
  body: string;
  image: any;
  cardFeatures: CardFeature[];
};

const SLIDES: Slide[] = [
  {
    id: '1',
    titleLines: ['Smart Billing.', 'Complete Business', 'Control.'],
    body: 'Manage your business, streamline operations and grow faster with SwadeshPOS.',
    image: require('../assets/mobile-1.png'),
    cardFeatures: [
      { iconName: 'clock', title: 'Fast Billing' },
      { iconName: 'package', title: 'Smart Inventory' },
      { iconName: 'users', title: 'Customer Management' },
      { iconName: 'bar-chart', title: 'Real-Time Reports' },
    ],
  },
  {
    id: '2',
    titleLines: ['Real-Time Insights.', 'Smarter Decisions.', 'Better Growth.'],
    body: 'Get real-time reports and powerful analytics to track performance and grow your business.',
    image: require('../assets/mobile-2.png'),
    cardFeatures: [
      {
        iconName: 'trending-up',
        title: 'Real-Time Reports'
      },
      {
        iconName: 'bar-chart',
        title: 'Smart Analytics',
      },
      {
        iconName: 'clipboard',
        title: 'Custom Reports',
      },
      {
        iconName: 'bell',
        title: 'Instant Alerts',
      },
    ],
  },
  {
    id: '3',
    titleLines: ['Manage Everything.', 'From Anywhere.', 'Anytime.'],
    body: 'Access your business, manage your team and stay in control - anytime, anywhere with SwadeshPOS.',
    image: require('../assets/mobile-3.png'),
    cardFeatures: [
      {
        iconName: 'globe',
        title: 'Access Anywhere',
      },
      {
        iconName: 'users',
        title: 'Team Management',
      },
      {
        iconName: 'shield',
        title: 'Secure & Reliable',
      },
      {
        iconName: 'globe',
        title: 'Auto Sync',
      },
    ],
  },
];

export const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const compact = screenHeight < COMPACT_HEIGHT;
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const slideMetrics = useMemo(
    () => ({
      headlineSize: moderateScale(compact ? 24 : 28),
      headlineLine: moderateScale(compact ? 30 : 38),
      bodySize: moderateScale(compact ? 13 : 15),
      bodyLine: moderateScale(compact ? 18 : 22),
      heroMaxHeight: Math.min(
        screenHeight * (compact ? 0.28 : 0.34),
        verticalScale(compact ? 220 : 300),
      ),
      featureIcon: moderateScale(compact ? 34 : 40),
      featureTitle: moderateScale(compact ? 10 : 11),
    }),
    [compact, screenHeight],
  );

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
    setIndex(i);
  };

  const finish = async () => {
    await setOnboardingComplete();
    navigation.replace('Login');
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
      setIndex(index + 1);
    } else {
      finish();
    }
  };

  const renderCenteredSlide = (item: Slide) => (
    <View style={[styles.slide, { width: screenWidth }]}>
      <View style={styles.slideInner}>
        <View style={[styles.slideOneHeader, compact && styles.slideOneHeaderCompact]}>
          {item.titleLines.map((line, i) => (
            <Text
              key={line}
              style={[
                styles.slideOneHeadline,
                {
                  fontSize: slideMetrics.headlineSize,
                  lineHeight: slideMetrics.headlineLine,
                },
                i === 1
                  ? styles.slideOneHeadlineGreen
                  : i === 2
                    ? styles.slideOneHeadlineOrange
                    : styles.slideOneHeadlineNavy,
              ]}>
              {line}
            </Text>
          ))}
          {item.id === '1' || item.id === '3' ? (
            <Text
              style={[
                styles.slideOneBody,
                compact && styles.slideOneBodyCompact,
                {
                  fontSize: slideMetrics.bodySize,
                  lineHeight: slideMetrics.bodyLine,
                },
              ]}>
              {item.id === '1'
                ? 'Manage your business, streamline operations and grow faster with '
                : 'Access your business, manage your team and stay in control - anytime, anywhere with '}
              <Text style={styles.slideOneBodyBold}>SwadeshPOS</Text>.
            </Text>
          ) : (
            <Text
              style={[
                styles.slideOneBody,
                compact && styles.slideOneBodyCompact,
                {
                  fontSize: slideMetrics.bodySize,
                  lineHeight: slideMetrics.bodyLine,
                },
              ]}>
              {item.body}
            </Text>
          )}
          <View style={[styles.slideOneAccent, compact && styles.slideOneAccentCompact]} />
        </View>

        <View style={styles.slideOneHero}>
          <Image
            source={item.image}
            style={[
              styles.slideOneImage,
              { maxHeight: slideMetrics.heroMaxHeight },
            ]}
            resizeMode="contain"
          />
        </View>

        <View style={[styles.slideOneFeatureCard, compact && styles.slideOneFeatureCardCompact]}>
          {item.cardFeatures.map((f, i) => (
            <React.Fragment key={f.title}>
              <View style={styles.slideOneFeatureCol}>
                <View
                  style={[
                    styles.slideOneFeatureIcon,
                    {
                      width: slideMetrics.featureIcon,
                      height: slideMetrics.featureIcon,
                      borderRadius: slideMetrics.featureIcon / 2,
                    },
                    compact && styles.slideOneFeatureIconCompact,
                  ]}>
                  <Icon
                    name={f.iconName}
                    size={moderateScale(compact ? 16 : 20)}
                    color={colors.green}
                  />
                </View>
                <Text
                  style={[
                    styles.slideOneFeatureTitle,
                    compact && styles.slideOneFeatureTitleCompact,
                    { fontSize: slideMetrics.featureTitle },
                  ]}
                  numberOfLines={2}>
                  {f.title}
                </Text>
              </View>
              {i < item.cardFeatures.length - 1 ? (
                <View style={styles.slideOneFeatureDivider} />
              ) : null}
            </React.Fragment>
          ))}
        </View>
      </View>
    </View>
  );

  const renderSlide = ({ item }: { item: Slide }) => renderCenteredSlide(item);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topRow}>
          <View />
          <TouchableOpacity
            onPress={finish}
            hitSlop={{
              top: scale(12),
              bottom: scale(12),
              left: scale(12),
              right: scale(12),
            }}>
            <Text style={styles.skip}>Skip</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          ref={listRef}
          style={styles.list}
          data={SLIDES}
          keyExtractor={s => s.id}
          renderItem={renderSlide}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScroll}
          getItemLayout={(_, i) => ({
            length: screenWidth,
            offset: screenWidth * i,
            index: i,
          })}
        />

        <View style={styles.footer}>
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
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
  safe: { flex: 1 },
  list: { flex: 1 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    maxWidth: maxContentWidth(),
    alignSelf: 'center',
    width: '100%',
  },
  skip: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#3E4B74',
  },
  slide: {
    flex: 1,
  },
  slideInner: {
    flex: 1,
    paddingHorizontal: SLIDE_PAD,
    maxWidth: maxContentWidth(),
    alignSelf: 'center',
    width: '100%',
    justifyContent: 'space-between',
  },
  slideOneHeader: {
    width: '100%',
    flexShrink: 0,
  },
  slideOneHeaderCompact: {
    marginBottom: verticalScale(2),
  },
  slideOneHeadline: {
    fontWeight: '800',
    letterSpacing: -0.3,
    textAlign: 'left',
    width: '100%',
  },
  slideOneHeadlineNavy: {
    color: colors.navy,
  },
  slideOneHeadlineGreen: {
    color: colors.green,
  },
  slideOneHeadlineOrange: {
    color: colors.orange,
  },
  slideOneBody: {
    marginTop: verticalScale(10),
    color: '#5F6981',
    fontWeight: '400',
    textAlign: 'left',
    width: '100%',
  },
  slideOneBodyCompact: {
    marginTop: verticalScale(6),
  },
  slideOneBodyBold: {
    fontWeight: '700',
    color: colors.navy,
  },
  slideOneAccent: {
    marginTop: verticalScale(10),
    width: scale(56),
    height: verticalScale(3),
    borderRadius: moderateScale(2),
    backgroundColor: colors.orange,
    alignSelf: 'flex-start',
  },
  slideOneAccentCompact: {
    marginTop: verticalScale(6),
  },
  slideOneHero: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(4),
  },
  slideOneImage: {
    width: '100%',
    height: '100%',
    maxWidth: maxContentWidth(),
    alignSelf: 'center',
  },
  slideOneFeatureCard: {
    width: '100%',
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(4),
    flexDirection: 'row',
    alignItems: 'stretch',
    flexShrink: 0,
  },
  slideOneFeatureCardCompact: {
    paddingVertical: verticalScale(6),
  },
  slideOneFeatureCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: scale(2),
  },
  slideOneFeatureDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#E8ECF2',
    marginVertical: verticalScale(2),
  },
  slideOneFeatureIcon: {
    backgroundColor: '#F3F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(6),
  },
  slideOneFeatureIconCompact: {
    marginBottom: verticalScale(4),
  },
  slideOneFeatureIconText: {
    fontSize: moderateScale(18),
  },
  slideOneFeatureTitle: {
    fontWeight: '700',
    color: colors.navy,
    textAlign: 'center',
    lineHeight: moderateScale(13),
  },
  slideOneFeatureTitleCompact: {
    lineHeight: moderateScale(12),
  },
  slideOneFeatureDesc: {
    marginTop: verticalScale(4),
    fontSize: moderateScale(10),
    lineHeight: moderateScale(13),
    color: '#6B758C',
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: verticalScale(4),
    paddingBottom: verticalScale(12),
    gap: spacing.md,
    maxWidth: maxContentWidth(),
    alignSelf: 'center',
    width: '100%',
    flexShrink: 0,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: scale(8),
  },
  dot: {
    width: scale(8),
    height: scale(8),
    borderRadius: moderateScale(4),
    backgroundColor: '#D4D9E3',
  },
  dotActive: {
    backgroundColor: colors.orange,
    width: scale(22),
    height: scale(8),
    borderRadius: moderateScale(4),
  },
});
