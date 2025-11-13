import { TestBed } from '@angular/core/testing';
import { E2eeService } from './e2ee.service';
import { OpenViduComponentsConfigService } from '../config/directive-config.service';
import { OpenViduComponentsConfigServiceMock } from '../../../test-helpers/mocks';
import * as livekit from 'livekit-client';

describe('E2eeService', () => {
  let service: E2eeService;
  let configMock: OpenViduComponentsConfigServiceMock;

  beforeEach(() => {
    configMock = new OpenViduComponentsConfigServiceMock();

    TestBed.configureTestingModule({
      providers: [
        E2eeService,
        { provide: OpenViduComponentsConfigService, useValue: configMock }
      ]
    });

    service = TestBed.inject(E2eeService);
  });

  it('should be created with E2EE disabled by default', () => {
    expect(service).toBeTruthy();
    expect(service.isEnabled).toBeFalse();
  });

  it('encrypt returns original string when E2EE disabled', async () => {
    const input = 'hello world';
    const out = await service.encrypt(input);
    expect(out).toBe(input);
  });

  it('setE2EEKey enables service when deriveEncryptionKey succeeds', async () => {
    // Spy the private deriveEncryptionKey to simulate successful key derivation
    spyOn<any>(service as any, 'deriveEncryptionKey').and.callFake(async (passphrase: string) => {
      // Simulate setting encryptionKey
      (service as any).encryptionKey = {} as CryptoKey;
    });

    // Call setE2EEKey with a value
    await service.setE2EEKey('my-secret');

    expect((service as any).isE2EEEnabled).toBeTrue();
    expect((service as any).encryptionKey).toBeDefined();
    expect(service.isEnabled).toBeTrue();
  });

  it('clearCache empties decryption cache and ngOnDestroy clears and completes', () => {
    // Populate cache
    (service as any).decryptionCache.set('a', 'b');
    expect((service as any).decryptionCache.size).toBeGreaterThan(0);

    service.clearCache();
    expect((service as any).decryptionCache.size).toBe(0);

    // Re-add and call ngOnDestroy
    (service as any).decryptionCache.set('x', 'y');
    service.ngOnDestroy();
    expect((service as any).decryptionCache.size).toBe(0);
  });

  it('setE2EEKey calls deriveEncryptionKey and applies result on success (via spy)', async () => {
    spyOn<any>(service as any, 'deriveEncryptionKey').and.callFake(async (passphrase: string) => {
      (service as any).encryptionKey = {} as CryptoKey;
    });

    await service.setE2EEKey('passphrase');

    expect((service as any).encryptionKey).toBeDefined();
    expect((service as any).isE2EEEnabled).toBeTrue();
    expect(service.isEnabled).toBeTrue();
  });

  it('setE2EEKey handles deriveEncryptionKey failure (via spy) and leaves encryptionKey undefined', async () => {
    // Simulate deriveEncryptionKey handling the error internally (doesn't throw) and leaving encryptionKey undefined
    spyOn<any>(service as any, 'deriveEncryptionKey').and.callFake(async () => {
      (service as any).encryptionKey = undefined;
    });

    await service.setE2EEKey('bad');

    expect((service as any).encryptionKey).toBeUndefined();
    expect((service as any).isE2EEEnabled).toBeTrue();
    expect(service.isEnabled).toBeFalse();
  });

  it('encrypt and decrypt support binary Uint8Array paths', async () => {
    (service as any).isE2EEEnabled = true;
    (service as any).encryptionKey = {} as CryptoKey;

    // Fake encrypt returns payload buffer
    const payload = new Uint8Array([10, 11, 12]).buffer;
    spyOn((window.crypto as any).subtle, 'encrypt').and.callFake(() => Promise.resolve(payload));
    spyOn((window.crypto as any), 'getRandomValues').and.callFake((arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) arr[i] = i + 2;
      return arr;
    });

    const input = new TextEncoder().encode('binary-data');
    const encrypted = await service.encrypt(input) as Uint8Array;
    expect(encrypted instanceof Uint8Array).toBeTrue();
    // encrypted should contain iv (12) + payload
    expect(encrypted.length).toBeGreaterThan(12);

    // Now fake decrypt to return original input buffer
    spyOn((window.crypto as any).subtle, 'decrypt').and.callFake(() => Promise.resolve(input.buffer));

    // Create combined iv + payload similar to encrypt output
    const iv = new Uint8Array(12);
    for (let i = 0; i < iv.length; i++) iv[i] = i + 2;
    const combined = new Uint8Array(iv.length + input.length);
    combined.set(iv, 0);
    combined.set(input, iv.length);

    const decrypted = await service.decrypt(combined) as Uint8Array;
    expect(decrypted instanceof Uint8Array).toBeTrue();
    expect(new TextDecoder().decode(decrypted)).toBe('binary-data');
  });

  it('decryptOrMask returns masked outputs when decryption fails for string and binary', async () => {
    // Force enabled and provide a key so decrypt will be attempted
    spyOnProperty(service, 'isEnabled', 'get').and.returnValue(true);
    (service as any).encryptionKey = {} as CryptoKey;

    // For string: provide base64 that will lead decrypt to throw
    const fakeBase64 = btoa('garbage');
    spyOn((window.crypto as any).subtle, 'decrypt').and.callFake(() => Promise.reject(new Error('fail')));

    const maskedStr = await service.decryptOrMask(fakeBase64, undefined, 'MASKED');
    expect(maskedStr).toBe('MASKED');

    // For binary: provide Uint8Array that will make decrypt fail
    const fakeBinary = new Uint8Array([1, 2, 3, 4]);
    const maskedBin = await service.decryptOrMask(fakeBinary, undefined, 'BLANK') as Uint8Array;
    expect(new TextDecoder().decode(maskedBin)).toBe('BLANK');
  });

  it('encrypt and decrypt flow when enabled uses Web Crypto and caches decrypted strings', async () => {
    // Enable E2EE and set a dummy encryptionKey
    (service as any).isE2EEEnabled = true;
    (service as any).encryptionKey = {} as CryptoKey;

    // Stub crypto.subtle.encrypt to return a small payload buffer
    const fakeEncryptedPayload = new Uint8Array([9, 8, 7]).buffer;
    spyOn((window.crypto as any).subtle, 'encrypt').and.callFake(() => Promise.resolve(fakeEncryptedPayload));

    // Stub getRandomValues to return predictable IV (12 bytes)
    spyOn((window.crypto as any), 'getRandomValues').and.callFake((arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) arr[i] = i + 1; // 1..12
      return arr;
    });

    // Encrypt a string -> should return base64 string
    const plain = 'hello-e2ee';
    const encrypted = await service.encrypt(plain) as string;
    expect(typeof encrypted).toBe('string');
    expect(encrypted.length).toBeGreaterThan(0);

    // Now stub crypto.subtle.decrypt to return decrypted buffer matching original plain
    spyOn((window.crypto as any).subtle, 'decrypt').and.callFake(() => Promise.resolve(new TextEncoder().encode(plain).buffer));

    // Call decrypt with the base64 returned by encrypt
    const decrypted = await service.decrypt(encrypted, 'participant1') as string;
    expect(decrypted).toBe(plain);

    // Call decrypt again with same input -> should hit cache and not call crypto.subtle.decrypt again
    const decryptSpy = (window.crypto as any).subtle.decrypt as jasmine.Spy;
    decryptSpy.calls.reset();
    const decrypted2 = await service.decrypt(encrypted, 'participant1') as string;
    expect(decrypted2).toBe(plain);
    expect(decryptSpy).not.toHaveBeenCalled();
  });

  it('decrypt throws when encryptionKey is not initialized but isEnabled forced true', async () => {
    (service as any).isE2EEEnabled = true;
    (service as any).encryptionKey = undefined;

    // Force the isEnabled getter to return true so we hit the encryptionKey missing branch
    spyOnProperty(service, 'isEnabled', 'get').and.returnValue(true);

    await expectAsync(service.decrypt(new Uint8Array([1, 2, 3]))).toBeRejectedWithError(/E2EE decryption not available/);
  });

  it('decryptOrMask returns masked value when key missing and returns input when not base64', async () => {
    // Case: E2EE disabled -> returns input
    (service as any).isE2EEEnabled = false;
    const txt = 'not-encrypted';
    expect(await service.decryptOrMask(txt)).toBe(txt);

  // Case: E2EE enabled but encryptionKey missing -> since isEnabled is false, decryptOrMask returns original input
  (service as any).isE2EEEnabled = true;
  (service as any).encryptionKey = undefined;
  const maskedWhenNotEnabled = await service.decryptOrMask(txt, undefined, 'MASK');
  expect(maskedWhenNotEnabled).toBe(txt);

  // If we force isEnabled to true but encryptionKey missing, decryptOrMask should return the mask
  spyOnProperty(service, 'isEnabled', 'get').and.returnValue(true);
  (service as any).encryptionKey = undefined;
  const masked = await service.decryptOrMask(txt, undefined, 'MASK');
  expect(masked).toBe('MASK');

  // Case: input not base64 -> when enabled and key present, should return input unchanged
  (service as any).encryptionKey = {} as CryptoKey;
  // restore isEnabled behavior to rely on actual getter
  (service as any).isE2EEEnabled = true;
  const notBase64 = 'this is not base64!';
  expect(await service.decryptOrMask(notBase64)).toBe(notBase64);
  });
});
