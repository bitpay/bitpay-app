/*
 * React Native exposes TextDecoder but rejects the standard `fatal` option.
 * wasm-bindgen requests that option while loading Vultisig's MPC modules.
 * Preserve fatal decoding by detecting replacement characters after decoding.
 */
const installTextDecoderCompatibility = () => {
  const NativeTextDecoder = global.TextDecoder;
  if (!NativeTextDecoder) {
    return;
  }

  let supportsFatal = true;
  try {
    new NativeTextDecoder('utf-8', {fatal: true});
  } catch (_) {
    supportsFatal = false;
  }

  if (!supportsFatal) {
    global.TextDecoder = class TextDecoder {
      constructor(label = 'utf-8', options = {}) {
        const {fatal = false, ...supportedOptions} = options;
        this.fatal = fatal;
        try {
          this.decoder = new NativeTextDecoder(label, supportedOptions);
        } catch (_) {
          this.decoder = new NativeTextDecoder(label);
        }
      }

      get encoding() {
        return this.decoder.encoding || 'utf-8';
      }

      get ignoreBOM() {
        return this.decoder.ignoreBOM || false;
      }

      decode(input, options) {
        const decoded = this.decoder.decode(
          input == null ? new Uint8Array() : input,
          options,
        );
        if (this.fatal && decoded.includes('\uFFFD')) {
          throw new TypeError('The encoded data was not valid UTF-8');
        }
        return decoded;
      }
    };
  }
};

installTextDecoderCompatibility();

module.exports = {installTextDecoderCompatibility};
