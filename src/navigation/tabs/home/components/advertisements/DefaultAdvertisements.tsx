import {ClassicContentCard} from 'react-native-appboy-sdk';
import BuyIcon from '../../../../../../assets/img/advertisement/adv-buy.svg';
import SwapIcon from '../../../../../../assets/img/advertisement/adv-swap.svg';
import CardIcon from '../../../../../../assets/img/card/bitpay-card-mc-angled-plain-small.svg';
import {APP_DEEPLINK_PREFIX} from '../../../../../constants/config';
import {DEFAULT_CLASSIC_CONTENT_CARD} from '../../../../../utils/braze';

const DefaultAdvertisements: ClassicContentCard[] = [
  {
    ...DEFAULT_CLASSIC_CONTENT_CARD,
    id: 'card',
    image: CardIcon as any,
    title: 'Get the BitPay Prepaid Mastercard®',
    cardDescription: 'Turn your crypto into dollars. Spend instantly.',
    url: `${APP_DEEPLINK_PREFIX}wallet-card/dashboard/signup`,
    openURLInWebView: false,
  },
  {
    ...DEFAULT_CLASSIC_CONTENT_CARD,
    id: 'swapCrypto',
    image: SwapIcon as any,
    title: 'Swap Crypto',
    cardDescription: 'Exchange ERC-20 Tokens or cross chain assets.',
    url: `${APP_DEEPLINK_PREFIX}swap`,
    openURLInWebView: false,
  },
  {
    ...DEFAULT_CLASSIC_CONTENT_CARD,
    id: 'buyCrypto',
    image: BuyIcon as any,
    title: 'Buy Crypto',
    cardDescription: 'Buy direct using your debit, credit card, or Apple Pay.',
    url: `${APP_DEEPLINK_PREFIX}buy/50`,
    openURLInWebView: false,
  },
];

export default DefaultAdvertisements;
