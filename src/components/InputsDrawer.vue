<script setup lang="ts">
import InputNumber from '@/volt/InputNumber.vue';
import Slider from '@/volt/Slider.vue';
import Accordion from '@/volt/Accordion.vue';
import AccordionPanel from '@/volt/AccordionPanel.vue';
import AccordionHeader from '@/volt/AccordionHeader.vue';
import AccordionContent from '@/volt/AccordionContent.vue';

import SliderLabel from '@/components/SliderLabel.vue';
import SectionHeader from '@/components/SectionHeader.vue';

import { useRetirementStore } from "@/stores/useRetirementStore";
const store = useRetirementStore();
</script>

<template>

<div>
  <SectionHeader>Inputs</SectionHeader>
  <Accordion :value="['0']" multiple>
    <AccordionPanel value="0">
      <AccordionHeader>Earning & Saving</AccordionHeader>
      <AccordionContent>
        <div class="flex flex-wrap gap-3">
          <div>
            <label
            class="block text-sm mb-1 text-gray-400"
            for="annual-income-input"
            >Annual Income Today</label>
            <InputNumber
            v-model.number="store.annualIncome"
            inputId="annual-income-input"
            size="small"
            prefix="$"
            />
          </div>

          <div>
            <label
            class="block text-sm mb-2 text-gray-400"
            for="annual-raises-input"
            >Annual Raises</label>
            <InputNumber
            v-model.number="store.annualRaises"
            inputId="annual-raises-input"
            size="small"
            suffix="%"
            />
          </div>

          <div>
            <label
            class="block text-sm mb-2 text-gray-400"
            for="annual-raises-input"
            >Your Age Today</label>
            <InputNumber
            v-model.number="store.ageToday"
            inputId="age-today-input"
            size="small"
            />
          </div>

          <div>
            <label
            class="block text-sm mb-2 text-gray-400"
            for="current-balance-input"
            >Investment Balance Today</label>
            <InputNumber
            v-model.number="store.currentBalance"
            inputId="current-balance-input"
            size="small"
            prefix="$"
            />
          </div>

          <div>
            <label
            class="block text-sm mb-2 text-gray-400"
            for="savings-rate-input"
            >Savings/Contribution Rate</label>
            <InputNumber
            v-model.number="store.savingsRate"
            inputId="savings-rate-input"
            size="small"
            suffix="%"
            />
          </div>

          <div>
            <label
            class="block text-sm mb-2 text-gray-400"
            for="pre-retire-growth-input"
            >Growth Rate (Pre-Retirement)</label>
            <InputNumber
            v-model.number="store.growthRatePreRetirement"
            inputId="pre-retire-growth-input"
            size="small"
            suffix="%"
            />
          </div>
        </div>
      </AccordionContent>
    </AccordionPanel>

    <AccordionPanel value="1">
      <AccordionHeader>Retirement Plan</AccordionHeader>
      <AccordionContent>
        <div class="flex flex-wrap gap-4">
          <div>
            <label
            class="block text-sm mb-2 text-gray-400"
            for="retire-age-input"
            >Retirement Age</label>
            <InputNumber
            v-model.number="store.ageRetirement"
            inputId="retire-age-input"
            size="small"
            />
          </div>

          <div>
            <label
            class="block text-sm mb-2 text-gray-400"
            for="life-expectancy-input"
            >Life Expectancy</label>
            <InputNumber
            v-model.number="store.lifeExpectancy"
            inputId="life-expectancy-input"
            size="small"
            />
          </div>

          <div>
            <label
            class="block text-sm mb-2 text-gray-400"
            for="intra-retire-growth-input"
            >Growth Rate (Intra-Retirement)</label>
            <InputNumber
            v-model.number="store.growthRateIntraRetirement"
            inputId="intra-retire-growth-input"
            size="small"
            suffix="%"
            />
          </div>

          <div>
            <label
            class="block text-sm mb-2 text-gray-400"
            for="retire-stages-input"
            >Retirement Stage Length (Yrs)</label>
            <SliderLabel
            :yearsInGoGo="store.yearsInGoGo"
            :yearsInSlowGo="store.yearsInSlowGo"
            :yearsInNoGo="store.yearsInNoGo"
            />
            <Slider
            v-model="store.retirementBoundaries"
            class="w-50 mt-0"
            inputId="retire-stages-input"
            range
            :min="store.ageRetirement"
            :max="store.lifeExpectancy"
            ></Slider>
          </div>

          <div>
            <label
            class="block text-sm mb-2 text-gray-400"
            for="gogo-withdrawal-rate-input"
            >Go-Go Withdrawal Rate</label>
            <InputNumber
            v-model.number="store.incomeReplacementGoGo"
            inputId="gogo-withdrawal-rate-input"
            size="small"
            suffix="%"
            />
          </div>

          <div>
            <label
            class="block text-sm mb-2 text-gray-400"
            for="slowgo-withdrawal-rate-input"
            >Slow-Go Withdrawal Rate</label>
            <InputNumber
            v-model.number="store.incomeReplacementSlowGo"
            inputId="slowgo-withdrawal-rate-input"
            size="small"
            suffix="%"
            />
          </div>

          <div>
            <label
            class="block text-sm mb-2 text-gray-400"
            for="nogo-withdrawal-rate-input"
            >No-Go Withdrawal Rate</label>
            <InputNumber
            v-model.number="store.incomeReplacementNoGo"
            inputId="nogo-withdrawal-rate-input"
            size="small"
            suffix="%"
            />
          </div>
        </div>
      </AccordionContent>
    </AccordionPanel>

    <AccordionPanel value="2">
      <AccordionHeader>Misc Assumptions</AccordionHeader>
      <AccordionContent>
        <div class="flex flex-wrap space-x-6 space-y-6">
          <div>
            <label
            class="block text-sm mb-2 text-gray-400"
            for="annual-inflation-input"
            >Annual Inflation</label>
            <InputNumber
            v-model.number="store.annualInflation"
            inputId="annual-inflation-input"
            size="small"
            suffix="%"
            />
          </div>

        </div>
      </AccordionContent>
    </AccordionPanel>
  </Accordion>
</div>

</template>

<style scoped>

</style>