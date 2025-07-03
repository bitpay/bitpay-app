import React, {useEffect, useLayoutEffect, useState} from 'react';
import {Platform, ScrollView, View} from 'react-native';
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
import styled from 'styled-components/native';
import {
  ActiveOpacity,
  CtaContainerAbsolute,
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

const AmountSublabel = styled.View`
  padding: 7px 18px;
  border: 1px solid ${({theme}) => (theme.dark ? LightBlack : Slate30)};
  border-radius: 35px;
`;

const AmountSublabelText = styled(Paragraph)`
  font-size: 14px;
`;

const BuyGiftCardContainer = styled.SafeAreaView`
  flex: 1;
`;

const GradientBox = styled(LinearGradient)`
  width: ${WIDTH}px;
  align-items: center;
  flex: 1;
  justify-content: center;
`;

const AmountContainer = styled.View`
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Amount = styled(BaseText)`
  margin: 25px 0 32px;
  margin-bottom: ${Platform.OS === 'android' ? 30 : 25}px;
  font-size: 38px;
  font-weight: 500;
`;

const DescriptionContainer = styled.View``;
const DiscountContainer = styled.View`
  align-items: center;
  background-color: ${({theme}) => theme.colors.background};
  justify-content: center;
  flex-direction: row;
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
  border-bottom-width: 1px;
  border-bottom-color: ${({theme}) => (theme.dark ? '#0f0f0f' : Feather)};
  margin-top: -5px;
  padding: 17px;
`;

const DescriptionBox = styled.View`
  width: ${WIDTH}px;
  background-color: ${({theme}) =>
    theme.dark ? theme.colors.background : 'transparent'};
  padding: 20px ${horizontalPadding}px ${Platform.OS === 'android' ? 75 : 50}px;
`;

const FooterButton = styled(CtaContainerAbsolute)`
  box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.1);
  padding-bottom: 10px;
`;

const DenomSelectionContainer = styled.View`
  margin-bottom: 40px;
  margin-top: 26px;
`;

const SupportedAmounts = styled.View`
  margin-top: 10px;
  align-items: center;
  padding: 0 30px;
`;

const SupportedAmountsLabel = styled(GiftCardDenomText)`
  margin-bottom: 2px;
`;

const BoostPill = styled.View`
  align-items: center;
  align-self: center;
  justify-self: center;
  background-color: ${({theme}) => (theme.dark ? LightBlack : White)};
  border-radius: 30px;
  flex-direction: row;
  gap: 7px;
  margin: -10px 0 30px;
  padding: 8px 9px 8px 10px;
`;

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
  const syncGiftCardPurchasesWithBitPayId = useAppSelector(
    ({SHOP}) => SHOP.syncGiftCardPurchasesWithBitPayId,
  );
  const savedEmail = useAppSelector(({SHOP}) => SHOP.email);
  const savedPhone = useAppSelector(({SHOP}) => SHOP.phone);
  const savedPhoneCountryInfo = useAppSelector(
    ({SHOP}) => SHOP.phoneCountryInfo,
  );
  const shouldSync = user && syncGiftCardPurchasesWithBitPayId;
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
    if (cardConfig.emailRequired && !shouldSync) {
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
                },
              }}>
              {cardConfig.description}
            </Markdown>
          </DescriptionBox>
        </DescriptionContainer>
      </ScrollView>
      <FooterButton
        background={true}
        style={{
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 4},
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 5,
        }}>
        <Button onPress={() => buyGiftCard()} buttonStyle={'primary'}>
          {cardConfig.supportedAmounts ? t('Continue') : t('Buy Gift Card')}
        </Button>
      </FooterButton>
    </BuyGiftCardContainer>
  );
};

export default BuyGiftCard;
