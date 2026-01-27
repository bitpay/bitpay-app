import React, {useRef, useEffect, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {WebView, WebViewMessageEvent} from 'react-native-webview';

const WORKER_LOGS_ENABLED = false;

type Pending = {
  resolve: (v: any) => void;
  reject: (e: any) => void;
};

let _post: ((data: any) => void) | null = null;
let _isReady = false;
let _readyResolve: (() => void) | null = null;
const _readyPromise: Promise<void> = new Promise(res => (_readyResolve = res));
const _outQueue: string[] = [];
const pendings = new Map<number, Pending>();
let seq = 1;

const processArgs = (args: any): any => {
  if (!Array.isArray(args)) return args;

  return args.map(arg => {
    if (arg instanceof Uint8Array) {
      console.log(
        '[DKLS shim] processArgs: Uint8Array → Array, len=',
        arg.length,
      );
      return Array.from(arg);
    }
    if (Array.isArray(arg)) {
      return processArgs(arg);
    }
    if (arg && typeof arg === 'object') {
      const processed = {};
      for (const key in arg) {
        // @ts-ignore
        processed[key] =
          arg[key] instanceof Uint8Array ? Array.from(arg[key]) : arg[key];
      }
      return processed;
    }
    return arg;
  });
};

export async function callWorker<T = any>(msg: any): Promise<T> {
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

export const DklsWorkerHost = () => {
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
        script-src 'self' https://unpkg.com/@silencelaboratories/dkls-wasm-ll-web@latest/ 'unsafe-inline' 'unsafe-eval';
        connect-src https://unpkg.com/@silencelaboratories/dkls-wasm-ll-web@latest/;
        worker-src 'self' blob:;
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

        function preview(v) {
          try { 
            return JSON.stringify(v, (k, val) => val instanceof Uint8Array ? Array.from(val).slice(0, 16) + '…' : val).slice(0, 300);
          }
          catch { 
            return String(v).slice(0, 300); 
          }
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
          var r = String(ev.reason && ev.reason.stack || ev.reason);
          post({ id: -4, ok: false, result: "[UNHANDLED] " + r });
        };

        post({ id: -2, ok: true, result: "HELLO_FROM_WEBVIEW" });

        var iv = setInterval(function () {
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

        async function ensureDkls() {
          if (dklsMod) return dklsMod;
          console.log('[WV] ensureDkls() begin');
          try {
            const JS_URL =
              "https://unpkg.com/@silencelaboratories/dkls-wasm-ll-web@latest/dkls-wasm-ll-web.js";
            const WASM_URL =
              "https://unpkg.com/@silencelaboratories/dkls-wasm-ll-web@latest/dkls-wasm-ll-web_bg.wasm";

            if (
              !JS_URL.startsWith("https://unpkg.com/@silencelaboratories/dkls-wasm-ll-web@latest/") ||
              !WASM_URL.startsWith("https://unpkg.com/@silencelaboratories/dkls-wasm-ll-web@latest/")
            ) {
              throw new Error("Blocked non-allowlisted URL");
            }

            const mod = await import(JS_URL);
            await mod.default(WASM_URL);
            dklsMod = mod;
            return dklsMod;
          } catch (e) {
            throw e;
          }
        }

        function toU8(x) {
          if (x == null) return undefined;
          if (x instanceof Uint8Array) return x;
          if (Array.isArray(x)) return new Uint8Array(x);
          
          if (typeof x === "object") {
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
          if (x instanceof Uint8Array) return Array.from(x);
          if (x instanceof ArrayBuffer) return Array.from(new Uint8Array(x));

          if (dklsMod && x instanceof dklsMod.Keyshare) {
            const objId = nextId++;
            objects.set(objId, x);
            console.log('[WV] norm() registered Keyshare with objId:', objId);
            return { objId };
          }

          if (dklsMod && x instanceof dklsMod.Message) {
          const objId = nextId++;
          objects.set(objId, x);
          return { objId };
          }
          if (Array.isArray(x)) return x.map(norm);
          return x;
        }

        async function onCall(data) {
          post({
            id: -998, ok: true,
            result: "[DKLS LOG] onCall with args=" + JSON.stringify({
              id: data.id, type: data.type, className: data.className,
              method: data.method, argsPreview: preview(data.args),
            })
          });

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

              console.log('[WV] construct', className, 'rawArgsTypes=', a.map(typeOf), 'rawArgsPreview=', preview(a));

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
                post({
                  id: -989, ok: true,
                  result: "[DKLS LOG] Building Message: payload.len=" + a[0].length + ", from=" + a[1] + ", to=" + a[2]
                });
              }

              console.log('[WV] construct', className, 'normArgsTypes=', a.map(typeOf), 'normArgsPreview=', preview(a));

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
              console.log('[WV] staticConstruct', data.className + '.' + data.method, 'argsTypes=', (Array.isArray(a2) ? a2 : []).map(typeOf), 'argsPrev=', preview(a2));
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
                post({
                  id: -980, ok: true,
                  result: "[DKLS LOG] getter: " + method
                });
                return enqueue(objId, async () => {
                  let res = obj[method];
                  if (res && typeof res.then === 'function') res = await res;
                  const normed = norm(res);
                  return reply(id, true, normed);
                }).catch(e => reply(id, false, String((e && e.message) || e)));
              }
              
              const fn = obj[method];
              if (typeof fn !== 'function') throw new Error('No method ' + method);
                if (method === 'toBytes') {
                post({
                  id: -970, ok: true,
                  result: "[DKLS LOG] toBytes"
                });
              }

              let a = Array.isArray(args) ? args : (args == null ? [] : [args]);

              if (method === 'handleMessages' && a.length >= 1 && Array.isArray(a[0])) {
                post({
                  id: -997, ok: true,
                  result: "[DKLS LOG] handleMessages: procesing " + a[0].length + " messages"
                });

                const inMsgs = a[0];
                const outMsgs = [];

                for (let i = 0; i < inMsgs.length; i++) {
                  let m = inMsgs[i];
                  
                  post({
                    id: -996, ok: true,
                    result: "[DKLS LOG] msg[" + i + "]: type=" + typeOf(m) + 
                            ", isHandle=" + isHandle(m) + 
                            ", isPlain=" + isPlainMsg(m) +
                            ", keys=" + (m && typeof m === 'object' ? Object.keys(m).join(',') : 'N/A')
                  });

                  if (isHandle(m)) {
                    const inst = objects.get(m._id);
                    if (!inst) {
                      throw new Error('Unknown message handle _id=' + m._id + ' at index ' + i);
                    }
                    if (dklsMod && inst instanceof dklsMod.Message) {
                      post({
                        id: -995, ok: true,
                        result: "[DKLS LOG] msg[" + i + "]: using existing handle _id=" + m._id
                      });
                      outMsgs.push(inst);
                      continue;
                    }
                    m = inst;
                  }

                  if (isPlainMsg(m)) {
                    const p = toU8(m.payload);
                    post({
                      id: -994, ok: true,
                      result: "[DKLS LOG] msg[" + i + "]: creating Message, payload.len=" + p.length + ", from=" + m.from_id + ", to=" + m.to_id
                    });
                    const msg = new dklsMod.Message(p, m.from_id, m.to_id);
                    outMsgs.push(msg);
                    continue;
                  }

                  if (dklsMod && m instanceof dklsMod.Message) {
                    post({
                      id: -993, ok: true,
                      result: "[DKLS LOG] msg[" + i + "]: its already a WASM instance"
                    });
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
                  
                  post({
                    id: -992, ok: false,
                    result: "[DKLS ERROR] msg[" + i + "]: unknown type - " + JSON.stringify(errDetail)
                  });
                  
                  throw new Error('Bad message entry for handleMessages at index ' + i + ': ' + JSON.stringify(errDetail));
                }

                post({
                  id: -991, ok: true,
                  result: "[DKLS LOG] handleMessages: " + outMsgs.length + " messages prepared for WASM"
                });

                let commitments = a.length >= 2 && a[1] != null ? a[1] : undefined;
                if (commitments && Array.isArray(commitments)) {
                  post({
                    id: -986, ok: true,
                    result: "[DKLS LOG] Converting commitments from Array to Uint8Array..."
                  });
                  
                  commitments = commitments.map((c, idx) => {
                    if (Array.isArray(c)) {
                      const u8 = new Uint8Array(c);
                      post({
                        id: -985, ok: true,
                        result: "[DKLS LOG] Commitment[" + idx + "] converted: Array(" + c.length + ") → Uint8Array(" + u8.length + ")"
                      });
                      return u8;
                    }
                    return c;
                  });
                }

                const seed = a.length >= 3 && a[2] != null ? a[2] : undefined;
                a = [outMsgs, commitments, seed];
                post({
                  id: -990, ok: true,
                  result: "[DKLS LOG] Validating messages for WASM before handleMessages..."
                });

                for (let i = 0; i < outMsgs.length; i++) {
                  const msg = outMsgs[i];
                  if (!msg || !(msg instanceof dklsMod.Message)) {
                    throw new Error('outMsgs[' + i + '] its not a valid instance of Message');
                  }
                  
                  try {
                    const payload = msg.payload;
                    const from = msg.from_id;
                    const to = msg.to_id;
                    
                    post({
                      id: -989, ok: true,
                      result: "[DKLS LOG] Message[" + i + "] valid: payload.len=" + payload.length + ", from=" + from + ", to=" + to
                    });
                  } catch (e) {
                    post({
                      id: -988, ok: false,
                      result: "[DKLS ERROR] Message[" + i + "] CORRUPT: " + String(e)
                    });
                    throw new Error('Message[' + i + '] corrupt or its free: ' + String(e));
                  }
                }

                post({
                  id: -987, ok: true,
                  result: "[DKLS LOG] all messages are valid calling WASM..."
                });
              }

              if (method === 'combine' && Array.isArray(a[0])) {
                post({
                  id: -984, ok: true,
                  result: "[DKLS LOG] combine: processing " + a[0].length + " messages"
                });

                const inMsgs = a[0];
                const outMsgs = [];

                for (let i = 0; i < inMsgs.length; i++) {
                  let m = inMsgs[i];
                  
                  post({
                    id: -983, ok: true,
                    result: "[DKLS LOG] combine msg[" + i + "]: type=" + typeOf(m) + 
                            ", isHandle=" + isHandle(m) + 
                            ", keys=" + (m && typeof m === 'object' ? Object.keys(m).join(',') : 'N/A')
                  });

                  if (isHandle(m)) {
                    const inst = objects.get(m._id);
                    if (!inst) {
                      throw new Error('Unknown message handle _id=' + m._id + ' at index ' + i);
                    }
                    if (dklsMod && inst instanceof dklsMod.Message) {
                      post({
                        id: -982, ok: true,
                        result: "[DKLS LOG] combine msg[" + i + "]: resolved handle _id=" + m._id + " to Message instance"
                      });
                      outMsgs.push(inst);
                      continue;
                    }
                  }

                  if (dklsMod && m instanceof dklsMod.Message) {
                    post({
                      id: -981, ok: true,
                      result: "[DKLS LOG] combine msg[" + i + "]: already a Message instance"
                    });
                    outMsgs.push(m);
                    continue;
                  }

                  throw new Error('combine: Invalid message at index ' + i + ', type=' + typeOf(m));
                }

                post({
                  id: -980, ok: true,
                  result: "[DKLS LOG] combine: calling WASM combine with " + outMsgs.length + " Message instances"
                });

                a = [outMsgs];
              }

              return enqueue(objId, async () => {
                let res = fn.apply(obj, a);
                if (res && typeof res.then === 'function') res = await res;
                if (method === 'toBytes') {
                  post({
                    id: -969, ok: true,
                    result: "[DKLS LOG] toBytes raw result: type=" + typeOf(res) + ", len=" + (res?.length || -1) + ", constructor=" + (res?.constructor?.name || 'unknown')
                  });
                }
                const normed = norm(res);

                if (method === 'toBytes') {
                  post({
                    id: -968, ok: true,
                    result: "[DKLS LOG] toBytes after norm: type=" + typeOf(normed) + ", len=" + (normed?.length || -1) + ", isArray=" + Array.isArray(normed) + ", sample=" + (Array.isArray(normed) ? normed.slice(0, 10).join(',') : 'N/A')
                  });
                }
                return reply(id, true, normed);
              }).catch(e => reply(id, false, String((e && e.message) || e)));
            }

            if (type === "get") {
              const { objId, prop } = data;
              const obj = objects.get(objId);
              if (!obj) throw new Error("Unknown objId " + objId);
              const val = await obj[prop];
              console.log('[WV] get', { objId, prop, valType: typeOf(val), prev: preview(val) });
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
          _readyResolve?.();
          _readyResolve = null;
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
    return () => {
      _post = null;
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
        onError={e => console.log('[DKLS HOST] onError', e?.nativeEvent)}
        onHttpError={e =>
          console.log('[DKLS HOST] onHttpError', e?.nativeEvent)
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  hidden: {width: 0, height: 0, overflow: 'hidden'},
});
