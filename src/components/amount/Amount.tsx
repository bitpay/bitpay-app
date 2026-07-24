import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../../contexts';
import Button, {ButtonState} from '../../components/button/Button';
import haptic from '../../components/haptic-feedback/haptic';
import {isNarrowHeight} from '../../components/styled/Containers';
import {BaseText} from '../../components/styled/Text';
import SwapButton from '../../components/swap-button/SwapButton';
import VirtualKeyboard from '../../components/virtual-keyboard/VirtualKeyboard';
import {ParseAmount} from '../../store/wallet/effects/amount/amount';
import {Caution, Slate30, SlateDark} from '../../styles/colors';
import {
  formatCurrencyAbbreviation,
  formatFiatAmount,
  getRateByCurrencyName,
} from '../../utils/helper-methods';
import {useAppDispatch} from '../../utils/hooks';
import useAppSelector from '../../utils/hooks/useAppSelector';
import KeyEvent from 'react-native-keyevent';
import ArchaxFooter from '../archax/archax-footer';
import {SafeAreaView, StyleSheet, View} from 'react-native';
import {createSelector} from 'reselect';
import {RootState} from '../../store';
import {logReactProfiler} from '../../utils/reactPerformanceProfiler';

const styles = StyleSheet.create({
  amountContainer: {
    flex: 1,
  },
  ctaContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionContainer: {
    marginBottom: 15,
    width: '100%',
  },
  buttonContainer: {
    paddingVertical: 0,
    paddingHorizontal: 12,
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
  row: {
    flexDirection: 'row',
  },
  amountText: {
    fontWeight: '500',
    textAlign: 'center',
  },
  amountEquivText: {
    fontSize: 12,
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 15,
  },
  warnMsgText: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '700',
    color: Caution,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  currencySuperScript: {
    position: 'absolute',
    top: 10,
    right: -20,
  },
  currencyText: {
    position: 'absolute',
  },
});

const CtaContainer: React.FC<
  {isSmallScreen?: boolean} & React.ComponentProps<typeof View>
> = ({isSmallScreen, style, ...rest}) => (
  <View
    style={[styles.ctaContainer, {marginTop: isSmallScreen ? 0 : 20}, style]}
    {...rest}
  />
);

export const AmountHeroContainer: React.FC<
  {isSmallScreen: boolean} & React.ComponentProps<typeof View>
> = ({isSmallScreen, style, ...rest}) => (
  <View
    style={[
      {
        flexDirection: 'column',
        alignItems: 'center',
        marginTop: isSmallScreen ? 0 : 20,
        paddingVertical: 0,
        paddingHorizontal: 12,
      },
      style,
    ]}
    {...rest}
  />
);

const AmountText: React.FC<
  {bigAmount?: boolean} & React.ComponentProps<typeof BaseText>
> = ({bigAmount, style, ...rest}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.amountText,
        {fontSize: bigAmount ? 35 : 50, color: theme.colors.text},
        style,
      ]}
      {...rest}
    />
  );
};

const AmountEquivText: React.FC<
  {bigAmount?: boolean} & React.ComponentProps<typeof BaseText>
> = ({bigAmount, style, ...rest}) => {
  const theme = useTheme();
  return (
    <AmountText
      bigAmount={bigAmount}
      style={[
        styles.amountEquivText,
        {borderColor: theme.dark ? SlateDark : Slate30},
        style,
      ]}
      {...rest}
    />
  );
};

const WarnMsgText: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => <BaseText style={[styles.warnMsgText, style]} {...rest} />;

const CurrencyText: React.FC<
  {bigAmount?: boolean} & React.ComponentProps<typeof BaseText>
> = ({bigAmount, style, ...rest}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.currencyText,
        {fontSize: bigAmount ? 12 : 20, color: theme.colors.text},
        style,
      ]}
      {...rest}
    />
  );
};

const AmountKeyboard = React.memo(
  ({
    isSmallScreen,
    onCellPress,
    showDot,
  }: {
    isSmallScreen: boolean;
    onCellPress: (value: string) => void;
    showDot: boolean;
  }) => (
    <React.Profiler id="Amount:keyboard" onRender={logReactProfiler}>
      <View style={styles.virtualKeyboardContainer}>
        <VirtualKeyboard
          onCellPress={onCellPress}
          showDot={showDot}
          isSmallScreen={isSmallScreen}
        />
      </View>
    </React.Profiler>
  ),
);

const AmountSubmit = React.memo(
  ({
    buttonState,
    disabled,
    label,
    onPress,
  }: {
    buttonState?: ButtonState;
    disabled: boolean;
    label: string;
    onPress: () => void;
  }) => (
    <React.Profiler id="Amount:submit" onRender={logReactProfiler}>
      <View style={styles.buttonContainer}>
        <Button state={buttonState} disabled={disabled} onPress={onPress}>
          {label}
        </Button>
      </View>
    </React.Profiler>
  ),
);

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

