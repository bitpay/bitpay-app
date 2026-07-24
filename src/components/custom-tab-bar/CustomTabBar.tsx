import React from 'react';
import {StyleSheet, View} from 'react-native';
import {MaterialTopTabBarProps} from '@react-navigation/material-top-tabs';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {useTheme} from '../../contexts';
import {
  Action,
  LightBlack,
  NeutralSlate,
  SlateDark,
  White,
} from '../../styles/colors';
import {BaseText} from '../styled/Text';

const gutter = 5;
const tabWidth = 150;

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    alignSelf: 'center',
    borderRadius: 50,
    height: 56,
  },
  tabButton: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 44,
    paddingVertical: 10,
    borderRadius: 50,
    margin: gutter,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 16,
    textTransform: 'none',
    fontWeight: '500',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const CustomTabBar: React.FC<MaterialTopTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const {dark} = useTheme();
  const numTabs = state.routes.length;
  const totalWidth = tabWidth * numTabs + gutter * 4;

  return (
    <View
      style={[
        styles.tabBarContainer,
        {
          width: totalWidth,
          backgroundColor: dark ? LightBlack : NeutralSlate,
        },
      ]}>
      {state.routes.map((route, index) => {
        const {options} = descriptors[route.key];
        const isFocused = state.index === index;
        const tabBarLabel =
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : route.name;
        const tabBarIcon = options?.tabBarIcon
          ? options.tabBarIcon({focused: isFocused, color: White, size: 20})
          : null;
        return (
          <TouchableOpacity
            key={route.key}
            style={[
              styles.tabButton,
              {
                width: tabWidth,
                backgroundColor: isFocused ? Action : 'transparent',
              },
            ]}
            onPressOut={_event => {
              navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              navigation.navigate(route.name);
            }}>
            {tabBarIcon && (
              <View style={styles.iconContainer}>{tabBarIcon}</View>
            )}
            <BaseText
              style={[
                styles.tabLabel,
                {
                  color: dark
                    ? NeutralSlate
                    : isFocused
                    ? NeutralSlate
                    : SlateDark,
                },
              ]}>
              {tabBarLabel}
            </BaseText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default CustomTabBar;
