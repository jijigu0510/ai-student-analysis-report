// ============================================================
//  firebase-init.js  –  방문자 통계 (Realtime Database 기반)
// ============================================================

(function () {
  'use strict';

  // ── Firebase 설정 ──────────────────────────────────────────
  const firebaseConfig = {
    apiKey: "AIzaSyCxMRyt2sMVhtYwBneWdU9RwCe_XaU1NyM",
    authDomain: "buan-highschool-program.firebaseapp.com",
    projectId: "buan-highschool-program",
    storageBucket: "buan-highschool-program.firebasestorage.app",
    messagingSenderId: "194782601446",
    appId: "1:194782601446:web:2384c5cfa70ca5d6585b27",
    measurementId: "G-6LE15ERCLK",
    // ⚠️ Realtime Database URL: https://buan-highschool-program-default-rtdb.asia-southeast1.firebasedatabase.app/
    databaseURL: "https://buan-highschool-program-default-rtdb.asia-southeast1.firebasedatabase.app/"
  };

  console.log("Firebase Init: Starting...");

  // Firebase 앱 초기화 (중복 방지)
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase Init: Initialized.");
  }

  // Analytics 초기화 (선택)
  try { firebase.analytics(); } catch (_) {}

  const db = firebase.database();

  // 연결 상태 모니터링
  db.ref(".info/connected").on("value", (snap) => {
    if (snap.val() === true) {
      console.log("Firebase: Connected to Realtime Database.");
    } else {
      console.log("Firebase: Disconnected from Realtime Database.");
    }
  });

  // ── DOM 요소 ───────────────────────────────────────────────
  const elOnline  = document.getElementById('stat-online');
  const elToday   = document.getElementById('stat-today');
  const elTotal   = document.getElementById('stat-total');

  function fmt(n) { return Number(n || 0).toLocaleString('ko-KR'); }

  // ── 날짜 키 (KST) ─────────────────────────────────────────
  function todayKey() {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  }

  // ── 접속자 세션 관리 (onDisconnect 사용) ──────────────────
  const sessionRef = db.ref('sessions').push();
  sessionRef.onDisconnect().remove();
  sessionRef.set({ connectedAt: firebase.database.ServerValue.TIMESTAMP });

  // 실시간 접속자 수 리스닝
  db.ref('sessions').on('value', snap => {
    const count = snap.numChildren();
    console.log("Firebase: Online count updated ->", count);
    if (elOnline) elOnline.textContent = fmt(count) + '명';
  });

  // ── 방문 횟수 기록 ─────────────────────────────────────────
  const key      = todayKey();
  const dayRef   = db.ref(`visits/daily/${key}`);
  const totalRef = db.ref('visits/total');

  // 세션당 한 번만 카운트 증가 (새로고침 시 중복 방지)
  if (!sessionStorage.getItem('visited_today')) {
    dayRef.transaction(cur => (cur || 0) + 1);
    totalRef.transaction(cur => (cur || 0) + 1);
    sessionStorage.setItem('visited_today', 'true');
    console.log("Firebase: Visit count incremented.");
  }

  // 오늘 방문자 수 리스닝
  dayRef.on('value', snap => {
    console.log("Firebase: Today visits ->", snap.val());
    if (elToday) elToday.textContent = fmt(snap.val());
  });

  // 누적 방문자 수 리스닝
  totalRef.on('value', snap => {
    console.log("Firebase: Total visits ->", snap.val());
    if (elTotal) elTotal.textContent = fmt(snap.val());
  });

})();
