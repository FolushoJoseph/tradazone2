# Contributing to Tradazone

This guide is the onboarding reference for contributors, with focused notes for the SignUp flow and shared contributor workflow.

## Development Setup

```bash
# 1. Clone
git clone https://github.com/FolushoJoseph/Tradazone.git
cd Tradazone

# 2. Install dependencies
npm install

# 3. Run locally
npm run dev
```

Optional validation before opening a PR:

```bash
npm run lint
npm run build
```

## SignUp Onboarding Guide

Primary file: `src/pages/auth/SignUp.jsx`

Related dependencies:
- `useAuth()` from `src/context/AuthContext.jsx` for auth state and wallet connection
- `ConnectWalletModal` from `src/components/ui/ConnectWalletModal`
- Route handling via `useNavigate` and `useSearchParams`

Current flow summary:
1. If `user.isAuthenticated` is true, user is redirected immediately.
2. Clicking "Connect Wallet" opens the modal.
3. On successful wallet connect, `tradazone_onboarded` is set to `false`.
4. User is redirected to the computed `redirect` path (or `/`).

When modifying SignUp:
- Keep redirect behavior backward compatible with query param `redirect`.
- Preserve `tradazone_onboarded` initialization unless onboarding flow is intentionally redesigned.
- Avoid coupling modal internals into page logic; keep the page orchestrating state and navigation only.
- Ensure the layout remains usable on small screens (left panel is scrollable by design).

Manual test checklist for SignUp:
- Visiting `/signup` while authenticated redirects correctly.
- Visiting `/signup?redirect=/settings/profile` redirects to the expected route after connect.
- Modal opens, closes, and triggers success callback without console errors.
- `localStorage.getItem("tradazone_onboarded")` is `"false"` right after successful connect.

## Code Change Standards

- Follow existing naming conventions (`PascalCase` components, `camelCase` helpers/hooks).
- Reuse existing form and UI components before adding new primitives.
- Keep modules focused and avoid unrelated refactors in the same pull request.

## Pull Request Guidelines

1. Create a branch (`feature/<name>` or `fix/<name>`).
2. Make focused commits with clear intent (`feat:`, `fix:`, `docs:`, etc.).
3. Include a short test plan in the PR description.
4. Link related issue(s), screenshots, or recordings when UI changes are involved.

