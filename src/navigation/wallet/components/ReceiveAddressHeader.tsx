import React from 'react';
import {StyleSheet, View} from 'react-native';
import haptic from '../../../components/haptic-feedback/haptic';
import RefreshIcon from '../../../components/icons/refresh/RefreshIcon';
import {useTheme} from '../../../contexts';
import {BaseText, H4} from '../../../components/styled/Text';
import {Action, NeutralSlate, SlateDark} from '../../../styles/colors';
import {useTranslation} from 'react-i18next';
import {TouchableOpacity} from '@components/base/TouchableOpacity';

const styles = StyleSheet.create({
  header: {
    marginBottom: 30,
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'relative',
    alignItems: 'center',
  },
  refreshContainer: {
    position: 'absolute',
    marginLeft: 5,
    right: 0,
    marginTop: 0,
  },
  refreshContainerBch: {
    position: 'relative',
    marginLeft: 5,
    right: 0,
    marginTop: 10,
  },
  refresh: {
    width: 40,
    height: 40,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bchHeaderAction: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
    marginHorizontal: 10,
    marginBottom: -1,
    borderBottomWidth: 1,
    height: 60,
  },
  bchHeaderActionText: {
    fontSize: 16,
  },
  bchHeaderActions: {
    flexDirection: 'row',
  },
  bchHeader: {
    marginBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#979797',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

interface RefreshContainerProps {
  isBch?: boolean;
}

const RefreshContainer: React.FC<
  React.PropsWithChildren<
    RefreshContainerProps & React.ComponentProps<typeof View>
  >
> = ({isBch, style, ...rest}) => (
  <View
    style={[
      isBch ? styles.refreshContainerBch : styles.refreshContainer,
      style,
    ]}
    {...rest}
  />
);

const Refresh: React.FC<React.ComponentProps<typeof TouchableOpacity>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.refresh,
        {backgroundColor: theme.dark ? '#616161' : '#F5F7F8'},
        style,
      ]}
      {...rest}
    />
  );
};

interface BchHeaderActionProps {
  isActive: boolean;
}

const BchHeaderAction: React.FC<
  React.PropsWithChildren<
    BchHeaderActionProps & React.ComponentProps<typeof TouchableOpacity>
  >
> = ({isActive, style, ...rest}) => (
  <TouchableOpacity
    style={[
      styles.bchHeaderAction,
      {borderBottomColor: isActive ? Action : 'transparent'},
      style,
    ]}
    {...rest}
  />
);

interface BchHeaderActionTextProps {
  isActive: boolean;
}

const BchHeaderActionText: React.FC<
  React.PropsWithChildren<
    BchHeaderActionTextProps & React.ComponentProps<typeof BaseText>
  >
> = ({isActive, style, ...rest}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.bchHeaderActionText,
        {
          color: isActive
            ? theme.colors.text
            : theme.dark
            ? NeutralSlate
            : SlateDark,
        },
        style,
      ]}
      {...rest}
    />
  );
};

export interface HeaderContextHandler {
  currency: string;
  disabled: boolean;
  activeItem: string;
  onPressChange: (item: string) => void;
  items: string[];
}

interface Props {
  onPressRefresh: () => void;
  contextHandlers?: HeaderContextHandler | null;
  showRefresh: boolean;
}

const ReceiveAddressHeader = ({
  onPressRefresh,
  contextHandlers,
  showRefresh,
}: Props) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const {currency} = contextHandlers || {};
  switch (currency) {
    case 'bch':
      const {disabled, activeItem, onPressChange, items} =
        contextHandlers || {};
      return (
        <View style={styles.bchHeader}>
          <H4 style={{color: theme.colors.text}}>{t('Address')}</H4>

          <View style={styles.bchHeaderActions}>
            {items &&
              items.map((type, index) => (
                <BchHeaderAction
                  key={index}
                  onPress={() => onPressChange && onPressChange(type)}
                  isActive={activeItem === type}
                  disabled={disabled}>
                  <BchHeaderActionText isActive={activeItem === type}>
                    {type}
                  </BchHeaderActionText>
                </BchHeaderAction>
              ))}
            <RefreshContainer isBch={true}>
              <Refresh
                onPress={() => {
                  haptic('impactLight');
                  onPressRefresh();
                }}>
                <RefreshIcon />
              </Refresh>
            </RefreshContainer>
          </View>
        </View>
      );
    default:
      return (
        <View style={styles.header}>
          <H4 style={{color: theme.colors.text}}>{t('Address')}</H4>
          <RefreshContainer>
            {showRefresh ? (
              <Refresh
                onPress={() => {
                  haptic('impactLight');
                  onPressRefresh();
                }}>
                <RefreshIcon />
              </Refresh>
            ) : null}
          </RefreshContainer>
        </View>
      );
  }
};

export default ReceiveAddressHeader;
