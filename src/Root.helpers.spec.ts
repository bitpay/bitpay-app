import {
  runPortfolioPopulateOnAppLaunch,
  runPostUnlockStartupWork,
} from './Root.helpers';

describe('runPortfolioPopulateOnAppLaunch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  const makeArgs = (overrides: Record<string, any> = {}) => ({
    dispatch: jest.fn(),
    failedAppInit: false,
    launchPopulateStartedRef: {current: false},
    logger: {warn: jest.fn()},
    onboardingCompleted: true,
    populatePortfolioActionCreator: jest.fn(() => ({type: 'POPULATE'})),
    ...overrides,
  });

  it('schedules populate without dispatching synchronously and fires once per launch session', () => {
    const args = makeArgs();

    runPortfolioPopulateOnAppLaunch(args);
    runPortfolioPopulateOnAppLaunch(args);

    expect(args.launchPopulateStartedRef.current).toBe(true);
    expect(args.populatePortfolioActionCreator).not.toHaveBeenCalled();
    expect(args.dispatch).not.toHaveBeenCalled();

    jest.runOnlyPendingTimers();

    expect(args.populatePortfolioActionCreator).toHaveBeenCalledTimes(1);
    expect(args.dispatch).toHaveBeenCalledTimes(1);
    expect(args.dispatch).toHaveBeenCalledWith({type: 'POPULATE'});
  });

  it('does not fire before onboarding is complete', () => {
    const args = makeArgs({onboardingCompleted: false});

    runPortfolioPopulateOnAppLaunch(args);
    jest.runOnlyPendingTimers();

    expect(args.populatePortfolioActionCreator).not.toHaveBeenCalled();
    expect(args.dispatch).not.toHaveBeenCalled();
    expect(args.launchPopulateStartedRef.current).toBe(false);
  });

  it('does not fire when app init failed', () => {
    const args = makeArgs({failedAppInit: true});

    runPortfolioPopulateOnAppLaunch(args);
    jest.runOnlyPendingTimers();

    expect(args.populatePortfolioActionCreator).not.toHaveBeenCalled();
    expect(args.dispatch).not.toHaveBeenCalled();
    expect(args.launchPopulateStartedRef.current).toBe(false);
  });

  it('logs async dispatch failures without throwing', async () => {
    const args = makeArgs({
      dispatch: jest.fn(() => Promise.reject(new Error('populate failed'))),
    });

    runPortfolioPopulateOnAppLaunch(args);
    jest.runOnlyPendingTimers();
    await Promise.resolve();
    await Promise.resolve();

    expect(args.logger.warn).toHaveBeenCalledWith(
      '[portfolio] Launch populate failed: populate failed',
    );
  });

  it('logs synchronous dispatch failures from the scheduled callback', () => {
    const args = makeArgs({
      dispatch: jest.fn(() => {
        throw new Error('sync populate failed');
      }),
    });

    runPortfolioPopulateOnAppLaunch(args);

    expect(args.logger.warn).not.toHaveBeenCalled();

    jest.runOnlyPendingTimers();

    expect(args.logger.warn).toHaveBeenCalledWith(
      '[portfolio] Launch populate failed: sync populate failed',
    );
  });
});

describe('runPostUnlockStartupWork', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('runs launch populate only after existing post-unlock startup fixes', async () => {
    const calls: string[] = [];
    const pushCall = (name: string) => async () => {
      calls.push(name);
    };

    await runPostUnlockStartupWork({
      accountEvmCreationMigrationComplete: false,
      accountSvmCreationMigrationComplete: false,
      runAddressFix: pushCall('address'),
      runCompleteEvmWalletsAccountFix: pushCall('evm'),
      runCompleteSvmWalletsAccountFix: pushCall('svm'),
      runPortfolioPopulateOnAppLaunch: () => calls.push('schedule-populate'),
      runSvmAddressCreationFix: pushCall('svm-address'),
      sleep: async () => {
        calls.push('sleep');
      },
      svmAddressFixComplete: false,
      urlHandler: () => calls.push('url'),
    });

    expect(calls).toEqual([
      'address',
      'sleep',
      'evm',
      'sleep',
      'svm',
      'sleep',
      'svm-address',
      'url',
      'schedule-populate',
    ]);
  });

  it('does not synchronously dispatch launch populate before returning', async () => {
    const calls: string[] = [];
    const dispatch = jest.fn((action: any) => {
      calls.push('dispatch');
      return action;
    });
    const launchPopulateStartedRef = {current: false};
    const populatePortfolioActionCreator = jest.fn(() => {
      calls.push('create-action');
      return {type: 'POPULATE'};
    });

    await runPostUnlockStartupWork({
      accountEvmCreationMigrationComplete: true,
      accountSvmCreationMigrationComplete: true,
      runAddressFix: async () => {
        calls.push('address');
      },
      runCompleteEvmWalletsAccountFix: async () => {
        calls.push('evm');
      },
      runCompleteSvmWalletsAccountFix: async () => {
        calls.push('svm');
      },
      runPortfolioPopulateOnAppLaunch: () => {
        calls.push('schedule-populate');
        runPortfolioPopulateOnAppLaunch({
          dispatch,
          failedAppInit: false,
          launchPopulateStartedRef,
          onboardingCompleted: true,
          populatePortfolioActionCreator,
        });
      },
      runSvmAddressCreationFix: async () => {
        calls.push('svm-address');
      },
      sleep: async () => {
        calls.push('sleep');
      },
      svmAddressFixComplete: true,
      urlHandler: () => calls.push('url'),
    });

    expect(calls).toEqual(['address', 'url', 'schedule-populate']);
    expect(populatePortfolioActionCreator).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();

    jest.runOnlyPendingTimers();

    expect(calls).toEqual([
      'address',
      'url',
      'schedule-populate',
      'create-action',
      'dispatch',
    ]);
  });
});
