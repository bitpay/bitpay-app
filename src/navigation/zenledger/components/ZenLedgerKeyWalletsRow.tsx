import React, {useCallback} from 'react';
import {useTheme} from '../../../contexts';
import {FlatList, LayoutAnimation, View, StyleSheet} from 'react-native';
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
import {TouchableOpacity} from '../../../components/base/TouchableOpacity';
import {useLogger} from '../../../utils/hooks';

interface KeyWalletsRowContainerProps {
  isLast?: boolean;
  children: React.ReactNode;
}

const styles = StyleSheet.create({
  keyWalletsRowContainer: {
    justifyContent: 'flex-start',
    display: 'flex',
  },
  keyNameContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  keyName: {
    marginLeft: 7,
    fontSize: 14,
    fontWeight: '700',
  },
  noGutter: {
    marginHorizontal: -10,
    paddingRight: 5,
  },
  checkBoxContainer: {
    flexDirection: 'row',
    marginRight: 12,
  },
  keyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingLeft: 4,
  },
});

const KeyWalletsRowContainer = ({children}: KeyWalletsRowContainerProps) => (
  <View style={styles.keyWalletsRowContainer}>{children}</View>
);

const KeyNameContainer = ({children}: {children: React.ReactNode}) => (
  <View style={styles.keyNameContainer}>{children}</View>
);

const KeyName = ({children}: {children: React.ReactNode}) => {
  const theme = useTheme();
  return (
    <BaseText style={[styles.keyName, {color: theme.dark ? White : SlateDark}]}>
      {children}
    </BaseText>
  );
};

const NoGutter = ({children}: {children: React.ReactNode}) => (
  <View style={styles.noGutter}>{children}</View>
);

interface Props {
  onPress: (KeyId: string) => void;
  keyId: string;
  checked: boolean;
}

const CheckBoxContainer = ({children}: {children: React.ReactNode}) => (
  <View style={styles.checkBoxContainer}>{children}</View>
);

const KeyContainer = ({
  onPress,
  children,
}: {
  onPress?: () => void;
  children: React.ReactNode;
}) => (
  <TouchableOpacity onPress={onPress} style={styles.keyContainer}>
    {children}
  </TouchableOpacity>
);

const DropdownButton = TouchableOpacity;

const KeyBox = ({keyId, onPress, checked}: Props) => {
  const acknowledge = (): void => {
    haptic('impactLight');
    onPress(keyId);
  };
  const logger = useLogger();

  return (
    <CheckBoxContainer>
      <TouchableOpacity
        touchableLibrary={'react-native-gesture-handler'}
        onPress={() => acknowledge()}>
        <Checkbox
          checked={checked}
          onPress={() => {
            logger.debug('ZenLedger Key Row: checkbox clicked');
          }}
        />
      </TouchableOpacity>
    </CheckBoxContainer>
  );
};

interface ZenLedgerKeyWalletProps {
  keys: ZenLedgerKey[];
  onPress: (keyId: string, wallet?: ZenLedgerWalletObj) => void;
  onDropdownPress: (keyId: string) => void;
  hideBalance: boolean;
}

const ZenLedgerKeyWalletsRow = ({
  keys,
  onPress,
  onDropdownPress,
  hideBalance,
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
            hideBalance={hideBalance}
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
