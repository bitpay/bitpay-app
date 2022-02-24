import {ContactActionType, ContactActionTypes} from './contact.types';

import {ContactRowProps} from '../../components/list/ContactRow';
import {findContact} from '../../utils/helper-methods';

export const ContactReduxPersistBlackList = [];
export interface ContactState {
  list: Array<ContactRowProps>;
}

const initialState: ContactState = {
  list: [],
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
        )
      ) {
        return {
          ...state,
          list: [...state.list, {...action.contact}],
        };
      }
      return {...state};

    case ContactActionTypes.DELETE_CONTACT:
      return {
        ...state,
        list: state.list.filter((contact: ContactRowProps) => {
          return (
            contact.address !== action.address ||
            contact.coin !== action.coin ||
            contact.network !== action.network
          );
        }),
      };

    default:
      return {...state};
  }
};
