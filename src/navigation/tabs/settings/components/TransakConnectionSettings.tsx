import React, {useEffect, useRef, useState} from 'react';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {SettingsComponent} from '../SettingsRoot';
import {
  useAppDispatch,
  useAppSelector,
  useLogger,
} from '../../../../utils/hooks';
import haptic from '../../../../components/haptic-feedback/haptic';
import {BuyCryptoActions} from '../../../../store/buy-crypto';
import {
  TransakHeadlessUserAuthData,
  TransakHeadlessUserDetailsData,
} from '../../../../store/buy-crypto/buy-crypto.models';
import {
  isTransakHeadlessUnauthorized,
  transakHeadlessGetUserDetails,
  transakHeadlessLogout,
} from '../../../../store/buy-crypto/effects/transak/transak-headless';
import {
  getTransakHeadlessConnectionWallet,
  isTransakHeadlessUserAuthValid,
  transakEnv,
} from '../../../services/buy-crypto/utils/transak-utils';
import {ExternalServicesScreens} from '../../../services/ExternalServicesGroup';
import {getErrorString} from '../../../../utils/helper-methods';
import {
  AccountCard,
  AccountEmail,
  AccountInfo,
  AccountName,
  ConnectButton,
  ConnectButtonText,
  Container,
  NotConnectedText,
  UnlinkButton,
  UnlinkText,
} from './ConnectionSettingsComponents';

const TransakConnectionSettings = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const logger = useLogger();

  const network = useAppSelector(({APP}) => APP.network);
  const user = useAppSelector(({BITPAY_ID}) => BITPAY_ID.user[network]);
  const country = useAppSelector(
    ({LOCATION}) => LOCATION.locationData?.countryShortCode,
  );
  const userAuth: TransakHeadlessUserAuthData | undefined = useAppSelector(
    ({BUY_CRYPTO}) => BUY_CRYPTO.tokens?.transakHeadlessUser?.[transakEnv],
  );
  const wallet = useAppSelector(({WALLET}) =>
    getTransakHeadlessConnectionWallet(WALLET.keys),
  );

  const [userDetails, setUserDetails] =
    useState<TransakHeadlessUserDetailsData>();
  const [unlinking, setUnlinking] = useState(false);
  const checkedAccessTokenRef = useRef<string | undefined>(undefined);

  const isConnected = isTransakHeadlessUserAuthValid(userAuth);
  const accessToken = isConnected ? userAuth.accessToken : undefined;
  const displayName = [userDetails?.firstName, userDetails?.lastName]
    .filter(Boolean)
    .join(' ');
  const email = userDetails?.email || userAuth?.email;

  useEffect(() => {
    if (
      !accessToken ||
      !wallet ||
      checkedAccessTokenRef.current === accessToken
    ) {
      return;
    }
    checkedAccessTokenRef.current = accessToken;
    transakHeadlessGetUserDetails(wallet, {
      env: transakEnv,
      userAccessToken: accessToken,
    })
      .then(setUserDetails)
      .catch(err => {
        if (isTransakHeadlessUnauthorized(err)) {
          logger.debug(
            '[TransakConnectionSettings] stored session rejected by Transak, removing it.',
          );
          dispatch(
            BuyCryptoActions.updateHeadlessUserAuthTransak({
              env: transakEnv,
              userAuth: undefined,
            }),
          );
          return;
        }
        logger.error(
          `[TransakConnectionSettings] get user details failed: ${getErrorString(
            err,
          )}`,
        );
      });
  }, [accessToken, wallet, dispatch, logger]);

  const handleUnlink = async () => {
    if (!userAuth) {
      return;
    }
    haptic('impactLight');
    setUnlinking(true);
    if (wallet) {
      try {
        await transakHeadlessLogout(wallet, {
          env: transakEnv,
          userAccessToken: userAuth.accessToken,
        });
      } catch (err) {
        logger.error(
          `[TransakConnectionSettings] logout failed: ${getErrorString(err)}`,
        );
      }
    }
    dispatch(
      BuyCryptoActions.updateHeadlessUserAuthTransak({
        env: transakEnv,
        userAuth: undefined,
      }),
    );
    setUserDetails(undefined);
    setUnlinking(false);
    navigation.goBack();
  };

  const handleConnect = () => {
    if (!wallet) {
      return;
    }
    haptic('impactLight');
    navigation.navigate(
      ExternalServicesScreens.TRANSAK_BUY_HEADLESS_ONBOARDING,
      {
        wallet,
        context: 'connections',
        country,
        initialEmail: user?.email,
        onConnect: (newUserAuth: TransakHeadlessUserAuthData) => {
          setUserDetails(undefined);
          dispatch(
            BuyCryptoActions.updateHeadlessUserAuthTransak({
              env: transakEnv,
              userAuth: newUserAuth,
            }),
          );
          navigation.navigate('TransakConnectionSettings');
        },
      },
    );
  };

  return (
    <SettingsComponent>
      <Container>
        {isConnected ? (
          <AccountCard>
            <AccountInfo>
              {!!displayName && <AccountName>{displayName}</AccountName>}
              {!!email && <AccountEmail>{email}</AccountEmail>}
            </AccountInfo>
            <UnlinkButton onPress={handleUnlink} disabled={unlinking}>
              <UnlinkText>{t('Unlink Account')}</UnlinkText>
            </UnlinkButton>
          </AccountCard>
        ) : (
          <>
            <NotConnectedText>
              {t(
                'Connect your Transak account to buy crypto without leaving the app.',
              )}
            </NotConnectedText>
            <ConnectButton onPress={handleConnect} disabled={!wallet}>
              <ConnectButtonText>
                {t('Connect Transak Account')}
              </ConnectButtonText>
            </ConnectButton>
          </>
        )}
      </Container>
    </SettingsComponent>
  );
};

export default TransakConnectionSettings;
