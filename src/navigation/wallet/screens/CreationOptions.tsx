import React, {useLayoutEffect, useState} from 'react';
import {
  ActiveOpacity,
  OptionContainer,
  OptionInfoContainer,
  OptionList,
  OptionListContainer,
} from '../../../components/styled/Containers';
import {useNavigation} from '@react-navigation/native';
import {
  HeaderTitle,
  OptionDescription,
  OptionTitle,
} from '../../../components/styled/Text';
import haptic from '../../../components/haptic-feedback/haptic';
import MultisigOptions from './MultisigOptions';

export interface Option {
  id: string;
  title: string;
  description: string;
  cta: () => void;
}

const CreationOptions: React.FC = () => {
  const navigation = useNavigation();
  const [showMultisigOptions, setShowMultisigOptions] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerTitle: () => <HeaderTitle>Select an option</HeaderTitle>,
      headerTitleAlign: 'center',
    });
  }, [navigation]);

  const optionList: Option[] = [
    {
      id: 'basic',
      title: 'New Key',
      description:
        'Add coins like Bitcoin and Dogecoin and also tokens like USDC and PAX',
      cta: () =>
        navigation.navigate('Wallet', {
          screen: 'CurrencySelection',
          params: {context: 'createNewKey'},
        }),
    },
    {
      id: 'import',
      title: 'Import Key',
      description:
        'Use an existing recovery phrase to import an existing wallet',
      cta: () =>
        navigation.navigate('Wallet', {
          screen: 'Import',
        }),
    },
    {
      id: 'multisig',
      title: 'Multisig Wallet',
      description: 'Requires multiple people or devices and is the most secure',
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
      />
    </>
  );
};

export default CreationOptions;
