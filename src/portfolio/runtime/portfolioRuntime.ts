import {createWorkletRuntime, type WorkletRuntime} from 'react-native-worklets';

import {
  getPortfolioMmkvNativeStorageOnRN,
  PORTFOLIO_WORKLET_MMKV_REGISTRY_KEY,
  PORTFOLIO_WORKLET_MMKV_STORAGE_ID,
} from '../adapters/rn/workletMmkvBridge';
import {
  initializePortfolioRuntimeGlobals,
  PORTFOLIO_WORKLET_RUNTIME_NAME,
} from '../adapters/rn/workletRuntimeShared';
import {PortfolioRuntimeClient} from './portfolioClient';
import type {PortfolioRuntimeHostBootstrapConfig} from './portfolioRuntimeHostConfig';
import {createWorkletPortfolioTransport} from './portfolioWorkletTransport';

let portfolioWorkletRuntime: WorkletRuntime | undefined;
let portfolioRateWorkletRuntime: WorkletRuntime | undefined;
let portfolioAnalysisWorkletRuntime: WorkletRuntime | undefined;
let portfolioRuntimeClient: PortfolioRuntimeClient | undefined;
let portfolioRateRuntimeClient: PortfolioRuntimeClient | undefined;
let portfolioAnalysisRuntimeClient: PortfolioRuntimeClient | undefined;

export function getPortfolioRuntimeHostConfigOnRN(): PortfolioRuntimeHostBootstrapConfig {
  return {
    storage: getPortfolioMmkvNativeStorageOnRN(),
    storageId: PORTFOLIO_WORKLET_MMKV_STORAGE_ID,
    registryKey: PORTFOLIO_WORKLET_MMKV_REGISTRY_KEY,
  };
}

function createPortfolioWorkletRuntime(name: string): WorkletRuntime {
  return createWorkletRuntime({
    name,
    initializer: () => {
      'worklet';
      initializePortfolioRuntimeGlobals();
    },
    enableEventLoop: true,
  });
}

export function getPortfolioWorkletRuntime(): WorkletRuntime {
  if (!portfolioWorkletRuntime) {
    portfolioWorkletRuntime = createPortfolioWorkletRuntime(
      PORTFOLIO_WORKLET_RUNTIME_NAME,
    );
  }
  return portfolioWorkletRuntime;
}

export function getPortfolioRateWorkletRuntime(): WorkletRuntime {
  if (!portfolioRateWorkletRuntime) {
    portfolioRateWorkletRuntime = createPortfolioWorkletRuntime(
      `${PORTFOLIO_WORKLET_RUNTIME_NAME}:rates`,
    );
  }
  return portfolioRateWorkletRuntime;
}

export function getPortfolioAnalysisWorkletRuntime(): WorkletRuntime {
  if (!portfolioAnalysisWorkletRuntime) {
    portfolioAnalysisWorkletRuntime = createPortfolioWorkletRuntime(
      `${PORTFOLIO_WORKLET_RUNTIME_NAME}:analysis`,
    );
  }
  return portfolioAnalysisWorkletRuntime;
}

export function createPortfolioRuntimeClient(): PortfolioRuntimeClient {
  return new PortfolioRuntimeClient(
    createWorkletPortfolioTransport({
      runtime: getPortfolioWorkletRuntime(),
      host: getPortfolioRuntimeHostConfigOnRN(),
    }),
  );
}

export function createPortfolioRateRuntimeClient(): PortfolioRuntimeClient {
  return new PortfolioRuntimeClient(
    createWorkletPortfolioTransport({
      runtime: getPortfolioRateWorkletRuntime(),
      host: getPortfolioRuntimeHostConfigOnRN(),
    }),
  );
}

export function createPortfolioAnalysisRuntimeClient(): PortfolioRuntimeClient {
  return new PortfolioRuntimeClient(
    createWorkletPortfolioTransport({
      runtime: getPortfolioAnalysisWorkletRuntime(),
      host: getPortfolioRuntimeHostConfigOnRN(),
    }),
  );
}

export function getPortfolioRuntimeClient(): PortfolioRuntimeClient {
  if (!portfolioRuntimeClient) {
    portfolioRuntimeClient = createPortfolioRuntimeClient();
  }

  return portfolioRuntimeClient;
}

export function getPortfolioRateRuntimeClient(): PortfolioRuntimeClient {
  if (!portfolioRateRuntimeClient) {
    portfolioRateRuntimeClient = createPortfolioRateRuntimeClient();
  }

  return portfolioRateRuntimeClient;
}

export function getPortfolioAnalysisRuntimeClient(): PortfolioRuntimeClient {
  if (!portfolioAnalysisRuntimeClient) {
    portfolioAnalysisRuntimeClient = createPortfolioAnalysisRuntimeClient();
  }

  return portfolioAnalysisRuntimeClient;
}

export function resetPortfolioRuntimeClient(): void {
  if (portfolioRuntimeClient) {
    portfolioRuntimeClient.terminate();
    portfolioRuntimeClient = undefined;
  }

  if (portfolioRateRuntimeClient) {
    portfolioRateRuntimeClient.terminate();
    portfolioRateRuntimeClient = undefined;
  }

  if (portfolioAnalysisRuntimeClient) {
    portfolioAnalysisRuntimeClient.terminate();
    portfolioAnalysisRuntimeClient = undefined;
  }
  portfolioRateWorkletRuntime = undefined;
  portfolioAnalysisWorkletRuntime = undefined;
}
