import {Effect} from '../../../index';
import axios from 'axios';
import {Token} from '../../wallet.models';
import {
  failedGetTokenOptions,
  successGetTokenOptions,
} from '../../wallet.actions';

export const startGetTokenOptions = (): Effect => async dispatch => {
  try {
    const {
      data: {tokens},
    } = await axios.get<{
      tokens: {[key in string]: Token};
    }>('https://api.1inch.io/v4.0/1/tokens');

    const allTokens: {[key in string]: Token} = {};
    Object.values(tokens).forEach(token => {
      allTokens[token.symbol.toLowerCase()] = token;
    });

    dispatch(successGetTokenOptions(allTokens));
  } catch (e) {
    console.error(e);
    dispatch(failedGetTokenOptions());
  }
};
