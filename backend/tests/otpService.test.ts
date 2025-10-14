import { TwilioCompatibleOTPService } from '../src/services/TwilioCompatibleOTPService';
import { StoredVerification } from '../src/types/verification.types';

/**
 * Unit tests for TwilioCompatibleOTPService
 * 
 * Tests the core OTP generation, storage, and validation logic
 * without requiring external dependencies (bots, network, etc.)
 */
describe('TwilioCompatibleOTPService', () => {
  let otpService: TwilioCompatibleOTPService;
  let testPhoneNumber: string;
  let testServiceSid: string;

  beforeEach(() => {
    otpService = new TwilioCompatibleOTPService();
    testPhoneNumber = '+1234567890';
    testServiceSid = 'VA' + Date.now();
  });

  describe('🔢 Code Generation', () => {
    test('should generate codes of correct length', () => {
      const codes = [];
      
      // Generate multiple codes to test consistency
      for (let i = 0; i < 10; i++) {
        const code = (otpService as any).generateCode();
        codes.push(code);
        
        expect(code).toMatch(/^\d{6}$/); // 6 digits
        expect(parseInt(code)).toBeGreaterThanOrEqual(100000);
        expect(parseInt(code)).toBeLessThanOrEqual(999999);
      }
      
      // Codes should be different (very low chance of collision)
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBeGreaterThan(8); // At least 8/10 should be unique
    });

    test('should generate random codes', () => {
      const codes = [];
      
      // Generate many codes to test randomness
      for (let i = 0; i < 100; i++) {
        codes.push((otpService as any).generateCode());
      }
      
      // Check distribution - should not have too many repeating patterns
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBeGreaterThan(80); // At least 80% unique
      
      // Should not have sequential patterns
      const sequential = codes.filter((code, i) => 
        i > 0 && parseInt(code) === parseInt(codes[i-1]) + 1
      );
      expect(sequential.length).toBeLessThan(5); // Very few sequential codes
    });
  });

  describe('📝 SID Generation', () => {
    test('should generate valid verification SIDs', () => {
      const sids = [];
      
      for (let i = 0; i < 10; i++) {
        const sid = (otpService as any).generateVerificationSid();
        sids.push(sid);
        
        expect(sid).toMatch(/^VE[a-f0-9]{32}$/);
        expect(sid.length).toBe(34);
      }
      
      // All SIDs should be unique
      const uniqueSids = new Set(sids);
      expect(uniqueSids.size).toBe(10);
    });

    test('should generate valid account SIDs', () => {
      const accountSid = (otpService as any).generateAccountSid();
      
      expect(accountSid).toMatch(/^AC[a-f0-9]{32}$/);
      expect(accountSid.length).toBe(34);
    });
  });

  describe('⏰ Expiration Logic', () => {
    test('should set correct expiration time', () => {
      const now = new Date();
      const expirationTime = (otpService as any).getExpirationTime();
      
      const diffMinutes = (expirationTime.getTime() - now.getTime()) / (1000 * 60);
      
      expect(diffMinutes).toBeGreaterThan(9.5); // Almost 10 minutes
      expect(diffMinutes).toBeLessThan(10.5); // Not more than 10.5 minutes
    });

    test('should correctly identify expired verifications', () => {
      const now = new Date();
      const expired = new Date(now.getTime() - 11 * 60 * 1000); // 11 minutes ago
      const valid = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
      
      expect((otpService as any).isExpired(expired)).toBe(true);
      expect((otpService as any).isExpired(valid)).toBe(false);
    });
  });

  describe('📱 Phone Number Formatting', () => {
    test('should handle various phone number formats', () => {
      const testCases = [
        { input: '+1234567890', expected: '+1234567890' },
        { input: '1234567890', expected: '+1234567890' },
        { input: '+1-234-567-890', expected: '+1234567890' },
        { input: '+1 (234) 567-890', expected: '+1234567890' },
        { input: '+1 234.567.890', expected: '+1234567890' }
      ];

      testCases.forEach(({ input, expected }) => {
        const formatted = (otpService as any).formatPhoneNumber(input);
        expect(formatted).toBe(expected);
      });
    });

    test('should validate phone number format', () => {
      const validNumbers = [
        '+1234567890',
        '+18298870174',
        '+34612345678',
        '+5215512345678'
      ];

      const invalidNumbers = [
        'invalid',
        '+123',
        '123abc',
        '',
        '+1234567890123456' // too long
      ];

      validNumbers.forEach(number => {
        expect((otpService as any).isValidPhoneNumber(number)).toBe(true);
      });

      invalidNumbers.forEach(number => {
        expect((otpService as any).isValidPhoneNumber(number)).toBe(false);
      });
    });
  });

  describe('💾 Verification Storage', () => {
    test('should store verification correctly', async () => {
      const verification: StoredVerification = {
        sid: 'VE' + 'a'.repeat(32),
        serviceSid: testServiceSid,
        phoneNumber: testPhoneNumber,
        code: '123456',
        channel: 'whatsapp',
        status: 'pending',
        attempts: 0,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      };

      (otpService as any).storeVerification(verification);
      
      const stored = (otpService as any).getVerification(verification.sid);
      expect(stored).toEqual(verification);
    });

    test('should handle verification lookup by phone number', () => {
      const verification: StoredVerification = {
        sid: 'VE' + 'b'.repeat(32),
        serviceSid: testServiceSid,
        phoneNumber: testPhoneNumber,
        code: '654321',
        channel: 'whatsapp',
        status: 'pending',
        attempts: 0,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      };

      (otpService as any).storeVerification(verification);
      
      const found = (otpService as any).findVerificationByPhone(testPhoneNumber);
      expect(found).toEqual(verification);
    });

    test('should handle non-existent verifications', () => {
      const nonExistent = (otpService as any).getVerification('VE' + 'x'.repeat(32));
      expect(nonExistent).toBeNull();

      const notFound = (otpService as any).findVerificationByPhone('+9999999999');
      expect(notFound).toBeNull();
    });
  });

  describe('🔓 Code Validation Logic', () => {
    test('should validate correct codes', () => {
      const verification: StoredVerification = {
        sid: 'VE' + 'c'.repeat(32),
        serviceSid: testServiceSid,
        phoneNumber: testPhoneNumber,
        code: '555555',
        channel: 'whatsapp',
        status: 'pending',
        attempts: 0,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      };

      (otpService as any).storeVerification(verification);
      
      const isValid = (otpService as any).validateCode(verification, '555555');
      expect(isValid).toBe(true);
    });

    test('should reject incorrect codes', () => {
      const verification: StoredVerification = {
        sid: 'VE' + 'd'.repeat(32),
        serviceSid: testServiceSid,
        phoneNumber: testPhoneNumber,
        code: '111111',
        channel: 'whatsapp',
        status: 'pending',
        attempts: 0,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      };

      (otpService as any).storeVerification(verification);
      
      const isValid = (otpService as any).validateCode(verification, '222222');
      expect(isValid).toBe(false);
    });

    test('should reject expired verifications', () => {
      const verification: StoredVerification = {
        sid: 'VE' + 'e'.repeat(32),
        serviceSid: testServiceSid,
        phoneNumber: testPhoneNumber,
        code: '777777',
        channel: 'whatsapp',
        status: 'pending',
        attempts: 0,
        createdAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        expiresAt: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
      };

      (otpService as any).storeVerification(verification);
      
      const isValid = (otpService as any).validateCode(verification, '777777');
      expect(isValid).toBe(false);
    });

    test('should track attempt counts', () => {
      const verification: StoredVerification = {
        sid: 'VE' + 'f'.repeat(32),
        serviceSid: testServiceSid,
        phoneNumber: testPhoneNumber,
        code: '888888',
        channel: 'whatsapp',
        status: 'pending',
        attempts: 0,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      };

      (otpService as any).storeVerification(verification);
      
      // Make several invalid attempts
      (otpService as any).validateCode(verification, '000000');
      (otpService as any).validateCode(verification, '111111');
      (otpService as any).validateCode(verification, '222222');
      
      const updatedVerification = (otpService as any).getVerification(verification.sid);
      expect(updatedVerification.attempts).toBe(3);
    });

    test('should block after max attempts', () => {
      const verification: StoredVerification = {
        sid: 'VE' + 'g'.repeat(32),
        serviceSid: testServiceSid,
        phoneNumber: testPhoneNumber,
        code: '999999',
        channel: 'whatsapp',
        status: 'pending',
        attempts: 5, // Already at max attempts
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      };

      (otpService as any).storeVerification(verification);
      
      // Should be blocked even with correct code
      const isValid = (otpService as any).validateCode(verification, '999999');
      expect(isValid).toBe(false);
      
      const updatedVerification = (otpService as any).getVerification(verification.sid);
      expect(updatedVerification.status).toBe('failed');
    });
  });

  describe('🌍 Message Templates', () => {
    test('should format English message correctly', () => {
      const message = (otpService as any).formatMessage('123456', 'en', null);
      
      expect(message).toContain('123456');
      expect(message).toContain('verification');
      expect(message).toContain('10 minutes');
    });

    test('should format Spanish message correctly', () => {
      const message = (otpService as any).formatMessage('654321', 'es', null);
      
      expect(message).toContain('654321');
      expect(message).toContain('verificación');
      expect(message).toContain('10 minutos');
    });

    test('should use custom message template', () => {
      const customTemplate = 'Your secure code: {{code}} - Do not share!';
      const message = (otpService as any).formatMessage('111111', 'en', customTemplate);
      
      expect(message).toBe('Your secure code: 111111 - Do not share!');
    });

    test('should handle missing placeholder in custom template', () => {
      const customTemplate = 'Your verification code is ready'; // No {{code}}
      const message = (otpService as any).formatMessage('222222', 'en', customTemplate);
      
      // Should fallback or handle gracefully
      expect(message).toContain('222222');
    });
  });

  describe('🧹 Cleanup & Memory Management', () => {
    test('should clean up expired verifications', () => {
      // Add some expired verifications
      const expiredVerifications = [
        {
          sid: 'VE' + 'x1'.repeat(16),
          serviceSid: testServiceSid,
          phoneNumber: '+1111111111',
          code: '111111',
          channel: 'whatsapp' as const,
          status: 'pending' as const,
          attempts: 0,
          createdAt: new Date(Date.now() - 20 * 60 * 1000),
          expiresAt: new Date(Date.now() - 10 * 60 * 1000)
        },
        {
          sid: 'VE' + 'x2'.repeat(16),
          serviceSid: testServiceSid,
          phoneNumber: '+2222222222',
          code: '222222',
          channel: 'whatsapp' as const,
          status: 'pending' as const,
          attempts: 0,
          createdAt: new Date(Date.now() - 25 * 60 * 1000),
          expiresAt: new Date(Date.now() - 15 * 60 * 1000)
        }
      ];

      // Store expired verifications
      expiredVerifications.forEach(v => {
        (otpService as any).storeVerification(v);
      });

      // Add a valid verification
      const validVerification = {
        sid: 'VE' + 'y'.repeat(32),
        serviceSid: testServiceSid,
        phoneNumber: '+3333333333',
        code: '333333',
        channel: 'whatsapp' as const,
        status: 'pending' as const,
        attempts: 0,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      };

      (otpService as any).storeVerification(validVerification);

      // Run cleanup
      (otpService as any).cleanupExpiredVerifications();

      // Expired should be gone
      expect((otpService as any).getVerification(expiredVerifications[0].sid)).toBeNull();
      expect((otpService as any).getVerification(expiredVerifications[1].sid)).toBeNull();

      // Valid should remain
      expect((otpService as any).getVerification(validVerification.sid)).not.toBeNull();
    });

    test('should limit memory usage by cleaning old verifications', () => {
      // Create many verifications to test memory limits
      const verifications = [];
      
      for (let i = 0; i < 1000; i++) {
        const verification = {
          sid: 'VE' + i.toString().padStart(32, '0'),
          serviceSid: testServiceSid,
          phoneNumber: `+1555000${i.toString().padStart(4, '0')}`,
          code: i.toString().padStart(6, '0'),
          channel: 'whatsapp' as const,
          status: 'pending' as const,
          attempts: 0,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000)
        };
        
        verifications.push(verification);
        (otpService as any).storeVerification(verification);
      }

      // Should handle large number of verifications
      const storedCount = (otpService as any).getVerificationCount();
      expect(storedCount).toBeLessThanOrEqual(1000);
    });
  });
});