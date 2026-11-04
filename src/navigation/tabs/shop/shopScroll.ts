import React from 'react';

/**
 * Shop's outer ScrollView offset, shared with the lists inside its tab
 * navigator without re-rendering ShopHome on every scroll event.
 */
export type ScrollSignal = {
  get: () => number;
  set: (y: number) => void;
  subscribe: (listener: () => void) => () => void;
};

export const createScrollSignal = (): ScrollSignal => {
  let y = 0;
  const listeners = new Set<() => void>();
  return {
    get: () => y,
    set: next => {
      y = next;
      listeners.forEach(listener => listener());
    },
    subscribe: listener => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};

export const ShopScrollContext = React.createContext<ScrollSignal | null>(null);
