import {useCallback} from 'react';

import {
  TSSCopayerSignStatus,
  TSSSigningProgress,
  TSSSigningStatus,
} from '../../store/wallet/wallet.models';
import {TSSSigningCallbacks} from '../../store/wallet/effects/tss-send/tss-send';
import {logManager} from '../../managers/LogManager';
import {sleep} from '../../utils/helper-methods';

interface UseTSSCallbacksParams {
  setTssStatus: (status: TSSSigningStatus) => void;
  setTssProgress: (progress: TSSSigningProgress) => void;
  setTssCopayers: any;
  tssCopayers: Array<{id: string; name: string; signed: boolean}>;
  setShowTSSProgressModal: (show: boolean) => void;
  setResetSwipeButton: (reset: boolean) => void;
}

export const useTSSCallbacks = ({
  setTssStatus,
  setTssProgress,
  setTssCopayers,
  tssCopayers,
  setShowTSSProgressModal,
  setResetSwipeButton,
}: UseTSSCallbacksParams): TSSSigningCallbacks => {
  const onStatusChange = useCallback(
    async (status: TSSSigningStatus) => {
      logManager.debug(`[TSS Callbacks] Status changed: ${status}`);
      setTssStatus(status);
      if (status === 'initializing') {
        setShowTSSProgressModal(true);
      }
      if (status === 'complete') {
        await sleep(1500);
        setShowTSSProgressModal(false);
      }
    },
    [setTssStatus, setShowTSSProgressModal],
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
      setTssStatus('error');
      setShowTSSProgressModal(false);
      setResetSwipeButton(true);
    },
    [setShowTSSProgressModal, setResetSwipeButton],
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
