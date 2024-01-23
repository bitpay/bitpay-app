import {Credentials} from 'bitcore-wallet-client/ts_build/lib/credentials';
import {Constants} from 'bitcore-wallet-client/ts_build/lib/common';
import {BwcProvider} from '../lib/bwc';
import {Network} from '../constants';

const BWC = BwcProvider.getInstance();
const Bitcore = BWC.getBitcore();
const Utils = BWC.getUtils();

/**
 * Determine the network from an extended key.
 * @param xKey Extended key serialized in hex
 * @returns 'livenet' | 'testnet'
 */
export const getNetworkFromExtendedKey = (xKey: string): Network => {
  return xKey.charAt(0) === 't' ? Network.testnet : Network.mainnet;
};

/**
 * Extracted from old Copay build, converts an xPubKey to an entropy source.
 * @param xPubKey Extended key serialized in hex
 * @returns Entropy source
 */
const xPubKeyToEntropySource = (xPubKey: string): string => {
  const x = Bitcore.HDPublicKey(xPubKey);

  return x.publicKey.toString();
};

/**
 *
 * @param prefix
 * @param length
 * @param entropySource
 * @returns
 */
const hashFromEntropy = (
  prefix: string,
  length: number,
  entropySource: string,
) => {
  const b = Buffer.from(entropySource, 'hex');
  const b2 = Bitcore.crypto.Hash.sha256hmac(b, Buffer.from(prefix));

  return b2.slice(0, length);
};

/**
 * Creates a new Credentials object from an xPubKey
 * @param coin
 * @param xPubKey
 * @param account
 * @param derivationStrategy
 * @returns
 */
export const credentialsFromExtendedPublicKey = (
  coin: string,
  account = 0,
  derivationStrategy: string,
  useNativeSegwit: boolean,
  network: Network,
  hwKeyId: string,
  xPubKey?: string,
  hardwareSourcePublicKey?: string,
) => {
  // create request keys from entropy (hw wallets)
  const entropySourceHex =
    hardwareSourcePublicKey || (xPubKey && xPubKeyToEntropySource(xPubKey))!;
  const entropyBuffer = Buffer.from(entropySourceHex, 'hex');
  const entropySource =
    Bitcore.crypto.Hash.sha256sha256(entropyBuffer).toString('hex');

  const seed = hashFromEntropy('reqPrivKey', 32, entropySource);
  const privKey = new Bitcore.PrivateKey(seed.toString('hex'), network);
  const requestPrivKey = privKey.toString();
  const requestPubKey = privKey.toPublicKey().toString();
  const personalEncryptingKey = hashFromEntropy(
    'personalKey',
    16,
    entropySource,
  ).toString('base64');

  const m = 1;
  const n = 1;

  const addressType = useNativeSegwit
    ? n === 1
      ? Constants.SCRIPT_TYPES.P2WPKH
      : Constants.SCRIPT_TYPES.P2WSH
    : n === 1
    ? Constants.SCRIPT_TYPES.P2PKH
    : Constants.SCRIPT_TYPES.P2SH;

  const credentials = Credentials.fromObj({
    coin,
    chain: coin, // chain === coin for stored wallets
    keyId: hwKeyId,
    xPubKey,
    network,
    requestPrivKey,
    requestPubKey,
    personalEncryptingKey,
    account,
    derivationStrategy,
    compliantDerivation: true,
    n,
    m,
    copayerId: Utils.xPubToCopayerId(coin, xPubKey),
    publicKeyRing: [
      {
        xPubKey,
        requestPubKey,
      },
    ],
    addressType,
    version: 2,
    hardwareSourcePublicKey,
  });

  const walletPrivKey = privKey.toString();
  credentials.addWalletPrivateKey(walletPrivKey);

  return credentials;
};
