// Set your key here or via EXPO_PUBLIC_GEMINI_API_KEY (e.g. in .env or EAS env).
const envKey = typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_GEMINI_API_KEY : undefined;
export const GEMINI_API_KEY: string = typeof envKey === 'string' ? envKey : '';
