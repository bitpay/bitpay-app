import configureTestStore from '@test/store';
import {
  FormatAmount,
  FromBaseUnits,
  ParseAmount,
  ToBaseUnits,
  parseAmountToStringIfBN,
} from './amount';

const mockDeviceLocale = (deviceLocale: string) => {
  const toLocaleString = Number.prototype.toLocaleString;
  return jest
    .spyOn(Number.prototype, 'toLocaleString')
    .mockImplementation(function (this: number, locales, options) {
      const [supported] = Intl.NumberFormat.supportedLocalesOf(locales ?? []);
      return toLocaleString.call(this, supported ?? deviceLocale, options);
    });
};

describe('ToBaseUnits', () => {
  it('should convert everyday amounts of an 18 decimal asset exactly', () => {
    expect(ToBaseUnits(8.54, 18)).toBe('8540000000000000000');
    expect(ToBaseUnits(0.07, 18)).toBe('70000000000000000');
    expect(ToBaseUnits(0.1, 18)).toBe('100000000000000000');
    expect(ToBaseUnits(1.5, 18)).toBe('1500000000000000000');
    expect(ToBaseUnits(1234.5, 18)).toBe('1234500000000000000000');
  });

  it('should convert amounts past 1e21 base units without exponential notation', () => {
    expect(ToBaseUnits(5000000, 18)).toBe('5000000000000000000000000');
    expect(ToBaseUnits(1000, 18)).toBe('1000000000000000000000');
  });

  it('should expand exponential input', () => {
    expect(ToBaseUnits(1e-7, 18)).toBe('100000000000');
    expect(ToBaseUnits(0.00000001, 8)).toBe('1');
  });

  it('should round input carrying more decimals than the asset supports', () => {
    expect(ToBaseUnits(0.1234567, 6)).toBe('123457');
    expect(ToBaseUnits(1234.56789, 6)).toBe('1234567890');
    expect(ToBaseUnits('9007199254740993.4', 0)).toBe('9007199254740993');
    expect(ToBaseUnits('1.2345678912345678915', 18)).toBe(
      '1234567891234567892',
    );
    expect(ToBaseUnits('9.9995', 3)).toBe('10000');
  });

  it('should keep the sign of a negative amount', () => {
    expect(ToBaseUnits('-1.5', 18)).toBe('-1500000000000000000');
    expect(ToBaseUnits(-0.1234567, 6)).toBe('-123457');
  });

  it('should round half away from zero', () => {
    expect(ToBaseUnits('1.5', 0)).toBe('2');
    expect(ToBaseUnits('-1.5', 0)).toBe('-2');
    expect(ToBaseUnits('-0.0000005', 6)).toBe('-1');
    expect(ToBaseUnits('-0.0000004', 6)).toBe('0');
    expect(ToBaseUnits('5e-7', 6)).toBe('1');
    expect(ToBaseUnits('5e-8', 6)).toBe('0');
  });

  it('should reject an invalid asset precision', () => {
    expect(ToBaseUnits('1.5', -1)).toBe('NaN');
    expect(ToBaseUnits('1.5', 1.5)).toBe('NaN');
    expect(ToBaseUnits('1.5', 257)).toBe('NaN');
    expect(ToBaseUnits('1.5', undefined as unknown as number)).toBe('NaN');
  });

  it('should resolve zero without expanding its exponent', () => {
    expect(ToBaseUnits('0e999999999999999999999', 0)).toBe('0');
  });

  it('should not depend on the device locale', () => {
    const spy = mockDeviceLocale('de-DE');
    try {
      expect(ToBaseUnits(1e-7, 18)).toBe('100000000000');
      expect(ToBaseUnits(1.5e-7, 8)).toBe('15');
    } finally {
      spy.mockRestore();
    }
  });

  it('should keep the full precision of a string amount', () => {
    expect(ToBaseUnits('12345678912345678901', 0)).toBe('12345678912345678901');
    expect(ToBaseUnits('8.54', 18)).toBe('8540000000000000000');
  });

  it('should handle assets without decimals and zero', () => {
    expect(ToBaseUnits(123, 0)).toBe('123');
    expect(ToBaseUnits(0, 18)).toBe('0');
  });

  it('should pass through non finite input rather than throwing', () => {
    expect(ToBaseUnits(NaN, 18)).toBe('NaN');
    expect(ToBaseUnits(Infinity, 18)).toBe('Infinity');
  });

  it('should accept raw keypad input without throwing', () => {
    expect(ToBaseUnits('', 18)).toBe('0');
    expect(ToBaseUnits('0.', 18)).toBe('0');
    expect(ToBaseUnits('.5', 18)).toBe('500000000000000000');
    expect(ToBaseUnits('00.5', 18)).toBe('500000000000000000');
    expect(ToBaseUnits(' 1.5 ', 18)).toBe('1500000000000000000');
    expect(ToBaseUnits('1e5', 18)).toBe('100000000000000000000000');
    expect(ToBaseUnits('1.2.3', 18)).toBe('NaN');
  });

  it('should preserve a typed amount that a double cannot hold', () => {
    expect(ToBaseUnits('0.123456789123456789', 18)).toBe('123456789123456789');
    expect(ToBaseUnits('12.345678912345678901', 18)).toBe(
      '12345678912345678901',
    );
    expect(ToBaseUnits('1.000000000000000001', 18)).toBe('1000000000000000001');
    expect(ToBaseUnits('.123456789123456789', 18)).toBe('123456789123456789');
  });

  it('should expand signed and exponential strings without a double', () => {
    expect(ToBaseUnits('+1.000000000000000001', 18)).toBe(
      '1000000000000000001',
    );
    expect(ToBaseUnits('1.000000000000000001e0', 18)).toBe(
      '1000000000000000001',
    );
    expect(ToBaseUnits('2.014e18', 0)).toBe('2014000000000000000');
  });
});

