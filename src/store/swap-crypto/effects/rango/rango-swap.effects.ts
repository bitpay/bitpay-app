import {Effect} from '../../../index';
import {logManager} from '../../../../managers/LogManager';
import {
  RangoCreateSwapRequestData,
  RangoQuoteResponse,
  RangoStatusResponse,
  RangoSwapResponse,
  RangoTransaction,
} from '../../models/rango.models';
import {
  rangoCreateSwapTx,
  rangoGetStatus,
  rangoGetSwapQuote,
  rangoIsApproved,
  rangoReportFailure,
} from './rango';
import {
  rangoEnv,
  rangoGetErrorMessage,
  rangoIsRouteUsable,
} from '../../../../navigation/services/swap-crypto/utils/rango-utils';
import {
  buildRangoTxProposal,
  rangoCanBuildTxProposal,
  RangoTxProposalParams,
} from '../../../../navigation/services/swap-crypto/utils/rango-tx';

/**
 * Orchestration for a Rango swap: quote, build, and track.
 *
 * Signing and broadcasting stay with the caller — those go through the
 * wallet's existing createTxProposal/publishAndSign path, which owns key
 * access, hardware wallets and TSS.
 */

export class RangoQuoteError extends Error {
  resultType?: string;
  constructor(message: string, resultType?: string) {
    super(message);
    this.name = 'RangoQuoteError';
    this.resultType = resultType;
  }
}

/**
 * Preview a route. Safe to call before a destination wallet is chosen —
 * addresses are optional here, unlike the swap call.
 */
export const rangoQuote =
  (requestData: {
    from: string;
    to: string;
    amount: string;
    slippage?: number;
    referrerFee?: string;
    fromAddress?: string;
    toAddress?: string;
  }): Effect<Promise<RangoQuoteResponse>> =>
  async (): Promise<RangoQuoteResponse> => {
    const res = await rangoGetSwapQuote({env: rangoEnv, ...requestData});

    if (!rangoIsRouteUsable(res)) {
      const msg = rangoGetErrorMessage(res) ?? 'No route available';
      logManager.debug(`rangoQuote unusable route: ${res?.resultType} ${msg}`);
      throw new RangoQuoteError(msg, res?.resultType);
    }

    return res;
  };

export interface RangoPreparedSwap {
  /** Rango's id for this route. Status and approval polling are keyed on it. */
  requestId: string;
  response: RangoSwapResponse;
  tx: RangoTransaction;
  /** Ready to hand to createTxProposal. */
  txp: Record<string, any>;
}

/**
 * Gets the final quote, the unsigned transaction, and the matching BitPay
 * transaction proposal.
 *
 * The referrer fee must be identical to the one used for the displayed quote,
 * or the user receives less than they were shown.
 */
export const rangoPrepareSwap =
  (
    requestData: RangoCreateSwapRequestData,
    txpParams: RangoTxProposalParams,
  ): Effect<Promise<RangoPreparedSwap>> =>
  async (): Promise<RangoPreparedSwap> => {
    // On UTXO chains `fromAddress` is a single HD address, not the wallet's
    // whole balance, so Rango's own balance check reports a false
    // "insufficient funds". The app validates spendable balance itself before
    // reaching here.
    const isUtxo = ['btc', 'bch', 'doge', 'ltc'].includes(
      txpParams.chain?.toLowerCase(),
    );

    const res = await rangoCreateSwapTx({
      env: rangoEnv,
      ...(isUtxo && {disableEstimate: true}),
      ...requestData,
    });

    if (!rangoIsRouteUsable(res)) {
      const msg = rangoGetErrorMessage(res) ?? 'No route available';
      logManager.error(`rangoPrepareSwap unusable route: ${msg}`);
      throw new RangoQuoteError(msg, res?.resultType);
    }

    if (!res.tx) {
      throw new RangoQuoteError('Rango returned no transaction to sign');
    }

    if (!rangoCanBuildTxProposal(res.tx)) {
      throw new RangoQuoteError(
        `This route settles on ${res.tx.type}, which this wallet cannot sign yet`,
      );
    }

    // What the user agreed to, taken from the request rather than the
    // response, so the proposal builder has something independent to check
    // the response against. `from` is 'BLOCKCHAIN.SYMBOL' or
    // 'BLOCKCHAIN.SYMBOL--0xcontract'; the chain is everything before the
    // first dot.
    const auth = {
      amount: requestData.amount,
      fromAddress: requestData.fromAddress,
      blockChain: requestData.from.split('.')[0],
    };

    // Throws on unmet prerequisites, an unreadable amount, a spend larger
    // than was authorised, or a transaction built for another chain or
    // account, rather than producing a signable proposal that does the wrong
    // thing.
    const txp = buildRangoTxProposal(res.tx, txpParams, auth);

    return {
      requestId: res.requestId,
      response: res,
      tx: res.tx,
      txp,
    };
  };

