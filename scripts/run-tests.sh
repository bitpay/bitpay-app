#!/bin/bash

OVERALL_EXIT=0
ALLURE_RESULTS_DIR="${ALLURE_RESULTS_DIR:-$PWD/.tmp/allure-results}"
mkdir -p "$ALLURE_RESULTS_DIR"

for TEST_CLASS in \
  "Test591OnboardingCreateWallet" \
  "Test592ImportWalletRecoveryPhrase" \
  "Test593SendBTC" \
  "Test594SwapBTC" \
  "Test595SellBTC" \
  "Test596BuyBTC"
do
  echo "=== Clearing state before $TEST_CLASS ==="
  adb shell pm clear com.bitpay.wallet || true
  sleep 2

  echo "=== Running $TEST_CLASS ==="
  cd android && ./gradlew connectedDebugAndroidTest \
    -PreactNativeArchitectures=x86_64 \
    -Pandroid.testInstrumentationRunnerArguments.class="com.bitpay.wallet.tests.$TEST_CLASS" \
    --no-daemon
  EXIT=$?
  cd ..

  [ $EXIT -ne 0 ] && OVERALL_EXIT=$EXIT

  # Pull allure results immediately after each test
  # so a timeout or crash on a later test doesn't lose earlier results
  echo "=== Pulling allure results after $TEST_CLASS ==="
  adb pull /sdcard/googletest/test_outputfiles/allure-results/. "$ALLURE_RESULTS_DIR/" || true
done

exit $OVERALL_EXIT