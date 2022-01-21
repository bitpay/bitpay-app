import React, {useEffect, useState} from 'react';
import {ActivityIndicator, ScrollView, Linking} from 'react-native';
import styled from 'styled-components/native';
import Button from '../../../../components/button/Button';
import {useLogger} from '../../../../utils/hooks/useLogger';
import {RouteProp, useRoute} from '@react-navigation/native';
import {BaseText} from '../../../../components/styled/Text';
import {SupportedCurrencyOptions} from '../../../../constants/SupportedCurrencyOptions';
import {BuyCryptoExpandibleCard, ItemDivisor} from '../styled/BuyCryptoCard';
import {useNavigation} from '@react-navigation/native';
import {SlateDark, ProgressBlue} from '../../../../styles/colors';
import {getPrecision} from '../../../../utils/helper-methods';
import {
  getPaymentUrl,
  simplexFiatAmountLimits,
  simplexPaymentRequest,
} from '../utils/simplex-utils';
import {wyreFiatAmountLimits} from '../utils/wyre-utils';
import {useSelector} from 'react-redux';
import {RootState} from '../../../../store';

// Images
import SimplexLogo from '../../../../../assets/img/services/simplex/logo-simplex-color.svg';
import WyreLogo from '../../../../../assets/img/services/wyre/logo-wyre.svg';

export interface BuyCryptoOffersProps {
  amount: number;
  fiatCurrency: string;
  coin: string;
  country: string;
  selectedWallet: any;
  paymentMethod: any;
}

