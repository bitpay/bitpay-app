import React, {PropsWithChildren} from 'react';
import {StyleSheet, TouchableOpacityProps, View} from 'react-native';
import {Action, Disabled, DisabledDark, White} from '../../styles/colors';
import {ActiveOpacity} from '../styled/Containers';
import {H5} from '../styled/Text';
import {TouchableOpacity} from '@components/base/TouchableOpacity';

type hAlign = 'left' | 'right' | 'center' | null | undefined;
type vAlign = 'top' | 'bottom' | 'center' | null | undefined;

export type FloatingActionButtonProps = PropsWithChildren &
  TouchableOpacityProps & {
    icon?: React.ReactElement;
    onPress?: (e: any) => void;
    hAlign?: hAlign;
    vAlign?: vAlign;
    allowDisabledPress?: boolean;
  };

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    position: 'absolute',
    justifyContent: 'center',
    zIndex: 1,
  },
  touchable: {
    alignItems: 'center',
    borderRadius: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    minWidth: 180,
    padding: 18,
  },
  iconContainer: {
    marginRight: 10,
  },
});

const getHAlignStyle = (hAlign?: hAlign) => {
  if (hAlign === 'right') {
    return {right: 20};
  } else if (hAlign === 'center') {
    return {left: 0, right: 0};
  }
  return {left: 20};
};

const getVAlignStyle = (vAlign?: vAlign) => {
  if (vAlign === 'top') {
    return {top: 20};
  } else if (vAlign === 'center') {
    return {top: 0, bottom: 0};
  }
  return {bottom: 20};
};

const FloatingActionButton: React.FC<FloatingActionButtonProps> = props => {
  const showAsDisabled = props.disabled && props.allowDisabledPress;
  const isDisabledColor = props.disabled || showAsDisabled;

  return (
    <View
      style={[
        styles.container,
        getHAlignStyle(props.hAlign),
        getVAlignStyle(props.vAlign),
      ]}>
      <TouchableOpacity
        style={[
          styles.touchable,
          {backgroundColor: isDisabledColor ? Disabled : Action},
        ]}
        onPress={e => props.onPress?.(e)}
        disabled={props.disabled && !props.allowDisabledPress}
        activeOpacity={ActiveOpacity}>
        {props.icon ? (
          <View style={styles.iconContainer}>{props.icon}</View>
        ) : null}
        <H5 style={{color: isDisabledColor ? DisabledDark : White}}>
          {props.children}
        </H5>
      </TouchableOpacity>
    </View>
  );
};

export default FloatingActionButton;
