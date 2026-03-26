$path = "app.js"
$lines = Get-Content $path -Encoding UTF8

$chunk1 = @'
document.addEventListener("DOMContentLoaded", () => {
  const evalForm = document.getElementById("evalForm");
  const analyzeBtn = document.getElementById("analyzeBtn");
  const emptyState = document.getElementById("emptyState");
  const loadingState = document.getElementById("loadingState");
  const reportViewer = document.getElementById("reportViewer");
  const resetDataBtn = document.getElementById("reset-data-btn");
  const apiKeyInput = document.getElementById("api-key");

  // --- 탭 전환 로직 ---
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

  // --- [합불합 분석] 초기화 ---
  const pfResultsUpload = document.getElementById("pf-results-upload");
  const pfStudentSelect = document.getElementById("pf-student-select");
  const pfStudentDetailSection = document.getElementById("pf-student-details");
  
  if (pfResultsUpload) {
    pfResultsUpload.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (evt) {
        try {
          const workbook = XLSX.read(new Uint8Array(evt.target.result), { type: "array" });
          const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
          if (!pfStudentSelect) return;
          pfStudentSelect.innerHTML = "<option value='' disabled selected>학생을 선택하세요</option>";
          pfStudents = [];
          
          let headerRowIdx = -1, nameCol = -1, univCol = -1, deptCol = -1, resultCol = -1, typeCol = -1;
          for(let i=0; i<Math.min(rows.length, 20); i++) {
            const rowStr = rows[i].join("");
            if(rowStr.includes("성명") || rowStr.includes("이름")) { headerRowIdx = i; break; }
          }
          
          if(headerRowIdx !== -1) {
            const header = rows[headerRowIdx];
            nameCol = header.findIndex(c => c && String(c).includes("성명"));
            univCol = header.findIndex(c => c && String(c).includes("대학교"));
            deptCol = header.findIndex(c => c && String(c).includes("모집단위"));
            resultCol = header.findIndex(c => c && String(c).includes("최종단계"));
            typeCol = header.findIndex(c => c && String(c).includes("전형명"));
            
            for(let i=headerRowIdx+1; i<rows.length; i++){
              const row = rows[i];
              const name = nameCol !== -1 ? String(row[nameCol]||"").trim() : "";
              if(!name || name === "undefined") continue;
              const univ = univCol !== -1 ? String(row[univCol]||"").trim() : "";
              const dept = deptCol !== -1 ? String(row[deptCol]||"").trim() : "";
              const admissionType = typeCol !== -1 ? String(row[typeCol]||"").trim() : "";
              
              let rawResult = resultCol !== -1 ? String(row[resultCol]||"").replace(/\s+/g,"") : "";
              let result = "확인불가";
              if (rawResult.includes("불합격") || rawResult.includes("탈락") || rawResult === "불") result = "불합격";
              else if (rawResult.includes("충원") || rawResult.includes("추합") || rawResult.includes("예비")) result = "충원합격";
              else if (rawResult.includes("합격") || rawResult.includes("최초") || rawResult === "합") result = "합격";
              
              pfStudents.push({ name, univ, dept, result, type: admissionType });
              const option = document.createElement("option");
              option.value = pfStudents.length - 1;
              option.textContent = `[${univ} ${dept}] ${name} - ${result}`;
              pfStudentSelect.appendChild(option);
            }
          }
          alert(`추출 완료: ${pfStudents.length}명`);
        } catch(err) { console.error(err); alert("오류 발생"); }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  const universitySelect = document.getElementById("university");
  const categorySelect = document.getElementById("category");
  const majorSelect = document.getElementById("major");
  const studentSelect = document.getElementById("student-select");
  const excelUpload = document.getElementById("excel-upload");
  const courseExcelUpload = document.getElementById("course-excel-upload");
  const batchExcelUpload = document.getElementById("batch-excel-upload");
  
  const gradeInput = document.getElementById("student-grade");
  const classInput = document.getElementById("student-class");
  const numberInput = document.getElementById("student-number");
  const nameInput = document.getElementById("student-name");
  const subjectInput = document.getElementById("subject-records");
  const creativeInput = document.getElementById("creative-activities");
  const behaviorInput = document.getElementById("behavioral-records");

  let globalCourseJson = null;
  let globalBatchJsons = [];
  let pfStudents = []; 
  let pfRecords = {}; 
  let lastReportData = null;

  const universityEvalCriteria = {
      "서울대학교": {
        factors: `[2025 서울대학교 가이드북 반영] 학업능력(40%), 탐구역량(40%), 잠재역량(20%)`,
        competencies: {
          academic: "학업능력: 성적 추이와 주도적 학습 태도",
          career: "탐구역량: 관심 분야에 대한 깊이 있는 탐구 과정",
          community: "잠재역량: 협력, 나눔, 배려, 리더십 등 공동체 의식"
        },
        weights: { academic: 0.4, career: 0.4, community: 0.2 }
      },
      "연세대학교": {
        factors: `[2025 연세대학교 가이드북 반영] 학업역량(40%), 진로역량(40%), 공동체역량(20%)`,
        competencies: {
          academic: "학업역량: 학업 성취도와 자기주도적 탐구력",
          career: "진로역량: 전공 관련 이수 노력과 성취 수준",
          community: "공동체역량: 협업, 소통, 규칙 준수, 리더십"
        },
        weights: { academic: 0.4, career: 0.4, community: 0.2 }
      },
      "고려대학교": {
        factors: `[2025 고려대학교 가이드북 반영] 학업역량(40~50%), 자기계발역량(30~40%), 공동체역량(20%)`,
        competencies: {
          academic: "학업역량: 기초 학업 성취도와 학업 의지",
          career: "자기계발역량: 전공 관련 활동의 깊이와 확장성",
          community: "공동체역량: 성실성, 협업능력, 리더십"
        },
        weights: { academic: 0.45, career: 0.35, community: 0.2 }
      }
  };
'@

$replacementLines = $chunk1 -split "`r?`n"
$newContent = New-Object System.Collections.Generic.List[string]

foreach ($line in $replacementLines) { $newContent.Add($line) }

# Add the rest of the file starting from line 501
for ($i = 500; $i -lt $lines.Length; $i++) {
    $newContent.Add($lines[$i])
}

Set-Content -Path $path -Value $newContent -Encoding UTF8
Write-Output "Chunk 1 (1-500) rewritten."
