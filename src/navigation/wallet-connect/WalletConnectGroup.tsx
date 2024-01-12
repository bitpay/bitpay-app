import React from 'react';
import {HeaderTitle} from '../../components/styled/Text';
import WalletConnectIntro, {
  WalletConnectIntroParamList,
} from './screens/WalletConnectIntro';
import WalletConnectIcon from '../../../assets/img/wallet-connect/wallet-connect-icon.svg';
import WalletConnectStart, {
  WalletConnectStartParamList,
} from './screens/WalletConnectStart';
import WalletConnectHome, {
  WalletConnectHomeParamList,
} from './screens/WalletConnectHome';
import WalletConnectConnections from './screens/WalletConnectConnections';
import WalletConnectRequestDetails, {
  WalletConnectRequestDetailsParamList,
} from './screens/WalletConnectRequestDetails';
import styled from 'styled-components/native';
import {WalletConnectIconContainer} from './styled/WalletConnectContainers';
import WalletConnectConfirm, {
  WalletConnectConfirmParamList,
} from './screens/WalletConnectConfirm';
import {useTranslation} from 'react-i18next';
import {Root} from '../../Root';
import {
  baseNativeHeaderBackButtonProps,
  baseNavigatorOptions,
} from '../../constants/NavigationOptions';
import {HeaderBackButton} from '@react-navigation/elements';

interface WalletConnectProps {
  WalletConnect: typeof Root;
}

const WalletConnectHeaderTitle = styled.View`
  align-items: center;
  flex-direction: row;
`;

export const WalletConnectHeader = () => {
  return (
    <WalletConnectHeaderTitle>
      <WalletConnectIconContainer>
        <WalletConnectIcon />
      </WalletConnectIconContainer>
      <HeaderTitle>WalletConnect</HeaderTitle>
    </WalletConnectHeaderTitle>
  );
};

export type WalletConnectGroupParamList = {
  WalletConnectRoot: WalletConnectIntroParamList;
  WalletConnectStart: WalletConnectStartParamList;
  WalletConnectConnections: undefined;
  WalletConnectHome: WalletConnectHomeParamList;
  WalletConnectRequestDetails: WalletConnectRequestDetailsParamList;
  WalletConnectConfirm: WalletConnectConfirmParamList;
};

export enum WalletConnectScreens {
  WC_ROOT = 'WalletConnectRoot',
  WC_START = 'WalletConnectStart',
  WC_CONNECTIONS = 'WalletConnectConnections',
  WC_HOME = 'WalletConnectHome',
  WC_REQUEST_DETAILS = 'WalletConnectRequestDetails',
  WC_CONFIRM = 'WalletConnectConfirm',
}

const WalletConnectGroup: React.FC<WalletConnectProps> = ({WalletConnect}) => {
  const {t} = useTranslation();
  return (
    <WalletConnect.Group
      screenOptions={({navigation}) => ({
        ...baseNavigatorOptions,
        headerLeft: () => (
          <HeaderBackButton
            onPress={() => {
              navigation.goBack();
            }}
            {...baseNativeHeaderBackButtonProps}
          />
        ),
      })}>
      <WalletConnect.Screen
        name={WalletConnectScreens.WC_ROOT}
        component={WalletConnectIntro}
        options={{
          headerTitle: () => WalletConnectHeader(),
        }}
      />
      <WalletConnect.Screen
        name={WalletConnectScreens.WC_START}
        component={WalletConnectStart}
        options={{
          headerTitle: () => WalletConnectHeader(),
        }}
      />
      <WalletConnect.Screen
        name={WalletConnectScreens.WC_CONNECTIONS}
        component={WalletConnectConnections}
        options={{
          headerTitle: () => WalletConnectHeader(),
        }}
      />
      <WalletConnect.Screen
        name={WalletConnectScreens.WC_HOME}
        component={WalletConnectHome}
      />
      <WalletConnect.Screen
        name={WalletConnectScreens.WC_REQUEST_DETAILS}
        component={WalletConnectRequestDetails}
        options={{
          headerTitle: () => <HeaderTitle>{t('Sign Request')}</HeaderTitle>,
        }}
      />
      <WalletConnect.Screen
        name={WalletConnectScreens.WC_CONFIRM}
        component={WalletConnectConfirm}
        options={{
          headerTitle: () => <HeaderTitle>{t('Confirm Payment')}</HeaderTitle>,
          gestureEnabled: false,
        }}
      />
    </WalletConnect.Group>
  );
};

export default WalletConnectGroup;
