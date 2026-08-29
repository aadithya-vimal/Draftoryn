const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Clerk (and several modern packages) rely on the "exports" field with
// conditional subpaths such as "@clerk/react/internal". Expo's Metro resolver
// ignores the "exports" map by default, which makes those subpaths unresolvable.
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = [
  "require",
  "browser",
  "react-native",
  "default",
];

module.exports = config;
