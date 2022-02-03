import {
  BaseText,
  H4,
  H5,
  HeaderTitle,
  Paragraph,
} from '../../../../components/styled/Text';
import React, {useEffect, useLayoutEffect, useState} from 'react';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../../WalletStack';
import styled from 'styled-components/native';
import {ScreenGutter} from '../../../../components/styled/Containers';
import {CreateWalletAddress} from '../../../../store/wallet/effects/send/address';
import {
  FormatCryptoAmount,
  GetProtocolPrefix,
  IsUtxoCoin,
} from '../../../../store/wallet/utils/wallet';
import CopySvg from '../../../../../assets/img/copy.svg';
import CopiedSvg from '../../../../../assets/img/copied-success.svg';
import haptic from '../../../../components/haptic-feedback/haptic';
import Clipboard from '@react-native-community/clipboard';
import QRCode from 'react-native-qrcode-svg';
import {Black, White} from '../../../../styles/colors';

const SpecificAmtQRContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollView = styled.ScrollView`
  margin-top: 20px;
  padding: 0 ${ScreenGutter};
`;

const ParagraphContainer = styled.View`
  margin: 10px 0 20px;
`;

const QRContainer = styled.View`
  margin-top: 20px;
  align-items: center;
  flex-direction: column;
  padding: 25px;
  border-radius: 12px;
  background-color: ${White};
`;

const QRCodeContainer = styled.View`
  margin: 20px;
  align-items: center;
`;

const QRHeader = styled(H4)`
  text-align: center;
  margin-bottom: 20px;
  color: ${Black};
`;

export const CopyToClipboard = styled.TouchableOpacity`
  border: 1px solid #9ba3ae;
  border-radius: 4px;
  padding: 0 10px;
  min-height: 55px;
  align-items: center;
  flex-direction: row;
`;

export const AddressText = styled(BaseText)`
  font-size: 16px;
  color: #6f7782;
  padding: 0 20px 0 10px;
`;

export const CopyImgContainer = styled.View`
  border-right-color: #eceffd;
  border-right-width: 1px;
  padding-right: 10px;
  height: 25px;
  justify-content: center;
`;

const RequestSpecificAmountQR = () => {
  const route =
    useRoute<RouteProp<WalletStackParamList, 'RequestSpecificAmountQR'>>();
  const {wallet, requestAmount} = route.params;
  const {
    credentials: {walletName, network},
    currencyAbbreviation,
  } = wallet;
  const navigation = useNavigation();
  const [formattedAmount, setFormattedAmount] = useState<number>();
  const [address, setAddress] = useState<string>();
  const [receiveAddressAmt, setReceiveAddressAmt] = useState<string>();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>{walletName}</HeaderTitle>,
    });
  }, [navigation]);

  CreateWalletAddress(wallet).then(addr => {
    setAddress(addr);
    let qrAddress = addr;
    if (currencyAbbreviation === 'bch') {
      qrAddress = GetProtocolPrefix(currencyAbbreviation, network) + ':' + addr;
    }

    const _formattedAmount = FormatCryptoAmount(
      +requestAmount,
      currencyAbbreviation,
    );

    setFormattedAmount(_formattedAmount);
    if (IsUtxoCoin(currencyAbbreviation) || currencyAbbreviation === 'xrp') {
      qrAddress = qrAddress + '?address=' + _formattedAmount;
    } else {
      qrAddress = qrAddress + '?value=' + _formattedAmount;
    }

    setReceiveAddressAmt(qrAddress);
  });

  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    haptic('impactLight');
    if (!copied) {
      Clipboard.setString(address);
      setCopied(true);
    }
  };

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => {
      setCopied(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <SpecificAmtQRContainer>
      <ScrollView>
        <H5>Payment Request</H5>
        <ParagraphContainer>
          <Paragraph>
            Share this QR code to receive {formattedAmount}{' '}
            {currencyAbbreviation.toUpperCase()} in your wallet Ethereum.
          </Paragraph>
        </ParagraphContainer>

        <QRContainer
          style={[
            {
              shadowColor: '#000',
              shadowOffset: {width: -2, height: 4},
              shadowOpacity: 0.1,
              shadowRadius: 5,
              borderRadius: 12,

              elevation: 3,
            },
          ]}>
          <QRHeader>
            Receive {formattedAmount} {currencyAbbreviation.toUpperCase()}
          </QRHeader>
          <CopyToClipboard onPress={copyToClipboard} activeOpacity={0.7}>
            <CopyImgContainer>
              {!copied ? <CopySvg width={17} /> : <CopiedSvg width={17} />}
            </CopyImgContainer>
            <AddressText numberOfLines={1} ellipsizeMode={'tail'}>
              {address}
            </AddressText>
          </CopyToClipboard>

          <QRCodeContainer>
            <QRCode value={receiveAddressAmt} size={200} />
          </QRCodeContainer>
        </QRContainer>
      </ScrollView>
    </SpecificAmtQRContainer>
  );
};

export default RequestSpecificAmountQR;
