import React, {useRef, useEffect, useState, useSyncExternalStore} from 'react';
import {View, StyleSheet} from 'react-native';
import {WebView, WebViewMessageEvent} from 'react-native-webview';
import {DKLS_JS_BASE64} from './vendor/dkls-wasm-js-base64';
import {DKLS_WASM_BASE64} from './vendor/dkls-wasm-base64';

const WORKER_LOGS_ENABLED = false;

type Pending = {
  resolve: (v: any) => void;
  reject: (e: any) => void;
};

const BOOT_TIMEOUT_MS = 20000;

let _post: ((data: any) => void) | null = null;
let _isReady = false;
let _readyResolve: (() => void) | null = null;
let _readyReject: ((e: Error) => void) | null = null;
let _bootTimer: ReturnType<typeof setTimeout> | null = null;
let _readyPromise: Promise<void>;
const resetReadiness = () => {
  _readyPromise = new Promise<void>((res, rej) => {
    _readyResolve = res;
    _readyReject = rej;
  });
  _readyPromise.catch(() => {});
};
resetReadiness();
const _outQueue: string[] = [];
const pendings = new Map<number, Pending>();
let seq = 1;

let _mountRequested = false;
let _bootAttempt = 0;
const _mountListeners = new Set<() => void>();

const clearBootTimer = () => {
  if (_bootTimer) {
    clearTimeout(_bootTimer);
    _bootTimer = null;
  }
};

const failBoot = (reason: string) => {
  if (_isReady || !_readyReject) {
    return;
  }
  clearBootTimer();
  const reject = _readyReject;
  _readyResolve = null;
  _readyReject = null;
  // Unmount the failed WebView and start over on the next call, so one
  // failed boot doesn't disable TSS until the app restarts. Calls already
  // waiting hold the old promise and are rejected below.
  resetReadiness();
  _mountRequested = false;
  _bootAttempt++;
  _mountListeners.forEach(listener => listener());
  reject(new Error(`DKLS worker failed to start: ${reason}`));
};

export function requestDklsWorkerMount(): void {
  if (_mountRequested) {
    return;
  }
  _mountRequested = true;
  _mountListeners.forEach(listener => listener());
}

const subscribeDklsMount = (listener: () => void): (() => void) => {
  _mountListeners.add(listener);
  return () => {
    _mountListeners.delete(listener);
  };
};

// A monotonic generation for useSyncExternalStore: 0 while unmounted, and a
// fresh positive value each time a boot fails and the worker is re-requested.
// Keying the WebView on it forces a brand-new instance even when a failed boot
// and the next mount request land in the same render batch — a boolean snapshot
// would read false→true as "no change" and leave the dead WebView mounted with
// no boot timer, so the new call would never settle.
const getDklsMountGeneration = (): number =>
  _mountRequested ? _bootAttempt + 1 : 0;

const encodeBytes = (bytes: Uint8Array): number[] | {__dklsBytes: string} =>
  bytes.length < 128
    ? Array.from(bytes)
    : {
        __dklsBytes: Buffer.from(
          bytes.buffer,
          bytes.byteOffset,
          bytes.byteLength,
        ).toString('base64'),
      };

const processArgs = (args: any): any => {
  if (!Array.isArray(args)) return args;

  return args.map(arg => {
    if (arg instanceof Uint8Array) {
      return encodeBytes(arg);
    }
    if (Array.isArray(arg)) {
      return processArgs(arg);
    }
    if (arg && typeof arg === 'object') {
      const processed = {};
      for (const key in arg) {
        // @ts-ignore
        processed[key] =
          arg[key] instanceof Uint8Array ? encodeBytes(arg[key]) : arg[key];
      }
      return processed;
    }
    return arg;
  });
};

