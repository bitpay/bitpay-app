import React from 'react';
import {StyleSheet, View} from 'react-native';
import * as Svg from 'react-native-svg';
import {useTheme} from '../../contexts';
import {Action, LinkBlue, Midnight, White} from '../../styles/colors';
import {BaseText} from '../styled/Text';
import ProfileIcon from './ProfileIcon';

export interface AvatarProps {
  size: number;
  initials?: string;
  badge?: () => JSX.Element | null;
  bright?: boolean;
}

interface InitialsProps {
  size?: number;
  initials: string;
  bright?: boolean;
}

const styles = StyleSheet.create({
  avatarContainer: {
    position: 'relative',
  },
  badgeContainer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
  initialsCircle: {
    height: 77,
    width: 77,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontSize: 32,
    fontWeight: '500',
  },
});

const Initials: React.FC<InitialsProps> = ({
  size = 24,
  initials,
  bright = false,
}) => {
  const theme = useTheme();
  return (
    <>
      {bright ? (
        <View
          style={[
            styles.initialsCircle,
            {backgroundColor: theme.dark ? Action : Midnight},
          ]}>
          <BaseText
            style={[
              styles.initialsText,
              {color: theme.dark ? White : LinkBlue},
            ]}>
            {(initials || '').substring(0, 2)}
          </BaseText>
        </View>
      ) : (
        <Svg.Svg height={size} width={size} viewBox="0 0 24 24">
          <Svg.Circle
            id="initials-background"
            fill={Midnight}
            r="12"
            cx="50%"
            cy="50%"
          />
          <Svg.Text
            id="initials-text"
            fill={LinkBlue}
            fontSize="11"
            fontWeight="600"
            x="12"
            y="16"
            textAnchor="middle">
            {(initials || '').substring(0, 2)}
          </Svg.Text>
        </Svg.Svg>
      )}
    </>
  );
};

export const Avatar: React.FC<AvatarProps> = props => {
  const {initials = '', size = 35, badge, bright} = props;

  return (
    <View style={styles.avatarContainer}>
      {initials.length ? (
        <Initials size={size} initials={initials} bright={bright} />
      ) : (
        <ProfileIcon size={size} />
      )}

      {badge ? (
        <View
          style={[
            styles.badgeContainer,
            {height: size * 0.35, width: size * 0.35},
          ]}>
          {badge()}
        </View>
      ) : null}
    </View>
  );
};

export default Avatar;
