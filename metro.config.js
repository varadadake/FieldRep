const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Tell Metro about the local SDK so it can bundle it directly.
// Metro doesn't follow symlinks created by `file:` npm installs.
config.watchFolders = [
  path.resolve(__dirname, '../samvaad-sdk'),
];

// Map the SDK package AND its peer deps to the app's own node_modules.
// Without the react/react-native entries, `require('react')` inside the SDK
// fails because the SDK folder has no node_modules of its own.
config.resolver.extraNodeModules = {
  '@sociovate/samvaad': path.resolve(__dirname, '../samvaad-sdk'),
  'react': path.resolve(__dirname, 'node_modules/react'),
  'react-native': path.resolve(__dirname, 'node_modules/react-native'),
  'react-native-web': path.resolve(__dirname, 'node_modules/react-native-web'),
};

module.exports = config;
