import React, {useEffect, useState} from 'react';
import {ActivityIndicator, ScrollView} from 'react-native';
import styled from 'styled-components/native';
import {RouteProp, useRoute, useNavigation} from '@react-navigation/native';
import cloneDeep from 'lodash.clonedeep';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import Button from '../../../../components/button/Button';
import haptic from '../../../../components/haptic-feedback/haptic';
import {BaseText, H5, H7} from '../../../../components/styled/Text';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import {useLogger} from '../../../../utils/hooks/useLogger';
import {BitpaySupportedCoins} from '../../../../constants/currencies';
import MoonpayLogo from '../../../../components/icons/external-services/moonpay/moonpay-logo';
import SimplexLogo from '../../../../components/icons/external-services/simplex/simplex-logo';
import WyreLogo from '../../../../components/icons/external-services/wyre/wyre-logo';
import {BuyCryptoExpandibleCard, ItemDivisor} from '../styled/BuyCryptoCard';
import {Black, SlateDark, ProgressBlue, White} from '../../../../styles/colors';
import {
  getPaymentUrl,
  simplexPaymentRequest,
  simplexEnv,
  getSimplexCoinFormat,
} from '../utils/simplex-utils';
import {getWyreCoinFormat, wyreEnv} from '../utils/wyre-utils';
import {RootState} from '../../../../store';
import {GetPrecision} from '../../../../store/wallet/utils/currency';
import {
  logSegmentEvent,
  openUrlWithInAppBrowser,
} from '../../../../store/app/app.effects';
import {BuyCryptoActions} from '../../../../store/buy-crypto';
import {
  BuyCryptoLimits,
  MoonpayPaymentData,
  SimplexPaymentData,
} from '../../../../store/buy-crypto/buy-crypto.models';
import {
  calculateAltFiatToUsd,
  getBuyCryptoFiatLimits,
} from '../../../../store/buy-crypto/buy-crypto.effects';
import {createWalletAddress} from '../../../../store/wallet/effects/address/address';
import {Wallet} from '../../../../store/wallet/wallet.models';
import {APP_DEEPLINK_PREFIX} from '../../../../constants/config';
import {
  getAvailableFiatCurrencies,
  isPaymentMethodSupported,
} from '../utils/buy-crypto-utils';
import {
  formatFiatAmount,
  getBadgeImg,
  getCurrencyAbbreviation,
  sleep,
} from '../../../../utils/helper-methods';
import {PaymentMethod} from '../constants/BuyCryptoConstants';
import {useTranslation} from 'react-i18next';
import {moonpayEnv} from '../utils/moonpay-utils';
import MoonpayTerms from '../components/terms/MoonpayTerms';
import SimplexTerms from '../components/terms/SimplexTerms';
import WyreTerms from '../components/terms/WyreTerms';
import {TermsContainer, TermsText} from '../styled/BuyCryptoTerms';

export interface BuyCryptoOffersProps {
  amount: number;
  fiatCurrency: string;
  coin: string;
  chain: string;
  country: string;
  selectedWallet: Wallet;
  paymentMethod: PaymentMethod;
}

interface SimplexGetQuoteRequestData {
  digital_currency: string;
  fiat_currency: string;
  requested_currency: string;
  requested_amount: number;
  end_user_id: string;
  env: 'sandbox' | 'production';
  payment_methods?: string[];
}

export type CryptoOfferKey = 'moonpay' | 'simplex' | 'wyre';

export type CryptoOffer = {
  key: CryptoOfferKey;
  showOffer: boolean;
  logo: JSX.Element;
  expanded: boolean;
  fiatCurrency: string;
  fiatAmount: number;
  amountCost?: number;
  buyAmount?: number;
  fee?: number;
  fiatMoney?: string; // Rate without fees
  amountReceiving?: string;
  amountLimits?: BuyCryptoLimits;
  errorMsg?: string;
  quoteData?: any; // Moonpay | Simplex
  outOfLimitMsg?: string;
};

const SummaryRow = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  margin-top: 20px;
  padding: 0px 14px;
`;

const SummaryItemContainer = styled.View`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  height: 50px;
`;

const SummaryTitle = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  font-size: 14px;
  margin-bottom: 5px;
`;

const SummaryData = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : Black)};
  font-weight: 500;
  font-size: 16px;
`;

const SpinnerContainer = styled.View`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

const CoinContainer = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
`;

const CoinIconContainer = styled.View`
  width: 20px;
  height: 20px;
  margin-right: 5px;
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const SummaryCtaContainer = styled.View`
  margin: 4px 0px;
`;

const OfferRow = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const OfferDataContainer = styled.View`
  display: flex;
  flex-direction: column;
`;

const OfferDataCryptoAmount = styled(H5)`
  color: ${({theme: {dark}}) => (dark ? White : Black)};
`;

