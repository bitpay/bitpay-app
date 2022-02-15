import {ContactActionType, ContactActionTypes} from './contact.types';

import {ContactRowProps} from '../../components/list/ContactRow';

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
      const _matchesContact = state.list.filter(
        (c: ContactRowProps) =>
          c.address === action.contact.address &&
          c.coin === action.contact.coin &&
          c.network === action.contact.network,
      );
      if (!_matchesContact[0]) {
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
