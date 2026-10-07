# 이론 파트 PPT 생성 스크립트

`docs/lecture/ab-testing-theory.pptx`를 코드로 만드는 스크립트입니다. 슬라이드 내용, 배치, 글씨 크기, 발표자 노트가 모두 `build.js`에 들어 있습니다. PPT를 직접 고치지 말고 `build.js`를 고친 뒤 다시 생성합니다.

## 실행

```bash
cd docs/lecture/build
npm install          # 처음 한 번 (pptxgenjs, jszip)
npm run build        # ../ab-testing-theory.pptx 를 덮어씀
node build.js /tmp/test.pptx   # 다른 경로로 만들어 보기
```

- Node.js 18 이상
- 폰트는 Apple SD Gothic Neo로 지정됩니다. Windows용으로 만들려면 `KO_FONT="Malgun Gothic" npm run build`
- Bing 그림은 `docs/ab-testing/images/01-bing-long-title.png`를 읽습니다.

## 구조

| 위치 | 내용 |
| --- | --- |
| `THEME`, `HEX` | 색 구성 (`reference/prototype.html` 토큰 기준) |
| `defineSlideMaster` 3개 | 표지(COVER), 장 표지(SECTION), 본문(CONTENT) 레이아웃 |
| 헬퍼 (`T`, `table`, `dot`, `arrow`, `SRC` …) | 텍스트·표·점 모티프·화살표·출처 줄 |
| 장별 블록 | `content("Ch2 설계 구성요소", "Ch2 · 가설 수립", "제목", "발표자 노트")`로 시작하는 블록 하나가 슬라이드 한 장 |

슬라이드를 추가하려면 원하는 위치에 같은 형태의 블록을 넣습니다. 글씨 크기와 디자인 규칙은 저장소 `CLAUDE.md`의 "강의 PPT 작성 규칙"을 따릅니다.

## 확인 (선택)

LibreOffice로 렌더링해 넘침·겹침을 확인할 수 있습니다. 한글이 보이지 않으면 LibreOffice 프로필의 `user/fonts` 폴더에 한글 폰트 파일을 넣고 그 프로필로 변환합니다.

```bash
soffice -env:UserInstallation=file:///tmp/lo-profile --headless --convert-to pdf ../ab-testing-theory.pptx
# 한글이 안 보이면: mkdir -p /tmp/lo-profile/user/fonts && cp /System/Library/Fonts/AppleSDGothicNeo.ttc /tmp/lo-profile/user/fonts/
```
