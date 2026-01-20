import { KJUR } from "jsrsasign";
// You should sign your JWT with a backend service in a production use-case
export function generateSignature(sessionName: string, role: number) {
  const sdkKey = import.meta.env.VITE_ZOOM_SDK_KEY;
  const sdkSecret = import.meta.env.VITE_ZOOM_SDK_SECRET;
  if (!sdkKey || !sdkSecret) {
    throw new Error("VITE_ZOOM_SDK_KEY or VITE_ZOOM_SDK_SECRET is not set");
  }
  const iat = Math.round(new Date().getTime() / 1000) - 30;
  const exp = iat + 60 * 60 * 2;
  const oHeader = { alg: "HS256", typ: "JWT" };

  const oPayload = {
    app_key: sdkKey,
    tpc: sessionName,
    role_type: role,
    version: 1,
    iat: iat,
    exp: exp,
  };

  const sHeader = JSON.stringify(oHeader);
  const sPayload = JSON.stringify(oPayload);
  const sdkJWT = KJUR.jws.JWS.sign("HS256", sHeader, sPayload, sdkSecret);
  return sdkJWT;
}
