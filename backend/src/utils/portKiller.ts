import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Kill any process using the specified port
 */
export async function killProcessOnPort(port: number): Promise<boolean> {
  try {
    console.log(`🔍 Checking for processes on port ${port}...`);

    // Find processes using the port
    const { stdout } = await execAsync(`lsof -ti:${port}`);
    
    if (stdout.trim()) {
      const pids = stdout.trim().split('\n').filter(pid => pid.trim());
      
      console.log(`⚡ Found ${pids.length} process(es) on port ${port}: ${pids.join(', ')}`);
      
      // Kill each process
      for (const pid of pids) {
        try {
          await execAsync(`kill -9 ${pid.trim()}`);
          console.log(`✅ Killed process ${pid} on port ${port}`);
        } catch (killError) {
          console.warn(`⚠️ Could not kill process ${pid}:`, killError);
        }
      }
      
      // Wait a moment for processes to die
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify port is now free
      try {
        const { stdout: checkStdout } = await execAsync(`lsof -ti:${port}`);
        if (checkStdout.trim()) {
          console.warn(`⚠️ Port ${port} still has processes after kill attempt`);
          return false;
        }
      } catch {
        // Command failed means no processes found - good!
      }
      
      console.log(`🎉 Port ${port} is now free`);
      return true;
    } else {
      console.log(`✅ Port ${port} is already free`);
      return true;
    }
  } catch (error) {
    // lsof command failed means no processes found
    if (error instanceof Error && error.message.includes('Command failed')) {
      console.log(`✅ Port ${port} is free (no processes found)`);
      return true;
    }
    
    console.error(`❌ Error checking/killing processes on port ${port}:`, error);
    return false;
  }
}

/**
 * Kill processes by name pattern
 */
export async function killProcessByName(namePattern: string): Promise<boolean> {
  try {
    console.log(`🔍 Looking for processes matching: ${namePattern}`);
    
    // Find processes by name
    const { stdout } = await execAsync(`pgrep -f "${namePattern}"`);
    
    if (stdout.trim()) {
      const pids = stdout.trim().split('\n').filter(pid => pid.trim());
      
      console.log(`⚡ Found ${pids.length} process(es) matching "${namePattern}": ${pids.join(', ')}`);
      
      // Kill each process
      for (const pid of pids) {
        try {
          await execAsync(`kill -9 ${pid.trim()}`);
          console.log(`✅ Killed process ${pid} (${namePattern})`);
        } catch (killError) {
          console.warn(`⚠️ Could not kill process ${pid}:`, killError);
        }
      }
      
      return true;
    } else {
      console.log(`✅ No processes found matching: ${namePattern}`);
      return true;
    }
  } catch (error) {
    // pgrep command failed means no processes found
    if (error instanceof Error && error.message.includes('Command failed')) {
      console.log(`✅ No processes found matching: ${namePattern}`);
      return true;
    }
    
    console.error(`❌ Error killing processes by name "${namePattern}":`, error);
    return false;
  }
}

/**
 * Comprehensive port cleanup for development
 */
export async function cleanupDevelopmentPorts(): Promise<void> {
  console.log("🧹 Cleaning up development ports...");
  
  const ports = [3001, 7260, 7261]; // Backend, Frontend, Bot ports
  
  for (const port of ports) {
    await killProcessOnPort(port);
  }
  
  // Also clean up common development processes
  await killProcessByName("ts-node.*app.ts");
  await killProcessByName("next dev");
  await killProcessByName("turbopack");
  
  console.log("✨ Development ports cleanup completed");
}
