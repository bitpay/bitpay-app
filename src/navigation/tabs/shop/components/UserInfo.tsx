import React from 'react';
import moment from 'moment';
import styled from 'styled-components/native';
import {useAppSelector} from '../../../../utils/hooks';
import {APP_NETWORK} from '../../../../constants/config';
import {formatUSPhone} from '../bill/utils';
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldValue,
} from './styled/ShopTabComponents';

const UserInfoContainer = styled.ScrollView`
  padding-top: 15px;
`;

const UserInfo = () => {
  const user = useAppSelector(({BITPAY_ID}) => BITPAY_ID.user[APP_NETWORK]);
  return (
    <UserInfoContainer contentContainerStyle={{paddingBottom: 10}}>
      <FieldGroup>
        <FieldLabel>First Name</FieldLabel>
        <Field disabled>
          <FieldValue>{user?.givenName}</FieldValue>
        </Field>
      </FieldGroup>
      <FieldGroup>
        <FieldLabel>Last Name</FieldLabel>
        <Field disabled>
          <FieldValue>{user?.familyName}</FieldValue>
        </Field>
      </FieldGroup>
      <FieldGroup>
        <FieldLabel>Phone Number</FieldLabel>
        <Field disabled>
          <FieldValue>
            {user?.phone ? formatUSPhone(user.phone) : 'Not Provided'}
          </FieldValue>
        </Field>
      </FieldGroup>
      <FieldGroup>
        <FieldLabel>Email</FieldLabel>
        <Field disabled>
          <FieldValue>{user?.email}</FieldValue>
        </Field>
      </FieldGroup>
      <FieldGroup>
        <FieldLabel>Date of Birth</FieldLabel>
        <Field disabled>
          <FieldValue>
            {user?.dateOfBirth
              ? moment(user?.dateOfBirth).format('MM / DD / YYYY')
              : ''}
          </FieldValue>
        </Field>
      </FieldGroup>
      <FieldGroup>
        <FieldLabel>Address</FieldLabel>
        <Field disabled>
          <FieldValue>{user?.address}</FieldValue>
        </Field>
      </FieldGroup>
    </UserInfoContainer>
  );
};

export default UserInfo;
