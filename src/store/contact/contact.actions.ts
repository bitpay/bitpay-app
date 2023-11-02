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

export const migrateContacts = (
  contacts: ContactRowProps[],
): ContactActionType => ({
  type: ContactActionTypes.MIGRATE_CONTACTS,
  contacts: contacts,
});

export const setContactMigrationComplete = (): ContactActionType => ({
  type: ContactActionTypes.SET_CONTACT_MIGRATION_COMPLETE,
});

export const setContactTokenAddressMigrationComplete =
  (): ContactActionType => ({
    type: ContactActionTypes.SET_CONTACT_TOKEN_ADDRESS_MIGRATION_COMPLETE,
  });

export const deleteContact = (
  address: string,
  coin: string,
  network: string,
  chain: string,
  tokenAddress: string | undefined,
): ContactActionType => ({
  type: ContactActionTypes.DELETE_CONTACT,
  address,
  coin,
  network,
  chain,
  tokenAddress,
});
