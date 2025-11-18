/**
 * API Key Encryption Utilities
 * 
 * Provides AES-256-GCM encryption for AniList API keys
 * Uses Web Crypto API for secure encryption/decryption
 * 
 * Security Notes for Express.js:
 * - In production, use a key derivation function (PBKDF2) with user-specific salt
 * - Store encryption keys in a secure key management service (AWS KMS, HashiCorp Vault)
 * - Rotate encryption keys periodically
 * - Never log encrypted or decrypted API keys
 * - Use environment variables for encryption keys, never commit to git
 */

import CryptoJS from 'crypto-js';

/**
 * Get encryption key from environment variable
 * In production, this should be retrieved from a secure key management service
 */
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  // Ensure key is 32 bytes (256 bits) for AES-256
  if (key.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
  }
  return key.substring(0, 32);
}

/**
 * Encrypt an API key using AES-256
 * 
 * @param apiKey - The AniList API key to encrypt
 * @returns Encrypted key with IV prepended (format: iv:encryptedData)
 */
export function encryptApiKey(apiKey: string): string {
  try {
    const key = getEncryptionKey();
    // Generate a random IV for each encryption
    const iv = CryptoJS.lib.WordArray.random(128 / 8);
    
    // Encrypt using AES-256-CBC
    const encrypted = CryptoJS.AES.encrypt(apiKey, CryptoJS.enc.Utf8.parse(key), {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    
    // Combine IV and encrypted data
    const combined = iv.concat(encrypted.ciphertext);
    
    // Return as base64 string
    return CryptoJS.enc.Base64.stringify(combined);
  } catch (error) {
    console.error('Error encrypting API key:', error);
    throw new Error('Failed to encrypt API key');
  }
}

/**
 * Decrypt an API key
 * 
 * @param encryptedKey - The encrypted API key (format: iv:encryptedData as base64)
 * @returns Decrypted API key
 */
export function decryptApiKey(encryptedKey: string): string {
  try {
    const key = getEncryptionKey();
    
    // Parse the base64 string
    const combined = CryptoJS.enc.Base64.parse(encryptedKey);
    
    // Extract IV (first 16 bytes) and ciphertext (rest)
    const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4));
    const ciphertext = CryptoJS.lib.WordArray.create(combined.words.slice(4));
    
    // Decrypt
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ciphertext } as any,
      CryptoJS.enc.Utf8.parse(key),
      {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }
    );
    
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Error decrypting API key:', error);
    throw new Error('Failed to decrypt API key');
  }
}

/**
 * Hash an API key for comparison (one-way)
 * Used to verify API keys without storing the plaintext
 * 
 * @param apiKey - The API key to hash
 * @returns SHA-256 hash of the API key
 */
export function hashApiKey(apiKey: string): string {
  return CryptoJS.SHA256(apiKey).toString();
}

