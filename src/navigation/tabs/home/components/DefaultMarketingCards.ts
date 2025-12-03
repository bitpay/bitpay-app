import {ClassicContentCard} from '@braze/react-native-sdk';
import {APP_DEEPLINK_PREFIX} from '../../../../constants/config';
import {DEFAULT_CLASSIC_CONTENT_CARD} from '../../../../utils/braze';
import {t} from 'i18next';

const DefaultMarketingCards = (): ClassicContentCard[] => {
  return [
    // {
    //   ...DEFAULT_CLASSIC_CONTENT_CARD,
    //   id: 'dev_marketing_slide_1',
    //   image: require('../../../../../assets/img/home/offers/amc.png'),
    //   title: t('Buy movie tickets with crypto'),
    //   cardDescription: t('Buy an AMC Theatres gift card with crypto.'),
    //   url: `${APP_DEEPLINK_PREFIX}giftcard?merchant=amc%20theatres`,
    //   openURLInWebView: false,
    //   extras: {
    //     feed_type: 'marketing_carousel',
    //   },
    // },
    // {
    //   ...DEFAULT_CLASSIC_CONTENT_CARD,
    //   id: 'dev_marketing_slide_2',
    //   title: t('Grow your crypto with BitPay'),
    //   cardDescription: t('Discover new ways to buy, swap and spend securely.'),
    //   openURLInWebView: false,
    //   extras: {
    //     feed_type: 'marketing_carousel',
    //   },
    // },
    // {
    //   ...DEFAULT_CLASSIC_CONTENT_CARD,
    //   id: 'dev_marketing_slide_3',
    //   title: t('Learn about crypto with BitPay'),
    //   cardDescription: t('Enroll in crypto 101.'),
    //   openURLInWebView: false,
    //   extras: {
    //     feed_type: 'marketing_carousel',
    //   },
    // },
  ];
};

export default DefaultMarketingCards;
