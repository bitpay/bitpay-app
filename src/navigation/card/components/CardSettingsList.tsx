import {StackNavigationProp} from '@react-navigation/stack';
import React, {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {View} from 'react-native';
import {useDispatch} from 'react-redux';
import styled from 'styled-components/native';
import AngleRight from '../../../../assets/img/angle-right.svg';
import {Hr, Setting, SettingTitle} from '../../../components/styled/Containers';
import {H4} from '../../../components/styled/Text';
import ToggleSwitch from '../../../components/toggle-switch/ToggleSwitch';
import {AppEffects} from '../../../store/app';
import {Card} from '../../../store/card/card.models';
import {CardStackParamList} from '../CardStack';

interface SettingsListProps {
  card: Card;
  navigation: StackNavigationProp<CardStackParamList, 'Settings'>;
}

interface SettingsLinkProps {
  onPress?: () => any;
}

interface SettingsToggleProps {
  value: boolean;
  onChange?: (value: boolean) => any;
}

const FAQ_MASTERCARD_URL =
  'https://support.bitpay.com/hc/en-us/categories/115000745966-BitPay-Card';
const HELP_WIZARD_URL = 'https://bitpay.com/request-help';

const CategoryRow = styled.View`
  align-items: center;
  flex-direction: row;
  justify-content: space-between;
  min-height: 58px;
`;

const CategoryHeading = styled(H4)`
  font-weight: 700;
  margin-top: 25px;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  min-height: 58px;
`;

const SettingsLink: React.FC<SettingsLinkProps> = props => {
  const {onPress, children} = props;

  return (
    <Setting onPressOut={onPress}>
      <SettingTitle>{children}</SettingTitle>
      <AngleRight />
    </Setting>
  );
};

const SettingsToggle: React.FC<SettingsToggleProps> = props => {
  const {onChange, value, children} = props;

  return (
    <Setting>
      <SettingTitle>{children}</SettingTitle>
      <ToggleSwitch isEnabled={value} onChange={onChange} />
    </Setting>
  );
};

const SettingsList: React.FC<SettingsListProps> = props => {
  const dispatch = useDispatch();
  const {t} = useTranslation();
  const {card, navigation} = props;
  const [lockPlaceholder, setLockPlaceholder] = useState(false);

  const openUrl = (url: string) => {
    dispatch(AppEffects.openUrlWithInAppBrowser(url));
  };

  return (
    <View>
      <CategoryRow>
        <CategoryHeading>Security</CategoryHeading>
      </CategoryRow>

      <Hr />

      <SettingsToggle
        value={lockPlaceholder}
        onChange={() => setLockPlaceholder(!lockPlaceholder)}>
        LOCK CARD PLACEHOLDER
      </SettingsToggle>

      <Hr />

      <CategoryRow>
        <CategoryHeading>Account</CategoryHeading>
      </CategoryRow>

      <Hr />

      <SettingsLink onPress={() => 0}>DOSH PLACEHOLDER</SettingsLink>

      <Hr />

      {card.provider === 'galileo' ? (
        <>
          <SettingsLink
            onPress={() => navigation.navigate('CustomizeVirtualCard', {card})}>
            {t('Customize Virtual Card')}
          </SettingsLink>

          <Hr />
        </>
      ) : null}

      <SettingsLink onPress={() => openUrl(FAQ_MASTERCARD_URL)}>
        {t('FAQs')}
      </SettingsLink>

      <Hr />

      <SettingsLink onPress={() => openUrl(HELP_WIZARD_URL)}>
        {t('Get Help')}
      </SettingsLink>
    </View>
  );
};

export default SettingsList;
