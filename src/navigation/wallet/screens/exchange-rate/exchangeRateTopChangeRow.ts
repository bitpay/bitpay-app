export type ExchangeRateChangeRow = {
  percent: number;
  deltaFiatFormatted?: string;
  rangeLabel?: string;
};

export type ResolvedExchangeRateTopChangeRow = ExchangeRateChangeRow & {
  hidden: boolean;
};

export const resolveExchangeRateTopChangeRow = (args: {
  changeRow?: ExchangeRateChangeRow;
  reserveSpace?: boolean;
}): ResolvedExchangeRateTopChangeRow | undefined => {
  if (args.changeRow) {
    return {
      ...args.changeRow,
      hidden: false,
    };
  }

  if (!args.reserveSpace) {
    return undefined;
  }

  return {
    percent: 0,
    hidden: true,
  };
};
