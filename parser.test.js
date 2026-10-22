import assert from "node:assert/strict";
import { test } from "node:test";

import { extractActions, findDue, findOwner, toMessage } from "./parser.js";

test("담당 · 기한이 있는 줄은 그대로 뽑고 확인 필요가 아니다", () => {
  const [a] = extractActions("- 견적서 초안 정리 @기획담당 10/25까지");
  assert.equal(a.owner, "기획담당");
  assert.equal(a.due, "10/25");
  assert.equal(a.task, "견적서 초안 정리 10/25까지");
  assert.equal(a.needsReview, false);
});

test("「담당: 」 「기한: 」 표기와 「10월 3일」을 읽는다", () => {
  const [a] = extractActions("TODO: 고객 A사 회신 (담당: 영업 매니저, 기한: 10월 3일)");
  assert.equal(a.owner, "영업 매니저");
  assert.equal(a.due, "10/03");
  assert.equal(a.task, "고객 A사 회신");
});

test("담당이나 기한이 없으면 사람이 확인하도록 표시한다", () => {
  const [a, b] = extractActions("디자인 시안 다시 보기로 함\n@개발리드 배포 일정 공유하기로");
  assert.equal(a.needsReview, true);
  assert.equal(a.reason, "담당 · 기한 확인 필요");
  assert.equal(b.owner, "개발리드");
  assert.equal(b.reason, "기한 확인 필요");
});

test("액션이 아닌 줄은 건너뛴다", () => {
  assert.equal(extractActions("참석: 기획, 개발\n지난주 매출은 약 X억 원").length, 0);
});

test("상대 날짜 · 요일", () => {
  assert.equal(findDue("다음 주 화요일까지 보고"), "다음 주 화요일");
  assert.equal(findDue("내일까지"), "내일");
  assert.equal(findOwner("담당: 마케팅 매니저 / 예산 확인"), "마케팅 매니저");
});

test("메시지로 바꾸면 번호와 미정 표시가 붙는다", () => {
  const msg = toMessage(extractActions("@기획담당 회의록 공유 내일까지\n자료 조사하기로"));
  assert.equal(msg, "회의 액션아이템\n1. 회의록 공유 내일까지 — 기획담당 / 내일\n2. 자료 조사하기로 — 담당 미정 / 기한 미정 ⚠");
});
