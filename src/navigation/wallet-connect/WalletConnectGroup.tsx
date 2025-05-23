import React from 'react';
import {HeaderTitle} from '../../components/styled/Text';
import WalletConnectIntro, {
  WalletConnectIntroParamList,
} from './screens/WalletConnectIntro';
import WalletConnectIcon from '../../../assets/img/wallet-connect/wallet-connect-icon.svg';
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
import {baseNavigatorOptions} from '../../constants/NavigationOptions';
import HeaderBackButton from '../../components/back/HeaderBackButton';

interface WalletConnectProps {
  WalletConnect: typeof Root;
}

const WalletConnectHeaderTitle = styled.View`
  align-items: center;
  flex-direction: row;
  border-width: 1px;
  border-color: ${({theme}) => theme.colors.border};
  padding: 5px 8px;
  border-radius: 50px;
`;

export const WalletConnectHeader = () => {
  return (
    <WalletConnectHeaderTitle>
      <WalletConnectIconContainer>
        <WalletConnectIcon />
      </WalletConnectIconContainer>
      <HeaderTitle style={{fontSize: 16}}>WalletConnect</HeaderTitle>
    </WalletConnectHeaderTitle>
  );
};

export type WalletConnectGroupParamList = {
  WalletConnectRoot: WalletConnectIntroParamList;
  WalletConnectConnections: undefined;
  WalletConnectHome: WalletConnectHomeParamList;
  WalletConnectRequestDetails: WalletConnectRequestDetailsParamList;
  WalletConnectConfirm: WalletConnectConfirmParamList;
};

export enum WalletConnectScreens {
  WC_ROOT = 'WalletConnectRoot',
  WC_CONNECTIONS = 'WalletConnectConnections',
  WC_HOME = 'WalletConnectHome',
  WC_REQUEST_DETAILS = 'WalletConnectRequestDetails',
  WC_CONFIRM = 'WalletConnectConfirm',
}

const WalletConnectGroup: React.FC<WalletConnectProps> = ({WalletConnect}) => {
  const {t} = useTranslation();
  return (
    <WalletConnect.Group
      screenOptions={() => ({
        ...baseNavigatorOptions,
        headerLeft: () => <HeaderBackButton />,
      })}>
      <WalletConnect.Screen
        name={WalletConnectScreens.WC_ROOT}
        component={WalletConnectIntro}
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
