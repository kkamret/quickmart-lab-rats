# A/B 테스트 실무 (2): 실무 함정과 대응

[← 이전 글](09-practice-execution.md) · [목차](README.md) · [다음 글 →](11-experimentation-platform.md)

## 2. 실험 결과를 보기 전에 먼저 확인해야 하는 것

앞에서는 실험 가설, 지표, 배정 단위, 표본 크기와 실험 기간을 정하고 결과를 해석하는 방법까지 살펴봤습니다.

그런데 통계 검정을 아무리 정확하게 해도 <strong>실험 데이터 자체가 잘못 만들어졌다면 결과를 믿을 수 없습니다.</strong>

예를 들어 Treatment가 실제로는 50%의 사용자에게 배정됐는데, 특정 환경에서 Treatment 사용자의 로그만 일부 빠졌다고 해봅시다. 이 상태에서 남은 데이터만 비교하면 두 그룹은 더 이상 처음의 무작위 배정 결과를 그대로 유지하고 있다고 보기 어렵습니다.

그래서 실무에서는 Primary Metric의 p-value를 보기 전에 먼저 <strong>실험 자체가 정상적으로 실행됐는지</strong>를 확인합니다. 그중 가장 대표적인 체크가 Sample Ratio Mismatch(SRM)입니다.

### 2.1 Sample Ratio Mismatch(SRM)

<strong>SRM(Sample Ratio Mismatch)</strong>은 실험을 시작할 때 정한 배정 비율과 실제 분석 데이터에서 관측된 비율이 통계적으로 맞지 않는 현상입니다.

예를 들어 사용자 단위로 50:50 배정을 했다면 충분히 많은 표본에서는 A와 B의 사용자 수가 대략 비슷하게 관측되어야 합니다. 물론 정확히 같은 수가 나올 필요는 없습니다. 무작위 배정 자체에도 우연한 차이는 생길 수 있기 때문입니다.

문제는 그 차이가 단순한 우연이라고 보기 어려울 정도로 커졌을 때입니다.

> Expected Ratio와 Observed Ratio가 통계적으로 일치하는가?

이를 확인하기 위해 보통 카이제곱 적합도 검정(Chi-square goodness-of-fit test)을 사용합니다. 중요한 것은 여기서 세는 대상이 <strong>실험의 Randomization Unit과 맞아야 한다는 점</strong>입니다. 사용자 단위 배정 실험이라면 세션 수가 아니라 그룹별 고유 사용자 수를 비교해야 합니다.

여기서 SRM 검정은 '왜 문제가 생겼는지'까지 알려주는 검정은 아닙니다. <strong>실험 데이터에 이상이 있을 가능성을 알려주는 경고등</strong>에 가깝습니다.

### 2.2 SRM은 왜 위험할까?

단순히 A그룹 49%, B그룹 51%처럼 사용자 수가 조금 다른 것 자체가 핵심 문제는 아닙니다.

진짜 문제는 <strong>어떤 사용자가 분석 데이터에서 빠졌는지 알 수 없다는 것</strong>입니다.

예를 들어 Treatment 화면에서 특정 사용자에게만 오류가 발생해 로그가 남지 않았다면, 분석 데이터에는 Treatment를 정상적으로 경험한 사용자만 상대적으로 더 많이 남을 수 있습니다. 이 경우 빠진 사용자가 무작위로 빠진 것이 아니므로 두 그룹의 비교 가능성이 깨지고 Selection Bias가 생깁니다.

즉 SRM이 발생한 상태에서 Treatment 효과가 크게 보이더라도, 실제 Treatment 효과인지, 아니면 특정 유형의 사용자가 한쪽 그룹에서 빠져서 그렇게 보이는지를 구분하기 어렵습니다.

그래서 SRM이 발견되면 일반적으로 <strong>효과 해석을 멈추고 원인을 먼저 조사하는 것이 우선</strong>입니다.

### 2.3 SRM이 발생하는 대표적인 원인

SRM은 단순히 랜덤 배정 코드가 잘못됐을 때만 발생하지 않습니다. 실험 전체 파이프라인 어디에서든 생길 수 있습니다.

