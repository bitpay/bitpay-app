import { Crypto } from '@peculiar/webcrypto';
import { install as installEd25519 } from '@solana/webcrypto-ed25519-polyfill';
import * as RNWasm from 'react-native-webassembly';

global.self ||= global;
global.globalThis ||= global;
global.window ||= global;
global.WebAssembly = RNWasm;
try { if (global.process) global.process.browser = true; } catch {}


if (typeof __dirname === 'undefined') {
  global.__dirname = '/';
}
if (typeof __filename === 'undefined') {
  global.__filename = '';
}
if (typeof process === 'undefined') {
  global.process = require('process');
} else {
  const bProcess = require('process');
  for (var p in bProcess) {
    if (!(p in process)) {
      process[p] = bProcess[p];
    }
  }
}

if (typeof global.crypto === 'undefined') {
  global.crypto = {};
}

if (!global.crypto.subtle) {
  const webcrypto = new Crypto();
  global.crypto.subtle = webcrypto.subtle;
}

installEd25519();

if (typeof BigInt === 'undefined') {
  global.BigInt = require('big-integer');
}

process.browser = false;
if (typeof Buffer === 'undefined') {
  global.Buffer = require('buffer').Buffer;
}

// global.location = global.location || { port: 80 }
const isDev = typeof __DEV__ === 'boolean' && __DEV__;
Object.assign(process.env, {NODE_ENV: isDev ? 'development' : 'production'});

if (typeof localStorage !== 'undefined') {
  // eslint-disable-next-line no-undef
  localStorage.debug = isDev ? '*' : '';
}

// If using the crypto shim, uncomment the following line to ensure
// crypto is loaded first, so it can populate global.crypto
// require('crypto')
