import React from 'react';
import {H6, Link} from '../../../../components/styled/Text';
import {RootState} from '../../../../store';
import {useAppSelector} from '../../../../utils/hooks';
import {Settings} from '../SettingsRoot';
import {useNavigation} from '@react-navigation/native';
import SettingsContactRow from '../../../../components/list/SettingsContactRow';
import {
  ActiveOpacity,
  Hr,
  Setting,
} from '../../../../components/styled/Containers';
import {View} from 'react-native';
import styled from 'styled-components/native';
import PlusSvg from '../../../../../assets/img/plus.svg';
import {LightBlack, NeutralSlate} from '../../../../styles/colors';

const SeeAllLink = styled(Link)`
  font-weight: 500;
  font-size: 18px;
`;

const PlusIconContainer = styled.View`
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  margin-right: 15px;
  border-radius: 12px;
`;

const Contacts = () => {
  const contacts = useAppSelector(({CONTACT}: RootState) => CONTACT.list);
  const navigation = useNavigation();
  return (
    <Settings>
      {contacts.length ? (
        <>
          {contacts.slice(0, 2).map((item, index) => (
            <View key={index}>
              <SettingsContactRow
                contact={item}
                onPress={() => {
                  navigation.navigate('Contacts', {
                    screen: 'ContactsDetails',
                    params: item,
                  });
                }}
              />
              <Hr />
            </View>
          ))}

          <Setting
            activeOpacity={ActiveOpacity}
            onPress={() => {
              navigation.navigate('Contacts', {
                screen: 'ContactsAdd',
              });
            }}>
            <PlusIconContainer>
              <PlusSvg />
            </PlusIconContainer>

            <H6 medium={true}>Add Contact</H6>
          </Setting>

          {contacts.length > 2 ? (
            <Setting
              style={{justifyContent: 'center'}}
              onPress={() => navigation.navigate('Contacts', {screen: 'Root'})}
              activeOpacity={ActiveOpacity}>
              <SeeAllLink>View All {contacts.length} Contacts</SeeAllLink>
            </Setting>
          ) : null}
        </>
      ) : null}
    </Settings>
  );
};

export default Contacts;
