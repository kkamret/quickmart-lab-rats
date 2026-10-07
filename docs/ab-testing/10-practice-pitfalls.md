# A/B 테스트 실무 (2): 실무 함정과 대응

[← 이전 글](09-practice-execution.md) · [목차](README.md) · [다음 글 →](11-experimentation-platform.md)

> **작성 상태:** 원문을 작성하기 전이라 다룰 내용의 개요만 있습니다.

## 2. 실무 함정과 대응

> **핵심 개념:** SRM, Sequential Testing

### 2.1 Sample Ratio Mismatch(SRM): 실험 결과를 보기 전에 실험 자체가 정상인지 확인

- 기대 배정 비율 vs 실제 배정 비율
- SRM이 발생하는 대표 원인: 배정·노출·로깅 문제
- SRM이 있으면 왜 효과 추정을 믿기 어려운가

### 2.2 Peeking Problem의 대응: Sequential Testing

- Peeking Problem 복습 ([앞 글](09-practice-execution.md) 내용 한 장 요약)
- 고정 표본 검정과 Sequential Testing의 차이
- Always-Valid p-value (개념 수준)

### 2.3 실험 결과를 왜곡하는 데이터 편향

- Survivorship Bias 등 대표 사례 1~2개

### 2.4 실험 결과를 보기 전 체크리스트

- SRM → 계측 이상 → 사전 정의 지표 → 검정·해석 순서로 확인

## Reference

- [A/B Testing Pitfalls: How Marketers Can Avoid Costly Mistakes](https://blogs.oracle.com/marketingcloud/ab-testing-pitfalls-how-marketers-can-avoid-costly-mistakes)
