import React, {useEffect, useLayoutEffect, useState} from 'react';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Markdown from 'react-native-markdown-display';
import {GiftCardScreens, GiftCardGroupParamList} from '../GiftCardGroup';
import TagsSvg from '../../../../../../assets/img/tags-stack.svg';
import {
  BaseText,
  fontFamily,
  Paragraph,
  TextAlign,
} from '../../../../../components/styled/Text';
import {useTheme as useStyledTheme} from '../../../../../contexts';
import {
  ActiveOpacity,
  HEIGHT,
  WIDTH,
} from '../../../../../components/styled/Containers';
import {
  getMastheadGradient,
  horizontalPadding,
} from '../../components/styled/ShopTabComponents';
import {BoostSvg} from '../../components/svg/ShopTabSvgs';
import {
  Black,
  Feather,
  LightBlack,
  Slate30,
  SlateDark,
  White,
} from '../../../../../styles/colors';
import Button from '../../../../../components/button/Button';
import FooterButtonContainer from '../../../../../components/footer/FooterButtonContainer';
import GiftCardDenomSelector from '../../components/GiftCardDenomSelector';
import GiftCardDenoms, {
  GiftCardDenomText,
} from '../../components/GiftCardDenoms';
import {
  getActivationFee,
  getBoostedAmount,
  getCardImage,
  getVisibleCoupon,
  hasVisibleBoost,
  hasVisibleDiscount,
} from '../../../../../lib/gift-cards/gift-card';
import {useNavigation, useTheme} from '@react-navigation/native';
import {AppActions} from '../../../../../store/app';
import GiftCardDiscountText from '../../components/GiftCardDiscountText';
import {formatFiatAmount, sleep} from '../../../../../utils/helper-methods';
import {CustomErrorMessage} from '../../../../wallet/components/ErrorMessages';
import {ShopActions} from '../../../../../store/shop';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {useTranslation} from 'react-i18next';
import {Analytics} from '../../../../../store/analytics/analytics.effects';
import GiftCardImage from '../../components/GiftCardImage';
import {WalletScreens} from '../../../../../navigation/wallet/WalletGroup';

const styles = StyleSheet.create({
  amountSublabel: {
    paddingVertical: 7,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderRadius: 35,
  },
  amountSublabelText: {
    fontSize: 14,
  },
  buyGiftCardContainer: {
    flex: 1,
  },
  gradientBox: {
    width: WIDTH,
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  amountContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amount: {
    marginTop: 25,
    marginHorizontal: 0,
    marginBottom: Platform.OS === 'android' ? 30 : 25,
    fontSize: 38,
    fontWeight: '500',
  },
  discountContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomWidth: 1,
    marginTop: -5,
    padding: 17,
  },
  descriptionBox: {
    width: WIDTH,
    paddingTop: 20,
    paddingHorizontal: horizontalPadding,
    paddingBottom: Platform.OS === 'android' ? 75 : 50,
  },
  denomSelectionContainer: {
    marginBottom: 40,
    marginTop: 26,
  },
  supportedAmounts: {
    marginTop: 10,
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  supportedAmountsLabel: {
    marginBottom: 2,
  },
  boostPill: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 30,
    flexDirection: 'row',
    gap: 7,
    marginTop: -10,
    marginHorizontal: 0,
    marginBottom: 30,
    paddingTop: 8,
    paddingRight: 9,
    paddingBottom: 8,
    paddingLeft: 10,
  },
});

const AmountSublabel = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => {
  const theme = useStyledTheme();
  return (
    <View
      style={[
        styles.amountSublabel,
        {borderColor: theme.dark ? LightBlack : Slate30},
        style,
      ]}
      {...rest}
    />
  );
};

const AmountSublabelText = ({
  style,
  ...rest
}: React.ComponentProps<typeof Paragraph>) => (
  <Paragraph style={[styles.amountSublabelText, style]} {...rest} />
);

const BuyGiftCardContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof SafeAreaView>) => (
  <SafeAreaView style={[styles.buyGiftCardContainer, style]} {...rest} />
);

