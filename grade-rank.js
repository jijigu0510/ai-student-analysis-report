// grade-rank.js — 내신 석차 산출기 통합 스크립트
// 원본: 내신석차산출기.html (독립실행버전 v48)
// 통합 시 변경: encoding 라디오 name="gr-encoding"으로 변경

    // 상태 관리
    const state = {
        students: [],
        classes: [],
        schools: [],
        selectedSchool: 'all',
        selectedClass: 'all',
        selectedStudent: 'none',
        chartPoints: [],
        filesCount: 0,
        currentStudent: null,
        currentUniv: 'yonsei'
    };

    // 대학별 계산기용 통합 상태
    const calcState = {
        studentName: '',
        baseTotalGPA: 0,
        // 연세대용
        common: [], general: [], career: [], subjB: [],
        // 고려대용
        kRanked: [], kAch: [],
        // 서강대용
        sgRanked: [], sgAch: [],
        // 성균관대용
        skkA: [], skkB: [], skkQual: 200,
        // 중앙대용
        cauRanked: [], cauCareer: [], cauAbsence: 0,
        // 경희대용
        khRanked: [], khCareer: [], khAbsence: 0, khVolunteer: 15, khQual: 300,
        // 한국외대용
        hufsRanked: [], hufsCareer: [],
        // 서울시립대용
        uosRanked: [], uosCareer: [], uosQual: 100,
        // 건국대용
        kuRanked: [], kuQual: 300,
        // 동국대용
        dguMajor: 'humanities', dguSubjects: [], dguQual: 300, dguTop10: [],
        // 홍익대용
        hongikMajor: 'humanities', hongikRanked: [], hongikCareer: [],
        // 국민대용
        kookminMajor: 'humanities', kookminRanked: [], kookminCareer: [],
        // 숭실대용
        soongsilMajor: 'humanities', soongsilRanked: [], soongsilCareer: [],
        // 세종대용
        sejongMajor: 'humanities', sejongRanked: [], sejongCareer: [],
        // 단국대용
        dankookMajor: 'general', dankookRanked: [], dankookCareer: [],
        // 광운대용
        kwRanked: [], kwCareer: []
    };

    const STORAGE_KEY = 'calc_grade_v48_final_data';

    const fileInput = document.getElementById('fileInput');
    const statusMsg = document.getElementById('statusMsg');
    const mainContent = document.getElementById('mainContent');
    const emptyState = document.getElementById('grEmptyState');
    const formulaBox = document.getElementById('formulaBox');
    const rankTableBody = document.getElementById('rankTableBody');
    const canvas = document.getElementById('scatterChart');
    const ctx = canvas.getContext('2d');
    const tooltip = document.getElementById('tooltip');
    const btnReset = document.getElementById('btnReset');
    const exportButtons = document.getElementById('exportButtons');
    const saveStatus = document.getElementById('saveStatus');
    const classFilterContainer = document.getElementById('classFilterContainer');
    const classFilterSelect = document.getElementById('classFilter');

    if (fileInput) fileInput.addEventListener('change', handleFileUpload);
    
    document.querySelectorAll('input[name="gr-encoding"]').forEach(radio => {
        radio.addEventListener('change', () => {
            if (fileInput && fileInput.files.length > 0) handleFileUpload({ target: fileInput });
        });
    });

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', loadData);
    } else {
        loadData();
    }

    function loadData() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed && parsed.length > 0) {
                    // 데이터 로드 시 최신 로직으로 점수 재계산 (전교과 등급 포함 여부 등 대응)
                    parsed.forEach(s => {
                        const calculated = calculateStudentGPAs(s.subjects);
                        Object.assign(s, calculated);
                    });

                    // 성적순(오름차순)으로 다시 정렬하여 석차 무결성 보장
                    parsed.sort((a, b) => (a.totalGPA || 9.9) - (b.totalGPA || 9.9));
                    state.students = parsed.map((s, i) => ({ ...s, rank: i + 1 }));
                    window.gradeRankStudents = state.students;
                    
                    // 초기화 순서 수정: 데이터 먼저 구축 후 UI 표시
                    updateHierarchyData();
                    updateHierarchyDropdowns();
                    
                    showResultUI();
                    
                    setTimeout(() => {
                        if (state.students.length > 0) {
                            updateFilteredUI();
                        }
                    }, 500);

                    if(statusMsg) statusMsg.textContent = `저장된 데이터 로드됨 (${state.students.length}명)`;
                    if(saveStatus) saveStatus.style.display = 'flex';
                }
            } catch (e) {
                console.error("데이터 로드 중 오류:", e);
            }
        }
    }

    function updateHierarchyData() {
        state.schools = [...new Set(state.students.map(s => s.school || '부안고등학교'))].sort();
        state.classes = [...new Set(state.students.map(s => s.class))].filter(c => c !== '미상').sort((a, b) => Number(a) - Number(b));
        if (state.students.some(s => s.class === '미상')) state.classes.push('미상');
    }

    function updateHierarchyDropdowns() {
        // 학교 드롭다운은 제거되었으므로 반 드롭다운부터 시작
        updateClassDropdown();
    }

    function updateClassDropdown() {
        const classSel = document.getElementById('grClassSelect');
        if (!classSel) return;

        const classes = state.classes; 

        const currentClass = classSel.value;
        classSel.innerHTML = '<option value="all">전체 반</option>';
        classes.forEach(cls => {
            const opt = document.createElement('option');
            opt.value = cls;
            opt.textContent = cls === '미상' ? '미상' : cls + '반';
            classSel.appendChild(opt);
        });
        if (classes.includes(currentClass)) classSel.value = currentClass;

        updateStudentDropdown();
    }

    function updateStudentDropdown() {
        const classSel = document.getElementById('grClassSelect');
        const studentSel = document.getElementById('grStudentSelect');
        if (!studentSel) return;

        const selectedClass = classSel ? classSel.value : 'all';

        let students = state.students;
        if (selectedClass !== 'all') students = students.filter(s => s.class === selectedClass);

        // 번호순으로 정렬
        students.sort((a, b) => (a.number || 0) - (b.number || 0));

        studentSel.innerHTML = '<option value="none">학생 선택 (대학별 점수 확인)</option>';
        students.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.rank; // rank를 식별자로 사용 (유니크함)
            opt.textContent = `${s.number ? s.number + '번 ' : ''}${s.name}`;
            studentSel.appendChild(opt);
        });
    }

    window.onHierarchicalChange = function(type) {
        if (type === 'class') updateStudentDropdown();
        else if (type === 'student') {
            const studentSel = document.getElementById('grStudentSelect');
            const rank = parseInt(studentSel.value);
            const btn = document.getElementById('openUnivCalcBtn');
            if (!isNaN(rank)) {
                const student = state.students.find(s => s.rank === rank);
                if (student) {
                    state.currentStudent = student;
                    if (btn) {
                        btn.textContent = '교과전형 점수 확인';
                        btn.style.visibility = 'visible';
                    }
                }
            } else {
                // 'none' 선택 시 버튼 숨김
                state.currentStudent = null;
                if (btn) btn.style.visibility = 'hidden';
            }
        }
    };

    function openUnivScoreSummary(student) {
        state.currentStudent = student;
        loadToUnivCalc(); // calcState 채우기

        const univs = [
            { id: 'yonsei', name: '연세대', calc: calculateYonseiScore, target: 'y-final-score' },
            { id: 'korea', name: '고려대', calc: calculateKoreaScore, target: 'k-final-score' },
            { id: 'sogang', name: '서강대', calc: calculateSogangScore, target: 'sg-final-score' },
            { id: 'sungkyunkwan', name: '성균관대', calc: calculateSungkyunkwanScore, target: 'skk-final-score' },
            { id: 'chungang', name: '중앙대', calc: calculateChungangScore, target: 'cau-final-score' },
            { id: 'kyunghee', name: '경희대', calc: calculateKyungheeScore, target: 'kh-final-score' },
            { id: 'hufs', name: '한국외대', calc: calculateHufsScore, target: 'hufs-final-score' },
            { id: 'uos', name: '서울시립대', calc: calculateUosScore, target: 'uos-final-score' },
            { id: 'konkuk', name: '건국대', calc: calculateKonkukScore, target: 'ku-final-score' },
            { id: 'dongguk', name: '동국대', calc: () => calculateDonggukScore(false), target: 'dgu-final-score' },
            { id: 'hongik', name: '홍익대', calc: calculateHongikScore, target: 'hongik-final-score' },
            { id: 'kookmin', name: '국민대', calc: calculateKookminScore, target: 'kookmin-final-score' },
            { id: 'soongsil', name: '숭실대', calc: calculateSoongsilScore, target: 'soongsil-final-score' },
            { id: 'sejong', name: '세종대', calc: calculateSejongScore, target: 'sejong-final-score' },
            { id: 'dankook', name: '단국대', calc: calculateDankookScore, target: 'dankook-final-score' },
            { id: 'kwangwoon', name: '광운대', calc: calculateKwangwoonScore, target: 'kw-final-score' }
        ];

        let html = `
            <div class="univ-summary-header">
                <h3>${student.school} ${student.class}반 ${student.number}번 ${student.name}</h3>
                <p>전체 내신: <strong>${student.totalGPA}</strong> (전교 ${student.rank}등)</p>
            </div>
            <table class="univ-summary-table">
                <thead>
                    <tr>
                        <th>대학교</th>
                        <th>산출 점수 / 등급</th>
                    </tr>
                </thead>
                <tbody>
        `;

        // 모든 대학에 대해 계산 수행
        univs.forEach(u => {
            try {
                u.calc();
                const scoreElem = document.getElementById(u.target);
                const score = scoreElem ? scoreElem.textContent : '-';
                html += `
                    <tr>
                        <td class="univ-name">${u.name}</td>
                        <td class="univ-score">${score}</td>
                    </tr>
                `;
            } catch (e) {
                html += `<tr><td>${u.name}</td><td>오류</td></tr>`;
            }
        });

        html += `</tbody></table>`;
        
        const summaryContent = document.getElementById('univSummaryContent');
        if (summaryContent) {
            summaryContent.innerHTML = html;
            document.getElementById('univSummaryModalOverlay').classList.add('active');
        }
    }

    window.closeUnivSummaryModal = function() {
        document.getElementById('univSummaryModalOverlay').classList.remove('active');
    };

    function saveData() {
        if (state.students.length > 0) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state.students));
                if(saveStatus) {
                    saveStatus.style.display = 'flex';
                    saveStatus.innerHTML = '<span>💾 브라우저에 저장됨</span>';
                    saveStatus.style.background = '#dcfce7';
                    saveStatus.style.color = '#15803d';
                }
            } catch (e) {
                console.warn("로컬 저장소 용량 초과:", e);
                if(saveStatus) {
                    saveStatus.style.display = 'flex';
                    saveStatus.innerHTML = '<span>⚠️ 저장 용량 초과(결과는 정상 출력됨)</span>';
                    saveStatus.style.background = '#fee2e2';
                    saveStatus.style.color = '#991b1b';
                }
            }
        }
    }

    function exportJSON() {
        if (state.students.length === 0) return;
        const dataStr = JSON.stringify(state.students, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `내신분석데이터_${new Date().toLocaleDateString().replace(/\./g,'')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function exportExcel() {
        const filtered = getFilteredStudents();
        if (filtered.length === 0) return;
        let csvContent = "\uFEFF"; 
        csvContent += "순위,반,이름,전체내신,국영수,국영수과,국영수사,국영수사과,수영과,국영사\n";
        filtered.forEach(s => {
            csvContent += `${s.rank},${s.class || '-'},${s.name},${s.totalGPA},${s.kemGPA},${s.kemsGPA},${s.kemssGPA},${s.kemssscGPA},${s.mesGPA},${s.kesGPA}\n`;
        });
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `내신순위표_${new Date().toLocaleDateString().replace(/\./g,'')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    function clearData() {
        if (confirm("저장된 모든 데이터를 삭제하고 초기화하시겠습니까?")) {
            localStorage.removeItem(STORAGE_KEY);
            state.students = [];
            state.classes = [];
            state.selectedClass = 'all';
            state.chartPoints = [];
            if(mainContent) mainContent.style.display = 'none';
            if(formulaBox) formulaBox.style.display = 'none';
            if(emptyState) emptyState.style.display = 'block';
            if(btnReset) btnReset.style.display = 'none';
            if(exportButtons) exportButtons.style.display = 'none';
            if(classFilterContainer) classFilterContainer.style.display = 'none';
            if(saveStatus) saveStatus.style.display = 'none';
            if(statusMsg) statusMsg.textContent = '';
            if(fileInput) fileInput.value = '';
        }
    }

    async function handleFileUpload(e) {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const encodingRadio = document.querySelector('input[name="gr-encoding"]:checked');
        const encoding = encodingRadio ? encodingRadio.value : 'EUC-KR';
        if(statusMsg) statusMsg.textContent = `${files.length}개 파일 처리 중...`;
        
        let allData = [];
        let isJsonLoaded = false;
        let errorFiles = [];

        try {
            for (const file of files) {
                try {
                    if (file.name.toLowerCase().endsWith('.json')) {
                        const text = await readFile(file, 'UTF-8');
                        const parsed = JSON.parse(text);
                        if (Array.isArray(parsed)) {
                            state.students = parsed;
                            window.gradeRankStudents = state.students;
                            isJsonLoaded = true;
                            break; 
                        }
                    } else {
                        const text = await readFile(file, encoding);
                        const parsed = parseCSV(text, file.name);
                        if (parsed.length === 0) {
                            errorFiles.push(file.name);
                        } else {
                            allData = allData.concat(parsed);
                        }
                    }
                } catch (fileErr) {
                    console.error(`[${file.name}] 파일 처리 중 예외 발생:`, fileErr);
                    errorFiles.push(`${file.name}(오류)`);
                }
            }

            if (isJsonLoaded) {
                updateHierarchyData();
                updateHierarchyDropdowns();
                saveData();
                showResultUI();
                if(statusMsg) statusMsg.textContent = "공유 데이터 불러오기 완료";
                return;
            }

            if (allData.length === 0) {
                alert(`유효한 성적 데이터를 찾을 수 없습니다.\n\n[해결 방법]\n1. 인코딩 설정(EUC-KR/UTF-8)을 변경하여 다시 업로드 해보세요.\n2. 나이스(NEIS) 양식이 맞는지 확인해주세요.\n\n* 실패한 파일: ${errorFiles.join(', ')}`);
                if(statusMsg) statusMsg.textContent = "데이터 없음";
                return;
            } else if (errorFiles.length > 0) {
                alert(`일부 파일을 불러오지 못했습니다:\n${errorFiles.join(', ')}\n(정상 처리된 파일만 반영되었습니다.)`);
            }

            processData(allData);
            updateHierarchyData();
            updateHierarchyDropdowns();
            saveData();
            showResultUI();

        } catch (error) {
            console.error(error);
            alert(`전체 파일 처리 중 치명적인 오류가 발생했습니다.\n에러 내용: ${error.message}`);
            if(statusMsg) statusMsg.textContent = "처리 중 오류 발생";
        }
    }

    function showResultUI() {
        if(statusMsg) statusMsg.textContent = `분석 완료: ${state.students.length}명 학생`;
        if(emptyState) emptyState.style.display = 'none';
        if(mainContent) mainContent.style.display = 'grid';
        if(formulaBox) formulaBox.style.display = 'flex';
        if(btnReset) btnReset.style.display = 'inline-flex';
        if(exportButtons) exportButtons.style.display = 'flex';
        
        // 반 필터 버튼 그룹 업데이트
        const btnGroup = document.getElementById('classFilterBtnGroup');
        if (btnGroup && state.classes.length > 0) {
            btnGroup.innerHTML = '<button class="gr-filter-btn active" data-val="all" onclick="handleClassFilter(\'all\')">전체</button>';
            state.classes.forEach(c => {
                const btn = document.createElement('button');
                btn.className = 'gr-filter-btn' + (state.selectedClass === c ? ' active' : '');
                btn.dataset.val = c;
                btn.textContent = c === '미상' ? '반 미상' : `${c}반`;
                btn.onclick = () => handleClassFilter(c);
                btnGroup.appendChild(btn);
            });
            if(classFilterContainer) classFilterContainer.style.display = 'flex';
        }

        updateFilteredUI();
    }

    function handleClassFilter(val) {
        state.selectedClass = val;
        // active 버튼 상태 업데이트
        document.querySelectorAll('#classFilterBtnGroup .gr-filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.val === val);
        });
        updateFilteredUI();
    }

    function getFilteredStudents() {
        if (state.selectedClass === 'all') return state.students;
        return state.students.filter(s => s.class === state.selectedClass);
    }

    function updateFilteredUI() {
        const filtered = getFilteredStudents();
        const studentCount = document.getElementById('studentCount');
        if (studentCount) studentCount.textContent = `총 ${filtered.length}명`;
        renderTable(filtered);
        setTimeout(() => renderChart(filtered), 0);
    }

    function readFile(file, encoding) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(new Error("파일 읽기 실패"));
            reader.readAsText(file, encoding);
        });
    }

    function splitCSVLine(str) {
        if (!str) return [];
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            if (char === '"' && str[i+1] === '"') {
                current += '"';
                i++;
            } else if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);
        return result.map(item => item.trim());
    }

    function parseCSV(text, fileName) {
        try {
            const lines = text.split(/\r\n|\n/);
            const results = [];
            let headerIdx = -1;
            let globalStudentName = fileName.replace(/\.[^/.]+$/, ""); 
            let globalClass = '미상';
            let globalSchool = '';
            let globalNumber = 0;

            // 파일명에서 정보 추출 시도 (예: 1-3-15-홍길동)
            const fileInfoMatch = fileName.match(/(\d+)-(\d+)-(\d+)-([가-힣]+)/);
            if (fileInfoMatch) {
                globalClass = fileInfoMatch[2];
                globalNumber = parseInt(fileInfoMatch[3]);
                globalStudentName = fileInfoMatch[4];
            }

            // 상단 몇 줄에서 학년/반 정보나 헤더를 찾음
            for (let i = 0; i < Math.min(lines.length, 30); i++) {
                if (!lines[i]) continue;
                const lineStr = lines[i].replace(/\s/g, '');
                
                const nameMatch = lineStr.match(/(?:성명|이름)[:\s]*([가-힣]{2,5})/);
                if (nameMatch && nameMatch[1]) {
                    globalStudentName = nameMatch[1];
                }
                
                const classMatch = lineStr.match(/(\d+)반/);
                if (classMatch && classMatch[1]) {
                    globalClass = classMatch[1];
                }

                const schoolMatch = lineStr.match(/([가-힣]+(?:학교|고))(?:\s|$)/);
                if (schoolMatch && schoolMatch[1] && !globalSchool) {
                    globalSchool = schoolMatch[1];
                }
                
                const numberMatch = lineStr.match(/(?:번호|번호[:\s]+)(\d+)/) || lineStr.match(/^(\d+)번/);
                if (numberMatch && numberMatch[1] && !globalNumber) {
                    globalNumber = parseInt(numberMatch[1]);
                }

                if (headerIdx === -1 && lineStr.includes('과목') && (lineStr.includes('단위') || lineStr.includes('학점'))) {
                    headerIdx = i;
                }
            }
            
            if (headerIdx === -1) {
                console.warn(`[${fileName}] 헤더를 찾을 수 없습니다.`);
                return [];
            }

            const headers = splitCSVLine(lines[headerIdx]).map(h => h.replace(/\s/g, ''));
            const findIdx = (kwdList) => headers.findIndex(h => kwdList.some(k => h.includes(k)));
            
            const nameIdx = findIdx(['성명', '이름']);
            const gradeIdx = findIdx(['학년']);
            const classIdx = findIdx(['반', '학급']);
            const catIdx = findIdx(['교과']);
            const subjIdx = findIdx(['과목']);
            const creditIdx = findIdx(['단위', '학점']);
            const rankIdx = findIdx(['석차등급', '등급']);
            const rawIdx = findIdx(['원점수', '평균', '표준편차']);
            const achIdx = findIdx(['성취도', '수강자', '평가', '성취']);

            if (subjIdx === -1 || creditIdx === -1) {
                console.warn(`[${fileName}] 필수 컬럼(과목, 단위/학점)이 누락되었습니다.`);
                return [];
            }

            let currentName = globalStudentName;
            let currentClass = globalClass;
            let currentGrade = 1;

            for (let i = headerIdx + 1; i < lines.length; i++) {
                const rowStr = lines[i];
                if (!rowStr || rowStr.trim() === '') continue;

                const row = splitCSVLine(rowStr);
                
                if (nameIdx !== -1 && row[nameIdx] && row[nameIdx].trim() !== '') {
                    let tempName = row[nameIdx].replace(/["\s]/g, '');
                    if (tempName && !tempName.includes('합계') && !tempName.includes('총계')) {
                        currentName = tempName;
                    }
                }

                if (classIdx !== -1 && row[classIdx] && row[classIdx].trim() !== '') {
                    let tempClass = row[classIdx].replace(/[^0-9]/g, '');
                    if (tempClass) currentClass = tempClass;
                }

                const subject = row[subjIdx] || "";
                if (!subject || subject.includes('합계') || subject.includes('총계') || (row[0] && row[0].includes('합계'))) continue;

                if (gradeIdx !== -1 && row[gradeIdx]) {
                    const parsedGrade = parseInt(row[gradeIdx].replace(/[^0-9]/g, ''));
                    if (!isNaN(parsedGrade)) currentGrade = parsedGrade;
                }

                const category = catIdx !== -1 ? (row[catIdx] || "") : "";
                
                const creditStr = row[creditIdx] ? row[creditIdx].replace(/[^0-9.]/g, '') : '';
                const credit = parseFloat(creditStr);
                if (isNaN(credit)) continue;

                let raw = 0, mean = 0, std = 0, ach = '', studentsNum = 100;
                if (rawIdx !== -1 && row[rawIdx]) {
                    const match = row[rawIdx].match(/([\d\.]+)\s*\/\s*([\d\.]+)\s*\(\s*([\d\.]+)\s*\)/);
                    if (match) {
                        raw = parseFloat(match[1]);
                        mean = parseFloat(match[2]);
                        std = parseFloat(match[3]);
                    } else {
                        const singleNum = parseFloat(row[rawIdx].replace(/[^0-9.]/g, ''));
                        if(!isNaN(singleNum)) raw = singleNum;
                    }
                }

                if (achIdx !== -1 && row[achIdx]) {
                    const achMatch = row[achIdx].match(/([A-E|P])/i);
                    if (achMatch) ach = achMatch[1].toUpperCase();
                    
                    const numMatch = row[achIdx].match(/\(\s*(\d+)\s*\)/);
                    if (numMatch) studentsNum = parseInt(numMatch[1]);
                }

                let rank = null;
                if (rankIdx !== -1 && row[rankIdx]) {
                    const cellVal = row[rankIdx].trim().toUpperCase();
                    
                    if (/^[A-E|P]$/.test(cellVal) || cellVal.includes('A') || cellVal.includes('B') || cellVal.includes('C')) {
                        const achMatch = cellVal.match(/([A-E|P])/i);
                        if (achMatch && !ach) {
                            ach = achMatch[1].toUpperCase();
                        }
                    } else {
                        const rankMatch = cellVal.match(/(\d+)/);
                        if (rankMatch) rank = parseFloat(rankMatch[1]);
                    }
                }

                if (rank !== null || ['A','B','C','D','E','P'].includes(ach)) {
                    results.push({ 
                        name: currentName, 
                        class: currentClass, 
                        school: globalSchool || '부안고등학교', 
                        number: globalNumber,
                        grade: currentGrade, 
                        category, 
                        subject, 
                        credit, 
                        rank, raw, mean, std, ach, studentsNum 
                    });
                }
            }
            return results;
        } catch (e) {
            console.error(`[${fileName}] 파일 파싱 내부 에러:`, e);
            throw e; 
        }
    }

    function calculateStudentGPAs(subjs) {
        const calc = (filter, includeExcluded = false) => {
            const filtered = subjs.filter(s => filter(s) && s.rank !== null && s.rank > 0 && (includeExcluded || !s.isExcluded));
            const totalC = filtered.reduce((sum, s) => sum + s.credit, 0);
            const totalS = filtered.reduce((sum, s) => sum + (s.credit * s.rank), 0);
            return totalC === 0 ? 0 : parseFloat((totalS / totalC).toFixed(2));
        };

        return {
            totalGPA: calc(() => true, true),
            kemGPA: calc(s => s.isKorean || s.isEnglish || s.isMath),
            kemsGPA: calc(s => s.isKorean || s.isEnglish || s.isMath || s.isScience),
            kemssGPA: calc(s => s.isKorean || s.isEnglish || s.isMath || s.isSocial),
            kemssscGPA: calc(s => s.isKorean || s.isEnglish || s.isMath || s.isSocial || s.isScience),
            mesGPA: calc(s => s.isMath || s.isEnglish || s.isScience),
            kesGPA: calc(s => s.isKorean || s.isEnglish || s.isSocial)
        };
    }

    function processData(rawData) {
        const grouped = {};
        rawData.forEach(d => {
            if (!grouped[d.name]) grouped[d.name] = [];
            grouped[d.name].push(d);
        });

        const students = Object.keys(grouped).map(nameKey => {
            const targets = grouped[nameKey];
            const sample = targets[0];
            const name = sample.name;
            const studentClass = sample.class;
            const school = sample.school;
            const number = sample.number;
            const subjs = targets.map(t => ({
                category: t.category, subject: t.subject, credit: t.credit, rank: t.rank,
                grade: t.grade, raw: t.raw, mean: t.mean, std: t.std, ach: t.ach, studentsNum: t.studentsNum,
                isKorean: ['국어', '독서', '문학', '화법', '작문', '언어', '매체'].some(k => t.category.includes(k) || t.subject.includes(k)),
                isEnglish: t.category.includes('영어') || t.subject.includes('영어'),
                isMath: t.category.includes('수학') || t.subject.includes('수학'),
                isSocial: ['사회', '역사', '도덕', '한국사', '지리', '윤리', '정치', '경제'].some(k => t.category.includes(k) || t.subject.includes(k)),
                isScience: ['과학', '물리', '화학', '생물', '생명', '지구'].some(k => t.category.includes(k) || t.subject.includes(k)),
                isExcluded: ['정보', '기술', '가정', '외국어', '한문', '교양'].some(k => t.category.includes(k) || t.subject.includes(k)) && !t.category.includes('영어')
            }));

            const calculatedGPAs = calculateStudentGPAs(subjs);

            return {
                name,
                class: studentClass,
                number,
                school: school || '부안고등학교',
                subjects: subjs,
                ...calculatedGPAs
            };
        });

        students.sort((a, b) => (a.totalGPA || 9) - (b.totalGPA || 9));
        state.students = students.map((s, i) => ({ ...s, rank: i + 1 }));
        
        state.classes = [...new Set(state.students.map(s => s.class))].filter(c => c !== '미상').sort((a, b) => Number(a) - Number(b));
        if (state.students.some(s => s.class === '미상')) state.classes.push('미상');
    }

    function renderTable(filteredStudents) {
        if (!rankTableBody) return;
        rankTableBody.innerHTML = '';
        filteredStudents.forEach(s => {
            const tr = document.createElement('tr');
            tr.onclick = () => openModal(s);
            tr.innerHTML = `
                <td><span class="rank-badge ${s.rank <= 3 ? 'top-rank' : ''}">${s.rank}</span></td>
                <td style="color:#64748b;">${s.class !== '미상' ? s.class : '-'}</td>
                <td style="font-weight:bold;">${s.name}</td>
                <td style="text-align:right; color: #2563eb; font-weight:bold;">${s.totalGPA !== null ? s.totalGPA : '-'}</td>
            `;
            rankTableBody.appendChild(tr);
        });
    }

    function renderChart(filteredStudents) {
        const container = document.getElementById('chartWrapper');
        if (!container) return;

        const isLight = document.body.classList.contains('light-mode');
        const gridColor = isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)';
        const textColor = isLight ? '#64748b' : '#adb5bd';
        const pointColor = isLight ? '#5e6ad2' : '#7c83fd';

        const dpr = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;
        const padding = { top: 30, right: 30, bottom: 40, left: 50 };
        const chartW = width - padding.left - padding.right;
        const chartH = height - padding.top - padding.bottom;

        ctx.clearRect(0, 0, width, height);
        state.chartPoints = [];

        ctx.beginPath();
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;

        const getY = (grade) => padding.top + ((grade - 1) / 8) * chartH;
        const getX = (index, total) => padding.left + (index / (total - 1 || 1)) * chartW;

        for (let i = 1; i <= 9; i++) {
            const y = getY(i);
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.fillStyle = textColor;
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(i + '등급', padding.left - 10, y);
        }
        ctx.stroke();

        filteredStudents.forEach((s, i) => {
            if(s.totalGPA === null || s.totalGPA === undefined) return;
            const x = getX(i, filteredStudents.length);
            const y = getY(s.totalGPA);
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fillStyle = pointColor;
            
            if (!isLight) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = pointColor;
            }
            
            ctx.fill();
            
            // Reset shadow
            ctx.shadowBlur = 0;
            
            state.chartPoints.push({ x: x, y: y, r: 6, data: s });
        });
    }

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        let closest = null;
        let minDist = 100;
        for (const p of state.chartPoints) {
            const dx = mx - p.x;
            const dy = my - p.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist <= 12 && dist < minDist) { 
                minDist = dist;
                closest = p;
            }
        }
        if (closest) {
            canvas.style.cursor = 'pointer';
            tooltip.style.display = 'block';
            tooltip.style.left = (closest.x + 10) + 'px';
            tooltip.style.top = (closest.y - 10) + 'px';
            tooltip.innerHTML = `<strong>${closest.data.name}</strong><br>내신: ${closest.data.totalGPA}`;
        } else {
            canvas.style.cursor = 'default';
            tooltip.style.display = 'none';
        }
    });

    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        for (const p of state.chartPoints) {
            const dx = mx - p.x;
            const dy = my - p.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist <= 12) {
                openModal(p.data);
                break;
            }
        }
    });

    const modalOverlay = document.getElementById('modalOverlay');
    const modalName = document.getElementById('modalName');
    const modalTotal = document.getElementById('modalTotal');
    const modalKem = document.getElementById('modalKem');
    const modalKems = document.getElementById('modalKems');
    const modalKemss = document.getElementById('modalKemss');
    const modalKemsssc = document.getElementById('modalKemsssc');
    const modalMes = document.getElementById('modalMes');
    const modalKes = document.getElementById('modalKes');
    const modalTbody = document.getElementById('modalTbody');

    function openModal(student) {
        state.currentStudent = student;
        modalName.innerHTML = `${student.class !== '미상' ? student.class + '반 ' : ''}${student.name} <span style="font-size:0.8rem; font-weight:normal; color:#64748b;">(전체 ${student.rank}등)</span>`;
        modalTotal.textContent = student.totalGPA !== null ? student.totalGPA : '-';
        modalKem.textContent = student.kemGPA !== null ? student.kemGPA : '-';
        modalKems.textContent = student.kemsGPA !== null ? student.kemsGPA : '-';
        modalKemss.textContent = student.kemssGPA !== null ? student.kemssGPA : '-';
        modalKemsssc.textContent = student.kemssscGPA !== null ? student.kemssscGPA : '-';
        modalMes.textContent = student.mesGPA !== null ? student.mesGPA : '-';
        modalKes.textContent = student.kesGPA !== null ? student.kesGPA : '-';

        modalTbody.innerHTML = '';
        const subjects = [...(student.subjects || [])].sort((a, b) => (a.category || "").localeCompare(b.category || ""));

        subjects.forEach(sub => {
            const tr = document.createElement('tr');
            let badgeClass = 'g-normal';
            if (sub.rank === 1) badgeClass = 'g1';
            else if (sub.rank >= 7) badgeClass = 'g9';

            let rankDisplay = sub.rank !== null ? `<span class="grade-circle ${badgeClass}">${sub.rank}</span>` : `<span class="grade-circle" style="background:var(--border); color:var(--text-sub);">${sub.ach || '-'}</span>`;

            tr.innerHTML = `
                <td class="category-cell" style="padding-left: 10px;">${sub.category}</td>
                <td class="subject-cell">
                    ${sub.subject} 
                    ${sub.isExcluded ? '<span class="minor-badge">주요교과제외</span>' : ''}
                </td>
                <td style="text-align: center; color: var(--text-sub);">${sub.grade || '-'}</td>
                <td style="text-align: center; color: var(--text-sub);">${sub.credit}</td>
                <td class="grade-cell" style="text-align: center; padding-right: 10px;">${rankDisplay}</td>
            `;
            modalTbody.appendChild(tr);
        });
        modalOverlay.classList.add('active');
    }

    function closeModal() {
        modalOverlay.classList.remove('active');
        state.currentStudent = null;
    }

    const detailModalOverlay = document.getElementById('detailModalOverlay');
    const detailTitle = document.getElementById('detailTitle');
    const detailContent = document.getElementById('detailContent');

    function openDetail(type) {
        if (!state.currentStudent) return;
        const s = state.currentStudent;
        const subjs = s.subjects;
        let targets = [];
        let title = "";

        if (type === 'total') {
            targets = subjs.filter(s => s.rank !== null && s.rank > 0);
            title = "전체 내신 (전교과)";
        } else if (type === 'kem') {
            targets = subjs.filter(s => (s.isKorean || s.isEnglish || s.isMath) && s.rank !== null && s.rank > 0 && !s.isExcluded);
            title = "국어+영어+수학";
        } else if (type === 'kems') {
            targets = subjs.filter(s => (s.isKorean || s.isEnglish || s.isMath || s.isScience) && s.rank !== null && s.rank > 0 && !s.isExcluded);
            title = "국어+영어+수학+과학";
        } else if (type === 'kemss') {
            targets = subjs.filter(s => (s.isKorean || s.isEnglish || s.isMath || s.isSocial) && s.rank !== null && s.rank > 0 && !s.isExcluded);
            title = "국어+영어+수학+사회";
        } else if (type === 'kemsssc') {
            targets = subjs.filter(s => (s.isKorean || s.isEnglish || s.isMath || s.isSocial || s.isScience) && s.rank !== null && s.rank > 0 && !s.isExcluded);
            title = "국어+영어+수학+사회+과학";
        } else if (type === 'mes') {
            targets = subjs.filter(s => (s.isMath || s.isEnglish || s.isScience) && s.rank !== null && s.rank > 0 && !s.isExcluded);
            title = "수학+영어+과학";
        } else if (type === 'kes') {
            targets = subjs.filter(s => (s.isKorean || s.isEnglish || s.isSocial) && s.rank !== null && s.rank > 0 && !s.isExcluded);
            title = "국어+영어+사회";
        }

        if (targets.length === 0) {
            alert("해당 교과에 포함되는 과목이 없습니다.");
            return;
        }

        let totalCredit = 0;
        let totalScore = 0;
        let html = `
            <table class="detail-table">
                <thead>
                    <tr>
                        <th width="70">교과</th>
                        <th>과목명</th>
                        <th width="120">계산 (단위×등급)</th>
                    </tr>
                </thead>
                <tbody>
        `;

        targets.forEach(item => {
            const score = item.credit * item.rank;
            totalCredit += item.credit;
            totalScore += score;
            html += `
                <tr>
                    <td class="category-cell">${item.category}</td>
                    <td class="subject-cell">${item.subject}</td>
                    <td style="text-align:right; font-family: 'Outfit', sans-serif;">${item.credit} × ${item.rank} = <strong>${score}</strong></td>
                </tr>
            `;
        });

        const result = (totalScore / totalCredit).toFixed(2);

        html += `
                </tbody>
            </table>
            <div class="calc-total">
                <span style="font-size:0.9rem; color:var(--text-sub); font-weight:normal;">합계: ${totalScore} ÷ ${totalCredit}</span>
                <span style="font-size:1.2rem; font-weight:700;">${result} 등급</span>
            </div>
        `;

        detailTitle.innerText = `${title} 산출 내역`;
        detailContent.innerHTML = html;
        detailModalOverlay.classList.add('active');
        detailModalOverlay.classList.add('detail-active');
    }

    function closeDetailModal() {
        detailModalOverlay.classList.remove('active');
        detailModalOverlay.classList.remove('detail-active');
    }

    // 전역 노출 (HTML onclick 대응)
    window.openModal = openModal;
    window.closeModal = closeModal;
    window.openDetail = openDetail;
    window.closeDetailModal = closeDetailModal;

    // ==========================================
    // 대학별 내신 산출기 통합 로직
    // ==========================================

    function normalCDF(x) {
        var sign = x < 0 ? -1 : 1;
        x = Math.abs(x);
        var t = 1 / (1 + 0.2316419 * x);
        var d = 0.3989423 * Math.exp(-x * x / 2);
        var prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
        if (sign > 0) return 1 - prob; 
        return prob; 
    }

    function getKoreaGradeFromRatio(ratio) {
        if (ratio <= 4.0) return 1;
        if (ratio <= 11.0) return 2;
        if (ratio <= 23.0) return 3;
        if (ratio <= 40.0) return 4;
        if (ratio <= 60.0) return 5;
        if (ratio <= 77.0) return 6;
        if (ratio <= 89.0) return 7;
        if (ratio <= 96.0) return 8;
        return 9;
    }

    // switchUnivCalc 는 모달 내 선택기 변경 시 호출 하는 함수
    function switchUnivCalc() {
        // 모달 내 univSelectorModal로 동기화
        const modalSel = document.getElementById('univSelectorModal');
        const filterSel = document.getElementById('univSelector');
        if (modalSel) state.currentUniv = modalSel.value;
        else if (filterSel) state.currentUniv = filterSel.value;
        if (calcState.studentName) {
            renderUnivUI();
            runCurrentUnivCalc();
        }
    }

    window.switchUnivCalcModal = switchUnivCalc;

    function loadToUnivCalc() {
        if (!state.currentStudent) return;
        const s = state.currentStudent;
        
        calcState.studentName = s.name;
        calcState.baseTotalGPA = s.totalGPA;
        
        calcState.common = [];
        calcState.general = [];
        calcState.career = [];
        calcState.subjB = [];
        calcState.kRanked = [];
        calcState.kAch = [];
        calcState.sgRanked = [];
        calcState.sgAch = [];
        calcState.skkA = [];
        calcState.skkB = [];
        calcState.skkQual = 200;
        calcState.cauRanked = [];
        calcState.cauCareer = [];
        calcState.cauAbsence = 0;
        calcState.khRanked = [];
        calcState.khCareer = [];
        calcState.khAbsence = 0;
        calcState.khVolunteer = 15;
        calcState.khQual = 300;
        calcState.hufsRanked = [];
        calcState.hufsCareer = [];
        calcState.uosRanked = [];
        calcState.uosCareer = [];
        calcState.uosQual = 100;
        calcState.kuRanked = [];
        calcState.kuQual = 300;
        calcState.dguMajor = 'humanities';
        calcState.dguSubjects = [];
        calcState.dguQual = 300;
        calcState.dguTop10 = [];
        calcState.hongikMajor = 'humanities';
        calcState.hongikRanked = [];
        calcState.hongikCareer = [];
        calcState.kookminMajor = 'humanities';
        calcState.kookminRanked = [];
        calcState.kookminCareer = [];
        calcState.soongsilMajor = 'humanities';
        calcState.soongsilRanked = [];
        calcState.soongsilCareer = [];
        calcState.sejongMajor = 'humanities';
        calcState.sejongRanked = [];
        calcState.sejongCareer = [];
        calcState.dankookMajor = 'general';
        calcState.dankookRanked = [];
        calcState.dankookCareer = [];
        calcState.kwRanked = [];
        calcState.kwCareer = [];

        const commonSubjects = ['국어', '수학', '영어', '한국사', '통합사회', '통합과학', '과학탐구실험'];

        s.subjects.forEach(sub => {
            const cat = sub.category || '';
            const subjName = sub.subject || '';
            const cleanSubjName = subjName.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').replace(/\s/g, '');
            const isArtsPE = ['체육', '예술', '미술', '음악', '스포츠', '무용', '연극'].some(k => cat.includes(k) || subjName.includes(k));
            
            // 연세대용 (체육, 예술은 B군)
            if (isArtsPE) {
                calcState.subjB.push({ name: sub.subject, credit: sub.credit, val: sub.rank === 9 ? '9' : (sub.ach || 'A') });
            } else if (sub.rank !== null && sub.rank > 0) {
                const isCommon = sub.grade === 1 && commonSubjects.includes(cleanSubjName);
                const targetArray = isCommon ? calcState.common : calcState.general;
                targetArray.push({ name: sub.subject, credit: sub.credit, rank: sub.rank, raw: sub.raw||0, mean: sub.mean||0, std: sub.std||0 });
            } else if (sub.ach && ['A','B','C','D','E'].includes(sub.ach)) {
                let type = ['A','B','C'].includes(sub.ach) && !['D','E'].includes(sub.ach) ? '3step' : '5step';
                calcState.career.push({ name: sub.subject, credit: sub.credit, type: type, val: sub.ach, raw: sub.raw||100, rank: 1 });
            }

            // 고려대용 (전교과 반영 - 예체능 포함)
            if (sub.rank !== null && sub.rank > 0) {
                calcState.kRanked.push({
                    name: sub.subject, credit: sub.credit, rank: sub.rank, studentsNum: sub.studentsNum || 100
                });
            } else if (sub.ach && ['A','B','C'].includes(sub.ach)) {
                calcState.kAch.push({
                    name: sub.subject, credit: sub.credit, ach: sub.ach, aRatio: 30, bRatio: 40, cRatio: 30
                });
            }
            
            // 서강대용 (전교과 반영 - 예체능 포함)
            if (sub.rank !== null && sub.rank > 0) {
                calcState.sgRanked.push({
                    name: sub.subject, credit: sub.credit, rank: sub.rank
                });
            } else if (sub.ach && ['A','B','C','D','E'].includes(sub.ach)) {
                calcState.sgAch.push({
                    name: sub.subject, credit: sub.credit, ach: sub.ach, aRatio: 30, bRatio: 40, cRatio: 30, dRatio: 0, eRatio: 0
                });
            }

            // 성균관대용 (예체능 제외)
            if (sub.rank !== null && sub.rank > 0) {
                const isGroupB = ['기술', '가정', '제2외국어', '한문'].some(k => cat.includes(k) || subjName.includes(k));
                const isGroupA = ['국어', '수학', '영어', '사회', '역사', '도덕', '한국사', '과학'].some(k => cat.includes(k) || subjName.includes(k));
                
                if (isGroupA && !isGroupB) {
                    calcState.skkA.push({ name: sub.subject, credit: sub.credit, rank: sub.rank });
                } else if (isGroupB) {
                    calcState.skkB.push({ name: sub.subject, credit: sub.credit, rank: sub.rank });
                }
            }

            // 중앙대용 (국/수/영/사/과)
            const isCauGroup = ['국어', '수학', '영어', '사회', '역사', '도덕', '한국사', '과학'].some(k => cat.includes(k) || subjName.includes(k));
            if (isCauGroup && !isArtsPE) {
                if (sub.rank !== null && sub.rank > 0) {
                    calcState.cauRanked.push({ name: sub.subject, credit: sub.credit, rank: sub.rank });
                } else if (sub.ach && ['A','B','C'].includes(sub.ach)) {
                    calcState.cauCareer.push({ name: sub.subject, ach: sub.ach });
                }
            }

            // 경희대용 (전교과 반영 - 예체능 포함)
            if (sub.rank !== null && sub.rank > 0) {
                calcState.khRanked.push({ name: sub.subject, credit: sub.credit, rank: sub.rank });
            } else if (sub.ach && ['A','B','C'].includes(sub.ach)) {
                calcState.khCareer.push({ name: sub.subject, credit: sub.credit, ach: sub.ach });
            }

            // 한국외대용 (국/수/영/사/과/한)
            if (isCauGroup && !isArtsPE) {
                if (sub.rank !== null && sub.rank > 0) {
                    let sType = 'other';
                    if (cat.includes('수학') || subjName.includes('수학')) {
                        sType = 'math';
                    }
                    calcState.hufsRanked.push({ name: sub.subject, credit: sub.credit, rank: sub.rank, raw: sub.raw || 0, subjType: sType });
                } else if (sub.ach && ['A','B','C'].includes(sub.ach)) {
                    calcState.hufsCareer.push({ name: sub.subject, credit: sub.credit, ach: sub.ach });
                }
            }

            // 서울시립대용 (전교과)
            if (sub.rank !== null && sub.rank > 0) {
                calcState.uosRanked.push({ name: sub.subject, credit: sub.credit, rank: sub.rank });
            } else if (sub.ach && ['A','B','C'].includes(sub.ach)) {
                calcState.uosCareer.push({ name: sub.subject, credit: sub.credit, ach: sub.ach });
            }

            // 건국대용 (국수영사과한국사 석차등급 기재 과목만)
            if (isCauGroup && !isArtsPE) {
                if (sub.rank !== null && sub.rank > 0) {
                    calcState.kuRanked.push({ name: sub.subject, credit: sub.credit, rank: sub.rank });
                }
            }

            // 동국대, 홍익대, 국민대, 숭실대, 세종대, 단국대 공통 카테고리 추출
            let parsedCat = '';
            if (cat.includes('국어') || subjName.includes('국어')) parsedCat = '국어';
            else if (cat.includes('수학') || subjName.includes('수학')) parsedCat = '수학';
            else if (cat.includes('영어') || subjName.includes('영어')) parsedCat = '영어';
            else if (cat.includes('사회') || cat.includes('역사') || cat.includes('도덕') || subjName.includes('사회')) parsedCat = '사회';
            else if (cat.includes('과학') || subjName.includes('과학')) parsedCat = '과학';
            else if (cat.includes('한국사') || subjName.includes('한국사')) parsedCat = '한국사';

            // 동국대용 (이수단위 반영X, 국수영사과한국사 중 택1)
            if (sub.rank !== null && sub.rank > 0 && !isArtsPE && parsedCat) {
                calcState.dguSubjects.push({ category: parsedCat, name: sub.subject, rank: sub.rank });
            }

            // 홍익대용 (국/수/영/사/과)
            if (!isArtsPE && parsedCat) {
                if (sub.rank !== null && sub.rank > 0) {
                    calcState.hongikRanked.push({ category: parsedCat, name: sub.subject, credit: sub.credit, rank: sub.rank });
                } else if (sub.ach && ['A','B','C'].includes(sub.ach)) {
                    calcState.hongikCareer.push({ category: parsedCat, name: sub.subject, credit: sub.credit, ach: sub.ach });
                }
            }

            // 국민대용, 숭실대용, 세종대용, 단국대용 (한국사는 사회로 편입)
            if (!isArtsPE && parsedCat) {
                let kmCat = parsedCat;
                if (kmCat === '한국사') kmCat = '사회';
                
                // 국민대
                if (sub.rank !== null && sub.rank > 0) {
                    calcState.kookminRanked.push({ category: kmCat, name: sub.subject, credit: sub.credit, rank: sub.rank });
                } else if (sub.ach && ['A','B','C'].includes(sub.ach)) {
                    calcState.kookminCareer.push({ category: kmCat, name: sub.subject, credit: sub.credit, ach: sub.ach });
                }

                // 숭실대
                if (sub.rank !== null && sub.rank > 0) {
                    calcState.soongsilRanked.push({ category: kmCat, name: sub.subject, credit: sub.credit, rank: sub.rank });
                } else if (sub.ach && ['A','B','C'].includes(sub.ach)) {
                    calcState.soongsilCareer.push({ category: kmCat, name: sub.subject, credit: sub.credit, ach: sub.ach });
                }

                // 세종대
                if (sub.rank !== null && sub.rank > 0) {
                    calcState.sejongRanked.push({ category: kmCat, name: sub.subject, credit: sub.credit, rank: sub.rank });
                } else if (sub.ach && ['A','B','C'].includes(sub.ach)) {
                    calcState.sejongCareer.push({ category: kmCat, name: sub.subject, credit: sub.credit, ach: sub.ach });
                }

                // 단국대
                if (sub.rank !== null && sub.rank > 0) {
                    calcState.dankookRanked.push({ category: kmCat, name: sub.subject, credit: sub.credit, rank: sub.rank });
                } else if (sub.ach && ['A','B','C'].includes(sub.ach)) {
                    calcState.dankookCareer.push({ category: kmCat, name: sub.subject, credit: sub.credit, ach: sub.ach });
                }
            }

            // 광운대용 (국/수/영/사/과 전과목, 한국사는 사회로 간주하여 이미 isCauGroup에 포함됨)
            if (isCauGroup && !isArtsPE) {
                if (sub.rank !== null && sub.rank > 0) {
                    calcState.kwRanked.push({ name: sub.subject, credit: sub.credit, rank: sub.rank });
                } else if (sub.ach && ['A','B','C'].includes(sub.ach)) {
                    calcState.kwCareer.push({ name: sub.subject, credit: sub.credit, ach: sub.ach });
                }
            }
        });

        // 모달 열기 전에 univSelector 동기화
        const modalSel = document.getElementById('univSelectorModal');
        const filterSel = document.getElementById('univSelector');
        if (filterSel) state.currentUniv = filterSel.value;
        if (modalSel) modalSel.value = state.currentUniv;
        
        renderUnivUI();
        runCurrentUnivCalc();
    }

    // 현재 선택된 대학 계산을 실행
    function runCurrentUnivCalc() {
        if (state.currentUniv === 'yonsei') calculateYonseiScore();
        else if (state.currentUniv === 'korea') calculateKoreaScore();
        else if (state.currentUniv === 'sogang') calculateSogangScore();
        else if (state.currentUniv === 'sungkyunkwan') calculateSungkyunkwanScore();
        else if (state.currentUniv === 'chungang') calculateChungangScore();
        else if (state.currentUniv === 'kyunghee') calculateKyungheeScore();
        else if (state.currentUniv === 'hufs') calculateHufsScore();
        else if (state.currentUniv === 'uos') calculateUosScore();
        else if (state.currentUniv === 'konkuk') calculateKonkukScore();
        else if (state.currentUniv === 'dongguk') calculateDonggukScore(false);
        else if (state.currentUniv === 'hongik') calculateHongikScore();
        else if (state.currentUniv === 'kookmin') calculateKookminScore();
        else if (state.currentUniv === 'soongsil') calculateSoongsilScore();
        else if (state.currentUniv === 'sejong') calculateSejongScore();
        else if (state.currentUniv === 'dankook') calculateDankookScore();
        else if (state.currentUniv === 'kwangwoon') calculateKwangwoonScore();
    }

    // 대학별 시뮬레이터 모달 열기
    window.openUnivCalcModal = function() {
        if (!state.currentStudent) {
            alert('학생을 먼저 선택해주세요.');
            return;
        }
        const overlay = document.getElementById('univCalcModalOverlay');
        const nameSpan = document.getElementById('univCalcModalStudentName');
        if (nameSpan) nameSpan.textContent = `${state.currentStudent.class}반 ${state.currentStudent.number || ''}번 ${state.currentStudent.name} | 전교 ${state.currentStudent.rank}등`;
        if (overlay) {
            overlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
        loadToUnivCalc();
    };

    window.closeUnivCalcModal = function() {
        const overlay = document.getElementById('univCalcModalOverlay');
        if (overlay) overlay.style.display = 'none';
        document.body.style.overflow = '';
    };


    function renderUnivUI() {
        if (state.currentUniv === 'yonsei') renderYonseiUI();
        else if (state.currentUniv === 'korea') renderKoreaUI();
        else if (state.currentUniv === 'sogang') renderSogangUI();
        else if (state.currentUniv === 'sungkyunkwan') renderSungkyunkwanUI();
        else if (state.currentUniv === 'chungang') renderChungangUI();
        else if (state.currentUniv === 'kyunghee') renderKyungheeUI();
        else if (state.currentUniv === 'hufs') renderHufsUI();
        else if (state.currentUniv === 'uos') renderUosUI();
        else if (state.currentUniv === 'konkuk') renderKonkukUI();
        else if (state.currentUniv === 'dongguk') renderDonggukUI();
        else if (state.currentUniv === 'hongik') renderHongikUI();
        else if (state.currentUniv === 'kookmin') renderKookminUI();
        else if (state.currentUniv === 'soongsil') renderSoongsilUI();
        else if (state.currentUniv === 'sejong') renderSejongUI();
        else if (state.currentUniv === 'dankook') renderDankookUI();
        else if (state.currentUniv === 'kwangwoon') renderKwangwoonUI();
    }

    // 모달의 calcContainerModal 또는 플대운의 calcContainer를 반환
    function getCalcContainer() {
        return document.getElementById('calcContainerModal') || document.getElementById('calcContainer');
    }

    function addRow(type) {
        if (state.currentUniv === 'yonsei') {
            if (type === 'common' || type === 'general') calcState[type].push({ name: '', credit: 2, rank: 1, raw: 100, mean: 50, std: 15 });
            else if (type === 'career') calcState[type].push({ name: '', credit: 2, type: '3step', val: 'A', raw: 100, rank: 1 });
            else if (type === 'subjB') calcState[type].push({ name: '', credit: 2, val: 'A' });
            renderYonseiUI();
            calculateYonseiScore();
        } else if (state.currentUniv === 'korea') {
            if (type === 'kRanked') calcState.kRanked.push({ name: '', credit: 2, rank: 1, studentsNum: 100 });
            else if (type === 'kAch') calcState.kAch.push({ name: '', credit: 2, ach: 'A', aRatio: 30, bRatio: 40, cRatio: 30 });
            renderKoreaUI();
            calculateKoreaScore();
        } else if (state.currentUniv === 'sogang') {
            if (type === 'sgRanked') calcState.sgRanked.push({ name: '', credit: 2, rank: 1 });
            else if (type === 'sgAch') calcState.sgAch.push({ name: '', credit: 2, ach: 'A', aRatio: 30, bRatio: 40, cRatio: 30, dRatio: 0, eRatio: 0 });
            renderSogangUI();
            calculateSogangScore();
        } else if (state.currentUniv === 'sungkyunkwan') {
            if (type === 'skkA') calcState.skkA.push({ name: '', credit: 2, rank: 1 });
            else if (type === 'skkB') calcState.skkB.push({ name: '', credit: 2, rank: 1 });
            renderSungkyunkwanUI();
            calculateSungkyunkwanScore();
        } else if (state.currentUniv === 'chungang') {
            if (type === 'cauRanked') calcState.cauRanked.push({ name: '', credit: 2, rank: 1 });
            else if (type === 'cauCareer') calcState.cauCareer.push({ name: '', ach: 'A' });
            renderChungangUI();
            calculateChungangScore();
        } else if (state.currentUniv === 'kyunghee') {
            if (type === 'khRanked') calcState.khRanked.push({ name: '', credit: 2, rank: 1 });
            else if (type === 'khCareer') calcState.khCareer.push({ name: '', credit: 2, ach: 'A' });
            renderKyungheeUI();
            calculateKyungheeScore();
        } else if (state.currentUniv === 'hufs') {
            if (type === 'hufsRanked') calcState.hufsRanked.push({ name: '', credit: 2, rank: 1, raw: 100, subjType: 'other' });
            else if (type === 'hufsCareer') calcState.hufsCareer.push({ name: '', credit: 2, ach: 'A' });
            renderHufsUI();
            calculateHufsScore();
        } else if (state.currentUniv === 'uos') {
            if (type === 'uosRanked') calcState.uosRanked.push({ name: '', credit: 2, rank: 1 });
            else if (type === 'uosCareer') calcState.uosCareer.push({ name: '', credit: 2, ach: 'A' });
            renderUosUI();
            calculateUosScore();
        } else if (state.currentUniv === 'konkuk') {
            if (type === 'kuRanked') calcState.kuRanked.push({ name: '', credit: 2, rank: 1 });
            renderKonkukUI();
            calculateKonkukScore();
        } else if (state.currentUniv === 'dongguk') {
            if (type === 'dguSubjects') calcState.dguSubjects.push({ category: '국어', name: '', rank: 1 });
            renderDonggukUI();
            calculateDonggukScore(false);
        } else if (state.currentUniv === 'hongik') {
            if (type === 'hongikRanked') calcState.hongikRanked.push({ category: '국어', name: '', credit: 2, rank: 1 });
            else if (type === 'hongikCareer') calcState.hongikCareer.push({ category: '국어', name: '', credit: 2, ach: 'A' });
            renderHongikUI();
            calculateHongikScore();
        } else if (state.currentUniv === 'kookmin') {
            if (type === 'kookminRanked') calcState.kookminRanked.push({ category: '국어', name: '', credit: 2, rank: 1 });
            else if (type === 'kookminCareer') calcState.kookminCareer.push({ category: '국어', name: '', credit: 2, ach: 'A' });
            renderKookminUI();
            calculateKookminScore();
        } else if (state.currentUniv === 'soongsil') {
            if (type === 'soongsilRanked') calcState.soongsilRanked.push({ category: '국어', name: '', credit: 2, rank: 1 });
            else if (type === 'soongsilCareer') calcState.soongsilCareer.push({ category: '국어', name: '', credit: 2, ach: 'A' });
            renderSoongsilUI();
            calculateSoongsilScore();
        } else if (state.currentUniv === 'sejong') {
            if (type === 'sejongRanked') calcState.sejongRanked.push({ category: '국어', name: '', credit: 2, rank: 1 });
            else if (type === 'sejongCareer') calcState.sejongCareer.push({ category: '국어', name: '', credit: 2, ach: 'A' });
            renderSejongUI();
            calculateSejongScore();
        } else if (state.currentUniv === 'dankook') {
            if (type === 'dankookRanked') calcState.dankookRanked.push({ category: '국어', name: '', credit: 2, rank: 1 });
            else if (type === 'dankookCareer') calcState.dankookCareer.push({ category: '국어', name: '', credit: 2, ach: 'A' });
            renderDankookUI();
            calculateDankookScore();
        } else if (state.currentUniv === 'kwangwoon') {
            if (type === 'kwRanked') calcState.kwRanked.push({ name: '', credit: 2, rank: 1 });
            else if (type === 'kwCareer') calcState.kwCareer.push({ name: '', credit: 2, ach: 'A' });
            renderKwangwoonUI();
            calculateKwangwoonScore();
        }
    }

    function remRow(type, idx) {
        calcState[type].splice(idx, 1);
        renderUnivUI();
        if (state.currentUniv === 'yonsei') calculateYonseiScore();
        else if (state.currentUniv === 'korea') calculateKoreaScore();
        else if (state.currentUniv === 'sogang') calculateSogangScore();
        else if (state.currentUniv === 'sungkyunkwan') calculateSungkyunkwanScore();
        else if (state.currentUniv === 'chungang') calculateChungangScore();
        else if (state.currentUniv === 'kyunghee') calculateKyungheeScore();
        else if (state.currentUniv === 'hufs') calculateHufsScore();
        else if (state.currentUniv === 'uos') calculateUosScore();
        else if (state.currentUniv === 'konkuk') calculateKonkukScore();
        else if (state.currentUniv === 'dongguk') calculateDonggukScore(false);
        else if (state.currentUniv === 'hongik') calculateHongikScore();
        else if (state.currentUniv === 'kookmin') calculateKookminScore();
        else if (state.currentUniv === 'soongsil') calculateSoongsilScore();
        else if (state.currentUniv === 'sejong') calculateSejongScore();
        else if (state.currentUniv === 'dankook') calculateDankookScore();
        else if (state.currentUniv === 'kwangwoon') calculateKwangwoonScore();
    }

    function upRow(type, idx, field, val) {
        const item = calcState[type][idx];
        if (field === 'name' || field === 'type' || field === 'val' || field === 'ach' || field === 'subjType' || field === 'category') {
            item[field] = val;
            if (field === 'type' && state.currentUniv === 'yonsei') {
                if(val === '3step' && !['A','B','C'].includes(item.val)) item.val = 'A';
                if(val === '5step' && !['A','B','C','D','E'].includes(item.val)) item.val = 'A';
                renderYonseiUI(); 
            }
        } else {
            item[field] = parseFloat(val) || 0;
        }
        
        if (state.currentUniv === 'yonsei') calculateYonseiScore();
        else if (state.currentUniv === 'korea') calculateKoreaScore();
        else if (state.currentUniv === 'sogang') calculateSogangScore();
        else if (state.currentUniv === 'sungkyunkwan') calculateSungkyunkwanScore();
        else if (state.currentUniv === 'chungang') calculateChungangScore();
        else if (state.currentUniv === 'kyunghee') calculateKyungheeScore();
        else if (state.currentUniv === 'hufs') calculateHufsScore();
        else if (state.currentUniv === 'uos') calculateUosScore();
        else if (state.currentUniv === 'konkuk') calculateKonkukScore();
        else if (state.currentUniv === 'dongguk') calculateDonggukScore(false);
        else if (state.currentUniv === 'hongik') calculateHongikScore();
        else if (state.currentUniv === 'kookmin') calculateKookminScore();
        else if (state.currentUniv === 'soongsil') calculateSoongsilScore();
        else if (state.currentUniv === 'sejong') calculateSejongScore();
        else if (state.currentUniv === 'dankook') calculateDankookScore();
        else if (state.currentUniv === 'kwangwoon') calculateKwangwoonScore();
    }

    // === 연세대학교 ===
    function renderYonseiUI() {
        const container = getCalcContainer();
        const tableStyle = `<table class="y-table"><thead><tr><th>과목명</th><th width="50">단위</th>`;

        const renderCG = (type, data) => `
            <div class="y-section">
                <h4>${type === 'common' ? '공통과목' : '일반선택과목'} 
                    <button class="btn-sm" onclick="addRow('${type}')">+ 과목 추가</button>
                </h4>
                ${tableStyle}
                    <th width="60">등급</th><th width="60">원점수</th><th width="60">평균</th><th width="60">편차</th><th width="40">삭제</th></tr>
                </thead>
                <tbody>
                    ${data.map((r, i) => `
                        <tr>
                            <td><input type="text" value="${r.name}" onchange="upRow('${type}',${i},'name',this.value)"></td>
                            <td><input type="number" value="${r.credit}" onchange="upRow('${type}',${i},'credit',this.value)"></td>
                            <td><input type="number" value="${r.rank}" min="1" max="9" onchange="upRow('${type}',${i},'rank',this.value)"></td>
                            <td><input type="number" value="${r.raw}" onchange="upRow('${type}',${i},'raw',this.value)"></td>
                            <td><input type="number" value="${r.mean}" onchange="upRow('${type}',${i},'mean',this.value)"></td>
                            <td><input type="number" value="${r.std}" onchange="upRow('${type}',${i},'std',this.value)"></td>
                            <td><button class="btn-sm" style="color:var(--danger);" onclick="remRow('${type}',${i})">X</button></td>
                        </tr>
                    `).join('')}
                </tbody></table>
            </div>
        `;

        const careerHtml = `
            <div class="y-section">
                <h4>진로선택과목 (전문교과 포함)
                    <button class="btn-sm" onclick="addRow('career')">+ 과목 추가</button>
                </h4>
                ${tableStyle}
                    <th width="110">평가방식</th><th>성취도/점수</th><th width="40">삭제</th></tr>
                </thead>
                <tbody>
                    ${calcState.career.map((r, i) => `
                        <tr>
                            <td><input type="text" value="${r.name}" onchange="upRow('career',${i},'name',this.value)"></td>
                            <td><input type="number" value="${r.credit}" onchange="upRow('career',${i},'credit',this.value)"></td>
                            <td>
                                <select onchange="upRow('career',${i},'type',this.value)">
                                    <option value="3step" ${r.type==='3step'?'selected':''}>3단계(A/B/C)</option>
                                    <option value="5step" ${r.type==='5step'?'selected':''}>5단계(A~E)</option>
                                    <option value="grade" ${r.type==='grade'?'selected':''}>등급+원점수</option>
                                </select>
                            </td>
                            <td>
                                ${r.type === 'grade' ? 
                                  `<div style="display:flex; gap:5px;">
                                    <input type="number" placeholder="등급" value="${r.rank||1}" onchange="upRow('career',${i},'rank',this.value)">
                                    <input type="number" placeholder="원점수" value="${r.raw||100}" onchange="upRow('career',${i},'raw',this.value)">
                                   </div>` 
                                : `<select onchange="upRow('career',${i},'val',this.value)">
                                    ${r.type === '5step' ? 
                                      ['A','B','C','D','E'].map(x => `<option ${r.val===x?'selected':''}>${x}</option>`).join('') :
                                      ['A','B','C'].map(x => `<option ${r.val===x?'selected':''}>${x}</option>`).join('')
                                    }
                                   </select>`}
                            </td>
                            <td><button class="btn-sm" style="color:var(--danger);" onclick="remRow('career',${i})">X</button></td>
                        </tr>
                    `).join('')}
                </tbody></table>
            </div>
        `;

        const subjBHtml = `
            <div class="y-section">
                <h4>반영과목 B (체육, 예술 등)
                    <button class="btn-sm" onclick="addRow('subjB')">+ 과목 추가</button>
                </h4>
                ${tableStyle}
                    <th>성취도/등급</th><th width="40">삭제</th></tr>
                </thead>
                <tbody>
                    ${calcState.subjB.map((r, i) => `
                        <tr>
                            <td><input type="text" value="${r.name}" onchange="upRow('subjB',${i},'name',this.value)"></td>
                            <td><input type="number" value="${r.credit}" onchange="upRow('subjB',${i},'credit',this.value)"></td>
                            <td><input type="text" placeholder="A, B, C 또는 1~9" value="${r.val}" onchange="upRow('subjB',${i},'val',this.value.toUpperCase())"></td>
                            <td><button class="btn-sm" style="color:var(--danger);" onclick="remRow('subjB',${i})">X</button></td>
                        </tr>
                    `).join('')}
                </tbody></table>
            </div>
        `;

        container.innerHTML = `
            <div class="y-calc-grid">
                <div class="calc-inputs" style="max-height: 700px; overflow-y: auto; padding-right: 10px;">
                    ${renderCG('common', calcState.common)}
                    ${renderCG('general', calcState.general)}
                    ${careerHtml}
                    ${subjBHtml}
                </div>
                <div>
                    <div class="y-results">
                        <div style="font-size: 0.9rem; color: #94a3b8; margin-bottom: 15px;">대상: <strong>${calcState.studentName}</strong></div>
                        <div class="y-res-row">
                            <span>공통과목 점수 <span style="font-size:0.75rem; color:#94a3b8;">(x0.3)</span></span>
                            <span><span id="res-com">0.00</span> / 30</span>
                        </div>
                        <div class="y-res-row">
                            <span>일반선택 점수 <span style="font-size:0.75rem; color:#94a3b8;">(x0.5)</span></span>
                            <span><span id="res-gen">0.00</span> / 50</span>
                        </div>
                        <div class="y-res-row">
                            <span>진로선택 점수 <span style="font-size:0.75rem; color:#94a3b8;">(가중평균)</span></span>
                            <span><span id="res-car">0.00</span> / 20</span>
                        </div>
                        <div class="y-res-row" style="color: #fca5a5;">
                            <span>반영과목 B 감점</span>
                            <span id="res-pen">-0.00</span>
                        </div>
                        <div class="y-res-total">
                            <span>최종 교과 점수</span>
                            <span><span id="res-total">0.00</span> / 100</span>
                        </div>
                        <div style="margin:15px 0; border-top: 1px dashed rgba(255,255,255,0.2);"></div>
                        <div class="y-res-total">
                            <button class="btn btn-green" style="width: 100%; justify-content:center;" onclick="calculateYonseiScore()">🔄 점수 재계산</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function calculateYonseiScore() {
        const rankMap = {1:100, 2:95, 3:87.5, 4:75, 5:60, 6:40, 7:25, 8:12.5, 9:5};
        const calcGenGroup = (dataArray) => {
            let scoreSum = 0, creditSum = 0;
            dataArray.forEach(r => {
                if (r.credit <= 0) return;
                let z = r.std === 0 ? 0 : (r.raw - r.mean) / r.std;
                z = Math.round(z * 10) / 10; 
                z = Math.max(-3.0, Math.min(3.0, z)); 
                let zScore = 100 * normalCDF(z);
                let rScore = rankMap[r.rank] || 0;
                let subjScore = (rScore * 0.5) + (zScore * 0.5);
                scoreSum += subjScore * r.credit;
                creditSum += r.credit;
            });
            return creditSum > 0 ? (scoreSum / creditSum) : 0;
        };

        const finalCom = calcGenGroup(calcState.common); 
        const finalGen = calcGenGroup(calcState.general);

        let carScoreSum = 0, carCreditSum = 0;
        calcState.career.forEach(r => {
            if (r.credit <= 0) return;
            let s = 0;
            if (r.type === '3step') {
                if (r.val === 'A') s = 20; else if (r.val === 'B') s = 15; else s = 10;
            } else if (r.type === '5step') {
                if (['A','B'].includes(r.val)) s = 20; else if (['C','D'].includes(r.val)) s = 15; else s = 10;
            } else if (r.type === 'grade') {
                let rankS = r.rank <= 3 ? 20 : r.rank <= 6 ? 15 : 10;
                let rawS = r.raw >= 80 ? 20 : r.raw >= 60 ? 15 : 10;
                s = Math.max(rankS, rawS);
            }
            carScoreSum += s * r.credit;
            carCreditSum += r.credit;
        });
        const finalCar = carCreditSum > 0 ? (carScoreSum / carCreditSum) : 0; 

        let bCreditTotal = 0, badCreditTotal = 0;
        calcState.subjB.forEach(r => {
            if (r.credit <= 0) return;
            bCreditTotal += r.credit;
            if (r.val === '9' || r.val === 'C') badCreditTotal += r.credit;
        });
        const bPenalty = bCreditTotal > 0 ? ((badCreditTotal * 5) / bCreditTotal) : 0;

        const com30 = finalCom * 0.3;
        const gen50 = finalGen * 0.5;
        const totalScore = com30 + gen50 + finalCar - bPenalty;

        const eCom = document.getElementById('res-com');
        if (eCom) {
            eCom.textContent = com30.toFixed(2);
            document.getElementById('res-gen').textContent = gen50.toFixed(2);
            document.getElementById('res-car').textContent = finalCar.toFixed(2);
            document.getElementById('res-pen').textContent = '-' + bPenalty.toFixed(2);
            document.getElementById('res-total').textContent = totalScore.toFixed(3);
        }
    }

    // === 고려대학교 ===
    function renderKoreaUI() {
        const container = getCalcContainer();
        const tableStyle = `<table class="y-table"><thead><tr><th>과목명</th><th width="50">단위</th>`;

        const rankedHtml = `
            <div class="y-section">
                <h4>석차등급 기재 과목 (일반/공통)
                    <button class="btn-sm" onclick="addRow('kRanked')">+ 과목 추가</button>
                </h4>
                ${tableStyle}
                    <th width="60">등급</th><th width="80">수강자수</th><th width="40">삭제</th></tr>
                </thead>
                <tbody>
                    ${calcState.kRanked.map((r, i) => `
                        <tr>
                            <td><input type="text" value="${r.name}" onchange="upRow('kRanked',${i},'name',this.value)"></td>
                            <td><input type="number" value="${r.credit}" onchange="upRow('kRanked',${i},'credit',this.value)"></td>
                            <td><input type="number" value="${r.rank}" min="1" max="9" onchange="upRow('kRanked',${i},'rank',this.value)"></td>
                            <td><input type="number" value="${r.studentsNum}" onchange="upRow('kRanked',${i},'studentsNum',this.value)"></td>
                            <td><button class="btn-sm" style="color:var(--danger);" onclick="remRow('kRanked',${i})">X</button></td>
                        </tr>
                    `).join('')}
                </tbody></table>
            </div>
        `;

        const achHtml = `
            <div class="y-section">
                <h4>성취도 기재 과목 (진로선택 등)
                    <button class="btn-sm" onclick="addRow('kAch')">+ 과목 추가</button>
                </h4>
                ${tableStyle}
                    <th width="70">성취도</th><th width="70">A비율(%)</th><th width="70">B비율(%)</th><th width="70">C비율(%)</th><th width="40">삭제</th></tr>
                </thead>
                <tbody>
                    ${calcState.kAch.map((r, i) => `
                        <tr>
                            <td><input type="text" value="${r.name}" onchange="upRow('kAch',${i},'name',this.value)"></td>
                            <td><input type="number" value="${r.credit}" onchange="upRow('kAch',${i},'credit',this.value)"></td>
                            <td>
                                <select onchange="upRow('kAch',${i},'ach',this.value)">
                                    ${['A','B','C'].map(x => `<option ${r.ach===x?'selected':''}>${x}</option>`).join('')}
                                </select>
                            </td>
                            <td><input type="number" value="${r.aRatio}" onchange="upRow('kAch',${i},'aRatio',this.value)"></td>
                            <td><input type="number" value="${r.bRatio}" onchange="upRow('kAch',${i},'bRatio',this.value)"></td>
                            <td><input type="number" value="${r.cRatio}" onchange="upRow('kAch',${i},'cRatio',this.value)"></td>
                            <td><button class="btn-sm" style="color:var(--danger);" onclick="remRow('kAch',${i})">X</button></td>
                        </tr>
                    `).join('')}
                </tbody></table>
            </div>
        `;

        container.innerHTML = `
            <div class="y-calc-grid">
                <div class="calc-inputs" style="max-height: 700px; overflow-y: auto; padding-right: 10px;">
                    ${rankedHtml}
                    ${achHtml}
                </div>
                <div>
                    <div class="y-results" style="background: #1e3a8a;">
                        <div style="font-size: 0.9rem; color: #bfdbfe; margin-bottom: 15px;">대상: <strong>${calcState.studentName || '직접 입력'}</strong></div>
                        <div class="y-res-row">
                            <span>교과평균등급 (x)</span>
                            <span><span id="k-avg-grade">0.00</span> 등급</span>
                        </div>
                        <div class="y-res-row">
                            <span>교과평균등급점수 (100점 만점)</span>
                            <span><span id="k-avg-score">0.00</span> 점</span>
                        </div>
                        <div style="margin:15px 0; border-top: 1px dashed rgba(255,255,255,0.2);"></div>
                        <div class="y-res-total">
                            <span>최종 반영 점수 <span style="font-size:0.7rem; font-weight:normal; color:#bfdbfe;">(x 0.9)</span></span>
                            <span><span id="k-final-score">0.00</span> / 90</span>
                        </div>
                        <div style="margin-top: 20px;">
                            <button class="btn btn-green" style="width: 100%; justify-content:center;" onclick="calculateKoreaScore()">🔄 점수 재계산</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function calculateKoreaScore() {
        let totalWeightedGrade = 0;
        let totalCredit = 0;

        calcState.kRanked.forEach(r => {
            if (r.credit <= 0) return;
            let adjustedGrade = r.rank;
            const n = r.studentsNum;
            const g = r.rank;
            if (n === 1 && g === 1) adjustedGrade -= 4;
            else if (n === 2 && g <= 2) adjustedGrade -= 3;
            else if (n >= 3 && n <= 4 && g <= 5) adjustedGrade -= 2;
            else if (n >= 5 && n <= 12 && g <= 7) adjustedGrade -= 1;
            totalWeightedGrade += adjustedGrade * r.credit;
            totalCredit += r.credit;
        });

        calcState.kAch.forEach(r => {
            if (r.credit <= 0) return;
            let convertedGrade = 0;
            const a = r.aRatio;
            const b = r.bRatio;
            const c = r.cRatio;
            if (r.ach === 'A') convertedGrade = 1;
            else if (r.ach === 'B') convertedGrade = getKoreaGradeFromRatio(a) + ((a + b) / 100);
            else if (r.ach === 'C') convertedGrade = getKoreaGradeFromRatio(a + b) + ((a + b + c) / 100);
            totalWeightedGrade += convertedGrade * r.credit;
            totalCredit += r.credit;
        });

        const x = totalCredit > 0 ? (totalWeightedGrade / totalCredit) : 0;
        const scoreTable = {1:100, 2:96, 3:92, 4:86, 5:70, 6:55, 7:40, 8:20, 9:0, 10:0};
        
        let gradeScore = 0;
        if (x > 0) {
            let n = Math.floor(x);
            if (n < 1) n = 1;
            if (n > 9) n = 9;
            const a_n = scoreTable[n];
            const a_np1 = scoreTable[n + 1] || 0;
            if (x === n) gradeScore = a_n;
            else gradeScore = (a_n - a_np1) * (n + 1 - x) + a_np1;
        }

        const finalScore = gradeScore * 0.9;
        const eAvgGrade = document.getElementById('k-avg-grade');
        if (eAvgGrade) {
            eAvgGrade.textContent = x.toFixed(4);
            document.getElementById('k-avg-score').textContent = gradeScore.toFixed(4);
            document.getElementById('k-final-score').textContent = finalScore.toFixed(4);
        }
    }

    // === 서강대학교 ===
    function renderSogangUI() {
        const container = getCalcContainer();
        const tableStyle = `<table class="y-table"><thead><tr><th>과목명</th><th width="50">단위</th>`;

        const rankedHtml = `
            <div class="y-section">
                <h4>석차등급 기재 과목
                    <button class="btn-sm" onclick="addRow('sgRanked')">+ 과목 추가</button>
                </h4>
                ${tableStyle}
                    <th width="70">등급</th><th width="40">삭제</th></tr>
                </thead>
                <tbody>
                    ${calcState.sgRanked.map((r, i) => `
                        <tr>
                            <td><input type="text" value="${r.name}" onchange="upRow('sgRanked',${i},'name',this.value)"></td>
                            <td><input type="number" value="${r.credit}" onchange="upRow('sgRanked',${i},'credit',this.value)"></td>
                            <td><input type="number" value="${r.rank}" min="1" max="9" onchange="upRow('sgRanked',${i},'rank',this.value)"></td>
                            <td><button class="btn-sm" style="color:var(--danger);" onclick="remRow('sgRanked',${i})">X</button></td>
                        </tr>
                    `).join('')}
                </tbody></table>
            </div>
        `;

        const achHtml = `
            <div class="y-section">
                <h4>성취도 및 비율 기재 과목
                    <button class="btn-sm" onclick="addRow('sgAch')">+ 과목 추가</button>
                </h4>
                ${tableStyle}
                    <th width="65">성취도</th>
                    <th width="50">A(%)</th><th width="50">B(%)</th><th width="50">C(%)</th><th width="50">D(%)</th><th width="50">E(%)</th>
                    <th width="40">삭제</th></tr>
                </thead>
                <tbody>
                    ${calcState.sgAch.map((r, i) => `
                        <tr>
                            <td><input type="text" value="${r.name}" onchange="upRow('sgAch',${i},'name',this.value)"></td>
                            <td><input type="number" value="${r.credit}" onchange="upRow('sgAch',${i},'credit',this.value)"></td>
                            <td>
                                <select onchange="upRow('sgAch',${i},'ach',this.value)">
                                    ${['A','B','C','D','E'].map(x => `<option ${r.ach===x?'selected':''}>${x}</option>`).join('')}
                                </select>
                            </td>
                            <td><input type="number" value="${r.aRatio}" onchange="upRow('sgAch',${i},'aRatio',this.value)"></td>
                            <td><input type="number" value="${r.bRatio}" onchange="upRow('sgAch',${i},'bRatio',this.value)"></td>
                            <td><input type="number" value="${r.cRatio}" onchange="upRow('sgAch',${i},'cRatio',this.value)"></td>
                            <td><input type="number" value="${r.dRatio}" onchange="upRow('sgAch',${i},'dRatio',this.value)"></td>
                            <td><input type="number" value="${r.eRatio}" onchange="upRow('sgAch',${i},'eRatio',this.value)"></td>
                            <td><button class="btn-sm" style="color:var(--danger);" onclick="remRow('sgAch',${i})">X</button></td>
                        </tr>
                    `).join('')}
                </tbody></table>
            </div>
        `;

        container.innerHTML = `
            <div class="y-calc-grid">
                <div class="calc-inputs" style="max-height: 700px; overflow-y: auto; padding-right: 10px;">
                    ${rankedHtml}
                    ${achHtml}
                </div>
                <div>
                    <div class="y-results" style="background: #b91c1c;"> <!-- 서강대 색상 톤 (빨강) -->
                        <div style="font-size: 0.9rem; color: #fecaca; margin-bottom: 15px;">대상: <strong>${calcState.studentName || '직접 입력'}</strong></div>
                        <div class="y-res-row">
                            <span>등급평균 (소수점 넷째 자리)</span>
                            <span><span id="sg-avg-grade">0.0000</span> 등급</span>
                        </div>
                        <div class="y-res-row">
                            <span>등급 계산 점수</span>
                            <span><span id="sg-grade-score">0.00</span> / 900</span>
                        </div>
                        <div class="y-res-row">
                            <span>비율 계산 점수</span>
                            <span><span id="sg-ratio-score">0.00</span> / 100</span>
                        </div>
                        <div style="margin:15px 0; border-top: 1px dashed rgba(255,255,255,0.2);"></div>
                        <div class="y-res-total">
                            <span>최종 반영 점수</span>
                            <span><span id="sg-final-score">0.00</span> / 1000</span>
                        </div>
                        <div style="margin-top: 20px;">
                            <button class="btn btn-green" style="width: 100%; justify-content:center;" onclick="calculateSogangScore()">🔄 점수 재계산</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function calculateSogangScore() {
        let totalGradeCredit = 0;
        let sumGradeCredit = 0;
        
        calcState.sgRanked.forEach(r => {
            if (r.credit <= 0) return;
            sumGradeCredit += r.rank * r.credit;
            totalGradeCredit += r.credit;
        });

        let gradeAvg = totalGradeCredit > 0 ? (sumGradeCredit / totalGradeCredit) : 0;
        gradeAvg = Math.round(gradeAvg * 10000) / 10000; 
        let gradeScore = totalGradeCredit > 0 ? (10 - gradeAvg) * 100 : 0;

        let totalAchCredit = 0;
        let sumAchRatioCredit = 0;

        calcState.sgAch.forEach(r => {
            if (r.credit <= 0) return;
            let a = r.aRatio || 0;
            let b = r.bRatio || 0;
            let c = r.cRatio || 0;
            let d = r.dRatio || 0;
            let e = r.eRatio || 0;
            let convRatio = 0;

            if (r.ach === 'A') convRatio = a / 2;
            else if (r.ach === 'B') convRatio = b / 2 + a;
            else if (r.ach === 'C') convRatio = c / 2 + a + b;
            else if (r.ach === 'D') convRatio = d / 2 + a + b + c;
            else if (r.ach === 'E') convRatio = e / 2 + a + b + c + d;

            sumAchRatioCredit += convRatio * r.credit;
            totalAchCredit += r.credit;
        });

        let ratioScore = 100;
        if (totalAchCredit > 0) {
            ratioScore = 100 - (sumAchRatioCredit / totalAchCredit);
        }
        if (ratioScore > 100) ratioScore = 100;

        let finalScore = gradeScore + ratioScore;
        finalScore = Math.round(finalScore * 100) / 100; 

        const eAvgGrade = document.getElementById('sg-avg-grade');
        if (eAvgGrade) {
            eAvgGrade.textContent = totalGradeCredit > 0 ? gradeAvg.toFixed(4) : "0.0000";
            document.getElementById('sg-grade-score').textContent = gradeScore.toFixed(2);
            document.getElementById('sg-ratio-score').textContent = ratioScore.toFixed(2);
            document.getElementById('sg-final-score').textContent = finalScore.toFixed(2);
        }
    }

    // === 성균관대학교 ===
    function upSkkQual(val) {
        let v = parseFloat(val);
        if (isNaN(v)) v = 0;
        if (v < 0) v = 0;
        if (v > 200) v = 200;
        calcState.skkQual = v;
        calculateSungkyunkwanScore();
    }

    function renderSungkyunkwanUI() {
        const container = getCalcContainer();
        const tableStyle = `<table class="y-table"><thead><tr><th>과목명</th><th width="50">단위</th>`;

        const aHtml = `
            <div class="y-section">
                <h4>A군 과목 (국/수/영/사/과/한국사)
                    <button class="btn-sm" onclick="addRow('skkA')">+ 과목 추가</button>
                </h4>
                ${tableStyle}
                    <th width="70">등급</th><th width="40">삭제</th></tr>
                </thead>
                <tbody>
                    ${calcState.skkA.map((r, i) => `
                        <tr>
                            <td><input type="text" value="${r.name}" onchange="upRow('skkA',${i},'name',this.value)"></td>
                            <td><input type="number" value="${r.credit}" onchange="upRow('skkA',${i},'credit',this.value)"></td>
                            <td><input type="number" value="${r.rank}" min="1" max="9" onchange="upRow('skkA',${i},'rank',this.value)"></td>
                            <td><button class="btn-sm" style="color:var(--danger);" onclick="remRow('skkA',${i})">X</button></td>
                        </tr>
                    `).join('')}
                </tbody></table>
            </div>
        `;

        const bHtml = `
            <div class="y-section">
                <h4>B군 과목 (기·가/제2외국어/한문)
                    <button class="btn-sm" onclick="addRow('skkB')">+ 과목 추가</button>
                </h4>
                ${tableStyle}
                    <th width="70">등급</th><th width="40">삭제</th></tr>
                </thead>
                <tbody>
                    ${calcState.skkB.map((r, i) => `
                        <tr>
                            <td><input type="text" value="${r.name}" onchange="upRow('skkB',${i},'name',this.value)"></td>
                            <td><input type="number" value="${r.credit}" onchange="upRow('skkB',${i},'credit',this.value)"></td>
                            <td><input type="number" value="${r.rank}" min="1" max="9" onchange="upRow('skkB',${i},'rank',this.value)"></td>
                            <td><button class="btn-sm" style="color:var(--danger);" onclick="remRow('skkB',${i})">X</button></td>
                        </tr>
                    `).join('')}
                </tbody></table>
            </div>
        `;

        const qualHtml = `
            <div class="y-section">
                <h4>정성평가 점수</h4>
                <div style="font-size:0.8rem; color:#64748b; margin-bottom:8px;">정성평가는 200점 만점의 입학사정관 종합평가입니다. 예상 점수를 입력해주세요.</div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <input type="number" value="${calcState.skkQual}" min="0" max="200" onchange="upSkkQual(this.value)" style="width:120px; padding:8px; border:1px solid var(--primary); border-radius:4px; font-weight:bold; font-size:1rem;">
                    <span style="font-size:0.9rem; color:#64748b;">점 / 200</span>
                </div>
            </div>
        `;

        container.innerHTML = `
            <div class="y-calc-grid">
                <div class="calc-inputs" style="max-height: 700px; overflow-y: auto; padding-right: 10px;">
                    ${aHtml}
                    ${bHtml}
                    ${qualHtml}
                </div>
                <div>
                    <div class="y-results" style="background: #064e3b;"> <!-- 성균관대 색상 테마 -->
                        <div style="font-size: 0.9rem; color: #a7f3d0; margin-bottom: 15px;">대상: <strong>${calcState.studentName || '직접 입력'}</strong></div>
                        <div class="y-res-row">
                            <span>A군 점수 <span style="font-size:0.75rem; color:#a7f3d0;">(x 7)</span></span>
                            <span><span id="skk-a-score">0.00</span> / 700</span>
                        </div>
                        <div class="y-res-row">
                            <span>B군 점수 <span style="font-size:0.75rem; color:#a7f3d0;">(x 1)</span></span>
                            <span><span id="skk-b-score">0.00</span> / 100</span>
                        </div>
                        <div class="y-res-row">
                            <span>정성평가 점수</span>
                            <span><span id="skk-qual-score">0.00</span> / 200</span>
                        </div>
                        <div style="margin:15px 0; border-top: 1px dashed rgba(255,255,255,0.2);"></div>
                        <div class="y-res-total">
                            <span>최종 환산 점수</span>
                            <span><span id="skk-final-score">0.00</span> / 1000</span>
                        </div>
                        <div style="margin-top: 20px;">
                            <button class="btn btn-green" style="width: 100%; justify-content:center; background-color:#10b981; color:white;" onclick="calculateSungkyunkwanScore()">🔄 점수 재계산</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function calculateSungkyunkwanScore() {
        const mapA = {1:100, 2:96, 3:90, 4:80, 5:65, 6:45, 7:20, 8:10, 9:0};
        const mapB = {1:100, 2:98, 3:95, 4:90, 5:80, 6:50, 7:30, 8:10, 9:0};
        
        let aCredit = 0, aScore = 0;
        calcState.skkA.forEach(r => {
            if (r.credit <= 0) return;
            aCredit += r.credit;
            aScore += (mapA[r.rank] || 0) * r.credit;
        });
        let finalA = aCredit > 0 ? (aScore / aCredit) * 7 : 0;

        let bCredit = 0, bScore = 0;
        calcState.skkB.forEach(r => {
            if (r.credit <= 0) return;
            bCredit += r.credit;
            bScore += (mapB[r.rank] || 0) * r.credit;
        });
        let finalB = bCredit > 0 ? (bScore / bCredit) * 1 : 100; 

        let qual = calcState.skkQual || 0;
        let total = finalA + finalB + qual;

        const eA = document.getElementById('skk-a-score');
        if (eA) {
            eA.textContent = finalA.toFixed(2);
            document.getElementById('skk-b-score').textContent = finalB.toFixed(2);
            document.getElementById('skk-qual-score').textContent = qual.toFixed(2);
            document.getElementById('skk-final-score').textContent = total.toFixed(2);
        }
    }

    // === 중앙대학교 ===
    function upCauAbsence(val) {
        let v = parseInt(val);
        if (isNaN(v) || v < 0) v = 0;
        calcState.cauAbsence = v;
        calculateChungangScore();
    }

    function renderChungangUI() {
        const container = getCalcContainer();
        const tableStyle = `<table class="y-table"><thead><tr><th>과목명</th>`;

        const rankedHtml = `
            <div class="y-section">
                <h4>공통 및 일반선택과목 (국/수/영/사/과)
                    <button class="btn-sm" onclick="addRow('cauRanked')">+ 과목 추가</button>
                </h4>
                ${tableStyle}
                    <th width="60">단위</th><th width="70">등급</th><th width="40">삭제</th></tr>
                </thead>
                <tbody>
                    ${calcState.cauRanked.map((r, i) => `
                        <tr>
                            <td><input type="text" value="${r.name}" onchange="upRow('cauRanked',${i},'name',this.value)"></td>
                            <td><input type="number" value="${r.credit}" onchange="upRow('cauRanked',${i},'credit',this.value)"></td>
                            <td><input type="number" value="${r.rank}" min="1" max="9" onchange="upRow('cauRanked',${i},'rank',this.value)"></td>
                            <td><button class="btn-sm" style="color:var(--danger);" onclick="remRow('cauRanked',${i})">X</button></td>
                        </tr>
                    `).join('')}
                </tbody></table>
            </div>
        `;

        const careerHtml = `
            <div class="y-section">
                <h4>진로선택과목 (국/수/영/사/과)
                    <button class="btn-sm" onclick="addRow('cauCareer')">+ 과목 추가</button>
                </h4>
                <div style="font-size:0.75rem; color:#64748b; margin-bottom:5px;">* 진로선택과목은 이수단위를 반영하지 않습니다.</div>
                ${tableStyle}
                    <th width="100">성취도(A/B/C)</th><th width="40">삭제</th></tr>
                </thead>
                <tbody>
                    ${calcState.cauCareer.map((r, i) => `
                        <tr>
                            <td><input type="text" value="${r.name}" onchange="upRow('cauCareer',${i},'name',this.value)"></td>
                            <td>
                                <select onchange="upRow('cauCareer',${i},'ach',this.value)">
                                    ${['A','B','C'].map(x => `<option ${r.ach===x?'selected':''}>${x}</option>`).join('')}
                                </select>
                            </td>
                            <td><button class="btn-sm" style="color:var(--danger);" onclick="remRow('cauCareer',${i})">X</button></td>
                        </tr>
                    `).join('')}
                </tbody></table>
            </div>
        `;

        const absenceHtml = `
            <div class="y-section">
                <h4>비교과 (출결)</h4>
                <div style="font-size:0.8rem; color:#64748b; margin-bottom:8px;">미인정 결석 일수를 입력해주세요. (0~1일 만점)</div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <input type="number" value="${calcState.cauAbsence}" min="0" onchange="upCauAbsence(this.value)" style="width:100px; padding:8px; border:1px solid var(--primary); border-radius:4px; font-weight:bold; font-size:1rem;">
                    <span style="font-size:0.9rem; color:#64748b;">일</span>
                </div>
            </div>
        `;

        container.innerHTML = `
            <div class="y-calc-grid">
                <div class="calc-inputs" style="max-height: 700px; overflow-y: auto; padding-right: 10px;">
                    ${rankedHtml}
                    ${careerHtml}
                    ${absenceHtml}
                </div>
                <div>
                    <div class="y-results" style="background: #020617;"> <!-- 중앙대 다크 테마 -->
                        <div style="font-size: 0.9rem; color: #94a3b8; margin-bottom: 15px;">대상: <strong>${calcState.studentName || '직접 입력'}</strong></div>
                        <div class="y-res-row">
                            <span>교과 점수 <span style="font-size:0.75rem; color:#94a3b8;">(공통/일반 90% + 진로 10%)</span></span>
                            <span><span id="cau-subject-score">0.00</span> / 900</span>
                        </div>
                        <div class="y-res-row">
                            <span>비교과 점수 <span style="font-size:0.75rem; color:#94a3b8;">(출결)</span></span>
                            <span><span id="cau-absence-score">0.00</span> / 100</span>
                        </div>
                        <div style="margin:15px 0; border-top: 1px dashed rgba(255,255,255,0.2);"></div>
                        <div class="y-res-total">
                            <span>최종 반영 점수</span>
                            <span><span id="cau-final-score">0.00</span> / 1000</span>
                        </div>
                        <div style="margin-top: 20px;">
                            <button class="btn btn-green" style="width: 100%; justify-content:center;" onclick="calculateChungangScore()">🔄 점수 재계산</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function calculateChungangScore() {
        const cauRankMap = {1:10.00, 2:9.71, 3:9.43, 4:9.14, 5:8.86, 6:8.57, 7:8.00, 8:6.57, 9:3.40};
        const cauAchMap = {'A':10.00, 'B':9.43, 'C':8.86};

        // 1. 공통/일반선택 평균
        let commonCredit = 0;
        let commonScoreSum = 0;
        calcState.cauRanked.forEach(r => {
            if (r.credit <= 0) return;
            commonCredit += r.credit;
            commonScoreSum += (cauRankMap[r.rank] || 0) * r.credit;
        });
        let commonAvg = commonCredit > 0 ? (commonScoreSum / commonCredit) : 0;
        commonAvg = Math.round(commonAvg * 10000) / 10000;

        // 2. 진로선택 평균
        let careerScoreSum = 0;
        let careerCount = 0;
        calcState.cauCareer.forEach(r => {
            if (r.ach && cauAchMap[r.ach]) {
                careerCount++;
                careerScoreSum += cauAchMap[r.ach];
            }
        });
        
        let careerAvg = careerCount > 0 ? (careerScoreSum / careerCount) : commonAvg;
        careerAvg = Math.round(careerAvg * 10000) / 10000;

        // 3. 교과 최종 점수
        let combinedScore = (commonAvg * 0.9) + (careerAvg * 0.1);
        let subjectFinal = combinedScore * 90;

        // 4. 비교과(출결) 점수 계산
        let absence = parseInt(calcState.cauAbsence) || 0;
        let absenceScore = 10;
        if (absence <= 1) absenceScore = 10;
        else if (absence <= 3) absenceScore = 9.2;
        else if (absence <= 5) absenceScore = 7.8;
        else if (absence <= 7) absenceScore = 5.6;
        else if (absence <= 9) absenceScore = 4.2;
        else absenceScore = 3.4;

        let nonSubjectFinal = absenceScore * 10;

        // 5. 최종 총합
        let finalScore = subjectFinal + nonSubjectFinal;

        const eSubj = document.getElementById('cau-subject-score');
        if (eSubj) {
            eSubj.textContent = subjectFinal.toFixed(2);
            document.getElementById('cau-absence-score').textContent = nonSubjectFinal.toFixed(2);
            document.getElementById('cau-final-score').textContent = finalScore.toFixed(2);
        }
    }

    // === 경희대학교 ===
    function upKhAbsence(val) {
        let v = parseInt(val);
        if (isNaN(v) || v < 0) v = 0;
        calcState.khAbsence = v;
        calculateKyungheeScore();
    }
    
    function upKhVolunteer(val) {
        let v = parseInt(val);
        if (isNaN(v) || v < 0) v = 0;
        calcState.khVolunteer = v;
        calculateKyungheeScore();
    }

    function upKhQual(val) {
        let v = parseFloat(val);
        if (isNaN(v) || v < 0) v = 0;
        if (v > 300) v = 300;
        calcState.khQual = v;
        calculateKyungheeScore();
    }

    function renderKyungheeUI() {
        const container = getCalcContainer();
        const tableStyle = `<table class="y-table"><thead><tr><th>과목명</th><th width="50">단위</th>`;

        const rankedHtml = `
            <div class="y-section">
                <h4>공통 및 일반선택과목
                    <button class="btn-sm" onclick="addRow('khRanked')">+ 과목 추가</button>
                </h4>
                ${tableStyle}
                    <th width="70">등급</th><th width="40">삭제</th></tr>
                </thead>
                <tbody>
                    ${calcState.khRanked.map((r, i) => `
                        <tr>
                            <td><input type="text" value="${r.name}" onchange="upRow('khRanked',${i},'name',this.value)"></td>
                            <td><input type="number" value="${r.credit}" onchange="upRow('khRanked',${i},'credit',this.value)"></td>
                            <td><input type="number" value="${r.rank}" min="1" max="9" onchange="upRow('khRanked',${i},'rank',this.value)"></td>
                            <td><button class="btn-sm" style="color:var(--danger);" onclick="remRow('khRanked',${i})">X</button></td>
                        </tr>
                    `).join('')}
                </tbody></table>
            </div>
        `;

        const careerHtml = `
            <div class="y-section">
                <h4>진로선택과목
                    <button class="btn-sm" onclick="addRow('khCareer')">+ 과목 추가</button>
                </h4>
                <div style="font-size:0.75rem; color:#64748b; margin-bottom:5px;">* 성취도 점수가 높은 상위 3과목만 자동 추출되어 반영됩니다.</div>
                ${tableStyle}
                    <th width="100">성취도(A/B/C)</th><th width="40">삭제</th></tr>
                </thead>
                <tbody>
                    ${calcState.khCareer.map((r, i) => `
                        <tr>
                            <td><input type="text" value="${r.name}" onchange="upRow('khCareer',${i},'name',this.value)"></td>
                            <td><input type="number" value="${r.credit}" onchange="upRow('khCareer',${i},'credit',this.value)"></td>
                            <td>
                                <select onchange="upRow('khCareer',${i},'ach',this.value)">
                                    ${['A','B','C'].map(x => `<option ${r.ach===x?'selected':''}>${x}</option>`).join('')}
                                </select>
                            </td>
                            <td><button class="btn-sm" style="color:var(--danger);" onclick="remRow('khCareer',${i})">X</button></td>
                        </tr>
                    `).join('')}
                </tbody></table>
            </div>
        `;

        const nonsubjHtml = `
            <div class="y-section">
                <h4>비교과 (출결 및 봉사)</h4>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-top:10px;">
                    <div>
                        <div style="font-size:0.8rem; color:#64748b; margin-bottom:5px;">미인정 결석 (0~2일 만점)</div>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <input type="number" value="${calcState.khAbsence}" min="0" onchange="upKhAbsence(this.value)" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:4px;">
                            <span style="font-size:0.9rem; color:#64748b;">일</span>
                        </div>
                    </div>
                    <div>
                        <div style="font-size:0.8rem; color:#64748b; margin-bottom:5px;">봉사시간 (15시간 이상 만점)</div>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <input type="number" value="${calcState.khVolunteer}" min="0" onchange="upKhVolunteer(this.value)" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:4px;">
                            <span style="font-size:0.9rem; color:#64748b;">시간</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const qualHtml = `
            <div class="y-section">
                <h4>교과종합평가 점수</h4>
                <div style="font-size:0.8rem; color:#64748b; margin-bottom:8px;">경희대 교과종합평가(300점 만점) 예상 점수를 입력해주세요.</div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <input type="number" value="${calcState.khQual}" min="0" max="300" onchange="upKhQual(this.value)" style="width:120px; padding:8px; border:1px solid var(--primary); border-radius:4px; font-weight:bold; font-size:1rem;">
                    <span style="font-size:0.9rem; color:#64748b;">점 / 300</span>
                </div>
            </div>
        `;

        container.innerHTML = `
            <div class="y-calc-grid">
                <div class="calc-inputs" style="max-height: 700px; overflow-y: auto; padding-right: 10px;">
                    ${rankedHtml}
                    ${careerHtml}
                    ${nonsubjHtml}
                    ${qualHtml}
                </div>
                <div>
                    <div class="y-results" style="background: #7f1d1d;"> <!-- 경희대 다크레드 테마 -->
                        <div style="font-size: 0.9rem; color: #fecaca; margin-bottom: 15px;">대상: <strong>${calcState.studentName || '직접 입력'}</strong></div>
                        <div class="y-res-row">
                            <span>교과 점수 <span style="font-size:0.75rem; color:#fecaca;">(560점 만점)</span></span>
                            <span><span id="kh-subj-score">0.00</span> / 560</span>
                        </div>
                        <div class="y-res-row">
                            <span>비교과 점수 <span style="font-size:0.75rem; color:#fecaca;">(140점 만점)</span></span>
                            <span><span id="kh-nonsubj-score">0.00</span> / 140</span>
                        </div>
                        <div class="y-res-row">
                            <span>교과종합평가 점수 <span style="font-size:0.75rem; color:#fecaca;">(입력값)</span></span>
                            <span><span id="kh-qual-score">0.00</span> / 300</span>
                        </div>
                        <div style="margin:15px 0; border-top: 1px dashed rgba(255,255,255,0.2);"></div>
                        <div class="y-res-total">
                            <span>최종 반영 점수</span>
                            <span><span id="kh-final-score">0.00</span> / 1000</span>
                        </div>
                        <div style="margin-top: 20px;">
                            <button class="btn btn-green" style="width: 100%; justify-content:center; background-color:#ef4444; color:white; border:none;" onclick="calculateKyungheeScore()">🔄 점수 재계산</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function calculateKyungheeScore() {
        const rankMap = {1:100, 2:96, 3:89, 4:77, 5:60, 6:40, 7:23, 8:11, 9:0};
        const achMap = {'A':100, 'B':80, 'C':60};

        // 1. 공통/일반 점수 산출
        let cCredit = 0, cScore = 0;
        calcState.khRanked.forEach(r => {
            if (r.credit <= 0) return;
            cCredit += r.credit;
            cScore += (rankMap[r.rank] || 0) * r.credit;
        });

        // 2. 진로선택 점수 산출 (상위 3과목)
        let careerList = calcState.khCareer.filter(r => r.credit > 0 && ['A','B','C'].includes(r.ach));
        // 성취도 높은 순으로 정렬
        careerList.sort((a, b) => achMap[b.ach] - achMap[a.ach]);
        let top3 = careerList.slice(0, 3);
        
        let carCredit = 0, carScore = 0;
        top3.forEach(r => {
            carCredit += r.credit;
            carScore += achMap[r.ach] * r.credit;
        });

        // 3. 교과 성적 총합 (최대 100점 기준)
        let partA = 0;
        let partB = 0;
        
        if (cCredit > 0) {
            if (top3.length === 0) {
                // 진로선택과목이 0개일 경우, 공통/일반과목 100% 반영
                partA = (cScore / cCredit) * 1.0;
            } else {
                partA = (cScore / cCredit) * 0.8;
                partB = (carScore / carCredit) * 0.2;
            }
        }
        let totalSubj = partA + partB; // 최대 100점

        // 4. 비교과 성적 산출 (결석)
        let abs = parseInt(calcState.khAbsence) || 0;
        let absScore = 0;
        if(abs <= 2) absScore = 50;
        else if(abs <= 4) absScore = 44;
        else if(abs <= 6) absScore = 38;
        else if(abs <= 8) absScore = 32;
        else if(abs <= 10) absScore = 26;
        else if(abs <= 12) absScore = 20;
        else if(abs <= 14) absScore = 14;
        else if(abs <= 16) absScore = 8;
        else absScore = 0;

        // 5. 비교과 성적 산출 (봉사)
        let vol = parseInt(calcState.khVolunteer) || 0;
        let volScore = 0;
        if(vol >= 15) volScore = 50;
        else if(vol >= 13) volScore = 45;
        else if(vol >= 11) volScore = 40;
        else if(vol >= 9) volScore = 35;
        else if(vol >= 7) volScore = 30;
        else if(vol >= 5) volScore = 24;
        else if(vol >= 3) volScore = 18;
        else if(vol >= 1) volScore = 12;
        else volScore = 0;

        let totalNonSubj = absScore + volScore; // 최대 100점

        // 6. 최종 환산 점수
        let finalSubj = totalSubj * 5.6; // 최대 560점
        let finalNonSubj = totalNonSubj * 1.4; // 최대 140점
        let qual = parseFloat(calcState.khQual) || 0;
        if (qual > 300) qual = 300;
        
        let grandTotal = finalSubj + finalNonSubj + qual; // 최대 1000점

        // DOM Update
        const eSubj = document.getElementById('kh-subj-score');
        if (eSubj) {
            eSubj.textContent = finalSubj.toFixed(2);
            document.getElementById('kh-nonsubj-score').textContent = finalNonSubj.toFixed(2);
            document.getElementById('kh-qual-score').textContent = qual.toFixed(2);
            document.getElementById('kh-final-score').textContent = grandTotal.toFixed(2);
        }
    }

    // === 한국외국어대학교 ===
    function renderHufsUI() {
        const container = getCalcContainer();
        const tableStyle = `<table class="y-table"><thead><tr><th>교과구분</th><th>과목명</th><th width="50">단위</th>`;

        const rankedHtml = `
            <div class="y-section">
                <h4>공통/일반선택과목
                    <button class="btn-sm" onclick="addRow('hufsRanked')">+ 과목 추가</button>
                </h4>
                ${tableStyle}
                    <th width="70">등급</th><th width="70">원점수</th><th width="40">삭제</th></tr>
                </thead>
                <tbody>
                    ${calcState.hufsRanked.map((r, i) => `
                        <tr>
                            <td>
                                <select onchange="upRow('hufsRanked',${i},'subjType',this.value)">
                                    <option value="other" ${r.subjType==='other'?'selected':''}>수학 외(국/영/사/과/한)</option>
                                    <option value="math" ${r.subjType==='math'?'selected':''}>수학</option>
                                </select>
                            </td>
                            <td><input type="text" value="${r.name}" onchange="upRow('hufsRanked',${i},'name',this.value)"></td>
                            <td><input type="number" value="${r.credit}" onchange="upRow('hufsRanked',${i},'credit',this.value)"></td>
                            <td><input type="number" value="${r.rank}" min="1" max="9" onchange="upRow('hufsRanked',${i},'rank',this.value)"></td>
                            <td><input type="number" value="${r.raw}" onchange="upRow('hufsRanked',${i},'raw',this.value)"></td>
                            <td><button class="btn-sm" style="color:var(--danger);" onclick="remRow('hufsRanked',${i})">X</button></td>
                        </tr>
                    `).join('')}
                </tbody></table>
            </div>
        `;

        const careerHtml = `
            <div class="y-section">
                <h4>진로선택과목
                    <button class="btn-sm" onclick="addRow('hufsCareer')">+ 과목 추가</button>
                </h4>
                <table class="y-table"><thead><tr><th>과목명</th><th width="50">단위</th>
                    <th width="100">성취도(A/B/C)</th><th width="40">삭제</th></tr>
                </thead>
                <tbody>
                    ${calcState.hufsCareer.map((r, i) => `
                        <tr>
                            <td><input type="text" value="${r.name}" onchange="upRow('hufsCareer',${i},'name',this.value)"></td>
                            <td><input type="number" value="${r.credit}" onchange="upRow('hufsCareer',${i},'credit',this.value)"></td>
                            <td>
                                <select onchange="upRow('hufsCareer',${i},'ach',this.value)">
                                    ${['A','B','C'].map(x => `<option ${r.ach===x?'selected':''}>${x}</option>`).join('')}
                                </select>
                            </td>
                            <td><button class="btn-sm" style="color:var(--danger);" onclick="remRow('hufsCareer',${i})">X</button></td>
                        </tr>
                    `).join('')}
                </tbody></table>
            </div>
        `;

        container.innerHTML = `
            <div class="y-calc-grid">
                <div class="calc-inputs" style="max-height: 700px; overflow-y: auto; padding-right: 10px;">
                    ${rankedHtml}
                    ${careerHtml}
                </div>
                <div>
                    <div class="y-results" style="background: #005A64;"> <!-- 한국외대 색상 톤 (청록색 계열) -->
                        <div style="font-size: 0.9rem; color: #a5f3fc; margin-bottom: 15px;">대상: <strong>${calcState.studentName || '직접 입력'}</strong></div>
                        <div class="y-res-total">
                            <span>최종 환산 점수</span>
                            <span><span id="hufs-final-score">0.00000</span> / 1000</span>
                        </div>
                        <div style="margin:15px 0; border-top: 1px dashed rgba(255,255,255,0.2);"></div>
                        <div style="margin-top: 20px;">
                            <button class="btn btn-green" style="width: 100%; justify-content:center; background-color:#0891b2; color:white; border:none;" onclick="calculateHufsScore()">🔄 점수 재계산</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function calculateHufsScore() {
        const rankMap = {1:1000, 2:960, 3:890, 4:770, 5:600, 6:400, 7:230, 8:110, 9:0};
        const achMap = {'A':1000, 'B':960, 'C':890};

        let totalScoreSum = 0;
        let totalCredit = 0;

        calcState.hufsRanked.forEach(r => {
            if (r.credit <= 0) return;
            
            let rankScore = rankMap[r.rank] || 0;
            let rawScore = 0;
            
            if (r.subjType === 'math') {
                if (r.raw >= 90) rawScore = 1000;
                else if (r.raw >= 80) rawScore = 960;
                else if (r.raw >= 70) rawScore = 890;
                else if (r.raw >= 60) rawScore = 770;
                else if (r.raw >= 50) rawScore = 600;
                else if (r.raw >= 40) rawScore = 400;
                else if (r.raw >= 30) rawScore = 230;
                else if (r.raw >= 20) rawScore = 110;
                else rawScore = 0;
            } else {
                if (r.raw >= 90) rawScore = 1000;
                else if (r.raw >= 85) rawScore = 960;
                else if (r.raw >= 80) rawScore = 890;
                else if (r.raw >= 75) rawScore = 770;
                else if (r.raw >= 70) rawScore = 600;
                else if (r.raw >= 60) rawScore = 400;
                else if (r.raw >= 50) rawScore = 230;
                else if (r.raw >= 40) rawScore = 110;
                else rawScore = 0;
            }
            
            let finalSubjectScore = Math.max(rankScore, rawScore);
            
            totalScoreSum += finalSubjectScore * r.credit;
            totalCredit += r.credit;
        });

        calcState.hufsCareer.forEach(r => {
            if (r.credit <= 0) return;
            let score = achMap[r.ach] || 0;
            totalScoreSum += score * r.credit;
            totalCredit += r.credit;
        });

        let finalScore = 0;
        if (totalCredit > 0) {
            finalScore = totalScoreSum / totalCredit;
            finalScore = Math.floor(finalScore * 100000) / 100000;
        }

        const eTotal = document.getElementById('hufs-final-score');
        if (eTotal) {
            eTotal.textContent = finalScore.toFixed(5);
        }
    }

    // === 서울시립대학교 ===
    function upUosQual(val) {
        let v = parseFloat(val);
        if (isNaN(v)) v = 0;
        if (v < 0) v = 0;
        if (v > 100) v = 100;
        calcState.uosQual = v;
        calculateUosScore();
    }

    function renderUosUI() {
        const container = getCalcContainer();
        const tableStyle = `<table class="y-table"><thead><tr><th>과목명</th><th width="50">단위</th>`;

        const rankedHtml = `
            <div class="y-section">
                <h4>공통 및 일반선택과목 (전교과)
                    <button class="btn-sm" onclick="addRow('uosRanked')">+ 과목 추가</button>
                </h4>
                ${tableStyle}
                    <th width="70">등급</th><th width="40">삭제</th></tr>
                </thead>
                <tbody>
                    ${calcState.uosRanked.map((r, i) => `
                        <tr>
                            <td><input type="text" value="${r.name}" onchange="upRow('uosRanked',${i},'name',this.value)"></td>
                            <td><input type="number" value="${r.credit}" onchange="upRow('uosRanked',${i},'credit',this.value)"></td>
                            <td><input type="number" value="${r.rank}" min="1" max="9" onchange="upRow('uosRanked',${i},'rank',this.value)"></td>
                            <td><button class="btn-sm" style="color:var(--danger);" onclick="remRow('uosRanked',${i})">X</button></td>
                        </tr>
                    `).join('')}
                </tbody></table>
            </div>
        `;

        const careerHtml = `
            <div class="y-section">
                <h4>진로선택과목 (전교과)
                    <button class="btn-sm" onclick="addRow('uosCareer')">+ 과목 추가</button>
                </h4>
                ${tableStyle}
                    <th width="100">성취도(A/B/C)</th><th width="40">삭제</th></tr>
                </thead>
                <tbody>
                    ${calcState.uosCareer.map((r, i) => `
                        <tr>
                            <td><input type="text" value="${r.name}" onchange="upRow('uosCareer',${i},'name',this.value)"></td>
                            <td><input type="number" value="${r.credit}" onchange="upRow('uosCareer',${i},'credit',this.value)"></td>
                            <td>
                                <select onchange="upRow('uosCareer',${i},'ach',this.value)">
                                    ${['A','B','C'].map(x => `<option ${r.ach===x?'selected':''}>${x}</option>`).join('')}
                                </select>
                            </td>
                            <td><button class="btn-sm" style="color:var(--danger);" onclick="remRow('uosCareer',${i})">X</button></td>
                        </tr>
                    `).join('')}
                </tbody></table>
            </div>
        `;

        const qualHtml = `
            <div class="y-section">
                <h4>교과 정성평가 점수</h4>
                <div style="font-size:0.8rem; color:#64748b; margin-bottom:8px;">교과 정성평가는 100점 만점의 입학사정관 정성평가입니다. 본인의 예상 점수를 입력해주세요.</div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <input type="number" value="${calcState.uosQual}" min="0" max="100" onchange="upUosQual(this.value)" style="width:120px; padding:8px; border:1px solid var(--primary); border-radius:4px; font-weight:bold; font-size:1rem;">
                    <span style="font-size:0.9rem; color:#64748b;">점 / 100</span>
                </div>
            </div>
        `;

        container.innerHTML = `
            <div class="y-calc-grid">
                <div class="calc-inputs" style="max-height: 700px; overflow-y: auto; padding-right: 10px;">
                    ${rankedHtml}
                    ${careerHtml}
                    ${qualHtml}
                </div>
                <div>
                    <div class="y-results" style="background: #003478;"> <!-- 서울시립대 색상 톤 -->
                        <div style="font-size: 0.9rem; color: #bfdbfe; margin-bottom: 15px;">대상: <strong>${calcState.studentName || '직접 입력'}</strong></div>
                        <div class="y-res-row">
                            <span>교과 정량점수</span>
                            <span><span id="uos-quant-score">0.0000</span> / 900</span>
                        </div>
                        <div class="y-res-row">
                            <span>교과 정성평가</span>
                            <span><span id="uos-qual-score">0.00</span> / 100</span>
                        </div>
                        <div style="margin:15px 0; border-top: 1px dashed rgba(255,255,255,0.2);"></div>
                        <div class="y-res-total">
                            <span>최종 환산 점수</span>
                            <span><span id="uos-final-score">0.0000</span> / 1000</span>
                        </div>
                        <div style="margin-top: 20px;">
                            <button class="btn btn-green" style="width: 100%; justify-content:center; background-color:#3b82f6; color:white; border:none;" onclick="calculateUosScore()">🔄 점수 재계산</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function round8(val) {
        return Math.round(val * 100000000) / 100000000;
    }

    function calculateUosScore() {
        const rankMap = {1:100, 2:98, 3:95, 4:86, 5:71, 6:50, 7:30, 8:15, 9:0};
        const achMap = {'A':100, 'B':97, 'C':90};

        let rankCredit = 0;
        let rankScoreSum = 0;
        calcState.uosRanked.forEach(r => {
            if (r.credit <= 0) return;
            rankCredit += r.credit;
            rankScoreSum += (rankMap[r.rank] || 0) * r.credit;
        });

        let careerCredit = 0;
        let careerScoreSum = 0;
        calcState.uosCareer.forEach(r => {
            if (r.credit <= 0) return;
            careerCredit += r.credit;
            careerScoreSum += (achMap[r.ach] || 0) * r.credit;
        });

        let rankAvg = rankCredit > 0 ? (rankScoreSum / rankCredit) : 0;
        rankAvg = round8(rankAvg);

        let careerAvg = careerCredit > 0 ? (careerScoreSum / careerCredit) : 0;
        careerAvg = round8(careerAvg);

        let rankFinal = 0;
        let careerFinal = 0;

        if (careerCredit === 0) {
            rankFinal = round8(rankAvg * 9);
        } else {
            rankFinal = round8(rankAvg * 8);
            careerFinal = round8(careerAvg * 1);
        }

        let quantScore = round8(rankFinal + careerFinal);
        let qualScore = parseFloat(calcState.uosQual) || 0;
        let totalScore = round8(quantScore + qualScore);

        const eQuant = document.getElementById('uos-quant-score');
        if (eQuant) {
            eQuant.textContent = quantScore.toFixed(4); 
            document.getElementById('uos-qual-score').textContent = qualScore.toFixed(2);
            document.getElementById('uos-final-score').textContent = totalScore.toFixed(4);
        }
    }

    // === 건국대학교 ===
    function upKuQual(val) {
        let v = parseFloat(val);
        if (isNaN(v)) v = 0;
        if (v < 0) v = 0;
        if (v > 300) v = 300;
        calcState.kuQual = v;
        calculateKonkukScore();
    }

    function renderKonkukUI() {
        const container = getCalcContainer();
        const tableStyle = `<table class="y-table"><thead><tr><th>과목명</th><th width="50">단위</th>`;

        const rankedHtml = `
            <div class="y-section">
                <h4>국/수/영/사/과/한국사 (석차등급 기재 과목만 입력)
                    <button class="btn-sm" onclick="addRow('kuRanked')">+ 과목 추가</button>
                </h4>
                <div style="font-size:0.75rem; color:#64748b; margin-bottom:5px;">* 건국대학교는 진로선택과목을 정량평가에 반영하지 않으므로, 성취도(A/B/C)만 표기된 과목은 입력하지 마세요.</div>
                ${tableStyle}
                    <th width="70">등급</th><th width="40">삭제</th></tr>
                </thead>
                <tbody>
                    ${calcState.kuRanked.map((r, i) => `
                        <tr>
                            <td><input type="text" value="${r.name}" onchange="upRow('kuRanked',${i},'name',this.value)"></td>
                            <td><input type="number" value="${r.credit}" onchange="upRow('kuRanked',${i},'credit',this.value)"></td>
                            <td><input type="number" value="${r.rank}" min="1" max="9" onchange="upRow('kuRanked',${i},'rank',this.value)"></td>
                            <td><button class="btn-sm" style="color:var(--danger);" onclick="remRow('kuRanked',${i})">X</button></td>
                        </tr>
                    `).join('')}
                </tbody></table>
            </div>
        `;

        const qualHtml = `
            <div class="y-section">
                <h4>교과 정성평가 점수</h4>
                <div style="font-size:0.8rem; color:#64748b; margin-bottom:8px;">교과 정성평가는 300점 만점의 입학사정관 정성평가입니다. 본인의 예상 점수를 입력해주세요.</div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <input type="number" value="${calcState.kuQual}" min="0" max="300" onchange="upKuQual(this.value)" style="width:120px; padding:8px; border:1px solid var(--primary); border-radius:4px; font-weight:bold; font-size:1rem;">
                    <span style="font-size:0.9rem; color:#64748b;">점 / 300</span>
                </div>
            </div>
        `;

        container.innerHTML = `
            <div class="y-calc-grid">
                <div class="calc-inputs" style="max-height: 700px; overflow-y: auto; padding-right: 10px;">
                    ${rankedHtml}
                    ${qualHtml}
                </div>
                <div>
                    <div class="y-results" style="background: #004a26;"> <!-- 건국대 색상 톤 -->
                        <div style="font-size: 0.9rem; color: #bbf7d0; margin-bottom: 15px;">대상: <strong>${calcState.studentName || '직접 입력'}</strong></div>
                        <div class="y-res-row">
                            <span>교과 정량평가</span>
                            <span><span id="ku-quant-score">0.000</span> / 700</span>
                        </div>
                        <div class="y-res-row">
                            <span>교과 정성평가</span>
                            <span><span id="ku-qual-score">0.000</span> / 300</span>
                        </div>
                        <div style="margin:15px 0; border-top: 1px dashed rgba(255,255,255,0.2);"></div>
                        <div class="y-res-total">
                            <span>최종 환산 점수</span>
                            <span><span id="ku-final-score">0.000</span> / 1000</span>
                        </div>
                        <div style="margin-top: 20px;">
                            <button class="btn btn-green" style="width: 100%; justify-content:center; background-color:#16a34a; color:white; border:none;" onclick="calculateKonkukScore()">🔄 점수 재계산</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function calculateKonkukScore() {
        const rankMap = {1:10, 2:9.97, 3:9.94, 4:9.90, 5:9.86, 6:9.80, 7:8, 8:6, 9:0};

        let rankCredit = 0;
        let rankScoreSum = 0;
        
        calcState.kuRanked.forEach(r => {
            if (r.credit <= 0) return;
            rankCredit += r.credit;
            rankScoreSum += (rankMap[r.rank] || 0) * r.credit;
        });

        let rankAvg = rankCredit > 0 ? (rankScoreSum / rankCredit) : 0;
        
        let quantScore = rankAvg * 70;
        quantScore = Math.round(quantScore * 1000) / 1000;

        let qualScore = parseFloat(calcState.kuQual) || 0;
        let totalScore = quantScore + qualScore;

        const eQuant = document.getElementById('ku-quant-score');
        if (eQuant) {
            eQuant.textContent = quantScore.toFixed(3); 
            document.getElementById('ku-qual-score').textContent = qualScore.toFixed(3);
            document.getElementById('ku-final-score').textContent = totalScore.toFixed(3);
        }
    }

    // === 동국대학교 ===
    function upDguMajor(val) {
        calcState.dguMajor = val;
        calculateDonggukScore(false);
    }
    function upDguQual(val) {
        let v = parseFloat(val);
        if (isNaN(v)) v = 0;
        if (v < 0) v = 0;
        if (v > 300) v = 300;
        calcState.dguQual = v;
        calculateDonggukScore(false);
    }

    function renderDonggukUI() {
        const container = getCalcContainer();
        const tableStyle = `<table class="y-table"><thead><tr><th width="100">교과구분</th><th>과목명</th>`;

        const subjHtml = `
            <div class="y-section">
                <div style="display:flex; gap:20px; align-items:center; margin-bottom:15px; border-bottom: 1px solid #e2e8f0; padding-bottom:10px;">
                    <strong style="color:#1e293b;">지원 계열 선택:</strong>
                    <label><input type="radio" name="dguMajor" value="humanities" ${calcState.dguMajor==='humanities'?'checked':''} onchange="upDguMajor(this.value)"> 인문계열(국/수/영/사/한국사)</label>
                    <label><input type="radio" name="dguMajor" value="sciences" ${calcState.dguMajor==='sciences'?'checked':''} onchange="upDguMajor(this.value)"> 자연계열(국/수/영/과/한국사)</label>
                </div>
                <h4>교과목 입력 (석차등급 기재 과목만)
                    <button class="btn-sm" onclick="addRow('dguSubjects')">+ 과목 추가</button>
                </h4>
                <div style="font-size:0.75rem; color:#64748b; margin-bottom:5px;">* 동국대는 이수단위를 반영하지 않습니다. 가장 성적이 좋은 상위 10과목이 자동 추출됩니다.</div>
                ${tableStyle}
                    <th width="70">등급</th><th width="40">삭제</th></tr>
                </thead>
                <tbody>
                    ${calcState.dguSubjects.map((r, i) => `
                        <tr>
                            <td>
                                <select onchange="upRow('dguSubjects',${i},'category',this.value)">
                                    <option value="국어" ${r.category==='국어'?'selected':''}>국어</option>
                                    <option value="수학" ${r.category==='수학'?'selected':''}>수학</option>
                                    <option value="영어" ${r.category==='영어'?'selected':''}>영어</option>
                                    <option value="사회" ${r.category==='사회'?'selected':''}>사회</option>
                                    <option value="과학" ${r.category==='과학'?'selected':''}>과학</option>
                                    <option value="한국사" ${r.category==='한국사'?'selected':''}>한국사</option>
                                </select>
                            </td>
                            <td><input type="text" value="${r.name}" onchange="upRow('dguSubjects',${i},'name',this.value)"></td>
                            <td><input type="number" value="${r.rank}" min="1" max="9" onchange="upRow('dguSubjects',${i},'rank',this.value)"></td>
                            <td><button class="btn-sm" style="color:var(--danger);" onclick="remRow('dguSubjects',${i})">X</button></td>
                        </tr>
                    `).join('')}
                </tbody></table>
            </div>
        `;

        const qualHtml = `
            <div class="y-section">
                <h4>서류종합평가 점수</h4>
                <div style="font-size:0.8rem; color:#64748b; margin-bottom:8px;">서류평가는 300점 만점의 입학사정관 정성평가입니다. 본인의 예상 점수를 입력해주세요.</div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <input type="number" value="${calcState.dguQual}" min="0" max="300" onchange="upDguQual(this.value)" style="width:120px; padding:8px; border:1px solid var(--primary); border-radius:4px; font-weight:bold; font-size:1rem;">
                    <span style="font-size:0.9rem; color:#64748b;">점 / 300</span>
                </div>
            </div>
        `;

        container.innerHTML = `
            <div class="y-calc-grid">
                <div class="calc-inputs" style="max-height: 700px; overflow-y: auto; padding-right: 10px;">
                    ${subjHtml}
                    ${qualHtml}
                </div>
                <div>
                    <div class="y-results" style="background: #ea580c;"> <!-- 동국대 테마(주황색) -->
                        <div style="font-size: 0.9rem; color: #ffedd5; margin-bottom: 10px;">대상: <strong>${calcState.studentName || '직접 입력'}</strong></div>
                        
                        <div style="margin-bottom:15px; padding:10px; background: rgba(0,0,0,0.2); border-radius:8px;">
                            <div style="font-size:0.8rem; color:#fed7aa; margin-bottom:5px; font-weight:bold;">최종 반영 상위 10과목</div>
                            <div id="dgu-top10-list" style="max-height:180px; overflow-y:auto; font-size:0.85rem; color:#fff;">
                                <!-- top 10 injected here -->
                            </div>
                        </div>

                        <div class="y-res-row">
                            <span>교과 환산 점수</span>
                            <span><span id="dgu-subj-score">0.000</span> / 700</span>
                        </div>
                        <div class="y-res-row">
                            <span>서류종합평가 점수</span>
                            <span><span id="dgu-qual-score">0.00</span> / 300</span>
                        </div>
                        <div style="margin:15px 0; border-top: 1px dashed rgba(255,255,255,0.2);"></div>
                        <div class="y-res-total">
                            <span>최종 환산 점수</span>
                            <span><span id="dgu-final-score">0.000</span> / 1000</span>
                        </div>
                        <div style="margin-top: 20px;">
                            <button class="btn btn-green" style="width: 100%; justify-content:center; background-color:#f97316; color:white; border:none;" onclick="calculateDonggukScore(true)">🔄 점수 재계산</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function calculateDonggukScore(showAlert = false) {
        const rankMap = {1:10, 2:9.99, 3:9.95, 4:9.9, 5:9.0, 6:8.0, 7:5.0, 8:3.0, 9:0.0};
        const major = calcState.dguMajor;
        
        let validSubjects = calcState.dguSubjects.filter(s => {
            if (!s.rank || s.rank < 1 || s.rank > 9) return false;
            if (major === 'humanities') {
                return ['국어', '수학', '영어', '사회', '한국사'].includes(s.category);
            } else {
                return ['국어', '수학', '영어', '과학', '한국사'].includes(s.category);
            }
        });

        validSubjects = validSubjects.map(s => ({ ...s, score: rankMap[s.rank] || 0 }));
        validSubjects.sort((a, b) => b.score - a.score);

        calcState.dguTop10 = validSubjects.slice(0, 10);
        let top10ScoreSum = 0;
        let isError = false;

        if (validSubjects.length < 10) {
            isError = true;
            if (showAlert) alert("반영 교과 과목이 10개 이상이어야 계산이 가능합니다.");
        } else {
            top10ScoreSum = calcState.dguTop10.reduce((acc, curr) => acc + curr.score, 0);
        }

        let subjScore = isError ? 0 : ((top10ScoreSum / 10) / 10) * 700;
        let qualScore = parseFloat(calcState.dguQual) || 0;
        let totalScore = subjScore + qualScore;

        const eSubj = document.getElementById('dgu-subj-score');
        if (eSubj) {
            eSubj.textContent = subjScore.toFixed(3);
            document.getElementById('dgu-qual-score').textContent = qualScore.toFixed(2);
            document.getElementById('dgu-final-score').textContent = totalScore.toFixed(3);
            
            const top10Container = document.getElementById('dgu-top10-list');
            if (top10Container) {
                if (isError) {
                    top10Container.innerHTML = `<div style="color:#fca5a5;">유효한 과목이 10개 미만입니다. (현재 ${validSubjects.length}개)</div>`;
                } else {
                    top10Container.innerHTML = calcState.dguTop10.map((s, idx) => 
                        `<div style="margin-bottom:3px; display:flex; justify-content:space-between;">
                            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;" title="${s.name}">
                                ${idx+1}. <span style="color:#fed7aa">[${s.category}]</span> ${s.name}
                            </span>
                            <span>${s.rank}등급(${s.score})</span>
                        </div>`
                    ).join('');
                }
            }
        }
    }

    // === 홍익대학교 ===
    function upHongikMajor(val) {
        calcState.hongikMajor = val;
        calculateHongikScore();
    }

    function renderHongikUI() {
        const container = getCalcContainer();
        const tableStyle = `<table class="y-table"><thead><tr><th width="80">교과구분</th><th>과목명</th><th width="50">단위</th>`;

        const rankedHtml = `
            <div class="y-section">
                <div style="display:flex; gap:20px; align-items:center; margin-bottom:15px; border-bottom: 1px solid #e2e8f0; padding-bottom:10px;">
                    <strong style="color:#1e293b;">지원 계열 선택:</strong>
                    <label><input type="radio" name="hongikMajor" value="humanities" ${calcState.hongikMajor==='humanities'?'checked':''} onchange="upHongikMajor(this.value)"> 인문계열/예술학과(국/수/영/사)</label>
                    <label><input type="radio" name="hongikMajor" value="sciences" ${calcState.hongikMajor==='sciences'?'checked':''} onchange="upHongikMajor(this.value)"> 자연계열(국/수/영/과)</label>
                </div>
                <h4>공통 및 일반선택과목 (석차등급)
                    <button class="btn-sm" onclick="addRow('hongikRanked')">+ 과목 추가</button>
                </h4>
                ${tableStyle}
                    <th width="70">등급</th><th width="40">삭제</th></tr>
                </thead>
                <tbody>
                    ${calcState.hongikRanked.map((r, i) => `
                        <tr>
                            <td>
                                <select onchange="upRow('hongikRanked',${i},'category',this.value)">
                                    <option value="국어" ${r.category==='국어'?'selected':''}>국어</option>
                                    <option value="수학" ${r.category==='수학'?'selected':''}>수학</option>
                                    <option value="영어" ${r.category==='영어'?'selected':''}>영어</option>
                                    <option value="사회" ${r.category==='사회'?'selected':''}>사회</option>
                                    <option value="과학" ${r.category==='과학'?'selected':''}>과학</option>
                                </select>
                            </td>
                            <td><input type="text" value="${r.name}" onchange="upRow('hongikRanked',${i},'name',this.value)"></td>
                            <td><input type="number" value="${r.credit}" onchange="upRow('hongikRanked',${i},'credit',this.value)"></td>
                            <td><input type="number" value="${r.rank}" min="1" max="9" onchange="upRow('hongikRanked',${i},'rank',this.value)"></td>
                            <td><button class="btn-sm" style="color:var(--danger);" onclick="remRow('hongikRanked',${i})">X</button></td>
                        </tr>
                    `).join('')}
                </tbody></table>
            </div>
        `;

        const careerHtml = `
            <div class="y-section">
                <h4>진로선택과목 (성취도)
                    <button class="btn-sm" onclick="addRow('hongikCareer')">+ 과목 추가</button>
                </h4>
                ${tableStyle}
                    <th width="100">성취도(A/B/C)</th><th width="40">삭제</th></tr>
                </thead>
                <tbody>
                    ${calcState.hongikCareer.map((r, i) => `
                        <tr>
                            <td>
                                <select onchange="upRow('hongikCareer',${i},'category',this.value)">
                                    <option value="국어" ${r.category==='국어'?'selected':''}>국어</option>
                                    <option value="수학" ${r.category==='수학'?'selected':''}>수학</option>
                                    <option value="영어" ${r.category==='영어'?'selected':''}>영어</option>
                                    <option value="사회" ${r.category==='사회'?'selected':''}>사회</option>
                                    <option value="과학" ${r.category==='과학'?'selected':''}>과학</option>
                                </select>
                            </td>
                            <td><input type="text" value="${r.name}" onchange="upRow('hongikCareer',${i},'name',this.value)"></td>
                            <td><input type="number" value="${r.credit}" onchange="upRow('hongikCareer',${i},'credit',this.value)"></td>
                            <td>
                                <select onchange="upRow('hongikCareer',${i},'ach',this.value)">
                                    ${['A','B','C'].map(x => `<option ${r.ach===x?'selected':''}>${x}</option>`).join('')}
                                </select>
                            </td>
                            <td><button class="btn-sm" style="color:var(--danger);" onclick="remRow('hongikCareer',${i})">X</button></td>
                        </tr>
                    `).join('')}
                </tbody></table>
            </div>
        `;

        container.innerHTML = `
            <div class="y-calc-grid">
                <div class="calc-inputs" style="max-height: 700px; overflow-y: auto; padding-right: 10px;">
                    ${rankedHtml}
                    ${careerHtml}
                </div>
                <div>
                    <div class="y-results" style="background: #000080;"> <!-- 홍익대 다크 네이비 테마 -->
                        <div style="font-size: 0.9rem; color: #bfdbfe; margin-bottom: 15px;">대상: <strong>${calcState.studentName || '직접 입력'}</strong></div>
                        <div class="y-res-row">
                            <span>총 이수단위 (최대 100)</span>
                            <span><span id="hongik-total-credit">0</span> 단위</span>
                        </div>
                        <div class="y-res-row">
                            <span>공통/일반 평균 (×0.9)</span>
                            <span><span id="hongik-common-avg">0.0000</span> 점</span>
                        </div>
                        <div class="y-res-row">
                            <span>진로선택 평균 (×0.1)</span>
                            <span><span id="hongik-career-avg">0.0000</span> 점</span>
                        </div>
                        <div style="margin:15px 0; border-top: 1px dashed rgba(255,255,255,0.2);"></div>
                        <div class="y-res-total">
                            <span>최종 교과 점수</span>
                            <span><span id="hongik-final-score">0.00</span> / 100</span>
                        </div>
                        <div style="margin-top: 20px;">
                            <button class="btn btn-green" style="width: 100%; justify-content:center;" onclick="calculateHongikScore()">🔄 점수 재계산</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function calculateHongikScore() {
        const rankMap = {1:100, 2:96, 3:89, 4:77, 5:60, 6:40, 7:23, 8:11, 9:0};
        const achMap = {'A':10, 'B':9, 'C':7};
        const major = calcState.hongikMajor;
        
        let a = 0, b = 0; // a: 환산점수*이수단위 합, b: 이수단위 합 (공통/일반)
        calcState.hongikRanked.forEach(r => {
            if (r.credit <= 0) return;
            if (major === 'humanities' && !['국어', '수학', '영어', '사회'].includes(r.category)) return;
            if (major === 'sciences' && !['국어', '수학', '영어', '과학'].includes(r.category)) return;
            
            b += r.credit;
            a += (rankMap[r.rank] || 0) * r.credit;
        });

        let c = 0, d = 0; // c: 환산점수*이수단위 합, d: 이수단위 합 (진로)
        calcState.hongikCareer.forEach(r => {
            if (r.credit <= 0) return;
            if (major === 'humanities' && !['국어', '수학', '영어', '사회'].includes(r.category)) return;
            if (major === 'sciences' && !['국어', '수학', '영어', '과학'].includes(r.category)) return;
            
            d += r.credit;
            c += (achMap[r.ach] || 0) * r.credit;
        });

        let e = b + d; // 전체 반영교과 이수단위
        if (e > 100) e = 100;

        let commonAvg = b > 0 ? (a / b) : 0;
        let careerAvg = d > 0 ? (c / d) : 0;

        let ga = commonAvg * 0.9;
        let na = 0;
        if (d === 0) {
            na = commonAvg * 0.09; // 진로선택과목 미이수시 대체 산출식
        } else {
            na = careerAvg;
        }

        let da = (e / 1000) + 0.9; // 보정계수
        
        let finalScore = (ga + na) * da;
        finalScore = Math.round(finalScore * 100) / 100;

        const eCredit = document.getElementById('hongik-total-credit');
        if (eCredit) {
            eCredit.textContent = e;
            document.getElementById('hongik-common-avg').textContent = commonAvg.toFixed(4);
            document.getElementById('hongik-career-avg').textContent = d === 0 ? "미이수(대체반영)" : careerAvg.toFixed(4);
            document.getElementById('hongik-final-score').textContent = finalScore.toFixed(2);
        }
    }

    // === 국민대학교 ===
    function upKookminMajor(val) {
        calcState.kookminMajor = val;
        calculateKookminScore();
    }

    function renderKookminUI() {
        const container = getCalcContainer();
        const tableStyle = `<table class="y-table"><thead><tr><th width="80">교과구분</th><th>과목명</th><th width="50">단위</th>`;

        const rankedHtml = `
            <div class="y-section">
                <div style="display:flex; gap:15px; align-items:center; margin-bottom:15px; border-bottom: 1px solid #e2e8f0; padding-bottom:10px; flex-wrap:wrap;">
                    <strong style="color:#1e293b;">지원 계열 선택:</strong>
                    <label><input type="radio" name="kookminMajor" value="humanities" ${calcState.kookminMajor==='humanities'?'checked':''} onchange="upKookminMajor(this.value)"> 인문계(국/수/영/사)</label>
                    <label><input type="radio" name="kookminMajor" value="sciences" ${calcState.kookminMajor==='sciences'?'checked':''} onchange="upKookminMajor(this.value)"> 자연계(국/수/영/과)</label>
                    <label><input type="radio" name="kookminMajor" value="arts_sports" ${calcState.kookminMajor==='arts_sports'?'checked':''} onchange="upKookminMajor(this.value)"> 예·체능계(국/영)</label>
                </div>
                <h4>공통/일반선택과목 (석차등급)
                    <button class="btn-sm" onclick="addRow('kookminRanked')">+ 과목 추가</button>
                </h4>
                ${tableStyle}
                    <th width="70">등급</th><th width="40">삭제</th></tr>
                </thead>
                <tbody>
                    ${calcState.kookminRanked.map((r, i) => `
                        <tr>
                            <td>
                                <select onchange="upRow('kookminRanked',${i},'category',this.value)">
                                    <option value="국어" ${r.category==='국어'?'selected':''}>국어</option>
                                    <option value="수학" ${r.category==='수학'?'selected':''}>수학</option>
                                    <option value="영어" ${r.category==='영어'?'selected':''}>영어</option>
                                    <option value="사회" ${r.category==='사회'?'selected':''}>사회</option>
                                    <option value="과학" ${r.category==='과학'?'selected':''}>과학</option>
                                </select>
                            </td>
                            <td><input type="text" value="${r.name}" onchange="upRow('kookminRanked',${i},'name',this.value)"></td>
                            <td><input type="number" value="${r.credit}" onchange="upRow('kookminRanked',${i},'credit',this.value)"></td>
                            <td><input type="number" value="${r.rank}" min="1" max="9" onchange="upRow('kookminRanked',${i},'rank',this.value)"></td>
                            <td><button class="btn-sm" style="color:var(--danger);" onclick="remRow('kookminRanked',${i})">X</button></td>
                        </tr>
                    `).join('')}
                </tbody></table>
            </div>
        `;

        const careerHtml = `
            <div class="y-section">
                <h4>진로선택과목 (성취도)
                    <button class="btn-sm" onclick="addRow('kookminCareer')">+ 과목 추가</button>
                </h4>
                <div style="font-size:0.75rem; color:#64748b; margin-bottom:5px;">* 성취도 배점이 높은 상위 3과목만 자동 추출되어 반영됩니다. (동점 시 이수단위 높은 순)</div>
                ${tableStyle}
                    <th width="100">성취도(A/B/C)</th><th width="40">삭제</th></tr>
                </thead>
                <tbody>
                    ${calcState.kookminCareer.map((r, i) => `
                        <tr>
                            <td>
                                <select onchange="upRow('kookminCareer',${i},'category',this.value)">
                                    <option value="국어" ${r.category==='국어'?'selected':''}>국어</option>
                                    <option value="수학" ${r.category==='수학'?'selected':''}>수학</option>
                                    <option value="영어" ${r.category==='영어'?'selected':''}>영어</option>
                                    <option value="사회" ${r.category==='사회'?'selected':''}>사회</option>
                                    <option value="과학" ${r.category==='과학'?'selected':''}>과학</option>
                                </select>
                            </td>
                            <td><input type="text" value="${r.name}" onchange="upRow('kookminCareer',${i},'name',this.value)"></td>
                            <td><input type="number" value="${r.credit}" onchange="upRow('kookminCareer',${i},'credit',this.value)"></td>
                            <td>
                                <select onchange="upRow('kookminCareer',${i},'ach',this.value)">
                                    ${['A','B','C'].map(x => `<option ${r.ach===x?'selected':''}>${x}</option>`).join('')}
                                </select>
                            </td>
                            <td><button class="btn-sm" style="color:var(--danger);" onclick="remRow('kookminCareer',${i})">X</button></td>
                        </tr>
                    `).join('')}
                </tbody></table>
            </div>
        `;

        container.innerHTML = `
            <div class="y-calc-grid">
                <div class="calc-inputs" style="max-height: 700px; overflow-y: auto; padding-right: 10px;">
                    ${rankedHtml}
                    ${careerHtml}
                </div>
                <div>
                    <div class="y-results" style="background: #1e3a8a;"> <!-- 국민대 테마(파란색) -->
                        <div style="font-size: 0.9rem; color: #bfdbfe; margin-bottom: 10px;">대상: <strong>${calcState.studentName || '직접 입력'}</strong></div>
                        
                        <div style="margin-bottom:15px; padding:10px; background: rgba(0,0,0,0.2); border-radius:8px;">
                            <div style="font-size:0.8rem; color:#bfdbfe; margin-bottom:5px; font-weight:bold;">진로선택 반영 상위 3과목</div>
                            <div id="kookmin-top3-list" style="max-height:120px; overflow-y:auto; font-size:0.85rem; color:#fff;">
                                <!-- top 3 injected here -->
                            </div>
                        </div>

                        <div class="y-res-row">
                            <span>공통/일반 환산점수</span>
                            <span><span id="kookmin-ranked-score">0.000</span> / 850</span>
                        </div>
                        <div class="y-res-row">
                            <span>진로선택 환산점수</span>
                            <span><span id="kookmin-career-score">0.000</span> / 150</span>
                        </div>
                        <div style="margin:15px 0; border-top: 1px dashed rgba(255,255,255,0.2);"></div>
                        <div class="y-res-total">
                            <span>최종 환산 점수</span>
                            <span><span id="kookmin-final-score">0.000</span> / 1000</span>
                        </div>
                        <div style="margin-top: 20px;">
                            <button class="btn btn-green" style="width: 100%; justify-content:center; background-color:#2563eb; color:white; border:none;" onclick="calculateKookminScore()">🔄 점수 재계산</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function calculateKookminScore() {
        const rankMap = {1:100, 2:99, 3:98, 4:95, 5:90, 6:70, 7:50, 8:30, 9:0};
        const achMap = {'A':100, 'B':98, 'C':90};
        const major = calcState.kookminMajor;

        const filterFn = (cat) => {
            if (major === 'humanities') return ['국어', '수학', '영어', '사회'].includes(cat);
            if (major === 'sciences') return ['국어', '수학', '영어', '과학'].includes(cat);
            if (major === 'arts_sports') return ['국어', '영어'].includes(cat);
            return false;
        };

        // 1. 공통/일반선택과목 점수 산출
        let rSum = 0, rCredit = 0;
        calcState.kookminRanked.forEach(r => {
            if (r.credit <= 0 || !filterFn(r.category)) return;
            rCredit += r.credit;
            rSum += (rankMap[r.rank] || 0) * r.credit;
        });

        let rankAvg = rCredit > 0 ? (rSum / rCredit) : 0;

        // 2. 진로선택과목 점수 산출 (상위 3과목)
        let validCareer = calcState.kookminCareer.filter(r => r.credit > 0 && filterFn(r.category) && ['A','B','C'].includes(r.ach));
        validCareer.forEach(r => r.score = achMap[r.ach] || 0);

        // 성취도 배점 내림차순 -> 이수단위 내림차순 정렬
        validCareer.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return b.credit - a.credit;
        });

        let top3Career = validCareer.slice(0, 3);
        let cSum = 0, cCredit = 0;
        top3Career.forEach(r => {
            cCredit += r.credit;
            cSum += r.score * r.credit;
        });

        let careerAvg = cCredit > 0 ? (cSum / cCredit) : 0;

        let finalRankScore = 0;
        let finalCareerScore = 0;

        // 3. 예외 처리 및 최종 계산
        if (cCredit === 0) {
            // 진로선택과목이 없을 경우 공통/일반 점수에 1.0 곱하기
            finalRankScore = (rankAvg * 10) * 1.0;
            finalCareerScore = 0;
        } else {
            finalRankScore = (rankAvg * 10) * 0.85;
            finalCareerScore = (careerAvg * 10) * 0.15;
        }

        let finalTotal = finalRankScore + finalCareerScore;

        const eSubj = document.getElementById('kookmin-ranked-score');
        if (eSubj) {
            eSubj.textContent = finalRankScore.toFixed(3);
            document.getElementById('kookmin-career-score').textContent = finalCareerScore.toFixed(3);
            document.getElementById('kookmin-final-score').textContent = finalTotal.toFixed(3);
            
            const top3Container = document.getElementById('kookmin-top3-list');
            if (top3Container) {
                if (top3Career.length === 0) {
                    top3Container.innerHTML = `<div style="color:#fca5a5;">유효한 진로선택과목이 없습니다.<br>(공통/일반 100% 반영으로 대체)</div>`;
                } else {
                    top3Container.innerHTML = top3Career.map((s, idx) => 
                        `<div style="margin-bottom:3px; display:flex; justify-content:space-between;">
                            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;" title="${s.name}">
                                ${idx+1}. <span style="color:#bfdbfe">[${s.category}]</span> ${s.name}
                            </span>
                            <span>${s.ach}(${s.score}) / ${s.credit}단위</span>
                        </div>`
                    ).join('');
                }
            }
        }
    }

    // === 숭실대학교 ===
    function upSoongsilMajor(val) {
        calcState.soongsilMajor = val;
        calculateSoongsilScore();
    }

    function renderSoongsilUI() {
        const container = getCalcContainer();
        const tableStyle = `<table class="y-table"><thead><tr><th width="80">교과구분</th><th>과목명</th><th width="50">단위</th>`;

        const rankedHtml = `
            <div class="y-section">
                <div style="display:flex; gap:15px; align-items:center; margin-bottom:15px; border-bottom: 1px solid #e2e8f0; padding-bottom:10px; flex-wrap:wrap;">
                    <strong style="color:#1e293b;">지원 계열 선택:</strong>
                    <label><input type="radio" name="soongsilMajor" value="humanities" ${calcState.soongsilMajor==='humanities'?'checked':''} onchange="upSoongsilMajor(this.value)"> 인문계열</label>
                    <label><input type="radio" name="soongsilMajor" value="commerce" ${calcState.soongsilMajor==='commerce'?'checked':''} onchange="upSoongsilMajor(this.value)"> 경상계열</label>
                    <label><input type="radio" name="soongsilMajor" value="free_hum" ${calcState.soongsilMajor==='free_hum'?'checked':''} onchange="upSoongsilMajor(this.value)"> 자유전공학부(인문)</label>
                    <label><input type="radio" name="soongsilMajor" value="science" ${calcState.soongsilMajor==='science'?'checked':''} onchange="upSoongsilMajor(this.value)"> 자연계열/자유전공(자연)</label>
                </div>
                <h4>공통/일반선택과목 (석차등급)
                    <button class="btn-sm" onclick="addRow('soongsilRanked')">+ 과목 추가</button>
                </h4>
                ${tableStyle}
                    <th width="70">등급</th><th width="40">삭제</th></tr>
                </thead>
                <tbody>
                    ${calcState.soongsilRanked.map((r, i) => `
                        <tr>
                            <td>
                                <select onchange="upRow('soongsilRanked',${i},'category',this.value)">
                                    <option value="국어" ${r.category==='국어'?'selected':''}>국어</option>
                                    <option value="수학" ${r.category==='수학'?'selected':''}>수학</option>
                                    <option value="영어" ${r.category==='영어'?'selected':''}>영어</option>
                                    <option value="사회" ${r.category==='사회'?'selected':''}>사회</option>
                                    <option value="과학" ${r.category==='과학'?'selected':''}>과학</option>
                                </select>
                            </td>
                            <td><input type="text" value="${r.name}" onchange="upRow('soongsilRanked',${i},'name',this.value)"></td>
                            <td><input type="number" value="${r.credit}" onchange="upRow('soongsilRanked',${i},'credit',this.value)"></td>
                            <td><input type="number" value="${r.rank}" min="1" max="9" onchange="upRow('soongsilRanked',${i},'rank',this.value)"></td>
                            <td><button class="btn-sm" style="color:var(--danger);" onclick="remRow('soongsilRanked',${i})">X</button></td>
                        </tr>
                    `).join('')}
                </tbody></table>
            </div>
        `;

        const careerHtml = `
            <div class="y-section">
                <h4>진로선택과목 (성취도)
                    <button class="btn-sm" onclick="addRow('soongsilCareer')">+ 과목 추가</button>
                </h4>
                ${tableStyle}
                    <th width="100">성취도(A/B/C)</th><th width="40">삭제</th></tr>
                </thead>
                <tbody>
                    ${calcState.soongsilCareer.map((r, i) => `
                        <tr>
                            <td>
                                <select onchange="upRow('soongsilCareer',${i},'category',this.value)">
                                    <option value="국어" ${r.category==='국어'?'selected':''}>국어</option>
                                    <option value="수학" ${r.category==='수학'?'selected':''}>수학</option>
                                    <option value="영어" ${r.category==='영어'?'selected':''}>영어</option>
                                    <option value="사회" ${r.category==='사회'?'selected':''}>사회</option>
                                    <option value="과학" ${r.category==='과학'?'selected':''}>과학</option>
                                </select>
                            </td>
                            <td><input type="text" value="${r.name}" onchange="upRow('soongsilCareer',${i},'name',this.value)"></td>
                            <td><input type="number" value="${r.credit}" onchange="upRow('soongsilCareer',${i},'credit',this.value)"></td>
                            <td>
                                <select onchange="upRow('soongsilCareer',${i},'ach',this.value)">
                                    ${['A','B','C'].map(x => `<option ${r.ach===x?'selected':''}>${x}</option>`).join('')}
                                </select>
                            </td>
                            <td><button class="btn-sm" style="color:var(--danger);" onclick="remRow('soongsilCareer',${i})">X</button></td>
                        </tr>
                    `).join('')}
                </tbody></table>
            </div>
        `;

        container.innerHTML = `
            <div class="y-calc-grid">
                <div class="calc-inputs" style="max-height: 700px; overflow-y: auto; padding-right: 10px;">
                    ${rankedHtml}
                    ${careerHtml}
                </div>
                <div>
                    <div class="y-results" style="background: #0f172a;"> <!-- 숭실대 다크 테마 -->
                        <div style="font-size: 0.9rem; color: #cbd5e1; margin-bottom: 10px;">대상: <strong>${calcState.studentName || '직접 입력'}</strong></div>
                        
                        <div class="y-res-row">
                            <span>공통/일반 환산점수</span>
                            <span><span id="soongsil-ranked-score">0.000</span> / 80</span>
                        </div>
                        <div class="y-res-row">
                            <span>진로선택 환산점수</span>
                            <span><span id="soongsil-career-score">0.000</span> / 20</span>
                        </div>
                        <div style="margin:15px 0; border-top: 1px dashed rgba(255,255,255,0.2);"></div>
                        <div class="y-res-total">
                            <span>최종 환산 점수</span>
                            <span><span id="soongsil-final-score">0.000</span> / 100</span>
                        </div>
                        <div style="margin-top: 20px;">
                            <button class="btn btn-green" style="width: 100%; justify-content:center; background-color:#475569; color:white; border:none;" onclick="calculateSoongsilScore()">🔄 점수 재계산</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function calculateSoongsilScore() {
        const rankMap = {1:10.0, 2:9.5, 3:9.0, 4:8.5, 5:8.0, 6:7.0, 7:5.0, 8:3.0, 9:0.0};
        const achMap = {'A':10.0, 'B':9.5, 'C':9.0};
        const major = calcState.soongsilMajor;

        let weights = {};
        if (major === 'humanities') weights = { '국어': 0.35, '수학': 0.15, '영어': 0.35, '사회': 0.15, '과학': 0 };
        else if (major === 'commerce') weights = { '국어': 0.20, '수학': 0.30, '영어': 0.35, '사회': 0.15, '과학': 0 };
        else if (major === 'free_hum') weights = { '국어': 0.30, '수학': 0.20, '영어': 0.30, '사회': 0.20, '과학': 0 };
        else if (major === 'science') weights = { '국어': 0.15, '수학': 0.35, '영어': 0.25, '사회': 0, '과학': 0.25 };

        // 1. 공통/일반 점수 산출
        let groups = { '국어': {s:0, c:0}, '수학': {s:0, c:0}, '영어': {s:0, c:0}, '사회': {s:0, c:0}, '과학': {s:0, c:0} };
        calcState.soongsilRanked.forEach(r => {
            if (r.credit <= 0) return;
            if (weights[r.category] > 0) {
                groups[r.category].c += r.credit;
                groups[r.category].s += (rankMap[r.rank] || 0) * r.credit;
            }
        });

        let sumAvgs = 0;
        ['국어', '수학', '영어', '사회', '과학'].forEach(cat => {
            if (weights[cat] > 0 && groups[cat].c > 0) {
                let avg = (groups[cat].s * weights[cat]) / groups[cat].c;
                sumAvgs += Math.floor(avg * 100000) / 100000;
            }
        });

        let rankedFinal = Math.floor((sumAvgs * 8) * 1000) / 1000;

        // 2. 진로선택 점수 산출
        let carSum = 0, carCredit = 0, carCount = 0;
        calcState.soongsilCareer.forEach(r => {
            if (r.credit <= 0) return;
            if (weights[r.category] > 0 && ['A','B','C'].includes(r.ach)) {
                carCount++;
                carCredit += r.credit;
                carSum += (achMap[r.ach] || 0) * r.credit;
            }
        });

        let ratio = 0;
        if (carCount >= 3) ratio = 20;
        else if (carCount === 2) ratio = 18;
        else if (carCount === 1) ratio = 16;

        let careerFinal = 0;
        if (carCredit > 0) {
            let base = Math.floor((carSum / carCredit) * 100000) / 100000;
            careerFinal = Math.floor((base * 2 * (ratio / 20)) * 1000) / 1000;
        }

        let totalFinal = rankedFinal + careerFinal;

        const eRanked = document.getElementById('soongsil-ranked-score');
        if (eRanked) {
            eRanked.textContent = rankedFinal.toFixed(3);
            document.getElementById('soongsil-career-score').textContent = careerFinal.toFixed(3);
            document.getElementById('soongsil-final-score').textContent = totalFinal.toFixed(3);
        }
    }

    // === 세종대학교 ===
    function upSejongMajor(val) {
        calcState.sejongMajor = val;
        calculateSejongScore();
    }

    function renderSejongUI() {
        const container = getCalcContainer();
        const tableStyle = `<table class="y-table"><thead><tr><th width="80">교과구분</th><th>과목명</th><th width="50">단위</th>`;

        const rankedHtml = `
            <div class="y-section">
                <div style="display:flex; gap:15px; align-items:center; margin-bottom:15px; border-bottom: 1px solid #e2e8f0; padding-bottom:10px; flex-wrap:wrap;">
                    <strong style="color:#1e293b;">지원 계열 선택:</strong>
                    <label><input type="radio" name="sejongMajor" value="free" ${calcState.sejongMajor==='free'?'checked':''} onchange="upSejongMajor(this.value)"> 자유전공(국/수/영)</label>
                    <label><input type="radio" name="sejongMajor" value="humanities" ${calcState.sejongMajor==='humanities'?'checked':''} onchange="upSejongMajor(this.value)"> 인문계열(국/수/영/사)</label>
                    <label><input type="radio" name="sejongMajor" value="sciences" ${calcState.sejongMajor==='sciences'?'checked':''} onchange="upSejongMajor(this.value)"> 자연계열(국/수/영/과)</label>
                    <label><input type="radio" name="sejongMajor" value="arts_sports" ${calcState.sejongMajor==='arts_sports'?'checked':''} onchange="upSejongMajor(this.value)"> 예체능계열(국/영)</label>
                </div>
                <h4>공통/일반선택과목 (석차등급)
                    <button class="btn-sm" onclick="addRow('sejongRanked')">+ 과목 추가</button>
                </h4>
                ${tableStyle}
                    <th width="70">등급</th><th width="40">삭제</th></tr>
                </thead>
                <tbody>
                    ${calcState.sejongRanked.map((r, i) => `
                        <tr>
                            <td>
                                <select onchange="upRow('sejongRanked',${i},'category',this.value)">
                                    <option value="국어" ${r.category==='국어'?'selected':''}>국어</option>
                                    <option value="수학" ${r.category==='수학'?'selected':''}>수학</option>
                                    <option value="영어" ${r.category==='영어'?'selected':''}>영어</option>
                                    <option value="사회" ${r.category==='사회'?'selected':''}>사회</option>
                                    <option value="과학" ${r.category==='과학'?'selected':''}>과학</option>
                                </select>
                            </td>
                            <td><input type="text" value="${r.name}" onchange="upRow('sejongRanked',${i},'name',this.value)"></td>
                            <td><input type="number" value="${r.credit}" onchange="upRow('sejongRanked',${i},'credit',this.value)"></td>
                            <td><input type="number" value="${r.rank}" min="1" max="9" onchange="upRow('sejongRanked',${i},'rank',this.value)"></td>
                            <td><button class="btn-sm" style="color:var(--danger);" onclick="remRow('sejongRanked',${i})">X</button></td>
                        </tr>
                    `).join('')}
                </tbody></table>
            </div>
        `;

        const careerHtml = `
            <div class="y-section">
                <h4>진로선택과목 (성취도)
                    <button class="btn-sm" onclick="addRow('sejongCareer')">+ 과목 추가</button>
                </h4>
                ${tableStyle}
                    <th width="100">성취도(A/B/C)</th><th width="40">삭제</th></tr>
                </thead>
                <tbody>
                    ${calcState.sejongCareer.map((r, i) => `
                        <tr>
                            <td>
                                <select onchange="upRow('sejongCareer',${i},'category',this.value)">
                                    <option value="국어" ${r.category==='국어'?'selected':''}>국어</option>
                                    <option value="수학" ${r.category==='수학'?'selected':''}>수학</option>
                                    <option value="영어" ${r.category==='영어'?'selected':''}>영어</option>
                                    <option value="사회" ${r.category==='사회'?'selected':''}>사회</option>
                                    <option value="과학" ${r.category==='과학'?'selected':''}>과학</option>
                                </select>
                            </td>
                            <td><input type="text" value="${r.name}" onchange="upRow('sejongCareer',${i},'name',this.value)"></td>
                            <td><input type="number" value="${r.credit}" onchange="upRow('sejongCareer',${i},'credit',this.value)"></td>
                            <td>
                                <select onchange="upRow('sejongCareer',${i},'ach',this.value)">
                                    ${['A','B','C'].map(x => `<option ${r.ach===x?'selected':''}>${x}</option>`).join('')}
                                </select>
                            </td>
                            <td><button class="btn-sm" style="color:var(--danger);" onclick="remRow('sejongCareer',${i})">X</button></td>
                        </tr>
                    `).join('')}
                </tbody></table>
            </div>
        `;

        container.innerHTML = `
            <div class="y-calc-grid">
                <div class="calc-inputs" style="max-height: 700px; overflow-y: auto; padding-right: 10px;">
                    ${rankedHtml}
                    ${careerHtml}
                </div>
                <div>
                    <div class="y-results" style="background: #8a1538;"> <!-- 세종대 테마(크림슨 레드) -->
                        <div style="font-size: 0.9rem; color: #fecaca; margin-bottom: 10px;">대상: <strong>${calcState.studentName || '직접 입력'}</strong></div>
                        
                        <div class="y-res-row">
                            <span>공통/일반 반영점수</span>
                            <span><span id="sejong-ranked-score">0.00000000</span> / 800</span>
                        </div>
                        <div class="y-res-row">
                            <span>진로선택 반영점수</span>
                            <span><span id="sejong-career-score">0.00000000</span> / 200</span>
                        </div>
                        <div style="margin:15px 0; border-top: 1px dashed rgba(255,255,255,0.2);"></div>
                        <div class="y-res-total">
                            <span>최종 환산 점수</span>
                            <span><span id="sejong-final-score">0.00000000</span> / 1000</span>
                        </div>
                        <div style="margin-top: 20px;">
                            <button class="btn btn-green" style="width: 100%; justify-content:center; background-color:#be123c; color:white; border:none;" onclick="calculateSejongScore()">🔄 점수 재계산</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function calculateSejongScore() {
        const rankMap = {1:1000, 2:990, 3:980, 4:950, 5:900, 6:800, 7:700, 8:500, 9:0};
        const achMap = {'A':1000, 'B':980, 'C':900};
        const major = calcState.sejongMajor;

        const filterFn = (cat) => {
            if (major === 'free') return ['국어', '수학', '영어'].includes(cat);
            if (major === 'humanities') return ['국어', '수학', '영어', '사회'].includes(cat);
            if (major === 'sciences') return ['국어', '수학', '영어', '과학'].includes(cat);
            if (major === 'arts_sports') return ['국어', '영어'].includes(cat);
            return false;
        };

        // 1. 공통/일반선택과목 점수 산출
        let rSum = 0, rCredit = 0;
        calcState.sejongRanked.forEach(r => {
            if (r.credit <= 0 || !filterFn(r.category)) return;
            rCredit += r.credit;
            rSum += (rankMap[r.rank] || 0) * r.credit;
        });
        
        let rankAvg = rCredit > 0 ? (rSum / rCredit) : 0;
        rankAvg = Math.floor(rankAvg * 100000000) / 100000000;

        // 2. 진로선택과목 점수 산출
        let cSum = 0, cCredit = 0;
        calcState.sejongCareer.forEach(r => {
            if (r.credit <= 0 || !filterFn(r.category)) return;
            cCredit += r.credit;
            cSum += (achMap[r.ach] || 0) * r.credit;
        });

        let careerAvg = cCredit > 0 ? (cSum / cCredit) : 0;
        careerAvg = Math.floor(careerAvg * 100000000) / 100000000;

        let finalRankScore = 0;
        let finalCareerScore = 0;

        // 3. 예외 처리 (진로선택 미이수 시 공통/일반 100% 반영)
        if (cCredit === 0) {
            finalRankScore = Math.floor(rankAvg * 1.0 * 100000000) / 100000000;
            finalCareerScore = 0;
        } else {
            finalRankScore = Math.floor(rankAvg * 0.8 * 100000000) / 100000000;
            finalCareerScore = Math.floor(careerAvg * 0.2 * 100000000) / 100000000;
        }

        let finalTotal = Math.floor((finalRankScore + finalCareerScore) * 100000000) / 100000000;

        const eRanked = document.getElementById('sejong-ranked-score');
        if (eRanked) {
            eRanked.textContent = finalRankScore.toFixed(8);
            document.getElementById('sejong-career-score').textContent = finalCareerScore.toFixed(8);
            document.getElementById('sejong-final-score').textContent = finalTotal.toFixed(8);
        }
    }

    // === 단국대학교 ===
    function upDankookMajor(val) {
        calcState.dankookMajor = val;
        calculateDankookScore();
    }

    function renderDankookUI() {
        const container = getCalcContainer();
        const tableStyle = `<table class="y-table"><thead><tr><th width="80">교과구분</th><th>과목명</th><th width="50">단위</th>`;

        const rankedHtml = `
            <div class="y-section">
                <div style="display:flex; gap:15px; align-items:center; margin-bottom:15px; border-bottom: 1px solid #e2e8f0; padding-bottom:10px; flex-wrap:wrap;">
                    <strong style="color:#1e293b;">지원 계열 선택:</strong>
                    <label><input type="radio" name="dankookMajor" value="general" ${calcState.dankookMajor==='general'?'checked':''} onchange="upDankookMajor(this.value)"> 일반/체육교육과(국/수/영/사/과)</label>
                    <label><input type="radio" name="dankookMajor" value="arts_sports" ${calcState.dankookMajor==='arts_sports'?'checked':''} onchange="upDankookMajor(this.value)"> 예능·체육계열(국/영/사)</label>
                </div>
                <h4>공통/일반선택과목 (석차등급)
                    <button class="btn-sm" onclick="addRow('dankookRanked')">+ 과목 추가</button>
                </h4>
                ${tableStyle}
                    <th width="70">등급</th><th width="40">삭제</th></tr>
                </thead>
                <tbody>
                    ${calcState.dankookRanked.map((r, i) => `
                        <tr>
                            <td>
                                <select onchange="upRow('dankookRanked',${i},'category',this.value)">
                                    <option value="국어" ${r.category==='국어'?'selected':''}>국어</option>
                                    <option value="수학" ${r.category==='수학'?'selected':''}>수학</option>
                                    <option value="영어" ${r.category==='영어'?'selected':''}>영어</option>
                                    <option value="사회" ${r.category==='사회'?'selected':''}>사회</option>
                                    <option value="과학" ${r.category==='과학'?'selected':''}>과학</option>
                                </select>
                            </td>
                            <td><input type="text" value="${r.name}" onchange="upRow('dankookRanked',${i},'name',this.value)"></td>
                            <td><input type="number" value="${r.credit}" onchange="upRow('dankookRanked',${i},'credit',this.value)"></td>
                            <td><input type="number" value="${r.rank}" min="1" max="9" onchange="upRow('dankookRanked',${i},'rank',this.value)"></td>
                            <td><button class="btn-sm" style="color:var(--danger);" onclick="remRow('dankookRanked',${i})">X</button></td>
                        </tr>
                    `).join('')}
                </tbody></table>
            </div>
        `;

        const careerHtml = `
            <div class="y-section">
                <h4>진로선택과목 (성취도)
                    <button class="btn-sm" onclick="addRow('dankookCareer')">+ 과목 추가</button>
                </h4>
                ${tableStyle}
                    <th width="100">성취도(A/B/C)</th><th width="40">삭제</th></tr>
                </thead>
                <tbody>
                    ${calcState.dankookCareer.map((r, i) => `
                        <tr>
                            <td>
                                <select onchange="upRow('dankookCareer',${i},'category',this.value)">
                                    <option value="국어" ${r.category==='국어'?'selected':''}>국어</option>
                                    <option value="수학" ${r.category==='수학'?'selected':''}>수학</option>
                                    <option value="영어" ${r.category==='영어'?'selected':''}>영어</option>
                                    <option value="사회" ${r.category==='사회'?'selected':''}>사회</option>
                                    <option value="과학" ${r.category==='과학'?'selected':''}>과학</option>
                                </select>
                            </td>
                            <td><input type="text" value="${r.name}" onchange="upRow('dankookCareer',${i},'name',this.value)"></td>
                            <td><input type="number" value="${r.credit}" onchange="upRow('dankookCareer',${i},'credit',this.value)"></td>
                            <td>
                                <select onchange="upRow('dankookCareer',${i},'ach',this.value)">
                                    ${['A','B','C'].map(x => `<option ${r.ach===x?'selected':''}>${x}</option>`).join('')}
                                </select>
                            </td>
                            <td><button class="btn-sm" style="color:var(--danger);" onclick="remRow('dankookCareer',${i})">X</button></td>
                        </tr>
                    `).join('')}
                </tbody></table>
            </div>
        `;

        container.innerHTML = `
            <div class="y-calc-grid">
                <div class="calc-inputs" style="max-height: 700px; overflow-y: auto; padding-right: 10px;">
                    ${rankedHtml}
                    ${careerHtml}
                </div>
                <div>
                    <div class="y-results" style="background: #004b87;"> <!-- 단국대 테마(블루) -->
                        <div style="font-size: 0.9rem; color: #bfdbfe; margin-bottom: 10px;">대상: <strong>${calcState.studentName || '직접 입력'}</strong></div>
                        
                        <div class="y-res-row">
                            <span>교과성적 (가중평균)</span>
                            <span><span id="dankook-avg-score">0.0000</span> / 100</span>
                        </div>
                        <div style="margin:15px 0; border-top: 1px dashed rgba(255,255,255,0.2);"></div>
                        <div class="y-res-total">
                            <span>전형 총점 환산점수</span>
                            <span><span id="dankook-final-score">0.000</span> / 1000</span>
                        </div>
                        <div style="margin-top: 20px;">
                            <button class="btn btn-green" style="width: 100%; justify-content:center; background-color:#2563eb; color:white; border:none;" onclick="calculateDankookScore()">🔄 점수 재계산</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function calculateDankookScore() {
        const rankMap = {1:100, 2:99, 3:98, 4:97, 5:96, 6:95, 7:70, 8:40, 9:0};
        const achMap = {'A':100, 'B':98, 'C':96};
        const major = calcState.dankookMajor;

        const filterFn = (cat) => {
            if (major === 'general') return ['국어', '수학', '영어', '사회', '과학'].includes(cat);
            if (major === 'arts_sports') return ['국어', '영어', '사회'].includes(cat);
            return false;
        };

        let totalScoreSum = 0;
        let totalCredit = 0;

        calcState.dankookRanked.forEach(r => {
            if (r.credit <= 0 || !filterFn(r.category)) return;
            totalCredit += r.credit;
            totalScoreSum += (rankMap[r.rank] || 0) * r.credit;
        });

        calcState.dankookCareer.forEach(r => {
            if (r.credit <= 0 || !filterFn(r.category)) return;
            totalCredit += r.credit;
            totalScoreSum += (achMap[r.ach] || 0) * r.credit;
        });

        // 넷째 자리에서 반올림 (셋째 자리까지 구함)
        let subjectAvg = totalCredit > 0 ? (totalScoreSum / totalCredit) : 0;
        subjectAvg = Math.round(subjectAvg * 1000) / 1000;

        let finalTotal = subjectAvg * 10;

        const eAvg = document.getElementById('dankook-avg-score');
        if (eAvg) {
            eAvg.textContent = subjectAvg.toFixed(4); // 표기는 4자리 확보
            document.getElementById('dankook-final-score').textContent = finalTotal.toFixed(3);
        }
    }

    // === 광운대학교 ===
    function renderKwangwoonUI() {
        const container = getCalcContainer();
        const tableStyle = `<table class="y-table"><thead><tr><th>과목명</th><th width="50">단위</th>`;

        const rankedHtml = `
            <div class="y-section">
                <h4>공통/일반선택과목 (국/수/영/사/과 전과목)
                    <button class="btn-sm" onclick="addRow('kwRanked')">+ 과목 추가</button>
                </h4>
                <div style="font-size:0.75rem; color:#64748b; margin-bottom:5px;">* 광운대학교는 국어, 영어, 수학, 사회(한국사 포함), 과학 교과 전 과목을 반영합니다.</div>
                ${tableStyle}
                    <th width="70">등급</th><th width="40">삭제</th></tr>
                </thead>
                <tbody>
                    ${calcState.kwRanked.map((r, i) => `
                        <tr>
                            <td><input type="text" value="${r.name}" onchange="upRow('kwRanked',${i},'name',this.value)"></td>
                            <td><input type="number" value="${r.credit}" onchange="upRow('kwRanked',${i},'credit',this.value)"></td>
                            <td><input type="number" value="${r.rank}" min="1" max="9" onchange="upRow('kwRanked',${i},'rank',this.value)"></td>
                            <td><button class="btn-sm" style="color:var(--danger);" onclick="remRow('kwRanked',${i})">X</button></td>
                        </tr>
                    `).join('')}
                </tbody></table>
            </div>
        `;

        const careerHtml = `
            <div class="y-section">
                <h4>진로선택과목 (성취도)
                    <button class="btn-sm" onclick="addRow('kwCareer')">+ 과목 추가</button>
                </h4>
                ${tableStyle}
                    <th width="100">성취도(A/B/C)</th><th width="40">삭제</th></tr>
                </thead>
                <tbody>
                    ${calcState.kwCareer.map((r, i) => `
                        <tr>
                            <td><input type="text" value="${r.name}" onchange="upRow('kwCareer',${i},'name',this.value)"></td>
                            <td><input type="number" value="${r.credit}" onchange="upRow('kwCareer',${i},'credit',this.value)"></td>
                            <td>
                                <select onchange="upRow('kwCareer',${i},'ach',this.value)">
                                    ${['A','B','C'].map(x => `<option ${r.ach===x?'selected':''}>${x}</option>`).join('')}
                                </select>
                            </td>
                            <td><button class="btn-sm" style="color:var(--danger);" onclick="remRow('kwCareer',${i})">X</button></td>
                        </tr>
                    `).join('')}
                </tbody></table>
            </div>
        `;

        container.innerHTML = `
            <div class="y-calc-grid">
                <div class="calc-inputs" style="max-height: 700px; overflow-y: auto; padding-right: 10px;">
                    ${rankedHtml}
                    ${careerHtml}
                </div>
                <div>
                    <div class="y-results" style="background: #8B0000;"> <!-- 광운대 테마(다크레드) -->
                        <div style="font-size: 0.9rem; color: #fecaca; margin-bottom: 10px;">대상: <strong>${calcState.studentName || '직접 입력'}</strong></div>
                        
                        <div class="y-res-row">
                            <span>교과점수 (가중평균)</span>
                            <span><span id="kw-avg-score">0.000</span> / 100</span>
                        </div>
                        <div style="margin:15px 0; border-top: 1px dashed rgba(255,255,255,0.2);"></div>
                        <div class="y-res-total">
                            <span>최종 환산점수</span>
                            <span><span id="kw-final-score">0.000</span> / 1000</span>
                        </div>
                        <div style="margin-top: 20px;">
                            <button class="btn btn-green" style="width: 100%; justify-content:center; background-color:#ef4444; color:white; border:none;" onclick="calculateKwangwoonScore()">🔄 점수 재계산</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function calculateKwangwoonScore() {
        const rankMap = {1:100, 2:98, 3:96, 4:94, 5:92, 6:88, 7:80, 8:70, 9:0};
        const achMap = {'A':100, 'B':98, 'C':94};

        let totalScoreSum = 0;
        let totalCredit = 0;

        calcState.kwRanked.forEach(r => {
            if (r.credit <= 0) return;
            totalCredit += r.credit;
            totalScoreSum += (rankMap[r.rank] || 0) * r.credit;
        });

        calcState.kwCareer.forEach(r => {
            if (r.credit <= 0) return;
            totalCredit += r.credit;
            totalScoreSum += (achMap[r.ach] || 0) * r.credit;
        });

        let subjectAvg = totalCredit > 0 ? (totalScoreSum / totalCredit) : 0;
        let finalTotal = subjectAvg * 10;
        
        // 넷째 자리에서 반올림 (셋째 자리까지 구함)
        finalTotal = Math.round(finalTotal * 1000) / 1000;

        const eAvg = document.getElementById('kw-avg-score');
        if (eAvg) {
            eAvg.textContent = subjectAvg.toFixed(3);
            document.getElementById('kw-final-score').textContent = finalTotal.toFixed(3);
        }
    }

    // 초기 실행
    window.addEventListener('resize', () => {
        if (state.students.length > 0) renderChart(getFilteredStudents());
    });




