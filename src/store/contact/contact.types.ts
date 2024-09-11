import {ContactRowProps} from '../../components/list/ContactRow';

export enum ContactActionTypes {
  CREATE_CONTACT = 'CONTACT/CREATE',
  UPDATE_CONTACT = 'CONTACT/UPDATE',
  DELETE_CONTACT = 'CONTACT/DELETE',
  MIGRATE_CONTACTS = 'CONTACT/MIGRATE_CONTACTS',
  SET_CONTACT_MIGRATION_COMPLETE = 'CONTACT/SET_CONTACT_MIGRATION_COMPLETE',
  SET_CONTACT_MIGRATION_COMPLETE_V2 = 'CONTACT/SET_CONTACT_MIGRATION_COMPLETE_V2',
  SET_CONTACT_TOKEN_ADDRESS_MIGRATION_COMPLETE = 'CONTACT/SET_CONTACT_TOKEN_ADDRESS_MIGRATION_COMPLETE',
  SET_CONTACT_BRIDGE_USDC_MIGRATION_COMPLETE = 'CONTACT/SET_CONTACT_BRIDGE_USDC_MIGRATION_COMPLETE',
}

interface CreateContact {
  type: typeof ContactActionTypes.CREATE_CONTACT;
  contact: ContactRowProps;
}

interface UpdateContact {
  type: typeof ContactActionTypes.UPDATE_CONTACT;
  contact: ContactRowProps;
}

interface DeleteContact {
  type: typeof ContactActionTypes.DELETE_CONTACT;
  address: string;
}

interface MigrateContacts {
  type: typeof ContactActionTypes.MIGRATE_CONTACTS;
  contacts: ContactRowProps[];
}
interface SetContactMigrationComplete {
  type: typeof ContactActionTypes.SET_CONTACT_MIGRATION_COMPLETE;
}
interface SetContactMigrationCompleteV2 {
  type: typeof ContactActionTypes.SET_CONTACT_MIGRATION_COMPLETE_V2;
}

interface SetContactTokenAddressMigrationComplete {
  type: typeof ContactActionTypes.SET_CONTACT_TOKEN_ADDRESS_MIGRATION_COMPLETE;
}

interface SetContactBridgeUsdcMigrationComplete {
  type: typeof ContactActionTypes.SET_CONTACT_BRIDGE_USDC_MIGRATION_COMPLETE;
}

export type ContactActionType =
  | CreateContact
  | UpdateContact
  | DeleteContact
  | MigrateContacts
  | SetContactMigrationComplete
  | SetContactMigrationCompleteV2
  | SetContactTokenAddressMigrationComplete
  | SetContactBridgeUsdcMigrationComplete;
