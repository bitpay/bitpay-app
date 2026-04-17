const React = require('react');
const {View} = require('react-native');

const SafeAreaView = ({children, style, testID}) =>
  React.createElement(View, {style, testID}, children);

SafeAreaView.displayName = 'SafeAreaView';

module.exports = {default: SafeAreaView};
