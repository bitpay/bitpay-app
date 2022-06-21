#!/usr/bin/env node
const fs = require('fs');

(() => {
  if (process.env.NODE_ENV !== 'development') {
    console.log('DEV only - please set NODE_ENV to development');
    return;
  }

  const networkSecurityConfig = `${__dirname}/../android/app/src/main/res/xml/network_security_config.xml`;
  let content = fs.readFileSync(networkSecurityConfig, 'utf8');
  content = content.replaceAll(
    'cleartextTrafficPermitted="true"',
    'cleartextTrafficPermitted="false"',
  );
  fs.writeFileSync(networkSecurityConfig, content);

  console.log(`${process.env.NODE_ENV.toUpperCase()} dev overrides complete.`);
})();
