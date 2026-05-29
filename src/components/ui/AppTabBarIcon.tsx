import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors} from '../../theme';

type TabName = 'Dashboard' | 'POS' | 'Orders' | 'Profile';

const ICONS: Record<TabName, string> = {
  Dashboard: '⌂',
  POS: '⊞',
  Orders: '☰',
  Profile: '◎',
};

type Props = {
  name: TabName;
  focused: boolean;
};

export const AppTabBarIcon: React.FC<Props> = ({name, focused}) => (
  <View style={styles.wrap}>
    {focused ? <View style={styles.indicator} /> : null}
    <Text style={[styles.icon, focused && styles.iconFocused]}>
      {ICONS[name]}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
  },
  indicator: {
    position: 'absolute',
    top: -8,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.tabActive,
  },
  icon: {
    fontSize: 20,
    color: colors.tabInactive,
    fontWeight: '600',
  },
  iconFocused: {
    color: colors.tabActive,
  },
});
