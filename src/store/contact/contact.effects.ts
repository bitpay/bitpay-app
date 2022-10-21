import {Effect} from '..';
import {
  BitpaySupportedUtxoCoins,
  OtherBitpaySupportedCoins,
} from '../../constants/currencies';
import {LogActions} from '../log';
import {migrateContacts} from './contact.actions';

export const startContactMigration =
  (): Effect<Promise<void>> =>
  async (dispatch, getState): Promise<void> => {
    return new Promise(async resolve => {
      dispatch(LogActions.info('[startContactMigration] - starting...'));
      const contacts = getState().CONTACT.list;
      dispatch(LogActions.info(`Migrating: ${JSON.stringify(contacts)}`));
      // add new chain value to old contacts
      const migratedContacts = contacts.map(contact => ({
        ...contact,
        chain:
          OtherBitpaySupportedCoins[contact.coin] ||
          BitpaySupportedUtxoCoins[contact.coin]
            ? contact.coin
            : 'eth',
      }));
      await dispatch(migrateContacts(migratedContacts));
      dispatch(
        LogActions.info(
          `success [startContactMigration]: ${JSON.stringify(
            migratedContacts,
          )}`,
        ),
      );
      return resolve();
    });
  };
