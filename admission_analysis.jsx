const { useState, useEffect, useMemo } = React;
const { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } = Recharts;

// ─── 상수 ───────────────────────────────────────────────────────────────────
const COLORS = { '합격': '#10B981', '충원합격': '#3B82F6', '불합격': '#EF4444', '기타': '#9CA3AF' };
const RESULT_CATEGORIES = ['합격', '충원합격', '불합격', '기타'];
const CHART_TYPES = ['학생부위주(교과)', '학생부위주(종합)', '실기/실적위주'];

// ─── SVG 아이콘 ─────────────────────────────────────────────────────────────
const Icons = {
  Filter:   () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  BarChart: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>,
  Landmark: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>,
  Trophy:   () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>,
  ZoomIn:   () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>,
};

// ─── 헬퍼 함수 ──────────────────────────────────────────────────────────────
const getChartType = (type) => {
  if (!type) return '실기/실적위주';
  if (type.includes('교과')) return '학생부위주(교과)';
  if (type.includes('종합') || type.includes('학종') || type.includes('서류')) return '학생부위주(종합)';
  return '실기/실적위주';
};

const getResultCategory = (result) => {
  if (!result) return '기타';
  if (result.includes('불합격') || result.includes('탈락')) return '불합격';
  if (result.includes('충원') || result.includes('추가') || result.includes('예비')) return '충원합격';
  if (result.includes('합격') || result.includes('최초')) return '합격';
  return '기타';
};

