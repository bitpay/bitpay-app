export type BwsConfig = {
  /** e.g. "/bws/api" (proxied) or "https://bws.bitpay.com/bws/api" */
  baseUrl: string;
  timeoutMs?: number;
};
