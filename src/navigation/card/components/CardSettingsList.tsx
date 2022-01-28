import {StackNavigationProp} from '@react-navigation/stack';
import React, {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {View} from 'react-native';
import {useDispatch} from 'react-redux';
import CustomizeCardIcon from '../../../../assets/img/customize-card.svg';
import GetHelpIcon from '../../../../assets/img/get-help.svg';
import HelpIcon from '../../../../assets/img/help.svg';
import LockIcon from '../../../../assets/img/lock.svg';
import {Hr} from '../../../components/styled/Containers';
import {AppEffects} from '../../../store/app';
import {Card} from '../../../store/card/card.models';
import {CardStackParamList} from '../CardStack';
import * as Styled from './CardSettingsList.styled';

interface SettingsListProps {
  card: Card;
  navigation: StackNavigationProp<CardStackParamList, 'Settings'>;
}

const FAQ_MASTERCARD_URL =
  'https://support.bitpay.com/hc/en-us/categories/115000745966-BitPay-Card';
const HELP_WIZARD_URL = 'https://bitpay.com/request-help';

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
      <Styled.CategoryRow>
        <Styled.CategoryHeading>Security</Styled.CategoryHeading>
      </Styled.CategoryRow>

      <Hr />

      <Styled.SettingsToggle
        Icon={LockIcon}
        value={lockPlaceholder}
        onChange={() => setLockPlaceholder(!lockPlaceholder)}>
        LOCK CARD PLACEHOLDER
      </Styled.SettingsToggle>

      <Hr />

      <Styled.CategoryRow>
        <Styled.CategoryHeading>Account</Styled.CategoryHeading>
      </Styled.CategoryRow>

      <Hr />

      <Styled.SettingsLink Icon={HelpIcon} onPress={() => 0}>
        DOSH PLACEHOLDER
      </Styled.SettingsLink>

      <Hr />

      {card.provider === 'galileo' ? (
        <>
          <Styled.SettingsLink
            Icon={CustomizeCardIcon}
            onPress={() => navigation.navigate('CustomizeVirtualCard', {card})}>
            {t('Customize Virtual Card')}
          </Styled.SettingsLink>

          <Hr />
        </>
      ) : null}

      <Styled.SettingsLink
        Icon={HelpIcon}
        onPress={() => openUrl(FAQ_MASTERCARD_URL)}>
        {t('FAQs')}
      </Styled.SettingsLink>

      <Hr />

      <Styled.SettingsLink
        Icon={GetHelpIcon}
        onPress={() => openUrl(HELP_WIZARD_URL)}>
        {t('Get Help')}
      </Styled.SettingsLink>

      <Hr />
    </View>
  );
};

export default SettingsList;
