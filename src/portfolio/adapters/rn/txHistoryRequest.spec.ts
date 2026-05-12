import {
  PORTFOLIO_BWS_CLIENT_VERSION_HEADER,
  appendPortfolioTxHistoryCacheBustParam,
  buildPortfolioTxHistoryRequestPath,
} from './txHistoryRequest';
import {version as bitcoreWalletClientVersion} from '@bitpay-labs/bitcore-wallet-client/package.json';

describe('PORTFOLIO_BWS_CLIENT_VERSION_HEADER', () => {
  it('matches the installed BWC package version in BWS-compatible format', () => {
    expect(PORTFOLIO_BWS_CLIENT_VERSION_HEADER).toBe(
      `bwc-${bitcoreWalletClientVersion}`,
    );
    expect(PORTFOLIO_BWS_CLIENT_VERSION_HEADER).toMatch(/^bwc-\d+\.\d+\.\d+$/);
  });
});

describe('buildPortfolioTxHistoryRequestPath', () => {
  it('adds tokenAddress, reverse=1, and multisig params for oldest-first paging', () => {
    const requestPath = buildPortfolioTxHistoryRequestPath({
      credentials: {
        token: {address: '0xToken'},
        multisigEthInfo: {multisigContractAddress: '0xSafe'},
      },
      skip: 0,
      limit: 1000,
      reverse: true,
    });

    expect(requestPath).toBe(
      '/v1/txhistory/?limit=1000&reverse=1&tokenAddress=0xToken&multisigContractAddress=0xSafe',
    );
  });

  it('appends tokenAddress for token wallets', () => {
    const requestPath = buildPortfolioTxHistoryRequestPath({
      credentials: {
        token: {
          address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        },
      } as any,
      skip: 0,
      limit: 1000,
      reverse: true,
    });

    expect(requestPath).toBe(
      '/v1/txhistory/?limit=1000&reverse=1&tokenAddress=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    );
  });

  it('omits reverse when newest-first paging is requested', () => {
    const requestPath = buildPortfolioTxHistoryRequestPath({
      credentials: {},
      skip: 25,
      limit: 200,
      reverse: false,
    });

    expect(requestPath).toBe('/v1/txhistory/?skip=25&limit=200');
  });
});

describe('appendPortfolioTxHistoryCacheBustParam', () => {
  it('appends r to a txhistory path with existing query params', () => {
    expect(
      appendPortfolioTxHistoryCacheBustParam(
        '/v1/txhistory/?limit=1000&reverse=1',
        37786,
      ),
    ).toBe('/v1/txhistory/?limit=1000&reverse=1&r=37786');
  });

  it('appends r to a txhistory path without existing query params', () => {
    expect(
      appendPortfolioTxHistoryCacheBustParam('/v1/txhistory/', 75511),
    ).toBe('/v1/txhistory/?r=75511');
  });
});
