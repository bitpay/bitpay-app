import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React, {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Linking, Platform, View} from 'react-native';
import {Br, Hr} from '../../../components/styled/Containers';
import {Link, Smallest} from '../../../components/styled/Text';
import {URL} from '../../../constants';
import {CardBrand, CardProvider} from '../../../constants/card';
import {BASE_BITPAY_URLS} from '../../../constants/config';
import {AppActions, AppEffects} from '../../../store/app';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {CardActions, CardEffects} from '../../../store/card';
import {Card} from '../../../store/card/card.models';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import ApplePayIcon from '../assets/settings/icon-apple-pay.svg';
import CustomizeCardIcon from '../assets/settings/icon-card.svg';
import OrderPhysicalCardIcon from '../assets/settings/icon-card.svg';
import EditCardNameIcon from '../assets/settings/icon-cardname.svg';
import FaqsIcon from '../assets/settings/icon-faqs.svg';
import GooglePayIcon from '../assets/settings/icon-google-pay.svg';
import GetHelpIcon from '../assets/settings/icon-help.svg';
import DownloadHistoryIcon from '../assets/settings/icon-history.svg';
import ResetPinIcon from '../assets/settings/icon-info.svg';
import LockIcon from '../assets/settings/icon-lock.svg';
import OffersIcon from '../assets/settings/icon-offers.svg';
import {CardScreens, CardStackParamList} from '../CardStack';
import * as Styled from './CardSettingsList.styled';
import {ToggleSpinnerState} from './ToggleSpinner';

interface SettingsListProps {
  card: Card;
  orderPhysical?: boolean;
  navigation: NativeStackNavigationProp<CardStackParamList, 'Settings'>;
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
  const {card, orderPhysical, navigation} = props;
  const network = useAppSelector(({APP}) => APP.network);
  const user = useAppSelector(({BITPAY_ID}) => BITPAY_ID.user[network]);
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

  const onLockToggled = (locked: boolean) => {
    // set local lock state for immediate feedback, reset if request fails
    setLocalLockState(locked);
    setLocalLockStatus('loading');
    dispatch(CardEffects.START_UPDATE_CARD_LOCK(card.id, locked));
  };

  const onAddAppleWallet = () => {
    const params = {
      id: card.id,
      data: {
        cardholderName: user?.name || '',
        primaryAccountNumberSuffix: card.lastFourDigits,
        encryptionScheme: 'ECC_V2',
      },
    };

    dispatch(CardEffects.startAddToAppleWallet(params));
  };

