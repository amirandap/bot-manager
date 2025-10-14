# Testing the Twilio-Compatible Verify API

This directory contains comprehensive tests for our Twilio-compatible OTP verification system.

## 📁 Test Structure

```
backend/tests/
├── verify.test.ts          # Integration tests for API endpoints
├── otpService.test.ts      # Unit tests for OTP service logic
└── README.md              # This file
```

## 🧪 Test Categories

### Integration Tests (`verify.test.ts`)
Tests the complete API endpoints to ensure Twilio compatibility:

- ✅ **Endpoint Compatibility**: Exact same URLs, parameters, and responses as Twilio
- ✅ **Error Handling**: Twilio-compatible error codes and messages
- ✅ **Rate Limiting**: Protection against abuse
- ✅ **Internationalization**: Multi-language support
- ✅ **Performance**: Response time validation
- ✅ **Bot Integration**: Auto-selection and fallback handling

### Unit Tests (`otpService.test.ts`)
Tests the core OTP service logic in isolation:

- 🔢 **Code Generation**: Random 6-digit codes
- 📝 **SID Generation**: Twilio-compatible identifiers
- ⏰ **Expiration Logic**: 10-minute TTL handling
- 📱 **Phone Formatting**: International number support
- 💾 **Storage Management**: In-memory verification storage
- 🔓 **Validation Logic**: Code verification with attempt tracking
- 🌍 **Message Templates**: Multi-language templates
- 🧹 **Memory Management**: Cleanup of expired verifications

## 🚀 Running Tests

### Prerequisites

1. **Install Dependencies**:
   ```bash
   cd backend
   npm install
   
   # Install test dependencies
   npm install --save-dev jest @types/jest supertest @types/supertest ts-jest
   ```

2. **Configure Jest** (add to `package.json`):
   ```json
   {
     "scripts": {
       "test": "jest",
       "test:watch": "jest --watch",
       "test:coverage": "jest --coverage",
       "test:verify": "jest verify.test.ts",
       "test:otp": "jest otpService.test.ts"
     },
     "jest": {
       "preset": "ts-jest",
       "testEnvironment": "node",
       "roots": ["<rootDir>/src", "<rootDir>/tests"],
       "testMatch": ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"],
       "transform": {
         "^.+\\.ts$": "ts-jest"
       },
       "collectCoverageFrom": [
         "src/**/*.ts",
         "!src/**/*.d.ts",
         "!src/app.ts"
       ],
       "coverageDirectory": "coverage",
       "coverageReporters": ["text", "lcov", "html"]
     }
   }
   ```

### Test Commands

```bash
# Run all tests
npm test

# Run specific test files
npm run test:verify     # API endpoint tests
npm run test:otp        # OTP service tests

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests matching a pattern
npx jest --testNamePattern="should create verification"

# Run tests for specific file
npx jest verify.test.ts
```

## 📊 Test Scenarios

### 🟢 Success Cases
- Create verification with minimal parameters
- Create verification with all parameters
- Validate correct verification codes
- Handle form-urlencoded and JSON requests
- Support custom message templates
- Multi-language support (EN/ES)
- Retrieve verification details

### 🔴 Error Cases
- Missing required parameters
- Invalid phone number formats
- Invalid verification codes
- Expired verifications
- Too many attempts
- No available bots
- Non-existent verifications

### ⚡ Performance Tests
- Response time under 5 seconds
- Handle multiple concurrent requests
- Memory usage optimization
- Cleanup of expired data

### 🔒 Security Tests
- Rate limiting enforcement
- Attempt count tracking
- Code expiration handling
- Input validation
- Replay attack prevention

## 🎯 Test Coverage Goals

Target coverage: **90%+**

| Component | Target | Description |
|-----------|---------|-------------|
| Controllers | 95% | API endpoint logic |
| Services | 95% | Core business logic |
| Utilities | 90% | Helper functions |
| Types | 100% | Type definitions |

### Coverage Commands

```bash
# Generate coverage report
npm run test:coverage

# View coverage in browser
open coverage/lcov-report/index.html

# Check coverage thresholds
npx jest --coverage --coverageThreshold='{"global":{"branches":80,"functions":80,"lines":80,"statements":80}}'
```

## 🐛 Debugging Tests

### Common Issues

1. **Service Not Running**: Ensure backend is not running on test port
2. **Database State**: Tests use in-memory storage, no cleanup needed
3. **Bot Availability**: Tests mock bot responses or handle gracefully
4. **Async Operations**: Ensure proper async/await usage

### Debug Commands

```bash
# Run tests with verbose output
npx jest --verbose

# Run specific test with debugging
npx jest --testNamePattern="should create verification" --verbose

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand

# Run single test file
npx jest verify.test.ts --verbose
```

## 📝 Test Data

### Test Phone Numbers
- `+1234567890` - General testing
- `+18298870174` - WhatsApp verified number
- `+15551234567` - Rate limiting tests
- `+1111111111` - Error scenarios

### Test Service SIDs
- Format: `VA` + timestamp or random hex
- Example: `VA1728234567890`

### Test Verification Codes
- Length: 6 digits
- Range: `100000` - `999999`
- Generated randomly for each test

## 🔧 Mocking & Test Doubles

### Bot Service Mocking
```typescript
// Mock bot communication service
jest.mock('../src/services/BotCommunicationService', () => ({
  sendMessage: jest.fn().mockResolvedValue({ success: true }),
  getAvailableBots: jest.fn().mockReturnValue(['bot1', 'bot2'])
}));
```

### Time Mocking
```typescript
// Mock current time for expiration tests
jest.useFakeTimers();
jest.setSystemTime(new Date('2025-10-06T12:00:00Z'));
```

### Network Mocking
```typescript
// Mock external API calls
jest.mock('axios', () => ({
  post: jest.fn().mockResolvedValue({ data: { success: true } })
}));
```

## 📈 Continuous Integration

### GitHub Actions Example
```yaml
name: Test Verify API
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd backend && npm ci
      - run: cd backend && npm test
      - run: cd backend && npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          file: ./backend/coverage/lcov.info
```

### Quality Gates
- ✅ All tests must pass
- ✅ Coverage above 90%
- ✅ No TypeScript errors
- ✅ No linting errors
- ✅ Performance benchmarks met

## 🎨 Test Best Practices

### Writing Good Tests
1. **Descriptive Names**: Use clear test descriptions
2. **Single Responsibility**: One concept per test
3. **Arrange-Act-Assert**: Clear test structure
4. **Independent Tests**: No test dependencies
5. **Realistic Data**: Use production-like test data

### Example Test Structure
```typescript
describe('Feature Name', () => {
  describe('Success Cases', () => {
    test('should do something when condition is met', () => {
      // Arrange
      const input = { /* test data */ };
      
      // Act
      const result = functionUnderTest(input);
      
      // Assert
      expect(result).toEqual(expectedOutput);
    });
  });
  
  describe('Error Cases', () => {
    test('should throw error when invalid input provided', () => {
      // Arrange & Act & Assert
      expect(() => functionUnderTest(invalidInput))
        .toThrow('Expected error message');
    });
  });
});
```

## 🚨 Test Monitoring

### Metrics to Track
- Test execution time
- Coverage percentage
- Flaky test identification
- Test failure patterns

### Alerts
- Coverage drops below threshold
- Tests fail on main branch
- Performance regression detected
- Memory leaks in tests

---

**Ready to test?** Run `npm test` to get started! 🚀