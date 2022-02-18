#!/bin/bash
mkdir -p android/app/src/main/assets &&
react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res &&
cd android &&
rm -rf ./android/app/src/main/res/drawable-* &&
rm -rf ./android/app/src/main/res/raw &&
./gradlew assembleRelease
