import {Effect} from '..';
import {
  BitpaySupportedUtxoCoins,
  OtherBitpaySupportedCoins,
  BitpaySupportedTokens,
  SUPPORTED_EVM_COINS,
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

export const startContactTokenAddressMigration =
  (): Effect<Promise<void>> =>
  async (dispatch, getState): Promise<void> => {
    return new Promise(async resolve => {
      try {
        dispatch(
          LogActions.info('[startContactTokenAddressMigration] - starting...'),
        );
        const contacts = getState().CONTACT.list;
        dispatch(
          LogActions.persistLog(
            LogActions.info(`Migrating: ${JSON.stringify(contacts)}`),
          ),
        );
        const {
          WALLET: {tokenDataByAddress, customTokenDataByAddress},
        } = getState();
        const tokens = {
          ...tokenDataByAddress,
          ...customTokenDataByAddress,
          ...BitpaySupportedTokens,
        };

        // add new tokenAddress value to old contacts
        const migratedContacts = contacts.map(contact => {
          let foundToken;
          if (SUPPORTED_EVM_COINS.includes(contact.chain)) {
            foundToken = Object.values(tokens).find(
              token =>
                token.coin === contact.coin && token.chain === contact.chain,
            );
          }
          return {
            ...contact,
            tokenAddress: foundToken?.address,
          };
        });
        await dispatch(migrateContacts(migratedContacts));
        dispatch(
          LogActions.persistLog(
            LogActions.info(
              `success [startContactTokenAddressMigration]: ${JSON.stringify(
                migratedContacts,
              )}`,
            ),
          ),
        );
        return resolve();
      } catch (err: unknown) {
        const errStr = err instanceof Error ? err.message : JSON.stringify(err);
        dispatch(
          LogActions.persistLog(
            LogActions.error(
              '[startContactTokenAddressMigration] failed - ',
              errStr,
            ),
          ),
        );
        return resolve();
      }
    });
  };
