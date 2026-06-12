/**
 * @format
 */

import './src/notifications/fcmBackground';
import './src/notifications/notifeeBackground';
import { AppRegistry } from 'react-native';
import { applyGlobalFont } from './src/theme/fonts';
import App from './App';
import { name as appName } from './app.json';

applyGlobalFont();

if (__DEV__) {
  const { setupFlipperDevTools } = require('./src/dev/setupFlipper');
  setupFlipperDevTools();
}

AppRegistry.registerComponent(appName, () => App);
