import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {SafeAreaView, StyleSheet, Text, View, ViewProps} from 'react-native';
import {useTheme} from '../../../../contexts';
import {ButtonState} from '../../../../components/button/Button';
import haptic from '../../../../components/haptic-feedback/haptic';
import {ScreenGutter} from '../../../../components/styled/Containers';
import {BaseText} from '../../../../components/styled/Text';
import VirtualKeyboard from '../../../../components/virtual-keyboard/VirtualKeyboard';
import {ParseAmount} from '../../../../store/wallet/effects/amount/amount';
import {Caution, NeutralSlate, White} from '../../../../styles/colors';
import {
  formatFiatAmount,
  getRateByCurrencyName,
} from '../../../../utils/helper-methods';
import {useAppDispatch} from '../../../../utils/hooks';
import useAppSelector from '../../../../utils/hooks/useAppSelector';
import {useLogger} from '../../../../utils/hooks/useLogger';
import KeyEvent from 'react-native-keyevent';
import {AltCurrenciesRowProps} from '../../../../components/list/AltCurrenciesRow';
import BottomAmountPills, {BottomAmountPillsProps} from './BottomAmountPills';

const styles = StyleSheet.create({
  amountContainer: {
    flex: 1,
  },
  testContainer: {
    display: 'flex',
    alignItems: 'flex-start',
    flexDirection: 'column',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  testText: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '700',
  },
  ctaContainer: {
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    height: 46.7,
    paddingVertical: 16,
    paddingHorizontal: 8,
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: {width: 0, height: -4},
    shadowRadius: 4,
    shadowOpacity: 1,
  },
  amountHeroContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 0,
    paddingHorizontal: parseInt(ScreenGutter, 10),
  },
  actionContainer: {
    marginBottom: 15,
    width: '100%',
  },
  viewContainer: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  virtualKeyboardContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  warnMsgText: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '700',
    color: Caution,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
});

const AmountContainer: React.FC<ViewProps> = ({style, ...rest}) => (
  <SafeAreaView style={[styles.amountContainer, style]} {...rest} />
);

const TestContainer: React.FC<ViewProps & {isSmallScreen?: boolean}> = ({
  style,
  isSmallScreen,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.testContainer,
        {
          marginTop: isSmallScreen ? 0 : 20,
          backgroundColor: theme.dark ? '#121212' : White,
        },
        style,
      ]}
      {...rest}
    />
  );
};

const TestText = React.forwardRef<Text, React.ComponentProps<typeof BaseText>>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <BaseText
        ref={ref}
        style={[
          styles.testText,
          {color: theme.dark ? White : '#000000'},
          style,
        ]}
        {...rest}
      />
    );
  },
);
TestText.displayName = 'TestText';

const CtaContainer: React.FC<ViewProps & {isSmallScreen?: boolean}> = ({
  style,
  isSmallScreen,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.ctaContainer,
        {
          marginTop: isSmallScreen ? 0 : 20,
          backgroundColor: theme.dark ? '#121212' : NeutralSlate,
        },
        style,
      ]}
      {...rest}
    />
  );
};

export const AmountHeroContainer: React.FC<
  ViewProps & {isSmallScreen: boolean}
> = ({style, isSmallScreen, ...rest}) => (
  <View
    style={[
      styles.amountHeroContainer,
      {marginTop: isSmallScreen ? 0 : 20},
      style,
    ]}
    {...rest}
  />
);

const ActionContainer: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.actionContainer, style]} {...rest} />
);

const ViewContainer: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.viewContainer, style]} {...rest} />
);

const VirtualKeyboardContainer: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.virtualKeyboardContainer, style]} {...rest} />
);

const WarnMsgText = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => (
  <BaseText ref={ref} style={[styles.warnMsgText, style]} {...rest} />
));
WarnMsgText.displayName = 'WarnMsgText';

export interface Limits {
  min?: number;
  max?: number;
}

