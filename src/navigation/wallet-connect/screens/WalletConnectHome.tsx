import {useNavigation} from '@react-navigation/native';
import React from 'react';
import styled from 'styled-components/native';
import Button from '../../../components/button/Button';
import {H7} from '../../../components/styled/Text';
import {LightBlack, NeutralSlate} from '../../../styles/colors';
import WalletConnectIcon from '../../../../assets/img/wallet-connect/wallet-connect-icon.svg';
import EthIcon from '../../../../assets/img/currencies/eth.svg';
import AngleRight from '../../../../assets/img/angle-right.svg';
import {useDispatch} from 'react-redux';
import {AppActions} from '../../../store/app';
import {Hr} from '../../../components/styled/Containers';
import {HeaderTitle, IconLabel} from '../styled/WalletConnectText';
import {
  ItemContainer,
  ItemNoteContainer,
  ItemTitleContainer,
  ItemTouchableContainer,
  ScrollView,
  WalletConnectContainer,
} from '../styled/WalletConnectContainers';

const SummaryContainer = styled.View`
  padding-bottom: 64px;
`;

const NoteContainer = styled.TouchableOpacity<{isDappUri?: boolean}>`
  background-color: ${props => (props.theme.dark ? LightBlack : NeutralSlate)};
  border-radius: 40px;
  height: 37px;
  width: ${({isDappUri}) => (isDappUri ? '175px' : '126px')};
  justify-content: flex-start;
  padding: 0 10px;
  flex-direction: row;
  align-items: center;
`;

const IconContainer = styled.View`
  height: auto;
  width: auto;
  border-radius: 9px;
  overflow: hidden;
`;

const PRContainer = styled.View`
  padding-bottom: 64px;
`;

const WalletConnectHome = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  return (
    <WalletConnectContainer>
      <ScrollView>
        <SummaryContainer>
          <HeaderTitle>Summary</HeaderTitle>
          <Hr />
          <ItemContainer>
            <H7>Connected to</H7>
            <NoteContainer isDappUri={true} onPress={() => {}}>
              <IconContainer>
                <WalletConnectIcon width={18} height={18} />
              </IconContainer>
              <IconLabel numberOfLines={1} ellipsizeMode={'tail'}>
                https://example.walletconnectblablabla
              </IconLabel>
            </NoteContainer>
          </ItemContainer>
          <Hr />
          <ItemContainer>
            <H7>Linked Wallet</H7>
            <NoteContainer onPress={() => {}}>
              <IconContainer>
                <EthIcon width={18} height={18} />
              </IconContainer>
              <IconLabel numberOfLines={1} ellipsizeMode={'middle'}>
                FHgTasdasdasdsadsa2321FHgTasdasdasdsadsa2321
              </IconLabel>
            </NoteContainer>
          </ItemContainer>
          <Hr />
        </SummaryContainer>
        <PRContainer>
          <HeaderTitle>Pending Requests</HeaderTitle>
          <Hr />
          <ItemContainer>
            <ItemTitleContainer>
              <H7>No pending requests</H7>
            </ItemTitleContainer>
          </ItemContainer>
          <ItemTouchableContainer
            onPress={() => {
              dispatch(AppActions.dismissBottomNotificationModal());
              navigation.navigate('WalletConnect', {
                screen: 'WalletConnectRequestDetails',
              });
            }}>
            <ItemTitleContainer>
              <IconContainer>
                <WalletConnectIcon />
              </IconContainer>
              <IconLabel>WalletConnect Example</IconLabel>
            </ItemTitleContainer>
            <ItemNoteContainer>
              <IconLabel>0.00 ETH</IconLabel>
              <IconContainer>
                <AngleRight />
              </IconContainer>
            </ItemNoteContainer>
          </ItemTouchableContainer>
          <Hr />
        </PRContainer>
      </ScrollView>
      <Button
        buttonStyle={'secondary'}
        onPress={() => {
          navigation.navigate('WalletConnect', {
            screen: 'WalletConnectStart',
          });
        }}>
        Disconnect
      </Button>
    </WalletConnectContainer>
  );
};

export default WalletConnectHome;
