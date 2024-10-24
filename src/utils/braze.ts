import {
  BannerNewsFeedCard,
  CaptionedContentCard,
  ClassicContentCard,
  ContentCard,
  ContentCardBase,
} from '@braze/react-native-sdk';

export const DEFAULT_CONTENT_CARD_BASE: ContentCardBase = {
  id: '',
  created: 0,
  expiresAt: 0,
  viewed: false,
  clicked: false,
  pinned: false,
  dismissed: false,
  dismissible: false,
  openURLInWebView: false,
  isControl: false,
  extras: {},
};

export const DEFAULT_CLASSIC_CONTENT_CARD: ClassicContentCard = {
  ...DEFAULT_CONTENT_CARD_BASE,
  type: 'Classic',
  title: 'Lorem Ipsum',
  cardDescription: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit',
};

export const isBannerContentCard = (
  contentCard: BannerNewsFeedCard,
): contentCard is BannerNewsFeedCard => {
  return contentCard.type === 'Banner';
};

export const isCaptionedContentCard = (
  contentCard: ContentCard,
): contentCard is CaptionedContentCard => {
  return contentCard.type === 'Captioned';
};

export const isClassicContentCard = (
  contentCard: ContentCard,
): contentCard is ClassicContentCard => {
  return contentCard.type === 'Classic';
};

export const isShopWithCrypto = (contentCard: ContentCard) => {
  return contentCard.extras.feed_type === 'shop_with_crypto';
};

export const isQuickLink = (contentCard: ContentCard) => {
  return contentCard.extras.feed_type === 'quick_links';
};

export const isDoMore = (contentCard: ContentCard) => {
  return contentCard.extras.feed_type === 'do_more';
};

export const isCardOffer = (contentCard: ContentCard) => {
  return contentCard.extras.feed_type === 'card_promotion';
};
