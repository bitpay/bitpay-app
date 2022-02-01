export const ExtractBitPayUriAddress = (data: string): string => {
  const address = data.replace(/^[a-z]+:/i, '').replace(/\?.*/, '');
  // eslint-disable-next-line no-useless-escape
  const params = /([\?\&]+[a-z]+=(\d+([\,\.]\d+)?))+/i;
  return address.replace(params, '');
};

export const GetPayProUrl = (data: string): string => {
  return decodeURIComponent(
    data.replace(
      /(bitcoin|bitcoincash|ethereum|ripple|dogecoin|litecoin)?:\?r=/,
      '',
    ),
  );
};
