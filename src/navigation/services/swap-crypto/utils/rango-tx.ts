import {BwcProvider} from '../../../../lib/bwc';
import {
  RangoEvmTransaction,
  RangoMemoType,
  RangoTransaction,
  RangoTransferTransaction,
} from '../../../../store/swap-crypto/models/rango.models';

const BWC = BwcProvider.getInstance();

/**
 * Builds BitPay transaction proposals from the unsigned transactions Rango
 * returns.
 *
 * Kept free of React and of wallet state so the mapping can be tested
 * directly — this is the part where a mistake silently sends funds to the
 * wrong place or strips the memo that identifies the swap.
 *
 * Only EVM and TRANSFER (UTXO) are handled. Rango also returns SOLANA, COSMOS,
 * STARKNET and XRPL transactions; of those only Solana is on a chain we
 * custody, and it arrives as a pre-serialised transaction that the BWS
 * proposal pipeline has no way to carry. See rangoCanBuildTxProposal().
 */

export class RangoUnsupportedTxError extends Error {
  constructor(type: string) {
    super(`Rango returned an unsupported transaction type: ${type}`);
    this.name = 'RangoUnsupportedTxError';
  }
}

export class RangoPrerequisiteError extends Error {
  constructor() {
    super('Rango reported unmet prerequisites for this route');
    this.name = 'RangoPrerequisiteError';
  }
}

export const rangoCanBuildTxProposal = (
  tx: RangoTransaction | null | undefined,
): boolean => !!tx && (tx.type === 'EVM' || tx.type === 'TRANSFER');

/**
 * Rango returns `value` and `gasLimit` as hex strings ('0x1e1d67') but
 * `gasPrice` as a decimal string. Accepts either so a format change upstream
 * degrades to a wrong-but-detectable number rather than NaN.
 */
