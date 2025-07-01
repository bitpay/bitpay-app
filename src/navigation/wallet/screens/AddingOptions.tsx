import React, {useLayoutEffect, useState} from 'react';
import {
  ActiveOpacity,
  OptionContainer,
  OptionInfoContainer,
  OptionList,
  OptionListContainer,
} from '../../../components/styled/Containers';
import {useNavigation, useRoute} from '@react-navigation/native';
import {
  HeaderTitle,
  OptionDescription,
  OptionTitle,
} from '../../../components/styled/Text';
import haptic from '../../../components/haptic-feedback/haptic';
import {Key, KeyMethods, Wallet} from '../../../store/wallet/wallet.models';
import {RouteProp} from '@react-navigation/core';
import {WalletGroupParamList} from '../WalletGroup';
import MultisigOptions from './MultisigOptions';
import {Option} from './CreationOptions';
import {useTranslation} from 'react-i18next';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import {
  createMultipleWallets,
  getDecryptPassword,
} from '../../../store/wallet/effects';
import {
  getBaseEVMAccountCreationCoinsAndTokens,
  getBaseSVMAccountCreationCoinsAndTokens,
} from '../../../constants/currencies';
import {successAddWallet} from '../../../store/wallet/wallet.actions';
import {LogActions} from '../../../store/log';
import {
  getEvmGasWallets,
  getSvmGasWallets,
  sleep,
} from '../../../utils/helper-methods';

export type AddingOptionsParamList = {
  key: Key;
};

