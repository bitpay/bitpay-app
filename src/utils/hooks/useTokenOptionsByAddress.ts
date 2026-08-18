import {useMemo} from 'react';
import {useAppSelector} from './useAppSelector';
import {useTokenContext} from '../../contexts/TokenContext';
import {BitpaySupportedTokenOptsByAddress} from '../../constants/tokens';
import {Token} from '../../store/wallet/wallet.models';

/**
 * The merged token map every token-resolving screen needs: static BitPay
 * tokens, the 1inch lists held in TokenContext, and the user's custom tokens
 * from the store.
 *
 * Previously each call site built this inline *inside* `useAppSelector`:
 *
 *   useAppSelector(({WALLET}) => ({
 *     ...BitpaySupportedTokenOptsByAddress,
 *     ...tokenOptionsByAddress,
 *     ...WALLET.customTokenOptionsByAddress,
 *   }))
 *
 * `useSelector` runs on every store dispatch, so that spread a multi-thousand
 * key object on every dispatch, for every mounted instance — and because the
 * result was always a fresh reference the equality check could never bail, so
 * the component re-rendered on every dispatch too. On 1,500-1,900 line screens
 * (KeyOverview, AccountDetails) and per-row components (ContactIcon,
 * MultipleOutputsTx) that dominated render cost during balance/portfolio sync.
 *
 * Selecting only the custom-token map (a stable reference that changes just when
 * the user adds a token) and merging in `useMemo` keeps the identity stable
 * until the inputs genuinely change.
 */
export const useTokenOptionsByAddress = (): {[key in string]: Token} => {
  const {tokenOptionsByAddress} = useTokenContext();
  const customTokenOptionsByAddress = useAppSelector(
    ({WALLET}) => WALLET.customTokenOptionsByAddress,
  );

  return useMemo(
    () => ({
      ...BitpaySupportedTokenOptsByAddress,
      ...tokenOptionsByAddress,
      ...customTokenOptionsByAddress,
    }),
    [tokenOptionsByAddress, customTokenOptionsByAddress],
  );
};
