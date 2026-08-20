/* ===================================================================
   수시 입결 확인하기 탭
   데이터: susi_ipgyeol_data.js (2026_수시입결_통합.xlsx 에서 생성)
   대학 → 학과 → 전형 계층형 드롭다운 + 입결 시각화
   =================================================================== */
(function () {
  'use strict';

  const KEY = { REGION: 0, UNIV: 1, DEPT: 2, YEAR: 3, TYPE: 4 };
  const VAL0 = 5; // 값 컬럼이 시작되는 행 배열 인덱스

  let D = null;         // window.SUSI_IPGYEOL_DATA
  let col = {};         // 값 컬럼명 → 행 배열 인덱스
  let byUniv = null;    // 대학 인덱스 → 행 목록
  let built = false;
  const charts = {};

  const state = {
    region: '', univ: '', dept: '', type: '', year: '',
    metric: '최종등록(평균)', deptQuery: '', tableAll: false
  };

  /* ---------- 값 파싱 ------------------------------------------------
     원본 엑셀은 PDF에서 옮겨온 자료라 표기가 일정하지 않다.
     '13.80:1'(경쟁률), '63.0%'(충족률), '1,287'(천단위), '390/366.2'(만점/점수),
     '3명 이하'/'등록자없음'(비공개), '22..4542'(두 값이 한 글자씩 교차 삽입된 파손)  */
  function parseVal(v) {
    if (v === '' || v === null || v === undefined) return null;
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    let s = String(v).trim();
    if (!s || s === '-' || s.indexOf('명') >= 0 || s.indexOf('없음') >= 0) return null;
    s = s.replace(/,/g, '');
    if (/^[\d.]+\s*:\s*1$/.test(s)) s = s.split(':')[0];      // 경쟁률
    if (/^[\d.]+%$/.test(s)) s = s.slice(0, -1);              // 백분율
    if (/^[\d.]+\/[\d.]+$/.test(s)) s = s.split('/')[1];      // 만점/취득점수
    let n = Number(s);
    if (Number.isFinite(n)) return n;
    // 교차 삽입 파손: 홀/짝 위치를 갈라 두 값을 복원하고 앞쪽 값을 사용
    if (s.length % 2 === 0) {
      let a = '', b = '';
      for (let i = 0; i < s.length; i++) { if (i % 2) b += s[i]; else a += s[i]; }
      const na = Number(a), nb = Number(b);
      if (Number.isFinite(na) && Number.isFinite(nb) && a !== '' && b !== '') return na;
    }
    return null;
  }

  const raw = (row, name) => { const i = col[name]; return i === undefined ? '' : row[i]; };
  const num = (row, name) => parseVal(raw(row, name));

  const GRADE_METRICS = ['최초합격(최고)', '최초합격(평균)', '최초합격(50%)', '최초합격(70%)',
    '최초합격(75%)', '최초합격(100%)', '최종등록(최고)', '최종등록(평균)', '최종등록(50%)',
    '최종등록(70%)', '최종등록(75%)', '최종등록(85%)', '최종등록(90%)', '최종등록(최저)'];
  const isGradeMetric = (m) => GRADE_METRICS.indexOf(m) >= 0;
  // 등급(1~9)과 대학 환산점수(수백점대)가 같은 열에 섞여 있어 스케일을 나눠 다룬다
  const isGradeScale = (n) => n !== null && n > 0 && n <= 9;

  const METRIC_OPTIONS = [
    '최종등록(평균)', '최종등록(70%)', '최종등록(50%)', '최종등록(최고)', '최종등록(최저)',
    '최초합격(평균)', '최초합격(최고)', '경쟁률', '충원율', '모집인원', '지원인원'
  ];

  const fmt = (n, d) => (n === null || n === undefined || !Number.isFinite(n))
    ? '–' : n.toLocaleString('ko-KR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmtMetric = (n, m) => (m === '모집인원' || m === '지원인원') ? fmt(n, 0) : fmt(n, 2);
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const mean = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;

  /* ---------- 데이터 준비 ---------- */
  function ensureData() {
    if (D) return true;
    D = window.SUSI_IPGYEOL_DATA;
    if (!D) return false;
    D.valCols.forEach((c, i) => { col[c] = VAL0 + i; });
    byUniv = new Map();
    for (const r of D.rows) {
      const u = r[KEY.UNIV];
      if (!byUniv.has(u)) byUniv.set(u, []);
      byUniv.get(u).push(r);
    }
    return true;
  }

  const dict = { region: () => D.dicts.region, univ: () => D.dicts.univ, dept: () => D.dicts.dept, year: () => D.dicts.year, type: () => D.dicts.type };
  const label = (kind, i) => dict[kind]()[i];

  /** 현재 필터 중 일부만 적용한 행 목록. depth: 'region'|'univ'|'dept'|'type' 까지 적용 */
  function rowsAt(depth) {
    const uIdx = state.univ === '' ? -1 : Number(state.univ);
    let src = uIdx >= 0 ? (byUniv.get(uIdx) || []) : D.rows;
    // 학과를 고르지 않은 상태의 검색어는 학과 목록뿐 아니라 결과 범위도 함께 좁힌다
    // (검색은 선택한 대학 안에서만 동작한다)
    const q = (uIdx >= 0 && state.dept === '' && state.deptQuery) ? state.deptQuery.toLowerCase() : '';
    const out = [];
    for (const r of src) {
      if (state.region && label('region', r[KEY.REGION]) !== state.region) continue;
      if (state.year && label('year', r[KEY.YEAR]) !== state.year) continue;
      if (depth === 'region') { out.push(r); continue; }
      if (uIdx >= 0 && r[KEY.UNIV] !== uIdx) continue;
      if (depth === 'univ') { out.push(r); continue; }
      if (q && label('dept', r[KEY.DEPT]).toLowerCase().indexOf(q) < 0) continue;
      if (state.dept !== '' && r[KEY.DEPT] !== Number(state.dept)) continue;
      if (depth === 'dept') { out.push(r); continue; }
      if (state.type !== '' && r[KEY.TYPE] !== Number(state.type)) continue;
      out.push(r);
    }
    return out;
  }

  /* ---------- 테마 색상 ---------- */
  function palette() {
    const light = document.body.classList.contains('light-mode');
    return light
      ? { s1: '#2a78d6', s2: '#eb6834', s3: '#1baf7a', band: 'rgba(42,120,214,0.22)', muted: '#898781', grid: 'rgba(94,106,210,0.14)', ink: '#1a1c35', sub: '#5c6080' }
      : { s1: '#3987e5', s2: '#d95926', s3: '#199e70', band: 'rgba(57,135,229,0.28)', muted: '#898781', grid: 'rgba(255,255,255,0.10)', ink: '#f8f9fa', sub: '#adb5bd' };
  }

  /* 막대 끝 직접 라벨 (별도 플러그인 없이) */
  const endLabels = {
    id: 'siEndLabels',
    afterDatasetsDraw(chart, args, opts) {
      if (!opts || !opts.enabled) return;
      const p = palette();
      const ctx = chart.ctx;
      ctx.save();
      ctx.font = '600 11px system-ui, -apple-system, "Segoe UI", sans-serif';
      ctx.fillStyle = p.sub;
      ctx.textBaseline = 'middle';
      const meta = chart.getDatasetMeta(opts.datasetIndex || 0);
      if (!meta || meta.hidden) { ctx.restore(); return; }
      meta.data.forEach((el, i) => {
        const t = opts.text[i];
        if (t == null) return;
        ctx.textAlign = 'left';
        ctx.fillText(t, el.x + 6, el.y);
      });
      ctx.restore();
    }
  };

  function destroy(k) { if (charts[k]) { charts[k].destroy(); delete charts[k]; } }

  function baseOpts(p) {
    return {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 220 },
      interaction: { mode: 'nearest', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: document.body.classList.contains('light-mode') ? 'rgba(26,28,53,0.94)' : 'rgba(10,12,22,0.94)',
          titleColor: '#fff', bodyColor: '#e8eaf2', borderColor: 'rgba(255,255,255,0.15)',
          borderWidth: 1, padding: 10, cornerRadius: 8, displayColors: true, boxPadding: 4
        }
      },
      scales: {}
    };
  }

  /* ================= UI 뼈대 ================= */
  function injectStyle() {
    if (document.getElementById('si-style')) return;
    const st = document.createElement('style');
    st.id = 'si-style';
    st.textContent = `
#si-root{width:100%;padding:1.5rem 0;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;}
#si-root .si-panel{background:var(--panel-bg);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
  border:1px solid var(--panel-border);border-radius:18px;padding:1.4rem 1.6rem;box-shadow:0 8px 32px rgba(0,0,0,.25);margin-bottom:1.2rem;}
#si-root h2.si-title{margin:0 0 .35rem;font-size:1.45rem;color:var(--text-primary);display:flex;align-items:center;gap:.5rem;}
#si-root p.si-desc{margin:0;font-size:.85rem;color:var(--text-secondary);line-height:1.6;}
#si-root .si-filters{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.75rem 1rem;align-items:end;}
#si-root .si-field{display:flex;flex-direction:column;gap:.35rem;min-width:0;}
#si-root .si-field label{font-size:.75rem;font-weight:600;color:var(--text-secondary);letter-spacing:.02em;}
#si-root select,#si-root input[type=text]{width:100%;background:var(--input-bg);border:1px solid var(--input-border);
  color:var(--text-primary);border-radius:9px;padding:.55rem .7rem;font-size:.88rem;font-family:inherit;}
#si-root select:focus,#si-root input[type=text]:focus{outline:none;border-color:var(--input-focus);}
#si-root select:disabled{opacity:.45;cursor:not-allowed;}
#si-root .si-btn{background:var(--input-bg);border:1px solid var(--input-border);color:var(--text-secondary);
  border-radius:9px;padding:.55rem .9rem;font-size:.82rem;cursor:pointer;font-family:inherit;font-weight:600;white-space:nowrap;}
#si-root .si-btn:hover{border-color:var(--input-focus);color:var(--text-primary);}
#si-root .si-crumb{margin-top:.9rem;font-size:.85rem;color:var(--text-secondary);display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;}
#si-root .si-crumb b{color:var(--text-primary);font-weight:600;}
#si-root .si-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:.8rem;}
#si-root .si-kpi{background:var(--clr-inset-bg);border:1px solid var(--clr-border-subtle);border-radius:12px;padding:.85rem 1rem;}
#si-root .si-kpi .k{font-size:.72rem;color:var(--text-secondary);font-weight:600;margin-bottom:.3rem;}
#si-root .si-kpi .v{font-size:1.5rem;font-weight:700;color:var(--text-primary);line-height:1.15;}
#si-root .si-kpi .u{font-size:.72rem;color:var(--text-secondary);margin-left:.15rem;font-weight:500;}
#si-root .si-charts{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:1.2rem;align-items:start;margin-bottom:1.2rem;}
#si-root figure.si-fig{margin:0;background:var(--panel-bg);border:1px solid var(--panel-border);border-radius:18px;
  padding:1.2rem 1.4rem;box-shadow:0 8px 32px rgba(0,0,0,.25);display:flex;flex-direction:column;}
#si-root figure.si-fig.wide{grid-column:1/-1;}
#si-root .si-fig h3{margin:0 0 .2rem;font-size:1rem;color:var(--text-primary);font-weight:600;}
#si-root .si-fig .si-sub{margin:0 0 .9rem;font-size:.76rem;color:var(--text-secondary);line-height:1.5;}
#si-root .si-canvas{position:relative;width:100%;}
#si-root .si-legend{display:flex;flex-wrap:wrap;gap:.9rem;margin-top:.8rem;font-size:.76rem;color:var(--text-secondary);}
#si-root .si-legend span{display:inline-flex;align-items:center;gap:.35rem;}
#si-root .si-swatch{width:11px;height:11px;border-radius:3px;display:inline-block;}
#si-root .si-empty{padding:2.2rem 1rem;text-align:center;color:var(--text-secondary);font-size:.88rem;line-height:1.7;}
#si-root .si-tablewrap{overflow-x:auto;border:1px solid var(--clr-border-subtle);border-radius:12px;max-height:560px;overflow-y:auto;}
#si-root table.si-table{border-collapse:collapse;width:100%;font-size:.8rem;white-space:nowrap;}
#si-root table.si-table th{position:sticky;top:0;z-index:1;background:var(--panel-bg);backdrop-filter:blur(12px);
  color:var(--text-secondary);font-weight:600;text-align:left;padding:.6rem .7rem;border-bottom:1px solid var(--panel-border);font-size:.75rem;}
#si-root table.si-table td{padding:.5rem .7rem;border-bottom:1px solid var(--clr-border-subtle);color:var(--text-primary);
  font-variant-numeric:tabular-nums;}
#si-root table.si-table td.t{font-variant-numeric:normal;white-space:normal;min-width:150px;}
#si-root table.si-table tr:hover td{background:var(--clr-inset-bg);}
#si-root .si-note{margin-top:.7rem;font-size:.75rem;color:var(--text-secondary);line-height:1.6;}
#si-root .si-head-row{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap;margin-bottom:.9rem;}
@media (max-width:760px){#si-root .si-charts{grid-template-columns:1fr;}}
`;
    document.head.appendChild(st);
  }

  function buildShell(root) {
    injectStyle();
    root.innerHTML = `
  <section class="si-panel">
    <div class="si-head-row">
      <div>
        <h2 class="si-title">📈 수시 입결 확인하기</h2>
        <p class="si-desc">2026_수시입결_통합 자료(${D.rows.length.toLocaleString('ko-KR')}건 · 대학 ${D.dicts.univ.length}개)입니다.
        <b>대학 → 학과 → 전형</b> 순으로 좁혀가며 입결을 확인하세요.</p>
      </div>
      <button type="button" class="si-btn" id="si-reset">필터 초기화</button>
    </div>
    <div class="si-filters">
      <div class="si-field"><label for="si-region">지역</label><select id="si-region"></select></div>
      <div class="si-field"><label for="si-univ">대학</label><select id="si-univ"></select></div>
      <div class="si-field"><label for="si-deptq">학과 검색 <span style="font-weight:400">(대학 안에서)</span></label>
        <input type="text" id="si-deptq" placeholder="예: 컴퓨터, 간호"></div>
      <div class="si-field"><label for="si-dept">학과</label><select id="si-dept" disabled></select></div>
      <div class="si-field"><label for="si-type">전형</label><select id="si-type" disabled></select></div>
      <div class="si-field"><label for="si-year">학년도</label><select id="si-year"></select></div>
    </div>
    <div class="si-crumb" id="si-crumb"></div>
  </section>

  <section class="si-panel"><div class="si-kpis" id="si-kpis"></div></section>

  <div class="si-charts">
    <figure class="si-fig wide">
      <div class="si-head-row" style="margin-bottom:.4rem;">
        <div>
          <h3 id="si-c1-title">입결 비교</h3>
          <p class="si-sub" id="si-c1-sub"></p>
        </div>
        <div class="si-field" style="max-width:200px;"><label for="si-metric">비교 지표</label><select id="si-metric"></select></div>
      </div>
      <div class="si-canvas" style="height:420px;"><canvas id="si-c1"></canvas></div>
    </figure>

    <figure class="si-fig">
      <h3>입결 분포 범위</h3>
      <p class="si-sub" id="si-c2-sub">최종등록 <b>최고 ~ 최저</b> 구간과 평균·70% 지점입니다. 왼쪽(1등급)에 가까울수록 우수합니다.</p>
      <div class="si-canvas" style="height:380px;"><canvas id="si-c2"></canvas></div>
      <div class="si-legend" id="si-c2-legend"></div>
    </figure>

    <figure class="si-fig">
      <h3>경쟁률 대비 입결</h3>
      <p class="si-sub" id="si-c3-sub"></p>
      <div class="si-canvas" style="height:380px;"><canvas id="si-c3"></canvas></div>
      <div class="si-legend" id="si-c3-legend"></div>
    </figure>
  </div>

  <section class="si-panel">
    <div class="si-head-row">
      <div>
        <h3 style="margin:0 0 .2rem;font-size:1rem;color:var(--text-primary);">원본 데이터</h3>
        <p class="si-sub" id="si-table-sub" style="margin:0;"></p>
      </div>
      <div style="display:flex;gap:.5rem;">
        <button type="button" class="si-btn" id="si-more">전체 보기</button>
        <button type="button" class="si-btn" id="si-csv">CSV 내려받기</button>
      </div>
    </div>
    <div class="si-tablewrap"><table class="si-table" id="si-table"></table></div>
    <p class="si-note">※ 원자료의 표기를 그대로 싣습니다. <b>–</b> 는 대학이 공개하지 않았거나 자료에 없는 항목입니다.
    등급 지표에 수백 점대 값이 보이는 대학은 등급이 아니라 <b>자체 환산점수</b>를 공개한 경우이며, 그래프에서는 등급 자료와 분리해 다룹니다.</p>
  </section>`;

    // ----- 정적 옵션 -----
    const rSel = root.querySelector('#si-region');
    rSel.innerHTML = '<option value="">전체 지역</option>' +
      D.dicts.region.map(r => `<option value="${esc(r)}">${esc(r)}</option>`).join('');

    const ySel = root.querySelector('#si-year');
    const years = D.dicts.year.slice().sort().reverse();
    ySel.innerHTML = '<option value="">전체 학년도</option>' +
      years.map(y => `<option value="${esc(y)}">${esc(y)}학년도</option>`).join('');

    const mSel = root.querySelector('#si-metric');
    mSel.innerHTML = METRIC_OPTIONS.map(m => `<option value="${esc(m)}"${m === state.metric ? ' selected' : ''}>${esc(m)}</option>`).join('');

    // ----- 이벤트 -----
    rSel.addEventListener('change', e => { state.region = e.target.value; state.univ = ''; state.dept = ''; state.type = ''; render(); });
    root.querySelector('#si-univ').addEventListener('change', e => { state.univ = e.target.value; state.dept = ''; state.type = ''; render(); });
    root.querySelector('#si-dept').addEventListener('change', e => { state.dept = e.target.value; state.type = ''; render(); });
    root.querySelector('#si-type').addEventListener('change', e => { state.type = e.target.value; render(); });
    ySel.addEventListener('change', e => { state.year = e.target.value; render(); });
    mSel.addEventListener('change', e => { state.metric = e.target.value; render(); });
    root.querySelector('#si-deptq').addEventListener('input', e => {
      state.deptQuery = e.target.value.trim();
      if (state.dept !== '' && state.deptQuery &&
        label('dept', Number(state.dept)).toLowerCase().indexOf(state.deptQuery.toLowerCase()) < 0) {
        state.dept = ''; state.type = '';
      }
      render();
    });
    root.querySelector('#si-reset').addEventListener('click', () => {
      state.region = ''; state.univ = ''; state.dept = ''; state.type = ''; state.year = '';
      state.deptQuery = ''; state.tableAll = false;
      root.querySelector('#si-deptq').value = '';
      render();
    });
    root.querySelector('#si-more').addEventListener('click', () => { state.tableAll = !state.tableAll; render(); });
    root.querySelector('#si-csv').addEventListener('click', downloadCsv);

    // 라이트/다크 전환 시에만 차트 색 갱신 (다른 body 클래스 변화는 무시)
    let wasLight = document.body.classList.contains('light-mode');
    new MutationObserver(() => {
      const isLight = document.body.classList.contains('light-mode');
      if (isLight === wasLight) return;
      wasLight = isLight;
      if (document.getElementById('si-root').offsetParent !== null) render();
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

    built = true;
  }

  /* ================= 드롭다운 채우기 ================= */
  function fillCascades(root) {
    // 대학: 지역/학년도 필터 반영, 지역별 optgroup
    const pool = rowsAt('region');
    const uSet = new Map(); // univIdx -> regionName
    for (const r of pool) if (!uSet.has(r[KEY.UNIV])) uSet.set(r[KEY.UNIV], label('region', r[KEY.REGION]));
    const groups = new Map();
    for (const [u, reg] of uSet) { if (!groups.has(reg)) groups.set(reg, []); groups.get(reg).push(u); }
    let uHtml = `<option value="">대학을 선택하세요 (${uSet.size}개)</option>`;
    for (const reg of D.dicts.region) {
      const list = groups.get(reg);
      if (!list) continue;
      list.sort((a, b) => label('univ', a).localeCompare(label('univ', b), 'ko'));
      uHtml += `<optgroup label="${esc(reg)}">` +
        list.map(u => `<option value="${u}">${esc(label('univ', u))}</option>`).join('') + '</optgroup>';
    }
    const uSel = root.querySelector('#si-univ');
    uSel.innerHTML = uHtml;
    if (state.univ !== '' && !uSet.has(Number(state.univ))) { state.univ = ''; state.dept = ''; state.type = ''; }
    uSel.value = state.univ;

    // 학과: 선택한 대학 안에서만
    const dSel = root.querySelector('#si-dept');
    if (state.univ === '') {
      dSel.innerHTML = '<option value="">← 대학을 먼저 선택하세요</option>';
      dSel.disabled = true;
      state.dept = '';
    } else {
      const q = state.deptQuery.toLowerCase();
      const dSet = new Set();
      for (const r of rowsAt('univ')) {
        if (q && label('dept', r[KEY.DEPT]).toLowerCase().indexOf(q) < 0) continue;
        dSet.add(r[KEY.DEPT]);
      }
      const list = [...dSet].sort((a, b) => label('dept', a).localeCompare(label('dept', b), 'ko'));
      dSel.disabled = false;
      dSel.innerHTML = `<option value="">전체 학과 (${list.length}개)</option>` +
        list.map(d => `<option value="${d}">${esc(label('dept', d))}</option>`).join('');
      if (state.dept !== '' && !dSet.has(Number(state.dept))) { state.dept = ''; state.type = ''; }
      dSel.value = state.dept;
    }

    // 전형: 선택한 학과 안에서만
    const tSel = root.querySelector('#si-type');
    if (state.dept === '') {
      tSel.innerHTML = '<option value="">← 학과를 먼저 선택하세요</option>';
      tSel.disabled = true;
      state.type = '';
    } else {
      const tSet = new Set();
      for (const r of rowsAt('dept')) tSet.add(r[KEY.TYPE]);
      const list = [...tSet].sort((a, b) => label('type', a).localeCompare(label('type', b), 'ko'));
      tSel.disabled = false;
      tSel.innerHTML = `<option value="">전체 전형 (${list.length}개)</option>` +
        list.map(t => `<option value="${t}">${esc(label('type', t))}</option>`).join('');
      tSel.value = state.type;
    }

    root.querySelector('#si-region').value = state.region;
    root.querySelector('#si-year').value = state.year;
  }

  /* ================= 렌더 ================= */
  function render() {
    const root = document.getElementById('si-root');
    if (!root) return;
    fillCascades(root);

    const rows = rowsAt('type');
    renderCrumb(root, rows);
    renderKpis(root, rows);
    renderChart1(root);
    renderChart2(root, rows);
    renderChart3(root, rows);
    renderTable(root, rows);
  }

  function renderCrumb(root, rows) {
    const parts = [];
    if (state.region) parts.push(esc(state.region));
    parts.push(state.univ === '' ? '전체 대학' : `<b>${esc(label('univ', Number(state.univ)))}</b>`);
    if (state.univ !== '') {
      parts.push(state.dept !== '' ? `<b>${esc(label('dept', Number(state.dept)))}</b>`
        : (state.deptQuery ? `“${esc(state.deptQuery)}” 포함 학과` : '전체 학과'));
    }
    if (state.dept !== '') parts.push(state.type === '' ? '전체 전형' : `<b>${esc(label('type', Number(state.type)))}</b>`);
    if (state.year) parts.push(`${esc(state.year)}학년도`);
    root.querySelector('#si-crumb').innerHTML =
      parts.join(' <span style="opacity:.5">›</span> ') +
      ` <span style="opacity:.5">·</span> 해당 ${rows.length.toLocaleString('ko-KR')}건`;
  }

  function renderKpis(root, rows) {
    const sum = (name) => {
      const v = rows.map(r => num(r, name)).filter(x => x !== null);
      return v.length ? v.reduce((a, b) => a + b, 0) : null;
    };
    const avgGrade = (name) => mean(rows.map(r => num(r, name)).filter(isGradeScale));
    const comp = mean(rows.map(r => num(r, '경쟁률')).filter(x => x !== null && x > 0));
    const fill = mean(rows.map(r => num(r, '충원율')).filter(x => x !== null));

    const cards = [
      ['모집인원 합계', fmt(sum('모집인원'), 0), '명'],
      ['지원인원 합계', fmt(sum('지원인원'), 0), '명'],
      ['평균 경쟁률', fmt(comp, 2), ': 1'],
      ['평균 충원율', fmt(fill, 1), '%'],
      ['최종등록 평균', fmt(avgGrade('최종등록(평균)'), 2), '등급'],
      ['최종등록 70%', fmt(avgGrade('최종등록(70%)'), 2), '등급'],
    ];
    root.querySelector('#si-kpis').innerHTML = cards.map(([k, v, u]) =>
      `<div class="si-kpi"><div class="k">${esc(k)}</div><div class="v">${v}<span class="u">${esc(u)}</span></div></div>`
    ).join('');
  }

  /* --- 차트1: 선택 깊이에 따라 대학별 / 학과별 / 전형별 비교 ---
     전형까지 고른 경우에도 같은 학과의 다른 전형과 나란히 두고 선택 전형만 강조한다.
     (자료가 사실상 2026학년도 한 해뿐이라 학년도별 비교는 의미가 없다) */
  function chart1Groups() {
    if (state.univ === '') {
      return { keyIdx: KEY.UNIV, kind: 'univ', rows: rowsAt('region'), unit: '대학', limit: 30, hi: null };
    }
    if (state.dept === '') {
      // rowsAt('dept')는 학과 미선택 시 '검색어로 좁힌 해당 대학 전체'와 같다
      return { keyIdx: KEY.DEPT, kind: 'dept', rows: rowsAt('dept'), unit: '학과', limit: 30, hi: null };
    }
    return {
      keyIdx: KEY.TYPE, kind: 'type', rows: rowsAt('dept'), unit: '전형', limit: 30,
      hi: state.type === '' ? null : Number(state.type)
    };
  }

  /* 고른 지표에 자료가 없으면 자료가 있는 지표로 자동 대체 */
  const FALLBACK = ['최종등록(평균)', '최종등록(70%)', '최종등록(50%)', '최초합격(평균)', '경쟁률', '모집인원'];
  function pickMetric(rows) {
    const has = (m) => {
      const g = isGradeMetric(m);
      return rows.some(r => { const v = num(r, m); return v !== null && (!g || isGradeScale(v)); });
    };
    if (has(state.metric)) return { metric: state.metric, fellBack: false };
    for (const m of FALLBACK) if (m !== state.metric && has(m)) return { metric: m, fellBack: true };
    return { metric: state.metric, fellBack: false };
  }

  function renderChart1(root) {
    const p = palette();
    const g = chart1Groups();
    const { metric: m, fellBack } = pickMetric(g.rows);
    const gradeM = isGradeMetric(m);

    // 그룹별 평균값 (등급 지표는 등급 스케일 행만 사용)
    const acc = new Map();
    let excluded = 0;
    for (const r of g.rows) {
      const v = num(r, m);
      if (v === null) continue;
      if (gradeM && !isGradeScale(v)) { excluded++; continue; }
      const k = r[g.keyIdx];
      if (!acc.has(k)) acc.set(k, []);
      acc.get(k).push(v);
    }
    let items = [...acc.entries()].map(([k, arr]) => ({ key: k, name: label(g.kind, k), v: mean(arr), n: arr.length }));
    // 등급은 작을수록 우수 → 오름차순, 그 외는 큰 값이 위로
    items.sort((a, b) => gradeM ? a.v - b.v : b.v - a.v);
    const cut = items.length > g.limit;
    if (cut && g.hi !== null && !items.slice(0, g.limit).some(it => it.key === g.hi)) {
      // 선택한 항목이 잘려 나가지 않도록 마지막 칸을 내준다
      const sel = items.find(it => it.key === g.hi);
      items = items.slice(0, g.limit - 1);
      if (sel) items.push(sel);
    } else {
      items = items.slice(0, g.limit);
    }

    const titles = { univ: '대학별', dept: '학과별', type: '전형별' };
    root.querySelector('#si-c1-title').textContent = `${titles[g.kind]} ${m} 비교`;
    const hiName = g.hi === null ? '' : label('type', g.hi);
    root.querySelector('#si-c1-sub').innerHTML =
      (fellBack ? `<b>${esc(state.metric)}</b> 자료가 없어 <b>${esc(m)}</b>(으)로 표시합니다. ` : '') +
      (gradeM ? '등급은 <b>낮을수록 우수</b>합니다 — 막대가 짧을수록 좋은 결과입니다. ' : '값이 클수록 막대가 깁니다. ') +
      (hiName ? `선택한 <b style="color:${p.s2}">${esc(hiName)}</b>을(를) 주황색으로 강조했습니다. ` : '') +
      `${g.unit} ${items.length}개${cut ? ` (상위 ${g.limit}개만 표시)` : ''}` +
      (excluded ? ` · 환산점수로 공개한 ${excluded}건은 제외` : '');

    const cv = root.querySelector('#si-c1');
    cv.parentElement.style.height = Math.max(240, items.length * 26 + 70) + 'px';
    destroy('c1');
    if (!items.length) { clearCanvas(cv, `${m} 자료가 공개되지 않았습니다.`); return; }

    const o = baseOpts(p);
    o.indexAxis = 'y';
    o.plugins.siEndLabels = { enabled: true, datasetIndex: 0, text: items.map(it => fmtMetric(it.v, m)) };
    o.plugins.tooltip.callbacks = {
      title: (c) => items[c[0].dataIndex].name,
      label: (c) => `${m} 평균 ${fmtMetric(items[c.dataIndex].v, m)} · 자료 ${items[c.dataIndex].n}건`
    };
    o.layout = { padding: { right: 54 } };
    o.scales = {
      x: {
        beginAtZero: true, grid: { color: p.grid, drawTicks: false }, border: { display: false },
        ticks: { color: p.muted, font: { size: 11 } },
        title: { display: true, text: gradeM ? `${m} (등급 · 낮을수록 우수)` : m, color: p.sub, font: { size: 11, weight: '600' } }
      },
      y: { grid: { display: false }, border: { display: false }, ticks: { color: p.sub, font: { size: 11 }, autoSkip: false } }
    };

    charts.c1 = new Chart(cv, {
      type: 'bar',
      data: {
        labels: items.map(it => trim(it.name, 26)),
        datasets: [{
          data: items.map(it => it.v),
          backgroundColor: items.map(it => (g.hi !== null && it.key === g.hi) ? p.s2 : p.s1),
          borderRadius: 4, borderSkipped: 'start', barThickness: 14, maxBarThickness: 16
        }]
      },
      options: o, plugins: [endLabels]
    });
  }

  /* --- 차트2: 최종등록 최고~최저 범위 + 평균/70% 마커 --- */
  function renderChart2(root, rowsSel) {
    const p = palette();
    const g = chart1Groups();
    const acc = new Map();
    for (const r of g.rows) {
      const hi = num(r, '최종등록(최고)'), lo = num(r, '최종등록(최저)');
      const av = num(r, '최종등록(평균)'), s70 = num(r, '최종등록(70%)');
      const vals = [hi, lo, av, s70].filter(isGradeScale);
      if (!vals.length) continue;
      const k = r[g.keyIdx];
      if (!acc.has(k)) acc.set(k, { hi: [], lo: [], av: [], s70: [] });
      const a = acc.get(k);
      if (isGradeScale(hi)) a.hi.push(hi);
      if (isGradeScale(lo)) a.lo.push(lo);
      if (isGradeScale(av)) a.av.push(av);
      if (isGradeScale(s70)) a.s70.push(s70);
    }
    let items = [...acc.entries()].map(([k, a]) => {
      const av = mean(a.av), s70 = mean(a.s70);
      let hi = mean(a.hi), lo = mean(a.lo);
      const anchor = av !== null ? av : (s70 !== null ? s70 : hi);
      if (hi === null) hi = anchor;
      if (lo === null) lo = (s70 !== null && s70 > hi) ? s70 : hi;
      return { key: k, name: label(g.kind, k), hi, lo, av, s70, sort: anchor };
    }).filter(it => it.sort !== null);
    items.sort((a, b) => a.sort - b.sort);
    const cut = items.length > 22;
    if (cut && g.hi !== null && !items.slice(0, 22).some(it => it.key === g.hi)) {
      const sel = items.find(it => it.key === g.hi);
      items = items.slice(0, 21);
      if (sel) items.push(sel);
    } else {
      items = items.slice(0, 22);
    }

    const cv = root.querySelector('#si-c2');
    cv.parentElement.style.height = Math.max(240, items.length * 24 + 70) + 'px';
    destroy('c2');
    root.querySelector('#si-c2-legend').innerHTML = items.length ? [
      [p.band, '최고~최저 구간'], [p.s2, '평균'], [p.s3, '70% 지점']
    ].map(([c, t]) => `<span><i class="si-swatch" style="background:${c}"></i>${esc(t)}</span>`).join('') : '';
    const unitName = { univ: '대학', dept: '학과', type: '전형' }[g.kind];
    root.querySelector('#si-c2-sub').innerHTML =
      `${esc(unitName)}별 최종등록 <b>최고 ~ 최저</b> 구간과 평균·70% 지점입니다. 왼쪽(1등급)에 가까울수록 우수합니다.` +
      (cut ? ` 상위 22개만 표시합니다.` : '');

    if (!items.length) { clearCanvas(cv, '등급으로 공개된 최종등록 자료가 없습니다.'); return; }

    const labels = items.map(it => trim(it.name, 22));
    const o = baseOpts(p);
    o.indexAxis = 'y';
    o.plugins.tooltip.callbacks = {
      title: (c) => items[c[0].dataIndex].name,
      label: (c) => {
        const it = items[c.dataIndex];
        if (c.datasetIndex === 0) return `최고 ${fmt(it.hi, 2)} ~ 최저 ${fmt(it.lo, 2)}등급`;
        if (c.datasetIndex === 1) return `평균 ${fmt(it.av, 2)}등급`;
        return `70% ${fmt(it.s70, 2)}등급`;
      }
    };
    o.scales = {
      x: {
        min: 1, suggestedMax: 9, grid: { color: p.grid, drawTicks: false }, border: { display: false },
        ticks: { color: p.muted, font: { size: 11 }, stepSize: 1 },
        title: { display: true, text: '등급 (낮을수록 우수)', color: p.sub, font: { size: 11, weight: '600' } }
      },
      y: { grid: { display: false }, border: { display: false }, ticks: { color: p.sub, font: { size: 11 }, autoSkip: false } }
    };

    charts.c2 = new Chart(cv, {
      data: {
        labels,
        datasets: [
          {
            type: 'bar', label: '최고~최저', data: items.map(it => [it.hi, it.lo]),
            backgroundColor: p.band,
            borderColor: items.map(it => (g.hi !== null && it.key === g.hi) ? p.s2 : p.s1),
            borderWidth: items.map(it => (g.hi !== null && it.key === g.hi) ? 2 : 1),
            borderRadius: 4, barThickness: 11, maxBarThickness: 13
          },
          {
            type: 'line', label: '평균', showLine: false,
            data: items.map((it, i) => it.av === null ? null : ({ x: it.av, y: labels[i] })),
            pointBackgroundColor: p.s2, pointBorderColor: p.band, pointBorderWidth: 2, pointRadius: 5, pointHoverRadius: 7
          },
          {
            type: 'line', label: '70%', showLine: false,
            data: items.map((it, i) => it.s70 === null ? null : ({ x: it.s70, y: labels[i] })),
            pointBackgroundColor: p.s3, pointBorderColor: p.band, pointBorderWidth: 2, pointStyle: 'rectRot', pointRadius: 5, pointHoverRadius: 7
          }
        ]
      },
      options: o
    });
  }

  /* --- 차트3: 경쟁률 vs 최종등록 산점도 (선택 항목 강조) --- */
  function renderChart3(root, rowsSel) {
    const p = palette();
    const cv = root.querySelector('#si-c3');
    destroy('c3');

    const scope = state.univ !== '' ? rowsAt('univ') : rowsAt('region');
    const scopeName = state.univ !== '' ? label('univ', Number(state.univ)) : (state.region || '전체');
    const selSet = new Set(rowsSel);
    const pt = (r) => {
      const x = num(r, '경쟁률'), y = num(r, '최종등록(평균)');
      if (x === null || x <= 0 || !isGradeScale(y)) return null;
      return { x, y, d: label('dept', r[KEY.DEPT]), t: label('type', r[KEY.TYPE]), u: label('univ', r[KEY.UNIV]) };
    };
    const base = [], hi = [];
    for (const r of scope) {
      const q = pt(r);
      if (!q) continue;
      (selSet.has(r) ? hi : base).push(q);
    }
    const narrowed = (state.dept !== '' || state.type !== '' || !!state.deptQuery) && hi.length > 0;

    root.querySelector('#si-c3-sub').innerHTML =
      `<b>${esc(scopeName)}</b> 범위의 모집단위별 경쟁률과 최종등록 평균등급입니다. 위로 갈수록 입결이 우수합니다.` +
      (narrowed ? ' 선택한 모집단위를 강조 표시했습니다.' : '');
    root.querySelector('#si-c3-legend').innerHTML = narrowed
      ? `<span><i class="si-swatch" style="background:${p.s1};border-radius:50%"></i>선택한 모집단위 (${hi.length}건)</span>` +
        `<span><i class="si-swatch" style="background:${p.muted};border-radius:50%"></i>${esc(scopeName)}의 나머지 (${base.length}건)</span>`
      : `<span><i class="si-swatch" style="background:${p.s1};border-radius:50%"></i>${esc(scopeName)} 모집단위 ${base.length + hi.length}건</span>`;

    if (!base.length && !hi.length) {
      clearCanvas(cv, '경쟁률과 최종등록 등급이 함께 공개된 자료가 없습니다.');
      return;
    }

    const o = baseOpts(p);
    o.plugins.tooltip.callbacks = {
      title: (c) => { const d = c[0].raw; return `${d.u} ${d.d}`; },
      label: (c) => [`${c.raw.t}`, `경쟁률 ${fmt(c.raw.x, 2)} : 1`, `최종등록 평균 ${fmt(c.raw.y, 2)}등급`]
    };
    o.scales = {
      x: {
        type: 'linear', beginAtZero: true, grid: { color: p.grid, drawTicks: false }, border: { display: false },
        ticks: { color: p.muted, font: { size: 11 } },
        title: { display: true, text: '경쟁률 ( : 1 )', color: p.sub, font: { size: 11, weight: '600' } }
      },
      y: {
        reverse: true, min: 1, suggestedMax: 9, grid: { color: p.grid, drawTicks: false }, border: { display: false },
        ticks: { color: p.muted, font: { size: 11 }, stepSize: 1 },
        title: { display: true, text: '최종등록 평균 (등급 · 위쪽이 우수)', color: p.sub, font: { size: 11, weight: '600' } }
      }
    };

    const dim = document.body.classList.contains('light-mode') ? 'rgba(137,135,129,0.5)' : 'rgba(137,135,129,0.45)';
    const datasets = [];
    if (base.length) datasets.push({
      label: narrowed ? '나머지' : scopeName, data: base,
      backgroundColor: narrowed ? dim : p.s1, borderColor: 'transparent',
      pointRadius: narrowed ? 3.5 : 4.5, pointHoverRadius: 7
    });
    if (hi.length) datasets.push({
      label: '선택한 모집단위', data: hi,
      backgroundColor: p.s1, borderColor: p.band, borderWidth: 2,
      pointRadius: 6.5, pointHoverRadius: 9
    });

    charts.c3 = new Chart(cv, { type: 'scatter', data: { datasets }, options: o });
  }

  function clearCanvas(cv, msg) {
    const ctx = cv.getContext('2d');
    const w = cv.clientWidth || cv.width, h = cv.clientHeight || cv.height;
    cv.width = w; cv.height = h;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = palette().muted;
    ctx.font = '13px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(msg, w / 2, h / 2);
  }

  const trim = (s, n) => s.length > n ? s.slice(0, n - 1) + '…' : s;

  /* --- 표 --- */
  function visibleValCols(rows) {
    return D.valCols.filter(c => rows.some(r => raw(r, c) !== ''));
  }

  function renderTable(root, rows) {
    const LIMIT = 300;
    const shown = state.tableAll ? rows : rows.slice(0, LIMIT);
    const vcols = visibleValCols(rows);
    const heads = [...D.keyCols, ...vcols];

    root.querySelector('#si-table-sub').textContent =
      `${rows.length.toLocaleString('ko-KR')}건 중 ${shown.length.toLocaleString('ko-KR')}건 표시 · 자료가 하나도 없는 항목 열은 숨깁니다.`;
    const moreBtn = root.querySelector('#si-more');
    moreBtn.style.display = rows.length > LIMIT ? '' : 'none';
    moreBtn.textContent = state.tableAll ? `처음 ${LIMIT}건만 보기` : `전체 ${rows.length.toLocaleString('ko-KR')}건 보기`;

    const body = shown.map(r => {
      const keys = [label('region', r[KEY.REGION]), label('univ', r[KEY.UNIV]), label('dept', r[KEY.DEPT]),
        label('year', r[KEY.YEAR]), label('type', r[KEY.TYPE])];
      return '<tr>' + keys.map(v => `<td class="t">${esc(v)}</td>`).join('') +
        vcols.map(c => { const v = raw(r, c); return `<td>${v === '' ? '–' : esc(v)}</td>`; }).join('') + '</tr>';
    }).join('');

    root.querySelector('#si-table').innerHTML =
      `<thead><tr>${heads.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>` +
      `<tbody>${body || `<tr><td colspan="${heads.length}" style="text-align:center;padding:2rem;color:var(--text-secondary)">조건에 맞는 자료가 없습니다.</td></tr>`}</tbody>`;
  }

  function downloadCsv() {
    const rows = rowsAt('type');
    if (!rows.length) { alert('내려받을 자료가 없습니다.'); return; }
    const vcols = visibleValCols(rows);
    const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [[...D.keyCols, ...vcols].map(q).join(',')];
    for (const r of rows) {
      lines.push([
        label('region', r[KEY.REGION]), label('univ', r[KEY.UNIV]), label('dept', r[KEY.DEPT]),
        label('year', r[KEY.YEAR]), label('type', r[KEY.TYPE]),
        ...vcols.map(c => raw(r, c))
      ].map(q).join(','));
    }
    const name = ['수시입결', state.univ !== '' ? label('univ', Number(state.univ)) : '전체',
      state.dept !== '' ? label('dept', Number(state.dept)) : ''].filter(Boolean).join('_') + '.csv';
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* ================= 진입점 ================= */
  window.initSusiIpgyeol = function () {
    const root = document.getElementById('si-root');
    if (!root) return;
    if (!ensureData()) {
      root.innerHTML = '<div class="si-empty">수시 입결 데이터(susi_ipgyeol_data.js)를 불러오지 못했습니다.</div>';
      return;
    }
    if (typeof Chart === 'undefined') {
      root.innerHTML = '<div class="si-empty">차트 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.</div>';
      return;
    }
    if (!built) buildShell(root);
    render();
  };
})();
