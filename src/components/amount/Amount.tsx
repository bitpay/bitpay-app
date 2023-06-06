import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import styled from 'styled-components/native';
import Button, {ButtonState} from '../../components/button/Button';
import haptic from '../../components/haptic-feedback/haptic';
import {ScreenGutter} from '../../components/styled/Containers';
import {BaseText} from '../../components/styled/Text';
import VirtualKeyboard from '../../components/virtual-keyboard/VirtualKeyboard';
import {ParseAmount} from '../../store/wallet/effects/amount/amount';
import {Caution, Slate30, SlateDark} from '../../styles/colors';
import {
  formatFiatAmount,
  getRateByCurrencyName,
} from '../../utils/helper-methods';
import {useAppDispatch} from '../../utils/hooks';
import useAppSelector from '../../utils/hooks/useAppSelector';
import {useLogger} from '../../utils/hooks/useLogger';

const AmountContainer = styled.View`
  flex: 1;
`;

export const AmountHeroContainer = styled.View`
  flex-direction: column;
  align-items: center;
  margin-top: 20px;
  padding: 0 ${ScreenGutter};
`;

const ActionContainer = styled.View<{isModal?: boolean}>`
  position: absolute;
  bottom: 15px;
  width: 100%;
`;

const ButtonContainer = styled.View`
  padding: 0 ${ScreenGutter};
`;

const ViewContainer = styled.View`
  height: 100%;
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

const CurrencyText = styled(BaseText)`
  font-size: 20px;
  color: ${({theme}) => theme.colors.text};
  position: absolute;
`;

export interface Limits {
  min?: number;
  max?: number;
}

export interface AmountProps {
  cryptoCurrencyAbbreviation?: string;
  fiatCurrencyAbbreviation?: string;
  chain?: string;
  context?: string;
  buttonState?: ButtonState;
  onSendMaxPressed?: () => any;

  /**
   * @param amount crypto amount
   */
  onSubmit: (amount: number) => void;
}

const Amount: React.VFC<AmountProps> = ({
  cryptoCurrencyAbbreviation,
  fiatCurrencyAbbreviation,
  chain,
  context,
  buttonState,
  onSendMaxPressed,
  onSubmit,
}) => {
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const logger = useLogger();
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const allRates = useAppSelector(({RATE}) => RATE.rates);
  const curValRef = useRef('');

  const fiatCurrency = useMemo(() => {
    if (fiatCurrencyAbbreviation) {
      return fiatCurrencyAbbreviation;
    }
    return defaultAltCurrency.isoCode;
  }, [context, defaultAltCurrency.isoCode, fiatCurrencyAbbreviation]);

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

  const continueIsDisabled = () => {
    if (limits.min && +amount > 0 && +amount < limits.min) {
      return true;
    } else if (limits.max && +amount > 0 && +amount > limits.max) {
      return true;
    } else {
      return !+amount && buttonState !== 'loading'; // Default case
    }
  };

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
      const fiatRate = getRateByCurrencyName(
        allRates,
        currency.toLowerCase(),
        chain!,
      ).find(r => r.code === fiatCurrency)!.rate;
      setRate(fiatRate);
    }
  };
  const initRef = useRef(init);
  initRef.current = init;

  useEffect(() => {
    initRef.current();
  }, []);

  return (
    <AmountContainer>
      <ViewContainer>
        <AmountHeroContainer>
          <Row>
            <AmountText
              numberOfLines={1}
              ellipsizeMode={'tail'}
              bigAmount={displayAmount?.length > 8}>
              {displayAmount || 0}
            </AmountText>
            <CurrencySuperScript>
              <CurrencyText>{currency || 'USD'}</CurrencyText>
            </CurrencySuperScript>
          </Row>
          {cryptoCurrencyAbbreviation ? (
            <Row>
              <AmountEquivText>
                {displayEquivalentAmount || 0}{' '}
                {primaryIsFiat && cryptoCurrencyAbbreviation}
              </AmountEquivText>
            </Row>
          ) : null}
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
              disabled={continueIsDisabled()}
              onPress={() =>
                useSendMax && onSendMaxPressed
                  ? onSendMaxPressed()
                  : onSubmit?.(+amount)
              }>
              {t('Continue')}
            </Button>
          </ButtonContainer>
        </ActionContainer>
      </ViewContainer>
    </AmountContainer>
  );
};

export default Amount;
