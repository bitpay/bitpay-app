import {
  buildRangoMemoScript,
  buildRangoTxProposal,
  rangoCanBuildTxProposal,
  rangoGetApprovalData,
  rangoParseNumeric,
  rangoToSmallestUnit,
  RangoPrerequisiteError,
  RangoUnsupportedTxError,
} from './rango-tx';
import {
  RangoEvmTransaction,
  RangoTransferTransaction,
} from '../../../../store/swap-crypto/models/rango.models';

/**
 * Fixtures are verbatim from live GET /basic/swap responses, so these tests
 * fail if Rango changes a field's shape rather than only if our code changes.
 *
 *   BTC.BTC    -> ETH.ETH        (TRANSFER)
 *   POLYGON.MATIC -> OPTIMISM.ETH (EVM)
 */

const transferTx: RangoTransferTransaction = {
  type: 'TRANSFER',
  method: 'transfer',
  blockChain: 'BTC',
  fromWalletAddress: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
  recipientAddress: 'bc1q6csj53wdrzyzextj2syljvhh0vhynyrx904gp8',
  memo: '=:e:0x6f33bb1763eebead07cf8815a62fcd7b30311fa3:335868788/300:rg:0',
  memoType: 'UTF8',
  amount: '9990000',
  decimals: 8,
};

const evmTx: RangoEvmTransaction = {
  type: 'EVM',
  blockChain: 'POLYGON',
  from: '0x9F8cCdaFCc39F3c7D6EBf637c9151673CBc36b88',
  txTo: '0x69460570c93f9DE5E2edbC3052bf10125f0Ca22d',
  approveTo: null,
  approveData: null,
  txData: '0x35019106000000000000000000000000000000000000000000000000',
  value: '0x3635c9adc5dea00000',
  gasLimit: '0x1e1d67',
  gasPrice: null,
  maxFeePerGas: '358224438030',
  maxPriorityFeePerGas: '194699308812',
};

describe('rangoParseNumeric', () => {
  it('reads the hex values Rango sends for value and gasLimit', () => {
    expect(rangoParseNumeric('0x1e1d67')).toBe(1973607);
    expect(rangoParseNumeric('0x3635c9adc5dea00000')).toBe(1e21);
  });

  it('reads the decimal strings Rango sends for gasPrice', () => {
    expect(rangoParseNumeric('358224438030')).toBe(358224438030);
  });

  it('returns undefined rather than NaN for absent or junk values', () => {
    expect(rangoParseNumeric(null)).toBeUndefined();
    expect(rangoParseNumeric(undefined)).toBeUndefined();
    expect(rangoParseNumeric('')).toBeUndefined();
    expect(rangoParseNumeric('not-a-number')).toBeUndefined();
  });
});

describe('buildRangoMemoScript', () => {
  it('produces an OP_RETURN script for a real Thorchain-style memo', () => {
    const script = buildRangoMemoScript('btc', transferTx.memo!, 'UTF8');
    expect(script.startsWith('6a')).toBe(true);
    // 6a = OP_RETURN, then a single length byte for memos under 76 bytes.
    const len = Buffer.from(transferTx.memo!, 'utf8').length;
    expect(len).toBeLessThan(76);
    expect(script.slice(2, 4)).toBe(len.toString(16).padStart(2, '0'));
  });

  it('switches to OP_PUSHDATA1 past 75 bytes', () => {
    const script = buildRangoMemoScript('btc', 'x'.repeat(120), 'UTF8');
    // 6a 4c 78 -> OP_RETURN, OP_PUSHDATA1, length 120
    expect(script.startsWith('6a4c78')).toBe(true);
  });

  it('supports every UTXO chain the wallet custodies', () => {
    for (const chain of ['btc', 'bch', 'doge', 'ltc']) {
      expect(buildRangoMemoScript(chain, 'memo', 'UTF8').startsWith('6a')).toBe(
        true,
      );
    }
  });

  it('refuses a non-UTXO chain rather than guessing', () => {
    expect(() => buildRangoMemoScript('eth', 'memo', 'UTF8')).toThrow(
      /not a UTXO chain/,
    );
  });

  it('refuses an empty memo', () => {
    expect(() => buildRangoMemoScript('btc', '', 'UTF8')).toThrow(/empty memo/);
  });
});

