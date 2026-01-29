import { KJUR } from "jsrsasign";

/**
 * Generate a JWT token for Zoom Video SDK testing
 * @param topic - Session topic/name
 * @param roleType - 1 for host, 0 for participant
 * @returns JWT token string
 */
export function generateTestToken(topic: string, roleType: number = 1): string {
  const sdkKey = process.env.VITE_ZOOM_SDK_KEY;
  const sdkSecret = process.env.VITE_ZOOM_SDK_SECRET;

  if (!sdkKey || !sdkSecret) {
    throw new Error(
      "Missing Zoom SDK credentials. Please set VITE_ZOOM_SDK_KEY and VITE_ZOOM_SDK_SECRET environment variables.",
    );
  }

  const iat = Math.round(new Date().getTime() / 1000) - 30;
  const exp = iat + 60 * 60 * 2; // 2 hours

  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    app_key: sdkKey,
    tpc: topic,
    role_type: roleType,
    version: 1,
    iat,
    exp,
  };

  const token = KJUR.jws.JWS.sign(
    "HS256",
    JSON.stringify(header),
    JSON.stringify(payload),
    sdkSecret,
  );

  return token;
}

/**
 * Generate a unique alphanumeric session topic for testing
 * Ensures each test uses an isolated session to avoid SDK waiting for rejoin
 * @param prefix - Optional prefix for the topic
 * @returns Unique alphanumeric topic string
 */
export function generateTestTopic(prefix: string = "test"): string {
  // Generate random alphanumeric string (uppercase, lowercase, numbers)
  const randomPart = Array.from({ length: 12 }, () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    return chars.charAt(Math.floor(Math.random() * chars.length));
  }).join("");

  // Add timestamp for uniqueness
  const timestamp = Date.now().toString(36);

  return `${prefix}${timestamp}${randomPart}`;
}
