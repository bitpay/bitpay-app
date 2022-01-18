import BWC from 'bitcore-wallet-client';

interface KeyOpts {
  seedType: string;
  seedData?: any;
  passphrase?: string; // seed passphrase
  password?: string; // encrypting password
  sjclOpts?: any; // options to SJCL encrypt
  use0forBCH?: boolean;
  useLegacyPurpose?: boolean;
  useLegacyCoinType?: boolean;
  nonCompliantDerivation?: boolean;
  language?: string;
}

export class BwcProvider {
  static instance: BwcProvider;
  static API = BWC;

  constructor() {
    console.log('BWC instance created');
  }
  // creating singleton
  public static getInstance(): BwcProvider {
    if (!BwcProvider.instance) {
      BwcProvider.instance = new BwcProvider();
    }
    return BwcProvider.instance;
  }

  public getClient(credentials?: string) {
    const bwc = new BWC({
      baseUrl: 'https://bws.bitpay.com/bws/api',
      verbose: true,
      timeout: 100000,
      transports: ['polling'],
    });

    if (credentials) {
      bwc.fromString(credentials);
    }

    return bwc;
  }

  public createKey(opts: KeyOpts) {
    return new BWC.Key(opts);
  }

  public getBitcore() {
    return BWC.Bitcore;
  }

  public getBitcoreCash() {
    return BWC.BitcoreCash;
  }

  public getBitcoreDoge() {
    return BWC.BitcoreDoge;
  }

  public getBitcoreLtc() {
    return BWC.BitcoreLtc;
  }

  public getCore() {
    return BWC.Core;
  }
}
