import 'intl';
import 'intl/locale-data/jsonp/en';
import moment from 'moment';
import uniqBy from 'lodash.uniqby';
import {countries} from 'countries-list';

import {
  ApiCard,
  ApiCardConfig,
  AvailableCardMap,
  CardConfig,
  CardConfigMap,
  GiftCard,
  GiftCardActivationFee,
  GiftCardCoupon,
  GiftCardCuration,
  UnsoldGiftCard,
} from '../../store/shop/shop.models';
import {formatFiatAmount} from '../../utils/helper-methods';
import {Grey, SlateDark} from '../../styles/colors';

export function getGiftCardConfigList(
  cardConfigMap: CardConfigMap,
): CardConfig[] {
  return Object.entries(cardConfigMap).reduce((fullList, currentEntry) => {
    const [name, cardConfig] = currentEntry;
    return [...fullList, {...cardConfig, name}];
  }, [] as CardConfig[]);
}

export function getCardConfigMapFromApiConfigMap(
  availableApiCardMap: AvailableCardMap,
): CardConfigMap {
  return getCardConfigFromApiConfigMap(availableApiCardMap).reduce(
    (map, cardConfig) => ({...map, [cardConfig.name]: cardConfig}),
    {},
  );
}

export function getCardConfigFromApiConfigMap(
  availableCardMap: AvailableCardMap,
): CardConfig[] {
  const cardNames = Object.keys(availableCardMap);
  const availableCards = cardNames
    .filter(
      cardName =>
        availableCardMap[cardName] && availableCardMap[cardName].length,
    )
    .map(cardName =>
      getCardConfigFromApiBrandConfig(cardName, availableCardMap[cardName]),
    )
    .map(cardConfig => ({
      ...cardConfig,
      displayName: cardConfig.displayName || cardConfig.name,
    }))
    .sort(sortByDisplayName);
  return availableCards;
}

export function getAmountSpecificConfig(cards: ApiCard[]) {
  if (cards.length < 2) {
    return undefined;
  }
  const fieldIsIdentical = (fieldName: keyof ApiCard) => (c: ApiCard) =>
    c[fieldName] === cards[0][fieldName];
  const cardImagesAreIdentical = cards.every(fieldIsIdentical('cardImage'));
  const descriptionsAreIdentical = cards.every(fieldIsIdentical('description'));
  const termsAreIdentical = cards.every(fieldIsIdentical('terms'));
  if (cardImagesAreIdentical && descriptionsAreIdentical && termsAreIdentical) {
    return undefined;
  }
  return cards.reduce(
    (cardSpecificConfig, card) => ({
      ...cardSpecificConfig,
      [card.amount as number]: {
        ...(!cardImagesAreIdentical && {cardImage: card.cardImage}),
        ...(!descriptionsAreIdentical && {description: card.description}),
        ...(!termsAreIdentical && {terms: card.terms}),
      },
    }),
    {},
  );
}

export function getCardImage(cardConfig: CardConfig, amount?: number): string {
  return (
    (amount &&
      cardConfig.amountSpecificConfig &&
      cardConfig.amountSpecificConfig[amount] &&
      cardConfig.amountSpecificConfig[amount].cardImage) ||
    cardConfig.cardImage
  );
}

export function getCardConfigFromApiBrandConfig(
  cardName: string,
  apiBrandConfig: ApiCardConfig,
): CardConfig {
  const cards = apiBrandConfig;
  const [firstCard] = cards;
  const {currency} = firstCard;
  const range = cards.find(
    c => c.maxAmount && c.minAmount && c.currency === currency,
  ) as ApiCard;
  const fixed = cards.filter(c => c.amount && c.currency);
  const supportedAmounts = fixed
    .reduce((newSupportedAmounts, currentCard) => {
      const curAmount = currentCard.amount as number;
      return [...newSupportedAmounts, curAmount];
    }, [] as number[])
    .sort((a: number, b: number) => a - b);

  const activationFees = cards
    .filter(c => c.activationFees)
    .reduce(
      (allFees, card) => [...allFees, ...(card.activationFees || [])],
      [] as GiftCardActivationFee[],
    );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {amount, type, maxAmount, minAmount, website, ...config} = firstCard;
  const baseConfig = {
    ...config,
    name: cardName,
    activationFees,
    website: website || '',
  };
  const rangeMin = range && (range.minAmount as number);
  return range
    ? {
        ...baseConfig,
        minAmount: rangeMin < 1 ? 1 : range.minAmount,
        maxAmount: range.maxAmount,
      }
    : {
        ...baseConfig,
        supportedAmounts,
        amountSpecificConfig: getAmountSpecificConfig(apiBrandConfig),
      };
}

