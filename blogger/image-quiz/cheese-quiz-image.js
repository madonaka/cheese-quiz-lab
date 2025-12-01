// Cheese Quiz - Image Question Module
// 텍스트 퀴즈와 같은 모달/로그 시스템을 재사용하는 이미지 퀴즈 전용 모듈

document.addEventListener('DOMContentLoaded', function () {
  // 한 페이지에 여러 개가 있어도 동작하도록 전체 선택
  var wrappers = document.querySelectorAll('.cheese-quiz-image-wrapper');
  if (!wrappers.length) return;

  wrappers.forEach(function (wrapper) {
    // --- 1) 설정 값 읽기 -------------------------------------------------

    // 기본 웹앱 URL (필요하면 포스트에서 data-api로 덮어쓰기 가능)
    var WEB_APP_URL =
      wrapper.getAttribute('data-api') ||
      'https://script.google.com/macros/s/AKfycbxpB5KYqIS5y3DISPmQcUa41F04-vgNGe0KQZnYIXdFsUaGD_1r2eD5PGrUMpi02xEt/exec';

    // 필터 파라미터(기간/주제/난이도). limit은 기본 1문제.
    var params = {
      period:     wrapper.getAttribute('data-period')     || '',
      topic:      wrapper.getAttribute('data-topic')      || '',
      difficulty: wrapper.getAttribute('data-difficulty') || '',
      limit:      wrapper.getAttribute('data-limit')      || '1'
    };

    // examKey (로그/통계용) – 필요 없으면 안 넣어도 됨
    var examKey = wrapper.getAttribute('data-exam-key') || '';

    // --- 2) DOM 요소 캐시 -------------------------------------------------

    var questionEl = wrapper.querySelector('.cheese-quiz-image-question');
    var optionsEl  = wrapper.querySelector('.cheese-quiz-image-options');
    var resultEl   = wrapper.querySelector('.cheese-quiz-image-result');
    var checkBtn   = wrapper.querySelector('.cheese-quiz-image-check-btn');
    var reloadBtn  = wrapper.querySelector('.cheese-quiz-image-reload-btn');

    // 현재 상태
    var currentData   = null;   // 현재 문제 전체 데이터
    var selectedIndex = null;   // 1, 2, 3, 4 ... (선택한 번호)

    // --- 3) 유틸 함수들 ---------------------------------------------------

    function buildUrl() {
      var qs = [];
      for (var key in params) {
        if (params[key]) {
          qs.push(
            encodeURIComponent(key) + '=' + encodeURIComponent(params[key])
          );
        }
      }
      return WEB_APP_URL + (qs.length ? '?' + qs.join('&') : '');
    }

    function setResult(text) {
      if (resultEl) {
        resultEl.textContent = text;
      }
    }

    // 보기 버튼 하나를 만들고 클릭 핸들러 연결
    function createOptionButton(choice, idx) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cheese-quiz-image-option';
      btn.dataset.index = String(idx + 1);

      // 번호 영역
      var num = document.createElement('div');
      num.className = 'cheese-quiz-image-option-number';
      num.textContent = (idx + 1) + '번';
      btn.appendChild(num);

      // 이미지가 있으면 이미지 태그
      if (choice.imageUrl) {
        var img = document.createElement('img');
        img.src = choice.imageUrl;
        img.alt = choice.text || ('선택지 ' + (idx + 1));
        btn.appendChild(img);
      }

      // 텍스트 캡션이 있으면 아래에 출력
      if (choice.text) {
        var cap = document.createElement('div');
        cap.className = 'cheese-quiz-image-option-caption';
        cap.textContent = choice.text;
        btn.appendChild(cap);
      }

      // 클릭 시 선택 처리
      btn.addEventListener('click', function () {
        selectedIndex = idx + 1;

        // 같은 퀴즈 박스 안의 버튼만 선택 상태 토글
        var all = wrapper.querySelectorAll('.cheese-quiz-image-option');
        all.forEach(function (el) {
          el.classList.toggle('selected', el === btn);
        });
      });

      return btn;
    }

    // --- 4) 문제 로딩 -----------------------------------------------------

    function loadQuestion() {
      currentData   = null;
      selectedIndex = null;
      setResult('');

      if (optionsEl) optionsEl.innerHTML = '';
      if (questionEl) {
        questionEl.textContent = '문제를 불러오는 중입니다...';
      }

      // 전역 로딩 모달이 있으면 같이 사용
      if (typeof showQuizLoading === 'function') {
        showQuizLoading('이미지 문제를 불러오는 중입니다...');
      }

      fetch(buildUrl())
        .then(function (res) {
          return res.json();
        })
        .then(function (data) {
          if (!Array.isArray(data) || !data.length) {
            if (questionEl)
              questionEl.textContent = '문제를 불러올 수 없습니다.';
            console.log('[image-quiz] invalid data:', data);
            return;
          }

          var q = data[0]; // limit=1 기준

          currentData = q;

          // 문제 문장
          if (questionEl) {
            questionEl.textContent = q.question || '';
          }

          if (!optionsEl) return;

          // 공통 choice 구조 맞추기
          var choices = q.choiceObjects || [];

          // 구형 구조: choices[] + choiceImageUrls[]
          if (!choices.length && Array.isArray(q.choices)) {
            var imageUrls = Array.isArray(q.choiceImageUrls)
              ? q.choiceImageUrls
              : [];
            choices = q.choices.map(function (txt, idx) {
              return {
                text: txt || '',
                imageUrl: imageUrls[idx] || ''
              };
            });
          }

          optionsEl.innerHTML = '';

          choices.forEach(function (choice, idx) {
            var btn = createOptionButton(choice, idx);
            optionsEl.appendChild(btn);
          });
        })
        .catch(function (err) {
          console.log('[image-quiz] fetch error:', err);
          if (questionEl) {
            questionEl.textContent =
              '문제를 불러오는 중 오류가 발생했습니다.';
          }
        })
        .finally(function () {
          if (typeof hideQuizLoading === 'function') {
            hideQuizLoading();
          }
        });
    }

    // --- 5) 채점하기 버튼 --------------------------------------------------

    if (checkBtn) {
      checkBtn.addEventListener('click', function () {
        if (!currentData) return;

        if (!selectedIndex) {
          setResult('먼저 보기를 선택해 주세요.');
          return;
        }

        var correct = Number(currentData.answer);
        var isCorrect = selectedIndex === correct;

        // 결과 문장
        var msg = '';
        if (isCorrect) {
          msg = '정답입니다.';
        } else {
          msg = '오답입니다. 정답은 ' + correct + '번입니다.';
        }

        if (currentData.explanation) {
          msg += ' ' + currentData.explanation;
        }
        setResult(msg);

        // 점수 모달 (전역 함수 재사용)
        if (typeof openCheeseQuizModal === 'function') {
          var correctCount = isCorrect ? 1 : 0;
          var totalCount   = 1;
          var percent      = isCorrect ? 100 : 0;
          openCheeseQuizModal(percent, correctCount, totalCount);
        }

        // 로그 전송 (선택 사항 – 전역 함수가 있으면 재사용)
        if (typeof sendCheeseQuizLog === 'function') {
          var logItems = [
            {
              qid: currentData.id || '',
              selected: String(selectedIndex),
              correct: String(correct),
              isCorrect: isCorrect,
              difficulty:
                currentData.difficulty ||
                wrapper.getAttribute('data-difficulty') ||
                ''
            }
          ];

          // wrapper 측에 examKey를 달아 두면 그대로 전달됨
          if (examKey) {
            wrapper.setAttribute('data-exam-key', examKey);
          }

          sendCheeseQuizLog(wrapper, logItems);
        }
      });
    }

    // --- 6) 다시풀기 버튼 --------------------------------------------------

    if (reloadBtn) {
      reloadBtn.addEventListener('click', function () {
        loadQuestion();
      });
    }

    // 첫 문제 자동 로딩
    loadQuestion();
  });
});
