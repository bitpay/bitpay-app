import {logManager} from './managers/LogManager';
import {formatUnknownError} from './utils/errors/formatUnknownError';

type BooleanRef = {
  current: boolean;
};

type LaunchPopulateArgs = {
  dispatch: (action: any) => any;
  failedAppInit: boolean;
  launchPopulateStartedRef: BooleanRef;
  onboardingCompleted: boolean;
  populatePortfolioActionCreator: () => any;
  logger?: Pick<typeof logManager, 'warn'>;
};

type PostUnlockStartupWorkArgs = {
  accountEvmCreationMigrationComplete: boolean;
  accountSvmCreationMigrationComplete: boolean;
  runAddressFix: () => Promise<void>;
  runCompleteEvmWalletsAccountFix: () => Promise<void>;
  runCompleteSvmWalletsAccountFix: () => Promise<void>;
  runPortfolioPopulateOnAppLaunch: () => void;
  runSvmAddressCreationFix: () => Promise<void>;
  sleep: (ms: number) => Promise<void>;
  svmAddressFixComplete: boolean;
  urlHandler: () => unknown;
};

export const runPortfolioPopulateOnAppLaunch = ({
  dispatch,
  failedAppInit,
  launchPopulateStartedRef,
  logger = logManager,
  onboardingCompleted,
  populatePortfolioActionCreator,
}: LaunchPopulateArgs): void => {
  if (
    launchPopulateStartedRef.current ||
    !onboardingCompleted ||
    failedAppInit
  ) {
    return;
  }

  launchPopulateStartedRef.current = true;

  setTimeout(() => {
    try {
      const result = dispatch(populatePortfolioActionCreator() as any);
      void Promise.resolve(result).catch(error => {
        logger.warn(
          `[portfolio] Launch populate failed: ${formatUnknownError(error)}`,
        );
      });
    } catch (error: unknown) {
      logger.warn(
        `[portfolio] Launch populate failed: ${formatUnknownError(error)}`,
      );
    }
  }, 0);
};

export const runPostUnlockStartupWork = async ({
  accountEvmCreationMigrationComplete,
  accountSvmCreationMigrationComplete,
  runAddressFix,
  runCompleteEvmWalletsAccountFix,
  runCompleteSvmWalletsAccountFix,
  runPortfolioPopulateOnAppLaunch,
  runSvmAddressCreationFix,
  sleep,
  svmAddressFixComplete,
  urlHandler,
}: PostUnlockStartupWorkArgs): Promise<void> => {
  await runAddressFix();
  if (!accountEvmCreationMigrationComplete) {
    await sleep(1000);
    await runCompleteEvmWalletsAccountFix();
  }
  if (!accountSvmCreationMigrationComplete) {
    await sleep(1000);
    await runCompleteSvmWalletsAccountFix();
  }
  if (!svmAddressFixComplete) {
    await sleep(1000);
    await runSvmAddressCreationFix();
  }
  void urlHandler();
  runPortfolioPopulateOnAppLaunch();
};
