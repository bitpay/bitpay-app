import {createHomeCardList} from './Crypto';
import {Key} from '../../../../store/wallet/wallet.models';

describe('createHomeCardList', () => {
  it('asks to back up a key without backup before opening it', async () => {
    const navigation = {navigate: jest.fn()};
    const dispatch = jest.fn();
    const key = {
      id: 'key-1',
      keyName: 'My Key',
      backupComplete: false,
      wallets: [],
    } as unknown as Key;

    const {list} = createHomeCardList({
      navigation,
      keys: [key],
      dispatch,
      homeCarouselConfig: [{id: 'key-1', show: true}],
      homeCarouselLayoutType: 'carousel',
      hideKeyBalance: false,
    });
    list[0].component.props.onPress();

    expect(navigation.navigate).not.toHaveBeenCalled();
    const sheet = dispatch.mock.calls[0][0];
    expect(sheet.type).toBe('APP/SHOW_BOTTOM_NOTIFICATION_MODAL');
    expect(sheet.payload.title).toBe('Key backup required');

    await sheet.payload.actions[0].action();
    expect(navigation.navigate).toHaveBeenCalledWith('BackupOnboarding', {
      keyId: 'key-1',
      context: 'home',
    });
  });
});
