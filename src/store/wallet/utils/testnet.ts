import {createSelector} from 'reselect';
import type {AppSelector, RootState} from '../..';
import {Network} from '../../../constants';
import type {Key} from '../wallet.models';

type NetworkCarrier = {network?: string; credentials?: {network?: string}};

/** Testnet and regtest wallets: anything that is not mainnet. */
export const isTestnetWallet = (wallet?: NetworkCarrier): boolean => {
  const network = wallet?.network ?? wallet?.credentials?.network;
  return !!network && network !== Network.mainnet;
};

export const hasTestnetWallets = (
  keys: {[key in string]: Pick<Key, 'wallets'> | undefined} | undefined,
): boolean =>
  Object.values(keys ?? {}).some(key =>
    (key?.wallets ?? []).some(isTestnetWallet),
  );

const selectShowTestnetWalletsSetting: AppSelector<boolean | null> = ({
  WALLET,
}) => WALLET?.showTestnetWallets ?? null;

const selectOwnsTestnetWallets = createSelector(
  [(state: RootState) => state.WALLET?.keys],
  keys => hasTestnetWallets(keys),
);

/**
 * Whether testnet wallets and testnet options are shown.
 * - Test Mode (Settings > Theme) runs the whole app on testnet, so it always
 *   shows them.
 * - Until the user picks a value, people who already own testnet wallets keep
 *   seeing them, so the upgrade does not make wallets disappear.
 */
export const selectShowTestnetWallets: AppSelector<boolean> = state => {
  if (state.APP?.network && state.APP.network !== Network.mainnet) {
    return true;
  }
  const setting = selectShowTestnetWalletsSetting(state);
  return setting ?? selectOwnsTestnetWallets(state);
};

/** Whether the testnet toggle is visible in Settings > Crypto. */
export const selectTestnetModeUnlocked: AppSelector<boolean> = state =>
  selectShowTestnetWalletsSetting(state) !== null ||
  selectOwnsTestnetWallets(state);

/** Drops testnet wallets from a list unless testnet mode is on. */
export const filterTestnetWallets = <T extends NetworkCarrier>(
  wallets: T[],
  showTestnetWallets: boolean = testnetWalletsVisible,
): T[] =>
  showTestnetWallets ? wallets : wallets.filter(w => !isTestnetWallet(w));

/**
 * A key whose wallets are all testnet disappears with them. Keys without any
 * wallets yet (just created) stay visible.
 */
export const isKeyVisibleForTestnetMode = (
  key: Pick<Key, 'wallets'> | undefined,
  showTestnetWallets: boolean = testnetWalletsVisible,
): boolean =>
  showTestnetWallets ||
  !key?.wallets?.length ||
  key.wallets.some(w => !isTestnetWallet(w));

/**
 * Chains an account holds on one network. An EVM or Solana account can hold
 * the same chain on mainnet and on testnet (same address), so "does the account
 * have every chain" has to be answered per network.
 */
export const getAccountChainsOnNetwork = (
  wallets: Array<{chain: string; network?: string}>,
  network: string,
): string[] => [
  ...new Set(wallets.filter(w => w.network === network).map(w => w.chain)),
];

/*
 * Mirror of selectShowTestnetWallets for the plain list helpers
 * (isWalletVisibleForKey, buildAccountList, ...) that run outside React and
 * have no access to the store. The store keeps it current through
 * syncTestnetWalletsVisibility, which runs before subscribers re-render.
 */
let testnetWalletsVisible = false;

export const areTestnetWalletsVisible = (): boolean => testnetWalletsVisible;

/** True for a testnet wallet while testnet mode is off. */
export const isHiddenByTestnetMode = (wallet?: NetworkCarrier): boolean =>
  !testnetWalletsVisible && isTestnetWallet(wallet);

export const syncTestnetWalletsVisibility = (state: RootState): void => {
  testnetWalletsVisible = selectShowTestnetWallets(state);
};
