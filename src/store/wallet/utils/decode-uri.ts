export const ExtractBitPayUriAddress = (data: string): string => {
  const address = data.replace(/^[a-z]+:/i, '').replace(/\?.*/, '');
  // eslint-disable-next-line no-useless-escape
  const params = /([\?\&]+[a-z]+=(\d+([\,\.]\d+)?))+/i;
  return address.replace(params, '');
};

export const GetPayProUrl = (data: string): string => {
  let url;
  // universal link
  if (data.startsWith('https://')) {
    url = data.replace(/link./, '');
  } else {
    url = data.replace(
      /(bitpay|bitcoin|bitcoincash|ethereum|ripple|matic|dogecoin|litecoin)?:\?r=/,
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
  return /[\?\&]amount=(\d+([\,\.]\d+)?)/i.exec(uri);
};
