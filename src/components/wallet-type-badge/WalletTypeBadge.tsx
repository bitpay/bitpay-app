import React, {ReactNode} from 'react';
import {StyleProp, ViewStyle} from 'react-native';
import styled from 'styled-components/native';
import {BaseText} from '../styled/Text';
import {LightBlack, Slate30, SlateDark} from '../../styles/colors';

export type WalletTypeBadgeSize = 'list' | 'card';

interface Props {
  icon: ReactNode;
  label: string;
  size?: WalletTypeBadgeSize;
  style?: StyleProp<ViewStyle>;
}

const Container = styled.View`
  flex-direction: row;
  align-items: center;
  align-self: flex-start;
  gap: 4px;
  border-width: 1px;
  border-color: ${({theme: {dark}}) => (dark ? LightBlack : Slate30)};
  border-radius: 16px;
  padding: 4px 8px;
`;

const Label = styled(BaseText)<{size: WalletTypeBadgeSize}>`
  font-style: normal;
  font-weight: 400;
  font-size: ${({size}) => (size === 'card' ? 13 : 12)}px;
  line-height: ${({size}) => (size === 'card' ? 20 : 15)}px;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
`;

const WalletTypeBadge: React.FC<Props> = ({
  icon,
  label,
  size = 'list',
  style,
}) => (
  <Container style={style}>
    {icon}
    <Label size={size}>{label}</Label>
  </Container>
);

export default WalletTypeBadge;
