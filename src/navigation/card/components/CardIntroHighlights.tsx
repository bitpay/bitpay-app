import React, {useState} from 'react';
import {SvgProps} from 'react-native-svg';
import styled, {useTheme} from 'styled-components/native';
import QuestionMarkIcon from '../../../../assets/img/card/icons/intro-question-mark.svg';
import {SettingIcon} from '../../../components/styled/Containers';
import {H5, UnderlineLink, Paragraph} from '../../../components/styled/Text';
import {LightBlack, Slate10, Slate30} from '../../../styles/colors';
import {t} from 'i18next';
import {LayoutAnimation, View} from 'react-native';
import ChevronDownSvg from '../../../../assets/img/chevron-down.svg';
import ChevronUpSvg from '../../../../assets/img/chevron-up.svg';
import {openUrlWithInAppBrowser} from '../../../store/app/app.effects';
import {useAppDispatch} from '../../../utils/hooks';
import {TouchableOpacity} from 'react-native-gesture-handler';

interface CardHighlight {
  icon: React.FC<SvgProps>;
  title: JSX.Element;
  description: JSX.Element;
}

const HighlightContainer = styled.View`
  border: 1px solid ${({theme}) => (theme.dark ? LightBlack : Slate30)};
  border-bottom-width: 0px;
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  margin-top: 16px;
`;

const Highlight = styled(TouchableOpacity)`
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  border-bottom-color: ${({theme}) => (theme.dark ? LightBlack : Slate30)};
  border-bottom-width: 1px;
`;

const HighlightDescriptionContainer = styled.View`
  border-bottom-color: ${({theme}) => (theme.dark ? LightBlack : Slate30)};
  border-bottom-width: 1px;
  padding: 16px 32px;
  color: ${({theme}) => theme.colors.text};
`;

const HighlightIconContainer = styled.View`
  justify-content: center;
  flex-shrink: 0;
  margin: 16px;
`;

const HighlightContentContainer = styled.View`
  flex-grow: 1;
  flex-shrink: 1;
  justify-content: center;
`;

const HighlightTitle = styled(H5)``;

const SubText = styled(Paragraph)`
  color: ${({theme}) => theme.colors.text};
`;

