import { extractActions, toMessage } from "./parser.js";

const SAMPLE = `주간 영업 회의 (실명 대신 역할로 적음)
참석: 기획담당, 영업 매니저, 개발리드
- 지난주 매출은 약 X억 원, 목표 대비 90%
- 견적서 초안 정리 @기획담당 10/25까지
TODO: 고객 A사 회신 (담당: 영업 매니저, 기한: 10월 30일)
- @개발리드 데모 사이트 배포 일정 공유하기로
- 디자인 시안 다시 보기로 함
- [ ] 다음 주 화요일까지 B사 미팅 자료 준비 @영업 매니저`;

const $ = (id) => document.getElementById(id);
const notes = $("notes");
let items = [];

function render() {
  const rows = $("rows");
  rows.replaceChildren();
  for (const [i, it] of items.entries()) {
    const tr = document.createElement("tr");
    if (it.needsReview) tr.className = "review";

    const check = document.createElement("input");
    check.type = "checkbox";
    check.setAttribute("aria-label", `${i + 1}번 확정`);
    check.checked = !it.needsReview;
    check.addEventListener("change", () => {
      it.confirmed = check.checked;
      summarize();
    });
    it.confirmed = check.checked;

    const cells = [check, it.task, editable(it, "owner", "담당 미정"), editable(it, "due", "기한 미정"), it.reason || "확인됨"];
    for (const c of cells) {
      const td = document.createElement("td");
      if (typeof c === "string") td.textContent = c;
      else td.append(c);
      tr.append(td);
    }
    rows.append(tr);
  }
  $("count").textContent = String(items.length);
  $("table").hidden = items.length === 0;
  $("empty").hidden = items.length > 0;
  $("empty").textContent = notes.value.trim()
    ? "액션아이템을 찾지 못했습니다. 「@담당」 「10/25까지」 같은 표시를 넣어 보세요."
    : "왼쪽에 회의록을 넣고 「액션아이템 뽑기」를 누르세요.";
  $("copy").disabled = items.length === 0;
  summarize();
}

/** 담당 · 기한은 사람이 고칠 수 있다 — 고치면 「확인 필요」가 풀린다. */
function editable(it, key, placeholder) {
  const input = document.createElement("input");
  input.value = it[key];
  input.placeholder = placeholder;
  input.setAttribute("aria-label", placeholder.replace(" 미정", ""));
  input.addEventListener("input", () => {
    it[key] = input.value.trim();
    const missing = [!it.owner && "담당", !it.due && "기한"].filter(Boolean);
    it.needsReview = missing.length > 0;
    it.reason = missing.length ? `${missing.join(" · ")} 확인 필요` : "";
    const tr = input.closest("tr");
    tr.className = it.needsReview ? "review" : "";
    tr.lastElementChild.textContent = it.reason || "확인됨";
    summarize();
  });
  return input;
}

function summarize() {
  const review = items.filter((it) => it.needsReview).length;
  const confirmed = items.filter((it) => it.confirmed).length;
  $("summary").textContent = items.length
    ? `모두 ${items.length}건 · 확정 ${confirmed}건 · 사람이 확인할 것 ${review}건`
    : "";
  const msg = $("message");
  msg.hidden = items.length === 0;
  msg.textContent = toMessage(items);
}

$("sample").addEventListener("click", () => {
  notes.value = SAMPLE;
  notes.focus();
});

$("run").addEventListener("click", () => {
  items = extractActions(notes.value);
  render();
});

$("clear").addEventListener("click", () => {
  notes.value = "";
  items = [];
  render();
});

$("copy").addEventListener("click", async () => {
  const text = toMessage(items);
  try {
    await navigator.clipboard.writeText(text);
    $("copy").textContent = "복사됨";
  } catch {
    // 클립보드를 막은 브라우저 — 아래 메시지 칸을 선택해 둔다.
    const range = document.createRange();
    range.selectNodeContents($("message"));
    getSelection().removeAllRanges();
    getSelection().addRange(range);
    $("copy").textContent = "선택됨 · Ctrl+C";
  }
  setTimeout(() => ($("copy").textContent = "메시지로 복사"), 1500);
});

render();
