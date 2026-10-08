// A/B 테스트 설계 및 실습 — 이론 파트 덱 생성 (2026-10-05 작성, 사용법은 README.md)
const path = require("path");
const fs = require("fs");
const pptxgen = require("pptxgenjs");
const JSZip = require("jszip");

const OUT = process.argv[2] || path.join(__dirname, "..", "ab-testing-theory.pptx");
const BING_IMG = path.join(__dirname, "..", "..", "ab-testing", "images", "01-bing-long-title.png");
const KO_FONT = process.env.KO_FONT || "Apple SD Gothic Neo";

const THEME = {
  name: "Lab Rats",
  headFontFace: KO_FONT,
  bodyFontFace: KO_FONT,
  colors: {
    dk1: "1B1F3B", lt1: "FFFFFF", dk2: "555C7A", lt2: "F3F5FA",
    accent1: "3A5BFF", accent2: "0E9C9C", accent3: "0F9D63",
    accent4: "D93B41", accent5: "B87700", accent6: "8A90A8",
    hlink: "3A5BFF", folHlink: "555C7A",
  },
};
// 차트·표 테두리 등 hex만 받는 옵션용
const HEX = {
  ink: "1B1F3B", ink2: "555C7A", ink3: "8A90A8", line: "E3E7F1", night: "1B1F3B",
  blue: "3A5BFF", blueNight: "7B93FF", teal: "0E9C9C", pos: "0F9D63", neg: "D93B41",
  warn: "B87700", mutedOnDark: "AEB3CC", softBlue: "C9D3FF", softTeal: "B7E3E3",
};

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
pres.theme = { headFontFace: KO_FONT, bodyFontFace: KO_FONT };
pres.title = "A/B 테스트 설계 및 실습 — 이론 파트";
pres.author = "LeeJungYeon";
const C = pres.SchemeColor;

const W = 13.333;
const L = 0.7;
const CW = W - 2 * L;

// ---------- 레이아웃 ----------
pres.defineSlideMaster({
  title: "COVER",
  background: { color: HEX.night },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: L, y: 2.2, w: 7.6, h: 1.9,
      fontSize: 44, bold: true, color: "FFFFFF", valign: "bottom", align: "left", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "sub", type: "body", x: L, y: 4.35, w: 7.2, h: 1.2,
      fontSize: 20, color: HEX.mutedOnDark, valign: "top", align: "left", margin: 0 }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "SECTION",
  background: { color: HEX.night },
  objects: [
    { placeholder: { options: { name: "num", type: "body", x: L, y: 1.5, w: 4, h: 1.6,
      fontSize: 96, bold: true, color: HEX.blueNight, valign: "bottom", align: "left", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "title", type: "title", x: L, y: 3.3, w: 11, h: 1.0,
      fontSize: 40, bold: true, color: "FFFFFF", valign: "top", align: "left", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "desc", type: "body", x: L, y: 4.45, w: 11, h: 0.8,
      fontSize: 20, color: HEX.mutedOnDark, valign: "top", align: "left", margin: 0 }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "CONTENT",
  background: { color: "FFFFFF" },
  margin: [0.5, 0.7, 0.8, 0.7],
  objects: [
    { placeholder: { options: { name: "kicker", type: "body", x: L, y: 0.45, w: 8, h: 0.35,
      fontSize: 15, bold: true, color: HEX.blue, valign: "top", align: "left", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "title", type: "title", x: L, y: 0.82, w: CW, h: 0.85,
      fontSize: 20, bold: true, color: HEX.ink, valign: "top", align: "left", margin: 0 }, text: "" } },
    { text: { text: "A/B 테스트 설계 및 실습 · 이론 파트",
      options: { x: L, y: 6.95, w: 6, h: 0.3, fontSize: 10, color: HEX.ink3, margin: 0 } } },
  ],
  slideNumber: { x: 12.15, y: 6.95, w: 0.5, h: 0.3, fontSize: 10, color: HEX.ink3, align: "right" },
});

// ---------- 헬퍼 ----------
const T = (s, text, o) =>
  s.addText(text, { isTextBox: true, margin: 0, fontSize: 15, color: C.text1, valign: "top", ...o });
const R = (text, o = {}) => ({ text, options: o });
const BR = (text, o = {}) => ({ text, options: { ...o, breakLine: true } });

const TOPICS = {
  "00": { kicker: "먼저 읽기 · 기초용어" },
  "01": { kicker: "01 · 왜 A/B 테스트를 하는가" },
  "02": { kicker: "02 · 문제 정의와 가설 수립" },
  "03": { kicker: "03 · 지표 설계" },
  "04": { kicker: "04 · 실험 단위 결정" },
  "05": { kicker: "05 · 실제 실험 운영 설계" },
  "06": { kicker: "06 · 간섭 문제" },
  "07": { kicker: "07 · 간섭 문제의 해결" },
  "08": { kicker: "08 · 윤리 문제" },
  "09": { kicker: "09 · 실험 실행과 결과 해석" },
  "10": { kicker: "10 · 실무 함정과 대응" },
  "11": { kicker: "11 · 실험 플랫폼과 데이터 기반 문화" },
  "12": { kicker: "12 · 복습 퀴즈" },
  reference: { kicker: "참고자료" },
};

const HYPOTHESIS_TITLES = new Set([
  "현상이 아니라 문제에서 시작한다", "해결책은 여러 개, 실험에서 바꾸는 건 하나", "가설은 한 문장으로 쓴다",
  "틀렸다는 결과도 나올 수 있어야 좋은 가설이다", "제품 가설을 통계적 가설로 바꾼다",
  "단측검정은 결과를 보기 전에 정한다", "'나빠지지 않았다'는 비열등성 검정으로 말한다",
]);
const METRIC_TITLES = new Set([
  "지표는 층으로 설계하고, 순서대로 읽는다", "좋은 OEC는 지금 잴 수 있고, 장기 목표를 가리킨다",
  "노스스타는 방향을, OEC는 이번 실험을 판단한다", "Primary는 정의까지 정해야 쓸 수 있다",
  "Driver 지표는 Primary가 움직인 경로를 보여준다", "CTR이 올랐다: 더 눌러서인가, 덜 보여줘서인가",
  "가드레일은 개선 대상이 아니라 침범 금지선이다", "지표는 목표가 아니라 가치를 대신 재는 숫자다",
  "지표와 판단 기준은 실험 전에 적어 둔다",
]);
const UNIT_TITLES = new Set([
  "사용자 단위에서 시작하고, 다른 단위는 이유를 댄다", "식별자는 사람의 근사치다",
  "사람을 계속 알아보기 어렵다면 세션 단위를 쓴다", "효과를 받을 수 있는 사람만 분석에 넣는다",
]);
const OPERATIONS_TITLES = new Set([
  "실험이 틀리는 두 가지 방식", "MDE를 절반으로 줄이면 필요한 사용자는 4배",
  "α와 Power를 엄격하게 잡을수록 실험은 길어진다", "MDE는 통계가 아니라 비즈니스가 정한다",
  "단순 배정, 층화 배정, 해싱 배정", "50:50이 가장 효율적이고, 90:10은 위험 관리용이다",
]);
const PITFALL_TITLES = new Set([
  "실무에서 자주 밟는 여섯 가지 함정", "중간에 봐야 한다면, 봐도 되는 방법으로 본다",
  "세그먼트마다 이기는데 전체로는 진다", "결과보다 배정 비율을 먼저 본다", "측정이 흔들리면 결과도 흔들린다",
]);

function topicFor(sec, title) {
  if (title === "오늘의 목표" || title === "목차") return "opening";
  if (title === "먼저 용어를 맞춘다") return "00";
  if (sec === "Ch1 실험과 인과추론") return "01";
  if (HYPOTHESIS_TITLES.has(title)) return "02";
  if (METRIC_TITLES.has(title)) return "03";
  if (title === "실험 대상은 출시 대상을 닮아야 한다") return "01";
  if (UNIT_TITLES.has(title)) return "04";
  if (OPERATIONS_TITLES.has(title)) return "05";
  if (title === "내 처치가 남의 결과를 바꾸면 안 된다" || title.startsWith("간섭은") || title.startsWith("간섭이 있으면")) return "06";
  if (title.startsWith("간섭을 줄이려면") || title === "목적이 다르면 실험 방식도 다르다" || title.startsWith("실험 없이 인과를")) return "07";
  if (title.startsWith("측정할 수 있는가와")) return "08";
  if (sec === "Ch3 실행과 분석" || title.startsWith("'유의하다'에서") || title.startsWith("효과 크기 ×")) return "09";
  if (PITFALL_TITLES.has(title)) return "10";
  if (title.startsWith("결과를 보고") || title.startsWith("이 기능의 실험을")) return "12";
  if (title === "Reference") return "reference";
  if (sec === "Ch5 사례와 결정") return "11";
  throw new Error(`위키 순서를 지정하지 않은 슬라이드: ${sec} / ${title}`);
}

const TITLE_COPY = {
  "목차": "위키 순서",
  "그냥 배포하고 보면 안 되나?": "전후 비교만으로는 효과를 판단할 수 없다",
  "먼저 용어를 맞춘다": "A/B 테스트 기초용어",
  "A/B 테스트는 일곱 단계로 돌아간다": "A/B 테스트의 기본 절차",
  "현상이 아니라 문제에서 시작한다": "실험의 출발점은 문제 정의다",
  "해결책은 여러 개, 실험에서 바꾸는 건 하나": "한 실험에서는 핵심 변화 하나만 검증한다",
  "가설은 한 문장으로 쓴다": "검증 가능한 가설의 구조",
  "틀렸다는 결과도 나올 수 있어야 좋은 가설이다": "좋은 가설의 조건",
  "제품 가설을 통계적 가설로 바꾼다": "제품 가설과 통계적 가설",
  "단측검정은 결과를 보기 전에 정한다": "단측검정과 양측검정",
  "'나빠지지 않았다'는 비열등성 검정으로 말한다": "비열등성 검정",
  "지표는 층으로 설계하고, 순서대로 읽는다": "지표 체계와 해석 순서",
  "좋은 OEC는 지금 잴 수 있고, 장기 목표를 가리킨다": "OEC 설계 원칙",
  "노스스타는 방향을, OEC는 이번 실험을 판단한다": "North Star Metric과 OEC",
  "Primary는 정의까지 정해야 쓸 수 있다": "Primary Metric의 정의",
  "Driver 지표는 Primary가 움직인 경로를 보여준다": "Secondary Metric과 Driver Metric",
  "CTR이 올랐다: 더 눌러서인가, 덜 보여줘서인가": "비율 지표의 구성 효과",
  "가드레일은 개선 대상이 아니라 침범 금지선이다": "Guardrail Metric의 역할",
  "지표는 목표가 아니라 가치를 대신 재는 숫자다": "Goodhart's Law",
  "지표와 판단 기준은 실험 전에 적어 둔다": "지표와 판단 기준의 사전 정의",
  "사용자 단위에서 시작하고, 다른 단위는 이유를 댄다": "실험 단위 선택",
  "식별자는 사람의 근사치다": "사용자 식별자의 한계",
  "사람을 계속 알아보기 어렵다면 세션 단위를 쓴다": "Session-level Randomization",
  "효과를 받을 수 있는 사람만 분석에 넣는다": "트리거 분석",
  "실험이 틀리는 두 가지 방식": "1종 오류와 2종 오류",
  "α와 Power를 엄격하게 잡을수록 실험은 길어진다": "유의수준과 검정력이 실험 규모에 미치는 영향",
  "MDE는 통계가 아니라 비즈니스가 정한다": "MDE 결정 기준",
  "단순 배정, 층화 배정, 해싱 배정": "무작위 배정 방식",
  "50:50이 가장 효율적이고, 90:10은 위험 관리용이다": "배정 비율과 실험 효율",
  "내 처치가 남의 결과를 바꾸면 안 된다": "SUTVA와 간섭",
  "A/A로 점검하고, 조금씩 늘리고, 충분히 돌린다": "실험 실행 순서",
  "같은 것끼리 비교해서 시스템을 먼저 검증한다": "A/A 테스트",
  "최소 1~2주, 요일과 신기효과를 넘겨서": "실험 기간 결정",
  "검정은 지표의 모양을 보고 고른다": "지표 유형에 따른 통계 검정",
  "p-value를 말하는 법": "p-value 해석",
  "점추정 대신 구간으로 말한다": "신뢰구간 해석",
  "통계적으로 유의하다 ≠ 의미 있다": "통계적 유의성과 실질적 유의성",
  "실무에서 자주 밟는 여섯 가지 함정": "실험 결과를 왜곡하는 주요 함정",
  "중간에 봐야 한다면, 봐도 되는 방법으로 본다": "Sequential Testing",
  "세그먼트마다 이기는데 전체로는 진다": "심슨의 역설",
  "결과보다 배정 비율을 먼저 본다": "Sample Ratio Mismatch",
  "측정이 흔들리면 결과도 흔들린다": "실험을 오염시키는 데이터 편향",
  "간섭은 두 경로로 생긴다": "직접 간섭과 간접 간섭",
  "간섭이 있으면 실험 결과가 이렇게 흔들린다": "간섭이 실험 결과에 미치는 영향",
  "간섭을 줄이려면 나누는 단위를 다시 설계한다": "간섭 문제의 해결 방법",
  "측정할 수 있는가와 해도 되는가는 다른 질문이다": "A/B 테스트의 윤리 문제",
  "목적이 다르면 실험 방식도 다르다": "목적에 따른 실험 설계",
  "실험 없이 인과를 추정하는 세 가지 방법": "실험이 어려울 때의 인과추론 방법",
  "실험을 잘하는 회사들이 오늘 개념을 어떻게 쓰나": "기업의 실험 방법 사례",
  "실험하는 조직의 세 가지 원칙": "온라인 통제 실험의 세 가지 원칙",
  "실험 문화를 받치는 세 가지": "실험 문화의 기반",
  "'유의하다'에서 멈추지 말고 결정으로 닫는다": "실험 결과에서 의사결정까지",
};

function content(sec, kicker, title, notes) {
  const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: sec });
  const topic = topicFor(sec, title);
  const detail = kicker.includes(" · ") ? kicker.split(" · ").slice(1).join(" · ") : kicker;
  s.addText(TOPICS[topic] ? `${TOPICS[topic].kicker} · ${detail}` : kicker, { placeholder: "kicker" });
  s.addText(TITLE_COPY[title] || title, { placeholder: "title" });
  s._deckTopic = topic;
  s._deckTitle = TITLE_COPY[title] || title;
  if (notes) s.addNotes(notes);
  return s;
}

function collectWikiReferences() {
  const docsDir = path.join(__dirname, "..", "..", "ab-testing");
  const files = fs.readdirSync(docsDir).filter((name) => /^\d{2}-.*\.md$/.test(name)).sort();
  const seen = new Set();
  const references = [];

  for (const file of files) {
    const markdown = fs.readFileSync(path.join(docsDir, file), "utf8");
    const heading = markdown.indexOf("## Reference");
    if (heading < 0) continue;
    const tail = markdown.slice(heading);
    const nextHeading = tail.indexOf("\n## ", "## Reference".length);
    const sectionText = nextHeading < 0 ? tail : tail.slice(0, nextHeading);
    const links = sectionText.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g);

    for (const [, rawTitle, rawUrl] of links) {
      const url = rawUrl.replace(/\?utm_source=chatgpt\.com$/, "");
      if (seen.has(url)) continue;
      seen.add(url);
      references.push({
        title: rawTitle.replaceAll("\\|", "|").trim(),
        url,
        source: file.slice(0, 2),
      });
    }
  }

  return references;
}

function addReferenceSlides() {
  const references = collectWikiReferences();
  const labels = [
    "Oracle: A/B Testing", "Datarian: Experiment Bible", "OCE Case Studies",
    "Hypothesis Testing", "WikiDocs: A/B Guide", "Growth Culture",
    "Problem Definition", "Null vs Alternative", "One vs Two Tailed",
    "OEC / KPI / Driver", "Metric Selection", "Ably: Product Metrics",
    "OEC Design", "A/B Data Quality", "Hackle: User ID",
    "Conversion Unit", "Randomization Unit", "Sample Proportion",
    "MDE Guide", "GA: Cookie + Dimension", "Wanted: A/B Basics",
    "Hash Assignment", "Experiment Guide", "SUTVA & Interference",
    "OCE: Leakage", "Causal Workshop 2022", "Facebook: Contagion",
    "Contagion: Editorial Note", "61M Social Influence", "TOCE: A/A Test",
    "TOCE: Ramp-up", "Unexpected OCE Results", "CUPED",
    "ASA: p-values", "Benjamini-Hochberg FDR", "OCE: A/A Materials",
    "SRM Diagnosis Guide", "SRM Diagnosis Paper", "Always Valid Inference",
    "Oracle: A/B Pitfalls", "Experiment Platform", "Platform & Culture",
  ];

  const columns = 4;
  const rows = Math.ceil(references.length / columns);
  const s = content(
    "Ch5 사례와 결정",
    `참고자료 · ${references.length}개 고유 링크`,
    "Reference",
    "docs/ab-testing 01~11편의 Reference 링크를 URL 기준으로 중복 제거했습니다.",
  );

  references.forEach((reference, index) => {
    const col = Math.floor(index / rows);
    const row = index % rows;
    const x = L + col * 3.02;
    const y = 1.78 + row * 0.43;
    T(s, labels[index] || reference.title.slice(0, 28), {
      x, y, w: 2.82, h: 0.3,
      fontSize: 8.5,
      bold: true,
      color: C.accent1,
      hyperlink: { url: reference.url },
      fit: "shrink",
    });
  });

  console.log(`references: ${references.length} unique URLs`);
}
function section(sec, num, title, desc, notes) {
  pres.addSection({ title: sec });
  const s = pres.addSlide({ masterName: "SECTION", sectionTitle: sec });
  s._deckTopic = "legacy-section";
  s.addText(num, { placeholder: "num" });
  s.addText(title, { placeholder: "title" });
  s.addText(desc, { placeholder: "desc" });
  if (notes) s.addNotes(notes);
  return s;
}
function arrow(s, x, y, w, color = HEX.ink3, h = 0) {
  s.addShape(pres.ShapeType.line, { x, y, w, h,
    line: { color, width: 1.5, endArrowType: "triangle" } });
}
function vline(s, x, y, h, color = HEX.line) {
  s.addShape(pres.ShapeType.line, { x, y, w: 0, h, line: { color, width: 1 } });
}
// 시드 고정 난수 (재현성)
let seed = 42;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
function dot(s, x, y, d, color) {
  s.addShape(pres.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color }, line: { color, width: 0 } });
}
// 표: 세로선·채우기 없이 가로선만
function table(s, header, rows, o) {
  const hb = { type: "solid", pt: 1, color: HEX.ink };
  const rb = { type: "solid", pt: 0.75, color: HEX.line };
  const none = { type: "none" };
  const head = header.map((h) => ({ text: h, options: {
    bold: true, color: HEX.ink2, fontSize: o.headSize || 14, border: [none, none, hb, none] } }));
  const body = rows.map((r) => r.map((c) => {
    const cell = typeof c === "string" ? { text: c, options: {} } : c;
    return { text: cell.text, options: { border: [none, none, rb, none], ...cell.options } };
  }));
  s.addTable([head, ...body], { x: o.x, y: o.y, w: o.w, colW: o.colW, fontSize: o.fontSize || 15,
    color: HEX.ink, valign: "middle", margin: [0.08, 0.12, 0.08, 0.0], rowH: o.rowH, autoPage: false });
}
const chartBase = (o = {}) => ({
  catAxisLabelColor: HEX.ink2, valAxisLabelColor: HEX.ink2,
  catAxisLabelFontSize: 12, valAxisLabelFontSize: 12,
  catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt",
  valGridLine: { color: HEX.line, size: 0.75 }, catGridLine: { style: "none" },
  catAxisLineShow: true, valAxisLineShow: false,
  titleFontFace: "+mn-lt", dataLabelFontFace: "+mn-lt", legendFontFace: "+mn-lt",
  titleColor: HEX.ink, titleFontSize: 14, legendFontSize: 12, legendColor: HEX.ink2,
  ...o,
});
const SRC = (s, text, y = 6.55) => T(s, text, { x: L, y, w: CW, h: 0.3, fontSize: 11, color: C.accent6 });

// ======================================================
// 오프닝
// ======================================================
pres.addSection({ title: "오프닝" });
{
  const s = pres.addSlide({ masterName: "COVER", sectionTitle: "오프닝" });
  s._deckTopic = "cover";
  s.addText("A/B 테스트\n설계 및 실습", { placeholder: "title" });
  s.addText("개선 아이디어를 검증 가능한 실험으로, 결과를 배포 결정으로", { placeholder: "sub" });
  T(s, "발표자: 25기 이정연, 25기 이유민", { x: L, y: 4.81, w: 5.0, h: 0.37, fontSize: 15, color: "FFFFFF" });
  // 모티프: 무작위로 두 그룹에 배정된 사용자 점
  const x0 = 8.9, y0 = 1.4, gap = 0.36;
  for (let r = 0; r < 13; r++) for (let c = 0; c < 10; c++) {
    const v = rnd();
    dot(s, x0 + c * gap, y0 + r * gap, 0.14, v < 0.5 ? HEX.blueNight : "4FC7C7");
  }
  s.addNotes("오늘은 통계 수업이 아니라 실험을 설계하고 해석해서 배포 여부를 결정하는 세션입니다. "
    + "오른쪽 점 하나하나가 사용자이고, 파란 점과 청록 점은 무작위로 나뉜 두 그룹입니다. 이 점 모티프가 계속 나옵니다.");
}
{
  const s = content("오프닝", "오프닝", "오늘의 목표",
    "한 줄 목표를 먼저 공유합니다. DA 트랙 전체 흐름에서 이 세션은 마지막 '검증' 단계입니다. "
    + "그로스 세션에서 세운 개선 가설을 여기서 실험으로 검증합니다.");
  T(s, [
    R("개선 아이디어를 "), R("검증 가능한 실험", { color: C.accent1, bold: true }),
    R("으로 설계하고,\n결과를 근거로 "), R("배포한다 / 안 한다", { color: C.accent1, bold: true }),
    R("를 판단할 수 있다"),
  ], { x: L, y: 2.0, w: CW, h: 1.6, fontSize: 30, lineSpacingMultiple: 1.15 });
  const steps = [["SQL", "뽑고"], ["시각화", "보고"], ["그로스", "진단하고"], ["A/B 테스트", "검증한다"]];
  const sx = L, sw = 2.75, sy = 4.6;
  steps.forEach(([a, b], i) => {
    const last = i === steps.length - 1;
    T(s, [BR(a, { bold: true, fontSize: 20, color: last ? C.accent1 : C.text1 }),
      R(b, { fontSize: 15, color: C.text2 })], { x: sx + i * (sw + 0.35), y: sy, w: sw, h: 1.0 });
    if (!last) arrow(s, sx + i * (sw + 0.35) + sw - 0.55, sy + 0.25, 0.6);
  });
}
{
  const s = content("오프닝", "오프닝", "목차",
    "저장소 위키의 순서대로 진행합니다. 세부 편은 네 묶음으로 나눠 전체 흐름을 먼저 보여 줍니다.");
  const ch = [
    ["00-01", "기초용어와 실험의 필요성"], ["02-05", "가설·지표·단위·운영 설계"],
    ["06-08", "간섭과 윤리"], ["09-12", "실행·함정·문화·복습"],
  ];
  const gap = 0.12, w = (CW - gap * (ch.length - 1)) / ch.length;
  let x = L;
  const colors = [HEX.blue, HEX.blue, HEX.blue, HEX.blue, HEX.blue];
  ch.forEach(([n, t], i) => {
    T(s, [BR(n, { bold: true, color: C.accent1, fontSize: 14 }), R(t, { fontSize: 15, bold: true })],
      { x, y: 2.3, w, h: 0.9 });
    s.addShape(pres.ShapeType.line, { x, y: 3.45, w, h: 0, line: { color: colors[i], width: 6 } });
    x += w + gap;
  });
}

