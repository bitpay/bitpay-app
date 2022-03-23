import {
  BannerContentCard,
  CaptionedContentCard,
  ClassicContentCard,
  ContentCard,
  ContentCardBase,
} from 'react-native-appboy-sdk';

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
  extras: {},
};

export const DEFAULT_CLASSIC_CONTENT_CARD: ClassicContentCard = {
  ...DEFAULT_CONTENT_CARD_BASE,
  type: 'Classic',
  title: 'Lorem Ipsum',
  cardDescription: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit',
};

export const isBannerContentCard = (
  contentCard: ContentCard,
): contentCard is BannerContentCard => {
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

export const isFeaturedMerchant = (contentCard: ContentCard) => {
  return contentCard.extras.feed_type === 'featured_merchants';
};

export const isQuickLink = (contentCard: ContentCard) => {
  return contentCard.extras.feed_type === 'quick_links';
};

export const isDoMore = (contentCard: ContentCard) => {
  return contentCard.extras.feed_type === 'do_more';
};
