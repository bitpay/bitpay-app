import {ClassicContentCard} from 'react-native-appboy-sdk';
import BuyIcon from '../../../../../../assets/img/advertisement/adv-buy.svg';
import SwapIcon from '../../../../../../assets/img/advertisement/adv-swap.svg';
import {DEEPLINK_PREFIX} from '../../../../../constants/config';
import {DEFAULT_CLASSIC_CONTENT_CARD} from '../../../../../utils/braze';

const MockAdvertisements: ClassicContentCard[] = [
  {
    ...DEFAULT_CLASSIC_CONTENT_CARD,
    id: 'buyCrypto',
    image: BuyIcon as any,
    title: 'Buy Crypto',
    cardDescription: 'Buy direct using your debit or credit card',
    url: `${DEEPLINK_PREFIX}://buy`,
    openURLInWebView: false,
  },
  {
    ...DEFAULT_CLASSIC_CONTENT_CARD,
    id: 'swapCrypto',
    image: SwapIcon as any,
    title: 'Swap Crypto',
    cardDescription: 'Exchange ERC-20 Tokens or cross chain assets',
    url: `${DEEPLINK_PREFIX}://swap`,
    openURLInWebView: false,
  },
];

export default MockAdvertisements;
