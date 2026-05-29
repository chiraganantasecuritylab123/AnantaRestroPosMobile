import React from 'react';
import {ImageBackground, StyleSheet, ViewStyle} from 'react-native';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export const LoginScreenBackground: React.FC<Props> = ({children, style}) => (
  <ImageBackground
    source={require('../../assets/login-bg.png')}
    style={[styles.root, style]}
    resizeMode="cover">
    {children}
  </ImageBackground>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
