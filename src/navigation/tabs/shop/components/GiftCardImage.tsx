import React, {useEffect, useState} from 'react';
import {Image} from 'react-native';
import styled from 'styled-components/native';
import RemoteImage from './RemoteImage';

const cardImageHeight = 169;
const defaultCardImageWidth = 270;
const ImagePlaceholder = styled.View`
  height: ${cardImageHeight}px;
  width: ${defaultCardImageWidth}px;
`;

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
