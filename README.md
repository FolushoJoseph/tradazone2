<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [Tradazone](#tradazone)
  - [📖 About the Project](#-about-the-project)
    - [Key Features](#key-features)
  - [🚀 Getting Started](#-getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
    - [Building for Production](#building-for-production)
    - [Deploying](#deploying)
    - [Modifying the README](#modifying-the-readme)
  - [🛠️ Developer Guide: Auth & SignUp](#-developer-guide-auth--signup)
  - [🛠️ Developer Guide: Auth & SignUp](#-developer-guide-auth--signup-1)
    - [Authentication Flow Overview](#authentication-flow-overview)
    - [Modifying the SignUp Page](#modifying-the-signup-page)
    - [Adding New Wallet Providers](#adding-new-wallet-providers)
    - [Onboarding & Welcome Logic](#onboarding--welcome-logic)
    - [Deep Linking & Redirects](#deep-linking--redirects)
  - [🗂️ Project Structure](#-project-structure)
  - [🛠️ Tech Stack](#-tech-stack)
  - [📐 Architectural Decision Records (ADR)](#-architectural-decision-records-adr)
    - [ADR 001: Selection of Tech Stack & Multi-chain Strategy](#adr-001-selection-of-tech-stack--multi-chain-strategy)
    - [ADR-003: InvoiceDetail Component — Stack & Design Decisions](#adr-003-invoicedetail-component--stack--design-decisions)
    - [ADR-002: API Gateway Stack Selection (Implementation Reference)](#adr-002-api-gateway-stack-selection-implementation-reference)
  - [🔧 Developer Setup Notes](#-developer-setup-notes)
    - [Modifying `ProfileSettings`](#modifying-profilesettings)
  - [🔐 Dependency Security](#-dependency-security)
  - [🔄 Dependency Management](#-dependency-management)
  - [🤝 Contributing](#-contributing)
  - [📄 License](#-license)
  - [🔗 Links](#-links)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Tradazone

> A modern, multi-chain invoicing and checkout platform built for businesses and freelancers — enabling seamless payments across fiat and blockchain networks.

[![Deploy](https://img.shields.io/badge/deployed-GitHub%20Pages-blue?style=flat-square)](https://FolushoJoseph.github.io/Tradazone)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite)](https://vitejs.dev)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](./LICENSE)

---

## 📖 About the Project

Tradazone is a full-featured business management and payment product. It allows users to manage customers, create invoices, run checkout flows, and accept payments — including via Web3 wallets on the Stellar and Starknet networks.

The goal is to give small businesses and freelancers a **single, elegant dashboard** to handle their entire billing workflow, with the option to receive crypto payments without compromising the simplicity of a traditional invoicing tool.

### Key Features

- 🧾 **Invoice creation & PDF export** — Generate professional invoices and download them as PDFs
- 🛒 **Checkout flows** — Create shareable checkout links for products/services
- 📬 **Mail Checkout** — Send payment links directly to customers via email
- 👥 **Customer management** — Add, view, and manage your customer directory
- 📦 **Items & Services catalog** — Build a reusable catalog of your offerings (now supports bulk-delete, resolving issue #123)
<!-- ISSUE #123: Added bulk-delete functionality for items in README catalog -->
- 📊 **Dashboard analytics** — Visual overview of revenue and activity via Chart.js
- 🔐 **Authentication & Onboarding** — Sign up/in flows with a multi-step onboarding experience
- 🌐 **Web3 wallet support** — Connect Freighter (Stellar) and Starknet wallets for crypto payments
- ⚙️ **Settings** — Profile, password, notification, and payment configuration

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm v9 or higher

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/FolushoJoseph/Tradazone.git

# 2. Navigate into the project directory
cd Tradazone

# 3. Install dependencies
npm install
```
> ⚠️ **Security Notice:**
> This project depends on third-party packages that are actively maintained.
> Always ensure you install the latest secure versions by running:
```bash
npm audit fix
```
> Avoid installing outdated or manually pinned versions unless necessary.

```bash
# 4. Start the development server
npm run dev
```
The app will be available at `http://localhost:5173`.

### Building for Production

```bash
npm run build
```

### Deploying

```bash
npm run deploy
```

### Modifying the README

This project uses [doctoc](https://github.com/thlorenz/doctoc) to generate a table of contents from Markdown headings. When adding new sections to the README, follow these guidelines:

1. **Add a descriptive heading**: Use `##` for main sections and `###` for subsections.
2. **Run doctoc after changes**: To update the table of contents, run:
   ```bash
   npm run lint:readme
   ```
3. **CI validates README structure**: The CI pipeline includes a README linting job that checks for proper formatting. This job runs on:
   - Every push to `main` and `staging` branches
   - Every pull request that modifies `README.md`
4. **Manual TOC generation**: If you need to generate the TOC locally without committing, run:
   ```bash
   npx doctoc README.md
   ```

---

## 🛠️ Developer Guide: Auth & SignUp

## 🛠️ Developer Guide: Auth & SignUp

Tradazone uses a multi-chain, wallet-based authentication system. This guide explains how to modify the sign-up and authentication flows.

### Authentication Flow Overview
Authentication is managed globally via the `AuthContext` (`src/context/AuthContext.jsx`). It handles:
- **Session Persistence**: Saving and loading user sessions from `localStorage`.
- **Wallet Integration**: Connecting to Stellar (LOBSTR), Starknet (Argent/Braavos), and EVM wallets (MetaMask, etc.).
- **Automatic Login**: Detecting existing wallet connections on page load.

### Modifying the SignUp Page
The `SignUp` page (`src/pages/auth/SignUp.jsx`) is the entry point for new users. It uses the `ConnectWalletModal` to handle the actual wallet connection.

To modify the post-connection logic, look at the `handleConnectSuccess` function:
```javascript
const handleConnectSuccess = () => {
    /**
     * ISSUE: Missing guard can cause React crashes in edge environments.
     * - `localStorage` access can throw (blocked storage, quota exceeded, privacy mode, etc.).
     * - `redirectTo` should be treated as potentially malformed; always default/sanitize.
     */
    // Mark as first-time user to trigger WelcomeModal onboarding (best-effort)
    try {
        localStorage.setItem('tradazone_onboarded', 'false');
    } catch {
        // Storage is non-critical; proceed without blocking navigation.
    }
    const safeRedirectTo =
        typeof redirectTo === 'string' && redirectTo.startsWith('/')
            ? redirectTo
            : '/';
    navigate(safeRedirectTo, { replace: true });
};
```

### Adding New Wallet Providers
To add support for a new wallet or chain:
1.  **Update `AuthContext.jsx`**: Add a new connection method (e.g., `connectSolanaWallet`) and integrate it into the `connectWallet` dispatcher.
2.  **Update `ConnectWalletModal.jsx`**: Add a new button for the provider and call your new connection method.
3.  **Wallet Discovery**: If the provider supports EIP-6963, it may already be partially detected by `src/utils/wallet-discovery.js`.

### Onboarding & Welcome Logic
When a user connects for the first time, we set `tradazone_onboarded` to `false`. This triggers the `WelcomeModal` (`src/components/ui/WelcomeModal.jsx`) on the Dashboard.
- **Resetting Onboarding**: To test the onboarding flow again, clear your local storage or run `localStorage.removeItem('tradazone_onboarded')` in the console.

### Deep Linking & Redirects
The `SignUp` page supports a `redirect` search parameter. This is useful for sending users back to a specific invoice or checkout page after they've authenticated:
`https://tradazone.com/signup?redirect=/invoices/INV-001`

---

## 🗂️ Project Structure

```
tradazone/
├── public/                     # Static assets (favicon, etc.)
└── src/
    ├── App.jsx                 # Root component — routing & providers
    ├── main.jsx                # Entry point
    ├── index.css               # Global styles
    │
    ├── assets/                 # Images, logos, and static media
    │
    ├── components/
    │   ├── forms/              # Reusable form components
    │   ├── invoice/            # Invoice-specific UI components
    │   ├── layout/             # App shell: Sidebar, Header, Layout wrapper
    │   ├── routing/            # PrivateRoute and auth guards
    │   ├── tables/             # Data table components
    │   └── ui/                 # Generic UI: Modals, Buttons, Inputs, etc.
    │
    ├── context/
    │   ├── AuthContext.jsx     # Authentication state & logic
    │   └── DataContext.jsx     # Global data state (customers, items, invoices)
    │
    ├── hooks/
    │   └── useFreighter.js     # Hook for Stellar Freighter wallet integration
    │
    ├── pages/
    │   ├── auth/               # SignIn, SignUp, Onboarding
    │   ├── checkouts/          # CheckoutList, CreateCheckout, CheckoutDetail, MailCheckout
    │   ├── customers/          # CustomerList, AddCustomer, CustomerDetail
    │   ├── dashboard/          # Home / analytics dashboard
    │   ├── invoices/           # InvoiceList, CreateInvoice, InvoiceDetail, InvoicePreview
    │   ├── items/              # ItemsList, AddItem, ItemDetail
    │   └── settings/           # Profile, Password, Payment, Notification settings
    │
    ├── services/               # API/service layer abstractions
    │
    └── utils/
        ├── detectFreighter.js  # Utility to detect Freighter wallet extension
        └── wallet-discovery.js # Multi-chain wallet discovery helpers
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite 7 |
| Routing | React Router DOM v7 |
| Styling | Tailwind CSS v3 |
| Charts | Chart.js + react-chartjs-2 (ensure latest stable version) |
| PDF Export | html2pdf.js(ensure latest stable version) |
| Icons | Lucide React |
| Stellar Wallet | @stellar/freighter-api |
| Starknet Wallet | get-starknet + starknet.js |
| EVM Wallet | ethers.js v6 (ensure latest stable version)|
| Deployment | GitHub Pages (via gh-pages) |

---

## 📐 Architectural Decision Records (ADR)

### ADR 001: Selection of Tech Stack & Multi-chain Strategy

**Status**: Accepted

**Context**: 
Tradazone aims to provide a seamless invoicing and payment experience across disparate blockchain ecosystems (Stellar, Starknet, EVM). This requires a frontend architecture that is highly performant, scalable, and capable of managing complex, asynchronous multi-chain states while maintaining a premium user interface.

**Decision**:
We have adopted the following core architectural components:
1.  **Foundation**: **React 19** and **Vite 7**.
2.  **Styling**: **Tailwind CSS v3** for a utility-first design system.
3.  **State Management**: **React Context API** for global state (Auth and Data).
4.  **Integration Strategy**: A **Unified `AuthContext`** that abstracts blockchain-specific wallet logic (Freighter, Starknet.js, Ethers.js) into a single authentication interface.

**Rationale**:
- **Why Vite 7?**: Superior development velocity via instant Hot Module Replacement (HMR) and highly optimized production builds using Rollup, essential for modern dApp development workflows.

- **Why React 19?**: Future-proofing the application with modern primitives (Actions, Transitions) that simplify the handling of asynchronous blockchain transactions and state updates.
- **Why Tailwind CSS?**: Facilitates the creation of a "premium" aesthetic with zero runtime CSS overhead, ensuring the application remains fast even as the UI complexity grows.
- **Why Context API?**: After evaluating Redux and Zustand, the native Context API was chosen for its simplicity and direct alignment with React 19’s data-fetching patterns, which is sufficient for the application's current and projected state complexity.
- **Why Unified Auth?**: Centralizing multi-chain logic in a single `AuthContext` reduces component-level complexity, simplifies protected route management, and provides a consistent developer experience when adding support for new networks.

**Consequences**:
- **Positive**: Lightweight bundle size, ultra-fast UI response times, and a clear, modular architecture that lowers the barrier to entry for new contributors.
- **Negative**: Requires manual implementation of complex side effects that more prescriptive state management libraries would otherwise automate.

### ADR-003: InvoiceDetail Component — Stack & Design Decisions

- **Status:** Accepted
- **Date:** 2026-06-01
- **Context:** `InvoiceDetail` (`src/pages/invoices/InvoiceDetail.jsx`) must display live invoice/customer data, trigger client-side PDF generation, and navigate to a print-optimised preview — all without a backend round-trip.
- **Decision:**
  1. Data is accessed via `useData()` / `useAuth()` Context hooks to avoid prop-drilling and keep the component decoupled from the data-fetching layer.
  2. `html2pdf.js` is dynamically imported inside `handleDownload` to exclude it from the initial bundle — loaded only on demand.
  3. An off-screen `InvoiceLayout` (CSS `left: -9999px`) gives `html2pdf` a fully-rendered A4-styled DOM node without affecting the visible layout.
  4. `useRef` targets the PDF node to avoid re-renders during the async export flow.
- **Consequences:** Zero extra network requests and instant page load. PDF fidelity is decoupled from the screen layout. The off-screen node is always mounted (negligible memory cost). Edit/Send actions remain stubs until `src/services/api.js` endpoints are ready.

### ADR-002: API Gateway Stack Selection (Implementation Reference)

- **Status:** Accepted
- **Date:** 2026-03-24
- **Context:** The app currently runs in frontend-only mode with mock data, but feature modules (`customers`, `invoices`, `checkouts`, `items`) already depend on a stable API boundary.
- **Decision:** Keep a centralized JavaScript API gateway module in `src/services/api.js`, using `VITE_API_URL` for runtime base URL configuration and mock-backed async methods until backend endpoints are ready.
- **Consequences:** UI pages can evolve independently from backend readiness and move to real endpoints incrementally by replacing gateway methods. Tradeoff: temporary mock parity maintenance is required.

---

## 🔧 Developer Setup Notes

### Modifying `ProfileSettings`

`ProfileSettings` lives in `src/pages/settings/ProfileSettings.jsx` and depends on:
- `useAuth()` from `src/context/AuthContext.jsx` (for initial `name`/`email`)
- Reusable form controls in `src/components/forms/Input` and `src/components/forms/Button`

Recommended local workflow before editing:

```bash
# Start dev server
npm run dev

# Optional quality checks before pushing
npm run lint
npm run build
```

Implementation notes:
- Keep `formData` keys aligned with field names used in `handleChange`.
- Preserve controlled inputs (`value` + `onChange`) to avoid React state drift.
- If introducing persistence, wire submit logic through `src/services/api.js` (or context action) rather than direct component-level side effects.
- Validate mobile behavior for the `grid grid-cols-1 md:grid-cols-2` layout.

Manual test checklist after edits:
- Navigate to Settings > Profile and confirm existing user name/email are prefilled.
- Edit each field and verify updates are reflected in local component state.
- Submit and verify there are no runtime errors in the browser console.

---

## 🔐 Dependency Security

To ensure a secure development environment:

```bash
# Check for vulnerabilities
npm audit

# Automatically fix issues
npm audit fix
```
> We recommend running audits regularly and keeping dependencies up to date.

---

## 🔄 Dependency Management

This project uses [Dependabot](https://docs.github.com/en/code-security/dependabot) to automate dependency updates. Configuration lives in [`.github/dependabot.yml`](./.github/dependabot.yml).

- npm packages and GitHub Actions are checked **weekly (Monday)**
- PRs are grouped by ecosystem (React, Vite, testing tools) to reduce noise
- A maximum of 5 open PRs per ecosystem prevents queue buildup

To review or adjust the schedule/grouping, edit `.github/dependabot.yml`.

---

## 🤝 Contributing

Contributions, bug reports, and feature suggestions are all welcome!
For full onboarding and SignUp-specific contributor guidance, as well as details on our code of conduct and CI/CD pipeline, please read our [CONTRIBUTING.md](./CONTRIBUTING.md).


---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](./LICENSE) file for details.

---

## 🔗 Links

- 🌍 **Live App**: [https://FolushoJoseph.github.io/Tradazone](https://FolushoJoseph.github.io/Tradazone)
- 📁 **Repository**: [https://github.com/FolushoJoseph/Tradazone](https://github.com/FolushoJoseph/Tradazone)
