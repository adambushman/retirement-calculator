<script setup lang="ts">
import { reactive, ref } from 'vue';
import PlusIcon from '@primevue/icons/plus';
import TrashIcon from '@primevue/icons/trash';

import Button from '@/volt/Button.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import SectionHeader from '@/components/SectionHeader.vue';
import PortfolioSummary from '@/components/portfolio/PortfolioSummary.vue';
import AccountCard from '@/components/portfolio/AccountCard.vue';
import AccountFormModal from '@/components/portfolio/AccountFormModal.vue';

import { usePortfolioStore } from '@/stores/usePortfolioStore';

const portfolio = usePortfolioStore();

function clearAll() {
  if (confirm('Remove all accounts? This clears every saved account and can\'t be undone.')) {
    portfolio.clearAllAccounts();
  }
}

// Which cards are expanded (open). Several can be open at once.
const expandedIds = reactive<Set<string>>(new Set());

function setExpanded(id: string, expanded: boolean) {
  if (expanded) expandedIds.add(id);
  else expandedIds.delete(id);
}

// The single shared Add/Edit modal — null means closed.
const editingAccountId = ref<string | null>(null);

function addAccount() {
  const id = portfolio.addAccount();
  expandedIds.add(id);
  editingAccountId.value = id;
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
      <div class="flex items-center gap-2">
        <SecondaryButton
          v-if="portfolio.accounts.length"
          label="Clear All"
          aria-label="Clear all accounts"
          @click="clearAll"
        >
          <template #icon>
            <TrashIcon style="width: 14px; height: 14px" />
          </template>
        </SecondaryButton>
        <Button rounded aria-label="Add account" @click="addAccount">
          <template #icon>
            <PlusIcon />
          </template>
        </Button>
      </div>
    </div>

    <PortfolioSummary />

    <div v-if="!portfolio.accounts.length" class="flex flex-col items-center gap-4 py-16 text-center border border-dashed border-surface-200 dark:border-surface-700 rounded-lg">
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 text-gray-300 dark:text-surface-700">
        <circle cx="24" cy="26" r="14" stroke="currentColor" stroke-width="2" />
        <circle cx="33" cy="23" r="1.5" fill="currentColor" />
        <path d="M38 22c2 1 3 3 3 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        <path d="M20 12l2 4M28 12l-2 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        <path d="M18 20h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        <rect x="16" y="38" width="3" height="5" rx="1.5" fill="currentColor" />
        <rect x="29" y="38" width="3" height="5" rx="1.5" fill="currentColor" />
      </svg>
      <div class="space-y-1">
        <p class="font-medium">No accounts yet</p>
        <p class="text-sm text-gray-500">Add a retirement account to start building your portfolio.</p>
      </div>
      <Button label="Add Retirement Account" @click="addAccount">
        <template #icon>
          <PlusIcon />
        </template>
      </Button>
    </div>

    <div v-else class="space-y-4">
      <AccountCard
        v-for="account in portfolio.accounts"
        :key="account.id"
        :accountId="account.id"
        :name="account.name"
        :collapsed="!expandedIds.has(account.id)"
        @update:collapsed="setExpanded(account.id, !$event)"
        @edit="editingAccountId = $event"
      />
    </div>

    <AccountFormModal
      v-if="editingAccountId"
      :accountId="editingAccountId"
      @close="editingAccountId = null"
    />
  </div>
</template>
