import {Effect} from '../../../index';
import {logManager} from '../../../../managers/LogManager';
import {Wallet} from '../../../wallet/wallet.models';
import {createTxProposal} from '../../../wallet/effects/send/send';
import {SwapCryptoActions} from '../../index';
import {
  RangoPreparedSwap,
  rangoAbandonSwap,
  rangoCheckApproval,
  rangoPollStatus,
  rangoPrepareSwap,
  RangoQuoteError,
} from './rango-swap.effects';
import {rangoGetApprovalData} from '../../../../navigation/services/swap-crypto/utils/rango-tx';
import {getRangoAsset} from '../../../../navigation/services/swap-crypto/utils/rango-utils';

/**
 * Checkout orchestration for a Rango swap.
 *
 * Deliberately stops short of signing: publishAndSign lives in the screen
 * because it owns password prompts, hardware-wallet pairing and TSS, none of
 * which should be duplicated per provider.
 */

export class RangoRateMovedError extends Error {
  constructor(
    public readonly accepted: string,
    public readonly offered: string,
  ) {
    super('The rate moved before this swap could be signed');
    this.name = 'RangoRateMovedError';
  }
}

export class RangoUnverifiableRateError extends Error {
  constructor(reason: string) {
    super(`The guaranteed minimum could not be verified: ${reason}`);
    this.name = 'RangoUnverifiableRateError';
  }
}

export interface RangoCheckoutParams {
  fromWallet: Wallet;
  toWallet: Wallet;
  /** Source address Rango should treat as the sender. */
  fromAddress: string;
  /** Destination address the swapped funds are delivered to. */
  toAddress: string;
  /** Source amount in the asset's smallest unit. */
  amount: string;
  slippage: number;
  /**
   * outputAmountMin from the quote the user accepted. The swap call re-quotes,
   * and Rango does not pin a rate the way Changelly's fixed-rate id does, so
   * this is what makes "the amount shown" and "the amount signed" the same
   * promise.
   */
  acceptedOutputAmountMin?: string;
  /**
   * Asked to approve a guaranteed minimum lower than the one on the confirm
   * screen. Returning false abandons the route.
   *
   * The swap endpoint re-quotes, so a small move between preview and signing
   * is ordinary. Silently accepting it would break the promise the confirm
   * screen made; silently refusing it strands the user on a screen that never
   * proceeds. Both are worse than asking.
   */
  confirmLowerMinimum?: (accepted: string, offered: string) => Promise<boolean>;
}

export interface RangoCheckoutTx extends RangoPreparedSwap {
  /** Created proposal, ready for publishAndSign. */
  ctxp: any;
  /** Present when an ERC20 allowance must be granted before signing. */
  approval?: {approveTo: string; spenderAddress: string; data: string};
}

/**
 * Builds everything needed to sign: final quote, unsigned transaction,
 * transaction proposal, and whether an approval must come first.
 */
export const rangoCreateCheckoutTx =
  (params: RangoCheckoutParams): Effect<Promise<RangoCheckoutTx>> =>
  async (dispatch): Promise<RangoCheckoutTx> => {
    const {fromWallet, toWallet} = params;

    const from = getRangoAsset(
      fromWallet.currencyAbbreviation,
      fromWallet.chain,
      fromWallet.tokenAddress,
    );
    const to = getRangoAsset(
      toWallet.currencyAbbreviation,
      toWallet.chain,
      toWallet.tokenAddress,
    );

    if (!from || !to) {
      throw new RangoQuoteError('This pair is not supported by Rango.');
    }

    const message = `${fromWallet.currencyAbbreviation.toUpperCase()} to ${toWallet.currencyAbbreviation.toUpperCase()}`;

    const prepared = await dispatch(
      rangoPrepareSwap(
        {
          from,
          to,
          amount: params.amount,
          slippage: params.slippage,
          fromAddress: params.fromAddress,
          toAddress: params.toAddress,
        },
        {
          chain: fromWallet.chain,
          tokenAddress: fromWallet.tokenAddress,
          message,
        },
      ),
    );

    // The swap endpoint re-quotes. `acceptedOutputAmountMin` is already the
    // preview route's slippage-protected floor, so it is compared directly -
    // subtracting slippage from it a second time would permit delivery below
    // the number the confirm screen guaranteed.
    const offeredMin = prepared.response.route?.outputAmountMin;
    if (params.acceptedOutputAmountMin) {
      let accepted: bigint;
      let offered: bigint;
      try {
        accepted = BigInt(params.acceptedOutputAmountMin);
        offered = BigInt(offeredMin!);
      } catch {
        // Fails closed. These are modelled as required integer strings, so a
        // missing or malformed value means the response is not what we think
        // it is - not a reason to sign without the check.
        await dispatch(
          rangoAbandonSwap(
            prepared.requestId,
            'FETCH_TX_FAILED',
            'output minimum missing or malformed',
          ),
        );
        throw new RangoUnverifiableRateError(
          `accepted ${params.acceptedOutputAmountMin}, offered ${offeredMin}`,
        );
      }

      if (offered < accepted) {
        const proceed = params.confirmLowerMinimum
          ? await params.confirmLowerMinimum(
              params.acceptedOutputAmountMin,
              offeredMin!,
            )
          : false;

        if (!proceed) {
          await dispatch(
            rangoAbandonSwap(
              prepared.requestId,
              'USER_REJECT',
              'quoted output fell below the accepted minimum',
            ),
          );
          throw new RangoRateMovedError(
            params.acceptedOutputAmountMin,
            offeredMin!,
          );
        }

        logManager.debug(
          `rangoCreateCheckoutTx: user accepted a lower minimum (${params.acceptedOutputAmountMin} -> ${offeredMin})`,
        );
      }
    }

    // Validated against the token actually being spent and the amount the
    // user authorised; throws RangoApprovalDataError rather than forwarding
    // calldata we cannot account for.
    const approval = rangoGetApprovalData(prepared.tx, {
      tokenAddress: fromWallet.tokenAddress,
      amount: params.amount,
    });

    // An allowance has to be granted before the swap proposal can be built
    // against it, so stop here and let the caller run the approve flow.
    if (approval) {
      return {...prepared, ctxp: undefined, approval};
    }

    try {
      const ctxp = await dispatch(createTxProposal(fromWallet, prepared.txp));
      return {...prepared, ctxp};
    } catch (err) {
      // Release the route reservation rather than leaving it pending.
      await dispatch(
        rangoAbandonSwap(
          prepared.requestId,
          'FETCH_TX_FAILED',
          'createTxProposal failed',
        ),
      );
      throw err;
    }
  };

