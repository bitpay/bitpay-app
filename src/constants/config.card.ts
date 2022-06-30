import React from 'react';
import * as Svg from 'react-native-svg';
import {VirtualDesignCurrency} from '../store/card/card.types';
import BCHShape from '../navigation/card/assets/currency-shapes/BCH-shape.svg';
import BitPayBShape from '../navigation/card/assets/currency-shapes/bitpay-b-shape.svg';
import BTCShape from '../navigation/card/assets/currency-shapes/BTC-shape.svg';
import BUSDShape from '../navigation/card/assets/currency-shapes/BUSD-shape.svg';
import DAIShape from '../navigation/card/assets/currency-shapes/DAI-shape.svg';
import DOGEShape from '../navigation/card/assets/currency-shapes/DOGE-shape.svg';
import ETHShape from '../navigation/card/assets/currency-shapes/ETH-shape.svg';
import GUSDShape from '../navigation/card/assets/currency-shapes/GUSD-shape.svg';
import USDPShape from '../navigation/card/assets/currency-shapes/USDP-shape.svg';
import USDCShape from '../navigation/card/assets/currency-shapes/USDC-shape.svg';
import XRPShape from '../navigation/card/assets/currency-shapes/XRP-shape.svg';
import {Card, Transaction} from '../store/card/card.models';
import {CardProvider} from './card';

type ProviderConfigType = {
  [k in CardProvider]: {
    /**
     * Whether to display cards from this provider in the app. If false, any cards fetched from this provider will not be persisted in the store.
     */
    displayInApp: boolean;
    /**
     * The year BitPay started using this provider. Used as a max date range to fetch transactions.
     */
    programStartYear: number;
    /**
     * Maximum number of days ago that we can query for transaction history.
     */
    maxHistoryDateRange: number;
    /**
     * Whether or not cards from this provider are part of the same account and should be grouped together.
     */
    groupEnabled: boolean;
    virtualDesignSupport: boolean;
    filters: {
      /**
       * Filter function to determine whether or not a settled transaction should be displayed.
       */
      settledTx: (tx: Transaction) => boolean;
    };
    activation: {
      isRequired: (card: Card) => boolean;
      fields: {
        cardNumber?: boolean;
        cvv?: boolean;
        expirationDate?: boolean;
        lastFourDigits?: boolean;
      };
    };
  };
};

export const CARD_HEIGHT = 204;
export const CARD_WIDTH = 324;

export const ProviderConfig: ProviderConfigType = {
  galileo: {
    displayInApp: true,
    programStartYear: 2020,
    maxHistoryDateRange: 1095,
    groupEnabled: true,
    virtualDesignSupport: true,
    filters: {
      settledTx: tx => {
        /**
         * Types we never want to show
         *
         * For reference:
         * Always show [PM, SE] // PM = Payment, SE = Mastercard Credit Settlement
         * Probably show [FE] // FE = Fee
         */
        const TX_TYPE_BLACKLIST: {[k: string]: boolean} = {
          AU: true, // Authorization (ie. pending)
          BD: true, // Mastercard Debit Backout
          BK: true, // ??? Undocumented, but showed up during a "cancellation of [a] pre-auth hold at the gas pump". Probably another kind of backout?
          BO: true, // Mastercard Credit Backout
          BV: true, // Visa Authorization Backout
          DA: true, // ??? Seems to be non-financial (eg. balance inquiry)
          DB: true, // Debit Authorization
          DD: true, // ???
          EX: true, // Expired Credit Authorization
          PB: true, // Pre-auth Backout
          VI: true, // Visa Authorization (interesting...)
        };

        return !TX_TYPE_BLACKLIST[tx.type];
      },
    },
    activation: {
      isRequired: card => {
        if (!card) {
          return false;
        }

        return !card.activationDate && card.status !== 'active';
      },
      fields: {
        cvv: true,
        expirationDate: true,
        lastFourDigits: true,
      },
    },
  },
  firstView: {
    displayInApp: false,
    programStartYear: 2016,
    maxHistoryDateRange: 30,
    groupEnabled: false,
    virtualDesignSupport: false,
    filters: {
      settledTx: () => {
        return true;
      },
    },
    activation: {
      isRequired: () => {
        return false;
      },
      fields: {
        cardNumber: true,
        cvv: true,
        expirationDate: true,
      },
    },
  },
};

