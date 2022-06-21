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

  // IOS
  if (process.env.DOSH_APP_ID) {
    const doshConfigFileIOS = `${__dirname}/../ios/Dosh.swift`;
    let contentiOS = fs.readFileSync(doshConfigFileIOS, 'utf8');
    contentiOS = contentiOS.replace(
      'DOSH_APP_ID_REPLACE_ME',
      process.env.DOSH_APP_ID,
    );
    fs.writeFileSync(doshConfigFileIOS, contentiOS);
  }

  // ANDROID
  if (process.env.DOSH_APP_ID) {
    const doshConfigFileAndroid = `${__dirname}/../android/app/src/main/java/com/bitpay/wallet/DoshModule.java`;
    let contentAndroid = fs.readFileSync(doshConfigFileAndroid, 'utf8');
    contentAndroid = contentAndroid.replace(
      'DOSH_APP_ID_REPLACE_ME',
      process.env.DOSH_APP_ID,
    );
    fs.writeFileSync(doshConfigFileAndroid, contentAndroid);
  }

  console.log(
    `${process.env.NODE_ENV.toUpperCase()} Dosh config successfully updated.`,
  );
})();
