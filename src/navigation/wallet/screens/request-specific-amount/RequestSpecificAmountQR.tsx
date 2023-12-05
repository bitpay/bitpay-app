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
import CopySvg from '../../../../../assets/img/copy.svg';
import CopiedSvg from '../../../../../assets/img/copied-success.svg';
import haptic from '../../../../components/haptic-feedback/haptic';
import Clipboard from '@react-native-clipboard/clipboard';
import QRCode from 'react-native-qrcode-svg';
import {LightBlack, White} from '../../../../styles/colors';
import ShareIcon from '../../../../components/icons/share/Share';
import {Share} from 'react-native';
import GhostSvg from '../../../../../assets/img/ghost-straight-face.svg';
import {createWalletAddress} from '../../../../store/wallet/effects/address/address';
import {
  GetProtocolPrefix,
  IsUtxoCoin,
} from '../../../../store/wallet/utils/currency';
import {
  FormattedAmountObj,
  ParseAmount,
} from '../../../../store/wallet/effects/amount/amount';
import {useAppDispatch} from '../../../../utils/hooks';
import {useTranslation} from 'react-i18next';

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
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : White)};
  min-height: 390px;
  justify-content: center;
`;

const QRCodeContainer = styled.View`
  margin: 20px;
  width: 225px;
  height: 225px;
  justify-content: center;
  align-items: center;
  background-color: ${White};
  border-radius: 12px;
`;

const QRHeader = styled(H4)`
  text-align: center;
  margin: 10px 0 20px;
  color: ${({theme}) => theme.colors.text};
`;

const CopyToClipboard = styled.TouchableOpacity`
  border: 1px solid #9ba3ae;
  border-radius: 4px;
  padding: 0 10px;
  min-height: 55px;
  align-items: center;
  flex-direction: row;
`;

const AddressText = styled(BaseText)`
  font-size: 16px;
  color: ${({theme: {dark}}) => (dark ? White : '#6f7782')};
  padding: 0 20px 0 10px;
`;

const CopyImgContainer = styled.View`
  border-right-color: #eceffd;
  border-right-width: 1px;
  padding-right: 10px;
  height: 25px;
  justify-content: center;
`;

const ShareIconContainer = styled.TouchableOpacity``;

const RequestSpecificAmountQR = () => {
  const {t} = useTranslation();
  const route =
    useRoute<RouteProp<WalletStackParamList, 'RequestSpecificAmountQR'>>();
  const {wallet, requestAmount} = route.params;
  const {
    credentials: {walletName},
    currencyAbbreviation,
    network,
    chain,
    tokenAddress,
  } = wallet;
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const [formattedAmountObj, setFormattedAmountObj] =
    useState<FormattedAmountObj>();
  const [loading, setLoading] = useState(true);

  const [qrValue, setQrValue] = useState<string>();

  useLayoutEffect(() => {
    const onPressShare = async () => {
      if (qrValue) {
        await Share.share({
          message: qrValue,
        });
      }
    };

    navigation.setOptions({
      headerTitle: () => <HeaderTitle>{walletName}</HeaderTitle>,
      headerRight: () => (
        <ShareIconContainer activeOpacity={0.75} onPress={onPressShare}>
          <ShareIcon />
        </ShareIconContainer>
      ),
    });
  }, [navigation, walletName, qrValue]);

  const init = async () => {
    try {
      const address = (await dispatch<any>(
        createWalletAddress({wallet, newAddress: false}),
      )) as string;

      let _qrValue;
      _qrValue = GetProtocolPrefix(network, chain) + ':' + address;

      const _formattedAmountObj = dispatch(
        ParseAmount(requestAmount, currencyAbbreviation, chain, tokenAddress),
      );

      if (IsUtxoCoin(currencyAbbreviation) || currencyAbbreviation === 'xrp') {
        _qrValue = _qrValue + '?amount=' + _formattedAmountObj.amount;
      } else {
        _qrValue = _qrValue + '?value=' + _formattedAmountObj.amountSat;
      }

      setFormattedAmountObj(_formattedAmountObj);
      setQrValue(_qrValue);
      setLoading(false);
    } catch (e) {
      setLoading(false);
    }
  };

  useEffect(() => {
    init();
  }, [wallet]);

  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    haptic('impactLight');
    if (!copied && qrValue) {
      Clipboard.setString(qrValue);
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
        <H5>{t('Payment Request')}</H5>
        <ParagraphContainer>
          <Paragraph>
            {t('Share this QR code to receive in your wallet .', {
              amountUnitStr: formattedAmountObj?.amountUnitStr,
              walletName: wallet.walletName || wallet.credentials.walletName,
            })}
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
          {qrValue ? (
            <>
              <QRHeader>
                {t('Receive') + ' ' + formattedAmountObj?.amountUnitStr}
              </QRHeader>
              <CopyToClipboard onPress={copyToClipboard} activeOpacity={0.7}>
                <CopyImgContainer>
                  {!copied ? <CopySvg width={17} /> : <CopiedSvg width={17} />}
                </CopyImgContainer>
                <AddressText numberOfLines={1} ellipsizeMode={'tail'}>
                  {qrValue}
                </AddressText>
              </CopyToClipboard>

              <QRCodeContainer>
                <QRCode value={qrValue} size={200} />
              </QRCodeContainer>
            </>
          ) : loading ? (
            <QRHeader>{t('Generating Address...')}</QRHeader>
          ) : (
            <>
              <GhostSvg />
              <QRHeader>
                {t('Something went wrong. Please try again.')}
              </QRHeader>
            </>
          )}
        </QRContainer>
      </ScrollView>
    </SpecificAmtQRContainer>
  );
};

export default RequestSpecificAmountQR;
