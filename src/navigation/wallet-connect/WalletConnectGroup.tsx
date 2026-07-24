import React from 'react';
import {Theme, useTheme} from '@react-navigation/native';
import {View, ViewProps, StyleSheet} from 'react-native';
import {HeaderTitle} from '../../components/styled/Text';
import WalletConnectIntro, {
  WalletConnectIntroParamList,
} from './screens/WalletConnectIntro';
import WalletConnectIcon from '../../../assets/img/wallet-connect/wallet-connect-icon.svg';
import WalletConnectHome, {
  WalletConnectHomeParamList,
} from './screens/WalletConnectHome';
import WalletConnectConnections, {
  WalletConnectConnectionsParamList,
} from './screens/WalletConnectConnections';
import WalletConnectRequestDetails, {
  WalletConnectRequestDetailsParamList,
} from './screens/WalletConnectRequestDetails';
import {WalletConnectIconContainer} from './styled/WalletConnectContainers';
import WalletConnectConfirm, {
  WalletConnectConfirmParamList,
} from './screens/WalletConnectConfirm';
import {useTranslation} from 'react-i18next';
import {Root} from '../../Root';
import {useStackScreenOptions} from '../utils/headerHelpers';

interface WalletConnectProps {
  WalletConnect: typeof Root;
  theme: Theme;
}

const styles = StyleSheet.create({
  walletConnectHeaderTitle: {
    alignItems: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 50,
  },
});

const WalletConnectHeaderTitle = ({style, ...rest}: ViewProps) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.walletConnectHeaderTitle,
        {borderColor: theme.colors.border},
        style,
      ]}
      {...rest}
    />
  );
};

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
  WalletConnectConnections: WalletConnectConnectionsParamList;
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

const WalletConnectGroup = ({WalletConnect, theme}: WalletConnectProps) => {
  const commonOptions = useStackScreenOptions(theme);
  const {t} = useTranslation();
  return (
    <WalletConnect.Group screenOptions={commonOptions}>
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
