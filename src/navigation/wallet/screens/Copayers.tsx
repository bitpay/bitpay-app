import React, {useState, useCallback, useEffect} from 'react';
import {TouchableOpacity} from 'react-native-gesture-handler';
import Clipboard from '@react-native-community/clipboard';
import {RouteProp, useRoute} from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import styled from 'styled-components/native';

import {FlatList} from 'react-native';

import {BaseText, H6, H4, TextAlign} from '../../../components/styled/Text';
import {
  TitleContainer,
  RowContainer,
  Column,
} from '../../../components/styled/Containers';
import haptic from '../../../components/haptic-feedback/haptic';
import {WalletStackParamList} from '../WalletStack';

import {SlateDark, White} from '../../../styles/colors';

const Gutter = '10px';
const CopayersContainer = styled.View`
  padding: ${Gutter};
`;

const CopayersParagraph = styled(BaseText)`
  font-size: 16px;
  line-height: 25px;
  color: ${SlateDark};
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

const Copayers = () => {
  const route = useRoute<RouteProp<WalletStackParamList, 'Copayers'>>();
  const {wallet} = route.params || {};
  const [walletStatus, setWalletStatus] = useState(undefined as any);
  const [copied, setCopied] = useState(false);

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

  // Flat list
  const renderItem = useCallback(
    ({item}) => (
      <RowContainer activeOpacity={0.75}>
        <Column>
          <BaseText>{item?.name}</BaseText>
        </Column>
      </RowContainer>
    ),
    [],
  );

  return (
    <CopayersContainer>
      <TitleContainer>
        <TextAlign align={'left'}>
          <H4>Bitcoin multisig [2-3]</H4>
        </TextAlign>
      </TitleContainer>
      <CopayersParagraph>
        Share this invitation with the devices joining this account. Each
        copayer has their own recovery phrase. To recover funds stored in a
        Shared Wallet you will need the recovery phrase from each copayer.
      </CopayersParagraph>

      <TouchableOpacity onPress={copyToClipboard} activeOpacity={0.7}>
        <QRCodeContainer>
          <QRCodeBackground>
            {walletStatus?.secret ? (
              <QRCode value={walletStatus?.secret} size={200} />
            ) : null}
          </QRCodeBackground>
        </QRCodeContainer>
      </TouchableOpacity>

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
            renderItem={renderItem}
          />
        </>
      )}
    </CopayersContainer>
  );
};

export default Copayers;
