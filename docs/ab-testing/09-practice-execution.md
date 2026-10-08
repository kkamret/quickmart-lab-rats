# A/B 테스트 실무 (1): 실험 실행과 결과 해석

[← 이전 글](08-ethics.md) · [목차](README.md) · [다음 글 →](10-practice-pitfalls.md)

## 1. 실험 실행과 결과 해석

앞에서는 가설, 지표, 실험 단위, 표본 수와 배정 방식처럼 **실험을 시작하기 전에 정해야 하는 것들**을 살펴봤습니다.

이번에는 실제로 실험을 실행한 뒤 <strong>“이 결과를 믿어도 되는가?”</strong>에 조금 더 초점을 맞춰보려고 합니다.

실험을 랜덤하게 나눴다고 해서 결과가 자동으로 신뢰할 수 있는 것은 아닙니다. 배정 로직이 잘못될 수도 있고, 로그가 일부 빠질 수도 있고, 우연히 나온 차이를 진짜 효과라고 착각할 수도 있습니다. 그래서 실제 A/B 테스트에서는 Treatment Effect를 보기 전에 <strong>실험 시스템 자체가 정상인지 확인하고, 결과를 어떤 기준으로 해석할지 미리 정해두는 과정</strong>이 중요합니다.

### 1.1 A/A 테스트와 실험 시스템 검증

A/A 테스트는 이름 그대로 **A와 A를 비교하는 실험**입니다.

사용자는 Control과 Treatment로 무작위 배정되지만, 두 그룹 모두에게 **완전히 동일한 경험**을 제공합니다.

> User → Group A: 기존 화면 / Group A': 기존 화면

그렇다면 똑같은 화면을 보여주는데 굳이 왜 실험을 할까요?

A/A 테스트의 목적은 제품 기능의 효과를 검증하는 것이 아니라, <strong>A/B 테스트를 실행하고 분석하는 전체 파이프라인이 정상적으로 동작하는지 확인하는 것</strong>입니다.

Ron Kohavi 등의 연구에서는 A/A 테스트를 온라인 실험 플랫폼의 신뢰성을 확인하는 중요한 방법으로 제안합니다. 실제로 두 그룹이 같은 경험을 받았는데도 반복적으로 차이가 발생한다면, Treatment가 아니라 실험 시스템 어딘가에 문제가 있을 가능성이 있기 때문입니다.

#### 1.1.1 A/A 테스트에서 확인하는 것

A/B 테스트의 결과가 나오기까지는 생각보다 많은 단계가 있습니다.

> 사용자 → Randomization → Exposure → Logging → Metric Calculation → Statistical Analysis

A/A 테스트는 이 전체 흐름을 실제 A/B 테스트와 동일하게 통과시킵니다.

<table header-row="true">
<tr>
<td>확인 영역</td>
<td>발생할 수 있는 문제</td>
</tr>
<tr>
<td>Randomization</td>
<td>특정 국가·브라우저·사용자군이 한 그룹에 더 많이 배정됨</td>
</tr>
<tr>
<td>Exposure</td>
<td>배정은 되었지만 한쪽 그룹만 실제 기능에 노출되지 않음</td>
</tr>
<tr>
<td>Logging</td>
<td>특정 Variant의 이벤트가 누락되거나 중복 기록됨</td>
</tr>
<tr>
<td>Metric Pipeline</td>
<td>그룹마다 집계 기준이나 필터가 다르게 적용됨</td>
</tr>
<tr>
<td>Variance / SE</td>
<td>반복 관측을 독립 표본처럼 처리해 불확실성을 지나치게 작게 계산함</td>
</tr>
</table>

즉, A/A 테스트는 단순히 “두 그룹의 평균이 비슷하다”만 보는 것이 아니라 <strong>실험을 믿기 전에 시스템부터 검증하는 테스트</strong>라고 이해하면 됩니다.

#### 1.1.2 A/A 테스트에서 p-value가 0.05보다 작으면 실패인가?

여기서 주의할 점이 하나 있습니다.