// ======================================================
// Ch1
// ======================================================
section("Ch1 실험과 인과추론", "01", "실험 설계의 기초와 인과추론", "왜 '배포하고 보기'로는 부족한가");
{
  const s = content("Ch1 실험과 인과추론", "Ch1 · 오프닝 질문", "그냥 배포하고 보면 안 되나?",
    "청중에게 먼저 물어봅니다. '전환율이 올랐으니 성공 아닌가요?' "
    + "오른쪽 목록은 같은 기간에 동시에 일어날 수 있는 일들입니다. 전후 비교는 이것들과 배포 효과를 분리하지 못합니다. 수치는 교육용 예시입니다.");
  T(s, "3.0% → 3.4%", { x: L, y: 2.1, w: 6.2, h: 1.3, fontSize: 54, bold: true, color: C.accent1 });
  T(s, "새 장바구니 화면 배포 전 2주 vs 배포 후 2주\n결제 전환율",
    { x: L, y: 3.5, w: 6, h: 0.8, fontSize: 15, color: C.text2 });
  T(s, "성공일까요?", { x: L, y: 4.6, w: 6, h: 0.6, fontSize: 20, bold: true });
  T(s, [
    BR("같은 2주 동안 일어난 일", { bold: true, fontSize: 20 }),
    BR("배포 다음 날 시작한 할인 프로모션", { bullet: true }),
    BR("월급날과 연휴가 낀 시즌", { bullet: true }),
    BR("광고 채널 변경으로 달라진 유입 구성", { bullet: true }),
    R("원래 있던 일별 변동", { bullet: true }),
  ], { x: 7.4, y: 2.15, w: 5.2, h: 2.6, fontSize: 15, paraSpaceAfter: 8 });
  T(s, [R("전후 비교로는 "), R("무엇 때문에", { bold: true, color: C.accent4 }), R(" 올랐는지 가를 수 없다")],
    { x: 7.4, y: 5.0, w: 5.2, h: 0.8, fontSize: 20 });
}
{
  const s = content("Ch1 실험과 인과추론", "Ch1 · 상관관계 vs 인과관계",
    "새 기능을 쓰는 사람이 덜 떠난다면, 기능 덕분일까?",
    "Kohavi 책과 위키 01편의 넷플릭스 이탈률 예시입니다. 새 기능 사용자의 이탈률이 절반이어도, "
    + "원래 충성도 높은 사용자가 새 기능도 더 많이 썼을 수 있습니다. 충성도처럼 두 변수를 동시에 움직이는 것이 교란 변수입니다.");
  // 인과 그래프: 박스 없이 점 + 글자
  const nx = { top: [4.1, 2.15], left: [1.2, 4.6], right: [7.0, 4.6] };
  dot(s, nx.top[0], nx.top[1] + 0.08, 0.22, HEX.warn);
  T(s, [BR("충성도", { bold: true, fontSize: 20 }), R("관측하기 어려움", { fontSize: 14, color: C.text2 })],
    { x: nx.top[0] + 0.35, y: nx.top[1], w: 2.6, h: 0.8 });
  dot(s, nx.left[0], nx.left[1] + 0.08, 0.22, HEX.blue);
  T(s, "새 기능 사용", { x: nx.left[0] + 0.35, y: nx.left[1], w: 2.4, h: 0.5, fontSize: 20, bold: true });
  dot(s, nx.right[0], nx.right[1] + 0.08, 0.22, HEX.teal);
  T(s, "이탈률 낮음", { x: nx.right[0] + 0.35, y: nx.right[1], w: 2.4, h: 0.5, fontSize: 20, bold: true });
  s.addShape(pres.ShapeType.line, { x: 1.9, y: 3.0, w: 2.0, h: 1.4, flipH: true,
    line: { color: HEX.warn, width: 2, endArrowType: "triangle" } });
  s.addShape(pres.ShapeType.line, { x: 5.0, y: 3.0, w: 2.1, h: 1.4,
    line: { color: HEX.warn, width: 2, endArrowType: "triangle" } });
  s.addShape(pres.ShapeType.line, { x: 3.3, y: 4.72, w: 3.5, h: 0,
    line: { color: HEX.ink3, width: 2, dashType: "dash", endArrowType: "triangle" } });
  T(s, "?", { x: 4.85, y: 4.85, w: 0.5, h: 0.5, fontSize: 20, bold: true, color: C.accent6, align: "center" });
  T(s, [
    BR("Confounding", { bold: true, fontSize: 20, color: C.accent5 }),
    BR("두 변수를 동시에 움직이는 제3의 변수", { fontSize: 15, color: C.text2, paraSpaceAfter: 14 }),
    BR("Selection Bias", { bold: true, fontSize: 20, color: C.accent5 }),
    BR("처치를 스스로 고른 사람은 처음부터 다르다", { fontSize: 15, color: C.text2, paraSpaceAfter: 14 }),
    BR("확인할 수 있는 것", { bold: true, fontSize: 20 }),
    BR("새 기능 사용 ↔ 낮은 이탈률 (상관)", { fontSize: 15, color: C.text2 }),
    R("새 기능 사용 → 이탈률 감소 (인과)는 무작위 실험으로만", { fontSize: 15, color: C.text2 }),
  ], { x: 9.0, y: 2.1, w: 3.6, h: 4.2 });
  SRC(s, "출처: Kohavi, Tang, Xu (2020) 예시를 각색 · 위키 01편 5장");
}
{
  const s = content("Ch1 실험과 인과추론", "Ch1 · Potential Outcomes Framework",
    "한 사람에게서 두 결과를 동시에 볼 수는 없다",
    "각 사용자에게는 기능을 받았을 때의 결과 Y(1)과 안 받았을 때의 결과 Y(0)이 모두 있지만, 우리는 하나만 관측합니다. "
    + "그래서 개인의 효과는 알 수 없고, 집단의 평균 효과를 추정합니다. 랜덤 배정이 이를 가능하게 합니다.");
  const q = { text: "?", options: { color: HEX.ink3, bold: true } };
  table(s, ["사용자", "Y(1) 새 화면을 봤다면", "Y(0) 기존 화면을 봤다면", "개인 효과"], [
    ["유저 1", "구매", q, q], ["유저 2", q, "구매 안 함", q], ["유저 3", "구매 안 함", q, q], ["유저 4", q, "구매", q],
  ], { x: L, y: 2.0, w: 7.4, colW: [1.4, 2.2, 2.3, 1.5], rowH: 0.5 });
  T(s, [
    BR("관측하지 못한 칸이 반드시 생긴다", { bold: true, fontSize: 20 }),
    R("인과추론의 근본 문제 (Fundamental Problem of Causal Inference) → 개인 대신 집단 평균을 비교",
      { fontSize: 15, color: C.text2 }),
  ], { x: 8.6, y: 2.0, w: 4.0, h: 2.0 });
  T(s, "ATE = E[Y(1)] - E[Y(0)]", { x: 8.6, y: 4.2, w: 4.0, h: 0.6, fontSize: 20, bold: true, color: C.accent1 });
  T(s, "랜덤 배정 → 두 그룹 평균 차이가 ATE의 편향 없는 추정치",
    { x: 8.6, y: 4.9, w: 4.0, h: 0.9, fontSize: 15, color: C.text2 });
}
{
  const s = content("Ch1 실험과 인과추론", "Ch1 · 무작위 통제 실험(RCT)",
    "랜덤 배정은 보이지 않는 차이까지 고르게 나눈다",
    "왼쪽은 전체 사용자입니다. 진한 점은 충성 사용자, 연한 점은 일반 사용자입니다. 동전 던지기로 나누면 "
    + "충성도처럼 우리가 측정하지 못한 특성도 두 그룹에 비슷하게 퍼집니다. 그래서 두 그룹의 차이를 처치 효과와 우연으로만 설명할 수 있습니다.");
  seed = 7;
  const users = Array.from({ length: 64 }, () => ({ loyal: rnd() < 0.4, g: rnd() < 0.5 ? "A" : "B" }));
  const gap = 0.34, d = 0.17;
  users.forEach((u, i) => dot(s, L + (i % 8) * gap, 2.2 + Math.floor(i / 8) * gap, d,
    u.loyal ? HEX.ink : "C3C7D6"));
  T(s, "전체 사용자 64명", { x: L, y: 5.05, w: 3, h: 0.4, fontSize: 14, color: C.text2 });
  arrow(s, 3.7, 3.4, 1.0);
  T(s, "무작위 배정", { x: 3.55, y: 3.55, w: 1.5, h: 0.4, fontSize: 14, color: C.text2 });
  const draw = (grp, x0, color, label) => {
    const list = users.filter((u) => u.g === grp);
    list.forEach((u, i) => dot(s, x0 + (i % 6) * gap, 2.2 + Math.floor(i / 6) * gap, d,
      u.loyal ? color : (grp === "A" ? HEX.softBlue : HEX.softTeal)));
    const pct = Math.round((100 * list.filter((u) => u.loyal).length) / list.length);
    T(s, [BR(label, { bold: true, color: color === HEX.blue ? C.accent1 : C.accent2 }),
      R(`${list.length}명 · 충성 사용자 ${pct}%`, { color: C.text2, fontSize: 14 })],
      { x: x0, y: 5.05, w: 2.4, h: 0.8, fontSize: 15 });
  };
  draw("A", 5.1, HEX.blue, "A 대조군");
  draw("B", 7.6, HEX.teal, "B 실험군");
  T(s, [
    BR("두 그룹의 차이", { bold: true, fontSize: 20 }),
    BR("= 처치 효과 + 우연", { bold: true, fontSize: 20, color: C.accent1, paraSpaceAfter: 14 }),
    BR("좋은 배정의 조건", { bold: true, fontSize: 15 }),
    BR("지속성: 실험 내내 같은 그룹", { bullet: true, fontSize: 14, color: C.text2 }),
    BR("독립성: 내 배정이 남의 배정에 영향 없음", { bullet: true, fontSize: 14, color: C.text2 }),
    R("배정 확률이 모두에게 같음", { bullet: true, fontSize: 14, color: C.text2 }),
  ], { x: 10.1, y: 2.2, w: 2.6, h: 3.6 });
}
{
  const s = content("Ch1 실험과 인과추론", "Ch1 · Bing 사례", "6개월 미뤄 둔 아이디어가 매출을 12% 올렸다",
    "위키 01편 1장. 2012년 Bing 직원이 광고 제목 아래 문장을 제목에 합쳐 길게 보여주자고 제안했지만 우선순위가 낮아 6개월 넘게 미뤄졌습니다. "
    + "A/B 테스트 결과 매출이 약 12% 늘었고, 사용자 경험(사용자당 세션 수, 이용량, 관련성)은 나빠지지 않았습니다. "
    + "위키 11편: Microsoft에서 실험한 아이디어 중 지표를 개선한 것은 약 3분의 1뿐이었습니다. 출처: Kohavi & Thomke, HBR 2017.");
  const imgH = 4.55, imgW = imgH * (1048 / 1318);
  s.addImage({ path: BING_IMG, x: L, y: 1.8, w: imgW, h: imgH, altText: "Bing 광고 제목을 길게 표시한 실험 전후 비교", objectName: "Bing 실험 그림" });
  const rx = L + imgW + 0.5, rw = 12.65 - rx;
  T(s, [R("+12%", { bold: true, fontSize: 54, color: C.accent1 }), R("  매출", { fontSize: 20, bold: true })],
    { x: rx, y: 1.85, w: rw, h: 1.0 });
  T(s, "광고 제목 길게 표시 · 사용자 경험 지표(세션 수, 이용량, 관련성) 악화 없음",
    { x: rx, y: 2.9, w: rw, h: 0.7, fontSize: 15, color: C.text2 });
  const lessons = [
    ["아이디어의 가치는 사전에 판단하기 어렵다", "Microsoft에서 실험한 아이디어 중 지표를 개선한 건 약 3분의 1"],
    ["큰 효과를 내는 실험은 드물다", "작은 개선을 반복해서 찾고, 그것을 쌓아 제품을 키운다"],
    ["효과가 있는 것과 없는 것을 가린다", "캠페인과 디지털 마케팅 자산을 평가하는 기준이 된다"],
  ];
  lessons.forEach(([h, b], i) => {
    const y = 3.75 + i * 0.85;
    T(s, String(i + 1).padStart(2, "0"), { x: rx, y, w: 0.6, h: 0.5, fontSize: 20, bold: true, color: C.accent1 });
    T(s, [BR(h, { bold: true, fontSize: 15 }), R(b, { fontSize: 14, color: C.text2 })], { x: rx + 0.65, y: y + 0.02, w: rw - 0.65, h: 0.8 });
  });
  SRC(s, "그림: Kohavi, Tang, Xu (2020) 그림 1.1 · 출처: Kohavi & Thomke (2017), HBR · 위키 01편 1장, 11편 1.3", 6.5);
}
{
  const s = content("Ch1 실험과 인과추론", "Ch1 · 용어 정리", "먼저 용어를 맞춘다",
    "위키 01편 2장. 온라인 통제 실험은 A/B, A/B/n, 분할 테스트, 버킷 테스트, 플라이트 등으로도 불립니다. "
    + "대조군은 기준점이자, 실험군에서 버그가 나면 모든 사용자를 되돌릴 수 있는 안전한 기본 버전입니다.");
  const b = (t) => ({ text: t, options: { bold: true } });
  table(s, ["용어", "뜻", "기억할 점"], [
    [b("대조군 (Control)"), "비교 기준이 되는 기존 버전", "문제가 생기면 돌아갈 안전한 기본 버전 (fallback)"],
    [b("실험군 (Treatment)"), "새 변경사항을 적용한 버전", "가능하면 핵심 변화 하나만 담는다"],
    [b("변형군 (Variant)"), "실험에서 비교하는 각각의 사용자 경험", "A와 B를 모두 포함. A/B/n은 대조군 하나 + 실험군 여럿"],
    [b("무작위 배정 단위"), "변형군에 무작위로 배정되는 단위", "주로 사용자. 페이지·세션·사용일도 가능"],
    [b("OEC"), "실험 성공을 판단하는 전체 평가 기준", "위키 03편에서 자세히"],
    [b("파라미터"), "통제할 수 있는 실험 변수", "요인(factor)이라고도 부른다"],
  ], { x: L, y: 1.95, w: CW, colW: [2.9, 4.2, 4.83], rowH: 0.6, fontSize: 15 });
  T(s, "같은 말: 온라인 통제 실험(Online Controlled Experiment), 분할 테스트, 버킷 테스트, 플라이트",
    { x: L, y: 6.2, w: CW, h: 0.4, fontSize: 14, color: C.text2 });
}
{
  const s = content("Ch1 실험과 인과추론", "Ch1 · A/B 테스트의 정의", "A/B 테스트는 일곱 단계로 돌아간다",
    "위키 01편 3장의 기본 단계입니다. 사용자를 무작위로 서로 다른 변형군에 배정한 뒤 행동을 측정해 지표 차이를 비교합니다. "
    + "50:50은 가장 단순한 예이고 다른 비율도 가능합니다. 각 단계 아래에 오늘 어느 장에서 다루는지 표시했습니다.");
  const steps = [
    ["목표와 지표 설정", "무엇을 개선할지, OEC와 주요 지표", "위키 02·03편"],
    ["가설 설정", "어떤 변화가 어떤 지표를 움직일지", "위키 02편"],
    ["대조군·실험군 설계", "기존 = A, 변경 = B", "위키 01·04편"],
    ["무작위 배정", "같은 사용자는 같은 그룹, 배정은 서로 독립", "위키 04·05편"],
    ["실행과 데이터 수집", "미리 정한 지표를 측정", "위키 09편"],
    ["분석과 비교", "차이가 우연인지 통계적으로 평가", "위키 09·10편"],
    ["결정과 반복", "적용 여부를 정하고, 가설을 고쳐 다음 실험", "위키 09·11편"],
  ];
  const cw = 2.85, gx = 0.17;
  steps.forEach(([h, d, ch], i) => {
    const row = i < 4 ? 0 : 1, col = i < 4 ? i : i - 4;
    const x = L + col * (cw + gx), y = row === 0 ? 2.0 : 4.15;
    T(s, [BR(String(i + 1).padStart(2, "0"), { bold: true, fontSize: 14, color: C.accent1 }),
      BR(h, { bold: true, fontSize: 20 }), BR(d, { fontSize: 14, color: C.text2, paraSpaceAfter: 4 }),
      R(ch, { fontSize: 14, color: C.accent6, bold: true })], { x, y, w: cw - 0.15, h: 1.8 });
  });
}
{
  const s = content("Ch1 실험과 인과추론", "Ch1 · 타당성",
    "이 실험 안에서 맞는가, 밖에서도 통하는가",
    "위키 01편 7장. 내적 타당성은 인과관계의 신뢰성, 외적 타당성은 결과의 일반화 가능성입니다. 둘 중 하나가 항상 더 중요한 건 아닙니다. "
    + "처음 효과를 검증하거나 알고리즘 효과를 정밀하게 잴 때는 내적 타당성이 우선이고, 전체 출시·여러 국가 출시·장기 전략 결정에서는 외적 타당성이 중요해집니다. "
    + "실험을 엄격하게 통제할수록 내적 타당성은 좋아지지만 현실과 멀어질 수 있어서, 단계적으로 확보합니다.");
  const col = (x, head, q, items, color) => T(s, [
    BR(head, { bold: true, fontSize: 20, color }),
    BR(q, { fontSize: 15, paraSpaceAfter: 10 }),
    ...items.map((t, i) => (i < items.length - 1 ? BR(t, { bullet: true }) : R(t, { bullet: true }))),
  ], { x, y: 1.95, w: 5.2, h: 2.4, fontSize: 15, paraSpaceAfter: 4 });
  col(L, "내적 타당성", "관찰된 차이가 정말 처치 때문인가?  → 인과의 신뢰성",
    ["처음으로 효과를 검증할 때 우선", "깨뜨리는 것: SRM, 그룹 간 오염, 한쪽에만 생긴 로깅 변경"], C.accent1);
  vline(s, 6.55, 2.0, 2.3);
  col(6.95, "외적 타당성", "다른 사용자·환경·시점에도 통하나?  → 일반화",
    ["전체 출시·여러 국가 출시·장기 전략에서 중요", "깨뜨리는 것: 특수 시즌, 신규 사용자만, 특정 국가만"], C.accent2);
  // 단계적 확보 흐름
  const flow = ["내적 타당성 확보", "외적 타당성 검토", "다른 집단·국가·기간에서 반복"];
  T(s, "통제를 엄격하게 할수록 내적 타당성 ↑, 현실과의 거리 ↑ → 단계적으로 확보",
    { x: L, y: 4.6, w: CW, h: 0.4, fontSize: 15, color: C.text2 });
  flow.forEach((t, i) => {
    const x = L + i * 4.0;
    T(s, t, { x, y: 5.1, w: 3.4, h: 0.5, fontSize: 20, bold: true, color: i === 0 ? C.accent1 : C.text1 });
    if (i < flow.length - 1) arrow(s, x + 3.35, 5.3, 0.5);
  });
  T(s, [R("실무에서 이렇게 말한다  ", { bold: true, color: C.accent1 }),
    R("\"이번 결과는 10월 둘째 주, 신규 사용자 기준입니다\"")], { x: L, y: 5.95, w: CW, h: 0.45, fontSize: 15 });
}
{
  const s = content("Ch1 실험과 인과추론", "Ch1 · 한계",
    "A/B 테스트가 안 되거나 조심해야 하는 상황",
    "A/B 테스트가 만능은 아닙니다. 짧게 짚고 위키 07·08편의 대응과 대안 설계로 연결합니다.");
  const items = [
    ["윤리·법", "가격 차별, 해로울 수 있는 처치, 동의가 필요한 실험"],
    ["네트워크 효과", "친구·판매자·라이더가 엮여 한 그룹의 처치가 다른 그룹에 번짐"],
    ["표본 부족", "B2B, 저트래픽 서비스처럼 검정력을 확보할 사용자가 없음"],
    ["비교할 두 세계를 만들 수 없음", "M&A처럼 같은 단위를 두 상태로 동시에 운영할 수 없는 결정"],
  ];
  items.forEach(([h, b], i) => {
    const x = L + (i % 2) * 6.1, y = 2.05 + Math.floor(i / 2) * 1.75;
    T(s, String(i + 1).padStart(2, "0"), { x, y, w: 0.9, h: 0.7, fontSize: 30, bold: true, color: C.accent1 });
    T(s, [BR(h, { bold: true, fontSize: 20 }), R(b, { fontSize: 15, color: C.text2 })],
      { x: x + 1.0, y: y + 0.05, w: 4.8, h: 1.3 });
  });
  T(s, [R("위키 07편과 연결  ", { bold: true, color: C.accent1 }), R("클러스터 랜덤화, 스위치백, DID · RDD · Synthetic Control")],
    { x: L, y: 5.75, w: CW, h: 0.5, fontSize: 15 });
}

