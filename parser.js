// 회의록 한 덩어리에서 액션아이템(할 일 · 담당 · 기한)을 뽑는다.
// 브라우저와 Node(테스트)가 같은 파일을 쓴다. 외부 호출은 없다.

const ACTION_HINT = /(@\S|담당\s*[:：]|기한\s*[:：]|까지|기로|TODO|할\s*일|액션|\[\s*\])/i;

const OWNER_PATTERNS = [
  /@([^\s,.:：)]+(?:\s?(?:담당|리드|매니저|팀장))?)/,
  /담당\s*[:：]\s*([^,/|·)]+?)(?=\s*(?:[,/|·)]|기한|$))/,
];

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function pad(n) {
  return String(n).padStart(2, "0");
}

/** 「10/25」 「10월 25일」 「기한: 10.25」 → "10/25". 요일 · 상대 날짜는 글자 그대로 둔다. */
export function findDue(line) {
  const md = line.match(/(\d{1,2})\s*(?:[/.]|월\s*)(\d{1,2})\s*일?/);
  if (md) {
    const m = Number(md[1]);
    const d = Number(md[2]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) return `${pad(m)}/${pad(d)}`;
  }
  const rel = line.match(/(오늘|내일|모레|이번\s*주(?:\s*[월화수목금토일]요일)?|다음\s*주(?:\s*[월화수목금토일]요일)?|[월화수목금토일]요일)/);
  return rel ? rel[1].replace(/\s+/g, " ") : "";
}

export function findOwner(line) {
  for (const re of OWNER_PATTERNS) {
    const m = line.match(re);
    if (m) return m[1].trim();
  }
  return "";
}

function cleanTask(line) {
  return line
    .replace(/^\s*(?:[-*•]\s*)?(?:\[\s*[xX ]?\s*\]\s*)?/, "")
    .replace(/^(?:TODO|할\s*일|액션)\s*[:：]\s*/i, "")
    .replace(/@[^\s,.:：)]+(?:\s?(?:담당|리드|매니저|팀장))?/g, "")
    .replace(/[(（]?\s*(?:담당|기한)\s*[:：][^,)）]*[)）]?/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,·:-]+|[\s,·:-]+$/g, "")
    .trim();
}

/**
 * @returns {{ task: string, owner: string, due: string, needsReview: boolean, reason: string }[]}
 * 담당 · 기한이 비면 사람이 정해야 하므로 needsReview 로 표시한다(사람이 판단할 지점).
 */
export function extractActions(text) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && ACTION_HINT.test(l))
    .map((line) => {
      const owner = findOwner(line);
      const due = findDue(line);
      const task = cleanTask(line) || line;
      const missing = [!owner && "담당", !due && "기한"].filter(Boolean);
      return {
        task,
        owner,
        due,
        needsReview: missing.length > 0,
        reason: missing.length ? `${missing.join(" · ")} 확인 필요` : "",
      };
    });
}

/** 결과를 메신저에 붙여 넣기 좋은 글로 */
export function toMessage(items, title = "회의 액션아이템") {
  if (items.length === 0) return `${title}\n(뽑힌 항목 없음)`;
  const rows = items.map(
    (it, i) =>
      `${i + 1}. ${it.task} — ${it.owner || "담당 미정"} / ${it.due || "기한 미정"}${it.needsReview ? " ⚠" : ""}`,
  );
  return [title, ...rows].join("\n");
}

export { WEEKDAYS };
