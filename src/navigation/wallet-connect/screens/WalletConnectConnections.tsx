import {useNavigation, useTheme} from '@react-navigation/native';
import React from 'react';
import {StyleProp, TextStyle} from 'react-native';
import styled from 'styled-components/native';
import {BaseText, H7, Paragraph} from '../../../components/styled/Text';
import {LightBlack, NeutralSlate} from '../../../styles/colors';
import {WalletConnectContainer, ScrollView} from './WalletConnectIntro';
import WalletConnectIcon from '../../../../assets/img/wallet-connect/wallet-connect-icon.svg';
import TrashIcon from '../../../../assets/img/wallet-connect/trash-icon.svg';
import AddConnection from '../../../../assets/img/add-asset.svg';
import haptic from '../../../components/haptic-feedback/haptic';
import {useDispatch} from 'react-redux';
import {AppActions} from '../../../store/app';

const TitleText = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  font-weight: 500;
  line-height: 18px;
  text-transform: uppercase;
  margin-bottom: 12px;
`;

const Hr = styled.View<{isDark: boolean}>`
  border-bottom-color: ${({isDark}) => (isDark ? LightBlack : '#ebebeb')};
  border-bottom-width: 1px;
`;

const ConnectionsContainer = styled.View`
  padding-bottom: 33px;
`;

const IconLabel = styled(H7)`
  padding: 0 6px;
`;

const IconContainer = styled.View<{isDark: boolean}>`
  height: 37px;
  width: 37px;
  border-radius: 40px;
  overflow: hidden;
  background-color: ${({isDark}) => (isDark ? LightBlack : NeutralSlate)};
  align-items: center;
  justify-content: center;
`;

const ConnectionItemContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  height: 71px;
`;

const ConnectionItemTitleContainer = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
`;

const ConnectionItemNoteContainer = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  padding-right: 10px;
`;

const AddConnectionContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
`;

const AddConnectionLabel = styled(Paragraph)`
  padding-left: 16px;
`;

const WalletConnectConnections = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const dispatch = useDispatch();
  const textStyle: StyleProp<TextStyle> = {color: theme.colors.text};
  return (
    <WalletConnectContainer>
      <ScrollView>
        <ConnectionsContainer>
          <TitleText style={textStyle}>Connections</TitleText>
          <Hr isDark={theme.dark} />
          <ConnectionItemContainer>
            <ConnectionItemTitleContainer
              onPress={() => {
                navigation.navigate('WalletConnect', {
                  screen: 'WalletConnectHome',
                });
              }}>
              <IconContainer isDark={theme.dark}>
                <WalletConnectIcon width={17} />
              </IconContainer>
              <IconLabel style={textStyle}>
                https://example.walletconnect.org
              </IconLabel>
            </ConnectionItemTitleContainer>
            <ConnectionItemNoteContainer
              onPress={async () => {
                haptic('impactLight');
                dispatch(
                  AppActions.showBottomNotificationModal({
                    type: 'question',
                    title: 'Confirm Delete',
                    message: 'Are you sure you want to delete this connection?',
                    enableBackdropDismiss: true,
                    actions: [
                      {
                        text: 'DELETE',
                        action: () => {
                          dispatch(AppActions.dismissBottomNotificationModal());
                          navigation.navigate('WalletConnect', {
                            screen: 'WalletConnectConnections',
                          });
                        },
                        primary: true,
                      },
                      {
                        text: 'GO BACK',
                        action: () => {},
                      },
                    ],
                  }),
                );
              }}>
              <TrashIcon />
            </ConnectionItemNoteContainer>
          </ConnectionItemContainer>
          <Hr isDark={theme.dark} />
          <ConnectionItemContainer>
            <ConnectionItemTitleContainer
              onPress={() => {
                navigation.navigate('WalletConnect', {
                  screen: 'WalletConnectHome',
                });
              }}>
              <IconContainer isDark={theme.dark}>
                <WalletConnectIcon width={17} />
              </IconContainer>
              <IconLabel style={textStyle}>
                https://example.walletconnect.org
              </IconLabel>
            </ConnectionItemTitleContainer>
            <ConnectionItemNoteContainer>
              <TrashIcon />
            </ConnectionItemNoteContainer>
          </ConnectionItemContainer>
          <Hr isDark={theme.dark} />
        </ConnectionsContainer>
        <AddConnectionContainer>
          <AddConnection />
          <AddConnectionLabel>Add Connection</AddConnectionLabel>
        </AddConnectionContainer>
      </ScrollView>
    </WalletConnectContainer>
  );
};

export default WalletConnectConnections;
