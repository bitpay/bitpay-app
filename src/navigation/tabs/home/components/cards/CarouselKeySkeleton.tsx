import React, {useEffect, useRef, useState} from 'react';
import {Animated, TouchableOpacity, View} from 'react-native';
import styled, {useTheme} from 'styled-components/native';
import {
  Action,
  CharcoalBlack,
  LightBlack,
  Slate30,
  SlateDark,
  White,
} from '../../../../../styles/colors';
import {BaseText} from '../../../../../components/styled/Text';
import {ScreenGutter} from '../../../../../components/styled/Containers';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import {HOME_CARD_WIDTH} from '../../../../../components/home-card/HomeCard';
import {BoxShadow} from '../Styled';

const CardOuter = styled.View`
  left: ${ScreenGutter};
`;

const CardInner = styled.View<{dark: boolean; cardHeight: number}>`
  height: ${({cardHeight}) => cardHeight}px;
  width: ${HOME_CARD_WIDTH}px;
  border-radius: 12px;
  border-width: 1px;
  border-color: ${({dark}) => (dark ? LightBlack : Slate30)};
  background-color: ${({dark}) => (dark ? CharcoalBlack : White)};
  padding: 14px 14px 12px;
  justify-content: flex-start;
`;

const Message = styled(BaseText)`
  font-size: 11px;
  line-height: 14px;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
  margin-bottom: 10px;
`;

const ProgressTrack = styled.View`
  height: 4px;
  border-radius: 100px;
  background-color: ${({theme: {dark}}) => (dark ? '#363636' : Slate30)};
  overflow: hidden;
  margin-bottom: 16px;
`;

const ProgressFill = styled(Animated.View)<{failed?: boolean}>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 100px;
  background-color: ${({failed: f}) => (f ? '#B42727' : Action)};
`;

const FailedLabel = styled(BaseText)`
  font-size: 12px;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
`;

const RetryText = styled(BaseText)`
  font-size: 12px;
  color: ${Action};
  font-weight: 600;
`;

interface CarouselKeySkeletonProps {
  message?: string | null;
  progress?: number;
  failed?: boolean;
  onRetry?: () => void;
  cardHeight: number;
}

const CarouselKeySkeleton = ({
  message,
  progress = 0,
  failed,
  onRetry,
  cardHeight,
}: CarouselKeySkeletonProps) => {
  const theme = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const progressAnim = useRef(new Animated.Value(progress)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [progress, progressAnim]);

  return (
    <CardOuter>
      <CardInner
        dark={theme.dark}
        cardHeight={cardHeight}
        style={!theme.dark && BoxShadow}>
        {failed ? (
          <TouchableOpacity
            onPress={onRetry}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
            }}>
            <FailedLabel>Failed import</FailedLabel>
            <RetryText>Retry</RetryText>
          </TouchableOpacity>
        ) : message ? (
          <Message numberOfLines={1}>{message}</Message>
        ) : null}

        <ProgressTrack
          onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}>
          {trackWidth > 0 ? (
            <ProgressFill
              failed={failed}
              style={{
                transform: [
                  {
                    translateX: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-trackWidth, 0],
                    }),
                  },
                ],
              }}
            />
          ) : null}
        </ProgressTrack>

        <SkeletonPlaceholder
          backgroundColor={theme.dark ? '#363636' : '#FAFAFB'}
          highlightColor={theme.dark ? '#575757' : Slate30}>
          <SkeletonPlaceholder.Item alignItems="flex-start">
            {/* Row 1 */}
            <SkeletonPlaceholder.Item
              borderRadius={100}
              height={10}
              width={65}
              marginTop={6}
            />
            {/* Row 2 */}
            <SkeletonPlaceholder.Item
              borderRadius={100}
              height={18}
              width={90}
              marginTop={6}
            />
            {/* Row 3: circle + bar side by side */}
            <SkeletonPlaceholder.Item
              flexDirection="row"
              alignItems="center"
              marginTop={8}>
              <SkeletonPlaceholder.Item
                borderRadius={100}
                height={20}
                width={20}
              />
              <SkeletonPlaceholder.Item
                borderRadius={100}
                height={12}
                width={30}
                marginLeft={6}
              />
            </SkeletonPlaceholder.Item>
            {/* Row 4: circle (left) + tall bar (right) */}
            <SkeletonPlaceholder.Item
              flexDirection="row"
              alignItems="center"
              justifyContent="space-between"
              marginTop={12}
              width={142}>
              <SkeletonPlaceholder.Item
                borderRadius={100}
                height={28}
                width={66}
              />
              <SkeletonPlaceholder.Item
                borderRadius={100}
                height={30}
                width={30}
              />
            </SkeletonPlaceholder.Item>
          </SkeletonPlaceholder.Item>
        </SkeletonPlaceholder>
      </CardInner>
    </CardOuter>
  );
};

export default CarouselKeySkeleton;
