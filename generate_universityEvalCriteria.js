const fs = require('fs');
const vm = require('vm');
const path = require('path');

const appJsPath = path.join(__dirname, 'app.js');
const outJsonPath = path.join(__dirname, 'universityEvalCriteria.json');

const appSource = fs.readFileSync(appJsPath, 'utf-8');
const marker = 'const universityEvalCriteriaLegacy = ';
const startIndex = appSource.indexOf(marker);
if (startIndex === -1) {
  console.error('universityEvalCriteriaLegacy declaration not found in app.js');
  process.exit(1);
}

const objStart = appSource.indexOf('{', startIndex + marker.length);
if (objStart === -1) {
  console.error('Could not find opening brace for universityEvalCriteriaLegacy');
  process.exit(1);
}

let i = objStart;
let depth = 0;
let inString = false;
let stringChar = '';
let escaped = false;
let inTemplate = false;

for (; i < appSource.length; i++) {
  const ch = appSource[i];

  if (escaped) {
    escaped = false;
    continue;
  }
  if (inTemplate) {
    if (ch === '`') inTemplate = false;
    else if (ch === '\\') escaped = true;
    continue;
  }
  if (inString) {
    if (ch === '\\') escaped = true;
    else if (ch === stringChar) inString = false;
    continue;
  }

  if (ch === '`') {
    inTemplate = true;
    continue;
  }
  if (ch === '"' || ch === "'") {
    inString = true;
    stringChar = ch;
    continue;
  }

  if (ch === '{') depth += 1;
  else if (ch === '}') {
    depth -= 1;
    if (depth === 0) break;
  }
}

if (depth !== 0) {
  console.error('Brace matching failed, depth', depth);
  process.exit(1);
}

const objectText = appSource.slice(objStart, i + 1);
const parsed = vm.runInNewContext('(' + objectText + ')');
fs.writeFileSync(outJsonPath, JSON.stringify(parsed, null, 2), 'utf-8');
console.log('Generated universityEvalCriteria.json (from app.js)');
