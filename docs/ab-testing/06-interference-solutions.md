# 신뢰할 수 있는 A/B 테스트의 조건 (2): 간섭(Interference) 문제의 해결 방법

[← 이전 글](05-interference.md) · [목차](README.md) · [다음 글 →](07-ethics.md)

## 2. 간섭 문제의 해결 방법

간섭이 예상되는 환경에서는 단순히 사용자를 Treatment와 Control로 무작위 배정하는 것만으로는 충분하지 않을 수 있습니다. 핵심은 <strong>서로 영향을 주는 사용자나 자원이 Treatment와 Control 사이에 섞이지 않도록 실험 단위를 재설계하는 것</strong>입니다.

### 2.1 Cluster Randomization

일반적인 A/B 테스트는 개별 사용자를 무작위로 Treatment와 Control에 배정하는 **User-level Randomization**을 사용합니다.

하지만 사용자 간 상호작용이 강한 서비스에서는 서로 연결된 사용자들이 다른 그룹에 배정되면서 간섭이 발생할 수 있습니다. 이를 줄이기 위해 <strong>서로 영향을 주는 사용자들을 하나의 Cluster로 묶고, Cluster 단위로 Treatment 또는 Control을 배정</strong>할 수 있습니다.

```text
기존: User-level Randomization

친구 A → Treatment
친구 B → Control
친구 C → Treatment

→ 서로 연결된 사용자 사이에서 간섭 발생 가능


개선: Cluster Randomization

친구 A ┐
친구 B ├ 하나의 Cluster → Treatment
친구 C ┘
```

이렇게 하면 같은 네트워크 안의 사용자들이 동일한 Treatment를 받기 때문에 Treatment와 Control 사이의 Spillover를 줄일 수 있습니다.

다만 개별 사용자가 아니라 Cluster가 하나의 실험 단위가 되기 때문에 <strong>실질적인 독립 실험 단위의 수가 감소하고 통계적 검정력이 낮아질 수 있다는 단점</strong>이 있습니다.

### 2.2 공유 자원의 분리(Resource Isolation)

간섭이 사용자 간 관계가 아니라 <strong>공유 자원을 통해 발생한다면</strong>, Treatment와 Control이 사용하는 자원을 분리하는 방법을 고려할 수 있습니다.

예를 들어 광고 실험에서 두 그룹이 동일한 광고 예산을 사용한다면 Treatment 그룹의 예산 소진이 Control 그룹에 영향을 미칠 수 있습니다.

```text
전체 광고 예산을 공동 사용
        ↓
Treatment가 많이 사용
        ↓
Control이 사용할 예산 감소
```

이를 방지하기 위해 아래처럼 자원을 분리할 수 있습니다.

```text
전체 광고 예산
       ↓
┌─────────────────┐
Treatment용 예산   Control용 예산
```

즉, <strong>Treatment 그룹의 행동이 Control 그룹이 사용할 수 있는 자원의 양이나 상태를 변화시키지 않도록 실험 환경 자체를 분리하는 방법</strong>입니다.

다만 실제 Marketplace처럼 공급자와 수요자가 같은 시장에서 계속 상호작용하는 경우에는 자원을 완전히 분리하기 어려울 수 있습니다.

### 2.3 Geo-based Randomization

사용자 간 영향을 완전히 차단하기 어렵다면 <strong>개별 사용자가 아니라 지역(Geo)을 실험 단위로 사용하는 방법</strong>도 있습니다.

```text
강남구 → Treatment
서초구 → Control
송파구 → Treatment
```

특정 지역에 속한 사용자 전체에게 동일한 Treatment를 적용함으로써, <strong>지역 내부에서 발생하는 사용자 간 상호작용을 같은 실험군 안에 포함시키는 방식</strong>입니다.

넓게 보면 Cluster Randomization에서 <strong>지역을 하나의 Cluster로 사용하는 경우</strong>라고 이해할 수 있습니다.

다만 지역별로 사용자 특성이나 시장 상황이 다를 수 있고, 사용자 수가 많더라도 실제 Randomization 단위는 지역의 수이기 때문에 <strong>표본 수와 검정력이 줄어들 수 있습니다.</strong>

### 2.4 Switchback Design

Marketplace에서는 Treatment와 Control의 자원을 공간적으로 완전히 분리하기 어려운 경우가 있습니다. 이런 경우 <strong>공간이 아니라 시간을 기준으로 실험 조건을 변경</strong>하는 Switchback Design을 사용할 수 있습니다.

```text
09:00–10:00  Control
10:00–11:00  Treatment
11:00–12:00  Control
12:00–13:00  Treatment
```

일정 시간 동안은 모든 사용자에게 Control을 적용하고, 다음 시간에는 모든 사용자에게 Treatment를 적용합니다.

핵심은 <strong>같은 시간과 같은 시장 안에서 Treatment 사용자와 Control 사용자가 동시에 경쟁하지 않도록 만드는 것</strong>입니다.

따라서 제한된 공급과 수요가 실시간으로 상호작용하는 Marketplace에서 발생하는 간섭을 줄이는 데 활용할 수 있습니다.

다만 시간대별 수요 차이나 이전 시간대 Treatment의 영향이 다음 시간대까지 남는 <strong>Carryover Effect(이월 효과)</strong> 등을 함께 고려해야 합니다.

### 2.5 분석 단계에서 간섭 효과 고려

현실에서는 실험 설계만으로 간섭을 완전히 제거하기 어려울 수 있습니다.

이 경우에는 간섭을 단순한 오류로 무시하기보다 <strong>직접 효과(Direct Effect)와 다른 사용자에게 전달된 효과(Spillover Effect)를 구분하여 추정</strong>하는 분석 방법을 사용할 수 있습니다.

예를 들어 다음과 같은 접근이 있습니다.

- Network-based Causal Inference
- Instrumental Variable(IV)을 활용한 추정
- 네트워크의 연결 관계를 고려한 분석
- Direct Effect와 Spillover Effect의 개별 추정

각각의 방법론들은 심화 공부 때 다뤄볼 예정입니다.

## Reference

- Trustworthy Online Controlled Experiments : A Practical Guide to A/B Testing
- [https://experimentguide.com/](https://experimentguide.com/)
- [\[인과추론\] A/B Test 설계 시 실험군 간의 누출 및 간섭](https://ysyblog.tistory.com/408)
- [Violation of SUTVA in A/B Testing: network interference \| Jongmin Mun](https://jong-min.org/blog/2025/exp-network-interference/)
- [OCE-Materials/발표 자료/20240528_실험간의 누출 및 간섭.pdf at main · CausalInferenceLab/OCE-Materials](https://github.com/CausalInferenceLab/OCE-Materials/blob/main/%EB%B0%9C%ED%91%9C%20%EC%9E%90%EB%A3%8C/20240528_%EC%8B%A4%ED%97%98%EA%B0%84%EC%9D%98%20%EB%88%84%EC%B6%9C%20%EB%B0%8F%20%EA%B0%84%EC%84%AD.pdf)
- [Causal Inference Workshop 2022 - Applications of Causal Inference in Product Analytics (SlideShare)](https://www.slideshare.net/slideshow/causal-inference-workshop-2022-applications-of-causal-inference-in-product-analytics/267698546)
- [\[메이플스토리\] 메이플옥션(경매장)에 대해 알아보자.](https://edmblackbox.tistory.com/810)
