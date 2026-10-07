# 배포와 부하 점검 (M9)

## 배포
- Vercel 에 이 레포를 Import, 환경변수(Production and Preview)
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, (나중에) `UPSTAGE_API_KEY`.
  `UPSTAGE_API_KEY` 가 없으면 AI 리뷰·브리핑은 샘플(mock)로 동작한다.
- 함수 지역은 `vercel.json` 의 `regions` 로 Supabase 지역(ap-northeast-2, 서울)에 맞춘다. 기본값(iad1)이면 요청 하나가 DB 쿼리 2~3번의 대륙 간 왕복이라 약 2초가 걸렸다.

## 부하 점검
강사 화면에서 테스트용 수업을 만들고 s0_pick, s2_design, s3_run, s4_readout 을 연 뒤:

    node scripts/loadtest.mjs <배포주소> <수업코드> [조 수=10] [시뮬 반복=3] [사례당 최대 조 수=2]

실제 DB 에 "부하N조" 기록이 남으므로 점검 뒤 테스트 수업을 지운다.

## Realtime 점검
강사 화면에서 스텝 열기/마감, 정답 공개, 조 입장이 조 화면과 같은 방식(anon 키 + postgres_changes)으로 수신되는지 본다.
스크립트를 먼저 띄운 뒤 강사 화면에서 직접 바꾸고, 도착한 이벤트가 로그에 찍히는지 확인한다(공개 키만 사용, 값은 출력하지 않음).

    node --env-file=.env.local scripts/realtime-check.mjs <수업코드> [대기초=120]

anon 으로 아무 행도 안 보이면 데이터가 지워졌거나(테스트 수업 삭제 등) RLS 읽기 정책이 빠진 것이다. 새 수업을 만들어 `classes`·`step_states` 9행이 보이는지 먼저 본다.
