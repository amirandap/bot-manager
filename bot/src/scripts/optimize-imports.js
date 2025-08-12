/**
 * Import Optimization Script - Phase 3
 * 
 * This script optimizes imports throughout the codebase by:
 * 1. Standardizing import paths
 * 2. Consolidating multiple imports from same modules
 * 3. Using barrel exports consistently
 * 4. Removing unnecessary re-exports
 */

const fs = require('fs');
const path = require('path');

// Define optimization rules
const OPTIMIZATION_RULES = {
  // Convert direct utils imports to barrel exports where appropriate
  BARREL_EXPORTS: {
    '../utils/loggerWrapper': '../utils',
    '../utils/errorHandler': '../utils',
    '../utils/recipientFormatting': '../utils',
    '../utils/requestValidator': '../utils',
    '../utils/mediaUtils': '../utils',
    '../utils/groupUtils': '../utils'
  },
  
  // Consolidate imports from same module
  CONSOLIDATE_IMPORTS: true,
  
  // Remove unnecessary type re-exports
  SIMPLIFY_TYPES: true
};

// Track changes made
let changesCount = 0;
let filesModified = [];

function optimizeImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const optimizedLines = [];
  
  let hasChanges = false;
  let inImportSection = true;
  const importsByModule = new Map();
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if we're still in the import section
    if (inImportSection && line.trim() && !line.trim().startsWith('import ') && !line.trim().startsWith('//') && !line.trim().startsWith('/*') && !line.trim().startsWith('*')) {
      inImportSection = false;
      
      // Write collected imports before continuing
      writeConsolidatedImports(importsByModule, optimizedLines);
      if (optimizedLines.length > 0 && optimizedLines[optimizedLines.length - 1].trim() !== '') {
        optimizedLines.push('');
      }
    }
    
    // Process import lines
    if (inImportSection && line.trim().startsWith('import ') && line.includes(' from ')) {
      const importMatch = line.match(/import\s+(.+?)\s+from\s+['"](.+?)['"];?\s*$/);
      
      if (importMatch) {
        let [, importClause, modulePath] = importMatch;
        
        // Clean up import clause
        importClause = importClause.trim();
        
        // Check if we should convert to barrel export
        const barrelPath = OPTIMIZATION_RULES.BARREL_EXPORTS[modulePath];
        if (barrelPath) {
          modulePath = barrelPath;
          hasChanges = true;
        }
        
        // Store import for consolidation
        if (!importsByModule.has(modulePath)) {
          importsByModule.set(modulePath, []);
        }
        importsByModule.get(modulePath).push(importClause);
        continue; // Don't add to optimizedLines yet
      }
    }
    
    // Add non-import lines
    if (!inImportSection || (!line.trim().startsWith('import ') || !line.includes(' from '))) {
      optimizedLines.push(line);
    }
  }
  
  // Handle case where file ends with imports
  if (inImportSection && importsByModule.size > 0) {
    writeConsolidatedImports(importsByModule, optimizedLines);
  }
  
  if (hasChanges || importsByModule.size > 0) {
    const optimizedContent = optimizedLines.join('\n');
    fs.writeFileSync(filePath, optimizedContent);
    filesModified.push(filePath);
    changesCount++;
    console.log(`✅ Optimized imports in: ${path.relative(process.cwd(), filePath)}`);
  }
}

function writeConsolidatedImports(importsByModule, optimizedLines) {
  for (const [modulePath, clauses] of importsByModule.entries()) {
    if (clauses.length === 1) {
      optimizedLines.push(`import ${clauses[0]} from "${modulePath}";`);
    } else {
      // Parse and consolidate import clauses properly
      const namedImports = [];
      const defaultImports = [];
      const namespaceImports = [];
      
      for (const clause of clauses) {
        if (clause.includes('{') && clause.includes('}')) {
          // Named import
          const match = clause.match(/\{\s*(.+?)\s*\}/);
          if (match) {
            namedImports.push(...match[1].split(',').map(s => s.trim()));
          }
        } else if (clause.includes('* as ')) {
          // Namespace import
          namespaceImports.push(clause);
        } else {
          // Default import
          defaultImports.push(clause);
        }
      }
      
      // Build consolidated import
      let consolidatedClause = '';
      if (defaultImports.length > 0) {
        consolidatedClause += defaultImports[0]; // Take first default import
      }
      if (namedImports.length > 0) {
        if (consolidatedClause) consolidatedClause += ', ';
        consolidatedClause += `{ ${[...new Set(namedImports)].join(', ')} }`;
      }
      if (namespaceImports.length > 0) {
        for (const nsImport of namespaceImports) {
          optimizedLines.push(`import ${nsImport} from "${modulePath}";`);
        }
        if (consolidatedClause) {
          optimizedLines.push(`import ${consolidatedClause} from "${modulePath}";`);
        }
        continue;
      }
      
      if (consolidatedClause) {
        optimizedLines.push(`import ${consolidatedClause} from "${modulePath}";`);
      }
    }
  }
  importsByModule.clear();
}

function findTypeScriptFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverse(fullPath);
      } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx'))) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

function simplifyTypesIndex() {
  const typesIndexPath = path.join(__dirname, '../types/index.ts');
  
  if (!fs.existsSync(typesIndexPath)) {
    return;
  }
  
  const content = fs.readFileSync(typesIndexPath, 'utf8');
  
  // Check if it's just a simple re-export
  if (content.includes('export * from "./types";') && content.split('\n').filter(line => line.trim() && !line.trim().startsWith('//')).length <= 1) {
    console.log('📁 types/index.ts is a trivial re-export. Consider removing it and updating imports to use types/types.ts directly.');
    
    // For now, let's keep it but add a comment about the optimization opportunity
    const optimizedContent = `/**
 * TYPES BARREL EXPORT
 * 
 * Note: This file only re-exports types.ts
 * Consider importing directly from "./types/types" for better performance
 */

export * from "./types";
`;
    
    if (content !== optimizedContent) {
      fs.writeFileSync(typesIndexPath, optimizedContent);
      filesModified.push(typesIndexPath);
      changesCount++;
      console.log(`✅ Simplified: ${path.relative(process.cwd(), typesIndexPath)}`);
    }
  }
}

// Main execution
function main() {
  console.log('🚀 Starting Import Optimization - Phase 3\n');
  
  const srcDir = path.join(__dirname, '..');
  const tsFiles = findTypeScriptFiles(srcDir);
  
  console.log(`📂 Found ${tsFiles.length} TypeScript files to analyze\n`);
  
  // Optimize imports in all TypeScript files
  tsFiles.forEach(optimizeImports);
  
  // Simplify types index
  simplifyTypesIndex();
  
  console.log('\n📊 OPTIMIZATION SUMMARY:');
  console.log(`✅ Files modified: ${changesCount}`);
  console.log(`📄 Total files analyzed: ${tsFiles.length}`);
  
  if (filesModified.length > 0) {
    console.log('\n📁 Modified files:');
    filesModified.forEach(file => {
      console.log(`   - ${path.relative(process.cwd(), file)}`);
    });
  }
  
  console.log('\n🎯 Import optimization completed!');
}

// Run the script
main();
