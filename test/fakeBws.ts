import {randomUUID} from 'crypto';

const {
  Constants,
  Utils,
} = require('@bitpay-labs/bitcore-wallet-client/ts_build/src/lib/common');

type BwsResponse = {status: number; body: any};

const clone = (value: any) =>
  value === undefined ? undefined : JSON.parse(JSON.stringify(value));

const bwsError = (code: string, message = code) =>
  Object.assign(new Error(message), {code});

const createState = () => ({
  sessions: new Map<string, any>(),
  wallets: new Map<string, any>(),
  txps: new Map<string, any>(),
});

let state = createState();

const getSession = (kind: string, id: string) => {
  const sessionKey = `${kind}:${id}`;
  if (!state.sessions.has(sessionKey)) {
    state.sessions.set(sessionKey, {
      rounds: {},
      partyByCopayer: {},
      participants: [],
      publicKey: null,
      signature: null,
      secret: null,
    });
  }
  return state.sessions.get(sessionKey);
};

const walletView = (wallet: any) => ({
  ...clone(wallet),
  publicKeyRing: wallet.copayers.map((c: any) => ({
    xPubKey: c.xPubKey,
    requestPubKey: c.requestPubKey,
  })),
});

const deriveWalletAddress = (wallet: any, path: string) =>
  Utils.deriveAddress(
    wallet.addressType,
    walletView(wallet).publicKeyRing,
    path,
    wallet.m,
    wallet.network,
    wallet.chain,
    undefined,
    undefined,
    wallet.clientDerivedPublicKey,
  );

const walletOf = (copayerId: string) => {
  const wallet = [...state.wallets.values()].find(w =>
    w.copayers.some((c: any) => c.id === copayerId),
  );
  if (!wallet) {
    throw bwsError('NOT_AUTHORIZED', 'Copayer not found');
  }
  return wallet;
};

const routes: Array<
  [
    string,
    RegExp,
    (
      match: string[],
      body: any,
      copayerId: string,
      query: URLSearchParams,
    ) => any,
  ]
