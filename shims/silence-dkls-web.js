import { callWorker } from '../src/dkls/DklsWorker';

const preview = (v) => {
  try { return JSON.stringify(v).slice(0, 200); } catch { return String(v).slice(0,200); }
};

export default async function init() {
  await callWorker({ type: 'init' });
}

async function toHandleJSON(m) {
  if (!m) return m;
  if (m instanceof Message) {
    return { payload: m._payload, from_id: m._from_id, to_id: m._to_id };
  }
  if (m && typeof m._id === 'number' && !m._ready) {
    return { _id: m._id };
  }
  
  if (m._ready && typeof m._ready.then === 'function') {
    try {
      await m._ready;
    } catch (e) {
    }
  }
  if (typeof m._objId === 'number') {
    return { _id: m._objId };
  }
  if (m._proxy && typeof m._proxy._id === 'number') {
    return { _id: m._proxy._id };
  }
  
  if (m && typeof m === 'object' && 'payload' in m && 'from_id' in m) {
    const payload = m.payload instanceof Uint8Array 
      ? m.payload 
      : Array.isArray(m.payload)
        ? new Uint8Array(m.payload)
        : new Uint8Array(Object.values(m.payload || {}));
    
    return {
      payload: Array.from(payload),
      from_id: m.from_id,
      to_id: m.to_id !== undefined ? m.to_id : undefined
    };
  }
  return m;
}

async function normalizeMsgsForBridge(msgs) {
  if (!Array.isArray(msgs)) {
    return msgs;
  }
  const normalized = await Promise.all(msgs.map(async (m, idx) => {
    const result = await toHandleJSON(m);
    return result;
  }));
  return normalized;
}

function wrap(objId) {
  return {
    _id: objId,
    call(method, ...args) {
      return callWorker({ type: 'call', objId, method, args });
    },
    free() {
      return callWorker({ type: 'free', objId });
    },
  };
}

function wrapAs(Cls, objId) {
  const o = Object.create(Cls.prototype);
  o._ready = Promise.resolve((o._proxy = wrap(objId)));
  o._objId = objId;
  o.toJSON = function(){ return { _id: this._objId ?? (this._proxy && this._proxy._id) }; };
  return o;
}

function wrapMessage(res) {
  return new Message(res.payload, res.from_id, res.to_id);
}

function toU8(x) {
  if (x == null) return undefined;
  if (x instanceof Uint8Array) return x;
  if (Array.isArray(x)) return new Uint8Array(x);
  
  if (typeof x === "object") {
    if (typeof x.__dklsBytes === 'string') return Buffer.from(x.__dklsBytes, 'base64');
    const keys = Object.keys(x);
    const isArrayLike = keys.length > 0 && keys.every((k, i) => k === String(i));
    
    if (isArrayLike) {
      return new Uint8Array(Object.values(x));
    }
    
    throw new Error(
      "toU8() requires Uint8Array or Array, got object with keys: [" + 
      keys.slice(0, 5).join(', ') + 
      (keys.length > 5 ? ', ...' : '') + 
      "]"
    );
  }
  
  throw new Error("toU8() requires Uint8Array or Array");
}

export class KeygenSession {
  constructor(participants, threshold, party_id, seed) {
    const seedArray = seed instanceof Uint8Array ? Array.from(seed) : seed;
    this._ready = callWorker({
      type: 'construct',
      className: 'KeygenSession',
      args: [participants, threshold, party_id, seedArray],
    }).then(({ objId }) => (this._proxy = wrap(objId)));
  }

  static async fromBytes(bytes) {
    const { objId } = await callWorker({
      type: 'staticConstruct',
      className: 'KeygenSession',
      method: 'fromBytes',
      args: [bytes],
    });
    return wrapAs(KeygenSession, objId);
  }

  static async initKeyRotation(keyshare, seed) {
    const { objId } = await callWorker({
      type: 'staticConstruct',
      className: 'KeygenSession',
      method: 'initKeyRotation',
      args: seed ? [keyshare, toU8(seed)] : [keyshare],
    });
    return wrapAs(KeygenSession, objId);
  }

  async toBytes() {
    await this._ready;
    const r = await this._proxy.call('toBytes');
    return toU8(r);
  }

  async createFirstMessage() {
    await this._ready;
    const res = await this._proxy.call('createFirstMessage');
    return res ? wrapMessage(res) : res;
  }

  async handleMessages(msgs, commitments, seed) {
    await this._ready;
    
    const safeMsgs = await normalizeMsgsForBridge(msgs);
    
    let safeCommitments = commitments;
    if (commitments && Array.isArray(commitments)) {
      safeCommitments = commitments.map(c => c instanceof Uint8Array ? Array.from(c) : c);
    }
    
    const res = await this._proxy.call('handleMessages', safeMsgs, safeCommitments, seed);
    
    if (Array.isArray(res)) {
      return res.map(wrapMessage);
    }
    return res;
  }

  async keyshare() {
    await this._ready;
    const res = await this._proxy.call('keyshare');
    if (res && res.objId) {
      return new Keyshare(res.objId);
    }
    if (res && typeof res.__wbg_ptr === 'number') {
      return new Keyshare(res.__wbg_ptr);
    }
    return res;
  }

  async calculateChainCodeCommitment() {
    await this._ready;
    const res = await this._proxy.call('calculateChainCodeCommitment');
    return res instanceof Uint8Array ? res : new Uint8Array(res || []);
  }
}

