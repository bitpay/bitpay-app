import React, {useEffect} from 'react';
import {useTheme} from '../../../../../contexts';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {BillGroupParamList} from '../BillGroup';
import {ScrollView, StyleSheet, View} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {LightBlack, LinkBlue, Slate10} from '../../../../../styles/colors';
import {BaseText} from '../../../../../components/styled/Text';
import {
  ScreenContainer,
  horizontalPadding,
} from '../../components/styled/ShopTabComponents';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {AppActions} from '../../../../../store/app';
import {
  ActiveOpacity,
  HEIGHT,
} from '../../../../../components/styled/Containers';
import {BitPayIdEffects} from '../../../../../store/bitpay-id';
import {ShopEffects} from '../../../../../store/shop';
import {Analytics} from '../../../../../store/analytics/analytics.effects';
import {formatUSPhone} from '../utils';

const styles = StyleSheet.create({
  accountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 20,
    borderRadius: 12,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '500',
  },
  accountPhone: {
    fontWeight: '400',
    marginTop: 2,
  },
  accountBoxBody: {
    flexGrow: 1,
  },
  unlinkButton: {
    fontSize: 16,
    color: LinkBlue,
  },
});

const AccountBox = ({style, ...rest}: React.ComponentProps<typeof View>) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.accountBox,
        {backgroundColor: theme.dark ? LightBlack : Slate10},
        style,
      ]}
      {...rest}
    />
  );
};

const AccountName = ({
  style,
  ...rest
}: React.ComponentProps<typeof BaseText>) => (
  <BaseText style={[styles.accountName, style]} {...rest} />
);

const AccountPhone = ({
  style,
  ...rest
}: React.ComponentProps<typeof AccountName>) => (
  <AccountName style={[styles.accountPhone, style]} {...rest} />
);

const AccountBoxBody = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.accountBoxBody, style]} {...rest} />
);

const UnlinkButton = ({
  style,
  ...rest
}: React.ComponentProps<typeof BaseText>) => (
  <BaseText style={[styles.unlinkButton, style]} {...rest} />
);

const BillSettings = ({
  navigation,
}: NativeStackScreenProps<BillGroupParamList, 'BillSettings'>) => {
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const user = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
  );
  const apiToken = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.apiToken[APP.network],
  );
  useEffect(() => {
    dispatch(Analytics.track('Bill Pay - Viewed Bill Pay Settings'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: horizontalPadding,
          height: HEIGHT - 150,
        }}>
        <AccountBox>
          <AccountBoxBody>
            <AccountName>{user?.name}</AccountName>
            {user?.phone ? (
              <AccountPhone>{formatUSPhone(user.phone)}</AccountPhone>
            ) : null}
          </AccountBoxBody>
          <TouchableOpacity
            activeOpacity={ActiveOpacity}
            onPress={() => {
              dispatch(
                AppActions.showBottomNotificationModal({
                  type: 'warning',
                  title: t('Confirm'),
                  message: t(
                    'Are you sure you would like to unlink your Method account?',
                  ),
                  enableBackdropDismiss: true,
                  onBackdropDismiss: () => {},
                  actions: [
                    {
                      text: t("Yes, I'm sure"),
                      action: async () => {
                        dispatch(
                          Analytics.track('Bill Pay - Unlinked Method Account'),
                        );
                        navigation.pop();
                        await dispatch(BitPayIdEffects.startResetMethodUser());
                        await dispatch(
                          BitPayIdEffects.startFetchBasicInfo(apiToken),
                        ).catch(() => {});
                        await dispatch(ShopEffects.startGetBillPayAccounts());
                      },
                      primary: true,
                    },
                    {
                      text: t('No, cancel'),
                      action: () => {
                        dispatch(
                          Analytics.track(
                            'Bill Pay - Canceled Confirm Unlink Method Account Modal',
                          ),
                        );
                      },
                      primary: false,
                    },
                  ],
                }),
              );
              dispatch(
                Analytics.track(
                  'Bill Pay - Viewed Confirm Unlink Method Account Modal',
                ),
              );
            }}>
            <UnlinkButton>{t('Unlink Account')}</UnlinkButton>
          </TouchableOpacity>
        </AccountBox>
      </ScrollView>
    </ScreenContainer>
  );
};

export default BillSettings;
