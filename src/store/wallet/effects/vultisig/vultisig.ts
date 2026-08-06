import {fetch as nitroFetch} from 'react-native-nitro-fetch';
import {Chain, Vultisig} from '@vultisig/sdk';
import {Network} from '../../../../constants';
import {Effect} from '../../../index';
import {BwcProvider} from '../../../../lib/bwc';
import {setHomeCarouselConfig} from '../../../app/app.actions';
import {logManager} from '../../../../managers/LogManager';
import {Key, TransactionProposal, Wallet} from '../../wallet.models';
import {successCreateKey} from '../../wallet.actions';
import {IsUtxoChain} from '../../utils/currency';
import {startImportFromExtendedPublicKeyWallet} from '../import/import';
import {createWalletAddress} from '../address/address';
import {startUpdateWalletStatus} from '../status/status';

const BWC = BwcProvider.getInstance();
const BITCOIN_TESTNET_ACCOUNT_PATH = "m/84'/1'/0'";
const SDK_FAST_VAULT_URL = 'http://127.0.0.1:8670/vault';
const SDK_MPC_RELAY_URL = 'http://127.0.0.1:8671';
const LOCAL_NON_DELIVERABLE_EMAIL = 'local-verification@vultisig.invalid';

let sdk: Vultisig | undefined;
let sdkTransportQueue: Promise<unknown> = Promise.resolve();

const withSdkTransport = <T>(operation: () => Promise<T>): Promise<T> => {
  const execute = async () => {
    const previousFetch = globalThis.fetch;
    globalThis.fetch = ((input, init) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
          ? input.toString()
          : input.url;

      // Keep the entire local relay exchange on Nitro. Mixing the standard RN
      // fetch into /complete can receive the 200 response but hang while
      // consuming its small JSON body on Android.
      if (url.includes('/complete/')) {
        const headers = new Headers(init?.headers);
        headers.set('cache-control', 'no-cache');
        headers.set('pragma', 'no-cache');
        return nitroFetch(input, {
          ...init,
          cache: 'no-store',
          headers,
        });
      }

      if (
        url.startsWith(SDK_MPC_RELAY_URL) &&
        (!init?.method || init.method === 'GET')
      ) {
        const headers = new Headers(init?.headers);
        headers.set('cache-control', 'no-cache');
        headers.set('pragma', 'no-cache');
        return nitroFetch(input, {
          ...init,
          cache: 'no-store',
          headers,
        });
      }

      return nitroFetch(input, init);
    }) as typeof globalThis.fetch;

    try {
      return await operation();
    } finally {
      globalThis.fetch = previousFetch;
    }
  };

  const result = sdkTransportQueue.then(execute, execute);
  sdkTransportQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
};

const getSdk = async (): Promise<Vultisig> => {
  if (!sdk) {
    sdk = new Vultisig({
      defaultChains: [Chain.Bitcoin],
      serverEndpoints: {
        fastVault: SDK_FAST_VAULT_URL,
        messageRelay: SDK_MPC_RELAY_URL,
      },
      autoInit: false,
      onPasswordRequired: async () => {
        throw new Error('Enter the Fast Vault password in BitPay to sign.');
      },
    });
  }
  if (!sdk.initialized) {
    await sdk.initialize();
  }
  return sdk;
};

export const createVultisigFastVault = async ({
  name,
  password,
  signal,
  onProgress,
}: {
  name: string;
  password: string;
  signal?: AbortSignal;
  onProgress?: (step: unknown) => void;
}): Promise<string> => {
  return withSdkTransport(async () => {
    const vultisig = await getSdk();
    return vultisig.createFastVault({
      name,
      // Upstream VultiServer requires this legacy request field even when its
      // email queue is disabled. `.invalid` is reserved and non-deliverable.
      email: LOCAL_NON_DELIVERABLE_EMAIL,
      password,
      signal,
      persistPending: true,
      // Do not show the verification step until VultiServer has persisted its
      // share and generated the code. A local debug/WASM keygen can take more
      // than one minute on a cold Metro bundle.
      waitForServerKeygenComplete: true,
      onProgress: onProgress as any,
    });
  });
};

export const verifyVultisigFastVault = async (
  vaultId: string,
  code: string,
) => {
  return withSdkTransport(async () => {
    const vultisig = await getSdk();
    return vultisig.verifyVault(vaultId, code);
  });
};

export const getExistingVultisigFastVault = async (): Promise<
  {id: string; name: string} | undefined
> => {
  const vultisig = await getSdk();
  const vaults = await vultisig.listVaults();
  const vault = vaults.find(candidate => candidate.type === 'fast');
  return vault ? {id: vault.id, name: vault.name} : undefined;
};

export const getPendingVultisigFastVaultId = async (): Promise<
  string | undefined
> => {
  const vultisig = await getSdk();
  const [vaultId] = await vultisig.listPendingVaults();
  return vaultId;
};

