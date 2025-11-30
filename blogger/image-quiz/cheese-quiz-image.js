// Cheese Quiz Image Quiz - uses questions API (text + image)

document.addEventListener('DOMContentLoaded', function () {
  var wrapper = document.querySelector('.cheese-quiz-image-wrapper');
  if (!wrapper) return;

  // ★ 여기 웹앱 URL을 네 프로젝트 걸로 바꿔 넣기
  var WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxpB5KYqIS5y3DISPmQcUa41F04-vgNGe0KQZnYIXdFsUaGD_1r2eD5PGrUMpi02xEt/exec';

  // 필요하면 data-period/data-topic/data-difficulty로 필터 걸기
  var params = {
    period: wrapper.getAttribute('data-period') || '',
    topic: wrapper.getAttribute('data-topic') || '',
    difficulty: wrapper.getAttribute('data-difficulty') || '',
    limit: '1'
  };

  var questionEl = wrapper.querySelector('.cheese-quiz-image-question');
  var optionsEl = wrapper.querySelector('.cheese-quiz-image-options');
  var resultEl = wrapper.querySelector('.cheese-quiz-image-result');
  var checkBtn = wrapper.querySelector('.cheese-quiz-image-check-btn');
  var reloadBtn = wrapper.querySelector('.cheese-quiz-image-reload-btn');

  var currentData = null;
  var selectedIndex = null;

  function buildUrl() {
    var qs = [];
    for (var k in params) {
      if (params[k]) {
        qs.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
      }
    }
    return WEB_APP_URL + (qs.length ? ('?' + qs.join('&')) : '');
  }

  function setResult(text) {
    if (resultEl) {
      resultEl.textContent = text;
    }
  }

  function loadQuestion() {
    setResult('');
    selectedIndex = null;
    optionsEl.innerHTML = '';
    questionEl.textContent = '문제를 불러오는 중입니다...';

    fetch(buildUrl())
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (!Array.isArray(data) || !data.length) {
          questionEl.textContent = '문제를 불러올 수 없습니다.';
          console.log('quiz error:', data);
          return;
        }

        var q = data[0]; // limit=1이므로 첫 번째만 사용
        currentData = q;

        var type = q.questionType || 'text';
        questionEl.textContent = q.question || '';

        // 공통 choices 구조 준비
        var choices = q.choiceObjects || [];
        if (!choices.length && Array.isArray(q.choices)) {
          // choiceObjects가 없을 경우를 대비한 폴백
          var imageUrls = Array.isArray(q.choiceImageUrls) ? q.choiceImageUrls : [];
          choices = q.choices.map(function (txt, idx) {
            return {
              text: txt || '',
              imageUrl: imageUrls[idx] || ''
            };
          });
        }

        // 보기 렌더링
        choices.forEach(function (ch, idx) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'cheese-quiz-image-option';
          btn.dataset.index = String(idx + 1);

          var num = document.createElement('div');
          num.className = 'cheese-quiz-image-option-number';
          num.textContent = (idx + 1) + '번';

          btn.appendChild(num);

          // 이미지가 있으면 이미지 표시
          if (ch.imageUrl) {
            var img = document.createElement('img');
            img.src = ch.imageUrl;
            img.alt = ch.text || ('선택지 ' + (idx + 1));
            btn.appendChild(img);
          }

          // 텍스트가 있으면 캡션으로 표시
          if (ch.text) {
            var cap = document.createElement('div');
            cap.className = 'cheese-quiz-image-option-caption';
            cap.textContent = ch.text;
            btn.appendChild(cap);
          }

          btn.addEventListener('click', function () {
            selectedIndex = idx + 1;
            var all = wrapper.querySelectorAll('.cheese-quiz-image-option');
            all.forEach(function (el) {
              el.classList.toggle('selected', el === btn);
            });
          });

          optionsEl.appendChild(btn);
        });
      })
      .catch(function (err) {
        console.log('fetch error:', err);
        questionEl.textContent = '문제를 불러오는 중 오류가 발생했습니다.';
      });
  }

  if (checkBtn) {
    checkBtn.addEventListener('click', function () {
      if (!currentData) return;
      if (!selectedIndex) {
        setResult('먼저 보기를 선택해 주세요.');
        return;
      }

      var correct = Number(currentData.answer);
      if (selectedIndex === correct) {
        setResult('정답입니다 😊 ' + (currentData.explanation || ''));
      } else {
        var msg = '오답입니다. 정답은 ' + correct + '번입니다.';
        if (currentData.explanation) msg += ' ' + currentData.explanation;
        setResult(msg);
      }
    });
  }

  if (reloadBtn) {
    reloadBtn.addEventListener('click', function () {
      loadQuestion();
    });
  }

  // 첫 문제 로드
  loadQuestion();
});
