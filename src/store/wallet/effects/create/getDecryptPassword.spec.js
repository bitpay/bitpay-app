import {getDecryptPassword} from './create';
import configureTestStore from '@test/store';
import {
  dismissDecryptPasswordModal,
  showDecryptPasswordModal,
} from '../../../app/app.actions';
import {checkEncryptPassword} from '../../utils/wallet';

/**
 * Mock showDecryptPasswordModal and Spy on dismissDecryptPasswordModal
 */
jest.mock('../../../app/app.actions', () => ({
  ...jest.requireActual('../../../app/app.actions'),
  showDecryptPasswordModal: jest.fn().mockImplementation(() => {
    return {type: 'MOCK'};
  }),
  dismissDecryptPasswordModal: jest.fn().mockImplementation(() => {
    return {type: 'MOCK'};
  }),
}));

/**
 * Mock checkEncryptPassword
 */
jest.mock('../../utils/wallet', () => ({
  ...jest.requireActual('../../utils/wallet'),
  checkEncryptPassword: jest
    .fn()
    .mockImplementation((key, pass) => key === 'unlocked'),
}));

/**
 * getDecryptPassword Tests
 */
describe('getDecryptPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls showDecryptPasswordModal with onSubmitHandler config', () => {
    const store = configureTestStore({});
    store.dispatch(getDecryptPassword('test'));
    const argument = showDecryptPasswordModal.mock.calls[0][0];
    expect(showDecryptPasswordModal).toHaveBeenCalledTimes(1);
    expect(typeof argument.onSubmitHandler).toEqual('function');
  });

  it('calls dismissDecryptPasswordModal when submit handler is called', async () => {
    const store = configureTestStore({});
    const promiseResult = store.dispatch(getDecryptPassword('test'));

    const argument = showDecryptPasswordModal.mock.calls[0][0];
    await argument.onSubmitHandler();
    await expect(promiseResult).rejects.toEqual({
      message: 'invalid password',
    });
    expect(dismissDecryptPasswordModal).toHaveBeenCalledTimes(1);
  });

  it('will resolve the promise as we expect', async () => {
    const store = configureTestStore({});
    const promiseSuccessResult = store.dispatch(getDecryptPassword('unlocked'));
    const successArgument = showDecryptPasswordModal.mock.calls[0][0];
    await successArgument.onSubmitHandler('privatekey');
    await expect(promiseSuccessResult).resolves.toEqual('privatekey');
    expect(checkEncryptPassword).toHaveBeenCalledWith('unlocked', 'privatekey');
  });

  it('will reject the promise as we expect', async () => {
    const store = configureTestStore({});
    const promiseFailedResult = store.dispatch(getDecryptPassword('test'));
    const failedArgument = showDecryptPasswordModal.mock.calls[0][0];
    await failedArgument.onSubmitHandler('privatekey');
    await expect(promiseFailedResult).rejects.toEqual({
      message: 'invalid password',
    });
    expect(checkEncryptPassword).toHaveBeenCalledWith('test', 'privatekey');
  });
});
