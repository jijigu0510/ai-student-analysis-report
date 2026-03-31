const fs = require('fs');
const path = require('path');

const sharedStringsPath = 'c:/Users/user/OneDrive - 부안고등학교/부안고등학교(1)/프로그램/setuek_1/tmp_curriculum/xl/sharedStrings.xml';
const sheet1Path = 'c:/Users/user/OneDrive - 부안고등학교/부안고등학교(1)/프로그램/setuek_1/tmp_curriculum/xl/worksheets/sheet1.xml';

const sharedStringsContent = fs.readFileSync(sharedStringsPath, 'utf8');
const sheet1Content = fs.readFileSync(sheet1Path, 'utf8');

// Simple regex to extract <si><t>...</t></si> strings
const strings = [];
const siMatches = sharedStringsContent.matchAll(/<si>(.*?)<\/si>/g);
for (const match of siMatches) {
    const tMatch = match[1].match(/<t>(.*?)<\/t>/);
    strings.push(tMatch ? tMatch[1] : "");
}

// Simple regex to extract rows and cells
const rows = [];
const rowMatches = sheet1Content.matchAll(/<row r="(\d+)"[^>]*>(.*?)<\/row>/g);
for (const rowMatch of rowMatches) {
    const rowNum = rowMatch[1];
    if (rowNum === "1") continue; // Header

    const cells = [];
    const cellMatches = rowMatch[2].matchAll(/<c r="([A-Z])\d+" t="s"><v>(\d+)<\/v><\/c>/g);
    const cellData = {};
    for (const cellMatch of cellMatches) {
        cellData[cellMatch[1]] = strings[parseInt(cellMatch[2])];
    }
    rows.push(cellData);
}

const hierarchy = {};

rows.forEach(row => {
    const cur = row['A'];
    const cat = row['B'];
    const sel = row['C'];
    const sub = row['D'];

    if (!cur || !cat || !sel || !sub) return;

    if (!hierarchy[cur]) hierarchy[cur] = {};
    if (!hierarchy[cur][cat]) hierarchy[cur][cat] = {};
    if (!hierarchy[cur][cat][sel]) hierarchy[cur][cat][sel] = [];
    if (!hierarchy[cur][cat][sel].includes(sub)) {
        hierarchy[cur][cat][sel].push(sub);
    }
});

console.log(JSON.stringify(hierarchy, null, 2));