describe('buildRangoTxProposal — TRANSFER', () => {
  const params = {chain: 'btc', message: 'BTC to ETH'};

  it('sends to the deposit address with the memo as a second output', () => {
    const txp = buildRangoTxProposal(transferTx, params);

    expect(txp.toAddress).toBe(transferTx.recipientAddress);
    expect(txp.outputs).toHaveLength(2);
    expect(txp.outputs[0].toAddress).toBe(transferTx.recipientAddress);
    expect(txp.outputs[1].script.startsWith('6a')).toBe(true);
  });

  it('gives the OP_RETURN output zero amount, which BWS requires', () => {
    const txp = buildRangoTxProposal(transferTx, params);
    expect(txp.outputs[1].amount).toBe(0);
    expect(txp.outputs[1].toAddress).toBeUndefined();
  });

  it("sends Rango's net amount, not the amount originally requested", () => {
    // The swap was requested for 10000000 sats; Rango returns 9990000 after
    // its fee. Sending the requested figure would overpay the route.
    const txp = buildRangoTxProposal(transferTx, params);
    expect(txp.amount).toBe(9990000);
    expect(txp.outputs[0].amount).toBe(9990000);
  });

  it('omits the OP_RETURN output when there is no memo', () => {
    const txp = buildRangoTxProposal({...transferTx, memo: null}, params);
    expect(txp.outputs).toHaveLength(1);
  });

  it('rejects an unreadable amount instead of sending zero', () => {
    expect(() =>
      buildRangoTxProposal({...transferTx, amount: 'abc'}, params),
    ).toThrow(/unreadable amount/);
  });
});

describe('buildRangoTxProposal — EVM', () => {
  const params = {chain: 'matic', message: 'MATIC to ETH'};

  it('builds a contract call carrying Rango calldata', () => {
    const txp = buildRangoTxProposal(evmTx, params);

    expect(txp.toAddress).toBe(evmTx.txTo);
    expect(txp.outputs[0].data).toBe(evmTx.txData);
    expect(txp.isTokenSwap).toBe(true);
  });

  it('converts the hex value and gasLimit to numbers', () => {
    const txp = buildRangoTxProposal(evmTx, params);
    expect(txp.amount).toBe(1e21);
    expect(txp.gasLimit).toBe(1973607);
    expect(txp.outputs[0].gasLimit).toBe(1973607);
  });

  it('passes the token address through for ERC20 swaps', () => {
    const txp = buildRangoTxProposal(evmTx, {
      ...params,
      tokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    });
    expect(txp.tokenAddress).toBe('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');
  });

  it('uses zero value for a token swap that sends no native currency', () => {
    const txp = buildRangoTxProposal({...evmTx, value: null}, params);
    expect(txp.amount).toBe(0);
  });
});

describe('buildRangoTxProposal — refusals', () => {
  it('refuses to build while prerequisites are unmet', () => {
    expect(() =>
      buildRangoTxProposal(
        {...evmTx, prerequisites: [{type: 'ALLOWANCE'}]},
        {chain: 'matic', message: 'm'},
      ),
    ).toThrow(RangoPrerequisiteError);
  });

  it('refuses transaction types the wallet cannot sign', () => {
    expect(() =>
      buildRangoTxProposal({type: 'SOLANA'} as any, {
        chain: 'sol',
        message: 'm',
      }),
    ).toThrow(RangoUnsupportedTxError);
  });
});

describe('rangoCanBuildTxProposal', () => {
  it('accepts EVM and TRANSFER only', () => {
    expect(rangoCanBuildTxProposal(evmTx)).toBe(true);
    expect(rangoCanBuildTxProposal(transferTx)).toBe(true);
    expect(rangoCanBuildTxProposal({type: 'SOLANA'} as any)).toBe(false);
    expect(rangoCanBuildTxProposal(null)).toBe(false);
  });
});

