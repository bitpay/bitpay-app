import {ClassicContentCard} from '@braze/react-native-sdk';
import {APP_DEEPLINK_PREFIX} from '../../../../../constants/config';
import {DEFAULT_CLASSIC_CONTENT_CARD} from '../../../../../utils/braze';
import {OnboardingImage} from '../../../../onboarding/components/Containers';
import React from 'react';
import {t} from 'i18next';

const DefaultAdvertisements = (
  theme: 'dark' | 'light',
): ClassicContentCard[] => {
  const imgSrc = {
    buy: {
      light: (
        <OnboardingImage
          style={{height: 40, width: 50}}
          source={require('../../../../../../assets/img/onboarding/light/wallet.png')}
        />
      ),
      dark: (
        <OnboardingImage
          style={{height: 38, width: 50}}
          source={require('../../../../../../assets/img/onboarding/dark/wallet.png')}
        />
      ),
    },
    swap: {
      light: (
        <OnboardingImage
          style={{height: 48, width: 50}}
          source={require('../../../../../../assets/img/onboarding/light/swap.png')}
        />
      ),
      dark: (
        <OnboardingImage
          style={{height: 42, width: 50}}
          source={require('../../../../../../assets/img/onboarding/dark/swap.png')}
        />
      ),
    },
  };
  return [
    {
      ...DEFAULT_CLASSIC_CONTENT_CARD,
      id: 'dev_swapCrypto',
      image: imgSrc.swap[theme] as any,
      title: t('Swap Crypto'),
      cardDescription: t('Exchange ERC-20 Tokens or cross chain assets.'),
      url: `${APP_DEEPLINK_PREFIX}swap`,
      openURLInWebView: false,
    },
    {
      ...DEFAULT_CLASSIC_CONTENT_CARD,
      id: 'dev_buyCrypto',
      image: imgSrc.buy[theme] as any,
      title: t('Buy Crypto'),
      cardDescription: t(
        'Buy direct using your debit, credit card, or Apple Pay.',
      ),
      url: `${APP_DEEPLINK_PREFIX}buy/50`,
      openURLInWebView: false,
    },
  ];
};

export default DefaultAdvertisements;
