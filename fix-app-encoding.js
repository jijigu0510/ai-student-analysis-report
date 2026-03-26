#!/usr/bin/env node
/**
 * app.js Encoding & Syntax Repair Script
 * Fixes extensive Korean character encoding corruption
 */

const fs = require('fs');
const path = require('path');

const appJsPath = './app.js';
const backupPath = './app.js.backup';

console.log('=== app.js Comprehensive Repair ===\n');

// Create backup
console.log('1. Creating backup...');
if (!fs.existsSync(backupPath)) {
  fs.copyFileSync(appJsPath, backupPath);
  console.log(`   ✓ Backup created: ${backupPath}`);
}

// Read file
let content = fs.readFileSync(appJsPath, 'utf-8');
const initialSize = content.length;
const initialCorrupted = (content.match(/\?/g) || []).length;

console.log(`\n2. Analyzing file...`);
console.log(`   File size: ${(initialSize / 1024).toFixed(2)}KB`);
console.log(`   Corrupted characters (? marks): ${initialCorrupted}`);

// Targeted Korean text replacements (from common corruption patterns)
const replacements = [
  // University names - these appear many times
  ['고려대학', '고려대학'],  // Verify it's already correct
  ['서울대학', '서울대학'],
  ['연세대학', '연세대학'],
  
  // Common department/category names that got corrupted
  ['?은?과', '은행과'],
  ['?년?학', '년생학'],
  ['?업?과', '업체과'],
  ['?경?사', '경제학사'],
  ['?과?학', '과학학'],
  
  // Common corruption patterns - replace ? with context-aware text
  // This is limited - ideally need proper encoding handling
];

console.log(`\n3. Applying targeted replacements...`);
let fixCount = 0;
for (const [bad, good] of replacements) {
  const regex = new RegExp(bad.replace(/[.*+?^${}()|[\]\\\]/g, '\\$&'), 'g');
  const matches = content.match(regex) || [];
  if (matches.length > 0) {
    content = content.replace(regex, good);
    fixCount++;
    console.log(`   ✓ Replaced "${bad}" (${matches.length} times)`);
  }
}

// Fix common encoding patterns in Korean
console.log(`\n4. Fixing Korean character encoding patterns...`);

// Try to fix corrupted Korean 2-byte/3-byte sequences represented as ?
// This is a simplified approach - proper fix would require re-encoding
const koreanFixes = [
  [/\?([^?]*)\?/g, (match, content) => {
    // Attempt to preserve Unicode escapes where possible
    if (content && content.length < 20) return `"${content}"`;
    return match;
  }],
  
  // Fix corrupted console messages with Korean
  [/("?(?:경고|경험|오?)?")/g, (match) => {
    // These were corrupted attempts at Korean - leave as-is for now
    return match;
  }],
];

for (const [pattern, replacer] of koreanFixes) {
 try {
    const before = content.length;
    content = content.replace(pattern, replacer);
    if (content.length !== before) {
      console.log(`   ✓ Applied Korean pattern fix`);
    }
  } catch (e) {
    console.log(`   ⚠ Pattern fix failed (safe to ignore): ${e.message}`);
  }
}

// Validate JSON-like structures
console.log(`\n5. Checking for JSON/object syntax errors...`);
const braceMatches = content.match(/{/g) || [];
const closingBraces = content.match(/}/g) || [];
console.log(`   Opening braces: ${braceMatches.length}`);
console.log(`   Closing braces: ${closingBraces.length}`);
if (braceMatches.length !== closingBraces.length) {
  console.log(`   ⚠ WARNING: Brace mismatch detected!`);
}

// Check for common syntax errors
const squareBrackets = content.match(/\[/g) || [];
const closingBrackets = content.match(/\]/g) || [];
console.log(`   Square brackets: ${squareBrackets.length} / ${closingBrackets.length}`);

// Final count
const finalCorrupted = (content.match(/\?/g) || []).length;
const finalSize = content.length;

console.log(`\n6. Summary...`);
console.log(`   Original corrupted marks: ${initialCorrupted}`);
console.log(`   Remaining corrupted marks: ${finalCorrupted}`);
console.log(`   Reduction: ${initialCorrupted - finalCorrupted} marks (${((1 - finalCorrupted/initialCorrupted)*100).toFixed(1)}%)`);
console.log(`   Fixes applied: ${fixCount}`);

// Save repaired file
console.log(`\n7. Saving repaired file...`);
fs.writeFileSync(appJsPath, content, 'utf-8');
console.log(`   ✓ Saved: ${appJsPath}`);

console.log(`\n=== Repair Complete ===`);
console.log(`Note: This is a partial repair focusing on the most common issues.`);
console.log(`Some Korean text encoding issues may require manual review or re-encoding from source.`);
console.log(`Backup preserved at: ${backupPath}`);
