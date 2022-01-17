import {useNavigation} from '@react-navigation/native';
import React from 'react';
import styled from 'styled-components/native';
import {Paragraph} from '../../../components/styled/Text';
import {LightBlack, NeutralSlate} from '../../../styles/colors';
import WalletConnectIcon from '../../../../assets/img/wallet-connect/wallet-connect-icon.svg';
import TrashIcon from '../../../../assets/img/wallet-connect/trash-icon.svg';
import AddConnection from '../../../../assets/img/add-asset.svg';
import haptic from '../../../components/haptic-feedback/haptic';
import {useDispatch} from 'react-redux';
import {AppActions} from '../../../store/app';
import {Hr} from '../../../components/styled/Containers';
import {IconLabel, HeaderTitle} from '../styled/WalletConnectText';
import {
  ItemContainer,
  ItemNoteTouchableContainer,
  ItemTitleTouchableContainer,
  ScrollView,
  WalletConnectContainer,
} from '../styled/WalletConnectContainers';

const ConnectionsContainer = styled.View`
  padding-bottom: 33px;
`;

const IconContainer = styled.View`
  height: 37px;
  width: 37px;
  border-radius: 40px;
  overflow: hidden;
  background-color: ${props => (props.theme.dark ? LightBlack : NeutralSlate)};
  align-items: center;
  justify-content: center;
`;

const WalletConnectConnections = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  return (
    <WalletConnectContainer>
      <ScrollView>
        <ConnectionsContainer>
          <HeaderTitle>Connections</HeaderTitle>
          <Hr />
          <ItemContainer>
            <ItemTitleTouchableContainer
              onPress={() => {
                navigation.navigate('WalletConnect', {
                  screen: 'WalletConnectHome',
                });
              }}>
              <IconContainer>
                <WalletConnectIcon width={17} />
              </IconContainer>
              <IconLabel>https://example.walletconnect.org</IconLabel>
            </ItemTitleTouchableContainer>
            <ItemNoteTouchableContainer
              style={{paddingRight: 10}}
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
            </ItemNoteTouchableContainer>
          </ItemContainer>
          <Hr />
        </ConnectionsContainer>
        <ItemTitleTouchableContainer>
          <AddConnection />
          <Paragraph style={{paddingLeft: 16, paddingBottom: 6}}>
            Add Connection
          </Paragraph>
        </ItemTitleTouchableContainer>
      </ScrollView>
    </WalletConnectContainer>
  );
};

export default WalletConnectConnections;
