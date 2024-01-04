import React, {useEffect, useState} from 'react';
import styled from 'styled-components/native';
import {useNavigation} from '@react-navigation/native';
import haptic from '../../../../components/haptic-feedback/haptic';
import {SettingsComponent} from '../SettingsRoot';
import {
  Hr,
  Setting,
  SettingTitle,
} from '../../../../components/styled/Containers';
import AngleRight from '../../../../../assets/img/angle-right.svg';
import BanxaLogo from '../../../../components/icons/external-services/banxa/banxa-logo';
import ChangellyLogo from '../../../../components/icons/external-services/changelly/changelly-logo';
import MoonpayLogo from '../../../../components/icons/external-services/moonpay/moonpay-logo';
import RampLogo from '../../../../components/icons/external-services/ramp/ramp-logo';
import SardineLogo from '../../../../components/icons/external-services/sardine/sardine-logo';
import SimplexLogo from '../../../../components/icons/external-services/simplex/simplex-logo';
import WyreLogo from '../../../../components/icons/external-services/wyre/wyre-logo';
import {useAppSelector} from '../../../../utils/hooks';
import {RootState} from '../../../../store';
import {WyrePaymentData} from '../../../../store/buy-crypto/buy-crypto.models';

const ExternalServicesItemContainer = styled.View`
  justify-content: flex-start;
  align-items: center;
  flex-direction: row;
  flex: 1;
`;

const ExternalServicesIconContainer = styled.View`
  margin-right: 5px;
`;

const ExternalServices = () => {
  const navigation = useNavigation();
  const wyreHistory = useAppSelector(
    ({BUY_CRYPTO}: RootState) => BUY_CRYPTO.wyre,
  );
  const [wyrePaymentRequests, setTransactions] = useState(
    [] as WyrePaymentData[],
  );

  useEffect(() => {
    const _wyrePaymentRequests = Object.values(wyreHistory).filter(
      pr => pr.env === (__DEV__ ? 'dev' : 'prod'),
    );
    setTransactions(_wyrePaymentRequests);
  }, []);

  return (
    <SettingsComponent>
      <Setting
        onPress={() => {
          haptic('impactLight');
          navigation.navigate('BanxaSettings');
        }}>
        <ExternalServicesItemContainer>
          <ExternalServicesIconContainer>
            <BanxaLogo iconOnly={true} width={30} height={25} />
          </ExternalServicesIconContainer>
          <SettingTitle>Banxa</SettingTitle>
        </ExternalServicesItemContainer>
        <AngleRight />
      </Setting>
      <Hr />
      <Setting
        onPress={() => {
          haptic('impactLight');
          navigation.navigate('ChangellySettings');
        }}>
        <ExternalServicesItemContainer>
          <ExternalServicesIconContainer>
            <ChangellyLogo iconOnly={true} width={30} height={30} />
          </ExternalServicesIconContainer>
          <SettingTitle>Changelly</SettingTitle>
        </ExternalServicesItemContainer>
        <AngleRight />
      </Setting>
      <Hr />
      <Setting
        onPress={() => {
          haptic('impactLight');
          navigation.navigate('MoonpaySettings');
        }}>
        <ExternalServicesItemContainer>
          <ExternalServicesIconContainer>
            <MoonpayLogo iconOnly={true} widthIcon={30} heightIcon={25} />
          </ExternalServicesIconContainer>
          <SettingTitle>Moonpay</SettingTitle>
        </ExternalServicesItemContainer>
        <AngleRight />
      </Setting>
      <Hr />
      <Setting
        onPress={() => {
          haptic('impactLight');
          navigation.navigate('RampSettings');
        }}>
        <ExternalServicesItemContainer>
          <ExternalServicesIconContainer>
            <RampLogo iconOnly={true} width={30} height={30} />
          </ExternalServicesIconContainer>
          <SettingTitle>Ramp</SettingTitle>
        </ExternalServicesItemContainer>
        <AngleRight />
      </Setting>
      <Hr />
      <Setting
        onPress={() => {
          haptic('impactLight');
          navigation.navigate('SardineSettings');
        }}>
        <ExternalServicesItemContainer>
          <ExternalServicesIconContainer>
            <SardineLogo iconOnly={true} width={30} height={25} />
          </ExternalServicesIconContainer>
          <SettingTitle>Sardine</SettingTitle>
        </ExternalServicesItemContainer>
        <AngleRight />
      </Setting>
      <Hr />
      <Setting
        onPress={() => {
          haptic('impactLight');
          navigation.navigate('SimplexSettings');
        }}>
        <ExternalServicesItemContainer>
          <ExternalServicesIconContainer>
            <SimplexLogo iconOnly={true} widthIcon={30} heightIcon={25} />
          </ExternalServicesIconContainer>
          <SettingTitle>Simplex</SettingTitle>
        </ExternalServicesItemContainer>
        <AngleRight />
      </Setting>
      {wyrePaymentRequests?.length > 0 ? (
        <>
          <Hr />
          <Setting
            onPress={() => {
              haptic('impactLight');
              navigation.navigate('WyreSettings');
            }}>
            <ExternalServicesItemContainer>
              <ExternalServicesIconContainer>
                <WyreLogo iconOnly={true} width={30} height={25} />
              </ExternalServicesIconContainer>
              <SettingTitle>Wyre</SettingTitle>
            </ExternalServicesItemContainer>
            <AngleRight />
          </Setting>
        </>
      ) : null}
    </SettingsComponent>
  );
};

export default ExternalServices;
