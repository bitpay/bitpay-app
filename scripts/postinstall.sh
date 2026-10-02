#!/bin/bash
set -euo pipefail

npx patch-package --error-on-fail
./node_modules/.bin/rn-nodeify --yarn --install buffer,react-native-randombytes,stream,http,https,os,url,fs,path,events --hack
node ./scripts/mute-require-cycle-warnings.js
node ./scripts/git-commit-hash.js
node ./scripts/generate-dkls-vendor.js
node ./scripts/check-abi-filters.js
