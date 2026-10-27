import React, {ReactElement, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {useTheme} from '../../../contexts';
import {
  BitPay,
  LightBlack,
  LightBlue,
  NeutralSlate,
} from '../../../styles/colors';
import {H7} from '../../../components/styled/Text';
import ArrowDownSvg from '../../../../assets/img/chevron-down.svg';
import ArrowUpSvg from '../../../../assets/img/chevron-up.svg';

interface Props {
  icon?: ReactElement;
  description: string;
  onPress?: () => void;
  dropDown?: boolean;
  accent?: 'action';
  height?: string;
}

interface StyleProps {
  accent?: 'action';
  height?: string;
}

const styles = StyleSheet.create({
  pillContainer: {
    flexDirection: 'row',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 11,
    maxWidth: 202,
  },
  iconContainer: {
    paddingVertical: 10,
    paddingHorizontal: 0,
  },
  pillText: {
    flexDirection: 'row',
    marginLeft: 5,
  },
  arrowContainer: {
    marginLeft: 8,
  },
});

export const PillContainer = React.forwardRef<
  React.ElementRef<typeof Pressable>,
  StyleProps & React.ComponentProps<typeof Pressable>
>(({accent, height, style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <Pressable
      ref={ref}
      style={state => [
        styles.pillContainer,
        {
          backgroundColor: theme.dark
            ? LightBlack
            : accent === 'action'
            ? LightBlue
            : NeutralSlate,
          height: (height ? height : '100%') as any,
        },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    />
  );
});
PillContainer.displayName = 'PillContainer';

const IconContainer = ({style, ...rest}: React.ComponentProps<typeof View>) => (
  <View style={[styles.iconContainer, style]} {...rest} />
);

export const PillText = React.forwardRef<
  React.ElementRef<typeof H7>,
  StyleProps & React.ComponentProps<typeof H7>
>(({accent, style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <H7
      ref={ref}
      style={[
        styles.pillText,
        !theme.dark && accent === 'action' ? {color: BitPay} : null,
        style,
      ]}
      {...rest}
    />
  );
});
PillText.displayName = 'PillText';

const ArrowContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.arrowContainer, style]} {...rest} />
);

const SendToPill = ({
  icon,
  description,
  onPress,
  dropDown,
  accent,
  height,
}: Props) => {
  const [toggleArrow, setToggleArrow] = useState(false);
  const _onPress = () => {
    setToggleArrow(!toggleArrow);
    if (onPress) {
      onPress();
    }
  };
  return (
    <PillContainer
      disabled={!onPress}
      onPress={_onPress}
      accent={accent}
      height={height}>
      <IconContainer>{icon}</IconContainer>
      <PillText numberOfLines={1} ellipsizeMode={'middle'} accent={accent}>
        {description}
      </PillText>

      {dropDown ? (
        <ArrowContainer>
          {toggleArrow ? (
            <ArrowUpSvg width={12} height={12} />
          ) : (
            <ArrowDownSvg width={12} height={12} />
          )}
        </ArrowContainer>
      ) : null}
    </PillContainer>
  );
};

export default SendToPill;
