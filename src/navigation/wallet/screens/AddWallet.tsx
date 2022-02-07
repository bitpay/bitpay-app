import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import {
  BaseText,
  H4,
  HeaderTitle,
  TextAlign,
} from '../../../components/styled/Text';
import {CommonActions, useNavigation} from '@react-navigation/native';
import styled from 'styled-components/native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {
  ActiveOpacity,
  ModalContainer,
  Row,
  ScreenGutter,
} from '../../../components/styled/Containers';
import {useDispatch, useSelector} from 'react-redux';
import {StackScreenProps} from '@react-navigation/stack';
import {WalletStackParamList} from '../WalletStack';
import {Key, Wallet} from '../../../store/wallet/wallet.models';
import BoxInput from '../../../components/form/BoxInput';
import Button from '../../../components/button/Button';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {addWallet} from '../../../store/wallet/effects';
import {Controller, useForm} from 'react-hook-form';
import {yupResolver} from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {buildUIFormattedWallet} from './KeyOverview';
import {LightBlack, NeutralSlate} from '../../../styles/colors';
import {CurrencyImage} from '../../../components/currency-image/CurrencyImage';
import {CurrencyListIcons} from '../../../constants/SupportedCurrencyOptions';
import BottomPopupModal from '../../../components/modal/base/bottom-popup/BottomPopupModal';
import WalletRow from '../../../components/list/WalletRow';
import {FlatList} from 'react-native';
import {keyExtractor} from '../../../utils/helper-methods';
import haptic from '../../../components/haptic-feedback/haptic';
import {RootState} from '../../../store';
import Icons from '../components/WalletIcons';

type AddWalletScreenProps = StackScreenProps<WalletStackParamList, 'AddWallet'>;

export type AddWalletParamList = {
  currencyAbbreviation: string;
  currencyName: string;
  key: Key;
  isToken?: boolean;
};

const CreateWalletContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollView = styled(KeyboardAwareScrollView)`
  margin-top: 20px;
  padding: 0 ${ScreenGutter};
`;

const ButtonContainer = styled.View`
  margin-top: 40px;
`;

const AssociatedWalletContainer = styled.View`
  margin: 20px 0;
  position: relative;
`;

const AssociatedWallet = styled.TouchableOpacity`
  background: ${({theme}) => (theme.dark ? LightBlack : NeutralSlate)};
  padding: 0 20px;
  height: 55px;
  border: 1px solid ${({theme}) => (theme.dark ? LightBlack : NeutralSlate)};
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
`;

const Label = styled(BaseText)`
  font-size: 13px;
  padding: 2px 0;
  font-weight: 500;
  line-height: 18px;
  color: ${({theme}) => (theme && theme.dark ? theme.colors.text : '#434d5a')};
`;

const AssociateWalletName = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  font-weight: 500;
  margin-left: 10px;
  color: #9ba3ae;
`;

const AssociatedWalletSelectionModalContainer = styled(ModalContainer)`
  padding: 15px;
  min-height: 200px;
