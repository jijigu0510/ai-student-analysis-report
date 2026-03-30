const fs = require('fs');
const content = fs.readFileSync('c:/Users/user/OneDrive - 부안고등학교/부안고등학교(1)/프로그램/setuek/app.js');

// Try interpreting as utf-8 and euc-kr
const tryEncoding = (enc) => {
    let str;
    try {
        const iconv = require('iconv-lite');
        str = iconv.decode(content, enc);
    } catch(e) {
        str = content.toString(enc);
    }
    
    const lines = str.split(/\r?\n/);
    let found = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('학생부위주') || line.includes('일반등급') || line.includes('최종단계') || line.includes('전형유형')) {
            console.log(`[Line ${i+1}] ${line}`);
            found = true;
        }
    }
    return found;
};

// we might not have iconv-lite, so just string reading
const tryBuffer = () => {
    const decoders = new TextDecoder('utf-8');
    const strUtf8 = decoders.decode(content);
    const lines = strUtf8.split(/\r?\n/);
    lines.forEach((line, i) => {
        if (line.includes('학생부') || line.includes('일반등급') || line.includes('최종단계') || line.includes('전형유형') || line.includes('합불')) {
            console.log(`[${i+1}] ` + line.trim());
        }
    });
};

try {
    tryBuffer();
} catch (e) {
    console.error(e);
}
