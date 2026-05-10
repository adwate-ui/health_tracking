// Simple string encryption using Web Crypto API
// In a real app, the key should be derived securely and stored in an env var.

const ALGORITHM = 'AES-GCM';

async function getKey(): Promise<CryptoKey> {
  const keyMaterial = import.meta.env.VITE_ENCRYPTION_KEY || 'default_insecure_key_for_dev_123';
  const encoder = new TextEncoder();
  
  // Hash the string to get a 256-bit key
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(keyMaterial));
  
  return crypto.subtle.importKey(
    'raw',
    hash,
    ALGORITHM,
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encrypt(text: string): Promise<string> {
  const key = await getKey();
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encryptedContent = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoder.encode(text)
  );

  // Combine IV and encrypted content
  const combined = new Uint8Array(iv.length + encryptedContent.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encryptedContent), iv.length);
  
  // Convert to base64
  return btoa(String.fromCharCode.apply(null, Array.from(combined)));
}

export async function decrypt(encryptedBase64: string): Promise<string> {
  try {
    const key = await getKey();
    
    // Decode base64
    const combinedStr = atob(encryptedBase64);
    const combined = new Uint8Array(combinedStr.length);
    for (let i = 0; i < combinedStr.length; i++) {
      combined[i] = combinedStr.charCodeAt(i);
    }
    
    // Extract IV and content
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    
    const decryptedContent = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      data
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decryptedContent);
  } catch (e) {
    console.error('Failed to decrypt data', e);
    return '';
  }
}