const GradientBox = ({
  style,
  ...rest
}: React.ComponentProps<typeof LinearGradient>) => (
  <LinearGradient style={[styles.gradientBox, style]} {...rest} />
);

const AmountContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.amountContainer, style]} {...rest} />
);

const Amount = ({style, ...rest}: React.ComponentProps<typeof BaseText>) => (
  <BaseText style={[styles.amount, style]} {...rest} />
);

const DescriptionContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => <View style={style} {...rest} />;

const DiscountContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => {
  const theme = useStyledTheme();
  return (
    <View
      style={[
        styles.discountContainer,
        {
          backgroundColor: theme.colors.background,
          borderBottomColor: theme.dark ? '#0f0f0f' : Feather,
        },
        style,
      ]}
      {...rest}
    />
  );
};

const DescriptionBox = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => {
  const theme = useStyledTheme();
  return (
    <View
      style={[
        styles.descriptionBox,
        {
          backgroundColor: theme.dark ? theme.colors.background : 'transparent',
        },
        style,
      ]}
      {...rest}
    />
  );
};

const DenomSelectionContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.denomSelectionContainer, style]} {...rest} />
);

const SupportedAmounts = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.supportedAmounts, style]} {...rest} />
);

const SupportedAmountsLabel = ({
  style,
  ...rest
}: React.ComponentProps<typeof GiftCardDenomText>) => (
  <GiftCardDenomText style={[styles.supportedAmountsLabel, style]} {...rest} />
);

const BoostPill = ({style, ...rest}: React.ComponentProps<typeof View>) => {
  const theme = useStyledTheme();
  return (
    <View
      style={[
        styles.boostPill,
        {backgroundColor: theme.dark ? LightBlack : White},
        style,
      ]}
      {...rest}
    />
  );
};

const getMiddleIndex = (arr: number[]) => arr && Math.floor(arr.length / 2);

