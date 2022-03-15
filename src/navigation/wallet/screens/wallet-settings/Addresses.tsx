import React, {useLayoutEffect, useState} from 'react';
import {
  BaseText,
  HeaderTitle,
  Paragraph,
} from '../../../../components/styled/Text';
import {useNavigation, useRoute} from '@react-navigation/native';
import styled from 'styled-components/native';
import {ScreenGutter} from '../../../../components/styled/Containers';
import {SlateDark, White} from '../../../../styles/colors';
import Button, {ButtonState} from '../../../../components/button/Button';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../../WalletStack';
import {sleep} from '../../../../utils/helper-methods';
import {useAppSelector} from '../../../../utils/hooks/useAppSelector';

const AddressesContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollView = styled.ScrollView`
  margin-top: 20px;
  padding: 0 ${ScreenGutter};
`;

const AddressesParagraph = styled(Paragraph)`
  margin-bottom: 15px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const Addresses = () => {
  const {
    params: {wallet},
  } = useRoute<RouteProp<WalletStackParamList, 'Addresses'>>();

  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>Addresses</HeaderTitle>,
    });

    return navigation.addListener('blur', async () => {
      await sleep(300);
      setButtonState(undefined);
    });
  }, [navigation]);
  const [buttonState, setButtonState] = useState<ButtonState>();
  const key = useAppSelector(({WALLET}) => WALLET.keys[wallet.keyId]);

  const {
    credentials: {walletId},
  } = wallet;

  const scan = async () => {
    try {
      setButtonState('loading');

      if (!wallet.isComplete()) {
        setButtonState('failed');
        await sleep(1000);
        setButtonState(null);
        return;
      }

      wallet.startScan(
        {
          includeCopayerBranches: true,
        },
        async (err: any) => {
          if (err) {
            console.log(err);
            setButtonState('failed');
            await sleep(1000);
            setButtonState(null);
            return;
          }
          setButtonState('success');
          navigation.navigate('Wallet', {
            screen: 'WalletDetails',
            params: {walletId, key},
          });

          return;
        },
      );
    } catch (e) {}
  };

  return (
    <AddressesContainer>
      <ScrollView>
        <AddressesParagraph>
          {/*TODO: double check copy*/}
          Each bitcoin wallet can generate billions of addresses from your
          12-word recovery phrase. A new address is automatically generated and
          shown each time you receive a payment. Learn more
        </AddressesParagraph>

        <AddressesContainer>
          <Button onPress={scan} state={buttonState}>
            Scan Addresses for Funds
          </Button>
        </AddressesContainer>
      </ScrollView>
    </AddressesContainer>
  );
};

export default Addresses;
