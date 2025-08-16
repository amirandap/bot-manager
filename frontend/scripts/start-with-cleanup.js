import { spawn } from "child_process";
import { cleanupFrontendPort } from "./portKiller.js";

async function startFrontendWithCleanup() {
  console.log("🚀 [FRONTEND] Starting frontend with port cleanup...");

  try {
    // Clean up ports first
    await cleanupFrontendPort();

    console.log("🎯 [FRONTEND] Starting Next.js development server...");

    // Start Next.js
    const nextProcess = spawn(
      "npx",
      ["next", "dev", "--turbopack", "-p", "7260"],
      {
        stdio: "inherit",
        shell: true,
      }
    );

    // Handle process termination
    process.on("SIGINT", () => {
      console.log("🛑 [FRONTEND] Shutting down...");
      nextProcess.kill("SIGTERM");
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      console.log("🛑 [FRONTEND] Shutting down...");
      nextProcess.kill("SIGTERM");
      process.exit(0);
    });

    // Handle Next.js process exit
    nextProcess.on("exit", (code) => {
      console.log(`📝 [FRONTEND] Next.js process exited with code: ${code}`);
      process.exit(code || 0);
    });

    nextProcess.on("error", (error) => {
      console.error("❌ [FRONTEND] Failed to start Next.js:", error);
      process.exit(1);
    });
  } catch (error) {
    console.error("❌ [FRONTEND] Startup failed:", error);
    process.exit(1);
  }
}

startFrontendWithCleanup();
