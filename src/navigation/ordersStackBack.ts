import type {NavigationProp, ParamListBase} from '@react-navigation/native';

type SalesOrdersBackOptions = {
  fromSideMenu?: boolean;
  fromProfile?: boolean;
};

export function handleSalesOrdersBack(
  navigation: NavigationProp<ParamListBase>,
  options?: SalesOrdersBackOptions,
) {
  if (options?.fromSideMenu) {
    navigation.reset({
      index: 0,
      routes: [{name: 'OrdersMain'}],
    });
    navigation.getParent()?.navigate('Dashboard', {
      screen: 'DashboardMain',
    });
    return;
  }

  if (options?.fromProfile) {
    navigation.reset({
      index: 0,
      routes: [{name: 'OrdersMain'}],
    });
    navigation.getParent()?.navigate('Profile', {
      screen: 'ProfileMain',
    });
    return;
  }

  if (navigation.canGoBack()) {
    navigation.goBack();
    return;
  }

  navigation.reset({
    index: 0,
    routes: [{name: 'OrdersMain'}],
  });
}