// ======================================================
// Ch2
// ======================================================
section("Ch2 설계 구성요소", "02", "A/B 테스트 설계의 핵심 구성요소", "문제와 가설, 지표, 단위, 표본, 배정");
{
  const s = content("Ch2 설계 구성요소", "Ch2 · 문제 정의", "현상이 아니라 문제에서 시작한다",
    "위키 02편 1.1. '매출이 떨어졌다'는 관찰된 현상일 뿐 어디를 바꿔야 할지 알려주지 않습니다. "
    + "구체적인 사용자 행동과 지표, 구간, 집단까지 좁혀야 A/B 테스트로 '무엇을 바꿨을 때 이 지표가 얼마나 달라졌나'를 비교할 수 있습니다. 숙소 예약 서비스 예시입니다.");
  const ladder = [
    ["예약이 줄었다", "현상"],
    ["예약 전환이 나빠졌다", ""],
    ["검색 → 예약완료 CVR이 감소했다", ""],
    ["프로모션 채널 유입이 늘어난 뒤 전체 CVR이 나빠졌다", "문제"],
  ];
  ladder.forEach(([t, tag], i) => {
    const y = 2.0 + i * 0.95, last = i === ladder.length - 1;
    T(s, tag, { x: L, y: y + 0.05, w: 0.9, h: 0.4, fontSize: 14, bold: true, color: last ? C.accent1 : C.accent6 });
    T(s, t, { x: L + 1.0 + i * 0.45, y, w: 7.0, h: 0.5, fontSize: last ? 21 : 19, bold: last, color: last ? C.accent1 : C.text1 });
    if (!last) T(s, "↓", { x: L + 1.0 + i * 0.45, y: y + 0.45, w: 0.4, h: 0.45, fontSize: 20, color: C.accent6 });
  });
  T(s, [
    BR("왜 끝까지 좁히나", { bold: true, fontSize: 20, paraSpaceAfter: 6 }),
    BR("A/B는 \"무엇을 바꿨을 때 이 지표가 얼마나 달라졌나\"를 비교", { fontSize: 15, color: C.text2, bullet: true, paraSpaceAfter: 4 }),
    BR("지표·구간까지 좁혀야 바꿀 곳이 보인다", { fontSize: 15, color: C.text2, bullet: true, paraSpaceAfter: 4 }),
    R("엉뚱한 Treatment를 실험하지 않게 된다", { fontSize: 15, color: C.text2, bullet: true }),
  ], { x: 9.2, y: 2.0, w: 3.45, h: 3.4 });
  T(s, "*CVR(Conversion Rate): 전환율", { x: L, y: 6.2, w: 6, h: 0.35, fontSize: 14, color: C.accent6 });
}
{
  const s = content("Ch2 설계 구성요소", "Ch2 · 무엇을 바꿀까", "해결책은 여러 개, 실험에서 바꾸는 건 하나",
    "위키 02편 1.1~1.2. 문제 하나에 해결책은 여러 개일 수 있으니 솔루션 가설을 여러 개 만들어 봅니다. "
    + "다만 실험 처치는 그중 비교 가능한 변화 하나로 정합니다. 할인율, 버튼 색, 추천 영역을 동시에 바꾸면 전환율이 올라도 무엇 때문인지 알 수 없습니다.");
  T(s, [
    BR("문제", { bold: true, fontSize: 14, color: C.accent6 }),
    BR("프로모션으로 들어온 사용자의 재예약률이 낮다", { bold: true, fontSize: 20, paraSpaceAfter: 14 }),
    BR("가능한 솔루션 가설", { bold: true, fontSize: 14, color: C.accent6, paraSpaceAfter: 4 }),
    BR("프로모션 노출 대상을 바꾼다", { bullet: true }),
    BR("프로모션 혜택 구조를 바꾼다", { bullet: true }),
    BR("첫 예약 뒤 재방문 혜택을 준다", { bullet: true }),
    R("특정 세그먼트에만 프로모션을 노출한다", { bullet: true }),
  ], { x: L, y: 1.95, w: 5.4, h: 4.0, fontSize: 15, paraSpaceAfter: 6 });
  vline(s, 6.55, 2.0, 3.9);
  T(s, [
    BR("실험군에서 한 번에 다 바꾸면", { bold: true, fontSize: 20, paraSpaceAfter: 10 }),
    R("할인율 변경", { color: C.accent4, bold: true }), R("  +  "), R("버튼 색 변경", { color: C.accent4, bold: true }),
    R("  +  "), BR("추천 영역 변경", { color: C.accent4, bold: true, paraSpaceAfter: 10 }),
    BR("→ 전환율이 올라도 원인을 모른다", { fontSize: 15, color: C.text2, paraSpaceAfter: 18 }),
    R("대조군과의 차이는 핵심 변화 하나만", { fontSize: 20, bold: true, color: C.accent1 }),
  ], { x: 6.95, y: 1.95, w: 5.7, h: 4.0, fontSize: 15 });
}
{
  const s = content("Ch2 설계 구성요소", "Ch2 · 가설 수립", "가설은 한 문장으로 쓴다",
    "위키 02편 1.3. 가설에는 무엇을 바꾸는지, 왜 그 지표가 움직이는지, 어느 방향으로 변하는지가 들어갑니다. 가능하면 의미 있는 변화 크기(MDE)까지 적습니다. "
    + "Treatment와 지표 사이에 논리적 연결이 있어야 합니다. 버튼 색을 바꾸면서 회사 전체 매출을 주요 결과로 잡으면 효과를 보기 어렵습니다. "
    + "인용: \"실험은 지식에 도달하는 가장 덜 오만한 방법이다\" (아이작 아시모프).");
  const slot = (t, c) => R(t, { bold: true, color: c });
  T(s, [slot("[대상]", C.accent1), R("에게 "), slot("[Treatment]", C.accent2), R("를 적용하면, "),
    slot("[이유]", C.accent5), R(" 때문에 "), slot("[Metric]", C.accent1), R("이 "), slot("[방향]", C.accent2),
    R("으로 변할 것이다")], { x: L, y: 1.95, w: CW, h: 0.6, fontSize: 20 });
  T(s, "+ 가능하면 얼마나 변할지(의미 있는 변화 크기)까지", { x: L, y: 2.6, w: CW, h: 0.4, fontSize: 15, color: C.text2 });
  const chain = ["Treatment", "사용자 행동 변화", "Metric 변화"];
  chain.forEach((t, i) => {
    const x = L + i * 3.4;
    T(s, t, { x, y: 3.35, w: 2.8, h: 0.5, fontSize: 20, bold: true, color: i === 1 ? C.accent5 : C.accent1 });
    if (i < chain.length - 1) arrow(s, x + 2.5, 3.6, 0.7);
  });
  T(s, "이 연결을 설명할 수 있어야 한다", { x: 10.4, y: 3.35, w: 2.3, h: 0.8, fontSize: 14, color: C.text2 });
  T(s, [
    BR("예시 가설", { bold: true, fontSize: 14, color: C.accent3 }),
    slot("재방문 가능성이 높은 사용자", C.accent1), R("에게만 "), slot("프로모션을 노출하면", C.accent2), R(", "),
    slot("저품질 유입 비중이 줄어", C.accent5), R(" "), slot("검색 → 예약완료 CVR", C.accent1), R("이 "),
    slot("증가할 것이다", C.accent2),
  ], { x: L, y: 4.45, w: CW, h: 1.2, fontSize: 20 });
  SRC(s, "위키 02편 1.3~1.4", 6.2);
}
{
  const s = content("Ch2 설계 구성요소", "Ch2 · 좋은 가설의 조건", "틀렸다는 결과도 나올 수 있어야 좋은 가설이다",
    "위키 02편 1.6. 문장 틀을 채웠다고 모두 좋은 가설은 아닙니다. 구체적이고, 측정할 수 있고, 검증과 반증이 가능해야 합니다. "
    + "반증 가능하다는 건 '맞다'뿐 아니라 '틀렸다'는 결과도 나올 수 있다는 뜻입니다.");
  const conds = [
    ["구체적이다", "대상, 변화, 지표가 하나로 특정된다"],
    ["측정할 수 있다", "실험 기간 안에 지표로 잴 수 있다"],
    ["반증할 수 있다", "가설을 버리게 될 결과가 정해져 있다"],
  ];
  conds.forEach(([h, b], i) => {
    const x = L + i * 4.05;
    T(s, String(i + 1).padStart(2, "0"), { x, y: 1.95, w: 1, h: 0.6, fontSize: 30, bold: true, color: C.accent1 });
    T(s, [BR(h, { bold: true, fontSize: 20 }), R(b, { fontSize: 15, color: C.text2 })], { x, y: 2.6, w: 3.7, h: 1.2 });
  });
  T(s, [
    BR("나쁜 예", { bold: true, fontSize: 14, color: C.accent4 }),
    R("\"장바구니 UI를 개선하면 지표가 좋아질 것이다\"", { fontSize: 20 }),
  ], { x: L, y: 4.15, w: 6.2, h: 1.0 });
  T(s, "대상·이유·지표가 없음 → 어떤 결과로도 '틀렸다'고 할 수 없다",
    { x: 7.2, y: 4.5, w: 5.4, h: 0.8, fontSize: 15, color: C.text2 });
  T(s, [R("가설을 쓴 뒤 스스로 묻기  ", { bold: true, color: C.accent1 }),
    R("\"어떤 결과가 나오면 이 가설을 지지하지 않을 것인가?\"")], { x: L, y: 5.6, w: CW, h: 0.5, fontSize: 20 });
}
{
  const s = content("Ch2 설계 구성요소", "Ch2 · 제품 가설에서 통계적 가설로", "제품 가설을 통계적 가설로 바꾼다",
    "위키 02편 1.4~1.5. 제품 가설은 '이 변화를 적용하면 어떤 결과가 나타날까'에 답하고, 통계적 가설은 '관찰된 차이가 우연이라 보기 어려울 만큼 큰가'에 답합니다. "
    + "효과가 없다는 가정부터 하는 이유는, 귀무가설을 임시로 참이라고 두고 그 아래에서 관측 데이터가 얼마나 드문지를 재기 위해서입니다.");
  T(s, [BR("제품 가설", { bold: true, fontSize: 15, color: C.text2 }),
    R("\"이 변화를 적용하면 어떤 결과가 나타날까?\"", { fontSize: 20 })], { x: L, y: 1.95, w: 5.5, h: 0.9 });
  arrow(s, 6.0, 2.45, 0.7);
  T(s, [BR("통계적 가설", { bold: true, fontSize: 15, color: C.accent1 }),
    R("\"관찰된 차이가 우연이라 보기 어려울 만큼 큰가?\"", { fontSize: 20 })], { x: 6.95, y: 1.95, w: 5.7, h: 0.9 });
  T(s, [
    BR("양측검정", { bold: true, fontSize: 20, color: C.accent1, paraSpaceAfter: 6 }),
    BR("H0 :  p_T = p_C", { fontSize: 20 }), BR("H1 :  p_T ≠ p_C", { fontSize: 20, paraSpaceAfter: 6 }),
    R("올라도 내려가도 차이로 본다. α를 양쪽 꼬리에 나눈다", { fontSize: 14, color: C.text2 }),
  ], { x: L, y: 3.3, w: 5.5, h: 2.0 });
  vline(s, 6.55, 3.35, 1.9);
  T(s, [
    BR("단측검정", { bold: true, fontSize: 20, color: C.accent5, paraSpaceAfter: 6 }),
    BR("H0 :  p_T ≤ p_C", { fontSize: 20 }), BR("H1 :  p_T > p_C", { fontSize: 20, paraSpaceAfter: 6 }),
    R("한 방향만 본다. 같은 표본이면 그 방향의 검정력이 더 높다", { fontSize: 14, color: C.text2 }),
  ], { x: 6.95, y: 3.3, w: 5.7, h: 2.0 });
  T(s, [R("왜 '효과 없음'부터 가정하나  ", { bold: true, color: C.accent1 }),
    R("H0를 참이라 두고 → 지금 데이터가 얼마나 드문지 잰다")], { x: L, y: 5.65, w: CW, h: 0.5, fontSize: 15 });
}
{
  const s = content("Ch2 설계 구성요소", "Ch2 · 단측검정 vs 양측검정", "단측검정은 결과를 보기 전에 정한다",
    "위키 02편 1.5. 실험 전에 '증가만 본다'고 정했다면 Z > 1.645일 때만 유의합니다. 그런데 결과를 보고 방향을 고르면 Z > 1.645든 Z < -1.645든 유의하다고 선언하게 되어 "
    + "실제로는 양쪽 5%씩, 10%의 확률로 잘못된 성공을 선언합니다. 단측 옹호(Analytics-Toolkit)와 양측 기본(Statsig) 의견이 갈리지만, 둘 다 결과를 보기 전에 정해야 한다는 전제는 같습니다.");
  // 표준정규 곡선을 직접 그린다 (custGeom): 꼬리 영역만 색칠
  const gx = L, gy = 2.3, gw = 6.6, gh = 2.6;
  const pdf = (z) => Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
  const P = (z) => ({ x: ((z + 4) / 8) * gw, y: gh - (pdf(z) / 0.42) * gh });
  const zs = (a, b) => Array.from({ length: Math.round((b - a) / 0.05) + 1 }, (_, i) => a + i * 0.05);
  const area = (a, b, color, name) => s.addShape(pres.ShapeType.custGeom, { x: gx, y: gy, w: gw, h: gh,
    fill: { color }, line: { color, width: 0 }, objectName: name,
    points: [{ x: P(a).x, y: gh }, ...zs(a, b).map(P), { x: P(b).x, y: gh }, { close: true }] });
  area(-4, 4, HEX.line, "Z 분포");
  area(1.645, 4, HEX.blue, "미리 정한 방향 5%");
  area(-4, -1.645, HEX.neg, "사후에 연 반대 방향 5%");
  s.addShape(pres.ShapeType.line, { x: gx, y: gy + gh, w: gw, h: 0, line: { color: HEX.ink3, width: 1 } });
  [[-1.645, "-1.645"], [0, "0"], [1.645, "+1.645"]].forEach(([z, t]) =>
    T(s, t, { x: gx + P(z).x - 0.6, y: gy + gh + 0.08, w: 1.2, h: 0.3, fontSize: 14, color: C.text2, align: "center" }));
  T(s, [R("■ ", { color: C.accent1 }), R("미리 정한 방향  5%      "), R("■ ", { color: C.accent4 }), R("결과 보고 연 반대 방향  +5%")],
    { x: gx, y: gy + gh + 0.5, w: gw, h: 0.35, fontSize: 14, color: C.text2 });
  T(s, "단측(α 5%)으로 정했는데 결과를 보고 방향을 고르면", { x: gx, y: 1.9, w: gw, h: 0.35, fontSize: 14, bold: true });
  T(s, [
    BR("5% → 10%", { bold: true, fontSize: 54, color: C.accent4 }),
    BR("결과를 보고 방향을 고를 때 실제 1종 오류율", { fontSize: 15, color: C.text2, paraSpaceAfter: 16 }),
    BR("두 관점", { bold: true, fontSize: 15, paraSpaceAfter: 4 }),
    BR("단측 옹호: 관심은 대부분 '좋아졌나' 한 방향", { bullet: true, fontSize: 14 }),
    BR("양측 기본: 단측은 반대 방향 변화를 못 잡는다", { bullet: true, fontSize: 14, paraSpaceAfter: 10 }),
    R("공통점: 검정 방식은 결과를 보기 전에 정한다", { bold: true, fontSize: 15, color: C.accent1 }),
  ], { x: 7.9, y: 1.95, w: 4.75, h: 4.4 });
  SRC(s, "참고: blog.analytics-toolkit.com/?p=760 · docs.statsig.com/stats-engine/one-sided-test · 위키 02편 1.5");
}
{
  const s = content("Ch2 설계 구성요소", "Ch2 · 비열등성 검정", "'나빠지지 않았다'는 비열등성 검정으로 말한다",
    "우월성 검정에서 '유의한 차이 없음'은 '같다'는 증거가 아닙니다. 표본이 작아도 차이 없음이 나옵니다. "
    + "발송량을 줄이거나 비용·속도를 개선하는 실험처럼 이 지표는 지키기만 하면 되는 경우, 허용할 손실(마진)을 실험 전에 정하고 "
    + "신뢰구간 하한이 마진보다 위에 있는지 확인합니다. 그림은 교육용 예시입니다.");
  T(s, [
    BR("H0 :  Δ ≤ -마진", { fontSize: 20 }), BR("H1 :  Δ > -마진", { fontSize: 20, paraSpaceAfter: 8 }),
    R("마진 안쪽 손실까지는 '나빠지지 않았다'고 본다", { fontSize: 14, color: C.text2 }),
  ], { x: L, y: 1.95, w: 4.2, h: 1.5 });
  T(s, [
    BR("언제 쓰나", { bold: true, fontSize: 15, paraSpaceAfter: 4 }),
    R("발송량 축소, 비용 절감, 속도 개선처럼 주 목적은 다른 곳에 있고 이 지표는 지키기만 하면 될 때", { fontSize: 15, color: C.text2 }),
  ], { x: 5.4, y: 1.95, w: 7.25, h: 1.4 });
  // 마진과 CI 비교: -3 ~ +2 %
  const px = 3.4, pw = 6.0, lo = -3, hi = 2;
  const X = (v) => px + ((v - lo) / (hi - lo)) * pw;
  const y0 = 3.95, rh = 0.85;
  s.addShape(pres.ShapeType.line, { x: X(0), y: y0 - 0.3, w: 0, h: rh * 2 + 0.1, line: { color: HEX.ink3, width: 1, dashType: "dash" } });
  s.addShape(pres.ShapeType.line, { x: X(-1), y: y0 - 0.3, w: 0, h: rh * 2 + 0.1, line: { color: HEX.neg, width: 1.5, dashType: "dash" } });
  T(s, "마진 -1%", { x: X(-1) - 0.6, y: y0 - 0.65, w: 1.2, h: 0.3, fontSize: 14, bold: true, color: C.accent4, align: "center" });
  [-3, -2, -1, 0, 1, 2].forEach((v) => T(s, `${v > 0 ? "+" : ""}${v}%`,
    { x: X(v) - 0.5, y: y0 + rh * 2 - 0.15, w: 1.0, h: 0.3, fontSize: 14, color: C.text2, align: "center" }));
  [["결과 1", -0.2, -0.7, 0.3, HEX.pos, "구간 하한이 마진 위 → 비열등 통과"],
    ["결과 2", -0.2, -1.6, 1.2, HEX.warn, "하한이 마진 아래 → 판단 불가, 표본 부족"]].forEach(([n, e, l, h, color, note], i) => {
    const y = y0 + i * rh;
    T(s, n, { x: L, y: y - 0.17, w: 2.4, h: 0.4, fontSize: 15, bold: true });
    s.addShape(pres.ShapeType.line, { x: X(l), y: y + 0.03, w: X(h) - X(l), h: 0, line: { color, width: 4 } });
    dot(s, X(e) - 0.11, y - 0.08, 0.22, color);
    T(s, note, { x: 9.7, y: y - 0.15, w: 3.0, h: 0.6, fontSize: 14, color: C.text2 });
  });
  T(s, [R("둘 다 우월성 검정으로는 '차이 없음'  ", { bold: true, color: C.accent1 }),
    R("→ \"나빠지지 않았다\"는 결과 1만 가능 · 마진은 실험 전에 비즈니스와 합의")],
  { x: L, y: 6.1, w: CW, h: 0.6, fontSize: 15 });
}
{
  const s = content("Ch2 설계 구성요소", "Ch2 · 지표 설계", "지표는 층으로 설계하고, 순서대로 읽는다",
    "위키 03편. 지표는 OEC(전체 평가 기준), Primary(가설의 핵심 효과), Secondary·Driver(왜 움직였나), Guardrail(부작용은 없나)로 나눕니다. "
    + "결과도 이 순서로 읽습니다. 예시는 위키의 개인화 추천 실험입니다. 인용: \"측정할 수 없으면 개선할 수 없다\" (피터 드러커).");
  T(s, [R("가설  ", { bold: true, color: C.accent6 }),
    R("개인화 추천을 적용하면 원하는 숙소를 더 쉽게 찾아 예약완료율이 오를 것이다")], { x: L, y: 1.9, w: CW, h: 0.4, fontSize: 15 });
  const layers = [
    ["OEC", "실험 전체가 좋은 변화인지 판단하는 기준", "사용자당 예약 수", C.accent1],
    ["Primary", "가설의 핵심 효과를 대표하는 지표", "검색 → 예약완료 CVR", C.accent1],
    ["Secondary · Driver", "또 무엇이 변했나, 왜 움직였나", "추천 CTR, 상세페이지 도달률", C.text2],
    ["Guardrail", "넘으면 안 되는 침범 금지선", "취소율, 오류율", C.accent4],
  ];
  layers.forEach(([h, d, ex, color], i) => {
    const y = 2.55 + i * 0.75;
    T(s, h, { x: L + i * 0.3, y, w: 2.9, h: 0.5, fontSize: 20, bold: true, color });
    T(s, d, { x: 4.2, y: y + 0.03, w: 4.8, h: 0.5, fontSize: 15 });
    T(s, ex, { x: 9.3, y: y + 0.03, w: 3.4, h: 0.5, fontSize: 15, color: C.text2 });
  });
  const read = [["① Primary", "핵심 가설은 지지되는가?"], ["② Secondary · Driver", "왜 그런 결과가 나왔나?"], ["③ Guardrail", "부작용은 없는가?"]];
  T(s, "결과는 이 순서로 읽는다", { x: L, y: 5.65, w: 3, h: 0.35, fontSize: 14, bold: true, color: C.accent6 });
  read.forEach(([h, q], i) => {
    const x = L + i * 4.05;
    T(s, [BR(h, { bold: true, color: C.accent1 }), R(q)], { x, y: 5.95, w: 3.4, h: 0.75, fontSize: 15 });
    if (i < read.length - 1) arrow(s, x + 3.4, 6.1, 0.5);
  });
}
{
  const s = content("Ch2 설계 구성요소", "Ch2 · OEC", "좋은 OEC는 지금 잴 수 있고, 장기 목표를 가리킨다",
    "위키 03편 2.1. 단기 지표(CTR, 체류 시간, 페이지뷰)의 개선이 장기 성공과 항상 같은 방향은 아닙니다. 가격을 올리면 단기 수익은 쉽게 오르지만 장기적으로 이탈로 이어질 수 있습니다. "
    + "장기 가치와 연결될 것 같은 단기 지표를 후보로 삼되, '연결될 것 같다'와 '실제로 연결된다'는 다르므로 리서치·상관 분석·실험으로 검증합니다.");
  const cols = [
    ["실험 기간 안에 측정되고, 민감하다", ["2주 실험인데 성공 여부를 3년 뒤에 안다면 쓸 수 없다", "노이즈에 묻혀 변화가 안 보이면 아무것도 판단할 수 없다"]],
    ["제품의 장기 목표와 연결된다", ["가격 인상 → 단기 수익은 오르지만 장기 이탈로 이어질 수 있다", "후보: 재방문율, 반복 구매, 사용자당 활동일 수", "연결은 리서치·상관 분석·실험으로 검증한다"]],
  ];
  cols.forEach(([h, items], i) => {
    const x = L + i * 6.25;
    T(s, String(i + 1).padStart(2, "0"), { x, y: 1.95, w: 1, h: 0.6, fontSize: 30, bold: true, color: C.accent1 });
    T(s, [BR(h, { bold: true, fontSize: 20, paraSpaceAfter: 8 }),
      ...items.map((t, j) => (j < items.length - 1 ? BR(t, { bullet: true }) : R(t, { bullet: true })))],
    { x, y: 2.6, w: 5.6, h: 2.5, fontSize: 15, paraSpaceAfter: 6 });
  });
  vline(s, 6.55, 2.0, 3.0);
  T(s, [R("OEC는 하나여야 하나?  ", { bold: true, color: C.accent1 }),
    R("가능하면 하나. 품질·사용량·광고 수익처럼 균형이 필요하면 실험 전에 정한 가중치로 조합")],
  { x: L, y: 5.4, w: CW, h: 0.6, fontSize: 15 });
}
{
  const s = content("Ch2 설계 구성요소", "Ch2 · OEC와 North Star Metric", "노스스타는 방향을, OEC는 이번 실험을 판단한다",
    "위키 03편 2.1.2. NSM은 그로스 쪽, OEC는 온라인 실험 쪽에서 나온 용어라 'NSM → OEC' 같은 공식 위계는 없습니다. "
    + "다만 좋은 OEC는 장기 목표와 연결되어야 하므로 자연스럽게 노스스타와 방향이 맞습니다. 그로스 세션과 이어지는 지점입니다.");
  const b = (t) => ({ text: t, options: { bold: true } });
  table(s, ["", "North Star Metric", "OEC"], [
    [b("핵심 질문"), "제품이 어떤 핵심 가치를 계속 만들어야 하나?", "이 실험이 전체적으로 좋은 변화인가?"],
    [b("적용 범위"), "제품 · 조직", "개별 실험"],
    [b("역할"), "여러 팀의 장기 방향을 정렬한다", "Treatment의 성공 여부를 판단한다"],
    [b("측정 조건"), "핵심 사용자 가치를 대표한다", "실험 기간 안에 충분히 측정된다"],
    [b("장기 목표와의 관계"), "장기 목표 자체를 대표한다", "장기 목표를 예측·추진할 수 있어야 한다"],
  ], { x: L, y: 1.95, w: CW, colW: [2.6, 4.7, 4.63], rowH: 0.62, fontSize: 15 });
  T(s, [R("← 그로스 세션 노스스타  ", { bold: true, color: C.accent1 }),
    R("노스스타가 '어느 방향으로 갈까'를 정하면, OEC는 '이번 실험이 그 방향으로 움직였나'를 판단합니다")],
  { x: L, y: 6.0, w: CW, h: 0.6, fontSize: 15 });
}
{
  const s = content("Ch2 설계 구성요소", "Ch2 · Primary Metric", "Primary는 정의까지 정해야 쓸 수 있다",
    "위키 03편 2.2. Primary는 Treatment에 가까울수록 민감하지만 사용자 가치와 멀어지고(추천 CTR), 멀수록 중요하지만 실험 기간 안에 안 움직입니다(LTV). "
    + "그 사이에서 고르고, '전환율'이라고만 하지 말고 분자·분모·집계 단위·기간까지 정합니다. 표의 정의 값은 예시입니다.");
  // 가까움 ↔ 멂 스펙트럼
  const sx = L + 0.1, sw = 11.6, sy = 2.25;
  s.addShape(pres.ShapeType.line, { x: sx, y: sy, w: sw, h: 0, line: { color: HEX.line, width: 3 } });
  [["추천 CTR", "가깝다 · 민감하지만 가치와 멀 수 있다", 0, HEX.ink3],
    ["검색 → 예약완료 CVR", "영향을 반영하면서 가치와도 가깝다", 0.5, HEX.blue],
    ["LTV", "중요하지만 실험 기간 안에 잘 안 움직인다", 1, HEX.ink3]].forEach(([t, d, p, color]) => {
    const cx = sx + p * sw;
    dot(s, cx - 0.12, sy - 0.12, 0.24, color);
    const w = 3.6, x = Math.min(Math.max(cx - w / 2, L), L + CW - w);
    T(s, [BR(t, { bold: true, fontSize: 15, color: color === HEX.blue ? C.accent1 : C.text1 }), R(d, { fontSize: 14, color: C.text2 })],
      { x, y: sy + 0.25, w, h: 0.8, align: p === 0 ? "left" : p === 1 ? "right" : "center" });
  });
  table(s, ["요소", "질문", "예: 예약완료 CVR"], [
    [{ text: "분자", options: { bold: true } }, "무엇을 성공 행동으로 볼까?", "예약을 완료한 사용자"],
    [{ text: "분모", options: { bold: true } }, "누구를 비교 대상으로 볼까?", "검색한 사용자"],
    [{ text: "집계 단위", options: { bold: true } }, "User / Session / Event?", "User"],
    [{ text: "기간", options: { bold: true } }, "언제까지 일어나야 전환인가?", "검색 후 7일 안"],
  ], { x: L, y: 3.55, w: 7.4, colW: [1.5, 3.3, 2.6], rowH: 0.5, fontSize: 14, headSize: 14 });
  T(s, [
    BR("좋은 Primary의 조건", { bold: true, fontSize: 15, paraSpaceAfter: 4 }),
    BR("가설과 직접 연결된다", { bullet: true }), BR("결과를 보기 전에 정한다", { bullet: true }),
    BR("실험 기간 안에 측정된다", { bullet: true }), BR("Treatment에 민감하고 노이즈가 작다", { bullet: true }),
    BR("분자·분모·단위·기간이 명확하다", { bullet: true }), BR("올라가면 좋은지 해석 방향이 분명하다", { bullet: true }),
    R("숫자만 올리는 쉬운 꼼수가 없다", { bullet: true }),
  ], { x: 8.5, y: 3.5, w: 4.15, h: 3.0, fontSize: 14, paraSpaceAfter: 2 });
}
{
  const s = content("Ch2 설계 구성요소", "Ch2 · Secondary · Driver Metric", "Driver 지표는 Primary가 움직인 경로를 보여준다",
    "위키 03편 2.3. 구매전환율이 10.0%에서 10.8%로 올랐다면 효과가 있다는 건 알지만 왜인지는 모릅니다. Secondary는 또 무엇이 변했는지, "
    + "그중 Driver는 Primary를 움직인 경로를 보여줍니다. 단, Driver는 메커니즘을 진단하는 지표일 뿐 중간 단계의 인과를 증명하지는 않습니다. "
    + "Secondary를 너무 많이 보면 다중검정 문제가 생기므로 가설의 메커니즘에 따라 미리 고릅니다.");
  const chain = [["Treatment", "개인화 추천 적용"], ["Driver", "추천 CTR"], ["Driver", "상세페이지 도달률"],
    ["Driver", "장바구니 추가율"], ["Primary", "구매전환율"]];
  const cw = 2.15, gx = 0.31;
  chain.forEach(([tag, t], i) => {
    const x = L + i * (cw + gx);
    const color = tag === "Primary" ? C.accent1 : tag === "Driver" ? C.accent2 : C.text2;
    T(s, [BR(tag, { bold: true, fontSize: 14, color }), R(t, { bold: true, fontSize: 15 })], { x, y: 1.95, w: cw, h: 0.9 });
    if (i < chain.length - 1) arrow(s, x + cw - 0.15, 2.55, 0.4);
  });
  const b = (t) => ({ text: t, options: { bold: true } });
  table(s, ["", "Secondary", "Driver"], [
    [b("핵심 질문"), "또 어떤 변화가 있었나?", "왜 Primary가 움직였나?"],
    [b("역할"), "보조 Outcome", "메커니즘 설명"],
    [b("예"), "평균 주문액, 세션 시간", "추천 CTR, 상세 조회율"],
  ], { x: L, y: 3.25, w: 7.6, colW: [1.8, 2.9, 2.9], rowH: 0.5, fontSize: 15 });
  T(s, [
    BR("주의 1", { bold: true, fontSize: 15, color: C.accent4 }),
    BR("Driver는 진단용입니다. 중간 단계의 인과를 증명하지 않습니다", { fontSize: 15, paraSpaceAfter: 12 }),
    BR("주의 2", { bold: true, fontSize: 15, color: C.accent4 }),
    R("Secondary가 많을수록 우연히 '유의'가 나옵니다. 메커니즘에 따라 미리 고릅니다", { fontSize: 15 }),
  ], { x: 8.7, y: 3.25, w: 3.95, h: 2.8 });
}
{
  const s = content("Ch2 설계 구성요소", "Ch2 · 비율 지표", "CTR이 올랐다: 더 눌러서인가, 덜 보여줘서인가",
    "처치가 비율 지표의 분모를 바꾸면, 분자가 그대로여도 비율이 오릅니다. 예시는 반응 낮은 추천 노출을 줄인 실험(교육용 가상 수치)입니다. "
    + "CTR은 12%에서 15.3%로 올랐지만 클릭 수는 오히려 줄었습니다. 분자와 분모를 사용자 단위로 따로 보고(인당 클릭, 인당 노출), "
    + "분석 단위가 배정 단위와 다르면 Delta Method로 분산을 계산합니다.");
  const b = (t, color) => ({ text: t, options: { bold: true, color: color || HEX.ink } });
  table(s, ["", "노출 (분모)", "클릭 (분자)", "CTR"], [
    [b("A 대조군"), "100", "12.0", b("12.0%")],
    [b("B 실험군"), "75", "11.5", b("15.3%", HEX.blue)],
    [b("변화"), b("-25%", HEX.warn), b("-4%", HEX.neg), b("+3.3%p", HEX.blue)],
  ], { x: L, y: 2.0, w: 7.0, colW: [1.9, 1.7, 1.7, 1.7], rowH: 0.6, fontSize: 20 });
  T(s, "사용자 1명당 · 반응이 낮던 노출 25개를 뺀 경우 (교육용 예시)", { x: L, y: 4.5, w: 7, h: 0.35, fontSize: 14, color: C.accent6 });
  T(s, [
    BR("CTR 변화 = 두 효과의 합", { bold: true, fontSize: 20, paraSpaceAfter: 8 }),
    R("구성 효과  ", { bold: true, color: C.accent5 }), BR("원래 안 누르던 노출이 분모에서 빠짐", { paraSpaceAfter: 6 }),
    R("행동 효과  ", { bold: true, color: C.accent1 }), BR("남은 노출에 실제로 더 반응함", { paraSpaceAfter: 14 }),
    BR("처방", { bold: true, fontSize: 15 }),
    BR("분자·분모를 따로 지표로 둔다 (인당 클릭, 인당 노출)", { bullet: true, fontSize: 15 }),
    R("배정은 사용자, 분석은 노출 단위면 Delta Method", { bullet: true, fontSize: 15 }),
  ], { x: 8.2, y: 2.0, w: 4.45, h: 4.3, fontSize: 15 });
  T(s, [R("실무에서 이렇게 말한다  ", { bold: true, color: C.accent1 }),
    R("\"CTR은 올랐지만 인당 클릭은 줄었습니다. 덜 보여줘서 오른 것입니다\"")], { x: L, y: 5.4, w: 7.2, h: 0.8, fontSize: 15 });
}
{
  const s = content("Ch2 설계 구성요소", "Ch2 · Guardrail Metric", "가드레일은 개선 대상이 아니라 침범 금지선이다",
    "위키 03편 2.4. 모든 지표를 가드레일로 두는 게 아니라, 이번 Treatment가 부작용을 낼 만한 핵심 영역을 고릅니다. "
    + "실험이 제대로 돌았는지 보는 신뢰성 가드레일(SRM, 로그 누락)은 위키 09·10편에서 다룹니다.");
  const groups = [
    ["사용자 경험", ["이탈률", "앱 삭제율", "알림 차단율"], C.accent4],
    ["제품 안정성", ["오류율", "Crash Rate", "페이지 로딩 시간"], C.accent5],
    ["비즈니스 안정성", ["매출, 평균 주문 금액", "취소율", "환불률"], C.accent1],
    ["장기 가치", ["재방문율", "재구매율"], C.accent2],
  ];
  groups.forEach(([h, items, color], i) => {
    const x = L + i * 3.05;
    T(s, [BR(h, { bold: true, fontSize: 20, color, paraSpaceAfter: 8 }),
      ...items.map((t, j) => (j < items.length - 1 ? BR(t, { bullet: true }) : R(t, { bullet: true })))],
    { x, y: 2.0, w: 2.8, h: 2.3, fontSize: 15, paraSpaceAfter: 6 });
  });
  T(s, [R("고르는 기준  ", { bold: true, color: C.accent1 }),
    R("이번 Treatment가 부작용을 낼 만한 영역만 둡니다. 신뢰성 가드레일(SRM, 로그 누락)은 위키 09·10편에서 다룹니다")],
  { x: L, y: 4.75, w: CW, h: 0.7, fontSize: 15 });
  T(s, [R("실무에서 이렇게 말한다  ", { bold: true, color: C.accent1 }),
    R("\"전환율은 올랐지만 로딩 시간이 200ms 늘어서 배포는 보류합니다\"")], { x: L, y: 5.7, w: CW, h: 0.5, fontSize: 15 });
}
{
  const s = content("Ch2 설계 구성요소", "Ch2 · Goodhart's Law", "지표는 목표가 아니라 가치를 대신 재는 숫자다",
    "위키 03편 2.5. 찰스 굿하트(LSE)가 제시한 개념입니다. 지표 자체가 나쁘다는 뜻이 아니라, 우리가 재는 지표는 대부분 진짜 원하는 가치를 대신 재는 proxy라는 점입니다. "
    + "'무조건 CTR을 최대화하자'가 목표가 되면 CTR은 좋아져도 CTR이 대변하던 사용자 가치는 나빠질 수 있습니다.");
  T(s, "\"어떤 지표가 목표가 되면, 그것은 더 이상 좋은 지표가 아니게 된다.\"",
    { x: L, y: 1.95, w: CW, h: 0.6, fontSize: 20, italic: true });
  T(s, "Goodhart's Law · 찰스 굿하트", { x: L, y: 2.6, w: 6, h: 0.35, fontSize: 14, color: C.accent6 });
  T(s, [R("CTR ↑", { bold: true, color: C.accent1 })], { x: L, y: 3.4, w: 3.2, h: 1.0, fontSize: 54 });
  T(s, [R("사용자 가치 ↓", { bold: true, color: C.accent4 })], { x: 3.9, y: 3.4, w: 4.8, h: 1.0, fontSize: 54 });
  T(s, "\"무조건 CTR 최대화\" → 숫자는 오르는데 그 숫자가 대변하던 가치는 떨어질 수 있다",
    { x: L, y: 4.45, w: 8.0, h: 0.8, fontSize: 15, color: C.text2 });
  T(s, [
    BR("지표는 proxy", { bold: true, fontSize: 20, paraSpaceAfter: 4 }),
    BR("진짜 가치를 대신 재는 숫자", { fontSize: 15, color: C.text2, paraSpaceAfter: 14 }),
    BR("유의성의 한계", { bold: true, fontSize: 20, paraSpaceAfter: 4 }),
    R("유의하다 ≠ 지표를 잘 골랐다", { fontSize: 15, color: C.text2 }),
  ], { x: 9.2, y: 3.35, w: 3.45, h: 2.8 });
}
{
  const s = content("Ch2 설계 구성요소", "Ch2 · 사전 정의", "지표와 판단 기준은 실험 전에 적어 둔다",
    "위키 03편 2.6. 결과를 본 뒤 지표를 고르면 우연히 좋아 보이는 결과를 성공으로 해석할 위험이 있습니다. Secondary에서 흥미로운 결과가 나와도 Primary를 바꾸지 않습니다. "
    + "판단 규칙과 trade-off도 미리 정해야 일관된 결정을 할 수 있습니다. 사후에 발견한 패턴은 탐색적 결과로 구분합니다.");
  T(s, [
    BR("실험 전에 적어 둘 것", { bold: true, fontSize: 14, color: C.accent6, paraSpaceAfter: 8 }),
    R("가설  ", { bold: true }), BR("개인화 추천이 예약전환율을 높인다", { paraSpaceAfter: 6 }),
    R("Primary  ", { bold: true, color: C.accent1 }), BR("검색 → 예약완료 CVR", { paraSpaceAfter: 6 }),
    R("Secondary  ", { bold: true, color: C.accent2 }), BR("추천 CTR, 상세페이지 도달률", { paraSpaceAfter: 6 }),
    R("Guardrail  ", { bold: true, color: C.accent4 }), R("취소율, 오류율"),
  ], { x: L, y: 1.95, w: 5.2, h: 2.6, fontSize: 15 });
  vline(s, 6.2, 2.0, 2.6);
  const rules = [
    ["모두 중립 이상, 하나 이상 유의하게 긍정", "변경을 고려", C.accent3],
    ["모두 중립 이하, 하나 이상 유의하게 부정", "변경하지 않음", C.accent4],
    ["모두 뚜렷한 변화 없음", "검정력 확보 또는 방향 전환", C.accent5],
    ["일부 긍정, 일부 부정", "미리 정한 trade-off로 판단", C.accent1],
  ];
  T(s, "핵심 지표가 여러 개일 때 판단 규칙", { x: 6.6, y: 1.95, w: 6, h: 0.35, fontSize: 14, bold: true, color: C.accent6 });
  rules.forEach(([cond, out, color], i) => {
    const y = 2.4 + i * 0.55;
    T(s, cond, { x: 6.6, y, w: 3.8, h: 0.5, fontSize: 14 });
    T(s, out, { x: 10.45, y, w: 2.2, h: 0.5, fontSize: 14, bold: true, color });
  });
  T(s, [R("trade-off도 미리  ", { bold: true, color: C.accent1 }),
    R("구매전환율 +4%, 취소율 +15%라면? → \"취소율이 X 이상 나빠지면 배포 안 함\"을 실험 전에")],
  { x: L, y: 4.95, w: CW, h: 0.8, fontSize: 15 });
  T(s, "다른 지표를 보지 말라는 게 아니다 · 나중에 찾은 패턴은 탐색적 결과로 구분",
    { x: L, y: 5.85, w: CW, h: 0.4, fontSize: 14, color: C.text2 });
}
{
  const s = content("Ch2 설계 구성요소", "Ch2 · 대조군·실험군과 대표성", "실험 대상은 출시 대상을 닮아야 한다",
    "랜덤 배정은 두 그룹을 서로 비슷하게 만들지만, 실험에 들어온 사람 전체가 실제 출시 대상을 대표하는지는 별개의 문제입니다. "
    + "이것이 위키 01편의 외적 타당성과 이어집니다.");
  // 점: 출시 대상 vs 실험 대상 (일부만)
  seed = 11;
  const gap = 0.3;
  for (let i = 0; i < 80; i++) {
    const c = i % 10, r = Math.floor(i / 10);
    const inExp = c < 4 && r < 6;
    dot(s, L + c * gap, 2.1 + r * gap, 0.15, inExp ? HEX.blue : "D5D9E6");
  }
  T(s, [R("●", { color: C.accent1 }), R(" 실험에 들어온 사용자   "), R("●", { color: "D5D9E6" }), R(" 실제 출시 대상")],
    { x: L, y: 4.65, w: 4.5, h: 0.4, fontSize: 14, color: C.text2 });
  T(s, [
    BR("실험 전에 확인할 질문", { bold: true, fontSize: 20, paraSpaceAfter: 10 }),
    BR("기간: 주중만 돌리고 주말 사용자를 빼지 않았나?", { bullet: true }),
    BR("플랫폼: iOS에서만 노출되지 않았나?", { bullet: true }),
    BR("사용자: 신규 사용자만 들어오지 않았나?", { bullet: true }),
    R("대조군: 기존 경험 그대로인가? (다른 실험이 섞이지 않았나)", { bullet: true }),
  ], { x: 4.6, y: 2.05, w: 8.0, h: 3.0, fontSize: 15, paraSpaceAfter: 8 });
  T(s, [R("실무에서 이렇게 말한다  ", { bold: true, color: C.accent1 }),
    R("\"이번 실험은 앱 사용자만 대상이라 웹에는 따로 확인이 필요합니다\"")], { x: L, y: 5.65, w: CW, h: 0.5, fontSize: 15 });
}
{
  const s = content("Ch2 설계 구성요소", "Ch2 · 실험 단위", "사용자 단위에서 시작하고, 다른 단위는 이유를 댄다",
    "위키 04편. Experimental Unit은 처치를 독립적으로 받는 단위, Randomization Unit은 무작위 배정이 일어나는 단위이고 온라인 실험에서는 보통 같습니다. "
    + "세션 단위를 쓸지는 '이 변화를 본 사용자가 다음 방문에서 행동이 달라질까(이월 효과)'로 판단합니다. 페이지·요청 단위는 응답 속도처럼 요청 하나의 성능을 볼 때 쓰고, "
    + "지표도 같은 단위로 두며, 같은 사용자 관측끼리 닮아 있어 독립으로 계산하면 불확실성이 과소평가됩니다. Microsoft 실험 대부분은 사용자 단위입니다.");
  T(s, [R("Experimental Unit", { bold: true }), R(" 처치를 독립적으로 받는 단위   "),
    R("Randomization Unit", { bold: true }), R(" 무작위 배정 단위  →  온라인 실험에서는 보통 같다", { color: C.text2 })],
  { x: L, y: 1.9, w: CW, h: 0.4, fontSize: 14 });
  const b = (t) => ({ text: t, options: { bold: true } });
  table(s, ["단위", "이럴 때 쓴다", "주의할 점"], [
    [b("사용자 (기본값)"), "일관된 경험, 리텐션·재구매 같은 누적 지표가 중요할 때", "식별자를 계속 유지해야 하고 표본이 느리게 쌓인다"],
    [b("세션"), "본 변화가 다음 방문에 영향을 주지 않을 때 (이월 효과 낮음)", "결론이 '평균적인 세션'에 대한 것. 이월 효과로 차이가 작게 측정된다"],
    [b("페이지 · 요청"), "응답 속도처럼 요청 하나의 성능을 볼 때", "지표도 같은 단위로. 같은 사용자 관측은 닮아 있어 불확실성이 과소평가된다"],
  ], { x: L, y: 2.4, w: CW, colW: [2.0, 4.6, 5.33], rowH: 0.7, fontSize: 14 });
  T(s, [R("세션 단위를 고를 때 묻기  ", { bold: true, color: C.accent1 }),
    R("\"이 변화를 본 사용자가 다음 방문에서 행동이 달라질 가능성이 있는가?\"")], { x: L, y: 5.55, w: CW, h: 0.4, fontSize: 15 });
  T(s, [R("원칙  ", { bold: true, color: C.accent1 }),
    R("User-level에서 시작, 다른 단위는 이유를 댈 수 있을 때만 · 배정 ≠ 분석 단위면 분산 보정 (위키 09편)")],
  { x: L, y: 6.0, w: CW, h: 0.7, fontSize: 14 });
}
{
  const s = content("Ch2 설계 구성요소", "Ch2 · 사용자 식별자", "식별자는 사람의 근사치다",
    "위키 04편 3.2·3.7. 같은 사용자를 실험 내내 같은 그룹에 두는 것을 Sticky Assignment라고 합니다. 서비스가 알아볼 수 있는 건 계정·기기·쿠키 같은 식별자뿐이라, "
    + "쿠키를 지우거나 기기를 바꾸거나 로그인 전후로 식별자가 바뀌면 같은 사람이 두 그룹에 걸칠 수 있습니다. 식별자는 개인에게 연결되므로 보안에도 신경 써야 합니다.");
  const code = (t) => ({ text: t, options: { fontFace: "Courier New", bold: true } });
  table(s, ["식별자", "사용 상황"], [
    [code("user_id / account_id"), "로그인 사용자"],
    [code("device_id"), "앱의 비로그인 사용자"],
    [code("Cookie ID"), "웹 비로그인 사용자"],
    [code("anonymous_id"), "로그인 전 사용자 추적"],
  ], { x: L, y: 1.95, w: 6.0, colW: [3.0, 3.0], rowH: 0.6, fontSize: 15 });
  T(s, [
    BR("Sticky Assignment", { bold: true, fontSize: 20, color: C.accent1 }),
    BR("같은 사용자 → 실험 내내 같은 Variant", { fontSize: 15, paraSpaceAfter: 14 }),
    BR("같은 사람이 두 그룹에 걸치는 경우", { bold: true, fontSize: 15, paraSpaceAfter: 4 }),
    BR("쿠키를 지우거나 브라우저·기기를 바꿈", { bullet: true }),
    BR("로그인 전후로 식별자가 달라짐", { bullet: true, paraSpaceAfter: 10 }),
    R("→ 두 그룹의 경험이 섞여 차이가 작게 측정됩니다", { fontSize: 15, color: C.text2 }),
  ], { x: 7.3, y: 1.95, w: 5.35, h: 3.6, fontSize: 15, paraSpaceAfter: 4 });
  T(s, [R("기억할 것  ", { bold: true, color: C.accent1 }),
    R("식별자는 사람의 근사치 · 배정 기준 식별자는 실험 전에 정하기 · 식별자 로그 = 개인정보")],
  { x: L, y: 5.6, w: CW, h: 0.8, fontSize: 15 });
}
{
  const s = content("Ch2 설계 구성요소", "Ch2 · 세션 단위", "사람을 계속 알아보기 어렵다면 세션 단위를 쓴다",
    "위키 04편 3.3. 세션 단위는 같은 사람이 오늘 오고 내일 또 와도 서비스 입장에서 '처음 보는 사람'처럼 보이는 환경에서 유용합니다. "
    + "단위 수가 빨리 늘지만, 자주 오는 사용자의 세션이 더 많이 반영되어 결론이 '평균적인 사용자'가 아니라 '평균적인 세션'에 대한 것이 됩니다. "
    + "B를 본 다음 세션에 A를 보고 구매하면 A의 성과로 집계되는 이월 효과도 주의합니다.");
  table(s, ["상황", "왜 식별이 어려운가"], [
    ["로그인이 없는 웹사이트 (뉴스, 정보성 페이지)", "사용자를 알아보는 수단이 쿠키뿐이다"],
    ["쿠키를 거부하거나 자주 지우는 환경", "쿠키가 사라지면 같은 사람이 새 사용자로 보인다"],
    ["시크릿 모드, 추적 방지 브라우저", "세션이 끝나면 식별 정보가 삭제된다"],
    ["공용 기기 (키오스크, 매장 태블릿, 도서관 PC)", "한 기기를 여러 사람이 써서 개인을 알 수 없다"],
    ["개인정보 수집을 제한하는 서비스", "식별자를 아예 저장하지 않는다"],
  ], { x: L, y: 1.9, w: 7.6, colW: [3.9, 3.7], rowH: 0.6, fontSize: 15 });
  T(s, [
    BR("장점", { bold: true, fontSize: 20, color: C.accent1 }),
    BR("단위 수가 빨리 는다. 하루 3번 오면 세션 3개", { fontSize: 15, paraSpaceAfter: 4 }),
    BR("영구적인 사용자 ID에 덜 의존한다", { fontSize: 15, paraSpaceAfter: 14 }),
    BR("주의", { bold: true, fontSize: 20, color: C.accent4 }),
    BR("결론이 '평균적인 세션'에 대한 것이 된다", { fontSize: 15, paraSpaceAfter: 4 }),
    BR("이월 효과: 앞 세션의 B 경험이 뒤 세션 A 성과로 섞인다", { fontSize: 15, paraSpaceAfter: 4 }),
    R("세션마다 화면이 바뀌어도 괜찮은 기능인지 확인한다", { fontSize: 15 }),
  ], { x: 8.75, y: 1.9, w: 3.9, h: 4.5 });
  SRC(s, "위키 04편 3.3", 6.45);
}
{
  const s = content("Ch2 설계 구성요소", "Ch2 · 트리거 분석", "효과를 받을 수 있는 사람만 분석에 넣는다",
    "배정된 전원을 비교하는 ITT(Intent-to-Treat)는 안전하지만, 처치를 볼 수 없는 사람까지 섞여 효과가 희석됩니다. 트리거 분석은 변경이 실제로 영향을 줄 수 있는 조건을 "
    + "충족한 사람만 비교하는데, 대조군에서도 '실험군이었다면 노출됐을' 사람을 같은 기준으로 골라야 합니다(counterfactual logging). "
    + "실험군의 노출자와 미노출자를 비교하면 선택 편향입니다. 위키 04편 3.5: 배정(Assignment)과 노출(Exposure)을 구분해 기록합니다. 수치는 교육용 예시입니다.");
  // 점 모티프: 배정 전원 중 트리거 충족자
  const gap = 0.3;
  for (let i = 0; i < 80; i++) {
    const c = i % 10, r = Math.floor(i / 10);
    const trig = (c >= 3 && c <= 6 && r >= 2 && r <= 5);
    dot(s, L + c * gap, 2.1 + r * gap, 0.15, trig ? HEX.blue : "D5D9E6");
  }
  T(s, [R("●", { color: C.accent1 }), R(" 트리거 충족 20%   "), R("●", { color: "D5D9E6" }), R(" 배정된 전원")],
    { x: L, y: 4.65, w: 4.3, h: 0.35, fontSize: 14, color: C.text2 });
  const rows = [
    ["ITT", "배정된 전원 A vs B", "+0.4%p", "희석됨. 효과 × 트리거 비율", C.text2],
    ["트리거 분석", "조건 충족자 A vs B (같은 기준)", "+2.0%p", "희석 없음. A에도 조건을 로깅해야 가능", C.accent1],
    ["잘못된 비교", "B 노출자 vs B 미노출자", "과대", "노출된 사람은 원래 다르다 → 선택 편향", C.accent4],
  ];
  rows.forEach(([h, a, v, d, color], i) => {
    const y = 2.05 + i * 1.0;
    T(s, [BR(h, { bold: true, fontSize: 20, color }), R(a, { fontSize: 14, color: C.text2 })], { x: 4.7, y, w: 3.6, h: 0.85 });
    T(s, v, { x: 8.35, y, w: 1.3, h: 0.5, fontSize: 20, bold: true, color });
    T(s, d, { x: 9.75, y: y + 0.05, w: 2.9, h: 0.8, fontSize: 14, color: C.text2 });
  });
  T(s, [R("설계에서 정할 것  ", { bold: true, color: C.accent1 }),
    R("언제 배정할지(트리거 시점), 누구를 분석할지, 대조군에도 트리거 조건을 기록할지")], { x: L, y: 5.3, w: CW, h: 0.5, fontSize: 15 });
  T(s, "전체 영향 보고 = 트리거 효과 × 트리거 비율",
    { x: L, y: 5.85, w: CW, h: 0.4, fontSize: 14, color: C.text2 });
}
{
  const s = content("Ch2 설계 구성요소", "Ch2 · 1종 오류와 2종 오류", "실험이 틀리는 두 가지 방식",
    "α는 효과가 없는데 있다고 판단해 배포하는 위험, β는 효과가 있는데 놓치는 위험입니다. 관례적으로 α 5%, 검정력(1-β) 80%를 씁니다. "
    + "실무에서는 '헛배포'와 '놓친 기회'로 번역하면 이해가 빠릅니다.");
  const cell = (t, sub, color) => ({ text: [BR(t, { bold: true, color, fontSize: 20 }), R(sub, { fontSize: 14, color: HEX.ink2 })], options: {} });
  table(s, ["", "결정: 배포한다", "결정: 배포하지 않는다"], [
    [{ text: "실제로 효과 없음", options: { bold: true } }, cell("1종 오류 (α)", "헛배포 · False Positive", HEX.neg), cell("올바른 판단", "", HEX.ink3)],
    [{ text: "실제로 효과 있음", options: { bold: true } }, cell("올바른 판단", "검정력 = 1 - β", HEX.ink3), cell("2종 오류 (β)", "놓친 기회 · False Negative", HEX.warn)],
  ], { x: L, y: 2.0, w: 8.2, colW: [2.4, 2.9, 2.9], rowH: 1.0, fontSize: 15 });
  T(s, [
    BR("관례", { bold: true, fontSize: 15, color: C.text2 }),
    BR("α = 5%", { bold: true, fontSize: 30, color: C.accent4 }),
    BR("효과 없는데 배포할 위험을 5%까지 허용", { fontSize: 14, color: C.text2, paraSpaceAfter: 14 }),
    BR("검정력 = 80%", { bold: true, fontSize: 30, color: C.accent1 }),
    R("실제 효과가 MDE만큼 있을 때 잡아낼 확률", { fontSize: 14, color: C.text2 }),
  ], { x: 9.4, y: 2.0, w: 3.2, h: 3.6 });
}
{
  const s = content("Ch2 설계 구성요소", "Ch2 · 표본 크기 산정 (Power Analysis)", "MDE를 절반으로 줄이면 필요한 사용자는 4배",
    "표본 크기는 유의수준, 검정력, MDE, 지표의 분산으로 정해집니다. α 5%, 검정력 80%일 때 그룹당 n ≈ 16σ²/δ²라는 어림식이 있습니다(Lehr의 규칙, Kohavi 책 17장). "
    + "기준 전환율 10%에서 상대 MDE별 그룹당 필요 사용자 수를 계산한 값입니다. 하루 유입이 그룹당 5천 명이면 MDE 5%는 약 12일이 걸립니다.");
  const p = 0.1, v = p * (1 - p);
  const mde = [0.02, 0.05, 0.1, 0.2];
  const n = mde.map((m) => Math.round((16 * v) / (p * m) ** 2));
  s.addChart(pres.ChartType.bar, [{ name: "그룹당 필요 사용자 수", labels: mde.map((m) => `MDE ${m * 100}%`), values: n }],
    chartBase({ x: L, y: 1.9, w: 7.2, h: 4.4, barDir: "col", chartColors: [HEX.blue],
      showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "#,##0", dataLabelColor: HEX.ink,
      dataLabelFontSize: 12, valAxisLabelFormatCode: "#,##0", showLegend: false,
      showTitle: true, title: "그룹당 필요 사용자 수 (기준 전환율 10%, α 5%, 검정력 80%)" }));
  T(s, [
    BR("n ≈ 16 · σ² / δ²", { bold: true, fontSize: 30, color: C.accent1, paraSpaceAfter: 4 }),
    BR("그룹당 · α 5% · 검정력 80% 기준 어림식", { fontSize: 14, color: C.text2, paraSpaceAfter: 16 }),
    BR("α  유의수준", { bold: true }), BR("헛배포를 얼마나 허용할까", { color: C.text2, paraSpaceAfter: 8 }),
    BR("1 - β  검정력", { bold: true }), BR("진짜 효과를 얼마나 확실히 잡을까", { color: C.text2, paraSpaceAfter: 8 }),
    BR("MDE  최소 탐지 효과", { bold: true }), R("이보다 작은 효과는 놓쳐도 괜찮다는 선언", { color: C.text2 }),
  ], { x: 8.4, y: 2.0, w: 4.2, h: 4.3, fontSize: 15 });
}
{
  const s = content("Ch2 설계 구성요소", "Ch2 · α와 Power", "α와 Power를 엄격하게 잡을수록 실험은 길어진다",
    "위키 05편 4.1. α와 Power는 마지막 검정 때 쓰는 숫자가 아니라 실험 전에 필요한 표본 수를 정하는 입력값입니다. "
    + "0.05와 80%는 절대적인 정답이 아니라 관행입니다. 헛배포(False Positive) 비용이 크면 α를 더 엄격하게, 기회를 놓치기(False Negative) 싫으면 Power를 높이되, "
    + "둘 다 표본과 기간이 늘어나는 대가가 있습니다. 예: 하루 실험 대상 10,000명, 필요한 표본 140,000명이면 약 14일.");
  const b = (t, color) => ({ text: t, options: { bold: true, color: color || HEX.ink } });
  table(s, ["설계 변경", "의미", "필요한 표본 수"], [
    [b("α ↓"), "False Positive를 더 엄격하게 막는다", b("증가", HEX.neg)],
    [b("α ↑"), "효과 있다고 판단하기 쉬워진다", b("감소", HEX.pos)],
    [b("Power ↑"), "실제 효과를 놓칠 가능성을 줄인다", b("증가", HEX.neg)],
    [b("Power ↓"), "실제 효과를 놓칠 가능성을 더 허용한다", b("감소", HEX.pos)],
  ], { x: L, y: 1.9, w: 7.2, colW: [1.6, 3.9, 1.7], rowH: 0.56, fontSize: 15 });
  const flow = ["α · Power 결정", "필요한 표본 수", "서비스 트래픽과 결합", "실험 기간"];
  flow.forEach((t, i) => {
    const y = 1.95 + i * 0.85;
    T(s, t, { x: 8.4, y, w: 4.2, h: 0.45, fontSize: 20, bold: true, color: i === flow.length - 1 ? C.accent1 : C.text1 });
    if (i < flow.length - 1) T(s, "↓", { x: 8.4, y: y + 0.42, w: 0.4, h: 0.4, fontSize: 15, color: C.accent6 });
  });
  T(s, [
    BR("두 실수의 비용을 비교한다", { bold: true, fontSize: 20, paraSpaceAfter: 6 }),
    BR("False Positive: 효과 없는 기능을 배포하면 얼마나 큰 문제가 생기나?", { bullet: true }),
    R("False Negative: 좋은 기능을 버리면 얼마나 큰 기회를 잃나?", { bullet: true }),
  ], { x: L, y: 5.1, w: 7.4, h: 1.3, fontSize: 15, paraSpaceAfter: 4 });
  T(s, "예: 하루 10,000명, 필요 표본 140,000명 → 약 14일", { x: 8.4, y: 5.4, w: 4.25, h: 0.5, fontSize: 15, color: C.text2 });
  SRC(s, "위키 05편 4.1", 6.45);
}
{
  const s = content("Ch2 설계 구성요소", "Ch2 · MDE 정하기", "MDE는 통계가 아니라 비즈니스가 정한다",
    "위키 05편 4.2. MDE는 감지할 수 있는 가장 작은 효과가 아니라, 주어진 α와 Power에서 일정한 확률로 잡도록 설계한 최소 효과 크기입니다. "
    + "MDE보다 작은 효과도 유의하게 나올 수는 있습니다. 구현 비용을 정당화하려면 5%는 올라야 하는데 0.5%까지 잡도록 설계하면 표본과 시간을 낭비하고(Overpowered), "
    + "50%로 잡으면 20~30%의 의미 있는 개선도 놓칩니다(Underpowered). 기간부터 정하고 MDE를 역으로 맞추지 말고, 의미 있는 효과부터 정합니다. "
    + "표본 크기는 Baseline·분산, MDE, α, Power로 정해지며, Baseline의 영향은 지표 형태에 따라 다릅니다.");
  T(s, [R("Baseline CVR 10% · MDE +1%p · Power 80%  ", { bold: true, color: C.accent1 }),
    R("→ 10%가 11%로 바뀌는 변화가 실제로 있을 때 80% 확률로 잡도록 설계한다")], { x: L, y: 1.9, w: CW, h: 0.5, fontSize: 15 });
  T(s, "MDE보다 작은 효과가 절대 유의하게 나오지 않는다는 뜻은 아닙니다", { x: L, y: 2.4, w: CW, h: 0.4, fontSize: 14, color: C.text2 });
  const col = (x, head, sub, body, color) => T(s, [BR(head, { bold: true, fontSize: 20, color }), BR(sub, { fontSize: 15, paraSpaceAfter: 6 }),
    R(body, { fontSize: 14, color: C.text2 })], { x, y: 3.1, w: 3.75, h: 1.7 });
  col(L, "Overpowered", "MDE를 너무 작게: 0.5%", "5%는 올라야 의미 있는데 0.5%까지 잡으려고 표본과 시간을 낭비한다", C.accent5);
  col(4.75, "적절한 MDE", "도입할 가치가 있는 최소 효과", "구현·운영 비용, 리스크, 기대 효과를 놓고 ROI로 정한다", C.accent1);
  col(8.8, "Underpowered", "MDE를 너무 크게: 50%", "실제로 20~30% 개선이 있어도 안정적으로 잡지 못한다", C.accent4);
  const flow = ["의미 있는 효과", "MDE", "α · Power", "필요 표본 수", "트래픽", "실험 기간"];
  flow.forEach((t, i) => {
    const x = L + i * 2.0;
    T(s, t, { x, y: 5.25, w: 1.6, h: 0.5, fontSize: 15, bold: true, color: i === 0 ? C.accent1 : C.text1 });
    if (i < flow.length - 1) arrow(s, x + 1.5, 5.45, 0.4);
  });
  T(s, "기간부터 정하고 MDE를 역으로 맞추지 않는다", { x: L, y: 5.85, w: CW, h: 0.4, fontSize: 14, color: C.text2 });
  SRC(s, "위키 05편 4.2", 6.45);
}
{
  const s = content("Ch2 설계 구성요소", "Ch2 · 무작위 배정", "단순 배정, 층화 배정, 해싱 배정",
    "실무 실험 플랫폼은 대부분 해싱 배정을 씁니다. 사용자 ID와 실험별 salt를 해시해 버킷을 정하면, 같은 사용자는 항상 같은 그룹에 들어가고(지속성), "
    + "실험마다 salt가 달라 실험끼리 배정이 엮이지 않습니다. 층화는 표본이 작을 때 중요한 특성(플랫폼, 신규 여부)의 균형을 맞추는 방법입니다.");
  const cols = [
    ["단순 배정", "사용자마다 동전 던지기", "표본이 크면 충분하다. 작으면 우연히 한쪽에 쏠릴 수 있다"],
    ["층화 배정", "플랫폼·신규 여부 같은 층 안에서 나눈다", "표본이 작거나 층 간 차이가 클 때 균형을 보장한다"],
    ["해싱 배정", "ID를 해시해 버킷을 정한다", "같은 사용자는 항상 같은 그룹. 실험 플랫폼의 기본값"],
  ];
  cols.forEach(([h, a, b], i) => {
    const x = L + i * 4.05;
    T(s, [BR(h, { bold: true, fontSize: 20, color: i === 2 ? C.accent1 : C.text1 }),
      BR(a, { fontSize: 15, paraSpaceAfter: 8 }), R(b, { fontSize: 14, color: C.text2 })], { x, y: 2.05, w: 3.7, h: 2.0 });
  });
  T(s, [
    BR("bucket = hash(user_id + \"exp_cart_v2\") % 100", { fontFace: "Courier New", fontSize: 20, bold: true }),
    R("0 – 49 → A 대조군      50 – 99 → B 실험군", { fontFace: "Courier New", fontSize: 20, color: C.text2 }),
  ], { x: L, y: 4.6, w: CW, h: 1.0 });
  T(s, "실험마다 salt(\"exp_cart_v2\")가 달라 여러 실험의 배정이 서로 엮이지 않습니다",
    { x: L, y: 5.75, w: CW, h: 0.4, fontSize: 15, color: C.text2 });
}
{
  const s = content("Ch2 설계 구성요소", "Ch2 · 배정 비율", "50:50이 가장 효율적이고, 90:10은 위험 관리용이다",
    "위키 05편 4.3. 두 그룹의 조건이 같다면 같은 전체 표본에서 50:50이 비교 효율이 가장 좋습니다. 장애 위험이 있는 기능은 90:10처럼 일부에게 먼저 노출할 수 있지만, "
    + "실험군 표본이 천천히 쌓여 같은 검정력에 더 많은 트래픽이나 시간이 필요합니다. 비대칭 배정은 통계적 효율보다 위험 관리, 비용, 트래픽 제약 때문에 선택합니다. "
    + "좋은 배정의 핵심은 사용자 수를 맞추는 것이 아니라 처치 여부와 사용자 특성이 체계적으로 연결되지 않게 하는 것입니다.");
  const row = (y, label, nB, note) => {
    T(s, label, { x: L, y: y - 0.05, w: 1.6, h: 0.4, fontSize: 20, bold: true });
    for (let i = 0; i < 20; i++) dot(s, 2.4 + i * 0.32, y, 0.2, i < 20 - nB ? HEX.blue : HEX.teal);
    T(s, note, { x: 9.0, y: y - 0.05, w: 3.65, h: 0.7, fontSize: 14, color: C.text2 });
  };
  row(2.1, "50 : 50", 10, "같은 전체 표본에서 비교 효율이 가장 좋다");
  row(2.9, "90 : 10", 2, "장애 위험이 있을 때 일부에게 먼저. 실험군 표본이 느리게 쌓인다");
  T(s, [R("●", { color: C.accent1 }), R(" 대조군   "), R("●", { color: C.accent2 }), R(" 실험군")], { x: 2.4, y: 3.45, w: 4, h: 0.35, fontSize: 14, color: C.text2 });
  T(s, [
    BR("좋은 배정이란", { bold: true, fontSize: 20, paraSpaceAfter: 6 }),
    R("A와 B의 사용자 수를 맞추는 것이 아니라, 처치 여부와 사용자 특성이 체계적으로 연결되지 않게 하는 것", { fontSize: 15 }),
  ], { x: L, y: 4.15, w: 5.7, h: 1.6 });
  vline(s, 6.55, 4.2, 1.7);
  T(s, [
    BR("실험 전에 정해 둘 것", { bold: true, fontSize: 20, paraSpaceAfter: 6 }),
    BR("어떤 단위를 어떤 규칙으로 배정할지", { bullet: true }),
    BR("배정 비율은 얼마인지", { bullet: true }),
    R("필요하면 어떤 특성을 균형화할지 (층화)", { bullet: true }),
  ], { x: 6.95, y: 4.15, w: 5.7, h: 1.8, fontSize: 15, paraSpaceAfter: 4 });
  SRC(s, "위키 05편 4.3", 6.45);
}
{
  const s = content("Ch2 설계 구성요소", "Ch2 · SUTVA", "내 처치가 남의 결과를 바꾸면 안 된다",
    "SUTVA(Stable Unit Treatment Value Assumption)는 한 사용자의 결과가 다른 사용자의 배정에 영향을 받지 않는다는 가정입니다. "
    + "양면 시장, 메신저, 배달처럼 사용자가 서로 엮인 서비스에서 자주 깨집니다. 해결책은 위키 07편의 클러스터 랜덤화와 스위치백입니다.");
  // A·B 점 사이로 영향이 번지는 그림
  seed = 3;
  for (let i = 0; i < 12; i++) dot(s, L + (i % 3) * 0.45, 2.3 + Math.floor(i / 3) * 0.45, 0.2, HEX.blue);
  for (let i = 0; i < 12; i++) dot(s, 3.4 + (i % 3) * 0.45, 2.3 + Math.floor(i / 3) * 0.45, 0.2, HEX.teal);
  T(s, "A", { x: L, y: 4.2, w: 1.3, h: 0.4, fontSize: 15, bold: true, color: C.accent1, align: "center" });
  T(s, "B", { x: 3.4, y: 4.2, w: 1.3, h: 0.4, fontSize: 15, bold: true, color: C.accent2, align: "center" });
  s.addShape(pres.ShapeType.line, { x: 2.05, y: 2.85, w: 1.15, h: 0, flipH: true,
    line: { color: HEX.neg, width: 2, dashType: "dash", endArrowType: "triangle" } });
  s.addShape(pres.ShapeType.line, { x: 2.05, y: 3.75, w: 1.15, h: 0, flipH: true,
    line: { color: HEX.neg, width: 2, dashType: "dash", endArrowType: "triangle" } });
  T(s, "영향이 번진다", { x: 1.7, y: 4.65, w: 2.4, h: 0.4, fontSize: 14, color: C.accent4, align: "center" });
  const ex = [
    ["메신저", "B 그룹 친구가 새 기능으로 보낸 메시지를 A 그룹인 나도 받는다"],
    ["마켓플레이스", "B 그룹에 준 쿠폰으로 인기 재고가 소진되면 A 그룹 구매가 줄어든다"],
    ["배달·라이드쉐어", "B 그룹 주문이 라이더를 먼저 가져가면 A 그룹 배달이 늦어진다"],
  ];
  T(s, ex.flatMap(([h, b], i) => [BR(h, { bold: true, fontSize: 20 }),
    i < ex.length - 1 ? BR(b, { fontSize: 15, color: C.text2, paraSpaceAfter: 12 }) : R(b, { fontSize: 15, color: C.text2 })]),
  { x: 5.6, y: 2.05, w: 7.0, h: 3.4 });
  T(s, [R("위키 07편과 연결  ", { bold: true, color: C.accent1 }), R("사용자 대신 동네·시간 구간을 나눈다 (클러스터 랜덤화, 스위치백)")],
    { x: L, y: 5.75, w: CW, h: 0.5, fontSize: 15 });
}

