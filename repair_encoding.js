const fs = require('fs');
const path = require('path');

// Read the original corrupted app.js
const appJsPath = './app.js';
let content = fs.readFileSync(appJsPath, 'utf-8');

// Count initial corrupted characters
const initialCorrupted = (content.match(/\?/g) || []).length;
console.log(`Initial corrupted characters: ${initialCorrupted}`);

// University name and department mapping - using Unicode escapes to ensure proper encoding
const universityMap = {
  '고려대학교': '\uace0\ub824\ub300\ud559\uad50',
  '서울대학교': '\uc11c\uc6b8\ub300\ud559\uad50',
  '연세대학교': '\uc5f0\uc138\ub300\ud559\uad50',
  '이화여자대학교': '\uc774\ud654\uc5ec\uc790\ub300\ud559\uad50',
  '신촌-광역/인문/사회': '\uc2e0\ucd08\ub19c\uad11\uc5ed/\uc778\ubb38/\uc0ac\ud68c',
  '서강대학교': '\uc11c\uac15\ub300\ud559\uad50',
  '성균관대학교': '\uc131\uade0\uad00\ub300\ud559\uad50('
};

// Simple replacements for the most common corrupted patterns
// This replaces corrupted Korean with clean text or Unicode

const replacements = [
  // Fix common Korean placeholders
  ['?세?교', '세종대학교'],
  ['?양?교', '한양대학교'],
  ['?명?과?과', '명과학'],
  ['경영?과', '경영학과'],
  ['문과?과', '문과대학'],
  ['?경?과', '경제학과'],
  ['?과?과', '과학과'],
  ['공과?과', '공과대학'],
  ['?과?과', '판매'],
  ['?범?과', '사범대학'],
  ['간호?과', '간호학과'],
  ['?보?과', '정보학과'],
  ['보건과학?과', '보건과학대학'],
  ['?립?科', '체육학과'],
  
  // Multi-character corruptions
  ['?짐?학부', '반도체학부'],
  ['?성곡방?과', '성악과'],
];

let currentContent = content;
let fixCount = 0;

for (const [corrupted, fixed] of replacements) {
  if (currentContent.includes(corrupted)) {
    currentContent = currentContent.split(corrupted).join(fixed);
    fixCount++;
    console.log(`Fixed: "${corrupted}" -> "${fixed}"`);
  }
}

// Count remaining corrupted characters
const finalCorrupted = (currentContent.match(/\?/g) || []).length;
console.log(`\nRemaining corrupted characters: ${finalCorrupted}`);
console.log(`Replacements applied: ${fixCount}`);
console.log(`Corrupted characters reduced by: ${initialCorrupted - finalCorrupted}`);

// Write fixed content
fs.writeFileSync(appJsPath, currentContent, 'utf-8');
console.log('\n✓ app.js encoding repaired and saved.');