export async function callWorker<T = any>(msg: any): Promise<T> {
  requestDklsWorkerMount();
  const id = ++seq;
  const processedMsg = {
    ...msg,
    args: msg.args ? processArgs(msg.args) : undefined,
  };
  const payload = JSON.stringify({id, ...processedMsg});

  const t0 = Date.now();
  if (WORKER_LOGS_ENABLED)
    console.log('[Dkls RN→WV] send', {
      id,
      type: msg?.type,
      className: msg?.className,
      method: msg?.method,
      t0,
      preview: payload.slice(0, 300),
    });

  if (!_isReady) {
    if (WORKER_LOGS_ENABLED) console.log('[Dkls RN] waiting _readyPromise…');
    await _readyPromise;
  }

  return new Promise<T>((resolve, reject) => {
    pendings.set(id, {
      resolve: v => {
        const dt = Date.now() - t0;
        if (WORKER_LOGS_ENABLED)
          console.log('[Dkls RN←WV] ok', {
            id,
            dt,
            preview: JSON.stringify(v).slice(0, 300),
          });
        resolve(v);
      },
      reject: e => {
        const dt = Date.now() - t0;
        if (WORKER_LOGS_ENABLED)
          console.log('[Dkls RN←WV] ERR', {id, dt, err: String(e)});
        reject(e);
      },
    });
    if (_post) _post(payload);
    else {
      if (WORKER_LOGS_ENABLED)
        console.log('[Dkls RN] _post not ready, queueing', {id});
      _outQueue.push(payload);
    }
  });
}

