import React from 'react';
import Svg, {Path} from 'react-native-svg';
import {ConfigGateScreenLayout} from '../components/ConfigGateScreenLayout';
import type {AppContactSupportConfig} from '../services/configApi';
import {openExternalUrl} from '../utils/openExternalUrl';
import {colors} from '../theme';
import {moderateScale} from '../utils/responsive';

type Props = {
  message?: string;
  onRetry: () => void;
  isRetrying?: boolean;
  contactSupport?: AppContactSupportConfig;
};

function MaintenanceIcon() {
  const iconSize = moderateScale(34);
  return (
    <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
        stroke={colors.orange}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export const MaintenanceScreen: React.FC<Props> = ({
  message,
  onRetry,
  isRetrying,
  contactSupport,
}) => {
  const supportHint =
    contactSupport?.email?.value || contactSupport?.phone?.value;

  return (
    <ConfigGateScreenLayout
      icon={<MaintenanceIcon />}
      title="Under maintenance"
      message={
        message?.trim() ||
        'System is under maintenance. Please try again shortly.'
      }
      primaryAction={{
        label: isRetrying ? 'Checking…' : 'Try again',
        onPress: onRetry,
        loading: isRetrying,
      }}
      secondaryAction={
        contactSupport?.phone?.tel_url
          ? {
              label: `Call support${supportHint ? `: ${contactSupport.phone.value}` : ''}`,
              onPress: () => {
                void openExternalUrl(contactSupport.phone?.tel_url);
              },
            }
          : contactSupport?.email?.mailto_url
            ? {
                label: 'Email support',
                onPress: () => {
                  void openExternalUrl(contactSupport.email?.mailto_url);
                },
              }
            : undefined
      }
    />
  );
};