`;

const schema = yup.object().shape({
  walletName: yup.string(),
});

const AddWallet: React.FC<AddWalletScreenProps> = ({route}) => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const {currencyAbbreviation, currencyName, key, isToken} = route.params;
  // temporary until advanced settings is finished
  const network = useSelector(({APP}: RootState) => APP.network);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <HeaderTitle>Create {currencyAbbreviation} Wallet</HeaderTitle>
      ),
    });
  }, [navigation]);

  // find all eth wallets for key
  const ethWallets = key.wallets.filter(
    wallet => wallet.currencyAbbreviation === 'eth',
  );
  // formatting for the bottom modal
  const UIFormattedEthWallets = useMemo(
    () => ethWallets.map(wallet => buildUIFormattedWallet(wallet)),
    [],
  );

  // associatedWallet
  const [associatedWallet, setAssociatedWallet] = useState(
    UIFormattedEthWallets[0],
  );

  const [
    showAssociatedWalletSelectionDropdown,
    setShowAssociatedWalletSelectionDropdown,
  ] = useState<boolean | undefined>(false);

  const [associatedWalletModalVisible, setAssociatedWalletModalVisible] =
    useState(false);

  useEffect(() => {
    setShowAssociatedWalletSelectionDropdown(ethWallets.length > 1 && isToken);
  }, []);

  const {
    control,
    handleSubmit,
    formState: {errors},
  } = useForm<{walletName: string}>({resolver: yupResolver(schema)});

  const add = handleSubmit(async ({walletName}) => {
    try {
      const currency = currencyAbbreviation.toLowerCase();
      let _associatedWallet: Wallet | undefined;

      if (isToken) {
        _associatedWallet = ethWallets.find(
          wallet => wallet.id === associatedWallet.id,
        );

        if (_associatedWallet?.tokens) {
          // check tokens within associated wallet and see if token already exist
          const {tokens} = _associatedWallet;

          for (const token of tokens) {
            if (
              key?.wallets
                .find(wallet => wallet.id === token)
                ?.currencyAbbreviation.toLowerCase() === currency
            ) {
              dispatch(
                showBottomNotificationModal({
                  type: 'warning',
                  title: 'Currency already added',
                  message:
                    'This currency is already associated with the selected wallet',
                  enableBackdropDismiss: true,
                  actions: [
                    {
                      text: 'OK',
                      action: () => {},
                      primary: true,
                    },
                  ],
                }),
              );
              return;
            }
          }
        }
      }

      await dispatch(
        startOnGoingProcessModal(OnGoingProcessMessages.ADDING_WALLET),
      );
      // adds wallet and binds to key obj - creates eth wallet if needed
      const wallet = (await dispatch<any>(
        addWallet({
          key,
          associatedWallet: _associatedWallet,
          isToken,
          currency,
          options: {
            network,
            walletName: walletName === currencyName ? undefined : walletName,
          },
        }),
      )) as Wallet;

      navigation.dispatch(
        CommonActions.reset({
          index: 2,
          routes: [
            {
              name: 'Tabs',
              params: {screen: 'Home'},
            },
            {
              name: 'Wallet',
              params: {screen: 'KeyOverview', params: {key}},
            },
            {
              name: 'Wallet',
              params: {
                screen: 'WalletDetails',
                params: {walletId: wallet.id, key},
              },
            },
          ],
        }),
      );
    } catch (err) {
      // TODO
      console.error(err);
    } finally {
      dispatch(dismissOnGoingProcessModal());
    }
  });

  const renderItem = useCallback(
    ({item}) => (
      <WalletRow
        id={item.id}
        onPress={() => {
          haptic('impactLight');
          setAssociatedWallet(item);
          setAssociatedWalletModalVisible(false);
        }}
        wallet={item}
      />
    ),
    [],
  );

  return (
    <CreateWalletContainer>
      <ScrollView>
        <Controller
          control={control}
          render={({field: {onChange, onBlur, value}}) => (
            <BoxInput
              placeholder={`${currencyAbbreviation} Wallet`}
              label={'WALLET NAME'}
              onBlur={onBlur}
              onChangeText={(text: string) => onChange(text)}
              error={errors.walletName?.message}
              value={value}
            />
          )}
          name="walletName"
          defaultValue={`${currencyName}`}
        />

        {showAssociatedWalletSelectionDropdown && (
          <AssociatedWalletContainer>
            <Label>ASSOCIATED WALLET</Label>
            <AssociatedWallet
              activeOpacity={ActiveOpacity}
              onPress={() => {
                setAssociatedWalletModalVisible(true);
              }}>
              <Row
                style={{alignItems: 'center', justifyContent: 'space-between'}}>
                <Row style={{alignItems: 'center'}}>
                  <CurrencyImage img={CurrencyListIcons.eth} size={30} />
                  <AssociateWalletName>
                    {associatedWallet?.walletName ||
                      `${associatedWallet.currencyAbbreviation.toUpperCase()} Wallet`}
                  </AssociateWalletName>
                </Row>
                <Icons.DownToggle />
              </Row>
            </AssociatedWallet>
          </AssociatedWalletContainer>
        )}

        <BottomPopupModal
          isVisible={associatedWalletModalVisible}
          onBackdropPress={() => setAssociatedWalletModalVisible(false)}>
          <AssociatedWalletSelectionModalContainer>
            <TextAlign align={'center'}>
              <H4>Select a Wallet</H4>
            </TextAlign>
            <FlatList
              contentContainerStyle={{paddingTop: 20, paddingBottom: 20}}
              data={UIFormattedEthWallets}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
            />
          </AssociatedWalletSelectionModalContainer>
        </BottomPopupModal>

        <ButtonContainer>
          <Button onPress={add} buttonStyle={'primary'}>
            Add Wallet
          </Button>
        </ButtonContainer>
      </ScrollView>
    </CreateWalletContainer>
  );
};

export default AddWallet;
