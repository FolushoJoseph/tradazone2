## Fixing All Errors in Tradazone Project - Progress Tracker

### Approved Plan Summary

1. Fix Git merge conflict in CustomerList.jsx
2. Fix FormValidation.test.jsx (7 failing tests)
3. Fix other failing test files (DataContext.race.test.jsx + 2 others)
4. Fix ESLint parsing errors (DataTable.jsx, DataContext.jsx syntax)
5. Fix ESLint rule violations (setState in effects, unused vars, etc.)
6. Run verification: pnpm lint (0 errors) + pnpm test (all pass)

### Steps Status

- [x] **Step 1**: Fix merge conflict `src/pages/customers/CustomerList.jsx` ✓
  - Remove git conflict markers
  - Keep DataTable filtering logic (remove local search)

**ADDED**: DataContext.integration.test.jsx - Full integration tests for context mutations per feedback

- [x] **Step 2**: Fix ESLint parsing errors
  - `src/components/tables/DataTable.jsx` line 116 (unexpected }) - Fixed whitespace
  - `src/context/DataContext.jsx` line 291 (unexpected if) - Fixed syntax
  - `src/pages/settings/ProfileSettings.jsx` hasProfile no-undef - Defined from formData
- [ ] **Step 3**: Fix `src/test/FormValidation.test.jsx` (7 failing tests)
  - Update expectations to match implemented validation logic
  - Address require/setup issues (no-undef)

- [ ] **Step 4**: Fix failing tests
  - `src/test/DataContext.race.test.jsx` (test globals no-undef)
  - `src/test/InvoiceDetail.memo.test.jsx` (2 failures)
  - `src/test/ProfileSettings.test.jsx` (2 failures)
  - `src/test/UIComponents.snapshot.test.jsx` (3 snapshot failures)
  - `src/test/ValidationBasic.test.jsx` (1 failure)

- [ ] **Step 5**: Fix ESLint violations
  - react-hooks/set-state-in-effect (PrivateRoute.jsx, ConnectWalletModal.jsx)
  - no-unused-vars (multiple files)
  - Missing globals in test setup.js (vi, describe, test, expect)

- [ ] **Step 6**: Verification
  - `pnpm lint` → 0 errors
  - `pnpm test` → All 32 files pass, 0 failures
  - `pnpm build` → Clean production build

**Current Status**: 0/6 complete  
**Priority**: 1 → 2 → 3 → 4 → 5 → 6  
**Next Action**: Fix CustomerList.jsx merge conflict
