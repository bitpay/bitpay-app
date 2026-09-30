import React, {useState} from 'react';
import {Modal, FlatList, StyleSheet, View} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {useTheme} from '../../../../contexts';
import {BaseText} from '../../../../components/styled/Text';
import {PhoneCountryCode} from '../../../../lib/gift-cards/gift-card';
import {
  horizontalPadding,
  NavIconButtonContainer,
  SearchBox,
  SectionContainer,
} from './styled/ShopTabComponents';
import {CloseSvg} from '../components/svg/ShopTabSvgs';
import {Action, Cloud, LightBlack} from '../../../../styles/colors';
import RemoteImage from './RemoteImage';
import {useTranslation} from 'react-i18next';
import {ActiveOpacity} from '../../../../components/styled/Containers';

const styles = StyleSheet.create({
  modalHeader: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 0,
    height: 55,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontStyle: 'normal',
    fontWeight: '700',
    lineHeight: 25,
    letterSpacing: 0,
    textAlign: 'center',
    flexGrow: 1,
  },
  countryItem: {
    flexDirection: 'row',
    paddingVertical: 15,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
  },
  countryName: {
    flexGrow: 1,
    fontWeight: '500',
    paddingLeft: 15,
  },
  countryCode: {
    fontWeight: '500',
    color: Action,
  },
  searchContainer: {
    paddingBottom: 5,
    paddingTop: 30,
    zIndex: 1,
  },
});

const ModalHeader = ({style, ...rest}: React.ComponentProps<typeof View>) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.modalHeader,
        {backgroundColor: theme.colors.background},
        style,
      ]}
      {...rest}
    />
  );
};

const ModalTitle = ({
  style,
  ...rest
}: React.ComponentProps<typeof BaseText>) => (
  <BaseText style={[styles.modalTitle, style]} {...rest} />
);

const CountryItem = ({style, ...rest}: React.ComponentProps<typeof View>) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.countryItem,
        {borderBottomColor: theme.dark ? LightBlack : Cloud},
        style,
      ]}
      {...rest}
    />
  );
};

const CountryName = ({
  style,
  ...rest
}: React.ComponentProps<typeof BaseText>) => (
  <BaseText style={[styles.countryName, style]} {...rest} />
);

const CountryCode = ({
  style,
  ...rest
}: React.ComponentProps<typeof BaseText>) => (
  <BaseText style={[styles.countryCode, style]} {...rest} />
);

const SearchContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof SectionContainer>) => {
  const theme = useTheme();
  return (
    <SectionContainer
      style={[
        styles.searchContainer,
        {backgroundColor: theme.colors.background},
        style,
      ]}
      {...rest}
    />
  );
};

const PhoneCountryModal = ({
  onClose,
  onSelectedPhoneCountryCode,
  phoneCountryCodes,
  visible,
}: {
  onClose: () => void;
  onSelectedPhoneCountryCode: (phoneCountryCode: PhoneCountryCode) => void;
  phoneCountryCodes: PhoneCountryCode[];
  visible: boolean;
}) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const [searchValue, setSearchValue] = useState('');
  const [searchResults, setSearchResults] = useState(phoneCountryCodes);
  return (
    <Modal
      presentationStyle="pageSheet"
      visible={visible}
      animationType="slide"
      onRequestClose={() => onClose()}
      style={{
        backgroundColor: theme.colors.background,
        paddingHorizontal: horizontalPadding,
      }}>
      <ModalHeader>
        <NavIconButtonContainer onPress={() => onClose()}>
          <CloseSvg theme={theme} />
        </NavIconButtonContainer>
        <ModalTitle>{t('Select Country')}</ModalTitle>
        <NavIconButtonContainer style={{opacity: 0}} />
      </ModalHeader>
      <SearchContainer>
        <SearchBox
          placeholder={t('Search countries')}
          theme={theme}
          onChangeText={(text: string) => {
            setSearchValue(text);
            setSearchResults(
              phoneCountryCodes.filter(phoneCountryCode =>
                phoneCountryCode.name
                  .toLowerCase()
                  .includes(text.toLowerCase()),
              ),
            );
          }}
          value={searchValue}
          type={'search'}
        />
      </SearchContainer>
      <FlatList
        style={{
          backgroundColor: theme.colors.background,
        }}
        contentContainerStyle={{
          padding: horizontalPadding,
          backgroundColor: theme.colors.background,
        }}
        data={searchResults}
        renderItem={({item: countryCode}: {item: PhoneCountryCode}) => (
          <TouchableOpacity
            activeOpacity={ActiveOpacity}
            key={`${countryCode.phone}${countryCode.name}`}
            onPress={() => onSelectedPhoneCountryCode(countryCode)}>
            <CountryItem>
              <RemoteImage
                height={20}
                uri={`https://bitpay.com/img/flags-round/${countryCode.countryCode.toLowerCase()}.svg`}
              />
              <CountryName>{countryCode.name}</CountryName>
              <CountryCode>+{countryCode.phone}</CountryCode>
            </CountryItem>
          </TouchableOpacity>
        )}
        keyExtractor={item => `${item.phone}${item.name}`}
      />
    </Modal>
  );
};

export default PhoneCountryModal;
