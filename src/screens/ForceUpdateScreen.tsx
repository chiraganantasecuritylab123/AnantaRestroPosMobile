import React from 'react';
import {StyleSheet, Text} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {ConfigGateScreenLayout} from '../components/ConfigGateScreenLayout';
import {openAppStoreListing} from '../utils/openExternalUrl';
import {colors, spacing} from '../theme';
import {moderateScale} from '../utils/responsive';

type Props = {
  currentVersion: string;
  latestVersion: string;
  onContactSupport?: () => void;
};

function UpdateIcon() {
  const iconSize = moderateScale(34);
  return (
    <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"
        stroke={colors.green}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export const ForceUpdateScreen: React.FC<Props> = ({
  currentVersion,
  latestVersion,
  onContactSupport,
}) => (
  <ConfigGateScreenLayout
    icon={<UpdateIcon />}
    title="Update required"
    message={`A newer version (${latestVersion}) is available. Please update to continue using the app.`}
    primaryAction={{
      label: 'Update now',
      onPress: () => {
        void openAppStoreListing();
      },
    }}
    secondaryAction={
      onContactSupport
        ? {label: 'Contact support', onPress: onContactSupport}
        : undefined
    }>
    <Text style={styles.versionMeta}>
      Installed version: {currentVersion}
    </Text>
  </ConfigGateScreenLayout>
);

const styles = StyleSheet.create({
  versionMeta: {
    marginTop: spacing.lg,
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: colors.mutedLight,
    textAlign: 'center',
    flexShrink: 1,
  },
});
