import React, {useCallback, useMemo, useState} from 'react';
import styled from 'styled-components/native';
import {RootState} from '../../../../../store';
import debounce from 'lodash.debounce';
import AltCurrenciesRow, {
  AltCurrenciesRowProps,
} from '../../../../../components/list/AltCurrenciesRow';
import {
  Hr as _Hr,
  SearchContainer,
  SearchInput,
  ScreenGutter,
  NoResultsContainer,
  NoResultsImgContainer,
  NoResultsDescription,
} from '../../../../../components/styled/Containers';
import {FlatList, Keyboard, SectionList, View} from 'react-native';
import {BaseText} from '../../../../../components/styled/Text';
import {
  dismissOnGoingProcessModal,
  setDefaultAltCurrency,
} from '../../../../../store/app/app.actions';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';

import {useNavigation} from '@react-navigation/native';
import {Black, LightBlack, White} from '../../../../../styles/colors';
import GhostSvg from '../../../../../../assets/img/ghost-cheeky.svg';
import SearchSvg from '../../../../../../assets/img/search.svg';
import {FormatKeyBalances} from '../../../../../store/wallet/effects/status/status';
import {updatePortfolioBalance} from '../../../../../store/wallet/wallet.actions';
import {getPriceHistory} from '../../../../../store/wallet/effects';
import {useTranslation} from 'react-i18next';
import {coinbaseInitialize} from '../../../../../store/coinbase';
import {Analytics} from '../../../../../store/analytics/analytics.effects';
import {startOnGoingProcessModal} from '../../../../../store/app/app.effects';
import {sleep} from '../../../../../utils/helper-methods';

const AltCurrencySettingsContainer = styled.SafeAreaView`
  margin-top: 20px;
  flex: 1;
`;

const Header = styled.View`
  padding: 20px ${ScreenGutter};
`;

const SearchResults = styled.View`
  margin: 0 0 50px 0;
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
  margin: 0 15px;
`;

const SearchIconContainer = styled.View`
  padding: 10px;
`;

interface HideableViewProps {
  show: boolean;
}

const HideableView = styled.View<HideableViewProps>`
  display: ${({show}) => (show ? 'flex' : 'none')};
`;

const ListHeader = styled(BaseText)`
  color: ${({theme}) => (theme.dark ? White : Black)};
  font-size: 18px;
  text-align: left;
  margin-bottom: 16px;
  margin-top: 0px;
  flex-grow: 1;
  font-weight: 500;
  padding: 0 15px;
`;

const AltCurrencySettings = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const alternativeCurrencies = useAppSelector(
    ({APP}: RootState) => APP.altCurrencyList,
  );
  const selectedAltCurrency = useAppSelector(
    ({APP}: RootState) => APP.defaultAltCurrency,
  );
  const recentDefaultAltCurrency = useAppSelector(
    ({APP}) => APP.recentDefaultAltCurrency,
  );

  const altCurrencyList = useMemo(() => {
    let currenciesList = [];
    if (recentDefaultAltCurrency.length) {
      currenciesList = alternativeCurrencies.filter(
        currency =>
          !recentDefaultAltCurrency.find(
            ({isoCode}) => currency.isoCode === isoCode,
          ),
      );
    } else {
      currenciesList = alternativeCurrencies.filter(
        altCurrency => selectedAltCurrency.isoCode !== altCurrency.isoCode,
      ) as Array<AltCurrenciesRowProps>;
      currenciesList.unshift(selectedAltCurrency);
    }

    const list = [
      {
        title: 'Currencies',
        data: currenciesList,
      },
    ];

    if (recentDefaultAltCurrency.length) {
      list.unshift({
        title: 'Recently Selected',
        data: recentDefaultAltCurrency,
      });
    }
    return list;
  }, [recentDefaultAltCurrency, alternativeCurrencies]);

  const [searchVal, setSearchVal] = useState('');
  const [searchResults, setSearchResults] = useState(
    [] as AltCurrenciesRowProps[],
  );

  const updateSearchResults = debounce((text: string) => {
    setSearchVal(text);
    const results = alternativeCurrencies.filter(
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
              Keyboard.dismiss();
              dispatch(startOnGoingProcessModal('LOADING'));
              await sleep(500);
              dispatch(
                Analytics.track('Saved Display Currency', {
                  currency: item.isoCode,
                }),
              );
              dispatch(setDefaultAltCurrency(item));
              dispatch(FormatKeyBalances());
              dispatch(updatePortfolioBalance());
              await dispatch(coinbaseInitialize());
              dispatch(getPriceHistory(item.isoCode));
              await sleep(500);
              dispatch(dismissOnGoingProcessModal());
              await sleep(500);
              navigation.goBack();
            }}
          />
          {!selected ? <Hr /> : null}
        </>
      );
    },
    [navigation, dispatch, selectedAltCurrency],
  );

  return (
    <AltCurrencySettingsContainer>
      <Header>
        <Label>{t('Search Currency')}</Label>
        <SearchContainer>
          <SearchInput
            placeholder={''}
            onChangeText={(text: string) => {
              updateSearchResults(text);
            }}
          />
          <SearchIconContainer>
            <SearchSvg height={25} width={25} />
          </SearchIconContainer>
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
              {t("We couldn't find a match for ")}
              <BaseText style={{fontWeight: 'bold'}}>{searchVal}</BaseText>.
            </NoResultsDescription>
          </NoResultsContainer>
        )}
      </HideableView>

      <HideableView show={!searchVal}>
        <SearchResults>
          <SectionList
            contentContainerStyle={{paddingBottom: 150, marginTop: 5}}
            sections={altCurrencyList}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            stickySectionHeadersEnabled={false}
            renderSectionHeader={({section: {title}}) => (
              <ListHeader>{title}</ListHeader>
            )}
            renderSectionFooter={() => <View style={{marginBottom: 30}} />}
          />
        </SearchResults>
      </HideableView>
    </AltCurrencySettingsContainer>
  );
};

export default AltCurrencySettings;
