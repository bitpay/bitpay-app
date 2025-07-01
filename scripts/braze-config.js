#!/usr/bin/env node
const fs = require('fs');
const dotenv = require('dotenv');

(() => {
  if (!['development', 'production'].includes(process.env.NODE_ENV)) {
    console.log('Please, set NODE_ENV ["development" | "production"]');
    return;
  }

  const envFile = `${__dirname}/../.env.${process.env.NODE_ENV}`;
  const result = dotenv.config({path: envFile});

  if (result.error) {
    throw result.error;
  }

  // Configure Braze for iOS
  if (process.env.BRAZE_API_KEY_IOS) {
    const brazeConfigFileIOS = `${__dirname}/../ios/BitPayApp/AppDelegate.swift`;
    let contentiOS = fs.readFileSync(brazeConfigFileIOS, 'utf8');
    contentiOS = contentiOS.replace(
      'BRAZE_API_KEY_REPLACE_ME',
      process.env.BRAZE_API_KEY_IOS,
    );
    fs.writeFileSync(brazeConfigFileIOS, contentiOS);
  }

  // Configure Braze for Android
  const brazeConfigFileAndroid = `${__dirname}/../android/app/src/main/res/values/braze.xml`;
  let contentAndroid = fs.readFileSync(brazeConfigFileAndroid, 'utf8');

  if (process.env.BRAZE_API_KEY_ANDROID) {
    contentAndroid = contentAndroid.replace(
      'BRAZE_API_KEY_REPLACE_ME',
      process.env.BRAZE_API_KEY_ANDROID,
    );
  }

  if (process.env.BRAZE_SENDER_ID) {
    contentAndroid = contentAndroid.replace(
      'BRAZE_SENDER_ID_REPLACE_ME',
      process.env.BRAZE_SENDER_ID,
    );
  }

  fs.writeFileSync(brazeConfigFileAndroid, contentAndroid);

  console.log(
    `${process.env.NODE_ENV.toUpperCase()} Braze config successfully updated.`,
  );
})();
