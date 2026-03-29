const assert = require('assert');

function sanitize(cleanedText) {
  let inString = false;
  let isEscaped = false;
  let sanitized = '';
  for (let i = 0; i < cleanedText.length; i++) {
    const char = cleanedText[i];
    if (inString) {
      if (char === '"' && !isEscaped) {
        inString = false;
        sanitized += char;
      } else if (char === '\\') {
        isEscaped = !isEscaped;
        sanitized += char;
      } else if (char === '\n') {
        sanitized += '\\n';
        isEscaped = false;
      } else if (char === '\r') {
        isEscaped = false; // ignore \r
      } else if (char === '\t') {
        sanitized += '\\t';
        isEscaped = false;
      } else {
        sanitized += char;
        isEscaped = false;
      }
    } else {
      if (char === '"') inString = true;
      sanitized += char;
    }
  }
  return sanitized;
}

// Tests
const test1 = `{
  "key": "value \\" quotes \\" and \\\\ backslash"
}`;
console.log("Original:", test1);
const s1 = sanitize(test1);
console.log("Sanitized:", s1);
JSON.parse(s1); // should not throw

const test2 = `{
  "key": "value
newline"
}`;
// test2 has a literal unescaped newline.
const s2 = sanitize(test2);
console.log("Sanitized 2:", s2);
JSON.parse(s2); // should not throw

const test3 = `{ "a": "value",
"b": "value" }`;
// test3 has a newline OUTSIDE a string
const s3 = sanitize(test3);
console.log("Sanitized 3:", s3);
JSON.parse(s3);

console.log("All tests passed");