// ======================================================
// Ch3
// ======================================================
section("Ch3 실행과 분석", "03", "실험 실행과 통계 분석", "A/A, 램프업, 기간, 검정, 구간, 분산 축소");
{
  const s = content("Ch3 실행과 분석", "Ch3 · 실행 순서", "A/A로 점검하고, 조금씩 늘리고, 충분히 돌린다",
    "램프업은 위험 관리입니다. 1%에서 버그·크래시를 잡고, 5%에서 가드레일을 확인한 뒤, 50%에서 본 실험을 합니다. "
    + "Feature Flag가 있으면 단계 전환과 롤백이 코드 배포 없이 가능합니다. 위키 09편 1.2: 비율은 정해진 표준이 아니고, 초기 단계에서는 Primary의 유의성보다 오류율·로딩·로깅·Guardrail을 먼저 봅니다.");
  const steps = [
    ["A/A", "0%", "시스템과 기저 분산 점검"], ["1%", "1%", "버그·크래시, 노출·로깅 기록 확인"],
    ["5%", "5%", "가드레일 확인"], ["50%", "50%", "본 실험 · 최소 1~2주"],
  ];
  const sw = 2.6, sg = 0.5;
  steps.forEach(([big, , desc], i) => {
    const x = L + i * (sw + sg);
    T(s, big, { x, y: 2.1, w: sw, h: 1.0, fontSize: 54, bold: true, color: i === 3 ? C.accent1 : C.text1 });
    T(s, desc, { x, y: 3.2, w: sw, h: 0.8, fontSize: 15, color: C.text2 });
    if (i < steps.length - 1) arrow(s, x + sw - 0.3, 2.6, 0.6);
  });
  // 노출 비율 막대 대신 점 크기로 트래픽 표현
  T(s, [R("실무에서 이렇게 말한다  ", { bold: true, color: C.accent1 }),
    R("\"1%에서 결제 에러율이 0.3%p 올라 램프업을 멈추고 수정 후 재시작합니다\"")], { x: L, y: 4.7, w: CW, h: 0.5, fontSize: 15 });
  T(s, "단계를 넘기는 기준(에러율, 가드레일)은 실험 전에 정한다",
    { x: L, y: 5.3, w: CW, h: 0.4, fontSize: 15, color: C.text2 });
  T(s, [R("램프업 = 위험 제한  ", { bold: true, color: C.accent4 }),
    R("효과를 빨리 찾는 절차가 아니다 · 1%에서 좋아 보인다고 늘리면 Peeking과 같다")],
  { x: L, y: 5.8, w: CW, h: 0.5, fontSize: 15 });
}
{
  const s = content("Ch3 실행과 분석", "Ch3 · A/A 테스트", "같은 것끼리 비교해서 시스템을 먼저 검증한다",
    "A와 B에 똑같은 경험을 보여주는 테스트입니다. 차이가 없어야 정상이지만, α 5%이면 100번 중 약 5번은 우연히 유의하게 나옵니다. "
    + "그보다 훨씬 자주 유의하면 배정이나 분산 계산에 문제가 있다는 신호입니다. A/A에서 구한 분산은 표본 크기 계산에도 씁니다. 위키 09편 1.1: A/A의 핵심은 차이가 없어야 한다가 아니라, 차이가 없는 상황에서 시스템이 차이를 만들어내지 않는지 확인하는 것입니다.");
  T(s, "100번 중 약 5번", { x: L, y: 2.1, w: 6.4, h: 1.2, fontSize: 54, bold: true, color: C.accent1 });
  T(s, "A/A에서 '유의'가 나오는 정상 빈도 (α = 5%)\n훨씬 잦으면 → 시스템 의심",
    { x: L, y: 3.35, w: 6.2, h: 0.9, fontSize: 15, color: C.text2 });
  T(s, [
    BR("한 번 유의했다고 고장은 아니다. 이런 패턴을 본다", { bold: true, fontSize: 15, paraSpaceAfter: 4 }),
    BR("반복했을 때 유의가 지나치게 자주 나온다", { bullet: true }),
    BR("특정 지표가 계속 한쪽 방향으로 차이 난다", { bullet: true }),
    BR("특정 브라우저·국가·기기에서만 차이 난다", { bullet: true }),
    R("계산한 표준오차보다 실제 변동이 훨씬 크다", { bullet: true }),
  ], { x: L, y: 4.45, w: 6.2, h: 2.0, fontSize: 15, paraSpaceAfter: 2 });
  T(s, [
    BR("파이프라인 전체를 그대로 통과시킨다", { bold: true, fontSize: 20, paraSpaceAfter: 4 }),
    BR("배정 → 노출 → 로깅 → 지표 계산 → 분석", { fontSize: 15, color: C.accent1, bold: true, paraSpaceAfter: 10 }),
    R("배정  ", { bold: true }), BR("특정 국가·브라우저가 한쪽에 몰림", { paraSpaceAfter: 4 }),
    R("노출  ", { bold: true }), BR("배정됐지만 한쪽만 기능에 노출되지 않음", { paraSpaceAfter: 4 }),
    R("로깅  ", { bold: true }), BR("한 Variant의 이벤트가 누락·중복", { paraSpaceAfter: 4 }),
    R("지표 계산  ", { bold: true }), BR("그룹마다 집계 기준·필터가 다름", { paraSpaceAfter: 4 }),
    R("분산·SE  ", { bold: true }), R("반복 관측을 독립으로 봐서 불확실성을 작게 계산"),
  ], { x: 7.5, y: 2.1, w: 5.15, h: 4.2, fontSize: 15 });
}
{
  const s = content("Ch3 실행과 분석", "Ch3 · 실험 기간", "최소 1~2주, 요일과 신기효과를 넘겨서",
    "일별 효과 추이 예시입니다(교육용 가상 수치). 첫 며칠은 새로워서 눌러보는 신기효과로 과대평가되고, 주말과 주중 사용자가 달라 요일 패턴도 있습니다. "
    + "완전한 주 단위로, 최소 1~2주 돌립니다.");
  const days = Array.from({ length: 14 }, (_, i) => `${i + 1}일`);
  const lift = [6.0, 5.2, 4.4, 3.8, 3.3, 2.1, 2.4, 2.6, 2.3, 2.1, 2.0, 1.9, 1.3, 1.6];
  s.addChart(pres.ChartType.line, [{ name: "일별 효과(%)", labels: days, values: lift }],
    chartBase({ x: L, y: 1.9, w: 7.6, h: 4.4, chartColors: [HEX.blue], lineSize: 2.5, lineDataSymbol: "circle",
      lineDataSymbolSize: 6, showLegend: false, valAxisMinVal: 0, valAxisLabelFormatCode: "0.0",
      showTitle: true, title: "일별 상대 효과(%) · 교육용 예시 수치" }));
  T(s, [
    BR("첫 주만 보면 과대평가", { bold: true, fontSize: 20 }),
    BR("1~3일 효과엔 신기효과가 섞여 있다", { fontSize: 15, color: C.text2, paraSpaceAfter: 16 }),
    BR("요일마다 사용자가 다르다", { bold: true, fontSize: 20 }),
    BR("주말 사용자 ≠ 주중 사용자 → 완전한 주 단위로", { fontSize: 15, color: C.text2, paraSpaceAfter: 16 }),
    BR("'무조건 2주' 규칙은 없다", { bold: true, fontSize: 20 }),
    R("판단 기준: 필요 표본 · 행동 주기 포함 · 초기 시간 효과가 지배하지 않음", { fontSize: 15, color: C.text2 }),
  ], { x: 8.8, y: 2.0, w: 3.8, h: 4.3 });
}
{
  const s = content("Ch3 실행과 분석", "Ch3 · 통계 검정", "검정은 지표의 모양을 보고 고른다",
    "수식은 공통 3주차에서 다뤘으니 여기서는 '언제 무엇을 쓰나'만 봅니다. 대부분의 A/B 테스트 지표는 비율 아니면 평균입니다. "
    + "표본이 크면 z-test와 t-test는 사실상 같은 결과를 냅니다.");
  table(s, ["지표 예", "모양", "검정", "메모"], [
    ["결제 전환율", "비율 (0 / 1)", { text: "두 비율 z-test", options: { bold: true, color: HEX.blue } }, "2×2 카이제곱과 같은 결론"],
    ["객단가, 체류 시간", "평균 (연속값)", { text: "Welch t-test", options: { bold: true, color: HEX.blue } }, "꼬리가 길면 상한 처리·로그 변환 고려"],
    ["페이지당 클릭률 (사용자 단위 배정)", "비율의 비율", { text: "Delta Method + z-test", options: { bold: true, color: HEX.blue } }, "배정 단위 ≠ 분석 단위"],
    ["요금제 선택 (3개 이상)", "범주 분포", { text: "카이제곱 검정", options: { bold: true, color: HEX.blue } }, "어느 범주가 다른지는 따로 확인"],
  ], { x: L, y: 2.0, w: CW, colW: [3.5, 2.2, 2.9, 3.33], rowH: 0.72, fontSize: 15 });
  T(s, "검정 자체는 공통 3주차 그대로 · 달라지는 건 무엇을 비교하느냐",
    { x: L, y: 5.75, w: CW, h: 0.4, fontSize: 15, color: C.text2 });
}
{
  const s = content("Ch3 실행과 분석", "Ch3 · 배정 단위와 분석 단위", "배정 단위보다 작은 단위로 분석하면 신뢰구간이 좁아진다",
    "위키 04편 3.6. 사용자 1,000명을 배정했는데 세션이 10,000개 생겼다고 독립 정보가 10,000개인 것은 아닙니다. 같은 사용자의 세션은 구매 성향·방문 습관을 공유합니다. "
    + "이를 무시하면 불확실성이 작게 추정되어 효과가 없는데도 유의해질 수 있습니다. Microsoft 연구자 시뮬레이션에서는 사용자 단위로 배정하고 페이지 수준 데이터를 단순 공식으로 분석했을 때 "
    + "명목상 95% 신뢰구간이 참값을 포함한 비율이 약 47%, 74%까지 떨어진 조건이 있었습니다. 특정 시뮬레이션 조건의 결과이므로 숫자보다 '추론 자체가 왜곡된다'는 점을 강조합니다.");
  const b = (t, color) => ({ text: t, options: { bold: true, color: color || HEX.ink } });
  table(s, ["배정 vs 분석", "예시", "분석할 때"], [
    [b("같은 단위"), "페이지 배정, 페이지 지표", "일반 계산이 대체로 맞다"],
    [b("배정이 더 큼"), "사용자 배정, 세션·페이지 지표", b("일반 공식이 틀림, 보정 필요", HEX.neg)],
    [b("배정이 더 작음"), "페이지 배정, 사용자 지표", b("지표가 정의되지 않음", HEX.neg)],
  ], { x: L, y: 1.95, w: 7.4, colW: [1.9, 2.9, 2.6], rowH: 0.6, fontSize: 15 });
  T(s, [
    BR("47%", { bold: true, fontSize: 54, color: C.accent4 }),
    R("명목상 95% 신뢰구간이 참값을 포함한 비율. Microsoft 시뮬레이션의 특정 조건 (다른 조건 74%)", { fontSize: 14, color: C.text2 }),
  ], { x: 8.6, y: 1.9, w: 4.05, h: 2.3 });
  const sols = [
    ["① 배정 단위로 다시 집계한다", "사용자별 전환율을 만든 뒤 비교한다. 단, 사용자 평균(55%)과 세션 합산(18%)은 다른 질문에 답한다"],
    ["② 지표는 유지하고 불확실성을 보정한다", "세션 CVR을 그대로 보되, 같은 사용자 세션이 묶여 있음을 반영해 SE를 계산한다 (Delta Method)"],
  ];
  sols.forEach(([h, d], i) => {
    const x = L + i * 6.25;
    T(s, [BR(h, { bold: true, fontSize: 20, color: C.accent1, paraSpaceAfter: 6 }), R(d, { fontSize: 15 })], { x, y: 4.8, w: 5.7, h: 1.5 });
  });
  vline(s, 6.55, 4.85, 1.3);
  SRC(s, "위키 04편 3.6 · 수치는 Microsoft 연구자 시뮬레이션의 특정 조건 결과", 6.4);
}
{
  const s = content("Ch3 실행과 분석", "Ch3 · p-value 해석", "p-value를 말하는 법",
    "p-value는 '효과가 없다고 가정했을 때 이만큼 이상 극단적인 차이를 볼 확률'입니다. B가 좋을 확률도, 효과의 크기도 아닙니다. "
    + "p가 크다고 효과가 없다는 것이 증명되지도 않습니다. 표본이 부족했을 수 있습니다.");
  const col = (x, h, color, mark, items) => T(s, [
    BR(h, { bold: true, fontSize: 20, color, paraSpaceAfter: 12 }),
    ...items.flatMap((t, i) => [R(`${mark}  `, { bold: true, color }),
      i < items.length - 1 ? BR(t, { paraSpaceAfter: 14 }) : R(t)]),
  ], { x, y: 2.05, w: 5.5, h: 3.8, fontSize: 15 });
  col(L, "이렇게 말한다", C.accent3, "✓", [
    "\"효과가 없다고 가정하면, 이만큼 차이가 날 확률이 3%입니다\"",
    "\"미리 정한 기준 5%보다 작아서 '효과 없음'을 기각합니다\"",
    "\"p = 0.2라서 이번 표본으로는 효과를 확인하지 못했습니다\"",
  ]);
  vline(s, 6.55, 2.1, 3.7);
  col(6.95, "이렇게 말하지 않는다", C.accent4, "✗", [
    "\"B가 더 좋을 확률이 97%입니다\"",
    "\"p = 0.001이니 효과가 아주 큽니다\"",
    "\"p = 0.2니까 효과가 없다는 게 증명됐습니다\"",
  ]);
}
{
  const s = content("Ch3 실행과 분석", "Ch3 · 신뢰구간", "점추정 대신 구간으로 말한다",
    "세 실험의 결제 전환율 차이와 95% 신뢰구간입니다(교육용 예시). A는 0을 넘으므로 효과가 있지만 작을 수도 있습니다. "
    + "B는 0을 포함하고 구간이 좁아 효과가 있어도 작습니다. C는 구간이 너무 넓어 아직 판단할 수 없습니다. 같은 '유의하지 않음'이라도 B와 C의 의미는 다릅니다.");
  // 포레스트 플롯: -2 ~ +6 %p
  const px = 3.4, pw = 6.2, lo = -2, hi = 6;
  const X = (v) => px + ((v - lo) / (hi - lo)) * pw;
  const rows = [
    ["실험 A", 0.8, 0.1, 1.5, HEX.blue, "효과 있음. 다만 +0.1%p일 수도"],
    ["실험 B", 0.3, -0.4, 1.0, HEX.ink3, "효과가 있어도 작다"],
    ["실험 C", 2.0, -1.0, 5.0, HEX.warn, "구간이 넓다. 아직 모른다"],
  ];
  const y0 = 2.35, rh = 1.0;
  s.addShape(pres.ShapeType.line, { x: X(0), y: y0 - 0.3, w: 0, h: rh * 3 + 0.1,
    line: { color: HEX.ink, width: 1, dashType: "dash" } });
  [-2, 0, 2, 4, 6].forEach((v) => T(s, `${v > 0 ? "+" : ""}${v}%p`,
    { x: X(v) - 0.5, y: y0 + rh * 3 - 0.15, w: 1.0, h: 0.3, fontSize: 14, color: C.text2, align: "center" }));
  rows.forEach(([name, est, l, h, color, note], i) => {
    const y = y0 + i * rh;
    T(s, name, { x: L, y: y - 0.17, w: 2.5, h: 0.4, fontSize: 20, bold: true });
    s.addShape(pres.ShapeType.line, { x: X(l), y: y + 0.03, w: X(h) - X(l), h: 0, line: { color, width: 4 } });
    dot(s, X(est) - 0.11, y - 0.08, 0.22, color);
    T(s, [BR(`${est > 0 ? "+" : ""}${est}%p  [${l > 0 ? "+" : ""}${l}, +${h}]`, { bold: true, fontSize: 15 }),
      R(note, { fontSize: 14, color: C.text2 })], { x: 9.9, y: y - 0.22, w: 2.8, h: 0.75 });
  });
  T(s, [R("실무에서 이렇게 말한다  ", { bold: true, color: C.accent1 }),
    R("\"결제 전환율이 0.8%p 올랐고, 95% 신뢰구간은 +0.1%p에서 +1.5%p입니다\"")], { x: L, y: 5.75, w: CW, h: 0.5, fontSize: 15 });
  T(s, "엄밀한 뜻: 같은 절차를 반복하면 구간의 95%가 참값을 포함 ('이 구간에 참값이 있을 확률 95%'가 아님)",
    { x: L, y: 6.25, w: CW, h: 0.5, fontSize: 14, color: C.text2 });
}
{
  const s = content("Ch3 실행과 분석", "Ch3 · 효과 크기", "통계적으로 유의하다 ≠ 의미 있다",
    "표본이 크면 아주 작은 차이도 유의해집니다. 기준 전환율 10%, 그룹당 500만 명이면 0.12%p 차이도 p < 0.05가 됩니다. "
    + "그래서 '유의한가'와 '배포할 만큼 큰가'를 따로 봅니다. 실질적 의미의 기준은 실험 전에 MDE로 정해 둡니다.");
  const c = (t, sub, color) => ({ text: [BR(t, { bold: true, color, fontSize: 15 }), R(sub, { fontSize: 14, color: HEX.ink2 })], options: {} });
  table(s, ["", "효과가 크다 (MDE 이상)", "효과가 작다 (MDE 미만)"], [
    [{ text: "유의함", options: { bold: true } }, c("배포 후보", "가드레일과 비용 확인", HEX.pos), c("유의하지만 작다", "구현·유지 비용을 넘는가?", HEX.warn)],
    [{ text: "유의하지 않음", options: { bold: true } }, c("표본 부족", "구간이 넓다 → 재실험", HEX.warn), c("효과 없음 확인", "구간이 좁다 → 접는다", HEX.ink3)],
  ], { x: L, y: 2.0, w: 8.0, colW: [2.0, 3.0, 3.0], rowH: 1.05, fontSize: 15 });
  T(s, [
    BR("0.12%p", { bold: true, fontSize: 54, color: C.accent1 }),
    R("기준 전환율 10%, 그룹당 500만 명이면 이 차이도 p < 0.05 · 유의 ≠ 크다",
      { fontSize: 15, color: C.text2 }),
  ], { x: 9.2, y: 2.0, w: 3.4, h: 2.6 });
  const order = ["효과 크기", "신뢰구간", "p-value", "비용·리스크를 포함한 의사결정"];
  T(s, "결과는 이 순서로 읽는다", { x: L, y: 5.45, w: 6, h: 0.35, fontSize: 14, bold: true, color: C.accent6 });
  order.forEach((t, i) => {
    const x = L + i * 2.6;
    T(s, t, { x, y: 5.85, w: i === 3 ? 4.5 : 2.1, h: 0.5, fontSize: 20, bold: true, color: i === 0 ? C.accent1 : C.text1 });
    if (i < order.length - 1) arrow(s, x + 2.05, 6.07, 0.45);
  });
}
{
  const s = content("Ch3 실행과 분석", "Ch3 · 분산 축소", "분산을 줄이면 같은 사용자 수로 더 작은 효과를 잡는다",
    "CUPED는 실험 전 같은 사용자의 지표(예: 지난 4주 주문 수)로 실험 중 지표의 설명 가능한 변동을 빼는 방법입니다. Microsoft가 제안했습니다. "
    + "Deng et al.(2013)은 Bing 실험에서 분산을 약 50% 줄여, 같은 검정력을 절반의 사용자나 기간으로 얻을 수 있었다고 보고했습니다.");
  T(s, "Y_cuped = Y - θ · (X_pre - 평균 X_pre)", { x: L, y: 2.0, w: CW, h: 0.6, fontSize: 20, bold: true, color: C.accent1 });
  T(s, [R("θ = Cov(Y, X) / Var(X)", { bold: true }), R("      분산은 약 Var(Y)(1 - ρ²)로 준다. 실험 전후 지표 상관 ρ = 0.7이면 원래 분산의 51%", { color: C.text2 })],
    { x: L, y: 2.65, w: CW, h: 0.4, fontSize: 15 });
  // 신뢰구간 폭 비교 (분산 절반 → 폭 약 0.71배)
  const base = 5.0;
  T(s, "보정 전", { x: L, y: 3.55, w: 1.4, h: 0.4, fontSize: 15, bold: true });
  s.addShape(pres.ShapeType.line, { x: 2.3, y: 3.75, w: base, h: 0, line: { color: HEX.ink3, width: 4 } });
  dot(s, 2.3 + base / 2 - 0.11, 3.64, 0.22, HEX.ink3);
  T(s, "CUPED", { x: L, y: 4.3, w: 1.4, h: 0.4, fontSize: 15, bold: true, color: C.accent1 });
  const w2 = base * Math.SQRT1_2;
  s.addShape(pres.ShapeType.line, { x: 2.3 + (base - w2) / 2, y: 4.5, w: w2, h: 0, line: { color: HEX.blue, width: 4 } });
  dot(s, 2.3 + base / 2 - 0.11, 4.39, 0.22, HEX.blue);
  T(s, "분산이 절반이면 신뢰구간 폭은 약 0.71배", { x: 2.3, y: 4.85, w: 5, h: 0.4, fontSize: 14, color: C.text2 });
  T(s, [
    BR("다른 방법", { bold: true, fontSize: 15, color: C.text2, paraSpaceAfter: 6 }),
    BR("층화 분석", { bold: true, fontSize: 15 }), BR("플랫폼·신규 여부 같은 층별로 효과를 구해 합친다", { fontSize: 14, color: C.text2, paraSpaceAfter: 10 }),
    BR("Delta Method", { bold: true, fontSize: 15 }), R("배정 단위와 분석 단위가 다를 때 분산을 바르게 계산한다", { fontSize: 14, color: C.text2 }),
  ], { x: 8.4, y: 3.4, w: 4.2, h: 2.6 });
  SRC(s, "출처: Deng, Xu, Kohavi, Walker (2013), \"Improving the Sensitivity of Online Controlled Experiments by Utilizing Pre-Experiment Data\", WSDM");
}
{
  const s = content("Ch3 실행과 분석", "Ch3 · CUPED 주의점", "CUPED는 좋은 실험의 노이즈를 줄일 뿐, 나쁜 실험을 고치지 못한다",
    "위키 09편 1.5. CUPED는 효과의 중심값을 키우지 않고 신뢰구간만 좁힙니다(예: +1.0%p [-0.4, +2.4] → 약 +1.0%p [+0.2, +1.8], 교육용 예시). "
    + "공변량은 반드시 실험 전에 측정한 값이어야 하고, 실험 후 행동을 쓰면 처치가 그 값 자체를 바꿨을 수 있어 인과효과가 왜곡됩니다.");
  const items = [
    ["실험 전후 지표의 상관이 낮으면 효과가 작다", "과거·현재 구매액처럼 반복성이 높은 지표에 유리하다"],
    ["처치의 영향을 받지 않은 변수만 쓴다", "실험 후에 정해진 값을 넣으면 편향이 생긴다"],
    ["신규 사용자는 실험 전 데이터가 없다", "신규 비중이 높으면 결측 처리나 별도 설계가 필요하다"],
    ["잘못된 설계를 고쳐주지 않는다", "배정·로깅·SRM 문제가 있는 실험에 써도 결과를 믿을 수 없다"],
  ];
  items.forEach(([h, d], i) => {
    const x = L + (i % 2) * 6.1, y = 1.95 + Math.floor(i / 2) * 1.35;
    T(s, String(i + 1).padStart(2, "0"), { x, y, w: 0.9, h: 0.6, fontSize: 30, bold: true, color: C.accent4 });
    T(s, [BR(h, { bold: true, fontSize: 20 }), R(d, { fontSize: 15, color: C.text2 })], { x: x + 1.0, y: y + 0.05, w: 4.9, h: 1.2 });
  });
  T(s, [R("CUPED가 하는 일  ", { bold: true, color: C.accent1 }),
    R("효과는 그대로, 신뢰구간만 좁힌다 → 더 작은 효과 탐지, 더 적은 표본·짧은 기간")],
  { x: L, y: 4.85, w: CW, h: 0.8, fontSize: 15 });
  SRC(s, "위키 09편 1.5 · 출처: Deng et al. (2013), WSDM", 6.45);
}
{
  const s = content("Ch3 실행과 분석", "Ch3 · 다중검정 문제", "지표 20개를 보면 하나쯤은 우연히 걸린다",
    "효과가 전혀 없어도 지표를 m개 독립적으로 보면 하나 이상 '유의'가 나올 확률은 1 - 0.95^m입니다. 20개면 64%입니다. "
    + "가장 좋은 처방은 Primary 지표를 실험 전에 하나로 정하는 것이고, 여러 개를 봐야 하면 Bonferroni나 Benjamini-Hochberg로 보정합니다.");
  const ms = [1, 2, 3, 5, 10, 20];
  const fp = ms.map((m) => Math.round((1 - 0.95 ** m) * 1000) / 10);
  s.addChart(pres.ChartType.line, [{ name: "거짓 양성이 하나 이상 나올 확률(%)", labels: ms.map((m) => `${m}개`), values: fp }],
    chartBase({ x: L, y: 1.9, w: 6.8, h: 4.4, chartColors: [HEX.neg], lineSize: 2.5, lineDataSymbol: "circle",
      lineDataSymbolSize: 7, showValue: true, dataLabelPosition: "t", dataLabelFormatCode: "0.0", dataLabelColor: HEX.ink,
      dataLabelFontSize: 12, showLegend: false, valAxisMinVal: 0, valAxisMaxVal: 80,
      showTitle: true, title: "효과가 전혀 없을 때, 지표 수별 '하나 이상 유의' 확률(%)" }));
  T(s, [
    BR("64%", { bold: true, fontSize: 54, color: C.accent4 }),
    BR("지표 20개, α 5%일 때", { fontSize: 15, color: C.text2, paraSpaceAfter: 16 }),
    BR("1순위 처방", { bold: true, fontSize: 15 }), BR("Primary 지표를 실험 전에 하나로 정한다", { fontSize: 15, color: C.text2, paraSpaceAfter: 10 }),
    BR("Bonferroni", { bold: true, fontSize: 15 }), BR("α/m. 하나라도 거짓 양성이 날 확률(FWER)을 막는다. 소수의 중요한 가설에", { fontSize: 15, color: C.text2, paraSpaceAfter: 10 }),
    BR("Benjamini-Hochberg", { bold: true, fontSize: 15 }), R("발견 중 거짓 비율(FDR)을 통제한다. 검정력이 더 높아 많은 지표를 탐색할 때", { fontSize: 15, color: C.text2 }),
  ], { x: 8.0, y: 1.9, w: 4.6, h: 4.5 });
}
{
  const s = content("Ch3 실행과 분석", "Ch3 · Peeking Problem", "매일 들여다보고 멈추면 헛배포가 4배로 는다",
    "직접 돌린 A/A 시뮬레이션입니다. 효과가 전혀 없는 실험 4,000개를 14일 동안 돌리며 매일 검정하고, 한 번이라도 유의하면 멈춘다고 가정했습니다. "
    + "그룹당 하루 1,000명, 전환율 10%, 시드 고정. 마지막 날 한 번만 보면 거짓 양성은 약 5%지만, 매일 보면 약 21.5%까지 늘어납니다.");
  const days = Array.from({ length: 14 }, (_, i) => `${i + 1}일`);
  const cum = [4.5, 8.0, 10.4, 12.5, 13.7, 15.2, 16.3, 17.3, 18.1, 18.9, 19.4, 20.1, 20.9, 21.5];
  s.addChart(pres.ChartType.line, [
    { name: "매일 확인하고 유의하면 멈춤", labels: days, values: cum },
    { name: "마지막 날 한 번만 확인", labels: days, values: days.map(() => 5.2) },
  ], chartBase({ x: L, y: 1.9, w: 7.6, h: 4.4, chartColors: [HEX.neg, HEX.ink3], lineSize: 2.5,
    lineDataSymbol: "none", showLegend: true, legendPos: "b", valAxisMinVal: 0, valAxisMaxVal: 25,
    showTitle: true, title: "A/A 실험에서 '유의'로 끝난 비율(%) · 누적" }));
  T(s, [
    BR("21.5%", { bold: true, fontSize: 54, color: C.accent4 }),
    BR("매일 확인할 때 14일 누적 거짓 양성 (마지막 날만 보면 5.2%)", { fontSize: 15, color: C.text2, paraSpaceAfter: 16 }),
    BR("처방", { bold: true, fontSize: 15 }),
    BR("종료일과 표본 크기를 미리 정한다", { bullet: true, fontSize: 15 }),
    R("중간에 봐야 하면 Sequential Testing을 사용한다 (위키 10편)", { bullet: true, fontSize: 15 }),
  ], { x: 8.8, y: 1.9, w: 3.8, h: 4.4 });
  SRC(s, "A/A 시뮬레이션 4,000회 · 그룹당 하루 1,000명 · 전환율 10% · 두 비율 z-test · 시드 42 (교육용)");
}
{
  const s = content("Ch3 실행과 분석", "Ch3 · Novelty Effect / Primacy Effect", "초반 반응은 오래 가지 않을 수 있다",
    "신규성 효과는 새로워서 눌러보다가 시간이 지나면 사라지는 현상, 초두(학습) 효과는 익숙한 걸 바꿔서 처음엔 불편하다가 적응하면 회복되는 현상입니다. "
    + "그래프는 교육용 예시 곡선입니다. 처방은 기간 확보, 신규 사용자만 따로 보기, 일자별 효과 추이 확인입니다.");
  const wk = ["1주", "2주", "3주", "4주", "5주", "6주"];
  s.addChart(pres.ChartType.line, [
    { name: "신규성 효과: 새로워서 눌러본다", labels: wk, values: [4.0, 2.4, 1.6, 1.2, 1.0, 1.0] },
    { name: "초두 효과: 낯설어서 불편하다", labels: wk, values: [-2.0, -0.6, 0.4, 0.9, 1.1, 1.2] },
  ], chartBase({ x: L, y: 1.9, w: 7.6, h: 4.4, chartColors: [HEX.blue, HEX.warn], lineSize: 2.5,
    lineDataSymbol: "circle", lineDataSymbolSize: 6, showLegend: true, legendPos: "b",
    valAxisLabelFormatCode: "0.0", showTitle: true, title: "주차별 상대 효과(%) · 교육용 예시 곡선" }));
  T(s, [
    BR("신규성 효과", { bold: true, fontSize: 20, color: C.accent1 }),
    BR("초반 효과가 과대평가된다", { fontSize: 15, color: C.text2, paraSpaceAfter: 14 }),
    BR("초두(학습) 효과", { bold: true, fontSize: 20, color: C.accent5 }),
    BR("초반 효과가 과소평가된다", { fontSize: 15, color: C.text2, paraSpaceAfter: 14 }),
    BR("처방", { bold: true, fontSize: 15 }),
    BR("기간을 충분히 확보한다", { bullet: true, fontSize: 15 }),
    BR("신규 사용자만 따로 본다", { bullet: true, fontSize: 15 }),
    R("일자별 효과 추이를 그린다", { bullet: true, fontSize: 15 }),
  ], { x: 8.8, y: 1.9, w: 3.8, h: 4.4 });
}

