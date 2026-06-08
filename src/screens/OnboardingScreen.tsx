import React, { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { GradientButton, Icon, ScreenBackground } from '../components/ui';
import type { IconName } from '../components/ui';
import { cardShadow, colors, spacing } from '../theme';
import type { AuthStackParamList } from '../navigation/types';
import { setOnboardingComplete } from '../storage/appStorage';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const SLIDE_PAD = 24;

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
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
      setIndex(index + 1);
    } else {
      finish();
    }
  };

  const renderCenteredSlide = (item: Slide) => (
    <ScrollView
      style={[styles.slideScroll, { width: SCREEN_W }]}
      contentContainerStyle={styles.slideOneScrollContent}
      showsVerticalScrollIndicator={false}
      bounces={false}>
      <View style={styles.slideOneHeader}>
        {item.titleLines.map((line, i) => (
          <Text
            key={line}
            style={[
              styles.slideOneHeadline,
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
          <Text style={styles.slideOneBody}>
            {item.id === '1'
              ? 'Manage your business, streamline operations and grow faster with '
              : 'Access your business, manage your team and stay in control - anytime, anywhere with '}
            <Text style={styles.slideOneBodyBold}>SwadeshPOS</Text>.
          </Text>
        ) : (
          <Text style={styles.slideOneBody}>{item.body}</Text>
        )}
        <View style={styles.slideOneAccent} />
      </View>

      <View style={styles.slideOneHero}>
        <Image
          source={item.image}
          style={[
            styles.slideOneImage,
            { height: Math.min(SCREEN_H * 0.38, 340) },
          ]}
          resizeMode="contain"
        />
      </View>

      <View style={styles.slideOneFeatureCard}>
        {item.cardFeatures.map((f, i) => (
          <React.Fragment key={f.title}>
            <View style={styles.slideOneFeatureCol}>
              <View style={styles.slideOneFeatureIcon}>
                <Icon name={f.iconName} size={20} color={colors.green} />
              </View>
              <Text style={styles.slideOneFeatureTitle}>{f.title}</Text>
            </View>
            {i < item.cardFeatures.length - 1 ? (
              <View style={styles.slideOneFeatureDivider} />
            ) : null}
          </React.Fragment>
        ))}
      </View>
    </ScrollView>
  );

  const renderSlide = ({ item }: { item: Slide }) => renderCenteredSlide(item);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topRow}>
          <View />
          <TouchableOpacity
            onPress={finish}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
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
            length: SCREEN_W,
            offset: SCREEN_W * i,
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
  },
  skip: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3E4B74',
  },
  slideScroll: {
    flex: 1,
  },
  slideOneScrollContent: {
    flexGrow: 1,
    paddingHorizontal: SLIDE_PAD,
    paddingBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideOneHeader: {
    width: '100%',
  },
  slideOneHeadline: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 38,
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
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: '#5F6981',
    fontWeight: '400',
    textAlign: 'left',
    width: '100%',
    maxWidth: SCREEN_W - SLIDE_PAD * 2,
  },
  slideOneBodyBold: {
    fontWeight: '700',
    color: colors.navy,
  },
  slideOneAccent: {
    marginTop: 14,
    width: 56,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.orange,
    alignSelf: 'flex-start',
  },
  slideOneHero: {
    marginTop: 16,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideOneImage: {
    width: SCREEN_W - SLIDE_PAD * 2,
    alignSelf: 'center',
  },
  slideOneFeatureCard: {
    marginTop: 20,
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'stretch'
  },
  slideOneFeatureCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  slideOneFeatureDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#E8ECF2',
    marginVertical: 2,
  },
  slideOneFeatureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  slideOneFeatureIconText: {
    fontSize: 18,
  },
  slideOneFeatureTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.navy,
    textAlign: 'center',
    lineHeight: 14,
    minHeight: 28,
  },
  slideOneFeatureDesc: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 13,
    color: '#6B758C',
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 16,
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
    backgroundColor: '#D4D9E3',
  },
  dotActive: {
    backgroundColor: colors.orange,
    width: 22,
    height: 8,
    borderRadius: 4,
  },
});
