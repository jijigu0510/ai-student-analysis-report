// univ-score.js - 대학별 교과 점수 확인하기 탭

(function() {

// ────────────────────────────────────────────────
// 공통 유틸
// ────────────────────────────────────────────────

// 표준정규분포 누적분포함수 (정밀도 5자리)
function normalCDF(x) {
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    const t = 1 / (1 + 0.2316419 * x);
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return sign > 0 ? 1 - prob : prob;
}

// ────────────────────────────────────────────────
// 고려대학교 학생부교과 학교추천전형
// ────────────────────────────────────────────────

const KOREA_SCORE_TABLE = { 1:100, 2:96, 3:92, 4:86, 5:70, 6:55, 7:40, 8:20, 9:0, 10:0 };

function koreaGradeFromRatio(ratio) {
    if (ratio <= 4.0)  return 1;
    if (ratio <= 11.0) return 2;
    if (ratio <= 23.0) return 3;
    if (ratio <= 40.0) return 4;
    if (ratio <= 60.0) return 5;
    if (ratio <= 77.0) return 6;
    if (ratio <= 89.0) return 7;
    if (ratio <= 96.0) return 8;
    return 9;
}

function koreaApplyMinorAdjust(rank, studentsNum) {
    const n = studentsNum || 100;
    let adj = 0;
    if      (n === 1 && rank === 1)             adj = 4;
    else if (n === 2 && rank <= 2)              adj = 3;
    else if (n >= 3  && n <= 4  && rank <= 5)   adj = 2;
    else if (n >= 5  && n <= 12 && rank <= 7)   adj = 1;
    return Math.max(1, rank - adj);
}

function koreaAchToGrade(ach) {
    if (ach === 'A') return 1;
    if (ach === 'B') return koreaGradeFromRatio(30) + 70 / 100;
    if (ach === 'C') return koreaGradeFromRatio(70) + 100 / 100;
    return null;
}

function koreaGradeToScore(x) {
    if (x <= 0) return 0;
    let n = Math.floor(x);
    if (n < 1) n = 1;
    if (n > 9) n = 9;
    const a_n   = KOREA_SCORE_TABLE[n];
    const a_np1 = KOREA_SCORE_TABLE[n + 1] !== undefined ? KOREA_SCORE_TABLE[n + 1] : 0;
    return x === n ? a_n : (a_n - a_np1) * (n + 1 - x) + a_np1;
}

function calcKoreaScore(student) {
    let weightedSum = 0;
    let totalCredit  = 0;
    const details = [];

    (student.subjects || []).forEach(sub => {
        const credit = sub.credit || 0;
        if (credit <= 0) return;

        if (sub.rank !== null && sub.rank > 0) {
            const adjusted = koreaApplyMinorAdjust(sub.rank, sub.studentsNum);
            const wasAdj = adjusted !== sub.rank;
            weightedSum += adjusted * credit;
            totalCredit += credit;
            details.push({
                subject: sub.subject, category: sub.category, credit,
                type: '석차등급', raw: sub.rank, converted: adjusted,
                note: wasAdj ? `소인수 조정 (${sub.studentsNum}명: ${sub.rank}→${adjusted})` : ''
            });
        } else if (sub.ach && ['A','B','C'].includes(sub.ach)) {
            const converted = koreaAchToGrade(sub.ach);
            if (converted !== null) {
                weightedSum += converted * credit;
                totalCredit += credit;
                details.push({
                    subject: sub.subject, category: sub.category, credit,
                    type: '성취도', raw: sub.ach, converted,
                    note: 'A:30% B:40% C:30% 기본값 적용'
                });
            }
        }
    });

    const avgGrade   = totalCredit > 0 ? weightedSum / totalCredit : 0;
    const gradeScore = koreaGradeToScore(avgGrade);
    const finalScore = gradeScore * 0.9;

    return { avgGrade, gradeScore, finalScore, totalCredit, details,
             displayScore: finalScore,
             summary: `교과평균등급 ${avgGrade.toFixed(4)} → 등급점수 ${gradeScore.toFixed(4)} → 최종 ${finalScore.toFixed(4)} / 90` };
}

// ────────────────────────────────────────────────
// 연세대학교 학생부교과 추천형
// ────────────────────────────────────────────────

const YONSEI_GRADE_SCORE = { 1:100, 2:95, 3:87.5, 4:75, 5:60, 6:40, 7:25, 8:12.5, 9:5 };

// 등급별 석차백분율 범위 [하한, 상한]
const YONSEI_PERCENTILE_RANGE = {
    1: [0,    0.04],
    2: [0.04, 0.11],
    3: [0.11, 0.23],
    4: [0.23, 0.40],
    5: [0.40, 0.60],
    6: [0.60, 0.77],
    7: [0.77, 0.89],
    8: [0.89, 0.96],
    9: [0.96, 1.00]
};

// 반영과목 A 교과 (카테고리 기준)
const YONSEI_GROUP_A_CATS = ['국어', '수학', '영어', '사회', '역사', '도덕', '한국사', '과학'];

// 공통과목 과목명 키워드
const YONSEI_COMMON_KEYWORDS = ['공통국어', '공통수학', '공통영어', '한국사', '통합사회', '통합과학', '과학탐구실험'];
// 공통과목으로 간주하는 단순 과목명 (숫자·공백·괄호 제거 후 exact match)
const YONSEI_COMMON_BASE = ['국어', '수학', '영어', '과학탐구실험'];

function yonseiIsGroupA(sub) {
    // 교과(category) 기준으로만 A/B 분류
    const cat = sub.category || '';
    return YONSEI_GROUP_A_CATS.some(k => cat.includes(k));
}

function yonseiIsCommon(sub) {
    const cleanName = (sub.subject || '').replace(/[0-9\s\(\)\[\]]/g, '');
    // 키워드 포함 여부 (공통국어, 통합사회 등)
    if (YONSEI_COMMON_KEYWORDS.some(k => cleanName.includes(k.replace(/[0-9]/g, '')))) return true;
    // "국어", "수학", "영어", "과학탐구실험" 정확히 일치
    if (YONSEI_COMMON_BASE.some(k => cleanName === k)) return true;
    return false;
}

function yonseiGetZScore(sub) {
    if (!sub.raw || !sub.mean || !sub.std || sub.std <= 0) return null;
    const z = (sub.raw - sub.mean) / sub.std;
    return Math.max(-3.0, Math.min(3.0, Math.round(z * 10) / 10));
}

function yonseiZToConvertedScore(z, rank) {
    // 석차백분율 = 1 - normalCDF(Z)
    let percentile = 1 - normalCDF(z);
    // 등급별 유효 범위로 보정
    const [lo, hi] = YONSEI_PERCENTILE_RANGE[rank] || [0, 1];
    percentile = Math.max(lo, Math.min(hi, percentile));
    return 100 * (1 - percentile);
}

function yonseiAchScore(ach, is5step) {
    if (is5step) {
        if (ach === 'A' || ach === 'B') return 20;
        if (ach === 'C' || ach === 'D') return 15;
        return 10; // E
    }
    if (ach === 'A') return 20;
    if (ach === 'B') return 15;
    return 10; // C
}

function calcYonseiScore(student) {
    const groupACommon  = [];
    const groupAGeneral = [];
    const groupACareer  = [];
    const groupBItems   = [];
    const details       = [];

    (student.subjects || []).forEach(sub => {
        const credit = sub.credit || 0;
        if (credit <= 0) return;

        // P(이수/패스) 성취도는 반영하지 않음
        if (sub.ach === 'P') return;

        const isA = yonseiIsGroupA(sub);

        if (!isA) {
            // 반영과목 B (기타 교과: 체육, 예술, 기술, 제2외국어, 한문 등)
            const isBad = (sub.rank >= 9) || (sub.ach === 'C' && !sub.rank) || (sub.ach === 'D') || (sub.ach === 'E');
            groupBItems.push({ credit, isBad });
            details.push({
                subject: sub.subject, category: sub.category, credit,
                group: '반영과목 B', rank: sub.rank, ach: sub.ach,
                gradeScore: null, zScore: null, zConverted: null, subjectScore: null,
                note: isBad ? '9등급 또는 성취도 C/D/E → 감점 대상' : ''
            });
            return;
        }

        // 반영과목 A
        if (sub.rank !== null && sub.rank > 0) {
            const gradeScore = YONSEI_GRADE_SCORE[sub.rank] || 0;
            const z          = yonseiGetZScore(sub);
            let zConverted   = null;
            let subjectScore = gradeScore;
            let note         = '';

            if (z !== null) {
                zConverted   = yonseiZToConvertedScore(z, sub.rank);
                subjectScore = gradeScore * 0.5 + zConverted * 0.5;
            } else {
                note = '원점수/평균/표준편차 미입력 → 등급점수만 반영';
            }

            const isCommon = yonseiIsCommon(sub);
            const target   = isCommon ? groupACommon : groupAGeneral;
            target.push({ credit, computed: subjectScore });

            details.push({
                subject: sub.subject, category: sub.category, credit,
                group: isCommon ? '공통과목(30%)' : '일반선택(50%)',
                rank: sub.rank, ach: sub.ach,
                gradeScore, zScore: z, zConverted, subjectScore, note
            });
        } else if (sub.ach) {
            const is5step = ['D','E'].includes(sub.ach);
            const achScore = yonseiAchScore(sub.ach, is5step);
            groupACareer.push({ credit, computed: achScore });
            details.push({
                subject: sub.subject, category: sub.category, credit,
                group: '진로선택(20%)', rank: null, ach: sub.ach,
                gradeScore: null, zScore: null, zConverted: null, subjectScore: achScore,
                note: `성취도 ${sub.ach} → ${achScore}점`
            });
        }
    });

    function wAvg(arr) {
        const totalC = arr.reduce((s, x) => s + x.credit, 0);
        if (totalC === 0) return { avg: 0, totalCredit: 0 };
        return { avg: arr.reduce((s, x) => s + x.computed * x.credit, 0) / totalC, totalCredit: totalC };
    }

    const commonR  = wAvg(groupACommon);
    const generalR = wAvg(groupAGeneral);
    const careerR  = wAvg(groupACareer);

    const scoreA = commonR.avg * 0.30 + generalR.avg * 0.50 + careerR.avg * 0.20;

    const bTotal  = groupBItems.reduce((s, x) => s + x.credit, 0);
    const bBad    = groupBItems.filter(x => x.isBad).reduce((s, x) => s + x.credit, 0);
    const bDeduct = bTotal > 0 ? (bBad / bTotal) * 5 : 0;

    const finalScore = Math.max(0, scoreA - bDeduct);

    return {
        scoreA, bDeduct, finalScore,
        commonAvg: commonR.avg, generalAvg: generalR.avg, careerAvg: careerR.avg,
        commonCredit: commonR.totalCredit, generalCredit: generalR.totalCredit, careerCredit: careerR.totalCredit,
        details, displayScore: finalScore,
        summary: `A군 ${scoreA.toFixed(4)} - B군 감점 ${bDeduct.toFixed(4)} = 최종 ${finalScore.toFixed(4)} / 100`
    };
}

// ────────────────────────────────────────────────
// 서강대학교 학생부교과 지역균형전형
// ────────────────────────────────────────────────

function calcSogangScore(student) {
    // 등급계산 (90%): 석차등급 과목 이수단위 가중평균 → (10 - 등급평균) × 100, 900점 만점
    // 비율계산 (10%): 성취도 과목 중 분포비율(aRatio/bRatio/cRatio) 데이터가 있는 경우만 산출

    let gradeWeightedSum = 0;
    let gradeTotalCredit = 0;
    let ratioSum = 0;
    const details = [];

    (student.subjects || []).forEach(sub => {
        const credit = sub.credit || 0;
        if (credit <= 0) return;
        if (sub.ach === 'P') return;

        if (sub.rank !== null && sub.rank > 0) {
            // 등급계산 대상
            gradeWeightedSum += sub.rank * credit;
            gradeTotalCredit += credit;
            details.push({
                subject: sub.subject, category: sub.category, credit,
                type: '등급계산', rank: sub.rank, ach: null, envRatio: null, excluded: false
            });
        } else if (sub.ach && ['A', 'B', 'C'].includes(sub.ach)) {
            // 비율계산: 분포비율 데이터가 있을 때만 산출, 없으면 제외
            const hasRatios = sub.aRatio !== undefined && sub.bRatio !== undefined && sub.cRatio !== undefined;
            if (hasRatios) {
                // 환산성취비율 = (취득성취도 비율)/2 + 성취도 하단 비율 합계
                let envRatio;
                if (sub.ach === 'A')      envRatio = sub.aRatio / 2 + sub.bRatio + sub.cRatio;
                else if (sub.ach === 'B') envRatio = sub.bRatio / 2 + sub.cRatio;
                else                      envRatio = sub.cRatio / 2;
                ratioSum += envRatio;
                details.push({
                    subject: sub.subject, category: sub.category, credit,
                    type: '비율계산', rank: null, ach: sub.ach, envRatio, excluded: false
                });
            } else {
                details.push({
                    subject: sub.subject, category: sub.category, credit,
                    type: '성취도(제외)', rank: null, ach: sub.ach, envRatio: null, excluded: true,
                    note: '분포비율 미입력으로 비율계산 제외'
                });
            }
        }
    });

    const gradeAvg   = gradeTotalCredit > 0 ? gradeWeightedSum / gradeTotalCredit : 0;
    const gradeScore = gradeTotalCredit > 0 ? (10 - gradeAvg) * 100 : 0;
    const ratioScore = Math.min(100, ratioSum / 2);
    const finalScore = gradeScore + ratioScore;

    return {
        gradeAvg, gradeScore, ratioScore, finalScore, gradeTotalCredit,
        details, displayScore: finalScore,
        summary: `등급평균 ${gradeAvg.toFixed(4)} → 등급계산 ${gradeScore.toFixed(2)} + 비율계산 ${ratioScore.toFixed(2)} = ${finalScore.toFixed(2)} / 1000`
    };
}

// ────────────────────────────────────────────────
// 성균관대학교 학생부교과 추천인재전형
// ────────────────────────────────────────────────

const SKK_A_SCORE = { 1:100, 2:96, 3:90, 4:80, 5:65, 6:45, 7:20, 8:10, 9:0 };
const SKK_B_SCORE = { 1:100, 2:98, 3:95, 4:90, 5:80, 6:50, 7:30, 8:10, 9:0 };
// grade-rank.js가 미리 계산한 플래그를 활용
// isKorean, isEnglish, isMath, isSocial, isScience → A군
// isExcluded (기술·가정/정보/제2외국어/한문/교양) → B군

function skkIsGroupA(sub) {
    return !!(sub.isKorean || sub.isEnglish || sub.isMath || sub.isSocial || sub.isScience) && !sub.isExcluded;
}

function skkIsGroupB(sub) {
    // grade-rank.js의 isExcluded가 기술·가정/정보/제2외국어/한문/교양을 이미 잡아냄
    if (sub.isExcluded) return true;
    // isExcluded가 없을 때(데이터 직접 입력 등) 폴백 체크
    const cat     = sub.category || '';
    const subj    = sub.subject  || '';
    const catNorm = cat.replace(/[^가-힣a-zA-Z0-9]/g, '');
    const B_KEYS  = ['기술가정', '정보', '외국어', '한문', '교양', '기술', '가정'];
    if (B_KEYS.some(k => catNorm.includes(k))) return true;
    const B_SUBJ  = ['일본어', '중국어', '독일어', '프랑스어', '스페인어', '러시아어', '아랍어', '베트남어', '한문', '정보'];
    if (B_SUBJ.some(k => subj.includes(k))) return true;
    return false;
}

function calcSungkyunkwanScore(student) {
    let aWeighted = 0, aCredit = 0;
    let bWeighted = 0, bCredit = 0;
    const details = [];

    (student.subjects || []).forEach(sub => {
        const credit = sub.credit || 0;
        if (credit <= 0) return;
        if (sub.ach === 'P') return;

        // A/B군 판별을 rank 유무와 관계없이 먼저 수행
        const isA = skkIsGroupA(sub);
        const isB = !isA && skkIsGroupB(sub);

        const rank = Number(sub.rank) || 0;

        if (rank <= 0) {
            // rank 없는 과목: 점수 기여 없음, 표시만
            if (sub.ach && ['A','B','C'].includes(sub.ach)) {
                const group = isA ? 'A군(진로)' : (isB ? 'B군(진로)' : '제외(진로선택)');
                details.push({ subject: sub.subject, category: sub.category, credit, group, rank: null, ach: sub.ach, score: null });
            }
            return;
        }

        if (isA) {
            const score = SKK_A_SCORE[rank] || 0;
            aWeighted += score * credit;
            aCredit   += credit;
            details.push({ subject: sub.subject, category: sub.category, credit, group: 'A군', rank, score });
        } else if (isB) {
            const score = SKK_B_SCORE[rank] || 0;
            bWeighted += score * credit;
            bCredit   += credit;
            details.push({ subject: sub.subject, category: sub.category, credit, group: 'B군', rank, score });
        } else {
            details.push({ subject: sub.subject, category: sub.category, credit, group: '미반영', rank, score: null });
        }
    });

    const aAvg   = aCredit > 0 ? aWeighted / aCredit : 0;
    const aFinal = aAvg * 7;   // 700점 만점

    const bAvg   = bCredit > 0 ? bWeighted / bCredit : 0;
    const bFinal = bCredit > 0 ? bAvg * 1 : 0;   // B군 과목 없으면 0점

    const finalScore = aFinal + bFinal;

    return {
        aAvg, aFinal, bAvg, bFinal, finalScore,
        aCredit, bCredit,
        details, displayScore: finalScore,
        summary: `A군 ${aFinal.toFixed(2)} + B군 ${bFinal.toFixed(2)} = ${finalScore.toFixed(2)} / 800`
    };
}

// ────────────────────────────────────────────────
// 중앙대학교 학생부교과 지역균형
// ────────────────────────────────────────────────

const CAU_RANK_SCORE = { 1:10.0, 2:9.71, 3:9.43, 4:9.14, 5:8.86, 6:8.57, 7:8.00, 8:6.57, 9:3.40 };
const CAU_ACH_SCORE  = { A:10.0, B:9.43, C:8.86 };

function calcCAUScore(student) {
    let rankWeighted = 0, rankCredit = 0;
    let achSum = 0, achCount = 0;
    const details = [];

    (student.subjects || []).forEach(sub => {
        const credit = sub.credit || 0;
        if (credit <= 0) return;
        if (sub.ach === 'P') return;

        const included = !!(sub.isKorean || sub.isEnglish || sub.isMath || sub.isSocial || sub.isScience) && !sub.isExcluded;
        if (!included) {
            const rank = Number(sub.rank) || 0;
            if (rank > 0 || (sub.ach && ['A','B','C'].includes(sub.ach))) {
                details.push({ subject: sub.subject, category: sub.category, credit, type: null, reason: '반영교과 외', rank: rank || null, ach: sub.ach || null, score: null });
            }
            return;
        }

        const rank = Number(sub.rank) || 0;

        if (rank > 0) {
            const score = CAU_RANK_SCORE[rank] || 0;
            rankWeighted += score * credit;
            rankCredit   += credit;
            details.push({ subject: sub.subject, category: sub.category, credit, type: '공통/일반', rank, ach: null, score });
        } else if (sub.ach && ['A','B','C'].includes(sub.ach)) {
            const score = CAU_ACH_SCORE[sub.ach] || 0;
            achSum   += score;
            achCount += 1;
            details.push({ subject: sub.subject, category: sub.category, credit, type: '진로선택', rank: null, ach: sub.ach, score });
        }
    });

    const scoreA = rankCredit > 0 ? rankWeighted / rankCredit : 0;
    const scoreB = achCount  > 0 ? achSum / achCount : 0;
    const combined   = scoreA * 0.9 + scoreB * 0.1;
    const finalScore = combined * 90;

    return {
        scoreA, scoreB, combined, finalScore,
        rankCredit, achCount,
        details, displayScore: finalScore,
        summary: `교과 ${finalScore.toFixed(2)} / 900`
    };
}

// ────────────────────────────────────────────────
// 한양대학교 학생부교과 추천형
// ────────────────────────────────────────────────

const HANYANG_SCORE = { 1:100, 2:96, 3:89, 4:77, 5:60, 6:40, 7:23, 8:11, 9:0 };

function calcHanyangScore(student) {
    let weighted = 0, totalCredit = 0;
    const details = [];

    (student.subjects || []).forEach(sub => {
        const credit = sub.credit || 0;
        if (credit <= 0) return;
        if (sub.ach === 'P') return;

        const included = !!(sub.isKorean || sub.isEnglish || sub.isMath || sub.isSocial || sub.isScience) && !sub.isExcluded;
        const rank = Number(sub.rank) || 0;

        if (rank <= 0) {
            if (sub.ach && ['A','B','C'].includes(sub.ach)) {
                details.push({ subject: sub.subject, category: sub.category, credit, included: false, reason: '진로선택(미반영)', rank: null, ach: sub.ach, score: null });
            }
            return;
        }

        if (included) {
            const score = HANYANG_SCORE[rank] || 0;
            weighted += score * credit;
            totalCredit += credit;
            details.push({ subject: sub.subject, category: sub.category, credit, included: true, rank, score });
        } else {
            details.push({ subject: sub.subject, category: sub.category, credit, included: false, reason: '반영교과 외', rank, score: null });
        }
    });

    const avg = totalCredit > 0 ? weighted / totalCredit : 0;
    return {
        avg, finalScore: avg, totalCredit,
        details, displayScore: avg,
        summary: `교과성적 ${avg.toFixed(2)} / 100`
    };
}

// ────────────────────────────────────────────────
// 경희대학교 학생부교과 지역균형전형
// ────────────────────────────────────────────────

const KHU_RANK_SCORE = { 1:100, 2:96, 3:89, 4:77, 5:60, 6:40, 7:23, 8:11, 9:0 };
const KHU_ACH_SCORE  = { A:100, B:80, C:60 };

function calcKHUScore(student) {
    let rankWeighted = 0, rankCredit = 0;
    const achCandidates = [];
    const details = [];

    (student.subjects || []).forEach(sub => {
        const credit = sub.credit || 0;
        if (credit <= 0) return;
        if (sub.ach === 'P') return;

        const isMainSubject = !!(sub.isKorean || sub.isEnglish || sub.isMath || sub.isSocial || sub.isScience) && !sub.isExcluded;
        const isHanuksa = (sub.category || '').includes('한국사');
        const rank = Number(sub.rank) || 0;

        if (rank > 0) {
            if (isMainSubject) {
                const score = KHU_RANK_SCORE[rank] || 0;
                rankWeighted += score * credit;
                rankCredit   += credit;
                details.push({ subject: sub.subject, category: sub.category, credit, type: '공통/일반', rank, ach: null, score, selected: true });
            } else {
                details.push({ subject: sub.subject, category: sub.category, credit, type: null, reason: '반영교과 외', rank, ach: null, score: null, selected: false });
            }
        } else if (sub.ach && ['A','B','C'].includes(sub.ach)) {
            if (isMainSubject && !isHanuksa) {
                const score = KHU_ACH_SCORE[sub.ach] || 0;
                achCandidates.push({ subject: sub.subject, category: sub.category, credit, ach: sub.ach, score });
            } else {
                const reason = !isMainSubject ? '반영교과 외' : '진로선택 미반영(한국사)';
                details.push({ subject: sub.subject, category: sub.category, credit, type: null, reason, rank: null, ach: sub.ach, score: null, selected: false });
            }
        }
    });

    // 진로선택 상위 3개 과목 선택: 성취도점수 내림차순 → 이수단위 내림차순
    achCandidates.sort((a, b) => b.score - a.score || b.credit - a.credit);
    const top3 = achCandidates.slice(0, 3);
    const rest = achCandidates.slice(3);

    let achWeighted = 0, achCredit = 0;
    top3.forEach(sub => {
        achWeighted += sub.score * sub.credit;
        achCredit   += sub.credit;
        details.push({ ...sub, type: '진로선택(반영)', rank: null, selected: true });
    });
    rest.forEach(sub => {
        details.push({ ...sub, type: '진로선택(미선택)', rank: null, selected: false });
    });

    const scoreRank  = rankCredit > 0 ? rankWeighted / rankCredit : 0;
    const scoreAch   = achCredit  > 0 ? achWeighted  / achCredit  : 0;
    const finalScore = achCredit  > 0 ? scoreRank * 0.8 + scoreAch * 0.2 : scoreRank;

    return {
        scoreRank, scoreAch, finalScore,
        rankCredit, achCount: top3.length,
        details, displayScore: finalScore,
        summary: `교과성적(A) ${finalScore.toFixed(2)} / 100`
    };
}

// ────────────────────────────────────────────────
// 홍익대학교 학교장추천자전형 (학생부위주 교과)
// ────────────────────────────────────────────────

const HGU_RANK_SCORE = { 1:100, 2:96, 3:89, 4:77, 5:60, 6:40, 7:23, 8:11, 9:0 };
const HGU_ACH_SCORE  = { A:10, B:9, C:7 };

function calcHGUForType(subjects, isHuman) {
    let rankWeighted = 0, rankCredit = 0;
    let achWeighted  = 0, achCredit  = 0;
    const selected = [], unselected = [];

    (subjects || []).forEach(sub => {
        const credit = sub.credit || 0;
        if (credit <= 0) return;
        if (sub.ach === 'P') return;

        const included = isHuman
            ? !!(sub.isKorean || sub.isEnglish || sub.isMath || sub.isSocial) && !sub.isExcluded
            : !!(sub.isKorean || sub.isEnglish || sub.isMath || sub.isScience) && !sub.isExcluded;
        const rank = Number(sub.rank) || 0;

        if (rank > 0) {
            if (included) {
                const score = HGU_RANK_SCORE[rank] || 0;
                rankWeighted += score * credit;
                rankCredit   += credit;
                selected.push({ subject: sub.subject, category: sub.category, credit, type: '공통/일반', rank, ach: null, score });
            } else {
                unselected.push({ subject: sub.subject, category: sub.category, credit, type: null, reason: '반영교과 외', rank, ach: null, score: null });
            }
        } else if (sub.ach && ['A','B','C'].includes(sub.ach)) {
            if (included) {
                const score = HGU_ACH_SCORE[sub.ach] || 0;
                achWeighted += score * credit;
                achCredit   += credit;
                selected.push({ subject: sub.subject, category: sub.category, credit, type: '진로선택', rank: null, ach: sub.ach, score });
            } else {
                unselected.push({ subject: sub.subject, category: sub.category, credit, type: null, reason: '반영교과 외(진로)', rank: null, ach: sub.ach, score: null });
            }
        }
    });

    const avgRank        = rankCredit > 0 ? rankWeighted / rankCredit : 0;
    const avgAchRaw      = achCredit  > 0 ? achWeighted  / achCredit  : null;
    const avgAchEff      = avgAchRaw !== null ? avgAchRaw : avgRank * 0.09;
    const E              = Math.min(rankCredit + achCredit, 100);
    const rawScore       = (avgRank * 0.9 + avgAchEff) * (E / 1000 + 0.9);
    const finalScore     = parseFloat(rawScore.toFixed(2));

    return { finalScore, avgRank, avgAchRaw, avgAchEff, rankCredit, achCredit, E, selected, unselected };
}

function calcHGUScore(student) {
    const human = calcHGUForType(student.subjects, true);
    const sci   = calcHGUForType(student.subjects, false);
    const displayScore = Math.max(human.finalScore, sci.finalScore);

    return {
        human, sci, displayScore,
        summary: `인문 ${human.finalScore.toFixed(2)} · 자연 ${sci.finalScore.toFixed(2)} / 100`
    };
}

// ────────────────────────────────────────────────
// 동국대학교 학생부교과 학교장추천인재
// ────────────────────────────────────────────────

const DGU_RANK_SCORE = { 1:10.0, 2:9.99, 3:9.95, 4:9.9, 5:9.0, 6:8.0, 7:5.0, 8:3.0, 9:0.0 };

function calcDGUScore(student) {
    const humanCands = [];
    const sciCands   = [];
    const others     = [];

    (student.subjects || []).forEach(sub => {
        const rank = Number(sub.rank) || 0;
        if (sub.ach === 'P') return;

        if (rank <= 0) {
            if (sub.ach && ['A','B','C'].includes(sub.ach)) {
                others.push({ subject: sub.subject, category: sub.category, credit: sub.credit || 0, rank: null, ach: sub.ach, score: null, reason: '진로선택(등급없음)', inHuman: false, inSci: false });
            }
            return;
        }

        const score = DGU_RANK_SCORE[rank] ?? 0;
        const isHanuksa = (sub.category || '').includes('한국사');

        // 인문: 국어·수학·영어·사회(역사/도덕/한국사)
        const inHuman = !!(sub.isKorean || sub.isEnglish || sub.isMath || sub.isSocial) && !sub.isExcluded;
        // 자연: 국어·수학·영어·과학·한국사
        const inSci   = !!(sub.isKorean || sub.isEnglish || sub.isMath || sub.isScience || (sub.isSocial && isHanuksa)) && !sub.isExcluded;

        const item = { subject: sub.subject, category: sub.category, credit: sub.credit || 0, rank, ach: null, score, inHuman, inSci };

        if (inHuman) humanCands.push(item);
        if (inSci)   sciCands.push(item);
        if (!inHuman && !inSci) others.push({ ...item, reason: '반영교과 외' });
    });

    // 점수 내림차순 → 이수단위 내림차순 정렬 후 상위 10과목
    const sortFn = (a, b) => b.score - a.score || b.credit - a.credit;
    humanCands.sort(sortFn);
    sciCands.sort(sortFn);

    const top10H = humanCands.slice(0, 10);
    const top10S = sciCands.slice(0, 10);

    const avgH = top10H.length > 0 ? top10H.reduce((s, x) => s + x.score, 0) / top10H.length : 0;
    const avgS = top10S.length > 0 ? top10S.reduce((s, x) => s + x.score, 0) / top10S.length : 0;

    const scoreHuman = parseFloat((avgH / 10 * 700).toFixed(3));
    const scoreSci   = parseFloat((avgS / 10 * 700).toFixed(3));
    const displayScore = Math.max(scoreHuman, scoreSci);

    return {
        scoreHuman, scoreSci, displayScore,
        top10H, top10S,
        restH: humanCands.slice(10), restS: sciCands.slice(10),
        others,
        summary: `인문 ${scoreHuman.toFixed(2)} · 자연 ${scoreSci.toFixed(2)} / 700`
    };
}

// ────────────────────────────────────────────────
// 건국대학교 학생부교과(KU지역균형)
// ────────────────────────────────────────────────

const KKU_RANK_SCORE = { 1:10, 2:9.97, 3:9.94, 4:9.90, 5:9.86, 6:9.80, 7:8, 8:6, 9:0 };

function calcKKUScore(student) {
    let weighted = 0, totalCredit = 0;
    const details = [];

    (student.subjects || []).forEach(sub => {
        const credit = sub.credit || 0;
        if (credit <= 0) return;
        if (sub.ach === 'P') return;

        const included = !!(sub.isKorean || sub.isEnglish || sub.isMath || sub.isSocial || sub.isScience) && !sub.isExcluded;
        const rank = Number(sub.rank) || 0;

        if (rank > 0) {
            if (included) {
                const score = KKU_RANK_SCORE[rank] ?? 0;
                weighted    += score * credit;
                totalCredit += credit;
                details.push({ subject: sub.subject, category: sub.category, credit, type: '공통/일반', rank, ach: null, score, selected: true });
            } else {
                details.push({ subject: sub.subject, category: sub.category, credit, type: null, reason: '반영교과 외', rank, ach: null, score: null, selected: false });
            }
        } else if (sub.ach && ['A','B','C'].includes(sub.ach)) {
            // 진로선택과목은 교과정량에서 완전 제외
            details.push({ subject: sub.subject, category: sub.category, credit, type: null, reason: '진로선택(정성평가)', rank: null, ach: sub.ach, score: null, selected: false });
        }
    });

    const avg10   = totalCredit > 0 ? weighted / totalCredit : 0;
    const score700 = parseFloat((avg10 * 70).toFixed(3));

    return {
        avg10, score700, totalCredit,
        details, displayScore: score700,
        summary: `교과정량 ${score700.toFixed(3)} / 700`
    };
}

// ────────────────────────────────────────────────
// 서울시립대학교 학생부(교과) 고교추천전형
// ────────────────────────────────────────────────

const UOS_RANK_SCORE = { 1:100, 2:98, 3:95, 4:86, 5:71, 6:50, 7:30, 8:15, 9:0 };
const UOS_ACH_SCORE  = { A:100, B:97, C:90 };

function calcUOSScore(student) {
    let rankWeighted = 0, rankCredit = 0;
    let achWeighted  = 0, achCredit  = 0;
    const details = [];

    (student.subjects || []).forEach(sub => {
        const credit = sub.credit || 0;
        if (credit <= 0) return;
        if (sub.ach === 'P') return;

        const rank = Number(sub.rank) || 0;

        if (rank > 0) {
            const score = UOS_RANK_SCORE[rank] || 0;
            rankWeighted += score * credit;
            rankCredit   += credit;
            details.push({ subject: sub.subject, category: sub.category, credit, type: '공통/일반', rank, ach: null, score });
        } else if (sub.ach && ['A','B','C'].includes(sub.ach)) {
            const score = UOS_ACH_SCORE[sub.ach] || 0;
            achWeighted += score * credit;
            achCredit   += credit;
            details.push({ subject: sub.subject, category: sub.category, credit, type: '진로선택', rank: null, ach: sub.ach, score });
        }
    });

    const avgRank = rankCredit > 0 ? rankWeighted / rankCredit : 0;
    const avgAch  = achCredit  > 0 ? achWeighted  / achCredit  : 0;

    const rawScore = achCredit > 0
        ? avgRank * 7 + avgAch * 1
        : avgRank * 8;

    const finalScore = parseFloat(rawScore.toFixed(7));

    return {
        finalScore, avgRank, avgAch,
        rankCredit, achCredit,
        details, displayScore: finalScore,
        summary: `교과 점수 ${finalScore.toFixed(4)} / 800`
    };
}

// ────────────────────────────────────────────────
// 한국외국어대학교 학생부교과 학교장추천전형
// ────────────────────────────────────────────────

const HUFS_RANK_SCORE = { 1:1000, 2:960, 3:890, 4:770, 5:600, 6:400, 7:230, 8:110, 9:0 };
const HUFS_ACH_SCORE  = { A:1000, B:960, C:890 };

// 원점수 → 환산점수: 국어/영어/사회/과학/한국사
function hufsRawScore(raw) {
    const r = Number(raw);
    if (isNaN(r)) return null;
    if (r >= 90) return 1000;
    if (r >= 85) return 960;
    if (r >= 80) return 890;
    if (r >= 75) return 770;
    if (r >= 70) return 600;
    if (r >= 60) return 400;
    if (r >= 50) return 230;
    if (r >= 40) return 110;
    return 0;
}

// 원점수 → 환산점수: 수학
function hufsRawScoreMath(raw) {
    const r = Number(raw);
    if (isNaN(r)) return null;
    if (r >= 90) return 1000;
    if (r >= 80) return 960;
    if (r >= 70) return 890;
    if (r >= 60) return 770;
    if (r >= 50) return 600;
    if (r >= 40) return 400;
    if (r >= 30) return 230;
    if (r >= 20) return 110;
    return 0;
}

function calcHUFSScore(student) {
    let weighted = 0, totalCredit = 0;
    const details = [];

    (student.subjects || []).forEach(sub => {
        const credit = sub.credit || 0;
        if (credit <= 0) return;
        if (sub.ach === 'P') return;

        const included = !!(sub.isKorean || sub.isEnglish || sub.isMath || sub.isSocial || sub.isScience) && !sub.isExcluded;

        if (!included) {
            const rank = Number(sub.rank) || 0;
            if (rank > 0 || (sub.ach && ['A','B','C'].includes(sub.ach))) {
                details.push({ subject: sub.subject, category: sub.category, credit, type: null, reason: '반영교과 외', rank: rank || null, ach: sub.ach || null, raw: null, rankScore: null, rawScore: null, finalScore: null });
            }
            return;
        }

        const rank = Number(sub.rank) || 0;

        if (rank > 0) {
            const rankScore = HUFS_RANK_SCORE[rank] || 0;

            let rawScore = null;
            const rawVal = sub.raw;
            if (rawVal !== null && rawVal !== undefined && rawVal !== '') {
                rawScore = sub.isMath ? hufsRawScoreMath(rawVal) : hufsRawScore(rawVal);
            }

            const finalScore = (rawScore !== null) ? Math.max(rankScore, rawScore) : rankScore;
            const usedRaw = rawScore !== null && rawScore > rankScore;

            weighted     += finalScore * credit;
            totalCredit  += credit;
            details.push({ subject: sub.subject, category: sub.category, credit, type: '공통/일반', rank, ach: null, raw: rawVal ?? null, rankScore, rawScore, finalScore, usedRaw });
        } else if (sub.ach && ['A','B','C'].includes(sub.ach)) {
            const finalScore = HUFS_ACH_SCORE[sub.ach] || 0;
            weighted    += finalScore * credit;
            totalCredit += credit;
            details.push({ subject: sub.subject, category: sub.category, credit, type: '진로선택', rank: null, ach: sub.ach, raw: null, rankScore: null, rawScore: null, finalScore, usedRaw: false });
        }
    });

    const finalScore = totalCredit > 0 ? weighted / totalCredit : 0;

    return {
        finalScore, totalCredit,
        details, displayScore: finalScore,
        summary: `교과 점수 ${finalScore.toFixed(2)} / 1000`
    };
}

// ────────────────────────────────────────────────
// 국민대학교 교과우수자(학교장추천)전형
// ────────────────────────────────────────────────

const KMU_RANK_SCORE = { 1:100, 2:99, 3:98, 4:95, 5:90, 6:70, 7:50, 8:30, 9:0 };
const KMU_ACH_SCORE  = { A:100, B:98, C:90 };

function calcKMUForType(subjects, isHuman) {
    let rankWeighted = 0, rankCredit = 0;
    const achCands = [];
    const selected = [], unselected = [];

    (subjects || []).forEach(sub => {
        const credit = sub.credit || 0;
        if (credit <= 0) return;
        if (sub.ach === 'P') return;

        const included = isHuman
            ? !!(sub.isKorean || sub.isEnglish || sub.isMath || sub.isSocial) && !sub.isExcluded
            : !!(sub.isKorean || sub.isEnglish || sub.isMath || sub.isScience) && !sub.isExcluded;
        const rank = Number(sub.rank) || 0;

        if (rank > 0) {
            if (included) {
                const score = KMU_RANK_SCORE[rank] || 0;
                rankWeighted += score * credit;
                rankCredit   += credit;
                selected.push({ subject: sub.subject, category: sub.category, credit, type: '공통/일반', rank, ach: null, score });
            } else {
                unselected.push({ subject: sub.subject, category: sub.category, credit, type: null, reason: '반영교과 외', rank, ach: null, score: null });
            }
        } else if (sub.ach && ['A','B','C'].includes(sub.ach)) {
            if (included) {
                const score = KMU_ACH_SCORE[sub.ach] || 0;
                achCands.push({ subject: sub.subject, category: sub.category, credit, ach: sub.ach, score });
            } else {
                unselected.push({ subject: sub.subject, category: sub.category, credit, type: null, reason: '반영교과 외(진로)', rank: null, ach: sub.ach, score: null });
            }
        }
    });

    achCands.sort((a, b) => b.score - a.score || b.credit - a.credit);
    const achTop3 = achCands.slice(0, 3);
    const achRest = achCands.slice(3);

    let achWeighted = 0, achCredit = 0;
    achTop3.forEach(s => {
        achWeighted += s.score * s.credit;
        achCredit   += s.credit;
    });

    const avgRank = rankCredit > 0 ? rankWeighted / rankCredit : 0;
    const avgAch  = achCredit  > 0 ? achWeighted  / achCredit  : 0;

    const finalScore = achCredit > 0
        ? avgRank * 8.5 + avgAch * 1.5
        : avgRank * 10;

    return { finalScore, avgRank, avgAch, rankCredit, achTop3, achRest, achCredit, selected, unselected };
}

function calcKMUScore(student) {
    const human = calcKMUForType(student.subjects, true);
    const sci   = calcKMUForType(student.subjects, false);
    const displayScore = Math.max(human.finalScore, sci.finalScore);

    return {
        human, sci, displayScore,
        summary: `인문 ${human.finalScore.toFixed(2)} · 자연 ${sci.finalScore.toFixed(2)} / 1000`
    };
}

// ────────────────────────────────────────────────
// 숭실대학교 학생부교과 교과우수자(학교장추천)전형
// ────────────────────────────────────────────────

const SSU_RANK_SCORE = { 1:10, 2:9.5, 3:9, 4:8.5, 5:8, 6:7, 7:5, 8:3, 9:0 };
const SSU_ACH_SCORE  = { A:10, B:9.5, C:9 };

const SSU_TYPES = [
    { key:'human',       label:'인문계열',       useSocial:true,  useSci:false, w:{ korean:0.35, math:0.15, english:0.35, social:0.15, science:0    } },
    { key:'business',    label:'경상계열',       useSocial:true,  useSci:false, w:{ korean:0.20, math:0.30, english:0.35, social:0.15, science:0    } },
    { key:'liberal_hum', label:'자유전공(인문)', useSocial:true,  useSci:false, w:{ korean:0.30, math:0.20, english:0.30, social:0.20, science:0    } },
    { key:'sci',         label:'자연계열',       useSocial:false, useSci:true,  w:{ korean:0.15, math:0.35, english:0.25, social:0,    science:0.25 } },
];
const SSU_GK_LABEL = { korean:'국어', math:'수학', english:'영어', social:'사회(한국사)', science:'과학' };
const SSU_GK_ORDER = ['korean','math','english','social','science'];

function calcSSUForType(subjects, tc) {
    const g = {};
    SSU_GK_ORDER.forEach(k => { g[k] = { pts:0, crd:0, achPts:0, achCrd:0, achCnt:0 }; });
    const selected = [], unselected = [];

    (subjects || []).forEach(sub => {
        const credit = sub.credit || 0;
        if (credit <= 0) return;
        if (sub.ach === 'P') return;

        let gk = null;
        if      (sub.isKorean  && !sub.isExcluded)              gk = 'korean';
        else if (sub.isMath    && !sub.isExcluded)              gk = 'math';
        else if (sub.isEnglish && !sub.isExcluded)              gk = 'english';
        else if (sub.isSocial  && !sub.isExcluded && tc.useSocial) gk = 'social';
        else if (sub.isScience && !sub.isExcluded && tc.useSci)    gk = 'science';

        const rank = Number(sub.rank) || 0;

        if (gk && rank > 0) {
            const score = SSU_RANK_SCORE[rank] || 0;
            g[gk].pts += score * credit;
            g[gk].crd += credit;
            selected.push({ subject:sub.subject, category:sub.category, credit, type:'공통/일반', gk, rank, ach:null, score });
        } else if (gk && sub.ach && ['A','B','C'].includes(sub.ach)) {
            const score = SSU_ACH_SCORE[sub.ach] || 0;
            g[gk].achPts += score * credit;
            g[gk].achCrd += credit;
            g[gk].achCnt++;
            selected.push({ subject:sub.subject, category:sub.category, credit, type:'진로선택', gk, rank:null, ach:sub.ach, score });
        } else {
            if (rank > 0 || (sub.ach && ['A','B','C'].includes(sub.ach))) {
                unselected.push({ subject:sub.subject, category:sub.category, credit, reason:'반영교과 외', rank:rank||null, ach:sub.ach||null });
            }
        }
    });

    const T5 = v => Math.trunc(v * 100000) / 100000;
    const T3 = v => Math.trunc(v * 1000) / 1000;

    let commonSum = 0;
    const contrib = {};
    SSU_GK_ORDER.forEach(k => {
        const wt = tc.w[k] || 0;
        if (wt === 0 || g[k].crd === 0) { contrib[k] = 0; return; }
        const c = T5(g[k].pts * wt / g[k].crd);
        contrib[k] = c;
        commonSum += c;
    });
    const commonScore = T3(commonSum * 8);

    let achPts = 0, achCrd = 0, achCnt = 0;
    SSU_GK_ORDER.forEach(k => {
        if ((tc.w[k] || 0) === 0) return;
        achPts += g[k].achPts;
        achCrd += g[k].achCrd;
        achCnt += g[k].achCnt;
    });

    let achScore = 0, capRate = 0;
    if (achCrd > 0) {
        capRate = achCnt >= 3 ? 20 : achCnt === 2 ? 18 : 16;
        achScore = T3(T5(achPts / achCrd) * 2 * (capRate / 20));
    }

    const finalScore = T3(commonScore + achScore);
    return { finalScore, commonScore, achScore, g, contrib, achCnt, capRate, achCrd, selected, unselected };
}

function calcSSUScore(student) {
    const results = {};
    let displayScore = -Infinity, bestKey = SSU_TYPES[0].key;
    SSU_TYPES.forEach(tc => {
        const r = calcSSUForType(student.subjects, tc);
        r.label = tc.label;
        results[tc.key] = r;
        if (r.finalScore > displayScore) { displayScore = r.finalScore; bestKey = tc.key; }
    });
    return { results, displayScore, bestKey, summary: `최고 ${displayScore.toFixed(3)} / 100` };
}

// ────────────────────────────────────────────────
// 세종대학교 학생부교과 지역균형전형
// ────────────────────────────────────────────────

const SJU_RANK_SCORE = { 1:1000, 2:990, 3:980, 4:950, 5:900, 6:800, 7:700, 8:500, 9:0 };
const SJU_ACH_SCORE  = { A:1000, B:980, C:900 };

const SJU_TYPES = [
    { key:'liberal', label:'자유전공학부', useKorean:true, useMath:true,  useEnglish:true, useSocial:false, useSci:false },
    { key:'human',   label:'인문계열',     useKorean:true, useMath:true,  useEnglish:true, useSocial:true,  useSci:false },
    { key:'sci',     label:'자연계열',     useKorean:true, useMath:true,  useEnglish:true, useSocial:false, useSci:true  },
];

function T8(v) { return Math.trunc(v * 100000000) / 100000000; }

function calcSJUForType(subjects, tc) {
    let rankPts = 0, rankCrd = 0;
    let achPts = 0, achCrd = 0;
    const selected = [];
    const unselected = [];

    for (const s of subjects) {
        if (s.isExcluded) { unselected.push({ ...s, reason: '제외교과' }); continue; }

        const included = (
            (tc.useKorean  && s.isKorean)  ||
            (tc.useMath    && s.isMath)    ||
            (tc.useEnglish && s.isEnglish) ||
            (tc.useSocial  && s.isSocial)  ||
            (tc.useSci     && s.isScience)
        );
        if (!included) { unselected.push({ ...s, reason: '반영교과 외' }); continue; }

        if (s.rank > 0) {
            const score = SJU_RANK_SCORE[s.rank] ?? 0;
            rankPts += score * s.credit;
            rankCrd += s.credit;
            selected.push({ ...s, score, kind: '공통/일반' });
        } else if (s.ach && SJU_ACH_SCORE[s.ach] !== undefined) {
            const score = SJU_ACH_SCORE[s.ach];
            achPts += score * s.credit;
            achCrd += s.credit;
            selected.push({ ...s, score, kind: '진로선택' });
        } else {
            unselected.push({ ...s, reason: '등급없음' });
        }
    }

    const rankAvg = rankCrd > 0 ? rankPts / rankCrd : 0;
    const achAvg  = achCrd  > 0 ? achPts  / achCrd  : 0;
    const finalScore = achCrd === 0
        ? T8(rankAvg)
        : T8(rankAvg * 0.8 + achAvg * 0.2);

    return { finalScore, rankAvg, achAvg, rankCrd, achCrd, selected, unselected };
}

function calcSJUScore(student) {
    const results = {};
    let displayScore = -Infinity, bestKey = SJU_TYPES[0].key;
    SJU_TYPES.forEach(tc => {
        const r = calcSJUForType(student.subjects, tc);
        r.label = tc.label;
        results[tc.key] = r;
        if (r.finalScore > displayScore) { displayScore = r.finalScore; bestKey = tc.key; }
    });
    return { results, displayScore, bestKey, summary: `최고 ${displayScore.toFixed(2)} / 1000` };
}

// ────────────────────────────────────────────────
// 단국대학교(죽전) 학생부교과 지역균형선발전형
// ────────────────────────────────────────────────

const DKU_RANK_SCORE = { 1:100, 2:99, 3:98, 4:97, 5:96, 6:95, 7:70, 8:40, 9:0 };
const DKU_ACH_RANK   = { A:1, B:3, C:5 };

function calcDKUScore(student) {
    let pts = 0, crd = 0;
    const selected = [];
    const unselected = [];

    for (const s of student.subjects) {
        if (s.isExcluded) { unselected.push({ ...s, reason: '제외교과' }); continue; }

        const included = s.isKorean || s.isMath || s.isEnglish || s.isSocial || s.isScience;
        if (!included) { unselected.push({ ...s, reason: '반영교과 외' }); continue; }

        let score = null;
        let effectiveRank = null;

        if (s.rank > 0) {
            effectiveRank = s.rank;
            score = DKU_RANK_SCORE[s.rank] ?? 0;
        } else if (s.ach && DKU_ACH_RANK[s.ach] !== undefined) {
            effectiveRank = DKU_ACH_RANK[s.ach];
            score = DKU_RANK_SCORE[effectiveRank];
        } else {
            unselected.push({ ...s, reason: '등급없음' });
            continue;
        }

        pts += score * s.credit;
        crd += s.credit;
        selected.push({ ...s, score, effectiveRank });
    }

    const avg = crd > 0 ? pts / crd : 0;
    const finalScore = Math.round(avg * 0.95 * 1000) / 1000;

    return { finalScore, displayScore: finalScore, avg, pts, crd, selected, unselected,
             summary: `${finalScore.toFixed(3)} / 95` };
}

// ────────────────────────────────────────────────
// 광운대학교 - 학생부교과 지역균형전형
// ────────────────────────────────────────────────
const KWU_RANK_SCORE = { 1:100, 2:98, 3:96, 4:94, 5:92, 6:88, 7:80, 8:70, 9:0 };
const KWU_ACH_RANK   = { A:1, B:2, C:4 };

function calcKWUScore(student) {
    let pts = 0, crd = 0;
    const selected = [];
    const unselected = [];

    for (const s of student.subjects) {
        if (s.isExcluded) { unselected.push({ ...s, reason: '제외교과' }); continue; }

        const included = s.isKorean || s.isMath || s.isEnglish || s.isSocial || s.isScience;
        if (!included) { unselected.push({ ...s, reason: '반영교과 외' }); continue; }

        if (s.subject && s.subject.replace(/\s/g, '') === '과학탐구실험') {
            unselected.push({ ...s, reason: '과학탐구실험(미반영)' });
            continue;
        }

        let score = null;
        let effectiveRank = null;

        if (s.rank > 0) {
            effectiveRank = s.rank;
            score = KWU_RANK_SCORE[s.rank] ?? 0;
        } else if (s.ach && KWU_ACH_RANK[s.ach] !== undefined) {
            effectiveRank = KWU_ACH_RANK[s.ach];
            score = KWU_RANK_SCORE[effectiveRank];
        } else {
            unselected.push({ ...s, reason: '등급없음' });
            continue;
        }

        pts += score * s.credit;
        crd += s.credit;
        selected.push({ ...s, score, effectiveRank });
    }

    const gradeScore = crd > 0 ? pts / crd : 0;
    const finalScore = Math.round(gradeScore * 10 * 1000) / 1000;

    return { finalScore, displayScore: finalScore, gradeScore, pts, crd, selected, unselected,
             summary: `${finalScore.toFixed(3)} / 1000` };
}

// ────────────────────────────────────────────────
// 명지대학교 - 학생부교과 학교장추천전형
// ────────────────────────────────────────────────
const MJU_RANK_SCORE = { 1:100, 2:99, 3:98, 4:94, 5:90, 6:80, 7:60, 8:30, 9:0 };
const MJU_ACH_RANK   = { A:1, B:2, C:4 };
const MJU_TYPES = [
    { key:'human', label:'인문사회계열', useKorean:true, useMath:true,  useEnglish:true, useSocial:true,  useSci:false },
    { key:'sci',   label:'자연공학계열', useKorean:true, useMath:true,  useEnglish:true, useSocial:false, useSci:true  },
    { key:'art',   label:'예체능계열',   useKorean:true, useMath:false, useEnglish:true, useSocial:false, useSci:false },
];

function calcMJUForType(subjects, tc) {
    let pts = 0, crd = 0;
    const selected = [], unselected = [];

    for (const s of subjects) {
        if (s.isExcluded) { unselected.push({ ...s, reason: '제외교과' }); continue; }

        const included = (tc.useKorean  && s.isKorean)  ||
                         (tc.useMath    && s.isMath)     ||
                         (tc.useEnglish && s.isEnglish)  ||
                         (tc.useSocial  && s.isSocial)   ||
                         (tc.useSci     && s.isScience);
        if (!included) { unselected.push({ ...s, reason: '반영교과 외' }); continue; }

        let score = null, effectiveRank = null;
        if (s.rank > 0) {
            effectiveRank = s.rank;
            score = MJU_RANK_SCORE[s.rank] ?? 0;
        } else if (s.ach && MJU_ACH_RANK[s.ach] !== undefined) {
            effectiveRank = MJU_ACH_RANK[s.ach];
            score = MJU_RANK_SCORE[effectiveRank];
        } else {
            unselected.push({ ...s, reason: '등급없음' });
            continue;
        }

        pts += score * s.credit;
        crd += s.credit;
        selected.push({ ...s, score, effectiveRank });
    }

    if (crd === 0) return null;
    // 가산점: 이수학점 합 × 0.05 → 결과값이 100.05 초과 가능
    const gradeScore = Math.round((pts / crd + 0.05) * 1000) / 1000;
    const finalScore = gradeScore * 10;
    return { finalScore, gradeScore, pts, crd, selected, unselected };
}

function calcMJUScore(student) {
    const results = {};
    for (const tc of MJU_TYPES) {
        const r = calcMJUForType(student.subjects, tc);
        if (r) results[tc.key] = { ...r, typeLabel: tc.label };
    }

    let bestKey = null, bestScore = -1;
    for (const [k, v] of Object.entries(results)) {
        if (v.finalScore > bestScore) { bestScore = v.finalScore; bestKey = k; }
    }

    const displayScore = bestScore >= 0 ? bestScore : 0;
    return { results, displayScore, bestKey,
             summary: `최고 ${displayScore.toFixed(3)} / ~1000` };
}

// ────────────────────────────────────────────────
// 상명대학교(서울) - 학생부교과 고교추천전형
// ────────────────────────────────────────────────
const SMU_RANK_SCORE = { 1:100, 2:98, 3:96, 4:94, 5:90, 6:80, 7:60, 8:40, 9:0 };
const SMU_ACH_SCORE  = { A:100, B:96, C:90 };

function calcSMUScore(student) {
    let pts = 0, crd = 0;
    const selected = [], unselected = [];
    const achCandidates = [];

    for (const s of student.subjects) {
        if (s.rank > 0) {
            const score = SMU_RANK_SCORE[s.rank] ?? 0;
            pts += score * s.credit;
            crd += s.credit;
            selected.push({ ...s, score, type: 'rank' });
        } else if (s.ach && SMU_ACH_SCORE[s.ach] !== undefined) {
            achCandidates.push({ ...s, score: SMU_ACH_SCORE[s.ach] });
        } else {
            unselected.push({ ...s, reason: '등급없음' });
        }
    }

    // 진로선택: 성취등급 높은 순, 동점 시 이수학점 많은 순, 최대 3과목
    achCandidates.sort((a, b) => b.score - a.score || b.credit - a.credit);

    for (let i = 0; i < achCandidates.length; i++) {
        const s = achCandidates[i];
        if (i < 3) {
            pts += s.score * s.credit;
            crd += s.credit;
            selected.push({ ...s, type: 'ach' });
        } else {
            unselected.push({ ...s, reason: '진로선택 4위 이하 (미반영)' });
        }
    }

    const gradeScore = crd > 0 ? pts / crd : 0;
    const finalScore = Math.round(gradeScore * 10 * 1000) / 1000;

    return { finalScore, displayScore: finalScore, gradeScore, pts, crd, selected, unselected,
             summary: `${finalScore.toFixed(3)} / 1000` };
}

// ────────────────────────────────────────────────
// 부산대학교 - 학생부교과전형
// ────────────────────────────────────────────────
const PNU_RANK_SCORE = { 1:100, 2:99, 3:98, 4:97, 5:96, 6:95, 7:90, 8:60, 9:0 };

function calcPNUScore(student) {
    let pts = 0, crd = 0;
    const selected = [], unselected = [];

    for (const s of student.subjects) {
        if (s.isExcluded) { unselected.push({ ...s, reason: '제외교과' }); continue; }

        const included = s.isKorean || s.isMath || s.isEnglish || s.isSocial || s.isScience;
        if (!included) { unselected.push({ ...s, reason: '반영교과 외' }); continue; }

        if (s.rank > 0) {
            const score = PNU_RANK_SCORE[s.rank] ?? 0;
            pts += score * s.credit;
            crd += s.credit;
            selected.push({ ...s, score });
        } else if (s.ach) {
            // 진로선택 성취도 과목 — 부산대는 석차등급 과목만 반영
            unselected.push({ ...s, reason: '진로선택(성취도 미반영)' });
        } else {
            unselected.push({ ...s, reason: '등급없음' });
        }
    }

    const avgScore = crd > 0 ? pts / crd : 0;
    // 소수점 다섯째 자리에서 버림
    const finalScore = Math.floor(avgScore * 0.8 * 10000) / 10000;

    return { finalScore, displayScore: finalScore, avgScore, pts, crd, selected, unselected,
             summary: `${finalScore.toFixed(4)} / 80` };
}

// ────────────────────────────────────────────────
// 가톨릭대학교 - 학생부교과 지역균형전형
// ────────────────────────────────────────────────
const CUK_RANK_SCORE = { 1:100, 2:99, 3:98, 4:97, 5:96, 6:95, 7:94, 8:88, 9:70 };
const CUK_ACH_RANK   = { A:1, B:2, C:4 };

function calcCUKScore(student) {
    let pts = 0, crd = 0;
    const selected = [], unselected = [];

    for (const s of student.subjects) {
        if (s.isExcluded) { unselected.push({ ...s, reason: '제외교과' }); continue; }

        const included = s.isKorean || s.isMath || s.isEnglish || s.isSocial || s.isScience;
        if (!included) { unselected.push({ ...s, reason: '반영교과 외' }); continue; }

        let score = null, effectiveRank = null;
        if (s.rank > 0) {
            effectiveRank = s.rank;
            score = CUK_RANK_SCORE[s.rank] ?? CUK_RANK_SCORE[9];
        } else if (s.ach && CUK_ACH_RANK[s.ach] !== undefined) {
            effectiveRank = CUK_ACH_RANK[s.ach];
            score = CUK_RANK_SCORE[effectiveRank];
        } else {
            unselected.push({ ...s, reason: '등급없음' });
            continue;
        }

        pts += score * s.credit;
        crd += s.credit;
        selected.push({ ...s, score, effectiveRank });
    }

    const gradeScore = crd > 0 ? pts / crd : 0;
    const finalScore = Math.round(gradeScore * 1000) / 1000;

    return { finalScore, displayScore: finalScore, gradeScore, pts, crd, selected, unselected,
             summary: `${finalScore.toFixed(3)} / 100` };
}

// ────────────────────────────────────────────────
// 한국기술교육대학교 - 학생부교과전형
// ────────────────────────────────────────────────
const KUT_RANK_SCORE = { 1:100, 2:99, 3:98, 4:95.5, 5:93, 6:90.5, 7:61.5, 8:32.5, 9:3.5 };
const KUT_ACH_BONUS  = { A:3, B:2, C:1 };

function calcKUTTypeScore(subjects, useSci) {
    let pts = 0, crd = 0;
    const selected = [], unselected = [];
    for (const s of subjects) {
        if (!s.credit || s.credit <= 0) continue;
        if (s.isExcluded) { unselected.push({ ...s, reason: '제외교과' }); continue; }
        const isHanuksa = (s.category || '').includes('한국사');
        const included = s.isKorean || s.isMath || s.isEnglish ||
            (useSci ? s.isScience : (s.isSocial && !isHanuksa));
        if (!included) { unselected.push({ ...s, reason: '반영교과 외' }); continue; }
        if (s.rank > 0) {
            const score = KUT_RANK_SCORE[s.rank] ?? 0;
            pts += score * s.credit; crd += s.credit;
            selected.push({ ...s, score });
        } else if (s.ach) {
            unselected.push({ ...s, reason: '진로선택(교과성적 제외)' });
        } else {
            unselected.push({ ...s, reason: '등급없음' });
        }
    }
    const gradeScore = crd > 0 ? pts / crd : 0;
    const baseScore = Math.round(gradeScore * 100) / 100;
    return { baseScore, gradeScore, pts, crd, selected, unselected };
}

function calcKUTBonus(subjects, baseScore) {
    const isPeArt = s => { const c = s.category || ''; return c.includes('체육') || c.includes('예술') || c.includes('음악') || c.includes('미술'); };
    const pool = subjects
        .filter(s => s.credit > 0 && !(s.rank > 0) && s.ach && KUT_ACH_BONUS[s.ach] !== undefined && !isPeArt(s))
        .map(s => ({ ...s, bonusPt: KUT_ACH_BONUS[s.ach] }))
        .sort((a, b) => b.bonusPt - a.bonusPt || b.credit - a.credit);
    const top3 = pool.slice(0, 3);
    const sum = top3.reduce((acc, s) => acc + s.bonusPt, 0);
    const bonus = Math.round(baseScore * (sum / 3 / 100) * 100) / 100;
    return { bonus, top3, sum, rest: pool.slice(3) };
}

function calcKUTScore(student) {
    const subjects = student.subjects || [];
    const stem = calcKUTTypeScore(subjects, true);
    const soc  = calcKUTTypeScore(subjects, false);
    const stemBonusData = calcKUTBonus(subjects, stem.baseScore);
    const socBonusData  = calcKUTBonus(subjects, soc.baseScore);
    const stemTotal = stem.baseScore + stemBonusData.bonus;
    const socTotal  = soc.baseScore  + socBonusData.bonus;
    const best = stemTotal >= socTotal ? 'stem' : 'soc';
    const displayScore = Math.max(stemTotal, socTotal);
    return {
        finalScore: displayScore,
        displayScore,
        stem: { ...stem, bonusData: stemBonusData, total: stemTotal },
        soc:  { ...soc,  bonusData: socBonusData,  total: socTotal },
        best,
        summary: `${displayScore.toFixed(2)} / 100`
    };
}

// ────────────────────────────────────────────────
// 한양대학교 ERICA - 학생부교과 지역균형선발전형
// ────────────────────────────────────────────────
const HYE_RANK_SCORE = { 1:100, 2:99, 3:98, 4:95, 5:90, 6:70, 7:50, 8:25, 9:0 };
const HYE_ACH_SCORE  = { A:100, B:99, C:98 };

function calcHYEScore(student) {
    let rankPts = 0, rankCrd = 0;
    let achPts  = 0, achCrd  = 0;
    const selected = [], unselected = [];

    for (const s of student.subjects) {
        if (!s.credit || s.credit <= 0) continue;
        if (s.isExcluded) { unselected.push({ ...s, reason: '제외교과' }); continue; }

        const included = s.isKorean || s.isMath || s.isEnglish || s.isSocial || s.isScience;
        if (!included) { unselected.push({ ...s, reason: '반영교과 외' }); continue; }

        if (s.rank > 0) {
            const score = HYE_RANK_SCORE[s.rank] ?? 0;
            rankPts += score * s.credit; rankCrd += s.credit;
            selected.push({ ...s, score, type: '공통/일반' });
        } else if (s.ach && HYE_ACH_SCORE[s.ach] !== undefined) {
            const score = HYE_ACH_SCORE[s.ach];
            achPts += score * s.credit; achCrd += s.credit;
            selected.push({ ...s, score, type: '진로선택' });
        } else {
            unselected.push({ ...s, reason: '등급없음' });
        }
    }

    const rankAvg = rankCrd > 0 ? rankPts / rankCrd : 0;
    const achAvg  = achCrd  > 0 ? achPts  / achCrd  : 0;

    let rankScore, achScore, finalScore;
    if (achCrd === 0) {
        rankScore = rankAvg * 10;
        achScore  = 0;
        finalScore = rankScore;
    } else {
        rankScore  = rankAvg * 8;
        achScore   = achAvg  * 2;
        finalScore = rankScore + achScore;
    }

    return {
        finalScore, displayScore: finalScore,
        rankAvg, achAvg, rankScore, achScore,
        rankPts, rankCrd, achPts, achCrd,
        selected, unselected,
        summary: `${finalScore.toFixed(4)} / 1000`
    };
}

// ────────────────────────────────────────────────
// 고려대학교(세종) - 학생부교과 일반전형
// ────────────────────────────────────────────────
const KUS_RANK_SCORE = { 1:1000, 2:990, 3:980, 4:950, 5:900, 6:700, 7:500, 8:250, 9:0 };
const KUS_ACH_SCORE  = { A:1000, B:980, C:900 };

function calcKUSTypeScore(subjects, useSocial) {
    let rankPts = 0, rankCrd = 0;
    let achPts  = 0, achCrd  = 0;
    const selected = [], unselected = [];

    for (const s of subjects) {
        if (!s.credit || s.credit <= 0) continue;
        if (s.isExcluded) { unselected.push({ ...s, reason: '제외교과' }); continue; }

        const included = s.isKorean || s.isMath || s.isEnglish ||
            (useSocial ? s.isSocial : s.isScience);
        if (!included) { unselected.push({ ...s, reason: '반영교과 외' }); continue; }

        if (s.rank > 0) {
            const score = KUS_RANK_SCORE[s.rank] ?? 0;
            rankPts += score * s.credit; rankCrd += s.credit;
            selected.push({ ...s, score, type: '공통/일반' });
        } else if (s.ach && KUS_ACH_SCORE[s.ach] !== undefined) {
            const score = KUS_ACH_SCORE[s.ach];
            achPts += score * s.credit; achCrd += s.credit;
            selected.push({ ...s, score, type: '진로선택' });
        } else {
            unselected.push({ ...s, reason: '등급없음' });
        }
    }

    const rankAvg = rankCrd > 0 ? rankPts / rankCrd : 0;
    const achAvg  = achCrd  > 0 ? achPts  / achCrd  : 0;

    let rankScore, achScore, finalScore;
    if (achCrd === 0) {
        rankScore = rankAvg; achScore = 0; finalScore = rankAvg;
    } else {
        rankScore = rankAvg * 0.9; achScore = achAvg * 0.1; finalScore = rankScore + achScore;
    }

    return { finalScore, rankAvg, achAvg, rankScore, achScore, rankPts, rankCrd, achPts, achCrd, selected, unselected };
}

function calcKUSScore(student) {
    const subjects = student.subjects || [];
    const hum = calcKUSTypeScore(subjects, true);
    const sci = calcKUSTypeScore(subjects, false);
    const best = hum.finalScore >= sci.finalScore ? 'hum' : 'sci';
    const displayScore = Math.max(hum.finalScore, sci.finalScore);
    return {
        finalScore: displayScore, displayScore,
        hum, sci, best,
        summary: `${displayScore.toFixed(4)} / 1000`
    };
}

// ────────────────────────────────────────────────
// 아주대학교 - 학생부교과 고교추천전형
// ────────────────────────────────────────────────
const AJU_RANK_SCORE = { 1:100, 2:99, 3:98, 4:95, 5:90, 6:85, 7:75, 8:65, 9:0 };
const AJU_ACH_SCORE  = { A:100, B:98, C:90 };

function calcAJUScore(student) {
    let pts = 0, crd = 0;
    const selected = [], unselected = [];
    const achCandidates = [];

    for (const s of student.subjects) {
        if (!s.credit || s.credit <= 0) continue;
        if (s.isExcluded) { unselected.push({ ...s, reason: '제외교과' }); continue; }

        const isHanuksa = (s.category || '').includes('한국사');
        if (isHanuksa) { unselected.push({ ...s, reason: '한국사(미반영)' }); continue; }

        const included = s.isKorean || s.isMath || s.isEnglish || (s.isSocial && !isHanuksa) || s.isScience;
        if (!included) { unselected.push({ ...s, reason: '반영교과 외' }); continue; }

        if (s.rank > 0) {
            const score = AJU_RANK_SCORE[s.rank] ?? 0;
            pts += score * s.credit; crd += s.credit;
            selected.push({ ...s, score, type: '공통/일반' });
        } else if (s.ach && AJU_ACH_SCORE[s.ach] !== undefined) {
            achCandidates.push({ ...s, score: AJU_ACH_SCORE[s.ach] });
        } else {
            unselected.push({ ...s, reason: '등급없음' });
        }
    }

    // 진로선택: 성취도 높은 순 → 이수단위 큰 순, 상위 5개만 반영
    achCandidates.sort((a, b) => b.score - a.score || b.credit - a.credit);
    for (let i = 0; i < achCandidates.length; i++) {
        const s = achCandidates[i];
        if (i < 5) {
            pts += s.score * s.credit; crd += s.credit;
            selected.push({ ...s, type: '진로선택', achOrder: i + 1 });
        } else {
            unselected.push({ ...s, reason: '진로선택 6위 이하 (미반영)' });
        }
    }

    const gradeScore = crd > 0 ? pts / crd : 0;
    const finalScore = Math.round(gradeScore * 100) / 100;

    return {
        finalScore, displayScore: finalScore,
        gradeScore, pts, crd, selected, unselected,
        summary: `${finalScore.toFixed(2)} / 100`
    };
}

// ────────────────────────────────────────────────
// 인하대학교 - 학생부교과 지역균형전형
// ────────────────────────────────────────────────
const INU_RANK_SCORE = { 1:10.0, 2:9.8, 3:9.6, 4:9.4, 5:9.0, 6:8.0, 7:4.0, 8:2.0, 9:0 };
const INU_ACH_RANK   = { A:1, B:2, C:4 }; // A→1등급(10.0), B→2등급(9.8), C→4등급(9.4)

function calcINUTypeScore(subjects, useSocial, useSci) {
    let pts = 0, crd = 0;
    const selected = [], unselected = [];
    const achCandidates = [];

    for (const s of subjects) {
        if (!s.credit || s.credit <= 0) continue;
        if (s.isExcluded) { unselected.push({ ...s, reason: '제외교과' }); continue; }

        const included = s.isKorean || s.isMath || s.isEnglish ||
            (useSocial && s.isSocial) || (useSci && s.isScience);
        if (!included) { unselected.push({ ...s, reason: '반영교과 외' }); continue; }

        if (s.rank > 0) {
            const score = INU_RANK_SCORE[s.rank] ?? 0;
            pts += score * s.credit; crd += s.credit;
            selected.push({ ...s, score, type: '공통/일반' });
        } else if (s.ach && INU_ACH_RANK[s.ach] !== undefined) {
            const effectiveRank = INU_ACH_RANK[s.ach];
            const score = INU_RANK_SCORE[effectiveRank];
            achCandidates.push({ ...s, score, effectiveRank });
        } else {
            unselected.push({ ...s, reason: '등급없음' });
        }
    }

    // 진로선택: 성취도(→등급) 높은 순, 동점 시 이수단위 큰 순, 상위 3개만 반영
    achCandidates.sort((a, b) => a.effectiveRank - b.effectiveRank || b.credit - a.credit);
    for (let i = 0; i < achCandidates.length; i++) {
        const s = achCandidates[i];
        if (i < 3) {
            pts += s.score * s.credit; crd += s.credit;
            selected.push({ ...s, type: '진로선택', achOrder: i + 1 });
        } else {
            unselected.push({ ...s, reason: '진로선택 4위 이하 (미반영)' });
        }
    }

    const gradeScore = crd > 0 ? pts / crd : 0;
    const baseScore  = Math.round(gradeScore * 100) / 100;
    const finalScore = Math.round(baseScore * 10 * 100) / 100;

    return { finalScore, baseScore, gradeScore, pts, crd, selected, unselected };
}

function calcINUScore(student) {
    const subjects = student.subjects || [];
    const hum  = calcINUTypeScore(subjects, true,  false); // 인문: 사회(한국사 포함)
    const sci  = calcINUTypeScore(subjects, false, true);  // 자연: 과학
    const both = calcINUTypeScore(subjects, true,  true);  // 자유전공융합: 사회+과학

    const best = hum.finalScore >= sci.finalScore
        ? (hum.finalScore >= both.finalScore ? 'hum' : 'both')
        : (sci.finalScore >= both.finalScore ? 'sci' : 'both');
    const displayScore = Math.max(hum.finalScore, sci.finalScore, both.finalScore);

    return {
        finalScore: displayScore, displayScore,
        hum, sci, both, best,
        summary: `${displayScore.toFixed(2)} / 100`
    };
}

// ────────────────────────────────────────────────
// 인천대학교 - 학생부교과(교과성적우수자·지역균형·사회통합전형)
// ────────────────────────────────────────────────

function getINCHGradeScore(g) {
    if (g < 1.50) return 350;
    if (g < 2.00) return 349;
    if (g < 2.25) return 347;
    if (g < 2.50) return 345;
    if (g < 2.75) return 343;
    if (g < 3.00) return 341;
    if (g < 3.25) return 338;
    if (g < 3.50) return 335;
    if (g < 3.75) return 332;
    if (g < 4.00) return 329;
    if (g < 4.25) return 325;
    if (g < 4.50) return 321;
    if (g < 4.75) return 317;
    if (g < 5.00) return 313;
    if (g < 5.50) return 307;
    if (g < 6.00) return 300;
    if (g < 7.00) return 280;
    if (g < 8.00) return 250;
    return 200;
}

function calcINCHTypeScore(subjects, isHum) {
    const weights = isHum
        ? { korean: 0.30, math: 0.20, english: 0.30, social: 0.20, science: 0 }
        : { korean: 0.20, math: 0.30, english: 0.30, social: 0,    science: 0.20 };
    const targetKeys = isHum
        ? ['korean', 'math', 'english', 'social']
        : ['korean', 'math', 'english', 'science'];
    const gyogwa = {};
    for (const k of ['korean', 'math', 'english', 'social', 'science']) {
        gyogwa[k] = { pts: 0, crd: 0, bonusCrd: 0, items: [] };
    }
    const unselected = [];

    for (const s of subjects) {
        if (!s.credit || s.credit <= 0) continue;
        if (s.isExcluded) { unselected.push({ ...s, reason: '제외교과' }); continue; }

        let matched = null;
        if (s.isKorean) matched = 'korean';
        else if (s.isMath) matched = 'math';
        else if (s.isEnglish) matched = 'english';
        else if (s.isSocial || (s.category || '').includes('한국사')) matched = 'social';
        else if (s.isScience) matched = 'science';

        if (!matched || !targetKeys.includes(matched)) {
            unselected.push({ ...s, reason: matched ? '반영교과 외' : '해당없음' });
            continue;
        }

        const g = gyogwa[matched];
        if (s.rank > 0) {
            g.pts += s.rank * s.credit;
            g.crd += s.credit;
            g.bonusCrd += s.credit;
            g.items.push({ ...s, itemType: '공통/일반' });
        } else if (s.ach) {
            // 진로선택: 환산점수 계산 제외, 가산점 이수단위에만 포함
            g.bonusCrd += s.credit;
            g.items.push({ ...s, itemType: '진로선택(가산점)' });
        } else {
            unselected.push({ ...s, reason: '등급없음' });
        }
    }

    let totalScore = 0;
    let totalBonusCrd = 0;
    const gyogwaResults = {};

    for (const key of targetKeys) {
        const g = gyogwa[key];
        let avgGrade, convScore;
        if (g.crd === 0) {
            avgGrade = 9;
            convScore = 200;
        } else {
            avgGrade = g.pts / g.crd;
            convScore = getINCHGradeScore(avgGrade);
        }
        const weight = weights[key];
        const weighted = convScore * weight;
        totalScore += weighted;
        totalBonusCrd += g.bonusCrd;
        gyogwaResults[key] = {
            avgGrade, convScore, weight, weighted,
            crd: g.crd, bonusCrd: g.bonusCrd,
            items: g.items,
            noSubject: g.crd === 0
        };
    }

    const bonus = totalBonusCrd * 0.05;
    const finalScore = Math.round((totalScore + bonus) * 100) / 100;

    return {
        finalScore,
        totalScore: Math.round(totalScore * 100) / 100,
        bonus: Math.round(bonus * 100) / 100,
        totalBonusCrd, gyogwaResults, unselected, isHum
    };
}

function calcINCHScore(student) {
    const subjects = student.subjects || [];
    const hum = calcINCHTypeScore(subjects, true);
    const sci = calcINCHTypeScore(subjects, false);
    const best = hum.finalScore >= sci.finalScore ? 'hum' : 'sci';
    const displayScore = Math.max(hum.finalScore, sci.finalScore);
    return {
        finalScore: displayScore, displayScore,
        hum, sci, best,
        summary: `${displayScore.toFixed(2)} / 350`
    };
}

// ────────────────────────────────────────────────
// 경기대학교 - 학생부교과전형
// ────────────────────────────────────────────────
const KGU_RANK_SCORE = { 1:100, 2:99, 3:97, 4:95, 5:90, 6:85, 7:60, 8:20, 9:0 };
const KGU_ACH_SCORE  = { A:100, B:99, C:95 };

function calcKGUTypeScore(subjects, isHum) {
    const regular    = [];
    const career     = [];
    const unselected = [];

    for (const s of subjects) {
        if (!s.credit || s.credit <= 0) continue;
        if (s.isExcluded) { unselected.push({ ...s, reason: '제외교과' }); continue; }

        const isHanuksa       = (s.category || '').includes('한국사');
        const isSocAll        = s.isSocial || isHanuksa;
        const isTonghabSahoe  = (s.subject || '').includes('통합사회');
        const isTonghabGwahak = (s.subject || '').includes('통합과학');

        let included;
        if (s.isKorean || s.isMath || s.isEnglish) {
            included = true;
        } else if (isHum) {
            // 인문: 사회교과 전체 + 통합과학
            included = isSocAll || (s.isScience && isTonghabGwahak);
        } else {
            // 자연: 과학교과 전체 + 한국사 + 통합사회
            included = s.isScience || isHanuksa || (s.isSocial && isTonghabSahoe);
        }

        if (!included) { unselected.push({ ...s, reason: '반영교과 외' }); continue; }

        if (s.rank > 0) {
            const score = KGU_RANK_SCORE[s.rank] ?? 0;
            regular.push({ ...s, score });
        } else if (s.ach && KGU_ACH_SCORE[s.ach] !== undefined) {
            career.push({ ...s, score: KGU_ACH_SCORE[s.ach] });
        } else {
            unselected.push({ ...s, reason: '등급없음' });
        }
    }

    const regPts = regular.reduce((a, s) => a + s.score * s.credit, 0);
    const regCrd = regular.reduce((a, s) => a + s.credit, 0);
    const regAvg = regCrd > 0 ? regPts / regCrd : 0;

    const carPts = career.reduce((a, s) => a + s.score * s.credit, 0);
    const carCrd = career.reduce((a, s) => a + s.credit, 0);
    const carAvg = carCrd > 0 ? carPts / carCrd : regAvg;

    const finalScore = Math.round((regAvg * 0.81 + carAvg * 0.09) * 10000) / 10000;

    return {
        finalScore, regAvg, carAvg,
        regPts, regCrd, carPts, carCrd,
        regular, career, unselected, isHum,
        noCar: carCrd === 0
    };
}

function calcKGUScore(student) {
    const subjects = student.subjects || [];
    const hum = calcKGUTypeScore(subjects, true);
    const sci = calcKGUTypeScore(subjects, false);
    const best = hum.finalScore >= sci.finalScore ? 'hum' : 'sci';
    const displayScore = Math.max(hum.finalScore, sci.finalScore);
    return {
        finalScore: displayScore, displayScore,
        hum, sci, best,
        summary: `${displayScore.toFixed(2)} / 90`
    };
}

// ────────────────────────────────────────────────
// 전북대학교 - 학생부교과전형
// ────────────────────────────────────────────────
const JBNU_RANK_SCORE = { 1:9.80, 2:9.30, 3:8.80, 4:8.30, 5:7.80, 6:6.80, 7:4.60, 8:2.40, 9:0.20 };
const JBNU_ACH_SCORE  = { A:9.30, B:8.30, C:4.60 }; // A=2등급, B=4등급, C=7등급

function calcJBNUScore(student) {
    const subjects   = student.subjects || [];
    const regular    = [];
    const career     = [];
    const unselected = [];

    for (const s of subjects) {
        if (!s.credit || s.credit <= 0) continue;
        if (s.isExcluded) { unselected.push({ ...s, reason: '제외교과' }); continue; }

        const isHanuksa = (s.category || '').includes('한국사');
        // 반영교과: 국어·수학·영어·사회(역사·도덕 포함)·과학·한국사 (계열 구분 없음)
        const included = s.isKorean || s.isMath || s.isEnglish || s.isSocial || isHanuksa || s.isScience;

        if (!included) { unselected.push({ ...s, reason: '반영교과 외' }); continue; }

        if (s.rank > 0) {
            regular.push({ ...s, score: JBNU_RANK_SCORE[s.rank] ?? 0.20 });
        } else if (s.ach && JBNU_ACH_SCORE[s.ach] !== undefined) {
            career.push({ ...s, score: JBNU_ACH_SCORE[s.ach] });
        } else {
            unselected.push({ ...s, reason: '등급없음' });
        }
    }

    const regPts = regular.reduce((a, s) => a + s.score * s.credit, 0);
    const regCrd = regular.reduce((a, s) => a + s.credit, 0);
    const regAvg = regCrd > 0 ? regPts / regCrd : 0;

    const carPts = career.reduce((a, s) => a + s.score * s.credit, 0);
    const carCrd = career.reduce((a, s) => a + s.credit, 0);
    const carAvg = carCrd > 0 ? carPts / carCrd : 0;

    const totalAvg = carCrd > 0 ? regAvg * 0.9 + carAvg * 0.1 : regAvg;
    const finalScore = Math.round((930 + 70 * totalAvg / 9.8) * 100) / 100;

    return {
        finalScore, displayScore: finalScore,
        regAvg, carAvg, totalAvg,
        regPts, regCrd, carPts, carCrd,
        regular, career, unselected,
        noCar: carCrd === 0,
        summary: `${finalScore.toFixed(2)} / 1000`
    };
}

// ────────────────────────────────────────────────
// 전남대학교 - 학생부교과전형(일괄선발)
// ────────────────────────────────────────────────
const CNNU_RANK_SCORE = { 1:100, 2:95, 3:90, 4:85, 5:80, 6:75, 7:70, 8:65, 9:0 };
const CNNU_ACH_SCORE  = { A:15, B:9, C:3 };

function calcCNNUScore(student) {
    const subjects   = student.subjects || [];
    const regular    = [];
    const career     = [];
    const unselected = [];

    for (const s of subjects) {
        if (!s.credit || s.credit <= 0) continue;
        if (s.isExcluded) { unselected.push({ ...s, reason: '제외교과' }); continue; }

        const isHanuksa = (s.category || '').includes('한국사');
        // 반영교과: 국어·수학·영어·한국사·사회·과학 (계열 구분 없음)
        const included = s.isKorean || s.isMath || s.isEnglish || s.isSocial || isHanuksa || s.isScience;

        if (!included) { unselected.push({ ...s, reason: '반영교과 외' }); continue; }

        if (s.rank > 0) {
            regular.push({ ...s, score: CNNU_RANK_SCORE[s.rank] ?? 0 });
        } else if (s.ach && CNNU_ACH_SCORE[s.ach] !== undefined) {
            career.push({ ...s, score: CNNU_ACH_SCORE[s.ach] });
        } else {
            unselected.push({ ...s, reason: '등급없음' });
        }
    }

    const regPts = regular.reduce((a, s) => a + s.score * s.credit, 0);
    const regCrd = regular.reduce((a, s) => a + s.credit, 0);
    const regAvg = regCrd > 0 ? regPts / regCrd : 0;
    // 석차등급 실질점수 (max 225)
    const regScore = Math.round(regAvg * 2.25 * 1000) / 1000;

    // 진로선택 상위 3개 (점수 높은 순 → 이수단위 큰 순)
    const sortedCareer = [...career].sort((a, b) => b.score - a.score || b.credit - a.credit);
    const top3 = sortedCareer.slice(0, 3);
    const carRest = sortedCareer.slice(3);

    let carScore, useBigo;
    if (top3.length >= 3) {
        carScore = Math.round(top3.reduce((a, s) => a + s.score, 0) / 3 * 1000) / 1000;
        useBigo = false;
    } else {
        // 3개 미만 → 비교내신: 석차등급 실질점수 × 0.06666
        carScore = Math.round(regScore * 0.06666 * 1000) / 1000;
        useBigo = true;
    }

    // 기본점수 660 + 실질점수 + 진로선택
    const finalScore = Math.round((660 + regScore + carScore) * 100) / 100;

    return {
        finalScore, displayScore: finalScore,
        regAvg, regScore, carScore, useBigo,
        regPts, regCrd, top3, carRest, regular, career, unselected,
        summary: `${finalScore.toFixed(2)} / 900`
    };
}

// ────────────────────────────────────────────────
// 경북대학교 - 학생부교과(교과우수자전형)
// ────────────────────────────────────────────────
const KNU_RANK_SCORE = { 1:400, 2:390, 3:380, 4:370, 5:360, 6:350, 7:300, 8:200, 9:0 };

function calcKNUScore(student) {
    const subjects   = student.subjects || [];
    const regular    = [];
    const career     = [];
    const unselected = [];

    for (const s of subjects) {
        if (!s.credit || s.credit <= 0) continue;
        if (s.isExcluded) { unselected.push({ ...s, reason: '제외교과' }); continue; }

        const isHanuksa = (s.category || '').includes('한국사');
        const included = s.isKorean || s.isMath || s.isEnglish || s.isSocial || isHanuksa || s.isScience;

        if (!included) { unselected.push({ ...s, reason: '반영교과 외' }); continue; }

        if (s.rank > 0) {
            // 공통/일반선택
            const score = KNU_RANK_SCORE[s.rank] ?? 0;
            regular.push({ subject: s.subject, category: s.category, rank: s.rank, credit: s.credit, score });
        } else if (s.ach && ['A','B','C'].includes(s.ach.toUpperCase())) {
            // 진로선택 — 교과 점수 산출에서 제외, 서류평가 반영
            career.push({ subject: s.subject, category: s.category, ach: s.ach.toUpperCase(), credit: s.credit });
        }
    }

    const regCrd = regular.reduce((a, s) => a + s.credit, 0);
    const regPts = regular.reduce((a, s) => a + s.score * s.credit, 0);

    if (regCrd === 0) {
        return { finalScore: 0, displayScore: 0, regular: [], career, unselected, regCrd: 0, summary: '0.00 / 400' };
    }

    const regAvg = regPts / regCrd;
    const finalScore = Math.round(regAvg * 100) / 100;

    return {
        finalScore, displayScore: finalScore,
        regAvg, regPts, regCrd,
        regular, career, unselected,
        summary: `${finalScore.toFixed(2)} / 400`
    };
}

// ────────────────────────────────────────────────
// 충북대학교 - 학생부교과전형
// ────────────────────────────────────────────────
const CBNU_RANK_SCORE = { 1:10, 2:9.5, 3:9, 4:8.5, 5:8, 6:7.5, 7:7, 8:4, 9:0 };

function getCBNURankFromCumulative(cumPct) {
    // 하위 누적비율(B+C 또는 C)로 석차등급 환산
    if (cumPct > 96.0) return 1;
    if (cumPct > 89.0) return 2;
    if (cumPct > 77.0) return 3;
    if (cumPct > 60.0) return 4;
    if (cumPct > 40.0) return 5;
    if (cumPct > 23.0) return 6;
    if (cumPct > 11.0) return 7;
    if (cumPct > 4.0)  return 8;
    return 9;
}

function calcCBNUScore(student) {
    const subjects   = student.subjects || [];
    const regular    = [];
    const career     = [];
    const unselected = [];

    for (const s of subjects) {
        if (!s.credit || s.credit <= 0) continue;
        if (s.isExcluded) { unselected.push({ ...s, reason: '제외교과' }); continue; }

        const isHanuksa = (s.category || '').includes('한국사');
        // 반영교과: 국어·수학·영어·사회·과학 (한국사는 사회교과로 isSocial 포함)
        const included = s.isKorean || s.isMath || s.isEnglish || s.isSocial || isHanuksa || s.isScience;

        if (!included) { unselected.push({ ...s, reason: '반영교과 외' }); continue; }

        if (s.rank > 0) {
            const score = CBNU_RANK_SCORE[s.rank] ?? 0;
            regular.push({ subject: s.subject, category: s.category, rank: s.rank, credit: s.credit, score });
        } else if (s.ach && ['A','B','C'].includes(s.ach.toUpperCase())) {
            const ach = s.ach.toUpperCase();
            const bRatio = s.bRatio ?? 0;
            const cRatio = s.cRatio ?? 0;
            let convertedRank, convertNote;

            if (ach === 'A') {
                convertedRank = 1;
                convertNote = 'A → 1등급';
            } else if (ach === 'B') {
                if (s.bRatio !== undefined && s.cRatio !== undefined) {
                    const cumPct = bRatio + cRatio;
                    convertedRank = getCBNURankFromCumulative(cumPct);
                    convertNote = `B → 누적비율 ${cumPct.toFixed(1)}% → ${convertedRank}등급`;
                } else {
                    convertedRank = 4;
                    convertNote = 'B → 비율미입력 → 4등급(기본값)';
                }
            } else {
                if (s.cRatio !== undefined) {
                    const cumPct = cRatio;
                    convertedRank = getCBNURankFromCumulative(cumPct);
                    convertNote = `C → 누적비율 ${cumPct.toFixed(1)}% → ${convertedRank}등급`;
                } else {
                    convertedRank = 7;
                    convertNote = 'C → 비율미입력 → 7등급(기본값)';
                }
            }
            const score = CBNU_RANK_SCORE[convertedRank] ?? 0;
            career.push({ subject: s.subject, category: s.category, ach, credit: s.credit, convertedRank, score, convertNote });
        }
    }

    const allSubjs = [...regular, ...career];
    const totalCrd = allSubjs.reduce((a, s) => a + s.credit, 0);
    const totalPts = allSubjs.reduce((a, s) => a + s.score * s.credit, 0);

    if (totalCrd === 0) {
        return { finalScore: 40, displayScore: 40, regular: [], career: [], unselected, totalCrd: 0, avgScore: 0, summary: '40.00 / 80' };
    }

    const avgScore = totalPts / totalCrd;
    const finalScore = Math.round((avgScore * 4.0 + 40) * 100) / 100;

    return {
        finalScore, displayScore: finalScore,
        avgScore, totalCrd, totalPts,
        regular, career, unselected,
        summary: `${finalScore.toFixed(2)} / 80`
    };
}

// ────────────────────────────────────────────────
// 충남대학교 - 학생부교과(일반전형)
// ────────────────────────────────────────────────
const CNU_RANK_SCORE = { 1:100, 2:90, 3:80, 4:70, 5:60, 6:50, 7:40, 8:30, 9:20 };

function calcCNUScore(student) {
    const subjects   = student.subjects || [];
    const regular    = [];
    const career     = [];
    const unselected = [];

    for (const s of subjects) {
        if (!s.credit || s.credit <= 0) continue;

        const cat = s.category || '';
        const isHanuksa = cat.includes('한국사');
        // isExcluded 중 기술·가정·제2외국어·한문은 충남대 반영 교과
        const isGiGa   = !!s.isExcluded && (cat.includes('기술') || cat.includes('가정'));
        const isWiguk  = !!s.isExcluded && cat.includes('외국어') && !cat.includes('영어');
        const isHanmun = !!s.isExcluded && (cat.includes('한문') || (s.subject || '').includes('한문'));

        // 반영교과: 국어·수학·영어·한국사·사회·과학·기술가정·제2외국어·한문
        // 체육·예술·교양·정보 제외 (플래그 없거나 isExcluded+교양/정보)
        const included = s.isKorean || s.isMath || s.isEnglish
            || s.isSocial || isHanuksa || s.isScience
            || isGiGa || isWiguk || isHanmun;

        if (!included) { unselected.push({ ...s, reason: '반영교과 외' }); continue; }

        if (s.rank > 0) {
            const score = CNU_RANK_SCORE[s.rank] ?? 20;
            regular.push({ subject: s.subject, category: s.category, rank: s.rank, credit: s.credit, score });
        } else if (s.ach && ['A','B','C'].includes(s.ach.toUpperCase())) {
            const ach = s.ach.toUpperCase();
            const bRatio = s.bRatio ?? 0;
            const cRatio = s.cRatio ?? 0;
            let convertedRank, convertNote;

            if (ach === 'A') {
                convertedRank = 1;
                convertNote = 'A → 1등급';
            } else if (ach === 'B') {
                if (s.bRatio !== undefined && s.cRatio !== undefined) {
                    const cumPct = bRatio + cRatio;
                    convertedRank = getCBNURankFromCumulative(cumPct);
                    convertNote = `B → 누적비율 ${cumPct.toFixed(1)}% → ${convertedRank}등급`;
                } else {
                    convertedRank = 4;
                    convertNote = 'B → 비율미입력 → 4등급(기본값)';
                }
            } else {
                if (s.cRatio !== undefined) {
                    const cumPct = cRatio;
                    convertedRank = getCBNURankFromCumulative(cumPct);
                    convertNote = `C → 누적비율 ${cumPct.toFixed(1)}% → ${convertedRank}등급`;
                } else {
                    convertedRank = 7;
                    convertNote = 'C → 비율미입력 → 7등급(기본값)';
                }
            }
            const score = CNU_RANK_SCORE[convertedRank] ?? 20;
            career.push({ subject: s.subject, category: s.category, ach, credit: s.credit, convertedRank, score, convertNote });
        }
    }

    const allSubjs = [...regular, ...career];
    const totalCrd = allSubjs.reduce((a, s) => a + s.credit, 0);
    const totalPts = allSubjs.reduce((a, s) => a + s.score * s.credit, 0);

    if (totalCrd === 0) {
        return { finalScore: 0, displayScore: 0, regular: [], career: [], unselected, totalCrd: 0, summary: '0.00 / 100' };
    }

    const finalScore = Math.round(totalPts / totalCrd * 100) / 100;

    return {
        finalScore, displayScore: finalScore,
        totalCrd, totalPts,
        regular, career, unselected,
        summary: `${finalScore.toFixed(2)} / 100`
    };
}

// ────────────────────────────────────────────────
// 경상국립대학교 - 학생부교과(일반전형)
// ────────────────────────────────────────────────
const GNU_RANK_SCORE = { 1:150, 2:135, 3:120, 4:105, 5:90, 6:75, 7:60, 8:40, 9:0 };
const GNU_ACH_SCORE  = { A:0.5, B:0.3, C:0.1 };

function calcGNUScore(student) {
    const subjects   = student.subjects || [];
    const regular    = [];
    const careerBySubj = { korean:[], math:[], english:[], social:[], science:[] };
    const unselected = [];

    for (const s of subjects) {
        if (!s.credit || s.credit <= 0) continue;
        if (s.isExcluded) { unselected.push({ ...s, reason: '제외교과' }); continue; }

        const isHanuksa = (s.category || '').includes('한국사');
        const included = s.isKorean || s.isMath || s.isEnglish || s.isSocial || isHanuksa || s.isScience;

        if (!included) { unselected.push({ ...s, reason: '반영교과 외' }); continue; }

        if (s.rank > 0) {
            const score = GNU_RANK_SCORE[s.rank] ?? 0;
            regular.push({ subject: s.subject, category: s.category, rank: s.rank, credit: s.credit, score });
        } else if (s.ach && ['A','B','C'].includes(s.ach.toUpperCase())) {
            const ach = s.ach.toUpperCase();
            const achScore = GNU_ACH_SCORE[ach] ?? 0;
            const item = { subject: s.subject, category: s.category, ach, achScore };
            if      (s.isKorean)              careerBySubj.korean.push(item);
            else if (s.isMath)                careerBySubj.math.push(item);
            else if (s.isEnglish)             careerBySubj.english.push(item);
            else if (s.isSocial || isHanuksa) careerBySubj.social.push(item);
            else if (s.isScience)             careerBySubj.science.push(item);
        }
    }

    // 일반교과 이수단위 가중평균
    const regCrd = regular.reduce((a, s) => a + s.credit, 0);
    const regPts = regular.reduce((a, s) => a + s.score * s.credit, 0);
    const regAvg = regCrd > 0 ? regPts / regCrd : 0;
    const regScore = 850 + regAvg;

    // 진로선택 가산점: 교과별 상위3 합÷3, 5교과 합÷5
    const subjKeys = ['korean','math','english','social','science'];
    const careerDetail = {};
    let careerTotal = 0;
    for (const key of subjKeys) {
        const sorted = [...careerBySubj[key]].sort((a, b) => b.achScore - a.achScore);
        const top3   = sorted.slice(0, 3);
        const sum    = top3.reduce((a, c) => a + c.achScore, 0);
        const bonus  = sum / 3;
        careerDetail[key] = { top3, rest: sorted.slice(3), sum, bonus };
        careerTotal += bonus;
    }
    const careerScore = careerTotal / 5;
    const finalScore  = Math.round((regScore + careerScore) * 100) / 100;

    return {
        finalScore, displayScore: finalScore,
        regAvg, regCrd, regPts, regScore, careerScore, careerDetail,
        regular, careerBySubj, unselected,
        summary: `${finalScore.toFixed(2)} / 1000`
    };
}

// ────────────────────────────────────────────────
// 대학 목록
// ────────────────────────────────────────────────

const UNIVS = {
    korea: {
        name: '고려대학교',
        label: '학생부교과 학교추천전형',
        maxScore: 90,
        scoreLabel: '최종반영점수',
        scoreUnit: '/ 90',
        scoreColor: '#fbbf24',
        calc: calcKoreaScore,
        infoHTML: `
            <strong style="color:#93c5fd;">📌 고려대학교 학생부교과 학교추천전형 교과 점수 산출 기준</strong><br>
            • 반영 과목: 1~3학년 1학기 전 과목 (5학기, 교과군 구분 없음)<br>
            • 교과평균등급 = Σ(등급 × 이수단위) ÷ Σ이수단위<br>
            • 등급별 점수: <span style="color:#e2e8f0;">1=100 · 2=96 · 3=92 · 4=86 · 5=70 · 6=55 · 7=40 · 8=20 · 9=0</span><br>
            • 최종반영점수 = 교과평균등급점수 × 0.9 &nbsp;<span style="color:#94a3b8;">(90점 만점, 서류 10점 별도)</span><br>
            • 12명 이하 소인수 과목 조정등급 자동 적용 · 성취도(A/B/C) 분포비율 미입력 시 A:30% B:40% C:30% 기본값 적용
        `
    },
    yonsei: {
        name: '연세대학교',
        label: '학생부교과 추천형',
        maxScore: 100,
        scoreLabel: '최종 교과 점수',
        scoreUnit: '/ 100',
        scoreColor: '#34d399',
        calc: calcYonseiScore,
        infoHTML: `
            <strong style="color:#93c5fd;">📌 연세대학교 학생부교과 추천형 교과 점수 산출 기준</strong><br>
            • 반영과목 A (국어·수학·영어·사회·과학): 공통과목 30% + 일반선택 50% + 진로선택 20% → 100점 만점<br>
            • 공통·일반선택 과목점수 = (등급점수 × 0.5) + (Z점수환산점수 × 0.5)<br>
            &nbsp;&nbsp;등급점수: <span style="color:#e2e8f0;">1=100 · 2=95 · 3=87.5 · 4=75 · 5=60 · 6=40 · 7=25 · 8=12.5 · 9=5</span><br>
            &nbsp;&nbsp;Z점수환산점수 = 100 × normalCDF(Z), Z = (원점수-평균)÷표준편차, 등급별 유효 범위 내로 보정<br>
            • 진로선택 성취도 점수: A=20 · B=15 · C=10<br>
            • 반영과목 B (기타 교과) 감점: 9등급 또는 C 해당 과목 이수단위 ÷ B군 전체 이수단위 × 5점<br>
            • 최종 점수 = 반영과목 A 점수 - 반영과목 B 감점 &nbsp;<span style="color:#94a3b8;">(원점수/평균/표준편차 미입력 시 등급점수만으로 계산)</span>
        `
    },
    sogang: {
        name: '서강대학교',
        label: '학생부교과 지역균형전형',
        maxScore: 1000,
        scoreLabel: '교과 점수',
        scoreUnit: '/ 1000',
        scoreColor: '#fb923c',
        calc: calcSogangScore,
        infoHTML: `
            <strong style="color:#93c5fd;">📌 서강대학교 학생부교과 지역균형전형 교과 점수 산출 기준</strong><br>
            • 전 과목 반영 (학년·학기 가중치 없음, 3학년 1학기까지)<br>
            • <strong style="color:#fb923c;">등급계산 900점</strong>: 등급평균 = Σ(석차등급 × 이수단위) ÷ Σ이수단위 → 최종 = (10 − 등급평균) × 100<br>
            • <strong style="color:#a78bfa;">비율계산 100점</strong>: 성취도(A/B/C) 과목 → 환산성취비율 합산 ÷ 2 (최대 100점)<br>
            &nbsp;&nbsp;환산성취비율 = 취득성취도 비율 ÷ 2 + 하단 성취도 비율 합계<br>
            &nbsp;&nbsp;<span style="color:#94a3b8;">분포비율 데이터가 없는 과학탐구실험 등 성취도 과목은 비율계산에서 제외</span><br>
            • 총점 = 등급계산 + 비율계산 (1,000점 만점)
        `
    },
    sungkyunkwan: {
        name: '성균관대학교',
        label: '학생부교과 추천인재전형',
        maxScore: 800,
        scoreLabel: '정량 교과 점수',
        scoreUnit: '/ 800',
        scoreColor: '#f472b6',
        calc: calcSungkyunkwanScore,
        infoHTML: `
            <strong style="color:#93c5fd;">📌 성균관대학교 학생부교과 추천인재전형 교과 점수 산출 기준</strong><br>
            • <strong style="color:#f472b6;">A군 700점</strong>: 국어·수학·영어·한국사·사회·과학 교과, 공통+일반선택과목만 반영<br>
            &nbsp;&nbsp;등급점수: <span style="color:#e2e8f0;">1=100 · 2=96 · 3=90 · 4=80 · 5=65 · 6=45 · 7=20 · 8=10 · 9=0</span> → 이수단위 가중평균 × 7<br>
            • <strong style="color:#a78bfa;">B군 100점</strong>: 기술·가정·제2외국어·한문 교과, 공통+일반선택과목만 반영<br>
            &nbsp;&nbsp;등급점수: <span style="color:#e2e8f0;">1=100 · 2=98 · 3=95 · 4=90 · 5=80 · 6=50 · 7=30 · 8=10 · 9=0</span> → 이수단위 가중평균 × 1<br>
            &nbsp;&nbsp;<span style="color:#94a3b8;">B군 과목을 이수하지 않은 경우 B군 점수 0점 처리</span><br>
            • 진로선택·성취도(A/B/C) 과목은 정량평가 제외 (정성평가 200점에서 반영)<br>
            • 총점 = A군 + B군 (800점, 정성평가 200점 별도)
        `
    },
    cau: {
        name: '중앙대학교',
        label: '학생부교과 지역균형',
        maxScore: 900,
        scoreLabel: '교과 점수',
        scoreUnit: '/ 900',
        scoreColor: '#4ade80',
        calc: calcCAUScore,
        infoHTML: `
            <strong style="color:#93c5fd;">📌 중앙대학교 학생부교과 지역균형 교과 점수 산출 기준</strong><br>
            • 반영교과: 국어·수학·영어·사회·과학 전 과목<br>
            • <strong style="color:#60a5fa;">공통/일반선택 90%</strong>: 환산점수 이수단위 가중평균 × 0.9<br>
            &nbsp;&nbsp;환산점수: <span style="color:#e2e8f0;">1=10.0 · 2=9.71 · 3=9.43 · 4=9.14 · 5=8.86 · 6=8.57 · 7=8.00 · 8=6.57 · 9=3.40</span><br>
            • <strong style="color:#a78bfa;">진로선택 10%</strong>: 성취도 환산점수 단순평균(과목 수 기준) × 0.1<br>
            &nbsp;&nbsp;성취도 환산점수: <span style="color:#e2e8f0;">A=10.0 · B=9.43 · C=8.86</span><br>
            • 최종 교과점수 = (공통/일반×0.9 + 진로선택×0.1) × 90 <span style="color:#94a3b8;">(900점 만점)</span><br>
            • 비교과(출결) 100점 + 교과 900점 = 1,000점 만점 기준
        `
    },
    hanyang: {
        name: '한양대학교',
        label: '학생부교과 추천형',
        maxScore: 100,
        scoreLabel: '교과성적',
        scoreUnit: '/ 100',
        scoreColor: '#60a5fa',
        calc: calcHanyangScore,
        infoHTML: `
            <strong style="color:#93c5fd;">📌 한양대학교 학생부교과 추천형 교과 점수 산출 기준</strong><br>
            • 반영교과: 국어·영어·수학·사회·과학·한국사 (역사·도덕 포함)<br>
            • 반영과목: 석차등급이 기재된 모든 공통·일반선택과목<br>
            • 진로선택과목(성취도만 기재) 미반영<br>
            • 등급점수: <span style="color:#e2e8f0;">1=100 · 2=96 · 3=89 · 4=77 · 5=60 · 6=40 · 7=23 · 8=11 · 9=0</span><br>
            • 교과성적 = Σ(등급점수 × 이수단위) ÷ Σ이수단위 <span style="color:#94a3b8;">(100점 만점)</span><br>
            • 최종 전형점수: 교과 90점 + 교과 정성평가 10점 <span style="color:#94a3b8;">(정성평가는 본 산출에서 제외)</span>
        `
    },
    khu: {
        name: '경희대학교',
        label: '학생부교과 지역균형전형',
        maxScore: 100,
        scoreLabel: '교과성적(A)',
        scoreUnit: '/ 100',
        scoreColor: '#f97316',
        calc: calcKHUScore,
        infoHTML: `
            <strong style="color:#93c5fd;">📌 경희대학교 학생부교과 지역균형전형 교과 점수 산출 기준</strong><br>
            • <strong style="color:#60a5fa;">공통/일반선택 80%</strong>: 국어·영어·수학·사회·과학·한국사 전 과목, 이수단위 가중평균 × 0.8<br>
            &nbsp;&nbsp;등급점수: <span style="color:#e2e8f0;">1=100 · 2=96 · 3=89 · 4=77 · 5=60 · 6=40 · 7=23 · 8=11 · 9=0</span><br>
            • <strong style="color:#a78bfa;">진로선택 20%</strong>: 국어·영어·수학·사회·과학 교과 중 <strong>상위 3개 과목</strong> 이수단위 가중평균 × 0.2<br>
            &nbsp;&nbsp;성취도 점수: <span style="color:#e2e8f0;">A=100 · B=80 · C=60</span> (상위 3과목: 성취도점수 내림차순 → 이수단위 내림차순)<br>
            • 교과성적(A) = 공통/일반 점수 + 진로선택 점수 <span style="color:#94a3b8;">(100점 만점)</span><br>
            • 실제 반영: A × 5.6 = 560점 <span style="color:#94a3b8;">(비교과 출결·봉사 140점 별도, 총 700점)</span>
        `
    },
    uos: {
        name: '서울시립대학교',
        label: '학생부(교과) 고교추천전형',
        maxScore: 800,
        scoreLabel: '교과 점수',
        scoreUnit: '/ 800',
        scoreColor: '#818cf8',
        calc: calcUOSScore,
        infoHTML: `
            <strong style="color:#93c5fd;">📌 서울시립대학교 고교추천전형 교과 점수 산출 기준</strong><br>
            • <strong style="color:#818cf8;">반영교과</strong>: 공통/일반선택 및 진로선택 <strong>전교과 전부</strong> (교과군 제한 없음)<br>
            • <strong style="color:#60a5fa;">공통/일반선택 (×7)</strong>: 이수단위 가중평균 × 7<br>
            &nbsp;&nbsp;등급환산: <span style="color:#e2e8f0;">1=100 · 2=98 · 3=95 · 4=86 · 5=71 · 6=50 · 7=30 · 8=15 · 9=0</span><br>
            • <strong style="color:#a78bfa;">진로선택 (×1)</strong>: 이수단위 가중평균 × 1<br>
            &nbsp;&nbsp;성취도환산: <span style="color:#e2e8f0;">A=100 · B=97 · C=90</span><br>
            • 교과 점수 = 공통/일반 가중평균 × 7 + 진로선택 가중평균 × 1 <span style="color:#94a3b8;">(800점 만점)</span><br>
            &nbsp;&nbsp;<span style="color:#64748b;">진로선택 없는 경우: 공통/일반 가중평균 × 8</span><br>
            • 소수점 7자리 유지 (8째 자리에서 반올림)<br>
            • 교과 정성평가 200점 별도 (본 산출에서 제외)
        `
    },
    hgu: {
        name: '홍익대학교',
        label: '학교장추천자전형',
        maxScore: 100,
        scoreLabel: '교과 점수',
        scoreUnit: '/ 100',
        scoreColor: '#f43f5e',
        calc: calcHGUScore,
        infoHTML: `
            <strong style="color:#93c5fd;">📌 홍익대학교 학교장추천자전형 교과 점수 산출 기준</strong><br>
            • <strong style="color:#f43f5e;">반영교과</strong>: <strong>인문계열</strong> — 국어·수학·영어·사회(역사/도덕포함) / <strong>자연계열</strong> — 국어·수학·영어·과학<br>
            • <strong style="color:#60a5fa;">공통/일반선택</strong>: 이수학점 가중평균 × 0.9 / 등급: <span style="color:#e2e8f0;">1=100·2=96·3=89·4=77·5=60·6=40·7=23·8=11·9=0</span><br>
            • <strong style="color:#a78bfa;">진로선택</strong>: 이수학점 가중평균 / 성취도: <span style="color:#e2e8f0;">A=10·B=9·C=7</span> (없으면 공통가중평균 × 0.09 대체)<br>
            • 교과점수 = <strong>(공통가중평균 × 0.9 + 진로선택가중평균) × (min(총이수학점,100) / 1000 + 0.9)</strong><br>
            &nbsp;&nbsp;<span style="color:#94a3b8;">최대점수(모두 1등급+A, 100이수단위): (100×0.9+10)×1.0 = 100점</span><br>
            • 인문/자연 각각 계산 — 높은 값을 대표 점수로 표시
        `
    },
    dgu: {
        name: '동국대학교',
        label: '학생부교과 학교장추천인재',
        maxScore: 700,
        scoreLabel: '교과 점수',
        scoreUnit: '/ 700',
        scoreColor: '#fb923c',
        calc: calcDGUScore,
        infoHTML: `
            <strong style="color:#93c5fd;">📌 동국대학교 학교장추천인재전형 교과 점수 산출 기준</strong><br>
            • <strong style="color:#fb923c;">반영교과</strong>: <strong>인문계열</strong> — 국어·수학·영어·사회(역사/도덕포함)·한국사 / <strong>자연계열</strong> — 국어·수학·영어·과학·한국사<br>
            • <strong style="color:#fbbf24;">상위 10과목</strong> 선택 (이수단위 미적용, 단순 평균 / 진로선택 중 석차등급 있으면 포함)<br>
            &nbsp;&nbsp;등급환산: <span style="color:#e2e8f0;">1=10 · 2=9.99 · 3=9.95 · 4=9.9 · 5=9.0 · 6=8.0 · 7=5.0 · 8=3.0 · 9=0</span><br>
            • 교과 점수 = (상위10과목 합 ÷ 10) ÷ 10 × 700 <span style="color:#94a3b8;">(700점 만점)</span><br>
            • 인문/자연 각각 계산 — <strong>높은 값</strong>을 대표 점수로 표시<br>
            • 서류평가 300점 별도 (본 산출에서 제외)
        `
    },
    kku: {
        name: '건국대학교',
        label: '학생부교과(KU지역균형)',
        maxScore: 700,
        scoreLabel: '교과정량',
        scoreUnit: '/ 700',
        scoreColor: '#4ade80',
        calc: calcKKUScore,
        infoHTML: `
            <strong style="color:#93c5fd;">📌 건국대학교 KU지역균형 교과정량 산출 기준</strong><br>
            • <strong style="color:#4ade80;">반영교과</strong>: 국어·수학·영어·사회(역사/도덕 포함)·과학·한국사 전 과목<br>
            • <strong style="color:#60a5fa;">공통/일반선택만 반영</strong>: 진로선택과목(A/B/C)은 교과정량 <strong>완전 제외</strong>, 교과정성(300점)으로만 반영<br>
            &nbsp;&nbsp;등급환산: <span style="color:#e2e8f0;">1=10 · 2=9.97 · 3=9.94 · 4=9.90 · 5=9.86 · 6=9.80 · 7=8 · 8=6 · 9=0</span><br>
            • 교과정량 = 이수단위 가중평균(10점 만점) × 70 <span style="color:#94a3b8;">(700점 만점)</span><br>
            • 소수점 3자리 유지 (4째 자리에서 반올림)<br>
            • 교과정성(300점) 별도 (본 산출에서 제외)
        `
    },
    hufs: {
        name: '한국외국어대학교',
        label: '학생부교과 학교장추천전형',
        maxScore: 1000,
        scoreLabel: '교과 점수',
        scoreUnit: '/ 1000',
        scoreColor: '#06b6d4',
        calc: calcHUFSScore,
        infoHTML: `
            <strong style="color:#93c5fd;">📌 한국외국어대학교 학교장추천전형 교과 점수 산출 기준</strong><br>
            • <strong style="color:#67e8f9;">반영교과</strong>: 국어·수학·영어·사회(역사/도덕 포함)·과학·한국사 전 과목<br>
            • <strong style="color:#60a5fa;">공통/일반선택</strong>: <strong>max(등급환산점수, 원점수환산점수)</strong> × 이수단위<br>
            &nbsp;&nbsp;등급환산: <span style="color:#e2e8f0;">1=1000 · 2=960 · 3=890 · 4=770 · 5=600 · 6=400 · 7=230 · 8=110 · 9=0</span><br>
            &nbsp;&nbsp;원점수환산(국어/영어/사회/과학/한국사): <span style="color:#e2e8f0;">≥90→1000 · ≥85→960 · ≥80→890 · ≥75→770 · ≥70→600 · ≥60→400 · ≥50→230 · ≥40→110 · 미만→0</span><br>
            &nbsp;&nbsp;원점수환산(수학): <span style="color:#e2e8f0;">≥90→1000 · ≥80→960 · ≥70→890 · ≥60→770 · ≥50→600 · ≥40→400 · ≥30→230 · ≥20→110 · 미만→0</span><br>
            • <strong style="color:#a78bfa;">진로선택</strong>: 성취도 <span style="color:#e2e8f0;">A=1000 · B=960 · C=890</span> × 이수단위<br>
            • 교과 점수 = Σ(이수단위 × 과목점수) ÷ 총 이수단위 <span style="color:#94a3b8;">(1000점 만점, 소수점 6자리 미만 절사)</span>
        `
    },
    dku: {
        name: '단국대학교(죽전)',
        label: '학생부교과 지역균형선발전형',
        maxScore: 95,
        scoreLabel: '교과 점수',
        scoreUnit: '/ 95',
        scoreColor: '#f97316',
        calc: calcDKUScore,
        infoHTML: `
            <strong style="color:#93c5fd;">📌 단국대학교(죽전) 지역균형선발전형 교과 점수 산출 기준</strong><br>
            • <strong style="color:#f97316;">반영교과</strong>: 국어·영어·수학·사회(한국사 포함)·과학 전 과목 (계열 구분 없음)<br>
            • 진로선택 성취도 변환: <span style="color:#e2e8f0;">A → 1등급 · B → 3등급 · C → 5등급</span><br>
            • <strong style="color:#60a5fa;">등급점수</strong>: <span style="color:#e2e8f0;">1=100 · 2=99 · 3=98 · 4=97 · 5=96 · 6=95 · 7=70 · 8=40 · 9=0</span><br>
            • 교과 점수 = Σ(등급점수×이수단위) ÷ Σ이수단위 × 0.95 <span style="color:#94a3b8;">(95점 만점, 소수점 4번째 자리 반올림)</span>
        `
    },
    mju: {
        name: '명지대학교',
        label: '학생부교과 학교장추천전형',
        maxScore: 1000,
        scoreLabel: '교과 점수',
        scoreUnit: '/ ~1000',
        scoreColor: '#8b5cf6',
        calc: calcMJUScore,
        infoHTML: `
            <strong style="color:#93c5fd;">📌 명지대학교 학생부교과 학교장추천전형 교과 점수 산출 기준</strong><br>
            • <strong style="color:#8b5cf6;">반영교과</strong>: 인문사회계열 — 국어·수학·영어·사회(한국사 포함) / 자연공학계열 — 국어·수학·영어·과학 / 예체능계열 — 국어·영어<br>
            • 진로선택 성취도 변환: <span style="color:#e2e8f0;">A → 1등급(100) · B → 2등급(99) · C → 4등급(94)</span><br>
            • <strong style="color:#60a5fa;">등급점수</strong>: <span style="color:#e2e8f0;">1=100 · 2=99 · 3=98 · 4=94 · 5=90 · 6=80 · 7=60 · 8=30 · 9=0</span><br>
            • 교과 성적 = [Σ(등급점수×이수단위) + 이수단위합×0.05] ÷ Σ이수단위 <span style="color:#94a3b8;">(소수점 4번째 반올림)</span><br>
            • 최종 점수 = 교과 성적 × 10 <span style="color:#94a3b8;">(이수단위 가산점으로 1000점 초과 가능)</span><br>
            • 3개 계열 각각 계산 — 가장 높은 점수를 대표 점수로 표시
        `
    },
    kwu: {
        name: '광운대학교',
        label: '학생부교과 지역균형전형',
        maxScore: 1000,
        scoreLabel: '교과 점수',
        scoreUnit: '/ 1000',
        scoreColor: '#06b6d4',
        calc: calcKWUScore,
        infoHTML: `
            <strong style="color:#93c5fd;">📌 광운대학교 학생부교과 지역균형전형 교과 점수 산출 기준</strong><br>
            • <strong style="color:#06b6d4;">반영교과</strong>: 국어·영어·수학·사회(한국사 포함)·과학 전 과목 (과학탐구실험 제외)<br>
            • 진로선택 성취도 변환: <span style="color:#e2e8f0;">A → 1등급(100) · B → 2등급(98) · C → 4등급(94)</span><br>
            • <strong style="color:#60a5fa;">등급점수</strong>: <span style="color:#e2e8f0;">1=100 · 2=98 · 3=96 · 4=94 · 5=92 · 6=88 · 7=80 · 8=70 · 9=0</span><br>
            • 교과점수(A) = Σ(등급점수×이수단위) ÷ Σ이수단위<br>
            • 최종 점수 = 교과점수(A) ÷ 100 × 1,000 <span style="color:#94a3b8;">(1000점 만점, 소수점 4번째 자리 반올림)</span>
        `
    },
    smu: {
        name: '상명대학교(서울)',
        label: '학생부교과 고교추천전형',
        maxScore: 1000,
        scoreLabel: '교과 점수',
        scoreUnit: '/ 1000',
        scoreColor: '#f43f5e',
        calc: calcSMUScore,
        infoHTML: `
            <strong style="color:#93c5fd;">📌 상명대학교(서울) 학생부교과 고교추천전형 교과 점수 산출 기준</strong><br>
            • <strong style="color:#f43f5e;">반영교과</strong>: 석차등급(9등급)으로 평가된 전 교과목 (계열 구분 없음)<br>
            • 진로선택: 성취등급(3등급) 과목 중 우수 최대 3과목 (A>B>C, 동점 시 이수학점 많은 과목 우선)<br>
            • <strong style="color:#60a5fa;">석차등급 점수</strong>: <span style="color:#e2e8f0;">1=100 · 2=98 · 3=96 · 4=94 · 5=90 · 6=80 · 7=60 · 8=40 · 9=0</span><br>
            • <strong style="color:#a78bfa;">성취등급 점수</strong>: <span style="color:#e2e8f0;">A=100 · B=96 · C=90</span><br>
            • 교과성적 = Σ(환산점수×이수단위) ÷ Σ이수단위 × 10 <span style="color:#94a3b8;">(1000점 만점, 소수점 4번째 자리 반올림)</span>
        `
    },
    cuk: {
        name: '가톨릭대학교',
        label: '학생부교과 지역균형전형',
        maxScore: 100,
        scoreLabel: '교과 점수',
        scoreUnit: '/ 100',
        scoreColor: '#0ea5e9',
        calc: calcCUKScore,
        infoHTML: `
            <strong style="color:#93c5fd;">📌 가톨릭대학교 학생부교과 지역균형전형 교과 점수 산출 기준</strong><br>
            • <strong style="color:#0ea5e9;">반영교과</strong>: 국어·수학·영어·한국사·사회(역사/도덕 포함)·과학 전 과목<br>
            • 진로선택 성취도 변환: <span style="color:#e2e8f0;">A → 1등급(100) · B → 2등급(99) · C → 4등급(97)</span><br>
            • <strong style="color:#60a5fa;">등급점수</strong>: <span style="color:#e2e8f0;">1=100 · 2=99 · 3=98 · 4=97 · 5=96 · 6=95 · 7=94 · 8=88 · 9=70</span><br>
            • 교과성적 = Σ(등급점수×이수단위) ÷ Σ이수단위 <span style="color:#94a3b8;">(100점 만점, 최저 70점, 소수점 4번째 자리 반올림)</span>
        `
    },
    pnu: {
        name: '부산대학교',
        label: '학생부교과전형',
        maxScore: 80,
        scoreLabel: '교과 점수',
        scoreUnit: '/ 80',
        scoreColor: '#14b8a6',
        calc: calcPNUScore,
        infoHTML: `
            <strong style="color:#93c5fd;">📌 부산대학교 학생부교과전형 교과 점수 산출 기준</strong><br>
            • <strong style="color:#14b8a6;">반영교과</strong>: 국어·수학·영어·사회·과학·한국사 / <strong style="color:#f87171;">진로선택(성취도) 과목 미반영</strong> — 석차등급 과목만 반영<br>
            • <strong style="color:#60a5fa;">등급점수</strong>: <span style="color:#e2e8f0;">1=100 · 2=99 · 3=98 · 4=97 · 5=96 · 6=95 · 7=90 · 8=60 · 9=0</span><br>
            • 교과성적 = Σ(등급점수×이수단위) ÷ Σ이수단위 × 0.8 <span style="color:#94a3b8;">(80점 만점, 소수점 5번째 자리에서 버림)</span><br>
            • ⚠️ 학업역량평가 20점은 별도 정성평가 (이 도구에서 교과 80점만 계산)
        `
    },
    kut: {
        name: '한국기술교육대학교',
        label: '학생부교과전형',
        maxScore: 100,
        scoreLabel: '교과 점수',
        scoreUnit: '/ 100',
        scoreColor: '#10b981',
        calc: calcKUTScore,
        infoHTML: `
            <strong style="color:#93c5fd;">📌 한국기술교육대학교 학생부교과전형 교과 점수 산출 기준</strong><br>
            • <strong style="color:#10b981;">반영교과</strong>: 공학·ICT계열/자율전공(자연) — 국어·수학·영어·과학 / 사회계열/자율전공(인문) — 국어·수학·영어·사회(한국사 미포함)<br>
            • <strong style="color:#f87171;">진로선택(성취도) 과목 교과성적 제외</strong> — 가산점 대상으로만 활용<br>
            • <strong style="color:#60a5fa;">등급점수</strong>: <span style="color:#e2e8f0;">1=100 · 2=99 · 3=98 · 4=95.5 · 5=93 · 6=90.5 · 7=61.5 · 8=32.5 · 9=3.5</span><br>
            • 교과성적 = Σ(등급점수×이수단위) ÷ Σ이수단위 <span style="color:#94a3b8;">(소수점 3번째 반올림)</span><br>
            • <strong style="color:#a78bfa;">가산점</strong>: 진로선택 상위 3과목(체육/예술 제외, A=3/B=2/C=1) → 교과성적 × (합÷3÷100) <span style="color:#94a3b8;">(소수점 3번째 반올림)</span><br>
            • 최종 = 교과성적 + 가산점 · 두 계열(공학·ICT/사회) 각각 계산 — 높은 값을 대표 점수로 표시
        `
    },
    hye: {
        name: '한양대학교 ERICA',
        label: '학생부교과 지역균형선발전형',
        maxScore: 1000,
        scoreLabel: '교과 점수',
        scoreUnit: '/ 1000',
        scoreColor: '#3b82f6',
        calc: calcHYEScore,
        infoHTML: `
            <strong style="color:#93c5fd;">📌 한양대학교 ERICA 학생부교과 지역균형선발전형 교과 점수 산출 기준</strong><br>
            • <strong style="color:#3b82f6;">반영교과</strong>: 국어·영어·수학·사회·과학·한국사 전 과목 (계열 구분 없음)<br>
            • <strong style="color:#60a5fa;">공통/일반선택 80%(800점)</strong>: 등급 가중평균 × 8<br>
            &nbsp;&nbsp;등급점수: <span style="color:#e2e8f0;">1=100 · 2=99 · 3=98 · 4=95 · 5=90 · 6=70 · 7=50 · 8=25 · 9=0</span><br>
            • <strong style="color:#a78bfa;">진로선택 20%(200점)</strong>: 성취도 가중평균 × 2<br>
            &nbsp;&nbsp;성취도: <span style="color:#e2e8f0;">A=100 · B=99 · C=98</span><br>
            • 최종 = 공통/일반 × 8 + 진로선택 × 2 <span style="color:#94a3b8;">(1000점 만점)</span><br>
            &nbsp;&nbsp;<span style="color:#64748b;">진로선택 없는 경우: 공통/일반 가중평균 × 10</span>
        `
    },
    kus: {
        name: '고려대학교(세종)',
        label: '학생부교과 일반전형',
        maxScore: 1000,
        scoreLabel: '교과 점수',
        scoreUnit: '/ 1000',
        scoreColor: '#ef4444',
        calc: calcKUSScore,
        infoHTML: `
            <strong style="color:#93c5fd;">📌 고려대학교(세종) 학생부교과 일반전형 교과 점수 산출 기준</strong><br>
            • <strong style="color:#ef4444;">반영교과</strong>: 인문·체능계열 — 국어·수학·영어·사회(한국사 포함) / 자연계열 — 국어·수학·영어·과학<br>
            • <strong style="color:#60a5fa;">공통/일반선택 90%(900점)</strong>: 가중평균 × 0.9<br>
            &nbsp;&nbsp;등급점수: <span style="color:#e2e8f0;">1=1000 · 2=990 · 3=980 · 4=950 · 5=900 · 6=700 · 7=500 · 8=250 · 9=0</span><br>
            • <strong style="color:#a78bfa;">진로선택 10%(100점)</strong>: 성취도 가중평균 × 0.1<br>
            &nbsp;&nbsp;성취도: <span style="color:#e2e8f0;">A=1000 · B=980 · C=900</span><br>
            • 최종 = 공통/일반 가중평균×0.9 + 진로선택 가중평균×0.1 <span style="color:#94a3b8;">(1000점 만점)</span><br>
            &nbsp;&nbsp;<span style="color:#64748b;">진로선택 없는 경우: 공통/일반 가중평균 × 1.0</span><br>
            • 인문/자연 각각 계산 — 높은 값을 대표 점수로 표시
        `
    },
    aju: {
        name: '아주대학교',
        label: '학생부교과 고교추천전형',
        maxScore: 100,
        scoreLabel: '교과 점수',
        scoreUnit: '/ 100',
        scoreColor: '#f97316',
        calc: calcAJUScore,
        infoHTML: `
            <strong style="color:#93c5fd;">📌 아주대학교 학생부교과 고교추천전형 교과 점수 산출 기준</strong><br>
            • <strong style="color:#f97316;">반영교과</strong>: 국어·수학·영어·사회·과학 전 과목 (계열 구분 없음, <strong style="color:#f87171;">한국사 제외</strong>)<br>
            • <strong style="color:#60a5fa;">등급점수</strong>: <span style="color:#e2e8f0;">1=100 · 2=99 · 3=98 · 4=95 · 5=90 · 6=85 · 7=75 · 8=65 · 9=0</span><br>
            • 성취도(진로선택): <span style="color:#e2e8f0;">A=100 · B=98 · C=90</span><br>
            • <strong style="color:#a78bfa;">진로선택 상위 5과목</strong>만 반영 (성취도 높은 순 → 이수단위 큰 순)<br>
            • 교과점수 = Σ(등급점수×이수단위) ÷ Σ이수단위 <span style="color:#94a3b8;">(공통/일반 + 진로선택 상위 5개 통합, 소수점 3번째 반올림)</span>
        `
    },
    inu: {
        name: '인하대학교',
        label: '학생부교과 지역균형전형',
        maxScore: 100,
        scoreLabel: '교과 점수',
        scoreUnit: '/ 100',
        scoreColor: '#0891b2',
        calc: calcINUScore,
        infoHTML: `
            <strong style="color:#93c5fd;">📌 인하대학교 학생부교과 지역균형전형 교과 점수 산출 기준</strong><br>
            • <strong style="color:#0891b2;">반영교과</strong>: 인문계열 — 국어·수학·영어·사회(한국사 포함) / 자연계열 — 국어·수학·영어·과학 / 자유전공융합학부 — 국어·수학·영어·사회·과학<br>
            • <strong style="color:#60a5fa;">등급환산점수</strong>: <span style="color:#e2e8f0;">1=10.0 · 2=9.8 · 3=9.6 · 4=9.4 · 5=9.0 · 6=8.0 · 7=4.0 · 8=2.0 · 9=0</span><br>
            • <strong style="color:#a78bfa;">진로선택 상위 3과목</strong>만 반영 (성취도 A=1등급/B=2등급/C=4등급 변환, 동점 시 이수단위 큰 순)<br>
            • 교과 반영점수 = Σ(등급환산점수×이수단위) ÷ Σ이수단위 <span style="color:#94a3b8;">(공통/일반 + 진로선택 통합, 소수 셋째자리 반올림)</span><br>
            • 최종 = 교과 반영점수 × 10 <span style="color:#94a3b8;">(100점 만점)</span><br>
            • 3개 계열(인문/자연/자유전공융합) 각각 계산 — 높은 값을 대표 점수로 표시
        `
    },
    inch: {
        name: '인천대학교',
        label: '학생부교과(교과성적우수자·지역균형·사회통합전형)',
        maxScore: 350,
        scoreLabel: '교과 점수',
        scoreUnit: '/ 350',
        scoreColor: '#1d4ed8',
        calc: calcINCHScore,
        infoHTML: `
            <strong style="color:#93c5fd;">📌 인천대학교 학생부교과(교과성적우수자·지역균형·사회통합전형) 교과 점수 산출 기준</strong><br>
            • <strong style="color:#1d4ed8;">반영교과</strong>: 인문계열 — 국어30%·수학20%·영어30%·사회(한국사 포함)20% / 자연계열 — 국어20%·수학30%·영어30%·과학20%<br>
            • <strong style="color:#60a5fa;">교과별 가중평균 등급</strong> = Σ(등급×이수단위) ÷ Σ이수단위 <span style="color:#94a3b8;">(공통·일반선택만, 진로선택 제외)</span><br>
            • <strong style="color:#a78bfa;">석차등급 환산점수</strong>: 1.00~1.49=350 · 1.50~1.99=349 · 2.00~2.24=347 · 2.25~2.49=345 · 2.50~2.74=343 · 2.75~2.99=341 · 3.00~3.24=338 · 3.25~3.49=335 · 3.50~3.74=332 · 3.75~3.99=329 · 4.00~4.24=325 · 4.25~4.49=321 · 4.50~4.74=317 · 4.75~4.99=313 · 5.00~5.49=307 · 5.50~5.99=300 · 6.00~6.99=280 · 7.00~7.99=250 · 8.00~9.00=200<br>
            • <strong style="color:#f97316;">가산점</strong> = 반영교과 이수단위(진로선택 포함) 합 × 0.05 <span style="color:#94a3b8;">(교과가 없을 시 최저등급 200점 반영)</span><br>
            • 최종점수 = Σ(환산점수×반영비율) + 가산점 <span style="color:#94a3b8;">(350점 기준, 가산점으로 초과 가능)</span><br>
            • <span style="color:#64748b;">자유전공학부는 가산점 × 0.2 적용 (본 계산기는 × 0.05 기준)</span><br>
            • 인문·자연 2개 계열 각각 계산 — 높은 값을 대표 점수로 표시
        `
    },
    kgu: {
        name: '경기대학교',
        label: '학생부교과전형',
        maxScore: 90,
        scoreLabel: '교과 점수',
        scoreUnit: '/ 90',
        scoreColor: '#b91c1c',
        calc: calcKGUScore,
        infoHTML: `
            <strong style="color:#93c5fd;">📌 경기대학교 학생부교과전형 교과 점수 산출 기준</strong><br>
            • <strong style="color:#b91c1c;">반영교과</strong>: 인문계열 — 국어·수학·영어·사회교과전체·통합과학 / 자연계열 — 국어·수학·영어·과학교과전체·통합사회·한국사<br>
            • <strong style="color:#60a5fa;">등급환산점수</strong>: <span style="color:#e2e8f0;">1=100 · 2=99 · 3=97 · 4=95 · 5=90 · 6=85 · 7=60 · 8=20 · 9=0</span><br>
            • <strong style="color:#a78bfa;">진로선택 성취도</strong>: <span style="color:#e2e8f0;">A=100 · B=99 · C=95</span> (진로선택 없을 경우 공통·일반선택 평균점수 대체 반영)<br>
            • <strong style="color:#f97316;">최종 교과점수</strong> = 공통·일반선택 평균 × 81% + 진로선택 평균 × 9% <span style="color:#94a3b8;">(90점 만점, 출결 10점 별도)</span><br>
            • 체육·예술 교과 및 등급 없는 과목(이수/PASS/*) 제외<br>
            • 인문·자연 2개 계열 각각 계산 — 높은 값을 대표 점수로 표시
        `
    },
    jbnu: {
        name: '전북대학교',
        label: '학생부교과전형',
        maxScore: 1000,
        scoreLabel: '교과 점수',
        scoreUnit: '/ 1000',
        scoreColor: '#047857',
        calc: calcJBNUScore,
        infoHTML: `
            <strong style="color:#93c5fd;">📌 전북대학교 학생부교과전형 교과 점수 산출 기준</strong><br>
            • <strong style="color:#047857;">반영교과</strong>: 국어·수학·영어·사회(역사·도덕 포함)·과학·한국사 <span style="color:#94a3b8;">(계열 구분 없음, 전 과목)</span><br>
            • <strong style="color:#60a5fa;">등급환산점수</strong>: <span style="color:#e2e8f0;">1=9.80 · 2=9.30 · 3=8.80 · 4=8.30 · 5=7.80 · 6=6.80 · 7=4.60 · 8=2.40 · 9=0.20</span><br>
            • <strong style="color:#a78bfa;">진로선택 성취도</strong>: <span style="color:#e2e8f0;">A=9.30(2등급) · B=8.30(4등급) · C=4.60(7등급)</span><br>
            • 평균등급점수 = Σ(등급점수×이수단위) ÷ Σ이수단위<br>
            • 진로선택이 있는 경우: 석차등급과목 평균 × 90% + 진로선택과목 평균 × 10%<br>
            • <strong style="color:#f97316;">최종점수</strong> = 930 + (70 × 평균등급점수 ÷ 9.8) <span style="color:#94a3b8;">(1,000점 만점, 소수 셋째 자리 반올림)</span>
        `
    },
    cnnu: {
        name: '전남대학교',
        label: '학생부교과전형(일괄선발)',
        maxScore: 900,
        scoreLabel: '교과 점수',
        scoreUnit: '/ 900',
        scoreColor: '#0369a1',
        calc: calcCNNUScore,
        infoHTML: `
            <strong style="color:#93c5fd;">📌 전남대학교 학생부교과전형(일괄선발) 교과 점수 산출 기준</strong><br>
            • <strong style="color:#0369a1;">반영교과</strong>: 국어·수학·영어·한국사·사회·과학 <span style="color:#94a3b8;">(계열 구분 없음)</span><br>
            • <strong style="color:#60a5fa;">등급환산점수</strong>: <span style="color:#e2e8f0;">1=100 · 2=95 · 3=90 · 4=85 · 5=80 · 6=75 · 7=70 · 8=65 · 9=0</span><br>
            • <strong style="color:#f97316;">석차등급 실질점수</strong> = Σ(등급점수×이수단위) ÷ Σ이수단위 × 2.25 <span style="color:#94a3b8;">(최대 225점)</span><br>
            • 기본점수 660점 + 실질점수 = 석차등급 교과점수 <span style="color:#94a3b8;">(최대 885점)</span><br>
            • <strong style="color:#a78bfa;">진로선택</strong> 성취도: <span style="color:#e2e8f0;">A=15 · B=9 · C=3</span> — 상위 3과목 합산 ÷ 3 <span style="color:#94a3b8;">(최대 15점)</span><br>
            &nbsp;&nbsp;<span style="color:#64748b;">3개 미만 시 비교내신 적용: 석차등급 실질점수 × 0.06666</span><br>
            • 교과 총점 = 660 + 실질점수 + 진로선택점수 <span style="color:#94a3b8;">(최대 900점, 출결 100점 별도)</span>
        `
    },
    knu: {
        name: '경북대학교',
        label: '학생부교과(교과우수자전형)',
        maxScore: 400,
        scoreLabel: '교과 점수',
        scoreUnit: '/ 400',
        scoreColor: '#9333ea',
        calc: calcKNUScore,
        infoHTML: `
            <strong style="color:#93c5fd;">📌 경북대학교 학생부교과(교과우수자전형) 교과 점수 산출 기준</strong><br>
            • <strong style="color:#9333ea;">반영교과</strong>: 국어·수학·영어·사회·과학·한국사 전과목 <span style="color:#94a3b8;">(인문·자연 계열 구분 없음)</span><br>
            • <strong style="color:#60a5fa;">등급환산점수</strong>: <span style="color:#e2e8f0;">1=400 · 2=390 · 3=380 · 4=370 · 5=360 · 6=350 · 7=300 · 8=200 · 9=0</span><br>
            • <strong style="color:#f97316;">교과 점수</strong> = Σ(등급점수×이수단위) ÷ Σ이수단위 <span style="color:#94a3b8;">(소수점 셋째 자리 반올림 → 소수 둘째까지)</span><br>
            • <strong style="color:#a78bfa;">진로선택과목</strong>: 교과 점수(400점) 산출 제외 — 서류평가(교과이수성실도, 100점)에서 별도 반영<br>
            • 총점 500점 만점 (교과 400점 + 서류평가 100점) — 이 계산기는 교과 400점만 산출
        `
    },
    cbnu: {
        name: '충북대학교',
        label: '학생부교과전형',
        maxScore: 80,
        scoreLabel: '교과 점수',
        scoreUnit: '/ 80',
        scoreColor: '#0891b2',
        calc: calcCBNUScore,
        infoHTML: `
            <strong style="color:#93c5fd;">📌 충북대학교 학생부교과전형 교과 점수 산출 기준</strong><br>
            • <strong style="color:#0891b2;">반영교과</strong>: 국어·수학·영어·사회·과학 전과목 <span style="color:#94a3b8;">(계열 구분 없음)</span><br>
            • <strong style="color:#60a5fa;">등급환산점수</strong>: <span style="color:#e2e8f0;">1=10 · 2=9.5 · 3=9 · 4=8.5 · 5=8 · 6=7.5 · 7=7 · 8=4 · 9=0</span><br>
            • <strong style="color:#f97316;">교과 점수</strong> = Σ(등급점수×이수단위) ÷ Σ이수단위 × 4.0 + 40 <span style="color:#94a3b8;">(80점 만점, 기본점수 40점)</span><br>
            • <strong style="color:#a78bfa;">진로선택</strong>: A → 1등급 고정 / B → 누적비율(B%+C%)로 등급환산 / C → 누적비율(C%)로 등급환산<br>
            &nbsp;&nbsp;<span style="color:#64748b;">비율 미입력 시: B → 4등급, C → 7등급 기본값 적용</span><br>
            • 반영학기: 3학년 1학기까지
        `
    },
    cnu: {
        name: '충남대학교',
        label: '학생부교과(일반전형)',
        maxScore: 100,
        scoreLabel: '교과 점수',
        scoreUnit: '/ 100',
        scoreColor: '#b45309',
        calc: calcCNUScore,
        infoHTML: `
            <strong style="color:#93c5fd;">📌 충남대학교 학생부교과(일반전형) 교과 점수 산출 기준</strong><br>
            • <strong style="color:#b45309;">반영교과</strong>: 국어·수학·영어·한국사·사회·과학·기술가정·제2외국어·한문 <span style="color:#94a3b8;">(체육·예술·교양·정보 제외)</span><br>
            • <strong style="color:#60a5fa;">등급환산점수</strong>: <span style="color:#e2e8f0;">1=100 · 2=90 · 3=80 · 4=70 · 5=60 · 6=50 · 7=40 · 8=30 · 9=20</span><br>
            • <strong style="color:#f97316;">교과 점수</strong> = Σ(등급점수×이수단위) ÷ Σ이수단위 <span style="color:#94a3b8;">(100점 만점, 소수 둘째까지)</span><br>
            • <strong style="color:#a78bfa;">진로선택</strong>: A → 1등급 고정 / B → 누적비율(B%+C%)로 등급환산 / C → 누적비율(C%)로 등급환산<br>
            &nbsp;&nbsp;<span style="color:#64748b;">비율 미입력 시: B → 4등급, C → 7등급 기본값 적용</span><br>
            • 반영학기: 3학년 1학기까지
        `
    },
    gnu: {
        name: '경상국립대학교',
        label: '학생부교과(일반전형)',
        maxScore: 1000,
        scoreLabel: '교과 점수',
        scoreUnit: '/ 1000',
        scoreColor: '#0f766e',
        calc: calcGNUScore,
        infoHTML: `
            <strong style="color:#93c5fd;">📌 경상국립대학교 학생부교과(일반전형) 교과 점수 산출 기준</strong><br>
            • <strong style="color:#0f766e;">반영교과</strong>: 국어·수학·영어·사회(한국사 포함)·과학 <span style="color:#94a3b8;">(계열 구분 없음)</span><br>
            • <strong style="color:#60a5fa;">등급환산점수</strong>: <span style="color:#e2e8f0;">1=150 · 2=135 · 3=120 · 4=105 · 5=90 · 6=75 · 7=60 · 8=40 · 9=0</span><br>
            • <strong style="color:#f97316;">교과 점수</strong> = 850 + Σ(등급점수×이수단위) ÷ Σ이수단위 <span style="color:#94a3b8;">(기본점수 850, 만점 1000)</span><br>
            • <strong style="color:#a78bfa;">진로선택 가산</strong>: A=0.5 · B=0.3 · C=0.1 — 교과별 상위 3과목 합÷3 → 5교과 합÷5 <span style="color:#94a3b8;">(최대 +0.5점)</span><br>
            • 반영학기: 1학년 1학기 ~ 3학년 1학기
        `
    },
    sju: {
        name: '세종대학교',
        label: '학생부교과 지역균형전형',
        maxScore: 1000,
        scoreLabel: '교과 점수',
        scoreUnit: '/ 1000',
        scoreColor: '#10b981',
        calc: calcSJUScore,
        infoHTML: `
            <strong style="color:#93c5fd;">📌 세종대학교 지역균형전형 교과 점수 산출 기준</strong><br>
            • <strong style="color:#10b981;">반영교과</strong>: 자유전공학부 — 국어·수학·영어 / 인문계열 — 국어·수학·영어·사회 / 자연계열 — 국어·수학·영어·과학<br>
            • <strong style="color:#60a5fa;">공통/일반선택 80%</strong>: 이수단위 가중평균 × 0.8<br>
            &nbsp;&nbsp;등급환산: <span style="color:#e2e8f0;">1=1000 · 2=990 · 3=980 · 4=950 · 5=900 · 6=800 · 7=700 · 8=500 · 9=0</span><br>
            • <strong style="color:#a78bfa;">진로선택 20%</strong>: 성취도 <span style="color:#e2e8f0;">A=1000 · B=980 · C=900</span>, 이수단위 가중평균 × 0.2<br>
            • 교과 점수 = 공통/일반 가중평균×0.8 + 진로선택 가중평균×0.2 <span style="color:#94a3b8;">(1000점 만점, 소수점 9번째에서 절사)</span><br>
            &nbsp;&nbsp;<span style="color:#64748b;">진로선택 없는 경우: 공통/일반 가중평균 × 1.0</span><br>
            • 3개 계열(자유전공학부/인문계열/자연계열) 각각 계산 — 높은 값을 대표 점수로 표시
        `
    },
    ssu: {
        name: '숭실대학교',
        label: '학생부교과(교과우수자-학교장추천)전형',
        maxScore: 100,
        scoreLabel: '교과 점수',
        scoreUnit: '/ 100',
        scoreColor: '#a855f7',
        calc: calcSSUScore,
        infoHTML: `
            <strong style="color:#93c5fd;">📌 숭실대학교 교과우수자(학교장추천)전형 교과 점수 산출 기준</strong><br>
            • <strong style="color:#a855f7;">반영교과</strong>: 인문/경상/자유전공(인문) — 국어·수학·영어·사회(한국사포함) / 자연 — 국어·수학·영어·과학<br>
            • <strong style="color:#60a5fa;">공통/일반선택 80%</strong>: 교과군별 가중 평균 × 8
            <span style="color:#94a3b8;">(소수점 여섯째자리 절사 후 넷째자리 절사)</span><br>
            &nbsp;&nbsp;등급점수: <span style="color:#e2e8f0;">1=10 · 2=9.5 · 3=9 · 4=8.5 · 5=8 · 6=7 · 7=5 · 8=3 · 9=0</span><br>
            &nbsp;&nbsp;계열별 가중치: 인문(국35/수15/영35/사15) · 경상(국20/수30/영35/사15) · 자유전공(인문)(국30/수20/영30/사20) · 자연(국15/수35/영25/과25)<br>
            • <strong style="color:#a78bfa;">진로선택 20%</strong>: 성취도 A=1등급=10 · B=2등급=9.5 · C=3등급=9, 반영교과 내 전 진로선택 과목 가중평균 × 2 × (cap/20%)<br>
            &nbsp;&nbsp;최대 취득 비율: 3과목↑ → 20% · 2과목 → 18% · 1과목 → 16%<br>
            • 4개 계열 각각 계산 — 높은 값을 대표 점수로 표시 <span style="color:#94a3b8;">(100점 만점)</span>
        `
    },
    kmu: {
        name: '국민대학교',
        label: '교과우수자(학교장추천)전형',
        maxScore: 1000,
        scoreLabel: '교과 점수',
        scoreUnit: '/ 1000',
        scoreColor: '#0ea5e9',
        calc: calcKMUScore,
        infoHTML: `
            <strong style="color:#93c5fd;">📌 국민대학교 교과우수자(학교장추천)전형 교과 점수 산출 기준</strong><br>
            • <strong style="color:#0ea5e9;">반영교과</strong>: <strong>인문계열</strong> — 국어·수학·영어·사회(역사/도덕 포함) / <strong>자연계열</strong> — 국어·수학·영어·과학<br>
            • <strong style="color:#60a5fa;">공통/일반선택 85%</strong>: 이수학점 가중평균 × 8.5<br>
            &nbsp;&nbsp;등급환산: <span style="color:#e2e8f0;">1=100 · 2=99 · 3=98 · 4=95 · 5=90 · 6=70 · 7=50 · 8=30 · 9=0</span><br>
            • <strong style="color:#a78bfa;">진로선택 15%</strong>: 반영교과 내 <strong>상위 3과목</strong> 이수학점 가중평균 × 1.5<br>
            &nbsp;&nbsp;성취도환산: <span style="color:#e2e8f0;">A=100 · B=98 · C=90</span> (상위 3과목: 성취도점수 내림차순 → 이수학점 내림차순)<br>
            • 교과 점수 = 공통/일반 가중평균 × 8.5 + 진로선택 가중평균 × 1.5 <span style="color:#94a3b8;">(1000점 만점)</span><br>
            &nbsp;&nbsp;<span style="color:#64748b;">진로선택 없는 경우: 공통/일반 가중평균 × 10</span><br>
            • 인문/자연 각각 계산 — 높은 값을 대표 점수로 표시
        `
    }
};

// ────────────────────────────────────────────────
// 렌더링
// ────────────────────────────────────────────────

window.renderUnivScoreTab = function() {
    const container = document.getElementById('univ-score-content');
    if (!container) return;

    const univKey = (document.getElementById('univ-score-selector') || {}).value || 'korea';
    const univ    = UNIVS[univKey];
    if (!univ) return;

    const students = (typeof state !== 'undefined' && state.students) ? state.students : [];

    if (students.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:5rem 2rem; color:var(--text-secondary);">
                <div style="font-size:3.5rem; margin-bottom:1.2rem;">📂</div>
                <p style="font-size:1.1rem; margin-bottom:0.5rem;">등록된 학생이 없습니다.</p>
                <p style="font-size:0.9rem;">📊 내신 분석하기 탭에서 학생 파일을 먼저 업로드해주세요.</p>
            </div>`;
        return;
    }

    const results = students.map(s => {
        const sc = univ.calc(s);
        return { ...s, _sc: sc, _displayScore: sc.displayScore };
    }).sort((a, b) => b._displayScore - a._displayScore);

    results.forEach((r, i) => { r._univRank = i + 1; });

    const rows = results.map((r, i) => {
        const isTop = r._univRank <= 3;
        const rowBg = isTop ? 'background:rgba(30,58,138,0.18);' : (i % 2 === 0 ? 'background:rgba(255,255,255,0.02);' : '');
        const medalColors = ['#f59e0b', '#94a3b8', '#b45309'];
        const rankBadge = r._univRank <= 3
            ? `<span style="display:inline-block;width:1.6rem;height:1.6rem;line-height:1.6rem;border-radius:50%;background:${medalColors[r._univRank-1]};color:#fff;font-size:0.75rem;font-weight:700;">${r._univRank}</span>`
            : `<span style="color:#64748b;">${r._univRank}</span>`;

        return `
        <tr style="${rowBg} border-bottom:1px solid rgba(148,163,184,0.1);">
            <td style="padding:0.7rem 0.9rem;text-align:center;">${rankBadge}</td>
            <td style="padding:0.7rem;text-align:center;color:#64748b;">${r.class !== '미상' ? r.class : '-'}</td>
            <td style="padding:0.7rem;font-weight:600;color:var(--text-primary);">${r.name}</td>
            <td style="padding:0.7rem;text-align:right;color:${univ.scoreColor};font-weight:700;font-size:1rem;">
                ${['sogang','kut','aju','inu','inch','kgu','jbnu','cnnu','knu','cbnu','cnu','gnu'].includes(univKey) ? r._displayScore.toFixed(2) : (['dku','kwu','mju','smu','cuk'].includes(univKey) ? r._displayScore.toFixed(3) : r._displayScore.toFixed(4))}
            </td>
            <td style="padding:0.7rem;text-align:center;">
                <button onclick="openUnivScoreDetail(${r.rank},'${univKey}')"
                    style="background:rgba(30,58,138,0.4);color:#93c5fd;border:1px solid rgba(30,58,138,0.6);border-radius:6px;padding:0.3rem 0.7rem;font-size:0.78rem;cursor:pointer;white-space:nowrap;">
                    세부보기
                </button>
            </td>
        </tr>`;
    }).join('');

    container.innerHTML = `
        <div style="background:rgba(30,58,138,0.12);border:1px solid rgba(30,58,138,0.3);border-radius:12px;padding:1rem 1.4rem;margin-bottom:1.5rem;font-size:0.82rem;line-height:1.8;color:var(--text-secondary);">
            ${univ.infoHTML}
        </div>
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
                <thead>
                    <tr style="background:rgba(30,58,138,0.3);">
                        <th style="padding:0.8rem;text-align:center;color:#93c5fd;border-bottom:1px solid rgba(148,163,184,0.2);white-space:nowrap;">순위</th>
                        <th style="padding:0.8rem;text-align:center;color:#93c5fd;border-bottom:1px solid rgba(148,163,184,0.2);">반</th>
                        <th style="padding:0.8rem;text-align:left;color:#93c5fd;border-bottom:1px solid rgba(148,163,184,0.2);">이름</th>
                        <th style="padding:0.8rem;text-align:right;color:#93c5fd;border-bottom:1px solid rgba(148,163,184,0.2);white-space:nowrap;">
                            ${univ.scoreLabel}<br><span style="font-weight:normal;font-size:0.78rem;color:#64748b;">(${univ.maxScore}점 만점)</span>
                        </th>
                        <th style="padding:0.8rem;text-align:center;color:#93c5fd;border-bottom:1px solid rgba(148,163,184,0.2);"></th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
};

// ────────────────────────────────────────────────
// 세부 모달
// ────────────────────────────────────────────────

window.openUnivScoreDetail = function(studentRank, univKey) {
    const students = (typeof state !== 'undefined' && state.students) ? state.students : [];
    const student  = students.find(s => s.rank === studentRank);
    if (!student) return;

    const univ = UNIVS[univKey || 'korea'];
    const sc   = univ.calc(student);

    let bodyHTML = '';

    if (univKey === 'korea') {
        bodyHTML = buildKoreaDetailHTML(student, sc);
    } else if (univKey === 'yonsei') {
        bodyHTML = buildYonseiDetailHTML(student, sc);
    } else if (univKey === 'sogang') {
        bodyHTML = buildSogangDetailHTML(student, sc);
    } else if (univKey === 'sungkyunkwan') {
        bodyHTML = buildSungkyunkwanDetailHTML(student, sc);
    } else if (univKey === 'hanyang') {
        bodyHTML = buildHanyangDetailHTML(student, sc);
    } else if (univKey === 'cau') {
        bodyHTML = buildCAUDetailHTML(student, sc);
    } else if (univKey === 'khu') {
        bodyHTML = buildKHUDetailHTML(student, sc);
    } else if (univKey === 'hufs') {
        bodyHTML = buildHUFSDetailHTML(student, sc);
    } else if (univKey === 'uos') {
        bodyHTML = buildUOSDetailHTML(student, sc);
    } else if (univKey === 'kku') {
        bodyHTML = buildKKUDetailHTML(student, sc);
    } else if (univKey === 'dgu') {
        bodyHTML = buildDGUDetailHTML(student, sc);
    } else if (univKey === 'hgu') {
        bodyHTML = buildHGUDetailHTML(student, sc);
    } else if (univKey === 'kmu') {
        bodyHTML = buildKMUDetailHTML(student, sc);
    } else if (univKey === 'ssu') {
        bodyHTML = buildSSUDetailHTML(student, sc);
    } else if (univKey === 'sju') {
        bodyHTML = buildSJUDetailHTML(student, sc);
    } else if (univKey === 'dku') {
        bodyHTML = buildDKUDetailHTML(student, sc);
    } else if (univKey === 'kwu') {
        bodyHTML = buildKWUDetailHTML(student, sc);
    } else if (univKey === 'mju') {
        bodyHTML = buildMJUDetailHTML(student, sc);
    } else if (univKey === 'smu') {
        bodyHTML = buildSMUDetailHTML(student, sc);
    } else if (univKey === 'cuk') {
        bodyHTML = buildCUKDetailHTML(student, sc);
    } else if (univKey === 'pnu') {
        bodyHTML = buildPNUDetailHTML(student, sc);
    } else if (univKey === 'kut') {
        bodyHTML = buildKUTDetailHTML(student, sc);
    } else if (univKey === 'hye') {
        bodyHTML = buildHYEDetailHTML(student, sc);
    } else if (univKey === 'kus') {
        bodyHTML = buildKUSDetailHTML(student, sc);
    } else if (univKey === 'aju') {
        bodyHTML = buildAJUDetailHTML(student, sc);
    } else if (univKey === 'inu') {
        bodyHTML = buildINUDetailHTML(student, sc);
    } else if (univKey === 'inch') {
        bodyHTML = buildINCHDetailHTML(student, sc);
    } else if (univKey === 'kgu') {
        bodyHTML = buildKGUDetailHTML(student, sc);
    } else if (univKey === 'jbnu') {
        bodyHTML = buildJBNUDetailHTML(student, sc);
    } else if (univKey === 'cnnu') {
        bodyHTML = buildCNNUDetailHTML(student, sc);
    } else if (univKey === 'knu') {
        bodyHTML = buildKNUDetailHTML(student, sc);
    } else if (univKey === 'cbnu') {
        bodyHTML = buildCBNUDetailHTML(student, sc);
    } else if (univKey === 'cnu') {
        bodyHTML = buildCNUDetailHTML(student, sc);
    } else if (univKey === 'gnu') {
        bodyHTML = buildGNUDetailHTML(student, sc);
    }

    const titleEl = document.getElementById('univ-score-detail-title');
    if (titleEl) titleEl.textContent = `${univ.name} ${univ.label} 교과 점수 세부 내역`;

    const body = document.getElementById('univ-score-detail-body');
    if (body) body.innerHTML = bodyHTML;

    const overlay = document.getElementById('univ-score-detail-overlay');
    if (overlay) overlay.style.display = 'flex';
};

function buildKoreaDetailHTML(student, sc) {
    const detailRows = sc.details.map(d => `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.1);">
            <td style="padding:0.55rem 0.8rem;color:#94a3b8;font-size:0.8rem;">${d.category || '-'}</td>
            <td style="padding:0.55rem 0.8rem;font-weight:500;">${d.subject}</td>
            <td style="padding:0.55rem 0.8rem;text-align:center;">${d.credit}</td>
            <td style="padding:0.55rem 0.8rem;text-align:center;color:#60a5fa;">${d.type === '성취도' ? d.raw : d.raw + '등급'}</td>
            <td style="padding:0.55rem 0.8rem;text-align:center;color:#34d399;">${typeof d.converted === 'number' ? d.converted.toFixed(4) : d.converted}</td>
            <td style="padding:0.55rem 0.8rem;text-align:center;color:#94a3b8;font-size:0.75rem;">${d.note || ''}</td>
        </tr>`).join('');

    return `
        <div style="margin-bottom:1.2rem;">
            <div style="font-size:1.1rem;font-weight:700;color:#f1f5f9;margin-bottom:0.5rem;">
                ${student.class !== '미상' ? student.class + '반 ' : ''}${student.number ? student.number + '번 ' : ''}${student.name}
            </div>
            <div style="display:flex;gap:2rem;flex-wrap:wrap;font-size:0.9rem;">
                <span>교과평균등급: <strong style="color:#60a5fa;">${sc.avgGrade.toFixed(4)}</strong></span>
                <span>등급점수: <strong style="color:#34d399;">${sc.gradeScore.toFixed(4)}</strong></span>
                <span>최종반영점수: <strong style="color:#fbbf24;">${sc.finalScore.toFixed(4)} / 90</strong></span>
                <span style="color:#94a3b8;">총 이수단위: ${sc.totalCredit}</span>
            </div>
        </div>
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                <thead>
                    <tr style="background:rgba(30,58,138,0.4);">
                        <th style="padding:0.6rem 0.8rem;text-align:left;color:#93c5fd;">교과</th>
                        <th style="padding:0.6rem 0.8rem;text-align:left;color:#93c5fd;">과목명</th>
                        <th style="padding:0.6rem 0.8rem;text-align:center;color:#93c5fd;">이수단위</th>
                        <th style="padding:0.6rem 0.8rem;text-align:center;color:#93c5fd;">원래 등급</th>
                        <th style="padding:0.6rem 0.8rem;text-align:center;color:#93c5fd;">반영 등급</th>
                        <th style="padding:0.6rem 0.8rem;text-align:center;color:#93c5fd;">비고</th>
                    </tr>
                </thead>
                <tbody>${detailRows}</tbody>
            </table>
        </div>`;
}

function buildYonseiDetailHTML(student, sc) {
    const groupColors = {
        '공통과목(30%)':  '#60a5fa',
        '일반선택(50%)':  '#34d399',
        '진로선택(20%)':  '#a78bfa',
        '반영과목 B':     '#94a3b8'
    };

    const detailRows = sc.details.map(d => {
        const gc = groupColors[d.group] || '#e2e8f0';
        const scoreCell = d.subjectScore !== null
            ? `<td style="padding:0.5rem 0.7rem;text-align:right;color:#fbbf24;font-weight:600;">${d.subjectScore.toFixed(4)}</td>`
            : `<td style="padding:0.5rem 0.7rem;text-align:center;color:#64748b;">-</td>`;
        return `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.1);">
            <td style="padding:0.5rem 0.7rem;"><span style="color:${gc};font-size:0.78rem;font-weight:600;">${d.group}</span></td>
            <td style="padding:0.5rem 0.7rem;color:#94a3b8;font-size:0.78rem;">${d.category || '-'}</td>
            <td style="padding:0.5rem 0.7rem;font-weight:500;">${d.subject}</td>
            <td style="padding:0.5rem 0.7rem;text-align:center;">${d.credit}</td>
            <td style="padding:0.5rem 0.7rem;text-align:center;color:#60a5fa;">${d.rank ? d.rank + '등급' : (d.ach || '-')}</td>
            <td style="padding:0.5rem 0.7rem;text-align:right;color:#e2e8f0;">${d.gradeScore !== null ? d.gradeScore.toFixed(1) : '-'}</td>
            <td style="padding:0.5rem 0.7rem;text-align:right;color:#a78bfa;">${d.zScore !== null ? d.zScore.toFixed(1) : '-'}</td>
            <td style="padding:0.5rem 0.7rem;text-align:right;color:#34d399;">${d.zConverted !== null ? d.zConverted.toFixed(4) : '-'}</td>
            ${scoreCell}
            <td style="padding:0.5rem 0.7rem;color:#94a3b8;font-size:0.72rem;">${d.note || ''}</td>
        </tr>`;
    }).join('');

    return `
        <div style="margin-bottom:1.2rem;">
            <div style="font-size:1.1rem;font-weight:700;color:#f1f5f9;margin-bottom:0.6rem;">
                ${student.class !== '미상' ? student.class + '반 ' : ''}${student.number ? student.number + '번 ' : ''}${student.name}
            </div>
            <div style="display:flex;gap:1.5rem;flex-wrap:wrap;font-size:0.88rem;background:rgba(30,58,138,0.2);padding:0.8rem 1rem;border-radius:8px;">
                <span>공통과목 가중평균: <strong style="color:#60a5fa;">${sc.commonAvg.toFixed(4)}</strong> <span style="color:#64748b;">(×0.30)</span></span>
                <span>일반선택 가중평균: <strong style="color:#34d399;">${sc.generalAvg.toFixed(4)}</strong> <span style="color:#64748b;">(×0.50)</span></span>
                <span>진로선택 가중평균: <strong style="color:#a78bfa;">${sc.careerAvg.toFixed(4)}</strong> <span style="color:#64748b;">(×0.20)</span></span>
                <span>A군 합계: <strong style="color:#fbbf24;">${sc.scoreA.toFixed(4)}</strong></span>
                <span>B군 감점: <strong style="color:#f87171;">-${sc.bDeduct.toFixed(4)}</strong></span>
                <span>최종 점수: <strong style="color:#34d399;font-size:1rem;">${sc.finalScore.toFixed(4)} / 100</strong></span>
            </div>
        </div>
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:0.82rem;">
                <thead>
                    <tr style="background:rgba(30,58,138,0.4);">
                        <th style="padding:0.5rem 0.7rem;color:#93c5fd;text-align:left;white-space:nowrap;">분류</th>
                        <th style="padding:0.5rem 0.7rem;color:#93c5fd;text-align:left;">교과</th>
                        <th style="padding:0.5rem 0.7rem;color:#93c5fd;text-align:left;">과목명</th>
                        <th style="padding:0.5rem 0.7rem;color:#93c5fd;text-align:center;">이수단위</th>
                        <th style="padding:0.5rem 0.7rem;color:#93c5fd;text-align:center;">등급/성취도</th>
                        <th style="padding:0.5rem 0.7rem;color:#93c5fd;text-align:right;white-space:nowrap;">등급점수</th>
                        <th style="padding:0.5rem 0.7rem;color:#93c5fd;text-align:right;white-space:nowrap;">Z점수</th>
                        <th style="padding:0.5rem 0.7rem;color:#93c5fd;text-align:right;white-space:nowrap;">Z환산점수</th>
                        <th style="padding:0.5rem 0.7rem;color:#93c5fd;text-align:right;white-space:nowrap;">과목점수</th>
                        <th style="padding:0.5rem 0.7rem;color:#93c5fd;text-align:left;">비고</th>
                    </tr>
                </thead>
                <tbody>${detailRows}</tbody>
            </table>
        </div>`;
}

function buildSogangDetailHTML(student, sc) {
    const detailRows = sc.details.map(d => {
        const typeColor = d.type === '등급계산' ? '#fb923c' : d.excluded ? '#475569' : '#a78bfa';
        const rowStyle  = d.excluded ? 'opacity:0.5;' : '';
        return `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.1);${rowStyle}">
            <td style="padding:0.55rem 0.8rem;"><span style="color:${typeColor};font-size:0.8rem;font-weight:600;">${d.type}</span></td>
            <td style="padding:0.55rem 0.8rem;color:#94a3b8;font-size:0.8rem;">${d.category || '-'}</td>
            <td style="padding:0.55rem 0.8rem;font-weight:500;">${d.subject}</td>
            <td style="padding:0.55rem 0.8rem;text-align:center;">${d.credit}</td>
            <td style="padding:0.55rem 0.8rem;text-align:center;color:#60a5fa;">${d.rank ? d.rank + '등급' : (d.ach || '-')}</td>
            <td style="padding:0.55rem 0.8rem;text-align:right;color:#fbbf24;">${d.envRatio !== null ? d.envRatio.toFixed(1) : (d.excluded ? '제외' : '-')}</td>
        </tr>`;
    }).join('');

    return `
        <div style="margin-bottom:1.2rem;">
            <div style="font-size:1.1rem;font-weight:700;color:#f1f5f9;margin-bottom:0.6rem;">
                ${student.class !== '미상' ? student.class + '반 ' : ''}${student.number ? student.number + '번 ' : ''}${student.name}
            </div>
            <div style="display:flex;gap:1.5rem;flex-wrap:wrap;font-size:0.88rem;background:rgba(30,58,138,0.2);padding:0.8rem 1rem;border-radius:8px;">
                <span>등급평균: <strong style="color:#60a5fa;">${sc.gradeAvg.toFixed(4)}</strong></span>
                <span>등급계산: <strong style="color:#fb923c;">${sc.gradeScore.toFixed(2)} / 900</strong></span>
                <span>비율계산: <strong style="color:#a78bfa;">${sc.ratioScore.toFixed(2)} / 100</strong></span>
                <span>총점: <strong style="color:#fbbf24;font-size:1rem;">${sc.finalScore.toFixed(2)} / 1000</strong></span>
            </div>
            <p style="font-size:0.78rem;color:#64748b;margin:0.5rem 0 0;">※ 분포비율 데이터가 없는 성취도 과목(과학탐구실험 등)은 비율계산에서 제외됩니다.</p>
        </div>
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                <thead>
                    <tr style="background:rgba(30,58,138,0.4);">
                        <th style="padding:0.6rem 0.8rem;color:#93c5fd;text-align:left;">구분</th>
                        <th style="padding:0.6rem 0.8rem;color:#93c5fd;text-align:left;">교과</th>
                        <th style="padding:0.6rem 0.8rem;color:#93c5fd;text-align:left;">과목명</th>
                        <th style="padding:0.6rem 0.8rem;color:#93c5fd;text-align:center;">이수단위</th>
                        <th style="padding:0.6rem 0.8rem;color:#93c5fd;text-align:center;">등급/성취도</th>
                        <th style="padding:0.6rem 0.8rem;color:#93c5fd;text-align:right;white-space:nowrap;">환산성취비율</th>
                    </tr>
                </thead>
                <tbody>${detailRows}</tbody>
            </table>
        </div>`;
}

function buildSungkyunkwanDetailHTML(student, sc) {
    const groupColors = { 'A군': '#f472b6', 'B군': '#a78bfa', 'A군(진로)': '#f472b688', 'B군(진로)': '#a78bfa88', '미반영': '#475569', '제외(진로선택)': '#475569' };

    const detailRows = sc.details.map(d => {
        const gc = groupColors[d.group] || '#e2e8f0';
        const isExcluded = d.group === '미반영' || d.group === '제외(진로선택)' || d.group === 'A군(진로)' || d.group === 'B군(진로)';
        const scoreTable = d.group === 'A군' ? SKK_A_SCORE : (d.group === 'B군' ? SKK_B_SCORE : null);
        return `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.1);${isExcluded ? 'opacity:0.45;' : ''}">
            <td style="padding:0.55rem 0.8rem;"><span style="color:${gc};font-size:0.8rem;font-weight:600;">${d.group}</span></td>
            <td style="padding:0.55rem 0.8rem;color:#94a3b8;font-size:0.8rem;">${d.category || '-'}</td>
            <td style="padding:0.55rem 0.8rem;font-weight:500;">${d.subject}</td>
            <td style="padding:0.55rem 0.8rem;text-align:center;">${d.credit}</td>
            <td style="padding:0.55rem 0.8rem;text-align:center;color:#60a5fa;">${d.rank ? d.rank + '등급' : (d.ach || '-')}</td>
            <td style="padding:0.55rem 0.8rem;text-align:right;color:#fbbf24;">${d.score !== null ? d.score.toFixed(0) : '-'}</td>
        </tr>`;
    }).join('');

    return `
        <div style="margin-bottom:1.2rem;">
            <div style="font-size:1.1rem;font-weight:700;color:#f1f5f9;margin-bottom:0.6rem;">
                ${student.class !== '미상' ? student.class + '반 ' : ''}${student.number ? student.number + '번 ' : ''}${student.name}
            </div>
            <div style="display:flex;gap:1.5rem;flex-wrap:wrap;font-size:0.88rem;background:rgba(30,58,138,0.2);padding:0.8rem 1rem;border-radius:8px;">
                <span>A군 가중평균: <strong style="color:#f472b6;">${sc.aAvg.toFixed(4)}</strong> <span style="color:#64748b;">(×7)</span></span>
                <span>A군 점수: <strong style="color:#f472b6;">${sc.aFinal.toFixed(2)} / 700</strong></span>
                <span>B군 가중평균: <strong style="color:#a78bfa;">${sc.bAvg.toFixed(4)}</strong> <span style="color:#64748b;">(×1)</span></span>
                <span>B군 점수: <strong style="color:#a78bfa;">${sc.bFinal.toFixed(2)} / 100</strong>${sc.bCredit === 0 ? ' <span style="color:#f87171;font-size:0.78rem;">(B군 과목 없음 → 0점)</span>' : ''}</span>
                <span>정량 합계: <strong style="color:#fbbf24;font-size:1rem;">${sc.finalScore.toFixed(2)} / 800</strong></span>
            </div>
            <p style="font-size:0.78rem;color:#64748b;margin:0.5rem 0 0;">※ 정성평가 200점은 별도 평가 / 진로선택·성취도 과목은 정량평가 제외</p>
        </div>
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                <thead>
                    <tr style="background:rgba(30,58,138,0.4);">
                        <th style="padding:0.6rem 0.8rem;color:#93c5fd;text-align:left;">군</th>
                        <th style="padding:0.6rem 0.8rem;color:#93c5fd;text-align:left;">교과</th>
                        <th style="padding:0.6rem 0.8rem;color:#93c5fd;text-align:left;">과목명</th>
                        <th style="padding:0.6rem 0.8rem;color:#93c5fd;text-align:center;">이수단위</th>
                        <th style="padding:0.6rem 0.8rem;color:#93c5fd;text-align:center;">석차등급</th>
                        <th style="padding:0.6rem 0.8rem;color:#93c5fd;text-align:right;white-space:nowrap;">반영점수</th>
                    </tr>
                </thead>
                <tbody>${detailRows}</tbody>
            </table>
        </div>`;
}

function buildCAUDetailHTML(student, sc) {
    const typeColors = { '공통/일반': '#60a5fa', '진로선택': '#a78bfa' };

    const detailRows = sc.details.map(d => {
        const isExcluded = !d.type;
        const gc = typeColors[d.type] || '#475569';
        const label = d.type || (d.reason || '미반영');
        return `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.1);${isExcluded ? 'opacity:0.45;' : ''}">
            <td style="padding:0.55rem 0.8rem;"><span style="color:${gc};font-size:0.8rem;font-weight:600;">${label}</span></td>
            <td style="padding:0.55rem 0.8rem;color:#94a3b8;font-size:0.8rem;">${d.category || '-'}</td>
            <td style="padding:0.55rem 0.8rem;font-weight:500;">${d.subject}</td>
            <td style="padding:0.55rem 0.8rem;text-align:center;">${d.credit}</td>
            <td style="padding:0.55rem 0.8rem;text-align:center;color:#60a5fa;">${d.rank ? d.rank + '등급' : (d.ach || '-')}</td>
            <td style="padding:0.55rem 0.8rem;text-align:right;color:#fbbf24;">${d.score !== null && d.score !== undefined ? d.score.toFixed(2) : '-'}</td>
        </tr>`;
    }).join('');

    return `
        <div style="margin-bottom:1.2rem;">
            <div style="font-size:1.1rem;font-weight:700;color:#f1f5f9;margin-bottom:0.6rem;">
                ${student.class !== '미상' ? student.class + '반 ' : ''}${student.number ? student.number + '번 ' : ''}${student.name}
            </div>
            <div style="display:flex;gap:1.5rem;flex-wrap:wrap;font-size:0.88rem;background:rgba(30,58,138,0.2);padding:0.8rem 1rem;border-radius:8px;">
                <span>공통/일반 가중평균: <strong style="color:#60a5fa;">${sc.scoreA.toFixed(4)}</strong> <span style="color:#64748b;">×0.9</span></span>
                <span>진로선택 평균: <strong style="color:#a78bfa;">${sc.scoreB.toFixed(4)}</strong> <span style="color:#64748b;">×0.1</span> <span style="color:#475569;font-size:0.78rem;">(${sc.achCount}과목)</span></span>
                <span>합산: <strong style="color:#e2e8f0;">${sc.combined.toFixed(4)}</strong> <span style="color:#64748b;">×90</span></span>
                <span>교과 최종: <strong style="color:#fbbf24;font-size:1rem;">${sc.finalScore.toFixed(4)} / 900</strong></span>
            </div>
            <p style="font-size:0.78rem;color:#64748b;margin:0.5rem 0 0;">※ 반영교과: 국어·수학·영어·사회·과학 / 공통·일반 90% + 진로선택 10% / 비교과(출결) 100점 별도</p>
        </div>
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                <thead>
                    <tr style="background:rgba(30,58,138,0.4);">
                        <th style="padding:0.6rem 0.8rem;color:#93c5fd;text-align:left;">과목유형</th>
                        <th style="padding:0.6rem 0.8rem;color:#93c5fd;text-align:left;">교과</th>
                        <th style="padding:0.6rem 0.8rem;color:#93c5fd;text-align:left;">과목명</th>
                        <th style="padding:0.6rem 0.8rem;color:#93c5fd;text-align:center;">이수단위</th>
                        <th style="padding:0.6rem 0.8rem;color:#93c5fd;text-align:center;">등급/성취도</th>
                        <th style="padding:0.6rem 0.8rem;color:#93c5fd;text-align:right;white-space:nowrap;">환산점수</th>
                    </tr>
                </thead>
                <tbody>${detailRows}</tbody>
            </table>
        </div>`;
}

function buildHanyangDetailHTML(student, sc) {
    const detailRows = sc.details.map(d => {
        const isExcluded = !d.included;
        const gc = d.included ? '#60a5fa' : '#475569';
        const label = d.included ? '반영' : (d.reason || '미반영');
        return `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.1);${isExcluded ? 'opacity:0.45;' : ''}">
            <td style="padding:0.55rem 0.8rem;"><span style="color:${gc};font-size:0.8rem;font-weight:600;">${label}</span></td>
            <td style="padding:0.55rem 0.8rem;color:#94a3b8;font-size:0.8rem;">${d.category || '-'}</td>
            <td style="padding:0.55rem 0.8rem;font-weight:500;">${d.subject}</td>
            <td style="padding:0.55rem 0.8rem;text-align:center;">${d.credit}</td>
            <td style="padding:0.55rem 0.8rem;text-align:center;color:#60a5fa;">${d.rank ? d.rank + '등급' : (d.ach || '-')}</td>
            <td style="padding:0.55rem 0.8rem;text-align:right;color:#fbbf24;">${d.score !== null && d.score !== undefined ? d.score.toFixed(0) : '-'}</td>
        </tr>`;
    }).join('');

    return `
        <div style="margin-bottom:1.2rem;">
            <div style="font-size:1.1rem;font-weight:700;color:#f1f5f9;margin-bottom:0.6rem;">
                ${student.class !== '미상' ? student.class + '반 ' : ''}${student.number ? student.number + '번 ' : ''}${student.name}
            </div>
            <div style="display:flex;gap:1.5rem;flex-wrap:wrap;font-size:0.88rem;background:rgba(30,58,138,0.2);padding:0.8rem 1rem;border-radius:8px;">
                <span>반영 이수단위 합계: <strong style="color:#60a5fa;">${sc.totalCredit}</strong></span>
                <span>교과성적: <strong style="color:#fbbf24;font-size:1rem;">${sc.avg.toFixed(2)} / 100</strong></span>
            </div>
            <p style="font-size:0.78rem;color:#64748b;margin:0.5rem 0 0;">※ 반영교과: 국어·영어·수학·사회·과학·한국사 / 진로선택(성취도) 과목 미반영 / 정성평가 10점 별도</p>
        </div>
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                <thead>
                    <tr style="background:rgba(30,58,138,0.4);">
                        <th style="padding:0.6rem 0.8rem;color:#93c5fd;text-align:left;">반영여부</th>
                        <th style="padding:0.6rem 0.8rem;color:#93c5fd;text-align:left;">교과</th>
                        <th style="padding:0.6rem 0.8rem;color:#93c5fd;text-align:left;">과목명</th>
                        <th style="padding:0.6rem 0.8rem;color:#93c5fd;text-align:center;">이수단위</th>
                        <th style="padding:0.6rem 0.8rem;color:#93c5fd;text-align:center;">석차등급</th>
                        <th style="padding:0.6rem 0.8rem;color:#93c5fd;text-align:right;white-space:nowrap;">등급점수</th>
                    </tr>
                </thead>
                <tbody>${detailRows}</tbody>
            </table>
        </div>`;
}

function buildKHUDetailHTML(student, sc) {
    const typeColors = {
        '공통/일반':        '#60a5fa',
        '진로선택(반영)':   '#a78bfa',
        '진로선택(미선택)': '#64748b'
    };

    const detailRows = sc.details.map(d => {
        const isExcluded = !d.selected;
        const gc = typeColors[d.type] || '#475569';
        const label = d.type || (d.reason || '미반영');
        return `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.1);${isExcluded ? 'opacity:0.45;' : ''}">
            <td style="padding:0.55rem 0.8rem;"><span style="color:${gc};font-size:0.8rem;font-weight:600;">${label}</span></td>
            <td style="padding:0.55rem 0.8rem;color:#94a3b8;font-size:0.8rem;">${d.category || '-'}</td>
            <td style="padding:0.55rem 0.8rem;font-weight:500;">${d.subject}</td>
            <td style="padding:0.55rem 0.8rem;text-align:center;">${d.credit}</td>
            <td style="padding:0.55rem 0.8rem;text-align:center;color:#60a5fa;">${d.rank ? d.rank + '등급' : (d.ach || '-')}</td>
            <td style="padding:0.55rem 0.8rem;text-align:right;color:#fbbf24;">${d.score !== null && d.score !== undefined ? d.score.toFixed(0) : '-'}</td>
        </tr>`;
    }).join('');

    const achText = sc.achCount > 0
        ? `${sc.scoreAch.toFixed(4)} <span style="color:#64748b;font-size:0.78rem;">(${sc.achCount}과목 반영)</span>`
        : `<span style="color:#64748b;font-size:0.78rem;">진로선택 없음</span>`;

    return `
        <div style="margin-bottom:1.2rem;">
            <div style="font-size:1.1rem;font-weight:700;color:#f1f5f9;margin-bottom:0.6rem;">
                ${student.class !== '미상' ? student.class + '반 ' : ''}${student.number ? student.number + '번 ' : ''}${student.name}
            </div>
            <div style="display:flex;gap:1.5rem;flex-wrap:wrap;font-size:0.88rem;background:rgba(30,58,138,0.2);padding:0.8rem 1rem;border-radius:8px;">
                <span>공통/일반 가중평균: <strong style="color:#60a5fa;">${sc.scoreRank.toFixed(4)}</strong> <span style="color:#64748b;">×0.8</span></span>
                <span>진로선택 가중평균: <strong style="color:#a78bfa;">${achText}</strong> <span style="color:#64748b;">×0.2</span></span>
                <span>교과성적(A): <strong style="color:#fbbf24;font-size:1rem;">${sc.finalScore.toFixed(4)} / 100</strong></span>
                <span style="color:#94a3b8;">실제 반영: ${(sc.finalScore * 5.6).toFixed(2)} / 560</span>
            </div>
            <p style="font-size:0.78rem;color:#64748b;margin:0.5rem 0 0;">※ 공통/일반(국·영·수·사·과·한국사) 80% + 진로선택(국·영·수·사·과, 상위 3과목) 20% / 비교과(출결·봉사) 140점 별도</p>
        </div>
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                <thead>
                    <tr style="background:rgba(30,58,138,0.4);">
                        <th style="padding:0.6rem 0.8rem;color:#93c5fd;text-align:left;">과목유형</th>
                        <th style="padding:0.6rem 0.8rem;color:#93c5fd;text-align:left;">교과</th>
                        <th style="padding:0.6rem 0.8rem;color:#93c5fd;text-align:left;">과목명</th>
                        <th style="padding:0.6rem 0.8rem;color:#93c5fd;text-align:center;">이수단위</th>
                        <th style="padding:0.6rem 0.8rem;color:#93c5fd;text-align:center;">등급/성취도</th>
                        <th style="padding:0.6rem 0.8rem;color:#93c5fd;text-align:right;white-space:nowrap;">환산점수</th>
                    </tr>
                </thead>
                <tbody>${detailRows}</tbody>
            </table>
        </div>`;
}

function buildHGUDetailHTML(student, sc) {
    const isHumanBetter = sc.human.finalScore >= sc.sci.finalScore;

    function makeSection(label, res, color) {
        const rows = res.selected.map(d => {
            const gc = d.type === '공통/일반' ? '#60a5fa' : '#a78bfa';
            return `
            <tr style="border-bottom:1px solid rgba(148,163,184,0.1);">
                <td style="padding:0.45rem 0.7rem;"><span style="color:${gc};font-size:0.8rem;font-weight:600;">${d.type}</span></td>
                <td style="padding:0.45rem 0.7rem;color:#94a3b8;font-size:0.8rem;">${d.category || '-'}</td>
                <td style="padding:0.45rem 0.7rem;font-weight:500;">${d.subject}</td>
                <td style="padding:0.45rem 0.7rem;text-align:center;">${d.credit}</td>
                <td style="padding:0.45rem 0.7rem;text-align:center;color:#60a5fa;">${d.rank ? d.rank + '등급' : (d.ach || '-')}</td>
                <td style="padding:0.45rem 0.7rem;text-align:right;color:#fbbf24;">${d.score !== null ? d.score : '-'}</td>
            </tr>`;
        }).join('');

        const achDesc = res.avgAchRaw !== null
            ? `진로선택 가중평균: ${res.avgAchRaw.toFixed(4)}`
            : `진로선택 없음 → 대체값: ${(res.avgRank * 0.09).toFixed(4)}`;
        const formula = `(${res.avgRank.toFixed(4)} × 0.9 + ${res.avgAchEff.toFixed(4)}) × (${res.E}/1000 + 0.9)`;

        return `
            <div style="margin-bottom:0.5rem;font-size:0.87rem;font-weight:600;color:${color};">
                ${label} — 교과점수: <strong style="color:#fbbf24;">${res.finalScore.toFixed(2)} / 100</strong>
                <span style="color:#64748b;font-size:0.78rem;font-weight:400;margin-left:0.5rem;">${formula}</span>
            </div>
            <div style="font-size:0.77rem;color:#64748b;margin-bottom:0.5rem;">
                공통/일반 가중평균: ${res.avgRank.toFixed(4)} / ${achDesc} / E=${res.E}(총이수단위, cap100)
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:0.83rem;margin-bottom:1rem;">
                <thead><tr style="background:rgba(255,255,255,0.05);">
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:left;">유형</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:left;">교과</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:left;">과목명</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:center;">이수단위</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:center;">등급/성취도</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:right;">환산점수</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>`;
    }

    // 미반영 과목은 인문 기준으로 한번만 표시
    const othersRows = sc.human.unselected.filter(d => !sc.sci.selected.find(s => s.subject === d.subject))
        .map(d => `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.07);opacity:0.4;">
            <td style="padding:0.45rem 0.7rem;color:#475569;font-size:0.8rem;">${d.reason || '미반영'}</td>
            <td style="padding:0.45rem 0.7rem;color:#94a3b8;font-size:0.8rem;">${d.category || '-'}</td>
            <td style="padding:0.45rem 0.7rem;">${d.subject}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;color:#64748b;">${d.rank ? d.rank + '등급' : (d.ach || '-')}</td>
            <td style="padding:0.45rem 0.7rem;text-align:right;color:#475569;">-</td>
        </tr>`).join('');

    return `
        <div style="margin-bottom:1.2rem;">
            <div style="font-size:1.1rem;font-weight:700;color:#f1f5f9;margin-bottom:0.6rem;">
                ${student.class !== '미상' ? student.class + '반 ' : ''}${student.number ? student.number + '번 ' : ''}${student.name}
            </div>
            <div style="display:flex;gap:1.5rem;flex-wrap:wrap;font-size:0.88rem;background:rgba(244,63,94,0.08);padding:0.8rem 1rem;border-radius:8px;">
                <span>인문계열: <strong style="color:#f43f5e;">${sc.human.finalScore.toFixed(2)}</strong>${isHumanBetter ? ' ★' : ''}</span>
                <span>자연계열: <strong style="color:#38bdf8;">${sc.sci.finalScore.toFixed(2)}</strong>${!isHumanBetter ? ' ★' : ''}</span>
                <span>대표 점수: <strong style="color:#fbbf24;font-size:1rem;">${sc.displayScore.toFixed(2)} / 100</strong></span>
            </div>
            <p style="font-size:0.78rem;color:#64748b;margin:0.5rem 0 0;">
                ※ 공식: (공통가중평균×0.9 + 진로선택가중평균) × (E/1000 + 0.9) / ★ = 높은 값(대표 점수)
            </p>
        </div>
        <div style="overflow-x:auto;">
            ${makeSection('인문계열 (국어·수학·영어·사회)', sc.human, '#f43f5e')}
            ${makeSection('자연계열 (국어·수학·영어·과학)', sc.sci, '#38bdf8')}
            ${othersRows.length > 0 ? `
            <div style="margin-bottom:0.4rem;font-size:0.82rem;color:#64748b;">반영교과 외</div>
            <table style="width:100%;border-collapse:collapse;font-size:0.83rem;">
                <thead><tr style="background:rgba(255,255,255,0.03);">
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:left;" colspan="2">사유 / 교과</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:left;">과목명</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:center;">등급/성취도</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:right;">-</th>
                </tr></thead>
                <tbody>${othersRows}</tbody>
            </table>` : ''}
        </div>`;
}

function buildDGUDetailHTML(student, sc) {
    const isHumanBetter = sc.scoreHuman >= sc.scoreSci;

    function makeSection(label, top10, rest, score, color) {
        const rows = top10.map(d => `
            <tr style="border-bottom:1px solid rgba(148,163,184,0.1);">
                <td style="padding:0.45rem 0.7rem;"><span style="color:${color};font-size:0.8rem;font-weight:600;">반영</span></td>
                <td style="padding:0.45rem 0.7rem;color:#94a3b8;font-size:0.8rem;">${d.category || '-'}</td>
                <td style="padding:0.45rem 0.7rem;font-weight:500;">${d.subject}</td>
                <td style="padding:0.45rem 0.7rem;text-align:center;color:#60a5fa;">${d.rank}등급</td>
                <td style="padding:0.45rem 0.7rem;text-align:right;color:#fbbf24;">${d.score.toFixed(2)}</td>
            </tr>`).join('');
        const restRows = rest.map(d => `
            <tr style="border-bottom:1px solid rgba(148,163,184,0.1);opacity:0.4;">
                <td style="padding:0.45rem 0.7rem;"><span style="color:#475569;font-size:0.8rem;">미선택</span></td>
                <td style="padding:0.45rem 0.7rem;color:#94a3b8;font-size:0.8rem;">${d.category || '-'}</td>
                <td style="padding:0.45rem 0.7rem;">${d.subject}</td>
                <td style="padding:0.45rem 0.7rem;text-align:center;color:#60a5fa;">${d.rank}등급</td>
                <td style="padding:0.45rem 0.7rem;text-align:right;color:#94a3b8;">${d.score.toFixed(2)}</td>
            </tr>`).join('');

        const avg = top10.length > 0 ? top10.reduce((s, x) => s + x.score, 0) / top10.length : 0;
        return `
            <div style="margin-bottom:0.6rem;font-size:0.88rem;font-weight:600;color:${color};">${label} — 교과 점수: <strong style="color:#fbbf24;">${score.toFixed(3)} / 700</strong>  <span style="color:#64748b;font-size:0.8rem;">(상위 ${top10.length}과목 평균 ${avg.toFixed(4)} / 10)</span></div>
            <table style="width:100%;border-collapse:collapse;font-size:0.83rem;margin-bottom:1rem;">
                <thead><tr style="background:rgba(255,255,255,0.05);">
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:left;">유형</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:left;">교과</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:left;">과목명</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:center;">등급</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:right;">환산점수</th>
                </tr></thead>
                <tbody>${rows}${restRows}</tbody>
            </table>`;
    }

    const othersRows = sc.others.map(d => `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.07);opacity:0.4;">
            <td style="padding:0.45rem 0.7rem;color:#475569;font-size:0.8rem;">${d.reason || '미반영'}</td>
            <td style="padding:0.45rem 0.7rem;color:#94a3b8;font-size:0.8rem;">${d.category || '-'}</td>
            <td style="padding:0.45rem 0.7rem;">${d.subject}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;color:#64748b;">${d.rank ? d.rank + '등급' : (d.ach || '-')}</td>
            <td style="padding:0.45rem 0.7rem;text-align:right;color:#475569;">-</td>
        </tr>`).join('');

    return `
        <div style="margin-bottom:1.2rem;">
            <div style="font-size:1.1rem;font-weight:700;color:#f1f5f9;margin-bottom:0.6rem;">
                ${student.class !== '미상' ? student.class + '반 ' : ''}${student.number ? student.number + '번 ' : ''}${student.name}
            </div>
            <div style="display:flex;gap:1.5rem;flex-wrap:wrap;font-size:0.88rem;background:rgba(251,146,60,0.1);padding:0.8rem 1rem;border-radius:8px;">
                <span>인문계열: <strong style="color:#fb923c;">${sc.scoreHuman.toFixed(3)}</strong>${isHumanBetter ? ' ★' : ''}</span>
                <span>자연계열: <strong style="color:#38bdf8;">${sc.scoreSci.toFixed(3)}</strong>${!isHumanBetter ? ' ★' : ''}</span>
                <span>대표 점수: <strong style="color:#fbbf24;font-size:1rem;">${sc.displayScore.toFixed(3)} / 700</strong></span>
            </div>
            <p style="font-size:0.78rem;color:#64748b;margin:0.5rem 0 0;">
                ※ 인문/자연 각각 상위 10과목 단순 평균 ÷ 10 × 700 / 이수단위 미적용 / ★ = 높은 값(대표 점수) / 서류평가 300점 별도
            </p>
        </div>
        <div style="overflow-x:auto;">
            ${makeSection('인문계열 (국어·수학·영어·사회·한국사)', sc.top10H, sc.restH, sc.scoreHuman, '#fb923c')}
            ${makeSection('자연계열 (국어·수학·영어·과학·한국사)', sc.top10S, sc.restS, sc.scoreSci, '#38bdf8')}
            ${sc.others.length > 0 ? `
            <div style="margin-bottom:0.4rem;font-size:0.82rem;color:#64748b;">반영교과 외 / 진로선택(등급없음)</div>
            <table style="width:100%;border-collapse:collapse;font-size:0.83rem;">
                <thead><tr style="background:rgba(255,255,255,0.03);">
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:left;">사유</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:left;">교과</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:left;">과목명</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:center;">등급/성취도</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:right;">-</th>
                </tr></thead>
                <tbody>${othersRows}</tbody>
            </table>` : ''}
        </div>`;
}

function buildKKUDetailHTML(student, sc) {
    const typeColors = { '공통/일반': '#4ade80' };

    const detailRows = sc.details.map(d => {
        const isSelected = d.selected;
        const gc    = typeColors[d.type] || '#475569';
        const label = d.type || (d.reason || '미반영');
        return `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.1);${!isSelected ? 'opacity:0.4;' : ''}">
            <td style="padding:0.55rem 0.8rem;"><span style="color:${gc};font-size:0.8rem;font-weight:600;">${label}</span></td>
            <td style="padding:0.55rem 0.8rem;color:#94a3b8;font-size:0.8rem;">${d.category || '-'}</td>
            <td style="padding:0.55rem 0.8rem;font-weight:500;">${d.subject}</td>
            <td style="padding:0.55rem 0.8rem;text-align:center;">${d.credit}</td>
            <td style="padding:0.55rem 0.8rem;text-align:center;color:#60a5fa;">${d.rank ? d.rank + '등급' : (d.ach || '-')}</td>
            <td style="padding:0.55rem 0.8rem;text-align:right;color:#fbbf24;">${d.score !== null && d.score !== undefined ? d.score.toFixed(2) : '-'}</td>
        </tr>`;
    }).join('');

    return `
        <div style="margin-bottom:1.2rem;">
            <div style="font-size:1.1rem;font-weight:700;color:#f1f5f9;margin-bottom:0.6rem;">
                ${student.class !== '미상' ? student.class + '반 ' : ''}${student.number ? student.number + '번 ' : ''}${student.name}
            </div>
            <div style="display:flex;gap:1.5rem;flex-wrap:wrap;font-size:0.88rem;background:rgba(74,222,128,0.08);padding:0.8rem 1rem;border-radius:8px;">
                <span>이수단위 가중평균: <strong style="color:#4ade80;">${sc.avg10.toFixed(4)}</strong> / 10</span>
                <span>교과정량: <strong style="color:#fbbf24;font-size:1rem;">${sc.score700.toFixed(3)} / 700</strong></span>
                <span style="color:#94a3b8;">실제 환산: ${sc.avg10.toFixed(4)} × 70 = ${sc.score700.toFixed(3)}</span>
            </div>
            <p style="font-size:0.78rem;color:#64748b;margin:0.5rem 0 0;">
                ※ 반영교과(국·수·영·사·과·한국사) 공통/일반선택과목만 반영 / 진로선택과목은 교과정성(300점)에서만 반영 / 교과정성 별도
            </p>
        </div>
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                <thead>
                    <tr style="background:rgba(74,222,128,0.1);">
                        <th style="padding:0.6rem 0.8rem;color:#86efac;text-align:left;">과목유형</th>
                        <th style="padding:0.6rem 0.8rem;color:#86efac;text-align:left;">교과</th>
                        <th style="padding:0.6rem 0.8rem;color:#86efac;text-align:left;">과목명</th>
                        <th style="padding:0.6rem 0.8rem;color:#86efac;text-align:center;">이수단위</th>
                        <th style="padding:0.6rem 0.8rem;color:#86efac;text-align:center;">등급/성취도</th>
                        <th style="padding:0.6rem 0.8rem;color:#86efac;text-align:right;">기준점수</th>
                    </tr>
                </thead>
                <tbody>${detailRows}</tbody>
            </table>
        </div>`;
}

function buildUOSDetailHTML(student, sc) {
    const typeColors = {
        '공통/일반': '#818cf8',
        '진로선택':  '#a78bfa'
    };

    const detailRows = sc.details.map(d => {
        const gc = typeColors[d.type] || '#475569';
        return `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.1);">
            <td style="padding:0.55rem 0.8rem;"><span style="color:${gc};font-size:0.8rem;font-weight:600;">${d.type}</span></td>
            <td style="padding:0.55rem 0.8rem;color:#94a3b8;font-size:0.8rem;">${d.category || '-'}</td>
            <td style="padding:0.55rem 0.8rem;font-weight:500;">${d.subject}</td>
            <td style="padding:0.55rem 0.8rem;text-align:center;">${d.credit}</td>
            <td style="padding:0.55rem 0.8rem;text-align:center;color:#60a5fa;">${d.rank ? d.rank + '등급' : (d.ach || '-')}</td>
            <td style="padding:0.55rem 0.8rem;text-align:right;color:#fbbf24;">${d.score}</td>
        </tr>`;
    }).join('');

    const achFormula = sc.achCredit > 0
        ? `공통/일반 ${sc.avgRank.toFixed(4)} × 7 + 진로선택 ${sc.avgAch.toFixed(4)} × 1`
        : `공통/일반 ${sc.avgRank.toFixed(4)} × 8 (진로선택 없음)`;

    return `
        <div style="margin-bottom:1.2rem;">
            <div style="font-size:1.1rem;font-weight:700;color:#f1f5f9;margin-bottom:0.6rem;">
                ${student.class !== '미상' ? student.class + '반 ' : ''}${student.number ? student.number + '번 ' : ''}${student.name}
            </div>
            <div style="display:flex;gap:1.5rem;flex-wrap:wrap;font-size:0.88rem;background:rgba(99,102,241,0.1);padding:0.8rem 1rem;border-radius:8px;">
                <span>공통/일반 가중평균: <strong style="color:#818cf8;">${sc.avgRank.toFixed(4)}</strong></span>
                <span>진로선택 가중평균: <strong style="color:#a78bfa;">${sc.achCredit > 0 ? sc.avgAch.toFixed(4) : '없음'}</strong></span>
                <span>교과 점수: <strong style="color:#fbbf24;font-size:1rem;">${sc.finalScore.toFixed(4)} / 800</strong></span>
            </div>
            <p style="font-size:0.78rem;color:#64748b;margin:0.5rem 0 0;">
                ※ ${achFormula} / 전교과 반영 (교과군 제한 없음) / 교과 정성평가 200점 별도
            </p>
        </div>
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                <thead>
                    <tr style="background:rgba(99,102,241,0.2);">
                        <th style="padding:0.6rem 0.8rem;color:#a5b4fc;text-align:left;">과목유형</th>
                        <th style="padding:0.6rem 0.8rem;color:#a5b4fc;text-align:left;">교과</th>
                        <th style="padding:0.6rem 0.8rem;color:#a5b4fc;text-align:left;">과목명</th>
                        <th style="padding:0.6rem 0.8rem;color:#a5b4fc;text-align:center;">이수단위</th>
                        <th style="padding:0.6rem 0.8rem;color:#a5b4fc;text-align:center;">등급/성취도</th>
                        <th style="padding:0.6rem 0.8rem;color:#a5b4fc;text-align:right;">환산점수</th>
                    </tr>
                </thead>
                <tbody>${detailRows}</tbody>
            </table>
        </div>`;
}

function buildHUFSDetailHTML(student, sc) {
    const typeColors = {
        '공통/일반': '#60a5fa',
        '진로선택':  '#a78bfa'
    };

    const detailRows = sc.details.map(d => {
        const isExcluded = d.type === null;
        const gc    = typeColors[d.type] || '#475569';
        const label = d.type || (d.reason || '미반영');

        let rankCell, rawCell, finalCell;
        if (d.type === '공통/일반') {
            const usedRank = !d.usedRaw;
            const usedRaw  = d.usedRaw;
            rankCell  = `<td style="padding:0.55rem 0.7rem;text-align:right;${usedRank ? 'color:#fbbf24;font-weight:700;' : 'color:#94a3b8;'}">${d.rankScore !== null ? d.rankScore : '-'}</td>`;
            rawCell   = d.rawScore !== null
                ? `<td style="padding:0.55rem 0.7rem;text-align:right;${usedRaw ? 'color:#fbbf24;font-weight:700;' : 'color:#94a3b8;'}">${d.rawScore} <span style="color:#64748b;font-size:0.75rem;">(${d.raw}점)</span></td>`
                : `<td style="padding:0.55rem 0.7rem;text-align:right;color:#475569;">-</td>`;
            finalCell = `<td style="padding:0.55rem 0.7rem;text-align:right;color:#34d399;font-weight:600;">${d.finalScore}</td>`;
        } else if (d.type === '진로선택') {
            rankCell  = `<td style="padding:0.55rem 0.7rem;text-align:right;color:#475569;">-</td>`;
            rawCell   = `<td style="padding:0.55rem 0.7rem;text-align:right;color:#475569;">-</td>`;
            finalCell = `<td style="padding:0.55rem 0.7rem;text-align:right;color:#34d399;font-weight:600;">${d.finalScore}</td>`;
        } else {
            rankCell  = `<td style="padding:0.55rem 0.7rem;text-align:right;color:#475569;">-</td>`;
            rawCell   = `<td style="padding:0.55rem 0.7rem;text-align:right;color:#475569;">-</td>`;
            finalCell = `<td style="padding:0.55rem 0.7rem;text-align:right;color:#475569;">-</td>`;
        }

        return `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.1);${isExcluded ? 'opacity:0.4;' : ''}">
            <td style="padding:0.55rem 0.7rem;"><span style="color:${gc};font-size:0.8rem;font-weight:600;">${label}</span></td>
            <td style="padding:0.55rem 0.7rem;color:#94a3b8;font-size:0.8rem;">${d.category || '-'}</td>
            <td style="padding:0.55rem 0.7rem;font-weight:500;">${d.subject}</td>
            <td style="padding:0.55rem 0.7rem;text-align:center;">${d.credit}</td>
            <td style="padding:0.55rem 0.7rem;text-align:center;color:#60a5fa;">${d.rank ? d.rank + '등급' : (d.ach || '-')}</td>
            ${rankCell}${rawCell}${finalCell}
        </tr>`;
    }).join('');

    return `
        <div style="margin-bottom:1.2rem;">
            <div style="font-size:1.1rem;font-weight:700;color:#f1f5f9;margin-bottom:0.6rem;">
                ${student.class !== '미상' ? student.class + '반 ' : ''}${student.number ? student.number + '번 ' : ''}${student.name}
            </div>
            <div style="display:flex;gap:1.5rem;flex-wrap:wrap;font-size:0.88rem;background:rgba(6,182,212,0.1);padding:0.8rem 1rem;border-radius:8px;">
                <span>총 이수단위: <strong style="color:#67e8f9;">${sc.totalCredit}</strong></span>
                <span>교과 점수: <strong style="color:#fbbf24;font-size:1rem;">${sc.finalScore.toFixed(6)} / 1000</strong></span>
            </div>
            <p style="font-size:0.78rem;color:#64748b;margin:0.5rem 0 0;">
                ※ 공통/일반: max(등급환산, 원점수환산) / 진로선택: A=1000·B=960·C=890 / 단일 이수단위 가중평균<br>
                ※ <span style="color:#fbbf24;">굵은 노랑</span> = 실제 적용값, 원점수 없으면 등급환산만 사용
            </p>
        </div>
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                <thead>
                    <tr style="background:rgba(6,182,212,0.15);">
                        <th style="padding:0.6rem 0.7rem;color:#67e8f9;text-align:left;">과목유형</th>
                        <th style="padding:0.6rem 0.7rem;color:#67e8f9;text-align:left;">교과</th>
                        <th style="padding:0.6rem 0.7rem;color:#67e8f9;text-align:left;">과목명</th>
                        <th style="padding:0.6rem 0.7rem;color:#67e8f9;text-align:center;">이수단위</th>
                        <th style="padding:0.6rem 0.7rem;color:#67e8f9;text-align:center;">등급/성취도</th>
                        <th style="padding:0.6rem 0.7rem;color:#67e8f9;text-align:right;white-space:nowrap;">등급환산</th>
                        <th style="padding:0.6rem 0.7rem;color:#67e8f9;text-align:right;white-space:nowrap;">원점수환산</th>
                        <th style="padding:0.6rem 0.7rem;color:#67e8f9;text-align:right;white-space:nowrap;">적용점수</th>
                    </tr>
                </thead>
                <tbody>${detailRows}</tbody>
            </table>
        </div>`;
}

function buildSSUDetailHTML(student, sc) {
    const best = sc.results[sc.bestKey];

    function makeContribLine(tcKey, res) {
        const tc = SSU_TYPES.find(t => t.key === tcKey);
        return SSU_GK_ORDER
            .filter(k => (tc.w[k] || 0) > 0)
            .map(k => `${SSU_GK_LABEL[k]}(${(tc.w[k]*100).toFixed(0)}%): <span style="color:#fbbf24;">${res.contrib[k].toFixed(5)}</span>`)
            .join(' · ');
    }

    function makeFullSection(tcKey, res, color) {
        const tc = SSU_TYPES.find(t => t.key === tcKey);
        const groupRows = SSU_GK_ORDER.map(k => {
            const wt = tc.w[k] || 0;
            if (wt === 0) return '';
            const gd = res.g[k];
            const avg = gd.crd > 0 ? gd.pts / gd.crd : 0;
            const achAvg = gd.achCrd > 0 ? gd.achPts / gd.achCrd : null;
            return `<tr style="border-bottom:1px solid rgba(148,163,184,0.08);">
                <td style="padding:0.38rem 0.7rem;color:#94a3b8;font-size:0.78rem;">${SSU_GK_LABEL[k]}</td>
                <td style="padding:0.38rem 0.7rem;text-align:center;color:#60a5fa;font-size:0.78rem;">${(wt*100).toFixed(0)}%</td>
                <td style="padding:0.38rem 0.7rem;text-align:center;font-size:0.78rem;">${gd.crd}</td>
                <td style="padding:0.38rem 0.7rem;text-align:right;color:#e2e8f0;font-size:0.78rem;">${avg.toFixed(5)}</td>
                <td style="padding:0.38rem 0.7rem;text-align:right;color:#fbbf24;font-size:0.78rem;">${res.contrib[k].toFixed(5)}</td>
                <td style="padding:0.38rem 0.7rem;text-align:center;color:#a78bfa;font-size:0.78rem;">${achAvg !== null ? `진로${gd.achCnt}과목 avg:${achAvg.toFixed(3)}` : '-'}</td>
            </tr>`;
        }).join('');

        const subjectRows = res.selected.map(d => {
            const gc = d.type === '공통/일반' ? '#60a5fa' : '#a78bfa';
            return `<tr style="border-bottom:1px solid rgba(148,163,184,0.07);">
                <td style="padding:0.35rem 0.6rem;"><span style="color:${gc};font-size:0.74rem;">${d.type}</span></td>
                <td style="padding:0.35rem 0.6rem;color:#94a3b8;font-size:0.74rem;">${d.category||'-'}</td>
                <td style="padding:0.35rem 0.6rem;font-size:0.8rem;">${d.subject}</td>
                <td style="padding:0.35rem 0.6rem;text-align:center;font-size:0.78rem;">${d.credit}</td>
                <td style="padding:0.35rem 0.6rem;text-align:center;color:#60a5fa;font-size:0.78rem;">${d.rank ? d.rank+'등급' : d.ach}</td>
                <td style="padding:0.35rem 0.6rem;text-align:right;color:#fbbf24;font-size:0.78rem;">${d.score}</td>
            </tr>`;
        }).join('');

        const achDesc = res.achCrd > 0
            ? `진로선택 ${res.achCnt}과목 이수 → 최대취득비율 ${res.capRate}% / 20%`
            : '진로선택 없음';

        return `
            <div style="margin-bottom:0.4rem;font-size:0.84rem;">
                공통/일반 <span style="color:#60a5fa;">${res.commonScore.toFixed(3)}</span>
                + 진로선택 <span style="color:#a78bfa;">${res.achScore.toFixed(3)}</span>
                = <strong style="color:#fbbf24;">${res.finalScore.toFixed(3)}</strong>
                <span style="color:#64748b;font-size:0.75rem;margin-left:0.5rem;">${achDesc}</span>
            </div>
            <table style="width:100%;border-collapse:collapse;margin-bottom:0.6rem;">
                <thead><tr style="background:rgba(255,255,255,0.04);">
                    <th style="padding:0.38rem 0.7rem;color:#94a3b8;text-align:left;font-size:0.76rem;">교과군</th>
                    <th style="padding:0.38rem 0.7rem;color:#94a3b8;text-align:center;font-size:0.76rem;">가중치</th>
                    <th style="padding:0.38rem 0.7rem;color:#94a3b8;text-align:center;font-size:0.76rem;">이수단위</th>
                    <th style="padding:0.38rem 0.7rem;color:#94a3b8;text-align:right;font-size:0.76rem;">등급평균</th>
                    <th style="padding:0.38rem 0.7rem;color:#94a3b8;text-align:right;font-size:0.76rem;">기여(5절사)</th>
                    <th style="padding:0.38rem 0.7rem;color:#94a3b8;text-align:center;font-size:0.76rem;">진로선택</th>
                </tr></thead>
                <tbody>${groupRows}</tbody>
            </table>
            <table style="width:100%;border-collapse:collapse;margin-bottom:1rem;">
                <thead><tr style="background:rgba(255,255,255,0.03);">
                    <th style="padding:0.38rem 0.6rem;color:#94a3b8;text-align:left;font-size:0.75rem;">유형</th>
                    <th style="padding:0.38rem 0.6rem;color:#94a3b8;text-align:left;font-size:0.75rem;">교과</th>
                    <th style="padding:0.38rem 0.6rem;color:#94a3b8;text-align:left;font-size:0.75rem;">과목명</th>
                    <th style="padding:0.38rem 0.6rem;color:#94a3b8;text-align:center;font-size:0.75rem;">이수단위</th>
                    <th style="padding:0.38rem 0.6rem;color:#94a3b8;text-align:center;font-size:0.75rem;">등급/성취도</th>
                    <th style="padding:0.38rem 0.6rem;color:#94a3b8;text-align:right;font-size:0.75rem;">점수</th>
                </tr></thead>
                <tbody>${subjectRows}</tbody>
            </table>`;
    }

    const scoresHtml = SSU_TYPES.map(tc => {
        const r = sc.results[tc.key];
        const isBest = tc.key === sc.bestKey;
        return `<span>${tc.label}: <strong style="color:${isBest ? '#fbbf24' : '#94a3b8'};">${r.finalScore.toFixed(3)}</strong>${isBest ? ' ★' : ''}</span>`;
    }).join('');

    const othersHtml = SSU_TYPES.filter(tc => tc.key !== sc.bestKey).map(tc => {
        const r = sc.results[tc.key];
        return `
            <div style="padding:0.45rem 0.8rem;background:rgba(255,255,255,0.025);border-radius:5px;margin-bottom:0.35rem;">
                <span style="font-size:0.82rem;color:#64748b;">${r.label}</span>
                <strong style="color:#94a3b8;margin-left:0.5rem;">${r.finalScore.toFixed(3)}</strong>
                <span style="color:#475569;font-size:0.72rem;margin-left:0.5rem;">(공통 ${r.commonScore.toFixed(3)} + 진로 ${r.achScore.toFixed(3)})</span>
                <div style="font-size:0.72rem;color:#475569;margin-top:0.15rem;">${makeContribLine(tc.key, r)}</div>
            </div>`;
    }).join('');

    const notInBest = best.unselected;
    const othersRows = notInBest.map(d => `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.06);opacity:0.4;">
            <td style="padding:0.38rem 0.7rem;color:#475569;font-size:0.78rem;">${d.reason||'미반영'}</td>
            <td style="padding:0.38rem 0.7rem;color:#94a3b8;font-size:0.78rem;">${d.category||'-'}</td>
            <td style="padding:0.38rem 0.7rem;font-size:0.8rem;">${d.subject}</td>
            <td style="padding:0.38rem 0.7rem;text-align:center;color:#64748b;font-size:0.78rem;">${d.rank ? d.rank+'등급' : (d.ach||'-')}</td>
        </tr>`).join('');

    return `
        <div style="margin-bottom:1.2rem;">
            <div style="font-size:1.1rem;font-weight:700;color:#f1f5f9;margin-bottom:0.6rem;">
                ${student.class !== '미상' ? student.class+'반 ' : ''}${student.number ? student.number+'번 ' : ''}${student.name}
            </div>
            <div style="display:flex;gap:1rem;flex-wrap:wrap;font-size:0.86rem;background:rgba(168,85,247,0.08);padding:0.8rem 1rem;border-radius:8px;">
                ${scoresHtml}
                <span style="margin-left:auto;">대표 점수: <strong style="color:#fbbf24;font-size:1rem;">${sc.displayScore.toFixed(3)} / 100</strong></span>
            </div>
            <p style="font-size:0.77rem;color:#64748b;margin:0.4rem 0 0;">
                ※ 공통/일반선택: Σ[등급가중평균×교과군가중치] × 8 (소수6자리 절사 후 4자리 절사) / 진로선택: 평균×2×(cap/20%) / ★ = 최고점 계열
            </p>
        </div>
        <div style="overflow-x:auto;">
            <div style="font-size:0.85rem;font-weight:600;color:#a855f7;margin-bottom:0.5rem;">
                ◆ ${best.label} (최고점) — ${best.finalScore.toFixed(3)}점
            </div>
            ${makeFullSection(sc.bestKey, best, '#a855f7')}
            ${othersHtml.length > 0 ? `
            <div style="font-size:0.82rem;color:#64748b;margin:0.3rem 0 0.4rem;">기타 계열 요약</div>
            ${othersHtml}` : ''}
            ${notInBest.length > 0 ? `
            <div style="font-size:0.82rem;color:#64748b;margin-top:0.6rem;margin-bottom:0.3rem;">반영교과 외 (최고점 계열 기준)</div>
            <table style="width:100%;border-collapse:collapse;font-size:0.8rem;">
                <thead><tr style="background:rgba(255,255,255,0.02);">
                    <th style="padding:0.38rem 0.7rem;color:#475569;text-align:left;">사유</th>
                    <th style="padding:0.38rem 0.7rem;color:#475569;text-align:left;">교과</th>
                    <th style="padding:0.38rem 0.7rem;color:#475569;text-align:left;">과목명</th>
                    <th style="padding:0.38rem 0.7rem;color:#475569;text-align:center;">등급/성취도</th>
                </tr></thead>
                <tbody>${othersRows}</tbody>
            </table>` : ''}
        </div>`;
}

function buildKMUDetailHTML(student, sc) {
    const isHumanBetter = sc.human.finalScore >= sc.sci.finalScore;

    function makeSection(label, res, color) {
        const rankRows = res.selected.map(d => `
            <tr style="border-bottom:1px solid rgba(148,163,184,0.1);">
                <td style="padding:0.45rem 0.7rem;"><span style="color:#60a5fa;font-size:0.8rem;font-weight:600;">공통/일반</span></td>
                <td style="padding:0.45rem 0.7rem;color:#94a3b8;font-size:0.8rem;">${d.category || '-'}</td>
                <td style="padding:0.45rem 0.7rem;font-weight:500;">${d.subject}</td>
                <td style="padding:0.45rem 0.7rem;text-align:center;">${d.credit}</td>
                <td style="padding:0.45rem 0.7rem;text-align:center;color:#60a5fa;">${d.rank}등급</td>
                <td style="padding:0.45rem 0.7rem;text-align:right;color:#fbbf24;">${d.score}</td>
            </tr>`).join('');

        const achRows = res.achTop3.map(d => `
            <tr style="border-bottom:1px solid rgba(148,163,184,0.1);">
                <td style="padding:0.45rem 0.7rem;"><span style="color:#a78bfa;font-size:0.8rem;font-weight:600;">진로선택(반영)</span></td>
                <td style="padding:0.45rem 0.7rem;color:#94a3b8;font-size:0.8rem;">${d.category || '-'}</td>
                <td style="padding:0.45rem 0.7rem;font-weight:500;">${d.subject}</td>
                <td style="padding:0.45rem 0.7rem;text-align:center;">${d.credit}</td>
                <td style="padding:0.45rem 0.7rem;text-align:center;color:#a78bfa;">${d.ach}</td>
                <td style="padding:0.45rem 0.7rem;text-align:right;color:#fbbf24;">${d.score}</td>
            </tr>`).join('');

        const achRestRows = res.achRest.map(d => `
            <tr style="border-bottom:1px solid rgba(148,163,184,0.07);opacity:0.4;">
                <td style="padding:0.45rem 0.7rem;"><span style="color:#475569;font-size:0.8rem;">진로선택(미선택)</span></td>
                <td style="padding:0.45rem 0.7rem;color:#94a3b8;font-size:0.8rem;">${d.category || '-'}</td>
                <td style="padding:0.45rem 0.7rem;">${d.subject}</td>
                <td style="padding:0.45rem 0.7rem;text-align:center;">${d.credit}</td>
                <td style="padding:0.45rem 0.7rem;text-align:center;color:#64748b;">${d.ach}</td>
                <td style="padding:0.45rem 0.7rem;text-align:right;color:#475569;">-</td>
            </tr>`).join('');

        const formula = res.achCredit > 0
            ? `${res.avgRank.toFixed(3)}×8.5 + ${res.avgAch.toFixed(3)}×1.5`
            : `${res.avgRank.toFixed(3)}×10 (진로없음)`;

        return `
            <div style="margin-bottom:0.5rem;font-size:0.87rem;font-weight:600;color:${color};">
                ${label} — 교과점수: <strong style="color:#fbbf24;">${res.finalScore.toFixed(2)} / 1000</strong>
                <span style="color:#64748b;font-size:0.78rem;font-weight:400;margin-left:0.5rem;">${formula}</span>
            </div>
            <div style="font-size:0.77rem;color:#64748b;margin-bottom:0.5rem;">
                공통/일반 가중평균: ${res.avgRank.toFixed(4)}${res.achCredit > 0 ? ` / 진로선택 가중평균: ${res.avgAch.toFixed(4)} (상위${res.achTop3.length}과목)` : ' / 진로선택: 없음'}
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:0.83rem;margin-bottom:1rem;">
                <thead><tr style="background:rgba(255,255,255,0.05);">
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:left;">유형</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:left;">교과</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:left;">과목명</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:center;">이수단위</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:center;">등급/성취도</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:right;">환산점수</th>
                </tr></thead>
                <tbody>${rankRows}${achRows}${achRestRows}</tbody>
            </table>`;
    }

    const othersData = sc.human.unselected
        .filter(d => !sc.sci.selected.find(s => s.subject === d.subject));
    const othersRows = othersData.map(d => `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.07);opacity:0.4;">
            <td style="padding:0.45rem 0.7rem;color:#475569;font-size:0.8rem;">${d.reason || '미반영'}</td>
            <td style="padding:0.45rem 0.7rem;color:#94a3b8;font-size:0.8rem;">${d.category || '-'}</td>
            <td style="padding:0.45rem 0.7rem;">${d.subject}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;color:#64748b;">${d.rank ? d.rank + '등급' : (d.ach || '-')}</td>
            <td style="padding:0.45rem 0.7rem;text-align:right;color:#475569;">-</td>
        </tr>`).join('');

    return `
        <div style="margin-bottom:1.2rem;">
            <div style="font-size:1.1rem;font-weight:700;color:#f1f5f9;margin-bottom:0.6rem;">
                ${student.class !== '미상' ? student.class + '반 ' : ''}${student.number ? student.number + '번 ' : ''}${student.name}
            </div>
            <div style="display:flex;gap:1.5rem;flex-wrap:wrap;font-size:0.88rem;background:rgba(14,165,233,0.08);padding:0.8rem 1rem;border-radius:8px;">
                <span>인문계열: <strong style="color:#0ea5e9;">${sc.human.finalScore.toFixed(2)}</strong>${isHumanBetter ? ' ★' : ''}</span>
                <span>자연계열: <strong style="color:#38bdf8;">${sc.sci.finalScore.toFixed(2)}</strong>${!isHumanBetter ? ' ★' : ''}</span>
                <span>대표 점수: <strong style="color:#fbbf24;font-size:1rem;">${sc.displayScore.toFixed(2)} / 1000</strong></span>
            </div>
            <p style="font-size:0.78rem;color:#64748b;margin:0.5rem 0 0;">
                ※ 공식: 공통/일반가중평균×8.5 + 진로선택가중평균×1.5 (진로없으면 ×10) / ★ = 높은 값(대표 점수)
            </p>
        </div>
        <div style="overflow-x:auto;">
            ${makeSection('인문계열 (국어·수학·영어·사회)', sc.human, '#0ea5e9')}
            ${makeSection('자연계열 (국어·수학·영어·과학)', sc.sci, '#38bdf8')}
            ${othersData.length > 0 ? `
            <div style="margin-bottom:0.4rem;font-size:0.82rem;color:#64748b;">반영교과 외</div>
            <table style="width:100%;border-collapse:collapse;font-size:0.83rem;">
                <thead><tr style="background:rgba(255,255,255,0.03);">
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:left;" colspan="2">사유 / 교과</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:left;">과목명</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:center;">등급/성취도</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:right;">-</th>
                </tr></thead>
                <tbody>${othersRows}</tbody>
            </table>` : ''}
        </div>`;
}

function buildSJUDetailHTML(student, sc) {
    const best = sc.results[sc.bestKey];
    const color = '#10b981';

    function makeFullSection(tcKey, res) {
        const rankRows = res.selected.filter(d => d.kind === '공통/일반').map(d => `
            <tr style="border-bottom:1px solid rgba(148,163,184,0.07);">
                <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#60a5fa;">공통/일반</td>
                <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#94a3b8;">${d.category || '-'}</td>
                <td style="padding:0.45rem 0.7rem;">${d.subject}</td>
                <td style="padding:0.45rem 0.7rem;text-align:center;">${d.credit}</td>
                <td style="padding:0.45rem 0.7rem;text-align:center;">${d.rank}등급</td>
                <td style="padding:0.45rem 0.7rem;text-align:right;color:#fbbf24;">${d.score}</td>
            </tr>`).join('');
        const achRows = res.selected.filter(d => d.kind === '진로선택').map(d => `
            <tr style="border-bottom:1px solid rgba(148,163,184,0.07);">
                <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#a78bfa;">진로선택</td>
                <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#94a3b8;">${d.category || '-'}</td>
                <td style="padding:0.45rem 0.7rem;">${d.subject}</td>
                <td style="padding:0.45rem 0.7rem;text-align:center;">${d.credit}</td>
                <td style="padding:0.45rem 0.7rem;text-align:center;">${d.ach}</td>
                <td style="padding:0.45rem 0.7rem;text-align:right;color:#fbbf24;">${d.score}</td>
            </tr>`).join('');
        return `
            <table style="width:100%;border-collapse:collapse;font-size:0.83rem;margin-bottom:0.8rem;">
                <thead><tr style="background:rgba(255,255,255,0.05);">
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:left;">유형</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:left;">교과</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:left;">과목명</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:center;">이수단위</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:center;">등급/성취도</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:right;">환산점수</th>
                </tr></thead>
                <tbody>${rankRows}${achRows}</tbody>
            </table>`;
    }

    function makeCompactSection(tcKey, res) {
        const formula = res.achCrd === 0
            ? `공통 ${res.rankAvg.toFixed(2)} × 1.0 (진로없음)`
            : `공통 ${res.rankAvg.toFixed(2)}×0.8 + 진로 ${res.achAvg.toFixed(2)}×0.2`;
        return `<div style="font-size:0.82rem;color:#94a3b8;margin-bottom:0.3rem;">
            ${res.label}: <strong style="color:#f1f5f9;">${res.finalScore.toFixed(2)}</strong>
            <span style="color:#64748b;margin-left:0.5rem;">${formula}</span>
        </div>`;
    }

    const typeScores = SJU_TYPES.map(tc => {
        const res = sc.results[tc.key];
        const isBest = tc.key === sc.bestKey;
        return `<span>${res.label}: <strong style="color:${isBest ? '#fbbf24' : '#f1f5f9'};">${res.finalScore.toFixed(2)}</strong>${isBest ? ' ★' : ''}</span>`;
    }).join('');

    const othersData = best.unselected.filter(d => d.reason !== '제외교과');
    const othersRows = othersData.map(d => `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.07);opacity:0.4;">
            <td style="padding:0.45rem 0.7rem;color:#475569;font-size:0.8rem;">${d.reason || '미반영'}</td>
            <td style="padding:0.45rem 0.7rem;color:#94a3b8;font-size:0.8rem;">${d.category || '-'}</td>
            <td style="padding:0.45rem 0.7rem;">${d.subject}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;color:#64748b;">${d.rank ? d.rank + '등급' : (d.ach || '-')}</td>
            <td style="padding:0.45rem 0.7rem;text-align:right;color:#475569;">-</td>
        </tr>`).join('');

    const formula = best.achCrd === 0
        ? `${best.rankAvg.toFixed(2)} × 1.0 (진로없음)`
        : `${best.rankAvg.toFixed(2)}×0.8 + ${best.achAvg.toFixed(2)}×0.2`;

    const compactSections = SJU_TYPES
        .filter(tc => tc.key !== sc.bestKey)
        .map(tc => makeCompactSection(tc.key, sc.results[tc.key]))
        .join('');

    return `
        <div style="margin-bottom:1.2rem;">
            <div style="font-size:1.1rem;font-weight:700;color:#f1f5f9;margin-bottom:0.6rem;">
                ${student.class !== '미상' ? student.class + '반 ' : ''}${student.number ? student.number + '번 ' : ''}${student.name}
            </div>
            <div style="display:flex;gap:1.5rem;flex-wrap:wrap;font-size:0.88rem;background:rgba(16,185,129,0.08);padding:0.8rem 1rem;border-radius:8px;">
                ${typeScores}
                <span>대표 점수: <strong style="color:#fbbf24;font-size:1rem;">${sc.displayScore.toFixed(2)} / 1000</strong></span>
            </div>
            <p style="font-size:0.78rem;color:#64748b;margin:0.5rem 0 0;">
                ※ 공식: 공통/일반가중평균×0.8 + 진로선택가중평균×0.2 (진로없으면 ×1.0) / ★ = 높은 값(대표 점수)
            </p>
        </div>
        <div style="overflow-x:auto;">
            <div style="margin-bottom:0.5rem;font-size:0.87rem;font-weight:600;color:${color};">
                ★ ${best.label} — 교과점수: <strong style="color:#fbbf24;">${best.finalScore.toFixed(2)} / 1000</strong>
                <span style="color:#64748b;font-size:0.78rem;font-weight:400;margin-left:0.5rem;">${formula}</span>
            </div>
            <div style="font-size:0.77rem;color:#64748b;margin-bottom:0.5rem;">
                공통/일반 가중평균: ${best.rankAvg.toFixed(4)} (이수단위합 ${best.rankCrd})${best.achCrd > 0 ? ` / 진로선택 가중평균: ${best.achAvg.toFixed(4)} (이수단위합 ${best.achCrd})` : ' / 진로선택: 없음'}
            </div>
            ${makeFullSection(sc.bestKey, best)}
            ${compactSections ? `<div style="border-top:1px solid rgba(148,163,184,0.1);padding-top:0.7rem;margin-top:0.3rem;">${compactSections}</div>` : ''}
            ${othersData.length > 0 ? `
            <div style="margin-top:0.7rem;margin-bottom:0.4rem;font-size:0.82rem;color:#64748b;">반영교과 외 (최고점 계열 기준)</div>
            <table style="width:100%;border-collapse:collapse;font-size:0.83rem;">
                <thead><tr style="background:rgba(255,255,255,0.03);">
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:left;" colspan="2">사유 / 교과</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:left;">과목명</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:center;">등급/성취도</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:right;">-</th>
                </tr></thead>
                <tbody>${othersRows}</tbody>
            </table>` : ''}
        </div>`;
}

function buildDKUDetailHTML(student, sc) {
    const color = '#f97316';

    const rankRows = sc.selected.filter(d => d.rank > 0).map(d => `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.07);">
            <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#60a5fa;">공통/일반</td>
            <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#94a3b8;">${d.category || '-'}</td>
            <td style="padding:0.45rem 0.7rem;">${d.subject}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;">${d.credit}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;">${d.rank}등급</td>
            <td style="padding:0.45rem 0.7rem;text-align:right;color:#fbbf24;">${d.score}</td>
        </tr>`).join('');

    const achRows = sc.selected.filter(d => !(d.rank > 0)).map(d => `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.07);">
            <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#a78bfa;">진로선택</td>
            <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#94a3b8;">${d.category || '-'}</td>
            <td style="padding:0.45rem 0.7rem;">${d.subject}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;">${d.credit}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;">${d.ach} → ${d.effectiveRank}등급</td>
            <td style="padding:0.45rem 0.7rem;text-align:right;color:#fbbf24;">${d.score}</td>
        </tr>`).join('');

    const othersRows = sc.unselected.filter(d => d.reason !== '제외교과').map(d => `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.07);opacity:0.4;">
            <td style="padding:0.45rem 0.7rem;color:#475569;font-size:0.8rem;">${d.reason || '미반영'}</td>
            <td style="padding:0.45rem 0.7rem;color:#94a3b8;font-size:0.8rem;">${d.category || '-'}</td>
            <td style="padding:0.45rem 0.7rem;">${d.subject}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;color:#64748b;">${d.rank ? d.rank + '등급' : (d.ach || '-')}</td>
            <td style="padding:0.45rem 0.7rem;text-align:right;color:#475569;">-</td>
        </tr>`).join('');

    return `
        <div style="margin-bottom:1.2rem;">
            <div style="font-size:1.1rem;font-weight:700;color:#f1f5f9;margin-bottom:0.6rem;">
                ${student.class !== '미상' ? student.class + '반 ' : ''}${student.number ? student.number + '번 ' : ''}${student.name}
            </div>
            <div style="display:flex;gap:1.5rem;flex-wrap:wrap;font-size:0.88rem;background:rgba(249,115,22,0.08);padding:0.8rem 1rem;border-radius:8px;">
                <span>가중평균(100점 기준): <strong style="color:#fdba74;">${sc.avg.toFixed(4)}</strong></span>
                <span>이수단위 합계: <strong style="color:#fdba74;">${sc.crd}</strong></span>
                <span>교과 점수 (×0.95): <strong style="color:#fbbf24;font-size:1rem;">${sc.finalScore.toFixed(3)} / 95</strong></span>
            </div>
            <p style="font-size:0.78rem;color:#64748b;margin:0.5rem 0 0;">
                ※ 반영교과: 국어·영어·수학·사회(한국사포함)·과학 / 진로선택: A→1등급·B→3등급·C→5등급<br>
                ※ 공식: 가중평균 × 0.95 (소수점 4번째 자리 반올림) / 비교과(출결) 5점 별도
            </p>
        </div>
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:0.83rem;margin-bottom:0.8rem;">
                <thead><tr style="background:rgba(255,255,255,0.05);">
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:left;">유형</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:left;">교과</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:left;">과목명</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:center;">이수단위</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:center;">등급/성취도</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:right;">등급점수</th>
                </tr></thead>
                <tbody>${rankRows}${achRows}</tbody>
            </table>
            ${sc.unselected.filter(d => d.reason !== '제외교과').length > 0 ? `
            <div style="margin-bottom:0.4rem;font-size:0.82rem;color:#64748b;">반영교과 외</div>
            <table style="width:100%;border-collapse:collapse;font-size:0.83rem;">
                <thead><tr style="background:rgba(255,255,255,0.03);">
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:left;" colspan="2">사유 / 교과</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:left;">과목명</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:center;">등급/성취도</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:right;">-</th>
                </tr></thead>
                <tbody>${othersRows}</tbody>
            </table>` : ''}
        </div>`;
}

window.mjuShowType = function(key, gradeScore, crd, finalScore) {
    ['human', 'sci', 'art'].forEach(k => {
        const el = document.getElementById('mju-detail-' + k);
        const btn = document.getElementById('mju-btn-' + k);
        if (el) el.style.display = k === key ? 'block' : 'none';
        if (btn) {
            const on = k === key;
            btn.style.background    = on ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.04)';
            btn.style.borderColor   = on ? 'rgba(139,92,246,0.6)' : 'rgba(255,255,255,0.1)';
            btn.style.color         = on ? '#c4b5fd' : '#64748b';
            btn.style.fontWeight    = on ? '700' : '400';
        }
    });
    const gEl = document.getElementById('mju-grade-display');
    const cEl = document.getElementById('mju-crd-display');
    const sEl = document.getElementById('mju-score-display');
    if (gEl) gEl.textContent = gradeScore;
    if (cEl) cEl.textContent = crd;
    if (sEl) sEl.textContent = finalScore;
};

function buildMJUDetailHTML(student, sc) {
    const best = sc.results[sc.bestKey];
    if (!best) return '<p style="color:#ef4444;">점수 계산 불가</p>';

    // 계열별 과목 상세 HTML 생성
    const typeDetailHTMLs = {};
    for (const tc of MJU_TYPES) {
        const r = sc.results[tc.key];
        if (!r) {
            typeDetailHTMLs[tc.key] = '<p style="color:#64748b;padding:0.5rem 0;">해당 계열 반영 과목 없음</p>';
            continue;
        }
        const rankRows = r.selected.filter(d => d.rank > 0).map(d => `
            <tr style="border-bottom:1px solid rgba(148,163,184,0.07);">
                <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#7dd3fc;">공통/일반</td>
                <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#94a3b8;">${d.category || '-'}</td>
                <td style="padding:0.45rem 0.7rem;">${d.subject}</td>
                <td style="padding:0.45rem 0.7rem;text-align:center;">${d.credit}</td>
                <td style="padding:0.45rem 0.7rem;text-align:center;">${d.rank}등급</td>
                <td style="padding:0.45rem 0.7rem;text-align:right;color:#fbbf24;">${d.score}</td>
            </tr>`).join('');
        const achRows = r.selected.filter(d => !(d.rank > 0)).map(d => `
            <tr style="border-bottom:1px solid rgba(148,163,184,0.07);">
                <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#a78bfa;">진로선택</td>
                <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#94a3b8;">${d.category || '-'}</td>
                <td style="padding:0.45rem 0.7rem;">${d.subject}</td>
                <td style="padding:0.45rem 0.7rem;text-align:center;">${d.credit}</td>
                <td style="padding:0.45rem 0.7rem;text-align:center;">${d.ach} → ${d.effectiveRank}등급</td>
                <td style="padding:0.45rem 0.7rem;text-align:right;color:#fbbf24;">${d.score}</td>
            </tr>`).join('');
        const othersRows = r.unselected.filter(d => d.reason !== '제외교과').map(d => `
            <tr style="border-bottom:1px solid rgba(148,163,184,0.07);opacity:0.4;">
                <td style="padding:0.45rem 0.7rem;color:#475569;font-size:0.8rem;" colspan="2">${d.reason || '미반영'} / ${d.category || '-'}</td>
                <td style="padding:0.45rem 0.7rem;">${d.subject}</td>
                <td style="padding:0.45rem 0.7rem;text-align:center;color:#64748b;">${d.credit}</td>
                <td style="padding:0.45rem 0.7rem;text-align:center;color:#64748b;">${d.rank ? d.rank + '등급' : (d.ach || '-')}</td>
                <td style="padding:0.45rem 0.7rem;text-align:right;color:#475569;">-</td>
            </tr>`).join('');
        typeDetailHTMLs[tc.key] = `
            <table style="width:100%;border-collapse:collapse;font-size:0.83rem;margin-bottom:0.8rem;">
                <thead><tr style="background:rgba(255,255,255,0.05);">
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:left;">유형</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:left;">교과</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:left;">과목명</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:center;">이수단위</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:center;">등급/성취도</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:right;">등급점수</th>
                </tr></thead>
                <tbody>${rankRows}${achRows}</tbody>
            </table>
            ${r.unselected.filter(d => d.reason !== '제외교과').length > 0 ? `
            <div style="margin-bottom:0.4rem;font-size:0.82rem;color:#64748b;">반영교과 외</div>
            <table style="width:100%;border-collapse:collapse;font-size:0.83rem;">
                <thead><tr style="background:rgba(255,255,255,0.03);">
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:left;" colspan="2">사유 / 교과</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:left;">과목명</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:center;">이수단위</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:center;">등급/성취도</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:right;">-</th>
                </tr></thead>
                <tbody>${othersRows}</tbody>
            </table>` : ''}`;
    }

    // 탭 버튼 (클릭 시 해당 계열 상세 표시)
    const tabButtons = MJU_TYPES.map(tc => {
        const r = sc.results[tc.key];
        const isBest = tc.key === sc.bestKey;
        const gs = r ? r.gradeScore.toFixed(3) : '0';
        const cr = r ? r.crd : 0;
        const fs = r ? r.finalScore.toFixed(3) : '0';
        return `<button id="mju-btn-${tc.key}" onclick="mjuShowType('${tc.key}','${gs}',${cr},'${fs}')"
            style="padding:0.5rem 1rem;border-radius:8px;cursor:pointer;font-size:0.8rem;text-align:center;line-height:1.7;
                   border:1px solid ${isBest ? 'rgba(139,92,246,0.6)' : 'rgba(255,255,255,0.1)'};
                   background:${isBest ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.04)'};
                   color:${isBest ? '#c4b5fd' : '#64748b'};font-weight:${isBest ? 700 : 400};">
            ${tc.label}<br>
            <span style="font-size:0.95rem;color:${isBest ? '#fbbf24' : '#475569'};font-weight:700;">${r ? r.finalScore.toFixed(3) : '-'}</span>
        </button>`;
    }).join('');

    // 계열별 상세 섹션
    const detailSections = MJU_TYPES.map(tc => `
        <div id="mju-detail-${tc.key}" style="display:${tc.key === sc.bestKey ? 'block' : 'none'};">
            ${typeDetailHTMLs[tc.key]}
        </div>`).join('');

    return `
        <div style="margin-bottom:1.2rem;">
            <div style="font-size:1.1rem;font-weight:700;color:#f1f5f9;margin-bottom:0.8rem;">
                ${student.class !== '미상' ? student.class + '반 ' : ''}${student.number ? student.number + '번 ' : ''}${student.name}
            </div>
            <div style="display:flex;gap:0.6rem;flex-wrap:wrap;margin-bottom:0.8rem;">
                ${tabButtons}
            </div>
            <div style="display:flex;gap:1.5rem;flex-wrap:wrap;font-size:0.88rem;background:rgba(139,92,246,0.08);padding:0.8rem 1rem;border-radius:8px;">
                <span>산출식 결과값: <strong id="mju-grade-display" style="color:#c4b5fd;">${best.gradeScore.toFixed(3)}</strong></span>
                <span>이수단위: <strong id="mju-crd-display" style="color:#c4b5fd;">${best.crd}</strong></span>
                <span>최종 점수 (×10): <strong id="mju-score-display" style="color:#fbbf24;font-size:1rem;">${best.finalScore.toFixed(3)}</strong></span>
            </div>
            <p style="font-size:0.78rem;color:#64748b;margin:0.5rem 0 0;">
                ※ 진로선택: A→1등급(100) · B→2등급(99) · C→4등급(94) / 이수단위 가산점(+0.05)으로 1000점 초과 가능
            </p>
        </div>
        <div style="overflow-x:auto;">
            ${detailSections}
        </div>`;
}

function buildKWUDetailHTML(student, sc) {
    const rankRows = sc.selected.filter(d => d.rank > 0).map(d => `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.07);">
            <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#7dd3fc;">공통/일반</td>
            <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#94a3b8;">${d.category || '-'}</td>
            <td style="padding:0.45rem 0.7rem;">${d.subject}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;">${d.credit}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;">${d.rank}등급</td>
            <td style="padding:0.45rem 0.7rem;text-align:right;color:#fbbf24;">${d.score}</td>
        </tr>`).join('');

    const achRows = sc.selected.filter(d => !(d.rank > 0)).map(d => `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.07);">
            <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#a78bfa;">진로선택</td>
            <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#94a3b8;">${d.category || '-'}</td>
            <td style="padding:0.45rem 0.7rem;">${d.subject}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;">${d.credit}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;">${d.ach} → ${d.effectiveRank}등급</td>
            <td style="padding:0.45rem 0.7rem;text-align:right;color:#fbbf24;">${d.score}</td>
        </tr>`).join('');

    const othersRows = sc.unselected.filter(d => d.reason !== '제외교과').map(d => `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.07);opacity:0.4;">
            <td style="padding:0.45rem 0.7rem;color:#475569;font-size:0.8rem;" colspan="2">${d.reason || '미반영'} / ${d.category || '-'}</td>
            <td style="padding:0.45rem 0.7rem;">${d.subject}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;color:#64748b;">${d.credit}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;color:#64748b;">${d.rank ? d.rank + '등급' : (d.ach || '-')}</td>
            <td style="padding:0.45rem 0.7rem;text-align:right;color:#475569;">-</td>
        </tr>`).join('');

    return `
        <div style="margin-bottom:1.2rem;">
            <div style="font-size:1.1rem;font-weight:700;color:#f1f5f9;margin-bottom:0.6rem;">
                ${student.class !== '미상' ? student.class + '반 ' : ''}${student.number ? student.number + '번 ' : ''}${student.name}
            </div>
            <div style="display:flex;gap:1.5rem;flex-wrap:wrap;font-size:0.88rem;background:rgba(6,182,212,0.08);padding:0.8rem 1rem;border-radius:8px;">
                <span>교과점수(A): <strong style="color:#67e8f9;">${sc.gradeScore.toFixed(5)}</strong></span>
                <span>이수단위 합계: <strong style="color:#67e8f9;">${sc.crd}</strong></span>
                <span>최종 점수 (A÷100×1000): <strong style="color:#fbbf24;font-size:1rem;">${sc.finalScore.toFixed(3)} / 1000</strong></span>
            </div>
            <p style="font-size:0.78rem;color:#64748b;margin:0.5rem 0 0;">
                ※ 반영교과: 국어·영어·수학·사회(한국사포함)·과학 / 과학탐구실험 제외<br>
                ※ 진로선택: A→1등급(100) · B→2등급(98) · C→4등급(94)<br>
                ※ 공식: 교과점수(A) = 이수단위 가중평균 → 최종 = A ÷ 100 × 1000 (소수점 4번째 반올림)
            </p>
        </div>
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:0.83rem;margin-bottom:0.8rem;">
                <thead><tr style="background:rgba(255,255,255,0.05);">
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:left;">유형</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:left;">교과</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:left;">과목명</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:center;">이수단위</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:center;">등급/성취도</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:right;">등급점수</th>
                </tr></thead>
                <tbody>${rankRows}${achRows}</tbody>
            </table>
            ${sc.unselected.filter(d => d.reason !== '제외교과').length > 0 ? `
            <div style="margin-bottom:0.4rem;font-size:0.82rem;color:#64748b;">반영교과 외</div>
            <table style="width:100%;border-collapse:collapse;font-size:0.83rem;">
                <thead><tr style="background:rgba(255,255,255,0.03);">
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:left;" colspan="2">사유 / 교과</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:left;">과목명</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:center;">이수단위</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:center;">등급/성취도</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:right;">-</th>
                </tr></thead>
                <tbody>${othersRows}</tbody>
            </table>` : ''}
        </div>`;
}

function buildSMUDetailHTML(student, sc) {
    const rankRows = sc.selected.filter(d => d.type === 'rank').map(d => `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.07);">
            <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#7dd3fc;">공통/일반</td>
            <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#94a3b8;">${d.category || '-'}</td>
            <td style="padding:0.45rem 0.7rem;">${d.subject}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;">${d.credit}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;">${d.rank}등급</td>
            <td style="padding:0.45rem 0.7rem;text-align:right;color:#fbbf24;">${d.score}</td>
        </tr>`).join('');

    const achRows = sc.selected.filter(d => d.type === 'ach').map((d, i) => `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.07);">
            <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#a78bfa;">진로선택 ${i + 1}위</td>
            <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#94a3b8;">${d.category || '-'}</td>
            <td style="padding:0.45rem 0.7rem;">${d.subject}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;">${d.credit}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;">${d.ach}</td>
            <td style="padding:0.45rem 0.7rem;text-align:right;color:#fbbf24;">${d.score}</td>
        </tr>`).join('');

    const unselAchRows = sc.unselected.filter(d => d.reason && d.reason.startsWith('진로선택 4위')).map(d => `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.07);opacity:0.4;">
            <td style="padding:0.45rem 0.7rem;color:#475569;font-size:0.8rem;" colspan="2">미반영(4위↓) / ${d.category || '-'}</td>
            <td style="padding:0.45rem 0.7rem;">${d.subject}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;color:#64748b;">${d.credit}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;color:#64748b;">${d.ach}</td>
            <td style="padding:0.45rem 0.7rem;text-align:right;color:#475569;">-</td>
        </tr>`).join('');

    const othersRows = sc.unselected.filter(d => !d.reason || !d.reason.startsWith('진로선택 4위')).map(d => `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.07);opacity:0.4;">
            <td style="padding:0.45rem 0.7rem;color:#475569;font-size:0.8rem;" colspan="2">${d.reason || '미반영'} / ${d.category || '-'}</td>
            <td style="padding:0.45rem 0.7rem;">${d.subject}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;color:#64748b;">${d.credit}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;color:#64748b;">${d.rank ? d.rank + '등급' : (d.ach || '-')}</td>
            <td style="padding:0.45rem 0.7rem;text-align:right;color:#475569;">-</td>
        </tr>`).join('');

    return `
        <div style="margin-bottom:1.2rem;">
            <div style="font-size:1.1rem;font-weight:700;color:#f1f5f9;margin-bottom:0.6rem;">
                ${student.class !== '미상' ? student.class + '반 ' : ''}${student.number ? student.number + '번 ' : ''}${student.name}
            </div>
            <div style="display:flex;gap:1.5rem;flex-wrap:wrap;font-size:0.88rem;background:rgba(244,63,94,0.08);padding:0.8rem 1rem;border-radius:8px;">
                <span>가중평균: <strong style="color:#fda4af;">${sc.gradeScore.toFixed(5)}</strong></span>
                <span>이수단위 합계: <strong style="color:#fda4af;">${sc.crd}</strong></span>
                <span>최종 점수 (가중평균×10): <strong style="color:#fbbf24;font-size:1rem;">${sc.finalScore.toFixed(3)} / 1000</strong></span>
            </div>
            <p style="font-size:0.78rem;color:#64748b;margin:0.5rem 0 0;">
                ※ 석차등급 전 교과목 반영 / 진로선택 우수 최대 3과목 (A=100 · B=96 · C=90)<br>
                ※ 공식: 교과성적 = Σ(환산점수×이수단위) ÷ Σ이수단위 × 10 (소수점 4번째 반올림)
            </p>
        </div>
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:0.83rem;margin-bottom:0.8rem;">
                <thead><tr style="background:rgba(255,255,255,0.05);">
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:left;">유형</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:left;">교과</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:left;">과목명</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:center;">이수단위</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:center;">등급/성취도</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:right;">환산점수</th>
                </tr></thead>
                <tbody>${rankRows}${achRows}</tbody>
            </table>
            ${unselAchRows ? `
            <div style="margin-bottom:0.4rem;font-size:0.82rem;color:#64748b;">진로선택 미반영 (4위 이하)</div>
            <table style="width:100%;border-collapse:collapse;font-size:0.83rem;margin-bottom:0.8rem;">
                <thead><tr style="background:rgba(255,255,255,0.03);">
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:left;" colspan="2">사유 / 교과</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:left;">과목명</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:center;">이수단위</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:center;">성취도</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:right;">-</th>
                </tr></thead>
                <tbody>${unselAchRows}</tbody>
            </table>` : ''}
            ${othersRows ? `
            <div style="margin-bottom:0.4rem;font-size:0.82rem;color:#64748b;">등급없음</div>
            <table style="width:100%;border-collapse:collapse;font-size:0.83rem;">
                <thead><tr style="background:rgba(255,255,255,0.03);">
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:left;" colspan="2">사유 / 교과</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:left;">과목명</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:center;">이수단위</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:center;">등급/성취도</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:right;">-</th>
                </tr></thead>
                <tbody>${othersRows}</tbody>
            </table>` : ''}
        </div>`;
}

function buildCUKDetailHTML(student, sc) {
    const rankRows = sc.selected.filter(d => d.rank > 0).map(d => `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.07);">
            <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#7dd3fc;">공통/일반</td>
            <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#94a3b8;">${d.category || '-'}</td>
            <td style="padding:0.45rem 0.7rem;">${d.subject}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;">${d.credit}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;">${d.rank}등급</td>
            <td style="padding:0.45rem 0.7rem;text-align:right;color:#fbbf24;">${d.score}</td>
        </tr>`).join('');

    const achRows = sc.selected.filter(d => !(d.rank > 0)).map(d => `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.07);">
            <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#a78bfa;">진로선택</td>
            <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#94a3b8;">${d.category || '-'}</td>
            <td style="padding:0.45rem 0.7rem;">${d.subject}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;">${d.credit}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;">${d.ach} → ${d.effectiveRank}등급</td>
            <td style="padding:0.45rem 0.7rem;text-align:right;color:#fbbf24;">${d.score}</td>
        </tr>`).join('');

    const othersRows = sc.unselected.filter(d => d.reason !== '제외교과').map(d => `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.07);opacity:0.4;">
            <td style="padding:0.45rem 0.7rem;color:#475569;font-size:0.8rem;" colspan="2">${d.reason || '미반영'} / ${d.category || '-'}</td>
            <td style="padding:0.45rem 0.7rem;">${d.subject}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;color:#64748b;">${d.credit}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;color:#64748b;">${d.rank ? d.rank + '등급' : (d.ach || '-')}</td>
            <td style="padding:0.45rem 0.7rem;text-align:right;color:#475569;">-</td>
        </tr>`).join('');

    return `
        <div style="margin-bottom:1.2rem;">
            <div style="font-size:1.1rem;font-weight:700;color:#f1f5f9;margin-bottom:0.6rem;">
                ${student.class !== '미상' ? student.class + '반 ' : ''}${student.number ? student.number + '번 ' : ''}${student.name}
            </div>
            <div style="display:flex;gap:1.5rem;flex-wrap:wrap;font-size:0.88rem;background:rgba(14,165,233,0.08);padding:0.8rem 1rem;border-radius:8px;">
                <span>교과성적: <strong style="color:#38bdf8;">${sc.gradeScore.toFixed(5)}</strong></span>
                <span>이수단위 합계: <strong style="color:#38bdf8;">${sc.crd}</strong></span>
                <span>최종 점수: <strong style="color:#fbbf24;font-size:1rem;">${sc.finalScore.toFixed(3)} / 100</strong></span>
            </div>
            <p style="font-size:0.78rem;color:#64748b;margin:0.5rem 0 0;">
                ※ 반영교과: 국어·수학·영어·한국사·사회(역사/도덕 포함)·과학<br>
                ※ 진로선택: A→1등급(100) · B→2등급(99) · C→4등급(97) / 9등급 최저 70점<br>
                ※ 공식: Σ(등급점수×이수단위) ÷ Σ이수단위 (소수점 4번째 반올림)
            </p>
        </div>
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:0.83rem;margin-bottom:0.8rem;">
                <thead><tr style="background:rgba(255,255,255,0.05);">
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:left;">유형</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:left;">교과</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:left;">과목명</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:center;">이수단위</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:center;">등급/성취도</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:right;">등급점수</th>
                </tr></thead>
                <tbody>${rankRows}${achRows}</tbody>
            </table>
            ${sc.unselected.filter(d => d.reason !== '제외교과').length > 0 ? `
            <div style="margin-bottom:0.4rem;font-size:0.82rem;color:#64748b;">반영교과 외</div>
            <table style="width:100%;border-collapse:collapse;font-size:0.83rem;">
                <thead><tr style="background:rgba(255,255,255,0.03);">
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:left;" colspan="2">사유 / 교과</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:left;">과목명</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:center;">이수단위</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:center;">등급/성취도</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:right;">-</th>
                </tr></thead>
                <tbody>${othersRows}</tbody>
            </table>` : ''}
        </div>`;
}

function buildPNUDetailHTML(student, sc) {
    const rankRows = sc.selected.map(d => `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.07);">
            <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#94a3b8;">${d.category || '-'}</td>
            <td style="padding:0.45rem 0.7rem;">${d.subject}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;">${d.credit}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;">${d.rank}등급</td>
            <td style="padding:0.45rem 0.7rem;text-align:right;color:#fbbf24;">${d.score}</td>
        </tr>`).join('');

    const achRows = sc.unselected.filter(d => d.reason && d.reason.startsWith('진로선택')).map(d => `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.07);opacity:0.45;">
            <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#64748b;" colspan="2">진로선택 미반영 / ${d.category || '-'} — ${d.subject}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;color:#64748b;">${d.credit}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;color:#64748b;">${d.ach}</td>
            <td style="padding:0.45rem 0.7rem;text-align:right;color:#475569;">-</td>
        </tr>`).join('');

    const othersRows = sc.unselected.filter(d => !d.reason || !d.reason.startsWith('진로선택')).filter(d => d.reason !== '제외교과').map(d => `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.07);opacity:0.4;">
            <td style="padding:0.45rem 0.7rem;color:#475569;font-size:0.8rem;" colspan="2">${d.reason || '미반영'} / ${d.category || '-'} — ${d.subject}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;color:#64748b;">${d.credit}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;color:#64748b;">${d.rank ? d.rank + '등급' : '-'}</td>
            <td style="padding:0.45rem 0.7rem;text-align:right;color:#475569;">-</td>
        </tr>`).join('');

    return `
        <div style="margin-bottom:1.2rem;">
            <div style="font-size:1.1rem;font-weight:700;color:#f1f5f9;margin-bottom:0.6rem;">
                ${student.class !== '미상' ? student.class + '반 ' : ''}${student.number ? student.number + '번 ' : ''}${student.name}
            </div>
            <div style="display:flex;gap:1.5rem;flex-wrap:wrap;font-size:0.88rem;background:rgba(20,184,166,0.08);padding:0.8rem 1rem;border-radius:8px;">
                <span>반영교과 평균 성적: <strong style="color:#5eead4;">${sc.avgScore.toFixed(5)}</strong></span>
                <span>이수단위 합계: <strong style="color:#5eead4;">${sc.crd}</strong></span>
                <span>최종 교과 점수 (평균×0.8): <strong style="color:#fbbf24;font-size:1rem;">${sc.finalScore.toFixed(4)} / 80</strong></span>
            </div>
            <p style="font-size:0.78rem;color:#64748b;margin:0.5rem 0 0;">
                ※ 반영교과: 국어·수학·영어·사회·과학·한국사 / 석차등급 과목만 반영 (진로선택 성취도 미반영)<br>
                ※ 공식: 반영교과 평균 성적 × 0.8 (소수점 5번째 자리에서 버림) — 학업역량평가 20점은 별도
            </p>
        </div>
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:0.83rem;margin-bottom:0.8rem;">
                <thead><tr style="background:rgba(255,255,255,0.05);">
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:left;">교과</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:left;">과목명</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:center;">이수단위</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:center;">등급</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:right;">등급점수</th>
                </tr></thead>
                <tbody>${rankRows}</tbody>
            </table>
            ${achRows ? `
            <div style="margin-bottom:0.4rem;font-size:0.82rem;color:#64748b;">진로선택 과목 (성취도 미반영 — 학업역량평가에서 정성평가)</div>
            <table style="width:100%;border-collapse:collapse;font-size:0.83rem;margin-bottom:0.8rem;">
                <thead><tr style="background:rgba(255,255,255,0.03);">
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:left;" colspan="2">교과 / 과목명</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:center;">이수단위</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:center;">성취도</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:right;">-</th>
                </tr></thead>
                <tbody>${achRows}</tbody>
            </table>` : ''}
            ${othersRows ? `
            <div style="margin-bottom:0.4rem;font-size:0.82rem;color:#64748b;">반영교과 외</div>
            <table style="width:100%;border-collapse:collapse;font-size:0.83rem;">
                <thead><tr style="background:rgba(255,255,255,0.03);">
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:left;" colspan="2">사유 / 교과 / 과목명</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:center;">이수단위</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:center;">등급</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:right;">-</th>
                </tr></thead>
                <tbody>${othersRows}</tbody>
            </table>` : ''}
        </div>`;
}

function buildAJUDetailHTML(student, sc) {
    const rankRows = sc.selected.filter(d => d.type === '공통/일반').map(d => `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.07);">
            <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#94a3b8;">${d.category || '-'}</td>
            <td style="padding:0.45rem 0.7rem;">${d.subject}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;">${d.credit}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;">${d.rank}등급</td>
            <td style="padding:0.45rem 0.7rem;text-align:right;color:#fbbf24;">${d.score}</td>
        </tr>`).join('');

    const achRows = sc.selected.filter(d => d.type === '진로선택').map(d => `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.07);">
            <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#94a3b8;">${d.category || '-'}</td>
            <td style="padding:0.45rem 0.7rem;">${d.subject} <span style="color:#64748b;font-size:0.75rem;">#${d.achOrder}</span></td>
            <td style="padding:0.45rem 0.7rem;text-align:center;">${d.credit}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;">${d.ach}</td>
            <td style="padding:0.45rem 0.7rem;text-align:right;color:#a78bfa;">${d.score}</td>
        </tr>`).join('');

    const excRows = sc.unselected.filter(d => d.reason && d.reason.startsWith('진로선택 6위')).map(d => `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.07);opacity:0.4;">
            <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#64748b;">${d.category || '-'}</td>
            <td style="padding:0.45rem 0.7rem;color:#64748b;">${d.subject}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;color:#64748b;">${d.credit}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;color:#64748b;">${d.ach}</td>
            <td style="padding:0.45rem 0.7rem;text-align:right;color:#475569;">${d.score}</td>
        </tr>`).join('');

    const othersRows = sc.unselected.filter(d => !d.reason?.startsWith('진로선택 6위') && d.reason !== '제외교과').map(d => `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.07);opacity:0.4;">
            <td style="padding:0.45rem 0.7rem;color:#475569;font-size:0.8rem;" colspan="2">${d.reason} / ${d.category || '-'} — ${d.subject}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;color:#64748b;">${d.credit}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;color:#64748b;">${d.rank ? d.rank + '등급' : (d.ach || '-')}</td>
            <td style="padding:0.45rem 0.7rem;text-align:right;color:#475569;">-</td>
        </tr>`).join('');

    return `
        <div style="margin-bottom:1.2rem;">
            <div style="font-size:1.1rem;font-weight:700;color:#f1f5f9;margin-bottom:0.6rem;">
                ${student.class !== '미상' ? student.class + '반 ' : ''}${student.number ? student.number + '번 ' : ''}${student.name}
            </div>
            <div style="display:flex;gap:1.5rem;flex-wrap:wrap;font-size:0.88rem;background:rgba(249,115,22,0.08);padding:0.8rem 1rem;border-radius:8px;">
                <span>반영 이수단위: <strong style="color:#fb923c;">${sc.crd}</strong></span>
                <span>가중합계: <strong style="color:#fb923c;">${sc.pts.toFixed(0)}</strong></span>
                <span>교과 점수: <strong style="color:#fbbf24;font-size:1rem;">${sc.finalScore.toFixed(2)} / 100</strong></span>
            </div>
            <p style="font-size:0.78rem;color:#64748b;margin:0.5rem 0 0;">
                ※ 반영교과: 국어·수학·영어·사회·과학 / 한국사 제외 / 등급: 1=100·2=99·3=98·4=95·5=90·6=85·7=75·8=65·9=0<br>
                ※ 성취도: A=100·B=98·C=90 / 진로선택 상위 5과목만 반영 (성취도↑ → 이수단위↑ 순)
            </p>
        </div>
        <div style="overflow-x:auto;">
            ${rankRows ? `
            <div style="margin-bottom:0.4rem;font-size:0.82rem;color:#60a5fa;">공통/일반선택 과목</div>
            <table style="width:100%;border-collapse:collapse;font-size:0.83rem;margin-bottom:0.8rem;">
                <thead><tr style="background:rgba(255,255,255,0.05);">
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:left;">교과</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:left;">과목명</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:center;">이수단위</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:center;">등급</th>
                    <th style="padding:0.5rem 0.7rem;color:#94a3b8;text-align:right;">등급점수</th>
                </tr></thead>
                <tbody>${rankRows}</tbody>
            </table>` : ''}
            ${achRows ? `
            <div style="margin-bottom:0.4rem;font-size:0.82rem;color:#a78bfa;">진로선택 과목 (상위 5개 반영)</div>
            <table style="width:100%;border-collapse:collapse;font-size:0.83rem;margin-bottom:0.8rem;">
                <thead><tr style="background:rgba(167,139,250,0.1);">
                    <th style="padding:0.5rem 0.7rem;color:#c4b5fd;text-align:left;">교과</th>
                    <th style="padding:0.5rem 0.7rem;color:#c4b5fd;text-align:left;">과목명</th>
                    <th style="padding:0.5rem 0.7rem;color:#c4b5fd;text-align:center;">이수단위</th>
                    <th style="padding:0.5rem 0.7rem;color:#c4b5fd;text-align:center;">성취도</th>
                    <th style="padding:0.5rem 0.7rem;color:#c4b5fd;text-align:right;">점수</th>
                </tr></thead>
                <tbody>${achRows}</tbody>
            </table>` : ''}
            ${excRows ? `
            <div style="margin-bottom:0.4rem;font-size:0.82rem;color:#64748b;">진로선택 6위 이하 (미반영)</div>
            <table style="width:100%;border-collapse:collapse;font-size:0.83rem;margin-bottom:0.8rem;">
                <thead><tr style="background:rgba(255,255,255,0.02);">
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:left;">교과</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:left;">과목명</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:center;">이수단위</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:center;">성취도</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:right;">점수</th>
                </tr></thead>
                <tbody>${excRows}</tbody>
            </table>` : ''}
            ${othersRows ? `
            <div style="margin-bottom:0.4rem;font-size:0.82rem;color:#64748b;">반영교과 외 / 미반영</div>
            <table style="width:100%;border-collapse:collapse;font-size:0.83rem;">
                <thead><tr style="background:rgba(255,255,255,0.02);">
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:left;" colspan="2">사유 / 교과 / 과목명</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:center;">이수단위</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:center;">등급/성취도</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:right;">-</th>
                </tr></thead>
                <tbody>${othersRows}</tbody>
            </table>` : ''}
        </div>`;
}

function buildKUSDetailHTML(student, sc) {
    const makeSection = (typeData, label, typeKey, color) => {
        const rankRows = typeData.selected.filter(d => d.type === '공통/일반').map(d => `
            <tr style="border-bottom:1px solid rgba(148,163,184,0.07);">
                <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#94a3b8;">${d.category || '-'}</td>
                <td style="padding:0.45rem 0.7rem;">${d.subject}</td>
                <td style="padding:0.45rem 0.7rem;text-align:center;">${d.credit}</td>
                <td style="padding:0.45rem 0.7rem;text-align:center;">${d.rank}등급</td>
                <td style="padding:0.45rem 0.7rem;text-align:right;color:#60a5fa;">${d.score}</td>
            </tr>`).join('');

        const achRows = typeData.selected.filter(d => d.type === '진로선택').map(d => `
            <tr style="border-bottom:1px solid rgba(148,163,184,0.07);">
                <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#94a3b8;">${d.category || '-'}</td>
                <td style="padding:0.45rem 0.7rem;">${d.subject}</td>
                <td style="padding:0.45rem 0.7rem;text-align:center;">${d.credit}</td>
                <td style="padding:0.45rem 0.7rem;text-align:center;">${d.ach}</td>
                <td style="padding:0.45rem 0.7rem;text-align:right;color:#a78bfa;">${d.score}</td>
            </tr>`).join('');

        const unselRows = typeData.unselected.filter(d => d.reason !== '제외교과').map(d => `
            <tr style="border-bottom:1px solid rgba(148,163,184,0.07);opacity:0.4;">
                <td style="padding:0.45rem 0.7rem;color:#475569;font-size:0.8rem;" colspan="2">${d.reason} / ${d.category || '-'} — ${d.subject}</td>
                <td style="padding:0.45rem 0.7rem;text-align:center;color:#64748b;">${d.credit}</td>
                <td style="padding:0.45rem 0.7rem;text-align:center;color:#64748b;">${d.rank ? d.rank + '등급' : (d.ach || '-')}</td>
                <td style="padding:0.45rem 0.7rem;text-align:right;color:#475569;">-</td>
            </tr>`).join('');

        const isBest = sc.best === typeKey;
        const noAch = typeData.achCrd === 0;

        return `
            <div style="background:rgba(255,255,255,0.04);border:1px solid ${isBest ? color : 'rgba(100,116,139,0.3)'};border-radius:8px;padding:0.8rem;margin-bottom:1rem;">
                <div style="font-size:0.9rem;font-weight:700;color:${color};margin-bottom:0.5rem;">
                    ${label}${isBest ? ` <span style="font-size:0.73rem;background:${color};color:#000;padding:0.15rem 0.45rem;border-radius:4px;margin-left:0.5rem;font-weight:700;">최고 계열</span>` : ''}
                </div>
                <div style="display:flex;gap:1.5rem;flex-wrap:wrap;font-size:0.85rem;margin-bottom:0.5rem;">
                    <span>공통/일반 가중평균: <strong style="color:#60a5fa;">${typeData.rankAvg.toFixed(4)}</strong> <span style="color:#64748b;">(×${noAch ? '1.0' : '0.9'})</span></span>
                    ${!noAch ? `<span>진로선택 가중평균: <strong style="color:#a78bfa;">${typeData.achAvg.toFixed(4)}</strong> <span style="color:#64748b;">(×0.1)</span></span>` : ''}
                    <span>합계: <strong style="color:#fbbf24;font-size:0.95rem;">${typeData.finalScore.toFixed(4)}</strong></span>
                </div>
                <div style="overflow-x:auto;">
                    ${rankRows ? `
                    <table style="width:100%;border-collapse:collapse;font-size:0.82rem;margin-bottom:0.5rem;">
                        <thead><tr style="background:rgba(96,165,250,0.08);">
                            <th style="padding:0.4rem 0.7rem;color:#93c5fd;text-align:left;">교과</th>
                            <th style="padding:0.4rem 0.7rem;color:#93c5fd;text-align:left;">과목명</th>
                            <th style="padding:0.4rem 0.7rem;color:#93c5fd;text-align:center;">이수단위</th>
                            <th style="padding:0.4rem 0.7rem;color:#93c5fd;text-align:center;">등급</th>
                            <th style="padding:0.4rem 0.7rem;color:#93c5fd;text-align:right;">등급점수</th>
                        </tr></thead>
                        <tbody>${rankRows}</tbody>
                    </table>` : ''}
                    ${achRows ? `
                    <div style="font-size:0.79rem;color:#a78bfa;margin:0.3rem 0;">진로선택 과목</div>
                    <table style="width:100%;border-collapse:collapse;font-size:0.82rem;margin-bottom:0.5rem;">
                        <thead><tr style="background:rgba(167,139,250,0.08);">
                            <th style="padding:0.4rem 0.7rem;color:#c4b5fd;text-align:left;">교과</th>
                            <th style="padding:0.4rem 0.7rem;color:#c4b5fd;text-align:left;">과목명</th>
                            <th style="padding:0.4rem 0.7rem;color:#c4b5fd;text-align:center;">이수단위</th>
                            <th style="padding:0.4rem 0.7rem;color:#c4b5fd;text-align:center;">성취도</th>
                            <th style="padding:0.4rem 0.7rem;color:#c4b5fd;text-align:right;">점수</th>
                        </tr></thead>
                        <tbody>${achRows}</tbody>
                    </table>` : ''}
                    ${unselRows ? `
                    <div style="font-size:0.78rem;color:#64748b;margin:0.3rem 0;">반영교과 외</div>
                    <table style="width:100%;border-collapse:collapse;font-size:0.8rem;">
                        <thead><tr style="background:rgba(255,255,255,0.02);">
                            <th style="padding:0.4rem 0.7rem;color:#475569;text-align:left;" colspan="2">사유 / 교과 / 과목명</th>
                            <th style="padding:0.4rem 0.7rem;color:#475569;text-align:center;">이수단위</th>
                            <th style="padding:0.4rem 0.7rem;color:#475569;text-align:center;">등급/성취도</th>
                            <th style="padding:0.4rem 0.7rem;color:#475569;text-align:right;">-</th>
                        </tr></thead>
                        <tbody>${unselRows}</tbody>
                    </table>` : ''}
                </div>
            </div>`;
    };

    return `
        <div style="margin-bottom:1.2rem;">
            <div style="font-size:1.1rem;font-weight:700;color:#f1f5f9;margin-bottom:0.6rem;">
                ${student.class !== '미상' ? student.class + '반 ' : ''}${student.number ? student.number + '번 ' : ''}${student.name}
            </div>
            <div style="display:flex;gap:1.5rem;flex-wrap:wrap;font-size:0.88rem;background:rgba(239,68,68,0.08);padding:0.8rem 1rem;border-radius:8px;margin-bottom:0.8rem;">
                <span>인문·체능계열: <strong style="color:#f87171;">${sc.hum.finalScore.toFixed(4)}</strong></span>
                <span>자연계열: <strong style="color:#60a5fa;">${sc.sci.finalScore.toFixed(4)}</strong></span>
                <span>대표 점수 (최고): <strong style="color:#fbbf24;font-size:1rem;">${sc.displayScore.toFixed(4)} / 1000</strong></span>
            </div>
            <p style="font-size:0.78rem;color:#64748b;margin:0 0 0.8rem;">
                ※ 등급점수: 1=1000·2=990·3=980·4=950·5=900·6=700·7=500·8=250·9=0 / 성취도: A=1000·B=980·C=900<br>
                ※ 공통/일반 가중평균×0.9 + 진로선택 가중평균×0.1 (진로선택 없으면 ×1.0)
            </p>
        </div>
        ${makeSection(sc.hum, '인문·체능계열&nbsp;<span style="font-size:0.8rem;color:#64748b;">(국어·수학·영어·사회·한국사)</span>', 'hum', '#f87171')}
        ${makeSection(sc.sci, '자연계열&nbsp;<span style="font-size:0.8rem;color:#64748b;">(국어·수학·영어·과학)</span>', 'sci', '#60a5fa')}`;
}

function buildHYEDetailHTML(student, sc) {
    const rankRows = sc.selected.filter(d => d.type === '공통/일반').map(d => `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.07);">
            <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#94a3b8;">${d.category || '-'}</td>
            <td style="padding:0.45rem 0.7rem;">${d.subject}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;">${d.credit}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;">${d.rank}등급</td>
            <td style="padding:0.45rem 0.7rem;text-align:right;color:#60a5fa;">${d.score}</td>
        </tr>`).join('');

    const achRows = sc.selected.filter(d => d.type === '진로선택').map(d => `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.07);">
            <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#94a3b8;">${d.category || '-'}</td>
            <td style="padding:0.45rem 0.7rem;">${d.subject}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;">${d.credit}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;">${d.ach}</td>
            <td style="padding:0.45rem 0.7rem;text-align:right;color:#a78bfa;">${d.score}</td>
        </tr>`).join('');

    const unselRows = sc.unselected.filter(d => d.reason !== '제외교과').map(d => `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.07);opacity:0.4;">
            <td style="padding:0.45rem 0.7rem;color:#475569;font-size:0.8rem;" colspan="2">${d.reason} / ${d.category || '-'} — ${d.subject}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;color:#64748b;">${d.credit}</td>
            <td style="padding:0.45rem 0.7rem;text-align:center;color:#64748b;">${d.rank ? d.rank + '등급' : (d.ach || '-')}</td>
            <td style="padding:0.45rem 0.7rem;text-align:right;color:#475569;">-</td>
        </tr>`).join('');

    const noAch = sc.achCrd === 0;

    return `
        <div style="margin-bottom:1.2rem;">
            <div style="font-size:1.1rem;font-weight:700;color:#f1f5f9;margin-bottom:0.6rem;">
                ${student.class !== '미상' ? student.class + '반 ' : ''}${student.number ? student.number + '번 ' : ''}${student.name}
            </div>
            <div style="display:flex;gap:1.5rem;flex-wrap:wrap;font-size:0.88rem;background:rgba(59,130,246,0.08);padding:0.8rem 1rem;border-radius:8px;">
                <span>공통/일반 가중평균: <strong style="color:#60a5fa;">${sc.rankAvg.toFixed(4)}</strong> <span style="color:#64748b;">(×${noAch ? '10' : '8'})</span></span>
                ${!noAch ? `<span>진로선택 가중평균: <strong style="color:#a78bfa;">${sc.achAvg.toFixed(4)}</strong> <span style="color:#64748b;">(×2)</span></span>` : ''}
                <span>공통/일반 점수: <strong style="color:#60a5fa;">${sc.rankScore.toFixed(4)}</strong></span>
                ${!noAch ? `<span>진로선택 점수: <strong style="color:#a78bfa;">${sc.achScore.toFixed(4)}</strong></span>` : ''}
                <span>최종 교과 점수: <strong style="color:#fbbf24;font-size:1rem;">${sc.finalScore.toFixed(4)} / 1000</strong></span>
            </div>
            <p style="font-size:0.78rem;color:#64748b;margin:0.5rem 0 0;">
                ※ 반영교과: 국어·영어·수학·사회·과학·한국사 (계열 구분 없음) / 등급: 1=100·2=99·3=98·4=95·5=90·6=70·7=50·8=25·9=0<br>
                ※ 공통/일반 가중평균×8 + 진로선택 가중평균×2 = 1000점 만점${noAch ? ' (진로선택 없어 ×10 적용)' : ''}
            </p>
        </div>
        <div style="overflow-x:auto;">
            ${rankRows ? `
            <div style="margin-bottom:0.4rem;font-size:0.82rem;color:#60a5fa;">공통/일반선택 과목 (이수단위 합계: ${sc.rankCrd})</div>
            <table style="width:100%;border-collapse:collapse;font-size:0.83rem;margin-bottom:0.8rem;">
                <thead><tr style="background:rgba(59,130,246,0.1);">
                    <th style="padding:0.5rem 0.7rem;color:#93c5fd;text-align:left;">교과</th>
                    <th style="padding:0.5rem 0.7rem;color:#93c5fd;text-align:left;">과목명</th>
                    <th style="padding:0.5rem 0.7rem;color:#93c5fd;text-align:center;">이수단위</th>
                    <th style="padding:0.5rem 0.7rem;color:#93c5fd;text-align:center;">등급</th>
                    <th style="padding:0.5rem 0.7rem;color:#93c5fd;text-align:right;">등급점수</th>
                </tr></thead>
                <tbody>${rankRows}</tbody>
            </table>` : ''}
            ${achRows ? `
            <div style="margin-bottom:0.4rem;font-size:0.82rem;color:#a78bfa;">진로선택 과목 (이수단위 합계: ${sc.achCrd})</div>
            <table style="width:100%;border-collapse:collapse;font-size:0.83rem;margin-bottom:0.8rem;">
                <thead><tr style="background:rgba(167,139,250,0.1);">
                    <th style="padding:0.5rem 0.7rem;color:#c4b5fd;text-align:left;">교과</th>
                    <th style="padding:0.5rem 0.7rem;color:#c4b5fd;text-align:left;">과목명</th>
                    <th style="padding:0.5rem 0.7rem;color:#c4b5fd;text-align:center;">이수단위</th>
                    <th style="padding:0.5rem 0.7rem;color:#c4b5fd;text-align:center;">성취도</th>
                    <th style="padding:0.5rem 0.7rem;color:#c4b5fd;text-align:right;">점수</th>
                </tr></thead>
                <tbody>${achRows}</tbody>
            </table>` : ''}
            ${unselRows ? `
            <div style="margin-bottom:0.4rem;font-size:0.82rem;color:#64748b;">반영교과 외</div>
            <table style="width:100%;border-collapse:collapse;font-size:0.83rem;">
                <thead><tr style="background:rgba(255,255,255,0.03);">
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:left;" colspan="2">사유 / 교과 / 과목명</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:center;">이수단위</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:center;">등급/성취도</th>
                    <th style="padding:0.5rem 0.7rem;color:#475569;text-align:right;">-</th>
                </tr></thead>
                <tbody>${unselRows}</tbody>
            </table>` : ''}
        </div>`;
}

function buildKUTDetailHTML(student, sc) {
    const makeTypeSection = (typeData, label, typeKey, color) => {
        const selRows = typeData.selected.map(d => `
            <tr style="border-bottom:1px solid rgba(148,163,184,0.07);">
                <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#94a3b8;">${d.category || '-'}</td>
                <td style="padding:0.45rem 0.7rem;">${d.subject}</td>
                <td style="padding:0.45rem 0.7rem;text-align:center;">${d.credit}</td>
                <td style="padding:0.45rem 0.7rem;text-align:center;">${d.rank}등급</td>
                <td style="padding:0.45rem 0.7rem;text-align:right;color:#fbbf24;">${d.score}</td>
            </tr>`).join('');

        const bonusRows = typeData.bonusData.top3.map(d => `
            <tr style="border-bottom:1px solid rgba(148,163,184,0.07);">
                <td style="padding:0.4rem 0.7rem;font-size:0.8rem;color:#94a3b8;">${d.category || '-'}</td>
                <td style="padding:0.4rem 0.7rem;">${d.subject}</td>
                <td style="padding:0.4rem 0.7rem;text-align:center;">${d.credit}</td>
                <td style="padding:0.4rem 0.7rem;text-align:center;">${d.ach}</td>
                <td style="padding:0.4rem 0.7rem;text-align:right;color:#a78bfa;">${d.bonusPt}점</td>
            </tr>`).join('');

        const unselRows = typeData.unselected
            .filter(d => d.reason !== '제외교과' && d.reason !== '진로선택(교과성적 제외)').map(d => `
            <tr style="border-bottom:1px solid rgba(148,163,184,0.07);opacity:0.4;">
                <td style="padding:0.45rem 0.7rem;color:#475569;font-size:0.8rem;" colspan="2">${d.reason} / ${d.category || '-'} — ${d.subject}</td>
                <td style="padding:0.45rem 0.7rem;text-align:center;color:#64748b;">${d.credit}</td>
                <td style="padding:0.45rem 0.7rem;text-align:center;color:#64748b;">${d.rank ? d.rank + '등급' : '-'}</td>
                <td style="padding:0.45rem 0.7rem;text-align:right;color:#475569;">-</td>
            </tr>`).join('');

        const isBest = sc.best === typeKey;
        const bonusRatePct = typeData.bonusData.sum > 0 ? (typeData.bonusData.sum / 3 / 100 * 100).toFixed(4) : '0';

        return `
            <div style="background:rgba(255,255,255,0.04);border:1px solid ${isBest ? color : 'rgba(100,116,139,0.3)'};border-radius:8px;padding:0.8rem;margin-bottom:1rem;">
                <div style="font-size:0.9rem;font-weight:700;color:${color};margin-bottom:0.6rem;">
                    ${label}${isBest ? ` <span style="font-size:0.73rem;background:${color};color:#000;padding:0.15rem 0.45rem;border-radius:4px;margin-left:0.5rem;font-weight:700;">최고 계열</span>` : ''}
                </div>
                <div style="display:flex;gap:1.5rem;flex-wrap:wrap;font-size:0.85rem;margin-bottom:0.6rem;">
                    <span>교과성적: <strong style="color:${color};">${typeData.baseScore.toFixed(2)}</strong></span>
                    <span>가산점: <strong style="color:#a78bfa;">+${typeData.bonusData.bonus.toFixed(2)}</strong> <span style="color:#64748b;font-size:0.78rem;">(가산율 ${bonusRatePct}%)</span></span>
                    <span>합계: <strong style="color:#fbbf24;font-size:0.95rem;">${typeData.total.toFixed(2)}</strong></span>
                </div>
                <div style="overflow-x:auto;">
                    <table style="width:100%;border-collapse:collapse;font-size:0.82rem;margin-bottom:0.5rem;">
                        <thead><tr style="background:rgba(255,255,255,0.05);">
                            <th style="padding:0.4rem 0.7rem;color:#94a3b8;text-align:left;">교과</th>
                            <th style="padding:0.4rem 0.7rem;color:#94a3b8;text-align:left;">과목명</th>
                            <th style="padding:0.4rem 0.7rem;color:#94a3b8;text-align:center;">이수단위</th>
                            <th style="padding:0.4rem 0.7rem;color:#94a3b8;text-align:center;">등급</th>
                            <th style="padding:0.4rem 0.7rem;color:#94a3b8;text-align:right;">등급점수</th>
                        </tr></thead>
                        <tbody>${selRows || '<tr><td colspan="5" style="padding:0.5rem;text-align:center;color:#475569;">반영 과목 없음</td></tr>'}</tbody>
                    </table>
                    ${typeData.bonusData.top3.length > 0 ? `
                    <div style="font-size:0.8rem;color:#a78bfa;margin:0.4rem 0 0.3rem;">
                        가산점 대상 진로선택 (상위 3과목) — 성취도 합 ${typeData.bonusData.sum} / 3 = ${(typeData.bonusData.sum/3).toFixed(4)} → 가산율 ${bonusRatePct}%
                    </div>
                    <table style="width:100%;border-collapse:collapse;font-size:0.82rem;margin-bottom:0.5rem;">
                        <thead><tr style="background:rgba(167,139,250,0.08);">
                            <th style="padding:0.4rem 0.7rem;color:#a78bfa;text-align:left;">교과</th>
                            <th style="padding:0.4rem 0.7rem;color:#a78bfa;text-align:left;">과목명</th>
                            <th style="padding:0.4rem 0.7rem;color:#a78bfa;text-align:center;">이수단위</th>
                            <th style="padding:0.4rem 0.7rem;color:#a78bfa;text-align:center;">성취도</th>
                            <th style="padding:0.4rem 0.7rem;color:#a78bfa;text-align:right;">점수</th>
                        </tr></thead>
                        <tbody>${bonusRows}</tbody>
                    </table>` : `<div style="font-size:0.8rem;color:#64748b;margin:0.4rem 0;">진로선택 가산점 없음 (해당 과목 없음)</div>`}
                    ${unselRows ? `
                    <div style="font-size:0.78rem;color:#64748b;margin:0.4rem 0 0.3rem;">반영교과 외</div>
                    <table style="width:100%;border-collapse:collapse;font-size:0.8rem;">
                        <thead><tr style="background:rgba(255,255,255,0.02);">
                            <th style="padding:0.4rem 0.7rem;color:#475569;text-align:left;" colspan="2">사유 / 교과 / 과목명</th>
                            <th style="padding:0.4rem 0.7rem;color:#475569;text-align:center;">이수단위</th>
                            <th style="padding:0.4rem 0.7rem;color:#475569;text-align:center;">등급</th>
                            <th style="padding:0.4rem 0.7rem;color:#475569;text-align:right;">-</th>
                        </tr></thead>
                        <tbody>${unselRows}</tbody>
                    </table>` : ''}
                </div>
            </div>`;
    };

    return `
        <div style="margin-bottom:1.2rem;">
            <div style="font-size:1.1rem;font-weight:700;color:#f1f5f9;margin-bottom:0.6rem;">
                ${student.class !== '미상' ? student.class + '반 ' : ''}${student.number ? student.number + '번 ' : ''}${student.name}
            </div>
            <div style="display:flex;gap:1.5rem;flex-wrap:wrap;font-size:0.88rem;background:rgba(16,185,129,0.08);padding:0.8rem 1rem;border-radius:8px;margin-bottom:0.8rem;">
                <span>공학·ICT계열: <strong style="color:#10b981;">${sc.stem.total.toFixed(2)}</strong></span>
                <span>사회계열: <strong style="color:#f59e0b;">${sc.soc.total.toFixed(2)}</strong></span>
                <span>대표 점수 (최고): <strong style="color:#fbbf24;font-size:1rem;">${sc.displayScore.toFixed(2)} / 100</strong></span>
            </div>
            <p style="font-size:0.78rem;color:#64748b;margin:0 0 0.8rem;">
                ※ 등급점수: 1=100 · 2=99 · 3=98 · 4=95.5 · 5=93 · 6=90.5 · 7=61.5 · 8=32.5 · 9=3.5<br>
                ※ 가산점: 진로선택 상위 3과목(체육/예술 제외, A=3/B=2/C=1) → 교과성적 × (합÷3÷100), 소수점 3번째 반올림
            </p>
        </div>
        ${makeTypeSection(sc.stem, '공학·ICT계열 / 자율전공(자연)&nbsp;&nbsp;<span style="font-size:0.8rem;color:#64748b;">(국어·수학·영어·과학)</span>', 'stem', '#10b981')}
        ${makeTypeSection(sc.soc,  '사회계열 / 자율전공(인문)&nbsp;&nbsp;<span style="font-size:0.8rem;color:#64748b;">(국어·수학·영어·사회, 한국사 제외)</span>', 'soc', '#f59e0b')}`;
}

function buildINUDetailHTML(student, sc) {
    const humColor  = '#0891b2';
    const sciColor  = '#10b981';
    const bothColor = '#a78bfa';

    const makeINUTypeSection = (typeData, label, typeKey, color) => {
        const isBest = sc.best === typeKey;
        const rankRows = typeData.selected.filter(d => d.type === '공통/일반').map(d => `
            <tr style="border-bottom:1px solid rgba(148,163,184,0.07);">
                <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#94a3b8;">${d.category || '-'}</td>
                <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#e2e8f0;">${d.subject || '-'}</td>
                <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#94a3b8;text-align:center;">${d.credit}</td>
                <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#60a5fa;text-align:center;">${d.rank}</td>
                <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#e2e8f0;text-align:right;">${d.score.toFixed(1)}</td>
                <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#94a3b8;text-align:right;">${(d.score * d.credit).toFixed(2)}</td>
            </tr>`).join('');

        const achRows = typeData.selected.filter(d => d.type === '진로선택').map(d => `
            <tr style="border-bottom:1px solid rgba(148,163,184,0.07);background:rgba(167,139,250,0.04);">
                <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#94a3b8;">${d.category || '-'}</td>
                <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#e2e8f0;">${d.subject || '-'} <span style="font-size:0.72rem;color:#a78bfa;">[진로 ${d.achOrder}위]</span></td>
                <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#94a3b8;text-align:center;">${d.credit}</td>
                <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#a78bfa;text-align:center;">${d.ach} (→${d.effectiveRank}등급)</td>
                <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#e2e8f0;text-align:right;">${d.score.toFixed(1)}</td>
                <td style="padding:0.45rem 0.7rem;font-size:0.8rem;color:#94a3b8;text-align:right;">${(d.score * d.credit).toFixed(2)}</td>
            </tr>`).join('');

        const unselRows = typeData.unselected.filter(d => d.credit > 0).map(d => `
            <tr style="border-bottom:1px solid rgba(148,163,184,0.05);">
                <td style="padding:0.35rem 0.7rem;font-size:0.75rem;color:#475569;" colspan="2">[${d.reason}] ${d.category || '-'} / ${d.subject || '-'}</td>
                <td style="padding:0.35rem 0.7rem;font-size:0.75rem;color:#475569;text-align:center;">${d.credit}</td>
                <td style="padding:0.35rem 0.7rem;font-size:0.75rem;color:#475569;text-align:center;">${d.rank > 0 ? d.rank + '등급' : (d.ach || '-')}</td>
                <td style="padding:0.35rem 0.7rem;font-size:0.75rem;color:#475569;text-align:right;" colspan="2">-</td>
            </tr>`).join('');

        return `
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:1rem;margin-bottom:1rem;${isBest ? `border-color:${color};box-shadow:0 0 0 1px ${color}40;` : ''}">
            <div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.8rem;">
                <span style="font-size:0.9rem;font-weight:600;color:${color};">${label}</span>
                ${isBest ? `<span style="background:${color};color:#fff;font-size:0.7rem;padding:0.15rem 0.5rem;border-radius:4px;font-weight:700;">최고 계열</span>` : ''}
                <span style="margin-left:auto;font-size:0.95rem;font-weight:700;color:${color};">${typeData.finalScore.toFixed(2)} / 100</span>
            </div>
            <div style="font-size:0.78rem;color:#64748b;margin-bottom:0.6rem;">
                반영점수(가중평균): ${typeData.baseScore.toFixed(2)} × 10 = ${typeData.finalScore.toFixed(2)}&nbsp;&nbsp;|&nbsp;&nbsp;Σ(점수×이수단위): ${typeData.pts.toFixed(2)} / Σ이수단위: ${typeData.crd}
            </div>
            ${rankRows || achRows ? `
            <table style="width:100%;border-collapse:collapse;font-size:0.82rem;margin-bottom:0.5rem;">
                <thead><tr style="background:rgba(8,145,178,0.08);">
                    <th style="padding:0.4rem 0.7rem;color:#67e8f9;text-align:left;">교과</th>
                    <th style="padding:0.4rem 0.7rem;color:#67e8f9;text-align:left;">과목명</th>
                    <th style="padding:0.4rem 0.7rem;color:#67e8f9;text-align:center;">이수단위</th>
                    <th style="padding:0.4rem 0.7rem;color:#67e8f9;text-align:center;">등급/성취도</th>
                    <th style="padding:0.4rem 0.7rem;color:#67e8f9;text-align:right;">환산점수</th>
                    <th style="padding:0.4rem 0.7rem;color:#67e8f9;text-align:right;">점수×이수단위</th>
                </tr></thead>
                <tbody>${rankRows}${achRows}</tbody>
            </table>` : `<div style="font-size:0.8rem;color:#64748b;">반영 과목 없음</div>`}
            ${unselRows ? `
            <div style="font-size:0.78rem;color:#64748b;margin:0.4rem 0 0.3rem;">미반영 과목</div>
            <table style="width:100%;border-collapse:collapse;font-size:0.8rem;">
                <thead><tr style="background:rgba(255,255,255,0.02);">
                    <th style="padding:0.4rem 0.7rem;color:#475569;text-align:left;" colspan="2">사유 / 교과 / 과목명</th>
                    <th style="padding:0.4rem 0.7rem;color:#475569;text-align:center;">이수단위</th>
                    <th style="padding:0.4rem 0.7rem;color:#475569;text-align:center;">등급</th>
                    <th style="padding:0.4rem 0.7rem;color:#475569;text-align:right;" colspan="2">-</th>
                </tr></thead>
                <tbody>${unselRows}</tbody>
            </table>` : ''}
        </div>`;
    };

    return `
        <div style="margin-bottom:1.2rem;">
            <div style="font-size:1.1rem;font-weight:700;color:#f1f5f9;margin-bottom:0.6rem;">
                ${student.class !== '미상' ? student.class + '반 ' : ''}${student.number ? student.number + '번 ' : ''}${student.name}
            </div>
            <div style="display:flex;gap:1.5rem;flex-wrap:wrap;font-size:0.88rem;background:rgba(8,145,178,0.08);padding:0.8rem 1rem;border-radius:8px;margin-bottom:0.8rem;">
                <span>인문계열: <strong style="color:${humColor};">${sc.hum.finalScore.toFixed(2)}</strong></span>
                <span>자연계열: <strong style="color:${sciColor};">${sc.sci.finalScore.toFixed(2)}</strong></span>
                <span>자유전공융합: <strong style="color:${bothColor};">${sc.both.finalScore.toFixed(2)}</strong></span>
                <span>대표 점수 (최고): <strong style="color:#fbbf24;font-size:1rem;">${sc.displayScore.toFixed(2)} / 100</strong></span>
            </div>
            <p style="font-size:0.78rem;color:#64748b;margin:0 0 0.8rem;">
                ※ 등급환산점수: 1=10.0 · 2=9.8 · 3=9.6 · 4=9.4 · 5=9.0 · 6=8.0 · 7=4.0 · 8=2.0 · 9=0<br>
                ※ 진로선택 성취도 변환: A=1등급(10.0) · B=2등급(9.8) · C=4등급(9.4), 상위 3과목만 반영<br>
                ※ 최종 = Σ(환산점수×이수단위)÷Σ이수단위 × 10 (소수 셋째자리 반올림)
            </p>
        </div>
        ${makeINUTypeSection(sc.hum,  '인문계열&nbsp;&nbsp;<span style="font-size:0.8rem;color:#64748b;">(국어·수학·영어·사회, 한국사 포함)</span>', 'hum',  humColor)}
        ${makeINUTypeSection(sc.sci,  '자연계열&nbsp;&nbsp;<span style="font-size:0.8rem;color:#64748b;">(국어·수학·영어·과학)</span>', 'sci',  sciColor)}
        ${makeINUTypeSection(sc.both, '자유전공융합학부&nbsp;&nbsp;<span style="font-size:0.8rem;color:#64748b;">(국어·수학·영어·사회·과학)</span>', 'both', bothColor)}`;
}

function buildGNUDetailHTML(student, sc) {
    const { regular, careerDetail, regAvg, regCrd, regScore, careerScore, unselected, finalScore } = sc;

    const regRows = regular.map(s => `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.07);">
            <td style="padding:0.3rem 0.6rem;color:#94a3b8;font-size:0.78rem;">${s.subject || '-'}</td>
            <td style="padding:0.3rem 0.6rem;text-align:center;color:#e2e8f0;font-size:0.78rem;">${s.rank}</td>
            <td style="padding:0.3rem 0.6rem;text-align:center;color:#94a3b8;font-size:0.78rem;">${s.credit}</td>
            <td style="padding:0.3rem 0.6rem;text-align:right;color:#fbbf24;font-size:0.78rem;">${s.score}</td>
        </tr>`).join('');

    const subjLabelMap = { korean:'국어', math:'수학', english:'영어', social:'사회/한국사', science:'과학' };
    const careerRows = Object.entries(careerDetail).map(([key, d]) => {
        const label = subjLabelMap[key];
        if (d.top3.length === 0) {
            return `<tr style="border-bottom:1px solid rgba(148,163,184,0.07);">
                <td style="padding:0.25rem 0.6rem;color:#64748b;font-size:0.78rem;">${label}</td>
                <td colspan="3" style="padding:0.25rem 0.6rem;color:#475569;font-size:0.78rem;text-align:center;">진로선택 없음 (0점)</td>
            </tr>`;
        }
        const courseStr = d.top3.map(c => `${c.subject||'-'}(${c.ach}=${c.achScore})`).join(' + ');
        return `<tr style="border-bottom:1px solid rgba(148,163,184,0.07);">
            <td style="padding:0.25rem 0.6rem;color:#94a3b8;font-size:0.78rem;">${label}</td>
            <td style="padding:0.25rem 0.6rem;color:#a78bfa;font-size:0.75rem;">${courseStr}</td>
            <td style="padding:0.25rem 0.6rem;text-align:center;color:#94a3b8;font-size:0.78rem;">${d.sum.toFixed(1)}/3</td>
            <td style="padding:0.25rem 0.6rem;text-align:right;color:#fbbf24;font-size:0.78rem;">+${d.bonus.toFixed(4)}</td>
        </tr>`;
    }).join('');

    const unselRows = unselected.length > 0
        ? `<details style="font-size:0.78rem;color:#64748b;margin-top:0.3rem;">
            <summary style="cursor:pointer;">반영교과 외 (${unselected.length}개)</summary>
            <div style="margin-top:0.2rem;">
            ${unselected.map(s => `<span style="display:inline-block;margin:0.1rem 0.2rem;padding:0.12rem 0.35rem;background:rgba(100,116,139,0.12);border-radius:4px;color:#94a3b8;">[${s.reason}] ${s.category || '-'} / ${s.subject || '-'}</span>`).join('')}
            </div>
           </details>`
        : '';

    return `
        <div style="padding:0.5rem 0.2rem;">
            <div style="background:rgba(15,118,110,0.08);border:1px solid rgba(15,118,110,0.3);border-radius:10px;padding:0.75rem 1rem;margin-bottom:0.8rem;">
                <div style="display:flex;align-items:center;gap:0.8rem;flex-wrap:wrap;">
                    <strong style="color:#93c5fd;font-size:0.93rem;">${student.name}</strong>
                    <span style="color:#94a3b8;font-size:0.82rem;">이수단위 합계 <strong style="color:#e2e8f0;">${regCrd}</strong></span>
                    <span style="margin-left:auto;font-size:0.97rem;"><strong style="color:#fbbf24;">${finalScore.toFixed(2)} / 1000</strong></span>
                </div>
                <div style="margin-top:0.4rem;font-size:0.8rem;color:#64748b;">
                    일반교과: 850 + ${regAvg.toFixed(4)} = <strong style="color:#fbbf24;">${regScore.toFixed(4)}</strong>
                    &nbsp;+&nbsp; 진로선택: <strong style="color:#a78bfa;">+${careerScore.toFixed(4)}</strong>
                    &nbsp;= <strong style="color:#fbbf24;">${finalScore.toFixed(2)}</strong>
                </div>
            </div>
            <p style="font-size:0.76rem;color:#64748b;margin:0 0 0.7rem;">
                ※ 등급환산: 1=150 · 2=135 · 3=120 · 4=105 · 5=90 · 6=75 · 7=60 · 8=40 · 9=0<br>
                ※ 진로선택: A=0.5 · B=0.3 · C=0.1, 교과별 상위3합÷3 → 5교과 합÷5 (최대 +0.5점)
            </p>
            ${regular.length > 0 ? `
            <div style="font-size:0.82rem;color:#94a3b8;margin-bottom:0.3rem;">석차등급과목 (${regCrd}단위) — 가중평균 <strong style="color:#fbbf24;">${regAvg.toFixed(4)}</strong></div>
            <table style="width:100%;border-collapse:collapse;margin-bottom:0.8rem;">
                <thead><tr style="background:rgba(0,0,0,0.2);">
                    <th style="padding:0.25rem 0.6rem;text-align:left;color:#64748b;font-size:0.73rem;font-weight:500;">과목명</th>
                    <th style="padding:0.25rem 0.6rem;text-align:center;color:#64748b;font-size:0.73rem;font-weight:500;">등급</th>
                    <th style="padding:0.25rem 0.6rem;text-align:center;color:#64748b;font-size:0.73rem;font-weight:500;">이수단위</th>
                    <th style="padding:0.25rem 0.6rem;text-align:right;color:#64748b;font-size:0.73rem;font-weight:500;">환산점수</th>
                </tr></thead>
                <tbody>${regRows}</tbody>
            </table>` : ''}
            <div style="font-size:0.82rem;color:#a78bfa;margin-bottom:0.3rem;">진로선택 가산점 — 교과별 상위3합÷3 → 합계 ÷5 = <strong style="color:#a78bfa;">+${careerScore.toFixed(4)}</strong></div>
            <table style="width:100%;border-collapse:collapse;margin-bottom:0.5rem;">
                <thead><tr style="background:rgba(0,0,0,0.2);">
                    <th style="padding:0.25rem 0.6rem;text-align:left;color:#64748b;font-size:0.73rem;font-weight:500;">교과</th>
                    <th style="padding:0.25rem 0.6rem;text-align:left;color:#64748b;font-size:0.73rem;font-weight:500;">상위 3과목</th>
                    <th style="padding:0.25rem 0.6rem;text-align:center;color:#64748b;font-size:0.73rem;font-weight:500;">합÷3</th>
                    <th style="padding:0.25rem 0.6rem;text-align:right;color:#64748b;font-size:0.73rem;font-weight:500;">교과가산점</th>
                </tr></thead>
                <tbody>${careerRows}</tbody>
            </table>
            ${unselRows}
        </div>`;
}

function buildCNUDetailHTML(student, sc) {
    const { regular, career, totalCrd, totalPts, unselected, finalScore } = sc;

    const regRows = regular.map(s => `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.07);">
            <td style="padding:0.3rem 0.6rem;color:#94a3b8;font-size:0.78rem;">${s.subject || '-'}</td>
            <td style="padding:0.3rem 0.6rem;text-align:center;color:#94a3b8;font-size:0.72rem;">${s.category || '-'}</td>
            <td style="padding:0.3rem 0.6rem;text-align:center;color:#e2e8f0;font-size:0.78rem;">${s.rank}</td>
            <td style="padding:0.3rem 0.6rem;text-align:center;color:#94a3b8;font-size:0.78rem;">${s.credit}</td>
            <td style="padding:0.3rem 0.6rem;text-align:right;color:#fbbf24;font-size:0.78rem;">${s.score}</td>
        </tr>`).join('');

    const carRows = career.map(s => `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.07);">
            <td style="padding:0.3rem 0.6rem;color:#94a3b8;font-size:0.78rem;">${s.subject || '-'}</td>
            <td style="padding:0.3rem 0.6rem;text-align:center;color:#94a3b8;font-size:0.72rem;">${s.category || '-'}</td>
            <td style="padding:0.3rem 0.6rem;text-align:center;color:#a78bfa;font-size:0.78rem;">${s.ach}</td>
            <td style="padding:0.3rem 0.6rem;text-align:center;color:#94a3b8;font-size:0.78rem;">${s.credit}</td>
            <td style="padding:0.3rem 0.6rem;text-align:right;color:#fbbf24;font-size:0.78rem;">
                ${s.score} <span style="color:#64748b;font-size:0.72rem;">(${s.convertedRank}등급, ${s.convertNote})</span>
            </td>
        </tr>`).join('');

    const unselRows = unselected.length > 0
        ? `<details style="font-size:0.78rem;color:#64748b;margin-top:0.3rem;">
            <summary style="cursor:pointer;">반영교과 외 (${unselected.length}개)</summary>
            <div style="margin-top:0.2rem;">
            ${unselected.map(s => `<span style="display:inline-block;margin:0.1rem 0.2rem;padding:0.12rem 0.35rem;background:rgba(100,116,139,0.12);border-radius:4px;color:#94a3b8;">[${s.reason}] ${s.category || '-'} / ${s.subject || '-'}</span>`).join('')}
            </div>
           </details>`
        : '';

    const avgScore = totalCrd > 0 ? totalPts / totalCrd : 0;

    return `
        <div style="padding:0.5rem 0.2rem;">
            <div style="background:rgba(180,83,9,0.08);border:1px solid rgba(180,83,9,0.3);border-radius:10px;padding:0.75rem 1rem;margin-bottom:0.8rem;">
                <div style="display:flex;align-items:center;gap:0.8rem;flex-wrap:wrap;">
                    <strong style="color:#93c5fd;font-size:0.93rem;">${student.name}</strong>
                    <span style="color:#94a3b8;font-size:0.82rem;">이수단위 합계 <strong style="color:#e2e8f0;">${totalCrd}</strong></span>
                    <span style="margin-left:auto;font-size:0.97rem;"><strong style="color:#fbbf24;">${finalScore.toFixed(2)} / 100</strong></span>
                </div>
                <div style="margin-top:0.4rem;font-size:0.8rem;color:#64748b;">
                    교과점수 = Σ(등급점수×이수단위) ÷ ${totalCrd} = <strong style="color:#fbbf24;">${finalScore.toFixed(2)}</strong>
                    &nbsp;<span style="color:#94a3b8;">(평균등급점수 ${avgScore.toFixed(4)})</span>
                </div>
            </div>
            <p style="font-size:0.76rem;color:#64748b;margin:0 0 0.7rem;">
                ※ 등급환산: 1=100 · 2=90 · 3=80 · 4=70 · 5=60 · 6=50 · 7=40 · 8=30 · 9=20<br>
                ※ 반영교과: 국어·수학·영어·한국사·사회·과학·기술가정·제2외국어·한문 (체육·예술·교양·정보 제외)
            </p>
            ${regular.length > 0 ? `
            <div style="font-size:0.82rem;color:#94a3b8;margin-bottom:0.3rem;">석차등급과목 (${regular.length}과목)</div>
            <table style="width:100%;border-collapse:collapse;margin-bottom:0.8rem;">
                <thead><tr style="background:rgba(0,0,0,0.2);">
                    <th style="padding:0.25rem 0.6rem;text-align:left;color:#64748b;font-size:0.73rem;font-weight:500;">과목명</th>
                    <th style="padding:0.25rem 0.6rem;text-align:center;color:#64748b;font-size:0.73rem;font-weight:500;">교과</th>
                    <th style="padding:0.25rem 0.6rem;text-align:center;color:#64748b;font-size:0.73rem;font-weight:500;">등급</th>
                    <th style="padding:0.25rem 0.6rem;text-align:center;color:#64748b;font-size:0.73rem;font-weight:500;">이수단위</th>
                    <th style="padding:0.25rem 0.6rem;text-align:right;color:#64748b;font-size:0.73rem;font-weight:500;">환산점수</th>
                </tr></thead>
                <tbody>${regRows}</tbody>
            </table>` : ''}
            ${career.length > 0 ? `
            <div style="font-size:0.82rem;color:#a78bfa;margin-bottom:0.3rem;">진로선택과목 (성취도 → 등급환산, ${career.length}과목)</div>
            <table style="width:100%;border-collapse:collapse;margin-bottom:0.5rem;">
                <thead><tr style="background:rgba(0,0,0,0.2);">
                    <th style="padding:0.25rem 0.6rem;text-align:left;color:#64748b;font-size:0.73rem;font-weight:500;">과목명</th>
                    <th style="padding:0.25rem 0.6rem;text-align:center;color:#64748b;font-size:0.73rem;font-weight:500;">교과</th>
                    <th style="padding:0.25rem 0.6rem;text-align:center;color:#64748b;font-size:0.73rem;font-weight:500;">성취도</th>
                    <th style="padding:0.25rem 0.6rem;text-align:center;color:#64748b;font-size:0.73rem;font-weight:500;">이수단위</th>
                    <th style="padding:0.25rem 0.6rem;text-align:right;color:#64748b;font-size:0.73rem;font-weight:500;">환산점수(등급)</th>
                </tr></thead>
                <tbody>${carRows}</tbody>
            </table>` : ''}
            ${unselRows}
        </div>`;
}

function buildCBNUDetailHTML(student, sc) {
    const { regular, career, avgScore, totalCrd, unselected, finalScore } = sc;

    const regRows = regular.map(s => `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.07);">
            <td style="padding:0.3rem 0.6rem;color:#94a3b8;font-size:0.78rem;">${s.subject || '-'}</td>
            <td style="padding:0.3rem 0.6rem;text-align:center;color:#e2e8f0;font-size:0.78rem;">${s.rank}</td>
            <td style="padding:0.3rem 0.6rem;text-align:center;color:#94a3b8;font-size:0.78rem;">${s.credit}</td>
            <td style="padding:0.3rem 0.6rem;text-align:right;color:#fbbf24;font-size:0.78rem;">${s.score}</td>
        </tr>`).join('');

    const carRows = career.map(s => `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.07);">
            <td style="padding:0.3rem 0.6rem;color:#94a3b8;font-size:0.78rem;">${s.subject || '-'}</td>
            <td style="padding:0.3rem 0.6rem;text-align:center;color:#a78bfa;font-size:0.78rem;">${s.ach}</td>
            <td style="padding:0.3rem 0.6rem;text-align:center;color:#94a3b8;font-size:0.78rem;">${s.credit}</td>
            <td style="padding:0.3rem 0.6rem;text-align:right;color:#fbbf24;font-size:0.78rem;">
                ${s.score} <span style="color:#64748b;font-size:0.72rem;">(${s.convertedRank}등급, ${s.convertNote})</span>
            </td>
        </tr>`).join('');

    const unselRows = unselected.length > 0
        ? `<details style="font-size:0.78rem;color:#64748b;margin-top:0.3rem;">
            <summary style="cursor:pointer;">반영교과 외 (${unselected.length}개)</summary>
            <div style="margin-top:0.2rem;">
            ${unselected.map(s => `<span style="display:inline-block;margin:0.1rem 0.2rem;padding:0.12rem 0.35rem;background:rgba(100,116,139,0.12);border-radius:4px;color:#94a3b8;">[${s.reason}] ${s.category || '-'} / ${s.subject || '-'}</span>`).join('')}
            </div>
           </details>`
        : '';

    return `
        <div style="padding:0.5rem 0.2rem;">
            <div style="background:rgba(8,145,178,0.08);border:1px solid rgba(8,145,178,0.3);border-radius:10px;padding:0.75rem 1rem;margin-bottom:0.8rem;">
                <div style="display:flex;align-items:center;gap:0.8rem;flex-wrap:wrap;">
                    <strong style="color:#93c5fd;font-size:0.93rem;">${student.name}</strong>
                    <span style="color:#94a3b8;font-size:0.82rem;">이수단위 합계 <strong style="color:#e2e8f0;">${totalCrd}</strong></span>
                    <span style="margin-left:auto;font-size:0.97rem;"><strong style="color:#fbbf24;">${finalScore.toFixed(2)} / 80</strong></span>
                </div>
                <div style="margin-top:0.4rem;font-size:0.8rem;color:#64748b;">
                    평균등급점수 ${avgScore.toFixed(4)} × 4.0 + 40 = <strong style="color:#fbbf24;">${finalScore.toFixed(2)}</strong>
                    &nbsp;<span style="color:#94a3b8;">(기본점수 40점 포함)</span>
                </div>
            </div>
            <p style="font-size:0.76rem;color:#64748b;margin:0 0 0.7rem;">
                ※ 등급환산: 1=10 · 2=9.5 · 3=9 · 4=8.5 · 5=8 · 6=7.5 · 7=7 · 8=4 · 9=0<br>
                ※ 진로선택: A→1등급 / B→누적비율(B+C%) / C→누적비율(C%)로 등급환산
            </p>
            ${regular.length > 0 ? `
            <div style="font-size:0.82rem;color:#94a3b8;margin-bottom:0.3rem;">석차등급과목 (${regular.length}과목)</div>
            <table style="width:100%;border-collapse:collapse;margin-bottom:0.8rem;">
                <thead><tr style="background:rgba(0,0,0,0.2);">
                    <th style="padding:0.25rem 0.6rem;text-align:left;color:#64748b;font-size:0.73rem;font-weight:500;">과목명</th>
                    <th style="padding:0.25rem 0.6rem;text-align:center;color:#64748b;font-size:0.73rem;font-weight:500;">등급</th>
                    <th style="padding:0.25rem 0.6rem;text-align:center;color:#64748b;font-size:0.73rem;font-weight:500;">이수단위</th>
                    <th style="padding:0.25rem 0.6rem;text-align:right;color:#64748b;font-size:0.73rem;font-weight:500;">환산점수</th>
                </tr></thead>
                <tbody>${regRows}</tbody>
            </table>` : ''}
            ${career.length > 0 ? `
            <div style="font-size:0.82rem;color:#a78bfa;margin-bottom:0.3rem;">진로선택과목 (성취도 → 등급환산, ${career.length}과목)</div>
            <table style="width:100%;border-collapse:collapse;margin-bottom:0.5rem;">
                <thead><tr style="background:rgba(0,0,0,0.2);">
                    <th style="padding:0.25rem 0.6rem;text-align:left;color:#64748b;font-size:0.73rem;font-weight:500;">과목명</th>
                    <th style="padding:0.25rem 0.6rem;text-align:center;color:#64748b;font-size:0.73rem;font-weight:500;">성취도</th>
                    <th style="padding:0.25rem 0.6rem;text-align:center;color:#64748b;font-size:0.73rem;font-weight:500;">이수단위</th>
                    <th style="padding:0.25rem 0.6rem;text-align:right;color:#64748b;font-size:0.73rem;font-weight:500;">환산점수(등급)</th>
                </tr></thead>
                <tbody>${carRows}</tbody>
            </table>` : ''}
            ${unselRows}
        </div>`;
}

function buildKNUDetailHTML(student, sc) {
    const { regular, career, regAvg, regCrd, unselected, finalScore } = sc;

    const regRows = regular.map(s => `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.07);">
            <td style="padding:0.3rem 0.6rem;color:#94a3b8;font-size:0.78rem;">${s.subject || '-'}</td>
            <td style="padding:0.3rem 0.6rem;text-align:center;color:#e2e8f0;font-size:0.78rem;">${s.rank}</td>
            <td style="padding:0.3rem 0.6rem;text-align:center;color:#94a3b8;font-size:0.78rem;">${s.credit}</td>
            <td style="padding:0.3rem 0.6rem;text-align:right;color:#fbbf24;font-size:0.78rem;">${s.score}</td>
        </tr>`).join('');

    const carRows = career.length > 0
        ? `<details style="font-size:0.78rem;color:#64748b;margin-top:0.3rem;">
            <summary style="cursor:pointer;">진로선택과목 (${career.length}개, 서류평가 반영)</summary>
            <div style="margin-top:0.2rem;">
            ${career.map(s => `<span style="display:inline-block;margin:0.1rem 0.2rem;padding:0.12rem 0.35rem;background:rgba(100,116,139,0.12);border-radius:4px;color:#94a3b8;">[서류평가] ${s.subject || '-'} (${s.ach})</span>`).join('')}
            </div>
           </details>`
        : '';

    const unselRows = unselected.length > 0
        ? `<details style="font-size:0.78rem;color:#64748b;margin-top:0.3rem;">
            <summary style="cursor:pointer;">반영교과 외 (${unselected.length}개)</summary>
            <div style="margin-top:0.2rem;">
            ${unselected.map(s => `<span style="display:inline-block;margin:0.1rem 0.2rem;padding:0.12rem 0.35rem;background:rgba(100,116,139,0.12);border-radius:4px;color:#94a3b8;">[${s.reason}] ${s.category || '-'} / ${s.subject || '-'}</span>`).join('')}
            </div>
           </details>`
        : '';

    return `
        <div style="padding:0.5rem 0.2rem;">
            <div style="background:rgba(147,51,234,0.08);border:1px solid rgba(147,51,234,0.3);border-radius:10px;padding:0.75rem 1rem;margin-bottom:0.8rem;">
                <div style="display:flex;align-items:center;gap:0.8rem;flex-wrap:wrap;">
                    <strong style="color:#93c5fd;font-size:0.93rem;">${student.name}</strong>
                    <span style="color:#94a3b8;font-size:0.82rem;">이수단위 합계 <strong style="color:#e2e8f0;">${regCrd}</strong></span>
                    <span style="margin-left:auto;font-size:0.97rem;"><strong style="color:#fbbf24;">${finalScore.toFixed(2)} / 400</strong></span>
                </div>
                <div style="margin-top:0.4rem;font-size:0.8rem;color:#64748b;">
                    교과점수 = Σ(등급점수×이수단위) ÷ ${regCrd} = <strong style="color:#fbbf24;">${finalScore.toFixed(2)}</strong>
                    &nbsp;<span style="color:#94a3b8;">(총점 500점 중 교과 400점)</span>
                </div>
            </div>
            <p style="font-size:0.76rem;color:#64748b;margin:0 0 0.7rem;">
                ※ 등급환산: 1=400 · 2=390 · 3=380 · 4=370 · 5=360 · 6=350 · 7=300 · 8=200 · 9=0<br>
                ※ 진로선택: 교과 점수 제외, 서류평가(교과이수성실도 100점)에서 반영
            </p>
            ${regular.length > 0 ? `
            <div style="font-size:0.82rem;color:#94a3b8;margin-bottom:0.3rem;">석차등급과목 (${regCrd}단위) — 가중평균 <strong style="color:#fbbf24;">${regAvg.toFixed(2)}</strong></div>
            <table style="width:100%;border-collapse:collapse;margin-bottom:0.8rem;">
                <thead><tr style="background:rgba(0,0,0,0.2);">
                    <th style="padding:0.25rem 0.6rem;text-align:left;color:#64748b;font-size:0.73rem;font-weight:500;">과목명</th>
                    <th style="padding:0.25rem 0.6rem;text-align:center;color:#64748b;font-size:0.73rem;font-weight:500;">등급</th>
                    <th style="padding:0.25rem 0.6rem;text-align:center;color:#64748b;font-size:0.73rem;font-weight:500;">이수단위</th>
                    <th style="padding:0.25rem 0.6rem;text-align:right;color:#64748b;font-size:0.73rem;font-weight:500;">환산점수</th>
                </tr></thead>
                <tbody>${regRows}</tbody>
            </table>` : ''}
            ${carRows}
            ${unselRows}
        </div>`;
}

function buildCNNUDetailHTML(student, sc) {
    const { regular, career, top3, carRest, regAvg, regScore, carScore, useBigo, regCrd, unselected, finalScore } = sc;

    const regRows = regular.map(s => `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.07);">
            <td style="padding:0.3rem 0.6rem;color:#94a3b8;font-size:0.78rem;">${s.subject || '-'}</td>
            <td style="padding:0.3rem 0.6rem;text-align:center;color:#e2e8f0;font-size:0.78rem;">${s.rank}</td>
            <td style="padding:0.3rem 0.6rem;text-align:center;color:#94a3b8;font-size:0.78rem;">${s.credit}</td>
            <td style="padding:0.3rem 0.6rem;text-align:right;color:#fbbf24;font-size:0.78rem;">${s.score}</td>
        </tr>`).join('');

    const top3Rows = top3.map((s, i) => `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.07);">
            <td style="padding:0.3rem 0.6rem;color:#94a3b8;font-size:0.78rem;">${s.subject || '-'}</td>
            <td style="padding:0.3rem 0.6rem;text-align:center;color:#a78bfa;font-size:0.78rem;">${s.ach || '-'}</td>
            <td style="padding:0.3rem 0.6rem;text-align:center;color:#94a3b8;font-size:0.78rem;">${s.credit}</td>
            <td style="padding:0.3rem 0.6rem;text-align:right;color:#fbbf24;font-size:0.78rem;">${s.score}<span style="color:#64748b;font-size:0.72rem;"> (${i + 1}위)</span></td>
        </tr>`).join('');

    const carRestRows = carRest.length > 0
        ? `<details style="font-size:0.78rem;color:#64748b;margin-top:0.3rem;">
            <summary style="cursor:pointer;">미반영 진로선택 (${carRest.length}개)</summary>
            <div style="margin-top:0.2rem;">
            ${carRest.map(s => `<span style="display:inline-block;margin:0.1rem 0.2rem;padding:0.12rem 0.35rem;background:rgba(100,116,139,0.12);border-radius:4px;color:#94a3b8;">[4위이하] ${s.subject || '-'} (${s.ach}, ${s.score}점)</span>`).join('')}
            </div>
           </details>`
        : '';

    const unselRows = unselected.length > 0
        ? `<details style="font-size:0.78rem;color:#64748b;margin-top:0.3rem;">
            <summary style="cursor:pointer;">반영교과 외 (${unselected.length}개)</summary>
            <div style="margin-top:0.2rem;">
            ${unselected.map(s => `<span style="display:inline-block;margin:0.1rem 0.2rem;padding:0.12rem 0.35rem;background:rgba(100,116,139,0.12);border-radius:4px;color:#94a3b8;">[${s.reason}] ${s.category || '-'} / ${s.subject || '-'}</span>`).join('')}
            </div>
           </details>`
        : '';

    const carScoreDetail = useBigo
        ? `<span style="color:#f87171;font-size:0.78rem;">진로선택 3개 미만 → 비교내신 적용: ${regScore.toFixed(3)} × 0.06666 = <strong>${carScore.toFixed(3)}</strong>점</span>`
        : `상위 3과목 합산 (${top3.map(s => s.score).join('+')} = ${top3.reduce((a, s) => a + s.score, 0)}) ÷ 3 = <strong style="color:#a78bfa;">${carScore.toFixed(3)}</strong>점`;

    return `
        <div style="padding:0.5rem 0.2rem;">
            <div style="background:rgba(3,105,161,0.08);border:1px solid rgba(3,105,161,0.3);border-radius:10px;padding:0.75rem 1rem;margin-bottom:0.8rem;">
                <div style="display:flex;align-items:center;gap:0.8rem;flex-wrap:wrap;">
                    <strong style="color:#93c5fd;font-size:0.93rem;">${student.name}</strong>
                    <span style="color:#94a3b8;font-size:0.82rem;">평균등급점수 <strong style="color:#e2e8f0;">${regAvg.toFixed(4)}</strong></span>
                    <span style="margin-left:auto;font-size:0.97rem;"><strong style="color:#fbbf24;">${finalScore.toFixed(2)} / 900</strong></span>
                </div>
                <div style="margin-top:0.4rem;font-size:0.8rem;color:#64748b;">
                    석차등급 실질점수: ${regAvg.toFixed(4)} × 2.25 = <strong style="color:#fbbf24;">${regScore.toFixed(3)}</strong>
                    &nbsp;→&nbsp; 기본660 + ${regScore.toFixed(3)} + 진로${carScore.toFixed(3)} = <strong style="color:#fbbf24;">${finalScore.toFixed(2)}</strong>
                </div>
            </div>
            <p style="font-size:0.76rem;color:#64748b;margin:0 0 0.7rem;">
                ※ 등급환산: 1=100 · 2=95 · 3=90 · 4=85 · 5=80 · 6=75 · 7=70 · 8=65 · 9=0<br>
                ※ 진로선택: A=15 · B=9 · C=3 (상위 3과목 합산÷3, max 15점)
            </p>
            ${regular.length > 0 ? `
            <div style="font-size:0.82rem;color:#94a3b8;margin-bottom:0.3rem;">석차등급산출과목 (${regCrd}단위) — 가중평균 <strong style="color:#fbbf24;">${regAvg.toFixed(4)}</strong> × 2.25 = <strong style="color:#fbbf24;">${regScore.toFixed(3)}</strong></div>
            <table style="width:100%;border-collapse:collapse;margin-bottom:0.8rem;">
                <thead><tr style="background:rgba(0,0,0,0.2);">
                    <th style="padding:0.25rem 0.6rem;text-align:left;color:#64748b;font-size:0.73rem;font-weight:500;">과목명</th>
                    <th style="padding:0.25rem 0.6rem;text-align:center;color:#64748b;font-size:0.73rem;font-weight:500;">등급</th>
                    <th style="padding:0.25rem 0.6rem;text-align:center;color:#64748b;font-size:0.73rem;font-weight:500;">이수단위</th>
                    <th style="padding:0.25rem 0.6rem;text-align:right;color:#64748b;font-size:0.73rem;font-weight:500;">환산점수</th>
                </tr></thead>
                <tbody>${regRows}</tbody>
            </table>` : ''}
            <div style="font-size:0.82rem;color:#a78bfa;margin-bottom:0.3rem;">진로선택과목 → ${carScoreDetail}</div>
            ${top3.length > 0 ? `
            <table style="width:100%;border-collapse:collapse;margin-bottom:0.3rem;">
                <thead><tr style="background:rgba(0,0,0,0.2);">
                    <th style="padding:0.25rem 0.6rem;text-align:left;color:#64748b;font-size:0.73rem;font-weight:500;">과목명</th>
                    <th style="padding:0.25rem 0.6rem;text-align:center;color:#64748b;font-size:0.73rem;font-weight:500;">성취도</th>
                    <th style="padding:0.25rem 0.6rem;text-align:center;color:#64748b;font-size:0.73rem;font-weight:500;">이수단위</th>
                    <th style="padding:0.25rem 0.6rem;text-align:right;color:#64748b;font-size:0.73rem;font-weight:500;">점수</th>
                </tr></thead>
                <tbody>${top3Rows}</tbody>
            </table>` : `<p style="font-size:0.78rem;color:#64748b;margin:0.2rem 0 0.3rem;">진로선택과목 없음 → 비교내신 적용</p>`}
            ${carRestRows}
            ${unselRows}
        </div>`;
}

function buildJBNUDetailHTML(student, sc) {
    const { regular, career, regAvg, carAvg, totalAvg, regCrd, carCrd, noCar, unselected, finalScore } = sc;

    const regRows = regular.map(s => `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.07);">
            <td style="padding:0.3rem 0.6rem;color:#94a3b8;font-size:0.78rem;">${s.subject || '-'}</td>
            <td style="padding:0.3rem 0.6rem;text-align:center;color:#e2e8f0;font-size:0.78rem;">${s.rank}</td>
            <td style="padding:0.3rem 0.6rem;text-align:center;color:#94a3b8;font-size:0.78rem;">${s.credit}</td>
            <td style="padding:0.3rem 0.6rem;text-align:right;color:#fbbf24;font-size:0.78rem;">${s.score.toFixed(2)}</td>
        </tr>`).join('');

    const carRows = career.map(s => `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.07);">
            <td style="padding:0.3rem 0.6rem;color:#94a3b8;font-size:0.78rem;">${s.subject || '-'}</td>
            <td style="padding:0.3rem 0.6rem;text-align:center;color:#a78bfa;font-size:0.78rem;">${s.ach || '-'}</td>
            <td style="padding:0.3rem 0.6rem;text-align:center;color:#94a3b8;font-size:0.78rem;">${s.credit}</td>
            <td style="padding:0.3rem 0.6rem;text-align:right;color:#fbbf24;font-size:0.78rem;">${s.score.toFixed(2)}</td>
        </tr>`).join('');

    const unselRows = unselected.length > 0
        ? `<details style="font-size:0.78rem;color:#64748b;margin-top:0.5rem;">
            <summary style="cursor:pointer;">미반영 과목 (${unselected.length}개)</summary>
            <div style="margin-top:0.25rem;">
            ${unselected.map(s => `<span style="display:inline-block;margin:0.1rem 0.2rem;padding:0.12rem 0.35rem;background:rgba(100,116,139,0.12);border-radius:4px;color:#94a3b8;">[${s.reason}] ${s.category || '-'} / ${s.subject || '-'}</span>`).join('')}
            </div>
           </details>`
        : '';

    const avgFormula = noCar
        ? `석차등급 평균 <strong style="color:#fbbf24;">${regAvg.toFixed(4)}</strong> × 100%`
        : `석차등급 평균 <strong style="color:#fbbf24;">${regAvg.toFixed(4)}</strong> × 90% + 진로선택 평균 <strong style="color:#a78bfa;">${carAvg.toFixed(4)}</strong> × 10% = <strong style="color:#e2e8f0;">${totalAvg.toFixed(4)}</strong>`;

    return `
        <div style="padding:0.5rem 0.2rem;">
            <div style="background:rgba(4,120,87,0.08);border:1px solid rgba(4,120,87,0.3);border-radius:10px;padding:0.75rem 1rem;margin-bottom:0.8rem;">
                <div style="display:flex;align-items:center;gap:0.8rem;flex-wrap:wrap;">
                    <strong style="color:#93c5fd;font-size:0.93rem;">${student.name}</strong>
                    <span style="color:#94a3b8;font-size:0.82rem;">평균등급점수 <strong style="color:#e2e8f0;">${totalAvg.toFixed(4)}</strong> / 9.8</span>
                    <span style="margin-left:auto;font-size:0.97rem;"><strong style="color:#fbbf24;">${finalScore.toFixed(2)} / 1000</strong></span>
                </div>
                <div style="margin-top:0.4rem;font-size:0.82rem;color:#64748b;">
                    ${avgFormula}
                    &nbsp;→&nbsp; 930 + (70 × ${totalAvg.toFixed(4)} ÷ 9.8) = <strong style="color:#fbbf24;">${finalScore.toFixed(2)}</strong>
                </div>
            </div>
            <p style="font-size:0.76rem;color:#64748b;margin:0 0 0.7rem;">
                ※ 등급환산: 1=9.80 · 2=9.30 · 3=8.80 · 4=8.30 · 5=7.80 · 6=6.80 · 7=4.60 · 8=2.40 · 9=0.20<br>
                ※ 진로선택: A=9.30(2등급) · B=8.30(4등급) · C=4.60(7등급)
            </p>
            ${regular.length > 0 ? `
            <div style="font-size:0.82rem;color:#94a3b8;margin-bottom:0.3rem;">석차등급과목 (${regCrd}단위) — 평균 <strong style="color:#fbbf24;">${regAvg.toFixed(4)}</strong></div>
            <table style="width:100%;border-collapse:collapse;margin-bottom:0.8rem;">
                <thead><tr style="background:rgba(0,0,0,0.2);">
                    <th style="padding:0.25rem 0.6rem;text-align:left;color:#64748b;font-size:0.73rem;font-weight:500;">과목명</th>
                    <th style="padding:0.25rem 0.6rem;text-align:center;color:#64748b;font-size:0.73rem;font-weight:500;">등급</th>
                    <th style="padding:0.25rem 0.6rem;text-align:center;color:#64748b;font-size:0.73rem;font-weight:500;">이수단위</th>
                    <th style="padding:0.25rem 0.6rem;text-align:right;color:#64748b;font-size:0.73rem;font-weight:500;">환산점수</th>
                </tr></thead>
                <tbody>${regRows}</tbody>
            </table>` : ''}
            ${career.length > 0 ? `
            <div style="font-size:0.82rem;color:#a78bfa;margin-bottom:0.3rem;">진로선택과목 (${carCrd}단위) — 평균 <strong style="color:#a78bfa;">${carAvg.toFixed(4)}</strong></div>
            <table style="width:100%;border-collapse:collapse;margin-bottom:0.8rem;">
                <thead><tr style="background:rgba(0,0,0,0.2);">
                    <th style="padding:0.25rem 0.6rem;text-align:left;color:#64748b;font-size:0.73rem;font-weight:500;">과목명</th>
                    <th style="padding:0.25rem 0.6rem;text-align:center;color:#64748b;font-size:0.73rem;font-weight:500;">성취도</th>
                    <th style="padding:0.25rem 0.6rem;text-align:center;color:#64748b;font-size:0.73rem;font-weight:500;">이수단위</th>
                    <th style="padding:0.25rem 0.6rem;text-align:right;color:#64748b;font-size:0.73rem;font-weight:500;">환산점수</th>
                </tr></thead>
                <tbody>${carRows}</tbody>
            </table>` : `<p style="font-size:0.78rem;color:#64748b;margin:0.2rem 0 0.6rem;">진로선택과목 없음 — 석차등급 평균(${regAvg.toFixed(4)}) 100% 반영</p>`}
            ${unselRows}
        </div>`;
}

function buildKGUDetailHTML(student, sc) {
    const isHumBetter = sc.best === 'hum';
    const humColor = isHumBetter  ? '#fbbf24' : '#94a3b8';
    const sciColor = !isHumBetter ? '#fbbf24' : '#94a3b8';

    function makeKGUTypeSection(typeData, title, color, isBest) {
        const { regular, career, regAvg, carAvg, finalScore, unselected, noCar, regCrd, carCrd } = typeData;

        const regRows = regular.map(s => `
            <tr style="border-bottom:1px solid rgba(148,163,184,0.07);">
                <td style="padding:0.3rem 0.6rem;color:#94a3b8;font-size:0.78rem;">${s.subject || '-'}</td>
                <td style="padding:0.3rem 0.6rem;text-align:center;color:#e2e8f0;font-size:0.78rem;">${s.rank}</td>
                <td style="padding:0.3rem 0.6rem;text-align:center;color:#94a3b8;font-size:0.78rem;">${s.credit}</td>
                <td style="padding:0.3rem 0.6rem;text-align:right;color:#fbbf24;font-size:0.78rem;">${s.score}</td>
            </tr>`).join('');

        const carRows = career.map(s => `
            <tr style="border-bottom:1px solid rgba(148,163,184,0.07);">
                <td style="padding:0.3rem 0.6rem;color:#94a3b8;font-size:0.78rem;">${s.subject || '-'}</td>
                <td style="padding:0.3rem 0.6rem;text-align:center;color:#a78bfa;font-size:0.78rem;">${s.ach || '-'}</td>
                <td style="padding:0.3rem 0.6rem;text-align:center;color:#94a3b8;font-size:0.78rem;">${s.credit}</td>
                <td style="padding:0.3rem 0.6rem;text-align:right;color:#fbbf24;font-size:0.78rem;">${s.score}</td>
            </tr>`).join('');

        const unselRows = unselected.length > 0
            ? `<details style="font-size:0.78rem;color:#64748b;margin-top:0.4rem;">
                <summary style="cursor:pointer;">미반영 과목 (${unselected.length}개)</summary>
                <div style="margin-top:0.25rem;">
                ${unselected.map(s => `<span style="display:inline-block;margin:0.1rem 0.2rem;padding:0.12rem 0.35rem;background:rgba(100,116,139,0.12);border-radius:4px;color:#94a3b8;">[${s.reason}] ${s.category || '-'} / ${s.subject || '-'}</span>`).join('')}
                </div>
               </details>`
            : '';

        const regAvgDisplay = regCrd > 0 ? regAvg.toFixed(4) : '0';
        const carAvgDisplay = carCrd > 0 ? carAvg.toFixed(4) : `${regAvg.toFixed(4)} (공통/일반 대체)`;

        return `
        <div style="margin-top:1.1rem;border:1px solid rgba(${isBest ? '251,191,36' : '148,163,184'},0.28);border-radius:10px;overflow:hidden;">
            <div style="background:rgba(${isBest ? '251,191,36,0.07' : '30,41,59,0.5'});padding:0.65rem 1rem;display:flex;align-items:center;gap:0.8rem;flex-wrap:wrap;">
                <strong style="color:${color};font-size:0.93rem;">${title}</strong>
                ${isBest ? '<span style="background:#fbbf24;color:#1e293b;font-size:0.7rem;font-weight:700;padding:0.12rem 0.45rem;border-radius:999px;">최고 계열</span>' : ''}
                <span style="margin-left:auto;color:#94a3b8;font-size:0.82rem;">
                    = <strong style="color:${isBest ? '#fbbf24' : '#f1f5f9'};font-size:0.93rem;">${finalScore.toFixed(2)}</strong>
                    <span style="font-size:0.75rem;">/ 90</span>
                </span>
            </div>
            <div style="padding:0.7rem 0.9rem;">
                <div style="font-size:0.82rem;color:#64748b;margin-bottom:0.5rem;">
                    공통·일반선택 평균 <strong style="color:#e2e8f0;">${regAvgDisplay}</strong> × 81%
                    + 진로선택 평균 <strong style="color:#a78bfa;">${carAvgDisplay}</strong> × 9%
                    = <strong style="color:#fbbf24;">${finalScore.toFixed(4)}</strong>
                    ${noCar ? '<span style="color:#94a3b8;font-size:0.75rem;">(진로선택 없음 → 공통/일반 평균 대체)</span>' : ''}
                </div>
                ${regular.length > 0 ? `
                <div style="font-size:0.8rem;color:#94a3b8;margin-bottom:0.2rem;">공통·일반선택과목 (${regCrd}단위)</div>
                <table style="width:100%;border-collapse:collapse;margin-bottom:0.6rem;">
                    <thead><tr style="background:rgba(0,0,0,0.2);">
                        <th style="padding:0.25rem 0.6rem;text-align:left;color:#64748b;font-size:0.73rem;font-weight:500;">과목명</th>
                        <th style="padding:0.25rem 0.6rem;text-align:center;color:#64748b;font-size:0.73rem;font-weight:500;">등급</th>
                        <th style="padding:0.25rem 0.6rem;text-align:center;color:#64748b;font-size:0.73rem;font-weight:500;">이수단위</th>
                        <th style="padding:0.25rem 0.6rem;text-align:right;color:#64748b;font-size:0.73rem;font-weight:500;">환산점수</th>
                    </tr></thead>
                    <tbody>${regRows}</tbody>
                </table>` : ''}
                ${career.length > 0 ? `
                <div style="font-size:0.8rem;color:#a78bfa;margin-bottom:0.2rem;">진로선택과목 (${carCrd}단위)</div>
                <table style="width:100%;border-collapse:collapse;margin-bottom:0.6rem;">
                    <thead><tr style="background:rgba(0,0,0,0.2);">
                        <th style="padding:0.25rem 0.6rem;text-align:left;color:#64748b;font-size:0.73rem;font-weight:500;">과목명</th>
                        <th style="padding:0.25rem 0.6rem;text-align:center;color:#64748b;font-size:0.73rem;font-weight:500;">성취도</th>
                        <th style="padding:0.25rem 0.6rem;text-align:center;color:#64748b;font-size:0.73rem;font-weight:500;">이수단위</th>
                        <th style="padding:0.25rem 0.6rem;text-align:right;color:#64748b;font-size:0.73rem;font-weight:500;">환산점수</th>
                    </tr></thead>
                    <tbody>${carRows}</tbody>
                </table>` : `<p style="font-size:0.78rem;color:#64748b;margin:0.2rem 0 0.4rem;">진로선택과목 없음 — 공통·일반선택 평균(${regAvgDisplay})으로 대체 반영</p>`}
                ${unselRows}
            </div>
        </div>`;
    }

    return `
        <div style="padding:0.5rem 0.2rem;">
            <div style="background:rgba(185,28,28,0.07);border:1px solid rgba(185,28,28,0.28);border-radius:10px;padding:0.75rem 1rem;margin-bottom:0.8rem;">
                <div style="display:flex;align-items:center;gap:0.8rem;flex-wrap:wrap;">
                    <strong style="color:#93c5fd;font-size:0.93rem;">${student.name}</strong>
                    <span style="color:#94a3b8;font-size:0.82rem;">인문형 <strong style="color:${humColor};">${sc.hum.finalScore.toFixed(2)}</strong></span>
                    <span style="color:#94a3b8;font-size:0.82rem;">자연형 <strong style="color:${sciColor};">${sc.sci.finalScore.toFixed(2)}</strong></span>
                    <span style="margin-left:auto;font-size:0.97rem;"><strong style="color:#fbbf24;">최고: ${sc.displayScore.toFixed(2)} / 90</strong></span>
                </div>
            </div>
            <p style="font-size:0.76rem;color:#64748b;margin:0 0 0.7rem;">
                ※ 등급환산: 1=100 · 2=99 · 3=97 · 4=95 · 5=90 · 6=85 · 7=60 · 8=20 · 9=0<br>
                ※ 진로선택: A=100 · B=99 · C=95 (없으면 공통·일반 평균 대체)<br>
                ※ 교과점수 = 공통·일반평균 × 0.81 + 진로선택평균 × 0.09 (출결 10점 별도)
            </p>
            ${makeKGUTypeSection(sc.hum, '인문계열 (사회교과 전체 + 통합과학)', humColor, sc.best === 'hum')}
            ${makeKGUTypeSection(sc.sci, '자연계열 (과학교과 전체 + 통합사회·한국사)', sciColor, sc.best === 'sci')}
        </div>`;
}

function buildINCHDetailHTML(student, sc) {
    const isHumBetter = sc.best === 'hum';
    const humColor  = isHumBetter  ? '#fbbf24' : '#94a3b8';
    const sciColor  = !isHumBetter ? '#fbbf24' : '#94a3b8';

    const GYOGWA_LABELS = {
        korean: '국어', math: '수학', english: '영어',
        social: '사회(한국사 포함)', science: '과학'
    };

    function makeINCHTypeSection(typeData, title, color, isBest) {
        const { gyogwaResults, totalScore, bonus, totalBonusCrd, finalScore, unselected } = typeData;
        const targetKeys = typeData.isHum
            ? ['korean', 'math', 'english', 'social']
            : ['korean', 'math', 'english', 'science'];

        const gyogwaRows = targetKeys.map(key => {
            const r = gyogwaResults[key];
            const itemRows = r.items.map(s => {
                if (s.itemType === '공통/일반') {
                    return `<tr style="border-bottom:1px solid rgba(148,163,184,0.07);">
                        <td style="padding:0.3rem 0.6rem;color:#94a3b8;font-size:0.78rem;">${s.subject || '-'}</td>
                        <td style="padding:0.3rem 0.6rem;text-align:center;color:#e2e8f0;font-size:0.78rem;">${s.rank || '-'}</td>
                        <td style="padding:0.3rem 0.6rem;text-align:center;color:#94a3b8;font-size:0.78rem;">${s.credit}</td>
                        <td style="padding:0.3rem 0.6rem;text-align:center;color:#64748b;font-size:0.75rem;">등급계산</td>
                    </tr>`;
                } else {
                    return `<tr style="border-bottom:1px solid rgba(148,163,184,0.07);">
                        <td style="padding:0.3rem 0.6rem;color:#94a3b8;font-size:0.78rem;">${s.subject || '-'}</td>
                        <td style="padding:0.3rem 0.6rem;text-align:center;color:#a78bfa;font-size:0.78rem;">${s.ach || '-'}</td>
                        <td style="padding:0.3rem 0.6rem;text-align:center;color:#94a3b8;font-size:0.78rem;">${s.credit}</td>
                        <td style="padding:0.3rem 0.6rem;text-align:center;color:#a78bfa;font-size:0.75rem;">가산점만</td>
                    </tr>`;
                }
            }).join('');

            const noSubMsg = r.noSubject ? ' <span style="color:#f87171;font-size:0.75rem;">(없음→200점)</span>' : '';

            return `<tr style="background:rgba(29,78,216,0.05);border-bottom:1px solid rgba(148,163,184,0.15);">
                <td colspan="4" style="padding:0.45rem 0.8rem;">
                    <div style="display:flex;align-items:center;gap:0.8rem;flex-wrap:wrap;">
                        <strong style="color:#93c5fd;font-size:0.85rem;">${GYOGWA_LABELS[key]}</strong>
                        <span style="color:#64748b;font-size:0.78rem;">반영비율 ${(r.weight * 100).toFixed(0)}%</span>
                        ${r.crd > 0 ? `<span style="color:#94a3b8;font-size:0.78rem;">평균등급 ${r.avgGrade.toFixed(4)}</span>` : ''}
                        <span style="color:#e2e8f0;font-size:0.82rem;">환산점수 <strong style="color:#fbbf24;">${r.convScore}</strong>${noSubMsg}</span>
                        <span style="color:#64748b;font-size:0.78rem;">${r.convScore} × ${(r.weight * 100).toFixed(0)}% = <strong style="color:#f1f5f9;">${r.weighted.toFixed(2)}</strong></span>
                    </div>
                    ${r.items.length > 0 ? `<table style="width:100%;margin-top:0.35rem;border-collapse:collapse;">
                        <thead><tr style="background:rgba(0,0,0,0.2);">
                            <th style="padding:0.25rem 0.6rem;text-align:left;color:#64748b;font-size:0.73rem;font-weight:500;">과목명</th>
                            <th style="padding:0.25rem 0.6rem;text-align:center;color:#64748b;font-size:0.73rem;font-weight:500;">등급/성취</th>
                            <th style="padding:0.25rem 0.6rem;text-align:center;color:#64748b;font-size:0.73rem;font-weight:500;">이수단위</th>
                            <th style="padding:0.25rem 0.6rem;text-align:center;color:#64748b;font-size:0.73rem;font-weight:500;">비고</th>
                        </tr></thead>
                        <tbody>${itemRows}</tbody>
                    </table>` : ''}
                </td>
            </tr>`;
        }).join('');

        const unselRows = unselected.length > 0
            ? `<tr><td colspan="4" style="padding:0.35rem 0.8rem;">
                <details style="font-size:0.78rem;color:#64748b;">
                    <summary style="cursor:pointer;">미반영 과목 (${unselected.length}개)</summary>
                    <div style="margin-top:0.25rem;">
                    ${unselected.map(s => `<span style="display:inline-block;margin:0.1rem 0.2rem;padding:0.12rem 0.35rem;background:rgba(100,116,139,0.12);border-radius:4px;color:#94a3b8;">[${s.reason}] ${s.category || '-'} / ${s.subject || '-'}</span>`).join('')}
                    </div>
                </details>
               </td></tr>`
            : '';

        return `
        <div style="margin-top:1.1rem;border:1px solid rgba(${isBest ? '251,191,36' : '148,163,184'},0.28);border-radius:10px;overflow:hidden;">
            <div style="background:rgba(${isBest ? '251,191,36,0.07' : '30,41,59,0.5'});padding:0.65rem 1rem;display:flex;align-items:center;gap:0.8rem;flex-wrap:wrap;">
                <strong style="color:${color};font-size:0.93rem;">${title}</strong>
                ${isBest ? '<span style="background:#fbbf24;color:#1e293b;font-size:0.7rem;font-weight:700;padding:0.12rem 0.45rem;border-radius:999px;">최고 계열</span>' : ''}
                <span style="margin-left:auto;color:#94a3b8;font-size:0.82rem;">
                    교과합 <strong style="color:#e2e8f0;">${totalScore.toFixed(2)}</strong>
                    + 가산점 <strong style="color:#a78bfa;">${bonus.toFixed(2)}</strong>
                    = <strong style="color:${isBest ? '#fbbf24' : '#f1f5f9'};font-size:0.93rem;">${finalScore.toFixed(2)}</strong>
                </span>
            </div>
            <table style="width:100%;border-collapse:collapse;">
                <tbody>
                    ${gyogwaRows}
                    <tr style="background:rgba(167,139,250,0.07);border-top:1px solid rgba(148,163,184,0.18);">
                        <td colspan="4" style="padding:0.45rem 0.8rem;font-size:0.82rem;color:#94a3b8;">
                            <strong style="color:#a78bfa;">가산점</strong>:
                            반영교과 이수단위(진로선택 포함) ${totalBonusCrd}단위 × 0.05
                            = <strong style="color:#a78bfa;">${bonus.toFixed(2)}</strong>
                        </td>
                    </tr>
                    ${unselRows}
                </tbody>
            </table>
        </div>`;
    }

    return `
        <div style="padding:0.5rem 0.2rem;">
            <div style="background:rgba(29,78,216,0.08);border:1px solid rgba(29,78,216,0.3);border-radius:10px;padding:0.75rem 1rem;margin-bottom:0.8rem;">
                <div style="display:flex;align-items:center;gap:0.8rem;flex-wrap:wrap;">
                    <strong style="color:#93c5fd;font-size:0.93rem;">${student.name}</strong>
                    <span style="color:#94a3b8;font-size:0.82rem;">인문형 <strong style="color:${humColor};">${sc.hum.finalScore.toFixed(2)}</strong></span>
                    <span style="color:#94a3b8;font-size:0.82rem;">자연형 <strong style="color:${sciColor};">${sc.sci.finalScore.toFixed(2)}</strong></span>
                    <span style="margin-left:auto;font-size:0.97rem;"><strong style="color:#fbbf24;">최고: ${sc.displayScore.toFixed(2)} / 350</strong></span>
                </div>
            </div>
            <p style="font-size:0.76rem;color:#64748b;margin:0 0 0.7rem;">
                ※ 석차등급 환산점수: 1.00~1.49=350 · 1.50~1.99=349 · 2.00~2.24=347 · 2.25~2.49=345 · 2.50~2.74=343 · 2.75~2.99=341 · 3.00~3.24=338 · 3.25~3.49=335 · 3.50~3.74=332 · 3.75~3.99=329 · 4.00~4.24=325 · 4.25~4.49=321 · 4.50~4.74=317 · 4.75~4.99=313 · 5.00~5.49=307 · 5.50~5.99=300 · 6.00~6.99=280 · 7.00~7.99=250 · 8.00~9.00=200<br>
                ※ 진로선택과목은 가산점 이수단위에만 포함 (등급 환산 계산 제외)
            </p>
            ${makeINCHTypeSection(sc.hum, '인문계열 (국어 30% · 수학 20% · 영어 30% · 사회 20%)', humColor, sc.best === 'hum')}
            ${makeINCHTypeSection(sc.sci, '자연계열 (국어 20% · 수학 30% · 영어 30% · 과학 20%)', sciColor, sc.best === 'sci')}
        </div>`;
}

window.closeUnivScoreDetail = function() {
    const overlay = document.getElementById('univ-score-detail-overlay');
    if (overlay) overlay.style.display = 'none';
};

})();
