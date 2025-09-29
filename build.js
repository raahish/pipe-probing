#!/usr/bin/env node

// Build script for Qualtrics-compatible modular bundle
// Combines all modules into a single file for production

const fs = require('fs');
const path = require('path');

function buildProductionBundle() {
  console.log('🚀 Building production bundle for Qualtrics...');

  const modules = [
    'src/core/utils.js',
    'src/core/global-registry.js',
    'src/core/state-manager.js',
    'src/core/event-handler.js',
    'src/ui/element-controller.js',
    'src/ui/timer-manager.js',
    'src/ui/modal-manager.js',
    'src/recording/pipe-integration.js',
    'src/recording/transcription.js',
    'src/recording/validation.js',
    'src/ai/conversation-manager.js',
    'src/ai/ai-service.js',
    'src/main.js'
  ];

  let bundle = '// ===============================================\n';
  bundle += '// QUALTRICS MODULAR VIDEO RECORDER BUNDLE\n';
  bundle += '// Generated: ' + new Date().toISOString() + '\n';
  bundle += '// Total modules: ' + modules.length + '\n';
  bundle += '// DO NOT EDIT - Generated from src/ directory\n';
  bundle += '// ===============================================\n\n';

  let totalLines = 0;
  let moduleCount = 0;

  modules.forEach(modulePath => {
    try {
      const content = fs.readFileSync(modulePath, 'utf8');
      const lines = content.split('\n').length;

      bundle += '// === ' + path.basename(modulePath) + ' (' + lines + ' lines) ===\n';
      bundle += content + '\n\n';

      totalLines += lines;
      moduleCount++;

      console.log('✅ Added: ' + path.basename(modulePath) + ' (' + lines + ' lines)');
    } catch (error) {
      console.error('❌ Failed to read module:', modulePath, error.message);
      process.exit(1);
    }
  });

  // Write production bundle
  const outputPath = 'templates/static/qualtrics-addpipe-custom-secure.js';
  fs.writeFileSync(outputPath, bundle);

  console.log('\n🎉 Production bundle created successfully!');
  console.log('📊 Bundle Statistics:');
  console.log('   • Modules: ' + moduleCount);
  console.log('   • Total lines: ' + totalLines);
  console.log('   • Output file: ' + outputPath);
  console.log('   • File size: ' + (bundle.length / 1024).toFixed(2) + ' KB');
  console.log('\n✅ Bundle ready for Qualtrics deployment');
  console.log('💡 Upload to: https://raahish.github.io/pipe-probing/templates/static/qualtrics-addpipe-custom-secure.js');
}

// Run build
if (require.main === module) {
  buildProductionBundle();
}

module.exports = { buildProductionBundle };
