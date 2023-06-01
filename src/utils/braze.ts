// import {
//   BannerContentCard,
//   CaptionedContentCard,
//   ClassicContentCard,
//   ContentCard,
//   ContentCardBase,
// } from 'react-native-appboy-sdk';

export const DEFAULT_CONTENT_CARD_BASE: any = {
  id: '',
  created: 0,
  expiresAt: 0,
  viewed: false,
  clicked: false,
  pinned: false,
  dismissed: false,
  dismissible: false,
  openURLInWebView: false,
  extras: {},
};

export const DEFAULT_CLASSIC_CONTENT_CARD: any = {
  ...DEFAULT_CONTENT_CARD_BASE,
  type: 'Classic',
  title: 'Lorem Ipsum',
  cardDescription: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit',
};

export const isBannerContentCard = (
  contentCard: any,
): contentCard is any => {
  return contentCard.type === 'Banner';
};

export const isCaptionedContentCard = (
  contentCard: any,
): contentCard is any => {
  return contentCard.type === 'Captioned';
};

export const isClassicContentCard = (
  contentCard: any,
): contentCard is any => {
  return contentCard.type === 'Classic';
};

export const isShopWithCrypto = (contentCard: any) => {
  return contentCard.extras.feed_type === 'shop_with_crypto';
};

export const isQuickLink = (contentCard: any) => {
  return contentCard.extras.feed_type === 'quick_links';
};

export const isDoMore = (contentCard: any) => {
  return contentCard.extras.feed_type === 'do_more';
};

export const isCardOffer = (contentCard: any) => {
  return contentCard.extras.feed_type === 'card_promotion';
};
