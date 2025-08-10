#!/usr/bin/env node

/**
 * Console Statement Replacement Utility
 *
 * This script automatically replaces console.log/error/warn statements
 * with the botLogger wrapper throughout the bot codebase.
 */

const fs = require("fs");
const path = require("path");

const BOT_SRC_DIR = path.join(__dirname, "../src");

// Track files that need logger import
const filesToUpdate = new Set();

function shouldSkipFile(filePath) {
  const fileName = path.basename(filePath);

  // Skip the logger files themselves
  if (fileName === "Logger.ts" || fileName === "loggerWrapper.ts") {
    return true;
  }

  // Skip files that already have ESLint disable comments for console
  const content = fs.readFileSync(filePath, "utf8");
  if (
    content.includes("eslint-disable-next-line no-console") ||
    content.includes("eslint-disable no-console")
  ) {
    return true;
  }

  return false;
}

function replaceConsoleStatements(filePath) {
  if (shouldSkipFile(filePath)) {
    return false;
  }

  let content = fs.readFileSync(filePath, "utf8");
  const originalContent = content;
  let needsLoggerImport = false;

  // Replace console.log patterns with appropriate logger calls
  content = content.replace(
    /console\.log\(`([^`]+)`[^)]*\);/g,
    (match, message) => {
      needsLoggerImport = true;

      // Detect common patterns and use appropriate logger method
      if (message.includes("request") && message.includes("received")) {
        const requestIdMatch = message.match(/request (\$\{[^}]+\})/);
        const endpointMatch = message.match(/\$\{([^}]+)\}/);
        if (requestIdMatch && endpointMatch) {
          return `botLogger.requestReceived(${endpointMatch[1]}, ${requestIdMatch[1]});`;
        }
      }

      if (message.includes("completed") || message.includes("success")) {
        return `botLogger.info(\`${message}\`, '✅');`;
      }

      if (message.includes("Group") || message.includes("group")) {
        return `botLogger.info(\`${message}\`, '🏢');`;
      }

      if (message.includes("message") || message.includes("Message")) {
        return `botLogger.info(\`${message}\`, '💬');`;
      }

      if (
        message.includes("📁") ||
        message.includes("environment") ||
        message.includes("env")
      ) {
        return `botLogger.environmentInfo(\`${message.replace(
          /📁\\s*/,
          ""
        )}\`);`;
      }

      // Default to info with appropriate emoji
      const emoji = message.includes("🎵")
        ? "🎵"
        : message.includes("🖼️")
        ? "🖼️"
        : message.includes("📄")
        ? "📄"
        : message.includes("🎬")
        ? "🎬"
        : message.includes("📢")
        ? "📢"
        : "";

      if (emoji) {
        return `botLogger.info(\`${message.replace(
          new RegExp(emoji + "\\\\s*\\\\[BOT\\\\]\\\\s*"),
          ""
        )}\`, '${emoji}');`;
      }

      return `botLogger.info(\`${message}\`);`;
    }
  );

  // Replace console.error patterns
  content = content.replace(
    /console\.error\(`([^`]+)`[^)]*\);/g,
    (match, message) => {
      needsLoggerImport = true;
      return `botLogger.error(\`${message.replace(
        /❌\\s*\\[BOT\\]\\s*/,
        ""
      )}\`);`;
    }
  );

  // Replace console.warn patterns
  content = content.replace(
    /console\.warn\(`([^`]+)`[^)]*\);/g,
    (match, message) => {
      needsLoggerImport = true;
      return `botLogger.warn(\`${message.replace(
        /⚠️\\s*\\[BOT\\]\\s*/,
        ""
      )}\`);`;
    }
  );

  // Handle console.error with error objects
  content = content.replace(
    /console\.error\(`([^`]+)`, error\);/g,
    (match, message) => {
      needsLoggerImport = true;
      return `botLogger.errorWithContext(\`${message.replace(
        /❌\\s*\\[BOT\\]\\s*/,
        ""
      )}\`, error);`;
    }
  );

  // Add logger import if needed
  if (
    needsLoggerImport &&
    !content.includes("from '../utils/loggerWrapper'") &&
    !content.includes("from './loggerWrapper'")
  ) {
    // Find the right import path based on file location
    const relativePath = path.relative(BOT_SRC_DIR, filePath);
    const depth = relativePath.split("/").length - 1;
    const importPath = "../".repeat(depth) + "utils/loggerWrapper";

    // Add import after existing imports
    const importRegex = /(import[^;]+;\\s*\\n)+(\\n)?/;
    if (importRegex.test(content)) {
      content = content.replace(
        importRegex,
        `$&import { botLogger } from '${importPath}';\\n\\n`
      );
    } else {
      content = `import { botLogger } from '${importPath}';\\n\\n${content}`;
    }
  }

  // Only write if content changed
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`✅ Updated: ${path.relative(BOT_SRC_DIR, filePath)}`);
    return true;
  }

  return false;
}

function processDirectory(dir) {
  const entries = fs.readdirSync(dir);
  let filesUpdated = 0;

  entries.forEach((entry) => {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      filesUpdated += processDirectory(fullPath);
    } else if (entry.endsWith(".ts") && !entry.endsWith(".d.ts")) {
      if (replaceConsoleStatements(fullPath)) {
        filesUpdated++;
      }
    }
  });

  return filesUpdated;
}

// Run the replacement
console.log("🔄 Starting console statement replacement...");
const updated = processDirectory(BOT_SRC_DIR);
console.log(`\\n🎉 Completed! Updated ${updated} files.`);

if (updated > 0) {
  console.log("\\n💡 Next steps:");
  console.log("  • Review the changes with git diff");
  console.log("  • Test that logging still works as expected");
  console.log("  • Commit the standardized logging changes");
}