두 그룹이 정말 동일하더라도 표본을 무작위로 나누면 **우연한 차이**는 생길 수 있습니다. 유의수준을 5%로 설정했다면, 귀무가설이 참인 실험을 매우 많이 반복했을 때 일부 실험에서는 우연히 p-value가 0.05보다 작게 나올 수 있습니다.

따라서 <strong>A/A 테스트 한 번에서 유의한 결과가 나왔다고 바로 시스템이 고장났다고 결론 내리면 안 됩니다.</strong>

대신 다음과 같은 패턴을 봐야 합니다.

- A/A 테스트를 반복했을 때 유의한 결과가 지나치게 자주 발생하는가
- 특정 지표가 계속 한쪽 방향으로 차이가 나는가
- 특정 브라우저·국가·기기에서만 차이가 발생하는가
- 계산한 표준오차보다 실제 A/A 결과의 변동이 훨씬 큰가

특히 마지막은 중요합니다. 앞에서 Randomization Unit과 Analysis Unit이 다를 때 표준오차를 잘못 계산할 수 있다고 살펴봤는데, A/A 테스트는 <strong>우리가 계산한 불확실성이 실제 변동성을 제대로 반영하는지 확인하는 현실적인 방법</strong>이 될 수 있습니다.

> <strong>A/A 테스트의 핵심은 “차이가 없어야 한다”가 아니라, 차이가 없는 상황에서 우리 실험 시스템이 차이를 만들어내고 있지는 않은지 확인하는 것입니다.</strong>

### 1.2 Ramp-up과 실험 기간

A/A 테스트를 통과했다고 해서 새로운 Treatment를 처음부터 전체 사용자에게 노출하는 것은 위험할 수 있습니다.

새 기능에 예상하지 못한 버그가 있거나, 서버 부하가 급격히 증가하거나, 결제 같은 핵심 기능이 망가질 수도 있기 때문입니다. 그래서 실제 온라인 실험에서는 Treatment의 노출 비율을 조금씩 늘리는 **Ramp-up** 전략을 사용합니다.

#### 1.2.1 Ramp-up이란?

Ramp-up은 <strong>Treatment에 노출되는 사용자 비율을 단계적으로 증가시키는 과정</strong>입니다.

> 예: 1% → 5% → 10% → 25% → 50%

다만 이 비율 자체가 정해진 표준은 아닙니다.

서비스 규모, Treatment의 위험도, 트래픽, 장애 발생 시 영향 범위에 따라 단계는 달라질 수 있습니다.

중요한 것은 <strong>처음에는 작은 범위에서 치명적인 문제를 확인하고, 문제가 없을 때 점점 노출을 늘린다</strong>는 원칙입니다.

초기 Ramp-up 단계에서는 Primary Metric의 통계적 유의성을 판단하기보다 다음과 같은 항목을 먼저 확인합니다.

- 오류율이나 Crash Rate가 급격히 증가하지 않는가
- 페이지 로딩 시간이나 서버 부하가 악화되지 않는가
- Exposure / Logging이 정상적으로 기록되는가
- 예상하지 못한 Guardrail 악화가 발생하지 않는가

초기에는 표본 자체가 작기 때문에 Primary Metric의 p-value가 크게 흔들릴 수 있습니다. 따라서 <strong>“1%에서 효과가 좋아 보이니 바로 확대한다”</strong> 같은 방식으로 Ramp-up과 효과 검정을 섞어버리면 Peeking과 비슷한 문제가 생길 수 있습니다.

Ramp-up은 기본적으로 <strong>효과를 빨리 찾기 위한 절차라기보다 위험을 제한하기 위한 절차</strong>입니다.

#### 1.2.2 실험은 얼마나 오래 해야 할까?

필요 표본 수와 Power Analysis는 [설계 기초 (4) 실제 실험 운영 설계](05-experiment-operations.md)에서 이미 다뤘기 때문에 여기서는 반복하지 않겠습니다.

운영 관점에서는 <strong>계산된 표본 수를 언제 채웠느냐만으로 실험을 끝내면 안 되는 경우가 있다</strong>는 점이 중요합니다.

대표적인 이유가 **요일 효과**입니다.

