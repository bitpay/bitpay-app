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
import {WalletGroupParamList} from '../../WalletGroup';
import {SafeAreaView, ScrollView, StyleSheet, View} from 'react-native';
import {useTheme} from '../../../../contexts';
import {ScreenGutter} from '../../../../components/styled/Containers';
import CopySvg from '../../../../../assets/img/copy.svg';
import CopiedSvg from '../../../../../assets/img/copied-success.svg';
import haptic from '../../../../components/haptic-feedback/haptic';
import Clipboard from '@react-native-clipboard/clipboard';
import QRCode from 'react-native-qrcode-svg';
import {LightBlack, LightBlue, White} from '../../../../styles/colors';
import ShareIcon from '../../../../components/icons/share/Share';
import {shareNative} from '../../../../utils/share';
import GhostSvg from '../../../../../assets/img/ghost-straight-face.svg';
import {createWalletAddress} from '../../../../store/wallet/effects/address/address';
import {
  GetProtocolPrefix,
  IsUtxoChain,
} from '../../../../store/wallet/utils/currency';
import {
  FormattedAmountObj,
  ParseAmount,
} from '../../../../store/wallet/effects/amount/amount';
import {useAppDispatch} from '../../../../utils/hooks';
import {useTranslation} from 'react-i18next';
import {TouchableOpacity} from '@components/base/TouchableOpacity';

const gutter = parseInt(ScreenGutter, 10);

const styles = StyleSheet.create({
  specificAmtQRContainer: {
    flex: 1,
  },
  scrollView: {
    marginTop: 20,
    paddingHorizontal: gutter,
  },
  paragraphContainer: {
    marginTop: 10,
    marginHorizontal: 0,
    marginBottom: 20,
  },
  qrContainer: {
    marginTop: 20,
    alignItems: 'center',
    flexDirection: 'column',
    padding: 25,
    borderRadius: 12,
    minHeight: 390,
    justifyContent: 'center',
  },
  qrCodeContainer: {
    margin: 20,
    width: 225,
    height: 225,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: White,
    borderRadius: 12,
  },
  qrHeader: {
    textAlign: 'center',
    marginTop: 10,
    marginHorizontal: 0,
    marginBottom: 20,
  },
  copyToClipboard: {
    borderWidth: 1,
    borderColor: '#9ba3ae',
    borderRadius: 4,
    paddingHorizontal: 10,
    minHeight: 55,
    alignItems: 'center',
    flexDirection: 'row',
  },
  addressText: {
    fontSize: 16,
    paddingTop: 0,
    paddingRight: 20,
    paddingBottom: 0,
    paddingLeft: 10,
  },
  copyImgContainer: {
    borderRightColor: LightBlue,
    borderRightWidth: 1,
    paddingRight: 10,
    height: 25,
    justifyContent: 'center',
  },
});

const SpecificAmtQRContainer: React.FC<
  React.ComponentProps<typeof SafeAreaView>
> = ({style, ...rest}) => (
  <SafeAreaView style={[styles.specificAmtQRContainer, style]} {...rest} />
);

const StyledScrollView: React.FC<React.ComponentProps<typeof ScrollView>> = ({
  style,
  ...rest
}) => <ScrollView style={[styles.scrollView, style]} {...rest} />;

const ParagraphContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.paragraphContainer, style]} {...rest} />;

const QRContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.qrContainer,
        {backgroundColor: theme.dark ? LightBlack : White},
        style,
      ]}
      {...rest}
    />
  );
};

const QRCodeContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.qrCodeContainer, style]} {...rest} />;

const QRHeader: React.FC<React.ComponentProps<typeof H4>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <H4
      style={[styles.qrHeader, {color: theme.colors.text}, style]}
      {...rest}
    />
  );
};

const CopyToClipboard: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => (
  <TouchableOpacity style={[styles.copyToClipboard, style]} {...rest} />
);

const AddressText: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.addressText,
        {color: theme.dark ? White : '#6f7782'},
        style,
      ]}
      {...rest}
    />
  );
};

const CopyImgContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.copyImgContainer, style]} {...rest} />;

const ShareIconContainer: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = props => <TouchableOpacity {...props} />;

const RequestSpecificAmountQR = () => {
  const {t} = useTranslation();
  const route =
    useRoute<RouteProp<WalletGroupParamList, 'RequestSpecificAmountQR'>>();
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
        await dispatch(shareNative({message: qrValue}));
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

      if (IsUtxoChain(chain) || chain === 'xrp') {
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
      <StyledScrollView>
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
      </StyledScrollView>
    </SpecificAmtQRContainer>
  );
};

export default RequestSpecificAmountQR;
