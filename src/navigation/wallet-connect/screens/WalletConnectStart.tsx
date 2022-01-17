import React from 'react';
import styled from 'styled-components/native';
import Button from '../../../components/button/Button';
import {Paragraph} from '../../../components/styled/Text';
import VerifiedIcon from '../../../../assets/img/wallet-connect/verified-icon.svg';
import WalletIcon from '../../../../assets/img/wallet-connect/wallet-icon.svg';
import {useNavigation} from '@react-navigation/native';
import {LightBlack, NeutralSlate} from '../../../styles/colors';
import haptic from '../../../components/haptic-feedback/haptic';
import {AppActions} from '../../../store/app';
import {useDispatch} from 'react-redux';
import {
  ScrollView,
  WalletConnectContainer,
} from '../styled/WalletConnectContainers';

const UriContainer = styled.View`
  background-color: ${props => (props.theme.dark ? LightBlack : NeutralSlate)};
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
  padding-top: 2px;
  color: ${props => props.theme.colors.text};
`;

const WalletConnectStart = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();

  return (
    <WalletConnectContainer>
      <ScrollView>
        <Paragraph>Lorem ipsum wants to connect to your wallet.</Paragraph>
        <UriContainer>
          <Paragraph>https://example.walletconnect.org</Paragraph>
        </UriContainer>
        <DescriptionContainer>
          <DescriptionItemContainer>
            <WalletIcon />
            <DescriptionItem>
              View your wallet balance and activity.
            </DescriptionItem>
          </DescriptionItemContainer>
          <DescriptionItemContainer>
            <VerifiedIcon />
            <DescriptionItem>
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
                        screen: 'WalletConnectConnections',
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
