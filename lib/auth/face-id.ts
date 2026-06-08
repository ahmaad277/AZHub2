const CREDENTIAL_STORAGE_KEY = "azhub_face_id_credential_v1";
const PIN_STORAGE_KEY = "azhub_face_id_pin_sealed_v1";
const BIOMETRIC_LOGIN_PREFERRED_KEY = "azhub_biometric_login_preferred_v1";
const SEAL_SALT = "azhub-face-id-v1";

export interface FaceIdCapability {
  available: boolean;
  platformAuthenticator: boolean;
}

function getRpId() {
  if (typeof window === "undefined") return "localhost";
  return window.location.hostname === "localhost" ? "localhost" : window.location.hostname;
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function deriveKey(credentialId: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(credentialId),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(SEAL_SALT),
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function sealPin(pin: string, credentialId: string): Promise<string> {
  const key = await deriveKey(credentialId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(pin),
  );
  const payload = new Uint8Array(iv.byteLength + sealed.byteLength);
  payload.set(iv, 0);
  payload.set(new Uint8Array(sealed), iv.byteLength);
  return bufferToBase64(payload.buffer);
}

async function unsealPin(sealed: string, credentialId: string): Promise<string | null> {
  try {
    const key = await deriveKey(credentialId);
    const payload = new Uint8Array(base64ToBuffer(sealed));
    const iv = payload.slice(0, 12);
    const data = payload.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}

export function isFaceIdEnrolled(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    localStorage.getItem(CREDENTIAL_STORAGE_KEY) &&
      localStorage.getItem(PIN_STORAGE_KEY),
  );
}

export function clearFaceIdEnrollment(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CREDENTIAL_STORAGE_KEY);
  localStorage.removeItem(PIN_STORAGE_KEY);
  localStorage.removeItem(BIOMETRIC_LOGIN_PREFERRED_KEY);
}

export function isBiometricLoginPreferred(): boolean {
  if (typeof window === "undefined") return false;
  const value = localStorage.getItem(BIOMETRIC_LOGIN_PREFERRED_KEY);
  if (value === "0") return false;
  if (value === "1") return true;
  return isFaceIdEnrolled();
}

export function setBiometricLoginPreferred(preferred: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(BIOMETRIC_LOGIN_PREFERRED_KEY, preferred ? "1" : "0");
}

export async function checkFaceIdSupport(): Promise<FaceIdCapability> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) {
    return { available: false, platformAuthenticator: false };
  }

  try {
    const platformAuthenticator =
      await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return { available: true, platformAuthenticator };
  } catch {
    return { available: false, platformAuthenticator: false };
  }
}

export async function enrollFaceId(pin: string): Promise<boolean> {
  if (!/^\d{6}$/.test(pin)) return false;

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "A.Z Finance Hub", id: getRpId() },
        user: {
          id: userId,
          name: "owner",
          displayName: "A.Z Finance Hub Owner",
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },
          { alg: -257, type: "public-key" },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          requireResidentKey: false,
        },
        timeout: 60_000,
        attestation: "none",
      },
    })) as PublicKeyCredential | null;

    if (!credential) return false;

    const credentialId = bufferToBase64(credential.rawId);
    const sealedPin = await sealPin(pin, credentialId);
    localStorage.setItem(CREDENTIAL_STORAGE_KEY, credentialId);
    localStorage.setItem(PIN_STORAGE_KEY, sealedPin);
    setBiometricLoginPreferred(true);
    return true;
  } catch {
    return false;
  }
}

export async function unlockPinWithFaceId(): Promise<string | null> {
  const credentialId = localStorage.getItem(CREDENTIAL_STORAGE_KEY);
  const sealedPin = localStorage.getItem(PIN_STORAGE_KEY);
  if (!credentialId || !sealedPin) return null;

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: getRpId(),
        allowCredentials: [
          {
            id: base64ToBuffer(credentialId),
            type: "public-key",
            transports: ["internal"],
          },
        ],
        userVerification: "required",
        timeout: 60_000,
      },
    });

    if (!credential) return null;

    const pin = await unsealPin(sealedPin, credentialId);
    if (!pin || !/^\d{6}$/.test(pin)) {
      clearFaceIdEnrollment();
      return null;
    }
    return pin;
  } catch {
    return null;
  }
}
