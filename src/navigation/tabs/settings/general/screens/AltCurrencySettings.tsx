import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useTheme} from '../../../../../contexts';
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
import {
  FlatList,
  ActivityIndicator,
  Keyboard,
  SafeAreaView,
  SectionList,
  StyleSheet,
  View,
} from 'react-native';
import {BaseText} from '../../../../../components/styled/Text';
import {setDefaultAltCurrency} from '../../../../../store/app/app.actions';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';

import {useNavigation} from '@react-navigation/native';
import {Black, LightBlack, White} from '../../../../../styles/colors';
import GhostSvg from '../../../../../../assets/img/ghost-cheeky.svg';
import SearchSvg from '../../../../../../assets/img/search.svg';
import {FormatKeyBalances} from '../../../../../store/wallet/effects/status/status';
import {updatePortfolioBalance} from '../../../../../store/wallet/wallet.actions';
import {cancelPopulatePortfolio} from '../../../../../store/portfolio';
import {useTranslation} from 'react-i18next';
import {coinbaseInitialize} from '../../../../../store/coinbase';
import {Analytics} from '../../../../../store/analytics/analytics.effects';
import {sleep} from '../../../../../utils/helper-methods';
import {useOngoingProcess} from '../../../../../contexts';

const LIST_READY_FALLBACK_MS = 2000;

const styles = StyleSheet.create({
  altCurrencySettingsContainer: {
    marginTop: 20,
    flex: 1,
  },
  header: {
    paddingVertical: 20,
    paddingHorizontal: parseInt(ScreenGutter, 10),
  },
  searchResults: {
    marginBottom: 50,
  },
  label: {
    fontWeight: '500',
    fontSize: 13,
    lineHeight: 18,
    textTransform: 'uppercase',
    opacity: 0.75,
    marginBottom: 6,
  },
  hr: {
    marginHorizontal: 15,
  },
  searchIconContainer: {
    padding: 10,
  },
  listHeader: {
    fontSize: 18,
    textAlign: 'left',
    marginBottom: 16,
    marginTop: 0,
    flexGrow: 1,
    fontWeight: '500',
    paddingHorizontal: 15,
  },
});

const AltCurrencySettingsContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof SafeAreaView>) => (
  <SafeAreaView
    style={[styles.altCurrencySettingsContainer, style]}
    {...rest}
  />
);

const Header = ({style, ...rest}: React.ComponentProps<typeof View>) => (
  <View style={[styles.header, style]} {...rest} />
);

const SearchResults = ({style, ...rest}: React.ComponentProps<typeof View>) => (
  <View style={[styles.searchResults, style]} {...rest} />
);

const Label = ({style, ...rest}: React.ComponentProps<typeof BaseText>) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[styles.label, {color: theme.dark ? White : LightBlack}, style]}
      {...rest}
    />
  );
};

const Hr = ({style, ...rest}: React.ComponentProps<typeof _Hr>) => (
  <_Hr style={[styles.hr, style]} {...rest} />
);

const SearchIconContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.searchIconContainer, style]} {...rest} />
);

const ListHeader = ({
  style,
  ...rest
}: React.ComponentProps<typeof BaseText>) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[styles.listHeader, {color: theme.dark ? White : Black}, style]}
      {...rest}
    />
  );
};

