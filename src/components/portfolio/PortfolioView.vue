<script setup lang="ts">
import { reactive } from 'vue';
import PlusIcon from '@primevue/icons/plus';

import Button from '@/volt/Button.vue';
import SectionHeader from '@/components/SectionHeader.vue';
import PortfolioSummary from '@/components/portfolio/PortfolioSummary.vue';
import AccountCard from '@/components/portfolio/AccountCard.vue';

import { usePortfolioStore } from '@/stores/usePortfolioStore';

const portfolio = usePortfolioStore();

// Which cards are expanded (open). Several can be open at once.
const expandedIds = reactive<Set<string>>(new Set());

function setExpanded(id: string, expanded: boolean) {
  if (expanded) expandedIds.add(id);
  else expandedIds.delete(id);
}

function addAccount() {
  const id = portfolio.addAccount();
  expandedIds.add(id);
}

// First-ever visit: seed one ready-to-edit account so the app isn't an empty
// grid. Only ever fires once (see usePortfolioStore's hasSeeded flag), so
// deliberately deleting the last account won't bring one back.
const seededId = portfolio.seedDefaultAccount();
if (seededId) expandedIds.add(seededId);
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <SectionHeader>Accounts</SectionHeader>
      <Button rounded aria-label="Add account" @click="addAccount">
        <template #icon>
          <PlusIcon />
        </template>
      </Button>
    </div>

    <PortfolioSummary />

    <p v-if="!portfolio.accounts.length" class="text-gray-500">
      No accounts yet — add one to start building your portfolio.
    </p>

    <div v-else class="space-y-4">
      <AccountCard
        v-for="account in portfolio.accounts"
        :key="account.id"
        :accountId="account.id"
        :name="account.name"
        :collapsed="!expandedIds.has(account.id)"
        @update:collapsed="setExpanded(account.id, !$event)"
      />
    </div>
  </div>
</template>
