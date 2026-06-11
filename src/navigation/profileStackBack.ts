import type {NavigationProp, ParamListBase} from '@react-navigation/native';

export function handleProfileStackBack(
  navigation: NavigationProp<ParamListBase>,
  fromSideMenu?: boolean,
) {
  if (fromSideMenu) {
    navigation.reset({
      index: 0,
      routes: [{name: 'ProfileMain'}],
    });
    navigation.getParent()?.navigate('Dashboard', {
      screen: 'DashboardMain',
    });
    return;
  }
  if (navigation.canGoBack()) {
    navigation.goBack();
    return;
  }
  navigation.reset({
    index: 0,
    routes: [{name: 'ProfileMain'}],
  });
}