// ======================================================
// Ch4
// ======================================================
{
  const s = content("Ch3 실행과 분석", "Ch3 · 반복 노출", "같은 사람이 여러 번 보면, 일차별로 읽는다",
    "위키 04편 3.5. 사용자 단위 실험에서 반복 노출은 설계 의도이지만 효과가 처음부터 끝까지 같다는 보장은 없습니다. "
    + "노출 횟수는 실험 시작 후 사용자 행동으로 정해지는 값이라, 5회 노출자와 1회 노출자를 비교하면 처치 효과가 아니라 사용자 성향 차이를 보게 됩니다. "
    + "반면 실험 시작 후 경과 일수는 두 그룹에 똑같이 적용되므로 랜덤 비교가 유지됩니다.");
  const rules = [
    ["실험 시작 후 일차별로 본다", "전체 평균 하나 대신 1~3일차, 4~7일차, 8~14일차 추이를 함께 본다", "경과 일수는 두 그룹에 똑같이 적용돼 랜덤 비교가 유지된다", C.accent1],
    ["노출 횟수별로 쪼개지 않는다", "5회 노출자 vs 1회 노출자는 처치 효과가 아니다", "활동적인 사용자일수록 많이 노출된다 → 성향 차이를 보게 된다", C.accent4],
    ["배정과 노출을 따로 기록한다", "Assignment(어느 그룹) vs Exposure(실제로 봤나)", "실제로 영향받을 수 있는 사람만 분석하면 노이즈가 준다 → 트리거 분석(위키 04편)", C.accent2],
  ];
  rules.forEach(([h, a, d, color], i) => {
    const x = L + i * 4.05;
    T(s, String(i + 1).padStart(2, "0"), { x, y: 1.95, w: 1, h: 0.6, fontSize: 30, bold: true, color });
    T(s, [BR(h, { bold: true, fontSize: 20, paraSpaceAfter: 8 }), BR(a, { fontSize: 15, paraSpaceAfter: 8 }),
      R(d, { fontSize: 14, color: C.text2 })], { x, y: 2.6, w: 3.7, h: 2.6 });
  });
  T(s, [R("실무에서 이렇게 말한다  ", { bold: true, color: C.accent1 }),
    R("\"1~3일차 효과는 +2%p였지만 8~14일차에는 +0.8%p로 줄었습니다\" (예시)")], { x: L, y: 5.6, w: CW, h: 0.5, fontSize: 15 });
}
section("Ch4 함정과 고급 설계", "04", "실무 함정과 고급 설계", "개념을 먼저 잡고, 직접 겪는 건 뒤의 함정 세션에서");
{
  const s = content("Ch4 함정과 고급 설계", "Ch4 · 함정 지도", "실무에서 자주 밟는 여섯 가지 함정",
    "여기서는 이름과 증상, 처방만 연결합니다. 실제로 겪어보는 것은 뒤의 함정·해석·공유 세션과 실습 앱의 함정 연구소에서 합니다.");
  const b = (t) => ({ text: t, options: { bold: true } });
  table(s, ["함정", "이런 증상", "처방"], [
    [b("p-hacking · 다중검정"), "지표와 세그먼트를 바꿔가며 '유의'를 찾는다", "Primary 사전 등록, 다중검정 보정"],
    [b("조기 종료 (Peeking)"), "유의가 나온 날 실험을 멈춘다", "기간 고정, Sequential Testing"],
    [b("심슨의 역설"), "세그먼트별 결과와 전체 결과가 반대다", "트래픽 구성과 배정 비율 확인"],
    [b("신규성 · 학습 효과"), "초반 효과가 사라지거나 늦게 나타난다", "기간 확보, 코호트별 추이"],
    [b("SRM"), "50:50으로 설계했는데 관측 비율이 어긋난다", "결과 해석 중단, 원인 조사"],
    [b("Spillover"), "그룹 사이로 효과가 번진다", "클러스터 랜덤화, 스위치백"],
  ], { x: L, y: 1.95, w: CW, colW: [3.2, 4.9, 3.83], rowH: 0.6, fontSize: 15 });
}
{
  const s = content("Ch4 함정과 고급 설계", "Ch4 · Sequential Testing", "중간에 봐야 한다면, 봐도 되는 방법으로 본다",
    "Peeking 문제의 처방입니다. Sequential Testing은 중간 확인을 전제로 기준을 설계해, 언제 멈춰도 1종 오류율이 α를 넘지 않게 합니다. "
    + "Always-Valid p-value(mSPRT)는 Optimizely 등 실험 플랫폼이 쓰는 방식입니다. 대가로 같은 표본에서 검정력이 조금 낮아집니다.");
  T(s, [
    BR("고정 기간 검정", { bold: true, fontSize: 20, color: C.text2 }),
    BR("마지막 날 한 번만 본다", { fontSize: 15, paraSpaceAfter: 8 }),
    R("중간에 보고 멈추면 α가 깨진다", { fontSize: 15, color: C.text2 }),
  ], { x: L, y: 2.1, w: 5.3, h: 1.8 });
  vline(s, 6.55, 2.15, 1.7);
  T(s, [
    BR("Sequential Testing", { bold: true, fontSize: 20, color: C.accent1 }),
    BR("중간 확인을 전제로 기준을 설계한다", { fontSize: 15, paraSpaceAfter: 8 }),
    R("언제 멈춰도 α 유지 · 대가로 검정력이 조금 낮다", { fontSize: 15, color: C.text2 }),
  ], { x: 6.95, y: 2.1, w: 5.6, h: 1.8 });
  T(s, [R("실무에서 이렇게 말한다  ", { bold: true, color: C.accent1 }),
    R("\"매일 대시보드는 보되, 결정은 미리 정한 종료일이나 Sequential 기준으로만 합니다\"")], { x: L, y: 4.3, w: CW, h: 0.6, fontSize: 15 });
  T(s, [
    BR("'매일 보고 마음대로 멈추기'가 아니다", { bold: true, fontSize: 20, paraSpaceAfter: 6 }),
    BR("방법: Alpha Spending, Group Sequential Test, Always-Valid p-value", { bullet: true }),
    R("중간에 Sequential로 갈아타지 않는다 · 중단 규칙은 실험 전에", { bullet: true }),
  ], { x: L, y: 5.0, w: CW, h: 1.5, fontSize: 15, paraSpaceAfter: 4 });
}
{
  const s = content("Ch4 함정과 고급 설계", "Ch4 · 심슨의 역설", "세그먼트마다 이기는데 전체로는 진다",
    "교육용 예시입니다. B는 데스크톱과 모바일 모두에서 A보다 전환율이 높지만, 전환율이 낮은 모바일 비중이 B에 80%로 쏠려 전체로는 낮아집니다. "
    + "실험에서 두 그룹의 트래픽 구성이 이렇게 다르다는 것 자체가 배정 문제나 램프업 중 비율 변경의 신호입니다.");
  const b = (t, color) => ({ text: t, options: { bold: true, color: color || HEX.ink } });
  table(s, ["", "데스크톱", "모바일", "전체"], [
    [b("A 대조군"), "80 / 800 = 10.0%", "10 / 200 = 5.0%", b("90 / 1,000 = 9.0%", HEX.blue)],
    [b("B 실험군"), "22 / 200 = 11.0%", "44 / 800 = 5.5%", b("66 / 1,000 = 6.6%", HEX.neg)],
    [b("승자"), b("B", HEX.teal), b("B", HEX.teal), b("A", HEX.blue)],
  ], { x: L, y: 2.0, w: 8.6, colW: [1.9, 2.2, 2.2, 2.3], rowH: 0.65, fontSize: 15 });
  T(s, [
    BR("왜 뒤집히나", { bold: true, fontSize: 20 }),
    BR("전환율 낮은 모바일이 B 80%, A 20%", { fontSize: 15, color: C.text2, paraSpaceAfter: 14 }),
    BR("실험이라면", { bold: true, fontSize: 20 }),
    R("그룹 구성이 다르다 = 배정 문제 신호 · 램프업 중 비율 변경에서도 생김", { fontSize: 15, color: C.text2 }),
  ], { x: 9.7, y: 2.0, w: 2.95, h: 4.0 });
  SRC(s, "교육용 예시 수치");
}
{
  const s = content("Ch4 함정과 고급 설계", "Ch4 · Sample Ratio Mismatch", "결과보다 배정 비율을 먼저 본다",
    "50:50으로 설계했는데 A 50,000명, B 48,800명이 들어왔다면 차이는 1.2%뿐이지만 카이제곱 검정 p ≈ 0.0001로 우연이라 보기 어렵습니다. "
    + "SRM이 있으면 결과를 해석하지 말고 원인부터 찾습니다. 우리 실습 앱의 Readout도 SRM을 맨 먼저 보여줍니다. 위키 10편 2장: SRM 검정은 왜 문제가 생겼는지까지 알려주지 않는 경고등이고, 빠진 사용자가 무작위가 아니면 Selection Bias가 생깁니다.");
  T(s, [R("50,000", { color: C.accent1 }), R("  vs  ", { color: C.accent6, bold: false }), R("48,800", { color: C.accent2 })],
    { x: L, y: 2.05, w: 7.2, h: 1.2, fontSize: 54, bold: true });
  T(s, "50:50으로 설계한 실험에 실제로 들어온 사용자 수 (교육용 예시)",
    { x: L, y: 3.25, w: 7, h: 0.4, fontSize: 15, color: C.text2 });
  T(s, [R("χ² = 14.6,  p ≈ 0.0001", { bold: true, color: C.accent4 }), R("  → 우연으로 보기 어렵다", { color: C.text2 })],
    { x: L, y: 3.85, w: 7, h: 0.5, fontSize: 20 });
  T(s, [R("SRM이면 결과 해석 금지. ", { bold: true, color: C.accent4 }), R("원인을 고치고 다시 돌립니다")],
    { x: L, y: 4.7, w: 7, h: 0.5, fontSize: 20 });
  T(s, [
    BR("어디서든 생긴다", { bold: true, fontSize: 20, paraSpaceAfter: 6 }),
    R("배정  ", { bold: true }), BR("해시·버킷 로직, 비율 설정 오류", { paraSpaceAfter: 3 }),
    R("노출  ", { bold: true }), BR("특정 기기·브라우저에서 B가 안 뜸", { paraSpaceAfter: 3 }),
    R("로깅  ", { bold: true }), BR("한 Variant의 이벤트 누락", { paraSpaceAfter: 3 }),
    R("데이터 처리  ", { bold: true }), BR("Join·ETL·필터에서 한쪽이 더 빠짐", { paraSpaceAfter: 3 }),
    R("분석  ", { bold: true }), R("결과를 보고 특정 사용자만 제거"),
  ], { x: 8.2, y: 2.1, w: 4.45, h: 3.3, fontSize: 15 });
  T(s, [R("점검 요령  ", { bold: true, color: C.accent1 }),
    R("배정 단위로 센다(사용자 배정 → 고유 사용자 수) · 기기·브라우저·날짜·국가·유입 채널로 쪼개 원인 찾기")],
  { x: L, y: 5.45, w: CW, h: 0.7, fontSize: 15 });
  T(s, "SRM = 결과 지표가 아니라 신뢰성 지표(Trustworthiness Metric) · 핵심은 인원수가 아니라 누가 빠졌는지 모른다는 것",
    { x: L, y: 6.15, w: CW, h: 0.5, fontSize: 14, color: C.text2 });
}
{
  const s = content("Ch4 함정과 고급 설계", "Ch4 · 그 밖의 오염 신호", "측정이 흔들리면 결과도 흔들린다",
    "세 가지를 짧게 짚습니다. 생존 편향은 '남아 있는 사용자 중' 같은 지표에서 자주 생기고, 계측 효과는 B에만 로깅이 바뀌었을 때 생깁니다.");
  const items = [
    ["Survivorship Bias", "남은 사람만 본다", "B 화면이 일부 환경에서 느려 이탈한 사용자가 노출 로그에서 빠지면, 남은 사용자만 비교해 B가 좋아 보인다"],
    ["Network Effect · Spillover", "그룹 사이로 번진다", "B의 효과가 A로 새어 나가 차이가 과소 추정된다"],
    ["Instrumentation Effect", "재는 방법이 바뀌었다", "B 화면에만 클릭 로깅을 새로 붙이면 지표 차이가 측정 차이일 수 있다"],
  ];
  items.forEach(([h, sub, b], i) => {
    const x = L + i * 4.05;
    T(s, [BR(h, { bold: true, fontSize: 20 }), BR(sub, { fontSize: 15, color: C.accent1, paraSpaceAfter: 10 }),
      R(b, { fontSize: 15, color: C.text2 })], { x, y: 2.1, w: 3.7, h: 3.0 });
  });
  T(s, [R("결과를 본 뒤 필터링하지 않는다  ", { bold: true, color: C.accent4 }),
    R("'결제 시도한 사용자만', '10초 이상 본 사용자만' → 처치 이후 행동으로 고르면 다른 사람끼리 비교 · 제외 규칙은 실험 전에")],
  { x: L, y: 5.2, w: CW, h: 0.9, fontSize: 15 });
}
{
  const s = content("Ch4 함정과 고급 설계", "Ch4 · 간섭(Interference)", "간섭은 두 경로로 생긴다",
    "위키 06편 1.1~1.3. SUTVA는 한 사용자가 받은 처치가 다른 사용자의 결과에 영향을 주지 않는다는 가정이고, 이것이 깨지는 현상이 간섭입니다. "
    + "실무에서는 Spillover, Leakage라고도 부릅니다. 직접 간섭은 사용자끼리 연결된 서비스(SNS, 메신저, 게임)에서, "
    + "간접 간섭은 한정된 자원이나 같은 시장을 공유할 때(메이플 옥션의 매물, Airbnb 숙소, Uber 드라이버, 광고 예산, 서버) 생깁니다.");
  T(s, [R("SUTVA  ", { bold: true, color: C.accent1 }), R("(위키 06편)이 깨지는 현상 = 간섭 · 실무 용어 Spillover, Leakage")],
    { x: L, y: 1.9, w: CW, h: 0.45, fontSize: 15 });
  const col = (x, head, sub, chain, examples, color) => {
    T(s, [BR(head, { bold: true, fontSize: 20, color }), R(sub, { fontSize: 14, color: C.text2 })], { x, y: 2.6, w: 5.4, h: 0.8 });
    chain.forEach((t, i) => {
      T(s, t, { x: x + i * 0.25, y: 3.55 + i * 0.45, w: 5.0, h: 0.4, fontSize: 15, bold: i === chain.length - 1, color: i === chain.length - 1 ? color : C.text1 });
    });
    T(s, examples, { x, y: 5.5, w: 5.4, h: 0.7, fontSize: 14, color: C.text2 });
  };
  col(L, "직접 간섭", "사용자끼리 연결된 서비스 · 네트워크 효과",
    ["B에만 새 공유 기능", "→ B 사용자의 공유량 증가", "→ 친구 피드 노출 증가", "→ A 사용자의 행동도 바뀐다"],
    "예: SNS, 메신저, 게임", C.accent4);
  vline(s, 6.55, 2.65, 3.5);
  col(6.95, "간접 간섭", "공유 자원·같은 시장을 통해 · 마켓플레이스",
    ["B에만 저가 매물 자동 일괄 구매", "→ 경매장 저가 매물이 빨리 소진", "→ A가 보는 평균 가격 상승", "→ A는 기능을 안 받았는데 경험이 바뀐다"],
    "예: Airbnb 숙소, Uber 드라이버, 광고 예산, 서버 부하", C.accent5);
  SRC(s, "위키 06편 1.1~1.3 · 메이플 옥션 예시는 위키 원문", 6.45);
}
{
  const s = content("Ch4 함정과 고급 설계", "Ch4 · 간섭의 영향", "간섭이 있으면 실험 결과가 이렇게 흔들린다",
    "위키 06편 1.4. 간섭이 생기면 A와 B가 완전히 분리된 집단으로 기능하지 못합니다. 대조군이 더 이상 처치 없는 기준선이 아니고, "
    + "한 사람의 결과가 자기 배정뿐 아니라 다른 사람들의 배정에도 좌우됩니다. 그래서 몇 %에게 적용했느냐에 따라 효과가 달라지고, "
    + "실험에서 잰 효과가 전체 출시 효과와 다를 수 있습니다. 이 문제는 표본을 늘려도 해결되지 않습니다.");
  const items = [
    ["대조군 오염", "A가 더 이상 '처치 없는 기준선'이 아니다"],
    ["효과의 과대·과소 추정", "내 결과가 다른 사람의 배정에도 좌우된다"],
    ["ATE의 의미가 흐려진다", "Yᵢ(Tᵢ)가 아니라 Yᵢ(T₁, T₂, …, Tₙ)"],
    ["부분 적용 ≠ 전체 적용", "실험에서 잰 효과가 100% 출시 때와 다를 수 있다"],
    ["유의해도 인과는 아니다", "표본을 늘려도 안 고쳐지고, 표준오차·신뢰구간도 부정확해진다"],
  ];
  items.forEach(([h, d], i) => {
    const x = L + (i % 2) * 6.1, y = 1.95 + Math.floor(i / 2) * 1.2;
    T(s, String(i + 1).padStart(2, "0"), { x, y, w: 0.9, h: 0.6, fontSize: 30, bold: true, color: C.accent4 });
    T(s, [BR(h, { bold: true, fontSize: 20 }), R(d, { fontSize: 15, color: C.text2 })], { x: x + 1.0, y: y + 0.05, w: 4.9, h: 1.0 });
  });
  T(s, [R("실무에서 이렇게 말한다  ", { bold: true, color: C.accent1 }),
    R("\"사용자 단위로 나눈 마켓플레이스 실험이라, 이 효과는 전체 출시 효과와 다를 수 있습니다\"")], { x: 6.8, y: 4.45, w: 5.85, h: 1.2, fontSize: 15 });
  SRC(s, "위키 06편 1.4", 6.45);
}
{
  const s = content("Ch4 함정과 고급 설계", "Ch4 · 간섭 줄이기", "간섭을 줄이려면 나누는 단위를 다시 설계한다",
    "위키 07편. 핵심은 서로 영향을 주는 사용자나 자원이 A와 B 사이에 섞이지 않게 실험 단위를 다시 설계하는 것입니다. "
    + "묶어서 나눌수록 간섭은 줄지만 독립 단위 수가 줄어 검정력이 떨어집니다. 설계로 다 막지 못하면 분석 단계에서 직접 효과와 Spillover 효과를 나눠 추정합니다 "
    + "(Network-based Causal Inference, IV 등은 심화 주제).");
  const b = (t) => ({ text: t, options: { bold: true } });
  table(s, ["방법", "아이디어", "이럴 때", "대가"], [
    [b("Cluster Randomization"), "서로 영향을 주는 사용자를 묶어 통째로 배정", "친구·동네처럼 연결이 뚜렷할 때", "독립 단위 수 감소 → 검정력 저하"],
    [b("자원 분리"), "A와 B가 쓰는 자원을 나눈다", "광고 예산처럼 나눌 수 있는 자원", "실제 마켓플레이스에선 완전히 나누기 어렵다"],
    [b("Geo-based"), "지역을 실험 단위로 (지역 = 클러스터)", "지역 안 상호작용이 클 때", "지역 수가 표본 → 검정력 저하, 지역 차이"],
    [b("Switchback"), "시간 구간마다 전체를 A ↔ B로 전환", "배차·가격처럼 시장이 실시간으로 얽힐 때", "시간대별 수요 차이, 이월 효과"],
    [b("분석 단계 보정"), "직접 효과와 Spillover 효과를 나눠 추정", "설계만으로 다 막지 못할 때", "네트워크 정보와 추가 가정이 필요"],
  ], { x: L, y: 1.85, w: CW, colW: [2.6, 3.5, 3.0, 2.83], rowH: 0.62, fontSize: 15 });
  T(s, [R("기억할 것  ", { bold: true, color: C.accent1 }),
    R("클러스터·지역 단위로 나눴다면 분석의 불확실성도 그 단위로 계산합니다 (배정 단위와 분석 단위, 위키 04·09편)")],
  { x: L, y: 6.15, w: CW, h: 0.4, fontSize: 15 });
  SRC(s, "위키 07편 2.1~2.5", 6.6);
}
{
  const s = content("Ch4 함정과 고급 설계", "Ch4 · 윤리 문제", "측정할 수 있는가와 해도 되는가는 다른 질문이다",
    "위키 08편. 통계적으로 타당한 실험도 사용자에게 주는 영향을 따져야 합니다. Facebook 감정 전염 실험(2014, PNAS)은 사용자 689,003명의 뉴스피드 감정 노출을 줄였고, "
    + "충분한 사전 동의와 제외 기회가 있었는지 논란이 되어 PNAS가 편집자 우려를 표명했습니다. Facebook 투표 독려 실험(2012, Nature)은 약 6,100만 명에게 메시지를 노출했고 "
    + "친구와 친구의 친구에게까지 효과가 퍼졌다고 보고했습니다. 간섭은 통계 문제이면서 외부효과의 문제입니다.");
  T(s, [
    BR("고려할 것", { bold: true, fontSize: 14, color: C.accent6, paraSpaceAfter: 6 }),
    BR("사용자 동의와 투명성", { bold: true, fontSize: 20 }),
    BR("서비스 이용 동의 ≠ 실험 참여 동의. 감정 전염 실험(689,003명)", { fontSize: 15, color: C.text2, paraSpaceAfter: 12 }),
    BR("사용자가 받을 수 있는 피해", { bold: true, fontSize: 20 }),
    BR("지표가 오르는 것만으로 실험이 정당화되지 않는다", { fontSize: 15, color: C.text2, paraSpaceAfter: 12 }),
    BR("실험 밖으로 퍼지는 영향", { bold: true, fontSize: 20 }),
    R("간섭은 외부효과이기도 하다. 투표 독려 실험(약 6,100만 명)", { fontSize: 15, color: C.text2 }),
  ], { x: L, y: 1.95, w: 5.5, h: 4.2 });
  vline(s, 6.55, 2.0, 4.0);
  T(s, [
    BR("대응", { bold: true, fontSize: 14, color: C.accent6, paraSpaceAfter: 6 }),
    BR("실험 전 위험성 평가", { bold: true, fontSize: 20, color: C.accent1 }),
    BR("민감 영역·특정 집단 불이익·확산 가능성 점검, 필요하면 추가 동의나 Opt-out", { fontSize: 15, color: C.text2, paraSpaceAfter: 12 }),
    BR("Guardrail Metric과 점진적 노출", { bold: true, fontSize: 20, color: C.accent1 }),
    BR("1%부터 노출하며 부작용을 확인한다", { fontSize: 15, color: C.text2, paraSpaceAfter: 12 }),
    BR("중단 기준 사전 설정", { bold: true, fontSize: 20, color: C.accent1 }),
    R("오류율·신고율이 임계치를 넘으면 유의성을 기다리지 않고 멈춘다", { fontSize: 15, color: C.text2 }),
  ], { x: 6.95, y: 1.95, w: 5.7, h: 4.2 });
  SRC(s, "출처: Kramer et al. (2014), PNAS · Bond et al. (2012), Nature · 위키 08편", 6.45);
}
{
  const s = content("Ch4 함정과 고급 설계", "Ch4 · 고급 설계", "목적이 다르면 실험 방식도 다르다",
    "짧게 소개만 합니다. 밴딧은 탐색(아직 모르는 쪽도 시도)과 활용(지금 좋은 쪽에 몰아주기)의 균형 문제입니다. "
    + "인터리빙은 랭킹을 비교할 때 씁니다. 간섭에 대응하는 Cluster·Geo·Switchback은 앞 장에서 다뤘습니다.");
  const b = (t) => ({ text: t, options: { bold: true } });
  table(s, ["설계", "언제", "아이디어", "예"], [
    [b("Multi-armed Bandit"), "빨리 좋은 쪽으로 트래픽을 몰고 싶을 때", "탐색 vs 활용. Thompson Sampling, UCB, ε-greedy", "프로모션 문구, 배너"],
    [b("Interleaving"), "두 랭킹 알고리즘을 비교할 때", "두 결과를 한 목록에 섞어 어느 쪽을 클릭하는지 본다", "검색, 추천"],
  ], { x: L, y: 1.95, w: CW, colW: [2.8, 3.3, 3.6, 2.23], rowH: 0.8, fontSize: 15 });
  T(s, [BR("밴딧: 이기는 쪽은 빨리 찾지만 효과 크기 추정은 부정확", { paraSpaceAfter: 6 }),
    R("Cluster · Geo · Switchback → 간섭 줄이기 슬라이드")],
    { x: L, y: 4.75, w: CW, h: 0.9, fontSize: 15, color: C.text2 });
}
{
  const s = content("Ch4 함정과 고급 설계", "Ch4 · 실험이 불가능할 때", "실험 없이 인과를 추정하는 세 가지 방법",
    "실험을 못 할 때 쓰는 준실험(quasi-experiment) 방법입니다. DID는 처치 전 두 집단의 추세가 평행했다는 가정이 핵심입니다. "
    + "그래프는 교육용 예시입니다. 점선은 처치가 없었다면 처치 지역이 따랐을 추세(반사실)입니다.");
  const m = ["1월", "2월", "3월", "4월", "5월", "6월"];
  s.addChart(pres.ChartType.line, [
    { name: "처치 지역", labels: m, values: [10.0, 10.5, 11.0, 13.0, 13.6, 14.1] },
    { name: "비교 지역", labels: m, values: [8.0, 8.5, 9.0, 9.4, 9.9, 10.3] },
    { name: "처치가 없었다면 (반사실)", labels: m, values: [10.0, 10.5, 11.0, 11.4, 11.9, 12.3] },
  ], chartBase({ x: L, y: 1.9, w: 6.4, h: 4.3, chartColors: [HEX.blue, HEX.ink3, HEX.softBlue], lineSize: 2.5,
    lineDataSymbol: "none", showLegend: true, legendPos: "b", valAxisMinVal: 6,
    showTitle: true, title: "DID: 4월 정책 도입 전후 주문 수 · 교육용 예시" }));
  const items = [
    ["DID (이중차분)", "처치·비교 집단의 전후 변화 차이", "가정: 처치 전 추세가 평행"],
    ["RDD (회귀 불연속)", "기준선 바로 위·아래를 비교", "예: 최소주문금액 직전·직후 주문"],
    ["Synthetic Control", "여러 비교 집단을 섞어 가상의 대조군을 만든다", "예: 한 도시에만 도입한 정책"],
  ];
  T(s, items.flatMap(([h, a, b], i) => [BR(h, { bold: true, fontSize: 20, color: i === 0 ? C.accent1 : C.text1 }),
    BR(a, { fontSize: 15 }), i < items.length - 1 ? BR(b, { fontSize: 14, color: C.text2, paraSpaceAfter: 14 }) : R(b, { fontSize: 14, color: C.text2 })]),
  { x: 7.6, y: 2.0, w: 5.0, h: 4.2 });
}

