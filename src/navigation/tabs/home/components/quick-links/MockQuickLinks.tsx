import {ClassicContentCard} from 'react-native-appboy-sdk';
import {URL} from '../../../../../constants';
import {DEFAULT_CLASSIC_CONTENT_CARD} from '../../../../../utils/braze';

const MockQuickLinks: ClassicContentCard[] = [
  {
    ...DEFAULT_CLASSIC_CONTENT_CARD,
    id: '1',
    title: 'Feedback',
    cardDescription: "Let us know how we're doing",
    image: require('../../../../../../assets/img/home/quick-links/icon-chat.png'),
    url: URL.LEAVE_FEEDBACK,
    openURLInWebView: true,
  },
];

export default MockQuickLinks;
