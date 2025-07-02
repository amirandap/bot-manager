/* eslint-disable no-console */
/**
 * Test cases for phone number formatting
 * Run this to verify all phone number formats work correctly
 */

import { cleanAndFormatPhoneNumber } from '../helpers/cleanAndFormatPhoneNumber';

const testCases = [
  // Dominican Republic numbers - the problem cases
  { input: '18295600987', expected: '+18295600987' },
  { input: '18093186486', expected: '+18093186486' },
  { input: '+18296459554', expected: '+18296459554' },
  { input: '8296459554', expected: '+18296459554' },
  
  // Other Dominican formats
  { input: '8095551234', expected: '+18095551234' },
  { input: '8295551234', expected: '+18295551234' },
  { input: '8495551234', expected: '+18495551234' },
  { input: '18095551234', expected: '+18095551234' },
  { input: '18295551234', expected: '+18295551234' },
  { input: '18495551234', expected: '+18495551234' },
  { input: '+18095551234', expected: '+18095551234' },
  { input: '+18295551234', expected: '+18295551234' },
  { input: '+18495551234', expected: '+18495551234' },
  
  // International numbers
  { input: '14155551234', expected: '+14155551234' },
  { input: '+14155551234', expected: '+14155551234' },
  { input: '447700900123', expected: '+447700900123' },
  { input: '+447700900123', expected: '+447700900123' },
  
  // Argentina special case
  { input: '+5411551234', expected: '+5491551234' },
  
  // Invalid cases (should use fallback)
  { input: '123', expected: 'FALLBACK' },
  { input: 'abc', expected: 'FALLBACK' },
  { input: '', expected: 'FALLBACK' },
];

console.log('🧪 Testing phone number formatting...\n');

let passed = 0;
let failed = 0;

testCases.forEach(({ input, expected }, index) => {
  console.log(`\n--- Test ${index + 1} ---`);
  console.log(`Input: "${input}"`);
  
  const result = cleanAndFormatPhoneNumber(input);
  
  const expectedResult = expected === 'FALLBACK' ? 'FALLBACK' : expected;
  const actualResult = result.isValid ? result.cleanedPhoneNumber : 'FALLBACK';
  
  console.log(`Expected: ${expectedResult}`);
  console.log(`Actual: ${actualResult}`);
  
  if (actualResult === expectedResult) {
    console.log('✅ PASS');
    passed++;
  } else {
    console.log('❌ FAIL');
    failed++;
  }
});

console.log(`\n📊 Test Summary:`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

if (failed === 0) {
  console.log('\n🎉 All tests passed! Phone number formatting is working correctly.');
} else {
  console.log('\n⚠️  Some tests failed. Please review the phone number formatting logic.');
}
