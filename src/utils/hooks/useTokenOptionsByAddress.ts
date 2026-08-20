import {useMemo} from 'react';
import {useAppSelector} from './useAppSelector';
import {useTokenContext} from '../../contexts/TokenContext';
import {BitpaySupportedTokenOptsByAddress} from '../../constants/tokens';
import {Token} from '../../store/wallet/wallet.models';

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
