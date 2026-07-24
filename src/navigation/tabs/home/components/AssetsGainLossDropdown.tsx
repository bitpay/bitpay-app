import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  AppState,
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../../../../contexts';
import {TouchableOpacity} from '../../../../components/base/TouchableOpacity';
import {ActiveOpacity} from '../../../../components/styled/Containers';
import {BaseText} from '../../../../components/styled/Text';
import {
  Black,
  LightBlack,
  Slate30,
  SlateDark,
  White,
} from '../../../../styles/colors';
import ChevronDown from './ChevronDown';
import type {GainLossMode} from '../../../../utils/portfolio/assets';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 50,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  label: {
    fontSize: 12,
    fontStyle: 'normal',
    fontWeight: '400',
    lineHeight: 15,
    marginRight: 10,
  },
  menu: {
    width: 190,
    borderRadius: 10,
    shadowColor: Black,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 16,
  },
  menuItem: {
    padding: 16,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '400',
  },
  divider: {
    height: 1,
  },
});

const Container: React.FC<
  React.ComponentProps<typeof TouchableOpacity> & {height?: number}
> = ({height, style, ...rest}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.container,
        height ? {height} : null,
        {
          borderColor: theme.dark ? SlateDark : Slate30,
          backgroundColor: theme.dark ? 'transparent' : White,
        },
        style,
      ]}
      {...rest}
    />
  );
};

const Label: React.FC<{children?: React.ReactNode}> = ({children}) => {
  const theme = useTheme();
  return (
    <BaseText style={[styles.label, {color: theme.dark ? White : SlateDark}]}>
      {children}
    </BaseText>
  );
};

const Menu: React.FC<{children?: React.ReactNode}> = ({children}) => {
  const theme = useTheme();
  return (
    <View
      style={[styles.menu, {backgroundColor: theme.dark ? LightBlack : White}]}>
      {children}
    </View>
  );
};

const MenuItem: React.FC<React.ComponentProps<typeof TouchableOpacity>> = ({
  style,
  ...rest
}) => <TouchableOpacity style={[styles.menuItem, style]} {...rest} />;

const MenuItemText: React.FC<{children?: React.ReactNode}> = ({children}) => {
  const theme = useTheme();
  return (
    <BaseText style={[styles.menuItemText, {color: theme.colors.text}]}>
      {children}
    </BaseText>
  );
};

const Divider: React.FC = () => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.divider,
        {backgroundColor: theme.dark ? SlateDark : Slate30},
      ]}
    />
  );
};

interface Props {
  value: GainLossMode;
  onChange?: (value: GainLossMode) => void;
  height?: number;
}

const AssetsGainLossDropdown: React.FC<Props> = ({value, onChange, height}) => {
  const {t} = useTranslation();
  const anchorRef = useRef<View>(null);
  const {width: screenWidth} = useWindowDimensions();
  const [isVisible, setIsVisible] = useState(false);
  const [anchor, setAnchor] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  const options = useMemo((): Array<{value: GainLossMode; label: string}> => {
    return [
      {value: '1D', label: t("Today's Gain/Loss")},
      // {value: '1W', label: t('1W Gain/Loss')},
      // {value: '1M', label: t('1M Gain/Loss')},
      // {value: '3M', label: t('3M Gain/Loss')},
      // {value: '1Y', label: t('1Y Gain/Loss')},
      // {value: '5Y', label: t('5Y Gain/Loss')},
      {value: 'ALL', label: t('Total Gain/Loss')},
    ];
  }, [t]);

  const displayLabel = useMemo(() => {
    return options.find(o => o.value === value)?.label || t('Total Gain/Loss');
  }, [options, t, value]);

  const open = useCallback(() => {
    if (!anchorRef.current?.measureInWindow) {
      setAnchor(null);
      setIsVisible(true);
      return;
    }
    anchorRef.current.measureInWindow(
      (x: number, y: number, w: number, h: number) => {
        setAnchor({x, y, w, h});
        setIsVisible(true);
      },
    );
  }, []);

  const close = useCallback(() => {
    setIsVisible(false);
  }, []);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const subscription = AppState.addEventListener('change', status => {
      if (status !== 'active') {
        close();
      }
    });

    return () => subscription.remove();
  }, [close, isVisible]);

  const select = useCallback(
    (next: GainLossMode) => {
      onChange?.(next);
      close();
    },
    [close, onChange],
  );

  const menuPosition = useMemo(() => {
    const menuWidth = 190;
    const margin = 12;

    if (!anchor) {
      // Explicit fallback: align top-right with margins.
      const left = Math.max(margin, screenWidth - menuWidth - margin);
      return {left, top: margin};
    }

    const preferredLeft = anchor.x + anchor.w - menuWidth;
    const left = Math.max(
      margin,
      Math.min(preferredLeft, screenWidth - menuWidth - margin),
    );
    const top = anchor.y + anchor.h + 8;
    return {left, top};
  }, [anchor, screenWidth]);

  return (
    <>
      <View ref={anchorRef} collapsable={false}>
        <Container height={height} activeOpacity={ActiveOpacity} onPress={open}>
          <Label>{displayLabel}</Label>
          <ChevronDown />
        </Container>
      </View>

      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={close}>
        <View style={{flex: 1}}>
          <Pressable
            style={{position: 'absolute', top: 0, right: 0, bottom: 0, left: 0}}
            onPress={close}
          />
          <View style={{position: 'absolute', ...menuPosition}}>
            <Menu>
              {options.map((opt, index) => {
                return (
                  <React.Fragment key={opt.value}>
                    <MenuItem
                      activeOpacity={ActiveOpacity}
                      onPress={() => select(opt.value)}>
                      <MenuItemText>{opt.label}</MenuItemText>
                    </MenuItem>
                    {index < options.length - 1 ? <Divider /> : null}
                  </React.Fragment>
                );
              })}
            </Menu>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default AssetsGainLossDropdown;
