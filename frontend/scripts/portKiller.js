import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Kill any process using the specified port
 */
async function killProcessOnPort(port) {
  try {
    console.log(`🔍 [FRONTEND] Checking for processes on port ${port}...`);

    // Find processes using the port
    const { stdout } = await execAsync(`lsof -ti:${port}`);

    if (stdout.trim()) {
      const pids = stdout
        .trim()
        .split("\n")
        .filter((pid) => pid.trim());

      console.log(
        `⚡ [FRONTEND] Found ${
          pids.length
        } process(es) on port ${port}: ${pids.join(", ")}`
      );

      // Kill each process
      for (const pid of pids) {
        try {
          await execAsync(`kill -9 ${pid.trim()}`);
          console.log(`✅ [FRONTEND] Killed process ${pid} on port ${port}`);
        } catch (killError) {
          console.warn(
            `⚠️ [FRONTEND] Could not kill process ${pid}:`,
            killError.message
          );
        }
      }

      // Wait a moment for processes to die
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify port is now free
      try {
        const { stdout: checkStdout } = await execAsync(`lsof -ti:${port}`);
        if (checkStdout.trim()) {
          console.warn(
            `⚠️ [FRONTEND] Port ${port} still has processes after kill attempt`
          );
          return false;
        }
      } catch {
        // Command failed means no processes found - good!
      }

      console.log(`🎉 [FRONTEND] Port ${port} is now free`);
      return true;
    } else {
      console.log(`✅ [FRONTEND] Port ${port} is already free`);
      return true;
    }
  } catch (error) {
    // lsof command failed means no processes found
    if (error.message.includes("Command failed")) {
      console.log(`✅ [FRONTEND] Port ${port} is free (no processes found)`);
      return true;
    }

    console.error(
      `❌ [FRONTEND] Error checking/killing processes on port ${port}:`,
      error.message
    );
    return false;
  }
}

/**
 * Kill processes by name pattern
 */
async function killProcessByName(namePattern) {
  try {
    console.log(`🔍 [FRONTEND] Looking for processes matching: ${namePattern}`);

    // Find processes by name
    const { stdout } = await execAsync(`pgrep -f "${namePattern}"`);

    if (stdout.trim()) {
      const pids = stdout
        .trim()
        .split("\n")
        .filter((pid) => pid.trim());

      console.log(
        `⚡ [FRONTEND] Found ${
          pids.length
        } process(es) matching "${namePattern}": ${pids.join(", ")}`
      );

      // Kill each process
      for (const pid of pids) {
        try {
          await execAsync(`kill -9 ${pid.trim()}`);
          console.log(`✅ [FRONTEND] Killed process ${pid} (${namePattern})`);
        } catch (killError) {
          console.warn(
            `⚠️ [FRONTEND] Could not kill process ${pid}:`,
            killError.message
          );
        }
      }

      return true;
    } else {
      console.log(`✅ [FRONTEND] No processes found matching: ${namePattern}`);
      return true;
    }
  } catch (error) {
    // pgrep command failed means no processes found
    if (error.message.includes("Command failed")) {
      console.log(`✅ [FRONTEND] No processes found matching: ${namePattern}`);
      return true;
    }

    console.error(
      `❌ [FRONTEND] Error killing processes by name "${namePattern}":`,
      error.message
    );
    return false;
  }
}

/**
 * Main cleanup function for frontend
 */
async function cleanupFrontendPort() {
  console.log("🧹 [FRONTEND] Cleaning up frontend port...");

  const frontendPort = process.env.FRONTEND_PORT || 7260;

  // Kill processes on frontend port
  await killProcessOnPort(frontendPort);

  // Kill Next.js related processes
  await killProcessByName("next dev");
  await killProcessByName("turbopack");
  await killProcessByName("next-server");

  console.log("✨ [FRONTEND] Port cleanup completed");
}

export { killProcessOnPort, killProcessByName, cleanupFrontendPort };
