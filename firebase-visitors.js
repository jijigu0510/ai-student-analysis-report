// firebase-visitors.js  — ES Module (CDN 방식, 번들러 불필요)
import { firebaseConfig } from './firebase-config.js';

import { initializeApp }          from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getFirestore,
  collection,
  addDoc,
  getCountFromServer,
  query,
  where,
  doc,
  setDoc,
  getDoc,
  serverTimestamp as fsTimestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {
  getDatabase,
  ref,
  set,
  remove,
  onValue,
  onDisconnect,
  serverTimestamp as dbTimestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js';

// ── 초기화 ────────────────────────────────────────────────
const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const rtdb = getDatabase(app);

const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

// ── UI 헬퍼 ──────────────────────────────────────────────
function setCounter(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = Number(value).toLocaleString('ko-KR');
}

// ── 방문자 기록 (세션당 1회) ──────────────────────────────
async function recordVisit() {
  const SESSION_KEY = 'firebase_session_id';
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (sessionId) return; // 이미 이번 세션에 기록됨

  sessionId = crypto.randomUUID();
  sessionStorage.setItem(SESSION_KEY, sessionId);

  await addDoc(collection(db, 'visitors'), {
    date:      today,
    timestamp: fsTimestamp(),
    sessionId
  });
}

// ── 방문자 수 집계 ────────────────────────────────────────
async function updateVisitorCounts() {
  try {
    // 오늘 방문자
    const todaySnap = await getCountFromServer(
      query(collection(db, 'visitors'), where('date', '==', today))
    );
    setCounter('vc-today', todaySnap.data().count);

    // 누적 방문자
    const totalSnap = await getCountFromServer(collection(db, 'visitors'));
    setCounter('vc-total', totalSnap.data().count);
  } catch (e) {
    console.warn('[Firebase] 방문자 집계 오류:', e.message);
    setCounter('vc-today', '?');
    setCounter('vc-total', '?');
  }
}

// ── 실시간 접속자 추적 ────────────────────────────────────
function trackOnlineUsers() {
  const connectedRef = ref(rtdb, '.info/connected');
  const onlineRef    = ref(rtdb, 'onlineUsers');

  // 이 탭 전용 고정 키 — 재접속해도 같은 노드를 재사용해 중복 카운트 방지
  let myKey = sessionStorage.getItem('rtdb_key');
  if (!myKey) {
    myKey = crypto.randomUUID();
    sessionStorage.setItem('rtdb_key', myKey);
  }
  const userRef = ref(rtdb, `onlineUsers/${myKey}`);

  // 연결 상태 감지 → 접속 시 내 노드 등록, 끊기면 자동 삭제
  onValue(connectedRef, async (snap) => {
    if (snap.val() !== true) return;
    onDisconnect(userRef).remove(); // set보다 먼저 등록해야 안전
    await set(userRef, { connectedAt: dbTimestamp() });
  });

  // 현재 접속자 수 실시간 구독
  onValue(onlineRef, (snap) => {
    const count = snap.exists() ? Object.keys(snap.val()).length : 0;
    setCounter('vc-online', count);
  });
}

// ── 모의고사 데이터 서버 저장 ─────────────────────────────
async function saveMockExamData(gradeMonthKey, data) {
  await setDoc(doc(db, 'mockExamData', String(gradeMonthKey)), {
    data:       data,
    uploadedAt: fsTimestamp(),
    key:        String(gradeMonthKey),
    count:      data.length
  });
}

// ── 모의고사 데이터 서버 불러오기 (전체 학년+월) ─────────
async function loadAllMockData() {
  const keys = [
    '1_3','1_6','1_9','1_11',
    '2_3','2_6','2_9','2_11',
    '3_3','3_5','3_6','3_7','3_9','3_11'
  ];
  for (const key of keys) {
    try {
      const snap = await getDoc(doc(db, 'mockExamData', key));
      if (snap.exists() && typeof window.onFirebaseMockData === 'function') {
        window.onFirebaseMockData(key, snap.data());
      }
    } catch (e) {
      console.warn(`[Firebase] ${key} 모의고사 로드 오류:`, e.message);
    }
  }
}

// ── GAS URL 서버 저장 (학년별) ───────────────────────────
async function saveGasUrls(grade, urls) {
  // 기존 데이터 유지하면서 해당 학년만 업데이트
  let existing = {};
  try {
    const snap = await getDoc(doc(db, 'gasConfig', 'mockExamUrls'));
    if (snap.exists()) existing = snap.data().urls || {};
  } catch (_) {}
  existing[String(grade)] = urls;
  await setDoc(doc(db, 'gasConfig', 'mockExamUrls'), {
    urls:      existing,
    updatedAt: fsTimestamp()
  });
}

// ── GAS URL 서버 불러오기 ────────────────────────────────
async function loadGasUrls() {
  try {
    const snap = await getDoc(doc(db, 'gasConfig', 'mockExamUrls'));
    if (snap.exists() && typeof window.onFirebaseGasUrls === 'function') {
      window.onFirebaseGasUrls(snap.data().urls);
    }
  } catch (e) {
    console.warn('[Firebase] GAS URL 로드 오류:', e.message);
  }
}

// app.js에서 호출할 수 있도록 전역 노출
// firebaseMockSave(gradeMonthKey, data) — 예: firebaseMockSave('1_3', [...])
window.firebaseMockSave  = saveMockExamData;
window.firebaseGasSave   = saveGasUrls; // saveGasUrls(grade, urls)

// ── 실행 ─────────────────────────────────────────────────
(async () => {
  try {
    await recordVisit();
    await updateVisitorCounts();
    trackOnlineUsers();
    await loadAllMockData();
    await loadGasUrls();
  } catch (e) {
    // Firebase 설정이 완료되지 않은 경우 조용히 무시
    console.warn('[Firebase] 초기화 오류 — firebase-config.js 설정을 확인하세요:', e.message);
  }
})();
