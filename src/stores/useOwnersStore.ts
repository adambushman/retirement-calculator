import { defineStore } from "pinia";
import { ref } from "vue";

// A single, growing list of owner names shared across every account (e.g.
// household members). Accounts reference an owner by name directly rather
// than by id, since there's no other owner-specific data to store yet.
export const useOwnersStore = defineStore("owners", () => {
  const owners = ref<string[]>([]);

  function addOwner(name: string): string {
    const trimmed = name.trim();
    if (!trimmed) return '';

    const existing = owners.value.find(
      (o) => o.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) return existing;

    owners.value.push(trimmed);
    return trimmed;
  }

  return {
    owners,
    addOwner,
  };
}, { persist: true });
