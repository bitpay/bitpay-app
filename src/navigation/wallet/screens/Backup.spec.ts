import {backupRedirect} from './Backup';
import {Key} from '../../../store/wallet/wallet.models';

describe('backupRedirect', () => {
  it.each([
    ['Settings', 'settings'],
    ['Home', undefined],
  ])(
    'goes back to the %s tab instead of stacking another one',
    (screen, context) => {
      const navigation = {navigate: jest.fn(), dispatch: jest.fn()};

      backupRedirect({context, navigation, walletTermsAccepted: true});

      expect(navigation.navigate).toHaveBeenCalledWith(
        'Tabs',
        {screen},
        {pop: true},
      );
    },
  );

  it('goes back to the swap in progress once the key is backed up', () => {
    const navigation = {navigate: jest.fn(), dispatch: jest.fn()};

    backupRedirect({
      context: 'swapTo',
      navigation,
      walletTermsAccepted: true,
      key: {id: 'key-1', backupComplete: true} as Key,
    });

    expect(navigation.navigate).toHaveBeenCalledWith(
      'SwapCryptoRoot',
      undefined,
      {pop: true, merge: true},
    );
  });

  it('returns to Home after verifying a key from the Home reminder', () => {
    const navigation = {navigate: jest.fn(), dispatch: jest.fn()};

    backupRedirect({
      context: 'home',
      navigation,
      walletTermsAccepted: true,
      key: {id: 'key-1', backupComplete: true} as Key,
    });

    expect(navigation.navigate).toHaveBeenCalledWith(
      'Tabs',
      {screen: 'Home'},
      {pop: true},
    );
    expect(navigation.dispatch).not.toHaveBeenCalled();
  });
});