const BuyGiftCard = ({
  route,
  navigation,
}: NativeStackScreenProps<GiftCardGroupParamList, 'BuyGiftCard'>) => {
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const navigator = useNavigation();
  const theme = useTheme();
  const {cardConfig} = route.params;
  const user = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
  );
  const savedEmail = useAppSelector(({SHOP}) => SHOP.email);
  const savedPhone = useAppSelector(({SHOP}) => SHOP.phone);
  const savedPhoneCountryInfo = useAppSelector(
    ({SHOP}) => SHOP.phoneCountryInfo,
  );
  const [selectedAmountIndex, setSelectedAmountIndex] = useState(
    getMiddleIndex(cardConfig.supportedAmounts || []),
  );
  const visibleCoupon = getVisibleCoupon(cardConfig);
  const [cardImage, setCardImage] = useState(
    getCardImage(
      cardConfig,
      cardConfig.supportedAmounts &&
        cardConfig.supportedAmounts[
          getMiddleIndex(cardConfig.supportedAmounts || [])
        ],
    ),
  );
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t('BuyGiftCard', {
        displayName: cardConfig.displayName.replace(' Gift Card', ''),
      }),
    });
  });
  useEffect(() => {
    dispatch(
      Analytics.track('Viewed Gift Card', {
        giftCardBrand: cardConfig.name,
        ...(visibleCoupon && {visibleCoupon}),
      }),
    );
  }, [cardConfig, cardConfig.name, dispatch]);

  const showActivationFeeSheet = (
    activationFee: number,
    amount: number,
    phone?: string,
  ) => {
    dispatch(
      AppActions.showBottomNotificationModal({
        type: 'info',
        title: t('Activation fee'),
        message: t('gift cards contain an additional activation fee of .', {
          displayName: cardConfig.displayName,
          fiatAmount: formatFiatAmount(activationFee, cardConfig.currency, {
            currencyDisplay: 'symbol',
          }),
        }),
        enableBackdropDismiss: true,
        actions: [
          {
            text: t('GOT IT'),
            action: async () => {
              await sleep(400);
              next(amount, phone);
            },
            primary: true,
          },
        ],
      }),
    );
  };

  const goToConfirmScreen = async (amount: number) => {
    const coupon = getVisibleCoupon(cardConfig);
    navigation.navigate(GiftCardScreens.GIFT_CARD_CONFIRM, {
      amount,
      cardConfig,
      coupons: coupon ? [coupon] : [],
    });
  };
  const getCustomAmountSublabel = () => {
    // eslint-disable-next-line react/no-unstable-nested-components
    return (amount: number) => {
      const hasBoost = hasVisibleBoost(cardConfig);
      return hasBoost && amount > 0 ? (
        <AmountSublabel>
          <AmountSublabelText>
            <AmountSublabelText style={{fontWeight: '400'}}>
              {formatFiatAmount(
                getBoostedAmount(cardConfig, amount),
                cardConfig.currency,
                {
                  customPrecision: 'minimal',
                },
              )}{' '}
              with <GiftCardDiscountText cardConfig={cardConfig} />
            </AmountSublabelText>
          </AmountSublabelText>
        </AmountSublabel>
      ) : (
        <></>
      );
    };
  };

  const goToAmountScreen = (phone?: string) => {
    navigator.navigate(WalletScreens.AMOUNT, {
      fiatCurrencyAbbreviation: cardConfig.currency,
      customAmountSublabel: getCustomAmountSublabel(),
      onAmountSelected: selectedAmount =>
        onAmountScreenSubmit(+selectedAmount, phone),
    });
  };

  const onAmountScreenSubmit = (amount: number, phone?: string) => {
    const minAmount = cardConfig.minAmount as number;
    const maxAmount = cardConfig.maxAmount as number;
    const boostedAmount = getBoostedAmount(cardConfig, amount);
    if (boostedAmount < minAmount) {
      dispatch(
        AppActions.showBottomNotificationModal(
          CustomErrorMessage({
            title: t('Below Minimum Amount'),
            errMsg: t(
              'The purchase amount must be at least . Please modify your amount.',
              {
                fiatAmount: formatFiatAmount(minAmount, cardConfig.currency, {
                  customPrecision: 'minimal',
                  currencyDisplay: 'symbol',
                }),
              },
            ),
          }),
        ),
      );
      return;
    }
    if (boostedAmount > maxAmount) {
      dispatch(
        AppActions.showBottomNotificationModal(
          CustomErrorMessage({
            title: t('Purchase Limit Exceeded'),
            errMsg: t(
              'The purchase amount is limited to . Please modify your amount.',
              {
                fiatAmount: formatFiatAmount(maxAmount, cardConfig.currency, {
                  customPrecision: 'minimal',
                  currencyDisplay: 'symbol',
                }),
              },
            ),
          }),
        ),
      );
      return;
    }
    const activationFee = getActivationFee(+amount, cardConfig);
    if (activationFee) {
      return showActivationFeeSheet(activationFee, +amount, phone);
    }
    goToConfirmScreen(amount);
  };

  const requestPhone = (amount: number) => {
    navigation.navigate(GiftCardScreens.ENTER_PHONE, {
      cardConfig,
      initialPhone: savedPhone,
      initialPhoneCountryInfo: savedPhoneCountryInfo,
      onSubmit: ({phone, phoneCountryInfo}) => {
        dispatch(ShopActions.updatedPhone({phone, phoneCountryInfo}));
        requestAmountIfNeeded(amount, phone);
      },
    });
  };

  const requestAmountIfNeeded = (amount: number, phone?: string) => {
    return amount ? goToConfirmScreen(amount) : goToAmountScreen(phone);
  };

  const requestPhoneIfNeeded = (amount: number, phone?: string) => {
    return cardConfig.phoneRequired && !phone
      ? requestPhone(amount)
      : requestAmountIfNeeded(amount);
  };

  const next = (amount: number, phone?: string) => {
    if (cardConfig.emailRequired && !user) {
      return navigation.navigate(GiftCardScreens.ENTER_EMAIL, {
        cardConfig,
        initialEmail: savedEmail,
        onSubmit: email => {
          dispatch(ShopActions.updatedEmailAddress({email}));
          requestPhoneIfNeeded(amount, phone);
        },
      });
    }
    requestPhoneIfNeeded(amount, phone);
  };

  const buyGiftCard = () => {
    dispatch(
      Analytics.track('Started Gift Card Purchase', {
        giftCardBrand: cardConfig.name,
        ...(visibleCoupon && {visibleCoupon}),
      }),
    );
    const selectedAmount = (cardConfig.supportedAmounts || [])[
      selectedAmountIndex
    ];
    const activationFee = getActivationFee(selectedAmount, cardConfig);
    return activationFee
      ? showActivationFeeSheet(activationFee, selectedAmount)
      : next(selectedAmount);
  };

  return (
    <BuyGiftCardContainer>
      <ScrollView
        contentContainerStyle={{
          alignItems: 'center',
          minHeight: HEIGHT - (Platform.OS === 'android' ? 80 : 125),
        }}>
        <GradientBox colors={getMastheadGradient(theme)}>
          <View
            style={{
              paddingTop: '30',
              shadowColor: '#000',
              shadowOffset: {width: 0, height: 12},
              shadowOpacity: 0.08,
              shadowRadius: 30,
              elevation: 5,
            }}>
            <GiftCardImage uri={cardImage} />
          </View>
          <AmountContainer>
            {cardConfig.supportedAmounts ? (
              <DenomSelectionContainer>
                <GiftCardDenomSelector
                  cardConfig={cardConfig}
                  selectedIndex={selectedAmountIndex}
                  onChange={(newIndex: number) => {
                    setSelectedAmountIndex(newIndex);
                    setCardImage(
                      getCardImage(
                        cardConfig,
                        cardConfig.supportedAmounts &&
                          cardConfig.supportedAmounts[newIndex],
                      ),
                    );
                  }}
                />
                {cardConfig.supportedAmounts.length > 1 ? (
                  <SupportedAmounts>
                    <SupportedAmountsLabel>
                      {t('Purchase Amounts:')}
                    </SupportedAmountsLabel>
                    <TextAlign align="center">
                      <GiftCardDenoms cardConfig={cardConfig} />
                    </TextAlign>
                  </SupportedAmounts>
                ) : null}
              </DenomSelectionContainer>
            ) : (
              <TouchableOpacity
                activeOpacity={ActiveOpacity}
                onPress={() => buyGiftCard()}>
                <Amount>
                  {formatFiatAmount(0, cardConfig.currency, {
                    currencyDisplay: 'symbol',
                  })}
                </Amount>
              </TouchableOpacity>
            )}
            {hasVisibleBoost(cardConfig) ? (
              <BoostPill>
                <BoostSvg />
                <GiftCardDiscountText
                  cardConfig={cardConfig}
                  color={theme.dark ? White : Black}
                  fontWeight={400}
                />
              </BoostPill>
            ) : null}
          </AmountContainer>
        </GradientBox>
        <DescriptionContainer style={{paddingBottom: insets.bottom + 30}}>
          {hasVisibleDiscount(cardConfig) ? (
            <DiscountContainer>
              <TagsSvg style={{marginRight: 12}} />
              <GiftCardDiscountText
                cardConfig={cardConfig}
                color={theme.colors.text}
              />
            </DiscountContainer>
          ) : null}
          <DescriptionBox>
            <Markdown
              style={{
                body: {
                  color: theme.dark ? White : SlateDark,
                  fontFamily,
                  fontSize: 16,
                  lineHeight: 22.5,
                },
              }}>
              {cardConfig.description}
            </Markdown>
          </DescriptionBox>
        </DescriptionContainer>
      </ScrollView>
      <FooterButtonContainer>
        <Button onPress={() => buyGiftCard()} buttonStyle={'primary'}>
          {cardConfig.supportedAmounts ? t('Continue') : t('Buy Gift Card')}
        </Button>
      </FooterButtonContainer>
    </BuyGiftCardContainer>
  );
};

export default BuyGiftCard;
