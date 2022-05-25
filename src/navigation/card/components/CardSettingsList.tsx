import {DOSH_WHITELIST} from '@env';
import {StackNavigationProp} from '@react-navigation/stack';
import React, {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Linking, View} from 'react-native';
import styled from 'styled-components/native';
import {Br, Hr} from '../../../components/styled/Containers';
import {Link, Smallest} from '../../../components/styled/Text';
import {URL} from '../../../constants';
import {CardBrand, CardProvider} from '../../../constants/card';
import Dosh from '../../../lib/dosh';
import {AppActions, AppEffects} from '../../../store/app';
import {CardActions, CardEffects} from '../../../store/card';
import {Card} from '../../../store/card/card.models';
import {LogActions} from '../../../store/log';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import CustomizeCardIcon from '../assets/settings/icon-card.svg';
import EditCardNameIcon from '../assets/settings/icon-cardname.svg';
import FaqsIcon from '../assets/settings/icon-faqs.svg';
import GetHelpIcon from '../assets/settings/icon-help.svg';
import DownloadHistoryIcon from '../assets/settings/icon-history.svg';
import LockIcon from '../assets/settings/icon-lock.svg';
import OffersIcon from '../assets/settings/icon-offers.svg';
import ReferEarnIcon from '../assets/settings/icon-referearn.svg';
import {CardStackParamList} from '../CardStack';
import * as Styled from './CardSettingsList.styled';
import {ToggleSpinnerState} from './ToggleSpinner';

interface SettingsListProps {
  card: Card;
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

const DoshWhitelist: string[] = [];

if (DOSH_WHITELIST) {
  try {
    DoshWhitelist.push(...DOSH_WHITELIST.split(',').map(email => email.trim()));
  } catch (e) {
    console.log('Unable to parse DOSH_WHITELIST', e);
  }
}

// TODO: update theme.colors.link if this is a universal change
const CardSettingsTextLink = styled(Link)`
  color: ${({theme}) => (theme.dark ? '#4989ff' : theme.colors.link)};
`;

const SettingsList: React.FC<SettingsListProps> = props => {
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const {card, navigation} = props;
  const user = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
  );
  const [localLockState, setLocalLockState] = useState(card.lockedByUser);
  const [localLockStatus, setLocalLockStatus] =
    useState<ToggleSpinnerState>(null);
  const updateCardLockStatus = useAppSelector(
    ({CARD}) => CARD.updateCardLockStatus[card.id],
  );

  const openUrl = async (url: string, download?: boolean) => {
    const canUrlBeHandled = await Linking.canOpenURL(url).catch(() => false);

    if (download && canUrlBeHandled) {
      Linking.openURL(url);
      return;
    }

    dispatch(AppEffects.openUrlWithInAppBrowser(url));
  };

  const links = LINKS[card.brand || CardBrand.Visa];

  const isDoshWhitelisted = !!user && DoshWhitelist.includes(user.email);

  const onLockToggled = (locked: boolean) => {
    // set local lock state for immediate feedback, reset if request fails
    setLocalLockState(locked);
    setLocalLockStatus('loading');
    dispatch(CardEffects.START_UPDATE_CARD_LOCK(card.id, locked));
  };

  useEffect(() => {
    // whether success or fail, lockedByUser will be correct so update the local state and reset the flag
    if (
      updateCardLockStatus === 'success' ||
      updateCardLockStatus === 'failed'
    ) {
      setLocalLockState(card.lockedByUser);

      if (localLockStatus === 'loading') {
        setLocalLockStatus(updateCardLockStatus);
      }

      let tid = setTimeout(() => {
        setLocalLockStatus(null);

        tid = setTimeout(() => {
          dispatch(CardActions.updateUpdateCardLockStatus(card.id, null));
        }, 1000);
      }, 1000);

      return () => {
        clearTimeout(tid);
      };
    }
    // localLockStatus ok to leave out of deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateCardLockStatus, card.id, card.lockedByUser, dispatch]);

  return (
    <View>
      {card.provider === 'firstView' ? (
        <>
          <Styled.CategoryRow>
            <Styled.CategoryHeading>Account</Styled.CategoryHeading>
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
            <Styled.CategoryHeading>Security</Styled.CategoryHeading>
          </Styled.CategoryRow>

          <Hr />

          <Styled.SettingsToggle
            Icon={LockIcon}
            value={localLockState}
            onChange={onLockToggled}
            state={localLockStatus}>
            Lock Card
          </Styled.SettingsToggle>

          <Hr />

          <Styled.CategoryRow>
            <Styled.CategoryHeading>Account</Styled.CategoryHeading>
          </Styled.CategoryRow>

          <Hr />

          <Styled.SettingsLink
            Icon={ReferEarnIcon}
            onPress={() => navigation.navigate('Referral', {card})}>
            {t('Refer & Earn')}
          </Styled.SettingsLink>

          <Hr />

          <Styled.SettingsLink
            Icon={OffersIcon}
            onPress={async () => {
              if (!isDoshWhitelisted) {
                dispatch(
                  AppActions.showBottomNotificationModal({
                    type: 'warning',
                    title: 'Unavailable',
                    message: 'Cards Offers unavailable at this time',
                    enableBackdropDismiss: true,
                    actions: [
                      {
                        text: 'OK',
                        action: () => {},
                        primary: true,
                      },
                    ],
                  }),
                );

                return;
              }

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
            Card Offers
          </Styled.SettingsLink>

          <Hr />

          {card.cardType === 'virtual' ? (
            <>
              <Styled.SettingsLink
                Icon={CustomizeCardIcon}
                onPress={() =>
                  navigation.navigate('CustomizeVirtualCard', {card})
                }>
                {t('Customize Virtual Card')}
              </Styled.SettingsLink>

              <Hr />
            </>
          ) : null}

          <Styled.SettingsLink
            Icon={EditCardNameIcon}
            onPress={() => navigation.navigate('UpdateCardName', {card})}>
            {t('Update Card Name')}
          </Styled.SettingsLink>

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
                <CardSettingsTextLink
                  onPress={() => openUrl(link.url, link.download)}
                  style={{}}>
                  {t(link.labelKey)}
                </CardSettingsTextLink>

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
