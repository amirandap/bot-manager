const { PM2MetricsClient } = require('./dist/services/PM2MetricsClient');

async function test() {
  console.log('🔍 Testing PM2MetricsClient...');
  
  const client = new PM2MetricsClient();
  
  try {
    console.log('Testing wabot-7201 (problematic bot)...');
    const metrics = await client.getProcessMetrics('wabot-7201');
    console.log('✅ wabot-7201 metrics:', JSON.stringify(metrics, null, 2));
  } catch (error) {
    console.log('❌ wabot-7201 error:', error.message);
  } finally {
    client.disconnect();
  }
}

test().catch(console.error);