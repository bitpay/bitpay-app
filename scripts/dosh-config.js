const fs = require('fs');

if (['development', 'production'].includes(process.env.NODE_ENV)) {
  const envFile = `${__dirname}/../.env.${process.env.NODE_ENV}`;
  const result = require('dotenv').config({path: envFile});
  if (result.error) {
    throw result.error;
  }
} else {
  console.log('Please, set NODE_ENV ["development" | "production"]');
  return;
}

// IOS
const doshConfigFileIOS = `${__dirname}/../ios/Dosh.swift`;
let contentiOS = fs.readFileSync(doshConfigFileIOS, 'utf8');
contentiOS = contentiOS.replace(
  'DOSH_APP_ID_REPLACE_ME',
  process.env.DOSH_APP_ID,
);
fs.writeFileSync(doshConfigFileIOS, contentiOS);

// ANDROID
const doshConfigFileAndroid = `${__dirname}/../android/app/src/main/java/com/bitpay/wallet/DoshModule.java`;
let contentAndroid = fs.readFileSync(doshConfigFileAndroid, 'utf8');
contentAndroid = contentAndroid.replace(
  'DOSH_APP_ID_REPLACE_ME',
  process.env.DOSH_APP_ID,
);
fs.writeFileSync(doshConfigFileAndroid, contentAndroid);

console.log(
  `${process.env.NODE_ENV.toUpperCase()} Dosh config successfully updated.`,
);
