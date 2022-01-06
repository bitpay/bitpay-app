import {AxiosError} from 'axios';

export const isAxiosError = <T = any>(err: any): err is AxiosError<T> => {
  return err.isAxiosError;
};
