/**
 * Cheese Quiz Lab - 이미지 선택형 문제용 GAS 스크립트
 * - 구글 시트에서 문화재 이미지 문제 1문제를 랜덤으로 가져온다.
 *
 * 시트 구조 예시 (1행은 헤더):
 * A열: examKey           (예: dev-img-01)
 * B열: questionText      (문제 문장)
 * C열: choice1ImageUrl   (1번 보기 이미지 URL)
 * D열: choice2ImageUrl   (2번 보기 이미지 URL)
 * E열: choice3ImageUrl   (3번 보기 이미지 URL)
 * F열: choice4ImageUrl   (4번 보기 이미지 URL, 없으면 비워둬도 됨)
 * G열: correctIndex      (정답 번호: 1, 2, 3, 4)
 * H열: explanation       (해설 문장)
 */

// ✅ 나중에 실제 값으로 바꿔 넣을 부분
var SPREADSHEET_ID = '여기에_스프레드시트_ID_넣기';
var SHEET_NAME = 'dev-image-quiz'; // 시트 이름 그대로 적기

/**
 * 웹앱 엔드포인트
 * 예: https://script.google.com/macros/s/XXX/exec?examKey=dev-img-01
 */
function doGet(e) {
  var examKey = (e && e.parameter && e.parameter.examKey) 
    ? e.parameter.examKey 
    : 'dev-img-01'; // examKey 안 들어오면 기본값

  var payload = getImageQuestion(examKey);

  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 실제로 시트에서 데이터를 읽어와 JSON 객체로 만들어주는 함수
 */
function getImageQuestion(examKey) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      return {
        ok: false,
        error: 'NO_SHEET',
        sheetName: SHEET_NAME
      };
    }

    var values = sheet.getDataRange().getValues();
    if (values.length < 2) {
      return {
        ok: false,
        error: 'NO_DATA'
      };
    }

    // 1행(헤더)을 제외한 나머지
    var rows = values.slice(1);

    // examKey가 일치하는 행만 필터링
    var candidates = rows.filter(function (r) {
      return String(r[0]) === String(examKey); // A열 examKey
    });

    if (candidates.length === 0) {
      return {
        ok: false,
        error: 'NO_QUESTION',
        examKey: examKey
      };
    }

    /
