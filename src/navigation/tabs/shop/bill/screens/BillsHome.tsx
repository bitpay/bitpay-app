import React, {useState} from 'react';
import {RefreshControl, ScrollView} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useTheme} from 'styled-components/native';
import {useTranslation} from 'react-i18next';
import {BillGroupParamList, BillScreens} from '../BillGroup';
import {Bills} from '../../components/Bills';
import {SlateDark, White} from '../../../../../styles/colors';
import {ShopEffects} from '../../../../../store/shop';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {sleep} from '../../../../../utils/helper-methods';
import {withErrorFallback} from '../../../../../navigation/tabs/TabScreenErrorFallback';
import TabContainer from '../../../../../navigation/tabs/TabContainer';
import {HeaderContainer} from '../../../../tabs/home/components/Styled';
import {HeaderTitle} from '../../../../../components/styled/Text';

const BillsHome = ({}: NativeStackScreenProps<
  BillGroupParamList,
  BillScreens.BILLS_HOME
>) => {
  const theme = useTheme();
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const appNetwork = useAppSelector(({APP}) => APP.network);
  const user = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
  );
  const isBillPayEnabled = useAppSelector(({SHOP}) => SHOP.isBillPayEnabled);
  const accounts = useAppSelector(({SHOP}) => SHOP.billPayAccounts[appNetwork]);
  const [refreshing, setRefreshing] = useState(false);

  const shouldShowPaymentList = !!(
    user &&
    !isBillPayEnabled &&
    accounts.length > 0
  );

  return (
    <TabContainer>
      <HeaderContainer>
        <HeaderTitle>
          {shouldShowPaymentList ? t('All Payments') : t('Pay Bills')}
        </HeaderTitle>
      </HeaderContainer>
      <ScrollView
        refreshControl={
          user ? (
            <RefreshControl
              tintColor={theme.dark ? White : SlateDark}
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await Promise.all([
                  dispatch(ShopEffects.startGetBillPayAccounts()).catch(
                    _ => {},
                  ),
                  sleep(600),
                ]);
                setRefreshing(false);
              }}
            />
          ) : undefined
        }>
        <Bills />
      </ScrollView>
    </TabContainer>
  );
};

export default withErrorFallback(BillsHome);
