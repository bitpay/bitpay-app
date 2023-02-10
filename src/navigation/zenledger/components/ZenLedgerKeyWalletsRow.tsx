import React, {useCallback} from 'react';
import styled from 'styled-components/native';
import {FlatList, LayoutAnimation, View} from 'react-native';
import KeySvg from '../../../../assets/img/key.svg';
import {SlateDark, White} from '../../../styles/colors';
import {BaseText} from '../../../components/styled/Text';
import ZenLedgerWalletRow from './ZenLedgerWalletRow';
import haptic from '../../../components/haptic-feedback/haptic';
import Checkbox from '../../../components/checkbox/Checkbox';
import {
  ActiveOpacity,
  Hr,
  SettingIcon,
} from '../../../components/styled/Containers';
import ChevronDownSvg from '../../../../assets/img/chevron-down.svg';
import ChevronUpSvg from '../../../../assets/img/chevron-up.svg';
import {
  ZenLedgerKey,
  ZenLedgerWalletObj,
} from '../../../store/zenledger/zenledger.models';

interface KeyWalletsRowContainerProps {
  isLast?: boolean;
}

const KeyWalletsRowContainer = styled.View<KeyWalletsRowContainerProps>`
  justify-content: flex-start;
  display: flex;
`;

interface KeyNameContainerProps {
  noBorder?: boolean;
}

const KeyNameContainer = styled.View<KeyNameContainerProps>`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
`;

const KeyName = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  margin-left: 7px;
  font-size: 14px;
  font-weight: 700;
`;

const NoGutter = styled(View)`
  margin: 0 -10px;
  padding-right: 5px;
`;

interface Props {
  onPress: (KeyId: string) => void;
  keyId: string;
  checked: boolean;
}

const CheckBoxContainer = styled.View`
  flex-direction: row;
  margin-right: 12px;
`;

const KeyContainer = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  display: flex;
  justify-content: space-between;
  padding: 16px 0 16px 4px;
`;

const DropdownButton = styled.TouchableOpacity``;

const KeyBox = ({keyId, onPress, checked}: Props) => {
  const acknowledge = (): void => {
    haptic('impactLight');
    onPress(keyId);
  };

  return (
    <CheckBoxContainer>
      <Checkbox checked={checked} onPress={() => acknowledge()} />
    </CheckBoxContainer>
  );
};

interface ZenLedgerKeyWalletProps {
  keys: ZenLedgerKey[];
  onPress: (keyId: string, wallet?: ZenLedgerWalletObj) => void;
  onDropdownPress: (keyId: string) => void;
}

const ZenLedgerKeyWalletsRow = ({
  keys,
  onPress,
  onDropdownPress,
}: ZenLedgerKeyWalletProps) => {
  const renderItem = useCallback(
    ({item, keyId, isLast}) => {
      return item ? (
        <NoGutter key={item.id}>
          <ZenLedgerWalletRow
            wallet={item}
            keyId={keyId}
            isLast={isLast}
            onPress={onPress}
            selectAll={false}
          />
        </NoGutter>
      ) : null;
    },
    [onPress, onDropdownPress],
  );

  const renderKey = useCallback(
    ({item, isLast}) => {
      const {wallets, keyName, checked, keyId, showWallets} = item;
      const _onDropdownPress = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        onDropdownPress(keyId);
      };

      return wallets.length ? (
        <KeyWalletsRowContainer key={keyId} isLast={isLast}>
          <>
            <Hr style={{marginHorizontal: -12}} />
            <KeyContainer onPress={_onDropdownPress}>
              <KeyNameContainer>
                <KeyBox keyId={keyId} onPress={onPress} checked={checked} />
                <KeySvg />
                <KeyName>{keyName || 'My Key'}</KeyName>
              </KeyNameContainer>
              <View style={{justifyContent: 'flex-end', display: 'flex'}}>
                <DropdownButton
                  activeOpacity={ActiveOpacity}
                  onPress={_onDropdownPress}>
                  <SettingIcon suffix>
                    {!showWallets ? <ChevronDownSvg /> : <ChevronUpSvg />}
                  </SettingIcon>
                </DropdownButton>
              </View>
            </KeyContainer>
            {showWallets ? (
              <View style={{marginTop: -15}}>
                <FlatList
                  contentContainerStyle={{paddingBottom: 20}}
                  data={wallets}
                  keyExtractor={(_item, index) => index.toString()}
                  renderItem={({
                    item,
                    index,
                  }: {
                    item: ZenLedgerWalletObj;
                    index: number;
                  }) => {
                    const isLast = index === wallets.length - 1;
                    return renderItem({item, keyId, isLast});
                  }}
                />
              </View>
            ) : null}
          </>
        </KeyWalletsRowContainer>
      ) : null;
    },
    [onPress, onDropdownPress],
  );

  return (
    <View style={{marginBottom: 70}}>
      {keys ? (
        <FlatList
          data={keys}
          keyExtractor={(_item, index) => index.toString()}
          renderItem={({item, index}: {item: ZenLedgerKey; index: number}) => {
            const isLast = index === keys.length - 1;
            return renderKey({item, isLast});
          }}
        />
      ) : null}
      <Hr style={{marginHorizontal: -12}} />
    </View>
  );
};

export default ZenLedgerKeyWalletsRow;