export const registerVultisigBitcoinTestnetWallet =
  (vaultId: string): Effect<Promise<{key: Key; wallet: Wallet}>> =>
  async dispatch => {
    const vultisig = await getSdk();
    const vault = await vultisig.getVaultById(vaultId);
    if (!vault) {
      throw new Error('The verified Vultisig Fast Vault was not found.');
    }

    const externalSigner = {
      type: 'vultisig-fast' as const,
      vaultId: vault.id,
      accountPath: BITCOIN_TESTNET_ACCOUNT_PATH,
    };
    const key: Key = {
      id: `vultisig/${vault.id}`,
      wallets: [],
      properties: undefined,
      methods: undefined,
      backupComplete: true,
      keyName: vault.name,
      totalBalance: 0,
      totalBalanceLastDay: 0,
      hideKeyBalance: false,
      isReadOnly: true,
      externalSigner,
    };
    const xPubKey = vault.extendedPublicKey({
      derivePath: BITCOIN_TESTNET_ACCOUNT_PATH,
      network: 'testnet',
    });
    const wallet = await dispatch(
      startImportFromExtendedPublicKeyWallet({
        key,
        externalSigner,
        xPubKey,
        accountPath: BITCOIN_TESTNET_ACCOUNT_PATH,
        coin: 'btc',
        chain: 'btc',
        derivationStrategy: 'BIP84',
        accountNumber: 0,
        network: Network.testnet,
      }),
    );

    key.wallets = [wallet];
    dispatch(successCreateKey({key}));
    dispatch(setHomeCarouselConfig({id: key.id, show: true}));

    await dispatch(createWalletAddress({wallet, newAddress: false}));
    await dispatch(startUpdateWalletStatus({key, wallet, force: true}));

    return {key, wallet};
  };

export const requiresVultisigFastSigning = (
  wallet: Wallet,
  key: Key,
): boolean =>
  key.externalSigner?.type === 'vultisig-fast' &&
  wallet.externalSignerData?.type === 'vultisig-fast';

const pushSignatures = (
  wallet: Wallet,
  txp: TransactionProposal,
  signatures: string[],
): Promise<TransactionProposal> =>
  new Promise((resolve, reject) => {
    wallet.pushSignatures(
      txp as any,
      signatures,
      (err?: Error, signedTxp?: any) => {
        if (err) {
          reject(err);
          return;
        }
        if (!signedTxp) {
          reject(new Error('BitPay did not return the signed transaction.'));
          return;
        }
        resolve(signedTxp as TransactionProposal);
      },
      undefined,
    );
  });

export const signTxWithVultisigFast = async ({
  wallet,
  key,
  txp,
  password,
  signal,
}: {
  wallet: Wallet;
  key: Key;
  txp: TransactionProposal;
  password: string;
  signal?: AbortSignal;
}): Promise<TransactionProposal> => {
  const metadata = key.externalSigner;
  if (!metadata || metadata.type !== 'vultisig-fast') {
    throw new Error('The key is not backed by a Vultisig Fast Vault.');
  }
  if (
    txp.chain.toLowerCase() !== 'btc' ||
    !['testnet', 'testnet4'].includes(String(txp.network).toLowerCase()) ||
    !IsUtxoChain(txp.chain)
  ) {
    throw new Error(
      'Vultisig signing currently supports Bitcoin Testnet4 only.',
    );
  }
  if (!password) {
    throw new Error('A Vultisig Fast Vault password is required.');
  }

  const vultisig = await getSdk();
  const vault = await vultisig.getVaultById(metadata.vaultId);
  if (!vault) {
    throw new Error('The Vultisig Fast Vault for this wallet was not found.');
  }

  const inputPaths = txp.inputPaths || [];
  if (
    !inputPaths.length ||
    inputPaths.length !== txp.inputs.length ||
    inputPaths.some(path => !path)
  ) {
    throw new Error(
      'BitPay did not provide one derivation path per Bitcoin input.',
    );
  }

  const Bitcore = BWC.getBitcore();
  const CWC = BWC.getCore();
  const utils = BWC.getUtils();
  const tx = utils.buildTx(txp);
  const serialized = tx.uncheckedSerialize();
  const rawTx = Array.isArray(serialized) ? serialized[0] : serialized;
  const accountXPub = new Bitcore.HDPublicKey(
    wallet.credentials.clientDerivedPublicKey || wallet.credentials.xPubKey,
  );
  const signatures: string[] = [];

  await vault.unlock(password);
  try {
    for (let index = 0; index < inputPaths.length; index++) {
      const relativePath = inputPaths[index]!;
      const publicKey = accountXPub
        .deriveChild(relativePath)
        .publicKey.toString();
      const messageHash = CWC.Transactions.getSighash({
        chain: txp.chain,
        network: txp.network,
        tx: rawTx,
        index,
        utxos: txp.inputs,
        pubKey: publicKey,
      });
      const derivePath = `${metadata.accountPath}/${relativePath.replace(
        /^m\//,
        '',
      )}`;
      logManager.debug(
        `[Vultisig] Signing Bitcoin input ${index + 1}/${inputPaths.length}`,
      );
      const signature = await withSdkTransport(() =>
        vault.signBytes(
          {data: messageHash, chain: Chain.Bitcoin, derivePath},
          {signal},
        ),
      );
      if (!signature.signature) {
        throw new Error('Vultisig returned an invalid ECDSA signature.');
      }
      const parsedSignature = Bitcore.crypto.Signature.fromString(
        signature.signature.replace(/^0x/, ''),
      );
      signatures.push(
        CWC.Transactions.transformSignatureObject({
          chain: txp.chain.toUpperCase(),
          obj: {r: parsedSignature.r, s: parsedSignature.s},
          sigtype: 1,
        }),
      );
    }
  } finally {
    vault.lock();
  }

  return pushSignatures(wallet, txp, signatures);
};
