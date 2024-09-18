import {ContactActionType, ContactActionTypes} from './contact.types';

import {ContactRowProps} from '../../components/list/ContactRow';
import {findContact} from '../../utils/helper-methods';

export const ContactReduxPersistBlackList = [];
export interface ContactState {
  list: Array<ContactRowProps>;
  contactMigrationComplete: boolean;
  contactMigrationCompleteV2: boolean;
  contactTokenAddressMigrationComplete: boolean;
  contactBridgeUsdcMigrationComplete: boolean;
}

const initialState: ContactState = {
  list: [],
  contactMigrationComplete: false,
  contactMigrationCompleteV2: false,
  contactTokenAddressMigrationComplete: false,
  contactBridgeUsdcMigrationComplete: false,
};

export const contactReducer = (
  state: ContactState = initialState,
  action: ContactActionType,
) => {
  switch (action.type) {
    case ContactActionTypes.CREATE_CONTACT:
      if (!findContact(state.list, action.contact.address)) {
        return {
          ...state,
          list: [...state.list, {...action.contact}],
        };
      } else {
        return state;
      }

    case ContactActionTypes.UPDATE_CONTACT:
      const {address} = action.contact;
      return {
        ...state,
        list: state.list.map((contact: ContactRowProps) => {
          if (contact.address === address) {
            contact = action.contact;
          }
          return contact;
        }),
      };

    case ContactActionTypes.DELETE_CONTACT:
      return {
        ...state,
        list: state.list.filter((contact: ContactRowProps) => {
          return contact.address !== action.address;
        }),
      };

    case ContactActionTypes.MIGRATE_CONTACTS:
      return {
        ...state,
        list: action.contacts,
      };

    case ContactActionTypes.SET_CONTACT_MIGRATION_COMPLETE:
      return {
        ...state,
        contactMigrationComplete: true,
      };

    case ContactActionTypes.SET_CONTACT_MIGRATION_COMPLETE_V2:
      return {
        ...state,
        contactMigrationCompleteV2: true,
      };

    case ContactActionTypes.SET_CONTACT_TOKEN_ADDRESS_MIGRATION_COMPLETE:
      return {
        ...state,
        contactTokenAddressMigrationComplete: true,
      };

    case ContactActionTypes.SET_CONTACT_BRIDGE_USDC_MIGRATION_COMPLETE:
      return {
        ...state,
        contactBridgeUsdcMigrationComplete: true,
      };

    default:
      return state;
  }
};
