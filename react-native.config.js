module.exports = {
  project: {
    ios: {},
    android: {}, // grouped into "project"
  },
  assets: ['./assets/fonts/'], // stays the same
  dependencies: {
    // The perf harness (perf/, src/perf) is Android-only, and
    // react-native-performance 6.0.0's iOS code no longer compiles against
    // React Native 0.87 (ReactMarker::StartupLogger dropped its *EndTime
    // getters). src/perf/PerfMonitor.ts only requires it in IS_PERF builds,
    // which are never made for iOS.
    // On Android it is linked only into perf builds (scripts/android-perf.sh
    // exports BP_PERF_BUILD=1 and clears the autolinking cache), so shipping
    // builds carry no harness instrumentation.
    'react-native-performance': {
      platforms:
        process.env.BP_PERF_BUILD === '1'
          ? {ios: null}
          : {ios: null, android: null},
    },
  },
};
