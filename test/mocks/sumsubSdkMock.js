/**
 * Jest mock for @sumsub/react-native-mobilesdk-module.
 */
const builder = {
  withHandlers: () => builder,
  withLocale: () => builder,
  withDebug: () => builder,
  withAutoCloseOnApprove: () => builder,
  withAnalyticsEnabled: () => builder,
  withApplicantConf: () => builder,
  build: () => ({
    launch: jest.fn().mockResolvedValue({
      success: true,
      status: 'Approved',
    }),
    dismiss: jest.fn(),
  }),
};

const SNSMobileSDK = {
  init: jest.fn(() => builder),
};

module.exports = SNSMobileSDK;
module.exports.default = SNSMobileSDK;
