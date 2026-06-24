import type {WorkletMmkvStorageBridge} from '../adapters/rn/mmkvKvStore';

export type PortfolioRuntimeHostBootstrapConfig = {
  storage: WorkletMmkvStorageBridge;
  storageId?: string;
  registryKey?: string;
};