export class SignSession {
  constructor(keyshare, chain_path, seed) {
    const seedArray = seed instanceof Uint8Array ? Array.from(seed) : seed;
    this._ready = callWorker({
      type: 'construct',
      className: 'SignSession',
      args: [keyshare, chain_path, seedArray],
    }).then(({ objId }) => (this._proxy = wrap(objId)));
  }

  async createFirstMessage() {
    await this._ready;
    const res = await this._proxy.call('createFirstMessage');
    return res ? wrapMessage(res) : res;
  }

  async handleMessages(msgs, commitments, seed) {
    await this._ready;
    const safeMsgs = await normalizeMsgsForBridge(msgs);
    
    let safeCommitments = commitments;
    if (commitments && Array.isArray(commitments)) {
      safeCommitments = commitments.map(c => c instanceof Uint8Array ? Array.from(c) : c);
    }
    
    const res = await this._proxy.call('handleMessages', safeMsgs, safeCommitments, seed);
    
    if (Array.isArray(res)) {
      return res.map(wrapMessage);
    }
    return res;
  }

  async lastMessage(message_hash) {
    await this._ready;
    const r = await this._proxy.call('lastMessage', message_hash);
    return r ? wrapMessage(r) : r;
  }

  async combine(msgs) {
    await this._ready;
    const safeMsgs = await normalizeMsgsForBridge(msgs);
    const r = await this._proxy.call('combine', safeMsgs);
    return r;
  }
}

export class Message {
  constructor(payload, from_id, to_id) {
    const u8 = payload instanceof Uint8Array 
      ? payload 
      : Array.isArray(payload)
        ? new Uint8Array(payload)
        : toU8(payload || []);
    
    this._ready = Promise.resolve();
    this._payload = u8;
    this._from_id = from_id;
    this._to_id = to_id;

    this._isFreed = false;
  }

  async payload() { 
    return this._payload;
  }
  
  async from_id() { return this._from_id; }
  async to_id()   { return this._to_id; }
  async free() { 
    this._isFreed = true;
  }
}

export class Keyshare {
  constructor(objId) {
    if (typeof objId === 'number') {
      this._ready = Promise.resolve((this._proxy = wrap(objId)));
      this._objId = objId;
    } else {
      this._ready = Promise.reject(new Error('Keyshare should be obtained from KeygenSession.keyshare()'));
    }
  }

  static async fromBytes(bytes) {
    const { objId } = await callWorker({
      type: 'staticConstruct',
      className: 'Keyshare',
      method: 'fromBytes',
      args: [bytes],
    });
    return wrapAs(Keyshare, objId);
  }
  
  async partyId() {
    await this._ready;
    return this._proxy.call('partyId');
  }

  async toBytes() { 
    await this._ready; 
    try {
        const r = await this._proxy.call('toBytes'); 
        return toU8(r);
    } catch (error) {
        throw error;
    }
  }
  
  async free() { 
    await this._ready; 
    return this._proxy.free(); 
  }
}

export class SignSessionOTVariant {
  constructor(keyshare, chain_path, seed) {
    let keyshareHandle;
    if (typeof keyshare === 'object' && keyshare !== null) {
      keyshareHandle = keyshare._objId || (keyshare._proxy && keyshare._proxy._id) || keyshare;
    } else {
      throw new Error('Invalid keyshare object');
    }
    
    const seedArray = seed instanceof Uint8Array ? Array.from(seed) : seed;
    
    const args = seedArray 
      ? [{ _id: keyshareHandle }, chain_path, seedArray] 
      : [{ _id: keyshareHandle }, chain_path];
    
    this._ready = callWorker({
      type: 'construct',
      className: 'SignSessionOTVariant',
      args: args,
    }).then(({ objId }) => {
      this._proxy = wrap(objId);
      this._objId = objId;
      return this._proxy;
    });
  }

  static async fromBytes(bytes) {
    const { objId } = await callWorker({
      type: 'staticConstruct',
      className: 'SignSessionOTVariant',
      method: 'fromBytes',
      args: [bytes],
    });
    return wrapAs(SignSessionOTVariant, objId);
  }

  async toBytes() {
    await this._ready;
    const r = await this._proxy.call('toBytes');
    return toU8(r);
  }

  async createFirstMessage() {
    await this._ready;
    const res = await this._proxy.call('createFirstMessage');
    return res ? wrapMessage(res) : res;
  }

  async handleMessages(msgs) {
    await this._ready;
    const safeMsgs = await normalizeMsgsForBridge(msgs);
    const res = await this._proxy.call('handleMessages', safeMsgs);
    
    if (Array.isArray(res)) {
      return res.map(wrapMessage);
    }
    return res;
  }

  async lastMessage(message_hash) {
    await this._ready;
    const messageHashArray = message_hash instanceof Uint8Array ? Array.from(message_hash) : message_hash;
    const res = await this._proxy.call('lastMessage', messageHashArray);
    return res ? wrapMessage(res) : res;
  }

  async combine(msgs) {
    await this._ready;
    const safeMsgs = await normalizeMsgsForBridge(msgs);
    const r = await this._proxy.call('combine', safeMsgs);
    return r;
  }

  async free() {
    await this._ready;
    return this._proxy.free();
  }
}

try {
  module.exports = { __esModule: true, default: init, KeygenSession, SignSession, SignSessionOTVariant, Message, Keyshare };
} catch {}