예를 들어 숙박 예약 서비스라면 평일과 주말의 검색·예약 패턴이 다를 수 있습니다. 목요일에 실험을 시작해서 월요일에 표본 수가 찼다고 바로 종료하면, 특정 요일의 사용자 행동이 결과에 과도하게 반영될 수 있습니다.

그래서 주간 패턴이 있는 서비스에서는 보통 <strong>최소한 하나의 완전한 주기를 포함하는지</strong> 확인해야 합니다. 실무에서 1~2주라는 기간이 자주 언급되는 이유도 여기에 있지만, <strong>“A/B 테스트는 무조건 2주” 같은 규칙이 있는 것은 아닙니다.</strong>

트래픽이 적다면 필요한 표본을 얻는 데 더 오래 걸릴 수 있고, 반대로 트래픽이 매우 많더라도 아래와 같은 시간 효과를 확인하기 위해 충분한 기간이 필요할 수 있습니다.

#### 1.2.3 Novelty Effect / Primacy Effect

이 두 개념은 앞선 반복 노출 파트에서 이미 현상 자체를 설명했기 때문에 여기서는 이름만 연결해보겠습니다.

- **Novelty Effect**: 새 기능이라는 이유만으로 초기에 관심이 커졌다가 시간이 지나면서 효과가 감소하는 현상
- **Primacy Effect**: 기존 방식에 익숙한 사용자가 새로운 방식에 적응하는 데 시간이 필요해, 초반 효과가 작거나 부정적이었다가 시간이 지나며 좋아지는 현상

즉, 둘 다 공통적으로 <strong>Treatment Effect가 시간에 따라 일정하지 않을 수 있다는 문제</strong>입니다.

> Novelty: 초반 효과 큼 → 시간이 지나며 감소
>
> Primacy: 초반 효과 작음 → 시간이 지나며 증가

따라서 눈에 띄는 UI 변경이나 사용자가 학습해야 하는 기능이라면 전체 평균만 보는 것보다 <strong>실험 시작 후 시간에 따라 Treatment Effect가 안정되는지</strong> 함께 확인하는 것이 좋습니다.

> 실험 기간은 “몇 일이 정답인가?”보다 <strong>필요한 표본을 확보했고, 서비스의 주요 행동 주기를 포함했으며, 초기 시간 효과가 결과를 지배하고 있지 않은가?</strong>로 판단하는 것이 더 적절합니다.

### 1.3 통계 검정과 결과 해석

이제 실제로 Control과 Treatment의 지표 차이를 확인했다고 해봅시다.

> Control CVR = 10.0%
>
> Treatment CVR = 10.8%

Treatment가 0.8%p 높습니다.

하지만 이 차이가 정말 Treatment 때문에 발생한 것인지, 아니면 무작위 배정 과정에서 우연히 생긴 차이인지를 판단해야 합니다. 여기서 통계적 가설검정을 사용합니다.

앞에서 실험 단위와 분석 단위에 따른 독립성 문제를 이미 다뤘으므로, 아래 검정들은 <strong>분석에 필요한 독립성 및 분산 구조가 적절히 처리되어 있다는 전제</strong>에서 살펴보겠습니다.

#### 1.3.1 어떤 검정을 사용해야 하는가?

A/B 테스트에서는 지표의 형태에 따라 사용하는 검정이 달라집니다.

<table header-row="true">
<tr>
<td>지표</td>
<td>예시</td>
<td>대표적인 검정</td>
</tr>
<tr>
<td>비율</td>
<td>CTR, CVR, 구매 여부</td>
<td>Two-proportion z-test</td>
</tr>
<tr>
<td>평균값</td>
<td>사용자당 매출, 사용시간</td>
<td>Two-sample t-test (보통 Welch t-test)</td>
</tr>
<tr>
<td>범주형 분포</td>
<td>결제수단 구성, 그룹 배정 비율</td>
<td>Chi-squared test</td>
</tr>
</table>

**z-test**는 대표적으로 두 집단의 비율 차이를 검정할 때 사용할 수 있습니다. 예를 들어 Control의 구매전환율이 10%, Treatment가 11%일 때 두 비율의 차이가 우연으로 설명 가능한 수준인지 확인합니다.

