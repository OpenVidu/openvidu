import { Injectable } from '@angular/core';
import { createKeyMaterialFromString, deriveKeys } from 'livekit-client';
import { Subject, takeUntil } from 'rxjs';
import { OpenViduComponentsConfigService } from '../config/directive-config.service';

/**
 * Independent E2EE Service for encrypting and decrypting text-based content
 * (chat messages, participant names, metadata, etc.)
 *
 * This service uses LiveKit's key derivation utilities combined with Web Crypto API:
 * - Uses createKeyMaterialFromString from livekit-client for key material generation (PBKDF2)
 * - Uses deriveKeys from livekit-client for key derivation (HKDF)
 * - Uses Web Crypto API (AES-GCM) for actual encryption/decryption
 * - Generates random IV for each encryption operation
 * @internal
 */
@Injectable({
	providedIn: 'root',
})
export class E2eeService {
	private static readonly ENCRYPTION_ALGORITHM = 'AES-GCM';
	private static readonly IV_LENGTH = 12;
	private static readonly SALT = 'livekit-e2ee-data'; // Salt for HKDF key derivation

	private decryptionCache = new Map<string, string>();
	private destroy$ = new Subject<void>();
	private isE2EEEnabled = false;

	private encryptionKey: CryptoKey | undefined;

	constructor(protected configService: OpenViduComponentsConfigService) {
		// Monitor E2EE key changes
		this.configService.e2eeKey$.pipe(takeUntil(this.destroy$)).subscribe(async (key: any) => {
			await this.setE2EEKey(key);
		});
	}

	async setE2EEKey(key: string | null): Promise<void> {
		if (key) {
			this.isE2EEEnabled = true;
			this.decryptionCache.clear();

			await this.deriveEncryptionKey(key);
		} else {
			this.isE2EEEnabled = false;
			this.encryptionKey = undefined;
		}
	}

	/**
	 * Derives encryption key from passphrase using LiveKit's key derivation utilities
	 * @param passphrase The E2EE passphrase
	 * @private
	 */
	private async deriveEncryptionKey(passphrase: string): Promise<void> {
		try {
			// Use LiveKit's createKeyMaterialFromString (PBKDF2)
			const keyMaterial = await createKeyMaterialFromString(passphrase);

			// Use LiveKit's deriveKeys to get encryption key (HKDF)
			const derivedKeys = await deriveKeys(keyMaterial, E2eeService.SALT);

			// Store the encryption key for use in encrypt/decrypt operations
			this.encryptionKey = derivedKeys.encryptionKey;
		} catch (error) {
			console.error('Failed to derive encryption key:', error);
			this.encryptionKey = undefined;
		}
	}

	/**
	 * Checks if E2EE is currently enabled and encryption key is ready
	 */
	get isEnabled(): boolean {
		return this.isE2EEEnabled && !!this.encryptionKey;
	}

	/**
	 * Generates a random initialization vector for encryption
	 * @private
	 */
	private static generateIV(): Uint8Array {
		return crypto.getRandomValues(new Uint8Array(E2eeService.IV_LENGTH));
	}

	/**
	 * Encrypts text content using Web Crypto API with LiveKit-derived keys.
	 * Returns base64-encoded string suitable for metadata/names.
	 *
	 * @param text Plain text to encrypt
	 * @returns Encrypted text in base64 format, or original text if E2EE is disabled
	 */
	async encrypt(text: string): Promise<string>;

	/**
	 * Encrypts binary data using Web Crypto API with LiveKit-derived keys.
	 * Returns Uint8Array suitable for data channels.
	 *
	 * @param data Plain data to encrypt
	 * @returns Encrypted data as Uint8Array, or original data if E2EE is disabled
	 */
	async encrypt(data: Uint8Array): Promise<Uint8Array>;

	/**
	 * Implementation of encrypt overloads
	 */
	async encrypt(input: string | Uint8Array): Promise<string | Uint8Array> {
		if (!this.isEnabled) {
			return input;
		}

		const isString = typeof input === 'string';
		if (isString && !input) {
			return input;
		}

		if (!this.encryptionKey) {
			console.warn('E2EE encryption not available: CryptoKey not initialized. Returning unencrypted data.');
			return input;
		}

		try {
			// Convert string to Uint8Array if needed
			const data = isString ? new TextEncoder().encode(input as string) : (input as Uint8Array);

			// Generate a random IV for this encryption
			const iv = E2eeService.generateIV();

			// Encrypt the data using Web Crypto API with AES-GCM
			const encryptedBuffer = await crypto.subtle.encrypt(
				{
					name: E2eeService.ENCRYPTION_ALGORITHM,
					iv: iv as BufferSource
				},
				this.encryptionKey,
				data as BufferSource
			);

			const encryptedData = new Uint8Array(encryptedBuffer);

			// Combine IV + encrypted payload for transport
			// Format: [iv(12 bytes)][payload(variable)]
			const combined = new Uint8Array(iv.length + encryptedData.length);
			combined.set(iv, 0);
			combined.set(encryptedData, iv.length);

			// Return as base64 for strings, Uint8Array for binary data
			return isString ? btoa(String.fromCharCode(...combined)) : combined;
		} catch (error) {
			console.error('E2EE encryption failed:', error);
			// Return original input if encryption fails
			return input;
		}
	}

	/**
	 * Decrypts text content from base64 format using Web Crypto API.
	 * Suitable for decrypting participant names, metadata, etc.
	 *
	 * @param encryptedText Encrypted text in base64 format
	 * @param participantIdentity Identity of the participant who encrypted the content (optional, used for caching)
	 * @returns Decrypted plain text, or throws error if decryption fails
	 */
	async decrypt(encryptedText: string, participantIdentity?: string): Promise<string>;

