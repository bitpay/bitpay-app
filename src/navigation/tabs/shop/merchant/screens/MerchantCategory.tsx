import React, {useLayoutEffect} from 'react';
import {ScrollView} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import styled from 'styled-components/native';
import {MerchantScreens, MerchantGroupParamList} from '../MerchantGroup';
import MerchantItem from './../../components/MerchantItem';
import {horizontalPadding} from './../../components/styled/ShopTabComponents';
import {ActiveOpacity} from '../../../../../components/styled/Containers';
import HeaderBackButton from '../../../../../components/back/HeaderBackButton';

const MerchantCategoryScreenContainer = styled.SafeAreaView`
  flex: 1;
`;

const SearchResults = styled.View`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  padding: ${horizontalPadding}px;
`;

const MerchantCategory = ({
  route,
  navigation,
}: NativeStackScreenProps<MerchantGroupParamList, 'MerchantCategory'>) => {
  const {integrations, category} = route.params;
  console.log('integrations', integrations);
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => <HeaderBackButton />,
      headerTitle: category.displayName,
    });
  });

  return (
    <MerchantCategoryScreenContainer>
      <ScrollView>
        <SearchResults>
          {integrations.map(integration => (
            <TouchableOpacity
              activeOpacity={ActiveOpacity}
              key={integration.displayName}
              onPress={() =>
                navigation.navigate(MerchantScreens.MERCHANT_DETAILS, {
                  directIntegration: integration,
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
    </MerchantCategoryScreenContainer>
  );
};

export default MerchantCategory;
