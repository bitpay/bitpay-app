import React, {useCallback, useMemo, useRef, useState} from 'react';
import {Modal, Pressable, View, useWindowDimensions} from 'react-native';
import {useTranslation} from 'react-i18next';
import styled from 'styled-components/native';
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

const Container = styled(TouchableOpacity)<{height?: number}>`
  flex-direction: row;
  align-items: center;
  border-radius: 50px;
  padding: 10px 14px;
  ${({height}) => (height ? `height: ${height}px;` : '')}
  border: 1px solid ${({theme: {dark}}) => (dark ? SlateDark : Slate30)};
  background-color: ${({theme: {dark}}) => (dark ? 'transparent' : White)};
`;

const Label = styled(BaseText)`
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
  line-height: 15px;
  margin-right: 10px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const Menu = styled.View`
  width: 190px;
  border-radius: 10px;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : White)};
  shadow-color: ${Black};
  shadow-offset: 0px 0px;
  shadow-opacity: 0.15;
  shadow-radius: 32px;
  elevation: 16;
`;

const MenuItem = styled(TouchableOpacity)`
  padding: 16px;
`;

const MenuItemText = styled(BaseText)`
  font-size: 14px;
  font-weight: 400;
  color: ${({theme}) => theme.colors.text};
`;

const Divider = styled.View`
  height: 1px;
  background-color: ${({theme: {dark}}) => (dark ? SlateDark : Slate30)};
`;

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