export interface LimitsOpts {
  maxWalletAmount?: string;
  limits: {
    minAmount?: number;
    maxAmount?: number;
  };
}

export type BottomAmountContext = 'swapCrypto';

export interface BottomAmountProps {
  amountEnteredIsFiat: boolean;
  cryptoCurrencyAbbreviation?: string;
  fiatCurrencyAbbreviation?: string;
  tokenAddress?: string;
  chain?: string;
  context?: BottomAmountContext;
  buttonState?: ButtonState;
  limitsOpts?: LimitsOpts;
  pillsOpts?: BottomAmountPillsProps;
  onSendMaxPressed?: () => any;
  /** Initial amount to display (used for reverting on invalid close) */
  initialAmount?: number;
  /** Callback fired on each amount change with validity status */
  onAmountChange?: (
    amount: number,
    displayAmount: string,
    fromPill?: boolean,
    isValid?: boolean,
  ) => void;

  /**
   * @param amount crypto amount
   */
  onSubmit?: (amount: number) => void;
}

const BottomAmount: React.FC<BottomAmountProps> = ({
  amountEnteredIsFiat,
  initialAmount,
  cryptoCurrencyAbbreviation,
  fiatCurrencyAbbreviation,
  chain,
  tokenAddress,
  context,
  buttonState,
  limitsOpts,
  pillsOpts,
  onSendMaxPressed,
  onAmountChange,
  onSubmit,
}) => {
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const logger = useLogger();
  const defaultAltCurrency: AltCurrenciesRowProps = useAppSelector(
    ({APP}) => APP.defaultAltCurrency,
  );
  const allRates = useAppSelector(({RATE}) => RATE.rates);
  const curValRef = useRef('');
  const _isSmallScreen = true;

  const fiatCurrency = useMemo<string>(() => {
    if (fiatCurrencyAbbreviation) {
      return fiatCurrencyAbbreviation;
    }

    return defaultAltCurrency.isoCode;
  }, [context, defaultAltCurrency.isoCode, fiatCurrencyAbbreviation]);

  const [continueEnabled, setContinueEnabled] = useState(false);

  // flag for primary selector type
  const [rate, setRate] = useState(0);
  const [primaryIsFiat, setPrimaryIsFiat] = useState(amountEnteredIsFiat);
  const [displayAmount, setDisplayAmount] = useState('0');
  const [displayEquivalentAmount, setDisplayEquivalentAmount] = useState(
    !amountEnteredIsFiat
      ? formatFiatAmount(0, fiatCurrency, {
          currencyDisplay: 'symbol',
        })
      : '0',
  );
  const [amount, setAmount] = useState('0');
  const [useSendMax, setUseSendMax] = useState(false);
  const [limits, setLimits] = useState<Limits>({
    min: undefined,
    max: undefined,
  });
  const [isAmountValid, setIsAmountValid] = useState(false);

  const updateAmount = (
    _val: string,
    fromPill?: boolean,
    skipOnAmountChange?: boolean,
  ) => {
    const val = Number(_val);

    if (isNaN(val) || !cryptoCurrencyAbbreviation || !chain) {
      setDisplayAmount(_val);
      setAmount(_val);
      return;
    }

    const cryptoAmount =
      val === 0 || !cryptoCurrencyAbbreviation
        ? '0'
        : dispatch(
            ParseAmount(
              primaryIsFiat ? val / rate : val,
              cryptoCurrencyAbbreviation.toLowerCase(),
              chain,
              tokenAddress,
            ),
          ).amount;

    const fiatAmount = formatFiatAmount(val * rate, fiatCurrency, {
      currencyDisplay: 'symbol',
      currencyAbbreviation: primaryIsFiat
        ? undefined
        : cryptoCurrencyAbbreviation,
    });
    setDisplayAmount(_val);
    setDisplayEquivalentAmount(primaryIsFiat ? cryptoAmount : fiatAmount);
    setAmount(cryptoAmount);

    // Notify parent of amount change in real-time (for swapCrypto context)
    if (context === 'swapCrypto' && onAmountChange && !skipOnAmountChange) {
      const numericCryptoAmount = Number(cryptoAmount);
      // Check validity based on limits
      const isValid = checkAmountValidity(numericCryptoAmount);
      setIsAmountValid(isValid);
      onAmountChange(numericCryptoAmount, _val, fromPill, isValid);
    }
  };
  const updateAmountRef = useRef(updateAmount);
  updateAmountRef.current = updateAmount;

  // Helper function to check if amount is within valid limits
  const checkAmountValidity = useCallback(
    (cryptoAmount: number): boolean => {
      if (!cryptoAmount || cryptoAmount <= 0) {
        return false;
      }
      // Use limitsOpts directly for initial validation (limits state may not be set yet)
      const minLimit = limits.min ?? limitsOpts?.limits?.minAmount;
      const maxLimit = limits.max ?? limitsOpts?.limits?.maxAmount;

      if (minLimit && cryptoAmount < minLimit) {
        return false;
      }
      if (
        limitsOpts?.maxWalletAmount &&
        cryptoAmount > Number(limitsOpts.maxWalletAmount)
      ) {
        return false;
      }
      if (maxLimit && cryptoAmount > maxLimit) {
        return false;
      }
      return true;
    },
    [
      limits.min,
      limits.max,
      limitsOpts?.limits?.minAmount,
      limitsOpts?.limits?.maxAmount,
      limitsOpts?.maxWalletAmount,
    ],
  );

  const onCellPress = useCallback((val: string) => {
    haptic('soft');
    setUseSendMax(false);
    pillsOpts?.onPillPress?.(undefined);
    let newValue;
    switch (val) {
      case 'reset':
        newValue = '';
        break;
      case 'backspace':
        if (curValRef.current.length === 0) {
          curValRef.current = '0';
          updateAmountRef.current('0');
          return;
        }
        newValue = curValRef.current.slice(0, -1);
        break;
      case '.':
        newValue = curValRef.current.includes('.')
          ? curValRef.current
          : curValRef.current + val;
        break;
      default:
        const hasExactlyTwoDecimals = /\.\d{2}$/.test(curValRef.current);
        const hasExactlySixDecimals = /\.\d{6}$/.test(curValRef.current);
        if (primaryIsFiat && hasExactlyTwoDecimals) {
          newValue = curValRef.current;
        } else if (hasExactlySixDecimals) {
          newValue = curValRef.current;
        } else {
          newValue = curValRef.current + val;
        }
    }
    curValRef.current = newValue;
    updateAmountRef.current(newValue);
  }, []);

  const swapCryptoSendMax = () => {
    logger.debug(
      `Handling swapCryptoSendMax with: ${JSON.stringify(limitsOpts)}`,
    );

    let sendMaxAmount: string;
    if (limitsOpts?.limits?.maxAmount && limitsOpts?.maxWalletAmount) {
      if (limitsOpts.limits.maxAmount >= Number(limitsOpts.maxWalletAmount)) {
        sendMaxAmount = limitsOpts.maxWalletAmount;
        if (primaryIsFiat && rate) {
          sendMaxAmount = (+limitsOpts.maxWalletAmount * rate).toFixed(2);
        }
        setUseSendMax(true);
        // curValRef.current = sendMaxAmount;
        // updateAmountRef.current(sendMaxAmount);
      } else {
        sendMaxAmount = limitsOpts.limits.maxAmount.toString();
        if (primaryIsFiat && rate) {
          sendMaxAmount = (+limitsOpts.limits.maxAmount * rate).toFixed(2);
        }
        curValRef.current = sendMaxAmount;
        updateAmountRef.current(sendMaxAmount);
        setUseSendMax(false);
      }
    } else if (limitsOpts?.maxWalletAmount) {
      sendMaxAmount = limitsOpts.maxWalletAmount;
      if (primaryIsFiat && rate) {
        sendMaxAmount = (+limitsOpts.maxWalletAmount * rate).toFixed(2);
      }
      setUseSendMax(true);
      // curValRef.current = sendMaxAmount;
      // updateAmountRef.current(sendMaxAmount);
    } else {
      setUseSendMax(false);
    }
  };

  useEffect(() => {
    if (limits.min && +amount > 0 && +amount < limits.min) {
      setContinueEnabled(false);
    } else if (
      limitsOpts?.maxWalletAmount &&
      +amount > 0 &&
      +amount > Number(limitsOpts.maxWalletAmount)
    ) {
      setContinueEnabled(false);
    } else if (limits.max && +amount > 0 && +amount > limits.max) {
      setContinueEnabled(false);
    } else if (!+amount && buttonState !== 'loading') {
      setContinueEnabled(false); // Default case
    } else {
      setContinueEnabled(true);
    }
  }, [
    amount,
    limits.max,
    limits.min,
    buttonState,
    limitsOpts?.maxWalletAmount,
  ]);

  const getWarnMsg = useMemo<React.ReactNode>(() => {
    let msg: string | undefined;
    if (+amount > 0) {
      if (
        (!limits?.min || (limits.min && +amount >= limits.min)) &&
        limitsOpts?.maxWalletAmount &&
        +amount > Number(limitsOpts.maxWalletAmount)
      ) {
        msg = t('Not enough funds');
      }
    }

    return msg ? <WarnMsgText>{msg}</WarnMsgText> : <></>;
  }, [amount, limits, context]);

  const init = () => {
    updateAmount('0', false, true);

    if (
      (!primaryIsFiat || context === 'swapCrypto') &&
      cryptoCurrencyAbbreviation &&
      getRateByCurrencyName(
        allRates,
        cryptoCurrencyAbbreviation.toLowerCase(),
        chain!,
        tokenAddress,
      )
    ) {
      const rateByCurrencyName = getRateByCurrencyName(
        allRates,
        cryptoCurrencyAbbreviation.toLowerCase(),
        chain!,
        tokenAddress,
      );
      const fiatRateData = rateByCurrencyName.find(
        r => r.code === fiatCurrency,
      );

      if (!fiatRateData) {
        logger.warn(
          `There is no fiatRateData for: ${cryptoCurrencyAbbreviation.toLowerCase()} (${chain}) and ${fiatCurrency}. Setting rate to 0.`,
        );
        setRate(0);
        return;
      }

      const fiatRate = fiatRateData.rate;
      setRate(fiatRate);
    }
  };
  const initRef = useRef(init);
  initRef.current = init;

  const initLimits = (): void => {
    if (limitsOpts?.limits) {
      setLimits({
        min: limitsOpts.limits.minAmount,
        max: limitsOpts.limits.maxAmount,
      });
    }
  };

  useEffect(() => {
    try {
      initRef.current();
    } catch (err: any) {
      const errStr = err instanceof Error ? err.message : JSON.stringify(err);
      logger.error(`[Amount] could not initialize view: ${errStr}`);
    }
    initLimits();
  }, []);

  useEffect(() => {
    KeyEvent.onKeyUpListener((keyEvent: any) => {
      if (keyEvent.pressedKey === '\b') {
        onCellPress('backspace');
      } else if (keyEvent.pressedKey === '\r' && continueEnabled) {
        onSubmit?.(+curValRef.current);
      } else if (keyEvent.pressedKey === 'UIKeyInputEscape') {
        onCellPress('reset');
      } else if (keyEvent.pressedKey === '0') {
        onCellPress('0');
      } else if (keyEvent.pressedKey === '.') {
        onCellPress('.');
      } else if (Number(keyEvent.pressedKey)) {
        onCellPress(keyEvent.pressedKey);
      }
    });
    return () => KeyEvent.removeKeyUpListener();
  }, [continueEnabled]);

  return (
    <AmountContainer>
      <ViewContainer
        style={{
          marginTop: 0,
        }}>
        {/* Uncomment this section to run amount tests */}
        {/* <TestContainer>
          <TestText>{`primaryIsFiat: ${primaryIsFiat}`}</TestText>
          <TestText>{`curValRef.current: ${curValRef.current}`}</TestText>
          <TestText>{`amount: ${amount}`}</TestText>
          <TestText>{`displayAmount: ${displayAmount}`}</TestText>
          <TestText>{`displayEquivalentAmount: ${displayEquivalentAmount}`}</TestText>
          <TestText>{`limits: ${JSON.stringify(limits)}`}</TestText>
          <TestText>{`limitsOpts: ${JSON.stringify(limitsOpts)}`}</TestText>
        </TestContainer> */}
        <CtaContainer isSmallScreen={_isSmallScreen}>
          {pillsOpts ? (
            <BottomAmountPills
              selectedValue={pillsOpts.selectedValue}
              showMinPill={true}
              showMaxPill={true}
              maxPillDisabled={!limitsOpts?.maxWalletAmount && !limits?.max}
              hideFiatPills={false}
              onPillPress={(pillValue: string | undefined) => {
                try {
                  setUseSendMax(false);
                  const pillValueStr = pillValue?.toString();
                  pillsOpts.onPillPress?.(pillValueStr);
                  if (pillValueStr) {
                    switch (pillValueStr) {
                      case 'min':
                        if (limitsOpts?.limits?.minAmount) {
                          // set min pill to +5% of actual min limit to avoid edge cases
                          const _minAmount =
                            Number(limitsOpts.limits.minAmount) * 1.05;
                          const minAmount = _minAmount.toString();
                          if (primaryIsFiat && rate) {
                            const minAmountFiat = (_minAmount * rate).toFixed(
                              2,
                            );
                            curValRef.current = minAmountFiat;
                            updateAmountRef.current(minAmountFiat, true);
                          } else {
                            curValRef.current = minAmount;
                            updateAmountRef.current(minAmount, true);
                          }
                        }
                        return;
                      case '50':
                      case '75':
                        const decimalValue = pillValueStr === '50' ? 0.5 : 0.75;
                        const _maxAmountToUse =
                          limitsOpts?.maxWalletAmount &&
                          limitsOpts?.limits?.maxAmount &&
                          Number(limitsOpts.maxWalletAmount) <=
                            Number(limitsOpts.limits.maxAmount)
                            ? Number(limitsOpts.maxWalletAmount)
                            : limitsOpts?.limits?.maxAmount ?? 0;
                        const maxAmountToUse = (
                          _maxAmountToUse * decimalValue
                        ).toFixed(8);
                        if (primaryIsFiat && rate) {
                          const maxAmountFiat = (
                            Number(maxAmountToUse) * rate
                          ).toFixed(2);
                          curValRef.current = maxAmountFiat;
                          updateAmountRef.current(maxAmountFiat, true);
                        } else {
                          curValRef.current = maxAmountToUse;
                          updateAmountRef.current(maxAmountToUse, true);
                        }
                        return;
                      case 'max':
                        swapCryptoSendMax();
                        onSendMaxPressed?.();
                        return;
                      default:
                        return;
                    }
                  }
                } catch (err) {
                  const errorMsg =
                    err instanceof Error ? err.message : JSON.stringify(err);
                  logger.warn(
                    `An error occurred tapping bottomAmount pill: ${errorMsg}`,
                  );
                }
              }}
            />
          ) : null}
        </CtaContainer>

        <ActionContainer>
          <VirtualKeyboardContainer>
            <VirtualKeyboard
              onCellPress={onCellPress}
              showDot={!primaryIsFiat || fiatCurrency !== 'JPY'}
              context={'swapCrypto'}
            />
          </VirtualKeyboardContainer>
        </ActionContainer>
      </ViewContainer>
    </AmountContainer>
  );
};

export default BottomAmount;
