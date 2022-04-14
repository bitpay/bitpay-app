import React, {useCallback, useState} from 'react';
import styled from 'styled-components/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useForm} from 'react-hook-form';
import {RootState} from '../../../../../store';
import debounce from 'lodash.debounce';
import AltCurrenciesRow, {
  AltCurrenciesRowProps,
} from '../../../../../components/list/AltCurrenciesRow';
import {
  HEIGHT,
  Hr as _Hr,
  SearchContainer,
  SearchInput,
  ScreenGutter,
} from '../../../../../components/styled/Containers';
import {FlatList} from 'react-native';
import {BaseText} from '../../../../../components/styled/Text';
import {setDefaultAltCurrency} from '../../../../../store/app/app.actions';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';

import {useNavigation} from '@react-navigation/native';
import {LightBlack, White} from '../../../../../styles/colors';
import GhostSvg from '../../../../../../assets/img/ghost-cheeky.svg';
import {sleep} from '../../../../../utils/helper-methods';

const AltCurrencySettingsContainer = styled.SafeAreaView`
  margin-top: 20px;
  flex: 1;
`;

const Header = styled.View`
  padding: 0 ${ScreenGutter};
`;

const SearchResults = styled.View`
  margin: 0 0 50px 0;
`;

const NoResultsContainer = styled.View`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: ${HEIGHT - 300}px;
  padding: 20px 40px;
`;

const NoResultsImgContainer = styled.View`
  padding-bottom: 40px;
`;

const NoResultsDescription = styled(BaseText)`
  font-size: 16px;
`;

const Label = styled(BaseText)`
  color: ${({theme}) => (theme.dark ? White : LightBlack)};
  font-weight: 500;
  font-size: 13px;
  line-height: 18px;
  text-transform: uppercase;
  opacity: 0.75;
  margin-bottom: 6px;
`;

const Hr = styled(_Hr)`
  margin: 0px 15px;
`;
interface HideableViewProps {
  show: boolean;
}

const HideableView = styled.View<HideableViewProps>`
  display: ${({show}) => (show ? 'flex' : 'none')};
`;

const AltCurrencySettings = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const alternativeCurrencies = useAppSelector(
    ({APP}: RootState) => APP.altCurrencyList,
  );
  const selectedAltCurrency = useAppSelector(
    ({APP}: RootState) => APP.defaultAltCurrency,
  );

  const altCurrencyList = alternativeCurrencies.filter(
    altCurrency => selectedAltCurrency.isoCode !== altCurrency.isoCode,
  ) as Array<AltCurrenciesRowProps>;
  altCurrencyList.unshift(selectedAltCurrency);

  const [searchVal, setSearchVal] = useState('');
  const [searchResults, setSearchResults] = useState(
    [] as AltCurrenciesRowProps[],
  );

  const updateSearchResults = debounce((text: string) => {
    setSearchVal(text);
    const results = altCurrencyList.filter(
      altCurrency =>
        altCurrency.name.toLowerCase().includes(text.toLocaleLowerCase()) ||
        altCurrency.isoCode.toLowerCase().includes(text.toLocaleLowerCase()),
    );
    setSearchResults(results);
  }, 300);

  const keyExtractor = (item: AltCurrenciesRowProps) => {
    return item.isoCode;
  };

  const renderItem = useCallback(
    ({item}) => {
      const selected = selectedAltCurrency.isoCode === item.isoCode;
      return (
        <>
          <AltCurrenciesRow
            altCurrency={item}
            selected={selected}
            onPress={async () => {
              dispatch(setDefaultAltCurrency(item));
              await sleep(500);
              navigation.goBack();
            }}
          />
          {!selected ? <Hr /> : null}
        </>
      );
    },
    [selectedAltCurrency],
  );

  return (
    <AltCurrencySettingsContainer>
      <Header>
        <Label>Search Currency</Label>
        <SearchContainer>
          <SearchInput
            placeholder={''}
            onChangeText={(text: string) => {
              updateSearchResults(text);
            }}
          />
        </SearchContainer>
      </Header>
      <HideableView show={!!searchVal}>
        {searchResults.length ? (
          <SearchResults>
            <FlatList
              data={searchResults}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
            />
          </SearchResults>
        ) : (
          <NoResultsContainer>
            <NoResultsImgContainer>
              <GhostSvg style={{marginTop: 20}} />
            </NoResultsImgContainer>
            <NoResultsDescription>
              {"We couldn't find a match for "}
              <BaseText style={{fontWeight: 'bold'}}>{searchVal}</BaseText>.
            </NoResultsDescription>
            <NoResultsDescription>
              Please try anoter currency
            </NoResultsDescription>
          </NoResultsContainer>
        )}
      </HideableView>
      <HideableView show={!searchVal}>
        <SearchResults>
          <FlatList
            contentContainerStyle={{paddingBottom: 150, marginTop: 5}}
            data={altCurrencyList}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
          />
        </SearchResults>
      </HideableView>
    </AltCurrencySettingsContainer>
  );
};

export default AltCurrencySettings;
