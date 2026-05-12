// 육각형 인재 확인하기 탭
(function () {
  'use strict';

  const DIMENSIONS = [
    { id: 'academic_attitude',  label: '학업 태도',           desc: '학업을 수행하고 학습해 나가려는 의지와 노력' },
    { id: 'inquiry',            label: '탐구력',               desc: '지적 호기심을 바탕으로 사물과 현상에 대해 탐구하고, 문제를 해결하려는 노력' },
    { id: 'career',             label: '진로 탐색 활동과 경험', desc: '자신의 진로를 탐색하는 과정에서 이루어진 활동이나, 경험, 노력 정도' },
    { id: 'achievement',        label: '학업성취도',            desc: '내신 성적' },
    { id: 'collaboration',      label: '협업과 소통 능력',      desc: '공동체의 목표를 달성하기 위해 협력하며 구성원들과 합리적인 의사소통을 할 수 있는 능력' },
    { id: 'leadership',         label: '나눔과 배려, 리더십',   desc: '상대방을 존중하고 이해하여 원만한 관계를 형성하며, 타인을 위하여 기꺼이 나누어주고자 하는 태도와 행동, 공동체의 목표 달성을 위해 구성원들의 상호작용을 이끌어가는 능력' },
  ];

  // 진로 분야별 도메인 키워드 (이 목록에 있는 단어만 워드클라우드에 표시)
  const DOMAIN_KEYWORDS = new Set(`
가치,갈등,강독,개념,계몽,계승,공감,공생,공존,관광,구문,구사,국제화,글로벌,기호,나르시스,낭만주의,기억,내포,담화,대의,대중문화,독서,독해,독해력,드라마,르네상스,멀티미디어,문체,문학사,문학작품,문헌,문화,발음,발화,번역,변용,변인,비교문학,비평,사조,산문,상징,서양,소설,수단,시나리오,심층,어법,어원,어휘,언어학,여행,역할극,연구,영문,영문법,영문학,영미권,영시,영어권,영작문,영화,외국어,외연,용법,원서,음성학,음운,음운론,의사소통,의식,이미지,인문과학,자료,작가,작문,작품,장르,적용,전이,정체성,젠더,주인공,주제,차이점,창작,책,철학,청해,콘텐츠,텍스트,토론,토의,통사,통사론,통역,트랜드,특성,편집,평론,포트폴리오,풍자,학술,한국어,한류,한문학,한시,해방기,현대문학,형태론,화법,화용론,활동,회화,희곡,
계몽주의,공정,과학혁명,국가사상,귀납법,귀류법,규범,근거,근대사,근현대사,기원,노동,노장,논리학,논술,논증,답사,도교,동북공정,동아시아,동양,동양철학,루소,명제,모더니즘,몰락,문명,문학,문화재,미학,민족,법칙,변증법,본성,본질,불교,비판,사건,사고력,사료,사상,사상가,사색,사유,사회주의,산업혁명,삶,서양철학,성리학,세계관,세속,수립,순수,시민,실존주의,아리스토텔레스,에피쿠로스,역사학,연역법,염세주의,예술,우상숭배,원전,유럽,유학,윤리,윤리학,융합,이념,이데올로기,인류학,인문학,인본주의,인생,일관,일본사,자아,자연,자유,정당성,정립,정의,정치사,제자백가,중세사,진리,진실,차이,철학자,칸트,특수성,판단,편견,포스트모더니즘,플라톤,학파,한국사,해석학,헤겔,현상학,
갈등,감독,감사,개인정보,개혁,거래,경찰,계발,계약,고소,고발,고시,고용,공공,공공기관,공공성,공기업,공동체,공무원,공식,공익,교정,교칙,구성원,구제,권리,권한,규율,규정,규칙,기밀,기본권,대응,대책,데이터,도시,디지털,로스쿨,리더십,무역,문제해결,민간,민주주의,범죄,범죄학,법규,법률,법적,법치,법학,보안,보호,복지국가,부패,분류,분쟁,빅데이터,사이버,사회과학,상법,세계무역기구,손실,손해배상,수사,시민참여,시민행동,시험,신체,실현,심리학,안보,역량,예방,예산,원칙,유형,윤리의식,의회,이익,인격,인공지능,인권,자격,재무,재산권,쟁점,저작권,절차,정당,정보처리,정부신뢰,정책,정책학,제도,조례,조직몰입,조직문화,주도,지방자치,지식인,직무,직무만족,질서,집행,참여,책임,처방,체력,테러리즘,통계,판례,표현의자유,학생회,행정,행정법,행정학,행태,헌법,형벌,형사,형사소송법,
가족,감각,감정,개입,건강,검증,과학,관련성,광고,교환,긍정,낙인,논리,뇌과학,대인관계,동물,디자인,또래,래포,마음,마케팅,메커니즘,멘토,모델,문제아,반응,발달단계,발현,부적응,상담,생물학,설문지,성인,성찰,소비,소비자,신경,신경과학,신경생리학,실생활,심리,심리검사,여가,위클래스,의사결정,이상행동,인간,인지,일치,일탈,입장,자격증,장애,재활,정보처리,정서,정신건강,정신분석,조사,조직심리학,지각,집단,초자아,초점,치료,치유,컨설턴트,코칭,통찰력,퇴행,표집,학교폭력,행동,
거버넌스,거시,공공외교,공동선,공존,과학기술,관료,교류,국가론,국제관계,국제기구,국제무역,국제연합,국제정치,군사,군주,권력,균형,근대,기업,기후협약,난민,남북관계,남북통일,네트워크,논쟁,다국적기업,대외관계,독도,동북아,모의국회,미국주의,미래사회,미세먼지,미시,민주주의,변수,보편성,부채,북미회담,북한,분쟁,사상,선거,세계시민,세계정세,소녀상,수요집회,시민단체,시민사회,신생,안보,외교,외교관,외교학,원조,위안부,의장,이익집단,인권,인류,입법,자본주의,자치,재무제표,전쟁,접근법,정체,정치,정치체제,지도자,지속가능,지역주의,체제,최적화,통합,평화,한반도,한일문제,행위자,헌법,협력,협정,확장,환율,
각계각층,개선,경로당,경제,경청,고령화,고민,고통,공적구조,교육,구축,근로,근로자,기구,기부,기초,노인,노인회,다문화,모형,무상급식,문제점,보건,보건복지,보완,보육,보육원,보장,보편복지,보험,본질,봉사,불평등,빈곤,사회,사회배려,사회약자,산업화,산재,새터민,생활,서민,서비스,선진,선행,설치,세모녀법,소득,소외계층,시설,실버타운,실업,실천,실태,아동,아동복지,아픔,안전공제,양로원,역차별,요양원,욕구,위기,의료,의료보험,이념,장려,저소득층,전망,조언,조직체,존중,지원,직장,진단,질환,쪽방촌,차별,착취,청결,청년실업,치매,탈북자,
갈등론,계층,관찰,기금,기능론,기자,기제,노년,노동시장,농촌,대안,도시화,독거,명예,보전,복지,사회참여,사회학,사회화,생애,선진국,성별,아노미이론,유행,이면,이민,이주,인종,정부,정치,조직,종교,청년,청소년,취약,통일,트랜드,특수,하위문화이론,회의,
갈등관리,감성,거꾸로수업,고등교육,관리,교사,교육공학,교육과정,교육사,교육사회학,교육자,교육제도,교육철학,교육학,눈높이,도덕,도덕성,동작,매체,부모교육,사범,상대평가,설득,성격,성인지,소통,수행평가,아동문학,안목,역사철학,연구자,인간관계,인적자원,잠재력,전과목,절대평가,정보사회,중등,진로,창의성,체험,초등,컨설팅,태도,통합교육,팔로우십,평가,평등,평생교육,학교,학력,학습자,혁신,
가짜뉴스,공중,그래픽,기획,낙관,논리적,뉴스,대중,도출,디지털콘텐츠,매개,매스미디어,매체,모바일,뮤지컬,미디어,방송,방송부,보고서,비평가,사회문제,서비스마인드,성우,스토리텔링,시선,시청률,신문,신문제작,아나운서,앵커,언론,여론,연출가,영향력,예술제,유튜버,음향효과,의견,이슈,인간성,인식,인터넷,인터뷰,인터페이스,재현,저널리즘,전략,전문가,정체,종합채널,지리,지적호기심,질문,창의적,청중,축제,취재,커뮤니케이션,케이블방송,크리에이티브,탐구,테크놀러지,통신,판매촉진,편성,프로듀서,프리젠테이션,피디,픽션,현장,홍보,
가격,경제사,경제성장,경제정책,경제통합,경제활동,계량,고객,공급,공정무역,구매,규제,금융기관,금융시장,노동시간,노사,다국적,도입,리더,보복,보호무역,분배,불매운동,브랜드,비즈니스,상표,상품,선물,성공,세무,쇼핑몰,수요,수익,시장,실패,업무,옵션,우위,운송,운용,원가,위험관리,자금,자본,자산,자유무역,재정,전망,조달,조세,주류,주식,주체,증권,지배구조,창업,창조,채권,통화,투자,품질,프리미엄,현안,현지화,협상,회계,
가중치,계산,곡선,극한,급수,기하학,대수,데이터마이닝,리스크,모의실험,모집단,미분,미분적분,방정식,백분율,벡터,변량,복리,분산,분포,사고력,선형,선형회귀,선호도,설문,성질,수렴,수리,수열,수치,연금,오류,오차,왜곡,원리,유클리드,응용,응용통계,이자,자연현상,적분,조합,증명,집합,창의력,추정,측정,편차,평균,표본,함수,해석,확률,회귀,
가속,가속도,가스,고체,고체물리학,관성,관측,광년,광학,굴절,궤도,나로호,대기,대역,도체,레이저,로켓,망원경,모형,물리,물리량,물질,미분방정식,미적분학,반도체,반사,발사체,방출,별,별자리,부도체,분광기,분자,불확정성,블랙홀,빅뱅,사이언스,상대론,상대성이론,생태계,성운,속도,시공간,실습,실험,아인슈타인,액체,양자,양자역학,에너지,역학,외계,우주,우주론,우주선,운동,운동학,원자,월식,은하,은하계,인공위성,일식,입자,자연과학,적경,전기,전산,전자공학,전자기,전자파,전파망원경,정량,정성,중력,지구,진화,질량,창의,천문대,천체,탐구,태양계,통계역학,파동,팽창,평형,해석학,행성,혜성,환경과학,흑점,
게놈,계통,광합성,교란,교배,기전,나노기술,내분비,내성,농도,단백질,담수,대사,독성,돌연변이,동물생리,동식물,면역,면역학,미생물,바이러스,바이오,박테리아,발명,발효,배양,백신,복제,분류학,분자생물학,삼투압,생리학,생명,생물체,생체,생태학,생화학,세균학,세포,시료,식품,신경뉴런,염기서열,염색체,유기화학,유발,유전자,유전자가위,육종,이중나선,인체,자원,잡종,정제,조절,조직,조합,존엄성,종자,줄기세포,질병,탄소,특허,합성,항온,항원,항체,해부,현미경,혈액형,호르몬,화합물,효능,효소,
가공,건조,고분자,근육,급식,기능,기아,기후변화,농수산,농축,대사조절,메커니즘,발효,변인,부패,살균,생산,생장,섭취,성분,세균,식단,식량,식물,식생활,식품화학,영양교사,영양소,외식,원료,위생,유전자조작,유통,유통기한,재배,저염,저장,제어,제조,제품,조리,채소,첨가물,추출,축산,카페인,탄소발자국,포장,푸드체인,품질,함유,항생제,헬스케어,환경오염,
계통,광통신,기기,나노,다이오드,드론,디스플레이,로봇,무선전력시스템,무선통신,반도체,배터리,변환,부도체,소자,수소차,신호,신호처리,엔지니어,연산,영상,웨어러블,이동통신,자동화,자석,자율주행,전기기기,전기자동차,전력,전력전자,전압,절연체,접합,주파수,증폭기,집적회로,차세대,코딩,트랜지스터,프로그래밍,프로세스,플라즈마,하이브리드,항공,홀로그램,회로,휴대폰,
강체,개량,거주,건설,건설관리,건축,건축공법,건축구조,경사,공간,공간도형,공기조화,공법,교량,구조물,구조역학,급수,기둥,기후,단면도,대칭,도로,도면,도면설계,도시계획,모델링,바람,배수,법학,베르누이법칙,비파괴,사회인프라,설계,설계도,설비,성실,소음,수장,수전,수처리,시공,실내건축디자인,심미성,아치구조,안전진단,용접,원가절감,응력,인테리어,자재,재개발,재건축,전람회,조감도,조경,조물,지열,지진,지형,철근콘크리트,트러스,측량,친환경,캐드,토목,토질,토질역학,파괴,하수,하중,하천,항만,해법,협동심,협업,환경영향평가,환기,
가상현실,강화학습,객체지향,검증,게임,구현,기계학습,데이터베이스,디지털시스템,래스터,레지스터,로직,마이크로프로세서,메모리,명령어,모니터,모듈,무선통신,배열,밴드,부호화,블록체인,빅데이터,사용자,서버,선형대수,소스,소프트웨어,스마트폰,시뮬레이션,시스템보안,아두이노,알고리즘,암호,암호화,양자,어플리케이션,언어,연상,오픈소스,운영체계,이산수학,이진법,인공지능,인터넷망,인터페이스,자료구조,자바,장치,정보윤리,정보통신,정보화,조작,증강현실,채널,초고속통신망,최적화,컴파일,케이블,코드,클라우드,파일,프로그래밍,프로토콜,하드웨어,하이퍼미디어,해커,회로,
기계설계,기계설비,기어,기체,나노복합소재,뉴턴,대체에너지,동력,레이더,마찰,마찰력,머신러닝,메카니즘,무인자동차,미래자동차,변속,변형률,부동,부품,사이클,선박,선반,선형,센서,소음,수소,압력,압축,양력,에너지시스템,엔진,연료,연소,열,유체,음파,인간공학,자동제어,자동차,자동차공학,재료,정역학,제동,조선,조정,지능,진동,질량,천연가스,추진,탄성,터빈,평형수,풍력,플랜트,항력,핸들,
결정구조,결함,결합구조,계면,고체물리,금속,기초과학,기후변화,나노,나노바이오,나노화학,독성,동물실험,무기화학,물성,미세먼지,밀도,방사능,분광학,불화수소,산화,산화광물,생명공학,세라믹,세포배양,소자,수소,수질,스펙트럼,시약,신생연료,신소재,신약개발,신재생,실용성,엔트로피,연료전지,염기,오염,온실가스,용액,원소,원자,원자력,원자번호,위험물,유체,응고,이산화탄소,자기장,재료공학,재생,재생연료,재활용,전이,전지,정련,주기율표,주입,중화반응,초전도체,촉매,친환경,탄소,태양광,특허,폐기물,풍력,항산화,핵에너지,핵융합,혼합물,화석연료,화장품,화학,화학식,화학실험,환원반응,
감염,구강,균형,난치병,노화,뇌공학,마취,면담,면역학,바이러스,방사선,병리,병리학,병인,사상의학,생리,생명과학,생식,소아,손상,수면,수술,순환,스트레스,신경계,신경과학,심장,약리학,약물,양방,영양,예방의학,외상,유전자,의료,인공뼈,임상,임플란트,장기,조직학,증상,진료,진맥,채식,처치,척추,체질,추나,충치,침구,통증,한방,해부,해부학,혈압,혈액,호르몬,호흡기,환자,가족력,간호,검진,골격,공중보건학,과로사,관절,규명,근력,노인,뇌파,모성,발암,보건교사,보조,봉사,분비,상태,생리현상,생체리듬,생태,세정,스켈링,습관,심전도,심폐소생술,안락사,약품,양상,연판,염증,요양,유연성,유전학,응급,의료법,의무기록,의사결정,의사소통,인간행동,인체,잇몸,자동제세동기,자세,장비,재해,전류,전자파,정신건강,종양,죽음,중독,중추,초음파,촬영,측정,투시,피부,항균,환경호르몬,
가곡,가락,감상,감수성,건반,관악,국악,기악,녹음,대중가요,대중성,독보력,딕션,리듬,반주,선율,성악,수용,실기,심미,악보,앙상블,연주,오페라,음악사,음정,작곡,지휘,청음,케이팝,클래식,템포,파트,편곡,편성,합주,합창,현악,화성학,화음,
감상,공간,그래픽스,뉴미디어,다각,댓생,도슨트,독창,드로잉,디자인,모델링,무대미술,문양,미디어,미술관,미술사,미의식,미학,박물관,발상,변형,복고,브랜드,사진,색채,섬유,소묘,소양,스케치,스타일,스토리보드,스튜디오,시각화,아이디어,애니메이션,앵글,웹툰,의상,이모지,일러스트,입체,전시,전위예술,전통,전환,조소,조형,창의,창작,추상화,컨셉,큐레이터,크로키,탐방,트렌드,팝아트,패션,포토샵,표현,프레임,프로세스,행위예술,협동,화합,회화,
문진,부상,비만,선수,선수관리,설정,섭취,수비,수상,순환계,스포츠,스포츠경영,스포츠과학,스포츠외교,습관,실기,심판,안전,에이전트,여가,연마,연습,예절,올림픽,운동,움직임,유기체,유연성,응급처치,장애,재활,적응,적응력,전략,전력,전술,정서,조치,중독,지도자,처방,체력,체육,출전,코칭,트레이닝,특수,피로,해부학,혈액,협동,호흡,화합,회복,훈련,
각색,감성,게임,고전,공연,관람,내러티브,담론,대중,몽타주,무대,발표,방송,배우,색감,스토리텔링,시나리오,실기,안무,연기,연출,영화,인물,전시,제작,창조,촬영,축제,출판,카메라,캐릭터,커뮤니티,콘텐츠,퍼포먼스,픽션,한류,해석
`.split(',').map(w => w.trim()).filter(w => w.length >= 2));

  let hxRadarChart = null;
  let hxBarChart = null;
  let hxCurrentScores = null;
  let hxCurrentReasons = null;

  // ── 키워드 추출 (도메인 키워드 목록에 있는 단어만) ────────────
  function extractKeywords(text) {
    if (!text) return [];
    const freq = {};
    const words = text.match(/[가-힣]{2,}/g) || [];
    words.forEach(w => {
      // 어미 제거 후 도메인 키워드에 있는지 확인
      const trimmed = w.replace(/(이다|하여|하며|하고|하게|하는|한다|합니다|했다|하였|되어|되고|되며|이며|이고|이나|에서|으로|으로서|에게|까지|부터|와서|하면|하면서)$/, '');
      const key = (trimmed.length >= 2 && DOMAIN_KEYWORDS.has(trimmed)) ? trimmed
                : DOMAIN_KEYWORDS.has(w) ? w : null;
      if (!key) return;
      freq[key] = (freq[key] || 0) + 1;
    });
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 60)
      .map(([word, count]) => ({ word, count }));
  }

  // ── 워드클라우드 렌더링 ──────────────────────────────────────
  function renderWordCloud(keywords) {
    const el = document.getElementById('hx-wordcloud');
    if (!el) return;
    if (!keywords.length) { el.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:2rem;">데이터 없음</p>'; return; }
    const max = keywords[0].count;
    const colors = ['#96baff','#7ee8fa','#a78bfa','#34d399','#fbbf24','#f87171','#60a5fa','#e879f9'];
    el.innerHTML = keywords.map(({ word, count }, i) => {
      const ratio = count / max;
      const size = Math.round(0.85 + ratio * 2.2);   // 0.85rem ~ 3.05rem
      const opacity = 0.5 + ratio * 0.5;
      const color = colors[i % colors.length];
      return `<span style="font-size:${size}rem;color:${color};opacity:${opacity};font-weight:${ratio > 0.5 ? 700 : 400};padding:0.2rem 0.4rem;display:inline-block;transition:transform 0.2s;" title="${count}회">${word}</span>`;
    }).join(' ');
  }

  // ── 가로 막대 차트 ───────────────────────────────────────────
  function renderBarChart(keywords) {
    const canvas = document.getElementById('hx-bar-chart');
    if (!canvas) return;
    if (hxBarChart) { hxBarChart.destroy(); hxBarChart = null; }
    const top = keywords.slice(0, 20);
    if (!top.length) return;
    hxBarChart = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: top.map(k => k.word),
        datasets: [{
          label: '빈도',
          data: top.map(k => k.count),
          backgroundColor: 'rgba(150, 186, 255, 0.6)',
          borderColor: 'rgba(150, 186, 255, 1)',
          borderWidth: 1,
          borderRadius: 6,
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => ` ${c.raw}회` } },
        },
        scales: {
          x: { ticks: { color: '#aaa', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.06)' } },
          y: { ticks: { color: '#ccc', font: { size: 12 } }, grid: { display: false } },
        }
      }
    });
  }

  // ── 레이더 차트 ─────────────────────────────────────────────
  function renderRadarChart(scores) {
    const canvas = document.getElementById('hx-radar-chart');
    if (!canvas) return;
    if (hxRadarChart) { hxRadarChart.destroy(); hxRadarChart = null; }

    const labels = DIMENSIONS.map(d => d.label);
    const data   = DIMENSIONS.map(d => scores[d.id] || 0);
    const ctx    = canvas.getContext('2d');

    // 글로우 효과
    canvas.style.filter = 'drop-shadow(0 0 18px rgba(150,186,255,0.22))';

    // 점수별 색상
    const pointColors = data.map(v =>
      v >= 80 ? '#34d399' : v >= 65 ? '#60a5fa' : v >= 50 ? '#a78bfa' : v >= 35 ? '#fbbf24' : '#f87171'
    );

    hxRadarChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels,
        datasets: [
          {
            label: '역량 점수',
            data,
            backgroundColor: 'rgba(130, 170, 255, 0.18)',
            borderColor: 'rgba(150, 186, 255, 0.95)',
            borderWidth: 2.5,
            pointBackgroundColor: pointColors,
            pointBorderColor: 'rgba(255,255,255,0.85)',
            pointBorderWidth: 1.5,
            pointRadius: 7,
            pointHoverRadius: 11,
            pointHoverBackgroundColor: '#fff',
            fill: true,
          },
          {
            // 기준선 70점
            label: '기준(70점)',
            data: Array(DIMENSIONS.length).fill(70),
            backgroundColor: 'transparent',
            borderColor: 'rgba(251,191,36,0.25)',
            borderWidth: 1.5,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 900, easing: 'easeInOutQuart' },
        layout: { padding: { top: 24, bottom: 24, left: 24, right: 24 } },
        onClick: (evt, elements) => {
          if (!elements.length) return;
          if (elements[0].datasetIndex === 0) showReasonModal(elements[0].index);
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            filter: item => item.datasetIndex === 0,
            backgroundColor: 'rgba(20,22,36,0.92)',
            borderColor: 'rgba(150,186,255,0.3)',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              title: items => labels[items[0].dataIndex],
              label: c => ` ${c.raw}점`,
            }
          },
        },
        scales: {
          r: {
            min: 0, max: 100,
            ticks: {
              stepSize: 20,
              color: '#555',
              backdropColor: 'transparent',
              font: { size: 9 },
            },
            grid: { color: 'rgba(255,255,255,0.07)' },
            angleLines: { color: 'rgba(255,255,255,0.13)', lineWidth: 1 },
            pointLabels: {
              color: ctx2 => pointColors[ctx2.index] || '#ccc',
              font: { size: 11.5, weight: '700' },
              callback: (label, i) => {
                const scoreStr = `${data[i]}점`;
                if (label.length > 6) {
                  const parts = label.split(/[\s,]+/).filter(Boolean);
                  if (parts.length >= 2) {
                    const mid = Math.ceil(parts.length / 2);
                    const line1 = parts.slice(0, mid).join(' ');
                    const line2 = parts.slice(mid).join(' ');
                    return line2 ? [line1, line2, scoreStr] : [line1, scoreStr];
                  }
                }
                return [label, scoreStr];
              },
            }
          }
        }
      }
    });
  }

  // ── 근거 모달 ────────────────────────────────────────────────
  function showReasonModal(dimIdx) {
    if (!hxCurrentReasons) return;
    const dim = DIMENSIONS[dimIdx];
    const reason = hxCurrentReasons[dim.id];
    const score  = hxCurrentScores  ? (hxCurrentScores[dim.id] || 0) : 0;
    const overlay = document.getElementById('hx-reason-modal');
    const titleEl = document.getElementById('hx-modal-title');
    const bodyEl  = document.getElementById('hx-modal-body');
    if (!overlay) return;
    if (titleEl) titleEl.textContent = `${dim.label}  ·  ${score}점`;

    const criteriaHtml = `
      <div style="margin-bottom:1rem;padding:0.75rem 1rem;background:rgba(150,186,255,0.08);border-radius:8px;border-left:3px solid #96baff;font-size:0.85rem;color:var(--text-secondary);">
        <strong>평가 기준:</strong> ${dim.desc}
      </div>`;

    let contentHtml;
    if (reason && typeof reason === 'object' && reason.summary) {
      const quotesHtml = Array.isArray(reason.quotes) && reason.quotes.length
        ? `<div style="margin-top:1.1rem;margin-bottom:0.4rem;font-size:0.82rem;font-weight:700;color:#a78bfa;letter-spacing:0.03em;">근거 인용 (${reason.quotes.length}개)</div>` +
          reason.quotes.map(q => `
            <div style="margin:0.45rem 0;padding:0.6rem 1rem;background:rgba(167,139,250,0.07);border-left:3px solid #a78bfa;border-radius:0 6px 6px 0;font-size:0.9rem;line-height:1.75;color:var(--text-primary);">
              "${q}"
            </div>`).join('')
        : '<div style="font-size:0.85rem;color:var(--text-secondary);">인용 가능한 원문이 없습니다.</div>';

      contentHtml = `
        <div style="line-height:1.85;font-size:0.97rem;margin-bottom:0.3rem;">${reason.summary}</div>
        ${quotesHtml}`;
    } else {
      contentHtml = `<div style="white-space:pre-wrap;line-height:1.8;font-size:1rem;">${reason || '근거 데이터 없음'}</div>`;
    }

    if (bodyEl) bodyEl.innerHTML = criteriaHtml + contentHtml;
    overlay.classList.remove('hidden');
  }

  // ── 학생 배치 데이터 추출 (globalBatchJsons → { subject, creative, behavior }) ──
  function getStudentRecords(globalBatchJsons, targetName) {
    const tgt = (targetName || '').replace(/\s+/g, '');
    let subjectParts = [], creativeParts = [], behaviorParts = [];

    for (const dataObj of (globalBatchJsons || [])) {
      const { fileName = '', jsonData } = dataObj;
      if (!jsonData || !jsonData.length) continue;

      // 파일 유형 추정
      let fileType;
      if (fileName.includes('행동') || fileName.includes('행특') || fileName.includes('종합'))
        fileType = 'behavior';
      else if (fileName.includes('창체') || fileName.includes('자율') || fileName.includes('동아리') || fileName.includes('봉사') || fileName.includes('진로'))
        fileType = 'creative';
      else if (fileName.includes('교과') || fileName.includes('세특') || fileName.includes('과목'))
        fileType = 'subject';
      else
        fileType = 'creative';

      // 헤더 행 탐색
      let headerRowIdx = -1, nameCol = -1;
      for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
        if (!jsonData[i]) continue;
        for (let j = 0; j < jsonData[i].length; j++) {
          const ct = String(jsonData[i][j] || '').replace(/\s+/g, '');
          if (ct === '성명' || ct === '이름') { nameCol = j; headerRowIdx = i; break; }
        }
        if (headerRowIdx !== -1) break;
      }
      if (headerRowIdx === -1 || nameCol === -1) continue;

      const headerRow = jsonData[headerRowIdx] || [];
      const subRow    = jsonData[headerRowIdx + 1] || [];

      // 서브헤더 여부
      let dataStart = headerRowIdx + 1;
      {
        const sub = subRow.map(c => String(c || '').replace(/\s+/g, ''));
        const hasKey = sub.some(c => c === '구분' || c === '특기사항' || c === '활동내용' || c === '시간');
        const hasName = sub.some(c => c.length >= 2 && /[가-힣]/.test(c) && !['구분','특기사항','활동내용','시간','학기','학년','번호'].includes(c));
        if (hasKey && !hasName) dataStart = headerRowIdx + 2;
      }

      // 컬럼 감지
      let detectedType = fileType;
      let subjCol = -1, detailCol = -1, areaCol = -1;
      const maxCols = Math.max(headerRow.length, subRow.length);
      for (let j = 0; j < maxCols; j++) {
        const h   = String(headerRow[j] || '').replace(/\s+/g, '');
        const sub = String(subRow[j]    || '').replace(/\s+/g, '');
        const combined = h + ' ' + sub;
        if (combined.includes('행동특성') || combined.includes('종합의견')) { detectedType = 'behavior'; if (detailCol === -1) detailCol = j; }
        if (detectedType !== 'behavior' && (h === '교과' || h === '과목' || h === '과목명' || h === '교과목' || h === '교과목명')) { detectedType = 'subject'; subjCol = j; }
        if (detectedType !== 'behavior' && combined.includes('세부능력')) { detectedType = 'subject'; if (detailCol === -1) detailCol = j; }
        if (h === '구분' || h === '영역' || h === '활동영역' || sub === '구분' || h.includes('창의적')) { if (detectedType !== 'behavior') { detectedType = 'creative'; areaCol = j; } }
        if (detailCol === -1 && (h === '특기사항' || sub === '특기사항' || h.includes('특기사항') || sub.includes('특기사항'))) detailCol = j;
        if (detailCol === -1 && (h === '활동내용' || sub === '활동내용')) detailCol = j;
      }

      // 폴백: 가장 긴 텍스트 컬럼
      if (detailCol === -1) {
        for (let i = dataStart; i < Math.min(jsonData.length, dataStart + 5); i++) {
          const row = jsonData[i]; if (!row) continue;
          let mx = 0;
          for (let j = 0; j < row.length; j++) {
            const len = String(row[j] || '').length;
            if (len > mx) { mx = len; detailCol = j; }
          }
          if (detailCol !== -1) break;
        }
      }
      if (detailCol === -1) continue;

      // 데이터 추출
      let currentStudent = '';
      if (detectedType === 'subject') {
        const sjMap = new Map();
        for (let i = dataStart; i < jsonData.length; i++) {
          const row = jsonData[i]; if (!row) continue;
          const cn = String(row[nameCol] || '').replace(/\s+/g, '');
          if (cn) currentStudent = cn;
          if (!currentStudent || currentStudent !== tgt) continue;
          const subj   = subjCol !== -1 ? String(row[subjCol] || '').trim() : '기타';
          const detail = String(row[detailCol] || '').trim();
          if (detail && detail.length > 2) {
            if (!sjMap.has(subj)) sjMap.set(subj, []);
            sjMap.get(subj).push(detail);
          }
        }
        sjMap.forEach((ds, subj) => {
          subjectParts.push((subj !== '기타' ? subj + ': ' : '') + ds.join(' '));
        });

      } else if (detectedType === 'creative') {
        const ag = { '자율': [], '동아리': [], '봉사': [], '진로': [], '기타': [] };
        for (let i = dataStart; i < jsonData.length; i++) {
          const row = jsonData[i]; if (!row) continue;
          const cn = String(row[nameCol] || '').replace(/\s+/g, '');
          if (cn) currentStudent = cn;
          if (!currentStudent || currentStudent !== tgt) continue;
          const area   = areaCol !== -1 ? String(row[areaCol] || '').trim() : '';
          const detail = String(row[detailCol] || '').trim();
          if (!detail || detail.length <= 2) continue;
          if      (area.includes('자율'))   ag['자율'].push(detail);
          else if (area.includes('동아리')) ag['동아리'].push(detail);
          else if (area.includes('봉사'))   ag['봉사'].push(detail);
          else if (area.includes('진로'))   ag['진로'].push(detail);
          else                              ag['기타'].push(detail);
        }
        Object.entries(ag).forEach(([k, v]) => {
          if (v.length) creativeParts.push(`[${k}활동] ` + v.join(' '));
        });

      } else {
        // behavior
        for (let i = dataStart; i < jsonData.length; i++) {
          const row = jsonData[i]; if (!row) continue;
          const cn = String(row[nameCol] || '').replace(/\s+/g, '');
          if (cn) currentStudent = cn;
          if (!currentStudent || currentStudent !== tgt) continue;
          const detail = String(row[detailCol] || '').trim();
          if (detail && detail.length > 2) behaviorParts.push(detail);
        }
      }
    }

    return {
      subject:  subjectParts.join('\n\n'),
      creative: creativeParts.join('\n\n'),
      behavior: behaviorParts.join('\n\n'),
    };
  }

  // ── 이수과목 성적 추출 (globalCourseJson 플랫 배열 사용) ──────
  function getStudentGrades(courseJson, targetName) {
    if (!courseJson || !courseJson.length) return '';
    const tgt = (targetName || '').replace(/\s+/g, '');

    // 헤더 행 탐색 (성명/이름 열 기준)
    let headerRowIdx = -1, nameCol = -1;
    for (let i = 0; i < Math.min(courseJson.length, 15); i++) {
      if (!courseJson[i]) continue;
      for (let j = 0; j < courseJson[i].length; j++) {
        const ct = String(courseJson[i][j] || '').replace(/\s+/g, '');
        if (ct === '성명' || ct === '이름') { nameCol = j; headerRowIdx = i; break; }
      }
      if (headerRowIdx !== -1) break;
    }
    if (headerRowIdx === -1 || nameCol === -1) return '';

    // 컬럼 탐지 (app.js extractCourseData 와 동일 로직)
    const headerRow = courseJson[headerRowIdx] || [];
    let subjectCol = -1, subjectCol2 = -1, creditCol = -1, gradeCol = -1,
        achieveCol = -1, rawScoreCol = -1, yearCol = -1, termCol = -1;

    for (let j = 0; j < headerRow.length; j++) {
      const cell = String(headerRow[j] || '').replace(/\s+/g, '');
      if (!cell) continue;
      if (yearCol    === -1 && cell.includes('학년'))                                        yearCol    = j;
      if (termCol    === -1 && cell.includes('학기'))                                        termCol    = j;
      if (subjectCol === -1 && (cell.includes('과목') || cell.includes('교과목')))           subjectCol = j;
      else if (subjectCol2 === -1 && (cell.includes('교과') || cell.includes('과목군')))     subjectCol2 = j;
      if (creditCol  === -1 && (cell.includes('단위') || cell.includes('이수단위')))         creditCol  = j;
      if (gradeCol   === -1 && (cell.includes('등급') || cell.includes('석차등급') || cell === '성적')) gradeCol = j;
      if (achieveCol === -1 && cell.includes('성취도'))                                      achieveCol = j;
      if (rawScoreCol === -1 && cell.includes('원점수'))                                     rawScoreCol = j;
    }
    // 위치 기반 폴백 (app.js 동일)
    if (subjectCol  === -1 && headerRow.length >= 6)  subjectCol  = 5;
    if (creditCol   === -1 && headerRow.length >= 7)  creditCol   = 6;
    if (gradeCol    === -1 && headerRow.length >= 10) gradeCol    = 9;

    const courseRows = [];
    let totalWeightedSum = 0, totalCredits = 0;
    let currentStudent = '';

    for (let i = headerRowIdx + 1; i < courseJson.length; i++) {
      const row = courseJson[i]; if (!row) continue;
      const cn = String(row[nameCol] || '').replace(/\s+/g, '');
      if (cn) currentStudent = cn;
      if (!currentStudent || currentStudent !== tgt) continue;

      let subject = subjectCol  !== -1 ? String(row[subjectCol]  || '').trim() : '';
      if (!subject && subjectCol2 !== -1) subject = String(row[subjectCol2] || '').trim();
      if (!subject || subject === 'undefined') continue;
      if (/평균|합계|소계|^계$/.test(subject)) continue;

      const yearVal  = yearCol    !== -1 ? String(row[yearCol]    || '').trim() : '';
      const termVal  = termCol    !== -1 ? String(row[termCol]    || '').trim() : '';
      const rawGrade = gradeCol   !== -1 ? String(row[gradeCol]   || '').trim() : '';
      const achieve  = achieveCol !== -1 ? String(row[achieveCol] || '').trim().split('(')[0].trim() : '';
      const rawScore = rawScoreCol !== -1 ? String(row[rawScoreCol] || '').trim() : '';

      let credit = 1;
      if (creditCol !== -1 && row[creditCol] != null) {
        const cm = String(row[creditCol]).match(/\d+(\.\d+)?/);
        if (cm) credit = parseFloat(cm[0]);
      }
      if (credit <= 0) credit = 1;

      // 등급 파싱 (P 제외)
      let gradeNum = NaN;
      const isPass = /^[Pp]$/.test(rawGrade) || (rawGrade.toUpperCase().includes('P') && !/\d/.test(rawGrade));
      if (!isPass) {
        const gm = rawGrade.match(/^(\d+(\.\d+)?)/);
        if (gm) gradeNum = parseFloat(gm[1]);
      }

      // 원점수/평균(표준편차) 파싱
      let scoreInfo = '';
      const sm = rawScore.match(/^(\d+)\s*\/\s*([\d.]+)(?:\(([\d.]+)\))?/);
      if (sm) scoreInfo = `원점수${sm[1]}/평균${sm[2]}${sm[3] ? '/표준편차' + sm[3] : ''}`;

      const cleanAchieve = achieve.toUpperCase() === 'P' ? '' : achieve;

      courseRows.push({ subject, yearVal, termVal, gradeNum, rawGrade, achieve: cleanAchieve, credit, scoreInfo });
      if (!isNaN(gradeNum) && gradeNum >= 1 && gradeNum <= 9) {
        totalWeightedSum += credit * gradeNum;
        totalCredits += credit;
      }
    }

    if (!courseRows.length) return '';

    const avgGrade = totalCredits > 0 ? (totalWeightedSum / totalCredits).toFixed(2) : null;
    let text = avgGrade ? `내신 가중평균등급: ${avgGrade}등급\n\n` : '';

    // 학년/학기별 그룹
    const grouped = {};
    for (const c of courseRows) {
      const key = (c.yearVal && c.termVal) ? `${c.yearVal}학년 ${c.termVal}학기`
                : c.yearVal ? `${c.yearVal}학년` : '기타';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(c);
    }
    for (const [period, courses] of Object.entries(grouped)) {
      text += `[${period}]\n`;
      for (const c of courses) {
        let line = `  ${c.subject}(${c.credit}단위): `;
        if (!isNaN(c.gradeNum) && c.gradeNum >= 1 && c.gradeNum <= 9) line += `${c.gradeNum}등급`;
        else if (c.rawGrade) line += c.rawGrade;
        else if (c.achieve)  line += `성취도 ${c.achieve}`;
        if (c.scoreInfo) line += ` [${c.scoreInfo}]`;
        text += line + '\n';
      }
      text += '\n';
    }
    return text.trim();
  }

  // ── Gemini API 호출 ──────────────────────────────────────────
  async function callGemini(text, apiKey) {
    const prompt = `당신은 대한민국 고등학교 학생부를 분석하는 엄격한 전문 입학사정관입니다.
아래의 학생 생활기록부 내용(교과 세특, 창체, 행특)을 읽고 6개 역량 항목을 각각 0~100점으로 평가하십시오.

[평가 역량 6가지]
1. academic_attitude  : 학업 태도 — 학업을 수행하고 학습해 나가려는 의지와 노력
2. inquiry            : 탐구력 — 지적 호기심을 바탕으로 사물과 현상을 탐구하고 문제를 해결하려는 노력
3. career             : 진로 탐색 활동과 경험 — 진로를 탐색하는 과정에서 이루어진 활동, 경험, 노력 정도
4. achievement        : 학업성취도 — 내신 석차등급·성취도·원점수 등 실제 성적 데이터 우선 반영. 이수과목 섹션의 가중평균등급과 과목별 등급을 핵심 근거로 사용할 것. 성적 데이터가 없을 경우 세특 내용으로 추론.
5. collaboration      : 협업과 소통 능력 — 공동체 목표 달성을 위한 협력과 합리적 의사소통
6. leadership         : 나눔과 배려, 리더십 — 존중·배려·나눔의 태도 및 구성원 간 상호작용을 이끄는 능력

[엄격한 채점 기준]
- 90~100: 전국 최상위 수준. 해당 역량이 생기부 전반에 걸쳐 일관되게, 매우 구체적인 사례와 깊이 있는 내용으로 기술됨. 대부분의 학생은 이 구간을 받을 수 없음.
- 75~89 : 상위권 수준. 해당 역량이 뚜렷하고 설득력 있는 사례로 명확히 드러남.
- 55~74 : 평균 수준. 기본적인 내용은 있으나 깊이나 구체성이 부족함.
- 35~54 : 평균 이하. 관련 내용이 단편적이거나 피상적임.
- 0~34  : 매우 부족. 관련 기록이 거의 없거나 형식적인 수준에 그침.

[채점 시 주의사항]
- "적극적으로 참여함", "우수한 성적을 거둠" 같은 형식적·관용적 칭찬 표현만 있는 경우 낮게 평가할 것.
- 구체적인 활동, 산출물, 심화 탐구, 자기주도적 행동이 서술된 경우에만 높은 점수를 부여할 것.
- 전체 6개 항목의 평균이 65점을 넘지 않도록 엄격히 평가할 것.
- 근거가 빈약한 항목은 낮은 점수를 부여하고, 과대 평가하지 말 것.

[서술어 위계 기반 채점 기준 — 반드시 적용]
생기부에 등장하는 서술어의 위계 수준이 점수를 결정하는 핵심 근거입니다. 아래 위계를 참고하여 각 역량을 평가하십시오.

▶ 인지(행동)동사 위계 — inquiry(탐구력) 및 academic_attitude(학업태도) 평가의 핵심:
- 기억단계(낮음): 나열하다, 설명하다, 정의하다, 기술하다, 확인하다, 암기하다, 열거하다 → 기본~보통(35~54점)
- 이해단계: 해석하다, 요약하다, 예를 들다, 구분하다, 비교하다, 해설하다, 대비하다 → 보통~평균(45~65점)
- 적용단계: 적용하다, 계산하다, 실험하다, 예측하다, 연결하다, 조정하다, 구현하다 → 평균 이상(55~75점)
- 분석단계: 분석하다, 분류하다, 탐색하다, 논의하다, 평가하다, 연관짓다 → 상위권(65~80점)
- 평가단계(높음): 평가하다, 가설을 세움, 검토하다, 추천하다, 논증하다, 비판하다 → 상위권(70~88점)
- 창출단계(최상): 창조하다, 통합하다, 설계하다, 발명하다, 구성하다, 제안하다, 해결하다 → 최상위(80~100점)

▶ 조사 서술어 vs 탐구 서술어 — 점수 차등 적용:
- 조사 서술어(낮음): 설명함, 정의함, 정리함, 나열함, 예를 듦, 비교함, 구분함, 기술함, 찾음, 인식함, 조사함, 활용함, 적용함, 실천함, 확인함 → inquiry 55점 이하
- 탐구 서술어(높음): 분석함, 평가함, 판단함, 가설을 세움, 검증함, 재구성함, 설계함, 종합함, 통합함, 대안을 제시함, 문제를 해결함, 전략을 수립함, 계획을 세움, 시사점을 도출함, 토론을 주도함, 논리를 전개함 → inquiry 65점 이상

▶ 정서행동동사 위계 — collaboration(협업소통) 및 leadership(리더십) 평가의 핵심:
- 수용단계(낮음): 참여하다, 관찰하다, 제출하다, 활동하다, 함께하다, 지켜보다, 따라하다 → 35~50점
- 반응단계: 반응하다, 다짐하다, 질문하다, 집중하다, 호응하다, 감탄하다, 공감하다 → 45~60점
- 가치단계: 존중하다, 지지하다, 지속하다, 책임지다, 인정하다, 중시하다 → 55~70점
- 조직단계: 조율하다, 조직하다, 통합하다, 협력하다, 조정하다 → 65~78점
- 실천단계: 기획하다, 제안하다, 주도하다, 계획하다, 기여하다, 수행하다 → 72~87점
- 책임단계(최상): 유도하다, 환기하다, 배려하다, 해결하다, 공헌하다, 지도하다, 지속하다 → 80~100점

▶ 성취동사 위계 — achievement(학업성취도) 및 academic_attitude(학업태도) 보조 지표:
- 시도단계: 시도하다, 참여하다, 이해하다, 경험하다 → 낮은 수준
- 달성단계: 완성하다, 달성하다, 성취하다, 끝마치다 → 보통 수준
- 향상단계: 향상하다, 발전하다, 개선하다, 강화하다 → 평균 이상
- 우수단계: 뛰어나다, 우수하다, 발휘하다, 인정받다 → 상위권
- 전문단계: 탁월하다, 심화하다, 숙달하다 → 상위권~최상위
- 선도단계: 선도하다, 개척하다, 주도하다, 앞장서다 → 최상위

▶ 변화 행동동사 위계 — 성장·발전 정도 판별 (academic_attitude, career 반영):
- 인식→수정→적응→변화→혁신→전환 순서로 수준이 높아짐
- 인식·수정 단계만 있으면 낮은 점수, 혁신·전환 단계까지 드러나면 높은 점수

[세특 작성 고려사항 기반 역량 판별 — 반드시 적용]
다음 5가지 기준으로 기록의 질을 판별하여 점수에 반영하십시오:

1. 맥락(동기·배경): 활동 배경 없음→단순 흥미→학습·진로 연결 동기→사회·학문적 문제의식+자발적 기획 순으로 고점
2. 증거(객관성·구체성): 결과만 서술→일부 수치 제시→구체적 데이터·분석·결과→정량+정성 근거 모두+재현성 높음 순으로 고점
3. 진전도(성장): 발전 과정 언급 없음→일부 개선 노력→이전 한계 극복+향상 구체적 제시→초기 약점을 성취로 전환+자기주도 개선 순으로 고점
4. 확장성(전이가능성): 전이 없음→일부 전이→교과·진로 간 연계 활동→융합·창의적 확장+새로운 문제 해결 적용 순으로 고점
5. 지속성(일관성): 단발성→학기 내 반복→학년 간 지속→2년 이상 지속+점점 심화+발전 양상 명확 순으로 고점

[활동 유형별 기재 요령 기반 감점 기준]
- 자율활동: 피상적 활동나열형, 학교프로그램 나열형, 행사 날짜 표기형이면 collaboration 점수 낮게 부여
- 동아리활동: 오매불망형(감정적 미사여구), 중구난방형(주제 산만), 방목형(학생 역할 불분명)이면 inquiry 점수 낮게 부여
- 진로활동: 단순나열식, 구체성 부족, 진로탐색 과정 미기재이면 career 점수 낮게 부여
- 행특: 단순나열식, 구체성 부족, 추상적 칭찬 일색이면 leadership·collaboration 점수 낮게 부여
- 교과 세특: 수업 모습·태도, 탐구 활동, 교과 역량, 후속 활동, 연계·심화·확장이 없으면 academic_attitude·inquiry 낮게 부여

[학생 생활기록부]
${text}

[출력 형식]
반드시 아래 JSON만 출력하십시오. 다른 텍스트 일체 금지.
{
  "scores": {
    "academic_attitude": <0-100 정수>,
    "inquiry": <0-100 정수>,
    "career": <0-100 정수>,
    "achievement": <0-100 정수>,
    "collaboration": <0-100 정수>,
    "leadership": <0-100 정수>
  },
  "reasons": {
    "academic_attitude": { "summary": "<2-3문장 종합 평가. 점수 근거와 부족한 점 포함>", "quotes": ["<생기부 원문에서 그대로 인용한 문장 1>", "<원문 인용 2>", "<원문 인용 3>", "<원문 인용 4>", "<원문 인용 5>"] },
    "inquiry":           { "summary": "<2-3문장 종합 평가>", "quotes": ["<원문 인용 1>", "<원문 인용 2>", "<원문 인용 3>", "<원문 인용 4>", "<원문 인용 5>"] },
    "career":            { "summary": "<2-3문장 종합 평가>", "quotes": ["<원문 인용 1>", "<원문 인용 2>", "<원문 인용 3>", "<원문 인용 4>", "<원문 인용 5>"] },
    "achievement":       { "summary": "<2-3문장 종합 평가>", "quotes": ["<원문 인용 1>", "<원문 인용 2>", "<원문 인용 3>", "<원문 인용 4>", "<원문 인용 5>"] },
    "collaboration":     { "summary": "<2-3문장 종합 평가>", "quotes": ["<원문 인용 1>", "<원문 인용 2>", "<원문 인용 3>", "<원문 인용 4>", "<원문 인용 5>"] },
    "leadership":        { "summary": "<2-3문장 종합 평가>", "quotes": ["<원문 인용 1>", "<원문 인용 2>", "<원문 인용 3>", "<원문 인용 4>", "<원문 인용 5>"] }
  }
}
참고: quotes 배열에는 생기부 원문에서 실제로 등장하는 문장·구절을 그대로 인용하고, 관련 근거가 부족하면 3개 이하로 줄여도 됨. 최대 7개까지 허용.`;

    const modelsToTry = ['gemini-3.1-pro', 'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash-lite'];
    let lastErr;
    for (const model of modelsToTry) {
      try {
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          referrerPolicy: 'no-referrer',
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        });
        if (!resp.ok) {
          const errText = await resp.text();
          if (resp.status === 404 || resp.status === 400) { lastErr = new Error(`Gemini API 오류: ${resp.status} ${errText}`); continue; }
          throw new Error(`Gemini API 오류: ${resp.status} ${errText}`);
        }
        const json = await resp.json();
        const raw  = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('AI 응답에서 JSON을 파싱할 수 없습니다.\n\n원문:\n' + raw);
        return JSON.parse(match[0]);
      } catch (e) { lastErr = e; }
    }
    throw lastErr;
  }

  // ── 학년/반/학생 계층 드롭다운 ────────────────────────────────
  function buildHierarchyDropdowns(students) {
    const gradeSel = document.getElementById('hx-grade-sel');
    const classSel = document.getElementById('hx-class-sel');
    const nameSel  = document.getElementById('hx-name-sel');
    if (!gradeSel || !classSel || !nameSel) return;

    // 학년 목록 (빈 값 제외)
    const grades = [...new Set(students.map(s => String(s.grade || '').trim()).filter(Boolean))].sort();

    if (grades.length === 0) {
      // 학년 정보 없으면 전체 학생을 이름 드롭다운에 직접 표시
      gradeSel.innerHTML = '<option value="all">전체</option>';
      classSel.innerHTML = '<option value="all">전체</option>';
      const sorted = [...students].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));
      nameSel.innerHTML = '<option value="">학생 선택</option>' +
        sorted.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
      gradeSel.onchange = null;
      classSel.onchange = null;
      return;
    }

    gradeSel.innerHTML = '<option value="">학년 선택</option>' +
      grades.map(g => `<option value="${g}">${g}학년</option>`).join('');

    function updateClasses() {
      const g = gradeSel.value;
      const classes = [...new Set(students.filter(s => String(s.grade || '').trim() === g).map(s => String(s.class || '').trim()).filter(Boolean))].sort((a, b) => Number(a) - Number(b));
      classSel.innerHTML = '<option value="">반 선택</option>' +
        classes.map(c => `<option value="${c}">${c}반</option>`).join('');
      nameSel.innerHTML = '<option value="">학생 선택</option>';
    }

    function updateNames() {
      const g = gradeSel.value;
      const c = classSel.value;
      const names = students.filter(s => String(s.grade || '').trim() === g && String(s.class || '').trim() === c).sort((a, b) => Number(a.number) - Number(b.number));
      nameSel.innerHTML = '<option value="">학생 선택</option>' +
        names.map(s => `<option value="${s.name}">${s.number ? s.number + '번 ' : ''}${s.name}</option>`).join('');
    }

    gradeSel.onchange = () => { updateClasses(); };
    classSel.onchange = () => { updateNames(); };
  }

  // ── 분석 실행 ────────────────────────────────────────────────
  async function runAnalysis() {
    const nameSel  = document.getElementById('hx-name-sel');
    const apiKey   = (document.getElementById('uni-api-key') || document.getElementById('api-key') || {}).value?.trim() || '';
    const targetName = nameSel ? nameSel.value.trim() : '';

    if (!targetName) { alert('학생을 선택해 주세요.'); return; }
    if (!apiKey)     { alert('상단 통합 설정에서 Gemini API 키를 입력해 주세요.'); return; }

    const appData = window.getHexagonAppData ? window.getHexagonAppData() : { students: [], globalBatchJsons: [], globalCourseJson: null };
    const records   = getStudentRecords(appData.globalBatchJsons, targetName);
    const gradeText = getStudentGrades(appData.globalCourseJson, targetName);
    const fullText = [
      gradeText        ? '=== 이수과목 및 성적 ===\n' + gradeText    : '',
      records.subject  ? '=== 교과 세특 ===\n'        + records.subject  : '',
      records.creative ? '=== 창체 기록 ===\n'        + records.creative : '',
      records.behavior ? '=== 행동특성 및 종합의견 ===\n' + records.behavior : '',
    ].filter(Boolean).join('\n\n');

    if (!fullText.trim()) {
      alert('해당 학생의 세특/창체/행특 데이터가 없습니다.\n상단 통합 파일 업로드에서 세특/비교과 파일을 먼저 올려 주세요.');
      return;
    }

    // 키워드 분석 (AI 없이 바로)
    const keywords = extractKeywords(fullText);
    renderWordCloud(keywords);
    renderBarChart(keywords);

    // 섹션 표시
    setSection('hx-keyword-section', true);
    setSection('hx-radar-section', true);
    setSection('hx-loading', true);
    setSection('hx-radar-wrap', false);
    setSection('hx-error-box', false);

    const analyzeBtn = document.getElementById('hx-analyze-btn');
    if (analyzeBtn) { analyzeBtn.disabled = true; analyzeBtn.textContent = '분석 중...'; }

    try {
      const result = await callGemini(fullText, apiKey);
      hxCurrentScores  = result.scores;
      hxCurrentReasons = result.reasons;
      renderRadarChart(result.scores);
      renderScoreCards(result.scores, result.reasons);
      setSection('hx-loading', false);
      setSection('hx-radar-wrap', true);
    } catch (err) {
      console.error('[hexagon]', err);
      setSection('hx-loading', false);
      const errBox = document.getElementById('hx-error-box');
      if (errBox) { errBox.textContent = '분석 실패: ' + err.message; errBox.style.display = 'block'; }
    } finally {
      if (analyzeBtn) { analyzeBtn.disabled = false; analyzeBtn.textContent = '분석하기'; }
    }
  }

  function setSection(id, visible) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = visible ? '' : 'none';
  }

  function renderScoreCards(scores, reasons) {
    const wrap = document.getElementById('hx-score-cards');
    if (!wrap) return;
    wrap.innerHTML = DIMENSIONS.map((d, i) => {
      const sc = scores[d.id] || 0;
      const color = sc >= 80 ? '#34d399' : sc >= 60 ? '#60a5fa' : sc >= 40 ? '#fbbf24' : '#f87171';
      const reason = reasons ? reasons[d.id] : null;
      const preview = reason && typeof reason === 'object' && reason.summary
        ? reason.summary.replace(/<[^>]+>/g, '').slice(0, 60) + (reason.summary.length > 60 ? '…' : '')
        : '클릭하면 평가 근거 보기';
      return `<div class="hx-score-card" onclick="window.hxShowReason(${i})" style="cursor:pointer;background:var(--glass-bg);border:1px solid var(--panel-border);border-radius:12px;padding:1rem 1.2rem;display:flex;align-items:center;gap:1rem;transition:box-shadow 0.2s;" onmouseenter="this.style.boxShadow='0 0 0 2px ${color}'" onmouseleave="this.style.boxShadow=''">
        <div style="width:54px;height:54px;border-radius:50%;border:3px solid ${color};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <span style="font-size:1.2rem;font-weight:700;color:${color};">${sc}</span>
        </div>
        <div style="overflow:hidden;">
          <div style="font-weight:600;color:var(--text-primary);margin-bottom:0.25rem;">${d.label}</div>
          <div style="font-size:0.78rem;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${preview}</div>
        </div>
      </div>`;
    }).join('');
  }

  window.hxShowReason = function (idx) { showReasonModal(idx); };

  // ── 탭 초기화 ────────────────────────────────────────────────
  window.initHexagonTab = function () {
    let appData = window.getHexagonAppData ? window.getHexagonAppData() : { students: [], globalBatchJsons: [] };
    // localStorage 폴백: getHexagonAppData가 없거나 students가 비어있을 때
    if (!appData.students || appData.students.length === 0) {
      try {
        const saved = JSON.parse(localStorage.getItem('individualStudentsData') || '[]');
        if (Array.isArray(saved) && saved.length > 0) appData = { ...appData, students: saved };
      } catch (e) { /* ignore */ }
    }
    buildHierarchyDropdowns(appData.students || []);
    // 초기 섹션 숨김
    setSection('hx-keyword-section', false);
    setSection('hx-radar-section', false);
    setSection('hx-loading', false);
    setSection('hx-radar-wrap', false);
    setSection('hx-error-box', false);
  };

  // ── 모달 닫기 ────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('hx-reason-modal');
    const closeBtn = document.getElementById('hx-modal-close');
    if (overlay) {
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.add('hidden'); });
    }
    if (closeBtn) closeBtn.addEventListener('click', () => overlay && overlay.classList.add('hidden'));

    const analyzeBtn = document.getElementById('hx-analyze-btn');
    if (analyzeBtn) analyzeBtn.addEventListener('click', runAnalysis);
  });
})();
