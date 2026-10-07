# A/B 테스트 실무 (1): 실험 실행과 결과 해석

[← 이전 글](08-ethics.md) · [목차](README.md) · [다음 글 →](10-experimentation-platform.md)

> **작성 상태:** 원문을 작성하기 전이라 다룰 내용의 개요만 있습니다.

## 1. 실험 실행과 결과 해석

### 1.1 A/A 테스트와 실험 시스템 검증

- A/A 테스트란?
- A/A 테스트를 하는 이유
- Randomization / Logging / Metric Pipeline 검증
- A/A 테스트에서 이상이 발견되는 경우

### 1.2 Ramp-up과 실험 기간

- Ramp-up의 목적
- 단계적 트래픽 확대
- 실험 리스크와 Guardrail Metric
- 요일 효과
- Novelty Effect / Primacy Effect *(앞의 [반복 노출](04-experimental-unit.md) 내용과 연결)*

### 1.3 통계 검정과 결과 해석

- 지표에 따른 검정 선택
  - z-test
  - t-test
  - Chi-squared test
- p-value의 올바른 해석
- Confidence Interval
- 통계적 유의성 vs 실질적 효과

### 1.4 반복 검정과 다중검정 문제

- Peeking Problem
- Multiple Comparison Problem
- Bonferroni Correction
- FDR / Benjamini-Hochberg

### 1.5 실험 민감도 향상

- 왜 분산을 줄이는가
- CUPED
- Pre-experiment Data를 활용하는 원리
- CUPED 적용 전후의 직관적인 비교

## Reference

- [OCE-Materials/발표 자료/20240507_A:A 테스트.pdf at main · CausalInferenceLab/OCE-Materials](https://github.com/CausalInferenceLab/OCE-Materials/blob/main/%EB%B0%9C%ED%91%9C%20%EC%9E%90%EB%A3%8C/20240507_A%3AA%20%ED%85%8C%EC%8A%A4%ED%8A%B8.pdf)
