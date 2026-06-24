import type {WalletCredentials} from './types';

export type PortfolioRuntimeWalletCredentials = {
  walletId?: string;
  copayerId?: string;
  chain?: string;
  network?: string;
  coin?: string;
  token?: {
    address?: string;
    symbol?: string;
    decimals?: number;
  };
  tokenAddress?: string;
  receiveAddress?: string;
  multisigEthInfo?: {
    multisigContractAddress?: string;
  };
  multisigContractAddress?: string;
};

function toOptionalString(value: unknown): string | undefined {
  'worklet';

  const normalized = String(value || '').trim();
  return normalized || undefined;
}

function copyStringField(target: any, key: string, value: unknown): void {
  'worklet';

  const normalized = toOptionalString(value);
  if (normalized) {
    target[key] = normalized;
  }
}

export function toPortfolioRuntimeWalletCredentials(
  credentials: WalletCredentials | null | undefined,
): PortfolioRuntimeWalletCredentials {
  'worklet';

  const source = (credentials || {}) as WalletCredentials;
  const out: PortfolioRuntimeWalletCredentials = {};

  copyStringField(out, 'walletId', source.walletId);
  copyStringField(out, 'copayerId', source.copayerId);
  copyStringField(out, 'chain', source.chain);
  copyStringField(out, 'network', source.network);
  copyStringField(out, 'coin', source.coin);
  copyStringField(out, 'tokenAddress', source.tokenAddress);
  copyStringField(out, 'receiveAddress', source.receiveAddress);
  copyStringField(
    out,
    'multisigContractAddress',
    source.multisigContractAddress,
  );

  const sourceToken =
    source.token && typeof source.token === 'object'
      ? (source.token as Record<string, unknown>)
      : undefined;
  if (sourceToken) {
    const token: NonNullable<PortfolioRuntimeWalletCredentials['token']> = {};
    copyStringField(token, 'address', sourceToken.address);
    copyStringField(token, 'symbol', sourceToken.symbol);
    if (typeof sourceToken.decimals === 'number') {
      token.decimals = sourceToken.decimals;
    }
    if (Object.keys(token).length) {
      out.token = token;
    }
  }

  const sourceMultisigEthInfo =
    source.multisigEthInfo && typeof source.multisigEthInfo === 'object'
      ? (source.multisigEthInfo as Record<string, unknown>)
      : undefined;
  if (sourceMultisigEthInfo) {
    const multisigEthInfo: NonNullable<
      PortfolioRuntimeWalletCredentials['multisigEthInfo']
    > = {};
    copyStringField(
      multisigEthInfo,
      'multisigContractAddress',
      sourceMultisigEthInfo.multisigContractAddress,
    );
    if (Object.keys(multisigEthInfo).length) {
      out.multisigEthInfo = multisigEthInfo;
    }
  }

  return out;
}
