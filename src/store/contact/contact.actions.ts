import {ContactActionType, ContactActionTypes} from './contact.types';
import {ContactRowProps} from '../../components/list/ContactRow';

export const createContact = (contact: ContactRowProps): ContactActionType => ({
  type: ContactActionTypes.CREATE_CONTACT,
  contact: contact,
});

export const updateContact = (contact: ContactRowProps): ContactActionType => ({
  type: ContactActionTypes.UPDATE_CONTACT,
  contact: contact,
});

export const deleteContact = (
  address: string,
  coin: string,
  network: string,
  chain: string,
): ContactActionType => ({
  type: ContactActionTypes.DELETE_CONTACT,
  address,
  coin,
  network,
  chain,
});
