import {ClassicContentCard} from '@braze/react-native-sdk';
import {APP_DEEPLINK_PREFIX} from '../../../../constants/config';
import {DEFAULT_CLASSIC_CONTENT_CARD} from '../../../../utils/braze';
import {t} from 'i18next';

const DefaultMarketingCards = (): ClassicContentCard[] => {
  return [
    {
      ...DEFAULT_CLASSIC_CONTENT_CARD,
      id: 'dev_marketing_slide_1',
      image: require('../../../../../assets/img/home/offers/amc.png'),
      title: t('Buy movie tickets with crypto'),
      cardDescription: t('Buy an AMC Theatres gift card.'),
      url: `${APP_DEEPLINK_PREFIX}giftcard?merchant=amc%20theatres`,
      openURLInWebView: false,
      extras: {
        feed_type: 'marketing_carousel',
      },
    },
    {
      ...DEFAULT_CLASSIC_CONTENT_CARD,
      id: 'dev_marketing_slide_2',
      image: require('../../../../../assets/img/home/offers/amazon.png'),
      title: t('Pay everyday with crypto'),
      cardDescription: t('Shop top brands with crypto gift cards.'),
      url: `${APP_DEEPLINK_PREFIX}giftcard?merchant=amazon.com`,
      openURLInWebView: false,
      extras: {
        feed_type: 'marketing_carousel',
      },
    },
    {
      ...DEFAULT_CLASSIC_CONTENT_CARD,
      id: 'dev_marketing_slide_3',
      image: require('../../../../../assets/img/home/offers/airbnb.png'),
      title: t('Travel with your crypto'),
      cardDescription: t('Use crypto to book your next stay.'),
      url: `${APP_DEEPLINK_PREFIX}giftcard?merchant=airbnb`,
      openURLInWebView: false,
      extras: {
        feed_type: 'marketing_carousel',
      },
    },
  ];
};

export default DefaultMarketingCards;
