import React, {useLayoutEffect} from 'react';
import {BaseText, HeaderTitle} from '../../../components/styled/Text';
import styled from 'styled-components/native';
import {useNavigation} from '@react-navigation/native';
import {ScreenGutter} from '../../../components/styled/Containers';

const ContactsContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollView = styled.ScrollView`
  margin: ${ScreenGutter};
`;

const ContactsRoot = () => {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>Contacts</HeaderTitle>,
    });
  });
  return (
    <ContactsContainer>
      <ScrollView>
        <BaseText>TODO: Contacts</BaseText>
      </ScrollView>
    </ContactsContainer>
  );
};

export default ContactsRoot;
