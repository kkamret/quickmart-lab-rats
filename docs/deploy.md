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