const CARD_HIGHLIGHTS = (): CardHighlight[] => {
  const dispatch = useAppDispatch();
  return [
    {
      icon: QuestionMarkIcon,
      title: (
        <HighlightTitle>
          <>{t('How do I get the BitPay crypto debit card?')}</>
        </HighlightTitle>
      ),
      description: (
        <SubText>
          <>
            {t(
              'We are currently pausing all new applications for the BitPay Card as we revamp the program. The BitPay Card will only be available to U.S. residents. Join the waitlist to be notified once more information is available.',
            )}
          </>
        </SubText>
      ),
    },
    {
      icon: QuestionMarkIcon,
      title: (
        <HighlightTitle>
          <>{t('How can I spend crypto without the BitPay Card?')}</>
        </HighlightTitle>
      ),
      description: (
        <>
          <SubText>
            <>
              {t(
                'The BitPay Card is only one of the ways we help you live on crypto. More ways to spend and cash out crypto with BitPay include:',
              )}
            </>
          </SubText>
          <SubText style={{marginHorizontal: 15}}>
            <>
              {'\u2022 ' + t('Pay with crypto')}
              {' - '}
              <UnderlineLink
                onPress={() =>
                  dispatch(
                    openUrlWithInAppBrowser('https://bitpay.com/spend-crypto/'),
                  )
                }>
                <>{t('Spend crypto')}</>
              </UnderlineLink>{' '}
              {t(
                'directly from your wallet with BitPay merchants. View a curated list of merchants who accept crypto in the',
              )}{' '}
              <UnderlineLink
                onPress={() =>
                  dispatch(
                    openUrlWithInAppBrowser('https://bitpay.com/directory'),
                  )
                }>
                <>{t('BitPay Merchant Directory')}</>
              </UnderlineLink>
              {'.'}
              {'\n\u2022 ' + t('Buy gift cards')}
              {' - '}
              <UnderlineLink
                onPress={() =>
                  dispatch(
                    openUrlWithInAppBrowser('https://bitpay.com/gift-cards/'),
                  )
                }>
                <>{t('Convert crypto into gift cards')}</>
              </UnderlineLink>{' '}
              {t('for the most popular brands and retailers.') +
                '\n\u2022 ' +
                t('Swap crypto')}
              {' - '}
              <UnderlineLink
                onPress={() =>
                  dispatch(
                    openUrlWithInAppBrowser(
                      'https://bitpay.com/blog/what-is-a-crypto-swap/',
                    ),
                  )
                }>
                <>{t('Swap crypto')}</>
              </UnderlineLink>{' '}
              {t('into a stablecoin like USDC using the BitPay app.')}
            </>
          </SubText>
        </>
      ),
    },
    {
      icon: QuestionMarkIcon,
      title: (
        <HighlightTitle>
          <>{t('How does it work?')}</>
        </HighlightTitle>
      ),
      description: (
        <SubText>
          <>
            {t(
              'The BitPay Card works like any other debit card. But, instead of using funds from a bank account, you can add funds from the',
            )}{' '}
            <UnderlineLink
              onPress={() =>
                dispatch(openUrlWithInAppBrowser('https://bitpay.com/wallet/'))
              }>
              <>{t('BitPay Wallet app')}</>
            </UnderlineLink>{' '}
            {t(
              'or your Coinbase account. After funding your card, you are ready to use it practically anywhere. Use the BitPay crypto debit card in-store or online. Need cash instead? Use it at any compatible ATM. Add funds, freeze your card, and track transactions all from the BitPay app.',
            )}
          </>
        </SubText>
      ),
    },
    {
      icon: QuestionMarkIcon,
      title: (
        <HighlightTitle>
          <>{t('Where can I use the BitPay Card?')}</>
        </HighlightTitle>
      ),
      description: (
        <SubText>
          <>
            {t(
              'U.S. residents may use the BitPay Card online or in-store wherever major debit cards are accepted. It can also be used as an ATM card to instantly convert your Bitcoin or other cryptocurrencies into dollars. Use it to travel, entertain, buy gift cards, invest, treat yourself, and live on crypto!',
            )}
          </>
        </SubText>
      ),
    },
    {
      icon: QuestionMarkIcon,
      title: (
        <HighlightTitle>
          <>{t('What coins does the BitPay Card support?')}</>
        </HighlightTitle>
      ),
      description: (
        <>
          <SubText>
            <>
              {t(
                'BitPay supports Bitcoin, major alt coins, tokens, and stablecoins. We are constantly evaluating and adding new coins. Currently we support:',
              )}
            </>
          </SubText>
          <SubText style={{marginHorizontal: 15}}>
            <>
              {'\n\u2022 Bitcoin (BTC)'}
              {'\n\u2022 Ethereum (ETH)'}
              {'\n\u2022 Bitcoin Cash (BCH)'}
              {'\n\u2022 Dogecoin (DOGE)'}
              {'\n\u2022 Shiba Inu (SHIB)'}
              {'\n\u2022 Litecoin (LTC)'}
              {'\n\u2022 XRP (XRP)'}
              {'\n\u2022 ApeCoin (APE)'}
              {'\n\u2022 Polygon (MATIC)'}
              {'\n\u2022 Dai (DAI)'}
              {'\n\u2022 Binance USD (BUSD)'}
              {'\n\u2022 USD Coin (USDC)'}
              {'\n\u2022 Wrapped Bitcoin (WBTC)'}
              {'\n\u2022 Pax Dollar (USDP)'}
              {'\n\u2022 Gemini Dollar (GUSD)'}
              {'\n\u2022 Euro Coin (EUROC)'}
            </>
          </SubText>
        </>
      ),
    },
    {
      icon: QuestionMarkIcon,
      title: (
        <HighlightTitle>
          <>{t('Is the BitPay Card a credit card or debit card?')}</>
        </HighlightTitle>
      ),
      description: (
        <SubText>
          <>
            {t(
              'The BitPay card is not a crypto credit card. The BitPay card is a prepaid debit card which customers can fund via their preferred wallet within the BitPay app. The BitPay Card is available as a virtual crypto card and physical card.',
            )}
          </>
        </SubText>
      ),
    },
    {
      icon: QuestionMarkIcon,
      title: (
        <HighlightTitle>
          <>{t('How do I add funds or reload the card?')}</>
        </HighlightTitle>
      ),
      description: (
        <SubText>
          <>
            {t(
              'Funds can be added to the BitPay Card through the BitPay app or BitPay website. The BitPay Card can be loaded with crypto from the BitPay Wallet or your Coinbase account.',
            )}{' '}
            <UnderlineLink
              onPress={() =>
                dispatch(
                  openUrlWithInAppBrowser(
                    'https://support.bitpay.com/hc/en-us?_gl=1*l8zhhv*_ga*ODg5OTk3MjUwLjE2ODMxMzAwNTU.*_ga_Y4SP8JSCEZ*MTY4MzgzMjQ2OS4yNS4xLjE2ODM4MzI3NTEuOC4wLjA.*_ga_1WSHCPQXN3*MTY4MzgzMjQ3MC4yNC4xLjE2ODM4MzI3NTEuOC4wLjA.*_ga_JPH7WVZ7B0*MTY4MzgzMjQ3MC4yNC4xLjE2ODM4MzI3NTEuOC4wLjA.*_ga_K01TF179SZ*MTY4MzgzMjQ3MC4yNC4xLjE2ODM4MzI3NTEuOC4wLjA.*_ga_X8H6CLL26F*MTY4MzgzMjQ3MC4yNC4xLjE2ODM4MzI3NTEuOC4wLjA.',
                  ),
                )
              }>
              <>{t('Visit our Support section')}</>
            </UnderlineLink>{' '}
            {t('to learn more about the process.')},
          </>
        </SubText>
      ),
    },
    {
      icon: QuestionMarkIcon,
      title: (
        <HighlightTitle>
          <>{t('How do I earn cash back?')}</>
        </HighlightTitle>
      ),
      description: (
        <SubText>
          <>
            {t(
              'Earning cash back Powered by Dosh is automatic and easy. All you have to do is use the BitPay Card at participating merchants. You can see all the current offers curated for you at any time in the rewards section of the BitPay app.',
            )}
          </>
        </SubText>
      ),
    },
    {
      icon: QuestionMarkIcon,
      title: (
        <HighlightTitle>
          <>{t('Where can I earn cash back?')}</>
        </HighlightTitle>
      ),
      description: (
        <SubText>
          <>
            {t(
              'There are more than 100,000 places to get cash back when you use the BitPay Card. You can use the BitPay app to find places near you and online offering crypto rewards.',
            )}
          </>
        </SubText>
      ),
    },
    {
      icon: QuestionMarkIcon,
      title: (
        <HighlightTitle>
          <>{t('How much cash back do I earn for using the BitPay Card?')}</>
        </HighlightTitle>
      ),
      description: (
        <SubText>
          <>
            {t(
              'Each merchant is different, and the percentage you earn will be shown next to the offer and in the offer details.',
            )}
          </>
        </SubText>
      ),
    },
  ];
};

