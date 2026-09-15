<script setup lang="ts">
import { reactive, ref, computed } from 'vue';
import PlusIcon from '@primevue/icons/plus';
import TrashIcon from '@primevue/icons/trash';
import PencilIcon from '@primevue/icons/pencil';
import CheckIcon from '@primevue/icons/check';

import Button from '@/volt/Button.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import SectionHeader from '@/components/SectionHeader.vue';
import PortfolioSummary from '@/components/portfolio/PortfolioSummary.vue';
import AccountCard from '@/components/portfolio/AccountCard.vue';
import AccountFormModal from '@/components/portfolio/AccountFormModal.vue';
import PortfolioAssumptionsModal from '@/components/portfolio/PortfolioAssumptionsModal.vue';

import { usePortfolioStore } from '@/stores/usePortfolioStore';
import { usePortfolioAssumptionsStore } from '@/stores/usePortfolioAssumptionsStore';

const portfolio = usePortfolioStore();
const assumptions = usePortfolioAssumptionsStore();

// The full portfolio view (summary + account list) only appears once the
// shared assumptions are described and at least one account exists;
// otherwise a two-step "describe portfolio, then add accounts" onboarding
// shows instead (step 2 stays locked until step 1 is done).
const showFullView = computed(() => assumptions.isDescribed && portfolio.accounts.length > 0);

const showAssumptionsModal = ref(false);

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

// The single shared Add/Edit modal. `editingAccountId` is set to edit an
// existing account and left null to create a new one; either way the modal
// only touches the portfolio/account stores once its own Done is clicked.
const showAccountModal = ref(false);
const editingAccountId = ref<string | null>(null);

function addAccount() {
  if (!assumptions.isDescribed) return;
  editingAccountId.value = null;
  showAccountModal.value = true;
}

function editAccount(id: string) {
  editingAccountId.value = id;
  showAccountModal.value = true;
}

function closeAccountModal(createdAccountId?: string) {
  showAccountModal.value = false;
  editingAccountId.value = null;
  if (createdAccountId) expandedIds.add(createdAccountId);
}
</script>

<template>
  <div>
    <div v-if="showFullView" class="flex items-center justify-between mb-4">
      <SectionHeader>Accounts</SectionHeader>
      <div class="flex items-center gap-2">
        <SecondaryButton
          label="Portfolio Assumptions"
          aria-label="Edit portfolio assumptions"
          @click="showAssumptionsModal = true"
        >
          <template #icon>
            <PencilIcon style="width: 14px; height: 14px" />
          </template>
        </SecondaryButton>
        <SecondaryButton
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

    <PortfolioSummary v-if="showFullView" />

    <div v-if="!showFullView" class="grid gap-4 sm:grid-cols-2">
      <div
        class="flex flex-col items-center gap-3 py-10 px-4 text-center rounded-lg border"
        :class="assumptions.isDescribed
          ? 'border-primary-200 dark:border-primary/30 bg-primary-50/50 dark:bg-primary/5'
          : 'border-dashed border-surface-200 dark:border-surface-700'"
      >
        <div
          class="flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium"
          :class="assumptions.isDescribed
            ? 'bg-primary text-primary-contrast'
            : 'bg-surface-100 dark:bg-surface-800 text-gray-400'"
        >
          <CheckIcon v-if="assumptions.isDescribed" style="width: 14px; height: 14px" />
          <template v-else>1</template>
        </div>
        <p class="font-medium">Describe Portfolio</p>
        <p class="text-sm text-gray-500">
          Shared assumptions like income, age, and life expectancy — used by every account.
        </p>
        <Button
          :label="assumptions.isDescribed ? 'Edit Assumptions' : 'Get Started'"
          @click="showAssumptionsModal = true"
        />
      </div>

      <div
        class="flex flex-col items-center gap-3 py-10 px-4 text-center rounded-lg border border-dashed
          border-surface-200 dark:border-surface-700"
        :class="!assumptions.isDescribed && 'opacity-50'"
      >
        <div class="flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
          bg-surface-100 dark:bg-surface-800 text-gray-400">
          2
        </div>
        <p class="font-medium">Add Accounts</p>
        <p class="text-sm text-gray-500">
          {{ assumptions.isDescribed
            ? 'Add a retirement account to start building your portfolio.'
            : 'Complete Step 1 first.' }}
        </p>
        <Button
          label="Add Retirement Account"
          :disabled="!assumptions.isDescribed"
          @click="addAccount"
        >
          <template #icon>
            <PlusIcon />
          </template>
        </Button>
      </div>
    </div>

    <div v-else class="space-y-4">
      <AccountCard
        v-for="account in portfolio.accounts"
        :key="account.id"
        :accountId="account.id"
        :name="account.name"
        :collapsed="!expandedIds.has(account.id)"
        @update:collapsed="setExpanded(account.id, !$event)"
        @edit="editAccount"
      />
    </div>

    <PortfolioAssumptionsModal v-if="showAssumptionsModal" @close="showAssumptionsModal = false" />

    <AccountFormModal
      v-if="showAccountModal"
      :accountId="editingAccountId ?? undefined"
      @close="closeAccountModal"
    />
  </div>
</template>
