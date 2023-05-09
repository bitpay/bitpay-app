import React, {useEffect, useState} from 'react';
import {
  ScrollView,
  Linking,
  Share,
  RefreshControl,
  Image,
  DeviceEventEmitter,
} from 'react-native';
import RNPrint from 'react-native-print';
import TimeAgo from 'react-native-timeago';
import {StackScreenProps} from '@react-navigation/stack';
import styled from 'styled-components/native';
import {useTheme} from 'styled-components/native';
import Button from '../../../../../components/button/Button';
import {
  CtaContainer,
  HeaderRightContainer,
} from '../../../../../components/styled/Containers';
import {
  BaseText,
  HeaderTitle,
  Link,
  Paragraph,
  TextAlign,
} from '../../../../../components/styled/Text';
import {
  Grey,
  LightBlack,
  NeutralSlate,
  SlateDark,
  White,
} from '../../../../../styles/colors';
import RemoteImage from '../../components/RemoteImage';
import {GiftCardStackParamList} from '../GiftCardStack';
import {
  horizontalPadding,
  NavIconButtonContainer,
  SectionSpacer,
  Terms,
} from '../../components/styled/ShopTabComponents';
import {
  ArchiveSvg,
  ExternalLinkSvg,
  InvoiceSvg,
  PrintSvg,
} from '../../components/svg/ShopTabSvgs';
import OptionsSheet, {Option} from '../../../../wallet/components/OptionsSheet';
import {TouchableWithoutFeedback} from 'react-native-gesture-handler';
import {APP_NETWORK, BASE_BITPAY_URLS} from '../../../../../constants/config';
import {formatFiatAmount, sleep} from '../../../../../utils/helper-methods';
import {AppActions} from '../../../../../store/app';
import Clipboard from '@react-native-community/clipboard';
import {
  CardConfig,
  ClaimCodeType,
  GiftCard,
} from '../../../../../store/shop/shop.models';
import {ShopActions, ShopEffects} from '../../../../../store/shop';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {DeviceEmitterEvents} from '../../../../../constants/device-emitter-events';
import Icons from '../../../../wallet/components/WalletIcons';
import {useTranslation} from 'react-i18next';
import {generateGiftCardPrintHtml} from '../../../../../lib/gift-cards/gift-card';
import {Analytics} from '../../../../../store/analytics/analytics.effects';

const maxWidth = 320;

const Amount = styled(BaseText)`
  font-size: 38px;
  font-weight: 500;
  margin: 40px 0 20px;
`;

const ClaimCodeBox = styled.View`
  background-color: ${({theme}) => (theme.dark ? '#121212' : NeutralSlate)};
  border: 1px solid #e1e4e7;
  ${({theme}) => (theme.dark ? 'border: none;' : '')}
  border-radius: 12px;
  margin-top: -80px;
  padding-top: 110px;
  z-index: -1;
  align-items: center;
  width: 100%;
  max-width: ${maxWidth}px;
  padding-left: 20px;
  padding-right: 20px;
  overflow: hidden;
`;

const ClaimCode = styled(BaseText)`
  font-size: 18px;
  font-weight: 700;
  margin: 18px 0;
`;

const ActionContainer = styled(CtaContainer)`
  align-self: center;
  margin: 15px -${horizontalPadding}px 0;
  max-width: ${maxWidth}px;
  padding-left: 0;
  padding-right: 0;
  width: 100%;
`;

const Divider = styled.View`
  background-color: ${({theme}) => (theme.dark ? LightBlack : Grey)};
  height: 1px;
  width: 80%;
  margin-bottom: 20px;
`;
interface ScannableCodeParams {
  height: number;
  width: number;
}
const ScannableCode = styled.Image<ScannableCodeParams>`
  height: ${({height}) => height}px;
  width: ${({width}) => width}px;
`;
const ScannableCodeContainer = styled.View<ScannableCodeParams>`
  background-color: ${White};
  border-color: ${Grey};
  border-radius: 10px;
  border-width: 1px;
  height: ${({height}) => height}px;
  width: ${({width}) => width}px;
  margin-top: 10px;
  align-items: center;
  flex-direction: row;
  overflow: hidden;
  justify-content: center;
`;

const ArchiveButtonContainer = styled.View`
  margin-top: 15px;
`;

