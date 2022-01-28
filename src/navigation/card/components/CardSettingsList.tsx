import {StackNavigationProp} from '@react-navigation/stack';
import React, {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {View} from 'react-native';
import {SvgProps} from 'react-native-svg';
import {useDispatch} from 'react-redux';
import AngleRight from '../../../../assets/img/angle-right.svg';
import CustomizeCardIcon from '../../../../assets/img/customize-card.svg';
import GetHelpIcon from '../../../../assets/img/get-help.svg';
import HelpIcon from '../../../../assets/img/help.svg';
import LockIcon from '../../../../assets/img/lock.svg';
import {Hr, Setting, SettingTitle} from '../../../components/styled/Containers';
import ToggleSwitch from '../../../components/toggle-switch/ToggleSwitch';
import {AppEffects} from '../../../store/app';
import {Card} from '../../../store/card/card.models';
import {CardStackParamList} from '../CardStack';
import * as Styled from './CardSettingsList.styled';

interface SettingsListProps {
  card: Card;
  navigation: StackNavigationProp<CardStackParamList, 'Settings'>;
}

interface SettingsRowBaseProps {
  Icon: React.FC<SvgProps>;
}

interface SettingsLinkProps extends SettingsRowBaseProps {
  onPress?: () => any;
}

interface SettingsToggleProps extends SettingsRowBaseProps {
  value: boolean;
  onChange?: (value: boolean) => any;
}

const ICON_SIZE = 20;

const FAQ_MASTERCARD_URL =
  'https://support.bitpay.com/hc/en-us/categories/115000745966-BitPay-Card';
const HELP_WIZARD_URL = 'https://bitpay.com/request-help';

const SettingsLink: React.FC<SettingsLinkProps> = props => {
  const {Icon, onPress, children} = props;

  return (
    <Setting onPressOut={onPress}>
      <Styled.SettingsIconContainer prefix>
        <Icon height={ICON_SIZE} width={ICON_SIZE} />
      </Styled.SettingsIconContainer>

      <SettingTitle>{children}</SettingTitle>

      <Styled.SettingsIconContainer suffix>
        <AngleRight />
      </Styled.SettingsIconContainer>
    </Setting>
  );
};

const SettingsToggle: React.FC<SettingsToggleProps> = props => {
  const {Icon, onChange, value, children} = props;

  return (
    <Setting>
      <Styled.SettingsIconContainer prefix>
        <Icon height={ICON_SIZE} width={ICON_SIZE} />
      </Styled.SettingsIconContainer>

      <SettingTitle>{children}</SettingTitle>

      <Styled.SettingsIconContainer suffix>
        <ToggleSwitch isEnabled={value} onChange={onChange} />
      </Styled.SettingsIconContainer>
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
      <Styled.CategoryRow>
        <Styled.CategoryHeading>Security</Styled.CategoryHeading>
      </Styled.CategoryRow>

      <Hr />

      <SettingsToggle
        Icon={LockIcon}
        value={lockPlaceholder}
        onChange={() => setLockPlaceholder(!lockPlaceholder)}>
        LOCK CARD PLACEHOLDER
      </SettingsToggle>

      <Hr />

      <Styled.CategoryRow>
        <Styled.CategoryHeading>Account</Styled.CategoryHeading>
      </Styled.CategoryRow>

      <Hr />

      <SettingsLink Icon={HelpIcon} onPress={() => 0}>
        DOSH PLACEHOLDER
      </SettingsLink>

      <Hr />

      {card.provider === 'galileo' ? (
        <>
          <SettingsLink
            Icon={CustomizeCardIcon}
            onPress={() => navigation.navigate('CustomizeVirtualCard', {card})}>
            {t('Customize Virtual Card')}
          </SettingsLink>

          <Hr />
        </>
      ) : null}

      <SettingsLink Icon={HelpIcon} onPress={() => openUrl(FAQ_MASTERCARD_URL)}>
        {t('FAQs')}
      </SettingsLink>

      <Hr />

      <SettingsLink Icon={GetHelpIcon} onPress={() => openUrl(HELP_WIZARD_URL)}>
        {t('Get Help')}
      </SettingsLink>

      <Hr />
    </View>
  );
};

export default SettingsList;