describe('FromBaseUnits', () => {
  const store = configureTestStore({});

  it('should convert base units to an exact decimal string', () => {
    expect(
      store.dispatch(FromBaseUnits(1282736, 'sol', 'sol', undefined)),
    ).toBe('0.001282736');
    expect(
      store.dispatch(
        FromBaseUnits('1234567891234567891', 'eth', 'eth', undefined),
      ),
    ).toBe('1.234567891234567891');
    expect(
      store.dispatch(FromBaseUnits('0x139270', 'sol', 'sol', undefined)),
    ).toBe('0.001282672');
  });

  it('should drop the decimal point of whole amounts', () => {
    expect(
      store.dispatch(FromBaseUnits(100000000, 'btc', 'btc', undefined)),
    ).toBe('1');
    expect(store.dispatch(FromBaseUnits(0, 'eth', 'eth', undefined))).toBe('0');
  });

  it('should pass through non finite input rather than throwing', () => {
    expect(store.dispatch(FromBaseUnits(NaN, 'sol', 'sol', undefined))).toBe(
      'NaN',
    );
  });

  it('should round a fractional base unit amount', () => {
    expect(store.dispatch(FromBaseUnits(5000.4, 'sol', 'sol', undefined))).toBe(
      '0.000005',
    );
  });

  it('should accept decimal and exponential base unit strings', () => {
    expect(
      store.dispatch(FromBaseUnits('2.014e18', 'eth', 'eth', undefined)),
    ).toBe('2.014');
    expect(store.dispatch(FromBaseUnits('99.9', 'btc', 'btc', undefined))).toBe(
      '0.000001',
    );
    expect(store.dispatch(FromBaseUnits('', 'eth', 'eth', undefined))).toBe(
      '0',
    );
  });

  it('should read hex regardless of prefix case or padding', () => {
    expect(store.dispatch(FromBaseUnits('0X10', 'eth', 'eth', undefined))).toBe(
      '0.000000000000000016',
    );
    expect(
      store.dispatch(
        FromBaseUnits(' 0x20000000000001', 'eth', 'eth', undefined),
      ),
    ).toBe('0.009007199254740993');
  });

  it('should not format an amount without a known precision', () => {
    expect(
      store.dispatch(FromBaseUnits(100000000, 'xyz', 'xyz', undefined)),
    ).toBe('NaN');
  });

  it('should not format an amount with an invalid asset precision', () => {
    const storeWithInvalidToken = configureTestStore({
      WALLET: {
        customTokenDataByAddress: {
          bad_e: {
            unitInfo: {
              unitName: 'BAD',
              unitToSatoshi: NaN,
              unitDecimals: NaN,
              unitCode: 'bad',
            },
          },
        },
      },
    });
    expect(
      storeWithInvalidToken.dispatch(FromBaseUnits(1, 'bad', 'eth', 'bad')),
    ).toBe('NaN');
  });
});

