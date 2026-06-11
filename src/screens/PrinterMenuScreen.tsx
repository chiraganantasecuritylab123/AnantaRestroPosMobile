import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  disconnectPrinter,
  printTestReceipt,
  reconnectLastPrinter,
} from '../services/bluetoothPrinterService';
import {usePrinterStatus} from '../hooks/usePrinterStatus';
import {
  loadAutoPrintOnOrder,
  saveAutoPrintOnOrder,
} from '../storage/printerStorage';
import {useGetPosInitQuery} from '../services/posApi';
import {isReceiptPrintEnabled} from '../utils/printConfig';
import type {ProfileStackParamList} from '../navigation/types';
import {handleProfileStackBack} from '../navigation/profileStackBack';
import {showDialog} from '../context/DialogProvider';
import type {PrinterConnectionStatus} from '../types/printer';
import {Card, Icon, PrinterIcon, ScreenBackground, TopHeader} from '../components/ui';
import type {IconName} from '../components/ui';
import {colors, radii, spacing} from '../theme';
import {
  maxContentWidth,
  moderateScale,
  scale,
  verticalScale,
} from '../utils/responsive';

type Props = NativeStackScreenProps<ProfileStackParamList, 'PrinterMenu'>;

function statusLabel(status: PrinterConnectionStatus) {
  switch (status) {
    case 'connected':
      return 'Connected';
    case 'connecting':
      return 'Connecting…';
    case 'failed':
      return 'Failed';
    default:
      return 'Disconnected';
  }
}

function statusColor(status: PrinterConnectionStatus) {
  switch (status) {
    case 'connected':
      return colors.green;
    case 'connecting':
      return colors.orange;
    case 'failed':
      return '#B91C1C';
    default:
      return colors.muted;
  }
}

