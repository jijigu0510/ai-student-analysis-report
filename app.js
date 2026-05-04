

// Firebase에서 GAS URL을 받아오는 콜백 — urls = { '1': {'3': url, ...}, '2': {...}, '3': {...} }
window.onFirebaseGasUrls = function (urls) {
  if (!urls) return;
  ['1', '2', '3'].forEach(grade => {
    const gradeUrls = urls[grade];
    if (!gradeUrls) return;
    Object.keys(gradeUrls).forEach(month => {
      const serverUrl = gradeUrls[month] || '';
      if (!serverUrl) return;
      // 서버 데이터를 우선하여 localStorage 갱신
      localStorage.setItem(`mockGasUrl_${grade}_${month}`, serverUrl);
    });
  });
  // 현재 설정 패널에 열려 있다면 입력창 갱신
  const mockGasGradeSelect = document.getElementById('mockGasGradeSelect');
  if (mockGasGradeSelect && typeof window.loadGasUrlsForGrade === 'function') {
    window.loadGasUrlsForGrade(mockGasGradeSelect.value);
  }
};

document.addEventListener("DOMContentLoaded", () => {
  // Global error handler for debugging
  window.onerror = function (message, source, lineno, colno, error) {
    console.error("Global Error:", message, "at", source, ":", lineno);
    // Don't alert for every small thing, but for major script errors
    if (message.includes("renderCourseTable") || message.includes("extractCourseData")) {
      alert("데이터 처리 중 오류 발생: " + message + " (line " + lineno + ")");
    }
    return false;
  };

  // [DEBUG] Initializing P/F Listener Early
  const pfForm = document.getElementById("passfailForm");
  const pfBtn = document.getElementById("pf-analyzeBtn");
  if (pfForm && pfBtn) {
    console.log("[PF-DEBUG] Early listener attachment attempted.");
    pfForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      console.log("[PF-DEBUG] Form Submit Triggered!");

      const idx = document.getElementById("pf-student-select").value;
      if (idx === "" || !pfStudents[idx]) {
        alert("분석할 학생을 선택하세요.");
        return;
      }
      const s = pfStudents[idx];
      const apiKeyInput = document.getElementById("pf-api-key");
      const apiKey = apiKeyInput ? apiKeyInput.value.trim() : "";
      if (!apiKey) {
        alert("Gemini API 키가 필요합니다. 상단 '통합 설정'에서 입력해주세요.");
        return;
      }

      pfBtn.disabled = true;
      pfBtn.innerHTML = "<span class='spinner' style='width:20px;height:20px;border-width:2px;margin:0;'></span> 원인 분석 중...";

      const pfLoadEl = document.getElementById("pf-loadingState");
      const pfEmptyEl = document.getElementById("pf-emptyState");
      const pfReportEl = document.getElementById("pf-reportViewer");

      if (pfEmptyEl) pfEmptyEl.classList.add("hidden");
      if (pfReportEl) pfReportEl.classList.add("hidden");
      if (pfLoadEl) pfLoadEl.classList.remove("hidden");

      const promptData = {
        name: s.name,
        university: s.univ,
        dept: s.dept,
        type: s.type,
        result: s.result,
        grades: document.getElementById("pf-detail-grades").value,
        generalGrade: document.getElementById("pf-student-general-grade").value,
        generalGrade5: document.getElementById("pf-student-general-grade5") ? document.getElementById("pf-student-general-grade5").value : "-",
        subject: document.getElementById("pf-detail-subject").value,
        career: document.getElementById("pf-detail-career").value,
        arts: document.getElementById("pf-detail-arts").value
      };

      try {
        const report = await generateAIReportPF(promptData, apiKey);

        if (pfReportEl) {
          // 대학별 서류평가 기준 패널 삽입
          const pfCriteriaEl = document.createElement("div");
          pfCriteriaEl.id = "pfUniCriteriaPanel";
          pfReportEl.innerHTML = "";
          pfReportEl.appendChild(pfCriteriaEl);
          renderUniCriteria(s.univ, pfCriteriaEl);

          // 리포트 본문
          const pfReportContent = document.createElement("div");
          pfReportContent.className = "markdown-body";
          pfReportContent.innerHTML = marked.parse(report);
          pfReportEl.appendChild(pfReportContent);
          pfReportEl.classList.remove("hidden");
        }
        document.getElementById("pf-pdfAction")?.classList.remove("hidden");

        // Setup PF PDF download
        const pfPdfBtn = document.getElementById("pf-pdfDownloadBtn");
        if (pfPdfBtn) {
          pfPdfBtn.onclick = () => {
            const pfContent = `
                <div class="print-only">
                    <h2 class='print-header' style='color:#000; text-align:center; margin-bottom:2rem; font-size:2.2rem; font-weight:800;'>수시 합불합 원인 심층 분석 리포트</h2>
                    <p style='text-align:right; color:#666; margin-bottom:1.5rem; font-size:0.9rem;'>분석 일시: ${new Date().toLocaleString('ko-KR')}</p>
                    
                    <div style='background:#f8f9fa; padding:1.5rem; border:1px solid #dee2e6; border-radius:10px; margin-bottom:2rem;'>
                        <table style='width:100%; border-collapse:collapse;'>
                            <tr>
                                <td style='padding:8px; border-bottom:1px solid #eee;'><strong>지원대학</strong></td>
                                <td style='padding:8px; border-bottom:1px solid #eee;'>${s.univ}</td>
                                <td style='padding:8px; border-bottom:1px solid #eee;'><strong>지원학과</strong></td>
                                <td style='padding:8px; border-bottom:1px solid #eee;'>${s.dept} (${s.type})</td>
                            </tr>
                            <tr>
                                <td style='padding:8px; border-bottom:1px solid #eee;'><strong>일반등급</strong></td>
                                <td style='padding:8px; border-bottom:1px solid #eee;'>${document.getElementById("pf-student-general-grade").value} / ${document.getElementById("pf-student-general-grade5") ? document.getElementById("pf-student-general-grade5").value + "(5등급)" : "-"}</td>
                                <td style='padding:8px; border-bottom:1px solid #eee;'><strong>최종결과</strong></td>
                                <td style='padding:8px; border-bottom:1px solid #eee;'><span style='color:${s.result.includes("합격") ? "#28a745" : "#dc3545"}; font-weight:bold;'>${s.result}</span></td>
                            </tr>
                        </table>
                    </div>
                    
                    <div class='markdown-body' style='color:#111; line-height:1.8; font-size:1.05rem;'>
                        ${marked.parse(report)}
                    </div>
                    <div style='margin-top:4rem; text-align:center; border-top:1px solid #eee; padding-top:2rem; color:#999; font-size:0.8rem;'>
                        본 리포트는 인공지능 분석 결과이며, 실제 입시 결과와는 차이가 있을 수 있습니다.
                    </div>
                </div>
             `;
            printWithIframe(pfContent);
          };
        }
      } catch (err) {
        console.error(err);
        if (pfReportEl) {
          pfReportEl.innerHTML = `
             <div style='color:var(--error-color);padding:20px;background:rgba(255, 71, 87, 0.05);border-radius:12px;border:1px solid rgba(255, 71, 87, 0.2);'>
               <h3 style="margin-top:0;">⚠️ 분석 실패</h3>
               <div style="white-space: pre-wrap; background:rgba(0,0,0,0.2); padding:15px; border-radius:8px; font-family:monospace; font-size:0.9rem; margin-bottom:15px; border:1px solid rgba(255,255,255,0.1); line-height:1.5;">${err.message}</div>
             </div>
           `;
          pfReportEl.classList.remove("hidden");
        }
      } finally {
        if (pfLoadEl) pfLoadEl.classList.add("hidden");
        pfBtn.disabled = false;
        pfBtn.innerHTML = "<span class='btn-text'>AI 합불합 원인 분석하기</span><span class='btn-icon'>✧</span>";
      }
    });
  }
  const globalModal = document.getElementById("analysisModal");
  const globalModalCloseBtn = document.getElementById("modalCloseBtn");
  if (globalModal && globalModalCloseBtn) {
    globalModalCloseBtn.onclick = () => globalModal.classList.add("hidden");
    globalModal.onclick = (e) => {
      if (e.target === globalModal) globalModal.classList.add("hidden");
    };
  }

  // --- Pass/Fail 상세 모달 오픈 함수 (전역) ---
  window.openPfDetailModal = function (title, inputId) {
    const el = document.getElementById(inputId);
    const content = el ? el.value : "";
    const modalTitle = document.getElementById("modalTitle");
    const modalBody = document.getElementById("modalBody");
    const modalOverlay = document.getElementById("analysisModal");

    if (modalTitle) modalTitle.innerText = title;
    if (modalBody) {
      if (!content || content.includes("데이터 없음") || content.includes("찾을 수 없습니다") || content.trim() === "") {
        modalBody.innerHTML = "<div style='text-align:center; padding:3rem; color:var(--text-secondary);'><span style='font-size:3rem; display:block; margin-bottom:1rem;'>ℹ️</span>해당 학생의 상세 데이터가 추출되지 않았습니다.</div>";
      } else {
        modalBody.innerHTML = `<div style='white-space: pre-wrap; line-height:1.8; font-size:1.05rem;'>${content}</div>`;
      }
    }
    if (modalOverlay) modalOverlay.classList.remove("hidden");
  };
  // -------------------------------------------------------------------------
  // Storage Manager (IndexedDB & LocalStorage)
  // -------------------------------------------------------------------------
  const StorageManager = {
    DB_NAME: "StudentAiDB",
    STORE_NAME: "excelData",
    db: null,

    async init() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.DB_NAME);
        request.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(this.STORE_NAME)) {
            db.createObjectStore(this.STORE_NAME);
          }
        };
        request.onsuccess = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(this.STORE_NAME)) {
            const nextVersion = db.version + 1;
            db.close();
            const upgradeReq = indexedDB.open(this.DB_NAME, nextVersion);
            upgradeReq.onupgradeneeded = (e2) => {
              const db2 = e2.target.result;
              if (!db2.objectStoreNames.contains(this.STORE_NAME)) {
                db2.createObjectStore(this.STORE_NAME);
              }
            };
            upgradeReq.onsuccess = (e2) => {
              this.db = e2.target.result;
              resolve();
            };
            upgradeReq.onerror = (e2) => reject(e2);
          } else {
            this.db = db;
            resolve();
          }
        };
        request.onerror = (e) => reject(e);
      });
    },

    async save(key, data) {
      if (!this.db) await this.init();
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(this.STORE_NAME, "readwrite");
        const store = tx.objectStore(this.STORE_NAME);
        const request = store.put(data, key);
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e);
      });
    },

    async load(key) {
      if (!this.db) await this.init();
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(this.STORE_NAME, "readonly");
        const store = tx.objectStore(this.STORE_NAME);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e);
      });
    },

    async clear() {
      if (!this.db) await this.init();
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(this.STORE_NAME, "readwrite");
        const store = tx.objectStore(this.STORE_NAME);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e);
      });
    }
  };

  // Tab switching logic (3-tab)
  const tabIndividual = document.getElementById("tab-individual");
  const tabPassFail = document.getElementById("tab-passfail");
  const tabSetech = document.getElementById("tab-setech");
  const tabCsat = document.getElementById("tab-csat");
  const tabInterview = document.getElementById("tab-interview");
  const tabMockExam = document.getElementById("tab-mock-exam");
  const tabGpaMockCompare = document.getElementById("tab-gpa-mock-compare");
  const tabGradeRank = document.getElementById("tab-grade-rank");
  const tabPassFailExamples = document.getElementById("tab-passfail-examples");
  const tabAdmissionDist = document.getElementById("tab-admission-dist");
  const tabSchoolMockStatus = document.getElementById("tab-school-mock-status");
  const viewIndividual = document.getElementById("view-individual");
  const viewPassFail = document.getElementById("view-passfail");
  const viewPassFailExamples = document.getElementById("view-passfail-examples");
  const viewSetech = document.getElementById("view-setech");
  const viewCsat = document.getElementById("view-csat");
  const viewInterview = document.getElementById("view-interview");
  const viewMockExam = document.getElementById("view-mock-exam");
  const viewGpaMockCompare = document.getElementById("view-gpa-mock-compare");
  const viewGradeRank = document.getElementById("view-grade-rank");
  const viewAdmissionDist = document.getElementById("view-admission-dist");
  const viewSchoolMockStatus = document.getElementById("view-school-mock-status");

  const allTabs = [tabIndividual, tabPassFail, tabPassFailExamples, tabSetech, tabCsat, tabInterview, tabMockExam, tabGpaMockCompare, tabGradeRank, tabAdmissionDist, tabSchoolMockStatus].filter(Boolean);
  const allViews = [viewIndividual, viewPassFail, viewPassFailExamples, viewSetech, viewCsat, viewInterview, viewMockExam, viewGpaMockCompare, viewGradeRank, viewAdmissionDist, viewSchoolMockStatus].filter(Boolean);

  function switchTabTo(activeTab, activeView) {
    allTabs.forEach(t => t.classList.remove("active"));
    allViews.forEach(v => {
      v.classList.add("hidden");
      v.classList.remove("active");
      v.style.display = "none";
    });
    if (activeTab) activeTab.classList.add("active");
    if (activeView) {
      activeView.classList.remove("hidden");
      activeView.classList.add("active");
      activeView.style.display = (activeView.id === "view-csat" || activeView.id === "view-grade-rank" || activeView.id === "view-passfail-examples" || activeView.id === "view-admission-dist" || activeView.id === "view-school-mock-status") ? "block" : "grid";
    }

    // Sidebar Interview Settings Visibility
    const sidebarIvSettings = document.getElementById("sidebar-interview-settings");
    if (sidebarIvSettings) {
      if (activeTab && activeTab.id === "tab-interview") {
        sidebarIvSettings.classList.remove("hidden");
        // Sync student select options from main individual tab
        const ivStudentSelect = document.getElementById("iv-student-select");
        const mainStudentSelect = document.getElementById("student-select");
        if (ivStudentSelect && mainStudentSelect && mainStudentSelect.options.length > 1) {
          if (ivStudentSelect.options.length !== mainStudentSelect.options.length) {
            ivStudentSelect.innerHTML = mainStudentSelect.innerHTML;
          }
        }
      } else {
        sidebarIvSettings.classList.add("hidden");
      }
    }
  }

  if (tabIndividual) tabIndividual.addEventListener("click", () => switchTabTo(tabIndividual, viewIndividual));
  if (tabPassFail) tabPassFail.addEventListener("click", () => switchTabTo(tabPassFail, viewPassFail));
  if (tabPassFailExamples) tabPassFailExamples.addEventListener("click", () => {
    switchTabTo(tabPassFailExamples, viewPassFailExamples);
    // 탭 전환 시 캔버스 리사이즈 트리거 (Recharts 렌더링 문제 방지)
    setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
  });
  if (tabSetech) tabSetech.addEventListener("click", () => switchTabTo(tabSetech, viewSetech));
  if (tabCsat) tabCsat.addEventListener("click", () => {
    switchTabTo(tabCsat, viewCsat);
    if (typeof window.initCsatChart === "function") window.initCsatChart();
  });
  if (tabInterview) tabInterview.addEventListener("click", () => switchTabTo(tabInterview, viewInterview));
  if (tabMockExam) tabMockExam.addEventListener("click", () => switchTabTo(tabMockExam, viewMockExam));
  if (tabGpaMockCompare) tabGpaMockCompare.addEventListener("click", () => {
    switchTabTo(tabGpaMockCompare, viewGpaMockCompare);
    initGpaMockCompare();
  });
  if (tabGradeRank) tabGradeRank.addEventListener("click", () => {
    switchTabTo(tabGradeRank, viewGradeRank);
    // 탭 전환 시 캔버스 리사이즈 트리거 (차트가 올바른 크기로 렌더링되도록)
    setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
  });
  if (tabAdmissionDist) tabAdmissionDist.addEventListener("click", () => {
    switchTabTo(tabAdmissionDist, viewAdmissionDist);
    if (typeof window.initAdmissionDist === "function") window.initAdmissionDist();
  });
  if (tabSchoolMockStatus) tabSchoolMockStatus.addEventListener("click", () => {
    switchTabTo(tabSchoolMockStatus, viewSchoolMockStatus);
    initSchoolMockStatus();
    // 탭 전환 시 캔버스 리사이즈 트리거
    setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
  });

  // --- Tab Container Toggle Logic ---
  const toggleTabsBtn = document.getElementById("toggle-tabs-btn");
  const showTabsBtn = document.getElementById("show-tabs-btn");
  const mainTabsContainer = document.getElementById("main-tabs-container");

  if (toggleTabsBtn && mainTabsContainer && showTabsBtn) {
    toggleTabsBtn.addEventListener("click", () => {
      mainTabsContainer.style.display = "none";
      showTabsBtn.style.display = "block";
    });

    showTabsBtn.addEventListener("click", () => {
      mainTabsContainer.style.display = "flex";
      showTabsBtn.style.display = "none";
    });
  }

  // --- Universal Uploader Logic ---
  // 파일 저장을 위한 IndexedDB 래퍼
  const dbPromise = new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open('UniversalFileStore', 1);
      request.onupgradeneeded = (e) => {
        e.target.result.createObjectStore('files');
      };
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(e.target.error || new Error("indexedDB error"));
    } catch (err) {
      reject(err);
    }
  });

  async function saveFilesToDB(key, filesList) {
    const db = await dbPromise;
    const tx = db.transaction('files', 'readwrite');
    tx.objectStore('files').put(Array.from(filesList), key);
    return new Promise(r => tx.oncomplete = r);
  }

  async function getFilesFromDB(key) {
    const db = await dbPromise;
    return new Promise((resolve) => {
      const tx = db.transaction('files', 'readonly');
      const req = tx.objectStore('files').get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  }

  async function clearAllFilesFromDB() {
    const db = await dbPromise;
    return new Promise((resolve) => {
      const tx = db.transaction('files', 'readwrite');
      tx.objectStore('files').clear();
      tx.oncomplete = resolve;
      tx.onerror = resolve;
    });
  }

  function setupUniversalUploader() {
    const mappings = [
      { uniId: 'uni-excel-upload', targetId: 'excel-upload' },
      { uniId: 'uni-course-upload', targetId: 'course-excel-upload' },
      { uniId: 'uni-batch-upload', targetId: 'batch-excel-upload' },
      { uniId: 'uni-pf-results-upload', targetId: 'pf-results-upload' },
      { uniId: 'uni-pf-course', targetId: 'pf-upload-course' },
      { uniId: 'uni-pf-subject', targetId: 'pf-upload-subject' },
      { uniId: 'uni-pf-creative', targetId: 'pf-upload-creative' },
      { uniId: 'uni-pf-behavior', targetId: 'pf-upload-behavior' },
      { uniId: 'uni-mock-upload', targetId: 'mockFileInput' },
      { uniId: 'uni-grade-upload', targetId: 'fileInput' }
    ];

    // 앱 로드 시 IndexedDB에서 기존 업로드된 파일들 복원
    mappings.forEach(async mapping => {
      const targetInput = document.getElementById(mapping.targetId);
      const uniInput = document.getElementById(mapping.uniId);
      if (!targetInput || !uniInput) return;

      const restoredFiles = await getFilesFromDB(mapping.uniId);
      if (restoredFiles && restoredFiles.length > 0) {
        try {
          const dt = new DataTransfer();
          restoredFiles.forEach(f => dt.items.add(f));
          targetInput.files = dt.files;
          uniInput.files = dt.files;
          targetInput.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (e) {
          console.warn("파일 복원 실패:", e);
        }
      }
    });

    // 파일 입력 시 실제 입력 및 DB 갱신
    mappings.forEach(mapping => {
      const uniInput = document.getElementById(mapping.uniId);
      const targetInput = document.getElementById(mapping.targetId);

      if (uniInput && targetInput) {
        uniInput.addEventListener('change', async (e) => {
          if (e.target.files && e.target.files.length > 0) {
            // 모의고사 업로드 시 학년 동기화
            if (mapping.uniId === 'uni-mock-upload') {
              const uniMockGradeEl = document.getElementById('uni-mock-grade');
              if (uniMockGradeEl && uniMockGradeEl.value) {
                currentMockGrade = uniMockGradeEl.value;
                const mockGradeSelectEl = document.getElementById('mockGradeSelect');
                if (mockGradeSelectEl) mockGradeSelectEl.value = currentMockGrade;
                updateMonthSelectForGrade(currentMockGrade);
              }
            }

            targetInput.files = e.target.files;

            // 향후 유지를 위해 IndexedDB에 파일 보관
            await saveFilesToDB(mapping.uniId, e.target.files);

            const event = new Event('change', { bubbles: true });
            targetInput.dispatchEvent(event);

            const container = uniInput.closest('.uni-upload-card');
            if (container) {
              const h4 = container.querySelector('h4');
              const originalText = h4.innerHTML;
              // Prevent multiple (반영 완료!) texts if user changes repeatedly rapidly
              if (!originalText.includes('(반영 완료!)')) {
                h4.innerHTML += ' <span style="color:var(--success-color); font-size: 0.8rem; font-weight: normal;">(반영 완료!)</span>';
                setTimeout(() => { h4.innerHTML = originalText; }, 3000);
              }
            }
          }
        });
      }
    });
  }

  function setupUniversalApiKey() {
    const uniApi = document.getElementById('uni-api-key');
    const targets = ['api-key', 'pf-api-key', 'st-api-key', 'iv-api-key'];

    if (uniApi) {
      // 로드 시 localStorage 확인 후 값 채우기 및 전파
      const savedKey = localStorage.getItem('uni-api-key');
      if (savedKey) {
        uniApi.value = savedKey;
        targets.forEach(tId => {
          const tEl = document.getElementById(tId);
          if (tEl) tEl.value = savedKey;
        });
      }

      uniApi.addEventListener('input', (e) => {
        const val = e.target.value;
        localStorage.setItem('uni-api-key', val);
        targets.forEach(tId => {
          const tEl = document.getElementById(tId);
          if (tEl) {
            tEl.value = val;
          }
        });
      });
      uniApi.addEventListener('change', (e) => {
        const container = uniApi.closest('div');
        if (container) {
          const labelSpan = container.querySelector('label span');
          if (labelSpan && !labelSpan.innerHTML.includes('적용 완료')) {
            const orig = labelSpan.innerHTML;
            labelSpan.innerHTML = '<span style="color:var(--success-color); font-weight:bold;">(모든 탭에 적용 완료!)</span>';
            setTimeout(() => labelSpan.innerHTML = orig, 3000);
          }
        }
      });
    }
  }

  setupUniversalUploader();
  setupUniversalApiKey();

  // -------------------------------------------------------------------------
  // Mock Exam Analysis Logic
  // -------------------------------------------------------------------------
  // 모의고사 데이터 월별 관리 (3, 5, 6, 7, 9, 11)
  let mockDataByMonth = {}; // 키: '${grade}_${month}', 예: '1_3', '3_5'
  let currentMockMonth = '3';
  let currentMockGrade = '1';
  const MONTHS_BY_GRADE = { '1': ['3', '6', '9', '11'], '2': ['3', '6', '9', '11'], '3': ['3', '5', '6', '7', '9', '11'] };
  const mockServerData = {}; // { '${grade}_${month}': { count, uploadedAt } }

  function dataKey() { return `${currentMockGrade}_${currentMockMonth}`; }

  function getDataForCurrentMonth() {
    // 현재 월의 전체 학년 데이터를 합침
    return ['1', '2', '3'].flatMap(g => mockDataByMonth[`${g}_${currentMockMonth}`] || []);
  }

  // Firebase 모듈에서 데이터를 받아오는 콜백 — 키: '${grade}_${month}'
  window.onFirebaseMockData = function (gradeMonthKey, serverData) {
    if (!serverData || !Array.isArray(serverData.data)) return;
    mockServerData[gradeMonthKey] = {
      count: serverData.count || serverData.data.length,
      uploadedAt: serverData.uploadedAt
    };
    if (!mockDataByMonth[gradeMonthKey] || mockDataByMonth[gradeMonthKey].length === 0) {
      mockDataByMonth[gradeMonthKey] = serverData.data;
      if (gradeMonthKey === dataKey() || gradeMonthKey.endsWith(`_${currentMockMonth}`)) showMockResults();
    }
    if (gradeMonthKey === dataKey()) refreshMockServerStatus();
  };

  function refreshMockServerStatus() {
    const el = document.getElementById('mockServerStatus');
    if (!el) return;
    const info = mockServerData[dataKey()];
    if (info) {
      const ts = info.uploadedAt ? new Date(info.uploadedAt.seconds * 1000).toLocaleString('ko-KR') : '';
      el.innerHTML = `<span style="color:#4caf50;">✅ 서버에 저장된 데이터: ${currentMockGrade}학년 ${currentMockMonth}월 ${info.count}건${ts ? ` (저장: ${ts})` : ''}</span>`;
    } else {
      el.innerHTML = '';
    }
  }

  function updateMonthSelectForGrade(grade) {
    if (!mockMonthSelect) return;
    const months = MONTHS_BY_GRADE[grade];
    const prevMonth = mockMonthSelect.value;
    const labels = { '3': '3월 모의고사', '5': '5월 모의고사', '6': '6월 모의고사', '7': '7월 모의고사', '9': '9월 모의고사', '11': '11월 모의고사' };
    mockMonthSelect.innerHTML = months.map(m => `<option value="${m}">${labels[m]}</option>`).join('');
    if (months.includes(prevMonth)) {
      mockMonthSelect.value = prevMonth;
    } else {
      currentMockMonth = months[0];
      mockMonthSelect.value = currentMockMonth;
    }
  }

  let mockSheetNames = [];          // 스프레드시트 시트 목록 캐시
  let mockCachedSheetData = {};     // 시트별 데이터 캐시 { sheetName: rows[][] }
  const mockDropZone = document.getElementById('mockDropZone');
  const mockFileInput = document.getElementById('mockFileInput');
  const mockResultArea = document.getElementById('mockResultArea');
  const mockResultText = document.getElementById('mockResultText');
  const mockPreviewBody = document.getElementById('mockPreviewBody');
  const mockDownloadBtn = document.getElementById('mockDownloadBtn');
  const mockClassSelect = document.getElementById('mockClassSelect');
  const mockStudentSelect = document.getElementById('mockStudentSelect');
  const mockSummaryCard = document.getElementById('mockSummaryCard');
  const summaryStudentName = document.getElementById('summaryStudentName');
  const summaryStudentInfo = document.getElementById('summaryStudentInfo');
  const summaryGradeBadges = document.getElementById('summaryGradeBadges');
  const mockTableView = document.getElementById('mockTableView');
  const mockIndividualView = document.getElementById('mockIndividualView');
  const individualReportGrid = document.getElementById('individualReportGrid');
  const mockGasSettingsBtn = document.getElementById('mockGasSettingsBtn');
  const mockGasSettingsArea = document.getElementById('mockGasSettingsArea');
  const mockGasUrlSaveBtn = document.getElementById('mockGasUrlSaveBtn');
  const mockMonthSelect = document.getElementById('mockMonthSelect');
  const uploadMonthText = document.getElementById('uploadMonthText');

  if (mockDropZone && mockFileInput) {
    mockDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      mockDropZone.classList.add('dragover');
    });
    mockDropZone.addEventListener('dragleave', () => {
      mockDropZone.classList.remove('dragover');
    });
    mockDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      mockDropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        processMockFiles(e.dataTransfer.files);
      }
    });
    mockDropZone.addEventListener('click', () => mockFileInput.click());
    mockFileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        processMockFiles(e.target.files);
      }
    });
  }
  if (mockDownloadBtn) mockDownloadBtn.addEventListener('click', exportMockToCSV);

  // 서버에 저장하기 버튼 — Firebase에 현재 학년+월 데이터 업로드
  const mockFirebaseSaveBtn = document.getElementById('mockFirebaseSaveBtn');
  if (mockFirebaseSaveBtn) {
    mockFirebaseSaveBtn.addEventListener('click', async () => {
      const key = dataKey();
      const data = mockDataByMonth[key] || [];
      if (data.length === 0) {
        alert(`${currentMockGrade}학년 ${currentMockMonth}월에 저장할 데이터가 없습니다.`);
        return;
      }
      if (typeof window.firebaseMockSave !== 'function') {
        alert('서버 연결이 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.');
        return;
      }
      const originalText = mockFirebaseSaveBtn.innerHTML;
      mockFirebaseSaveBtn.innerHTML = '<span>⏳</span> 저장 중...';
      mockFirebaseSaveBtn.disabled = true;
      try {
        const el = document.getElementById('mockServerStatus');
        if (el) el.innerHTML = '<span style="color:var(--text-secondary);">서버에 저장 중...</span>';
        await window.firebaseMockSave(key, data);
        mockServerData[key] = { count: data.length, uploadedAt: { seconds: Date.now() / 1000 } };
        refreshMockServerStatus();
        alert(`${currentMockGrade}학년 ${currentMockMonth}월 데이터(${data.length}건)를 서버에 저장했습니다.`);
      } catch (e) {
        console.warn('[Firebase] 모의고사 저장 실패:', e.message);
        alert('서버 저장에 실패했습니다: ' + e.message);
      } finally {
        mockFirebaseSaveBtn.innerHTML = originalText;
        mockFirebaseSaveBtn.disabled = false;
      }
    });
  }

  // 서버에서 삭제하기 버튼 — Firebase에서 현재 학년+월 데이터 삭제
  const mockFirebaseDeleteBtn = document.getElementById('mockFirebaseDeleteBtn');
  if (mockFirebaseDeleteBtn) {
    mockFirebaseDeleteBtn.addEventListener('click', async () => {
      const key = dataKey();
      if (typeof window.firebaseMockDelete !== 'function') {
        alert('서버 연결이 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.');
        return;
      }
      if (!confirm(`서버에서 ${currentMockGrade}학년 ${currentMockMonth}월 모의고사 데이터를 삭제하시겠습니까?\n(기기 내 로컬 데이터는 유지됩니다)`)) return;
      const originalText = mockFirebaseDeleteBtn.innerHTML;
      mockFirebaseDeleteBtn.innerHTML = '<span>⏳</span> 삭제 중...';
      mockFirebaseDeleteBtn.disabled = true;
      try {
        await window.firebaseMockDelete(key);
        delete mockServerData[key];
        refreshMockServerStatus();
        alert(`${currentMockGrade}학년 ${currentMockMonth}월 데이터를 서버에서 삭제했습니다.`);
      } catch (e) {
        console.error('[Firebase] 모의고사 삭제 실패 — key:', key, '/ code:', e.code, '/ message:', e.message, e);
        const detail = e.code ? `[${e.code}] ${e.message}` : e.message;
        if (e.code === 'permission-denied') {
          alert(`서버 삭제 실패: 권한이 없습니다.\nFirebase Console → Firestore → 규칙에서 delete를 허용해 주세요.`);
        } else {
          alert('서버 삭제에 실패했습니다:\n' + detail);
        }
      } finally {
        mockFirebaseDeleteBtn.innerHTML = originalText;
        mockFirebaseDeleteBtn.disabled = false;
      }
    });
  }

  const mockPrintReportBtn = document.getElementById('mockPrintReportBtn');
  if (mockPrintReportBtn) {
    mockPrintReportBtn.addEventListener('click', printMockIndividualReport);
  }

  // GAS 설정 및 저장 로직
  if (mockGasSettingsBtn && mockGasSettingsArea) {
    mockGasSettingsBtn.addEventListener('click', () => {
      mockGasSettingsArea.classList.toggle('hidden');
    });
  }

  // 학년 선택 변경 시
  const mockGradeSelect = document.getElementById('mockGradeSelect');
  if (mockGradeSelect) {
    mockGradeSelect.addEventListener('change', (e) => {
      currentMockGrade = e.target.value;
      updateMonthSelectForGrade(currentMockGrade);
      if (uploadMonthText) uploadMonthText.innerText = currentMockMonth;
      // 설정 패널 학년도 동기화
      const mockGasGradeSelect = document.getElementById('mockGasGradeSelect');
      if (mockGasGradeSelect) { mockGasGradeSelect.value = currentMockGrade; loadGasUrlsForGrade(currentMockGrade); }
      mockSheetNames = [];
      mockCachedSheetData = {};
      const hasData = getDataForCurrentMonth().length > 0;
      if (hasData) { showMockResults(); } else { if (mockResultArea) mockResultArea.classList.add('hidden'); }
      refreshMockServerStatus();
    });
    // 초기 월 옵션 설정 (1학년 기본값)
    updateMonthSelectForGrade(currentMockGrade);
  }

  // 학년 데이터 삭제 버튼
  const mockClearDataBtn = document.getElementById('mockClearDataBtn');
  if (mockClearDataBtn) {
    mockClearDataBtn.addEventListener('click', async () => {
      const months = MONTHS_BY_GRADE[currentMockGrade] || [];
      const hasAnyData = months.some(m => (mockDataByMonth[`${currentMockGrade}_${m}`] || []).length > 0);
      if (!hasAnyData) {
        alert(`${currentMockGrade}학년에 저장된 데이터가 없습니다.`);
        return;
      }
      if (!confirm(`${currentMockGrade}학년의 모의고사 업로드 데이터를 모두 삭제하시겠습니까?`)) return;
      months.forEach(m => { mockDataByMonth[`${currentMockGrade}_${m}`] = []; });
      await StorageManager.save("mockDataByMonth", mockDataByMonth);
      if (typeof window.firebaseMockDelete === 'function') {
        for (const m of months) {
          try { await window.firebaseMockDelete(`${currentMockGrade}_${m}`); } catch (e) { }
        }
      }
      if (mockResultArea) mockResultArea.classList.add('hidden');
      refreshMockServerStatus();
      alert(`${currentMockGrade}학년 데이터가 삭제되었습니다.`);
    });
  }

  // 월 선택 변경 시
  if (mockMonthSelect) {
    mockMonthSelect.addEventListener('change', (e) => {
      currentMockMonth = e.target.value;
      if (uploadMonthText) uploadMonthText.innerText = currentMockMonth;
      const hasData = getDataForCurrentMonth().length > 0;
      if (hasData) { showMockResults(); } else { if (mockResultArea) mockResultArea.classList.add('hidden'); }
      // 시트 상태 초기화
      updateSheetStatus('info', '배포된 GAS URL을 설정해 주세요.');
      mockSheetNames = [];
      mockCachedSheetData = {};
      refreshMockServerStatus();
    });
  }

  // 학년/월별 GAS URL 관리
  const DEFAULT_MOCK_GAS_URLS = {
    "1_3": "https://script.google.com/macros/s/AKfycbzDtgZjPR0VG4EEI6W0Nlxkqdp8X6m-sQGwqQKtmF39B-xujLZdrXMGUTB0hYNFHLzQ/exec",
    "2_3": "https://script.google.com/macros/s/AKfycbzDaNGMS0UHmB4Elj1FLJmw8LPUi1RxsrKvzYGfHPzNQHHetFxUcTo8qh8uyRHMKDUc/exec",
    "3_3": "https://script.google.com/macros/s/AKfycbzUAyVobtXg6GgnKUuqajcytNZ1SX9g0zFNHroYX69CBosk8QJZYMVzIiTkjBd7hmpqJw/exec"
  };

  function getMockGasUrl(grade, month) {
    const key = `mockGasUrl_${grade}_${month}`;
    const stored = localStorage.getItem(key);
    if (stored && stored.trim() !== "") return stored;
    return DEFAULT_MOCK_GAS_URLS[`${grade}_${month}`] || "";
  }

  window.loadGasUrlsForGrade = loadGasUrlsForGrade;

  function loadGasUrlsForGrade(grade) {
    const months = MONTHS_BY_GRADE[grade] || [];
    ['3', '5', '6', '7', '9', '11'].forEach(m => {
      const el = document.getElementById(`mockGasUrl_${m}`);
      if (el) el.value = months.includes(m) ? getMockGasUrl(grade, m) : '';
    });
    // 5월/7월 행은 3학년만 표시
    const row57 = document.getElementById('gasRow57');
    if (row57) row57.style.display = grade === '3' ? 'grid' : 'none';
  }

  const mockGasGradeSelectEl = document.getElementById('mockGasGradeSelect');
  if (mockGasGradeSelectEl) {
    mockGasGradeSelectEl.addEventListener('change', (e) => loadGasUrlsForGrade(e.target.value));
    loadGasUrlsForGrade(mockGasGradeSelectEl.value);
  }

  if (mockGasUrlSaveBtn) {
    mockGasUrlSaveBtn.addEventListener('click', async () => {
      const mockGasGradeSelect = document.getElementById('mockGasGradeSelect');
      const grade = mockGasGradeSelect ? mockGasGradeSelect.value : '1';
      const months = MONTHS_BY_GRADE[grade] || [];
      const urls = {};
      months.forEach(m => {
        const el = document.getElementById(`mockGasUrl_${m}`);
        const val = el ? el.value.trim() : '';
        localStorage.setItem(`mockGasUrl_${grade}_${m}`, val);
        urls[m] = val;
      });
      if (typeof window.firebaseGasSave === 'function') {
        try { await window.firebaseGasSave(grade, urls); }
        catch (e) { console.warn('[Firebase] GAS URL 저장 실패:', e.message); }
      }
      alert(`${grade}학년 연동 설정이 저장되었습니다.`);
      mockGasSettingsArea.classList.add('hidden');
    });
  }

  // GAS 연동 초기화
  const mockLoadSheetsBtn = document.getElementById('mockLoadSheetsBtn');
  if (mockLoadSheetsBtn) {
    mockLoadSheetsBtn.addEventListener('click', connectToGoogleSheet);
  }

  const mockGradeFilterSelect = document.getElementById('mockGradeFilterSelect');
  if (mockGradeFilterSelect) {
    mockGradeFilterSelect.addEventListener('change', () => {
      const gradeVal = mockGradeFilterSelect.value;
      // 반 드롭다운 재구성
      if (mockClassSelect) {
        let data = getDataForCurrentMonth();
        if (gradeVal !== 'all') data = data.filter(d => String(d.학년) === gradeVal);
        const prev = mockClassSelect.value;
        const classes = [...new Set(data.map(d => d.반))].sort((a, b) => Number(a) - Number(b));
        mockClassSelect.innerHTML = '<option value="all">전체 반</option>';
        classes.forEach(cls => {
          const o = document.createElement('option'); o.value = cls; o.textContent = `${cls}반`;
          mockClassSelect.appendChild(o);
        });
        if ([...mockClassSelect.options].some(o => o.value === prev)) mockClassSelect.value = prev;
      }
      updateStudentDropdown(mockClassSelect ? mockClassSelect.value : 'all');
      renderFilteredMockData();
    });
  }

  if (mockClassSelect) {
    mockClassSelect.addEventListener('change', (e) => {
      updateStudentDropdown(e.target.value);
      renderFilteredMockData();
    });
  }

  if (mockStudentSelect) {
    mockStudentSelect.addEventListener('change', renderFilteredMockData);
  }

  // ★ 자동 인코딩 판별 읽기 기능 (UTF-8 / EUC-KR 대응)
  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const buffer = e.target.result;
        const view = new Uint8Array(buffer);

        // UTF-8 fatal 모드: 잘못된 바이트 시퀀스가 있으면 예외 발생 → EUC-KR로 재시도
        let text;
        try {
          text = new TextDecoder('utf-8', { fatal: true }).decode(view);
        } catch (_) {
          text = new TextDecoder('euc-kr').decode(view);
        }
        resolve(text);
      };
      reader.onerror = (e) => reject(e);
      reader.readAsArrayBuffer(file);
    });
  }

  async function processMockFiles(files) {
    const key = dataKey();
    mockDataByMonth[key] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.name.toLowerCase().endsWith('.csv')) continue;

      try {
        let text = await readFileAsText(file);
        text = text.replace(/❹/g, '우').replace(/④/g, '우');
        const data = parseCSVString(text);
        const extracted = extractMockStudentData(data);
        mockDataByMonth[key] = mockDataByMonth[key].concat(extracted);
      } catch (err) {
        console.error(`Error processing file ${file.name}:`, err);
      }
    }

    if (mockDataByMonth[key].length > 0) {
      showMockResults();
      await StorageManager.save("mockDataByMonth", mockDataByMonth);
      refreshMockServerStatus();
    } else {
      alert(`${currentMockGrade}학년 ${currentMockMonth}월 추출 자료가 없습니다. 성적표 파일이 맞는지 확인해 주세요.`);
    }
  }

  async function saveToGoogleSheets() {
    const gasUrl = getMockGasUrl(currentMockGrade, currentMockMonth);
    if (!gasUrl) {
      alert("먼저 [설정(⚙️)] 아이콘을 눌러 구글 앱 스크립트 URL을 저장해 주세요.");
      if (mockGasSettingsArea) mockGasSettingsArea.classList.remove('hidden');
      return;
    }

    if (analyzedMockData.length === 0) {
      alert("전송할 데이터가 없습니다.");
      return;
    }

    // 현재 필터링된 데이터만 보낼지, 전체를 보낼지 결정 (여기서는 현재 화면의 데이터 기준)
    const selectedClass = mockClassSelect ? mockClassSelect.value : 'all';
    const selectedStudent = mockStudentSelect ? mockStudentSelect.value : 'all';

    let filtered = analyzedMockData;
    if (selectedClass !== 'all') filtered = filtered.filter(d => d.반 === selectedClass);
    if (selectedStudent !== 'all') {
      const [num, name] = selectedStudent.split('_');
      filtered = filtered.filter(d => d.번호 === num && d.성명 === name);
    }

    if (!confirm(`${filtered.length}개의 데이터를 구글 시트로 전송하시겠습니까?`)) return;

    const originalBtnText = mockSaveGasBtn.innerHTML;
    mockSaveGasBtn.innerHTML = '<span>⏳</span> 전송 중...';
    mockSaveGasBtn.disabled = true;

    try {
      const response = await fetch(gasUrl, {
        method: 'POST',
        mode: 'no-cors', // GAS 웹 앱 특성상 redirection 때문에 no-cors가 유용할 수 있음
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filtered)
      });

      alert("데이터 전송 요청을 완료했습니다.\n(no-cors 모드에서는 상세 응답 확인이 제한적일 수 있으나 구글 시트를 확인해 보세요!)");
    } catch (err) {
      console.error("GAS 전송 오류:", err);
      alert("전송 중 오류가 발생했습니다: " + err.message);
    } finally {
      mockSaveGasBtn.innerHTML = originalBtnText;
      mockSaveGasBtn.disabled = false;
    }
  }

  // =========================================================================
  // Google Sheets API 연동 — 오답 분석 기능
  // =========================================================================

  /**
   * GAS GET 요청 — fetch 우선 시도, CORS 실패 시 JSONP 폴백
   * 실패 시 진단 메시지 포함
   */
  async function gasGetJson(url) {
    const cleanUrl = url.replace(/[?&]+$/, ''); // 끝의 ? & 제거

    // 1단계: 일반 fetch (웹서버·localhost 환경에서 동작)
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10000);
      try {
        const res = await fetch(cleanUrl, { credentials: 'omit', signal: ctrl.signal });
        clearTimeout(timer);
        if (res.ok) {
          const text = await res.text();
          if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
            return JSON.parse(text);
          }
        }
      } finally {
        clearTimeout(timer);
      }
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('연결 시간 초과. GAS URL과 배포 상태를 확인해 주세요.');
      // "Failed to fetch" = CORS 문제 → JSONP로 폴백
    }

    // 2단계: JSONP (file:// 환경에서 CORS 우회)
    return new Promise((resolve, reject) => {
      const isFile = window.location.protocol === 'file:';
      const cbName = '__gasJsonp_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      const script = document.createElement('script');

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(
          '⏱ GAS 연결 시간 초과 (15초)\n\n' +
          '확인 사항:\n' +
          '① GAS 웹 앱 URL이 올바른지 확인\n' +
          '② GAS 배포 설정 → 액세스 권한: 모든 사람\n' +
          (isFile ? '③ ⚠️ 파일 직접 실행(file://) 환경입니다.\n   VS Code "Live Server" 확장으로 열면 해결됩니다.\n' : '') +
          '\n시도 URL: ' + cleanUrl
        ));
      }, 15000);

      function cleanup() {
        clearTimeout(timer);
        delete window[cbName];
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      window[cbName] = function (data) { cleanup(); resolve(data); };

      script.onerror = function () {
        cleanup();
        reject(new Error(
          '❌ GAS 서버에 연결할 수 없습니다\n\n' +
          '가능한 원인:\n' +
          '① GAS URL이 잘못되었거나 배포가 만료됨\n' +
          '   → script.google.com/macros/s/.../exec 형식 확인\n' +
          '② 학교 네트워크에서 Google 스크립트 서버 차단\n' +
          '   → 모바일 핫스팟으로 변경 후 시도\n' +
          '③ GAS 액세스 권한이 "모든 사람"으로 설정되지 않음\n' +
          '   → GAS → 배포 → 배포 관리 → 수정에서 확인\n' +
          (isFile ? '④ ⚠️ 파일 직접 실행(file://) 환경입니다.\n   VS Code "Live Server" 확장을 설치 후 실행하세요.\n' : '') +
          '\n시도 URL: ' + script.src
        ));
      };

      const sep = cleanUrl.includes('?') ? '&' : '?';
      script.src = cleanUrl + sep + 'callback=' + cbName;
      document.head.appendChild(script);
    });
  }

  /** 시트 연결 상태 표시 업데이트 */
  function updateSheetStatus(type, message) {
    const el = document.getElementById('mockSheetStatus');
    if (!el) return;
    const colors = { loading: 'var(--text-secondary)', success: '#4caf50', error: '#f44336', info: '#64b5f6' };
    el.innerHTML = `<p style="font-size:0.78rem; color:${colors[type] || colors.info}; margin:0;">${message}</p>`;
  }

  /** GAS 웹 앱으로 스프레드시트 시트 목록 로드 */
  async function connectToGoogleSheet() {
    const gasUrl = getMockGasUrl(currentMockGrade, currentMockMonth);

    if (!gasUrl) {
      alert(`${currentMockGrade}학년 ${currentMockMonth}월 연동 설정에 GAS 웹 앱 URL이 없습니다.\n⚙️ 연동 설정을 먼저 진행해 주세요.`);
      if (mockGasSettingsArea) mockGasSettingsArea.classList.remove('hidden');
      return null;
    }

    updateSheetStatus('loading', '⏳ 스프레드시트에 연결 중...');
    const btn = document.getElementById('mockLoadSheetsBtn');
    if (btn) { btn.disabled = true; btn.textContent = '연결 중...'; }

    try {
      const data = await gasGetJson(`${gasUrl}?action=sheets`);
      if (!data.success) throw new Error(data.error || '시트 목록 로드 실패');

      mockSheetNames = data.sheets || [];
      mockCachedSheetData = {}; // 캐시 초기화
      localStorage.setItem('mockGasUrl', gasUrl);

      const preview = mockSheetNames.slice(0, 6).join(', ') + (mockSheetNames.length > 6 ? ' ...' : '');
      updateSheetStatus('success', `✅ 연결 성공! ${mockSheetNames.length}개 시트: ${preview}`);
      return mockSheetNames;

    } catch (err) {
      updateSheetStatus('error', `❌ 연결 실패: ${err.message}`);
      console.error('GAS 연결 오류:', err);
      return null;
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '시트 연결'; }
    }
  }

  /** 과목명 정규화 (매칭용) */
  function normalizeSubjectName(name) {
    return name
      .replace(/\s/g, '')
      .replace(/Ⅰ/g, '1').replace(/Ⅱ/g, '2').replace(/Ⅲ/g, '3')
      .replace(/Ⅳ/g, '4').replace(/Ⅴ/g, '5')
      .replace(/I$/g, '1').replace(/II$/g, '2').replace(/III$/g, '3')
      .toLowerCase();
  }

  /** CSV 과목명 ↔ 스프레드시트 시트명 매칭 (퍼지) */
  function matchSubjectToSheet(subjectName) {
    if (!mockSheetNames || mockSheetNames.length === 0) return null;
    const normSubj = normalizeSubjectName(subjectName);

    // 1. 완전 일치
    for (const sheet of mockSheetNames) {
      if (normalizeSubjectName(sheet) === normSubj) return sheet;
    }
    // 2. 포함 관계
    for (const sheet of mockSheetNames) {
      const normSheet = normalizeSubjectName(sheet);
      if (normSubj.includes(normSheet) || normSheet.includes(normSubj)) return sheet;
    }
    // 3. 괄호 제거 후 핵심어 매칭
    const coreSubj = normalizeSubjectName(subjectName.replace(/[（(][^)）]*[)）]/g, ''));
    for (const sheet of mockSheetNames) {
      const coreSheet = normalizeSubjectName(sheet.replace(/[（(][^)）]*[)）]/g, ''));
      if (coreSubj === coreSheet || coreSubj.includes(coreSheet) || coreSheet.includes(coreSubj)) return sheet;
    }
    return null;
  }

  /** 특정 시트 데이터 가져오기 (캐시 적용) */
  async function fetchSubjectSheetData(sheetName) {
    if (mockCachedSheetData[sheetName]) return mockCachedSheetData[sheetName];

    const gasUrl = getMockGasUrl(currentMockGrade, currentMockMonth);
    if (!gasUrl) throw new Error(`${currentMockGrade}학년 ${currentMockMonth}월 GAS 연동 설정이 되어 있지 않습니다.`);

    const data = await gasGetJson(`${gasUrl}?action=sheetData&sheet=${encodeURIComponent(sheetName)}`);
    if (!data.success) throw new Error(data.error || `시트 '${sheetName}' 데이터 로드 실패`);

    const rows = data.data || [];
    mockCachedSheetData[sheetName] = rows;
    return rows;
  }

  /**
   * 시트 rows를 구조화된 오브젝트로 파싱
   * 반환: { headers: string[], questions: { [번호]: {번호, 정답, 배점, 전국정답률, 영역, 성취기준, ...} } }
   */
  function parseSheetData(rows) {
    if (!rows || rows.length < 2) return null;

    const headers = rows[0].map(h => String(h).trim());

    // 컬럼 인덱스 탐색
    const findCol = (...keywords) => headers.findIndex(h => keywords.some(k => new RegExp(k, 'i').test(h)));
    const qNumCol = findCol('^문항$', '문항번호', '번호', '문항\\s*no', 'no\\.', 'number');
    const answerCol = findCol('정답', '답');
    const pointsCol = findCol('배점', '점수');
    const rateCol = findCol('정답률', '정답율', '정답\\s*비율');
    const domainCol = findCol('영역', '출제', '단원', '범위');
    const stdCol = findCol('성취기준', '기준', '핵심개념', '학습목표');
    const majorCatCol = findCol('대분류');
    const minorCatCol = findCol('소분류');
    const materialCol = findCol('제재');
    const evalFactorCol = findCol('평가\\s*요소');
    const remarkCol = findCol('특이사항');
    const analysisCol = findCol('분석\\s*내용');

    const knownCols = new Set([qNumCol, answerCol, pointsCol, rateCol, domainCol, stdCol, majorCatCol, minorCatCol, materialCol, evalFactorCol, remarkCol, analysisCol].filter(i => i !== -1));
    const extraCols = headers.map((h, i) => ({ h, i })).filter(({ i }) => !knownCols.has(i) && i !== 0);

    const questions = {};

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      // 문항번호 찾기
      let qNum = null;
      if (qNumCol !== -1 && row[qNumCol] !== undefined) {
        qNum = parseInt(String(row[qNumCol]).trim());
      }
      if (!qNum || isNaN(qNum)) {
        // 첫 번째 셀이 숫자이면 문항번호로 간주
        const first = parseInt(String(row[0] || '').trim());
        if (!isNaN(first) && first > 0 && first <= 200) qNum = first;
      }
      if (!qNum || isNaN(qNum)) continue;

      const get = (idx) => idx !== -1 && row[idx] !== undefined ? String(row[idx]).trim() : '';

      // 배점: 평가요소 및 특이사항 컬럼의 () 안 숫자 추출 우선 -> 없으면 배점 컬럼 값 -> 없으면 2
      let 배점val = '';
      if (evalFactorCol !== -1) {
        const evalText = get(evalFactorCol);
        const m = evalText.match(/\((\d+)\s*점?\)/);
        if (m) 배점val = m[1];
      }
      if (!배점val && remarkCol !== -1) {
        const remarkText = get(remarkCol);
        const m = remarkText.match(/\((\d+)\s*점?\)/);
        if (m) 배점val = m[1];
      }
      if (!배점val) 배점val = get(pointsCol);
      if (!배점val) 배점val = '2';

      // '점' 글자 제거
      배점val = String(배점val).replace(/\s*점$/, '').trim();

      const qObj = {
        번호: qNum,
        정답: get(answerCol),
        배점: 배점val,
        전국정답률: get(rateCol),
        영역: get(domainCol),
        성취기준: get(stdCol),
        대분류: get(majorCatCol),
        소분류: get(minorCatCol),
        제재: get(materialCol),
        평가요소: get(evalFactorCol),
        특이사항: get(remarkCol),
        분석내용: get(analysisCol),
      };

      // 기타 컬럼 추가
      extraCols.forEach(({ h, i }) => {
        if (h && row[i] !== undefined) qObj[h] = String(row[i]).trim();
      });

      questions[qNum] = qObj;
    }

    return { headers, questions, extraColNames: extraCols.map(c => c.h).filter(Boolean), hasMajorCat: majorCatCol !== -1 };
  }

  /** 개별 학생 과목 오답 분석 메인 함수 */
  async function analyzeWrongAnswersWithSheet(studentRecord, btnEl) {
    const subjectName = studentRecord.과목;
    const wrongStr = studentRecord.오답문항 || '';
    const wrongItems = wrongStr.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n > 0);

    if (wrongItems.length === 0) {
      alert(`${subjectName}: 오답 문항 정보가 없습니다.`);
      return;
    }

    const gasUrl = getMockGasUrl(currentMockGrade, currentMockMonth);
    if (!gasUrl) {
      alert('연동 설정에서 GAS 웹 앱 URL을 먼저 저장해 주세요.\n(⚙️ 연동 설정 버튼 클릭)');
      if (document.getElementById('mockGasSettingsArea')) {
        document.getElementById('mockGasSettingsArea').classList.remove('hidden');
      }
      return;
    }

    if (btnEl) { btnEl.disabled = true; btnEl.innerHTML = '⏳ 분석 중...'; }

    try {
      // 시트 목록 로드 (없으면 자동 연결)
      if (mockSheetNames.length === 0) {
        const names = await connectToGoogleSheet();
        if (!names || names.length === 0) throw new Error('시트 목록을 가져올 수 없습니다.');
      }

      // 과목 → 시트 매칭
      const matchedSheet = matchSubjectToSheet(subjectName);
      if (!matchedSheet) {
        throw new Error(
          `'${subjectName}'에 해당하는 시트를 찾을 수 없습니다.\n`
          + `스프레드시트의 시트 이름: ${mockSheetNames.join(', ')}`
        );
      }

      // 시트 데이터 로드 & 파싱
      const rows = await fetchSubjectSheetData(matchedSheet);
      const parsed = parseSheetData(rows);
      if (!parsed) throw new Error('시트 데이터를 파싱할 수 없습니다. 헤더 행이 있는지 확인해 주세요.');

      // 오답 문항 분석
      const analysisItems = wrongItems.map(qNum => {
        const qData = parsed.questions[qNum];
        return qData ? { 번호: qNum, ...qData } : {
          번호: qNum, 정답: '-', 배점: '-', 전국정답률: '', 영역: '-', 성취기준: '-',
          대분류: '-', 소분류: '-', 제재: '-', 평가요소: '-', 특이사항: '-'
        };
      });

      showWrongAnswerAnalysisModal(studentRecord, matchedSheet, analysisItems, parsed.extraColNames);

    } catch (err) {
      console.error('오답 분석 오류:', err);
      alert('분석 중 오류가 발생했습니다:\n' + err.message);
    } finally {
      if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = '📊 스프레드시트 오답 분석'; }
    }
  }

  /** 오답 분석 결과를 모달에 표시 */
  function showWrongAnswerAnalysisModal(studentRecord, sheetName, analysisItems, extraColNames) {
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modal = document.getElementById('analysisModal');
    if (!modal || !modalBody) return;

    if (modalTitle) {
      modalTitle.textContent = `📊 ${studentRecord.성명} — ${studentRecord.과목} 오답 분석`;
    }

    // 학생 요약 헤더
    const studentInfoHtml = `
          <div style="display:flex; flex-wrap:wrap; gap:1rem; margin-bottom:1.2rem;
                      background:rgba(255,255,255,0.05); padding:0.9rem 1.1rem;
                      border-radius:10px; border:1px solid var(--panel-border);">
              <div><span style="font-size:0.75rem; color:var(--text-secondary);">학생</span><br>
                  <strong>${studentRecord.성명}</strong>
                  <span style="font-size:0.8rem; color:var(--text-secondary);"> ${studentRecord.학년}학년 ${studentRecord.반}반 ${studentRecord.번호}번</span></div>
              <div><span style="font-size:0.75rem; color:var(--text-secondary);">과목 (시트)</span><br>
                  <strong>${studentRecord.과목}</strong>
                  <span style="font-size:0.8rem; color:var(--text-secondary);"> → ${sheetName}</span></div>
              <div><span style="font-size:0.75rem; color:var(--text-secondary);">성적</span><br>
                  원점수 <strong>${studentRecord.원점수 || '-'}점</strong> / <strong>${studentRecord.등급 || '-'}등급</strong></div>
              <div><span style="font-size:0.75rem; color:var(--text-secondary);">오답</span><br>
                  <strong style="color:#ff6b6b;">${analysisItems.length}문항</strong></div>
          </div>`;

    // 오답 테이블 빌드
    const baseColDefs = [
      { key: '번호', label: '문항번호', style: 'font-weight:700; color:var(--accent-primary); text-align:center; min-width:80px;' },
      { key: '대분류', label: '대분류', style: 'min-width:120px;' },
      { key: '소분류', label: '소분류', style: 'min-width:120px;' },
      { key: '평가요소', label: '평가요소', style: 'min-width:150px; white-space:normal;' },
      { key: '특이사항', label: '특이사항', style: 'min-width:150px; white-space:normal;' },
      { key: '분석내용', label: '분석내용', style: 'min-width:250px; white-space:normal;' },
      { key: '배점', label: '배점', style: 'text-align:center; min-width:60px;' },
    ];
    const allCols = baseColDefs;

    const thStyle = 'padding:10px 12px; text-align:left; border-bottom:1px solid var(--panel-border); white-space:nowrap; font-size:0.85rem;';
    const tdBase = 'padding:10px 12px; border-bottom:1px solid rgba(255,255,255,0.05);';

    let theadHtml = '<tr>' + allCols.map(c => `<th style="${thStyle}">${c.label}</th>`).join('') + '</tr>';

    let tbodyHtml = analysisItems.map((item, idx) => {
      const rowBg = idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent';

      return '<tr style="background:' + rowBg + ';">' + allCols.map(c => {
        const val = item[c.key] !== undefined ? String(item[c.key]) : '-';
        const display = c.key === '배점' && val && val !== '-' ? val + '점'
          : c.key === '번호' ? val + '번'
            : val;
        return `<td style="${tdBase} ${c.style}">${display}</td>`;
      }).join('') + '</tr>';
    }).join('');

    const tableHtml = `
          <div style="overflow-x:auto; margin-top:0.5rem; border-radius:8px; border:1px solid var(--panel-border);">
              <table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
                  <thead style="background:rgba(255,255,255,0.08);">${theadHtml}</thead>
                  <tbody>${tbodyHtml}</tbody>
              </table>
          </div>`;

    // 대분류별 집계
    const catMap = {};
    analysisItems.forEach(item => {
      const c = item.대분류 || '미분류';
      if (!catMap[c]) catMap[c] = [];
      catMap[c].push(item.번호);
    });
    const catEntries = Object.entries(catMap).sort((a, b) => b[1].length - a[1].length);

    // 배점별 집계
    const pointMap = {};
    analysisItems.forEach(item => {
      const p = item.배점 || '2';
      if (!pointMap[p]) pointMap[p] = [];
      pointMap[p].push(item.번호);
    });
    const pointEntries = Object.entries(pointMap).sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]));

    let summaryHtml = `
          <div style="margin: 1.2rem 0; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div style="padding: 1.2rem; background: rgba(99, 102, 241, 0.08); border-radius: 12px; border: 1px solid rgba(99, 102, 241, 0.2);">
                  <h4 style="margin: 0 0 0.8rem 0; font-size: 0.95rem; color: var(--accent-primary); display: flex; align-items: center; gap: 0.5rem;">
                      <span>📌</span> 대분류별 오답 요약
                  </h4>
                  <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                      ${catEntries.map(([cat, nums]) => `
                          <div style="background: rgba(255, 255, 255, 0.05); padding: 0.4rem 0.8rem; border-radius: 6px; border: 1px solid var(--panel-border); display: flex; justify-content: space-between; align-items: center;">
                              <span style="font-size: 0.8rem; color: var(--text-secondary);">${cat}</span>
                              <span style="font-weight: 600; font-size: 0.85rem;">${nums.join(', ')} <small style="opacity: 0.6; margin-left: 4px;">(${nums.length})</small></span>
                          </div>
                      `).join('')}
                  </div>
              </div>
              <div style="padding: 1.2rem; background: rgba(239, 68, 68, 0.08); border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.2);">
                  <h4 style="margin: 0 0 0.8rem 0; font-size: 0.95rem; color: #ff6b6b; display: flex; align-items: center; gap: 0.5rem;">
                      <span>📉</span> 배점별 오답 요약
                  </h4>
                  <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                      ${pointEntries.map(([pts, nums]) => {
      const total = (parseFloat(pts) || 0) * nums.length;
      return `
                          <div style="background: rgba(255, 255, 255, 0.05); padding: 0.4rem 0.8rem; border-radius: 6px; border: 1px solid var(--panel-border); display: flex; justify-content: space-between; align-items: center;">
                              <span style="font-size: 0.8rem; color: var(--text-secondary);">${pts}점</span>
                              <span style="font-weight: 600; font-size: 0.85rem;">${nums.join(', ')} <small style="color:#ff6b6b; margin-left:8px;">계 ${total}점</small></span>
                          </div>`;
    }).join('')}
                  </div>
              </div>
          </div>`;

    modalBody.innerHTML = studentInfoHtml + summaryHtml + tableHtml;
    modal.classList.remove('hidden');
  }

  // =========================================================================

  function updateStudentDropdown(selectedClass) {
    if (!mockStudentSelect) return;
    mockStudentSelect.innerHTML = '<option value="all">전체 학생</option>';

    const mockGradeFilterSel = document.getElementById('mockGradeFilterSelect');
    const selectedGrade = mockGradeFilterSel ? mockGradeFilterSel.value : 'all';
    let filteredData = getDataForCurrentMonth();
    if (selectedGrade !== 'all') filteredData = filteredData.filter(d => String(d.학년) === selectedGrade);
    if (selectedClass !== 'all') {
      filteredData = filteredData.filter(d => d.반 === selectedClass);
    }

    // 유니크한 학생 목록 (번호 + 성명 조합)
    const studentMap = new Map();
    filteredData.forEach(d => {
      const key = `${d.번호}_${d.성명}`;
      if (!studentMap.has(key)) {
        studentMap.set(key, `${d.번호}번 ${d.성명}`);
      }
    });

    const sortedKeys = Array.from(studentMap.keys()).sort((a, b) => {
      const [numA] = a.split('_').map(Number);
      const [numB] = b.split('_').map(Number);
      return numA - numB;
    });

    sortedKeys.forEach(key => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = studentMap.get(key);
      mockStudentSelect.appendChild(option);
    });
  }

  function renderIndividualReport(filtered) {
    if (!individualReportGrid) return;
    individualReportGrid.innerHTML = '';

    filtered.forEach(d => {
      const card = document.createElement('div');
      card.className = 'mock-individual-card';

      // 오답 그룹화 로직
      let wrongHtml = '';
      const rawWrongStr = d.오답문항_정답률;
      if (!rawWrongStr || rawWrongStr === '알수없음' || rawWrongStr.trim() === '') {
        wrongHtml = '<div class="card-wrong-list">오답 정보가 없습니다.</div>';
      } else {
        const groups = {
          'E': { label: '매우 어려움 (0-20%)', items: [], color: '#ff4d4d' },
          'D': { label: '어려움 (20-40%)', items: [], color: '#ff8533' },
          'C': { label: '보통 (40-60%)', items: [], color: '#ffc34d' },
          'B': { label: '쉬움 (60-80%)', items: [], color: '#a3cf62' },
          'A': { label: '매우 쉬움 (80-100%)', items: [], color: '#5cb85c' },
          'ETC': { label: '기타', items: [], color: '#888' }
        };

        const parts = rawWrongStr.split(',').map(p => p.trim());
        parts.forEach(p => {
          const match = p.match(/(\d+)\((.)\)/);
          if (match) {
            const num = match[1];
            const diff = match[2].toUpperCase();
            if (groups[diff]) groups[diff].items.push(num);
            else groups['ETC'].items.push(num);
          } else {
            groups['ETC'].items.push(p);
          }
        });

        let hasAny = false;
        ['E', 'D', 'C', 'B', 'A', 'ETC'].forEach(key => {
          const g = groups[key];
          if (g.items.length > 0) {
            hasAny = true;
            wrongHtml += `
                          <div class="diff-group">
                              <span class="diff-label" style="background: ${g.color}">${g.label}</span>
                              <span class="diff-items">${g.items.join(', ')}</span>
                          </div>
                      `;
          }
        });
        if (!hasAny) wrongHtml = '<div class="card-wrong-list">오답 정보가 없습니다.</div>';
      }

      card.innerHTML = `
              <div class="card-header">
                  <span class="card-subj">${d.과목}</span>
                  <div class="card-grade-circle grade-${d.등급 || 'none'}">${d.등급 || '-'}</div>
              </div>
              <div class="card-stats">
                  <div class="stat-item">
                      <span class="stat-label">원점수</span>
                      <span class="stat-value">${d.원점수 || '-'}점</span>
                  </div>
                  <div class="stat-item">
                      <span class="stat-label">표준점수</span>
                      <span class="stat-value">${d.표준점수 || '-'}</span>
                  </div>
                  <div class="stat-item">
                      <span class="stat-label">백분위</span>
                      <span class="stat-value">${d.전국백분위 || '-'}%</span>
                  </div>
                  <div class="stat-item">
                      <span class="stat-label">상위</span>
                      <span class="stat-value">${d.전국백분위 ? (100 - parseFloat(d.전국백분위)).toFixed(2) + '%' : '-'}</span>
                  </div>
              </div>
              <div>
                  <div class="card-wrong-title">
                      <span>📌 정답률별 오답 문항</span>
                  </div>
                  <div class="card-wrong-container">
                      ${wrongHtml}
                  </div>
              </div>
              <div style="margin-top:0.8rem; padding-top:0.8rem; border-top:1px solid var(--panel-border);">
                  <button class="mock-sheet-analyze-btn"
                      style="width:100%; padding:0.45rem 0; background:rgba(99,102,241,0.15);
                             color:var(--accent-primary); border:1px solid rgba(99,102,241,0.5);
                             border-radius:7px; cursor:pointer; font-size:0.8rem; font-weight:600;
                             display:flex; align-items:center; justify-content:center; gap:0.4rem;
                             transition:background 0.2s, border-color 0.2s;"
                      onmouseover="this.style.background='rgba(99,102,241,0.3)'"
                      onmouseout="this.style.background='rgba(99,102,241,0.15)'">
                      📊 스프레드시트 오답 분석
                  </button>
              </div>
          `;
      // 분석 버튼 이벤트 (closure로 d 캡처)
      const analyzeBtn = card.querySelector('.mock-sheet-analyze-btn');
      if (analyzeBtn) {
        analyzeBtn.addEventListener('click', function () {
          analyzeWrongAnswersWithSheet(d, this);
        });
      }
      individualReportGrid.appendChild(card);
    });
  }

  function renderFilteredMockData() {
    if (!mockPreviewBody) return;
    const mockGradeFilterSel = document.getElementById('mockGradeFilterSelect');
    const selectedGrade = mockGradeFilterSel ? mockGradeFilterSel.value : 'all';
    const selectedClass = mockClassSelect ? mockClassSelect.value : 'all';
    const selectedStudent = mockStudentSelect ? mockStudentSelect.value : 'all';

    let filtered = getDataForCurrentMonth();
    if (selectedGrade !== 'all') {
      filtered = filtered.filter(d => String(d.학년) === selectedGrade);
    }
    if (selectedClass !== 'all') {
      filtered = filtered.filter(d => d.반 === selectedClass);
    }
    if (selectedStudent !== 'all') {
      const [num, name] = selectedStudent.split('_');
      filtered = filtered.filter(d => d.번호 === num && d.성명 === name);
    }

    // 테이블 렌더링 (전체 뷰용)
    mockPreviewBody.innerHTML = '';

    // 뷰 전환 로직
    if (selectedStudent === 'all') {
      if (mockTableView) mockTableView.classList.remove('hidden');
      if (mockIndividualView) mockIndividualView.classList.add('hidden');

      const displayData = filtered.slice(0, 100);
      displayData.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
                  <td>${row.학년}</td>
                  <td>${row.반}</td>
                  <td>${row.번호}</td>
                  <td style="font-weight: 600;">${row.성명}</td>
                  <td class="subj-name">${row.과목}</td>
                  <td><span class="badge-grade grade-${row.등급 || 'none'}">${row.등급 || '-'}</span></td>
                  <td class="score">${row.원점수}</td>
                  <td class="score">${row.표준점수}</td>
                  <td>${row.전국백분위}</td>
                  <td class="wrong-items" title="${row.오답문항}">${row.오답문항}</td>
                  <td class="wrong-items" title="${row.오답문항_정답률}">${row.오답문항_정답률}</td>
              `;
        mockPreviewBody.appendChild(tr);
      });
    } else {
      if (mockTableView) mockTableView.classList.add('hidden');
      if (mockIndividualView) mockIndividualView.classList.remove('hidden');
      renderIndividualReport(filtered);
    }

    // 요약 카드 표시 로직
    if (selectedStudent !== 'all' && filtered.length > 0) {
      const first = filtered[0];
      if (mockSummaryCard) {
        mockSummaryCard.classList.remove('hidden');
        if (summaryStudentName) summaryStudentName.innerText = `${first.성명} 학생 성적 요약`;
        if (summaryStudentInfo) summaryStudentInfo.innerText = `${first.학년}학년 ${first.반}반 ${first.번호}번`;
        if (summaryGradeBadges) {
          summaryGradeBadges.innerHTML = '';
          // 주요 과목 등급 표시 (국어, 수학, 영어, 탐구 최대 2개)
          const majorSubjects = ['국어', '수학', '영어'];
          filtered.forEach(d => {
            const isMajor = majorSubjects.some(m => d.과목.includes(m));
            const isTamgu = !isMajor && !d.과목.includes('한국사');
            if (isMajor || isTamgu) {
              const grade = parseInt(d.등급) || 0;
              const badge = document.createElement('div');
              badge.className = `mock-summary-badge ${grade > 0 ? 'grade-' + grade : ''}`;
              badge.innerHTML = `
                            <span class="subj-label">${d.과목}</span>
                            <span class="grade-value">${d.등급 || '-'}</span>
                        `;
              summaryGradeBadges.appendChild(badge);
            }
          });
        }
      }
    } else {
      if (mockSummaryCard) mockSummaryCard.classList.add('hidden');
    }

    if (filtered.length === 0) {
      mockPreviewBody.innerHTML = '<tr><td colspan="11" style="text-align:center; padding:2rem; color:var(--text-secondary);">해당하는 데이터가 없습니다.</td></tr>';
    } else if (filtered.length > 100) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="11" style="text-align: center; color: var(--text-secondary); font-style: italic; padding: 1rem;">... 외 ${filtered.length - 100}개의 데이터가 더 있습니다 (엑셀 다운로드 추천)</td>`;
      mockPreviewBody.appendChild(tr);
    }
  }

  function parseCSVString(text) {
    const rows = [];
    let row = [];
    let currentVal = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        if (inQuotes && text[i + 1] === '"') {
          currentVal += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(currentVal);
        currentVal = '';
      } else if (char === '\n' && !inQuotes) {
        row.push(currentVal);
        rows.push(row);
        row = [];
        currentVal = '';
      } else if (char === '\r') {
        // Ignore
      } else {
        currentVal += char;
      }
    }
    if (currentVal || row.length > 0) {
      row.push(currentVal);
      rows.push(row);
    }
    return rows;
  }


  function extractMockStudentData(data) {
    // 1. Chunking (학생별 분할)
    let studentChunks = [];
    let currentChunk = [];
    for (let row of data) {
      if (!Array.isArray(row)) continue;
      let rowStr = row.join("").replace(/\s/g, "");
      if (rowStr.includes("성적통지표") || rowStr.includes("학교명") || (rowStr.includes("학년") && rowStr.includes("반") && rowStr.includes("성명"))) {
        if (currentChunk.length > 5) studentChunks.push(currentChunk);
        currentChunk = [row];
      } else {
        currentChunk.push(row);
      }
    }
    if (currentChunk.length > 5) studentChunks.push(currentChunk);
    if (studentChunks.length === 0 && data.length > 0) studentChunks = [data];

    let allResults = [];

    // 2. 블록별 데이터 추출
    for (let chunk of studentChunks) {
      let studentInfo = { 학년: '', 반: '', 번호: '', 성명: '' };

      // 학생 기본 정보
      for (let i = 0; i < Math.min(15, chunk.length); i++) {
        if (!chunk[i] || !Array.isArray(chunk[i])) continue;
        let rClean = chunk[i].map(x => String(x).trim()).filter(x => x);
        if (rClean.length >= 5) {
          for (let j = 0; j <= rClean.length - 4; j++) {
            if (/^\d+$/.test(rClean[j]) && /^\d+$/.test(rClean[j + 1]) && /^\d+$/.test(rClean[j + 2])) {
              if (!studentInfo.학년) {
                studentInfo.학년 = rClean[j];
                studentInfo.반 = rClean[j + 1];
                studentInfo.번호 = rClean[j + 2];
                studentInfo.성명 = rClean[j + 3];
              }
              break;
            }
          }
        }
      }

      let currentSubjectScores = {};
      let itemAnalysis = {};
      let rateAnalysis = {};

      // 가상 그리드 매핑용 변수
      let colToQNumMap = {}; // columnIndex -> questionNumber (영역\문항 행에서만 구축)
      let subjectColToQMap = {}; // subjName -> { colIdx: qNum } (답안 행 등에서 동적으로 보충)
      let colToSubjMap = []; // 점수 행용 과목 맵
      let answerSubjMap = []; // 답안 섹션용 과목 맵 (채점결과/정답률 귀속에 사용)

      for (let i = 0; i < chunk.length; i++) {
        let row = chunk[i];
        if (!row || !Array.isArray(row)) continue;
        let cleanCells = row.map(c => String(c).trim()).filter(c => c);
        if (cleanCells.length === 0) continue;

        let rowStrRaw = row.join("");
        let rowStrNoSpace = rowStrRaw.replace(/\s/g, "");

        // [0] 문항 번호 행 감지: 숫자가 10개 이상, 최댓값 > 5(답안 선택지 1~5 제외), 대부분 순차 증가
        let numCells = row.map(c => String(c).trim()).filter(c => /^\d+$/.test(c));
        if (numCells.length >= 10) {
          let nums = numCells.map(Number);
          const maxNum = Math.max(...nums);
          let sequentialCount = 0;
          for (let k = 1; k < nums.length; k++) {
            if (nums[k] === nums[k - 1] + 1) sequentialCount++;
          }
          // 최댓값이 5 초과(답안 선택지 행 필터)이고, 거의 대부분 순차 증가해야 문항 헤더로 인정
          if (maxNum > 5 && sequentialCount >= numCells.length - 3) {
            row.forEach((cell, idx) => {
              let val = String(cell).trim();
              if (/^\d+$/.test(val)) colToQNumMap[idx] = parseInt(val);
            });
          }
        }

        // [1] 답안 행에서 과목명 추출 → answerSubjMap 갱신 및 과목별 매핑 처리
        if (rowStrNoSpace.includes('답안') && !rowStrNoSpace.includes('정답') && !rowStrNoSpace.includes('채점')) {
          let firstCellVal = String(row[0] || '').replace(/\s/g, '');
          let newAnswerSubj = null;
          if (firstCellVal.includes('국어')) {
            let m = firstCellVal.match(/\((.*?)\)/);
            newAnswerSubj = m ? `국어(${m[1]})` : "국어";
          } else if (firstCellVal.includes('수학')) {
            let m = firstCellVal.match(/\((.*?)\)/);
            newAnswerSubj = m ? `수학(${m[1]})` : "수학";
          } else if (firstCellVal.includes('영어')) {
            newAnswerSubj = "영어";
          } else if (firstCellVal.includes('한국사')) {
            newAnswerSubj = "한국사";
          }
          if (newAnswerSubj) {
            answerSubjMap = [{ colIdx: 0, name: newAnswerSubj }];

            // 수학 과목의 16~30번 주관식/특수 영역 대응: 답안 행에 포함된 문항 번호(16~30)를 동적 매핑
            if (newAnswerSubj.includes('수학')) {
              if (!subjectColToQMap[newAnswerSubj]) subjectColToQMap[newAnswerSubj] = {};
              row.forEach((cell, idx) => {
                let val = String(cell).trim();
                if (/^\d+$/.test(val)) {
                  let num = parseInt(val);
                  // 16~30번 번호만 라벨로 인정 (1~5번 등은 선택지 답변일 가능성이 높으므로 제외)
                  if (num >= 16 && num <= 30) subjectColToQMap[newAnswerSubj][idx] = num;
                }
              });
            }
          }
        }

        // [2] 과목명 감지 (점수 행 및 탐구 과목 행)
        if (!/답안|정답|채점결과|정답률/.test(rowStrNoSpace)) {
          let badWords = /배점|득점|학급|학교|전국|등급|원점수|표준점수|백분위|영역|문항|성명|번호|학년|반|실시일|학교명|기타참고|오류코드|보충학습|과목|응시자|인원|비율|범위|석차|세부|계산|이해|추론|읽기|듣기|말하기|쓰기|창의|비판|사실|적용|어휘|개념|문제해결/;
          let foundSubjsInRow = [];
          row.forEach((cell, idx) => {
            let val = String(cell).replace(/\s/g, "");
            if (!val || val.length < 2) return;
            // 숫자 패턴(범위·분수·소수·숫자+괄호) 필터
            if (/[~\/]/.test(val) || /^\d/.test(val) || /\d+\.\d+/.test(val) || /\d+\(/.test(val)) return;

            let subj = null;
            if (val.includes('국어')) {
              let m = val.match(/\((.*?)\)/);
              subj = m ? `국어(${m[1]})` : "국어";
            } else if (val.includes('수학')) {
              let m = val.match(/\((.*?)\)/);
              subj = m ? `수학(${m[1]})` : "수학";
            } else if (val.includes('영어')) subj = "영어";
            else if (val.includes('한국사')) subj = "한국사";
            else {
              if (!badWords.test(val) && !/^\d+$/.test(val) && val.length >= 2) {
                subj = val.replace(/^(사회|과학|공통|직업)?탐구/g, "");
                if (subj.length < 2) subj = null;
              }
            }

            if (subj) foundSubjsInRow.push({ colIdx: idx, name: subj });
          });

          if (foundSubjsInRow.length > 0) {
            colToSubjMap = foundSubjsInRow.sort((a, b) => a.colIdx - b.colIdx);
            // 탐구 과목 행(답안 섹션) 감지: rowStrNoSpace에 '과목' 포함
            if (rowStrNoSpace.includes('과목')) {
              answerSubjMap = foundSubjsInRow
                .filter(s => s.name.length >= 2)
                .sort((a, b) => a.colIdx - b.colIdx);
            }
          }
        }

        // [A] 성적 수치 추출 (원점수, 표준점수, 백분위, 등급)
        let maxScoreIdx = row.findIndex(val => String(val).trim() === '100' || String(val).trim() === '50');
        if (maxScoreIdx !== -1 && !/답안|정답|채점|결과|비율/.test(rowStrNoSpace)) {
          let subjName = "";
          for (let k = colToSubjMap.length - 1; k >= 0; k--) {
            if (colToSubjMap[k].colIdx <= maxScoreIdx) {
              subjName = colToSubjMap[k].name;
              break;
            }
          }

          if (subjName && !currentSubjectScores[subjName]) {
            try {
              // rawScore 위치 파악: +5 → +4 → +1 순서로 숫자 확인
              let rawScoreOffset = 1;
              let rawScore = '';
              if (/^\d+$/.test(String(row[maxScoreIdx + 5] || '').trim())) {
                rawScoreOffset = 5; rawScore = String(row[maxScoreIdx + 5]).trim();
              } else if (/^\d+$/.test(String(row[maxScoreIdx + 4] || '').trim())) {
                rawScoreOffset = 4; rawScore = String(row[maxScoreIdx + 4]).trim();
              } else {
                rawScoreOffset = 1; rawScore = String(row[maxScoreIdx + 1] || '').trim();
              }
              if (!/^\d+$/.test(rawScore)) rawScore = "";

              let stdScore = "";
              let percentile = "";
              let grade = "";

              // rawScore 위치 이후부터 표준점수·백분위·등급 탐색
              for (let idx = maxScoreIdx + rawScoreOffset + 1; idx < Math.min(maxScoreIdx + 35, row.length); idx++) {
                let val = String(row[idx]).trim();
                if (!val) continue;

                if (!stdScore && /^\d{2,3}$/.test(val) && parseInt(val) <= 200) {
                  stdScore = val;
                } else if (!percentile && /^\d+\.\d+$/.test(val) && parseFloat(val) <= 100) {
                  percentile = val;
                } else if (!grade && /^[1-9]$/.test(val)) {
                  grade = val;
                } else if (!grade) {
                  // 영어·한국사: "원점수에 의한 등급 (X)" 패턴에서 등급 추출
                  let noSpace = val.replace(/\s/g, '');
                  let gm = noSpace.match(/원점수에의한등급\(([1-9])\)/);
                  if (gm) grade = gm[1];
                }
              }

              if (rawScore) {
                currentSubjectScores[subjName] = { 원점수: rawScore, 표준점수: stdScore, 전국백분위: percentile, 등급: grade };
              }
            } catch (e) { }
          }
        }

        // [B] 채점 결과 (O/X) & [C] 정답률 (A-E) 추출
        let isOx = rowStrNoSpace.includes("채점결과");
        let isRate = rowStrNoSpace.includes("정답률");

        if (isOx || isRate) {
          // 답안 섹션 과목 맵 우선 사용, 없으면 점수 섹션 맵 폴백
          let activeSubjMap = answerSubjMap.length > 0 ? answerSubjMap : colToSubjMap;

          row.forEach((cell, idx) => {
            let val = String(cell).trim().toUpperCase();
            if (!val) return;

            let subj = null;
            let baseColIdx = -1;
            for (let k = activeSubjMap.length - 1; k >= 0; k--) {
              if (activeSubjMap[k].colIdx <= idx) {
                subj = activeSubjMap[k].name;
                baseColIdx = activeSubjMap[k].colIdx;
                break;
              }
            }

            if (subj) {
              let rawQNum = null;

              // [수정] 수학 과목은 헤더 행(colToQNumMap)보다 데이터 행(subjectColToQMap)의 번호 레이블을 우선적으로 신뢰
              if (subj.includes('수학')) {
                // 현재 위치부터 왼쪽으로 5칸까지 탐색하여 16~30번 레이블을 찾음
                for (let offset = 0; offset <= 5; offset++) {
                  if (idx - offset < 0) break;
                  let dynQ = subjectColToQMap[subj] && subjectColToQMap[subj][idx - offset];
                  if (dynQ && dynQ >= 16 && dynQ <= 30) {
                    rawQNum = dynQ;
                    break;
                  }
                }
                // 16~30번을 못 찾았다면 1~15번은 헤더 매핑 사용
                if (!rawQNum) rawQNum = colToQNumMap[idx];
              } else {
                // 일반 과목은 전역 헤더 매핑 우선
                rawQNum = (subjectColToQMap[subj] && subjectColToQMap[subj][idx]) || colToQNumMap[idx];
              }

              if (rawQNum) {
                // 탐구 및 선택 과목 대비: 국어/수학/영어/한국사가 아니면 탐구로 간주하여 오프셋 적용
                let isCore = /국어를?|수학|영어를?|한국사/.test(subj);
                let startQNum = 1;
                if (!isCore) {
                  for (let k = baseColIdx; k < row.length; k++) {
                    if (colToQNumMap[k] && colToQNumMap[k] > 0) {
                      startQNum = colToQNumMap[k];
                      break;
                    }
                  }
                }
                let finalQNum = rawQNum - (startQNum - 1);

                // 계산된 번호가 유효 범위를 벗어난 경우(음수/0 등) 무시
                if (finalQNum <= 0) return;

                // 탐구 과목 강제 보정: 21~40번 등으로 추출되는 경우 1~20번으로 회귀
                if (!isCore && finalQNum > 20) {
                  finalQNum = (finalQNum - 1) % 20 + 1;
                }

                // 과목별 문항 수 제한 적용
                let maxQ = 50;
                if (subj.includes('수학')) maxQ = 30;
                else if (!isCore || subj.includes('한국사')) maxQ = 20;
                else if (subj.includes('국어') || subj.includes('영어')) maxQ = 45;

                if (finalQNum <= maxQ) {
                  if (isOx && val === 'X') {
                    if (!itemAnalysis[subj]) itemAnalysis[subj] = [];
                    if (!itemAnalysis[subj].includes(finalQNum)) {
                      itemAnalysis[subj].push(finalQNum);
                    }
                  } else if (isRate && /^[A-E]$/.test(val)) {
                    if (!rateAnalysis[subj]) rateAnalysis[subj] = {};
                    rateAnalysis[subj][finalQNum] = val;
                  }
                }
              }
            }
          });
        }
      }

      // 최종 조립
      for (let subj of Object.keys(currentSubjectScores)) {
        let scoreData = currentSubjectScores[subj];
        let wrongs = itemAnalysis[subj] || [];
        let rates = rateAnalysis[subj] || {};

        let wrongWithRates = wrongs.sort((a, b) => a - b).map(q => {
          let r = rates[q] || "알수없음";
          return `${q}(${r})`;
        }).join(", ");

        allResults.push({
          학년: studentInfo.학년,
          반: studentInfo.반,
          번호: studentInfo.번호,
          성명: studentInfo.성명,
          과목: subj,
          원점수: scoreData.원점수,
          표준점수: scoreData.표준점수,
          전국백분위: scoreData.전국백분위,
          등급: scoreData.등급,
          오답문항: wrongs.sort((a, b) => a - b).join(", "),
          오답문항_정답률: wrongWithRates
        });
      }
    }

    return allResults;
  }

  function showMockResults() {
    if (!mockResultText || !mockPreviewBody || !mockResultArea) return;
    const allData = getDataForCurrentMonth();
    const curData = mockDataByMonth[dataKey()] || [];
    mockResultText.innerText = `${currentMockMonth}월 총 ${allData.length}개의 과목 데이터 (${currentMockGrade}학년 업로드: ${curData.length}건)`;

    // 학년 드롭다운 초기화
    const mockGradeFilterSel = document.getElementById('mockGradeFilterSelect');
    if (mockGradeFilterSel) {
      const grades = [...new Set(allData.map(d => String(d.학년)).filter(Boolean))].sort();
      mockGradeFilterSel.innerHTML = '<option value="all">전체 학년</option>';
      grades.forEach(g => {
        const option = document.createElement('option');
        option.value = g; option.textContent = `${g}학년`;
        mockGradeFilterSel.appendChild(option);
      });
      mockGradeFilterSel.value = 'all';
    }

    // 반 드롭다운 초기화
    if (mockClassSelect) {
      const classes = [...new Set(allData.map(d => d.반))].sort((a, b) => Number(a) - Number(b));
      mockClassSelect.innerHTML = '<option value="all">전체 반</option>';
      classes.forEach(cls => {
        const option = document.createElement('option');
        option.value = cls;
        option.textContent = `${cls}반`;
        mockClassSelect.appendChild(option);
      });
      mockClassSelect.value = 'all';
    }

    updateStudentDropdown('all');
    renderFilteredMockData();
    mockResultArea.classList.remove('hidden');
  }

  function exportMockToCSV() {
    const data = getDataForCurrentMonth();
    if (data.length === 0) return;
    const headers = ["학년", "반", "번호", "성명", "과목", "등급", "원점수", "표준점수", "전국백분위", "오답문항", "오답문항_정답률"];
    let csvContent = "\uFEFF" + headers.join(",") + "\n";
    data.forEach(row => {
      let rowArr = headers.map(h => {
        let val = String(row[h] || "").replace(/[\r\n]+/g, ' ').trim();
        if (val.includes(",") || val.includes('"')) {
          val = `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      });
      csvContent += rowArr.join(",") + "\n";
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `모의고사_분석결과_${currentMockMonth}월_${currentMockMonth}월.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function printMockIndividualReport() {
    const selectedStudent = mockStudentSelect ? mockStudentSelect.value : 'all';
    if (selectedStudent === 'all') {
      alert("학생을 먼저 선택해주세요.");
      return;
    }

    const [num, name] = selectedStudent.split('_');
    const allData = getDataForCurrentMonth();
    const studentData = allData.filter(d => d.번호 === num && d.성명 === name);

    if (studentData.length === 0) {
      alert("해당 학생의 데이터가 없습니다.");
      return;
    }

    const btn = document.getElementById('mockPrintReportBtn');
    const originalHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>⏳</span> 데이터를 불러오는 중...';
    }

    try {
      const first = studentData[0];
      const gasUrl = getMockGasUrl(first.학년, currentMockMonth);

      let subjectsHtml = '';

      for (const d of studentData) {
        let wrongHtml = '';
        let detailedTableHtml = '';

        const rawWrongStr = d.오답문항_정답률;
        // 리포트 생성 단계에서도 중복을 철저히 제거 (Set 활용)
        const wrongItems = Array.from(new Set(
          (d.오답문항 || '').split(',')
            .map(n => parseInt(n.trim()))
            .filter(n => !isNaN(n) && n > 0)
        )).sort((a, b) => a - b);

        // 1. 기본 정답률별 요약
        if (!rawWrongStr || rawWrongStr === '알수없음' || rawWrongStr.trim() === '') {
          wrongHtml = '<p style="color:#888; font-size:0.9rem;">오답 정보가 없습니다.</p>';
        } else {
          const groups = {
            'E': { label: '매우 어려움 (0-20%)', items: [], color: '#ff4d4d' },
            'D': { label: '어려움 (20-40%)', items: [], color: '#ff8533' },
            'C': { label: '보통 (40-60%)', items: [], color: '#ffc34d' },
            'B': { label: '쉬움 (60-80%)', items: [], color: '#a3cf62' },
            'A': { label: '매우 쉬움 (80-100%)', items: [], color: '#5cb85c' },
            'ETC': { label: '기타', items: [], color: '#888' }
          };

          const parts = rawWrongStr.split(',').map(p => p.trim());
          parts.forEach(p => {
            const match = p.match(/(\d+)\((.)\)/);
            if (match) {
              const qNum = match[1];
              const diff = match[2].toUpperCase();
              if (groups[diff]) groups[diff].items.push(qNum);
              else groups['ETC'].items.push(qNum);
            } else {
              groups['ETC'].items.push(p);
            }
          });

          ['E', 'D', 'C', 'B', 'A', 'ETC'].forEach(key => {
            const g = groups[key];
            if (g.items.length > 0) {
              wrongHtml += `
                              <div style="margin-bottom:0.4rem; display:flex; align-items:center; gap:0.5rem;">
                                  <span style="display:inline-block; padding:2px 8px; border-radius:4px; background:${g.color}; color:#fff; font-size:0.75rem; font-weight:bold; min-width:110px; text-align:center;">${g.label}</span>
                                  <span style="font-size:0.85rem; color:#333;">${g.items.join(', ')}</span>
                              </div>
                          `;
            }
          });
        }

        // 2. 스프레드시트 상세 분석 (GAS 연동 시)
        if (gasUrl && wrongItems.length > 0) {
          try {
            // 시트 목록 확인 및 매칭
            if (mockSheetNames.length === 0) await connectToGoogleSheet();
            const matchedSheet = matchSubjectToSheet(d.과목);

            if (matchedSheet) {
              const sheetRows = await fetchSubjectSheetData(matchedSheet);
              const parsed = parseSheetData(sheetRows);

              if (parsed) {
                // 대분류별 그룹화
                const catMap = {};
                wrongItems.forEach(qNum => {
                  const q = parsed.questions[qNum];
                  const cat = (q && q.대분류) ? q.대분류 : '미분류';
                  if (!catMap[cat]) catMap[cat] = [];
                  catMap[cat].push(qNum);
                });
                const catEntries = Object.entries(catMap).sort((a, b) => b[1].length - a[1].length);

                const categorySummaryHtml = `
                                  <div style="margin-top:1.2rem; margin-bottom:1.5rem; break-inside: avoid;">
                                      <div style="font-size:0.9rem; font-weight:bold; color:#725e9c; margin-bottom:0.6rem; display:flex; align-items:center; gap:0.4rem;">
                                          <span>📊</span> 대분류별 오답 문항 요약
                                      </div>
                                      <div style="background:#fcfaff; border:1px solid #e0d9f0; padding:1.2rem; border-radius:10px; border-left:4px solid #725e9c;">
                                          ${catEntries.map(([cat, qNums]) => `
                                              <div style="margin-bottom:0.5rem; display:flex; align-items:start; gap:0.8rem;">
                                                  <span style="font-weight:bold; color:#5a4a8c; font-size:0.9rem; min-width:100px; display:inline-block;">[${cat}]</span>
                                                  <span style="font-size:0.9rem; color:#333;">${qNums.join(', ')}</span>
                                              </div>
                                          `).join('')}
                                      </div>
                                  </div>
                              `;

                detailedTableHtml = categorySummaryHtml + `
                                  <div style="margin-top:1.5rem;">
                                      <div style="font-size:0.9rem; font-weight:bold; color:#3c3fa0; margin-bottom:0.6rem; display:flex; align-items:center; gap:0.4rem;">
                                          <span>📋</span> 문항별 상세 오답 분석
                                      </div>
                                      <table style="width:100%; border-collapse:collapse; font-size:0.8rem; text-align:left; border:1px solid #ddd;">
                                          <thead>
                                              <tr style="background:#f0f2f5;">
                                                  <th style="padding:8px; border:1px solid #ddd; width:40px;">번호</th>
                                                  <th style="padding:8px; border:1px solid #ddd; width:80px;">대분류</th>
                                                  <th style="padding:8px; border:1px solid #ddd; width:120px;">소분류</th>
                                                  <th style="padding:8px; border:1px solid #ddd;">평가요소</th>
                                              </tr>
                                          </thead>
                                          <tbody>
                                              ${wrongItems.map(qNum => {
                  const q = parsed.questions[qNum] || { 번호: qNum, 정답: '-', 영역: '-', 성취기준: '-', 대분류: '-', 소분류: '-', 제재: '-', 평가요소: '-', 특이사항: '-' };

                  // 컬럼 통합 (중복 제거 포함)
                  const minorInfo = [...new Set([q.소분류, q.제재].filter(v => v && v !== '-'))].join(' / ') || '-';
                  const evalInfo = [...new Set([q.성취기준, q.평가요소, q.특이사항].filter(v => v && v !== '-'))].join(' / ') || '-';

                  return `
                                                      <tr>
                                                          <td style="padding:8px; border:1px solid #ddd; text-align:center; font-weight:bold;">${qNum}</td>
                                                          <td style="padding:8px; border:1px solid #ddd; text-align:center;">${q.대분류 || '-'}</td>
                                                          <td style="padding:8px; border:1px solid #ddd;">${minorInfo}</td>
                                                          <td style="padding:8px; border:1px solid #ddd; font-size:0.75rem;">
                                                              <div>${evalInfo}</div>
                                                          </td>
                                                      </tr>
                                                  `;
                }).join('')}
                                          </tbody>
                                      </table>
                                  </div>
                              `;
              }
            }
          } catch (e) {
            console.warn(`${d.과목} 상세 분석 로드 실패:`, e);
            detailedTableHtml = `<p style="font-size:0.8rem; color:#888; margin-top:10px;">(상세 분석 데이터를 불러올 수 없습니다: ${matchedSheet || '매칭 실패'})</p>`;
          }
        }

        subjectsHtml += `
                <div style="border: 1px solid #ddd; border-radius:10px; padding:1.2rem; margin-bottom:2rem; break-inside: avoid; background:#fff;">
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #3c3fa0; padding-bottom:0.5rem; margin-bottom:1rem;">
                        <span style="font-size:1.2rem; font-weight:bold; color:#3c3fa0;">${d.과목}</span>
                        <div style="display:flex; align-items:center; gap:1rem;">
                            <span style="font-size:0.9rem; color:#666;">등급</span>
                            <span style="font-size:1.1rem; font-weight:bold; background:#3c3fa0; color:#fff; width:36px; height:36px; display:flex; align-items:center; justify-content:center; border-radius:50%;">${d.등급 || '-'}</span>
                        </div>
                    </div>
                    <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:1rem; margin-bottom:1.5rem; background:#f9f9fb; padding:1rem; border-radius:8px;">
                        <div style="text-align:center;"><div style="font-size:0.75rem; color:#666;">원점수</div><div style="font-weight:bold; font-size:1.1rem;">${d.원점수 || '-'}</div></div>
                        <div style="text-align:center;"><div style="font-size:0.75rem; color:#666;">표준점수</div><div style="font-weight:bold; font-size:1.1rem;">${d.표준점수 || '-'}</div></div>
                        <div style="text-align:center;"><div style="font-size:0.75rem; color:#666;">백분위</div><div style="font-weight:bold; font-size:1.1rem;">${d.전국백분위 || '-'}%</div></div>
                        <div style="text-align:center;"><div style="font-size:0.75rem; color:#666;">상위(%)</div><div style="font-weight:bold; font-size:1.1rem;">${d.전국백분위 ? (100 - parseFloat(d.전국백분위)).toFixed(2) + '%' : '-'}</div></div>
                    </div>
                    
                    <div style="font-size:0.9rem; font-weight:bold; color:#555; margin-bottom:0.6rem; display:flex; align-items:center; gap:0.4rem;">
                        <span>📌</span> 정답률별 오답 문항 요약
                    </div>
                    <div style="background:#fff; border:1px solid #eee; padding:0.8rem; border-radius:6px;">
                        ${wrongHtml}
                    </div>

                    ${detailedTableHtml}
                </div>
              `;
      }

      const printWin = window.open("", "_blank", "width=900,height=900");
      printWin.document.write(`<!DOCTYPE html><html lang="ko"><head>
          <meta charset="UTF-8">
          <title>${currentMockMonth}월 모의고사 개별 리포트 - ${first.성명}</title>
          <style>
            @page { size: A4; margin: 15mm 20mm; }
            body { font-family: 'Malgun Gothic', sans-serif; color: #333; line-height: 1.5; margin: 0; padding: 0; background: #fff; -webkit-print-color-adjust: exact; }
            .container { max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 4px solid #3c3fa0; padding-bottom: 1rem; margin-bottom: 1.5rem; }
            .header h1 { margin: 0; color: #3c3fa0; font-size: 1.8rem; }
            .student-info { background: #f0f2f5; padding: 1.2rem; border-radius: 12px; margin-bottom: 1.5rem; display: flex; gap: 2rem; }
            .info-item { display: flex; flex-direction: column; }
            .info-label { font-size: 0.8rem; color: #666; font-weight: 500; }
            .info-value { font-size: 1.1rem; font-weight: 700; color: #111; }
            .footer { margin-top: 2rem; text-align: center; border-top: 1px solid #ddd; padding-top: 1rem; color: #888; font-size: 0.8rem; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            @media print {
              html { font-size: 9px; }
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head><body>
          <div class="container">
            <div class="header">
              <h1>📊 ${currentMockMonth}월 모의고사 성적 분석 리포트</h1>
              <div style="color:#666; font-size:0.85rem;">발행일: ${new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
            
            <div class="student-info">
              <div class="info-item"><span class="info-label">소속</span><span class="info-value">부안고등학교 ${first.학년}학년 ${first.반}반</span></div>
              <div class="info-item"><span class="info-label">번호</span><span class="info-value">${first.번호}번</span></div>
              <div class="info-item"><span class="info-label">성명</span><span class="info-value">${first.성명}</span></div>
            </div>

            <div class="subjects-container">
              ${subjectsHtml}
            </div>

            <div class="footer">
              부안고등학교 학생부 AI 분석 프로그램 | 생성일: ${new Date().toLocaleString()}
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(() => { window.print(); }, 800);
            };
          </script>
        </body></html>`);
      printWin.document.close();
    } catch (err) {
      console.error('리포트 생성 오류:', err);
      alert('리포트 생성 중 오류가 발생했습니다: ' + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
      }
    }
  }


  // --- CSAT Grid Initialization and Render function ---
  let csatGridInitialized = false;
  window.initCsatChart = function () { // kept name for compatibility with tab switch
    if (csatGridInitialized) return;
    if (typeof csatData === 'undefined') return;

    csatGridInitialized = true;

    // Create global tooltip if not exists
    if (!document.getElementById("csat-tooltip")) {
      const tt = document.createElement("div");
      tt.id = "csat-tooltip";
      tt.className = "custom-tooltip";
      document.body.appendChild(tt);
    }

    // 1. Populate Filters
    const regionSet = new Set(), sumSet = new Set(), countSet = new Set(), typeSet = new Set();
    csatData.forEach(item => {
      const region = item.지역 ? item.지역.trim() : "미표기";
      regionSet.add(region);
      if (item.전형) typeSet.add(item.전형.trim());
      if (item.등급합) sumSet.add(item.등급합);
      if (item.과목수) countSet.add(item.과목수);
    });

    const filterRegion = document.getElementById("csat-filter-region");
    const filterType = document.getElementById("csat-filter-type");
    const filterSubject = document.getElementById("csat-filter-subject");
    const filterGradeMin = document.getElementById("csat-filter-grade-min");
    const filterGradeMax = document.getElementById("csat-filter-grade-max");

    if (filterRegion) [...regionSet].sort().forEach(val => filterRegion.add(new Option(val, val)));
    if (filterType) [...typeSet].sort().forEach(val => filterType.add(new Option(val, val)));
    if (filterSubject) [...countSet].sort().forEach(val => filterSubject.add(new Option(val + "과목", val)));
    if (filterGradeMin && filterGradeMax) {
      [...sumSet].sort((a, b) => a - b).forEach(val => {
        filterGradeMin.add(new Option(val + "합", val));
        filterGradeMax.add(new Option(val + "합", val));
      });
    }

    // Event listeners for filters
    const render = () => renderCsatGrid();
    if (filterRegion) filterRegion.addEventListener("change", render);
    if (filterType) filterType.addEventListener("change", render);
    if (filterSubject) filterSubject.addEventListener("change", render);
    if (filterGradeMin) filterGradeMin.addEventListener("change", render);
    if (filterGradeMax) filterGradeMax.addEventListener("change", render);

    render();
  };

  function renderCsatGrid() {
    const container = document.getElementById("csatGridContainer");
    if (!container || typeof csatData === 'undefined') return;

    const rFilter = document.getElementById("csat-filter-region")?.value || 'all';
    const tFilter = document.getElementById("csat-filter-type")?.value || 'all';
    const sFilter = document.getElementById("csat-filter-subject")?.value || 'all';
    const gMinFilter = document.getElementById("csat-filter-grade-min")?.value || 'all';
    const gMaxFilter = document.getElementById("csat-filter-grade-max")?.value || 'all';

    const filtered = csatData.filter(item => {
      if (rFilter !== 'all') {
        const itemRegion = item.지역 ? item.지역.trim() : "미표기";
        if (itemRegion !== rFilter) return false;
      }
      if (tFilter !== 'all') {
        const itemType = item.전형 ? item.전형.trim() : "미표기";
        if (itemType !== tFilter) return false;
      }
      if (sFilter !== 'all' && String(item.과목수) !== sFilter) return false;

      const grade = parseInt(item.등급합);
      if (gMinFilter !== 'all' && grade < parseInt(gMinFilter)) return false;
      if (gMaxFilter !== 'all' && grade > parseInt(gMaxFilter)) return false;

      return true;
    });

    let html = '<div class="csat-matrix" style="grid-template-columns: 80px repeat(14, minmax(60px, 1fr));">';

    // Header Row: Empty top-left cell, then columns 1 to 14
    html += '<div class="matrix-header" style="background:transparent; border:none;"></div>';
    for (let x = 1; x <= 14; x++) {
      html += `<div class="matrix-header">${x}합</div>`;
    }

    // Rows: Y from 4 down to 1
    for (let y = 4; y >= 1; y--) {
      html += `<div class="matrix-label-y">${y}과목</div>`;
      for (let x = 1; x <= 14; x++) {
        // Find items matching this (x, y)
        const cellItems = filtered.filter(item => parseInt(item.등급합) === x && parseInt(item.과목수) === y);
        html += '<div class="matrix-cell">';
        cellItems.forEach((item) => {
          const rawIdx = csatData.indexOf(item);
          const tooltip = `${item.대학}(${item.지역}): ${item.학과} | ${item.기준문자열}`;
          html += `<div class="matrix-dot" data-idx="${rawIdx}" data-tooltip="${tooltip}"></div>`;
        });
        html += '</div>';
      }
    }
    html += '</div>';
    container.innerHTML = html;

    // Attach click and hover events to dots
    const tt = document.getElementById("csat-tooltip");
    container.querySelectorAll('.matrix-dot').forEach(el => {
      el.addEventListener('mouseenter', () => {
        tt.innerHTML = el.dataset.tooltip || '';
        tt.classList.add('visible');
        const rect = el.getBoundingClientRect();
        tt.style.left = (rect.left + rect.width / 2 + window.scrollX) + 'px';
        tt.style.top = (rect.top + window.scrollY) + 'px';
      });
      el.addEventListener('mouseleave', () => {
        tt.classList.remove('visible');
      });

      el.addEventListener("click", () => {
        const item = csatData[el.dataset.idx];
        const content = `
          <div style="color: var(--text-primary);">
            <table style="width:100%; border-collapse: collapse; margin-top: 0.5rem; text-align: left; font-size: 0.95rem;">
              <tr><th style="padding:10px; border-bottom:1px solid var(--panel-border); width: 30%;">평균등급</th><td style="padding:10px; border-bottom:1px solid var(--panel-border);">${item['평균등급'] || '-'}</td></tr>
              <tr><th style="padding:10px; border-bottom:1px solid var(--panel-border);">대학</th><td style="padding:10px; border-bottom:1px solid var(--panel-border);">${item['대학'] || '-'} (${item['지역'] || '-'})</td></tr>
              <tr><th style="padding:10px; border-bottom:1px solid var(--panel-border);">전형/전형명</th><td style="padding:10px; border-bottom:1px solid var(--panel-border);">${item['전형'] || '-'} / ${item['전형명'] || '-'}</td></tr>
              <tr><th style="padding:10px; border-bottom:1px solid var(--panel-border);">학과</th><td style="padding:10px; border-bottom:1px solid var(--panel-border); font-weight: bold; color: var(--accent-secondary);">${item['학과'] || '-'}</td></tr>
              <tr><th style="padding:10px; border-bottom:1px solid var(--panel-border);">기준요약</th><td style="padding:10px; border-bottom:1px solid var(--panel-border);">${item['과목수']}과목 합 ${item['등급합']} (${item['기준문자열'] || ''})</td></tr>
              <tr><th style="padding:10px; vertical-align:top;">최저기준 상세</th><td style="padding:10px; white-space:pre-wrap; line-height: 1.5; color: var(--accent-primary);">${item['최저기준'] || '-'}</td></tr>
            </table>
          </div>
        `;
        window.openPfDetailModal("수능최저 상세 정보", null);
        document.getElementById("modalBody").innerHTML = content;
      });
    });
  }


  const pfResultsUpload = document.getElementById("pf-results-upload");
  const pfStudentSelect = document.getElementById("pf-student-select");
  let pfStudents = [];
  let students = [];
  let pfDetails = { grades: [], subjects: [], creatives: [], behaviors: [] };

  if (pfResultsUpload) {
    pfResultsUpload.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async function (evt) {
        try {
          const workbook = XLSX.read(new Uint8Array(evt.target.result), { type: "array" });
          pfStudentSelect.innerHTML = "<option value='' disabled selected>\ud559\uc0dd\uc744 \uc120\ud0dd\ud558\uc138\uc694</option>";
          pfStudents = [];

          // Iterate all sheets to find valid student data
          workbook.SheetNames.forEach(sheetName => {
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
            console.log("[courseExcelUpload] Sheet:", sheetName, "Rows:", rows.slice(0, 5));
            let hIdx = -1;
            for (let i = 0; i < Math.min(rows.length, 30); i++) {
              const rs = (rows[i] || []).join("");
              if (rs.includes("성명") || rs.includes("이름") || rs.includes("수험번호")) { hIdx = i; break; }
            }

            if (hIdx !== -1) {
              const h = rows[hIdx];
              const nCol = h.findIndex(c => c && (String(c).includes("성명") || String(c).includes("이름") || String(c).includes("\ud559\uc0dd\uba85") || String(c).includes("\uc218\ud5d8\uc0dd\uba85")));
              const uCol = h.findIndex(c => c && (String(c).includes("\ub300\ud559\uad50") || String(c).includes("\ub300\ud559")));
              const dCol = h.findIndex(c => c && (String(c).includes("\ubaa8\uc9d1\ub2e8\uc704") || String(c).includes("\ud559\uacfc") || String(c).includes("\ud559\ubd80") || String(c).includes("\uc804\uacf5") || String(c).includes("\uc9c0\uc6d0\ud559\uacfc")));
              const rCol = h.findIndex(c => {
                if (!c) return false;
                const s = String(c).replace(/\s+/g, "");
                return s.includes("\ucd5c\uc885\ub2e8\uacc4") || s.includes("\ud569\uaca9\uc5ec\ubd80") || s.includes("\uacb0\uacfc") || s.includes("\ud569\ubd88") || s.includes("\ud310\uc815") || s.includes("\uc0c1\ud0dc");
              });
              const tCol = h.findIndex(c => {
                if (!c) return false;
                const s = String(c).replace(/\s+/g, "");
                return s.includes("\uc804\ud615\uba85") || s.includes("\uc804\ud615\uc720\ud615") || s.includes("\uc804\ud615\uc885\ub958") || s.includes("\uc804\ud615\uad6c\ubd84") || s.includes("\uc804\ud615");
              });

              // 일반등급 컬럼 찾기 (띄어쓰기, 괄호 형태 다양하게 매칭)
              const gCol5 = h.findIndex(c => {
                if (!c) return false;
                const s = String(c).replace(/\s+/g, "");
                return s.includes("일반등급") && (s.includes("5등급") || s.includes("(5)") || s.includes("5급"));
              });
              const gCol = h.findIndex(c => {
                if (!c) return false;
                const s = String(c).replace(/\s+/g, "");
                return s.includes("일반등급") && !s.includes("5등급") && !s.includes("(5)");
              });

              // 인덱스 기반 폴백 (최종단계는 보통 하단/옆에 위치)
              let finalRCol = rCol !== -1 ? rCol : 22; // 23번째 열 폴백
              let finalTCol = tCol !== -1 ? tCol : 8;  // 9번째 열 폴백
              let finalGCol = gCol !== -1 ? gCol : 17; // 18번째 열 폴백
              let finalGCol5 = gCol5 !== -1 ? gCol5 : 18; // 19번째 열 폴백

              console.log(`[PF] 컬럼 탐지: gCol(일반등급)=${gCol}(값:${h[gCol]}), gCol5(5등급)=${gCol5}(값:${h[gCol5]}), finalGCol=${finalGCol}, finalGCol5=${finalGCol5}`);

              console.log(`\uc2dc\ud2b8(${sheetName}) \ud5e4\ub354 \ubc1c\uacb0:`, h, "RCol:", finalRCol, "TCol:", finalTCol);

              for (let i = hIdx + 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length === 0) continue;
                const name = nCol !== -1 ? String(row[nCol] || "").trim() : "";
                if (!name || name === "성명" || name === "이름") continue;

                const univ = uCol !== -1 ? String(row[uCol] || "").trim() : "";
                const dept = dCol !== -1 ? String(row[dCol] || "").trim() : "";
                const admType = finalTCol !== -1 ? String(row[finalTCol] || "").trim() : "";

                // 학생부위주(종합) 필터 - 종합, 학종, 서류 등 포함
                const isComprehensive = admType.includes("종합") || admType.includes("\uc885\ud569") || admType.includes("\ud559\uc885") || admType.includes("\uc11c\ub958") || admType.includes("학종") || admType.includes("서류");
                if (!isComprehensive && admType !== "") continue;

                let raw = finalRCol !== -1 ? String(row[finalRCol] || "").replace(/\s+/g, "") : "";
                let res = raw || "\ud655\uc778\ubd88\uac00"; // '확인불가'로 수정

                if (raw.includes("\ubd88\ud569\uaca9") || raw.includes("\ud0c8\ub77d") || raw.includes("\ubd88\ud569")) res = "\ubd88\ud569\uaca9";
                else if (raw.includes("\ucd31\uc6d0") || raw.includes("\udd94\ud569") || raw.includes("\uc608\ube44")) res = "\ucd31\uc6d0\ud569\uaca9";
                else if (raw.includes("\ucd5c\ucd08") || raw.includes("\ud569\uaca9")) res = "\ud569\uaca9";

                let genGrade = finalGCol !== -1 ? String(row[finalGCol] || "").trim() : "-";
                let genGrade5 = finalGCol5 !== -1 && finalGCol5 !== undefined ? String(row[finalGCol5] || "").trim() : "-";
                let failReason = ""; // 불합격 사유 (현재 미사용)

                pfStudents.push({ name, univ, dept, result: res, type: admType, genGrade, genGrade5, failReason });
                const opt = document.createElement("option");
                opt.value = pfStudents.length - 1;
                opt.textContent = `[${res}] ${name} | ${univ} (${dept})`;
                pfStudentSelect.appendChild(opt);
              }
            }
          });
          console.log("\ucd94\ucd9c\ub41c \ud559\uc0dd \uc218:", pfStudents.length);
          localStorage.setItem("pfStudentsData", JSON.stringify(pfStudents));
          await StorageManager.save("pfStudents", pfStudents);
        } catch (err) { console.error(err); }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  const evalForm = document.getElementById("evalForm");
  const analyzeBtn = document.getElementById("analyzeBtn");
  const emptyState = document.getElementById("emptyState");
  const loadingState = document.getElementById("loadingState");
  const reportViewer = document.getElementById("reportViewer");
  const resetDataBtn = document.getElementById("reset-data-btn");
  const apiKeyInput = document.getElementById("api-key");

  if (typeof marked === 'undefined') {
    console.error("marked.js is not loaded!");
  } else {
    marked.setOptions({ breaks: true, gfm: true });
  }

  if (typeof XLSX === 'undefined') {
    console.error("xlsx.js is not loaded!");
  }

  const universitySelect = document.getElementById("university");
  const majorSelect = document.getElementById("major");
  const categorySelect = document.getElementById("category");
  const excelUpload = document.getElementById("excel-upload");
  const studentSelect = document.getElementById("student-select");
  let currentStudentSubjects = []; // 이수 과목명 저장용 (세특 추출 참고용)
  const gradeInput = document.getElementById("student-grade");
  const classInput = document.getElementById("student-class");
  const numberInput = document.getElementById("student-number");
  const nameInput = document.getElementById("student-name");
  const courseExcelUpload = document.getElementById("course-excel-upload");
  const coursesInput = document.getElementById("courses");
  const batchExcelUpload = document.getElementById("batch-excel-upload");
  const subjectInput = document.getElementById("subject-records");
  const creativeInput = document.getElementById("creative-activities");
  const behaviorInput = document.getElementById("behavioral-records");
  const achievementOnlyInput = document.getElementById("achievement-only");
  const averageGradeInput = document.getElementById("average-grade");

  let globalCourseJson = null;
  let globalBatchJsons = [];
  let lastReportData = null; // PDF \uc778\uc1c4\uc6a9 \ucd5c\uc2e0 \ub370\uc774\ud130 \uc800\uc7a5

  const universityData = {

    "\uac00\ucc9c\ub300\ud559\uad50": {

      "\uacbd\uc601 \ubc0f \uc0ac\ud68c\uacfc\ud559 \uacc4\uc5f4": ["\uacbd\uc601\ud559\uacfc", "\uacbd\uc81c\ud559\uacfc", "\uad00\uad11\uacbd\uc601\ud559\uacfc", "\uae08\uc735\u00b7\ube45\ub370\uc774\ud130\ud559\ubd80(\uae08\uc735\uc218\ud559\uc804\uacf5, \ube45\ub370\uc774\ud130\uacbd\uc601\uc804\uacf5)", "\ubbf8\ub514\uc5b4\ucee4\ubba4\ub2c8\ucf00\uc774\uc158\ud559\uacfc", "\uc0ac\ud68c\ubcf5\uc9c0\ud559\uacfc", "\uc2ec\ub9ac\ud559\uacfc", "\uc720\uc544\uad50\uc721\ud559\uacfc", "\uc751\uc6a9\ud1b5\uacc4\ud559\uacfc", "\uc758\ub8cc\uc0b0\uc5c5\uacbd\uc601\ud559\uacfc", "\ud328\uc158\uc0b0\uc5c5\ud559\uacfc", "\ud68c\uacc4\uc138\ubb34\ud559\uacfc"],

      "\uacf5\ud559 \ubc0f \uc2a4\ub9c8\ud2b8\uc2dc\ud2f0 \uacc4\uc5f4": ["\uac74\uc124\ud658\uacbd\uacf5\ud559\uacfc", "\uac74\ucd95\uacf5\ud559\uacfc", "\uac74\ucd95\ud559\ubd80", "\uae30\uacc4\uacf5\ud559\ubd80(\uae30\uacc4\uacf5\ud559, \ub85c\ubd07\uacf5\ud559, \uc124\ube44\u00b7\uc18c\ubc29\uacf5\ud559)", "\ub3c4\uc2dc\uacc4\ud68d\u00b7\uc870\uacbd\ud559\ubd80", "\ubbf8\ub798\uc790\ub3d9\ucc28\ud559\uacfc", "\uc2a4\ub9c8\ud2b8\ud329\ud1a0\ub9ac\ud559\uacfc", "\uc2e0\uc18c\uc7ac\uacf5\ud559\uacfc", "\ud654\uacf5\uc0dd\uba85\ubc30\ud130\ub9ac\uacf5\ud559\ubd80(\ud654\uacf5\uc0dd\uba85\uacf5\ud559, \ubc30\ud130\ub9ac\uacf5\ud559)"],

      "\uae30\ucd08\uacfc\ud559 \ubc0f \ubc14\uc774\uc624 \uacc4\uc5f4": ["\ubc14\uc774\uc624\ub098\ub178\ud559\uacfc", "\ubc18\ub3c4\uccb4\ubb3c\ub9ac\ud559\uacfc", "\uc0dd\uba85\uacfc\ud559\uacfc", "\uc2dd\ud488\uc0dd\uba85\uacf5\ud559\uacfc", "\uc2dd\ud488\uc601\uc591\ud559\uacfc", "\ud654\ud559\uacfc"],

      "\uc608\uc220\u00b7\uccb4\uc721 \ubc0f \uc790\uc720\uc804\uacf5": ["\ubbf8\uc220\u00b7\ub514\uc790\uc778\ud559\ubd80", "\uc5f0\uae30\uc608\uc220\ud559\uacfc", "\uc74c\uc545\ud559\ubd80", "\uc790\uc720\uc804\uacf5\ud559\ubd80", "\uccb4\uc721\ud559\ubd80"],

      "\uc758\uc57d\ud559 \ubc0f \ubcf4\uac74\u00b7\uba54\ub514\uceec \uacc4\uc5f4": ["\uac04\ud638\ud559\uacfc", "\ubb3c\ub9ac\uce58\ub8cc\ud559\uacfc", "\ubc14\uc774\uc624\ub85c\uc9c1\uc2a4\ud559\uacfc", "\ubc29\uc0ac\uc120\ud559\uacfc", "\uc57d\ud559\uacfc", "\uc6b4\ub3d9\uc7ac\ud65c\ud559\uacfc", "\uc751\uae09\uad6c\uc870\ud559\uacfc", "\uc758\uc608\uacfc", "\uce58\uc704\uc0dd\ud559\uacfc", "\ud55c\uc758\uc608\uacfc"],

      "\uc778\ubb38 \ubc0f \ubc95\ud559 \uacc4\uc5f4": ["\uacbd\ucc30\ud589\uc815\ud559\uacfc", "\ubc95\ud559\uacfc", "\uc601\ubbf8\uc5b4\ubb38\ud559\uacfc", "\uc720\ub7fd\uc5b4\ubb38\ud559\uacfc", "\uc77c\ubcf8\uc5b4\ubb38\ud559\uacfc", "\uc911\uad6d\uc5b4\ubb38\ud559\uacfc", "\ud55c\uad6d\uc5b4\ubb38\ud559\uacfc", "\ud589\uc815\ud559\uacfc"],

      "\ucca8\ub2e8 IT \ubc0f \ubc18\ub3c4\uccb4 \uacc4\uc5f4": ["\uac8c\uc784\u00b7\uc601\uc0c1\ud559\uacfc", "\ubc14\uc774\uc624\uc758\ub8cc\uae30\uae30\ud559\uacfc", "\ubc18\ub3c4\uccb4\u00b7\ub514\uc2a4\ud50c\ub808\uc774\ud559\uacfc", "\ubc18\ub3c4\uccb4\uacf5\ud559\uacfc", "\ubc18\ub3c4\uccb4\uc124\uacc4\ud559\uacfc", "\uc2a4\ub9c8\ud2b8\uc2dc\ud2f0\ud559\uacfc", "\uc2dc\uc2a4\ud15c\ubc18\ub3c4\uccb4\ud559\uacfc", "\uc758\uacf5\ud559\uacfc", "\uc778\uacf5\uc9c0\ub2a5\uc2dc\uc2a4\ud15c\ud559\uacfc", "\uc778\uacf5\uc9c0\ub2a5\ud559\uacfc", "\uc804\uae30\uacf5\ud559\uacfc", "\uc804\uc790\uacf5\ud559\uacfc", "\uc815\ubcf4\ubcf4\ud638\ud559\uacfc", "\ucef4\ud4e8\ud130\uacf5\ud559\uacfc"]

    },

    "\uac00\ud1a8\ub9ad\ub300\ud559\uad50": {

      "2026 \ucca8\ub2e8\ud559\uacfc": ["AI\uc758\uacf5\ud559\uacfc", "\ubc14\uc774\uc624\ub85c\uc9c1\uc2a4\uacf5\ud559\ubd80"],

      "\uae00\ub85c\ubc8c\uacbd\uc601\ub300\ud559 (\uc7ac\uc9c1\uc790 \uc804\ud615)": ["IT\ud30c\uc774\ub0b8\uc2a4\ud559\uacfc", "\uad6d\uc81c\uacbd\uc601\ud559\uacfc", "\uc138\ubb34\ud68c\uacc4\uae08\uc735\ud559\uacfc"],

      "\uae30\ucd08 \ubc0f \uc751\uc6a9\uacfc\ud559 \ubd84\uc57c": ["\ubb3c\ub9ac\ud559\uacfc", "\uc218\ud559\uacfc", "\ud654\ud559\uacfc"],

      "\ubb34\uc804\uacf5 / \uad11\uc5ed \ubaa8\uc9d1\ub2e8\uc704": ["\uc778\ubb38\uc0ac\ud68c\uacc4\uc5f4", "\uc790\uc5f0\uacf5\ud559\uacc4\uc5f4", "\uc790\uc720\uc804\uacf5\ud559\ubd80"],

      "\ubc14\uc774\uc624 \ubc0f \ud658\uacbd\uacf5\ud559 \ubd84\uc57c": ["\ubc14\uc774\uc624\uba54\ub514\uceec\ud654\ud559\uacf5\ud559\uacfc", "\uc0dd\uba85\uacf5\ud559\uacfc", "\uc5d0\ub108\uc9c0\ud658\uacbd\uacf5\ud559\uacfc", "\uc758\uc0dd\uba85\uacfc\ud559\uacfc"],

      "\uc0ac\ud68c\uacfc\ud559 \ubd84\uc57c": ["\uc0ac\ud68c\ubcf5\uc9c0\ud559\uacfc", "\uc0ac\ud68c\ud559\uacfc", "\uc2ec\ub9ac\ud559\uacfc", "\uc544\ub3d9\ud559\uacfc", "\ud589\uc815\ud559\uacfc"],

      "\uc0c1\uacbd\u00b7\ubc95\ud559 \ubd84\uc57c": ["\uacbd\uc601\ud559\uacfc", "\uacbd\uc81c\ud559\uacfc", "\uad6d\uc81c\ud559\ubd80", "\ubc95\ud559\uacfc", "\ud68c\uacc4\ud559\uacfc"],

      "\uc0dd\ud65c\uacfc\ud559 \ubd84\uc57c": ["\uacf5\uac04\ub514\uc790\uc778\u00b7\uc18c\ube44\uc790\ud559\uacfc", "\uc2dd\ud488\uc601\uc591\ud559\uacfc", "\uc758\ub958\ud559\uacfc"],

      "\uc18c\ud504\ud2b8\uc6e8\uc5b4 \ubc0f IT/\ub370\uc774\ud130 \ubd84\uc57c": ["\ub370\uc774\ud130\uc0ac\uc774\uc5b8\uc2a4\ud559\uacfc", "\ubbf8\ub514\uc5b4\uae30\uc220\ucf58\ud150\uce20\ud559\uacfc", "\ubc14\uc774\uc624\uba54\ub514\uceec\uc18c\ud504\ud2b8\uc6e8\uc5b4\ud559\uacfc", "\uc778\uacf5\uc9c0\ub2a5\ud559\uacfc", "\uc815\ubcf4\ud1b5\uc2e0\uc804\uc790\uacf5\ud559\ubd80", "\ucef4\ud4e8\ud130\uc815\ubcf4\uacf5\ud559\ubd80"],

      "\uc758\uc57d\u00b7\ubcf4\uac74\u00b7\uc0ac\ubc94\u00b7\uc2e0\ud559\u00b7\uc608\uccb4\ub2a5 \uacc4\uc5f4 (\ud2b9\uc218 \ubaa9\uc801)": ["\uac04\ud638\ud559\uacfc", "\uc2e0\ud559\uacfc", "\uc57d\ud559\uacfc", "\uc74c\uc545\uacfc", "\uc758\uc608\uacfc", "\ud2b9\uc218\uad50\uc721\uacfc"],

      "\uc778\ubb38\u00b7\uc5b4\ubb38\ud559 \ubd84\uc57c": ["\uad6d\uc0ac\ud559\uacfc", "\uad6d\uc5b4\uad6d\ubb38\ud559\uacfc", "\uc601\uc5b4\uc601\ubb38\ud559\ubd80", "\uc77c\uc5b4\uc77c\ubcf8\ubb38\ud654\ud559\uacfc", "\uc911\uad6d\uc5b8\uc5b4\ubb38\ud654\ud559\uacfc", "\ucca0\ud559\uacfc", "\ud504\ub791\uc2a4\uc5b4\ubb38\ud654\ud559\uacfc"]

    },

    "\uac74\uad6d\ub300\ud559\uad50": {

      "\uac74\ucd95\ub300\ud559": ["\uac74\ucd95\ud559\ubd80"],

      "\uacbd\uc601\ub300\ud559": ["\uacbd\uc601\ud559\uacfc", "\uae30\uc220\uacbd\uc601\ud559\uacfc"],

      "\uacf5\uacfc\ub300\ud559": ["K\ubdf0\ud2f0\uc0b0\uc5c5\uc735\ud569\ud559\uacfc", "\uacf5\uacfc\ub300\ud559\uc790\uc720\uc804\uacf5\ud559\ubd80", "\uae30\uacc4\u00b7\ub85c\ubd07\u00b7\uc790\ub3d9\ucc28\uacf5\ud559\ubd80", "\uc0ac\ud68c\ud658\uacbd\uacf5\ud559\ubd80", "\uc0b0\uc5c5\uacf5\ud559\uacfc", "\uc0dd\ubb3c\uacf5\ud559\uacfc", "\uc2e0\uc0b0\uc5c5\uc735\ud569\ud559\uacfc", "\uc7ac\ub8cc\uacf5\ud559\uacfc", "\uc804\uae30\uc804\uc790\uacf5\ud559\ubd80", "\ucef4\ud4e8\ud130\uacf5\ud559\ubd80", "\ud56d\uacf5\uc6b0\uc8fc\u00b7\ubaa8\ube4c\ub9ac\ud2f0\uacf5\ud559\uacfc", "\ud654\uacf5\ud559\ubd80"],

      "\ubb38\uacfc\ub300\ud559": ["\uad6d\uc5b4\uad6d\ubb38\ud559\uacfc", "\ubb38\uacfc\ub300\ud559\uc790\uc720\uc804\uacf5\ud559\ubd80", "\ubb38\ud654\ucf58\ud150\uce20\ud559\uacfc", "\ubbf8\ub514\uc5b4\ucee4\ubba4\ub2c8\ucf00\uc774\uc158\ud559\uacfc", "\uc0ac\ud559\uacfc", "\uc601\uc5b4\uc601\ubb38\ud559\uacfc", "\uc911\uc5b4\uc911\ubb38\ud559\uacfc", "\uc9c0\ub9ac\ud559\uacfc", "\ucca0\ud559\uacfc"],

      "\ubd80\ub3d9\uc0b0\uacfc\ud559\uc6d0": ["\ubd80\ub3d9\uc0b0\ud559\uacfc"],

      "\uc0ac\ubc94\ub300\ud559": ["\uad50\uc721\uacf5\ud559\uacfc", "\uc218\ud559\uad50\uc721\uacfc", "\uc601\uc5b4\uad50\uc721\uacfc", "\uc74c\uc545\uad50\uc721\uacfc", "\uc77c\uc5b4\uad50\uc721\uacfc", "\uccb4\uc721\uad50\uc721\uacfc"],

      "\uc0ac\ud68c\uacfc\ud559\ub300\ud559": ["\uacbd\uc81c\ud559\uacfc", "\uad6d\uc81c\ubb34\uc5ed\ud559\uacfc", "\uc0ac\ud68c\uacfc\ud559\ub300\ud559\uc735\ud569\uc804\uacf5\ud559\ubd80", "\uc751\uc6a9\ud1b5\uacc4\ud559\uacfc", "\uc815\uce58\uc678\uad50\ud559\uacfc", "\ud589\uc815\ud559\uacfc"],

      "\uc0c1\ud5c8\uad50\uc591\ub300\ud559": ["KU\uc790\uc720\uc804\uacf5\ud559\ubd80"],

      "\uc0dd\uba85\uacfc\ud559\ub300\ud559": ["\ub3d9\ubb3c\uc790\uc6d0\u00b7\uc2dd\ud488\uacfc\ud559\u00b7\uc720\ud1b5\ud559\ubd80", "\uc0dd\uba85\uacfc\ud559\ub300\ud559\uc790\uc720\uc804\uacf5\ud559\ubd80", "\uc0dd\uba85\uacfc\ud559\ud2b9\uc131\ud559\uacfc", "\uc2dd\ub7c9\uc790\uc6d0\uacfc\ud559\uacfc", "\ud658\uacbd\ubcf4\uac74\u00b7\uc0b0\ub9bc\uc870\uacbd\ud559\ubd80"],

      "\uc218\uc758\uacfc\ub300\ud559": ["\uc218\uc758\uc608\uacfc"],

      "\uc608\uc220\ub514\uc790\uc778\ub300\ud559": ["\ub9ac\ube59\ub514\uc790\uc778\ud559\uacfc", "\ub9e4\uccb4\uc5f0\uae30\ud559\uacfc", "\uc0b0\uc5c5\ub514\uc790\uc778\ud559\uacfc", "\uc601\uc0c1\ud559\uacfc", "\uc758\uc0c1\ub514\uc790\uc778\ud559\uacfc", "\ucee4\ubba4\ub2c8\ucf00\uc774\uc158\ub514\uc790\uc778\ud559\uacfc", "\ud604\ub300\ubbf8\uc220\ud559\uacfc"],

      "\uc735\ud569\uacfc\ud559\uae30\uc220\uc6d0": ["\uc2dc\uc2a4\ud15c\uc0dd\uba85\uacf5\ud559\uacfc", "\uc735\ud569\uacfc\ud559\uae30\uc220\uc6d0\uc790\uc720\uc804\uacf5\ud559\ubd80", "\uc735\ud569\uc0dd\uba85\uacf5\ud559\uacfc", "\ucca8\ub2e8\ubc14\uc774\uc624\uacf5\ud559\ubd80"],

      "\uc774\uacfc\ub300\ud559": ["\ubb3c\ub9ac\ud559\uacfc", "\uc218\ud559\uacfc", "\uc774\uacfc\ub300\ud559\uc790\uc720\uc804\uacf5\ud559\ubd80", "\ud654\ud559\uacfc"]

    },

    "\uacbd\uae30\ub300\ud559\uad50": {

      "\uad00\uad11\ubb38\ud654\ub300\ud559 (\uc11c\uc6b8\ucea0\ud37c\uc2a4)": ["\uad00\uad11\uac1c\ubc1c\uacbd\uc601\ud559\uacfc", "\uad00\uad11\ubb38\ud654\ucf58\ud150\uce20\ud559\uacfc", "\ubbf8\ub514\uc5b4\uc601\uc0c1\ud559\uacfc", "\ud638\ud154\uc678\uc2dd\uacbd\uc601\ud559\ubd80(\ud638\ud154\uacbd\uc601, \uc678\uc2dd\u00b7\uc870\ub9ac \uc804\uacf5)"],

      "\uc0ac\ud68c\uacfc\ud559\ub300\ud559": ["\uacbd\uc81c\ud559\ubd80(\uacbd\uc81c, \uc751\uc6a9\ud1b5\uacc4, \uc9c0\uc2dd\uc7ac\uc0b0 \uc804\uacf5)", "\uacf5\uacf5\uc548\uc804\ud559\ubd80(\ubc94\uc8c4\uad50\uc815\uc2ec\ub9ac, \uacbd\ucc30\ud589\uc815 \uc804\uacf5)", "\uacf5\uacf5\uc778\uc7ac\ud559\ubd80(\ud589\uc815, \uc815\uce58\uc678\uad50 \uc804\uacf5)", "\ubb34\uc5ed\ud559\uacfc", "\ubc95\ud559\uacfc", "\ud734\uba3c\uc11c\ube44\uc2a4\ud559\ubd80(\uc0ac\ud68c\ubcf5\uc9c0, \uccad\uc18c\ub144 \uc804\uacf5)"],

      "\uc18c\ud504\ud2b8\uc6e8\uc5b4\uacbd\uc601\ub300\ud559": ["AI\ucef4\ud4e8\ud130\uacf5\ud559\ubd80(\ucef4\ud4e8\ud130\uacf5\ud559, \uc778\uacf5\uc9c0\ub2a5, SW\uc548\uc804\ubcf4\uc548, \ubaa8\ube4c\ub9ac\ud2f0SW \uc804\uacf5)", "\uacbd\uc601\ud559\ubd80(\uacbd\uc601, \ud68c\uacc4\uc138\ubb34 \uc804\uacf5)", "\uc0b0\uc5c5\uacbd\uc601\uacf5\ud559\uacfc"],

      "\uc608\uc220\uccb4\uc721\ub300\ud559": ["Fine Arts\ud559\ubd80(\ud55c\uad6d\ud654, \uc11c\uc591\ud654, \ubbf8\uc220\uacbd\uc601, \uc11c\uc608 \uc804\uacf5)", "\ub514\uc790\uc778\ube44\uc988\ud559\ubd80(\uc2dc\uac01\uc815\ubcf4\ub514\uc790\uc778, \uc0b0\uc5c5\ub514\uc790\uc778, \ub9ac\ube59\u00b7\uc8fc\uc5bc\ub9ac\ub514\uc790\uc778 \uc804\uacf5)"],

      "\uc735\ud569\uacfc\ud559\ub300\ud559": ["\ubc14\uc774\uc624\uc735\ud569\ud559\ubd80(\uc0dd\uba85\uacfc\ud559, \uc2dd\ud488\uc0dd\ubb3c\uacf5\ud559 \uc804\uacf5)", "\uc218\ud559\uacfc", "\ud654\ud559\uacfc"],

      "\uc778\ubb38\ub300\ud559": ["\uad6d\uc5b4\uad6d\ubb38\ud559\uacfc", "\uae00\ub85c\ubc8c\uc5b4\ubb38\ud559\ubd80(\ub3c5\uc5b4\ub3c5\ubb38, \ud504\ub791\uc2a4\uc5b4\ubb38, \uc77c\uc5b4\uc77c\ubb38, \uc911\uc5b4\uc911\ubb38, \ub7ec\uc2dc\uc544\uc5b4\ubb38 \uc804\uacf5)", "\ubb38\ud5cc\uc815\ubcf4\ud559\uacfc", "\uc0ac\ud559\uacfc", "\uc601\uc5b4\uc601\ubb38\ud559\uacfc", "\uc720\uc544\uad50\uc721\uacfc"],

      "\ucc3d\uc758\uacf5\uacfc\ub300\ud559": ["\uac74\ucd95\ud559\uacfc(5\ub144\uc81c)", "\uae30\uacc4\uc2dc\uc2a4\ud15c\uacf5\ud559\uacfc", "\uc0ac\ud68c\uc5d0\ub108\uc9c0\uc2dc\uc2a4\ud15c\uacf5\ud559\uacfc", "\uc2a4\ub9c8\ud2b8\uc2dc\ud2f0\uacf5\ud559\ubd80(\uac74\ucd95\uacf5\ud559, \ub3c4\uc2dc\u00b7\uad50\ud1b5\uacf5\ud559 \uc804\uacf5)", "\uc2e0\uc18c\uc7ac\ud654\ud559\uacf5\ud559\ubd80(\uc2e0\uc18c\uc7ac\uacf5\ud559, \ud654\ud559\uacf5\ud559 \uc804\uacf5)", "\uc804\uc790\uacf5\ud559\ubd80(\ub098\ub178\u00b7\ubc18\ub3c4\uccb4, \uc815\ubcf4\ud1b5\uc2e0\uc2dc\uc2a4\ud15c \uc804\uacf5)"]

    },

    "\uacbd\ubd81\ub300\ud559\uad50": {

      "\ub18d\uc5c5\uc0dd\uba85\u00b7\uc0dd\ud0dc\ud658\uacbd \uacc4\uc5f4": ["\uace4\ucda9\uc0dd\uba85\uacfc\ud559\uacfc", "\uad00\uad11\ud559\uacfc", "\ub18d\uc0b0\uc5c5\ud559\uacfc", "\ub18d\uc5c5\ud1a0\ubaa9\uacf5\ud559\uacfc", "\ub3d9\ubb3c\uc0dd\uba85\uacf5\ud559\uacfc", "\ub9d0/\ud2b9\uc218\ub3d9\ubb3c\ud559\uacfc", "\ubc14\uc774\uc624\uc12c\uc720\uc18c\uc7ac\ud559\uacfc", "\uc0b0\ub9bc\uacfc\ud559\u00b7\uc870\uacbd\ud559\ubd80", "\uc0b0\ub9bc\uc0dd\ud0dc\ubcf4\ud638\ud559\uacfc", "\uc2a4\ub9c8\ud2b8\uc0dd\ubb3c\uc0b0\uc5c5\uae30\uacc4\uacf5\ud559\uacfc", "\uc2dd\ubb3c\uc758\ud559\uacfc", "\uc2dd\ubb3c\uc790\uc6d0\ud559\uacfc", "\uc2dd\ud488\uacf5\ud559\ubd80", "\uc2dd\ud488\uc790\uc6d0\uacbd\uc81c\ud559\uacfc", "\uc6d0\uc608\uacfc\ud559\uacfc", "\uc751\uc6a9\uc0dd\uba85\uacfc\ud559\ubd80", "\ucd95\uc0b0\ud559\uacfc"],

      "\uc0ac\ubc94\ub300\ud559 (\uad50\uc721 \uacc4\uc5f4)": ["\uac00\uc815\uad50\uc721\uacfc", "\uad50\uc721\ud559\uacfc", "\uad6d\uc5b4\uad50\uc721\uacfc", "\ub3c5\uc5b4\uad50\uc721\uc804\uacf5", "\ubb3c\ub9ac\uad50\uc721\uacfc", "\uc0dd\ubb3c\uad50\uc721\uacfc", "\uc218\ud559\uad50\uc721\uacfc", "\uc5ed\uc0ac\uad50\uc721\uacfc", "\uc601\uc5b4\uad50\uc721\uacfc", "\uc724\ub9ac\uad50\uc721\uacfc", "\uc77c\ubc18\uc0ac\ud68c\uad50\uc721\uacfc", "\uc815\ubcf4\u00b7\ucef4\ud4e8\ud130\uad50\uc721\uacfc", "\uc9c0\uad6c\uacfc\ud559\uad50\uc721\uacfc", "\uc9c0\ub9ac\uad50\uc721\uacfc", "\uccb4\uc721\uad50\uc721\uacfc", "\ud654\ud559\uad50\uc721\uacfc"],

      "\uc758\uc57d\u00b7\ubcf4\uac74\u00b7\uc0dd\ud65c\uacfc\ud559 \uacc4\uc5f4": ["\uac04\ud638\ub300\ud559 (\uac04\ud638\ud559\uacfc)", "\uc218\uc758\uacfc\ub300\ud559 (\uc218\uc758\uc608\uacfc)", "\uc2dd\ud488\uc601\uc591\ud559\uacfc", "\uc544\ub3d9\ud559\ubd80", "\uc57d\ud559\ub300\ud559 (\uc57d\ud559\uacfc)", "\uc758\uacfc\ub300\ud559 (\uc758\uc608\uacfc)", "\uc758\ub958\ud559\uacfc", "\uce58\uacfc\ub300\ud559 (\uce58\uc758\uc608\uacfc)"],

      "\uc778\ubb38\u00b7\uc0ac\ud68c\u00b7\uacbd\uc0c1 \uacc4\uc5f4 (\ubb38\uacfc \uc131\ud5a5)": ["\uacbd\uc601\ud559\ubd80", "\uacbd\uc81c\ud1b5\uc0c1\ud559\ubd80", "\uace0\uace0\uc778\ub958\ud559\uacfc", "\uad6d\uc5b4\uad6d\ubb38\ud559\uacfc", "\ub178\uc5b4\ub178\ubb38\ud559\uacfc", "\ub3c5\uc5b4\ub3c5\ubb38\ud559\uacfc", "\ubb38\ud5cc\uc815\ubcf4\ud559\uacfc", "\ubbf8\ub514\uc5b4\ucee4\ubba4\ub2c8\ucf00\uc774\uc158\ud559\uacfc", "\ubd88\uc5b4\ubd88\ubb38\ud559\uacfc", "\uc0ac\ud559\uacfc", "\uc0ac\ud68c\ubcf5\uc9c0\ud559\ubd80", "\uc0ac\ud68c\ud559\uacfc", "\uc2ec\ub9ac\ud559\uacfc", "\uc601\uc5b4\uc601\ubb38\ud559\uacfc", "\uc77c\uc5b4\uc77c\ubb38\ud559\uacfc", "\uc815\uce58\uc678\uad50\ud559\uacfc", "\uc911\uc5b4\uc911\ubb38\ud559\uacfc", "\uc9c0\ub9ac\ud559\uacfc", "\ucca0\ud559\uacfc", "\ud55c\ubb38\ud559\uacfc", "\ud589\uc815\ud559\ubd80"],

      "\uc790\uc5f0\uacfc\ud559\u00b7\uacf5\ud559\u00b7IT \uacc4\uc5f4 (\uc774\uacfc \uc131\ud5a5)": ["\uac74\uc124\ubc29\uc7ac\uacf5\ud559\uacfc", "\uac74\ucd95\ud559\ubd80(\uac74\ucd95\uacf5\ud559\uc804\uacf5)", "\uac74\ucd95\ud559\ubd80(\uac74\ucd95\ud559\uc804\uacf5 - 5\ub144\uc81c)", "\uace0\ubd84\uc790\uacf5\ud559\uacfc", "\uae08\uc18d\uc7ac\ub8cc\uacf5\ud559\uacfc", "\uae30\uacc4\uacf5\ud559\ubd80", "\ub098\ub178\uc2e0\uc18c\uc7ac\uacf5\ud559\uacfc", "\ubb3c\ub9ac\ud559\uacfc", "\uc0dd\uba85\uacfc\ud559\ubd80", "\uc0dd\ubb3c\ud559\uacfc", "\uc12c\uc720\uc2dc\uc2a4\ud15c\uacf5\ud559\uacfc", "\uc12c\uc720\ud328\uc158\ub514\uc790\uc778\ud559\ubd80(\uc12c\uc720\uacf5\ud559\uc804\uacf5)", "\uc12c\uc720\ud328\uc158\ub514\uc790\uc778\ud559\ubd80(\ud328\uc158\ub514\uc790\uc778\uc804\uacf5)", "\uc18c\ud504\ud2b8\uc6e8\uc5b4\ud559\uacfc", "\uc218\ud559\uacfc", "\uc2a4\ub9c8\ud2b8\ud50c\ub79c\ud2b8\uacf5\ud559\uacfc", "\uc2dd\ud488\uc678\uc2dd\uc0b0\uc5c5\ud559\uacfc", "\uc2e0\uc18c\uc7ac\uacf5\ud559\uacfc", "\uc5d0\ub108\uc9c0\uacf5\ud559\ubd80", "\uc5d0\ub108\uc9c0\ud654\ud559\uacf5\ud559\uacfc", "\uc704\uce58\uc815\ubcf4\uc2dc\uc2a4\ud15c\ud559\uacfc", "\uc751\uc6a9\ud654\ud559\uacf5\ud559\ubd80", "\uc790\ub3d9\ucc28\uacf5\ud559\uacfc", "\uc804\uae30\uacf5\ud559\uacfc", "\uc804\uc790\uacf5\ud559\ubd80", "\uc804\uc790\uacf5\ud559\ubd80(\ubaa8\ubc14\uc77c\uacf5\ud559\uc804\uacf5)", "\uc815\ubc00\uae30\uacc4\uacf5\ud559\uacfc", "\uc9c0\uad6c\uc2dc\uc2a4\ud15c\uacfc\ud559\ubd80", "\uce58\uc704\uc0dd\ud559\uacfc", "\ucef4\ud4e8\ud130\ud559\ubd80(\uc804 \uc804\uacf5)", "\ud1a0\ubaa9\uacf5\ud559\uacfc", "\ud1b5\uacc4\ud559\uacfc", "\ud654\ud559\uacfc", "\ud658\uacbd\uacf5\ud559\uacfc", "\ud658\uacbd\uc548\uc804\uacf5\ud559\uacfc"]

    },

    "\uacbd\ud76c\ub300\ud559\uad50": {

      "\uacf5\ud559/\uc804\uc790/\ucef4\ud4e8\ud130\uacc4\uc5f4": ["\uac74\ucd95\uacf5\ud559\uacfc", "\uac74\ucd95\ud559\uacfc", "\uae30\uacc4\uacf5\ud559\ubd80", "\ubbf8\ub798\uc815\ubcf4\ub514\uc2a4\ud50c\ub808\uc774\ud559\ubd80", "\ubc18\ub3c4\uccb4\uacf5\ud559\uacfc", "\uc0ac\ud68c\uae30\ubc18\uc2dc\uc2a4\ud15c\uacf5\ud559\uacfc", "\uc0dd\uccb4\uc758\uacf5\ud559\uacfc", "\uc18c\ud504\ud2b8\uc6e8\uc5b4\uc735\ud569\ud559\uacfc", "\uc2e0\uc18c\uc7ac\uacf5\ud559\uacfc", "\uc6d0\uc790\ub825\uacf5\ud559\uacfc", "\uc804\uc790\uacf5\ud559\uacfc", "\ucef4\ud4e8\ud130\uacf5\ud559\ubd80(\ucef4\ud4e8\ud130\uacf5\ud559\uacfc/\uc778\uacf5\uc9c0\ub2a5\ud559\uacfc)"],

      "\uc0dd\uba85/\ud658\uacbd\uacc4\uc5f4": ["\uc0dd\ubb3c\ud559\uacfc", "\uc2a4\ub9c8\ud2b8\ud31c\uacfc\ud559\uacfc", "\uc2dd\ud488\uc0dd\uba85\uacf5\ud559\uacfc", "\uc2dd\ud488\uc601\uc591\ud559\uacfc", "\uc720\uc804\uc0dd\uba85\uacf5\ud559\uacfc", "\uc735\ud569\ubc14\uc774\uc624\u00b7\uc2e0\uc18c\uc7ac\uacf5\ud559\uacfc", "\ud658\uacbd\ud559\ubc0f\ud658\uacbd\uacf5\ud559\uacfc"],

      "\uc21c\uc218/\uc751\uc6a9\uacfc\ud559\uacc4\uc5f4": ["\uc6b0\uc8fc\uacfc\ud559\uacfc", "\uc751\uc6a9\ubb3c\ub9ac\ud559\uacfc", "\uc751\uc6a9\uc218\ud559\uacfc", "\uc751\uc6a9\ud654\ud559\uacfc", "\uc9c0\ub9ac\ud559\uacfc", "\ud654\ud559\uacfc"],

      "\uc608\uccb4\ub2a5/\uae30\ud0c0\uacc4\uc5f4": ["\ub3c4\uc608\ud559\uacfc", "\ub514\uc9c0\ud138\ucf58\ud150\uce20\ud559\uacfc", "\uc0b0\uc5c5\ub514\uc790\uc778\ud559\uacfc", "\uc2dc\uac01\ub514\uc790\uc778\ud559\uacfc", "\uc5f0\uadf9\uc601\ud654\ud559\uacfc(\uc601\ud654\uc5f0\ucd9c \ubc0f \uc81c\uc791)", "\uc758\ub958\ub514\uc790\uc778\ud559\uacfc", "\uc790\uc728\uc804\uacf5\ud559\ubd80/\uc790\uc720\uc804\uacf5\ud559\ubd80", "\ud658\uacbd\uc870\uacbd\ub514\uc790\uc778\ud559\uacfc"],

      "\uc758\uc57d/\ubcf4\uac74\uacc4\uc5f4": ["\uac04\ud638\ud559\uacfc", "\uc57d\uacfc\ud559\uacfc", "\uc57d\ud559\uacfc", "\uc758\uc608\uacfc", "\uce58\uc758\uc608\uacfc", "\ud55c\uc57d\ud559\uacfc", "\ud55c\uc758\uc608\uacfc(\uc790\uc5f0)"]

    },

    "\uace0\ub824\ub300\ud559\uad50": {

      "\uacbd\uc0c1 \uae30\ud0c0": ["\uacbd\uc601\ub300\ud559", "\uad6d\uc81c\ud559\ubd80", "\ub514\uc790\uc778\uc870\ud615\ud559\ubd80", "\uccb4\uc721\uad50\uc721\uacfc"],

      "\uc778\ubb38\u00b7\uc0ac\ud68c\uacc4\uc5f4": ["\uacbd\uc81c\ud559\uacfc", "\ub178\uc5b4\ub178\ubb38\ud559\uacfc", "\ub3c5\uc5b4\ub3c5\ubb38\ud559\uacfc", "\ubd88\uc5b4\ubd88\ubb38\ud559\uacfc", "\uc0ac\ud68c\ud559\uacfc", "\uc2ec\ub9ac\ud559\uacfc", "\uc601\uc5b4\uc601\ubb38\ud559\uacfc", "\uc815\uce58\uc678\uad50\ud559\uacfc", "\uc911\uc5b4\uc911\ubb38\ud559\uacfc", "\ucca0\ud559\uacfc", "\ud55c\uad6d\uc5b4\ubb38\ud559\uacfc", "\ud589\uc815\ud559\uacfc"],

      "\uc790\uc5f0\u00b7\uacf5\ud559\u00b7\uc0dd\ud65c\uacc4\uc5f4": ["\uae30\uacc4\uacf5\ud559\ubd80", "\ub1cc\uc778\uc9c0\uacfc\ud559\uacfc", "\ub370\uc774\ud130\uacfc\ud559\ubd80", "\ubc18\ub3c4\uccb4\uacf5\ud559\uacfc", "\uc0ac\uc774\ubc84\uad6d\ubc29\ud559\uacfc", "\uc0b0\uc5c5\uacbd\uc601\uacf5\ud559\ubd80", "\uc0dd\uba85\uacfc\ud559\ubd80", "\uc2a4\ub9c8\ud2b8\ubcf4\uc548\ud559\ubd80", "\uc2e0\uc18c\uc7ac\uacf5\ud559\ubd80", "\uc758\uc0dd\uba85\uacf5\ud559\ubd80", "\uc804\uae30\uc804\uc790\uacf5\ud559\ubd80", "\ucef4\ud4e8\ud130\ud559\uacfc", "\ud654\uacf5\uc0dd\uba85\uacf5\ud559\ubd80", "\ud658\uacbd\uc0dd\ud0dc\uacf5\ud559\ubd80"]

    },

    "\uad11\uc6b4\ub300\ud559\uad50": {

      "\uacbd\uc601\ub300\ud559": ["\uacbd\uc601\ud559\ubd80(\uacbd\uc601\ud559\uc804\uacf5, \ube45\ub370\uc774\ud130\uacbd\uc601\uc804\uacf5)", "\uad6d\uc81c\ud1b5\uc0c1\ud559\ubd80"],

      "\uacf5\uacfc\ub300\ud559": ["\uac74\ucd95\uacf5\ud559\uacfc", "\uac74\ucd95\ud559\uacfc(5\ub144\uc81c)", "\ud654\ud559\uacf5\ud559\uacfc", "\ud658\uacbd\uacf5\ud559\uacfc"],

      "\uc778\uacf5\uc9c0\ub2a5\uc735\ud569\ub300\ud559": ["\ub85c\ubd07\ud559\ubd80(AI\ub85c\ubd07\uc804\uacf5)", "\uc18c\ud504\ud2b8\uc6e8\uc5b4\ud559\ubd80", "\uc815\ubcf4\uc735\ud569\ud559\ubd80", "\ucef4\ud4e8\ud130\uc815\ubcf4\uacf5\ud559\ubd80"],

      "\uc778\ubb38\uc0ac\ud68c\uacfc\ud559\ub300\ud559": ["\uad6d\uc5b4\uad6d\ubb38\ud559\uacfc", "\ub3d9\ubd81\uc544\ubb38\ud654\uc0b0\uc5c5\ud559\ubd80", "\ubbf8\ub514\uc5b4\ucee4\ubba4\ub2c8\ucf00\uc774\uc158\ud559\ubd80", "\uc0b0\uc5c5\uc2ec\ub9ac\ud559\uacfc", "\uc601\uc5b4\uc0b0\uc5c5\ud559\uacfc"],

      "\uc778\uc81c\ub2c8\uc6c0\ub300\ud559": ["\uc790\uc728\uc804\uacf5\ud559\ubd80(\uc790\uc5f0/\uc778\ubb38)"],

      "\uc790\uc5f0\uacfc\ud559\ub300\ud559": ["\uc218\ud559\uacfc", "\uc2a4\ud3ec\uce20\uc735\ud569\uacfc\ud559\uacfc", "\uc804\uc790\ubc14\uc774\uc624\ubb3c\ub9ac\ud559\uacfc", "\ud654\ud559\uacfc"],

      "\uc804\uc790\uc815\ubcf4\uacf5\uacfc\ub300\ud559": ["\ubc18\ub3c4\uccb4\uc2dc\uc2a4\ud15c\uacf5\ud559\ubd80(\ubc18\ub3c4\uccb4\uc2dc\uc2a4\ud15c\uacf5\ud559\uc804\uacf5)", "\uc804\uae30\uacf5\ud559\uacfc", "\uc804\uc790\uacf5\ud559\uacfc", "\uc804\uc790\uc735\ud569\uacf5\ud559\uacfc", "\uc804\uc790\uc7ac\ub8cc\uacf5\ud559\uacfc", "\uc804\uc790\ud1b5\uc2e0\uacf5\ud559\uacfc"],

      "\uc815\ucc45\ubc95\ud559\ub300\ud559": ["\uad6d\uc81c\ud559\ubd80", "\ubc95\ud559\ubd80", "\ud589\uc815\ud559\uacfc"],

      "\ucc38\ube5b\uc778\uc7ac\ub300\ud559 (\uc815\uc6d0\uc678 \ub4f1)": ["\uac8c\uc784\ucf58\ud150\uce20\ud559\uacfc", "\uae08\uc735\ubd80\ub3d9\uc0b0\ubc95\ubb34\ud559\uacfc", "\uc2a4\ub9c8\ud2b8\uc804\uae30\uc804\uc790\ud559\uacfc", "\uc2a4\ud3ec\uce20\uc0c1\ub2f4\uc7ac\ud65c\ud559\uacfc"]

    },

    "\uad6d\ubbfc\ub300\ud559\uad50": {

      "\uacbd\uc601/AI\ube45\ub370\uc774\ud130": ["AI\ube45\ub370\uc774\ud130\uc735\ud569\uacbd\uc601\ud559\uacfc", "\uacbd\uc601\uc815\ubcf4\ud559\ubd80", "\uacbd\uc601\ud559\ubd80"],

      "\uacf5\uacfc/\uc790\ub3d9\ucc28/\uc18c\ud504\ud2b8\uc6e8\uc5b4": ["\uac74\uc124\uc2dc\uc2a4\ud15c\uacf5\ud559\ubd80", "\uae30\uacc4\uacf5\ud559\ubd80", "\ubbf8\ub798\ubaa8\ube4c\ub9ac\ud2f0\ud559\uacfc", "\uc18c\ud504\ud2b8\uc6e8\uc5b4\ud559\ubd80", "\uc2e0\uc18c\uc7ac\uacf5\ud559\ubd80", "\uc778\uacf5\uc9c0\ub2a5\ud559\ubd80", "\uc790\ub3d9\ucc28IT\uc735\ud569\ud559\uacfc", "\uc790\ub3d9\ucc28\uacf5\ud559\uacfc", "\uc804\uc790\uacf5\ud559\ubd80"],

      "\uacfc\ud559\uae30\uc220/\uac74\ucd95": ["\uac74\ucd95\ud559\ubd80", "\ub098\ub178\uc804\uc790\ubb3c\ub9ac\ud559\uacfc", "\ubc14\uc774\uc624\ubc1c\ud6a8\uc735\ud569\ud559\uacfc", "\uc0b0\ub9bc\ud658\uacbd\uc2dc\uc2a4\ud15c\ud559\uacfc", "\uc2dd\ud488\uc601\uc591\ud559\uacfc", "\uc751\uc6a9\ud654\ud559\ubd80", "\uc784\uc0b0\uc0dd\uba85\uacf5\ud559\uacfc", "\uc815\ubcf4\ubcf4\uc548\uc554\ud638\uc218\ud559\uacfc"],

      "\uae00\ub85c\ubc8c\uc778\ubb38/\uc0ac\ud68c/\ubc95\ud559/\uacbd\uc0c1": ["\uacbd\uc81c\ud559\uacfc", "\uad50\uc721\ud559\uacfc", "\uad6d\uc81c\ud1b5\uc0c1\ud559\uacfc", "\ub7ec\uc2dc\uc544\u00b7\uc720\ub77c\uc2dc\uc544\ud559\uacfc", "\ubbf8\ub514\uc5b4\u00b7\uad11\uace0\ud559\ubd80", "\ubc95\ud559\ubd80", "\uc0ac\ud68c\ud559\uacfc", "\uc601\uc5b4\uc601\ubb38\ud559\ubd80", "\uc77c\ubcf8\ud559\uacfc", "\uc815\uce58\uc678\uad50\ud559\uacfc", "\uc911\uad6d\ud559\ubd80", "\ud55c\uad6d\uc5b4\ubb38\ud559\ubd80", "\ud55c\uad6d\uc5ed\uc0ac\ud559\uacfc", "\ud589\uc815\ud559\uacfc"],

      "\uc608\uc220/\uccb4\uc721": ["\uacf5\uc5f0\uc608\uc220\ud559\ubd80", "\ubbf8\uc220\ud559\ubd80", "\uc2a4\ud3ec\uce20\uac74\uac15\uc7ac\ud65c\ud559\uacfc", "\uc2a4\ud3ec\uce20\uad50\uc721\ud559\uacfc", "\uc2a4\ud3ec\uce20\uc0b0\uc5c5\ub808\uc800\ud559\uacfc", "\uc74c\uc545\ud559\ubd80"],

      "\uc790\uc720\uc804\uacf5/\uc735\ud569": ["\ubbf8\ub798\uc735\ud569\ud559\ubd80", "\uc804\uacf5\uc790\uc728\uc120\ud0dd\uc81c(\uc790\uc720\uc804\uacf5)"],

      "\uc870\ud615\ub300\ud559(\ub514\uc790\uc778)": ["AI\ub514\uc790\uc778\ud559\uacfc", "\uacf5\uac04\ub514\uc790\uc778\ud559\uacfc", "\uacf5\uc5c5\ub514\uc790\uc778\ud559\uacfc", "\uae08\uc18d\uacf5\uc608\ud559\uacfc", "\ub3c4\uc790\uacf5\uc608\ud559\uacfc", "\uc2dc\uac01\ub514\uc790\uc778\ud559\uacfc", "\uc601\uc0c1\ub514\uc790\uc778\ud559\uacfc", "\uc758\uc0c1\ub514\uc790\uc778\ud559\uacfc", "\uc790\ub3d9\ucc28\u00b7\uc6b4\uc1a1\ub514\uc790\uc778\ud559\uacfc"]

    },

    "\ub2e8\uad6d\ub300\ud559\uad50": {

      "\uc8fd\uc804-\uacf5\ud559/SW/AI": ["SW\uc735\ud569\uacc4\uc5f4\uad11\uc5ed", "\uac74\ucd95\ud559\ubd80(\uac74\ucd95\uacf5\ud559/\uac74\ucd95\ud559(5\ub144))", "\uace0\ubd84\uc790\uc2dc\uc2a4\ud15c\uacf5\ud559\ubd80(\uace0\ubd84\uc790/\uc735\ud569\uc18c\uc7ac)", "\uacf5\ud559\uacc4\uc5f4\uad11\uc5ed", "\uae30\uacc4\uacf5\ud559\uacfc", "\uc0ac\uc774\ubc84\ubcf4\uc548\ud559\uacfc", "\uc18c\ud504\ud2b8\uc6e8\uc5b4\ud559\uacfc", "\uc735\ud569\ubc18\ub3c4\uccb4\uacf5\ud559\uacfc", "\uc778\uacf5\uc9c0\ub2a5\ud559\uacfc", "\uc778\ud504\ub77c\uac74\uc124\uacf5\ud559\uacfc", "\uc804\uc790\uc804\uae30\uacf5\ud559\ubd80", "\ucef4\ud4e8\ud130\uacf5\ud559\uacfc", "\ud1b5\uacc4\ub370\uc774\ud130\uc0ac\uc774\uc5b8\uc2a4\ud559\uacfc", "\ud654\ud559\uacf5\ud559\uacfc"],

      "\uc8fd\uc804-\uad11\uc5ed/\uc778\ubb38/\uc0ac\ud68c": ["\uacbd\uc601\ud559\ubd80", "\uacbd\uc81c\ud559\uacfc", "\uad6d\uc5b4\uad6d\ubb38\ud559\uacfc", "\ub3c4\uc2dc\uacc4\ud68d\u00b7\ubd80\ub3d9\uc0b0\ud559\ubd80", "\ubb34\uc5ed\ud559\uacfc", "\ubbf8\ub514\uc5b4\ucee4\ubba4\ub2c8\ucf00\uc774\uc158\ud559\ubd80", "\ubc95\ud559\uacfc", "\uc0ac\ud559\uacfc", "\uc0ac\ud68c\uacc4\uc5f4\uad11\uc5ed", "\uc0b0\uc5c5\uacbd\uc601\ud559\uacfc(\uc57c)", "\uc0c1\ub2f4\ud559\uacfc", "\uc601\ubbf8\uc778\ubb38\ud559\uacfc", "\uc778\ubb38\uacc4\uc5f4\uad11\uc5ed", "\uc815\uce58\uc678\uad50\ud559\uacfc", "\ucca0\ud559\uacfc", "\ud589\uc815\ud559\uacfc"],

      "\uc8fd\uc804-\uc0ac\ubc94/\uae30\ud0c0": ["\uacfc\ud559\uad50\uc721\uacfc", "\uad6d\uc81c\uacbd\uc601\ud559\uacfc", "\ubaa8\ubc14\uc77c\uc2dc\uc2a4\ud15c\uacf5\ud559\uacfc", "\uc218\ud559\uad50\uc721\uacfc", "\uccb4\uc721\uad50\uc721\uacfc", "\ud2b9\uc218\uad50\uc721\uacfc", "\ud55c\ubb38\uad50\uc721\uacfc"],

      "\ucc9c\uc548-\uacf5\uacf5/\ubcf4\uac74": ["\uacf5\uacf5\uc815\ucc45\ud559\uacfc", "\uacf5\uacf5\uc815\ucc45\ud559\uacfc(\uc57c)", "\ubb3c\ub9ac\uce58\ub8cc\ud559\uacfc", "\ubcf4\uac74\ud589\uc815\ud559\uacfc", "\uc0ac\ud68c\ubcf5\uc9c0\ud559\uacfc", "\uc2dd\ud488\uc790\uc6d0\uacbd\uc81c\ud559\uacfc", "\uc2ec\ub9ac\ud559\uacfc", "\uc784\uc0c1\ubcd1\ub9ac\ud559\uacfc", "\uce58\uc704\uc0dd\ud559\uacfc", "\ud574\ubcd1\ub300\uad70\uc0ac\ud559\uacfc"],

      "\ucc9c\uc548-\uad11\uc5ed/\uc678\uad6d\uc5b4": ["\uae00\ub85c\ubc8c\ud55c\uad6d\uc5b4\uacfc", "\uc544\uc2dc\uc544\uc911\ub3d9\ud559\ubd80(\uc911\uad6d/\uc77c\ubcf8/\ubabd\uace8/\uc911\ub3d9/\ubca0\ud2b8\ub0a8)", "\uc601\uc5b4\uacfc", "\uc720\ub7fd\uc911\ub0a8\ubbf8\ud559\ubd80(\ub3c5\uc77c/\ud504\ub791\uc2a4/\uc2a4\ud398\uc778\uc911\ub0a8\ubbf8/\ub7ec\uc2dc\uc544/\ud3ec\ub974\ud22c\uac08\ube0c\ub77c\uc9c8)", "\uc778\ubb38\uc0ac\ud68c\uacc4\uc5f4\uad11\uc5ed"],

      "\ucc9c\uc548-\uc608\uc220/\uc2a4\ud3ec\uce20": ["\uad6d\uc81c\uc2a4\ud3ec\uce20\ud559\ubd80(\uc6b4\ub3d9\ucc98\ubc29\uc7ac\ud65c)", "\ubb38\uc608\ucc3d\uc791\uacfc", "\uc2a4\ud3ec\uce20\uacbd\uc601\ud559\uacfc"],

      "\ucc9c\uc548-\uc758\ud559/\uac04\ud638/\uc57d\ud559": ["\uac04\ud638\ud559\uacfc", "\uc57d\ud559\uacfc", "\uc758\uc608\uacfc", "\uce58\uc758\uc608\uacfc"],

      "\ucc9c\uc548-\uc790\uc5f0/\ubc14\uc774\uc624": ["\uacbd\uc601\uacf5\ud559\uacfc", "\ubb3c\ub9ac\ud559\uacfc", "\uc0dd\uba85\uacf5\ud559\ubd80(\uc2dd\ub7c9\uc0dd\uba85/\ub3d9\ubb3c\uc0dd\uba85/\ud658\uacbd\uc6d0\uc608/\ub179\uc9c0\uc870\uacbd)", "\uc218\ud559\uacfc", "\uc2dd\ud488\uacf5\ud559\uacfc", "\uc2dd\ud488\uc601\uc591\ud559\uacfc", "\uc2e0\uc18c\uc7ac\uacf5\ud559\uacfc", "\uc5d0\ub108\uc9c0\uacf5\ud559\uacfc", "\uc758\uc0dd\uba85\uacfc\ud559\ubd80(\uc758\uc0dd\uba85\uc2dc\uc2a4\ud15c/\uc0dd\uba85\uacfc\ud559/\ubbf8\uc0dd\ubb3c)", "\uc790\uc5f0\uacf5\ud559\uacc4\uc5f4\uad11\uc5ed", "\uc81c\uc57d\uacf5\ud559\uacfc", "\ucf54\uc2a4\uba54\ub514\uceec\uc18c\uc7ac\ud559\uacfc", "\ud654\ud559\uacfc"]

    },

    "\ub3d9\uad6d\ub300\ud559\uad50": {

      "경영대학 (단과대학 단위 모집 포함)": ["경영정보학과", "경영학과", "회계학과"],

      "경찰사법대학": ["경찰행정학부"],

      "공과대학": ["건설환경공학과", "건축공학부(건축공학전공, 건축학전공)", "기계로봇에너지공학과", "산업시스템공학과", "에너지신소재공학과", "전자전기공학부", "정보통신공학과", "화공생물공학과"],

      "문과대학": ["국어국문·문예창작학부", "사학과", "영어영문학부(영어문학전공, 영어통번역학전공)", "일본학과", "중어중문학과", "철학과"],

      "미래융합대학": ["글로벌무역학과", "범죄학과", "사회복지상담학과"],

      "바이오시스템대학 (단과대학 단위 모집 포함)": ["생명과학과", "식품바이오융합공학과", "융합환경과학과", "의생명공학과"],

      "법과대학": ["법학과"],

      "불교대학": ["문화유산학과", "불교학부"],

      "사범대학": ["가정교육과", "교육학과", "국어교육과", "수학교육과", "역사교육과", "지리교육과", "체육교육과"],

      "사회과학대학": ["경제학과", "광고홍보학과", "국제통상학과", "미디어커뮤니케이션학전공", "북한학전공", "사회복지학과", "사회학전공", "식품산업관리학과", "정치외교학전공", "행정학전공"],

      "약학대학": ["약학과"],

      "열린전공학부 (광역화 모집단위)": ["인문/자연 계열 무전공"],

      "예술대학": ["미술학부(불교미술전공, 한국화전공, 서양화전공, 조소전공)", "스포츠문화학과", "연극학부", "영화영상학과", "한국음악과"],

      "이과대학": ["물리학과", "수학과", "통계학과", "화학과"],

      "첨단융합대학": ["시스템반도체학부", "의료인공지능공학과", "지능형네트워크융합학과", "컴퓨터·AI학부"]

    },

    "\ubd80\uc0b0\ub300\ud559\uad50": {

      "\uacbd\uc81c\ud1b5\uc0c1\u00b7\uacbd\uc601\ub300\ud559": ["\uacbd\uc601\ud559\uacfc", "\uacbd\uc81c\ud559\ubd80", "\uacf5\uacf5\uc815\ucc45\ud559\ubd80", "\uad00\uad11\ucee8\ubca4\uc158\ud559\uacfc", "\uad6d\uc81c\ud559\ubd80", "\ubb34\uc5ed\ud559\ubd80"],

      "\uacf5\uacfc\ub300\ud559": ["\uac74\ucd95\uacf5\ud559\uacfc", "\uac74\ucd95\ud559\uacfc(5\ub144\uc81c)", "\uace0\ubd84\uc790\uacf5\ud559\uacfc", "\uae30\uacc4\uacf5\ud559\ubd80", "\ub3c4\uc2dc\uacf5\ud559\uacfc", "\uc0ac\ud68c\uae30\ubc18\uc2dc\uc2a4\ud15c\uacf5\ud559\uacfc", "\uc0b0\uc5c5\uacf5\ud559\uacfc", "\uc720\uae30\uc18c\uc7ac\uc2dc\uc2a4\ud15c\uacf5\ud559\uacfc", "\uc735\ud569/\uc790\uc728\uc804\uacf5(\ucca8\ub2e8IT/\ucca8\ub2e8\uc18c\uc7ac/\ucca8\ub2e8\ubaa8\ube4c\ub9ac\ud2f0/\uc2a4\ub9c8\ud2b8\uc2dc\ud2f0/\ubbf8\ub798\ub3c4\uc2dc\uac74\ucd95 \ub4f1)", "\uc7ac\ub8cc\uacf5\ud559\ubd80", "\uc804\uae30\uc804\uc790\uacf5\ud559\ubd80(\uc804\uae30/\uc804\uc790/\ubc18\ub3c4\uccb4)", "\uc870\uc120\u00b7\ud574\uc591\uacf5\ud559\uacfc", "\ud56d\uacf5\uc6b0\uc8fc\uacf5\ud559\uacfc", "\ud654\uacf5\uc0dd\uba85\uacf5\ud559\uacfc", "\ud658\uacbd\uacf5\ud559\uacfc"],

      "\uc0ac\ubc94\ub300\ud559": ["\uad50\uc721\ud559\uacfc", "\uad6d\uc5b4\uad50\uc721", "\ubb3c\ub9ac\uad50\uc721", "\uc0dd\ubb3c\uad50\uc721", "\uc218\ud559\uad50\uc721", "\uc5ed\uc0ac\uad50\uc721", "\uc601\uc5b4\uad50\uc721", "\uc720\uc544\uad50\uc721\uacfc", "\uc724\ub9ac\uad50\uc721", "\uc77c\ubc18\uc0ac\ud68c\uad50\uc721", "\uc9c0\uad6c\uacfc\ud559\uad50\uc721", "\uc9c0\ub9ac\uad50\uc721", "\ud2b9\uc218\uad50\uc721\uacfc", "\ud654\ud559\uad50\uc721"],

      "\uc0ac\ud68c\uacfc\ud559\ub300\ud559": ["\ubb38\ud5cc\uc815\ubcf4\ud559\uacfc", "\ubbf8\ub514\uc5b4\ucee4\ubba4\ub2c8\ucf00\uc774\uc158\ud559\uacfc", "\uc0ac\ud68c\ubcf5\uc9c0\ud559\uacfc", "\uc0ac\ud68c\ud559\uacfc", "\uc2ec\ub9ac\ud559\uacfc", "\uc815\uce58\uc678\uad50\ud559\uacfc", "\ud589\uc815\ud559\uacfc"],

      "\uc0dd\uba85\uc790\uc6d0\uacfc\ud559\ub300\ud559": ["IT\uc751\uc6a9\uacf5\ud559\uacfc", "\ubc14\uc774\uc624\uc0b0\uc5c5\uae30\uacc4\uacf5\ud559\uacfc", "\ubc14\uc774\uc624\uc18c\uc7ac", "\ubc14\uc774\uc624\ud658\uacbd\uc5d0\ub108\uc9c0", "\uc0dd\uba85\ud658\uacbd\ud654\ud559", "\uc2dd\ud488\uacf5\ud559", "\uc2dd\ud488\uc790\uc6d0\uacbd\uc81c\ud559\uacfc", "\uc6d0\uc608\uc0dd\uba85", "\uc870\uacbd\ud559\uacfc"],

      "\uc0dd\ud65c\uacfc\ud559\ub300\ud559": ["\uc2a4\ud3ec\uce20\uacfc\ud559\uacfc", "\uc2dd\ud488\uc601\uc591\ud559\uacfc", "\uc2e4\ub0b4\ud658\uacbd\ub514\uc790\uc778\ud559\uacfc", "\uc544\ub3d9\uac00\uc871\ud559\uacfc", "\uc758\ub958\ud559\uacfc"],

      "\uc758\uc57d\u00b7\ubcf4\uac74\u00b7\uac04\ud638 \uacc4\uc5f4": ["\uac04\ud638\ub300\ud559 (\uac04\ud638\ud559\uacfc)", "\uc57d\ud559\ub300\ud559 (\uc57d\ud559\ubd80)", "\uc758\uacfc\ub300\ud559 (\uc758\uc608\uacfc)", "\uce58\uacfc\ub300\ud559 (\uce58\uc758\uc608\uacfc)", "\ud55c\uc758\ud559\uc804\ubb38\ub300\ud559\uc6d0"],

      "\uc778\ubb38\ub300\ud559": ["\uace0\uace0\ud559\uacfc", "\uad6d\uc5b4\uad6d\ubb38\ud559\uacfc", "\ub178\uc5b4\ub178\ubb38\ud559\uacfc", "\ub3c5\uc5b4\ub3c5\ubb38\ud559\uacfc", "\ubd88\uc5b4\ubd88\ubb38\ud559\uacfc", "\uc0ac\ud559\uacfc", "\uc5b8\uc5b4\uc815\ubcf4\ud559\uacfc", "\uc601\uc5b4\uc601\ubb38\ud559\uacfc", "\uc77c\uc5b4\uc77c\ubb38\ud559\uacfc", "\uc911\uc5b4\uc911\ubb38\ud559\uacfc", "\ucca0\ud559\uacfc", "\ud55c\ubb38\ud559\uacfc"],

      "\uc790\uc5f0\uacfc\ud559\ub300\ud559": ["\ub300\uae30\ud658\uacbd\uacfc\ud559\uacfc", "\ubb3c\ub9ac\ud559\uacfc", "\ubbf8\uc0dd\ubb3c\ud559\uacfc", "\ubd84\uc790\uc0dd\ubb3c\ud559\uacfc", "\uc0dd\uba85\uacfc\ud559\uacfc", "\uc218\ud559\uacfc", "\uc9c0\uc9c8\ud658\uacbd\uacfc\ud559\uacfc", "\ud1b5\uacc4\ud559\uacfc", "\ud574\uc591\ud559\uacfc", "\ud654\ud559\uacfc"],

      "\uc815\ubcf4\uc758\uc0dd\uba85\uacf5\ud559\ub300\ud559": ["\uc758\uc0dd\uba85\uc735\ud569\uacf5\ud559\ubd80", "\uc815\ubcf4\ucef4\ud4e8\ud130\uacf5\ud559\ubd80(\ucef4\ud4e8\ud130, \uc778\uacf5\uc9c0\ub2a5, \ub514\uc790\uc778\ud14c\ud06c\ub180\ub85c\uc9c0)"],

      "\ud559\ubd80\ub300\ud559": ["\uc751\uc6a9\uc0dd\uba85\uc735\ud569\ud559\ubd80", "\uc790\uc720\uc804\uacf5\ud559\ubd80", "\ucca8\ub2e8\uc735\ud569\ud559\ubd80"]

    },

    "\uc11c\uac15\ub300\ud559\uad50": {

      "\uad6d\uc81c\u00b7\ubbf8\ub514\uc5b4\uacc4\uc5f4": ["\uac8c\ud398\ub974\ud2b8\uad6d\uc81c\ud559\ubd80", "\uae00\ub85c\ubc8c\ud55c\uad6d\ud559\ubd80", "\uc9c0\uc2dd\uc735\ud569\ubbf8\ub514\uc5b4\ud559\ubd80(\uc2e0\ubb38\ubc29\uc1a1\ud559\uacfc, \ubbf8\ub514\uc5b4&\uc5d4\ud130\ud14c\uc778\uba3c\ud2b8\ud559\uacfc, \uc544\ud2b8&\ud14c\ud06c\ub180\ub85c\uc9c0\ud559\uacfc)"],

      "\uc0ac\ud68c\uacfc\ud559\u00b7\uc0c1\uacbd\uacc4\uc5f4": ["\uacbd\uc601\ud559\ubd80", "\uacbd\uc81c\ud559\uacfc", "\uc0ac\ud68c\ud559\uacfc", "\uc2ec\ub9ac\ud559\uacfc", "\uc815\uce58\uc678\uad50\ud559\uacfc"],

      "\uc778\ubb38\u00b7\uc5b4\ubb38\uacc4\uc5f4": ["\uad6d\uc5b4\uad6d\ubb38\ud559\uacfc", "\uc0ac\ud559\uacfc", "\uc601\ubb38\ud559\ubd80", "\uc720\ub7fd\ubb38\ud654\ud559\uacfc", "\uc778\ubb38\ud559\uae30\ubc18\uc790\uc720\uc804\uacf5\ud559\ubd80", "\uc885\uad50\ud559\uacfc", "\uc911\uad6d\ubb38\ud654\ud559\uacfc", "\ucca0\ud559\uacfc"],

      "\uc790\uc5f0\u00b7\uacf5\ud559\uacc4\uc5f4": ["SCIENCE\uae30\ubc18\uc790\uc720\uc804\uacf5\ud559\ubd80", "\uae30\uacc4\uacf5\ud559\uacfc", "\ubb3c\ub9ac\ud559\uacfc", "\ubc18\ub3c4\uccb4\uacf5\ud559\uacfc", "\uc0dd\uba85\uacfc\ud559\uacfc", "\uc218\ud559\uacfc", "\uc2dc\uc2a4\ud15c\ubc18\ub3c4\uccb4\uacf5\ud559\uacfc", "\uc778\uacf5\uc9c0\ub2a5\ud559\uacfc", "\uc804\uc790\uacf5\ud559\uacfc", "\ucef4\ud4e8\ud130\uacf5\ud559\uacfc", "\ud654\uacf5\uc0dd\uba85\uacf5\ud559\uacfc", "\ud654\ud559\uacfc"]

    },

    "\uc11c\uc6b8\ub300\ud559\uad50": {

      "\uacf5\uacfc\ub300\ud559": ["\uac74\uc124\ud658\uacbd\ub3c4\uc2dc\uacf5\ud559\ubd80", "\uac74\ucd95\ud559\uacfc", "\uad11\uc5ed", "\uae30\uacc4\uacf5\ud559\ubd80", "\uc0b0\uc5c5\uacf5\ud559\uacfc", "\uc5d0\ub108\uc9c0\uc790\uc6d0\uacf5\ud559\uacfc", "\uc6d0\uc790\ud575\uacf5\ud559\uacfc", "\uc7ac\ub8cc\uacf5\ud559\ubd80", "\uc804\uae30\u00b7\uc815\ubcf4\uacf5\ud559\ubd80", "\uc870\uc120\ud574\uc591\uacf5\ud559\uacfc", "\ucef4\ud4e8\ud130\uacf5\ud559\ubd80", "\ud56d\uacf5\uc6b0\uc8fc\uacf5\ud559\uacfc", "\ud654\ud559\uc0dd\ubb3c\uacf5\ud559\ubd80"],

      "\uae30\ud0c0 \ub2e8\uacfc\ub300\ud559": ["\uac04\ud638\ub300\ud559", "\uacbd\uc601\ub300\ud559", "\uc218\uc758\uacfc\ub300\ud559(\uc218\uc758\uc608\uacfc)", "\uc57d\ud559\ub300\ud559(\uc57d\ud559\uacc4\uc5f4)", "\uc758\uacfc\ub300\ud559(\uc758\uc608\uacfc)", "\ucca8\ub2e8\uc735\ud569\ud559\ubd80", "\uce58\uc758\ud559\ub300\ud559\uc6d0(\uce58\uc758\ud559\uacfc)", "\ud559\ubd80\ub300\ud559(\uad11\uc5ed, \uc790\uc720\uc804\uacf5\ud559\ubd80)"],

      "\ub18d\uc5c5\uc0dd\uba85\uacfc\ud559\ub300\ud559": ["\ub18d\uacbd\uc81c\uc0ac\ud68c\ud559\ubd80", "\ubc14\uc774\uc624\uc2dc\uc2a4\ud15c\u00b7\uc18c\uc7ac\ud559\ubd80", "\uc0b0\ub9bc\uacfc\ud559\ubd80", "\uc2a4\ub9c8\ud2b8\uc2dc\uc2a4\ud15c\uacfc\ud559\uacfc", "\uc2dd\ubb3c\uc0dd\uc0b0\uacfc\ud559\ubd80", "\uc2dd\ud488\u00b7\ub3d9\ubb3c\uc0dd\uba85\uacf5\ud559\ubd80", "\uc751\uc6a9\uc0dd\ubb3c\ud654\ud559\ubd80", "\uc870\uacbd\u00b7\uc9c0\uc5ed\uc2dc\uc2a4\ud15c\uacf5\ud559\ubd80"],

      "\ubbf8\uc220\ub300\ud559": ["\uacf5\uc608\uacfc", "\ub3d9\uc591\ud654\uacfc", "\ub514\uc790\uc778\uacfc", "\uc11c\uc591\ud654\uacfc", "\uc870\uc18c\uacfc"],

      "\uc0ac\ubc94\ub300\ud559": ["\uad50\uc721\ud559\uacfc", "\uad6d\uc5b4\uad50\uc721\uacfc", "\ub3c5\uc5b4\uad50\uc721\uacfc", "\ubb3c\ub9ac\uad50\uc721\uacfc", "\ubd88\uc5b4\uad50\uc721\uacfc", "\uc0ac\ud68c\uad50\uc721\uacfc", "\uc0dd\ubb3c\uad50\uc721\uacfc", "\uc218\ud559\uad50\uc721\uacfc", "\uc5ed\uc0ac\uad50\uc721\uacfc", "\uc601\uc5b4\uad50\uc721\uacfc", "\uc724\ub9ac\uad50\uc721\uacfc", "\uc9c0\uad6c\uacfc\ud559\uad50\uc721\uacfc", "\uc9c0\ub9ac\uad50\uc721\uacfc", "\uccb4\uc721\uad50\uc721\uacfc", "\ud654\ud559\uad50\uc721\uacfc"],

      "\uc0ac\ud68c\uacfc\ud559\ub300\ud559": ["\uacbd\uc81c\ud559\ubd80", "\uc0ac\ud68c\ubcf5\uc9c0\ud559\uacfc", "\uc0ac\ud68c\ud559\uacfc", "\uc2ec\ub9ac\ud559\uacfc", "\uc5b8\ub860\uc815\ubcf4\ud559\uacfc", "\uc778\ub958\ud559\uacfc", "\uc815\uce58\uc678\uad50\ud559\ubd80", "\uc9c0\ub9ac\ud559\uacfc"],

      "\uc0dd\ud65c\uacfc\ud559\ub300\ud559": ["\uc18c\ube44\uc790\uc544\ub3d9\ud559\ubd80(\uc18c\ube44\uc790\ud559/\uc544\ub3d9\uac00\uc871\ud559\uc804\uacf5)", "\uc2dd\ud488\uc601\uc591\ud559\uacfc", "\uc758\ub958\ud559\uacfc"],

      "\uc74c\uc545\ub300\ud559": ["\uad00\ud604\uc545\uacfc", "\uad6d\uc545\uacfc", "\uc131\uc545\uacfc", "\uc74c\uc545\ud559\uacfc", "\uc791\uace1\uacfc", "\ud53c\uc544\ub178\uacfc"],

      "\uc778\ubb38\ub300\ud559": ["\uace0\uace0\ubbf8\uc220\uc0ac\ud559\uacfc", "\uad6d\uc5b4\uad6d\ubb38\ud559\uacfc", "\ub178\uc5b4\ub178\ubb38\ud559\uacfc", "\ub3c5\uc5b4\ub3c5\ubb38\ud559\uacfc", "\ubbf8\ud559\uacfc", "\ubd88\uc5b4\ubd88\ubb38\ud559\uacfc", "\uc11c\uc5b4\uc11c\ubb38\ud559\uacfc", "\uc544\uc2dc\uc544\uc5b8\uc5b4\ubb38\uba85\ud559\ubd80", "\uc5b8\uc5b4\ud559\uacfc", "\uc5ed\uc0ac\ud559\ubd80", "\uc601\uc5b4\uc601\ubb38\ud559\uacfc", "\uc885\uad50\ud559\uacfc", "\uc911\uc5b4\uc911\ubb38\ud559\uacfc", "\ucca0\ud559\uacfc"],

      "\uc790\uc5f0\uacfc\ud559\ub300\ud559": ["\ubb3c\ub9ac\u00b7\ucc9c\ubb38\ud559\ubd80(\ubb3c\ub9ac\ud559\uc804\uacf5/\ucc9c\ubb38\ud559\uc804\uacf5)", "\uc0dd\uba85\uacfc\ud559\ubd80", "\uc218\ub9ac\uacfc\ud559\ubd80", "\uc9c0\uad6c\ud658\uacbd\uacfc\ud559\ubd80", "\ud1b5\uacc4\ud559\uacfc", "\ud654\ud559\ubd80"]

    },

    "\uc11c\uc6b8\uc2dc\ub9bd\ub300\ud559\uad50": {

      "\uacbd\uc601\ub300\ud559": ["\uacbd\uc601\ud559\ubd80"],

      "\uacf5\uacfc\ub300\ud559": ["\uae30\uacc4\uc815\ubcf4\uacf5\ud559\uacfc", "\uc2e0\uc18c\uc7ac\uacf5\ud559\uacfc", "\uc778\uacf5\uc9c0\ub2a5\ud559\uacfc", "\uc804\uc790\uc804\uae30\ucef4\ud4e8\ud130\uacf5\ud559\ubd80", "\ucef4\ud4e8\ud130\uacfc\ud559\ubd80", "\ud1a0\ubaa9\uacf5\ud559\uacfc", "\ud654\ud559\uacf5\ud559\uacfc"],

      "\ub3c4\uc2dc\uacfc\ud559\ub300\ud559": ["\uac74\ucd95\ud559\ubd80(\uac74\ucd95\uacf5\ud559/\uac74\ucd95\ud559\uc804\uacf5)", "\uacf5\uac04\uc815\ubcf4\uacf5\ud559\uacfc", "\uad50\ud1b5\uacf5\ud559\uacfc", "\ub3c4\uc2dc\uacf5\ud559\uacfc", "\ub3c4\uc2dc\uc0ac\ud68c\ud559\uacfc", "\ub3c4\uc2dc\ud589\uc815\ud559\uacfc", "\uc870\uacbd\ud559\uacfc", "\ud658\uacbd\uacf5\ud559\ubd80"],

      "\uc608\uc220\uccb4\uc721\ub300\ud559": ["\ub514\uc790\uc778\ud559\uacfc(\uc2dc\uac01/\uc0b0\uc5c5\ub514\uc790\uc778\uc804\uacf5)", "\uc2a4\ud3ec\uce20\uacfc\ud559\uacfc", "\uc74c\uc545\ud559\uacfc", "\uc870\uac01\ud559\uacfc"],

      "\uc778\ubb38\ub300\ud559": ["\uad6d\uc0ac\ud559\uacfc", "\uad6d\uc5b4\uad6d\ubb38\ud559\uacfc", "\uc601\uc5b4\uc601\ubb38\ud559\uacfc", "\uc911\uad6d\uc5b4\ubb38\ud654\ud559\uacfc", "\ucca0\ud559\uacfc"],

      "\uc790\uc5f0\uacfc\ud559\ub300\ud559": ["\ubb3c\ub9ac\ud559\uacfc", "\uc0dd\uba85\uacfc\ud559\uacfc", "\uc218\ud559\uacfc", "\uc735\ud569\uc751\uc6a9\ud654\ud559\uacfc", "\ud1b5\uacc4\ud559\uacfc", "\ud658\uacbd\uc6d0\uc608\ud559\uacfc"],

      "\uc790\uc720/\ucca8\ub2e8\uc735\ud569\ud559\ubd80": ["\uc790\uc720\uc804\uacf5\ud559\ubd80(\uc778\ubb38/\uc790\uc5f0)", "\ucca8\ub2e8\uc735\ud569\ud559\ubd80(\uc735\ud569\ubc14\uc774\uc624\ud5ec\uc2a4\uc804\uacf5, \ucca8\ub2e8\uc778\uacf5\uc9c0\ub2a5\uc804\uacf5, \uc9c0\ub2a5\ud615\ubc18\ub3c4\uccb4\uc804\uacf5)"],

      "\uc815\uacbd\ub300\ud559": ["\uacbd\uc81c\ud559\ubd80", "\uad6d\uc81c\uad00\uacc4\ud559\uacfc", "\uc0ac\ud68c\ubcf5\uc9c0\ud559\uacfc", "\uc138\ubb34\ud559\uacfc", "\ud589\uc815\ud559\uacfc"]

    },

    "\uc131\uade0\uad00\ub300\ud559\uad50": {

      "\uacf5\ud559\uacc4\uc5f4": ["\uacf5\ud559\uacc4\uc5f4(\uc2e0\uc18c\uc7ac, \uae30\uacc4, \uac74\uc124\ud658\uacbd, \ud654\ud559\uacf5\ud559/\uace0\ubd84\uc790, \uc2dc\uc2a4\ud15c\uacbd\uc601, \ub098\ub178\uacf5\ud559)", "\uc804\uc790\uc804\uae30\uacf5\ud559\ubd80"],

      "\uc0ac\ud68c\uacfc\ud559\uacc4\uc5f4": ["\uacbd\uc601\ud559\uacfc", "\ubbf8\ub514\uc5b4\ucee4\ubba4\ub2c8\ucf00\uc774\uc158\ud559\uacfc", "\uc0ac\ud68c\ubcf5\uc9c0\ud559\uacfc", "\uc0ac\ud68c\ud559\uacfc", "\uc2ec\ub9ac\ud559\uacfc", "\uc544\ub3d9\uccad\uc18c\ub144\ud559\uacfc", "\uc815\uce58\uc678\uad50\ud559\uacfc", "\ud1b5\uacc4\ud559\uacfc", "\ud589\uc815\ud559\uacfc"],

      "\uc18c\ud504\ud2b8\uc6e8\uc5b4/\ucca8\ub2e8\ud559\uacfc": ["\uae00\ub85c\ubc8c\ubc14\uc774\uc624\uba54\ub514\uceec\uacf5\ud559\uacfc", "\ubc18\ub3c4\uccb4\uc2dc\uc2a4\ud15c\uacf5\ud559\uacfc(\uacc4\uc57d)", "\ubc18\ub3c4\uccb4\uc735\ud569\uacf5\ud559\uacfc", "\uc18c\ud504\ud2b8\uc6e8\uc5b4\ud559\uacfc", "\uc591\uc790\uc815\ubcf4\uacf5\ud559\uacfc(\uc2e0\uc124)", "\uc5d0\ub108\uc9c0\ud559\uacfc", "\uc9c0\ub2a5\ud615\uc18c\ud504\ud2b8\uc6e8\uc5b4\ud559\uacfc(\uacc4\uc57d)"],

      "\uc758\uc57d/\uc0ac\ubc94/\uc608\uccb4\ub2a5": ["\uad50\uc721\ud559\uacfc", "\ub514\uc790\uc778\ud559\uacfc", "\uc218\ud559\uad50\uc721\uacfc", "\uc2a4\ud3ec\uce20\uacfc\ud559\uacfc", "\uc57d\ud559\uacfc", "\uc601\uc0c1\ud559\uacfc", "\uc758\uc0c1\ud559\uacfc", "\uc758\uc608\uacfc", "\ucef4\ud4e8\ud130\uad50\uc721\uacfc", "\ud55c\ubb38\uad50\uc721\uacfc"],

      "\uc778\ubb38\uacfc\ud559\uacc4\uc5f4": ["\uad6d\uc5b4\uad6d\ubb38\ud559\uacfc", "\ub3c5\uc5b4\ub3c5\ubb38\ud559\uacfc", "\ub7ec\uc2dc\uc544\uc5b4\ubb38\ud559\uacfc", "\ubb38\ud5cc\uc815\ubcf4\ud559\uacfc", "\uc0ac\ud559\uacfc", "\uc601\uc5b4\uc601\ubb38\ud559\uacfc", "\uc720\ud559\ub3d9\uc591\ud559\uacfc", "\uc911\uc5b4\uc911\ubb38\ud559\uacfc", "\ucca0\ud559\uacfc", "\ud504\ub791\uc2a4\uc5b4\ubb38\ud559\uacfc", "\ud55c\ubb38\ud559\uacfc"],

      "\uc790\uc5f0\uacfc\ud559\uacc4\uc5f4": ["\ubb3c\ub9ac\ud559\uacfc", "\ubc14\uc774\uc624\uba54\uce74\ud2b8\ub85c\ub2c9\uc2a4\ud559\uacfc", "\uc0dd\uba85\uacfc\ud559\uacfc", "\uc218\ud559\uacfc", "\uc2dd\ud488\uc0dd\uba85\uacf5\ud559\uacfc", "\uc735\ud569\uc0dd\uba85\uacf5\ud559\uacfc", "\ud654\ud559\uacfc"],

      "\uc790\uc720\uc804\uacf5/\uae00\ub85c\ubc8c\uacc4\uc5f4": ["\uae00\ub85c\ubc8c\uacbd\uc601\ud559\uacfc", "\uae00\ub85c\ubc8c\uacbd\uc81c\ud559\uacfc", "\uae00\ub85c\ubc8c\ub9ac\ub354\ud559\ubd80", "\uc790\uc720\uc804\uacf5\uacc4\uc5f4(\uc2e0\uc124)"]

    },

    "\uc138\uc885\ub300\ud559\uad50": {

      "\uacf5\uacfc\ub300\ud559": ["\uac74\uc124\ud658\uacbd\uacf5\ud559\uacfc", "\uac74\ucd95\uacf5\ud559\uacfc", "\uac74\ucd95\ud559\uacfc(5\ub144\uc81c)", "\uad6d\ubc29AI\uc735\ud569\uc2dc\uc2a4\ud15c\uacf5\ud559\uacfc", "\uae30\uacc4\uacf5\ud559\uacfc", "\ub098\ub178\uc2e0\uc18c\uc7ac\uacf5\ud559\uacfc", "\uc591\uc790\uc6d0\uc790\ub825\uacf5\ud559\uacfc", "\uc5d0\ub108\uc9c0\uc790\uc6d0\uacf5\ud559\uacfc", "\uc6b0\uc8fc\ud56d\uacf5\uc2dc\uc2a4\ud15c\uacf5\ud559\ubd80(\uc6b0\uc8fc\ud56d\uacf5/\uc9c0\ub2a5\ud615\ub4dc\ub860/\ud56d\uacf5\uc2dc\uc2a4\ud15c)", "\ud658\uacbd\uc735\ud569\uacf5\ud559\uacfc"],

      "\uc778\uacf5\uc9c0\ub2a5\uc735\ud569\ub300\ud559": ["AI\ub85c\ubd07\ud559\uacfc", "AI\uc735\ud569\uc804\uc790\uacf5\ud559\uacfc", "\ubc18\ub3c4\uccb4\uc2dc\uc2a4\ud15c\uacf5\ud559\uacfc", "\uc591\uc790\uc9c0\ub2a5\uc815\ubcf4\ud559\uacfc", "\uc778\uacf5\uc9c0\ub2a5\ub370\uc774\ud130\uc0ac\uc774\uc5b8\uc2a4\ud559\uacfc", "\uc815\ubcf4\ubcf4\ud638\ud559\uacfc", "\uc9c0\ub2a5\uc815\ubcf4\uc735\ud569\ud559\uacfc", "\ucef4\ud4e8\ud130\uacf5\ud559\uacfc", "\ucf58\ud150\uce20\uc18c\ud504\ud2b8\uc6e8\uc5b4\ud559\uacfc"],

      "\uc778\ubb38/\uc0ac\ud68c/\uacbd\uc601": ["\uacbd\uc601\ud559\ubd80", "\uacbd\uc81c\ud559\uacfc", "\uad50\uc721\ud559\uacfc", "\uad6d\uc5b4\uad6d\ubb38\ud559\uacfc", "\uad6d\uc81c\ud559\ubd80(\uc601\uc5b4\ub370\uc774\ud130\uc735\ud569/\uad6d\uc81c\uc77c\ubcf8\ud559/\uc911\uad6d\ud1b5\uc0c1\ud559)", "\ubbf8\ub514\uc5b4\ucee4\ubba4\ub2c8\ucf00\uc774\uc158\ud559\uacfc", "\ubc95\ud559\uacfc", "\uc5ed\uc0ac\ud559\uacfc", "\ud589\uc815\ud559\uacfc"],

      "\uc790\uc5f0\uacfc\ud559/\uc0dd\uba85": ["\ubb3c\ub9ac\ucc9c\ubb38\ud559\uacfc", "\uc0dd\uba85\uc2dc\uc2a4\ud15c\ud559\ubd80(\uc2dd\ud488\uc0dd\uba85/\ubc14\uc774\uc624\uc735\ud569/\ubc14\uc774\uc624\uc0b0\uc5c5\uc790\uc6d0)", "\uc218\ud559\ud1b5\uacc4\ud559\uacfc", "\uc2a4\ub9c8\ud2b8\uc0dd\uba85\uc0b0\uc5c5\uc735\ud569\ud559\uacfc", "\ud654\ud559\uacfc"],

      "\uc790\uc720\uc804\uacf5/\uacc4\uc57d": ["\uad6d\ubc29AI\ub85c\ubd07\uc735\ud569\uacf5\ud559\uacfc(\ud574\ubcd1\ub300)", "\uc0ac\uc774\ubc84\uad6d\ubc29\ud559\uacfc(\uc721\uad70)", "\uc790\uc720\uc804\uacf5\ud559\ubd80(\ub300\uc591\ud734\uba38\ub2c8\ud2f0\uce7c\ub9ac\uc9c0)"],

      "\uc870\ud615/\uc608\uccb4\ub2a5": ["\ub514\uc790\uc778\uc774\ub178\ubca0\uc774\uc158\uc804\uacf5", "\ub9cc\ud654\uc560\ub2c8\uba54\uc774\uc158\ud14d\uc804\uacf5", "\ubb34\uc6a9\uacfc", "\uc601\ud654\uc608\uc220\ud559\uacfc", "\uc74c\uc545\uacfc", "\uccb4\uc721\ud559\uacfc", "\ud328\uc158\ub514\uc790\uc778\ud559\uacfc", "\ud68c\ud654\uacfc"],

      "\ud638\ud154\uad00\uad11\ub300\ud559": ["\uc870\ub9ac\uc11c\ube44\uc2a4\uacbd\uc601\ud559\uacfc", "\ud638\ud154\uad00\uad11\uc678\uc2dd\uacbd\uc601\ud559\ubd80(\ud638\ud154\uad00\uad11/\uc678\uc2dd\uacbd\uc601)", "\ud638\ud154\uc678\uc2dd\uad00\uad11\ud504\ub79c\ucc28\uc774\uc988\uacbd\uc601\ud559\uacfc"]

    },

    "\uc22d\uc2e4\ub300\ud559\uad50": {

      "IT/AI\ub300\ud559": ["AI\uc18c\ud504\ud2b8\uc6e8\uc5b4\ud559\ubd80(\uc18c\ud504\ud2b8\uc6e8\uc5b4/\uc815\ubcf4\ubcf4\ud638/\uc778\uacf5\uc9c0\ub2a5/AI\uc2dc\uc2a4\ud15c)", "\uae00\ub85c\ubc8c\ubbf8\ub514\uc5b4\ud559\ubd80", "\ub514\uc9c0\ud138\ubbf8\ub514\uc5b4\ud559\uacfc", "\uc804\uc790\uc815\ubcf4\uacf5\ud559\ubd80(\uc804\uc790\uacf5\ud559/IT\uc735\ud569)", "\uc815\ubcf4\ubcf4\ud638\ud559\uacfc(\uacc4\uc57d)", "\ucef4\ud4e8\ud130\ud559\ubd80"],

      "\uacbd\uc601\ub300\ud559": ["\uacbd\uc601\ud559\ubd80", "\uae08\uc735\ud559\ubd80", "\ubca4\ucc98\uc911\uc18c\uae30\uc5c5\ud559\uacfc", "\ud68c\uacc4\ud559\uacfc"],

      "\uacf5\uacfc\ub300\ud559": ["\uac74\ucd95\ud559\ubd80(\uac74\ucd95\ud559\u00b7\uac74\ucd95\uacf5\ud559/\uc2e4\ub0b4\uac74\ucd95)", "\uae30\uacc4\uacf5\ud559\ubd80", "\uc0b0\uc5c5\u00b7\uc815\ubcf4\uc2dc\uc2a4\ud15c\uacf5\ud559\uacfc", "\uc2e0\uc18c\uc7ac\uacf5\ud559\uacfc", "\uc804\uae30\uacf5\ud559\ubd80", "\ud654\ud559\uacf5\ud559\uacfc"],

      "\uc0ac\ud68c\uacfc\ud559/\uacbd\uc81c\ud1b5\uc0c1": ["\uacbd\uc81c\ud559\uacfc", "\uad6d\uc81c\ubb34\uc5ed\ud559\uacfc", "\uae00\ub85c\ubc8c\ud1b5\uc0c1\ud559\uacfc", "\uae08\uc735\uacbd\uc81c\ud559\uacfc", "\uc0ac\ud68c\ubcf5\uc9c0\ud559\ubd80", "\uc5b8\ub860\ud64d\ubcf4\ud559\uacfc", "\uc815\ubcf4\uc0ac\ud68c\ud559\uacfc", "\uc815\uce58\uc678\uad50\ud559\uacfc", "\ud3c9\uc0dd\uad50\uc721\ud559\uacfc", "\ud589\uc815\ud559\ubd80"],

      "\uc778\ubb38\ub300\ud559": ["\uad6d\uc5b4\uad6d\ubb38\ud559\uacfc", "\uae30\ub3c5\uad50\ud559\uacfc", "\ub3c5\uc5b4\ub3c5\ubb38\ud559\uacfc", "\ubd88\uc5b4\ubd88\ubb38\ud559\uacfc", "\uc0ac\ud559\uacfc", "\uc2a4\ud3ec\uce20\ud559\ubd80", "\uc601\uc5b4\uc601\ubb38\ud559\uacfc", "\uc608\uc220\ucc3d\uc791\ud559\ubd80(\ubb38\uc608\ucc3d\uc791/\uc601\ud654\uc608\uc220)", "\uc77c\uc5b4\uc77c\ubb38\ud559\uacfc", "\uc911\uc5b4\uc911\ubb38\ud559\uacfc", "\ucca0\ud559\uacfc"],

      "\uc790\uc5f0\uacfc\ud559/\ubc95\ud559": ["\uad6d\uc81c\ubc95\ubb34\ud559\uacfc", "\ubb3c\ub9ac\ud559\uacfc", "\ubc95\ud559\uacfc", "\uc218\ud559\uacfc", "\uc758\uc0dd\uba85\uc2dc\uc2a4\ud15c\ud559\ubd80", "\uc815\ubcf4\ud1b5\uacc4\u00b7\ubcf4\ud5d8\uc218\ub9ac\ud559\uacfc", "\ud654\ud559\uacfc"],

      "\uc790\uc720\uc804\uacf5/\uae30\ud0c0": ["\uc790\uc720\uc804\uacf5\ud559\ubd80(\uc778\ubb38)", "\uc790\uc720\uc804\uacf5\ud559\ubd80(\uc790\uc5f0)", "\ucc28\uc138\ub300\ubc18\ub3c4\uccb4\ud559\uacfc"]

    },


    "\uc544\uc8fc\ub300\ud559\uad50": {

      "\uac1c\uc124\ud559\uacfc": ["AI\uc735\ud569\ud559\ubd80", "\uac04\ud638\ud559\uacfc", "\uac74\ucd95\ud559\uacfc", "\uacbd\uc601\uc815\ubcf4\ud559\ubd80", "\uae30\uacc4\uacf5\ud559\uacfc", "\ubb3c\ub9ac\ud559\uacfc", "\uc0ac\uc774\ubc84\ubcf4\uc548\ud559\uacfc", "\uc0ac\ud68c\ubcf5\uc9c0\ud559\uacfc", "\uc0b0\uc5c5\uacf5\ud559\uacfc", "\uc0dd\uba85\uacfc\ud559\uacfc", "\uc18c\ud504\ud2b8\uc6e8\uc5b4\ud559\uacfc", "\uc218\ud559\uacfc", "\uc758\ud559\uacfc", "\uc804\uc790\uacf5\ud559\uacfc", "\uc815\ubcf4\ubcf4\ud638\ud559\uacfc", "\ucef4\ud4e8\ud130\uacf5\ud559\uacfc", "\ud654\ud559\uacf5\ud559\uacfc", "\ud654\ud559\uacfc"]


    },

    "\uc544\uc8fc\ub300\ud559\uad50": {

      "\uac04\ud638\ub300\ud559": ["\uac04\ud638\ud559\uacfc"],

      "\uacbd\uc601\ub300\ud559": ["\uacbd\uc601\uc778\ud154\ub9ac\uc804\uc2a4\ud559\uacfc", "\uacbd\uc601\ud559\uacfc", "\uae00\ub85c\ubc8c\uacbd\uc601\ud559\uacfc(\ud2b9\uc131\ud654\uace0 \uc7ac\uc9c1\uc790)", "\uae08\uc735\uacf5\ud559\uacfc"],

      "\uacf5\uacfc\ub300\ud559": ["\uac74\uc124\uc2dc\uc2a4\ud15c\uacf5\ud559\uacfc", "\uac74\ucd95\ud559\uacfc(\uac74\ucd95\uacf5\ud559 4\ub144)", "\uac74\ucd95\ud559\uacfc(\uac74\ucd95\ud559 5\ub144)", "\uad50\ud1b5\uc2dc\uc2a4\ud15c\uacf5\ud559\uacfc", "\uae30\uacc4\uacf5\ud559\uacfc", "\uc0b0\uc5c5\uacf5\ud559\uacfc", "\uc735\ud569\uc2dc\uc2a4\ud15c\uacf5\ud559\uacfc(\ud2b9\uc131\ud654\uace0 \uc7ac\uc9c1\uc790)", "\uc751\uc6a9\ud654\ud559\uacfc", "\ucca8\ub2e8\uc2e0\uc18c\uc7ac\uacf5\ud559\uacfc", "\ud654\ud559\uacf5\ud559\uacfc", "\ud658\uacbd\uc548\uc804\uacf5\ud559\uacfc"],

      "\ub2e4\uc0b0\ud559\ubd80\ub300\ud559": ["\uc790\uc720\uc804\uacf5\ud559\ubd80(\uc778\ubb38)", "\uc790\uc720\uc804\uacf5\ud559\ubd80(\uc790\uc5f0)"],

      "\uc0ac\ud68c\uacfc\ud559\ub300\ud559": ["\uacbd\uc81c\uc815\uce58\uc0ac\ud68c\uc735\ud569\ud559\ubd80(\uacbd\uc81c\ud559/\uc0ac\ud68c\ud559/\uc815\uce58\uc678\uad50\ud559)", "\uc2a4\ud3ec\uce20\ub808\uc800\ud559\uacfc", "\uc2ec\ub9ac\ud559\uacfc", "\ud589\uc815\ud559\uacfc"],

      "\uc18c\ud504\ud2b8\uc6e8\uc5b4\uc735\ud569\ub300\ud559": ["\uad6d\ubc29\ub514\uc9c0\ud138\uc735\ud569\ud559\uacfc(\uad6d\ubc29IT\uc6b0\uc218\uc778\uc7ac)", "\ub514\uc9c0\ud138\ubbf8\ub514\uc5b4\ud559\uacfc", "\uc0ac\uc774\ubc84\ubcf4\uc548\ud559\uacfc", "\uc18c\ud504\ud2b8\uc6e8\uc5b4\ud559\uacfc"],

      "\uc57d\ud559\ub300\ud559": ["\uc57d\ud559\uacfc"],

      "\uc758\uacfc\ub300\ud559": ["\uc758\ud559\uacfc"],

      "\uc778\ubb38\ub300\ud559": ["\uad6d\uc5b4\uad6d\ubb38\ud559\uacfc", "\ubb38\ud654\ucf58\ud150\uce20\ud559\uacfc", "\ubd88\uc5b4\ubd88\ubb38\ud559\uacfc", "\uc0ac\ud559\uacfc", "\uc601\uc5b4\uc601\ubb38\ud559\uacfc"],

      "\uc790\uc5f0\uacfc\ud559\ub300\ud559": ["\uc218\ud559\uacfc", "\ud504\ub7f0\ud2f0\uc5b4\uacfc\ud559\ud559\ubd80(\ubb3c\ub9ac\u00b7\uc591\uc790\uacfc\ud559)", "\ud504\ub7f0\ud2f0\uc5b4\uacfc\ud559\ud559\ubd80(\uc0dd\uba85\uacfc\ud559\u00b7\uc751\uc6a9\uc0dd\ubb3c\ud559)", "\ud504\ub7f0\ud2f0\uc5b4\uacfc\ud559\ud559\ubd80(\ud654\ud559\u00b7\ubb3c\uc9c8\uacfc\ud559)"],

      "\ucca8\ub2e8ICT\uc735\ud569\ub300\ud559": ["\ubbf8\ub798\ubaa8\ube4c\ub9ac\ud2f0\uacf5\ud559\uacfc", "\uc804\uc790\uacf5\ud559\uacfc", "\uc9c0\ub2a5\ud615\ubc18\ub3c4\uccb4\uacf5\ud559\uacfc"],

      "\ucca8\ub2e8\ubc14\uc774\uc624\uc735\ud569\ub300\ud559": ["\ucca8\ub2e8\ubc14\uc774\uc624\uc18c\uc7ac\uacf5\ud559", "\ud601\uc2e0\uc2e0\uc57d\uacf5\ud559"]

    },

    "\uc5f0\uc138\ub300\ud559\uad50": {

      "\uacf5\uacfc\ub300\ud559": ["\uac74\uc124\ud658\uacbd\uacf5\ud559\uacfc", "\uac74\ucd95\uacf5\ud559\uacfc", "\uae30\uacc4\uacf5\ud559\ubd80", "\ub3c4\uc2dc\uacf5\ud559\uacfc", "\ub514\uc2a4\ud50c\ub808\uc774\uc735\ud569\uacf5\ud559\uacfc", "\uc0b0\uc5c5\uacf5\ud559\uacfc", "\uc2dc\uc2a4\ud15c\ubc18\ub3c4\uccb4\uacf5\ud559\uacfc", "\uc2e0\uc18c\uc7ac\uacf5\ud559\ubd80", "\uc804\uae30\uc804\uc790\uacf5\ud559\ubd80", "\ud654\uacf5\uc0dd\uba85\uacf5\ud559\ubd80"],

      "\uae30\ud0c0": ["\uac04\ud638\ub300\ud559(\uac04\ud638\ud559\uacfc)", "\uae00\ub85c\ubc8c\uc778\uc7ac\ub300\ud559(\uae00\ub85c\ubc8c\uc778\uc7ac\ud559\ubd80)", "\uc2e0\uacfc\ub300\ud559(\uc2e0\ud559\uacfc)", "\uc57d\ud559\ub300\ud559(\uc57d\ud559\uacfc)", "\uc758\uacfc\ub300\ud559(\uc758\uc608\uacfc)", "\uce58\uacfc\ub300\ud559(\uce58\uc758\uc608\uacfc)", "\ud559\ubd80\ub300\ud559(\uc9c4\ub9ac\uc790\uc720\ud559\ubd80)"],

      "\ubb38\uacfc\ub300\ud559": ["\uad6d\uc5b4\uad6d\ubb38\ud559\uacfc", "\ub178\uc5b4\ub178\ubb38\ud559\uacfc", "\ub3c5\uc5b4\ub3c5\ubb38\ud559\uacfc", "\ubb38\ud5cc\uc815\ubcf4\ud559\uacfc", "\ubd88\uc5b4\ubd88\ubb38\ud559\uacfc", "\uc0ac\ud559\uacfc", "\uc2ec\ub9ac\ud559\uacfc", "\uc601\uc5b4\uc601\ubb38\ud559\uacfc", "\uc911\uc5b4\uc911\ubb38\ud559\uacfc", "\ucca0\ud559\uacfc"],

      "\uc0ac\ud68c\uacfc\ud559\ub300\ud559": ["\ubb38\ud654\uc778\ub958\ud559\uacfc", "\uc0ac\ud68c\ubcf5\uc9c0\ud559\uacfc", "\uc0ac\ud68c\ud559\uacfc", "\uc5b8\ub860\ud64d\ubcf4\uc601\uc0c1\ud559\ubd80", "\uc815\uce58\uc678\uad50\ud559\uacfc", "\ud589\uc815\ud559\uacfc"],

      "\uc0c1\uacbd/\uacbd\uc601\ub300\ud559": ["\uacbd\uc601\ud559\uacfc", "\uacbd\uc81c\ud559\ubd80", "\uc751\uc6a9\ud1b5\uacc4\ud559\uacfc"],

      "\uc0dd\uba85/\uc778\uacf5\uc9c0\ub2a5\uacc4\uc5f4": ["\uc0dd\uba85\uc2dc\uc2a4\ud15c\ub300\ud559(\uc2dc\uc2a4\ud15c\uc0dd\ubb3c\ud559\uacfc, \uc0dd\ud654\ud559\uacfc, \uc0dd\uba85\uacf5\ud559\uacfc)", "\uc778\uacf5\uc9c0\ub2a5\uc735\ud569\ub300\ud559(\ucca8\ub2e8\ucef4\ud4e8\ud305\ud559\ubd80, IT\uc735\ud569\uacf5\ud559\uc804\uacf5, \uc9c0\ub2a5\ud615\ubc18\ub3c4\uccb4\uc804\uacf5, \ubaa8\ube4c\ub9ac\ud2f0\uc2dc\uc2a4\ud15c\uc804\uacf5)"],

      "\uc0dd\ud65c/\uad50\uc721\uacfc\ud559\ub300\ud559": ["\uad50\uc721\uacfc\ud559\ub300\ud559(\uad50\uc721\ud559\ubd80, \uccb4\uc721\uad50\uc721\ud559\uacfc, \uc2a4\ud3ec\uce20\uc751\uc6a9\uc0b0\uc5c5\ud559\uacfc)", "\uc0dd\ud65c\uacfc\ud559\ub300\ud559(\uc758\ub958\ud658\uacbd\ud559\uacfc, \uc2dd\ud488\uc601\uc591\ud559\uacfc, \uc2e4\ub0b4\uac74\ucd95\ud559\uacfc, \uc544\ub3d9\u00b7\uac00\uc871\ud559\uacfc, \ud1b5\ud569\ub514\uc790\uc778\ud559\uacfc)"],

      "\uc5b8\ub354\uc6b0\ub4dc\uad6d\uc81c\ub300\ud559": ["\uc5b8\ub354\uc6b0\ub4dc\ud559\ubd80(\ube44\uad50\ubb38\ud559\uacfc\ubb38\ud654, \uacbd\uc81c\ud559, \uad6d\uc81c\ud559, \uc815\uce58\uc678\uad50\ud559, \uc0dd\uba85\uacfc\ud559\uacf5\ud559)", "\uc735\ud569\uacfc\ud559\uacf5\ud559\ubd80(\ub098\ub178\uacfc\ud559\uacf5\ud559, \uc5d0\ub108\uc9c0\ud658\uacbd\uc735\ud569, \ubc14\uc774\uc624\uc735\ud569)", "\uc735\ud569\uc778\ubb38\uc0ac\ud68c\uacfc\ud559\ubd80(\uc544\uc2dc\uc544\ud559, \ubb38\ud654\ub514\uc790\uc778\uacbd\uc601, \uc815\ubcf4\u00b7\uc778\ud130\ub799\uc158\ub514\uc790\uc778, \ucc3d\uc758\uae30\uc220\uacbd\uc601, \uc0ac\ud68c\uc815\uc758\ub9ac\ub354\uc2ed, \uacc4\ub7c9\uc704\ud5d8\uad00\ub9ac, \uacfc\ud559\uae30\uc220\uc815\ucc45, \uc9c0\uc18d\uac1c\ubc1c\ud611\ub825)"],

      "\uc74c\uc545\ub300\ud559": ["\uad00\ud604\uc545\uacfc", "\uad50\ud68c\uc74c\uc545\uacfc", "\uc131\uc545\uacfc", "\uc791\uace1\uacfc", "\ud53c\uc544\ub178\uacfc"],

      "\uc774\uacfc\ub300\ud559": ["\ub300\uae30\uacfc\ud559\uacfc", "\ubb3c\ub9ac\ud559\uacfc", "\uc218\ud559\uacfc", "\uc9c0\uad6c\uc2dc\uc2a4\ud15c\uacfc\ud559\uacfc", "\ucc9c\ubb38\uc6b0\uc8fc\ud559\uacfc", "\ud654\ud559\uacfc"]

    },

    "\uc778\ucc9c\ub300\ud559\uad50": {

      "\uacbd\uc601\ub300\ud559": ["\uacbd\uc601\ud559\ubd80", "\ub370\uc774\ud130\uacfc\ud559\uacfc", "\uc138\ubb34\ud68c\uacc4\ud559\uacfc"],

      "\uacf5\uacfc\ub300\ud559": ["\uae30\uacc4\uacf5\ud559\uacfc", "\ubc14\uc774\uc624-\ub85c\ubd07\uc2dc\uc2a4\ud15c\uacf5\ud559\uacfc", "\uc0b0\uc5c5\uacbd\uc601\uacf5\ud559\uacfc", "\uc2e0\uc18c\uc7ac\uacf5\ud559\uacfc", "\uc548\uc804\uacf5\ud559\uacfc", "\uc5d0\ub108\uc9c0\ud654\ud559\uacf5\ud559\uacfc", "\uc804\uae30\uacf5\ud559\uacfc", "\uc804\uc790\uacf5\ud559\ubd80(\uc804\uc790\uacf5\ud559\uc804\uacf5, \ubc18\ub3c4\uccb4\uc735\ud569\uc804\uacf5)"],

      "\uae00\ub85c\ubc8c\uc815\uacbd\ub300\ud559": ["Global Trade & Service\ud559\ubd80", "\uacbd\uc81c\ud559\uacfc", "\uc18c\ube44\uc790\ud559\uacfc", "\uc815\uce58\uc678\uad50\ud559\uacfc", "\ud589\uc815\ud559\uacfc"],

      "\ub3c4\uc2dc\uacfc\ud559\ub300\ud559": ["\ub3c4\uc2dc\uac74\ucd95\ud559\ubd80(\uac74\ucd95\uacf5\ud559\uc804\uacf5, \ub3c4\uc2dc\uac74\ucd95\ud559\uc804\uacf5)", "\ub3c4\uc2dc\uacf5\ud559\uacfc", "\ub3c4\uc2dc\ud589\uc815\ud559\uacfc", "\ub3c4\uc2dc\ud658\uacbd\uacf5\ud559\ubd80(\uac74\uc124\ud658\uacbd\uacf5\ud559\uc804\uacf5, \ud658\uacbd\uacf5\ud559\uc804\uacf5)"],

      "\uc0ac\ubc94\ub300\ud559": ["\uad6d\uc5b4\uad50\uc721\uacfc", "\uc218\ud559\uad50\uc721\uacfc", "\uc5ed\uc0ac\uad50\uc721\uacfc", "\uc601\uc5b4\uad50\uc721\uacfc", "\uc720\uc544\uad50\uc721\uacfc", "\uc724\ub9ac\uad50\uc721\uacfc", "\uc77c\uc5b4\uad50\uc721\uacfc", "\uccb4\uc721\uad50\uc721\uacfc"],

      "\uc0ac\ud68c\uacfc\ud559\ub300\ud559": ["\ubb38\ud5cc\uc815\ubcf4\ud559\uacfc", "\ubbf8\ub514\uc5b4\ucee4\ubba4\ub2c8\ucf00\uc774\uc158\ud559\uacfc", "\uc0ac\ud68c\ubcf5\uc9c0\ud559\uacfc", "\ucc3d\uc758\uc778\uc7ac\uac1c\ubc1c\ud559\uacfc"],

      "\uc0dd\uba85\uacfc\ud559\uae30\uc220\ub300\ud559": ["\uc0dd\uba85\uacf5\ud559\ubd80(\uc0dd\uba85\uacf5\ud559\uc804\uacf5, \ub098\ub178\ubc14\uc774\uc624\uacf5\ud559\uc804\uacf5)", "\uc0dd\uba85\uacfc\ud559\ubd80(\uc0dd\uba85\uacfc\ud559\uc804\uacf5, \ubd84\uc790\uc758\uc0dd\uba85\uc804\uacf5)"],

      "\uc608\uc220\uccb4\uc721\ub300\ud559": ["\uacf5\uc5f0\uc608\uc220\ud559\uacfc", "\ub514\uc790\uc778\ud559\ubd80", "\uc2a4\ud3ec\uce20\uacfc\ud559\ubd80", "\uc6b4\ub3d9\uac74\uac15\ud559\ubd80", "\uc870\ud615\uc608\uc220\ud559\ubd80(\ud55c\uad6d\ud654\uc804\uacf5, \uc11c\uc591\ud654\uc804\uacf5)"],

      "\uc735\ud569\uc790\uc720\uc804\uacf5\ub300\ud559": ["\ub3d9\ubd81\uc544\uad6d\uc81c\ud1b5\uc0c1\ubb3c\ub958\ud559\ubd80(\ub3d9\ubd81\uc544\uad6d\uc81c\ud1b5\uc0c1\uc804\uacf5, \uc2a4\ub9c8\ud2b8\ubb3c\ub958\uacf5\ud559\uc804\uacf5)", "\ubc95\ud559\ubd80", "\uc790\uc720\uc804\uacf5\ud559\ubd80(\uc778\ubb38/\uc790\uc5f0)"],

      "\uc778\ubb38\ub300\ud559": ["\uad6d\uc5b4\uad6d\ubb38\ud559\uacfc", "\ub3c5\uc5b4\ub3c5\ubb38\ud559\uacfc", "\ubd88\uc5b4\ubd88\ubb38\ud559\uacfc", "\uc601\uc5b4\uc601\ubb38\ud559\uacfc", "\uc77c\ubcf8\uc9c0\uc5ed\ubb38\ud654\ud559\uacfc", "\uc911\uc5b4\uc911\uad6d\ud559\uacfc"],

      "\uc790\uc5f0\uacfc\ud559\ub300\ud559": ["\ubb3c\ub9ac\ud559\uacfc", "\uc218\ud559\uacfc", "\ud328\uc158\uc0b0\uc5c5\ud559\uacfc", "\ud574\uc591\ud559\uacfc", "\ud654\ud559\uacfc"],

      "\uc815\ubcf4\uae30\uc220\ub300\ud559": ["\uc784\ubca0\ub514\ub4dc\uc2dc\uc2a4\ud15c\uacf5\ud559\uacfc", "\uc815\ubcf4\ud1b5\uc2e0\uacf5\ud559\uacfc", "\ucef4\ud4e8\ud130\uacf5\ud559\ubd80"]

    },

    "\uc778\ud558\ub300\ud559\uad50": {

      "\uacbd\uc601\ub300\ud559": ["\uacbd\uc601\ud559\ubd80(\uacbd\uc601\ud559\uacfc)", "\uacbd\uc601\ud559\ubd80(\ud30c\uc774\ub0b8\uc2a4\uacbd\uc601\ud559\uacfc)", "\uad6d\uc81c\ud1b5\uc0c1\ud559\uacfc", "\uc544\ud0dc\ubb3c\ub958\ud559\ubd80"],

      "\uacf5\uacfc\ub300\ud559": ["\uac74\ucd95\ud559\ubd80(\uac74\ucd95\uacf5\ud559\uc804\uacf5)", "\uac74\ucd95\ud559\ubd80(\uac74\ucd95\ud559\uc804\uacf5(5\ub144\uc81c))", "\uace0\ubd84\uc790\uacf5\ud559\uacfc", "\uacf5\uac04\uc815\ubcf4\uacf5\ud559\uacfc", "\uae30\uacc4\uacf5\ud559\uacfc", "\ubc18\ub3c4\uccb4\uc2dc\uc2a4\ud15c\uacf5\ud559\uacfc", "\uc0ac\ud68c\uc778\ud504\ub77c\uacf5\ud559\uacfc", "\uc0b0\uc5c5\uacbd\uc601\uacf5\ud559\uacfc", "\uc2e0\uc18c\uc7ac\uacf5\ud559\uacfc", "\uc5d0\ub108\uc9c0\uc790\uc6d0\uacf5\ud559\uacfc", "\uc774\ucc28\uc804\uc9c0\uc735\ud569\ud559\uacfc", "\uc804\uae30\uc804\uc790\uacf5\ud559\ubd80", "\uc870\uc120\ud574\uc591\uacf5\ud559\uacfc", "\ud56d\uacf5\uc6b0\uc8fc\uacf5\ud559\uacfc", "\ud654\ud559\uacf5\ud559\uacfc", "\ud658\uacbd\uacf5\ud559\uacfc"],

      "\uad6d\uc81c\ud559\ubd80": ["IBT\ud559\uacfc", "ISE\ud559\uacfc", "KLC\ud559\uacfc"],

      "\ubb38\uacfc\ub300\ud559": ["\ubb38\ud654\ucf58\ud150\uce20\ubb38\ud654\uacbd\uc601\ud559\uacfc", "\uc0ac\ud559\uacfc", "\uc601\ubbf8\uc720\ub7fd\uc778\ubb38\uc735\ud569\ud559\ubd80(\uc601\uc5b4\uc601\ubb38\ud559)", "\uc601\ubbf8\uc720\ub7fd\uc778\ubb38\uc735\ud569\ud559\ubd80(\ud504\ub791\uc2a4\uc5b8\uc5b4\ubb38\ud654)", "\uc77c\ubcf8\uc5b8\uc5b4\ubb38\ud654\ud559\uacfc", "\uc911\uad6d\ud559\uacfc", "\ucca0\ud559\uacfc", "\ud55c\uad6d\uc5b4\ubb38\ud559\uacfc"],

      "\ubbf8\ub798\uc735\ud569\ub300\ud559": ["\uae08\uc735\ud22c\uc790\ud559\uacfc", "\uba54\uce74\ud2b8\ub85c\ub2c9\uc2a4\uacf5\ud559\uacfc", "\ubc18\ub3c4\uccb4\uc0b0\uc5c5\uc735\ud569\ud559\uacfc", "\uc0b0\uc5c5\uacbd\uc601\ud559\uacfc", "\uc18c\ud504\ud2b8\uc6e8\uc5b4\uc735\ud569\uacf5\ud559\uacfc"],

      "\ubc14\uc774\uc624\uc2dc\uc2a4\ud15c\uc735\ud569\ud559\ubd80": ["\ubc14\uc774\uc624\uc2dd\ud488\uacf5\ud559\uacfc", "\uc0dd\uba85\uacf5\ud559\uacfc", "\uc0dd\uba85\uacfc\ud559\uacfc", "\ucca8\ub2e8\ubc14\uc774\uc624\uc758\uc57d\ud559\uacfc"],

      "\uc0ac\ubc94\ub300\ud559": ["\uad50\uc721\ud559\uacfc", "\uad6d\uc5b4\uad50\uc721\uacfc", "\uc0ac\ud68c\uad50\uc721\uacfc", "\uc218\ud559\uad50\uc721\uacfc", "\uc601\uc5b4\uad50\uc721\uacfc", "\uccb4\uc721\uad50\uc721\uacfc"],

      "\uc0ac\ud68c\uacfc\ud559\ub300\ud559": ["\uacbd\uc81c\ud559\uacfc", "\ubbf8\ub514\uc5b4\ucee4\ubba4\ub2c8\ucf00\uc774\uc158\ud559\uacfc", "\uc0ac\ud68c\ubcf5\uc9c0\ud559\uacfc", "\uc18c\ube44\uc790\ud559\uacfc", "\uc544\ub3d9\uc2ec\ub9ac\ud559\uacfc", "\uc815\uce58\uc678\uad50\ud559\uacfc", "\ud589\uc815\ud559\uacfc"],

      "\uc18c\ud504\ud2b8\uc6e8\uc5b4\uc735\ud569\ub300\ud559": ["\ub370\uc774\ud130\uc0ac\uc774\uc5b8\uc2a4\ud559\uacfc", "\ub514\uc790\uc778\ud14c\ud06c\ub180\ub85c\uc9c0\ud559\uacfc", "\uc2a4\ub9c8\ud2b8\ubaa8\ube4c\ub9ac\ud2f0\uacf5\ud559\uacfc", "\uc778\uacf5\uc9c0\ub2a5\uacf5\ud559\uacfc", "\ucef4\ud4e8\ud130\uacf5\ud559\uacfc"],

      "\uc608\uc220\uccb4\uc721\ub300\ud559": ["\ub514\uc790\uc778\uc735\ud569\ud559\uacfc", "\uc2a4\ud3ec\uce20\uacfc\ud559\uacfc", "\uc5f0\uadf9\uc601\ud654\ud559\uacfc", "\uc758\ub958\ub514\uc790\uc778\ud559\uacfc(\uc77c\ubc18/\uc2e4\uae30)", "\uc870\ud615\uc608\uc220\ud559\uacfc"],

      "\uc758\uacfc\ub300\ud559 \ubc0f \uac04\ud638\ub300\ud559": ["\uac04\ud638\ub300\ud559(\uac04\ud638\ud559\uacfc)", "\uc758\uacfc\ub300\ud559(\uc758\uc608\uacfc)"],

      "\uc790\uc5f0\uacfc\ud559\ub300\ud559": ["\ubb3c\ub9ac\ud559\uacfc", "\uc218\ud559\uacfc", "\uc2dd\ud488\uc601\uc591\ud559\uacfc", "\ud1b5\uacc4\ud559\uacfc", "\ud574\uc591\uacfc\ud559\uacfc", "\ud654\ud559\uacfc"],

      "\ud504\ub7f0\ud2f0\uc5b4\ucc3d\uc758\ub300\ud559 (\ubb34\uc804\uacf5/\uc735\ud569)": ["\uacbd\uc601\uc735\ud569\ud559\ubd80", "\uacf5\ud559\uc735\ud569\ud559\ubd80", "\uc0ac\ud68c\uacfc\ud559\uc735\ud569\ud559\ubd80", "\uc778\ubb38\uc735\ud569\ud559\ubd80", "\uc790\uc5f0\uacfc\ud559\uc735\ud569\ud559\ubd80", "\uc790\uc720\uc804\uacf5\uc735\ud569\ud559\ubd80"]

    },

    "\uc804\ub0a8\ub300\ud559\uad50": {

      "AI\uc735\ud569\ub300\ud559": ["\ubbf8\ub798\ubaa8\ube4c\ub9ac\ud2f0\ud559\uacfc", "\ube45\ub370\uc774\ud130\uc735\ud569\ud559\uacfc", "\uc778\uacf5\uc9c0\ub2a5\ud559\ubd80"],

      "\uacbd\uc601\ub300\ud559": ["\uacbd\uc601\ud559\ubd80", "\uacbd\uc81c\ud559\ubd80"],

      "\uacf5\uacfc\ub300\ud559": ["\uac74\ucd95\ud559\ubd80", "\uace0\ubd84\uc790\uc735\ud569\uc18c\uc7ac\uacf5\ud559\ubd80", "\uae30\uacc4\uacf5\ud559\ubd80", "\uc0b0\uc5c5\uacf5\ud559\uacfc", "\uc0dd\ubb3c\uacf5\ud559\uacfc", "\uc2e0\uc18c\uc7ac\uacf5\ud559\ubd80", "\uc5d0\ub108\uc9c0\uc790\uc6d0\uacf5\ud559\uacfc", "\uc804\uae30\uacf5\ud559\uacfc", "\uc804\uc790\ucef4\ud4e8\ud130\uacf5\ud559\ubd80", "\ud1a0\ubaa9\uacf5\ud559\uacfc", "\ud654\ud559\uacf5\ud559\ubd80", "\ud658\uacbd\uc5d0\ub108\uc9c0\uacf5\ud559\uacfc"],

      "\uad11\uc8fc \uc9c1\ud560/\uc608\uc220\ub300\ud559": ["\uad6d\uc545\ud559\uacfc", "\ub514\uc790\uc778\ud559\uacfc", "\ubbf8\uc220\ud559\uacfc", "\uc74c\uc545\ud559\uacfc", "\uc790\uc728\uc804\uacf5(1\ub144)", "\uc790\uc728\uc804\uacf5\ud559\ubd80(4\ub144)"],

      "\ub18d\uc5c5\uc0dd\uba85\uacfc\ud559\ub300\ud559": ["\ub18d\uc0dd\uba85\ud654\ud559\uacfc", "\ub18d\uc5c5\uacbd\uc81c\ud559\uacfc", "\ub3d9\ubb3c\uc790\uc6d0\ud559\uacfc", "\ubc14\uc774\uc624\uc5d0\ub108\uc9c0\ud559\uacfc", "\ubd84\uc790\uc0dd\uba85\ud559\uacfc", "\uc0b0\ub9bc\uc790\uc6d0\ud559\uacfc", "\uc2dd\ud488\uacf5\ud559\uacfc", "\uc6d0\uc608\uc0dd\uba85\ud559\uacfc", "\uc735\ud569\ubc14\uc774\uc624\uc2dc\uc2a4\ud15c\uae30\uacc4\uacf5\ud559\uacfc", "\uc751\uc6a9\uc0dd\ubb3c\ud559\uacfc", "\uc751\uc6a9\uc2dd\ubb3c\ud559\uacfc", "\uc784\uc0b0\uacf5\ud559\uacfc", "\uc870\uacbd\ud559\uacfc", "\uc9c0\uc5ed\u00b7\ubc14\uc774\uc624\uc2dc\uc2a4\ud15c\uacf5\ud559\uacfc"],

      "\uc0ac\ubc94\ub300\ud559": ["\uac00\uc815\uad50\uc721\uacfc", "\uad50\uc721\ud559\uacfc", "\uad6d\uc5b4\uad50\uc721\uacfc", "\ubb3c\ub9ac\uad50\uc721\uacfc", "\uc0dd\ubb3c\uad50\uc721\uacfc", "\uc218\ud559\uad50\uc721\uacfc", "\uc5ed\uc0ac\uad50\uc721\uacfc", "\uc601\uc5b4\uad50\uc721\uacfc", "\uc720\uc544\uad50\uc721\uacfc", "\uc724\ub9ac\uad50\uc721\uacfc", "\uc9c0\uad6c\uacfc\ud559\uad50\uc721\uacfc", "\uc9c0\ub9ac\uad50\uc721\uacfc", "\ud2b9\uc218\uad50\uc721\ud559\ubd80", "\ud654\ud559\uad50\uc721\uacfc"],

      "\uc0ac\ud68c\uacfc\ud559\ub300\ud559": ["\ubb38\ud5cc\uc815\ubcf4\ud559\uacfc", "\ubb38\ud654\uc778\ub958\uace0\uace0\ud559\uacfc", "\ubbf8\ub514\uc5b4\ucee4\ubba4\ub2c8\ucf00\uc774\uc158\ud559\uacfc", "\uc0ac\ud68c\ud559\uacfc", "\uc2ec\ub9ac\ud559\uacfc", "\uc815\uce58\uc678\uad50\ud559\uacfc", "\uc9c0\ub9ac\ud559\uacfc", "\ud589\uc815\ud559\uacfc"],

      "\uc0dd\ud65c\uacfc\ud559\ub300\ud559": ["\uc0dd\ud65c\ubcf5\uc9c0\ud559\uacfc", "\uc2dd\ud488\uc601\uc591\uacfc\ud559\ubd80", "\uc758\ub958\ud559\uacfc"],

      "\uc5ec\uc218-\uacf5\ud559\ub300\ud559": ["\uac74\ucd95\ub514\uc790\uc778\ud559\uacfc", "\uacf5\ud559\uacc4\uc5f4", "\uc11d\uc720\ud654\ud559\uc18c\uc7ac\uacf5\ud559\uacfc", "\uc758\uacf5\ud559\ubd80"],

      "\uc5ec\uc218-\ubb38\ud654\uc0ac\ud68c\uacfc\ud559\ub300\ud559": ["\uad6d\uc81c\ud559\ubd80", "\uae00\ub85c\ubc8c\ube44\uc988\ub2c8\uc2a4\ud559\ubd80", "\ubb38\ud654\uad00\uad11\uacbd\uc601\ud559\uacfc", "\ubb38\ud654\ucf58\ud150\uce20\ud559\ubd80", "\ubb3c\ub958\uad50\ud1b5\ud559\uacfc"],

      "\uc5ec\uc218-\uc218\uc0b0\ud574\uc591/\uc9c1\ud560": ["\uae30\uad00\uc2dc\uc2a4\ud15c\uacf5\ud559\uacfc", "\uc218\uc0b0\uc0dd\uba85\uc758\ud559\uacfc", "\uc2a4\ub9c8\ud2b8\uc218\uc0b0\uc790\uc6d0\uad00\ub9ac\ud559\uacfc", "\uc870\uc120\ud574\uc591\uacf5\ud559\uacfc", "\ucc3d\uc758\uc735\ud569\ud559\ubd80", "\ud574\uc591\uc218\uc0b0\uad11\uc5ed"],

      "\uc758\uc57d\u00b7\ubcf4\uac74\u00b7\uac04\ud638 \uacc4\uc5f4": ["\uac04\ud638\ub300\ud559(\uac04\ud638\ud559\uacfc)", "\uc218\uc758\uacfc\ub300\ud559(\uc218\uc758\uc608\uacfc)", "\uc57d\ud559\ub300\ud559(\uc57d\ud559\ubd80)", "\uc758\uacfc\ub300\ud559(\uc758\ud559\uacfc)", "\uce58\uc758\ud559\uc804\ubb38\ub300\ud559\uc6d0"],

      "\uc778\ubb38\ub300\ud559": ["\uad6d\uc5b4\uad6d\ubb38\ud559\uacfc", "\uc0ac\ud559\uacfc", "\uc5b4\ubb38\uacc4\uc5f4(\ub3c5\uc5b4/\ubd88\uc5b4/\uc911\uc5b4/\uc77c\uc5b4 \ub4f1)", "\uc601\uc5b4\uc601\ubb38\ud559\uacfc", "\ucca0\ud559\uacfc"],

      "\uc790\uc5f0\uacfc\ud559\ub300\ud559": ["\ubb3c\ub9ac\ud559\uacfc", "\uc0dd\uba85\uacfc\ud559\uae30\uc220\ud559\ubd80", "\uc0dd\ubb3c\ud559\uacfc", "\uc218\ud559\uacfc", "\uc9c0\uad6c\ud658\uacbd\uacfc\ud559\ubd80", "\ud1b5\uacc4\ud559\uacfc", "\ud654\ud559\uacfc"]

    },

    "\uc804\ubd81\ub300\ud559\uad50": {

      "\uacbd\uc0c1\ub300\ud559": ["\uacbd\uc601\ud559\uacfc", "\uacbd\uc81c\ud559\ubd80", "\ubb34\uc5ed\ud559\uacfc", "\ud68c\uacc4\ud559\uacfc"],

      "\uacf5\uacfc\ub300\ud559": ["\uac74\ucd95\uacf5\ud559", "\uace0\ubd84\uc790\u00b7\ub098\ub178\uacf5\ud559", "\uae30\uacc4\uacf5\ud559", "\uae30\uacc4\uc124\uacc4\uacf5\ud559", "\uae30\uacc4\uc2dc\uc2a4\ud15c\uacf5\ud559", "\ub098\ub178\ubc14\uc774\uc624\uae30\uacc4\uc2dc\uc2a4\ud15c\uacf5\ud559", "\ub3c4\uc2dc\uacf5\ud559", "\ubc14\uc774\uc624\uba54\ub514\uceec\uacf5\ud559", "\uc0b0\uc5c5\uc815\ubcf4\uc2dc\uc2a4\ud15c\uacf5\ud559", "\uc18c\ud504\ud2b8\uc6e8\uc5b4\uacf5\ud559", "\uc2e0\uc18c\uc7ac\uacf5\ud559(\uae08\uc18d/\uc804\uc790\uc7ac\ub8cc)", "\uc2e0\uc18c\uc7ac\uacf5\ud559\ubd80(\uc815\ubcf4\uc18c\uc7ac\uacf5\ud559)", "\uc591\uc790\uc2dc\uc2a4\ud15c\uacf5\ud559\uacfc", "\uc720\uae30\uc18c\uc7ac\uc12c\uc720\uacf5\ud559", "\uc735\ud569\uae30\uc220\uacf5\ud559(IT\uc735\ud569\uae30\uc804\uacf5\ud559/IT\uc751\uc6a9\uc2dc\uc2a4\ud15c\uacf5\ud559)", "\uc804\uae30\uacf5\ud559", "\uc804\uc790\uacf5\ud559\ubd80", "\ucef4\ud4e8\ud130\uc778\uacf5\uc9c0\ub2a5\ud559\ubd80", "\ud1a0\ubaa9/\ud658\uacbd/\uc790\uc6d0\u00b7\uc5d0\ub108\uc9c0\uacf5\ud559\ubd80", "\ud56d\uacf5\uc6b0\uc8fc\uacf5\ud559\uacfc", "\ud654\ud559\uacf5\ud559\ubd80"],

      "\ub18d\uc5c5\uc0dd\uba85\uacfc\ud559\ub300\ud559": ["\ub18d\uacbd\uc81c\uc720\ud1b5\ud559\ubd80", "\ub18d\uc0dd\ubb3c\ud559\uacfc(\uc2dd\ubb3c\uc758\ud559\uacfc)", "\ub3d9\ubb3c\uc0dd\uba85\uacf5\ud559\uacfc", "\ub3d9\ubb3c\uc790\uc6d0\uacfc\ud559\uacfc", "\ubaa9\uc7ac\uc751\uc6a9\uacfc\ud559\uacfc", "\uc0b0\ub9bc\ud658\uacbd\uacfc\ud559\uacfc", "\uc0dd\ubb3c\uc0b0\uc5c5\uae30\uacc4\uacf5\ud559\uacfc", "\uc0dd\ubb3c\ud658\uacbd\ud654\ud559\uacfc", "\uc2a4\ub9c8\ud2b8\ud31c\ud559\uacfc", "\uc2dd\ud488\uacf5\ud559\uacfc", "\uc6d0\uc608\ud559\uacfc", "\uc791\ubb3c\uc0dd\uba85\uacfc\ud559\uacfc", "\uc870\uacbd\ud559\uacfc", "\uc9c0\uc5ed\uac74\uc124\uacf5\ud559\uacfc"],

      "\ub300\ud559\ubcf8\ubd80 \uc9c1\uc18d \ubc0f \uc735\ud569\uc790\uc728\uc804\uacf5": ["\uad6d\uc81c\uc774\uacf5\ud559\ubd80", "\uc735\ud569\uc790\uc728\uc804\uacf5\ud559\ubd80 1(\uc804\uc8fc)", "\uc735\ud569\uc790\uc728\uc804\uacf5\ud559\ubd80 2(\uc775\uc0b0)", "\uc774\ucc28\uc804\uc9c0\uacf5\ud559\uacfc", "\ucca8\ub2e8\ubc29\uc704\uc0b0\uc5c5\ud559\uacfc"],

      "\uc0ac\ubc94\ub300\ud559": ["\uacfc\ud559\uad50\uc721\ud559\ubd80(\ubb3c\ub9ac/\uc0dd\ubb3c/\uc9c0\uad6c\uacfc\ud559/\ud654\ud559)", "\uad50\uc721\ud559\uacfc", "\uad6d\uc5b4\uad50\uc721\uacfc", "\ub3c5\uc5b4\uad50\uc721\uacfc", "\uc0ac\ud68c\uacfc\uad50\uc721\ud559\ubd80(\uc5ed\uc0ac/\uc724\ub9ac/\uc77c\ubc18\uc0ac\ud68c/\uc9c0\ub9ac)", "\uc218\ud559\uad50\uc721\uacfc", "\uc601\uc5b4\uad50\uc721\uacfc", "\uccb4\uc721\uad50\uc721\uacfc"],

      "\uc0ac\ud68c\uacfc\ud559\ub300\ud559": ["\uacf5\uacf5\uc778\uc7ac\ud559\ubd80", "\ubbf8\ub514\uc5b4\ucee4\ubba4\ub2c8\ucf00\uc774\uc158\ud559\uacfc", "\uc0ac\ud68c\ubcf5\uc9c0\ud559\uacfc", "\uc0ac\ud68c\ud559\uacfc", "\uc2ec\ub9ac\ud559\uacfc", "\uc815\uce58\uc678\uad50\ud559\uacfc", "\ud589\uc815\ud559\uacfc"],

      "\uc0dd\ud65c\uacfc\ud559\ub300\ud559": ["\uc2dd\ud488\uc601\uc591\ud559\uacfc", "\uc544\ub3d9\ud559\uacfc", "\uc758\ub958\ud559\uacfc", "\uc8fc\uac70\ud658\uacbd\ud559\uacfc"],

      "\uc608\uc220\ub300\ud559": ["\ubb34\uc6a9\ud559\uacfc(\ubc1c\ub808/\ubb34\uc6a9\uad50\uc721\ud06c\ub9ac\uc5d0\uc774\ud130/\ud55c\uad6d\ubb34\uc6a9/\ucee8\ud15c\ud3ec\ub7ec\ub9ac\ubb34\uc6a9)", "\ubbf8\uc220\ud559\uacfc(\ud55c\uad6d\ud654/\ud68c\ud654/\uc870\uc18c/\uac00\uad6c\uc870\ud615\ub514\uc790\uc778)", "\uc0b0\uc5c5\ub514\uc790\uc778\ud559\uacfc", "\uc74c\uc545\uacfc", "\ud55c\uad6d\uc74c\uc545\ud559\uacfc"],

      "\uc758\uc57d\u00b7\ubcf4\uac74\u00b7\uac04\ud638\u00b7\uc218\uc758\uacc4\uc5f4": ["\uac04\ud638\ub300\ud559(\uac04\ud638\ud559\uacfc)", "\uc218\uc758\uacfc\ub300\ud559(\uc218\uc758\uc608\uacfc)", "\uc57d\ud559\ub300\ud559(\uc57d\ud559\uacfc)", "\uc758\uacfc\ub300\ud559(\uc758\uc608\uacfc)", "\uce58\uacfc\ub300\ud559(\uce58\uc758\uc608\uacfc)"],

      "\uc778\ubb38\ub300\ud559": ["\uace0\uace0\ubb38\ud654\uc778\ub958\ud559\uacfc", "\uad6d\uc5b4\uad6d\ubb38\ud559\uacfc", "\uad6d\uc81c\ud559\ubd80", "\ub3c5\uc77c\ud559\uacfc", "\ubb38\ud5cc\uc815\ubcf4\ud559\uacfc", "\uc0ac\ud559\uacfc", "\uc2a4\ud398\uc778\u00b7\uc911\ub0a8\ubbf8\ud559\uacfc", "\uc601\uc5b4\uc601\ubb38\ud559\uacfc", "\uc77c\ubcf8\ud559\uacfc", "\uc911\uc5b4\uc911\ubb38\ud559\uacfc", "\ucca0\ud559\uacfc", "\ud504\ub791\uc2a4\u00b7\uc544\ud504\ub9ac\uce74\ud559\uacfc"],

      "\uc790\uc5f0\uacfc\ud559\ub300\ud559": ["\uacfc\ud559\ud559\uacfc", "\ubb3c\ub9ac\ud559\uacfc", "\ubc18\ub3c4\uccb4\uacfc\ud559\uae30\uc220\ud559\uacfc", "\ubd84\uc790\uc0dd\ubb3c\ud559\uacfc", "\uc0dd\uba85\uacfc\ud559\uacfc", "\uc218\ud559\uacfc", "\uc2a4\ud3ec\uce20\uacfc\ud559\uacfc", "\uc9c0\uad6c\ud658\uacbd\uacfc\ud559\uacfc", "\ud1b5\uacc4\ud559\uacfc", "\ud654\ud559\uacfc"],

      "\ud658\uacbd\uc0dd\uba85\uc790\uc6d0\ub300\ud559": ["\uc0dd\uba85\uacf5\ud559\ubd80", "\uc0dd\ud0dc\uc870\uacbd\ub514\uc790\uc778\ud559\uacfc"]

    },

    "\uc911\uc559\ub300\ud559\uad50": {

      "\uacbd\uc601\uacbd\uc81c\ub300\ud559": ["\uacbd\uc601\ud559\ubd80(\uacbd\uc601\ud559, \uae00\ub85c\ubc8c\uae08\uc735)", "\uacbd\uc81c\ud559\ubd80", "\uad11\uace0\ud64d\ubcf4\ud559\ubd80", "\uad6d\uc81c\ubb3c\ub958\ud559\uacfc", "\uc0b0\uc5c5\ubcf4\uc548\ud559\uacfc", "\uc751\uc6a9\ud1b5\uacc4\ud559\uacfc", "\uc9c0\uc2dd\uacbd\uc601\ud559\ubd80"],

      "\uacf5\uacfc\ub300\ud559": ["\uac74\ucd95\ud559\ubd80", "\uae30\uacc4\uacf5\ud559\ubd80", "\uc0ac\ud68c\uae30\ubc18\uc2dc\uc2a4\ud15c\uacf5\ud559\ubd80(\uac74\uc124\ud658\uacbd\ud50c\ub79c\ud2b8\uacf5\ud559, \ub3c4\uc2dc\uc2dc\uc2a4\ud15c\uacf5\ud559)", "\uc5d0\ub108\uc9c0\uc2dc\uc2a4\ud15c\uacf5\ud559\ubd80", "\ucca8\ub2e8\uc18c\uc7ac\uacf5\ud559\uacfc", "\ud654\ud559\uacf5\ud559\uacfc"],

      "\uc0ac\ubc94\ub300\ud559": ["\uad50\uc721\ud559\uacfc", "\uc601\uc5b4\uad50\uc721\uacfc", "\uc720\uc544\uad50\uc721\uacfc", "\uccb4\uc721\uad50\uc721\uacfc"],

      "\uc0ac\ud68c\uacfc\ud559\ub300\ud559": ["\uacf5\uacf5\uc778\uc7ac\ud559\ubd80", "\ub3c4\uc2dc\uacc4\ud68d\u00b7\ubd80\ub3d9\uc0b0\ud559\uacfc", "\ubb38\ud5cc\uc815\ubcf4\ud559\uacfc", "\ubbf8\ub514\uc5b4\ucee4\ubba4\ub2c8\ucf00\uc774\uc158\ud559\ubd80", "\uc0ac\ud68c\ubcf5\uc9c0\ud559\ubd80", "\uc0ac\ud68c\ud559\uacfc", "\uc2ec\ub9ac\ud559\uacfc", "\uc815\uce58\uad6d\uc81c\ud559\uacfc"],

      "\uc0dd\uba85\uacf5\ud559\ub300\ud559": ["\uc0dd\uba85\uc790\uc6d0\uacf5\ud559\ubd80(\ub3d9\ubb3c\uc0dd\uba85\uacf5\ud559, \uc2dd\ubb3c\uc0dd\uba85\uacf5\ud559)", "\uc2dc\uc2a4\ud15c\uc0dd\uba85\uacf5\ud559\uacfc", "\uc2dd\ud488\uacf5\ud559\ubd80(\uc2dd\ud488\uacf5\ud559, \uc2dd\ud488\uc5f0\uc591)"],

      "\uc18c\ud504\ud2b8\uc6e8\uc5b4\ub300\ud559": ["AI\ud559\uacfc", "\uc18c\ud504\ud2b8\uc6e8\uc5b4\ud559\ubd80"],

      "\uc608\uc220\uacc4\uc5f4": ["\ub514\uc790\uc778\ud559\ubd80(\uc2e4\ub0b4\ud658\uacbd\ub514\uc790\uc778/\ud328\uc158))", "\uc608\uc220\uacf5\ud559\ub300\ud559(\uc608\uc220\uacf5\ud559\ubd80)", "\uc608\uc220\ub300\ud559(\uacf5\uc5f0\uc601\uc0c1\ucc3d\uc791\ud559\ubd80(\uacf5\uac04\uc5f0\ucd9c/\ubb38\uc608\ucc3d\uc791)"],

      "\uc758\uc57d/\ubcf4\uac74\uacc4\uc5f4": ["\uc57d\ud559\ub300\ud559(\uc57d\ud559\ubd80)", "\uc758\uacfc\ub300\ud559(\uc758\ud559\ubd80)", "\uc801\uc2ed\uc790\uac04\ud638\ub300\ud559(\uac04\ud638\ud559\uacfc)"],

      "\uc778\ubb38\ub300\ud559": ["\uad6d\uc5b4\uad6d\ubb38\ud559", "\uc544\uc2dc\uc544\ubb38\ud654\ud559\ubd80(\uc77c\ubcf8\uc5b4\ubb38\ud559, \uc911\uad6d\uc5b4\ubb38\ud559)", "\uc5ed\uc0ac\ud559\uacfc", "\uc601\uc5b4\uc601\ubb38\ud559", "\uc720\ub7fd\ubb38\ud654\ud559\ubd80(\ub3c5\uc77c\uc5b4\ubb38\ud559, \ud504\ub791\uc2a4\uc5b4\ubb38\ud559, \ub7ec\uc2dc\uc544\uc5b4\ubb38\ud559)", "\ucca0\ud559\uacfc"],

      "\uc790\uc5f0\uacfc\ud559\ub300\ud559": ["\ubb3c\ub9ac\ud559\uacfc", "\uc0dd\uba85\uacfc\ud559\uacfc", "\uc218\ud559\uacfc", "\ud654\ud559\uacfc"],

      "\ucc3d\uc758ICT\uacf5\uacfc\ub300\ud559": ["\uc735\ud569\uacf5\ud559\ubd80", "\uc804\uc790\uc804\uae30\uacf5\ud559\ubd80", "\uc9c0\ub2a5\ud615\ubc18\ub3c4\uccb4\uacf5\ud559\uacfc"]

    },

    "\ucda9\ub0a8\ub300\ud559\uad50": {

      "\uacbd\uc0c1\ub300\ud559": ["\uacbd\uc601\ud559\ubd80", "\uacbd\uc81c\ud559\uacfc", "\ubb34\uc5ed\ud559\uacfc"],

      "\uacf5\uacfc\ub300\ud559": ["\uac74\ucd95\ud559\uacfc(5\ub144\uc81c)", "\uae30\uacc4\uacf5\ud559\ubd80", "\uba54\uce74\ud2b8\ub85c\ub2c9\uc2a4\uacf5\ud559\uacfc", "\uc2a4\ub9c8\ud2b8\uc2dc\ud2f0\uac74\ucd95\uacf5\ud559\uacfc", "\uc2e0\uc18c\uc7ac\uacf5\ud559\uacfc", "\uc5d0\ub108\uc9c0\uacf5\ud559\uacfc", "\uc720\uae30\uc7ac\ub8cc\uacf5\ud559\uacfc", "\uc751\uc6a9\ud654\ud559\uacf5\ud559\uacfc", "\uc790\uc728\uc6b4\ud56d\uc2dc\uc2a4\ud15c\uacf5\ud559\uacfc", "\uc804\uae30\uacf5\ud559\uacfc", "\uc804\uc790\uacf5\ud559\uacfc", "\uc815\ubcf4\ud1b5\uc2e0\uc735\ud569\ud559\ubd80", "\ucef4\ud4e8\ud130\uc778\uacf5\uc9c0\ub2a5\ud559\ubd80", "\ud1a0\ubaa9\uacf5\ud559\uacfc", "\ud56d\uacf5\uc6b0\uc8fc\uacf5\ud559\uacfc", "\ud658\uacbd\uacf5\ud559\uacfc"],

      "\ub18d\uc5c5\uc0dd\uba85\uacfc\ud559\ub300\ud559": ["\ub18d\uc0dd\uba85\uc735\ud569\ud559\ubd80", "\ub18d\uc5c5\uacbd\uc81c\ud559\uacfc", "\ub3d9\ubb3c\ubc14\uc774\uc624\uc2dc\uc2a4\ud15c\uacfc\ud559\uacfc", "\ub3d9\ubb3c\uc790\uc6d0\uc0dd\uba85\uacfc\ud559\uacfc", "\uc0b0\ub9bc\ud658\uacbd\uc790\uc6d0\ud559\uacfc", "\uc0dd\ubb3c\ud658\uacbd\ud654\ud559\uacfc", "\uc2a4\ub9c8\ud2b8\ub18d\uc5c5\uc2dc\uc2a4\ud15c\uae30\uacc4\uacf5\ud559\uacfc", "\uc2dd\ubb3c\uc790\uc6d0\ud559\uacfc", "\uc2dd\ud488\uacf5\ud559\uacfc", "\uc6d0\uc608\ud559\uacfc", "\uc751\uc6a9\uc0dd\ubb3c\ud559\uacfc", "\uc9c0\uc5ed\ud658\uacbd\ud1a0\ubaa9\ud559\uacfc", "\ud658\uacbd\uc18c\uc7ac\uacf5\ud559\uacfc"],

      "\uc0ac\ubc94\ub300\ud559": ["\uac74\uc124\uacf5\ud559\uad50\uc721\uacfc", "\uad50\uc721\ud559\uacfc", "\uad6d\uc5b4\uad50\uc721\uacfc", "\uae30\uacc4\uacf5\ud559\uad50\uc721\uacfc", "\uae30\uc220\uad50\uc721\uacfc", "\uc218\ud559\uad50\uc721\uacfc", "\uc601\uc5b4\uad50\uc721\uacfc", "\uc804\uae30\u00b7\uc804\uc790\u00b7\ud1b5\uc2e0\uacf5\ud559\uad50\uc721\uacfc", "\uccb4\uc721\uad50\uc721\uacfc", "\ud654\ud559\uacf5\ud559\uad50\uc721\uacfc"],

      "\uc0ac\ud68c\uacfc\ud559\ub300\ud559": ["\ub3c4\uc2dc\u00b7\uc790\uce58\uc735\ud569\ud559\uacfc", "\ubb38\ud5cc\uc815\ubcf4\ud559\uacfc", "\uc0ac\ud68c\ubcf5\uc9c0\ud559\uacfc", "\uc0ac\ud68c\ud559\uacfc", "\uc2ec\ub9ac\ud559\uacfc", "\uc5b8\ub860\uc815\ubcf4\ud559\uacfc", "\uc815\uce58\uc678\uad50\ud559\uacfc", "\ud589\uc815\ud559\ubd80"],

      "\uc0dd\uba85\uc2dc\uc2a4\ud15c\uacfc\ud559\ub300\ud559": ["\ubbf8\uc0dd\ubb3c\u00b7\ubd84\uc790\uc0dd\uba85\uacfc\ud559\uacfc", "\uc0dd\uba85\uc815\ubcf4\uc735\ud569\ud559\uacfc", "\uc0dd\ubb3c\uacfc\ud559\uacfc"],

      "\uc0dd\ud65c\uacfc\ud559\ub300\ud559": ["\uc18c\ube44\uc790\ud559\uacfc", "\uc2dd\ud488\uc601\uc591\ud559\uacfc", "\uc758\ub958\ud559\uacfc"],

      "\uc608\uc220\ub300\ud559": ["\uad00\ud604\uc545\uacfc", "\ub514\uc790\uc778\ucc3d\uc758\ud559\uacfc", "\uc74c\uc545\uacfc", "\uc870\uc18c\uacfc", "\ud68c\ud654\uacfc"],

      "\uc758\uc57d\u00b7\uac04\ud638\u00b7\uc218\uc758\uacc4\uc5f4": ["\uac04\ud638\ud559\uacfc", "\uc218\uc758\uc608\uacfc/\uc218\uc758\ud559\uacfc", "\uc57d\ud559\uacfc", "\uc758\uc608\uacfc/\uc758\ud559\uacfc"],

      "\uc778\ubb38\ub300\ud559": ["\uace0\uace0\ud559\uacfc", "\uad6d\uc0ac\ud559\uacfc", "\uad6d\uc5b4\uad6d\ubb38\ud559\uacfc", "\ub3c5\uc5b4\ub3c5\ubb38\ud559\uacfc", "\ubd88\uc5b4\ubd88\ubb38\ud559\uacfc", "\uc0ac\ud559\uacfc", "\uc5b8\uc5b4\ud559\uacfc", "\uc601\uc5b4\uc601\ubb38\ud559\uacfc", "\uc77c\uc5b4\uc77c\ubb38\ud559\uacfc", "\uc911\uc5b4\uc911\ubb38\ud559\uacfc", "\ucca0\ud559\uacfc", "\ud55c\ubb38\ud559\uacfc"],

      "\uc790\uc5f0\uacfc\ud559\ub300\ud559": ["\ubb34\uc6a9\ud559\uacfc", "\ubb3c\ub9ac\ud559\uacfc", "\ubc18\ub3c4\uccb4\uc735\ud569\ud559\uacfc", "\uc0dd\ud654\ud559\uacfc", "\uc218\ud559\uacfc", "\uc2a4\ud3ec\uce20\uacfc\ud559\uacfc", "\uc815\ubcf4\ud1b5\uacc4\ud559\uacfc", "\uc9c0\uc9c8\ud658\uacbd\uacfc\ud559\uacfc", "\ucc9c\ubb38\uc6b0\uc8fc\uacfc\ud559\uacfc", "\ud574\uc591\ud658\uacbd\uacfc\ud559\uacfc", "\ud654\ud559\uacfc"],

      "\ud2b9\uc218 \ubc0f \uc735\ud569\ud559\ubd80": ["\uad6d\uac00\uc548\ubcf4\uc735\ud569\ud559\ubd80(\uad6d\ud1a0\uc548\ubcf4\ud559/\ud574\uc591\uc548\ubcf4\ud559)", "\uad6d\uc81c\ud559\ubd80", "\uc9c0\uc2dd\uc735\ud569\ud559\ubd80(\ubb38\ud654\uc640\uc0ac\ud68c\uc735\ud569/\uacf5\uacf5\uc548\uc804\uc735\ud569/\ub9ac\ub354\uc2ed\uacfc\uc870\uc9c1\uacfc\ud559)", "\ucc3d\uc758\uc735\ud569\ub300\ud559(\uc790\uc728\uc804\uacf5\uc735\ud569/\uc778\ubb38\uc0ac\ud68c\uc735\ud569/\uc790\uc5f0\uacfc\ud559\uc735\ud569/\uacf5\ud559\uc735\ud569)"]

    },

    "\ucda9\ubd81\ub300\ud559\uad50": {

      "\uacbd\uc601\ub300\ud559": ["\uacbd\uc601\uc815\ubcf4\ud559\uacfc", "\uacbd\uc601\ud559\ubd80", "\uacbd\uc601\ud559\uc790\uc728\uc804\uacf5\ud559\ubd80", "\uad6d\uc81c\uacbd\uc601\ud559\uacfc"],

      "\uacf5\uacfc\ub300\ud559": ["\uac74\ucd95\uacf5\ud559\uacfc", "\uac74\ucd95\ud559\uacfc", "\uacf5\uc5c5\ud654\ud559\uacfc", "\uacf5\ud559\uc790\uc728\uc804\uacf5\ud559\ubd80", "\uae30\uacc4\uacf5\ud559\ubd80", "\ub3c4\uc2dc\uacf5\ud559\uacfc", "\uc2e0\uc18c\uc7ac\uacf5\ud559\uacfc", "\uc548\uc804\uacf5\ud559\uacfc", "\ud1a0\ubaa9\uacf5\ud559\ubd80", "\ud654\ud559\uacf5\ud559\uacfc", "\ud658\uacbd\uacf5\ud559\uacfc"],

      "\ub18d\uc5c5\uc0dd\uba85\ud658\uacbd\ub300\ud559": ["\ub18d\uc5c5\uacbd\uc81c\ud559\uacfc", "\ub18d\uc5c5\uc0dd\uba85\ud658\uacbd\uc790\uc728\uc804\uacf5\ud559\ubd80", "\ubaa9\uc7ac\u2027\uc885\uc774\uacfc\ud559\uacfc", "\ubc14\uc774\uc624\uc2dc\uc2a4\ud15c\uacf5\ud559\uacfc", "\uc0b0\ub9bc\ud559\uacfc", "\uc2dd\ubb3c\uc758\ud559\uacfc", "\uc2dd\ubb3c\uc790\uc6d0\ud559\uacfc", "\uc2dd\ud488\uc0dd\uba85\uacf5\ud559\uacfc", "\uc6d0\uc608\uacfc\ud559\uacfc", "\uc9c0\uc5ed\uac74\uc124\uacf5\ud559\uacfc", "\ucd95\uc0b0\ud559\uacfc", "\ud2b9\uc6a9\uc2dd\ubb3c\ud559\uacfc", "\ud658\uacbd\uc0dd\uba85\ud654\ud559\uacfc"],

      "\uc0ac\ubc94\ub300\ud559": ["\uad50\uc721\ud559\uacfc", "\uad6d\uc5b4\uad50\uc721\uacfc", "\ubb3c\ub9ac\uad50\uc721\uacfc", "\uc0ac\ud68c\uad50\uc721\uacfc", "\uc0dd\ubb3c\uad50\uc721\uacfc", "\uc218\ud559\uad50\uc721\uacfc", "\uc5ed\uc0ac\uad50\uc721\uacfc", "\uc601\uc5b4\uad50\uc721\uacfc", "\uc724\ub9ac\uad50\uc721\uacfc", "\uc9c0\uad6c\uacfc\ud559\uad50\uc721\uacfc", "\uc9c0\ub9ac\uad50\uc721\uacfc", "\uccb4\uc721\uad50\uc721\uacfc", "\ud654\ud559\uad50\uc721\uacfc"],

      "\uc0ac\ud68c\uacfc\ud559\ub300\ud559": ["\uacbd\uc81c\ud559\uacfc", "\uc0ac\ud68c\uacfc\ud559\uc790\uc728\uc804\uacf5\ud559\ubd80", "\uc0ac\ud68c\ud559\uacfc", "\uc2ec\ub9ac\ud559\uacfc", "\uc815\uce58\uc678\uad50\ud559\uacfc", "\ud589\uc815\ud559\uacfc"],

      "\uc0dd\ud65c\uacfc\ud559\ub300\ud559": ["\uc0dd\ud65c\uacfc\ud559\uc790\uc728\uc804\uacf5\ud559\ubd80", "\uc18c\ube44\uc790\ud559\uacfc", "\uc2dd\ud488\uc601\uc591\ud559\uacfc", "\uc544\ub3d9\ubcf5\uc9c0\ud559\uacfc", "\uc758\ub958\ud559\uacfc", "\uc8fc\uac70\ud658\uacbd\ud559\uacfc"],

      "\uc608\uc220\ud559\uacfc\uad70": ["\ub514\uc790\uc778\ud559\uacfc", "\ubbf8\uc220\ud559\uacfc(\ub3d9\uc591\ud654/\uc11c\uc591\ud654/\uc870\uc18c)"],

      "\uc758\uc57d/\ubcf4\uac74/\uac04\ud638/\uc218\uc758\uacc4\uc5f4": ["\uac04\ud638\ub300\ud559(\uac04\ud638\ud559\uacfc)", "\uc218\uc758\uacfc\ub300\ud559(\uc218\uc758\uc608\uacfc)", "\uc57d\ud559\ub300\ud559(\uc57d\ud559\uacfc)", "\uc57d\ud559\ub300\ud559(\uc81c\uc57d\ud559\uacfc)", "\uc758\uacfc\ub300\ud559(\uc758\uc608\uacfc)"],

      "\uc778\ubb38\ub300\ud559": ["\uace0\uace0\ubbf8\uc220\uc0ac\ud559\uacfc", "\uad6d\uc5b4\uad6d\ubb38\ud559\uacfc", "\ub3c5\uc77c\uc5b8\uc5b4\ubb38\ud654\ud559\uacfc", "\ub7ec\uc2dc\uc544\uc5b8\uc5b4\ubb38\ud654\ud559\uacfc", "\uc0ac\ud559\uacfc", "\uc601\uc5b4\uc601\ubb38\ud559\uacfc", "\uc778\ubb38\ud559\uc790\uc728\uc804\uacf5\ud559\ubd80", "\uc911\uc5b4\uc911\ubb38\ud559\uacfc", "\ucca0\ud559\uacfc", "\ud504\ub791\uc2a4\uc5b8\uc5b4\ubb38\ud654\ud559\uacfc"],

      "\uc790\uc5f0\uacfc\ud559\ub300\ud559": ["\ubb3c\ub9ac\ud559\uacfc", "\ubbf8\uc0dd\ubb3c\ud559\uacfc", "\uc0dd\ubb3c\ud559\uacfc", "\uc0dd\ud654\ud559\uacfc", "\uc218\ud559\uacfc", "\uc790\uc5f0\uacfc\ud559\uc790\uc728\uc804\uacf5\ud559\ubd80", "\uc815\ubcf4\ud1b5\uacc4\ud559\uacfc", "\uc9c0\uad6c\ud658\uacbd\uacfc\ud559\uacfc", "\ucc9c\ubb38\uc6b0\uc8fc\ud559\uacfc", "\ud654\ud559\uacfc"],

      "\uc804\uc790\uc815\ubcf4\ub300\ud559": ["\ubc18\ub3c4\uccb4\uacf5\ud559\ubd80", "\uc18c\ud504\ud2b8\uc6e8\uc5b4\ud559\ubd80", "\uc804\uae30\uacf5\ud559\ubd80", "\uc804\uc790\uacf5\ud559\uacfc", "\uc804\uc790\uc815\ubcf4\uc790\uc728\uc804\uacf5\ud559\ubd80", "\uc815\ubcf4\ud1b5\uc2e0\uacf5\ud559\ubd80", "\uc9c0\ub2a5\ub85c\ubd07\uacf5\ud559\uacfc", "\ucef4\ud4e8\ud130\uacf5\ud559\uacfc"],

      "\ucc3d\uc758\uc735\ud569\ub300\ud559 \ubc0f \uc9c1\ud560\ud559\ubd80": ["\ubc14\uc774\uc624\ud5ec\uc2a4\ud559\ubd80", "\uc778\ubb38\uc0ac\ud68c\uc790\uc728\uc804\uacf5\uacc4\uc5f4", "\uc790\uc5f0\uacfc\ud559\uc790\uc728\uc804\uacf5\uacc4\uc5f4"]

    },

    "\ud55c\uad6d\uc678\uad6d\uc5b4\ub300\ud559\uad50": {

      "\uae00\ub85c\ubc8c\ucea0\ud37c\uc2a4": ["AI\uc735\ud569\ub300\ud559(AI\ub370\uc774\ud130\uc735\ud569\ud559\ubd80, Finance & AI\uc735\ud569\ud559\ubd80)", "Culture & Technology \uc735\ud569\ub300\ud559(\ub514\uc9c0\ud138\ucf58\ud150\uce20\ud559\ubd80, \ud22c\uc5b4\ub9ac\uc998 & \uc6f0\ub2c8\uc2a4\ud559\ubd80, \uae00\ub85c\ubc8c\uc2a4\ud3ec\uce20\uc0b0\uc5c5\ud559\ubd80)", "\uacbd\uc0c1\ub300\ud559(Global Business & Technology\ud559\ubd80, \uad6d\uc81c\uae08\uc735\ud559\uacfc)", "\uacf5\uacfc\ub300\ud559(\ucef4\ud4e8\ud130\uacf5\ud559\ubd80, \uc815\ubcf4\ud1b5\uc2e0\uacf5\ud559\uacfc, \ubc18\ub3c4\uccb4\uc804\uc790\uacf5\ud559\ubd80(\ubc18\ub3c4\uccb4/\uc804\uc790\uacf5\ud559\uc804\uacf5), \uc0b0\uc5c5\uacbd\uc601\uacf5\ud559\uacfc, \ubc14\uc774\uc624\uba54\ub514\uceec\uacf5\ud559\ubd80)", "\uad6d\uac00\uc804\ub7b5\uc5b8\uc5b4\ub300\ud559(\ud3f4\ub780\ub4dc\ud559\uacfc, \ub8e8\ub9c8\ub2c8\uc544\ud559\uacfc, \uccb4\ucf54\u00b7\uc2ac\ub85c\ubc14\ud0a4\uc544\ud559\uacfc, \ud5dd\uac00\ub9ac\ud559\uacfc, \uc138\ub974\ube44\uc544\u00b7\ud06c\ub85c\uc544\ud2f0\uc544\ud559\uacfc, \uadf8\ub9ac\uc2a4\u00b7\ubd88\uac00\ub9ac\uc544\ud559\uacfc, \uc911\uc559\uc544\uc2dc\uc544\ud559\uacfc, \uc544\ud504\ub9ac\uce74\ud559\ubd80, \uc6b0\ud06c\ub77c\uc774\ub098\ud559\uacfc, \ud55c\uad6d\ud559\uacfc)", "\uae30\ud6c4\ubcc0\ud654\uc735\ud569\ud559\ubd80", "\uc735\ud569\uc778\uc7ac\ub300\ud559(\uc735\ud569\uc778\uc7ac\ud559\ubd80)", "\uc778\ubb38\ub300\ud559(\ucca0\ud559\uacfc, \uc0ac\ud559\uacfc, \uc5b8\uc5b4\uc778\uc9c0\uacfc\ud559\uacfc)", "\uc790\uc5f0\uacfc\ud559\ub300\ud559(\uc218\ud559\uacfc, \ud1b5\uacc4\ud559\uacfc, \uc804\uc790\ubb3c\ub9ac\ud559\uacfc, \ud658\uacbd\ud559\uacfc, \uc0dd\uba85\uacf5\ud559\uacfc, \ud654\ud559\uacfc)", "\uc790\uc720\uc804\uacf5\ud559\ubd80"],

      "\uc11c\uc6b8\ucea0\ud37c\uc2a4": ["AI\uc735\ud569\ub300\ud559(Language & AI\uc735\ud569\ud559\ubd80, Social Science & AI\uc735\ud569\ud559\ubd80)", "KFL\ud559\ubd80", "Language & Diplomacy\ud559\ubd80", "Language & Trade\ud559\ubd80", "\uacbd\uc601\ub300\ud559(\uacbd\uc601\ud559\ubd80)", "\uad6d\uc81c\ud559\ubd80", "\uc0ac\ubc94\ub300\ud559(\uc601\uc5b4\uad50\uc721\uacfc, \ud55c\uad6d\uc5b4\uad50\uc721\uacfc, \uc678\uad6d\uc5b4\uad50\uc721\ud559\ubd80(\ud504\ub791\uc2a4\uc5b4/\ub3c5\uc77c\uc5b4/\uc911\uad6d\uc5b4\uad50\uc721\uc804\uacf5))", "\uc0ac\ud68c\uacfc\ud559\ub300\ud559(\uc815\uce58\uc678\uad50\ud559\uacfc, \ud589\uc815\ud559\uacfc, \ubbf8\ub514\uc5b4\ucee4\ubba4\ub2c8\ucf00\uc774\uc158\ud559\ubd80)", "\uc0c1\uacbd\ub300\ud559(\uad6d\uc81c\ud1b5\uc0c1\ud559\uacfc, \uacbd\uc81c\ud559\ubd80)", "\uc11c\uc591\uc5b4\ub300\ud559(\ud504\ub791\uc2a4\uc5b4\ud559\ubd80, \ub3c5\uc77c\uc5b4\uacfc, \ub178\uc5b4\uacfc, \uc2a4\ud398\uc778\uc5b4\uacfc, \uc774\ud0c8\ub9ac\uc544\uc5b4\uacfc, \ud3ec\ub974\ud22c\uac08\uc5b4\uacfc, \ub124\ub35c\ub780\ub4dc\uc5b4\uacfc, \uc2a4\uce78\ub514\ub098\ube44\uc544\uc5b4\uacfc)", "\uc544\uc2dc\uc544\uc5b8\uc5b4\ubb38\ud654\ub300\ud559(\ub9d0\ub808\uc774\u00b7\uc778\ub3c4\ub124\uc2dc\uc544\uc5b4\uacfc, \ud0dc\uad6d\ud559\uacfc, \ubca0\ud2b8\ub0a8\uc5b4\uacfc, \uc778\ub3c4\uc5b4\uacfc, \uc544\ub78d\uc5b4\uacfc, \ud280\ub974\ud0a4\uc608\u00b7\uc544\uc81c\ub974\ubc14\uc774\uc794\ud559\uacfc, \ud398\ub974\uc2dc\uc544\uc5b4\u00b7\uc774\ub780\ud559\uacfc, \ubabd\uace8\uc5b4\uacfc)", "\uc601\uc5b4\ub300\ud559(ELLT\ud559\uacfc, \uc601\ubbf8\ubb38\ud559\u00b7\ubb38\ud654\ud559\uacfc, \uc601\uc5b4\ud1b5\ubc88\uc5ed\ud559\uacfc)", "\uc77c\ubcf8\ud559\ub300\ud559(\uc77c\ubcf8\uc5b8\uc5b4\ubb38\ud654\ud559\ubd80, \uc735\ud569\uc77c\ubcf8\uc9c0\uc5ed\ud559\ubd80)", "\uc790\uc720\uc804\uacf5\ud559\ubd80", "\uc911\uad6d\ud559\ub300\ud559(\uc911\uad6d\uc5b8\uc5b4\ubb38\ud654\ud559\ubd80, \uc911\uad6d\uc678\uad50\ud1b5\uc0c1\ud559\ubd80)"]

    },

    "\ud55c\uc591\ub300\ud559\uad50": {

      "\uacf5\uacfc\ub300\ud559": ["\uac74\uc124\ud658\uacbd\uacf5\ud559\uacfc", "\uac74\ucd95\uacf5\ud559\ubd80", "\uac74\ucd95\ud559\ubd80", "\uae30\uacc4\uacf5\ud559\ubd80", "\ub370\uc774\ud130\uc0ac\uc774\uc5b8\uc2a4\ud559\ubd80", "\ub3c4\uc2dc\uacf5\ud559\uacfc", "\ubbf8\ub798\uc790\ub3d9\ucc28\uacf5\ud559\uacfc", "\ubc18\ub3c4\uccb4\uacf5\ud559\uacfc", "\uc0b0\uc5c5\uacf5\ud559\uacfc", "\uc0dd\uba85\uacf5\ud559\uacfc", "\uc2e0\uc18c\uc7ac\uacf5\ud559\ubd80", "\uc5d0\ub108\uc9c0\uacf5\ud559\uacfc", "\uc6d0\uc790\ub825\uacf5\ud559\uacfc", "\uc720\uae30\ub098\ub178\uacf5\ud559\uacfc", "\uc735\ud569\uc804\uc790\uacf5\ud559\ubd80", "\uc790\uc6d0\ud658\uacbd\uacf5\ud559\uacfc", "\uc804\uae30\u00b7\uc0dd\uccb4\uacf5\ud559\ubd80", "\uc815\ubcf4\uc2dc\uc2a4\ud15c\ud559\uacfc", "\ucef4\ud4e8\ud130\uc18c\ud504\ud2b8\uc6e8\uc5b4\ud559\ubd80", "\ud654\ud559\uacf5\ud559\uacfc"],

      "\uae30\ud0c0": ["\uac04\ud638\ub300\ud559(\uac04\ud638\ud559\uacfc)", "\uc0b0\uc5c5\uc735\ud569\ud559\ubd80", "\uc758\uacfc\ub300\ud559(\uc758\uc608\uacfc)", "\ud55c\uc591\uc778\ud130\uce7c\ub9ac\uc9c0\ud559\ubd80"],

      "\uc0ac\ubc94/\uc0dd\ud65c/\uc74c\uc545/\uc608\uc220/\uad6d\uc81c\uacc4\uc5f4": ["\uad6d\uc81c\ub300\ud559(\uad6d\uc81c\ud559\ubd80)", "\uc0ac\ubc94\ub300\ud559(\uad50\uc721\ud559\uacfc, \uad50\uc721\uacf5\ud559\uacfc, \uad6d\uc5b4\uad50\uc721\uacfc, \uc601\uc5b4\uad50\uc721\uacfc, \uc218\ud559\uad50\uc721\uacfc, \uc751\uc6a9\ubbf8\uc220\uad50\uc721\uacfc)", "\uc0dd\ud65c\uacfc\ud559\ub300\ud559(\uc758\ub958\ud559\uacfc, \uc2dd\ud488\uc601\uc591\ud559\uacfc, \uc2e4\ub0b4\uac74\ucd95\ub514\uc790\uc778\ud559\uacfc)", "\uc608\uc220\uccb4\uc721\ub300\ud559(\uc2a4\ud3ec\uce20\uc0b0\uc5c5\uacfc\ud559\ubd80, \uc5f0\uadf9\uc601\ud654\ud559\uacfc, \ubb34\uc6a9\ud559\uacfc)", "\uc74c\uc545\ub300\ud559(\uc131\uc545\uacfc, \uc791\uace1\uacfc, \ud53c\uc544\ub178\uacfc, \uad00\ud604\uc545\uacfc, \uad6d\uc545\uacfc)"],

      "\uc778\ubb38\uacfc\ud559/\uc0ac\ud68c\uacfc\ud559\ub300\ud559": ["\uc0ac\ud68c\uacfc\ud559\ub300\ud559(\uc815\uce58\uc678\uad50\ud559\uacfc, \uc0ac\ud68c\ud559\uacfc, \ubbf8\ub514\uc5b4\ucee4\ubba4\ub2c8\ucf00\uc774\uc158\ud559\uacfc, \uad00\uad11\ud559\ubd80)", "\uc778\ubb38\uacfc\ud559\ub300\ud559(\uad6d\uc5b4\uad6d\ubb38\ud559\uacfc, \uc911\uc5b4\uc911\ubb38\ud559\uacfc, \uc601\uc5b4\uc601\ubb38\ud559\uacfc, \ub3c5\uc5b4\ub3c5\ubb38\ud559\uacfc, \uc0ac\ud559\uacfc, \ucca0\ud559\uacfc)"],

      "\uc790\uc5f0\uacfc\ud559/\uc815\ucc45/\uacbd\uae08/\uacbd\uc601\ub300\ud559": ["\uacbd\uc601\ub300\ud559(\uacbd\uc601\ud559\ubd80, \ud30c\uc774\ub0b8\uc2a4\uacbd\uc601\ud559\uacfc)", "\uacbd\uc81c\uae08\uc735\ub300\ud559(\uacbd\uc81c\uae08\uc735\ud559\ubd80)", "\uc790\uc5f0\uacfc\ud559\ub300\ud559(\uc218\ud559\uacfc, \ubb3c\ub9ac\ud559\uacfc, \ud654\ud559\uacfc, \uc0dd\uba85\uacfc\ud559\uacfc)", "\uc815\ucc45\uacfc\ud559\ub300\ud559(\uc815\ucc45\ud559\uacfc, \ud589\uc815\ud559\uacfc)"]

    },

    "\ud64d\uc775\ub300\ud559\uad50": {

      "\uac74\ucd95\ub3c4\uc2dc\ub300\ud559": ["\uac74\ucd95\ud559\ubd80 \uac74\ucd95\ud559\uc804\uacf5(5\ub144\uc81c)", "\uac74\ucd95\ud559\ubd80 \uc2e4\ub0b4\uac74\ucd95\ud559\uc804\uacf5", "\ub3c4\uc2dc\uacf5\ud559\uacfc"],

      "\uacbd\uc601\ub300\ud559": ["\uacbd\uc601\ud559\ubd80"],

      "\uacf5\uacfc\ub300\ud559": ["\uac74\uc124\ud658\uacbd\uacf5\ud559\uacfc", "\uae30\uacc4\u00b7\uc2dc\uc2a4\ud15c\ub514\uc790\uc778\uacf5\ud559\uacfc", "\uc0b0\uc5c5\u00b7\ub370\uc774\ud130\uacf5\ud559\uacfc", "\uc2e0\uc18c\uc7ac\u00b7\ud654\uacf5\uc2dc\uc2a4\ud15c\uacf5\ud559\ubd80", "\uc804\uc790\u00b7\uc804\uae30\uacf5\ud559\ubd80", "\ucef4\ud4e8\ud130\uacf5\ud559\uacfc"],

      "\ub3c5\ub9bd\ud559\ubd80": ["\uacbd\uc81c\ud559\ubd80"],

      "\ubb38\uacfc\ub300\ud559": ["\uad6d\uc5b4\uad6d\ubb38\ud559\uacfc", "\ub3c5\uc5b4\ub3c5\ubb38\ud559\uacfc", "\ubd88\uc5b4\ubd88\ubb38\ud559\uacfc", "\uc601\uc5b4\uc601\ubb38\ud559\uacfc"],

      "\ubbf8\uc220\ub300\ud559": ["\uc608\uc220\ud559\uacfc"],

      "\ubc95\uacfc\ub300\ud559": ["\ubc95\ud559\ubd80"],

      "\uc0ac\ubc94\ub300\ud559": ["\uad50\uc721\ud559\uacfc", "\uad6d\uc5b4\uad50\uc721\uacfc", "\uc218\ud559\uad50\uc721\uacfc", "\uc5ed\uc0ac\uad50\uc721\uacfc", "\uc601\uc5b4\uad50\uc721\uacfc"],

      "\uc11c\uc6b8\ucea0\ud37c\uc2a4 \uc735\ud569\uc804\uacf5": ["\uac74\ucd95\uacf5\uac04\uc608\uc220\uc804\uacf5", "\uacf5\uc5f0\uc608\uc220\uc804\uacf5", "\ub370\uc774\ud130\uc0ac\uc774\uc5b8\uc2a4\uc804\uacf5", "\ub514\uc790\uc778\uc5d4\uc9c0\ub2c8\uc5b4\ub9c1\uc804\uacf5", "\ubb38\ud654\uc608\uc220\uacbd\uc601\uc804\uacf5", "\uc0ac\ubb3c\uc778\ud130\ub137\uacf5\ud559\uc804\uacf5", "\uc2a4\ub9c8\ud2b8\ub3c4\uc2dc\u00b7\ub370\uc774\ud130\uc0ac\uc774\uc5b8\uc2a4\uc804\uacf5", "\uc758\ub8cc\ud5ec\uc2a4\ucf00\uc5b4AI\uc804\uacf5", "\uc9c0\ub2a5\u00b7\ub85c\ubd07\uacf5\ud559\uc804\uacf5", "\ud5ec\uc2a4\ucf00\uc5b4\uc11c\ube44\uc2a4\uc804\uacf5"],

      "\ucea0\ud37c\uc2a4\uc790\uc728\uc804\uacf5": ["\uc11c\uc6b8\ucea0\ud37c\uc2a4\uc790\uc728\uc804\uacf5(\uc778\ubb38\u00b7\uc608\ub2a5)", "\uc11c\uc6b8\ucea0\ud37c\uc2a4\uc790\uc728\uc804\uacf5(\uc790\uc5f0\u00b7\uc608\ub2a5)"]

    },

    "서울과학기술대학교": {

      "공과대학": ["건설시스템공학과", "건축학부(건축공학전공, 건축학전공)", "기계공학과", "기계시스템공학부(지능형로봇전공, 미래자동차전공)", "신소재공학과", "안전공학과", "자유전공학부(공과대학)"],

      "교양대학": ["ST자유전공학부"],

      "기술경영융합대학": ["MSDE학과", "경영학과(경영학전공)", "경영학과(글로벌테크노경영전공)", "산업공학과(ITM전공)", "산업공학과(산업정보시스템전공)", "자유전공학부(기술경영융합대학)"],

      "미래융합대학": ["건설환경융합공학과", "문화예술학과", "벤처경영학과", "영어과", "융합기계공학과", "자유전공학부(미래융합대학)", "정보통신융합공학과", "헬스피트니스학과"],

      "에너지바이오대학": ["바이오메디컬학과(신설)", "스포츠과학과", "식품생명공학과", "안경광학과", "자유전공학부(에너지바이오대학)", "정밀화학과", "화공생명공학과", "환경공학과"],

      "인문사회대학": ["문예창작학과", "영어영문학과", "자유전공학부(인문사회대학)", "행정학과"],

      "정보통신대학": ["스마트ICT융합공학과", "자유전공학부(정보통신대학)", "전기정보공학과", "전자공학과", "컴퓨터공학과"],

      "조형대학": ["금속공예디자인학과", "도예학과", "디자인학과(산업디자인전공, 시각디자인전공)", "조형예술학과"],

      "창의융합대학": ["미래에너지융합학과", "인공지능응용학과", "자유전공학부(창의융합대학)", "지능형반도체공학과"]

    },

    "한국교원대학교": {

      "제1대학 (유아·초등·특수 및 교육학 분야)": ["교육학과", "유아교육과", "초등교육과", "특수교육과"],

      "제2대학 (인문·사회 및 어문 교육 분야)": ["국어교육과", "독어교육과", "불어교육과", "역사교육과", "영어교육과", "윤리교육과", "일반사회교육과", "중국어교육과", "지리교육과"],

      "제3대학 (자연과학 및 공학·컴퓨터 교육 분야)": ["가정교육과", "기술교육과", "물리교육과", "생물교육과", "수학교육과", "지구과학교육과", "컴퓨터교육과", "화학교육과", "환경교육과"],

      "제4대학 (예체능 교육 분야)": ["미술교육과", "음악교육과", "체육교육과"]

    }
  };

  for (const uni of Object.keys(universityData)) {
    const option = document.createElement("option");
    option.value = uni; option.textContent = uni;
    universitySelect.appendChild(option);
  }

  // 1\ub2e8\uacc4: \ub300\ud559 \uc120\ud0dd \u2192 \uacc4\uc5f4 \ucc44\uc6b0\uae30
  universitySelect.addEventListener("change", () => {
    const selectedUni = universitySelect.value;
    const majorsData = universityData[selectedUni];
    categorySelect.innerHTML = "<option value='' disabled selected>\uacc4\uc5f4\uc744 \uc120\ud0dd\ud558\uc138\uc694</option>";
    majorSelect.innerHTML = "<option value='' disabled selected>\uc9c0\uc6d0 \ud559\uacfc\ub97c \uc120\ud0dd\ud558\uc138\uc694</option>";
    if (!majorsData) return;
    const categories = Object.keys(majorsData);
    if (categories.length === 1 && categories[0] === "\uac1c\uc124\ud559\uacfc") {
      const opt = document.createElement("option");
      opt.value = "\uac1c\uc124\ud559\uacfc"; opt.textContent = "\uc804\uccb4";
      categorySelect.appendChild(opt);
      categorySelect.value = "\uac1c\uc124\ud559\uacfc";
      majorsData["\uac1c\uc124\ud559\uacfc"].forEach(major => {
        const o = document.createElement("option");
        o.value = major; o.textContent = major;
        majorSelect.appendChild(o);
      });
    } else {
      categories.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat; opt.textContent = cat;
        categorySelect.appendChild(opt);
      });
    }
  });

  // 2\ub2e8\uacc4: \uacc4\uc5f4 \uc120\ud0dd \u2192 \ud559\uacfc \ucc44\uc6b0\uae30
  categorySelect.addEventListener("change", () => {
    const selectedUni = universitySelect.value;
    const selectedCat = categorySelect.value;
    const majorsData = universityData[selectedUni];
    majorSelect.innerHTML = `<option value='' disabled selected>${selectedCat === "개설학과" ? "전체 학과" : "지원 학과"}를 선택하세요</option>`;
    if (!majorsData || !majorsData[selectedCat]) return;
    majorsData[selectedCat].forEach(major => {
      const o = document.createElement("option");
      o.value = major; o.textContent = major;
      majorSelect.appendChild(o);
    });
  });

  // [신규] 학과 검색기 기능 초기화
  function initMajorSearch() {
    const searchInput = document.getElementById('major-search');
    const resultsPanel = document.getElementById('major-search-results');

    if (!searchInput || !resultsPanel) return;

    const allMajors = [];
    for (const [univ, categories] of Object.entries(universityData)) {
      for (const [cat, majors] of Object.entries(categories)) {
        majors.forEach(major => {
          allMajors.push({ univ, cat, major });
        });
      }
    }

    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim().toLowerCase();
      if (!query) {
        resultsPanel.innerHTML = '';
        resultsPanel.classList.add('hidden');
        return;
      }

      const results = allMajors.filter(item =>
        item.major.toLowerCase().includes(query) ||
        item.univ.toLowerCase().includes(query)
      ).sort((a, b) => {
        const aMajor = a.major.toLowerCase();
        const bMajor = b.major.toLowerCase();
        const aExact = aMajor === query;
        const bExact = bMajor === query;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        const aStarts = aMajor.startsWith(query);
        const bStarts = bMajor.startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return (String(aMajor) || "").localeCompare(String(bMajor) || "");
      }).slice(0, 15);

      if (results.length > 0) {
        resultsPanel.innerHTML = results.map(item => {
          const highlightedUniv = item.univ.replace(new RegExp(query, 'gi'), (match) => `<strong>${match}</strong>`);
          const highlightedMajor = item.major.replace(new RegExp(query, 'gi'), (match) => `<strong>${match}</strong>`);
          const catLabel = item.cat === "개설학과" ? "전체" : item.cat;
          return `
            <div class="search-result-item" data-univ="${item.univ}" data-cat="${item.cat}" data-major="${item.major}">
              <span class="univ-name">${highlightedUniv}</span>
              <span class="major-path">${catLabel} > ${highlightedMajor}</span>
            </div>
          `;
        }).join('');
        resultsPanel.classList.remove('hidden');
      } else {
        resultsPanel.innerHTML = '<div style="padding: 12px 16px; color: var(--text-secondary);">검색 결과가 없습니다.</div>';
        resultsPanel.classList.remove('hidden');
      }
    });

    resultsPanel.addEventListener('click', (e) => {
      const item = e.target.closest('.search-result-item');
      if (!item) return;
      const { univ, cat, major } = item.dataset;
      universitySelect.value = univ;
      universitySelect.dispatchEvent(new Event('change'));
      categorySelect.value = cat;
      categorySelect.dispatchEvent(new Event('change'));
      majorSelect.value = major;
      majorSelect.dispatchEvent(new Event('change'));
      searchInput.value = major;
      resultsPanel.classList.add('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !resultsPanel.contains(e.target)) {
        resultsPanel.classList.add('hidden');
      }
    });
  }
  initMajorSearch();

  if (excelUpload) {
    excelUpload.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async function (evt) {
        try {
          const workbook = XLSX.read(new Uint8Array(evt.target.result), { type: "array" });
          const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
          console.log("[excelUpload] Parsed jsonData from excel:", jsonData.slice(0, 10));
          if (!studentSelect) return;
          studentSelect.innerHTML = "<option value='' disabled selected>\ud559\uc0dd\uc744 \uc120\ud0dd\ud558\uc138\uc694</option>";
          students = [];
          let studentCount = 0;
          let headerRowIndex = -1;
          for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
            if (!jsonData[i]) continue;
            const rowStr = jsonData[i].join("").replace(/\s+/g, "");
            if (rowStr.includes("성명") || rowStr.includes("이름")) { headerRowIndex = i; break; }
          }
          if (headerRowIndex !== -1) {
            const headerRow = jsonData[headerRowIndex];
            const nameCol = headerRow.findIndex(c => c && (String(c).replace(/\s+/g, "").includes("성명") || String(c).replace(/\s+/g, "").includes("이름")));
            const gradeCol = headerRow.findIndex(c => c && String(c).replace(/\s+/g, "") === "\ud559\ub144");
            const classCol = headerRow.findIndex(c => c && String(c).replace(/\s+/g, "") === "\ubc18");
            const numCol = headerRow.findIndex(c => c && String(c).replace(/\s+/g, "").includes("\ubc88\ud638"));
            const hakbunCol = headerRow.findIndex(c => c && String(c).replace(/\s+/g, "").includes("\ud559\ubc88"));
            for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
              const row = jsonData[i];
              if (!row) continue;
              let sName = nameCol !== -1 ? String(row[nameCol] || "").trim() : "";
              if (!sName || sName === "undefined") continue;
              let sGrade = gradeCol !== -1 ? String(row[gradeCol] || "").replace(/[^0-9]/g, "") : "";
              let sClass = classCol !== -1 ? String(row[classCol] || "").replace(/[^0-9]/g, "") : "";
              let sNum = numCol !== -1 ? String(row[numCol] || "").replace(/[^0-9]/g, "") : "";
              if (hakbunCol !== -1 && row[hakbunCol]) {
                let hakbun = String(row[hakbunCol]).replace(/[^0-9]/g, "");
                if (hakbun.length >= 4) {
                  if (!sGrade) sGrade = hakbun.substring(0, 1);
                  if (!sClass) sClass = hakbun.substring(1, 3).replace(/^0+/, "");
                  if (!sNum) sNum = hakbun.substring(3).replace(/^0+/, "");
                }
              }
              const option = document.createElement("option");
              option.value = sName;
              option.dataset.grade = sGrade; option.dataset.class = sClass; option.dataset.number = sNum;
              let label = [];
              if (sGrade) label.push(sGrade + "\ud559\ub144");
              if (sClass) label.push(sClass + "\ubc18");
              if (sNum) label.push(sNum + "\ubc88");
              label.push(sName);
              option.textContent = label.join(" ");
              studentSelect.appendChild(option);
              students.push({ name: sName, grade: sGrade, class: sClass, number: sNum });
              studentCount++;
            }
          }
          if (studentCount > 0) {
            localStorage.setItem("individualStudentsData", JSON.stringify(students));
            await StorageManager.save("individualStudents", students); // redundant but safe
            alert("\ucd1d " + studentCount + "\uba85\uc758 \uc778\uc801\uc0ac\ud56d\uc774 \ubd88\ub7ec\uc640\uc84c\uc2b5\ub2c8\ub2e4. \uc544\ub798\uc5d0\uc11c \ud559\uc0dd\uc744 \uc120\ud0dd\ud558\uc138\uc694.");
            studentSelect.focus();
          } else {
            alert("\uc778\uc801\uc0ac\ud56d \ub370\uc774\ud130\ub97c \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uac70\ub098 \ud574\ub2f9 \ud615\uc2dd\uc744 \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.");
          }
        } catch (error) { console.error(error); alert("\ud30c\uc77c \uc77d\ub294 \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4."); }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  if (studentSelect) {
    studentSelect.addEventListener("change", () => {
      console.log("studentSelect change event triggered.");
      saveState();
      const selected = studentSelect.options[studentSelect.selectedIndex];
      if (!selected || selected.disabled) return;
      if (gradeInput) gradeInput.value = selected.dataset.grade || "";
      if (classInput) classInput.value = selected.dataset.class || "";
      if (numberInput) numberInput.value = selected.dataset.number || "";
      if (nameInput) nameInput.value = selected.value || "";
      const targetName = nameInput.value.trim();
      if (targetName) {
        // Clear course table first when changing students
        const tableContainer = document.getElementById("course-table-container");
        if (tableContainer) tableContainer.innerHTML = "";

        // Reset individual tab triggers
        ["ind-trigger-subject", "ind-trigger-creative", "ind-trigger-behavior"].forEach(id => {
          updateTriggerState(id, false);
        });

        if (globalCourseJson) extractCourseData(globalCourseJson, targetName);
        if (globalBatchJsons.length > 0) extractBatchData(globalBatchJsons, targetName);

        // 엑셀(수시진학관리)에서 추출된 '일반등급' 연동
        if (pfStudents.length > 0) {
          const matched = pfStudents.find(s => s.name === targetName);
          if (matched) {
            let displayGrades = [];
            if (matched.genGrade && matched.genGrade !== "-") displayGrades.push(matched.genGrade);
            if (matched.genGrade5 && matched.genGrade5 !== "-") displayGrades.push(matched.genGrade5 + "(5등급)");

            if (displayGrades.length > 0 && averageGradeInput) {
              averageGradeInput.value = displayGrades.join(" / ");
              console.log(`[Sync] Found genGrade for ${targetName}: ${averageGradeInput.value}`);
            }
          }
        }
      }
    });
  }

  if (courseExcelUpload) {
    courseExcelUpload.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async function (evt) {
        try {
          const workbook = XLSX.read(new Uint8Array(evt.target.result), { type: "array" });
          const allRows = [];
          for (const sheetName of workbook.SheetNames) {
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
            console.log("[courseExcelUpload] Sheet:", sheetName, "Rows:", rows.slice(0, 5));
            if (rows.length > 0) allRows.push(...rows);
          }
          globalCourseJson = allRows;
          await StorageManager.save("globalCourseJson", globalCourseJson);
          const targetName = nameInput ? nameInput.value.trim() : "";
          if (targetName) {
            extractCourseData(globalCourseJson, targetName);
          } else {
            alert("이수과목 파일이 불러와졌습니다. 먼저 학생을 선택하시면 이수과목이 자동 추출됩니다.");
          }
          saveState();
        } catch (error) {
          console.error("Course file read error:", error);
          alert("이수과목 파일 읽는 중 오류 발생:\n" + error.message + "\n\n파일 형식이 올바른지 확인해주세요.");
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  function extractCourseData(jsonData, targetName, silent = false) {
    const tgt = targetName.replace(/\s+/g, "");
    console.log(`[extractCourseData] Starting extraction for student: "${tgt}"`);

    // 헤더 행 탐색 (성명 셀 기준)
    let headerRowIdx = -1, nameCol = -1;
    let gradeYearCol = -1, termCol = -1;
    let subjectCol = -1, subjectCol2 = -1, creditCol = -1, gradeCol = -1, achieveCol = -1;

    for (let i = 0; i < Math.min(jsonData.length, 15); i++) {
      if (!jsonData[i]) continue;
      for (let j = 0; j < jsonData[i].length; j++) {
        const cell = String(jsonData[i][j] || "").replace(/\s+/g, "");
        if (cell === "성명" || cell === "이름") { nameCol = j; headerRowIdx = i; break; }
      }
      if (headerRowIdx !== -1) break;
    }

    if (headerRowIdx === -1) {
      console.error("[extractCourseData] Name column (성명/이름) not found in the first 15 rows.");
      if (!silent) alert("이수과목 파일에서 성명 열을 찾을 수 없습니다.");
      return;
    }

    // 헤더 행에서 컬럼 탐지
    const headerRow = jsonData[headerRowIdx] || [];
    for (let j = 0; j < headerRow.length; j++) {
      const cell = String(headerRow[j] || "").replace(/\s+/g, "");
      if (!cell) continue;
      if (gradeYearCol === -1 && (cell === "학년" || cell.includes("학년"))) gradeYearCol = j;
      if (termCol === -1 && (cell === "학기" || cell.includes("학기"))) termCol = j;

      //과목 컬럼: '과목', '교과목', '과목명' 등 포함
      if (subjectCol === -1 && (cell.includes("과목") || cell.includes("교과목"))) subjectCol = j;
      else if (subjectCol2 === -1 && (cell.includes("교과") || cell.includes("과목군") || cell.includes("교과군"))) subjectCol2 = j;

      //단위수 컬럼: '단위', '단위수', '이수단위' 등
      if (creditCol === -1 && (cell.includes("단위") || cell.includes("단위수"))) creditCol = j;

      //등급 컬럼: '등급', '석차등급', '성적' 등
      if (gradeCol === -1 && (cell.includes("등급") || cell.includes("석차등급") || cell === "성적")) gradeCol = j;

      //성취도 컬럼
      if (achieveCol === -1 && cell.includes("성취도")) achieveCol = j;
    }
    // 위치 기반 폴백
    if (subjectCol === -1 && headerRow.length >= 6) subjectCol = 5;
    if (creditCol === -1 && headerRow.length >= 7) creditCol = 6;
    if (gradeCol === -1 && headerRow.length >= 10) gradeCol = 9;

    const dataStartIndex = headerRowIdx + 1;
    const extractedCourses = [], achieveOnlyCourses = [];
    const courseDetails = []; // 상세 데이터 수집 (표 렌더링용)
    let totalWeightedSum = 0, totalCredits = 0, currentStudent = "";

    for (let i = dataStartIndex; i < jsonData.length; i++) {
      const row = jsonData[i]; if (!row) continue;
      const cn = String(row[nameCol] || "").replace(/\s+/g, "");
      if (cn) currentStudent = cn;
      if (!currentStudent || currentStudent !== tgt) continue;

      let subject = subjectCol !== -1 ? String(row[subjectCol] || "").trim() : "";
      if (!subject && subjectCol2 !== -1) subject = String(row[subjectCol2] || "").trim();
      if (!subject || subject === "undefined") continue;
      if (subject.includes("평균") || subject.includes("합계") || subject.includes("소계")) continue;
      if (subject === "계") continue;
      extractedCourses.push(subject);

      let credit = 0;
      if (creditCol !== -1 && row[creditCol] != null) {
        const cm = String(row[creditCol]).match(/\d+(\.\d+)?/);
        if (cm) credit = parseFloat(cm[0]);
      }
      if (credit <= 0) credit = 1;

      let gradeVal = NaN;
      let rawGrade = "";
      if (gradeCol !== -1 && row[gradeCol] != null) {
        rawGrade = String(row[gradeCol]).trim();
        const isP = /^[Pp]$/.test(rawGrade) || (rawGrade.toUpperCase().includes("P") && !/\d/.test(rawGrade));
        if (!isP) {
          const gm = rawGrade.match(/^(\d+)(\.\d+)?$/);
          if (gm) gradeVal = parseFloat(rawGrade);
        }
      }

      const achieve = achieveCol !== -1 ? String(row[achieveCol] || "").trim() : "";

      if (!isNaN(gradeVal) && gradeVal >= 1 && gradeVal <= 9) {
        totalWeightedSum += credit * gradeVal;
        totalCredits += credit;
        courseDetails.push({ subject, grade: gradeVal, credit, type: 'grade' });
      } else {
        if (achieve && achieve.toUpperCase() !== "P") {
          achieveOnlyCourses.push(subject + "(" + achieve + ")");
          courseDetails.push({ subject, grade: achieve, credit, type: 'achieve' });
        }
      }
    }

    // Update global subject list for reference in other tabs/extractions
    window.currentStudentSubjects = Array.from(new Set(extractedCourses));

    // 결과 반영
    const coursesInput = document.getElementById("courses");
    const agInput = document.getElementById("average-grade");
    const afInput = document.getElementById("average-formula");
    const aoInput = document.getElementById("achievement-only");

    if (extractedCourses.length > 0) {
      if (coursesInput) {
        coursesInput.value = courseDetails.map(c =>
          c.type === 'grade' ? `${c.subject}(${c.credit}단위): ${c.grade}등급` : `${c.subject}(${c.credit}단위): ${c.grade}`
        ).join(", ");
      }
      const avgLabel = totalCredits > 0
        ? "가중평균 " + (totalWeightedSum / totalCredits).toFixed(2) + "등급"
        : "등급 산출 불가";
      if (!silent) alert("'" + targetName + "' 학생의 이수과목 " + extractedCourses.length + "개 추출 완료. (" + avgLabel + ")");
    } else {
      if (coursesInput) coursesInput.value = "";
      if (aoInput) aoInput.value = "해당 없음";
      renderCourseTable([]); // Clear the table if no courses found
      if (!silent) alert("해당 파일에서 '" + targetName + "' 학생의 데이터를 찾을 수 없습니다.");
    }

    if (totalCredits > 0) {
      if (agInput) agInput.value = (totalWeightedSum / totalCredits).toFixed(2) + " 등급";
      if (afInput) afInput.value = "Σ(" + totalWeightedSum.toFixed(1) + ") / " + totalCredits + "단위";
    } else {
      if (agInput) agInput.value = "등급 없음";
      if (afInput) afInput.value = "성취도(A, B, C) 전용 과목 등으로 산출 불가";
    }

    if (aoInput) aoInput.value = achieveOnlyCourses.length > 0 ? achieveOnlyCourses.join(", ") : "해당 없음";

    // 표 렌더링 호출
    renderCourseTable(courseDetails);
  }

  /**
   * 이수 과목 상세 표를 렌더링합니다.
   */
  function renderCourseTable(details, containerId = "course-table-container") {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!details || details.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--text-secondary); background: rgba(255,255,255,0.05); border-radius: 12px; border: 1px dashed var(--panel-border);">
          <p>이수 과목 데이터를 찾을 수 없습니다.</p>
          <p style="font-size: 0.8rem; margin-top: 0.5rem;">과목명, 단위수, 등급 컬럼이 포함된 엑셀 파일을 업로드해주세요.</p>
        </div>
      `;
      return;
    }

    let html = `
      <table class="course-table">
        <thead>
          <tr>
            <th>과목명</th>
            <th>단위수</th>
            <th>등급/성취도</th>
          </tr>
        </thead>
        <tbody>
    `;

    details.forEach(item => {
      const badgeClass = item.type === 'grade' ? `badge-grade grade-${Math.floor(item.grade)}` : 'badge-achieve';
      html += `
        <tr>
          <td>${item.subject}</td>
          <td>${item.credit}</td>
          <td><span class="${badgeClass}">${item.grade}</span></td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;

    container.innerHTML = html;
  }


  function updateTriggerState(triggerId, hasData) {
    const trigger = document.getElementById(triggerId);
    if (!trigger) return;
    const statusText = trigger.querySelector(".status-text");
    if (hasData) {
      trigger.classList.add("active");
      if (statusText) statusText.innerText = "로드됨";
    } else {
      trigger.classList.remove("active");
      if (statusText) statusText.innerText = "미로드";
    }
  }

  if (batchExcelUpload) {
    batchExcelUpload.addEventListener("change", async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;
      globalBatchJsons = [];
      for (const file of files) {
        try {
          const buffer = await file.arrayBuffer();
          const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
          // \ubaa8\ub4e0 \uc2dc\ud2b8\uc758 \ub370\uc774\ud130\ub97c \ud1b5\ud569
          const allSheetData = [];
          for (const sheetName of workbook.SheetNames) {
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
            console.log("[courseExcelUpload] Sheet:", sheetName, "Rows:", rows.slice(0, 5));
            if (rows.length > 0) allSheetData.push(...rows);
          }
          globalBatchJsons.push({ fileName: file.name, jsonData: allSheetData });
        } catch (err) { console.error(err); }
      }
      await StorageManager.save("globalBatchJsons", globalBatchJsons);
      const targetName = nameInput ? nameInput.value.trim() : "";
      if (targetName) { extractBatchData(globalBatchJsons, targetName); }
      else { alert("\uc138\ubd80\ub2a5\ub825 \uae30\ub85d \ud30c\uc77c\uc774 \ubd88\ub7ec\uc640\uc84c\uc2b5\ub2c8\ub2e4. \ud559\uc0dd\uc744 \uc120\ud0dd\ud558\uc2dc\uba74 \uc790\ub3d9 \ucd94\ucd9c\ub429\ub2c8\ub2e4."); }
      saveState();
    });
  }

  function extractBatchData(jsonsArray, targetName) {
    if (!targetName) return;
    if (subjectInput) subjectInput.value = "";
    if (creativeInput) creativeInput.value = "";
    if (behaviorInput) behaviorInput.value = "";

    const tgt = targetName.replace(/\s+/g, "");

    for (const dataObj of jsonsArray) {
      const { fileName, jsonData } = dataObj;
      if (!jsonData || jsonData.length === 0) continue;

      // \u2500\u2500 \ud30c\uc77c\uba85\uc73c\ub85c \ucd08\uae30 \uc720\ud615 \ucd94\uc815 (\ucc3d\uccb4 \ud0a4\uc6cc\ub4dc \uc6b0\uc120) \u2500\u2500
      let fileTypeHint;
      if (fileName.includes("\ud589\ub3d9") || fileName.includes("\ud589\ud2b9") || fileName.includes("\uc885\ud569"))
        fileTypeHint = "behavior";
      else if (fileName.includes("\ucc3d\uccb4") || fileName.includes("\uc790\uc728") || fileName.includes("\ub3d9\uc544\ub9ac") ||
        fileName.includes("\ubd09\uc0ac") || fileName.includes("\uc9c4\ub85c"))
        fileTypeHint = "creative";
      else if (fileName.includes("\uad50\uacfc") || fileName.includes("\uc138\ud2b9") || fileName.includes("\uacfc\ubaa9"))
        fileTypeHint = "subject";
      else
        fileTypeHint = "creative"; // \uae30\ubcf8: \ucc3d\uccb4

      // \u2500\u2500 \ud5e4\ub354 \ud589 \ud0d0\uc0c9: '성명' / '이름' \uc140\uc774 \uc788\ub294 \ud589 \u2500\u2500
      let headerRowIdx = -1, nameCol = -1;
      for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
        if (!jsonData[i]) continue;
        for (let j = 0; j < jsonData[i].length; j++) {
          const ct = String(jsonData[i][j] || "").replace(/\s+/g, "");
          if (ct === "성명" || ct === "이름") { nameCol = j; headerRowIdx = i; break; }
        }
        if (headerRowIdx !== -1) break;
      }
      if (headerRowIdx === -1 || nameCol === -1) continue;

      const headerRow = jsonData[headerRowIdx] || [];
      const subRow = jsonData[headerRowIdx + 1] || []; // 2\ub2e8 \uc11c\ube0c\ud5e4\ub354 (\ucc3d\uccb4 \ub4f1)

      // \u2500\u2500 \uc11c\ube0c\ud5e4\ub354 \uc5ec\ubd80 \ud310\ub2e8 \u2500\u2500
      // \ub2e4\uc74c \ud589\uc5d0 \uc22b\uc790/\ud559\uc0dd\uba85\uc774 \uc5c6\uace0 \ud5e4\ub354 \ud0a4\uc6cc\ub4dc\uac00 \uc788\uc73c\uba74 \uc11c\ube0c\ud5e4\ub354\ub85c \uac04\uc8fc
      let dataStartIndex = headerRowIdx + 1;
      {
        const sub = subRow.map(c => String(c || "").replace(/\s+/g, ""));
        const hasKeyword = sub.some(c => c === "\uad6c\ubd84" || c === "\ud2b9\uae30\uc0ac\ud56d" || c === "\ud65c\ub3d9\ub0b4\uc6a9" || c === "\uc2dc\uac04");
        const hasStudentName = sub.some(c => c.length >= 2 && /[\uac00-\ud7a3]/.test(c) && ![
          "\uad6c\ubd84", "\ud2b9\uae30\uc0ac\ud56d", "\ud65c\ub3d9\ub0b4\uc6a9", "\uc2dc\uac04", "\ud559\uae30", "\ud559\ub144", "\ubc88\ud638"
        ].includes(c));
        if (hasKeyword && !hasStudentName) dataStartIndex = headerRowIdx + 2;
      }

      // \u2500\u2500 \ud5e4\ub354+\uc11c\ube0c\ud5e4\ub354\uc5d0\uc11c \uceec\ub7fc \uac10\uc9c0 \u2500\u2500
      let detectedType = fileTypeHint;
      let subjCol = -1, detailCol = -1, areaCol = -1, gradeYearCol = -1;

      const maxCols = Math.max(headerRow.length, subRow.length);
      for (let j = 0; j < maxCols; j++) {
        const h = String(headerRow[j] || "").replace(/\s+/g, "");
        const sub = String(subRow[j] || "").replace(/\s+/g, "");
        const combined = h + " " + sub;

        // \ud589\ud2b9 \ub0b4\uc6a9 \uac10\uc9c0
        if (combined.includes("\ud589\ub3d9\ud2b9\uc131") || combined.includes("\uc885\ud569\uc758\uacac")) {
          detectedType = "behavior"; if (detailCol === -1) detailCol = j;
        }
        // \uad50\uacfc \uacfc\ubaa9 \uceec\ub7fc
        if (detectedType !== "behavior" && (h === "\uad50\uacfc" || h === "\uacfc\ubaa9" || h === "\uacfc\ubaa9\uba85" || h === "\uad50\uacfc\ubaa9" || h === "\uad50\uacfc\ubaa9\uba85")) {
          detectedType = "subject"; subjCol = j;
        }
        // \uc138\ubd80\ub2a5\ub825
        if (detectedType !== "behavior" && combined.includes("\uc138\ubd80\ub2a5\ub825")) {
          detectedType = "subject"; if (detailCol === -1) detailCol = j;
        }
        // \ucc3d\uccb4 \uc601\uc5ed/\uad6c\ubd84 \u2014 '\uad6c\ubd84'\uc774\ub098 '\uc601\uc5ed'\uc774 \uc788\uc73c\uba74 behavior\uac00 \uc544\ub2cc \ud55c \uac15\uc81c creative
        if (h === "\uad6c\ubd84" || h === "\uc601\uc5ed" || h === "\ud65c\ub3d9\uc601\uc5ed" || sub === "\uad6c\ubd84" || h.includes("\ucc3d\uc758\uc801")) {
          if (detectedType !== "behavior") { detectedType = "creative"; areaCol = j; }
        }
        // \ud2b9\uae30\uc0ac\ud56d (\ubbf8\uc124\uc815 \uc2dc)
        if (detailCol === -1 && (h === "\ud2b9\uae30\uc0ac\ud56d" || sub === "\ud2b9\uae30\uc0ac\ud56d" || h.includes("\ud2b9\uae30\uc0ac\ud56d") || sub.includes("\ud2b9\uae30\uc0ac\ud56d"))) {
          detailCol = j;
        }
        // \ud65c\ub3d9\ub0b4\uc6a9
        if (detailCol === -1 && (h === "\ud65c\ub3d9\ub0b4\uc6a9" || sub === "\ud65c\ub3d9\ub0b4\uc6a9")) detailCol = j;
        // \ud559\uae30/\ud559\ub144 (\ud589\ud2b9)
        if ((h === "\ud559\uae30" || sub === "\ud559\uae30") && gradeYearCol === -1) gradeYearCol = j;
        if (h === "\ud559\ub144" && gradeYearCol === -1) gradeYearCol = j;
      }

      // \u2500\u2500 \ud3f4\ubc31: detailCol \uc5ec\uc804\ud788 -1\uc774\uba74 \ub370\uc774\ud130\uc5d0\uc11c \uac00\uc7a5 \uae34 \ud14d\uc2a4\ud2b8 \uceec\ub7fc \ucc3e\uae30 \u2500\u2500
      if (detailCol === -1) {
        for (let i = dataStartIndex; i < Math.min(jsonData.length, dataStartIndex + 5); i++) {
          const row = jsonData[i]; if (!row) continue;
          let maxLen = 0;
          for (let j = 0; j < row.length; j++) {
            const len = String(row[j] || "").length;
            if (len > maxLen) { maxLen = len; detailCol = j; }
          }
          if (detailCol !== -1) break;
        }
      }
      if (detailCol === -1) continue;

      // \u2500\u2500 \ub370\uc774\ud130 \ucd94\ucd9c: 성명 \uc788\uc73c\uba74 \uac31\uc2e0, \ube48 성명\uc774\uba74 \uc9c1\uc804 \ud559\uc0dd \uacc4\uc18d \uc0ac\uc6a9 \u2500\u2500
      let currentStudent = "";
      let extractedText = [];

      if (detectedType === "subject") {
        const sjMap = new Map();
        for (let i = dataStartIndex; i < jsonData.length; i++) {
          const row = jsonData[i]; if (!row) continue;
          const cn = String(row[nameCol] || "").replace(/\s+/g, "");
          if (cn) currentStudent = cn;
          if (!currentStudent || currentStudent !== tgt) continue;
          const subj = subjCol !== -1 ? String(row[subjCol] || "").trim() : "기타";
          const detail = String(row[detailCol] || "").trim();
          if (detail && detail.length > 2) {
            if (!sjMap.has(subj)) sjMap.set(subj, []);
            sjMap.get(subj).push(detail);
          }
        }
        const results = [];
        sjMap.forEach((details, subj) => {
          let combined = details.map(d => d.trim()).join(" ");
          // Apply reference splitting anyway for robustness
          if (window.currentStudentSubjects && window.currentStudentSubjects.length > 0) {
            const escapedSubjs = window.currentStudentSubjects.map(s => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
            const pattern = new RegExp(`(${escapedSubjs.join('|')})\\s*:`, 'g');
            combined = combined.replace(pattern, (match, p1, offset) => (offset === 0) ? match : "\n\n" + match);
          }
          results.push(subj !== "기타" ? subj + ": " + combined : combined);
        });
        if (results.length > 0) {
          subjectInput.value = subjectInput.value ? subjectInput.value + "\n\n" + results.join("\n\n") : results.join("\n\n");
        }

      } else if (detectedType === "creative") {
        const ag = { "자율": [], "동아리": [], "봉사": [], "진로": [], "기타": [] };
        for (let i = dataStartIndex; i < jsonData.length; i++) {
          const row = jsonData[i]; if (!row) continue;
          const cn = String(row[nameCol] || "").replace(/\s+/g, "");
          if (cn) currentStudent = cn;
          if (!currentStudent || currentStudent !== tgt) continue;
          const area = areaCol !== -1 ? String(row[areaCol] || "").trim() : "";
          const detail = String(row[detailCol] || "").trim();
          if (!detail || detail.length <= 2) continue;

          if (area.includes("자율")) ag["자율"].push(detail);
          else if (area.includes("동아리")) ag["동아리"].push(detail);
          else if (area.includes("봉사")) ag["봉사"].push(detail);
          else if (area.includes("진로")) ag["진로"].push(detail);
          else ag["기타"].push(detail);
        }
        let rt = [];
        if (ag["자율"].length > 0) rt.push("[자율]\n" + ag["자율"].map(d => d.trim()).join(" "));
        if (ag["동아리"].length > 0) rt.push("[동아리]\n" + ag["동아리"].map(d => d.trim()).join(" "));
        if (ag["봉사"].length > 0) rt.push("[봉사]\n" + ag["봉사"].map(d => d.trim()).join(" "));
        if (ag["진로"].length > 0) rt.push("[진로]\n" + ag["진로"].map(d => d.trim()).join(" "));
        if (ag["기타"].length > 0) rt.push(ag["기타"].map(d => d.trim()).join(" "));
        if (rt.length > 0)
          creativeInput.value = creativeInput.value
            ? creativeInput.value + "\n\n" + rt.join("\n\n")
            : rt.join("\n\n");

      } else { // behavior
        const gdMap = new Map();
        for (let i = dataStartIndex; i < jsonData.length; i++) {
          const row = jsonData[i]; if (!row) continue;
          const cn = String(row[nameCol] || "").replace(/\s+/g, "");
          if (cn) currentStudent = cn;
          if (!currentStudent || currentStudent !== tgt) continue;
          const gd = gradeYearCol !== -1 ? String(row[gradeYearCol] || "").trim() : "기타";
          const detail = String(row[detailCol] || "").trim();
          if (detail && detail.length > 2) {
            if (!gdMap.has(gd)) gdMap.set(gd, []);
            gdMap.get(gd).push(detail);
          }
        }
        const bRes = [];
        gdMap.forEach((details, gd) => {
          const combined = details.map(d => d.trim()).join(" ");
          bRes.push(gd !== "기타" ? `[${gd}학년]\n${combined}` : combined);
        });
        if (bRes.length > 0) {
          behaviorInput.value = behaviorInput.value ? behaviorInput.value + "\n\n" + bRes.join("\n\n") : bRes.join("\n\n");
        }
      }
    }

    // Update individual tab triggers
    updateTriggerState("ind-trigger-subject", !!(subjectInput && subjectInput.value));
    updateTriggerState("ind-trigger-creative", !!(creativeInput && creativeInput.value));
    updateTriggerState("ind-trigger-behavior", !!(behaviorInput && behaviorInput.value));
  }

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
    if (!formData.university || !formData.major || !formData.apiKey) { alert("API \ud0a4, \ubaa9\ud45c \ub300\ud559 \ubc0f \uc9c0\uc6d0 \ud559\uacfc\ub97c \ubaa8\ub450 \uc785\ub825\ud558\uc138\uc694."); return; }
    evalForm.classList.add("processing");
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = "<span class='spinner' style='width:20px;height:20px;border-width:2px;margin:0;'></span> \uc2ec\uce35 \ubd84\uc11d \uc911...";
    emptyState.classList.add("hidden");
    reportViewer.classList.add("hidden");
    loadingState.classList.remove("hidden");
    if (window.innerWidth <= 992) document.querySelector(".result-section").scrollIntoView({ behavior: "smooth" });
    try {
      const rawResponse = await generateAIReport(formData);
      console.log("Raw AI Response:", rawResponse); // \ub514\ubc84\uae45\uc6a9 \ub85c\uadf8 \ucd94\uac00

      let reportData;
      try {
        reportData = JSON.parse(cleanAIJsonResponse(rawResponse));
      } catch (parseError) {
        console.error("JSON Parsing Error:", parseError.message);
        console.log("Failed raw response:", rawResponse);
        throw new Error("AI \uc751\ub2f5 \ud615\uc2dd\uc774 \uc62c\ubc14\ub974\uc9c0 \uc54a\uac70\ub098 \ubd84\uc11d \ub0b4\uc6a9\uc774 \ub108\ubb34 \uae41\ub2c8\ub2e4. \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694. (\uc0c1\uc138: " + parseError.message + ")");
      }

      document.getElementById("overallScore").textContent = reportData.totalScore || 0;
      // overallEvaluation: 소제목(##) 앞 빈줄 강제 삽입 + ==강조== 변환 후 marked 렌더
      function applyEvalHighlight(text) {
        return (text || "")
          .replace(/\n?(##\s)/g, '\n\n$1')
          .replace(/==([^=]+)==/g, '<span class="eval-highlight">$1</span>');
      }
      const overallRaw = applyEvalHighlight(reportData.overallEvaluation);
      document.getElementById("overallText").innerHTML = marked.parse(overallRaw);


      document.getElementById("academicScore").textContent = reportData.competencies?.academic?.score || "-";
      document.getElementById("careerScore").textContent = reportData.competencies?.career?.score || "-";
      document.getElementById("communityScore").textContent = reportData.competencies?.community?.score || "-";

      // \uc0b0\ucd9c\uc2dd \ud45c\uc2dc (\uc120\ud0dd\uc0ac\ud56d: overallText \uc0c1\ub2e8\uc774\ub098 \ubcc4\ub3c4 \uacf5\uac04\uc5d0 \ucd94\uac00)
      if (reportData.calculationFormula) {
        const formulaDiv = document.createElement("div");
        formulaDiv.style.cssText = "font-size:0.85rem; color:var(--accent-primary); margin-bottom:15px; padding:10px; background:rgba(150,186,255,0.1); border-radius:6px; border-left:3px solid var(--accent-primary); line-height:1.4;";
        formulaDiv.innerHTML = "<strong>\ud83d\udcca \uc810\uc218 \uc0b0\ucd9c \ubc29\uc2dd:</strong><br>" + reportData.calculationFormula;
        const overallText = document.getElementById("overallText");
        overallText.prepend(formulaDiv);
      }
      // ── 대학별 서류평가 기준 패널 렌더링 ──
      renderUniCriteria(formData.university, document.getElementById("uniCriteriaPanel"));

      const bindModal = (btnId, title, compData) => {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        btn.onclick = () => {
          const evidenceText = Array.isArray(compData.evidence) ? compData.evidence.map(e => "- " + e).join("\n") : (compData.evidence || "\uadfc\uac70 \uc790\ub8cc\uac00 \uc5c6\uc2b5\ub2c8\ub2e4.");
          document.getElementById("modalTitle").textContent = title + " \uc0c1\uc138 \ubd84\uc11d";
          document.getElementById("modalBody").innerHTML =
            "<div style='background:rgba(255,255,255,0.05);padding:15px;border-radius:8px;margin-bottom:20px;border-left:4px solid var(--accent-primary)'>" +
            "<h4 style='margin-top:0;color:#96baff;margin-bottom:8px'>\ud3c9\uac00 \uc694\uc57d</h4>" + marked.parse(applyEvalHighlight(compData.evaluation) || "\ud3c9\uac00 \ub0b4\uc6a9\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.") + "</div>" +
            (compData.scoreJustification ?
              "<div style='background:rgba(150,186,255,0.08);padding:15px;border-radius:8px;margin-bottom:20px;border-left:4px solid var(--success-color)'>" +
              "<h4 style='margin-top:0;color:var(--success-color);margin-bottom:8px'>\uc810\uc218 \uc0b0\ucd9c \uadfc\uac70</h4>" + marked.parse(applyEvalHighlight(compData.scoreJustification)) + "</div>" : "") +
            "<div style='padding:0 5px'><h4 style='color:#96baff;margin-bottom:10px'>\uadfc\uac70 \ud65c\ub3d9 \uc790\ub8cc</h4>" + marked.parse(applyEvalHighlight(evidenceText)) + "</div>";
          document.getElementById("analysisModal").classList.remove("hidden");
        };
      };
      if (reportData.competencies) {
        bindModal("btnAca", "\ud559\uc5c5\uc5ed\ub7c9", reportData.competencies.academic || {});
        bindModal("btnCar", "\uc9c4\ub85c\uc5ed\ub7c9", reportData.competencies.career || {});
        bindModal("btnCom", "\uacf5\ub3d9\uccb4\uc5ed\ub7c9", reportData.competencies.community || {});
      }

      lastReportData = reportData; // \uc804\uc5ed \ubcc0\uc218\uc5d0 \uc800\uc7a5
      updatePrintArea(reportData);

      document.getElementById("modalCloseBtn").onclick = () => document.getElementById("analysisModal").classList.add("hidden");
      document.getElementById("analysisModal").onclick = (ev) => { if (ev.target === document.getElementById("analysisModal")) document.getElementById("analysisModal").classList.add("hidden"); };
      loadingState.classList.add("hidden");
      reportViewer.classList.add("hidden");
      document.getElementById("dashboardViewer").classList.remove("hidden");
    } catch (error) {
      console.error(error);
      const errBox = document.createElement("div");
      errBox.style.cssText = "color:var(--error-color);padding:20px;background:rgba(255, 71, 87, 0.05);border-radius:12px;border:1px solid rgba(255, 71, 87, 0.2);";
      errBox.innerHTML = `
        <h3 style="margin-top:0;display:flex;align-items:center;gap:8px;">
          <span style="font-size:1.4rem;">⚠️</span> 분석 중 오류가 발생했습니다
        </h3>
        <div style="white-space: pre-wrap; background:rgba(0,0,0,0.2); padding:15px; border-radius:8px; font-family:monospace; font-size:0.9rem; margin-bottom:15px; border:1px solid rgba(255,255,255,0.1); line-height:1.5;">${error.message}</div>
        <div style="display:flex;gap:10px;">
          <button type="button" onclick="navigator.clipboard.writeText(\`${error.message.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`).then(() => alert('오류 로그가 복사되었습니다.'))" 
            style="background:rgba(255,255,255,0.1);color:#fff;border:1px solid rgba(255,255,255,0.2);padding:8px 15px;border-radius:6px;cursor:pointer;font-size:0.85rem;">
            📋 오류 로그 복사하기
          </button>
          <a href="https://aistudio.google.com/app/apikey" target="_blank" 
            style="background:var(--accent-primary);color:#fff;text-decoration:none;padding:8px 15px;border-radius:6px;font-size:0.85rem;font-weight:600;">
            🔑 API 키 확인 (AI Studio)
          </a>
        </div>
      `;

      document.getElementById("dashboardViewer").classList.add("hidden");
      reportViewer.innerHTML = "";
      reportViewer.appendChild(errBox);
      reportViewer.classList.remove("hidden");
      loadingState.classList.add("hidden");
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = "<span class='btn-text'>\ub2e4\uc2dc \ubd84\uc11d\ud558\uae30</span><span class='btn-icon'>\u2726</span>";
      evalForm.classList.remove("processing");
    }
  });

  if (pfStudentSelect) {
    pfStudentSelect.addEventListener("change", () => {
      const idx = pfStudentSelect.value;
      if (idx === "" || !pfStudents[idx]) return;
      const s = pfStudents[idx];
      document.getElementById("pf-student-univ").value = s.univ;
      document.getElementById("pf-student-dept").value = s.dept;
      document.getElementById("pf-student-result").value = s.result;

      const genGradeInput = document.getElementById("pf-student-general-grade");
      if (genGradeInput) genGradeInput.value = s.genGrade || "-";
      const genGrade5Input = document.getElementById("pf-student-general-grade5");
      if (genGrade5Input) genGrade5Input.value = s.genGrade5 || "-";
      console.log("[PF] 학생 선택:", s.name, "| genGrade:", s.genGrade, "| genGrade5:", s.genGrade5);

      const detailsDiv = document.getElementById("pf-student-details");
      if (detailsDiv) detailsDiv.style.display = "block";

      const detailIds = ["pf-detail-grades", "pf-detail-subject", "pf-detail-career", "pf-detail-arts", "pf-detail-creative", "pf-detail-behavior"];
      detailIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "데이터를 불러오는 중...";
      });

      const pfTableContainer = document.getElementById("pf-course-table-container");
      if (pfTableContainer) pfTableContainer.innerHTML = "";

      updatePfStudentDetails(s.name);
    });
  }

  function setupPfFileUpload(id, key) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("change", async (e) => {
      const files = e.target.files;
      if (!files.length) return;
      // cumulative append mode
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = async (evt) => {
          try {
            console.log(`[PF] Loading ${file.name} into ${key}`);
            const wb = XLSX.read(new Uint8Array(evt.target.result), { type: "array" });
            let allData = [];
            wb.SheetNames.forEach(name => {
              const data = XLSX.utils.sheet_to_json(wb.Sheets[name]);
              allData = allData.concat(data);
              console.log(`[PF] Sheet "${name}" extracted ${data.length} rows.`);
            });
            pfDetails[key] = pfDetails[key].concat(allData);
            await StorageManager.save("pfDetails", pfDetails);
            if (pfStudentSelect.value !== "") {
              const s = pfStudents[pfStudentSelect.value];
              if (s) updatePfStudentDetails(s.name);
            }
          } catch (err) { console.error(err); }
        };
        reader.readAsArrayBuffer(file);
      });
    });
  }

  setupPfFileUpload("pf-upload-course", "grades");
  setupPfFileUpload("pf-upload-subject", "subjects");
  setupPfFileUpload("pf-upload-creative", "creatives");
  setupPfFileUpload("pf-upload-behavior", "behaviors");

  function updatePfStudentDetails(studentName) {
    console.log(`[PF] Updating details for: ${studentName}`);
    const getVal = (row, keys) => {
      if (!row) return "";
      const rowKeys = Object.keys(row);
      for (const k of keys) {
        if (row[k] !== undefined && row[k] !== null) return row[k];
        // Cleaned match for robustness
        const ck = k.replace(/\s/g, "");
        const match = rowKeys.find(rk => rk.replace(/\s/g, "") === ck);
        if (match && row[match] !== undefined && row[match] !== null) return row[match];
      }
      return "";
    };

    const nameKeys = ["성명", "이름"];
    const findRows = (arr, tag) => (arr || []).filter(row => {
      const val = getVal(row, nameKeys);
      if (val && String(val).trim().includes(studentName.trim())) {
        console.log(`[PF] Found match in ${tag}: ${val}`);
        return true;
      }
      // Fallback: search all values in the row for the name
      const matchAny = Object.values(row).some(v => String(v || "").trim().includes(studentName.trim()));
      if (matchAny) {
        console.log(`[PF] Found FALLBACK match in ${tag} for ${studentName}`);
        return true;
      }
      return false;
    });

    const gRows = findRows(pfDetails.grades, "Grades");
    const sRows = findRows(pfDetails.subjects, "Subjects");
    const cRows = findRows(pfDetails.creatives, "Creatives");
    const bRows = findRows(pfDetails.behaviors, "Behaviors");

    console.log(`[PF] Summary - Grades: ${gRows.length}, Subjects: ${sRows.length}, Creative: ${cRows.length}, Behavior: ${bRows.length}`);

    // Reset all triggers first
    ["pf-trigger-subject", "pf-trigger-career", "pf-trigger-arts", "pf-trigger-creative", "pf-trigger-behavior"].forEach(id => {
      updateTriggerState(id, false);
    });

    const pfCourseDetails = [];
    const gradeEl = document.getElementById("pf-detail-grades");
    if (gradeEl) {
      gradeEl.value = gRows.length ? gRows.map(r => {
        const sub = getVal(r, ["과목명", "교과목명", "과목"]);
        const grdRaw = getVal(r, ["석차등급(수강자수)", "성취도(수강자수)", "등급", "성취도", "석차등급"]);
        const creditRaw = getVal(r, ["단위수", "이수단위", "단위"]);

        // Extract only the part before '(' if it exists, e.g., '2' from '2(118)'
        const grd = String(grdRaw).split('(')[0].trim() || "-";
        const credit = parseFloat(String(creditRaw).match(/\d+(\.\d+)?/)?.[0] || "0") || 1;

        // Determine type for badge
        const isGrade = /^[1-9]$/.test(grd);
        pfCourseDetails.push({
          subject: sub || "과목미상",
          grade: grd,
          credit: credit,
          type: isGrade ? 'grade' : 'achieve'
        });

        return `${sub || "과목미상"}: ${grd}`;
      }).join(", ") : "데이터 없음";
    }
    renderCourseTable(pfCourseDetails, "pf-course-table-container");
    // Update global subject list for reference
    currentStudentSubjects = pfCourseDetails.map(d => d.subject).filter(s => s && s !== "과목미상");

    const subEl = document.getElementById("pf-detail-subject");
    if (subEl) {
      const sjMap = new Map();
      sRows.forEach(r => {
        const sj = getVal(r, ["과목명", "교과목명", "과목"]) || "기타";
        const dt = getVal(r, ["세부능력 및 특기사항", "특기사항"]);
        if (dt) {
          if (!sjMap.has(sj)) sjMap.set(sj, []);
          sjMap.get(sj).push(dt);
        }
      });
      const resArr = [];
      sjMap.forEach((details, subj) => {
        let combined = details.map(d => d.trim()).join(" ");
        if (window.currentStudentSubjects && window.currentStudentSubjects.length > 0) {
          const escapedSubjs = window.currentStudentSubjects.map(s => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
          const pattern = new RegExp(`(${escapedSubjs.join('|')})\\s*:`, 'g');
          combined = combined.replace(pattern, (m, p, o) => (o === 0) ? m : "\n\n" + m);
        }
        resArr.push(subj !== "기타" ? subj + ": " + combined : combined);
      });
      subEl.value = resArr.join("\n\n") || "데이터 없음";
      updateTriggerState("pf-trigger-subject", !!resArr.length);
    }

    const careerEl = document.getElementById("pf-detail-career");
    if (careerEl) {
      const cVal = sRows.length ? sRows.map(r => getVal(r, ["진로선택 세부능력 및 특기사항"])).filter(v => v).map(v => v.trim()).join("\n") : "";
      careerEl.value = cVal || "데이터 없음";
      updateTriggerState("pf-trigger-career", !!cVal);
    }

    const artsEl = document.getElementById("pf-detail-arts");
    if (artsEl) {
      const aVal = sRows.length ? sRows.map(r => getVal(r, ["음미체 세부능력 및 특기사항"])).filter(v => v).map(v => v.trim()).join(" ") : "";
      artsEl.value = aVal || "데이터 없음";
      updateTriggerState("pf-trigger-arts", !!aVal);
    }

    const creativeEl = document.getElementById("pf-detail-creative");
    if (creativeEl) {
      const creMap = new Map();
      if (cRows.length) {
        cRows.forEach(r => {
          const grade = getVal(r, ["학년"]) || "?";
          const area = getVal(r, ["영역"]);
          const detail = getVal(r, ["특기사항"]);
          if (area && detail) {
            const key = `[${grade}학년]-[${area}]`;
            if (!creMap.has(key)) creMap.set(key, []);
            creMap.get(key).push(detail);
          } else {
            const areas = ["자율활동", "동아리활동", "봉사활동", "진로활동"];
            areas.forEach(a => {
              const v = getVal(r, [a]);
              if (v) {
                const key = `[${grade}학년]-[${a}]`;
                if (!creMap.has(key)) creMap.set(key, []);
                creMap.get(key).push(v);
              }
            });
          }
        });
      }
      const cRes = [];
      creMap.forEach((details, key) => {
        cRes.push(key + "\n" + details.map(d => d.trim()).join(" "));
      });
      creativeEl.value = cRes.join("\n\n") || "데이터 없음";
      updateTriggerState("pf-trigger-creative", !!cRes.length);
    }

    const behaviorEl = document.getElementById("pf-detail-behavior");
    if (behaviorEl) {
      const behMap = new Map();
      if (bRows.length) {
        bRows.forEach(r => {
          const grade = getVal(r, ["학년"]) || "?";
          let detail = getVal(r, ["행동특성 및 종합의견", "특기사항", "의견", "내용", "종합의견"]);
          if (!detail) {
            const keys = Object.keys(r);
            const key = keys.find(k => k.includes("의견") || k.includes("행동"));
            if (key) detail = r[key];
          }
          if (!detail) {
            const vals = Object.values(r).filter(v => typeof v === 'string');
            vals.sort((a, b) => b.length - a.length);
            if (vals.length > 0 && vals[0].length > 20) detail = vals[0];
          }
          if (detail) {
            const key = `[${grade}학년]`;
            if (!behMap.has(key)) behMap.set(key, []);
            behMap.get(key).push(detail);
          }
        });
      }
      const bResArr = [];
      behMap.forEach((details, grade) => {
        bResArr.push(grade + "\n" + details.map(d => d.trim()).join(" "));
      });
      behaviorEl.value = bResArr.join("\n\n") || "데이터 없음";
      updateTriggerState("pf-trigger-behavior", !!bResArr.length);
    }
  }

  setupPfFileUpload("pf-upload-creative", "creatives");
  setupPfFileUpload("pf-upload-behavior", "behaviors");

  const passfailForm = document.getElementById("passfailForm");
  const pfAnalyzeBtn = document.getElementById("pf-analyzeBtn");
  const pfReportViewer = document.getElementById("pf-reportViewer");
  const pfLoadingState = document.getElementById("pf-loadingState");
  const pfEmptyState = document.getElementById("pf-emptyState");

  // PF Listener moved to top for stability

  // \ub300\ud559\ubcc4 \ud3c9\uac00 \uae30\uc900 (\uac00\uc774\ub4dc\ubd81 \uae30\ubc18)
  const universityEvalCriteria = {
    "\uc11c\uc6b8\ub300\ud559\uad50": {
      factors: `
[\uc11c\uc6b8\ub300\ud559\uad50 2026\ud559\ub144\ub3c4 \ud559\uc0dd\ubd80\uc885\ud569\uc804\ud615 \ud3c9\uac00 \uae30\uc900 \u2014 \uac00\uc774\ub4dc\ubd81 \ubc18\uc601]

\u25a0 \ud575\uc2ec \ud3c9\uac00 \uc694\uc18c 3\uac00\uc9c0 (\ube44\uc728 \ubbf8\uc9c0\uc815 \u2014 \uc815\uc131\uc801 \uc885\ud569\ud3c9\uac00)
1. \ud559\uc5c5\uc5ed\ub7c9: \uad50\uacfc \uc131\ucde8\ub3c4(\uc218\uac15\uc778\uc6d0\u00b7\uc131\uc801 \ucd94\uc774 \ud3ec\ud568 \uc815\uc131 \ud574\uc11d), \ub17c\ub9ac\uc801 \uc0ac\uace0\ub825, \ud0d0\uad6c \ud65c\ub3d9, \uc804\uacf5\uad00\ub828 \uacfc\ubaa9 \uc774\uc218\u00b7\uc131\ucde8 \uc218\uc900, \uc138\ud2b9 \ub0b4\uc6a9
2. \ud559\uc5c5\ud0dc\ub3c4: \uc790\uae30\uc8fc\ub3c4\uc801 \ud559\uc2b5, \ud0d0\uad6c \uc758\uc9c0, \ubc30\uc6c0 \uc5f4\uc758, \uc9c4\ub85c \ud0d0\uc0c9 \ub178\ub825, \uc218\uc5c5 \ucc38\uc5ec\ub3c4, \ub3c5\uc11c \uc5ed\ub7c9
3. \ud559\uc5c5 \uc678 \uc18c\uc591: \ub9ac\ub354\uc2ed, \ud611\uc5c5, \ucc45\uc784\uac10, \uc131\uc2e4\uc131\u00b7\ucd9c\uacb0, \ubd09\uc0ac\u00b7\ucc3d\uccb4 \ud65c\ub3d9, \ud589\ub3d9\ud2b9\uc131 \uc885\ud569\uc758\uacac

\u25a0 \ud3c9\uac00 \uc8fc\uc548\uc810
   1. \uc815\uc131\uc801 \uc885\ud569\ud3c9\uac00 (\uac00\uc911\uce58 \uc5c6\uc74c) \u2014 \ud55c \uc0ac\ub78c\uc758 \uc778\uaca9\uccb4\ub85c \uc885\ud569 \ud3c9\uac00
   2. \ub2e4\uc218 \ub2e4\ub2e8\uacc4 \ud3c9\uac00: \uc785\ud559\uc0ac\uc815\uad00 ~28\uba85 + \uad50\uc218 ~110\uba85
   3. \uace0\uad50 \ud658\uacbd \uace0\ub824: \ud559\uad50 \uaddc\ubaa8\u00b7\uad50\uacfc \uac1c\uc124 \ud604\ud669 \ub0b4 \ub178\ub825 \uc911\uc2ec
   4. \uad50\uacfc \uc774\uc218 \ucda9\uc2e4\ub3c4: \ud575\uc2ec \uad8c\uc7a5\uacfc\ubaa9\u00b7\uad8c\uc7a5\uacfc\ubaa9 \uc774\uc218 \uc5ec\ubd80 \uc911\uc694
   5. \uacb0\uacfc\ubcf4\ub2e4 \uacfc\uc815: \uc131\uc2e4\u00b7\uc8fc\ub3c4\uc801 \uad50\uc721\uacfc\uc815 \uc774\uc218 \uc5ec\ubd80\uac00 \ud575\uc2ec
   6. \ub3c4\uc804\uc801 \uacfc\ubaa9 \uc120\ud0dd \uae0d\uc815: \uc18c\uc218 \uc774\uc218\u00b7\uace0\ub09c\ub3c4 \uacfc\ubaa9 \ub0ae\uc740 \ub4f1\uae09\ub3c4 \ubd88\uc774\uc775 \uc5c6\uc74c

\u25a0 \uc804\ud615\ubcc4 \ube44\uc728: \uc9c0\uc5ed\uade0\ud615(\uc11c\ub95870%+\uba74\uc81130%) / \uc77c\ubc18(\uc11c\ub95850%+\uba74\uc811\u00b7\uad6c\uc22050%)
`,
      competencies: {
        academic: "\ud559\uc5c5\uc5ed\ub7c9(\uad50\uacfc \uc131\ucde8\ub3c4 \uc815\uc131\uc801 \ud574\uc11d\u00b7\uc218\uac15\uc778\uc6d0\u00b7\uc131\uc801 \ucd94\uc774) + \ud559\uc5c5\ud0dc\ub3c4(\uc790\uae30\uc8fc\ub3c4\ud559\uc2b5\u00b7\ud0d0\uad6c\uc758\uc9c0\u00b7\ub3c5\uc11c\uc5ed\ub7c9)",
        career: "\uc9c4\ub85c\uc5ed\ub7c9(\uc804\uacf5\uad00\ub828 \uacfc\ubaa9 \uc774\uc218\u00b7\uc131\ucde8\ub3c4\u00b7\uc138\ud2b9 \ub0b4 \uc9c4\ub85c \ud0d0\uc0c9\u00b7\ub3c4\uc804\uc801 \uacfc\ubaa9 \uc120\ud0dd)",
        community: "\ud559\uc5c5 \uc678 \uc18c\uc591(\ud488\uc131\u00b7\ub9ac\ub354\uc2ed\u00b7\ud611\uc5c5\u00b7\ucc45\uc784\uac10\u00b7\uc131\uc2e4\uc131\u00b7\ucd9c\uacb0\u00b7\ubd09\uc0ac\ud65c\ub3d9\u00b7\ud589\ub3d9\ud2b9\uc131)"
      },
      weights: { academic: 0.34, career: 0.33, community: 0.33 } // \uc815\uc131\ud3c9\uac00 (\uade0\ub4f1)
    },
    "\uc5f0\uc138\ub300\ud559\uad50": {
      factors: `
[\uc5f0\uc138\ub300\ud559\uad50 2026\ud559\ub144\ub3c4 \ud559\uc0dd\ubd80\uc885\ud569\uc804\ud615 \uc11c\ub958\ud3c9\uac00 \uae30\uc900]

\u25a0 \ubc18\uc601 \ube44\uc728: \uc885\ud569\ud3c9\uac00 \u2160(70%) = \ud559\uc5c5\uc5ed\ub7c9+\uc9c4\ub85c\uc5ed\ub7c9 / \uc885\ud569\ud3c9\uac00 \u2161(30%) = \uacf5\ub3d9\uccb4\uc5ed\ub7c9

\u25a0 \ud559\uc5c5\uc5ed\ub7c9(\u2160): \ud559\uc5c5\uc131\ucde8\ub3c4(\uc131\uc801 \ubcc0\ud654 \ucd94\uc774 \uc911\uc2dc), \ud559\uc5c5\ud0dc\ub3c4(\uc790\uae30\uc8fc\ub3c4\u00b7\ubaa9\ud45c\uc758\uc2dd), \ud0d0\uad6c\ub825(\uc9c0\uc801 \ud638\uae30\uc2ec\u00b7\ubb38\uc81c\ud574\uacb0)
\u25a0 \uc9c4\ub85c\uc5ed\ub7c9(\u2160): \uc804\uacf5\uad00\ub828 \uad50\uacfc \uc704\uacc4\uc801 \uc774\uc218, \uc804\uacf5\uad00\ub828 \uc131\ucde8\ub3c4, \uc9c4\ub85c\ud0d0\uc0c9 \ud65c\ub3d9\uacbd\ud5d8(\uc9c1\uc811\uad00\ub828 \uc544\ub2c8\uc5b4\ub3c4 \uacfc\uc815 \uc911\uc2dc)
\u25a0 \uacf5\ub3d9\uccb4\uc5ed\ub7c9(\u2161, 30%): \ud611\uc5c5\u00b7\uc18c\ud1b5, \ub098\ub214\u00b7\ubc30\ub824, \uc131\uc2e4\uc131\u00b7\uaddc\uce59\uc900\uc218, \ub9ac\ub354\uc2ed, \ud559\uc5c5\u00b7\uc9c4\ub85c \uacfc\uc815 \ud611\ub825 \ud65c\ub3d9 \ud3ec\ud568

\u25a0 \uacc4\uc5f4\ubcc4 \uad8c\uc7a5 \uacfc\ubaa9: \uc218\ud559/\ucef4\ud4e8\ud130(\ubbf8\uc801\ubd84\u00b7\uae30\ud558\u00b7AI\uc218\ud559), \ubb3c\ub9ac/\uae30\uacc4(\ubb3c\ub9ac\u2160\u00b7\u2161\u00b7\ud654\ud559), \uc0dd\uba85/\uc758\uc57d(\ud654\ud559\u00b7\uc0dd\uba85\uacfc\ud559\u2160\u00b7\u2161), \uacbd\uc601/\uacbd\uc81c(\ud1b5\uacc4\u00b7\uc218\ud559), \uc778\ubb38/\uc0ac\ud68c(\ub3c5\uc11c\u00b7\ub17c\ub9ac\u00b7\ud1a0\ub860)
\u25a0 \ud3c9\uac00 \uc8fc\uc548\uc810: \uc815\uc131\ud3c9\uac00, \ub2e4\uac01\uc801 \uc801\uc6a9, \uc77c\uad00\uc131\u00b7\uc9c4\uc815\uc131, \uace0\uad50 \ud658\uacbd \ub0b4 \ub178\ub825
`,
      competencies: {
        academic: "\ud559\uc5c5\uc5ed\ub7c9(\uc131\uc801 \ubcc0\ud654 \ucd94\uc774\u00b7\uc804\uacf5\uad00\ub828 \uc131\ucde8\u00b7\ud559\uc5c5\ud0dc\ub3c4\u00b7\ud0d0\uad6c\ub825) \u2014 \uc885\ud569\ud3c9\uac00 \u2160(70%)",
        career: "\uc9c4\ub85c\uc5ed\ub7c9(\uc804\uacf5\uad00\ub828 \uad50\uacfc \uc704\uacc4\uc801 \uc774\uc218\u00b7\uc131\ucde8\ub3c4\u00b7\uc9c4\ub85c\ud0d0\uc0c9\ud65c\ub3d9) \u2014 \uc885\ud569\ud3c9\uac00 \u2160(70%)",
        community: "\uacf5\ub3d9\uccb4\uc5ed\ub7c9(\ud611\uc5c5\u00b7\uc18c\ud1b5\u00b7\ub098\ub214\u00b7\ubc30\ub824\u00b7\uc131\uc2e4\uc131\u00b7\ub9ac\ub354\uc2ed) \u2014 \uc885\ud569\ud3c9\uac00 \u2161(30%)"
      },
      weights: { academic: 0.35, career: 0.35, community: 0.30 } // 70(\ud559+\uc9c4) / 30(\uacf5)
    },
    "\uace0\ub824\ub300\ud559\uad50": {
      factors: `
[\uace0\ub824\ub300\ud559\uad50 2026\ud559\ub144\ub3c4 \uc218\uc2dc \ud559\uc0dd\ubd80\uc885\ud569\uc804\ud615 \ud3c9\uac00 \uae30\uc900]

\u25a0 \uc804\ud615\ubcc4 \uc120\ubc1c: \ud559\uc5c5\uc6b0\uc218\uc804\ud615(\uc11c\ub958100%\u00b7\uc218\ub2a5\ucd5c\uc800\u6709) / \uacc4\uc5f4\uc801\ud569\uc804\ud615(\uc11c\ub958100%(5\ubc30)\u2192\uc11c\ub95850%+\uba74\uc81150%\u00b7\uc218\ub2a5\ucd5c\uc800\u7121)

\u25a0 \uc11c\ub958 \uc5ed\ub7c9 \ubc0f \ube44\uc728
   \ud559\uc5c5\uc5ed\ub7c9: \ud559\uc5c5\uc6b0\uc218 50% / \uacc4\uc5f4\uc801\ud569 40% \u2014 (\ud559\uc5c5\uc131\ucde8\ub3c4\u00b7\ud559\uc5c5\ud0dc\ub3c4\u00b7\ud0d0\uad6c\ub825)
   \uc790\uae30\uacc4\ubc1c\uc5ed\ub7c9: \ud559\uc5c5\uc6b0\uc218 30% / \uacc4\uc5f4\uc801\ud569 40% \u2014 (\uacc4\uc5f4\uad00\ub828\ud0d0\uc0c9\ub178\ub825\u00b7\uc804\uacf5\uad00\ub828\uc774\uc218\u00b7\uc9c4\ub85c\ud0d0\uc0c9\uacbd\ud5d8)
   \uacf5\ub3d9\uccb4\uc5ed\ub7c9: \uacf5\ud1b5 20% \u2014 (\ud611\uc5c5\u00b7\uc18c\ud1b5\u00b7\ub098\ub214\u00b7\ubc30\ub824\u00b7\uc131\uc2e4\uc131\u00b7\ub9ac\ub354\uc2ed)

\u25a0 \uad8c\uc7a5\uc774\uc218\uacfc\ubaa9: \ucef4\ud4e8\ud130(\uae30\ud558\u00b7\ubbf8\uc801\ubd84), \uc0dd\uba85/\uc2dd\ud488/\ud654\uacf5(\ud654\ud559\u00b7\uc0dd\uba85\uacfc\ud559\u2160\u00b7\u2161), \uacbd\uc601(\ubbf8\uc801\ubd84\u00b7\ud655\ub960\ud1b5\uacc4\u00b7\uacbd\uc81c), \uc815\uce58\uc678\uad50(\uc815\uce58\uc640\ubc95\u00b7\uacbd\uc81c\u00b7\uc0ac\ud68c\ubb38\ud654)
\u25a0 \ud3c9\uac00 \uc8fc\uc548\uc810: \uc815\uc131\uc801 \uc885\ud569\ud3c9\uac00, \uacc4\uc5f4 \uc801\ud569\uc131, \uacfc\ubaa9 \uc120\ud0dd\u00b7\uc774\uc218 \uacfc\uc815, \ub2e4\uac01\uc801 \uc885\ud569\ud3c9\uac00
`,
      competencies: {
        academic: "\ud559\uc5c5\uc5ed\ub7c9(\ud559\uc5c5\uc131\ucde8\ub3c4\u00b7\ud559\uc5c5\ud0dc\ub3c4\u00b7\ud0d0\uad6c\ub825) \u2014 \ud559\uc5c5\uc6b0\uc218 50%/\uacc4\uc5f4\uc801\ud569 40%",
        career: "\uc790\uae30\uacc4\ubc1c\uc5ed\ub7c9(\uacc4\uc5f4\uad00\ub828\ud0d0\uc0c9\u00b7\uc804\uacf5\uad00\ub828\uc774\uc218\u00b7\uc9c4\ub85c\ud0d0\uc0c9\uacbd\ud5d8) \u2014 \ud559\uc5c5\uc6b0\uc218 30%/\uacc4\uc5f4\uc801\ud569 40%",
        community: "\uacf5\ub3d9\uccb4\uc5ed\ub7c9(\ud611\uc5c5\u00b7\uc18c\ud1b5\u00b7\ub098\ub214\u00b7\ubc30\ub824\u00b7\uc131\uc2e4\uc131\u00b7\ub9ac\ub354\uc2ed) \u2014 \uacf5\ud1b5 20%"
      },
      weights: { academic: 0.50, career: 0.30, community: 0.20 } // \ud559\uc5c5\uc6b0\uc218 \uae30\uc900
    },
    "\uc11c\uac15\ub300\ud559\uad50": {
      factors: `
[\uc11c\uac15\ub300\ud559\uad50 2026\ud559\ub144\ub3c4 \ud559\uc0dd\ubd80\uc885\ud569\uc804\ud615 \uc11c\ub958\ud3c9\uac00 \uae30\uc900]

\u25a0 \uc804\ud615: \uc11c\ub958 100% / \uba74\uc811 \uc5c6\uc74c / \uc218\ub2a5\ucd5c\uc800 \uc5c6\uc74c / 1000\uc810 \ub9cc\uc810 \uc815\uc131\ud3c9\uac00

\u25a0 4\uac00\uc9c0 \uc5ed\ub7c9 \ubc0f \ube44\uc728
   \ud559\uc5c5\uc5ed\ub7c9 (40%): \ud559\uc5c5\uc131\ucde8\ub3c4, \ud0d0\uad6c\ub2a5\ub825, \uc735\ud569\ub2a5\ub825
   \ucc3d\uc758\uc801 \ubb38\uc81c\ud574\uacb0\ub825 (10%): \ube44\ud310\uc801 \uc0ac\uace0, \uc801\uadf9\uc801 \ud0dc\ub3c4
   \uacf5\ub3d9\uccb4\uc5ed\ub7c9 (20%): \ub9ac\ub354\uc2ed, \uc18c\ud1b5\u00b7\ud611\uc5c5, \uaddc\uce59\uc900\uc218, \ub098\ub214\u00b7\ubc30\ub824
   \uc131\uc7a5\uac00\ub2a5\uc131 (30%): \uc790\uae30\uc8fc\ub3c4\uc131, \uad50\uacfc\uc774\uc218\uacfc\uc815, \uacbd\ud5d8 \uac1c\ubc29\uc131, \ubaa9\ud45c \uc9c0\uc18d\uc131

\u25a0 \uc11c\uac15\uac00\uce58 \ucca0\ud559: \uc804\uacf5\uc801\ud569\uc131\ubcf4\ub2e4 \uc131\uc7a5\uac00\ub2a5\uc131 \uc911\uc2dc, \ub2e4\uc591\ud55c \ubd84\uc57c \ud0d0\uad6c \uacbd\ud5d8 \uae0d\uc815, \ub2e4\uc804\uacf5 \uc81c\ub3c4 \uc5f0\uacc4
\u25a0 \uad8c\uc7a5\uacfc\ubaa9: \ubaa8\uc9d1\ub2e8\uc704\ubcc4 \uac15\uc81c \uc9c0\uc815 \uc5c6\uc74c \u2014 \uc8fc\ub3c4\uc801 \uacfc\ubaa9 \uc120\ud0dd\u00b7\uc2ec\ud654 \ud559\uc2b5 \uacfc\uc815 \uc790\uccb4\ub97c \ud3c9\uac00
\u25a0 \ud3c9\uac00 \uc8fc\uc548\uc810: \uacfc\uc815 \uc911\uc2ec, \uc815\uc131\uc801 \uc885\ud569\ud3c9\uac00, \uc131\uc7a5\uac00\ub2a5\uc131 \uac15\uc870 (\ud559\uc5c540%+\uc131\uc7a530%=70% \ud575\uc2ec)
`,
      competencies: {
        academic: "\ud559\uc5c5\uc5ed\ub7c9(\ud559\uc5c5\uc131\ucde8\ub3c4\u00b7\ud0d0\uad6c\ub2a5\ub825\u00b7\uc735\ud569\ub2a5\ub825) \u2014 40%",
        career: "\uc131\uc7a5\uac00\ub2a5\uc131(\uc790\uae30\uc8fc\ub3c4\uc131\u00b7\uad50\uacfc\uc774\uc218\uacfc\uc815\u00b7\uacbd\ud5d8\uac1c\ubc29\uc131\u00b7\ubaa9\ud45c\uc9c0\uc18d\uc131) + \ucc3d\uc758\uc801\ubb38\uc81c\ud574\uacb0\ub825 \u2014 \ud569\uc0b0 40%",
        community: "\uacf5\ub3d9\uccb4\uc5ed\ub7c9(\ub9ac\ub354\uc2ec\u00b7\uc18c\ud1b5\u00b7\ud611\uc5c5\u00b7\uaddc\uce59\uc900\uc218\u00b7\ub098\ub214\u00b7\ubc30\ub824) \u2014 20%"
      },
      weights: { academic: 0.40, career: 0.40, community: 0.20 }
    },
    "\ud55c\uc591\ub300\ud559\uad50": {
      factors: `
[\ud55c\uc591\ub300\ud559\uad50 2026\ud559\ub144\ub3c4 \ud559\uc0dd\ubd80\uc885\ud569\uc804\ud615 \ud3c9\uac00 \uae30\uc900 \u2014 \uac00\uc774\ub4dc\ubd81 \ubc18\uc601]

\u25a0 \uc804\ud615\ubcc4 \uc120\ubc1c
   \ucd94\ucc9c\ud615: \uc11c\ub958 100% (\ud559\uad50\uc7a5\ucd94\ucc9c\u00b7\uc218\ub2a5\ucd5c\uc800: \uad6d\u00b7\uc218\u00b7\uc601\u00b7\ud0d0 3\uac1c \ud569 7)
   \uc11c\ub958\ud615: \uc11c\ub958 100% (\uba74\uc811\u7121\u00b7\uc218\ub2a5\ucd5c\uc800\u7121)
   \uba74\uc811\ud615: 1\ub2e8\uacc4 \uc11c\ub958100%(7\ubc30) \u2192 2\ub2e8\uacc4 70%+\uba74\uc81130% (\uc218\ub2a5\ucd5c\uc800\u7121)
   \uc790\uc18c\uc11c \ubbf8\uc694\uad6c \u2014 \ud559\uc0dd\ubd80\ub9cc\uc73c\ub85c \uc804 \uacfc\uc815 \ud3c9\uac00

\u25a0 4\ub300 \uc5ed\ub7c9 (2026 \uac1c\ud3b8)
   \uae30\ucd08\ud559\uc5c5\uc5ed\ub7c9: \ud559\uc5c5\uc131\ucde8\ub3c4(\uc131\uc801 \ucd94\uc774\u00b7\uacfc\ubaa9\ubcc4 \uac15\uc810 \uc885\ud569), \uad50\uacfc\ubaa9 \uc774\uc218 \uc0c1\ud669
   \uc2ec\uce35\ud559\uc5c5\uc5ed\ub7c9: \ube44\ud310\uc801 \uc0ac\uace0(\ud569\ub9ac\uc801 \ubd84\uc11d), \ucc3d\uc758\uc801 \uc0ac\uace0(\uc735\ud569\uc801 \ud574\uacb0), \ud0d0\uad6c \ub2a5\ub825
   \uc9c4\ub85c\ud0d0\uad6c\uc5ed\ub7c9: \uacc4\uc5f4\uc801\ud569\uc131 \uc911\uc2ec (\ud2b9\uc815 \uc804\uacf5\uc774 \uc544\ub2cc \uacc4\uc5f4 \ucc28\uc6d0 \ud3c9\uac00), \uc790\uae30\uc8fc\ub3c4\uc801 \ud0d0\uc0c9\u00b7\uc900\ube44
   \uacf5\ub3d9\uccb4\uc5ed\ub7c9: \uc18c\ud1b5\u00b7\ud611\uc5c5, \ub098\ub214\u00b7\ubc30\ub824, \uc131\uc7a5\uc7a0\uc7ac\ub825 (\uacf5\uc2dd \uc9c1\ud568 \ubd88\ubb38)

\u25a0 \ud6a1\ub2e8\ubc1c\uad74\ud3c9\uac00: 1~3\ud559\ub144 \uc804\uccb4 \uae30\ub85d\uc744 \ud6a1\ub2e8\ud558\uba70 \uc5ed\ub7c9 \uadfc\uac70 \ubc1c\uad74
\u25a0 \uba74\uc811\ud615 \ubc29\uc2dd: \uacf5\uacfc\ub300\ud559(\uc81c\uc2dc\ubb38 \uae30\ubc18 \ube44\ub300\uba74 \ub179\ud654, \uc218\ub9ac\uacfc\ud559\u00b7\ub17c\ub9ac), \uc0ac\ubc94\ub300\ud559(\ud559\uc0dd\ubd80 \uae30\ubc18 \ub300\uba74)
\u25a0 \ud559\ud3ed \uae30\uc7ac \uc2dc 2026\ubd80\ud130 \uce58\uba85\uc801 \ubd88\uc774\uc775 (\uac10\uc810 \ub610\ub294 \ubd80\uc801\uaca9)

\u25a0 \ud3c9\uac00 \uc8fc\uc548\uc810
   1. \ud6a1\ub2e8\ubc1c\uad74: \uc804\uccb4 \uae30\ub85d\uc18d \uc5ed\ub7c9 \uadfc\uac70\ub97c \uc885\ud569 \ubc1c\uad74
   2. \uacc4\uc5f4\uc801\ud569\uc131: \uc804\uacf5\uc774 \uc544\ub2cc \uacc4\uc5f4 \ucc28\uc6d0\uc758 \uc900\ube44\ub3c4 \uc911\uc2dc
   3. \uc131\uc7a5 \uacfc\uc815\u00b7\ud0dc\ub3c4: \uc131\ucde8 \uc218\uc900\ubcf4\ub2e4 \uc9c0\uc801 \uc131\uc7a5 \ucd94\uc774\uc640 \ud559\uc5c5 \ud0dc\ub3c4
`,
      competencies: {
        academic: "\uae30\ucd08\ud559\uc5c5\uc5ed\ub7c9(\ud559\uc5c5\uc131\ucde8\ub3c4\u00b7\uc131\uc801 \ucd94\uc774\u00b7\uad50\uacfc\uc774\uc218\uc0c1\ud669) + \uc2ec\uce35\ud559\uc5c5\uc5ed\ub7c9(\ube44\ud310\uc801\u00b7\ucc3d\uc758\uc801 \uc0ac\uace0\u00b7\ud0d0\uad6c\ub2a5\ub825) \u2014 \ud6a1\ub2e8\ubc1c\uad74\ud3c9\uac00",
        career: "\uc9c4\ub85c\ud0d0\uad6c\uc5ed\ub7c9(\uacc4\uc5f4\uc801\ud569\uc131\u00b7\uc790\uae30\uc8fc\ub3c4 \uc9c4\ub85c\ud0d0\uc0c9\u00b7\uacc4\uc5f4\uad00\ub828 \uad50\uacfc\uc774\uc218\uacfc\uc815) \u2014 \uc804\uacf5\uc774 \uc544\ub2cc \uacc4\uc5f4 \ucc28\uc6d0 \ud3c9\uac00",
        community: "\uacf5\ub3d9\uccb4\uc5ed\ub7c9(\uc18c\ud1b5\u00b7\ud611\uc5c5\u00b7\ub098\ub214\u00b7\ubc30\ub824\u00b7\ub9ac\ub354\uc2ed\u00b7\uc131\uc7a5\uc7a0\uc7ac\ub825) \u2014 \uc9c1\ud568 \ubd88\ubb38"
      },
      weights: { academic: 0.40, career: 0.40, community: 0.20 } // \uc815\uc131\ud3c9\uac00 \uae30\ubc18 \ucd94\uc815\uce58
    },
    "\uc911\uc559\ub300\ud559\uad50": {
      factors: `
[\uc911\uc559\ub300\ud559\uad50 2026\ud559\ub144\ub3c4 \ud559\uc0dd\ubd80\uc885\ud569\uc804\ud615 \ud3c9\uac00 \uae30\uc900 \u2014 \uac00\uc774\ub4dc\ubd81 \ubc18\uc601]

\u25a0 \uc804\ud615 \uc885\ub958 \ubc0f \uc120\ubc1c \ubc29\uc2dd (\uc218\ub2a5\ucd5c\uc800 \uc5c6\uc74c \u2014 \uacf5\ud1b5)
   CAU\uc735\ud569\ud615\uc778\uc7ac (\uc758\ud559\ubd80 \uc81c\uc678): \uc11c\ub958 100% \uc77c\uad04 \uc120\ubc1c (\uba74\uc811 \uc5c6\uc74c)
   CAU\uc735\ud569\ud615\uc778\uc7ac (\uc758\ud559\ubd80): 1\ub2e8\uacc4 \uc11c\ub958100%(5\ubc30\uc218) \u2192 2\ub2e8\uacc4 \uc11c\ub95870%+\uba74\uc81130%
   CAU\ud0d0\uad6c\ud615\uc778\uc7ac (\uc11c\uc6b8\ucea0\ud37c\uc2a4): 1\ub2e8\uacc4 \uc11c\ub958100%(4~5\ubc30\uc218) \u2192 2\ub2e8\uacc4 \uc11c\ub95870%+\uba74\uc81130%
   CAU\ud0d0\uad6c\ud615\uc778\uc7ac (\ub2e4\ube48\uce58\ucea0\ud37c\uc2a4): \uc11c\ub958 100% \uc77c\uad04 \uc120\ubc1c

\u25a0 \ud3c9\uac00 \uc5ed\ub7c9 \ubc0f \uc804\ud615\ubcc4 \ube44\uc728 (3\uac00\uc9c0)

   1. \ud559\uc5c5\uc5ed\ub7c9 (\uc138\ubd80: \ud559\uc5c5\uc131\ucde8\ub3c4\u00b7\ud559\uc5c5\ud0dc\ub3c4\u00b7\ud0d0\uad6c\ub825)
      - CAU\uc735\ud569\ud615: 50% / CAU\ud0d0\uad6c\ud615: 40%
      - \uc911\uc559\ub300 \ud0d0\uad6c\ub825 \uc911\uc810: \ub2e8\uc21c \uc131\uc801\uc744 \ub118\uc5b4 \uc218\uc5c5 \uc911 \uc0dd\uae34 \uad81\uae08\uc99d\uc744 \uc2a4\uc2a4\ub85c \ud655\uc7a5\ud558\uc5ec \ud0d0\uad6c\ud55c \uacfc\uc815\uc744 \ub9e4\uc6b0 \ub192\uac8c \ud3c9\uac00

   2. \uc9c4\ub85c\uc5ed\ub7c9 (\uc138\ubd80: \uc804\uacf5\uad00\ub828\uad50\uacfc\uc774\uc218\ub178\ub825\u00b7\uc804\uacf5\uad00\ub828\uad50\uacfc\uc131\ucde8\ub3c4\u00b7\uc9c4\ub85c\ud0d0\uc0c9\ud65c\ub3d9\uacbd\ud5d8)
      - CAU\uc735\ud569\ud615: 30% / CAU\ud0d0\uad6c\ud615: 50%
      - \ud0d0\uad6c\ud615 \ud2b9\uc9d5: \ud2b9\uc815 \ubd84\uc57c\uc5d0 \uae4a\uc774 \uc788\ub294 \ud0d0\uad6c \uacbd\ud5d8 \ubc0f \uc804\uacf5 \uad00\ub828 \uad50\uacfc \uc774\uc218 \uc218\uc900\uc774 \ub192\uc740 \ud559\uc0dd\uc5d0 \uc720\ub9ac

   3. \uacf5\ub3d9\uccb4\uc5ed\ub7c9 (\uc138\ubd80: \ud611\uc5c5\u00b7\uc18c\ud1b5\ub2a5\ub825, \ub098\ub214\u00b7\ubc30\ub824, \uc131\uc2e4\uc131\u00b7\uaddc\uce59\uc900\uc218, \ub9ac\ub354\uc2ed)
      - CAU\uc735\ud569\ud615: 20% / CAU\ud0d0\uad6c\ud615: 10%

\u25a0 \uc804\ud615\ubcc4 \ud2b9\uc131
   - CAU\uc735\ud569\ud615: '\ud559\uc5c5\uc131\ucde8\ub3c4'\uc640 '\uc758\uc0ac\uc18c\ud1b5\ub2a5\ub825'\uc5d0 \ub354 \ud070 \ubb34\uac8c \u2192 \uad50\ub0b4 \ud65c\ub3d9\uc5d0 \uace0\ub974\uac8c \ucc38\uc5ec\ud558\uace0 \ud559\uc5c5 \uc131\ucde8\ub3c4\uac00 \uc6b0\uc218\ud55c \ubaa8\ubc94\uc0dd \uc720\ud615
   - CAU\ud0d0\uad6c\ud615: '\ud0d0\uad6c\ub825'\uacfc '\uc804\uacf5 \uad00\ub828 \uad50\uacfc \uc131\ucde8\ub3c4'\uc5d0 \ub354 \ud070 \ubb34\uac8c \u2192 \ud2b9\uc815 \ubd84\uc57c \uc2ec\uce35 \ud0d0\uad6c \uacbd\ud5d8\uc774 \uc788\ub294 \ud559\uc0dd

\u25a0 \uba74\uc811 \ud3c9\uac00 \ubc29\uc2dd (CAU\ud0d0\uad6c\ud615 \uc11c\uc6b8\u00b7\uc758\ud559\ubd80 \ud574\ub2f9)
   \ud615\uc2dd: \uc81c\ucd9c \uc11c\ub958(\ud559\uc0dd\ubd80) \uae30\ubc18 1:\ub2e4 \ube14\ub77c\uc778\ub4dc \uba74\uc811 (10\ubd84 \ub0b4\uc678)
   - CAU\ud0d0\uad6c\ud615: \ud559\uc5c5\uc900\ube44\ub3c4 60% + \uc804\uacf5\uacc4\uc5f4 \uc801\ud569\uc131 30% + \uc758\uc0ac\uc18c\ud1b5\u00b7\uc778\uc131 10% (\ud0d0\uad6c\uacfc\uc815 \uc2e4\uccb4 \ud655\uc778 \uc911\uc2ec)
   - CAU\uc735\ud569\ud615 \uc758\ud559\ubd80: \ud559\uc5c5\uc900\ube44\ub3c4 40% + \ud559\uad50\uc0dd\ud65c\ucda9\uc2e4\ub3c4 40% + \uc758\uc0ac\uc18c\ud1b5\u00b7\uc778\uc131 20%

\u25a0 \ubaa8\uc9d1\ub2e8\uc704\ubcc4 \uad8c\uc7a5 \uc774\uc218 \uacfc\ubaa9
   - \uc218\ud559/\ucef4\ud4e8\ud130/AI: \ubbf8\uc801\ubd84, \uae30\ud558 (\ud575\uc2ec), \ud655\ub960\uacfc \ud1b5\uacc4, \uc778\uacf5\uc9c0\ub2a5 \uc218\ud559 (\uad8c\uc7a5)
   - \uc804\uae30\uc804\uc790/\uae30\uacc4: \ubbf8\uc801\ubd84, \uae30\ud558, \ubb3c\ub9ac\ud559\u2160\u00b7\u2161 (\ud575\uc2ec), \ud654\ud559\u2160\u00b7\u2161 (\uad8c\uc7a5)
   - \ud654\ud559/\uc2e0\uc18c\uc7ac: \ubbf8\uc801\ubd84, \ud654\ud559\u2160\u00b7\u2161 (\ud575\uc2ec), \uae30\ud558, \ubb3c\ub9ac\ud559\u2160 (\uad8c\uc7a5)
   - \uc758\ud559\ubd80: \uc0dd\uba85\uacfc\ud559\u2160\u00b7\u2161, \ud654\ud559\u2160\u00b7\u2161 (\ud575\uc2ec), \ubbf8\uc801\ubd84, \uae30\ud558 (\uad8c\uc7a5)
   - \uc57d\ud559\ubd80: \ud654\ud559\u2160\u00b7\u2161, \uc0dd\uba85\uacfc\ud559\u2160\u00b7\u2161 (\ud575\uc2ec), \uae30\ud558, \uc218\ud559\uacfc\uc81c\ud0d0\uad6c (\uad8c\uc7a5)
   - \uc778\ubb38\uacc4\uc5f4: \uc804\uacf5 \uc5f0\uacc4 \uc0ac\ud68c \uacfc\ubaa9(\uacbd\uc81c\u00b7\uc724\ub9ac\u00b7\uc815\uce58 \ub4f1) + \uad6d\uc5b4\u00b7\uc601\uc5b4 \uae30\ucd08\ud559\uc5c5\ub2a5\ub825

\u25a0 \ud3c9\uac00 \uc8fc\uc548\uc810
   1. \uc804\ud615 \uc120\ud0dd \uc804\ub7b5: \uc9c0\uc6d0 \uc804\ud615(\uc735\ud569\ud615 vs \ud0d0\uad6c\ud615)\uc5d0 \ub530\ub77c \ud559\uc5c5\uc5ed\ub7c9(50%/40%) vs \uc9c4\ub85c\uc5ed\ub7c9(30%/50%) \ube44\uc911\uc774 \ud06c\uac8c \ub2ec\ub77c\uc9d0
   2. \ud0d0\uad6c\ub825 \ud575\uc2ec: \uc131\uc801 \uc774\uc0c1\uc758 \uc2ec\ud654 \ud0d0\uad6c \uacfc\uc815\uacfc \uc9c0\uc801 \ud655\uc7a5\uc744 \ub9e4\uc6b0 \uc911\uc694\ud558\uac8c \ud3c9\uac00
   3. \uc218\ub2a5\ucd5c\uc800 \uc5c6\uc74c: \ud559\uc0dd\ubd80\uc758 '\uc9c8\uc801 \uad00\ub9ac'\uac00 \ud575\uc2ec, \ud2b9\ud788 \ud0d0\uad6c\ud615\uc740 \uc804\uacf5 \ud0d0\uad6c \uae4a\uc774 \uc99d\uba85\uc774 \ud544\uc218
   4. \ud559\ud3ed \ubc18\uc601: 2026\ud559\ub144\ub3c4\ubd80\ud130 \ud559\uad50\ud3ed\ub825 \uae30\uc7ac \uc0ac\ud56d\uc774 \ud3c9\uac00\uc5d0 \ubd88\uc774\uc775
`,
      competencies: {
        academic: "\ud559\uc5c5\uc5ed\ub7c9(\ud559\uc5c5\uc131\ucde8\ub3c4\u00b7\ud559\uc5c5\ud0dc\ub3c4\u00b7\ud0d0\uad6c\ub825) \u2014 CAU\uc735\ud569\ud615 50%/CAU\ud0d0\uad6c\ud615 40%. \ud0d0\uad6c\ub825: \uc218\uc5c5 \uc911 \uad81\uae08\uc99d\uc744 \uc790\ubc1c\uc801\uc73c\ub85c \ud655\uc7a5\u00b7\uc2ec\ud654\ud55c \uacfc\uc815\uc744 \ub9e4\uc6b0 \ub192\uc774 \ud3c9\uac00",
        career: "\uc9c4\ub85c\uc5ed\ub7c9(\uc804\uacf5\uad00\ub828\uad50\uacfc \uc131\ucde8\ub3c4\u00b7\uc774\uc218\ub178\ub825\u00b7\uc9c4\ub85c\ud0d0\uc0c9) \u2014 CAU\uc735\ud569\ud615 30%/CAU\ud0d0\uad6c\ud615 50%. \ud0d0\uad6c\ud615\uc5d0\uc11c \ud2b9\uc815 \ubd84\uc57c \uc2ec\uce35 \ud0d0\uad6c \uacbd\ud5d8\uc744 \uac00\uc7a5 \uc911\uc2dc",
        community: "\uacf5\ub3d9\uccb4\uc5ed\ub7c9(\ud611\uc5c5\u00b7\uc18c\ud1b5\u00b7\ubc30\ub824\u00b7\uaddc\uce59\uc900\uc218\u00b7\ub9ac\ub354\uc2ed) \u2014 CAU\uc735\ud569\ud615 20%/CAU\ud0d0\uad6c\ud615 10%"
      },
      weights: { academic: 0.45, career: 0.40, community: 0.15 } // \ud3c9\uade0\uc801 \ucc38\uace0\uce58\ub85c \ubcd1\ud569 \ud45c\uae30
    },
    "\uacbd\ud76c\ub300\ud559\uad50": {
      factors: `
[\uacbd\ud76c\ub300\ud559\uad50 2026\ud559\ub144\ub3c4 \ud559\uc0dd\ubd80\uc885\ud569\uc804\ud615 \ud3c9\uac00 \uae30\uc900]

\u25a0 \uc804\ud615 \uc720\ud615 \ubc0f \uc120\ubc1c \ubc29\uc2dd
   \ub124\uc624\ub974\ub124\uc0c1\uc2a4 (\ub300\ud45c \ud559\uc0dd\ubd80\uc885\ud569\uc804\ud615):
     1\ub2e8\uacc4: \uc11c\ub958\ud3c9\uac00 100% (3\ubc30\uc218 \uc120\ubc1c)
     2\ub2e8\uacc4: 1\ub2e8\uacc4 \uc131\uc801 70% + \uba74\uc811\ud3c9\uac00 30%
     \uc218\ub2a5 \ucd5c\uc800\ud559\ub825\uae30\uc900 \uc5c6\uc74c

\u25a0 3\ub300 \ud3c9\uac00 \uc694\uc18c \ubc0f \ubc18\uc601 \ube44\uc728
   [\ub124\uc624\ub974\ub124\uc0c1\uc2a4\uc804\ud615 \uc11c\ub958\ud3c9\uac00]
     \ud559\uc5c5\uc5ed\ub7c9 30% : \uc9c4\ub85c\uc5ed\ub7c9 50% : \uacf5\ub3d9\uccb4\uc5ed\ub7c9 20%
     \u203b \uacbd\ud76c\ub300\ub294 \uc9c4\ub85c\uc5ed\ub7c9(50%)\uc744 \uac00\uc7a5 \uc911\uc694\ud558\uac8c \ud3c9\uac00\ud568 \u2014 \uc9c0\uc6d0 \uc804\uacf5 \uad00\ub828 \uad50\uacfc \uc774\uc218 \ub178\ub825\uacfc \ud0d0\uad6c \uacfc\uc815\uc774 \ud575\uc2ec

\u25a0 \uc5ed\ub7c9\ubcc4 \uc138\ubd80 \ud3c9\uac00 \ud56d\ubaa9
   1. \ud559\uc5c5\uc5ed\ub7c9 (30%)
      - \ud559\uc5c5\uc131\ucde8\ub3c4: \ub300\ud559 \uc218\ud559\uc5d0 \ud544\uc694\ud55c \uae30\ubcf8 \uad50\uacfc \ud559\uc5c5 \uc218\ud589 \ub2a5\ub825 \ud30c\uc545 (\uc815\uc131 \ud3c9\uac00)
      - \ud559\uc5c5\ud0dc\ub3c4: \uc2a4\uc2a4\ub85c \ubc30\uc6b0\ub824 \ud558\uace0 \uc131\ucde8\ud574 \ub0b4\ub824\ub294 \uc790\ubc1c\uc801 \uc758\uc9c0 (\uc218\uc5c5 \ub0b4 \uc9c0\uc801 \ud638\uae30\uc2ec \ubc1c\ud604)
      - \ud0d0\uad6c\ub825: \uad50\uacfc \uc218\uc5c5\uc5d0\uc11c \uc0dd\uae34 \uad81\uae08\uc99d\uc744 \ud655\uc7a5\ud558\uc5ec \uc2ec\ud654 \ud0d0\uad6c\ud55c \uacfc\uc815 \uae30\ub85d (\uc138\ud2b9 \uc911\uc2ec)

   2. \uc9c4\ub85c\uc5ed\ub7c9 (50% \u2014 \ucd5c\uc6b0\uc120 \ubc18\uc601)
      - \uc804\uacf5 \uad00\ub828 \uad50\uacfc \uc774\uc218 \ub178\ub825: \uac01 \ud559\uacfc\uc5d0\uc11c \uad8c\uc7a5\ud558\ub294 '\ud575\uc2ec \uc774\uc218 \uacfc\ubaa9'\uacfc '\uad8c\uc7a5 \uc774\uc218 \uacfc\ubaa9'\uc758 \uc774\uc218 \uc5ec\ubd80
      - \uc804\uacf5 \uad00\ub828 \uad50\uacfc \uc131\ucde8\ub3c4: \uc804\uacf5 \uad00\ub828 \uacfc\ubaa9\uc758 \ud559\uc5c5 \uc131\ucde8 \uc218\uc900
      - \uc9c4\ub85c \ud0d0\uc0c9 \ud65c\ub3d9\uacfc \uacbd\ud5d8: \uc9c0\uc6d0 \uc804\uacf5\uc5d0 \ub300\ud55c \uafb8\uc900\ud55c \uad00\uc2ec\uacfc \ud0d0\uc0c9 \uacfc\uc815\uc744 \ub3d9\uc544\ub9ac\u00b7\uc790\uc728\u00b7\uc9c4\ub85c\ud65c\ub3d9\uc5d0\uc11c \ud655\uc778

   3. \uacf5\ub3d9\uccb4\uc5ed\ub7c9 (20%)
      - \ud611\uc5c5\uacfc \uc18c\ud1b5 \ub2a5\ub825, \ub098\ub214\uacfc \ubc30\ub824, \uc131\uc2e4\uc131\uacfc \uaddc\uce59\uc900\uc218, \ub9ac\ub354\uc2ed
      - \uc77c\ubc29\uc801 \ub9ac\ub354\uc2ed\ubcf4\ub2e4 '\uc870\ub825\uc790(\ud314\ub85c\uc6cc\uc2ed)'\ub85c\uc11c \uacf5\ub3d9\uccb4\uc5d0 \uae30\uc5ec\ud55c \uacbd\ud5d8\ub3c4 \uae0d\uc815\uc801 \ud3c9\uac00

\u25a0 \uba74\uc811 \ud3c9\uac00 \uae30\uc900 (1\ub2e8\uacc4 \ud569\uaca9\uc790 \ub300\uc0c1 / \uba74\uc811 30%)
   \uc2dc\uac04 \ubc0f \ubc29\uc2dd: 10\ubd84 \ub0b4\uc678, \uba74\uc811\uad00 2\uc778 \ub300 \uc9c0\uc6d0\uc790 1\uc778\uc758 \ube14\ub77c\uc778\ub4dc \uac1c\ubcc4 \uba74\uc811
   \ud3c9\uac00 \uc694\uc18c: \uc778\uc131 (50%) + \uc804\uacf5\uc801\ud569\uc131 (50%)
   \ucd9c\uc81c \ubc29\ud5a5: \uacf5\ud1b5\uc9c8\ubb38 \uc5c6\uc774 100% \ud559\uc0dd\ubd80 \uae30\ubc18 \ud655\uc778 \uba74\uc811 (\uac00\uce58\uad00, \uc778\uc131, \uc804\uacf5 \uc9c0\uc2dd \ubc0f \ud0d0\uad6c \uacfc\uc815 \ub17c\ub9ac\uc801 \uc124\uba85 \ub2a5\ub825)
   \uc720\uc758\uc0ac\ud56d: \uc758\ud559\uacc4\uc5f4(\uc758\uc608/\uce58\uc758\uc608/\ud55c\uc758\uc608)\uc740 \ucd9c\uc81c\uc81c\uc2dc\ubb38 \uba74\uc811\uc774 \ucd94\uac00\ub418\uba70 \ucd1d 18\ubd84 \ub0b4\uc678 \uc9c4\ud589

\u25a0 \ud0c1\uc6d4\uc131(A) \ud310\ub2e8 \uae30\uc900
   - \ub2e8\uc77c \ud65c\ub3d9\uc758 \uacb0\uacfc\ubb3c\ubcf4\ub2e4 \uadf8 \uacfc\uc815\uc5d0\uc11c \ubcf4\uc5ec\uc900 '\uaf2c\ub9ac\ub97c \ubb34\ub294 \uc9c8\ubb38'\uacfc \uc2ec\uce35 \ud0d0\uad6c \uacfc\uc815
   - \uc138\ud2b9 \uae30\uc7ac \ub0b4\uc6a9\uc774 \ub2e4\ub978 \ud65c\ub3d9(\ub3c5\uc11c, \ub3d9\uc544\ub9ac \ub4f1)\uc73c\ub85c \ud655\uc7a5\u00b7\uc5f0\uacc4\ub418\ub294 \uc720\uae30\uc801 \uc2a4\ud1a0\ub9ac\ud154\ub9c1
   - \uc804\uacf5 \uad00\ub828 \ud575\uc2ec \uacfc\ubaa9(\uc608: \uacf5\uacfc\ub300\ud559\uc758 \ubbf8\uc801\ubd84/\ubb3c\ub9ac\ud559\u2161, \uc0c1\uacbd\uacc4\uc5f4\uc758 \ud655\ub960\uacfc \ud1b5\uacc4 \ub4f1)\uc744 \uc8fc\ub3c4\uc801\uc73c\ub85c \uc774\uc218\ud558\uace0 \uc6b0\uc218\ud55c \uc131\ucde8\ub97c \ubcf4\uc784

\u25a0 \uc9c0\uc5ed\uade0\ud615 \uad50\uacfc\uc885\ud569\ud3c9\uac00 \uc8fc\uc548\uc810
   - \uad50\uacfc\ud559\uc2b5\ubc1c\ub2ec\uc0c1\ud669(\uc131\uc801+\uc138\ud2b9)\ub9cc\uc744 \ub300\uc0c1\uc73c\ub85c \uc815\uc131 \ud3c9\uac00
   - \uc131\ucde8\ub3c4\ubfd0 \uc544\ub2c8\ub77c \uc138\ud2b9 \ub0b4 \ud559\uc5c5 \ud0dc\ub3c4\u00b7\ud0d0\uad6c \uacfc\uc815\u00b7\uc790\uae30\uc8fc\ub3c4\uc131\uc744 \ud568\uaed8 \ubc18\uc601

\u25a0 \ubaa8\uc9d1\ub2e8\uc704\ubcc4 \ud575\uc2ec\u00b7\uad8c\uc7a5 \uacfc\ubaa9 (\uc9c4\ub85c\uc5ed\ub7c9 \ud3c9\uac00\uc5d0 \uc9c1\uc811 \uc601\ud5a5)
   \uc218\ud559\u00b7\ubb3c\ub9ac\u00b7\ucef4\ud4e8\ud130 \uad00\ub828: \ubbf8\uc801\ubd84, \uae30\ud558 (\ud575\uc2ec), \ud655\ub960\uacfc \ud1b5\uacc4, AI\uc218\ud559 (\uad8c\uc7a5)
   \uc0dd\uba85\u00b7\ud654\ud559 \uad00\ub828: \ud654\ud559\u2160\u00b7\u2161, \uc0dd\uba85\uacfc\ud559\u2160\u00b7\u2161 (\ud575\uc2ec)
   \uc758\u00b7\ud55c\uc758\u00b7\uce58\uc758\uc608\uacfc: \uc0dd\uba85\uacfc\ud559\u2160\u00b7\u2161, \ud654\ud559\u2160\u00b7\u2161 (\ud575\uc2ec), \ubbf8\uc801\ubd84, \uae30\ud558 (\uad8c\uc7a5)
   \uc57d\ud559\uacfc: \ud654\ud559\u2160\u00b7\u2161, \uc0dd\uba85\uacfc\ud559\u2160\u00b7\u2161 (\ud575\uc2ec), \uae30\ud558, \uc218\ud559\uacfc\uc81c\ud0d0\uad6c (\uad8c\uc7a5)
   \uc778\ubb38\u00b7\uc0ac\ud68c\uacc4\uc5f4: \uc804\uacf5 \uc5f0\uacc4 \uc0ac\ud68c\uacfc\ubaa9(\uacbd\uc81c\u00b7\uc815\uce58\u00b7\uc724\ub9ac \ub4f1) + \uad6d\uc5b4\u00b7\uc601\uc5b4 \uae30\ucd08\ud559\uc5c5\uc5ed\ub7c9

\u25a0 \ud3c9\uac00 \uc8fc\uc548\uc810 (\uc885\ud569)
   1. \uc11c\ub958 \ud575\uc2ec \uade0\ud615: \ud559\uc5c5\uc5ed\ub7c9(40%)\uacfc \uc9c4\ub85c\uc5ed\ub7c9(40%)\uc774 \ub3d9\uc77c \ube44\uc911 \u2014 '\uc218\uc5c5 \uc18d \ud0d0\uad6c'\uac00 \ub450 \uc5ed\ub7c9\uc744 \ub3d9\uc2dc\uc5d0 \uc99d\uba85
   2. \ud0c1\uc6d4\uc131 \uae30\uc900: \uc131\uc801(\uacb0\uacfc)\ubcf4\ub2e4 \ub3d9\uae30-\uacfc\uc815-\uacb0\uacfc-\uc131\uc7a5\uc758 \ub0b4\ub7ec\ud2f0\ube0c\uc640 \uc138\ud2b9\uc758 \uc9c8\uc801 \uae4a\uc774
   3. \uba74\uc811 \uc804\uacf5\uc801\ud569\uc131 50%: \uc120\ud0dd\ud55c \uc804\uacf5\uc5d0 \ub300\ud55c \uad00\uc2ec\uacfc \uc774\ud574\ub97c \ub17c\ub9ac\uc801\uc73c\ub85c \uc124\uba85\ud560 \uc218 \uc788\uc5b4\uc57c \ud568
   4. \uc77c\uad00\uc131\uacfc \uc9c4\uc815\uc131: \ud2b9\uc815 \ubd84\uc57c\uc5d0 \ub300\ud55c \uc9c0\uc18d\uc801\uc774\uace0 \uc9c4\uc815\uc131 \uc788\ub294 \uad00\uc2ec \ud750\ub984\uc774 \uc911\uc694
   5. \uacfc\ubaa9 \uc120\ud0dd \uc804\ub7b5: \ud575\uc2ec\uacfc\ubaa9 \uc774\uc218 \uc5ec\ubd80\uac00 \uc9c4\ub85c\uc5ed\ub7c9 \uc810\uc218\uc5d0 \uc9c1\uc811\uc801\uc778 \uc601\ud5a5\uc744 \ubbf8\uce68
   6. \uad50\uacfc\uc885\ud569\ud3c9\uac00(\uc9c0\uc5ed\uade0\ud615): \uc138\ud2b9\uc758 \uc9c8\uc801 \ub0b4\uc6a9\uc774 \uc131\uc801 \uadf8 \uc790\uccb4\ub9cc\ud07c \uc911\uc694
`,
      competencies: {
        academic: "\ud559\uc5c5\uc5ed\ub7c9(\ud559\uc5c5\uc131\ucde8\ub3c4\u00b7\ud559\uc5c5\ud0dc\ub3c4\u00b7\ud0d0\uad6c\ub825) \u2014 40%. \ud0c1\uc6d4\uc131 \uae30\uc900: \uc218\uc5c5 \ub0b4 \uc9c0\uc801 \ud638\uae30\uc2ec\uc744 \uc790\uae30\uc8fc\ub3c4\ub85c \uc2ec\ud654\u00b7\ud655\uc7a5\ud55c \ud0d0\uad6c \uacfc\uc815('\ub3d9\uae30-\uacfc\uc815-\uacb0\uacfc-\uc131\uc7a5')\uacfc \uc138\ud2b9\uc758 \uc9c8\uc801 \uae4a\uc774",
        career: "\uc9c4\ub85c\uc5ed\ub7c9(\uc804\uacf5\uad00\ub828 \ud575\uc2ec\u00b7\uad8c\uc7a5\uacfc\ubaa9 \uc774\uc218 \uc5ec\ubd80\u00b7\uad50\uacfc \uc131\ucde8\ub3c4\u00b7\uc9c4\ub85c\ud0d0\uc0c9 \uc77c\uad00\uc131\uacfc \uc9c4\uc815\uc131) \u2014 40%. \uc9c0\uc6d0 \ud559\uacfc\uc758 \ud575\uc2ec\uacfc\ubaa9 \uc774\uc218\uac00 \uc9c4\ub85c\uc5ed\ub7c9 \uc810\uc218\uc5d0 \uacb0\uc815\uc801 \uc601\ud5a5",
        community: "\uacf5\ub3d9\uccb4\uc5ed\ub7c9(\ud611\uc5c5\u00b7\uc18c\ud1b5\u00b7\ub098\ub214\u00b7\ubc30\ub824\u00b7\uc131\uc2e4\uc131\u00b7\uaddc\uce59\uc900\uc218\u00b7\ub9ac\ub354\uc2ed) \u2014 20%. \uba74\uc811(\uc778\uc131 50%+\uc804\uacf5\uc801\ud569\uc131 50%): \uac00\uce58\uad00\u00b7\uc758\uc0ac\uc18c\ud1b5\u00b7\uc804\uacf5 \uc774\ud574 \ubc0f \ub17c\ub9ac\uc801 \uc0ac\uace0\ub825 \ud3c9\uac00"
      },
      weights: { academic: 0.40, career: 0.40, community: 0.20 }
    },
    "\ud55c\uad6d\uc678\uad6d\uc5b4\ub300\ud559\uad50": {
      factors: `
[\ud55c\uad6d\uc678\uad6d\uc5b4\ub300\ud559\uad50 2026\ud559\ub144\ub3c4 \ud559\uc0dd\ubd80\uc885\ud569\uc804\ud615 \ud3c9\uac00 \uae30\uc900 \u2014 \uac00\uc774\ub4dc\ubd81(\uba74\uc811\ud615\u00b7\uc11c\ub958\ud615) \ubc18\uc601]

\u25a0 \uc804\ud615\ubcc4 \uc120\ubc1c \ubc29\uc2dd
   \uba74\uc811\ud615 / SW\uc778\uc7ac\uc804\ud615:
     1\ub2e8\uacc4: \uc11c\ub958100% (3\ubc30\uc218 \uc120\ubc1c)
     2\ub2e8\uacc4: 1\ub2e8\uacc4 \uc131\uc801 50% + \uba74\uc811\ud3c9\uac00 50%
   \uc11c\ub958\ud615 / \uae30\ud68c\uade0\ud615\uc804\ud615:
     \uc77c\uad04\ud569\uc0b0: \uc11c\ub958100% (\uba74\uc811 \uc5c6\uc74c)
   \uc218\ub2a5 \ucd5c\uc800: \ud559\uc0dd\ubd80\uc885\ud569\uc804\ud615(\uba74\uc811\ud615\u00b7\uc11c\ub958\ud615) \ubaa8\ub450 \uc218\ub2a5 \ucd5c\uc800\ud559\ub825\uae30\uc900 \uc5c6\uc74c

\u25a0 \uc11c\ub958 \ud3c9\uac00 \uc5ed\ub7c9\ubcc4 \ubc18\uc601 \ube44\uc728 (\uc804\ud615\uc5d0 \ub530\ub77c \ub2ec\ub77c\uc9d0)
   [\uba74\uc811\ud615 / SW\uc778\uc7ac]
     \uc9c4\ub85c\uc5ed\ub7c9 50% > \ud559\uc5c5\uc5ed\ub7c9 30% > \uacf5\ub3d9\uccb4\uc5ed\ub7c9 20%
     \u2192 \uc9c4\ub85c\uc5ed\ub7c9 \uac00\uc911: \uc804\uacf5 \uad00\ub828 \ud0d0\uc0c9\uacfc \uacbd\ud5d8\uc774 \ud575\uc2ec\uc778 \ud559\uc0dd\uc5d0 \uc720\ub9ac
   [\uc11c\ub958\ud615 / \uae30\ud68c\uade0\ud615]
     \ud559\uc5c5\uc5ed\ub7c9 50% > \uc9c4\ub85c\uc5ed\ub7c9 30% > \uacf5\ub3d9\uccb4\uc5ed\ub7c9 20%
     \u2192 \ud559\uc5c5 \uc131\ucde8\uc640 \ud0d0\uad6c\ub825\uc774 \uac15\uc810\uc778 \ud559\uc0dd\uc5d0 \uc720\ub9ac

\u25a0 \uc11c\ub958 \ud3c9\uac00 3\uac00\uc9c0 \uc5ed\ub7c9 \uc138\ubd80 \ud56d\ubaa9 (\uc785\ud559\uc0ac\uc815\uad00 \uc815\uc131 \uc885\ud569\ud3c9\uac00)
   \ud559\uc5c5\uc5ed\ub7c9:
     - \ud559\uc5c5\uc131\ucde8\ub3c4: \uad50\uacfc \uc131\uc801 \ucd94\uc774 \ubc0f \uacfc\ubaa9\ubcc4 \uc131\ucde8 \uc218\uc900
     - \ud559\uc5c5\ud0dc\ub3c4: \ud559\uc5c5\uc5d0 \ub300\ud55c \uc790\ubc1c\uc801 \uc758\uc9c0, \uc790\uae30\uc8fc\ub3c4\uc801 \ub178\ub825
     - \ud0d0\uad6c\ub825: \uc9c0\uc801 \ud638\uae30\uc2ec\uc744 \ubc14\ud0d5\uc73c\ub85c \uae4a\uc774 \uc788\uac8c \ud0d0\uad6c\ud558\uace0 \ubb38\uc81c\ub97c \ud574\uacb0\ud558\ub294 \ub2a5\ub825
   \uc9c4\ub85c\uc5ed\ub7c9:
     - \uc804\uacf5(\uacc4\uc5f4) \uad00\ub828 \uad50\uacfc \uc774\uc218 \ub178\ub825: \uc804\uacf5 \uad00\ub828 \uacfc\ubaa9 \uc120\ud0dd\uc758 \uc801\uc808\uc131 \ubc0f \uc774\uc218 \ub178\ub825
     - \uc804\uacf5(\uacc4\uc5f4) \uad00\ub828 \uad50\uacfc \uc131\ucde8\ub3c4: \uc804\uacf5 \uad00\ub828 \uacfc\ubaa9\uc758 \ud559\uc5c5 \uc131\ucde8 \uc218\uc900
     - \uc9c4\ub85c \ud0d0\uc0c9 \ud65c\ub3d9\uacfc \uacbd\ud5d8: \ub2e4\uc591\ud55c \ud65c\ub3d9\uc744 \ud1b5\ud55c \uc9c4\ub85c \ud0d0\uc0c9 \uacfc\uc815 \ubc0f \uacbd\ud5d8\uc758 \uae4a\uc774
   \uacf5\ub3d9\uccb4\uc5ed\ub7c9:
     - \ud611\uc5c5\uacfc \uc18c\ud1b5\ub2a5\ub825, \ub098\ub214\uacfc \ubc30\ub824, \uc131\uc2e4\uc131\uacfc \uaddc\uce59\uc900\uc218, \ub9ac\ub354\uc2ed

\u25a0 \uba74\uc811 \ud3c9\uac00 \uae30\uc900 (\uba74\uc811\ud615 2\ub2e8\uacc4 / 10\ubd84 \ub0b4\uc678 / \ud559\uc0dd\ubd80 \uae30\ubc18 2:1 \ube14\ub77c\uc778\ub4dc \uac1c\ubcc4\uba74\uc811)
   \ud559\uc5c5\uc5ed\ub7c9 (40%): \ud559\uc5c5 \uc131\ucde8\uc640 \ud0d0\uad6c\ub825\uc5d0 \ub300\ud55c \ub17c\ub9ac\uc801 \uc124\uba85 \ub2a5\ub825
   \uc9c4\ub85c\uc5ed\ub7c9 (40%): \uc804\uacf5\uc5d0 \ub300\ud55c \uad00\uc2ec\u00b7\uc774\ud574, \uc9c4\ub85c \ud0d0\uc0c9 \uacfc\uc815\uc758 \uc9c4\uc815\uc131 \ud655\uc778
   \uacf5\ub3d9\uccb4\uc5ed\ub7c9 (20%): \uc18c\ud1b5 \ub2a5\ub825, \ud611\uc5c5 \uacbd\ud5d8, \uc778\uc131\u00b7\ud0dc\ub3c4
   \u203b \uba74\uc811 \uc5b8\uc5b4: \uc804 \uacfc\uc815 \ud55c\uad6d\uc5b4\ub85c\ub9cc \uc9c4\ud589 (\uc678\uad6d\uc5b4 \ub2a5\ub825 \ud3c9\uac00 \uc544\ub2d8)
   \u203b \uacf5\ud1b5 \uc9c8\ubb38 \uc5c6\uc74c \u2014 \ud559\uc0dd\ubd80 \ub0b4\uc6a9 \uae30\ubc18 \uac1c\uc778\ubcc4 \ub9de\ucda4 \uc9c8\ubb38
   \u203b \uc8fc\uc548\uc810: \uc11c\ub958(\uc0dd\uae30\ubd80) \uc9c4\uc704 \ud655\uc778 + \ub17c\ub9ac\uc801 \uc0ac\uace0\ub825 + \uc18c\ud1b5 \ub2a5\ub825 + \uc804\uacf5 \uad00\uc2ec\ub3c4
   \u203b \uc8fc\uc548\uc810: \uc11c\ub958(\uc0dd\uae30\ubd80) \uc9c4\ud704 \ud655\uc778 + \ub17c\ub9ac\uc801 \uc0ac\uace0\ub825 + \uc18c\ud1b5 \ub2a5\ub825 + \uc804\uacf5 \uad00\uc2ec\ub3c4

\u25a0 \ud0c1\uc6d4\uc131 \ud310\ub2e8 \uae30\uc900 (\uc785\ud559\uc0ac\uc815\uad00 \uad00\uc810)
   - \uad50\uacfc \uac04 \uc9c0\uc2dd\uc758 \uc804\uc774(Transference): \ud55c \uacfc\ubaa9\uc5d0\uc11c \ubc30\uc6b4 \uac1c\ub150\uc744 \ub2e4\ub978 \uacfc\ubaa9\uc774\ub098 \ubd84\uc57c\uc5d0 \uc5f0\uacb0\u00b7\uc801\uc6a9
   - \uc790\uae30\uc8fc\ub3c4\uc801 \uc2ec\ud654 \ud0d0\uad6c: \uad50\uacfc\uc11c \ub0b4\uc6a9\uc744 \ub118\uc5b4 \uc2a4\uc2a4\ub85c \uc8fc\uc81c\ub97c \uc124\uc815\ud558\uace0 \uae4a\uc774 \uc788\uac8c \ud0d0\uad6c\ud558\ub294 \uacfc\uc815
   - \uc8fc\ub3c4\uc801 \ub9ac\ub354\uc2ed: \ub2e8\uccb4 \ud65c\ub3d9\uc5d0\uc11c \uac08\ub4f1 \ud574\uacb0\u00b7\ubaa9\ud45c \ub2ec\uc131\uc744 \uc704\ud574 \uc8fc\ub3c4\uc801 \uc5ed\ud560\uc744 \uc218\ud589\ud55c \uad6c\uccb4\uc801 \uacbd\ud5d8
   - \ud559\uc0dd\ubd80 \uc804\uccb4\ub97c \uc720\uae30\uc801\uc73c\ub85c \uc5f0\uacb0\ud558\uc5ec \uc77c\uad00\uc131\u00b7\uc9c4\uc815\uc131\uc744 \ud655\uc778

\u25a0 \uacc4\uc5f4\ubcc4 \uad8c\uc7a5 \uc774\uc218 \uacfc\ubaa9 (\uc804\uacf5\uac00\uc774\ub4dc\ubd81 \uae30\ubc18)
   \uc678\uad6d\uc5b4\uacc4\uc5f4 (\uc601\ubbf8\u00b7\uc720\ub7fd\u00b7\uc544\uc2dc\uc544\u00b7\uc911\ub3d9 \ub4f1): \uc601\uc5b4\u00b7\uad6d\uc5b4 \ud575\uc2ec \uc5ed\ub7c9, \uc81c2\uc678\uad6d\uc5b4 \uad00\ub828 \uacfc\ubaa9 \uc774\uc218
     \uad8c\uc7a5: \ub3c5\uc11c, \uc5b8\uc5b4\uc640 \ub9e4\uccb4, \ud604\ub300\ubb38\ud559, \uc601\uc5b4\uad8c \ubb38\ud654\u00b7\ubb38\ud559, \uc81c2\uc678\uad6d\uc5b4 \uc2ec\ud654
   \uc0ac\ud68c\u00b7\uad6d\uc81c\ud1b5\uc0c1\uacc4\uc5f4: \uc0ac\ud68c\u00b7\ubb38\ud654, \uc815\uce58\uc640 \ubc95, \uacbd\uc81c, \uc138\uacc4\uc9c0\ub9ac (\ud575\uc2ec), \uad6d\uc81c\uad00\uacc4 \uad00\ub828 \ud0d0\uad6c
   AI\u00b7\ub514\uc9c0\ud138 \uc735\ud569\uacc4\uc5f4 (Language&AI, AI\ub370\uc774\ud130\uc0ac\uc774\uc5b8\uc2a4, Finance&AI):
     \ubbf8\uc801\ubd84, \uae30\ud558, \ud655\ub960\uacfc \ud1b5\uacc4 (\ud575\uc2ec), \uc778\uacf5\uc9c0\ub2a5 \uc218\ud559, \uc815\ubcf4, \ub370\uc774\ud130 \uacfc\ud559 (\uad8c\uc7a5)
   \uc790\uc5f0\u00b7\ud1b5\uacc4\uacc4\uc5f4 (\uc218\ud559\u00b7\ud1b5\uacc4): \ubbf8\uc801\ubd84, \uae30\ud558, \ud655\ub960\uacfc \ud1b5\uacc4 (\ud575\uc2ec), \uc218\ud559\uacfc\uc81c\ud0d0\uad6c (\uad8c\uc7a5)
   \uacf5\ud1b5: \ub2e8\uc21c \uacfc\ubaa9 \uc774\uc218\ubcf4\ub2e4 \ud574\ub2f9 \uacfc\ubaa9\uc5d0\uc11c \uc218\ud589\ud55c \ud0d0\uad6c \ud65c\ub3d9\uc758 \uae4a\uc774\uc640 \uacfc\uc815\uc774 \uc911\uc694

\u25a0 \ud3c9\uac00 \uc8fc\uc548\uc810 (\uc885\ud569)
   1. \uc804\ud615 \uc120\ud0dd \uc804\ub7b5: \uc9c4\ub85c\uc5ed\ub7c9\uc774 \uac15\ud558\uba74 \uba74\uc811\ud615(\uc9c4\ub85c50%), \ud559\uc5c5\uc774 \uac15\ud558\uba74 \uc11c\ub958\ud615(\ud559\uc5c550%)\uc774 \uc720\ub9ac
   2. \uc9c4\ub85c \uc77c\uad00\uc131: \uc678\uad6d\uc5b4\u00b7\uad6d\uc81c\u00b7AI \ub4f1 \ud76c\ub9dd \ubd84\uc57c\uc5d0 \ub300\ud55c \uc9c0\uc18d\uc801\uc774\uace0 \uc77c\uad00\ub41c \uad00\uc2ec \ud750\ub984\uc774 \ud575\uc2ec
   3. \uc138\ud2b9\uc758 \uc9c8 vs \uc591: \uad50\uacfc \uac04 \uc5f0\uacb0(\uc9c0\uc2dd \uc804\uc774)\uacfc \uc790\ubc1c\uc801 \uc2ec\ud654 \ud0d0\uad6c \uacfc\uc815\uc774 \ud0c1\uc6d4\uc131\uc758 \uae30\uc900
   4. \uba74\uc811\ud615 \uc804\ub7b5: \uc11c\ub958\uc5d0\uc11c \uc9c4\ub85c\uc5ed\ub7c9(50%)\uc744 \uba3c\uc800 \ub192\uc774\uace0, \uba74\uc811\uc5d0\uc11c \uc0dd\uae30\ubd80 \ub0b4\uc6a9\uc744 \ub17c\ub9ac\uc801\uc73c\ub85c \uc124\uba85\u00b7\ud655\uc99d
   5. \uc218\ub2a5\ucd5c\uc800 \uc5c6\uc74c: \ud559\uc0dd\ubd80 \ucf58\ud150\uce20\uc758 \uc9c8\uc801 \uad00\ub9ac\uac00 \uc804\ub7b5\uc758 \uc804\ubd80
   6. \uacf5\ub3d9\uccb4\uc5ed\ub7c9: \ube44\uc728\uc740 20%\uc774\uc9c0\ub9cc \ub9ac\ub354\uc2ed \uacbd\ud5d8\uc774 \uba74\uc811\uc5d0\uc11c \uad6c\uccb4\uc801\uc778 \uc9c8\ubb38 \uc18c\uc7ac\ub85c \ud65c\uc6a9\ub428
`,
      competencies: {
        academic: "\ud559\uc5c5\uc5ed\ub7c9(\ud559\uc5c5\uc131\ucde8\ub3c4\u00b7\ud559\uc5c5\ud0dc\ub3c4\u00b7\ud0d0\uad6c\ub825) \u2014 \uba74\uc811\ud615 30%/\uc11c\ub958\ud615 50%. \ud0c1\uc6d4\uc131: \uad50\uacfc \uac04 \uc9c0\uc2dd \uc804\uc774, \uc790\uae30\uc8fc\ub3c4 \uc2ec\ud654 \ud0d0\uad6c \uacfc\uc815\uc774 \ud575\uc2ec \ud3c9\uac00 \uc9c0\ud45c",
        career: "\uc9c4\ub85c\uc5ed\ub7c9(\uc804\uacf5\uad00\ub828 \uad50\uacfc \uc774\uc218 \ub178\ub825\u00b7\uc131\ucde8\ub3c4\u00b7\uc9c4\ub85c\ud0d0\uc0c9 \ud65c\ub3d9\uacbd\ud5d8) \u2014 \uba74\uc811\ud615 50%/\uc11c\ub958\ud615 30%. \uc678\uad6d\uc5b4\u00b7AI\u00b7\uad6d\uc81c\ud1b5\uc0c1 \ubd84\uc57c\uc5d0 \ub300\ud55c \uc77c\uad00\ub41c \uad00\uc2ec\uacfc \ud0d0\uad6c \uc9c4\uc815\uc131\uc774 \uacb0\uc815\uc801",
        community: "\uacf5\ub3d9\uccb4\uc5ed\ub7c9(\ud611\uc5c5\u00b7\uc18c\ud1b5\u00b7\ub098\ub214\u00b7\ubc30\ub824\u00b7\uc131\uc2e4\uc131\u00b7\ub9ac\ub354\uc2ed) \u2014 \uacf5\ud1b5 20%. \uba74\uc811(\ud559\uc5c540%+\uc9c4\ub85c40%+\uacf5\ub3d9\uccb420%): \ud55c\uad6d\uc5b4 \uac1c\ubcc4 \ub9de\ucda4 \uc9c8\ubb38\uc73c\ub85c \uc11c\ub958 \uc9c4\uc704\u00b7\ub17c\ub9ac\u00b7\uc18c\ud1b5 \ub2a5\ub825 \ud655\uc778"
      },
      weights: { academic: 0.30, career: 0.50, community: 0.20 } // \uba74\uc811\ud615 \uae30\uc900
    },
    "\uc11c\uc6b8\uc2dc\ub9bd\ub300\ud559\uad50": {
      factors: `
[\uc11c\uc6b8\uc2dc\ub9bd\ub300\ud559\uad50 2026\ud559\ub144\ub3c4 \ud559\uc0dd\ubd80\uc885\ud569\uc804\ud615 \ud3c9\uac00 \uae30\uc900 \u2014 \uac00\uc774\ub4dc\ubd81 \ubc18\uc601]

\u25a0 \uc804\ud615 \uc720\ud615 \ubc0f \uc120\ubc1c \ubc29\uc2dd
   \ud559\uc0dd\ubd80\uc885\ud569\uc804\ud615\u2160 (\uba74\uc811\ud615):
     1\ub2e8\uacc4: \uc11c\ub958\ud3c9\uac00 100% (3\ubc30\uc218 \uc120\ubc1c)
     2\ub2e8\uacc4: \uc11c\ub958\ud3c9\uac00 50% + \uba74\uc811\ud3c9\uac00 50%
     \uc218\ub2a5 \ucd5c\uc800: \uc5c6\uc74c
     \u203b \ub300\ubd80\ubd84\uc758 \ubaa8\uc9d1\ub2e8\uc704 \ud574\ub2f9, \uba74\uc811 \ube44\uc911(50%)\uc774 \ub9e4\uc6b0 \ub192\uc544 \uba74\uc811\uc758 \uc601\ud5a5\ub825\uc774 \uacb0\uc815\uc801
   \ud559\uc0dd\ubd80\uc885\ud569\uc804\ud615\u2161 (\uc11c\ub958\ud615):
     \uc77c\uad04\ud569\uc0b0: \uc11c\ub958\ud3c9\uac00 100% (\uba74\uc811 \uc5c6\uc74c)
     \uc218\ub2a5 \ucd5c\uc800: \uad6d\u00b7\uc218\u00b7\uc601\u00b7\ud0d0(1) \uc911 2\uac1c \uc601\uc5ed \ub4f1\uae09 \ud569 5 \uc774\ub0b4 + \ud55c\uad6d\uc0ac 4\ub4f1\uae09 \uc774\ub0b4
     \u203b 2026 \uae30\uc900 \uacbd\uc601\ud559\ubd80 \ub4f1 \uc77c\ubd80 \ubaa8\uc9d1\ub2e8\uc704 \ud574\ub2f9

\u25a0 UOS 3\ub300 \uc5ed\ub7c9 \ubc0f \uc804\ud615\ubcc4 \ubc18\uc601 \ube44\uc728
   [\ud559\uc0dd\ubd80\uc885\ud569\uc804\ud615\u2160 \u2014 \uba74\uc811\ud615]
     \uc7a0\uc7ac\uc5ed\ub7c9 40% > \ud559\uc5c5\uc5ed\ub7c9 35% > \uc0ac\ud68c\uc5ed\ub7c9 25%
   [\ud559\uc0dd\ubd80\uc885\ud569\uc804\ud615\u2161 \u2014 \uc11c\ub958\ud615]
     \uc7a0\uc7ac\uc5ed\ub7c9 50% > \ud559\uc5c5\uc5ed\ub7c9 30% > \uc0ac\ud68c\uc5ed\ub7c9 20%
   \u203b \ub3d9\uc810\uc790 \ucc98\ub9ac \uc6b0\uc120\uc21c\uc704: \uc7a0\uc7ac\uc5ed\ub7c9 > \ud559\uc5c5\uc5ed\ub7c9 > \uc0ac\ud68c\uc5ed\ub7c9 \u2014 \uc7a0\uc7ac\uc5ed\ub7c9\uc774 \uac00\uc7a5 \uc911\uc694

\u25a0 3\ub300 \uc5ed\ub7c9 \uc138\ubd80 \ud3c9\uac00 \uae30\uc900 (\uc815\uc131\uc801 \uc885\ud569\ud3c9\uac00)
   \ud559\uc5c5\uc5ed\ub7c9 (Academic):
     - \uace0\uad50 \uae30\ucd08 \ud559\uc5c5\ub2a5\ub825: 3\ub144\uac04 \uc131\uc801 \ucd94\uc774(\uc0c1\uc2b9\uc138), \uc6d0\uc810\uc218, \uc774\uc218\uc790 \uc218, \uad50\uc721 \ud658\uacbd \uc885\ud569 \uace0\ub824
     - \ub300\ud559 \uc804\uacf5 \uae30\ucd08\uc18c\uc591: \uc9c0\uc6d0 \uc804\uacf5 \uad00\ub828 \uad50\uacfc\ubaa9 \uc774\uc218 \ud604\ud669\uacfc \uc131\ucde8\ub3c4
     - \ub2e8\uc21c \ub0b4\uc2e0 \ub4f1\uae09\uc774 \uc544\ub2cc \ud559\uad50 \uc5ec\uac74\uc744 \uac10\uc548\ud55c \uc815\uc131\uc801 \ud574\uc11d \uc911\uc2dc
   \uc7a0\uc7ac\uc5ed\ub7c9 (Potential) \u2190 \uac00\uc7a5 \ubcc0\ubcc4\ub825\uc774 \ud070 \ud56d\ubaa9:
     - \ub2e4\ud559\uc81c\uc801 \uc804\uacf5\uc218\ud559 \uc5f4\uc758: \ubaa8\uc9d1\ub2e8\uc704(\ud559\uacfc)\ubcc4 \uc778\uc7ac\uc0c1\uc5d0 \ubd80\ud569\ud558\ub294 \ud0d0\uad6c \ud65c\ub3d9 2~3\uac00\uc9c0
     - \ud1b5\ud569\uc801 \ubb38\uc81c\ud574\uacb0 \uc5ed\ub7c9: \uc790\uae30\uc8fc\ub3c4\uc801 \ubb38\uc81c\ud574\uacb0 \uacfc\uc815\uacfc \uc804\uacf5\uc5d0 \ub300\ud55c \uae4a\uc740 \ud638\uae30\uc2ec
     - \ud0d0\uad6c\uc758 \uae4a\uc774: \ud558\ub098\uc758 \uc8fc\uc81c\ub97c \uae4a\uc774 \ud30c\uace0\ub4e4\uc5b4 \uacb0\ub860 \ub3c4\ucd9c \ub610\ub294 \ud6c4\uc18d \ud65c\ub3d9\uc73c\ub85c \uc774\uc5b4\uc9c4 \uc0ac\ub840
     - \uc804\uacf5 \uad00\ub828 \ud575\uc2ec \uad50\uacfc\ubaa9\uc744 \ucda9\uc2e4\ud788 \uc774\uc218\ud558\uace0 \uadf8 \uc218\uc5c5\uc5d0\uc11c \ubcf4\uc778 \uc9c0\uc801 \ud655\uc7a5 \uacfc\uc815
   \uc0ac\ud68c\uc5ed\ub7c9 (Social):
     - \uacf5\ub3d9\uccb4 \ubc0f \uc2dc\ubbfc\uc724\ub9ac\uc758\uc2dd: \ud611\ub3d9\ud559\uc2b5\ub2a5\ub825, \ucc45\uc784\uac10
     - \ud611\uc5c5\uacfc \ub9ac\ub354\uc2ed: \uacf5\ub3d9\uccb4 \ub0b4 \uc8fc\ub3c4\uc801 \ud611\uc5c5, \ud0c0\uc778\uc5d0 \ub300\ud55c \ubc30\ub824
     - \ud615\uc2dd\uc801 \ubd09\uc0ac \uc2dc\uac04\ubcf4\ub2e4 \ud65c\ub3d9 \uacfc\uc815\uc5d0\uc11c \ubcf8\uc778\uc774 \ubbf8\uce5c \uae0d\uc815\uc801 \uc601\ud5a5\ub825\uc5d0 \uc8fc\ubaa9

\u25a0 \uba74\uc811 \ud3c9\uac00 \uae30\uc900 (\ud559\uc0dd\ubd80\uc885\ud569\u2160 2\ub2e8\uacc4 / 12\ubd84 \ub0b4\uc678 / 2:1 \uac1c\ubcc4 \ube14\ub77c\uc778\ub4dc \uba74\uc811)
   \ud3c9\uac00 \uc694\uc18c: \uc885\ud569\uc801 \uc0ac\uace0\ub825, \ubb38\uc81c\ud574\uacb0\ub2a5\ub825, \uc758\uc0ac\uc18c\ud1b5\ub2a5\ub825, \uacf5\uc815\uc724\ub9ac\uc758\uc2dd, \uc11c\ub958 \uc9c4\uc2e4\uc131
   \uc8fc\uc548\uc810: \ud559\uc0dd\ubd80 \ub0b4\uc6a9 \ud655\uc778 \uba74\uc811 \u2014 \ub2e8\uc21c \ud65c\ub3d9 \ub098\uc5f4\ubcf4\ub2e4 \ub2f9\uc2dc\uc758 \uace0\ubbfc\u00b7\ubc30\uc6b4 \uc810\u00b7\uc804\uacf5 \uc9c0\uc2dd\uacfc\uc758
           \uc5f0\uacb0\uc744 \uae4a\uc774 \uc788\uac8c \uc9c8\ubb38. \uc11c\ub958 \uc9c4\uc704 \ud655\uc778\uacfc \uc9c0\uc6d0\uc790\uc758 \ub17c\ub9ac\uc801 \uc0ac\uace0\ub825\uc744 \ub3d9\uc2dc\uc5d0 \ud3c9\uac00

\u25a0 \ud0c1\uc6d4\uc131 \ud310\ub2e8 \uae30\uc900 (A\ub4f1\uae09 \uc218\uc900)
   - \ub2e8\uc77c \uc8fc\uc81c \uc2ec\ud654: \ud558\ub098\uc758 \uc8fc\uc81c\ub97c \uae4a\uc774 \uc788\uac8c \ud0d0\uad6c\ud558\uc5ec \uacb0\ub860\uc744 \ub3c4\ucd9c\ud558\uac70\ub098 \ud6c4\uc18d \ud0d0\uad6c\ub85c \uc5f0\uacb0
   - \uc804\uacf5 \uc801\ud569\uc131 \uba85\ud655: \ubaa8\uc9d1\ub2e8\uc704 \uc778\uc7ac\uc0c1\uc5d0 \uc9c1\uc811\uc801\uc73c\ub85c \ubd80\ud569\ud558\ub294 \ud65c\ub3d9 2~3\uac00\uc9c0\uac00 \ud559\uc0dd\ubd80\uc5d0 \ub69c\ub837
   - \uad50\uacfc \uc774\uc218 \ucda9\uc2e4\ub3c4: \uc804\uacf5 \ud575\uc2ec \uad50\uacfc(\uacf5\ud559\uacc4\uc5f4\uc740 \ubbf8\uc801\ubd84\u00b7\ubb3c\ub9ac, \uc0c1\uacbd\uacc4\uc5f4\uc740 \uacbd\uc81c\u00b7\ud655\ud1b5 \ub4f1) \uc774\uc218
   - \ud559\uacfc\ubcc4 \uc778\uc7ac\uc0c1\uacfc \ud559\uc0dd\ubd80 \ud65c\ub3d9\uc758 \uc720\uae30\uc801 \uc77c\uce58\uc131

\u25a0 \ubaa8\uc9d1\ub2e8\uc704\ubcc4 \uad8c\uc7a5 \uc774\uc218 \uacfc\ubaa9 (\uc804\uacf5\uac00\uc774\ub4dc\ubd81 \uae30\ubc18)
   \uacf5\ud559\u00b7\uc790\uc5f0\uacc4\uc5f4: \uc218\ud559(\ubbf8\uc801\ubd84, \uae30\ud558) + \uacfc\ud559(\ubb3c\ub9ac\ud559\u2161, \ud654\ud559\u2161 \ub4f1) + \uc815\ubcf4
   \uc778\ubb38\u00b7\uc0c1\uacbd\uacc4\uc5f4: \uc218\ud559(\ud655\ub960\uacfc \ud1b5\uacc4, \ubbf8\uc801\ubd84) + \uc0ac\ud68c(\uacbd\uc81c, \uc0ac\ud68c\u00b7\ubb38\ud654, \uc815\uce58\uc640 \ubc95)
   \ub3c4\uc2dc\uacfc\ud559\uacc4\uc5f4: \uc218\ud559 + \uc0ac\ud68c(\uc138\uacc4\uc9c0\ub9ac, \uc0ac\ud68c\u00b7\ubb38\ud654) + \uacfc\ud559(\ubb3c\ub9ac, \uc9c0\uad6c\uacfc\ud559 \ub4f1)
   AI\u00b7\ucef4\ud4e8\ud130\uacc4\uc5f4: \uc218\ud559(\ubbf8\uc801\ubd84, \uae30\ud558, \ud655\ub960\uacfc \ud1b5\uacc4) + \uc815\ubcf4 + \uc778\uacf5\uc9c0\ub2a5 \uc218\ud559

\u25a0 \ud3c9\uac00 \uc8fc\uc548\uc810 (\uc885\ud569)
   1. \ud559\uacfc\ubcc4 \uc778\uc7ac\uc0c1 \ucd5c\uc6b0\uc120: \uc11c\uc6b8\uc2dc\ub9bd\ub300\ub294 \ud559\uacfc\uac00 \uc9c1\uc811 \uc815\ud55c \uc778\uc7ac\uc0c1\uc744 \ud3c9\uac00 \ucc99\ub3c4\ub85c \ud65c\uc6a9
      \u2192 \uc9c0\uc6d0 \ud559\uacfc\uc758 '\ubaa8\uc9d1\ub2e8\uc704\ubcc4 \uc778\uc7ac\uc0c1'\uc744 \ubc18\ub4dc\uc2dc \ud655\uc778\ud558\uace0 \ud65c\ub3d9\uacfc \uc5f0\uacb0 \ud544\uc218
   2. \uc7a0\uc7ac\uc5ed\ub7c9\uc774 \uacf5\ud1b5 1\uc21c\uc704: \uba74\uc811\ud615(40%)\u00b7\uc11c\ub958\ud615(50%)\u00b7\ub3d9\uc810\uc790 \ucc98\ub9ac \ubaa8\ub450 \uc7a0\uc7ac\uc5ed\ub7c9\uc774 \uac00\uc7a5 \uc911\uc694
   3. \ud0d0\uad6c\uc758 \uae4a\uc774 vs \uac1c\uc218: \ud65c\ub3d9\uc758 \uc591\ubcf4\ub2e4 \ud558\ub098\ub97c \uae4a\uac8c \ud30c\uace0\ub4e0 \ud754\uc801\uc774 \ud0c1\uc6d4\uc131\uc758 \ud575\uc2ec
   4. \uba74\uc811\ud615 \uc804\ub7b5: 2\ub2e8\uacc4 \uba74\uc811\uc774 50% \u2192 \uc11c\ub958\uc5d0\uc11c \uc7a0\uc7ac\uc5ed\ub7c9\uc744 \ud655\ubcf4\ud558\uace0 \uba74\uc811\uc5d0\uc11c \ub17c\ub9ac\uc801\uc73c\ub85c \uc124\uba85
   5. \uc11c\ub958\ud615(\uacbd\uc601\ud559\ubd80 \ub4f1): \uc218\ub2a5 \ucd5c\uc800 \ucda9\uc871\uc774 \uc804\uc81c \uc870\uac74 + \uc7a0\uc7ac\uc5ed\ub7c9(50%) \uc9d1\uc911 \uad00\ub9ac \ud544\uc694
   6. \uc131\uc801 \ucd94\uc774: \ub2e8\uc21c \ub4f1\uae09\ubcf4\ub2e4 3\ub144\uac04 \uc0c1\uc2b9\uc138\uc640 \uc804\uacf5 \uad00\ub828 \uad50\uacfc \uc131\ucde8\ub3c4\ub97c \uc911\uc2dc
`,
      competencies: {
        academic: "\ud559\uc5c5\uc5ed\ub7c9(\uace0\uad50 \uae30\ucd08 \ud559\uc5c5\ub2a5\ub825\u00b7\uc804\uacf5 \uae30\ucd08\uc18c\uc591) \u2014 \uba74\uc811\ud615 35%/\uc11c\ub958\ud615 30%. 3\ub144 \uc131\uc801 \ucd94\uc774\u00b7\uc6d0\uc810\uc218\u00b7\uc774\uc218\uc790 \uc218\u00b7\uc804\uacf5 \uad00\ub828 \uad50\uacfc \uc774\uc218 \ud604\ud669\uc744 \uc815\uc131\uc801\uc73c\ub85c \uc885\ud569 \ud574\uc11d",
        career: "\uc7a0\uc7ac\uc5ed\ub7c9(\ub2e4\ud559\uc81c\uc801 \uc804\uacf5\uc218\ud559 \uc5f4\uc758\u00b7\ud1b5\ud569\uc801 \ubb38\uc81c\ud574\uacb0 \uc5ed\ub7c9) \u2014 \uba74\uc811\ud615 40%/\uc11c\ub958\ud615 50%. \ud559\uacfc\ubcc4 \uc778\uc7ac\uc0c1 \ubd80\ud569 \ud0d0\uad6c \ud65c\ub3d9 2~3\uac00\uc9c0, \uae4a\uc774 \uc788\ub294 \ub2e8\uc77c \uc8fc\uc81c \uc2ec\ud654 \ud0d0\uad6c\uac00 \ud0c1\uc6d4\uc131 \uae30\uc900",
        community: "\uc0ac\ud68c\uc5ed\ub7c9(\uacf5\ub3d9\uccb4\u00b7\uc2dc\ubbfc\uc724\ub9ac\uc758\uc2dd\u00b7\ud611\ub3d9\ud559\uc2b5\ub2a5\ub825\u00b7\ub9ac\ub354\uc2ed\u00b7\ubc30\ub824) \u2014 \uba74\uc811\ud615 25%/\uc11c\ub958\ud615 20%. \ud615\uc2dd\uc801 \ubd09\uc0ac\ubcf4\ub2e4 \uacf5\ub3d9\uccb4 \ub0b4 \uae0d\uc815\uc801 \uc601\ud5a5\ub825\uacfc \uc8fc\ub3c4\uc801 \ud611\uc5c5 \uacbd\ud5d8 \uc911\uc2dc"
      },
      weights: { academic: 0.35, career: 0.40, community: 0.25 } // \uba74\uc811\ud615 \uae30\uc900
    },
    "서울과학기술대학교": {
      factors: `
[서울과학기술대학교 2026학년도 학생부종합전형 평가 기준]

■ 서류평가 방법 및 절차
- 다수 평가자 독립평가: 2인 독립 평가, 차이 발생 시 재평가(객관성 확보)
- 블라인드 평가: 성명, 고교명 등 모든 개인정보 블라인드 처리
- 학교폭력 조치사항: 공동체 역량 감점 또는 전 항목 최저등급 부여 등 엄격 반영
- 선발 방식: 서류 100%로 1단계 3배수 선발 후 면접 진행

■ 서류평가 요소 및 반영 비율 (총점 1,000점)
1. 진로역량 (45% / 450점): 전공(계열) 관련 교과 이수 노력, 성취도, 진로 탐색 활동과 경험
2. 학업역량 (35% / 350점): 전반적 학업성취도, 자발적 학업태도, 지적 호기심 기반 탐구력
3. 공동체역량 (20% / 200점): 협업/소통능력, 나눔/배려, 성실성/규칙준수, 리더십

■ 서류평가 핵심 주안점
- '계열적합성' 중시: 학과명과 일치하는 활동보다 넓은 의미의 계열 관련 역량(수학/과학적 탐구 등) 강조
- 결과보다 '과정' 중심: 활동 실적보다 준비 과정, 노력, 성장을 입체적으로 평가
- 내신 성적의 질적 평가: 단순 등급 하락보다 환경, 이수 단위, 원점수, 세특 등 종합 분석
- 주도성 평가: 거창한 직책보다 작은 역할 내에서의 책임감과 주도성을 높게 평가
- 횡단 평가: 교과/비교과를 분리하지 않고 모든 내용을 연계하여 종합적으로 꿰뚫어 봄

■ 모집단위별 특별 주안점
- 바이오메디컬학과(신설): 생명과학/화학 등 기초 과학 충실도, 의학적 문제/신약개발에 대한 학문적 호기심, 다학제적 소통 능력
- 자유전공학부(ST자유전공 등): 전공의 벽을 넘나드는 융합적 사고, 기초 학문을 폭넓게 수용할 수 있는 학업적 유연성
`,
      competencies: {
        academic: "학업역량 (35%): 전반적 학업성취도 및 발전 정도, 자발적 학업 태도, 지적 호기심 기반의 문제해결 및 탐구력",
        career: "진로역량 (45%): 전공(계열) 관련 교과 이수 노력 및 성취 수준, 진로 탐색 과정에서의 활동/경험의 질과 계열적합성",
        community: "공동체역량 (20%): 협업/소통능력, 나눔/배려 태도, 성실성/규칙준수(출결), 리더십 및 구성원 상호작용 내 주도성"
      },
      weights: { academic: 0.35, career: 0.45, community: 0.20 }
    },
    "건국대학교": {
      factors: `
[\uac74\uad6d\ub300\ud559\uad50 2026\ud559\ub144\ub3c4 \ud559\uc0dd\ubd80\uc885\ud569\uc804\ud615 \ud3c9\uac00 \uae30\uc900 \u2014 \uac00\uc774\ub4dc\ubd81(KU\uc790\uae30\ucd94\ucc9c) \ubc18\uc601]

\u25a0 \uc804\ud615 \uc720\ud615 \ubc0f \uc120\ubc1c \ubc29\uc2dd
   KU\uc790\uae30\ucd94\ucc9c (\ub300\ud45c \ud559\uc0dd\ubd80\uc885\ud569\uc804\ud615):
     1\ub2e8\uacc4: \uc11c\ub958\ud3c9\uac00 100% (\ubaa8\uc9d1\uc778\uc6d0\uc758 3\ubc30\uc218 \uc120\ubc1c)
     2\ub2e8\uacc4: 1\ub2e8\uacc4 \uc131\uc801 70% + \uba74\uc811\ud3c9\uac00 30%
     \uc218\ub2a5 \ucd5c\uc800: \uc5c6\uc74c
   \uc0ac\ud68c\ud1b5\ud569\u00b7\uae30\ucd08\uc0dd\ud65c\u00b7\ud2b9\uc131\ud654\uace0 \ub4f1:
     \uc11c\ub958\ud3c9\uac00 100% \uc77c\uad04\ud569\uc0b0 (\uba74\uc811 \uc5c6\uc74c)

\u25a0 \ud3c9\uac00 \uc5ed\ub7c9 \ubc0f \ubc18\uc601 \ube44\uc728 (\ubaa8\uc9d1\ub2e8\uc704\uc5d0 \ub530\ub77c \ub2e4\ub984)
   [\ud559\uacfc(\ubd80) \ubaa8\uc9d1 \u2014 \uc77c\ubc18 \uc804\uacf5]
     \uc9c4\ub85c\uc5ed\ub7c9 40% > \ud559\uc5c5\uc5ed\ub7c9 30% = \uacf5\ub3d9\uccb4\uc5ed\ub7c9 30%
     \u2192 \uc804\uacf5 \uad00\ub828 \uad50\uacfc \uc774\uc218\u00b7\uc131\ucde8\ub3c4\uc640 \uc9c4\ub85c \ud0d0\uc0c9 \uacbd\ud5d8\uc774 \uac00\uc7a5 \uc911\uc694
   [KU\uc790\uc720\uc804\uacf5\ud559\ubd80 \u2014 \uc804\uacf5\uc790\uc728\uc120\ud0dd\uc81c]
     \uc131\uc7a5\uc5ed\ub7c9 50% > \uacf5\ub3d9\uccb4\uc5ed\ub7c9 30% > \ud559\uc5c5\uc5ed\ub7c9 20%
     \u2192 \ud2b9\uc815 \uc804\uacf5 \uc801\ud569\uc131 \ub300\uc2e0 \uc131\uc7a5 \uc7a0\uc7ac\ub825(\uc131\uc7a5\uc5ed\ub7c9)\uc744 \uc808\ubc18 \uc774\uc0c1 \ubc18\uc601

\u25a0 3\uac00\uc9c0 \uc5ed\ub7c9 \uc138\ubd80 \ud3c9\uac00 \ud56d\ubaa9 (\uc785\ud559\uc0ac\uc815\uad00 \uc815\uc131 \uc885\ud569\ud3c9\uac00)
   \ud559\uc5c5\uc5ed\ub7c9 (Academic):
     - \ud559\uc5c5\uc131\ucde8\ub3c4: \uad50\uacfc \uc131\uc801 \ucd94\uc774 \ubc0f \uacfc\ubaa9\ubcc4 \uc131\ucde8 \uc218\uc900
     - \ud559\uc5c5\ud0dc\ub3c4: \uc218\uc5c5 \ub0b4 \uc9c0\uc801 \ud638\uae30\uc2ec\uacfc \uc790\uae30\uc8fc\ub3c4\uc801 \ud559\uc2b5 \uc758\uc9c0
     - \ud0d0\uad6c\ub825: \uc9c0\uc801 \ud638\uae30\uc2ec\uc744 \ud574\uacb0\ud558\uae30 \uc704\ud55c \ud0d0\uad6c \uacfc\uc815\uc774 \uc138\ud2b9\uc5d0 \uad6c\uccb4\uc801\uc73c\ub85c \uae30\uc7ac\ub41c \uc815\ub3c4
   \uc9c4\ub85c\uc5ed\ub7c9 (Career / \ud559\uacfc\ubd80 \uc804\uc6a9):
     - \uc804\uacf5(\uacc4\uc5f4)\uad00\ub828 \uad50\uacfc \uc774\uc218 \ub178\ub825: \uc9c0\uc6d0 \ud559\uacfc \uad00\ub828 \uacfc\ubaa9 \uc120\ud0dd\u00b7\uc774\uc218 \uc5ec\ubd80, \uad50\uacfc \uc704\uacc4 \uc900\uc218
     - \uc804\uacf5(\uacc4\uc5f4)\uad00\ub828 \uad50\uacfc \uc131\ucde8\ub3c4: \uc804\uacf5 \uad00\ub828 \uacfc\ubaa9\uc758 \ud559\uc5c5 \uc131\ucde8 \uc218\uc900
     - \uc9c4\ub85c \ud0d0\uc0c9 \ud65c\ub3d9\uacfc \uacbd\ud5d8: \uc9c0\uc6d0 \ud559\uacfc\uc5d0 \ub300\ud55c \uc9c0\uc18d\uc801 \uad00\uc2ec\uacfc \ud0d0\uc0c9 \uacfc\uc815\uc758 \uc9c4\uc815\uc131
   \uc131\uc7a5\uc5ed\ub7c9 (Growth / KU\uc790\uc720\uc804\uacf5\ud559\ubd80 \uc804\uc6a9):
     - \uc790\uae30\uc8fc\ub3c4\uc131: \uc2a4\uc2a4\ub85c \ud65c\ub3d9\uc744 \uae30\ud68d\ud558\uace0 \ud655\uc7a5\ud574 \ub098\uac00\ub294 \uc8fc\ub3c4\uc801 \ud0dc\ub3c4
     - \ucc3d\uc758\uc801 \ubb38\uc81c\ud574\uacb0\ub825: \uc2a4\uc2a4\ub85c \ubb38\uc81c\ub97c \uc815\uc758\ud558\uace0 \ucc3d\uc758\uc801\uc73c\ub85c \ud574\uacb0\ud558\ub824\ub294 \uacfc\uc815
     - \uacbd\ud5d8\uc758 \ub2e4\uc591\uc131: \ud2b9\uc815 \uc804\uacf5\uc5d0 \uad6d\ud55c\ub418\uc9c0 \uc54a\ub294 \ud3ed\ub113\uc740 \ubd84\uc57c\uc758 \ud0d0\uc0c9\uacfc \uacbd\ud5d8
   \uacf5\ub3d9\uccb4\uc5ed\ub7c9 (Community):
     - \ud611\uc5c5\uacfc \uc18c\ud1b5\ub2a5\ub825, \ub098\ub214\uacfc \ubc30\ub824, \uc131\uc2e4\uc131\uacfc \uaddc\uce59\uc900\uc218, \ub9ac\ub354\uc2ed
     - \ud615\uc2dd\uc801 \ubd09\uc0ac\uc2dc\uac04\u00b7\uc9c1\ucc45\ubcf4\ub2e4 \uc2e4\uc81c \uacf5\ub3d9\uccb4 \ub0b4 \ud0c0\uc778 \ubc30\ub824\u00b7\ud611\ub825\u00b7\uae0d\uc815\uc801 \ubcc0\ud654\uc758 \uad6c\uccb4\uc801 \uc5d0\ud53c\uc18c\ub4dc

\u25a0 \uba74\uc811 \ud3c9\uac00 \uae30\uc900 (KU\uc790\uae30\ucd94\ucc9c 2\ub2e8\uacc4 / 10\ubd84 \ub0b4\uc678 / \uba74\uc811\uad00 2\uc778 vs \uc9c0\uc6d0\uc790 1\uc778 \ube14\ub77c\uc778\ub4dc \uba74\uc811)
   \ud3c9\uac00 \ucc99\ub3c4: 5\ub4f1\uae09 (A+, A, B, C, D)
   \ud559\uacfc\ubd80 \ubaa8\uc9d1: \uc9c4\ub85c\uc5ed\ub7c9(40%)\uc774 \uac00\uc7a5 \ub192\uc740 \ube44\uc911 \u2014 \uc804\uacf5 \uad00\ub828 \ud0d0\uad6c \uacbd\ud5d8\uc758 \uc9c4\uc815\uc131 \ud655\uc778 \uc911\uc2ec
   KU\uc790\uc720\uc804\uacf5\ud559\ubd80: \uc131\uc7a5\uc5ed\ub7c9(50%)\uc774 \uc808\ubc18 \uc774\uc0c1 \u2014 \uc790\uae30\uc8fc\ub3c4\uc131\u00b7\uacbd\ud5d8\uc758 \ub2e4\uc591\uc131 \ud655\uc778 \uc911\uc2ec
   \uba74\uc811 \uc8fc\uc548\uc810: \uc11c\ub958(\ud559\uc0dd\ubd80) \uae30\ubc18 \ud655\uc778 \uba74\uc811, \ud0d0\uad6c\uc758 \ub3d9\uae30\u00b7\uacfc\uc815\u00b7\uc5b4\ub824\uc6c0\u00b7\ud574\uacb0 \ubc29\uc548 \uc2ec\uce35 \uc9c8\ubb38

\u25a0 \ud0c1\uc6d4\uc131(A+) \ud310\ub2e8 \uae30\uc900
   - \ud0d0\uad6c\uc758 \uae4a\uc774: \uad50\uacfc\uc11c \uac1c\ub150\uc744 \ub118\uc5b4 \uad00\ub828 \ub17c\ubb38\u00b7\ub3c4\uc11c \ud0d0\ub3c5 \ub610\ub294 \uc9c1\uc811 \uc2e4\ud5d8\u00b7\uc124\ubb38 \uc124\uacc4 \ud6c4 \uc2ec\ud654 \ud0d0\uad6c
   - \uacfc\uc815 \uc911\uc2ec\uc758 \uae30\ub85d: \uacb0\uacfc\ubcf4\ub2e4 '\uc65c \ud0d0\uad6c\ud588\ub294\uc9c0', '\uc5b4\ub5a4 \uc5b4\ub824\uc6c0\uc774 \uc788\uc5c8\uace0 \uc5b4\ub5bb\uac8c \ud574\uacb0\ud588\ub294\uc9c0'\uac00 \uc0dd\uc0dd\ud788 \uae30\uc7ac
   - \uc790\uae30\uc8fc\ub3c4\uc131: \uad50\uc0ac\uac00 \uc2dc\ud0a8 \ud65c\ub3d9\uc774 \uc544\ub2cc \ubcf8\uc778 \uad00\uc2ec\uc0ac \uae30\ubc18\uc73c\ub85c \uc2a4\uc2a4\ub85c \uae30\ud68d\u00b7\ud655\uc7a5\ud55c \ud65c\ub3d9

\u25a0 \uc804\uacf5\ubcc4 \uad8c\uc7a5 \uc774\uc218 \uacfc\ubaa9
   \uc218\uc758\uc608\uacfc: \uc0dd\uba85\uacfc\ud559\u2160\u00b7\u2161, \ud654\ud559\u2160\u00b7\u2161 \ub4f1 \uc790\uc5f0\uacfc\ud559 \ud575\uc2ec \uacfc\ubaa9 \ud544\uc218
   \uacf5\uacfc\ub300\ud559: \uc218\ud559(\ubbf8\uc801\ubd84, \uae30\ud558) + \ubb3c\ub9ac\ud559\u2160\u00b7\u2161 \ub4f1 \uae30\ucd08 \uacfc\ud559 \ucda9\uc2e4\ub3c4 \ud655\uc778
   \uc0ac\ubc94\ub300\ud559: \uc9c0\uc6d0 \uc804\uacf5 \uad00\ub828 \uad50\uacfc + \uad50\uc721\ud559\uc801 \uc18c\uc591\u00b7\uba58\ud1a0\ub9c1 \ud65c\ub3d9 \uacbd\ud5d8 \uc911\uc2dc
   KU\uc790\uc720\uc804\uacf5\ud559\ubd80: \ud2b9\uc815 \uacfc\ubaa9 \uc9c0\uc815 \uc5c6\uc74c \u2014 \ub2e4\uc591\ud55c \ubd84\uc57c \ud0d0\uc0c9 \uacbd\ud5d8\uc758 \uc2a4\ud399\ud2b8\ub7fc\uc774 \uc911\uc694

\u25a0 \ud3c9\uac00 \uc8fc\uc548\uc810 (\uc885\ud569)
   1. \uc804\uacf5 \uc120\ud0dd\uc5d0 \ub530\ub77c \uc801\uc6a9 \uc5ed\ub7c9\uc774 \ub2e4\ub984: \ud559\uacfc\ubd80(\uc9c4\ub85c\uc5ed\ub7c940%) vs \uc790\uc720\uc804\uacf5(\uc131\uc7a5\uc5ed\ub7c950%)
   2. \uc138\ud2b9\uc758 \uacfc\uc815 \uae30\ub85d: '\uc65c\u00b7\uc5b4\ub5bb\uac8c'\uac00 \ub2f4\uae34 \uc138\ud2b9 \ub0b4\uc6a9\uc774 \ud0c1\uc6d4\uc131(A+)\uc758 \ud575\uc2ec \ud310\ub2e8 \uae30\uc900
   3. \uc218\ub2a5\ucd5c\uc800 \uc5c6\uc74c: \ud559\uc0dd\ubd80 \ucf58\ud150\uce20\uc758 \uc9c8\uacfc \uba74\uc811 \uc900\ube44\uac00 \ud569\uaca9\uc744 \uc88c\uc6b0
   4. \uba74\uc811 30% \ube44\uc911: 1\ub2e8\uacc4 \ud1b5\uacfc \ud6c4 \uc138\ud2b9 \uae30\ubc18 \uc2ec\uce35 \uc9c8\ubb38\uc5d0 \ub2f5\ud560 \uc218 \uc788\uc5b4\uc57c \ud568
   5. \uc9c4\ub85c\uc5ed\ub7c9 \uc704\uacc4 \uc774\uc218: \uc9c0\uc6d0 \ud559\uacfc \uad00\ub828 \uad50\uacfc\uc758 \ub2e8\uacc4\uc801\u00b7\uc704\uacc4\uc801 \uc120\ud0dd\u00b7\uc774\uc218\uac00 \ud3c9\uac00\uc5d0 \uc720\ub9ac
   6. \uacf5\ub3d9\uccb4\uc5ed\ub7c9\uc740 '\uc5d0\ud53c\uc18c\ub4dc'\ub85c \ud3c9\uac00: \ud615\uc2dd\uc801 \ud65c\ub3d9\ubcf4\ub2e4 \uad6c\uccb4\uc801 \uc2a4\ud1a0\ub9ac\uac00 \uc788\ub294 \ud611\ub825 \uacbd\ud5d8 \ud544\uc218
`,
      competencies: {
        academic: "\ud559\uc5c5\uc5ed\ub7c9(\ud559\uc5c5\uc131\ucde8\ub3c4\u00b7\ud559\uc5c5\ud0dc\ub3c4\u00b7\ud0d0\uad6c\ub825) \u2014 \ud559\uacfc\ubd80 30%/\uc790\uc720\uc804\uacf5 20%. \uc138\ud2b9\uc5d0 \uc9c0\uc801 \ud638\uae30\uc2ec\uacfc \ud0d0\uad6c \uacfc\uc815\uc774 \uad6c\uccb4\uc801\uc73c\ub85c \uae30\uc7ac\ub41c \uc815\ub3c4\uac00 \ud575\uc2ec",
        career: "\uc9c4\ub85c\uc5ed\ub7c9(\uc804\uacf5\uad00\ub828 \uad50\uacfc \uc774\uc218 \ub178\ub825\u00b7\uc131\ucde8\ub3c4\u00b7\uc9c4\ub85c\ud0d0\uc0c9\uacbd\ud5d8) \u2014 \ud559\uacfc\ubd80 40%. \uc9c0\uc6d0 \ud559\uacfc \uad00\ub828 \uc704\uacc4\uc801 \uad50\uacfc \uc774\uc218\uc640 \uc9c4\uc815\uc131 \uc788\ub294 \ud0d0\uc0c9 \uacfc\uc815\uc774 \uacb0\uc815\uc801 / KU\uc790\uc720\uc804\uacf5: \uc131\uc7a5\uc5ed\ub7c9(\uc790\uae30\uc8fc\ub3c4\uc131\u00b7\ucc3d\uc758\uc801 \ubb38\uc81c\ud574\uacb0\u00b7\uacbd\ud5d8 \ub2e4\uc591\uc131) \u2014 50%",
        community: "\uacf5\ub3d9\uccb4\uc5ed\ub7c9(\ud611\uc5c5\u00b7\uc18c\ud1b5\u00b7\ub098\ub214\u00b7\ubc30\ub824\u00b7\uc131\uc2e4\uc131\u00b7\ub9ac\ub354\uc2ed) \u2014 \uacf5\ud1b5 30%. \ud615\uc2dd\uc801 \ubd09\uc0ac\ubcf4\ub2e4 \uc2e4\uc81c \uacf5\ub3d9\uccb4 \ub0b4 \uae0d\uc815\uc801 \ubcc0\ud654 \uc774\ub048 \uad6c\uccb4\uc801 \uc5d0\ud53c\uc18c\ub4dc \uc911\uc2dc"
      },
      weights: { academic: 0.30, career: 0.40, community: 0.30 } // \uc77c\ubc18 \ud559\uacfc\ubd80 \uae30\uc900
    },
    "\ub3d9\uad6d\ub300\ud559\uad50": {
      factors: `
[\ub3d9\uad6d\ub300\ud559\uad50 2027\ud559\ub144\ub3c4 \ud559\uc0dd\ubd80\uc885\ud569\uc804\ud615 \ud3c9\uac00 \uae30\uc900 \u2014 \uac00\uc774\ub4dc\ubd81(Do Dream \uc804\ud615) \ubc18\uc601]

\u25a0 \uc804\ud615 \uc720\ud615 \ubc0f \uc120\ubc1c \ubc29\uc2dd
   Do Dream (\ub300\ud45c \ud559\uc0dd\ubd80\uc885\ud569\uc804\ud615):
     1\ub2e8\uacc4: \uc11c\ub958\ud3c9\uac00 100% (3.5~4\ubc30\uc218 \uc120\ubc1c)
     2\ub2e8\uacc4: 1\ub2e8\uacc4 \uc131\uc801 70% + \uba74\uc811\ud3c9\uac00 30%
     \uc218\ub2a5 \ucd5c\uc800: \uc5c6\uc74c
   \ud559\uad50\uc7a5\ucd94\ucc9c\uc778\uc7ac (\ud559\uc0dd\ubd80\uad50\uacfc):
     \uad50\uacfc \uc131\uc801 70% + \uc11c\ub958 \uc885\ud569\ud3c9\uac00(\uc815\uc131) 30%
     \uad50\uacfc \uc804\ud615\uc784\uc5d0\ub3c4 \uc11c\ub958 \uc815\uc131\ud3c9\uac00 30%\uac00 \ub2f9\ub77d\uc5d0 \ud070 \uc601\ud5a5 \u2014 \ud559\uc5c5\uc5ed\ub7c9 50% > \uc9c4\ub85c\uc5ed\ub7c9 30% > \uc778\uc131\uc0ac\ud68c\uc131 20%
   \ubd88\uad50\ucd94\ucc9c\uc778\uc7ac: \uc804\uacf5\uc801\ud569\uc131 25% + \ubd88\uad50\uc815\uc2e0\uc18c\uc591 30% + \ud559\uc5c5\uc5ed\ub7c9 25% + \uc778\uc131\uc0ac\ud68c\uc131 20%
   \uae30\ud0c0(\uae30\ud68c\uade0\ud615 \ub4f1): Do Dream\uacfc \uc720\uc0ac\ud55c \ub2e8\uacc4\ubcc4 \uc804\ud615 \ubc29\uc2dd

\u25a0 Do Dream \ud3c9\uac00 \uc5ed\ub7c9 \ubc0f \ubc18\uc601 \ube44\uc728
   \uc804\uacf5\uc801\ud569\uc131 55% (=\ucd5c\uc6b0\uc120, \ud0c0 \ub300\ud559\ubcf4\ub2e4 \uc555\ub3c4\uc801\uc73c\ub85c \ub192\uc74c):
     - \uc804\uacf5\uc218\ud559\uc5ed\ub7c9 30%: \uc804\uacf5 \uad00\ub828 \ud575\uc2ec \uacfc\ubaa9 \uc774\uc218 \uc5ec\ubd80\uc640 \uc131\ucde8\ub3c4
     - \uc804\uacf5\uad00\uc2ec\ub3c4\u00b7\uc9c4\ub85c\ud0d0\uc0c9\ub178\ub825 25%: \ub3d9\uc544\ub9ac\u00b7\uc9c4\ub85c\ud65c\ub3d9\uc5d0\uc11c \uc804\uacf5\uc5d0 \ub300\ud55c \uace0\ubbfc \uad6c\uccb4\ud654 \ubc0f \uc9c0\uc18d \ud65c\ub3d9
   \ud559\uc5c5\uc5ed\ub7c9 25%:
     - \uae30\ucd08\ud559\uc5c5\uc5ed\ub7c9 15%: \uad6d\u00b7\uc218\u00b7\uc601\u00b7\uc0ac/\uacfc \uae30\ubcf8 \uad50\uacfc \uc131\ucde8\ub3c4 \ubc0f \ucd94\uc774
     - \ud559\uc2b5\uc758 \uc8fc\ub3c4\uc131 10%: \uc9c0\uc801 \ud638\uae30\uc2ec \ud574\uacb0\uc744 \uc704\ud55c \ub178\ub825, \uad50\uacfc \uc218\uc5c5 \ub0b4 \uc2ec\ud654 \ud0d0\uad6c \uacfc\uc815
   \uc778\uc131 \ubc0f \uc0ac\ud68c\uc131 20%:
     - \uc5ed\ud560\uc758 \uc8fc\ub3c4\uc131 10%: \uacf5\ub3d9\uccb4 \ub0b4 \ub9ac\ub354\uc2ed\u00b7\uac08\ub4f1 \uc870\uc728 \uc8fc\ub3c4 \uacbd\ud5d8
     - \ud611\uc5c5\uc18c\ud1b5\ub2a5\ub825 10%: \ud0c0\uc778 \uc758\uacac \uacbd\uccad \ubc0f \ud611\ub825\uc744 \ud1b5\ud55c \ubb38\uc81c \ud574\uacb0

\u25a0 \uc5ed\ub7c9\ubcc4 \uc138\ubd80 \ud3c9\uac00 \uc8fc\uc548\uc810
   \uc804\uacf5\uc801\ud569\uc131 (\ucd5c\uc6b0\uc120 \u2014 Do Dream 55%):
     - \uc804\uacf5 \uc218\ud559\uc5ed\ub7c9: \uc804\uacf5 \uad00\ub828 \ud575\uc2ec \uacfc\ubaa9\uc744 \uc2e4\uc81c\ub85c \uc774\uc218\ud558\uace0 \ub192\uc740 \uc131\ucde8\ub97c \ubcf4\uc600\ub294\uc9c0
     - \uc9c4\ub85c \ud0d0\uc0c9 \ub178\ub825: \ub3d9\uc544\ub9ac\u00b7\uc9c4\ub85c\ud65c\ub3d9\u00b7\uc790\uc728\ud65c\ub3d9\uc5d0\uc11c \uc804\uacf5 \uad00\ub828 \uace0\ubbfc\uc774 \uad6c\uccb4\ud654\u00b7\uc9c0\uc18d\ub418\uc5c8\ub294\uc9c0
     - \uc218\uc5c5 \uc18d \uc804\uacf5 \ud0d0\uad6c: \uc138\ud2b9\uc5d0\uc11c \uc804\uacf5 \ubd84\uc57c \uac1c\ub150\uc744 \uae4a\uc774 \ub2e4\ub8e8\uac70\ub098 \uc2a4\uc2a4\ub85c \ud655\uc7a5\ud55c \uc0ac\ub840
   \ud559\uc5c5\uc5ed\ub7c9:
     - \uae30\ucd08\ud559\uc5c5: \ub2e8\uc21c \ub4f1\uae09 \uc218\uce58\ubcf4\ub2e4 \uc131\ucde8\ub3c4\uc640 \uc218\uc5c5 \ud0dc\ub3c4, 3\ub144 \ucd94\uc774\ub97c \uc815\uc131 \ud3c9\uac00
     - \ud559\uc2b5 \uc8fc\ub3c4\uc131: \uc9c0\uc801 \ud638\uae30\uc2ec\uc744 \uc2a4\uc2a4\ub85c \ud574\uacb0\ud558\uae30 \uc704\ud55c \ud0d0\uad6c \uacfc\uc815\uc774 \uc138\ud2b9\uc5d0 \uad6c\uccb4\uc801\uc73c\ub85c \uae30\uc7ac
   \uc778\uc131 \ubc0f \uc0ac\ud68c\uc131:
     - '\ucc38\uc5ec' \uc218\uc900\uc744 \ub118\uc5b4 \uc870\uc9c1 \ubc29\ud5a5\uc131 \uc81c\uc2dc\u00b7\uc801\uadf9\uc801 \uc911\uc7ac\uc790\ub85c \ud65c\ub3d9\ud55c \uae30\ub85d\uc774 \uad6c\uccb4\uc801\uc77c \ub54c \uace0\ub4dd\uc810

\u25a0 \uba74\uc811 \ud3c9\uac00 \uae30\uc900 (Do Dream 2\ub2e8\uacc4 / 10\ubd84 \ub0b4\uc678 / \ud559\uc0dd\ubd80 \uae30\ubc18 \uc11c\ub958 \ud655\uc778 \uba74\uc811)
   \uc804\ud615\ucde8\uc9c0\uc801\ud569\uc131 20% + \uc804\uacf5\uc801\ud569\uc131 30% + \ubc1c\uc804\uac00\ub2a5\uc131 20% + \uc778\uc131 \ubc0f \uc0ac\ud68c\uc131 30%
   \uc8fc\uc694 \uc9c8\ubb38 \ubc29\ud5a5:
     - \uc138\ud2b9 \uae30\uc7ac \ud0d0\uad6c \ud65c\ub3d9\uc758 \uc2e4\uc81c \uc218\ud589 \uc5ec\ubd80 \ubc0f \uae4a\uc774 \ud655\uc778
     - \uc804\uacf5 \uae30\ubcf8 \uc18c\uc591 \ubc0f \ub17c\ub9ac\uc801 \uc0ac\uace0\ub825 \ud14c\uc2a4\ud2b8
     - '\uacc4\uae30-\uacfc\uc815-\uacb0\uacfc-\uc131\uc7a5' \uc5f0\uacb0\uc131 \uc911\uc2ec\uc758 \uc2ec\uce35 \uc9c8\ubb38 (\ub2e8\uc21c \ud65c\ub3d9 \ub098\uc5f4 \uc81c\uc678)

\u25a0 \ud0c1\uc6d4\uc131(A+) \ud310\ub2e8 \uae30\uc900 (6\ub2e8\uacc4: A+, A, B, C, D, F)
   - \uc9c0\uc801 \ud638\uae30\uc2ec\uc758 \ud655\uc7a5: \uc218\uc5c5\uc5d0\uc11c \ubc30\uc6b4 \uac1c\ub150\uc5d0 \uc758\ubb38\uc744 \ud488\uace0 \ubb38\ud5cc \ud0d0\ub3c5\u00b7\uc2e4\ud5d8 \uc124\uacc4 \ub4f1 '\uaf2c\ub9ac \ubb34\ub294 \ud0d0\uad6c'
   - \uad50\uacfc \uc5f0\uacc4\uc131: \uad50\uacfc \uc131\uc801\uacfc \uc138\ud2b9 \ub0b4\uc6a9\uc774 \uc77c\uce58\ud558\uace0 \uc804\uacf5 \uad00\ub828 \ud575\uc2ec \uacfc\ubaa9\uc5d0\uc11c \ud2b9\ud788 \uc6b0\uc218\ud55c \uc5ed\ub7c9
   - \uc8fc\ub3c4\uc801 \uc0ac\ud68c\uc131: '\ucc38\uc5ec'\ub97c \ub118\uc5b4 \uc870\uc9c1 \ubc29\ud5a5\uc131 \uc81c\uc2dc\u00b7\uc801\uadf9\uc801 \uc911\uc7ac\uc790 \uc5ed\ud560\uc774 \uad6c\uccb4\uc801\uc73c\ub85c \uae30\ub85d
   - \uc804\uacf5 \uc218\uc5c5 \uc18d \ud0d0\uad6c\uac00 \ud575\uc2ec: '\uc218\uc5c5 \uc2dc\uac04 \ub0b4 \ud65c\ub3d9(\uc138\ud2b9)'\uc5d0\uc11c \ub4dc\ub7ec\ub098\ub294 \uc804\uacf5 \uae4a\uc774 \uc788\ub294 \uace0\ubbfc\uc744 \ucd5c\uc6b0\uc120 \ud3c9\uac00

\u25a0 \uacc4\uc5f4\ubcc4 \uad8c\uc7a5 \uc774\uc218 \uacfc\ubaa9 (\uc804\uacf5\uac00\uc774\ub4dc\ubd81 \uae30\ubc18)
   \uc778\ubb38\uacc4\uc5f4: \uad6d\uc5b4(\ud654\uc791, \uc5b8\ub9e4), \uc0ac\ud68c(\uc0dd\uc724\u00b7\uc724\uc0ac\u00b7\uc0ac\ubb38\u00b7\uc138\uacc4\uc0ac \ub4f1), \uc81c2\uc678\uad6d\uc5b4
   \uacbd\uc601\u00b7\uacbd\uc81c\uacc4\uc5f4: \uc218\ud559(\uc218\u2160\u00b7\u2161, \ud655\ud1b5, \ubbf8\uc801\ubd84), \uc0ac\ud68c(\uacbd\uc81c, \uc0ac\ubb38)
   \uc790\uc5f0\u00b7\uacf5\ud559\uacc4\uc5f4: \uc218\ud559(\ubbf8\uc801\ubd84, \uae30\ud558) \ud544\uc218 + \uacfc\ud559(\ubb3c\ub9ac\ud559\u2160\u00b7\u2161, \ud654\ud559\u2160\u00b7\u2161 \ub4f1 \uc804\uacf5 \uc5f0\uacc4)
   \ubc14\uc774\uc624\u00b7\uba54\ub514\uceec: \uc0dd\uba85\uacfc\ud559\u2160\u00b7\u2161, \ud654\ud559\u2160\u00b7\u2161 \uc131\ucde8\ub3c4 \uc911\uc694
   \uc5f4\ub9b0\uc804\uacf5(\ubb34\uc804\uacf5): \ud2b9\uc815 \ubd84\uc57c \uce58\uc6b0\uce68 \uc5c6\uc774 \uc804 \uacc4\uc5f4 \uae30\ucd08 \ud559\uc5c5\uc5ed\ub7c9 + \ud3ed\ub113\uc740 \ud0d0\uad6c \uc758\uc9c0

\u25a0 \ud3c9\uac00 \uc8fc\uc548\uc810 (\uc885\ud569)
   1. \uc804\uacf5\uc801\ud569\uc131\uc774 55%\ub85c \uc555\ub3c4\uc801 1\uc21c\uc704: \uc804\uacf5 \uad00\ub828 \ud575\uc2ec \uacfc\ubaa9 \uc774\uc218\uc640 \uc2ec\ud654 \ud0d0\uad6c\uac00 \ud569\uaca9\uc758 \ud575\uc2ec
   2. \uc218\ub2a5\ucd5c\uc800 \uc5c6\uc74c: \ud559\uc0dd\ubd80 \uc138\ud2b9\uc758 \uc9c8\uacfc \uba74\uc811 \uc900\ube44\uac00 \uc804\ubd80
   3. \uba74\uc811 \uc804\uacf5\uc801\ud569\uc131 30%: \uc804\uacf5 \uad00\ub828 \ud0d0\uad6c \uacbd\ud5d8\uc744 '\uacc4\uae30-\uacfc\uc815-\uacb0\uacfc-\uc131\uc7a5'\uc73c\ub85c \ub17c\ub9ac\uc801 \uc124\uba85 \ud544\uc218
   4. \ud559\uad50\uc7a5\ucd94\ucc9c(\uad50\uacfc\uc804\ud615): \uc815\uc131\ud3c9\uac00 30%\uc5d0\uc11c \ud559\uc5c5\uc5ed\ub7c9(50%) \uc911\uc2ec \u2014 \uc131\uc801+\uc138\ud2b9 \uad00\ub9ac \ubcd1\ud589 \ud544\uc694
   5. \uc138\ud2b9 \uc911\uc2ec \ud3c9\uac00: \uc678\ubd80 \ud65c\ub3d9\ubcf4\ub2e4 '\uc218\uc5c5 \uc2dc\uac04 \ub0b4 \ud0d0\uad6c'\uac00 \ub3d9\uad6d\ub300 \ud3c9\uac00\uc758 \ud575\uc2ec \ud310\ub2e8 \uadfc\uac70
   6. \uc790\uc5f0\u00b7\uacf5\ud559\uacc4\uc5f4: \ubbf8\uc801\ubd84\u00b7\uae30\ud558 \uc774\uc218\uac00 \uc804\uacf5\uc218\ud559\uc5ed\ub7c9 \ud3c9\uac00\uc5d0 \uacb0\uc815\uc801 \uc601\ud5a5
`,
      competencies: {
        academic: "\ud559\uc5c5\uc5ed\ub7c9(\uae30\ucd08\ud559\uc5c5\uc5ed\ub7c9\u00b7\ud559\uc2b5\uc8fc\ub3c4\uc131) \u2014 Do Dream 25%/\ud559\uad50\uc7a5\ucd94\ucc9c 50%. \uc138\ud2b9\uc5d0 \ub4dc\ub7ec\ub098\ub294 \uc9c0\uc801 \ud638\uae30\uc2ec \ud574\uacb0 \ud0d0\uad6c \uacfc\uc815, 3\ub144 \uc131\ucde8\ub3c4 \ucd94\uc774 \uc815\uc131 \ud3c9\uac00",
        career: "\uc804\uacf5\uc801\ud569\uc131(\uc804\uacf5\uc218\ud559\uc5ed\ub7c9 30%+\uc804\uacf5\uad00\uc2ec\ub3c4\u00b7\uc9c4\ub85c\ud0d0\uc0c9\ub178\ub825 25%) \u2014 Do Dream 55%. \uc804\uacf5 \ud575\uc2ec \uacfc\ubaa9 \uc774\uc218\u00b7\uc131\ucde8\ub3c4\uc640 \uc138\ud2b9\uc758 \uc804\uacf5 \uad00\ub828 \uc2ec\ud654 \ud0d0\uad6c\uac00 \ud569\uaca9\uc758 \ud575\uc2ec \uacb0\uc815 \uc694\uc18c",
        community: "\uc778\uc131 \ubc0f \uc0ac\ud68c\uc131(\uc5ed\ud560\uc8fc\ub3c4\uc131 10%+\ud611\uc5c5\uc18c\ud1b5 10%) \u2014 Do Dream 20%. \uba74\uc811 \uc778\uc131 30%: '\uacc4\uae30-\uacfc\uc815-\uacb0\uacfc-\uc131\uc7a5' \uc5f0\uacb0\uc131 \uc2ec\uce35 \uc9c8\ubb38, \uad6c\uccb4\uc801 \u4e3b\u5c0e \uacbd\ud5d8 \uc911\uc2dc"
      },
      weights: { academic: 0.25, career: 0.55, community: 0.20 } // Do Dream \uc804\ud615 \uae30\uc900
    },
    "\ud64d\uc775\ub300\ud559\uad50": {
      factors: `
[\ud64d\uc775\ub300\ud559\uad50 2026\ud559\ub144\ub3c4 \ud559\uc0dd\ubd80\uc885\ud569\uc804\ud615 \ud3c9\uac00 \uae30\uc900 \u2014 \uac00\uc774\ub4dc\ubd81 \ubc18\uc601]

\u25a0 \uc804\ud615 \uc720\ud615 \ubc0f \uc120\ubc1c \ubc29\uc2dd
   \ud559\uad50\uc0dd\ud65c\uc6b0\uc218\uc790 (\uc778\ubb38\u00b7\uc790\uc5f0\uacc4\uc5f4):
     \uc11c\ub958\ud3c9\uac00 100% \uc77c\uad04\ud569\uc0b0 (\uba74\uc811 \uc5c6\uc74c)
     \uc218\ub2a5 \ucd5c\uc800 [\uc11c\uc6b8\ucea0\ud37c\uc2a4]: \uad6d\u00b7\uc218\u00b7\uc601\u00b7\ud0d0(1) \uc911 3\uac1c \uc601\uc5ed \ub4f1\uae09 \ud569 8 \uc774\ub0b4 + \ud55c\uad6d\uc0ac 4\ub4f1\uae09 \uc774\ub0b4
     \uc218\ub2a5 \ucd5c\uc800 [\uc138\uc885\ucea0\ud37c\uc2a4]: \uad6d\u00b7\uc218\u00b7\uc601\u00b7\ud0d0(1) \uc911 2\uac1c \uc601\uc5ed \ub4f1\uae09 \ud569 9 \uc774\ub0b4
     \u203b \uc218\ub2a5 \ucd5c\uc800\uac00 \uc788\uc73c\ubbc0\ub85c \uc2e4\uc9c8 \uacbd\uc7c1\ub960\uc774 \ub0ae\uc544 \uc11c\ub958 \uc900\ube44\uc640 \ud568\uaed8 \uc218\ub2a5 \uad00\ub9ac \ubcd1\ud589 \ud544\uc218
   \ubbf8\uc220\uc6b0\uc218\uc790 (\ubbf8\uc220\uacc4\uc5f4):
     1\ub2e8\uacc4: \uad50\uacfc 20% + \uc11c\ub958 80% (3\ubc30\uc218 \uc120\ubc1c)
     2\ub2e8\uacc4: \uc11c\ub958 40% + \uba74\uc811 60%
     \uc218\ub2a5 \ucd5c\uc800 [\uc11c\uc6b8]: \uad6d\u00b7\uc218\u00b7\uc601\u00b7\ud0d0(1) \uc911 3\uac1c \uc601\uc5ed \ub4f1\uae09 \ud569 9 \uc774\ub0b4 + \ud55c\uad6d\uc0ac 4\ub4f1\uae09 \uc774\ub0b4

\u25a0 \ud3c9\uac00 \uc694\uc18c \ubc0f \ubc18\uc601 \ube44\uc728 (\ud559\uad50\uc0dd\ud65c\uc6b0\uc218\uc790 \uc11c\ub958\ud3c9\uac00 \uae30\uc900)
   \ud559\uc5c5\uc5ed\ub7c9 (40%): \ub300\ud559 \uad50\uc721 \uc774\uc218\uc5d0 \ud544\uc694\ud55c \uae30\ucd08 \ud559\uc5c5 \ub2a5\ub825
   \uc9c4\ub85c\uc5ed\ub7c9 (40%): \uc790\uc2e0\uc758 \uc9c4\ub85c\uc640 \uc804\uacf5(\uacc4\uc5f4)\uc5d0 \ub300\ud55c \ud0d0\uc0c9 \ub178\ub825\uacfc \uc900\ube44 \uc815\ub3c4
   \uacf5\ub3d9\uccb4\uc5ed\ub7c9 (20%): \uacf5\ub3d9\uccb4\uc758 \uc77c\uc6d0\uc73c\ub85c\uc11c \uac16\ucd94\uc5b4\uc57c \ud560 \ubc14\ub78c\uc9c1\ud55c \uc0ac\uace0\uc640 \ud589\ub3d9

\u25a0 \uc5ed\ub7c9\ubcc4 \uc138\ubd80 \ud3c9\uac00 \ud56d\ubaa9
   \ud559\uc5c5\uc5ed\ub7c9 (40%):
     - \uae30\ucd08\ud559\uc5c5\uc131\ucde8\ub3c4: \uc804\ubc18\uc801 \uad50\uacfc \uc131\uc801 \ubc0f \uc804\uacf5 \uad00\ub828 \uacfc\ubaa9\uc758 \uc131\ucde8 \uc218\uc900
     - \ud559\uc5c5\ud0dc\ub3c4: \ud559\uc5c5 \uc218\ud589\uc758 \uc790\ubc1c\uc801 \uc758\uc9c0\uc640 \ub178\ub825 (\uc790\uae30\uc8fc\ub3c4\uc131)
     - \ud0d0\uad6c\ub825: \uc9c0\uc801 \ud638\uae30\uc2ec\uc744 \ubc14\ud0d5\uc73c\ub85c \uc0ac\ubb3c\u00b7\ud604\uc0c1\uc744 \ud0d0\uad6c\ud558\uace0 \ubb38\uc81c\ub97c \ud574\uacb0\ud558\ub824\ub294 \ub2a5\ub825
   \uc9c4\ub85c\uc5ed\ub7c9 (40%):
     - \uc804\uacf5(\uacc4\uc5f4) \uad00\ub828 \uad50\uacfc \uc774\uc218 \ub178\ub825: \uc804\uacf5\uc5d0 \ud544\uc694\ud55c \uacfc\ubaa9\uc744 \uc120\ud0dd\u00b7\uc774\uc218\ud55c \uc815\ub3c4
     - \uc804\uacf5(\uacc4\uc5f4) \uad00\ub828 \uad50\uacfc \uc131\ucde8\ub3c4: \uc804\uacf5 \uad00\ub828 \uacfc\ubaa9\uc758 \ud559\uc5c5 \uc131\ucde8 \uc218\uc900
     - \uc9c4\ub85c \ud0d0\uc0c9 \ud65c\ub3d9\uacfc \uacbd\ud5d8: \uad00\uc2ec \ubd84\uc57c\uc5d0 \ub300\ud55c \uc9c0\uc18d\uc801 \ud0d0\uc0c9 \uacfc\uc815\uacfc \uacb0\uacfc
   \uacf5\ub3d9\uccb4\uc5ed\ub7c9 (20%):
     - \ud611\uc5c5 \ubc0f \uc18c\ud1b5\ub2a5\ub825: \uacf5\ub3d9 \ubaa9\ud45c\ub97c \uc704\ud55c \ud611\ub825\uacfc \ud0c0\uc778 \uc758\uacac \uacbd\uccad
     - \ub098\ub214\uacfc \ubc30\ub824: \ud0c0\uc778\uc744 \uc774\ud574\ud558\uace0 \ub3d5\uace0\uc790 \ud558\ub294 \ub9c8\uc74c\uac00\uc9d0
     - \uc131\uc2e4\uc131 \ubc0f \uaddc\uce59\uc900\uc218: \ucc45\uc784\uac10 \uae30\ubc18\uc758 \uc758\ubb34 \uc218\ud589\uacfc \uc0ac\ud68c\uc801 \uaddc\ubc94 \uc900\uc218
     - \ub9ac\ub354\uc2ed: \uacf5\ub3d9\uccb4 \ubaa9\ud45c \ub2ec\uc131\uc744 \uc704\ud574 \uad6c\uc131\uc6d0\uc758 \ud654\ud569\uacfc \ubcc0\ud654\ub97c \uc774\ub044\ub294 \ub2a5\ub825

\u25a0 \ubbf8\uc220\uc6b0\uc218\uc790 \uba74\uc811 \ud3c9\uac00 \uae30\uc900 (2\ub2e8\uacc4 / 60% \ubc18\uc601 \u2014 \uc2e4\uc9c8 \uc601\ud5a5\ub825 \ub9e4\uc6b0 \ub192\uc74c)
   \ud3c9\uac00 \ud56d\ubaa9: \ubbf8\uc220 \uad00\ub828 \uc18c\uc591, \ucc3d\uc758\uc131, \ud45c\ud604 \ub2a5\ub825, \ubbf8\uc220\ud65c\ub3d9\ubcf4\uace0\uc11c \uc9c4\uc2e4\uc131
   \ubc29\uc2dd: \uba74\uc811 \uc804 \uc57d 24\ubd84 \ubb38\uc81c \ud480\uc774\u00b7\uc900\ube44 \u2192 \uba74\uc811\uc704\uc6d0 \ub2e4\uc218 : \uc218\ud5d8\uc0dd 1\uba85, \uc57d 12\ubd84 \uc9c4\ud589
   \ub0b4\uc6a9: \uc870\ud615 \ub2a5\ub825 \ud3c9\uac00(\ub4dc\ub85c\uc789 \ub4f1) + \ubbf8\uc220\ud65c\ub3d9\ubcf4\uace0\uc11c \uae30\ubc18 \uc9c8\uc758\uc751\ub2f5 \uacb0\ud569 \ud615\ud0dc

\u25a0 \ud3c9\uac00 \uc8fc\uc548\uc810
   1. \ud559\uc5c5\uc758 \uae4a\uc774: \uad50\uacfc \uc131\uc801\uc758 \ub192\uace0 \ub0ae\uc74c\ubcf4\ub2e4 \uc218\uc5c5 \ub0b4 \uc9c0\uc801 \ud638\uae30\uc2ec\uc744 \uc5b4\ub5bb\uac8c \uc2ec\ud654 \ud0d0\uad6c\ub85c \uc5f0\uacb0\ud588\ub294\uc9c0
   2. \uae30\ub85d\uc758 \uc5f0\uacc4\uc131: 1\ud559\ub144\ubd80\ud130 3\ud559\ub144\uae4c\uc9c0 \uc804\uacf5\uc5d0 \ub300\ud55c \uad00\uc2ec\uc774 \uc5b4\ub5bb\uac8c \ubcc0\ubaa8\u00b7\uc2ec\ud654\ub418\uc5c8\ub294\uc9c0 '\ub9e5\ub77d' \ud655\uc778
   3. \ubbf8\uc220\uacc4\uc5f4 \ud2b9\uc774\uc0ac\ud56d: \ubbf8\uc220\ud65c\ub3d9\ubcf4\uace0\uc11c\uc5d0\uc11c \uc608\uc220\uc801 \uc18c\uc591\u00b7\ucc3d\uc758\uc131\u00b7\ubb38\uc81c \ud574\uacb0 \uacfc\uc815\uc744 \uad6c\uccb4\uc801\uc73c\ub85c \uae30\uc220 \ud544\uc218
   4. \uc218\ub2a5\ucd5c\uc800 \uad00\ub9ac: \uc778\ubb38\u00b7\uc790\uc5f0\uacc4\uc5f4\uc740 \uc11c\ub958 \uc900\ube44\uc640 \uc218\ub2a5 3\uac1c \uc601\uc5ed \ud569 8 \uad00\ub9ac\uac00 \ub3d9\uc2dc\uc5d0 \ud544\uc694

\u25a0 \ud0c1\uc6d4\uc131(A) \ud310\ub2e8 \uae30\uc900 (5~7\ub2e8\uacc4 \ucc99\ub3c4)
   \ud0c1\uc6d4(A): \ubb38\uc81c \uc758\uc2dd\uc744 \uc2a4\uc2a4\ub85c \ubc1c\uacac\ud558\uace0 \ub3c5\uc11c\u00b7\uc2e4\ud5d8\u00b7\ud1a0\ub860 \ub4f1 \ub2e4\uc591\ud55c \ub9e4\uccb4\u00b7\ud65c\ub3d9\uc73c\ub85c \ub3c5\ucc3d\uc801 \ud574\uacb0\ucc45 \ub3c4\ucd9c
   \ubcf4\ud1b5(C): \uc8fc\uc5b4\uc9c4 \uad50\uc721\uacfc\uc815 \ub0b4 \ud65c\ub3d9\uc5d0 \ucda9\uc2e4 \ucc38\uc5ec\ud588\uc73c\ub098 \uc8fc\uc81c \ud655\uc7a5\u00b7\uc2ec\ud654 \ub178\ub825\uc774 \ubd80\uc871

\u25a0 \uacc4\uc5f4\ubcc4 \uad8c\uc7a5 \uc774\uc218 \uacfc\ubaa9
   \uc778\ubb38\uacc4\uc5f4: \uad6d\uc5b4, \uc601\uc5b4, \uc0ac\ud68c \uad00\ub828 \uc2ec\ud654\uacfc\ubaa9 (\uacbd\uc81c, \uc815\uce58\uc640 \ubc95, \uc0ac\ud68c\ubb38\ud654 \ub4f1)
   \uc790\uc5f0\uacc4\uc5f4: \uc218\ud559(\ubbf8\uc801\ubd84, \uae30\ud558), \uacfc\ud559(\ubb3c\ub9ac\ud559\u00b7\ud654\ud559\u00b7\uc0dd\uba85\uacfc\ud559 \uc911 \uc804\uacf5 \ubc00\uc811 \uacfc\ubaa9) \uc704\uacc4\uc801 \uc774\uc218
   \ubbf8\uc220\uacc4\uc5f4: \ubbf8\uc220 \ucc3d\uc791\u00b7\ubbf8\uc220\uc0ac\u00b7\ub4dc\ub85c\uc789 \ub4f1 \uc608\uccb4\ub2a5 \uad50\uacfc + \uad6d\uc5b4\u00b7\uc601\uc5b4\u00b7\uc0ac\ud68c \uae30\ucd08 \uc5ed\ub7c9

\u25a0 \ud3c9\uac00 \uc8fc\uc548\uc810 (\uc885\ud569)
   1. \ud559\uc5c5\u00b7\uc9c4\ub85c \ub3d9\uc77c \ube44\uc911(\uac01 40%): \ud559\uc5c5\uc131\ucde8\uc640 \uc804\uacf5 \uad00\ub828 \ud0d0\uc0c9\uc774 \ub3d9\ub4f1\ud558\uac8c \uc911\uc694
   2. \uc218\ub2a5\ucd5c\uc800 \uc804\ub7b5: \uc778\ubb38\u00b7\uc790\uc5f0\uacc4\uc5f4 \uc11c\uc6b8\ucea0\ud37c\uc2a4\ub294 3\uac1c \ud569 8\uc774 \ud544\uc218 \u2014 \ub0b4\uc2e0 \uad00\ub9ac\uc640 \uc218\ub2a5 \uc900\ube44 \ubcd1\ud589
   3. \ubbf8\uc220\uacc4\uc5f4 \uba74\uc811 60%: 2\ub2e8\uacc4\uc5d0\uc11c \uba74\uc811\uc774 \ub2f9\ub77d\uc744 \uc88c\uc6b0 \u2014 \ubbf8\uc220\ud65c\ub3d9\ubcf4\uace0\uc11c\uc640 \uc870\ud615 \ub2a5\ub825 \uc9d1\uc911 \uc900\ube44
   4. \uc9c4\ub85c\uc5ed\ub7c9\uc758 \uc77c\uad00\uc131: 1~3\ud559\ub144 \uc804\ubc18\uc5d0 \uac78\uce5c \uc804\uacf5 \uad00\uc2ec\uc758 \ud750\ub984\uacfc \ub9e5\ub77d\uc774 \ud575\uc2ec \ud310\ub2e8 \uae30\uc900
   5. \uc11c\ub958 100% \uc804\ud615(\uc778\ubb38\u00b7\uc790\uc5f0): \uc138\ud2b9\u00b7\ucc3d\uccb4\u00b7\ud589\ud2b9\uc758 \uc804\uacf5 \uc5f0\uacc4 \ud0d0\uad6c \uae30\ub85d\uc774 \ud569\uaca9\uc758 \uc804\ubd80
`,
      competencies: {
        academic: "\ud559\uc5c5\uc5ed\ub7c9(\uae30\ucd08\ud559\uc5c5\uc131\ucde8\ub3c4\u00b7\ud559\uc5c5\ud0dc\ub3c4\u00b7\ud0d0\uad6c\ub825) \u2014 40%. \uad50\uacfc \uc131\uc801\ubcf4\ub2e4 \uc218\uc5c5 \ub0b4 \uc9c0\uc801 \ud638\uae30\uc2ec\uc744 \uc2ec\ud654 \ud0d0\uad6c\ub85c \uc5f0\uacb0\ud55c \uacfc\uc815, 1~3\ud559\ub144 \uc5f0\uacc4\uc131 \uc788\ub294 \ub9e5\ub77d \ud655\uc778",
        career: "\uc9c4\ub85c\uc5ed\ub7c9(\uc804\uacf5\uad00\ub828 \uad50\uacfc \uc774\uc218 \ub178\ub825\u00b7\uc131\ucde8\ub3c4\u00b7\uc9c4\ub85c\ud0d0\uc0c9\ud65c\ub3d9\uacfc \uacbd\ud5d8) \u2014 40%. \uc804\uacf5\uc5d0 \ub300\ud55c 1~3\ud559\ub144 \uad00\uc2ec \uc2ec\ud654 \ud750\ub984\uc758 \ub9e5\ub77d\uacfc \uc77c\uad00\uc131\uc774 \ud0c1\uc6d4\uc131 \ud575\uc2ec \ud310\ub2e8 \uae30\uc900",
        community: "\uacf5\ub3d9\uccb4\uc5ed\ub7c9(\ud611\uc5c5\u00b7\uc18c\ud1b5\u00b7\ub098\ub214\u00b7\ubc30\ub824\u00b7\uc131\uc2e4\uc131\u00b7\ub9ac\ub354\uc2ed) \u2014 20%. \ubbf8\uc220\uacc4\uc5f4: \ubbf8\uc220\uc6b0\uc218\uc790 \uba74\uc811 60%(\ucc3d\uc758\uc131\u00b7\uc870\ud615\ub2a5\ub825\u00b7\ubbf8\uc220\ud65c\ub3d9\ubcf4\uace0\uc11c \uc9c4\uc2e4\uc131) \u2014 \uc2e4\uc9c8 \ub2f9\ub77d \uc88c\uc6b0"
      },
      weights: { academic: 0.40, career: 0.40, community: 0.20 }
    },
    "\uc131\uade0\uad00\ub300\ud559\uad50": {
      factors: `
[\uc131\uade0\uad00\ub300\ud559\uad50 2025\ud559\ub144\ub3c4 \ud559\uc0dd\ubd80\uc885\ud569\uc804\ud615 \ud3c9\uac00 \uae30\uc900 \u2014 \uac00\uc774\ub4dc\ubd81 \ubc18\uc601]

\u25a0 \ubc18\uc601 \uc804\ud615: \uc735\ud569\ud615(\uad6c \uacc4\uc5f4\ubaa8\uc9d1), \ud0d0\uad6c\ud615(\uad6c \ud559\uacfc\ubaa8\uc9d1), \uacfc\ud559\uc778\uc7ac\uc804\ud615 \ub4f1

\u25a0 3\ub300 \ud3c9\uac00 \uc694\uc18c \ubc0f \ubc18\uc601 \ube44\uc728
   1. \ud559\uc5c5 \uc5ed\ub7c9 (40%): \ud559\uc5c5 \uc131\ucde8\ub3c4, \ud559\uc5c5 \ubc1c\uc804 \uc815\ub3c4, \ud559\uc5c5\uc5d0 \ub300\ud55c \uad00\uc2ec\uacfc \uc5f4\uc758
   2. \ud0d0\uad6c \uc5ed\ub7c9 (40%): \uc9c0\uc6d0 \ubd84\uc57c\uc5d0 \ub300\ud55c \uc218\ud559 \uc7ac\ub2a5\uacfc \uc5f4\uc815, \ud0d0\uad6c\ub825, \uad50\uacfc \uc774\uc218 \ud604\ud669 \ubc0f \uad00\ub828 \uacfc\ubaa9 \uc131\ucde8\ub3c4
   3. \uc7a0\uc7ac \uc5ed\ub7c9 (20%): \uc790\uae30\uc8fc\ub3c4\uc131, \uacf5\ub3d9\uccb4 \uc5ed\ub7c9(\ud611\uc5c5\u00b7\uc18c\ud1b5, \ub098\ub214\u00b7\ubc30\ub824), \ubc1c\uc804 \uac00\ub2a5\uc131

\u25a0 \ud3c9\uac00 \ubc29\ubc95: \uc11c\ub958 100% (\uc77c\ubd80 \ubaa8\uc9d1\ub2e8\uc704 \uba74\uc811 \uc2e4\uc2dc: 1\ub2e8\uacc4 \uc11c\ub958 70% + 2\ub2e8\uacc4 \uba74\uc811 30%)
   \u203b \uba74\uc811 \uc2e4\uc2dc \ud559\uacfc: \uc790\uc720\uc804\uacf5\uacc4\uc5f4, \uc758\uc608\uacfc, \uc0ac\ubc94\ub300\ud559, \uc2a4\ud3ec\uce20\uacfc\ud559\uacfc \ub4f1

\u25a0 \ud3c9\uac00 \uc8fc\uc548\uc810
   1. \uc815\uc131\uc801 \uc885\ud569\ud3c9\uac00: \ub4f1\uae09\ubfd0\ub9cc \uc544\ub2c8\ub77c \uc774\uc218\uc790 \uc218, \ud45c\uc900\ud3b8\ucc28 \ub4f1 \ub9e5\ub77d(context)\uc744 \uace0\ub824\ud55c \uc2e4\uc9c8 \uc131\ucde8\ub3c4 \ud3c9\uac00
   2. \ud0d0\uad6c\uc758 \uae4a\uc774: \uad50\uacfc \ub0b4\uc6a9\uc758 \uc790\ubc1c\uc801 \ud655\uc7a5 \ubc0f \uc2ec\ud654 \ud0d0\uad6c \uacfc\uc815 \uc911\uc2dc
   3. \uad50\uacfc \uc774\uc218 \ucda9\uc2e4\ub3c4: \uc804\uacf5(\uacc4\uc5f4) \uad00\ub828 \uacfc\ubaa9\uc758 \uc8fc\ub3c4\uc801 \uc120\ud0dd\uacfc \uc774\uc218 \ub178\ub825
   4. \uc778\uacf5\uc9c0\ub2a5/\ucca8\ub2e8\ubd84\uc57c: \uc218\ud559 \ubc0f \uacfc\ud559 \uad50\uacfc \uc5ed\ub7c9\uacfc \ud0d0\uad6c \uacbd\ud5d8\uc758 \uc5f0\uacc4\uc131 \uac15\uc870
`,
      competencies: {
        academic: "\ud559\uc5c5\uc5ed\ub7c9(\ud559\uc5c5\uc131\ucde8\ub3c4\u00b7\ubc1c\uc804\uc815\ub3c4\u00b7\ud559\uc5c5\ud0dc\ub3c4) \u2014 40%",
        career: "\ud0d0\uad6c\uc5ed\ub7c9(\uc804\uacf5\uad00\ub828 \ud0d0\uad6c\ub825\u00b7\uad50\uacfc\uc774\uc218\ud604\ud669\u00b7\uacfc\ubaa9\uc131\ucde8\ub3c4) \u2014 40%",
        community: "\uc7a0\uc7ac\uc5ed\ub7c9(\uc790\uae30\uc8fc\ub3c4\uc131\u00b7\uacf5\ub3d9\uccb4\uc5ed\ub7c9\u00b7\ubc1c\uc804\uac00\ub2a5\uc131) \u2014 20%"
      },
      weights: { academic: 0.40, career: 0.40, community: 0.20 }
    },
    "\uad6d\ubbfc\ub300\ud559\uad50": {
      factors: `
[\uad6d\ubbfc\ub300\ud559\uad50 2026\ud559\ub144\ub3c4 \ud559\uc0dd\ubd80\uc885\ud569\uc804\ud615 \ud3c9\uac00 \uae30\uc900 \u2014 \uac00\uc774\ub4dc\ubd81 \ubc18\uc601]

\u25a0 \ubc18\uc601 \uc804\ud615: \uad6d\ubbfc\ud504\ub7f0\ud2f0\uc5b4\uc804\ud615, \ud559\uad50\uc0dd\ud65c\uc6b0\uc218\uc790\uc804\ud615 \ub4f1

\u25a0 3\ub300 \ud3c9\uac00 \uc694\uc18c \ubc0f \ubc18\uc601 \ube44\uc728
   1. \uc804\uacf5\uc801\ud569\uc131 (55%):
      - \uc804\uacf5 \uad00\ub828 \uad50\uacfc \uc131\ucde8\ub3c4, \uc774\uc218 \ub178\ub825, \uc9c4\ub85c \ud0d0\uc0c9 \ud65c\ub3d9\uacfc \uacbd\ud5d8 (40%)
      - \ud559\uc5c5 \ub2a5\ub825: \uc804\ubc18\uc801\uc778 \ud559\uc5c5 \uc131\ucde8\ub3c4 \ubc0f \uc790\uae30\uc8fc\ub3c4\uc801 \ud559\uc5c5 \ud0dc\ub3c4 (15%)
   2. \uc790\uae30\uc8fc\ub3c4\uc131 \ubc0f \ub3c4\uc804\uc815\uc2e0 (25%):
      - \uc790\uae30\uc8fc\ub3c4\uc131(\ud0d0\uad6c\ub825): \uc2a4\uc2a4\ub85c \ubb38\uc81c\ub97c \uc124\uc815\ud558\uace0 \ud574\uacb0\ud558\ub824\ub294 \ub178\ub825 (15%)
      - \ubc1c\uc804 \uac00\ub2a5\uc131: \ud65c\ub3d9\uc744 \ud1b5\ud55c \uae0d\uc815\uc801\uc778 \ubcc0\ud654\uc640 \uc131\uc7a5 \uac00\ub2a5\uc131 (10%)
   3. \uc778\uc131 (20%):
      - \uacf5\ub3d9\uccb4\uc758\uc2dd \ubc0f \ud611\ub3d9\ub2a5\ub825: \ud611\uc5c5, \uc18c\ud1b5, \ub098\ub214, \ubc30\ub824, \ub9ac\ub354\uc2ed, \uc131\uc2e4\uc131 (20%)

\u25a0 \ud3c9\uac00 \ubc29\ubc95: 1\ub2e8\uacc4 \uc11c\ub958 100% (3\ubc30\uc218) \u2192 2\ub2e8\uacc4 1\ub2e8\uacc4 \uc131\uc801 70% + \uba74\uc811 30%

\u25a0 \ud3c9\uac00 \uc8fc\uc548\uc810
   1. \uc804\uacf5\ubcc4 \ud575\uc2ec \uc774\uc218\uacfc\ubaa9 \ucda9\uc2e4\ub3c4: \uad8c\uc7a5 \uc774\uc218 \uacfc\ubaa9 \uc120\ud0dd \ubc0f \ud0d0\uad6c \uc131\uacfc \uac15\uc870
   2. \ud0d0\uad6c\uc758 \uc9c0\uc18d\uc131: \ud559\uad50 \uc218\uc5c5 \ub0b4 \ub2a5\ub3d9\uc801 \ud0d0\uad6c \uacfc\uc815 \ubc0f \uc9c0\uc18d\uc801\uc778 \ud65c\ub3d9 \uc591\uc0c1
   3. \uba74\uc811 \uc9c4\uc704 \ud655\uc778 (8\ub300 \uc9c8\ubb38): \uc544\uc774\uc2a4\ube0c\ub808\uc774\ud0b9, \uc2e4\uc0ac\ub840 \ud655\uc778, \uacfc\ubaa9 \uc120\ud0dd \uc774\uc720, \uc5f0\uad6c \ubc29\ubc95 \uc774\ud574\ub3c4, \uc5ed\ud560/\ubc30\uc6c0, \uc5ed\ub7c9, \uc9c0\uc2dd \ud68d\ub4dd, \ud0d0\uad6c\ub825 \uac80\uc99d
`,
      competencies: {
        academic: "\uc804\uacf5\uc801\ud569\uc131(\uc804\uacf5\uad00\ub828 \uc131\ucde8\ub3c4\u00b7\uc774\uc218\ub178\ub825\u00b7\ud559\uc5c5\ub2a5\ub825) \u2014 55%",
        career: "\uc790\uae30\uc8fc\ub3c4\uc131 \ubc0f \ub3c4\uc804\uc815\uc2e0(\ud0d0\uad6c\ub825\u00b7\ubc1c\uc804\uac00\ub2a5\uc131) \u2014 25%",
        community: "\uc778\uc131(\uacf5\ub3d9\uccb4\uc758\uc2dd\u00b7\ud611\ub3d9\ub2a5\ub825\u00b7\uc131\uc2e4\uc131) \u2014 20%"
      },
      weights: { academic: 0.55, career: 0.25, community: 0.20 }
    },
    "\uc22d\uc2e4\ub300\ud559\uad50": {
      factors: `
[\uc22d\uc2e4\ub300\ud559\uad50 2026\ud559\ub144\ub3c4 \ud559\uc0dd\ubd80\uc885\ud569\uc804\ud615 \ud3c9\uac00 \uae30\uc900 \u2014 \uac00\uc774\ub4dc\ubd81 \ubc18\uc601]

\u25a0 \ubc18\uc601 \uc804\ud615: SSU\ubbf8\ub798\uc778\uc7ac\uc804\ud615, SW\uc6b0\uc218\uc790\uc804\ud615 \ub4f1

\u25a0 3\ub300 \ud3c9\uac00 \uc694\uc18c \ubc0f \ubc18\uc601 \ube44\uc728 (\uc11c\ub958\ud3c9\uac00)
   1. \uc9c4\ub85c\uc5ed\ub7c9 (50%):
      - \uc804\uacf5 \uad00\ub828 \uad50\uacfc \uc131\ucde8\ub3c4: \uad00\ub828 \uacfc\ubaa9 \uc774\uc218 \ub178\ub825 \ubc0f \uc131\ucde8 \uc218\uc900
      - \uc804\uacf5 \ud0d0\uc0c9 \ud65c\ub3d9 \ubc0f \uacbd\ud5d8: \uad00\uc2ec \ubd84\uc57c\uc5d0 \ub300\ud55c \uad6c\uccb4\uc801 \ud65c\ub3d9\uc758 \ud655\uc7a5\uc131
      - \ubaa9\ud45c \uc9c0\ud5a5\uc131: \ubaa9\ud45c\ub97c \ud5a5\ud55c \uc758\uc9c0\uc640 \ub178\ub825
   2. \uacf5\ub3d9\uccb4\uc5ed\ub7c9 (30%):
      - \uc778\uc131 \ubc0f \ud611\uc5c5 \ub2a5\ub825: \uacf5\ub3d9\uccb4 \uba64\ubc84\ub85c\uc11c\uc758 \ubc14\ub978 \uc131\ud488\uacfc \ud611\ub825 \ud0dc\ub3c4
      - \ub098\ub214\uacfc \ubc30\ub824, \ub9ac\ub354\uc2ed: \ud0c0\uc778 \uc874\uc911 \ubc0f \uacf5\ub3d9\uccb4 \uae30\uc5ec \ub9ac\ub354\uc2ed
      - \uc22d\uc2e4 \uc815\uc2e0: \ud611\ub825\uc801 \uc18c\ud1b5\ub2a5\ub825 \ubc0f \uc131\uc2e4\uc131
   3. \ud559\uc5c5\uc5ed\ub7c9 (20%):
      - \ud559\uc5c5 \uc131\ucde8\ub3c4: \uc804\uccb4 \ubc0f \uc804\uacf5 \uad00\ub828 \uad50\uacfc \uc131\uc801 \ucd94\uc774
      - \ud559\uc5c5 \ud0dc\ub3c4 \ubc0f \uc9c0\uc801 \ud638\uae30\uc2ec: \uc790\uae30\uc8fc\ub3c4\uc801 \ud559\uc2b5 \uc758\uc9c0\uc640 \ud0d0\uad6c\uc2ec
      - \ubc1c\uc804 \uc815\ub3c4: \ud559\uae30\ubcc4 \uc131\uc801 \ubcc0\ud654 \ubc0f \ud559\uc5c5 \uc218\ud589 \ub2a5\ub825 \ud5a5\uc0c1\ub3c4

\u25a0 \ud3c9\uac00 \ubc29\ubc95: 1\ub2e8\uacc4 \uc11c\ub958 100% (3\ubc30\uc218) \u2192 2\ub2e8\uacc4 1\ub2e8\uacc4 \uc131\uc801 50% + \uba74\uc811 50%
   \u203b 2026\ud559\ub144\ub3c4\ubd80\ud130 \uba74\uc811 \ubc18\uc601 \ube44\uc728 50%\ub85c \uac15\ud654

\u25a0 \ud3c9\uac00 \uc8fc\uc548\uc810
   1. \uba74\uc811 \ubcc0\ubcc4\ub825 \uac15\ud654: \uc11c\ub958 \uc9c4\uc704 \uac80\uc99d \ubc0f \uc7a0\uc7ac\ub825 \ud655\uc778 (\uc804\uacf5\uc801\ud569\uc131 50%, \uc778\uc131/\uc7a0\uc7ac\ub825 50%)
   2. \uc9c4\ub85c \uc5f0\uacc4\uc131: \uc9c0\uc6d0 \ud559\uacfc \uad00\ub828 \uacfc\ubaa9\uc758 \uc8fc\ub3c4\uc801 \ud559\uc2b5 \uacfc\uc815\uacfc \uc131\ucde8 \uc911\uc2dc
   3. \uc22d\uc2e4 \uc778\uc7ac\uc0c1: \uae30\ub3c5\uad50 \uc815\uc2e0\uc5d0 \uae30\ubc18\ud55c \ud611\ub825\uc801 \uc18c\ud1b5\uacfc \uc131\uc2e4\ud55c \ud0dc\ub3c4 \uac15\uc870
`,
      competencies: {
        academic: "\ud559\uc5c5\uc5ed\ub7c9(\ud559\uc5c5\uc131\ucde8\ub3c4\u00b7\ud0dc\ub3c4\u00b7\uc9c0\uc801\ud638\uae30\uc2ec) \u2014 20%",
        career: "\uc9c4\ub85c\uc5ed\ub7c9(\uc804\uacf5\uad00\ub828 \uc131\ucde8\ub3c4\u00b7\ud0d0\uc0c9\ud65c\ub3d9\u00b7\ubaa9\ud45c\uc758\uc2dd) \u2014 50%",
        community: "\uacf5\ub3d9\uccb4\uc5ed\ub7c9(\uc778\uc131\u00b7\ud611\uc5c5\u00b7\ub9ac\ub354\uc2ed\u00b7\uc22d\uc2e4\uc815\uc2e0) \u2014 30%"
      },
      weights: { academic: 0.20, career: 0.50, community: 0.30 }
    },
    "\uc138\uc885\ub300\ud559\uad50": {
      factors: `
[\uc138\uc885\ub300\ud559\uad50 2026\ud559\ub144\ub3c4 \ud559\uc0dd\ubd80\uc885\ud569\uc804\ud615 \ud3c9\uac00 \uae30\uc900 \u2014 \uac00\uc774\ub4dc\ubd81 \ubc18\uc601]

\u25a0 \ubc18\uc601 \uc804\ud615: \uc138\uc885\ucc3d\uc758\uc778\uc7ac\uc804\ud615(\uba74\uc811\ud615/\uc11c\ub958\ud615) \ub4f1

\u25a0 4\ub300 \ud3c9\uac00 \uc694\uc18c \ubc0f \ubc18\uc601 \ube44\uc728 (\uba74\uc811\ud615 \uae30\uc900)
   1. \uc9c4\ub85c\uc5ed\ub7c9 (45%): \uc804\uacf5 \uad00\ub828 \uacfc\ubaa9 \uc774\uc218 \ub178\ub825, \uc131\ucde8\ub3c4, \uc804\uacf5 \ud0d0\uc0c9 \ud65c\ub3d9 \ubc0f \uacbd\ud5d8
   2. \ud559\uc5c5\uc5ed\ub7c9 (25%): \ud559\uc5c5 \uc131\ucde8\ub3c4, \ud559\uc5c5 \ud0dc\ub3c4, \ud0d0\uad6c\ub825 (\uc131\uc801 \ucd94\uc774 \ubc0f \uc9c0\uc801 \ud638\uae30\uc2ec \uc911\uc2dc)
   3. \ucc3d\uc758\uc735\ud569\uc5ed\ub7c9 (20%): \ucc3d\uc758\uc801 \ubb38\uc81c\ud574\uacb0 \ub2a5\ub825, \ub9ac\ub354\uc2ed, \uc8fc\ub3c4\uc131
   4. \uacf5\ub3d9\uccb4\uc5ed\ub7c9 (10%): \uc131\uc2e4\uc131, \ub098\ub214\uacfc \ubc30\ub824, \ud611\ub3d9 \ub2a5\ub825, \uc18c\ud1b5 \ub2a5\ub825

\u25a0 \ud3c9\uac00 \ubc29\ubc95
   - \uba74\uc811\ud615: 1\ub2e8\uacc4 \uc11c\ub958 100% (3\ubc30\uc218) \u2192 2\ub2e8\uacc4 1\ub2e8\uacc4 60% + \uba74\uc811 40%
   - \uc11c\ub958\ud615: \uc11c\ub958 100% \ud3c9\uac00 (\ud559\uc5c5\uc5ed\ub7c9 45% \ube44\uc911\uc73c\ub85c \uc0c1\ud5a5)

\u25a0 \ud559\uacfc\ubcc4 \ud3c9\uac00 \uc8fc\uc548\uc810
   1. \uc778\uacf5\uc9c0\ub2a5/\uc18c\ud504\ud2b8\uc6e8\uc5b4: \ucc3d\uc758\uc735\ud569 \uc5ed\ub7c9 \uac15\uc870, \uc2e4\uc81c \ucf54\ub529 \uacbd\ud5d8 \ubc0f \ubb38\uc81c\ud574\uacb0 \uacfc\uc815\uc758 \ub17c\ub9ac\uc131 \ud3c9\uac00
   2. \ud638\ud154\uad00\uad11/\uae00\ub85c\ubc8c: \uc11c\ube44\uc2a4 \ub9c8\uc778\ub4dc, \uae00\ub85c\ubc8c \uc18c\ud1b5 \ub2a5\ub825, \ud638\ud154/\uad00\uad11 \uc0b0\uc5c5\uc5d0 \ub300\ud55c \uc804\ubb38\uc801 \uad00\uc2ec
   3. \uacf5\uacfc/\uc790\uc5f0\uacfc\ud559: \uae30\ucd08 \uacfc\ud559 \ubc0f \uc218\ud559 \uc5ed\ub7c9, \uc2e4\ud5d8 \ubc0f \ud0d0\uad6c \ud65c\ub3d9\uc758 \uae4a\uc774\uc640 \uc9c0\uc18d\uc131
   4. \uad6d\ubc29/\uc0ac\uc774\ubc84\ubcf4\uc548: \ud22c\ucca0\ud55c \uad6d\uac00\uad00\uacfc \ucc45\uc784\uac10, \ubcf4\uc548 \ubc0f \uc2dc\uc2a4\ud15c \uad6c\ucd95\uc5d0 \ub300\ud55c \uc9c4\uc2e4\uc131
`,
      competencies: {
        academic: "\ud559\uc5c5\uc5ed\ub7c9(\uc131\ucde8\ub3c4\u00b7\ud0dc\ub3c4\u00b7\ud0d0\uad6c\ub825) \u2014 25%",
        career: "\uc9c4\ub85c\uc5ed\ub7c9(\uc804\uacf5\uad00\ub828 \uc774\uc218\ub178\ub825\u00b7\uc131\ucde8\ub3c4\u00b7\ud0d0\uc0c9\uacbd\ud5d8) \u2014 45%",
        community: "\ucc3d\uc758\uc735\ud569/\uacf5\ub3d9\uccb4\uc5ed\ub7c9(\ubb38\uc81c\ud574\uacb0\u00b7\ub9ac\ub354\uc2ed\u00b7\ub098\ub214\u00b7\ubc30\ub824) \u2014 30%"
      },
      weights: { academic: 0.25, career: 0.45, community: 0.30 }
    },
    "\ub2e8\uad6d\ub300\ud559\uad50": {
      factors: `
[\ub2e8\uad6d\ub300\ud559\uad50 2026\ud559\ub144\ub3c4 \ud559\uc0dd\ubd80\uc885\ud569\uc804\ud615 \ud3c9\uac00 \uae30\uc900 \u2014 \uac00\uc774\ub4dc\ubd81 \ubc18\uc601]

\u25a0 \ubc18\uc601 \uc804\ud615: DKU\uc778\uc7ac\uc804\ud615(\uc11c\ub958\ud615/\uba74\uc811\ud615), SW\uc778\uc7ac\uc804\ud615 \ub4f1

\u25a0 5\ub300 \ud3c9\uac00 \uc694\uc18c \ubc0f \ubc18\uc601 \ube44\uc728 (\uc11c\ub958\ud615 \uae30\uc900)
   1. \ud559\uc5c5\uc131\ucde8\ub3c4 (25%): \uc804\uccb4 \uad50\uacfc \uc131\ucde8\ub3c4 \ubc0f \ud559\uae30\ubcc4 \uc131\uc801 \ucd94\uc774
   2. \ud0d0\uad6c\ub825 (20%): \uc790\uae30\uc8fc\ub3c4\uc801 \ud0d0\uad6c \uc758\uc9c0, \uc9c0\uc801 \ud638\uae30\uc2ec, \ubb38\uc81c\ud574\uacb0 \ub2a5\ub825
   3. \uc9c4\ub85c\ud0d0\uc0c9\ud65c\ub3d9\uacfc \uacbd\ud5d8 (20%): \uc804\uacf5 \uad00\ub828 \ud65c\ub3d9\uc758 \uad6c\uccb4\uc131, \ub178\ub825, \uacb0\uacfc\uc758 \uc9c8
   4. \uc9c4\ub85c\uc758\uc9c0/\uc131\uc7a5\uc758\uc9c0 (15%): \uc804\uacf5\uc5d0 \ub300\ud55c \uad00\uc2ec\ub3c4, \uacfc\ubaa9 \uc120\ud0dd\uc758 \uc801\uc808\uc131
   5. \uacf5\ub3d9\uccb4\uc5ed\ub7c9 (20%): \ub3c4\ub355\uc131/\uc131\uc2e4\uc131(10%) + \ud611\uc5c5/\uc18c\ud1b5\ub2a5\ub825(10%)

\u25a0 \ud3c9\uac00 \ubc29\ubc95
   - \uc11c\ub958\ud615: \uc11c\ub958 100% (\ud65c\ub3d9\uc758 \uc9c4\uc815\uc131\uacfc \uc9c0\uc18d\uc131 \uc911\uc2dc)
   - \uba74\uc811\ud615: 1\ub2e8\uacc4 \uc11c\ub958 100% (3\ubc30\uc218) \u2192 2\ub2e8\uacc4 1\ub2e8\uacc4 70% + \uba74\uc811 30%

\u25a0 \ud559\uacfc\ubcc4 \ud3c9\uac00 \uc8fc\uc548\uc810
   1. \uad11\uc5ed\ubaa8\uc9d1\ub2e8\uc704: \ud2b9\uc815 \uc804\uacf5\uc5d0 \uc5bd\ub9e4\uc774\uc9c0 \uc54a\ub294 \ud3ed\ub113\uc740 \uae30\ucd08 \ud559\uc5c5 \uc5ed\ub7c9\uacfc \uc790\uae30\uc8fc\ub3c4\uc801 \uc131\uc7a5\uc758\uc9c0 \uac15\uc870
   2. \uc758\ud559/\ubcf4\uac74/\uc0dd\uba85: \ud654\ud559/\uc0dd\uba85\uacfc\ud559 \ub4f1 \uae30\ucd08 \uacfc\ud559 \uc5ed\ub7c9, \uc0dd\uba85 \uc874\uc911 \uc758\uc2dd \ubc0f \ub192\uc740 \ub3c4\ub355\uc801 \uae30\uc900
   3. SW/AI/\ubc18\ub3c4\uccb4/\uacf5\ud559: \uc218\ud559\uc801 \uc0ac\uace0\ub825, \uc54c\uace0\ub9ac\uc998 \uad6c\ud604/\uc124\uacc4 \uacfc\uc815\uc758 \ub17c\ub9ac\uc131, \uae30\uc220 \uc735\ud569 \ud0dc\ub3c4
   4. \uc0ac\ubc94\ub300\ud559: \ud574\ub2f9 \uad50\uacfc\uc5d0 \ub300\ud55c \uae4a\uc774 \uc788\ub294 \uc774\ud574, \uad50\uc721\uc790\ub85c\uc11c\uc758 \uc790\uc9c8 \ubc0f \uc18c\ud1b5/\uacf5\uac10 \ub2a5\ub825
   5. \uc778\ubb38/\uc0ac\ud68c/\uacbd\uc601: \ube44\ud310\uc801 \uc0ac\uace0, \ud14d\uc2a4\ud2b8 \ubd84\uc11d \ub2a5\ub825, \uc0ac\ud68c \ud604\uc0c1\uc5d0 \ub300\ud55c \ud1b5\ucc30 \ubc0f \uc9c4\ucde8\uc801 \uc9c4\ub85c\uc758\uc9c0
`,
      competencies: {
        academic: "\ud559\uc5c5\uc5ed\ub7c9(\ud559\uc5c5\uc131\ucde8\ub3c4\u00b7\ud0d0\uad6c\ub825) \u2014 45%",
        career: "\uc9c4\ub85c\uc5ed\ub7c9(\uc9c4\ub85c\ud0d0\uc0c9\ud65c\ub3d9\u00b7\uacbd\ud5a5\u00b7\uc9c4\ub85c\uc758\uc9c0) \u2014 35%",
        community: "\uacf5\ub3d9\uccb4\uc5ed\ub7c9(\ub3c4\ub355\uc131\u00b7\uc131\uc2e4\uc131\u00b7\ud611\uc5c5\u00b7\uc18c\ud1b5) \u2014 20%"
      },
      weights: { academic: 0.45, career: 0.35, community: 0.20 }
    },
    "\uc804\ubd81\ub300\ud559\uad50": {
      factors: `
[\uc804\ubd81\ub300\ud559\uad50 2026\ud559\ub144\ub3c4 \ud559\uc0dd\ubd80\uc885\ud569\uc804\ud615 \uc11c\ub958\ud3c9\uac00 \uae30\uc900]

\u25a0 \ud3c9\uac00 \ubc29\ubc95
   - \uc9c0\uc6d0\uc790 1\uc778\uc5d0 \ub300\ud574 \ub2e4\uc218\uc758 \uc785\ud559\uc0ac\uc815\uad00\uc774 \uc81c\ucd9c\ub41c \uc11c\ub958\ub97c \ubc14\ud0d5\uc73c\ub85c \uc815\uc131\uc801 \uc885\ud569 \ud3c9\uac00(\ube14\ub77c\uc778\ub4dc \ud3c9\uac00) \uc2e4\uc2dc

\u25a0 3\ub300 \ud3c9\uac00 \uc694\uc18c \ubc0f \ubc18\uc601 \ube44\uc728
   1. \ud559\uc5c5\uc5ed\ub7c9 (40%): \ud559\uc5c5\uc131\ucde8\ub3c4, \ud559\uc5c5\ud0dc\ub3c4, \ud0d0\uad6c\ub825
   2. \uc9c4\ub85c\uc5ed\ub7c9 (40%): \uacc4\uc5f4(\uc804\uacf5) \uad00\ub828\uad50\uacfc \uc774\uc218 \ub178\ub825, \uacc4\uc5f4(\uc804\uacf5) \uad00\ub828\uad50\uacfc \uc131\ucde8\ub3c4, \uc9c4\ub85c\ud0d0\uc0c9 \ud65c\ub3d9\uacfc \uacbd\ud5d8
   3. \uacf5\ub3d9\uccb4 \uc5ed\ub7c9 (20%): \ud611\uc5c5\uacfc \uc18c\ud1b5\ub2a5\ub825, \ub098\ub214\uacfc \ubc30\ub824, \uc131\uc2e4\uc131\uacfc \uaddc\uce59\uc900\uc218, \ub9ac\ub354\uc2ed

\u25a0 \ud3c9\uac00 \uc8fc\uc548\uc810
   [\ud559\uc5c5\uc5ed\ub7c9]
   - \ud559\uc5c5\uc131\ucde8\ub3c4: \uace0\uad50 \uad50\uc721\uacfc\uc815\uc5d0\uc11c \uc774\uc218\ud55c \uad50\uacfc\uc758 \uc804\ubc18\uc801\uc778 \uc131\ucde8\uc218\uc900\uc774\ub098 \ud559\uc5c5 \ubc1c\uc804\uc758 \uc815\ub3c4\ub97c \ud3c9\uac00
   - \ud559\uc5c5\ud0dc\ub3c4: \ud559\uc5c5\uc744 \ucda9\uc2e4\ud788 \uc218\ud589\ud558\uace0 \uc8fc\ub3c4\uc801\uc73c\ub85c \ud559\uc2b5\ud574 \ub098\uac00\ub824\ub294 \uc758\uc9c0\uc640 \ub178\ub825
   - \ud0d0\uad6c\ub825: \uc9c0\uc801 \ud638\uae30\uc2ec\uc744 \ubc14\ud0d5\uc73c\ub85c \uc0ac\ubb3c\uacfc \ud604\uc0c1\uc5d0 \ub300\ud574 \uae4a\uc774 \ud0d0\uad6c\ud558\uace0, \ubb38\uc81c\ub97c \ud574\uacb0\ud558\ub824\ub294 \ub178\ub825

   [\uc9c4\ub85c\uc5ed\ub7c9]
   - \uacc4\uc5f4(\uc804\uacf5) \uad00\ub828\uad50\uacfc \uc774\uc218 \ub178\ub825: \uace0\uad50 \uad50\uc721\uacfc\uc815\uc5d0\uc11c \uc9c0\uc6d0 \uacc4\uc5f4(\uc804\uacf5)\uc5d0 \ud544\uc694\ud55c \uacfc\ubaa9\uc744 \uc801\uadf9\uc801\uc73c\ub85c \uc120\ud0dd\ud558\uc5ec \uc774\uc218\ud55c \uc815\ub3c4 \ud3c9\uac00
   - \uacc4\uc5f4(\uc804\uacf5) \uad00\ub828\uad50\uacfc \uc131\ucde8\ub3c4: \uacc4\uc5f4(\uc804\uacf5)\uc5d0 \ud544\uc694\ud55c \uacfc\ubaa9\uc744 \uc218\uac15\ud558\uace0 \ucde8\ub4dd\ud55c \uc2e4\uc81c \ud559\uc5c5\uc131\ucde8 \uc218\uc900
   - \uc9c4\ub85c\ud0d0\uc0c9 \ud65c\ub3d9\uacfc \uacbd\ud5d8: \uc790\uc2e0\uc758 \uc9c4\ub85c\ub97c \ud0d0\uc0c9\ud558\ub294 \uacfc\uc815\uc5d0\uc11c \uc774\ub8e8\uc5b4\uc9c4 \ub2e4\uc591\ud55c \ud65c\ub3d9\uc774\ub098 \uacbd\ud5d8, \uadf8\ub9ac\uace0 \uadf8\uc5d0 \uae30\uc6b8\uc778 \ub178\ub825\uc758 \uc815\ub3c4\ub97c \uc885\ud569\uc801\uc73c\ub85c \ud3c9\uac00

   [\uacf5\ub3d9\uccb4 \uc5ed\ub7c9]
   - \ud611\uc5c5\uacfc \uc18c\ud1b5\ub2a5\ub825: \uacf5\ub3d9\uccb4\uc758 \ubaa9\ud45c\ub97c \ub2ec\uc131\ud558\uae30 \uc704\ud574 \ud611\ub825\ud558\uba70, \uad6c\uc131\uc6d0\ub4e4\uacfc \ud569\ub9ac\uc801\uc73c\ub85c \uc758\uc0ac\uc18c\ud1b5\ud560 \uc218 \uc788\ub294 \ub2a5\ub825
   - \ub098\ub214\uacfc \ubc30\ub824: \uc0c1\ub300\ubc29\uc744 \uc874\uc911\ud558\uace0 \uc774\ud574\ud558\uba70 \uc6d0\ub9cc\ud55c \uad00\uacc4\ub97c \ud615\uc131\ud558\uace0, \ud0c0\uc778\uc744 \uc704\ud558\uc5ec \uae30\uaebc\uc774 \ub098\ub204\uc5b4 \uc8fc\uace0\uc790 \ud558\ub294 \ud0dc\ub3c4\uc640 \ud589\ub3d9
   - \uc131\uc2e4\uc131\uacfc \uaddc\uce59\uc900\uc218: \ucc45\uc784\uac10\uc744 \ubc14\ud0d5\uc73c\ub85c \uc790\uc2e0\uc758 \uc758\ubb34\ub97c \ub2e4\ud558\uace0, \uacf5\ub3d9\uccb4\uc758 \uae30\ubcf8 \uc724\ub9ac\uc640 \uc6d0\uce59\uc744 \ucca0\uc800\ud788 \uc900\uc218\ud558\ub294 \ud0dc\ub3c4
   - \ub9ac\ub354\uc2ed: \uacf5\ub3d9\uccb4\uc758 \ubaa9\ud45c \ub2ec\uc131\uc744 \uc704\ud574 \uad6c\uc131\uc6d0\ub4e4\uc758 \uc0c1\ud638\uc791\uc6a9\uc744 \uae0d\uc815\uc801\uc73c\ub85c \uc774\ub04c\uc5b4\uac00\ub294 \ub2a5\ub825

\u25a0 \ud559\uacfc(\uacc4\uc5f4)\ubcc4 \uc804\uacf5\ucc38\uace0\uad50\uacfc \ubc0f \ud3c9\uac00 \uc8fc\uc548\uc810
   - \uacf5\uacfc\ub300\ud559 (\uc804 \uacc4\uc5f4): '\uc218\ud559, \uc601\uc5b4' \uad50\uacfc \uc5ed\ub7c9\uc744 \ud575\uc2ec \uc804\uacf5\ucc38\uace0\uad50\uacfc\ub85c \uc9c0\uc815\ud558\uc5ec \ube44\uc911 \uc788\uac8c \ud3c9\uac00
   - \uc790\uc5f0\uacfc\ud559\ub300\ud559: '\uc218\ud559, \uc601\uc5b4' \uad50\uacfc \uc131\ucde8 \ubc0f \uc774\uc218 \ub178\ub825\uc744 \uac00\uc7a5 \uc911\uc694\ud558\uac8c \ud3c9\uac00
   - \ub18d\uc5c5\uc0dd\uba85\uacfc\ud559\ub300\ud559: '\uad6d\uc5b4, \uc218\ud559' \uad50\uacfc \uc5ed\ub7c9\uc744 \uc911\uc810\uc801\uc73c\ub85c \ud3c9\uac00
   - \uacbd\uc0c1\ub300\ud559: '\uad6d\uc5b4, \uc601\uc5b4' \uad50\uacfc\uc758 \ud559\uc5c5 \uc131\ucde8\ub3c4 \ubc0f \uc5ed\ub7c9\uc744 \ud575\uc2ec\uc73c\ub85c \ud3c9\uac00
   - \uc0ac\ud68c\uacfc\ud559\ub300\ud559: '\uad6d\uc5b4, \uc601\uc5b4' \uad50\uacfc \uc5ed\ub7c9\uc744 \uc911\uc2ec\uc73c\ub85c \uc804\uacf5 \uc801\ud569\uc131 \ud310\ub2e8
   - \uc778\ubb38\ub300\ud559: \uad6d\uc5b4\uad6d\ubb38/\uc601\uc5b4\uc601\ubb38/\ucca0\ud559/\uad6d\uc81c\ud559\ubd80('\uad6d\uc5b4, \uc601\uc5b4' \uc911\uc2ec), \uace0\uace0\ubb38\ud654\uc778\ub958/\ubb38\ud5cc\uc815\ubcf4/\uc0ac\ud559('\uad6d\uc5b4' \uc911\uc2ec), \uc5b4\ubb38\uacc4\uc5f4(\ud574\ub2f9 \uc804\uacf5 \uc5b8\uc5b4 + '\uad6d\uc5b4' \uc5ed\ub7c9)
   - \uc758\uc57d\u00b7\ubcf4\uac74\u00b7\uac04\ud638\u00b7\uc218\uc758\uacc4\uc5f4: \ucd5c\uc0c1\uc704\uad8c\uc758 \uae30\ubcf8 \ud559\uc5c5\uc5ed\ub7c9 \ud544\uc218. \uc8fc\ub85c '\uc218\ud559, \uc601\uc5b4'(\uc57d\ud559\uacfc\ub294 '\uc218\ud559') \uad50\uacfc\ubaa9\uc758 \uc774\uc218\uc640 \ud0c1\uc6d4\ud55c \uc131\ucde8 \uc911\uc2ec \ud3c9\uac00
   - \uc0ac\ubc94\ub300\ud559: \uad6d\uc5b4\uad50\uc721/\uc0ac\ud68c\uacfc\uad50\uc721\ud559\ubd80('\uad6d\uc5b4'), \uad50\uc721\ud559/\ub3c5\uc5b4\uad50\uc721/\uc601\uc5b4\uad50\uc721('\uad6d\uc5b4, \uc601\uc5b4'), \uacfc\ud559\uad50\uc721\ud559\ubd80/\uc218\ud559\uad50\uc721('\uc218\ud559'), \uccb4\uc721\uad50\uc721('\uccb4\uc721')
   - \uc0dd\ud65c\uacfc\ud559\ub300\ud559: '\uad6d\uc5b4' \uad50\uacfc \uc5ed\ub7c9\uc744 \ud575\uc2ec \ucc38\uace0\uacfc\ubaa9\uc73c\ub85c \ud3c9\uac00
   - \ud658\uacbd\uc0dd\uba85\uc790\uc6d0\ub300\ud559(\uc775\uc0b0): '\uc218\ud559, \uc601\uc5b4' \uad50\uacfc \uc5ed\ub7c9 \ube44\uc911 \ud3c9\uac00
   - \ub300\ud559\ubcf8\ubd80 \uc9c1\uc18d \ubc0f \uc735\ud569\uc790\uc728\uc804\uacf5: \uad6d\uc81c\uc774\uacf5/\uc774\ucc28\uc804\uc9c0/\ucca8\ub2e8\ubc29\uc704\uc0b0\uc5c5('\uc218\ud559, \uc601\uc5b4'), \uc735\ud569\uc790\uc728\uc804\uacf5\uc740 \ubb34\uc804\uacf5 \ubaa8\uc9d1\uc73c\ub85c \uc785\ud559 \ud6c4 \uc7a0\uc7ac\ub825/\uc801\uc131\uc744 \uc704\ud574 \uace0\ub978 \uae30\ucd08\uc5ed\ub7c9 \ud655\uc778
   - \uc608\uc220\ub300\ud559: \ud559\uc0dd\ubd80 \uad50\uacfc \ud3c9\uac00 \uc2dc \uad6d\uc5b4, \uc601\uc5b4, \ud55c\uad6d\uc0ac \ubc0f \ud574\ub2f9 \uc804\uacf5 \uc2e4\uae30\uad50\uacfc(\uccb4\uc721, \ubbf8\uc220, \uc74c\uc545) \ubc18\uc601
   \u203b \uc804\ubd81\ub300\ub294 \ud559\uacfc\ubcc4 \uc138\uc138\ud55c \uc778\uc7ac\uc0c1\ubcf4\ub2e4 \uc704 '\uc804\uacf5\ucc38\uace0\uad50\uacfc'\uc758 \uc774\uc218 \uc5ec\ubd80, \ud559\uc5c5 \uc131\ucde8\ub3c4, \ud0d0\uad6c \ud65c\ub3d9 \uc2e4\uc801\uc744 \uc9c4\ub85c\uc5ed\ub7c9 \ud3c9\uac00\uc758 \ud575\uc2ec \uc8fc\uc548\uc810\uc73c\ub85c \uac15\ub825\ud558\uac8c \ubc18\uc601\ud568.
`,
      competencies: {
        academic: "\ud559\uc5c5\uc5ed\ub7c9(\ud559\uc5c5\uc131\ucde8\ub3c4\u00b7\ud559\uc5c5\ud0dc\ub3c4\u00b7\ud0d0\uad6c\ub825) \u2014 40%",
        career: "\uc9c4\ub85c\uc5ed\ub7c9(\uacc4\uc5f4 \uad00\ub828\uad50\uacfc \uc774\uc218 \ub178\ub825\u00b7\uacc4\uc5f4 \uad00\ub828\uad50\uacfc \uc131\ucde8\ub3c4\u00b7\uc9c4\ub85c\ud0d0\uc0c9 \ud65c\ub3d9\uacfc \uacbd\ud5d8) \u2014 40%",
        community: "\uacf5\ub3d9\uccb4 \uc5ed\ub7c9(\ud611\uc5c5\uacfc \uc18c\ud1b5\ub2a5\ub825\u00b7\ub098\ub214\uacfc \ubc30\ub824\u00b7\uc131\uc2e4\uc131\uacfc \uaddc\uce59\uc900\uc218\u00b7\ub9ac\ub354\uc2ed) \u2014 20%"
      },
      weights: { academic: 0.40, career: 0.40, community: 0.20 }
    },
    "\uc804\ub0a8\ub300\ud559\uad50": {
      factors: `
[\uc804\ub0a8\ub300\ud559\uad50 2026\ud559\ub144\ub3c4 \ud559\uc0dd\ubd80\uc885\ud569\uc804\ud615 \uc11c\ub958\ud3c9\uac00 \uae30\uc900]

\u25a0 \uc804\ub0a8\ub300\ud559\uad50 \uc11c\ub958\ud3c9\uac00 \uc694\uc18c \ubc0f \uc8fc\uc548\uc810
   * \uc785\ud559\uc0ac\uc815\uad00 2\uc778\uc774 \uc9c0\uc6d0\uc790\uc758 \ud559\uad50\uc0dd\ud65c\uae30\ub85d\ubd80\ub97c \ubc14\ud0d5\uc73c\ub85c \ud65c\ub3d9\uc758 '\ub3d9\uae30-\uacfc\uc815-\ub178\ub825-\uacb0\uacfc'\uc640 '\ud65c\ub3d9 \uc774\ud6c4\uc758 \ubcc0\ud654'\ub97c \uc885\ud569\uc801\u00b7\uc815\uc131\uc801\uc73c\ub85c \ud3c9\uac00\ud569\ub2c8\ub2e4.

   \u2460 \uc9c4\ub85c\uc5ed\ub7c9 (40%)
   - \ud3c9\uac00 \ud56d\ubaa9: \uc9c4\ub85c\uc5d0 \ub300\ud55c \uad00\uc2ec\uacfc \uc774\ud574, \uc9c4\ub85c \ud0d0\uc0c9 \ud65c\ub3d9\uacfc \uacbd\ud5d8, \uacc4\uc5f4\u00b7\uc804\uacf5 \uad00\ub828 \uad50\uacfc \uc774\uc218 \ub178\ub825, \uacc4\uc5f4\u00b7\uc804\uacf5 \uad00\ub828 \ud559\uc5c5\uc131\ucde8
   - \ud3c9\uac00 \uc8fc\uc548\uc810:
     1. \uc9c4\ub85c\uc5d0 \ub300\ud55c \uad00\uc2ec\ub3c4\uc640 \uc774\ud574\ub3c4\ub294 \uc5b4\ub290 \uc815\ub3c4\uc778\uac00?
     2. \uc9c4\ub85c\ub97c \uc124\uc815\ud558\uace0 \ub178\ub825\ud55c \ud65c\ub3d9\uc774 \uad6c\uccb4\uc801\uc774\uace0 \uc790\ubc1c\uc801\uc778\uac00?
     3. \uc9c0\uc6d0 \uacc4\uc5f4(\uc804\uacf5)\uacfc \uad00\ub828\ub41c \uad50\uacfc\ub97c \ub3c4\uc804\uc801\uc73c\ub85c \uc774\uc218\ud558\uace0, \uc9c4\uc9c0\ud558\uac8c \ud559\uc2b5\uc5d0 \uc784\ud588\ub294\uac00?
     4. \uacc4\uc5f4(\uc804\uacf5) \uad00\ub828 \uad50\uacfc\ubaa9\uc758 \uc131\ucde8 \uc218\uc900\uacfc \ub0b4\uc6a9\uc740 \uc5b4\ub5a0\ud55c\uac00?

   \u2461 \ud559\uc5c5\uc5ed\ub7c9 (30%)
   - \ud3c9\uac00 \ud56d\ubaa9: \ud559\uc2b5\ud0dc\ub3c4, \uc790\uae30\uc8fc\ub3c4\uc801 \ud559\uc2b5\uacbd\ud5d8, \uc9c0\uc801 \ud638\uae30\uc2ec \ud574\uacb0\ubc29\uc2dd, \uc804\ubc18\uc801 \ud559\uc5c5\uc131\ucde8
   - \ud3c9\uac00 \uc8fc\uc548\uc810:
     1. \uc804\ubc18\uc801\uc778 \ud559\uc2b5\ud0dc\ub3c4\uac00 \uc801\uadf9\uc801\uc774\uace0 \ud611\ub825\uc801\uc778\uac00?
     2. \uc2a4\uc2a4\ub85c \uacc4\ud68d\ud558\uace0 \uc8fc\ub3c4\uc801\uc73c\ub85c \ud559\uc5c5\uc744 \uc218\ud589\ud588\ub294\uac00?
     3. \ud0d0\uad6c \uc758\uc9c0\ub97c \ubc14\ud0d5\uc73c\ub85c \uc9c0\uc801 \ud638\uae30\uc2ec\uc744 \ub2a5\ub3d9\uc801\uc73c\ub85c \ud574\uacb0\ud588\ub294\uac00?
     4. \uc804\ubc18\uc801\uc778 \ud559\uc5c5\uc131\ucde8 \uc218\uc900\uc740 \uc5b4\ub5a0\ud558\uba70, \uc131\ucde8\ub3c4\uac00 \ud604\uc800\ud788 \ubbf8\ud761\ud55c \uad50\uacfc\uac00 \uc788\ub294\uac00?

   \u2462 \uacf5\ub3d9\uccb4\uc5ed\ub7c9 (30%)
   - \ud3c9\uac00 \ud56d\ubaa9: \uc131\uc2e4\uc131\uacfc \uaddc\uce59 \uc900\uc218, \uc18c\ud1b5\uacfc \ud611\uc5c5\ub2a5\ub825, \ub9ac\ub354\uc2ed \ubc1c\ud718 \uacbd\ud5d8, \ub098\ub214\uacfc \ubc30\ub824 \uacbd\ud5d8
   - \ud3c9\uac00 \uc8fc\uc548\uc810:
     1. \ud559\uad50\uc0dd\ud65c\uc5d0 \uc131\uc2e4\ud788 \uc784\ud558\uace0, \uacf5\ub3d9\uccb4\uac00 \uc815\ud55c \uaddc\uce59\uc744 \uc798 \uc900\uc218\ud588\ub294\uac00?
     2. \uc0c1\ub300\ubc29\uc758 \uc758\uacac\uc744 \uacbd\uccad, \uc874\uc911\ud558\uace0 \ubaa9\ud45c \ub2ec\uc131\uc744 \uc704\ud574 \ud611\ub825\ud558\ub824\uace0 \ub178\ub825\ud588\ub294\uac00?
     3. \uc8fc\uc5b4\uc9c4 \uc5ed\ud560\uc5d0 \ucc45\uc784\uc744 \ub2e4\ud558\uace0 \ub9ac\ub354\uc2ed\uc744 \ubc1c\ud718\ud588\ub294\uac00?
     4. \ud559\uad50\uc0dd\ud65c \uc911 \ubd09\uc0ac, \ub098\ub214, \ubc30\ub824\ub97c \uc2e4\ucc9c\ud588\ub294\uac00?

\u25a0 \ud559\uacfc(\ubaa8\uc9d1\ub2e8\uc704)\ubcc4 \uc138\ubd80 \ud3c9\uac00 \uc8fc\uc548\uc810 (\ud2b9\uc815 \uad00\ub828 \uad50\uacfc \uc131\ucde8\ub3c4 \ubc0f \uc774\uc218 \ub178\ub825 \ud575\uc2ec \ud3c9\uac00)
   [\uad11\uc8fc\ucea0\ud37c\uc2a4]
   - \uc758\uc57d\u00b7\ubcf4\uac74\u00b7\uac04\ud638: \uac04\ud638(\uc601\uc5b4, \uc218\ud559, \uacfc\ud559), \uc758\ud559(\uc218\ud559, \uc0dd\uba85\uacfc\ud559), \uc218\uc758\uc608(\uc601\uc5b4, \uc218\ud559, \uc0dd\uba85\uacfc\ud559), \uc57d\ud559/\uce58\uc758\ud559(\uc218\ud559, \ud654\ud559, \uc0dd\uba85\uacfc\ud559)
   - \uacbd\uc601\ub300\ud559: \uacbd\uc601(\uc218\ud559, \uc0ac\ud68c), \uacbd\uc81c(\uc218\ud559, \uc601\uc5b4, \uc0ac\ud68c)
   - \uacf5\uacfc\ub300\ud559: \uae30\ubcf8\uc801\uc73c\ub85c \uc218\ud559 \uc5ed\ub7c9\uc744 \uc911\uc2dc\ud558\uba70, \uc138\ubd80 \uc804\uacf5\ubcc4\ub85c \ubb3c\ub9ac \ub610\ub294 \ud654\ud559 \uc5ed\ub7c9\uc744 \ub098\ub204\uc5b4 \ud3c9\uac00\ud568.
     * \uac74\ucd95, \uc0b0\uc5c5\uacf5: \uc218\ud559, \uc601\uc5b4, \uc0ac\ud68c(\uac74\ucd95\ub9cc) / \uae30\uacc4, \uc804\uc790\ucef4\ud4e8\ud130, \ud1a0\ubaa9, \uc804\uae30: \uc218\ud559, \ubb3c\ub9ac / \ud654\uacf5, \uc2e0\uc18c\uc7ac, \uc5d0\ub108\uc9c0\uc790\uc6d0: \uc218\ud559, \ubb3c\ub9ac, \ud654\ud559 / \uace0\ubd84\uc790, \ud658\uacbd\uc5d0\ub108\uc9c0, \uc0dd\ubb3c\uacf5: \uc218\ud559, \ud654\ud559(\uc0dd\ubb3c\uacf5\uc740 \uc0dd\uba85\uacfc\ud559 \ucd94\uac00)
   - \ub18d\uc5c5\uc0dd\uba85\uacfc\ud559\ub300\ud559: \uc2dd\ubb3c, \uc6d0\uc608, \uc0b0\ub9bc, \ub18d\uc0dd\uba85, \uc2dd\ud488\uacf5 \ub4f1 \ub300\ub2e4\uc218(\uc601\uc5b4, \ud654\ud559, \uc0dd\uba85\uacfc\ud559), \uc870\uacbd(\uc601\uc5b4, \uc0dd\uba85\uacfc\ud559, \uc9c0\uad6c\uacfc\ud559), \uae30\uacc4\uc2dc\uc2a4\ud15c \uad00\ub828(\uc218\ud559, \ubb3c\ub9ac), \ub18d\uc5c5\uacbd\uc81c(\uc218\ud559, \uc601\uc5b4, \uc0ac\ud68c)
   - \uc0ac\ud68c\uacfc\ud559\ub300\ud559: \uc815\uce58\uc678\uad50, \ud589\uc815, \uc2ec\ub9ac(\uc601\uc5b4, \uc0ac\ud68c), \uc0ac\ud68c\ud559(\uc601\uc5b4, \uc0ac\ud68c, \uc5ed\uc0ac), \ubb38\ud5cc\uc815\ubcf4, \ubbf8\ub514\uc5b4(\uad6d\uc5b4, \uc601\uc5b4, \uc0ac\ud68c), \uc9c0\ub9ac(\uc9c0\ub9ac), \ubb38\ud654\uc778\ub958(\uc601\uc5b4, \uc5ed\uc0ac, \uc0ac\ud68c)
   - \uc0ac\ubc94\ub300\ud559: \uc804\uacf5 \uba85\uce6d\uacfc \ub3d9\uc77c\ud55c \ud575\uc2ec \uad50\uacfc(\uad6d\uc5b4, \uc218\ud559, \ubb3c\ub9ac \ub4f1) \uc6b0\uc120 \ud3c9\uac00. \uc0dd\ubb3c\uad50\uc721\uacfc(\uc601\uc5b4, \uc0dd\uba85), \uad50\uc721\ud559(\uad6d, \uc601, \uc0ac), \uc720\uc544\uad50\uc721(\uad6d, \uc601), \uac00\uc815\uad50\uc721(\uae30\uac00, \ud654\ud559, \uc0ac\ud68c), \ud2b9\uc218\uad50\uc721(\uad6d, \uc724\ub9ac, \uc0ac)
   - \uc778\ubb38\ub300\ud559: \uac01 \ud559\ubb38 \uc9c1\uacb0 \uae30\ucd08 \uacfc\ubaa9(\uad6d\uc5b4, \uc601\uc5b4, \uc5ed\uc0ac, \uc724\ub9ac \ub4f1). \uc5b4\ubb38\uacc4\uc5f4(\ub3c5\uc5b4/\ubd88\uc5b4/\uc911\uc5b4/\uc77c\uc5b4 \ub4f1)\uc740 \uad6d\uc5b4, \uc601\uc5b4\uc640 \ubcf8 \uc804\uacf5 \uc81c2\uc678\uad6d\uc5b4 \uacfc\ubaa9 \uc774\uc218 \uc774\ub825 \ud3c9\uac00
   - \uc790\uc5f0\uacfc\ud559\ub300\ud559: \uc218\ud559(\uc218\ud559, \ubb3c\ub9ac), \ud1b5\uacc4(\uc218\ud559, \uc601\uc5b4), \ubb3c\ub9ac(\uc218\ud559, \uc601\uc5b4, \ubb3c\ub9ac), \uc0dd\uba85\uacfc\ud559\uacc4\uc5f4(\uc601\uc5b4, \ud654\ud559, \uc0dd\uba85), \ud654\ud559(\ud654\ud559 \uc911\uc2ec), \uc9c0\uad6c\ud658\uacbd(\uc218\ud559, \ubb3c\ub9ac, \uc9c0\uad6c\uacfc\ud559)
   - \uc0dd\ud65c\uacfc\ud559\ub300\ud559: \uc0dd\ud65c\ubcf5\uc9c0(\uad6d\uc5b4, \uc601\uc5b4, \uc0ac\ud68c), \uc2dd\ud488\uc601\uc591(\ud654\ud559, \uc0dd\uba85), \uc758\ub958(\uc601\uc5b4, \ud654\ud559, \uae30\uac00)
   - AI\uc735\ud569\ub300\ud559: \uc778\uacf5\uc9c0\ub2a5, \ube45\ub370\uc774\ud130(\uc218\ud559, \uc601\uc5b4), \ubbf8\ub798\ubaa8\ube4c\ub9ac\ud2f0(\uc218\ud559, \ubb3c\ub9ac)
   - \uc9c1\ud560/\uc608\uc220\ub300: \uc790\uc728\uc804\uacf5(\uad6d, \uc601 \ub4f1 \uae30\ucd08\uc5ed\ub7c9 \ubc14\ud0d5 \uc9c4\ub85c \ud0d0\uc0c9 \uc790\uc138), \uc608\uc220\uacc4\uc5f4(\uad00\ub828 \uc2e4\uae30/\uc2e4\uc801 \uad50\uacfc \ubcd1\ud589 \ud3c9\uac00)
   
   [\uc5ec\uc218\ucea0\ud37c\uc2a4]
   - \uacf5\ud559\ub300\ud559: \uacf5\ud559\uacc4\uc5f4(\uc218\ud559, \ubb3c\ub9ac, \ud654\ud559), \uac74\ucd95\ub514\uc790\uc778(\ubb3c\ub9ac, \ubbf8\uc220), \uc758\uacf5(\uc218\ud559, \uc601\uc5b4), \uc11d\uc720\ud654\ud559(\uc218\ud559, \ud654\ud559)
   - \ubb38\ud654\uc0ac\ud68c\uacfc\ud559\ub300\ud559: \uae00\ub85c\ubc8c, \ubb3c\ub958\uad50\ud1b5(\uad6d, \uc601, \uc0ac), \ubb38\ud654\ucf58\ud150\uce20(\uad6d, \uc601), \ubb38\ud654\uad00\uad11(\uc0ac\ud68c, \uc5ed\uc0ac, \uc9c0\ub9ac), \uad6d\uc81c\ud559\ubd80(\ud574\ub2f9 \uc678\uad6d\uc5b4 \uc131\ucde8\ub3c4)
   - \uc218\uc0b0\ud574\uc591/\uc9c1\ud560: \ud574\uc591\uc218\uc0b0(\uc601\uc5b4, \uc9c0\ud559, \uc0dd\uba85), \uae30\uad00(\uc218\ud559, \uc601\uc5b4), \uc870\uc120\ud574\uc591(\ubb3c\ub9ac, \uc601\uc5b4), \uc218\uc0b0\uc0dd\uba85(\ud654\ud559, \uc0dd\uba85), \uc2a4\ub9c8\ud2b8\uc218\uc0b0(\uc218\ud559, \uc0dd\uba85, \uc9c0\ud559), \ucc3d\uc758\uc735\ud569(\uc218\ud559, \uc601\uc5b4, \uc0ac\ud68c \uc735\ud569)
   
   \u203b \uc804\ub0a8\ub300\ub294 \ud559\uacfc\ubcc4 \uac70\ucc3d\ud55c \uc778\uc7ac\uc0c1\ubcf4\ub2e4 \uc704 \uba85\uc2dc\ub41c '\uad00\ub828 \uad50\uacfc'\uc758 \uc774\uc218 \uc5ec\ubd80\uc640 \uc131\ucde8 \uc218\uc900\uc744 \uc9c4\ub85c\uc5ed\ub7c9(40%)\uc758 \ud575\uc2ec \uc8fc\uc548\uc810\uc73c\ub85c \ub9e4\uc6b0 \uac15\ub825\ud558\uac8c \ubc18\uc601\ud568.
`,
      competencies: {
        academic: "\ud559\uc5c5\uc5ed\ub7c9(\ud559\uc2b5 \ud0dc\ub3c4\u00b7\ud559\uc5c5 \uc218\ud589 \ub2a5\ub825\u00b7\ud638\uae30\uc2ec \ud574\uacb0\u00b7\uc131\ucde8\ub3c4) \u2014 30%",
        career: "\uc9c4\ub85c\uc5ed\ub7c9(\uad00\ub828 \uad50\uacfc \uc790\ubc1c\uc801 \uc774\uc218 \ub178\ub825 \ubc0f \uc131\ucde8 \uc218\uc900\u00b7\uc9c4\ub85c \ud0d0\uc0c9 \ud65c\ub3d9) \u2014 40%",
        community: "\uacf5\ub3d9\uccb4\uc5ed\ub7c9(\uc131\uc2e4\uc131\u00b7\uaddc\uce59 \uc900\uc218\u00b7\ud611\uc5c5\u00b7\ub9ac\ub354\uc2ed\u00b7\ub098\ub214\u00b7\ubc30\ub824) \u2014 30%"
      },
      weights: { academic: 0.30, career: 0.40, community: 0.30 }
    },
    "\ucda9\ub0a8\ub300\ud559\uad50": {
      factors: `
[\ucda9\ub0a8\ub300\ud559\uad50 2026\ud559\ub144\ub3c4 \ud559\uc0dd\ubd80\uc885\ud569\uc804\ud615 \ud3c9\uac00 \uae30\uc900 \ud575\uc2ec (\uac00\uc774\ub4dc\ubd81/\ubaa8\uc9d1\uc694\uac15 \ubc18\uc601)]

\u25a0 \ucda9\ub0a8\ub300\ud559\uad50 \uc11c\ub958 \ubc0f \uba74\uc811\ud3c9\uac00 \ubc29\uc2dd\uacfc \ud575\uc2ec \uc5ed\ub7c9 \ube44\uc728
   * \uc804\ud615 \ubc29\ubc95: \uc77c\uad04\ud569\uc0b0(\uc11c\ub958 100%) \ubc0f \ub2e8\uacc4\ubcc4 \uc804\ud615(1\ub2e8\uacc4 \uc11c\ub958 100%, 2\ub2e8\uacc4 \uc11c\ub958 66.7% + \uba74\uc811 33.3%)
   * \uacfc\ub77d \uae30\uc900 \uc5c4\uaca9 \uc801\uc6a9: \uc11c\ub958\ud3c9\uac00 \ucd1d\uc810\uc758 40% \ubbf8\ub9cc \ud639\uc740 '\ud559\uc5c5\uc801/\uc0ac\ud68c\uc801 \uc5ed\ub7c9' \uc911 \ubbf8\ud761 \uc774\ud558(30\uc810 \uc774\ud558) 2\uac1c \uc774\uc0c1 \uc2dc \ubd88\ud569\uaca9 \ucc98\ub9ac
   * \ud559\uad50\ud3ed\ub825 \uae30\uc7ac \uc0ac\ud56d: \uc0ac\uc548\uc5d0 \ub530\ub77c \uc815\uc131\ud3c9\uac00 \uc2dc \uac15\ub825\ud55c \uac10\uc810 \ubc18\uc601

\u25a0 \uc11c\ub958\ud3c9\uac00 2\ub300 \ud575\uc2ec \uc5ed\ub7c9 \ubc0f \uc138\ubd80 \ud3c9\uac00 \uc694\uc18c
   \u2460 \ud559\uc5c5\uc801 \uc5ed\ub7c9 (\uc555\ub3c4\uc801 \ube44\uc911: 75.5%)
   - [\uc804\uccb4 \uad50\uacfc\uc758 \ud559\uc5c5\uc801 \ub178\ub825\uacfc \uc131\ucde8\ub3c4]: \uc774\uc218 \uad50\uacfc\ubaa9 \uc804\ubc18\uc758 \uc131\ucde8\ub3c4\uc640 \uc131\uc801 \uc0c1\uc2b9 \ucd94\uc774, \ud559\uc2b5 \uacbd\ud5d8\uc758 \ucda9\uc2e4\ub3c4
   - [\uc804\uacf5(\uacc4\uc5f4) \uad00\ub828 \uad50\uacfc \uc774\uc218 \ub178\ub825 \ubc0f \uc131\ucde8]: \uc9c0\uc6d0 \uc804\uacf5 \uad00\ub828 \uad50\uacfc\ubaa9\uc758 \ub2a5\ub3d9\uc801 \uc120\ud0dd\uacfc \uc801\uc808\ud55c \uc774\uc218, \ud559\uc5c5 \uc131\ucde8 \uc218\uc900
   - [\uc804\uacf5(\uacc4\uc5f4) \uad00\ub828 \uc9c4\ub85c \ud0d0\uc0c9 \ud65c\ub3d9\uacfc \uacbd\ud5d8]: \uc804\uacf5 \uad00\ub828 \ud0d0\uc0c9 \ud65c\ub3d9\uc758 \uc801\uc808\uc131\uacfc \uafb8\uc900\ud568
   - [\ud559\uc2b5 \ud0dc\ub3c4 \ubc0f \ud559\uc5c5 \uc758\uc9c0]: \uc8fc\ub3c4\uc801\u00b7\uc9c4\ucde8\uc801\uc778 \ubaa9\ud45c \uc124\uc815 \ubc0f \uc790\ubc1c\uc801 \ud559\uc5c5 \uc218\ud589 \uc790\uc728\uc131
   
   \u2461 \uc0ac\ud68c\uc801 \uc5ed\ub7c9 (24.5%)
   - [\uc131\uc2e4\uc131\uacfc \uaddc\uce59\uc900\uc218]: \uc804\ubc18\uc801\uc778 \ud559\uad50 \uc0dd\ud65c \uc131\uc2e4\uc131, \ucc45\uc784\uac10 \uc788\ub294 \uc724\ub9ac/\uc6d0\uce59 \uc900\uc218
   - [\ud611\uc5c5\uacfc \uc18c\ud1b5\ub2a5\ub825]: \uacf5\ub3d9\uccb4 \uad6c\uc131\uc6d0\uacfc\uc758 \ub2a5\ub3d9\uc801\uc774\uace0 \uae0d\uc815\uc801\uc778 \uc0c1\ud638 \ud611\ub825
   - [\ub098\ub214\uacfc \ubc30\ub824]: \uacf5\ub3d9\uccb4 \ubc1c\uc804\uc744 \uc704\ud55c \uc790\ubc1c\uc801 \uae30\uc5ec\uc640 \uc2e4\ucc9c\uc801 \uc774\ud0c0\uc2ec

\u25a0 \uba74\uc811\ud3c9\uac00 \ud575\uc2ec \uc694\uc18c (\uba74\uc811 \ub300\uc0c1\uc790\uc5d0 \ub300\ud55c \ucc38\uace0 \uc9c0\ud45c)
   - \uc758\uc0ac\uc18c\ud1b5\ub2a5\ub825 (37.8%): \uc885\ud569\uc801(\uae30\uc874 \uc9c0\uc2dd \uc735\ud569 \uacb0\ub860 \ub3c4\ucd9c) \ubc0f \ub17c\ub9ac\uc801 \uc0ac\uace0\ub825(\uba85\ud655\ud55c \uc778\uacfc\uad00\uacc4 \uc124\uba85)
   - \uacc4\uc5f4 \uc801\ud569\uc131 (37.8%): \uc804\uacf5 \ud0d0\uad6c \ub2a5\ub825, \uc790\uae30\uc8fc\ub3c4\uc801 \ubaa9\ud45c \uc124\uc815, \uc9c4\ub85c \ud0d0\uc0c9\uc758 \uae4a\uc774
   - \uc0ac\ud68c\uc801 \uc5ed\ub7c9 (24.4%): \ud611\uc5c5 \ubc0f \ub098\ub214\uc758 \uc2e4\ucc9c \ud0dc\ub3c4

\u25a0 \ud559\uacfc(\ub2e8\uacfc\ub300\ud559)\ubcc4 \ud575\uc2ec \ud3c9\uac00 \uc8fc\uc548\uc810 \ubc0f \uc694\uad6c \uc18c\uc591
   [\uc778\ubb38/\uc0ac\ud68c/\uacbd\uc0c1 \uacc4\uc5f4]
   - \uc778\ubb38\ub300\ud559: \uc5b8\uc5b4/\ubb38\ud559/\uc5ed\uc0ac \uc560\uc815 \ubc0f \uae00\ub85c\ubc8c \uc18c\ud1b5. \uc0ac\ub8cc \ubd84\uc11d\ub825 \ubc0f \uc0b6\uc5d0 \ub300\ud55c \ube44\ud310\uc801\u00b7\ub17c\ub9ac\uc801 \ud1b5\ucc30
   - \uc0ac\ud68c\uacfc\ud559\ub300\ud559: \ubcf5\uc7a1\ud55c \uc0ac\ud68c \ud604\uc0c1\uc758 \ube44\ud310\uc801 \uc774\ud574\uc640 \ub300\uc548 \uc81c\uc2dc(\ub2e4\uc591\ud55c \ub370\uc774\ud130 \uae30\ubc18 \uc18c\ud1b5). \uacf5\ub3d9\uccb4 \uae30\uc5ec \ub9ac\ub354\uc2ed, \ub300\uc778 \uacf5\uac10
   - \uacbd\uc0c1\ub300\ud559: \uae00\ub85c\ubc8c \uc2dc\uc7a5\u00b7\uacbd\uc81c \uc9c0\uc18d\uc801 \uad00\uc2ec. \uc218\ud559\uc801 \ud310\ub2e8(\uacbd\uc81c), \uc735\ud569 \ubc0f \ub9ac\ub354\uc2ed(\uacbd\uc601), \uae00\ub85c\ubc8c \ub9c8\uc778\ub4dc \ubc0f \ubd84\uc11d\ub825(\ubb34\uc5ed)
   
   [\uc790\uc5f0\uacfc\ud559/\uacf5\ud559 \uacc4\uc5f4]
   - \uc790\uc5f0\uacfc\ud559\ub300\ud559: \uc218\ud559, \ubb3c\ub9ac, \ud654\ud559, \uc9c0\uad6c\uacfc\ud559 \ub4f1 \uae30\ucd08\uacfc\ud559 \ud0c4\ud0c4\ud55c \uae30\ubcf8\uae30\uc640 \uc6d0\ub9ac\uc801 \ud0d0\uad6c\uc2ec. \uc2e4\ud5d8 \ud765\ubbf8(\uc190\uc7ac\uc8fc), \uc790\uc5f0/\uc6b0\uc8fc \ud0d0\uad6c
   - \uacf5\uacfc\ub300\ud559: \uae30\ucd08 \uacf5\ud559(\uc218/\ubb3c/\ud654) \ud544\uc218 \uc131\ucde8. AI/\uc2a4\ub9c8\ud2b8/\ubaa8\ube4c\ub9ac\ud2f0 \ud638\uae30\uc2ec, \ucc3d\uc758\uc801 \uc2e4\ucc9c\ud615 \uacf5\ud559 \uc0ac\uace0(\uc9c1\uc811 \ubb38\uc81c\ub97c \ud574\uacb0\ud574 \uc81c\uc791\ud558\ub294 \ud0dc\ub3c4)
   
   [\ub18d\uc0dd\uba85/\uc0dd\uba85\uc2dc\uc2a4\ud15c]
   - \ub18d\uc5c5\uc0dd\uba85\uacfc\ud559\ub300\ud559: \uae30\ud6c4/\ud658\uacbd/\uc2dd\ub7c9 \ubb38\uc81c \uad00\uc2ec. \uc0dd\uba85\uacfc\ud559/\ud654\ud559 \uc804\uacf5\uc5ed\ub7c9 \uc678\uc5d0 \ucca8\ub2e8 ICT \uc801\uc6a9\uc744 \uc2dc\ub3c4\ud558\ub294 \uc735\ubcf5\ud569 \ud638\uae30\uc2ec \ubc0f \uc0dd\uba85 \uc874\uc911
   - \uc0dd\uba85\uc2dc\uc2a4\ud15c\uacfc\ud559\ub300\ud559: \uc0dd\uba85 \ud604\uc0c1 \uadfc\ubcf8 \ud0d0\uad6c. \uc0dd\ubb3c\ud559+\ucef4\ud4e8\ud130 \uc815\ubcf4\ud559(\ube45\ub370\uc774\ud130) \uc735\ud569 \ubc14\uc774\uc624\ud5ec\uc2a4 \uad00\uc2ec \uc6b0\ub300
   
   [\uc758\uc57d\u00b7\ubcf4\uac74\u00b7\uac04\ud638\u00b7\uc218\uc758/\uc0dd\ud65c/\uc0ac\ubc94 \uacc4\uc5f4]
   - \uc758\uc57d\u00b7\ubcf4\uac74\u00b7\uc218\uc758\u00b7\uac04\ud638: \uc218\ud559/\uc0dd\uba85\uacfc\ud559 \ub4f1 \uc790\uc5f0\uacc4\uc5f4 \ucd5c\uc0c1\uc704 \ud0c1\uc6d4\uc131 \ud544\uc218. \ud658\uc790/\ub3d9\ubb3c \uacf5\uac10, \ubd09\uc0ac/\ud76c\uc0dd/\uc18c\ud1b5 \ub4f1 \ub530\ub73b\ud55c \uc778\uc131(\uc0ac\ud68c\uc801 \uc5ed\ub7c9) \uc9c0\uadf9\ud788 \uc911\uc2dc
   - \uc0dd\ud65c\uacfc\ud559\ub300\ud559: \uc758\uc2dd\uc8fc(\uc0b6\uc758 \uc9c8) \ud5a5\uc0c1. \uc18c\ube44 \ud2b8\ub80c\ub4dc \ubc0f \ub77c\uc774\ud504\uc2a4\ud0c0\uc77c \ubd84\uc11d, \uac74\uac15/\uc2dd\ud488 \ucc3d\uc758\uc801 \ud638\uae30\uc2ec
   - \uc0ac\ubc94\ub300\ud559: \uad50\uc0ac \uc0ac\uba85\uac10/\uc778\uc131, \uc18c\ud1b5/\ub9ac\ub354\uc2ed. \uc804\uacf5(\uad6d/\uc601/\uc218/\uacf5\ud559 \ub4f1) \uad50\uacfc \uc9c0\uc801 \ud0c1\uc6d4\uc131 \ubc0f \uac00\ub974\uce68\uc5d0 \ub300\ud55c \ubcf4\ub78c(\uc774\ud0c0\uc2ec)
   
   [\uc608\uc220/\ud2b9\uc218 \uc735\ud569\ud559\ubd80]
   - \uc735\ud569/\uc548\ubcf4/\ud2b9\uc218 \ub4f1: \ud559\uc81c \uac04 \ud1b5\ud569 \ud638\uae30\uc2ec(\ubb38\uc774\uacfc \uacbd\uacc4 \ud0c8\ud53c), \uc790\uae30\uc8fc\ub3c4\uc801 \ubb34\uc804\uacf5 \uc9c4\ub85c \uac1c\ucc99\uc9c0\ud5a5\uc131. \uad6d\uac00/\uae00\ub85c\ubc8c \uc774\uc288 \ud638\uae30\uc2ec \ubc0f \uccb4\ub825/\uc0ac\uba85\uac10
`,
      competencies: {
        academic: "\ud559\uc5c5\uc801 \uc5ed\ub7c9_\uc131\ucde8(\uc804\uccb4/\uc804\uacf5 \uad00\ub828 \uad50\uacfc \uc774\uc218 \ub178\ub825 \ubc0f \uc131\ucde8, \ud559\uc2b5 \ud0dc\ub3c4 \ucda9\uc2e4\uc131) \u2014 \ud1b5\ud569 75.5% \uc911 \ubd84\ud560",
        career: "\ud559\uc5c5\uc801 \uc5ed\ub7c9_\ud0d0\uad6c(\uc9c4\ub85c \ud0d0\uc0c9 \uc9c0\uc18d\uc131, \uc9c4\ucde8\uc801 \ud559\uc5c5 \uc758\uc9c0, \ub17c\ub9ac\uc801\uc774\uace0 \uc885\ud569\uc801 \uc0ac\uace0) \u2014 \ud1b5\ud569 75.5% \uc911 \ubd84\ud560",
        community: "\uc0ac\ud68c\uc801 \uc5ed\ub7c9(\uc131\uc2e4\uc131, \uaddc\uce59 \uc900\uc218, \ud611\uc5c5/\uc18c\ud1b5, \uc774\ud0c0\uc801 \ub098\ub214/\ubc30\ub824) \u2014 24.5%"
      },
      weights: { academic: 0.40, career: 0.355, community: 0.245 }
    },
    "\ucda9\ubd81\ub300\ud559\uad50": {
      factors: `
[\ucda9\ubd81\ub300\ud559\uad50 2026\ud559\ub144\ub3c4 \ud559\uc0dd\ubd80\uc885\ud569\uc804\ud615 \uc11c\ub958\ud3c9\uac00 \uae30\uc900 \ubc0f \ud559\uacfc\ubcc4 \ud3c9\uac00 \uc8fc\uc548\uc810 (\ubaa8\uc9d1\uc694\uac15 \ubc0f \uac00\uc774\ub4dc\ubd81 \ubc18\uc601)]

\u25a0 \ucda9\ubd81\ub300\ud559\uad50 \ud559\uc0dd\ubd80\uc885\ud569\uc804\ud615 \uc11c\ub958\ud3c9\uac00 \uc885\ud569 \uc548\ub0b4
1. \ud3c9\uac00 \ubc29\uc2dd: \ub2e8\uc21c \ub4f1\uae09 \uc911\uc2ec\uc758 \uc815\ub7c9\ud3c9\uac00\uac00 \uc544\ub2cc, \ub2e4\uc218\uc758 \uc785\ud559\uc0ac\uc815\uad00\uc774 \uc9c0\uc6d0\uc790 \ub300\uc0c1 \uc11c\ub958\ub97c \ubc14\ud0d5\uc73c\ub85c \uc5ed\ub7c9\uc744 \ub3c5\ub9bd\uc801\u00b7\uc885\ud569\uc801\uc73c\ub85c \uc815\uc131\ud3c9\uac00\ud569\ub2c8\ub2e4.
2. 2\ub300 \ud575\uc2ec \ud3c9\uac00 \uc601\uc5ed (\ucd1d\uc810 80\uc810 \ub9cc\uc810: \uae30\ubcf8 40\uc810 + \uc2e4\uc9c8 40\uc810)
   \u2460 \ud559\uc5c5\uc801 \uc5ed\ub7c9 (\ubc30\uc810: 61\uc810 / \ube44\uc911 \uc57d 76%)
      - \uc804\uccb4 \uad50\uacfc\uc758 \ud559\uc5c5\uc801 \ub178\ub825\uacfc \uc131\ucde8\ub3c4: \uace0\uad50 \uc804 \uad50\uc721\uacfc\uc815 \uc774\uc218 \ucda9\uc2e4\ub3c4
      - \uc804\uacf5 \uad00\ub828 \uad50\uacfc \uc774\uc218 \ub178\ub825 \ubc0f \uc131\ucde8\ub3c4: \uc9c0\uc6d0 \ubd84\uc57c \uad00\ub828 \uad50\uacfc \uc801\uadf9 \uc774\uc218, \uc131\ucde8 \ubc0f \ubc1c\uc804 \uc815\ub3c4 (\u2605\uac00\uc7a5 \uc911\uc694)
      - \uc804\uacf5 \uad00\ub828 \uc9c4\ub85c \ud0d0\uc0c9 \ud65c\ub3d9\uacfc \uacbd\ud5d8: \uc9c0\uc6d0 \ubd84\uc57c \uc5f4\uc758 \ubc0f \uafb8\uc900\ud55c \uc9c4\ub85c \uc900\ube44
      - \ud559\uc2b5 \ud0dc\ub3c4 \ubc0f \ud559\uc5c5 \uc758\uc9c0: \ub2e4\uc591\ud55c \uad50\uc721\ud65c\ub3d9 \ub0b4 \uc790\ubc1c\uc801\uc774\uace0 \uc9c4\ucde8\uc801\uc778 \ucc38\uc5ec \ud0dc\ub3c4
   \u2461 \uc0ac\ud68c\uc801 \uc5ed\ub7c9 (\ubc30\uc810: 19\uc810 / \ube44\uc911 \uc57d 24%)
      - \ub098\ub214\uacfc \ubc30\ub824: \ud0c0\uc778 \uc874\uc911\uacfc \ubd09\uc0ac\uc815\uc2e0 \uc2e4\ucc9c
      - \uc131\uc2e4\uc131\uacfc \uaddc\uce59\uc900\uc218: \ud559\uc0dd\uc758 \ucc45\uc784/\uc758\ubb34 \uc218\ud589 \ubc0f \ud559\uad50 \uc81c\ub3c4\uc801 \uc694\uad6c \uc774\ud574
      - \ud611\uc5c5\uacfc \uc18c\ud1b5\ub2a5\ub825: \ud0c0 \uad6c\uc131\uc6d0\uacfc\uc758 \uc6d0\ub9cc\ud55c \uc758\uc0ac\uc18c\ud1b5 \ubc0f \uc801\uadf9\uc801 \ud611\ub825 \ud0dc\ub3c4

\u25a0 \uc11c\ub958\ud3c9\uac00 \uc2dc \ud575\uc2ec \uc720\uc758\uc0ac\ud56d (\uac10\uc810 \ubc0f \ubd88\uc774\uc775 \uc694\uac74 \ucca0\uc800 \uac80\uc99d)
1. \ucca0\uc800\ud55c \ube14\ub77c\uc778\ub4dc \ud3c9\uac00 \uc900\uc218: \uac1c\uc778 \ud2b9\uc815 \uc815\ubcf4(성명, \ucd9c\uc2e0 \uace0\uad50 \ub4f1) \ubc30\uc81c
2. \uae30\uc7ac \uae08\uc9c0 \ud56d\ubaa9 \uc704\ubc18 \uc2dc \uac10\uc810/\ubd88\ud569\uaca9: \uacf5\uc778\uc5b4\ud559\uc131\uc801, \ud559\uad50\ud3ed\ub825 \uc870\uce58\uc0ac\ud56d \ubc18\uc601(\uc0ac\uc548\ubcc4 \uce58\uba85\uc801 \uc815\uc131 \ucc28\uac10)

\u25a0 \ub2e8\uacfc\ub300\ud559 \ubc0f \ud559\uacfc\ubcc4 \ud575\uc2ec \ud3c9\uac00 \uc8fc\uc548\uc810 (\uc804\uacf5 \uad00\ub828 \ucc38\uace0 \uad50\uacfc \uac00\uc774\ub4dc)
\u203b \ud559\uc5c5\uc801 \uc5ed\ub7c9 \ud3c9\uac00 \uc2dc \uc544\ub798 \uba85\uae30\ub41c \ud559\uacfc\ubcc4 \uc804\uacf5 \ucc38\uace0 \uad50\uacfc\uc758 \uc131\ucde8\ub3c4\uc640 \uc774\uc218 \ub178\ub825\uc744 \uc808\ub300\uc801 \uae30\uc900\uc73c\ub85c \uc0bc\uc2b5\ub2c8\ub2e4.

1. \uc778\ubb38\ub300\ud559
- \uad6d\uc5b4\uad6d\ubb38\ud559\uacfc: \uad6d\uc5b4, \uc0ac\ud68c \uad50\uacfc\uc758 \uc131\ucde8\ub3c4\uc640 \uc774\uc218 \ub178\ub825\uc744 \uc911\uc810 \ud3c9\uac00.
- \uc911\uc5b4\uc911\ubb38/\uc601\uc5b4\uc601\ubb38/\ub3c5\uc77c\uc5b8\uc5b4\ubb38\ud654/\ud504\ub791\uc2a4\uc5b8\uc5b4\ubb38\ud654/\ub7ec\uc2dc\uc544\uc5b8\uc5b4\ubb38\ud654: \uc601\uc5b4, \uc0ac\ud68c, \uc81c2\uc678\uad6d\uc5b4 \uc5ed\ub7c9.
- \ucca0\ud559/\uc0ac\ud559/\uace0\uace0\ubbf8\uc220\uc0ac\ud559\uacfc: \uc0ac\ud68c, \uad6d\uc5b4.
- \uc778\ubb38\ud559\uc790\uc728\uc804\uacf5\ud559\ubd80: \uae30\ucd08 \ud559\uc5c5 \uc5ed\ub7c9 \uc804\ubc18.

2. \uc0ac\ud68c\uacfc\ud559\ub300\ud559
- \uc0ac\ud68c\ud559/\ud589\uc815\ud559/\uc815\uce58\uc678\uad50: \uc601\uc5b4, \uc0ac\ud68c.
- \uc2ec\ub9ac\ud559/\uacbd\uc81c\ud559: \uc218\ub9ac/\ub17c\ub9ac\uc801 \ubd84\uc11d\ub825 \uc694\ud558\ubbc0\ub85c '\uc601\uc5b4, \uc218\ud559' \uc911\uc810.
- \uc0ac\ud68c\uacfc\ud559\uc790\uc728\uc804\uacf5: \uae30\ucd08 \uc5ed\ub7c9 \ud3ec\uad04 \ud3c9\uac00.

3. \uc790\uc5f0\uacfc\ud559\ub300\ud559
- \uc218\ud559/\uc815\ubcf4\ud1b5\uacc4/\ubb3c\ub9ac/\ud654\ud559/\uc0dd\ubb3c/\ubbf8\uc0dd\ubb3c/\uc0dd\ud654\ud559/\ucc9c\ubb38\uc6b0\uc8fc/\uc9c0\uad6c\ud658\uacbd: \uc218\ud559, \uacfc\ud559 \ud544\uc218.
- \uc790\uc5f0\uacfc\ud559\uc790\uc728\uc804\uacf5: \uc218\ud559, \uacfc\ud559 \uc5ed\ub7c9 \uc911\uc2ec.

4. \uacbd\uc601\ub300\ud559
- \uacbd\uc601/\uad6d\uc81c\uacbd\uc601/\uacbd\uc601\uc815\ubcf4: \uae00\ub85c\ubc8c \ube44\uc988\ub2c8\uc2a4 \uc774\ud574\ub825\uc73c\ub85c '\uc601\uc5b4, \uc0ac\ud68c' \ucd5c\uc6b0\uc120.
- \uacbd\uc601\ud559\uc790\uc728\uc804\uacf5: \uae30\ucd08 \uc804\ubc18.

5. \uacf5\uacfc\ub300\ud559
- \uc804 \ud559\uacfc(\ud1a0\ubaa9,\uae30\uacc4,\ud654\ud559,\uc2e0\uc18c\uc7ac,\uac74\ucd95\uacf5,\uc548\uc804,\ud658\uacbd,\uacf5\uc5c5\ud654,\ub3c4\uc2dc,\uac74\ucd95\ud559): \uc218\ud559, \uacfc\ud559\uc758 \ud0c1\uc6d4\ud55c \ud559\uc5c5 \uc5ed\ub7c9.
- \uacf5\ud559\uc790\uc728\uc804\uacf5: \uc218\ud559, \uacfc\ud559.

6. \uc804\uc790\uc815\ubcf4\ub300\ud559
- \uc804 \ud559\uacfc(\uc804\uae30,\uc804\uc790,\ubc18\ub3c4\uccb4,\uc815\ubcf4\ud1b5\uc2e0,\ucef4\uacf5,\uc18c\ud504\ud2b8\uc6e8\uc5b4,\uc9c0\ub2a5\ub85c\ubd07): \ucca8\ub2e8 IT \uae30\ud2c0\ub85c\uc368 \uc218\ud559, \uacfc\ud559 \uc808\ub300\uc801 \ube44\uc911.
- \uc804\uc790\uc815\ubcf4\uc790\uc728\uc804\uacf5: \uc218\ud559, \uacfc\ud559.

7. \ub18d\uc5c5\uc0dd\uba85\ud658\uacbd\ub300\ud559
- \ub18d\uc5c5\uacbd\uc81c\ud559\uacfc: \uc601\uc5b4, \uc218\ud559 (\uc218\ub9ac\ubd84\uc11d).
- \uc2dd\ubb3c\uc790\uc6d0/\ucd95\uc0b0/\uc0b0\ub9bc/\uc9c0\uc5ed\uac74\uc124\uacf5/\ud658\uacbd\uc0dd\uba85\ud654\ud559/\ud2b9\uc6a9\uc2dd\ubb3c/\uc6d0\uc608\uacfc\ud559/\ubc14\uc774\uc624\uc2dc\uc2a4\ud15c\uacf5/\uc2dd\ubb3c\uc758\ud559/\uc2dd\ud488\uc0dd\uba85\uacf5/\ubaa9\uc7ac\uc885\uc774\uacfc\ud559: \uc218\ud559, \uacfc\ud559 \uc9d1\uc911.
- \ub18d\uc5c5\uc0dd\uba85\ud658\uacbd\uc790\uc728\uc804\uacf5: \uc804\ubc18\uc801\uc778 \uae30\ucd08 \uc18c\uc591.

8. \uc0ac\ubc94\ub300\ud559
- \uad6d\uc5b4/\uc5ed\uc0ac/\uc9c0\ub9ac/\uc0ac\ud68c/\uc724\ub9ac\uad50\uc721: \uad6d\uc5b4, \uc0ac\ud68c.
- \uc601\uc5b4/\uad50\uc721\ud559: \uc601\uc5b4, \uc0ac\ud68c.
- \uc218\ud559/\ubb3c\ub9ac/\ud654\ud559/\uc0dd\ubb3c/\uc9c0\uad6c\uacfc\ud559\uad50\uc721: \uc218\ud559, \uacfc\ud559 \uc5ed\ub7c9 \ucd5c\ucc99\ub3c4.

9. \uc0dd\ud65c\uacfc\ud559\ub300\ud559
- \uc2dd\ud488\uc601\uc591: \uacfc\ud559, \uc218\ud559.
- \uc758\ub958/\uc8fc\uac70\ud658\uacbd: \uc0ac\ud68c, \uacfc\ud559.
- \uc544\ub3d9\ubcf5\uc9c0/\uc18c\ube44\uc790: \uad6d\uc5b4, \uc0ac\ud68c.

10. \uc758\uc57d \ubc0f \ubcf4\uac74\u00b7\uac04\ud638\u00b7\uc218\uc758\uacc4\uc5f4
- \uc758\uacfc(\uc758\uc608), \uc57d\ud559(\uc57d\ud559/\uc81c\uc57d\ud559), \uc218\uc758\uacfc(\uc218\uc758\uc608), \uac04\ud638(\uac04\ud638): \ucd5c\uc0c1\uc704\uad8c\uc758 \uc555\ub3c4\uc801 \uae30\ucd08 \uc5ed\ub7c9\uacfc \uae00\ub85c\ubc8c \uc0dd\uba85 \ud0d0\uad6c\ub97c \uc704\ud574 \uc624\uc9c1 '\uc601\uc5b4, \uacfc\ud559' \uacfc\ubaa9\uc744 \uc9d1\uc911/\uc808\ub300 \ud3c9\uac00\ud568.

11. \ucc3d\uc758\uc735\ud569\ub300\ud559 \ubc0f \uc9c1\ud560\ud559\ubd80
- \uc778\ubb38\uc0ac\ud68c\uc790\uc728\uc804\uacf5: \ubb38\uacfc \uc18c\uc591(\uc601\uc5b4, \uc0ac\ud68c).
- \uc790\uc5f0\uacfc\ud559\uc790\uc728\uc804\uacf5: \uc774\uacfc \uc18c\uc591(\uc218\ud559, \uacfc\ud559).
- \ubc14\uc774\uc624\ud5ec\uc2a4: \uc601\uc5b4, \uacfc\ud559.

\u203b \uc885\ud569: \uac00\uc7a5 \uc911\uc694\ud788 \uc5ec\uae30\ub294 \uac74 \uc9c0\uc6d0\ud559\uacfc \uad00\ub828 \ud575\uc2ec \uad50\uacfc\uc758 \ub2e8\uc21c \uc131\ucde8\ub3c4 \ubfd0\ub9cc \uc544\ub2c8\ub77c, 3\ub144\uac04 \uc2a4\uc2a4\ub85c \uc5bc\ub9c8\ub098 \uadf8 \uacc4\uc5f4\uc758 \uacfc\ubaa9\uc744 \uc8fc\ub3c4\uc801\uc73c\ub85c \uc218\uac15\ud558\uace0 \ub178\ub825\ud588\ub294\uc9c0\uc758 \uc11c\uc0ac\uc785\ub2c8\ub2e4. (61\uc810 \ubc18\uc601)
`,
      competencies: {
        academic: "\ud559\uc5c5\uc801 \uc5ed\ub7c9 \u2014 \ubc30\uc810 61\uc810(\uc57d 76%). \uc804\uccb4\uad50\uacfc \ud559\uc5c5\uc131\ucde8, \uc9c0\uc815 \ucc38\uace0 \uad50\uacfc \uc774\uc218\ub178\ub825 \ubc0f \uc555\ub3c4\uc801 \uc131\ucde8\ub3c4(\u2605\uac00\uc7a5 \uc911\uc694), \uc9c0\uc801 \ud638\uae30\uc2ec.",
        career: "\uc9c4\ub85c \ud0d0\uc0c9 \uc5ed\ub7c9 (\ud559\uc5c5\uc5ed\ub7c9\uc5d0 \ud3ec\ud568 \ud3c9\uac00) \u2014 \uc804\uacf5\uad00\ub828 \uad50\uacfc \ud559\uc5c5 \uc18d \ub2a5\ub3d9\uc801 \uc9c4\ub85c \ud0d0\uc0c9 \uacbd\ud5d8\uc5d0 \ud2b9\ud654\ud558\uc5ec \ud3c9\uac00.",
        community: "\uc0ac\ud68c\uc801 \uc5ed\ub7c9 \u2014 \ubc30\uc810 19\uc810(\uc57d 24%). \ub098\ub214, \ubc30\ub824, \uc131\uc2e4\uc131, \uaddc\uce59\uc900\uc218, \ud611\uc5c5, \uc18c\ud1b5. \ud559\ud3ed\uae30\uc7ac \ub4f1 \uc704\ubc18 \uc2dc \ud569\uaca9 \uce58\uba85\ud0c0."
      },
      weights: { academic: 0.50, career: 0.26, community: 0.24 }
    },
    "\uacbd\ubd81\ub300\ud559\uad50": {
      factors: `
[\uacbd\ubd81\ub300\ud559\uad50 2026\ud559\ub144\ub3c4 \ud559\uc0dd\ubd80\uc885\ud569\uc804\ud615 \uc11c\ub958\ud3c9\uac00 \uae30\uc900 \ubc0f \ud559\uacfc\ubcc4 \ud3c9\uac00 \uc8fc\uc548\uc810]

\u25a0 \uc11c\ub958\ud3c9\uac00 \uae30\ubcf8 \ubc29\ubc95 \ubc0f \uae30\uc900
1. \uc9c0\uc6d0\uc790 \uc81c\ucd9c \uc11c\ub958 \uae30\ubc18 \ud559\uc5c5, \uc9c4\ub85c, \uacf5\ub3d9\uccb4 \uc5ed\ub7c9 \ub2e4\uc218 \ud3c9\uac00\uc790 \uc885\ud569 \uc815\uc131\ud3c9\uac00 (\ube14\ub77c\uc778\ub4dc \ud3c9\uac00)
2. 500\uc810 \ub9cc\uc810 \uae30\uc900 \ud3c9\uac00\uc704\uc6d0 \ud3c9\uade0\uc810 \ubc18\uc601. \ucd1d\uc810\uc758 40%(200\uc810) \ubbf8\ub9cc \ucde8\ub4dd\uc790\ub294 \uacfc\ub77d\uc73c\ub85c \ubd88\ud569\uaca9 \ucc98\ub9ac
3. \uc11c\ub958\ud3c9\uac00\uc758 \ud575\uc2ec \uc7a3\ub300\uac00 \ub418\ub294 **\u2018\uc804\uacf5 \uad00\ub828 \uad50\uacfc\u2019**\ub97c \uba85\ud655\ud788 \uc9c0\uc815. \uc9c0\uc6d0\uc790\uac00 \ud574\ub2f9 \uad50\uacfc\ubaa9\uc744 \uc801\uadf9 \uc774\uc218\ud588\ub294\uc9c0\uc640 \uc131\ucde8\ub3c4(\uc131\uc801+\uc138\ud2b9 \ud0d0\uad6c\uacfc\uc815)\uac00 \ud569\uaca9\uc744 \uc88c\uc6b0\ud568

\u25a0 \ud3c9\uac00 \uc694\uc18c \ubc0f \ubc18\uc601 \ube44\uc728 (\ubaa8\uc9d1\ub2e8\uc704/\uc804\ud615\ubcc4 2\uac00\uc9c0 \uc720\ud615)
[\uc720\ud615 A: \uc77c\ubc18\ud559\uc0dd\uc804\ud615 (\uc758\uc608/\uce58\uc758\uc608/\uc218\uc758\uc608, \uc790\uc728\ud559\ubd80 \uc81c\uc678)] \uc9c4\ub85c \uc5ed\ub7c9 \ucd5c\uc6b0\uc120
- \uc9c4\ub85c \uc5ed\ub7c9 50%: \uc9c4\ub85c\ud0d0\uc0c9\ud65c\ub3d9 \ubc0f \ub178\ub825 35% + \uc804\uacf5(\uacc4\uc5f4) \uad00\ub828 \uad50\uacfc \uc774\uc218 \uc815\ub3c4 15%
- \ud559\uc5c5 \uc5ed\ub7c9 30%: \uc790\uae30\uc8fc\ub3c4\uc801 \ud559\uc5c5 \ub178\ub825 30%
- \uacf5\ub3d9\uccb4 \uc5ed\ub7c9 20%: \ubc14\ub78c\uc9c1\ud55c \uacf5\ub3d9\uccb4 \uc758\uc2dd\uacfc \uc2e4\ucc9c 20%

[\uc720\ud615 B: \uc77c\ubc18\ud559\uc0dd\uc804\ud615(\uc758\uc608/\uce58\uc758\uc608/\uc218\uc758\uc608, \uc790\uc728\ud559\ubd80), \uc9c0\uc5ed\uc778\uc7ac\uc804\ud615 \ub4f1 \uadf8 \uc678 \uc885\ud569] \ud559\uc5c5 \uc5ed\ub7c9 \ucd5c\uc6b0\uc120
- \ud559\uc5c5 \uc5ed\ub7c9 45%: \uc790\uae30\uc8fc\ub3c4\uc801 \ud559\uc5c5 \ub178\ub825 30% + \ud559\uc5c5\uc131\ucde8\ub3c4 15% + \uc804\uacf5 \uad00\ub828 \uad50\uacfc \uc131\ucde8\ub3c4 5%
- \uc9c4\ub85c \uc5ed\ub7c9 35%: \uc9c4\ub85c \ud0d0\uc0c9\ud65c\ub3d9 \ubc0f \ub178\ub825 25% + \uc804\uacf5(\uacc4\uc5f4) \uad00\ub828 \uad50\uacfc \uc774\uc218 \uc815\ub3c4 10%
- \uacf5\ub3d9\uccb4 \uc5ed\ub7c9 20%: \ubc14\ub78c\uc9c1\ud55c \uacf5\ub3d9\uccb4 \uc758\uc2dd\uacfc \uc2e4\ucc9c 20%

\u25a0 \uc138\ubd80 \ud3c9\uac00 \uae30\uc900 \uc8fc\uc548\uc810
\u2460 \ud559\uc5c5 \uc5ed\ub7c9 (\uace0\uad50 \uad50\uc721\uacfc\uc815\uc5d0\uc11c\uc758 \uc801\uc808\uc131 \ubc0f \ub178\ub825)
- \ud559\uc5c5/\uc804\uacf5 \uad00\ub828 \uad50\uacfc \uc131\ucde8\ub3c4(\uc720\ud615 B \uc801\uc6a9): \uc8fc\uc694 \uad50\uacfc \ubc0f \uc804\uacf5 \uad00\ub828 3\ub144\uac04 \uc131\ucde8\ub3c4 \ucd94\uc774\uac00 \ubaa8\uc9d1\ub2e8\uc704\uc5d0 \uc801\ud569\ud55c\uac00?
- \uc790\uae30\uc8fc\ub3c4\uc801 \ud559\uc5c5 \ub178\ub825: \uc218\uc5c5\uc5d0\uc11c \uc2a4\uc2a4\ub85c \ud0d0\uad6c\ud558\uace0 \uad50\uacfc\uacfc\uc815\uc5d0 \ucda9\uc2e4\ud588\ub294\uac00? \uad50\uacfc/\ud0d0\uad6c\uc5d0\uc11c \uad6c\uccb4\uc801 \uc131\uacfc\uc640 \uc758\ubbf8 \uc788\ub294 \ud559\uc2b5 \uacbd\ud5d8\uc744 \ubcf4\uc774\ub294\uac00?
\u2461 \uc9c4\ub85c \uc5ed\ub7c9 (\uc9c4\ub85c \ud0d0\uc0c9 \ubc0f \uc9c0\uc2dd \ud655\uc7a5\uc758 \uacfc\uc815)
- \uc804\uacf5 \uad00\ub828 \uad50\uacfc \uc774\uc218 \uc815\ub3c4: \uc218\uac15 \uacfc\ubaa9 \uc120\ud0dd \uc2dc \uc2ec\ud654\uacfc\ubaa9 \uc774\uc218 \ub4f1 \uacfc\uc815\uc801 \uc801\uadf9\uc131\uc744 \ubcf4\uc600\ub294\uac00?
- \uc9c4\ub85c \ud0d0\uc0c9\ud65c\ub3d9 \ubc0f \ub178\ub825: \ubd84\uc57c \uc9c0\uc2dd \ud655\uc7a5\uc744 \uc704\ud574 \uc8fc\ub3c4\uc801\uc73c\ub85c \ucc38\uc5ec\ud558\uace0 \ub2e4\uc591\ud55c \uad00\ub828 \ud65c\ub3d9\uc73c\ub85c \uacbd\ud5d8\uc758 \ud3ed\uc744 \ud655\uc7a5\ud558\uc600\ub294\uac00?
\u2462 \uacf5\ub3d9\uccb4 \uc5ed\ub7c9 (\uc790\uc728/\ud611\ub825/\ub098\ub214 \ub4f1 \uc5ed\ud560, \ucc45\uc784\uac10, \uc18c\ud1b5\uacfc \ubc30\ub824)
- \ub9ac\ub354\uc2ed \ubc1c\ud718 \ubc0f \uacf5\ub3d9 \ud654\ud569 \ub178\ub825, \ubd80\uc5ec\ub41c \uc5ed\ud560 \uc218\ud589\uc758 \uc131\uc2e4\uc131, \ub2e4\uc591\ud55c \uacf5\ub3d9 \uacfc\uc81c \ud611\uc5c5 \uacbd\ud5d8, \ub098\ub214\uacfc \ubc30\ub824\ub97c \ud1b5\ud55c \uc0ac\ud68c\uad6c\uc131\uc6d0 \uae30\uc5ec \uac00\ub2a5\uc131

\u25a0 \ub2e8\uacfc\ub300\ud559\ubcc4 \uc18c\uc18d \ud559\uacfc\uc640 \uac01 \ud559\uacfc\uc758 \uc11c\ub958\ud3c9\uac00 \uc8fc\uc548\uc810 (\uc9c0\uc815\ub41c \uc804\uacf5 \uad00\ub828 \uad50\uacfc)

1. \uc778\ubb38\u00b7\uc0ac\ud68c\u00b7\uacbd\uc0c1 \uacc4\uc5f4 (\ubb38\uacfc \uc131\ud5a5)
- \uc8fc\ub85c \uad6d\uc5b4, \uc601\uc5b4, \uc0ac\ud68c \uad50\uacfc\uc758 \uc131\ucde8\ub3c4\ub97c \ud1b5\ud574 \uc778\ubb38\ud559\uc801 \uc18c\uc591, \uc758\uc0ac\uc18c\ud1b5 \ub2a5\ub825, \uc0ac\ud68c \ud604\uc0c1\uc5d0 \ub300\ud55c \ud1b5\ucc30\ub825\uc744 \uc911\uc810\uc801\uc73c\ub85c \ud3c9\uac00\ud569\ub2c8\ub2e4.
- \uad6d\uc5b4\uad6d\ubb38\ud559\uacfc: \uad6d\uc5b4, \uc601\uc5b4
- \uc601\uc5b4\uc601\ubb38, \ub3c5\uc5b4\ub3c5\ubb38, \ubd88\uc5b4\ubd88\ubb38, \uc911\uc5b4\uc911\ubb38, \uc77c\uc5b4\uc77c\ubb38: \uc601\uc5b4 \uad50\uacfc\ub97c \ud575\uc2ec\uc73c\ub85c \uae00\ub85c\ubc8c \uc5b4\ud559 \uc5ed\ub7c9 \ud3c9\uac00
- \uc0ac\ud559, \ucca0\ud559: \uad6d\uc5b4, \uc0ac\ud68c \uad50\uacfc \uc911\uc2ec\uc758 \uc778\ubb38\ud559\uc801 \uc0ac\uc720 \uc5ed\ub7c9 \ud3c9\uac00
- \uace0\uace0\uc778\ub958, \ub178\uc5b4\ub178\ubb38: \uc601\uc5b4, \uc0ac\ud68c
- \ud55c\ubb38\ud559\uacfc: \ud55c\ubb38 \uad50\uacfc\uc758 \uc131\ucde8\ub3c4\uac00 \uc911\uc694\ud569\ub2c8\ub2e4.
- \uc815\uce58\uc678\uad50, \uc0ac\ud68c, \ubbf8\ub514\uc5b4\ucee4\ubba4\ub2c8\ucf00\uc774\uc158: \uc601\uc5b4, \uc0ac\ud68c \uad50\uacfc\ub97c \ubc14\ud0d5\uc73c\ub85c \uc0ac\ud68c \ud604\uc0c1 \ubd84\uc11d\ub825 \ud3c9\uac00
- \ubb38\ud5cc\uc815\ubcf4\ud559\uacfc: \uad6d\uc5b4, \uc601\uc5b4
- \uc0ac\ud68c\ubcf5\uc9c0\ud559\ubd80: \uad6d\uc5b4, \uc0ac\ud68c
- \uc9c0\ub9ac\ud559\uacfc: \uc0ac\ud68c, \uacfc\ud559 \uad50\uacfc\uc758 \uc735\ud569\uc801 \uc774\ud574\ub3c4 \ud3c9\uac00
- \uc2ec\ub9ac\ud559\uacfc: \ud0c0 \uc0ac\ud68c\uacfc\ud559\uacfc \ub2ec\ub9ac \ub17c\ub9ac\uc801, \ud1b5\uacc4\uc801 \ubd84\uc11d\uc774 \ud544\uc694\ud558\uc5ec \uc218\ud559, \uacfc\ud559 \uad50\uacfc\ub97c \ud3c9\uac00 \uc8fc\uc548\uc810\uc73c\ub85c \ub461\ub2c8\ub2e4.
- \uacbd\uc81c\ud1b5\uc0c1, \uacbd\uc601\ud559\ubd80: \uacbd\uc601\u00b7\uacbd\uc81c \uc218\ud559\uc744 \uc704\ud55c \uc218\ub9ac\uc801, \ub17c\ub9ac\uc801 \uc5ed\ub7c9\uacfc \uae00\ub85c\ubc8c \ube44\uc988\ub2c8\uc2a4 \uc18c\uc591\uc744 \uc704\ud574 \uc218\ud559, \uc601\uc5b4 \uad50\uacfc\ub97c \ud575\uc2ec\uc801\uc73c\ub85c \ud3c9\uac00\ud569\ub2c8\ub2e4.
- \ud589\uc815\ud559\ubd80: \uad6d\uc5b4, \uc601\uc5b4 \uad50\uacfc \uc5ed\ub7c9 \ud3c9\uac00

2. \uc790\uc5f0\uacfc\ud559\u00b7\uacf5\ud559\u00b7IT \uacc4\uc5f4 (\uc774\uacfc \uc131\ud5a5)
- \uc790\uc5f0\uacc4\uc5f4\uacfc \uacf5\ud559\uacc4\uc5f4\uc758 \ub300\ub2e4\uc218 \ud559\uacfc\ub294 \uc804\uacf5 \uc218\ud559\uc758 \ubf08\ub300\uac00 \ub418\ub294 \uc218\ud559, \uacfc\ud559 \uad50\uacfc\ub97c \uac00\uc7a5 \uac15\ub825\ud55c \ud3c9\uac00 \uc8fc\uc548\uc810\uc73c\ub85c \uc124\uc815\ud558\uace0 \uc788\uc2b5\ub2c8\ub2e4.
- \uc218\ud559, \ubb3c\ub9ac, \ud654\ud559, \uc9c0\uad6c\uc2dc\uc2a4\ud15c\uacfc\ud559\ubd80: \uc218\ud559, \uacfc\ud559 \uad50\uacfc\uc758 \ud0c1\uc6d4\uc131\uacfc \uc6d0\ub9ac \ud0d0\uad6c \ub2a5\ub825
- \uc0dd\uba85\uacfc\ud559\ubd80, \uc0dd\ubb3c\ud559\uacfc: \uc601\uc5b4, \uacfc\ud559 \uad50\uacfc \uc911\uc2ec \ud3c9\uac00
- \ud1b5\uacc4\ud559\uacfc: \uc218\ud559, \uc601\uc5b4 \uad50\uacfc \uc911\uc2ec \ud3c9\uac00
- \uacf5\uacfc\ub300\ud559(\uae30\uacc4\uacf5\ud559\ubd80, \uc2e0\uc18c\uc7ac\uacf5\ud559\uacfc, \uae08\uc18d\uc7ac\ub8cc\uacf5\ud559\uacfc, \uac74\ucd95\ud559\ubd80(\uac74\ucd95\uacf5\ud559\uc804\uacf5), \ud1a0\ubaa9\uacf5\ud559\uacfc, \uc751\uc6a9\ud654\ud559\uacf5\ud559\ubd80, \uace0\ubd84\uc790\uacf5\ud559\uacfc, \uc12c\uc720\uc2dc\uc2a4\ud15c\uacf5\ud559\uacfc, \ud658\uacbd\uacf5\ud559\uacfc, \uc5d0\ub108\uc9c0\uacf5\ud559\ubd80): \ubaa8\ub450 \uacf5\ud559\uc758 \uae30\ucd08\uc778 \uc218\ud559, \uacfc\ud559 \uad50\uacfc\uc758 \uc131\ucde8\ub3c4\uc640 \uc2ec\ud654 \uacfc\ubaa9 \uc774\uc218 \ub178\ub825\uc744 \uc9d1\uc911\uc801\uc73c\ub85c \ud3c9\uac00\ud569\ub2c8\ub2e4.
- \uac74\ucd95\ud559\ubd80(\uac74\ucd95\ud559\uc804\uacf5 - 5\ub144\uc81c): \uc601\uc5b4, \uacfc\ud559 \uad50\uacfc \uc911\uc2ec \ud3c9\uac00
- IT\ub300\ud559(\uc804\uc790\uacf5\ud559\ubd80, \ucef4\ud4e8\ud130\ud559\ubd80, \uc804\uae30\uacf5\ud559\uacfc, \ubaa8\ubc14\uc77c\uacf5\ud559\uc804\uacf5): IT \ubc0f \ucca8\ub2e8 \uae30\uc220\uc758 \uae30\ucd08\uac00 \ub418\ub294 \uc54c\uace0\ub9ac\uc998, \ub17c\ub9ac\uc801 \uc0ac\uace0\ub825\uc744 \uc704\ud574 \uc218\ud559, \uacfc\ud559 \uad50\uacfc\ub97c \ub9e4\uc6b0 \uc911\uc694\ud558\uac8c \ubd05\ub2c8\ub2e4.
- \uacfc\ud559\uae30\uc220\ub300\ud559(\uc0c1\uc8fc\ucea0\ud37c\uc2a4) \uacf5\ud559/\uc12c\uc720/\uc2a4\ub9c8\ud2b8 \uad00\ub828: \uc218\ud559, \uacfc\ud559 \uad50\uacfc \uc911\uc2ec \ud3c9\uac00
- \uc2dd\ud488\uc678\uc2dd\uc0b0\uc5c5\ud559\uacfc, \uce58\uc704\uc0dd\ud559\uacfc: \uc601\uc5b4, \uacfc\ud559 \uad50\uacfc \uc911\uc2ec \ud3c9\uac00
- \uc12c\uc720\ud328\uc158\ub514\uc790\uc778\ud559\ubd80(\ud328\uc158\ub514\uc790\uc778\uc804\uacf5): \uad6d\uc5b4, \uc601\uc5b4 \uad50\uacfc \ud3c9\uac00

3. \ub18d\uc5c5\uc0dd\uba85\u00b7\uc0dd\ud0dc\ud658\uacbd \uacc4\uc5f4
- \uc0dd\uba85 \ud604\uc0c1, \ud658\uacbd, \uc2dd\ub7c9 \uc790\uc6d0\uc744 \ub2e4\ub8e8\ub294 \ud2b9\uc131\uc5d0 \ub9de\ucdb0 \uc218\ud559, \uacfc\ud559 \ub610\ub294 \uc601\uc5b4 \uacfc\ubaa9\uc744 \ubd84\ub9ac\ud558\uc5ec \uc9d1\uc911 \ud3c9\uac00\ud569\ub2c8\ub2e4.
- \uc751\uc6a9\uc0dd\uba85\uacfc\ud559\ubd80, \uc2dd\ud488\uacf5\ud559\ubd80, \ubc14\uc774\uc624\uc12c\uc720\uc18c\uc7ac\ud559\uacfc, \ub18d\uc5c5\ud1a0\ubaa9\uacf5\ud559\uacfc, \uc2a4\ub9c8\ud2b8\uc0dd\ubb3c\uc0b0\uc5c5\uae30\uacc4\uacf5\ud559\uacfc: \uc218\ud559, \uacfc\ud559
- \uc2dd\ubb3c\uc758\ud559\uacfc, \uc6d0\uc608\uacfc\ud559\uacfc: \uc601\uc5b4, \uacfc\ud559
- \uc0b0\ub9bc\uacfc\ud559\u00b7\uc870\uacbd\ud559\ubd80, \uc2dd\ud488\uc790\uc6d0\uacbd\uc81c\ud559\uacfc: \uc218\ud559, \uc601\uc5b4
- \ub18d\uc0b0\uc5c5\ud559\uacfc: \uad6d\uc5b4, \uacfc\ud559
- \uc0dd\ud0dc\ud658\uacbd\ub300\ud559(\uc0b0\ub9bc\uc0dd\ud0dc\ubcf4\ud638, \uc2dd\ubb3c\uc790\uc6d0, \uace4\ucda9\uc0dd\uba85\uacfc\ud559, \ub3d9\ubb3c\uc0dd\uba85\uacf5\ud559, \ub9d0/\ud2b9\uc218\ub3d9\ubb3c): \uc601\uc5b4, \uacfc\ud559 \uad50\uacfc \uc774\uc218 \ub178\ub825
- \ucd95\uc0b0\ud559\uacfc: \uc218\ud559, \uacfc\ud559
- \uad00\uad11\ud559\uacfc: \uc601\uc5b4, \uc0ac\ud68c

4. \uc758\uc57d\u00b7\ubcf4\uac74\u00b7\uc0dd\ud65c\uacfc\ud559 \uacc4\uc5f4
- \uc0dd\uba85 \uc874\uc911\uacfc \uc218\uc900 \ub192\uc740 \uc804\uacf5 \uc9c0\uc2dd \uc2b5\ub4dd\uc774 \ud544\uc218\uc801\uc774\ubbc0\ub85c \ucd5c\uc0c1\uc704\uad8c\uc758 \uc774\uacfc\uc801 \ud559\uc5c5 \uc5ed\ub7c9\uc744 \uc694\uad6c\ud569\ub2c8\ub2e4.
- \uc758\uacfc\ub300\ud559(\uc758\uc608\uacfc), \uce58\uacfc\ub300\ud559(\uce58\uc758\uc608\uacfc), \uc218\uc758\uacfc\ub300\ud559(\uc218\uc758\uc608\uacfc), \uc57d\ud559\ub300\ud559(\uc57d\ud559\uacfc): \ud0c1\uc6d4\ud55c \ud559\uc5c5 \uc5ed\ub7c9\uacfc \ub354\ubd88\uc5b4 \uc758\ud559\uc801 \uc9c0\uc2dd\uc758 \uae30\ubc18\uc778 \uc218\ud559, \uacfc\ud559 \uad50\uacfc\uc758 \uc131\ucde8\ub3c4 \ubc0f \uc774\uc218 \ub178\ub825\uc744 \uac00\uc7a5 \ube44\uc911 \uc788\uac8c \ud3c9\uac00\ud569\ub2c8\ub2e4.
- \uac04\ud638\ub300\ud559(\uac04\ud638\ud559\uacfc): \uc601\uc5b4, \uacfc\ud559 \uad50\uacfc
- \uc0dd\ud65c\uacfc\ud559\ub300\ud559(\uc2dd\ud488\uc601\uc591, \uc758\ub958): \uc601\uc5b4, \uacfc\ud559 \uad50\uacfc
- \uc0dd\ud65c\uacfc\ud559\ub300\ud559(\uc544\ub3d9\ud559\ubd80): \uad6d\uc5b4, \uc601\uc5b4 \uad50\uacfc

5. \uc0ac\ubc94\ub300\ud559 (\uad50\uc721 \uacc4\uc5f4)
- \uc0ac\ubc94\ub300\ud559\uc740 \ud559\uc0dd\uc744 \uac00\ub974\uccd0\uc57c \ud558\ub294 \ud2b9\uc131\uc0c1 \ubcf8\uc778\uc774 \uc804\uacf5\ud558\uace0\uc790 \ud558\ub294 \ud574\ub2f9 \uacfc\ubaa9 \uc790\uccb4\ub97c \ud3c9\uac00 \uc8fc\uc548\uc810\uc73c\ub85c \uc0bc\uc2b5\ub2c8\ub2e4.
- \uad6d\uc5b4\uad50\uc721\uacfc(\uad6d, \uc601), \uc601\uc5b4\uad50\uc721\uacfc(\uc601), \ub3c5\uc5b4\uad50\uc721\uc804\uacf5(\uc601): \ud574\ub2f9 \uc5b8\uc5b4 \ubc0f \uc5b4\ud559 \uc5ed\ub7c9
- \uc5ed\uc0ac, \uc9c0\ub9ac, \uc77c\ubc18\uc0ac\ud68c, \uc724\ub9ac\uad50\uc721\uacfc: \ud574\ub2f9 \uad50\uc721\ud559\uc758 \ubf08\ub300\uac00 \ub418\ub294 \uc0ac\ud68c \uc601\uc5ed\uacfc \ud568\uaed8 \uc601\uc5b4(\uc724\ub9ac\uad50\uc721\uc740 \uad6d\uc5b4) \uc5ed\ub7c9
- \uc218\ud559, \ubb3c\ub9ac, \ud654\ud559, \uc0dd\ubb3c, \uc9c0\uad6c\uacfc\ud559, \uc815\ubcf4\u00b7\ucef4\ud4e8\ud130 \uad50\uc721\uacfc: \uac01\uac01 \uacf5\ud1b5\uc801\uc73c\ub85c \uc218\ud559 \uc5ed\ub7c9\uc744 \uc694\uad6c\ud558\uba70, \uacfc\ud559 \uad00\ub828 \uad50\uc721\uacfc\ub294 \uacfc\ud559 \uad50\uacfc\ub97c \ud568\uaed8 \ud3c9\uac00\ud569\ub2c8\ub2e4.
- \uac00\uc815\uad50\uc721\uacfc: \uc601\uc5b4, \uacfc\ud559
- \uad50\uc721\ud559\uacfc: \uad50\uc721 \uc804\ubc18\uc758 \uc5ed\ub7c9\uc744 \uc704\ud574 \uad6d\uc5b4, \uc601\uc5b4, \uad50\uc721\ud559(\uae30\ud0c0) \ud3c9\uac00
- \uccb4\uc721\uad50\uc721\uacfc: \uc218\ud559, \uc601\uc5b4, \uccb4\uc721(\uae30\ud0c0) \uc5ed\ub7c9

\ud83d\udca1 \uc11c\ub958\ud3c9\uac00 \uc900\ube44 \ud301 (\uacb0\ub860)
\uc9c0\uc6d0 \uc2dc \uac00\uc7a5 \uc911\uc694\ud55c \uac83\uc740 \u2018\ubcf8\uc778\uc774 \uc9c0\uc6d0\ud558\ub294 \ud559\uacfc\uc5d0 \uc9c0\uc815\ub41c \uc804\uacf5 \uad00\ub828 \uad50\uacfc(\uc608: \uacf5\ub300=\uc218/\uacfc, \uc601\ubb38\uacfc=\uc601, \uacbd\uc601=\uc218/\uc601)\u2019\ub97c \ud559\uad50\uc0dd\ud65c \uc911\uc5d0 \uc5bc\ub9c8\ub098 \uc8fc\ub3c4\uc801\uc73c\ub85c, \uae4a\uc774 \uc788\uac8c \uacf5\ubd80(\uc2ec\ud654\uacfc\ubaa9 \uc774\uc218 \ub4f1)\ud588\ub294\uac00\uc785\ub2c8\ub2e4. \ud3c9\uac00\uc704\uc6d0\uc740 \ud559\uc0dd\ubd80\uc758 \uc138\ubd80\ub2a5\ub825 \ubc0f \ud2b9\uae30\uc0ac\ud56d(\uc138\ud2b9)\uc744 \ud1b5\ud574 \ud574\ub2f9 \ud575\uc2ec \uacfc\ubaa9\uc5d0 \ub300\ud55c \ud559\uc0dd\uc758 \ud638\uae30\uc2ec, \ud0d0\uad6c \uc5ed\ub7c9, \ud559\uc5c5 \uc131\ucde8\ub3c4\ub97c \ucd5c\uc6b0\uc120\uc73c\ub85c \uac80\uc99d\ud569\ub2c8\ub2e4.
`,
      competencies: {
        academic: "\ud559\uc5c5\uc5ed\ub7c9 (\uc720\ud615 A 30% / \uc720\ud615 B 45%) - \uc885\ud569 \ud559\uc5c5\uc131\ucde8\ub3c4 \ucd94\uc774, \uc804\uacf5 \uad00\ub828 \uad50\uacfc \uc131\ucde8, \uc218\uc5c5 \uc18d \uc790\uae30\uc8fc\ub3c4\uc801 \ud0d0\uad6c \ub178\ub825",
        career: "\uc9c4\ub85c\uc5ed\ub7c9 (\uc720\ud615 A 50% / \uc720\ud615 B 35%) - \uc804\uacf5 \uad00\ub828 \uc9c0\uc815 \uad50\uacfc \uc801\uadf9 \uc774\uc218(\uc2ec\ud654 \ud3ec\ud568), \uc9c4\ub85c \ud0d0\uad6c \uacfc\uc815, \uc9c0\uc2dd \ud655\uc7a5\uc758 \ud3ed",
        community: "\uacf5\ub3d9\uccb4\uc5ed\ub7c9 (\uacf5\ud1b5 20%) - \ud611\uc5c5\u00b7\uc18c\ud1b5\u00b7\uc5ed\ud560 \uc218\ud589\uc758 \ucc45\uc784\uac10\u00b7\ub098\ub214 \ubc30\ub824 \uc2e4\ucc9c \ub4f1 \uc815\uc131\ud3c9\uac00"
      },
      weights: { academic: 0.38, career: 0.42, community: 0.20 }
    },
    "\ubd80\uc0b0\ub300\ud559\uad50": {
      factors: `
[\ubd80\uc0b0\ub300\ud559\uad50 2026\ud559\ub144\ub3c4 \ud559\uc0dd\ubd80\uc885\ud569\uc804\ud615 \uc11c\ub958\ud3c9\uac00 \uae30\uc900 \ubc0f \uc138\ubd80 \uc8fc\uc548\uc810]

\u25a0 \uc11c\ub958\ud3c9\uac00 \uc885\ud569 \uc548\ub0b4 \ubc0f \ud3c9\uac00 \uc808\ucc28
1. \ube14\ub77c\uc778\ub4dc \ud3c9\uac00: \uc9c0\uc6d0\uc790\uc758 성명, \ucd9c\uc2e0\uace0\uad50, \ubd80\ubaa8 \uc9c1\uc5c5 \ub4f1\uc740 \ubaa8\ub450 \ucca0\uc800\ud788 \ube14\ub77c\uc778\ub4dc \ucc98\ub9ac (\uae30\uc7ac \uc2dc \ubd88\uc774\uc775)
2. \ub2e4\uc218 \ub2e4\ub2e8\uacc4 \ub3c5\ub9bd\ud3c9\uac00 \ubc0f \uc870\uc815\ud3c9\uac00: \ud3c9\uac00\uc704\uc6d0 2~3\uc778\uc774 \uac1c\ubcc4 \ub3c5\ub9bd \ud3c9\uac00\ub97c \uc9c4\ud589\ud558\uba70, \uc810\uc218 \ucc28\uc774(15\uc810 \uc774\uc0c1) \ubc1c\uc0dd \uc2dc \uc804\uc784\uc0ac\uc815\uad00 3\uc778\uc774 \ucd94\uac00 \ud3c9\uac00\ud558\ub294 \uc870\uc815\ud3c9\uac00 \uc2dc\ud589
3. \uae30\uc7ac \uae08\uc9c0 \uc0ac\ud56d \uc5c4\uaca9 \uc801\uc6a9: \uacf5\uc778\uc5b4\ud559\uc131\uc801, \uc218\ud559\u00b7\uacfc\ud559\u00b7\uc678\uad6d\uc5b4 \uad50\uacfc \uc678 \uc218\uc0c1\uc2e4\uc801, \ubd80\ubaa8/\uce5c\uc778\ucc99 \uc9c1\uc5c5 \ub4f1 \uae30\uc7ac \uc2dc 0\uc810(\ub610\ub294 \ubd88\ud569\uaca9) \ucc98\ub9ac. \ud559\uad50\ud3ed\ub825 \uc870\uce58\uc0ac\ud56d \ubc1c\uc0dd \uc2dc \uc11c\ub958 \uc815\uc131\ud3c9\uac00 \uc2dc \uac10\uc810\uc73c\ub85c \uac15\ub825 \ubc18\uc601
4. \ud559\uacfc\ubcc4 \ud3c9\uac00 \ud575\uc2ec: \ud559\uacfc\ubcc4 \uc778\uc7ac\uc0c1\uc5d0 \ub530\ub978 **'\ud575\uc2ec \uad8c\uc7a5\uacfc\ubaa9'**\uacfc **'\uad8c\uc7a5\uacfc\ubaa9'**\uc758 \uc8fc\ub3c4\uc801 \uc774\uc218 \uc5ec\ubd80\uac00 \uac00\uc7a5 \ud575\uc2ec\uc801 \uc7a3\ub300

\u25a0 \ud3c9\uac00 \uc694\uc18c \ubc0f \uc8fc\uc548\uc810 (\ud559\uc5c5 40% + \ud0d0\uad6c 40% + \uc0ac\ud68c 20%)
\u2460 \ud559\uc5c5\uc5ed\ub7c9 (40%) [\ud3c9\uac00\uc694\uc18c: \ud559\uc5c5\uc900\ube44\ub3c4, \ud559\uc5c5\uc8fc\ub3c4\uc131] - \ub300\ud559 \uad50\uc721 \uc774\uc218\ub97c \uc704\ud55c \uc804\ubc18\uc801 \uc218\ud559 \ub2a5\ub825
- \uc774\uc218 \uad50\uacfc\uc758 \ud559\uc5c5\uc131\ucde8\ub3c4: \uad6d\uc5b4, \uc218\ud559, \uc601\uc5b4, \uc0ac\ud68c, \uacfc\ud559, \ud55c\uad6d\uc0ac \ub4f1 \uc8fc\uc694 \uad50\uacfc\uc758 \uc131\ucde8 \uc218\uc900 \uc810\uac80
- \uad50\uacfc \uc120\ud0dd \ubc0f \uc774\uc218 \ub178\ub825: \uc815\ud574\uc9c4 \uad50\uc721\uacfc\uc815 \ub0b4\uc5d0\uc11c \uc2a4\uc2a4\ub85c \uc5b4\ub5a4 \uad00\ub828 \uad50\uacfc\ub97c \ucc3e\uc544 \uc218\uac15\ud588\ub294\uac00?
- \ud559\uc5c5 \ud0dc\ub3c4 \ubc0f \ud0d0\uad6c \ub2a5\ub825: \ud559\uad50 \uc218\uc5c5 \uc804\ubc18\uc5d0\uc11c \ub3cb\ubcf4\uc774\ub294 \uc8fc\ub3c4\uc801\uc778 \ud559\uc5c5 \ud0dc\ub3c4\uc640 \ud0d0\uad6c \ub2a5\ub825

\u2461 \ud0d0\uad6c\uc5ed\ub7c9 (40%) [\ud3c9\uac00\uc694\uc18c: \uc790\uae30\uc8fc\ub3c4\uc131, \uc131\uc7a5\uac00\ub2a5\uc131] - \uad00\uc2ec \ubd84\uc57c \uc9c4\ub85c \ud0d0\uc0c9 \ub178\ub825
- \uad00\uc2ec \ubd84\uc57c \uad00\ub828 \uad50\uacfc \uc774\uc218 \ub178\ub825/\uc131\ucde8: \uc9c0\uc6d0 \ud559\uacfc \uc548\ub0b4 \uac00\uc774\ub4dc\uc0c1\uc758 **'(\ud575\uc2ec) \uad8c\uc7a5\uacfc\ubaa9'** \uc801\uadf9 \uc774\uc218\uc640 \uc6b0\uc218\ud55c \uc131\ucde8 \uc5ec\ubd80
- \uc804\uacf5 \uad00\ub828 \ud559\uc5c5 \ud0dc\ub3c4/\ud0d0\uad6c \ub2a5\ub825: \uc9c4\ub85c \ubc0f \uc804\uacf5 \ubd84\uc57c \uc774\ud574\ub3c4\ub97c \ubc14\ud0d5\uc73c\ub85c \ud55c \uae4a\uc774 \uc788\ub294 \uc9c0\uc801 \uc2ec\ud654 \ud0d0\uad6c
- \uc790\uae30\uacc4\ubc1c \ub178\ub825: \ucc3d\uccb4(\uc790\uc728, \ub3d9\uc544\ub9ac, \uc9c4\ub85c) \ub4f1\uc5d0\uc11c \uc2a4\uc2a4\ub85c \ubc1c\uc804\ud558\uae30 \uc704\ud55c \ube44\uad50\uacfc\uc801 \uc9c0\uc18d \ub178\ub825 \uc720\ubb34

\u2462 \uc0ac\ud68c\uc5ed\ub7c9 (20%) [\ud3c9\uac00\uc694\uc18c: \uc0ac\ud68c\uc131 \ubc0f \uc778\uc131] - \uacf5\ub3d9\uccb4 \uc77c\uc6d0\uc73c\ub85c\uc11c\uc758 \uc0ac\uace0\uc640 \ud589\ub3d9
- \ud611\uc5c5 \ub2a5\ub825, \ub9ac\ub354\uc2ed, \uc758\uc0ac\uc18c\ud1b5 \ub2a5\ub825: \ud0c0\uc778\uacfc \ud611\ub825\ud558\uace0 \ub9ac\ub354\uc2ed\uc744 \ubc1c\ud718\ud55c \uad6c\uccb4\uc801 \uc0ac\ub840
- \uacf5\ub3d9\uccb4 \uc758\uc2dd, \uc131\uc2e4\uc131\uacfc \uaddc\uce59 \uc900\uc218: \uaddc\uce59 \uc900\uc218, \ud5cc\uc2e0\uc801 \ub098\ub214\uacfc \ubc30\ub824\uc758 \uc9c4\uc815\uc131

\u25a0 \ub2e8\uacfc\ub300\ud559 \ubc0f \ud559\uacfc\ubcc4 \ud3c9\uac00 \uc8fc\uc548\uc810 (\uc778\uc7ac\uc0c1 \ubc0f \ud575\uc2ec/\uad8c\uc7a5 \uad50\uacfc)
1. \uc778\ubb38\ub300\ud559
- \uc778\ubb38\ud559\uc801 \uc18c\uc591\uacfc \ub17c\ub9ac\uc801 \uc0ac\uace0\ub825 \uc694\uad6c, \uad6d\uc5b4, \uc601\uc5b4, \uc0ac\ud68c \uc704\uc8fc \ud3c9\uac00. (\uc5b4\ubb38\uacc4\uc5f4\uc740 \uc81c2\uc678\uad6d\uc5b4 \uc774\uc218 \uad8c\uc7a5)
- \uad6d\uc5b4\uad6d\ubb38, \uc601\uc5b4\uc601\ubb38, \uc5b8\uc5b4\uc815\ubcf4, \ub178\uc5b4\ub178\ubb38: \uad6d, \uc601, \uc0ac(\ub610\ub294 \uc218\ud559) \uc804\ubc18\uc801 \uc131\ucde8\ub3c4
- \uc911\uc5b4\uc911\ubb38, \uc77c\uc5b4\uc77c\ubb38, \ubd88\uc5b4\ubd88\ubb38, \ub3c5\uc5b4\ub3c5\ubb38: \uac01 \uc804\uacf5 \uc5b8\uc5b4(\uc77c\ubcf8\uc5b4\u2160 \ub4f1) \uc774\uc218 \ub178\ub825 \uae0d\uc815 \ud3c9\uac00
- \uc0ac\ud559: **'\ud55c\uad6d\uc0ac'** \ud575\uc2ec \uad8c\uc7a5\uacfc\ubaa9 \uc9c0\uc815. \uc138\uacc4\uc0ac, \ub3d9\uc544\uc2dc\uc544\uc0ac \uad8c\uc7a5
- \ucca0\ud559: \ub17c\ub9ac/\ube44\ud310\uc801 \uc0ac\uace0, \uc0dd\ud65c\uacfc \uc724\ub9ac, \uc724\ub9ac\uc640 \uc0ac\uc0c1 \ub4f1 \uad8c\uc7a5
- \ud55c\ubb38, \uace0\uace0\ud559: \ud55c\ubb38\u2160(\ud55c\ubb38\ud559), \uad6d/\uc601/\uc0ac \ubc0f \uad00\ucc30\ub825(\uace0\uace0\ud559)

2. \uc0ac\ud68c\uacfc\ud559\ub300\ud559
- \uc0ac\ud68c \ud604\uc0c1\uc5d0 \ub300\ud55c \ud0d0\uad6c\ub825, \ubd84\uc11d\ub825\uc744 \uc911\uc810 \uc2dc\uac01\uc73c\ub85c \ud3c9\uac00
- \ud589\uc815, \uc815\uce58\uc678\uad50, \uc0ac\ud68c\ubcf5\uc9c0, \ubb38\ud5cc\uc815\ubcf4: \uad6d, \uc601, \uc0ac \uc911\uc2ec. \uc0ac\ud68c \ubb38\uc81c \ud574\uacb0 \uc2e4\ucc9c \uc758\uc9c0
- \uc0ac\ud68c: \uc138\uacc4\uc0ac, \uacbd\uc81c, \uc815\uce58\uc640 \ubc95, \uc0ac\ud68c\u00b7\ubb38\ud654 \ub4f1 \ub2e4\uc591\ud55c \ud0d0\uad6c \uc5ed\ub7c9 \uad8c\uc7a5
- \uc2ec\ub9ac, \ubbf8\ub514\uc5b4\ucee4\ubba4\ub2c8\ucf00\uc774\uc158: \uacfc\ud559\uc801\u00b7\ud1b5\uacc4\uc801 \ubd84\uc11d \uc704\ud574 \uad6d/\uc601/\uc0ac \uc678\uc5d0 '\uc218\ud559, \uacfc\ud559' \uc5ed\ub7c9 \ube44\uc911 \uc788\uac8c \ud3c9\uac00

3. \uc790\uc5f0\uacfc\ud559\ub300\ud559
- \uae30\ucd08 \uacfc\ud559 \ud638\uae30\uc2ec\uacfc '\uc804\uacf5 \uad00\ub828 \uc218\ud559/\uacfc\ud559 \uc2ec\ud654 \uacfc\ubaa9 \uc774\uc218 \ub178\ub825'\uc774 \ud569\uaca9 \ud575\uc2ec
- \uc218\ud559, \ud1b5\uacc4: '\ubbf8\uc801\ubd84, \uae30\ud558, \ud655\ub960\uacfc \ud1b5\uacc4' \uc9d1\uc911 \ud3c9\uac00
- \ubb3c\ub9ac: \ubb3c\ub9ac\u2160 \uad8c\uc7a5 \ubc0f \uc218/\uacfc \uc804\ubc18 \ud3c9\uac00
- \ud654\ud559: **'\ud654\ud559\u2160'** \ud575\uc2ec, \ubbf8\uc801\ubd84 \ubc0f \ud654\ud559\u2161 \uc774\uc218 \uad8c\uc7a5
- \uc0dd\uba85\uacfc\ud559, \ubbf8\uc0dd\ubb3c, \ubd84\uc790\uc0dd\ubb3c: **'\uc0dd\uba85\uacfc\ud559\u2160/\u2161'** \ucd5c\uc6b0\uc120 \ud575\uc2ec \ud655\uc778, \ud654\ud559\u2160 \uac15\ub825 \uad8c\uc7a5
- \uc9c0\uc9c8\ud658\uacbd, \ud574\uc591, \ub300\uae30\ud658\uacbd: \uad6d, \uc601, \uacfc \uae30\ubcf8\uc5d0 \ubbf8\uc801\ubd84/\ubb3c\ub9ac\u2160/\uc9c0\uad6c\uacfc\ud559\u2160\u00b7\u2161 \uad8c\uc7a5

4. \uacf5\uacfc\ub300\ud559
- \uc218\ud559 \ubc0f \uae30\ucd08 \uacfc\ud559 \uae30\ubc18 \uacf5\ud559\uc801 \ucc3d\uc758\uc131\uacfc \ubb38\uc81c\ud574\uacb0 \ub2a5\ub825
- \uae30\uacc4, \uc804\uae30\uc804\uc790, \ud56d\uacf5\uc6b0\uc8fc, \uc0ac\ud68c\uae30\ubc18, \uc870\uc120\ud574\uc591: '\ubbf8\uc801\ubd84, \ubb3c\ub9ac\ud559\u2160' \ucd5c\uc6b0\uc120 \ud575\uc2ec
- \uc7ac\ub8cc, \uc720\uae30\uc18c\uc7ac, \ud654\uacf5\uc0dd\uba85, \ud658\uacbd, \uace0\ubd84\uc790: '\ubbf8\uc801\ubd84, \ubb3c\ub9ac\ud559\u2160, \ud654\ud559\u2160' 3\uacfc\ubaa9 \ubaa8\ub450 \uc9c0\uc815
- \uc0b0\uc5c5, \ub3c4\uc2dc, \uac74\ucd95, \uac74\ucd95\uacf5: \uac74\ucd95/\uc0b0\uc5c5/\ub3c4\uc2dc\ub294 \uc218\ud559, \uc601\uc5b4, \uacfc/\uc0ac \ud3c9\uac00. \uac74\ucd95\uacf5\uc740 \ubb3c\ub9ac\ud559\u2160 \ud575\uc2ec
- \uc2e0\uc124 \uc735\ud569/\uc790\uc728\uc804\uacf5(\ucca8\ub2e8IT/\uc18c\uc7ac/\ubaa8\ube4c\ub9ac\ud2f0 \ub4f1): \uc138\ubd80 \uc804\uacf5 \ub9de\ucdb0 \ubbf8\uc801\ubd84/\ubb3c\ub9ac\ud559\u2160/\ud654\ud559\u2160 \ud575\uc2ec/\uad8c\uc7a5 \uc801\uc6a9

5. \uc0ac\ubc94\ub300\ud559
- \uac00\ub974\uce58\uace0\uc790 \ud558\ub294 \uc804\uacf5 \uad50\uacfc\uc758 \uc555\ub3c4\uc801 \ud559\uc5c5 \uc131\ucde8\ub3c4 \ubc0f \uc18c\uba85 \uc758\uc2dd \ud3c9\uac00
- \uac01 \uad50\uacfc\uad50\uc721\uacfc(\uad6d\uc5b4, \uc601\uc5b4, \uc5ed\uc0ac \ub4f1): \uc804\uacf5 \uba85\uce6d\uc5d0 \ud574\ub2f9\ud558\ub294 \uad50\uacfc\ubaa9(\uad6d\uc5b4, \uc138\uacc4\uc0ac \ub4f1) \ud0c1\uc6d4\uc131 \uc694\uad6c
- \uc218\ud559\uad50\uc721, \uacfc\ud559\uacc4\uc5f4 \uad50\uc721\uacfc: \ubbf8\uc801\ubd84/\uae30\ud558, \ubb3c\ub9ac\ud559\u2160/\ud654\ud559\u2160/\uc0dd\uba85\uacfc\ud559\u2160/\uc9c0\uad6c\uacfc\ud559\u2160 \ub4f1 \uc2ec\ud654 \uc774\uc218 \uadf9\ud788 \uc911\uc694
- \uad50\uc721, \uc720\uc544\uad50\uc721, \ud2b9\uc218\uad50\uc721: \uad6d\uc5b4, \uc601\uc5b4, \uc0ac\ud68c \uae30\ubc18(\uc720\uc544\ub294 \uacfc\ud559 \ud3ec\ud568) \uc18c\uba85 \uc758\uc2dd

6. \uacbd\uc81c\ud1b5\uc0c1\ub300\ud559, \uacbd\uc601\ub300\ud559
- \uae00\ub85c\ubc8c \ub9c8\uc778\ub4dc, \uc0ac\ud68c\uacfc\ud559\uc801 \ubd84\uc11d\ub825\uc744 \uc704\ud574 '\uad6d\uc5b4, \uc218\ud559, \uc601\uc5b4' \ud575\uc2ec \ud3c9\uac00 (\uacbd\uc81c\ud559\ubd80\ub294 \ubbf8\uc801\ubd84, \uacbd\uc81c\uc218\ud559 \uc801\uadf9 \uad8c\uc7a5)
- \uad6d\uc81c\ud559\ubd80, \uad00\uad11\ucee8\ubca4\uc158: \uad6d, \uc601, \uc0ac \uc911\uc2ec. \uc2ec\ud654 \uc601\uc5b4 \uacfc\ubaa9 \uc774\uc218 \uad8c\uc7a5

7. \uc0dd\ud65c\uacfc\ud559\ub300\ud559, \uc0dd\uba85\uc790\uc6d0\uacfc\ud559\ub300\ud559(\ubc00\uc591)
- \uc0dd\ud65c\uacfc\ud559: \uc2dd\ud488\uc601\uc591(\ud654\ud559\u2160, \uc0dd\uba85\uacfc\ud559\u2160 \ube44\uc911), \uc774\uc678 \ud559\uacfc\ub294 \uad6d/\uc601/\uc0ac/\uacfc \ud2b9\uc131 \ub9de\ucda4 \uae30\ucd08 \uc5ed\ub7c9
- \uc0dd\uba85\uc790\uc6d0: \uc6d0\uc608\uc0dd\uba85/\uc2dd\ud488\uacf5\ud559/\ubc14\uc774\uc624\uc18c\uc7ac/\ud658\uacbd\ud654\ud559 \ub4f1 \ub300\ub2e4\uc218(\ud654\ud559\u2160, \uc0dd\uba85\uacfc\ud559\u2160 \uc9d1\uc911 \ud3c9\uac00), \uc735\ud569\uae30\uacc4\ub958(\ubbf8\uc801\ubd84, \ubb3c\ub9ac\ud559\u2160)

8. \uc815\ubcf4\uc758\uc0dd\uba85\uacf5\ud559\ub300\ud559, \ud559\ubd80\ub300\ud559, \uc758\uc57d\u00b7\ubcf4\uac74\u00b7\uac04\ud638 \uacc4\uc5f4
- \uc815\ubcf4\ucef4\ud4e8\ud130: '\ubbf8\uc801\ubd84, \ubb3c\ub9ac\ud559\u2160, \ud655\ub960\uacfc \ud1b5\uacc4' \ucef4\ud4e8\ud305 \uc0ac\uace0\ub825\uc758 \ud575\uc2ec
- \ucca8\ub2e8\uc735\ud569\ud559\ubd80 \ub4f1: \ubbf8\uc801\ubd84, \ubb3c\ub9ac\ud559\u2160, \ud654\ud559\u2160, \uc0dd\uba85\uacfc\ud559\u2160 \uc774\uacfc \uae30\ucd08 \uc5ed\ub7c9 \ud655\uc778
- \uc758/\uce58/\ud55c/\uc57d/\uac04\ud638 (\uc591\uc0b0): \ucd5c\uc0c1\uc704 \uc218\ud559/\uacfc\ud559 \ud559\uc5c5 \ub2a5\ub825 \ubc0f \uc0dd\uba85\uc874\uc911 \uc724\ub9ac. \ud2b9\ud788 \uc758\uc608/\ud55c\uc758\ud559/\uc57d\ud559\uc740 **'\ud654\ud559\u2160, \uc0dd\uba85\uacfc\ud559\u2160(\uc758\ud559\uc740 \ubbf8\uc801\ubd84 \ud3ec\ud568)'** \uac15\uc81c \ud575\uc2ec

\ud83d\udca1 \uc11c\ub958\ud3c9\uac00 \uacb0\ub860 \ubc0f \uae30\uc7ac \uae08\uc9c0(0\uc810) \uc720\uc758\uc0ac\ud56d
\uac00\uc7a5 \ud569\ubd88\uc5d0 \ud070 \uc601\ud5a5\uc744 \ubbf8\uce58\ub294 \uac83\uc740 \ubaa8\uc9d1\ub2e8\uc704\ubcc4 **'(\ud575\uc2ec) \uad8c\uc7a5\uacfc\ubaa9'** \uc774\uc218 \ubc0f \uad50\uacfc \uc138\ud2b9\uc744 \ud1b5\ud55c \uc2ec\uce35 \ud0d0\uad6c \uc5ec\ubd80\uc785\ub2c8\ub2e4. \ucd94\uac00\ub85c \uc790\uc18c\uc11c\uac00 \ud3d0\uc9c0\ub418\uc5c8\uc73c\ubbc0\ub85c, \ud559\uc0dd\ubd80 \ub0b4 \ubd80\ubaa8 \uc9c1\uc5c5, \uc678\ubd80 \uacf5\uc778\uc5b4\ud559\uc131\uc801/\uc218\uc0c1\uc2e4\uc801\uc774 \uae30\uc7ac\ub420 \uc2dc 0\uc810(\ub610\ub294 \ubd88\ud569\uaca9) \ucc98\ub9ac\ub41c\ub2e4\ub294 \uc810\uc744 \uc8fc\uc758\ud574\uc11c \uac78\ub7ec\ub0b4\uc57c \ud569\ub2c8\ub2e4. \ud559\uad50\ud3ed\ub825 \uae30\uc7ac \uc0ac\ud56d \uc5ed\uc2dc \uac15\ub825\ud55c \uac10\uc810 \uc694\uc778\uc785\ub2c8\ub2e4.
`,
      competencies: {
        academic: "\ud559\uc5c5\uc5ed\ub7c9 (40%) - \ud559\uc5c5\uc900\ube44\ub3c4 \ubc0f \ud559\uc5c5\uc8fc\ub3c4\uc131: \uc804\ubc18\uc801 \uc8fc\uc694 \uad50\uacfc \ud559\uc5c5\uc131\ucde8, \uc8fc\ub3c4\uc801\uc778 \ud559\uc5c5 \ud0dc\ub3c4 \ud655\uc778",
        career: "\ud0d0\uad6c\uc5ed\ub7c9 (40%) - \uc790\uae30\uc8fc\ub3c4\uc131 \ubc0f \uc131\uc7a5\uac00\ub2a5\uc131: **'\ud575\uc2ec \uad8c\uc7a5\uacfc\ubaa9'** \uc758\ub3c4\uc801 \uc774\uc218 \uc5ec\ubd80, \uc9c4\ub85c \uad00\ub828 \uc2ec\uce35 \ud0d0\uad6c \uc804\uac1c",
        community: "\uc0ac\ud68c\uc5ed\ub7c9 (20%) - \uc0ac\ud68c\uc131 \ubc0f \uc778\uc131: \ub9ac\ub354\uc2ed, \uc18c\ud1b5, \ud611\ub825, \ud559\ud3ed \uc5ec\ubd80 \uc815\uc131 \uacb0\uc810 \ub4f1 \ubc18\uc601"
      },
      weights: { academic: 0.40, career: 0.40, community: 0.20 }
    },
    "\uc778\ud558\ub300\ud559\uad50": {
      factors: `
[\uc778\ud558\ub300\ud559\uad50 2026\ud559\ub144\ub3c4 \ud559\uc0dd\ubd80\uc885\ud569\uc804\ud615 \uc11c\ub958\ud3c9\uac00 \uae30\uc900 \ubc0f \ud559\uad50/\uc804\ud615\ubcc4 \ud3c9\uac00 \uc8fc\uc548\uc810]

\u25a0 \uc11c\ub958\ud3c9\uac00 \uc885\ud569 \uc548\ub0b4 \ubc0f \ud3c9\uac00 \uc808\ucc28
1. \ube14\ub77c\uc778\ub4dc \ud3c9\uac00: \uc9c0\uc6d0\uc790\uc758 성명, 수험번호, \uc18c\uc18d \uace0\uad50 \ub4f1 \ucca0\uc800\ud788 \ube14\ub77c\uc778\ub4dc \ucc98\ub9ac (\uae30\uc7ac \uc2dc \ubd88\uc774\uc775)
2. \ub2e4\uc218 \ub2e4\ub2e8\uacc4 \ub3c5\ub9bd\ud3c9\uac00: \uc9c0\uc6d0\uc790 1\uba85\ub2f9 2\uba85\uc758 \ud3c9\uac00\uc704\uc6d0\uc774 \ubc30\uc815\ub418\uc5b4 \ub3c5\ub9bd\uc801\uc73c\ub85c \uc11c\ub958\ub97c \ud3c9\uac00\ud558\uba70 \uc2ec\uc758\uc704\uc6d0\ud68c\ub97c \uad6c\uc131\ud574 \ub2e4\ub2e8\uacc4\ub85c \uc6b4\uc601
3. \ubcf5\ud569\u00b7\uc720\uae30\uc801 \ud3c9\uac00 \ubc29\uc2dd: \ud2b9\uc815 \ud56d\ubaa9\ub9cc \ub5bc\uc5b4 \ubcf4\uc9c0 \uc54a\uace0 \ud559\uad50\uc0dd\ud65c\uae30\ub85d\ubd80 \uc804\uccb4 \ud56d\ubaa9\uc744 \uc720\uae30\uc801\uc73c\ub85c \uc5f0\uacb0\ud558\uc5ec \ud559\uc0dd\uc758 \ub178\ub825\uacfc \uc9c0\uc801 \uc131\uc7a5\uc744 \uc885\ud569\uc801\uc73c\ub85c \uad00\ucc30
4. \uae30\uc7ac \uae08\uc9c0 \uc0ac\ud56d \ubc0f \uac10\uc810: \ud559\uad50\ud3ed\ub825 \uc870\uce58\uc0ac\ud56d\uc774 \uae30\uc7ac\ub41c \uacbd\uc6b0 \uc11c\ub958 \uc815\uc131\ud3c9\uac00 \uacfc\uc815\uc5d0\uc11c \ucd5c\ub300 50\uc810 \uac10\uc810 \ud639 \ubd80\uc801\uaca9(\ud0c8\ub77d) \ucc98\ub9ac\ub420 \uc218 \uc788\uc73c\ubbc0\ub85c \ub9e4\uc6b0 \uc5c4\uaca9\ud788 \ud3c9\uac00\ud568

\u25a0 \uc804\ud615\ubcc4 \ud575\uc2ec \uc5ed\ub7c9 \ube44\uc728 \uba85\uc2dc (\uc9c0\uc6d0 \uc804\ud615\uc5d0 \ub9de\ucdb0 \ubd84\uc11d \ud3ec\uc778\ud2b8 \uc870\uc815 \ud544\uc218)
\uc778\ud558\ub300\ud559\uad50\ub294 \ud559\uacfc\ubcc4 \uc778\uc7ac\uc0c1 \ubd84\ub9ac\ubcf4\ub2e4\ub294, \uc9c0\uc6d0\uc790\uac00 \uc120\ud0dd\ud55c **'\uc804\ud615(\uba74\uc811\ud615 vs \uc11c\ub958\ud615)'**\uc5d0 \ub530\ub77c \uc911\uc810 \ud3c9\uac00 \uc694\uc18c\uc758 \ubc18\uc601 \ube44\uc728\uc774 \uadf9\uba85\ud558\uac8c \ub2e4\ub985\ub2c8\ub2e4. \uc804\ud615\uc774 \uba85\uc2dc\ub418\uc9c0 \uc54a\uc740 \uacbd\uc6b0, \uc544\ub798 \ub450 \uc804\ud615\uc758 \uc870\uac74\uc744 \ubaa8\ub450 \uace0\ub824\ud558\uc5ec \ubd84\uc11d\ud558\uc2ed\uc2dc\uc624.
- \uc778\ud558\ubbf8\ub798\uc778\uc7ac(\uba74\uc811\ud615): 1\ub2e8\uacc4 \uc11c\ub958 100%(3.5\ubc30\uc218, \uc758\uc608 3\ubc30\uc218) \u2192 2\ub2e8\uacc4 \uba74\uc811 30%. **\uc9c4\ub85c\ud0d0\uad6c\uc5ed\ub7c9(50%)** > \uae30\ucd08\ud559\uc5c5\uc5ed\ub7c9(30%) > \uacf5\ub3d9\uccb4\uc5ed\ub7c9(20%) \ube44\uc911
- \uc778\ud558\ubbf8\ub798\uc778\uc7ac(\uc11c\ub958\ud615) \ub4f1: \ubcc4\ub3c4 \uba74\uc811 \uc5c6\uc774 \uc11c\ub958\uc885\ud569\ud3c9\uac00 100% \uc77c\uad04 \ud569\uc0b0. **\uae30\ucd08\ud559\uc5c5\uc5ed\ub7c9(50%)** > \uc9c4\ub85c\ud0d0\uad6c\uc5ed\ub7c9(30%) > \uacf5\ub3d9\uccb4\uc5ed\ub7c9(20%) \ube44\uc911

\u25a0 \ud575\uc2ec 3\ub300 \ud3c9\uac00 \uc694\uc18c \ubc0f \uc138\ubd80 \uc8fc\uc548\uc810

1. \uae30\ucd08\ud559\uc5c5\uc5ed\ub7c9 (\uc11c\ub958\ud615 \ucd5c\uc0c1\uc704 \ube44\uc911 50% / \uba74\uc811\ud615 30%) - \ub300\ud559 \uc218\ud559\uc744 \uc704\ud55c \uae30\ubcf8\uc801\uc778 \ud559\uc5c5\ub2a5\ub825 \ubc0f \ud559\uc2b5\ud0dc\ub3c4
- \ud3c9\uac00 \uc9c0\ud45c: \ud559\uc5c5\ub2a5\ub825(\uc11c\ub958 30/\uba74\uc811 20), \ud559\uc2b5\ud0dc\ub3c4(\uc11c\ub958 20/\uba74\uc811 10)
- \ud559\uc5c5\ub2a5\ub825: \ub0b4\uc2e0 \ub4f1\uae09\uc758 \uae30\uacc4\uc801 \uc218\uce58\ud654 \uc9c0\uc591. \uc6d0\uc810\uc218, \ud3c9\uade0, \ud3b8\ucc28, \uc218\uac15 \uc778\uc6d0\uc744 \uc885\ud569\ud574 \uad50\uacfc\ubcc4/\ud559\ub144\ubcc4 \uc131\uc801 \ucd94\uc774\uc640 \uc131\ucde8\ub3c4\ub97c \uc0b4\ud53c\uba70, \ud559\uae30\ubcc4 \uad50\uc721 \ud658\uacbd\uc744 \uac10\uc548\ud55c \uc885\ud569 \ud559\ub825 \ud3c9\uac00.
- \ud559\uc2b5\ud0dc\ub3c4: \uc804\uacf5\uacfc \uad00\ub828\uc774 \uc801\uc740 \ube44\uc8fc\ub825 \uad50\uacfc\ub77c\ub3c4 \uc18c\ud640\ud788 \ud558\uc9c0 \uc54a\uace0 \uc218\uc5c5\uc5d0 \ub2a5\ub3d9\uc801\uc73c\ub85c \ucc38\uc5ec\ud558\uace0 \ubc1c\uc804\ud558\ub824 \ud55c \ub113\uace0 \uae4a\uc740 \uc804\ubc18\uc801\uc778 \ud559\uc2b5 \uc131\uc2e4\ud568\uc744 \uc138\ud2b9\uc744 \ud1b5\ud574 \ub9e4\uc6b0 \uc911\uc810\uc801\uc73c\ub85c \ud3c9\uac00.

2. \uc9c4\ub85c\ud0d0\uad6c\uc5ed\ub7c9 (\uba74\uc811\ud615 \ucd5c\uc0c1\uc704 \ube44\uc911 50% / \uc11c\ub958\ud615 30%) - \uc9c4\ub85c \uac1c\ubc1c\uc744 \uc704\ud55c \uad00\uc2ec \ubc0f \ud0d0\uad6c\ud65c\ub3d9
- \ud3c9\uac00 \uc9c0\ud45c: \uc9c4\ub85c\uad00\uc2ec(\uba74\uc811 20/\uc11c\ub958 10), \ud0d0\uad6c\uc5ed\ub7c9(\uba74\uc811 30/\uc11c\ub958 20)
- \uc9c4\ub85c\uad00\uc2ec: \uc9c4\ub85c\uc5d0 \ud544\uc694\ud558\ub2e4\uba74 \uc218\uac15 \uc778\uc6d0\uc774 \uc801\uc5b4 \uc131\uc801 \ubc1b\uae30 \ud798\ub4e0 \uacfc\ubaa9\ub3c4 \uacfc\uac10\ud558\uac8c \ub3c4\uc804\ud558\uc5ec \uc8fc\ub3c4\uc801\uc73c\ub85c \uc774\uc218\ud558\ub294 \ud0dc\ub3c4\ub97c \uae0d\uc815 \ud3c9\uac00. \uad50\ub0b4 \uc9c4\ub85c \uc5f0\uacc4 \ud65c\ub3d9 \uc801\uadf9 \ucc38\uc5ec \uc5ec\ubd80.
- \ud0d0\uad6c\uc5ed\ub7c9: \ud638\uae30\uc2ec\uacfc \uc9c8\ubb38\uc744 \ubc14\ud0d5\uc73c\ub85c, \ub3c5\uc11c\ub098 \ucd94\uac00\uc801\uc778 \uc2ec\ud654 \uc790\ub8cc \uc870\uc0ac \ub4f1 \uc2b5\ub4dd\ud55c \uc9c0\uc2dd\uc758 \uae4a\uc774\ub97c \ub354\ud558\uae30 \uc704\ud574 \ub178\ub825\ud558\uba70 \uc9c0\uc801 \uc131\uc7a5\uc774 \uc774\ub904\uc84c\ub294\uc9c0 \uad50\uacfc \uc138\ud2b9 \ubc0f \ucc3d\uccb4\uc5d0\uc11c \ud3c9\uac00.

3. \uacf5\ub3d9\uccb4\uc5ed\ub7c9 (\uacf5\ud1b5 \ube44\uc911 20%) - \ud559\uad50\uc0dd\ud65c\uc744 \ud1b5\ud574 \ub4dc\ub7ec\ub098\ub294 \uacf5\ub3d9\uccb4 \ub0b4\uc5d0\uc11c\uc758 \uac00\uce58\uad00 \ubc0f \ud0dc\ub3c4
- \ud3c9\uac00 \uc9c0\ud45c: \uc131\uc2e4, \ub9ac\ub354\uc2ed, \ubc30\ub824, \ud611\uc5c5 (\uacf5\ud1b5 20%)
- \uad00\ucc30 \uc601\uc5ed: \ud559\uc0dd\ubd80 \uc804\ubc18\uc5d0 \uac78\uce5c \ucd9c\uacb0, \uc790\uc728/\ubd09\uc0ac, \ucc3d\uccb4, \ud589\ud2b9 \ubc18\uc601.
- \uac70\ucc3d\ud55c \uc784\uc6d0 \ud65c\ub3d9\uc774 \uc5c6\ub354\ub77c\ub3c4, \ubaa8\ub974\ub294 \uac83\uc744 \uacf5\uc720\ud558\uac70\ub098 \ub0a8\ub4e4\uc774 \uaebc\ub9ac\ub294 \uccad\uc18c\ub97c \uc8fc\ub3c4\ud558\ub294 \ub4f1 \uc77c\uc0c1\uc801\uc774\uace0 \uc791\uace0 \uc18c\ubc15\ud55c \uc2e4\ucc9c \uc0ac\ub840\ub4e4 \uc18d\uc5d0\uc11c \ube5b\ub098\ub294 \ubc30\ub824\uc2ec, \ub530\ub73b\ud55c \ud5cc\uc2e0, \ud611\ub825 \ud0dc\ub3c4\ub97c \uc720\ucd94\ud558\uc5ec \uae0d\uc815 \ud3c9\uac00.

\u25a0 \uc8fc\uc694 \uc735\ud569 \ud2b9\uc131\ud654 \ud559\uacfc\ubcc4 \uc804\uacf5 \uad00\ub828 \uad50\uacfc \ud3c9\uac00 \ubc0f \uc2ec\ub3c4 \uae4a\uc740 \ud2b9\ubcc4 \uc9c0\uce68
\ud2b9\uc815 \uc735\ud569\u00b7\ud2b9\uc131\ud654 \ud559\uacfc\uc758 \uacbd\uc6b0 \ub2e4\ubc29\uba74 \uad50\uacfc\uc758 \uc735\ud569\uc801 \ud0d0\uad6c\uac00 \ub3cb\ubcf4\uc5ec\uc57c \ud569\ub2c8\ub2e4.
- \uacf5\uac04\uc815\ubcf4\uacf5\ud559\uacfc (GIS, \uc6d0\uaca9\ud0d0\uc0ac, \ucf54\ub529 \ub4f1 \uc735\ud569): \ubbf8\uc801\ubd84, \ud655\ud1b5, \ubb3c\ub9ac\ud559\u2160/\u2161, \ud654\ud559\u2160/\u2161, \uc9c0\ud559\u2160/\u2161, \ud55c\uad6d\uc9c0\ub9ac, \uacbd\uc81c, \uc0ac\ud68c\ubb38\uc81c \ud0d0\uad6c \ub4f1 \uc218\ub9ac\u00b7\uacfc\ud559\u00b7\uc9c0\ub9ac \uc735\ud569 \uc18c\uc591.
- \uac04\ud638\ud559\uacfc (\uc758\ub8cc + \uc778\ubb38 \uacf5\uac10\ub2a5\ub825): \ud655\ud1b5, \ud654\ud559\u2160/\u2161, \uc0dd\uacfc\u2160/\u2161, \uc0dd\ud65c\uacfc\uc724\ub9ac, \uc815\uce58\uc640\ubc95, \ubcf4\uac74 \ub4f1 \uae30\ucd08 \uacfc\ud559\uacfc \ud0c0\ub2f9\ud55c \uc724\ub9ac\uc758\uc2dd.
- \uc758\ub958\ub514\uc790\uc778\ud559\uacfc (\uc2e0\uc18c\uc7ac/\uc6e8\uc5b4\ub7ec\ube14): \ubbf8\uc801\ubd84, \uae30\ud558, \ud655\ud1b5, \ubb3c\ub9ac\ud559\u2160/\u2161, \ud654\ud559\u2160, AI\uc218\ud559/\uae30\ucd08, \ub17c\ub9ac\ud559/\uc815\ubc95 \ub4f1 \uc124\uacc4\uc801/\uc608\uc220\uc131\uc744 \ub354\ud55c \uacf5\ud559, \ub17c\ub9ac \uc18c\uc591.
- \uc0dd\uba85\uacfc\ud559/\ucca8\ub2e8\ubc14\uc774\uc624\uc758\uc57d (\ubc14\uc774\uc624\uc2dc\uc2a4\ud15c\uc735\ud569): \ubbf8\uc801/\uae30\ud558/\ud655\ud1b5 \uc804\ubc18, \ubb3c\ub9ac\ud559\u2160, \ud654\ud559\u2160/\u2161, \uc0dd\uacfc\u2160/\u2161, \uc0dd\ud65c\uacfc\uc724\ub9ac \ub4f1 \uc218\ub9ac\u00b7\uacfc\ud559 \uc555\ub3c4\uc801 \ud559\uc5c5 \uc131\ucde8\uc640 \ub3c4\ub355\uc801 \uc0dd\uba85 \uc724\ub9ac \uc758\uc2dd.

\ud83d\udca1 \uc11c\ub958\ud3c9\uac00 \uacb0\ub860 \ud301:
\uc9c0\uc6d0\uc790\uc758 \uc9c0\uc801 \uc5ed\ub7c9 \uac1c\ubc1c \ubc0f \ucd94\uac00 \uc870\uc0ac\u00b7\ub3c5\uc11c \ub4f1 \uc804\uacf5 \uc9c0\ud5a5\uc801 \ud655\uc7a5 \ud0d0\uad6c\uac00 \uc138\ud2b9\uc5d0\uc11c \ud655\uc5f0\ud788 \ube5b\ub098\uba70 \uc18c\uc218 \uc778\uc6d0 \uacfc\ubaa9\uc5d0 \uacfc\uac10\ud788 \ub3c4\uc804\ud588\ub2e4\uba74 '\uba74\uc811\ud615(\uc9c4\ub85c\ud0d0\uad6c\uc5ed\ub7c9 50%)' \ucd94\ucc9c \uc804\ub7b5\uc744, \ube44\uad00\ub828 \uacfc\ubaa9\uc744 \ud3ec\ud568\ud55c \ubaa8\ub4e0 \uad50\uacfc \ud559\uc5c5 \uc131\ucde8\uc758 \uc555\ub3c4\uc801 \uc131\uc2e4\ub3c4\uc640 \uafb8\uc900\ud568\uc774 \ubcf4\uc778\ub2e4\uba74 '\uc11c\ub958\ud615(\uae30\ucd08\ud559\uc5c5\uc5ed\ub7c9 50%)' \ucd94\ucc9c \uc804\ub7b5\uc744 \uc81c\uc2dc\ud558\uc2ed\uc2dc\uc624. \ub354\ubd88\uc5b4 \ud559\ud3ed \uc870\uce58\uc0ac\ud56d \uae30\uc7ac \uc5ec\ubd80\ub97c \ubc18\ub4dc\uc2dc \ud544\ud130\ub9c1\ud558\uc5ec \uac10\uc810(\ubd80\uc801\uaca9) \uc0ac\ud56d\uc73c\ub85c \uacbd\uace0\ud574\uc57c \ud569\ub2c8\ub2e4.
`,
      competencies: {
        academic: "\uae30\ucd08\ud559\uc5c5\uc5ed\ub7c9 (\uc11c\ub958\ud615 50% / \uba74\uc811\ud615 30%) - \uc6d0\uc810\uc218/\uc218\uac15\uc778\uc6d0 \uc0c1\ud669 \uace0\ub824\ud55c \uc815\uc131\uc801 \uc804\uccb4 \uad50\uacfc \uc131\ucde8\ub3c4, \ube44\uc8fc\ub825 \uad50\uacfc\ub97c \ud3ec\ud568\ud55c \ubaa8\ub4e0 \uc218\uc5c5\uc758 \ub2a5\ub3d9\uc801/\uc131\uc2e4\ud55c \ucc38\uc5ec\ub3c4 \uac80\uc99d",
        career: "\uc9c4\ub85c\ud0d0\uad6c\uc5ed\ub7c9 (\uc11c\ub958\ud615 30% / \uba74\uc811\ud615 50%) - \ud76c\ub9dd \uc9c4\ub85c \uc9c0\uc815 \uacfc\ubaa9 \uacfc\uac10\ud55c \ub3c4\uc804 \uc758\uc2dd(\uc18c\uc218\uac15\uc88c \uc774\uc218), \uc735\ud569 \ub3c5\uc11c \ubc0f \ucd94\uac00 \uc2ec\ud654 \uc870\uc0ac\ub97c \ud1b5\ud55c \uc9c0\uc801 \ud0d0\uad6c \uacfc\uc815 \uc131\uc7a5\uc131",
        community: "\uacf5\ub3d9\uccb4\uc5ed\ub7c9 (\uacf5\ud1b5 20%) - \uac70\ucc3d\ud55c \ub9ac\ub354\uc2ed\ubcf4\ub2e4\ub294 \uc77c\uc0c1\uc5d0\uc11c\uc758 \uc18c\ubc15\ud55c \uc2e4\ucc9c\uc801 \ubc30\ub824, \uccad\uc18c/\ud559\uc2b5 \uacf5\uc720 \ub4f1 \uc774\ud0c0\uc801 \ud611\uc5c5, \uc131\uc2e4, \ud559\ud3ed \uc5ec\ubd80 \uc815\uc131\uc801 \uac15\ub825 \uc81c\uc7ac \ubc18\uc601"
      },
      weights: { academic: 0.40, career: 0.40, community: 0.20 } // \uba74\uc811/\uc11c\ub958 \ub450 \uae30\uc900\uc758 \ud3c9\uade0\uce58 \uc815\ub3c4\uc758 \uac00\uc911\uce58\ub85c AI\uac00 \uade0\ud615\uc788\uac8c \ud3c9\uac00\ud558\ub3c4\ub85d \uc720\ub3c4
    },
    "\uc544\uc8fc\ub300\ud559\uad50": {
      factors: `
[\uc544\uc8fc\ub300\ud559\uad50 2026\ud559\ub144\ub3c4 \ud559\uc0dd\ubd80\uc885\ud569\uc804\ud615 \uc11c\ub958\ud3c9\uac00 \uae30\uc900 \ubc0f \uc804\ud615/\ud559\uacfc\ubcc4 \ud3c9\uac00 \uc8fc\uc548\uc810]

\u25a0 \uc11c\ub958\ud3c9\uac00 \uc885\ud569 \uc548\ub0b4 \ubc0f \ubc29\ubc95
1. \ub2e4\uc218 \ud3c9\uac00\uc790 \ubc0f \ube14\ub77c\uc778\ub4dc \ud3c9\uac00: \uc9c0\uc6d0\uc790 1\uba85\ub2f9 \ubcf5\uc218\uc758 \uc785\ud559\uc0ac\uc815\uad00\uc774 \uac00\ubc88\ud638\ub97c \ubd80\uc5ec\ubc1b\uc544 \ucd9c\uc2e0 \uace0\uad50/성명 \ub4f1\uc744 \ucca0\uc800\ud788 \ube14\ub77c\uc778\ub4dc \ucc98\ub9ac\ud55c \ucc44 \ub3c5\ub9bd\uc801\uc774\uace0 \uc885\ud569\uc801\uc778 \uc815\uc131\ud3c9\uac00 \uc9c4\ud589
2. \uc720\uae30\uc801 \ud3c9\uac00: \ud2b9\uc815 \ud56d\ubaa9\ub9cc \ubd84\ub9ac\ud574\uc11c \ubcf4\uc9c0 \uc54a\uace0 \ud559\uc0dd\ubd80 \uc804 \ud56d\ubaa9(\uc778\uc801/\ud559\uc801, \ucd9c\uacb0, \ucc3d\uccb4, \uad50\uacfc \uc138\ud2b9, \ud589\ud2b9)\uc744 \uc720\uae30\uc801\uc73c\ub85c \uc5f0\uacb0\ud558\uc5ec \ub178\ub825\uacfc \uc131\uc7a5\uc744 \uc0b4\ud54c
3. \uae30\uc7ac \uae08\uc9c0 \ubc0f \uac10\uc810 \uc0ac\ud56d: \ud559\uad50\uc0dd\ud65c\uae30\ub85d\ubd80 \uc0c1\uc5d0 '\ud559\uad50\ud3ed\ub825 \uc870\uce58\uc0ac\ud56d(9\ud638 \ub4f1)'\uc774 \uae30\uc7ac\ub41c \uacbd\uc6b0 \ud559\uc0dd\ubd80\uc885\ud569\uc804\ud615\uc18c\uc704\uc6d0\ud68c \ub4f1 \uc2ec\uc758\ub97c \uac70\uccd0 \uc11c\ub958\ud3c9\uac00 \uc2dc \ucd5c\ub300 \ubd80\uc801\uaca9(\ud0c8\ub77d) \ub610\ub294 \uce58\uba85\uc801 \uac10\uc810 \ucc98\ub9ac

\u25a0 \uc11c\ub958\ud3c9\uac00 \uc804\ud615\ubcc4 \uacf5\ud1b5 \ud3c9\uac00 \uc694\uc18c \ubc0f \ube44\uc728 (\ub9e4\uc6b0 \uc911\uc694)
\uc544\uc8fc\ub300\ud559\uad50\ub294 \uac1c\ubcc4 \ud559\uacfc\ub9c8\ub2e4 \uc138\ubd80 \uad8c\uc7a5 \uacfc\ubaa9\uc744 \ubd84\ub9ac\ud558\uae30\ubcf4\ub2e4, \uc9c0\uc6d0\ud558\ub294 **'\uc804\ud615(\uc720\ud615 A vs \uc720\ud615 B)'**\uc5d0 \ub530\ub77c \uc694\uad6c\ud558\ub294 \ud575\uc2ec \uc5ed\ub7c9\uc758 \ube44\uc911\uc744 \uba85\ud655\ud788 \ub2e4\ub974\uac8c \uc801\uc6a9\ud569\ub2c8\ub2e4. \uc804\ud615\uc774 \uba85\uc2dc\ub418\uc9c0 \uc54a\uc558\uc744 \uacbd\uc6b0 \uc544\ub798 \ub450 \uc804\ud615\uc758 \uc870\uac74\uc744 \uc735\ud569\ud558\uc5ec \uac15\uc810/\uc57d\uc810\uc744 \ubd84\uc11d\ud558\uc2ed\uc2dc\uc624.

[\uc720\ud615 A (ACE\uc804\ud615, \uace0\ub978\uae30\ud68c, \ud2b9\uc218\uad50\uc721\ub300\uc0c1\uc790, \uad6d\ubc29IT\uc6b0\uc218\uc778\uc7ac1, \uc7ac\uc9c1\uc790 \ub4f1)] - \uad50\uacfc/\ube44\uad50\uacfc \uade0\ud615 \uc911\uc2dc
- \ubc18\uc601 \ube44\uc728: \ud559\uc5c5\uc5ed\ub7c9(37%) + \uc9c4\ub85c\uc5ed\ub7c9(35%) + \uacf5\ub3d9\uccb4\uc5ed\ub7c9(28%)
- \ud3c9\uac00 \uc8fc\uc548\uc810: \uace0\uad50 \uad50\uc721\uacfc\uc815\uc744 \ucda9\uc2e4\ud788 \uade0\ud615 \uc788\uac8c \uc774\uc218\ud558\uc600\ub294\uac00? \ubaa9\ud45c\uc5d0 \ubd80\ud569\ud558\ub294 \uad50\uacfc\ub97c \uace0\ubbfc\ud558\uc5ec \uc120\ud0dd/\ud0d0\uad6c\ud55c \uacfc\uc815 \ubc0f \uacf5\ub3d9\uccb4 \ub0b4 \ub9ac\ub354\uc2ed, \ub098\ub214, \uc804\ubc18\uc801\uc778 \uc131\uc2e4\uc131\uc774 \uace0\ub974\uac8c \uad00\ucc30\ub418\ub294\uac00?

[\uc720\ud615 B (\ucca8\ub2e8\uc735\ud569\uc778\uc7ac\uc804\ud615)] - \ucca8\ub2e8/\uc735\ud569/\ud2b9\ud654 (\ucca8\ub2e8\uc2e0\uc18c\uc7ac, \uc9c0\ub2a5\ud615\ubc18\ub3c4\uccb4, SW, \ubbf8\ub798\ubaa8\ube4c\ub9ac\ud2f0, \uae08\uc735\uacf5\ud559, \uc751\uc6a9\ud654\ud559, \ucca8\ub2e8\ubc14\uc774\uc624\uc735\ud569 \ub4f1)
- \ubc18\uc601 \ube44\uc728: \uc9c4\ub85c\uc5ed\ub7c9(45%) + \ud559\uc5c5\uc5ed\ub7c9(40%) + \uacf5\ub3d9\uccb4\uc5ed\ub7c9(15%)
- \ud3c9\uac00 \uc8fc\uc548\uc810: \uc9c0\uc6d0 \uacc4\uc5f4 \ud2b9\uc131\uc0c1 \uc555\ub3c4\uc801\uc778 \uc9c4\ub85c \uc9d1\uc911\ub3c4 \uc6b0\uc120 \ubc18\uc601. \uae30\ucd08\uacfc\ud559(\uc218\ud559/\uacfc\ud559) \uc5ed\ub7c9\uc744 \ubc14\ud0d5\uc73c\ub85c \uc9c0\uc6d0 \uc804\uacf5 \ubd84\uc57c\uc5d0 \ub300\ud55c \ub192\uc740 \uc9c0\uc801 \ud638\uae30\uc2ec\uacfc \uacfc\uac10\ud55c \ub3c4\uc804, \uc131\uc7a5\uc744 \ud6e8\uc52c \ub354 \uac15\ub825\ud558\uac8c \ud3c9\uac00.

\u25a0 \ud575\uc2ec 3\ub300 \ud3c9\uac00 \uc694\uc18c \ubc0f \uc138\ubd80 \uc8fc\uc548\uc810

1. \ud559\uc5c5\uc5ed\ub7c9 (\uc720\ud615 A 37% / \uc720\ud615 B 40%) - \uace0\uad50 \uad50\uc721\uacfc\uc815 \uae30\ubc18 \ud559\uc5c5 \uc218\ud589 \ub2a5\ud1b5\uc131
- \ub300\ud559 \uc218\ud559\uc5d0 \ud544\uc694\ud55c \uae30\ubcf8 \uad50\uacfc\uc758 \uc804\ubc18\uc801\uc778 \uc131\ucde8 \uc218\uc900 \ubc0f \ubc1c\uc804 \uc815\ub3c4\uc758 \ucc99\ub3c4
- \uc790\uae30\uc8fc\ub3c4\uc801\uc73c\ub85c \ud559\uc2b5\uc744 \uacc4\ud68d\ud558\uace0 \uc2e4\ud589\ud558\ub294 \ub2a5\ub825\uc774 \uc788\ub294\uac00? 
- \ub2a5\ub3d9\uc801\uc778 \uc218\uc5c5/\uacfc\uc81c \uc218\ud589 \uacfc\uc815 \ubc0f \uc9c0\uc801 \ud638\uae30\uc2ec\uc744 \ubc14\ud0d5\uc73c\ub85c \ud55c \uc801\uadf9\uc801 \ud559\uc5c5 \ud0d0\uad6c \uc758\uc9c0

2. \uc9c4\ub85c\uc5ed\ub7c9 (\uc720\ud615 A 35% / \uc720\ud615 B 45%) - \uad00\uc2ec \ubd84\uc57c\uc5d0 \ub300\ud55c \uc801\uadf9\uc801 \ud0d0\uc0c9\uacfc \ucc38\uc5ec, \ud559\uc5c5 \uc9c0\uc801 \uc131\uc7a5
- \uc9c0\uc6d0 \uc804\uacf5/\ubd84\uc57c\uc5d0 \ub300\ud55c \uc9c0\ub300\ud55c \uad00\uc2ec\uacfc \ubaa9\ud45c \ucd94\uad6c \ub178\ub825
- \uc801\uc131/\uc9c4\ub85c\uc5d0 \ub300\ud55c \uae4a\uc740 \uace0\ubbfc, \uadf8\ub9ac\uace0 \uc2e4\uc81c \ud559\uc5c5(\uad00\ub828 \uad50\uacfc \uc774\uc218)\uacfc \ucc3d\uccb4(\uc9c4\ub85c/\ub3d9\uc544\ub9ac) \uc5f0\uacc4\uc131 \ub3d9\uc2dc \ucda9\uc871
- \uc218\uac15 \uc778\uc6d0\uc774 \uc801\uac70\ub098 \uc5b4\ub824\uc6b4 \uacfc\ubaa9\uc774\ub354\ub77c\ub3c4 \uc9c4\ub85c\uc5d0 \ud544\uc694\ud558\ub2e4\uba74 \uacfc\uac10\ud788 \uc774\uc218\ud558\ub294 \uc790\uae30\uc8fc\ub3c4\uc801 \ub3c4\uc804\uacfc \uc131\uc7a5

3. \uacf5\ub3d9\uccb4\uc5ed\ub7c9 (\uc720\ud615 A 28% / \uc720\ud615 B 15%) - \uacf5\ub3d9\uccb4 \uae30\uc5ec \ub4f1 \uc131\uc2e4\uc131/\ucc45\uc784\uac10 (\ud559\uad50\ud3ed\ub825 \ucca0\uc800 \uc810\uac80)
- \ub9ac\ub354\uc2ed, \ubd09\uc0ac, \ubc30\ub824, \ub098\ub214 \ub4f1 \uacf5\ub3d9\uccb4 \ubaa9\ud45c \ub2ec\uc131\uc744 \uc704\ud55c \uc790\uae30\uc8fc\ub3c4\uc801 \ud65c\ub3d9 \uacbd\ud5d8 \ubc0f \uae0d\uc815\uc801 \uc18c\ud1b5 \ud0dc\ub3c4
- \uad50\ub0b4 \uaddc\uce59/\uaddc\uc815\uc744 \uc5c4\uaca9\ud788 \uc900\uc218\ud558\ub294 \uc131\uc2e4\uc131/\ucc45\uc784\uac10. \uc790\uc2e0\uc774 \ub9e1\uc740 \ubc14\uc5d0 \ub300\ud55c \ucd5c\uc120\uc758 \ud5cc\uc2e0. (\ud559\ud3ed \ucc98\ubd84 \uac10\uc810 \uac15\ub825 \ud544\ud130\ub9c1)

\u25a0 \uc8fc\uc694 \uc735\ud569 \ubc0f \ucca8\ub2e8 \ud2b9\uc218 \ud559\uacfc\ubcc4 \uc138\ubd80 \ud3c9\uac00 \uc8fc\uc548\uc810 (\ud2b9\ud654 \ubd84\uc11d \uac00\uc774\ub4dc)
- \ud504\ub7f0\ud2f0\uc5b4\uacfc\ud559\ud559\ubd80(\uc790\uc5f0\uacfc\ud559): \ubb3c\ub9ac/\ud654\ud559/\uc0dd\uba85\uacfc\ud559 \uae30\ucd08\ub97c \ub370\uc774\ud130/\uc591\uc790/\ubc18\ub3c4\uccb4 \ub4f1 \ucca8\ub2e8 \uae30\uc220\uacfc \uc5f0\uacb0.
- \ucca8\ub2e8\uc2e0\uc18c\uc7ac/\uc751\uc6a9\ud654\ud559: \uc7ac\ub8cc/\ud654\ud559 \uae30\ucd08\ub97c \ubc18\ub3c4\uccb4/\uce5c\ud658\uacbd/\uc81c\uc57d \uc0b0\uc5c5 \ub4f1\uc5d0 \uc2e4\uc6a9\uc801\uc73c\ub85c \uc735\ud569\u00b7\uc801\uc6a9.
- \ubbf8\ub798\ubaa8\ube4c\ub9ac\ud2f0/\uc9c0\ub2a5\ud615\ubc18\ub3c4\uccb4: \uae30\uacc4/\uc804\uc790/SW/\ud1b5\uc2e0 \ud1b5\uc12d\ub825(\ubaa8\ube4c\ub9ac\ud2f0), \uba38\uc2e0\ub7ec\ub2dd/\ube45\ub370\uc774\ud130 \ubc0f HW/SW \ud1b5\ud569 \uc124\uacc4 \uc18c\uc591(\ubc18\ub3c4\uccb4).
- \ucca8\ub2e8\ubc14\uc774\uc624\uc735\ud569: \ud601\uc2e0\uc2e0\uc57d\u00b7\ubc14\uc774\uc624\uc18c\uc7ac \ud638\uae30\uc2ec \ubc0f \uc758\uc57d/\uacf5\ud559/\uc790\uc5f0\uacfc\ud559\uc744 \uc544\uc6b0\ub974\ub294 \uc0dd\uba85 \uc724\ub9ac \uc758\uc2dd.
- \uacbd\uc81c\uc815\uce58\uc0ac\ud68c\uc735\ud569/\uc790\uc720\uc804\uacf5: \ud2c0\uc744 \uae68\ub294 \uc790\uc728\uc801 \uc9c0\uc801 \ud638\uae30\uc2ec. \ub2e8\uc77c \uc9c0\uc2dd\uc73c\ub85c \ud480 \uc218 \uc5c6\ub294 \ub370\uc774\ud130+\ubcf5\ud569 \uc0ac\ud68c \ud604\uc0c1 \ubd84\uc11d\ub825.
- \uc758\uacfc\ub300\ud559/\uad6d\ubc29\ub514\uc9c0\ud138\uc735\ud569: \ucd5c\uc0c1\uc704 \uc218\u00b7\uacfc \ubca0\uc774\uc2a4 \ubc0f \uba74\uc811 \uc2dc \uac80\uc5f4\ub420 \uc0dd\uba85 \uc874\uc911/\uc724\ub9ac\uc758\uc2dd(\uc758\uacfc), \uadf9\ud55c\uc758 \uad6d\uac00\uad00/\ucda9\uc131\uc2ec/\ucc45\uc784\uac10(\uad6d\ubc29IT).

\ud83d\udca1 \uc11c\ub958\ud3c9\uac00 \uacb0\ub860 \ud301:
\uc9c0\uc6d0\uc790\uc758 \ud559\uc0dd\ubd80\uac00 \ubaa8\ub4e0 \uc601\uc5ed\uc5d0 \ub450\ub8e8 \uc131\uc2e4\ud558\uace0 \uc804\uacfc\ubaa9 \uc131\ucde8\ub3c4\uac00 \uace0\ub974\uba74 '\uc720\ud615 A(ACE\uc804\ud615)'\uc5d0, \uc778\uc131/\ube44\uad50\uacfc \ube44\uc911\uc774 \ub0ae\ub354\ub77c\ub3c4 \uc218\ud559/\uacfc\ud559 \ub4f1 \uc804\uacf5 \uad00\ub828 \uc9c0\uc801 \ud0d0\uad6c\uc640 \uc2ec\ud654 \uad50\uacfc \ub3c4\uc804\uc774 \uc555\ub3c4\uc801\uc774\uba74 '\uc720\ud615 B(\ucca8\ub2e8\uc735\ud569\uc778\uc7ac)'\uc5d0 \uc720\ub9ac\ud558\ub2e4\uace0 \uc9c4\ub2e8\ud574 \uc8fc\uc2ed\uc2dc\uc624. \ub354\ubd88\uc5b4 \ud559\ud3ed \uc870\uce58\uc0ac\ud56d\uc740 \ud569\ubd88\uc744 \ub4a4\uc9d1\uc744 \uc0ac\uc548\uc774\ubbc0\ub85c \uaf3c\uaf3c\ud788 \uc810\uac80\ud558\uc2ed\uc2dc\uc624.
`,
      competencies: {
        academic: "\ud559\uc5c5\uc5ed\ub7c9 (ACE\uc804\ud615 37% / \ucca8\ub2e8 40%) - \uad50\uacfc \uc804\ubc18 \uc131\ucde8\ub3c4, \uc790\uae30\uc8fc\ub3c4\uc801 \ud559\uc2b5 \uacc4\ud68d/\uc2e4\ud589\ub825, \uc9c0\uc801 \ud638\uae30\uc2ec\uc5d0 \uae30\ubc18\ud55c \uc801\uadf9\uc801 \uc218\uc5c5 \ud0dc\ub3c4",
        career: "\uc9c4\ub85c\uc5ed\ub7c9 (ACE\uc804\ud615 35% / \ucca8\ub2e8 45%) - \uc9c0\uc6d0 \uc804\uacf5 \uad00\ub828 \uad50\uacfc \uc801\uadf9 \uc774\uc218, \ub3d9\uc544\ub9ac/\uc9c4\ub85c\uc640 \uc138\ud2b9\uc758 \uc720\uae30\uc801 \uc5f0\uacc4\ub97c \ud1b5\ud55c \ubaa9\ud45c \uc131\uc7a5",
        community: "\uacf5\ub3d9\uccb4\uc5ed\ub7c9 (ACE\uc804\ud615 28% / \ucca8\ub2e8 15%) - \ub9ac\ub354\uc2ed, \uc18c\ud1b5, \ub098\ub214\uc758 \uc2e4\ucc9c\uc801 \uc131\uc2e4\ud568 \ubc0f \uad50\ub0b4 \uaddc\uc815 \uc900\uc218 (\ud559\ud3ed \uac15\ub825 \uac10\uc810 \ubc18\uc601)"
      },
      weights: { academic: 0.38, career: 0.40, community: 0.22 }
    },
    "\uc778\ucc9c\ub300\ud559\uad50": {
      factors: `
[\uc778\ucc9c\ub300\ud559\uad50 2026\ud559\ub144\ub3c4 \ud559\uc0dd\ubd80\uc885\ud569\uc804\ud615 \uc11c\ub958\ud3c9\uac00 \uae30\uc900 \ubc0f \ud559\uacfc\ubcc4 \ud3c9\uac00 \uc8fc\uc548\uc810]

\u25a0 \uc11c\ub958\ud3c9\uac00 \uc885\ud569 \uc548\ub0b4 \ubc0f \uacf5\ud1b5 \ud3c9\uac00 \ubc29\uc2dd
1. \ub2e4\uc218 \ub2e4\ub2e8\uacc4 \uc815\uc131\ud3c9\uac00: \uc9c0\uc6d0\uc790 1\uba85\ub2f9 2\uc778\uc758 \uc785\ud559\uc0ac\uc815\uad00\uc774 \ub3c5\ub9bd\uc801/\uc885\ud569\uc801 \uc815\uc131\ud3c9\uac00 \uc2e4\uc2dc (350\uc810 \ub9cc\uc810 \ubc18\uc601).
2. \uc7ac\ud3c9\uac00 \uc2dc\uc2a4\ud15c \ubc0f \ube14\ub77c\uc778\ub4dc \ud3c9\uac00: \ub450 \uc704\uc6d0 \uac04 \uc810\uc218 \ud3b8\ucc28 \ubc1c\uc0dd \uc2dc \uc81c3\uc758 \ud3c9\uac00\uc704\uc6d0\uc774 \uc7ac\ud3c9\uac00 \uc9c4\ud589. 성명, \uc0ac\uc9c4, \uace0\uad50\uba85 \ub4f1\uc740 \ucca0\uc800\ud788 \ube14\ub77c\uc778\ub4dc \ucc98\ub9ac.
3. \uac10\uc810 \ubc0f \ubd80\uc801\uaca9 \uaddc\uc815 (\ub9e4\uc6b0 \uc911\uc694): \ud559\uad50\ud3ed\ub825 \uc870\uce58 \uac74\uc5d0 \ub300\ud574 \uc138\ubc00\ud654\ub41c \uac10\uc810(1\ud638 \uc815\uc131\uac10\uc810, 2~3\ud638 5% \uac10\uc810, 4~5\ud638 10% \uac10\uc810, 6~9\ud638 \ubd88\ud569\uaca9) \uc2dc\ud589.
4. \uae30\uc7ac \uae08\uc9c0 \ubbf8\ubc18\uc601 \uc8fc\uc758: 2019 \ub300\uc785 \uacf5\uc815\uc131 \uac15\ud654 \ubc29\uc548\uc5d0 \ub530\ub77c \uc11c\ub958\ud3c9\uac00\uc5d0\uc11c \uc790\uc728\ub3d9\uc544\ub9ac, \uac1c\uc778 \ubd09\uc0ac\uc2dc\uac04, \uad50\uc678 \uc218\uc0c1, \ub3c5\uc11c\ub85d, \uc678\ubd80 \uc5b4\ud559, \uc9c4\ub85c\ud76c\ub9dd\ubd84\uc57c \ub4f1\uc744 \uc5b8\uae09 \uc2dc \ubbf8\ubc18\uc601 \ubc0f \ubd88\uc774\uc775 \uac00\ub2a5\ud558\ubbc0\ub85c \uad50\uacfc \uc138\ud2b9 \ub0b4 \uac04\uc811\uc801 \uc5ed\ub7c9 \ub3c4\ucd9c\ub85c \uc120\ud68c.

[\ud575\uc2ec 4\ub300 \ud3c9\uac00 \uc694\uc18c \ubc0f \ube44\uc911]
1. \ud559\uc5c5\uc5ed\ub7c9 (30%) - \uc131\ucde8 \uc218\uce58 \ub108\uba38\uc758 \ud658\uacbd/\ub9e5\ub77d\uc801 \ud559\uc5c5\uc5ed\ub7c9 \ud3c9\uac00
- \uae30\uacc4\uc801 \ub4f1\uae09 \uc9c0\uc591. \uc774\uc218 \uacfc\ubaa9, \uacfc\ubaa9 \ud3c9\uade0, \ud3b8\ucc28, \uc6d0\uc810\uc218, \uc218\uac15\uc790 \uc218\ub97c \uc720\uae30\uc801\uc73c\ub85c \uc885\ud569 \ud3c9\uac00.
- \ud559\ub144\uc774 \uc62c\ub77c\uac00\uba74\uc11c \uc218\uac15\uc790\uac00 \uc801\uc740 \uc2ec\ud654 \uacfc\ubaa9\uc744 \uc218\uac15\ud558\uc5ec \ubd88\ub9ac\ud568(\ub0b4\uc2e0 \ub4f1\uae09 \ud558\ub77d)\uc744 \uacaa\uc5c8\ub354\ub77c\ub3c4 \uc9c0\uc801 \ud638\uae30\uc2ec\uacfc \uacfc\uac10\ud55c \ud559\uc2b5 \uc758\uc9c0\uac00 \uc778\uc815\ub418\uba74 \uae0d\uc815\uc801\uc73c\ub85c \ub192\uc774 \ud3c9\uac00.

2. \uc9c4\ub85c\uc5ed\ub7c9 (30%) - \uc790\uae30\uc8fc\ub3c4\uc801 \uc9c4\ub85c \ud0d0\uc0c9\uc758 \uc77c\uad00\uc131\uacfc \ub048\uae30
- \ub2e8\uc21c \ud589\uc0ac/\uc9c4\ub85c \ud504\ub85c\uadf8\ub7a8 \ucc38\uac00\uc728 \uc911\uc2ec\uc774 \uc544\ub2cc, \uc138\ud2b9 \ubc0f \ucc3d\uccb4(\ub3d9\uc544\ub9ac/\uc9c4\ub85c\ud65c\ub3d9)\ub97c \uae30\ubc18\uc73c\ub85c \ud55c '\uc8fc\ub3c4\uc801 \uc804\uacf5 \ud0d0\uc0c9 \uacfc\uc815\uacfc \uae4a\uc774'\ub97c \uc8fc\ub85c \uac80\uc99d.
- \uc9c4\ub85c \ubd84\uc57c\uac00 \ub3c4\uc911\uc5d0 \ubcc0\uacbd\ub418\uc5c8\ub354\ub77c\ub3c4, \ubcc0\uacbd \uc0ac\uc720\uc640 \uadf8 \uc774\ud6c4 \uc0c8 \uc9c4\ub85c\ub97c \uc704\ud574 \uc0c8\ub86d\uac8c \uae30\uc6b8\uc778 \ub178\ub825\uc758 \ubc1c\uc790\ucde8\uac00 \ud0c0\ub2f9\ud558\uace0 \uce58\uc5f4\ud558\ub2e4\uba74 \ubd88\uc774\uc775 \uc5c6\uc74c.

3. \ubc1c\uc804\uc5ed\ub7c9 (20%) - \ucc3d\uc758\uc801/\uc790\uae30\uc8fc\ub3c4\uc801 \ubb38\uc81c \ud574\uacb0\ub825 (\uc778\ucc9c\ub300 \uace0\uc720 \ud575\uc2ec \uc7a3\ub300)
- \uc218\uc5c5, \ub3d9\uc544\ub9ac \ud639 \uc9c4\ub85c \ud65c\ub3d9 \uc911\uc5d0 \ub9c8\uc8fc\uce5c \ubb3c\ub9ac\uc801/\ud559\ubb38\uc801 \ud604\uc0c1\uc758 \uc6d0\uc778 \ubc0f \uc2e4\ud328 \uc0ac\uc720\ub97c \ubd84\uc11d\ud558\uace0, \uad6c\uccb4\uc801 \uadf9\ubcf5 \ub300\uc548\uc744 \ub3c4\ucd9c\ud574 \ub0b8 \ub2a5\ub3d9\uc801\uc778 \uacbd\ud5d8 \uc720\ubb34.
- \uc9c4\ucde8\uc801 \uc0ac\uace0\ub85c \ub0a8\ub4e4\uc774 \uaebc\ub9ac\uac70\ub098 \uc5b4\ub824\uc6b4 \uacfc\uc81c\uc5d0 \uc9d1\uc694\ud558\uac8c \ub3c4\uc804\ud558\ub294 \uc790\uae30\uc8fc\ub3c4\uc801 \ubb38\uc81c \ud574\uacb0 \ud0c1\uc6d4\uc131.

4. \uacf5\ub3d9\uccb4\uc5ed\ub7c9 (20%) - \uc77c\uc0c1\uc758 \ud611\ub825\uacfc \uae30\ubcf8 \ub428\ub428\uc774 (\uc724\ub9ac\uc758\uc2dd)
- \ucd9c\uacb0(\ubbf8\uc778\uc815 \uacb0\uc11d/\uc9c0\uac01) \uc774\ub825\uc758 \uc131\uc2e4\uc131 \uae30\ucd08 \ubc14\ud0d5 \uc810\uac80.
- \uac70\ucc3d\ud55c \ud559\uae09\ud68c\uc7a5/\ud559\uc0dd\ud68c\uc7a5 \uc774\ub825\ubcf4\ub2e4 '\uc870\ubcc4 \ubc1c\ud45c \uc8fc\ub3c4, \uccad\uc18c \ub2f9\ubc88 \uc804\ub2f4 \ud5cc\uc2e0, \uc9c0\uc2dd \ub098\ub214 \uba58\ud1a0' \ub4f1 \uc77c\uc0c1\uc801 \uad50\ub0b4 \uc0dd\ud65c\uc5d0\uc11c \ub3cb\ubcf4\uc774\ub294 \ud611\ub3d9\uc2ec, \uc874\uc911, \ub098\ub214, \uc131\uc2e4\ud568 \ud3c9\uac00.

\u25a0 \ud559\uacfc(\uacc4\uc5f4)\ubcc4 \uc2e4\ubb34 \ud569\uaca9 \uc0ac\ub840 \uae30\ubc18 \ud3c9\uac00 \ud2b9\ubcc4 \uc8fc\uc548\uc810
\u2460 \uacf5\ud559 \ubc0f IT \uacc4\uc5f4: \ubbf8\uc801/\uae30\ud558 \ub4f1 \uc218\u00b7\uacfc \uc2ec\ud654 \uc774\uc218 \uae30\ubc18. \uae30\uc220 \ud638\uae30\uc2ec\uc744 \uc9c1\uc811 \uae30\ud68d/\uc81c\uc791(HW/SW) \ud504\ub85c\uc81d\ud2b8\uc758 \ub300\uc548 \ub3c4\ucd9c(\ubc1c\uc804\uc5ed\ub7c9)\ub85c \uc99d\uba85.
\u2461 \uc0dd\uba85 \ubc0f \ud658\uacbd \uacc4\uc5f4: \u2160/\u2161 \uc2ec\ud654 \uae30\ucd08 \ubc0f \uad50\uacfc \ubc16 \uc2e4\ud5d8(\ub3d9\uc544\ub9ac)\uc744 \uc8fc\ub3c4\uc801\uc73c\ub85c \ucc44\uc6cc\ub098\uac04 \ub178\ub825. \ubc31\uc2e0/\ud658\uacbd \ub4f1 \ud2b9\uc815 \ud559\ubb38 \uc8fc\uc81c\uc5d0 \ub300\ud55c \uc2ec\uce35\uc801 \ub17c\ubb38 \ub525\ub2e4\uc774\ube0c \uc5f0\uacc4 \ud0d0\uad6c.
\u2462 \uc0ac\ud68c\uacfc\ud559\u00b7\uc0c1\uacbd\u00b7\ubc95\ud559 \uacc4\uc5f4: \uacbd\uc81c/\uc815\ubc95/\uc0ac\ud68c\ubb38\uc81c\ud0d0\uad6c \ub4f1 \ub2a5\ub3d9 \uc774\uc218. \uae00\ub85c\ubc8c \ud604\uc0c1/\ud1b5\uacc4/\ubaa8\uc758\ud310\uacb0 \ub4f1 \ub370\uc774\ud130 \uae30\ubc18 \uc0ac\ud68c \uad6c\uc870\uc801 \ub300\uc548 \uc81c\uc2dc \ub17c\ub9ac\uc131. \uc758\ubbf8 \uc788\ub294 \uc5f0\ub300\uc801 \uc18c\uadf8\ub8f9 \ub9ac\ub354\uc2ed.
\u2463 \uc0ac\ubc94 \ubc0f \uad50\uc721\uacc4\uc5f4: \uc724\uc0ac/\ucca0\ud559/\uad50\uc721 \ub4f1 \uc9c4\uc815\uc131 \uc788\ub294 \uad50\uacfc \uc774\uc218 \uc77c\uad00\uc131. \uacf5\uad50\uc721 \uc815\ucc45 \ubb38\uc81c \ube44\ud310 \ubc0f \ucca0\ud559\uc801/\uc774\ud0c0\uc801 \ub300\uc548\uc744 \uc81c\uc2dc\ud558\ub294 \ubbf8\ub798 \uad50\uc0ac \uc724\ub9ac \uc810\uac80.
\u2464 \uc778\ubb38 \ubc0f \uc5b4\ubb38 \uacc4\uc5f4: \ub2e8\uc21c \uc5b8\uc5b4 \uad6c\uc0ac\ub97c \ub118\uc740 \uad6d\uac00\uc758 \uc5ed\uc0ac\u00b7\ubb38\ud654\u00b7\uc0ac\uc0c1\uc5d0 \uad00\ud1b5\ud558\ub294 \uc735\ud569\uc801 \uc2ec\uce35 \uc138\ud2b9 \ud0d0\uad6c. \uac08\ub4f1\uc744 \uce68\ucc29\ud558\uac8c \uc18c\ud1b5\uc73c\ub85c \ubd09\ud569\ud55c \uc131\uc219\ud55c \uc870\uc728 \ub2a5\ub825.

\ud83d\udca1 \uc11c\ub958\ud3c9\uac00 \uacb0\ub860 \ud301:
\uc778\ucc9c\ub300\ud559\uad50\ub294 '\uc218\uac15\uc790 \uc218\uac00 \uc801\uc740 \uc2ec\ud654 \uacfc\ubaa9\uc5d0 \uae30\uaebc\uc774 \ub3c4\uc804\ud558\uc5ec \uc77c\uc2dc\uc801 \uc131\uc801 \ud558\ub77d\uc744 \uacaa\uc740 \uc6a9\uae30'\ub97c \ub9e4\uc6b0 \uae0d\uc815\uc801\uc73c\ub85c \uc0ac\uba70, \ud65c\ub3d9 \uc911 \ub098\ud0c0\ub09c \uc2e4\ud328/\uac08\ub4f1\uc744 \ub300\uc548\uc73c\ub85c \uadf9\ubcf5\ud558\ub294 **'\ubc1c\uc804\uc5ed\ub7c9'**\uc774 \uba85\ud655\ud560 \ub54c \ucd5c\uace0 \ud3c9\uac00\ub97c \ubd80\uc5ec\ud569\ub2c8\ub2e4. \ub610\ud55c \ud559\uad50\ud3ed\ub825 \ubc0f \ubbf8\ubc18\uc601 \uae30\uc7ac \uc11c\ub958 \uc9c0\uce68\uc740 AI\uac00 \uc989\uc2dc \uc790\ub3d9 \ud544\ud130\ub9c1\ud558\uc5ec \uac10\uc810 \uc0ac\uc548\uc73c\ub85c \uc9c0\uc801\ud558\uc2ed\uc2dc\uc624.
`,
      competencies: {
        academic: "\ud559\uc5c5\uc5ed\ub7c9 (30%) - \uae30\uacc4\uc801 \ub4f1\uae09 \uc218\uce58\ud654 \ubc30\uc81c(\uc6d0\uc810\uc218\u00b7\uc218\uac15\uc790\uc218 \uace0\ub824 \ub9e5\ub77d \ud3c9\uac00), \uc18c\uc218 \uc218\uac15 \uc2ec\ud654\uacfc\ubaa9 \uacfc\uac10\ud55c \ub3c4\uc804\uacfc \ub2a5\ub3d9\uc801 \ud0d0\uad6c",
        career: "\uc9c4\ub85c\uc5ed\ub7c9 (30%) - \ubcf4\uc5ec\uc8fc\uae30\uc2dd \ud65c\ub3d9 \ubc30\uc81c(\uc138\ud2b9/\ucc3d\uccb4 \uc5f0\uacc4\ud615 \uc9c4\ub85c \ud0d0\uc0c9 \uacfc\uc815 \ucd94\uc801), \uc9c4\ub85c \ubcc0\uacbd \uc2dc \ub178\ub825\uc758 \ud0c0\ub2f9\uc131\uacfc \ub048\uae30 \uc874\uc911",
        community: "\uacf5\ub3d9\uccb4\uc5ed\ub7c9 (20%) + \ubc1c\uc804\uc5ed\ub7c9 (20%) - \uc77c\uc0c1\uc801 \uc18c\ubc15\ud55c \ubc30\ub824/\ucc45\uc784\uac10/\ucd9c\uacb0(20%) \ubc0f \ubf08\uc544\ud508 \uc2e4\ud328/\ub09c\uc81c\ub97c \ub51b\uace0 \ub300\uc548\uc744 \ucc3d\uc758\uc801\uc73c\ub85c \ub3c4\ucd9c\ud574 \ub0b8 \uadf9\uac15\uc758 \ubb38\uc81c\ud574\uacb0\ub825(20%)"
      },
      weights: { academic: 0.30, career: 0.30, community: 0.40 } // \ubc1c\uc804\uc5ed\ub7c9 \uc911\uc2ec\uc758 \ud3c9\uac00 \ubc38\ub7f0\uc2a4 \ud569\uc0b0
    },
    "\uac00\ud1a8\ub9ad\ub300\ud559\uad50": {
      factors: `
[\uac00\ud1a8\ub9ad\ub300\ud559\uad50 2026\ud559\ub144\ub3c4 \ud559\uc0dd\ubd80\uc885\ud569\uc804\ud615 \uc11c\ub958\ud3c9\uac00 \uae30\uc900 \ubc0f \ud559\uacfc\ubcc4 \ud3c9\uac00 \uc8fc\uc548\uc810]

\u25a0 \uc11c\ub958\uc885\ud569\ud3c9\uac00 \ubc29\ubc95 \ubc0f \uc720\uc758\uc0ac\ud56d
1. \ub2e4\uc218 \ub2e4\ub2e8\uacc4 \ucca0\uc800\ud55c \ube14\ub77c\uc778\ub4dc \ud3c9\uac00: \uc9c0\uc6d0\uc790 1\uba85\ub2f9 2\uc778\uc758 \uc0ac\uc815\uad00\uc774 \uad50\ucc28 \ud3c9\uac00(\ud3b8\ucc28 \uc2dc \uc7ac\ud3c9\uac00)\ud558\uba70, \ucd9c\uc2e0\uace0\uad50/\ubd80\ubaa8 \uc9c1\uc5c5 \ub4f1 \ucca0\uc800\ud788 \ube14\ub77c\uc778\ub4dc \uc6d0\uce59.
2. \uae30\uc7ac \uae08\uc9c0 \ubc0f \ud559\uad50\ud3ed\ub825 \uaddc\uc815 (\ub9e4\uc6b0 \uc911\uc694): \ud559\uad50\ud3ed\ub825 \uc870\uce58 \uac74\uc5d0 \ub300\ud574 \uc804\ud615 \ub9cc\uc810 \uae30\uc900\uc73c\ub85c \uac10\uc810(1~7\ud638) \ub610\ub294 \ubd80\uc801\uaca9/\ubd88\ud569\uaca9(8~9\ud638) \ucc98\ub9ac\ub85c \ub9e4\uc6b0 \uac15\ub825\ud788 \uc81c\uc7ac.

\u25a0 \ud575\uc2ec 3\ub300 \ud3c9\uac00 \uc694\uc18c \ubc0f \uc11c\ub958\ud3c9\uac00 \ubd84\uc11d \uae30\uc900
\uac00\ud1a8\ub9ad\ub300\ud559\uad50\ub294 \ud559\uacfc(\ubd80)\ub9c8\ub2e4 \uba85\uc2dc\ub41c '\ud559\uacfc \uc778\uc7ac\uc0c1'\uacfc '\uad8c\uc7a5 \uace0\uad50 \uad50\uacfc\ubaa9' \ubd80\ud569\ub3c4\ub97c \ubaa8\ub4e0 \uc815\uc131\ud3c9\uac00\uc758 \ubf08\ub300\ub85c \uc0bc\uc2b5\ub2c8\ub2e4. \uc9c0\uc6d0\uc790\uac00 \uad8c\uc7a5 \uad50\uacfc\ub97c \uc790\ubc1c\uc801\uc73c\ub85c \uc120\ud0dd\ud558\uace0 \uc778\uc7ac\uc0c1\uc5d0 \ub9de\ub294 \ucc3d\uc758\uc801 \ud0d0\uad6c\ub97c \uc804\uac1c\ud588\ub294\uc9c0\uac00 \uad00\uac74\uc785\ub2c8\ub2e4.

1. \ud559\uc5c5\uc5ed\ub7c9 (40%) - \ub2e8\uc21c \ub4f1\uae09 \ub108\uba38\uc758 \uc790\uae30\uc8fc\ub3c4\uc801 \ud559\uc5c5 \ud0dc\ub3c4
- \uc131\ucde8\ub3c4 \ubd84\uc11d: 3\ub144 \uac04\uc758 \uc131\uc801 \ucd94\uc774, \uacfc\ubaa9\ubcc4 \uc218\uac15\uc790 \uc218/\uc774\uc218 \ub2e8\uc704 \uace0\ub824 \ub9e5\ub77d \ud3c9\uac00. \ud2b9\ud788 '\uc720\ub09c\ud788 \uc18c\ud640\ud788 \ud55c \uacfc\ubaa9\uc774 \uc5c6\ub294\uc9c0' \ud3b8\uc2dd \uc5ec\ubd80\ub97c \uc5c4\uaca9\ud788 \uc0b4\ud54c.
- \ud559\uc5c5 \ud0dc\ub3c4 \ubc0f \ud0d0\uad6c\ub825: \uc218\uc5c5 \uc911 \uc790\ubc1c\uc801 \ud1a0\ub860, \uad50\uacfc \uc5f0\uacc4 '\uad00\ub828 \uc11c\uc801 \ubc1c\ucdcc \ub3c5\uc11c' \ub4f1 \uc790\uae30\uc8fc\ub3c4\uc801 \ud638\uae30\uc2ec \uc5ec\ubd80 \uc810\uac80. \ub2a5\ub3d9\uc801 \uacfc\uc81c \uc218\ud589 \ubc0f \ud559\uc220 \ub3d9\uc544\ub9ac\uc758 \uc131\uacfc.

2. \uc9c4\ub85c\uc5ed\ub7c9 (40%) - \uad8c\uc7a5 \uacfc\ubaa9 \uc704\uacc4 \uc774\uc218 \ubc0f \ub3c4\uc804\uc801 \ud559\uc5c5 \ud655\uc7a5
- \ud559\uacfc \uc778\uc7ac\uc0c1\uc5d0 \ubd80\ud569\ud558\ub294 \uad8c\uc7a5 \ud544\uc218 \uad50\uacfc \uc9d1\uc911 \uc774\uc218 \uc5ec\ubd80 \uac80\uc99d. \ud2b9\ud788 \uad50\uacfc\ubaa9 \uc704\uacc4(\u2160\u2192\u2161)\ub97c \uc62c\ubc14\ub974\uac8c \ub530\ub790\ub294\uc9c0 \ubd84\uc11d.
- \uacf5\ub3d9\uad50\uc721\uacfc\uc815\uc774\ub098 \uc18c\uc778\uc218\uacfc\ubaa9 \ub4f1 '\uc9c4\ub85c\ub97c \uc704\ud574 \uc2a4\uc2a4\ub85c \ucc3e\uc544\uc11c \ub4e3\ub294 \ucd94\uac00\uc801 \ub178\ub825'\uc774 \ud3ec\ucc29\ub420 \uacbd\uc6b0 \uc774\ub97c \uadf9\ud788 \uac15\ub825\ud55c \uac15\uc810\uc73c\ub85c \ubd80\uac01.
- \ud559\ub144\ubcc4 \uc810\uc9c4\uc801\uc73c\ub85c \uc2ec\ud654\ub418\ub294 \uc9c4\ub85c \ud0d0\uc0c9 \uacbd\ud5d8\uacfc \uadf8 \uc131\uc7a5 \uacfc\uc815.

3. \uacf5\ub3d9\uccb4\uc5ed\ub7c9 (20%) - \uac00\ud1a8\ub9ad \uac74\ud559 \uc774\ub150\uc5d0 \ub9de\ub2ff\ub294 \uc774\ud0c0\uc8fc\uc758\uc640 \uc131\uc2e4\uc131
- \uc18c\ud1b5 \ubc0f \ubc30\ub824: \uc218\uc5c5 \ud639\uc740 \ub3d9\uc544\ub9ac \ub0b4 \uae0d\uc815\uc801 \ud611\ub825 \ubc0f \uc9c4\uc815\uc131 \uc788\ub294 \ub098\ub214(\uc9c0\uc2dd \uba58\ud1a0\ub9c1 \ud65c\ub3d9, \uc18c\uc678 \uc774\uc6c3 \uad00\uc2ec) \uc2e4\ucc9c \ud3c9\uac00.
- \uaddc\uce59 \uc900\uc218 \ubc0f \uc131\uc2e4\uc131: \ubbf8\uc778\uc815 \uacb0\uc11d/\uc9c0\uac01/\uc870\ud1f4\uac00 \ubc18\ubcf5\ub418\uac70\ub098, \uc8fc\uc694 \uad50\uacfc \ub300\ube44 '\ube44\uc8fc\uc694 \uad50\uacfc(\uc608\uccb4\ub2a5 \ub4f1) \uc131\uc801\uc774 \ud604\uc800\ud788 \ub0ae\uc744 \uacbd\uc6b0' \uc131\uc2e4\uc131 \ubd80\uc871\uc73c\ub85c \ubd80\uc815\uc801 \ud3c9\uac00(\uac10\uc810) \uac15\ub825 \uc801\uc6a9.
- \ub9ac\ub354\uc2ed: \ub2e8\uc21c\ud55c \ubc18\uc7a5/\ud68c\uc7a5 \uac10\ud22c\uac00 \uc544\ub2cc, \uad6c\uc131\uc6d0\uc758 \uc2e0\ub8b0\ub85c \uacf5\ub3d9 \ubaa9\ud45c\ub97c \uc774\ub04c\uc5b4\ub0b8 '\uc2e4\uc81c \ub9ac\ub354\uc2ed \uc218\ud589 \uacbd\ud5d8'\uc5d0 \ucd08\uc810.

\u25a0 \uc138\ubd80\ubd84\ub958 \ubc0f \uc870\uc900 \ud2b9\ud654 \uac00\uc774\ub4dc (\uc778\uc7ac\uc0c1 \ubc0f \uad8c\uc7a5 \uad50\uacfc)
1. \ubb34\uc804\uacf5 / \uad11\uc5ed \ubaa8\uc9d1\ub2e8\uc704 (\uc790\uc720\uc804\uacf5 \ub4f1): \ubb38\u00b7\uc774\uacfc \uc544\uc6b0\ub974\ub294 \uad11\ubc94\uc704 \uc9c0\uc801 \ud638\uae30\uc2ec\uacfc \uc804\ubc18\uc801 \uae30\ucd08 \ud559\ub825 (\ud2b9\uc815 \uc804\uacf5 \ud3b8\uc2dd \uc9c0\uc591).
2. \uc778\ubb38 \ubc0f \uc0ac\ud68c\uacfc\ud559 (\uc5b4\ubb38, \uc0ac\ud68c\ubcf5\uc9c0, \uc2ec\ub9ac, \ud589\uc815 \ub4f1): \uc778\uad8c \uae30\ubc18 \uc18c\ud1b5 \ub2a5\ub825. \ud2b9\ud788 \uc2ec\ub9ac\ud559\uacfc\ub294 \ud655\ud1b5, \uc0dd\uba85\uacfc\ud559, \ub17c\ub9ac\ud559 \ub4f1 \uc218\ud559/\uacfc\ud559 \uc5f0\uacc4\uc801 \uc218\uce58 \uc2ec\ud654 \ubd84\uc11d\ub825 \uac15\uc810.
3. \uc0c1\uacbd\u00b7\ubc95\ud559 (\uacbd\uc601, \uacbd\uc81c, \ud68c\uacc4, \ubc95\ud559): \uc218\ud559\u2160/\u2161, \ubbf8\uc801/\ud655\ud1b5 \ub4f1 \uc555\ub3c4\uc801 \uc218\ub9ac \ub17c\ub9ac\ub825\uacfc \ubb38\uc81c\ud574\uacb0 \uc9c0\ud45c \ud575\uc2ec \uac80\uc99d.
4. \uc790\uc5f0 \ubc0f \uacf5\ud559 (\uae30\ucd08\uacfc\ud559, SW/\ub370\uc774\ud130, \ubc14\uc774\uc624/\ud658\uacbd): \ubbf8\uc801\ubd84/\uae30\ud558, \ubb3c\ub9ac/\ud654\ud559/\uc0dd\uba85 \uad50\uacfc \ud0c1\uc6d4\uc131. \ud2b9\ud788 IT\uacc4\uc5f4\uc740 \ucf54\ub529/\uc54c\uace0\ub9ac\uc998 \uae30\ubc18 \ub3c4\ub355\uc801 \uc0ac\ud68c \ud604\uc548 \ub300\uc548 \ub3c4\ucd9c \ub2a5\ub825 \ud544\uc218 \ubcf4\uc720.
5. \uc0dd\ud65c\uacfc\ud559 \ubc0f \ud2b9\uc218 \ubaa9\uc801 (\uc758/\uc57d/\uac04\ud638, \uc0ac\ubc94, \ud2b9\uc131\ud654\uace0 \uc7ac\uc9c1\uc790): \uc758\uc57d\uacc4\uc5f4\uc740 \uac00\ud1a8\ub9ad '\uc634\ub2c8\ubc84\uc2a4 \uc778\uc131' \ubd80\ud569 \uc0dd\uba85 \uc874\uc911/\ubd09\uc0ac \uc18c\uba85 \uc808\ub300\uc801 \uc9c0\ud45c. \ud2b9\uc218\uad50\uc721\uc740 \uc7a5\uc560\uc778 \uc790\ub9bd\uc744 \ud5a5\ud55c \uc774\ud0c0\uc2ec.

\ud83d\udca1 \uc11c\ub958\ud3c9\uac00 \uacb0\ub860 \ud301:
\uac00\ud1a8\ub9ad\ub300\ud559\uad50 \ud3c9\uac00\ub294 '\ub3c4\uc804'(\uc18c\uc778\uc218/\uacf5\ub3d9\uad50\uc721\uacfc\uc815 \uc218\uac15)\uacfc '\uade0\ud615'(\uc720\ub09c\ud788 \uc18c\ud640\ud55c \uc608\uccb4\ub2a5 \ub4f1 \ube44\uc8fc\uc694 \uacfc\ubaa9 \uc720\ubb34 \uac10\uc810)\uc774 \uc544\uc8fc \uc911\uc694\ud569\ub2c8\ub2e4. \uc9c0\uc6d0 \ud559\uacfc \uc815\ubcf4\uc5d0 \uba85\uc2dc\ub41c \ud544\uc218 \uc218\ud559/\uacfc\ud559/\uc0ac\ud68c/\uc5b4\ud559 \uad50\uacfc \uc704\uacc4\ub97c \uc8fc\ub3c4\uc801\uc73c\ub85c \ucc3e\uc544 \ub4e3\uace0, \ud559\uad50\ud3ed\ub825\uc774\ub098 \ubd80\uc815\uc801 \ucd9c\uacb0(\uac74\ud559 \uc774\ub150 \ubc18\ud568)\uc774 \uc5c6\ub294\uc9c0\ub97c \ucd5c\uc6b0\uc120\uc73c\ub85c \uc2a4\uce94\ud558\uc5ec \uacb0\ub860\uc744 \ub0b4\uc8fc\uc2ed\uc2dc\uc624.
`,
      competencies: {
        academic: "\ud559\uc5c5\uc5ed\ub7c9 (40%) - \uc18c\ud640\ud55c \uacfc\ubaa9 \uc720\ubd80 \uc810\uac80(\uce58\uba85\ud0c0), \ud559\uc5c5 \ud3b8\uc2dd \uc5c6\ub294 \uace0\ub978 \uc131\ucde8\uc640 \uad00\ub828 \uc11c\uc801 \ud0d0\ub3c5 \ub4f1 \uc8fc\ub3c4\uc801 \ud0d0\uad6c \uc758\uc9c0",
        career: "\uc9c4\ub85c\uc5ed\ub7c9 (40%) - \ud559\uacfc \uad8c\uc7a5 \uacfc\ubaa9 \uc704\uacc4 \uc774\uc218 \uc900\uc218 \uc5ec\ubd80, \uc18c\uc778\uc218/\uacf5\ub3d9\uad50\uc721 \ub4f1 \uc5b4\ub824\uc6b4 \uc9c4\ub85c \uad50\uacfc\uc5d0 \ub300\ud55c \uc8fc\ub3c4\uc801 \ucd94\uac00 \uc218\uac15 \ub178\ub825(\uac15\ub825 \uac00\uc810)",
        community: "\uacf5\ub3d9\uccb4\uc5ed\ub7c9 (20%) - \uc774\ud0c0\uc801 \uc9c0\uc2dd \uba58\ud1a0\ub9c1, \uc0dd\uba85\uc874\uc911 \uc724\ub9ac\ubfd0 \uc544\ub2c8\ub77c \ucd9c\uacb0 \ubc0f \ube44\uc8fc\uc694\uacfc\ubaa9 \uc131\uc2e4 \uc774\uc218 \ub4f1 '\uac00\ud1a8\ub9ad \uc724\ub9ac\uc5d0 \ubd80\ud569\ud558\ub294 \uae30\ucd08 \uc131\uc2e4\uc131'"
      },
      weights: { academic: 0.40, career: 0.40, community: 0.20 }
    },
    "\uad11\uc6b4\ub300\ud559\uad50": {
      factors: `
[\uad11\uc6b4\ub300\ud559\uad50 2026\ud559\ub144\ub3c4 \ud559\uc0dd\ubd80\uc885\ud569\uc804\ud615 \uc11c\ub958\ud3c9\uac00 \uae30\uc900 \ubc0f \ud559\uacfc\ubcc4 \ud3c9\uac00 \uc8fc\uc548\uc810]

\u25a0 \uc11c\ub958\ud3c9\uac00 \uc885\ud569 \uc548\ub0b4 \ubc0f \ubc29\ubc95
\uad11\uc6b4\ub300\ud559\uad50\ub294 '\ud559\uacfc\ubcc4 \ud544\uc218 \uad8c\uc7a5 \uc774\uc218 \uacfc\ubaa9'\uc744 \uae30\uacc4\uc801\uc73c\ub85c \uc9c0\uc815/\uac15\uc694\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4. \uadf8 \ub300\uc2e0 \uc9c0\uc6d0\uc790\uac00 \uc18c\uc18d\ub41c \uace0\ub4f1\uad50\uc721 \ud658\uacbd \uc18d\uc5d0\uc11c '\uc9c4\ub85c\ub97c \uc704\ud574 \uc2a4\uc2a4\ub85c \uad50\uacfc\ubaa9 \uccb4\uacc4\ub97c \uae30\ud68d\u00b7\uc120\ud0dd\ud558\uace0, \uadf8 \uc548\uc5d0\uc11c \uc9c0\uc801 \uc131\uc7a5\uc744 \uc774\ub8e8\uc5c8\ub294\uc9c0' \uc815\uc131\uc801\uc73c\ub85c \ud3c9\uac00\ud558\uac8c \ub429\ub2c8\ub2e4.
- \ub2e4\uc218 \ud3c9\uac00\uc790 \ub3c5\ub9bd\ud3c9\uac00: 1\uc778\ub2f9 2~3\uc778\uc758 \uc785\ud559\uc0ac\uc815\uad00\uc774 \uac1c\ubcc4\uc801/\ub3c5\ub9bd\uc801 \uc815\uc131\ud3c9\uac00 \uc9c4\ud589.
- \ube14\ub77c\uc778\ub4dc \uc6d0\uce59: 성명, \uace0\uad50\uba85 \ub4f1 \uc9c0\uc6d0\uc790\uc758 \ubaa8\ub4e0 \ubc30\uacbd(\ud6c4\uad11\ud6a8\uacfc)\uc744 \ucca0\uc800\ud788 \ucc28\ub2e8.
- \ud559\uad50\ud3ed\ub825 \uc870\uce58\uc0ac\ud56d \ubc18\uc601 (\uce58\uba85\uc801 \ud0c0\uaca9): 1~2\ud638\ub294 \uc815\uc131\ud3c9\uac00 \ubc18\uc601(\uac10\uc810), 3~7\ud638\ub294 \uc804\ud615 \ucd1d\uc810\uc5d0\uc11c 30~100\uc810 \ub300\ud3ed \uac10\uc810, 8~9\ud638\ub294 \ubd80\uc801\uaca9(\ubd88\ud569\uaca9) \ucc98\ub9ac\ub418\ubbc0\ub85c \uc774\ub97c \uc808\ub300\uc801\uc778 \ud398\ub110\ud2f0 \uc9c0\ud45c\ub85c \uc0bc\uc2b5\ub2c8\ub2e4.

\u25a0 \ud575\uc2ec 3\ub300 \ud3c9\uac00 \uc694\uc18c \ubc0f \uc11c\ub958\ud3c9\uac00 \ubd84\uc11d \uae30\uc900
\uc804\ud615\ubcc4\ub85c \ube44\uc728\uc774 \uc0c1\uc774\ud558\ub098(\uba74\uc811/SW\ud615: \uc9c4\ub85c 50%, \ud559\uc5c5 25%, \uc778\uc131 25% | \uc11c\ub958\ud615: \uc9c4\ub85c 45%, \ud559\uc5c5 35%, \uc778\uc131 20%), \ubaa8\ub4e0 \uc804\ud615\uc5d0\uc11c **'\uc9c4\ub85c\uc5ed\ub7c9(\ucd5c\uc18c 45%~\ucd5c\ub300 50%)'**\uc774 \uc555\ub3c4\uc801 \ub2f9\ub77d\uc744 \uc88c\uc6b0\ud569\ub2c8\ub2e4.

1. \uc9c4\ub85c\uc5ed\ub7c9 (\uc555\ub3c4\uc801 \ube44\uc911: 45~50%) - \uc2a4\uc2a4\ub85c \uae30\ud68d\ud558\ub294 \uc790\uae30\uc8fc\ub3c4\uc801 \uc9c4\ub85c \uac1c\ucc99\uacfc \uc2ec\ud654 \uc218\uac15 \uc131\ucde8
- \uc804\uacf5 \uad50\uacfc \uc774\uc218 \ub178\ub825: \uc778\uae30 \uacfc\ubaa9 \ud3b8\uc2dd\uc774 \uc544\ub2c8\ub77c \uc804\uacf5 \uae30\ucd08 \uacfc\ubaa9\uc758 \uc704\uacc4/\ub2e8\uc704\ub97c \uc9c0\ucf30\ub294\uac00? 
- \uace0\uad50 \ud658\uacbd \uc81c\uc57d\uc744 \ud0d3\ud558\uc9c0 \uc54a\uace0, '\uacf5\ub3d9\uad50\uc721\uacfc\uc815'\uc774\ub098 '\uc18c\uc778\uc218\uacfc\ubaa9' \ub4f1\uc744 \ucc3e\uc544 \uc218\uac15\ud55c \uc801\uadf9\uc801\uc778 \uacfc\uc815\uc774 \uc138\ud2b9\uacfc \ucc3d\uccb4\uc5d0\uc11c \uafb8\uc900\ud788 \ud0d0\uad6c/\ud655\uc7a5\ub418\uc5c8\ub294\uc9c0\ub97c 1\uc21c\uc704 \uac15\uc810\uc73c\ub85c \ubd80\uac01\ud574\uc57c \ud569\ub2c8\ub2e4.
- \uc774\uc218 \uc131\ucde8\ub3c4 \ud3c9\uac00: \uad50\uacfc \ub4f1\uae09\ubfd0\ub9cc \uc544\ub2c8\ub77c \uc6d0\uc810\uc218, \ud3b8\ucc28, \uc218\uac15\uc790 \uc218, \uc774\uc218 \ub2e8\uc704\ub97c \ubaa8\ub450 \uc885\ud569.

2. \ud559\uc5c5\uc5ed\ub7c9 (25~35%) - \ub300\ud559 \uc218\ud559 \ub2a5\ub825\uc774 \ub418\ub294 \uad50\uc721\uacfc\uc815 \uc774\uc218 \ucda9\uc2e4\ub3c4
- \uc131\uc801 \ucd94\uc774: \uc804\uccb4 \uc131\uc801 \ubc0f \uae30\ucd08/\uc8fc\uc694 \uacfc\ubaa9\uc758 \ud0c0 \uc9c0\uc6d0\uc790 \ub300\ube44 3\ub144\uac04 \uc131\ucde8 \ube44\uad50.
- \ud559\uc5c5 \ud0dc\ub3c4: \ub2e8\uc21c \ub4f1\uae09 \uc218\uce58 \ub108\uba38, \uad50\uacfc \uc218\uc5c5 \uc2dc\uac04\uc758 \ud1a0\ub860, \uc2e4\ud5d8, \uacfc\uc81c \uc2dc \ub098\ud0c0\ub098\ub294 '\uc801\uadf9\uc131, \uc9d1\uc911\ub825, \ub2a5\ub3d9\uc801\uc73c\ub85c \uc774\ud574\ud558\ub824\ub294 \uc131\uc2e4\ud55c \ud0dc\ub3c4'\ub97c \ud575\uc2ec\uc73c\ub85c \uac80\uc99d.

3. \uc778\uc131 (20~25%) - \uacf5\ub3d9\uccb4 \ud654\ud569\uacfc '\ud754\ub4e4\ub9ac\uc9c0 \uc54a\ub294 \uc77c\uad00\ub41c \ub048\uae30'
- \uacf5\ub3d9\uccb4\uc758\uc2dd\uacfc \uc18c\ud1b5: \ub3d9\uc544\ub9ac, \uc870\ubcc4 \uacfc\uc81c \ub4f1\uc5d0\uc11c \uc0c1\ub300\ubc29\uc744 \uba3c\uc800 \uc874\uc911\ud558\uace0, \uad6c\uc131\uc6d0\uc758 \ud654\ud569/\ub2e8\uacb0\uc744 \uc8fc\ub3c4\ud558\uc5ec \uacfc\uc81c\ub97c \uc774\ub04c\uc5b4 \ub0b8 \uc2e4\uc9c8\uc801 \uc790\ubc1c\uc801 \ud611\ub825 \uacbd\ud5d8 \uac80\uc5f4.
- \ud559\uad50\uc0dd\ud65c\ucda9\uc2e4\ub3c4 \ubc0f \uc131\uc2e4\uc131: \uc5b4\ub824\uc6b4 \uc0c1\ud669\uc774 \ubc1c\uc0dd\ud558\ub354\ub77c\ub3c4 \ud754\ub4e4\ub9ac\uc9c0 \uc54a\uace0 \uc77c\uad00\ub418\uac8c \uad50\ub0b4/\ud559\uc5c5\uc5d0 \ub9e4\uc9c4\ud558\ub294 \ub048\uae30\uc640 \ucc45\uc784\uac10. \ud2b9\ud788 '\ubbf8\uc778\uc815 \ucd9c\uacb0 \ubc18\ubcf5'\uc774\ub098 \uc8fc\uc694\uacfc\ubaa9 \ucc59\uae30\ub290\ub77c '\ube44\uc8fc\uc694 \uacfc\ubaa9(\uc608\uccb4\ub2a5 \ub4f1) \uc131\uc801 \ud615\ud3b8\uc5c6\uac8c \ubc29\uce58'\ud55c \ud754\uc801\uc740 \ubd80\uc815\uc801 \uac10\uc810\uc73c\ub85c \uac15\ud558\uac8c \uc791\ub3d9\ud569\ub2c8\ub2e4.

\u25a0 \uacc4\uc5f4\ubcc4/\ud559\uacfc\ubcc4 \uc2e4\ubb34 \ud569\uaca9 \uc0ac\ub840 \uae30\ubc18 \ud3c9\uac00 \ud2b9\ubcc4 \uc8fc\uc548\uc810 (\uacbd\ud5a5 \ubd84\uc11d)
\ud2b9\uc815 \uacfc\ubaa9\uc744 \uac15\uc81c\ud558\uc9c0 \uc54a\uc9c0\ub9cc \uc2e4\uc81c \ud569\uaca9\uc790\ub4e4\uc758 \uc774\uc218 \uacbd\ud5a5\uc744 \ubc14\ud0d5\uc73c\ub85c \ub2e4\uc74c \uae30\uc900\uc744 \uc801\uc6a9\ud558\uc2ed\uc2dc\uc624.

1. \uc790\uc5f0\u00b7\uacf5\ud559 \uacc4\uc5f4 (\uc804\uc790\uc815\ubcf4, \uc778\uacf5\uc9c0\ub2a5, \uacf5\uacfc, \uc790\uc5f0\uacfc\ud559)
- \uc804\uc790/\ubc18\ub3c4\uccb4/\uc804\uc790\uc7ac\ub8cc: \ubbf8\uc801\ubd84, \uae30\ud558 \ub4f1 \uc2ec\ud654 \uc218\ub9ac \ubc0f <\ubb3c\ub9ac\ud559\u2160\u00b7\u2161, \ud654\ud559\u2160> \uc774\uc218 \ube44\uc728\uc774 \ub9e4\uc6b0 \ub192\uc74c. \ubb3c\ub9ac/\ud654\ud559\uc801 \uc6d0\ub9ac \ud0d0\uad6c \ub2a5\ub825\uc774 1\uc21c\uc704.
- \uc778\uacf5\uc9c0\ub2a5/SW/\ucef4\ud4e8\ud130: \uc218\ub9ac\uc5ed\ub7c9(\ubbf8\uc801\ubd84/\uae30\ud558) \ubca0\uc774\uc2a4 \uc704\uc5d0 \uc815\ubcf4, \ud504\ub85c\uadf8\ub798\ubc0d, \uc778\uacf5\uc9c0\ub2a5 \uae30\ucd08/\uc218\ud559 \uacfc\ubaa9\uc758 \ub2a5\ub3d9\uc801 \uc774\uc218.
- \ud654\ud559/\ud654\ud559\uacf5\ud559/\ud658\uacbd: \ud654\ud559\u2160\u00b7\u2161 \uc6b0\uc218 \uc131\ucde8\ub3c4 \ubc0f \uc0dd\uba85\uacfc\ud559\u2160, \ubbf8\uc801\ubd84\uc758 \uc735\ud569\uc801 \uc774\uc218\uc640 \uad50\ucc28 \ud0d0\uad6c.

2. \uc778\ubb38\u00b7\uc0ac\ud68c\u00b7\uc0c1\uacbd \uacc4\uc5f4 (\uacbd\uc601, \uc778\ubb38\uc0ac\ud68c, \uc815\ucc45\ubc95\ud559)
- \uacbd\uc601/\ud1b5\uc0c1/\ube45\ub370\uc774\ud130: \ud655\ub960\uacfc \ud1b5\uacc4 \uae30\ubcf8 \uc774\uc218. \ube45\ub370\uc774\ud130\uacbd\uc601\uc758 \uacbd\uc6b0 \uc2e4\uc6a9\uc218\ud559\uacfc \ub370\uc774\ud130 \ud1b5\ud569 \ubd84\uc11d\ub825 \uc911\uc2dc. \uacbd\uc81c/\uacbd\uc81c\uc218\ud559 \uc131\ucde8\ub3c4 \uc9d1\uc911 \ud3c9\uac00.
- \uc815\ucc45\ubc95\ud559 (\ud589\uc815, \ubc95\ud559, \uad6d\uc81c): \uc815\uce58\uc640 \ubc95, \uc0ac\ud68c\ubb38\ud654, \uc0ac\ud68c\ubb38\uc81c\ud0d0\uad6c\ub97c \uae30\ubc18\uc73c\ub85c \ud604\ub300 \uc0ac\ud68c \ubb38\uc81c/\uc774\uc288\ub97c \uad6c\uc870\uc801\uc73c\ub85c \ubd84\uc11d\ud558\uace0 \ub300\uc548\uc744 \uc81c\uc2dc\ud558\ub294 \ube44\ud310\uc801 \uc0ac\uace0\ub825.
- \uc778\ubb38/\ubbf8\ub514\uc5b4/\uc2ec\ub9ac: \uc0ac\ub78c\uacfc \uc0ac\ud68c \ud604\uc0c1 \uae4a\uc219\ud55c \ud3ec\uc6a9. \uc0ac\ubb38/\uc0dd\ud65c\uacfc\uc724\ub9ac \uc131\ucde8 \ubc0f \uace0\uc804/\uc2ec\ud654\uad6d\uc5b4\ub97c \uc5f0\uacc4\ud55c \uc9c8\uc801 \uc5b8\uc5b4 \uc18c\ud1b5 \ub2a5\ub825.

\ud83d\udca1 \uc11c\ub958\ud3c9\uac00 \uacb0\ub860 \ud301:
\uad11\uc6b4\ub300\ud559\uad50 \ud559\uc0dd\ubd80\uc885\ud569\uc758 \ud575\uc2ec\uc740 '\uc5b4\ub824\uc6b4 \ud658\uacbd(\uc18c\uc778\uc218/\uacf5\ub3d9\uad50\uc721) \uc18d\uc5d0\uc11c\ub3c4 \ud754\ub4e4\ub9bc \uc5c6\uc774 \uacf5\ub3d9\uccb4 \ub048\uae30\ub97c \ubc1c\ud718\ud558\uc5ec \uc804\uacf5 \uacfc\ubaa9\uc744 \uac1c\ucc99\ud574 \ub0b8 \uc131\uc2e4\uc131'\uc785\ub2c8\ub2e4. \uc804\uacf5\uc744 \uc704\ud574 \uc18c\uc778\uc218/\uc2ec\ud654 \uad50\uacfc\ub97c \ub3c4\uc804\uc801\uc73c\ub85c \uc218\uac15\ud55c \uc774\ub825\uc774 \uc788\ub2e4\uba74 \uc9c4\ub85c\uc5ed\ub7c9(\ucd5c\ub300 50%)\uc758 \ucd5c\uace0\uc810\uc73c\ub85c \ucc44\uc810\ud558\uace0, \ube44\uc8fc\uc694 \uacfc\ubaa9(\uc608\uccb4\ub2a5) \ubc29\uce58 \ud754\uc801, \ud559\ud3ed, \uc5b4\ub824\uc6b4 \uc0c1\ud669\uc5d0\uc11c\uc758 \ud68c\ud53c/\ubb34\ub2e8 \uacb0\uc11d\uc774 \ub098\ud0c0\ub09c\ub2e4\uba74 \uce58\uba85\ud0c0\ub85c \uc9c0\uc801\ud558\uc2ed\uc2dc\uc624.
`,
      competencies: {
        academic: "\ud559\uc5c5\uc5ed\ub7c9 (35%) - \ud0c0 \uc9c0\uc6d0\uc790 \ub300\ube44 \uc131\ucde8\ub3c4 \ubc0f \ub2e8\uc21c \uc9c0\uc2dd\uc744 \ub118\uc740 \uc218\uc5c5 \uc911 \ub048\uc9c8\uae34 \uc9c0\uc801 \ud638\uae30\uc2ec\uacfc \uc131\uc2e4\ud55c \ucc38\uc5ec \ud0dc\ub3c4",
        career: "\uc9c4\ub85c\uc5ed\ub7c9 (45%) - [\uad11\uc6b4\ub300 \ud575\uc2ec \uc7a3\ub300] \uc218\ub3d9\uc801 \uc774\uc218 \ubc30\uc81c, \uacf5\ub3d9\uad50\uc721/\uc18c\uc778\uc218\uacfc\ubaa9 \ub4f1 '\uc704\uacc4\uc5d0 \ub9de\ucdb0 \uc8fc\ub3c4\uc801\uc73c\ub85c \uae30\ud68d\ud55c \uacfc\ubaa9 \uc124\uacc4' \ubc0f \uc2ec\ud654 \uc131\ucde8",
        community: "\uc778\uc131 (20%) - \uc774\ud0c0\uc801 \uc870\ud654, \ud2b9\ud788 '\uc5b4\ub824\uc6b4 \uc0c1\ud669\uc5d0\uc11c\ub3c4 \ud754\ub4e4\ub9ac\uc9c0 \uc54a\ub294 \ub048\uae30\uc640 \ucc45\uc784\uac10(\uc778\uc131)' \ubc0f \ube44\uc8fc\uc694\uacfc\ubaa9\uacfc \ucd9c\uacb0 \uc131\uc2e4\uc131"
      },
      weights: { academic: 0.35, career: 0.45, community: 0.20 } // \uc11c\ub958\ud615 \ube44\uc728 \ud3c9\uade0\uce58\ub85c \ud1b5\ud569 \uc138\ud305
    },
    "\uacbd\uae30\ub300\ud559\uad50": {
      factors: `
[\uacbd\uae30\ub300\ud559\uad50 2026\ud559\ub144\ub3c4 \ud559\uc0dd\ubd80\uc885\ud569\uc804\ud615 \uc11c\ub958\ud3c9\uac00 \uae30\uc900 \ubc0f \ud559\uacfc\ubcc4 \ud3c9\uac00 \uc8fc\uc548\uc810]

\u25a0 \uc11c\ub958\ud3c9\uac00 \uc885\ud569 \uc548\ub0b4 \ubc0f \ubc29\ubc95
\uacbd\uae30\ub300\ud559\uad50\ub294 \ub0b4\uc2e0\uc131\uc801\uacfc \ucd9c\uacb0\uc758 \ub2e8\uc21c '\uc815\ub7c9\ud3c9\uac00'\ub97c \ucca0\uc800\ud788 \ubc30\uc81c\ud558\uace0, 2~3\uc778\uc758 \uc0ac\uc815\uad00\uc774 3\ub144\uac04\uc758 \uae30\ub85d\uc744 \ubc14\ud0d5\uc73c\ub85c \ud559\uc0dd\uc758 \uacc4\uc5f4\uc801\ud569\uc131\uacfc \uc8fc\ub3c4\uc801 \ud0d0\uad6c\uc758 \uc9c8(\u8cea)\uc744 \uc885\ud569 \uc815\uc131\ud3c9\uac00\ud569\ub2c8\ub2e4.
- \ud3c9\uac00 \ucd08\uc810: "\uc790\uc2e0\uc774 \uc9c0\uc6d0\ud558\ub294 \uacc4\uc5f4\uc758 \uad8c\uc7a5 \uacfc\ubaa9\uc744 \uc774\uc218\ud588\ub294\uac00? \ud639\uc740 \uacfc\ubaa9\uc774 \ubbf8\uac1c\uc124\ub418\uc5c8\ub2e4\uba74 \uc77c\ubc18 \uad50\uacfc/\ube44\uad50\uacfc\ub97c \uc6b0\ud68c\ud558\uc5ec \uc8fc\ub3c4\uc801\uc73c\ub85c \uc9c0\uc2dd \ubc0f \ubb38\uc81c\ub97c \ud0d0\uad6c\u00b7\ud574\uacb0\ud588\ub294\uac00?"

\u25a0 \ud575\uc2ec 3\ub300 \ud3c9\uac00 \uc694\uc18c \ubc0f \uc11c\ub958\ud3c9\uac00 \ubd84\uc11d \uae30\uc900
\uc77c\ubc18\ud615: \ud559\uc5c5\ud0d0\uad6c\uc5ed\ub7c9 60%(\ud559\uc5c5\uc131\ucde8 30 + \uacc4\uc5f4\uc801\ud569\uc131 30) / \uc790\uae30\uac1c\ubc1c 20% / \uacf5\ub3d9\uccb4 20%
SW\uc6b0\uc218(AI\ucef4\uacf5): \ud559\uc5c5\ud0d0\uad6c\uc5ed\ub7c9 60%(\ud559\uc5c5\uc131\ucde8 25 + \uacc4\uc5f4\uc801\ud569\uc131 35) / \uc790\uae30\uac1c\ubc1c 20% / \uacf5\ub3d9\uccb4 20%

1. \ud559\uc5c5\ud0d0\uad6c\uc5ed\ub7c9 (\ub2e8\uc77c \ucd5c\ub300 \ube44\uc911 60%)
- \ud559\uc5c5\uc131\ucde8\uc218\uc900 (25~30%): \uc6d0\uc810\uc218, \ud3b8\ucc28, \uc218\uac15\uc790 \uc218 \ub4f1\uc744 \uc885\ud569 \uace0\ub824. \ud2b9\ud788 '\uc218\uc5c5\uc5d0\uc11c \uc9c0\uc2dd \ud655\uc7a5\uc744 \uc704\ud574 \uc9c1\uc811 \ucd94\uac00 \uc790\ub8cc\ub098 \ub370\uc774\ud130\ub97c \uc218\uc9d1\ud558\uace0 \ud65c\uc6a9\ud574 \ubb38\uc81c\ub97c \ud574\uacb0\ud55c \uc735\ud569\uc801 \uc0ac\uace0 \uacfc\uc815'\uc744 \ucc3e\uc544\ub0b4\uc57c \ud569\ub2c8\ub2e4. \ud2b9\uc815 \uacfc\ubaa9 \ud3b8\uc2dd \uc5c6\ub294 \uade0\ud615\ub3c4 \uc911\uc2dc.
- \uacc4\uc5f4\uc801\ud569\uc131 (30~35%): \uc704\uacc4\uc5d0 \ub9de\ub294 \ucda9\ubd84\ud55c \uad8c\uc7a5 \uc774\uc218 \ud655\uc778. \ub2e8, \ud658\uacbd \ud0d3(\ud574\ub2f9 \uc804\uacf5\uacfc\ubaa9 \ubbf8\uac1c\uc124)\uc5d0 \ub530\ub978 \ubd88\uc774\uc775\uc740 \uc5c6\uc73c\uba70 \uadf8 \ube48\uc790\ub9ac\ub97c \ub3d9\uc544\ub9ac/\uc9c4\ub85c\ud65c\ub3d9\uc73c\ub85c \uc5bc\ub9c8\ub098 \ub2a5\ub3d9\uc801\uc73c\ub85c \uba54\uafe8\ub294\uac00\uac00 \ud575\uc2ec\uc785\ub2c8\ub2e4.

2. \uc790\uae30\uac1c\ubc1c\uc5ed\ub7c9 (20%) - \ub2a5\ub3d9\uc801 \ucc38\uc5ec\uc640 \uacfc\uc815 \uc911\uc2ec\uc758 \uc790\uae30\uc8fc\ub3c4\uc131
- \uc2a4\uc2a4\ub85c \ubaa9\ud45c\ub97c \uc124\uc815\ud558\ub294 \uc790\uae30\uc8fc\ub3c4\uc801 \ub178\ub825 \uac80\uc99d.
- \uacb0\uacfc\ubb3c\uc758 \ub2e8\uc21c\ud55c \uc6b0\uc218\ud568(\uc591)\ubcf4\ub2e4\ub294 "\uc2a4\uc2a4\ub85c \ubb38\uc81c\ub97c \ucc3e\uc544\ub0b4\uace0 \ud574\uacb0\ud574 \ub098\uac00\ub294 \uce58\uc5f4\ud55c \uacfc\uc815\uc758 \uc8fc\ub3c4\uc131"\uc744 \uac00\uc7a5 \uacb0\uc815\uc801 \uae30\uc900\uc73c\ub85c \uc0bc\uc544 \ud3c9\uac00\ud558\uc2ed\uc2dc\uc624. \uc9c4\ub85c\uac00 \ubcc0\uacbd\ub418\uc5c8\ub354\ub77c\ub3c4 \uc774\uc720\uc640 \uacfc\uc815\uc774 \ud0c0\ub2f9\ud558\uace0 \uce58\uc5f4\ud588\ub2e4\uba74 \uae0d\uc815\uc801\uc73c\ub85c \ucc44\uc810.

3. \uacf5\ub3d9\uccb4\uc5ed\ub7c9 (20%) - \uc194\uc120\uc218\ubc94\uacfc \ud611\ub825\uc801 \uc18c\ud1b5
- \ub2e8\uc21c \ub9ac\ub354\uc2ed(\ubc18\uc7a5/\ud68c\uc7a5 \ub4f1 \uc9c1\ucc45) \uc774\uc218 \uc5ec\ubd80\uac00 \uc911\uc694\ud55c \uac8c \uc544\ub2c8\ub77c, \uc8fc\uc5b4\uc9c4 \uc5ed\ud560 \uc18d\uc5d0\uc11c '\uc774\ud574, \uc874\uc911, \ud654\ud569\uc744 \uc774\ub048 \uc2e4\uc9c8\uc801 \uc18c\ud1b5'\uacfc \uc194\uc120\uc218\ubc94\uc774 \uc788\uc5c8\ub294\uac00\ub97c \ud30c\ud5e4\uccd0 \ubcf4\uc544\uc57c \ud569\ub2c8\ub2e4.

\ud83d\udca1 \uc720\uc758\uc0ac\ud56d (\ud559\uad50\ud3ed\ub825):
- \ud559\ud3ed 1~3\ud638\ub294 \uc815\uc131\ud3c9\uac00 \uc2dc \uac10\uc810\uc73c\ub85c, 4~9\ud638 \ucc98\ubd84\uc740 \uc644\uc804\ud55c \ubd80\uc801\uaca9(\ubd88\ud569\uaca9)\uc73c\ub85c \uc81c\uc7ac\ud558\ubbc0\ub85c, \ubc1c\uacac \uc989\uc2dc \uce58\uba85\uc801\uc778 \uac10\uc810/\ud0c8\ub77d \uc0ac\uc548\uc73c\ub85c \uba85\uc2dc\ud558\uc2ed\uc2dc\uc624.

\u25a0 \uacc4\uc5f4\ubcc4/\ub2e8\uacfc\ub300\ud559\ubcc4 \uc2e4\ubb34 \ud569\uaca9 \uc0ac\ub840 \uae30\ubc18 \ud3c9\uac00 \ud2b9\ubcc4 \uc8fc\uc548\uc810 (\uacbd\ud5a5 \ubd84\uc11d)
1. \uc18c\ud504\ud2b8\uc6e8\uc5b4\uacbd\uc601\ub300\ud559 (SW/AI/\uacbd\uc601)
- AI\ucef4\ud4e8\ud130\uacf5\ud559\ubd80 (SW\uc6b0\uc218\uc790\uc804\ud615 \ub4f1 \uacc4\uc5f4\uc801\ud569\uc131 35% \ubc18\uc601): \uae30\ud558, \ubbf8\uc801, \ubb3c/\ud654\u2161 \ub4f1 \uc2ec\ud654 \uc218\ub9ac\uc640 \uc778\uacf5\uc9c0\ub2a5 \uae30\ucd08/\ud504\ub85c\uadf8\ub798\ubc0d \ud544\uc218 \uc774\uc218. \uc9c1\uc811 \uc6f9 \uc81c\uc791/\ud574\ud0b9 \ubcf4\uc548 \uc6d0\ub9ac \ubd84\uc11d \ub4f1 \uc790\uc728\uc131\uacfc \ub048\uae30 \uc788\ub294 \uc2e4\ucc9c '\ucd08\uac15\ub825 \uac00\uc810'.
- \uacbd\uc601/\uc0b0\uc5c5 \uacc4\uc5f4: \ud655\ud1b5, \uacbd\uc81c\uc218\ud559 \ub4f1 \uc218\ub9ac\uc801 \ubca0\uc774\uc2a4 \ud544\uc218. \ucd5c\uadfc \ub9c8\ucf00\ud305/\uacbd\uc601\uc5d0 AI/\ube45\ub370\uc774\ud130\ub97c \uc811\ubaa9\ud55c(\uc608: \uc0dd\uc131\ud615 AI\ub97c \ud65c\uc6a9\ud55c \ub9c8\ucf00\ud305 \ubd84\uc11d) \uc735\ud569\uc801 \uc2dc\uc7a5 \ubb38\uc81c \ud0d0\uad6c \uc5ed\ub7c9\uc744 \ub9e4\uc6b0 \uc6b0\uc218\ud558\uac8c \ud3c9\uac00.

2. \uc0ac\ud68c\uacfc\ud559\ub300\ud559 \ubc0f \uc778\ubb38/\uad00\uad11\ubb38\ud654\ub300\ud559 (\uc778\ubb38\u00b7\uc0ac\ud68c\u00b7\uc5b4\ubb38\u00b7\uacf5\uacf5 \ub4f1)
- \uc0ac\ud68c\uacfc\ud559\ub300\ud559 (\uacf5\uacf5, \ubc95, \uacbd\uc81c, \ubb34\uc5ed \ub4f1): \uc815\uce58\uc640\ubc95, \uc0ac\ubb38, \uc0dd\uc724 \uc774\uc218\ub97c \uae30\ubcf8\uc73c\ub85c \ud558\ub418 <\uc0ac\ud68c\ubb38\uc81c\ud0d0\uad6c, \uacbd\uc81c\uc218\ud559, \uc601\uc5b4\uad8c\ubb38\ud654, \uace0\uc804\uc77d\uae30> \uc774\uc218\ub97c \uae0d\uc815 \uac80\ud1a0. \uc6b0\ub9ac \uc0ac\ud68c \ud1b5\uacc4, \ubc94\uc8c4/\ud589\uc815 \ud604\uc0c1\uc744 \ub370\uc774\ud130\ub85c \ubd84\uc11d\ud558\uace0 \ub300\uc548\uc744 \uc81c\uc2dc\ud558\ub294 \ub2a5\ub3d9\uc131 \uac80\uc99d.
- \uc778\ubb38/\uad00\uad11\ubb38\ud654\ub300\ud559 (\ubbf8\ub514\uc5b4, \uc0ac\ud559, \uc5b4\ubb38, \ud638\ud154 \ub4f1): \ub2e8\uc21c \uc5b4\ud559 \uc5ed\ub7c9 \ub6f0\uc5b4\ub118\uc5b4\uc57c \ud568. \ud574\ub2f9 \uad6d\uac00\ub098 \ubbf8\ub514\uc5b4 \ud604\uc0c1\uc758 \uc5ed\uc0ac/\ubb38\ud559/ESG \ud2b8\ub80c\ub4dc \ub4f1\uc744 \ube44\ud310\uc801\uc774\uace0 \ub2e4\uc774\ub0b4\ubbf9\ud558\uac8c \uc5ee\uc5b4\ub0b4\ub294 \ubb38\ud654\uc801 \ud3ec\uc6a9\ub825 \ubc0f \uc758\uc0ac\uc18c\ud1b5\uc131.

3. \uc735\ud569\uacfc\ud559\ub300\ud559 \ubc0f \ucc3d\uc758\uacf5\uacfc\ub300\ud559 (\uc790\uc5f0/\uacf5\ud559 \uc804\ubc18)
- \uc790\uc5f0/\uae30\uacc4/\uc2e0\uc18c\uc7ac/\uac74\ucd95 \ub4f1: \ubbf8\uc801\ubd84, \uae30\ud558, \ubb3c\ub9ac\ud559\u2161, \ud654\ud559\u2161, \uc0dd\uba85\uacfc\ud559\u2161 \ub4f1 \uc804\uacf5 \uc9c1\uacb0 '\uacfc\ud559 \uc2ec\ud654 \uc774\uc218' \uc131\ucde8 \uc555\ub3c4\uc801 \ube44\uc911.
- \uac15\uc810 \uc9c0\ud45c: \ub2e8\uc21c\ud788 \ucc45\uc5d0\uc11c \ubcf8 \uc774\ub860\uc774 \uc544\ub2c8\ub77c, \uc2e4\ud5d8\uc744 \uae30\ud68d/\uc218\ud589\ud558\ub294 \uc911 \ub9c8\uc8fc\ud55c \ubcc0\uc218/\uc624\ub958 \uadf9\ubcf5 \uacfc\uc815. \uacfc\ud559 \uc9c0\uc2dd\uc744 \ub3d9\uc6d0\ud55c \uc2e4\uc0dd\ud65c(\ud658\uacbd \uc624\uc5fc \ub4f1) \uacfc\uc81c \ud574\uacb0\ub825.

4. \uc608\uc220\uccb4\uc721\ub300\ud559 (\ub514\uc790\uc778\ube44\uc988, Fine Arts \ub4f1)
- \uc608\uc220/\ub514\uc790\uc778: \ubbf8\uc220\ucc3d\uc791, \ube44\ud3c9 \ub4f1 \uc2e4\uae30 \uc5f0\uad00 \uc774\uc218\ub294 \ubb3c\ub860, \uc790\uc2e0\uc758 \uc2ec\ubbf8\uc801 \uac10\uac01\uc744 \ub3c4\uc2a8\ud2b8, \uacf5\uacf5 \uc804\uc2dc \uae30\ud68d, \uc0ac\ud68c\ubb38\uc81c \ud0d0\uad6c \ucea0\ud398\uc778 \ub4f1 '\ud0c0\uc778\uacfc\uc758 \uc18c\ud1b5 \ubc0f \uc0ac\ud68c \uc774\uc288 \ud574\uacb0 \ubc29\uc548'\uc73c\ub85c \uc804\ud658\ud55c \uc778\ubb38\ud559\uc801/\uc2e4\ucc9c\uc801 \uc18c\uc591 \uc5ec\ubd80 \uc911\uc810 \ud3ec\ucc29.

\ud83d\udca1 \uc11c\ub958\ud3c9\uac00 \uacb0\ub860 \ud301:
\uacbd\uae30\ub300\ud559\uad50 \ud569\uaca9\uc758 \ub2f9\ub77d\uc740 '\uacc4\uc5f4\uc801\ud569\uc131'\uc774 \uc88c\uc6b0\ud569\ub2c8\ub2e4. AI\ucef4\ud4e8\ud130\uacf5\ud559\uc758 \ud504\ub85c\uadf8\ub798\ubc0d/\uae30\ud558, \uacf5\ud559\uae30\ubc18\uc758 \uacfc\ud559\u2161 \uacfc\ubaa9, \uc0ac\ud68c\uacfc\ud559\uc758 '\uc0ac\ud68c\ubb38\uc81c \ud0d0\uad6c' \ub4f1 \ud559\uacfc\uac00 \ub69c\ub837\ud558\uac8c \uc120\ud638\ud558\ub294 \uad50\uacfc\ub97c \uc8fc\ub3c4\uc801\uc73c\ub85c \uc774\uc218\ud588\ub294\uc9c0 \uac00\uc7a5 \uba3c\uc800 \uc2a4\uce94\ud558\uc2ed\uc2dc\uc624. \ub354\ubd88\uc5b4 \uc9c0\uc2dd\uc744 \ub2e8\uc21c \uc554\uae30\ud55c \uac83\uc744 \ub118\uc5b4 \uc2e4\uc0dd\ud65c\uc758 \uc624\ub958 \ud574\uacb0, \uc735\ud569(\uc608: \uacbd\uc601+AI), \ucea0\ud398\uc778(\ubbf8\uc220+\uc0ac\ud68c) \ub4f1\uc5d0 \uc811\ubaa9\ud55c \uad6c\uccb4\uc801 \uacb0\uacfc\ubb3c\uc774 \ubcf4\uc778\ub2e4\uba74 \uc774\ub97c \ucd5c\uace0\uc810\uc73c\ub85c \uc815\uc131\ud3c9\uac00\ud574\uc57c \ud569\ub2c8\ub2e4.
`,
      competencies: {
        academic: "\ud559\uc5c5\ud0d0\uad6c\uc5ed\ub7c9 (60%) - \uc131\ucde8\uc218\uc900(25~30%): \uc6d0\uc810\uc218 \ub9e5\ub77d \uace0\ub824/\uc735\ud569\uc801 \uc0ac\uace0\ub825, \uacc4\uc5f4\uc801\ud569\uc131(30~35%): \uc804\uacf5/\uacfc\ubaa9 \ubbf8\uac1c\uc124\uc774\uc5b4\ub3c4 \uc77c\ubc18/\ube44\uad50\uacfc\ub97c \ud1b5\ud574 \uc6b0\ud68c \ud0d0\uad6c\ud55c \uc9c8\uc801 \uae4a\uc774",
        career: "\uc790\uae30\uac1c\ubc1c\uc5ed\ub7c9 (20%) - \uc790\uae30\uc8fc\ub3c4\uc131: \ub2a5\ub3d9\uc801 \ucc38\uc5ec\ubfd0\ub9cc \uc544\ub2c8\ub77c \uc2a4\uc2a4\ub85c \ubb38\uc81c\ub97c \uc124\uc815\ud558\uace0 \ud574\uacb0\ud574 \ub098\uac00\ub294 '\uacfc\uc815'\uc5d0\uc11c\uc758 \ud655\uc2e4\ud55c \uc8fc\ub3c4\uc131 \ubc1c\ud604",
        community: "\uacf5\ub3d9\uccb4\uc5ed\ub7c9 (20%) - \ub2e8\uc21c \ubc18\uc7a5 \uac10\ud22c\uac00 \uc544\ub2cc \uc194\uc120\uc218\ubc94\uacfc \ud611\ub825\uc801 \uc18c\ud1b5 \uc2e4\ucc9c, (\ud559\ud3ed 4~9\ud638\ub294 \uc989\uc2dc \ud0c8\ub77d \ucc98\ub9ac \ubc0f \uc9c4\ub85c\ubcc0\uacbd \ud0c0\ub2f9\uc131 \uae0d\uc815 \uac80\ud1a0)"
      },
      weights: { academic: 0.60, career: 0.20, community: 0.20 } // (\ud559\uc5c5\ud0d0\uad6c 60 / \uc790\uae30\uac1c\ubc1c 20 / \uacf5\ub3d9\uccb4 20) \ud1b5\ud569
    },
    "\uac00\ucc9c\ub300\ud559\uad50": {
      factors: `
[\uac00\ucc9c\ub300\ud559\uad50 2027\ud559\ub144\ub3c4 \ud559\uc0dd\ubd80\uc885\ud569\uc804\ud615 \uc11c\ub958\ud3c9\uac00 \uae30\uc900 \ubc0f \ud559\uacfc\ubcc4 \ud3c9\uac00 \uc8fc\uc548\uc810]

\u25a0 \uc11c\ub958\ud3c9\uac00 \uc885\ud569 \uc548\ub0b4 \ubc0f \ubc29\ubc95
\uac00\ucc9c\ub300\ud559\uad50\ub294 \ud559\uc5c5\uc5ed\ub7c9 \ube44\uc911\uc774 \uac00\uc7a5 \ub192\uc740 \uc77c\ubc18\uc801\uc778 \ub300\ud559\ub4e4\uacfc \ub2ec\ub9ac, **\uc778\uc131(40%), \uc9c4\ud559\uc758\uc9c0(40%), \ud559\uc5c5\uc5ed\ub7c9(20%)**\uc774\ub77c\ub294 \ud30c\uaca9\uc801\uc778 \uc815\uc131\ud3c9\uac00 \ube44\uc728\uc744 \uac16\uc2b5\ub2c8\ub2e4.
\uad50\uacfc\uc640 \ube44\uad50\uacfc\ub97c \uae30\uacc4\uc801\uc73c\ub85c \ubd84\ub9ac\ud558\uc9c0 \uc54a\uace0 \uc0dd\uae30\ubd80 \uc804 \uc601\uc5ed\uc744 \uc720\uae30\uc801\uc73c\ub85c \uc5f0\uacb0\ud558\uc5ec \uc885\ud569 \ud3c9\uac00\ud558\uba70, \uace0\uad50 \uc7ac\ud559 \uc911 '\uc9c4\ub85c \ubcc0\uacbd'\uc774 \uc788\ub354\ub77c\ub3c4 \ud0d0\uc0c9 \uacfc\uc815\ub9cc \ud569\ub9ac\uc801\uc774\ub77c\uba74 \uac10\uc810 \uc5c6\uc774 \uc720\uc5f0\ud558\uac8c \ud3c9\uac00\ud569\ub2c8\ub2e4.

\u25a0 \ud575\uc2ec 3\ub300 \ud3c9\uac00 \uc694\uc18c \ubc0f \uc11c\ub958\ud3c9\uac00 \ubd84\uc11d \uae30\uc900
1. \uc778\uc131 (\ub2e8\uc77c \ucd5c\ub300 \ube44\uc911 40%) - \ub098\ub214, \ubc30\ub824, \uacf5\ub3d9\uccb4 \uc5ed\ub7c9\uacfc \uc131\uc2e4\uc131
- \ud0c0 \ub300\ud559\uc758 20% \uc218\uc900\uc744 \ub118\uc5b4, \uac00\ucc9c\ub300\ub294 \uc778\uc131\uc744 40%\ub85c \ub461\ub2c8\ub2e4. \ub098\ub214, \ubc30\ub824, \uacf5\ub3d9\uccb4 \ud654\ud569\uc740 \ubb3c\ub860 \uae30\ubcf8\uc801 \uc131\uc2e4\uc131(\ucd9c\uacb0 \ub4f1)\uc744 \ub9e4\uc6b0 \uac15\ub3c4 \ub192\uac8c \ubd05\ub2c8\ub2e4.
- \ud559\uae09/\ub3d9\uc544\ub9ac\uc5d0\uc11c \uacfc\uc81c\ub97c \uc218\ud589\ud560 \ub54c \ud300\uc6d0\ub4e4\uacfc \uc5b4\ub5bb\uac8c \ud611\uc5c5\ud558\uace0 \ud0c0\uc778\uc744 \ubc30\ub824\ud588\ub294\uc9c0 \uc804 \uc601\uc5ed\uc5d0\uc11c \uc2a4\uce94\ud558\uc2ed\uc2dc\uc624. (\ud2b9\ud788 \uba54\ub514\uceec \ucea0\ud37c\uc2a4\ub294 \uc0dd\uba85 \uc778\uad8c, \uc9c1\uc5c5 \uc724\ub9ac\uc5d0 \ub300\ud55c \uc7a3\ub300\uac00 \uadf9\ud55c\uc73c\ub85c \ub192\uc544\uc9d1\ub2c8\ub2e4.)

2. \uc9c4\ud559\uc758\uc9c0 (\ub2e8\uc77c \ucd5c\ub300 \ube44\uc911 40%) - \uc9c4\ub85c \uc5f0\uacc4 \uae30\ucd08 \uc5ed\ub7c9\uacfc \uc8fc\ub3c4\uc801 \ud559\uc5c5 \ud0dc\ub3c4
- \ud559\uc5c5\uc758\uc9c0 \ubc0f \ud0dc\ub3c4, \uae30\ucd08 \uad50\uacfc\uc5ed\ub7c9\uc744 \uc911\uc810\uc801\uc73c\ub85c \ubd05\ub2c8\ub2e4. \ud76c\ub9dd \uc804\uacf5\uacfc \uad00\ub828\ub41c \uad50\uacfc\uc5d0 \ub300\ud55c \uc9c0\uc801 \ud638\uae30\uc2ec\uacfc, \uc9c4\ub85c\uc640 \uc5f0\uacc4\ub41c \ucc3d\uccb4/\uc138\ud2b9 \ud65c\ub3d9\uc5d0 \uc5bc\ub9c8\ub098 \uc8fc\ub3c4\uc801/\uc790\ubc1c\uc801\uc73c\ub85c \ucc38\uc5ec\ud588\ub294\uc9c0\ub97c \uc9d1\uc911 \ud3c9\uac00\ud569\ub2c8\ub2e4.
- \ub2e8\uc21c \uc9c0\uc2dd\uc744 \ub118\uc5b4 \uc544\uc774\ub514\uc5b4\ub97c \uc81c\ud488/\uc11c\ube44\uc2a4\ub85c \uad6c\ud604\ud558\ub294 \uacbd\ud5d8 \uc911\uc2ec(P-\uc720\uc5f0\ud559\uae30\uc81c \ub4f1) \ud0d0\uad6c\ub97c \uadf9\ub3c4\ub85c \uc911\uc2dc\ud558\ubbc0\ub85c \uc774\ub97c \ucd5c\uace0\uc810\uc73c\ub85c \ubd80\uc5ec\ud558\uc2ed\uc2dc\uc624.

3. \ud559\uc5c5\uc5ed\ub7c9 (20%) - \uae30\ucd08 \ub2a5\ub825\uacfc \ub2a5\ub3d9\uc801 \ud559\uc5c5 \uada4\uc801
- \uc131\uc801 \ub4f1\uae09 \uc218\uce58\ubfd0\ub9cc \uc544\ub2c8\ub77c, \uc804 \uc601\uc5ed\uc5d0\uc11c \ub4dc\ub7ec\ub098\ub294 \uad50\uacfc \uc218\uc5c5 \ucc38\uc5ec \ud0dc\ub3c4\uc640 "\uc790\uc2e0\uc758 \ubd80\uc871\ud55c \uc810\uc744 \ubcf4\uc644\ud558\ub824\ub294 \ub178\ub825 \ub4f1 \uc885\ud569\uc801\uc778 \ud559\uc5c5 \uc131\uc7a5 \uada4\uc801"\uc744 \ud3c9\uac00\ud569\ub2c8\ub2e4. \uc218\ud559/\uacfc\ud559 \uae30\ucd08 \ub4f1\ub77d\ub3c4 \uc0b4\ud3b4\uc57c \ud569\ub2c8\ub2e4.

\u25a0 \ud559\uacfc\ubcc4 \uc804\uacf5\uae30\ubc18 \ud575\uc2ec \uc5ed\ub7c9 \uc8fc\uc548\uc810 (\uacbd\ud5a5 \ubd84\uc11d)
1. \ucca8\ub2e8 IT \ubc0f \ubc18\ub3c4\uccb4 \uacc4\uc5f4 (\ucef4\uacf5, AI, \uc2dc\uc2a4\ud15c\ubc18\ub3c4\uccb4 \ub4f1 \uac00\ucc9c\ub300 \ucd5c\uc0c1\uc704 \uc8fc\ub825)
- \uc218\ud559\uc801 \ub17c\ub9ac\ub825 \ubc0f \ud504\ub85c\uadf8\ub798\ubc0d \uc5ed\ub7c9 \ucd5c\uc6b0\uc120. \ud68c\ub85c \uc124\uacc4, AI \ubaa8\ub378\ub9c1, \uc815\ubcf4\ubcf4\uc548 \ub4f1 \ud558\ubc84\ub4dc \uc218\uc900\uc744 \uc9c0\ud5a5\ud558\ub294 H/W \ubc0f S/W \uc804\uacf5\uc774\ubbc0\ub85c, \uc218\ud559\uacfc \ubb3c\ub9ac \ubc14\ud0d5\uc758 \uc2e4\ubb34 \uc9c0\ud5a5\uc801 \ud504\ub85c\uc81d\ud2b8 \uacbd\ud5d8(\ucf54\ub529 \ub4f1) \uc720\ubb34\uac00 \ud569\uaca9\uc758 \uc5f4\uc1e0\uc785\ub2c8\ub2e4.

2. \uc758\uc57d\ud559 \ubc0f \ubcf4\uac74\u00b7\uba54\ub514\uceec \uacc4\uc5f4 (\uc758\uc608, \uc57d\ud559, \uac04\ud638, \uce58\uc704\uc0dd \ub4f1)
- \ucd5c\uc0c1\uc704 \uc218/\uacfc \uc131\ucde8\ub294 \uae30\ubcf8 \uc804\uc81c\uc774\uba70, \uc778\uc131(40%)\uc5d0\uc11c \uc694\uad6c\ud558\ub294 \uc774\ud0c0\uc2ec/\ud76c\uc0dd\uc815\uc2e0/\uc758\ub8cc \uc724\ub9ac\uac00 \ud575\uc2ec. \ub1cc\uacfc\ud559, \uc2e0\uc57d \ub370\uc774\ud130 \ubd84\uc11d \ub4f1 \ucd5c\uc2e0 \uc758\ub8cc \uae30\uc220 \ub3d9\ud5a5(AI+\uc758\ub8cc)\uc5d0 \ub300\ud55c \uc735\ud569\ud615 \uc9c0\uc801 \ud638\uae30\uc2ec \uac15\ub825 \uac00\uc0b0\uc810.

3. \uacbd\uc601 \ubc0f \uc0ac\ud68c\uacfc\ud559 \uacc4\uc5f4 (\uacbd\uc601, \ubbf8\ub514\uc5b4, \uc751\uc6a9\ud1b5\uacc4 \ub4f1)
- \ucd5c\uc2e0 \uc0b0\uc5c5 \ud2b8\ub80c\ub4dc\ub97c \uc77d\uc5b4\ub0b4\ub294 \ub370\uc774\ud130 \ubd84\uc11d \ubc0f \ube45\ub370\uc774\ud130, \ud1b5\uacc4 \ub4f1 \uc218\ud559/IT \ud234\uc744 \uc778\ubb38\uc0ac\ud68c \ud604\uc0c1\uc774\ub098 \ud68c\uacc4/\uacbd\uc601 \ubb38\uc81c \ud574\uacb0\uc5d0 \ubb34\uae30\ub85c \uc811\ubaa9\ud574 \ubcf8 '\ubd84\uc11d\uc801 \uae30\ud68d \uc5ed\ub7c9'\uc744 \uac15\ub825\ud558\uac8c \ud3c9\uac00\ud558\uc2ed\uc2dc\uc624.

4. \uacf5\ud559 \ubc0f \uc2a4\ub9c8\ud2b8\uc2dc\ud2f0 \uacc4\uc5f4 (\ud654\uacf5, \ubc30\ud130\ub9ac, \ub85c\ubd07, \uac74\ucd95 \ub4f1)
- \uc218/\ubb3c/\ud654 \uae30\ucd08\uacfc\ud559 \ubf08\ub300\ub97c \uae30\ubc18\uc73c\ub85c, \uc2e4\uc81c \uc2dc\uc2a4\ud15c\uc744 \uc124\uacc4\ud558\uace0 \ubb38\uc81c\uc810\uc744 \uc804\uc0b0\ubaa8\uc0ac(\uc2dc\ubbac\ub808\uc774\uc158)\ud574\ubcf4\ub294 \ub4f1 P-\ud559\uae30\uc81c\ud615 '\uc2e4\ucc9c\uc801 \ud504\ub85c\uc81d\ud2b8 \uc911\uc2ec \ud0d0\uad6c \ubc0f \uc624\ub958 \uadf9\ubcf5 \uacbd\ud5d8'\uc744 \uc911\uc2dc\ud569\ub2c8\ub2e4.

5. \uc778\ubb38 \ubc0f \ubc95\ud559 \uacc4\uc5f4 (AI\uc778\ubb38\ub300\ud559, \ubc95, \ud589\uc815, \uacbd\ucc30 \ub4f1)
- \uc5b4\ubb38 \uc735\ud569: \uc5b4\ud559 \ub2a5\ub825\uc744 \ucd9c\ud310, \uad00\uad11, \ub098\uc544\uac00 IT(\ub370\uc774\ud130 \ucc98\ub9ac, \ubbf8\ub514\uc5b4 \uae30\ud68d)\ub85c \ud655\uc7a5\ud558\ub824\ub294 \uc9c4\ub85c \uac1c\ucc99 \ud0dc\ub3c4. \ubc95/\ud589\uc815: \ub69c\ub837\ud55c \uacf5\uc9c1 \uc724\ub9ac\uc640 \ub17c\ub9ac\uc801 \uc0ac\ud68c\ubb38\uc81c \ube44\ud310\uc801 \uc0ac\uace0.

6. \uae30\ucd08\uacfc\ud559/\ubc14\uc774\uc624 (\uc0dd\uba85, \ud654\ud559, \uc601\uc591) \ubc0f \uc608\uc220\u00b7\uccb4\uc721\u00b7\uc790\uc720\uc804\uacf5
- \ubc14\uc774\uc624: \uc81c\uc57d/\ud654\uc7a5\ud488/\uce5c\ud658\uacbd \uc6d0\ucc9c \uae30\uc220\uc774\ubbc0\ub85c \uaf3c\uaf3c\ud55c \uc2e4\ud5d8 \uc5ed\ub7c9, \uc2e4\ud328\ub97c \ub450\ub824\uc6cc\ud558\uc9c0 \uc54a\ub294 \uc5f0\uad6c \ud0dc\ub3c4.
- \uc608\uc220: \uc804\uacf5 \uc2e4\uae30\ub9cc \ud30c\ub294 \uac83\uc774 \uc544\ub2c8\ub77c 4\ucc28 \uc0b0\uc5c5(\uba54\ud0c0\ubc84\uc2a4/\ucf58\ud150\uce20) \ubc0f \uc778\ubb38\ud559(\ube44\ud3c9/\uc0ac\ud68c\ubb38\uc81c)\uc744 \uacb0\ud569\ud55c \uc735\ud569 \uae30\ud68d\ub825.
- \uc790\uc720\uc804\uacf5: \ud559\ubb38 \uacbd\uacc4\ub97c \ud5c8\ubb34\ub294 \ub2a5\ub3d9\uc801 \uc9c0\uc801 \uc720\uc5f0\uc131.

\ud83d\udca1 \uc11c\ub958\ud3c9\uac00 \uacb0\ub860 \ud301 \ubc0f \uc720\uc758\uc0ac\ud56d:
\uac00\ucc9c\ub300 \ud559\uc0dd\ubd80\uc885\ud569\uc758 \uc2ec\uc7a5\ubd80\ub294 **'\uacbd\ud5d8(\ud504\ub85c\uc81d\ud2b8) \uc911\uc2ec\uc758 \ub2a5\ub3d9\uc131(\uc9c4\ud559\uc758\uc9c0 40%)'**\uacfc **'\ud300\uc6cc\ud06c/\uc131\uc2e4\uc131(\uc778\uc131 40%)'**\uc785\ub2c8\ub2e4. \uc9c4\ub85c \ubcc0\uacbd\uc774 \uc788\ub354\ub77c\ub3c4 \uadf8 \uacfc\uc815\uc774 \ub2a5\ub3d9\uc801\uc774\uc5c8\ub2e4\uba74 \uac10\uc810\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4. \uadf8\ub7ec\ub098 **\ud559\uad50\ud3ed\ub825 1~9\ud638 \uae30\uc7ac \uc0ac\ud56d\uc740 \uc815\uc131\ud3c9\uac00 \uc2dc \uc804\uccb4 \uacfc\uc815\uc5d0 \uac78\uce5c \uac15\ub825\ud55c \ubd88\uc774\uc775(\uac10\uc810) \ub300\uc0c1**\uc774\ubbc0\ub85c \ubc1c\uacac \uc989\uc2dc \uce58\uba85\ud0c0\ub85c \uc9c0\uc801\ud558\uc2ed\uc2dc\uc624.
`,
      competencies: {
        academic: "\ud559\uc5c5\uc5ed\ub7c9 (20%) - \uc131\uc801 \uc218\uce58\ubfd0 \uc544\ub2c8\ub77c, \uc790\uc2e0\uc758 \ubd80\uc871\ud55c \uc810\uc744 \ub048\uc9c8\uae30\uac8c \ubcf4\uc644\ud558\ub294 \uad50\uacfc \ucc38\uc5ec \ud0dc\ub3c4 \uae30\ubc18 \uc131\uc7a5 \uada4\uc801",
        career: "\uc9c4\ud559\uc758\uc9c0 \ubc0f \uae30\ucd08\uc5ed\ub7c9 (40%) - \uc9c0\uc6d0 \uc804\uacf5\uc5d0 \ub300\ud55c \uc790\ubc1c\uc801 \uc9c0\uc801 \ud638\uae30\uc2ec, \uc544\uc774\ub514\uc5b4\ub97c \uc2e4\ucc9c\uc801 '\uacbd\ud5d8'\uc73c\ub85c \uad6c\ud604\ud574 \ubcf8 \uc8fc\ub3c4\uc131",
        community: "\uc778\uc131 (40%) - \uc555\ub3c4\uc801 \uace0\ubc30\uc810. \ud559\uc5c5/\ub3d9\uc544\ub9ac\uc5d0\uc11c \ud0c0\uc778\uc744 \ubc30\ub824\ud558\uace0 \ud654\ud569\ud558\ub294 \uc778\uc131, \ucca0\uc800\ud55c \uc131\uc2e4\uc131, (\ud559\ud3ed 1~9\ud638\ub294 \uba85\ubc31\ud55c \uce58\uba85\uc801 \ubd88\uc774\uc775)"
      },
      weights: { academic: 0.20, career: 0.40, community: 0.40 } // \uac00\ucc9c\ub300\ub9cc\uc758 20-40-40 \ub3c5\uc790 \uc138\ud305
    },
    "서강대학교": {
      factors: `【서강대학교 2026 입시 평가기준】

【평가 철학 및 특징】
서강대학교는 "경계 없는 다전공제도"를 기반으로 특정 학과와의 직접적 연관성보다는 '지원자의 성장가능성'을 가장 핵심적인 평가 주안점으로 삼습니다.

【단과대 구성 및 모집 단위】
1. 인문대학: 국어국문학과, 영문학과, 사학과, 철학과 등
2. 사회과학대학: 정치외교학과, 사회학과, 심리학과, 신문방송학과 등  
3. 경제대학/경영대학: 경제학과, 경영학과, 국제비즈니스학과 등
4. 로욜라국제대학: 국제한국학과, 글로벌한국학과 등
5. 지식융합미디어대학: 빅데이터학과, 미디어커뮤니케이션학과 등
6. 자연과학대학: 물리학과, 화학과, 생명과학과, 수학과 등
7. 공학대학: 화학공학과, 전자공학과, 컴퓨터공학과 등
8. 소프트웨어융합대학: 소프트웨어학과, 인공지능학과

【평가 기준 및 배점】
1) 학업역량 (50%)
   - 성취도 (40%): 고등학교 교육과정 내용을 충실히 이해하고 있는지, 주요 교과목에서 성취 수준은 어떠한지
   - 창의적 문제해결력 (10%): 단순 암기가 아닌 상황을 분석하고 해결책을 모색하는 역량

2) 성장가능성 (30%) ★ 가장 핵심
   - 관심분야에 대한 자발적·주도적 탐구 경험
   - 실패나 한계를 극복하며 발전해 온 과정
   - 다양한 분야의 경험을 통한 융합적 사고 능력
   - 특정 학과와 직접적 연관성 없이도 '깊이 있는 탐구 과정 자체'가 가치

3) 공동체역량 (20%)
   - 팀 활동에서의 협력과 소통 능력
   - 타인을 배려하고 공감하는 태도
   - 학교 공동체의 구성원으로서의 책임감과 참여도

【평가 방식 및 주요 체크포인트】

★ 학업 성취도:
- 수학, 국어, 탐구과목 등 기초 교과 이수 충실도 (특히 모집단위별 관련 과목)
- 단순 최상위 학점만이 아닌, 자신의 관심분야로 꾸준히 노력한 흔적

★ 성장가능성 (서강대 최고 평가 영역):
- "경계 없는 다전공제도"의 철학에 부응하는 다양한 시도와 경험
- IT/데이터/창의성 관련 활동이 있다면 매우 긍정평가 (인공지능학과, 데이터학과 지원자 등)
- 특정 분야의 깊이 있는 탐구 (프로젝트 중심, 논문/논고 작성, 동아리 성과 등)
- 수학/과학의 심화학습, 창의적 실험·검증 경험
- 사회과학/인문학 지원자의 경우, 데이터·통계·국제이해를 바탕으로 한 분석적 사고

★ 공동체역량:
- 동아리/소모임 리더십 경험
- 학교 행사/프로젝트에서의 협력 자세
- 갈등 해결 및 타인 이해 경험

【핵심 평가 착안점】
- 서강대 지원 이유 및 계획을 깊이 있게 작성했는가? (지원 열정 + 구체성)
- 3년간의 일관된 성장 스토리가 있는가? (한 두 번의 우수성보다는 진정한 변화 과정)
- 학과별 맞춤형 준비가 있는가? (자신의 관심과 적성이 학과와 일치하는 경험)
- 실패 경험에서 배움을 얻었는가? (회복탄력성 및 성찰 능력)

【주의사항】
- 지나친 자기소개서 미사여구나 과장: 감점 대상  
- 학교폭력 등 품행 관련 기재사항: 별도의 강한 감점
`,
      competencies: {
        academic: "학업역량 (50%) - 기초 교과 충실도와 심화 학습 태도. 수학/과학/국어의 성취도뿐 아니라, 선택과목으로 자신의 관심분야를 심화 학습한 흔적 평가",
        career: "성장가능성 (30%) ★ 가장 중요 - 특정 학과와의 직접 연관성 없이도, 자기주도적이고 깊이 있게 한 분야를 탐구한 경험. 실패 극복, 아이디어 구현, 융합적 사고 역량",
        community: "공동체역량 (20%) - 팀 활동에서의 협력, 타인 배려, 책임감. 서강대는 '경계 없는 다전공' 철학에 따라 다양성과 포용성을 높게 평가"
      },
      weights: { academic: 0.50, career: 0.30, community: 0.20 }
    },
    "성균관대학교": {
      factors: `【성균관대학교 2026 학생부종합전형 평가기준】

【광역 모집 및 학과 구성】
성균관대학교는 1학년 때 계열 단위로 기초 학문을 이수한 뒤 2학년 진급 시 세부 학과로 진입하는 '광역 모집'과, 입학 시부터 전공이 확정되는 '학과 모집(전공예약)'을 병행합니다.

【주요 모집단위】
• 무전공/자유전공: 자유전공계열 (의약, 사범, 예체능, 첨단학과 제외한 전 학부/학과 진입 가능)
• 인문과학계열: 유학·동양학, 국어국문, 영어영문, 프랑스어문학, 중어중문, 독어독문, 러시아어문학, 한문, 사학, 철학, 문헌정보
• 사회과학계열: 행정, 정치외교, 미디어커뮤니케이션, 사회, 사회복지, 심리, 소비자, 아동·청소년, 경제, 통계
• 자연과학계열: 생명과학, 수학, 물리, 화학, 식품생명공학, 바이오메카트로닉스, 융합생명공학
• 공학계열: 화학공학부, 신소재공학부, 기계공학부, 건설환경공학부, 시스템경영공학, 나노공학
• 독립 모집 (인문/상경): 경영학과, 글로벌리더학부, 글로벌경제학과, 글로벌경영학과, 영상학과, 의상학과, 교육학과, 한문교육과
• 독립 모집 (공학): 전자전기공학부, 소프트웨어학과, 글로벌바이오메디컬공학과, 건축학과(5년제), 수학교육과, 컴퓨터교육과
• 첨단학과: 반도체시스템공학, 지능형소프트웨어, 배터리, 반도체융합공학, 에너지, 양자정보공학, 바이오신약·규제과학, 글로벌융합학부(AI융합)
• 의약/예체능: 의예과, 약학과, 연기예술, 무용, 스포츠과학

━━━━━━━━━━━━━━━━━━━━━━━━━━━
【성균관대 학생부종합전형의 핵심 특징 ─ 반드시 이해해야 할 사항】
━━━━━━━━━━━━━━━━━━━━━━━━━━━
★ 모집단위별 권장 이수과목 없음
★ 전공적합성 평가 요소 없음
★ 계열적합성 평가 요소 없음

성균관대학교는 특정 학과(모집단위)에 맞춘 이수과목을 요구하지 않습니다.
타 대학에서 중시하는 '전공(계열)적합성'을 별도 평가 요소로 반영하지 않습니다.
→ 수학, 과학 이수뿐만 아니라 인문·사회·예술 과목도 동등하게 평가됩니다.
→ 중요한 것은 '어떤 과목을 이수했느냐'가 아니라, '이수한 과목에서 얼마나 깊이 있게 탐구하고 성장했는가'입니다.

【평가 기본 원칙】
• 평가 자료: 학교생활기록부 100% 종합적 정성평가
• 평가 방식: 입학사정관 독립·교차 평가, 서류평가위원회 확정, 공정관리위원회 감시
• 학교폭력 조치: 1호 조치 100점 감점, 2~9호 조치 불합격 처리

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【평가 영역 및 반영 비율 (1000점 만점) ─ 공식 서류평가 기준】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1) 학업역량 (40% / 400점)
   ─ "우리 대학에 입학할 만한 충분한 학업 능력을 보여주는가?"
   ─ 학업 관련 활동 및 성취수준, 학업 태도, 학업 여건 등 종합 평가

   핵심 평가 요소: '학업성취도', '학업의 발전 정도', '학업에 대한 관심과 열의'

   ▣ 학업수월성 (200점)
   - 전 과목 학업성취도 및 학업우수성
   - 일반/진로선택과목 이수현황 및 성취수준
   - 학년/학기별 성적 안정성

   ▣ 학업충실성 (200점)
   - 학년/학기별 성적 추이 및 학업의지
   - 학년/학기별 학업관련 활동 내용
   - 학업활동에 적극적 참여 및 자세

2) 탐구역량 (40% / 400점) ★ 핵심 평가 영역
   ─ "관심 분야에 대한 호기심과 이를 탐구하기 위한 노력이 있는가?"
   ─ 진로 탐색 의지, 지적 호기심과 탐구 의지, 배움에 대한 관심 및 열의, 활동 내용 등

   핵심 평가 요소: '관심 분야의 이해와 노력', '관심 분야의 탐구력과 실험 정신', '진로탐색에 대한 열정'

   ▣ 탐구확장성 (200점)
   - 관심 분야에 대한 집중력 및 탐구력
   - 관심 분야에 대한 지적 호기심
   - 활동 내용의 발전성 및 유의미성

   ▣ 탐구주도성 (200점)
   - 도전적인 선택과목 이수 현황
   - 선택 교과의 강점 및 우수성
   - 진로탐색에 대한 열정과 주도성

3) 잠재역량 (20% / 200점)
   ─ "자기주도적 리더가 될 자질 및 발전가능성이 있는가?"
   ─ 자기주도성, 리더십, 공동체의식, 이타성, 소통 능력, 성실성 등

   핵심 평가 요소: '학교생활 성실성', '공동체의식', '리더십과 봉사정신'

   ▣ 미래성장성 (100점)
   - 주도적 학교 활동 참여
   - 진취적 리더십 발휘 경험
   - 창의적 문제해결 및 역경 극복 의지

   ▣ 공동체의식 (100점)
   - 세계시민의식 및 이타성
   - 협업 및 소통능력
   - 성실성 및 규칙 준수

━━━━━━━━━━━━━━━━━━━━━━━━━━━
【핵심 평가 착안점 및 체크포인트】
━━━━━━━━━━━━━━━━━━━━━━━━━━━

★ 학업역량 평가 주안점:
- 성적 안정성: 학년·학기별 꾸준한 성적 및 상승 추이
- 이수 충실도: 공통과목과 선택과목을 고루 충실하게 이수
- 수업 참여 태도: 세특에서 수업 중 질문, 발표, 주도적 참여 활동
- 학업 의지: 어려운 과목에서도 포기하지 않고 노력한 과정

★ 탐구역량 평가 주안점 (가장 중요한 구분점):
- 탐구의 진정성: '어떤 전공에 맞는 활동'이 아닌, 자신이 관심 있는 분야를 깊이 파고든 스토리
- 탐구의 연속성: 한 주제를 꾸준히 1~3학년 걸쳐 심화·발전시킨 경험
- 도전적 과목: 어려운 심화(진로선택) 과목에 도전하고 성취
- 세특 질적 깊이: 탐구 동기 → 과정 → 발전의 스토리가 구체적으로 드러날 것

★ 잠재역량 평가 주안점:
- 학교생활 성실성: 출결, 규칙 준수 기록
- 협업 경험: 조별 활동·프로젝트에서 실질적으로 기여한 구체적 사례
- 리더십: 직책에 관계없이 공동체에 주도적으로 기여한 경험
- 이타성: 자신보다 공동체를 위한 배려와 봉사

【주의사항】
• 전공/계열 적합성 기준으로 활동을 제한하지 말 것 → 진정성 있는 탐구가 더 유리
• 선택과목의 '많은 이수'보다 '이수한 과목에서의 깊이 있는 활동'이 더 중요
• 세특에서 단순 활동 나열 지양 → 탐구 동기·과정·발전이 반드시 드러나야 함
• 모집단위별 지정된 필수 이수과목 없음 → 고교 현황 내 최선을 다한 준비 과정 자체를 평가
`,
      competencies: {
        academic: "학업역량 (40%) — 학업성취도·학업우수성, 일반/진로선택과목 이수 및 성취수준, 학년·학기별 성적 안정성, 성적 추이 및 학업의지, 학업활동 참여 자세. 단순 등급이 아닌 학업 태도와 충실성을 종합 평가",
        career: "탐구역량 (40%) ★ 핵심 — 전공/계열 적합성 평가 없음. 어떤 분야든 자기만의 관심사를 지속적·주도적으로 탐구한 과정이 핵심. 관심 분야 집중력·지적 호기심, 진로 탐색 열정, 활동의 발전성·유의미성, 도전적 선택과목 이수와 세특 질적 깊이",
        community: "잠재역량 (20%) — 자기주도적 리더 자질과 발전가능성. 주도적 참여·진취적 리더십·창의적 문제해결·역경 극복 의지, 세계시민의식·이타성, 협업·소통·성실성·규칙준수. 직책보다 실질적 기여와 공동체의식 중시"
      },
      weights: { academic: 0.40, career: 0.40, community: 0.20 }
    },
    "한양대학교": {
      factors: `【한양대학교 2026 학생부종합전형 평가기준】

【개설 학과(모집단위) 총정리】

공과대학: 건축학부(5년제), 건축공학부, 건설환경공학과, 도시공학과, 자원환경공학과, 융합전자공학부, 컴퓨터소프트웨어학부, 정보시스템학과(상경), 전기·생체공학부(전기공학전공, 바이오메디컬공학전공), 신소재공학부, 화학공학과, 생명공학과, 유기나노공학과, 에너지공학과, 기계공학부, 원자력공학과, 산업공학과, 미래자동차공학과, 데이터사이언스학부, 반도체공학과

의과대학: 의예과 | 간호대학: 간호학과

인문과학대학: 국어국문학과, 중어중문학과, 영어영문학과, 독어독문학과, 사학과, 철학과

사회과학대학: 정치외교학과, 사회학과, 미디어커뮤니케이션학과, 관광학부

자연과학대학: 수학과, 물리학과, 화학과, 생명과학과

정책과학대학: 정책학과, 행정학과 | 경제금융대학: 경제금융학부 | 경영대학: 경영학부, 파이낸스경영학과

사범대학: 교육학과, 교육공학과, 국어교육과, 영어교육과, 수학교육과, 응용미술교육과

생활과학대학: 의류학과, 식품영양학과, 실내건축디자인학과

음악대학: 성악과, 작곡과, 피아노과, 관현악과, 국악과

예술체육대학: 스포츠산업과학부(스포츠매니지먼트전공, 스포츠사이언스전공), 연극영화학과(영화전공, 연출및스태프, 연기), 무용학과

국제대학 & 산업융합학부: 국제학부, 산업융합학부

한양인터칼리지(무전공/자유전공): 한양인터칼리지학부(자연/인문)

【한양대의 핵심 입시 철학 - 계열적합성 중시, 전공적합성 미중시】
한양대학교는 개별 학과(전공)별로 엄격한 맞춤형 스펙을 요구하지 않습니다. 
특정 전공에만 맞춰진 좁은 활동보다는, 넓은 의미의 '계열적합성'과 학생의 근본적인 사고력(심층학업역량)을 훨씬 더 중요하게 평가합니다.
→ 자동차공학과 지원자: 자동차 동아리 필수 아님. 물리적 원리 탐구, 수학적 문제해결 역량만으로도 충분
→ 핵심: '어떤 활동을 선택했는가'보다 '그 활동을 통해 무엇을 깊이 있게 탐구하고 어떤 사고방식을 보여줬는가'가 결정적

【서류평가 방법 및 특징】

▣ 횡단평가 시스템 (Cross-sectional Evaluation) - 한양대의 가장 큰 특징
• 여러 교사가 작성한 학생부의 각기 다른 항목들(수학 교사의 세특, 국어 교사의 세특, 담임 교사의 행동특성 등)을 서로 연결하여, 학생의 역량을 입체적으로 찾아내고 교차 검증
• 같은 주제에 대해 다양한 교사들이 기록한 내용을 종합하여 그 학생의 진정한 강점과 특성 파악
• 개별 학생부 항목만으로는 보이지 않는 '패턴'과 '일관성' 발견 가능

▣ 정량의 정성화 (Qualitative Assessment of Quantitative Data)
• 학생의 학업 역량을 단순한 내신 등급(수치)으로 평가하지 않음
• 📊 이수 단위, 표준편차, 이수자 수 등의 정량 정보 + 📝 세부능력 및 특기사항에 담긴 학업 참여 태도, 탐구의 흔적, 지적 고민 등을 종합적으로 고려하여 질적으로 평가
• 예: 같은 4등급이라도, "단순히 낮은 등급을 받은 학생"과 "매학기 성적이 상승하고 세특에 깊이 있는 탐구가 기록된 학생"을 구분하여 평가

▣ 블라인드 평가 (Blind Review)
• 평가 시 고교명, 지원자 성명, 주민등록번호 등의 인적 정보는 모두 가려진 상태에서 공정한 평가 수행
• 오직 학생의 '역량과 역사'만으로 평가

▣ 감점 요인
• 무단(미인정) 결석, 지각, 조퇴: 성실성 측면에서 부정적으로 반영
• 학교폭력 관련 사항: 사안의 심각도에 따라 감점(30점~300점) 또는 부적격(불합격) 처리

【학생부종합전형 4대 핵심 평가역량 및 상세 평가기준】

1️⃣ 기초학업역량 (교과 이수 및 성취도)
평가 주안점: 대학교육을 충실히 이수하는 데 필요한 기본적인 수학능력 보유 여부

✓ 학업성취도:
- 단순히 높은 등급을 받았는지가 아니라, 해당 과목에서 얼마나 꾸준히 노력하여 학업적 성장을 이루었는지
- 전 교과목을 고르게 학습하며 학업적 태도를 길렀는지 평가
- 학년별 성적 추이와 일관성 중점 검토

✓ 교과목 이수현황:
- 지원 전공(계열)에 맞는 과목(일반/진로선택)을 적절히 선택하여 이수했는지
- 선택과목(특히 심화/전문과목)의 이수와 그 과목에서의 성취도
- 기초 교과(국어, 수학, 영어, 과학, 사회)의 전반적인 이수 충실도

2️⃣ 심층학업역량 (생각의 깊이와 문제 해결력) ★★★ 한양대가 매우 강조하는 가장 중요한 역량
평가 주안점: 지적 호기심을 바탕으로 사물과 현상을 탐구하고, 문제를 해결하는 생각의 깊이 평가

✓ 비판적 사고력:
- 새로운 사물이나 현상을 접했을 때 표면적인 정보에 그치지 않고, "왜 이런 결과가 나왔을까?", "다른 관점은 없을까?"와 같이 스스로 질문을 던지고 논리적으로 탐구하는 능력
- 교사의 설명을 일방적으로 받아들이지 않고, 자신의 의문점을 표현하고 합리적 근거로 자신의 해석 제시


✓ 창의적 사고력:
- 여러 분야의 지식이나 개념을 융합하고, 배운 지식을 새로운 상황에 적용하여 자신만의 방법으로 문제를 해결해 나가는 능력
- 기존의 해결책을 비판적으로 검토하고 더 나은 대안 제시

✓ 탐구 과정과 깊이:
- 교과 수업, 독서, 동아리 활동 중 "왜 이런 결과가 나왔을까?"를 고민하고 스스로 해답을 찾아 나간 지적 호기심이 핵심
- 세부능력 및 특기사항에서 사고의 발전 과정과 창의성이 명확하게 드러나야 함
- 단순 활동 나열이 아닌, 활동 속 사고 과정, 시행착오, 그리고 깨달음의 성장 스토리가 중요

3️⃣ 진로탐구역량 ('전공'보다 '계열' 중시)
평가 주안점: 자신의 진로(계열)에 대한 탐색 노력과 준비 정도 평가. 핵심: 계열 기본 역량 입증이 선행되어야 함

✓ 계열적합성 중심의 진로탐색:
- 한양대학교는 좁은 의미의 '전공적합성'보다 폭넓은 '계열적합성'을 훨씬 중요하게 평가
- 자동차공학과 지원자가 반드시 자동차 관련 동아리만 해야 하는 것 아님
- 공학계열 전반의 기본 역량(물리적 원리, 수학적 문제해결, 창의적 설계)을 보여주는 것이 훨씬 유리

✓ 계열별 탐구 방향 제시:
- 자연/공학계열: 물리적 원리 탐구, 수학적 문제해결, 데이터 분석 등 공학/과학 전반의 수리·과학적 역량
- 인문/사회계열: 논리적 분석, 인문·사회과학적 탐구, 통계/데이터 해석, 타인과의 소통 능력
- 상경계열: 경제 지표 분석, 정책/기업 경영 사례 연구, 수리적 논리력
- 자유전공: 다방면 학문에 대한 폭넓은 지적 호기심, 경계를 허무는 융합적 사고

✓ 활동보다는 과정과 사고:
- **어떤 활동을 선택했는가**(결과)보다, 그 활동을 통해 **무엇을 깊이 있게 탐구하고 어떤 사고방식을 보여주었는가**(과정)가 핵심
- 소재가 정해져 있더라도, 그 안에서 얼마나 창의적으로 탐구했는지, 계열의 역량을 입증했는지가 중요

4️⃣ 공동체역량 (함께 살아가는 힘)
평가 주안점: 공동체 구성원들과 유기적으로 협력하며, 발전에 기여하는 태도 평가

✓ 소통과 협업:
- 교내 활동(동아리, 조별 과제, 프로젝트)에서 타인의 의견을 존중하고, 역할을 나누어 공동의 목표를 향해 협력한 실질적인 경험
- 갈등 상황에서 어떻게 대화와 타협을 통해 해결했는지

✓ 성장잠재력:
- 반장, 동아리 기장 등 단순히 어떤 '직책'을 맡았는지가 중요하지 않음
- 직책의 유무와 상관없이, 본인이 속한 공동체 안에서 어떤 책임감을 가지고 긍정적인 변화나 발전을 이끌어냈는지를 실질적인 사례를 통해 중점 평가

【서류평가 절차 - 다단계 품질 관리 시스템】

1단계: 준비단계
- 평가의 공정성을 위해 입학사정관 대상 모의평가 및 교육 실시
- 이 과정에서 평가 지침과 기준 통일

2단계: 종합역량평가 (기초학업역량 중심)
- 2인의 전임 입학사정관이 학생부의 교과 및 비교과 영역을 독립적으로 종합 평가
- 기초학업역량(교과 성취도, 과목 선택 현황) 중점 평가

3단계: 성취역량평가 (심층학업역량·진로탐구역량·공동체역량 중심)
- 전임사정관 2인 + 위촉사정관(해당 전공 교수) 1인이 심층적으로 평가
- 세부능력 및 특기사항의 사고 깊이, 창의성 평가
- 진로탐구의 진정성과 계열적합성 평가
- 공동체 활동에서의 실질적 기여도 평가

4단계: 재심위원회
- 평가자 간 점수 편차가 일정 기준 이상 발생할 경우, 전임사정관 5인으로 구성된 재심위원회 개최
- 점수 차이를 조정하고 최종 결정

【한양대 서류평가 시 주의사항 및 합격 포인트】

⚠️ 피해야 할 전략:
• 특정 전공명과 일치하는 활동만 부각하면 역효과 (맞춤형 광고식 표현 지양)
• 세부능력 및 특기사항에서 단순한 활동 '나열'만으로는 낮은 평가
• "~프로젝트를 했다" vs "~프로젝트를 하면서 어떤 문제를 발견하고, 그것을 어떻게 탐구해서 해결했는가"는 평가 결과가 완전히 다름

✅ 합격의 핵심 요소:
1. 기초학업역량: 기초 교과 이수 충실도와 최소한의 성적 안정성 (매우 낮은 등급 회피)
2. 심층학업역량: 세부능력 및 특기사항에 비판적·창의적 사고 과정이 명확히 드러나야 함 ★★★ 가장 중요
3. 진로탐구역량: 전공이 아닌 계열 관점에서 꾸준한 역량 입증 (활동 다양성보다 깊이 중심)
4. 공동체역량: 직책이 없어도 실질적 기여와 책임감 드러내기
5. 학년별 성장 스토리: 1학년 기초 → 2학년 심화 → 3학년 응용의 일관된 발전 과정
`,
      competencies: {
        academic: "기초학업역량 (35%) - 고교 교육과정 충실 이수, 과목 선택 능력, 성실한 학업 태도. '정량의 정성화': 등급뿐 아니라 이수 단위, 성장률, 세특의 학업 참여 태도 종합 평가",
        career: "심층학업역량 (40%) ★ 가장 중요 - 비판적·창의적 사고력. '왜?'라는 질문, 논리적 탐구 과정, 새로운 상황에 지식 적용 능력. 세부능력 및 특기사항의 사고 깊이와 발전 과정이 핵심. 계열(전공이 아닌) 기본 역량 입증. + 진로탐구역량(15%): 계열적합성 중심, 활동의 진정성과 깊이",
        community: "공동체역량 (10%) - 실질적 협력 경험, 직책 유무보다 책임감과 긍정적 기여, 타인 존중과 성찰 능력. 횡단평가: 여러 교사 기록을 연결하여 학생의 진정한 역량 입체적 평가"
      },
      weights: { academic: 0.35, career: 0.55, community: 0.10 }
    },
    "중앙대학교": {
      factors: `【중앙대학교 2026 학생부종합전형 평가기준】

【개설 학과(모집단위) 총정리】

인문대학: 국어국문학과, 영어영문학과, 유럽문화학부(독일어문학, 프랑스어문학, 러시아어문학), 아시아문화학부(일본어문학, 중국어문학), 철학과, 역사학과

사회과학대학: 정치외교학과, 공공인재학부, 심리학과, 문헌정보학과, 사회복지학부, 미디어커뮤니케이션학부, 사회학과, 도시계획/부동산학과

사범대학: 교육학과, 유아교육과, 영어교육과, 체육교육과

경영경제대학: 경영학부(경영학, 글로벌금융), 경제학부, 산업보안학과(인문/자연), 응용통계학과, 지식경영학부

자연과학대학: 물리학과, 화학과, 생명과학과, 수학과

공과대학: 화학공학과, 기계공학부, 첨단소재공학과, 사회기반시스템공학부(건설환경플랜트공학, 도시시스템공학), 건축학부, 에너지시스템공학부

창의ICT공과대학 / 소프트웨어대학: 지능형반도체공학과(신설), AI학과, 소프트웨어학부, 융합공학부, 전자전기공학부

생명공학대학: 생명자원공학부(동물생명공학, 식물생명공학), 식품공학부(식품공학, 식품영양), 시스템생명공학과

의약 및 간호: 의학부, 약학부, 간호학과

예술대학 / 예술공학대학: 공연영상창작학부, 디자인학부, 예술공학부

【중앙대의 핵심 입시 특징 - 두 가지 트랙(Two-Track) 시스템】

중앙대학교 학생부종합전형의 가장 큰 특징은 선발하는 인재상에 따라 **'CAU융합형인재'**와 **'CAU탐구형인재'** 2가지 트랙으로 나누어 선발하며, 
각 전형별로 평가 요소의 반영 비율이 다르다는 점입니다.
👤 지원자는 본인의 학교생활기록부 강점에 맞춰 두 전형 중 하나를 전략적으로 선택해야 합니다.

【전형별 인재상 및 평가 방식의 차이】

🔵 CAU융합형인재 (학업 + 균형 성장 중심)
인재상: 학교생활에서 학업과 교내 다양한 활동을 통하여 '균형적으로 성장'한 학생
핵심 특징:
• 전 교과의 학업성취도가 고르게 우수함
• 특정 전공에만 매몰되지 않은 넓은 시야 보유
• 진로가 도중에 변경되었더라도 다양한 활동을 통해 관심사를 넓히고 진로를 주도적으로 탐색한 과정 자체를 매우 긍정적으로 평가
• 학교생활의 성실성과 여러 활동 분야에서의 골고루 발전된 역량

평가 방식:
• 원칙: 서류 100%
• 의학부 별도: 2026학년도부터 서류 70% + 면접 30% (단계별 전형)

🔴 CAU탐구형인재 (전공 심화 탐구 중심)
인재상: 고교 교육과정을 바탕으로 해당 전공(계열) 분야에서 '깊이 있는 탐구 역량'을 보인 학생
핵심 특징:
• 지원 전공(계열)과 관련된 교과 이수 현황과 성취도가 우수함
• 단순 외부 경력이 아닌, 교과 수업이나 동아리 등에서 스스로 질문을 던지고 지식을 심화 확장한 뚜렷한 탐구 경험
• 장기간에 걸친 지속적인 탐구 활동의 흔적
• 세부능력 및 특기사항에서 깊이 있는 사고의 발전 과정이 명확히 드러남

평가 방식:
• 1단계: 서류 100% (합격선 상위 배수 진출)
• 2단계: 서류 70% + 면접 30% (선발)
• 면접: 서류를 기반으로 탐구 활동의 개념 이해도, 논리적 사고력, 문제해결 능력을 검증하는 **심층 면접**

【서류평가 3대 요소 및 평가 기준 (공통)】

📊 2024학년도부터 개편된 평가 요소로 학업역량, 진로역량, 공동체역량 총 3가지로 정성평가 수행

✓ 학업역량 (Academic Competence)
평가 주안점: 대학교육을 충실히 이수하는 데 필요한 수학 능력 평가
• 단순 교과 등급 수치보다 **원점수, 성취도 분포 비율, 이수 인원, 과목의 위계** 등을 복합적으로 고려
• 교과 성취도 수준뿐만 아니라 탐구심과 지적 호기심 파악
• 기초 교과(국수영과사)의 안정적 이수 현황
• 학년별 성적 추이와 학습 노력의 일관성

✓ 진로역량 (Career Competence)
평가 주안점: 자신의 진로와 전공(계열)에 대한 탐색 노력과 준비 정도 평가
• 전공(계열) 관련 교과 이수 노력과 성취도를 중요하게 살핌
• 진로탐색 과정 (일관된 흐름 vs 변화하는 과정)의 자연스러움과 의도성
• 학생부, 세부능력 및 특기사항에 드러난 전공(계열)에 대한 이해도와 호기심
• **CAU탐구형**: 심화 탐구의 깊이와 진정성 / **CAU융합형**: 다양한 경험을 통한 진로 확장의 광폭

✓ 공동체역량 (Community Competence)
평가 주안점: 공동체 일원으로서 협업, 소통, 리더십, 규칙 준수 등의 태도와 실천 경험
• 동아리, 봉사, 조별 과제 등에서의 구체적인 협력 경험
• 직책 유무보다는 집단 내에서의 실질적인 기여 정도
• 학교 규칙 준수와 성실성 (결석, 지각, 조퇴 기록 점검)
• 리더십이 필요한 상황에서 보여준 책임감과 문제해결 능력

【학과(계열)별 권장 교과 이수 기준】

⭐ 자연계열, 공학계열, 의약 계열 (반드시 확인해야 할 권장 과목)

[수학 / 컴퓨터 / AI 계열] (수학과, 소프트웨어학부, AI학과 등)
핵심: 수학Ⅰ·Ⅱ, 미적분 (필수)
권장: 확률과 통계, 기하, 정보, 프로그래밍

[물리학과]
핵심: 수학Ⅰ·Ⅱ, 미적분, 물리학Ⅰ·Ⅱ (필수)
권장: 기하, 화학Ⅰ

[화학 / 신소재 / 화학공학 / 에너지 계열]
핵심: 수학Ⅰ·Ⅱ, 미적분, 화학Ⅰ·Ⅱ 필수 (화공은 물리학Ⅰ도 포함)
권장: 확률과 통계, 기하, 물리학Ⅱ

[생명과학 / 시스템생명 / 식품 / 동물생명 계열]
핵심: 수학Ⅰ·Ⅱ, 화학Ⅰ, 생명과학Ⅰ·Ⅱ (필수)
권장: 미적분, 확률과 통계, 화학Ⅱ

[의학부 / 약학부]
핵심: 수학Ⅰ·Ⅱ, 미적분, 화학Ⅰ, 생명과학Ⅰ·Ⅱ 필수 (약학부는 화학Ⅱ도 포함)
권장: 확률과 통계, 물리학Ⅰ 등 수리·과학 심화 이수 역량 **극대화 필수**

[간호학과]
핵심: 수학Ⅰ·Ⅱ, 확률과 통계, 생명과학Ⅰ·Ⅱ (필수)
권장: 미적분, 화학Ⅰ·Ⅱ

💡 자연계열 주의사항:
• 권장되는 교과를 모두 이수하지 못했더라도 불이익은 없음
• 주어진 환경 내에서 공통/일반선택과목을 충실히 이수하고 심화 탐구를 진행한 **과정을 어필**하는 것이 핵심
• **세부능력 및 특기사항**에서 심화 학습의 깊이와 성취도가 명확히 드러나야 함

[인문 / 사회과학 / 경영경제 계열] (특정 필수 이수 과목은 없으나 학과 특성에 맞는 탐구 강조)

인문 / 어문 / 철학 / 사학:
• 심화 국어, 영어권 문화, 고전 읽기, 여행지리 등의 다양한 과목 이수
• 전공 언어나 고전에 대한 인문학적 탐구 깊이 평가
• 사료 해석, 문헌 분석 등의 학업적 성숙도

상경 / 사회과학 (응용통계, 경영, 산업보안학과 등):
• 수학 역량이 매우 중요함
• 실용수학, 경제수학뿐만 아니라 **확률과 통계, 미적분** 등의 수리 과목 이수
• 정보, 프로그래밍 교과를 이수하며 **데이터 분석 역량** 입증
• 사회과학적 사례 분석과 통계적 논리력 드러내기

【CAU탐구형 면접 시 주의사항】

⚠️ 블라인드 면접 요구사항:
• 이름, 수험번호, 출신 고교명 언급 금지
• 부모 직업, 지역, 경제 상황 등 개인 신상 정보 언급 금지
• 면접 중 시험이 되면 즉시 감점됨

📋 면접 준비 포인트:
• 서류의 세부능력 및 특기사항에 기록된 구체적인 탐구 활동의 개념 이해
• 탐구 활동에서 직면한 어려움과 극복 과정 설명 능력
• 해당 분야의 심화 지식을 바탕으로 한 논리적 사고 검증
• 새로운 문제 상황에 대한 창의적인 문제해결 접근

【평가 시 주의사항 및 합격 포인트】

✓ CAU융합형인재 합격 전략:
1. 전 교과 고르게 우수한 성적 유지 (3.0 이상 권장)
2. 다양한 분야의 교내 활동 경험 기록
3. 진로 변화 과정의 자연스러운 흐름과 이유 명시
4. 학교생활 성실성 (결석, 지각 최소화)

✓ CAU탐구형인재 합격 전략:
1. 지원 전공 권장 과목의 충실한 이수와 우수 성적
2. 세부능력 및 특기사항의 깊이 있는 탐구 과정 기록
3. 교과 기반 심화 탐구 활동의 장기적 흐름 (1학년 기초 → 2,3학년 심화)
4. 면접 대비: 서류의 탐구 활동에 대한 개념 이해와 확장 능력

⚠️ 모든 전형 공통 주의사항:
• 학교폭력 조치사항: **호수별로 차등 감점** 또는 **부적격(불합격) 처리** (2026학년도부터 수시/정시 전체 적용)
• 무단 결석, 지각, 조퇴 등 성실성 관련 기록은 공동체역량에서 감점
• 세부능력 및 특기사항: 단순 활동 나열보다 **사고 과정과 배움의 깊이** 최우선
`,
      competencies: {
        academic: "학업역량 - 원점수·성취도·이수인원·과목위계 등을 복합적으로 고려한 질적 평가. 탐구심과 지적 호기심, 기초교과 안정성, 학년별 성적 추이",
        career: "진로역량 ★ 트랙별로 다름 - 융합형: 다양한 경험을 통한 진로 확장의 광범위 / 탐구형: 깊이 있는 심화 탐구, 전공 교과 이수 충실도와 세부능력의 질적 우수성 최우선",
        community: "공동체역량 - 실질적 협력과 기여, 직책 유무보다 책임감과 문제해결 능력, 학교 규칙 준수와 성실성 (결석/지각 기록), 리더십 경험"
      },
      weights: { academic: 0.33, career: 0.44, community: 0.23 }
    },
    "한국교원대학교": {
      factors: `
■ 한국교원대학교 2026학년도 학생부종합전형 서류평가 주안점
1. 전공적합성: 지원 학과 관련 교과의 성취 수준, 학업 발전 정도, 전공에 대한 이해도와 흥미, 자발적 탐구 및 경험.
2. 교직 적합성 및 잠재력: 교직에 대한 적극적인 관심, 교원양성을 위한 노력(봉사, 멘토링 등), 리더십 및 주도성.
3. 교직 인성: 나눔과 배려의 실천 의지, 공감 능력, 효과적인 의사소통 능력.
4. 학업역량: 전체 교과의 성취 수준 및 발전 정도, 자기주도적 학습 태도 및 의지.

※ 제3대학(자연/공학/컴퓨터) 지원 시 유의사항:
- 수능 가산점 기준을 고려할 때, 수능 미적분/기하 및 지원 전공과 일치하는 과학탐구 과목의 이수와 탐구 역량을 매우 중요하게 평가함.
- 수학 및 과학 심화 과목의 충실한 이수 여부를 학업역량과 전공적합성 평가에 적극 반영함.
`,
      weights: { academic: 0.3, career: 0.4, community: 0.3 },
      competencies: {
        academic: "학업역량: 교과 성취도, 발전 정도, 자기주도적 학습 태도",
        career: "전공 및 교직적합성: 학과 관련 교과 역량, 교직 관심도, 봉사 및 멘토링 경험",
        community: "교직 인성: 나눔과 배려, 공감 및 의사소통 능력"
      }
    }
  };

  async function fetchWithRetry(url, options, maxRetries = 3) {
    let retries = 0;
    const timeout = options.timeout || 60000; // 60초 기본 타임아웃
    while (true) {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        if (response.ok) return response;

        // 503(서버 과부하) 또는 429(할당량 초과)는 재시도 대상
        if ((response.status === 503 || response.status === 429) && retries < maxRetries) {
          retries++;
          const waitTime = Math.pow(2, retries) * 1000 + Math.random() * 1000;
          console.warn(`API ${response.status} Error. Retrying (${retries}/${maxRetries}) in ${Math.round(waitTime)}ms...`);
          await new Promise(r => setTimeout(r, waitTime));
          continue;
        }
        return response;
      } catch (e) {
        clearTimeout(id);
        if (retries < maxRetries) {
          retries++;
          const waitTime = Math.pow(2, retries) * 1000 + Math.random() * 1000;
          console.warn(`Network/Timeout Error (${e.name}). Retrying (${retries}/${maxRetries}) in ${Math.round(waitTime)}ms...`);
          await new Promise(r => setTimeout(r, waitTime));
          continue;
        }
        throw e;
      }
    }
  }
  async function generateAIReportPF(data, apiKey) {
    const modelsToTry = ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"];
    const attemptLogs = [];
    const uniCriteria = universityEvalCriteria[data.university] || { factors: "" };
    const prompt = `당신은 대한민국 대학 입시 분석 전문가이자 매우 엄격하고 비판적인 시각을 가진 입학사정관입니다.
다음 학생의 수시 지원 결과(합격 또는 불합격)를 '2015 개정 교육과정 핵심역량 기반 학생부종합전형 평가지표' 및 해당 대학의 구체적인 '평가 주안점'에 비추어 그 원인을 매우 냉철하고 엄격하게 분석하여 리포트를 작성하세요.

[강조 및 감점 지침]
1. 가장 중요한 원칙(할루시네이션 방지): 제공된 데이터(지원 정보, 학생부 요약 등)에 철저히 기반하여 분석하십시오. 학생부에 명시적으로 기재되지 않은 내용(예: 임의의 봉사활동, 특정 동아리 명칭, 구체적인 독서명, 진행하지 않은 프로젝트 등)을 상상하거나 지어내는 행위를 절대 금지합니다. 오직 제공된 텍스트 내에서만 분석 근거를 추출하십시오.
2. 분석 및 리포트 작성 시 학생의 실명이나 특정 가능한 정보를 노출하지 마십시오 (대신 '학생', '지원자', '본 학생부' 등으로 지칭).
3. 근거 없는 낙관론이나 단순한 칭찬은 배제하고, 철저히 객관적 데이터(성적, 이수과목, 활동 기록 부분)에 기반하여 분석하십시오.
4. 대학별 평가 기준에서 제시하는 '핵심 권장과목' 및 '권장과목'의 이수 여부와 성취도를 가장 우선적으로 체크하십시오. 과목 선택의 위계가 맞지 않거나 필수 과목이 누락되었다면 강력하게 비판하십시오.
5. 불합격의 경우, 생기부의 어떤 부분(교과 성적의 구멍, 활동의 깊이 부족, 2015 개정 교육과정 핵심역량 증빙 실패 등)이 결정적인 결격 사유가 되었는지 실제 데이터에 기반하여 날카롭게 지적하십시오.
6. 합격의 경우에도 운이 좋았다는 표현보다는, 대학이 높게 평가했을 '압도적인 강점(탐구력, 전공관련 교과 성취도 등)'을 실제 제출된 텍스트 내용 안에서 근거를 찾아 분석하십시오.

[학생 지원 정보]
대학: ${data.university}
학과: ${data.dept}
전형: ${data.type}
결과: ${data.result}

[학생부 기록 요약]
전교과 성적(일반등급): ${data.generalGrade}
성적/ 이수과목 상세: ${data.grades}
교과 세특: ${data.subject}
창체/진로 활동: ${data.career}
기타 (행특/음미체): ${data.arts}
특이사항(불합격사유 등): ${data.failReason || "없음"}

[해당 대학/학과 평가 기준 및 주안점]
${uniCriteria.factors}

[리포트 작성 항목]
1. [냉철한 원인 분석] 통계적 데이터(등급)와 2015 개정 교육과정 평가지표를 종합하여, ${data.result === '합격' ? '합격' : '불합격'}의 핵심적인 원인을 3가지 이상의 구체적인 논거로 제시하십시오.
2. [대학 평가 요소별 매칭] 해당 대학의 평가 요소(학업역량, 진로역량, 공동체역량)별로 2015 개정 교육과정 가이드북의 세부 지표(탐구력, 성취도 추이, 협업능력 등)를 기준으로 학생의 기록이 어떻게 부합하거나 미달했는지 엄격하게 대조 분석하십시오.
3. [냉정한 사후 대안] ${data.result === '합격' ? '대학 입학 후 학업 시 유의점 및 성공 요인 유지 방안' : '만약 시간을 되돌린다면, 생기부의 어떤 부분을 어떻게 보완했어야 합격 가능했을지'}에 대해 구체적인 로드맵을 제안하십시오.

형식: 마크다운(Markdown) 형식을 사용하며, 가독성을 극대화하여 전문적인 보고서 형태로 작성하십시오. 전체 평가 보고서의 분량을 기존보다 2~3배 이상 대폭 늘려 최소 3000자 이상의 매우 상세하고 긴 리포트로 서술해야 합니다.`;

    for (const model of modelsToTry) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      try {
        console.log(`Attempting AI Analysis with ${model}...`);
        const response = await fetchWithRetry(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 32768 } }),
          timeout: 40000 // 모델당 40초 타임아웃
        });

        if (response.ok) {
          const res = await response.json();
          return res.candidates?.[0]?.content?.parts?.[0]?.text || "AI 응답 오류 (Empty Content)";
        } else {
          const errData = await response.json().catch(() => ({}));
          const status = response.status;
          const msg = errData.error?.message || response.statusText;
          console.error(`${model} Failed:`, status, msg);
          attemptLogs.push(`${model}: Error ${status} (${msg})`);
          if (status === 401 || status === 403) break; // 키 오류면 중단
        }
      } catch (e) {
        console.error(`${model} Exception:`, e.message);
        attemptLogs.push(`${model}: Exception (${e.message})`);
      }
    }

    throw new Error(`모든 AI 모델 요청에 실패했습니다.\n- 시도 이력:\n${attemptLogs.join('\n')}\n\nAPI 키 유효성이나 할당량(Quota), 네트워크 상태를 확인해 주세요.`);
  }

  async function generateAIReport(data) {
    const modelsToTry = ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"];
    const attemptLogs = [];
    const uniCriteria = universityEvalCriteria[data.university];
    const weights = uniCriteria?.weights || { academic: 0.33, career: 0.33, community: 0.34 };
    const competencyNames = uniCriteria ? uniCriteria.competencies : { academic: "\ud559\uc5c5\uc5ed\ub7c9", career: "\uc9c4\ub85c\uc5ed\ub7c9", community: "\uacf5\ub3d9\uccb4\uc5ed\ub7c9" };

    let profileInfo = "";
    if (data.name || data.grade) {
      profileInfo = (data.grade ? data.grade + "\ud559\ub144 " : "") + (data.class ? data.class + "\ubc18 " : "") + (data.number ? data.number + "\ubc88 " : "") + (data.name || "\ud559\uc0dd");
    }

    const promptText = `당신은 대한민국 대학 입시설계 전문가이자 매우 까다롭고 엄격한 입학사정관 AI입니다.
다음 학생의 학교생활기록부 데이터를 '2015 개정 교육과정 핵심역량 기반 학생부종합전형 평가지표'에 따라 종합 분석하여 지원 대학 및 학과의 합격 가능성 리포트를 JSON으로 작성하세요.

[엄격한 평가 및 감점 지침]
0. 최우선 원칙(할루시네이션 절대 금지): 학생의 '세부능력 및 활동기록'에 명시적으로 존재하지 않는 활동, 독서, 프로젝트, 수상 실적, 봉사 활동 등을 절대 지어내거나 추론하여 덧붙이지 마십시오. 반드시 제공된 [세부능력 및 활동기록] 텍스트 내에서만 근거를 찾으십시오.
1. 모든 평가는 해당 대학/학과의 구체적인 '평가 주안점'과 '핵심/권장 이수과목' 가이드를 최우선 기준으로 삼습니다.
2. 성적 등급뿐만 아니라 원점수, 표준편차, 수강자 수, 그리고 특히 '전공 및 계열 관련 과목의 성취도'를 매우 엄격하게 평가하십시오.
3. 세부능력 및 특기사항에서 단순한 활동의 나열이 아닌, '자기주도적 탐구 역량'과 '지적 호기심의 깊이'를 날카롭게 파헤쳐 평가하십시오. 기록상 명백한 근거가 부족하면 과감히 최하점을 부여하십시오.
4. 공동체 역량 분석 시에도 단순히 착하다는 평가가 아닌, 직접 제공된 구체적인 협력 사례와 리더십, 성실성(출결 등)을 바탕으로 냉정하게 배점을 부여하십시오. 출결상 미비점이 있다면 강력하게 감점하십시오.
5. 점수(score) 부여 시 90점 이상은 대한민국 최상위권 수준의 압도적 성취(전국구 수준의 탁월성)가 제공된 텍스트에서 명백히 확인될 때만 부여하며, 보통 수준은 70~80점, 조금이라도 부족함이 보이거나 평범한 기록일 경우 과감히 60점 이하를 점수화하십시오. 칭찬보다는 보완점을 중심으로 매섭게 평가하십시오.

[2015 개정 교육과정 핵심 평가지표 적용]
- 학업역량: 학업성취도(추이), 학업태도(자기주도성), 탐구력(지식 융합 및 문제해결)
- 진로역량: 전공 관련 교과 이수 노력(위계 준수), 전공 관련 교과 성취도, 진로 탐색 활동의 진정성
- 공동체역량: 협업과 소통능력, 나눔과 배려, 성실성과 규칙준수(출결), 리더십

[학생 정보]
목표 대학: ${data.university}
지원 학과: ${data.major}
학생: ${profileInfo}
이수 과목: ${data.courses}
교과 평균 등급: ${data.averageGrade}
성취도 전용(P 미포함) 과목: ${data.achievementOnly}

[세부능력 및 활동기록]
교과 세특:
${data.subjectRecords}

창체기록(자율/동아리/봉사/진로):
${data.creativeActivities}

행동특성 및 종합의견:
${data.behavioralRecords}

[해당 대학/학과 전형별 평가 기준 및 주안점]
${uniCriteria ? uniCriteria.factors : "일반적인 학생부종합전형 평가 기준을 적용하되, 전공 관련 학업 및 탐구 역량에 집중하십시오."}

[분석 및 배점 지침]
1. ${competencyNames.academic} (반영 비율: ${(weights.academic * 100).toFixed(0)}%): 전반적인 학업 기초 역량과 함께 전공 관련 심화 과목 이수 및 탐구 깊이를 엄격히 평가.
2. ${competencyNames.career} (반영 비율: ${(weights.career * 100).toFixed(0)}%): 전공에 대한 확고한 관심, 권장과목 이수 여부, 활동의 일관성과 전문적 성장을 냉철히 분석.
3. ${competencyNames.community} (반영 비율: ${(weights.community * 100).toFixed(0)}%): 협업, 나눔, 배려, 성실성(특히 출결 및 비주요과목 태도)을 실제 사례 기반으로 평가.

[JSON 응답 전문 포맷 준수]
반드시 지정된 JSON 스키마를 따르며, 특히 'overallEvaluation'은 최소 3000자 이상의 매우 상세하고 날카로운 분석 리포트 형태로 작성하십시오. 보고서의 분량을 기존보다 2~3배 이상 대폭 늘려 아주 길고 구체적으로 서술해야 합니다.
각 항목의 evaluation 및 scoreJustification 필드 역시 단순 나열이 아닌, 제출된 데이터(성적, 세특, 활동 기록)에만 철저히 기반하여 사정관의 매서운 시각과 객관적인 근거를 담아 기술하십시오.
또한, 각 역량별 'evidence' 배열에는 분석의 근거가 된 학생부 기록 내용을 최소 5개에서 7개 이상 구체적으로 추출하십시오. (단, 제공되지 않은 내용은 절대 상상하거나 지어내지 마십시오.)
무엇보다, 각 역량별 'calculationFormula' 필드에는 해당 점수가 어떻게 산출되었는지 (예: 내신 성취도 40% + 탐구 깊이 40% + 전공 관련성 20% 등)를 구체적인 산식 형태로 명시하십시오.

[overallEvaluation 서식 지침 - 반드시 준수]
overallEvaluation 필드는 아래 형식을 반드시 따르십시오:
1. 소제목: ## 기호로 굵은 소제목을 붙여 섹션을 구분하십시오. (예: ## ✅ 종합 강점, ## ⚠️ 핵심 보완과제, ## 🎯 합격 가능성 진단, ## 📌 전략적 제언)
2. 강조 표시: 가장 중요하고 결정적인 핵심 문장이나 단어(합격·불합격 요인, 치명적 약점, 압도적 강점)에는 반드시 ==텍스트== 형식으로 강조 마킹을 하십시오. (예: ==국어 성적이 3등급으로 급격히 하락하여 치명적 약점이 됩니다==)
3. 각 소제목 아래에는 글머리 기호(-)를 사용하여 핵심 내용을 정리하십시오.
4. 최소 4개 이상의 소제목 섹션으로 구성하여 분량을 충분히 채우십시오.`;



    const requestBody = {
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 32768,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            totalScore: { type: "NUMBER" },
            overallEvaluation: { type: "STRING" },
            calculationFormula: { type: "STRING" },
            competencies: {
              type: "OBJECT",
              properties: {
                academic: { type: "OBJECT", properties: { score: { type: "NUMBER" }, evaluation: { type: "STRING" }, scoreJustification: { type: "STRING" }, calculationFormula: { type: "STRING" }, evidence: { type: "ARRAY", items: { type: "STRING" } } }, required: ["score", "evaluation", "scoreJustification", "calculationFormula", "evidence"] },
                career: { type: "OBJECT", properties: { score: { type: "NUMBER" }, evaluation: { type: "STRING" }, scoreJustification: { type: "STRING" }, calculationFormula: { type: "STRING" }, evidence: { type: "ARRAY", items: { type: "STRING" } } }, required: ["score", "evaluation", "scoreJustification", "calculationFormula", "evidence"] },
                community: { type: "OBJECT", properties: { score: { type: "NUMBER" }, evaluation: { type: "STRING" }, scoreJustification: { type: "STRING" }, calculationFormula: { type: "STRING" }, evidence: { type: "ARRAY", items: { type: "STRING" } } }, required: ["score", "evaluation", "scoreJustification", "calculationFormula", "evidence"] }
              },
              required: ["academic", "career", "community"]
            }
          },
          required: ["totalScore", "overallEvaluation", "calculationFormula", "competencies"]
        }
      }
    };

    for (const model of modelsToTry) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${data.apiKey}`;
      try {
        console.log(`Attempting AI Analysis with ${model}...`);
        const response = await fetchWithRetry(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
          timeout: 50000
        });

        if (response.ok) {
          const result = await response.json();
          const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!generatedText) {
            console.warn(`${model} returned empty text.`);
            attemptLogs.push(`${model}: Empty Response`);
            continue;
          }
          return generatedText;
        } else {
          const errData = await response.json().catch(() => ({}));
          const status = response.status;
          const msg = errData.error?.message || response.statusText;
          console.error(`${model} Failed:`, status, msg);
          attemptLogs.push(`${model}: Error ${status} (${msg})`);
          if (status === 401 || status === 403) break;
        }
      } catch (e) {
        console.error(`${model} Exception:`, e.message);
        attemptLogs.push(`${model}: Exception (${e.message})`);
      }
    }

    throw new Error(`모든 AI 모델 요청에 실패했습니다.\n- 시도 이력:\n${attemptLogs.join('\n')}\n\nAPI 키 유효성이나 할당량(Quota), 네트워크 상태를 확인해 주세요.\n(특히 429 에러는 현재 할당량이 모두 소진된 상태입니다.)`);
  }

  function cleanAIJsonResponse(text) {
    let jsonString = text.trim();

    // 1. Markdown Code Block 제거
    if (jsonString.startsWith("```")) {
      const match = jsonString.match(/^```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) jsonString = match[1].trim();
      else jsonString = jsonString.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim();
    }

    // 2. 가장 바깥쪽 { } 찾기 (불필요한 앞뒤 텍스트 제거)
    const startIdx = jsonString.indexOf('{');
    if (startIdx !== -1) {
      jsonString = jsonString.substring(startIdx);
    }
    const endIdx = jsonString.lastIndexOf('}');
    if (endIdx !== -1) {
      jsonString = jsonString.substring(0, endIdx + 1);
    }

    // 3. 잘린 JSON 자동 복구: 괄호/대괄호 균형 맞추기
    try {
      JSON.parse(jsonString);
      return jsonString; // 이미 유효하면 그대로 반환
    } catch (e) {
      // 잘린 경우 복구 시도
      jsonString = repairTruncatedJson(jsonString);
    }

    return jsonString;
  }

  function repairTruncatedJson(jsonString) {
    // 열린 문자열 닫기, 미완성 키-값 쌍 제거, 괄호 균형 맞추기
    const stack = [];
    let inString = false;
    let escape = false;
    let lastValidEnd = 0;
    let repaired = '';

    for (let i = 0; i < jsonString.length; i++) {
      const ch = jsonString[i];

      if (escape) {
        escape = false;
        repaired += ch;
        continue;
      }
      if (ch === '\\' && inString) {
        escape = true;
        repaired += ch;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        repaired += ch;
        if (!inString) lastValidEnd = repaired.length;
        continue;
      }
      if (inString) {
        // 문자열 안의 제어문자 이스케이프
        if (ch === '\n') { repaired += '\\n'; continue; }
        if (ch === '\r') { repaired += '\\r'; continue; }
        if (ch === '\t') { repaired += '\\t'; continue; }
        repaired += ch;
        continue;
      }
      // 구조 추적
      if (ch === '{' || ch === '[') {
        stack.push(ch);
      } else if (ch === '}' || ch === ']') {
        if (stack.length > 0) stack.pop();
        lastValidEnd = repaired.length + 1;
      }
      repaired += ch;
    }

    // 열린 문자열 강제 닫기
    if (inString) {
      repaired += '"';
    }

    // 불완전한 마지막 항목 제거 후 괄호 닫기
    // 마지막 완전한 속성 뒤까지만 사용
    let closing = repaired;
    // 후행 쉼표 제거
    closing = closing.replace(/,\s*$/, '');
    // 미완성 키 제거 (마지막이 "key": 로 끝나는 경우)
    closing = closing.replace(/,?\s*"[^"]*"\s*:\s*$/, '');
    closing = closing.replace(/,\s*$/, '');

    // 남은 열린 괄호 닫기
    const closingStack = [];
    let ins = false;
    let esc = false;
    for (const c of closing) {
      if (esc) { esc = false; continue; }
      if (c === '\\' && ins) { esc = true; continue; }
      if (c === '"') { ins = !ins; continue; }
      if (ins) continue;
      if (c === '{') closingStack.push('}');
      else if (c === '[') closingStack.push(']');
      else if (c === '}' || c === ']') closingStack.pop();
    }
    while (closingStack.length > 0) {
      closing += closingStack.pop();
    }

    return closing;
  }

  // -------------------------------------------------------------------------
  // 대학별 서류평가 기준 패널 렌더링
  // -------------------------------------------------------------------------
  function renderUniCriteria(universityName, targetEl) {
    if (!targetEl) return;
    const criteria = universityEvalCriteria[universityName];
    if (!criteria) {
      targetEl.style.display = "none";
      return;
    }

    const { factors, competencies, weights } = criteria;

    // ── 반영 비율 바 ──
    const wAca = Math.round((weights.academic || 0) * 100);
    const wCar = Math.round((weights.career || 0) * 100);
    const wCom = Math.round((weights.community || 0) * 100);

    // ── factors 텍스트를 HTML로 변환 (색상 하이라이트) ──
    // HTML 태그 내부(style 속성 등)를 건드리지 않고 텍스트 노드에만 정규식 적용
    function applyToText(html, regex, replacer) {
      return html.replace(/(<[^>]+>)|([^<]+)/g, (m, tag, txt) =>
        tag ? tag : (txt ? txt.replace(regex, replacer) : m));
    }

    function factorsToHtml(text) {
      return text.trim().split("\n").map(line => {
        let l = line;

        // 1. [제목 줄] 파란색 헤더
        l = l.replace(/^\[(.+)\]$/, '<span style="color:#7cb9ff;font-weight:700;font-size:0.95rem;">[$1]</span>');

        // 2. ■ / ▲ / ● / ✓ / ⭐ 등 강조 항목
        l = l.replace(/^(■|▲|●|▼|✓|⭐|🔵|🔴|📊|✔)\s(.+)/, (_, sym, rest) =>
          `<span style="color:#f0b429;font-weight:700;">${sym}</span> <span style="font-weight:600;color:#e0e0e0;">${rest}</span>`);

        // 3. 숫자. 항목 (1. 2. 3.)
        l = l.replace(/^(\d+)\.\s(.+)/, (_, n, rest) =>
          `<span style="color:#96d6b0;font-weight:700;">${n}.</span> ${rest}`);

        // 4. 들여쓰기 - 항목
        l = l.replace(/^(\s{3,})(-.+)/, (_, sp, rest) =>
          `${sp}<span style="color:#b0c4de;">${rest}</span>`);

        // 5. % 숫자 파란색 강조 — HTML 태그 내부는 건드리지 않음
        l = applyToText(l, /(\d+)%/g,
          '<span style="color:#61b3ff;font-weight:700;background:rgba(97,179,255,0.15);padding:1px 5px;border-radius:3px;">$1%</span>');

        // 6. 괄호 속 설명 연회색 — HTML 태그 내부는 건드리지 않음
        l = applyToText(l, /\(([^)]+)\)/g,
          '<span style="color:#aaa;">($1)</span>');

        return `<div style="line-height:1.7;min-height:1.2em;">${l}</div>`;
      }).join("");
    }

    // ── 역량 배지 ──
    const badgeStyle = (color, bg) =>
      `display:inline-block;padding:2px 10px;border-radius:12px;font-size:0.82rem;font-weight:700;color:${color};background:${bg};margin-right:4px;margin-bottom:4px;`;

    const compRows = [
      {
        label: "학업역량", pct: wAca, desc: competencies.academic,
        badge: badgeStyle("#fff", "rgba(97,179,255,0.35)"), icon: "📚"
      },
      {
        label: "진로역량", pct: wCar, desc: competencies.career,
        badge: badgeStyle("#fff", "rgba(150,214,176,0.35)"), icon: "🎯"
      },
      {
        label: "공동체역량", pct: wCom, desc: competencies.community,
        badge: badgeStyle("#fff", "rgba(240,180,41,0.30)"), icon: "🤝"
      },
    ];

    const compHtml = compRows.map(r => `
      <div style="margin-bottom:0.8rem;padding:0.6rem 1rem;background:rgba(255,255,255,0.04);border-radius:8px;border-left:3px solid rgba(255,255,255,0.15);">
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.3rem;flex-wrap:wrap;">
          <span style="${r.badge}">${r.icon} ${r.label}</span>
          <span style="color:#61b3ff;font-weight:800;font-size:1rem;">${r.pct}%</span>
          <div style="flex:1;min-width:80px;height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;">
            <div style="width:${r.pct}%;height:100%;background:linear-gradient(90deg,#61b3ff,#96d6b0);border-radius:3px;"></div>
          </div>
        </div>
        <div style="font-size:0.82rem;color:#b0c4de;line-height:1.5;">${r.desc}</div>
      </div>`).join("");

    targetEl.innerHTML = `
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
            ${universityName} 서류평가 기준 &amp; 반영 비율
          </h4>
        </div>

        <!-- 역량별 반영비율 -->
        <div style="margin-bottom:1rem;">
          ${compHtml}
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
            ${factorsToHtml(factors)}
          </div>
        </details>
      </div>`;
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
    doc.write(`
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
            font-size: 14px;
            color: #111;
            line-height: 1.7;
          }
          .markdown-body { 
            background: white !important; 
            font-size: 14px !important; 
            color: #111;
            box-sizing: border-box;
          }
          .markdown-body h1 { font-size: 1.5em; }
          .markdown-body h2 { font-size: 1.3em; }
          .markdown-body h3 { font-size: 1.15em; }
          .markdown-body h4 { font-size: 1.0em; }
          .markdown-body p { margin: 0.5em 0; white-space: pre-wrap; word-break: keep-all; }
          .eval-highlight { background: rgba(255, 220, 0, 0.35); color: #7a5800; padding: 1px 4px; border-radius: 3px; font-weight: 600; }
          .print-header { border-bottom: 2px solid #5e6ad2; padding-bottom: 1rem; margin-bottom: 2rem; }
          .blur-name { filter: blur(4px); }
          .total-score-box { background: #5e6ad2 !important; color: white !important; padding: 1.5rem; border-radius: 12px; margin-bottom: 2rem; }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `);
    doc.close();

    const checkLoaded = setInterval(() => {
      if (doc.readyState === 'complete') {
        clearInterval(checkLoaded);
        setTimeout(() => {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          setTimeout(() => document.body.removeChild(iframe), 1000);
        }, 500);
      }
    }, 100);
  }

  function getPrintHTML(data) {
    const uniElement = document.getElementById("university");
    const uni = uniElement ? uniElement.value : "-";
    const majorElement = document.getElementById("major");
    const major = majorElement ? majorElement.value : "-";
    const name = document.getElementById("student-name")?.value || "\ud559\uc0dd";
    const grade = document.getElementById("student-grade")?.value || "-";
    const classNum = document.getElementById("student-class")?.value || "-";
    const num = document.getElementById("student-number")?.value || "-";

    let html = `
      <div class="print-header">
        <h1 style="font-size: 2.2rem; margin-bottom: 0.5rem; color: #000; text-align:center;">부안고등학교 학생부 Ai 분석 리포트</h1>
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 2rem;">
          <div>
            <p style="font-size: 1.1rem; font-weight: 600; color: #333;">지원 대학: ${uni} | 지원 학과: ${major}</p>
            <p style="color: #666;">학생 정보: ${grade}학년 ${classNum}반 ${num}번 <span class="blur-name">${name}</span></p>
          </div>
          <p style="color: #888; font-size: 0.85rem;">분석 일시: ${new Date().toLocaleString()}</p>
        </div>
      </div>

      <div class="total-score-box" style="background: #5e6ad2; color: #fff; padding: 1.5rem; border-radius: 12px; margin: 1.5rem 0; display: flex; align-items: center; gap: 2rem;">
        <div style="flex: 1;">
          <span style="font-size: 1rem; opacity: 0.9;">종합 평가 점수</span>
          <div style="display: flex; align-items: baseline; gap: 0.5rem;">
            <span style="font-size: 3.5rem; font-weight: 800;">${data.totalScore}</span>
            <span style="font-size: 1.4rem; opacity: 0.8;">/ 100</span>
          </div>
        </div>
        <div style="width: 1px; height: 60px; background: rgba(255,255,255,0.3);"></div>
        <div style="flex: 2;">
          <p style="font-size: 1rem; opacity: 0.9; line-height: 1.5; font-weight: 600;">${data.calculationFormula || ""}</p>
        </div>
      </div>

      <div class="uni-criteria-section" style="margin-bottom: 2.5rem; background: #fff; padding: 1.5rem; border-radius: 12px; border: 1px solid #eee; page-break-inside: avoid;">
        <h3 style="font-size: 1.4rem; color: #333; margin-bottom: 1.2rem; border-left: 6px solid #5e6ad2; padding-left: 1rem;">대학별 평가 주안점 (분석 기준)</h3>
        <div class="markdown-body" style="font-size: 0.85rem; color: #555; line-height: 1.6;">${marked.parse(universityEvalCriteria[uni]?.factors || "일반적인 학생부종합전형 평가 기준을 적용하여 분석되었습니다.")}</div>
      </div>

      <div class="overall-evaluation" style="margin-bottom: 2.5rem; background: var(--clr-inset-bg); padding: 2rem; border-radius: 12px; border: 1px solid var(--panel-border);">
        <h3 style="font-size: 1.4rem; color: #333; margin-bottom: 1.2rem; border-left: 6px solid #5e6ad2; padding-left: 1rem;">종합 평가 의견</h3>
        <div class="markdown-body" style="color: #111; line-height: 1.8;">${marked.parse((data.overallEvaluation || "").replace(/\n?(?=## )/g, '\n\n').replace(/==([^=]+)==/g, '<span class="eval-highlight">$1</span>'))}</div>
      </div>
    `;

    const competencyMeta = [
      { id: 'academic', title: '학업역량' },
      { id: 'career', title: '진로역량' },
      { id: 'community', title: '공동체역량' }
    ];

    competencyMeta.forEach(comp => {
      const compData = data.competencies?.[comp.id];
      if (compData) {
        const evidenceText = Array.isArray(compData.evidence) ? compData.evidence.map(e => "- " + e).join("\n") : (compData.evidence || "");
        html += `
          <div style="margin-bottom: 3rem; page-break-inside: avoid;">
            <h2 style="font-size: 1.6rem; color: #111; margin-bottom: 1.5rem; border-bottom: 3px solid #5e6ad2; padding-bottom: 0.6rem;">${comp.title} (점수: ${compData.score}점)</h2>
            
            <div style="background: var(--clr-inset-bg); padding: 1rem; border-radius: 8px; font-size: 0.95rem; color: #333; margin-bottom: 1.5rem; border-left: 5px solid #5e6ad2;">
              <strong>[역량 산출식]</strong> ${compData.calculationFormula || "정성 평가 기반 점수 산출"}
            </div>
            
            <div style="margin-bottom: 1.8rem;">
              <h4 style="font-size: 1.15rem; color: #444; margin-bottom: 0.6rem; font-weight: 700;">상세 평가</h4>
              <div class="markdown-body" style="color: #222; line-height: 1.7;">${marked.parse(compData.evaluation || "")}</div>
            </div>

            ${compData.scoreJustification ? `
            <div style="margin-bottom: 1.8rem;">
              <h4 style="font-size: 1.15rem; color: #444; margin-bottom: 0.6rem; font-weight: 700;">점수 산출 근거</h4>
              <div class="markdown-body" style="color: #222; line-height: 1.7;">${marked.parse(compData.scoreJustification)}</div>
            </div>` : ""}

            <div style="margin-bottom: 1.2rem;">
              <h4 style="font-size: 1.15rem; color: #444; margin-bottom: 0.6rem; font-weight: 700;">근거 활동 자료</h4>
              <div class="markdown-body" style="color: #222; line-height: 1.7;">${marked.parse(evidenceText)}</div>
            </div>
          </div>
        `;
      }
    });
    return html;
  }

  function updatePrintArea(data) {
    const printArea = document.getElementById("print-area");
    if (printArea) {
      printArea.innerHTML = getPrintHTML(data);
    }
  }

  window.downloadPDF = function () {
    if (!lastReportData) {
      alert("먼저 AI 분석을 완료해주세요.");
      return;
    }
    const html = getPrintHTML(lastReportData);
    printWithIframe(html);
  };

  async function loadAllData() {
    try {
      await StorageManager.init();

      // 1. Individual Students
      const savedIndividualData = await StorageManager.load("individualStudents") || JSON.parse(localStorage.getItem("individualStudentsData") || "[]");
      if (Array.isArray(savedIndividualData) && savedIndividualData.length > 0) {
        students = savedIndividualData;
        studentSelect.innerHTML = '<option value="">-- 학생 선택 --</option>';
        students.forEach((s) => {
          const opt = document.createElement("option");
          opt.value = s.name;
          opt.dataset.grade = s.grade; opt.dataset.class = s.class; opt.dataset.number = s.number;
          let label = [];
          if (s.grade) label.push(s.grade + "학년");
          if (s.class) label.push(s.class + "반");
          if (s.number) label.push(s.number + "번");
          label.push(s.name);
          opt.textContent = label.join(" ");
          studentSelect.appendChild(opt);
        });
      }

      // 2. Pass/Fail Students
      const savedPfData = await StorageManager.load("pfStudents") || JSON.parse(localStorage.getItem("pfStudentsData") || "[]");
      if (Array.isArray(savedPfData) && savedPfData.length > 0) {
        pfStudents = savedPfData;
        pfStudentSelect.innerHTML = '<option value="" disabled selected>학생을 선택하세요</option>';
        pfStudents.forEach((s, ix) => {
          const opt = document.createElement("option");
          opt.value = ix;
          opt.textContent = `[${s.result}] ${s.name} | ${s.univ} (${s.dept})`;
          pfStudentSelect.appendChild(opt);
        });
      }

      // 3. Raw Excel Data
      globalCourseJson = await StorageManager.load("globalCourseJson");
      globalBatchJsons = await StorageManager.load("globalBatchJsons") || [];
      pfDetails = await StorageManager.load("pfDetails") || { grades: [], subjects: [], creatives: [], behaviors: [] };

      console.log("All data loaded from storage.");

      // 4. Restore last-selected student
      const savedConfig = JSON.parse(localStorage.getItem("appConfigState") || "{}");
      const lastStudent = savedConfig.selectedStudent;
      if (lastStudent && studentSelect) {
        const matchingOpt = Array.from(studentSelect.options).find(o => o.value === lastStudent);
        if (matchingOpt) {
          studentSelect.value = lastStudent;
          if (gradeInput) gradeInput.value = matchingOpt.dataset.grade || "";
          if (classInput) classInput.value = matchingOpt.dataset.class || "";
          if (numberInput) numberInput.value = matchingOpt.dataset.number || "";
          if (nameInput) nameInput.value = lastStudent;
          if (globalCourseJson) extractCourseData(globalCourseJson, lastStudent, true);
          if (globalBatchJsons.length > 0) extractBatchData(globalBatchJsons, lastStudent);
          console.log("[loadAllData] Restored last selected student:", lastStudent);
        }
      }

      // 5. Mock Exam Data
      const savedMockData = await StorageManager.load("mockDataByMonth");
      if (savedMockData) {
        Object.assign(mockDataByMonth, savedMockData);
        if (getDataForCurrentMonth().length > 0) showMockResults();
      }
    } catch (e) {
      console.error("Error loading persisted data:", e);
    }
  }

  function saveState() {
    const config = {
      apiKey: apiKeyInput ? apiKeyInput.value.trim() : "",
      pfApiKey: (document.getElementById("pf-api-key") || { value: "" }).value.trim(),
      university: universitySelect ? universitySelect.value : "",
      category: categorySelect ? categorySelect.value : "",
      major: majorSelect ? majorSelect.value : "",
      selectedStudent: studentSelect ? studentSelect.value : ""
    };
    localStorage.setItem("appConfigState", JSON.stringify(config));
  }

  function loadState() {
    const saved = localStorage.getItem("appConfigState");
    if (!saved) return;
    try {
      const config = JSON.parse(saved);
      if (config.apiKey && apiKeyInput) apiKeyInput.value = config.apiKey;
      const pfKey = document.getElementById("pf-api-key");
      if (config.pfApiKey && pfKey) pfKey.value = config.pfApiKey;
      if (config.university && universitySelect) {
        universitySelect.value = config.university;
        universitySelect.dispatchEvent(new Event("change"));
        setTimeout(() => {
          if (config.category && categorySelect) {
            categorySelect.value = config.category;
            categorySelect.dispatchEvent(new Event("change"));
            setTimeout(() => {
              if (config.major && majorSelect) majorSelect.value = config.major;
            }, 100);
          }
        }, 100);
      }
    } catch (e) {
      console.error("Error loading config state:", e);
    }
  }

  if (resetDataBtn) {
    resetDataBtn.addEventListener("click", async () => {
      if (confirm("모든 데이터를 초기화하시겠습니까?\n저장된 학생 정보, 설정, 업로드된 파일이 모두 삭제됩니다.")) {
        localStorage.clear();
        await StorageManager.clear();
        await clearAllFilesFromDB();
        location.reload();
      }
    });
  }

  // Add listeners for auto-save
  [apiKeyInput, universitySelect, categorySelect, majorSelect].forEach(el => {
    if (el) el.addEventListener("change", saveState);
  });
  const pfApiKeyInput2 = document.getElementById("pf-api-key");
  if (pfApiKeyInput2) pfApiKeyInput2.addEventListener("change", saveState);

  (async () => {
    await loadAllData();
    loadState();
  })();

  // =========================================================
  // 세특 분석 탭 — 계층적 과목 선택 드롭다운 (교육과정 > 계열 > 선택 > 과목)
  // =========================================================
  const stUniversitySelect = document.getElementById("st-university");
  const stCategorySelect = document.getElementById("st-category");
  const stMajorSelect = document.getElementById("st-major");

  const stCurriculumSelect = document.getElementById("st-curriculum");
  const stSubCategorySelect = document.getElementById("st-subject-category");
  const stSelectionSelect = document.getElementById("st-selection");
  const stSubjectSelect = document.getElementById("st-subject-name");

  const subjectHierarchy = {
    "2015 개정": {
      "사회과": {
        "공통 과목": ["통합사회", "한국사"],
        "진로 선택": ["사회문제 탐구", "여행지리", "고전과 윤리"],
        "일반 선택": ["사회문화", "정치와법", "경제", "세계지리", "한국지리", "생활과 윤리", "윤리와 사상", "세계사", "동아시아사"]
      },
      "수학과": {
        "공통 과목": ["수학"],
        "진로 선택": ["기하", "실용 수학", "경제 수학", "수학과제 탐구", "기본 수학", "[전공별 권장이수과목 참고자료] ${rawRecommendedSubjects.substring(0, 150000)}", "수학Ⅱ", "미적분", "확률과 통계"]
      },
      "과학과": {
        "공통 과목": ["통합과학", "과학탐구실험"],
        "진로 선택": ["물리학Ⅱ", "화학Ⅱ", "생명과학Ⅱ", "지구과학Ⅱ", "생활과 과학", "과학사", "융합과학"],
        "일반 선택": ["물리학Ⅰ", "화학Ⅰ", "생명과학Ⅰ", "지구과학Ⅰ"]
      },
      "영어과": {
        "공통 과목": ["영어"],
        "진로 선택": ["실용 영어", "영어권 문화", "영미 문학 읽기", "진로 영어"],
        "일반 선택": ["영어Ⅰ", "영어Ⅱ", "영어 회화", "영어 독해와 작문"]
      },
      "정보 및 제2외국어과": {
        "진로 선택": ["인공지능 기초", "일본어Ⅱ", "중국어Ⅱ", "한문Ⅱ"],
        "일반 선택": ["정보", "일본어Ⅰ", "중국어Ⅰ", "한문Ⅰ"]
      },
      "예체능과": {
        "진로 선택": ["스포츠 생활", "체육탐구", "음악 연주", "음악 감상과 비평", "미술 창작", "미술 감상과 비평"],
        "일반 선택": ["체육", "운동과 건강", "음악", "미술"]
      },
      "교양과": {
        "일반 선택": ["철학", "논리학", "심리학", "교육학", "종교학", "진로와 직업", "보건", "환경", "실용경제", "논술"]
      },
      "국어과": {
        "공통 과목": ["국어"],
        "진로 선택": ["실용 국어", "심화 국어", "고전 읽기"],
        "일반 선택": ["독서", "문학", "화법과 작문", "언어와 매체"]
      }
    },
    "2022 개정": {
      "사회과": {
        "융합 선택": ["여행지리", "역사로 탐구하는 현대 세계", "사회문제 탐구", "금융과 경제생활", "윤리문제 탐구", "기후변화와 지속가능한 세계"],
        "공통 과목": ["한국사1", "한국사2", "통합사회1", "통합사회2"],
        "진로 선택": ["한국지리 탐구", "도시의 미래 탐구", "동아시아 역사 기행", "정치", "법과 사회", "경제", "윤리와 사상", "인문학과 윤리", "국제 관계의 이해"],
        "일반 선택": ["세계시민과 지리", "세계사", "사회와 문화", "현대사회와 윤리"]
      },
      "수학과": {
        "융합 선택": ["수학과 문화", "실용 통계", "수학과제 탐구"],
        "공통 과목": ["공통수학1", "공통수학2", "기본수학1", "기본수학2"],
        "진로 선택": ["기하", "미적분Ⅱ", "경제 수학", "인공지능 수학", "직무 수학"],
        "일반 선택": ["대수", "미적분Ⅰ", "확률과 통계"]
      },
      "과학과": {
        "공통 과목": ["통합과학1", "통합과학2", "과학탐구실험1", "과학탐구실험2"],
        "진로 선택": ["역학과 에너지", "전자기와 양자", "물질과 에너지", "화학 반응의 세계", "세포와 물질대사", "생물의 유전", "지구시스템과학", "행성우주과학"],
        "일반 선택": ["물리학", "화학", "생명과학", "지구과학"]
      },
      "영어과": {
        "융합 선택": ["실생활 영어 회화", "미디어 영어", "세계 문화와 영어"],
        "공통 과목": ["공통영어1", "공통영어2", "기본영어1", "기본영어2"],
        "진로 선택": ["영미 문학 읽기", "영어 발표와 토론", "심화 영어", "심화 영어 독해와 작문", "직무 영어"],
        "일반 선택": ["영어Ⅰ", "영어Ⅱ", "영어 독해와 작문"]
      },
      "정보 및 제2외국어과": {
        "융합 선택": ["소프트웨어와 생활", "일본 문화", "중국 문화", "언어생활과 한자"],
        "진로 선택": ["인공지능 기초", "데이터 과학", "일본어 회화", "중국어 회화", "심화 일본어", "심화 중국어", "한문 고전 읽기"],
        "일반 선택": ["정보", "일본어", "중국어", "한문"]
      },
      "예체능과": {
        "융합 선택": ["스포츠 생활1", "음악과 미디어", "미술과 매체"],
        "진로 선택": ["운동과 건강", "스포츠 문화", "스포츠 과학", "음악 연주와 창작", "음악 감상과 비평", "미술 창작", "미술 감상과 비평"],
        "일반 선택": ["체육1", "체육2", "음악", "미술"]
      },
      "교양과": {
        "융합 선택": ["인간과 경제활동", "논술"],
        "진로 선택": ["인간과 철학", "논리와 사고", "인간과 심리", "교육의 이해", "삶과 종교", "보건"],
        "일반 선택": ["진로와 직업", "생태와 환경"]
      },
      "국어과": {
        "융합 선택": ["독서 토론과 글쓰기", "매체 의사소통", "언어생활 탐구"],
        "공통 과목": ["공통국어1", "공통국어2"],
        "진로 선택": ["주제 탐구 독서", "문학과 영상", "직무 의사소통"],
        "일반 선택": ["화법과 언어", "독서와 작문", "문학"]
      }
    }
  };

  if (stCurriculumSelect) {
    // 1. 교육과정 초기화
    Object.keys(subjectHierarchy).forEach(cur => {
      const opt = document.createElement("option");
      opt.value = cur; opt.textContent = cur;
      stCurriculumSelect.appendChild(opt);
    });

    // 2. 교육과정 변경 시 계열 업데이트
    stCurriculumSelect.addEventListener("change", () => {
      const cur = stCurriculumSelect.value;
      stSubCategorySelect.innerHTML = "<option value=''>계열 선택</option>";
      stSelectionSelect.innerHTML = "<option value=''>선택 구분 선택</option>";
      stSubjectSelect.innerHTML = "<option value=''>과목 선택</option>";

      if (!cur) return;
      Object.keys(subjectHierarchy[cur]).forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat; opt.textContent = cat;
        stSubCategorySelect.appendChild(opt);
      });
    });

    // 3. 계열 변경 시 선택구분 업데이트
    stSubCategorySelect.addEventListener("change", () => {
      const cur = stCurriculumSelect.value;
      const cat = stSubCategorySelect.value;
      stSelectionSelect.innerHTML = "<option value=''>선택 구분 선택</option>";
      stSubjectSelect.innerHTML = "<option value=''>과목 선택</option>";

      if (!cur || !cat) return;
      Object.keys(subjectHierarchy[cur][cat]).forEach(sel => {
        const opt = document.createElement("option");
        opt.value = sel; opt.textContent = sel;
        stSelectionSelect.appendChild(opt);
      });
    });

    // 4. 선택구분 변경 시 과목 업데이트
    stSelectionSelect.addEventListener("change", () => {
      const cur = stCurriculumSelect.value;
      const cat = stSubCategorySelect.value;
      const sel = stSelectionSelect.value;
      stSubjectSelect.innerHTML = "<option value=''>과목 선택</option>";

      if (!cur || !cat || !sel) return;
      subjectHierarchy[cur][cat][sel].forEach(sub => {
        const opt = document.createElement("option");
        opt.value = sub; opt.textContent = sub;
        stSubjectSelect.appendChild(opt);
      });
    });
  }

  if (stUniversitySelect && universityData) {
    for (const uni of Object.keys(universityData)) {
      const opt = document.createElement("option");
      opt.value = uni; opt.textContent = uni;
      stUniversitySelect.appendChild(opt);
    }

    stUniversitySelect.addEventListener("change", () => {
      const uni = stUniversitySelect.value;
      const ud = universityData[uni];
      stCategorySelect.innerHTML = "<option value='' disabled selected>계열을 선택하세요</option>";
      stMajorSelect.innerHTML = "<option value='' disabled selected>학과를 선택하세요</option>";
      if (!ud) return;
      const cats = Object.keys(ud);
      if (cats.length === 1 && cats[0] === "\uac1c\uc124\ud559\uacfc") {
        const o = document.createElement("option");
        o.value = "\uac1c\uc124\ud559\uacfc"; o.textContent = "\uc804\uccb4";
        stCategorySelect.appendChild(o);
        stCategorySelect.value = "\uac1c\uc124\ud559\uacfc";
        ud["\uac1c\uc124\ud559\uacfc"].forEach(m => {
          const mo = document.createElement("option");
          mo.value = m; mo.textContent = m;
          stMajorSelect.appendChild(mo);
        });
      } else {
        cats.forEach(cat => {
          const o = document.createElement("option");
          o.value = cat; o.textContent = cat;
          stCategorySelect.appendChild(o);
        });
      }
    });

    stCategorySelect.addEventListener("change", () => {
      const uni = stUniversitySelect.value;
      const cat = stCategorySelect.value;
      const ud = universityData[uni];
      stMajorSelect.innerHTML = "<option value='' disabled selected>\ud559\uacfc\ub97c \uc120\ud0dd\ud558\uc138\uc694</option>";
      if (!ud || !ud[cat]) return;
      ud[cat].forEach(m => {
        const o = document.createElement("option");
        o.value = m; o.textContent = m;
        stMajorSelect.appendChild(o);
      });
    });
  }

  // =========================================================
  // 대학별 학생부종합전형 특성 맵
  // =========================================================
  const univSetechProfile = {
    "서울대학교": "서울대는 학업적 탁월성(성취도 추이), 자기주도적 탐구 역량(호기심/심화탐구), 전공 관련 과목 이수 노력(위계 준수)을 매우 중시합니다. 2015 개정 교육과정의 '학업역량'과 '진로역량'의 최고 수준 증명이 핵심입니다.",
    "\uc5f0\uc138\ub300\ud559\uad50": "\uc5f0\uc138\ub300\ub294 \ud559\uc5c5\uc5ed\ub7c9\uacfc \ud568\uaed8 \uacf5\ub3d9\uccb4 \uae30\uc5ec, \uc778\uc131\uc744 \uade0\ud615 \uc788\uac8c \ud3c9\uac00\ud569\ub2c8\ub2e4. \ud611\ub825 \uacbd\ud5d8\u00b7\uc0ac\ud68c\uc801 \uad00\uc2ec\uc774 \ub4dc\ub7ec\ub098\ub294 \uc138\ud2b9\uc774 \uc720\ub9ac\ud569\ub2c8\ub2e4.",
    "고려대학교": "고려대는 자기주도적 학습 능력과 전공 관련 탐구의 깊이, 공동체 내에서의 역할을 중시합니다. 학업역량(탐구력)과 진로역량(전공교과 성취도)의 유기적 결합을 매섭게 평가합니다.",
    "\ud55c\uc591\ub300\ud559\uad50": "\ud55c\uc591\ub300(\ud559\uc0dd\ubd80\uc885\ud569)\ub294 \ud559\uc0dd\uc774 \uc2a4\uc2a4\ub85c \ubb38\uc81c\ub97c \ubc1c\uacac\ud558\uace0 \ud574\uacb0\ud558\ub294 \uacfc\uc815, \uc804\uacf5 \uad00\ub828 \ud65c\ub3d9\uc758 \uad6c\uccb4\uc131\uc744 \ubd05\ub2c8\ub2e4.",
    "\uc11c\uac15\ub300\ud559\uad50": "\uc11c\uac15\ub300\ub294 \ud559\ubb38\uc801 \uae4a\uc774\uc640 \ub17c\ub9ac\uc801 \uc0ac\uace0\ub97c \uac15\uc870\ud569\ub2c8\ub2e4. \uac1c\ub150 \uc774\ud574\ub97c \ub118\uc5b4 \ub3c5\ucc3d\uc801 \uc2dc\uac01\uc774 \ub4dc\ub7ec\ub098\uc57c \ud569\ub2c8\ub2e4.",
    "\uc131\uade0\uad00\ub300\ud559\uad50": "\uc131\uade0\uad00\ub300\ub294 \uc778\uc758\uc608\uc9c0 \uc778\uc131 \uc694\uc18c\uc640 \ud559\uc5c5\u00b7\uc9c4\ub85c \uc5ed\ub7c9\uc744 \ud1b5\ud569 \ud3c9\uac00\ud569\ub2c8\ub2e4.",
    "\uc911\uc559\ub300\ud559\uad50": "\uc911\uc559\ub300\ub294 \uc804\uacf5 \ud0d0\uc0c9 \uad6c\uccb4\uc131\uc558 \ud559\uc5c5 \uc131\uc2e4\uc131, \uc0ac\ud68c\uc801 \ucc45\uc784\uac10\uc744 \ubd05\ub2c8\ub2e4.",
    "\uacbd\ud76c\ub300\ud559\uad50": "\uacbd\ud76c\ub300\ub294 \ubb38\ud654\u00b7\ud3c9\ud654 \uac00\uce58\uc640 \uc5f0\uacc4\ud55c \uc735\ud569\uc801 \uc0ac\uace0, \uc9c4\ub85c \ud0d0\uc0c9 \ub178\ub825\uc744 \uc911\uc2dc\ud569\ub2c8\ub2e4.",
    "\ud55c\uad6d\uc678\uad6d\uc5b4\ub300\ud559\uad50": "\ud55c\uad6d\uc678\ub300\ub294 \uc5b8\uc5b4\uc801 \uac10\uc218\uc131\u00b7\uae00\ub85c\ubc8c \uc5ed\ub7c9\uacfc \uc778\ubb38\ud559\uc801 \ud1b5\ucc30\uc774 \ub4dc\ub7ec\ub098\ub294 \uc138\ud2b9\uc774 \uc720\ub9ac\ud569\ub2c8\ub2e4.",
    "\ubd80\uc0b0\ub300\ud559\uad50": "\ubd80\uc0b0\ub300\ub294 \uc804\uacf5 \uc801\ud569\uc131, \ud559\uc5c5 \uc131\uc2e4\uc131, \uacf5\ub3d9\uccb4\u00b7\ub098\ub204\uc74c \ud65c\ub3d9\uc744 \uade0\ud615 \uc788\uac8c \ubd05\ub2c8\ub2e4.",
    "\uacbd\ubd81\ub300\ud559\uad50": "\uacbd\ubd81\ub300\ub294 \uc804\uacf5 \uad00\ub828 \ud0d0\uad6c \uacbd\ud5d8\uacfc \ud559\uc5c5 \uc6b0\uc218\uc131, \uc9c0\uc5ed\uc0ac\ud68c \uae30\uc5ec \uc758\uc9c0\ub97c \uc911\uc2dc\ud569\ub2c8\ub2e4.",
    "\uc804\ub0a8\ub300\ud559\uad50": "\uc804\ub0a8\ub300\ub294 \ud559\uc5c5 \uc5ed\ub7c9\uacfc \ud568\uaed8 \ubd09\uc0ac\u00b7\uacf5\ub3d9\uccb4 \uc758\uc2dd, \uc804\uacf5 \ud0d0\uad6c \ub178\ub825\uc744 \ubd05\ub2c8\ub2e4.",
    "\ucda9\ub0a8\ub300\ud559\uad590": "\ucda9\ub0a8\ub300\ub294 \ud559\uc5c5 \uc5f4\uc815, \uc804\uacf5 \uad00\ub828 \uacbd\ud5d8\uc758 \uad6c\uccb4\uc131, \uacf5\ub3d9\uccb4 \uc5ed\ub7c9\uc744 \ud3c9\uac00\ud569\ub2c8\ub2e4.",
    "\ucda9\ubd81\ub300\ud559\uad50": "\ucda9\ubd81\ub300\ub294 \ud559\uc5c5 \uc131\uc2e4\uc131, \ud0d0\uad6c \ud65c\ub3d9\uc758 \uc790\uae30\uc8fc\ub3c4\uc131, \uc9c4\ub85c \ubaa9\ud45c\uc758 \uba85\ud655\uc131\uc744 \ubd05\ub2c8\ub2e4.",
    "\uac74\uad6d\ub300\ud559\uad50": "\uac74\uad6d\ub300\ub294 \uc804\uacf5 \uad00\ub828 \ucc3d\uc758\uc801 \ud0d0\uad6c, \ubb38\uc81c\ud574\uacb0\ub2a5\ub825, \ud611\ub825\uc744 \uc911\uc2dc\ud569\ub2c8\ub2e4.",
    "\ub3d9\uad6d\ub300\ud559\uad50": "\ub3d9\uad6d\ub300\ub294 \uc778\uc131\u00b7\uc790\uae30\uc131\ucc30\uacfc \ud568\uaed8 \uc804\uacf5 \ud0d0\uad6c \ud65c\ub3d9\uc758 \uad6c\uccb4\uc131\uc744 \ubd05\ub2c8\ub2e4.",
    "\ud64d\uc775\ub300\ud559\uad50": "\ud64d\uc775\ub300\ub294 \ucc3d\uc758\uc131\u00b7\uc608\uc220\uc801 \uac10\uc218\uc131(\uc608\uccb4\ub2a5)\uacfc \ud559\uc5c5 \uc5ed\ub7c9\uc744 \ud568\uaed8 \ubd05\ub2c8\ub2e4.",
    "\uc544\uc8fc\ub300\ud559\uad50": "\uc544\uc8fc\ub300\ub294 \ub17c\ub9ac\uc801 \uc0ac\uace0\u00b7\ubb38\uc81c\ud574\uacb0\ub2a5\ub825\uacfc \uc804\uacf5 \uc801\ud569\uc131\uc744 \uc911\uc2dc\ud569\ub2c8\ub2e4.",
    "\uc778\ud558\ub300\ud559\uad50": "\uc778\ud558\ub300\ub294 \uc218\ud559\u00b7\uacfc\ud559 \uad50\uacfc \ud0d0\uad6c \uae4a\uc774\uc640 \ucc3d\uc758\uc801 \ub3c4\uc804\uc744 \ubd05\ub2c8\ub2e4.",
    "\uc11c\uc6b8\uc2dc\ub9bd\ub300\ud559\uad50": "\uc11c\uc6b8\uc2dc\ub9bd\ub300\ub294 \uc9c0\uc5ed\uc0ac\ud68c \uc5f0\uacc4\uc131\u00b7\uacf5\uacf5 \uac00\uce58 \uc778\uc2dd\uacfc \ud559\uc5c5 \uc5ed\ub7c9\uc744 \ubd05\ub2c8\ub2e4.",
    "\uc778\ucc9c\ub300\ud559\uad50": "\uc778\ucc9c\ub300\ub294 \uc804\uacf5 \ud0d0\uad6c \ub3d9\uae30\uc758 \uc9c4\uc815\uc131, \ud559\uc5c5 \uc131\uc2e4\uc131, \ud611\ub825 \uacbd\ud5d8\uc744 \ubd05\ub2c8\ub2e4.",
    "\uad11\uc6b4\ub300\ud559\uad50": "\uad11\uc6b4\ub300\ub294 \uc804\uc790\u00b7\uc18c\ud504\ud2b8\uc6e8\uc5b4 \uc911\uc2ec\uc73c\ub85c \uc804\uacf5 \ud0d0\uad6c\uc640 \uc218\ud559\u00b7\uacfc\ud559 \uc2e4\ub825\uc744 \uc911\uc2dc\ud569\ub2c8\ub2e4.",
    "\uacbd\uae30\ub300\ud559\uad50": "\uacbd\uae30\ub300\ub294 \uc804\uacf5 \uad00\ub828 \uacbd\ud5d8\uc758 \uad6c\uccb4\uc131\uacfc \uc790\uae30\uc8fc\ub3c4\uc801 \ud0d0\uad6c\ub97c \ubd05\ub2c8\ub2e4.",
    "서울과학기술대학교": "서울과기대는 '계열적합성'을 최우선으로 하며, 바이오메디컬은 기초과학 융합역량을, 자유전공은 학업적 유연성과 융합적 사고를 중점 평가합니다. 과정 중심의 자기주도적 성장이 세특에 구체적으로 드러나야 합니다.",
    "가톨릭대학교": "가톨릭대는 인성·봉사 정신과 전공 탐구 노력, 공동체 역량을 균형 있게 봅니다.",
    "한국교원대학교": "교직 적합성과 전공적합성을 핵심으로 봅니다. 예비 교사로서의 인성과 지원 전공 분야의 기초 학업 역량, 특히 교직 관련 활동(멘토링, 봉사 등)에서의 주도성을 중점 평가합니다."
  };

  // =========================================================
  // 세특 분석 — Gemini API 호출
  // =========================================================
  async function generateSetechReport(fd) {
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

    const prompt = `당신은 대한민국 최고의 대학입학사정관 전문가입니다.
다음 학생이 지원하는 대학·학과의 학생부종합전형 기준에 따라, 교사가 작성한 세부능력 및 특기사항(세특)을 '2015 개정 교육과정 핵심역량 가이드북'의 지표를 기준으로 매우 엄격하게 평가해 주세요.

[대학·계열·학과]
대학: ${fd.university} / 계열: ${fd.category} / 학과: ${fd.major}${fd.subjectName ? " / 과목: " + fd.subjectName : ""}

[해당 대학 학생부종합전형 특성 및 평가 주안점]
${univProfile}

[평가 기준 및 배점]
해당 대학의 실제 평가 배점을 적용하여 총점 100점 만점으로 평가합니다.
1. 학업역량 (최대 ${maxAca}점): ${comps.academic} (학업성취도, 학업태도, 탐구력 중심)
2. 진로역량 (최대 ${maxCar}점): ${comps.career} (전공교과 이수노력 및 성취도, 진로탐색활동 중심)
3. 공동체역량 (최대 ${maxCom}점): ${comps.community} (협합/소통, 나눔/배려, 성실성, 리더십 중심)

[세특 원문]
${fd.content}

[엄격한 평가 및 감점 주의사항]
- **[핵심] 2015 개정 교육과정 평가지표 준수**: 단순 활동 나열이나 미사여구는 점수를 부여하지 않습니다. 지적 호기심의 '발현-과정-결과'가 논리적으로 증명될 때만 고득점을 부여하세요.
- **[핵심] 2026 학교생활기록부 기재요령 준수**:
  1. 기재 금지: 학생·학부모(친인척)의 성명/직장명/신상정보, 공인어학시험 성적, 교외 수상실적, 모의고사/수능 성적.
  2. 기재 금지: K-MOOC, KOCW, 소논문(R&E), 학회지, 도서 출간, 발명특허, 특정 대학명/기관명/상호명/강사명.
  3. 객관적 사실 기반: 학교 수업 중의 수행평가, 발표, 토론 등 정규 교육과정 내의 관찰된 내용만 작성. 과장된 미사여구나 감정적 서술 배제.
  4. 어투: 문장의 끝은 반드시 객관적인 명사형 종결어미(~함, ~모습을 보임, ~을 파악함, ~을 탐구함 등)를 사용할 것. 어투가 맞지 않으면 'improvements'에 강력하게 지적하세요.
- 세특이 짧거나 내용이 빈약할 경우 냉정하게 낮은 점수를 부여하고 구체적 이유를 작성하세요.
- rewriteSuggestion은 원문 내용과 위 기재요령을 완벽하게 반영하여 대학 평가에 가장 유리하게 다듬어진 세특 전문을 작성하세요(명사형 어미 준수, 최소 1500자 이상). 2015 가이드북의 '탁월성' 지표가 드러나도록 문장을 구성하십시오. 보고서 전체 분량을 기존보다 2~3배 이상 대폭 늘려 매우 구체적이고 길게 서술해야 합니다.
- 점수가 일치해야 합니다 (totalScore = academicScore + careerScore + communityScore).

출력 JSON 형식:
{"totalScore":<0-100>,"academicScore":<0-${maxAca}>,"careerScore":<0-${maxCar}>,"communityScore":<0-${maxCom}>,"scoreJustification":"<마크다운 소제목 구분 산출근거>","strengths":"<블릿문 3~5개>","improvements":"<블릿문 3~5개 + 구체적 이유>","rewriteSuggestion":"<개선된 세특 전문>"}`;

    const body = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 32768,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            totalScore: { type: "INTEGER" },
            academicScore: { type: "INTEGER" },
            careerScore: { type: "INTEGER" },
            communityScore: { type: "INTEGER" },
            scoreJustification: { type: "STRING" },
            strengths: { type: "STRING" },
            improvements: { type: "STRING" },
            rewriteSuggestion: { type: "STRING" }
          },
          required: [
            "totalScore", "academicScore", "careerScore", "communityScore",
            "scoreJustification", "strengths", "improvements", "rewriteSuggestion"
          ]
        }
      }
    };

    const modelsToTry = [
      "gemini-2.5-pro",
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite"
    ];

    let lastErr;
    let attemptCount = 0;

    for (const model of modelsToTry) {
      attemptCount++;
      const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${fd.apiKey}`;

      try {
        const controller = new AbortController();
        // 60초 타임아웃 
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          const msg = errBody?.error?.message || res.statusText;
          throw new Error(`API Error (${model}): ` + msg);
        }

        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
        throw new Error(`Empty response from ${model}`);

      } catch (err) {
        lastErr = err;
        console.warn(`[Fallback] Model ${model} failed or timed out:`, err.name === 'AbortError' ? 'Timeout' : err.message);

        if (attemptCount < modelsToTry.length) {
          // 다음 모델 시도 전 1.5초 대기
          await new Promise(r => setTimeout(r, 1500));
        }
      }
    }

    throw lastErr || new Error("모든 AI 모델 호출에 실패했거나 시간이 초과되었습니다.");
  }

  // =========================================================
  // 세특 분석 — 결과 렌더링
  // =========================================================
  function renderSetechResult(data) {
    const dash = document.getElementById("st-dashboard");
    if (!dash) return;

    document.getElementById("st-totalScore").textContent = data.totalScore ?? "-";
    document.getElementById("st-academicScore").textContent = data.academicScore ?? "-";
    document.getElementById("st-careerScore").textContent = data.careerScore ?? "-";
    document.getElementById("st-communityScore").textContent = data.communityScore ?? "-";

    const scoreEl = document.getElementById("st-totalScore");
    const score = parseInt(data.totalScore) || 0;
    scoreEl.style.color = score >= 80 ? "#4ade80" : score >= 60 ? "#facc15" : "#f87171";

    document.getElementById("st-scoreJustification").innerHTML = marked.parse(data.scoreJustification || "");
    document.getElementById("st-strengths").innerHTML = marked.parse(data.strengths || "");
    document.getElementById("st-improvements").innerHTML = marked.parse(data.improvements || "");
    document.getElementById("st-rewrite").innerHTML = marked.parse(data.rewriteSuggestion || "");

    const modalMap = {
      "st-btnAca": { title: "\ud559\uc5c5\uc5ed\ub7c9", score: data.academicScore, note: "40\uc810 \ub9cc\uc810" },
      "st-btnCar": { title: "\uc9c4\ub85c\uc5ed\ub7c9", score: data.careerScore, note: "40\uc810 \ub9cc\uc810" },
      "st-btnCom": { title: "\uacf5\ub3d9\uccb4\uc5ed\ub7c9", score: data.communityScore, note: "20\uc810 \ub9cc\uc810" }
    };
    Object.entries(modalMap).forEach(([btnId, info]) => {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      btn.onclick = () => {
        const bodyHtml =
          `<div style="background:rgba(255,255,255,0.05);padding:15px;border-radius:8px;margin-bottom:1rem;border-left:4px solid var(--accent-primary)">` +
          `<h4 style="margin:0 0 8px;color:#96baff">${info.title} (${info.note})</h4>` +
          `<p style="margin:0;font-size:1.4rem;font-weight:700;color:#fff">${info.score ?? "-"}\uc810</p>` +
          `</div>` +
          marked.parse(data.scoreJustification || "") +
          `<hr style="margin:1rem 0;border-color:var(--glass-border)">` +
          `<h4 style="color:#96baff">\uac1c\uc120 \uc81c\uc548</h4>` +
          marked.parse(data.improvements || "");
        document.getElementById("modalTitle").textContent = info.title + " \uc0c1\uc138 \ubd84\uc11d";
        document.getElementById("modalBody").innerHTML = bodyHtml;
        document.getElementById("analysisModal").classList.remove("hidden");
      };
    });

    const stModal = document.getElementById("analysisModal");
    const stModalCloseBtn = document.getElementById("modalCloseBtn");
    if (stModal && stModalCloseBtn) {
      stModalCloseBtn.onclick = () => stModal.classList.add("hidden");
      stModal.onclick = (e) => {
        if (e.target === stModal) stModal.classList.add("hidden");
      };
    }

    dash.classList.remove("hidden");
  }

  // =========================================================
  // 세특 분석 — 폼 제출 처리
  // =========================================================
  const setechForm = document.getElementById("setechForm");
  const stAnalyzeBtn = document.getElementById("st-analyzeBtn");
  const stEmptyState = document.getElementById("st-emptyState");
  const stLoadingState = document.getElementById("st-loadingState");
  const stDashboardEl = document.getElementById("st-dashboard");

  if (setechForm) {
    setechForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const fd = {
        apiKey: document.getElementById("st-api-key").value.trim(),
        university: stUniversitySelect ? stUniversitySelect.value : "",
        category: stCategorySelect ? stCategorySelect.value : "",
        major: stMajorSelect ? stMajorSelect.value : "",
        subjectName: document.getElementById("st-subject-name").value.trim(),
        content: document.getElementById("st-content").value.trim()
      };

      if (!fd.apiKey) { alert("API \ud0a4\ub97c \uc785\ub825\ud558\uc138\uc694."); return; }
      if (!fd.university || !fd.major) { alert("\ub300\ud559\uacfc \ud559\uacfc\ub97c \uc120\ud0dd\ud558\uc138\uc694."); return; }
      if (!fd.content) { alert("\uc138\ud2b9 \ub0b4\uc6a9\uc744 \uc785\ub825\ud558\uc138\uc694."); return; }

      stEmptyState.classList.add("hidden");
      stDashboardEl.classList.add("hidden");
      stLoadingState.classList.remove("hidden");
      stAnalyzeBtn.disabled = true;
      stAnalyzeBtn.innerHTML = "<span class='spinner' style='width:20px;height:20px;border-width:2px;margin:0;'></span> AI \ubd84\uc11d \uc911...";

      try {
        const raw = await generateSetechReport(fd);
        let parsed;
        try {
          const cleanedText = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
          parsed = JSON.parse(cleanedText);
        } catch (parseErr) {
          console.error("JSON Parse Error:", parseErr);
          const errPosMatch = parseErr.message.match(/position (\d+)/);
          let errContext = "";
          if (errPosMatch && errPosMatch[1]) {
            const pos = parseInt(errPosMatch[1]);
            errContext = "\n에러 발생 부분: " + raw.substring(Math.max(0, pos - 30), pos + 30);
          }
          throw new Error("AI 응답 파싱 실패 (" + parseErr.message + ").\n" + errContext + "\n\n(원문 앞 600자: " + raw.substring(0, 600) + ")");
        }
        stLoadingState.classList.add("hidden");
        renderSetechResult(parsed);
        if (window.innerWidth <= 992) {
          document.getElementById("st-resultContainer")?.scrollIntoView({ behavior: "smooth" });
        }
      } catch (err) {
        stLoadingState.classList.add("hidden");
        stEmptyState.classList.remove("hidden");
        alert("\ubd84\uc11d \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4:\n" + err.message);
      } finally {
        stAnalyzeBtn.disabled = false;
        stAnalyzeBtn.innerHTML = "<span class='btn-text'>AI \uc138\ud2b9 \ubd84\uc11d \ubc0f \ud3c9\uac00</span><span class='btn-icon'>\u2726</span>";
      }
    });
  }

  // --- Visitor Stats Logic ---
  function initVisitorStats() {
    let total = parseInt(localStorage.getItem('site_visits_total') || '12054');
    let today = parseInt(localStorage.getItem('site_visits_today') || '342');
    let lastVisit = localStorage.getItem('site_last_visit');

    const now = new Date().toDateString();
    if (lastVisit !== now) {
      today = Math.floor(Math.random() * 50) + 100; // random new day start
      localStorage.setItem('site_last_visit', now);
    }

    total += 1;
    today += 1;
    localStorage.setItem('site_visits_total', total);
    localStorage.setItem('site_visits_today', today);

    const totalEl = document.getElementById('stat-total');
    const todayEl = document.getElementById('stat-today');
    const onlineEl = document.getElementById('stat-online');

    if (totalEl) totalEl.innerText = total.toLocaleString() + '명';
    if (todayEl) todayEl.innerText = today.toLocaleString() + '명';

    // Simulate active online users fluttering
    let online = Math.floor(Math.random() * 15) + 5;
    if (onlineEl) {
      onlineEl.innerText = `${online}명`;
      setInterval(() => {
        const diff = Math.floor(Math.random() * 3) - 1;
        online = Math.max(1, online + diff);
        onlineEl.innerText = `${online}명`;
      }, 3000);
    }
  }

  setTimeout(initVisitorStats, 500);

  // =========================================================
  // 면접 문항 생성 — Gemini API 호출
  // =========================================================
  const ivForm = document.getElementById("interviewForm");
  const ivStudentSelect = document.getElementById("iv-student-select");
  const ivUnivSelect = document.getElementById("iv-univ-select");
  const ivCategorySelect = document.getElementById("iv-category-select");
  const ivMajorSelect = document.getElementById("iv-major-select");

  if (ivUnivSelect && typeof universityData !== "undefined") {
    // 면접 특화 데이터 보유 대학 목록 (옵션 생성 전 선언)
    const ivUnivDataList = [
      "가천대학교", "서울시립대학교", "숭실대학교", "한국외국어대학교", "세종대학교",
      "건국대학교", "중앙대학교", "경희대학교", "서울과학기술대학교", "서강대학교",
      "성균관대학교", "한양대학교", "한국교원대학교", "광운대학교", "동국대학교",
      "인하대학교", "아주대학교", "단국대학교", "부산대학교", "인천대학교", "가톨릭대학교", "서울대학교", "국민대학교"
    ];

    // Populate University Dropdown (✅/⚪ 마커 포함)
    for (const uni of Object.keys(universityData)) {
      const opt = document.createElement("option");
      opt.value = uni;
      opt.textContent = (ivUnivDataList.includes(uni) ? "✅ " : "⚪ ") + uni;
      ivUnivSelect.appendChild(opt);
    }

    ivUnivSelect.addEventListener("change", () => {
      const ud = universityData[ivUnivSelect.value];
      ivCategorySelect.innerHTML = "<option value='' disabled selected>계열을 선택하세요</option>";
      ivMajorSelect.innerHTML = "<option value='' disabled selected>학과를 선택하세요</option>";

      // 배지 업데이트
      const badge = document.getElementById("iv-univ-data-badge");
      if (badge && ivUnivSelect.value) {
        const hasData = ivUnivDataList.includes(ivUnivSelect.value);
        badge.style.display = "block";
        badge.style.background = hasData ? "rgba(80,200,120,0.15)" : "rgba(255,255,255,0.07)";
        badge.style.border = hasData ? "1px solid rgba(80,200,120,0.4)" : "1px solid rgba(255,255,255,0.15)";
        badge.style.color = hasData ? "#6ee09a" : "#999";
        badge.textContent = hasData
          ? "✅ 면접 특화 데이터가 반영되어 정밀한 문항이 생성됩니다"
          : "⚪ 공통 지침 기반으로 문항이 생성됩니다";
      }

      if (!ud) return;

      const cats = Object.keys(ud);
      if (cats.length === 1 && cats[0] === "개설학과") {
        const o = document.createElement("option");
        o.value = "개설학과"; o.textContent = "전체";
        ivCategorySelect.appendChild(o);
        ivCategorySelect.value = "개설학과";

        ud["개설학과"].forEach(m => {
          const mo = document.createElement("option");
          mo.value = m; mo.textContent = m;
          ivMajorSelect.appendChild(mo);
        });
      } else {
        cats.forEach(cat => {
          const o = document.createElement("option");
          o.value = cat; o.textContent = cat;
          ivCategorySelect.appendChild(o);
        });
      }
    });


    // 현황 패널 초기화
    const ivStatusContent = document.getElementById("iv-univ-status-content");
    if (ivStatusContent && universityData) {
      const allUnivs = Object.keys(universityData).sort();
      const withData = allUnivs.filter(u => ivUnivDataList.includes(u));
      const withoutData = allUnivs.filter(u => !ivUnivDataList.includes(u));

      ivStatusContent.innerHTML = `
        <div style="margin-bottom:0.8rem;">
          <div style="color:#6ee09a; font-weight:700; margin-bottom:0.4rem;">✅ 면접 특화 데이터 보유 (${withData.length}개)</div>
          <div style="display:flex; flex-wrap:wrap; gap:0.3rem;">
            ${withData.map(u => `<span style="background:rgba(80,200,120,0.15);border:1px solid rgba(80,200,120,0.35);color:#6ee09a;padding:2px 8px;border-radius:10px;">${u}</span>`).join("")}
          </div>
        </div>
        <div>
          <div style="color:#aaa; font-weight:700; margin-bottom:0.4rem;">⚪ 공통 지침 적용 (${withoutData.length}개)</div>
          <div style="display:flex; flex-wrap:wrap; gap:0.3rem;">
            ${withoutData.map(u => `<span style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);color:#888;padding:2px 8px;border-radius:10px;">${u}</span>`).join("")}
          </div>
        </div>
      `;
    }

    ivCategorySelect.addEventListener("change", () => {
      const uni = ivUnivSelect.value;
      const cat = ivCategorySelect.value;
      const ud = universityData[uni];
      ivMajorSelect.innerHTML = "<option value='' disabled selected>학과를 선택하세요</option>";
      if (!ud || !ud[cat]) return;
      ud[cat].forEach(m => {
        const o = document.createElement("option");
        o.value = m; o.textContent = m;
        ivMajorSelect.appendChild(o);
      });
    });
  }

  if (ivForm) {
    ivForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const apiKey = document.getElementById("iv-api-key")?.value?.trim() || document.getElementById("api-key")?.value?.trim();
      const studentIdx = ivStudentSelect?.value;
      const targetUniv = ivUnivSelect?.value;
      const targetCat = ivCategorySelect?.value;
      const targetMajor = ivMajorSelect?.value;

      if (!apiKey) { alert("API 키를 먼저 입력해주세요 (개인 분석 탭 상단)."); return; }
      if (!studentIdx || !targetUniv || !targetMajor) { alert("학생과 목표 학과를 모두 선택해주세요."); return; }

      // Load selected student data
      let studentRecordText = "";
      try {
        const savedData = await StorageManager.load("pf_" + studentIdx);
        if (savedData) {
          const parsed = JSON.parse(savedData);
          studentRecordText = `성적: ${parsed.generalGrade}
과목별 성취: ${parsed.grades}
세부능력 및 특기사항: ${parsed.subject}
창체활동(진로등): ${parsed.career}
행동특성 및 종합의견: ${parsed.arts}`;
        }
      } catch (err) { }

      if (!studentRecordText || studentRecordText.includes("undefined")) {
        // Fallback to currently selected in DOM if same student
        const domStudentIdx = document.getElementById("student-select")?.value;
        if (domStudentIdx === studentIdx) {
          studentRecordText = `세부능력: ${document.getElementById("subject-records")?.value || ""}
창체: ${document.getElementById("creative-activities")?.value || ""}
행특: ${document.getElementById("behavioral-records")?.value || ""}`;
        } else {
          alert("해당 학생의 생활기록부 데이터를 찾을 수 없습니다. 개인 분석 탭에서 학생을 선택하고 생기부를 확인해주세요.");
          return;
        }
      }

      const ivLoadingState = document.getElementById("iv-loadingState");
      const ivResultContainer = document.getElementById("iv-resultContainer");
      const ivMarkdownResult = document.getElementById("iv-markdown-result");
      const ivAnalyzeBtn = document.getElementById("iv-analyzeBtn");

      ivLoadingState.classList.remove("hidden");
      ivResultContainer.style.display = "block";
      ivMarkdownResult.innerHTML = "";
      ivAnalyzeBtn.disabled = true;

      // Special university guide content
      const gachonGuideContent = `
<h2 style="color:var(--accent-primary);margin-top:0;">🎓 가천대학교 면접 가이드</h2>

<h3>1. 면접 반영 비율 및 합격 역전률</h3>
<p>가천대학교는 2단계 평가에서 <strong>1단계 서류 성적 50%와 면접 평가 50%</strong>를 합산하여 최종 합격자를 선발합니다.<br>
면접의 비중이 50%로 매우 높기 때문에, 1단계 합격자 순위가 뒤바뀌는 <strong>'역전률'이 무려 약 60%</strong>에 달합니다.<br>
심지어 1단계에서 4~5배수 턱걸이 성적으로 통과한 학생들 중에서도 20%가 최종 합격할 만큼 면접의 실질적인 영향력이 절대적인 대학입니다.</p>

<h3>2. 면접 진행 방식</h3>
<ul>
  <li><strong>완벽한 블라인드 면접</strong>: 지원자의 1단계 서류 성적까지 모두 면접관에게 가려진 상태로 진행됩니다.</li>
  <li><strong>평가 위원 구성</strong>: 전임 입학사정관과 위촉 사정관(교수 등)을 포함하여 총 3인의 평가위원이 다대일 면접을 진행합니다.</li>
  <li><strong>맞춤형 꼬리 질문</strong>: 지원자의 서류를 바탕으로 면접관이 직접 질문을 작성하며, 지원자가 해당 계열에 대해 얼마나 깊은 관심을 가지고 있는지 집중적으로 파악합니다.</li>
</ul>

<h3>3. 핵심 평가 요소 (40 : 40 : 20)</h3>
<table style="width:100%;border-collapse:collapse;">
  <thead><tr style="background:rgba(150,186,255,0.15);"><th style="padding:10px;border:1px solid var(--panel-border);text-align:left;">평가 요소</th><th style="padding:10px;border:1px solid var(--panel-border);text-align:center;">비율</th><th style="padding:10px;border:1px solid var(--panel-border);text-align:left;">세부 내용</th></tr></thead>
  <tbody>
    <tr><td style="padding:10px;border:1px solid var(--panel-border);"><strong>진학 의지 및 계열 적합성</strong></td><td style="padding:10px;border:1px solid var(--panel-border);text-align:center;">40%</td><td style="padding:10px;border:1px solid var(--panel-border);">탐구 과정에서의 성장·사고력, 과정 수행 역량, 교과 지식과의 연계</td></tr>
    <tr><td style="padding:10px;border:1px solid var(--panel-border);"><strong>인성</strong></td><td style="padding:10px;border:1px solid var(--panel-border);text-align:center;">40%</td><td style="padding:10px;border:1px solid var(--panel-border);">공동체 활동에서의 적극성 + 면접 현장 참여 태도 전반</td></tr>
    <tr><td style="padding:10px;border:1px solid var(--panel-border);"><strong>의사소통 역량</strong></td><td style="padding:10px;border:1px solid var(--panel-border);text-align:center;">20%</td><td style="padding:10px;border:1px solid var(--panel-border);">질문 이해도 + 답변의 논리성</td></tr>
  </tbody>
</table>

<h3>4. 실제 면접 질문 예시</h3>
<p><strong>[인성 영역]</strong><br>
"자율활동에 부반장으로 활동하며 특별한 역할의 필요성을 어필하고 직접 수행했다고 기록되어 있는데, 그 역할이 왜 필요하다고 했으며, 이를 어떻게 수행했는지 설명해주세요."</p>
<p><strong>[진학 의지 및 계열 적합성 영역]</strong></p>
<ul>
  <li>"사회 시간에 형법 분야에 관심이 많아 스스로 관련 분야에 대한 심화 탐구를 진행했다고 기록되어 있습니다. 탐구한 주요 내용을 설명해주세요."</li>
  <li>"수학 시간에 미적분과 관련된 책을 읽고, 미분과 적분에 대한 개념을 정리했다고 기록되어 있습니다. 책에서 인상 깊었던 핵심 내용을 설명하고, 미분의 정의를 설명해주세요."</li>
</ul>

<h3>5. 전략 요약</h3>
<p>가천대 면접은 면접관에게 성적이 공개되지 않는 <strong>3대1 블라인드 면접</strong>이므로, 서류 내용의 핵심 원리(특히 교과 지식)를 정확히 숙지하고 논리적인 태도로 답변한다면 성적의 불리함을 충분히 뒤집을 수 있는 기회의 장입니다.</p>
`;

      // Seoul City University (UOS) guide content
      const uosGuideContent = `
<h2 style="color:var(--accent-primary);margin-top:0;">🎓 서울시립대학교 면접 가이드</h2>

<h3>1. 면접 반영 비중 및 합격 역전률</h3>
<p>서울시립대는 2단계 평가에서 <strong>1단계 서류 점수 50%와 면접 평가 점수 50%</strong>를 합산하여 최종 합격자를 선발합니다.<br>
1배수(최초 합격권) 밖에서 최종 합격한 학생의 비율이 <strong>57%</strong>에 달할 정도로 면접의 영향력이 매우 큽니다.<br>
1단계 3배수 선발 시 서류 성적의 변별력이 무의미해질 만큼 면접을 통해 당락이 결정되는 경향이 짙습니다.</p>

<h3>2. 면접 진행 방식 및 주요 특징</h3>
<ul>
  <li><strong>평가 위원 및 시간</strong>: 전임 입학사정관과 위촉 사정관(교수 등) 총 2인의 면접관이 지원자 1명을 대상으로 12분 이내의 면접을 진행합니다.</li>
  <li><strong>평가 방식</strong>: 면접관에게 학생부 전체가 공개된 상태에서 블라인드 면접으로 치러집니다.</li>
  <li><strong>맞춤형 질문 출제</strong>: 서류 심사자와 면접관이 사전에 학생부를 꼼꼼히 분석하여 개별 면접 질문을 직접 작성하며, 각 모집단위(학과)별 인재상을 중요하게 반영합니다.</li>
  <li><strong>평가의 핵심 초점</strong>: 활동 나열보다 <strong>'학업 역량을 기반으로 한 진로 활동'</strong>을 중점적으로 봅니다. 학업(교과 지식)과 진로 탐구 활동이 어떻게 연계되었는지 심층 검증합니다.</li>
</ul>

<h3>3. 3대 핵심 평가 요소 (40 : 35 : 25)</h3>
<table style="width:100%;border-collapse:collapse;">
  <thead><tr style="background:rgba(150,186,255,0.15);"><th style="padding:10px;border:1px solid var(--panel-border);text-align:left;">평가 요소</th><th style="padding:10px;border:1px solid var(--panel-border);text-align:center;">비율</th><th style="padding:10px;border:1px solid var(--panel-border);text-align:left;">세부 내용</th></tr></thead>
  <tbody>
    <tr><td style="padding:10px;border:1px solid var(--panel-border);"><strong>잠재역량</strong></td><td style="padding:10px;border:1px solid var(--panel-border);text-align:center;">40%</td><td style="padding:10px;border:1px solid var(--panel-border);">교육활동 연계·심화 학습 수준(다학제적 전공수학열의), 통합적 문제해결역량(자신만의 대안 제시 경험)</td></tr>
    <tr><td style="padding:10px;border:1px solid var(--panel-border);"><strong>학업역량</strong></td><td style="padding:10px;border:1px solid var(--panel-border);text-align:center;">35%</td><td style="padding:10px;border:1px solid var(--panel-border);">고교 교과 성취도(고교기초학업능력), 전공 분야 탐구·학습 경험(대학전공기초 소양)</td></tr>
    <tr><td style="padding:10px;border:1px solid var(--panel-border);"><strong>사회역량</strong></td><td style="padding:10px;border:1px solid var(--panel-border);text-align:center;">25%</td><td style="padding:10px;border:1px solid var(--panel-border);">공동체·시민윤리의식(공공의 이익 중시), 협동학습능력(팀워크·부족한 점 보완)</td></tr>
  </tbody>
</table>

<h3>4. 실제 면접 질문 예시 (심도 있는 꼬리 질문 중심)</h3>
<p><strong>[학업역량 관련]</strong><br>
"3학년 자율활동에서 자연이자율 하락의 해결책으로 '평균인플레이션 목표제'를 제시했는데, 그 개념을 설명해 보세요. 물가안정목표제와 비교하여 장단점은 무엇이며 한국 경제에는 어떤 것이 더 적합하다고 생각하나요?"</p>
<p><strong>[잠재역량 관련]</strong><br>
"동아리에서 정부의 재정계산 자료를 탐독하고 국민연금 개혁안의 충돌을 문제 삼았는데, 현재 국민연금의 상황과 개혁안의 충돌 문제는 무엇인가요? 연금의 지속 가능성을 확보하기 위한 과제에 대해 생각해본 적 있나요?"</p>
<p><strong>[사회역량 관련]</strong><br>
"사회문화 시간에 '고령화 시대 복지 사각지대에 놓인 노인들'에 대한 보고서를 작성했는데, 노인 빈곤율·파산율 자료를 분석한 결과 무엇을 알 수 있었나요? 빈곤의 원인은 무엇이라 생각하며, 해결 방안을 제시해 보세요."</p>

<h3>5. 전략 요약</h3>
<p>서울시립대 면접은 면접관이 학생부 전체를 본 상태에서 진행되므로, <strong>서류에 기재된 활동의 원리와 사회적 적용, 자신만의 해결책</strong>을 논리적으로 설명할 수 있도록 준비해야 합니다. 단순 사실 나열이 아닌 깊이 있는 사고력과 문제해결 능력을 보여주는 것이 핵심입니다.</p>
`;

      // Hankuk University of Foreign Studies (HUFS) guide content
      const hufsGuideContent = `
<h2 style="color:var(--accent-primary);margin-top:0;">🎓 한국외국어대학교 면접 가이드</h2>

<h3>1. 면접 비중 및 주요 특징</h3>
<p>한국외대는 1단계에서 3배수를 선발한 후, 2단계에서 <strong>1단계 서류 50%와 면접 50%</strong>를 합산하여 최종 선발합니다.<br>
면접의 실질적 영향력이 50% 이상으로 매우 크게 작용하며, 수능 이후 진행되므로 실질 경쟁률 변화가 주요 변수입니다.<br>
면접관 2인이 지원자 1명을 대상으로 10분 이내의 블라인드 면접을 실시합니다.</p>

<h3>2. 핵심 평가 요소 (진로 역량 중심)</h3>
<table style="width:100%;border-collapse:collapse;">
  <thead><tr style="background:rgba(150,186,255,0.15);"><th style="padding:10px;border:1px solid var(--panel-border);text-align:left;">평가 요소</th><th style="padding:10px;border:1px solid var(--panel-border);text-align:center;">비율</th><th style="padding:10px;border:1px solid var(--panel-border);text-align:left;">세부 내용</th></tr></thead>
  <tbody>
    <tr><td style="padding:10px;border:1px solid var(--panel-border);"><strong>학업 역량</strong></td><td style="padding:10px;border:1px solid var(--panel-border);text-align:center;">40%</td><td style="padding:10px;border:1px solid var(--panel-border);">대학 수학 지식, 새로운 방식으로 문제 바라보기, 폭넓은 탐구 및 해결 능력</td></tr>
    <tr><td style="padding:10px;border:1px solid var(--panel-border);"><strong>진로 역량</strong></td><td style="padding:10px;border:1px solid var(--panel-border);text-align:center;">40%</td><td style="padding:10px;border:1px solid var(--panel-border);">진로 선택 지식·태도·가치관, 자기주도적 진로 설계 및 탐색 능력</td></tr>
    <tr><td style="padding:10px;border:1px solid var(--panel-border);"><strong>공동체 역량</strong></td><td style="padding:10px;border:1px solid var(--panel-border);text-align:center;">20%</td><td style="padding:10px;border:1px solid var(--panel-border);">개인과 공동체의 조화로운 발전 가치관, 공동체 발전 적극 참여 능력</td></tr>
  </tbody>
</table>

<h3>3. 실제 면접 질문 예시</h3>
<p><strong>[학업 역량 관련]</strong><br>
"빅데이터에 관련된 도서를 많이 읽었는데, 빅데이터를 무역에 적용한 사례가 있었나요?"<br>
"‘랑그’와 ‘빠롤’을 학급 친구들에게 어떻게 소개했나요?"</p>
<p><strong>[진로 역량 관련]</strong><br>
"영문학 작품 중 가장 추천하고 싶은 책은 무엇인가요?"<br>
"코로나19 팬데믹에서 드러난 프랑스와 한국 문화의 공통점과 차이점은 무엇인가요?"</p>

<h3>4. 전략 요약</h3>
<p>한국외대 면접은 <strong>'교과 수업을 통해 지적 호기심을 얼마나 폭넓게 확장했는가'</strong>와 <strong>'자기주도적 탐구 역량'</strong>을 증명하는 것이 핵심입니다. 교과 탐구 내용의 개념을 확실히 숙지하고, 이를 자신의 진로나 사회 현상과 연결하여 설명하세요.</p>
`;


      const rawInterviewData = (typeof interviewDocs !== 'undefined') ? interviewDocs : "";
      const rawRecommendedSubjects = (typeof recommendedSubjectsDocs !== 'undefined') ? recommendedSubjectsDocs : "";

      // Build university-specific prompt supplement
      const univPromptSupplement =
        targetUniv === "가천대학교" ? `

[가천대학교 면접 특이사항 - 필수 반영]
가천대학교는 다음과 같은 고유한 면접 구조를 가집니다. 아래 기준을 10개 문항 전체에 반드시 반영하세요.
- 면접관 3인 x 지원자 1인, 10분 내외 완벽한 블라인드 면접 (1단계 서류 성적도 면접관에게 비공개)
- 평가 배점: 진학의지 40% / 인성 40% / 학업역량 20%
- 10개 문항을 다음 비율로 배분: 진학의지 4문항, 인성 4문항, 학업역량 2문항
- 인성 문항: 나눔, 배려, 공동체 협업 및 성실성(출결 등) 확인. 반드시 공동체 활동(자율/동아리/봉사/행특)과 연계하여 구체적 사례를 묻는 형식으로 설계
- 진학의지 문항: 전공에 대한 자발적 지적 호기심과 주도적 활동 경험 확인. 특히 아이디어를 실제 경험으로 구현해 본 사례와, 교과 세특의 탐구 내용에서 핵심 원리·개념을 직접 설명하도록 요구하는 꼬리 질문을 반드시 포함
- 학업역량 문항: 기초 교과 성취도 및 학습 과정에서의 성장 궤적 확인
- 각 문항 제목(h3) 바로 아래에 반드시 다음 형식으로 면접 평가 기준을 명시하세요:
  - **📌 평가 항목**: [진학의지/인성/학업역량] | **질문 의도**: [이 질문으로 확인하고자 하는 바를 한 문장으로 간략히]
` :
          targetUniv === "서울시립대학교" ? `

[서울시립대학교 면접 특이사항 - 필수 반영]
서울시립대학교는 다음과 같은 고유한 면접 구조를 가집니다. 아래 기준을 10개 문항 전체에 반드시 반영하세요.
- 면접관 2인 × 지원자 1인, 12분 이내 진행
- 면접관에게 학생부 전체가 공개된 상태에서 블라인드 면접 진행 (이름·수험번호 등 신원 비공개)
- 평가 배점: 잠재역량 40% / 학업역량 35% / 사회역량 25%
- 10개 문항을 다음 비율로 배분: 잠재역량 4문항, 학업역량 3~4문항, 사회역량 2~3문항
- 잠재역량 문항: 교과 활동·진로 활동이 어떻게 연계되었는지 확인하는 심층 꼬리 질문 형식. 탐구 내용의 원리·개념을 직접 설명하도록 요구하고, '자신만의 대안 또는 해결책'을 반드시 물어볼 것
- 학업역량 문항: 고교 교과 지식 기반의 개념 이해 확인 및 전공 기초 역량 확인
- 사회역량 문항: 공동체 활동과 윤리의식, 협동 경험 확인
- 각 문항 말미에 반드시 다음 형식으로 면접 평가 기준을 명시하세요:
  - **📌 평가 항목**: [잠재역량/학업역량/사회역량] | **질문 의도**: [이 질문으로 확인하고자 하는 바를 한 문장으로 간략히]
- 단순 사실 나열이 아닌 심층 꼬리 질문(사회적 적용, 비교 분석, 해결방안 제시)을 반드시 포함할 것
` :
            targetUniv === "숭실대학교" ? `

[숭실대학교 면접 특이사항 - 필수 반영]
숭실대학교는 다음과 같은 고유한 면접 구조를 가집니다. 아래 기준을 10개 문항 전체에 반드시 반영하세요.
- 전임사정관 + 전공 교수로 구성된 2인 면접위원 x 지원자 1인, 12분 이내 진행
- 학생부 전체가 면접관에게 공개되며 사전 질문 작성 후 블라인드 방식으로 진행
- 평가 배점: 전공적합성 50% / 인성 및 잠재력 50%
- 10개 문항을 다음 비율로 배분: 전공적합성 5문항, 인성 및 잠재력 5문항
- 전공적합성 문항: '전공 준비도(지원 동기, 학업계획)'와 '전공 탐구 노력(심화 탐구 수준, 교과 지식 활용 문제 해결)' 균형 있게 포함. 탐구 활동 언급 시 반드시 바탕이 되는 교과 개념/원리를 직접 설명하도록 요구하는 탐침(꼬리) 질문을 포함할 것 (예: "항산화 물질은 어떠한 원리로 항산화 효과를 내는지 설명하라", "산화환원 개념에 대해 설명하라")
- 인성 및 잠재력 문항: '자기평가력(스스로 세운 목표 대비 자기 평가/발전)' 2~3문항, '협력적 소통 능력(타인 존중/의견 표현/협력 경험)' 2~3문항
- 각 문항 말미에 반드시 다음 형식으로 면접 평가 기준을 명시하세요:
  - **📌 평가 항목**: [전공적합성/인성.잠재력] | **질문 의도**: [이 질문으로 확인하고자 하는 바를 한 문장으로 간략히]
- 강도 높은 집요한 탐침 질문(원리/공식/개념 설명 요구)을 반드시 포함할 것
` :
              targetUniv === "한국외국어대학교" ? `

[한국외국어대학교 면접 특이사항 - 필수 반영]
한국외국어대학교는 다음과 같은 고유한 면접 구조를 가집니다. 아래 기준을 10개 문항 전체에 반드시 반영하세요.
- 면접관 2인 x 지원자 1인, 10분 이내 진행
- 학생부 전체 공개 블라인드 면접 (이름/수험번호 등 비공개)
- 평가 배점: 학업 역량 40% / 진로 역량 40% / 공동체 역량 20%
- 10개 문항을 다음 비율로 배분: 학업 역량 4문항, 진로 역량 4문항, 공동체 역량 2문항
- 학업 역량 문항: 교과 수업 내 지적 호기심 확장 과정 확인. 탐구 내용의 핵심 개념을 설명하도록 요구하고, 학업 성취 과정에서의 문제 해결 능력을 검증할 것
- 진로 역량 문항: 진로 설계 과정의 자기주도성 확인. 교과 탐구 내용을 목표 전공이나 실제 사회 현상과 연결하여 심화 질문할 것
- 공동체 역량 문항: 공동체 가치관 및 리더십/협력 사례 확인
- 각 문항 말미에 반드시 다음 형식으로 면접 평가 기준을 명시하세요:
  - **📌 평가 항목**: [학업역량/진로역량/공동체역량] | **질문 의도**: [이 질문으로 확인하고자 하는 바를 한 문장으로 간략히]
- 단순 사실 확인보다 '지적 호기심 확장'과 '자기주도적 탐구'를 증명할 수 있는 심화 질문을 설계할 것
` :
                targetUniv === "세종대학교" ? `

[세종대학교 면접 특이사항 - 필수 반영]
세종대학교는 다음과 같은 고유한 면접 구조를 가집니다. 아래 기준을 10개 문항 전체에 반드시 반영하세요.
- 면접관 2인 x 지원자 1인, 9분 이내 블라인드 면접 (면접 내용 녹음됨)
- 평가 배점: 진로 역량 40% / 창의융합 역량 35% / 공동체 역량 25%
- 10개 문항을 다음 비율로 배분: 진로 역량 4문항, 창의융합 역량 3~4문항, 공동체 역량 2~3문항
- 진로 역량 문항: 지원 전공에 대한 기초 소양, 열정, 진로 계획 확인. 특히 탐구 활동의 '진위, 동기, 결과, 성장 과정'을 구체적으로 캐묻는 꼬리 질문 포함
- 창의융합 역량 문항: 종합적 사고력, 문제 해결 능력, 자기주도성 검증. '창의소프트 전형'인 경우 관련 전공(소프트웨어/디자인 등)에서 독창적인 아이디어와 융합적 사고를 묻는 질문 포함
- 공동체 역량 문항: 의사소통 능력, 시간 활용, 정직하고 성실한 태도 확인
- 각 문항 제목(h3) 바로 아래에 반드시 다음 형식으로 면접 평가 기준을 명시하세요:
  - **📌 평가 항목**: [진로역량/창의융합역량/공동체역량] | **질문 의도**: [이 질문으로 확인하고자 하는 바를 한 문장으로 간략히]
- 탐구 활동의 본질적 의미를 증명해야 하며, 지원 학과에 대한 통찰력을 묻는 심화 질문을 설계할 것
` :
                  targetUniv === "건국대학교" ? `

[건국대학교 면접 특이사항 - 필수 반영]
건국대학교는 다음과 같은 고유한 면접 구조를 가집니다. 아래 기준을 10개 문항 전체에 반드시 반영하세요.
- 면접관 2인 x 지원자 1인 진행 (면접관에게 학생의 교과 성적이 공개된 상태임)
- 평가 배점: 진로 역량 40% / 학업 역량 30% / 공동체 역량 30%
- 10개 문항을 다음 비율로 배분: 진로 역량 4문항, 학업 역량 3문항, 공동체 역량 3문항
- 진로 역량 문항: 전공 관련 교과 이수 노력 확인. 자기주도성, 창의적 문제 해결력 위주로 평가. 활동의 결과보다 '과정(How)'에 집중하여 질문할 것
- 학업 역량 문항: 기초 학업 성취도 및 지적 호기심/탐구력 확인. 특히 자연(이과)계열의 경우 수학/과학 교과 개념 원리를 깊이 있게 묻는 지식 검증형 질문을 반드시 포함할 것
- 공동체 역량 문항: 협업, 소통 능력, 나눔과 배려의 태도 확인
- 인문계열 지원자: 본인이 수행한 활동에 대한 본인만의 '생각과 가치관'을 묻는 질문 비중을 높일 것
- 각 문항 제목(h3) 바로 아래에 반드시 다음 형식으로 면접 평가 기준을 명시하세요:
  - **📌 평가 항목**: [진로역량/학업역량/공동체역량] | **질문 의도**: [이 질문으로 확인하고자 하는 바를 한 문장으로 간략히]
- 서류(생기부)에 기록된 활동의 구체적인 과정과 그 속에 담긴 원리를 꼼꼼하게 확인하는 질문들을 설계할 것
` :
                    targetUniv === "중앙대학교" ? `

[중앙대학교 면접 특이사항 - 필수 반영]
중앙대학교는 다음과 같은 고유한 면접 구조를 가집니다. 아래 기준을 10개 문항 전체에 반드시 반영하세요.
- 면접관 2인 x 지원자 1인, 10분 이내 블라인드 면접 진행
- 평가 배점: 학업 준비도 60% / 전공(계열) 적합성 30% / 의사소통 능력 및 인성 10%
- 10개 문항을 다음 비율로 배분: 학업 준비도 6문항, 전공 적합성 3문항, 의사소통/인성 1문항
- 학업 준비도 문항: 교과 기본 개념 이해 및 활용 능력 심층 검증. 지역 호기심을 바탕으로 한 자기주도적 탐구 과정과 성취 수준을 면밀히 평가할 것
- 전공(계열) 적합성 문항: 전공에 대한 관심과 준비 노력, 진로 탐색 과정의 충실성 확인
- 핵심 질문 설계 포인트: 활동의 결과뿐만 아니라 **'실험의 구체적 방법론'**과 **'중간 과정에서의 실패 요인 및 분석/해결 과정'**을 반드시 물어볼 것
- 의사소통/인성 문항: 답변의 논리성 및 공동체 가치관 확인
- 각 문항 제목(h3) 바로 아래에 반드시 다음 형식으로 면접 평가 기준을 명시하세요:
  - **📌 평가 항목**: [학업준비도/전공적합성/의사소통.인성] | **질문 의도**: [이 질문으로 확인하고자 하는 바를 한 문장으로 간략히]
- 단순 '느낀 점' 위주의 답변을 유도하지 말고, 탐구의 논리적 완결성을 검증하는 질문을 설계할 것
` :
                      targetUniv === "경희대학교" ? `

[경희대학교 면접 특이사항 - 필수 반영]
경희대학교는 다음과 같은 고유한 면접 구조를 가집니다. 아래 기준을 10개 문항 전체에 반드시 반영하세요.
- 면접관 2인 x 지원자 1인, 10분 이내 (의·약학 계열은 2개 면접실 각 6분) 블라인드 면접
- 평가 배점: 인성 50% / 전공적합성 50%
- 10개 문항을 다음 비율로 배분: 인성 5문항, 전공적합성 5문항
- 인성 문항: 창의적 노력, 진취적 기상, 건설적 협동 가치관 확인. 타인에 대한 공감 및 소통 능력, 성실성(출결 등)을 검증할 것
- 전공적합성 문항: 전공 기초 소양 및 학업 역량 확인. 사전에 도출된 '탐침 질문(꼬리 질문)' 형식으로 탐구 활동의 진위 여부를 깊이 있게 검증할 것
- 핵심 질문 설계 포인트: 수행한 실험이나 활동의 세부 **'과학적 원리'**를 완벽히 이해하고 있는지 집요하게 묻는 질문을 포함할 것 (예: DNA 전기영동 실험 언급 시 분자량과 이동 거리의 관계 등)
- 각 문항 제목(h3) 바로 아래에 반드시 다음 형식으로 면접 평가 기준을 명시하세요:
  - **📌 평가 항목**: [인성/전공적합성] | **질문 의도**: [이 질문으로 확인하고자 하는 바를 한 문장으로 간략히]
- 단순 활동 확인을 넘어 지원자의 답변에서 파생되는 심화 꼬리 질문을 설계하여 논리적 사고력을 유도할 것
` :
                        targetUniv === "서울과학기술대학교" ? `

[서울과학기술대학교 면접 특이사항 - 필수 반영]
서울과학기술대학교는 다음과 같은 고유한 면접 구조를 가집니다. 아래 기준을 10개 문항 전체에 반드시 반영하세요.
- 면접관 2인 x 지원자 1인, 10분 이내 블라인드 면접 (면접관에게 학생의 교과 성적이 공개된 상태임)
- 평가 배점: 진로 역량 40% / 학업 역량 35% / 공동체 역량 25%
- 10개 문항을 다음 비율로 배분: 진로 역량 4문항, 학업 역량 4문항, 공동체 역량 2문항
- 진로 역량 문항: 전공 관련 지식 이해도 및 진로 탐색 노력 확인. 활동의 **'적용 원리'**와 창의적 사고력을 중점적으로 물어볼 것
- 학업 역량 문항: 지적 호기심 및 탐구력 확인. 특히 학습 과정에서 발생한 문제를 어떻게 이해하고 분석하여 해결했는지(**'문제파악 및 분석 능력'**)를 비중 있게 검증할 것
- 핵심 질문 설계 포인트: 활동 자체의 나열보다 해당 활동을 선택한 구체적인 **'이유'**와 그 과정에 적용된 **'논리/원리'**를 깊이 있게 캐묻는 질문을 설계할 것
- 공동체 역량 문항: 협업, 소통, 리더십, 나눔과 배려, 성실성 확인
- 각 문항 제목(h3) 바로 아래에 반드시 다음 형식으로 면접 평가 기준을 명시하세요:
  - **📌 평가 항목**: [진로역량/학업역량/공동체역량] | **질문 의도**: [이 질문으로 확인하고자 하는 바를 한 문장으로 간략히]
- 자연계열 지원자: 학생부 활동과 연계된 교과 지식의 원리를 숙지하고 있는지 확인하는 심화 질문을 반드시 포함할 것
` :
                          targetUniv === "성균관대학교" ? `

[성균관대학교 면접 특이사항 - 필수 반영]
성균관대학교는 다음과 같은 고유한 면접 구조를 가집니다. 아래 기준을 10개 문항 전체에 반드시 반영하세요.
- 면접관 2인 x 지원자 1인, 10분 내외 심층 면접
- 평가 배점: 탐구역량 40% / 학업역량 40% / 잠재역량 20%
- 10개 문항을 다음 비율로 배분: 탐구역량 4문항, 학업역량 4문항, 잠재역량 2문항
- 탐구역량 문항: 전공적합성보다 **'지적 호기심과 탐구의 확장성'** 중점 확인. 한 주제를 학년별로 어떻게 심화시켰는지, 도전적인 과목을 어떻게 이수했는지 질문할 것
- 학업역량 문항: 학업수월성과 학업충실성 확인. 성적 추이와 수업 내 주도적 참여 자세를 검증할 것
- 잠재역량 문항: 리더십, 성실성, 공동체의식 및 역경 극복 의지 확인
- 각 문항 제목(h3) 바로 아래에 반드시 다음 형식으로 면접 평가 기준을 명시하세요:
  - **📌 평가 항목**: [탐구역량/학업역량/잠재역량] | **질문 의도**: [이 질문으로 확인하고자 하는 바를 한 문장으로 간략히]
` :
                            targetUniv === "한양대학교" ? `

[한양대학교 면접 특이사항 - 필수 반영]
한양대학교는 다음과 같은 고유한 면접 구조를 가집니다. 아래 기준을 10개 문항 전체에 반드시 반영하세요.
- 면접관 2인 x 지원자 1인, 10분 내외 블라인드 면접
- 평가 배점: 심층학업역량(비판적/창의적 사고) 40% / 기초학업역량 35% / 진로탐구역량 15% / 공동체역량 10%
- 10개 문항을 다음 비율로 배분: 심층학업역량 4문항, 기초학업역량 3문항, 진로탐구/공동체 3문항
- 심층학업역량 문항: **'왜?'**라는 질문을 통한 비판적 사고력과 문제 해결력 확인. 지식을 새로운 상황에 적용하는 능력을 집요하게 검증할 것
- 기초학업역량/진로탐구 문항: 전공보다 **'계열적합성'** 중심의 기본 역량 확인. 횡단평가 관점에서 여러 활동의 연결성과 일관적인 성장 스토리를 질문할 것
- 공동체역량 문항: 실질적 협업 경험과 긍정적 기여 사례 확인
- 각 문항 제목(h3) 바로 아래에 반드시 다음 형식으로 면접 평가 기준을 명시하세요:
  - **📌 평가 항목**: [심층학업역량/기초학업역량/진로탐구.공동체] | **질문 의도**: [이 질문으로 확인하고자 하는 바를 한 문장으로 간략히]
` :
                              targetUniv === "한국교원대학교" ? `

[한국교원대학교 면접 특이사항 - 필수 반영]
한국교원대학교는 다음과 같은 고유한 면접 구조를 가집니다. 아래 기준을 10개 문항 전체에 반드시 반영하세요.
- 면접관 3인 x 지원자 1인, 10분 내외 블라인드 면접
- 평가 배점: 전공 및 교직적합성 40% / 학업역량 30% / 교직인성 30%
- 10개 문항을 다음 비율로 배분: 전공 및 교직적합성 4문항, 학업역량 3문항, 교직인성 3문항
- 전공 및 교직적합성 문항: 학과 관련 교과 역량과 **계열적합성**, 교직에 대한 열정과 멘토링/봉사 경험 확인
- 학업역량 문항: 자기주도적 학습 태도 및 학업 발전 정도 확인
- 교직인성 문항: 나눔과 배려, 공감 및 의사소통 능력 검증
- 각 문항 제목(h3) 바로 아래에 반드시 다음 형식으로 면접 평가 기준을 명시하세요:
  - **📌 평가 항목**: [교직적합성/학업역량/교직인성] | **질문 의도**: [이 질문으로 확인하고자 하는 바를 한 문장으로 간략히]
` :
                                targetUniv === "광운대학교" ? `

[광운대학교 면접 특이사항 - 필수 반영]
광운대학교(광운참빛인재전형 등)는 최근 면접의 실질 영향력이 매우 커졌습니다(반영 비율 40%). 아래 기준을 10개 문항 전체에 반드시 반영하세요.
- 면접관 2인(입학사정관 1인, 교수 1인) x 지원자 1인, 10분 이내 블라인드 면접 (단, 면접관에게는 학생부 전체 및 성적이 공개된 상태임)
- 평가 배점: 발전 가능성 45% / 종합 사고력 30% / 인성 25%
- 10개 문항을 다음 비율로 배분: 발전 가능성 5문항, 종합 사고력 3문항, 인성 2문항
- 발전 가능성 문항: 전공 분야에 대한 지적 탐구 노력과 잠재력을 중점적으로 확인. 특히 전공과 관련된 탐구 활동의 **'선정 이유'**와 **'구체적인 준비 과정'**을 깊이 있게 질문할 것. SW 관련 학과의 경우 SW 경험의 진정성을 강조할 것
- 종합 사고력 문항: 질문 요지 수용 능력 및 답변의 논리성, 의사소통 능력 확인. 서류 상에 드러난 소통 역량 검증을 포함할 것
- 인성 문항: 공동체적 가치관과 면접 임하는 태도, 문제 해결 과정에서의 협업 정신 확인. 특히 활동 중 부딪힌 문제를 어떻게 해결하려고 노력했는지(**'문제 해결 과정'**) 질문할 것
- 각 문항 제목(h3) 바로 아래에 반드시 다음 형식으로 면접 평가 기준을 명시하세요:
  - **📌 평가 항목**: [발전가능성/종합사고력/인성] | **질문 의도**: [이 질문으로 확인하고자 하는 바를 한 문장으로 간략히]
` :
                                  targetUniv === "동국대학교" ? `

[동국대학교 면접 특이사항 - 필수 반영]
동국대학교 도드림(DoDream) 전형은 전공적합성이 매우 중요합니다(실질 영향력 40% 이상). 아래 기준을 10개 문항 전체에 반드시 반영하세요.
- 면접관 2인(입학사정관 1인, 교수 1인) x 지원자 1인, 10분 이내 블라인드 면접 (단, 면접관에게는 학생부 전체 및 성적이 공개된 상태임)
- 평가 배점: 전공적합성 30% / 발전가능성 30% / 전형취지적합성 20% / 인성 및 사회성 20%
- 10개 문항을 다음 비율로 배분: 전공적합성 3문항, 발전가능성 3문항, 전형취지적합성 2문항, 인성 및 사회성 2문항
- 전공적합성 문항: 지원 학과의 **'전공 세부 지식'** 및 활동의 진실성 확인. 학과 가이드북 수준의 깊이 있는 질문을 던질 것
- 발전가능성 문항: 자기주도적 문제 해결 능력 및 목표 의식 확인. 특히 실패를 어떻게 극복했는지 집중 질문할 것
- 전형취지적합성 문항: 동국대 인재상에 부합하는 적극적이고 주도적인 고교 활동 참여 태도 검증
- 인성 및 사회성 문항: 협업 능력, 공감 능력 확인. 특히 **'출결 상황(미인정 지각/결석/조퇴)'**이 있다면 반드시 그 사유와 개선 노력을 묻는 질문을 포함할 것
- 각 문항 제목(h3) 바로 아래에 반드시 다음 형식으로 면접 평가 기준을 명시하세요:
  - **📌 평가 항목**: [전공적합성/발전가능성/전형취지적합성/인성및사회성] | **질문 의도**: [이 질문으로 확인하고자 하는 바를 한 문장으로 간략히]
` :
                                    targetUniv === "인하대학교" ? `

[인하대학교 면접 특이사항 - 필수 반영]
인하대학교는 '학업을 중심으로 한 진로 탐구 역량'을 집중 평가하는 면접입니다. 아래 기준을 10개 문항 전체에 반드시 반영하세요.
- 전임 입학사정관 + 위촉 사정관(전공 교수) 총 2인 × 지원자 1인, 10분 이내 블라인드 면접
- 면접관에게 학생부 전체 공개 상태이며, 면접관이 직접 학생부 내용을 바탕으로 질문을 작성
- (일부 전형/학과는 2개 면접실을 돌며 각 7~8분씩 진행: 1실=기초학업+진로탐구, 2실=진로탐구+의사소통)
- 합격 역전률 유의미: 2배수 내 학생의 34.3%, 3배수 내 학생의 22.1%가 면접으로 역전 합격
- 최종 선발: 1단계 서류 70% + 2단계 면접 30% 합산

【핵심 평가 3요소 및 배점】
- 진로(탐구)역량 (50%): 활동 동기 → 탐구 과정 → 해결 방안 도출의 흐름을 깊이 있게 질문. 4~5문항 배분
  예시 질문 패턴: "○학년 ○○ 활동에서 ○○ 주제에 관심을 갖게 된 동기는?", "이에 대한 해결 방안을 생각해본 적 있다면?"
- 기초학업역량 (30%): 교과 수업에서 배운 개념·법칙을 정확히 이해하는지 확인. 3문항 배분
  예시 질문 패턴: "○학년 ○○ 세특을 보니 ○○에 관심 많았던 것 같은데, ○○이 무엇인지 설명해 주세요."
- 의사소통/공동체역량 (20%): 협력적 태도, 배려·나눔 사례를 구체적 경험 중심으로 질문. 2문항 배분
  예시 질문 패턴: "○학년 ○○에서 협력 모습이 기록되어 있는데, 어떤 노력을 했는지 설명해 주세요."

【문항 설계 핵심 원칙】
- 반드시 학생부 세특/자율/진로/행특의 구체적 내용을 직접 인용하며 질문을 시작할 것 (예: "○학년 ○○ 세특을 보니~")
- 진로탐구 문항: 단순 활동 나열이 아닌 '탐구 동기 → 과정 → 해결·성장'의 흐름을 꼬리 질문으로 검증
- 기초학업 문항: 교과 개념/법칙의 정의를 직접 설명하도록 요구하는 지식 검증형 질문 필수 포함
- 각 문항 제목(h3) 바로 아래에 반드시 다음 형식으로 면접 평가 기준을 명시하세요:
  - **📌 평가 항목**: [진로탐구역량/기초학업역량/의사소통.공동체역량] | **질문 의도**: [이 질문으로 확인하고자 하는 바를 한 문장으로 간략히]
` :
                                      targetUniv === "아주대학교" ? `

[아주대학교 면접 특이사항 - 필수 반영]
아주대학교는 학생부에 기재된 활동의 진위를 검증하는 '서류 신뢰도'를 압도적으로 중시하는 면접입니다. 아래 기준을 10개 문항 전체에 반드시 반영하세요.
- 전임 입학사정관 + 위촉 사정관 총 2인 × 지원자 1인, 10분 이내 블라인드 면접
- 면접관에게 학생부 전체 공개 상태이며, 기본 교과 활동의 과정과 진위 여부를 중점 확인
- (의과대학 지원자는 MMI 방식: 2개 면접실 × 각 약 10분, 인문사회·상황면접 + 서류확인면접)
- 면접 역전률: 평균 약 30% (학과별 상이)
- 최종 선발: 1단계 서류 70% + 2단계 면접 30% 합산

【핵심 평가 2요소 및 배점】
- 서류 신뢰도 (80%): 학업역량·진로역량·공동체역량을 종합적으로 평가. 8~9문항 배분
  ① 학업역량: 교과(실험 포함)에서 배운 개념·원리를 정확히 이해하고 있는지 검증
     예시 패턴: "○○ 실험을 진행했는데, 이 실험의 원리와 과정에 대해 설명해 주세요."
  ② 진로역량: 활동의 동기, 본인의 구체적 역할, 성취 과정을 깊이 있게 확인
     예시 패턴: "○○ 활동에서 본인의 구체적인 역할에 대해 설명해 주세요."
  ③ 공동체역량: 협력·배려·나눔·리더십 등 공동체 기여 사례를 구체적으로 확인
     예시 패턴: "○○ 봉사 경험을 통해 자신이 성장한 점에 대해 설명해 주세요."
- 의사소통능력 및 태도 (20%): 질문의 요지를 정확히 파악하고 체계적·논리적으로 답변하는지 현장 평가. 1~2문항 배분

【문항 설계 핵심 원칙】
- 학생부에 기재된 모든 활동(교과 실험, 동아리, 봉사, 행특 등)의 구체적 과정을 반드시 인용하며 질문
- 화려한 활동보다 '그 활동이 진짜 본인의 역량인가'를 검증하는 방향으로 질문 설계
- 교과 실험 언급 시 반드시 실험 원리·방법·결과를 설명하도록 요구하는 질문 포함
- 각 문항 제목(h3) 바로 아래에 반드시 다음 형식으로 면접 평가 기준을 명시하세요:
  - **📌 평가 항목**: [서류신뢰도(학업역량/진로역량/공동체역량)/의사소통태도] | **질문 의도**: [이 질문으로 확인하고자 하는 바를 한 문장으로 간략히]
` : targetUniv === "국민대학교" ? `

[국민대학교 면접 특이사항 - 필수 반영]
국민대학교는 **입학사정관 2인** (기존 3인에서 2026학년도 변경됨)과 지원자 1명이 마주하는 **개별 맞춤형 면접**입니다. 아래 기준을 10개 문항 전체에 반드시 반영하세요.

【평가 체계】
- **평가 비중**: 1단계 서류평가 70% + 2단계 면접 30% 합산 (최종 결정)
- **면접 방식**: 1단계에서 3배수 선발 후, 2단계 면접으로 최종 합격 결정
- **면접 시간**: 지원자 1명당 **10분 이내**
- **면접 자료**: 학교생활기록부를 바탕으로 한 **서류 확인 면접** (맞춤형 질의응답)
- **블라인드 면접**: 교복/교표 착용 금지, 무작위 '가번호'로 입실 (고교 유추 방지)

【핵심 평가 항목 및 배점 (총 100점)】
- **① 전공적합성 (40점 - 가장 높은 비중)**: 지원 전공에 대한 이해도와 전공 관련 학업 능력 및 태도
  - 전공 선택 동기의 명확성
  - 전공과 연계된 교과 학습 깊이
  - 관련 활동들의 일관성과 진정성
  
- **② 자기주도성 및 도전정신 (30점)**: 고교 생활 중 주도적으로 수행한 교내 활동의 '진정성' 확인
  - 활동 선택/참여의 자발성과 동기
  - 문제 상황에서 주도적으로 해결한 경험
  - 도전적인 활동 경험과 성장 과정
  
- **③ 인성 (30점)**: 면접에 임하는 태도와 질문의 요지를 정확히 파악하여 대답하는 의사소통 능력
  - 질문 이해도 및 논리적 답변
  - 성실함과 진솔함 (버벅거려도 괜찮음, 정직한 답변 중시)
  - 협력적 태도와 공감 능력

【주요 면접 질문 유형 (입학사정관의 '꼬리 질문' 중심)】
- **생활 속 사례 확인형**: 교우 관계의 갈등 조정 사례, 무단 지각/조퇴의 사유, 행동특성에 적힌 쟁점 상황 등을 구체적으로 묻는 질문
- **선택 이유 확인형**: 특정 선택과목 이수 이유 (예: 확률과 통계 대신 미적분 선택), 동아리/활동 선택 이유 등
- **연구 방법 이해도 확인형**: 탐구보고서의 가설 설정 방식, 설문조사 표본 집단 설정 기준, 실험 설계 원리 등 탐구의 논리성 점검
- **팀 프로젝트 역할 확인형**: 조별 활동에서 본인의 '구체적 역할'(설계, 코딩, 분석 등), 성공/실패 요인 등을 구체적으로 확인
- **지식 획득 및 탐구력 확인형**: 생기부에 기록된 도서/활동을 통해 배운 개념 설명, 특정 주제에 대한 깊이 있는 비판적 사고력 요구

【문항 설계 핵심 원칙】
- **서류 완벽 숙지 및 '설명' 연습**: 생기부 내용을 진정으로 깊이 있게 탐구했는지 파악. 단순 제목이 아닌 원리·개념·배운 점을 명확히 설명 가능해야 함
- **키워드 중심의 답변 구성**: 완전한 대사를 통째로 외우지 말기. 본인의 활동(동기-과정-결과-배운점)을 **핵심 키워드 위주로 정리**하여 어떤 꼬리질문이 나와도 유연하게 조합하며 대답하기
- **모의면접을 통한 태도 교정**: 낯선 환경에서 10분이라는 짧은 시간 동안 자신을 보여주기 위해, 선생님/친구와 **실제처럼 문을 열고 들어와 인사→답변→퇴장**하는 모의면접을 거듭 실시 (동영상 촬영 권장)
- **꼬리 질문 대비**: 질문을 받으면 **질문의 요지를 정확히 파악**한 후 답변. 예측하지 못한 질문이 나와도 당황하지 않고 성실하게 생각할 시간 요청 가능
- 각 문항 제목(h3) 바로 아래에 반드시 다음 형식으로 면접 평가 기준을 명시하세요:
  - **📌 평가 항목**: [전공적합성/자기주도성및도전정신/인성] | **질문 의도**: [이 질문으로 확인하고자 하는 바를 한 문장으로 간략히]

【학생이 알아야 할 실전 팁】
1. **버벅거려도 괜찮음**: 면접관은 질책하는 자리가 아니라 학생을 알아보려는 목적이므로, 바로 답이 나오지 않으면 **"생각할 시간을 주세요"** 요청 가능
2. **질문 요지 정확히 파악**: 질문을 받으면 먼저 **질문이 무엇을 묻고 있는지 이해**한 후 답변하기
3. **성실함과 진솔함 중시**: 완전한 답변보다 **진정한 태도**가 더 중요함
4. **선택 이유의 명확화**: 특정 과목/활동을 선택한 **구체적 동기**를 명확하게 준비하기
5. **블라인드 면접 준비**: 가번호로 호출되므로 신경 쓸 필요 없음. 편한 마음으로 자신의 경험 이야기하기

【주의사항】
- 모든 문항이 생기부 원문 인용으로 시작해야 함
- 단순 사실 나열이 아닌, '왜 했는가?', '무엇을 배웠는가?', '어떤 의미인가?'를 캐묻는 깊이 있는 질문
- 전공적합성(40점)이 가장 높은 배점이므로, 40% 비율의 문항으로 집중 설계
- 자기주도성·도전정신·인성이 균형 있게 분포하는 10문항 구성
` : targetUniv === "단국대학교" ? `

[단국대학교 면접 특이사항 - 필수 반영]
단국대학교 학생부종합 면접은 **진로역량(50%)**을 가장 중점적으로 평가하는 것이 가장 큰 특징입니다. 지원 계열과 전공에 대한 실질적인 관심 정도와 탐색 활동의 깊이를 검증하는 방향으로 출제하세요.

【면접 대상 전형】
- DKU인재(면접형), SW인재, 창업인재
- 교육기회배려자(약학계열), 농어촌학생(의학계열)
- 해병대군사학과 (별도 추가 평가 사항 있음)

【평가 비중 및 선발 구조】
- **1단계**: 서류평가 100% → 모집인원의 3~5배수 선발
- **2단계**: 1단계 성적 70% + 면접 30% 합산 (최종 합격 결정)
- ※ 해병대군사학과 예외: 서류 80% + 면접 10% + 체력평가 등 10%

【면접 진행 방식】
- **면접 형태**: 학교생활기록부 등을 바탕으로 한 **서류 확인 면접**
- **면접 인원**: 입학사정관 2~3인 + 지원자 1인 (다대일 면접)
- **면접 시간**: 학생 1인당 **10분 이내**
- **블라인드 면접**: 출신 교복·단체복 착용 금지, 무작위 '가번호' 호출, 개인신상정보 언급 금지

【핵심 평가 요소 및 배점】
① **진로역량 (50점 - 가장 중요)**
  - 지원 계열(전공)에 대한 실질적 관심도 및 이해도
  - 고교 생활 중 계열/전공 관련 진로 탐색 활동의 현황 및 성과
  - (SW인재/창업인재: 해당 분야의 깊이 있는 관심 및 활동 성과 중점 평가)
  - (해병대군사학과: 국가·국민 수호 관련 올바른 가치관 및 국가·안보관 추가 확인)

② **발전가능성 (30점)**
  - 목표 및 진로 계획에 대한 분명한 의지 및 태도
  - 대학 입학 후 구체적 성장·발전 방향의 현실성

③ **공동체역량 (20점)**
  - 교내 협력 활동 및 공동체 활동 참여 태도
  - 질문의 요지를 정확히 이해하고 논리적으로 표현하는 능력
  - 전달력 및 소통능력

【단국대학교 면접 예상 질문 유형】
1. **진로역량 진단 질문** (50% 비중 - 가장 중요)
   - "지원 계열에 대하여 관심을 가지게 된 계기는 무엇입니까?"
   - "고교 생활 중 계열 관련 진로를 탐색하기 위해 했던 활동은 무엇입니까?"
   - "희망 진로를 탐색하는 과정 중 가장 의미 있는 활동이나 경험은 무엇이었습니까?"
   - "진로 탐색 활동을 통해 배우고 느낀 점에 대해 설명해 주세요."

2. **발전가능성 증명 질문** (30% 비중)
   - "입학 후 본인의 구체적인 진로 계획은 무엇입니까?"
   - "이 대학의 이 학과에서 무엇을 배우고 성장하고 싶습니까?"
   - "현재의 진로 목표를 선택한 이유와 그것을 이루기 위한 계획은?"

3. **공동체역량 평가 질문** (20% 비중)
   - "OO 교과/동아리에서 친구들과 협력하여 활동했을 때 본인의 역할과 기여는 무엇이었습니까?"
   - "공동체 활동에서 가장 기억에 남는 경험은 무엇이고, 거기서 무엇을 배웠습니까?"
   - "어려웠던 상황에서 팀원들과 어떻게 소통하고 협력했습니까?"

【서류 확인 면접 예상 흐름】
입학사정관이 학생부를 읽으면서 실시간으로 질문하는 형식입니다:
1. 자기소개 또는 진로 선택 동기
2. 학생부의 특정 활동 언급하며 구체적 질문 (What-Why-How)
3. 진로 계획 및 입학 후 포부
4. 공동체 협력 경험 및 성장 사례

【학생 준비 방법 (필수)】
**Step 1: 학생부 'What-Why-How' 정리**
- What: 어떤 활동을 했는가?
- Why: 왜 그 활동을 했는가? (동기, 관심사)
- How: 어떻게 수행했고, 어떻게 심화했으며, 무엇을 배웠는가?
- 특히 각 활동이 **진로와 어떻게 연결되는지** 명확히 할 것

**Step 2: 진로 탐색 활동의 진정성 강조**
- 단순 활동 나열이 아닌, 각 활동이 진로 선택에 준 영향 설명
- 여러 활동이 자연스럽게 전공으로 수렴되는 **일관성** 보이기

**Step 3: 모의면접 반복 연습**
- 10분 내에 자신의 진로 열정을 논리적으로 설득할 수 있도록 연습
- 답변을 '키워드' 중심으로 구성 (완전 암기 지양)
- 입실→서류 확인 면접→퇴장의 전체 절차를 실제처럼 연습

【각 문항 설계 원칙】
- 모든 문항 제목(h3) 바로 아래에 반드시 다음 형식으로 명시:
  - **📌 평가 항목**: [진로역량 50% / 발전가능성 30% / 공동체역량 20%] | **질문 의도**: [확인 내용을 한 문장으로]
- 모든 문항이 학생부 원문을 직접 인용하며 시작
- 진로역량 관련 문항을 40% 이상 비중으로 설계 (총 10문항 기준 4~5문항)
- 발전가능성 관련 문항 30% (3문항), 공동체역량 20% (2문항)

【주의사항】
- 단국대학교는 **진로역량 50%**이 핵심이므로 이 부분에 문항 비중을 맞춘 설계
- 공동체란 단순 봉사·동아리가 아닌 친구들 협력, 조별활동 기여, 학급 운영 참여 등 포함
- 진로 탐색이 "진정한" 관심에서 비롯되었는지 확인 (입시용 활동으로 보이는 지양)
- 학생부 내용을 정확히 기억하고 있어야 함 (서류 확인 면접이므로 실시간 질문)
` : targetUniv === "부산대학교" ? `

[부산대학교 면접 특이사항 - 필수 반영]
부산대학교 학생부종합전형(학생부종합전형, 지역인재전형)은 제출 서류(학생부) 기반 면접으로, 활동의 진실성 검증과 대학 수학 능력(탐구역량) 확인을 가장 중요하게 생각합니다. 단순히 말솜씨가 아닌 '자기주도적 학업 역량'을 중점 평가하도록 설계하세요.

【전공별 면접 방식 및 핵심 평가 역량】
① 일반 모집단위 (대부분 학과)
   - **면접 형식**: 학생부 기반 개별 면접 (10분 내외)
   - **평가 역량**: 탐구역량 + 사회역량
② 의과대학 의예과 (※ 별도 추가 면접 진행)
   - **면접 형식**: 공통문제 답변 면접 (10분 내외, 사전문석 10분) + 학생부 기반 면접 (10분 내외)
   - **평가 역량**: 잠재역량(종합적 사고력/지식활용능력) + 탐구역량 + 사회역량

【핵심 평가 요소 및 세부 주안점】
면접관이 진짜 보고 싶어 하는 본질적 기준을 바탕으로 문항을 출제하세요.

- **① 탐구역량**: 관심 분야(전공)에 대한 주도적 학업역량 및 자기계발
  - 관심 분야 교과목 이수 노력 및 지적 호기심
  - 수업·활동 중 보여준 학업 태도와 탐구의 '깊이'
  - (의예과 잠재역량 평가 시 논리적 의사표현 및 종합 사고력 포함)
  
- **② 사회역량**: 공동체 의식과 인성
  - 공동체 생활 내 협업능력, 리더십, 의사소통능력
  - 학교생활의 성실성과 규칙 준수
  - 도덕성, 윤리성, 긍정적 가치관, 배려·봉사심의 '진정성'

- **③ 서류 신뢰도(활동의 진실성)**: 면접의 가장 중요한 기능
  - 서류에 적힌 탐구, 수상, 독서 등을 실제로 본인이 깊이 있게 수행했는지 철저한 **꼬리 질문**으로 검증

【부산대학교 면접 예상 질문 유형】
1. **서류 진실성/탐구역량 검증 꼬리 질문 (가장 중요)**
   - "생기부에 OO주제로 탐구를 진행했다고 되어 있는데, 구체적인 원리(또는 가설)를 설명해 보시오."
   - "OO동아리에서 OO실험을 주도했다고 하는데, 실험 중 실패했던 경험이나 예상과 달랐던 결과는 무엇이고 어떻게 해결했는가?"
   - "OO책을 읽고 OO분야에 관심을 가졌다고 하는데, 책에서 가장 인상 깊었던 구절과 그 이유를 본인의 진로와 엮어 설명하시오."
   
2. **자기성장 노력 및 전공 열정 질문**
   - "우리 학과(전공)에 지원하기 위해 고등학교 3년 동안 가장 꾸준히 노력한 것은 무엇입니까?"
   - "단순히 성적을 올리기 위한 공부가 아니라, 지적 호기심을 가지고 깊이 파고들어 본 경험이 있습니까?"
   
3. **사회역량 및 공동체 질문**
   - "조별 과제 시 참여하지 않는 친구가 있었을 때, 어떤 리더십(또는 팔로워십)을 발휘하여 협동을 이끌어냈습니까?"
   - "학교생활 중 규칙을 준수하거나 타인을 배려하기 위해 자신의 손해를 감수했던 경험이 있다면?"

【학생 준비 팁 (면접관 권장 사항)】
**1. 스스로 질문지 만들기 (가장 효과적)**
- 면접관의 시선에서 본인 생기부의 "꼬리 질문" 유추하기
- 학원/컨설팅보다 본인 서류의 '구체적 과정'을 완벽 숙지하는 것이 중요

**2. 시작과 끝 준비**
- 10분이라는 짧은 시간 동안 긴장 완화를 위해, '지원 동기를 포함한 짤막한 자기소개'와 '마지막 맺음말' 미리 준비

**3. 단답형 회피 및 소통 태도**
- '네/아니오' 식의 짧은 대답은 열정 부족으로 보일 수 있음
- 눈을 맞추고 논리적으로 설명하는 태도 연습

【각 문항 설계 방침】
- 모든 문항의 제목(h3) 바로 아래에 반드시 다음 형식으로 명시하세요:
  - **📌 평가 항목**: [탐구역량(서류신뢰도) / 사회역량(인성)] | **질문 의도**: [이 질문으로 확인하고자 하는 바를 한 문장으로 간략히]
- 모든 질문은 반드시 지원자의 **생기부 기록 내용의 인용**으로 시작해야 합니다.
- 단순 사실 확인을 넘어 과정, 원리, 한계점, 배운 점을 캐묻는 **검증형 꼬리 질문 패턴**을 많이 포함하세요.
- 총 10문항 중 '탐구역량(서류진실성 검증)' 7문항, '사회역량' 3문항 비율로 구성하세요.
` : targetUniv === "인천대학교" ? `

[인천대학교 면접 특이사항 - 필수 반영]
인천대학교 학생부종합전형(자기추천전형, 특수교육대상자전형 등) 면접은 철저히 **제출 서류(학교생활기록부)에 기반한 확인 면접**입니다. 구술 문제 없이 학생부 활동의 진위 및 구체적인 역할을 묻는 파생(꼬리) 질문을 중심으로 설계하세요.

【면접 기본 형식】
- **평가자 및 시간**: 입학사정관 등 면접위원 2인 vs 지원자 1인 / 10분 내외
- **블라인드 면접 준수**: 가번호 부여. 성명, 출신고교, 부모 및 친인척 신상 정보 언급 절대 금지 (위반 시 불이익)

【핵심 평가 요소 및 배점 (총 150점)】
- **① 진로역량 (30%)**: 지원 학과에 대한 열정, 흥미, 진로 탐색 과정과 노력
  - 지원 동기의 명확성과 학업 계획의 구체성
  - 전공 관련 기초 학업 역량 및 관심도
- **② 발전역량 (30%)**: 문제 해결 과정에서의 논리성, 창의성, 융합적 사고
  - 창의적 체험활동에서의 주도성
  - 새로운/어려운 과제에 도전하여 해결하고자 한 노력 (가장 중요한 변별 요소)
- **③ 공동체역량 (20%)**: 인성 및 가치관
  - 학교생활의 충실성, 책임의식, 리더십
  - 나눔, 배려, 협력, 갈등 관리, 역경 극복 경험
- **④ 의사소통능력 (20%)**: 면접 태도 및 표현력
  - 질문의 요지 파악 능력 및 조리 있는 전달력
  - 표현의 진실성

【인천대학교 면접 예상 질문 패턴】
1. **발전역량 (도전 및 문제해결) 질문** (가장 구체적인 꼬리질문 필요)
   - "OO실험/보고서를 작성할 때 본인이 맡은 구체적인 역할은 무엇이었나요?"
   - "이 활동을 하면서 가장 어려웠던 점은 무엇이고, 그것을 어떻게 극복했나요?"
   - "오류가 발생했을 때 어떤 논리적 과정을 거쳐 원인을 찾고 개선했나요?"
2. **진로역량 질문**
   - "OO활동이 본인의 진로(지원 학과)에 어떤 영향을 미쳤나요?"
   - "대학 입학 후 이 분야에 대해 구체적으로 어떤 학업 계획을 가지고 있나요?"
3. **공동체역량 질문**
   - "OO동아리/팀 프로젝트에서 갈등이 있었을 때, 본인은 어떤 방식으로 해결에 기여했나요?"

【학생 준비 방법 (필수 안내)】
**1. 파생(꼬리) 질문 완벽 대비**
- 단순한 교과 지식을 묻지 않으므로, 본인이 수행한 활동의 '구체적인 역할', '실패/어려움과 개선 방법'에 대해 깊이 있게 준비할 것
**2. 키워드 중심의 구조화 연습**
- 대본을 통째로 외우기보다 주요 키워드를 중심으로 "왜 했는지(Why) - 무엇을 했는지(What) - 무엇을 느꼈는지(How/Feel)" 3단계로 말하는 연습 권장
**3. 모의면접 적극 활용**
- 실전처럼 문을 열고 들어가는 것부터 시작해, 자신의 발성, 속도, 시선 처리를 점검하기

【각 문항 설계 원칙】
- 모든 문항 제목(h3) 바로 아래에 반드시 다음 형식으로 명시:
  - **📌 평가 항목**: [진로역량 30% / 발전역량 30% / 공동체역량 20% / 의사소통능력 20%] | **질문 의도**: [확인하고자 하는 바를 1문장으로 간략히]
- 모든 질문은 반드시 지원자의 **생기부 기록 내용의 인용**으로 시작해야 합니다.
- 단순 확인이 아닌, '실패 극복 과정', '주도적 해결 노력', '구체적 역할'을 묻는 **파생(꼬리) 질문 패턴**을 다수 포함하세요.
- 총 10문항 중 발전역량(도전/문제해결) 4문항, 진로역량 3문항, 공동체/의사소통 3문항 비율로 구성하세요.
` : targetUniv === "가톨릭대학교" ? `

[가톨릭대학교 면접 특이사항 - 필수 반영]
가톨릭대학교 학생부종합전형(잠재능력우수자면접 등) 면접은 **진로 역량(50%)**을 가장 중점적으로 평가하는 서류 기반 맞춤형 확인 면접입니다. 지원자의 생기부를 기반으로 전공에 대한 관심과 서류의 진위 여부를 확인하도록 설계하세요.

【면접 기본 형식】
- **면접 대상**: 잠재능력우수자면접전형, 가톨릭지도자추천전형, 학교장추천전형 등
- **진행 방식**: 지원자 1인 vs 면접관 2인 이상 (다대일 개별 면접)
- **면접 시간**: 10분 내외 (단, 의예과는 20분 내외)
- **블라인드 면접 규칙**: 교복 불가, 성명/고교명/부모 직업 등 사회·경제적 배경 언급 시 불이익

【핵심 평가 요소 및 배점】
- **① 진로 역량 (50% - 가장 높은 비중)**
  - 지원 전공(계열)에 대한 관심과 열정
  - 진로 관련 교과/비교과 활동 및 진로 탐색 역량
  - 답변의 논리성과 독창성
- **② 학업 역량 (30%)**
  - 학습 의지와 노력, 탐구활동을 통한 지식 확장 성과
  - 전공 관련 학업 역량 및 태도
  - 서류 내용의 진위 여부 (정확한 이해를 바탕으로 설명하는가)
- **③ 공동체 역량 (20%)**
  - 대인관계 능력, 협업 및 의사소통 능력
  - 나눔, 배려, 협력의 실천 경험

【가톨릭대학교 면접 예상 질문 패턴】
1. **진로 역량 질문 (가장 큰 비중)**
   - "OO활동이 본인이 지원한 전공(학과)과 어떤 연관이 있다고 생각하며, 이를 통해 배운 점은 무엇인가요?"
   - "희망 진로를 위해 고교 시절 가장 주도적으로 탐구했던 활동은 무엇이고, 그 결과 본인의 생각이 어떻게 확장되었나요?"
2. **학업 역량 질문 (서류 진위 확인 및 지식 확장)**
   - "OO과목 세특에 적힌 탐구 보고서의 주요 결론은 무엇이었으며, 그 과정에서 새롭게 알게 된 원리는 무엇인가요?"
   - "이 실험을 하면서 가장 어려웠던 학업적 난관은 무엇이었고, 이를 어떻게 학업적 노력으로 극복했나요?"
3. **공동체 역량 질문**
   - "OO팀 프로젝트에서 본인이 팀의 협업을 위해 구체적으로 어떤 역할을 했는지 사례를 들어 설명해주세요."

【각 문항 설계 원칙】
- 모든 문항 제목(h3) 바로 아래에 반드시 다음 형식으로 명시:
  - **📌 평가 항목**: [진로 역량 50% / 학업 역량 30% / 공동체 역량 20%] | **질문 의도**: [확인하고자 하는 바를 1문장으로 간략히]
- 모든 질문은 반드시 지원자의 **생기부 기록 내용의 인용**으로 시작해야 합니다.
- 가톨릭대학교는 '진로 역량'의 비중이 50%로 가장 높으므로, 진로 및 전공적합성 관련 문항을 총 10문항 중 5문항 비율로 구성하세요.
- 학업 역량(지식 확장 및 진위 확인) 3문항, 공동체 역량 2문항 비율로 배치하세요.
` : targetUniv === "서울대학교" ? `

[서울대학교 면접 특이사항 - 필수 반영]
서울대학교 학생부종합전형은 매우 체계적인 면접 구조를 가졌으며, **서류 기반 면접**을 중심으로 학생의 실질적 경험과 학업 소양을 깊이 있게 평가합니다.

【주요 면접 유형 분류】
① **서류 기반 면접** (가장 주요 면접): 지원자가 제출한 학생부 내용을 확인하고 기본적인 학업 소양 평가 (10분 내외, 답변준비시간 없음)
   - 대상: 지역균형전형, 기회균형특별전형(사회통합), 정시 기회균형특별전형
② 제시문 기반 면접: 고등학교 교육과정 내 제시문을 바탕으로 문제 해결 능력 평가 (15분, 30~45분 준비시간)
③ 의과대학 면접: 서류 기반 + 제시문 기반을 복수 면접실에서 진행 (60분 내외)
④ 사범대학 교직적성·인성 면접: 교사 자질과 교직 소명 평가 (15분)

【서류 기반 면접의 핵심 진행 방식】
- **절차**: 신분확인 → 유의사항 안내 → 순서가 되면 **곧바로** 면접실로 이동하여 면접 시작 (별도 준비시간 없음)
- **형식**: 복수의 면접위원 × 지원자 1명, 블라인드 방식, 10분 내외
- **특징**: 면접위원이 학생부를 직접 읽으면서 질문을 던지므로, 학생도 자신의 학생부 내용을 명확히 기억하고 있어야 함

【서류 기반 면접의 평가 기준 및 배점】
서울대는 단순 정답이나 발표 기술이 아니라, **학생부 활동이 지원자에게 실질적으로 어떤 의미를 주었는지**를 깊이 있게 확인합니다.

- **학업소양 (40%)**: 교과 수업 내 탐구의 실질적 깊이 (3~4문항)
  핵심 평가 포인트: 
  ① 학생부 세특에 기재된 탐구 활동(실험/보고서/심화학습)의 원리·개념을 정확히 이해하는가?
  ② '그 활동을 왜 시작했는가?', '그 과정에서 무엇을 배웠는가?', '자신에게 어떤 의미가 있었는가?'를 깊이 있게 설명하는가?
  ③ 예상 밖의 결과나 한계점을 마주했을 때 어떻게 해결하려 했는가?

- **전공적합성 (35%)**: 활동의 일관성과 목표 학과와의 진정한 연계도 (3~4문항)
  핵심 평가 포인트:
  ① 여러 활동들(수업·동아리·봉사·진로활동 등)이 선택된 전공으로 자연스럽고 유기적으로 연결되는가?
  ② 목표 학과에 대한 관심이 언제부터, 어떻게 형성되었으며, 활동을 통해 어떻게 확인되었는가?
  ③ 지원자가 그 학과에서 구체적으로 무엇을 배우고 싶은가?

- **인성 및 의사소통 (25%)**: 공동체 속에서 드러나는 따뜻함과 배려 (2~3문항)
  핵심 평가 포인트:
  ① 행특·동아리·봉사 기록에서 보이는 따뜻함, 공감, 존중의 태도가 실질적인가?
  ② 협력 경험에서 본인이 구체적으로 어떤 노력을 했는가?
  ③ 어려운 상황에서 어떤 태도를 취했는가? (절차 따르기, 타인 배려 등)

【면접 질문의 패턴】
서울대 면접은 "정답"을 묻는 것이 아닙니다. 오히려:
- 학생이 답변을 완성하지 못해도, 자신의 생각을 **논리적으로 설명하려는 태도**를 평가
- 예상과 다른 답변이 나와도, 그것을 정당화할 수 있는가를 확인
- 모르는 부분을 마주했을 때 어떻게 반응하는가를 봄

【예상 질문의 특성】
서울대 면접에서 나오는 질문들은 매우 **예측 불가능**하고 **깊이 있는 꼬리질문**이 중심입니다:
- 생활기록부에 기재된 내용을 소재로 하지만, 그 이상의 깊이를 요구
- 반대 관점이나 다른 측면에서의 접근을 제시 (예: "시장경제 관점에서 본다면 어떻게 되나요?")
- 피상적인 표현에 대해 구체적으로 설명하도록 추가 질문
- 본인의 성장 과정과 인성적 특성에 대한 깊이 있는 질문 (예: "행동이 ~~라고 평가받았는데 그 이유가 무엇이라고 생각하나요?")

【문항 설계 핵심 원칙】
- **반드시 학생부의 구체적 문구를 직접 인용하며 시작**: 예) "○학년 ○○세특을 보니 '~에 대해 탐구했다'고 되어 있는데..."
- **활동의 동기·과정·의미를 3단계로 캐묻기** (실제 면접 후기에서 가장 중요한 기준): 
  ① "그 활동을 시작하게 된 계기/동기는 무엇이었나요?"
  ② "그 과정에서 구체적으로 어떤 어려움을 마주했고, 어떻게 해결했나요?"
  ③ "그 경험이 당신에게 어떤 의미를 주었나요? / 당신을 어떻게 성장시켰나요?"
- **실험·조사·탐구 활동의 방법론과 한계점 질문**: 
  예) "실험 설계할 때 어떤 부분을 고려했나요?", "이 결과의 한계점은 무엇인가요?", "데이터는 어떻게 수집했나요?"
- **다각도 관점 질문 포함** (반대 관점, 절충안 등):
  예) "학과 관점에서는 이렇게 볼 수 있지만, 다른 관점에서는 어떻게 생각하나요?"
- **진로 일관성 확인**: 여러 활동들이 자연스럽게 현재 목표 학과로 수렴되는가?
- **공동체 태도 확인**: 행동특성/동아리/봉사 기록에서 실제로 따뜻함·배려·존중·리더십이 드러나는가?
- **'나'라는 사람에 대한 깊이 있는 탐색**:
  - 학생이 맡은 역할에서 특별히 고민했던 부분
  - 어려운 상황에서 보인 태도
  - 3년간의 성장 과정
- 각 문항 제목(h3) 바로 아래에 반드시 다음 형식으로 명시하세요:
  - **📌 평가 항목**: [학업소양/전공적합성/인성및의사소통] | **질문 의도**: [이 질문으로 확인하고자 하는 바를 한 문장으로 간략히]

【학생 준비 프로세스 (실제 합격생 사례 기반)】

**1단계: 생활기록부 꼼꼼히 정독 및 기억 되살리기** (1주)
- 학생부를 천천히 읽으면서 옆에 생각 메모
- 기억이 나지 않는 활동은 당시 제출한 보고서·PPT·탐구집 등을 다시 읽기
- 예전 책이나 참고 자료 재확인
- 과거 활동을 3학년의 성장된 눈높이에서 재해석

**2단계: 활동별 요소 정리** (1주)
- **형식 1**: 각 활동마다 (동기 → 내용 → 느낀점/배운점) 3단락으로 정리
- **형식 2**: 주요 개념/키워드는 정의·긍정 관점·부정 관점·부정에 대한 해법·본인의 생각으로 다각도 분석
- 예상 질문 생각해보기 + 대답 개요 작성 (완전한 대사가 아닌 **키워드 중심**)

**3단계: 답변 준비 방식**
- ❌ 예상 질문에 대한 완전한 대사 암기 (효과 낮음, 꼬리질문에 무너짐)
- ✅ 각 활동의 **키워드 중심으로 PPT 또는 메모** 작성
- ✅ 그 키워드를 바탕으로 **마치 발표하듯이** 말하기 연습
- ✅ 자신의 답변에 대해 스스로 **반박 질문/꼬리질문** 만들어보기 (예: "그럼 반대 입장에서는?", "이 점이 더 궁금할 것 같은데...")

**4단계: 카메라 연습** (실제 면접 후기에서 가장 강력 추천)
- 스마트폰으로 자신의 답변을 **녹화**
- 영상 재생하며 확인:
  - 말의 속도 (너무 빠르지는 않은가?)
  - 발음 명확성
  - 습관적 행동 (머리카락 만지작거림, 눈알 움직임, 혀 날름거림, 불안한 손동작 등)
  - 중언부언/뜸 들임 여부
- 의식적으로 교정하며 반복 연습

**5단계: 모의면접** (2~3회)
- 학교 선생님·친구·부모님과 실제 면접처럼 진행
- 본인이 인식하지 못했던 문제점 발견 (예: 목소리 톤, 눈 맞춤, 설명의 명확성)
- 실제 면접장의 분위기·긴장감에 익숙해지기
- 피상적인 표현이나 논리적 빈틈 보강

【학생이 알아야 할 실전 팁】

1. **면접은 학생을 '질타하는' 자리가 아님**
   - 면접관은 학생을 더 잘 알아보려는 마음으로 질문
   - 버벅거려도 괜찮음
   - 바로 답이 나오지 않으면 **"생각할 시간을 주세요"**라고 요청 가능
   - 완전한 답변보다 **진솔한 태도**가 중요

2. **질문의 요지를 정확히 파악하기**
   - 질문을 받으면 바로 답하기보다 질문이 무엇을 묻고 있는지 파악
   - 피상적인 단어 사용하지 않기 (면접관이 구체적으로 설명 요청할 가능성 높음)
   - 생각할 때 눈을 들고 있기 (앗고 생각하는 모습도 평가의 대상)

3. **꼬리질문에 대비하기**
   - 예상된 꼬리질문도 준비해두기
   - 자기 답변에 대한 반박·보완이 나올 경우, 논리적으로 대응하기
   - 모르거나 반박이 명확하면 솔직하게 인정 → 본인이 생각하는 방향 제시

4. **질문을 완전히 답변하지 못했을 때**
   - 질문과 관련된 **다른 부분에서 본인이 할 수 있는 답변** 제시 가능 (과도하면 회피로 보일 수 있으니 1~2회만)
   - 예: "동아리에서 특정 어려움을 겪지 못했지만, 프로그램을 기획하는 과정에서 ~~라는 점을 고민했습니다"

5. **지원동기는 '솔직함'이 핵심**
   - 지나치게 학술적이거나 거창한 표현은 피하기
   - "내가 정말 왜 이 학과를 선택했을까?" 스스로 끊임없이 묻기
   - 학과와의 연결점보다 **개인의 진심과 성장 과정** 강조

【주의사항】
- 모든 문항이 학생부 원문 인용으로 시작해야 함
- 단순 '느낀 점' 질문이 아닌, 활동의 동기·과정·의미를 3단계로 캐묻는 깊이 있는 질문
- 학업소양·전공적합성·인성이 균형 있게 (4-4-2 또는 3-4-3 비율) 분포하는 10문항 구성
- 예측 불가능한 꼬리질문을 고려하여 변칙적인 질문도 포함
` : `

[면접 문항 생성 공통 지침 - 필수 반영]
아래 기준을 10개 문항 전체에 반드시 반영하여 표준화된 양식으로 출력하세요.
- 각 문항마다 평가 항목과 질문 의도를 명확히 제시하십시오.
- 각 문항 질문 내용(실제 질문)은 반드시 다음과 같은 HTML 태그를 사용하여 노란색 박스로 강조하세요:
  <div style="background-color: #fffac9; padding: 15px; border-radius: 8px; color: #333; font-weight: bold; font-size: 1.1em; margin: 15px 0; border-left: 5px solid #fbc02d;"> [면접관이 던지는 진짜 질문 내용] </div>
- 각 문항 번호(h3)와 노란색 질문 박스 아래에 반드시 다음 형식으로 면접 평가 기준을 명시하세요:
  - **📌 평가 항목**: [예: 전공 적합성, 발전 가능성 등] | **질문 의도**: [이 질문으로 확인하고자 하는 바를 한 문장으로 간략히]
- 질문의 말투는 실제 면접관이 직접 묻는 듯한 친절하면서도 예리한 구어체(~인가요?, ~했나요?)를 사용하십시오.
`;


      const prompt = `당신은 대한민국 대학 입시 전문 면접관이자 진학 지도 교사입니다.
다음 학생의 생활기록부 요약본과 목표 전공, 그리고 제공된 '면접 기출 참고자료'와 '전공별 권장이수과목 참고자료'를 종합 분석하여 학생 맞춤형 면접 문항 10개를 생성하세요.

[목표 전공]
대학: ${targetUniv}
계열: ${targetCat}
지원학과: ${targetMajor}

[학생 생기부 요약]
${studentRecordText.substring(0, 35000)}

[면접 기출 참고자료 (interviewDocs)]
${rawInterviewData.substring(0, 15000)}

[전공별 권장이수과목 참고자료]
${rawRecommendedSubjects.substring(0, 150000)}
${univPromptSupplement}
[생성 지침]
1. 목표 학과(${targetMajor})의 핵심 역량에 부합하면서, 학생 생기부 내용(특정 과목 세특 탐구, 진로활동 등)을 파고드는 맞춤형 문항을 설계하세요.
   - **반드시 [전공별 권장이수과목 참고자료]를 확인하여, ${targetMajor}가 속한 학과/계열에서 요구하는 권장 이수 과목(또는 핵심 단원)과 학생의 이수 내역/세특을 교차 검증**하세요.
   - 학생이 목표 학과의 권장 과목 세특을 잘 쌓았다면 그 과목의 심화 탐구 내용을 묻고, 만약 권장 과목을 이수하지 않았거나 관련 세특이 빈약하다면 이를 방어/보완할 수 있는지 묻는 날카로운 질문을 반드시 포함하세요. (예: "우리 학과는 물리 역량이 중요한데, 물리Ⅱ를 이수하지 않았네요. 대학 진학 후 이 부분을 어떻게 보완할 계획인가요?" 또는 "수학 권장 과목은 이수했는데 세특에 프로그래밍 관련 내용이 없네요. 이유가 있나요?")
2. 기출문제 참고자료에 해당 대학/학과의 기출 또는 유사 기출이 존재하면 적극 반영하세요. 다음 **실제 대입 면접 5대 기출 패턴**을 10문제에 골고루 반영해 문항을 구성하세요:
   - (가) 생기부 진위 및 깊이 확인: "세특에 ~를 조사했다고 나오는데, 구체적으로 어떤 원리/개념인지 설명하고 가장 기억에 남는 점은?"
   - (나) 문제 해결 및 극복 경험: "동아리/탐구 과정에서 ~한 어려움이나 실험 실패 경험이 있었나요? 이를 어떻게 극복했나요?"
   - (다) 지식의 전이 및 미래 응용: "수업에서 배웠던 ~개념을 미래 우리 학과의 특정 분야나 사회 문제 해결에 어떻게 활용할 수 있을까요?"
   - (라) 진로 압박 및 동기 검증: "진로활동에서 확인되는 기존 관심사(또는 장래희망)가 현재 지원한 학과와 잘 맞지 않거나 중간에 변경된 것 같은데, 우리 학과를 선택하게 된 결정적 계기와 연결 고리는 무엇인가요?"
   - (마) 인성/행특 검증 및 갈등 관리: "행특/자율활동에서 선생님이나 친구들이 학생을 ~하다고 평가한 부분이 있는데, 어떤 긍정적 기여를 했는지 구체적인 갈등 조정이나 리더십 사례를 들어볼래요?"
3. 난이도는 기초 인성/동기 확인부터 시작하여 점차 깊이 있는 전공적합성 꼬리 질문으로 확장되도록 1문항부터 10문항까지 순서대로 작성하세요.
4. **[초강력 지침] 면접 질문의 말투**: 절대 '~에 대해 설명해 주세요'나 '~에 대한 질문입니다'와 같은 정형화된 문어체/설명조를 쓰지 마세요. 실제 면접장에 서 있는 면접관이 학생에게 직접 "말을 거는" 생생한 구어체(예: "학생, 여기 세특을 보니까 ~ 활동을 했네요? 이 과정에서 가장 고민했던 지점은 뭐였나요?")로 작성하세요. 특히 **[질문 내용]** 부분은 면접관이 입으로 내뱉는 "진짜 질문" 그 자체여야 합니다.
5. 각 질문에 대해 '생기부 출처'를 적을 때는 **반드시 생기부에 적혀 있는 세특 원문(내용 그대로)을 큰따옴표로 인용하여 명시**하고, 그 아래에 출처 의도와 '면접 모범답안 가이드(어떻게 대답하는 것이 좋은지)'를 함께 제시하세요.
6. **[필수] 면접관 종합 분석 의견 작성**: 본격적인 문항 생성에 앞서, 학생의 전체 생활기록부와 지원 전공 간의 정합성, 핵심 강점, 그리고 면접에서 중점적으로 검증해야 할 전략적 포인트를 짚어주는 '면접관 종합 분석 의견'을 반드시 작성하세요.
7. 마크다운 형식으로 가독성 좋게 출력하십시오. 질문 문항과 지원 대학 정보는 아래의 포맷을 반드시 준수하세요.

**형식:**
🏛️ **지원 정보**
- **지원 대학**: ${targetUniv}
- **지원 계열**: ${targetCat}
- **지원 학과**: ${targetMajor}
<hr/>

## 🎤 면접관 종합 분석 의견
[학생의 학생부 경쟁력, 전공 적합성, 면접 전략 등에 대한 심층적인 분석 내용을 3~4문장으로 서술]

### 면접 질문 1 
<div style="background-color: #fffac9; padding: 15px; border-radius: 8px; color: #333; font-weight: bold; font-size: 1.1em; margin: 15px 0; border-left: 5px solid #fbc02d;"> [이곳에 면접관이 실제 학생에게 건네는 "진짜 질문"을 구어체로 작성] </div>

- **📌 평가 항목**: [예: 진학 의지 및 계열 적합성] | **질문 의도**: [이 질문으로 무엇을 확인하려는지 한 문장으로 간략히]

- **📄 문항 출처(생기부 원문) & 의도**: 
  "[(인용) 생기부에 적힌 원문 내용을 큰따옴표로]" 
  
  [이 원문이 왜 주목되었는지, 질문의 출처 의도를 2~3문장으로 설명]

- **✅ 모범답안 가이드**: 
  [학생이 이 질문에 어떻게 대답하면 좋을지, 핵심 포인트와 가능한 답변 방향을 3~4문장으로 제시]

(이 구조를 10번까지 반복)
`;

      try {
        const modelsToTry = ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
        let resultText = "";

        for (const model of modelsToTry) {
          try {
            const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const response = await fetch(API_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.45, maxOutputTokens: 32768 }
              }),
            });
            if (response.ok) {
              const data = await response.json();
              resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (resultText) break;
            }
          } catch (e) { console.warn(model + " retry..."); }
        }

        if (!resultText) throw new Error("AI 응답을 가져오지 못했습니다 (API 문제이거나 시간 초과).");

        // Inject Gachon guide banner at the top if Gachon is selected
        let guideBannerHtml = "";
        if (targetUniv === "가천대학교") {
          guideBannerHtml = `<div id="iv-gachon-guide-banner" style="
            background: linear-gradient(135deg, rgba(0,150,136,0.12), rgba(0,121,107,0.18));
            border: 1.5px solid rgba(0,150,136,0.5);
            border-radius: 12px;
            padding: 1rem 1.5rem;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            flex-wrap: wrap;
          ">
            <div style="display:flex; align-items:center; gap: 0.75rem;">
              <span style="font-size: 1.8rem;">🎓</span>
              <div>
                <div style="font-size: 1.05rem; font-weight: 700; color: #4db6ac;">가천대학교 면접 가이드</div>
                <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">서류 50% + 면접 50% | 역전률 60% | 블라인드 3대1 면접</div>
              </div>
            </div>
            <div style="display:flex;gap:0.6rem;flex-wrap:wrap;">
              <button onclick="window.showGachonGuideModal()" style="background:rgba(0,150,136,0.2); border:1px solid rgba(0,150,136,0.5); color:#4db6ac; padding:0.5rem 1rem; border-radius:8px; font-size:0.88rem; font-weight:600; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(0,150,136,0.35)'" onmouseout="this.style.background='rgba(0,150,136,0.2)'">📋 가이드 보기</button>
              <button onclick="window.printGachonGuide()" style="background:rgba(150,186,255,0.15); border:1px solid var(--panel-border); color:var(--text-secondary); padding:0.5rem 1rem; border-radius:8px; font-size:0.88rem; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(150,186,255,0.25)'" onmouseout="this.style.background='rgba(150,186,255,0.15)'">🖨️ PDF 인쇄</button>
            </div>
          </div>`;
        } else if (targetUniv === "서울시립대학교") {
          guideBannerHtml = `<div id="iv-uos-guide-banner" style="
            background: linear-gradient(135deg, rgba(94,106,210,0.14), rgba(94,106,210,0.08));
            border: 1.5px solid rgba(124,131,253,0.5);
            border-radius: 12px;
            padding: 1rem 1.5rem;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            flex-wrap: wrap;
          ">
            <div style="display:flex; align-items:center; gap: 0.75rem;">
              <span style="font-size: 1.8rem;">🎓</span>
              <div>
                <div style="font-size: 1.05rem; font-weight: 700; color: #96baff;">서울시립대학교 면접 가이드</div>
                <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">서류 50% + 면접 50% | 역전률 57% | 2인 면접관 12분 블라인드</div>
              </div>
            </div>
            <div style="display:flex;gap:0.6rem;flex-wrap:wrap;">
              <button onclick="window.showSeoulGuideModal()" style="background:rgba(124,131,253,0.2); border:1px solid rgba(124,131,253,0.5); color:#96baff; padding:0.5rem 1rem; border-radius:8px; font-size:0.88rem; font-weight:600; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(124,131,253,0.35)'" onmouseout="this.style.background='rgba(124,131,253,0.2)'">📋 가이드 보기</button>
              <button onclick="window.printSeoulGuide()" style="background:rgba(150,186,255,0.15); border:1px solid var(--panel-border); color:var(--text-secondary); padding:0.5rem 1rem; border-radius:8px; font-size:0.88rem; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(150,186,255,0.25)'" onmouseout="this.style.background='rgba(150,186,255,0.15)'">🖨️ PDF 인쇄</button>
            </div>
          </div>`;
        } else if (targetUniv === "숭실대학교") {
          guideBannerHtml = `<div id="iv-ssu-guide-banner" style="
            background: linear-gradient(135deg, rgba(220,53,69,0.1), rgba(180,30,50,0.07));
            border: 1.5px solid rgba(220,53,69,0.45);
            border-radius: 12px;
            padding: 1rem 1.5rem;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            flex-wrap: wrap;
          ">
            <div style="display:flex; align-items:center; gap: 0.75rem;">
              <span style="font-size: 1.8rem;">🎓</span>
              <div>
                <div style="font-size: 1.05rem; font-weight: 700; color: #ff8a9b;">숭실대학교 면접 가이드</div>
                <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">서류 50% + 면접 50% | 역전률 65.6% | 전공교수 포함 2인 12분 블라인드</div>
              </div>
            </div>
            <div style="display:flex;gap:0.6rem;flex-wrap:wrap;">
              <button onclick="window.showSoongsilGuideModal()" style="background:rgba(220,53,69,0.18); border:1px solid rgba(220,53,69,0.45); color:#ff8a9b; padding:0.5rem 1rem; border-radius:8px; font-size:0.88rem; font-weight:600; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(220,53,69,0.3)'" onmouseout="this.style.background='rgba(220,53,69,0.18)'">📋 가이드 보기</button>
              <button onclick="window.printSoongsilGuide()" style="background:rgba(150,186,255,0.15); border:1px solid var(--panel-border); color:var(--text-secondary); padding:0.5rem 1rem; border-radius:8px; font-size:0.88rem; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(150,186,255,0.25)'" onmouseout="this.style.background='rgba(150,186,255,0.15)'">🖨️ PDF 인쇄</button>
            </div>
          </div>`;
        } else if (targetUniv === "한국외국어대학교") {
          guideBannerHtml = `<div id="iv-hufs-guide-banner" style="
            background: linear-gradient(135deg, rgba(0,33,71,0.15), rgba(0,33,71,0.1));
            border: 1.5px solid rgba(0,33,71,0.5);
            border-radius: 12px;
            padding: 1rem 1.5rem;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            flex-wrap: wrap;
          ">
            <div style="display:flex; align-items:center; gap: 0.75rem;">
              <span style="font-size: 1.8rem;">🎓</span>
              <div>
                <div style="font-size: 1.05rem; font-weight: 700; color: #90caf9;">한국외국어대학교 면접 가이드</div>
                <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">서류 50% + 면접 50% | 지적 호기심 확장 중점 | 2인 블라인드 면접</div>
              </div>
            </div>
            <div style="display:flex;gap:0.6rem;flex-wrap:wrap;">
              <button onclick="window.showHufsGuideModal()" style="background:rgba(0,33,71,0.2); border:1px solid rgba(0,33,71,0.5); color:#90caf9; padding:0.5rem 1rem; border-radius:8px; font-size:0.88rem; font-weight:600; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(0,33,71,0.35)'" onmouseout="this.style.background='rgba(0,33,71,0.2)'">📋 가이드 보기</button>
              <button onclick="window.printHufsGuide()" style="background:rgba(150,186,255,0.15); border:1px solid var(--panel-border); color:var(--text-secondary); padding:0.5rem 1rem; border-radius:8px; font-size:0.88rem; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(150,186,255,0.25)'" onmouseout="this.style.background='rgba(150,186,255,0.15)'">🖨️ PDF 인쇄</button>
            </div>
          </div>`;
        } else if (targetUniv === "세종대학교") {
          guideBannerHtml = `<div id="iv-sejong-guide-banner" style="
            background: linear-gradient(135deg, rgba(103,58,183,0.15), rgba(81,45,168,0.1));
            border: 1.5px solid rgba(103,58,183,0.5);
            border-radius: 12px;
            padding: 1rem 1.5rem;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            flex-wrap: wrap;
          ">
            <div style="display:flex; align-items:center; gap: 0.75rem;">
              <span style="font-size: 1.8rem;">🎓</span>
              <div>
                <div style="font-size: 1.05rem; font-weight: 700; color: #d1c4e9;">세종대학교 면접 가이드</div>
                <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">서류 60% + 면접 40% | 역전률 50%↑ | 2인 블라인드 9분 면접(녹음)</div>
              </div>
            </div>
            <div style="display:flex;gap:0.6rem;flex-wrap:wrap;">
              <button onclick="window.showSejongGuideModal()" style="background:rgba(103,58,183,0.2); border:1px solid rgba(103,58,183,0.5); color:#d1c4e9; padding:0.5rem 1rem; border-radius:8px; font-size:0.88rem; font-weight:600; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(103,58,183,0.35)'" onmouseout="this.style.background='rgba(103,58,183,0.2)'">📋 가이드 보기</button>
              <button onclick="window.printSejongGuide()" style="background:rgba(150,186,255,0.15); border:1px solid var(--panel-border); color:var(--text-secondary); padding:0.5rem 1rem; border-radius:8px; font-size:0.88rem; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(150,186,255,0.25)'" onmouseout="this.style.background='rgba(150,186,255,0.15)'">🖨️ PDF 인쇄</button>
            </div>
          </div>`;
        } else if (targetUniv === "건국대학교") {
          guideBannerHtml = `<div id="iv-konkuk-guide-banner" style="
            background: linear-gradient(135deg, rgba(46,125,50,0.15), rgba(46,125,50,0.1));
            border: 1.5px solid rgba(46,125,50,0.5);
            border-radius: 12px;
            padding: 1rem 1.5rem;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            flex-wrap: wrap;
          ">
            <div style="display:flex; align-items:center; gap: 0.75rem;">
              <span style="font-size: 1.8rem;">🎓</span>
              <div>
                <div style="font-size: 1.05rem; font-weight: 700; color: #a5d6a7;">건국대학교 면접 가이드</div>
                <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">서류 70% + 면접 30% | 역전률 25~30% | 성적 공개 면접 (전공관심도 중점)</div>
              </div>
            </div>
            <div style="display:flex;gap:0.6rem;flex-wrap:wrap;">
              <button onclick="window.showKonkukGuideModal()" style="background:rgba(46,125,50,0.2); border:1px solid rgba(46,125,50,0.5); color:#a5d6a7; padding:0.5rem 1rem; border-radius:8px; font-size:0.88rem; font-weight:600; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(46,125,50,0.35)'" onmouseout="this.style.background='rgba(46,125,50,0.2)'">📋 가이드 보기</button>
              <button onclick="window.printKonkukGuide()" style="background:rgba(150,186,255,0.15); border:1px solid var(--panel-border); color:var(--text-secondary); padding:0.5rem 1rem; border-radius:8px; font-size:0.88rem; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(150,186,255,0.25)'" onmouseout="this.style.background='rgba(150,186,255,0.15)'">🖨️ PDF 인쇄</button>
            </div>
          </div>`;
        } else if (targetUniv === "중앙대학교") {
          guideBannerHtml = `<div id="iv-cau-guide-banner" style="
            background: linear-gradient(135deg, rgba(0,74,152,0.15), rgba(0,74,152,0.1));
            border: 1.5px solid rgba(0,74,152,0.5);
            border-radius: 12px;
            padding: 1rem 1.5rem;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            flex-wrap: wrap;
          ">
            <div style="display:flex; align-items:center; gap: 0.75rem;">
              <span style="font-size: 1.8rem;">🎓</span>
              <div>
                <div style="font-size: 1.05rem; font-weight: 700; color: #90caf9;">중앙대학교 면접 가이드</div>
                <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">서류 70% + 면접 30% | 학업준비도 60% 비중 | 방법론 및 실패분석 필수 질문</div>
              </div>
            </div>
            <div style="display:flex;gap:0.6rem;flex-wrap:wrap;">
              <button onclick="window.showCauGuideModal()" style="background:rgba(0,74,152,0.2); border:1px solid rgba(0,74,152,0.5); color:#90caf9; padding:0.5rem 1rem; border-radius:8px; font-size:0.88rem; font-weight:600; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(0,74,152,0.35)'" onmouseout="this.style.background='rgba(0,74,152,0.2)'">📋 가이드 보기</button>
              <button onclick="window.printCauGuide()" style="background:rgba(150,186,255,0.15); border:1px solid var(--panel-border); color:var(--text-secondary); padding:0.5rem 1rem; border-radius:8px; font-size:0.88rem; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(150,186,255,0.25)'" onmouseout="this.style.background='rgba(150,186,255,0.15)'">🖨️ PDF 인쇄</button>
            </div>
          </div>`;
        } else if (targetUniv === "경희대학교") {
          guideBannerHtml = `<div id="iv-khu-guide-banner" style="
            background: linear-gradient(135deg, rgba(167,29,42,0.15), rgba(167,29,42,0.1));
            border: 1.5px solid rgba(167,29,42,0.5);
            border-radius: 12px;
            padding: 1rem 1.5rem;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            flex-wrap: wrap;
          ">
            <div style="display:flex; align-items:center; gap: 0.75rem;">
              <span style="font-size: 1.8rem;">🎓</span>
              <div>
                <div style="font-size: 1.05rem; font-weight: 700; color: #ffab91;">경희대학교 면접 가이드</div>
                <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">서류 70% + 면접 30% | 인성 50% : 전공 50% | 과학적 원리 심층 검증</div>
              </div>
            </div>
            <div style="display:flex;gap:0.6rem;flex-wrap:wrap;">
              <button onclick="window.showKhuGuideModal()" style="background:rgba(167,29,42,0.2); border:1px solid rgba(167,29,42,0.5); color:#ffab91; padding:0.5rem 1rem; border-radius:8px; font-size:0.88rem; font-weight:600; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(167,29,42,0.35)'" onmouseout="this.style.background='rgba(167,29,42,0.2)'">📋 가이드 보기</button>
              <button onclick="window.printKhuGuide()" style="background:rgba(150,186,255,0.15); border:1px solid var(--panel-border); color:var(--text-secondary); padding:0.5rem 1rem; border-radius:8px; font-size:0.88rem; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(150,186,255,0.25)'" onmouseout="this.style.background='rgba(150,186,255,0.15)'">🖨️ PDF 인쇄</button>
            </div>
          </div>`;
        } else if (targetUniv === "서울과학기술대학교") {
          guideBannerHtml = `<div id="iv-seoultech-guide-banner" style="
            background: linear-gradient(135deg, rgba(55,71,79,0.15), rgba(55,71,79,0.1));
            border: 1.5px solid rgba(55,71,79,0.5);
            border-radius: 12px;
            padding: 1rem 1.5rem;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            flex-wrap: wrap;
          ">
            <div style="display:flex; align-items:center; gap: 0.75rem;">
              <span style="font-size: 1.8rem;">🎓</span>
              <div>
                <div style="font-size: 1.05rem; font-weight: 700; color: #b0bec5;">서울과학기술대학교 면접 가이드</div>
                <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">서류 70% + 면접 30% | 성적 공개 면접 | 원리 및 문제해결 프로세스 중점</div>
              </div>
            </div>
            <div style="display:flex;gap:0.6rem;flex-wrap:wrap;">
              <button onclick="window.showSeoulTechGuideModal()" style="background:rgba(55,71,79,0.2); border:1px solid rgba(55,71,79,0.5); color:#b0bec5; padding:0.5rem 1rem; border-radius:8px; font-size:0.88rem; font-weight:600; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(55,71,79,0.35)'" onmouseout="this.style.background='rgba(55,71,79,0.2)'">📋 가이드 보기</button>
              <button onclick="window.printSeoulTechGuide()" style="background:rgba(150,186,255,0.15); border:1px solid var(--panel-border); color:var(--text-secondary); padding:0.5rem 1rem; border-radius:8px; font-size:0.88rem; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(150,186,255,0.25)'" onmouseout="this.style.background='rgba(150,186,255,0.15)'">🖨️ PDF 인쇄</button>
            </div>
          </div>`;
        } else if (targetUniv === "가천대학교") {
          guideBannerHtml = `<div id="iv-gachon-guide-banner" style="
            background: linear-gradient(135deg, rgba(0,74,152,0.15), rgba(0,74,152,0.1));
            border: 1.5px solid rgba(0,74,152,0.5);
            border-radius: 12px;
            padding: 1rem 1.5rem;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            flex-wrap: wrap;
          ">
            <div style="display:flex; align-items:center; gap: 0.75rem;">
              <span style="font-size: 1.8rem;">🎓</span>
              <div>
                <div style="font-size: 1.05rem; font-weight: 700; color: #90caf9;">가천대학교 면접 가이드</div>
                <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">인성 40% | 진학의지 40% | 경험 중심의 구체적 사례 어필 중점</div>
              </div>
            </div>
            <div style="display:flex;gap:0.6rem;flex-wrap:wrap;">
              <button onclick="window.showGachonGuideModal()" style="background:rgba(0,74,152,0.2); border:1px solid rgba(0,74,152,0.5); color:#90caf9; padding:0.5rem 1rem; border-radius:8px; font-size:0.88rem; font-weight:600; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(0,74,152,0.35)'" onmouseout="this.style.background='rgba(0,74,152,0.2)'">📋 가이드 보기</button>
              <button onclick="window.printGachonGuide()" style="background:rgba(150,186,255,0.15); border:1px solid var(--panel-border); color:var(--text-secondary); padding:0.5rem 1rem; border-radius:8px; font-size:0.88rem; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(150,186,255,0.25)'" onmouseout="this.style.background='rgba(150,186,255,0.15)'">🖨️ PDF 인쇄</button>
            </div>
          </div>`;
        } else if (targetUniv === "서울시립대학교") {
          guideBannerHtml = `<div id="iv-seoul-guide-banner" style="
            background: linear-gradient(135deg, rgba(0,47,108,0.15), rgba(0,47,108,0.1));
            border: 1.5px solid rgba(0,47,108,0.5);
            border-radius: 12px;
            padding: 1rem 1.5rem;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            flex-wrap: wrap;
          ">
            <div style="display:flex; align-items:center; gap: 0.75rem;">
              <span style="font-size: 1.8rem;">🎓</span>
              <div>
                <div style="font-size: 1.05rem; font-weight: 700; color: #90caf9;">서울시립대학교 면접 가이드</div>
                <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">잠재역량 40% | 학업역량 35% | 활동의 연계성 및 개념 이해 심화 검증</div>
              </div>
            </div>
            <div style="display:flex;gap:0.6rem;flex-wrap:wrap;">
              <button onclick="window.showSeoulGuideModal()" style="background:rgba(0,47,108,0.2); border:1px solid rgba(0,47,108,0.5); color:#90caf9; padding:0.5rem 1rem; border-radius:8px; font-size:0.88rem; font-weight:600; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(0,47,108,0.35)'" onmouseout="this.style.background='rgba(0,47,108,0.2)'">📋 가이드 보기</button>
              <button onclick="window.printSeoulGuide()" style="background:rgba(150,186,255,0.15); border:1px solid var(--panel-border); color:var(--text-secondary); padding:0.5rem 1rem; border-radius:8px; font-size:0.88rem; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(150,186,255,0.25)'" onmouseout="this.style.background='rgba(150,186,255,0.15)'">🖨️ PDF 인쇄</button>
            </div>
          </div>`;
        } else if (targetUniv === "서강대학교") {
          guideBannerHtml = `<div id="iv-sogang-guide-banner" style="
            background: linear-gradient(135deg, rgba(144,19,25,0.15), rgba(144,19,25,0.1));
            border: 1.5px solid rgba(144,19,25,0.5);
            border-radius: 12px;
            padding: 1rem 1.5rem;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            flex-wrap: wrap;
          ">
            <div style="display:flex; align-items:center; gap: 0.75rem;">
              <span style="font-size: 1.8rem;">🎓</span>
              <div>
                <div style="font-size: 1.05rem; font-weight: 700; color: #ef9a9a;">서강대학교 면접 가이드</div>
                <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">성장가능성 30% | 경계 없는 다전공제도 | 융합적 사고 & 실패 극복 중점</div>
              </div>
            </div>
            <div style="display:flex;gap:0.6rem;flex-wrap:wrap;">
              <button onclick="window.showSogangGuideModal()" style="background:rgba(144,19,25,0.2); border:1px solid rgba(144,19,25,0.5); color:#ef9a9a; padding:0.5rem 1rem; border-radius:8px; font-size:0.88rem; font-weight:600; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(144,19,25,0.35)'" onmouseout="this.style.background='rgba(144,19,25,0.2)'">📋 가이드 보기</button>
              <button onclick="window.printSogangGuide()" style="background:rgba(150,186,255,0.15); border:1px solid var(--panel-border); color:var(--text-secondary); padding:0.5rem 1rem; border-radius:8px; font-size:0.88rem; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(150,186,255,0.25)'" onmouseout="this.style.background='rgba(150,186,255,0.15)'">🖨️ PDF 인쇄</button>
            </div>
          </div>`;
        } else if (targetUniv === "성균관대학교") {
          guideBannerHtml = `<div id="iv-skku-guide-banner" style="
            background: linear-gradient(135deg, rgba(0,68,36,0.15), rgba(0,68,36,0.1));
            border: 1.5px solid rgba(0,68,36,0.5);
            border-radius: 12px;
            padding: 1rem 1.5rem;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            flex-wrap: wrap;
          ">
            <div style="display:flex; align-items:center; gap: 0.75rem;">
              <span style="font-size: 1.8rem;">🎓</span>
              <div>
                <div style="font-size: 1.05rem; font-weight: 700; color: #a5d6a7;">성균관대학교 면접 가이드</div>
                <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">탐구역량 40% | 권장이수과목 없음 | 자기주도적 심화 탐구 확장성 중점</div>
              </div>
            </div>
            <div style="display:flex;gap:0.6rem;flex-wrap:wrap;">
              <button onclick="window.showSkkuGuideModal()" style="background:rgba(0,68,36,0.2); border:1px solid rgba(0,68,36,0.5); color:#a5d6a7; padding:0.5rem 1rem; border-radius:8px; font-size:0.88rem; font-weight:600; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(0,68,36,0.35)'" onmouseout="this.style.background='rgba(0,68,36,0.2)'">📋 가이드 보기</button>
              <button onclick="window.printSkkuGuide()" style="background:rgba(150,186,255,0.15); border:1px solid var(--panel-border); color:var(--text-secondary); padding:0.5rem 1rem; border-radius:8px; font-size:0.88rem; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(150,186,255,0.25)'" onmouseout="this.style.background='rgba(150,186,255,0.15)'">🖨️ PDF 인쇄</button>
            </div>
          </div>`;
        } else if (targetUniv === "한양대학교") {
          guideBannerHtml = `<div id="iv-hanyang-guide-banner" style="
            background: linear-gradient(135deg, rgba(0,35,102,0.15), rgba(0,35,102,0.1));
            border: 1.5px solid rgba(0,35,102,0.5);
            border-radius: 12px;
            padding: 1rem 1.5rem;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            flex-wrap: wrap;
          ">
            <div style="display:flex; align-items:center; gap: 0.75rem;">
              <span style="font-size: 1.8rem;">🎓</span>
              <div>
                <div style="font-size: 1.05rem; font-weight: 700; color: #90caf9;">한양대학교 면접 가이드</div>
                <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">심층학업역량 40% | 비판적·창의적 사고 | 왜(Why) 중심의 원리 검증</div>
              </div>
            </div>
            <div style="display:flex;gap:0.6rem;flex-wrap:wrap;">
              <button onclick="window.showHanyangGuideModal()" style="background:rgba(0,35,102,0.2); border:1px solid rgba(0,35,102,0.5); color:#90caf9; padding:0.5rem 1rem; border-radius:8px; font-size:0.88rem; font-weight:600; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(0,35,102,0.35)'" onmouseout="this.style.background='rgba(0,35,102,0.2)'">📋 가이드 보기</button>
              <button onclick="window.printHanyangGuide()" style="background:rgba(150,186,255,0.15); border:1px solid var(--panel-border); color:var(--text-secondary); padding:0.5rem 1rem; border-radius:8px; font-size:0.88rem; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(150,186,255,0.25)'" onmouseout="this.style.background='rgba(150,186,255,0.15)'">🖨️ PDF 인쇄</button>
            </div>
          </div>`;
        } else if (targetUniv === "한국교원대학교") {
          guideBannerHtml = `<div id="iv-knue-guide-banner" style="
            background: linear-gradient(135deg, rgba(27,94,32,0.15), rgba(27,94,32,0.1));
            border: 1.5px solid rgba(27,94,32,0.5);
            border-radius: 12px;
            padding: 1rem 1.5rem;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            flex-wrap: wrap;
          ">
            <div style="display:flex; align-items:center; gap: 0.75rem;">
              <span style="font-size: 1.8rem;">🎓</span>
              <div>
                <div style="font-size: 1.05rem; font-weight: 700; color: #a5d6a7;">한국교원대학교 면접 가이드</div>
                <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">전공 및 교직적합성 40% | 교직인성 중점 | 3인 블라인드 심층 면접</div>
              </div>
            </div>
            <div style="display:flex;gap:0.6rem;flex-wrap:wrap;">
              <button onclick="window.showKnueGuideModal()" style="background:rgba(27,94,32,0.2); border:1px solid rgba(27,94,32,0.5); color:#a5d6a7; padding:0.5rem 1rem; border-radius:8px; font-size:0.88rem; font-weight:600; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(27,94,32,0.35)'" onmouseout="this.style.background='rgba(27,94,32,0.2)'">📋 가이드 보기</button>
              <button onclick="window.printKnueGuide()" style="background:rgba(150,186,255,0.15); border:1px solid var(--panel-border); color:var(--text-secondary); padding:0.5rem 1rem; border-radius:8px; font-size:0.88rem; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(150,186,255,0.25)'" onmouseout="this.style.background='rgba(150,186,255,0.15)'">🖨️ PDF 인쇄</button>
            </div>
          </div>`;
        } else if (targetUniv === "광운대학교") {
          guideBannerHtml = `<div id="iv-kwangwoon-guide-banner" style="
            background: linear-gradient(135deg, rgba(167,29,42,0.12), rgba(167,29,42,0.08));
            border: 1.5px solid rgba(167,29,42,0.4);
            border-radius: 12px;
            padding: 1rem 1.5rem;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            flex-wrap: wrap;
          ">
            <div style="display:flex; align-items:center; gap: 0.75rem;">
              <span style="font-size: 1.8rem;">🎓</span>
              <div>
                <div style="font-size: 1.05rem; font-weight: 700; color: #ffab91;">광운대학교 면접 가이드</div>
                <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">발전가능성 45% | 면접 반영 40%로 확대 | 성적 공개 2인 블라인드 면접</div>
              </div>
            </div>
            <div style="display:flex;gap:0.6rem;flex-wrap:wrap;">
              <button onclick="window.showKwangwoonGuideModal()" style="background:rgba(167,29,42,0.2); border:1px solid rgba(167,29,42,0.5); color:#ffab91; padding:0.5rem 1rem; border-radius:8px; font-size:0.88rem; font-weight:600; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(167,29,42,0.35)'" onmouseout="this.style.background='rgba(167,29,42,0.2)'">📋 가이드 보기</button>
              <button onclick="window.printKwangwoonGuide()" style="background:rgba(150,186,255,0.15); border:1px solid var(--panel-border); color:var(--text-secondary); padding:0.5rem 1rem; border-radius:8px; font-size:0.88rem; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(150,186,255,0.25)'" onmouseout="this.style.background='rgba(150,186,255,0.15)'">🖨️ PDF 인쇄</button>
            </div>
          </div>`;
        } else if (targetUniv === "동국대학교") {
          guideBannerHtml = `<div id="iv-dongguk-guide-banner" style="
            background: linear-gradient(135deg, rgba(234,84,33,0.12), rgba(234,84,33,0.08));
            border: 1.5px solid rgba(234,84,33,0.4);
            border-radius: 12px;
            padding: 1rem 1.5rem;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            flex-wrap: wrap;
          ">
            <div style="display:flex; align-items:center; gap: 0.75rem;">
              <span style="font-size: 1.8rem;">🎓</span>
              <div>
                <div style="font-size: 1.05rem; font-weight: 700; color: #ffccbc;">동국대학교 면접 가이드</div>
                <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">전공적합성 30% | 실질 영향력 40% 이상 | 출결(성실성) 검증 필수</div>
              </div>
            </div>
            <div style="display:flex;gap:0.6rem;flex-wrap:wrap;">
              <button onclick="window.showDonggukGuideModal()" style="background:rgba(234,84,33,0.2); border:1px solid rgba(234,84,33,0.5); color:#ffccbc; padding:0.5rem 1rem; border-radius:8px; font-size:0.88rem; font-weight:600; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(234,84,33,0.35)'" onmouseout="this.style.background='rgba(234,84,33,0.2)'">📋 가이드 보기</button>
              <button onclick="window.printDonggukGuide()" style="background:rgba(150,186,255,0.15); border:1px solid var(--panel-border); color:var(--text-secondary); padding:0.5rem 1rem; border-radius:8px; font-size:0.88rem; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(150,186,255,0.25)'" onmouseout="this.style.background='rgba(150,186,255,0.15)'">🖨️ PDF 인쇄</button>
            </div>
          </div>`;
        }

        ivMarkdownResult.innerHTML = guideBannerHtml + (typeof marked !== 'undefined' ? marked.parse(resultText) : resultText);

        // Post-process: Style Overall Analysis Opinion
        ivMarkdownResult.querySelectorAll('h2').forEach(h2 => {
          if (h2.textContent.includes('종합 분석 의견')) {
            h2.style.cssText = `
              background: linear-gradient(135deg, rgba(150,186,255,0.15), rgba(150,186,255,0.05));
              border: 1.5px solid rgba(150,186,255,0.3);
              border-radius: 12px;
              padding: 1.25rem 1.5rem;
              margin-top: 1rem;
              margin-bottom: 2rem;
              color: #96baff;
              font-size: 1.2rem;
              font-weight: 800;
              display: flex;
              align-items: center;
              gap: 0.75rem;
            `;
            // Add a subtle bottom margin to the next paragraph
            const nextP = h2.nextElementSibling;
            if (nextP && nextP.tagName === 'P') {
              nextP.style.cssText = `
                background: rgba(150,186,255,0.05);
                border-left: 3px solid #96baff;
                padding: 1rem 1.25rem;
                margin-top: -1.5rem;
                margin-bottom: 2.5rem;
                border-radius: 0 0 10px 10px;
                line-height: 1.8;
                font-size: 0.98rem;
                color: #ced4da;
              `;
            }
          }
        });

        // Post-process: highlight actual question text inside each h3 and organize detailed info
        ivMarkdownResult.querySelectorAll('h3').forEach(h3 => {
          const text = h3.textContent || '';
          const colonIdx = text.indexOf(':');
          if (colonIdx === -1) return;
          const prefix = text.substring(0, colonIdx + 1).trim();   // e.g. "면접 질문 1:"
          const questionText = text.substring(colonIdx + 1).trim(); // actual question
          if (!questionText) return;

          // Style h3 as a badge container
          h3.style.cssText = `
            background: none;
            border: none;
            padding: 0;
            margin-top: 2.5rem;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            flex-wrap: wrap;
            box-shadow: none;
          `;

          h3.innerHTML = `
            <span style="
              background: var(--accent-gradient); 
              color: white; 
              padding: 0.35rem 1rem; 
              border-radius: 8px; 
              font-weight: 800; 
              font-size: 0.95rem; 
              white-space: nowrap; 
              box-shadow: 0 4px 12px rgba(124, 131, 253, 0.3);
            ">${prefix.replace(':', '')}</span>
          `;

          // Find and extract the yellow question box (created by marked.js)
          let nextDiv = h3.nextElementSibling;
          let questionBoxFound = false;

          if (nextDiv && nextDiv.style && nextDiv.style.background && (nextDiv.style.background.includes('#fffac9') || nextDiv.style.background.includes('fffac9'))) {
            questionBoxFound = true;
            nextDiv.style.cssText = `
              background: #fffde7;
              border: 2px solid #f59f00;
              border-radius: 12px;
              padding: 1.5rem 2rem;
              margin: 1.5rem 0 2rem 0;
              font-size: 1.25rem;
              font-weight: 800;
              color: #4e342e;
              line-height: 1.7;
              box-shadow: 0 10px 30px rgba(0,0,0,0.12);
              letter-spacing: -0.01em;
              position: relative;
            `;
            if (!nextDiv.innerHTML.includes('Q.')) {
              nextDiv.innerHTML = `<span style="color:#f59f00; font-size: 1.5rem; font-weight: 900; margin-right: 0.6rem;">Q.</span> ${nextDiv.innerHTML}`;
            }
          }

          // Process following ul/li elements for details
          nextDiv = questionBoxFound ? nextDiv.nextElementSibling : h3.nextElementSibling;
          if (nextDiv && nextDiv.tagName === 'UL') {
            const items = Array.from(nextDiv.querySelectorAll('li'));
            const detailsContainer = document.createElement('div');
            detailsContainer.style.cssText = `
              margin-top: 1.5rem;
              display: flex;
              flex-direction: column;
              gap: 1.2rem;
            `;

            items.forEach(li => {
              const liHtml = li.innerHTML || '';
              const liText = li.textContent || '';

              // Evaluation item with 📌
              if (liText.includes('📌')) {
                const evalSection = document.createElement('div');
                evalSection.style.cssText = `
                  display: flex;
                  flex-direction: column;
                  gap: 0.5rem;
                `;

                // Extract content between 📌 and parse by |
                const content = liHtml.replace('📌', '').trim();
                const parts = content.split('|');
                let evalHtml = '<div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;">';

                parts.forEach((part, idx) => {
                  const cleanPart = part.replace(/<[^>]*>/g, '').trim();
                  if (cleanPart) {
                    const iFirstPart = idx === 0;
                    const label = iFirstPart ? '평가 항목' : '질문 의도';
                    evalHtml += `
                      <div style="
                        background: ${iFirstPart ? 'rgba(150, 186, 255, 0.15)' : 'rgba(200, 150, 255, 0.15)'};
                        border: 1px solid ${iFirstPart ? 'rgba(150, 186, 255, 0.35)' : 'rgba(200, 150, 255, 0.35)'};
                        color: ${iFirstPart ? '#96baff' : '#d8a5ff'};
                        padding: 0.4rem 0.85rem;
                        border-radius: 6px;
                        font-size: 0.85rem;
                        font-weight: 600;
                      "><strong>${label}:</strong> ${cleanPart}</div>
                    `;
                  }
                });
                evalHtml += '</div>';

                evalSection.innerHTML = `
                  <div style="
                    font-size: 0.95rem;
                    font-weight: 700;
                    color: #96baff;
                    background: rgba(150, 186, 255, 0.1);
                    padding: 0.6rem 0.9rem;
                    border-left: 3px solid #96baff;
                    border-radius: 4px;
                  ">📌 평가항목 & 질문의도</div>
                  ${evalHtml}
                `;
                detailsContainer.appendChild(evalSection);
              }

              // Source/Context section with 📄
              if (liText.includes('📄') || liText.includes('문항 출처') || liText.includes('생기부')) {
                const sourceSection = document.createElement('div');
                sourceSection.style.cssText = `
                  background: rgba(100, 150, 200, 0.08);
                  border-left: 3px solid #5a8fb0;
                  padding: 1rem 1.25rem;
                  border-radius: 6px;
                `;

                // Extract quoted text and context
                const quotedMatch = liHtml.match(/"([^"]*)"/);
                let sourceContent = liHtml.replace('📄', '').replace(/^.*?문항 출처/, '').trim();

                sourceSection.innerHTML = `
                  <div style="
                    font-size: 0.95rem;
                    font-weight: 700;
                    color: #7eb3d6;
                    margin-bottom: 0.8rem;
                  ">📄 문항 출처(생기부 원문) & 의도</div>
                  <div style="
                    font-size: 0.9rem;
                    line-height: 1.7;
                    color: #d0e8f2;
                  ">
                    ${quotedMatch ? `<div style="background: rgba(255,255,255,0.05); padding: 0.8rem; border-radius: 4px; margin-bottom: 0.8rem; border-left: 3px solid #5a8fb0; font-style: italic;">"${quotedMatch[1]}"</div>` : ''}
                    <div>${sourceContent}</div>
                  </div>
                `;
                detailsContainer.appendChild(sourceSection);
              }

              // Answer guide section with ✅
              if (liText.includes('✅') || liText.includes('모범답안')) {
                const answerSection = document.createElement('div');
                answerSection.style.cssText = `
                  background: rgba(100, 200, 100, 0.08);
                  border-left: 3px solid #5a9d6f;
                  padding: 1rem 1.25rem;
                  border-radius: 6px;
                `;

                let answerContent = liHtml.replace('✅', '').replace(/^.*?모범답안/, '').trim();

                answerSection.innerHTML = `
                  <div style="
                    font-size: 0.95rem;
                    font-weight: 700;
                    color: #7ecb8f;
                    margin-bottom: 0.8rem;
                  ">✅ 모범답안 가이드</div>
                  <div style="
                    font-size: 0.9rem;
                    line-height: 1.7;
                    color: #d0f0d8;
                  ">${answerContent}</div>
                `;
                detailsContainer.appendChild(answerSection);
              }
            });

            if (detailsContainer.children.length > 0) {
              nextDiv.after(detailsContainer);
            }
            nextDiv.remove();
          }
        });
      } catch (err) {
        ivMarkdownResult.innerHTML = `<p style="color:var(--danger)">생성 중 오류 발생: ${err.message}</p>`;
      } finally {
        ivLoadingState.classList.add("hidden");
        ivAnalyzeBtn.disabled = false;
        ivResultContainer.scrollIntoView({ behavior: "smooth" });
      }
    });
  }

  // ----- 가천대 면접 가이드 모달 및 PDF 인쇄 -----
  window.showGachonGuideModal = function () {
    const modalTitle = document.getElementById("modalTitle");
    const modalBody = document.getElementById("modalBody");
    const modalOverlay = document.getElementById("analysisModal");
    if (!modalTitle || !modalBody || !modalOverlay) return;

    modalTitle.innerText = "가천대학교 면접 가이드";
    // Get gachonGuideContent from the already-rendered banner's sibling
    const bannerEl = document.getElementById("iv-gachon-guide-banner");
    // Re-use the guide HTML built inline
    modalBody.innerHTML = `
      <style>
        #gachon-guide-content table { width:100%; border-collapse: collapse; }
        #gachon-guide-content th, #gachon-guide-content td { padding: 10px; border: 1px solid var(--panel-border); }
        #gachon-guide-content th { background: rgba(150,186,255,0.15); text-align: left; }
        #gachon-guide-content ul { padding-left: 1.5rem; }
      </style>
      <div id="gachon-guide-content" style="line-height:1.8; font-size:1.0rem; color: var(--text-primary);">
        <h3 style="color:var(--accent-primary); margin-top: 0;">1. 면접 반영 비율 및 합격 역전률</h3>
        <p>가천대학교는 2단계 평가에서 <strong>1단계 서류 성적 50%와 면접 평가 50%</strong>를 합산하여 최종 합격자를 선발합니다.<br>
        면접의 비중이 50%로 매우 높기 때문에, 1단계 합격자 순위가 뒤바뀌는 <strong>'역전률'이 무려 약 60%</strong>에 달합니다.<br>
        심지어 1단계에서 4~5배수 턱걸이 성적으로 통과한 학생들 중에서도 20%가 최종 합격할 만큼 면접의 실질적인 영향력이 절대적인 대학입니다.</p>

        <h3 style="color:var(--accent-primary);">2. 면접 진행 방식</h3>
        <ul>
          <li><strong>완벽한 블라인드 면접</strong>: 지원자의 1단계 서류 성적까지 모두 면접관에게 가려진 상태로 진행됩니다.</li>
          <li><strong>평가 위원 구성</strong>: 전임 입학사정관과 위촉 사정관(교수 등)을 포함하여 총 3인의 평가위원이 다대일 면접을 진행합니다.</li>
          <li><strong>맞춤형 꼬리 질문</strong>: 지원자의 서류를 바탕으로 면접관이 직접 질문을 작성하며, 지원자가 해당 계열에 대해 얼마나 깊은 관심을 가지고 있는지 집중적으로 파악합니다.</li>
        </ul>

        <h3 style="color:var(--accent-primary);">3. 핵심 평가 요소 (40 : 40 : 20)</h3>
        <table>
          <thead><tr><th>평가 요소</th><th style="text-align:center;">비율</th><th>세부 내용</th></tr></thead>
          <tbody>
            <tr><td><strong>진학 의지 및 계열 적합성</strong></td><td style="text-align:center;">40%</td><td>탐구 과정에서의 성장·사고력, 과정 수행 역량, 교과 지식 연계</td></tr>
            <tr><td><strong>인성</strong></td><td style="text-align:center;">40%</td><td>공동체 활동의 적극성 + 면접 현장참여 태도</td></tr>
            <tr><td><strong>의사소통 역량</strong></td><td style="text-align:center;">20%</td><td>질문 이해도 + 답변의 논리성</td></tr>
          </tbody>
        </table>

        <h3 style="color:var(--accent-primary);">4. 실제 면접 질문 예시</h3>
        <p><strong>[인성 영역]</strong><br>
        "자율활동에 부반장으로 활동하며 특별한 역할의 필요성을 어필하고 직접 수행했다고 기록되어 있는데, 그 역할이 왜 필요하다고 했으며, 이를 어떻게 수행했는지 설명해주세요."</p>
        <p><strong>[진학 의지 및 계열 적합성 영역]</strong></p>
        <ul>
          <li>"사회 시간에 형법 분야에 관심이 많아 스스로 관련 분야에 대한 심화 탐구를 진행했다고 기록되어 있습니다. 탐구한 주요 내용을 설명해주세요."</li>
          <li>"수학 시간에 미적분과 관련된 책을 읽고, 미분과 적분에 대한 개념을 정리했다고 기록되어 있습니다. 책에서 인상 깊었던 핵심 내용을 설명하고, 미분의 정의를 설명해주세요."</li>
        </ul>

        <h3 style="color:var(--accent-primary);">5. 전략 요약</h3>
        <p>가천대 면접은 면접관에게 성적이 공개되지 않는 <strong>3대1 블라인드 면접</strong>이므로, 서류 내용의 핵심 원리(특히 교과 지식)를 정확히 숙지하고 논리적인 태도로 답변한다면 성적의 불리함을 충분히 뒤집을 수 있는 기회의 장입니다.</p>
        <div style="margin-top:1.5rem; text-align:right;">
          <button onclick="window.printGachonGuide()" style="background:var(--accent-gradient);color:#fff;border:none;padding:0.6rem 1.4rem;border-radius:8px;font-size:0.9rem;font-weight:600;cursor:pointer;">🖨️ PDF로 인쇄</button>
        </div>
      </div>`;
    modalOverlay.classList.remove("hidden");
  };

  window.printGachonGuide = function () {
    const printWin = window.open("", "_blank", "width=900,height=700");
    printWin.document.write(`<!DOCTYPE html><html lang="ko"><head>
      <meta charset="UTF-8">
      <title>가천대학교 면접 가이드</title>
      <style>
        body { font-family: 'Malgun Gothic', sans-serif; color: #333; padding: 2rem 3rem; line-height: 1.8; }
        h1 { color: #00796b; border-bottom: 3px solid #00796b; padding-bottom: 0.5rem; }
        h2 { color: #004d40; margin-top: 1.8rem; }
        table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
        th { background: #e0f2f1; padding: 10px; border: 1px solid #b2dfdb; text-align: left; }
        td { padding: 10px; border: 1px solid #b2dfdb; }
        ul { padding-left: 1.5rem; }
        .badge { display: inline-block; background: #00796b; color: #fff; padding: 2px 10px; border-radius: 20px; font-size: 0.9rem; margin-left: 0.5rem; }
        @media print { body { padding: 1rem; } }
      </style>
    </head><body>
      <h1>🎓 가천대학교 면접 가이드</h1>
      <h2>1. 면접 반영 비율 및 합격 역전률</h2>
      <p>가천대학교는 2단계 평가에서 <strong>1단계 서류 성적 50%와 면접 평가 50%</strong>를 합산하여 최종 합격자를 선발합니다.<br>
      면접의 비중이 50%로 매우 높기 때문에, 1단계 합격자 순위가 뒤바뀌는 <strong>'역전률'이 무려 약 60%</strong>에 달합니다.<br>
      심지어 1단계에서 4~5배수 턱걸이 성적으로 통과한 학생들 중에서도 20%가 최종 합격할 만큼 면접의 실질적인 영향력이 절대적인 대학입니다.</p>
      <h2>2. 면접 진행 방식</h2>
      <ul>
        <li><strong>완벽한 블라인드 면접</strong>: 지원자의 1단계 서류 성적까지 모두 면접관에게 가려진 상태로 진행됩니다.</li>
        <li><strong>평가 위원 구성</strong>: 전임 입학사정관과 위촉 사정관(교수 등)을 포함하여 총 3인의 평가위원이 다대일 면접을 진행합니다.</li>
        <li><strong>맞춤형 꼬리 질문</strong>: 지원자의 서류를 바탕으로 면접관이 직접 질문을 작성하며, 지원자가 해당 계열에 대해 얼마나 깊은 관심을 가지고 있는지 집중적으로 파악합니다.</li>
      </ul>
      <h2>3. 핵심 평가 요소 (40 : 40 : 20)</h2>
      <table>
        <thead><tr><th>평가 요소</th><th>비율</th><th>세부 내용</th></tr></thead>
        <tbody>
          <tr><td><strong>진학 의지 및 계열 적합성</strong></td><td>40%</td><td>탐구 과정에서의 성장·사고력, 과정 수행 역량, 교과 지식 연계</td></tr>
          <tr><td><strong>인성</strong></td><td>40%</td><td>공동체 활동의 적극성 + 면접 현장 참여 태도 전반</td></tr>
          <tr><td><strong>의사소통 역량</strong></td><td>20%</td><td>질문 이해도 + 답변의 논리성</td></tr>
        </tbody>
      </table>
      <h2>4. 실제 면접 질문 예시</h2>
      <p><strong>[인성 영역]</strong><br>
      "자율활동에 부반장으로 활동하며 특별한 역할의 필요성을 어필하고 직접 수행했다고 기록되어 있는데, 그 역할이 왜 필요하다고 했으며, 이를 어떻게 수행했는지 설명해주세요."</p>
      <p><strong>[진학 의지 및 계열 적합성 영역]</strong></p>
      <ul>
        <li>"사회 시간에 형법 분야에 관심이 많아 스스로 관련 분야에 대한 심화 탐구를 진행했다고 기록되어 있습니다. 탐구한 주요 내용을 설명해주세요."</li>
        <li>"수학 시간에 미적분과 관련된 책을 읽고, 미분과 적분에 대한 개념을 정리했다고 기록되어 있습니다. 책에서 인상 깊었던 핵심 내용을 설명하고, 미분의 정의를 설명해주세요."</li>
      </ul>
      <h2>5. 전략 요약</h2>
      <p>가천대 면접은 면접관에게 성적이 공개되지 않는 <strong>3대1 블라인드 면접</strong>이므로, 서류 내용의 핵심 원리(특히 교과 지식)를 정확히 숙지하고 논리적인 태도로 답변한다면 성적의 불리함을 충분히 뒤집을 수 있는 기회의 장입니다.</p>
    </body></html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); }, 500);
  };

  // ----- 서울시립대 면접 가이드 모달 및 PDF 인쇄 -----
  window.showSeoulGuideModal = function () {
    const modalTitle = document.getElementById("modalTitle");
    const modalBody = document.getElementById("modalBody");
    const modalOverlay = document.getElementById("analysisModal");
    if (!modalTitle || !modalBody || !modalOverlay) return;
    modalTitle.innerText = "서울시립대학교 면접 가이드";
    modalBody.innerHTML = `
      <style>
        #uos-guide-content table { width:100%; border-collapse: collapse; }
        #uos-guide-content th, #uos-guide-content td { padding: 10px; border: 1px solid var(--panel-border); }
        #uos-guide-content th { background: rgba(150,186,255,0.15); text-align: left; }
        #uos-guide-content ul { padding-left: 1.5rem; }
      </style>
      <div id="uos-guide-content" style="line-height:1.8; font-size:1.0rem; color: var(--text-primary);">
        <h3 style="color:var(--accent-primary); margin-top:0;">1. 면접 반영 비중 및 합격 역전률</h3>
        <p>서울시립대는 2단계 평가에서 <strong>1단계 서류 점수 50%와 면접 평가 점수 50%</strong>를 합산하여 최종 합격자를 선발합니다.<br>
        1배수(최초 합격권) 밖에서 최종 합격한 학생의 비율이 <strong>57%</strong>에 달할 정도로 면접의 영향력이 매우 큽니다.<br>
        1단계 3배수 선발 시 서류 성적의 변별력이 무의미해질 만큼 면접을 통해 당락이 결정되는 경향이 짙습니다.</p>
        <h3 style="color:var(--accent-primary);">2. 면접 진행 방식 및 주요 특징</h3>
        <ul>
          <li><strong>평가 위원 및 시간</strong>: 전임 입학사정관과 위촉 사정관(교수 등) 총 2인의 면접관이 지원자 1명을 대상으로 12분 이내의 면접을 진행합니다.</li>
          <li><strong>평가 방식</strong>: 면접관에게 학생부 전체가 공개된 상태에서 블라인드 면접으로 치러집니다.</li>
          <li><strong>맞춤형 질문 출제</strong>: 서류 심사자와 면접관이 사전에 학생부를 꼼꼼히 분석하여 개별 면접 질문을 직접 작성하며, 각 모집단위(학과)별 인재상을 중요하게 반영합니다.</li>
          <li><strong>평가의 핵심 초점</strong>: 활동 나열보다 <strong>'학업 역량을 기반으로 한 진로 활동'</strong>을 중점적으로 봅니다. 학업(교과 지식)과 진로 탐구 활동이 어떻게 연계되었는지 심층 검증합니다.</li>
        </ul>
        <h3 style="color:var(--accent-primary);">3. 3대 핵심 평가 요소 (40 : 35 : 25)</h3>
        <table>
          <thead><tr><th>평가 요소</th><th style="text-align:center;">비율</th><th>세부 내용</th></tr></thead>
          <tbody>
            <tr><td><strong>잠재역량</strong></td><td style="text-align:center;">40%</td><td>교육활동 연계·심화 학습(다학제적 전공수학열의), 통합적 문제해결역량(자신만의 대안 제시)</td></tr>
            <tr><td><strong>학업역량</strong></td><td style="text-align:center;">35%</td><td>고교 교과 성취도(고교기초학업능력), 전공 분야 탐구·학습 경험(대학전공기초 소양)</td></tr>
            <tr><td><strong>사회역량</strong></td><td style="text-align:center;">25%</td><td>공동체·시민윤리의식(공공의 이익 중시), 협동학습능력(팀워크·부족한 점 보완)</td></tr>
          </tbody>
        </table>
        <h3 style="color:var(--accent-primary);">4. 실제 면접 질문 예시</h3>
        <p><strong>[학업역량 관련]</strong><br>"3학년 자율활동에서 자연이자율 하락의 해결책으로 '평균인플레이션 목표제'를 제시했는데, 그 개념을 설명해 보세요. 물가안정목표제와 비교하여 장단점은 무엇이며 한국 경제에는 어떤 것이 더 적합하다고 생각하나요?"</p>
        <p><strong>[잠재역량 관련]</strong><br>"동아리에서 정부의 재정계산 자료를 탐독하고 국민연금 개혁안의 충돌을 문제 삼았는데, 현재 국민연금의 상황과 개혁안의 충돌 문제는 무엇인가요? 연금의 지속 가능성을 확보하기 위한 과제에 대해 생각해본 적 있나요?"</p>
        <p><strong>[사회역량 관련]</strong><br>"사회문화 시간에 '고령화 시대 복지 사각지대에 놓인 노인들'에 대한 보고서를 작성했는데, 노인 빈곤율·파산율 자료를 분석한 결과 무엇을 알 수 있었나요? 빈곤의 원인은 무엇이라 생각하며, 해결 방안을 제시해 보세요."</p>
        <h3 style="color:var(--accent-primary);">5. 전략 요약</h3>
        <p>서울시립대 면접은 면접관이 학생부 전체를 본 상태에서 진행되므로, <strong>서류에 기재된 활동의 원리와 사회적 적용, 자신만의 해결책</strong>을 논리적으로 설명할 수 있도록 준비해야 합니다.</p>
        <div style="margin-top:1.5rem; text-align:right;">
          <button onclick="window.printSeoulGuide()" style="background:var(--accent-gradient);color:#fff;border:none;padding:0.6rem 1.4rem;border-radius:8px;font-size:0.9rem;font-weight:600;cursor:pointer;">🖨️ PDF로 인쇄</button>
        </div>
      </div>`;
    modalOverlay.classList.remove("hidden");
  };

  window.printSeoulGuide = function () {
    const printWin = window.open("", "_blank", "width=900,height=700");
    printWin.document.write(`<!DOCTYPE html><html lang="ko"><head>
      <meta charset="UTF-8">
      <title>서울시립대학교 면접 가이드</title>
      <style>
        body { font-family: 'Malgun Gothic', sans-serif; color: #333; padding: 2rem 3rem; line-height: 1.8; }
        h1 { color: #3c3fa0; border-bottom: 3px solid #3c3fa0; padding-bottom: 0.5rem; }
        h2 { color: #2c3e7d; margin-top: 1.8rem; }
        table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
        th { background: #eef0ff; padding: 10px; border: 1px solid #c5cdf7; text-align: left; }
        td { padding: 10px; border: 1px solid #c5cdf7; }
        ul { padding-left: 1.5rem; }
        @media print { body { padding: 1rem; } }
      </style>
    </head><body>
      <h1>🎓 서울시립대학교 면접 가이드</h1>
      <h2>1. 면접 반영 비중 및 합격 역전률</h2>
      <p>서울시립대는 2단계 평가에서 <strong>1단계 서류 점수 50%와 면접 평가 점수 50%</strong>를 합산하여 최종 합격자를 선발합니다.<br>
      1배수(최초 합격권) 밖에서 최종 합격한 학생의 비율이 <strong>57%</strong>에 달할 정도로 면접의 영향력이 매우 큽니다.<br>
      1단계 3배수 선발 시 서류 성적의 변별력이 무의미해질 만큼 면접을 통해 당락이 결정되는 경향이 짙습니다.</p>
      <h2>2. 면접 진행 방식 및 주요 특징</h2>
      <ul>
        <li><strong>평가 위원 및 시간</strong>: 전임 입학사정관과 위촉 사정관(교수 등) 총 2인의 면접관이 지원자 1명을 대상으로 12분 이내의 면접을 진행합니다.</li>
        <li><strong>평가 방식</strong>: 면접관에게 학생부 전체가 공개된 상태에서 블라인드 면접으로 치러집니다.</li>
        <li><strong>맞춤형 질문 출제</strong>: 서류 심사자와 면접관이 사전에 학생부를 꼼꼼히 분석하여 개별 면접 질문을 직접 작성하며, 각 모집단위(학과)별 인재상을 중요하게 반영합니다.</li>
        <li><strong>평가의 핵심 초점</strong>: 활동 나열보다 '학업 역량을 기반으로 한 진로 활동'을 중점적으로 봅니다.</li>
      </ul>
      <h2>3. 3대 핵심 평가 요소 (40 : 35 : 25)</h2>
      <table>
        <thead><tr><th>평가 요소</th><th>비율</th><th>세부 내용</th></tr></thead>
        <tbody>
          <tr><td><strong>잠재역량</strong></td><td>40%</td><td>교육활동 연계·심화 학습(다학제적 전공수학열의), 통합적 문제해결역량</td></tr>
          <tr><td><strong>학업역량</strong></td><td>35%</td><td>고교 교과 성취도, 전공 분야 탐구·학습 경험</td></tr>
          <tr><td><strong>사회역량</strong></td><td>25%</td><td>공동체·시민윤리의식, 협동학습능력</td></tr>
        </tbody>
      </table>
      <h2>4. 실제 면접 질문 예시</h2>
      <p><strong>[학업역량]</strong><br>"3학년 자율활동에서 자연이자율 하락의 해결책으로 '평균인플레이션 목표제'를 제시했는데, 그 개념을 설명해 보세요. 물가안정목표제와 비교하여 장단점은 무엇이며 한국 경제에는 어떤 것이 더 적합하다고 생각하나요?"</p>
      <p><strong>[잠재역량]</strong><br>"동아리에서 정부의 재정계산 자료를 탐독하고 국민연금 개혁안의 충돌을 문제 삼았는데, 현재 국민연금의 상황과 개혁안의 충돌 문제는 무엇인가요? 연금의 지속 가능성을 확보하기 위한 과제에 대해 생각해본 적 있나요?"</p>
      <p><strong>[사회역량]</strong><br>"사회문화 시간에 '고령화 시대 복지 사각지대에 놓인 노인들'에 대한 보고서를 작성했는데, 노인 빈곤율·파산율 자료를 분석한 결과 무엇을 알 수 있었나요? 빈곤의 원인은 무엇이라 생각하며, 해결 방안을 제시해 보세요."</p>
      <h2>5. 전략 요약</h2>
      <p>서울시립대 면접은 면접관이 학생부 전체를 본 상태에서 진행되므로, <strong>서류에 기재된 활동의 원리와 사회적 적용, 자신만의 해결책</strong>을 논리적으로 설명할 수 있도록 준비해야 합니다. 단순 사실 나열이 아닌 깊이 있는 사고력과 문제해결 능력을 보여주는 것이 핵심입니다.</p>
    </body></html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); }, 500);
  };

  // ----- 숭실대 면접 가이드 모달 및 PDF 인쇄 -----
  window.showSoongsilGuideModal = function () {
    const modalTitle = document.getElementById("modalTitle");
    const modalBody = document.getElementById("modalBody");
    const modalOverlay = document.getElementById("analysisModal");
    if (!modalTitle || !modalBody || !modalOverlay) return;
    modalTitle.innerText = "숭실대학교 면접 가이드";
    modalBody.innerHTML = `
      <style>
        #ssu-guide-content table { width:100%; border-collapse:collapse; }
        #ssu-guide-content th, #ssu-guide-content td { padding:10px; border:1px solid var(--panel-border); }
        #ssu-guide-content th { background:rgba(220,53,69,0.1); text-align:left; }
        #ssu-guide-content ul { padding-left:1.5rem; }
      </style>
      <div id="ssu-guide-content" style="line-height:1.8; font-size:1.0rem; color:var(--text-primary);">
        <h3 style="color:#ff8a9b; margin-top:0;">1. 면접 비중 및 압도적인 영향력</h3>
        <p>숭실대는 1단계 서류 평가에서 3배수를 선발한 뒤, 2단계에서 <strong>1단계 성적 50%와 면접 50%</strong>를 합산하여 최종 합격자를 선발합니다.<br>
        면접 비중이 매우 높아 <strong>2.3배수 내 합격률(역전률)이 65.6%</strong>에 달할 정도로 당락을 가르는 핵심 변수가 됩니다.</p>
        <h3 style="color:#ff8a9b;">2. 면접 진행 방식</h3>
        <ul>
          <li>전임사정관과 <strong>전공 교수</strong>로 구성된 <strong>2인의 면접위원</strong>이 지원자 1명을 대상으로 <strong>12분 이내</strong>의 면접을 진행합니다.</li>
          <li>면접관에게 학생부 전체가 공개되며, 이를 바탕으로 사전에 질문을 작성하여 <strong>블라인드 방식</strong>으로 면접이 치러집니다.</li>
        </ul>
        <h3 style="color:#ff8a9b;">3. 핵심 평가 요소 (50 : 50)</h3>
        <table>
          <thead><tr><th>평가 요소</th><th style="text-align:center;">비율</th><th>세부 내용</th></tr></thead>
          <tbody>
            <tr><td><strong>전공적합성</strong></td><td style="text-align:center;">50%</td><td>전공 준비도(지원 동기·학업계획) + 전공 탐구 노력(심화 탐구 수준·교과 지식 활용 문제 해결)</td></tr>
            <tr><td><strong>인성 및 잠재력</strong></td><td style="text-align:center;">50%</td><td>자기평가력(목표 대비 자기 평가·발전) + 협력적 소통 능력(타인 존중·의견 표현·협력)</td></tr>
          </tbody>
        </table>
        <h3 style="color:#ff8a9b;">4. 가장 큰 특징: 집요한 탐침(꼬리) 질문</h3>
        <p>단순 서류 확인에 그치지 않고, 전공 관련 심화 탐구 활동에 대해 깊이 파고들어 <strong>진짜 본인의 지식인지 검증</strong>하는 탐침 질문이 집중적으로 나옵니다.</p>
        <p><strong>[전공/학업 관련 꼬리 질문 예시]</strong><br>
        화학과 지원자가 '베타카로틴 항산화 효과 검증 실험'을 언급하자:<br>
        → "항산화 물질은 어떠한 원리로 항산화 효과를 내는지 설명하라"<br>
        → "산화환원 개념에 대해 설명하라"</p>
        <p><strong>[진로 및 발전 가능성]</strong><br>
        "구체적인 진로 목표가 무엇인지 이야기해 보세요"<br>
        "입학 후 학업계획에 대해서 이야기해 보세요"</p>
        <h3 style="color:#ff8a9b;">5. 전략 요약</h3>
        <p>학생부에 기재된 전공 관련 심화 활동의 과정뿐만 아니라 <strong>그 바탕이 되는 교과 개념과 원리를 완벽히 숙지</strong>하고, 이어지는 강도 높은 꼬리 질문에 논리적으로 대답할 수 있도록 준비해야 합니다.</p>
        <div style="margin-top:1.5rem; text-align:right;">
          <button onclick="window.printSoongsilGuide()" style="background:linear-gradient(135deg,#dc3545,#c82333);color:#fff;border:none;padding:0.6rem 1.4rem;border-radius:8px;font-size:0.9rem;font-weight:600;cursor:pointer;">🖨️ PDF로 인쇄</button>
        </div>
      </div>`;
    modalOverlay.classList.remove("hidden");
  };

  window.printSoongsilGuide = function () {
    const printWin = window.open("", "_blank", "width=900,height=700");
    printWin.document.write(`<!DOCTYPE html><html lang="ko"><head>
      <meta charset="UTF-8">
      <title>숭실대학교 면접 가이드</title>
      <style>
        body { font-family:'Malgun Gothic',sans-serif; color:#333; padding:2rem 3rem; line-height:1.8; }
        h1 { color:#c82333; border-bottom:3px solid #c82333; padding-bottom:0.5rem; }
        h2 { color:#a71d2a; margin-top:1.8rem; }
        table { width:100%; border-collapse:collapse; margin:1rem 0; }
        th { background:#fdecea; padding:10px; border:1px solid #f5c6cb; text-align:left; }
        td { padding:10px; border:1px solid #f5c6cb; }
        ul { padding-left:1.5rem; }
        blockquote { border-left:4px solid #c82333; padding:0.5rem 1rem; background:#fff5f5; margin:0.5rem 0; }
        @media print { body { padding:1rem; } }
      </style>
    </head><body>
      <h1>🎓 숭실대학교 면접 가이드</h1>
      <h2>1. 면접 비중 및 합격 역전률</h2>
      <p>숭실대는 1단계 3배수 선발 후, 2단계에서 <strong>1단계 성적 50% + 면접 50%</strong>로 최종 합격자 선발.<br>
      <strong>2.3배수 내 역전률 65.6%</strong>로 면접이 당락을 가르는 핵심 변수.</p>
      <h2>2. 면접 진행 방식</h2>
      <ul>
        <li>전임사정관 + 전공 교수 구성 <strong>2인 면접위원</strong> × 지원자 1인, <strong>12분 이내</strong></li>
        <li>학생부 전체 공개 + 사전 질문 작성 + <strong>블라인드 방식</strong></li>
      </ul>
      <h2>3. 핵심 평가 요소 (50 : 50)</h2>
      <table>
        <thead><tr><th>평가 요소</th><th>비율</th><th>세부 내용</th></tr></thead>
        <tbody>
          <tr><td><strong>전공적합성</strong></td><td>50%</td><td>전공 준비도(지원 동기·학업계획) + 전공 탐구 노력(심화 탐구·교과 지식 문제 해결)</td></tr>
          <tr><td><strong>인성 및 잠재력</strong></td><td>50%</td><td>자기평가력(목표 대비 발전) + 협력적 소통 능력(타인 존중·의견 표현·협력)</td></tr>
        </tbody>
      </table>
      <h2>4. 집요한 탐침(꼬리) 질문</h2>
      <p>전공 심화 탐구 활동의 교과 개념·원리를 직접 설명하도록 요구:</p>
      <blockquote>"항산화 물질은 어떠한 원리로 항산화 효과를 내는지 설명하라"<br>"산화환원 개념에 대해 설명하라"</blockquote>
      <blockquote>"구체적인 진로 목표가 무엇인지 이야기해 보세요"<br>"입학 후 학업계획에 대해서 이야기해 보세요"</blockquote>
      <h2>5. 전략 요약</h2>
      <p>학생부 심화 활동의 바탕이 되는 <strong>교과 개념·원리를 완벽히 숙지</strong>하고, 강도 높은 꼬리 질문에 논리적으로 대답할 수 있도록 준비해야 합니다.</p>
    </body></html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); }, 500);
  };

  // ----- 한국외대 면접 가이드 모달 및 PDF 인쇄 -----
  window.showHufsGuideModal = function () {
    const modalTitle = document.getElementById("modalTitle");
    const modalBody = document.getElementById("modalBody");
    const modalOverlay = document.getElementById("analysisModal");
    if (!modalTitle || !modalBody || !modalOverlay) return;
    modalTitle.innerText = "한국외국어대학교 면접 가이드";
    modalBody.innerHTML = `
      <style>
        #hufs-guide-content table { width:100%; border-collapse:collapse; }
        #hufs-guide-content th, #hufs-guide-content td { padding:10px; border:1px solid var(--panel-border); }
        #hufs-guide-content th { background:rgba(0,33,71,0.1); text-align:left; }
        #hufs-guide-content ul { padding-left:1.5rem; }
      </style>
      <div id="hufs-guide-content" style="line-height:1.8; font-size:1.0rem; color:var(--text-primary);">
        <h3 style="color:#90caf9; margin-top:0;">1. 면접 비중 및 주요 특징</h3>
        <p>한국외대는 1단계에서 3배수 선발 후, 2단계에서 <strong>1단계 서류 50% + 면접 50%</strong>를 합산하여 최종 선발합니다.<br>
        면접의 실질적 영향력이 50% 이상으로 매우 크며, 수능 이후 진행되므로 결시율에 따른 실질 경쟁률 변화가 주요 변수입니다.</p>
        <h3 style="color:#90caf9;">2. 면접 진행 방식</h3>
        <ul>
          <li>전임 입학사정관 1인 + 위촉 사정관 1인, <strong>총 2인의 평가 체제</strong></li>
          <li>공개된 학생부 전체를 바탕으로 질문 작성, <strong>10분 이내 블라인드 면접</strong> 실시</li>
        </ul>
        <h3 style="color:#90caf9;">3. 핵심 평가 요소 (40 : 40 : 20)</h3>
        <table>
          <thead><tr><th>평가 요소</th><th style="text-align:center;">비율</th><th>세부 내용</th></tr></thead>
          <tbody>
            <tr><td><strong>학업 역량</strong></td><td style="text-align:center;">40%</td><td>대학 수학 지식, 새로운 방식으로 문제 바라보기, 폭넓은 탐구 및 해결 능력</td></tr>
            <tr><td><strong>진로 역량</strong></td><td style="text-align:center;">40%</td><td>진로 선택 지식/태도/가치관, 자기주도적 진로 설계 및 탐색 능력</td></tr>
            <tr><td><strong>공동체 역량</strong></td><td style="text-align:center;">20%</td><td>개인과 공동체의 조화로운 발전 가치관, 공동체 발전 적극 참여 능력</td></tr>
          </tbody>
        </table>
        <h3 style="color:#90caf9;">4. 실제 면접 질문 예시</h3>
        <p><strong>[학업 역량 관련]</strong><br>"빅데이터에 관련된 도서를 많이 읽었는데, 빅데이터를 무역에 적용한 사례가 있었나요?"<br>"‘랑그’와 ‘빠롤’을 학급 친구들에게 어떻게 소개했나요?"</p>
        <p><strong>[진로 역량 관련]</strong><br>"영문학 작품 중 가장 추천하고 싶은 책은 무엇인가요?"<br>"코로나19 팬데믹에서 드러난 프랑스와 한국 문화의 공통점과 차이점은 무엇인가요?"</p>
        <h3 style="color:#90caf9;">5. 전략 요약</h3>
        <p>한국외대 면접은 <strong>'교과 수업을 통해 지적 호기심을 얼마나 폭넓게 확장했는가'</strong>와 <strong>'자기주도적 탐구 역량'</strong>을 증명하는 것이 핵심입니다.</p>
        <div style="margin-top:1.5rem; text-align:right;">
          <button onclick="window.printHufsGuide()" style="background:linear-gradient(135deg,#002147,#004c8e);color:#fff;border:none;padding:0.6rem 1.4rem;border-radius:8px;font-size:0.9rem;font-weight:600;cursor:pointer;">🖨️ PDF로 인쇄</button>
        </div>
      </div>`;
    modalOverlay.classList.remove("hidden");
  };

  window.printHufsGuide = function () {
    const printWin = window.open("", "_blank", "width=900,height=700");
    printWin.document.write(`<!DOCTYPE html><html lang="ko"><head>
      <meta charset="UTF-8">
      <title>한국외국어대학교 면접 가이드</title>
      <style>
        body { font-family:'Malgun Gothic',sans-serif; color:#333; padding:2rem 3rem; line-height:1.8; }
        h1 { color:#002147; border-bottom:3px solid #002147; padding-bottom:0.5rem; }
        h2 { color:#003366; margin-top:1.8rem; }
        table { width:100%; border-collapse:collapse; margin:1rem 0; }
        th { background:#f0f4f8; padding:10px; border:1px solid #d1d9e6; text-align:left; }
        td { padding:10px; border:1px solid #d1d9e6; }
        ul { padding-left:1.5rem; }
        @media print { body { padding:1rem; } }
      </style>
    </head><body>
      <h1>🎓 한국외국어대학교 면접 가이드</h1>
      <h2>1. 면접 비중 및 실질 영향력</h2>
      <p>1단계 서류 50% + 면접 50% 합산 최종 선발.<br>
      면접의 실질적 영향력이 50% 이상으로 매우 크며, 자기주도적 탐구 역량이 당락의 핵심입니다.</p>
      <h2>2. 면접 진행 방식</h2>
      <ul>
        <li>입학사정관 2인 평가 체제, 10분 이내 블라인드 면접</li>
        <li>학생부 전체를 바탕으로 질문 작성</li>
      </ul>
      <h2>3. 핵심 평가 요소 (40 : 40 : 20)</h2>
      <table>
        <thead><tr><th>평가 요소</th><th>비율</th><th>세부 내용</th></tr></thead>
        <tbody>
          <tr><td><strong>학업 역량</strong></td><td>40%</td><td>수학 지식, 창의적 문제 해결, 폭넓은 탐구 능력</td></tr>
          <tr><td><strong>진로 역량</strong></td><td>40%</td><td>자기주도적 진로 설계 및 탐색 능력, 진로 선택 가치관</td></tr>
          <tr><td><strong>공동체 역량</strong></td><td>20%</td><td>공동체 가치관, 협력 사례, 리더십</td></tr>
        </tbody>
      </table>
      <h2>4. 실제 면접 질문 예시</h2>
      <p><strong>[학업 역량]</strong> "빅데이터 무역 적용 사례", "랑그/빠롤 소개 경험"</p>
      <p><strong>[진로 역량]</strong> "영문학 작품 추천", "코로나19 팬데믹 문화 비교"</p>
      <h2>5. 전략 요약</h2>
      <p>교과 수업을 통한 <strong>지적 호기심 확장</strong>과 <strong>자기주도적 탐구</strong>를 증명하는 것이 합격의 열쇠입니다.</p>
    </body></html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); }, 500);
  };

  // ----- 세종대 면접 가이드 모달 및 PDF 인쇄 -----
  window.showSejongGuideModal = function () {
    const modalTitle = document.getElementById("modalTitle");
    const modalBody = document.getElementById("modalBody");
    const modalOverlay = document.getElementById("analysisModal");
    if (!modalTitle || !modalBody || !modalOverlay) return;
    modalTitle.innerText = "세종대학교 면접 가이드";
    modalBody.innerHTML = `
      <style>
        #sejong-guide-content table { width:100%; border-collapse:collapse; }
        #sejong-guide-content th, #sejong-guide-content td { padding:10px; border:1px solid var(--panel-border); }
        #sejong-guide-content th { background:rgba(103,58,183,0.1); text-align:left; }
        #sejong-guide-content ul { padding-left:1.5rem; }
      </style>
      <div id="sejong-guide-content" style="line-height:1.8; font-size:1.0rem; color:var(--text-primary);">
        <h3 style="color:#d1c4e9; margin-top:0;">1. 면접 비중 및 높은 영향력 (역전률)</h3>
        <p>세종대는 1단계에서 3~4배수 선발 후, 2단계에서 <strong>1단계 서류 60% + 면접 40%</strong>를 합산하여 최종 선발합니다.<br>
        면접 비중이 40%이지만, 1단계 성적을 뒤집고 합격하는 <strong>역전률이 50% 이상</strong>에 달할 정도로 면접의 영향력이 매우 큽니다.</p>
        <h3 style="color:#d1c4e9;">2. 면접 진행 방식 및 주요 특징</h3>
        <ul>
          <li><strong>블라인드 면접 및 녹음</strong>: 2인의 평가위원이 9분 이내의 면접을 진행하며, 면접 내용이 모두 녹음됩니다.</li>
          <li><strong>학생부 기반 심층 검증</strong>: 서류 심사 단계에서부터 질문지를 미리 작성하여 탐구 활동의 진위, 동기, 결과, 성장 과정 등을 꼼꼼히 묻습니다.</li>
        </ul>
        <h3 style="color:#d1c4e9;">3. 3대 핵심 평가 요소 (40 : 35 : 25)</h3>
        <table>
          <thead><tr><th>평가 요소</th><th style="text-align:center;">비율</th><th>세부 내용</th></tr></thead>
          <tbody>
            <tr><td><strong>진로 역량</strong></td><td style="text-align:center;">40%</td><td>전공 기초 소양/열정, 지원 동기, 진로 계획, 탐구 활동의 양과 질</td></tr>
            <tr><td><strong>창의융합 역량</strong></td><td style="text-align:center;">35%</td><td>종합적 사고력, 문제 해결 능력, 독창성, 자기주도성, 도전 정신</td></tr>
            <tr><td><strong>공동체 역량</strong></td><td style="text-align:center;">25%</td><td>질문 이해도, 의사소통 능력, 시간 활용, 정직하고 성실한 태도</td></tr>
          </tbody>
        </table>
        <h3 style="color:#d1c4e9;">4. [특수 면접] 창의소프트 전형 (발표 면접)</h3>
        <ul>
          <li><strong>진행 방식</strong>: 면접 전 40분간 제시문 기반 발표 자료 작성 → 3~5분 구술 발표 → 질의응답 및 서류 면접 병행</li>
          <li><strong>특징</strong>: 상당히 높은 수준의 창의력과 융합적 사고력을 요구하는 제시문이 출제됩니다.</li>
        </ul>
        <h3 style="color:#d1c4e9;">5. 실제 서류 기반 면접 질문 예시</h3>
        <p><strong>[진로/학업]</strong> "드론 관련 진로를 희망하게 된 지원 동기는?"<br>
        <strong>[창의융합]</strong> "우리나라가 드론 산업 강국이 되기 위해 갖춰야 할 핵심 조건은 무엇이라고 생각하나요?"<br>
        <strong>[기타]</strong> "우리 학교가 학생을 뽑아야 하는 이유와 마지막으로 하고 싶은 말은?"</p>
        <h3 style="color:#d1c4e9;">6. 전략 요약</h3>
        <p>세종대 면접은 <strong>탐구 활동의 본질적 의미</strong>와 <strong>전공에 대한 깊은 관심</strong>을 증명해야 합니다. 특히 창의소프트 전형은 주어진 정보를 융합하여 창의적으로 기획하고 발표하는 연습이 필수적입니다.</p>
        <div style="margin-top:1.5rem; text-align:right;">
          <button onclick="window.printSejongGuide()" style="background:linear-gradient(135deg,#673ab7,#512da8);color:#fff;border:none;padding:0.6rem 1.4rem;border-radius:8px;font-size:0.9rem;font-weight:600;cursor:pointer;">🖨️ PDF로 인쇄</button>
        </div>
      </div>`;
    modalOverlay.classList.remove("hidden");
  };

  window.printSejongGuide = function () {
    const printWin = window.open("", "_blank", "width=900,height=700");
    printWin.document.write(`<!DOCTYPE html><html lang="ko"><head>
      <meta charset="UTF-8">
      <title>세종대학교 면접 가이드</title>
      <style>
        body { font-family:'Malgun Gothic',sans-serif; color:#333; padding:2rem 3rem; line-height:1.8; }
        h1 { color:#512da8; border-bottom:3px solid #512da8; padding-bottom:0.5rem; }
        h2 { color:#4527a0; margin-top:1.8rem; }
        table { width:100%; border-collapse:collapse; margin:1rem 0; }
        th { background:#f3e5f5; padding:10px; border:1px solid #d1c4e9; text-align:left; }
        td { padding:10px; border:1px solid #d1c4e9; }
        ul { padding-left:1.5rem; }
        @media print { body { padding:1rem; } }
      </style>
    </head><body>
      <h1>🎓 세종대학교 면접 가이드</h1>
      <h2>1. 면접 반영 비중 및 합격 역전률</h2>
      <p>1단계 서류 60% + 면접 40% 합산 최종 선발.<br>
      <strong>역전률 50% 이상</strong>으로 면접의 영향력이 매우 높은 대학입니다.</p>
      <h2>2. 면접 진행 방식</h2>
      <ul>
        <li>2인 평가위원, 9분 이내 블라인드 면접 (전 과정 녹음)</li>
        <li>서류 심사 단계에서 작성된 질문지를 바탕으로 꼼꼼한 진위 검증</li>
      </ul>
      <h2>3. 핵심 평가 요소 (40 : 35 : 25)</h2>
      <table>
        <thead><tr><th>평가 요소</th><th>비율</th><th>세부 내용</th></tr></thead>
        <tbody>
          <tr><td><strong>진로 역량</strong></td><td>40%</td><td>소양/열정, 지원 동기, 진로 계획, 탐구 활동의 질</td></tr>
          <tr><td><strong>창의융합 역량</strong></td><td>35%</td><td>종합적 사고력, 문제 해결 능력, 독창성, 자기주도성</td></tr>
          <tr><td><strong>공동체 역량</strong></td><td>25%</td><td>질문 이해도, 의사소통, 정직/성실한 태도</td></tr>
        </tbody>
      </table>
      <h2>4. 창의소프트 전형 (발표 면접)</h2>
      <p>40분간 제시문 분석 및 자료 작성 후 3~5분 발표 진행. 상당히 높은 수준의 창의/융합 사고력을 요구함.</p>
      <h2>5. 전략 요약</h2>
      <p>탐구 활동의 <strong>동기-과정-결과-성장</strong>을 꼼꼼히 정리하고, 교과 지식을 활용하여 학과 관련 현상에 대한 자신만의 통찰력을 보여주는 것이 핵심입니다.</p>
    </body></html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); }, 500);
  };

  // ----- 건국대 면접 가이드 모달 및 PDF 인쇄 -----
  window.showKonkukGuideModal = function () {
    const modalTitle = document.getElementById("modalTitle");
    const modalBody = document.getElementById("modalBody");
    const modalOverlay = document.getElementById("analysisModal");
    if (!modalTitle || !modalBody || !modalOverlay) return;
    modalTitle.innerText = "건국대학교 면접 가이드";
    modalBody.innerHTML = `
      <style>
        #konkuk-guide-content table { width:100%; border-collapse:collapse; }
        #konkuk-guide-content th, #konkuk-guide-content td { padding:10px; border:1px solid var(--panel-border); }
        #konkuk-guide-content th { background:rgba(46,125,50,0.1); text-align:left; }
        #konkuk-guide-content ul { padding-left:1.5rem; }
      </style>
      <div id="konkuk-guide-content" style="line-height:1.8; font-size:1.0rem; color:var(--text-primary);">
        <h3 style="color:#a5d6a7; margin-top:0;">1. 면접 비중 및 합격 역전률</h3>
        <p>건국대는 1단계 서류 평가에서 3배수를 선발한 뒤, 2단계에서 <strong>1단계 서류 70% + 면접 30%</strong>를 합산하여 최종 선발합니다.<br>
        2단계 면접은 5등급 평가 방식으로 진행되며, 1배수 밖에서 최종 합격하는 <strong>역전률은 약 25~30%</strong> 수준입니다.</p>
        <h3 style="color:#a5d6a7;">2. 면접 진행 방식 및 주요 특징</h3>
        <ul>
          <li><strong>평가 위원</strong>: 입학사정관 2인이 10분 이내의 면접을 진행합니다.</li>
          <li><strong>성적 공개 면접</strong>: 블라인드 면접인 타 대학과 달리, 건국대는 <strong>면접관에게 학생의 교과 성적이 공개</strong>된 상태로 진행됩니다.</li>
          <li><strong>계열별 포커스</strong>: 자연계열은 수학/과학 지식 검증, 인문계열은 본인의 생각과 가치관 확인에 집중합니다.</li>
        </ul>
        <h3 style="color:#a5d6a7;">3. 3대 핵심 평가 요소 (40 : 30 : 30)</h3>
        <table>
          <thead><tr><th>평가 요소</th><th style="text-align:center;">배점</th><th>세부 내용</th></tr></thead>
          <tbody>
            <tr><td><strong>진로 역량</strong></td><td style="text-align:center;">400점</td><td>전공 관련 교과 이목 노력, 자기주도성, 창의적 문제해결력, 경험의 다양성</td></tr>
            <tr><td><strong>학업 역량</strong></td><td style="text-align:center;">300점</td><td>기초 학업 성취도, 학업 태도, 지적 호기심 및 탐구력</td></tr>
            <tr><td><strong>공동체 역량</strong></td><td style="text-align:center;">300점</td><td>협업 및 소통 능력, 나눔과 배려의 태도</td></tr>
          </tbody>
        </table>
        <h3 style="color:#a5d6a7;">4. 실제 면접 질문 예시</h3>
        <p><strong>[자연/공학]</strong> "‘지진 속 수학‘ 탐구에서 사용된 구체적인 수학적 개념은 무엇인가요?"<br>
        "단층 및 다층 퍼셉트론 프로그래밍 과정을 구체적으로 설명해주세요."</p>
        <p><strong>[인문/사회]</strong> "동·서양 철학의 본질적인 추구 방향 차이점은 무엇이라 생각하나요?"<br>
        "자유 무역과 보호 무역 보고서의 구체적인 핵심 내용을 설명해 주세요."</p>
        <h3 style="color:#a5d6a7;">5. 전략 요약</h3>
        <p>건국대 면접은 성적이 공개되므로, 서류에 기재된 탐구 활동의 결과보다는 <strong>과정(How)</strong>과 그 바탕이 되는 <strong>교과 개념</strong>을 논리적으로 설명하는 것이 핵심입니다.</p>
        <div style="margin-top:1.5rem; text-align:right;">
          <button onclick="window.printKonkukGuide()" style="background:linear-gradient(135deg,#2e7d32,#1b5e20);color:#fff;border:none;padding:0.6rem 1.4rem;border-radius:8px;font-size:0.9rem;font-weight:600;cursor:pointer;">🖨️ PDF로 인쇄</button>
        </div>
      </div>`;
    modalOverlay.classList.remove("hidden");
  };

  window.printKonkukGuide = function () {
    const printWin = window.open("", "_blank", "width=900,height=700");
    printWin.document.write(`<!DOCTYPE html><html lang="ko"><head>
      <meta charset="UTF-8">
      <title>건국대학교 면접 가이드</title>
      <style>
        body { font-family:'Malgun Gothic',sans-serif; color:#333; padding:2rem 3rem; line-height:1.8; }
        h1 { color:#2e7d32; border-bottom:3px solid #2e7d32; padding-bottom:0.5rem; }
        h2 { color:#1b5e20; margin-top:1.8rem; }
        table { width:100%; border-collapse:collapse; margin:1rem 0; }
        th { background:#e8f5e9; padding:10px; border:1px solid #c8e6c9; text-align:left; }
        td { padding:10px; border:1px solid #c8e6c9; }
        ul { padding-left:1.5rem; }
        @media print { body { padding:1rem; } }
      </style>
    </head><body>
      <h1>🎓 건국대학교 면접 가이드</h1>
      <h2>1. 면접 반영 비중 및 합격 역전률</h2>
      <p>1단계 서류 70% + 면접 30% 합산 최종 선발.<br>
      <strong>역전률 25~30%</strong> 수준으로, 교과 성적이 공개된 상태에서 전공 역량을 평가합니다.</p>
      <h2>2. 면접 진행 방식</h2>
      <ul>
        <li>입학사정관 2인, 10분 이내 대면 면접</li>
        <li><strong>학생부 교과 성적 공개</strong> 상태로 탐구 과정의 심도 확인</li>
      </ul>
      <h2>3. 핵심 평가 요소 (40 : 30 : 30)</h2>
      <table>
        <thead><tr><th>평가 요소</th><th>배점</th><th>세부 내용</th></tr></thead>
        <tbody>
          <tr><td><strong>진로 역량</strong></td><td>400점</td><td>전공 관련 이수 노력, 자기주도성, 문제 해결 능력</td></tr>
          <tr><td><strong>학업 역량</strong></td><td>300점</td><td>기초 학업 성취도, 탐구력, 지적 호기심</td></tr>
          <tr><td><strong>공동체 역량</strong></td><td>300점</td><td>협업, 소통, 나눔과 배려</td></tr>
        </tbody>
      </table>
      <h2>4. 계열별 특징 및 전략</h2>
      <p><strong>자연계열</strong>: 수학/과학 교과 개념 원리에 대한 날카로운 질문 대비.<br>
      <strong>인문계열</strong>: 활동에 담긴 자신만의 가치관과 전공 적합성 논리 구축.</p>
      <h2>5. 전략 요약</h2>
      <p>성적이 공개되므로 활동의 결과보다는 <strong>과정(How)</strong>과 그 기저에 깔린 <strong>교과 지식</strong>을 얼마나 정확하게 이해하고 활용했는지를 증명해야 합니다.</p>
    </body></html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); }, 500);
  };

  // ----- 중앙대 면접 가이드 모달 및 PDF 인쇄 -----
  window.showCauGuideModal = function () {
    const modalTitle = document.getElementById("modalTitle");
    const modalBody = document.getElementById("modalBody");
    const modalOverlay = document.getElementById("analysisModal");
    if (!modalTitle || !modalBody || !modalOverlay) return;
    modalTitle.innerText = "중앙대학교 면접 가이드";
    modalBody.innerHTML = `
      <style>
        #cau-guide-content table { width:100%; border-collapse:collapse; }
        #cau-guide-content th, #cau-guide-content td { padding:10px; border:1px solid var(--panel-border); }
        #cau-guide-content th { background:rgba(0,74,152,0.1); text-align:left; }
        #cau-guide-content ul { padding-left:1.5rem; }
      </style>
      <div id="cau-guide-content" style="line-height:1.8; font-size:1.0rem; color:var(--text-primary);">
        <h3 style="color:#90caf9; margin-top:0;">1. 면접 비중 및 주요 변화</h3>
        <p>중앙대는 2단계에서 <strong>1단계 서류 70% + 면접 30%</strong>를 합산하여 최종 선발합니다.<br>
        기초 학업 역량을 강화하여 검증하는 <strong>'탐구형 인재'</strong> 중심의 평가 기조를 가지고 있으며, 학업 준비도에 대한 비중이 매우 높습니다.</p>
        <h3 style="color:#90caf9;">2. 면접 진행 방식 및 주요 특징</h3>
        <ul>
          <li><strong>평가 위원</strong>: 입학사정관 2인이 10분 이내의 블라인드 면접을 진행합니다.</li>
          <li><strong>심층 검증</strong>: 학교 수업과 탐구 활동을 중심으로 학업적 성과와 주도적 탐구 노력을 집중 확인합니다.</li>
          <li><strong>핵심 요소</strong>: 활동의 나열보다는 <strong>구체적인 기술/방법론</strong>과 <strong>실패 요인 분석</strong> 능력을 중요하게 봅니다.</li>
        </ul>
        <h3 style="color:#90caf9;">3. 3대 핵심 평가 요소 및 비중</h3>
        <table>
          <thead><tr><th>평가 요소</th><th style="text-align:center;">비율</th><th>세부 내용</th></tr></thead>
          <tbody>
            <tr><td><strong>학업 준비도</strong></td><td style="text-align:center;">60%</td><td>교과 기본 개념 이해/활용, 지적 호기심 기반 주도적 탐구 성취 수준</td></tr>
            <tr><td><strong>전공 적합성</strong></td><td style="text-align:center;">30%</td><td>전공 관심 및 준비 노력, 진로 탐색 과정의 충실성 및 발전 정도</td></tr>
            <tr><td><strong>의사소통 및 인성</strong></td><td style="text-align:center;">10%</td><td>논리적 전개 능력, 문제해결력, 공동체 태도와 가치관</td></tr>
          </tbody>
        </table>
        <h3 style="color:#90caf9;">4. 실제 면접 질문 예시</h3>
        <p><strong>[학업준비도/방법론]</strong> "염상섭 문학의 특징적 면모를 표현과 내용 측면에서 설명해보세요."<br>
        "뿌리 호흡량을 측정했다고 했는데, 구체적으로 어떤 방법을 사용했나요?"</p>
        <p><strong>[실패 분석/문제해결]</strong> "세균 증식 실험 과정에서 발생한 <strong>실패 요인</strong>은 무엇이었으며, 본인은 이를 어떻게 분석했나요?"</p>
        <h3 style="color:#90caf9;">5. 전략 요약</h3>
        <p>중앙대 면접은 단순 느낀 점을 넘어, <strong>실험/탐구의 정확한 방법론과 실패 분석 과정</strong>을 논리적으로 설명할 수 있어야 합격권에 들 수 있습니다.</p>
        <div style="margin-top:1.5rem; text-align:right;">
          <button onclick="window.printCauGuide()" style="background:linear-gradient(135deg,#004a98,#002a5c);color:#fff;border:none;padding:0.6rem 1.4rem;border-radius:8px;font-size:0.9rem;font-weight:600;cursor:pointer;">🖨️ PDF로 인쇄</button>
        </div>
      </div>`;
    modalOverlay.classList.remove("hidden");
  };

  window.printCauGuide = function () {
    const printWin = window.open("", "_blank", "width=900,height=700");
    printWin.document.write(`<!DOCTYPE html><html lang="ko"><head>
      <meta charset="UTF-8">
      <title>중앙대학교 면접 가이드</title>
      <style>
        body { font-family:'Malgun Gothic',sans-serif; color:#333; padding:2rem 3rem; line-height:1.8; }
        h1 { color:#004a98; border-bottom:3px solid #004a98; padding-bottom:0.5rem; }
        h2 { color:#003366; margin-top:1.8rem; }
        table { width:100%; border-collapse:collapse; margin:1rem 0; }
        th { background:#f0f4f8; padding:10px; border:1px solid #d1d9e6; text-align:left; }
        td { padding:10px; border:1px solid #d1d9e6; }
        ul { padding-left:1.5rem; }
        @media print { body { padding:1rem; } }
      </style>
    </head><body>
      <h1>🎓 중앙대학교 면접 가이드</h1>
      <h2>1. 면접 비중 및 주요 특징</h2>
      <p>1단계 서류 70% + 면접 30% 합산 최종 선발.<br>
      <strong>학업 준비도(60%)</strong>를 압도적으로 중시하며, 실제 탐구 역량을 날카롭게 검증합니다.</p>
      <h2>2. 면접 진행 방식</h2>
      <ul>
        <li>입학사정관 2인, 10분 이내 블라인드 면접</li>
        <li>학생부 내용에 기반한 심층 꼬리 질문 위주</li>
      </ul>
      <h2>3. 핵심 평가 요소 (60 : 30 : 10)</h2>
      <table>
        <thead><tr><th>평가 요소</th><th>비율</th><th>세부 내용</th></tr></thead>
        <tbody>
          <tr><td><strong>학업 준비도</strong></td><td>60%</td><td>교과 개념 이해, 주도적 탐구 및 성취 수준</td></tr>
          <tr><td><strong>전공 적합성</strong></td><td>30%</td><td>전공 관심도, 진로 탐색의 충실성</td></tr>
          <tr><td><strong>의사소통 및 인성</strong></td><td>10%</td><td>논리성, 문제해결력, 공동체 의식</td></tr>
        </tbody>
      </table>
      <h2>4. 핵심 질문 포인트</h2>
      <p>단순 결과가 아닌 <strong>'방법론(How)'</strong>과 <strong>'실패 요인 분석'</strong>에 대한 구체적인 설명 요구.</p>
      <h2>5. 전략 요약</h2>
      <p>자신이 수행한 탐구 활동의 <strong>기본 개념-방법-실패분석-결론</strong>을 논리적이고 전문적인 용어로 설명할 수 있도록 준비해야 합니다.</p>
    </body></html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); }, 500);
  };

  // ----- 경희대 면접 가이드 모달 및 PDF 인쇄 -----
  window.showKhuGuideModal = function () {
    const modalTitle = document.getElementById("modalTitle");
    const modalBody = document.getElementById("modalBody");
    const modalOverlay = document.getElementById("analysisModal");
    if (!modalTitle || !modalBody || !modalOverlay) return;
    modalTitle.innerText = "경희대학교 면접 가이드";
    modalBody.innerHTML = `
      <style>
        #khu-guide-content table { width:100%; border-collapse:collapse; }
        #khu-guide-content th, #khu-guide-content td { padding:10px; border:1px solid var(--panel-border); }
        #khu-guide-content th { background:rgba(167,29,42,0.1); text-align:left; }
        #khu-guide-content ul { padding-left:1.5rem; }
      </style>
      <div id="khu-guide-content" style="line-height:1.8; font-size:1.0rem; color:var(--text-primary);">
        <h3 style="color:#ffab91; margin-top:0;">1. 면접 비중 및 진행 방식</h3>
        <p>경희대는 2단계에서 <strong>서류 성적 70% + 면접 30%</strong>를 합합하여 최종 선발합니다.<br>
        역전률은 약 23~27% 수준이며, 의·약학 계열의 경우 2개 면접실을 도는 다중 면접 방식으로 더욱 정밀하게 평가합니다.</p>
        <h3 style="color:#ffab91;">2. 면접 주요 특징: 심층 꼬리 질문</h3>
        <ul>
          <li><strong>평가 위원</strong>: 입학사정관 2인이 10분 이내의 블라인드 면접을 실시합니다.</li>
          <li><strong>진위 검증</strong>: 서류 평가 단계에서 도출된 탐침 질문을 통해 활동이 진짜 본인의 것인지 집요하게 확인합니다.</li>
          <li><strong>핵심 요소</strong>: 단순 사실 확인을 넘어 실험이나 활동의 <strong>'세부 과학적 원리'</strong>를 완벽히 숙지하고 있는지 검증합니다.</li>
        </ul>
        <h3 style="color:#ffab91;">3. 2대 핵심 평가 요소 (50 : 50)</h3>
        <table>
          <thead><tr><th>평가 요소</th><th style="text-align:center;">비율</th><th>세부 내용</th></tr></thead>
          <tbody>
            <tr><td><strong>인성</strong></td><td style="text-align:center;">50%</td><td>창의적 노력, 진취적 기상, 건설적 협동 가치관, 공감 능력, 성실성(출결 등)</td></tr>
            <tr><td><strong>전공적합성</strong></td><td style="text-align:center;">50%</td><td>전공 기초 소양/학업 역량, 논리적 사고력, 탐구 활동의 진위 및 깊이</td></tr>
          </tbody>
        </table>
        <h3 style="color:#ffab91;">4. 실제 면접 질문 예시</h3>
        <p><strong>[전공적합성/심층]</strong> "DNA 전기영동 실험에서 분자량이 큰 DNA는 왜 멀리 이동하지 못하나요?"<br>
        "본인이 관심 있다고 한 '천연물 기반 약제' 중 구체적으로 연구해보고 싶은 종류는 무엇인가요?"</p>
        <p><strong>[인성/가치관]</strong> "학교생활에서 갈등 상황을 조정한 경험과 그 결과에 대해 말해보세요."<br>
        "봉사활동 중 본인의 가치관에 가장 큰 변화를 준 활동은 무엇인가요?"</p>
        <h3 style="color:#ffab91;">5. 전략 요약</h3>
        <p>경희대 면접은 <strong>인성(50%)</strong> 비중이 매우 높으므로 성실한 태도를 유지하되, 전공 관련 질문에서는 <strong>교과 지식과 과학적 원리</strong>를 논리적으로 설명하는 전문성을 보여주어야 합니다.</p>
        <div style="margin-top:1.5rem; text-align:right;">
          <button onclick="window.printKhuGuide()" style="background:linear-gradient(135deg,#a71d2a,#c62828);color:#fff;border:none;padding:0.6rem 1.4rem;border-radius:8px;font-size:0.9rem;font-weight:600;cursor:pointer;">🖨️ PDF 인쇄</button>
        </div>
      </div>`;
    modalOverlay.classList.remove("hidden");
  };

  window.printKhuGuide = function () {
    const printWin = window.open("", "_blank", "width=900,height=700");
    printWin.document.write(`<!DOCTYPE html><html lang="ko"><head>
      <meta charset="UTF-8">
      <title>경희대학교 면접 가이드</title>
      <style>
        body { font-family:'Malgun Gothic',sans-serif; color:#333; padding:2rem 3rem; line-height:1.8; }
        h1 { color:#a71d2a; border-bottom:3px solid #a71d2a; padding-bottom:0.5rem; }
        h2 { color:#c62828; margin-top:1.8rem; }
        table { width:100%; border-collapse:collapse; margin:1rem 0; }
        th { background:#ffebee; padding:10px; border:1px solid #ffcdd2; text-align:left; }
        td { padding:10px; border:1px solid #ffcdd2; }
        ul { padding-left:1.5rem; }
        @media print { body { padding:1rem; } }
      </style>
    </head><body>
      <h1>🎓 경희대학교 면접 가이드</h1>
      <h2>1. 면접 반영 비중 및 합격 역전률</h2>
      <p>서류 70% + 면접 30% 합산 최종 선발.<br>
      <strong>인성 50%</strong> 비중이 매우 높은 편이며, 전공 역량에 대한 날카로운 진위 검증이 이루어집니다.</p>
      <h2>2. 면접 진행 방식</h2>
      <ul>
        <li>입학사정관 2인, 10분 이내 블라인드 면접 (의약학은 다중 면접실 운영)</li>
        <li>서류 기반 탐침 질문을 통한 심층 꼬리 질문 위주</li>
      </ul>
      <h2>3. 핵심 평가 요소 (50 : 50)</h2>
      <table>
        <thead><tr><th>평가 요소</th><th>비율</th><th>세부 내용</th></tr></thead>
        <tbody>
          <tr><td><strong>인성</strong></td><td>50%</td><td>창의적/진취적/건설적 협동, 공감 능력, 성실성(출결)</td></tr>
          <tr><td><strong>전공적합성</strong></td><td>50%</td><td>전공 기초 소양, 논리적 사고, 탐구 진위 여부(원리 숙지)</td></tr>
        </tbody>
      </table>
      <h2>4. 핵심 질문 포인트</h2>
      <p>활동의 <strong>'세부 과학적 원리'</strong>와 <strong>'인성 가치관'</strong>에 대한 구체적인 사례 중심 답변 준비.</p>
      <h2>5. 전략 요약</h2>
      <p>경희대의 창학 이념을 기반으로 한 <strong>성실한 태도</strong>와, 탐구 활동의 <strong>기본 교과 원리</strong>에 대한 완벽한 이해도를 증명하는 것이 합격의 열쇠입니다.</p>
    </body></html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); }, 500);
  };

  // ----- 서울과학기술대 면접 가이드 모달 및 PDF 인쇄 -----
  window.showSeoulTechGuideModal = function () {
    const modalTitle = document.getElementById("modalTitle");
    const modalBody = document.getElementById("modalBody");
    const modalOverlay = document.getElementById("analysisModal");
    if (!modalTitle || !modalBody || !modalOverlay) return;
    modalTitle.innerText = "서울과학기술대학교 면접 가이드";
    modalBody.innerHTML = `
      <style>
        #seoultech-guide-content table { width:100%; border-collapse:collapse; }
        #seoultech-guide-content th, #seoultech-guide-content td { padding:10px; border:1px solid var(--panel-border); }
        #seoultech-guide-content th { background:rgba(55,71,79,0.1); text-align:left; }
        #seoultech-guide-content ul { padding-left:1.5rem; }
      </style>
      <div id="seoultech-guide-content" style="line-height:1.8; font-size:1.0rem; color:var(--text-primary);">
        <h3 style="color:#b0bec5; margin-top:0;">1. 면접 비중 및 진행 방식</h3>
        <p>서울과기대는 2단계에서 <strong>1단계 서류 70% + 면접 30%</strong>를 합산하여 최종 선발합니다.<br>
        실질 반영 비율은 40% 수준으로 매우 높으며, 면접관에게 <strong>학생의 성적이 공개된 상태</strong>로 진행되는 것이 특징입니다.</p>
        <h3 style="color:#b0bec5;">2. 면접 주요 특징: 원리 및 이유 검증</h3>
        <ul>
          <li><strong>평가 위원</strong>: 입학사정관 2인이 10분 이내의 블라인드 면접을 실시합니다.</li>
          <li><strong>학업 기반 진로 활동</strong>: 활동 자체의 결과보다 활동을 선택한 <strong>'이유'</strong>와 적용된 <strong>'원리'</strong>를 심층 질문합니다.</li>
          <li><strong>문제해결 역량</strong>: 학습 과정에서 발생한 문제를 어떻게 분석하고 해결했는지 정밀하게 검증합니다.</li>
        </ul>
        <h3 style="color:#b0bec5;">3. 3대 핵심 평가 요소 및 비중</h3>
        <table>
          <thead><tr><th>평가 요소</th><th style="text-align:center;">비율</th><th>세부 내용</th></tr></thead>
          <tbody>
            <tr><td><strong>진로 역량</strong></td><td style="text-align:center;">40%</td><td>전공 지식 이해도, 진로 탐색 노력, 창의적 사고 및 판단력</td></tr>
            <tr><td><strong>학업 역량</strong></td><td style="text-align:center;">35%</td><td>학업 태도, 지적 호기심, 문제 파악 및 분석/해결 능력</td></tr>
            <tr><td><strong>공동체 역량</strong></td><td style="text-align:center;">25%</td><td>협업, 소통, 리더십, 나눔과 배려, 성실성 및 규칙 준수</td></tr>
          </tbody>
        </table>
        <h3 style="color:#b0bec5;">4. 실제 면접 질문 예시</h3>
        <p><strong>[진로/원리]</strong> "대회 준비를 위해 실험한 원리에 대해 자세히 설명해주세요."<br>
        "이 주제로 학습 문제를 제기한 특별한 이유는 무엇인가요?"</p>
        <p><strong>[학업/해결]</strong> "해당 해결 방안을 제시한 논리적 근거는 무엇이며, 어떤 분석 과정을 거쳤나요?"</p>
        <h3 style="color:#b0bec5;">5. 전략 요약</h3>
        <p>서울과기대 면접은 성적이 공개되므로 활동의 <strong>지적 깊이</strong>를 증명해야 합니다. 탐구의 <strong>'Why'와 'Logic'</strong>을 논리적으로 설명할 수 있도록 준비하세요.</p>
        <div style="margin-top:1.5rem; text-align:right;">
          <button onclick="window.printSeoulTechGuide()" style="background:linear-gradient(135deg,#37474f,#263238);color:#fff;border:none;padding:0.6rem 1.4rem;border-radius:8px;font-size:0.9rem;font-weight:600;cursor:pointer;">🖨️ PDF 인쇄</button>
        </div>
      </div>`;
    modalOverlay.classList.remove("hidden");
  };

  window.printSeoulTechGuide = function () {
    const printWin = window.open("", "_blank", "width=900,height=700");
    printWin.document.write(`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>서울과학기술대학교 면접 가이드</title><style>body{font-family:'Malgun Gothic',sans-serif;padding:2rem;line-height:1.8;}h1{color:#37474f;border-bottom:3px solid #37474f;}h2{color:#263238;margin-top:1.5rem;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ddd;padding:10px;text-align:left;}th{background:#f8f9fa;}</style></head><body><h1>🎓 서울과학기술대학교 면접 가이드</h1><h2>1. 평가 비중 (40:35:25)</h2><table><tr><th>진로역량</th><th>학업역량</th><th>공동체역량</th></tr><tr><td>40%</td><td>35%</td><td>25%</td></tr></table><h2>2. 핵심 포인트</h2><p>과기대는 <strong>성적 공개 면접</strong>입니다. 활동의 결과보다 <strong>'동기(Why)'</strong>와 <strong>'적용 원리(Logic)'</strong>를 논리적으로 설명하는 것이 중요합니다.</p></body></html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); }, 500);
  };

  window.showGachonGuideModal = function () {
    const modalTitle = document.getElementById("modalTitle");
    const modalBody = document.getElementById("modalBody");
    const modalOverlay = document.getElementById("analysisModal");
    if (!modalTitle || !modalBody || !modalOverlay) return;
    modalTitle.innerText = "가천대학교 면접 가이드";
    modalBody.innerHTML = `
      <div style="font-family:'Malgun Gothic', sans-serif;">
        <p>가천대는 <strong>'인성'</strong>과 <strong>'진학의지'</strong>를 각각 40%씩 반영하여 매우 중요하게 평가합니다.</p>
        <h3 style="color:#1a237e; margin-top:1.5rem;">1. 평가 요소 및 비중</h3>
        <ul>
          <li><strong>인성 (40%):</strong> 공동체 의식, 협업 능력, 성실성</li>
          <li><strong>진학의지 (40%):</strong> 전공 관심도, 자발적 탐구, 발전 가능성</li>
          <li><strong>학업역량 (20%):</strong> 기초 학업 성취 및 학습 태도</li>
        </ul>
        <h3 style="color:#1a237e; margin-top:1.5rem;">2. 주요 특징</h3>
        <ul>
          <li><strong>3인 면접:</strong> 다수의 면접관이 지원자의 진실성과 열정을 다각도로 검증</li>
          <li><strong>경험 중심:</strong> 아이디어를 실제 행동으로 옮긴 구체적 사례 어필 필요</li>
        </ul>
      </div>`;
    modalOverlay.classList.remove("hidden");
  };

  window.printGachonGuide = function () {
    const printWin = window.open("", "_blank", "width=900,height=700");
    printWin.document.write(`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>가천대학교 면접 가이드</title><style>body{font-family:'Malgun Gothic',sans-serif;padding:2rem;line-height:1.8;}h1{color:#1a237e;border-bottom:3px solid #1a237e;}h2{color:#004a98;margin-top:1.5rem;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ddd;padding:10px;text-align:left;}th{background:#f8f9fa;}</style></head><body><h1>🎓 가천대학교 면접 가이드</h1><h2>1. 평가 비중 (40:40:20)</h2><table><tr><th>인성</th><th>진학의지</th><th>학업역량</th></tr><tr><td>40%</td><td>40%</td><td>20%</td></tr></table><h2>2. 핵심 포인트</h2><p>가천대는 <strong>인성</strong>과 <strong>진학의지</strong>의 비중이 매우 높습니다. 학교 활동에 주도적으로 참여한 경험과 전공을 향한 열정을 적극적으로 표현하세요.</p></body></html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); }, 500);
  };

  window.showSeoulGuideModal = function () {
    const modalTitle = document.getElementById("modalTitle");
    const modalBody = document.getElementById("modalBody");
    const modalOverlay = document.getElementById("analysisModal");
    if (!modalTitle || !modalBody || !modalOverlay) return;
    modalTitle.innerText = "서울시립대학교 면접 가이드";
    modalBody.innerHTML = `
      <div style="font-family:'Malgun Gothic', sans-serif;">
        <p>시립대는 <strong>'잠재역량'</strong>을 통해 교과와 진로 활동의 연계성을 심도 있게 확인합니다.</p>
        <h3 style="color:#01579b; margin-top:1.5rem;">1. 평가 요소 및 비중</h3>
        <ul>
          <li><strong>잠재역량 (40%):</strong> 전공 관련 활동의 연계성, 문제해결 대안 제시</li>
          <li><strong>학업역량 (35%):</strong> 교과 지식 이해, 학업적 호기심</li>
          <li><strong>사회역량 (25%):</strong> 공동체 의식, 협동 능력, 윤리 의식</li>
        </ul>
        <h3 style="color:#01579b; margin-top:1.5rem;">2. 주요 특징</h3>
        <ul>
          <li><strong>심층 꼬리 질문:</strong> 탐구 내용의 본질적 원리를 직접 요구하므로 철저한 개념 숙지 필요</li>
          <li><strong>대안 제시:</strong> 활동에서 발견한 문제에 대해 '나만의 해결책'을 묻는 경우가 많음</li>
        </ul>
      </div>`;
    modalOverlay.classList.remove("hidden");
  };

  window.printSeoulGuide = function () {
    const printWin = window.open("", "_blank", "width=900,height=700");
    printWin.document.write(`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>서울시립대학교 면접 가이드</title><style>body{font-family:'Malgun Gothic',sans-serif;padding:2rem;line-height:1.8;}h1{color:#002f6c;border-bottom:3px solid #002f6c;}h2{color:#01579b;margin-top:1.5rem;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ddd;padding:10px;text-align:left;}th{background:#f8f9fa;}</style></head><body><h1>🎓 서울시립대학교 면접 가이드</h1><h2>1. 평가 비중 (40:35:25)</h2><table><tr><th>잠재역량</th><th>학업역량</th><th>사회역량</th></tr><tr><td>40%</td><td>35%</td><td>25%</td></tr></table><h2>2. 핵심 포인트</h2><p>시립대는 <strong>활동의 연계성</strong>과 <strong>개념 이해</strong>를 중시합니다. 꼬리 질문에 대비하여 탐구 주제와 관련된 교과 지식을 완벽히 정리하세요.</p></body></html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); }, 500);
  };

  window.showSogangGuideModal = function () {
    const modalTitle = document.getElementById("modalTitle");
    const modalBody = document.getElementById("modalBody");
    const modalOverlay = document.getElementById("analysisModal");
    if (!modalTitle || !modalBody || !modalOverlay) return;
    modalTitle.innerText = "서강대학교 면접 가이드";
    modalBody.innerHTML = `
      <div style="font-family:'Malgun Gothic', sans-serif;">
        <p>서강대는 특정 학과 스펙보다 <strong>'성장가능성'</strong>과 <strong>'융적 사고'</strong>를 최우선으로 평가합니다.</p>
        <h3 style="color:#b71c1c; margin-top:1.5rem;">1. 평가 요소 및 비중</h3>
        <ul>
          <li><strong>학업역량 (50%):</strong> 기초 교과 성취도 + 창의적 문제해결력</li>
          <li><strong>성장가능성 (30%):</strong> 자기주도적 탐구, 실패 극복 과정, 융합적 사고</li>
          <li><strong>공동체역량 (20%):</strong> 협업, 소통, 이타성</li>
        </ul>
        <h3 style="color:#b71c1c; margin-top:1.5rem;">2. 주요 특징</h3>
        <ul>
          <li><strong>경계 없는 다전공:</strong> 여러 분야에 걸친 호기심과 융합 시도를 매우 높게 평가</li>
          <li><strong>깊이 있는 탐구:</strong> 전공 관련성보다 '탐구 과정 자체의 깊이'가 중요</li>
        </ul>
      </div>`;
    modalOverlay.classList.remove("hidden");
  };

  window.printSogangGuide = function () {
    const printWin = window.open("", "_blank", "width=900,height=700");
    printWin.document.write(`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>서강대학교 면접 가이드</title><style>body{font-family:'Malgun Gothic',sans-serif;padding:2rem;line-height:1.8;}h1{color:#901319;border-bottom:3px solid #901319;}h2{color:#b71c1c;margin-top:1.5rem;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ddd;padding:10px;text-align:left;}th{background:#f8f9fa;}</style></head><body><h1>🎓 서강대학교 면접 가이드</h1><h2>1. 평가 비중 (50:30:20)</h2><table><tr><th>학업역량</th><th>성장가능성</th><th>공동체역량</th></tr><tr><td>50%</td><td>30%</td><td>20%</td></tr></table><h2>2. 핵심 포인트</h2><p>서강대는 <strong>다전공제도</strong>를 기반으로 융합적 인재를 선호합니다. 활동의 결과보다 <strong>성장 과정</strong>과 <strong>실패를 통한 깨달음</strong>을 어필하세요.</p></body></html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); }, 500);
  };

  window.showSkkuGuideModal = function () {
    const modalTitle = document.getElementById("modalTitle");
    const modalBody = document.getElementById("modalBody");
    const modalOverlay = document.getElementById("analysisModal");
    if (!modalTitle || !modalBody || !modalOverlay) return;
    modalTitle.innerText = "성균관대학교 면접 가이드";
    modalBody.innerHTML = `
      <div style="font-family:'Malgun Gothic', sans-serif;">
        <p>성균관대는 전공적합성이라는 용어 대신 <strong>'탐구역량'</strong>을 사용하며, 자기주도적 확장을 강조합니다.</p>
        <h3 style="color:#1b5e20; margin-top:1.5rem;">1. 평가 요소 및 비중</h3>
        <ul>
          <li><strong>탐구역량 (40%):</strong> 지적 호기심, 탐구의 확장성, 도전적 과목 이수</li>
          <li><strong>학업역량 (40%):</strong> 학업수월성(성적), 학업충실성(수업 참여)</li>
          <li><strong>잠재역량 (20%):</strong> 리더십, 역경 극복, 공동체의식</li>
        </ul>
        <h3 style="color:#1b5e20; margin-top:1.5rem;">2. 주요 특징</h3>
        <ul>
          <li><strong>권장이수과목 없음:</strong> 특정 과목 이수보다 선택한 과목 내에서의 깊이 중시</li>
          <li><strong>탐구 확장:</strong> 한 주제를 1~3학년에 걸쳐 어떻게 심화했는지 증명 필요</li>
        </ul>
      </div>`;
    modalOverlay.classList.remove("hidden");
  };

  window.printSkkuGuide = function () {
    const printWin = window.open("", "_blank", "width=900,height=700");
    printWin.document.write(`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>성균관대학교 면접 가이드</title><style>body{font-family:'Malgun Gothic',sans-serif;padding:2rem;line-height:1.8;}h1{color:#004424;border-bottom:3px solid #004424;}h2{color:#1b5e20;margin-top:1.5rem;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ddd;padding:10px;text-align:left;}th{background:#f8f9fa;}</style></head><body><h1>🎓 성균관대학교 면접 가이드</h1><h2>1. 평가 비중 (40:40:20)</h2><table><tr><th>탐구역량</th><th>학업역량</th><th>잠재역량</th></tr><tr><td>40%</td><td>40%</td><td>20%</td></tr></table><h2>2. 핵심 포인트</h2><p>성균관대는 <strong>'탐구의 확장성'</strong>을 가장 중요하게 봅니다. 꼬리 질문에 대비하여 탐구 내용의 본질과 원리를 명확히 답변하세요.</p></body></html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); }, 500);
  };

  window.showHanyangGuideModal = function () {
    const modalTitle = document.getElementById("modalTitle");
    const modalBody = document.getElementById("modalBody");
    const modalOverlay = document.getElementById("analysisModal");
    if (!modalTitle || !modalBody || !modalOverlay) return;
    modalTitle.innerText = "한양대학교 면접 가이드";
    modalBody.innerHTML = `
      <div style="font-family:'Malgun Gothic', sans-serif;">
        <p>한양대는 학생부의 <strong>'횡단평가'</strong>를 통해 비판적·창의적 사고력을 집요하게 검증합니다.</p>
        <h3 style="color:#0d47a1; margin-top:1.5rem;">1. 평가 요소 및 비중</h3>
        <ul>
          <li><strong>심층학업역량 (40%):</strong> 비판적 사고력, 창의적 문제해결력</li>
          <li><strong>기초학업역량 (35%):</strong> 교과 성취도, 과목 선택의 충실도</li>
          <li><strong>진로탐구역량 (15%):</strong> 계열적합성 중심의 진로 탐색</li>
          <li><strong>공동체역량 (10%):</strong> 협업, 리더십, 소통</li>
        </ul>
        <h3 style="color:#0d47a1; margin-top:1.5rem;">2. 주요 특징</h3>
        <ul>
          <li><strong>Why 중심:</strong> "어떤 활동을 했는가"보다 "왜 했고 어떤 사고를 했는가"가 핵심</li>
          <li><strong>계열적합성:</strong> 좁은 전공 스펙보다 넓은 계열의 기본 역량 강조</li>
        </ul>
      </div>`;
    modalOverlay.classList.remove("hidden");
  };

  window.printHanyangGuide = function () {
    const printWin = window.open("", "_blank", "width=900,height=700");
    printWin.document.write(`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>한양대학교 면접 가이드</title><style>body{font-family:'Malgun Gothic',sans-serif;padding:2rem;line-height:1.8;}h1{color:#002366;border-bottom:3px solid #002366;}h2{color:#0d47a1;margin-top:1.5rem;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ddd;padding:10px;text-align:left;}th{background:#f8f9fa;}</style></head><body><h1>🎓 한양대학교 면접 가이드</h1><h2>1. 평가 항목</h2><p>심층학업(40%), 기초학업(35%), 진로탐구(15%), 공동체(10%)</p><h2>2. 핵심 포인트</h2><p>한양대는 <strong>비판적 사고</strong>를 중시합니다. 답변 시 '결과'보다는 자신의 <strong>'논리적 근거'</strong>와 <strong>'창의적 대안'</strong>을 포함하세요.</p></body></html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); }, 500);
  };

  window.showKnueGuideModal = function () {
    const modalTitle = document.getElementById("modalTitle");
    const modalBody = document.getElementById("modalBody");
    const modalOverlay = document.getElementById("analysisModal");
    if (!modalTitle || !modalBody || !modalOverlay) return;
    modalTitle.innerText = "한국교원대학교 면접 가이드";
    modalBody.innerHTML = `
      <div style="font-family:'Malgun Gothic', sans-serif;">
        <p>교원대는 교사로서의 <strong>'사명감'</strong>과 <strong>'교직 인성'</strong>, <strong>'전문성'</strong>을 종합적으로 평가합니다.</p>
        <h3 style="color:#2e7d32; margin-top:1.5rem;">1. 평가 요소 및 비중</h3>
        <ul>
          <li><strong>전공 및 교직적합성 (40%):</strong> 학과 역량, 교직 열정, 멘토링 경험</li>
          <li><strong>학업역량 (30%):</strong> 자기주도적 학습, 발전 정도</li>
          <li><strong>교직인성 (30%):</strong> 나눔, 배려, 공감 및 의사소통</li>
        </ul>
        <h3 style="color:#2e7d32; margin-top:1.5rem;">2. 주요 특징</h3>
        <ul>
          <li><strong>3인 면접:</strong> 다른 대학보다 면접관 수가 많아 다각도 검증</li>
          <li><strong>예비 교사:</strong> 답변 태도와 말투에서 교사로서의 자질이 드러나야 함</li>
        </ul>
      </div>`;
    modalOverlay.classList.remove("hidden");
  };

  window.printKnueGuide = function () {
    const printWin = window.open("", "_blank", "width=900,height=700");
    printWin.document.write(`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>한국교원대학교 면접 가이드</title><style>body{font-family:'Malgun Gothic',sans-serif;padding:2rem;line-height:1.8;}h1{color:#1b5e20;border-bottom:3px solid #1b5e20;}h2{color:#2e7d32;margin-top:1.5rem;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ddd;padding:10px;text-align:left;}th{background:#f8f9fa;}</style></head><body><h1>🎓 한국교원대학교 면접 가이드</h1><h2>1. 평가 비중 (40:30:30)</h2><p>교직적합성(40%), 학업역량(30%), 교직인성(30%)</p><h2>2. 핵심 포인트</h2><p>단순 지식 전달자가 아닌 <strong>학생과 공감하고 소통하는 교사의 자질</strong>을 보여주세요. 멘토링이나 봉사 경험을 구체적으로 답변하세요.</p></body></html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); }, 500);
  };

  window.showKwangwoonGuideModal = function () {
    const modalTitle = document.getElementById("modalTitle");
    const modalBody = document.getElementById("modalBody");
    const modalOverlay = document.getElementById("analysisModal");
    if (!modalTitle || !modalBody || !modalOverlay) return;
    modalTitle.innerText = "광운대학교 면접 가이드";
    modalBody.innerHTML = `
      <div style="font-family:'Malgun Gothic', sans-serif; line-height:1.7;">
        <p><strong>'광운참빛인재전형'</strong> 등 광운대 면접은 서류 점수를 뒤집을 수 있는 <strong>실질적인 영향력(40%)</strong>이 매우 큽니다.</p>
        
        <h3 style="color:#d32f2f; margin-top:1.5rem; border-bottom:1px solid #eee; padding-bottom:5px;">1. 평가 요소 및 비중</h3>
        <ul>
          <li><strong>발전 가능성 (45%):</strong> 전공 분야에 대한 잠재력, 지적 탐구 노력, SW 역량(해당 학과)</li>
          <li><strong>종합 사고력 (30%):</strong> 의사소통 능력, 질문 요지 수용 및 답변의 논리성</li>
          <li><strong>인성 (25%):</strong> 공동체적 가치관, 협업 정신, 면접 태도</li>
        </ul>

        <h3 style="color:#d32f2f; margin-top:1.5rem; border-bottom:1px solid #eee; padding-bottom:5px;">2. 면접 진행 방식</h3>
        <ul>
          <li><strong>평가자:</strong> 2인(사정관 1인, 교수 1인) x 지원자 1인</li>
          <li><strong>시간:</strong> 10분 이내 (블라인드 면접)</li>
          <li><strong>특징:</strong> 면접관에게 <strong>학생부 전체 및 성적이 공개</strong>된 상태로 진행됨</li>
        </ul>

        <h3 style="color:#d32f2f; margin-top:1.5rem; border-bottom:1px solid #eee; padding-bottom:5px;">3. 핵심 질문 포인트</h3>
        <ul>
          <li>단순 활동 열거보다 활동의 <strong>'선정 이유'</strong>와 <strong>'구체적인 준비 과정'</strong>을 질문</li>
          <li>활동 중 부딪힌 <strong>'문제 해결 경험'</strong>을 논리적으로 설명하는지 검증</li>
          <li>전공에 필요한 핵심 역량이 무엇인지에 대한 본인만의 철학 확인</li>
        </ul>
      </div>`;
    modalOverlay.classList.remove("hidden");
  };

  window.printKwangwoonGuide = function () {
    const printWin = window.open("", "_blank", "width=900,height=700");
    printWin.document.write(`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>광운대학교 면접 가이드</title><style>body{font-family:'Malgun Gothic',sans-serif;padding:2rem;line-height:1.8;}h1{color:#b71c1c;border-bottom:3px solid #b71c1c;}h2{color:#d32f2f;margin-top:1.5rem;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ddd;padding:10px;text-align:left;}th{background:#fff5f5;}</style></head><body><h1>🎓 광운대학교 면접 가이드</h1><h2>1. 평가 항목 및 비중</h2><p>발전가능성(45%), 종합사고력(30%), 인성(25%)</p><h2>2. 주요 특징</h2><p>면접 비중이 40%로 확대되었습니다. 면접관에게 <strong>성적이 공개</strong>되므로, 활동의 결과뿐만 아니라 <strong>'이유'</strong>와 <strong>'과정'</strong>을 논리적으로 설명하는 연습이 필수적입니다.</p></body></html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); }, 500);
  };

  window.showDonggukGuideModal = function () {
    const modalTitle = document.getElementById("modalTitle");
    const modalBody = document.getElementById("modalBody");
    const modalOverlay = document.getElementById("analysisModal");
    if (!modalTitle || !modalBody || !modalOverlay) return;
    modalTitle.innerText = "동국대학교 면접 가이드 (DoDream)";
    modalBody.innerHTML = `
      <div style="font-family:'Malgun Gothic', sans-serif; line-height:1.7;">
        <p>동국대 <strong>'DoDream'</strong> 전형은 수능 이후 차분히 준비된 학생들 간의 경쟁이므로 <strong>전공적합성</strong>의 깊이가 합격을 결정합니다.</p>
        
        <h3 style="color:#e65100; margin-top:1.5rem; border-bottom:1px solid #eee; padding-bottom:5px;">1. 평가 요소 및 비분</h3>
        <ul>
          <li><strong>전공적합성 (30%):</strong> 지원 전공에 대한 관심, 이해도, 학업 수행 능력</li>
          <li><strong>발전가능성 (30%):</strong> 문제 해결 능력, 목표 의식, 주도적 태도</li>
          <li><strong>전형취지적합성 (20%):</strong> 고교 활동의 적극성 및 동국대 인재상 부합 여부</li>
          <li><strong>인성 및 사회성 (20%):</strong> 협동심, 공감 능력, <strong>출결의 성실성</strong></li>
        </ul>

        <h3 style="color:#e65100; margin-top:1.5rem; border-bottom:1px solid #eee; padding-bottom:5px;">2. 면접 진행 방식</h3>
        <ul>
          <li><strong>평가자:</strong> 2인 x 지원자 1인</li>
          <li><strong>시간:</strong> 10분 이내 (약 6문제 내외)</li>
          <li><strong>특징:</strong> 학생부 전체 및 성적이 공개됨. 지원 학과 전공 가이드북 숙지 필수</li>
        </ul>

        <h3 style="color:#e65100; margin-top:1.5rem; border-bottom:1px solid #eee; padding-bottom:5px;">3. 핵심 전략 포인트</h3>
        <ul>
          <li>단순 활동 확인이 아닌, 활동에 담긴 <strong>'교과 지식 원리'</strong>와 <strong>'본인의 성장'</strong>을 연결</li>
          <li>출결(미인정 지각 등)에 대한 질문이 나올 경우, 솔직한 인정과 <strong>'개선 노력/성장'</strong>을 강조</li>
          <li>수능 이후 면접이므로 모든 지원자의 준비도가 높음. 더욱 <strong>생생한 구어체</strong>와 자신감 있는 태도 필요</li>
        </ul>
      </div>`;
    modalOverlay.classList.remove("hidden");
  };

  window.printDonggukGuide = function () {
    const printWin = window.open("", "_blank", "width=900,height=700");
    printWin.document.write(`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>동국대학교 면접 가이드</title><style>body{font-family:'Malgun Gothic',sans-serif;padding:2rem;line-height:1.8;}h1{color:#bf360c;border-bottom:3px solid #bf360c;}h2{color:#e65100;margin-top:1.5rem;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ddd;padding:10px;text-align:left;}th{background:#fff3e0;}</style></head><body><h1>🎓 동국대학교 면접 가이드 (DoDream)</h1><h2>1. 평가 항목 및 비중</h2><p>전공적합성(30%), 발전가능성(30%), 전형취지적합성(20%), 인성 및 사회성(20%)</p><h2>2. 주요 포인트</h2><p>면접의 실질 영향력이 매우 높습니다(인문 40%, 자연 46%). <strong>'출결'</strong>을 비롯한 학교 생활의 성실성과 <strong>'지원 학과에 대한 심화 이해'</strong>를 답변에 반드시 녹여내세요.</p></body></html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); }, 500);
  };

  // =========================================================
  // Word 다운로드 기능
  // =========================================================
  window.exportToPdf = function (elementId) {
    const el = document.getElementById(elementId);
    if (!el || !el.innerHTML || el.innerHTML.trim() === "") {
      alert("다운로드할 결과 내용이 없습니다. 먼저 AI 분석을 완료해주세요.");
      return;
    }
    const printWin = window.open("", "_blank", "width=900,height=700");
    printWin.document.write(`<!DOCTYPE html><html lang="ko"><head>
      <meta charset="UTF-8">
      <title>면접 문항</title>
      <style>
        body { font-family: 'Malgun Gothic', sans-serif; color: #222; padding: 2rem 3rem; line-height: 1.8; font-size: 13pt; }
        h1 { color: #3c3fa0; border-bottom: 2px solid #3c3fa0; padding-bottom: 0.4rem; font-size: 1.5rem; }
        h2 { color: #2c3e7d; font-size: 1.3rem; margin-top: 1.8rem; }
        h3 { background: #eef0ff; border-left: 5px solid #5e6ad2; padding: 0.5rem 1rem; border-radius: 0 8px 8px 0; font-size: 1rem; margin-top: 2rem; margin-bottom: 0.4rem; color: #2c3e7d; }
        .iv-question-box { background: #fffde7; border-left: 5px solid #f59f00; padding: 0.8rem 1.2rem; border-radius: 0 8px 8px 0; font-weight: bold; color: #7c5e00; margin-bottom: 0.8rem; font-size: 1.05rem; }
        ul { padding-left: 1.5rem; }
        li { margin-bottom: 0.3rem; }
        strong { color: #3c3fa0; }
        hr { border: none; border-top: 1px solid #ddd; margin: 1.5rem 0; }
        @media print { body { padding: 1rem 1.5rem; } }
      </style>
    </head><body>${el.innerHTML}</body></html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); }, 600);
  };

  // =========================================================
  // 설명서 다운로드 (PDF) 기능
  // =========================================================
  const PROJECT_MANUAL_MD = `
# 부안고등학교 진학지도 프로그램 설명서

<통합 파일 업로드하기>

1. Google Gemini API Key: 각자의 API Key가 있다면 자신의 API Key를 입력하고, 없는 경우는 보내드린 API Key를 입력 (대신 유출 금지!)

2.개인 분석용 파일
 1) 인적사항 엑셀파일: 나이스(NEIS) - 학급담임 - 학교생활기록부 - 학생부 항목별 조회 - 인적,학적사항 - 인적사항 → XLS data로 다운받아 업로드
 2) 이수과목 엑셀파일: 나이스(NEIS) - 학급담임 - 학교생활기록부 - 학생부 항목별 조회 - 교과학습발달상황 - 교과학습발달상황 → XLS data로 다운받아 업로드
 3) 세특/비교과 일괄 엑셀파일
  ① 나이스(NEIS) - 학급담임 - 학교생활기록부 - 학생부 항목별 조회 - 창의적체험활동 - 창의적체험활동 → XLS data로 다운받아 업로드
  ② 나이스(NEIS) - 학급담임 - 학교생활기록부 - 학생부 항목별 조회 - 교과학습발달상황 - 세부능력및특기사항 → XLS data로 다운받아 업로드
  ③ 나이스(NEIS) - 학급담임 - 학교생활기록부 - 학생부 항목별 조회 - 행동특성및종합의견 - 행동특성및종합의견 → XLS data로 다운받아 업로드
  > ①②③을 모두 드래그하여 한꺼번에 업로드

3. 합불합 분석용 파일
 1) 수시진학관리: 보내드린 '수시진학관리' 엑셀 파일 업로드 (대교협 파일)
 2) 성적 엑셀 & 세특 엑셀 & 창체 엑셀 & 행특 엑셀: 보내드린 '합불합 분석.zip' 에서 찾아 각각 업로드

4. 모의고사 / 내신 분석용
 1) 모의고사 성적표: 각 학급의 모의고사 성적표를 csv 파일로 변환하여 업로드. (안되는 경우 종종 있으니 저에게 학급 모의고사 성적표 주시면 양식에 맞게 변환해드립니다.)
      * csv 파일 변환법 → ilovepdf와 같이 pdf를 변환할 수 있는 프로그램을 이용하셔서 pdf→excel로 변환하되, 한 시트에 다 들어오게 해주시고, 그 excel 파일을 다른 이름으로 저장해서 파일 형식을 .csv로 바꾸시면 됩니다.
 2) 내신 석차 데이터: 나이스(NEIS) - 학급담임 - 학교생활기록부 - 학생부 항목별 조회 - 교과학습발달상황 - 교과학습발달상황 → XLS data로 다운 → csv 파일로 변환 후 업로드

> **💡 업로드한 파일은 한 번 업로드하면 브라우저에 저장되어 있어 사용하시는 데 불편함이 없도록 하였습니다.**

---

## 🛠️ 기능 소개

1. **개인 분석:** 각 학급의 학교생활기록부 자료를 활용하여 학생의 학생부가 각 대학의 학생부종합전형에서 어떻게 평가되는지에 대한 분석을 각 대학의 학생부종합전형 가이드북을 학습한 AI가 도움을 드립니다. 학생의 학생부가 평가 영역에 따라 점수화가 되며, 산출 및 평가 근거가 제시되고, 피드백을 통해 보완해나가야 할 방향을 제시합니다. **(담임교사용)**
2. **합불합 분석:** 수시진학관리 파일 및 졸업생의 성적 및 세특을 활용하여 우리 학교의 학생부종합전형의 합격, 불합격 사례를 통해 합격한 이유와 불합격한 이유를 각 대학의 모집요강과 학생부종합전형 가이드북을 학습한 AI가 분석해드립니다. 이를 통해 각 학급 학생이 가고자 하는 학과 또는 대학을 가는 데에 있어 방향을 제시합니다. **(담임교사용)**
3. **합불합 사례 확인하기:** 수시진학관리 파일을 활용하여 우리 학교의 대학 입시 결과를 한 눈에 볼 수 있는 시각화 자료입니다. 이를 통해 지난 우리 학교 진학 결과를 확인하고 진학 상담에 방향을 제시합니다.
4. **세특 분석:** 각 교과에서 작성한 세특을 학생 맞춤으로 작성할 수 있도록 학생의 희망 계열과 작성하는 교과를 선택하고, 작성한 세특을 업로드하면, 학생부기재요령과 대학별 우수 세특을 학습한 AI가 분석하여 피드백을 해주고, 그 세특을 바탕으로 AI가 세특을 작성해드립니다. **(교과 교사용)**
5. **수능 최저 확인하기:** 모든 대학의 수능 최저학력기준을 모은 표입니다. 관심있는 대학의 점을 누르면 상세정보가 출력됩니다.
6. **면접 문항 생성:** 면접을 준비하는 수험생들에게 각 대학의 면접 가이드북을 학습한 AI가 맞춤 면접 문항을 제시합니다. 10문항이 제시되며 각 문항에 따른 평가 영역 및 모범 답안을 제시합니다. **\*주의: 개인 분석에서 원하는 학생 데이터를 불러온 후 진행합니다.**
7. **모의고사 문항 분석:** 모의고사 성적표를 토대로 학생의 오답 문항을 추출해 문항별 학습 가이드 제공을 위한 기초 자료를 제공합니다. **(담임교사용)**
8. **내신 & 모의고사 분석:** 내신점수와 모의고사 점수와의 상관관계를 그래프로 보여주며 학생별로 내신점수를 영역별로 조합하여 출력하고, 모의고사 점수를 회차에 따른 성적의 변화를 그래프로 출력합니다. **(담임교사용)**
9. **내신 분석하기(대학별 교과 점수 확인):** 학급 학생들, 학년 전체의 성적을 분포도로 출력됩니다. 각 학생을 누르면 과목마다 성취도 및 등급이 출력되고, 과목 조합에 따라 내신 등급도 계산합니다. 또한 각 대학별로 교과전형의 점수 계산 방식을 내장하고 있어 학생마다 각 대학에서 교과전형 점수를 확인할 수 있습니다.
10. **대학별 입결 분포도:** 주요 대학들의 전형별 입결을 시각화된 차트로 확인할 수 있습니다. 대학마다 50%cut, 70%cut, 평균 등급, 경쟁률, 추가합격 인원 등의 자세한 입학 관련 데이터를 확인할 수 있습니다.
11. **우리 학교 모의고사 성적 현황:** '내신 & 모의고사 분석'에서 원하는 학년의 데이터를 불러온 다음 시행해야 함. 학년의 내신 성적을 업로드 한 후, 탭을 확인하면 우리 학교의 모의고사 성적 및 분석 자료를 확인할 수 있습니다.
   * 학년 - 연도 - 회차 선택 후 데이터 갱신을 합니다.
   * **성적 우수자 현황:** 한국사 과목을 제외한 국어, 수학, 영어, 탐구1, 탐구2 과목의 원점수 합, 원점수 평균, 표준점수 합, 백분위 평균을 확인합니다. 원점수, 표준점수, 백분위 각각을 기준으로 정렬할 수 있습니다.
   * **원점수 합 분포 & 급간별 인원 통계:** 급간을 설정하여 급간별 인원수를 확인합니다. 막대를 누르면 해당 학생들의 모의고사 성적을 확인할 수 있습니다.
   * **선택과목 및 평균 분석:** 각 과목의 선택 과목 비율 및, 평균 원점수, 평균 백분위, 평균 등급을 확인합니다. 그래프를 누르면 그 과목을 선택한 학생들의 모의고사 성적을 확인할 수 있습니다.
   * **과목별 분포도:** 각 과목의 성적을 급간별로 나누어 해당 학생의 인원수를 나타낸 그래프입니다. 그래프의 막대를 누르면 해당 학생들의 모의고사 성적을 확인할 수 있습니다. 등급, 원점수, 표준점수, 백분위의 급간을 설정하여 그래프를 변경할 수 있습니다.
   * **수능 최저학력기준 충족 현황:** 모의고사 등급합을 2합, 3합, 4합에 따라 2~15까지 만족한 학생들을 나타낸 표입니다. 숫자를 누르면 그 등급을 충족한 학생의 충족 과목을 알려줍니다. 참고로 그 학생이 최고로 충족할 수 있는 등급합에만 학생이 표시됩니다. 예를 들어 2합 2를 맞춘 학생은 2합 2에만 표시가 됩니다. (3합, 4합은 별도)
`;

  window.exportManualToPdf = function () {
    let parsedHtml = "";
    if (typeof marked !== 'undefined') {
      parsedHtml = marked.parse(PROJECT_MANUAL_MD);
    } else {
      parsedHtml = "<p>마크다운 파서를 불러올 수 없습니다. 인터넷이 연결되어 있는지 확인해주세요.</p>";
    }

    const printWin = window.open("", "_blank", "width=900,height=700");
    if (!printWin) {
      alert("팝업이 차단되었습니다. 팝업 차단을 해제하고 다시 시도해주세요.");
      return;
    }

    printWin.document.write(`<!DOCTYPE html><html lang="ko"><head>
      <meta charset="UTF-8">
      <title>부안고등학교 진학지도 프로그램 설명서</title>
      <style>
        body { font-family: 'Malgun Gothic', sans-serif; color: #222; padding: 2.5rem 3rem; line-height: 1.8; font-size: 11pt; background: #fafafa; }
        .container { max-width: 800px; margin: 0 auto; background: #fff; padding: 2rem 3rem; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-radius: 8px; border-top: 5px solid #3c3fa0; }
        h1 { color: #3c3fa0; border-bottom: 2px solid #3c3fa0; padding-bottom: 0.8rem; font-size: 1.8rem; margin-bottom: 1.5rem; text-align: center; }
        h2 { color: #d32f2f; font-size: 1.3rem; margin-top: 2rem; border-bottom: 1px solid #eee; padding-bottom: 5px; }
        h3 { color: #2c3e7d; font-size: 1.1rem; margin-top: 1.5rem; }
        p, li { margin-bottom: 0.6rem; color: #444; }
        ul, ol { padding-left: 1.8rem; }
        strong { color: #222; font-weight: 700; }
        blockquote { border-left: 4px solid #ffc107; background: #fffde7; margin: 1rem 0; padding: 0.8rem 1.2rem; border-radius: 0 8px 8px 0; color: #555; font-size: 0.95rem; }
        hr { border: none; border-top: 1px dashed #ccc; margin: 2rem 0; }
        @media print { 
          body { padding: 0; background: #fff; } 
          .container { box-shadow: none; border: none; padding: 0; max-width: 100%; }
          h1 { color: #000; } h2 { color: #000; } h3 { color: #000; }
        }
      </style>
    </head><body><div class="container">${parsedHtml}</div></body></html>`);

    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); }, 500);
  };

  const manualBtn = document.getElementById("download-manual-btn");
  if (manualBtn) {
    manualBtn.addEventListener('click', window.exportManualToPdf);
  }

  // Keep legacy alias for any existing references

  let compareGlobalData = { gpa: [], mock: [], rounds: [], classes: [], years: [] };
  let compareChartInstance = null;
  let schoolMockDistChart = null;
  let schoolMockKorChoiceChart = null;
  let schoolMockMathChoiceChart = null;
  let schoolMockSocialChoiceChart = null;
  let schoolMockScienceChoiceChart = null;
  let _currentStudentScores = [];
  let _currentDistInterval = 10;
  let _csatMinData = {};
  let _csatStudentBest = [];
  let isCompareInitialized = false;

  // 기본 내장 GAS URL (변경 시 여기를 수정)
  const DEFAULT_GPA_GAS_URL = 'https://script.google.com/macros/s/AKfycbzwXdBu1ahjkIrimBnXOSBZQgRIvXqsNgXcB9WjivaCSCCE28DLSV5lNettqxaN1Wjd/exec';

  // 모의고사 성적 구글 시트 ID
  const GPA_MOCK_SHEET_ID = '1JbgXRiCB02XFeZnNR9pswLhihYY7wObCpjWreTYTe7s';

  // 로컬 실행을 위한 GAS URL 설정 로직
  const compareGasUrlInput = document.getElementById('compareGasUrl');
  const compareGasUrlSaveBtn = document.getElementById('compareGasUrlSaveBtn');
  const compareLoadDataBtn = document.getElementById('compareLoadDataBtn');

  if (compareGasUrlInput) {
    compareGasUrlInput.value = localStorage.getItem('gpaMockGasUrl') || DEFAULT_GPA_GAS_URL;
  }

  if (compareGasUrlSaveBtn) {
    compareGasUrlSaveBtn.addEventListener('click', () => {
      const url = compareGasUrlInput.value.trim();
      localStorage.setItem('gpaMockGasUrl', url);
      const status = document.getElementById('compareGasStatus');
      if (status) {
        status.innerText = "✅ 설정이 저장되었습니다.";
        setTimeout(() => { status.innerText = ""; }, 3000);
      }
    });
  }

  if (compareLoadDataBtn) {
    compareLoadDataBtn.addEventListener('click', () => {
      isCompareInitialized = false;
      initGpaMockCompare();
    });
  }

  function fetchGpaMockJsonp(url, params) {
    return new Promise((resolve, reject) => {
      const cbName = '__gpaMockJsonp_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      const script = document.createElement('script');

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('데이터 로딩 시간 초과 (구글 서버 응답 없음)'));
      }, 15000);

      function cleanup() {
        clearTimeout(timer);
        delete window[cbName];
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      window[cbName] = function (data) { cleanup(); resolve(data); };
      script.onerror = function () {
        cleanup();
        reject(new Error('네트워크 연결 오류 또는 보안 정책(CORS) 제한'));
      };

      const qs = new URLSearchParams(params);
      qs.set('callback', cbName);
      script.src = url + (url.includes('?') ? '&' : '?') + qs.toString();
      document.head.appendChild(script);
    });
  }

  async function fetchMockDataViaGviz() {
    const sheetConfigs = [
      { name: '3학년 모의고사 성적', grade: 3 },
      { name: '2학년 모의고사 성적', grade: 2 },
      { name: '1학년 모의고사 성적', grade: 1 },
    ];

    const mockData = [];
    const grades = new Set();
    const years = new Set();

    for (const config of sheetConfigs) {
      const url = `https://docs.google.com/spreadsheets/d/${GPA_MOCK_SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(config.name)}`;
      let json;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        json = JSON.parse(jsonStr);
      } catch (e) {
        console.warn(`[gviz] ${config.name} 로드 실패:`, e);
        continue;
      }

      if (!json.table || !json.table.rows) continue;

      json.table.rows.forEach(row => {
        const cells = row.c || [];
        const get = (i) => {
          const cell = cells[i];
          if (!cell || cell.v === null || cell.v === undefined) return '';
          return cell.v;
        };
        const toN = (v) => {
          if (v === '' || v === null || v === undefined) return null;
          const n = parseFloat(String(v));
          return isNaN(n) ? null : n;
        };

        const year = get(0);
        const roundRaw = get(1);
        // "3월" → "3월", 숫자 3 → "3월"로 정규화
        const round = String(roundRaw || '').includes('월') ? String(roundRaw) : (roundRaw !== '' ? `${roundRaw}월` : '');
        const classNum = get(3);
        const studentNum = get(4);
        const name = get(5);

        if (!name || name === '') return;
        if (!year) return;

        mockData.push({
          grade: config.grade,
          year: Number(year) || 0,
          round,
          classNum: Number(classNum) || 0,
          studentNum: Number(studentNum) || 0,
          name: String(name),
          '국어': {
            subjectName: String(get(6) || ''),
            raw: toN(get(7)), std: toN(get(8)), percentile: toN(get(9)), grade: toN(get(10))
          },
          '수학': {
            subjectName: String(get(11) || ''),
            raw: toN(get(12)), std: toN(get(13)), percentile: toN(get(14)), grade: toN(get(15))
          },
          '영어': { raw: toN(get(16)), grade: toN(get(17)) },
          '한국사': { raw: toN(get(18)), grade: toN(get(19)) },
          '탐구영역1': {
            subjectName: String(get(20) || ''),
            raw: toN(get(21)), std: toN(get(22)), percentile: toN(get(23)), grade: toN(get(24))
          },
          '탐구영역2': {
            subjectName: String(get(25) || ''),
            raw: toN(get(26)), std: toN(get(27)), percentile: toN(get(28)), grade: toN(get(29))
          },
          rawRow: {
            '시행 연도': year, '시행 회차': round, '학년': config.grade,
            '반': classNum, '번호': studentNum, '이름': name,
            '국어선택': get(6), '국어원점수': get(7), '국어표준점수': get(8), '국어백분위': get(9), '국어등급': get(10),
            '수학선택': get(11), '수학원점수': get(12), '수학표준점수': get(13), '수학백분위': get(14), '수학등급': get(15),
            '영어원점수': get(16), '영어등급': get(17),
            '한국사원점수': get(18), '한국사등급': get(19),
            '탐구1선택': get(20), '탐구1원점수': get(21), '탐구1표준점수': get(22), '탐구1백분위': get(23), '탐구1등급': get(24),
            '탐구2선택': get(25), '탐구2원점수': get(26), '탐구2표준점수': get(27), '탐구2백분위': get(28), '탐구2등급': get(29),
          }
        });

        grades.add(config.grade);
        years.add(Number(year));
      });
    }

    if (mockData.length === 0) throw new Error('모든 시트에서 데이터를 불러오지 못했습니다.');

    return {
      mock: mockData,
      grades: Array.from(grades).sort((a, b) => b - a),
      years: Array.from(years).sort((a, b) => b - a)
    };
  }

  async function initGpaMockCompare() {
    if (isCompareInitialized) return;

    const loader = document.getElementById('compareChartLoader');
    if (loader) loader.classList.remove('hidden');

    try {
      const data = await fetchMockDataViaGviz();
      handleCompareData(data);
      const status = document.getElementById('compareGasStatus');
      if (status) {
        status.innerText = "⚡ 데이터 연동 성공";
        setTimeout(() => { status.innerText = ""; }, 3000);
      }
    } catch (error) {
      console.error("gviz 로드 실패, GAS fallback 시도:", error);
      const gasUrl = localStorage.getItem('gpaMockGasUrl') || DEFAULT_GPA_GAS_URL;
      try {
        let data;
        if (typeof google !== 'undefined' && google.script && google.script.run) {
          data = await new Promise((res, rej) => {
            google.script.run.withSuccessHandler(res).withFailureHandler(rej).getStudentData();
          });
        } else {
          data = await fetchGpaMockJsonp(gasUrl, { action: 'getStudentData' });
        }
        if (data && data.error) throw new Error(data.error);
        handleCompareData(data);
      } catch (gasError) {
        console.error("GAS fallback 실패:", gasError);
        showGasUrlWarning(gasUrl, gasError.message);
      }
    } finally {
      if (loader) loader.classList.add('hidden');
    }
  }

  function showGasUrlWarning(failedUrl, reason) {
    // 기존 경고 모달 제거 후 재생성
    const existing = document.getElementById('gasUrlWarningModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'gasUrlWarningModal';
    modal.style.cssText = `
      position:fixed; inset:0; z-index:9999;
      background:rgba(0,0,0,0.6); backdrop-filter:blur(4px);
      display:flex; align-items:center; justify-content:center;
    `;
    modal.innerHTML = `
      <div style="
        background:var(--panel-bg,#1a1b2e); border:1px solid rgba(255,100,100,0.4);
        border-radius:16px; padding:2rem; max-width:480px; width:90%; color:var(--text-primary,#f8f9fa);
        box-shadow:0 8px 32px rgba(0,0,0,0.5);
      ">
        <div style="font-size:2rem; margin-bottom:0.75rem;">⚠️</div>
        <h3 style="margin-bottom:0.5rem; color:#ff6b6b;">앱스크립트 연결 실패</h3>
        <p style="font-size:0.9rem; color:var(--text-secondary,#adb5bd); margin-bottom:1rem;">
          내장된 GAS URL로 데이터를 불러오는 데 실패했습니다.<br>
          URL이 변경되었거나 배포가 해제된 경우 아래에서 새 URL을 입력해 주세요.
        </p>
        <p style="font-size:0.75rem; word-break:break-all; color:rgba(255,107,107,0.7); margin-bottom:1.25rem;">
          실패 URL: ${failedUrl}<br>오류: ${reason}
        </p>
        <input id="gasUrlWarningInput" type="text" placeholder="새 앱스크립트 URL 붙여넣기..."
          style="width:100%; padding:0.65rem 0.9rem; border-radius:8px; border:1px solid rgba(255,255,255,0.2);
                 background:rgba(0,0,0,0.3); color:inherit; font-size:0.9rem; margin-bottom:0.75rem;">
        <div style="display:flex; gap:0.75rem; justify-content:flex-end;">
          <button id="gasUrlWarningClose" style="
            padding:0.5rem 1.1rem; border-radius:8px; border:1px solid rgba(255,255,255,0.2);
            background:transparent; color:var(--text-secondary,#adb5bd); cursor:pointer; font-size:0.9rem;">
            닫기
          </button>
          <button id="gasUrlWarningSave" style="
            padding:0.5rem 1.25rem; border-radius:8px; border:none;
            background:linear-gradient(135deg,#7c83fd,#96baff); color:#fff; cursor:pointer; font-weight:600; font-size:0.9rem;">
            저장 후 재시도
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('gasUrlWarningClose').onclick = () => modal.remove();
    document.getElementById('gasUrlWarningSave').onclick = () => {
      const newUrl = document.getElementById('gasUrlWarningInput').value.trim();
      if (!newUrl.startsWith('https://script.google.com/')) {
        alert('올바른 Google Apps Script URL을 입력해 주세요.');
        return;
      }
      localStorage.setItem('gpaMockGasUrl', newUrl);
      if (compareGasUrlInput) compareGasUrlInput.value = newUrl;
      modal.remove();
      isCompareInitialized = false;
      initGpaMockCompare();
    };
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  }

  function handleCompareData(data) {
    compareGlobalData = data;

    // 로컬 내신 데이터 통합 (grade-rank.js의 state 활용)
    if (typeof state !== 'undefined' && state.students && state.students.length > 0) {
      compareGlobalData.gpa = state.students.map(s => ({
        rank: s.rank,
        name: s.name,
        '전체내신': s.totalGPA,
        '국영수': s.kemGPA,
        '국영수과': s.kemsGPA,
        '국영수사': s.kemssGPA,
        '국영수사과': s.kemssscGPA,
        '수영과': s.mesGPA,
        '국영사': s.kesGPA,
        rawRow: s.subjects
      }));
    } else {
      compareGlobalData.gpa = [];
      alert("내신 데이터가 없습니다. 원활한 분석을 위해 화면 상단 '통합 파일 업로드하기'에서 내신 석차 파일(.csv/.json)을 업로드해 주세요.");
    }

    const yearSelect = document.getElementById('compareYear');
    if (yearSelect) {
      yearSelect.innerHTML = '<option value="all">전체 연도</option>';
      (data.years || []).forEach(y => {
        const option = document.createElement('option');
        option.value = option.text = y;
        yearSelect.appendChild(option);
      });
    }

    const gradeSelect = document.getElementById('compareGrade');
    if (gradeSelect) {
      gradeSelect.innerHTML = '<option value="all">전체 학년</option>';
      const sortedGrades = (data.grades || []).sort((a, b) => b - a);
      sortedGrades.forEach(g => {
        const option = document.createElement('option');
        option.value = option.text = g;
        gradeSelect.appendChild(option);
      });
      // 데이터가 있으면 가장 높은 학년(보통 3학년)을 기본값으로 설정
      if (sortedGrades.length > 0) {
        gradeSelect.value = sortedGrades[0];
      }
    }

    updateCompareDropdowns();
    setupCompareListeners();

    const loader = document.getElementById('compareChartLoader');
    if (loader) loader.classList.add('hidden');
    isCompareInitialized = true;
    updateCompareChart();
  }

  function setupCompareListeners() {
    const ids = ['compareYear', 'compareMockRound', 'compareGrade', 'compareClassFilter', 'compareStudent', 'compareXType', 'compareScoreType', 'compareBestN'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', () => {
          if (['compareYear', 'compareMockRound', 'compareGrade', 'compareClassFilter'].includes(id)) {
            updateCompareDropdowns();
          }
          updateCompareChart();
        });
      }
    });

    document.querySelectorAll('input[name="compareSubject"]').forEach(cb => {
      cb.addEventListener('change', updateCompareChart);
    });
  }

  function updateCompareDropdowns() {
    const gradeVal = document.getElementById('compareGrade').value;
    const yearVal = document.getElementById('compareYear').value;
    const roundVal = document.getElementById('compareMockRound').value;
    const classVal = document.getElementById('compareClassFilter').value;

    // 연도 필터링 (학년 선택 시)
    const yearSelect = document.getElementById('compareYear');
    const prevYear = yearSelect.value;
    yearSelect.innerHTML = '<option value="all">전체 연도</option>';
    const filteredYears = new Set();
    compareGlobalData.mock.forEach(m => {
      if (gradeVal === 'all' || String(m.grade) === gradeVal) {
        filteredYears.add(m.year);
      }
    });
    Array.from(filteredYears).sort((a, b) => b - a).forEach(y => {
      const opt = document.createElement('option');
      opt.value = opt.text = y;
      if (String(y) === prevYear) opt.selected = true;
      yearSelect.appendChild(opt);
    });

    // 회차 필터링 (학년, 연도 선택 시)
    const roundSelect = document.getElementById('compareMockRound');
    const prevRound = roundSelect.value;
    roundSelect.innerHTML = '<option value="all">전체 회차</option>';
    const filteredRounds = new Set();
    compareGlobalData.mock.forEach(m => {
      const matchGrade = gradeVal === 'all' || String(m.grade) === gradeVal;
      const matchYear = yearVal === 'all' || String(m.year) === yearVal; // uses current yearVal logic
      if (matchGrade && matchYear) {
        filteredRounds.add(m.round);
      }
    });
    Array.from(filteredRounds).sort().forEach(r => {
      const opt = document.createElement('option');
      opt.value = opt.text = r;
      if (r === prevRound) opt.selected = true;
      roundSelect.appendChild(opt);
    });

    // 반 필터링 (학년, 연도, 회차 선택 시)
    const classSelect = document.getElementById('compareClassFilter');
    const prevClass = classSelect.value;
    classSelect.innerHTML = '<option value="all">전체 반</option>';
    const filteredClasses = new Set();
    compareGlobalData.mock.forEach(m => {
      const matchGrade = gradeVal === 'all' || String(m.grade) === gradeVal;
      const matchYear = yearVal === 'all' || String(m.year) === yearVal;
      const matchRound = roundVal === 'all' || String(m.round) === roundVal;
      if (matchGrade && matchYear && matchRound) {
        filteredClasses.add(m.classNum);
      }
    });
    Array.from(filteredClasses).sort((a, b) => a - b).forEach(c => {
      const opt = document.createElement('option');
      opt.value = c; opt.text = `${c}반`;
      if (String(c) === prevClass) opt.selected = true;
      classSelect.appendChild(opt);
    });

    // 학생 필터링 (학년, 연도, 회차, 반 선택 시)
    const studentSelect = document.getElementById('compareStudent');
    const prevStudent = studentSelect.value;
    studentSelect.innerHTML = '<option value="all">전체 학생 (차트보기)</option>';
    // name을 key로 dedup: 같은 학생이 연도/회차마다 번호가 달라져도 한 번만 표시
    const studentMap = new Map(); // name -> { name, num, year, round }

    compareGlobalData.mock.forEach(m => {
      const matchGrade = gradeVal === 'all' || String(m.grade) === gradeVal;
      const matchYear = yearVal === 'all' || String(m.year) === yearVal;
      const matchRound = roundVal === 'all' || String(m.round) === roundVal;
      const matchClass = classVal === 'all' || String(m.classNum) === classVal;

      if (matchGrade && matchYear && matchRound && matchClass) {
        const existing = studentMap.get(m.name);
        // 가장 최근 회차의 studentNum을 표시용으로 사용
        if (!existing || m.year > existing.year || (m.year === existing.year && String(m.round) > String(existing.round))) {
          studentMap.set(m.name, { name: m.name, num: m.studentNum, year: m.year, round: m.round });
        }
      }
    });

    // 번호 순으로 정렬 후 이름 가나다 순
    Array.from(studentMap.values()).sort((a, b) => {
      if (a.num !== b.num) return (parseInt(a.num) || 0) - (parseInt(b.num) || 0);
      return (String(a.name) || "").localeCompare(String(b.name) || "");
    }).forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.name;
      opt.text = `${s.num}번 ${s.name}`;
      if (s.name === prevStudent) opt.selected = true;
      studentSelect.appendChild(opt);
    });
  }

  function updateCompareChart() {
    const studentName = document.getElementById('compareStudent').value;
    const chartView = document.getElementById('compareChartView');
    const individualView = document.getElementById('compareIndividualView');

    if (studentName !== 'all') {
      chartView.classList.add('hidden');
      individualView.classList.remove('hidden');
      renderStudentHistory(studentName);
      return;
    }

    chartView.classList.remove('hidden');
    individualView.classList.add('hidden');

    const yearVal = document.getElementById('compareYear').value;
    const roundVal = document.getElementById('compareMockRound').value;
    const gradeVal = document.getElementById('compareGrade').value;
    const classVal = document.getElementById('compareClassFilter').value;
    const xType = document.getElementById('compareXType').value;
    const scoreType = document.getElementById('compareScoreType').value;
    const bestN = parseInt(document.getElementById('compareBestN').value);
    const selectedSubjects = Array.from(document.querySelectorAll('input[name="compareSubject"]:checked')).map(cb => cb.value);

    const chartData = [];
    const mockMap = new Map();
    compareGlobalData.mock.filter(m => {
      const matchYear = yearVal === 'all' || String(m.year) === yearVal;
      const matchRound = roundVal === 'all' || m.round === roundVal;
      const matchGrade = gradeVal === 'all' || String(m.grade) === gradeVal;
      const matchClass = classVal === 'all' || String(m.classNum) === classVal;
      return matchYear && matchRound && matchGrade && matchClass;
    }).forEach(m => {
      mockMap.set(m.name, m);
    });

    // state.students가 최신 내신 데이터를 가지고 있으면 동기화
    if (typeof state !== 'undefined' && state.students && state.students.length > 0) {
      compareGlobalData.gpa = state.students.map(s => ({
        rank: s.rank, name: s.name,
        '전체내신': s.totalGPA, '국영수': s.kemGPA, '국영수과': s.kemsGPA,
        '국영수사': s.kemssGPA, '국영수사과': s.kemssscGPA,
        '수영과': s.mesGPA, '국영사': s.kesGPA, rawRow: s.subjects
      }));
    }

    // 내신 데이터 없으면 모의고사만으로 차트 구성
    const hasgpa = compareGlobalData.gpa.length > 0;

    function calcMockY(mockScore) {
      let yValue = 0, validDataCount = 0, addedToChart = false;
      if (scoreType === 'best_grade') {
        let validGrades = [];
        ['국어', '수학', '영어'].forEach(sub => {
          if (mockScore[sub] && mockScore[sub].grade && !isNaN(mockScore[sub].grade)) {
            validGrades.push(Number(mockScore[sub].grade));
          }
        });
        let tamguGrades = [];
        if (mockScore['탐구영역1'] && mockScore['탐구영역1'].grade && !isNaN(mockScore['탐구영역1'].grade)) tamguGrades.push(Number(mockScore['탐구영역1'].grade));
        if (mockScore['탐구영역2'] && mockScore['탐구영역2'].grade && !isNaN(mockScore['탐구영역2'].grade)) tamguGrades.push(Number(mockScore['탐구영역2'].grade));
        if (tamguGrades.length > 0) validGrades.push(Math.min(...tamguGrades));
        validGrades.sort((a, b) => a - b);
        if (validGrades.length >= bestN) {
          for (let i = 0; i < bestN; i++) yValue += validGrades[i];
          addedToChart = true;
        }
      } else {
        selectedSubjects.forEach(sub => {
          const subjectData = mockScore[sub];
          if (subjectData) {
            let val = subjectData[scoreType];
            if (val !== null && val !== undefined && val !== '' && !isNaN(val)) {
              yValue += Number(val);
              validDataCount++;
            }
          }
        });
        if (validDataCount > 0) addedToChart = true;
      }
      return addedToChart ? yValue : null;
    }

    if (!hasgpa) {
      // 모의고사 전용 모드: x축 = 번호
      mockMap.forEach(m => {
        const yValue = calcMockY(m);
        if (yValue !== null) {
          chartData.push({
            x: parseInt(m.studentNum) || 0, y: yValue,
            studentName: m.name, classNum: m.classNum,
            overallGpa: null, rank: null,
            gpaRow: null, mockRow: m.rawRow
          });
        }
      });
      chartData.sort((a, b) => a.x - b.x);
      drawCompareChart(chartData, 'mockOnly', scoreType, bestN);
      return;
    }

    compareGlobalData.gpa.forEach(student => {
      const mockScore = mockMap.get(student.name);
      if (mockScore) {
        const yValue = calcMockY(mockScore);
        if (yValue !== null) {
          chartData.push({
            x: Number(student[xType]), y: yValue,
            studentName: student.name, classNum: mockScore.classNum,
            overallGpa: student['전체내신'], rank: student.rank,
            gpaRow: student.rawRow, mockRow: mockScore.rawRow
          });
        }
      }
    });

    drawCompareChart(chartData, xType, scoreType, bestN);
  }

  function drawCompareChart(data, xType, scoreType, bestN) {
    const ctx = document.getElementById('compareScatterChart').getContext('2d');
    const isMockOnly = xType === 'mockOnly';
    let yLabel = "모의고사 ";
    let isReversed = false;
    if (scoreType === 'grade') { yLabel += "등급 합"; isReversed = true; }
    else if (scoreType === 'best_grade') { yLabel += `최고의 ${bestN}합`; isReversed = true; }
    else if (scoreType === 'raw') { yLabel += "원점수 합"; isReversed = false; }
    else if (scoreType === 'std') { yLabel += "표준점수 합"; isReversed = false; }

    const xScaleOptions = isMockOnly
      ? {
        title: { display: true, text: '📋 번호', color: '#96baff', font: { weight: 'bold' } },
        ticks: { color: '#ccc', stepSize: 1 },
        grid: { color: 'rgba(255,255,255,0.1)' }
      }
      : {
        title: { display: true, text: `🏫 내신 등급 (${xType})`, color: '#96baff', font: { weight: 'bold' } },
        min: 1, max: 9, reverse: true,
        grid: { color: 'rgba(255,255,255,0.1)' },
        ticks: { color: '#ccc' }
      };

    if (compareChartInstance) compareChartInstance.destroy();
    compareChartInstance = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [{
          label: '학생 데이터',
          data: data,
          backgroundColor: function (ctx) {
            const val = ctx.raw?.x;
            if (!val) return 'rgba(124, 131, 253, 0.7)';
            if (isMockOnly) return 'rgba(150, 186, 255, 0.75)';
            const ratio = Math.max(0, Math.min(1, (val - 1) / 8));
            return `rgba(${Math.round(255 * (1 - ratio))}, 100, ${Math.round(255 * ratio)}, 0.7)`;
          },
          pointRadius: 7, pointHoverRadius: 10
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          x: xScaleOptions,
          y: {
            title: { display: true, text: yLabel, color: '#ff6b81', font: { weight: 'bold' } },
            reverse: isReversed,
            grid: { color: 'rgba(255,255,255,0.1)' },
            ticks: { color: '#ccc' }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            callbacks: {
              label: (c) => isMockOnly
                ? [`👤 이름: ${c.raw.studentName} (${c.raw.classNum}반)`, `📋 번호: ${c.raw.x}`, `📊 ${yLabel}: ${c.raw.y}`]
                : [`👤 이름: ${c.raw.studentName} (${c.raw.classNum}반)`, `🏫 내신: ${c.raw.overallGpa} (전교 ${c.raw.rank}등)`, `📊 ${yLabel}: ${c.raw.y}`]
            }
          }
        },
        onClick: (e, active) => {
          if (active.length > 0) {
            const p = compareChartInstance.data.datasets[0].data[active[0].index];
            document.getElementById('compareStudent').value = p.studentName;
            updateCompareChart();
          }
        }
      }
    });
  }

  function renderStudentHistory(name) {
    const studentGpa = compareGlobalData.gpa.find(g => g.name === name);
    const studentMocks = compareGlobalData.mock.filter(m => m.name === name).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return parseInt(a.round) - parseInt(b.round);
    });

    if (!studentMocks.length) return;

    const firstMock = studentMocks[0] || {};
    const identityDisplay = firstMock.grade ? `${firstMock.grade}학년 ${firstMock.classNum}반 ${firstMock.studentNum}번` : '';

    const subjects = ['국어', '수학', '영어', '한국사', '탐구영역1', '탐구영역2'];
    const subjectLabels = { '국어': '국어', '수학': '수학', '영어': '영어', '한국사': '한국사', '탐구영역1': '탐구1', '탐구영역2': '탐구2' };
    const subjectColors = { '국어': '#5b8dee', '수학': '#ff6b6b', '영어': '#6bcb77', '한국사': '#ffd93d', '탐구영역1': '#c77dff', '탐구영역2': '#ff8fab' };
    const xLabels = studentMocks.map(m => `${m.year}년 ${m.round}`);

    const tableRows = studentMocks.map(m => {
      const cells = subjects.map(s => {
        const d = m[s] || {};
        const grade = (d.grade !== undefined && d.grade !== null && d.grade !== '') ? d.grade : '-';
        const raw = (d.raw !== undefined && d.raw !== null && d.raw !== '') ? d.raw : '-';
        const std = (d.std !== undefined && d.std !== null && d.std !== '') ? d.std : '-';
        const subName = d.subjectName ? `<div style="font-size:0.7rem;color:${subjectColors[s]};opacity:0.8;margin-top:2px;">${d.subjectName}</div>` : '';
        return `
          <td style="padding:0.7rem 0.4rem;border-left:1px solid var(--clr-border-subtle);vertical-align:top;">
            <div style="font-size:1.1rem;font-weight:900;color:var(--text-primary);">${grade}</div>
            ${subName}
          </td>
          <td style="padding:0.7rem 0.4rem;color:var(--clr-raw);font-size:0.9rem;">${raw}</td>
          <td style="padding:0.7rem 0.4rem;color:var(--clr-std);font-size:0.9rem;">${std}</td>`;
      }).join('');
      return `
        <tr style="border-bottom:1px solid var(--clr-border-subtle);transition:background 0.2s;" onmouseover="this.style.background='var(--clr-inset-bg)'" onmouseout="this.style.background='transparent'">
          <td style="padding:1rem;font-weight:700;text-align:left;color:var(--text-primary);white-space:nowrap;">${m.round}<small style="display:block;font-weight:400;opacity:0.5;">${m.year}년</small></td>
          ${cells}
        </tr>`;
    }).join('');

    const subjectCheckboxes = subjects.map(s => `
      <label style="display:flex;align-items:center;gap:0.4rem;cursor:pointer;padding:0.4rem 0.8rem;border-radius:20px;border:1.5px solid ${subjectColors[s]};background:var(--clr-checkbox-bg);transition:all 0.2s;">
        <input type="checkbox" name="studentHistorySubject" value="${s}" checked
               onchange="updateStudentHistoryChart()"
               style="accent-color:${subjectColors[s]};width:14px;height:14px;cursor:pointer;">
        <span style="font-size:0.85rem;font-weight:600;color:${subjectColors[s]};">${subjectLabels[s]}</span>
      </label>`).join('');

    const theadSubjects = subjects.map(s =>
      `<th colspan="3" style="padding:0.7rem;color:${subjectColors[s]};border-bottom:1px solid var(--clr-border-subtle);border-left:1px solid var(--clr-border-subtle);">${subjectLabels[s]}</th>`
    ).join('');
    const theadTypes = subjects.map(() =>
      `<th style="padding:0.5rem 0.3rem;color:var(--text-secondary);font-size:0.72rem;border-bottom:1px solid var(--panel-border);border-left:1px solid var(--clr-border-subtle);">등급</th>
       <th style="padding:0.5rem 0.3rem;color:var(--clr-raw);font-size:0.72rem;border-bottom:1px solid var(--panel-border);">원점수</th>
       <th style="padding:0.5rem 0.3rem;color:var(--clr-std);font-size:0.72rem;border-bottom:1px solid var(--panel-border);">표준점수</th>`
    ).join('');

    let html = `
      <div class="glass-panel" style="padding:2rem;border-color:var(--accent-primary);">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2rem;border-bottom:1px solid var(--panel-border);padding-bottom:1.5rem;">
          <div>
            <h3 style="font-size:1.8rem;font-weight:800;color:var(--text-primary);margin:0;">${name} <span style="font-size:1rem;font-weight:400;color:var(--text-secondary);opacity:0.8;">학생 종합 리포트</span></h3>
            <div style="display:flex;gap:1rem;margin-top:0.5rem;">
              <p style="color:var(--text-secondary);font-weight:500;margin:0;font-size:0.9rem;">📍 ${identityDisplay}</p>
              ${studentGpa ? `<p style="color:var(--accent-primary);font-weight:600;margin:0;display:flex;align-items:center;gap:0.5rem;font-size:0.9rem;">
                <span style="background:var(--accent-primary);color:#fff;padding:2px 8px;border-radius:4px;font-size:0.75rem;">RANK</span> 내신 전교 순위: ${studentGpa.rank}등
              </p>` : ''}
            </div>
          </div>
          <button onclick="document.getElementById('compareStudent').value='all'; const e=new Event('change'); document.getElementById('compareStudent').dispatchEvent(e);" class="btn-secondary" style="font-size:0.8rem;padding:0.5rem 1.2rem;border-radius:30px;">← 전체 차트로 돌아가기</button>
        </div>

        ${studentGpa ? `
        <div style="margin-bottom:2.5rem;">
          <h4 style="color:var(--clr-h4-blue);font-weight:700;margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem;">🏫 3학년 내신 등급 현황</h4>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:1rem;">
            ${['전체내신', '국영수', '국영수과', '국영수사', '국영수사과', '수영과', '국영사'].map(k => `
              <div class="glass-panel" style="padding:1rem;border-radius:12px;text-align:center;background:var(--clr-inset-bg);">
                <div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:0.4rem;">${k}</div>
                <div style="font-size:1.4rem;font-weight:800;color:var(--text-primary);">${studentGpa[k]}</div>
              </div>`).join('')}
          </div>
        </div>` : `
        <div style="margin-bottom:2rem;padding:1rem 1.5rem;background:rgba(150,186,255,0.08);border:1px solid rgba(150,186,255,0.2);border-radius:12px;">
          <p style="margin:0;color:var(--text-secondary);font-size:0.9rem;">ℹ️ 내신 데이터가 없어 모의고사 성적만 표시됩니다.</p>
        </div>`}

        <div>
          <h4 style="color:var(--clr-h4-pink);font-weight:700;margin-bottom:1.2rem;display:flex;align-items:center;gap:0.5rem;">📝 역대 모의고사 성적 추이</h4>
          <div style="overflow-x:auto;border-radius:12px;border:1px solid var(--panel-border);margin-bottom:2rem;">
            <table style="width:100%;border-collapse:collapse;font-size:0.85rem;text-align:center;">
              <thead>
                <tr style="background:rgba(255,107,129,0.12);">
                  <th rowspan="2" style="padding:1rem;text-align:left;color:var(--clr-mock-head);border-bottom:1px solid var(--panel-border);vertical-align:middle;min-width:90px;">시행 회차</th>
                  ${theadSubjects}
                </tr>
                <tr style="background:rgba(255,107,129,0.06);">
                  ${theadTypes}
                </tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>
          </div>

          <h4 style="color:var(--clr-h4-pink);font-weight:700;margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem;">📈 성적 추이 그래프</h4>
          <div style="display:flex;flex-direction:column;gap:0.8rem;margin-bottom:1.2rem;padding:1rem;background:var(--clr-inset-bg);border-radius:10px;border:1px solid var(--clr-border-subtle);">
            <div style="display:flex;flex-wrap:wrap;gap:0.7rem;align-items:center;">
              <span style="color:var(--text-secondary);font-size:0.82rem;min-width:60px;">과목 선택:</span>
              ${subjectCheckboxes}
            </div>
            <div style="border-top:1px solid var(--clr-border-subtle);padding-top:0.8rem;display:flex;flex-wrap:wrap;gap:0.7rem;align-items:center;">
              <span style="color:var(--text-secondary);font-size:0.82rem;min-width:60px;">점수 유형:</span>
              <label style="display:flex;align-items:center;gap:0.4rem;cursor:pointer;padding:0.4rem 0.9rem;border-radius:20px;border:1.5px solid var(--clr-mock-head);background:var(--clr-checkbox-bg);">
                <input type="checkbox" name="studentHistoryScoreType" value="grade" checked onchange="updateStudentHistoryChart()" style="accent-color:#ff8e9e;width:14px;height:14px;cursor:pointer;">
                <span style="font-size:0.85rem;font-weight:600;color:var(--clr-mock-head);">등급 합</span>
              </label>
              <label style="display:flex;align-items:center;gap:0.4rem;cursor:pointer;padding:0.4rem 0.9rem;border-radius:20px;border:1.5px solid var(--clr-raw);background:var(--clr-checkbox-bg);">
                <input type="checkbox" name="studentHistoryScoreType" value="raw" checked onchange="updateStudentHistoryChart()" style="accent-color:#96baff;width:14px;height:14px;cursor:pointer;">
                <span style="font-size:0.85rem;font-weight:600;color:var(--clr-raw);">원점수 합</span>
              </label>
              <label style="display:flex;align-items:center;gap:0.4rem;cursor:pointer;padding:0.4rem 0.9rem;border-radius:20px;border:1.5px solid var(--clr-std);background:var(--clr-checkbox-bg);">
                <input type="checkbox" name="studentHistoryScoreType" value="std" checked onchange="updateStudentHistoryChart()" style="accent-color:#6bcb77;width:14px;height:14px;cursor:pointer;">
                <span style="font-size:0.85rem;font-weight:600;color:var(--clr-std);">표준점수 합</span>
              </label>
            </div>
          </div>
          <div style="position:relative;height:420px;background:var(--clr-chart-bg);border-radius:12px;border:1px solid var(--clr-border-subtle);padding:1rem;">
            <canvas id="studentHistoryChart"></canvas>
          </div>
          <p style="margin-top:0.8rem;font-size:0.78rem;color:var(--text-secondary);">
            💡 선택한 과목들의 합산 값을 표시합니다. &nbsp;등급 합은 오른쪽 축 (낮을수록 좋음), 원점수·표준점수 합은 왼쪽 축 | y축은 데이터에 맞게 자동 조정됩니다.
          </p>
        </div>
      </div>`;

    document.getElementById('compareIndividualView').innerHTML = html;

    window.__studentHistoryMocks = studentMocks;
    window.__studentHistorySubjectColors = subjectColors;
    window.__studentHistorySubjectLabels = subjectLabels;
    window.__studentHistoryXLabels = xLabels;
    window.__studentHistorySubjects = subjects;

    updateStudentHistoryChart();
  }

  window.updateStudentHistoryChart = function () {
    const studentMocks = window.__studentHistoryMocks;
    const subjectLabels = window.__studentHistorySubjectLabels;
    const xLabels = window.__studentHistoryXLabels;
    if (!studentMocks || !xLabels) return;

    const selectedSubjects = Array.from(document.querySelectorAll('input[name="studentHistorySubject"]:checked')).map(cb => cb.value);
    const selectedTypes = Array.from(document.querySelectorAll('input[name="studentHistoryScoreType"]:checked')).map(cb => cb.value);

    const subjectTag = selectedSubjects.map(s => subjectLabels[s] || s).join('+') || '(없음)';

    function sumSeries(key) {
      return studentMocks.map(m => {
        let total = 0, count = 0;
        selectedSubjects.forEach(s => {
          const v = m[s]?.[key];
          if (v !== undefined && v !== null && v !== '' && !isNaN(+v)) { total += +v; count++; }
        });
        return count > 0 ? total : null;
      });
    }

    function dynRange(values, reversed) {
      const valid = values.filter(v => v !== null);
      if (!valid.length) return { min: 0, max: 10 };
      const mn = Math.min(...valid);
      const mx = Math.max(...valid);
      const pad = Math.max((mx - mn) * 0.18, 2);
      if (reversed) return { min: Math.max(0, Math.floor(mn - pad)), max: Math.ceil(mx + pad) };
      return { min: Math.max(0, Math.floor(mn - pad)), max: Math.ceil(mx + pad) };
    }

    const gradeData = selectedTypes.includes('grade') ? sumSeries('grade') : [];
    const rawData = selectedTypes.includes('raw') ? sumSeries('raw') : [];
    const stdData = selectedTypes.includes('std') ? sumSeries('std') : [];

    const gradeRange = dynRange(gradeData, true);
    const scoreRange = dynRange([...rawData, ...stdData], false);

    const showGrade = selectedTypes.includes('grade') && gradeData.some(v => v !== null);
    const showScore = (selectedTypes.includes('raw') || selectedTypes.includes('std')) &&
      [...rawData, ...stdData].some(v => v !== null);

    const datasets = [];
    if (selectedTypes.includes('grade')) datasets.push({
      label: `${subjectTag} 등급 합`,
      data: gradeData, borderColor: '#ff8e9e', backgroundColor: '#ff8e9e44',
      yAxisID: 'yGrade', borderDash: [], borderWidth: 2.5,
      pointRadius: 6, pointStyle: 'circle', tension: 0.3, spanGaps: true
    });
    if (selectedTypes.includes('raw')) datasets.push({
      label: `${subjectTag} 원점수 합`,
      data: rawData, borderColor: '#96baff', backgroundColor: '#96baff33',
      yAxisID: 'yScore', borderDash: [7, 4], borderWidth: 2.5,
      pointRadius: 6, pointStyle: 'triangle', tension: 0.3, spanGaps: true
    });
    if (selectedTypes.includes('std')) datasets.push({
      label: `${subjectTag} 표준점수 합`,
      data: stdData, borderColor: '#6bcb77', backgroundColor: '#6bcb7733',
      yAxisID: 'yScore', borderDash: [2, 4], borderWidth: 2.5,
      pointRadius: 6, pointStyle: 'rectRot', tension: 0.3, spanGaps: true
    });

    const canvas = document.getElementById('studentHistoryChart');
    if (!canvas) return;
    if (window.__studentHistoryChartInstance) { window.__studentHistoryChartInstance.destroy(); }

    window.__studentHistoryChartInstance = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: { labels: xLabels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: {
            title: { display: true, text: '시행 회차', color: '#96baff', font: { weight: 'bold' } },
            grid: { color: 'rgba(255,255,255,0.07)' }, ticks: { color: '#ccc' }
          },
          yScore: {
            type: 'linear', position: 'left', display: showScore,
            title: { display: true, text: '원점수 / 표준점수 합', color: '#6bcb77', font: { weight: 'bold' } },
            min: scoreRange.min, max: scoreRange.max,
            grid: { color: 'rgba(255,255,255,0.07)' }, ticks: { color: '#6bcb77' }
          },
          yGrade: {
            type: 'linear', position: 'right', display: showGrade,
            title: { display: true, text: '등급 합 (낮을수록 ↑)', color: '#ff8e9e', font: { weight: 'bold' } },
            min: gradeRange.min, max: gradeRange.max, reverse: true,
            grid: { drawOnChartArea: false }, ticks: { color: '#ff8e9e', stepSize: 1 }
          }
        },
        plugins: {
          legend: {
            display: true,
            labels: { color: '#ccc', font: { size: 11 }, boxWidth: 22, usePointStyle: true }
          },
          tooltip: {
            backgroundColor: 'rgba(15,23,42,0.95)', titleColor: '#fff', bodyColor: '#ccc',
            borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1
          }
        }
      }
    });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 우리 학교 모의고사 성적 현황 (School Mock Status)
  // ─────────────────────────────────────────────────────────────────────────
  let isSchoolMockInitialized = false;

  async function initSchoolMockStatus() {
    if (isSchoolMockInitialized && compareGlobalData) {
      updateSchoolMockDropdowns();
      renderSchoolMockStatus();
      return;
    }

    // compareGlobalData가 없으면 fetch (initGpaMockCompare 로직 재사용)
    if (!compareGlobalData) {
      const loader = document.getElementById('compareChartLoader');
      if (loader) loader.classList.remove('hidden');
      await initGpaMockCompare();
      if (loader) loader.classList.add('hidden');
    }

    if (compareGlobalData) {
      setupSchoolMockListeners();
      updateSchoolMockDropdowns();
      renderSchoolMockStatus();
      isSchoolMockInitialized = true;
    }
  }

  function setupSchoolMockListeners() {
    // 전체 재렌더 (필터 변경)
    ['schoolMockGrade', 'schoolMockYear', 'schoolMockRound', 'schoolMockInterval'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', () => {
        if (['schoolMockGrade', 'schoolMockYear'].includes(id)) updateSchoolMockDropdowns();
        renderSchoolMockStatus();
      });
    });
    // 표 정렬만 업데이트 (차트 재렌더 불필요)
    ['schoolMockTopCount', 'schoolMockTopSort',
      'topSubj_kor', 'topSubj_math', 'topSubj_eng', 'topSubj_exp1', 'topSubj_exp2'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', renderTopStudentsTable);
      });

    const refreshBtn = document.getElementById('schoolMockRefreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        isCompareInitialized = false;
        const loader = document.getElementById('compareChartLoader');
        if (loader) loader.classList.remove('hidden');
        await initGpaMockCompare();
        if (loader) loader.classList.add('hidden');
        updateSchoolMockDropdowns();
        renderSchoolMockStatus();
      });
    }

    const csatRankCountEl = document.getElementById('csatRankCount');
    if (csatRankCountEl) csatRankCountEl.addEventListener('change', renderCsatRankBody);

    const pdfBtn = document.getElementById('schoolMockPdfBtn');
    if (pdfBtn) pdfBtn.addEventListener('click', downloadMockStatusPDF);
  }

  function updateSchoolMockDropdowns() {
    if (!compareGlobalData) return;

    const gradeSelect = document.getElementById('schoolMockGrade');
    const yearSelect = document.getElementById('schoolMockYear');
    const roundSelect = document.getElementById('schoolMockRound');

    const gradeVal = gradeSelect.value;
    const yearVal = yearSelect.value;
    const roundVal = roundSelect.value;

    // 학년 드롭다운 초기화 (최초 1회)
    if (gradeSelect.options.length <= 1) {
      gradeSelect.innerHTML = '<option value="all">전체 학년</option>';
      const sortedGrades = (compareGlobalData.grades || []).sort((a, b) => b - a);
      sortedGrades.forEach(g => {
        const opt = document.createElement('option');
        opt.value = opt.text = g;
        gradeSelect.appendChild(opt);
      });
      if (sortedGrades.length > 0) {
        gradeSelect.value = sortedGrades[0];
      }
    }

    // 연도 필터링
    const prevYear = yearSelect.value;
    yearSelect.innerHTML = '<option value="all">전체 연도</option>';
    const filteredYears = new Set();
    compareGlobalData.mock.forEach(m => {
      if (gradeVal === 'all' || String(m.grade) === gradeVal) {
        filteredYears.add(m.year);
      }
    });
    Array.from(filteredYears).sort((a, b) => b - a).forEach(y => {
      const opt = document.createElement('option');
      opt.value = opt.text = y;
      if (String(y) === prevYear) opt.selected = true;
      yearSelect.appendChild(opt);
    });

    // 회차 필터링
    const prevRound = roundSelect.value;
    roundSelect.innerHTML = '<option value="all">전체 회차</option>';
    const filteredRounds = new Set();
    compareGlobalData.mock.forEach(m => {
      const matchGrade = gradeVal === 'all' || String(m.grade) === gradeVal;
      const matchYear = yearSelect.value === 'all' || String(m.year) === yearSelect.value;
      if (matchGrade && matchYear) {
        filteredRounds.add(m.round);
      }
    });
    Array.from(filteredRounds).sort().forEach(r => {
      const opt = document.createElement('option');
      opt.value = opt.text = r;
      if (r === prevRound) opt.selected = true;
      roundSelect.appendChild(opt);
    });
  }

  function renderSchoolMockStatus() {
    if (!compareGlobalData || !compareGlobalData.mock) return;

    const gradeVal = document.getElementById('schoolMockGrade').value;
    const yearVal = document.getElementById('schoolMockYear').value;
    const roundVal = document.getElementById('schoolMockRound').value;
    const topCount = parseInt(document.getElementById('schoolMockTopCount').value) || 20;
    const interval = parseInt(document.getElementById('schoolMockInterval').value) || 10;

    // 필터링
    const filtered = compareGlobalData.mock.filter(m => {
      const matchGrade = gradeVal === 'all' || String(m.grade) === gradeVal;
      const matchYear = yearVal === 'all' || String(m.year) === yearVal;
      const matchRound = roundVal === 'all' || String(m.round) === roundVal;
      return matchGrade && matchYear && matchRound;
    });

    if (filtered.length === 0) {
      document.getElementById('schoolMockTopBody').innerHTML = '<tr><td colspan="11" style="text-align:center; padding:2rem; color:var(--text-secondary);">해당 조건의 데이터가 없습니다.</td></tr>';
      document.getElementById('schoolMockDistBody').innerHTML = '';
      document.getElementById('schoolMockAverageBody').innerHTML = '';
      return;
    }

    // 학생별 점수 계산
    const subjects = ['국어', '수학', '영어', '탐구영역1', '탐구영역2'];
    const studentScores = filtered.map(m => {
      let rawSum = 0, stdSum = 0, pctSum = 0, pctCount = 0;
      subjects.forEach(s => {
        const d = m[s] || {};
        rawSum += parseFloat(d.raw || d.원점수) || 0;
        stdSum += parseFloat(d.std || d.표준점수) || 0;
        const pct = parseFloat(d.percentile || d.전국백분위);
        if (!isNaN(pct)) { pctSum += pct; pctCount++; }
      });
      const pctAvg = pctCount > 0 ? pctSum / pctCount : 0;
      return { ...m, rawSum, stdSum, pctAvg };
    });

    _currentStudentScores = studentScores;
    _currentDistInterval = interval;

    renderTopStudentsTable();

    // 분포 계산
    const bins = {};
    studentScores.forEach(s => {
      const binIdx = Math.floor(s.rawSum / interval) * interval;
      bins[binIdx] = (bins[binIdx] || 0) + 1;
    });

    const labels = [];
    const dataPoints = [];
    const distTableData = [];
    let cumulative = 0;

    // Sort keys in descending order for table
    const sortedBins = Object.keys(bins).map(Number).sort((a, b) => b - a);
    sortedBins.forEach(bin => {
      const count = bins[bin];
      cumulative += count;
      const ratio = (count / studentScores.length * 100).toFixed(1);
      const cumRatio = (cumulative / studentScores.length * 100).toFixed(1);

      distTableData.push(`
        <tr>
          <td style="padding: 10px; border: 1px solid var(--panel-border); text-align: center;">${bin} ~ ${bin + interval}</td>
          <td style="padding: 10px; border: 1px solid var(--panel-border); text-align: center; font-weight:700;">${count}</td>
          <td style="padding: 10px; border: 1px solid var(--panel-border); text-align: center;">${ratio}%</td>
          <td style="padding: 10px; border: 1px solid var(--panel-border); text-align: center;">${cumulative}</td>
          <td style="padding: 10px; border: 1px solid var(--panel-border); text-align: center;">${cumRatio}%</td>
        </tr>`);
    });

    // Sort keys in ascending order for chart
    const chartBins = Object.keys(bins).map(Number).sort((a, b) => a - b);
    chartBins.forEach(bin => {
      labels.push(`${bin}~${bin + interval}`);
      dataPoints.push(bins[bin]);
    });

    document.getElementById('schoolMockDistBody').innerHTML = distTableData.join('');
    renderSchoolMockDistChart(labels, dataPoints);

    // 선택과목 비율 및 평균
    renderSchoolMockChoices(studentScores);
    renderSubjDistSection(studentScores);
    renderCsatMinTable(studentScores);
  }

  // ─── 헬퍼: 체크된 과목 목록 반환 ────────────────────────────────
  function getCheckedSubjects() {
    return [
      ['topSubj_kor', '국어'],
      ['topSubj_math', '수학'],
      ['topSubj_eng', '영어'],
      ['topSubj_exp1', '탐구1'],
      ['topSubj_exp2', '탐구2'],
    ].filter(([id]) => {
      const el = document.getElementById(id);
      return el ? el.checked : true; // 엘리먼트 없으면 선택된 것으로 처리
    }).map(([, name]) => name);
  }

  function getSubjRaw(s, key) {
    const domainMap = { '국어': '국어', '수학': '수학', '영어': '영어', '탐구1': '탐구영역1', '탐구2': '탐구영역2' };
    const d = s[domainMap[key]];
    if (!d) return NaN;
    const v = parseFloat(d.raw !== undefined ? d.raw : d.원점수);
    return isNaN(v) ? NaN : v;
  }

  // ─── 성적 우수자 표 독립 렌더 ────────────────────────────────────
  function renderTopStudentsTable() {
    if (!_currentStudentScores.length) return;

    const topCount = parseInt(document.getElementById('schoolMockTopCount')?.value) || 20;
    const sortKey = document.getElementById('schoolMockTopSort')?.value || 'selsum';
    const checked = getCheckedSubjects();
    const allFive = checked.length === 5;

    // 각 학생에 선택합/선택평균 추가
    const withSel = _currentStudentScores.map(s => {
      const vals = checked.map(k => getSubjRaw(s, k)).filter(v => !isNaN(v));
      const selSum = vals.reduce((a, b) => a + b, 0);
      const selAvg = vals.length > 0 ? selSum / vals.length : 0;
      return { ...s, selSum, selAvg };
    });

    const sorted = [...withSel].sort((a, b) => {
      if (sortKey === 'selavg') return b.selAvg - a.selAvg;
      if (sortKey === 'stdsum') return b.stdSum - a.stdSum;
      if (sortKey === 'pctavg') return b.pctAvg - a.pctAvg;
      return b.selSum - a.selSum;
    });
    const topStudents = sorted.slice(0, topCount);

    // 헤더 강조 + 선택합 컬럼명 업데이트
    const selLabel = allFive ? '원점수합' : `선택합(${checked.join('+')})`;
    const thHighlightMap = { selsum: '원점수합', selavg: '원점수합', stdsum: '표점합', pctavg: '백분위평균' };
    const activeThKey = thHighlightMap[sortKey] || '원점수합';

    document.querySelectorAll('#schoolMockTopTable thead th[data-sort-key]').forEach(th => {
      const key = th.dataset.sortKey;
      const label = key === '원점수합' ? selLabel : key;
      const isActive = key === activeThKey;
      const sortMark = isActive ? (sortKey === 'selavg' ? ' (평균▼)' : ' ▼') : '';
      th.textContent = label + sortMark;
      th.style.color = isActive ? 'var(--accent-primary)' : '';
      th.style.fontWeight = isActive ? '700' : '';
    });

    // 행 렌더링
    const td = 'padding: 10px; border: 1px solid var(--panel-border); text-align: center;';
    const hlBg = 'background: rgba(124,131,253,0.1);';
    const colActive = (key) => (key === activeThKey ? hlBg : '');

    let topHtml = '';
    topStudents.forEach((s, i) => {
      const selSumDisplay = allFive ? s.rawSum.toFixed(1) : `${s.selSum.toFixed(1)}<br><small style="color:var(--text-secondary);">평균 ${s.selAvg.toFixed(1)}</small>`;
      topHtml += `<tr>
        <td style="${td}">${i + 1}</td>
        <td style="${td}">${s.grade}-${s.classNum}-${s.studentNum}</td>
        <td style="padding:10px;border:1px solid var(--panel-border);font-weight:700;">${s.name}</td>
        <td style="${td}${colActive('국어')}">${s['국어']?.raw ?? s['국어']?.원점수 ?? '-'}<br><small style="color:var(--text-secondary);">${s['국어']?.subjectName || ''}</small></td>
        <td style="${td}${colActive('수학')}">${s['수학']?.raw ?? s['수학']?.원점수 ?? '-'}<br><small style="color:var(--text-secondary);">${s['수학']?.subjectName || ''}</small></td>
        <td style="${td}${colActive('영어')}">${s['영어']?.raw ?? s['영어']?.원점수 ?? '-'}<br><small style="color:var(--text-secondary);">${s['영어']?.grade ?? s['영어']?.등급 ?? '-'}</small></td>
        <td style="${td}${colActive('탐구1')}">${s['탐구영역1']?.raw ?? s['탐구영역1']?.원점수 ?? '-'}<br><small style="color:var(--text-secondary);">${s['탐구영역1']?.subjectName || ''}</small></td>
        <td style="${td}${colActive('탐구2')}">${s['탐구영역2']?.raw ?? s['탐구영역2']?.원점수 ?? '-'}<br><small style="color:var(--text-secondary);">${s['탐구영역2']?.subjectName || ''}</small></td>
        <td style="${td}font-weight:700;color:var(--clr-h4-pink);${colActive('원점수합')}">${selSumDisplay}</td>
        <td style="${td}font-weight:700;color:var(--clr-h4-blue);${colActive('표점합')}">${s.stdSum.toFixed(1)}</td>
        <td style="${td}font-weight:700;color:var(--accent-primary);${colActive('백분위평균')}">${s.pctAvg.toFixed(1)}</td>
      </tr>`;
    });
    document.getElementById('schoolMockTopBody').innerHTML = topHtml;
  }

  // ─── 모달: 학생 목록 표시 ────────────────────────────────────────
  function showStudentModal(title, students) {
    const modal = document.getElementById('analysisModal');
    const titleEl = document.getElementById('modalTitle');
    const bodyEl = document.getElementById('modalBody');
    if (!modal || !bodyEl) return;

    if (titleEl) titleEl.textContent = title;

    const td = 'padding: 8px; border: 1px solid var(--panel-border); text-align: center;';
    const sorted = [...students].sort((a, b) => (b.rawSum || 0) - (a.rawSum || 0));

    let html = `<p style="color:var(--text-secondary);margin-bottom:0.8rem;font-size:0.88rem;">총 ${sorted.length}명</p>
    <div style="overflow-x:auto;">
    <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
      <thead><tr style="background:rgba(124,131,253,0.1);">
        <th style="${td}">순위</th>
        <th style="${td}">학반번호</th>
        <th style="padding:8px;border:1px solid var(--panel-border);">성명</th>
        <th style="${td}">국어</th>
        <th style="${td}">수학</th>
        <th style="${td}">영어(등급)</th>
        <th style="${td}">탐구1</th>
        <th style="${td}">탐구2</th>
        <th style="${td}">원점수합</th>
        <th style="${td}">백분위평균</th>
      </tr></thead><tbody>`;

    sorted.forEach((s, i) => {
      html += `<tr>
        <td style="${td}">${i + 1}</td>
        <td style="${td}">${s.grade}-${s.classNum}-${s.studentNum}</td>
        <td style="padding:8px;border:1px solid var(--panel-border);font-weight:700;">${s.name}</td>
        <td style="${td}">${s['국어']?.raw ?? s['국어']?.원점수 ?? '-'}<br><small style="color:var(--text-secondary);">${s['국어']?.subjectName || ''}</small></td>
        <td style="${td}">${s['수학']?.raw ?? s['수학']?.원점수 ?? '-'}<br><small style="color:var(--text-secondary);">${s['수학']?.subjectName || ''}</small></td>
        <td style="${td}">${s['영어']?.raw ?? s['영어']?.원점수 ?? '-'}<br><small style="color:var(--text-secondary);">등급 ${s['영어']?.grade ?? s['영어']?.등급 ?? '-'}</small></td>
        <td style="${td}">${s['탐구영역1']?.raw ?? s['탐구영역1']?.원점수 ?? '-'}<br><small style="color:var(--text-secondary);">${s['탐구영역1']?.subjectName || ''}</small></td>
        <td style="${td}">${s['탐구영역2']?.raw ?? s['탐구영역2']?.원점수 ?? '-'}<br><small style="color:var(--text-secondary);">${s['탐구영역2']?.subjectName || ''}</small></td>
        <td style="${td};font-weight:700;color:var(--clr-h4-pink);">${(s.rawSum || 0).toFixed(1)}</td>
        <td style="${td};font-weight:700;color:var(--accent-primary);">${(s.pctAvg || 0).toFixed(1)}</td>
      </tr>`;
    });

    html += `</tbody></table></div>`;
    bodyEl.innerHTML = html;
    modal.classList.remove('hidden');
    modal.style.display = '';
  }

  // ─── 수능 최저학력기준: 조합 탐색 헬퍼 ─────────────────────────
  function _csatCombos(arr, k) {
    if (k === 0) return [[]];
    if (arr.length < k) return [];
    const [h, ...t] = arr;
    return [
      ..._csatCombos(t, k - 1).map(c => [h, ...c]),
      ..._csatCombos(t, k),
    ];
  }

  // 탐구 최대 1과목 제약을 지키는 최소 N합 조합
  function _bestNCombo(s, n) {
    const domainMap = [
      { key: '국어', label: '국어' },
      { key: '수학', label: '수학' },
      { key: '영어', label: '영어' },
      { key: '탐구영역1', isTanku: true },
      { key: '탐구영역2', isTanku: true },
    ];
    const entries = domainMap.map(({ key, label, isTanku }) => {
      const d = s[key] || {};
      const g = parseFloat(d.grade || d.등급);
      const subjName = (d.subjectName || d.과목명 || '').trim() || label || key;
      return { subjName, grade: g, isTanku: !!isTanku };
    }).filter(e => !isNaN(e.grade));

    if (entries.length < n) return null;

    return _csatCombos(entries, n)
      .filter(c => c.filter(e => e.isTanku).length <= 1)
      .reduce((best, c) => {
        const sum = c.reduce((a, e) => a + e.grade, 0);
        return (!best || sum < best.sum) ? { sum, subjects: c } : best;
      }, null);
  }

  // ─── 수능 최저학력기준 충족 현황 ──────────────────────────────────
  function renderCsatMinTable(studentScores) {
    const tbody = document.getElementById('csatMinBody');
    if (!tbody) return;

    _csatMinData = {};
    const thresholds = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    const nList = [2, 3, 4];

    // 학생별 best 조합 계산
    const studentBest = studentScores.map(s => {
      const bests = {};
      nList.forEach(n => { bests[n] = _bestNCombo(s, n); });
      return { student: s, bests };
    });

    // 각 학생을 정확한 등급합 컬럼에만 배치 (sum === m)
    nList.forEach(n => {
      thresholds.forEach(m => {
        const key = `${n}_${m}`;
        _csatMinData[key] = studentBest
          .filter(({ bests }) => bests[n] && bests[n].sum === m)
          .map(({ student, bests }) => ({ student, subjects: bests[n].subjects, sum: bests[n].sum }));
      });
    });

    const thStyle = 'padding: 10px; border: 1px solid var(--panel-border); text-align: center;';
    const tdBase = 'padding: 10px 8px; border: 1px solid var(--panel-border); text-align: center;';
    const rowLabels = { 2: '2합', 3: '3합', 4: '4합' };

    let html = '';
    nList.forEach(n => {
      html += `<tr><td style="${thStyle}font-weight:700;color:var(--accent-primary);white-space:nowrap;">${rowLabels[n]}</td>`;
      thresholds.forEach(m => {
        const key = `${n}_${m}`;
        const count = (_csatMinData[key] || []).length;
        if (count > 0) {
          html += `<td style="${tdBase}font-weight:600;cursor:pointer;color:var(--text-primary);transition:background 0.15s;" data-csat-key="${key}"
            onmouseover="this.style.background='rgba(124,131,253,0.15)'" onmouseout="this.style.background=''">${count}</td>`;
        } else {
          html += `<td style="${tdBase}color:var(--text-secondary);">-</td>`;
        }
      });
      html += '</tr>';
    });
    tbody.innerHTML = html;

    tbody.querySelectorAll('td[data-csat-key]').forEach(cell => {
      cell.addEventListener('click', () => {
        const key = cell.dataset.csatKey;
        const [n, m] = key.split('_');
        const entries = _csatMinData[key] || [];
        showCsatMinModal(`${n}합 = ${m} 학생 (${entries.length}명)`, entries);
      });
    });

    _csatStudentBest = [...studentBest].sort((a, b) => (b.student.rawSum || 0) - (a.student.rawSum || 0));
    renderCsatRankBody();
  }

  function renderCsatRankBody() {
    const rankBody = document.getElementById('csatRankBody');
    if (!rankBody || !_csatStudentBest.length) return;

    const count = Math.max(1, parseInt(document.getElementById('csatRankCount')?.value) || 30);
    const slice = _csatStudentBest.slice(0, count);

    const tdR = 'padding: 8px 10px; border: 1px solid var(--panel-border); text-align: center; vertical-align: middle;';
    const makeRankCell = (b) => {
      if (!b) return `<td style="${tdR}color:var(--text-secondary);">-</td>`;
      const subjStr = b.subjects.map(sub => `${sub.subjName}(${sub.grade})`).join('+');
      return `<td style="${tdR}">
        <span style="font-weight:700;color:var(--accent-primary);">${b.sum}</span>
        <br><small style="color:var(--text-secondary);font-size:0.75em;word-break:keep-all;">${subjStr}</small>
      </td>`;
    };

    let rankHtml = '';
    slice.forEach(({ student: s, bests }, i) => {
      // data-rank-idx는 _csatStudentBest 전체 배열 기준 인덱스
      const globalIdx = _csatStudentBest.indexOf(_csatStudentBest.find(e => e.student === s));
      rankHtml += `<tr data-rank-idx="${globalIdx}" style="cursor:pointer;transition:background 0.15s;"
        onmouseover="this.style.background='rgba(124,131,253,0.08)'" onmouseout="this.style.background=''">
        <td style="${tdR}">${i + 1}</td>
        <td style="${tdR}">${s.grade}-${s.classNum}-${s.studentNum}</td>
        <td style="padding:8px 10px;border:1px solid var(--panel-border);font-weight:700;color:var(--accent-primary);">${s.name}</td>
        ${makeRankCell(bests[2])}${makeRankCell(bests[3])}${makeRankCell(bests[4])}
      </tr>`;
    });
    rankBody.innerHTML = rankHtml;

    // 이벤트 위임 — innerHTML 재설정 후에도 tbody 자체는 유지되므로 한 번만 등록
    if (!rankBody._csatClickAttached) {
      rankBody._csatClickAttached = true;
      rankBody.addEventListener('click', e => {
        const tr = e.target.closest('tr[data-rank-idx]');
        if (!tr) return;
        const idx = parseInt(tr.dataset.rankIdx);
        const entry = _csatStudentBest[idx];
        if (entry) showStudentScoreModal(entry.student, entry.bests);
      });
    }
  }

  function showStudentScoreModal(s, bests) {
    const modal = document.getElementById('analysisModal');
    const titleEl = document.getElementById('modalTitle');
    const bodyEl = document.getElementById('modalBody');
    if (!modal || !bodyEl) return;
    if (titleEl) titleEl.textContent = `${s.name} (${s.grade}학년 ${s.classNum}반 ${s.studentNum}번) 모의고사 성적`;

    const td = 'padding: 8px 10px; border: 1px solid var(--panel-border); text-align: center;';

    const domainRows = [
      { key: '국어', label: '국어', color: '#5b8dee' },
      { key: '수학', label: '수학', color: '#ff6b6b' },
      { key: '영어', label: '영어', color: '#2ecc71' },
      { key: '한국사', label: '한국사', color: '#95a5a6' },
      { key: '탐구영역1', label: '탐구1', color: '#f39c12' },
      { key: '탐구영역2', label: '탐구2', color: '#e056fd' },
    ];

    let subjectRows = '';
    domainRows.forEach(({ key, label, color }) => {
      const d = s[key] || {};
      const subjName = (d.subjectName || d.과목명 || '').trim();
      const raw = d.raw ?? d.원점수 ?? '-';
      const std = d.std ?? d.표준점수 ?? '-';
      const pct = d.percentile ?? d.전국백분위 ?? '-';
      const grade = d.grade ?? d.등급 ?? '-';
      if (!subjName && raw === '-') return;
      subjectRows += `<tr>
        <td style="${td}font-weight:700;color:${color};">${label}</td>
        <td style="${td}color:var(--text-secondary);font-size:0.85em;">${subjName || '-'}</td>
        <td style="${td}font-weight:700;">${raw}</td>
        <td style="${td}">${std}</td>
        <td style="${td}">${pct}</td>
        <td style="${td}font-weight:700;color:var(--accent-primary);">${grade}</td>
      </tr>`;
    });

    let bestRows = '';
    [2, 3, 4].forEach(n => {
      const b = bests[n];
      if (!b) return;
      const subjStr = b.subjects.map(sub => `${sub.subjName}(${sub.grade}등급)`).join(' + ');
      bestRows += `<tr>
        <td style="${td}font-weight:700;">${n}합</td>
        <td style="${td}font-weight:700;color:var(--accent-primary);font-size:1.05em;">${b.sum}</td>
        <td style="padding:8px 10px;border:1px solid var(--panel-border);">${subjStr}</td>
      </tr>`;
    });

    bodyEl.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:1.2rem;">
        <div>
          <h4 style="margin:0 0 0.6rem;font-size:0.9rem;color:var(--accent-primary);">📋 과목별 성적</h4>
          <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
              <thead><tr style="background:rgba(124,131,253,0.1);">
                <th style="${td}">영역</th>
                <th style="${td}">선택과목</th>
                <th style="${td}">원점수</th>
                <th style="${td}">표준점수</th>
                <th style="${td}">백분위</th>
                <th style="${td}">등급</th>
              </tr></thead>
              <tbody>${subjectRows}</tbody>
              <tfoot><tr style="background:rgba(124,131,253,0.06);">
                <td style="${td}font-weight:700;" colspan="2">합계 / 평균</td>
                <td style="${td}font-weight:700;color:var(--clr-h4-pink);">${(s.rawSum || 0).toFixed(1)}</td>
                <td style="${td}font-weight:700;color:var(--clr-h4-blue);">${(s.stdSum || 0).toFixed(1)}</td>
                <td style="${td}font-weight:700;color:var(--accent-primary);">${(s.pctAvg || 0).toFixed(1)}</td>
                <td style="${td}">-</td>
              </tr></tfoot>
            </table>
          </div>
        </div>
        <div>
          <h4 style="margin:0 0 0.6rem;font-size:0.9rem;color:var(--accent-primary);">📊 수능 최저 등급합</h4>
          <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
            <thead><tr style="background:rgba(124,131,253,0.1);">
              <th style="${td}">구분</th>
              <th style="${td}">등급합</th>
              <th style="padding:8px 10px;border:1px solid var(--panel-border);">과목 조합</th>
            </tr></thead>
            <tbody>${bestRows}</tbody>
          </table>
        </div>
      </div>`;

    modal.classList.remove('hidden');
    modal.style.display = '';
  }

  function showCsatMinModal(title, entries) {
    const modal = document.getElementById('analysisModal');
    const titleEl = document.getElementById('modalTitle');
    const bodyEl = document.getElementById('modalBody');
    if (!modal || !bodyEl) return;
    if (titleEl) titleEl.textContent = title;

    const td = 'padding: 8px; border: 1px solid var(--panel-border); text-align: center;';
    const sorted = [...entries].sort((a, b) => a.sum - b.sum
      || a.student.grade - b.student.grade
      || a.student.classNum - b.student.classNum
      || a.student.studentNum - b.student.studentNum);

    let html = `<p style="color:var(--text-secondary);margin-bottom:0.8rem;font-size:0.88rem;">총 ${sorted.length}명</p>
    <div style="overflow-x:auto;">
    <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
      <thead><tr style="background:rgba(124,131,253,0.1);">
        <th style="${td}">순위</th>
        <th style="${td}">학반번호</th>
        <th style="padding:8px;border:1px solid var(--panel-border);">성명</th>
        <th style="padding:8px;border:1px solid var(--panel-border);">충족 과목 (등급)</th>
        <th style="${td}">등급합</th>
      </tr></thead><tbody>`;

    sorted.forEach((e, i) => {
      const s = e.student;
      const subjStr = e.subjects
        .map(sub => `${sub.subjName}<span style="color:var(--text-secondary);font-size:0.8em;">(${sub.grade})</span>`)
        .join(' + ');
      html += `<tr>
        <td style="${td}">${i + 1}</td>
        <td style="${td}">${s.grade}-${s.classNum}-${s.studentNum}</td>
        <td style="padding:8px;border:1px solid var(--panel-border);font-weight:700;">${s.name}</td>
        <td style="padding:8px;border:1px solid var(--panel-border);">${subjStr}</td>
        <td style="${td}font-weight:700;color:var(--accent-primary);">${e.sum}</td>
      </tr>`;
    });

    html += `</tbody></table></div>`;
    bodyEl.innerHTML = html;
    modal.classList.remove('hidden');
    modal.style.display = '';
  }

  // ─── 우리학교 모의고사 성적 현황 PDF 다운로드 ────────────────────
  function downloadMockStatusPDF() {
    if (!_currentStudentScores.length) {
      alert('먼저 데이터를 불러오세요.');
      return;
    }

    const gradeEl = document.getElementById('schoolMockGrade');
    const yearEl = document.getElementById('schoolMockYear');
    const roundEl = document.getElementById('schoolMockRound');
    const gradeText = gradeEl?.options[gradeEl.selectedIndex]?.text || '전체';
    const yearText = yearEl?.options[yearEl.selectedIndex]?.text || '전체';
    const roundText = roundEl?.options[roundEl.selectedIndex]?.text || '전체';

    // ── 차트 이미지 캡처 ──
    const distImg = document.getElementById('schoolMockDistChart')?.toDataURL('image/png') || '';
    const korChoiceImg = document.getElementById('schoolMockKorChoiceChart')?.toDataURL('image/png') || '';
    const mathChoiceImg = document.getElementById('schoolMockMathChoiceChart')?.toDataURL('image/png') || '';
    const socialChoiceImg = document.getElementById('schoolMockSocialChoiceChart')?.toDataURL('image/png') || '';
    const scienceChoiceImg = document.getElementById('schoolMockScienceChoiceChart')?.toDataURL('image/png') || '';

    // 과목별 분포도: 현재 그리드에 있는 모든 차트 캡처
    const typeEl = document.getElementById('subjDistTypeSelect');
    const typeLabel = typeEl?.options[typeEl.selectedIndex]?.text || '';
    const subjDistImgs = Object.entries(_subjDistCharts)
      .map(([name, chart]) => ({
        name,
        domain: _subjDistData[name]?.domain || '',
        count: (_subjDistData[name]?.grade || _subjDistData[name]?.raw || []).length,
        img: chart?.canvas?.toDataURL('image/png') || ''
      }))
      .filter(e => e.img);

    // ── 테이블 HTML 수집 ──
    const topThead = document.querySelector('#schoolMockTopTable thead')?.innerHTML || '';
    const topTbody = document.getElementById('schoolMockTopBody')?.innerHTML || '';
    const distRows = document.getElementById('schoolMockDistBody')?.innerHTML || '';
    const korAvgRows = document.getElementById('schoolMockKorAvgBody')?.innerHTML || '';
    const mathAvgRows = document.getElementById('schoolMockMathAvgBody')?.innerHTML || '';
    const socialAvgRows = document.getElementById('schoolMockSocialAvgBody')?.innerHTML || '';
    const scienceAvgRows = document.getElementById('schoolMockScienceAvgBody')?.innerHTML || '';
    const etcAvgRows = document.getElementById('schoolMockAverageBody')?.innerHTML || '';
    const csatMinRows = document.getElementById('csatMinBody')?.innerHTML || '';
    const csatRankRows = document.getElementById('csatRankBody')?.innerHTML || '';

    // ── 공통 헬퍼 ──
    const avgThead = `<tr style="background:#eef0ff;">
      <th>선택과목</th><th>인원</th><th>선택비율</th><th>평균 원점수</th><th>평균 백분위</th><th>평균 등급</th>
    </tr>`;

    const makePieSection = (title, imgSrc, avgRows) => {
      if (!avgRows) return '';
      return `<div class="two-col" style="display:grid;grid-template-columns:160px 1fr;gap:12px;align-items:start;margin-bottom:16px;">
        <div>
          <div class="sub-title">${title}</div>
          ${imgSrc ? `<img class="pie-img" src="${imgSrc}">` : ''}
        </div>
        <table><thead>${avgThead}</thead><tbody>${avgRows}</tbody></table>
      </div>`;
    };

    const subjGrid = subjDistImgs.length ? `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
        ${subjDistImgs.map(e => `
          <div style="border:1px solid #ddd;border-radius:6px;padding:6px;">
            <div style="display:flex;justify-content:space-between;font-size:9px;margin-bottom:4px;">
              <strong>${e.name}</strong>
              <span style="color:#888;">${e.domain}</span>
            </div>
            <img src="${e.img}" style="width:100%;height:130px;object-fit:contain;">
          </div>`).join('')}
      </div>` : '<p style="color:#999;">데이터 없음</p>';

    const html = `<!DOCTYPE html><html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>우리학교 모의고사 성적 현황</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    :root {
      --panel-border: #bbb;
      --accent-primary: #4a5dcc;
      --text-primary: #111;
      --text-secondary: #666;
      --clr-h4-pink: #d946b0;
      --clr-h4-blue: #2563eb;
    }
    body { font-family: 'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif; font-size: 11px; color: #111; padding: 20px; background: #fff; }
    h1 { font-size: 18px; text-align: center; margin: 0 0 3px; }
    .subtitle { text-align: center; color: #555; margin: 0 0 18px; font-size: 10px; }
    h2 { font-size: 13px; margin: 18px 0 7px; border-left: 4px solid #4a5dcc; padding-left: 7px; color: #1e2a6e; page-break-before: auto; }
    .sub-title { font-size: 11px; font-weight: 700; text-align: center; margin-bottom: 5px; color: #333; }
    table { width: 100%; border-collapse: collapse; font-size: 9.5px; margin-bottom: 6px; }
    th { padding: 6px 5px; border: 1px solid #bbb; text-align: center; background: #eef0ff; font-weight: 700; }
    td { padding: 5px; border: 1px solid #ccc; text-align: center; }
    img.chart-img { max-width: 100%; height: 190px; object-fit: contain; display: block; }
    img.pie-img { width: 100%; height: 140px; object-fit: contain; display: block; }
    small { font-size: 0.82em; color: #666; }
    .section { margin-bottom: 16px; }
    @media print { body { padding: 10px; } }
  </style>
</head>
<body>
  <h1>🏫 우리학교 모의고사 성적 현황</h1>
  <p class="subtitle">${gradeText} / ${yearText} / ${roundText} &nbsp;|&nbsp; 출력일: ${new Date().toLocaleDateString('ko-KR')}</p>

  <div class="section">
    <h2>📊 성적 우수자 현황</h2>
    <div style="overflow-x:auto;">
      <table><thead>${topThead}</thead><tbody>${topTbody}</tbody></table>
    </div>
  </div>

  <div class="section">
    <h2>📝 급간별 인원 통계</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start;">
      <div>
        ${distImg ? `<img class="chart-img" src="${distImg}">` : ''}
      </div>
      <table>
        <thead><tr style="background:#eef0ff;">
          <th>급간(원점수)</th><th>인원</th><th>비율</th><th>누적인원</th><th>누적비율</th>
        </tr></thead>
        <tbody>${distRows}</tbody>
      </table>
    </div>
  </div>

  <div class="section">
    <h2>🎯 선택과목 및 평균 분석</h2>
    ${makePieSection('국어 선택 비율', korChoiceImg, korAvgRows)}
    ${makePieSection('수학 선택 비율', mathChoiceImg, mathAvgRows)}
    ${makePieSection('사회탐구 선택 비율', socialChoiceImg, socialAvgRows)}
    ${makePieSection('과학탐구 선택 비율', scienceChoiceImg, scienceAvgRows)}
    ${etcAvgRows ? `<table><thead><tr style="background:#eef0ff;">
      <th>영역</th><th>과목</th><th>인원</th><th>선택비율</th><th>평균 원점수</th><th>평균 백분위</th><th>평균 등급</th>
    </tr></thead><tbody>${etcAvgRows}</tbody></table>` : ''}
  </div>

  <div class="section">
    <h2>📊 과목별 분포도 (${typeLabel})</h2>
    ${subjGrid}
  </div>

  <div class="section">
    <h2>📋 수능 최저학력기준 충족 현황</h2>
    <p style="font-size:9px;color:#666;margin:0 0 4px;">국어·수학·영어·탐구(1과목) 중 최저 등급합 — 각 셀은 정확히 해당 등급합을 가진 학생 수</p>
    <table>
      <thead><tr>
        <th>구분</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th><th>8</th>
        <th>9</th><th>10</th><th>11</th><th>12</th><th>13</th><th>14</th><th>15</th>
      </tr></thead>
      <tbody>${csatMinRows}</tbody>
    </table>
  </div>

  <div class="section">
    <h2>📋 전교 석차별 수능 최저 등급합</h2>
    <table>
      <thead><tr>
        <th>전교순위</th><th>학반번호</th><th>성명</th><th>2합</th><th>3합</th><th>4합</th>
      </tr></thead>
      <tbody>${csatRankRows}</tbody>
    </table>
  </div>
</body>
</html>`;

    printWithIframe(html);
  }

  function renderSchoolMockDistChart(labels, data) {
    const ctx = document.getElementById('schoolMockDistChart').getContext('2d');
    if (schoolMockDistChart) schoolMockDistChart.destroy();

    schoolMockDistChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: '인원 수',
          data: data,
          backgroundColor: 'rgba(124, 131, 253, 0.6)',
          borderColor: 'rgba(124, 131, 253, 1)',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (evt, elements) => {
          if (!elements.length) return;
          const label = schoolMockDistChart.data.labels[elements[0].index]; // e.g. "200~210"
          const [loStr, hiStr] = label.split('~');
          const lo = parseFloat(loStr), hi = parseFloat(hiStr);
          const matched = _currentStudentScores.filter(s => s.rawSum >= lo && s.rawSum < hi);
          showStudentModal(`원점수 합 ${label} 구간 학생`, matched);
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#ccc', font: { size: 10 } } },
          y: {
            beginAtZero: true,
            ticks: { color: '#ccc', stepSize: 1 },
            grid: { color: 'rgba(255,255,255,0.05)' }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            callbacks: {
              label: (c) => ` 👥 ${c.raw}명`
            }
          }
        }
      }
    });
  }

  const SOCIAL_SUBJECTS = new Set(['생활과윤리', '윤리와사상', '한국지리', '세계지리', '동아시아사', '세계사', '정치와법', '경제', '사회문화']);
  // 로마숫자 Ⅰ/Ⅱ와 라틴 I/II 둘 다 허용
  const SCIENCE_SUBJECTS = new Set([
    '물리학Ⅰ', '물리학Ⅱ', '화학Ⅰ', '화학Ⅱ', '생명과학Ⅰ', '생명과학Ⅱ', '지구과학Ⅰ', '지구과학Ⅱ',
    '물리학I', '물리학II', '화학I', '화학II', '생명과학I', '생명과학II', '지구과학I', '지구과학II'
  ]);
  // 과목명 표기 정규화: 라틴 I/II → 로마숫자 Ⅰ/Ⅱ (출력용)
  function normSubjName(s) {
    return String(s || '').trim()
      .replace(/II$/, 'Ⅱ').replace(/I$/, 'Ⅰ')
      .replace(/II(\s)/g, 'Ⅱ$1').replace(/I(\s)/g, 'Ⅰ$1');
  }

  function renderSchoolMockChoices(studentScores) {
    const korChoices = {};
    const mathChoices = {};
    const socialChoices = {};
    const scienceChoices = {};
    const averages = {};

    studentScores.forEach(s => {
      ['국어', '수학', '영어', '한국사', '탐구영역1', '탐구영역2'].forEach(domain => {
        const d = s[domain] || {};
        const rawName = d.subjectName || (domain === '영어' ? '영어' : domain === '한국사' ? '한국사' : '');
        if (!rawName) return;
        const subjName = normSubjName(rawName);

        // 선택 비율 집계 (파이차트용)
        if (domain === '국어') {
          korChoices[subjName] = (korChoices[subjName] || 0) + 1;
        } else if (domain === '수학') {
          mathChoices[subjName] = (mathChoices[subjName] || 0) + 1;
        } else if (domain.startsWith('탐구')) {
          if (SOCIAL_SUBJECTS.has(subjName)) {
            socialChoices[subjName] = (socialChoices[subjName] || 0) + 1;
          } else if (SCIENCE_SUBJECTS.has(rawName.trim()) || SCIENCE_SUBJECTS.has(subjName)) {
            scienceChoices[subjName] = (scienceChoices[subjName] || 0) + 1;
          }
        }

        // 평균 집계 — 탐구는 사회/과학 구분, 탐구영역1/2 구분 없이 과목명 기준 합산
        let domainLabel;
        if (domain.startsWith('탐구')) {
          domainLabel = SOCIAL_SUBJECTS.has(subjName) ? '사회탐구'
            : (SCIENCE_SUBJECTS.has(rawName.trim()) || SCIENCE_SUBJECTS.has(subjName)) ? '과학탐구'
              : '탐구';
        } else {
          domainLabel = domain;
        }
        if (!averages[subjName]) averages[subjName] = { raw: 0, pct: 0, pctCount: 0, grade: 0, gradeCount: 0, count: 0, domain: domainLabel };
        averages[subjName].raw += parseFloat(d.raw || d.원점수) || 0;
        const pct = parseFloat(d.percentile || d.전국백분위);
        if (!isNaN(pct)) { averages[subjName].pct += pct; averages[subjName].pctCount++; }
        const grade = parseFloat(d.grade || d.등급);
        if (!isNaN(grade)) { averages[subjName].grade += grade; averages[subjName].gradeCount++; }
        averages[subjName].count += 1;
      });
    });

    renderChoicePieChart('schoolMockKorChoiceChart', 'schoolMockKorChoiceChart', korChoices,
      ['#5b8dee', '#4ecdc4']);
    renderChoicePieChart('schoolMockMathChoiceChart', 'schoolMockMathChoiceChart', mathChoices,
      ['#ff6b6b', '#7c83fd', '#ffd93d']);
    renderChoicePieChart('schoolMockSocialChoiceChart', 'schoolMockSocialChoiceChart', socialChoices,
      ['#ff8fab', '#ffb3c6', '#ffd93d', '#ff9f1c', '#c77dff', '#e0aaff', '#96baff', '#4ecdc4', '#6bcb77']);
    renderChoicePieChart('schoolMockScienceChoiceChart', 'schoolMockScienceChoiceChart', scienceChoices,
      ['#5b8dee', '#3a6bc7', '#7c83fd', '#5258d0', '#4ecdc4', '#2ea89f', '#6bcb77', '#43a85a']);

    // 도메인별 테이블 렌더링
    const domainTableMap = {
      '국어': 'schoolMockKorAvgBody',
      '수학': 'schoolMockMathAvgBody',
      '사회탐구': 'schoolMockSocialAvgBody',
      '과학탐구': 'schoolMockScienceAvgBody',
    };
    const domainHtml = { '국어': '', '수학': '', '사회탐구': '', '과학탐구': '', '_etc': '' };

    Object.entries(averages).sort((a, b) => (String(a[0]) || '').localeCompare(String(b[0]) || '')).forEach(([name, data]) => {
      const rawAvg = data.count > 0 ? (data.raw / data.count).toFixed(1) : '-';
      const pctAvg = data.pctCount > 0 ? (data.pct / data.pctCount).toFixed(1) : '-';
      const gradeAvg = data.gradeCount > 0 ? (data.grade / data.gradeCount).toFixed(2) : '-';
      const ratio = (data.count / studentScores.length * 100).toFixed(1);

      const row = `<tr>
        <td style="padding:8px;border:1px solid var(--panel-border);font-weight:700;">${name}</td>
        <td style="padding:8px;border:1px solid var(--panel-border);">${data.count}</td>
        <td style="padding:8px;border:1px solid var(--panel-border);">${ratio}%</td>
        <td style="padding:8px;border:1px solid var(--panel-border);color:var(--clr-h4-pink);font-weight:700;">${rawAvg}</td>
        <td style="padding:8px;border:1px solid var(--panel-border);color:var(--accent-primary);font-weight:700;">${pctAvg}</td>
        <td style="padding:8px;border:1px solid var(--panel-border);color:var(--clr-h4-blue);font-weight:700;">${gradeAvg}</td>
      </tr>`;

      if (domainHtml[data.domain] !== undefined) {
        domainHtml[data.domain] += row;
      } else {
        domainHtml['_etc'] += `<tr>
          <td style="padding:8px;border:1px solid var(--panel-border);color:var(--text-secondary);">${data.domain}</td>
          <td style="padding:8px;border:1px solid var(--panel-border);font-weight:700;">${name}</td>
          <td style="padding:8px;border:1px solid var(--panel-border);">${data.count}</td>
          <td style="padding:8px;border:1px solid var(--panel-border);">${ratio}%</td>
          <td style="padding:8px;border:1px solid var(--panel-border);color:var(--clr-h4-pink);font-weight:700;">${rawAvg}</td>
          <td style="padding:8px;border:1px solid var(--panel-border);color:var(--accent-primary);font-weight:700;">${pctAvg}</td>
          <td style="padding:8px;border:1px solid var(--panel-border);color:var(--clr-h4-blue);font-weight:700;">${gradeAvg}</td>
        </tr>`;
      }
    });

    Object.entries(domainTableMap).forEach(([domain, tbodyId]) => {
      const el = document.getElementById(tbodyId);
      if (el) el.innerHTML = domainHtml[domain] || '<tr><td colspan="6" style="padding:12px;text-align:center;color:var(--text-secondary);">데이터 없음</td></tr>';
    });
    // 영어/한국사 등 기타 도메인은 하단 통합 테이블에
    const etcEl = document.getElementById('schoolMockAverageBody');
    if (etcEl) etcEl.innerHTML = domainHtml['_etc'];
  }

  let _subjDistData = {};
  let _subjDistCharts = {};
  let _subjDistListenersAttached = false;

  function renderSubjDistSection(studentScores) {
    _subjDistData = {};

    studentScores.forEach(s => {
      ['국어', '수학', '영어', '한국사', '탐구영역1', '탐구영역2'].forEach(domain => {
        const d = s[domain] || {};
        const rawName = d.subjectName || (domain === '영어' ? '영어' : domain === '한국사' ? '한국사' : '');
        if (!rawName) return;
        const subjName = normSubjName(rawName);

        let domainLabel;
        if (domain.startsWith('탐구')) {
          domainLabel = SOCIAL_SUBJECTS.has(subjName) ? '사회탐구'
            : (SCIENCE_SUBJECTS.has(rawName.trim()) || SCIENCE_SUBJECTS.has(subjName)) ? '과학탐구'
              : '탐구';
        } else {
          domainLabel = domain;
        }

        if (!_subjDistData[subjName]) _subjDistData[subjName] = { domain: domainLabel, grade: [], raw: [], std: [], pct: [], students: [] };
        const grade = parseFloat(d.grade || d.등급);
        const raw = parseFloat(d.raw || d.원점수);
        const std = parseFloat(d.std || d.표준점수);
        const pct = parseFloat(d.percentile || d.전국백분위);
        if (!isNaN(grade)) _subjDistData[subjName].grade.push(grade);
        if (!isNaN(raw)) _subjDistData[subjName].raw.push(raw);
        if (!isNaN(std)) _subjDistData[subjName].std.push(std);
        if (!isNaN(pct)) _subjDistData[subjName].pct.push(pct);
        _subjDistData[subjName].students.push({ student: s, grade, raw, std, pct });
      });
    });

    if (!_subjDistListenersAttached) {
      _subjDistListenersAttached = true;
      const typeSelect = document.getElementById('subjDistTypeSelect');
      if (typeSelect) typeSelect.addEventListener('change', renderAllSubjDistCharts);
    }

    renderAllSubjDistCharts();
  }

  function _getSubjDistChartData(subjName, type) {
    const data = _subjDistData[subjName];
    if (!data) return null;

    let values;
    if (type === 'grade') values = data.grade;
    else if (type.startsWith('raw')) values = data.raw;
    else if (type.startsWith('std')) values = data.std;
    else values = data.pct;
    if (!values.length) return null;

    let labels, counts, bucketLos, step;

    if (type === 'grade') {
      labels = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
      counts = new Array(9).fill(0);
      values.forEach(v => { const i = Math.round(v) - 1; if (i >= 0 && i <= 8) counts[i]++; });
      bucketLos = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      step = 1;
    } else {
      step = (type === 'raw20' || type === 'std20' || type === 'pct20') ? 20 : 10;
      const useFixed = !type.startsWith('std');
      const lo0 = useFixed ? 0 : Math.floor(Math.min(...values) / step) * step;
      let hi0 = useFixed ? 100 : Math.ceil(Math.max(...values) / step) * step;
      if (hi0 <= lo0) hi0 = lo0 + step;
      const n = Math.ceil((hi0 - lo0) / step);
      labels = []; counts = new Array(n).fill(0); bucketLos = [];
      for (let i = 0; i < n; i++) {
        const lo = lo0 + i * step;
        labels.push(i < n - 1 ? `${lo}~${lo + step - 1}` : `${lo}~${hi0}`);
        bucketLos.push(lo);
      }
      values.forEach(v => {
        const i = Math.floor((v - lo0) / step);
        counts[Math.max(0, Math.min(i, n - 1))]++;
      });
    }
    return { labels, counts, bucketLos, step };
  }

  function renderAllSubjDistCharts() {
    const typeSelect = document.getElementById('subjDistTypeSelect');
    const grid = document.getElementById('subjDistGrid');
    if (!typeSelect || !grid) return;

    const type = typeSelect.value;

    // 기존 차트 모두 파기
    Object.values(_subjDistCharts).forEach(ch => ch && ch.destroy());
    _subjDistCharts = {};
    grid.innerHTML = '';

    const domainOrder = ['국어', '수학', '영어', '한국사', '사회탐구', '과학탐구', '탐구'];
    const gradeColors = ['#e74c3c', '#e67e22', '#f39c12', '#2ecc71', '#27ae60', '#3498db', '#8e44ad', '#95a5a6', '#7f8c8d'];

    // 도메인 순서대로 정렬된 과목 목록
    const sortedSubjects = [];
    domainOrder.forEach(domain => {
      Object.entries(_subjDistData)
        .filter(([, d]) => d.domain === domain)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([name]) => sortedSubjects.push({ name, domain }));
    });

    sortedSubjects.forEach(({ name: subj, domain }) => {
      const chartData = _getSubjDistChartData(subj, type);
      if (!chartData) return;
      const { labels, counts, bucketLos, step } = chartData;

      // 카드 생성
      const card = document.createElement('div');
      card.style.cssText = 'background:rgba(255,255,255,0.04);border:1px solid var(--panel-border);border-radius:10px;padding:0.7rem;display:flex;flex-direction:column;gap:0.4rem;';

      const titleRow = document.createElement('div');
      titleRow.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline;';
      titleRow.innerHTML = `
        <span style="font-weight:700;font-size:0.85rem;color:var(--text-primary);">${subj}</span>
        <span style="font-size:0.72rem;color:var(--text-secondary);">${domain} · ${counts.reduce((a, b) => a + b, 0)}명</span>`;

      const wrap = document.createElement('div');
      wrap.style.cssText = 'height:175px;position:relative;';
      const canvas = document.createElement('canvas');
      wrap.appendChild(canvas);

      card.appendChild(titleRow);
      card.appendChild(wrap);
      grid.appendChild(card);

      const chart = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            data: counts,
            backgroundColor: type === 'grade' ? gradeColors : counts.map(() => '#5b8dee'),
            borderRadius: 4,
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          onClick: (evt, elements) => {
            if (!elements.length) return;
            const idx = elements[0].index;
            const lbl = labels[idx];
            const subjData = _subjDistData[subj];
            if (!subjData) return;
            const matched = subjData.students.filter(({ grade, raw, std, pct }) => {
              let val;
              if (type === 'grade') val = grade;
              else if (type.startsWith('raw')) val = raw;
              else if (type.startsWith('std')) val = std;
              else val = pct;
              if (isNaN(val)) return false;
              if (type === 'grade') return Math.round(val) === idx + 1;
              const lo = bucketLos[idx];
              return val >= lo && val < lo + step + (idx === labels.length - 1 ? 1 : 0);
            }).map(e => e.student);
            showStudentModal(`${subj} — ${lbl} 해당 학생`, matched);
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(15,23,42,0.9)',
              callbacks: {
                title: (items) => `${subj} — ${items[0].label}`,
                label: (c) => ` ${c.raw}명`
              }
            }
          },
          scales: {
            x: { ticks: { color: '#aaa', font: { size: 9 }, maxRotation: 45 }, grid: { display: false } },
            y: { beginAtZero: true, ticks: { color: '#aaa', font: { size: 9 }, stepSize: 1, precision: 0 }, grid: { color: 'rgba(255,255,255,0.05)' } }
          }
        }
      });
      _subjDistCharts[subj] = chart;
    });
  }

  const _choiceChartInstances = {};

  function renderChoicePieChart(chartKey, canvasId, choiceMap, bgColors) {
    if (_choiceChartInstances[chartKey]) {
      _choiceChartInstances[chartKey].destroy();
      _choiceChartInstances[chartKey] = null;
    }
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const sorted = Object.entries(choiceMap).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return;
    const labels = sorted.map(e => e[0]);
    const data = sorted.map(e => e[1]);
    const total = data.reduce((a, b) => a + b, 0);

    _choiceChartInstances[chartKey] = new Chart(canvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data, backgroundColor: bgColors, borderWidth: 0, hoverOffset: 12 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '55%',
        onClick: (evt, elements) => {
          if (!elements.length) return;
          const clickedSubj = labels[elements[0].index];
          const matched = _currentStudentScores.filter(s =>
            ['국어', '수학', '탐구영역1', '탐구영역2'].some(domain => {
              const d = s[domain] || {};
              return normSubjName(d.subjectName || '') === clickedSubj;
            })
          );
          showStudentModal(`${clickedSubj} 선택 학생`, matched);
        },
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#ccc',
              font: { size: 10 },
              boxWidth: 10,
              generateLabels: (chart) => {
                const ds = chart.data.datasets[0];
                return chart.data.labels.map((label, i) => ({
                  text: `${label}  ${ds.data[i]}명`,
                  fillStyle: ds.backgroundColor[i % ds.backgroundColor.length],
                  strokeStyle: 'transparent',
                  lineWidth: 0,
                  index: i,
                  hidden: false
                }));
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            callbacks: {
              label: (c) => ` ${c.label}: ${c.raw}명 (${(c.raw / total * 100).toFixed(1)}%) — 클릭하면 학생 목록`
            }
          }
        }
      }
    });
  }
});
