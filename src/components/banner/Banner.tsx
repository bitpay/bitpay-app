import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useTheme} from '../../contexts';
import Info from '../icons/info/Info';
import {
  Caution,
  NotificationPrimary,
  Slate,
  Warning,
  LightBlack,
  NeutralSlate,
  Warning25,
  Caution25,
  Success25,
  Black,
  SlateDark,
  White,
  Slate30,
  LinkBlue,
  Action,
} from '../../styles/colors';
import {BaseText} from '../styled/Text';
import {ActionContainer, ActiveOpacity, Row} from '../styled/Containers';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {SvgProps} from 'react-native-svg';

const BANNER_HEIGHT = 80;

const styles = StyleSheet.create({
  bannerContainer: {
    borderRadius: 10,
    marginVertical: 10,
    marginHorizontal: 0,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  description: {
    marginVertical: 0,
    marginHorizontal: 10,
    flex: 1,
  },
  bannerRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleText: {
    fontWeight: '500',
    lineHeight: 24,
    paddingBottom: 6,
  },
  descriptionText: {
    fontWeight: '400',
    lineHeight: 20,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 20,
  },
});

interface BannerProps {
  title?: string;
  description?: string;
  type: string;
  link?: {onPress: () => void; text: string};
  transComponent?: JSX.Element;
  height?: number;
  hasBackgroundColor?: boolean;
  icon?: React.FC<SvgProps> | null;
  titleFontSize?: number;
  descriptionFontSize?: number;
}

const getBgColor = (type: string) => {
  switch (type) {
    case 'info':
      return NotificationPrimary;
    case 'warning':
      return Warning;
    case 'error':
      return Caution;
    case 'success':
      return '#0B754A';
    default:
      return Slate;
  }
};

const getContainerBgColor = (type: string) => {
  switch (type) {
    case 'info':
      return NotificationPrimary;
    case 'warning':
      return Warning25;
    case 'error':
      return Caution25;
    case 'success':
      return Success25;
    default:
      return Slate;
  }
};

const Banner = ({
  title,
  description,
  type,
  link,
  transComponent,
  height,
  hasBackgroundColor,
  icon,
  titleFontSize,
  descriptionFontSize,
}: BannerProps) => {
  const theme = useTheme();
  const bgColor = getBgColor(type);
  const containerBgColor = hasBackgroundColor
    ? getContainerBgColor(type)
    : undefined;

  return (
    <View
      style={[
        styles.bannerContainer,
        {
          backgroundColor: containerBgColor
            ? containerBgColor
            : theme.dark
            ? LightBlack
            : NeutralSlate,
          minHeight: height || BANNER_HEIGHT,
        },
      ]}>
      <Row style={styles.bannerRow}>
        {icon ? React.createElement(icon) : <Info bgColor={bgColor} />}
        <View style={styles.description}>
          {title ? (
            <BaseText
              style={[
                styles.titleText,
                {
                  fontSize: titleFontSize || 16,
                  color: theme.dark ? White : Black,
                },
                containerBgColor ? {color: getBgColor(type)} : {},
              ]}>
              {title}
            </BaseText>
          ) : null}
          {description ? (
            <BaseText
              style={[
                styles.descriptionText,
                {
                  fontSize: descriptionFontSize || 13,
                  color: theme.dark ? Slate30 : SlateDark,
                },
                containerBgColor ? {color: Black} : {},
              ]}>
              {description}
            </BaseText>
          ) : null}
          {transComponent ? (
            <BaseText
              style={[
                styles.descriptionText,
                {
                  fontSize: descriptionFontSize || 13,
                  color: theme.dark ? Slate30 : SlateDark,
                },
              ]}>
              {transComponent}
            </BaseText>
          ) : null}
          {link ? (
            <ActionContainer>
              <TouchableOpacity
                activeOpacity={ActiveOpacity}
                onPress={link.onPress}>
                <BaseText
                  style={[
                    styles.linkText,
                    {color: theme.dark ? LinkBlue : Action},
                  ]}>
                  {link.text}
                </BaseText>
              </TouchableOpacity>
            </ActionContainer>
          ) : null}
        </View>
      </Row>
    </View>
  );
};

export default Banner;
