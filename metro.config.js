const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Tell Metro about the local SDK so it can bundle it directly
// (Metro doesn't follow symlinks created by `file:` npm installs)
config.watchFolders = [
  path.resolve(__dirname, '../samvaad-sdk'),
];

config.resolver.extraNodeModules = {
  '@sociovate/samvaad': path.resolve(__dirname, '../samvaad-sdk'),
};

module.exports = config;
