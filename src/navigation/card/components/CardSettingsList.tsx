import {StackNavigationProp} from '@react-navigation/stack';
import React from 'react';
import {useTranslation} from 'react-i18next';
import {Linking, View} from 'react-native';
import {Br, Hr} from '../../../components/styled/Containers';
import {Link} from '../../../components/styled/Text';
import {URL} from '../../../constants';
import {CardBrand, CardProvider} from '../../../constants/card';
import {AppEffects} from '../../../store/app';
import {Card} from '../../../store/card/card.models';
import {useAppDispatch} from '../../../utils/hooks';
import FaqsIcon from '../assets/settings/icon-faqs.svg';
import GetHelpIcon from '../assets/settings/icon-help.svg';
import DownloadHistoryIcon from '../assets/settings/icon-history.svg';
import {CardStackParamList} from '../CardStack';
import * as Styled from './CardSettingsList.styled';

interface SettingsListProps {
  card: Card;
  orderPhysical?: boolean;
  navigation: StackNavigationProp<CardStackParamList, 'Settings'>;
}

const LINKS: {
  [k in CardBrand]: {
    labelKey: string;
    url: string;
    download?: boolean;
  }[];
} = {
  Visa: [],
  Mastercard: [
    {
      labelKey: 'Cardholder Agreement',
      url: URL.MASTERCARD_CARDHOLDER_AGREEMENT,
      download: true,
    },
    {
      labelKey: 'Fees Disclosure',
      url: URL.MASTERCARD_FEES_DISCLOSURE,
      download: true,
    },
  ],
};

const SettingsList: React.FC<SettingsListProps> = props => {
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const {card} = props;
  const openUrl = async (url: string, download?: boolean) => {
    const canUrlBeHandled = await Linking.canOpenURL(url).catch(() => false);

    if (download && canUrlBeHandled) {
      Linking.openURL(url);
      return;
    }

    dispatch(AppEffects.openUrlWithInAppBrowser(url));
  };

  const links = LINKS[card.brand || CardBrand.Visa];

  return (
    <View>
      {card.provider === 'firstView' ? (
        <>
          <Styled.CategoryRow>
            <Styled.CategoryHeading>{t('Account')}</Styled.CategoryHeading>
          </Styled.CategoryRow>

          <Hr />

          <Styled.SettingsLink
            Icon={FaqsIcon}
            onPress={() => openUrl(URL.VISA_FAQ)}>
            {t('FAQs')}
          </Styled.SettingsLink>

          <Hr />
        </>
      ) : null}

      {card.provider === CardProvider.galileo ? (
        <>
          <Styled.CategoryRow>
            <Styled.CategoryHeading>{t('Account')}</Styled.CategoryHeading>
          </Styled.CategoryRow>

          <Hr />

          <Styled.SettingsLink
            Icon={DownloadHistoryIcon}
            onPress={() => openUrl(URL.PERSONAL_DASHBOARD_CARD)}>
            {t('Download History')}
          </Styled.SettingsLink>

          <Hr />

          <Styled.SettingsLink
            Icon={FaqsIcon}
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
                <Link onPress={() => openUrl(link.url, link.download)}>
                  {link.labelKey}
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
          <Styled.TermsAndConditionsMastercard />
        </>
      ) : null}
    </View>
  );
};

export default SettingsList;
