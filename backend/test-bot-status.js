const { BotService } = require("./dist/services/botService.js");

async function testBotStatusViaMetrics() {
  try {
    console.log(
      "Testing getBotStatusViaMetrics for whatsapp-bot-1749932948009..."
    );
    const botService = new BotService();
    const status = await botService.getBotStatusViaMetrics(
      "whatsapp-bot-1749932948009"
    );

    if (status) {
      console.log("✅ Status found!");
      console.log("ID:", status.id);
      console.log("Status:", status.status);
      console.log("Has PM2 data:", !!status.pm2);
      if (status.pm2) {
        console.log("PM2 Status:", status.pm2.status);
        console.log("PM2 PID:", status.pm2.pid);
      }
    } else {
      console.log("❌ No status returned (null)");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testBotStatusViaMetrics();
