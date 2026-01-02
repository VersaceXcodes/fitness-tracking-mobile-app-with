/**
 * Expo Dynamic Configuration
 *
 * This file extends app.json and exposes environment variables to the Expo runtime.
 * Without this, EXPO_PUBLIC_* variables from .env files are NOT accessible
 * via Constants.expoConfig.extra in native iOS/Android builds.
 *
 * How it works:
 * 1. Reads EXPO_PUBLIC_* variables from process.env at BUILD time
 * 2. Injects them into the `extra` field
 * 3. Makes them accessible via Constants.expoConfig.extra at runtime
 */

export default ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    // LaunchPulse Payment Integration (auto-injected by LaunchPulse platform)
    EXPO_PUBLIC_LAUNCHPULSE_API_KEY: process.env.EXPO_PUBLIC_LAUNCHPULSE_API_KEY,
    EXPO_PUBLIC_LAUNCHPULSE_PROJECT_ID: process.env.EXPO_PUBLIC_LAUNCHPULSE_PROJECT_ID,
    EXPO_PUBLIC_LAUNCHPULSE_API_URL: process.env.EXPO_PUBLIC_LAUNCHPULSE_API_URL || 'https://launchpulse.ai',
    // LaunchPulse AI Integration (auto-injected by LaunchPulse platform)
    EXPO_PUBLIC_LAUNCHPULSE_AI_KEY: process.env.EXPO_PUBLIC_LAUNCHPULSE_AI_KEY,
    // API URLs (can be overridden by environment)
    apiUrl: process.env.EXPO_PUBLIC_API_URL || config.extra?.apiUrl,
    frontendUrl: process.env.EXPO_PUBLIC_FRONTEND_URL || config.extra?.frontendUrl,
    backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL || config.extra?.backendUrl,
  },
});