type SupportedDesignCurrenciesConfig = {
  [k in VirtualDesignCurrency]: {
    currency: k;
    enabled: boolean;
    reason?: string;
    palette: {
      BackgroundShape: React.FC<Svg.SvgProps>;
      stopColor1: `#${string}`;
      stopColor2: `#${string}`;
      pillColor: `#${string}`;
      pillBackground: `#${string}`;
      pillCircleBackground: `#${string}`;
    };
  };
};

export const SUPPORTED_DESIGN_CURRENCIES: SupportedDesignCurrenciesConfig = {
  'bitpay-b': {
    currency: 'bitpay-b',
    enabled: true,
    palette: {
      BackgroundShape: BitPayBShape,
      stopColor1: '#1A3B8B',
      stopColor2: '#1A3B8B',
      pillColor: '#FFF',
      pillBackground: '#3C4E9E',
      pillCircleBackground: '#FFF',
    },
  },
  BTC: {
    currency: 'BTC',
    enabled: true,
    palette: {
      BackgroundShape: BTCShape,
      stopColor1: '#F7931A',
      stopColor2: '#A25F0E',
      pillColor: '#FFF',
      pillBackground: '#B66400',
      pillCircleBackground: '#FFF',
    },
  },
  BCH: {
    currency: 'BCH',
    enabled: true,
    palette: {
      BackgroundShape: BCHShape,
      stopColor1: '#2FCF6E',
      stopColor2: '#0C6630',
      pillColor: '#FFF',
      pillBackground: '#20924F',
      pillCircleBackground: '#FFF',
    },
  },
  ETH: {
    currency: 'ETH',
    enabled: true,
    palette: {
      BackgroundShape: ETHShape,
      stopColor1: '#9A9FF1',
      stopColor2: '#575DC2',
      pillColor: '#FFF',
      pillBackground: '#595FC6',
      pillCircleBackground: '#FFF',
    },
  },
  GUSD: {
    currency: 'GUSD',
    enabled: true,
    palette: {
      BackgroundShape: GUSDShape,
      stopColor1: '#00DFFE',
      stopColor2: '#006F7E',
      pillColor: '#FFF',
      pillBackground: '#007B8C',
      pillCircleBackground: '#FFF',
    },
  },
  USDP: {
    currency: 'USDP',
    enabled: true,
    palette: {
      BackgroundShape: USDPShape,
      stopColor1: '#B3D234',
      stopColor2: '#00845D',
      pillColor: '#FFF',
      pillBackground: '#2BA023',
      pillCircleBackground: '#FFF',
    },
  },
  BUSD: {
    currency: 'BUSD',
    enabled: true,
    palette: {
      BackgroundShape: BUSDShape,
      stopColor1: '#F3BA2D',
      stopColor2: '#936903',
      pillColor: '#FFF',
      pillBackground: '#A47708',
      pillCircleBackground: '#FFF',
    },
  },
  USDC: {
    currency: 'USDC',
    enabled: true,
    palette: {
      BackgroundShape: USDCShape,
      stopColor1: '#2775CA',
      stopColor2: '#03366D',
      pillColor: '#FFF',
      pillBackground: '#024085',
      pillCircleBackground: '#FFF',
    },
  },
  XRP: {
    currency: 'XRP',
    enabled: false,
    reason: 'usaRestricted',
    palette: {
      BackgroundShape: XRPShape,
      stopColor1: '#4D4D4D',
      stopColor2: '#000',
      pillColor: '#FFF',
      pillBackground: '#3F3F3F',
      pillCircleBackground: '#FFF',
    },
  },
  DOGE: {
    currency: 'DOGE',
    enabled: true,
    palette: {
      BackgroundShape: DOGEShape,
      stopColor1: '#E5C66B',
      stopColor2: '#80641B',
      pillColor: '#5C4731',
      pillBackground: '#F1DBA0',
      pillCircleBackground: '#000',
    },
  },
  DAI: {
    currency: 'DAI',
    enabled: true,
    palette: {
      BackgroundShape: DAIShape,
      stopColor1: '#F5AC37',
      stopColor2: '#895605',
      pillColor: '#FFF',
      pillBackground: '#A36A10',
      pillCircleBackground: '#FFF',
    },
  },
  WBTC: {
    currency: 'WBTC',
    enabled: true,
    palette: {
      BackgroundShape: BitPayBShape,
      stopColor1: '#1A3B8B',
      stopColor2: '#1A3B8B',
      pillColor: '#FFF',
      pillBackground: '#3C4E9E',
      pillCircleBackground: '#FFF',
    },
  },
};