const AltCurrencySettings = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const {showOngoingProcess, hideOngoingProcess} = useOngoingProcess();
  const alternativeCurrencies = useAppSelector(
    ({APP}: RootState) => APP.altCurrencyList,
  );
  const selectedAltCurrency = useAppSelector(
    ({APP}: RootState) => APP.defaultAltCurrency,
  );
  const portfolioPopulateInProgress = useAppSelector(
    ({PORTFOLIO}: RootState) => !!PORTFOLIO.populateStatus?.inProgress,
  );
  const recentDefaultAltCurrency = useAppSelector(
    ({APP}) => APP.recentDefaultAltCurrency,
  );

  const altCurrencyList = useMemo(() => {
    let currenciesList: AltCurrenciesRowProps[] = [];
    if (recentDefaultAltCurrency.length) {
      currenciesList = alternativeCurrencies.filter(
        (currency: AltCurrenciesRowProps) =>
          !recentDefaultAltCurrency.find(
            ({isoCode}: AltCurrenciesRowProps) => currency.isoCode === isoCode,
          ),
      );
    } else {
      currenciesList = alternativeCurrencies.filter(
        (altCurrency: AltCurrenciesRowProps) =>
          selectedAltCurrency.isoCode !== altCurrency.isoCode,
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
  }, [alternativeCurrencies, recentDefaultAltCurrency, selectedAltCurrency]);

  const [searchVal, setSearchVal] = useState('');
  const [listReady, setListReady] = useState(false);
  const [searchResults, setSearchResults] = useState(
    [] as AltCurrenciesRowProps[],
  );

  const updateSearchResults = useMemo(
    () =>
      debounce((text: string) => {
        setSearchVal(text);
        const q = text.trim().toLowerCase();
        if (!q) {
          setSearchResults([]);
          return;
        }

        const results = alternativeCurrencies.filter(
          ({name, isoCode}: AltCurrenciesRowProps) =>
            (name || '').toLowerCase().includes(q) ||
            (isoCode || '').toLowerCase().includes(q),
        );
        setSearchResults(results);
      }, 300),
    [alternativeCurrencies],
  );

  useEffect(() => {
    return () => {
      updateSearchResults.cancel();
    };
  }, [updateSearchResults]);

  useEffect(() => {
    let completed = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
    const complete = () => {
      if (completed) {
        return;
      }

      completed = true;
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
      }
      setListReady(true);
    };
    const unsubscribe = (navigation as any).addListener(
      'transitionEnd',
      (event: {data?: {closing?: boolean}}) => {
        if (!event.data?.closing) {
          complete();
        }
      },
    );
    fallbackTimer = setTimeout(complete, LIST_READY_FALLBACK_MS);

    return () => {
      completed = true;
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
      }
      unsubscribe();
    };
  }, [navigation]);

  const keyExtractor = (item: AltCurrenciesRowProps) => {
    return item.isoCode;
  };

  const renderItem = useCallback(
    ({item}: {item: AltCurrenciesRowProps}) => {
      const selected = selectedAltCurrency.isoCode === item.isoCode;
      return (
        <>
          <AltCurrenciesRow
            altCurrency={item}
            selected={selected}
            onPress={async () => {
              Keyboard.dismiss();
              showOngoingProcess('LOADING');
              await sleep(500);

              const nextQuoteCurrency = (item.isoCode || '').toUpperCase();
              const currentDisplayQuoteCurrency = (
                selectedAltCurrency?.isoCode || ''
              ).toUpperCase();
              const isDisplayCurrencyChange =
                !!nextQuoteCurrency &&
                currentDisplayQuoteCurrency !== nextQuoteCurrency;
              if (isDisplayCurrencyChange && portfolioPopulateInProgress) {
                dispatch(cancelPopulatePortfolio());
              }

              dispatch(
                Analytics.track('Saved Display Currency', {
                  currency: item.isoCode,
                }),
              );
              dispatch(setDefaultAltCurrency(item));
              dispatch(FormatKeyBalances());
              dispatch(updatePortfolioBalance());
              await dispatch(coinbaseInitialize());
              await sleep(500);
              hideOngoingProcess();
              await sleep(500);
              navigation.goBack();
            }}
          />
          {!selected ? <Hr /> : null}
        </>
      );
    },
    [
      dispatch,
      hideOngoingProcess,
      navigation,
      portfolioPopulateInProgress,
      selectedAltCurrency,
      showOngoingProcess,
    ],
  );

  return (
    <AltCurrencySettingsContainer>
      <Header>
        <Label>{t('Search Currency')}</Label>
        <SearchContainer>
          <SearchInput
            placeholder={''}
            testID="alt-currency-search-input"
            accessibilityLabel="Search currency"
            onChangeText={(text: string) => {
              updateSearchResults(text);
            }}
          />
          <SearchIconContainer>
            <SearchSvg height={25} width={25} />
          </SearchIconContainer>
        </SearchContainer>
      </Header>
      {searchVal ? (
        searchResults.length ? (
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
        )
      ) : (
        <SearchResults>
          {listReady ? (
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
          ) : (
            <ActivityIndicator size="small" />
          )}
        </SearchResults>
      )}
    </AltCurrencySettingsContainer>
  );
};

export default AltCurrencySettings;
