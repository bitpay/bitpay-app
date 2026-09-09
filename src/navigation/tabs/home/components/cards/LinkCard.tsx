import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useTheme} from '../../../../../contexts';
import {BaseText} from '../../../../../components/styled/Text';
import {
  ActiveOpacity,
  ScreenGutter,
} from '../../../../../components/styled/Containers';
import {LightBlack, White} from '../../../../../styles/colors';
import {BoxShadow} from '../Styled';
import haptic from '../../../../../components/haptic-feedback/haptic';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
interface LinkCardProps {
  image?: any;
  description: string;
  onPress: () => void;
  disabled?: boolean;
}

const styles = StyleSheet.create({
  linkCardContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    padding: 15,
    maxWidth: 215,
    height: 72,
    marginRight: 20,
    position: 'relative',
    left: parseInt(ScreenGutter, 10),
  },
  linkCardText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'left',
    flexShrink: 1,
  },
  linkCardImageContainer: {
    marginRight: 10,
  },
});

const LinkCardContainer: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.linkCardContainer,
        {backgroundColor: theme.dark ? LightBlack : White},
        style,
      ]}
      {...rest}
    />
  );
};

const LinkCardText: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => <BaseText style={[styles.linkCardText, style]} {...rest} />;

const LinkCardImageContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={styles.linkCardImageContainer}>{children}</View>;

const LinkCard: React.FC<LinkCardProps> = ({image, description, onPress}) => {
  const theme = useTheme();
  return (
    <LinkCardContainer
      activeOpacity={ActiveOpacity}
      testID={`link-card-${description.toLowerCase().replace(/\s+/g, '-')}`}
      accessibilityLabel={description}
      onPress={() => {
        haptic('soft');
        onPress();
      }}
      style={[!theme.dark && BoxShadow]}>
      <LinkCardImageContainer>{image && image(theme)}</LinkCardImageContainer>
      <LinkCardText numberOfLines={2} ellipsizeMode={'tail'}>
        {description}
      </LinkCardText>
    </LinkCardContainer>
  );
};

export default LinkCard;