const OfferDataRate = styled(H7)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const OfferDataInfoContainer = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-top: 20px;
`;

const OfferDataInfoLabel = styled(H7)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  margin-right: 10px;
`;

const OfferDataWarningContainer = styled.View`
  max-width: 85%;
  margin-top: 20px;
`;

const OfferDataWarningMsg = styled(BaseText)`
  color: #df5264;
  margin-right: 10px;
  font-size: 12;
`;

const OfferDataInfoText = styled(BaseText)`
  font-size: 16px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const OfferDataInfoTextSec = styled(H7)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  margin-top: 10px;
`;

const OfferDataInfoTotal = styled(H5)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  font-weight: bold;
`;

const OfferExpandibleItem = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  margin-top: 12px;
  margin-bottom: 12px;
`;

const OfferDataRightContainer = styled.View`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
`;

const offersDefault: {
  moonpay: CryptoOffer;
  simplex: CryptoOffer;
  wyre: CryptoOffer;
} = {
  moonpay: {
    key: 'moonpay',
    amountReceiving: '0',
    showOffer: true,
    logo: <MoonpayLogo widthIcon={25} heightIcon={25} />,
    expanded: false,
    fiatCurrency: 'USD',
    fiatAmount: 0,
    fiatMoney: undefined,
    errorMsg: undefined,
    outOfLimitMsg: undefined,
  },
  simplex: {
    key: 'simplex',
    amountReceiving: '0',
    showOffer: true,
    logo: (
      <SimplexLogo
        widthIcon={25}
        heightIcon={25}
        widthLogo={60}
        heightLogo={30}
      />
    ),
    expanded: false,
    fiatCurrency: 'USD',
    fiatAmount: 0,
    fiatMoney: undefined,
    errorMsg: undefined,
    outOfLimitMsg: undefined,
  },
  wyre: {
    key: 'wyre',
    amountReceiving: '0',
    showOffer: true,
    logo: <WyreLogo width={70} height={20} />,
    expanded: false,
    fiatCurrency: 'USD',
    fiatAmount: 0,
    fiatMoney: undefined,
    errorMsg: undefined,
    outOfLimitMsg: undefined,
  },
};

