import {deflate, inflate} from 'pako';

const files = new Map();
const toBytes = value =>
  value instanceof Uint8Array ? new Uint8Array(value) : new Uint8Array(value);

const FS = {
  writeFile: (name, value) => files.set(name, toBytes(value)),
  readFile: name => {
    const value = files.get(name);
    if (!value) throw new Error(`Compression file not found: ${name}`);
    return new Uint8Array(value);
  },
  unlink: name => {
    if (!files.delete(name)) {
      throw new Error(`Compression file not found: ${name}`);
    }
  },
};

const callMain = args => {
  const [command, archiveName, inputName] = args;
  if (command === 'a') {
    files.set(archiveName, deflate(FS.readFile(inputName)));
    return 0;
  }
  if (command === 'e') {
    files.set('data.bin', inflate(FS.readFile(archiveName)));
    return 0;
  }
  throw new Error(`Unsupported compression command: ${command}`);
};

export default async () => ({FS, callMain});
