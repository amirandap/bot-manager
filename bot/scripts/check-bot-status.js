#!/usr/bin/env node
/**
 * Bot Status Checker - Script para verificar el estado del bot
 * Útil cuando el bot no está corriendo con PM2
 */

const fs = require('fs');
const path = require('path');

const STATUS_FILE_PATH = path.join(__dirname, '..', 'bot-status.json');

function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString('es-ES', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function getStatusEmoji(status) {
  switch (status) {
    case 'running': return '✅';
    case 'starting': return '🔄';
    case 'error': return '❌';
    case 'stopped': return '🛑';
    default: return '❓';
  }
}

function getProgressBar(percentage) {
  const total = 20;
  const filled = Math.round((percentage / 100) * total);
  const empty = total - filled;
  return '█'.repeat(filled) + '░'.repeat(empty) + ` ${percentage}%`;
}

function main() {
  console.log('\n🤖 Bot Status Checker\n');
  console.log('=' .repeat(60));

  if (!fs.existsSync(STATUS_FILE_PATH)) {
    console.log('❌ Status file not found. Bot might be running with PM2 or not started yet.');
    console.log(`   Expected file: ${STATUS_FILE_PATH}`);
    return;
  }

  try {
    const statusContent = fs.readFileSync(STATUS_FILE_PATH, 'utf8');
    const status = JSON.parse(statusContent);

    // Process Info
    console.log('\n📋 Process Information:');
    console.log(`   PID: ${status.process_info.pid}`);
    console.log(`   Started: ${formatTimestamp(status.process_info.started_at)}`);
    console.log(`   Node Version: ${status.process_info.node_version}`);
    console.log(`   Working Directory: ${status.process_info.working_directory}`);
    console.log(`   Running with PM2: ${status.process_info.running_with_pm2 ? 'Yes' : 'No'}`);

    // Current Status
    console.log('\n📊 Current Status:');
    const emoji = getStatusEmoji(status.current_status.overall_status);
    console.log(`   Overall Status: ${emoji} ${status.current_status.overall_status.toUpperCase()}`);
    console.log(`   Current Step: ${status.current_status.current_step}`);
    console.log(`   Progress: ${getProgressBar(status.current_status.progress_percentage)}`);
    console.log(`   Last Update: ${formatTimestamp(status.current_status.last_update)}`);

    // Service Status
    console.log('\n🔧 Service Status:');
    console.log(`   Bot Ready: ${status.current_status.bot_ready ? '✅' : '❌'}`);
    console.log(`   API Ready: ${status.current_status.api_ready ? '✅' : '❌'}`);
    console.log(`   WhatsApp Connected: ${status.current_status.whatsapp_connected ? '✅' : '❌'}`);

    // Recent Activity
    if (status.metrics_history && status.metrics_history.length > 0) {
      console.log('\n📈 Recent Activity (Last 5 entries):');
      const recentMetrics = status.metrics_history.slice(-5);
      recentMetrics.forEach(metric => {
        const time = formatTimestamp(metric.timestamp);
        const statusEmoji = metric.data.startup_metrics?.status === 'success' ? '✅' : 
                          metric.data.startup_metrics?.status === 'failure' ? '❌' : '🔄';
        console.log(`   ${time}: ${statusEmoji} ${metric.data.startup_metrics?.step || 'unknown'}`);
        if (metric.data.startup_metrics?.message) {
          console.log(`      └─ ${metric.data.startup_metrics.message}`);
        }
      });
    }

    // Recent Failures
    if (status.failures && status.failures.length > 0) {
      console.log('\n🚨 Recent Failures:');
      const recentFailures = status.failures.slice(-3);
      recentFailures.forEach(failure => {
        const time = formatTimestamp(failure.timestamp);
        console.log(`   ${time}: ❌ ${failure.data.error_context}`);
        console.log(`      └─ ${failure.data.error_message}`);
      });
    }

    // Last Shutdown
    if (status.last_shutdown) {
      console.log('\n🛑 Last Shutdown:');
      const time = formatTimestamp(status.last_shutdown.timestamp);
      console.log(`   Time: ${time}`);
      console.log(`   Signal: ${status.last_shutdown.data.signal}`);
      console.log(`   Reason: ${status.last_shutdown.data.reason || 'Not specified'}`);
      if (status.last_shutdown.data.error) {
        console.log(`   Error: ${status.last_shutdown.data.error}`);
      }
    }

  } catch (error) {
    console.error('❌ Error reading status file:', error.message);
  }

  console.log('\n' + '=' .repeat(60));
  console.log('\n💡 Tip: Run this script periodically to monitor bot status');
  console.log('   Example: watch -n 5 node scripts/check-bot-status.js\n');
}

if (require.main === module) {
  main();
}

module.exports = { main };
