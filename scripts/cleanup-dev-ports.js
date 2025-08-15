const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Kill any process using the specified port
 */
async function killProcessOnPort(port) {
  try {
    console.log(`🔍 [CLEANUP] Checking for processes on port ${port}...`);

    const { stdout } = await execAsync(`lsof -ti:${port}`);
    
    if (stdout.trim()) {
      const pids = stdout.trim().split('\n').filter(pid => pid.trim());
      
      console.log(`⚡ [CLEANUP] Found ${pids.length} process(es) on port ${port}: ${pids.join(', ')}`);
      
      for (const pid of pids) {
        try {
          await execAsync(`kill -9 ${pid.trim()}`);
          console.log(`✅ [CLEANUP] Killed process ${pid} on port ${port}`);
        } catch (killError) {
          console.warn(`⚠️ [CLEANUP] Could not kill process ${pid}:`, killError.message);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log(`🎉 [CLEANUP] Port ${port} cleanup completed`);
      return true;
    } else {
      console.log(`✅ [CLEANUP] Port ${port} is already free`);
      return true;
    }
  } catch (error) {
    if (error.message.includes('Command failed')) {
      console.log(`✅ [CLEANUP] Port ${port} is free (no processes found)`);
      return true;
    }
    
    console.error(`❌ [CLEANUP] Error on port ${port}:`, error.message);
    return false;
  }
}

/**
 * Kill processes by name pattern
 */
async function killProcessByName(namePattern) {
  try {
    console.log(`🔍 [CLEANUP] Looking for processes: ${namePattern}`);
    
    const { stdout } = await execAsync(`pgrep -f "${namePattern}"`);
    
    if (stdout.trim()) {
      const pids = stdout.trim().split('\n').filter(pid => pid.trim());
      
      console.log(`⚡ [CLEANUP] Found ${pids.length} process(es) matching "${namePattern}"`);
      
      for (const pid of pids) {
        try {
          await execAsync(`kill -9 ${pid.trim()}`);
          console.log(`✅ [CLEANUP] Killed process ${pid} (${namePattern})`);
        } catch (killError) {
          console.warn(`⚠️ [CLEANUP] Could not kill process ${pid}`);
        }
      }
      
      return true;
    } else {
      console.log(`✅ [CLEANUP] No processes found: ${namePattern}`);
      return true;
    }
  } catch (error) {
    if (error.message.includes('Command failed')) {
      console.log(`✅ [CLEANUP] No processes found: ${namePattern}`);
      return true;
    }
    
    console.error(`❌ [CLEANUP] Error with pattern "${namePattern}"`);
    return false;
  }
}

/**
 * Comprehensive cleanup of development environment
 */
async function cleanupDevelopmentEnvironment() {
  console.log('🧹 ========================================');
  console.log('🧹 CLEANING UP DEVELOPMENT ENVIRONMENT');
  console.log('🧹 ========================================');
  
  // Kill processes on development ports
  const ports = [3001, 7260, 7261, 7262, 7998]; // Backend, Frontend, Bot ports
  
  for (const port of ports) {
    await killProcessOnPort(port);
  }
  
  // Kill common development processes
  console.log('🔍 [CLEANUP] Cleaning up development processes...');
  
  const patterns = [
    'ts-node.*app.ts',
    'next dev',
    'turbopack',
    'next-server', 
    'bot-manager',
    'concurrently',
    'tsx.*app.ts'
  ];
  
  for (const pattern of patterns) {
    await killProcessByName(pattern);
  }
  
  console.log('✨ ========================================');
  console.log('✨ DEVELOPMENT ENVIRONMENT CLEANUP COMPLETE');
  console.log('✨ ========================================');
  console.log('');
}

// Run cleanup
cleanupDevelopmentEnvironment().catch(error => {
  console.error('❌ [CLEANUP] Failed:', error);
  process.exit(1);
});
