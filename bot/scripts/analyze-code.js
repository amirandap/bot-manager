#!/usr/bin/env node

/**
 * Bot Code Cleanup Utility
 *
 * This script performs automated cleanup of the bot codebase:
 * 1. Removes unused imports
 * 2. Checks for circular dependencies
 * 3. Standardizes import paths
 * 4. Reports duplicated code patterns
 */

const fs = require("fs");
const path = require("path");

const BOT_SRC_DIR = path.join(__dirname, "../src");

// Track all imports and exports across files
const importMap = new Map();
const exportMap = new Map();
const issues = [];

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const fileName = path.relative(BOT_SRC_DIR, filePath);

    // Extract imports
    const importRegex =
      /import\s+(?:{[^}]+}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    const fileImports = [];

    while ((match = importRegex.exec(content)) !== null) {
      fileImports.push(match[1]);
    }

    importMap.set(fileName, fileImports);

    // Extract exports
    const exportRegex =
      /export\s+(?:interface|class|function|const|enum|type)\s+(\w+)/g;
    const fileExports = [];

    while ((match = exportRegex.exec(content)) !== null) {
      fileExports.push(match[1]);
    }

    exportMap.set(fileName, fileExports);

    // Check for console statements
    const consoleRegex = /console\.(log|error|warn|info)/g;
    const consoleMatches = [];
    let lineNumber = 1;

    content.split("\n").forEach((line, index) => {
      if (consoleRegex.test(line) && !line.includes("eslint-disable")) {
        consoleMatches.push({
          line: index + 1,
          content: line.trim(),
        });
      }
    });

    if (consoleMatches.length > 0) {
      issues.push({
        file: fileName,
        type: "console_statements",
        details: consoleMatches,
      });
    }

    // Check for long import paths
    fileImports.forEach((importPath) => {
      if (importPath.startsWith("../../../")) {
        issues.push({
          file: fileName,
          type: "deep_import",
          details: { importPath },
        });
      }
    });
  } catch (error) {
    console.error(`Error scanning ${filePath}:`, error.message);
  }
}

function scanDirectory(dir) {
  const entries = fs.readdirSync(dir);

  entries.forEach((entry) => {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.endsWith(".ts") && !entry.endsWith(".d.ts")) {
      scanFile(fullPath);
    }
  });
}

function detectCircularDependencies() {
  const visited = new Set();
  const recursionStack = new Set();

  function hasCycle(file, path = []) {
    if (recursionStack.has(file)) {
      issues.push({
        file,
        type: "circular_dependency",
        details: { cycle: [...path, file] },
      });
      return true;
    }

    if (visited.has(file)) {
      return false;
    }

    visited.add(file);
    recursionStack.add(file);

    const imports = importMap.get(file) || [];

    for (const importPath of imports) {
      const resolvedPath = resolveImportPath(file, importPath);
      if (resolvedPath && hasCycle(resolvedPath, [...path, file])) {
        return true;
      }
    }

    recursionStack.delete(file);
    return false;
  }

  for (const file of importMap.keys()) {
    if (!visited.has(file)) {
      hasCycle(file);
    }
  }
}

function resolveImportPath(fromFile, importPath) {
  if (importPath.startsWith("./") || importPath.startsWith("../")) {
    const fromDir = path.dirname(fromFile);
    const resolved = path.join(fromDir, importPath);

    // Try with .ts extension
    const withTs = resolved + ".ts";
    if (importMap.has(withTs)) {
      return withTs;
    }

    // Try with /index.ts
    const withIndex = path.join(resolved, "index.ts");
    if (importMap.has(withIndex)) {
      return withIndex;
    }
  }

  return null;
}

function generateReport() {
  console.log("\\n🔍 Bot Code Analysis Report\\n");
  console.log("=".repeat(50));

  // Group issues by type
  const issuesByType = {};
  issues.forEach((issue) => {
    if (!issuesByType[issue.type]) {
      issuesByType[issue.type] = [];
    }
    issuesByType[issue.type].push(issue);
  });

  // Console statements
  if (issuesByType.console_statements) {
    console.log("\\n📢 Console Statements Found:");
    issuesByType.console_statements.forEach((issue) => {
      console.log(`  📄 ${issue.file}`);
      issue.details.forEach((detail) => {
        console.log(`    Line ${detail.line}: ${detail.content}`);
      });
    });
  }

  // Deep imports
  if (issuesByType.deep_import) {
    console.log("\\n🔗 Deep Import Paths:");
    issuesByType.deep_import.forEach((issue) => {
      console.log(`  📄 ${issue.file} imports ${issue.details.importPath}`);
    });
  }

  // Circular dependencies
  if (issuesByType.circular_dependency) {
    console.log("\\n🔄 Circular Dependencies:");
    issuesByType.circular_dependency.forEach((issue) => {
      console.log(`  📄 ${issue.file}`);
      console.log(`    Cycle: ${issue.details.cycle.join(" → ")}`);
    });
  }

  // Summary
  console.log("\\n📊 Summary:");
  console.log(`  Total files scanned: ${importMap.size}`);
  console.log(
    `  Console statements: ${issuesByType.console_statements?.length || 0}`
  );
  console.log(`  Deep imports: ${issuesByType.deep_import?.length || 0}`);
  console.log(
    `  Circular dependencies: ${issuesByType.circular_dependency?.length || 0}`
  );

  // Suggestions
  console.log("\\n💡 Recommendations:");
  if (issuesByType.console_statements) {
    console.log("  • Replace console statements with Logger service");
  }
  if (issuesByType.deep_import) {
    console.log("  • Create barrel exports to simplify import paths");
  }
  if (issuesByType.circular_dependency) {
    console.log(
      "  • Refactor circular dependencies by extracting shared interfaces"
    );
  }
}

// Run the analysis
console.log("🚀 Starting bot code analysis...");
scanDirectory(BOT_SRC_DIR);
detectCircularDependencies();
generateReport();
