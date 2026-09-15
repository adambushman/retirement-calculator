<script setup lang="ts">
import BodySectionHeader from '@/components/BodySectionHeader.vue';
import Accordion from '@/volt/Accordion.vue';
import QuestionAnswer from '@/components/faq/QuestionAnswer.vue';

</script>

<template>
<div>
  <BodySectionHeader>Frequently Asked Questions</BodySectionHeader>

  <Accordion multiple>
    <QuestionAnswer value="0">
      <template #question>How does the calculator work?</template>
      <template #answer>
        The calculator accepts your current investment balance, adds contributions or subtracts withdrawals annually as specified, and applies the chosen annual growth.
        <br><br>
        The inflation adjustment setting will normalize every dollar amount by the cummulative inflation calculated at that point in time, putting everything into "today's dollars".
      </template>
    </QuestionAnswer>

    <QuestionAnswer value="1">
      <template #question>Why use this calculator over others?</template>
      <template #answer>
        Most free calculators online tell a partial story. They'll list just the balance at start of retirement, quote figures subject to decades of inflation, treat retirement as a single event, etc.
        <br><br>
        This calculator seeks to describe a wholistic picture of retirement planning and give you the levers to account for as many nuances as possible.
      </template>
    </QuestionAnswer>

    <QuestionAnswer value="2">
      <template #question>Why the emphasis on getting retirement right?</template>
      <template #answer>
        Retirement looks different for everyone. But no one wants a surprising interruption of funds running out. Additionally, funds in excess can prompt more intentional living earlier.
        <br><br>
        This calculator helps you make the requisite pivots early to craft your best retirement.
      </template>
    </QuestionAnswer>

    <QuestionAnswer value="3">
      <template #question>How are the retirement stages useful?</template>
      <template #answer>
        Retirement behavior rarely ends the same way it starts. Goals, activity, health, and funds evolve over time. Therefore, it's helpful to think in periods of common behavior.
        <br><br>
        The industry commonly refers to three (3) stages: "Go-Go Years", "Slow-Go Years", and "No-Go Years". You pick how long each of those last and what spending looks like therein.
      </template>
    </QuestionAnswer>

    <QuestionAnswer value="4">
      <template #question>What is not considered?</template>
      <template #answer>
        At the moment, this calculator focuses on retirement accounts (i.e. 401K, IRA, etc). It is not designed to account for social security, pensions, or income during retirement years.
        <br><br>
        Additionally, tax strategies are not considered. Contributions are considered before tax and income is assumed to be gross.
      </template>
    </QuestionAnswer>
  </Accordion>
</div>
</template>