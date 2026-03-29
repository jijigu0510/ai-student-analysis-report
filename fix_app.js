const fs = require('fs');
let lines = fs.readFileSync('app.js', 'utf8').split('\n');

const startIdx = lines.findIndex((l, i) => i > 3700 && i < 3900 && l.trim().startsWith('const compHtml = compRows.map('));
const endIdx = lines.findIndex((l, i) => i > 4250 && i < 4350 && l.trim() === '}' && lines[i+1] && lines[i+1].includes('.print-header {'));

console.log("StartIdx:", startIdx, "EndIdx:", endIdx);

if (startIdx !== -1 && endIdx !== -1) {
const cleanStartText = `    const compHtml = compRows.map(r => \`
      <div style="margin-bottom:0.8rem;padding:0.6rem 1rem;background:rgba(255,255,255,0.04);border-radius:8px;border-left:3px solid rgba(255,255,255,0.15);">
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.3rem;flex-wrap:wrap;">
          <span style="\${r.badge}">\${r.icon} \${r.label}</span>
          <span style="color:#61b3ff;font-weight:800;font-size:1rem;">\${r.pct}%</span>
          <div style="flex:1;min-width:80px;height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;">
            <div style="width:\${r.pct}%;height:100%;background:linear-gradient(90deg,#61b3ff,#96d6b0);border-radius:3px;"></div>
          </div>
        </div>
        <div style="font-size:0.82rem;color:#b0c4de;line-height:1.5;">\${r.desc}</div>
      </div>\`).join("");

    targetEl.innerHTML = \`
      <div style="
        background: linear-gradient(135deg, rgba(30,40,70,0.95) 0%, rgba(20,30,60,0.95) 100%);
        border: 1px solid rgba(97,179,255,0.25);
        border-radius: 14px;
        padding: 1.2rem 1.5rem;
        margin-bottom: 1.2rem;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      ">
        <div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:1rem;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:0.8rem;">
          <span style="font-size:1.2rem;">🏫</span>
          <h4 style="margin:0;font-size:1rem;font-weight:700;color:#96baff;">
            \${universityName} 서류평가 기준 &amp; 반영 비율
          </h4>
        </div>

        <!-- 역량별 반영비율 -->
        <div style="margin-bottom:1rem;">
          \${compHtml}
        </div>

        <!-- 평가 기준 상세 (접기/펼치기) -->
        <details style="cursor:pointer;">
          <summary style="
            font-size:0.88rem; font-weight:600; color:#7cb9ff;
            list-style:none; display:flex; align-items:center; gap:0.4rem;
            user-select:none;
          ">
            <span>▶</span> 평가 주안점 상세 보기
          </summary>
          <div style="
            margin-top:0.8rem; padding:0.8rem 1rem;
            background:rgba(0,0,0,0.2); border-radius:8px;
            font-size:0.82rem; color:#ccc; line-height:1.8;
            max-height:320px; overflow-y:auto;
          ">
            \${factorsToHtml(factors)}
          </div>
        </details>
      </div>\`;
    targetEl.style.display = "block";
  }
  // -------------------------------------------------------------------------
  function printWithIframe(htmlContent) {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(\`
      <!DOCTYPE html>
      <html>
      <head>
        <title>학생 분석 리포트 - 부안고등학교</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.2.0/github-markdown.min.css">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Outfit:wght@400;600;700;800&display=swap');
          body { 
            padding: 40px; 
            font-family: 'Outfit', 'Inter', -apple-system, sans-serif; 
            background: white;
          }
          .markdown-body { 
            background: white !important; 
            font-size: 14px; 
            color: #111;
          }`;
  lines.splice(startIdx, endIdx - startIdx + 1, cleanStartText);
  fs.writeFileSync('app.js', lines.join('\n'), 'utf8');
  console.log('Fixed corrupted block!');
} else {
  console.log('Could not find start or end block!');
}