<table header-row="true">
<tr>
<td>구간</td>
<td>예시</td>
</tr>
<tr>
<td>Assignment</td>
<td>해시/버킷 로직 오류, Variant 비율 설정 오류</td>
</tr>
<tr>
<td>Exposure</td>
<td>특정 기기·브라우저에서 Treatment가 정상 노출되지 않음</td>
</tr>
<tr>
<td>Logging</td>
<td>특정 Variant의 이벤트 로그가 누락됨</td>
</tr>
<tr>
<td>Data Processing</td>
<td>Join, ETL, 필터링 과정에서 한 그룹 데이터가 더 많이 빠짐</td>
</tr>
<tr>
<td>Analysis</td>
<td>결과를 본 뒤 특정 사용자만 제거하면서 그룹 구성이 달라짐</td>
</tr>
</table>

따라서 SRM이 발생하면 전체 비율만 보고 끝내기보다 <strong>기기, 브라우저, 날짜, 국가, 유입 채널처럼 실험 실행과 관련된 축으로 그룹별 표본 수를 쪼개보는 것</strong>이 원인 파악에 도움이 됩니다.

정리하면 SRM은 결과 지표가 아니라 **Trustworthiness Metric**입니다. SRM을 통과하지 못한 실험에서 Primary Metric을 해석하는 것은 순서가 거꾸로 된 셈입니다.

---

## 3. Peeking Problem의 대응: Sequential Testing

[앞 파트](09-practice-execution.md)에서 Peeking Problem을 살펴봤습니다. 정해진 표본까지 모은 뒤 한 번 검정하기로 해놓고, 매일 p-value를 확인하다가 0.05 아래로 내려가는 순간 실험을 끝내면 1종 오류율이 원래 설계보다 커질 수 있다는 문제였습니다.

여기서는 Peeking 자체를 다시 설명하기보다는 <strong>중간 확인이 필요한 실무 환경에서는 어떻게 해야 하는가?</strong>를 보겠습니다.

### 3.1 Fixed-Horizon Test와 Sequential Testing

기본적인 Fixed-Horizon Test는 실험 전에 표본 크기 또는 종료 시점을 정하고, 그 시점에 한 번 최종 검정을 하는 방식입니다.

반면 **Sequential Testing**은 데이터가 순차적으로 들어오는 상황에서 중간 결과를 확인할 수 있도록 처음부터 검정 규칙을 설계하는 방법입니다.

<table header-row="true">
<tr>
<td>구분</td>
<td>Fixed-Horizon Test</td>
<td>Sequential Testing</td>
</tr>
<tr>
<td>결과 확인</td>
<td>사전에 정한 종료 시점에서 최종 판단</td>
<td>실험 도중 여러 시점에서 판단 가능</td>
</tr>
<tr>
<td>중간 확인</td>
<td>단순 반복 확인 시 오류율 증가 가능</td>
<td>중간 확인을 고려해 검정 기준을 설계</td>
</tr>
<tr>
<td>종료</td>
<td>표본 수/기간 충족 후 종료</td>
<td>사전에 정한 Sequential Rule에 따라 조기 종료 가능</td>
</tr>
<tr>
<td>핵심</td>
<td>끝까지 모으고 한 번 본다</td>
<td>여러 번 볼 것을 처음부터 검정에 반영한다</td>
</tr>
</table>

중요한 점은 <strong>Sequential Testing = p-value를 매일 보고 마음대로 멈추는 것</strong>이 아니라는 것입니다.

여러 번 결과를 확인할 수 있도록 경계값이나 오류율 사용 방식 자체를 사전에 설계해야 합니다. 대표적으로 Alpha Spending, Group Sequential Test, Always-Valid p-value 같은 접근이 있습니다.

### 3.2 Always-Valid p-value

일반적인 p-value는 정해진 표본 크기에서 한 번 검정한다는 전제를 두기 때문에 임의의 시점에 반복해서 확인하면 해석이 깨질 수 있습니다.

반면 **Always-Valid p-value**는 Sequential Testing을 위해 설계된 방식으로, 정해진 방법을 지킨다는 전제에서 여러 시점에 데이터를 확인하더라도 전체 오류율을 통제하면서 판단할 수 있도록 만든 개념입니다.

