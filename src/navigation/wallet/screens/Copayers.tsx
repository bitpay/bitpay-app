import React, {useState, useLayoutEffect, useEffect} from 'react';
import {StackNavigationProp} from '@react-navigation/stack';
import {TouchableOpacity} from 'react-native-gesture-handler';
import Clipboard from '@react-native-community/clipboard';
import {RouteProp, useRoute} from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import styled from 'styled-components/native';
import {FlatList, Image} from 'react-native';
import {
  Paragraph,
  BaseText,
  H6,
  H4,
  TextAlign,
  HeaderTitle,
} from '../../../components/styled/Text';
import {
  TitleContainer,
  RowContainer,
  ActiveOpacity,
} from '../../../components/styled/Containers';
import haptic from '../../../components/haptic-feedback/haptic';
import {WalletStackParamList} from '../WalletStack';
import {White} from '../../../styles/colors';

const CircleCheckIcon = require('../../../../assets/img/circle-check.png');
interface CopayersProps {
  navigation: StackNavigationProp<WalletStackParamList, 'Copayers'>;
}

const Gutter = '10px';
const CopayersContainer = styled.View`
  padding: ${Gutter};
`;

const AuthorizedContainer = styled(BaseText)`
  margin: 0 20px;
`;

const QRCodeContainer = styled.View`
  align-items: center;
  margin: 15px;
`;

const QRCodeBackground = styled.View`
  background-color: ${White};
  width: 225px;
  height: 225px;
  justify-content: center;
  align-items: center;
  border-radius: 12px;
`;

const LoadingContainer = styled.View`
  min-height: 300px;
  justify-content: center;
  align-items: center;
`;

const LoadingText = styled(H4)`
  color: ${({theme}) => theme.colors.text};
`;

const Copayers: React.FC<CopayersProps> = props => {
  const route = useRoute<RouteProp<WalletStackParamList, 'Copayers'>>();
  const {wallet} = route.params || {};
  const [walletStatus, setWalletStatus] = useState(undefined as any);
  const [copied, setCopied] = useState(false);
  const {navigation} = props;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <HeaderTitle>{`${wallet?.currencyName} multisig [${wallet?.m}-${wallet?.n}]`}</HeaderTitle>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    // TODO GET STATUS
    wallet?.getStatus({network: 'livenet'}, (err: any, status: any) => {
      if (err) {
        console.log(err);
      }
      setWalletStatus(status.wallet);
    });
  }, [wallet, setWalletStatus]);

  const copyToClipboard = () => {
    haptic('impactLight');
    if (!copied) {
      Clipboard.setString(walletStatus?.secret);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 3000);
    }
  };

  return (
    <CopayersContainer>
      <Paragraph>
        Share this invitation with the devices joining this account. Each
        copayer has their own recovery phrase. To recover funds stored in a
        Shared Wallet you will need the recovery phrase from each copayer.
      </Paragraph>

      {walletStatus && walletStatus.secret ? (
        <>
          <TouchableOpacity
            onPress={copyToClipboard}
            activeOpacity={ActiveOpacity}>
            <QRCodeContainer>
              <QRCodeBackground>
                <QRCode value={walletStatus.secret} size={200} />
              </QRCodeBackground>
            </QRCodeContainer>
          </TouchableOpacity>
        </>
      ) : (
        <LoadingContainer>
          <LoadingText>Generating Invitation code...</LoadingText>
        </LoadingContainer>
      )}

      {walletStatus && (
        <>
          <TitleContainer>
            <TextAlign align={'left'}>
              <H6>Waiting for authorized copayers to join</H6>
            </TextAlign>
          </TitleContainer>
          <FlatList
            contentContainerStyle={{paddingBottom: 100}}
            data={walletStatus?.copayers}
            renderItem={({item}) => (
              <RowContainer activeOpacity={ActiveOpacity}>
                <Image source={CircleCheckIcon} />
                <AuthorizedContainer>{item?.name}</AuthorizedContainer>
              </RowContainer>
            )}
          />
        </>
      )}
    </CopayersContainer>
  );
};

export default Copayers;
