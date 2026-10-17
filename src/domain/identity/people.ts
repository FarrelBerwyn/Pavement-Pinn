/**
 * One person may hold one account per interface (modern app and classic portal), e.g.
 * Ir. Ahmad Subagyo = USR-006 (modern) and USR-001 (classic). Workflow ownership is about
 * the person, so assignments, task lists, notifications and the "assigned engineer only"
 * rule compare people, not raw account ids. The first id of each group is the canonical one
 * offered when assigning. Kept in sync with src/data/reference/demoCredentials.ts
 * (tests/unit/people.test.ts), without importing credential data into the domain.
 */
export const LINKED_ACCOUNTS: readonly (readonly string[])[] = [
  ['USR-006', 'USR-001'], // Field Engineer — Ir. Ahmad Subagyo
  ['USR-008', 'USR-002'], // Operations Manager
  ['USR-007', 'USR-003'] // Policy Maker
];

const CANONICAL = new Map<string, string>();
for (const group of LINKED_ACCOUNTS) for (const id of group) CANONICAL.set(id, group[0]);

/** The person behind an account id (the canonical account id). */
export const personOf = (accountId: string | null | undefined): string => (accountId ? CANONICAL.get(accountId) ?? accountId : '');

/** True when two account ids belong to the same person. */
export const samePerson = (a: string | null | undefined, b: string | null | undefined): boolean => !!a && !!b && personOf(a) === personOf(b);