> = [
  [
    'post',
    /^\/v1\/tss\/(keygen|sign)\/([^/]+)\/store$/,
    ([, kind, id], {publicKey, signature}) => {
      Object.assign(
        getSession(kind, id),
        kind === 'keygen' ? {publicKey} : {signature},
      );
      return {};
    },
  ],
  [
    'post',
    /^\/v1\/tss\/keygen\/([^/]+)\/secret$/,
    ([, id], {secret, secrets}) => {
      Object.assign(getSession('keygen', id), {secret, secrets});
      return {};
    },
  ],
  [
    'get',
    /^\/v1\/tss\/keygen\/([^/]+)\/secret$/,
    ([, id]) => {
      const {secret, secrets = {}} = getSession('keygen', id);
      if (!secret) {
        throw bwsError('TSS_BWS_JOIN_SECRET_NOT_FOUND');
      }
      return {secret, secrets};
    },
  ],
  [
    'get',
    /^\/v1\/tss\/(keygen|sign)\/([^/]+)\/(\d+)$/,
    ([, kind, id, round], _body, copayerId) => {
      const session = getSession(kind, id);
      const partyId = session.partyByCopayer[copayerId];
      const messages = Object.values(session.rounds[round] || {})
        .filter((m: any) => m.partyId !== partyId)
        .map((m: any) => ({
          ...m,
          p2pMessages: m.p2pMessages.filter((p: any) => p.to === partyId),
        }));
      return kind === 'keygen'
        ? {messages, publicKey: session.publicKey}
        : {
            messages,
            participants: session.participants,
            signature: session.signature,
          };
    },
  ],
  [
    'post',
    /^\/v1\/tss\/(keygen|sign)\/([^/]+)$/,
    ([, kind, id], {message}, copayerId) => {
      const session = getSession(kind, id);
      session.rounds[message.round] = {
        ...session.rounds[message.round],
        [message.partyId]: message,
      };
      session.partyByCopayer[copayerId] = message.partyId;
      if (!session.participants.includes(copayerId)) {
        session.participants.push(copayerId);
      }
      return {};
    },
  ],
  [
    'post',
    /^\/v2\/wallets\/$/,
    (_match, body) => {
      const id = randomUUID();
      state.wallets.set(id, {
        id,
        name: body.name,
        m: body.m,
        n: body.n,
        coin: body.coin,
        chain: body.chain,
        network: body.network,
        tssKeyId: body.tssKeyId,
        clientDerivedPublicKey: body.clientDerivedPublicKey,
        addressType: Constants.UTXO_CHAINS.includes(body.chain)
          ? Constants.SCRIPT_TYPES.P2WPKH
          : Constants.SCRIPT_TYPES.P2PKH,
        status: 'pending',
        copayers: [],
        addresses: [],
      });
      return {walletId: id};
    },
  ],
  [
    'post',
    /^\/v2\/wallets\/([^/]+)\/copayers$/,
    ([, walletId], body, copayerId) => {
      const wallet = state.wallets.get(walletId);
      if (!wallet) {
        throw bwsError('WALLET_NOT_FOUND');
      }
      if (wallet.copayers.some((c: any) => c.id === copayerId)) {
        throw bwsError('COPAYER_REGISTERED', 'Copayer ID already registered');
      }
      wallet.copayers.push({
        id: copayerId,
        name: body.name,
        xPubKey: body.xPubKey,
        requestPubKey: body.requestPubKey,
        customData: body.customData,
        signature: body.copayerSignature,
        clientDerivedPublicKey: body.clientDerivedPublicKey,
        requestPubKeys: [
          {key: body.requestPubKey, signature: body.copayerSignature},
        ],
      });
      if (wallet.copayers.length >= wallet.n) {
        wallet.status = 'complete';
      }
      return {wallet: walletView(wallet), copayerId};
    },
  ],
  [
    'get',
    /^\/v3\/wallets\/$/,
    (_match, _body, copayerId) => ({
      wallet: walletView(walletOf(copayerId)),
      balance: {totalAmount: 0, availableAmount: 0, lockedAmount: 0},
      pendingTxps: [],
      preferences: {},
      serverMessages: [],
    }),
  ],
  [
    'post',
    /^\/v4\/addresses\/$/,
    (_match, _body, copayerId) => {
      const wallet = walletOf(copayerId);
      if (
        Constants.EVM_CHAINS.includes(wallet.chain) &&
        wallet.addresses.length
      ) {
        return wallet.addresses[0];
      }
      const path = `m/0/${wallet.addresses.length}`;
      const address = {
        ...deriveWalletAddress(wallet, path),
        type: wallet.addressType,
        walletId: wallet.id,
        coin: wallet.coin,
        chain: wallet.chain,
        network: wallet.network,
        isChange: false,
      };
      wallet.addresses.push(address);
      return address;
    },
  ],
  [
    'get',
    /^\/v2\/addresses$/,
    (_match, _body, copayerId, query) => {
      const addresses = [...walletOf(copayerId).addresses];
      if (query.get('reverse') === '1') {
        addresses.reverse();
      }
      const limit = Number(query.get('limit')) || addresses.length;
      return addresses.slice(0, limit);
    },
  ],
  [
    'post',
    /^\/v3\/txproposals\/$/,
    (_match, body, copayerId) => {
      const wallet = walletOf(copayerId);
      const gasPrice = body.gasPrice ?? 1000000000;
      const gasLimit = body.outputs[0]?.gasLimit ?? 21000;
      const txp = {
        ...body,
        id: randomUUID(),
        version: 3,
        walletId: wallet.id,
        creatorId: copayerId,
        chain: wallet.chain,
        coin: wallet.coin,
        network: wallet.network,
        from: deriveWalletAddress(wallet, 'm/0/0').address,
        amount: body.outputs.reduce((sum: number, o: any) => sum + o.amount, 0),
        nonce: 0,
        gasPrice,
        gasLimit,
        fee: gasPrice * gasLimit,
        requiredSignatures: 1,
        status: 'temporary',
        actions: [],
        createdOn: Math.floor(Date.now() / 1000),
      };
      state.txps.set(txp.id, txp);
      return txp;
    },
  ],
  [
    'post',
    /^\/v2\/txproposals\/([^/]+)\/publish$/,
    ([, id], {proposalSignature}) =>
      Object.assign(state.txps.get(id), {proposalSignature, status: 'pending'}),
  ],
  [
    'post',
    /^\/v2\/txproposals\/([^/]+)\/signatures$/,
    ([, id], {signatures}, copayerId) => {
      const txp = state.txps.get(id);
      txp.actions.push({copayerId, type: 'accept', signatures});
      txp.status = 'accepted';
      return txp;
    },
  ],
];

const respond = (
  method: string,
  url: string,
  headers: Record<string, string>,
  body: any,
): BwsResponse => {
  const {pathname, searchParams} = new URL(url, 'http://fake-bws');
  const path = pathname.replace(/^.*?(\/v\d+\/)/, '$1');
  for (const [routeMethod, pattern, handler] of routes) {
    const match = path.match(pattern);
    if (routeMethod === method && match) {
      try {
        return {
          status: 200,
          body: clone(
            handler(
              match,
              clone(body) || {},
              headers['x-identity'],
              searchParams,
            ),
          ),
        };
      } catch (e: any) {
        return {status: 400, body: {code: e.code, message: e.message}};
      }
    }
  }
  return {
    status: 400,
    body: {code: 'FAKE_BWS_UNHANDLED', message: `${method} ${path}`},
  };
};

const request = (method: string) => (url: string) => {
  const headers: Record<string, string> = {};
  let body: any;
  const chain: any = {
    accept: () => chain,
    set: (key: string, value: string) => {
      headers[key] = value;
      return chain;
    },
    send: (payload: any) => {
      body = payload;
      return chain;
    },
    query: () => chain,
    timeout: () => chain,
    end: (cb: (err: any, res: any) => void) =>
      setImmediate(() =>
        cb(null, {...respond(method, url, headers, body), header: {}}),
      ),
  };
  return chain;
};

export const fakeBwsAgent = {
  get: request('get'),
  post: request('post'),
  put: request('put'),
  delete: request('delete'),
};

export const resetFakeBws = () => {
  state = createState();
};
