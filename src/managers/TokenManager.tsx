import {Token} from '../store/wallet/wallet.models';
import {CurrencyOpts} from '../constants/currencies';

class TokenManager {
  private static instance: TokenManager;
  private listeners: Set<(data: TokenData) => void> = new Set();

  private tokenOptionsByAddress: {[key: string]: Token} = {};
  private tokenDataByAddress: {[key: string]: CurrencyOpts} = {};

  private constructor() {}

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  setTokenOptions(data: {
    tokenOptionsByAddress: {[key: string]: Token};
    tokenDataByAddress: {[key: string]: CurrencyOpts};
  }) {
    this.tokenOptionsByAddress = data.tokenOptionsByAddress;
    this.tokenDataByAddress = data.tokenDataByAddress;
    this.notifyListeners();
  }

  getTokenOptions() {
    return {
      tokenOptionsByAddress: this.tokenOptionsByAddress,
      tokenDataByAddress: this.tokenDataByAddress,
    };
  }

  subscribe(listener: (data: TokenData) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const data = this.getTokenOptions();
    this.listeners.forEach(listener => listener(data));
  }

  clear() {
    this.tokenOptionsByAddress = {};
    this.tokenDataByAddress = {};
    this.notifyListeners();
  }
}

export type TokenData = {
  tokenOptionsByAddress: {[key: string]: Token};
  tokenDataByAddress: {[key: string]: CurrencyOpts};
};

export const tokenManager = TokenManager.getInstance();