const GiftCardDetails = ({
  route,
  navigation,
}: StackScreenProps<GiftCardStackParamList, 'GiftCardDetails'>) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [isOptionsSheetVisible, setIsOptionsSheetVisible] = useState(false);
  const [isBarcode, setIsBarcode] = useState(false);
  const [scannableCodeDimensions, setScannableCodeDimensions] = useState({
    height: 0,
    width: 0,
  });
  const {cardConfig, giftCard: initialGiftCard} = route.params;
  const giftCards = useAppSelector(
    ({SHOP}) => SHOP.giftCards[APP_NETWORK],
  ) as GiftCard[];
  const [giftCard, setGiftCard] = useState(
    giftCards.find(card => card.invoiceId === initialGiftCard.invoiceId) ||
      initialGiftCard,
  );

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      DeviceEmitterEvents.GIFT_CARD_REDEEMED,
      (updatedGiftCard: GiftCard) => setGiftCard(updatedGiftCard),
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const redeem = async () => {
      const updatedGiftCard = await dispatch(
        ShopEffects.startRedeemGiftCard(giftCard.invoiceId),
      );
      setGiftCard(updatedGiftCard);
    };
    if (giftCard.status === 'SYNCED') {
      redeem();
    }
  }, [dispatch, giftCard.invoiceId, giftCard.status]);

  useEffect(() => {
    if (!giftCard.barcodeImage) {
      if (
        cardConfig.defaultClaimCodeType === ClaimCodeType.barcode &&
        giftCard.claimLink
      ) {
        cardConfig.defaultClaimCodeType = ClaimCodeType.link;
      }
      return;
    }
    Image.getSize(giftCard.barcodeImage, (width, height) => {
      setIsBarcode(width / height > 3);
      setScannableCodeDimensions({width, height});
    });
  }, [cardConfig, giftCard.barcodeImage, giftCard.claimLink]);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>{cardConfig.displayName}</HeaderTitle>,
      headerRight: () => (
        <HeaderRightContainer>
          <NavIconButtonContainer
            onPress={() => setIsOptionsSheetVisible(true)}>
            <Icons.Cog />
          </NavIconButtonContainer>
        </HeaderRightContainer>
      ),
    });
  });

  const showCopiedNotification = (
    copiedValue: string,
    cardConfig: CardConfig,
    customMessage?: string,
  ) =>
    AppActions.showBottomNotificationModal({
      type: 'success',
      title: t('Copied: ', {copiedValue}),
      message:
        customMessage ||
        cardConfig.redeemInstructions ||
        t(
          'Paste this code on . This gift card cannot be recovered if your claim code is lost.',
          {website: cardConfig.website},
        ),
      enableBackdropDismiss: true,
      actions: [
        {
          text: t('GOT IT'),
          action: () => null,
          primary: true,
        },
      ],
    });

  const assetOptions: Array<Option> = [
    {
      img: <ArchiveSvg theme={theme} />,
      description: giftCard.archived ? t('Unarchive Card') : t('Archive Card'),
      onPress: () => toggleArchiveStatus(),
    },
    {
      img: <InvoiceSvg theme={theme} />,
      description: t('View Invoice'),
      onPress: () =>
        Linking.openURL(
          `${BASE_BITPAY_URLS[APP_NETWORK]}/invoice?id=${giftCard.invoiceId}`,
        ),
    },
    {
      img: <ExternalLinkSvg theme={theme} />,
      description: t('Share Claim Code'),
      onPress: async () => {
        await sleep(500);
        Share.share(
          giftCard.claimLink
            ? {url: giftCard.claimLink}
            : {message: giftCard.claimCode},
        );
      },
    },
    ...(cardConfig.defaultClaimCodeType !== 'link'
      ? [
          {
            img: <PrintSvg theme={theme} />,
            description: t('Print'),
            onPress: async () => {
              await sleep(600); // Wait for options sheet to close on iOS
              await RNPrint.print({
                html: generateGiftCardPrintHtml(cardConfig, giftCard),
              });
            },
          },
        ]
      : []),
  ];

  const copyToClipboard = (value: string, customMessage?: string) => {
    Clipboard.setString(value);
    dispatch(showCopiedNotification(value, cardConfig, customMessage));
  };

  const toggleArchiveStatus = () => {
    dispatch(ShopActions.toggledGiftCardArchivedStatus({giftCard}));
    giftCard.archived = !giftCard.archived;
    if (giftCard.archived) {
      navigation.pop();
    }
  };

  return (
    <>
      <OptionsSheet
        isVisible={isOptionsSheetVisible}
        closeModal={() => setIsOptionsSheetVisible(false)}
        options={assetOptions}
        placement={'top'}
      />
      <ScrollView
        contentContainerStyle={{
          alignItems: 'center',
          paddingHorizontal: horizontalPadding,
        }}
        refreshControl={
          giftCard.status !== 'SUCCESS' ? (
            <RefreshControl
              tintColor={theme.dark ? White : SlateDark}
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                const updatedGiftCard = await dispatch(
                  ShopEffects.startRedeemGiftCard(giftCard.invoiceId),
                );
                setGiftCard(updatedGiftCard);
                setRefreshing(false);
              }}
            />
          ) : undefined
        }>
        <TouchableWithoutFeedback
          onPress={() => copyToClipboard(`${giftCard.amount}`)}>
          <Amount>
            {formatFiatAmount(giftCard.amount, giftCard.currency, {
              currencyDisplay: 'symbol',
            })}
          </Amount>
        </TouchableWithoutFeedback>
        <RemoteImage
          uri={cardConfig.cardImage}
          height={169}
          width={270}
          borderRadius={10}
        />
        {giftCard.status === 'SUCCESS' ? (
          <>
            {cardConfig.defaultClaimCodeType !== 'link' ? (
              <ClaimCodeBox>
                <Paragraph>{t('Claim Code')}</Paragraph>
                {giftCard.barcodeImage &&
                cardConfig.defaultClaimCodeType === 'barcode' ? (
                  <ScannableCodeContainer
                    height={scannableCodeDimensions.height}
                    width={scannableCodeDimensions.width}>
                    <ScannableCode
                      height={
                        isBarcode
                          ? scannableCodeDimensions.height * 0.7
                          : scannableCodeDimensions.height
                      }
                      width={scannableCodeDimensions.width}
                      source={{uri: giftCard.barcodeImage}}
                      resizeMode={isBarcode ? 'cover' : 'contain'}
                    />
                  </ScannableCodeContainer>
                ) : null}
                <TouchableWithoutFeedback
                  onPress={() => copyToClipboard(giftCard.claimCode)}>
                  <ClaimCode>{giftCard.claimCode}</ClaimCode>
                </TouchableWithoutFeedback>
                {giftCard.pin ? (
                  <>
                    <Divider />
                    <Paragraph>{t('Pin')}</Paragraph>
                    <TouchableWithoutFeedback
                      onPress={() => copyToClipboard(giftCard.pin as string)}>
                      <ClaimCode>{giftCard.pin}</ClaimCode>
                    </TouchableWithoutFeedback>
                  </>
                ) : (
                  <Paragraph style={{marginBottom: 30}}>
                    {t('Created')} <TimeAgo time={giftCard.date} />
                  </Paragraph>
                )}
              </ClaimCodeBox>
            ) : null}
            {giftCard.pin || cardConfig.defaultClaimCodeType === 'link' ? (
              <Paragraph style={{marginTop: 15}}>
                {t('Created')} <TimeAgo time={giftCard.date} />
              </Paragraph>
            ) : null}
            {!giftCard.archived ||
            cardConfig.defaultClaimCodeType === 'link' ? (
              <ActionContainer>
                {cardConfig.redeemUrl ? (
                  <Button
                    onPress={() => {
                      Linking.openURL(
                        `${cardConfig.redeemUrl as string}${
                          giftCard.claimCode
                        }`,
                      );
                      dispatch(
                        Analytics.track('Redeemed Gift Card', {
                          giftCardAmount: giftCard.amount,
                          giftCardBrand: cardConfig.name,
                          giftCardCurrency: cardConfig.currency,
                        }),
                      );
                    }}
                    buttonStyle={'primary'}>
                    {t('Redeem Now')}
                  </Button>
                ) : cardConfig.defaultClaimCodeType === 'link' ? (
                  <Button
                    onPress={() =>
                      Linking.openURL(giftCard.claimLink as string)
                    }
                    buttonStyle={'primary'}>
                    {cardConfig.redeemButtonText || 'View Redemption Code'}
                  </Button>
                ) : (
                  <Button
                    onPress={() => copyToClipboard(giftCard.claimCode)}
                    buttonStyle={'primary'}>
                    {t('Copy Code')}
                  </Button>
                )}
                {!giftCard.archived ? (
                  <ArchiveButtonContainer>
                    <Button
                      onPress={() => toggleArchiveStatus()}
                      buttonStyle={'secondary'}>
                      {t("I've used this card")}
                    </Button>
                  </ArchiveButtonContainer>
                ) : null}
              </ActionContainer>
            ) : (
              <SectionSpacer />
            )}
          </>
        ) : (
          <ClaimCodeBox>
            {['PENDING', 'SYNCED'].includes(giftCard.status) ? (
              <TextAlign align="center">
                <Paragraph>
                  {giftCard.status === 'PENDING'
                    ? t('Awaiting payment to confirm')
                    : t('Fetching claim information...')}
                </Paragraph>
              </TextAlign>
            ) : (
              <>
                <TextAlign align="center">
                  <Paragraph>
                    {t(
                      'Claim code not yet available. Please check back later.',
                    )}
                  </Paragraph>
                </TextAlign>
                <SectionSpacer />
                <TextAlign align="center">
                  <Paragraph>
                    {t('If this issue persists for more than 2 hours, please')}
                    &nbsp;
                    <Link
                      onPress={() =>
                        Linking.openURL(
                          'https://bitpay.com/request-help/wizard',
                        )
                      }>
                      {t('contact BitPay Support')}
                    </Link>
                    {t(', and provide this invoice ID: ')}
                  </Paragraph>
                  <TouchableWithoutFeedback
                    onPress={() =>
                      copyToClipboard(
                        giftCard.invoiceId,
                        t(
                          'Please share this invoice ID with BitPay Support to help them locate your purchase.',
                        ),
                      )
                    }>
                    <Paragraph>{giftCard.invoiceId}</Paragraph>
                  </TouchableWithoutFeedback>
                </TextAlign>
              </>
            )}
            <SectionSpacer />
          </ClaimCodeBox>
        )}
        {giftCard.status === 'PENDING' ? (
          <Paragraph style={{marginTop: 15}}>
            {t('Created')} <TimeAgo time={giftCard.date} />
          </Paragraph>
        ) : null}
        <Terms>{cardConfig.terms}</Terms>
      </ScrollView>
    </>
  );
};

export default GiftCardDetails;
