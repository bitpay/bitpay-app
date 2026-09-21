import React, {useCallback} from 'react';
import {useTranslation} from 'react-i18next';
import {Text, TextProps, StyleSheet} from 'react-native';
import {useTheme} from '../../../contexts';
import Button from '../../../components/button/Button';
import CardComponent from '../../../components/card/Card';
import ProgressBar from '../../../components/progress-bar/ProgressBar';
import {BaseText, H3} from '../../../components/styled/Text';
import {Card} from '../../../store/card/card.models';
import {SlateDark, White} from '../../../styles/colors';
import ShippingStatusCardIcon from './ShippingStatusCardIcon';

interface ShippingStatusProps {
  card: Card;
  onActivatePress?: (card: Card) => any;
}

const styles = StyleSheet.create({
  description: {
    fontSize: 14,
    marginBottom: 12,
    marginTop: 12,
  },
});

const StyledHeading = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <H3
        ref={ref}
        style={[{color: theme.dark ? White : SlateDark}, style]}
        {...rest}
      />
    );
  },
);

const Description = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <BaseText
        ref={ref}
        style={[styles.description, {color: theme.colors.description}, style]}
        {...rest}
      />
    );
  },
);

const ShippingStatus: React.FC<ShippingStatusProps> = props => {
  const {t} = useTranslation();
  const {card, onActivatePress} = props;
  const renderShippingIcon = useCallback(() => {
    return card.brand ? <ShippingStatusCardIcon brand={card.brand} /> : null;
  }, [card.brand]);

  const header = <StyledHeading>Ordered</StyledHeading>;

  const body = (
    <>
      <ProgressBar progress={50} renderIcon={renderShippingIcon} />

      <Description>
        {t(
          "Your card has been shipped and is on its way to you. If you don't receive it within 10 business days, please call 1-855-398-1373 Monday through Sunday from 10AM to 10PM EST.",
        )}
      </Description>
    </>
  );

  const footer = (
    <Button buttonStyle="primary" onPress={() => onActivatePress?.(card)}>
      {t('Activate Physical Card')}
    </Button>
  );

  return <CardComponent header={header} body={body} footer={footer} />;
};

export default ShippingStatus;