직관적으로는 '중간에 볼 수 없다'가 아니라 '중간에 볼 거라면 그 사실을 검정 설계에 미리 포함하자'라고 이해하면 편합니다.

다만 Sequential Testing이 항상 Fixed-Horizon 방식보다 좋은 것은 아닙니다. 조기 종료 가능성을 얻는 대신 검정 경계가 달라지고, 같은 조건에서 필요한 표본이나 검정력이 달라질 수 있습니다. 따라서 <strong>실험을 시작한 뒤 결과가 궁금해서 Sequential 방식으로 바꾸는 것이 아니라, 실험 전에 중단 규칙까지 정해야 합니다.</strong>

---

## 4. 실험 결과를 왜곡하는 데이터 편향

### 4.1 Survivorship Bias

<strong>Survivorship Bias(생존자 편향)</strong>는 관측 가능한 대상만 보고, 관측 과정에서 사라진 대상을 고려하지 않아 결론이 왜곡되는 문제입니다.

A/B 테스트에서는 Treatment를 받은 사용자 중 일부가 오류, 로딩 실패, 로그 누락 등으로 분석 데이터에서 사라질 수 있습니다. 그런데 남아 있는 사용자만 비교하면 'Treatment를 끝까지 정상적으로 경험한 사람'이라는 조건을 통과한 사용자만 분석하게 됩니다.

이때 빠진 사용자가 Treatment와 무관하게 완전히 무작위로 빠졌다면 영향이 작을 수 있지만, <strong>Treatment 때문에 빠질 확률이 달라졌다면 분석 대상 선택 자체가 Treatment의 영향을 받은 것</strong>이 됩니다.

예를 들어 새로운 화면이 일부 환경에서 느리게 로딩된다고 해봅시다. 페이지가 정상적으로 열린 사용자만 Exposure 로그에 남는 구조라면, Treatment에서 이탈한 사용자는 분석에서 사라지고 상대적으로 문제없이 사용할 수 있었던 사용자만 남습니다. 그 결과 실제보다 Treatment 성과가 좋아 보일 수도 있습니다.

즉, Random Assignment가 잘 됐다는 사실만으로 충분하지 않고, Randomization 이후 어떤 사용자가 최종 분석 데이터에 남았는지도 확인해야 합니다.

이 관점에서 SRM은 단순한 '인원수 불일치'가 아니라 Survivorship Bias나 Selection Bias가 생겼을 가능성을 빠르게 발견하는 단서가 될 수 있습니다.

### 4.2 결과 이후의 필터링도 조심해야 한다

실험 결과를 본 뒤 특정 조건의 사용자를 제외하는 것도 비슷한 문제를 만들 수 있습니다.

예를 들어 'Treatment에서 결제를 시도한 사용자만 보자', '페이지를 10초 이상 본 사용자만 보자'처럼 <strong>Treatment 이후 발생한 행동을 기준으로 분석 대상을 다시 선택하면</strong>, 두 그룹에서 서로 다른 성향의 사용자를 비교하게 될 수 있습니다.

따라서 분석 대상과 제외 규칙은 가능하면 실험 전에 정의하고, Treatment 이후 변수로 표본을 임의로 걸러야 한다면 그 선택이 인과 해석에 어떤 영향을 주는지 따로 확인해야 합니다.

## Reference

- [Diagnosing Sample Ratio Mismatch in A/B Testing - Microsoft Research](https://www.microsoft.com/en-us/research/articles/diagnosing-sample-ratio-mismatch-in-a-b-testing/)
- [Diagnosing Sample Ratio Mismatch in Online Controlled Experiments - Microsoft Research](https://www.microsoft.com/en-us/research/publication/diagnosing-sample-ratio-mismatch-in-online-controlled-experiments-a-taxonomy-and-rules-of-thumb-for-practitioners/)
- [Always Valid Inference: Bringing Sequential Analysis to A/B Testing](https://arxiv.org/abs/1512.04922)
- [A/B Testing Pitfalls: How Marketers Can Avoid Costly Mistakes](https://blogs.oracle.com/marketingcloud/ab-testing-pitfalls-how-marketers-can-avoid-costly-mistakes)