// ======================================================
// Ch5
// ======================================================
section("Ch5 사례와 결정", "05", "산업 사례와 실험 문화", "그리고 의사결정으로 닫기");
{
  const s = content("Ch5 사례와 결정", "Ch5 · 산업 사례", "실험을 잘하는 회사들이 오늘 개념을 어떻게 쓰나",
    "각 회사 사례는 오늘 다룬 개념과 연결해서 소개합니다. 세부 수치는 원문(기술 블로그, 논문)에서 확인하고 인용하세요. "
    + "한국 사례는 실습에서 직접 다룹니다.");
  const b = (t) => ({ text: t, options: { bold: true } });
  table(s, ["회사", "무엇을 했나", "오늘 개념"], [
    [b("Microsoft · Bing"), "OEC를 정교하게 설계하고 CUPED로 실험 감도를 높였다", "OEC, 분산 축소"],
    [b("Netflix"), "추천 알고리즘 비교에 인터리빙을 써서 적은 표본으로 빠르게 거른다", "Interleaving"],
    [b("Booking.com"), "누구나 실험을 띄울 수 있는 실험 민주화 문화", "Experimentation Platform"],
    [b("Uber · Lyft"), "배차·가격 실험에 스위치백 설계", "Switchback, SUTVA"],
    [b("토스"), "SQL 없이 쓰는 실험·분석 플랫폼 TUBA, 푸시 디타게팅 실험", "Experimentation Platform, 실습 사례"],
  ], { x: L, y: 1.95, w: CW, colW: [2.9, 6.0, 3.03], rowH: 0.68, fontSize: 15 });
}
{
  const s = content("Ch5 사례와 결정", "Ch5 · 실험하는 조직", "실험하는 조직의 세 가지 원칙",
    "위키 11편 1장 (Kohavi 책). 데이터 기반 의사결정은 A/B 테스트뿐 아니라 조사, 유지보수 비용 추정 같은 여러 데이터로 판단한다는 뜻입니다. "
    + "토스는 실험·분석 플랫폼 TUBA를 SQL을 몰라도 쓸 수 있게 만들었고, Microsoft ExP도 같은 맥락입니다. \"거의 모든 것이 실패한다\" (댄 매킨리).");
  const cols = [
    ["데이터로 결정하고 OEC를 공식화한다", "무엇을 성공으로 볼지 먼저 정하고, 가드레일로 무엇을 훼손하면 안 되는지도 정한다", "A/B뿐 아니라 조사, 유지보수 비용 같은 여러 데이터로 판단한다"],
    ["실험 인프라와 신뢰성에 투자한다", "아이디어 → 빠른 실험 → 측정 → 판단 → 다음 실험이 반복되는 환경을 만든다", "예: 토스 TUBA, Microsoft ExP"],
    ["아이디어 평가에 서툴다는 걸 인정한다", "좋아 보이는 것 ≠ 실제로 좋은 것", "잭팟 한 번보다 많은 아이디어를 싸게 실험하는 구조"],
  ];
  cols.forEach(([h, a, d], i) => {
    const x = L + i * 4.05;
    T(s, String(i + 1).padStart(2, "0"), { x, y: 1.95, w: 1, h: 0.6, fontSize: 30, bold: true, color: C.accent1 });
    T(s, [BR(h, { bold: true, fontSize: 20, paraSpaceAfter: 8 }), BR(a, { fontSize: 15, paraSpaceAfter: 8 }),
      R(d, { fontSize: 14, color: C.text2 })], { x, y: 2.6, w: 3.7, h: 2.5 });
  });
  SRC(s, "출처: Kohavi, Tang, Xu (2020) · 위키 11편 1장", 6.45);
}
{
  const s = content("Ch5 사례와 결정", "Ch5 · 조직의 OEC", "팀마다 OEC는 달라도 같은 장기 목표를 향한다",
    "위키 11편 1.1. 좋은 OEC는 단기간에 측정 가능하고, 실험 변화에 민감하며, 회사가 원하는 장기 목표를 예측해야 합니다. "
    + "토스 푸시 실험은 푸시 CTR을 주 지표로, 앱 오픈 AU·서비스별 AU·매출 하락 방지를 가드레일로 두었습니다. "
    + "토스뱅크 신분증 촬영은 촬영 단계 통과율과 사후 검증 반려율이라는 지표 조합으로 '원활하게 통과하면서 잘못된 신분증은 걸러지는가'를 측정했습니다.");
  const b = (t) => ({ text: t, options: { bold: true } });
  table(s, ["조직·분야", "OEC 예시", "왜 이렇게 보나"], [
    [b("회사 전체"), "고객 생애가치(CLV), 장기 구매 유지율", "장기적인 사업 가치"],
    [b("검색팀"), "검색 후 구매율, 검색 성공률", "검색 품질을 개선할 수 있다"],
    [b("추천팀"), "추천을 통한 구매·장기 이용", "추천 품질을 개선할 수 있다"],
    [b("결제팀"), "결제 완료율", "결제 과정의 마찰을 줄일 수 있다"],
    [b("배송팀"), "정시 배송률, 재구매 관련 지표", "배송 경험을 개선할 수 있다"],
  ], { x: L, y: 1.9, w: 7.4, colW: [1.7, 3.2, 2.5], rowH: 0.56, fontSize: 15 });
  T(s, [
    BR("토스 · 푸시 알림", { bold: true, fontSize: 20, color: C.accent1 }),
    BR("주 지표: 푸시 CTR", { fontSize: 15 }),
    BR("가드레일: 앱 오픈 AU, 서비스별 AU, 매출 하락 방지", { fontSize: 15, color: C.text2, paraSpaceAfter: 14 }),
    BR("토스뱅크 · 신분증 촬영", { bold: true, fontSize: 20, color: C.accent1 }),
    BR("촬영 단계 통과율 + 사후 검증 반려율", { fontSize: 15 }),
    R("원활하게 통과하면서 잘못된 신분증은 걸러지는가를 지표 조합으로 측정", { fontSize: 15, color: C.text2 }),
  ], { x: 8.55, y: 1.9, w: 4.1, h: 4.0 });
  SRC(s, "출처: 토스 기술 블로그 「진짜 A/B 테스트」, 「토스뱅크가 AI로 보안과 효율도 챙기는 방법」 · 위키 11편 1.1", 6.45);
}
{
  const s = content("Ch5 사례와 결정", "Ch5 · 실험과 제품 개발", "A/B 테스트는 작게 반복하는 개발 방식과 잘 맞는다",
    "위키 11편 1.2. 온라인 서비스는 무작위 배정, 행동 측정, 기능 배포가 비교적 쉬워 실험 환경을 만들기 좋습니다. "
    + "작은 시도를 반복하며 제품을 개선하는 방식들 안에서 A/B 테스트는 측정하고 검증하는 역할을 합니다.");
  const cols = [
    ["애자일 (Agile)", "제품을 한 번에 완성하지 않고 작은 단위로 개발해 빠르게 반복 개선한다"],
    ["고객 개발 (Customer Development)", "세운 가설이 맞는지 실제 고객을 통해 계속 검증한다"],
    ["린 스타트업 (Lean Startup)", "Build → Measure → Learn을 반복하고, MVP로 큰 투자 전에 핵심 가설을 먼저 검증한다"],
  ];
  cols.forEach(([h, d], i) => {
    const x = L + i * 4.05;
    T(s, String(i + 1).padStart(2, "0"), { x, y: 1.95, w: 1, h: 0.6, fontSize: 30, bold: true, color: C.accent1 });
    T(s, [BR(h, { bold: true, fontSize: 20, paraSpaceAfter: 8 }), R(d, { fontSize: 15, color: C.text2 })], { x, y: 2.65, w: 3.7, h: 2.0 });
  });
  const flow = ["아이디어", "빠르게 실험", "측정", "판단", "다음 실험"];
  flow.forEach((t, i) => {
    const x = L + i * 2.45;
    T(s, t, { x, y: 5.0, w: 1.9, h: 0.5, fontSize: 20, bold: true, color: i === 2 ? C.accent1 : C.text1 });
    if (i < flow.length - 1) arrow(s, x + 1.85, 5.25, 0.5);
  });
  T(s, "A/B 테스트의 자리: 이 반복의 '측정·검증'", { x: L, y: 5.7, w: CW, h: 0.4, fontSize: 15, color: C.text2 });
  SRC(s, "위키 11편 1.2", 6.45);
}
{
  const s = content("Ch5 사례와 결정", "Ch5 · 실험 성숙도 모델", "실험 성숙도: Crawl → Walk → Run → Fly",
    "위키 11편 3.1 (Kohavi 책). 핵심은 실험 횟수가 아니라 측정할 수 있는가 → 믿을 수 있게 실험하는가 → 대규모로 반복할 수 있는가 → 실험이 기본 의사결정 방식인가입니다. "
    + "빈도는 대략적인 기준(rough rule of thumb)일 뿐 절대적인 경계가 아닙니다. Walk 단계의 계측 검증, A/A, SRM은 위키 09·10편에서 다룬 내용입니다.");
  const b = (t, color) => ({ text: t, options: { bold: true, color: color || HEX.ink } });
  table(s, ["단계", "핵심 목표", "조직의 모습", "실험 빈도 (대략)"], [
    [b("Crawl", HEX.ink3), "실험할 수 있는 기반 만들기", "계측·로깅, 기초 분석 역량", "월 1회 · 약 10회/년"],
    [b("Walk", HEX.teal), "신뢰할 수 있는 실험 늘리기", "표준 지표, 계측 검증, A/A, SRM", "주 1회 · 약 50회/년"],
    [b("Run", HEX.blue), "실험을 규모화하기", "OEC 공식화, 대부분의 변화를 실험으로 평가", "일 1회 · 약 250회/년"],
    [b("Fly", HEX.blue), "실험을 조직의 기본 방식으로", "자동화·셀프서비스, 조직적 기억(실험 기록 축적)", "수천 회/년"],
  ], { x: L, y: 1.9, w: CW, colW: [1.7, 3.3, 4.5, 2.43], rowH: 0.62, fontSize: 15 });
  T(s, [R("측정할 수 있는가", { bold: true }), R("  →  "), R("믿을 수 있게 실험하는가", { bold: true }), R("  →  "),
    R("대규모로 반복하는가", { bold: true }), R("  →  "), R("실험이 기본 의사결정 방식인가", { bold: true, color: C.accent1 })],
  { x: L, y: 5.6, w: CW, h: 0.45, fontSize: 15 });
  T(s, "빈도는 대략적인 기준일 뿐 절대적인 경계가 아닙니다", { x: L, y: 6.05, w: CW, h: 0.4, fontSize: 14, color: C.text2 });
  SRC(s, "출처: Kohavi, Tang, Xu (2020) · 위키 11편 3.1", 6.45);
}
{
  const s = content("Ch5 사례와 결정", "Ch5 · 실험 문화", "실험 문화를 받치는 세 가지",
    "Feature Flag는 코드 배포와 기능 노출을 분리해 램프업과 즉시 롤백을 가능하게 합니다. 실험 플랫폼은 배정·로깅·분석을 자동화해 실험 한 번의 비용을 낮춥니다. "
    + "민주화는 누구나 실험할 수 있게 하되, 가드레일과 리뷰로 품질을 지키는 것입니다.");
  const cols = [
    ["Feature Flag", "코드 배포와 기능 노출을 분리한다", "램프업, 즉시 롤백, 단계별 노출"],
    ["Experimentation Platform", "배정·로깅·분석을 자동화한다", "실험 한 번의 비용이 낮아진다"],
    ["Democratization", "누구나 가설을 실험으로 옮긴다", "대신 가드레일, SRM 자동 검사, 실험 리뷰로 품질을 지킨다"],
  ];
  cols.forEach(([h, a, b], i) => {
    const x = L + i * 4.05;
    T(s, String(i + 1).padStart(2, "0"), { x, y: 2.05, w: 1, h: 0.6, fontSize: 30, bold: true, color: C.accent1 });
    T(s, [BR(h, { bold: true, fontSize: 20 }), BR(a, { fontSize: 15, paraSpaceAfter: 8 }), R(b, { fontSize: 14, color: C.text2 })],
      { x, y: 2.75, w: 3.7, h: 2.4 });
    if (i < cols.length - 1) arrow(s, x + 3.3, 2.38, 0.55);
  });
}
{
  const s = content("Ch5 사례와 결정", "Ch5 · 의사결정", "'유의하다'에서 멈추지 말고 결정으로 닫는다",
    "결과를 읽는 순서입니다. 데이터 품질(SRM, 가드레일) → 신뢰구간 → 결정. 실습 앱의 Readout도 같은 순서로 보여줍니다. "
    + "핵심은 '유의하지 않음'을 두 가지로 나누는 것입니다. 구간이 좁으면 효과가 없다고 판단하고 접고, 넓으면 표본이 부족했던 것이니 재실험합니다.");
  const steps = [
    ["SRM이나 가드레일에 이상이 있다", "중단", "결과 해석을 멈추고 원인을 고친 뒤 다시 돌린다", HEX.neg],
    ["신뢰구간 전체가 0보다 위, 크기도 의미 있다", "배포한다", "비용·리스크를 확인하고 단계적으로 출시", HEX.pos],
    ["구간이 0을 포함하지만 좁다", "안 한다", "효과가 있어도 MDE보다 작다. 아이디어를 접는다", HEX.ink3],
    ["구간이 0을 포함하고 넓다", "재실험한다", "표본·기간을 늘리거나 설계를 고친다", HEX.warn],
  ];
  steps.forEach(([cond, out, desc, color], i) => {
    const y = 2.0 + i * 1.0;
    T(s, String(i + 1), { x: L, y, w: 0.5, h: 0.5, fontSize: 20, bold: true, color: C.accent6 });
    T(s, cond, { x: L + 0.6, y: y + 0.03, w: 5.6, h: 0.8, fontSize: 20 });
    arrow(s, 6.5, y + 0.22, 0.6, HEX.ink3);
    T(s, out, { x: 7.3, y: y - 0.02, w: 1.9, h: 0.6, fontSize: 20, bold: true, color });
    T(s, desc, { x: 9.2, y: y + 0.03, w: 3.45, h: 0.8, fontSize: 14, color: C.text2 });
  });
}
{
  const s = content("Ch5 사례와 결정", "Ch5 · 판단 프레임", "효과 크기 × 비용 × 리스크를 함께 본다",
    "배포는 통계만으로 정하지 않습니다. 효과는 점추정이 아니라 구간의 하한까지 보고, 구현·유지 비용과 리스크를 함께 놓고 판단합니다. "
    + "예: +0.8%p [0.1, 1.5]면 하한 +0.1%p일 때도 유지 비용을 넘는지 묻습니다.");
  const cols = [
    ["효과 크기", C.accent1, ["구간의 하한이어도 의미 있나?", "몇 명에게 영향을 주나?", "장기적으로 유지될 효과인가?"]],
    ["비용", C.accent5, ["구현·운영·유지보수 비용", "다른 실험 기회를 막는 비용", "복잡도가 늘어나는 비용"]],
    ["리스크", C.accent4, ["가드레일이 조금이라도 나빠졌나?", "되돌리기 어려운 변화인가?", "특정 세그먼트에 해가 가나?"]],
  ];
  cols.forEach(([h, color, qs], i) => {
    const x = L + i * 4.05;
    T(s, [BR(h, { bold: true, fontSize: 20, color, paraSpaceAfter: 10 }),
      ...qs.map((q, j) => (j < qs.length - 1 ? BR(q, { bullet: true }) : R(q, { bullet: true })))],
    { x, y: 2.05, w: 3.7, h: 2.6, fontSize: 15, paraSpaceAfter: 8 });
    if (i < 2) T(s, "×", { x: x + 3.65, y: 2.0, w: 0.4, h: 0.6, fontSize: 30, bold: true, color: C.accent6, align: "center" });
  });
  T(s, [R("실무에서 이렇게 말한다  ", { bold: true, color: C.accent1 }),
    R("\"전환율 +0.8%p, 하한 +0.1%p여도 연 유지비를 넘고 가드레일도 문제없어 50%에서 100%로 확대합니다\"")],
  { x: L, y: 5.3, w: CW, h: 0.9, fontSize: 15 });
}
{
  const s = pres.addSlide({ masterName: "COVER", sectionTitle: "Ch5 사례와 결정" });
  s._deckTopic = "summary";
  T(s, "정리", { x: L, y: 0.54, w: 7.6, h: 0.73, fontSize: 44, bold: true, color: "FFFFFF" });
  T(s, [
    BR("1   랜덤 배정이 인과를 말할 수 있게 해 준다", { paraSpaceAfter: 14 }),
    BR("2   가설·OEC·가드레일·MDE는 실험 전에 정한다", { paraSpaceAfter: 14 }),
    R("3   결과는 구간으로 읽고, 배포 · 접기 · 재실험으로 닫는다"),
  ], { x: L, y: 3.17, w: 5.2, h: 1.5, fontSize: 15, color: "FFFFFF", bold: true });
  s.addNotes("세 가지만 기억하면 됩니다. 실습에서는 조마다 실제 기업 사례 하나를 골라, 같은 가상 모집단 위에서 제출한 설계대로 실험을 시뮬레이션합니다.");
}
// ---------- 복습 퀴즈 (답은 슬라이드에 넣지 않는다. 모범 답안은 위키 12편) ----------
{
  const s = content("Ch5 사례와 결정", "복습 퀴즈 1 · 객관식", "결과를 보고 가장 먼저 해야 할 일은 무엇일까요?",
    "정답과 해설은 위키 12편에 있습니다. 1~2분 생각할 시간을 주고 손을 들어 답을 고르게 합니다.");
  T(s, "50:50으로 설계한 실험에서 B안 전환율이 +3%p, p = 0.01로 나왔습니다.", { x: L, y: 1.9, w: CW, h: 0.5, fontSize: 20 });
  T(s, [R("그런데 실제로 들어온 사용자 수는  ", { fontSize: 15, color: C.text2 }),
    R("A 50,000명", { fontSize: 30, bold: true, color: C.accent1 }), R("   ", { fontSize: 30 }),
    R("B 48,800명", { fontSize: 30, bold: true, color: C.accent3 }), R("  입니다.", { fontSize: 15, color: C.text2 })],
  { x: L, y: 2.45, w: CW, h: 0.75 });
  T(s, "가장 먼저 해야 할 일로 옳은 것을 고르세요.", { x: L, y: 3.35, w: CW, h: 0.45, fontSize: 15, bold: true, color: C.accent1 });
  ["유의하므로 B안을 배포합니다", "표본이 충분하니 신뢰구간만 확인하고 배포합니다",
    "결과 해석을 멈추고 배정·로깅 과정에서 원인을 찾습니다", "B안의 이탈 사용자를 제외하고 다시 분석합니다",
  ].forEach((t, i) => {
    const y = 3.95 + i * 0.58;
    T(s, "①②③④"[i], { x: L, y, w: 0.6, h: 0.5, fontSize: 20, bold: true, color: C.accent1 });
    T(s, t, { x: L + 0.6, y, w: CW - 0.6, h: 0.5, fontSize: 20 });
  });
}
{
  const s = content("Ch5 사례와 결정", "복습 퀴즈 2 · 주관식", "이 기능의 실험을 직접 설계해 보세요",
    "모범 답안과 채점 포인트는 위키 12편에 있습니다. 조별로 5분 정도 토의하고 한두 조가 발표합니다.");
  T(s, [R("중고거래 앱에서 "), R("판매자에게 적정 가격을 추천하는 기능", { bold: true, color: C.accent1 }), R("을 실험하려고 합니다.")],
    { x: L, y: 1.9, w: CW, h: 0.5, fontSize: 20 });
  T(s, "아래 세 가지 질문에 답하세요.", { x: L, y: 2.5, w: CW, h: 0.45, fontSize: 15, bold: true, color: C.accent1 });
  [["가설", "한 문장으로 써 보세요"], ["지표", "Primary 지표와 Guardrail 지표를 하나씩 정해 보세요"],
    ["실험 단위", "사용자 단위로 나누면 어떤 문제가 생길 수 있는지, 대안은 무엇인지 써 보세요"]].forEach(([h, d], i) => {
    const x = L + i * 4.05;
    T(s, String(i + 1).padStart(2, "0"), { x, y: 3.2, w: 1.0, h: 0.6, fontSize: 30, bold: true, color: C.accent1 });
    T(s, [BR(h, { bold: true, fontSize: 20 }), R(d, { fontSize: 15, color: C.text2 })], { x, y: 3.9, w: 3.7, h: 1.2 });
  });
}
addReferenceSlides();

