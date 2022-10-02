import BWC from 'bitcore-wallet-client';
import {APP_NAME, APP_VERSION} from '../constants/config';

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

  constructor() {}
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
      bp_partner: APP_NAME,
      bp_partner_version: APP_VERSION,
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

  public parseSecret(invitationCode: string) {
    return BWC.parseSecret(invitationCode);
  }
}