**t-test**는 두 집단의 평균을 비교할 때 사용합니다. 사용자당 매출이나 평균 사용시간처럼 연속형 지표의 평균 차이를 비교하는 상황이 대표적입니다. 두 집단의 분산이 같다고 강하게 가정할 이유가 없다면 일반적으로 Welch t-test를 사용하는 편이 안전합니다.

**Chi-squared test**는 범주형 변수의 분포가 기대한 분포와 다른지 확인할 때 사용합니다. 뒤에서 살펴볼 Sample Ratio Mismatch처럼 “원래 50:50으로 나뉘어야 하는데 실제 사용자 수가 이상하게 차이 나는가?”를 검사할 때도 활용할 수 있습니다.

여기서 중요한 것은 검정 이름을 외우는 것보다 <strong>지표가 무엇을 측정하고 있고, 어떤 단위에서 계산되며, 관측치 사이의 독립성을 어떻게 처리했는가</strong>입니다.

#### 1.3.2 p-value는 무엇을 의미하는가?

A/B 테스트 결과에서 가장 자주 보는 숫자 중 하나가 p-value입니다.

p-value는

> <strong>귀무가설이 참이라고 가정했을 때, 현재 관찰한 결과와 같거나 그보다 더 극단적인 결과를 얻을 확률</strong>

입니다.

예를 들어

> H0: Treatment와 Control의 CVR 차이는 0이다.
>
> p-value = 0.03

이라면, <strong>실제로 차이가 없다는 가정 아래 현재와 같은 수준 이상의 차이가 관측될 확률이 3% 정도</strong>라는 의미입니다.

반대로 다음과 같이 해석하면 안 됩니다.

- ❌ “Treatment가 효과 없을 확률이 3%다.”
- ❌ “Treatment가 더 좋을 확률이 97%다.”
- ❌ “p-value가 작을수록 효과가 크다.”

p-value는 **효과의 크기**를 알려주는 숫자가 아닙니다.

표본이 매우 크다면 실제로는 거의 의미 없는 0.1%p 차이도 통계적으로 유의할 수 있고, 반대로 표본이 작으면 꽤 큰 차이가 보여도 유의하지 않을 수 있습니다.

그래서 p-value 하나만으로 실험의 성공 여부를 판단하기보다 <strong>효과 크기와 Confidence Interval을 같이 봐야 합니다.</strong>

#### 1.3.3 Confidence Interval

Confidence Interval(신뢰구간)은 Treatment Effect가 어느 정도의 범위에 있을지에 대한 **추정의 불확실성**을 보여줍니다.

예를 들어 결과가 다음과 같다고 해봅시다.

> Treatment Effect = +0.8%p
>
> 95% CI = [+0.2%p, +1.4%p]

점추정값만 보면 “효과는 +0.8%p”라고 말할 수 있지만 실제 데이터에는 불확실성이 존재합니다. 신뢰구간을 같이 보면 <strong>작게는 +0.2%p, 크게는 +1.4%p 정도의 효과와 데이터가 양립할 수 있다</strong>는 식으로 결과의 범위를 볼 수 있습니다.

95% 신뢰구간의 엄밀한 의미는 같은 실험과 구간 추정 절차를 매우 많이 반복했을 때 <strong>만들어진 구간의 약 95%가 실제 모수를 포함하도록 구성된 구간</strong>이라는 뜻입니다.

따라서

> “이번에 계산한 구간 안에 진짜 효과가 있을 확률이 95%다.”

라고 해석하는 것은 빈도주의 신뢰구간의 정확한 해석은 아닙니다.

실무에서는 다음 두 가지를 같이 확인하면 됩니다.

1. **0을 포함하는가?**
	- 0을 포함한다면 효과가 없다는 값도 데이터와 양립 가능
	- 0을 포함하지 않는다면 대응되는 양측 검정에서 통계적으로 유의한 결과
2. **비즈니스적으로 의미 있는 효과 범위를 포함하는가?**
	- 통계적으로 유의해도 효과 크기가 너무 작을 수 있음
	- 반대로 점추정은 커 보여도 신뢰구간이 넓다면 결론이 불확실할 수 있음

#### 1.3.4 통계적 유의성 ≠ 실질적 유의성