/**
 * Whether the allowance Rango nominated for this quote is already in place.
 * The spender can be quote-specific, so this is always asked per request,
 * never cached.
 */
export class RangoApprovalFailedError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'RangoApprovalFailedError';
  }
}

export const rangoCheckApproval =
  (requestId: string, txId: string): Effect<Promise<boolean>> =>
  async (): Promise<boolean> => {
    const res = await rangoIsApproved({env: rangoEnv, requestId, txId});

    if (res?.isApproved) {
      return true;
    }

    // Distinguish "not yet" from "never will be". Treating a reverted or
    // short approval as pending leaves the user staring at a spinner until
    // the poll times out.
    if (res?.txStatus === 'failed') {
      throw new RangoApprovalFailedError('The approval transaction failed.');
    }
    if (res?.txStatus === 'success') {
      throw new RangoApprovalFailedError(
        'The approval confirmed but did not grant enough allowance.',
      );
    }

    return false;
  };

/**
 * Polls until the route settles or fails.
 *
 * Cross-chain routes commonly take minutes — the quotes above report
 * estimatedTimeInSeconds of 60 to 180 — so this is deliberately patient and
 * resolves with the last known state rather than throwing on timeout. A
 * running swap is not an error; it is a swap that has not finished.
 */
export const rangoPollStatus =
  (
    requestId: string,
    txId: string,
    opts?: {
      intervalMs?: number;
      timeoutMs?: number;
      /** Checked each tick so a screen can drop the poll on unmount. */
      cancelled?: () => boolean;
    },
  ): Effect<Promise<RangoStatusResponse | undefined>> =>
  async (): Promise<RangoStatusResponse | undefined> => {
    const intervalMs = opts?.intervalMs ?? 15_000;
    const timeoutMs = opts?.timeoutMs ?? 15 * 60_000;
    const deadline = Date.now() + timeoutMs;

    let last: RangoStatusResponse | undefined;

    while (Date.now() < deadline) {
      if (opts?.cancelled?.()) {
        return last;
      }

      try {
        last = await rangoGetStatus({env: rangoEnv, requestId, txId});
        if (last?.status === 'success' || last?.status === 'failed') {
          return last;
        }
      } catch (err) {
        // A transient status failure must not abandon a swap that is already
        // broadcast and in flight.
        const errStr = err instanceof Error ? err.message : JSON.stringify(err);
        logManager.debug(`rangoPollStatus transient failure: ${errStr}`);
      }

      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    // Timed out rather than settled. The caller must read an absent or
    // 'running' status as still pending, never as failure — the swap is
    // broadcast and in flight. iOS also suspends JS timers in the background,
    // so a resumed app will usually land here.

    return last;
  };

/**
 * Tells Rango the client could not sign or broadcast, so the route
 * reservation is released instead of being left pending. Best effort.
 */
export const rangoAbandonSwap =
  (
    requestId: string,
    eventType: 'SEND_TX_FAILED' | 'USER_REJECT' | 'FETCH_TX_FAILED',
    reason?: string,
  ): Effect<Promise<void>> =>
  async (): Promise<void> => {
    await rangoReportFailure({env: rangoEnv, requestId, eventType, reason});
  };
