#!/usr/bin/env node

/**
 * Design Token Validation Script
 *
 * Validates that all components use semantic CSS variables from design system
 * and don't have hardcoded colors.
 *
 * Usage: node scripts/validate-design-tokens.js
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Patterns to detect (violations)
const VIOLATIONS = {
  hardcodedGrayColors: /gray-[0-9]/g,
  hardcodedRedColors: /red-[0-9]/g,
  hardcodedBlueColors: /blue-[0-9]/g,
  hardcodedSkyColors: /sky-[0-9]/g,
  hardcodedGreenColors: /green-[0-9]/g,
  hardcodedYellowColors: /yellow-[0-9]/g,
  hexColors: /#[0-9a-fA-F]{6}/g,
  rgbColors: /rgb\([^)]+\)/g,
  rgbaColors: /rgba\([^)]+\)/g,
};

// Allowed semantic tokens (exceptions)
const ALLOWED_TOKENS = [
  'bg-background',
  'bg-surface',
  'bg-primary',
  'bg-danger',
  'bg-warning',
  'bg-success',
  'bg-info',
  'bg-accent',
  'text-foreground',
  'text-primary',
  'text-danger',
  'text-warning',
  'text-success',
  'text-info',
  'text-accent',
  'border-border',
  'border-primary',
  'border-danger',
  'border-warning',
  'border-success',
  'border-info',
  'border-accent',
];

// Files to check
const SOURCE_DIRS = [
  'apps/web/src/components/**/*.tsx',
  'apps/web/src/components/**/*.ts',
  'apps/web/src/app/**/*.tsx',
  'apps/web/src/app/**/*.ts',
  'packages/ui/src/**/*.tsx',
  'packages/ui/src/**/*.ts',
];

function findViolations(filePath, content) {
  const violations = [];

  for (const [name, pattern] of Object.entries(VIOLATIONS)) {
    const matches = [...content.matchAll(pattern)];
    if (matches.length > 0) {
      violations.push({
        file: filePath,
        type: name,
        matches: matches.map(m => m[0]),
        count: matches.length,
      });
    }
  }

  return violations;
}

function validateFiles() {
  console.log('🔍 Validating design token compliance...\n');

  let totalFiles = 0;
  let violationFiles = 0;
  const allViolations = [];

  for (const pattern of SOURCE_DIRS) {
    const files = glob.sync(pattern, { cwd: path.resolve(__dirname, '..') });

    for (const file of files) {
      totalFiles++;
      const filePath = path.resolve(__dirname, '..', file);
      const content = fs.readFileSync(filePath, 'utf-8');

      const violations = findViolations(file, content);
      if (violations.length > 0) {
        violationFiles++;
        allViolations.push(...violations);
      }
    }
  }

  // Report results
  console.log(`📊 Validation Results:`);
  console.log(`   Total files scanned: ${totalFiles}`);
  console.log(`   Files with violations: ${violationFiles}`);
  console.log(`   Total violations: ${allViolations.length}\n`);

  if (allViolations.length > 0) {
    console.log('❌ Violations found:\n');

    // Group by type
    const byType = allViolations.reduce((acc, v) => {
      if (!acc[v.type]) acc[v.type] = [];
      acc[v.type].push(v);
      return acc;
    }, {});

    for (const [type, violations] of Object.entries(byType)) {
      console.log(`  ${type}: ${violations.length} violations`);
      violations.slice(0, 5).forEach(v => {
        console.log(`    - ${v.file}: ${v.matches.join(', ')}`);
      });
      if (violations.length > 5) {
        console.log(`    ... and ${violations.length - 5} more`);
      }
      console.log('');
    }

    console.log('💡 Tip: Replace hardcoded colors with semantic tokens:');
    console.log('   - gray-900 → bg-background or bg-surface');
    console.log('   - red-500 → text-danger or bg-danger');
    console.log('   - blue-500 → text-primary or bg-primary');
    console.log('   - See packages/ui/styles/tokens.css for all tokens\n');

    process.exit(1);
  } else {
    console.log('✅ All files are compliant with design token standards!');
    process.exit(0);
  }
}

// Run validation
validateFiles();
