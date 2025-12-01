// 이미지 연습문제 (Blogger용)
// - 기존 텍스트 퀴즈 시스템과 최대한 호환되게 설계
// - 점수 모달(openCheeseQuizModal) + 로그(sendCheeseQuizLog)를 재사용
// - HTML 구조는 .cheese-quiz-image-wrapper 그대로 유지

document.addEventListener('DOMContentLoaded', function () {
  const wrapper = document.querySelector('.cheese-quiz-image-wrapper');
  if (!wrapper) return;

  // ▼ Apps Script 웹앱 URL (이미지 문제용)
  //    필요하면 블로그별로 다른 URL로 교체해서 사용
  const WEB_APP_URL =
    'https://script.google.com/macros/s/AKfycbzFReVfHBWvlkOCDIR-VY0KY6GcC9aCS7yVC6oqfpgBYcYc1egRXUOo1e3Tm9GbQ9pM/exec';

  // ▼ DOM 요소들
  const questionEl = wrapper.querySelector('.cheese-quiz-image-question');
  const optionsEl  = wrapper.querySelector('.cheese-quiz-image-options');
  const resultEl   = wrapper.querySelector('.cheese-quiz-image-result');
  const checkBtn   = wrapper.querySelector('.cheese-quiz-image-check-btn');
  const reloadBtn  = wrapper.querySelector('.cheese-quiz-image-reload-btn');

  // 시험 키 (텍스트 퀴즈의 data-exam-key 개념과 동일)
  const examKey = wrapper.dataset.examKey || wrapper.getAttribute('data-exam-key') || '';

  // 현재 문제 데이터 & 선택 상태
  let currentData = null;     // Apps Script에서 내려온 한 문제 객체
  let selectedIndex = null;   // 유저가 선택한 보기 번호(1~4 등)

  // ─────────────────────────────────────
  // 공통 helper: 모달 닫기
  // ─────────────────────────────────────
  function closeCheeseQuizModal() {
    const modal = document.getElementById('cheese-quiz-modal');
    if (!modal) return;
    modal.classList.remove('is-open');
    document.documentElement.classList.remove('quiz-modal-open');
    if (document.body) {
      document.body.classList.remove('quiz-modal-open');
    }
  }

  // ─────────────────────────────────────
  // URL 구성 (기간/난이도/토픽 + limit=1)
  // ─────────────────────────────────────
  function buildUrl() {
    const params = new URLSearchParams();
    // 이미지 문제는 한 번에 1문항만 가져온다고 가정
    params.set('limit', '1');

    const period     = wrapper.dataset.period || '';
    const topic      = wrapper.dataset.topic || '';
    const difficulty = wrapper.dataset.difficulty || '';

    if (period)     params.set('period', period);
    if (topic)      params.set('topic', topic);
    if (difficulty) params.set('difficulty', difficulty);

    return WEB_APP_URL + '?' + params.toString();
  }

  // ─────────────────────────────────────
  // 결과 텍스트 표시 helper
  // ─────────────────────────────────────
  function setResult(msg) {
    if (!resultEl) return;
    resultEl.textContent = msg || '';
  }

  // ─────────────────────────────────────
  // 화면에 문제 1개 로딩
  // ─────────────────────────────────────
  async function loadQuestion() {
    // 이전 상태 초기화
    currentData   = null;
    selectedIndex = null;
    setResult('');

    if (optionsEl) {
      optionsEl.innerHTML = '';
    }
    if (questionEl) {
      questionEl.textContent = '문제를 불러오는 중입니다...';
    }

    try {
      const res  = await fetch(buildUrl());
      const data = await res.json();

      if (!Array.isArray(data) || !data.length) {
        if (questionEl) {
          questionEl.textContent = '조건에 맞는 문제가 없습니다.';
        }
        return;
      }

      const q = data[0];  // 한 번에 1문항만 사용
      currentData = q;

      // 문제 문장
      if (questionEl) {
        questionEl.textContent = q.question || '';
      }

      if (!optionsEl) return;

      optionsEl.innerHTML = '';

      // 이미지 + 캡션 데이터 구조 정리
      // 1) choiceObjects: [{ text, imageUrl }, ...]가 있으면 최우선
      // 2) 없으면 choices + choiceImageUrls 를 합쳐서 생성
      let choiceObjects = Array.isArray(q.choiceObjects) ? q.choiceObjects.slice() : [];

      if (!choiceObjects.length && Array.isArray(q.choices)) {
        const imageUrls = Array.isArray(q.choiceImageUrls)
          ? q.choiceImageUrls
          : [];

        choiceObjects = q.choices.map(function (text, idx) {
          return {
            text: text,
            imageUrl: imageUrls[idx] || ''
          };
        });
      }

      // 보기 버튼 생성
      choiceObjects.forEach(function (choice, idx) {
        if (!choice) return;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cheese-quiz-image-option';
        btn.setAttribute('data-index', String(idx + 1));

        // 번호
        const num = document.createElement('div');
        num.className = 'cheese-quiz-image-option-number';
        num.textContent = (idx + 1) + '번';
        btn.appendChild(num);

        // 이미지
        if (choice.imageUrl) {
          const img = document.createElement('img');
          img.src = choice.imageUrl;
          img.alt = choice.text || ('보기 ' + (idx + 1));
          btn.appendChild(img);
        }

        // 캡션
        if (choice.text) {
          const cap = document.createElement('div');
          cap.className = 'cheese-quiz-image-option-caption';
          cap.textContent = choice.text;
          btn.appendChild(cap);
        }

        // 클릭 시 선택 토글
        btn.addEventListener('click', function () {
          selectedIndex = idx + 1;

          Array.from(
            optionsEl.querySelectorAll('.cheese-quiz-image-option')
          ).forEach(function (el) {
            el.classList.toggle('selected', el === btn);
          });
        });

        optionsEl.appendChild(btn);
      });
    } catch (err) {
      console.error('[image-quiz] load error:', err);
      if (questionEl) {
        questionEl.textContent = '에러가 발생했습니다. 잠시 후 다시 시도해 주세요.';
      }
    }
  }

  // ─────────────────────────────────────
  // 채점 버튼
  //  - 전역 점수 모달 + 로그 시스템과 연동
  // ─────────────────────────────────────
  if (checkBtn) {
    checkBtn.addEventListener('click', function () {
      if (!currentData) {
        setResult('먼저 문제를 불러온 뒤에 채점할 수 있습니다.');
        return;
      }

      if (!selectedIndex) {
        setResult('먼저 보기를 선택해 주세요.');
        return;
      }

      const correct = Number(currentData.answer);
      const isCorrect = selectedIndex === correct;

      // 결과 메시지
      let msg = '';
      const explain = currentData.explanation || '';

      if (isCorrect) {
        msg = '정답입니다! ';
        if (explain) msg += explain;
      } else {
        msg = '오답입니다. 정답은 ' + correct + '번입니다.';
        if (explain) msg += ' ' + explain;
      }

      setResult(msg);

      // ① 점수 모달 열기 (기존 텍스트 퀴즈와 동일한 형태)
      //    - 1문항 기준: 맞으면 100점, 틀리면 0점
      if (typeof openCheeseQuizModal === 'function') {
        const percent     = isCorrect ? 100 : 0;
        const correctCnt  = isCorrect ? 1   : 0;
        const totalCnt    = 1;

        openCheeseQuizModal(percent, correctCnt, totalCnt);
      }

      // ② 로그 전송 (sendCheeseQuizLog 재사용)
      //    - 텍스트 퀴즈에서와 동일한 구조로 기록 → 시트에서 함께 분석 가능
      if (typeof sendCheeseQuizLog === 'function') {
        const logItems = [
          {
            qid:        String(currentData.id || ''),
            selected:   String(selectedIndex),
            correct:    String(correct),
            isCorrect:  isCorrect,
            difficulty: currentData.difficulty || wrapper.dataset.difficulty || ''
          }
        ];

        // sendCheeseQuizLog는 wrapper.dataset.examKey를 사용하므로,
        // 이미지 퀴즈도 data-exam-key를 달아주면 동일하게 동작
        wrapper.dataset.examKey = examKey || wrapper.dataset.examKey || '';

        sendCheeseQuizLog(wrapper, logItems);
      }
    });
  }

  // ─────────────────────────────────────
  // 다시 풀기 버튼
  //  - 모달 닫고, 새 문제 다시 로딩
  // ─────────────────────────────────────
  if (reloadBtn) {
    reloadBtn.addEventListener('click', function () {
      // 모달이 떠 있으면 닫기
      closeCheeseQuizModal();

      // 선택/결과 초기화
      selectedIndex = null;
      setResult('');

      if (optionsEl) {
        Array.from(
          optionsEl.querySelectorAll('.cheese-quiz-image-option')
        ).forEach(function (el) {
          el.classList.remove('selected');
        });
      }

      // 새 문제 로딩
      loadQuestion();
    });
  }

  // 페이지 진입 시 1문제 로딩
  loadQuestion();
});
