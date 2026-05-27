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

export function getPortfolioWorkletRuntime(): WorkletRuntime {
  if (!portfolioWorkletRuntime) {
    portfolioWorkletRuntime = createWorkletRuntime({
      name: PORTFOLIO_WORKLET_RUNTIME_NAME,
      initializer: () => {
        'worklet';
        initializePortfolioRuntimeGlobals();
      },
      enableEventLoop: true,
    });
  }
  return portfolioWorkletRuntime;
}

export function createPortfolioRuntimeClient(): PortfolioRuntimeClient {
  return new PortfolioRuntimeClient(
    createWorkletPortfolioTransport({
      runtime: getPortfolioWorkletRuntime(),
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
    portfolioRateRuntimeClient = new PortfolioRuntimeClient(
      createWorkletPortfolioTransport({
        runtime: getPortfolioWorkletRuntime(),
        host: getPortfolioRuntimeHostConfigOnRN(),
      }),
    );
  }

  return portfolioRateRuntimeClient;
}

export function getPortfolioAnalysisRuntimeClient(): PortfolioRuntimeClient {
  if (!portfolioAnalysisRuntimeClient) {
    portfolioAnalysisRuntimeClient = new PortfolioRuntimeClient(
      createWorkletPortfolioTransport({
        runtime: getPortfolioWorkletRuntime(),
        host: getPortfolioRuntimeHostConfigOnRN(),
      }),
    );
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

  portfolioWorkletRuntime = undefined;
}
