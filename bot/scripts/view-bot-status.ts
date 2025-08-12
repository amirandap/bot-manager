/**
 * Bot Status Viewer - Displays current bot status from JSON fallback or PM2
 * Usage: npm run view-status or ts-node scripts/view-bot-status.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// For ES modules compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface BotStatusEntry {
  timestamp: string;
  type: 'metric' | 'failure' | 'shutdown';
  data: any;
}

interface BotStatusFile {
  process_info: {
    pid: number;
    started_at: string;
    running_with_pm2: boolean;
    node_version: string;
    working_directory: string;
  };
  current_status: {
    overall_status: 'starting' | 'running' | 'error' | 'stopped';
    current_step: string;
    progress_percentage: number;
    last_update: string;
    bot_ready: boolean;
    api_ready: boolean;
    whatsapp_connected: boolean;
  };
  metrics_history: BotStatusEntry[];
  failures: BotStatusEntry[];
  last_shutdown?: BotStatusEntry;
}

const statusFilePath = path.join(process.cwd(), 'bot-status.json');

function formatTimestamp(isoString: string): string {
  return new Date(isoString).toLocaleString();
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case 'running': return '🟢';
    case 'starting': return '🟡';
    case 'error': return '🔴';
    case 'stopped': return '⚫';
    default: return '❓';
  }
}

function displayBotStatus(): void {
  if (!fs.existsSync(statusFilePath)) {
    console.log('❌ Bot status file not found. Bot may not be running or never started.');
    console.log(`Expected file: ${statusFilePath}`);
    return;
  }

  try {
    const statusContent = fs.readFileSync(statusFilePath, 'utf8');
    const status: BotStatusFile = JSON.parse(statusContent);

    console.log('\n🤖 BOT STATUS DASHBOARD');
    console.log('═'.repeat(50));

    // Process Information
    console.log('\n📋 PROCESS INFORMATION');
    console.log(`   PID: ${status.process_info.pid}`);
    console.log(`   Started: ${formatTimestamp(status.process_info.started_at)}`);
    console.log(`   Node Version: ${status.process_info.node_version}`);
    console.log(`   Running with PM2: ${status.process_info.running_with_pm2 ? '✅ Yes' : '❌ No'}`);
    console.log(`   Working Directory: ${status.process_info.working_directory}`);

    // Current Status
    console.log('\n📊 CURRENT STATUS');
    const statusEmoji = getStatusEmoji(status.current_status.overall_status);
    console.log(`   Overall Status: ${statusEmoji} ${status.current_status.overall_status.toUpperCase()}`);
    console.log(`   Current Step: ${status.current_status.current_step}`);
    console.log(`   Progress: ${status.current_status.progress_percentage}%`);
    console.log(`   Last Update: ${formatTimestamp(status.current_status.last_update)}`);

    // Component Status
    console.log('\n🔧 COMPONENT STATUS');
    console.log(`   Bot Ready: ${status.current_status.bot_ready ? '✅' : '❌'}`);
    console.log(`   API Ready: ${status.current_status.api_ready ? '✅' : '❌'}`);
    console.log(`   WhatsApp Connected: ${status.current_status.whatsapp_connected ? '✅' : '❌'}`);

    // Recent Activity (last 5 metrics)
    console.log('\n📈 RECENT ACTIVITY');
    const recentMetrics = status.metrics_history.slice(-5).reverse();
    if (recentMetrics.length > 0) {
      recentMetrics.forEach((entry, index) => {
        const data = entry.data.startup_metrics || entry.data;
        const statusIcon = data.status === 'success' ? '✅' : 
                          data.status === 'failure' ? '❌' : '🔄';
        console.log(`   ${index + 1}. ${statusIcon} ${data.step || 'unknown'} - ${data.message || 'No message'}`);
        console.log(`      ${formatTimestamp(entry.timestamp)}`);
      });
    } else {
      console.log('   No recent activity recorded');
    }

    // Recent Failures
    if (status.failures.length > 0) {
      console.log('\n🚨 RECENT FAILURES');
      const recentFailures = status.failures.slice(-3).reverse();
      recentFailures.forEach((failure, index) => {
        const data = failure.data;
        console.log(`   ${index + 1}. ❌ ${data.error_message}`);
        console.log(`      Context: ${data.error_context}`);
        console.log(`      Time: ${formatTimestamp(failure.timestamp)}`);
        console.log(`      Should Restart: ${data.should_restart ? 'Yes' : 'No'}`);
      });
    }

    // Last Shutdown Info
    if (status.last_shutdown) {
      console.log('\n🛑 LAST SHUTDOWN');
      const shutdown = status.last_shutdown.data;
      console.log(`   Graceful: ${shutdown.graceful_shutdown ? '✅' : '❌'}`);
      console.log(`   Signal: ${shutdown.signal || 'unknown'}`);
      console.log(`   Reason: ${shutdown.reason || 'Not specified'}`);
      console.log(`   Time: ${formatTimestamp(status.last_shutdown.timestamp)}`);
      if (shutdown.error) {
        console.log(`   Error: ${shutdown.error}`);
      }
    }

    // Health Summary
    console.log('\n💡 HEALTH SUMMARY');
    if (status.current_status.overall_status === 'running' && 
        status.current_status.bot_ready && 
        status.current_status.whatsapp_connected) {
      console.log('   🎉 Bot is fully operational and ready to process messages!');
    } else if (status.current_status.overall_status === 'starting') {
      console.log('   🔄 Bot is starting up. Please wait for initialization to complete.');
    } else if (status.current_status.overall_status === 'error') {
      console.log('   ⚠️ Bot encountered errors. Check the failures section above.');
    } else if (status.current_status.overall_status === 'stopped') {
      console.log('   💤 Bot is currently stopped.');
    }

    console.log('\n' + '═'.repeat(50));
    
    // Auto-refresh option
    const args = process.argv.slice(2);
    if (args.includes('--watch') || args.includes('-w')) {
      console.log('👀 Watching for changes... (Press Ctrl+C to exit)');
      setTimeout(() => {
        console.clear();
        displayBotStatus();
      }, 3000);
    }

  } catch (error) {
    console.error('❌ Error reading bot status file:', error);
    console.log('\nTry running the bot first to generate the status file.');
  }
}

// Check command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log('\n🤖 Bot Status Viewer');
  console.log('\nUsage:');
  console.log('  npm run view-status           Show current status');
  console.log('  npm run view-status --watch    Show status and auto-refresh every 3 seconds');
  console.log('  npm run view-status --help     Show this help message');
  console.log('\nThe status file is located at: bot-status.json');
} else {
  // Display the status
  displayBotStatus();
}
