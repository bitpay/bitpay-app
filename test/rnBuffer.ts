export const restrictBufferApi = <T extends object>(
  nodeBuffer: T,
  api: object,
): T =>
  new Proxy(nodeBuffer, {
    get: (target, prop, receiver) =>
      typeof prop === 'string' && !(prop in api)
        ? undefined
        : Reflect.get(target, prop, receiver),
  });
