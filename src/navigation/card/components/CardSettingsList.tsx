import {StackNavigationProp} from '@react-navigation/stack';
import React, {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {View} from 'react-native';
import {useDispatch} from 'react-redux';
import CustomizeCardIcon from '../../../../assets/img/customize-card.svg';
import GetHelpIcon from '../../../../assets/img/get-help.svg';
import HelpIcon from '../../../../assets/img/help.svg';
import LockIcon from '../../../../assets/img/lock.svg';
import {Br, Hr} from '../../../components/styled/Containers';
import {Link, Smallest} from '../../../components/styled/Text';
import {AppEffects} from '../../../store/app';
import {Card} from '../../../store/card/card.models';
import {CardBrand} from '../../../store/card/card.types';
import {CardStackParamList} from '../CardStack';
import * as Styled from './CardSettingsList.styled';

interface SettingsListProps {
  card: Card;
  navigation: StackNavigationProp<CardStackParamList, 'Settings'>;
}

const FAQ_VISA_URL =
  'https://support.bitpay.com/hc/en-us/categories/360004308991-BitPay-Prepaid-Debit-Visa-Card-US-';
const FAQ_MASTERCARD_URL =
  'https://support.bitpay.com/hc/en-us/categories/115000745966-BitPay-Card';
const HELP_WIZARD_URL = 'https://bitpay.com/request-help';

const LINKS: {
  [k in CardBrand]: {
    labelKey: string;
    url: string;
  }[];
} = {
  Visa: [],
  Mastercard: [
    {
      labelKey: 'Cardholder Agreement',
      url: 'https://bitpay.com/assets/pdfs/mcb-mastercard-cha-09-21.pdf',
    },
    {
      labelKey: 'Fees Disclosure',
      url: 'https://bitpay.com/assets/pdfs/gpr-mastercard-short-form.pdf',
    },
  ],
};

const SettingsList: React.FC<SettingsListProps> = props => {
  const dispatch = useDispatch();
  const {t} = useTranslation();
  const {card, navigation} = props;
  const [lockPlaceholder, setLockPlaceholder] = useState(false);

  const openUrl = (url: string) => {
    dispatch(AppEffects.openUrlWithInAppBrowser(url));
  };

  const links = LINKS[card.brand || 'Visa'];

  return (
    <View>
      {card.provider === 'firstView' ? (
        <>
          <Styled.CategoryRow>
            <Styled.CategoryHeading>Account</Styled.CategoryHeading>
          </Styled.CategoryRow>

          <Hr />

          <Styled.SettingsLink
            Icon={HelpIcon}
            onPress={() => openUrl(FAQ_VISA_URL)}>
            {t('FAQs')}
          </Styled.SettingsLink>

          <Hr />
        </>
      ) : null}

      {card.provider === 'galileo' ? (
        <>
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

          <Styled.SettingsLink
            Icon={CustomizeCardIcon}
            onPress={() => navigation.navigate('CustomizeVirtualCard', {card})}>
            {t('Customize Virtual Card')}
          </Styled.SettingsLink>

          <Hr />

          <Styled.SettingsLink
            Icon={HelpIcon}
            onPress={() => openUrl(FAQ_MASTERCARD_URL)}>
            {t('FAQs')}
          </Styled.SettingsLink>

          <Hr />
        </>
      ) : null}

      <Styled.SettingsLink
        Icon={GetHelpIcon}
        onPress={() => openUrl(HELP_WIZARD_URL)}>
        {t('Get Help')}
      </Styled.SettingsLink>

      <Hr />

      {links.length ? (
        <>
          <Br />
          <Br />

          {links.map((link, idx) => {
            return (
              <React.Fragment key={link.labelKey}>
                <Link onPress={() => openUrl(link.url)}>
                  {t(link.labelKey)}
                </Link>

                {idx < links.length - 1 ? <Br /> : null}
              </React.Fragment>
            );
          })}
        </>
      ) : null}

      {card.brand === 'Mastercard' ? (
        <>
          <Br />
          <Br />

          <Smallest>{t('TermsAndConditionsMastercard')}</Smallest>

          <Br />

          <Smallest>{t('TermsAndConditionsMastercard2')}</Smallest>
        </>
      ) : null}
    </View>
  );
};

export default SettingsList;