앞에서 MDE를 정할 때 “어느 정도의 변화부터 실제로 의미가 있는가?”를 고민했습니다.

이 관점은 결과 해석에서도 그대로 이어집니다.

예를 들어 사용자 수가 매우 많은 서비스에서:

> CVR 10.00% → 10.10%
>
> Difference = +0.10%p
>
> p-value < 0.001

이 결과는 통계적으로는 매우 유의할 수 있습니다.

하지만 기능을 개발하고 유지하는 비용이 큰데 매출 효과는 거의 없다면 <strong>비즈니스적으로는 배포할 가치가 없을 수도 있습니다.</strong>

반대로 다음처럼 결과가 나올 수도 있습니다.

> Difference = +1.5%p
>
> 95% CI = [-0.3%p, +3.3%p]

점추정은 매력적이지만 0도 포함하고 범위도 넓습니다. 이런 경우에는 “효과가 없다”고 단정하기보다 **아직 불확실성이 크다**고 해석하는 편이 더 적절합니다.

그래서 결과를 읽을 때는 보통 다음 순서가 좋습니다.

> <strong>효과 크기 → 신뢰구간 → p-value → 비용·리스크를 포함한 의사결정</strong>

### 1.4 반복 확인과 다중검정 문제

가설검정 자체를 올바르게 사용하더라도, <strong>결과를 보는 방식</strong> 때문에 1종 오류가 증가할 수 있습니다.

대표적인 문제가 Peeking과 Multiple Comparison입니다.

#### 1.4.1 Peeking Problem

실험을 14일 동안 진행하기로 했다고 해봅시다.

그런데 PM이 매일 대시보드를 확인합니다.

> Day 1: p = 0.31
>
> Day 2: p = 0.18
>
> Day 3: p = 0.07
>
> Day 4: p = 0.03 → “유의하다! 실험 종료!”

이렇게 <strong>중간 결과를 반복해서 확인하면서 p-value가 0.05 아래로 내려가는 순간 실험을 종료하는 것</strong>을 흔히 Peeking이라고 합니다.

문제는 일반적인 Fixed-horizon 가설검정이 <strong>미리 정한 시점에서 한 번 판단한다는 전제</strong>를 가지고 있다는 것입니다.

실제로 효과가 없어도 데이터는 계속 흔들립니다. 여러 시점에서 반복해서 검정하면 그중 한 번쯤 우연히 0.05 아래로 내려갈 기회가 계속 늘어나기 때문에, 최종적으로 1종 오류율이 원래 설정한 5%보다 커질 수 있습니다.

따라서 일반적인 검정을 사용할 때는 실험 전에

- 목표 표본 수
- 최소 실험 기간
- 종료 조건
- 결과 판정 규칙

을 정하고, <strong>“유의해 보이면 멈춘다”는 규칙을 사용하지 않는 것</strong>이 중요합니다.

실험 중간 결과를 계속 확인해야 하는 환경이라면 반복 확인을 전제로 오류율을 통제하는 **Sequential Testing** 같은 별도의 방법이 필요합니다. 이 부분은 다음 실무 함정 파트에서 다루겠습니다.

#### 1.4.2 Multiple Comparison Problem

Multiple Comparison은 <strong>한 실험에서 너무 많은 가설을 동시에 검정할 때 우연한 유의 결과가 나타날 확률이 증가하는 문제</strong>입니다.

이전 지표 설계 파트에서 Secondary Metric을 너무 많이 보면 생기는 문제를 간단히 살펴봤는데, 그 통계적인 배경이 바로 다중검정 문제입니다.

각 검정을 α = 0.05로 독립적으로 수행한다고 단순화해보면, m개의 검정 중 <strong>최소 하나가 우연히 유의하게 나올 확률</strong>은

```math
1 - (1 - \alpha)^m
```

입니다.

예를 들어 실제 효과가 전혀 없는 독립적인 지표 20개를 각각 5% 유의수준으로 본다면,

```math
1 - 0.95^{20} \approx 0.642
```

즉, 단순한 가정 아래에서는 <strong>적어도 하나가 우연히 유의하게 나올 확률이 약 64%</strong>까지 올라갑니다.

