const usdDelimeter = (n: string) => n.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export const format = (value: number, currency: string) => {
  if (!value) {
    value = 0;
  }

  // temporary until we upgrade react-native to 0.65.0+ and can take advantage
  // of the built in toLocaleString formatting
  switch (currency) {
    case 'USD':
      const [integer, decimal] = value.toFixed(2).split('.');
      const withCommas = usdDelimeter(integer);

      return `$${withCommas}.${decimal}`;

    default:
      return value.toString();
  }
};
