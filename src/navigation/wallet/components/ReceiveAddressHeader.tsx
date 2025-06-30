import React from 'react';
import {View} from 'react-native';
import haptic from '../../../components/haptic-feedback/haptic';
import RefreshIcon from '../../../components/icons/refresh/RefreshIcon';
import styled from 'styled-components/native';
import {BaseText, H4} from '../../../components/styled/Text';
import {Action, NeutralSlate, SlateDark} from '../../../styles/colors';
import {useTranslation} from 'react-i18next';
import {TouchableOpacity} from 'react-native-gesture-handler';

const Header = styled.View`
  margin-bottom: 30px;
  flex-direction: row;
  justify-content: center;
  position: relative;
  align-items: center;
`;

const Title = styled(H4)`
  color: ${({theme}) => theme.colors.text};
`;

const RefreshContainer = styled(View)<{isBch?: boolean}>`
  position: ${({isBch}) => (isBch ? 'relative' : 'absolute')};
  margin-left: 5px;
  right: 0;
  margin-top: ${({isBch}) => (isBch ? '10px' : '0')};
`;

const Refresh = styled(TouchableOpacity)`
  background-color: ${({theme: {dark}}) => (dark ? '#616161' : '#F5F7F8')};
  width: 40px;
  height: 40px;
  border-radius: 50px;
  align-items: center;
  justify-content: center;
`;

const BchHeaderAction = styled(TouchableOpacity)<{isActive: boolean}>`
  align-items: center;
  justify-content: center;
  margin: 0 10px -1px;
  border-bottom-color: ${({isActive}) => (isActive ? Action : 'transparent')};
  border-bottom-width: 1px;
  height: 60px;
`;

const BchHeaderActionText = styled(BaseText)<{isActive: boolean}>`
  font-size: 16px;
  color: ${({theme, isActive}) =>
    isActive ? theme.colors.text : theme.dark ? NeutralSlate : SlateDark};
`;

const BchHeaderActions = styled.View`
  flex-direction: row;
`;

const BchHeader = styled.View`
  margin-bottom: 30px;
  border-bottom-width: 1px;
  border-bottom-color: #979797;
  align-items: center;
  flex-direction: row;
  justify-content: space-between;
`;

export interface HeaderContextHandler {
  currency: string;
  disabled: boolean;
  activeItem: string;
  onPressChange: (item: string) => void;
  items: string[];
}

interface Props {
  onPressRefresh: () => void;
  contextHandlers?: HeaderContextHandler | null;
  showRefresh: boolean;
}

const ReceiveAddressHeader = ({
  onPressRefresh,
  contextHandlers,
  showRefresh,
}: Props) => {
  const {t} = useTranslation();
  const {currency} = contextHandlers || {};
  switch (currency) {
    case 'bch':
      const {disabled, activeItem, onPressChange, items} =
        contextHandlers || {};
      return (
        <BchHeader>
          <Title>{t('Address')}</Title>

          <BchHeaderActions>
            {items &&
              items.map((type, index) => (
                <BchHeaderAction
                  key={index}
                  onPress={() => onPressChange && onPressChange(type)}
                  isActive={activeItem === type}
                  disabled={disabled}>
                  <BchHeaderActionText isActive={activeItem === type}>
                    {type}
                  </BchHeaderActionText>
                </BchHeaderAction>
              ))}
            <RefreshContainer isBch={true}>
              <Refresh
                onPress={() => {
                  haptic('impactLight');
                  onPressRefresh();
                }}>
                <RefreshIcon />
              </Refresh>
            </RefreshContainer>
          </BchHeaderActions>
        </BchHeader>
      );
    default:
      return (
        <Header>
          <Title>{t('Address')}</Title>
          <RefreshContainer>
            {showRefresh ? (
              <Refresh
                onPress={() => {
                  haptic('impactLight');
                  onPressRefresh();
                }}>
                <RefreshIcon />
              </Refresh>
            ) : null}
          </RefreshContainer>
        </Header>
      );
  }
};

export default ReceiveAddressHeader;
