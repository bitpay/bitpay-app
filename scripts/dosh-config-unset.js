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
  const doshConfigFileIOS = `${__dirname}/../ios/Dosh.swift`;
  let contentiOS = fs.readFileSync(doshConfigFileIOS, 'utf8');
  contentiOS = contentiOS.replace(
    process.env.DOSH_APP_ID,
    'DOSH_APP_ID_REPLACE_ME',
  );
  fs.writeFileSync(doshConfigFileIOS, contentiOS);

  // ANDROID
  const doshConfigFileAndroid = `${__dirname}/../android/app/src/main/java/com/bitpay/wallet/DoshModule.java`;
  let contentAndroid = fs.readFileSync(doshConfigFileAndroid, 'utf8');
  contentAndroid = contentAndroid.replace(
    process.env.DOSH_APP_ID,
    'DOSH_APP_ID_REPLACE_ME',
  );
  fs.writeFileSync(doshConfigFileAndroid, contentAndroid);

  console.log(
    `${process.env.NODE_ENV.toUpperCase()} Dosh config successfully updated.`,
  );
})();
