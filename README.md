# BitPay App v2
Welcome to BitPay App v2!

## Get Started
Install dependencies with `yarn` >= 14.15.0

### IOS

1. Install Pods `cd ios && pod install && cd ..`
2. `yarn start` to start dev server
3. Build and deploy to simulator `yarn ios` or device `yarn ios:device`

### Android
1. Install a JDK:

    1.1 Install JDK 1.8.0_x (1.7 =  Java 7, 1.8 = Java 8, etc.) where x is the latest update number (currently 1.8.0_333). You can try a newer JDK but some dependencies might not compile properly.

    1.2 Add a `JAVA_HOME` environment variable to your `~/.profile` or `~/bash_profile` set to your JDK folder. *eg.* `JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk1.8_0_333.jdk/Contents/Home`

2. Google TapAndPay setup: 

    2.1 Google only makes this repository available if you have a TapAndPay dev account, we have one as a team so ask a team member to send you an ENCRYPTED email with a copy of the TapAndPay repository. 

    2.2 Create a `.m2/` directory somewhere (I put mine in the parent dir of the app root dir so I don't accidentally check it in) then copy the repository  folder you received into the `.m2` folder so the path looks like `../.m2/repository/`.

    2.3 From your home directory, open or create `~/.gradle/gradle.properties` and add `M2_REPOSITORY_URL=../../../.m2/repository` (or wherever you put yours, the path should be relative to `[app root]/android/app/build.gradle`). 

3. `yarn start` to start dev server
4. Build and deploy to simulator or device `yarn android`

#### Accessing your local server
To make requests to your local server, first take your local BitPay server cert and copy it into `android/app/src/main/res/raw` folder in either .pem or .der format.
- To convert .crt to .der, run: `openssl x509 -in your_cert_name.crt -out your_cert_name.der -outform DER`

Then open `android/app/src/main/res/xml/network_security_config.xml` and add your local IP to the domain-config and your cert to the trust-anchors (without the file extension).

For example if your local IP is `123.0.0.7` and your cert is in `res/raw/lbitpay.der`: 

    <domain-config>
      ...
      <domain includeSubdomains="true">123.0.0.7</domain>
      <trust-anchors>
        <certificates src="@raw/lbitpay" />
      </trust-anchors>
    </domain-config>
    

### Redux Dev Tools
This project uses `react-redux` https://react-redux.js.org/ for state management. To take advantage of the tooling available, go to https://github.com/jhen0409/react-native-debugger and install the debugger.

1. To enable - make sure debugger is open - tap `D` in the hosting terminal window or shake the device 
2. A menu will popup - tap `Debug with Chrome`(IOS) or `Debug`(Android)
3. The logs should move from the terminal to the debugger

### Storybook
1. In `src/contants/config.ts` change `APP_LOAD_STORY_BOOK=false` to `APP_LOAD_STORY_BOOK=true`
2. Run `yarn <platform>` ex: `yarn ios`. Since we set `APP_LOAD_STORY_BOOK=true`, this runs Storybook instead of your actual app.

## Integrations
To test integrations such as Braze, Dosh, etc. you will need to get API keys from another team member. Then create `.env.production` and `.env.development` in the app root by copying the `.env.template` contents and populating the values appropriately.

To switch to using dev or prod keys, run `yarn set:dev` or `yarn set:prod` respectively which will run replace scripts to populate these values into the appropriate build files, or run `yarn reset:dev` or `yarn reset:prod` to reset values.

## Deeplinking
Test deeplinking via command line with these commands (note: ampersand must be escaped for multiple params): 

#### iOS
`npx uri-scheme open "bitpay://your/deeplink/path?params1=foo1\&param2=foo2" --ios`

#### Android
`npx uri-scheme open "bitpay://your/deeplink/path?param1=foo1\&param2=foo2" --android`

### Modifying the intent prefix
If you want to associate the app with a different intent prefix eg. `myapp://`:

1. Open `src/constants/config.ts`
2. Modify `APP_DEEPLINK_PREFIX` to your desired prefix eg. `myapp://` (with colon and slashes)
3. Update the OS specific configs:
  #### iOS
    1. Open `ios/BitPayApp/info.plist`
    2. Find `CFBundleURLSchemes` and modify the value to your desired prefix (without colon and slashes) eg. `myapp`
  #### Android
    1. Open `android/app/src/main/AndroidManifest.xml`
    2. Locate `<intent-filter><data android:scheme="...">` and modify the value to your desired prefix (without colon and slashes) eg. `myapp`
