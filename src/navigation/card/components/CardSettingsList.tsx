import {StackNavigationProp} from '@react-navigation/stack';
import React, {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {View} from 'react-native';
import CustomizeCardIcon from '../../../../assets/img/customize-card.svg';
import GetHelpIcon from '../../../../assets/img/get-help.svg';
import HelpIcon from '../../../../assets/img/help.svg';
import LockIcon from '../../../../assets/img/lock.svg';
import UpdateIcon from '../../../../assets/img/update.svg';
import {Br, Hr} from '../../../components/styled/Containers';
import {Link, Smallest} from '../../../components/styled/Text';
import {URL} from '../../../constants';
import {CardBrand, CardProvider} from '../../../constants/card';
import Dosh from '../../../lib/dosh';
import {AppEffects} from '../../../store/app';
import {Card} from '../../../store/card/card.models';
import {LogActions} from '../../../store/log';
import {useAppDispatch} from '../../../utils/hooks';
import {CardStackParamList} from '../CardStack';
import * as Styled from './CardSettingsList.styled';

interface SettingsListProps {
  card: Card;
  navigation: StackNavigationProp<CardStackParamList, 'Settings'>;
}

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
      url: URL.MASTERCARD_CARDHOLDER_AGREEMENT,
    },
    {
      labelKey: 'Fees Disclosure',
      url: URL.MASTERCARD_FEES_DISCLOSURE,
    },
  ],
};

const SettingsList: React.FC<SettingsListProps> = props => {
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const {card, navigation} = props;
  const [lockPlaceholder, setLockPlaceholder] = useState(false);

  const openUrl = (url: string) => {
    dispatch(AppEffects.openUrlWithInAppBrowser(url));
  };

  const links = LINKS[card.brand || CardBrand.Visa];

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
            onPress={() => openUrl(URL.VISA_FAQ)}>
            {t('FAQs')}
          </Styled.SettingsLink>

          <Hr />
        </>
      ) : null}

      {card.provider === CardProvider.galileo ? (
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

          <Styled.SettingsLink
            Icon={HelpIcon}
            onPress={async () => {
              try {
                Dosh.present();
              } catch (err) {
                dispatch(
                  LogActions.error(
                    'Something went wrong trying to open Dosh Rewards',
                  ),
                );
                dispatch(LogActions.error(JSON.stringify(err)));
              }
            }}>
            Offers
          </Styled.SettingsLink>

          <Hr />

          <Styled.SettingsLink
            Icon={CustomizeCardIcon}
            onPress={() => navigation.navigate('CustomizeVirtualCard', {card})}>
            {t('Customize Virtual Card')}
          </Styled.SettingsLink>

          <Hr />

          <Styled.SettingsLink
            Icon={UpdateIcon}
            onPress={() => navigation.navigate('UpdateCardName', {card})}>
            {t('Update Card Name')}
          </Styled.SettingsLink>

          <Hr />

          <Styled.SettingsLink
            Icon={HelpIcon}
            onPress={() => openUrl(URL.MASTERCARD_FAQ)}>
            {t('FAQs')}
          </Styled.SettingsLink>

          <Hr />
        </>
      ) : null}

      <Styled.SettingsLink
        Icon={GetHelpIcon}
        onPress={() => openUrl(URL.HELP_WIZARD)}>
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

      {card.brand === CardBrand.Mastercard ? (
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
