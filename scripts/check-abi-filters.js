// scripts/check-abi-filters.js
const fs = require('fs');
const path = require('path');

const gradlePath = path.join(process.cwd(), 'android', 'app', 'build.gradle');
const gradleLines = fs.readFileSync(gradlePath, 'utf8').split('\n');

const propsPath = path.join(process.cwd(), 'android', 'gradle.properties');
const propsLines = fs.readFileSync(propsPath, 'utf8').split('\n');

const checks = [
  {
    file: 'android/app/build.gradle',
    description: 'reactNativeArchitectures() default return',
    lines: gradleLines,
    match: line =>
      line.includes('return value ? value.split') &&
      line.includes('armeabi-v7a'),
  },
  {
    file: 'android/app/build.gradle',
    description: 'ndk { abiFilters }',
    lines: gradleLines,
    match: line => line.includes('abiFilters') && line.includes('armeabi-v7a'),
  },
  {
    file: 'android/app/build.gradle',
    description: 'versionCodes map',
    lines: gradleLines,
    match: line =>
      line.includes('def versionCodes') && line.includes('armeabi-v7a'),
  },
  {
    file: 'android/gradle.properties',
    description: 'reactNativeArchitectures property',
    lines: propsLines,
    match: line =>
      line.replace(/\s/g, '').startsWith('reactNativeArchitectures=') &&
      line.includes('armeabi-v7a'),
  },
];

const failed = checks.filter(check => !check.lines.some(check.match));

if (failed.length > 0) {
  console.error('\narmeabi-v7a is missing in:');
  failed.forEach(c => console.error(`   - ${c.file} → ${c.description}`));
  console.error('\n   See PR #2078 for reference\n');
  process.exit(1);
}

console.log(`ABI filters check passed (${checks.length}/${checks.length})`);
