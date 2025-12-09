<script setup lang="ts">
import Accordion from '@/volt/Accordion.vue';
import AccordionPanel from '@/volt/AccordionPanel.vue';
import AccordionHeader from '@/volt/AccordionHeader.vue';
import AccordionContent from '@/volt/AccordionContent.vue';

import { useRetirementStore } from "@/stores/useRetirementStore";

const store = useRetirementStore();
</script>

<template>
<div class="card">
    <Accordion :value="['0']" multiple>
        <AccordionPanel value="0">
            <AccordionHeader>Header I</AccordionHeader>
            <AccordionContent>
                <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
                    consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                </p>
            </AccordionContent>
        </AccordionPanel>
        <AccordionPanel value="1">
            <AccordionHeader>Header II</AccordionHeader>
            <AccordionContent>
                <p>
                    Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim
                    ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Consectetur, adipisci velit, sed quia non numquam eius modi.
                </p>
            </AccordionContent>
        </AccordionPanel>
        <AccordionPanel value="2">
            <AccordionHeader>Header III</AccordionHeader>
            <AccordionContent>
                <p>
                    At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa
                    qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus.
                </p>
            </AccordionContent>
        </AccordionPanel>
    </Accordion>
</div>


<div class="space-y-6 p-6">
  <div class="flex space-x-6">
    <div>
      <label
      class="block mb-2 text-gray-700"
      >Your Age Today</label>
      <input
      type="text"
      v-model.number="store.ageToday"
      class="border border-gray-300 text-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>

    <div>
      <label
      class="block mb-2 text-gray-700"
      >Age of Retirement</label>
      <input
      type="text"
      v-model.number="store.ageRetirement"
      class="border border-gray-300 text-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>

    <div>
      <label
      class="block mb-2 text-gray-700"
      >Life Expectancy</label>
      <input
      type="text"
      v-model.number="store.lifeExpectancy"
      class="border border-gray-300 text-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  </div>

  <div class="flex space-x-6">
    <div>
      <label
      class="block mb-2 text-gray-700"
      >Annual Income Today</label>
      <input
      type="text"
      v-model.number="store.annualIncome"
      class="border border-gray-300 text-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>

    <div>
      <label
      class="block mb-2 text-gray-700"
      >Annual Raises</label>
      <input
      type="text"
      v-model.number="store.annualRaises"
      class="border border-gray-300 text-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  </div>

  <div class="flex space-x-6">
    <div>
      <label
      class="block mb-2 text-gray-700"
      >Go-Go Withdrawal Rate</label>
      <input
      type="text"
      v-model.number="store.incomeReplacementGoGo"
      class="border border-gray-300 text-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
    <div>
      <label
      class="block mb-2 text-gray-700"
      >Slow-Go Withdrawal Rate</label>
      <input
      type="text"
      v-model.number="store.incomeReplacementSlowGo"
      class="border border-gray-300 text-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
    <div>
      <label
      class="block mb-2 text-gray-700"
      >No-Go Withdrawal Rate</label>
      <input
      type="text"
      v-model.number="store.incomeReplacementNoGo"
      class="border border-gray-300 text-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  </div>

  <div class="flex space-x-6">
    <div>
      <label
      class="block mb-2 text-gray-700"
      >No-Go Withdrawal Rate</label>
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
      class="block mb-2 text-gray-700"
      >Go-Go Years</label>
      <input
      type="text"
      v-model.number="store.yearsInGoGo"
      class="border border-gray-300 text-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
    <div>
      <label
      class="block mb-2 text-gray-700"
      >Slow-Go Years</label>
      <input
      type="text"
      v-model.number="store.yearsInSlowGo"
      class="border border-gray-300 text-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
    <div>
      <label
      class="block mb-2 text-gray-700"
      >No-Go Years</label>
      <input
      type="text"
      v-model.number="store.yearsInNoGo"
      class="border border-gray-300 text-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  </div>


  <div class="flex space-x-6">
    <div>
      <label
      class="block mb-2 text-gray-700"
      >Investment Balance Today</label>
      <input
      type="text"
      v-model.number="store.currentBalance"
      class="border border-gray-300 text-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>

    <div>
      <label
      class="block mb-2 text-gray-700"
      >Savings/Contribution Rate</label>
      <input
      type="text"
      v-model.number="store.savingsRate"
      class="border border-gray-300 text-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  </div>

  <div class="flex space-x-6">
    <div>
      <label
      class="block mb-2 text-gray-700"
      >Growth Rate (Pre-Retirement)</label>
      <input
      type="text"
      v-model.number="store.growthRatePreRetirement"
      class="border border-gray-300 text-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>

    <div>
      <label
      class="block mb-2 text-gray-700"
      >Growth Rate (Intra-Retirement)</label>
      <input
      type="text"
      v-model.number="store.growthRateIntraRetirement"
      class="border border-gray-300 text-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>

    <div>
      <label
      class="block mb-2 text-gray-700"
      >Annual Inflation</label>
      <input
      type="text"
      v-model.number="store.annualInflation"
      class="border border-gray-300 text-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  </div>

  <div class="flex space-x-1 items-center">
    <input type="radio" id="raw" value="raw" v-model="store.inflationPerspective" name="" />
    <label for="raw" class="me-10">Raw</label>

    <input type="radio" id="infl-adj" value="inflation-adjusted" v-model="store.inflationPerspective" name="" />
    <label for="infl-adj">Inflation Adjusted</label>
  </div>
</div>
</template>

<style scoped>

</style>