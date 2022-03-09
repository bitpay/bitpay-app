import {
  BannerContentCard,
  CaptionedContentCard,
  ClassicContentCard,
  ContentCard,
} from 'react-native-appboy-sdk';

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
