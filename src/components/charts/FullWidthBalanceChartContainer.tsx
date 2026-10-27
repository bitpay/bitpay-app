import React from 'react';
import {StyleSheet, View} from 'react-native';

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    marginVertical: 0,
    marginHorizontal: -15,
  },
});

const FullWidthBalanceChartContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.container, style]} {...rest} />
));

export default FullWidthBalanceChartContainer;