const DklsWorkerWebView = () => {
  const [bootHtml] = useState(() => {
    return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="
        default-src 'none';
        script-src 'self' blob: 'unsafe-inline' 'wasm-unsafe-eval';
        worker-src 'self' blob:;
        connect-src data:;
      "
    />
  </head>
  <body>
    <script>
      (() => {
        // ---- Safe postMessage with queue -----------------
        const queue = [];

        function canPost() {
          return !!(window.ReactNativeWebView && window.ReactNativeWebView.postMessage);
        }

        function rawPost(obj) {
          try {
            window.ReactNativeWebView.postMessage(JSON.stringify(obj));
          } catch (e) {}
        }

        function post(obj) {
          if (canPost()) rawPost(obj);
          else queue.push(obj);
        }

        function flush() {
          while (queue.length && canPost()) rawPost(queue.shift());
        }

        function typeOf(v) {
          if (v === null) return 'null';
          if (v instanceof Uint8Array) return 'Uint8Array(' + v.length + ')';
          if (Array.isArray(v)) return 'Array(' + v.length + ')';
          return typeof v;
        }

        function isHandle(v) {
          return v && typeof v === 'object' && typeof v._id === 'number';
        }

        function isPlainMsg(v) {
          return v && typeof v === 'object' && ('payload' in v) && ('from_id' in v);
        }

        window.onerror = function (msg, src, line, col, err) {
          post({
            id: -3,
            ok: false,
            result: "[ONERROR] " + msg + " @ " + src + ":" + line + ":" + col + " :: " + (err && err.stack || err)
          });
        };

        window.onunhandledrejection = function (ev) {
          const r = String(ev.reason && ev.reason.stack || ev.reason);
          post({ id: -4, ok: false, result: "[UNHANDLED] " + r });
        };

        post({ id: -2, ok: true, result: "HELLO_FROM_WEBVIEW" });

        const iv = setInterval(function () {
          if (canPost()) {
            clearInterval(iv);
            flush();
            post({ id: -1, ok: true, result: "BOOTED" });
          }
        }, 50);

        setTimeout(function () {
          clearInterval(iv);
          if (canPost()) {
            flush();
            post({ id: -1, ok: true, result: "BOOTED_LATE" });
          }
        }, 8000);

        // ---- RPC host ------------------------------------------------------
        function reply(id, ok, result) {
          post({ id, ok, result });
        }

        const objects = new Map();
        const inFlight = new Map();

        function enqueue(objId, task) {
          const chain = (inFlight.get(objId) || Promise.resolve()).then(task, task);
          inFlight.set(objId, chain.finally(() => {
            if (inFlight.get(objId) === chain) inFlight.delete(objId);
          }));
          return chain;
        }

        let nextId = 1;
        let dklsMod = null;

        const DKLS_JS_B64 = ${JSON.stringify(DKLS_JS_BASE64)};
        const DKLS_WASM_B64 = ${JSON.stringify(DKLS_WASM_BASE64)};

        async function ensureDkls() {
          if (dklsMod) return dklsMod;
          console.log('[WV] ensureDkls() begin');
          const jsBlob = new Blob([atob(DKLS_JS_B64)], {type: 'text/javascript'});
          const jsBlobUrl = URL.createObjectURL(jsBlob);
          try {
            const mod = await import(jsBlobUrl);
            // Decode via fetch(data:) so the engine handles base64 natively,
            // avoiding a large intermediate JS string + per-byte charCodeAt loop.
            const wasmBuffer = await fetch('data:application/wasm;base64,' + DKLS_WASM_B64)
              .then(function(r) { return r.arrayBuffer(); });
            await mod.default(wasmBuffer);
            dklsMod = mod;
            return dklsMod;
          } finally {
            URL.revokeObjectURL(jsBlobUrl);
          }
        }

        function encodeBytes(bytes) {
          if (bytes.length < 128) return Array.from(bytes);
          let binary = '';
          for (let i = 0; i < bytes.length; i += 8192) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
          }
          return { __dklsBytes: btoa(binary) };
        }

        function toU8(x) {
          if (x == null) return undefined;
          if (x instanceof Uint8Array) return x;
          if (Array.isArray(x)) return new Uint8Array(x);

          if (typeof x === "object") {
            if (typeof x.__dklsBytes === 'string') {
              const binary = atob(x.__dklsBytes);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
              return bytes;
            }
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
          throw new Error("toU8() requires Uint8Array or Array, got: " + typeOf(x));
        }

        function deproxy(v) {
          if (Array.isArray(v)) return v.map(deproxy);
          if (v && typeof v === "object") {
            if (typeof v.__dklsBytes === 'string') return toU8(v);
            if (typeof v._id === "number") {
              const o = objects.get(v._id);
              if (!o) throw new Error("Unknown objId " + v._id);
              return o;
            }
            const r = {};
            for (const k in v) r[k] = deproxy(v[k]);
            return r;
          }
          return v;
        }

        function clone(v) {
          if (v instanceof Uint8Array) return new Uint8Array(v);
          if (Array.isArray(v)) return v.map(clone);
          if (v && typeof v === "object") {
            const o = {};
            for (const k in v) o[k] = clone(v[k]);
            return o;
          }
          return v;
        }

        function norm(x) {
          if (x instanceof Uint8Array) return encodeBytes(x);
          if (x instanceof ArrayBuffer) return encodeBytes(new Uint8Array(x));

          if (dklsMod && x instanceof dklsMod.Keyshare) {
            const objId = nextId++;
            objects.set(objId, x);
            console.log('[WV] norm() registered Keyshare with objId:', objId);
            return { objId };
          }

          if (dklsMod && x instanceof dklsMod.Message) {
          const message = { payload: norm(x.payload), from_id: x.from_id, to_id: x.to_id };
          x.free();
          return message;
          }
          if (Array.isArray(x)) return x.map(norm);
          return x;
        }

        async function onCall(data) {
          const { id, type } = data;
          try {
            if (type === "init") {
              await ensureDkls();
              return reply(id, true, "ok");
            }

            if (type === "free") {
              const { objId } = data;
              if (!objects.has(objId)) {
                return reply(id, true, "already_freed");
              }
              objects.delete(objId);
              return reply(id, true, "freed");
            }

            const mod = await ensureDkls();

            if (type === "construct") {
              const { className, args } = data;
              const Ctor = mod[className];
              if (typeof Ctor !== "function") {
                throw new Error("No class: " + className);
              }
              let a = clone(deproxy(args || []));
              if (!Array.isArray(a)) a = [a];

              if (className === 'SignSessionOTVariant') {
                console.log('[Worker] Constructing SignSessionOTVariant');
                console.log('[Worker] Raw args:', args);

                const processedArgs = args.map((arg, idx) => {
                  if (arg && typeof arg === 'object' && typeof arg._id === 'number') {
                    const obj = objects.get(arg._id);
                    if (!obj) {
                      throw new Error('Unknown objId ' + arg._id + ' at arg index ' + idx);
                    }
                    return obj;
                  }

                  if (Array.isArray(arg)) {
                    return new Uint8Array(arg);
                  }

                  return arg;
                });

                console.log('[Worker] Processed args ready');

                const session = new mod.SignSessionOTVariant(...processedArgs);

                const objId = nextId++;
                objects.set(objId, session);
                console.log('[Worker] SignSessionOTVariant created with objId:', objId);

                return reply(id, true, { objId });
              }
              if (className === "KeygenSession" && a.length >= 4) {
                a[3] = toU8(a[3]);
              }
              if (className === "Message" && a.length >= 1) {
                const before = a[0];
                a[0] = toU8(a[0]);
              }

              const inst = new Ctor(...a);
              const objId = nextId++;
              objects.set(objId, inst);
              console.log('[WV] construct OK', className, 'objId=', objId);
              return reply(id, true, { objId });
            }

            if (type === "staticConstruct") {
              const S = mod[data.className];
              const fn = S && S[data.method];
              if (typeof fn !== "function") throw new Error("No static " + data.className + "." + data.method);
              let a2 = clone(deproxy(data.args || []));
              const inst2 = fn(...(Array.isArray(a2) ? a2 : [a2]));
              const oid2 = nextId++;
              objects.set(oid2, inst2);
              console.log('[WV] staticConstruct OK', data.className + '.' + data.method, 'objId=', oid2);
              return post({ id: id, ok: true, result: { objId: oid2 } });
            }

            if (type === 'call') {
              const { objId, method, args } = data;
              const obj = objects.get(objId);
              if (!obj) throw new Error('Unknown objId ' + objId);

              const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(obj), method);
              if (descriptor && descriptor.get) {
                return enqueue(objId, async () => {
                  let res = obj[method];
                  if (res && typeof res.then === 'function') res = await res;
                  const normed = norm(res);
                  return reply(id, true, normed);
                }).catch(e => reply(id, false, String((e && e.message) || e)));
              }

              const fn = obj[method];
              if (typeof fn !== 'function') throw new Error('No method ' + method);

              let a = Array.isArray(args) ? args : (args == null ? [] : [args]);

              if (method === 'handleMessages' && a.length >= 1 && Array.isArray(a[0])) {
                const inMsgs = a[0];
                const outMsgs = [];

                for (let i = 0; i < inMsgs.length; i++) {
                  let m = inMsgs[i];

                  if (isHandle(m)) {
                    const inst = objects.get(m._id);
                    if (!inst) {
                      throw new Error('Unknown message handle _id=' + m._id + ' at index ' + i);
                    }
                    if (dklsMod && inst instanceof dklsMod.Message) {
                      outMsgs.push(inst);
                      continue;
                    }
                    m = inst;
                  }

                  if (isPlainMsg(m)) {
                    const p = toU8(m.payload);
                    const msg = new dklsMod.Message(p, m.from_id, m.to_id);
                    outMsgs.push(msg);
                    continue;
                  }

                  if (dklsMod && m instanceof dklsMod.Message) {
                    outMsgs.push(m);
                    continue;
                  }

                  const errDetail = {
                    index: i,
                    type: typeOf(m),
                    keys: m && typeof m === 'object' ? Object.keys(m) : undefined,
                    isHandle: isHandle(m),
                    isPlainMsg: isPlainMsg(m),
                    hasInstance: dklsMod && m instanceof dklsMod.Message,
                    payload: m && m.payload ? 'exists, len=' + (m.payload.length || -1) : 'missing',
                    from_id: m && m.from_id !== undefined ? m.from_id : 'missing',
                  };

                  throw new Error('Bad message entry for handleMessages at index ' + i + ': ' + JSON.stringify(errDetail));
                }

                let commitments = a.length >= 2 && a[1] != null ? a[1] : undefined;
                if (commitments && Array.isArray(commitments)) {
                  commitments = commitments.map((c, idx) => {
                    if (Array.isArray(c)) {
                      const u8 = new Uint8Array(c);
                      return u8;
                    }
                    return c;
                  });
                }

                const seed = a.length >= 3 && a[2] != null ? a[2] : undefined;
                a = [outMsgs, commitments, seed];
              }

              if (method === 'combine' && Array.isArray(a[0])) {
                const inMsgs = a[0];
                const outMsgs = [];

                for (let i = 0; i < inMsgs.length; i++) {
                  let m = inMsgs[i];

                  if (isHandle(m)) {
                    const inst = objects.get(m._id);
                    if (!inst) {
                      throw new Error('Unknown message handle _id=' + m._id + ' at index ' + i);
                    }
                    if (dklsMod && inst instanceof dklsMod.Message) {
                      outMsgs.push(inst);
                      continue;
                    }
                  }

                  if (isPlainMsg(m)) {
                    outMsgs.push(new dklsMod.Message(toU8(m.payload), m.from_id, m.to_id));
                    continue;
                  }

                  if (dklsMod && m instanceof dklsMod.Message) {
                    outMsgs.push(m);
                    continue;
                  }

                  throw new Error('combine: Invalid message at index ' + i + ', type=' + typeOf(m));
                }

                a = [outMsgs];
              }

              return enqueue(objId, async () => {
                let res = fn.apply(obj, a);
                if (res && typeof res.then === 'function') res = await res;
                const normed = norm(res);
                return reply(id, true, normed);
              }).catch(e => reply(id, false, String((e && e.message) || e)));
            }

            if (type === "get") {
              const { objId, prop } = data;
              const obj = objects.get(objId);
              if (!obj) throw new Error("Unknown objId " + objId);
              const val = await obj[prop];
              return reply(id, true, val);
            }

            throw new Error("Unknown type " + type);

          } catch (e) {
            console.log('[WV] ERROR', e && e.stack || String(e));
            reply(id, false, String((e && e.message) || e));
          }
        }

        function handleIncoming(ev) {
          let data;
          try {
            data = JSON.parse(ev.data);
          } catch (e) {
            console.log('[WV] JSON.parse error', e, 'raw-start=', String(ev.data).slice(0, 200));
            return;
          }
          onCall(data);
        }

        // Android (RN WebView)
        document.addEventListener('message', handleIncoming);

        // iOS
        window.addEventListener('message', handleIncoming);
      })();
    </script>
  </body>
</html>
    `;
  });

  const ref = useRef<WebView>(null);

  const onMessage = (ev: WebViewMessageEvent) => {
    try {
      const raw = ev.nativeEvent.data;
      const trimmed = raw?.length > 500 ? raw.slice(0, 500) + '…' : raw;
      if (WORKER_LOGS_ENABLED) console.log('[Dkls WV→RN] raw', trimmed);

      const {id, ok, result} = JSON.parse(raw);

      if (typeof id === 'number' && id < -2) {
        if (WORKER_LOGS_ENABLED) console.log('[DKLS LOG] internal log', result);
        return;
      }

      if (
        id === -1 &&
        ok &&
        (result === 'BOOTED' || result === 'BOOTED_LATE')
      ) {
        if (!_isReady) {
          _isReady = true;
          clearBootTimer();
          _readyResolve?.();
          _readyResolve = null;
          _readyReject = null;
          if (_outQueue.length && _post) {
            for (const p of _outQueue.splice(0)) _post(p);
          }
        }
        return;
      }

      const p = pendings.get(id);
      if (!p) {
        if (WORKER_LOGS_ENABLED) console.log('[Dkls RN] no pending for id', id);
        return;
      }
      pendings.delete(id);
      if (ok) p.resolve(result);
      else p.reject(result);
    } catch (e) {
      if (WORKER_LOGS_ENABLED)
        console.log(
          '[DKLS HOST] onMessage parse error',
          e,
          'raw-start=',
          (ev.nativeEvent.data || '').slice(0, 200),
        );
    }
  };

  useEffect(() => {
    _post = data => {
      ref.current?.postMessage(data);
    };
    if (_outQueue.length && _post) {
      for (const p of _outQueue.splice(0)) _post(p);
    }
    // The boot timeout runs only while the WebView is mounted, so a mount
    // request with no host rendered (e.g. in tests) leaves no timer behind.
    if (!_isReady) {
      clearBootTimer();
      _bootTimer = setTimeout(
        () => failBoot(`no boot signal within ${BOOT_TIMEOUT_MS}ms`),
        BOOT_TIMEOUT_MS,
      );
    }
    return () => {
      _post = null;
      clearBootTimer();
    };
  }, []);

  return (
    <View style={styles.hidden}>
      <WebView
        ref={ref}
        source={{html: bootHtml}}
        originWhitelist={['about:blank']}
        onShouldStartLoadWithRequest={req => req.url === 'about:blank'}
        setSupportMultipleWindows={false}
        javaScriptEnabled
        onMessage={onMessage}
        domStorageEnabled={false}
        allowFileAccess={false}
        thirdPartyCookiesEnabled={false}
        sharedCookiesEnabled={false}
        incognito
        mixedContentMode="never"
        onLoad={() => console.log('[DKLS HOST] webview onLoad')}
        onError={e =>
          failBoot(`webview error: ${e?.nativeEvent?.description || 'unknown'}`)
        }
        onHttpError={e =>
          failBoot(
            `webview http error: ${e?.nativeEvent?.statusCode ?? 'unknown'}`,
          )
        }
      />
    </View>
  );
};

export const DklsWorkerHost = () => {
  const mountGeneration = useSyncExternalStore(
    subscribeDklsMount,
    getDklsMountGeneration,
  );

  if (!mountGeneration) {
    return null;
  }

  return <DklsWorkerWebView key={mountGeneration} />;
};

const styles = StyleSheet.create({
  hidden: {width: 0, height: 0, overflow: 'hidden'},
});
