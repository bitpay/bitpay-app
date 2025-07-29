import React from 'react';
import styled from 'styled-components/native';
import {useNavigation} from '@react-navigation/native';
import haptic from '../../../../../components/haptic-feedback/haptic';
import {
  SettingsComponent,
  SettingsContainer,
  SettingsHomeContainer,
} from '../../SettingsRoot';
import {
  Hr,
  Setting,
  SettingTitle,
} from '../../../../../components/styled/Containers';
import AngleRight from '../../../../../../assets/img/angle-right.svg';
import ChangellyLogo from '../../../../../components/icons/external-services/changelly/changelly-logo';
import ThorswapLogo from '../../../../../components/icons/external-services/thorswap/thorswap-logo';
import {useAppSelector} from '../../../../../utils/hooks';
import {SwapCryptoExchangeKey} from '../../../../services/swap-crypto/utils/swap-crypto-utils';
import {ExternalServicesSettingsScreens} from '../ExternalServicesGroup';
import {View} from 'react-native';

const ExternalServicesItemContainer = styled.View`
  justify-content: flex-start;
  align-items: center;
  flex-direction: row;
  flex: 1;
`;

const ExternalServicesIconContainer = styled.View`
  margin-right: 5px;
`;

const SwapHistorySelector = () => {
  const navigation = useNavigation();
  const {changelly: changellyHistory, thorswap: thorswapHistory} =
    useAppSelector(({SWAP_CRYPTO: {changelly, thorswap}}) => ({
      changelly,
      thorswap,
    }));

  type ExchangeData = {
    key: SwapCryptoExchangeKey;
    exchangeName: string;
    logo: React.JSX.Element;
    screenHistory: any;
    showExchange: boolean;
    txCount: number;
  };

  const allSwapExchangesData: {[key in SwapCryptoExchangeKey]: ExchangeData} = {
    changelly: {
      key: 'changelly',
      exchangeName: 'Changelly',
      logo: <ChangellyLogo iconOnly={true} width={30} height={30} />,
      screenHistory: ExternalServicesSettingsScreens.CHANGELLY_SETTINGS,
      showExchange: !!(
        changellyHistory && Object.values(changellyHistory).length > 0
      ),
      txCount: changellyHistory ? Object.values(changellyHistory).length : 0,
    },
    thorswap: {
      key: 'thorswap',
      exchangeName: 'THORSwap',
      logo: <ThorswapLogo iconOnly={true} widthIcon={30} heightIcon={22} />,
      screenHistory: ExternalServicesSettingsScreens.THORSWAP_SETTINGS,
      showExchange: !!(
        thorswapHistory && Object.values(thorswapHistory).length > 0
      ),
      txCount: thorswapHistory ? Object.values(thorswapHistory).length : 0,
    },
  };

  return (
    <SettingsContainer>
      <SettingsHomeContainer>
        <SettingsComponent>
          {allSwapExchangesData
            ? Object.values(allSwapExchangesData).map(
                (exchange: ExchangeData) => {
                  return exchange?.showExchange ? (
                    <View key={exchange.key}>
                      <Setting
                        onPress={() => {
                          haptic('impactLight');
                          navigation.navigate(exchange.screenHistory);
                        }}>
                        <ExternalServicesItemContainer>
                          <ExternalServicesIconContainer>
                            {exchange.logo}
                          </ExternalServicesIconContainer>
                          <SettingTitle>{`${exchange.exchangeName}${
                            exchange.txCount > 0
                              ? ' (' + exchange.txCount + ')'
                              : ''
                          }`}</SettingTitle>
                        </ExternalServicesItemContainer>
                        <AngleRight />
                      </Setting>
                      <Hr />
                    </View>
                  ) : null;
                },
              )
            : null}
        </SettingsComponent>
      </SettingsHomeContainer>
    </SettingsContainer>
  );
};

export default SwapHistorySelector;