	/**
	 * Decrypts binary data from Uint8Array using Web Crypto API.
	 * Suitable for decrypting data channel messages.
	 *
	 * If E2EE is not enabled, returns the original encryptedData.
	 *
	 * @param encryptedData Encrypted data as Uint8Array (format: [iv][payload])
	 * @param participantIdentity Identity of the participant who encrypted the content (optional)
	 * @returns Decrypted data as Uint8Array
	 */
	async decrypt(encryptedData: Uint8Array, participantIdentity?: string): Promise<Uint8Array>;

	/**
	 * Implementation of decrypt overloads
	 */
	async decrypt(input: string | Uint8Array, participantIdentity?: string): Promise<string | Uint8Array> {
		if (!this.isEnabled) {
			return input;
		}

		const isString = typeof input === 'string';
		if (isString && !input) {
			return input;
		}

		// Check cache for strings (caching binary data would be too memory intensive)
		if (isString) {
			const cacheKey = `${participantIdentity || 'unknown'}:${input}`;
			if (this.decryptionCache.has(cacheKey)) {
				return this.decryptionCache.get(cacheKey)!;
			}
		}

		if (!this.encryptionKey) {
			throw new Error('E2EE decryption not available: CryptoKey not initialized');
		}

		try {
			// Convert to Uint8Array if string (base64)
			const combined = isString ? Uint8Array.from(atob(input as string), (c) => c.charCodeAt(0)) : (input as Uint8Array);

			// Extract components: iv(12) + payload(variable)
			const iv = combined.slice(0, E2eeService.IV_LENGTH);
			const payload = combined.slice(E2eeService.IV_LENGTH);

			// Decrypt the data using Web Crypto API with AES-GCM
			const decryptedBuffer = await crypto.subtle.decrypt(
				{
					name: E2eeService.ENCRYPTION_ALGORITHM,
					iv: iv as BufferSource
				},
				this.encryptionKey,
				payload as BufferSource
			);

			const decryptedData = new Uint8Array(decryptedBuffer);

			// Return as string or Uint8Array depending on input type
			if (isString) {
				const decoder = new TextDecoder();
				const result = decoder.decode(decryptedData);

				// Cache successful string decryption
				const cacheKey = `${participantIdentity || 'unknown'}:${input}`;
				this.decryptionCache.set(cacheKey, result);

				// Limit cache size to prevent memory issues
				if (this.decryptionCache.size > 1000) {
					const firstKey = this.decryptionCache.keys().next().value;
					if (firstKey) {
						this.decryptionCache.delete(firstKey);
					}
				}

				return result;
			} else {
				return decryptedData;
			}
		} catch (error) {
			console.warn('E2EE decryption failed (wrong key or corrupted data):', error);
			throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Attempts to decrypt text content. If decryption fails or E2EE is not enabled,
	 * returns a masked string to indicate unavailable content.
	 *
	 * @param encryptedText Encrypted text in base64 format
	 * @param participantIdentity Identity of the participant (optional, used for caching)
	 * @param maskText Custom mask text to show on failure (default: '******')
	 * @returns Decrypted text or masked value if decryption fails
	 */
	async decryptOrMask(encryptedText: string, participantIdentity?: string, maskText?: string): Promise<string>;

	/**
	 * Attempts to decrypt binary data. If decryption fails or E2EE is not enabled,
	 * returns the maskText encoded as Uint8Array to indicate unavailable content.
	 *
	 * @param encryptedData Encrypted data as Uint8Array
	 * @param participantIdentity Identity of the participant (optional)
	 * @param maskText Custom mask text to show on failure (default: '******')
	 * @returns Decrypted data or encoded maskText as Uint8Array if decryption fails
	 */
	async decryptOrMask(encryptedData: Uint8Array, participantIdentity?: string, maskText?: string): Promise<Uint8Array>;

	/**
	 * Implementation of decryptOrMask overloads
	 */
	async decryptOrMask(
		input: string | Uint8Array,
		participantIdentity?: string,
		maskText: string = '******'
	): Promise<string | Uint8Array> {
		const isString = typeof input === 'string';

		// If E2EE is not enabled, return original input
		if (!this.isEnabled) {
			return input;
		}

		// If encryption key is not available, return masked value
		if (!this.encryptionKey) {
			return isString ? maskText : new TextEncoder().encode(maskText);
		}

		// If input is empty, return as-is
		if ((isString && !input) || (!isString && input.length === 0)) {
			return input;
		}

		try {
			// For strings, check if it's valid base64 before attempting decryption
			if (isString) {
				try {
					atob(input as string);
				} catch {
					// Not base64, likely not encrypted - return original
					return input;
				}
			}

			// Attempt decryption
			return await this.decrypt(input as any, participantIdentity);
		} catch (error) {
			// Decryption failed - return masked value
			if (isString) {
				console.warn('E2EE: Failed to decrypt content, returning masked value:', error);
				return maskText;
			} else {
				console.warn('E2EE: Failed to decrypt binary data, returning encoded mask text:', error);
				return new TextEncoder().encode(maskText);
			}
		}
	}

	/**
	 * Clears the decryption cache.
	 * Should be called when E2EE key changes or when leaving a room.
	 */
	clearCache(): void {
		this.decryptionCache.clear();
	}

	/**
	 * Cleanup on service destroy
	 */
	ngOnDestroy(): void {
		this.destroy$.next();
		this.destroy$.complete();
		this.clearCache();
	}
}
