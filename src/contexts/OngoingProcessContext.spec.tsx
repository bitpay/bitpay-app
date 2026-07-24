import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {ongoingProcessManager} from '../managers/OngoingProcessManager';
import {
  OngoingProcessProvider,
  useOngoingProcess,
  useOngoingProcessActions,
  useOngoingProcessState,
} from './OngoingProcessContext';

describe('OngoingProcessContext', () => {
  let renderer: TestRenderer.ReactTestRenderer | undefined;

  beforeEach(() => {
    ongoingProcessManager.clear();
  });

  afterEach(() => {
    act(() => {
      renderer?.unmount();
    });
    renderer = undefined;
    ongoingProcessManager.clear();
  });

  it('does not re-render action consumers when visibility changes', () => {
    let actionsRenderCount = 0;
    let actions: ReturnType<typeof useOngoingProcess> | undefined;

    const ActionsConsumer = () => {
      actionsRenderCount += 1;
      actions = useOngoingProcess();
      return null;
    };

    act(() => {
      renderer = TestRenderer.create(
        <OngoingProcessProvider>
          <ActionsConsumer />
        </OngoingProcessProvider>,
      );
    });

    expect(actionsRenderCount).toBe(1);

    act(() => {
      actions?.showOngoingProcess('GENERAL_AWAITING');
    });
    act(() => {
      actions?.hideOngoingProcess();
    });

    expect(actionsRenderCount).toBe(1);
  });

  it('updates the overlay state consumer on show and hide', () => {
    let overlayRenderCount = 0;
    let actions: ReturnType<typeof useOngoingProcessActions> | undefined;
    let overlayState = ongoingProcessManager.getState();

    const ActionsConsumer = () => {
      actions = useOngoingProcessActions();
      return null;
    };

    const OverlayConsumer = () => {
      overlayRenderCount += 1;
      overlayState = useOngoingProcessState();
      return null;
    };

    act(() => {
      renderer = TestRenderer.create(
        <OngoingProcessProvider>
          <ActionsConsumer />
          <OverlayConsumer />
        </OngoingProcessProvider>,
      );
    });

    expect(overlayRenderCount).toBe(1);
    expect(overlayState).toEqual({
      isVisible: false,
      message: undefined,
    });

    act(() => {
      actions?.showOngoingProcess('GENERAL_AWAITING');
    });

    expect(overlayRenderCount).toBe(2);
    expect(overlayState.isVisible).toBe(true);
    expect(overlayState.message).toBeTruthy();

    act(() => {
      actions?.hideOngoingProcess();
    });

    expect(overlayRenderCount).toBe(3);
    expect(overlayState).toEqual({
      isVisible: false,
      message: undefined,
    });
  });
});
