import {ContactRowProps} from '../../components/list/ContactRow';
import {Effect} from '..';
import {
  BitpaySupportedUtxoCoins,
  OtherBitpaySupportedCoins,
  BitpaySupportedTokens,
  SUPPORTED_EVM_COINS,
} from '../../constants/currencies';
import {LogActions} from '../log';
import {migrateContacts} from './contact.actions';
import {IsValidEVMAddress} from '../wallet/utils/validations';

export const startContactV2Migration =
  (): Effect<Promise<void>> =>
  async (dispatch, getState): Promise<void> => {
    return new Promise(async resolve => {
      dispatch(LogActions.info('[startContactMigrationV2] - starting...'));
      const contacts = getState().CONTACT.list;
      const merged: Record<string, ContactRowProps> = {};
      contacts.forEach(_contact => {
        const {address, name} = _contact;
        if (!merged[address]) {
          // First occurrence of the address, no notes
          merged[address] = {
            ..._contact,
            notes: IsValidEVMAddress(address) ? 'EVM compatible address\n' : '',
          };
        } else {
          // Append name to the existing name field, separated by a dash
          merged[address].name += ` - ${name}`;
        }
      });
      const mergedContacts = Object.values(merged);
      await dispatch(migrateContacts(mergedContacts));
      dispatch(
        LogActions.info(
          `success [startContactMigrationV2]: ${JSON.stringify(
            mergedContacts,
          )}`,
        ),
      );
      return resolve();
    });
  };

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

export const startContactBridgeUsdcMigration =
  (): Effect<Promise<void>> =>
  async (dispatch, getState): Promise<void> => {
    return new Promise(async resolve => {
      try {
        dispatch(
          LogActions.info('[startContactBridgeUsdcMigration] - starting...'),
        );
        const contacts = getState().CONTACT.list;
        dispatch(
          LogActions.persistLog(
            LogActions.info(`Migrating: ${JSON.stringify(contacts)}`),
          ),
        );
        const usdcBridgeTokenAddress =
          '0x2791bca1f2de4661ed88a30c99a7a9449aa84174';

        const migratedContacts = contacts.map(contact =>
          contact.tokenAddress === usdcBridgeTokenAddress
            ? {...contact, coin: 'usdc.e'}
            : contact,
        );
        await dispatch(migrateContacts(migratedContacts));
        dispatch(
          LogActions.persistLog(
            LogActions.info(
              `success [startContactBridgeUsdcMigration]: ${JSON.stringify(
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
              '[startContactBridgeUsdcMigration] failed - ',
              errStr,
            ),
          ),
        );
        return resolve();
      }
    });
  };

export const startContactPolMigration =
  (): Effect<Promise<void>> =>
  async (dispatch, getState): Promise<void> => {
    return new Promise(async resolve => {
      try {
        dispatch(LogActions.info('[startContactPolMigration] - starting...'));
        const contacts = getState().CONTACT.list;
        dispatch(
          LogActions.persistLog(
            LogActions.info(`Migrating: ${JSON.stringify(contacts)}`),
          ),
        );

        const migratedContacts = contacts.map(contact =>
          contact.coin === 'matic' ? {...contact, coin: 'pol'} : contact,
        );
        await dispatch(migrateContacts(migratedContacts));
        dispatch(
          LogActions.persistLog(
            LogActions.info(
              `success [startContactPolMigration]: ${JSON.stringify(
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
            LogActions.error('[startContactPolMigration] failed - ', errStr),
          ),
        );
        return resolve();
      }
    });
  };
