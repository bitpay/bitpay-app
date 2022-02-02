import 'intl';
import 'intl/locale-data/jsonp/en';

import {
  ApiCard,
  ApiCardConfig,
  AvailableCardMap,
  CardConfig,
  GiftCardActivationFee,
} from '../../store/shop/shop.models';

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
    .filter(config => !config.hidden)
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

export function spreadAmounts(values: Array<number>, currency: string): string {
  let caption = '';
  values.forEach((value: number, index: number) => {
    caption =
      caption + formatAmount(value, currency, {customPrecision: 'minimal'});
    if (values.length - index >= 2) {
      caption += ', ';
    }
  });
  return caption;
}

export function getGiftCardCurations(
  availableGiftCards: CardConfig[],
  directory: any,
) {
  return Object.keys(directory.curated)
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
}

export const formatAmount = (
  amount: number,
  currency: string,
  opts: {
    customPrecision?: 'minimal';
  } = {},
) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    ...(opts.customPrecision === 'minimal' &&
      Number.isInteger(amount) && {
        maximumFractionDigits: 0,
        minimumFractionDigits: 0,
      }),
  }).format(amount);