export const PrinterMenuScreen: React.FC<Props> = ({navigation, route}) => {
  const {snapshot, refresh} = usePrinterStatus(false);
  const {data: posInit} = useGetPosInitQuery();
  const [busy, setBusy] = useState<string | null>(null);
  const [autoPrintOnOrder, setAutoPrintOnOrder] = useState(true);
  const [autoPrintLoaded, setAutoPrintLoaded] = useState(false);
  const [savingAutoPrint, setSavingAutoPrint] = useState(false);

  const configPrintEnabled = isReceiptPrintEnabled(posInit?.printSettings);

  const refreshAutoPrintPref = useCallback(async () => {
    const enabled = await loadAutoPrintOnOrder();
    setAutoPrintOnOrder(enabled);
    setAutoPrintLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshAutoPrintPref();
    }, [refreshAutoPrintPref]),
  );

  const setAutoPrint = async (enabled: boolean) => {
    const previous = autoPrintOnOrder;
    setAutoPrintOnOrder(enabled);
    setSavingAutoPrint(true);
    try {
      await saveAutoPrintOnOrder(enabled);
    } catch {
      setAutoPrintOnOrder(previous);
      showDialog('Settings', 'Could not save auto-print preference.');
    } finally {
      setSavingAutoPrint(false);
    }
  };

  const printerName =
    snapshot.connectedName ??
    snapshot.savedPrinter?.name ??
    'No printer selected';

  const runAction = async (
    key: string,
    action: () => Promise<{ok: boolean; error?: string} | void>,
    okTitle?: string,
    okMsg?: string,
  ) => {
    setBusy(key);
    try {
      const result = await action();
      if (result && 'ok' in result && !result.ok) {
        showDialog('Printer', result.error ?? 'Action failed');
      } else if (okTitle) {
        showDialog(okTitle, okMsg ?? '');
      }
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  const isConnected = snapshot.connectionStatus === 'connected';

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TopHeader
          title="Printer"
          subtitle="Bluetooth thermal · 58mm"
          onBack={() =>
            handleProfileStackBack(navigation, route.params?.fromSideMenu)
          }
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>
          <Card style={styles.statusCard}>
            <View style={styles.statusTop}>
              <View style={styles.statusIcon}>
                <PrinterIcon size={moderateScale(24)} color={colors.navy} />
              </View>
              <View style={styles.statusBody}>
                <Text style={styles.statusName} numberOfLines={1}>
                  {printerName}
                </Text>
                <Text style={styles.statusType}>
                  Bluetooth Thermal Printer
                </Text>
              </View>
              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: `${statusColor(snapshot.connectionStatus)}18`,
                  },
                ]}>
                <View
                  style={[
                    styles.statusDot,
                    {backgroundColor: statusColor(snapshot.connectionStatus)},
                  ]}
                />
                <Text
                  style={[
                    styles.statusPillText,
                    {color: statusColor(snapshot.connectionStatus)},
                  ]}>
                  {statusLabel(snapshot.connectionStatus)}
                </Text>
              </View>
            </View>
            {snapshot.savedPrinter?.address ? (
              <Text style={styles.mac} numberOfLines={1}>
                {snapshot.savedPrinter.address}
              </Text>
            ) : null}
            {snapshot.savedPrinter?.lastConnectedAt ? (
              <Text style={styles.lastSeen}>
                Last connected{' '}
                {new Date(snapshot.savedPrinter.lastConnectedAt).toLocaleString()}
              </Text>
            ) : null}
            {snapshot.lastError && snapshot.connectionStatus === 'failed' ? (
              <Text style={styles.error}>{snapshot.lastError}</Text>
            ) : null}
          </Card>

          <Card style={styles.toggleCard}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleBody}>
                <Text style={styles.toggleTitle}>Auto-print on new order</Text>
                <Text style={styles.toggleHint}>
                  Print receipt after Pay & Bill when a printer is connected
                </Text>
              </View>
              {!autoPrintLoaded || savingAutoPrint ? (
                <ActivityIndicator color={colors.green} size="small" />
              ) : (
                <View style={styles.onOffControl}>
                  <TouchableOpacity
                    style={[
                      styles.onOffBtn,
                      styles.onOffBtnLeft,
                      autoPrintOnOrder && styles.onOffBtnActive,
                    ]}
                    onPress={() => void setAutoPrint(true)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityState={{selected: autoPrintOnOrder}}
                    accessibilityLabel="Auto-print on">
                    <Text
                      style={[
                        styles.onOffBtnText,
                        autoPrintOnOrder && styles.onOffBtnTextActive,
                      ]}>
                      ON
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.onOffBtn,
                      styles.onOffBtnRight,
                      !autoPrintOnOrder && styles.onOffBtnActiveOff,
                    ]}
                    onPress={() => void setAutoPrint(false)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityState={{selected: !autoPrintOnOrder}}
                    accessibilityLabel="Auto-print off">
                    <Text
                      style={[
                        styles.onOffBtnText,
                        !autoPrintOnOrder && styles.onOffBtnTextActive,
                      ]}>
                      OFF
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <View style={styles.toggleStatusRow}>
              <Text style={styles.toggleStatusLabel}>Device setting</Text>
              <Text
                style={[
                  styles.toggleStatusValue,
                  autoPrintOnOrder ? styles.toggleStatusOn : styles.toggleStatusOff,
                ]}>
                {autoPrintLoaded
                  ? autoPrintOnOrder
                    ? 'ON — will print after each order'
                    : 'OFF — orders will not auto-print'
                  : 'Loading…'}
              </Text>
            </View>
            <Text style={styles.configHint}>
              Outlet receipt printing:{' '}
              {configPrintEnabled ? 'enabled' : 'disabled'}
            </Text>
          </Card>

          <Text style={styles.menuLabel}>Actions</Text>
          <Card style={styles.menuCard}>
            <MenuRow
              iconName="settings"
              title="Printer settings"
              hint="Scan, pair, connect & permissions"
              onPress={() => navigation.navigate('PrinterSettings')}
            />
            <MenuDivider />
            {!isConnected ? (
              <>
                <MenuRow
                  iconName="printer"
                  title="Connect printer"
                  hint="Reconnect to saved device"
                  loading={busy === 'connect'}
                  onPress={() =>
                    runAction(
                      'connect',
                      () => reconnectLastPrinter(),
                      'Connected',
                      'Printer is ready.',
                    )
                  }
                />
                <MenuDivider />
              </>
            ) : (
              <>
                <MenuRow
                  iconName="logout"
                  title="Disconnect"
                  hint="Stay paired, end session"
                  loading={busy === 'disconnect'}
                  onPress={() =>
                    runAction('disconnect', async () => {
                      await disconnectPrinter();
                    })
                  }
                />
                <MenuDivider />
              </>
            )}
            <MenuRow
              iconName="receipt"
              title="Test print"
              hint="Send sample receipt to printer"
              loading={busy === 'test'}
              onPress={() =>
                runAction(
                  'test',
                  () => printTestReceipt(),
                  'Test print sent',
                  'Check your thermal printer for the test slip.',
                )
              }
            />
          </Card>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
};

function MenuRow({
  iconName,
  title,
  hint,
  onPress,
  loading,
}: {
  iconName: IconName;
  title: string;
  hint: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.menuRow}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.85}>
      <Icon name={iconName} size={moderateScale(20)} color={colors.navy} />
      <View style={styles.menuText}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuHint}>{hint}</Text>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.green} size="small" />
      ) : (
        <Icon name="chevron-right" size={moderateScale(18)} color={colors.muted} />
      )}
    </TouchableOpacity>
  );
}

