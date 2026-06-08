import React from 'react';
import type {SvgIconProps} from './types';
import {
  BarChartIcon,
  BellIcon,
  CalendarIcon,
  CameraIcon,
  CartIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  GlobeIcon,
  ClipboardIcon,
  ClockIcon,
  InfoIcon,
  LockIcon,
  LogOutIcon,
  MailIcon,
  MenuIcon,
  MinusIcon,
  PackageIcon,
  PhoneIcon,
  PlusIcon,
  PrinterIcon,
  ReceiptIcon,
  SettingsIcon,
  ShieldIcon,
  ShoppingBagIcon,
  GridIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  UserIcon,
  UsersIcon,
  UtensilsIcon,
} from './AppIcons';

export type IconName =
  | 'chevron-left'
  | 'chevron-right'
  | 'menu'
  | 'globe'
  | 'bell'
  | 'check'
  | 'close'
  | 'plus'
  | 'minus'
  | 'user'
  | 'users'
  | 'cart'
  | 'info'
  | 'camera'
  | 'calendar'
  | 'lock'
  | 'shield'
  | 'phone'
  | 'mail'
  | 'logout'
  | 'package'
  | 'clipboard'
  | 'receipt'
  | 'shopping-bag'
  | 'printer'
  | 'utensils'
  | 'settings'
  | 'clock'
  | 'bar-chart'
  | 'trending-up'
  | 'trending-down'
  | 'grid';

const ICONS: Record<IconName, React.FC<SvgIconProps>> = {
  'chevron-left': ChevronLeftIcon,
  'chevron-right': ChevronRightIcon,
  menu: MenuIcon,
  globe: GlobeIcon,
  bell: BellIcon,
  check: CheckIcon,
  close: CloseIcon,
  plus: PlusIcon,
  minus: MinusIcon,
  user: UserIcon,
  users: UsersIcon,
  cart: CartIcon,
  info: InfoIcon,
  camera: CameraIcon,
  calendar: CalendarIcon,
  lock: LockIcon,
  shield: ShieldIcon,
  phone: PhoneIcon,
  mail: MailIcon,
  logout: LogOutIcon,
  package: PackageIcon,
  clipboard: ClipboardIcon,
  receipt: ReceiptIcon,
  'shopping-bag': ShoppingBagIcon,
  printer: PrinterIcon,
  utensils: UtensilsIcon,
  settings: SettingsIcon,
  clock: ClockIcon,
  'bar-chart': BarChartIcon,
  'trending-up': TrendingUpIcon,
  'trending-down': TrendingDownIcon,
  grid: GridIcon,
};

export type IconProps = SvgIconProps & {
  name: IconName;
};

export const Icon: React.FC<IconProps> = ({name, ...props}) => {
  const Component = ICONS[name];
  if (!Component) {
    return null;
  }
  return <Component {...props} />;
};