function getDisplayNameSortValue(displayName: string): string {
  const startsNumeric = (value: string): boolean =>
    /^[0-9]$/.test(value.charAt(0));
  const name = displayName.toLowerCase();
  return `${startsNumeric(name) ? 'zzz' : ''}${name}`;
}
export function sortByDisplayName(
  a: {displayName: string},
  b: {displayName: string},
): 1 | -1 {
  const aSortValue = getDisplayNameSortValue(a.displayName);
  const bSortValue = getDisplayNameSortValue(b.displayName);
  return aSortValue > bSortValue ? 1 : -1;
}

export function sortByDescendingDate(
  a: GiftCard | UnsoldGiftCard,
  b: GiftCard | UnsoldGiftCard,
) {
  return new Date(b.date).getTime() - new Date(a.date).getTime();
}

export function redemptionFailuresLessThanAWeekOld(
  giftCard: GiftCard | UnsoldGiftCard,
) {
  const weekAgo = moment().subtract(1, 'week').toDate();
  return (
    ['FAILURE', 'PENDING'].includes(giftCard.status) &&
    new Date(giftCard.date) > weekAgo
  );
}

export function spreadAmounts(values: Array<number>, currency: string): string {
  let caption = '';
  values.forEach((value: number, index: number) => {
    caption =
      caption +
      formatFiatAmount(value, currency, {
        customPrecision: 'minimal',
        currencyDisplay: 'symbol',
      });
    if (values.length - index >= 2) {
      caption += ', ';
    }
  });
  return caption;
}

export function getGiftCardCurations(
  availableGiftCards: CardConfig[],
  directory: any,
  purchasedGiftCards: GiftCard[] = [],
) {
  const recentlyPurchasedBrands = uniqBy(
    purchasedGiftCards.sort(sortByDescendingDate),
    giftCard => giftCard.name,
  )
    .filter(giftCard =>
      availableGiftCards.some(cardConfig => cardConfig.name === giftCard.name),
    )
    .slice(0, 9)
    .map(
      giftCard =>
        availableGiftCards.find(
          cardConfig => cardConfig.name === giftCard.name,
        ) as CardConfig,
    );
  const recentlyPurchasedCuration: GiftCardCuration = {
    displayName: 'Recently Purchased',
    giftCards: recentlyPurchasedBrands,
  };
  const remoteCurations = Object.keys(directory.curated)
    .map(curationName => {
      const curation = (directory as any).curated[curationName] as any;
      const curationMerchants = curation.merchants as any;
      return {
        ...curation,
        giftCards:
          curationName === 'popularBrands'
            ? availableGiftCards.filter(cardConfig => cardConfig.featured)
            : curationMerchants
                .map((merchantName: string) =>
                  availableGiftCards.find(
                    cardConfig => cardConfig.displayName === merchantName,
                  ),
                )
                .filter((cardConfig: CardConfig) => !!cardConfig),
      };
    })
    .filter(curation => curation.giftCards.length);
  return recentlyPurchasedBrands.length
    ? [recentlyPurchasedCuration, ...remoteCurations]
    : remoteCurations;
}

export function getActivationFee(
  amount: number,
  cardConfig: CardConfig,
): number {
  const activationFees = (cardConfig && cardConfig.activationFees) || [];
  const fixedFee = activationFees.find(
    fee =>
      fee.type === 'fixed' &&
      amount >= fee.amountRange.min &&
      amount <= fee.amountRange.max,
  );
  return (fixedFee && fixedFee.fee) || 0;
}

export interface PhoneCountryCode {
  emoji: string;
  phone: string;
  name: string;
  countryCode: string;
}

