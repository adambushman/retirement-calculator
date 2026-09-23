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
        The industry commonly refers to three (3) stages: "Go-Go Years", "Slow-Go Years", and "No-Go Years" — offered here as starting points. You define however many stages fit your own plan, name and describe each one, and set how long it lasts, its withdrawal rate, and which accounts fund it.
      </template>
    </QuestionAnswer>

    <QuestionAnswer value="4">
      <template #question>What is not considered?</template>
      <template #answer>
        At the moment, this calculator focuses on retirement accounts (i.e. 401K, IRA, etc) plus guaranteed income from social security, pensions, and annuities. It is not designed to account for other income during retirement years, such as part-time work or rental income.
        <br><br>
        Additionally, tax strategies are not considered. Contributions are considered before tax and income is assumed to be gross.
        <br><br>
        Early-withdrawal penalties <em>are</em> considered. Drawing from a Traditional or Roth account before age 59½ costs a 10% penalty on those withdrawals, charged on top of what you withdraw, so the stage still replaces the income you asked it to &mdash; the penalty comes out of the balance instead. Since this calculator works in whole years, age 59 is treated as fully penalized and age 60 as fully penalty-free. Roth accounts are tracked as one balance, so the rule allowing Roth contributions to be withdrawn penalty-free at any age isn't reflected.
      </template>
    </QuestionAnswer>
  </Accordion>
</div>
</template>