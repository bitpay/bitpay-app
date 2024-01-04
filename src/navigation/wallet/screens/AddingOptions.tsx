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
      id: 'basic',
      title: t('Basic wallet'),
      description: t(
        'Add coins like Bitcoin and Dogecoin, and also tokens like USDC and APE',
      ),
      cta: () => {
        dispatch(
          Analytics.track('Clicked Create Basic Wallet', {
            context: 'AddingOptions',
          }),
        );
        navigation.navigate('CurrencySelection', {context: 'addWallet', key});
      },
    },
    {
      id: 'multisig',
      title: t('Multisig Wallet'),
      description: t(
        'Requires multiple people or devices and is the most secure',
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
