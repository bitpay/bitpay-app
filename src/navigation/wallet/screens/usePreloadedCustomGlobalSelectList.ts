import {useCallback, useEffect, useRef} from 'react';
import FastImage from 'react-native-fast-image';
import type {Keys} from '../../../store/wallet/wallet.reducer';
import {scheduleAfterTransitionAndIdle} from '../../../utils/scheduleAfterInteractionsAndFrames';
import {
  preloadCustomGlobalSelectList,
  type PreloadedCustomGlobalSelectList,
} from './GlobalSelect';

type CustomCurrencies = Parameters<
  typeof preloadCustomGlobalSelectList
>[0]['customToSelectCurrencies'];

export const getCustomGlobalSelectRemoteImageUris = (
  preloadedList: PreloadedCustomGlobalSelectList,
): string[] => {
  const imageUris = new Set<string>();

  preloadedList.data.forEach(item => {
    if (typeof item.img === 'string' && item.img.startsWith('http')) {
      imageUris.add(item.img);
    }
    Object.values(item.chainsImg).forEach(({badgeUri, badgeImg}) => {
      const image = badgeUri || badgeImg;
      if (typeof image === 'string' && image.startsWith('http')) {
        imageUris.add(image);
      }
    });
  });

  return [...imageUris];
};

const usePreloadedCustomGlobalSelectList = ({
  navigation,
  keys,
  customToSelectCurrencies,
  selectedChainFilterOption,
  livenetOnly = true,
}: {
  navigation: any;
  keys: Keys;
  customToSelectCurrencies: CustomCurrencies;
  selectedChainFilterOption?: string;
  livenetOnly?: boolean;
}) => {
  const preloadedListRef = useRef<PreloadedCustomGlobalSelectList | undefined>(
    undefined,
  );
  const preloadInputsRef = useRef({
    keys,
    customToSelectCurrencies,
    selectedChainFilterOption,
    livenetOnly,
  });
  preloadInputsRef.current = {
    keys,
    customToSelectCurrencies,
    selectedChainFilterOption,
    livenetOnly,
  };

  const preload = useCallback(() => {
    const currentInputs = preloadInputsRef.current;
    if (currentInputs.customToSelectCurrencies.length === 0) {
      preloadedListRef.current = undefined;
      return;
    }

    const preloadedList = preloadCustomGlobalSelectList({
      ...currentInputs,
      previous: preloadedListRef.current,
    });
    preloadedListRef.current = preloadedList;

    const imageUris = getCustomGlobalSelectRemoteImageUris(preloadedList);
    if (imageUris.length > 0) {
      FastImage.preload(
        imageUris.map(uri => ({
          uri,
          priority: FastImage.priority.normal,
        })),
      );
    }
  }, []);

  useEffect(() => {
    if (customToSelectCurrencies.length === 0) {
      preloadedListRef.current = undefined;
      return;
    }

    const preloadTask = scheduleAfterTransitionAndIdle({
      navigation,
      transitionFallbackMs: 800,
      idleTimeoutMs: 900,
      callback: signal => {
        if (!signal.aborted) {
          preload();
        }
      },
    });

    return preloadTask.cancel;
  }, [
    customToSelectCurrencies,
    keys,
    livenetOnly,
    navigation,
    preload,
    selectedChainFilterOption,
  ]);

  return {preloadedListRef, preload};
};

export default usePreloadedCustomGlobalSelectList;
