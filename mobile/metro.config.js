const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Override source extensions to prioritize platform-specific files
config.resolver.sourceExts = ['tsx', 'ts', 'jsx', 'js', 'json'];

module.exports = config;
