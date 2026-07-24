import React, {useEffect, useLayoutEffect, useState} from 'react';
import {
  ScrollView,
  Linking,
  RefreshControl,
  Image,
  DeviceEventEmitter,
  Platform,
} from 'react-native';
import {shareNative} from '../../../../../utils/share';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import RNPrint from 'react-native-print';
import RenderHtml from 'react-native-render-html';
import TimeAgo from 'react-native-timeago';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView, StyleSheet, View} from 'react-native';
import {useTheme} from '../../../../../contexts';
import Button from '../../../../../components/button/Button';
import {
  ActiveOpacity,
  CtaContainer,
  HeaderRightContainer,
  WIDTH,
} from '../../../../../components/styled/Containers';
import {
  BaseText,
  HeaderTitle,
  Link,
  Paragraph,
  TextAlign,
  fontFamily,
} from '../../../../../components/styled/Text';
import {
  Grey,
  LightBlack,
  NeutralSlate,
  Slate30,
  SlateDark,
  White,
} from '../../../../../styles/colors';
import {GiftCardGroupParamList} from '../GiftCardGroup';
import {
  horizontalPadding,
  NavIconButtonContainer,
  SectionSpacer,
} from '../../components/styled/ShopTabComponents';
import {
  ArchiveSvg,
  ExternalLinkSvg,
  InvoiceSvg,
  PrintSvg,
} from '../../components/svg/ShopTabSvgs';
import OptionsSheet, {Option} from '../../../../wallet/components/OptionsSheet';
import {BASE_BITPAY_URLS} from '../../../../../constants/config';
import {formatFiatAmount} from '../../../../../utils/helper-methods';
import {AppActions} from '../../../../../store/app';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  CardConfig,
  ClaimCodeType,
  GiftCard,
} from '../../../../../store/shop/shop.models';
import {ShopActions, ShopEffects} from '../../../../../store/shop';
import {
  useAppDispatch,
  useAppSelector,
  useLogger,
} from '../../../../../utils/hooks';
import {DeviceEmitterEvents} from '../../../../../constants/device-emitter-events';
import Icons from '../../../../wallet/components/WalletIcons';
import {useTranslation} from 'react-i18next';
import {
  generateGiftCardPrintHtml,
  getCardImage,
} from '../../../../../lib/gift-cards/gift-card';
import {Analytics} from '../../../../../store/analytics/analytics.effects';
import Markdown from 'react-native-markdown-display';
import {ScrollableBottomNotificationMessageContainer} from '../../../../../components/modal/bottom-notification/BottomNotification';
import GiftCardTerms from '../../components/GiftCardTerms';
import GiftCardImage from '../../components/GiftCardImage';

const maxWidth = 320;

const styles = StyleSheet.create({
  giftCardDetailsContainer: {
    flex: 1,
  },
  amount: {
    fontSize: 38,
    fontWeight: '500',
    marginTop: 25,
    marginHorizontal: 0,
    marginBottom: 20,
  },
  claimCodeBox: {
    borderRadius: 12,
    marginTop: -80,
    paddingTop: 110,
    zIndex: -1,
    alignItems: 'center',
    width: '100%',
    maxWidth,
    paddingLeft: 20,
    paddingRight: 20,
    overflow: 'hidden',
  },
  claimCode: {
    fontSize: 18,
    fontWeight: '700',
    marginVertical: 18,
  },
  actionContainer: {
    alignSelf: 'center',
    marginTop: 15,
    marginHorizontal: -horizontalPadding,
    marginBottom: 0,
    maxWidth,
    paddingLeft: 0,
    paddingRight: 0,
    width: '100%',
  },
  divider: {
    height: 1,
    width: '80%',
    marginBottom: 20,
  },
  scannableCodeContainer: {
    backgroundColor: White,
    borderColor: Grey,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
    alignItems: 'center',
    flexDirection: 'row',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  archiveButtonContainer: {
    marginTop: 15,
  },
});

const GiftCardDetailsContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof SafeAreaView>) => (
  <SafeAreaView style={[styles.giftCardDetailsContainer, style]} {...rest} />
);

const Amount = ({style, ...rest}: React.ComponentProps<typeof BaseText>) => (
  <BaseText style={[styles.amount, style]} {...rest} />
);

const ClaimCodeBox = ({style, ...rest}: React.ComponentProps<typeof View>) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.claimCodeBox,
        {backgroundColor: theme.dark ? '#121212' : NeutralSlate},
        theme.dark ? {borderWidth: 0} : {borderWidth: 1, borderColor: Slate30},
        style,
      ]}
      {...rest}
    />
  );
};

