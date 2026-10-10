// Learn more https://docs.expo.dev/guides/monorepos
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const packageRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// npm v7+ will install ../node_modules/react and ../node_modules/react-native
// because of peerDependencies (and this package's devDependencies).
// To prevent the incompatible react-native between ./node_modules/react-native
// and ../node_modules/react-native, exclude the ones from the parent folder
// when bundling.
config.resolver.blockList = [
  ...Array.from(config.resolver.blockList ?? []),
  new RegExp(`${path.resolve(packageRoot, 'node_modules', 'react')}\\b`),
  new RegExp(`${path.resolve(packageRoot, 'node_modules', 'react-native')}\\b`),
];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(packageRoot, 'node_modules'),
];

// Resolve the package name straight to this repository's root, so the example
// always runs against the local sources (including native files, which
// autolinking picks up through `nativeModulesDir: ".."` in package.json).
config.resolver.extraNodeModules = {
  'expo-speech-recognizer': packageRoot,
};

config.watchFolders = [packageRoot];

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;
