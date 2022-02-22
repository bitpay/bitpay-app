import {FeeLevels, getFeeRatePerKb} from '../fee/fee';
import {CustomErrorMessage} from '../../../../navigation/wallet/components/ErrorMessages';
import {StackActions} from '@react-navigation/native';
import {BWCErrorMessage} from '../../../../constants/BWCError';
import {ProposalErrorHandlerProps} from '../../wallet.models';
import {BottomNotificationConfig} from '../../../../components/modal/bottom-notification/BottomNotification';
import {ParseAmount} from '../amount/amount';
import {navigationRef} from '../../../../Root';

export const insufficientFundsHandler = async ({
  err,
  tx,
  txp,
  getState,
}: ProposalErrorHandlerProps): Promise<BottomNotificationConfig> => {
  const {wallet, amount} = tx;
  const {feeLevel} = txp;

  const feeRatePerKb = await getFeeRatePerKb({
    wallet,
    feeLevel: feeLevel || FeeLevels.NORMAL,
  });

  if (
    !getState().WALLET.useUnconfirmedFunds &&
    wallet.balance.sat >=
      ParseAmount(amount, wallet.currencyAbbreviation).amountSat + feeRatePerKb
  ) {
    return CustomErrorMessage({
      title: 'Insufficient confirmed funds',
      errMsg:
        'You do not have enough confirmed funds to make this payment. Wait for your pending transactions to confirm or enable "Use unconfirmed funds" in Advanced Settings.',
      action: () => {
        navigationRef.dispatch(StackActions.pop(2));
      },
    });
  } else {
    return CustomErrorMessage({
      title: 'Insufficient funds',
      errMsg: BWCErrorMessage(err),
    });
  }
};
