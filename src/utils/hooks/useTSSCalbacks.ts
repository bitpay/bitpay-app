import {Dispatch, SetStateAction, useCallback} from 'react';
import {
  TSSCopayerSignStatus,
  TSSSigningProgress,
  TSSSigningStatus,
} from '../../store/wallet/wallet.models';
import {TSSSigningCallbacks} from '../../store/wallet/effects/tss-send/tss-send';
import {logManager} from '../../managers/LogManager';
import {sleep} from '../../utils/helper-methods';

type TSSCopayer = {id: string; name: string; signed: boolean};

interface UseTSSCallbacksParams {
  setTssStatus: (status: TSSSigningStatus) => void;
  setTssProgress: (progress: TSSSigningProgress) => void;
  setTssCopayers: Dispatch<SetStateAction<TSSCopayer[]>>;
  tssCopayers: Array<{id: string; name: string; signed: boolean}>;
  setShowTSSProgressModal: (show: boolean) => void;
  setResetSwipeButton: (reset: boolean) => void;
}

export const useTSSCallbacks = ({
  setTssStatus,
  setTssProgress,
  setTssCopayers,
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
    },
    [setTssProgress],
  );

  const onCopayerStatusChange = useCallback(
    (copayerId: string, status: TSSCopayerSignStatus) => {
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

  const onComplete = useCallback((_signature: string) => {
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
