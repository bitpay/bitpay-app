import {useIsFocused} from '@react-navigation/native';
import React from 'react';
import {StatusBar, StatusBarProps} from 'react-native';

const FocusedStatusBar: React.FC<StatusBarProps> = props => {
  const isFocused = useIsFocused();

  return isFocused ? <StatusBar {...props} /> : null;
};

export default FocusedStatusBar;
