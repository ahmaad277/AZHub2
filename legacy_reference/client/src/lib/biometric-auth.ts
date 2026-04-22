export interface BiometricCapability {
  available: boolean;
  platformAuthenticator: boolean;
}

export async function checkBiometricSupport(): Promise<BiometricCapability> {
  if (!window.PublicKeyCredential) {
    return {
      available: false,
      platformAuthenticator: false,
    };
  }

  try {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return {
      available: true,
      platformAuthenticator: available,
    };
  } catch (error) {
    console.error('Error checking biometric support:', error);
    return {
      available: false,
      platformAuthenticator: false,
    };
  }
}

export async function registerBiometric(userId: string): Promise<string | null> {
  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);
    
    const userIdBytes = new TextEncoder().encode(userId);

    const options: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: 'A.Z Finance Hub',
        id: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname,
      },
      user: {
        id: userIdBytes,
        name: 'user',
        displayName: 'Finance Hub User',
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },
        { alg: -257, type: 'public-key' },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        requireResidentKey: false,
      },
      timeout: 60000,
      attestation: 'none',
    };

    const credential = await navigator.credentials.create({
      publicKey: options,
    }) as PublicKeyCredential;

    if (!credential) {
      return null;
    }

    return bufferToBase64(credential.rawId);
  } catch (error) {
    console.error('Biometric registration failed:', error);
    return null;
  }
}

export async function authenticateWithBiometric(credentialId: string): Promise<boolean> {
  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const credentialIdBuffer = base64ToBuffer(credentialId);

    const options: PublicKeyCredentialRequestOptions = {
      challenge,
      rpId: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname,
      allowCredentials: [
        {
          id: credentialIdBuffer,
          type: 'public-key',
          transports: ['internal'],
        },
      ],
      userVerification: 'required',
      timeout: 60000,
    };

    const credential = await navigator.credentials.get({
      publicKey: options,
    });

    return credential !== null;
  } catch (error) {
    console.error('Biometric authentication failed:', error);
    return false;
  }
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
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

export async function hashPIN(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPIN(pin: string, hash: string): Promise<boolean> {
  const pinHash = await hashPIN(pin);
  return pinHash === hash;
}
