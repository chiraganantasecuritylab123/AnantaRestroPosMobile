import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {usePrinterStatus} from '../../hooks/usePrinterStatus';
import type {MainTabParamList} from '../../navigation/types';
import type {PrinterConnectionStatus} from '../../types/printer';
import {Card, PrinterIcon} from '../ui';
import {colors, radii, spacing} from '../../theme';
import {moderateScale, scale, verticalScale} from '../../utils/responsive';

type Nav = BottomTabNavigationProp<MainTabParamList, 'Dashboard'>;

function statusLabel(status: PrinterConnectionStatus) {
  switch (status) {
    case 'connected':
      return 'Connected';
    case 'connecting':
      return 'Connecting…';
    case 'failed':
      return 'Failed';
    default:
      return 'Not connected';
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

/** Compact dashboard summary — opens full Printer menu on tap. */
export const PrinterStatusCard: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const {snapshot} = usePrinterStatus();

  const printerName =
    snapshot.connectedName ??
    snapshot.savedPrinter?.name ??
    'Set up printer';

  const openPrinterMenu = () => {
    navigation.navigate('Profile', {screen: 'PrinterMenu'});
  };

  return (
    <TouchableOpacity activeOpacity={0.88} onPress={openPrinterMenu}>
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <PrinterIcon size={moderateScale(22)} color={colors.navy} />
          </View>
          <View style={styles.body}>
            <Text style={styles.kicker}>Printer</Text>
            <Text style={styles.name} numberOfLines={1}>
              {printerName}
            </Text>
          </View>
          <View style={styles.right}>
            <View
              style={[
                styles.pill,
                {backgroundColor: `${statusColor(snapshot.connectionStatus)}18`},
              ]}>
              <View
                style={[
                  styles.dot,
                  {backgroundColor: statusColor(snapshot.connectionStatus)},
                ]}
              />
              <Text
                style={[
                  styles.pillText,
                  {color: statusColor(snapshot.connectionStatus)},
                ]}>
                {statusLabel(snapshot.connectionStatus)}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: scale(36),
    height: scale(36),
    borderRadius: radii.sm,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  body: {flex: 1, minWidth: 0},
  kicker: {
    fontSize: moderateScale(10),
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  name: {
    marginTop: verticalScale(2),
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: colors.navy,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    flexShrink: 0,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: radii.pill,
  },
  dot: {
    width: moderateScale(6),
    height: moderateScale(6),
    borderRadius: moderateScale(3),
  },
  pillText: {
    fontSize: moderateScale(10),
    fontWeight: '800',
  },
  chevron: {
    fontSize: moderateScale(20),
    color: colors.muted,
    fontWeight: '300',
  },
});