export const rangoParseNumeric = (
  value: string | number | null | undefined,
): number | undefined => {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  const trimmed = value.trim();
  const parsed = /^0x/i.test(trimmed) ? parseInt(trimmed, 16) : Number(trimmed);

  return Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * Converts a Rango amount (hex like '0x3635c9adc5dea00000', or decimal) to an
 * exact decimal string.
 *
 * BigInt rather than Number because wei values exceed the range where JS
 * integers stay exact: 0x3635c9adc5dea00001 rounds to 1e21 and drops its last
 * digit, and a Number that large also serialises as '1e+21' instead of digits.
 */
export const rangoAmountToString = (
  value: string | number | null | undefined,
): string => {
  if (value === null || value === undefined || value === '') {
    return '0';
  }

  const raw = String(value).trim();

  try {
    // BigInt() accepts both '0x...' and plain decimal digits.
    return BigInt(raw).toString();
  } catch {
    throw new Error(`rangoAmountToString: unreadable amount ${raw}`);
  }
};

/**
 * Converts a smallest-unit amount to a human-readable decimal string.
 *
 * Rango reports route outputs in machine units ('121026' sats, not '0.00121026'
 * BTC). Shown unconverted it reads as 121026 BTC, and any best-offer
 * comparison against another provider's human-unit figure is wrong by 10^8.
 */
export const rangoFromSmallestUnit = (
  amount: string | number | null | undefined,
  decimals: number,
): string => {
  if (!Number.isInteger(decimals) || decimals < 0) {
    throw new Error(`rangoFromSmallestUnit: bad decimals ${decimals}`);
  }

  const raw = rangoAmountToString(amount);
  if (decimals === 0) {
    return raw;
  }

  const padded = raw.padStart(decimals + 1, '0');
  const whole = padded.slice(0, padded.length - decimals);
  const frac = padded.slice(padded.length - decimals).replace(/0+$/, '');

  return frac ? `${whole}.${frac}` : whole;
};

/**
 * Encodes a Rango memo as an OP_RETURN script for the given UTXO chain.
 *
 * The memo is what identifies the swap to the destination network — a UTXO
 * deposit without it is an ordinary transfer to a vault address and the funds
 * are not recoverable through Rango. Chain-specific bitcore builds are used
 * because each has its own Script implementation.
 *
 * Returns a hex string beginning with '6a' (OP_RETURN), which is what BWS
 * validates for `output.script`.
 */
export const buildRangoMemoScript = (
  chain: string,
  memo: string,
  memoType: RangoMemoType | null | undefined,
): string => {
  if (!memo) {
    throw new Error('buildRangoMemoScript: empty memo');
  }

  const lib = (() => {
    switch (chain?.toLowerCase()) {
      case 'bch':
        return BWC.getBitcoreCash();
      case 'doge':
        return BWC.getBitcoreDoge();
      case 'ltc':
        return BWC.getBitcoreLtc();
      case 'btc':
        return BWC.getBitcore();
      default:
        throw new Error(
          `buildRangoMemoScript: ${chain} is not a UTXO chain we support`,
        );
    }
  })();

  // Standardness cap on an OP_RETURN output. BCH raised it; everyone else
  // kept Bitcoin's. Over this the node accepts the proposal, the user signs,
  // and the broadcast is rejected as non-standard — a stuck signed swap.
  const maxScriptBytes = chain?.toLowerCase() === 'bch' ? 223 : 83;

  const assertUsable = (script: string): string => {
    let parsed;
    try {
      parsed = lib.Script.fromHex(script);
    } catch {
      throw new Error('buildRangoMemoScript: memo is not a parseable script');
    }

    // Checked before isDataOut() because bitcore's own implementation also
    // rejects oversize scripts, and "not an OP_RETURN" would be a misleading
    // reason for a memo that is simply too long.
    if (script.length / 2 > maxScriptBytes) {
      throw new Error(
        `buildRangoMemoScript: script is ${
          script.length / 2
        } bytes, over the ${maxScriptBytes}-byte standardness limit`,
      );
    }

    // isDataOut() is what makes this an OP_RETURN carrying exactly one push.
    if (!parsed.isDataOut()) {
      throw new Error(
        `buildRangoMemoScript: not an OP_RETURN data output, got ${script.slice(
          0,
          8,
        )}`,
      );
    }

    // A declared push length longer than the bytes actually present parses
    // leniently here but is rejected by the network at broadcast.
    const chunk = parsed.chunks?.[1];
    if (!chunk?.buf?.length) {
      throw new Error('buildRangoMemoScript: memo carries no data');
    }
    if (chunk.len !== undefined && chunk.len !== chunk.buf.length) {
      throw new Error(
        `buildRangoMemoScript: declared push ${chunk.len} but carries ${chunk.buf.length} bytes`,
      );
    }
    return script;
  };

  // SCRIPT memos are already a complete output script, not data to be wrapped.
  // Route-dependent on the same pair: Thorchain returns UTF8, Chainflip HEX,
  // TeleSwap SCRIPT. Wrapping a SCRIPT memo a second time produces a deposit
  // the destination network cannot attribute, and the funds are not
  // recoverable.
  if (memoType === 'SCRIPT') {
    const script = memo.toLowerCase().replace(/^0x/, '');
    if (!/^[0-9a-f]+$/.test(script) || script.length % 2 !== 0) {
      throw new Error('buildRangoMemoScript: SCRIPT memo is not valid hex');
    }
    return assertUsable(script);
  }

  if (memoType && memoType !== 'UTF8' && memoType !== 'HEX') {
    // Refuse rather than guess an encoding: a wrong guess silently misdirects
    // the deposit.
    throw new Error(`buildRangoMemoScript: unknown memoType ${memoType}`);
  }

  let data: Buffer;
  if (memoType === 'HEX') {
    // Buffer.from(str, 'hex') does NOT throw on bad input — it stops at the
    // first invalid character. '0xdead' decodes to zero bytes and yields the
    // empty OP_RETURN '6a00', which passes a naive prefix check and is
    // accepted by BWS, sending the deposit out with no memo at all.
    const hex = memo.toLowerCase().replace(/^0x/, '');
    if (!/^[0-9a-f]+$/.test(hex) || hex.length % 2 !== 0) {
      throw new Error('buildRangoMemoScript: HEX memo is not valid hex');
    }
    data = Buffer.from(hex, 'hex');
    if (data.length !== hex.length / 2) {
      throw new Error('buildRangoMemoScript: HEX memo decoded short');
    }
  } else {
    data = Buffer.from(memo, 'utf8');
  }

  if (!data.length) {
    throw new Error('buildRangoMemoScript: memo decoded to zero bytes');
  }

  // buildDataOut picks the right push opcode, including OP_PUSHDATA1 past 75
  // bytes, which Thorchain-style memos can exceed. Passing a Buffer avoids a
  // second round of string decoding.
  return assertUsable(lib.Script.buildDataOut(data).toHex());
};

export interface RangoTxProposalParams {
  /** BitPay chain code of the wallet being spent from, e.g. 'btc', 'eth'. */
  chain: string;
  /** ERC20 contract address when spending a token, otherwise undefined. */
  tokenAddress?: string;
  message: string;
}

/**
 * EVM: a contract call. `txData` is Rango's calldata and `value` the native
 * amount sent alongside it (zero for token swaps).
 */
const buildEvmProposal = (
  tx: RangoEvmTransaction,
  params: RangoTxProposalParams,
) => {
  // Kept as an exact decimal string. A wei value routinely exceeds
  // Number.MAX_SAFE_INTEGER, where two things go wrong: 0x3635c9adc5dea00001
  // parses to 1e21 and loses its last digit, and JSON.stringify emits
  // '1e+21' rather than digits. This is what parseAmountToStringIfBN exists
  // to prevent elsewhere in the swap and sell checkouts.
  const amount = rangoAmountToString(tx.value);
  // Safe as a Number — gas limits are ~1e6.
  const gasLimit = rangoParseNumeric(tx.gasLimit);

  const outputs = [
    {
      toAddress: tx.txTo,
      amount,
      message: params.message,
      data: tx.txData ?? undefined,
      ...(gasLimit !== undefined && {gasLimit}),
    },
  ];

  return {
    toAddress: tx.txTo,
    amount,
    chain: params.chain,
    outputs,
    message: params.message,
    excludeUnconfirmedUtxos: true,
    // A swap route is only held for a short window; a slow confirmation
    // expires it and the user has to start over.
    feeLevel: 'priority',
    ...(gasLimit !== undefined && {gasLimit}),
    ...(params.tokenAddress && {tokenAddress: params.tokenAddress}),
    // Marks this as a contract interaction rather than a plain send, so the
    // confirm screen does not present it as a transfer to txTo.
    isTokenSwap: true,
    customData: {
      rango: tx.txTo,
      service: 'rango',
    },
  };
};

/**
 * UTXO: a send to Rango's deposit address plus an OP_RETURN carrying the memo.
 *
 * The OP_RETURN output must have amount 0 — BWS rejects the proposal
 * otherwise.
 */
const buildTransferProposal = (
  tx: RangoTransferTransaction,
  params: RangoTxProposalParams,
) => {
  // Exact string for the same reason as the EVM path; UTXO amounts are small
  // enough today but the conversion should not be the thing that decides that.
  const amount = rangoAmountToString(tx.amount);
  if (amount === '0') {
    throw new Error(`buildRangoTxProposal: unreadable amount ${tx.amount}`);
  }

  // BWS rejects a BCH address that is not prefix-less cashaddr
  // (ONLY_CASHADDR). Rango's samples already are, but a legacy or
  // 'bitcoincash:'-prefixed one would fail at createTxProposal. Normalised the
  // same way the Changelly checkout does it.
  const recipientAddress =
    params.chain?.toLowerCase() === 'bch'
      ? BWC.getBitcoreCash().Address(tx.recipientAddress).toString(true)
      : tx.recipientAddress;

  const outputs: Array<Record<string, any>> = [
    {
      toAddress: recipientAddress,
      amount,
      message: params.message,
    },
  ];

  // For Thorchain, Chainflip and TeleSwap the memo IS the swap: a deposit to
  // the vault without it is an ordinary transfer that cannot be attributed and
  // cannot be recovered. `method` is not inspected because nothing documents a
  // UTXO route that legitimately omits the memo — if one exists, gate on it
  // here deliberately rather than letting an empty memo through by default.
  if (!tx.memo) {
    throw new Error(
      'buildRangoTxProposal: UTXO route returned no memo; refusing to build an unattributable deposit',
    );
  }

  outputs.push({
    script: buildRangoMemoScript(params.chain, tx.memo, tx.memoType),
    amount: 0,
  });

  return {
    toAddress: recipientAddress,
    amount,
    chain: params.chain,
    outputs,
    message: params.message,
    excludeUnconfirmedUtxos: true,
    feeLevel: 'priority',
    customData: {
      rango: recipientAddress,
      service: 'rango',
    },
  };
};

/**
 * Maps a Rango transaction onto a BitPay transaction proposal.
 *
 * Throws rather than returning a partial proposal: every failure here would
 * otherwise produce a signable transaction that does the wrong thing.
 */
export const buildRangoTxProposal = (
  tx: RangoTransaction,
  params: RangoTxProposalParams,
): Record<string, any> => {
  if (!tx) {
    throw new Error('buildRangoTxProposal: no transaction');
  }

  if (tx.prerequisites?.length) {
    throw new RangoPrerequisiteError();
  }

  switch (tx.type) {
    case 'EVM':
      return buildEvmProposal(tx, params);
    case 'TRANSFER':
      return buildTransferProposal(tx, params);
    default:
      throw new RangoUnsupportedTxError((tx as RangoTransaction).type);
  }
};

/**
 * True when the EVM transaction needs an ERC20 approval before the swap can be
 * signed. Read from the swap response every time — for some bridges Rango
 * generates the spender per quote, so a cached value can be wrong.
 */
export const rangoGetApprovalData = (
  tx: RangoTransaction | null | undefined,
): {spenderAddress: string; data: string} | undefined => {
  if (!tx || tx.type !== 'EVM' || !tx.approveTo || !tx.approveData) {
    return undefined;
  }
  return {spenderAddress: tx.approveTo, data: tx.approveData};
};

/**
 * Converts a human-readable amount to the asset's smallest unit as a decimal
 * string.
 *
 * Done with string arithmetic rather than `amount * 10 ** decimals` because
 * an 18-decimal token amount exceeds Number.MAX_SAFE_INTEGER, where float
 * multiplication silently rounds — 0.1 ETH would be off by a few wei, which
 * is enough to make Rango quote a different amount than the one actually
 * sent.
 */
/** Expands '1e-7' / '1.5e+21' into plain decimal notation. */
const expandExponential = (value: number): string => {
  const str = String(value);
  if (!/e/i.test(str)) {
    return str;
  }

  const [mantissa, expPart] = str.split(/e/i);
  const exp = Number(expPart);
  const negative = mantissa.startsWith('-');
  const [intPart, fracPart = ''] = mantissa.replace('-', '').split('.');
  const digits = intPart + fracPart;
  const pointPos = intPart.length + exp;

  let out: string;
  if (pointPos <= 0) {
    out = '0.' + '0'.repeat(-pointPos) + digits;
  } else if (pointPos >= digits.length) {
    out = digits + '0'.repeat(pointPos - digits.length);
  } else {
    out = digits.slice(0, pointPos) + '.' + digits.slice(pointPos);
  }

  return (negative ? '-' : '') + out;
};

export const rangoToSmallestUnit = (
  amount: number | string,
  decimals: number,
): string => {
  if (!Number.isInteger(decimals) || decimals < 0) {
    throw new Error(`rangoToSmallestUnit: bad decimals ${decimals}`);
  }

  // String(0.1) is '0.1'; (0.1).toFixed(18) is '0.100000000000000006' — the
  // very float artifact this function exists to avoid. Use the shortest
  // round-tripping representation and expand any exponent by hand.
  const raw = (
    typeof amount === 'number' ? expandExponential(amount) : amount
  ).trim();

  if (!/^\d*\.?\d*$/.test(raw) || raw === '' || raw === '.') {
    throw new Error(`rangoToSmallestUnit: unreadable amount ${amount}`);
  }

  const [whole = '0', frac = ''] = raw.split('.');
  // Truncate rather than round: paying out one unit less can never overdraw
  // the wallet, whereas rounding up can.
  const padded = (frac + '0'.repeat(decimals)).slice(0, decimals);
  const combined = `${whole}${padded}`.replace(/^0+(?=\d)/, '');

  return combined === '' ? '0' : combined;
};