const AddingOptions: React.FC = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const route = useRoute<RouteProp<WalletGroupParamList, 'AddingOptions'>>();
  const {key} = route.params;
  const [showMultisigOptions, setShowMultisigOptions] = useState(false);
  const network = useAppSelector(({APP}) => APP.network);
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>{t('Select Wallet Type')}</HeaderTitle>,
      headerTitleAlign: 'center',
    });
  }, [navigation, t]);

  const optionList: Option[] = [
    {
      id: 'utxo-wallet',
      title: t('UTXO Wallet'),
      description: t(
        'Dedicated to a single cryptocurrency like Bitcoin, Bitcoin Cash, Litecoin, and Dogecoin. Perfect for users focusing on one specific coin',
      ),
      cta: () => {
        dispatch(
          Analytics.track('Clicked Create Basic Wallet', {
            context: 'AddingOptions',
          }),
        );
        navigation.navigate('CurrencySelection', {
          context: 'addUtxoWallet',
          key,
        });
      },
    },
    {
      id: 'evm-compatible-wallet',
      title: t('EVM-Compatible Wallet'),
      description: t(
        'An account for Ethereum and EVM-compatible networks like Ethereum, Polygon, Base and more. This account type supports Smart Contracts, Dapps and DeFi.',
      ),
      cta: async () => {
        try {
          dispatch(
            Analytics.track('Clicked Create EVM Compatible Wallet', {
              context: 'AddingOptions',
            }),
          );
          const _key = key.methods as KeyMethods;
          let password: string | undefined;
          if (key.isPrivKeyEncrypted) {
            password = await dispatch(
              getDecryptPassword(Object.assign({}, key)),
            );
          }
          const vmWallets = getEvmGasWallets(key.wallets);
          const accounts = vmWallets.map(
            ({credentials}) => credentials.account,
          );
          const account = accounts.length > 0 ? Math.max(...accounts) + 1 : 0;
          await dispatch(startOnGoingProcessModal('ADDING_EVM_CHAINS'));
          const wallets = await dispatch(
            createMultipleWallets({
              key: _key,
              currencies: getBaseEVMAccountCreationCoinsAndTokens(),
              options: {
                network,
                password,
                account,
                customAccount: true,
              },
            }),
          );
          key.wallets.push(...(wallets as Wallet[]));

          dispatch(successAddWallet({key}));
          dispatch(dismissOnGoingProcessModal());
          navigation.goBack();
        } catch (err) {
          const errstring =
            err instanceof Error ? err.message : JSON.stringify(err);
          dispatch(LogActions.error(`Error adding account: ${errstring}`));
          dispatch(dismissOnGoingProcessModal());
          await sleep(1000);
          showErrorModal(errstring);
        }
      },
    },
    {
      id: 'solana-wallet',
      title: t('Solana Wallet'),
      description: t(
        'An account for the Solana network. This account type supports Smart Contracts, Dapps, DeFi and SPL tokens.',
      ),
      cta: async () => {
        try {
          dispatch(
            Analytics.track('Clicked Create SPL Compatible Wallet', {
              context: 'AddingOptions',
            }),
          );
          const _key = key.methods as KeyMethods;
          let password: string | undefined;
          if (key.isPrivKeyEncrypted) {
            password = await dispatch(
              getDecryptPassword(Object.assign({}, key)),
            );
          }
          if (
            !key?.properties?.xPrivKeyEDDSA &&
            !key?.properties?.xPrivKeyEDDSAEncrypted
          ) {
            try {
              await dispatch(startOnGoingProcessModal('ADDING_WALLET'));
              await sleep(500);
              key.methods!.addKeyByAlgorithm('EDDSA', {password});
            } catch (err) {
              dispatch(dismissOnGoingProcessModal());
              const errstring =
                err instanceof Error ? err.message : JSON.stringify(err);
              dispatch(LogActions.error(`Error EDDSA key: ${errstring}`));
              showErrorModal(errstring);
              return;
            }
          }
          const svmWallets = getSvmGasWallets(key.wallets);
          const accounts = svmWallets.map(
            ({credentials}) => credentials.account,
          );
          const account = accounts.length > 0 ? Math.max(...accounts) + 1 : 0;
          await dispatch(startOnGoingProcessModal('ADDING_SPL_CHAINS'));
          await sleep(500);
          const wallets = await dispatch(
            createMultipleWallets({
              key: _key,
              currencies: getBaseSVMAccountCreationCoinsAndTokens(),
              options: {
                network,
                password,
                account,
                customAccount: true,
              },
            }),
          );
          key.wallets.push(...(wallets as Wallet[]));

          dispatch(successAddWallet({key}));
          dispatch(dismissOnGoingProcessModal());
          navigation.goBack();
        } catch (err) {
          const errstring =
            err instanceof Error ? err.message : JSON.stringify(err);
          dispatch(LogActions.error(`Error adding account: ${errstring}`));
          dispatch(dismissOnGoingProcessModal());
          await sleep(1000);
          showErrorModal(errstring);
        }
      },
    },
    {
      id: 'multisig-wallet',
      title: t('Multisig Wallet'),
      description: t(
        'Requires multiple approvals for transactions for wallets like Bitcoin, Bitcoin Cash, Litecoin, and Dogecoin. Ideal for shared funds or enhanced security',
      ),
      cta: () => setShowMultisigOptions(true),
    },
  ];

  const showErrorModal = (e: string) => {
    dispatch(
      showBottomNotificationModal({
        type: 'warning',
        title: t('Something went wrong'),
        message: e,
        enableBackdropDismiss: true,
        actions: [
          {
            text: t('OK'),
            action: () => {},
            primary: true,
          },
        ],
      }),
    );
  };

  return (
    <>
      <OptionContainer>
        <OptionListContainer>
          {optionList.map(({cta, id, title, description}: Option) => (
            <OptionList
              style={{height: 120}}
              activeOpacity={ActiveOpacity}
              onPress={() => {
                haptic('impactLight');
                cta();
              }}
              key={id}>
              <OptionInfoContainer>
                <OptionTitle>{title}</OptionTitle>
                <OptionDescription>{description}</OptionDescription>
              </OptionInfoContainer>
            </OptionList>
          ))}
        </OptionListContainer>
      </OptionContainer>
      <MultisigOptions
        isVisible={showMultisigOptions}
        setShowMultisigOptions={setShowMultisigOptions}
        walletKey={key}
      />
    </>
  );
};

export default AddingOptions;
