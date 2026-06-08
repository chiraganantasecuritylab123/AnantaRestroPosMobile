/**
 * @format
 */

import './src/notifications/fcmBackground';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

if (__DEV__) {
  const { setupFlipperDevTools } = require('./src/dev/setupFlipper');
  setupFlipperDevTools();
}

AppRegistry.registerComponent(appName, () => App);
