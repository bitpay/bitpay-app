import React from 'react';
import {useTranslation} from 'react-i18next';
import moment from 'moment';
import {useAppSelector} from '../../../../utils/hooks';
import {formatUSPhone} from '../bill/utils';
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldValue,
} from './styled/ShopTabComponents';
import {BottomNotificationMessageContainer} from '../../../../components/modal/bottom-notification/BottomNotification';

const UserInfo = () => {
  const {t} = useTranslation();
  const user = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
  );
  return (
    <BottomNotificationMessageContainer style={{paddingBottom: 10}}>
      <FieldGroup>
        <FieldLabel>{t('First Name')}</FieldLabel>
        <Field disabled>
          <FieldValue>{user?.legalGivenName}</FieldValue>
        </Field>
      </FieldGroup>
      <FieldGroup>
        <FieldLabel>{t('Last Name')}</FieldLabel>
        <Field disabled>
          <FieldValue>{user?.legalFamilyName}</FieldValue>
        </Field>
      </FieldGroup>
      <FieldGroup>
        <FieldLabel>{t('Phone Number')}</FieldLabel>
        <Field disabled>
          <FieldValue>
            {user?.phone ? formatUSPhone(user.phone) : t('Not Provided')}
          </FieldValue>
        </Field>
      </FieldGroup>
      <FieldGroup>
        <FieldLabel>{t('Email')}</FieldLabel>
        <Field disabled>
          <FieldValue>{user?.email}</FieldValue>
        </Field>
      </FieldGroup>
      <FieldGroup>
        <FieldLabel>{t('Date of Birth')}</FieldLabel>
        <Field disabled>
          <FieldValue>
            {user?.dateOfBirth
              ? moment(user?.dateOfBirth).format('MM / DD / YYYY')
              : ''}
          </FieldValue>
        </Field>
      </FieldGroup>
      <FieldGroup>
        <FieldLabel>{t('Address')}</FieldLabel>
        <Field disabled>
          <FieldValue>{user?.address}</FieldValue>
        </Field>
      </FieldGroup>
    </BottomNotificationMessageContainer>
  );
};

export default UserInfo;
