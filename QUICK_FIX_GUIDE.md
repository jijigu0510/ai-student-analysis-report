# 빠른 복구 가이드 (Quick Fix Guide)

## 상황 요약
**app.js 파일이 한글 인코딩 손상으로 3,953개 문자 손상됨**
- 대학 데이터: 심각함 ⚠️
- 기능 로직: 정상 ✓
- 복구 방법: 3가지 옵션 제시

---

## 옵션 1: 자동 복구 스크립트 사용 (빠름)
**소요 시간**: 2-3분  
**복구율**: 30-50%  
**난이도**: ⭐ 쉬움

```powershell
cd "c:\Users\user\OneDrive - 부안고등학교\부안고등학교(1)\새 폴더"
node fix-app-encoding.js
```

✓ 장점:
- 가장 빠름
- 자동 백업 생성
- 기본 패턴 복구

✗ 단점:
- 완전하지 않은 복구
- 수동 검증 필요

---

## 옵션 2: Git 히스토리에서 복구 (권장) ⭐
**소요 시간**: 5-10분  
**복구율**: 100%  
**난이도**: ⭐⭐ 중간

```bash
# 최근 커밋 확인
git log --oneline app.js | head -5

# 정상이었던 버전 복원
git checkout [커밋해시] app.js

# 또는 HEAD~1 (한 단계 이전)
git checkout HEAD~1 app.js
```

✓ 장점:
- 완벽한 복구
- 원본 데이터 유지
- 추적 가능

✗ 단점:
- Git 접근 필요
- 커밋 히스토리 있어야 함

---

## 옵션 3: 수동 복구 (정확함)
**소요 시간**: 2-3시간  
**복구율**: 100%  
**난이도**: ⭐⭐⭐ 어려움

### Step 1: universityData 추출
app.js에서 다음 부분 찾기:
```javascript
const universityData = {
  "고려대학교": {  // 이 부분부터
    ...
  },
  // ... 약 60개 대학
};
```

### Step 2: 손상된 부분 수정
패턴 예:
```javascript
// ❌ 손상됨
"?세?교": { "문과?과": [...] }

// ✓ 정상
"세종대학교": { "문과대학": [...] }
```

### Step 3: 검증
```powershell
node -c app.js  # 문법 검사
```

---

## 각 옵션별 추천 순서

### 상황 1: Git 저장소 있음 → **옵션 2 권장** ⭐
```
최고의 선택: 완벽하고 빠름
```

### 상황 2: Git 없음 + 시간 부족 → **옵션 1**
```
빠른 임시 해결책
→ 이후 수동 검증 필요
```

### 상황 3: Git 없음 + 완벽함 필요 → **옵션 3**
```
시간이 걸리지만 완벽한 복구
```

---

## 복구 후 검증 체크리스트

### 1. 문법 검사
```powershell
node -c app.js
```

Expected: ✓ Syntax OK

### 2. 한글 문자 확인
```powershell
$corrupted = (Get-Content app.js | Select-String '\?' | Measure-Object).Count
Write-Host "남은 손상 문자: $corrupted"
```

Expected: < 100 (거의 없음)

### 3. 브라우저 테스트
1. `index.html` 열기
2. 대학 선택 드롭다운 확인
3. Gemini API 테스트

Expected: ✓ 모든 대학 정상 표시

### 4. 콘솔 확인
Browser DevTools (F12) → Console Tab

Expected: ✓ 에러 없음

---

## 복구 실패 시 대응

### Issue 1: "SyntaxError: Unexpected token"
```
원인: 여전히 손상된 문법
→ Option 3 (수동 복구) 필요
→ 또는 원본 파일 재다운로드
```

### Issue 2: 대학 데이터 여전히 없음
```
원인: universityData 파싱 실패
→ 콘솔 에러 메시지 확인
→ universityData 객체 전체 재작성 필요
```

### Issue 3: 한글 메시지 여전히 깨짐
```
원인: 일부 메시지는 자동 복구 안됨
→ grep으로 "\?" 검색하여 수동 수정
→ 또는 영문 메시지로 임시 변경
```

---

## 추가 팁

### 빠른 비교 확인
```powershell
# 손상 전후 비교
Compare-Object (Get-Content app.js.backup) (Get-Content app.js)
```

### 대학 이름 목록 추출
```powershell
$korean = [System.Text.Encoding]::UTF8.GetString([System.Text.Encoding]::Default.GetBytes("한글테스트"))
Write-Host $korean
```

### 정상 레퍼런스 파일
```
✓ universityEvalCriteria.json - 정상 한글 인코딩 예시
→ 이 파일의 대학명 구조 참고 가능
```

---

## 긴급 연락처 및 참고

- **분석 보고서**: ANALYSIS_REPORT.md 참고
- **백업 위치**: app.js.backup
- **복구 스크립트**: fix-app-encoding.js
- **정상 데이터**: universityEvalCriteria.json

---

**마지막 팁**: 
> 복구 전 반드시 백업을 먼저 생성하세요!
> `cp app.js app.js.backup`
