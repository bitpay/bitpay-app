import {useNavigation, useTheme} from '@react-navigation/native';
import React from 'react';
import {StyleProp, TextStyle} from 'react-native';
import styled from 'styled-components/native';
import Button from '../../../components/button/Button';
import {BaseText, H7} from '../../../components/styled/Text';
import {LightBlack, NeutralSlate} from '../../../styles/colors';
import {WalletConnectContainer, ScrollView} from './WalletConnectIntro';
import WalletConnectIcon from '../../../../assets/img/wallet-connect/wallet-connect-icon.svg';
import EthIcon from '../../../../assets/img/currencies/eth.svg';
import AngleRight from '../../../../assets/img/angle-right.svg';


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

const SummaryContainer = styled.View`
  padding-bottom: 64px;
`;

const SummaryItemContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  height: 71px;
`;

const NoteContainer = styled.View<{isDark: boolean, isDappUri?: boolean}>`
  background-color: ${({isDark}) => (isDark ? LightBlack : NeutralSlate)};
  border-radius: 40px;
  height: 37px;
  width: ${({isDappUri}) => (isDappUri ? '175px' : '126px')};
  justify-content: flex-start;
  padding: 0 10px;
  flex-direction: row;
  align-items: center;
`;

const IconLabel = styled(H7)`
  padding: 0 6px;
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

const PRItemContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  height: 71px;
`;

const PRItemTitleContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
`;

const PRItemNoteContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
`;

const WalletConnectHome = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const textStyle: StyleProp<TextStyle> = {color: theme.colors.text};
  return (
    <WalletConnectContainer>
      <ScrollView>
          
        <SummaryContainer>
          <TitleText style={textStyle}>Summary</TitleText>
          <Hr isDark={theme.dark} />
          <SummaryItemContainer>
            <H7 style={textStyle}>Connected to</H7>
            <NoteContainer isDappUri={true} isDark={theme.dark}>
              <IconContainer>
                <WalletConnectIcon width={18} height={18} />
              </IconContainer>
              <IconLabel style={textStyle} numberOfLines={1} ellipsizeMode={'tail'}>
              https://example.walletconnectblablabla
              </IconLabel>
            </NoteContainer>
          </SummaryItemContainer>
          <Hr isDark={theme.dark} />
          <SummaryItemContainer>
            <H7 style={textStyle} >Linked Wallet</H7>
            <NoteContainer isDark={theme.dark}>
              <IconContainer>
                <EthIcon width={18} height={18} />
              </IconContainer>
              <IconLabel style={textStyle} numberOfLines={1} ellipsizeMode={'middle'}>
                FHgTasdasdasdsadsa2321FHgTasdasdasdsadsa2321
              </IconLabel>
            </NoteContainer>
          </SummaryItemContainer>
          <Hr isDark={theme.dark} />
        </SummaryContainer>
        <PRContainer>
          <TitleText style={textStyle}>Pending Requests</TitleText>
          <Hr isDark={theme.dark} />
          <PRItemContainer>
              <PRItemTitleContainer>
                <H7 style={textStyle}>No pending requests</H7>
              </PRItemTitleContainer>
          </PRItemContainer>
          <PRItemContainer>
            <PRItemTitleContainer>
                <IconContainer>
              <WalletConnectIcon />
             </IconContainer>
              <IconLabel style={textStyle}>WalletConnect Example</IconLabel>
            </PRItemTitleContainer>
            <PRItemNoteContainer>
                <IconLabel>0.00 ETH</IconLabel>
                <IconContainer>
                    <AngleRight />
                </IconContainer>
            </PRItemNoteContainer>
          </PRItemContainer>
          <Hr isDark={theme.dark}/>
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