function MenuDivider() {
  return <View style={styles.menuDivider} />;
}

const MENU_ICON_WIDTH = scale(28);

const styles = StyleSheet.create({
  safe: {flex: 1},
  scrollView: {
    width: '100%',
    alignSelf: 'center',
    maxWidth: maxContentWidth(),
  },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  statusCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  statusTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statusIcon: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: radii.md,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statusEmoji: {fontSize: moderateScale(22)},
  statusBody: {flex: 1, flexShrink: 1},
  statusName: {
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: colors.navy,
    flexShrink: 1,
  },
  statusType: {
    marginTop: verticalScale(2),
    fontSize: moderateScale(12),
    color: colors.muted,
    flexShrink: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(5),
    borderRadius: radii.pill,
    flexShrink: 0,
  },
  statusDot: {
    width: scale(7),
    height: scale(7),
    borderRadius: scale(4),
  },
  statusPillText: {
    fontSize: moderateScale(10),
    fontWeight: '800',
    flexShrink: 1,
  },
  mac: {
    marginTop: spacing.md,
    fontSize: moderateScale(12),
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
    color: colors.muted,
    flexShrink: 1,
  },
  lastSeen: {
    marginTop: verticalScale(4),
    fontSize: moderateScale(12),
    color: colors.muted,
    flexShrink: 1,
  },
  error: {
    marginTop: spacing.sm,
    fontSize: moderateScale(13),
    color: '#B91C1C',
    flexShrink: 1,
  },
  toggleCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  toggleBody: {flex: 1, flexShrink: 1},
  toggleTitle: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: colors.navy,
    flexShrink: 1,
  },
  toggleHint: {
    marginTop: verticalScale(4),
    fontSize: moderateScale(12),
    color: colors.muted,
    lineHeight: moderateScale(18),
    flexShrink: 1,
  },
  onOffControl: {
    flexDirection: 'row',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.borderLight,
    flexShrink: 0,
  },
  onOffBtn: {
    minWidth: scale(52),
    paddingVertical: verticalScale(10),
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.borderLight,
  },
  onOffBtnLeft: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  onOffBtnRight: {},
  onOffBtnActive: {
    backgroundColor: colors.green,
  },
  onOffBtnActiveOff: {
    backgroundColor: colors.navy,
  },
  onOffBtnText: {
    fontSize: moderateScale(13),
    fontWeight: '800',
    color: colors.muted,
    letterSpacing: 0.5,
  },
  onOffBtnTextActive: {
    color: colors.white,
  },
  toggleStatusRow: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  toggleStatusLabel: {
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  toggleStatusValue: {
    marginTop: verticalScale(4),
    fontSize: moderateScale(13),
    fontWeight: '600',
    lineHeight: moderateScale(18),
    flexShrink: 1,
  },
  toggleStatusOn: {
    color: colors.greenDark,
  },
  toggleStatusOff: {
    color: colors.muted,
  },
  configHint: {
    marginTop: spacing.sm,
    fontSize: moderateScale(12),
    color: colors.muted,
    flexShrink: 1,
  },
  menuLabel: {
    fontSize: moderateScale(12),
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  menuCard: {
    paddingVertical: spacing.xs,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  menuIcon: {
    fontSize: moderateScale(20),
    width: MENU_ICON_WIDTH,
    textAlign: 'center',
  },
  menuText: {flex: 1, flexShrink: 1},
  menuTitle: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: colors.navy,
    flexShrink: 1,
  },
  menuHint: {
    marginTop: verticalScale(2),
    fontSize: moderateScale(12),
    color: colors.muted,
    flexShrink: 1,
  },
  menuChevron: {
    fontSize: moderateScale(22),
    color: colors.muted,
    fontWeight: '300',
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.lg + MENU_ICON_WIDTH + spacing.md,
  },
});
