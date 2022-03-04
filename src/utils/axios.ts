import {AxiosError} from 'axios';

type RateLimitErrorResponse = {
  error: string;
  limit: string;
};

export const isAxiosError = <T = any>(err: any): err is AxiosError<T> => {
  return err.isAxiosError;
};

export const isRateLimitError = (
  err: any,
): err is AxiosError<RateLimitErrorResponse> => {
  if (isAxiosError(err)) {
    return err.response?.status === 429;
  }

  return false;
};
