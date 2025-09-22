const { pm2MetricsService } = require('./dist/services/PM2MetricsService');

async function test() {
  console.log('🔍 Testing PM2MetricsService...');
  
  try {
    console.log('Testing wabot-7201 (problematic bot)...');
    const metrics = await pm2MetricsService.getProcessMetrics('wabot-7201');
    console.log('✅ wabot-7201 metrics:', JSON.stringify(metrics, null, 2));
  } catch (error) {
    console.log('❌ wabot-7201 error:', error.message);
  }
}

test().catch(console.error);