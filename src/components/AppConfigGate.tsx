import React, {useCallback, useEffect, useMemo, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useGetConfigQuery} from '../services/configApi';
import {SplashContent} from '../screens/SplashScreen';
import {MaintenanceScreen} from '../screens/MaintenanceScreen';
import {ForceUpdateScreen} from '../screens/ForceUpdateScreen';
import {OptionalUpdateDialog} from './OptionalUpdateDialog';
import {openAppStoreListing, openExternalUrl} from '../utils/openExternalUrl';
import {evaluateVersionControl} from '../utils/versionControl';

const OPTIONAL_UPDATE_DISMISS_KEY = '@app/optional_update_dismissed_version';

type Props = {
  children: React.ReactNode;
  booting: boolean;
};

export const AppConfigGate: React.FC<Props> = ({children, booting}) => {
  const {data, isLoading, isFetching, refetch, isError} = useGetConfigQuery();
  const [optionalDismissedVersion, setOptionalDismissedVersion] = useState<
    string | null
  >(null);
  const [optionalLoaded, setOptionalLoaded] = useState(false);

  const config = data?.data;
  const versionStatus = useMemo(
    () => evaluateVersionControl(config?.version_control),
    [config?.version_control],
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(OPTIONAL_UPDATE_DISMISS_KEY);
        if (mounted) {
          setOptionalDismissedVersion(stored);
        }
      } finally {
        if (mounted) {
          setOptionalLoaded(true);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const onRetryConfig = useCallback(() => {
    void refetch();
  }, [refetch]);

  const onDismissOptionalUpdate = useCallback(async () => {
    setOptionalDismissedVersion(versionStatus.latestVersion);
    await AsyncStorage.setItem(
      OPTIONAL_UPDATE_DISMISS_KEY,
      versionStatus.latestVersion,
    );
  }, [versionStatus.latestVersion]);

  const onOptionalUpdate = useCallback(() => {
    void openAppStoreListing();
  }, []);

  const onForceUpdateSupport = useCallback(() => {
    const mailto = config?.contact_support?.email?.mailto_url;
    if (mailto) {
      void openExternalUrl(mailto);
      return;
    }
    const tel = config?.contact_support?.phone?.tel_url;
    if (tel) {
      void openExternalUrl(tel);
    }
  }, [config?.contact_support]);

  const waitingForConfig = booting || (isLoading && !data && !isError);

  if (waitingForConfig) {
    return <SplashContent />;
  }

  if (config?.maintenance_mode?.status) {
    return (
      <MaintenanceScreen
        message={config.maintenance_mode.message}
        onRetry={onRetryConfig}
        isRetrying={isFetching}
        contactSupport={config.contact_support}
      />
    );
  }

  if (versionStatus.forceUpdate) {
    return (
      <ForceUpdateScreen
        currentVersion={versionStatus.currentVersion}
        latestVersion={versionStatus.latestVersion}
        onContactSupport={
          config?.contact_support?.email?.mailto_url ||
          config?.contact_support?.phone?.tel_url
            ? onForceUpdateSupport
            : undefined
        }
      />
    );
  }

  const showOptionalUpdate =
    optionalLoaded &&
    versionStatus.optionalUpdate &&
    optionalDismissedVersion !== versionStatus.latestVersion;

  return (
    <>
      {children}
      <OptionalUpdateDialog
        visible={showOptionalUpdate}
        currentVersion={versionStatus.currentVersion}
        latestVersion={versionStatus.latestVersion}
        onUpdate={onOptionalUpdate}
        onDismiss={onDismissOptionalUpdate}
      />
    </>
  );
};
