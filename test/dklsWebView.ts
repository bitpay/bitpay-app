const dkls = require('../node_modules/@silencelaboratories/dkls-wasm-ll-node/dkls-wasm-ll-node.js');

type WorkerReply = {id: number; ok: boolean; result: unknown};

export const createDklsWebViewHost = (reply: (data: string) => void) => {
  const objects = new Map<number, any>();
  let nextId = 1;

  const register = (value: any) => {
    const objId = nextId++;
    objects.set(objId, value);
    return {objId};
  };
  const toU8 = (x: any) => (Array.isArray(x) ? new Uint8Array(x) : x);
  const deproxy = (x: any): any => {
    if (Array.isArray(x)) {
      return x.map(deproxy);
    }
    return x && typeof x._id === 'number' ? objects.get(x._id) : x;
  };
  const norm = (x: any): any => {
    if (x instanceof Uint8Array) {
      return Array.from(x);
    }
    if (x instanceof dkls.Message || x instanceof dkls.Keyshare) {
      return register(x);
    }
    return Array.isArray(x) ? x.map(norm) : x;
  };
  const toMessage = (m: any) => {
    const resolved = deproxy(m);
    return resolved instanceof dkls.Message
      ? resolved
      : new dkls.Message(
          toU8(resolved.payload),
          resolved.from_id,
          resolved.to_id,
        );
  };

  const handle = ({type, className, method, objId, args = []}: any) => {
    switch (type) {
      case 'init':
        return 'ok';
      case 'free':
        objects.delete(objId);
        return 'freed';
      case 'construct': {
        const a = deproxy(args);
        if (className === 'KeygenSession' && a.length >= 4) {
          a[3] = toU8(a[3]);
        }
        if (className === 'Message') {
          a[0] = toU8(a[0]);
        }
        return register(
          new dkls[className](
            ...(className === 'SignSessionOTVariant' ? a.map(toU8) : a),
          ),
        );
      }
      case 'staticConstruct':
        return register(dkls[className][method](...deproxy(args)));
      case 'call': {
        const obj = objects.get(objId);
        if (
          Object.getOwnPropertyDescriptor(Object.getPrototypeOf(obj), method)
            ?.get
        ) {
          return norm(obj[method]);
        }
        if (method === 'handleMessages') {
          return norm(
            obj.handleMessages(
              args[0].map(toMessage),
              args[1]?.map(toU8),
              args[2],
            ),
          );
        }
        if (method === 'combine') {
          return norm(obj.combine(args[0].map(toMessage)));
        }
        return norm(obj[method](...args));
      }
    }
    throw new Error(`Unknown type ${type}`);
  };

  const send = (message: WorkerReply) =>
    setImmediate(() => reply(JSON.stringify(message)));

  return {
    boot: () => send({id: -1, ok: true, result: 'BOOTED'}),
    postMessage: (data: string) => {
      const request = JSON.parse(data);
      try {
        send({id: request.id, ok: true, result: handle(request)});
      } catch (e: any) {
        send({id: request.id, ok: false, result: String(e?.message ?? e)});
      }
    },
  };
};
