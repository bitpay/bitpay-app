import {ContactRowProps} from '../../components/list/ContactRow';

export enum ContactActionTypes {
  CREATE_CONTACT = 'CONTACT/CREATE',
  UPDATE_CONTACT = 'CONTACT/UPDATE',
  DELETE_CONTACT = 'CONTACT/DELETE',
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
  coin: string;
  network: string;
  chain?: string;
}

export type ContactActionType = CreateContact | UpdateContact | DeleteContact;
