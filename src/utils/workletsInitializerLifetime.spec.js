const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawnSync} = require('child_process');

const root = path.resolve(__dirname, '../..');
const header = fs.readFileSync(
  path.join(
    root,
    'node_modules/react-native-worklets/Common/cpp/worklets/SharedItems/Serializable.h',
  ),
  'utf8',
);
// Compile the installed class's actual inline constructor/destructor with small
// dependency doubles. This tests native C++ lifetime, not the mocked Worklets JS API.
// CXX may select another compiler; explicitly skip when no C++ toolchain exists.
const compiler = process.env.CXX || 'clang++';
const compilerAvailable =
  spawnSync(compiler, ['--version'], {timeout: 5000}).status === 0;
const nativeTest = compilerAvailable ? it : it.skip;

nativeTest(
  'constructs and releases an initializer without toJSValue',
  () => {
    const initializer = header.match(
      /^class SerializableInitializer\s*:[^{]+\{[\s\S]*?^};/m,
    )?.[0];
    expect(initializer).toBeDefined();
    const fixture = fs.readFileSync(
      path.join(root, 'test/native/worklets-initializer-lifetime.cpp'),
      'utf8',
    );
    const directory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'worklets-lifetime-'),
    );
    try {
      const source = path.join(directory, 'lifetime.cpp');
      const executable = path.join(directory, 'lifetime');
      fs.writeFileSync(
        source,
        fixture.replace(
          '// SERIALIZABLE_INITIALIZER_FROM_INSTALLED_HEADER',
          initializer,
        ),
      );
      const build = spawnSync(
        compiler,
        [
          '-std=c++17',
          '-O0',
          '-Wall',
          '-Wextra',
          '-Werror',
          source,
          '-o',
          executable,
        ],
        {encoding: 'utf8', timeout: 30000},
      );
      expect(build.error).toBeUndefined();
      expect(build.stderr).toBe('');
      expect(build.status).toBe(0);
      const run = spawnSync(executable, [], {encoding: 'utf8', timeout: 10000});
      expect(run.error).toBeUndefined();
      expect(run.stderr).toBe('');
      expect(run.status).toBe(0);
      expect(run.stdout).toContain('1000 unmaterialized initializer');
    } finally {
      fs.rmSync(directory, {recursive: true, force: true});
    }
  },
  45000,
);
