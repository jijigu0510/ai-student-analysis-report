const fs = require('fs');
let lines = fs.readFileSync('app.js', 'utf8').split('\n');

const startIdx = lines.findIndex((l, i) => i > 4200 && l.trim() === 'async function generateSetechReport(fd) {');
const endIdx = lines.findIndex((l, i) => i > startIdx && l === '  }');

console.log('startIdx', startIdx, 'endIdx', endIdx);

if (startIdx !== -1 && endIdx !== -1) {
  const replaceStr = `  async function generateSetechReport(fd) {
    const defaultWeights = { academic: 0.40, career: 0.40, community: 0.20 };
    const defaultCompetencies = {
      academic: "학업역량: 학업 우수성·태도, 탐구력·지적호기심, 전공관련교과역량",
      career: "진로역량: 전공(계열)적합성, 진로탐색노력, 전공관련활동 심화도",
      community: "공동체역량: 협력·소통, 나눔·배려·리더십"
    };

    const uniCriteria = universityEvalCriteria[fd.university];
    const univProfile = uniCriteria ? uniCriteria.factors : (univSetechProfile[fd.university] || "학생부종합전형의 일반적 기준(학업역량·진로역량·공동체역량)에 따라 평가합니다.");
    const weights = uniCriteria?.weights || defaultWeights;
    const comps = uniCriteria?.competencies || defaultCompetencies;
    
    // 계산된 만점
    const maxAca = Math.round(weights.academic * 100);
    const maxCar = Math.round(weights.career * 100);
    const maxCom = Math.round(weights.community * 100);

    const prompt = \`당신은 대한민국 최고의 대학입학사정관 전문가입니다.
다음 학생이 지원하는 대학·학과의 학생부종합전형 기준에 따라, 교사가 작성한 세부능력 및 특기사항(세특)을 엄격하게 평가해 주세요.

[대학·계열·학과]
대학: \${fd.university} / 계열: \${fd.category} / 학과: \${fd.major}\${fd.subjectName ? " / 과목: " + fd.subjectName : ""}

[해당 대학 학생부종합전형 특성 및 평가 주안점]
\${univProfile}

[평가 기준 및 배점]
해당 대학의 실제 평가 배점을 적용하여 총점 100점 만점으로 평가합니다.
1. 학업역량 (최대 \${maxAca}점): \${comps.academic}
2. 진로역량 (최대 \${maxCar}점): \${comps.career}
3. 공동체역량 (최대 \${maxCom}점): \${comps.community}

[세특 원문]
\${fd.content}

[주의사항]
- 반드시 JSON만 출력하고, 코드 블록이나 마크다운 없이 순수 JSON만 리턴하세요.
- 세특이 짧거나 내용이 빈약할 경우 낮은 점수를 부여하고 구체적 이유를 작성하세요.
- rewriteSuggestion은 원문을 기반으로 실제로 개선된 세특 전문을 작성하세요(300자 이상).
- 점수가 일치해야 합니다 (totalScore = academicScore + careerScore + communityScore).

출력 JSON 형식:
{"totalScore":<0-100>,"academicScore":<0-\${maxAca}>,"careerScore":<0-\${maxCar}>,"communityScore":<0-\${maxCom}>,"scoreJustification":"<마크다운 소제목 구분 산출근거>","strengths":"<블릿문 3~5개>","improvements":"<블릿문 3~5개 + 구체적 이유>","rewriteSuggestion":"<개선된 세특 전문>"}\`;

    const API_URL = \`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=\${fd.apiKey}\`;
    const body = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.35, maxOutputTokens: 4096 }
    };

    let lastErr;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          const msg = errBody?.error?.message || res.statusText;
          if (res.status === 429 && attempt < 3) {
            await new Promise(r => setTimeout(r, attempt * 4000));
            continue;
          }
          throw new Error("API 오류: " + msg);
        }
        const data = await res.json();
        return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      } catch (err) {
        lastErr = err;
        if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 3000));
      }
    }
    throw lastErr;
  }`;

  lines.splice(startIdx, endIdx - startIdx + 1, replaceStr);
  fs.writeFileSync('app.js', lines.join('\n'), 'utf8');
  console.log('Fixed generateSetechReport!');
} else {
  console.log('Not found:', startIdx, endIdx);
}
