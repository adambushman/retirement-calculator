<script setup lang="ts">
import Slider from '@/volt/Slider.vue';
import Accordion from '@/volt/Accordion.vue';
import AccordionPanel from '@/volt/AccordionPanel.vue';
import AccordionHeader from '@/volt/AccordionHeader.vue';
import AccordionContent from '@/volt/AccordionContent.vue';

import SliderLabel from '@/components/SliderLabel.vue';

import { useRetirementStore } from "@/stores/useRetirementStore";
const store = useRetirementStore();
</script>

<template>

<div class="card">
  <Accordion :value="['0']" multiple>
    <AccordionPanel value="0">
      <AccordionHeader>Earning & Saving</AccordionHeader>
      <AccordionContent>
        <div class="flex flex-wrap space-x-6 space-y-6">
          <div>
            <label
            class="block mb-2 text-gray-400"
            >Annual Income Today</label>
            <input
            type="text"
            v-model.number="store.annualIncome"
            class="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
            class="block mb-2 text-gray-400"
            >Annual Raises</label>
            <input
            type="text"
            v-model.number="store.annualRaises"
            class="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
            class="block mb-2 text-gray-400"
            >Your Age Today</label>
            <input
            type="text"
            v-model.number="store.ageToday"
            class="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
            class="block mb-2 text-gray-400"
            >Investment Balance Today</label>
            <input
            type="text"
            v-model.number="store.currentBalance"
            class="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
            class="block mb-2 text-gray-400"
            >Savings/Contribution Rate</label>
            <input
            type="text"
            v-model.number="store.savingsRate"
            class="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
            class="block mb-2 text-gray-400"
            >Growth Rate (Pre-Retirement)</label>
            <input
            type="text"
            v-model.number="store.growthRatePreRetirement"
            class="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </AccordionContent>
    </AccordionPanel>

    <AccordionPanel value="1">
      <AccordionHeader>Retirement Plan</AccordionHeader>
      <AccordionContent>
        <div class="flex flex-wrap space-x-6 space-y-6">
          <div>
            <label
            class="block mb-2 text-gray-400"
            >Retirement Age</label>
            <input
            type="text"
            v-model.number="store.ageRetirement"
            class="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
            class="block mb-2 text-gray-400"
            >Life Expectancy</label>
            <input
            type="text"
            v-model.number="store.lifeExpectancy"
            class="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
            class="block mb-2 text-gray-400"
            >Growth Rate (Intra-Retirement)</label>
            <input
            type="text"
            v-model.number="store.growthRateIntraRetirement"
            class="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
            class="block mb-2 text-gray-400"
            >Retirement Stage Length (Yrs)</label>
            <SliderLabel
            :yearsInGoGo="store.yearsInGoGo"
            :yearsInSlowGo="store.yearsInSlowGo"
            :yearsInNoGo="store.yearsInNoGo"
            />
            <Slider
            v-model="store.retirementBoundaries"
            class="w-60 mt-0"
            range
            :min="store.ageRetirement"
            :max="store.lifeExpectancy"
            ></Slider>
          </div>

          <div>
            <label
            class="block mb-2 text-gray-400"
            >Go-Go Withdrawal Rate</label>
            <input
            type="text"
            v-model.number="store.incomeReplacementGoGo"
            class="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
            class="block mb-2 text-gray-400"
            >Slow-Go Withdrawal Rate</label>
            <input
            type="text"
            v-model.number="store.incomeReplacementSlowGo"
            class="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
            class="block mb-2 text-gray-400"
            >No-Go Withdrawal Rate</label>
            <input
            type="text"
            v-model.number="store.incomeReplacementNoGo"
            class="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            class="block mb-2 text-gray-400"
            >Annual Inflation</label>
            <input
            type="text"
            v-model.number="store.annualInflation"
            class="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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