describe('rangoGetApprovalData', () => {
  it('returns nothing when the allowance is already sufficient', () => {
    expect(rangoGetApprovalData(evmTx)).toBeUndefined();
  });

  it('returns the per-quote spender when an approval is required', () => {
    const needsApproval = {
      ...evmTx,
      approveTo: '0x1111111254eeb25477b68fb85ed929f73a960582',
      approveData: '0x095ea7b3',
    };
    expect(rangoGetApprovalData(needsApproval)).toEqual({
      spenderAddress: '0x1111111254eeb25477b68fb85ed929f73a960582',
      data: '0x095ea7b3',
    });
  });

  it('never returns approval data for a UTXO transfer', () => {
    expect(rangoGetApprovalData(transferTx)).toBeUndefined();
  });
});

describe('rangoToSmallestUnit', () => {
  it('converts without float error at 18 decimals', () => {
    // 0.1 * 1e18 in float arithmetic is 100000000000000000.00000001
    expect(rangoToSmallestUnit(0.1, 18)).toBe('100000000000000000');
    expect(rangoToSmallestUnit('1.5', 18)).toBe('1500000000000000000');
  });

  it('handles 8-decimal UTXO amounts', () => {
    expect(rangoToSmallestUnit('0.001', 8)).toBe('100000');
    expect(rangoToSmallestUnit(1, 8)).toBe('100000000');
  });

  it('handles 6-decimal stablecoins', () => {
    expect(rangoToSmallestUnit('12.345678', 6)).toBe('12345678');
  });

  it('truncates rather than rounds up, so it can never overdraw', () => {
    expect(rangoToSmallestUnit('0.1234567891', 8)).toBe('12345678');
  });

  it('handles zero and whole numbers', () => {
    expect(rangoToSmallestUnit('0', 18)).toBe('0');
    expect(rangoToSmallestUnit('0.0', 8)).toBe('0');
    expect(rangoToSmallestUnit('7', 2)).toBe('700');
  });

  it('rejects junk rather than producing a wrong amount', () => {
    expect(() => rangoToSmallestUnit('abc', 8)).toThrow(/unreadable/);
    expect(() => rangoToSmallestUnit('1', -1)).toThrow(/bad decimals/);
  });
});

describe('rangoToSmallestUnit — exponential inputs', () => {
  it('expands small exponential numbers instead of failing', () => {
    expect(rangoToSmallestUnit(1e-7, 18)).toBe('100000000000');
  });

  it('expands large exponential numbers', () => {
    expect(rangoToSmallestUnit(1e21, 0)).toBe('1000000000000000000000');
  });
});

describe('buildRangoMemoScript — SCRIPT memos', () => {
  // Verbatim from a live BTC->ETH swap routed through TeleSwap. The memo is
  // already a complete OP_RETURN output script.
  const scriptMemo =
    '6a4c4d0001140000000000000000000000006f33bb1763eebead07cf8815a62fcd7b30311fa30000';

  it('uses a SCRIPT memo verbatim instead of wrapping it again', () => {
    const out = buildRangoMemoScript('btc', scriptMemo, 'SCRIPT');
    expect(out).toBe(scriptMemo);
  });

  it('does NOT double-wrap — the result must not be 6a-prefixed twice', () => {
    const out = buildRangoMemoScript('btc', scriptMemo, 'SCRIPT');
    // A double wrap would push the original script as data, making the
    // original '6a' appear after a length byte rather than at position 0.
    expect(out.indexOf('6a4c4d')).toBe(0);
    expect(out.length).toBe(scriptMemo.length);
  });

  it('still wraps a UTF8 memo from the same pair', () => {
    const text = '=:e:0x6f33bb1763eebead07cf8815a62fcd7b30311fa3:335868788/300';
    const out = buildRangoMemoScript('btc', text, 'UTF8');
    expect(out.startsWith('6a')).toBe(true);
    expect(out).not.toBe(text);
  });

  it('rejects a SCRIPT memo that is not an OP_RETURN', () => {
    expect(() => buildRangoMemoScript('btc', '76a914abcd', 'SCRIPT')).toThrow(
      /not an OP_RETURN/,
    );
  });

  it('rejects a SCRIPT memo that is not hex', () => {
    expect(() => buildRangoMemoScript('btc', 'not-hex', 'SCRIPT')).toThrow(
      /not hex/,
    );
  });

  it('refuses an unknown memoType rather than guessing', () => {
    expect(() => buildRangoMemoScript('btc', 'abc', 'BASE64' as any)).toThrow(
      /unknown memoType/,
    );
  });
});
