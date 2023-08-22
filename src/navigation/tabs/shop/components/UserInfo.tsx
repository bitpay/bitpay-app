import React from 'react';
import moment from 'moment';
import styled from 'styled-components/native';
import {
  Feather,
  LightBlack,
  Slate,
  Slate10,
  Slate30,
  SlateDark,
} from '../../../../styles/colors';
import {Paragraph} from '../../../../components/styled/Text';
import {useAppSelector} from '../../../../utils/hooks';
import {APP_NETWORK} from '../../../../constants/config';
import {formatUSPhone} from '../bill/utils';

const Field = styled.View`
  background-color: ${({theme}) => (theme.dark ? LightBlack : Slate10)};
  border-radius: 4px;
  border: 1px solid ${({theme}) => (theme.dark ? SlateDark : Slate30)};
  padding: 8px 14px;
  margin-top: 5px;
  min-height: 43px;
`;

const FieldGroup = styled.View`
  margin-bottom: 10px;
`;

const FieldLabel = styled(Paragraph)`
  color: ${({theme}) => (theme.dark ? Feather : LightBlack)};
  font-size: 14px;
  font-weight: 500;
  opacity: 0.75;
`;

const FieldValue = styled(Paragraph)`
  color: ${({theme}) => (theme.dark ? Slate : SlateDark)};
`;

const UserInfoContainer = styled.ScrollView`
  padding-top: 15px;
`;

const UserInfo = () => {
  const user = useAppSelector(({BITPAY_ID}) => BITPAY_ID.user[APP_NETWORK]);
  return (
    <UserInfoContainer contentContainerStyle={{paddingBottom: 10}}>
      <FieldGroup>
        <FieldLabel>First Name</FieldLabel>
        <Field>
          <FieldValue>{user?.givenName}</FieldValue>
        </Field>
      </FieldGroup>
      <FieldGroup>
        <FieldLabel>Last Name</FieldLabel>
        <Field>
          <FieldValue>{user?.familyName}</FieldValue>
        </Field>
      </FieldGroup>
      <FieldGroup>
        <FieldLabel>Phone Number</FieldLabel>
        <Field>
          <FieldValue>
            {user?.phone ? formatUSPhone(user.phone) : 'Not Provided'}
          </FieldValue>
        </Field>
      </FieldGroup>
      <FieldGroup>
        <FieldLabel>Email</FieldLabel>
        <Field>
          <FieldValue>{user?.email}</FieldValue>
        </Field>
      </FieldGroup>
      <FieldGroup>
        <FieldLabel>Date of Birth</FieldLabel>
        <Field>
          <FieldValue>
            {user?.dateOfBirth
              ? moment(user?.dateOfBirth).format('MM / DD / YYYY')
              : ''}
          </FieldValue>
        </Field>
      </FieldGroup>
      <FieldGroup>
        <FieldLabel>Address</FieldLabel>
        <Field>
          <FieldValue>{user?.address}</FieldValue>
        </Field>
      </FieldGroup>
    </UserInfoContainer>
  );
};

export default UserInfo;
