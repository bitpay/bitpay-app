import React, {useLayoutEffect, useState} from 'react';
import {Platform, ScrollView} from 'react-native';
import {StackScreenProps} from '@react-navigation/stack';
import LinearGradient from 'react-native-linear-gradient';
import Markdown from 'react-native-markdown-display';
import {GiftCardScreens, GiftCardStackParamList} from '../GiftCardStack';
import RemoteImage from '../../components/RemoteImage';
import TagsSvg from '../../../../../../assets/img/tags-stack.svg';
import {BaseText, fontFamily} from '../../../../../components/styled/Text';
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
  isSupportedDiscountType,
} from '../../../../../lib/gift-cards/gift-card';
import {useNavigation, useTheme} from '@react-navigation/native';
import {useDispatch} from 'react-redux';
import {AppActions} from '../../../../../store/app';
import GiftCardDiscountText from '../../components/GiftCardDiscountText';
import {formatFiatAmount} from '../../../../../utils/helper-methods';
import {WalletScreens} from '../../../../wallet/WalletStack';

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
  padding: 20px ${horizontalPadding}px 110px;
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
`;

const SupportedAmountsLabel = styled(GiftCardDenomText)`
  margin-bottom: 2px;
`;

const getMiddleIndex = (arr: number[]) => arr && Math.floor(arr.length / 2);

const BuyGiftCard = ({
  route,
  navigation,
}: StackScreenProps<GiftCardStackParamList, 'BuyGiftCard'>) => {
  const navigator = useNavigation();
  const dispatch = useDispatch();
  const theme = useTheme();
  const {cardConfig} = route.params;
  const [selectedAmountIndex, setSelectedAmountIndex] = useState(
    getMiddleIndex(cardConfig.supportedAmounts || []),
  );
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: `Buy ${cardConfig.displayName} Gift Card`,
    });
  });

  const next = () => {
    if (!cardConfig.supportedAmounts) {
      return navigator.navigate('Wallet', {
        screen: WalletScreens.AMOUNT,
        params: {
          opts: {hideSendMax: true},
          onAmountSelected: amount => {
            const invoiceCreationParams = {
              invoiceType: 'GiftCard',
              amount: +amount,
              cardConfig,
            };
            navigator.navigate('Wallet', {
              screen: 'GiftCardConfirm',
              params: {
                invoiceCreationParams,
              },
            });
          },
        },
      });
    }
    return cardConfig.phoneRequired
      ? navigator.navigate('GiftCard', {
          screen: GiftCardScreens.ENTER_PHONE,
          params: {cardConfig},
        })
      : cardConfig.emailRequired
      ? navigator.navigate('GiftCard', {
          screen: GiftCardScreens.ENTER_EMAIL,
          params: {cardConfig},
        })
      : undefined;
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={{
          alignItems: 'center',
          minHeight: HEIGHT - (Platform.OS === 'android' ? 80 : 110),
        }}>
        <GradientBox colors={getMastheadGradient(theme)}>
          <RemoteImage
            uri={cardConfig.cardImage}
            height={169}
            width={270}
            borderRadius={10}
          />
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
                    Purchase Amounts:
                  </SupportedAmountsLabel>
                  <GiftCardDenoms cardConfig={cardConfig} />
                </SupportedAmounts>
              </DenomSelectionContainer>
            ) : (
              <Amount>{formatFiatAmount(0, cardConfig.currency)}</Amount>
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
        <Button
          onPress={() => {
            const activationFee = getActivationFee(
              (cardConfig.supportedAmounts || [])[selectedAmountIndex],
              cardConfig,
            );
            if (activationFee) {
              dispatch(
                AppActions.showBottomNotificationModal({
                  type: 'info',
                  title: 'Activation Fee',
                  message: `${
                    cardConfig.displayName
                  } gift cards contain an additional activation fee of ${formatFiatAmount(
                    activationFee,
                    cardConfig.currency,
                  )}.`,
                  enableBackdropDismiss: true,
                  actions: [
                    {
                      text: 'GOT IT',
                      action: () => {
                        next();
                        // Go to phone/email screen if required or confirm screen if not
                      },
                      primary: true,
                    },
                  ],
                }),
              );
              console.log('show activation fee sheet', activationFee);
            } else {
              next();
              // Go to amount screen;
            }
          }}
          buttonStyle={'primary'}>
          {cardConfig.supportedAmounts ? 'Continue' : 'Enter Amount'}
        </Button>
      </FooterButton>
    </>
  );
};

export default BuyGiftCard;