  const onAddGooglePay = () => {
    dispatch(
      CardEffects.startAddToGooglePay({
        id: card.id,
        data: {
          name: user?.name || '',
          lastFourDigits: card.lastFourDigits,
        },
      }),
    );
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
          {/*<Styled.CategoryRow>*/}
          {/*  <Styled.CategoryHeading>{t('Security')}</Styled.CategoryHeading>*/}
          {/*</Styled.CategoryRow>*/}

          {/*<Hr />*/}

          {/*<Styled.SettingsToggle*/}
          {/*  Icon={LockIcon}*/}
          {/*  value={localLockState}*/}
          {/*  onChange={onLockToggled}*/}
          {/*  state={localLockStatus}>*/}
          {/*  {t('Lock Card')}*/}
          {/*</Styled.SettingsToggle>*/}

          {/*<Hr />*/}

          <Styled.CategoryRow>
            <Styled.CategoryHeading>{t('Account')}</Styled.CategoryHeading>
          </Styled.CategoryRow>

          <Hr />

          {/*<Styled.SettingsLink*/}
          {/*  Icon={OffersIcon}*/}
          {/*  onPress={() => {*/}
          {/*    dispatch(*/}
          {/*      Analytics.track('Clicked Card Offer', {*/}
          {/*        context: 'Card Settings',*/}
          {/*      }),*/}
          {/*    );*/}
          {/*    dispatch(CardEffects.startOpenDosh());*/}
          {/*  }}>*/}
          {/*  {t('Card Offers')}*/}
          {/*</Styled.SettingsLink>*/}

          {/*<Hr />*/}

          {/*{orderPhysical ? (*/}
          {/*  <>*/}
          {/*    <Styled.SettingsLink*/}
          {/*      Icon={OrderPhysicalCardIcon}*/}
          {/*      onPress={async () => {*/}
          {/*        const baseUrl = BASE_BITPAY_URLS[network];*/}
          {/*        const url = `${baseUrl}/wallet-card/?order-physical=true`;*/}
          {/*        const canOpen = await Linking.canOpenURL(url);*/}

          {/*        if (!canOpen) {*/}
          {/*          dispatch(*/}
          {/*            AppActions.showBottomNotificationModal({*/}
          {/*              type: 'error',*/}
          {/*              title: t('Error'),*/}
          {/*              message: t('Unknown error'),*/}
          {/*              enableBackdropDismiss: true,*/}
          {/*              onBackdropDismiss: () => {},*/}
          {/*              actions: [*/}
          {/*                {*/}
          {/*                  text: t('OK'),*/}
          {/*                  action: () => {},*/}
          {/*                },*/}
          {/*              ],*/}
          {/*            }),*/}
          {/*          );*/}

          {/*          return;*/}
          {/*        }*/}

          {/*        Linking.openURL(url);*/}
          {/*      }}>*/}
          {/*      {t('OrderPhysicalCard')}*/}
          {/*    </Styled.SettingsLink>*/}

          {/*    <Hr />*/}
          {/*  </>*/}
          {/*) : null}*/}

          {/*{card.cardType === 'virtual' ? (*/}
          {/*  <>*/}
          {/*    {Platform.OS === 'ios' ? (*/}
          {/*      <>*/}
          {/*        <Styled.SettingsLink*/}
          {/*          Icon={ApplePayIcon}*/}
          {/*          onPress={onAddAppleWallet}>*/}
          {/*          {t('Add to Apple Wallet')}*/}
          {/*        </Styled.SettingsLink>*/}

          {/*        <Hr />*/}
          {/*      </>*/}
          {/*    ) : (*/}
          {/*      <>*/}
          {/*        <Styled.SettingsLink*/}
          {/*          Icon={GooglePayIcon}*/}
          {/*          onPress={onAddGooglePay}>*/}
          {/*          {t('Add to Google Pay')}*/}
          {/*        </Styled.SettingsLink>*/}
          {/*        <Hr />*/}
          {/*      </>*/}
          {/*    )}*/}
          {/*    <Styled.SettingsLink*/}
          {/*      Icon={CustomizeCardIcon}*/}
          {/*      onPress={() =>*/}
          {/*        navigation.navigate('CustomizeVirtualCard', {card})*/}
          {/*      }>*/}
          {/*      {t('Customize Virtual Card')}*/}
          {/*    </Styled.SettingsLink>*/}

          {/*    <Hr />*/}
          {/*  </>*/}
          {/*) : (*/}
          {/*  <>*/}
          {/*    <Styled.SettingsLink*/}
          {/*      Icon={ResetPinIcon}*/}
          {/*      onPress={() => {*/}
          {/*        navigation.navigate(CardScreens.RESET_PIN, {*/}
          {/*          id: card.id,*/}
          {/*        });*/}
          {/*      }}>*/}
          {/*      {t('Reset PIN')}*/}
          {/*    </Styled.SettingsLink>*/}

          {/*    <Hr />*/}
          {/*  </>*/}
          {/*)}*/}

          {/*<Styled.SettingsLink*/}
          {/*  Icon={EditCardNameIcon}*/}
          {/*  onPress={() => navigation.navigate('UpdateCardName', {card})}>*/}
          {/*  {t('Update Card Name')}*/}
          {/*</Styled.SettingsLink>*/}

          {/*<Hr />*/}

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

          <Smallest>{t('TermsAndConditionsMastercard')}</Smallest>

          <Br />

          <Smallest>{t('TermsAndConditionsMastercard2')}</Smallest>
        </>
      ) : null}
    </View>
  );
};

export default SettingsList;
