
document.addEventListener("DOMContentLoaded", () => {
  const evalForm = document.getElementById("evalForm");
  const analyzeBtn = document.getElementById("analyzeBtn");
  const emptyState = document.getElementById("emptyState");
  const loadingState = document.getElementById("loadingState");
  const reportViewer = document.getElementById("reportViewer");
  const resetDataBtn = document.getElementById("reset-data-btn");
  const apiKeyInput = document.getElementById("api-key");

  // --- \ud0ed \uc804\ud619 \ub85c\uc9c1 ---
  const tabIndividual = document.getElementById("tab-individual");
  const tabPassFail = document.getElementById("tab-passfail");
  const viewIndividual = document.getElementById("view-individual");
  const viewPassFail = document.getElementById("view-passfail");

  if (tabIndividual && tabPassFail && viewIndividual && viewPassFail) {
    const switchTab = (activeTab, inactiveTab, activeView, inactiveView) => {
      activeTab.classList.add("active");
      inactiveTab.classList.remove("active");
      activeView.classList.remove("hidden");
      activeView.classList.add("active");
      activeView.style.display = "grid";
      inactiveView.classList.add("hidden");
      inactiveView.classList.remove("active");
      inactiveView.style.display = "none";
    };

    tabIndividual.addEventListener("click", () => {
      switchTab(tabIndividual, tabPassFail, viewIndividual, viewPassFail);
    });

    tabPassFail.addEventListener("click", () => {
      switchTab(tabPassFail, tabIndividual, viewPassFail, viewIndividual);
    });
  }

  // --- \ud569\ubd88\ud569 \ubd84\uc11d \uad00\ub828 \uc5d8\ub9ac\uba3c\ud2b8 ---
  const pfResultsUpload = document.getElementById("pf-results-upload");
  const pfUploadCourse = document.getElementById("pf-upload-course");
  const pfUploadSubject = document.getElementById("pf-upload-subject");
  const pfUploadCreative = document.getElementById("pf-upload-creative");
  const pfUploadBehavior = document.getElementById("pf-upload-behavior");
  const pfStudentSelect = document.getElementById("pf-student-select");
  const pfStudentUniv = document.getElementById("pf-student-univ");
  const pfStudentDept = document.getElementById("pf-student-dept");
  const pfStudentResult = document.getElementById("pf-student-result");
  const pfStudentDetailSection = document.getElementById("pf-student-details");
  const pfDetailGrades = document.getElementById("pf-detail-grades");
  const pfDetailSubject = document.getElementById("pf-detail-subject");
  const pfDetailCareer = document.getElementById("pf-detail-career");
  const pfDetailArts = document.getElementById("pf-detail-arts");

  const pfAnalyzeBtn = document.getElementById("pf-analyzeBtn");
  const pfApiKeyInput = document.getElementById("pf-api-key");
  const pfForm = document.getElementById("passfailForm");
  
  const pfResultContainer = document.getElementById("pf-resultContainer");
  const pfEmptyState = document.getElementById("pf-emptyState");
  const pfLoadingState = document.getElementById("pf-loadingState");
  const pfReportViewer = document.getElementById("pf-reportViewer");

  let pfLastReportStr = ""; 
  let pfLastStudentInfo = null; 

  const pfPdfDownloadBtn = document.getElementById("pf-pdfDownloadBtn");
  const pfPdfAction = document.getElementById("pf-pdfAction");

  let pfStudents = [];
  let pfRecords = {};

  if (pfResultsUpload) {
    pfResultsUpload.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(evt) {
        try {
          const workbook = XLSX.read(new Uint8Array(evt.target.result), { type: "array" });
          const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
          pfStudents = [];
          pfStudentSelect.innerHTML = "<option value='' disabled selected>\ud559\uc0dd\uc744 \uc120\ud0dd\ud558\uc138\uc694</option>";
          
          let headerRowIdx = -1, nameCol = -1, univCol = -1, deptCol = -1, typeCol = -1, resultCol = -1, gradeCol = -1;
          for (let i = 0; i < Math.min(jsonData.length, 50); i++) {
            if (!jsonData[i]) continue;
            for (let j = 0; j < jsonData[i].length; j++) {
              const cell = String(jsonData[i][j] || "").replace(/\s+/g, "");
              if (cell.includes("\uc131\uba85") || cell.includes("\uc774\ub984")) { nameCol = j; headerRowIdx = i; }
              else if (cell.includes("\ub300\ud559")) univCol = j;
              else if (cell.includes("\ud559\uacfc") || cell.includes("\ubaa8\uc9d1\ub2e8\uc704")) deptCol = j;
              else if (cell === "\uc804\ud615\uc720\ud615" || cell.includes("\uc804\ud615\uc720\ud615")) typeCol = j;
              else if (cell === "\uc77c\ubc18\ub4f1\uae09") gradeCol = j; 
              else if (gradeCol === -1 && cell.includes("\uc77c\ubc18\ub4f1\uae09") && !cell.includes("5\ub4f1\uae09")) gradeCol = j; 
              else if (cell.includes("\uccd4\uc885\ub2e8\uacc4")) resultCol = j; 
              else if (resultCol === -1 && (cell.includes("\uccd4\uc885") || cell.includes("\uacb0\uacfc") || cell.includes("\ud569\ubd88") || cell.includes("\ud569\uaca9\uc5ec\ubd80"))) resultCol = j; 
            }
            if (headerRowIdx !== -1) break;
          }
          if (headerRowIdx === -1 || nameCol === -1) { alert("\uacb0\uacfc \ud30c\uc77c\uc5d0\uc11c '\uc131\uba85' \uc5f4\uc744 \ucc3e\uc9c0 \ubaa8\ud588\uc2b5\ub2c8\ub2e4."); return; }
          
          for (let i = headerRowIdx + 1; i < jsonData.length; i++) {
            const row = jsonData[i]; if (!row || !row[nameCol]) continue;
            const name = String(row[nameCol]).replace(/\s+/g, "");
            const univ = univCol !== -1 ? String(row[univCol] || "").trim() : "";
            const dept = deptCol !== -1 ? String(row[deptCol] || "").trim() : "";
            const grade = gradeCol !== -1 ? String(row[gradeCol] || "").trim() : "";
            const admissionType = typeCol !== -1 ? String(row[typeCol] || "").trim() : "";
            
            let rawResult = resultCol !== -1 ? String(row[resultCol] || "").replace(/\s+/g, "") : "";
            let result = "";
            if (rawResult.includes("\ubd88\ud569") || rawResult.includes("\ud0c8\ub77d") || rawResult === "\ubd80") result = "\ubd88\ud569\uaca9";
            else if (rawResult.includes("\ucda9\uc6d0") || rawResult.includes("\ucd94\ud569") || rawResult.includes("\uc608\ube44")) result = "\ucda9\uc6d0\ud569\uaca9";
            else if (rawResult.includes("\ud569\uaca9") || rawResult.includes("\uccd4\ucd08") || rawResult === "\ud569") result = "\ud569\uaca9";
            else result = rawResult;
            
            pfStudents.push({ name, univ, dept, result, type: admissionType, grade });
            const option = document.createElement("option");
            option.value = pfStudents.length - 1; 
            option.textContent = `[${univ} ${dept}] ${name} - ${result}`;
            pfStudentSelect.appendChild(option);
          }
          alert(`\ubd84\uc11d \uc644\ub8cc: \ud559\uc0dd\ubd80\uc885\ud569 \uc804\ud615 \ub300\uc0c1\uc790 \ucd1d ${pfStudents.length}\uba85\uc758 \ub370\uc774\ud130\ub97c \ucd94\ucd9c\ud588\uc2b5\ub2c8\ub2e4.`);
          saveState();
        } catch(err) { console.error(err); alert("\uacb0\uacfc \uc5d1\uc140 \ubd84\uc11d \uc624\ub958"); }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  async function handlePfRecordsUpload(e, category) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    let processedCount = 0;
    for (const file of files) {
      if (file.name.toLowerCase().endsWith(".xlsx") || file.name.toLowerCase().endsWith(".xls")) {
        try {
          const buffer = await file.arrayBuffer();
          const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
          const allRows = [];
          for (const sheetName of workbook.SheetNames) {
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
            if (rows.length > 0) allRows.push(...rows);
          }
          let headerRowIdx = -1, nameCol = -1, subjectCol = -1, contentCol = -1;
          for (let i = 0; i < Math.min(allRows.length, 10); i++) {
            if (!allRows[i]) continue;
            for (let j = 0; j < allRows[i].length; j++) {
              const cell = String(allRows[i][j] || "").replace(/\s+/g, "");
              if (cell === "\uc131\uba85") { nameCol = j; headerRowIdx = i; }
              else if (cell.includes("\uacfc\ubaa9") || cell.includes("\uad50\uacfc")) subjectCol = j;
              else if (cell.includes("\uc138\ubd80\ub2a5\ub825") || cell.includes("\ub0b4\uc6a9")) contentCol = j;
            }
            if (headerRowIdx !== -1 && nameCol !== -1) break;
          }
          if (headerRowIdx !== -1) {
            let currentMatchedName = "";
            for (let i = headerRowIdx + 1; i < allRows.length; i++) {
              const row = allRows[i]; if (!row) continue;
              const rawName = String(row[nameCol] || "").trim();
              if (rawName) currentMatchedName = rawName.replace(/\s+/g, "");
              if (!currentMatchedName) continue;
              if (!pfRecords[currentMatchedName]) pfRecords[currentMatchedName] = { courses:[], subject:"", creative:"", behavior:"" };
              const rowText = row.map(c => String(c||"").trim()).filter(c=>c).join(" | ");
              if (category === "course") pfRecords[currentMatchedName].courses.push(rowText);
              else if (category === "subject") {
                const subName = subjectCol !== -1 ? String(row[subjectCol] || "").trim() : "\uae30\ud0c0";
                const subContent = contentCol !== -1 ? String(row[contentCol] || "").trim() : rowText;
                pfRecords[currentMatchedName].subject += `${subName}: ${subContent}\n`;
              }
              else if (category === "creative") pfRecords[currentMatchedName].creative += rowText + "\n";
              else if (category === "behavior") pfRecords[currentMatchedName].behavior += rowText + "\n";
            }
            processedCount++;
          }
        } catch(err) { console.error("Excel Parsing Error:", err); }
      }
    }
    alert(`\ud574\ub2f9 \ud56d\ubaa9\uc5d0 \ub300\ud574 ${processedCount}\uac74\uc758 \ud30c\uc77c\uc744 \ucc98\ub9ac\ud588\uc2b5\ub2c8\ub2e4.`);
    saveState();
  }

  if (pfUploadCourse) pfUploadCourse.addEventListener("change", (e) => handlePfRecordsUpload(e, "course"));
  if (pfUploadSubject) pfUploadSubject.addEventListener("change", (e) => handlePfRecordsUpload(e, "subject"));
  if (pfUploadCreative) pfUploadCreative.addEventListener("change", (e) => handlePfRecordsUpload(e, "creative"));
  if (pfUploadBehavior) pfUploadBehavior.addEventListener("change", (e) => handlePfRecordsUpload(e, "behavior"));

  if (pfStudentSelect) {
    pfStudentSelect.addEventListener("change", () => {
      const selectedIdx = pfStudentSelect.value;
      const studentInfo = pfStudents[selectedIdx];
      if (studentInfo) {
        pfStudentUniv.value = studentInfo.univ;
        pfStudentDept.value = studentInfo.dept;
        pfStudentResult.value = studentInfo.result;
        const name = studentInfo.name;
        const record = pfRecords[name];
        if (record && pfStudentDetailSection) {
          pfStudentDetailSection.style.display = "block";
          pfDetailGrades.value = record.courses.length > 0 ? record.courses.join("\n") : "\uc131\uc801 \ub370\uc774\ud130\uac00 \uc5c6\uc2b5\ub2c8\ub2e4.";
          const subjectLines = record.subject.split("\n").filter(line => line.trim());
          let generalText = "", careerText = "", artsText = "";
          subjectLines.forEach(line => {
            const partBeforeColon = line.split(":")[0].trim();
            if (partBeforeColon.includes("\uc74c\uc545") || partBeforeColon.includes("\ubbf8\uc220") || partBeforeColon.includes("\uccb4\uc721")) artsText += line + "\n";
            else if (partBeforeColon.includes("\uc9c4\ub85c")) careerText += line + "\n";
            else generalText += line + "\n";
          });
          pfDetailSubject.value = generalText.trim() || "\uc77c\ubc18 \uad50\uacfc \uc138\ud2b9 \ub370\uc774\ud130\uac00 \uc5c6\uc2b5\ub2c8\ub2e4.";
          pfDetailCareer.value = careerText.trim() || "\uc9c4\ub85c\uc120\ud0dd \uad50\uacfc \uc138\ud2b9 \ub370\uc774\ud130\uac00 \uc5c6\uc2b5\ub2c8\ub2e4.";
          pfDetailArts.value = artsText.trim() || "\uc74c\ubbf8\uccb4 \uad50\uacfc \uc138\ud2b9 \ub370\uc774\ud130\uac00 \uc5c6\uc2b5\ub2c8\ub2e4.";
        } else if (pfStudentDetailSection) {
          pfStudentDetailSection.style.display = "none";
        }
        saveState();
      }
    });
  }

  if (pfForm) {
    pfForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const apiKey = pfApiKeyInput.value.trim();
      const selectedIdx = pfStudentSelect.value;
      if (selectedIdx === "") { alert("\ud559\uc0dd\uc744 \uc120\ud0dd\ud574\uc8fc\uc138\uc694."); return; }
      const studentInfo = pfStudents[selectedIdx];
      const studentName = studentInfo.name;
      const univ = studentInfo.univ;
      const result = studentInfo.result;
      if (!apiKey) { alert("API \ud0a4\ub97c \ud544\uc218\ub85c \uc785\ub825\ud574\uc8fc\uc138\uc694."); return; }

      pfEmptyState.classList.add("hidden");
      pfReportViewer.classList.add("hidden");
      pfLoadingState.classList.remove("hidden");
      pfAnalyzeBtn.disabled = true;

      const modelName = "gemini-2.5-pro"; 
      const promptText = `\ud569\ubd88\ud569 \ubd84\uc11d \ud504\ub86c\ud504\ud2b8... (\uc0dd\ub7b5)`;

      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
        });
        if (!response.ok) throw new Error(`API \uc694\uccad \uc2e4\ud328(${response.status})`);
        const resData = await response.json();
        const text = resData.candidates?.[0]?.content?.parts?.[0]?.text || "AI \uc751\ub2f5 \uc624\ub958";
        pfLastReportStr = text;
        pfReportViewer.innerHTML = marked.parse(text);
        pfReportViewer.classList.remove("hidden");
        pfPdfAction.classList.remove("hidden");
        pfLoadingState.classList.add("hidden");
        pfAnalyzeBtn.disabled = false;
      } catch (err) {
        console.error(err);
        alert("\ubd84\uc11d \uc911 \uc624\ub958 \ubc1c\uc0dd: " + err.message);
        pfLoadingState.classList.add("hidden");
        pfAnalyzeBtn.disabled = false;
      }
    });
  }

  if (pfPdfDownloadBtn) {
    pfPdfDownloadBtn.addEventListener("click", () => {
      window.print();
    });
  }

  function saveState() {}
});
