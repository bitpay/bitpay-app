import type TestRendererType from 'react-test-renderer';

// Fresh module state per test (the mount flag is module-level). React and
// the renderer are re-required with it so they share one React instance.
const load = () => {
  jest.resetModules();
  const React = require('react');
  const TestRenderer = require('react-test-renderer');
  const worker = require('./DklsWorker') as typeof import('./DklsWorker');
  const render = async (
    createNodeMock?: (element: {type: unknown}) => unknown,
  ) => {
    let renderer!: TestRendererType.ReactTestRenderer;
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(
        React.createElement(worker.DklsWorkerHost),
        createNodeMock ? {createNodeMock} : undefined,
      );
    });
    return renderer;
  };
  return {...worker, act: TestRenderer.act, render};
};

const webViews = (renderer: TestRendererType.ReactTestRenderer) =>
  renderer.root.findAll(node => (node.type as any) === 'WebView');

describe('DklsWorkerHost', () => {
  it('renders no WebView until the worker is needed', async () => {
    const {render, act} = load();
    const renderer = await render();

    expect(webViews(renderer)).toHaveLength(0);
    act(() => renderer.unmount());
  });

  it('mounts the WebView on the first worker call', async () => {
    const {render, act, callWorker} = load();
    const renderer = await render();

    await act(async () => {
      void callWorker({type: 'init'});
    });

    expect(webViews(renderer)).toHaveLength(1);
    act(() => renderer.unmount());
  });

  it('fails pending calls instead of hanging when the WebView never boots', async () => {
    jest.useFakeTimers();
    try {
      const {render, act, callWorker} = load();
      const renderer = await render();
      let call!: Promise<unknown>;
      await act(async () => {
        call = callWorker({type: 'init'});
      });
      const outcome = expect(call).rejects.toThrow(
        'DKLS worker failed to start',
      );

      await act(async () => {
        jest.advanceTimersByTime(20000);
      });

      await outcome;
      act(() => renderer.unmount());
    } finally {
      jest.useRealTimers();
    }
  });

  // A fresh WebView mock per mounted instance, so a remount is observable
  // (a new entry) and outgoing postMessage is captured for a real round trip.
  const nodeMockFactory = () => {
    const instances: Array<{postMessage: jest.Mock}> = [];
    const createNodeMock = (element: {type: unknown}) => {
      if ((element.type as any) !== 'WebView') {
        return null;
      }
      const instance = {postMessage: jest.fn()};
      instances.push(instance);
      return instance;
    };
    const sentMessage = (type: string) =>
      instances
        .flatMap(i => i.postMessage.mock.calls)
        .map(call => JSON.parse(call[0]))
        .find(msg => msg.type === type);
    return {createNodeMock, instances, sentMessage};
  };

  it('recovers after a failed boot: the next call boots and resolves end to end', async () => {
    jest.useFakeTimers();
    try {
      const {render, act, callWorker} = load();
      const {createNodeMock, sentMessage} = nodeMockFactory();
      const renderer = await render(createNodeMock);

      // First call: boot never arrives, the call rejects and the WebView
      // unmounts.
      let first!: Promise<unknown>;
      await act(async () => {
        first = callWorker({type: 'init'});
      });
      const firstOutcome = expect(first).rejects.toThrow(
        'DKLS worker failed to start',
      );
      await act(async () => {
        jest.advanceTimersByTime(20000);
      });
      await firstOutcome;
      expect(webViews(renderer)).toHaveLength(0);

      // Second call: a fresh WebView mounts, boots, and the call completes a
      // real round trip through postMessage/onMessage rather than merely
      // staying pending.
      let second!: Promise<unknown>;
      await act(async () => {
        second = callWorker({type: 'ping'});
      });
      expect(webViews(renderer)).toHaveLength(1);

      await act(async () => {
        webViews(renderer)[0].props.onMessage({
          nativeEvent: {
            data: JSON.stringify({id: -1, ok: true, result: 'BOOTED'}),
          },
        });
      });

      const sent = sentMessage('ping');
      expect(sent).toBeDefined();

      await act(async () => {
        webViews(renderer)[0].props.onMessage({
          nativeEvent: {
            data: JSON.stringify({id: sent.id, ok: true, result: 'pong'}),
          },
        });
      });

      await expect(second).resolves.toBe('pong');
      act(() => renderer.unmount());
    } finally {
      jest.useRealTimers();
    }
  });

  it('remounts a fresh WebView when a boot failure and the next call share a batch', async () => {
    jest.useFakeTimers();
    try {
      const {render, act, callWorker} = load();
      const {createNodeMock, instances, sentMessage} = nodeMockFactory();
      const renderer = await render(createNodeMock);

      let first!: Promise<unknown>;
      await act(async () => {
        first = callWorker({type: 'init'});
      });
      first.catch(() => {});
      expect(instances).toHaveLength(1);

      // In one batch the WebView errors (failing the boot and clearing its
      // timer) and a new call re-requests the worker. A boolean mount snapshot
      // reads this false→true flip as "no change" and leaves the dead WebView
      // mounted with no boot timer, so the new call hangs. The generation
      // snapshot forces a brand-new WebView instance.
      let second!: Promise<unknown>;
      await act(async () => {
        webViews(renderer)[0].props.onError({
          nativeEvent: {description: 'load failed'},
        });
        second = callWorker({type: 'ping'});
      });

      expect(webViews(renderer)).toHaveLength(1);
      expect(instances).toHaveLength(2); // remounted, not the dead instance
      expect(jest.getTimerCount()).toBeGreaterThan(0); // fresh boot timer

      await act(async () => {
        webViews(renderer)[0].props.onMessage({
          nativeEvent: {
            data: JSON.stringify({id: -1, ok: true, result: 'BOOTED'}),
          },
        });
      });
      const sent = sentMessage('ping');
      expect(sent).toBeDefined();
      await act(async () => {
        webViews(renderer)[0].props.onMessage({
          nativeEvent: {
            data: JSON.stringify({id: sent.id, ok: true, result: 'pong'}),
          },
        });
      });
      await expect(second).resolves.toBe('pong');
      act(() => renderer.unmount());
    } finally {
      jest.useRealTimers();
    }
  });

  const startBootedCall = async () => {
    const worker = load();
    const mocks = nodeMockFactory();
    const renderer = await worker.render(mocks.createNodeMock);
    let call!: Promise<unknown>;
    await worker.act(async () => {
      call = worker.callWorker({type: 'ping'});
    });
    await worker.act(async () => {
      webViews(renderer)[0].props.onMessage({
        nativeEvent: {
          data: JSON.stringify({id: -1, ok: true, result: 'BOOTED'}),
        },
      });
    });
    return {...worker, ...mocks, renderer, call};
  };

  it('fails the call and starts a fresh WebView when the worker stops replying', async () => {
    jest.useFakeTimers();
    try {
      const {act, callWorker, renderer, instances, call} =
        await startBootedCall();
      const outcome = expect(call).rejects.toThrow('DKLS worker did not reply');

      await act(async () => {
        jest.advanceTimersByTime(60000);
      });

      await outcome;
      expect(webViews(renderer)).toHaveLength(0);

      let second!: Promise<unknown>;
      await act(async () => {
        second = callWorker({type: 'ping'});
      });
      expect(instances).toHaveLength(2);
      const reply = (id: number, result: unknown) =>
        webViews(renderer)[0].props.onMessage({
          nativeEvent: {data: JSON.stringify({id, ok: true, result})},
        });
      await act(async () => {
        reply(-1, 'BOOTED');
      });
      const sentId = (instance: {postMessage: jest.Mock}) =>
        JSON.parse(instance.postMessage.mock.calls[0][0]).id;
      let settled = false;
      second.finally(() => (settled = true));

      await act(async () => {
        reply(sentId(instances[0]), 'stale');
      });
      expect(settled).toBe(false);

      await act(async () => {
        reply(sentId(instances[1]), 'pong');
      });
      await expect(second).resolves.toBe('pong');
      act(() => renderer.unmount());
    } finally {
      jest.useRealTimers();
    }
  });

  it('drops a call whose WebView dies in the same batch that boots it', async () => {
    const {render, act, callWorker} = load();
    const {createNodeMock, sentMessage} = nodeMockFactory();
    const renderer = await render(createNodeMock);
    let call!: Promise<unknown>;
    await act(async () => {
      call = callWorker({type: 'ping'});
    });
    const outcome = expect(call).rejects.toThrow('DKLS worker restarted');

    await act(async () => {
      const {props} = webViews(renderer)[0];
      props.onMessage({
        nativeEvent: {
          data: JSON.stringify({id: -1, ok: true, result: 'BOOTED'}),
        },
      });
      props.onContentProcessDidTerminate({nativeEvent: {}});
    });

    expect(sentMessage('ping')).toBeUndefined();
    await outcome;
    act(() => renderer.unmount());
  });

  it.each(['onContentProcessDidTerminate', 'onRenderProcessGone'])(
    'fails in-flight calls when the WebView process dies (%s)',
    async handler => {
      const {act, renderer, call} = await startBootedCall();
      const outcome = expect(call).rejects.toThrow(
        'DKLS worker process terminated',
      );

      await act(async () => {
        webViews(renderer)[0].props[handler]({nativeEvent: {}});
      });

      await outcome;
      expect(webViews(renderer)).toHaveLength(0);
      act(() => renderer.unmount());
    },
  );

  it('fails in-flight calls when the WebView unmounts', async () => {
    const {act, renderer, call} = await startBootedCall();
    const outcome = expect(call).rejects.toThrow('DKLS worker unmounted');

    act(() => renderer.unmount());

    await outcome;
  });

  it('rejects with an Error that keeps the worker message', async () => {
    const {act, renderer, sentMessage, call} = await startBootedCall();
    const outcome = expect(call).rejects.toEqual(
      new Error('Abort the protocol and ban party 1'),
    );

    await act(async () => {
      webViews(renderer)[0].props.onMessage({
        nativeEvent: {
          data: JSON.stringify({
            id: sentMessage('ping').id,
            ok: false,
            result: 'Abort the protocol and ban party 1',
          }),
        },
      });
    });

    await outcome;
    act(() => renderer.unmount());
  });

  it('starts no boot timer when no host is rendered', () => {
    jest.useFakeTimers();
    try {
      const {requestDklsWorkerMount} = load();
      requestDklsWorkerMount();

      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('clears the boot timer when the WebView unmounts', async () => {
    jest.useFakeTimers();
    try {
      const {render, act, requestDklsWorkerMount} = load();
      requestDklsWorkerMount();
      const renderer = await render();
      act(() => renderer.unmount());

      // A timer left running would fail the boot and clear the mount
      // request, so a host rendered later would show no WebView.
      act(() => {
        jest.advanceTimersByTime(20000);
      });
      const next = await render();
      expect(webViews(next)).toHaveLength(1);
      act(() => next.unmount());
    } finally {
      jest.useRealTimers();
    }
  });

  it('mounts straight away when the worker was requested before render', async () => {
    const {render, act, requestDklsWorkerMount} = load();
    requestDklsWorkerMount();
    const renderer = await render();

    expect(webViews(renderer)).toHaveLength(1);
    act(() => renderer.unmount());
  });
});