// ─── 메인 컴포넌트 ───────────────────────────────────────────────────────────
const AdmissionAnalysis = () => {
  const [data, setData]                   = useState([]);
  const [loading, setLoading]             = useState(false);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [selectedUniPassData, setSelectedUniPassData]   = useState(null);
  const [selectedUniChartData, setSelectedUniChartData] = useState(null);
  const [activeFilters, setActiveFilters] = useState([...RESULT_CATEGORIES]);
  const [yDomain, setYDomain]             = useState([1, 9]);
  const [tempYDomain, setTempYDomain]     = useState([1, 9]);

  useEffect(() => setTempYDomain(yDomain), [yDomain]);

  // ─── 다크모드: body.light-mode 없으면 다크 ───────────────────────────────
  const [isDark, setIsDark] = useState(() => !document.body.classList.contains('light-mode'));
  useEffect(() => {
    const check = () => setIsDark(!document.body.classList.contains('light-mode'));
    const obs = new MutationObserver(check);
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  // ─── 테마 팔레트 ─────────────────────────────────────────────────────────
  const t = isDark ? {
    bg: '#1a2035', bgSub: '#111827', bgCard: '#1e2a40',
    text: '#e2e8f0', textMuted: '#8892a8', textHeading: '#f0f4ff',
    border: '#2a3a5c',
    btnActive: '#6366f1', btnActiveTxt: '#fff',
    btnInactive: '#1a2035', btnInactiveTxt: '#8892a8',
    tagBg: '#2d3a6b', tagTxt: '#a5b4fc',
    chartGrid: '#243050', chartText: '#7a8aa8',
  } : {
    bg: '#ffffff', bgSub: '#f8fafc', bgCard: '#f1f5f9',
    text: '#1e293b', textMuted: '#64748b', textHeading: '#0f172a',
    border: '#e2e8f0',
    btnActive: '#1e293b', btnActiveTxt: '#fff',
    btnInactive: '#ffffff', btnInactiveTxt: '#64748b',
    tagBg: '#e0e7ff', tagTxt: '#4338ca',
    chartGrid: '#e2e8f0', chartText: '#64748b',
  };

  // ─── 파일 파싱 ──────────────────────────────────────────────────────────
  const loadDataFromFile = (file) => {
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = window.XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        let allRows = [];
        wb.SheetNames.forEach(name =>
          allRows = allRows.concat(window.XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: '' }))
        );
        const getVal = (row, keywords) => {
          const key = Object.keys(row).find(k =>
            keywords.some(kw => typeof k === 'string' && k.replace(/\s+/g, '').includes(kw))
          );
          return key ? String(row[key]).trim() : '';
        };
        const parsed = allRows
          .filter(row => {
            const hasType  = Object.keys(row).some(k => typeof k === 'string' && k.includes('전형'));
            const hasGrade = Object.keys(row).some(k => typeof k === 'string' && k.includes('등급'));
            return hasType && hasGrade;
          })
          .map((row, idx) => {
            const gradeRaw  = getVal(row, ['일반등급', '등급']);
            const resultRaw = getVal(row, ['최종단계', '결과', '합격여부', '상태', '판정']);
            return {
              id:          idx,
              uni:         getVal(row, ['대학명', '대학교', '대학']) || '-',
              type:        getVal(row, ['전형유형', '전형구분'])      || '기타',
              typeDetail:  getVal(row, ['세부유형', '전형세부'])      || '-',
              major:       getVal(row, ['모집단위', '학과', '학부', '전공']) || '-',
              count:       getVal(row, ['모집인원'])                 || '-',
              grade:       parseFloat(gradeRaw) || 9.0,
              result: (() => {
                if (!resultRaw) return '기타';
                if (resultRaw.includes('불합격') || resultRaw.includes('탈락')) return '불합격';
                if (resultRaw.includes('충원') || resultRaw.includes('추가') || resultRaw.includes('예비')) return '충원합격';
                if (resultRaw.includes('합격') || resultRaw.includes('최초')) return '합격';
                return resultRaw || '기타';
              })(),
              reason:      getVal(row, ['불합격사유', '사유'])        || '',
              rank:        getVal(row, ['최초후보순위', '후보순위', '예비번호']) || '-',
              admName:     getVal(row, ['전형명(대)', '전형명'])      || '-',
              minStandard: getVal(row, ['최저학력기준', '수능최저'])  || '',
            };
          })
          .filter(item => !isNaN(item.grade) && item.uni !== '-');

        if (parsed.length > 0) {
          setData(parsed);
          setYDomain([1, 9]);
          localStorage.setItem('reactPfData', JSON.stringify(parsed));
        }
      } catch (err) { console.error('Parse error:', err); }
      finally { setLoading(false); }
    };
    reader.onerror = () => setLoading(false);
    reader.readAsArrayBuffer(file);
  };

  useEffect(() => {
    // 1) localStorage 즉시 복원
    const saved = localStorage.getItem('reactPfData');
    if (saved) { try { setData(JSON.parse(saved)); } catch (e) {} }

    // 2) 파일 있으면 즉시 로드 (두 입력 모두 확인)
    const tryLoad = () => {
      var src = document.getElementById('pf-results-upload')
             || document.getElementById('uni-pf-results-upload');
      if (src && src.files && src.files.length > 0) {
        loadDataFromFile(src.files[0]);
        return true;
      }
      return false;
    };
    tryLoad();

    // 3) IndexedDB 복원은 비동기라 500ms 후 재시도
    var t1 = setTimeout(tryLoad, 500);
    var t2 = setTimeout(tryLoad, 1500);

    // 4) change 이벤트 양쪽 모두 감지
    var handler = function(e) {
      var files = e.target && e.target.files;
      if (files && files.length > 0) loadDataFromFile(files[0]);
    };
    var fi1 = document.getElementById('pf-results-upload');
    var fi2 = document.getElementById('uni-pf-results-upload');
    if (fi1) fi1.addEventListener('change', handler);
    if (fi2) fi2.addEventListener('change', handler);

    return function() {
      clearTimeout(t1); clearTimeout(t2);
      if (fi1) fi1.removeEventListener('change', handler);
      if (fi2) fi2.removeEventListener('change', handler);
    };
  }, []);

  // ─── 파생 데이터 ─────────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    const base = data
      .filter(item =>
        activeFilters.includes(getResultCategory(item.result)) &&
        item.grade >= yDomain[0] && item.grade <= yDomain[1]
      )
      .map(item => {
        const ct = getChartType(item.type);
        return { ...item, chartType: ct, chartTypeX: CHART_TYPES.indexOf(ct) };
      });

    const existing = new Set(base.map(d => d.chartType));
    CHART_TYPES.forEach(ct => {
      if (!existing.has(ct))
        base.push({ id: `dummy-${ct}`, chartType: ct, chartTypeX: CHART_TYPES.indexOf(ct), grade: null, _dummy: true });
    });

    const groups = {};
    base.forEach(item => {
      if (item._dummy) return;
      const key = `${item.chartType}-${Number(item.grade).toFixed(2)}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    Object.values(groups).forEach(group =>
      group.forEach((item, i) => { item.xOffset = (i - (group.length - 1) / 2) * 12; })
    );
    return base;
  }, [data, activeFilters, yDomain]);

  const yTicks = useMemo(() => {
    const range = yDomain[1] - yDomain[0];
    const step  = range <= 1 ? 0.1 : range <= 2.5 ? 0.25 : 0.5;
    const ticks = [];
    for (let v = Math.ceil(yDomain[0] / step) * step; v <= yDomain[1]; v += step)
      ticks.push(Number(v.toFixed(2)));
    if (!ticks.includes(yDomain[0])) ticks.unshift(yDomain[0]);
    if (!ticks.includes(yDomain[1])) ticks.push(yDomain[1]);
    return ticks.sort((a, b) => a - b);
  }, [yDomain]);

  const gradeDistribution = useMemo(() => {
    const dist = Array.from({ length: 9 }, (_, i) => ({ name: `${i+1}등급`, subject: 0, comprehensive: 0 }));
    data.forEach(item => {
      const g = Math.floor(item.grade);
      if (g >= 1 && g <= 9) {
        if (item.type.includes('교과')) dist[g-1].subject++;
        else if (item.type.includes('종합') || item.type.includes('학종') || item.type.includes('서류')) dist[g-1].comprehensive++;
      }
    });
    return dist;
  }, [data]);

  const uniDistribution = useMemo(() => {
    const map = {};
    data.forEach(item => {
      if (!map[item.uni]) map[item.uni] = { name: item.uni, '합격': 0, '충원합격': 0, '불합격': 0, '기타': 0, total: 0 };
      map[item.uni][getResultCategory(item.result)]++;
      map[item.uni].total++;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [data]);

  const passDataByGrade = useMemo(() => {
    const agg = {};
    for (let i = 1; i <= 9; i++) agg[i] = [];
    data.forEach(item => {
      const cat = getResultCategory(item.result);
      const g   = Math.floor(item.grade);
      if ((cat === '합격' || cat === '충원합격') && g >= 1 && g <= 9) {
        const entry = agg[g].find(e => e.uni === item.uni);
        if (entry) { entry.count++; entry.students.push(item); }
        else agg[g].push({ uni: item.uni, count: 1, students: [item] });
      }
    });
    for (let i = 1; i <= 9; i++) agg[i].sort((a, b) => b.count - a.count);
    return agg;
  }, [data]);

  const toggleFilter = (c) =>
    setActiveFilters(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  // ─── 공통 카드 스타일 ───────────────────────────────────────────────────
  const card = {
    backgroundColor: t.bgCard,
    color: t.text,
    borderRadius: '14px',
    border: `1px solid ${t.border}`,
    boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 2px 12px rgba(0,0,0,0.07)',
    padding: '1.25rem',
  };

  const ModalRow = ({ label, value, highlight }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '0.45rem 0', borderBottom: `1px solid ${t.border}` }}>
      <span style={{ fontSize: '0.78rem', color: t.textMuted, minWidth: '5.5rem', flexShrink: 0 }}>{label}</span>
      {highlight
        ? <span style={{ fontSize: '0.82rem', fontWeight: 700, backgroundColor: isDark ? '#431407' : '#fff7ed',
            color: '#ea580c', padding: '0.1rem 0.5rem', borderRadius: '0.3rem' }}>{value || '-'}</span>
        : <span style={{ fontSize: '0.85rem', fontWeight: 500, color: t.text,
            textAlign: 'right', wordBreak: 'break-all' }}>{value || '-'}</span>
      }
    </div>
  );

  // ─── 빈 상태 ────────────────────────────────────────────────────────────
  const manualLoad = () => {
    var src = document.getElementById('pf-results-upload')
           || document.getElementById('uni-pf-results-upload');
    if (src && src.files && src.files.length > 0) {
      loadDataFromFile(src.files[0]);
    } else {
      var inp = document.getElementById('uni-pf-results-upload');
      if (inp) inp.click();
    }
  };

  if (data.length === 0 && !loading) return (
    <div style={{ backgroundColor: t.bg, minHeight: '60vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ textAlign: 'center', padding: '3rem 2rem', maxWidth: '520px', width: '100%',
        backgroundColor: t.bgCard, borderRadius: '14px', border: '1px solid ' + t.border,
        boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 2px 12px rgba(0,0,0,0.07)' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
        <h3 style={{ fontSize: '1.2rem', color: t.textHeading, margin: '0 0 0.6rem' }}>합불합 사례 데이터가 없습니다</h3>
        <p style={{ fontSize: '0.875rem', color: t.textMuted, lineHeight: 1.8, margin: '0 0 1.25rem' }}>
          왼쪽 사이드바의 <b style={{ color: t.text }}>통합 파일 업로드하기</b> →<br/>
          <b style={{ color: t.text }}>합불합 분석용 → 수시진학관리</b> 엑셀 파일을 업로드해주세요.
        </p>
        <button onClick={manualLoad}
          style={{ padding: '0.6rem 1.4rem', backgroundColor: t.btnActive, color: t.btnActiveTxt,
            border: 'none', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600,
            cursor: 'pointer' }}>
          📂 파일 다시 불러오기
        </button>
      </div>
    </div>
  );

  const displayedCount = filteredData.filter(d => !d._dummy).length;
  const avgGrade = (() => {
    const rd = filteredData.filter(d => !d._dummy && d.grade != null);
    return rd.length ? (rd.reduce((s, c) => s + c.grade, 0) / rd.length).toFixed(2) : '-';
  })();

  return (
    <div style={{ backgroundColor: t.bg, color: t.text, padding: '1.25rem', paddingBottom: '5rem', minHeight: '100vh' }}>

      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6366f1', fontSize: '1rem' }}>
          데이터 분석 중...
        </div>
      )}

      {!loading && data.length > 0 && (
        <>
          {/* ── 통계 헤더 ── */}
          <div style={{ borderRadius: '14px', padding: '1.25rem 1.5rem', marginBottom: '1.25rem',
            backgroundColor: isDark ? '#1e1e5a' : '#312e81', color: '#fff', border: 'none',
            boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(49,46,129,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#c7d2fe' }}>표시된 데이터</p>
              <p style={{ margin: '0.15rem 0 0', fontSize: '2.2rem', fontWeight: 800, lineHeight: 1 }}>
                {displayedCount}
                <span style={{ fontSize: '1rem', fontWeight: 400, opacity: 0.7, marginLeft: '0.4rem' }}>/ {data.length} 건</span>
              </p>
            </div>
            <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
              {[['평균 등급', avgGrade], ['총 대학 수', uniDistribution.length + '개']].map(([lbl, val]) => (
                <div key={lbl} style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0 0 0.15rem', fontSize: '0.76rem', color: '#a5b4fc' }}>{lbl}</p>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '1.4rem' }}>{val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── 산점도 + 사이드바 ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,3fr) minmax(0,1fr)',
            gap: '1.25rem', marginBottom: '1.25rem', alignItems: 'start' }}>

            {/* 산점도 카드 */}
            <div style={{ ...card, display: 'flex', flexDirection: 'column', height: '1050px' }}>

              {/* 필터 버튼 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem',
                  fontWeight: 700, fontSize: '0.9rem', color: t.textHeading }}>
                  <Icons.Filter /> 결과 필터
                </span>
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                  {RESULT_CATEGORIES.map(cat => {
                    const on = activeFilters.includes(cat);
                    return (
                      <button key={cat} onClick={() => toggleFilter(cat)} style={{
                        display: 'flex', alignItems: 'center', gap: '0.25rem',
                        padding: '0.25rem 0.7rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600,
                        border: `1px solid ${on ? t.btnActive : t.border}`,
                        backgroundColor: on ? t.btnActive : t.btnInactive,
                        color: on ? t.btnActiveTxt : t.btnInactiveTxt,
                        cursor: 'pointer', whiteSpace: 'nowrap',
                      }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
                          backgroundColor: on ? '#fff' : COLORS[cat] }}/>
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 확대 컨트롤 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap',
                backgroundColor: t.bgSub, border: `1px solid ${t.border}`,
                borderRadius: '10px', padding: '0.6rem 0.9rem', marginBottom: '0.75rem' }}>
                <Icons.ZoomIn />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: t.text }}>등급대 확대</span>
                {[[1,9,'전체'],[1,3,'1~3'],[3,6,'3~6'],[6,9,'6~9']].map(([mn,mx,lbl]) => {
                  const on = yDomain[0]===mn && yDomain[1]===mx;
                  return (
                    <button key={lbl} onClick={() => setYDomain([mn,mx])} style={{
                      padding: '0.15rem 0.55rem', borderRadius: '6px', fontSize: '0.78rem',
                      backgroundColor: on ? t.btnActive : t.btnInactive,
                      color: on ? t.btnActiveTxt : t.text,
                      border: `1px solid ${on ? t.btnActive : t.border}`, cursor: 'pointer',
                    }}>{lbl}</button>
                  );
                })}
                <div style={{ display: 'flex', gap: '0.3rem', marginLeft: 'auto', alignItems: 'center' }}>
                  {[
                    [tempYDomain[0], v => setTempYDomain([parseFloat(v)||1, tempYDomain[1]])],
                    [tempYDomain[1], v => setTempYDomain([tempYDomain[0], parseFloat(v)||9])],
                  ].map(([val, setter], i) => (
                    <React.Fragment key={i}>
                      {i===1 && <span style={{ color: t.textMuted }}>~</span>}
                      <input type="number" step="0.5" value={val}
                        onChange={e => setter(e.target.value)}
                        style={{ width: '50px', textAlign: 'center', fontSize: '0.82rem',
                          padding: '0.15rem 0.3rem', backgroundColor: t.bgSub, color: t.text,
                          border: `1px solid ${t.border}`, borderRadius: '5px' }}/>
                    </React.Fragment>
                  ))}
                  <button onClick={() => setYDomain([Math.min(...tempYDomain), Math.max(...tempYDomain)])}
                    style={{ padding: '0.15rem 0.6rem', borderRadius: '5px', fontSize: '0.78rem',
                      backgroundColor: t.btnActive, color: t.btnActiveTxt, border: 'none', cursor: 'pointer' }}>
                    적용
                  </button>
                </div>
              </div>

              {/* 산점도 */}
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 40, bottom: 50, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={t.chartGrid} />
                    <XAxis
                      type="number"
                      dataKey="chartTypeX"
                      domain={[-0.5, 2.5]}
                      ticks={[0, 1, 2]}
                      tickFormatter={(v) => CHART_TYPES[v] || ''}
                      tickLine={false}
                      axisLine={{ stroke: t.border }}
                      tick={{ fill: t.chartText, fontSize: 12, fontWeight: 600 }}
                      interval={0}
                    />
                    <YAxis
                      type="number"
                      dataKey="grade"
                      domain={yDomain}
                      reversed={true}
                      ticks={yTicks}
                      tickLine={false}
                      axisLine={{ stroke: t.border }}
                      tick={{ fill: t.chartText, fontSize: 11 }}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3', stroke: t.border }}
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length || payload[0].payload._dummy) return null;
                        const d = payload[0].payload;
                        const cat = getResultCategory(d.result);
                        return (
                          <div style={{ backgroundColor: t.bgCard, color: t.text, padding: '0.7rem 0.9rem',
                            borderRadius: '8px', border: `1px solid ${t.border}`,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.3)', fontSize: '0.82rem', maxWidth: '220px' }}>
                            <p style={{ margin: '0 0 0.2rem', fontWeight: 700, color: t.textHeading }}>{d.uni}</p>
                            <p style={{ margin: '0 0 0.12rem', color: t.textMuted, fontSize: '0.75rem' }}>{d.type}</p>
                            <p style={{ margin: '0 0 0.1rem', color: t.text }}>{d.major}</p>
                            <p style={{ margin: 0, fontWeight: 700, color: COLORS[cat] }}>
                              {d.grade}등급 · {d.result}
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Scatter
                      data={filteredData}
                      shape={(props) => {
                        const { cx, cy, payload } = props;
                        if (payload._dummy || payload.grade == null) return null;
                        const fill = COLORS[getResultCategory(payload.result)];
                        return (
                          <circle
                            cx={cx + (payload.xOffset || 0)} cy={cy} r={6}
                            fill={fill} fillOpacity={0.82} stroke={fill} strokeWidth={1.5}
                            onClick={e => { e.stopPropagation(); setSelectedPoint(payload); }}
                            style={{ cursor: 'pointer' }}
                          />
                        );
                      }}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <p style={{ textAlign: 'center', fontSize: '0.74rem', color: t.textMuted, margin: '0.5rem 0 0' }}>
                * 점을 클릭하면 상세 정보를 확인할 수 있습니다. 겹친 점들은 양옆으로 펼쳐집니다.
              </p>
            </div>

            {/* 사이드바 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* 범례 */}
              <div style={card}>
                <p style={{ margin: '0 0 0.6rem', fontSize: '0.82rem', fontWeight: 700, color: t.textHeading }}>색상 범례</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {RESULT_CATEGORIES.map(cat => (
                    <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%',
                        backgroundColor: COLORS[cat], flexShrink: 0 }}/>
                      <span style={{ color: t.text }}>{cat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 등급별 지원 현황 */}
              <div style={{ ...card }}>
                <p style={{ margin: '0 0 0.75rem', fontWeight: 700, fontSize: '0.9rem', color: t.textHeading,
                  display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Icons.BarChart /> 등급별 지원 현황
                </p>
                <div style={{ height: '380px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={gradeDistribution} layout="vertical"
                      margin={{ left: 0, right: 15, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={t.chartGrid} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={52}
                        tick={{ fill: t.chartText, fontSize: 11 }}
                        axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: t.bgCard, color: t.text,
                          border: `1px solid ${t.border}`, borderRadius: '8px', fontSize: '0.8rem' }}
                        itemStyle={{ color: t.text }}
                        labelStyle={{ color: t.textHeading, fontWeight: 600 }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: '0.78rem' }}
                        formatter={(v) => <span style={{ color: t.textMuted }}>{v}</span>}
                      />
                      <Bar dataKey="subject"       name="교과" fill="#6366f1" radius={[0,4,4,0]} barSize={11} />
                      <Bar dataKey="comprehensive" name="종합" fill="#10b981" radius={[0,4,4,0]} barSize={11} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* ── 대학별 현황 ── */}
          <div style={{ ...card, marginBottom: '1.25rem' }}>
            <p style={{ margin: '0 0 0.75rem', fontWeight: 700, fontSize: '1rem', color: t.textHeading,
              display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Icons.Landmark /> 대학별 지원 현황
              <span style={{ fontSize: '0.78rem', color: t.textMuted, fontWeight: 400, marginLeft: '0.2rem' }}>
                ({uniDistribution.length}개 대학)
              </span>
            </p>
            <div style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
              <div style={{ width: Math.max(700, uniDistribution.length * 72) + 'px', height: '390px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={uniDistribution}
                    margin={{ top: 10, right: 20, left: 0, bottom: 90 }}
                    onClick={(cd) => { if (cd && cd.activeLabel) setSelectedUniChartData(cd.activeLabel); }}
                    style={{ cursor: 'pointer' }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={t.chartGrid} />
                    <XAxis dataKey="name" angle={-45} textAnchor="end"
                      tick={{ fill: t.chartText, fontSize: 11 }} height={90}
                      axisLine={{ stroke: t.border }} tickLine={false} />
                    <YAxis tick={{ fill: t.chartText, fontSize: 11 }}
                      axisLine={{ stroke: t.border }} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: t.bgCard, color: t.text,
                        border: `1px solid ${t.border}`, borderRadius: '8px', fontSize: '0.82rem' }}
                      itemStyle={{ color: t.text }}
                      labelStyle={{ color: t.textHeading, fontWeight: 600 }}
                    />
                    <Legend verticalAlign="top"
                      wrapperStyle={{ fontSize: '0.78rem', paddingBottom: '0.5rem' }}
                      formatter={(v) => <span style={{ color: t.textMuted }}>{v}</span>}
                    />
                    <Bar dataKey="합격"    stackId="a" fill={COLORS['합격']} />
                    <Bar dataKey="충원합격" stackId="a" fill={COLORS['충원합격']} />
                    <Bar dataKey="불합격"  stackId="a" fill={COLORS['불합격']} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <p style={{ textAlign: 'center', fontSize: '0.74rem', color: t.textMuted, margin: '0.3rem 0 0' }}>
              * 막대를 클릭하면 해당 대학 지원자 전체 현황을 볼 수 있습니다.
            </p>
          </div>

          {/* ── 등급대별 합격 순위 ── */}
          <div style={card}>
            <p style={{ margin: '0 0 0.75rem', fontWeight: 700, fontSize: '1rem', color: t.textHeading,
              display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Icons.Trophy /> 등급대별 합격 순위
              <span style={{ fontSize: '0.78rem', color: t.textMuted, fontWeight: 400, marginLeft: '0.2rem' }}>
                (합격·충원합격 기준)
              </span>
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', minWidth: '100%', width: 'max-content' }}>
                <thead>
                  <tr style={{ backgroundColor: t.bgSub, borderBottom: `2px solid ${t.border}` }}>
                    <th style={{ padding: '0.6rem 1rem', fontSize: '0.82rem', fontWeight: 700,
                      color: t.textMuted, textAlign: 'left', whiteSpace: 'nowrap', minWidth: '80px' }}>등급대</th>
                    <th style={{ padding: '0.6rem 1rem', fontSize: '0.82rem', fontWeight: 700,
                      color: t.textMuted, textAlign: 'left' }}>합격 대학 목록 (클릭 시 상세)</th>
                  </tr>
                </thead>
                <tbody>
                  {[1,2,3,4,5,6,7,8,9].map(g => (
                    <tr key={g} style={{ borderBottom: `1px solid ${t.border}` }}>
                      <td style={{ padding: '0.55rem 1rem', fontWeight: 700, fontSize: '0.85rem',
                        color: t.text, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>{g}등급대</td>
                      <td style={{ padding: '0.45rem 1rem' }}>
                        <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '0.35rem', alignItems: 'center' }}>
                          {passDataByGrade[g] && passDataByGrade[g].length > 0
                            ? passDataByGrade[g].map((ud, idx) => (
                                <button key={idx} onClick={() => setSelectedUniPassData({ grade: g, ...ud })}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                    padding: '0.25rem 0.55rem', whiteSpace: 'nowrap',
                                    backgroundColor: t.bgSub, color: t.text,
                                    border: `1px solid ${t.border}`, borderRadius: '7px',
                                    cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500 }}>
                                  {ud.uni}
                                  <span style={{ backgroundColor: t.tagBg, color: t.tagTxt,
                                    padding: '0.05rem 0.35rem', borderRadius: '4px',
                                    fontWeight: 700, fontSize: '0.72rem' }}>{ud.count}</span>
                                </button>
                              ))
                            : <span style={{ color: t.textMuted, fontSize: '0.82rem' }}>데이터 없음</span>
                          }
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ──── 단일 점 클릭 모달 ──── */}
      {selectedPoint && !selectedPoint._dummy && (() => {
        const cat = getResultCategory(selectedPoint.result);
        const catColor = COLORS[cat] || '#9CA3AF';
        const resultBg = isDark
          ? (cat==='합격' ? '#052e16' : cat==='충원합격' ? '#0c2149' : cat==='불합격' ? '#3b0a0a' : t.bgCard)
          : (cat==='합격' ? '#ecfdf5' : cat==='충원합격' ? '#eff6ff' : cat==='불합격' ? '#fef2f2' : t.bgSub);
        const hasRank = selectedPoint.rank && selectedPoint.rank !== '-' && selectedPoint.rank !== '후보순위없음';
        return (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}
            onClick={() => setSelectedPoint(null)}>
            <div style={{ backgroundColor: t.bg, borderRadius: '14px', maxWidth: '440px', width: '100%',
              maxHeight: '90vh', display: 'flex', flexDirection: 'column',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)', border: `1px solid ${t.border}`, overflow: 'hidden' }}
              onClick={e => e.stopPropagation()}>

              <div style={{ backgroundColor: t.bgSub, padding: '1rem 1.25rem',
                borderBottom: `1px solid ${t.border}`, display: 'flex',
                justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
                <div style={{ flex: 1, marginRight: '0.5rem' }}>
                  <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: t.textHeading }}>{selectedPoint.uni}</p>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.875rem', color: '#7c83fd', fontWeight: 600 }}>{selectedPoint.major}</p>
                </div>
                <button onClick={() => setSelectedPoint(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer',
                    color: t.textMuted, fontSize: '1.2rem', lineHeight: 1, flexShrink: 0, padding: 0 }}>✕</button>
              </div>

              <div style={{ overflowY: 'auto', flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem',
                  padding: '1rem 1.25rem 0.5rem' }}>
                  <div style={{ backgroundColor: isDark ? t.bgCard : '#f0f0ff', padding: '0.8rem',
                    borderRadius: '10px', border: `1px solid ${isDark ? t.border : '#c7d2fe'}` }}>
                    <p style={{ margin: '0 0 0.2rem', fontSize: '0.72rem', color: t.textMuted, fontWeight: 500 }}>일반등급</p>
                    <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#7c83fd' }}>{selectedPoint.grade}</p>
                  </div>
                  <div style={{ backgroundColor: resultBg, padding: '0.8rem', borderRadius: '10px',
                    border: `1px solid ${catColor}33` }}>
                    <p style={{ margin: '0 0 0.2rem', fontSize: '0.72rem', color: t.textMuted, fontWeight: 500 }}>최종단계</p>
                    <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: catColor }}>{selectedPoint.result || '-'}</p>
                  </div>
                </div>

                {selectedPoint.reason && (
                  <div style={{ margin: '0 1.25rem 0.5rem',
                    backgroundColor: isDark ? '#3b0a0a' : '#fff1f2',
                    border: '1px solid #fca5a5', borderRadius: '8px', padding: '0.6rem 0.8rem' }}>
                    <p style={{ margin: '0 0 0.2rem', fontSize: '0.72rem', color: '#f87171', fontWeight: 700 }}>⚠ 불합격 사유</p>
                    <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500,
                      color: isDark ? '#fca5a5' : '#b91c1c' }}>{selectedPoint.reason}</p>
                  </div>
                )}

                <div style={{ padding: '0.5rem 1.25rem 1.25rem' }}>
                  <ModalRow label="전형유형"    value={selectedPoint.type} />
                  <ModalRow label="전형명"       value={selectedPoint.admName} />
                  <ModalRow label="세부유형"     value={selectedPoint.typeDetail} />
                  <ModalRow label="모집인원"     value={selectedPoint.count ? `${selectedPoint.count}명` : null} />
                  <ModalRow label="최초후보순위" value={selectedPoint.rank} highlight={hasRank} />
                  {selectedPoint.minStandard && (
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: `1px solid ${t.border}` }}>
                      <p style={{ margin: '0 0 0.35rem', fontSize: '0.72rem', fontWeight: 700, color: t.textMuted }}>최저학력기준</p>
                      <div style={{ backgroundColor: isDark ? '#1a1f3a' : '#eef2ff',
                        border: `1px solid ${isDark ? '#3730a3' : '#c7d2fe'}`, borderRadius: '7px',
                        padding: '0.6rem 0.8rem', fontSize: '0.8rem',
                        color: isDark ? '#a5b4fc' : '#3730a3', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                        {selectedPoint.minStandard}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ──── 대학 목록 모달 ──── */}
      {(selectedUniChartData || selectedUniPassData) && (() => {
        const uName = selectedUniChartData || selectedUniPassData.uni;
        const students = selectedUniChartData
          ? data.filter(d => d.uni === uName).sort((a, b) => a.grade - b.grade)
          : [...selectedUniPassData.students].sort((a, b) => a.grade - b.grade);
        const close = () => { setSelectedUniChartData(null); setSelectedUniPassData(null); };
        return (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}
            onClick={close}>
            <div style={{ backgroundColor: t.bg, borderRadius: '14px', maxWidth: '580px', width: '100%',
              maxHeight: '90vh', display: 'flex', flexDirection: 'column',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)', border: `1px solid ${t.border}`, overflow: 'hidden' }}
              onClick={e => e.stopPropagation()}>

              <div style={{ backgroundColor: t.bgSub, padding: '1rem 1.25rem',
                borderBottom: `1px solid ${t.border}`, display: 'flex',
                justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div>
                  <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: t.textHeading }}>
                    {uName} {selectedUniPassData ? '합격' : '지원자'} 현황
                  </p>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: '#7c83fd' }}>
                    총 {students.length}건 · 성적순
                  </p>
                </div>
                <button onClick={close}
                  style={{ background: 'none', border: 'none', cursor: 'pointer',
                    color: t.textMuted, fontSize: '1.2rem', padding: 0 }}>✕</button>
              </div>

              <div style={{ overflowY: 'auto', padding: '0.75rem 1.25rem',
                display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {students.map((s, i) => {
                  const cat = getResultCategory(s.result);
                  const bc  = COLORS[cat] || '#9CA3AF';
                  const bbg = isDark
                    ? (cat==='합격' ? '#052e16' : cat==='충원합격' ? '#0c2149' : cat==='불합격' ? '#3b0a0a' : t.bgCard)
                    : (cat==='합격' ? '#d1fae5' : cat==='충원합격' ? '#dbeafe' : cat==='불합격' ? '#fee2e2' : t.bgSub);
                  return (
                    <div key={i} style={{ border: `1px solid ${t.border}`, padding: '0.7rem 0.9rem',
                      borderRadius: '10px', display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', gap: '0.75rem', backgroundColor: t.bgSub }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem',
                          marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                          <span style={{ backgroundColor: bbg, color: bc, padding: '0.05rem 0.45rem',
                            borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{s.result}</span>
                          <span style={{ fontSize: '0.78rem', color: t.textMuted }}>{s.type}</span>
                        </div>
                        <p style={{ margin: 0, fontWeight: 600, color: t.text, fontSize: '0.875rem' }}>{s.major}</p>
                        <p style={{ margin: '0.1rem 0 0', fontSize: '0.72rem', color: t.textMuted }}>{s.admName}</p>
                      </div>
                      <div style={{ backgroundColor: t.bg, border: `1px solid ${t.border}`,
                        borderRadius: '8px', padding: '0.35rem 0.65rem',
                        textAlign: 'center', flexShrink: 0, minWidth: '60px' }}>
                        <p style={{ margin: 0, fontSize: '0.68rem', color: t.textMuted }}>등급</p>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem', color: '#7c83fd' }}>{s.grade}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

// ─── React 마운트 ────────────────────────────────────────────────────────────
function mountAdmissionAnalysis() {
  var el = document.getElementById('react-passfail-root');
  if (el && !el._reactRootContainer && !el._reactFiber) {
    try {
      ReactDOM.createRoot(el).render(<AdmissionAnalysis />);
    } catch(e) {
      console.error('AdmissionAnalysis mount error:', e);
    }
  }
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountAdmissionAnalysis);
} else {
  mountAdmissionAnalysis();
}
