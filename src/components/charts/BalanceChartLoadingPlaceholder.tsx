import React from 'react';
import {StyleSheet, View} from 'react-native';
import Loader from '../loader/Loader';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 259,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const BalanceChartLoadingPlaceholder = () => (
  <View style={styles.container}>
    <Loader size={32} spinning />
  </View>
);

export default React.memo(BalanceChartLoadingPlaceholder);
