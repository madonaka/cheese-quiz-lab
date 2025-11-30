/**
 * Cheese Quiz Lab - 이미지 선택형 퀴즈 렌더러
 * version: 0.1.0
 * env: Blogger 테스트 블로그
 *
 * 사용 방법:
 * 1) HTML에 아래 구조를 만들어 둔다.
 *
 * <div class="cheese-quiz-image-wrapper" data-exam-key="dev-img-01">
 *   <div class="cheese-quiz-image-question"></div>
 *   <div class="cheese-quiz-image-options"></div>
 *   <div class="cheese-quiz-image-footer">
 *     <button type="button" class="cheese-quiz-image-check-btn">채점하기</button>
 *     <button type="button" class="cheese-quiz-image-reload-btn">다시 풀기</button>
 *     <div class="cheese-quiz-image-result"></div>
 *   </div>
 * </div>
 *
 * 2) 이 JS 파일 내용을 <script> 태그로 붙여 넣거나,
 *    별도 .js 파일로 불러온다.
 */

document.addEventListener('DOMContentLoaded', function () {
  var wrapper = document.querySelector('.cheese-quiz-image-wrapper');
  if (!wrapper) return; // 이 블록이 없는 페이지에서는 아무것도 안 함

  // TODO: 나중에 실제 웹앱 URL로 교체
  var WEB_APP_URL = 'https://script.google.com/macros/s/여기에_웹앱_URL/exec';

  var examKey = wrapper.getAttribute('data-exam-key') || 'dev-img-01';

  var questionEl = wrapper.querySelector('.cheese-quiz-image-question');
  var optionsEl = wrapper.querySelector('.cheese-quiz-image-options');
  var resultEl = wrapper.querySelector('.cheese-quiz-image-result');
  var checkBtn = wrapper.querySelector('.cheese-quiz-image-check-btn');
  var reloadBtn = wrapper.querySelector('.cheese-quiz-image-reload-btn');

  var currentData = null;
  var selectedIndex = null;

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

    var url = WEB_APP_URL + '?examKey=' + encodeURIComponent(examKey);

    fetch(url)
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (!data.ok) {
          questionEl.textContent = '문제를 불러올 수 없습니다.';
          console.log('quiz error:', data);
          return;
        }

        currentData = data;
        questionEl.textContent = data.questionText || '';

        // 보기(이미지 카드) 생성
        data.images.forEach(function (imgUrl, idx) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'cheese-quiz-image-option';
          btn.dataset.index = String(idx + 1); // 1부터 시작

          var num = document.createElement('div');
          num.className = 'cheese-quiz-image-option-number';
          num.textContent = (idx + 1) + '번';

          var img = document.createElement('img');
          img.src = imgUrl;
          img.alt = '선택지 ' + (idx + 1);

          btn.appendChild(num);
          btn.appendChild(img);

          btn.addEventListener('click', function () {
            selectedIndex = idx + 1; // 선택된 번호 저장 (1부터)
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

      var correct = Number(currentData.correctIndex);
      if (selectedIndex === correct) {
        setResult('정답입니다 😊 ' + (currentData.explanation || ''));
      } else {
        var msg = '오답입니다. 정답은 ' + correct + '번입니다.';
        if (currentData.explanation) {
          msg += ' ' + currentData.explanation;
        }
        setResult(msg);
      }
    });
  }

  if (re