function stageDivider(num, title, desc, key) {
  const s = pres.addSlide({ masterName: "SECTION" });
  s.addText(num, { placeholder: "num" });
  s.addText(title, { placeholder: "title" });
  s.addText(desc, { placeholder: "desc" });
  s._deckTopic = key;
  return s;
}

function reorderForWiki() {
  const stages = [
    { key: "stage-1", num: "01", title: "A/B 테스트의 기본 구조", desc: "기초용어와 실험이 필요한 이유", topics: ["00", "01"] },
    { key: "stage-2", num: "02", title: "A/B 테스트 설계", desc: "문제 정의와 가설, 지표, 실험 단위, 운영 설계", topics: ["02", "03", "04", "05"] },
    { key: "stage-3", num: "03", title: "신뢰할 수 있는 실험의 조건", desc: "간섭 문제와 해결 방법, 윤리", topics: ["06", "07", "08"] },
    { key: "stage-4", num: "04", title: "실험 실행과 데이터 기반 문화", desc: "결과 해석, 실무 함정, 실험 플랫폼, 복습", topics: ["09", "10", "11", "12"] },
  ];
  const dividers = stages.map((stage) => stageDivider(stage.num, stage.title, stage.desc, stage.key));
  const authored = pres._slides.filter((slide) => slide._deckTopic !== "legacy-section" && !slide._deckTopic?.startsWith("stage-"));
  const byTopic = (topic) => authored.filter((slide) => slide._deckTopic === topic);
  const opening = [...byTopic("cover"), ...byTopic("opening")];
  const summary = byTopic("summary");
  const reference = byTopic("reference");
  const ordered = [...opening];

  stages.forEach((stage, index) => {
    ordered.push(dividers[index]);
    stage.topics.forEach((topic) => {
      if (topic === "12") {
        ordered.push(...summary);
      }
      ordered.push(...byTopic(topic));
    });
    if (index === stages.length - 1) ordered.push(...reference);
  });

  const expected = authored.length + dividers.length;
  if (ordered.length !== expected) {
    const missing = authored.filter((slide) => !ordered.includes(slide)).map((slide) => slide._deckTitle || slide._deckTopic);
    throw new Error(`위키 순서 재구성 누락: ${missing.join(", ")}`);
  }

  // ponytail: pptxgenjs가 공개 재정렬 API를 제공하면 내부 배열 접근을 교체한다.
  pres._slides = ordered;
  ordered.forEach((slide, index) => {
    slide._name = `Slide ${index + 1}`;
    slide._slideNum = index + 1;
    slide._rId = index + 2;
    slide._slideId = index + 256;
  });

  pres._sections = [
    { _type: "user", title: "오프닝", _slides: opening },
    ...stages.map((stage, index) => ({
      _type: "user",
      title: stage.title,
      _slides: [dividers[index], ...stage.topics.flatMap((topic) => [
        ...(topic === "12" ? summary : []),
        ...byTopic(topic),
      ]), ...(index === stages.length - 1 ? reference : [])],
    })),
  ];
}

