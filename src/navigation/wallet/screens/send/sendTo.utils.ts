import {useEffect, useMemo, useRef} from 'react';
import {debounce} from '../../../../utils/debounce';
import type {Network} from '../../../../constants';
import type {Key} from '../../../../store/wallet/wallet.models';
import type {Rates} from '../../../../store/rate/rate.models';
import {
  buildAccountList,
  buildKeyWalletRowsFromAccountList,
} from '../../../../store/wallet/utils/wallet';
import type {AppDispatch} from '../../../../utils/hooks';
import type {KeyWalletsRowProps} from '../../../../components/list/KeyWalletsRow';
import type {ContactRowProps} from '../../../../components/list/ContactRow';
import type {ReceivingAddress} from '../../../../store/bitpay-id/bitpay-id.models';
import type {Effect} from '../../../../store';
import type {Wallet} from '../../../../store/wallet/wallet.models';
import type {GlobalSelectParamList} from '../GlobalSelect';
import {ToCashAddress} from '../../../../store/wallet/effects/address/address';
import {IsEVMChain, IsSVMChain} from '../../../../store/wallet/utils/currency';
import {
  IsBitPayInvoiceWebUrl,
  IsValidSolanaPay,
  ValidDataTypes,
  ValidateCoinAddress,
  ValidateURI,
} from '../../../../store/wallet/utils/validations';
import {BitPayIdEffects} from '../../../../store/bitpay-id';
import {getCurrencyCodeFromCoinAndChain} from '../../../bitpay-id/utils/bitpay-id-utils';

const SENDABLE_DATA_TYPES = ['PayPro', 'InvoiceUri', ...ValidDataTypes];

type SendToKeyAccountLogger = {
  error: (message: string) => void;
};

export const BuildKeyAccountRow = (
  keys: Record<string, Key>,
  currentWalletId: string,
  currentCurrencyAbbreviation: string,
  currentChain: string,
  currentNetwork: Network,
  defaultAltCurrencyIsoCode: string,
  searchInput: string,
  rates: Rates,
  dispatch: AppDispatch,
  logger: SendToKeyAccountLogger,
): KeyWalletsRowProps[] =>
  Object.entries(keys)
    .map(([key, value]): KeyWalletsRowProps | undefined => {
      try {
        const accountList = buildAccountList(
          value,
          defaultAltCurrencyIsoCode,
          rates,
          dispatch,
          {
            filterByHideWallet: true,
            filterByWalletOptions: true,
            network: currentNetwork,
            chain: currentChain,
            currencyAbbreviation: currentCurrencyAbbreviation,
            walletId: currentWalletId,
            searchInput,
          },
        );

        const {accounts, mergedUtxoAndEvmAccounts} =
          buildKeyWalletRowsFromAccountList(
            accountList,
            defaultAltCurrencyIsoCode,
          );

        return {
          key,
          keyName: value.keyName || 'My Key',
          backupComplete: value.backupComplete,
          accounts,
          mergedUtxoAndEvmAccounts,
        };
      } catch (err) {
        const errStr = err instanceof Error ? err.message : JSON.stringify(err);
        logger.error(`Error while building key account row: ${errStr}`);
        return undefined;
      }
    })
    .filter((row): row is KeyWalletsRowProps => !!row);

type UseSendToKeyAccountsArgs = {
  keys: Record<string, Key>;
  currentWalletId: string;
  currentCurrencyAbbreviation: string;
  currentChain: string;
  currentNetwork: Network;
  defaultAltCurrencyIsoCode: string;
  searchInput: string;
  rates: Rates;
  dispatch: AppDispatch;
  logger: SendToKeyAccountLogger;
};

export const useSendToKeyAccounts = ({
  keys,
  currentWalletId,
  currentCurrencyAbbreviation,
  currentChain,
  currentNetwork,
  defaultAltCurrencyIsoCode,
  searchInput,
  rates,
  dispatch,
  logger,
}: UseSendToKeyAccountsArgs): KeyWalletsRowProps[] =>
  useMemo(
    () =>
      BuildKeyAccountRow(
        keys,
        currentWalletId,
        currentCurrencyAbbreviation,
        currentChain,
        currentNetwork,
        defaultAltCurrencyIsoCode,
        searchInput,
        rates,
        dispatch,
        logger,
      ),
    [
      currentChain,
      currentCurrencyAbbreviation,
      currentNetwork,
      currentWalletId,
      defaultAltCurrencyIsoCode,
      dispatch,
      keys,
      logger,
      rates,
      searchInput,
    ],
  );

export const getContactSendRecipient = (
  contact: ContactRowProps,
): NonNullable<GlobalSelectParamList['recipient']> => ({
  name: contact.name,
  address:
    contact.coin === 'bch'
      ? ToCashAddress(contact.address, false)
      : contact.address,
  currency: contact.coin,
  chain: contact.chain,
  network: contact.network,
  destinationTag: contact.tag || contact.destinationTag,
  opts: {
    showEVMWalletsAndTokens: IsEVMChain(contact.chain),
    showSVMWalletsAndTokens: IsSVMChain(contact.chain),
  },
});

export const findEmailReceivingAddress = (
  receivingAddresses: ReceivingAddress[],
  currencyAbbreviation: string,
  chain: string,
): ReceivingAddress | undefined =>
  receivingAddresses.find(
    ({coin, chain: addressChain}) =>
      currencyAbbreviation.toLowerCase() === coin.toLowerCase() &&
      chain.toLowerCase() === addressChain.toLowerCase(),
  );

export const getEmailRecipientAddress =
  (email: string, wallet: Wallet): Effect<Promise<string | undefined>> =>
  async dispatch => {
    const receivingAddresses = await dispatch(
      BitPayIdEffects.startFetchReceivingAddresses({
        email,
        currency: getCurrencyCodeFromCoinAndChain(
          wallet.currencyAbbreviation,
          wallet.chain,
        ),
      }),
    ).catch(() => []);
    const address = findEmailReceivingAddress(
      receivingAddresses,
      wallet.currencyAbbreviation,
      wallet.chain,
    )?.address;
    return address && ValidateCoinAddress(address, wallet.chain, wallet.network)
      ? address
      : undefined;
  };

export const isSendableData = (data: string): boolean =>
  IsBitPayInvoiceWebUrl(data) ||
  IsValidSolanaPay(data) ||
  SENDABLE_DATA_TYPES.includes(ValidateURI(data)?.type);

export const useDebouncedSendToValidation = (
  validate: (text: string) => void,
  wait = 300,
) => {
  // React Compiler opt-out: this hook deliberately keeps the latest `validate`
  // in a ref (written during render) and hands a ref-reading closure to
  // lodash.debounce inside useMemo so the debounced function stays stable
  // across renders while always calling the newest validator. The compiler
  // cannot prove debounce() does not call the closure during render, so it
  // rejects every equivalent formulation; keep the existing semantics.
  'use no memo';
  const validateRef = useRef(validate);
  // eslint-disable-next-line react-hooks/refs -- see 'use no memo' above
  validateRef.current = validate;

  const debouncedValidate = useMemo(
    // eslint-disable-next-line react-hooks/refs -- see 'use no memo' above
    () => debounce((text: string) => validateRef.current(text), wait),
    [wait],
  );

  useEffect(
    () => () => {
      debouncedValidate.cancel();
    },
    [debouncedValidate],
  );

  return debouncedValidate;
};
