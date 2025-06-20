import React from 'react';
import styled from 'styled-components/native';
import {MaterialTopTabBarProps} from '@react-navigation/material-top-tabs';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {useTheme} from 'styled-components/native';
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

const TabBarContainer = styled.View<{darkMode: boolean; totalWidth: number}>`
  flex-direction: row;
  align-self: center;
  border-radius: 50px;
  width: ${({totalWidth}) => totalWidth}px;
  height: 56px;
  background-color: ${({darkMode}) => (darkMode ? LightBlack : NeutralSlate)};
`;

const TabButton = styled(TouchableOpacity)<{
  isFocused: boolean;
  tabWidth: number;
}>`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 5px;
  width: ${({tabWidth}) => tabWidth}px;
  height: 44px;
  padding-vertical: 10px;
  border-radius: 50px;
  margin: ${gutter}px;
  position: relative;
  background-color: ${({isFocused}) => (isFocused ? Action : 'transparent')};
`;

const TabLabel = styled(BaseText)<{isFocused: boolean}>`
  color: ${({theme: {dark}, isFocused}) =>
    dark ? NeutralSlate : isFocused ? NeutralSlate : SlateDark};
  font-size: 16px;
  text-transform: none;
  font-weight: 500;
`;

const IconContainer = styled.View`
  align-items: center;
  justify-content: center;
`;

const CustomTabBar: React.FC<MaterialTopTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const {dark} = useTheme();
  const numTabs = state.routes.length;
  const totalWidth = tabWidth * numTabs + gutter * 4;

  return (
    <TabBarContainer darkMode={dark} totalWidth={totalWidth}>
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
          <TabButton
            key={route.key}
            isFocused={isFocused}
            tabWidth={tabWidth}
            onPressOut={event => {
              navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              navigation.navigate(route.name);
            }}>
            {tabBarIcon && <IconContainer>{tabBarIcon}</IconContainer>}
            <TabLabel isFocused={isFocused}>{tabBarLabel}</TabLabel>
          </TabButton>
        );
      })}
    </TabBarContainer>
  );
};

export default CustomTabBar;
