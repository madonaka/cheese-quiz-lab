function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActive();
    const sheet = ss.getSheetByName('questions'); // ← 문제 DB 시트 이름

    if (!sheet) {
      return jsonError({
        message: '시트 "questions"를 찾을 수 없습니다. 탭 이름을 확인해주세요.'
      });
    }

    const values = sheet.getDataRange().getValues();
    if (!values || values.length < 2) {
      return jsonError({
        message: 'questions 시트에 데이터가 없습니다.'
      });
    }

    const header = values[0];      // 1행 헤더 (현재는 직접 안 씀)
    const rows = values.slice(1);  // 2행부터 데이터

    // 우리가 가정한 컬럼 인덱스 (0부터 시작)
    // ★ 기존 컬럼은 그대로 두고, 오른쪽에 이미지 관련 컬럼 추가
    const COL = {
      id: 0,
      period: 1,
      topic: 2,
      difficulty: 3,
      question: 4,
      choice1: 5,
      choice2: 6,
      choice3: 7,
      choice4: 8,
      answer: 9,
      explanation: 10,
      active: 11,
      hint: 12,

      // 새로 추가한 컬럼들 (questions 시트 오른쪽에 이 순서로 있어야 함)
      questionType: 13,      // text / imageChoice 등
      questionImageUrl: 14,  // 지문용 메인 이미지 (있으면)
      choice1ImageUrl: 15,
      choice2ImageUrl: 16,
      choice3ImageUrl: 17,
      choice4ImageUrl: 18
    };

    const params = e && e.parameter ? e.parameter : {};
    const periodParam = params.period;       // 예: '조선후기'
    const topicParam = params.topic;         // 예: '정치'
    const diffParam = params.difficulty;     // 예: '1'
    const limitParam = params.limit;         // 예: '5'

    // active = 1 인 것만
    let filtered = rows.filter(r => String(r[COL.active]) === '1');

    // period 필터
    if (periodParam) {
      filtered = filtered.filter(r => String(r[COL.period]) === periodParam);
    }

    // topic 필터
    if (topicParam) {
      filtered = filtered.filter(r => String(r[COL.topic]) === topicParam);
    }

    // difficulty 필터
    if (diffParam) {
      filtered = filtered.filter(r => String(r[COL.difficulty]) === diffParam);
    }

    if (filtered.length === 0) {
      return jsonError({
        message: '조건에 맞는 문제가 없습니다.',
        period: periodParam || null,
        topic: topicParam || null,
        difficulty: diffParam || null
      });
    }

    // 랜덤 섞기 (Fisher–Yates)
    for (let i = filtered.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
    }

    // limit 계산
    const limit = limitParam
      ? Math.min(parseInt(limitParam, 10), filtered.length)
      : Math.min(5, filtered.length);

    const picked = filtered.slice(0, limit).map(r => {
      const questionTypeRaw = r[COL.questionType];
      const questionType = questionTypeRaw && String(questionTypeRaw).trim()
        ? String(questionTypeRaw).trim()
        : 'text'; // 기본값은 text

      // 텍스트 보기 (기존 구조 그대로 유지)
      const choicesText = [
        r[COL.choice1],
        r[COL.choice2],
        r[COL.choice3],
        r[COL.choice4]
      ];

      // 이미지 보기 URL들 (없으면 '' 또는 undefined가 들어갈 수 있음)
      const choiceImageUrls = [
        r[COL.choice1ImageUrl],
        r[COL.choice2ImageUrl],
        r[COL.choice3ImageUrl],
        r[COL.choice4ImageUrl]
      ];

      // 프론트에서 쓰기 편하게, 텍스트/이미지 둘 다 포함한 구조도 하나 만들어 둠
      const choices = choicesText.map((text, idx) => ({
        text: text || '',
        imageUrl: choiceImageUrls[idx] || ''
      }));

      return {
        id: r[COL.id],
        period: r[COL.period],
        topic: r[COL.topic],
        difficulty: r[COL.difficulty],

        // 새 필드들
        questionType: questionType,                         // 'text' | 'imageChoice' ...
        questionImageUrl: r[COL.questionImageUrl] || '',    // 지문 이미지 (선택)

        // 기존 필드 유지 (기존 JS 호환용)
        question: r[COL.question],
        choices: choicesText,           // ← 기존과 동일: ["보기1", "보기2", ...]
        answer: r[COL.answer],
        explanation: r[COL.explanation],
        hint: r[COL.hint],

        // 새 구조: 텍스트+이미지 세트
        choiceImageUrls: choiceImageUrls, // ["url1","url2",...]
        choiceObjects: choices            // [{text, imageUrl}, ...]
      };
    });

    return ContentService
      .createTextOutput(JSON.stringify(picked))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    // 예기치 못한 에러도 JSON으로 내려주기
    return jsonError({
      message: '스크립트 내부 에러',
      detail: String(err)
    });
  }
}

// JSON 에러 응답 헬퍼
function jsonError(obj) {
  return ContentService
    .createTextOutput(JSON.stringify({ error: obj }))
    .setMimeType(ContentService.MimeType.JSON);
}
