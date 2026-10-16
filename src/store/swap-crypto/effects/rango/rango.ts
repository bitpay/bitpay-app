import axios from 'axios';
import {BASE_BWS_URL} from '../../../../constants/config';
import {
  RangoBlockchainMeta,
  RangoCreateSwapRequestData,
  RangoGetQuoteRequestData,
  RangoIsApprovedRequestData,
  RangoIsApprovedResponse,
  RangoMetaResponse,
  RangoQuoteResponse,
  RangoReportFailureRequestData,
  RangoStatusRequestData,
  RangoStatusResponse,
  RangoSwapResponse,
} from '../../models/rango.models';
import {logManager} from '../../../../managers/LogManager';

/**
 * Rango Basic API (single step), proxied through BWS.
 *
 * Basic rather than the Main multi-step API, deliberately. Main returns a
 * route of N steps, each needing its own create-transaction, sign, broadcast
 * and status poll, with the user signing once per step — a materially larger
 * execution surface. Basic returns one transaction per swap, which maps onto
 * the single createTxProposal/publishAndSign flow the app already has.
 *
 * The cost is that Basic will not return routes needing two or more steps; it
 * answers NO_ROUTE instead. Spot-checked on the chains the wallet custodies
 * (BTC->ETH, BTC->POLYGON.USDC): Main returns a 1-step route for the same
 * pairs, so Basic is not losing them. BCH->ETH is NO_ROUTE on BOTH tiers, so
 * that gap is liquidity, not API choice.
 *
 * Rango's own integration checklist lists a "+2 step swap" as a launch
 * scenario, so this should be re-measured across the full pair matrix before
 * enabling, and revisited if the NO_ROUTE rate turns out to be material.
 */
const bwsUri = BASE_BWS_URL;

const config = {
  headers: {
    'Content-Type': 'application/json',
  },
};

export const rangoGetSupportedChains = async (
  requestData: any,
): Promise<RangoBlockchainMeta[]> => {
  try {
    const {data} = await axios.post(
      bwsUri + '/v1/service/rango/supportedChains',
      requestData,
      config,
    );

    // Rango returns either a bare array or {blockchains: [...]} depending on
    // which meta endpoint served the request.
    const chains = Array.isArray(data) ? data : data?.blockchains;
    return Promise.resolve(chains ?? []);
  } catch (err) {
    const errStr = err instanceof Error ? err.message : JSON.stringify(err);
    logManager.error('Error fetching Rango supported chains: ' + errStr);
    return Promise.reject(err);
  }
};

export const rangoGetCurrencies = async (
  requestData: any,
): Promise<RangoMetaResponse> => {
  try {
    const {data} = await axios.post(
      bwsUri + '/v1/service/rango/cryptoCurrencies',
      requestData,
      config,
    );

    return Promise.resolve(data);
  } catch (err) {
    const errStr = err instanceof Error ? err.message : JSON.stringify(err);
    logManager.error('Error fetching Rango supported currencies: ' + errStr);
    return Promise.reject(err);
  }
};

export const rangoGetSwapQuote = async (
  requestData: RangoGetQuoteRequestData,
): Promise<RangoQuoteResponse> => {
  try {
    const {data} = await axios.post(
      bwsUri + '/v1/service/rango/getSwapQuote',
      requestData,
      config,
    );

    return Promise.resolve(data);
  } catch (err) {
    const errStr = err instanceof Error ? err.message : JSON.stringify(err);
    logManager.error('Error in rangoGetSwapQuote: ' + errStr);
    return Promise.reject(err);
  }
};

/**
 * Returns the final quote plus an unsigned transaction. The `requestId` on the
 * response must be retained — status and approval polling are both keyed on it.
 */
export const rangoCreateSwapTx = async (
  requestData: RangoCreateSwapRequestData,
): Promise<RangoSwapResponse> => {
  try {
    const {data} = await axios.post(
      bwsUri + '/v1/service/rango/createSwapTx',
      requestData,
      config,
    );

    return Promise.resolve(data);
  } catch (err) {
    const errStr = err instanceof Error ? err.message : JSON.stringify(err);
    logManager.error('Error in rangoCreateSwapTx: ' + errStr);
    return Promise.reject(err);
  }
};

export const rangoGetStatus = async (
  requestData: RangoStatusRequestData,
): Promise<RangoStatusResponse> => {
  try {
    const {data} = await axios.post(
      bwsUri + '/v1/service/rango/getStatus',
      requestData,
      config,
    );

    return Promise.resolve(data);
  } catch (err) {
    const errStr = err instanceof Error ? err.message : JSON.stringify(err);
    logManager.error('Error in rangoGetStatus: ' + errStr);
    return Promise.reject(err);
  }
};

export const rangoIsApproved = async (
  requestData: RangoIsApprovedRequestData,
): Promise<RangoIsApprovedResponse> => {
  try {
    const {data} = await axios.post(
      bwsUri + '/v1/service/rango/isApproved',
      requestData,
      config,
    );

    return Promise.resolve(data);
  } catch (err) {
    const errStr = err instanceof Error ? err.message : JSON.stringify(err);
    logManager.error('Error in rangoIsApproved: ' + errStr);
    return Promise.reject(err);
  }
};

/**
 * Best-effort notification that the client could not sign or broadcast, so
 * Rango can release the route reservation. Never throws — a failure to report
 * a failure should not surface to the user.
 */
export const rangoReportFailure = async (
  requestData: RangoReportFailureRequestData,
): Promise<void> => {
  try {
    await axios.post(
      bwsUri + '/v1/service/rango/reportFailure',
      requestData,
      config,
    );
  } catch (err) {
    const errStr = err instanceof Error ? err.message : JSON.stringify(err);
    logManager.debug('Non-fatal: rangoReportFailure failed: ' + errStr);
  }
};
