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

export const setContactMigrationCompleteV2 = (): ContactActionType => ({
  type: ContactActionTypes.SET_CONTACT_MIGRATION_COMPLETE_V2,
});

export const setContactTokenAddressMigrationComplete =
  (): ContactActionType => ({
    type: ContactActionTypes.SET_CONTACT_TOKEN_ADDRESS_MIGRATION_COMPLETE,
  });

export const setContactBridgeUsdcMigrationComplete = (): ContactActionType => ({
  type: ContactActionTypes.SET_CONTACT_BRIDGE_USDC_MIGRATION_COMPLETE,
});

export const deleteContact = (address: string): ContactActionType => ({
  type: ContactActionTypes.DELETE_CONTACT,
  address,
});
