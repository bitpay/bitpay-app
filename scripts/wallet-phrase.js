const fs = require('fs');
const dotenv = require('dotenv');

(() => {
  if (!['development', 'production'].includes(process.env.NODE_ENV)) {
    console.log('Please set NODE_ENV ["development" | "production"]');
    return;
  }

  const envPath = `${__dirname}/../.env.${process.env.NODE_ENV}`;
  const result = dotenv.config({path: envPath});

  if (result.error) {
    throw result.error;
  }

  if (process.env.WALLET_PHRASE) {
    const files = [
      `${__dirname}/../android/app/src/androidTest/java/com/bitpay/wallet/TestConfig.kt`,
      `${__dirname}/../ios/BitPayAppUITests/TestConfig.swift`,
    ];

    files.forEach(file => {
      if (!fs.existsSync(file)) {
        console.log(`Skipped (not found): ${file}`);
        return;
      }
      const content = fs.readFileSync(file, 'utf-8');
      fs.writeFileSync(
        file,
        content.replace('WALLET_PHRASE_REPLACE_ME', process.env.WALLET_PHRASE),
      );
    });
  }

  console.log(`${process.env.NODE_ENV.toUpperCase()} Wallet phrase successfully updated.`);
})();