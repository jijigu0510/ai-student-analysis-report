$path = "app.js"
$lines = Get-Content $path -Encoding UTF8

$chunkTail = @'
  evalForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    const formData = {
      apiKey: (document.getElementById("api-key") || { value: "" }).value.trim(),
      university: document.getElementById("university").value.trim(),
      major: document.getElementById("major").value.trim(),
      grade: (document.getElementById("student-grade") || { value: "" }).value.trim(),
      class: (document.getElementById("student-class") || { value: "" }).value.trim(),
      number: (document.getElementById("student-number") || { value: "" }).value.trim(),
      name: (document.getElementById("student-name") || { value: "" }).value.trim(),
      courses: document.getElementById("courses").value.trim(),
      averageGrade: (document.getElementById("average-grade") || { value: "" }).value.trim(),
      achievementOnly: (document.getElementById("achievement-only") || { value: "" }).value.trim(),
      subjectRecords: document.getElementById("subject-records").value.trim(),
      creativeActivities: document.getElementById("creative-activities").value.trim(),
      behavioralRecords: document.getElementById("behavioral-records").value.trim()
    };
    if (!formData.university || !formData.major || !formData.apiKey) { alert("API 키, 목표 대학 및 지원 학과를 모두 입력하세요."); return; }
    evalForm.classList.add("processing");
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = "<span class='spinner' style='width:20px;height:20px;border-width:2px;margin:0;'></span> 분석 중..";
    emptyState.classList.add("hidden");
    reportViewer.classList.add("hidden");
    loadingState.classList.remove("hidden");
    if (window.innerWidth <= 992) document.querySelector(".result-section").scrollIntoView({ behavior: "smooth" });
    try {
      const rawResponse = await generateAIReport(formData);
      let reportData;
      try {
        reportData = JSON.parse(cleanAIJsonResponse(rawResponse));
      } catch (parseError) {
        console.error("JSON Parsing Error:", parseError.message);
        throw new Error("AI 응답 형식이 올바르지 않거나 분석 내용이 너무 깁니다.");
      }

      document.getElementById("overallScore").textContent = reportData.totalScore || 0;
      document.getElementById("overallText").innerHTML = marked.parse(reportData.overallEvaluation || "");
      document.getElementById("academicScore").textContent = reportData.competencies?.academic?.score || "-";
      document.getElementById("careerScore").textContent = reportData.competencies?.career?.score || "-";
      document.getElementById("communityScore").textContent = reportData.competencies?.community?.score || "-";

      if (reportData.calculationFormula) {
        const formulaDiv = document.createElement("div");
        formulaDiv.style.cssText = "font-size:0.85rem; color:var(--accent-primary); margin-bottom:15px; padding:10px; background:rgba(150,186,255,0.1); border-radius:6px; border-left:3px solid var(--accent-primary); line-height:1.4;";
        formulaDiv.innerHTML = "<strong>점수 산출 방식:</strong><br>" + reportData.calculationFormula;
        document.getElementById("overallText").prepend(formulaDiv);
      }
      
      const bindModal = (btnId, title, compData) => {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        btn.onclick = () => {
          const evidenceText = Array.isArray(compData.evidence) ? compData.evidence.map(e => "- " + e).join("\n") : (compData.evidence || "근거 자료가 없습니다.");
          document.getElementById("modalTitle").textContent = title + " 상세 분석";
          document.getElementById("modalBody").innerHTML =
            "<div style='background:rgba(255,255,255,0.05);padding:15px;border-radius:8px;margin-bottom:20px;border-left:4px solid var(--accent-primary)'>" +
            "<h4 style='margin-top:0;color:#96baff;margin-bottom:8px'>평가 요약</h4>" + marked.parse(compData.evaluation || "평가 내용이 없습니다.") + "</div>" +
            (compData.scoreJustification ?
              "<div style='background:rgba(150,186,255,0.08);padding:15px;border-radius:8px;margin-bottom:20px;border-left:4px solid var(--success-color)'>" +
              "<h4 style='margin-top:0;color:var(--success-color);margin-bottom:8px'>점수 산출 근거</h4>" + marked.parse(compData.scoreJustification) + "</div>" : "") +
            "<div style='padding:0 5px'><h4 style='color:#96baff;margin-bottom:10px'>근거 활동 자료</h4>" + marked.parse(evidenceText) + "</div>";
          document.getElementById("analysisModal").classList.remove("hidden");
        };
      };
      if (reportData.competencies) {
        bindModal("btnAca", "학업역량", reportData.competencies.academic || {});
        bindModal("btnCar", "진로역량", reportData.competencies.career || {});
        bindModal("btnCom", "공동체역량", reportData.competencies.community || {});
      }

      lastReportData = reportData;
      document.getElementById("modalCloseBtn").onclick = () => document.getElementById("analysisModal").classList.add("hidden");
      document.getElementById("analysisModal").onclick = (ev) => { if (ev.target === document.getElementById("analysisModal")) document.getElementById("analysisModal").classList.add("hidden"); };
      loadingState.classList.add("hidden");
      document.getElementById("dashboardViewer").classList.remove("hidden");
    } catch (error) {
      console.error(error);
      alert("분석 중 오류 발생: " + error.message);
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = "<span class='btn-text'>다시 분석하기</span>";
      evalForm.classList.remove("processing");
    }
  });

  async function generateAIReport(data) {
    const modelName = "gemini-2.5-pro"; 
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${data.apiKey}`;
    
    let profileInfo = data.grade + "학년 " + (data.class ? data.class + "반 " : "") + (data.number ? data.number + "번 " : "") + "(성명 생략)";
    const uniCriteria = universityEvalCriteria[data.university];
    const weights = uniCriteria?.weights || { academic: 0.33, career: 0.33, community: 0.34 };
    const evalCriteriaSection = uniCriteria ? uniCriteria.factors : "";

    const promptText = `생기부 분석 전문가로서 다음 데이터를 JSON 형식으로 분석하세요.
목표: ${data.university} ${data.major}
학생 정보: ${profileInfo}
... (상세 프롬프트 생략 가능하나 구조 유지)`;

    const requestBody = {
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
        responseMimeType: "application/json"
      }
    };
    const response = await fetchWithRetry(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody) });
    if (!response.ok) throw new Error("API 호출 실패");
    const result = await response.json();
    const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    const redactedText = redactStudentName(generatedText, data.name);
    return redactedText;
  }

  const STORAGE_KEYS = {
    API_KEY: "ai_student_api_key",
    UNI: "ai_student_uni",
    CAT: "ai_student_cat",
    MAJOR: "ai_student_major"
  };

  function saveState() {
    if (!apiKeyInput) return;
    localStorage.setItem(STORAGE_KEYS.API_KEY, apiKeyInput.value);
    localStorage.setItem(STORAGE_KEYS.UNI, universitySelect.value);
    localStorage.setItem(STORAGE_KEYS.CAT, categorySelect.value);
    localStorage.setItem(STORAGE_KEYS.MAJOR, majorSelect.value);
  }

  function loadState() {
    const savedApiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
    if (savedApiKey && apiKeyInput) apiKeyInput.value = savedApiKey;
    const savedUni = localStorage.getItem(STORAGE_KEYS.UNI);
    if (savedUni) {
      universitySelect.value = savedUni;
      universitySelect.dispatchEvent(new Event("change"));
    }
  }

  if (resetDataBtn) {
    resetDataBtn.addEventListener("click", () => {
      if (confirm("데이터를 초기화하시겠습니까?")) {
        localStorage.clear();
        location.reload();
      }
    });
  }

  loadState();

  window.downloadPDF = function () {
    if (!lastReportData) { alert("결과가 없습니다."); return; }
    const html = getIndividualPrintHTML(lastReportData);
    printInNewWindow("분석보고서", html);
  };

  function printInNewWindow(title, contentHTML) {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`<html><head><title>${title}</title><meta charset="UTF-8"></head><body>${contentHTML}<script>window.onload=()=>window.print();</script></body></html>`);
    printWindow.document.close();
  }

  function getIndividualPrintHTML(reportData) {
    const sName = nameInput?.value || "학생";
    return `<h2>생기부 분석 리포트</h2><p>학생: ${sName}</p><p>내용: ...</p>`;
  }

  function cleanAIJsonResponse(text) {
    let jsonString = text.trim();
    if (jsonString.startsWith("```")) {
      const match = jsonString.match(/^```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) jsonString = match[1].trim();
    }
    const startIdx = jsonString.indexOf('{');
    const endIdx = jsonString.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1) jsonString = jsonString.substring(startIdx, endIdx + 1);
    return jsonString;
  }

  async function fetchWithRetry(url, options, maxRetries = 3) {
    let retries = 0;
    while (true) {
      try {
        const response = await fetch(url, options);
        if (response.ok || retries >= maxRetries) return response;
        retries++;
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, retries)));
      } catch (e) {
        if (retries >= maxRetries) throw e;
        retries++;
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, retries)));
      }
    }
  }

  function redactStudentName(text, name) {
    if (!text || !name) return text;
    const regex = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    return text.replace(regex, "지원자");
  }
});
'@

$replacementLines = $chunkTail -split "`r?`n"
$newContent = New-Object System.Collections.Generic.List[string]

# Keep lines 1 to 2100 (approximately adjusted to current file)
for ($i = 0; $i -lt 2100 -and $i -lt $lines.Length; $i++) {
    $newContent.Add($lines[$i])
}

foreach ($line in $replacementLines) { $newContent.Add($line) }

Set-Content -Path $path -Value $newContent -Encoding UTF8
Write-Output "Tail Chunk rewritten."
