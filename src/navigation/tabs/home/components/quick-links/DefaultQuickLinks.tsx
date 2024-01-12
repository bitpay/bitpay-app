import {ClassicContentCard} from 'react-native-appboy-sdk';
import {URL} from '../../../../../constants';
import {DEFAULT_CLASSIC_CONTENT_CARD} from '../../../../../utils/braze';
import {APP_DEEPLINK_PREFIX} from '../../../../../constants/config';
import {t} from 'i18next';

const DefaultQuickLinks = (): ClassicContentCard[] => {
  return [
    {
      ...DEFAULT_CLASSIC_CONTENT_CARD,
      id: 'dev_zenLedger',
      title: 'ZenLedger',
      cardDescription: t('Get your crypto taxes done in minutes.'),
      image: require('../../../../../../assets/img/zenledger/zenledger-icon.png'),
      url: `${APP_DEEPLINK_PREFIX}connections/zenledger`,
      openURLInWebView: false,
    },
    {
      ...DEFAULT_CLASSIC_CONTENT_CARD,
      id: 'dev_walletConnect',
      title: 'WalletConnect',
      cardDescription: t('Connect with hundreds of Dapps.'),
      image: require('../../../../../../assets/img/home/quick-links/wallet-connect.png'),
      url: `${APP_DEEPLINK_PREFIX}connections/walletconnect`,
      openURLInWebView: false,
    },
    {
      ...DEFAULT_CLASSIC_CONTENT_CARD,
      id: 'dev_leaveFeedback',
      title: t('Leave Feedback'),
      cardDescription: t("Let us know how we're doing."),
      image: require('../../../../../../assets/img/home/quick-links/chat.png'),
      url: URL.LEAVE_FEEDBACK,
      openURLInWebView: true,
    },
  ];
};

export default DefaultQuickLinks;
