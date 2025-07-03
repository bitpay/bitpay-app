import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import styled from 'styled-components/native';
import Button, {ButtonState} from '../../components/button/Button';
import haptic from '../../components/haptic-feedback/haptic';
import {HEIGHT, ScreenGutter} from '../../components/styled/Containers';
import {BaseText} from '../../components/styled/Text';
import SwapButton, {
  ButtonText,
  SwapButtonContainer,
} from '../../components/swap-button/SwapButton';
import VirtualKeyboard from '../../components/virtual-keyboard/VirtualKeyboard';
import {getAvailableFiatCurrencies} from '../../navigation/services/buy-crypto/utils/buy-crypto-utils';
import {getAvailableSellCryptoFiatCurrencies} from '../../navigation/services/sell-crypto/utils/sell-crypto-utils';
import {ParseAmount} from '../../store/wallet/effects/amount/amount';
import {Caution, Slate30, SlateDark} from '../../styles/colors';
import {
  formatCurrencyAbbreviation,
  formatFiatAmount,
  getRateByCurrencyName,
} from '../../utils/helper-methods';
import {useAppDispatch} from '../../utils/hooks';
import useAppSelector from '../../utils/hooks/useAppSelector';
import CurrencySymbol from '../icons/currency-symbol/CurrencySymbol';
import {useLogger} from '../../utils/hooks/useLogger';
import {getBuyCryptoFiatLimits} from '../../store/buy-crypto/buy-crypto.effects';
import KeyEvent from 'react-native-keyevent';
import ArchaxFooter from '../archax/archax-footer';
import {View} from 'react-native';

const AmountContainer = styled.SafeAreaView`
  flex: 1;
`;

const CtaContainer = styled.View<{isSmallScreen?: boolean}>`
  width: 100%;
  margin-top: ${({isSmallScreen}) => (isSmallScreen ? 0 : '20px')};
  flex-direction: row;
  justify-content: space-between;
`;

export const AmountHeroContainer = styled.View<{isSmallScreen: boolean}>`
  flex-direction: column;
  align-items: center;
  margin-top: ${({isSmallScreen}) => (isSmallScreen ? 0 : '20px')};
  padding: 0 ${ScreenGutter};
`;

const ActionContainer = styled.View<{isModal?: boolean}>`
  margin-bottom: 15px;
  width: 100%;
`;

const ButtonContainer = styled.View`
  padding: 0 ${ScreenGutter};
`;

const ViewContainer = styled.View`
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

const VirtualKeyboardContainer = styled.View`
  justify-content: center;
  align-items: center;
`;

const Row = styled.View`
  flex-direction: row;
`;

const AmountText = styled(BaseText)<{bigAmount?: boolean}>`
  font-size: ${({bigAmount}) => (bigAmount ? '35px' : '50px')};
  font-weight: 500;
  text-align: center;
  color: ${({theme}) => theme.colors.text};
`;

const AmountEquivText = styled(AmountText)`
  font-size: 12px;
  border-width: 1px;
  border-color: ${({theme: {dark}}) => (dark ? SlateDark : Slate30)};
  padding: 4px 8px;
  border-radius: 15px;
`;

const WarnMsgText = styled(BaseText)`
  margin-top: 10px;
  font-size: 12px;
  font-weight: 700;
  color: ${Caution};
  padding: 4px 8px;
`;

const CurrencySuperScript = styled.View`
  position: absolute;
  top: 10px;
  right: -20px;
`;
const CurrencyText = styled(BaseText)<{bigAmount?: boolean}>`
  font-size: ${({bigAmount}) => (bigAmount ? '12px' : '20px')};
  color: ${({theme}) => theme.colors.text};
  position: absolute;
