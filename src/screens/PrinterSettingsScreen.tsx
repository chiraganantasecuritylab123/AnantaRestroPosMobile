import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  connectPrinter,
  disconnectPrinter,
  disconnectPrinterAndForget,
  ensureBluetoothReady,
  printTestReceipt,
  reconnectLastPrinter,
  requestEnableBluetooth,
  scanPrinters,
} from '../services/bluetoothPrinterService';
import {usePrinterStatus} from '../hooks/usePrinterStatus';
import {openAppSettings} from '../components/printer/PrinterStatusCard';
import type {ProfileStackParamList} from '../navigation/types';
import {handleProfileStackBack} from '../navigation/profileStackBack';
import type {PrinterConnectionStatus, PrinterDevice} from '../types/printer';
import {Card, ScreenBackground, TopHeader, TopHeaderAction} from '../components/ui';
import {colors, radii, spacing, typography} from '../theme';

type Props = NativeStackScreenProps<ProfileStackParamList, 'PrinterSettings'>;

function linkStatusLabel(
  status: PrinterDevice['linkStatus'],
  global: PrinterConnectionStatus,
  address: string,
  connectedAddress: string | null,
) {
  if (connectedAddress === address && global === 'connected') {
    return 'Connected';
  }
  if (global === 'connecting' && connectedAddress === address) {
    return 'Connecting…';
  }
  return status === 'connected' ? 'Connected' : 'Available';
}

