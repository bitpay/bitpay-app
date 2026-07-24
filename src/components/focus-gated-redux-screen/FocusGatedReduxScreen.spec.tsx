import React from 'react';
import {Provider, useSelector} from 'react-redux';
import {legacy_createStore as createStore} from 'redux';
import TestRenderer, {act} from 'react-test-renderer';
import FocusGatedReduxScreen from './FocusGatedReduxScreen';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let mockIsFocused = true;

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => mockIsFocused,
}));

type State = {
  revision: number;
};

type Action = {
  type: 'increment';
};

type RevisionProps = {
  onLayout?: (revision: number) => void;
  onRender?: (revision: number) => void;
};

const Revision: React.FC<RevisionProps> = ({onLayout, onRender}) => {
  const revision = useSelector((state: State) => state.revision);

  onRender?.(revision);

  React.useLayoutEffect(() => {
    onLayout?.(revision);
  }, [onLayout, revision]);

  return <>{revision}</>;
};

describe('FocusGatedReduxScreen', () => {
  beforeEach(() => {
    mockIsFocused = true;
  });

  it('defers an initially blurred child until first focus and keeps it mounted afterwards', async () => {
    mockIsFocused = false;
    const store = createStore((state: State = {revision: 0}, action: Action) =>
      action.type === 'increment' ? {revision: state.revision + 1} : state,
    );
    const onMount = jest.fn();
    const onRender = jest.fn();
    const onUnmount = jest.fn();
    const DeferredRevision = () => {
      const revision = useSelector((state: State) => state.revision);

      onRender(revision);

      React.useEffect(() => {
        onMount();
        return onUnmount;
      }, []);

      return <>{revision}</>;
    };
    const makeScreen = () => (
      <Provider store={store}>
        <FocusGatedReduxScreen>
          <DeferredRevision />
        </FocusGatedReduxScreen>
      </Provider>
    );

    let view!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      view = TestRenderer.create(makeScreen());
    });

    expect(view.toJSON()).toBeNull();
    expect(onRender).not.toHaveBeenCalled();
    expect(onMount).not.toHaveBeenCalled();

    await act(async () => {
      store.dispatch({type: 'increment'});
      store.dispatch({type: 'increment'});
    });

    expect(view.toJSON()).toBeNull();
    expect(onRender).not.toHaveBeenCalled();

    mockIsFocused = true;
    await act(async () => {
      view.update(makeScreen());
    });

    expect(view.toJSON()).toBe('2');
    expect(onRender.mock.calls).toEqual([[2]]);
    expect(onMount).toHaveBeenCalledTimes(1);

    mockIsFocused = false;
    await act(async () => {
      view.update(makeScreen());
    });
    const renderCountAfterBlur = onRender.mock.calls.length;

    await act(async () => {
      store.dispatch({type: 'increment'});
    });

    expect(view.toJSON()).toBe('2');
    expect(onRender).toHaveBeenCalledTimes(renderCountAfterBlur);
    expect(onUnmount).not.toHaveBeenCalled();

    mockIsFocused = true;
    await act(async () => {
      view.update(makeScreen());
    });

    expect(view.toJSON()).toBe('3');
    expect(onMount).toHaveBeenCalledTimes(1);
    expect(onUnmount).not.toHaveBeenCalled();
  });

  it('renders the latest state on refocus without processing blurred updates', async () => {
    const store = createStore((state: State = {revision: 0}, action: Action) =>
      action.type === 'increment' ? {revision: state.revision + 1} : state,
    );
    const onRender = jest.fn();
    const screenContent = <Revision onRender={onRender} />;
    const makeScreen = () => (
      <Provider store={store}>
        <FocusGatedReduxScreen>{screenContent}</FocusGatedReduxScreen>
      </Provider>
    );

    let view!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      view = TestRenderer.create(makeScreen());
    });

    expect(view.toJSON()).toBe('0');

    await act(async () => {
      store.dispatch({type: 'increment'});
    });

    expect(view.toJSON()).toBe('1');
    expect(onRender).toHaveBeenCalledTimes(2);

    mockIsFocused = false;
    await act(async () => {
      view.update(makeScreen());
    });
    await act(async () => {
      store.dispatch({type: 'increment'});
      store.dispatch({type: 'increment'});
    });

    expect(view.toJSON()).toBe('1');
    expect(onRender).toHaveBeenCalledTimes(2);

    mockIsFocused = true;
    await act(async () => {
      view.update(makeScreen());
    });

    expect(view.toJSON()).toBe('3');
    expect(onRender).toHaveBeenCalledTimes(3);
  });

  it('provides live state to a new child and its layout effect on refocus', async () => {
    const store = createStore((state: State = {revision: 0}, action: Action) =>
      action.type === 'increment' ? {revision: state.revision + 1} : state,
    );
    const onLayout = jest.fn();
    const onRender = jest.fn();
    const makeScreen = () => (
      <Provider store={store}>
        <FocusGatedReduxScreen>
          <Revision onLayout={onLayout} onRender={onRender} />
        </FocusGatedReduxScreen>
      </Provider>
    );

    let view!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      view = TestRenderer.create(makeScreen());
    });

    mockIsFocused = false;
    await act(async () => {
      view.update(makeScreen());
    });

    onLayout.mockClear();
    onRender.mockClear();
    await act(async () => {
      store.dispatch({type: 'increment'});
      store.dispatch({type: 'increment'});
    });

    expect(onLayout).not.toHaveBeenCalled();
    expect(onRender).not.toHaveBeenCalled();
    expect(view.toJSON()).toBe('0');

    mockIsFocused = true;
    await act(async () => {
      view.update(makeScreen());
    });

    expect(view.toJSON()).toBe('2');
    expect(onRender).toHaveBeenCalled();
    expect(onLayout).toHaveBeenCalled();
    expect(onRender.mock.calls.every(([revision]) => revision === 2)).toBe(
      true,
    );
    expect(onLayout.mock.calls.every(([revision]) => revision === 2)).toBe(
      true,
    );
  });
});
