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
      baseUrl: 'https://bws.bitpay.com/bws/api', // 'http://localhost:3232/bws/api', uncomment for local testing
      verbose: true,
      timeout: 100000,
      transports: ['polling'],
      // TODO bp_partner: this.appProvider.info.name
      // TODO bp_partner_version : this.appProvider.info.version
    });
    if (credentials) {
      bwc.fromString(credentials);
    }

    return bwc;
  }

  public getSJCL() {
    return BWC.sjcl;
  }

  public getKey() {
    return BWC.Key;
  }

  public upgradeCredentialsV1(x: any) {
    return BWC.upgradeCredentialsV1(x);
  }

  public upgradeMultipleCredentialsV1(x: any) {
    return BWC.upgradeMultipleCredentialsV1(x);
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

  public getErrors() {
    return BWC.errors;
  }

  public getUtils() {
    return BWC.Utils;
  }

  public getPayProV2() {
    return BWC.PayProV2;
  }

  public getUtils() {
    return BWC.Utils;
  }
}
