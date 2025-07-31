#!/usr/bin/env ts-node

import { BotSpawnerService } from '../backend/src/services/botSpawnerService';

async function testPM2Api() {
    console.log('🧪 Testing PM2 API Integration...\n');
    
    const spawner = new BotSpawnerService();
    
    try {
        // Test 1: List active bots
        console.log('1️⃣ Testing listActiveBots...');
        const { pm2Bots, configBots } = await spawner.listActiveBots();
        console.log(`   📋 PM2 processes found: ${pm2Bots.length}`);
        console.log(`   📋 Config bots found: ${configBots.length}`);
        
        // Test 2: Sync bots with PM2
        console.log('\n2️⃣ Testing syncBotsWithPM2...');
        const syncResult = await spawner.syncBotsWithPM2();
        console.log(`   ✅ Synchronized: ${syncResult.synchronized.length}`);
        console.log(`   🔍 Orphaned: ${syncResult.orphaned.length}`);
        console.log(`   ❓ Missing: ${syncResult.missing.length}`);
        
        // Test 3: Create a test bot (optional - commented out to avoid creating actual bots)
        /*
        console.log('\n3️⃣ Testing createNewWhatsAppBot...');
        const testBot = await spawner.createNewWhatsAppBot({
            name: 'test-bot-api',
            type: 'whatsapp',
            apiPort: 3001,
            status: 'active'
        });
        console.log(`   🤖 Test bot created: ${testBot.id}`);
        
        // Clean up test bot
        console.log('\n🧹 Cleaning up test bot...');
        await spawner.deleteBot(testBot.id);
        console.log(`   ✅ Test bot deleted`);
        */
        
        console.log('\n🎉 PM2 API integration test completed successfully!');
        
    } catch (error) {
        console.error('\n❌ PM2 API test failed:', error);
        process.exit(1);
    }
}

testPM2Api();
