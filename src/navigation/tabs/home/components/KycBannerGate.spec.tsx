import React from 'react';
import {Provider} from 'react-redux';
import {cleanup, fireEvent, render} from '@test/render';
import configureTestStore from '@test/store';
import {Network} from '../../../../constants';
import {BitpayIdScreens} from '../../../bitpay-id/BitpayIdGroup';
import KycBannerGate from './KycBannerGate';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({navigate: mockNavigate}),
}));

const EID = 'user-eid-123';
const CONGRATS = 'Congratulations! Your identity was verified.';
const IN_REVIEW = 'Identity verification in review.';
const ACTION_REQUIRED = 'Action required on your application.';
const IN_PROGRESS = 'Continue your identity verification.';

const buildStore = ({
  status,
  ack,
  path = 'sumsub',
}: {
  status: string;
  ack?: {eid: string; state: string} | null;
  path?: string;
}) =>
  configureTestStore({
    APP: {network: Network.mainnet},
    BITPAY_ID: {
      user: {[Network.mainnet]: {eid: EID, verified: true}},
    },
    SUMSUB: {
      kyc: {[Network.mainnet]: {path, provider: 'sumsub', status}},
      bannerAck: {[Network.mainnet]: ack ?? null},
    },
  });

const renderWithStore = (store: ReturnType<typeof buildStore>) =>
  render(
    <Provider store={store}>
      <KycBannerGate />
    </Provider>,
  );

describe('KycBannerGate', () => {
  afterEach(cleanup);

  beforeEach(() => mockNavigate.mockClear());

  it('does not congratulate a user approved in a previous session', () => {
    const {queryByText} = renderWithStore(
      buildStore({status: 'approved', ack: {eid: EID, state: 'success'}}),
    );
    expect(queryByText(CONGRATS)).toBeNull();
  });

  it('does not congratulate when there is no baseline to compare against', () => {
    const {queryByText} = renderWithStore(buildStore({status: 'approved'}));
    expect(queryByText(CONGRATS)).toBeNull();
  });

  it('never shows for a legacy / non-SumSub approval', () => {
    const {queryByText} = renderWithStore(
      buildStore({
        status: 'approved',
        path: 'legacy',
        ack: {eid: EID, state: 'notStarted'},
      }),
    );
    expect(queryByText(CONGRATS)).toBeNull();
  });

  it('congratulates on the transition and acknowledges it right away', () => {
    const store = buildStore({
      status: 'approved',
      ack: {eid: EID, state: 'notStarted'},
    });
    const {getByText} = renderWithStore(store);

    expect(getByText(CONGRATS)).toBeTruthy();
    // Acknowledged on render, so it will not come back on the next launch even
    // if the user never taps the X.
    expect(store.getState().SUMSUB.bannerAck[Network.mainnet]).toEqual({
      eid: EID,
      state: 'success',
    });
  });

  it('stays on screen after being acknowledged, until dismissed', () => {
    const store = buildStore({
      status: 'approved',
      ack: {eid: EID, state: 'notStarted'},
    });
    const {getByText, getByLabelText, queryByText} = renderWithStore(store);

    expect(getByText(CONGRATS)).toBeTruthy();

    fireEvent.press(getByLabelText('Dismiss KYC notification'));
    expect(queryByText(CONGRATS)).toBeNull();
  });

  it('offers the resume entry point while verification is in progress', () => {
    const {getByText, queryByLabelText} = renderWithStore(
      buildStore({status: 'inProgress', ack: {eid: EID, state: 'success'}}),
    );

    const banner = getByText(IN_PROGRESS);
    expect(banner).toBeTruthy();
    // Standing state: no dismiss affordance, and a stale ack must not hide it.
    expect(queryByLabelText('Dismiss KYC notification')).toBeNull();

    fireEvent.press(banner);
    expect(mockNavigate).toHaveBeenCalledWith(BitpayIdScreens.VERIFY_IDENTITY);
  });

  it('shows the non-dismissible banners regardless of any acknowledgement', () => {
    expect(
      renderWithStore(
        buildStore({
          status: 'pendingReview',
          ack: {eid: EID, state: 'success'},
        }),
      ).getByText(IN_REVIEW),
    ).toBeTruthy();

    cleanup();

    expect(
      renderWithStore(
        buildStore({
          status: 'requiresAction',
          ack: {eid: EID, state: 'denied'},
        }),
      ).getByText(ACTION_REQUIRED),
    ).toBeTruthy();
  });
});