export type CryptoOffer = {
  key: string;
  showOffer: boolean;
  logoLight: JSX.Element;
  logoDark: JSX.Element;
  expanded: boolean;
  amountCost?: number;
  buyAmount?: number;
  fee?: number;
  fiatMoney?: string; // Rate without fees
  amountReceiving?: string;
  amountLimits?: any;
  errorMsg?: string;
  quoteData?: any; // Simplex
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
  justify-content: space-between;
  align-items: center;
  height: 50px;
`;

const SummaryTitle = styled(BaseText)`
  color: ${SlateDark};
  font-size: 14px;
  margin-bottom: 5px;
`;

const SummaryData = styled(BaseText)`
  color: #000000;
  font-weight: 500;
  font-size: 16px;
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

const OfferDataCryptoAmount = styled(BaseText)`
  font-weight: 500;
  font-size: 18px;
  line-height: 20px;
  color: black;
`;

const OfferDataRate = styled(BaseText)`
  font-size: 14px;
  color: ${SlateDark};
  font-weight: 400;
`;

const OfferDataInfoContainer = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const OfferDataInfoLabel = styled(BaseText)`
  font-size: 14px;
  color: ${SlateDark};
  font-weight: 400;
  margin-right: 10px;
`;

const OfferDataInfoText = styled(BaseText)`
  font-size: 16px;
  color: ${SlateDark};
`;

const OfferDataInfoTextSec = styled(BaseText)`
  font-size: 14px;
  color: ${SlateDark};
  margin-top: 10px;
`;

const OfferDataInfoTotal = styled(BaseText)`
  font-size: 18px;
  color: ${SlateDark};
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

const TermsContainer = styled.View`
  padding: 0 20px;
  margin-top: 20px;
  margin-bottom: 40px;
`;

const ExchangeTermsContainer = styled.View`
  padding: 0;
`;

const TermsText = styled(BaseText)`
  font-size: 13px;
  line-height: 20px;
  color: ${SlateDark};
`;

const ExchangeTermsText = styled(BaseText)`
  font-size: 11px;
  line-height: 20px;
  color: #757575;
`;

const offersDefault: {
  simplex: CryptoOffer;
  wyre: CryptoOffer;
} = {
  simplex: {
    key: 'simplex',
    amountReceiving: '0',
    showOffer: true, // TODO: check isPaymentMethodSupported
    logoLight: <SimplexLogo width={70} height={40} />,
    logoDark: <SimplexLogo width={70} height={40} />,
    expanded: false,
    fiatMoney: undefined,
    errorMsg: undefined,
    outOfLimitMsg: undefined,
  },
  wyre: {
    key: 'wyre',
    amountReceiving: '0',
    showOffer: true, // TODO: check isPaymentMethodSupported
    logoLight: <WyreLogo width={70} height={40} />,
    logoDark: <WyreLogo width={70} height={40} />,
    expanded: false,
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
      country,
      selectedWallet,
      paymentMethod,
    },
  } = useRoute<RouteProp<{params: BuyCryptoOffersProps}>>();

  const logger = useLogger();
  const navigation = useNavigation();
  const [offers, setOffers] = useState(offersDefault);
  const [finishedSimplex, setFinishedSimplex] = useState(false);
  const [finishedWyre, setFinishedWyre] = useState(false);
  const [updateView, setUpdateView] = useState(false);

  const createdOn = useSelector(({WALLET}: RootState) => WALLET.createdOn);

  const getSimplexQuote = (): void => {
    logger.debug('Simplex getting quote');

    offers.simplex.amountLimits = simplexFiatAmountLimits;

    if (
      amount < offers.simplex.amountLimits.min ||
      amount > offers.simplex.amountLimits.max
    ) {
      offers.simplex.outOfLimitMsg = `There are no Simplex offers available, as the current purchase limits for this exchange must be between ${offers.simplex.amountLimits.min} ${fiatCurrency} and ${offers.simplex.amountLimits.max} ${fiatCurrency}`;
      setFinishedSimplex(!finishedSimplex);
      return;
    } else {
      let paymentMethodArray: string[] = [];
      switch (paymentMethod.method) {
        case 'sepaBankTransfer':
          paymentMethodArray.push('simplex_account');
          break;
        default:
          paymentMethodArray.push('credit_card');
          break;
      }
      const requestData = {
        digital_currency: coin.toUpperCase(),
        fiat_currency: fiatCurrency.toUpperCase(),
        requested_currency: fiatCurrency.toUpperCase(),
        requested_amount: amount,
        end_user_id: selectedWallet.id,
        payment_methods: paymentMethodArray,
        env: 'sandbox', // TODO: send the correct environment: sandbox/production
      };

      selectedWallet
        .simplexGetQuote(requestData)
        .then((data: any) => {
          if (data && data.quote_id) {
            offers.simplex.outOfLimitMsg = undefined;
            offers.simplex.errorMsg = undefined;
            offers.simplex.quoteData = data;
            offers.simplex.amountCost = data.fiat_money.total_amount;
            offers.simplex.buyAmount = data.fiat_money.base_amount;
            offers.simplex.fee =
              data.fiat_money.total_amount - data.fiat_money.base_amount;

            if (offers.simplex.buyAmount && coin && getPrecision(coin)) {
              offers.simplex.fiatMoney = Number(
                offers.simplex.buyAmount / data.digital_money.amount,
              ).toFixed(getPrecision(coin).unitDecimals);
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
            let err = "Can't get rates at this moment. Please try again later";
            showSimplexError(err);
          }
        })
        .catch((err: any) => {
          console.log('Simplex getting quote: FAILED', err);
        });
    }
  };

  const showSimplexError = (err?: any) => {
    let msg = 'Could not get crypto offer. Please, try again later.';
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

    offers.simplex.errorMsg = msg;
    setUpdateView(!updateView);
  };

  const getWyreQuote = (): void => {
    // TODO: wyre
    logger.debug('Wyre getting quote');

    offers.wyre.amountLimits = wyreFiatAmountLimits;

    if (
      amount < offers.wyre.amountLimits.min ||
      amount > offers.wyre.amountLimits.max
    ) {
      offers.wyre.outOfLimitMsg = `There are no Wyre offers available, as the current purchase limits for this exchange must be between ${offers.wyre.amountLimits.min} ${fiatCurrency} and ${offers.wyre.amountLimits.max} ${fiatCurrency}`;
    } else {
      offers.wyre = {
        ...offersDefault.wyre,
        ...{
          buyAmount: 475,
          fee: 25,
          fiatMoney: '38492.70',
          amountReceiving: '0.01234',
          amountCost: 500,
          outOfLimitMsg: undefined,
          errorMsg: undefined,
        },
      };
    }
    setFinishedWyre(!finishedWyre);
  };

  const getAddress = (coin: string): string => {
    // TODO: implement a getAddress function properly

    switch (coin.toLowerCase()) {
      case 'btc':
        return '1CVuVALD6Zo7ms24n3iUXv162kvUzsHr69';
      case 'bch':
        return 'qz8ds306px5n65gffn8u69vvnksfw6huwyjczrvkh3';
      case 'eth':
        return '0x32ed5be73f5c395621287f5cbe1da96caf3c5dec';
      case 'doge':
        return 'D7g9fkUi9VdvPCHQGPSLsVHrsmY2atiH1G';
      case 'ltc':
        return 'ltc1qf7udgl5m62vdml8xjvh0efd7kxfwf4rh5sa4d9';
      case 'xrp':
        return 'rEqj9WKSH7wEkPvWf6b4gCi26Y3F7HbKUF';

      default:
        return '0x32ed5be73f5c395621287f5cbe1da96caf3c5dec'; // ETH tokens
    }
  };

  const continueToSimplex = (): void => {
    const address = getAddress(coin);
    const quoteData = {
      quoteId: offers.simplex.quoteData.quote_id,
      currency: fiatCurrency,
      fiatTotalAmount: offers.simplex.quoteData.fiat_money.total_amount,
      cryptoAmount: offers.simplex.quoteData.digital_money.amount,
    };

    simplexPaymentRequest(selectedWallet, address, quoteData, createdOn)
      .then(req => {
        if (req && req.error) {
          showSimplexError(req.error);
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

        // const newData = {
        //   address,
        //   created_on: Date.now(),
        //   crypto_amount: offers.simplex.quoteData.digital_money.amount,
        //   coin: coin.toUpperCase(),
        //   fiat_base_amount: offers.simplex.quoteData.fiat_money.base_amount,
        //   fiat_total_amount: offers.simplex.quoteData.fiat_money.total_amount,
        //   fiat_total_amount_currency: fiatCurrency,
        //   order_id: req.order_id,
        //   payment_id: req.payment_id,
        //   status: 'paymentRequestSent',
        //   user_id: selectedWallet.id,
        // };

        const paymentUrl: string = getPaymentUrl(
          selectedWallet,
          quoteData,
          remoteData,
        );

        Linking.openURL(paymentUrl)
          .then(() => {
            navigation.goBack();
          })
          .catch(err => console.error("Couldn't load page", err));
      })
      .catch(err => {
        showSimplexError(err);
      });
  };

  const continueToWyre = (): void => {
    console.log('Continue to Wyre clicked');
  };

  const goTo = (key: string): void => {
    switch (key) {
      case 'simplex':
        continueToSimplex();
        break;

      case 'wyre':
        continueToWyre();
        break;
    }
  };

  const expandCard = (offer: any) => {
    const key: 'simplex' | 'wyre' = offer.key;
    if (!offer.fiatMoney) {
      return;
    }
    if (offers[key]) {
      offers[key].expanded = offers[key].expanded ? false : true;
    }
    setUpdateView(!updateView);
  };

  useEffect(() => {
    if (offers.simplex.showOffer) {
      getSimplexQuote();
    }
    if (offers.wyre.showOffer) {
      getWyreQuote();
    }
  }, []);

  useEffect(() => {
    setOffers(offers);
  }, [finishedSimplex, finishedWyre, updateView]);

  return (
    <ScrollView>
      <SummaryRow>
        <SummaryItemContainer>
          <SummaryTitle>Amount</SummaryTitle>
          <SummaryData>${amount}</SummaryData>
        </SummaryItemContainer>
        <SummaryItemContainer>
          <SummaryTitle>Crypto</SummaryTitle>
          <CoinContainer>
            <CoinIconContainer>
              {SupportedCurrencyOptions.find(wallet => wallet.id == coin)?.img}
            </CoinIconContainer>
            <SummaryData>{coin.toUpperCase()}</SummaryData>
          </CoinContainer>
        </SummaryItemContainer>
        <SummaryItemContainer>
          <SummaryTitle>Payment Type</SummaryTitle>
          <SummaryData>{paymentMethod.label}</SummaryData>
        </SummaryItemContainer>
        <SummaryCtaContainer>
          <Button
            buttonStyle={'secondary'}
            buttonType={'pill'}
            onPress={() => {
              navigation.goBack();
            }}>
            Edit
          </Button>
        </SummaryCtaContainer>
      </SummaryRow>

      {Object.values(offers).map(offer => {
        return (
          <BuyCryptoExpandibleCard
            key={offer.key}
            onPress={() => {
              expandCard(offer);
            }}>
            {!offer.fiatMoney && !offer.errorMsg && !offer.outOfLimitMsg && (
              <CoinContainer>
                <ActivityIndicator color={ProgressBlue} />
              </CoinContainer>
            )}
            {!offer.fiatMoney && offer.outOfLimitMsg && (
              <OfferDataContainer>
                <OfferDataInfoLabel>{offer.outOfLimitMsg}</OfferDataInfoLabel>
              </OfferDataContainer>
            )}
            {!offer.fiatMoney && offer.errorMsg && (
              <OfferDataContainer>
                <OfferDataInfoLabel>Error: {offer.errorMsg}</OfferDataInfoLabel>
              </OfferDataContainer>
            )}
            <OfferRow>
              <OfferDataContainer>
                {offer.fiatMoney && !offer.errorMsg && !offer.outOfLimitMsg && (
                  <>
                    <OfferDataCryptoAmount>
                      {offer.amountReceiving} {coin.toUpperCase()}
                    </OfferDataCryptoAmount>
                    <OfferDataRate>
                      1 {coin.toUpperCase()} = ${offer.fiatMoney}
                    </OfferDataRate>
                  </>
                )}
                <OfferDataInfoContainer>
                  <OfferDataInfoLabel>Provided By</OfferDataInfoLabel>
                  {offer && offer.logoLight}
                </OfferDataInfoContainer>
              </OfferDataContainer>
              {offer.fiatMoney && (
                <SummaryCtaContainer>
                  <Button
                    buttonType={'pill'}
                    onPress={() => {
                      goTo(offer.key);
                    }}>
                    Buy
                  </Button>
                </SummaryCtaContainer>
              )}
            </OfferRow>

            {offer.expanded && (
              <>
                <ItemDivisor />
                <OfferExpandibleItem>
                  <OfferDataInfoLabel>Buy Amount</OfferDataInfoLabel>
                  <OfferDataRightContainer>
                    <OfferDataInfoText>
                      {offer.buyAmount} {fiatCurrency}
                    </OfferDataInfoText>
                    <OfferDataInfoTextSec>
                      {offer.amountReceiving} {coin.toUpperCase()}
                    </OfferDataInfoTextSec>
                  </OfferDataRightContainer>
                </OfferExpandibleItem>
                <ItemDivisor />
                <OfferExpandibleItem>
                  <OfferDataInfoLabel>Fee</OfferDataInfoLabel>
                  <OfferDataInfoText>
                    {offer.fee} {fiatCurrency}
                  </OfferDataInfoText>
                </OfferExpandibleItem>
                <ItemDivisor />
                <OfferExpandibleItem>
                  <OfferDataInfoTotal>TOTAL</OfferDataInfoTotal>
                  <OfferDataInfoTotal>
                    {offer.amountCost} {fiatCurrency}
                  </OfferDataInfoTotal>
                </OfferExpandibleItem>
                {offer.key == 'simplex' && (
                  <ExchangeTermsContainer>
                    <ExchangeTermsText>
                      What service fees am I paying?
                    </ExchangeTermsText>
                    {paymentMethod.method == 'sepaBankTransfer' && (
                      <ExchangeTermsText>1.5% of the amount.</ExchangeTermsText>
                    )}
                    {paymentMethod.method != 'sepaBankTransfer' && (
                      <ExchangeTermsText>
                        Can range from 2.5% to 5% of the transaction, depending
                        on the volume of traffic (with a minimum of 10 USD or
                        its equivalent in any other fiat currency) + 1% of the
                        transaction. Read more
                      </ExchangeTermsText>
                    )}
                    <ExchangeTermsText>
                      This service is provided by a third party, and you are
                      subject to their Terms of use
                    </ExchangeTermsText>
                  </ExchangeTermsContainer>
                )}
                {offer.key == 'wyre' && (
                  <ExchangeTermsContainer>
                    <ExchangeTermsText>
                      What service fees am I paying?
                    </ExchangeTermsText>
                    {country == 'US' && (
                      <ExchangeTermsText>
                        5 USD minimum fee or 2.9% of the amount + 0.30 USD,
                        whichever is greater + Required miners fee.
                      </ExchangeTermsText>
                    )}
                    {country != 'US' && (
                      <ExchangeTermsText>
                        5 USD minimum fee or 3.9% of the amount + 0.30 USD,
                        whichever is greater + Required miners fee.
                      </ExchangeTermsText>
                    )}
                    {fiatCurrency.toUpperCase() != 'USD' && (
                      <ExchangeTermsText>
                        Or its equivalent in {fiatCurrency.toUpperCase()}.
                      </ExchangeTermsText>
                    )}
                    <ExchangeTermsText>Read more</ExchangeTermsText>
                    <ExchangeTermsText>
                      This service is provided by a third party, and you are
                      subject to their Terms of use
                    </ExchangeTermsText>
                  </ExchangeTermsContainer>
                )}
              </>
            )}
          </BuyCryptoExpandibleCard>
        );
      })}

      <TermsContainer>
        <TermsText>
          The final crypto amount you receive when the transaction is complete
          may differ because it is based on the exchange rates of the providers.
        </TermsText>
        <TermsText>Additional third-party fees may apply.</TermsText>
      </TermsContainer>
    </ScrollView>
  );
};

export default BuyCryptoOffers;