이 때문에 “지표 20개를 보고 그중 p-value가 가장 작은 지표를 성공 근거로 사용한다”는 방식은 위험합니다.

#### 1.4.3 Bonferroni Correction

가장 단순한 다중검정 보정 방법 중 하나가 Bonferroni Correction입니다.

m개의 가설을 동시에 검정하고 전체 1종 오류 확률을 α 수준으로 통제하고 싶다면, 각 검정의 기준을

```math
\frac{\alpha}{m}
```

으로 낮춥니다.

예를 들어 α = 0.05이고 10개의 가설을 검정한다면:

> 각 검정의 기준: 0.05 / 10 = 0.005

p-value가 0.005보다 작아야 유의하다고 판단하는 식입니다.

장점은 매우 단순하고 <strong>Family-Wise Error Rate(FWER)</strong>, 즉 한 묶음의 검정에서 하나라도 False Positive가 발생할 확률을 강하게 통제한다는 것입니다.

단점은 검정 수가 많아질수록 기준이 지나치게 엄격해져 <strong>실제로 존재하는 효과도 놓칠 가능성</strong>이 커진다는 것입니다.

#### 1.4.4 FDR과 Benjamini-Hochberg

모든 False Positive를 거의 완전히 막는 것보다, 여러 후보를 탐색하면서 어느 정도의 오류를 허용하고 더 많은 진짜 신호를 찾는 것이 중요한 경우도 있습니다.

이때 사용할 수 있는 기준이 <strong>FDR(False Discovery Rate)</strong>입니다.

FDR은 간단히 말하면

> <strong>유의하다고 발견한 결과들 중 False Positive가 차지하는 비율의 기대값</strong>

을 통제하는 접근입니다.

Benjamini-Hochberg(BH) 방법은 대표적인 FDR 통제 방법입니다.

개념적으로는 p-value를 작은 순서대로 정렬한 뒤,

```math
p_{(i)} \leq \frac{i}{m}q
```

를 만족하는 가장 큰 i를 찾고, 그 지점까지의 가설을 기각합니다.

여기서 q는 목표 FDR 수준입니다.

<table header-row="true">
<tr>
<td></td>
<td>Bonferroni</td>
<td>Benjamini-Hochberg</td>
</tr>
<tr>
<td>통제 대상</td>
<td>FWER</td>
<td>FDR</td>
</tr>
<tr>
<td>성격</td>
<td>보수적</td>
<td>상대적으로 더 높은 검정력</td>
</tr>
<tr>
<td>적합한 상황</td>
<td>소수의 중요한 가설에서 False Positive를 매우 엄격히 막고 싶을 때</td>
<td>많은 지표·가설을 탐색하면서 발견을 관리하고 싶을 때</td>
</tr>
</table>

A/B 테스트에서는 모든 Secondary Metric을 동일한 의사결정 지표처럼 다루기보다, <strong>Primary Metric을 사전에 정해두고 나머지 지표의 역할을 구분하는 것 자체가 다중검정 문제를 줄이는 첫 번째 방법</strong>이라고 볼 수 있습니다.

### 1.5 실험 민감도 향상: CUPED

마지막으로 살펴볼 것은 <strong>Variance Reduction(분산 축소)</strong>입니다.

앞에서 Power와 표본 수를 다룰 때 분산이 클수록 같은 효과를 발견하기 어렵다는 것을 살펴봤습니다. 그렇다면 반대로, <strong>Treatment Effect는 그대로 두면서 데이터의 불필요한 변동만 줄일 수 있다면</strong> 더 작은 효과도 정밀하게 측정할 수 있습니다.

대표적인 방법이 <strong>CUPED(Controlled-experiment Using Pre-Experiment Data)</strong>입니다.

CUPED는 Microsoft 연구진이 2013년 WSDM 논문에서 제안한 방법으로, 이름 그대로 <strong>실험 전에 이미 존재하던 사용자 데이터를 활용해 실험 지표의 분산을 줄이는 방법</strong>입니다.

#### 1.5.1 왜 실험 전 데이터를 사용할까?

