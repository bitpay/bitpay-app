import {ContactRowProps} from '../../components/list/ContactRow';

export enum ContactActionTypes {
  CREATE_CONTACT = 'CONTACT/CREATE',
  DELETE_CONTACT = 'CONTACT/DELETE',
}

interface CreateContact {
  type: typeof ContactActionTypes.CREATE_CONTACT;
  contact: ContactRowProps;
}

interface DeleteContact {
  type: typeof ContactActionTypes.DELETE_CONTACT;
  address: string;
  coin: string;
  network: string;
}

export type ContactActionType = CreateContact | DeleteContact;
