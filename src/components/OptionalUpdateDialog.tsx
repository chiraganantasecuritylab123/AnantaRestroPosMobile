import React from 'react';
import {ConfirmDialog, Icon} from './ui';
import {colors} from '../theme';
import {moderateScale} from '../utils/responsive';

type Props = {
  visible: boolean;
  currentVersion: string;
  latestVersion: string;
  onUpdate: () => void;
  onDismiss: () => void;
};

export const OptionalUpdateDialog: React.FC<Props> = ({
  visible,
  currentVersion,
  latestVersion,
  onUpdate,
  onDismiss,
}) => (
  <ConfirmDialog
    visible={visible}
    title="Update available"
    message={`Version ${latestVersion} is available. You are on ${currentVersion}. Update now for the latest fixes and improvements.`}
    confirmLabel="Update"
    cancelLabel="Not now"
    icon={<Icon name="info" size={moderateScale(26)} color={colors.green} />}
    onConfirm={onUpdate}
    onCancel={onDismiss}
  />
);
