import {ContactActionType, ContactActionTypes} from './contact.types';

import {ContactRowProps} from '../../components/list/ContactRow';
import {findContact} from '../../utils/helper-methods';

export const ContactReduxPersistBlackList = [];
export interface ContactState {
  list: Array<ContactRowProps>;
  contactMigrationComplete: boolean;
  contactTokenAddressMigrationComplete: boolean;
}

const initialState: ContactState = {
  list: [],
  contactMigrationComplete: false,
  contactTokenAddressMigrationComplete: false,
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
          action.contact.tokenAddress,
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
      const {address, chain, network, tokenAddress} = action.contact;
      return {
        ...state,
        list: state.list.map((contact: ContactRowProps) => {
          if (
            contact.address === address &&
            contact.network === network &&
            contact.chain === chain &&
            (!contact.tokenAddress || contact.tokenAddress === tokenAddress)
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
            contact.chain !== action.chain ||
            (contact.tokenAddress &&
              contact.tokenAddress !== action.tokenAddress)
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

    case ContactActionTypes.SET_CONTACT_TOKEN_ADDRESS_MIGRATION_COMPLETE:
      return {
        ...state,
        contactTokenAddressMigrationComplete: true,
      };

    default:
      return state;
  }
};
