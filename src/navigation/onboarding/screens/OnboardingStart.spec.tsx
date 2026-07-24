import React from 'react';
import {act, fireEvent, render} from '@test/render';
import OnboardingStart from './OnboardingStart';

const mockDispatch = jest.fn();
const mockAnalyticsTrack = jest.fn(
  (event: string, properties: Record<string, unknown>) => ({
    type: 'TEST/ANALYTICS_TRACK',
    payload: {event, properties},
  }),
);
const mockCarouselRender = jest.fn();
const mockTranslate = (key: string) => key;
const mockState = {
  APP: {
    network: 'livenet',
    notificationsInteractionDone: false,
    pinInteractionDone: false,
  },
  BITPAY_ID: {
    apiToken: {
      livenet: '',
    },
  },
};

let mockLatestCarouselProps: Record<string, any> | undefined;

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: mockTranslate}),
}));

jest.mock('react-navigation-backhandler', () => ({
  useAndroidBackHandler: jest.fn(),
}));

jest.mock('../../../utils/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: typeof mockState) => unknown) =>
    selector(mockState),
}));

jest.mock('../../../store/analytics/analytics.effects', () => ({
  Analytics: {
    track: (event: string, properties: Record<string, unknown>): unknown =>
      mockAnalyticsTrack(event, properties),
  },
}));

jest.mock('../../../store/bitpay-id', () => ({
  BitPayIdEffects: {
    startDisconnectBitPayId: jest.fn(() => ({
      type: 'TEST/DISCONNECT_BITPAY_ID',
    })),
  },
}));

jest.mock('../../../components/button/Button', () => {
  const ReactLib = require('react');
  const {Pressable} = require('react-native');

  return {
    __esModule: true,
    default: ({children, ...props}: any) =>
      ReactLib.createElement(Pressable, props, children),
  };
});

jest.mock('../../../components/pagination-dots/PaginationDots', () => {
  const ReactLib = require('react');
  const {View} = require('react-native');

  return {
    __esModule: true,
    default: ({index}: {index: number}) =>
      ReactLib.createElement(View, {
        testID: `pagination-button-${index}`,
      }),
  };
});

jest.mock('react-native-reanimated', () => {
  const ReactLib = require('react');

  return {
    __esModule: true,
    useSharedValue: (initialValue: unknown) =>
      ReactLib.useRef({value: initialValue}).current,
  };
});

jest.mock('react-native-reanimated-carousel', () => {
  const ReactLib = require('react');
  const {View} = require('react-native');

  return {
    __esModule: true,
    default: (props: Record<string, any>) => {
      mockLatestCarouselProps = props;
      mockCarouselRender(props);
      return ReactLib.createElement(View, {testID: 'onboarding-carousel'});
    },
  };
});

const renderScreen = () => {
  const navigation = {
    navigate: jest.fn(),
    setOptions: jest.fn(),
  };

  return {
    navigation,
    ...render(
      <OnboardingStart
        navigation={navigation as any}
        route={{key: 'OnboardingStart', name: 'OnboardingStart'} as any}
      />,
    ),
  };
};

describe('OnboardingStart performance boundaries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLatestCarouselProps = undefined;
  });

  it('keeps progress on the UI thread and tracks once when an item snaps', () => {
    renderScreen();

    expect(mockLatestCarouselProps?.windowSize).toBe(2);
    expect(mockLatestCarouselProps?.onProgressChange).toEqual(
      expect.objectContaining({value: 0}),
    );
    expect(mockLatestCarouselProps?.onProgressChange).not.toEqual(
      expect.any(Function),
    );

    act(() => {
      if (mockLatestCarouselProps) {
        mockLatestCarouselProps.onProgressChange.value = 0.25;
        mockLatestCarouselProps.onProgressChange.value = 0.75;
      }
    });
    expect(mockAnalyticsTrack).not.toHaveBeenCalled();

    act(() => {
      mockLatestCarouselProps?.onSnapToItem(1);
    });

    expect(mockAnalyticsTrack).toHaveBeenCalledTimes(1);
    expect(mockAnalyticsTrack).toHaveBeenCalledWith('Swiped Feature', {
      context: 'onboarding',
      pageSwiped: 2,
    });
  });

  it('does not re-render the carousel when CTA layout updates its spacer', () => {
    const {getByTestId} = renderScreen();
    const initialData = mockLatestCarouselProps?.data;

    expect(mockCarouselRender).toHaveBeenCalledTimes(1);

    fireEvent(getByTestId('cta-container'), 'layout', {
      nativeEvent: {
        layout: {height: 100, width: 300, x: 0, y: 0},
      },
    });

    expect(mockCarouselRender).toHaveBeenCalledTimes(1);
    expect(mockLatestCarouselProps?.data).toBe(initialData);
  });
});
