// ============================================================
//  firebase-init.js  –  방문자 통계 (Realtime Database 기반)
// ============================================================

(function () {
  'use strict';

  // ── Firebase 설정 ──────────────────────────────────────────
  const firebaseConfig = {
    apiKey: "AIzaSyCxMRyt2sMVhtYwBneWdU9RwCe_XaU1NyM",
    authDomain: "buan-highschool-program.firebaseapp.com",
    databaseURL: "https://buan-highschool-program-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "buan-highschool-program",
    storageBucket: "buan-highschool-program.firebasestorage.app",
    messagingSenderId: "194782601446",
    appId: "1:194782601446:web:2384c5cfa70ca5d6585b27"
  };

  // Firebase 앱 초기화 (중복 방지)
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  const db = firebase.database();

  // 연결 상태 모니터링
  db.ref(".info/connected").on("value", (snap) => {
    console.log("Firebase: Connected =", snap.val());
  });

  // ── 날짜 키 (KST) ─────────────────────────────────────────
  function todayKey() {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  }

  function fmt(n) { return Number(n || 0).toLocaleString('ko-KR'); }

  // ── DOM이 모두 로드된 후에 실행 ──────────────────────────────
  function startTracking() {
    const elOnline = document.getElementById('stat-online');
    const elToday  = document.getElementById('stat-today');
    const elTotal  = document.getElementById('stat-total');

    // NULL 여부 로그 - 만약 null이면 getElementById가 실패한 것
    console.log("Firebase DOM Check: stat-online =", elOnline);
    console.log("Firebase DOM Check: stat-today  =", elToday);
    console.log("Firebase DOM Check: stat-total  =", elTotal);

    // ── 접속자 세션 관리 ──────────────────────────────────────
    const sessionRef = db.ref('sessions').push();
    sessionRef.onDisconnect().remove();
    sessionRef.set({ connectedAt: firebase.database.ServerValue.TIMESTAMP })
      .catch(err => console.error("Firebase Error (Session Set):", err));

    db.ref('sessions').on('value', snap => {
      const count = snap.numChildren();
      console.log("Firebase: Online count ->", count, "| elOnline null?", !elOnline);
      if (elOnline) {
        elOnline.textContent = fmt(count) + '명';
      }
    });

    // ── 방문 횟수 기록 ──────────────────────────────────────────
    const key      = todayKey();
    const dayRef   = db.ref(`visits/daily/${key}`);
    const totalRef = db.ref('visits/total');

    if (!sessionStorage.getItem('visited_today')) {
      dayRef.transaction(cur => (cur || 0) + 1);
      totalRef.transaction(cur => (cur || 0) + 1);
      sessionStorage.setItem('visited_today', 'true');
    }

    dayRef.on('value', snap => {
      const val = snap.val();
      console.log("Firebase: Today ->", val, "| elToday null?", !elToday);
      if (elToday) elToday.textContent = fmt(val);
    });

    totalRef.on('value', snap => {
      const val = snap.val();
      console.log("Firebase: Total ->", val, "| elTotal null?", !elTotal);
      if (elTotal) elTotal.textContent = fmt(val);
    });
  }

  // DOM 준비 여부에 따라 실행 시점 결정
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startTracking);
  } else {
    startTracking();
  }

})();
