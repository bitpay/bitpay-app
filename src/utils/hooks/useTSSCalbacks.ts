import React, {useCallback} from 'react';
import {useTranslation} from 'react-i18next';

import {
  TSSCopayerSignStatus,
  TSSSigningProgress,
  TSSSigningStatus,
  Wallet,
} from '../../store/wallet/wallet.models';
import {BottomNotificationConfig} from '../../components/modal/bottom-notification/BottomNotification';
import {TSSSigningCallbacks} from '../../store/wallet/effects/tss-send/tss-send';
import {logManager} from '../../managers/LogManager';
import {CustomErrorMessage} from '../../navigation/wallet/components/ErrorMessages';

interface UseTSSCallbacksParams {
  wallet: Wallet;
  setTssStatus: (status: TSSSigningStatus) => void;
  setTssProgress: (progress: TSSSigningProgress) => void;
  setTssCopayers: any;
  tssCopayers: Array<{id: string; name: string; signed: boolean}>;
  setShowTSSProgressModal: (show: boolean) => void;
  setResetSwipeButton: (reset: boolean) => void;
  showErrorMessage: (msg: BottomNotificationConfig) => Promise<void>;
}

export const useTSSCallbacks = ({
  wallet,
  setTssStatus,
  setTssProgress,
  setTssCopayers,
  tssCopayers,
  setShowTSSProgressModal,
  setResetSwipeButton,
  showErrorMessage,
}: UseTSSCallbacksParams): TSSSigningCallbacks => {
  const {t} = useTranslation();

  const onStatusChange = useCallback(
    (status: TSSSigningStatus) => {
      logManager.debug(`[TSS Callbacks] Status changed: ${status}`);
      setTssStatus(status);
    },
    [setTssStatus],
  );

  const onProgressUpdate = useCallback(
    (progress: TSSSigningProgress) => {
      logManager.debug(
        `[TSS Callbacks] Progress: Round ${progress.currentRound}/${progress.totalRounds}`,
      );
      setTssProgress(progress);

      // When round 1 starts, mark all copayers as joined/signing
      // TODO remove this when onCopayerStatusChange is properly implemented
      if (progress.currentRound === 1) {
        logManager.debug(`[TSS Callbacks] Marking copayers as signed`);
        setTssCopayers(prev => {
          // Only update if copayers aren't already signed
          const allSigned = prev.every(c => c.signed);
          if (!allSigned) {
            return prev.map(c => ({...c, signed: true}));
          }
          return prev;
        });
      }
    },
    [setTssProgress, setTssCopayers],
  );

  const onCopayerStatusChange = useCallback(
    (copayerId: string, status: TSSCopayerSignStatus) => {
      // This will never fire - keeping for future when event exists
      logManager.debug(`[TSS Callbacks] Copayer ${copayerId} ${status}`);
      setTssCopayers(prev =>
        prev.map(c =>
          c.id === copayerId ? {...c, signed: status === 'signed'} : c,
        ),
      );
    },
    [setTssCopayers],
  );

  const onRoundUpdate = useCallback(
    (round: number, type: 'ready' | 'processed' | 'submitted') => {
      logManager.debug(`[TSS Callbacks] Round ${round} ${type}`);
    },
    [],
  );

  const onError = useCallback(
    (error: Error) => {
      logManager.error(`[TSS Callbacks] Error: ${error.message}`);
      setShowTSSProgressModal(false);
      setResetSwipeButton(true);
      showErrorMessage(
        CustomErrorMessage({
          errMsg: error.message,
          title: t('TSS Signing Error'),
        }),
      );
    },
    [setShowTSSProgressModal, setResetSwipeButton, showErrorMessage, t],
  );

  const onComplete = useCallback((signature: string) => {
    logManager.debug(`[TSS Callbacks] Signing complete`);
  }, []);

  return {
    onStatusChange,
    onProgressUpdate,
    onCopayerStatusChange,
    onRoundUpdate,
    onError,
    onComplete,
  };
};
