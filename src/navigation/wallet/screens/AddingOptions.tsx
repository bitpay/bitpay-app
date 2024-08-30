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
import {Key} from '../../../store/wallet/wallet.models';
import {RouteProp} from '@react-navigation/core';
import {WalletGroupParamList} from '../WalletGroup';
import MultisigOptions from './MultisigOptions';
import {Option} from './CreationOptions';
import {useTranslation} from 'react-i18next';
import {useAppDispatch} from '../../../utils/hooks';
import {Analytics} from '../../../store/analytics/analytics.effects';

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
        'Dedicated to a single cryptocurrency like Bitcoin, Bitcoin Cash, Litecoin, and Dogecoin. Perfect for users focusing on one specific coin.',
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
      id: 'account-based-wallet',
      title: t('Account-Based Wallet'),
      description: t(
        'An account for Ethereum and EVM-compatible chains like Solana, Ethereum. Supports smart contracts and DeFi across multiple networks.',
      ),
      cta: () => {
        dispatch(
          Analytics.track('Clicked Create Basic Wallet', {
            context: 'AddingOptions',
          }),
        );
        navigation.navigate('CurrencySelection', {
          context: 'addEVMWallet',
          key,
        });
      },
    },
    {
      id: 'multisig-wallet',
      title: t('Multisig Wallet'),
      description: t(
        'Requires multiple approvals for transactions for wallets like Bitcoin, Bitcoin Cash, Litecoin, and Dogecoin. Ideal for shared funds or enhanced security.',
      ),
      cta: () => setShowMultisigOptions(true),
    },
  ];
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
