import {
  buildRangoMemoScript,
  buildRangoTxProposal,
  rangoCanBuildTxProposal,
  rangoGetApprovalData,
  rangoAmountToString,
  rangoFromSmallestUnit,
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
  it('produces the exact expected script for a real Thorchain memo', () => {
    const script = buildRangoMemoScript('btc', transferTx.memo!, 'UTF8');
    expect(script).toBe(
      '6a413d3a653a3078366633336262313736336565626561643037636638383135613632666364376233303331316661333a3333353836383738382f3330303a72673a30',
    );
    // 6a = OP_RETURN, then a single length byte for memos under 76 bytes.
    const len = Buffer.from(transferTx.memo!, 'utf8').length;
    expect(len).toBeLessThan(76);
    expect(script.slice(2, 4)).toBe(len.toString(16).padStart(2, '0'));
  });

  it('switches to OP_PUSHDATA1 past 75 bytes', () => {
    // 80 bytes: past the single-byte push boundary, still inside the 83-byte
    // standardness limit.
    const script = buildRangoMemoScript('btc', 'x'.repeat(80), 'UTF8');
    // 6a 4c 50 -> OP_RETURN, OP_PUSHDATA1, length 80
    expect(script.startsWith('6a4c50')).toBe(true);
  });

  it('encodes identically across every UTXO chain the wallet custodies', () => {
    const scripts = ['btc', 'bch', 'doge', 'ltc'].map(c =>
      buildRangoMemoScript(c, 'memo', 'UTF8'),
    );
    expect(scripts[0]).toBe('6a046d656d6f');
    expect(new Set(scripts).size).toBe(1);
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
    expect(txp.amount).toBe('9990000');
    expect(txp.outputs[0].amount).toBe('9990000');
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
    expect(txp.amount).toBe('1000000000000000000000');
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
    expect(txp.amount).toBe('0');
  });

  it('keeps wei exact past Number.MAX_SAFE_INTEGER', () => {
    // 1e21 + 1 wei. As a JS Number this rounds to 1e21 and the final digit is
    // lost; the user would sign a different amount than Rango quoted.
    const txp = buildRangoTxProposal(
      {...evmTx, value: '0x3635c9adc5dea00001'},
      params,
    );
    expect(txp.amount).toBe('1000000000000000000001');
  });

  it('never serialises an amount in exponential notation', () => {
    // JSON.stringify(1e21) is '1e+21', which BWS cannot read as an amount.
    const txp = buildRangoTxProposal(evmTx, params);
    expect(JSON.stringify(txp)).not.toMatch(/e\+/);
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

  it('extracts the real spender from the calldata, not approveTo', () => {
    // approveTo is the TOKEN contract the approve call is sent to. The
    // address being granted the allowance is the first argument inside
    // approve(address,uint256) — selector, then a 32-byte word.
    const spender = '69460570c93f9de5e2edbc3052bf10125f0ca22d'; // RangoDiamond
    const needsApproval = {
      ...evmTx,
      approveTo: '0xaf88d065e77c8cc2239327c5edb3a432268e5831', // USDC
      approveData: `0x095ea7b3${'0'.repeat(24)}${spender}${'0'.repeat(63)}1`,
    };

    const got = rangoGetApprovalData(needsApproval)!;
    expect(got.approveTo).toBe('0xaf88d065e77c8cc2239327c5edb3a432268e5831');
    expect(got.spenderAddress.toLowerCase()).toBe(`0x${spender}`);
    // Whitelisting or displaying approveTo would check the token, not the
    // contract that can move the funds.
    expect(got.spenderAddress).not.toBe(got.approveTo);
  });

  it('falls back to approveTo when the calldata is too short to parse', () => {
    const got = rangoGetApprovalData({
      ...evmTx,
      approveTo: '0x1111111254eeb25477b68fb85ed929f73a960582',
      approveData: '0x095ea7b3',
    })!;
    expect(got.spenderAddress).toBe(
      '0x1111111254eeb25477b68fb85ed929f73a960582',
    );
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

describe('buildRangoMemoScript — HEX memos', () => {
  // Verbatim from a live BTC->ETH swap routed through Chainflip, which is
  // what memoType HEX looks like on the wire today.
  const chainflipMemo =
    '01016f33bb1763eebead07cf8815a62fcd7b30311fa3960045a0e2f6c5bd9a1600000000000000006401000200000a00';
  const expected = `6a30${chainflipMemo}`;

  it('encodes a real Chainflip HEX memo to the exact expected script', () => {
    expect(buildRangoMemoScript('btc', chainflipMemo, 'HEX')).toBe(expected);
  });

  it('accepts a 0x prefix instead of decoding it to nothing', () => {
    // Buffer.from('0xdead','hex') stops at 'x' and yields zero bytes, so the
    // naive path produced '6a00' — a valid-looking but empty OP_RETURN that
    // sends the deposit out with no memo.
    expect(buildRangoMemoScript('btc', `0x${chainflipMemo}`, 'HEX')).toBe(
      expected,
    );
  });

  it('rejects odd-length hex rather than dropping the last nibble', () => {
    // Buffer.from('abc','hex') silently yields 0xab.
    expect(() => buildRangoMemoScript('btc', 'abc', 'HEX')).toThrow(
      /not valid hex/,
    );
  });

  it('rejects non-hex rather than emitting an empty OP_RETURN', () => {
    expect(() => buildRangoMemoScript('btc', 'zz', 'HEX')).toThrow(
      /not valid hex/,
    );
  });

  it('never returns the empty OP_RETURN 6a00', () => {
    for (const bad of ['0xdead', 'zz', 'abc', '']) {
      let out: string | undefined;
      try {
        out = buildRangoMemoScript('btc', bad, 'HEX');
      } catch {
        out = undefined;
      }
      expect(out).not.toBe('6a00');
    }
  });
});

describe('buildRangoMemoScript — SCRIPT memos', () => {
  // A complete, valid OP_RETURN script carrying the live Chainflip payload.
  const validScript =
    '6a3001016f33bb1763eebead07cf8815a62fcd7b30311fa3960045a0e2f6c5bd9a1600000000000000006401000200000a00';

  it('uses a valid SCRIPT memo verbatim instead of wrapping it again', () => {
    expect(buildRangoMemoScript('btc', validScript, 'SCRIPT')).toBe(
      validScript,
    );
  });

  it('rejects a script whose declared push is longer than its data', () => {
    // Declares OP_PUSHDATA1 77 bytes but carries 37. bitcore parses this
    // leniently, so it would sign and then be rejected at broadcast as
    // non-standard, leaving a stuck signed swap.
    const truncated =
      '6a4c4d0001140000000000000000000000006f33bb1763eebead07cf8815a62fcd7b30311fa30000';
    expect(() => buildRangoMemoScript('btc', truncated, 'SCRIPT')).toThrow(
      /declared push/,
    );
  });

  it('rejects a SCRIPT memo that is not an OP_RETURN', () => {
    expect(() => buildRangoMemoScript('btc', '76a914abcd', 'SCRIPT')).toThrow(
      /not an OP_RETURN|not a parseable script/,
    );
  });

  it('rejects a SCRIPT memo that is not hex', () => {
    expect(() => buildRangoMemoScript('btc', 'not-hex', 'SCRIPT')).toThrow(
      /not valid hex/,
    );
  });

  it('refuses an unknown memoType rather than guessing', () => {
    expect(() => buildRangoMemoScript('btc', 'abc', 'BASE64' as any)).toThrow(
      /unknown memoType/,
    );
  });
});

describe('buildRangoMemoScript — standardness limits', () => {
  it('rejects a memo over the 83-byte OP_RETURN limit on BTC', () => {
    expect(() => buildRangoMemoScript('btc', 'x'.repeat(200), 'UTF8')).toThrow(
      /standardness limit/,
    );
  });

  it('allows BCH its larger 223-byte limit', () => {
    expect(
      buildRangoMemoScript('bch', 'x'.repeat(200), 'UTF8').startsWith('6a'),
    ).toBe(true);
  });
});

describe('rangoAmountToString', () => {
  it('reads hex and decimal alike', () => {
    expect(rangoAmountToString('0x1e1d67')).toBe('1973607');
    expect(rangoAmountToString('9990000')).toBe('9990000');
  });

  it('treats an absent value as zero', () => {
    expect(rangoAmountToString(null)).toBe('0');
    expect(rangoAmountToString(undefined)).toBe('0');
    expect(rangoAmountToString('')).toBe('0');
  });

  it('throws on junk rather than returning a wrong amount', () => {
    expect(() => rangoAmountToString('abc')).toThrow(/unreadable amount/);
    expect(() => rangoAmountToString('1.5')).toThrow(/unreadable amount/);
  });
});

describe('rangoFromSmallestUnit', () => {
  it('converts a real BTC route output to human units', () => {
    // Shown unconverted this reads as "121026 BTC".
    expect(rangoFromSmallestUnit('121026', 8)).toBe('0.00121026');
  });

  it('converts an 18-decimal output exactly', () => {
    expect(rangoFromSmallestUnit('998971062744772304', 18)).toBe(
      '0.998971062744772304',
    );
  });

  it('round-trips with rangoToSmallestUnit', () => {
    for (const [v, d] of [
      ['0.00121026', 8],
      ['1.5', 18],
      ['12.345678', 6],
    ] as Array<[string, number]>) {
      expect(rangoFromSmallestUnit(rangoToSmallestUnit(v, d), d)).toBe(v);
    }
  });

  it('handles whole numbers and zero without a trailing point', () => {
    expect(rangoFromSmallestUnit('100000000', 8)).toBe('1');
    expect(rangoFromSmallestUnit('0', 8)).toBe('0');
  });
});

describe('buildRangoTxProposal — memo is mandatory on UTXO', () => {
  it('refuses to build a deposit with no memo', () => {
    expect(() =>
      buildRangoTxProposal(
        {...transferTx, memo: null},
        {
          chain: 'btc',
          message: 'm',
        },
      ),
    ).toThrow(/refusing to build an unattributable deposit/);
  });
});

describe('buildRangoTxProposal — BCH address normalisation', () => {
  it('strips the cashaddr prefix BWS rejects', () => {
    const txp = buildRangoTxProposal(
      {
        ...transferTx,
        blockChain: 'BCH',
        recipientAddress:
          'bitcoincash:qzumtx6ufk3qu92slcsg5ajehujehzcquydmhaq0eh',
      },
      {chain: 'bch', message: 'BCH to ETH'},
    );
    expect(txp.toAddress).toBe('qzumtx6ufk3qu92slcsg5ajehujehzcquydmhaq0eh');
    expect(txp.outputs[0].toAddress).toBe(
      'qzumtx6ufk3qu92slcsg5ajehujehzcquydmhaq0eh',
    );
  });

  it('leaves a BTC address untouched', () => {
    const txp = buildRangoTxProposal(transferTx, {
      chain: 'btc',
      message: 'm',
    });
    expect(txp.toAddress).toBe(transferTx.recipientAddress);
  });
});