예를 들어 Primary Metric이 <strong>실험 기간 14일 동안의 사용자당 매출</strong>이라고 해봅시다.

사용자마다 원래 소비 성향이 크게 다릅니다.

- User A: 원래 자주 구매하는 사용자
- User B: 가끔 구매하는 사용자
- User C: 거의 구매하지 않는 사용자

무작위 배정을 해도 평균적으로 두 그룹은 비슷해지지만, 한 번의 실제 실험에서는 이런 사용자 구성 차이 때문에 매출 지표가 꽤 흔들릴 수 있습니다.

그런데 실험 전 14일의 사용자당 매출을 알고 있다면 각 사용자가 <strong>원래 얼마나 구매하던 사람인지</strong>에 대한 정보를 얻을 수 있습니다.

> 실험 중 매출 = 원래 구매 성향 + Treatment 영향 + Noise

CUPED는 이 둘의 상관관계를 이용해 <strong>사용자의 원래 성향에서 설명되는 변동을 제거하고 Treatment와 관련된 변화에 더 집중</strong>합니다.

#### 1.5.2 CUPED의 기본 아이디어

실험에서 측정하려는 지표를 Y, 실험 전에 측정한 관련 지표를 X라고 해보겠습니다.

CUPED는 다음과 같이 보정된 지표를 만듭니다.

```math
Y_{CUPED} = Y - \theta(X - E[X])
```

여기서 θ는 Y와 X의 관계를 이용해 정하며, 대표적으로 다음과 같이 계산할 수 있습니다.

```math
\theta = \frac{Cov(Y,X)}{Var(X)}
```

식이 조금 복잡해보이지만 핵심은 단순합니다.

- 실험 전에 원래 값이 높았던 사용자는 Y에서 일부를 빼고
- 원래 값이 낮았던 사용자는 상대적으로 보정해
- <strong>Treatment와 무관한 개인차를 줄이는 것</strong>입니다.

중요한 점은 X가 <strong>실험 전에 측정된 값</strong>이라는 것입니다. Treatment를 받은 이후의 행동을 공변량으로 사용하면 Treatment가 X 자체를 바꿨을 수 있기 때문에 인과효과를 왜곡할 수 있습니다.

#### 1.5.3 왜 Treatment Effect는 유지되면서 분산만 줄어드는가?

Randomization이 정상적으로 이루어졌다면 실험 전 변수 X는 평균적으로 Control과 Treatment에 비슷하게 분포합니다.

즉, X를 이용해 보정하더라도 한 그룹만 유리하게 만드는 것이 아니라 <strong>두 그룹에 공통으로 존재하던 사용자별 변동을 제거하는 효과</strong>를 얻을 수 있습니다.

X와 Y의 상관이 클수록 CUPED의 효과도 커집니다.

이상적인 조건에서 최적의 θ를 사용하면 분산은 대략

```math
Var(Y_{CUPED}) = Var(Y)(1 - \rho^2)
```

형태로 줄어들 수 있습니다.

여기서 ρ는 실험 전 지표 X와 실험 중 지표 Y의 상관계수입니다.

예를 들어 ρ = 0.7이라면:

```math
1 - 0.7^2 = 0.51
```

이론적인 단순 상황에서는 원래 분산의 약 51% 수준까지 줄어들 수 있다는 의미입니다.

물론 실제 감소 폭은 지표와 데이터에 따라 다릅니다. Microsoft의 Bing 실험 사례에서는 연구 대상 지표들에서 약 50% 수준의 분산 감소를 보고했고, 이를 통해 같은 검정력을 더 적은 사용자나 더 짧은 기간으로 얻을 수 있음을 보였습니다. 이 수치가 모든 서비스에서 그대로 재현된다는 의미는 아닙니다.

#### 1.5.4 CUPED를 사용하면 무엇이 좋아지는가?

CUPED는 Treatment Effect 자체를 크게 만드는 기법이 아닙니다.

<table header-row="true">
<tr>
<td></td>
<td>Effect</td>
<td>95% CI 예시</td>
</tr>
<tr>
<td>Before CUPED</td>
<td>+1.0%p</td>
<td>[-0.4%p, +2.4%p]</td>
</tr>
<tr>
<td>After CUPED</td>
<td>약 +1.0%p</td>
<td>[+0.2%p, +1.8%p]</td>
</tr>
</table>

