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

// ── 실행 ─────────────────────────────────────────────────
(async () => {
  try {
    await recordVisit();
    await updateVisitorCounts();
    trackOnlineUsers();
  } catch (e) {
    // Firebase 설정이 완료되지 않은 경우 조용히 무시
    console.warn('[Firebase] 초기화 오류 — firebase-config.js 설정을 확인하세요:', e.message);
  }
})();
