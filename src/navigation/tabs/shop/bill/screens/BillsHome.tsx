import React, {useState} from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {BillGroupParamList} from '../BillGroup';
import {RefreshControl, ScrollView} from 'react-native';
import {ScreenContainer} from '../../components/styled/ShopTabComponents';
import {Bills} from '../../components/Bills';
import {useTheme} from 'styled-components/native';
import {SlateDark, White} from '../../../../../styles/colors';
import {ShopEffects} from '../../../../../store/shop';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {sleep} from '../../../../../utils/helper-methods';

const BillsHome = ({}: NativeStackScreenProps<
  BillGroupParamList,
  'BillsHome'
>) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const user = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
  );
  const [refreshing, setRefreshing] = useState(false);
  return (
    <ScreenContainer>
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
    </ScreenContainer>
  );
};

export default BillsHome;
