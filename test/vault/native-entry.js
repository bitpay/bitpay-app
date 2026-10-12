// Alternate Metro entry for a dedicated test build. Uses only synthetic files
// in its own cache directory; never calls preparation or reads a wallet.
import React, {useEffect, useState} from 'react';
import {AppRegistry, Platform, Text, TurboModuleRegistry} from 'react-native';
import RNFS from 'react-native-fs';
import {MMKV} from 'react-native-mmkv';
import {Buffer} from 'buffer';
import {MD5} from 'crypto-js';
import {requireLogicallyEmpty} from '../../src/store/vault-runtime';
import {name as appName} from '../../app.json';

const path = RNFS.CachesDirectoryPath + '/bip02-native-read-proof-decision11';
const marker = path + '/phase';
// Pinned Android core hashes IDs when a custom directory is supplied.
const fileFor = id =>
  path +
  '/' +
  (Platform.OS === 'android' ? MD5(path + '/' + id).toString() : id);
const data = fileFor('mmkv.default');
const crc = data + '.crc';
const check = condition => {
  if (!condition) throw new Error('Native lifecycle assertion failed');
};
const phase = async name => RNFS.writeFile(marker, name, 'utf8');
const openLegacy = () => new MMKV({id: 'mmkv.default', path});

async function readProof() {
  const results = [];
  const verify = async (name, file, expected) => {
    let accepted = false;
    try {
      await requireLogicallyEmpty({data: file, crc: file + '.crc'});
      accepted = true;
    } catch {}
    check(accepted === expected);
    results.push({name, accepted});
  };
  const file = path + '/synthetic-read-boundary';
  for (const [header, current, last, version, expected] of [
    [0, 0, 0, 4, true],
    [4, 4, 4, 4, true],
    [1, 2, 3, 4, true],
    [5, 0, 0, 4, false],
    [0, 5, 0, 4, false],
    [0, 0, 5, 4, false],
    [0, 5, 0, 3, false],
    [0, 0, 5, 3, false],
    [0, 5338, 4, 4, false],
    [5338, 5338, 4, 4, false],
    [4, 900, 900, 2, true],
    [4, 4, 4, 6, true],
  ]) {
    const headerBytes = Buffer.alloc(4);
    const meta = Buffer.alloc(36);
    headerBytes.writeUInt32LE(header, 0);
    meta.writeUInt32LE(version, 4);
    meta.writeUInt32LE(current, 28);
    meta.writeUInt32LE(last, 32);
    await RNFS.writeFile(file, headerBytes.toString('base64'), 'base64');
    await RNFS.writeFile(file + '.crc', meta.toString('base64'), 'base64');
    await verify(
      'bounds:' + [header, current, last, version].join('/'),
      file,
      expected,
    );
  }
  await RNFS.writeFile(file, 'AA==', 'base64');
  await verify('short header', file, false);
  await RNFS.unlink(file + '.crc');
  await verify('missing metadata', file, false);
  for (const kind of ['empty', 'logs', 'deleted']) {
    const id = 'bip02.read.' + kind;
    const store = new MMKV({id, path});
    if (kind === 'logs') store.set('persist:logs', 'synthetic logs');
    if (kind === 'deleted') {
      store.set('synthetic', 'unfunded deleted value');
      store.delete('synthetic');
    }
    check(store.getAllKeys().length === (kind === 'logs' ? 1 : 0));
    await verify('native:' + kind, fileFor(id), kind === 'empty');
  }
  await RNFS.writeFile(
    path + '/read-results.json',
    JSON.stringify(results),
    'utf8',
  );
}

async function run() {
  await RNFS.mkdir(path);
  const stage = (await RNFS.exists(marker))
    ? await RNFS.readFile(marker, 'utf8')
    : 'new';
  const modern = new MMKV({id: 'bitpay.wallet.v2', path});
  const claim = () =>
    TurboModuleRegistry.getEnforcing('MmkvCxx').claimLegacyRetirement();
  if (stage === 'new') {
    await readProof();
    const old = openLegacy();
    old.set('synthetic', 'unfunded fixture');
    modern.set('synthetic', 'modern fixture');
    await RNFS.writeFile(path + '/unrelated', 'preserve', 'utf8');
    check(!claim());
    await phase('warm');
    return 'Warm refusal passed. Reload JavaScript without terminating the app.';
  }
  if (stage === 'warm') {
    check(!claim());
    check(await RNFS.exists(data));
    check(await RNFS.exists(crc));
    await phase('cold');
    return 'JS reload refusal passed. Terminate the native process and relaunch.';
  }
  check(claim());
  check(modern.getString('synthetic') === 'modern fixture');
  if (stage === 'cold') {
    check(await RNFS.exists(data));
    check(await RNFS.exists(crc));
    await RNFS.unlink(data);
    await phase('partial');
    return 'First unlink passed. Terminate the native process and relaunch.';
  }
  if (stage === 'partial') {
    check(!(await RNFS.exists(data)));
    check(await RNFS.exists(crc));
    await RNFS.unlink(crc);
  }
  let rejected = false;
  try {
    openLegacy();
  } catch {
    rejected = true;
  }
  check(rejected);
  check(!(await RNFS.exists(data)) && !(await RNFS.exists(crc)));
  check((await RNFS.readFile(path + '/unrelated', 'utf8')) === 'preserve');
  await phase('passed');
  return 'Cold reopen, partial removal, sealed old opens and unrelated-file preservation passed.';
}

const execution = run();
function Probe() {
  const [result, setResult] = useState('Running native lifecycle probe…');
  useEffect(() => {
    execution.then(setResult, () =>
      setResult('FAILED: native lifecycle assertion'),
    );
  }, []);
  return <Text accessibilityLabel="native-lifecycle-result">{result}</Text>;
}
AppRegistry.registerComponent(appName, () => Probe);
