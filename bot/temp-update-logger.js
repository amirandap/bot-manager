#!/usr/bin/env node

const fs = require('fs');

// Mapeo de métodos obsoletos a nuevos métodos
const methodMapping = {
  'phoneNumberProcessing': 'logProcessing("phone"',
  'messageProcessing': 'logProcessing("message"',
  'mediaProcessing': 'logProcessing("media"',
  'groupOperation': 'logProcessing("group"',
  'directoryCreated': 'logDirectory("created"',
  'directoryExists': 'logDirectory("exists"',
  'chromeCheck': 'logChrome("check"',
  'chromeFound': 'logChrome("found"',
  'chromeSuccess': 'logChrome("success"',
  'requestReceived': 'logRequest(endpoint, requestId, "received"',
  'requestCompleted': 'logRequest(endpoint, requestId, "completed"',
  'requestFailed': 'logRequest(endpoint, requestId, "failed"'
};

function updateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;

  // phoneNumberProcessing con dos parámetros
  content = content.replace(
    /botLogger\.phoneNumberProcessing\(\s*"([^"]+)",\s*([^)]+)\s*\)/g,
    (match, action, target) => {
      updated = true;
      return `botLogger.logProcessing('phone', "${action}", ${target})`;
    }
  );

  // directoryCreated con un parámetro
  content = content.replace(
    /botLogger\.directoryCreated\(([^)]+)\)/g,
    (match, path) => {
      updated = true;
      return `botLogger.logDirectory('created', ${path})`;
    }
  );

  // directoryExists con un parámetro
  content = content.replace(
    /botLogger\.directoryExists\(([^)]+)\)/g,
    (match, path) => {
      updated = true;
      return `botLogger.logDirectory('exists', ${path})`;
    }
  );

  if (updated) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated: ${filePath}`);
  }
}

// Actualizar archivos
updateFile('src/utils/cleanAndFormatPhoneNumber.ts');
updateFile('src/services/DirectoryManagerService.ts');

console.log('🎉 Completed logger method updates!');
