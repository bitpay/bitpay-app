import {ClassicContentCard} from 'react-native-appboy-sdk';
import {URL} from '../../../../../constants';
import {DEFAULT_CLASSIC_CONTENT_CARD} from '../../../../../utils/braze';
import {APP_DEEPLINK_PREFIX} from '../../../../../constants/config';
{
  /* add translation */
}
const DefaultQuickLinks: ClassicContentCard[] = [
  {
    ...DEFAULT_CLASSIC_CONTENT_CARD,
    id: 'dev_walletConnect',
    title: 'WalletConnect',
    cardDescription: 'Connect with hundreds of Dapps.',
    image: require('../../../../../../assets/img/home/quick-links/wallet-connect.png'),
    url: `${APP_DEEPLINK_PREFIX}connections/walletconnect`,
    openURLInWebView: false,
  },
  {
    ...DEFAULT_CLASSIC_CONTENT_CARD,
    id: 'dev_leaveFeedback',
    title: 'Leave Feedback',
    cardDescription: "Let us know how we're doing.",
    image: require('../../../../../../assets/img/home/quick-links/chat.png'),
    url: URL.LEAVE_FEEDBACK,
    openURLInWebView: true,
  },
];

export default DefaultQuickLinks;
