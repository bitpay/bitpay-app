export const ExtractBitPayUriAddress = (data: string): string => {
  const address = data.replace(/^[a-z]+:/i, '').replace(/\?.*/, '');
  // eslint-disable-next-line no-useless-escape
  const params = /([\?\&]+[a-z]+=(\d+([\,\.]\d+)?))+/i;
  return address.replace(params, '');
};

// SECURITY (RN-3074 / IS-1457): the PayPro URL host is taken from scanned data / deep
// links and is used to fetch invoice + payment-request data. These are BitPay invoice
// endpoints, so the host must be a BitPay host over https — otherwise an attacker-chosen
// host could feed the app a payment request it then presents as a BitPay invoice.
const BITPAY_PAYPRO_HOSTS = ['bitpay.com'];
export const isTrustedBitPayPayProUrl = (payProUrl: string): boolean => {
  if (typeof payProUrl !== 'string') {
    return false;
  }
  // Reject characters that URL parsers disagree on. The WHATWG polyfill treats '\' as
  // a path separator, so 'https://bitpay.com\@evil.com/i/x' parses as host
  // bitpay.com here, while iOS NSURL and the url package BWC uses read it as userinfo
  // and send the request to evil.com. Whitespace and control characters have no place
  // in a BitPay invoice URL either.
  // eslint-disable-next-line no-control-regex
  if (/[\\\s\u0000-\u001f\u007f]/.test(payProUrl)) {
    return false;
  }
  try {
    const {host, protocol, username, password} = new URL(payProUrl);
    // Userinfo is never part of a BitPay invoice URL; refuse it outright.
    if (username || password) {
      return false;
    }
    // The RN URL polyfill does not lowercase the host.
    const normalizedHost = host.toLowerCase();
    return (
      protocol === 'https:' &&
      BITPAY_PAYPRO_HOSTS.some(
        a => normalizedHost === a || normalizedHost.endsWith('.' + a),
      )
    );
  } catch {
    return false;
  }
};

export const GetPayProUrl = (data: string): string => {
  let url;
  // universal link
  if (data.startsWith('https://')) {
    url = data.replace(/link./, '');
  } else {
    url = data.replace(
      /(bitpay|bitcoin|bitcoincash|bchtest|bchreg|ethereum|ripple|matic|arb|base|op|solana|dogecoin|litecoin)?:\?r=/,
      '',
    );
  }
  return decodeURIComponent(url);
};

export const ExtractCoinNetworkAddress = (str: string): string => {
  const extractedAddress = str.replace(/^[a-z]+:/i, '').replace(/\?.*/, '');
  return extractedAddress;
};

export const ExtractUriAmount = (uri: string): RegExpExecArray | null => {
  return /[?&]amount=(\d+([,.]\d+)?)/i.exec(uri);
};
