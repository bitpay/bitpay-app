import React, {useEffect, useRef, useState} from 'react';
import {Animated, TouchableOpacity} from 'react-native';
import styled, {useTheme} from 'styled-components/native';
import {
  Action,
  Caution,
  LightBlack,
  Slate30,
  White,
} from '../../../../../styles/colors';
import {BaseText} from '../../../../../components/styled/Text';
import {ScreenGutter} from '../../../../../components/styled/Containers';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import {BoxShadow} from '../Styled';

const ListCard = styled.View`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : White)};
  border-radius: 12px;
  margin: 10px ${ScreenGutter};
  padding: 12px 15px;
`;

const ImportMessage = styled(BaseText)`
  font-size: 13px;
  margin-bottom: 8px;
`;

const ProgressTrack = styled.View`
  height: 5px;
  border-radius: 3px;
  background-color: ${({theme: {dark}}) => (dark ? '#363636' : Slate30)};
  overflow: hidden;
  margin-bottom: 12px;
`;

const ProgressFill = styled(Animated.View)<{failed?: boolean}>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 3px;
  background-color: ${({failed: f}) => (f ? '#B42727' : Action)};
`;

const SkeletonRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const FailedRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
`;

const FailedText = styled(BaseText)`
  font-size: 14px;
  color: ${Caution};
`;

const RetryText = styled(BaseText)`
  font-size: 14px;
  color: ${Action};
  font-weight: 600;
`;

interface ListKeySkeletonProps {
  message?: string | null;
  progress?: number;
  failed?: boolean;
  onRetry?: () => void;
}

const ListKeySkeleton = ({
  message,
  progress = 0,
  failed,
  onRetry,
}: ListKeySkeletonProps) => {
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
    <ListCard style={!theme.dark && BoxShadow}>
      {message ? (
        <>
          <ImportMessage>{message}</ImportMessage>
          <ProgressTrack
            onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}>
            {trackWidth > 0 ? (
              <ProgressFill
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
        </>
      ) : null}
      {failed ? (
        <>
          <FailedRow>
            <ImportMessage>{'Failed import'}</ImportMessage>
            <TouchableOpacity onPress={onRetry} activeOpacity={0.7}>
              <RetryText>Retry</RetryText>
            </TouchableOpacity>
          </FailedRow>
          <ProgressTrack
            onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}>
            {trackWidth > 0 ? (
              <ProgressFill
                failed
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
        </>
      ) : null}
      <SkeletonRow>
        <SkeletonPlaceholder
          backgroundColor={theme.dark ? '#363636' : '#FAFAFB'}
          highlightColor={theme.dark ? '#575757' : Slate30}>
          <SkeletonPlaceholder.Item alignItems="flex-start">
            <SkeletonPlaceholder.Item
              borderRadius={100}
              height={18}
              width={43}
            />
            <SkeletonPlaceholder.Item
              height={20}
              borderRadius={100}
              marginTop={4}
              width={90}
            />
          </SkeletonPlaceholder.Item>
        </SkeletonPlaceholder>
        <SkeletonPlaceholder
          backgroundColor={theme.dark ? '#363636' : '#FAFAFB'}
          highlightColor={theme.dark ? '#575757' : Slate30}>
          <SkeletonPlaceholder.Item alignItems="flex-end">
            <SkeletonPlaceholder.Item
              borderRadius={100}
              height={18}
              width={43}
            />
            <SkeletonPlaceholder.Item
              borderRadius={100}
              height={20}
              marginTop={4}
              width={90}
            />
          </SkeletonPlaceholder.Item>
        </SkeletonPlaceholder>
      </SkeletonRow>
    </ListCard>
  );
};

export default ListKeySkeleton;
