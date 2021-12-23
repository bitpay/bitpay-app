import React from 'react';
import styled from 'styled-components/native';
import Button from '../../../components/button/Button';
import {Paragraph} from '../../../components/styled/Text';
import VerifiedIcon from '../../../../assets/img/wallet-connect/verified-icon.svg';
import WalletIcon from '../../../../assets/img/wallet-connect/wallet-icon.svg';
import {useNavigation, useTheme} from '@react-navigation/native';
import {
  LightBlack,
  NeutralSlate,
  SlateDark,
  White,
} from '../../../styles/colors';
import {StyleProp, TextStyle} from 'react-native';
import {ScrollView, WalletConnectContainer} from './WalletConnectIntro';
import haptic from '../../../components/haptic-feedback/haptic';
import {AppActions} from '../../../store/app';
import {useDispatch} from 'react-redux';

const RequestLabel = styled(Paragraph)<{isDark: boolean}>`
  color: ${({isDark}) => (isDark ? White : SlateDark)};
`;

const UriContainer = styled.View<{isDark: boolean}>`
  background-color: ${({isDark}) => (isDark ? LightBlack : NeutralSlate)};
  border-radius: 6px;
  height: 64px;
  margin-top: 25px;
  margin-bottom: 35px;
  justify-content: center;
  align-items: center;
`;

const DescriptionContainer = styled.View`
  margin-bottom: 50px;
`;

const DescriptionItemContainer = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: 20px;
`;

const DescriptionItem = styled(Paragraph)`
  padding-left: 9px;
`;

const WalletConnectStart = () => {
  const theme = useTheme();
  const textStyle: StyleProp<TextStyle> = {color: theme.colors.text};
  const dispatch = useDispatch();
  const navigation = useNavigation();

  return (
    <WalletConnectContainer>
      <ScrollView>
        <RequestLabel isDark={theme.dark}>
          Lorem ipsum wants to connect to your wallet.
        </RequestLabel>
        <UriContainer isDark={theme.dark}>
          <Paragraph style={textStyle}>
            https://example.walletconnect.org
          </Paragraph>
        </UriContainer>
        <DescriptionContainer>
          <DescriptionItemContainer>
            <WalletIcon />
            <DescriptionItem style={textStyle}>
              View your wallet balance and activity.
            </DescriptionItem>
          </DescriptionItemContainer>
          <DescriptionItemContainer>
            <VerifiedIcon />
            <DescriptionItem style={textStyle}>
              Request approval for transactions.
            </DescriptionItem>
          </DescriptionItemContainer>
        </DescriptionContainer>
        <Button
          buttonStyle={'primary'}
          onPress={async () => {
            haptic('impactLight');
            dispatch(
              AppActions.showBottomNotificationModal({
                type: 'success',
                title: 'Connected',
                message: 'You can now return to your browser.',
                enableBackdropDismiss: true,
                actions: [
                  {
                    text: 'GOT IT',
                    action: () => {
                      dispatch(AppActions.dismissBottomNotificationModal());
                      navigation.navigate('WalletConnect', {
                        screen: 'WalletConnectHome',
                      });
                    },
                    primary: true,
                  },
                ],
              }),
            );
          }}>
          Connect
        </Button>
      </ScrollView>
    </WalletConnectContainer>
  );
};

export default WalletConnectStart;