export function getPhoneCountryCodes(
  allowedPhoneCountries?: string[],
): PhoneCountryCode[] {
  const countryCodes = Object.keys(countries);
  const countryList = Object.values(countries);
  const countryListWithCodes = countryList
    .map((country, index) => ({
      ...country,
      countryCode: countryCodes[index],
    }))
    .filter(country =>
      allowedPhoneCountries
        ? allowedPhoneCountries.includes(country.countryCode)
        : true,
    );
  const countriesWithMultiplePhoneCodes = countryListWithCodes
    .filter(country => country.phone.includes(','))
    .map(country => {
      const codes = country.phone.split(',');
      return codes.map(code => ({...country, phone: code}));
    });
  const countriesWithSinglePhoneCode = countryListWithCodes.filter(
    country => !country.phone.includes(','),
  );
  const multiplePhoneCodesFlattened = countriesWithMultiplePhoneCodes.flat();
  return countriesWithSinglePhoneCode
    .concat(multiplePhoneCodesFlattened)
    .sort((a, b) => (a.name < b.name ? -1 : 1))
    .filter(country => country.name !== 'Antarctica');
}

export function isSupportedCouponType(coupon: GiftCardCoupon) {
  return (
    ['percentage', 'flatrate'].includes(coupon.type) &&
    ['boost', 'discount'].includes(coupon.displayType)
  );
}

export function getVisibleCoupon(cardConfig: CardConfig) {
  const coupons = cardConfig.coupons;
  return coupons && coupons.find(c => isSupportedCouponType(c) && !c.hidden);
}

export function hasVisibleDiscount(cardConfig: CardConfig) {
  const coupon = getVisibleCoupon(cardConfig);
  return coupon && coupon.displayType === 'discount';
}

export function hasVisibleBoost(cardConfig: CardConfig) {
  const coupon = getVisibleCoupon(cardConfig);
  return coupon && coupon.displayType === 'boost';
}

export function getBoostPercentage(couponAmount: number) {
  const couponPercentage = couponAmount / 100;
  const displayBoostPercentage = couponPercentage / (1 - couponPercentage);
  return displayBoostPercentage;
}

export function getBoostAmount(cardConfig: CardConfig, enteredAmount: number) {
  const coupon = getVisibleCoupon(cardConfig);
  if (!coupon || coupon.displayType !== 'boost') {
    return 0;
  }
  return coupon.type === 'percentage'
    ? enteredAmount * getBoostPercentage(coupon.amount)
    : coupon.amount;
}

export function getBoostedAmount(
  cardConfig: CardConfig,
  enteredAmount: number,
) {
  const boostedAmount =
    enteredAmount + getBoostAmount(cardConfig, enteredAmount);
  return boostedAmount;
}

export function getGiftCardIcons(supportedCardMap: CardConfigMap) {
  return Object.keys(supportedCardMap).reduce(
    (iconMap, cardName) => ({
      ...iconMap,
      [cardName]: supportedCardMap[cardName].icon,
    }),
    {} as {[cardName: string]: string},
  );
}

export function isGiftCardDisplayable(
  giftCard: GiftCard,
  supportedGiftCardMap: CardConfigMap = {},
) {
  return (
    supportedGiftCardMap[giftCard.name] &&
    (['PENDING', 'SUCCESS', 'SYNCED'].includes(giftCard.status) ||
      redemptionFailuresLessThanAWeekOld(giftCard))
  );
}

export function generateGiftCardPrintHtml(
  cardConfig: CardConfig,
  giftCard: GiftCard,
  scannableCodeDimensions: {height: number; width: number},
): string {
  return `<div style="text-align: center; margin-top: 50px; font-family: Arial;">
 <h1 style="font-size: 30px;">${formatFiatAmount(
   giftCard.amount,
   giftCard.currency,
   {
     currencyDisplay: 'symbol',
   },
 )}</h1>
 <img src="${
   cardConfig.cardImage
 }" style="margin-top: 10px; height: 130px; border-radius: 10px;">
 </br></br>
 <h3 style="color: gray;">Claim Code</h3>
 ${
   giftCard.barcodeImage
     ? `<img src="${giftCard.barcodeImage}" style="margin-top: 10px; height: ${scannableCodeDimensions.height}px; width: ${scannableCodeDimensions.width}px; ">`
     : ''
 }
 <h1 style="font-size: 22px;">${giftCard.claimCode}</h1>

 ${
   giftCard.pin
     ? ` 
     <div style="width: 400px; height: 1px; background-color: ${Grey}; display: inline-block; margin: 10px 0;"></div>
     <h3 style="color: gray;">Pin</h3>
     <h1 style="font-size: 22px;">${giftCard.pin}</h1>`
     : ''
 }
 </br>
 ${
   cardConfig.terms
     ? `<p style="font-size: 12px; color: ${SlateDark}; padding: 0 30px;">${cardConfig.terms}</p>`
     : ''
 }
</div>`;
}
