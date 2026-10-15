import type TestRendererType from 'react-test-renderer';

// Fresh module state per test (the mount flag is module-level). React and
// the renderer are re-required with it so they share one React instance.
const load = () => {
  jest.resetModules();
  const React = require('react');
  const TestRenderer = require('react-test-renderer');
  const worker = require('./DklsWorker') as typeof import('./DklsWorker');
  const render = async () => {
    let renderer!: TestRendererType.ReactTestRenderer;
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(
        React.createElement(worker.DklsWorkerHost),
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
      const call = callWorker({type: 'init'});
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

  it('remounts and works again on the next call after a failed boot', async () => {
    jest.useFakeTimers();
    try {
      const {render, act, callWorker} = load();
      const renderer = await render();
      const first = callWorker({type: 'init'});
      const firstOutcome = expect(first).rejects.toThrow(
        'DKLS worker failed to start',
      );
      await act(async () => {
        jest.advanceTimersByTime(20000);
      });
      await firstOutcome;
      expect(webViews(renderer)).toHaveLength(0);

      let second!: Promise<unknown>;
      await act(async () => {
        second = callWorker({type: 'init'});
      });
      expect(webViews(renderer)).toHaveLength(1);
      const {onMessage} = webViews(renderer)[0].props;
      await act(async () => {
        onMessage({
          nativeEvent: {
            data: JSON.stringify({id: -1, ok: true, result: 'BOOTED'}),
          },
        });
      });
      // Booted: the call is no longer waiting on readiness, so the old
      // failure doesn't reject it.
      let settled = false;
      second.then(
        () => (settled = true),
        () => (settled = true),
      );
      await act(async () => {
        jest.advanceTimersByTime(20000);
      });
      expect(settled).toBe(false);
      act(() => renderer.unmount());
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
