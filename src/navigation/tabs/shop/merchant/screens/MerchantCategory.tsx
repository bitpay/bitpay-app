import React, {useLayoutEffect} from 'react';
import {SafeAreaView, ScrollView, StyleSheet, View} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {MerchantScreens, MerchantGroupParamList} from '../MerchantGroup';
import MerchantItem from './../../components/MerchantItem';
import {horizontalPadding} from './../../components/styled/ShopTabComponents';
import {ActiveOpacity} from '../../../../../components/styled/Containers';
import HeaderBackButton from '../../../../../components/back/HeaderBackButton';

const styles = StyleSheet.create({
  merchantCategoryScreenContainer: {
    flex: 1,
  },
  searchResults: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: horizontalPadding,
  },
});

const MerchantCategoryScreenContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof SafeAreaView>) => (
  <SafeAreaView
    style={[styles.merchantCategoryScreenContainer, style]}
    {...rest}
  />
);

const SearchResults = ({style, ...rest}: React.ComponentProps<typeof View>) => (
  <View style={[styles.searchResults, style]} {...rest} />
);

const MerchantCategory = ({
  route,
  navigation,
}: NativeStackScreenProps<MerchantGroupParamList, 'MerchantCategory'>) => {
  const {integrations, category} = route.params;
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
