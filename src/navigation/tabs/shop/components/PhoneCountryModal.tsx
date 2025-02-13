import React, {useState} from 'react';
import {Modal, FlatList} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';
import styled, {useTheme} from 'styled-components/native';
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

const ModalHeader = styled.View`
  flex-direction: row;
  padding: 20px;
  height: 55px;
  align-items: center;
  padding-bottom: 0;
  padding-top: 10px;
  background-color: ${({theme}) => theme.colors.background};
`;

const ModalTitle = styled(BaseText)`
  font-size: 18px;
  font-style: normal;
  font-weight: 700;
  line-height: 25px;
  letter-spacing: 0px;
  text-align: center;
  text-align: center;
  flex-grow: 1;
`;

const CountryItem = styled.View`
  flex-direction: row;
  padding: 15px 5px;
  border-bottom-width: 1px;
  border-bottom-color: ${({theme}) => (theme.dark ? LightBlack : Cloud)};
`;

const CountryName = styled(BaseText)`
  flex-grow: 1;
  font-weight: 500;
  padding-left: 15px;
`;

const CountryCode = styled(BaseText)`
  font-weight: 500;
  color: ${Action};
`;

const SearchContainer = styled(SectionContainer)`
  background-color: ${({theme}) => theme.colors.background};
  padding-bottom: 5px;
  padding-top: 30px;
  z-index: 1;
`;

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
