import {setPortfolioTxHistorySigningDispatchContextOnRuntime} from '../../../adapters/rn/txHistorySigning';

export type FakeWorkletStorage = {
  contains: (key: string) => boolean;
  delete: (key: string) => void;
  getAllKeys: () => string[];
  getString: (key: string) => string | undefined;
  set: (key: string, value: boolean | string | number | ArrayBuffer) => void;
};

export type FakeNitroRequest = {
  url: string;
  method?: string;
  headers?: Array<{key: string; value: string}>;
  timeoutMs?: number;
  followRedirects?: boolean;
};

export type FakeNitroResponse = {
  ok: boolean;
  status: number;
  bodyString?: string;
};

export const createFakeWorkletStorage = (): FakeWorkletStorage => {
  const map = new Map<string, string>();
  return {
    contains: key => map.has(key),
    delete: key => {
      map.delete(key);
    },
    getAllKeys: () => Array.from(map.keys()),
    getString: key => map.get(key),
    set: (key, value) => {
      map.set(key, String(value));
    },
  };
};

export function installNitroFetchMock(
  handler: (request: FakeNitroRequest) => FakeNitroResponse,
) {
  const requestSync = jest.fn((request: FakeNitroRequest) => handler(request));
  const request = jest.fn(async (requestArgs: FakeNitroRequest) =>
    handler(requestArgs),
  );

  setPortfolioTxHistorySigningDispatchContextOnRuntime({
    nitroFetchClient: {
      request,
      requestSync,
    },
  } as any);

  return requestSync;
}
