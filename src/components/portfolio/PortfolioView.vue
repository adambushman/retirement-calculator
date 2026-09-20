<script setup lang="ts">
import { reactive, ref, computed } from 'vue';
import PlusIcon from '@primevue/icons/plus';
import TrashIcon from '@primevue/icons/trash';
import PencilIcon from '@primevue/icons/pencil';
import RefreshIcon from '@primevue/icons/refresh';

import SecondaryButton from '@/volt/SecondaryButton.vue';
import BodySectionHeader from '@/components/BodySectionHeader.vue';
import SectionPlaceholder from '@/components/portfolio/SectionPlaceholder.vue';
import ConfirmModal from '@/components/ConfirmModal.vue';
import ContextSummary from '@/components/portfolio/ContextSummary.vue';
import PortfolioSummary from '@/components/portfolio/PortfolioSummary.vue';
import RetirementPlanInputs from '@/components/portfolio/RetirementPlanInputs.vue';
import PortfolioCoverageLegend from '@/components/portfolio/PortfolioCoverageLegend.vue';
import PortfolioResultsPanel from '@/components/portfolio/PortfolioResultsPanel.vue';
import AccountCard from '@/components/portfolio/AccountCard.vue';
import AccountFormModal from '@/components/portfolio/AccountFormModal.vue';
import PortfolioAssumptionsModal from '@/components/portfolio/PortfolioAssumptionsModal.vue';
import StageFormModal from '@/components/portfolio/StageFormModal.vue';

import { usePortfolioStore } from '@/stores/usePortfolioStore';
import { usePortfolioAssumptionsStore } from '@/stores/usePortfolioAssumptionsStore';
import { useRetirementPlanStore } from '@/stores/useRetirementPlanStore';

const portfolio = usePortfolioStore();
const assumptions = usePortfolioAssumptionsStore();
const retirementPlan = useRetirementPlanStore();

// Every section header (Context, Accounts, Portfolio, Retirement Plan,
// Summary) always renders — this is the walk-through a first-time user
// actually follows, so it should look like the real app, not a special
// onboarding screen. Only two sections have a gate of their own (Context
// must be described; at least one account must exist); Portfolio,
// Retirement Plan, and Summary all just depend on that same "an account
// exists" condition and share no separate action, so they unlock the moment
// Accounts does. Whichever section isn't done yet renders a numbered
// SectionPlaceholder instead of its real content; only the very next
// undone section gets an enabled button (or, for the three with no button
// of their own, un-dimmed number/copy) — everything after it stays dimmed
// and disabled until the sections above it are finished.
const contextDone = computed(() => assumptions.isDescribed);
const accountsDone = computed(() => portfolio.accounts.length > 0);

const showAssumptionsModal = ref(false);

const showClearAllConfirm = ref(false);
function clearAllAccounts() {
  portfolio.clearAllAccounts();
  showClearAllConfirm.value = false;
}

const showResetConfirm = ref(false);
function resetPortfolio() {
  portfolio.clearAllAccounts();
  assumptions.resetToDefaults();
  retirementPlan.resetToDefaults();
  showResetConfirm.value = false;
}

const showStageModal = ref(false);