export const PrinterSettingsScreen: React.FC<Props> = ({navigation, route}) => {
  const {snapshot, refresh} = usePrinterStatus(false);
  const [devices, setDevices] = useState<PrinterDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [permissionHint, setPermissionHint] = useState<string | null>(null);
  const [connectingAddress, setConnectingAddress] = useState<string | null>(
    null,
  );
  const [testPrinting, setTestPrinting] = useState(false);

  const checkPermissions = useCallback(async () => {
    const ready = await ensureBluetoothReady();
    if (!ready.ready) {
      setPermissionHint(ready.message);
    } else {
      setPermissionHint(null);
    }
    return ready.ready;
  }, []);

  const loadBondedOnly = useCallback(async () => {
    const ok = await checkPermissions();
    if (!ok) {
      setDevices([]);
      return;
    }
    const result = await scanPrinters({includeDiscovery: false, scanMs: 0});
    if (result.ok) {
      setDevices(result.data);
    }
  }, [checkPermissions]);

  const runScan = useCallback(async () => {
    setScanning(true);
    const ok = await checkPermissions();
    if (!ok) {
      setScanning(false);
      return;
    }
    const result = await scanPrinters({includeDiscovery: true, scanMs: 12_000});
    setScanning(false);
    if (result.ok) {
      setDevices(result.data);
      if (!result.data.length) {
        Alert.alert(
          'No printers found',
          'Pair your 58mm printer in Android Bluetooth settings, then scan again.',
        );
      }
    } else {
      Alert.alert('Scan failed', result.error);
    }
    await refresh();
  }, [checkPermissions, refresh]);

  useEffect(() => {
    void loadBondedOnly();
    void refresh();
  }, [loadBondedOnly, refresh]);

  const onConnect = async (device: PrinterDevice) => {
    setConnectingAddress(device.address);
    const result = await connectPrinter(device.address, device.name);
    setConnectingAddress(null);
    if (result.ok) {
      Alert.alert('Connected', `${device.name} is ready.`);
      await refresh();
      await loadBondedOnly();
    } else {
      Alert.alert('Connection failed', result.error ?? 'Could not connect.');
    }
  };

  const onReconnectSaved = async () => {
    setConnectingAddress(snapshot.savedPrinter?.address ?? 'saved');
    const result = await reconnectLastPrinter();
    setConnectingAddress(null);
    if (result.ok) {
      Alert.alert('Connected', 'Reconnected to saved printer.');
    } else {
      Alert.alert('Reconnect failed', result.error ?? 'Could not reconnect.');
    }
    await refresh();
  };

  const onDisconnect = () => {
    Alert.alert('Disconnect', 'Disconnect from the current printer?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Disconnect',
        onPress: async () => {
          await disconnectPrinter();
          await refresh();
        },
      },
    ]);
  };

  const onForget = () => {
    Alert.alert(
      'Change printer',
      'Disconnect and remove the saved printer? You can select another device below.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await disconnectPrinterAndForget();
            await refresh();
            await loadBondedOnly();
          },
        },
      ],
    );
  };

  const onTestPrint = async () => {
    setTestPrinting(true);
    const result = await printTestReceipt();
    setTestPrinting(false);
    if (result.ok) {
      Alert.alert(
        'Test print sent',
        'Check your thermal printer for the test receipt.',
      );
    } else {
      Alert.alert('Test print failed', result.error ?? 'Could not print.');
    }
  };

  const onEnableBluetooth = async () => {
    const enabled = await requestEnableBluetooth();
    if (enabled) {
      await checkPermissions();
      await runScan();
    } else {
      Alert.alert('Bluetooth off', 'Turn on Bluetooth to scan for printers.');
    }
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TopHeader
          title="Printer settings"
          subtitle="58mm Bluetooth · ESC/POS"
          onBack={() =>
            handleProfileStackBack(navigation, route.params?.fromSideMenu)
          }
          right={
            scanning ? (
              <ActivityIndicator size="small" color={colors.green} />
            ) : (
              <TopHeaderAction
                label="Scan"
                onPress={runScan}
                accessibilityLabel="Scan for printers"
              />
            )
          }
        />

        {permissionHint ? (
          <Card style={styles.banner}>
            <Text style={styles.bannerText}>{permissionHint}</Text>
            <View style={styles.bannerActions}>
              {permissionHint.includes('blocked') ||
              permissionHint.includes('Settings') ? (
                <TouchableOpacity
                  style={styles.bannerBtn}
                  onPress={openAppSettings}>
                  <Text style={styles.bannerBtnText}>Open settings</Text>
                </TouchableOpacity>
              ) : null}
              {permissionHint.includes('Bluetooth') &&
              permissionHint.includes('Turn on') ? (
                <TouchableOpacity
                  style={styles.bannerBtn}
                  onPress={onEnableBluetooth}>
                  <Text style={styles.bannerBtnText}>Enable Bluetooth</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.bannerBtn}
                  onPress={checkPermissions}>
                  <Text style={styles.bannerBtnText}>Grant permission</Text>
                </TouchableOpacity>
              )}
            </View>
          </Card>
        ) : null}

        <Card style={styles.currentCard}>
          <Text style={styles.sectionLabel}>Current printer</Text>
          <Text style={styles.currentName}>
            {snapshot.connectedName ??
              snapshot.savedPrinter?.name ??
              'Not connected'}
          </Text>
          <Text style={styles.currentMeta}>
            Status: {snapshot.connectionStatus}
          </Text>
          {snapshot.savedPrinter?.address ? (
            <Text style={styles.currentMeta}>
              MAC: {snapshot.savedPrinter.address}
            </Text>
          ) : null}
          {snapshot.savedPrinter?.lastConnectedAt ? (
            <Text style={styles.currentMeta}>
              Last connected:{' '}
              {new Date(snapshot.savedPrinter.lastConnectedAt).toLocaleString()}
            </Text>
          ) : null}
          <Text style={styles.currentMeta}>Type: Bluetooth Thermal Printer</Text>

          <View style={styles.currentActions}>
            {snapshot.connectionStatus !== 'connected' &&
            snapshot.savedPrinter ? (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={onReconnectSaved}
                disabled={!!connectingAddress}>
                {connectingAddress ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.primaryBtnText}>Reconnect</Text>
                )}
              </TouchableOpacity>
            ) : null}
            {snapshot.connectionStatus === 'connected' ? (
              <TouchableOpacity style={styles.outlineBtn} onPress={onDisconnect}>
                <Text style={styles.outlineBtnText}>Disconnect</Text>
              </TouchableOpacity>
            ) : null}
            {snapshot.savedPrinter ? (
              <TouchableOpacity style={styles.outlineBtn} onPress={onForget}>
                <Text style={[styles.outlineBtnText, styles.dangerText]}>
                  Change / forget printer
                </Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={styles.testBtn}
              onPress={onTestPrint}
              disabled={testPrinting}>
              {testPrinting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.primaryBtnText}>Test print</Text>
              )}
            </TouchableOpacity>
          </View>
        </Card>

        <View style={styles.scanRow}>
          <Text style={styles.sectionTitle}>Available printers</Text>
          <TouchableOpacity
            onPress={runScan}
            disabled={scanning}
            style={styles.scanBtn}>
            {scanning ? (
              <ActivityIndicator size="small" color={colors.green} />
            ) : (
              <Text style={styles.scanBtnText}>Scan</Text>
            )}
          </TouchableOpacity>
        </View>

        <FlatList
          data={devices}
          keyExtractor={item => item.address}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={scanning}
              onRefresh={runScan}
              tintColor={colors.green}
            />
          }
          ListHeaderComponent={
            <Text style={styles.listHint}>
              Paired devices appear instantly. Tap Scan to find nearby printers.
              Pair new hardware in system Bluetooth settings first.
            </Text>
          }
          ListEmptyComponent={
            !scanning ? (
              <Card style={styles.empty}>
                <Text style={styles.emptyTitle}>No printers listed</Text>
                <Text style={styles.emptyText}>
                  Pair your printer in Settings → Bluetooth, then tap Scan.
                </Text>
              </Card>
            ) : null
          }
          renderItem={({item}) => {
            const busy = connectingAddress === item.address;
            const isActive =
              snapshot.connectedAddress === item.address &&
              snapshot.connectionStatus === 'connected';
            return (
              <TouchableOpacity
                style={[styles.deviceRow, isActive && styles.deviceRowActive]}
                onPress={() => onConnect(item)}
                disabled={!!connectingAddress}>
                <View style={styles.deviceBody}>
                  <Text style={styles.deviceName}>{item.name}</Text>
                  <Text style={styles.deviceAddr}>{item.address}</Text>
                  <Text style={styles.deviceTags}>
                    {item.bonded ? 'Paired' : 'Discovered'} ·{' '}
                    {linkStatusLabel(
                      item.linkStatus,
                      snapshot.connectionStatus,
                      item.address,
                      snapshot.connectedAddress,
                    )}
                  </Text>
                </View>
                {busy ? (
                  <ActivityIndicator color={colors.green} />
                ) : isActive ? (
                  <Text style={styles.connectedBadge}>Connected</Text>
                ) : (
                  <Text style={styles.connectLink}>Connect</Text>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </SafeAreaView>
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1},
  banner: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    padding: spacing.lg,
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  bannerText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  bannerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  bannerBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.md,
    backgroundColor: colors.navy,
  },
  bannerBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  currentCard: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currentName: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy,
  },
  currentMeta: {
    marginTop: 4,
    fontSize: 13,
    color: colors.muted,
  },
  currentActions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  primaryBtn: {
    backgroundColor: colors.green,
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  testBtn: {
    backgroundColor: colors.navy,
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  outlineBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy,
  },
  dangerText: {color: '#B91C1C'},
  scanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.navy,
  },
  scanBtn: {
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.green,
  },
  scanBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.green,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  listHint: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deviceRowActive: {
    borderColor: colors.green,
    backgroundColor: '#F0FDF4',
  },
  deviceBody: {flex: 1, paddingRight: spacing.sm},
  deviceName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy,
  },
  deviceAddr: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
    color: colors.muted,
  },
  deviceTags: {
    marginTop: 4,
    fontSize: 12,
    color: colors.muted,
  },
  connectedBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.green,
  },
  connectLink: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.green,
  },
  empty: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.navy,
  },
  emptyText: {
    marginTop: spacing.sm,
    textAlign: 'center',
    fontSize: 14,
    color: colors.muted,
    lineHeight: 22,
  },
});
