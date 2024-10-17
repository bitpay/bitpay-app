import {ClassicContentCard} from '@braze/react-native-sdk';
import {APP_DEEPLINK_PREFIX} from '../../../../../constants/config';
import {DEFAULT_CLASSIC_CONTENT_CARD} from '../../../../../utils/braze';
import {t} from 'i18next';

const MockOffers = (): ClassicContentCard[] => {
  return [
    {
      ...DEFAULT_CLASSIC_CONTENT_CARD,
      id: 'dev_1',
      cardDescription: t('Buy movie tickets at AMC Theaters'),
      image: require('../../../../../../assets/img/home/offers/amc.png'),
      url: `${APP_DEEPLINK_PREFIX}giftcard?merchant=amc%20theatres`,
      openURLInWebView: false,
    },
    // {
    //   ...DEFAULT_CLASSIC_CONTENT_CARD,
    //   id: 'dev_2',
    //   cardDescription: t('Spend Crypto at Amazon'),
    //   image: require('../../../../../../assets/img/home/offers/amazon.png'),
    //   url: `${APP_DEEPLINK_PREFIX}giftcard?merchant=amazon.com`,
    //   openURLInWebView: false,
    // },
  ];
};

export default MockOffers;