`;

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
  onSendMaxPressed?: () => any;

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
  onSendMaxPressed,
  onSubmit,
}) => {
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const logger = useLogger();
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const allRates = useAppSelector(({RATE}) => RATE.rates);
  const curValRef = useRef('');
  const showArchaxBanner = useAppSelector(({APP}) => APP.showArchaxBanner);
  const _isSmallScreen = showArchaxBanner ? true : HEIGHT < 700;

  const fiatCurrency = useMemo(() => {
    if (fiatCurrencyAbbreviation) {
      return fiatCurrencyAbbreviation;
    }

    if (context === 'buyCrypto') {
      return getAvailableFiatCurrencies().includes(defaultAltCurrency.isoCode)
        ? defaultAltCurrency.isoCode
        : 'USD';
    } else if (context === 'sellCrypto') {
      return getAvailableSellCryptoFiatCurrencies().includes(
        defaultAltCurrency.isoCode,
      )
        ? defaultAltCurrency.isoCode
        : 'USD';
    }

    return defaultAltCurrency.isoCode;
  }, [context, defaultAltCurrency.isoCode, fiatCurrencyAbbreviation]);

  const [continueEnabled, setContinueEnabled] = useState(false);

  // flag for primary selector type
  const [rate, setRate] = useState(0);
  const [amountConfig, updateAmountConfig] = useState({
    // display amount fiat/crypto
    displayAmount: '0',
    displayEquivalentAmount: '0',
    // amount to be sent to proposal creation (sats)
    amount: '0',
    currency: cryptoCurrencyAbbreviation
      ? cryptoCurrencyAbbreviation
      : fiatCurrency,
    primaryIsFiat:
      !cryptoCurrencyAbbreviation ||
      cryptoCurrencyAbbreviation === fiatCurrency,
  });
  const [useSendMax, setUseSendMax] = useState(false);
  const [limits, setLimits] = useState<Limits>({
    min: undefined,
    max: undefined,
  });

  const swapList = useMemo(() => {
    return cryptoCurrencyAbbreviation
      ? [
          ...new Set([
            formatCurrencyAbbreviation(cryptoCurrencyAbbreviation),
            fiatCurrency,
          ]),
        ]
      : [fiatCurrency];
  }, [cryptoCurrencyAbbreviation, fiatCurrency]);

  const {
    displayAmount,
    displayEquivalentAmount,
    amount,
    currency,
    primaryIsFiat,
  } = amountConfig;

  const updateAmount = (_val: string) => {
    const val = Number(_val);

    if (isNaN(val) || !cryptoCurrencyAbbreviation || !chain) {
      updateAmountConfig(current => ({
        ...current,
        displayAmount: _val,
        amount: _val,
      }));

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

    updateAmountConfig(current => ({
      ...current,
      displayAmount: _val,
      displayEquivalentAmount: primaryIsFiat ? cryptoAmount : fiatAmount,
      amount: cryptoAmount,
    }));
  };
  const updateAmountRef = useRef(updateAmount);
  updateAmountRef.current = updateAmount;

  const onCellPress = useCallback((val: string) => {
    haptic('soft');
    setUseSendMax(false);
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
      } else {
        sendMaxAmount = limitsOpts.limits.maxAmount.toString();
        if (primaryIsFiat && rate) {
          sendMaxAmount = (+limitsOpts.limits.maxAmount * rate).toFixed(2);
        }
        curValRef.current = sendMaxAmount;
        updateAmountRef.current(sendMaxAmount);
        setUseSendMax(false);
      }
      curValRef.current = sendMaxAmount;
      updateAmountRef.current(sendMaxAmount);
    } else if (limitsOpts?.maxWalletAmount) {
      sendMaxAmount = limitsOpts.maxWalletAmount;
      if (primaryIsFiat && rate) {
        sendMaxAmount = (+limitsOpts.maxWalletAmount * rate).toFixed(2);
      }
      setUseSendMax(true);
      curValRef.current = sendMaxAmount;
      updateAmountRef.current(sendMaxAmount);
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

  const getWarnMsg = useMemo<JSX.Element>(() => {
    let msg: string | undefined;
    if (+amount > 0) {
      if (limits.min && +amount < limits.min) {
        if (context === 'buyCrypto' && fiatCurrency) {
          msg = t('MinAmountWarnMsg', {
            min: limits.min,
            currency: fiatCurrency,
          });
        } else if (context !== 'buyCrypto' && cryptoCurrencyAbbreviation) {
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
        if (context === 'buyCrypto' && fiatCurrency) {
          msg = t('MaxAmountWarnMsg', {
            max: limits.max,
            currency: fiatCurrency,
          });
        } else if (context !== 'buyCrypto' && cryptoCurrencyAbbreviation) {
          msg = t('MaxAmountWarnMsg', {
            max: limits.max,
            currency: cryptoCurrencyAbbreviation,
          });
        }
      }
    }

    return msg ? <WarnMsgText>{msg}</WarnMsgText> : <></>;
  }, [amount, limits, context]);

  const init = () => {
    if (!currency) {
      return;
    }
    updateAmount('0');
    // if added for dev (hot reload)
    if (
      !primaryIsFiat &&
      getRateByCurrencyName(allRates, currency.toLowerCase(), chain!)
    ) {
      const rateByCurrencyName = getRateByCurrencyName(
        allRates,
        currency.toLowerCase(),
        chain!,
        tokenAddress,
      );
      const fiatRateData = rateByCurrencyName.find(
        r => r.code === fiatCurrency,
      );

      if (!fiatRateData) {
        logger.warn(
          `There is no fiatRateData for: ${currency.toLowerCase()} (${chain}) and ${fiatCurrency}. Setting rate to 0.`,
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
    if (context === 'buyCrypto') {
      setLimits(dispatch(getBuyCryptoFiatLimits(undefined, fiatCurrency)));
    } else if (limitsOpts?.limits) {
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
          marginTop: _isSmallScreen
            ? reduceTopGap && isModal
              ? -40
              : 0
            : reduceTopGap && isModal
            ? -10
            : 0,
        }}>
        <AmountHeroContainer isSmallScreen={_isSmallScreen}>
          <Row>
            <AmountText
              numberOfLines={1}
              ellipsizeMode={'tail'}
              bigAmount={_isSmallScreen ? true : displayAmount?.length > 8}>
              {displayAmount || 0}
            </AmountText>
            <CurrencySuperScript>
              <CurrencyText
                bigAmount={_isSmallScreen ? true : displayAmount?.length > 8}>
                {formatCurrencyAbbreviation(currency) || 'USD'}
              </CurrencyText>
            </CurrencySuperScript>
          </Row>
          {customAmountSublabel ? (
            <>{customAmountSublabel(+amount)}</>
          ) : cryptoCurrencyAbbreviation ? (
            <Row>
              <AmountEquivText>
                {displayEquivalentAmount || 0}{' '}
                {primaryIsFiat &&
                  formatCurrencyAbbreviation(cryptoCurrencyAbbreviation)}
              </AmountEquivText>
            </Row>
          ) : null}
          <View
            style={{
              position: 'absolute',
              top: _isSmallScreen
                ? !context || !['sellCrypto', 'swapCrypto'].includes(context)
                  ? 40
                  : 70
                : 100,
            }}>
            {getWarnMsg}
          </View>
          <CtaContainer isSmallScreen={_isSmallScreen}>
            {context &&
            ['sellCrypto', 'swapCrypto'].includes(context) &&
            limitsOpts?.maxWalletAmount ? (
              <SwapButtonContainer
                isSmallScreen={_isSmallScreen}
                onPress={() => swapCryptoSendMax()}>
                <CurrencySymbol />
                <ButtonText isSmallScreen={_isSmallScreen}>MAX</ButtonText>
              </SwapButtonContainer>
            ) : (
              <Row />
            )}
            {swapList.length > 1 ? (
              <SwapButton
                swapList={swapList}
                onChange={(toCurrency: string) => {
                  curValRef.current = '';
                  updateAmountRef.current('0');
                  updateAmountConfig(current => ({
                    ...current,
                    currency: toCurrency,
                    primaryIsFiat: !primaryIsFiat,
                    displayAmount: '0',
                    displayEquivalentAmount: primaryIsFiat
                      ? formatFiatAmount(0, fiatCurrency, {
                          currencyDisplay: 'symbol',
                        })
                      : '0',
                  }));
                }}
              />
            ) : null}
          </CtaContainer>
        </AmountHeroContainer>

        <ActionContainer>
          <VirtualKeyboardContainer>
            <VirtualKeyboard
              onCellPress={onCellPress}
              showDot={currency !== 'JPY'}
            />
          </VirtualKeyboardContainer>
          <ButtonContainer>
            <Button
              state={buttonState}
              disabled={!continueEnabled}
              onPress={() =>
                useSendMax && onSendMaxPressed
                  ? onSendMaxPressed()
                  : onSubmit?.(+amount)
              }>
              {t('Continue')}
            </Button>
          </ButtonContainer>
          {showArchaxBanner && <ArchaxFooter isSmallScreen={_isSmallScreen} />}
        </ActionContainer>
      </ViewContainer>
    </AmountContainer>
  );
};

export default Amount;