const CardHighlights = () => {
  const theme = useTheme();
  const initialValue: {show: boolean}[] = CARD_HIGHLIGHTS().map(() => {
    return {show: false};
  });
  const [showHighlightDescription, setShowHighlightDescription] =
    useState<{show: boolean}[]>(initialValue);

  return (
    <>
      <H5>
        <>{t('Frequently Asked Questions')}</>
      </H5>
      <HighlightContainer>
        {CARD_HIGHLIGHTS().map((highlight, idx) => {
          const Icon = highlight.icon;
          const _onDropdownPress = () => {
            LayoutAnimation.configureNext(
              LayoutAnimation.Presets.easeInEaseOut,
            );
            setShowHighlightDescription(prev => {
              prev[idx].show = !prev[idx].show;
              return [...prev];
            });
          };

          return (
            <View
              key={idx}
              style={{
                backgroundColor:
                  showHighlightDescription[idx].show && !theme.dark
                    ? Slate10
                    : 'transparent',
              }}>
              <Highlight onPress={_onDropdownPress}>
                <HighlightIconContainer>
                  <Icon />
                </HighlightIconContainer>

                <HighlightContentContainer>
                  {highlight.title}
                </HighlightContentContainer>
                <View
                  style={{
                    justifyContent: 'center',
                    display: 'flex',
                    paddingRight: 16,
                  }}>
                  <View>
                    <SettingIcon suffix>
                      {!showHighlightDescription[idx].show ? (
                        <ChevronDownSvg />
                      ) : (
                        <ChevronUpSvg />
                      )}
                    </SettingIcon>
                  </View>
                </View>
              </Highlight>
              {showHighlightDescription[idx].show ? (
                <HighlightDescriptionContainer>
                  {highlight.description}
                </HighlightDescriptionContainer>
              ) : null}
            </View>
          );
        })}
      </HighlightContainer>
    </>
  );
};

export default CardHighlights;
