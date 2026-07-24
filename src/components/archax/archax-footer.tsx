import React from 'react';
import {StyleSheet, View} from 'react-native';
import {LinkBlue} from '../../styles/colors';
import {SubText} from '../styled/Text';

const styles = StyleSheet.create({
  container: {borderWidth: 1, borderColor: LinkBlue, borderRadius: 40},
  small: {paddingVertical: 8, paddingHorizontal: 15},
  regular: {padding: 15},
  matchParent: {marginBottom: 20, width: '100%'},
  smallMargins: {marginTop: 10, marginHorizontal: 15, marginBottom: 20},
  regularMargins: {marginTop: 15, marginHorizontal: 15, marginBottom: 20},
});

interface ArchaxFooterProps {
  isSmallScreen?: boolean;
  matchParentWidth?: boolean;
}

const ArchaxFooter: React.FC<ArchaxFooterProps> = ({
  isSmallScreen,
  matchParentWidth,
}) => {
  return (
    <View
      style={[
        styles.container,
        isSmallScreen ? styles.small : styles.regular,
        matchParentWidth
          ? styles.matchParent
          : isSmallScreen
          ? styles.smallMargins
          : styles.regularMargins,
      ]}>
      <SubText style={{textAlign: 'center'}}>
        This Financial Promotion has been approved by Archax LTD on March 17,
        2026.
      </SubText>
    </View>
  );
};

export default React.memo(ArchaxFooter);
