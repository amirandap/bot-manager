const { pm2MetricsService } = require("./dist/services/PM2MetricsService.js");

async function testMetrics() {
  try {
    console.log("Testing PM2 metrics for wabot-7998...");
    const metrics = await pm2MetricsService.getProcessMetrics("wabot-7998");

    if (metrics) {
      console.log("✅ Metrics found!");
      console.log("Status:", metrics.status);
      console.log("Memory:", metrics.memory);
      console.log("CPU:", metrics.cpu);
      console.log("PID:", metrics.pid);
      console.log("Uptime:", metrics.uptime);
    } else {
      console.log("❌ No metrics returned");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testMetrics();