/**
 * Records the order the moment it is broadcast, before any polling.
 *
 * Status is written as running: if the app is killed mid-swap the order is
 * still in history and can be refreshed from the settings screen, which is how
 * Changelly behaves.
 */
export const saveRangoTx =
  (args: {
    prepared: RangoCheckoutTx;
    txid: string;
    fromWallet: Wallet;
    toWallet: Wallet;
    toAddress: string;
    amountFrom: number;
    amountTo: number;
    slippage?: number;
    /** Rango's cut in SOURCE-coin units, as shown on the confirm screen. */
    totalExchangeFee: number;
  }): Effect<void> =>
  dispatch => {
    const {prepared, fromWallet, toWallet} = args;

    dispatch(
      SwapCryptoActions.successTxRango({
        rangoTxData: {
          requestId: prepared.requestId,
          txHash: args.txid,
          date: Date.now(),
          amountTo: args.amountTo,
          coinTo: toWallet.currencyAbbreviation.toLowerCase(),
          chainTo: toWallet.chain.toLowerCase(),
          addressTo: args.toAddress,
          walletIdTo: toWallet.id,
          amountFrom: args.amountFrom,
          coinFrom: fromWallet.currencyAbbreviation.toLowerCase(),
          chainFrom: fromWallet.chain.toLowerCase(),
          assetFrom:
            getRangoAsset(
              fromWallet.currencyAbbreviation,
              fromWallet.chain,
              fromWallet.tokenAddress,
            ) ?? '',
          assetTo:
            getRangoAsset(
              toWallet.currencyAbbreviation,
              toWallet.chain,
              toWallet.tokenAddress,
            ) ?? '',
          // route.feeUsd is dollars; this field is coin units everywhere else
          // in the app, so a details screen would otherwise label a USD
          // number with the source coin's ticker.
          totalExchangeFee: args.totalExchangeFee,
          totalExchangeFeeUsd: prepared.response.route?.feeUsd ?? undefined,
          slippage: args.slippage,
          status: 'running',
          swapperId: prepared.response.route?.swapper?.id,
          env: __DEV__ ? 'dev' : 'prod',
        },
      }),
    );
  };

/**
 * Follows the swap to completion and updates the stored order.
 *
 * Fire-and-forget: the order is already persisted, so a backgrounded app or a
 * timed-out poll leaves it visible as running rather than losing it. `cancelled`
 * lets the screen drop the poll on unmount without leaving a timer behind.
 */
export const rangoTrackSwap =
  (args: {
    requestId: string;
    txid: string;
    cancelled?: () => boolean;
  }): Effect<Promise<void>> =>
  async (dispatch, getState): Promise<void> => {
    try {
      const status = await dispatch(
        rangoPollStatus(args.requestId, args.txid, {
          cancelled: args.cancelled,
        }),
      );

      if (!status?.status || args.cancelled?.()) {
        return;
      }

      const existing = getState().SWAP_CRYPTO.rango?.[args.requestId];
      if (!existing) {
        return;
      }

      dispatch(
        SwapCryptoActions.successTxRango({
          rangoTxData: {...existing, status: status.status},
        }),
      );
    } catch (err) {
      const errStr = err instanceof Error ? err.message : JSON.stringify(err);
      logManager.debug(`rangoTrackSwap stopped: ${errStr}`);
    }
  };

/**
 * Waits for an ERC20 approval to actually confirm.
 *
 * Rango derives approveTo/approveData from the on-chain allowance, so
 * re-quoting before the approve transaction mines returns the same approval
 * request — the user is sent back to the approve screen and pays twice if
 * they sign it again.
 */
export const rangoAwaitApproval =
  (
    requestId: string,
    txId: string,
    opts?: {intervalMs?: number; timeoutMs?: number},
  ): Effect<Promise<boolean>> =>
  async (dispatch): Promise<boolean> => {
    const intervalMs = opts?.intervalMs ?? 5_000;
    const deadline = Date.now() + (opts?.timeoutMs ?? 3 * 60_000);

    while (Date.now() < deadline) {
      if (await dispatch(rangoCheckApproval(requestId, txId))) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    // Not an error: the approval may still confirm. The caller tells the user
    // to retry rather than treating this as a failure.
    return false;
  };
