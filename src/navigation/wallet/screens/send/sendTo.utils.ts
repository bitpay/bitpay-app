import {useEffect, useMemo, useRef} from 'react';
import debounce from 'lodash.debounce';
import type {Network} from '../../../../constants';
import type {Key} from '../../../../store/wallet/wallet.models';
import type {Rates} from '../../../../store/rate/rate.models';
import {
  buildAccountList,
  buildKeyWalletRowsFromAccountList,
} from '../../../../store/wallet/utils/wallet';
import type {AppDispatch} from '../../../../utils/hooks';
import type {KeyWalletsRowProps} from '../../../../components/list/KeyWalletsRow';

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

export const useDebouncedSendToValidation = (
  validate: (text: string) => void,
  wait = 300,
) => {
  const validateRef = useRef(validate);
  validateRef.current = validate;

  const debouncedValidate = useMemo(
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