export interface AmountProps {
  cryptoCurrencyAbbreviation?: string;
  fiatCurrencyAbbreviation?: string;
  tokenAddress?: string;
  chain?: string;
  context?: string;
  reduceTopGap?: boolean;
  buttonState?: ButtonState;
  limitsOpts?: LimitsOpts;
  isModal?: boolean;
  customAmountSublabel?: (amount: number) => void;

  /**
   * @param amount crypto amount
   */
  onSubmit: (amount: number) => void;
}

const Amount: React.FC<AmountProps> = ({
  cryptoCurrencyAbbreviation,
  fiatCurrencyAbbreviation,
  chain,
  tokenAddress,
  context,
  reduceTopGap,
  buttonState,
  limitsOpts,
  isModal,
  customAmountSublabel,
  onSubmit,
}) => {
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const defaultAltCurrencyIsoCode = useAppSelector(
    ({APP}) => APP.defaultAltCurrency.isoCode,
  );
  const curValRef = useRef('');
  const showArchaxBanner = useAppSelector(({APP}) => APP.showArchaxBanner);
  const _isSmallScreen = showArchaxBanner ? true : isNarrowHeight;

  const fiatCurrency = useMemo<string>(() => {
    if (fiatCurrencyAbbreviation) {
      return fiatCurrencyAbbreviation;
    }
    return defaultAltCurrencyIsoCode;
  }, [defaultAltCurrencyIsoCode, fiatCurrencyAbbreviation]);

  // flag for primary selector type
  const [currency, setCurrency] = useState(
    cryptoCurrencyAbbreviation ? cryptoCurrencyAbbreviation : fiatCurrency,
  );
  const [primaryIsFiat, setPrimaryIsFiat] = useState(
    !cryptoCurrencyAbbreviation || cryptoCurrencyAbbreviation === fiatCurrency,
  );
  const [displayAmount, setDisplayAmount] = useState('0');
  const [displayEquivalentAmount, setDisplayEquivalentAmount] = useState(
    !primaryIsFiat
      ? formatFiatAmount(0, fiatCurrency, {
          currencyDisplay: 'symbol',
        })
      : '0',
  );
  const [amount, setAmount] = useState('0');
  const limits = useMemo<Limits>(
    () => ({
      min: limitsOpts?.limits?.minAmount,
      max: limitsOpts?.limits?.maxAmount,
    }),
    [limitsOpts?.limits?.maxAmount, limitsOpts?.limits?.minAmount],
  );
  const selectAmountRate = useMemo(
    () =>
      createSelector([({RATE}: RootState) => RATE.rates], rates => {
        if (!cryptoCurrencyAbbreviation || !chain) {
          return 0;
        }

        const ratesForCurrency = getRateByCurrencyName(
          rates,
          cryptoCurrencyAbbreviation.toLowerCase(),
          chain,
          tokenAddress,
        );

        return (
          ratesForCurrency?.find(({code}) => code === fiatCurrency)?.rate ?? 0
        );
      }),
    [chain, cryptoCurrencyAbbreviation, fiatCurrency, tokenAddress],
  );
  const rate = useAppSelector(selectAmountRate);

  const swapList = useMemo(() => {
    return cryptoCurrencyAbbreviation
      ? primaryIsFiat
        ? [
            ...new Set([
              fiatCurrency,
              formatCurrencyAbbreviation(cryptoCurrencyAbbreviation) || 'USD',
            ]),
          ]
        : [
            ...new Set([
              formatCurrencyAbbreviation(cryptoCurrencyAbbreviation) || 'USD',
              fiatCurrency,
            ]),
          ]
      : [fiatCurrency];
  }, [cryptoCurrencyAbbreviation, fiatCurrency, primaryIsFiat]);

  const updateAmount = (_val: string) => {
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
  };
  const updateAmountRef = useRef(updateAmount);
  updateAmountRef.current = updateAmount;

  const onCellPress = useCallback((val: string) => {
    haptic('soft');
    let newValue;
    switch (val) {
      case 'reset':
        newValue = '';
        break;
      case 'backspace':
        if (curValRef.current.length === 0) {
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
        newValue = curValRef.current + val;
    }
    curValRef.current = newValue;
    updateAmountRef.current(newValue);
  }, []);

  const continueEnabled = useMemo(() => {
    if (limits.min && +amount > 0 && +amount < limits.min) {
      return false;
    }
    if (
      limitsOpts?.maxWalletAmount &&
      +amount > 0 &&
      +amount > Number(limitsOpts.maxWalletAmount)
    ) {
      return false;
    }
    if (limits.max && +amount > 0 && +amount > limits.max) {
      return false;
    }
    if (!+amount && buttonState !== 'loading') {
      return false;
    }
    return true;
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
      if (limits.min && +amount < limits.min) {
        if (cryptoCurrencyAbbreviation) {
          msg = t('MinAmountWarnMsg', {
            min: limits.min,
            currency: cryptoCurrencyAbbreviation,
          });
        }
      } else if (
        (!limits?.min || (limits.min && +amount >= limits.min)) &&
        limitsOpts?.maxWalletAmount &&
        +amount > Number(limitsOpts.maxWalletAmount)
      ) {
        msg = t('Not enough funds');
      } else if (limits.max && +amount > limits.max) {
        if (cryptoCurrencyAbbreviation) {
          msg = t('MaxAmountWarnMsg', {
            max: limits.max,
            currency: cryptoCurrencyAbbreviation,
          });
        }
      }
    }

    return msg ? <WarnMsgText>{msg}</WarnMsgText> : <></>;
  }, [
    amount,
    cryptoCurrencyAbbreviation,
    limits,
    limitsOpts?.maxWalletAmount,
    t,
  ]);

  const amountRef = useRef(amount);
  amountRef.current = amount;
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;
  const handleContinuePress = useCallback(() => {
    onSubmitRef.current(+amountRef.current);
  }, []);

  useEffect(() => {
    KeyEvent.onKeyUpListener((keyEvent: any) => {
      if (keyEvent.pressedKey === '\b') {
        onCellPress('backspace');
      } else if (keyEvent.pressedKey === '\r' && continueEnabled) {
        handleContinuePress();
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
  }, [continueEnabled, handleContinuePress, onCellPress]);

  const handleSwapCurrencyChange = useCallback(
    (toCurrency: string) => {
      curValRef.current = '';
      updateAmountRef.current('0');

      const nextPrimaryIsFiat = !primaryIsFiat;
      setCurrency(toCurrency);
      setPrimaryIsFiat(nextPrimaryIsFiat);
      setDisplayAmount('0');
      setDisplayEquivalentAmount(
        !nextPrimaryIsFiat
          ? formatFiatAmount(0, fiatCurrency, {
              currencyDisplay: 'symbol',
            })
          : '0',
      );
    },
    [fiatCurrency, primaryIsFiat],
  );

  return (
    <SafeAreaView style={styles.amountContainer}>
      <View
        style={[
          styles.viewContainer,
          {
            marginTop: _isSmallScreen
              ? reduceTopGap && isModal
                ? -40
                : 0
              : reduceTopGap && isModal
              ? -10
              : 0,
          },
        ]}>
        <AmountHeroContainer isSmallScreen={_isSmallScreen}>
          <View style={styles.row}>
            <AmountText
              numberOfLines={1}
              ellipsizeMode={'tail'}
              bigAmount={_isSmallScreen ? true : displayAmount?.length > 8}>
              {displayAmount || 0}
            </AmountText>
            <View style={styles.currencySuperScript}>
              <CurrencyText
                bigAmount={_isSmallScreen ? true : displayAmount?.length > 8}>
                {formatCurrencyAbbreviation(currency) || 'USD'}
              </CurrencyText>
            </View>
          </View>
          {customAmountSublabel ? (
            <>{customAmountSublabel(+amount)}</>
          ) : cryptoCurrencyAbbreviation ? (
            <View style={styles.row}>
              <AmountEquivText>
                {displayEquivalentAmount || 0}{' '}
                {primaryIsFiat
                  ? formatCurrencyAbbreviation(cryptoCurrencyAbbreviation)
                  : null}
              </AmountEquivText>
            </View>
          ) : null}
          <View
            style={{
              position: 'absolute',
              top: _isSmallScreen ? (!context ? 40 : 70) : 100,
            }}>
            {getWarnMsg}
          </View>
          <CtaContainer isSmallScreen={_isSmallScreen}>
            <View style={styles.row} />
            {swapList.length > 1 ? (
              <SwapButton
                swapList={swapList}
                onChange={handleSwapCurrencyChange}
              />
            ) : null}
          </CtaContainer>
        </AmountHeroContainer>

        <View style={styles.actionContainer}>
          <AmountKeyboard
            isSmallScreen={_isSmallScreen}
            onCellPress={onCellPress}
            showDot={currency !== 'JPY'}
          />
          <AmountSubmit
            buttonState={buttonState}
            disabled={!continueEnabled}
            label={t('Continue')}
            onPress={handleContinuePress}
          />
          {showArchaxBanner && <ArchaxFooter isSmallScreen={_isSmallScreen} />}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Amount;
