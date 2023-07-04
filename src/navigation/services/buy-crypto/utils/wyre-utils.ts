export const wyreEnv = __DEV__ ? 'sandbox' : 'production';

export const handleWyreStatus = (status: string): string => {
  switch (status) {
    case 'RUNNING_CHECKS':
      return 'paymentRequestSent';
    case 'PROCESSING':
      return 'paymentRequestSent';
    case 'FAILED':
      return 'failed';
    case 'COMPLETE':
      return 'success';
    default:
      return 'paymentRequestSent';
  }
};
