#!/bin/bash
npx patch-package
rn-nodeify --yarn --install crypto,buffer,react-native-randombytes,stream,http,https,os,url,fs,path,events --hack &&
node ./scripts/mute-require-cycle-warnings.js
node ./scripts/multi-modal-patch.js
node ./scripts/git-commit-hash.js