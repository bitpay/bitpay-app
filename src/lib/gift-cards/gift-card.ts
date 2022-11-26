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
  GiftCardCuration,
  UnsoldGiftCard,
} from '../../store/shop/shop.models';
import {formatFiatAmount} from '../../utils/helper-methods';

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
    : {...baseConfig, supportedAmounts};
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

export function redemptionFailuresLessThanADayOld(
  giftCard: GiftCard | UnsoldGiftCard,
) {
  const dayAgo = moment().subtract(1, 'day').toDate();
  return (
    ['FAILURE', 'PENDING'].includes(giftCard.status) &&
    new Date(giftCard.date) > dayAgo
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

export function isSupportedDiscountType(discountType: string) {
  return ['percentage', 'flatrate'].includes(discountType);
}

export function getVisibleDiscount(cardConfig: CardConfig) {
  const discounts = cardConfig.discounts;
  return (
    discounts &&
    discounts.find(d => isSupportedDiscountType(d.type) && !d.hidden)
  );
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