const showClearStagesConfirm = ref(false);
function clearStages() {
  retirementPlan.clearStages();
  showClearStagesConfirm.value = false;
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
  <div class="space-y-12">
    <div>
      <div class="flex items-start justify-between mb-4 gap-4">
        <BodySectionHeader>
          Context
          <template #subtitle>
            The essentials about you — income, age, and life expectancy — that every other section
            builds on.
          </template>
        </BodySectionHeader>
        <div v-if="contextDone" class="flex items-center gap-2">
          <SecondaryButton rounded aria-label="Edit portfolio assumptions" @click="showAssumptionsModal = true">
            <template #icon>
              <PencilIcon style="width: 14px; height: 14px" />
            </template>
          </SecondaryButton>
          <SecondaryButton rounded aria-label="Reset portfolio" @click="showResetConfirm = true">
            <template #icon>
              <RefreshIcon style="width: 14px; height: 14px" />
            </template>
          </SecondaryButton>
        </div>
      </div>

      <ContextSummary v-if="contextDone" />
      <SectionPlaceholder
        v-else
        :number="1"
        title="Describe Context"
        description="Shared assumptions like income, age, and life expectancy — used by every account."
        :active="true"
        button-label="Get Started"
        @action="showAssumptionsModal = true"
      />
    </div>

    <div>
      <div class="flex items-start justify-between mb-4 gap-4">
        <BodySectionHeader>
          Accounts
          <template #subtitle>
            The accounts that'll fund your retirement — Traditional, Roth, and Brokerage today,
            with more account types (like Social Security and pensions) on the way.
          </template>
        </BodySectionHeader>
        <div v-if="accountsDone" class="flex items-center gap-2">
          <SecondaryButton rounded aria-label="Add account" @click="addAccount">
            <template #icon>
              <PlusIcon style="width: 14px; height: 14px" />
            </template>
          </SecondaryButton>
          <SecondaryButton rounded aria-label="Clear all accounts" @click="showClearAllConfirm = true">
            <template #icon>
              <TrashIcon style="width: 14px; height: 14px" />
            </template>
          </SecondaryButton>
        </div>
      </div>

      <div v-if="accountsDone" class="space-y-4">
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
      <SectionPlaceholder
        v-else
        :number="2"
        title="Add Accounts"
        :description="contextDone
          ? 'Add a retirement account to start building your portfolio.'
          : 'Complete Step 1 first.'"
        :active="contextDone"
        button-label="Add Retirement Account"
        @action="addAccount"
      >
        <template #icon>
          <PlusIcon />
        </template>
      </SectionPlaceholder>
    </div>

    <div>
      <BodySectionHeader>
        Portfolio
        <template #subtitle>
          How your accounts add up today, and where they're projected to land at each
          account's own withdrawal age. Not a retirement plan — just some conservative numbers.
        </template>
      </BodySectionHeader>
      <PortfolioSummary v-if="accountsDone" />
      <SectionPlaceholder
        v-else
        :number="3"
        title="Portfolio Summary"
        description="Add an account above to see how your portfolio adds up."
        :active="false"
      />
    </div>

    <div>
      <div class="flex items-start justify-between mb-4 gap-4">
        <BodySectionHeader>
          Retirement Plan
          <template #subtitle>
            Where you start shaping what retirement actually looks like — add a stage for each
            stretch of life with its own withdrawal rate and account mix.
          </template>
        </BodySectionHeader>
        <div v-if="accountsDone" class="flex items-center gap-2">
          <SecondaryButton rounded aria-label="Add stage" @click="showStageModal = true">
            <template #icon>
              <PlusIcon style="width: 14px; height: 14px" />
            </template>
          </SecondaryButton>
          <SecondaryButton
            v-if="retirementPlan.stages.length"
            rounded
            aria-label="Clear all stages"
            @click="showClearStagesConfirm = true"
          >
            <template #icon>
              <TrashIcon style="width: 14px; height: 14px" />
            </template>
          </SecondaryButton>
        </div>
      </div>
      <RetirementPlanInputs v-if="accountsDone" />
      <SectionPlaceholder
        v-else
        :number="4"
        title="Retirement Plan"
        description="Add an account above to start shaping your retirement plan."
        :active="false"
      />
    </div>

    <div>
      <BodySectionHeader>
        Summary
        <template #subtitle>The rest of your story — from today through every stage of retirement.</template>
      </BodySectionHeader>
      <template v-if="accountsDone">
        <PortfolioCoverageLegend />
        <PortfolioResultsPanel />
      </template>
      <SectionPlaceholder
        v-else
        :number="5"
        title="Summary"
        description="Add an account above to see the rest of your story."
        :active="false"
      />
    </div>

    <PortfolioAssumptionsModal v-if="showAssumptionsModal" @close="showAssumptionsModal = false" />

    <AccountFormModal
      v-if="showAccountModal"
      :accountId="editingAccountId ?? undefined"
      @close="closeAccountModal"
    />

    <StageFormModal v-if="showStageModal" @close="showStageModal = false" />

    <ConfirmModal
      v-if="showClearAllConfirm"
      title="Clear All Accounts?"
      message="This removes every account in your portfolio. This can't be undone."
      confirm-label="Clear All"
      @confirm="clearAllAccounts"
      @cancel="showClearAllConfirm = false"
    />

    <ConfirmModal
      v-if="showResetConfirm"
      title="Reset Portfolio?"
      message="This clears every account and all portfolio assumptions, starting the app over from scratch. This can't be undone."
      confirm-label="Reset"
      @confirm="resetPortfolio"
      @cancel="showResetConfirm = false"
    />

    <ConfirmModal
      v-if="showClearStagesConfirm"
      title="Clear All Stages?"
      message="This removes every stage from your retirement plan — Context, Accounts, and Portfolio assumptions are untouched. This can't be undone."
      confirm-label="Clear All"
      @confirm="clearStages"
      @cancel="showClearStagesConfirm = false"
    />
  </div>
</template>
