import React, {useLayoutEffect} from 'react';
import {ScrollView, TouchableOpacity} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import styled from 'styled-components/native';
import {
  MerchantScreens,
  MerchantStackParamList,
} from '../../merchant/MerchantStack';
import MerchantItem from './../../components/MerchantItem';
import {horizontalPadding} from './../../components/styled/ShopTabComponents';
import {ActiveOpacity} from '../../../../../components/styled/Containers';

const SearchResults = styled.View`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  padding: ${horizontalPadding}px;
`;

const MerchantCategory = ({
  route,
  navigation,
}: NativeStackScreenProps<MerchantStackParamList, 'MerchantCategory'>) => {
  const navigator = useNavigation();
  const {integrations, category} = route.params;
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: category.displayName,
    });
  });

  return (
    <ScrollView>
      <SearchResults>
        {integrations.map(integration => (
          <TouchableOpacity
            activeOpacity={ActiveOpacity}
            key={integration.displayName}
            onPress={() =>
              navigator.navigate('Merchant', {
                screen: MerchantScreens.MERCHANT_DETAILS,
                params: {
                  directIntegration: integration,
                },
              })
            }>
            <MerchantItem
              merchant={integration}
              height={200}
              key={integration.displayName}
            />
          </TouchableOpacity>
        ))}
      </SearchResults>
    </ScrollView>
  );
};

export default MerchantCategory;
