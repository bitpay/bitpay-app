import React, {useEffect, useLayoutEffect, useState} from 'react';
import {Platform, ScrollView, View} from 'react-native';
import {StackScreenProps} from '@react-navigation/stack';
import {LinearGradient} from 'rnx-gradient/src';
import Markdown from 'react-native-markdown-display';
import {GiftCardScreens, GiftCardStackParamList} from '../GiftCardStack';
import RemoteImage from '../../components/RemoteImage';
import TagsSvg from '../../../../../../assets/img/tags-stack.svg';
import {
  BaseText,
  fontFamily,
  HeaderTitle,
  TextAlign,
} from '../../../../../components/styled/Text';
import styled from 'styled-components/native';
import {
  CtaContainerAbsolute,
  HEIGHT,
  WIDTH,
} from '../../../../../components/styled/Containers';
import {
  getMastheadGradient,
  horizontalPadding,
} from '../../components/styled/ShopTabComponents';
import {Feather, SlateDark, White} from '../../../../../styles/colors';
import Button from '../../../../../components/button/Button';
import GiftCardDenomSelector from '../../components/GiftCardDenomSelector';
import GiftCardDenoms, {
  GiftCardDenomText,
} from '../../components/GiftCardDenoms';
import {
  getActivationFee,
  getVisibleDiscount,
  isSupportedDiscountType,
} from '../../../../../lib/gift-cards/gift-card';
import {useNavigation, useTheme} from '@react-navigation/native';
import {useDispatch} from 'react-redux';
import {AppActions} from '../../../../../store/app';
import GiftCardDiscountText from '../../components/GiftCardDiscountText';
import {formatFiatAmount, sleep} from '../../../../../utils/helper-methods';
import {CustomErrorMessage} from '../../../../wallet/components/ErrorMessages';
import {ShopActions} from '../../../../../store/shop';
import {APP_NETWORK} from '../../../../../constants/config';
import {useAppSelector} from '../../../../../utils/hooks';
import {TouchableWithoutFeedback} from 'react-native-gesture-handler';
import {useTranslation} from 'react-i18next';
import {Analytics} from '../../../../../store/analytics/analytics.effects';

const GradientBox = styled(LinearGradient)`
  width: ${WIDTH}px;
  align-items: center;
  padding-top: 40px;
  flex-grow: 1;
  justify-content: center;
`;

const AmountContainer = styled.View`
  flex-grow: 1;
  display: flex;
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
  padding: 20px ${horizontalPadding}px 100px;
`;

const FooterButton = styled(CtaContainerAbsolute)`
  box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.1);
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

const getMiddleIndex = (arr: number[]) => arr && Math.floor(arr.length / 2);

const BuyGiftCard = ({
  route,
  navigation,
}: StackScreenProps<GiftCardStackParamList, 'BuyGiftCard'>) => {
  const {t} = useTranslation();
  const navigator = useNavigation();
  const dispatch = useDispatch();
  const theme = useTheme();
  const {cardConfig} = route.params;
  const user = useAppSelector(({BITPAY_ID}) => BITPAY_ID.user[APP_NETWORK]);
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
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => {
        return (
          <HeaderTitle>
            {t('BuyGiftCard', {displayName: cardConfig.displayName})}
          </HeaderTitle>
        );
      },
    });
  });
  useEffect(() => {
    dispatch(
      Analytics.track('Viewed Gift Card', {
        giftCardBrand: cardConfig.name,
      }),
    );
  }, [cardConfig.name, dispatch]);

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
    const discount = getVisibleDiscount(cardConfig);
    navigator.navigate('GiftCard', {
      screen: GiftCardScreens.GIFT_CARD_CONFIRM,
      params: {
        amount,
        cardConfig,
        discounts: discount ? [discount] : [],
      },
    });
  };

  const goToAmountScreen = (phone?: string) => {
    navigator.navigate('GiftCard', {
      screen: GiftCardScreens.GIFT_CARD_AMOUNT,
      params: {
        fiatCurrencyAbbreviation: cardConfig.currency,
        opts: {hideSendMax: true},
        onAmountSelected: selectedAmount =>
          onAmountScreenSubmit(+selectedAmount, phone),
      },
    });
  };

  const onAmountScreenSubmit = (amount: number, phone?: string) => {
    const minAmount = cardConfig.minAmount as number;
    const maxAmount = cardConfig.maxAmount as number;
    if (amount < minAmount) {
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
    if (amount > maxAmount) {
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
    navigator.navigate('GiftCard', {
      screen: GiftCardScreens.ENTER_PHONE,
      params: {
        cardConfig,
        initialPhone: savedPhone,
        initialPhoneCountryInfo: savedPhoneCountryInfo,
        onSubmit: ({phone, phoneCountryInfo}) => {
          dispatch(ShopActions.updatedPhone({phone, phoneCountryInfo}));
          requestAmountIfNeeded(amount, phone);
        },
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
      return navigator.navigate('GiftCard', {
        screen: GiftCardScreens.ENTER_EMAIL,
        params: {
          cardConfig,
          initialEmail: savedEmail,
          onSubmit: email => {
            dispatch(ShopActions.updatedEmailAddress({email}));
            requestPhoneIfNeeded(amount, phone);
          },
        },
      });
    }
    requestPhoneIfNeeded(amount, phone);
  };

  const buyGiftCard = () => {
    dispatch(
      Analytics.track('Started Gift Card Purchase', {
        giftCardBrand: cardConfig.name,
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
    <>
      <ScrollView
        contentContainerStyle={{
          alignItems: 'center',
          minHeight: HEIGHT - (Platform.OS === 'android' ? 80 : 110),
        }}>
        <GradientBox colors={getMastheadGradient(theme)}>
          <View
            style={{
              shadowColor: '#000',
              shadowOffset: {width: 0, height: 12},
              shadowOpacity: 0.08,
              shadowRadius: 30,
              elevation: 5,
            }}>
            <RemoteImage
              uri={cardConfig.cardImage}
              height={169}
              width={270}
              borderRadius={10}
            />
          </View>
          <AmountContainer>
            {cardConfig.supportedAmounts ? (
              <DenomSelectionContainer>
                <GiftCardDenomSelector
                  cardConfig={cardConfig}
                  selectedIndex={selectedAmountIndex}
                  onChange={(newIndex: number) =>
                    setSelectedAmountIndex(newIndex)
                  }
                />
                <SupportedAmounts>
                  <SupportedAmountsLabel>
                    {t('Purchase Amounts:')}
                  </SupportedAmountsLabel>
                  <TextAlign align="center">
                    <GiftCardDenoms cardConfig={cardConfig} />
                  </TextAlign>
                </SupportedAmounts>
              </DenomSelectionContainer>
            ) : (
              <TouchableWithoutFeedback onPress={() => buyGiftCard()}>
                <Amount>
                  {formatFiatAmount(0, cardConfig.currency, {
                    currencyDisplay: 'symbol',
                  })}
                </Amount>
              </TouchableWithoutFeedback>
            )}
          </AmountContainer>
        </GradientBox>
        <DescriptionContainer>
          {cardConfig.discounts &&
          isSupportedDiscountType(cardConfig.discounts[0].type) ? (
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
    </>
  );
};

export default BuyGiftCard;
