import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {Settings, SettingsContainer} from '../../SettingsRoot';
import Button from '../../../../../components/button/Button';
import {RootState} from '../../../../../store';
import {
  Hr,
  Setting,
  SettingTitle,
} from '../../../../../components/styled/Containers';
import {AppActions} from '../../../../../store/app';

const SecuritySettingsRoot: React.FC = () => {
  const dispatch = useDispatch();
  const pinLockActive = useSelector(({APP}: RootState) => APP.pinLockActive);

  const setPin = () => {
    dispatch(AppActions.showPinModal({type: 'set'}));
  };

  const removePin = () => {
    dispatch(AppActions.currentPin(undefined));
    dispatch(AppActions.pinLockActive(false));
  };

  return (
    <SettingsContainer>
      <Settings>
        <Hr />
        <Setting>
          <SettingTitle>Lock App</SettingTitle>
          <Button
            onPress={pinLockActive ? removePin : setPin}
            buttonType={'pill'}>
            {pinLockActive ? 'Enabled' : 'Disabled'}
          </Button>
        </Setting>
        <Hr />
      </Settings>
    </SettingsContainer>
  );
};

export default SecuritySettingsRoot;