reorderForWiki();

// ---------- 저장 + 테마 색 + 한글(ea) 폰트 ----------
// pptxgenjs는 테마 색을 쓰지 못해 저장 후 theme1.xml의 색 구성표를 THEME 값으로 바꾼다.
const SLOTS = ["dk1", "lt1", "dk2", "lt2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6", "hlink", "folHlink"];
(async () => {
  await pres.writeFile({ fileName: OUT });
  const zip = await JSZip.loadAsync(fs.readFileSync(OUT));
  const part = "ppt/theme/theme1.xml";
  const scheme = `<a:clrScheme name="${THEME.name}">`
    + SLOTS.map((k) => `<a:${k}><a:srgbClr val="${THEME.colors[k]}"/></a:${k}>`).join("") + "</a:clrScheme>";
  const xml = (await zip.file(part).async("string"))
    .replace(/<a:clrScheme[\s\S]*?<\/a:clrScheme>/, scheme)
    .replace(/(<a:(?:theme|fontScheme)\b[^>]*?\bname=")[^"]*"/g, `$1${THEME.name}"`)
    .replace(/<a:ea typeface=""\/>/g, `<a:ea typeface="${KO_FONT}"/>`);
  zip.file(part, xml);
  const visibleParts = Object.keys(zip.files).filter((name) =>
    name === "ppt/presentation.xml" || /^ppt\/(?:slides|notesSlides)\/.*\.xml$/.test(name));
  for (const name of visibleParts) {
    const contents = await zip.file(name).async("string");
    if (/Ch[1-5]/.test(contents)) throw new Error(`이전 챕터 표기가 남았습니다: ${name}`);
  }
  fs.writeFileSync(OUT, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
  console.log("wrote", OUT);
})();