const ClaimCode = ({style, ...rest}: React.ComponentProps<typeof BaseText>) => (
  <BaseText style={[styles.claimCode, style]} {...rest} />
);

const ActionContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof CtaContainer>) => (
  <CtaContainer style={[styles.actionContainer, style]} {...rest} />
);

const Divider = ({style, ...rest}: React.ComponentProps<typeof View>) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.divider,
        {backgroundColor: theme.dark ? LightBlack : Grey},
        style,
      ]}
      {...rest}
    />
  );
};

interface ScannableCodeParams {
  height: number;
  width: number;
}

const ScannableCode = ({
  height,
  width,
  style,
  ...rest
}: ScannableCodeParams & React.ComponentProps<typeof Image>) => (
  <Image style={[{height, width}, style]} {...rest} />
);

const ScannableCodeContainer = ({
  height,
  width,
  style,
  ...rest
}: ScannableCodeParams & React.ComponentProps<typeof View>) => (
  <View
    style={[styles.scannableCodeContainer, {height, width}, style]}
    {...rest}
  />
);

const ArchiveButtonContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.archiveButtonContainer, style]} {...rest} />
);

const GiftCardDetails = ({
  route,
  navigation,
}: NativeStackScreenProps<GiftCardGroupParamList, 'GiftCardDetails'>) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const logger = useLogger();
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [isOptionsSheetVisible, setIsOptionsSheetVisible] = useState(false);
  const [isBarcode, setIsBarcode] = useState(false);
  const [scannableCodeDimensions, setScannableCodeDimensions] = useState({
    height: 0,
    width: 0,
  });
  const {cardConfig, giftCard: initialGiftCard} = route.params;
  const appNetwork = useAppSelector(({APP}) => APP.network);
  const giftCards = useAppSelector(
    ({SHOP}) => SHOP.giftCards[appNetwork],
  ) as GiftCard[];
  const [giftCard, setGiftCard] = useState(
    giftCards.find(card => card.invoiceId === initialGiftCard.invoiceId) ||
      initialGiftCard,
  );
  const [defaultClaimCodeType, setDefaultClaimCodeType] = useState(
    cardConfig.defaultClaimCodeType,
  );
  const cardImage = getCardImage(cardConfig, giftCard.amount);

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
    const fallbackToClaimLink = () => {
      if (giftCard.claimLink) {
        setDefaultClaimCodeType(ClaimCodeType.link);
      }
    };
    if (!giftCard.barcodeImage) {
      if (defaultClaimCodeType === ClaimCodeType.barcode) {
        fallbackToClaimLink();
      }
      return;
    }
    Image.getSize(
      giftCard.barcodeImage,
      (width, height) => {
        if (!width || !height) {
          logger.error(
            `Unable to get ${cardConfig.name} barcodeImage height (${height}) or width (${width})`,
          );
          fallbackToClaimLink();
          return;
        }
        const resemblesBarcode = width / height > 3;
        setIsBarcode(resemblesBarcode);
        const minHeight = 60;
        const scaleFactor = minHeight / height;
        const dimensions =
          height < minHeight && !resemblesBarcode
            ? {
                height: height * scaleFactor,
                width: width * scaleFactor,
              }
            : {height: minHeight, width: 200};
        setScannableCodeDimensions(dimensions);
      },
      err => {
        logger.error(
          `Unable to get image size for ${cardConfig.name} barcodeImage: ${err.message}`,
        );
        fallbackToClaimLink();
      },
    );
  }, [
    cardConfig,
    defaultClaimCodeType,
    giftCard.barcodeImage,
    giftCard.claimLink,
    logger,
  ]);

  useLayoutEffect(() => {
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
  ) => {
    const redeemInstructions =
      customMessage ||
      cardConfig.redeemInstructions ||
      t(
        'Paste this code on . This gift card cannot be recovered if your claim code is lost.',
        {
          website: cardConfig.website,
        },
      );
    const containsHtml =
      redeemInstructions.includes('</') || redeemInstructions.includes('/>');
    const redeemHtml = redeemInstructions
      .replaceAll(': \n', ': <br>')
      .replaceAll('\n\n', '<br><br>');
    const redeemTextStyle = {
      color: theme.colors.text,
      fontFamily,
      fontSize: 16,
      lineHeight: 24,
    };
    return AppActions.showBottomNotificationModal({
      type: 'success',
      title: t('Copied: ', {copiedValue}),
      modalLibrary: 'bottom-sheet',
      message: '',
      message2: (
        <ScrollableBottomNotificationMessageContainer
          contentContainerStyle={{paddingBottom: 10}}>
          {containsHtml ? (
            <RenderHtml
              baseStyle={redeemTextStyle}
              contentWidth={WIDTH - 2 * horizontalPadding}
              source={{
                html: redeemHtml,
              }}
            />
          ) : (
            <Markdown
              style={{
                body: redeemTextStyle,
              }}>
              {redeemInstructions}
            </Markdown>
          )}
        </ScrollableBottomNotificationMessageContainer>
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
  };

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
          `${BASE_BITPAY_URLS[appNetwork]}/invoice?id=${giftCard.invoiceId}`,
        ),
    },
    {
      img: <ExternalLinkSvg theme={theme} />,
      description: t('Share Claim Code'),
      onPress: async () => {
        const dataToShare =
          Platform.OS === 'ios' && giftCard.claimLink
            ? {url: giftCard.claimLink}
            : {message: giftCard.claimLink || giftCard.claimCode};
        dispatch(shareNative(dataToShare));
      },
    },
    ...(defaultClaimCodeType !== 'link'
      ? [
          {
            img: <PrintSvg theme={theme} />,
            description: t('Print'),
            onPress: async () => {
              await RNPrint.print({
                html: generateGiftCardPrintHtml(
                  cardConfig,
                  giftCard,
                  scannableCodeDimensions,
                ),
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
    dispatch(
      ShopActions.toggledGiftCardArchivedStatus({
        giftCard,
        network: appNetwork,
      }),
    );
    const newArchivedStatus = !giftCard.archived;
    setGiftCard({
      ...giftCard,
      archived: newArchivedStatus,
    });
    if (newArchivedStatus) {
      navigation.pop();
    }
  };

  return (
    <GiftCardDetailsContainer>
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
          paddingBottom: 50,
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
        <TouchableOpacity
          activeOpacity={ActiveOpacity}
          onPress={() => copyToClipboard(`${giftCard.amount}`)}>
          <Amount>
            {formatFiatAmount(giftCard.amount, giftCard.currency, {
              currencyDisplay: 'symbol',
            })}
          </Amount>
        </TouchableOpacity>
        <GiftCardImage uri={cardImage} />
        {giftCard.status === 'SUCCESS' ? (
          <>
            {defaultClaimCodeType !== 'link' ? (
              <ClaimCodeBox>
                <Paragraph>{t('Claim Code')}</Paragraph>
                {giftCard.barcodeImage && defaultClaimCodeType === 'barcode' ? (
                  <ScannableCodeContainer
                    height={scannableCodeDimensions.height + 40}
                    width={scannableCodeDimensions.width + 40}>
                    <ScannableCode
                      height={scannableCodeDimensions.height}
                      width={scannableCodeDimensions.width}
                      source={{uri: giftCard.barcodeImage}}
                      resizeMode={isBarcode ? 'stretch' : 'contain'}
                    />
                  </ScannableCodeContainer>
                ) : null}
                <TouchableOpacity
                  activeOpacity={ActiveOpacity}
                  onPress={() => copyToClipboard(giftCard.claimCode)}>
                  <ClaimCode>{giftCard.claimCode}</ClaimCode>
                </TouchableOpacity>
                {giftCard.pin ? (
                  <>
                    <Divider />
                    <Paragraph>{t('Pin')}</Paragraph>
                    <TouchableOpacity
                      activeOpacity={ActiveOpacity}
                      onPress={() => copyToClipboard(giftCard.pin as string)}>
                      <ClaimCode>{giftCard.pin}</ClaimCode>
                    </TouchableOpacity>
                  </>
                ) : (
                  <Paragraph style={{marginBottom: 30}}>
                    {t('Created')} <TimeAgo time={giftCard.date} />
                  </Paragraph>
                )}
              </ClaimCodeBox>
            ) : null}
            {giftCard.pin || defaultClaimCodeType === 'link' ? (
              <Paragraph style={{marginTop: 15}}>
                {t('Created')} <TimeAgo time={giftCard.date} />
              </Paragraph>
            ) : null}
            {!giftCard.archived || defaultClaimCodeType === 'link' ? (
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
                ) : defaultClaimCodeType === 'link' ? (
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
                      'Unable to fetch claim information. Please check back later.',
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
                  <TouchableOpacity
                    activeOpacity={ActiveOpacity}
                    onPress={() =>
                      copyToClipboard(
                        giftCard.invoiceId,
                        t(
                          'Please share this invoice ID with BitPay Support to help them locate your purchase.',
                        ),
                      )
                    }>
                    <Paragraph>{giftCard.invoiceId}</Paragraph>
                  </TouchableOpacity>
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
        <GiftCardTerms terms={cardConfig.terms} />
      </ScrollView>
    </GiftCardDetailsContainer>
  );
};

export default GiftCardDetails;
