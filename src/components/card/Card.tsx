import {CardContainer} from '../styled/Containers';
import * as React from 'react';
import {ReactElement, ReactNode} from 'react';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';

const styles = StyleSheet.create({
  cardHeader: {minHeight: 30, padding: 15},
  cardBody: {flexGrow: 1, paddingVertical: 0, paddingHorizontal: 15},
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: 30,
    padding: 15,
    width: '100%',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: 'auto',
    width: 'auto',
    borderRadius: 27,
    overflow: 'hidden',
  },
});

export interface CardProps {
  header?: ReactNode;
  body?: ReactNode;
  footer?: ReactNode;
  backgroundImg?: () => ReactElement;
  style?: StyleProp<ViewStyle>;
}

const Card = ({header, body, footer, backgroundImg, style}: CardProps) => {
  return (
    <CardContainer style={(style as object) || {}}>
      {backgroundImg && (
        <View style={styles.backgroundImage}>{backgroundImg()}</View>
      )}
      {header && <View style={styles.cardHeader}>{header}</View>}
      {body && <View style={styles.cardBody}>{body}</View>}
      {footer && <View style={styles.cardFooter}>{footer}</View>}
    </CardContainer>
  );
};

export default Card;
