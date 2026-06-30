const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 1. 確保 wasm 在資產副檔名中
config.resolver.assetExts.push('wasm');

// 2. 從源檔案副檔名中移除 wasm (如果你之前有加的話)
// 這是為了防止 Metro 嘗試將其解析為 JS
config.resolver.sourceExts = config.resolver.sourceExts.filter(ext => ext !== 'wasm');

module.exports = config;