describe('parseAmountToStringIfBN', () => {
  it('should not depend on the device locale', () => {
    const spy = mockDeviceLocale('ar-SA');
    try {
      expect(parseAmountToStringIfBN(12345)).toBe('12345');
    } finally {
      spy.mockRestore();
    }
  });
});

describe('ParseAmount', () => {
  const store = configureTestStore({});

  it('should return an amount that matches amountSat exactly', () => {
    expect(
      store.dispatch(
        ParseAmount('1.000000000000000001', 'eth', 'eth', undefined),
      ),
    ).toMatchObject({
      amount: '1.000000000000000001',
      amountSat: '1000000000000000001',
    });
    expect(
      store.dispatch(
        ParseAmount('123456789.123456789', 'eth', 'eth', undefined),
      ),
    ).toMatchObject({
      amount: '123456789.123456789',
      amountSat: '123456789123456789000000000',
    });
    expect(
      store.dispatch(ParseAmount(1.5e-7, 'btc', 'btc', undefined)),
    ).toMatchObject({amount: '0.00000015', amountSat: '15'});
  });

  it('should pad non-integer amounts to the input decimal count, capped at asset precision', () => {
    expect(
      store.dispatch(ParseAmount('8.540', 'eth', 'eth', undefined)),
    ).toMatchObject({amount: '8.540', amountSat: '8540000000000000000'});
    expect(
      store.dispatch(ParseAmount(0.123456789, 'btc', 'btc', undefined)),
    ).toMatchObject({amount: '0.12345679', amountSat: '12345679'});
  });

  it('should pass through non finite input rather than throwing', () => {
    expect(
      store.dispatch(ParseAmount(Infinity, 'eth', 'eth', undefined)).amount,
    ).toBe('Infinity');
  });
});

describe('FormatAmount', () => {
  const store = configureTestStore({});

  it('should show every significant decimal with full precision', () => {
    expect(
      store.dispatch(FormatAmount('sol', 'sol', undefined, 1282736, true)),
    ).toBe('0.001282736');
    expect(
      store.dispatch(FormatAmount('sol', 'sol', undefined, 5000, true)),
    ).toBe('0.000005');
    expect(
      store.dispatch(FormatAmount('eth', 'eth', undefined, 200000000000, true)),
    ).toBe('0.0000002');
    expect(
      store.dispatch(
        FormatAmount('eth', 'eth', undefined, '1234567891234567891', true),
      ),
    ).toBe('1.234567891234567891');
    expect(
      store.dispatch(FormatAmount('btc', 'btc', undefined, 100000000000, true)),
    ).toBe('1,000.00');
  });

  it('should keep two decimals at least with full precision', () => {
    expect(
      store.dispatch(FormatAmount('btc', 'btc', undefined, 100000000, true)),
    ).toBe('1.00');
    expect(store.dispatch(FormatAmount('btc', 'btc', undefined, 0, true))).toBe(
      '0.00',
    );
    expect(
      store.dispatch(FormatAmount('btc', 'btc', undefined, 50000000, true)),
    ).toBe('0.50');
  });

  it('should not throw on non finite input with full precision', () => {
    expect(
      store.dispatch(FormatAmount('sol', 'sol', undefined, NaN, true)),
    ).toBe('NaN');
  });

  it('should keep the short format capped at six decimals', () => {
    expect(store.dispatch(FormatAmount('sol', 'sol', undefined, 1282736))).toBe(
      '0.001282',
    );
  });

  it('should truncate the short format without a double', () => {
    expect(
      store.dispatch(
        FormatAmount('eth', 'eth', undefined, '999999999999999999'),
      ),
    ).toBe('0.999999');
    expect(
      store.dispatch(
        FormatAmount(
          'eth',
          'eth',
          undefined,
          '1234567891234567891234567891234',
        ),
      ),
    ).toBe('1,234,567,891,234.567891');
  });

  it('should keep the sign of negative amounts unless they show as zero', () => {
    expect(
      store.dispatch(FormatAmount('btc', 'btc', undefined, -150000000)),
    ).toBe('-1.50');
    expect(store.dispatch(FormatAmount('btc', 'btc', undefined, -10))).toBe(
      '0.00',
    );
  });
});