핵심은 <strong>효과의 중심값을 억지로 키우는 것이 아니라, Noise를 줄여 신뢰구간을 좁히는 것</strong>입니다.

그 결과:

- 더 작은 Treatment Effect를 발견하기 쉬워짐
- 같은 효과를 더 정밀하게 추정할 수 있음
- 같은 검정력을 더 적은 표본으로 얻을 수 있음
- 실험 피드백 주기를 줄일 수 있음

#### 1.5.5 CUPED를 사용할 때 주의할 점

CUPED가 항상 좋은 것은 아닙니다.

1. **실험 전 변수와 결과 지표의 상관이 낮으면 효과가 작습니다.**
	- 과거 구매액과 현재 구매액처럼 반복성이 높은 지표는 유리할 수 있음
	- 전혀 관련 없는 변수를 넣는다고 분산이 크게 줄어드는 것은 아님
2. **Treatment의 영향을 받지 않은 변수여야 합니다.**
	- 원칙적으로 Pre-experiment Data를 사용
	- 실험 이후에 결정된 값을 잘못 사용하면 편향이 생길 수 있음
3. **신규 사용자는 실험 전 데이터가 없을 수 있습니다.**
	- 신규 사용자 비중이 높다면 결측 처리나 별도의 설계가 필요
4. **CUPED는 잘못된 실험 설계를 고쳐주는 방법이 아닙니다.**
	- Randomization, Logging, SRM 같은 문제가 있는 실험에 CUPED를 적용한다고 결과가 신뢰할 수 있게 되는 것은 아님

> CUPED는 <strong>좋은 실험의 Noise를 줄이는 방법</strong>이지, 잘못된 실험을 좋은 실험으로 바꾸는 방법은 아닙니다.

### 1.6 정리

실험을 실행한 이후 바로 Treatment와 Control의 숫자를 비교하기 전에 다음 순서로 생각하면 좋습니다.

> A/A Test → Ramp-up → Experiment Duration → Statistical Test → CI + Effect Size → Peeking / Multiple Testing → CUPED

결국 실험 결과에서 중요한 것은 <strong>p-value가 0.05보다 작은 숫자를 찾는 것</strong>이 아닙니다.

실험 시스템이 정상적으로 동작했고, 사전에 정한 규칙대로 충분한 데이터를 모았으며, 효과 크기와 불확실성을 함께 해석했을 때 비로소 그 결과를 제품 의사결정에 사용할 수 있습니다.

## Reference

- [The A/A Test - Trustworthy Online Controlled Experiments](https://www.cambridge.org/core/books/abs/trustworthy-online-controlled-experiments/aa-test/D0779D2FB153D36DD4C624BA207E41C2)
- [Ramping Experiment Exposure: Trading Off Speed, Quality, and Risk - Trustworthy Online Controlled Experiments](https://www.cambridge.org/core/books/abs/trustworthy-online-controlled-experiments/ramping-experiment-exposure-trading-off-speed-quality-and-risk/1C177E1AAEDAFBF79840AFDFE15E7F5D)
- [Unexpected Results in Online Controlled Experiments - Kohavi & Longbotham](https://www.kdd.org/exploration_files/v12-02-8-UR-Kohavi.pdf)
- [Improving the Sensitivity of Online Controlled Experiments by Utilizing Pre-Experiment Data (CUPED)](https://exp-platform.com/cuped/)
- [ASA Statement on Statistical Significance and P-Values](https://www.stat.berkeley.edu/~aldous/Real_World/ASA_statement.pdf)
- [Benjamini & Hochberg (1995) - Controlling the False Discovery Rate](https://academic.oup.com/jrsssb/article/57/1/289/7035855)
- [OCE-Materials - A/A 테스트](https://github.com/CausalInferenceLab/OCE-Materials/blob/main/%EB%B0%9C%ED%91%9C%20%EC%9E%90%EB%A3%8C/20240507_A%3AA%20%ED%85%8C%EC%8A%A4%ED%8A%B8.pdf)