const BuyCryptoOffers: React.FC = () => {
  const {
    params: {
      amount,
      fiatCurrency,
      coin,
      chain,
      country,
      selectedWallet,
      paymentMethod,
    },
  } = useRoute<RouteProp<{params: BuyCryptoOffersProps}>>();
  const {t} = useTranslation();
  const logger = useLogger();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const createdOn = useAppSelector(({WALLET}: RootState) => WALLET.createdOn);

  const exchangesArray: CryptoOfferKey[] = ['moonpay', 'simplex', 'wyre'];
  exchangesArray.forEach((exchange: CryptoOfferKey) => {
    if (offersDefault[exchange]) {
      offersDefault[exchange].fiatCurrency = getAvailableFiatCurrencies(
        exchange,
      ).includes(fiatCurrency)
        ? fiatCurrency
        : 'USD';

      offersDefault[exchange].showOffer = isPaymentMethodSupported(
        exchange,
        paymentMethod,
        coin,
        chain,
        offersDefault.simplex.fiatCurrency,
      );
    }
  });

  const [offers, setOffers] = useState(cloneDeep(offersDefault));
  const [finishedMoonpay, setFinishedMoonpay] = useState(false);
  const [finishedSimplex, setFinishedSimplex] = useState(false);
  const [finishedWyre, setFinishedWyre] = useState(false);
  const [updateView, setUpdateView] = useState(false);

  const getMoonpayQuote = (): void => {
    logger.debug('Moonpay getting quote');

    offers.moonpay.fiatAmount =
      offers.moonpay.fiatCurrency === fiatCurrency
        ? amount
        : dispatch(calculateAltFiatToUsd(amount, fiatCurrency)) || amount;

    let _paymentMethod: string | undefined;
    switch (paymentMethod.method) {
      case 'debitCard':
      case 'creditCard':
        _paymentMethod = 'credit_debit_card';
        break;
      case 'sepaBankTransfer':
        _paymentMethod = 'sepa_bank_transfer';
        break;
      case 'applePay':
        _paymentMethod = 'mobile_wallet';
        break;
      default:
        _paymentMethod = undefined;
        break;
    }

    const requestData = {
      currencyAbbreviation: coin.toLowerCase(),
      baseCurrencyAmount: offers.moonpay.fiatAmount,
      // extraFeePercentage: 0, // min: 0 max: 10. If not provided, will use the default value set to our account.
      baseCurrencyCode: offers.moonpay.fiatCurrency.toLowerCase(),
      paymentMethod: _paymentMethod,
      areFeesIncluded: true,
      env: moonpayEnv,
    };

    selectedWallet
      .moonpayGetQuote(requestData)
      .then(data => {
        if (data?.baseCurrencyAmount) {
          offers.moonpay.amountLimits = {
            min: data.baseCurrency.minBuyAmount,
            max: data.baseCurrency.maxBuyAmount,
          };

          if (
            (offers.moonpay.amountLimits.min &&
              offers.moonpay.fiatAmount < offers.moonpay.amountLimits.min) ||
            (offers.moonpay.amountLimits.max &&
              offers.moonpay.fiatAmount > offers.moonpay.amountLimits.max)
          ) {
            offers.moonpay.outOfLimitMsg = t(
              'There are no Moonpay offers available, as the current purchase limits for this exchange must be between and',
              {
                min: offers.moonpay.amountLimits.min,
                max: offers.moonpay.amountLimits.max,
                fiatCurrency: offers.moonpay.fiatCurrency,
              },
            );
            setFinishedMoonpay(!finishedMoonpay);
            return;
          } else {
            offers.moonpay.outOfLimitMsg = undefined;
            offers.moonpay.errorMsg = undefined;
            offers.moonpay.quoteData = data;
            offers.moonpay.amountCost = data.totalAmount;
            offers.moonpay.buyAmount = data.baseCurrencyAmount;
            offers.moonpay.fee =
              Number(data.totalAmount) - Number(data.baseCurrencyAmount);

            const precision = dispatch(GetPrecision(coin, chain));
            if (offers.moonpay.buyAmount && coin && precision) {
              offers.moonpay.fiatMoney = Number(
                offers.moonpay.buyAmount / data.quoteCurrencyAmount,
              ).toFixed(precision!.unitDecimals);
            } else {
              logger.error(
                `Moonpay error: Could not get precision for ${coin}`,
              );
            }
            offers.moonpay.amountReceiving =
              data.quoteCurrencyAmount.toString();
            logger.debug('Moonpay getting quote: SUCCESS');
            setFinishedMoonpay(!finishedMoonpay);
          }
        } else {
          if (!data) {
            logger.error('Moonpay error: No data received');
          }
          if (data.message && typeof data.message === 'string') {
            logger.error('Moonpay error: ' + data.message);
          }
          if (data.error && typeof data.error === 'string') {
            logger.error('Moonpay error: ' + data.error);
          }
          if (data.errors) {
            logger.error(data.errors);
          }
          let err = t("Can't get rates at this moment. Please try again later");
          const reason = 'moonpayGetQuote Error. Necessary data not included.';
          showMoonpayError(err, reason);
        }
      })
      .catch(err => {
        const reason = 'moonpayGetQuote Error';
        showMoonpayError(err, reason);
      });
  };

  const showMoonpayError = (err?: any, reason?: string) => {
    let msg = t('Could not get crypto offer. Please try again later.');
    if (err) {
      if (typeof err === 'string') {
        msg = err;
      } else {
        if (err.error && err.error.error) {
          msg = err.error.error;
        } else if (err.message) {
          msg = err.message;
        }
      }
    }

    logger.error('Moonpay error: ' + msg);

    dispatch(
      logSegmentEvent('track', 'Failed Buy Crypto', {
        exchange: 'moonpay',
        context: 'BuyCryptoOffers',
        reason: reason || 'unknown',
        paymentMethod: paymentMethod.method || '',
        amount: Number(offers.moonpay.fiatAmount) || '',
        coin: coin?.toLowerCase() || '',
        chain: chain?.toLowerCase() || '',
        fiatCurrency: offers.moonpay.fiatCurrency || '',
      }),
    );

    offers.moonpay.errorMsg = msg;
    offers.moonpay.fiatMoney = undefined;
    offers.moonpay.expanded = false;
    setUpdateView(!updateView);
  };

  const getSimplexQuote = (): void => {
    logger.debug('Simplex getting quote');

    offers.simplex.fiatAmount =
      offers.simplex.fiatCurrency === fiatCurrency
        ? amount
        : dispatch(calculateAltFiatToUsd(amount, fiatCurrency)) || amount;

    offers.simplex.amountLimits = dispatch(
      getBuyCryptoFiatLimits('simplex', offers.simplex.fiatCurrency),
    );

    if (
      (offers.simplex.amountLimits.min &&
        offers.simplex.fiatAmount < offers.simplex.amountLimits.min) ||
      (offers.simplex.amountLimits.max &&
        offers.simplex.fiatAmount > offers.simplex.amountLimits.max)
    ) {
      offers.simplex.outOfLimitMsg = t(
        'There are no Simplex offers available, as the current purchase limits for this exchange must be between and',
        {
          min: offers.simplex.amountLimits.min,
          max: offers.simplex.amountLimits.max,
          fiatCurrency: offers.simplex.fiatCurrency,
        },
      );
      setFinishedSimplex(!finishedSimplex);
      return;
    } else {
      const requestData: SimplexGetQuoteRequestData = {
        digital_currency: getSimplexCoinFormat(coin, selectedWallet.chain),
        fiat_currency: offers.simplex.fiatCurrency.toUpperCase(),
        requested_currency: offers.simplex.fiatCurrency.toUpperCase(),
        requested_amount: offers.simplex.fiatAmount,
        end_user_id: selectedWallet.id,
        env: simplexEnv,
      };

      if (paymentMethod.method === 'sepaBankTransfer') {
        requestData.payment_methods = ['simplex_account'];
      }

      selectedWallet
        .simplexGetQuote(requestData)
        .then(data => {
          if (data && data.quote_id) {
            offers.simplex.outOfLimitMsg = undefined;
            offers.simplex.errorMsg = undefined;
            offers.simplex.quoteData = data;
            offers.simplex.amountCost = data.fiat_money.total_amount;
            offers.simplex.buyAmount = data.fiat_money.base_amount;
            offers.simplex.fee =
              data.fiat_money.total_amount - data.fiat_money.base_amount;

            const precision = dispatch(GetPrecision(coin, chain));
            if (offers.simplex.buyAmount && coin && precision) {
              offers.simplex.fiatMoney = Number(
                offers.simplex.buyAmount / data.digital_money.amount,
              ).toFixed(precision!.unitDecimals);
            } else {
              logger.error(
                `Simplex error: Could not get precision for ${coin}`,
              );
            }
            offers.simplex.amountReceiving =
              data.digital_money.amount.toString();
            logger.debug('Simplex getting quote: SUCCESS');
            setFinishedSimplex(!finishedSimplex);
          } else {
            if (data.message && typeof data.message === 'string') {
              logger.error('Simplex error: ' + data.message);
            }
            if (data.error && typeof data.error === 'string') {
              logger.error('Simplex error: ' + data.error);
            }
            if (data.errors) {
              logger.error(data.errors);
            }
            let err = t(
              "Can't get rates at this moment. Please try again later",
            );
            const reason = 'simplexGetQuote Error. "quote_id" not included.';
            showSimplexError(err, reason);
          }
        })
        .catch((err: any) => {
          const reason = 'simplexGetQuote Error';
          showSimplexError(err, reason);
        });
    }
  };

  const showSimplexError = (err?: any, reason?: string) => {
    let msg = t('Could not get crypto offer. Please try again later.');
    if (err) {
      if (typeof err === 'string') {
        msg = err;
      } else {
        if (err.error && err.error.error) {
          msg = err.error.error;
        } else if (err.message) {
          msg = err.message;
        }
      }
    }

    logger.error('Simplex error: ' + msg);

    dispatch(
      logSegmentEvent('track', 'Failed Buy Crypto', {
        exchange: 'simplex',
        context: 'BuyCryptoOffers',
        reason: reason || 'unknown',
        paymentMethod: paymentMethod.method || '',
        amount: Number(offers.simplex.fiatAmount) || '',
        coin: coin?.toLowerCase() || '',
        chain: chain?.toLowerCase() || '',
        fiatCurrency: offers.simplex.fiatCurrency || '',
      }),
    );

    offers.simplex.errorMsg = msg;
    offers.simplex.fiatMoney = undefined;
    offers.simplex.expanded = false;
    setUpdateView(!updateView);
  };

  const getWyreQuote = async () => {
    logger.debug('Wyre getting quote');

    offers.wyre.fiatAmount =
      offers.wyre.fiatCurrency === fiatCurrency
        ? amount
        : dispatch(calculateAltFiatToUsd(amount, fiatCurrency)) || amount;

    offers.wyre.amountLimits = dispatch(
      getBuyCryptoFiatLimits('wyre', offers.wyre.fiatCurrency),
    );

    if (
      (offers.wyre.amountLimits.min &&
        offers.wyre.fiatAmount < offers.wyre.amountLimits.min) ||
      (offers.wyre.amountLimits.max &&
        offers.wyre.fiatAmount > offers.wyre.amountLimits.max)
    ) {
      offers.wyre.outOfLimitMsg = t(
        'There are no Wyre offers available, as the current purchase limits for this exchange must be between and',
        {
          min: offers.wyre.amountLimits.min,
          max: offers.wyre.amountLimits.max,
          fiatCurrency: offers.wyre.fiatCurrency,
        },
      );
    } else {
      let address: string = '';
      try {
        address = (await dispatch<any>(
          createWalletAddress({wallet: selectedWallet, newAddress: false}),
        )) as string;
      } catch (err) {
        console.error(err);
        const reason = 'createWalletAddress Error';
        showWyreError(err, reason);
      }

      const dest = setPrefix(
        address,
        selectedWallet.chain,
        selectedWallet.network,
      );

      let walletType: string;
      switch (paymentMethod.method) {
        case 'applePay':
          walletType = 'APPLE_PAY';
          break;
        default:
          walletType = 'DEBIT_CARD';
          break;
      }

      const requestData = {
        sourceAmount: offers.wyre.fiatAmount.toString(),
        sourceCurrency: offers.wyre.fiatCurrency.toUpperCase(),
        destCurrency: getWyreCoinFormat(coin, selectedWallet.chain),
        dest,
        country,
        amountIncludeFees: true, // If amountIncludeFees is true, use sourceAmount instead of amount
        walletType,
        env: wyreEnv,
      };

      selectedWallet
        .wyreWalletOrderQuotation(requestData)
        .then(data => {
          if (data && (data.exceptionId || data.error)) {
            const reason = 'wyreWalletOrderQuotation Error';
            showWyreError(data, reason);
            return;
          }

          offers.wyre.amountCost = data.sourceAmount; // sourceAmount = Total amount (including fees)
          offers.wyre.buyAmount = data.sourceAmountWithoutFees;
          offers.wyre.fee = data.sourceAmount - data.sourceAmountWithoutFees;

          if (offers.wyre.fee < 0) {
            const err =
              t('Wyre has returned a wrong value for the fee. Fee: ') +
              offers.wyre.fee;
            const reason = 'Fee not included';
            showWyreError(err, reason);
            return;
          }

          offers.wyre.fiatMoney =
            offers.wyre.buyAmount && data.destAmount
              ? Number(offers.wyre.buyAmount / data.destAmount).toFixed(8)
              : undefined;

          offers.wyre.amountReceiving = data.destAmount.toFixed(8);

          logger.debug('Wyre getting quote: SUCCESS');
          setFinishedWyre(!finishedWyre);
        })
        .catch((err: any) => {
          const reason = 'wyreWalletOrderQuotation Error';
          showWyreError(err, reason);
        });
    }
  };

  const showWyreError = (err?: any, reason?: string) => {
    let msg = t('Could not get crypto offer. Please try again later.');
    if (err) {
      if (typeof err === 'string') {
        msg = err;
      } else if (err.exceptionId && err.message) {
        logger.error('Wyre error: ' + err.message);
        if (err.errorCode) {
          switch (err.errorCode) {
            case 'validation.unsupportedCountry':
              msg = t('Country not supported: ') + country;
              break;
            default:
              msg = err.message;
              break;
          }
        } else {
          msg = err.message;
        }
      }
    }

    dispatch(
      logSegmentEvent('track', 'Failed Buy Crypto', {
        exchange: 'wyre',
        context: 'BuyCryptoOffers',
        reason: reason || 'unknown',
        paymentMethod: paymentMethod.method || '',
        amount: Number(offers.wyre.fiatAmount) || '',
        coin: coin?.toLowerCase() || '',
        chain: chain?.toLowerCase() || '',
        fiatCurrency: offers.wyre.fiatCurrency || '',
      }),
    );

    logger.error('Crypto offer error: ' + msg);
    offers.wyre.errorMsg = msg;
    offers.wyre.fiatMoney = undefined;
    offers.wyre.expanded = false;
    setUpdateView(!updateView);
  };

  const setPrefix = (
    address: string,
    chain: string,
    network: 'livenet' | 'testnet',
  ): string => {
    const prefix =
      BitpaySupportedCoins[chain].paymentInfo.protocolPrefix[network];
    const addr = `${prefix}:${address}`;
    return addr;
  };

  const goTo = (key: string): void => {
    switch (key) {
      case 'moonpay':
        goToMoonpayBuyPage();
        break;

      case 'simplex':
        goToSimplexBuyPage();
        break;

      case 'wyre':
        goToWyreBuyPage();
        break;
    }
  };

  const goToMoonpayBuyPage = () => {
    if (offers.moonpay.errorMsg || offers.moonpay.outOfLimitMsg) {
      return;
    }
    continueToMoonpay();
  };

  const continueToMoonpay = async () => {
    let address: string = '';
    try {
      address = (await dispatch<any>(
        createWalletAddress({wallet: selectedWallet, newAddress: false}),
      )) as string;
    } catch (err) {
      console.error(err);
      const reason = 'createWalletAddress Error';
      showMoonpayError(err, reason);
    }

    const destinationChain = selectedWallet.chain;
    const externalTransactionId = `${selectedWallet.id}-${Date.now()}`;

    const newData: MoonpayPaymentData = {
      address,
      created_on: Date.now(),
      crypto_amount: Number(offers.moonpay.amountReceiving),
      chain: destinationChain,
      coin: coin.toUpperCase(),
      env: __DEV__ ? 'dev' : 'prod',
      fiat_base_amount: offers.moonpay.buyAmount!,
      fiat_total_amount: offers.moonpay.amountCost!,
      fiat_total_amount_currency: offers.moonpay.fiatCurrency,
      external_id: externalTransactionId,
      status: 'paymentRequestSent',
      user_id: selectedWallet.id,
    };

    dispatch(
      BuyCryptoActions.successPaymentRequestMoonpay({
        moonpayPaymentData: newData,
      }),
    );

    dispatch(
      logSegmentEvent('track', 'Requested Crypto Purchase', {
        exchange: 'moonpay',
        fiatAmount: offers.moonpay.fiatAmount,
        fiatCurrency: offers.moonpay.fiatCurrency,
        paymentMethod: paymentMethod.method,
        coin: selectedWallet.currencyAbbreviation.toLowerCase(),
        chain: destinationChain?.toLowerCase(),
      }),
    );

    const quoteData = {
      currencyCode: coin.toLowerCase(),
      walletAddress: address,
      baseCurrencyCode: offers.moonpay.fiatCurrency.toLowerCase(),
      baseCurrencyAmount: offers.moonpay.fiatAmount,
      externalTransactionId,
      redirectURL:
        APP_DEEPLINK_PREFIX + `moonpay?externalId=${externalTransactionId}`,
      env: moonpayEnv,
      lockAmount: true,
      showWalletAddressForm: true,
    };

    let data;
    try {
      data = await selectedWallet.moonpayGetSignedPaymentUrl(quoteData);
    } catch (err) {
      const reason = 'createWalletAddress Error';
      showMoonpayError(err, reason);
      return;
    }

    dispatch(openUrlWithInAppBrowser(data.urlWithSignature));
    await sleep(500);
    navigation.goBack();
  };

  const goToSimplexBuyPage = () => {
    if (offers.simplex.errorMsg || offers.simplex.outOfLimitMsg) {
      return;
    }
    continueToSimplex();
  };

  const continueToSimplex = async () => {
    let address: string = '';
    try {
      address = (await dispatch<any>(
        createWalletAddress({wallet: selectedWallet, newAddress: false}),
      )) as string;
    } catch (err) {
      console.error(err);
      const reason = 'createWalletAddress Error';
      showSimplexError(err, reason);
    }

    const quoteData = {
      quoteId: offers.simplex.quoteData.quote_id,
      currency: offers.simplex.fiatCurrency,
      fiatTotalAmount: offers.simplex.quoteData.fiat_money.total_amount,
      cryptoAmount: offers.simplex.quoteData.digital_money.amount,
    };

    simplexPaymentRequest(selectedWallet, address, quoteData, createdOn)
      .then(async req => {
        if (req && req.error) {
          const reason = 'simplexPaymentRequest Error';
          showSimplexError(req.error, reason);
          return;
        }

        logger.debug('Simplex creating payment request: SUCCESS');

        const remoteData: any = {
          address,
          api_host: req.api_host,
          app_provider_id: req.app_provider_id,
          order_id: req.order_id,
          payment_id: req.payment_id,
        };

        const destinationChain = selectedWallet.chain;

        const newData: SimplexPaymentData = {
          address,
          created_on: Date.now(),
          crypto_amount: offers.simplex.quoteData.digital_money.amount,
          chain: destinationChain,
          coin: coin.toUpperCase(),
          env: __DEV__ ? 'dev' : 'prod',
          fiat_base_amount: offers.simplex.quoteData.fiat_money.base_amount,
          fiat_total_amount: offers.simplex.quoteData.fiat_money.total_amount,
          fiat_total_amount_currency: offers.simplex.fiatCurrency,
          order_id: req.order_id,
          payment_id: req.payment_id,
          status: 'paymentRequestSent',
          user_id: selectedWallet.id,
        };

        dispatch(
          BuyCryptoActions.successPaymentRequestSimplex({
            simplexPaymentData: newData,
          }),
        );

        dispatch(
          logSegmentEvent('track', 'Requested Crypto Purchase', {
            exchange: 'simplex',
            fiatAmount: offers.simplex.fiatAmount,
            fiatCurrency: offers.simplex.fiatCurrency,
            paymentMethod: paymentMethod.method,
            coin: selectedWallet.currencyAbbreviation.toLowerCase(),
            chain: destinationChain?.toLowerCase(),
          }),
        );

        const paymentUrl: string = getPaymentUrl(
          selectedWallet,
          quoteData,
          remoteData,
          destinationChain,
        );

        dispatch(openUrlWithInAppBrowser(paymentUrl));
        await sleep(500);
        navigation.goBack();
      })
      .catch(err => {
        const reason = 'simplexPaymentRequest Error';
        showSimplexError(err, reason);
      });
  };

  const goToWyreBuyPage = async () => {
    let address: string = '';
    try {
      address = (await dispatch<any>(
        createWalletAddress({wallet: selectedWallet, newAddress: false}),
      )) as string;
    } catch (err) {
      console.error(err);
      const reason = 'createWalletAddress Error';
      showWyreError(err, reason);
    }
    let _paymentMethod: string;
    switch (paymentMethod.method) {
      case 'applePay':
        _paymentMethod = 'apple-pay';
        break;
      default:
        _paymentMethod = 'debit-card';
        break;
    }
    const destinationChain = selectedWallet.chain;
    const redirectUrl =
      APP_DEEPLINK_PREFIX +
      'wyre?walletId=' +
      selectedWallet.id +
      '&destAmount=' +
      offers.wyre.amountReceiving +
      '&destChain=' +
      destinationChain;
    const failureRedirectUrl = APP_DEEPLINK_PREFIX + 'wyreError';
    const dest = setPrefix(
      address,
      selectedWallet.chain,
      selectedWallet.network,
    );
    const requestData = {
      sourceAmount: offers.wyre.fiatAmount.toString(),
      dest,
      destCurrency: getWyreCoinFormat(coin, destinationChain),
      lockFields: ['dest', 'destCurrency', 'country'],
      paymentMethod: _paymentMethod,
      sourceCurrency: offers.wyre.fiatCurrency.toUpperCase(),
      country,
      amountIncludeFees: true, // If amountIncludeFees is true, use sourceAmount instead of amount
      redirectUrl,
      failureRedirectUrl,
      env: wyreEnv,
    };

    selectedWallet
      .wyreWalletOrderReservation(requestData)
      .then((data: any) => {
        if (data && (data.exceptionId || data.error)) {
          const reason = 'wyreWalletOrderReservation Error';
          showWyreError(data, reason);
          return;
        }

        const {url} = data;
        continueToWyre(url);
      })
      .catch((err: any) => {
        const reason = 'wyreWalletOrderReservation Error';
        showWyreError(err, reason);
      });
  };

  const continueToWyre = async (paymentUrl: string) => {
    const destinationChain = selectedWallet.chain;
    dispatch(
      logSegmentEvent('track', 'Requested Crypto Purchase', {
        exchange: 'wyre',
        fiatAmount: offers.wyre.fiatAmount,
        fiatCurrency: offers.wyre.fiatCurrency,
        paymentMethod: paymentMethod.method,
        coin: selectedWallet.currencyAbbreviation.toLowerCase(),
        chain: destinationChain?.toLowerCase(),
      }),
    );
    dispatch(openUrlWithInAppBrowser(paymentUrl));
    await sleep(500);
    navigation.goBack();
  };

  const expandCard = (offer: CryptoOffer) => {
    const key = offer.key;
    if (!offer.fiatMoney) {
      return;
    }
    if (offers[key]) {
      offers[key].expanded = offers[key].expanded ? false : true;
    }
    setUpdateView(!updateView);
  };

  useEffect(() => {
    if (offers.moonpay.showOffer) {
      getMoonpayQuote();
    }
    if (offers.simplex.showOffer) {
      getSimplexQuote();
    }
    if (offers.wyre.showOffer) {
      getWyreQuote();
    }
  }, []);

  useEffect(() => {
    setOffers(offers);
  }, [finishedMoonpay, finishedSimplex, finishedWyre, updateView]);

  return (
    <ScrollView>
      <SummaryRow>
        <SummaryItemContainer>
          <SummaryTitle>{t('Amount')}</SummaryTitle>
          <SummaryData>
            {formatFiatAmount(Number(amount), fiatCurrency, {
              customPrecision: 'minimal',
            })}
          </SummaryData>
        </SummaryItemContainer>
        <SummaryItemContainer>
          <SummaryTitle>{t('Crypto')}</SummaryTitle>
          <CoinContainer>
            <CoinIconContainer>
              <CurrencyImage
                img={selectedWallet.img}
                badgeUri={getBadgeImg(
                  getCurrencyAbbreviation(
                    selectedWallet.currencyAbbreviation,
                    selectedWallet.chain,
                  ),
                  selectedWallet.chain,
                )}
                size={20}
              />
            </CoinIconContainer>
            <SummaryData>{coin.toUpperCase()}</SummaryData>
          </CoinContainer>
        </SummaryItemContainer>
        <SummaryItemContainer>
          <SummaryTitle>{t('Payment Type')}</SummaryTitle>
          <SummaryData>{paymentMethod.label}</SummaryData>
        </SummaryItemContainer>
        <SummaryCtaContainer>
          <Button
            buttonStyle={'secondary'}
            buttonType={'pill'}
            buttonOutline={true}
            onPress={() => {
              navigation.goBack();
            }}>
            Edit
          </Button>
        </SummaryCtaContainer>
      </SummaryRow>

      {Object.values(offers)
        .sort(
          (a, b) =>
            parseFloat(b.amountReceiving || '0') -
            parseFloat(a.amountReceiving || '0'),
        )
        .map(offer => {
          return offer.showOffer ? (
            <BuyCryptoExpandibleCard
              key={offer.key}
              onPress={() => {
                expandCard(offer);
              }}>
              {!offer.fiatMoney && !offer.errorMsg && !offer.outOfLimitMsg ? (
                <SpinnerContainer>
                  <ActivityIndicator color={ProgressBlue} />
                </SpinnerContainer>
              ) : null}
              {!offer.fiatMoney && offer.outOfLimitMsg ? (
                <OfferDataContainer>
                  <OfferDataInfoLabel>{offer.outOfLimitMsg}</OfferDataInfoLabel>
                </OfferDataContainer>
              ) : null}
              {!offer.fiatMoney && offer.errorMsg ? (
                <OfferDataContainer>
                  <OfferDataInfoLabel>
                    {t('Error: ') + offer.errorMsg}
                  </OfferDataInfoLabel>
                </OfferDataContainer>
              ) : null}
              <OfferRow>
                <OfferDataContainer>
                  {offer.fiatMoney &&
                  !offer.errorMsg &&
                  !offer.outOfLimitMsg ? (
                    <>
                      <OfferDataCryptoAmount>
                        {offer.amountReceiving} {coin.toUpperCase()}
                      </OfferDataCryptoAmount>
                      <OfferDataRate>
                        1 {coin.toUpperCase()} ={' '}
                        {formatFiatAmount(
                          Number(offer.fiatMoney),
                          offer.fiatCurrency,
                          {
                            customPrecision: undefined,
                            currencyAbbreviation: coin,
                          },
                        )}
                      </OfferDataRate>
                      {offer.fiatCurrency !== fiatCurrency ? (
                        <OfferDataWarningContainer>
                          <OfferDataWarningMsg>
                            {t(
                              "This exchange doesn't support purchases with , tap 'Buy' to continue paying in .",
                              {
                                altFiatCurrency: fiatCurrency,
                                availableFiatCurrency: offer.fiatCurrency,
                              },
                            )}
                          </OfferDataWarningMsg>
                        </OfferDataWarningContainer>
                      ) : null}
                    </>
                  ) : null}
                  <OfferDataInfoContainer>
                    <OfferDataInfoLabel>{t('Provided By')}</OfferDataInfoLabel>
                    {offer.logo}
                  </OfferDataInfoContainer>
                </OfferDataContainer>
                {offer.fiatMoney ? (
                  <SummaryCtaContainer>
                    <Button
                      action={true}
                      buttonType={'pill'}
                      onPress={() => {
                        haptic('impactLight');
                        goTo(offer.key);
                      }}>
                      {t('Buy')}
                    </Button>
                  </SummaryCtaContainer>
                ) : null}
              </OfferRow>

              {offer.expanded ? (
                <>
                  <ItemDivisor style={{marginTop: 20}} />
                  <OfferExpandibleItem>
                    <OfferDataInfoLabel>{t('Buy Amount')}</OfferDataInfoLabel>
                    <OfferDataRightContainer>
                      <OfferDataInfoText>
                        {formatFiatAmount(
                          Number(offer.buyAmount),
                          offer.fiatCurrency,
                        )}
                      </OfferDataInfoText>
                      <OfferDataInfoTextSec>
                        {Number(offer.amountReceiving).toFixed(6)}{' '}
                        {coin.toUpperCase()}
                      </OfferDataInfoTextSec>
                    </OfferDataRightContainer>
                  </OfferExpandibleItem>
                  <ItemDivisor />
                  <OfferExpandibleItem>
                    <OfferDataInfoLabel>{t('Fee')}</OfferDataInfoLabel>
                    <OfferDataInfoText>
                      {formatFiatAmount(Number(offer.fee), offer.fiatCurrency)}
                    </OfferDataInfoText>
                  </OfferExpandibleItem>
                  <ItemDivisor />
                  <OfferExpandibleItem>
                    <OfferDataInfoTotal>{t('TOTAL')}</OfferDataInfoTotal>
                    <OfferDataInfoTotal>
                      {formatFiatAmount(
                        Number(offer.amountCost),
                        offer.fiatCurrency,
                        {customPrecision: 'minimal'},
                      )}
                    </OfferDataInfoTotal>
                  </OfferExpandibleItem>
                  {offer.key == 'moonpay' ? (
                    <MoonpayTerms
                      paymentMethod={paymentMethod}
                      country={country}
                    />
                  ) : null}
                  {offer.key == 'simplex' ? (
                    <SimplexTerms paymentMethod={paymentMethod} />
                  ) : null}
                  {offer.key == 'wyre' ? (
                    <WyreTerms
                      country={country}
                      fiatCurrency={offer.fiatCurrency}
                    />
                  ) : null}
                </>
              ) : null}
            </BuyCryptoExpandibleCard>
          ) : null;
        })}

      <TermsContainer>
        <TermsText>
          {t(
            'The final crypto amount you receive when the transaction is complete may differ because it is based on the exchange rates of the providers.',
          )}
        </TermsText>
        <TermsText>{t('Additional third-party fees may apply.')}</TermsText>
      </TermsContainer>
    </ScrollView>
  );
};

export default BuyCryptoOffers;
