const { expo } = require("./app.json");

const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

module.exports = {
  ...expo,
  android: {
    ...expo.android,
    config: googleMapsApiKey
      ? {
          ...(expo.android.config ?? {}),
          googleMaps: {
            apiKey: googleMapsApiKey,
          },
        }
      : expo.android.config,
  },
};
