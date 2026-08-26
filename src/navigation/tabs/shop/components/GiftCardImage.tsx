import React, {useEffect, useState} from 'react';
import {Image, StyleSheet, View} from 'react-native';
import RemoteImage from './RemoteImage';

const cardImageHeight = 169;
const defaultCardImageWidth = 270;
const styles = StyleSheet.create({
  imagePlaceholder: {
    height: cardImageHeight,
    width: defaultCardImageWidth,
  },
});

const ImagePlaceholder = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.imagePlaceholder, style]} {...rest} />
);

export default ({uri}: {uri: string}) => {
  const [sizingComplete, setSizingComplete] = useState(false);
  const [cardImageWidth, setCardImageWidth] = useState(defaultCardImageWidth);

  useEffect(
    () =>
      Image.getSize(uri, (width, height) => {
        const scaleFactor = width / height;
        setCardImageWidth(cardImageHeight * scaleFactor);
        setSizingComplete(true);
      }),
    [uri],
  );
  return (
    <>
      {sizingComplete ? (
        <RemoteImage
          uri={uri}
          height={cardImageHeight}
          width={cardImageWidth}
          borderRadius={10}
        />
      ) : (
        <ImagePlaceholder />
      )}
    </>
  );
};
