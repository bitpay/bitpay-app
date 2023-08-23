import {ContactActionType, ContactActionTypes} from './contact.types';

import {ContactRowProps} from '../../components/list/ContactRow';
import {findContact} from '../../utils/helper-methods';

export const ContactReduxPersistBlackList = [];
export interface ContactState {
  list: Array<ContactRowProps>;
  contactMigrationComplete: boolean;
}

const initialState: ContactState = {
  list: [],
  contactMigrationComplete: false,
};

export const contactReducer = (
  state: ContactState = initialState,
  action: ContactActionType,
) => {
  switch (action.type) {
    case ContactActionTypes.CREATE_CONTACT:
      if (
        !findContact(
          state.list,
          action.contact.address,
          action.contact.coin,
          action.contact.network,
          action.contact.chain,
        )
      ) {
        return {
          ...state,
          list: [...state.list, {...action.contact}],
        };
      } else {
        return state;
      }

    case ContactActionTypes.UPDATE_CONTACT:
      const {address, chain, network} = action.contact;
      return {
        ...state,
        list: state.list.map((contact: ContactRowProps) => {
          if (
            contact.address === address &&
            contact.network === network &&
            contact.chain === chain
          ) {
            contact = action.contact;
          }
          return contact;
        }),
      };

    case ContactActionTypes.DELETE_CONTACT:
      return {
        ...state,
        list: state.list.filter((contact: ContactRowProps) => {
          return (
            contact.address !== action.address ||
            contact.coin !== action.coin ||
            contact.network !== action.network ||
            contact.chain !== action.chain
          );
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

    default:
      return state;
  }
};
