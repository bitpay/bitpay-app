import React, {useEffect} from 'react';
import styled from 'styled-components/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {BillGroupParamList} from '../BillGroup';
import {ScrollView} from 'react-native';
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

const AccountBox = styled.View`
  background-color: ${({theme}) => (theme.dark ? LightBlack : Slate10)};
  flex-direction: row;
  align-items: center;
  padding: 12px 16px;
  margin-top: 20px;
  border-radius: 12px;
`;

const AccountName = styled(BaseText)`
  font-size: 16px;
  font-weight: 500;
`;

const AccountPhone = styled(AccountName)`
  font-weight: 400;
  margin-top: 2px;
`;

const AccountBoxBody = styled.View`
  flex-grow: 1;
`;

const UnlinkButton = styled(BaseText)`
  font-size: 16px;
  color: ${LinkBlue};
`;

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
