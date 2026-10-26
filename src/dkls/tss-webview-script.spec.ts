/**
 * @jest-environment-options {"customExportConditions": ["node", "require"]}
 */
import {Buffer as RNBuffer} from '@craftzdog/react-native-buffer';
import {restrictBufferApi} from '@test/rnBuffer';
import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {DKLS_JS_BASE64} from './vendor/dkls-wasm-js-base64';

jest.unmock('@bitpay-labs/bitcore-tss');
jest.mock('buffer', () => {
  const actual = jest.requireActual('buffer');
  return {
    ...actual,
    Buffer: require('@test/rnBuffer').restrictBufferApi(
      actual.Buffer,
      jest.requireActual('buffer/').Buffer,
    ),
  };
});

const nodeBuffer = global.Buffer;
global.Buffer = restrictBufferApi(nodeBuffer, RNBuffer);

const {ECDSA} = require('@bitpay-labs/bitcore-tss');
const bitcoreLib = require('@bitpay-labs/bitcore-lib');

jest.setTimeout(60000);

const loadWebModule = () => {
  const {TextDecoder, TextEncoder} = require('node:util');
  const source = nodeBuffer
    .from(DKLS_JS_BASE64, 'base64')
    .toString('utf8')
    .replace(/^export class /gm, 'class ')
    .replace(/^export \{ initSync \}/m, '')
    .replace(/^export default __wbg_init;/m, '')
    .replace(/import\.meta\.url/g, JSON.stringify('file:///dkls.js'));
  // eslint-disable-next-line no-new-func
  return new Function(
    'TextDecoder',
    'TextEncoder',
    source +
      '\nreturn {KeygenSession, Keyshare, Message, SignSession, SignSessionOTVariant, default: __wbg_init};',
  )(TextDecoder, TextEncoder);
};

const mountWebViewScript = async () => {
  const {DklsWorkerHost, requestDklsWorkerMount} = require('./DklsWorker');
  requestDklsWorkerMount();
  const requests: any[] = [];
  const listeners: Array<(event: {data: string}) => void> = [];
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(DklsWorkerHost), {
      createNodeMock: () => ({
        postMessage: (data: string) => {
          requests.push(JSON.parse(data));
          setImmediate(() => listeners.forEach(listener => listener({data})));
        },
      }),
    });
  });
  const {source, onMessage} = renderer.root.findByType('WebView' as any).props;
  const html: string = source.html;
  const script = html
    .slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'))
    .replace('await import(jsBlobUrl)', 'await importModule()');
  const timers: any[] = [];
  const track =
    (schedule: any) =>
    (...args: any[]) => {
      const timer = schedule(...args);
      timers.push(timer);
      return timer;
    };
  // eslint-disable-next-line no-new-func
  new Function(
    'window',
    'document',
    'fetch',
    'console',
    'importModule',
    'URL',
    'setTimeout',
    'setInterval',
    script,
  )(
    {
      ReactNativeWebView: {
        postMessage: (data: string) =>
          setImmediate(() => onMessage({nativeEvent: {data}})),
      },
      addEventListener: (_type: string, listener: any) =>
        listeners.push(listener),
    },
    {addEventListener: () => {}},
    async (url: string) => ({
      arrayBuffer: async () =>
        new Uint8Array(nodeBuffer.from(url.split(',')[1], 'base64')).buffer,
    }),
    {log: () => {}},
    async () => loadWebModule(),
    {createObjectURL: () => 'blob:dkls', revokeObjectURL: () => {}},
    track(setTimeout),
    track(setInterval),
  );
  return Object.assign(
    () => {
      timers.forEach(clearTimeout);
      act(() => renderer.unmount());
    },
    {requests},
  );
};

const toOtherParties = (messages: any[], partyId: number) =>
  JSON.parse(JSON.stringify(messages.filter(m => m.partyId !== partyId))).map(
    (m: any) => ({
      ...m,
      p2pMessages: m.p2pMessages.filter((p: any) => p.to === partyId),
    }),
  );

const runRounds = async (parties: any[], firstMessages: any[]) => {
  let messages = firstMessages;
  for (let round = 1; round <= 4; round++) {
    messages = await Promise.all(
      parties.map((party, i) => party.nextRound(toOtherParties(messages, i))),
    );
  }
};

describe('TSS ceremony through the production WebView script', () => {
  afterAll(() => {
    global.Buffer = nodeBuffer;
  });

  it('generates and signs 2-of-2 with base64 bytes and local messages', async () => {
    const unmount = await mountWebViewScript();
    try {
      const {callWorker} = require('./DklsWorker');
      await callWorker({type: 'init'});
      const authKeys = [
        new bitcoreLib.PrivateKey(),
        new bitcoreLib.PrivateKey(),
      ];
      const keygens = authKeys.map(
        (authKey, partyId) =>
          new ECDSA.KeyGen({
            n: 2,
            m: 2,
            partyId,
            seed: bitcoreLib.crypto.Random.getRandomBuffer(32),
            authKey,
          }),
      );
      await runRounds(
        keygens,
        await Promise.all(keygens.map(k => k.initJoin())),
      );
      const keychains = keygens.map(k => k.getKeyChain());
      expect(keychains[0].commonKeyChain).toBe(keychains[1].commonKeyChain);

      const messageHash = bitcoreLib.crypto.Hash.sha256(
        Buffer.from('tss-webview-script'),
      );
      const signers = authKeys.map(
        (authKey, partyId) =>
          new ECDSA.Sign({
            keychain: keychains[partyId],
            partyId,
            m: 2,
            n: 2,
            derivationPath: 'm/0/0',
            messageHash,
            authKey,
          }),
      );
      await runRounds(
        signers,
        await Promise.all(signers.map(s => s.initJoin())),
      );
      expect(signers[0].getSignature()).toEqual(signers[1].getSignature());

      expect(
        unmount.requests.filter(
          request =>
            request.className === 'Message' ||
            ['payload', 'from_id', 'to_id'].includes(request.method),
        ),
      ).toEqual([]);
      expect(
        unmount.requests.some(request =>
          request.args?.some(
            (arg: any) => typeof arg?.__dklsBytes === 'string',
          ),
        ),
      ).toBe(true);
    } finally {
      unmount();
    }
  });
});
