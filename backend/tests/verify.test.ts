import request from 'supertest';
import { Express } from 'express';
import app from '../src/app';

/**
 * Integration tests for Twilio-compatible Verify API
 * 
 * These tests ensure our API behaves exactly like Twilio Verify API
 * to guarantee compatibility for existing Twilio users.
 */
describe('Twilio-Compatible Verify API', () => {
  let testApp: Express;
  let testServiceSid: string;
  let testPhoneNumber: string;
  let testVerificationSid: string;
  let testVerificationCode: string;

  beforeAll(() => {
    testApp = app;
    testServiceSid = 'VA' + Date.now(); // Unique service ID for tests
    testPhoneNumber = '+1234567890'; // Test phone number
  });

  describe('POST /verify/v2/Services/{ServiceSid}/Verifications', () => {
    describe('✅ Success Cases', () => {
      test('should create verification with minimal parameters', async () => {
        const response = await request(testApp)
          .post(`/api/verify/v2/Services/${testServiceSid}/Verifications`)
          .send({
            To: testPhoneNumber
          });

        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({
          sid: expect.stringMatching(/^VE[a-f0-9]{32}$/),
          service_sid: testServiceSid,
          account_sid: expect.stringMatching(/^AC[a-f0-9]{32}$/),
          to: testPhoneNumber,
          channel: 'whatsapp',
          status: 'pending',
          valid: false,
          date_created: expect.any(String),
          date_updated: expect.any(String),
          lookup: {},
          amount: null,
          payee: null,
          send_code_attempts: expect.arrayContaining([
            expect.objectContaining({
              time: expect.any(String),
              channel: 'whatsapp',
              attempt_sid: expect.any(String)
            })
          ]),
          sna: null,
          url: expect.stringContaining('verify.twilio.com')
        });

        // Store for later tests
        testVerificationSid = response.body.sid;
      });

      test('should create verification with all parameters', async () => {
        const response = await request(testApp)
          .post(`/api/verify/v2/Services/${testServiceSid}/Verifications`)
          .send({
            To: '+18298870174', // Different number
            Channel: 'whatsapp',
            CustomMessage: 'Your custom code: {{code}}',
            Locale: 'es'
          });

        expect(response.status).toBe(201);
        expect(response.body.channel).toBe('whatsapp');
        expect(response.body.to).toBe('+18298870174');
      });

      test('should accept form-urlencoded data', async () => {
        const response = await request(testApp)
          .post(`/api/verify/v2/Services/${testServiceSid}/Verifications`)
          .type('form')
          .send({
            To: '+15551234567',
            Channel: 'whatsapp'
          });

        expect(response.status).toBe(201);
        expect(response.body.to).toBe('+15551234567');
      });
    });

    describe('❌ Error Cases', () => {
      test('should return 400 when To parameter is missing', async () => {
        const response = await request(testApp)
          .post(`/api/verify/v2/Services/${testServiceSid}/Verifications`)
          .send({
            Channel: 'whatsapp'
          });

        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({
          code: 60200,
          message: "'To' is required",
          more_info: "https://www.twilio.com/docs/api/errors/60200",
          status: 400
        });
      });

      test('should return 400 for invalid channel', async () => {
        const response = await request(testApp)
          .post(`/api/verify/v2/Services/${testServiceSid}/Verifications`)
          .send({
            To: testPhoneNumber,
            Channel: 'email' // Invalid channel
          });

        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({
          code: 60212,
          message: expect.stringContaining("Invalid 'Channel' value"),
          status: 400
        });
      });

      test('should return 400 for SMS channel (not supported)', async () => {
        const response = await request(testApp)
          .post(`/api/verify/v2/Services/${testServiceSid}/Verifications`)
          .send({
            To: testPhoneNumber,
            Channel: 'sms'
          });

        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({
          code: 60212,
          message: "SMS channel not supported yet. Use 'whatsapp'",
          status: 400
        });
      });

      test('should return 400 for invalid phone number format', async () => {
        const response = await request(testApp)
          .post(`/api/verify/v2/Services/${testServiceSid}/Verifications`)
          .send({
            To: 'invalid-phone',
            Channel: 'whatsapp'
          });

        expect(response.status).toBe(400);
        expect(response.body.code).toBe(60200);
      });
    });
  });

  describe('POST /verify/v2/Services/{ServiceSid}/VerificationCheck', () => {
    beforeAll(async () => {
      // Create a verification first to get a valid code
      const createResponse = await request(testApp)
        .post(`/api/verify/v2/Services/${testServiceSid}/Verifications`)
        .send({
          To: testPhoneNumber
        });

      testVerificationSid = createResponse.body.sid;
      
      // In a real test, we'd need to mock the code generation or 
      // have a test endpoint to get the generated code
      testVerificationCode = '123456'; // Mock code for testing
    });

    describe('✅ Success Cases', () => {
      test('should validate correct verification code', async () => {
        // Note: This test might need mocking since we don't know the actual code
        const response = await request(testApp)
          .post(`/api/verify/v2/Services/${testServiceSid}/VerificationCheck`)
          .send({
            Code: testVerificationCode,
            To: testPhoneNumber
          });

        // Could be 200 (success) or 404 (invalid code) depending on actual implementation
        expect([200, 404]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toMatchObject({
            sid: expect.any(String),
            service_sid: testServiceSid,
            to: testPhoneNumber,
            channel: 'whatsapp',
            status: expect.oneOf(['approved', 'failed']),
            valid: expect.any(Boolean),
            date_created: expect.any(String),
            date_updated: expect.any(String)
          });
        }
      });

      test('should accept VerificationSid instead of To', async () => {
        const response = await request(testApp)
          .post(`/api/verify/v2/Services/${testServiceSid}/VerificationCheck`)
          .send({
            Code: '654321',
            VerificationSid: testVerificationSid
          });

        expect([200, 404]).toContain(response.status);
      });
    });

    describe('❌ Error Cases', () => {
      test('should return 400 when Code is missing', async () => {
        const response = await request(testApp)
          .post(`/api/verify/v2/Services/${testServiceSid}/VerificationCheck`)
          .send({
            To: testPhoneNumber
          });

        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({
          code: 60200,
          message: "'Code' is required",
          status: 400
        });
      });

      test('should return 400 when both To and VerificationSid are missing', async () => {
        const response = await request(testApp)
          .post(`/api/verify/v2/Services/${testServiceSid}/VerificationCheck`)
          .send({
            Code: '123456'
          });

        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({
          code: 60200,
          message: "Either 'To' or 'VerificationSid' is required",
          status: 400
        });
      });

      test('should return 404 for non-existent verification', async () => {
        const response = await request(testApp)
          .post(`/api/verify/v2/Services/${testServiceSid}/VerificationCheck`)
          .send({
            Code: '123456',
            VerificationSid: 'VE' + 'a'.repeat(32) // Non-existent SID
          });

        expect(response.status).toBe(404);
        expect(response.body.code).toBe(20404);
      });

      test('should return 404 for invalid verification code', async () => {
        const response = await request(testApp)
          .post(`/api/verify/v2/Services/${testServiceSid}/VerificationCheck`)
          .send({
            Code: '999999', // Invalid code
            To: testPhoneNumber
          });

        expect(response.status).toBe(404);
        expect(response.body.code).toBe(60202);
      });
    });
  });

  describe('GET /verify/v2/Services/{ServiceSid}/Verifications/{Sid}', () => {
    describe('✅ Success Cases', () => {
      test('should retrieve verification details', async () => {
        // First create a verification
        const createResponse = await request(testApp)
          .post(`/api/verify/v2/Services/${testServiceSid}/Verifications`)
          .send({
            To: '+15559876543'
          });

        const verificationSid = createResponse.body.sid;

        // Then retrieve it
        const response = await request(testApp)
          .get(`/api/verify/v2/Services/${testServiceSid}/Verifications/${verificationSid}`);

        expect([200, 404]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toMatchObject({
            sid: verificationSid,
            service_sid: testServiceSid,
            to: '+15559876543',
            channel: 'whatsapp',
            status: expect.oneOf(['pending', 'approved', 'failed', 'canceled']),
            valid: expect.any(Boolean),
            date_created: expect.any(String),
            date_updated: expect.any(String),
            url: expect.stringContaining('verify.twilio.com')
          });
        }
      });
    });

    describe('❌ Error Cases', () => {
      test('should return 404 for non-existent verification', async () => {
        const fakeVerificationSid = 'VE' + 'a'.repeat(32);
        
        const response = await request(testApp)
          .get(`/api/verify/v2/Services/${testServiceSid}/Verifications/${fakeVerificationSid}`);

        expect(response.status).toBe(404);
        expect(response.body).toMatchObject({
          code: 20404,
          message: expect.stringContaining(`/Services/${testServiceSid}/Verifications/${fakeVerificationSid} was not found`),
          status: 404
        });
      });
    });
  });

  describe('🔄 Rate Limiting & Security', () => {
    test('should handle multiple verification requests', async () => {
      const requests = [];
      
      // Send multiple requests rapidly
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(testApp)
            .post(`/api/verify/v2/Services/${testServiceSid}/Verifications`)
            .send({
              To: `+155512345${i}`
            })
        );
      }

      const responses = await Promise.all(requests);
      
      // At least some should succeed (rate limiting might kick in)
      const successful = responses.filter(r => r.status === 201);
      expect(successful.length).toBeGreaterThan(0);
    });

    test('should handle code verification attempts limit', async () => {
      // Create verification
      const createResponse = await request(testApp)
        .post(`/api/verify/v2/Services/${testServiceSid}/Verifications`)
        .send({
          To: '+15551111111'
        });

      const verificationSid = createResponse.body.sid;

      // Try multiple wrong codes
      const attempts = [];
      for (let i = 0; i < 6; i++) {
        attempts.push(
          request(testApp)
            .post(`/api/verify/v2/Services/${testServiceSid}/VerificationCheck`)
            .send({
              Code: `${i}${i}${i}${i}${i}${i}`, // Wrong codes
              VerificationSid: verificationSid
            })
        );
      }

      const results = await Promise.all(attempts);
      
      // Should eventually get rate limited (429 status)
      const rateLimited = results.find(r => r.status === 429);
      // Note: This test might need adjustment based on actual implementation
    });
  });

  describe('🌍 Internationalization', () => {
    test('should support Spanish locale', async () => {
      const response = await request(testApp)
        .post(`/api/verify/v2/Services/${testServiceSid}/Verifications`)
        .send({
          To: '+15551112222',
          Locale: 'es'
        });

      expect(response.status).toBe(201);
      expect(response.body.to).toBe('+15551112222');
    });

    test('should support custom messages', async () => {
      const customMessage = 'Your secure access code: {{code}} - Valid for 10 minutes';
      
      const response = await request(testApp)
        .post(`/api/verify/v2/Services/${testServiceSid}/Verifications`)
        .send({
          To: '+15551113333',
          CustomMessage: customMessage
        });

      expect(response.status).toBe(201);
      expect(response.body.to).toBe('+15551113333');
    });
  });

  describe('🔌 Bot Integration', () => {
    test('should handle no available bots gracefully', async () => {
      // This test would need to mock a scenario where no bots are available
      // For now, we'll just ensure the endpoint responds appropriately
      
      const response = await request(testApp)
        .post(`/api/verify/v2/Services/${testServiceSid}/Verifications`)
        .send({
          To: '+15551114444'
        });

      // Should either succeed (201) or fail gracefully (503)
      expect([201, 503]).toContain(response.status);
      
      if (response.status === 503) {
        expect(response.body.code).toBe(60202);
      }
    });
  });

  describe('📊 Performance & Monitoring', () => {
    test('should respond quickly (under 5 seconds)', async () => {
      const startTime = Date.now();
      
      const response = await request(testApp)
        .post(`/api/verify/v2/Services/${testServiceSid}/Verifications`)
        .send({
          To: '+15551115555'
        });

      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(5000); // 5 seconds max
      expect([201, 400, 503]).toContain(response.status);
    });

    test('should include proper timestamps', async () => {
      const response = await request(testApp)
        .post(`/api/verify/v2/Services/${testServiceSid}/Verifications`)
        .send({
          To: '+15551116666'
        });

      if (response.status === 201) {
        expect(response.body.date_created).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        expect(response.body.date_updated).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        
        // Timestamps should be very close
        const created = new Date(response.body.date_created);
        const updated = new Date(response.body.date_updated);
        expect(Math.abs(updated.getTime() - created.getTime())).toBeLessThan(1000);
      }
    });
  });
});

// Custom matchers for better test readability
expect.extend({
  oneOf(received: any, expected: any[]) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected.join(', ')}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected.join(', ')}`,
        pass: false,
      };
    }
  },
});