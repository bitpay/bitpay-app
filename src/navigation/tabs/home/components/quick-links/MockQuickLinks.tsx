import {URL} from '../../../../../constants';
import {QuickLink} from './QuickLinksCard';

const MockQuickLinks: QuickLink[] = [
  {
    id: '1',
    title: '[DEV] Feedback',
    description: "Let us know how we're doing",
    img: require('../../../../../../assets/img/home/quick-links/icon-chat.png'),
    openURLInWebView: true,
    url: URL.LEAVE_FEEDBACK,
  },
];

export default MockQuickLinks;
