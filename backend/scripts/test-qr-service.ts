/**
 * QR Code Service Test Script
 *
 * This script demonstrates the new QR code serving functionality
 * Run with: npm run test-qr-service
 */

import { QRCodeService } from "../src/services/QRCodeService";
import { ConfigService } from "../src/services/configService";
import * as fs from "fs";
import * as path from "path";

async function testQRCodeService() {
  console.log("🧪 Testing QR Code Service...\n");

  const qrService = new QRCodeService();
  const configService = ConfigService.getInstance();

  try {
    // Get all bots from configuration
    const allBots = configService.getAllBots();

    if (allBots.length === 0) {
      console.log("❌ No bots found in configuration");
      return;
    }

    console.log(`📋 Found ${allBots.length} bot(s) in configuration:`);
    allBots.forEach((bot) => {
      console.log(`  - ${bot.id} (${bot.name}) - Port: ${bot.port}`);
    });

    console.log("\n🔍 Checking QR code availability for each bot:\n");

    for (const bot of allBots) {
      console.log(`🤖 Bot: ${bot.name} (${bot.id})`);

      // Check if QR code exists
      const hasQR = qrService.hasQRCode(bot.id);
      console.log(`  QR Code Available: ${hasQR ? "✅ Yes" : "❌ No"}`);

      if (hasQR) {
        // Get QR code status
        const status = qrService.getQRCodeStatus(bot.id);
        console.log(`  Created: ${status.createdAt?.toLocaleString()}`);
        console.log(`  Age: ${Math.floor(status.ageMinutes || 0)} minutes`);
        console.log(`  Expired: ${status.expired ? "⚠️ Yes" : "✅ No"}`);
        console.log(`  File Path: ${status.filePath}`);

        // Check file size
        if (status.filePath && fs.existsSync(status.filePath)) {
          const stats = fs.statSync(status.filePath);
          console.log(`  File Size: ${(stats.size / 1024).toFixed(2)} KB`);
        }
      }

      console.log(""); // Empty line for readability
    }

    // Test HTML generation for first bot
    if (allBots.length > 0) {
      const firstBot = allBots[0];
      console.log(`🌐 Testing HTML generation for bot: ${firstBot.name}`);

      const html = qrService.generateQRCodeHTML(firstBot.id, firstBot.name);
      const htmlLength = html.length;
      const hasQRImage = html.includes("data:image/png;base64,");

      console.log(`  HTML Length: ${htmlLength} characters`);
      console.log(`  Contains QR Image: ${hasQRImage ? "✅ Yes" : "❌ No"}`);

      // Save HTML to temp file for inspection
      const tempHtmlPath = path.join(__dirname, "../temp-qr-test.html");
      fs.writeFileSync(tempHtmlPath, html);
      console.log(`  💾 HTML saved to: ${tempHtmlPath}`);
    }

    console.log("\n✅ QR Code Service test completed successfully!");

    console.log("\n📝 Usage Examples:");
    console.log(
      "  Backend QR URL: http://localhost:3001/api/bots/{botId}/qr-code"
    );
    console.log(
      "  Alternative URL: http://localhost:3001/api/bots/qr-code?botId={botId}"
    );
  } catch (error) {
    console.error("❌ Error testing QR Code Service:", error);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testQRCodeService();
}

export { testQRCodeService };
