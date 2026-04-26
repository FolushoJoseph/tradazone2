# Tradazone — Product Design Documentation

---

## 1. Overview

Tradazone is a B2B fintech product focused on invoicing, payments, and customer management. The UI is built with **React 19** and styled exclusively with **Tailwind CSS v3** using a custom token-based design system. All design decisions are enforced at configuration level, not component level, making the system highly consistent across the entire application.

The application follows a **sidebar + content** layout model on desktop and a **bottom-nav + drawer** model on mobile, with a fixed top header shared across all authenticated views.

---

## 2. Design Principles

- **Zero border radius.** All rectangular elements are sharp-cornered by design. The only exception is `rounded-full` (9999px) for circular avatars and toggles.
- **Token-first.** No hardcoded color or spacing values. Every visual property maps to a named design token in `tailwind.config.js`.
- **8px spacing grid.** All margins, paddings, and gaps are multiples of 8px.
- **Data-forward layout.** Cards, tables, and lists are the primary content containers. Minimal decoration; information density is prioritized.
- **Mobile-first responsive.** All styles are written for mobile first, with `lg:` (1024px) as the primary breakpoint that switches the layout to the sidebar model.
- **Interactive elements use brand color exclusively.** The brand blue (`#3C3CEF`) is reserved for buttons, links, active states, and focus rings — never used decoratively.
- **Semantic status colors.** Success, warning, error, and info states each have a dedicated foreground and background color pair.

---

## 3. Color System

All colors are defined in `tailwind.config.js` and referenced via Tailwind utility classes.

### Brand Colors

| Token | Value | Usage |
|---|---|---|
| `brand.DEFAULT` | `#3C3CEF` | Primary buttons, links, active nav, focus rings |
| `brand.dark` | `#2E2ED4` | Hover state on brand elements |
| `brand.light` | `#5A5AF5` | Secondary brand decorative treatments |
| `brand.bg` | `#EDEDFD` | Selected nav item background, light brand fills |

### Accent Colors

| Token | Value | Usage |
|---|---|---|
| `accent.orange` | `#F5A623` | Wallet icon, quick-action highlights |
| `accent.blue` | `#3C3CEF` | Alias of `brand.DEFAULT` |

### Surface & Background Colors

| Token | Value | Usage |
|---|---|---|
| `page` | `#F5F6FA` | Application background, table headers |
| `sidebar` | `#FFFFFF` | Sidebar background token (actual: `#F8FAFC` in usage) |
| `white` | `#FFFFFF` | Card surfaces, inputs, modals |

### Text Colors

| Token | Value | Usage |
|---|---|---|
| `t-primary` | `#1E293B` | Headings, primary body text, table data |
| `t-secondary` | `#64748B` | Labels, subheadings, secondary descriptions |
| `t-muted` | `#94A3B8` | Timestamps, metadata, placeholder text |
| `t-light` | `#CBD5E1` | Disabled text |

### Border Colors

| Token | Value | Usage |
|---|---|---|
| `border.DEFAULT` | `#E2E8F0` | Card borders, input borders, dividers |
| `border.medium` | `#CBD5E1` | Hover state on inputs, scrollbar thumb |

### Status Colors

| Status | Foreground | Background |
|---|---|---|
| `success` | `#10B981` | `#D1FAE5` |
| `warning` | `#F59E0B` | `#FEF3C7` |
| `error` | `#EF4444` | `#FEE2E2` |
| `info` | `#3B82F6` | `#DBEAFE` |

**Usage pattern for status:** foreground color on text and icons; background color for badge/pill fills.

---

## 4. Typography

### Font Family

**Primary:** Inter (400, 500, 600, 700)  
**Fallback:** `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `sans-serif`  
**Import:** Google Fonts CDN — loaded in `src/index.css`

Plus Jakarta Sans is imported but not used as the primary face.

### Type Scale

| Role | Size | Line Height | Weight | Class Pattern |
|---|---|---|---|---|
| Display | 48px | 1.1 | 700 | `text-5xl font-bold` |
| Heading 1 | 20px | 1.4 | 500 | `text-xl font-medium` |
| Heading 2 | 16px | 1.5 | 600 | `text-base font-semibold` |
| Body | 14px | 1.5 | 400 | `text-sm` |
| Body Strong | 14px | 1.5 | 600 | `text-sm font-semibold` |
| Small | 13px | 1.4 | 500 | `text-[13px] font-medium` |
| Caption | 12px | 1.4 | 400 | `text-xs` |
| Micro | 11px | 1.3 | 400 | `text-[11px]` |
| Overline / 2xs | 10px | 14px | 500 | `text-2xs font-medium` |

### Typography Rules

- Default body size is `text-sm` (14px), set globally on `body`.
- Numeric/financial values always use `tabular-nums` for alignment in tables.
- Form labels: 12px, medium weight, uppercase, tracking-wide (`text-xs font-medium uppercase tracking-wide text-t-secondary`).
- Long single-line text truncates with `truncate` (`text-ellipsis overflow-hidden whitespace-nowrap`).

---

## 5. Spacing & Layout

### Spacing Scale

Base unit: **8px**. All spacing uses Tailwind's default scale (multiples of 4px, but the system consistently uses 8px multiples).

| Tailwind Token | Pixel Value | Common Usage |
|---|---|---|
| `0.5` / `gap-0.5` | 4px | Icon-to-text gap in badges |
| `1` | 4px (Tailwind) → `8px` logical | Minimum element gap |
| `1.5` | 6px (Tailwind) → `12px` logical | Input vertical padding |
| `2` | 8px | Form field gaps, tight padding |
| `3` | 12px | Inner badge padding |
| `4` | 16px | Standard card padding, mobile page padding |
| `5` | 20px | Medium sections |
| `6` | 24px | Card inner padding (`p-6`), grid gaps |
| `8` | 32px | Desktop page padding (`p-8`) |
| `10` | 40px | Button sizes, input heights |
| `20` | 80px | Empty state vertical padding (`py-20`) |

### Layout Dimensions

| Token | Value | Usage |
|---|---|---|
| `sidebar` (custom) | 250px | Sidebar width |
| `header` (custom) | 72px | Header height |
| Bottom nav height | 64px | Mobile bottom navigation |

### Grid System

- **Dashboard grid:** `grid grid-cols-1 lg:grid-cols-2 gap-6`
- **Column gap:** 24px (`gap-6`)
- **Max content width:** ~1100px (not enforced via a single class — managed by sidebar offset)
- **Invoice table grid:** `grid-cols-[2fr_1fr_1fr_1fr]` (custom column template)

### Container / Page Layout

```
Desktop (lg+):
  Header: fixed top, full-width, 72px height
  Sidebar: fixed left, 250px wide, below header
  Main: margin-left: 250px, margin-top: 72px, padding: 32px

Mobile (< lg):
  Header: fixed top, full-width, 72px height
  Sidebar: hidden (accessible as slide-in drawer)
  Main: margin-top: 72px, padding: 16px, padding-bottom: 64px (for bottom nav)
  BottomNav: fixed bottom, full-width, 64px height
```

---

## 6. Components

### Button

**File:** `src/components/forms/Button.jsx`

**Purpose:** Primary interactive control for all actions.

#### Variants

| Variant | Background | Text | Border | Hover |
|---|---|---|---|---|
| `primary` | `brand.DEFAULT` (`#3C3CEF`) | white | none | `brand.dark` |
| `secondary` | white | `t-primary` | `border.DEFAULT` | `page` background |
| `danger` | `error` (`#EF4444`) | white | none | darker red |
| `ghost` | transparent | `t-secondary` | none | `page` background |

#### Sizes

| Size | Height | Padding | Font |
|---|---|---|---|
| `small` | 32px | `px-3 py-1.5` | `text-xs` |
| `medium` (default) | 40px | `px-4 py-2` | `text-sm` |
| `large` | 48px | `px-5 py-3` | `text-sm` |

#### States

- **Default:** as per variant styles above
- **Hover:** background or border color shifts; transition-all 150ms
- **Active:** `scale-95` transform (100ms ease-out)
- **Disabled:** `opacity-60`, `cursor-not-allowed`, no hover effects
- **Loading:** spinner icon replaces or prepends label; pointer-events disabled

#### Usage

```jsx
<Button variant="primary" size="medium" onClick={handleSave}>
  Save Invoice
</Button>

<Button variant="secondary" icon={<Plus size={18} />}>
  Add Item
</Button>

<Button variant="primary" loading={isSaving}>
  Saving...
</Button>

<Button variant="danger" size="small">
  Delete
</Button>
```

---

### Input

**File:** `src/components/forms/Input.jsx`

**Purpose:** Single-line text entry with label, validation, and hint support.

#### Anatomy

- Label (optional): `text-xs font-medium uppercase tracking-wide text-t-secondary`
- Required indicator: `text-error` asterisk
- Input field: 40–44px height, `px-3 py-2.5`, `text-sm text-t-primary`
- Hint text (optional): `text-xs text-t-muted` below input
- Error message (optional): `text-xs text-error` below input

#### States

| State | Border | Behavior |
|---|---|---|
| Default | `border.DEFAULT` (`#E2E8F0`) | Normal |
| Focused | `brand.DEFAULT` (`#3C3CEF`) | Ring outline |
| Error | `error` (`#EF4444`) | Error border + message shown |
| Disabled | `border.DEFAULT` | `opacity-60`, `cursor-not-allowed`, `bg-page` |

#### Usage

```jsx
<Input
  label="Invoice Number"
  value={invoiceNumber}
  onChange={handleChange}
  placeholder="INV-001"
  required
  hint="Auto-generated if left blank"
/>

<Input
  label="Email"
  type="email"
  error="Please enter a valid email address"
/>
```

---

### Select

**File:** `src/components/forms/Select.jsx`

**Purpose:** Dropdown selection with native `<select>` styled to match Input.

- Same height, padding, and border behavior as Input
- Custom chevron icon (`ChevronDown`, 18px, `text-t-muted`) via absolute positioning
- States: default, focused (`brand.DEFAULT` border), error, disabled
- Required indicator and error message supported

#### Usage

```jsx
<Select
  label="Currency"
  value={currency}
  onChange={handleChange}
  options={[{ value: 'USD', label: 'US Dollar' }]}
  required
/>
```

---

### Toggle

**File:** `src/components/forms/Toggle.jsx`

**Purpose:** On/off switch for settings and boolean preferences.

- Width: 40px, height: 20px
- Unchecked: `border.medium` track, white indicator
- Checked: `brand.DEFAULT` track, white indicator slides to right
- Transition: 200ms smooth slide animation
- Built on hidden checkbox for native accessibility

#### Usage

```jsx
<Toggle
  label="Email Notifications"
  checked={emailEnabled}
  onChange={setEmailEnabled}
/>
```

---

### StatusBadge

**File:** `src/components/tables/StatusBadge.jsx`

**Purpose:** Inline status indicator for invoices, customers, and checkouts.

#### Variants (9 status types)

| Status | Text Color | Background |
|---|---|---|
| `paid` | `success` | `success.bg` |
| `unpaid` | `warning` | `warning.bg` |
| `pending` | `warning` | `warning.bg` |
| `overdue` | `error` | `error.bg` |
| `active` | `success` | `success.bg` |
| `inactive` | `t-secondary` | `border.DEFAULT` |
| `completed` | `success` | `success.bg` |
| `cancelled` | `error` | `error.bg` |
| `draft` | `t-muted` | `page` |

**Anatomy:** Padding `px-3 py-1`, `text-xs font-semibold`, capitalized label.

#### Usage

```jsx
<StatusBadge status="paid" />
<StatusBadge status="overdue" />
```

---

### DataTable

**File:** `src/components/tables/DataTable.jsx`

**Purpose:** Responsive tabular data display for lists of invoices, customers, items, etc.

#### Structure

- **Wrapper:** horizontal scroll on mobile (`overflow-x-auto`)
- **Table header:** `bg-page`, `text-xs font-semibold uppercase tracking-wide text-t-secondary`, no bottom border between header and rows
- **Rows:** minimum height 44px, `hover:bg-page` on interactive rows
- **Last row:** no bottom border
- **Empty state:** renders `EmptyState` component when no data

#### Usage

```jsx
<DataTable
  columns={[
    { key: 'number', label: 'Invoice #' },
    { key: 'customer', label: 'Customer' },
    { key: 'amount', label: 'Amount' },
    { key: 'status', label: 'Status' },
  ]}
  data={invoices}
  onRowClick={(row) => navigate(`/invoices/${row.id}`)}
/>
```

---

### EmptyState

**File:** `src/components/ui/EmptyState.jsx`

**Purpose:** Placeholder shown when a list or page has no data.

#### Anatomy

- Container: vertically centered, `py-20`
- Icon container: 64×64px, `bg-brand-bg`, centered icon in `text-brand`
- Title: `text-base font-semibold text-t-primary`
- Description: `text-sm text-t-muted`, centered
- Action button (optional): `Button variant="primary"`

#### Usage

```jsx
<EmptyState
  icon={<FileText size={28} />}
  title="No invoices yet"
  description="Create your first invoice to get started."
  action={{ label: 'Create Invoice', onClick: handleCreate }}
/>
```

---

### Logo

**File:** `src/components/ui/Logo.jsx`

**Purpose:** Renders the Tradazone wordmark in light or dark variant.

| Variant | Asset | Usage |
|---|---|---|
| `light` | `logo-blue.png` | Light backgrounds (sidebar, auth pages) |
| `dark` | `logo-white.png` | Dark backgrounds (header) |

- Default height: `h-6` (24px) on mobile, `lg:h-7` (28px) on desktop

#### Usage

```jsx
<Logo variant="dark" />   {/* White logo in header */}
<Logo variant="light" />  {/* Blue logo in sidebar */}
```

---

### WelcomeModal / ConnectWalletModal

**File:** `src/components/ui/WelcomeModal.jsx`

**Purpose:** Onboarding modal shown on first login. Doubles as the pattern for all full modals in the application.

#### Layout

- **Mobile:** Bottom sheet with drag handle, slides up from bottom (`animate-slide-up`)
- **Desktop:** Centered overlay, `max-w-[480px]`, horizontally and vertically centered
- **Backdrop:** `bg-black/30` with blur

#### Anatomy

- Drag handle (mobile only): `w-10 h-1 bg-border.medium rounded-full mx-auto`
- Close button: top-right `X` icon, `text-t-muted hover:text-t-primary`
- Title: `text-base font-semibold`
- Quick actions grid: `grid-cols-3 gap-3`
- Action tile: icon (24px) + label (`text-xs`), `hover:bg-brand-bg` on hover

#### Animation

```css
/* slide-up keyframe — cubic-bezier(0.32, 0.72, 0, 1), 300ms */
from { transform: translateY(100%); }
to   { transform: translateY(0); }
```

---

### Header

**File:** `src/components/layout/Header.jsx`

**Purpose:** Fixed top navigation bar present on all authenticated pages.

- Height: 72px (`h-header`)
- Background: `bg-brand` (`#3C3CEF`)
- Contains: hamburger icon (mobile), Logo (dark variant), notification bell, user avatar
- Avatar: 36×36px, `rounded-full`, white border ring
- Z-index: `z-[100]`

---

### Sidebar

**File:** `src/components/layout/Sidebar.jsx`

**Purpose:** Fixed left navigation panel on desktop; slide-in drawer on mobile.

- Width: 250px (`w-sidebar`)
- Background: `bg-[#F8FAFC]` (near-white)
- Right border: `border-r border-border`
- Top offset: 72px (`top-header`)
- Z-index: `z-[95]` (below header overlay)

#### Navigation Items

- Default: `text-t-secondary`, transparent background
- Hover: `bg-brand-bg`, `text-brand`
- Active: `bg-brand-bg`, `text-brand`, 3px left border in `brand.DEFAULT`
- Icon: 20px, stroke 1.5px default, 2px active
- Label: `text-sm font-medium`

#### Logout Button

Pinned to bottom of sidebar. `text-error` color, `hover:bg-error/10`.

---

### BottomNav

**File:** `src/components/layout/BottomNav.jsx`

**Purpose:** Mobile-only bottom navigation bar (hidden on `lg+`).

- Height: 64px, fixed bottom
- Background: white, `border-t border-border`
- 5 navigation items with icon + label
- Active item: `text-brand`, icon stroke 2.2px
- Inactive item: `text-t-muted`

---

## 7. Interaction Patterns

### Modals

- Always rendered with a `bg-black/30` backdrop
- Desktop: centered, `max-w-[480px]`, `w-full`
- Mobile: full-width bottom sheet with `animate-slide-up`
- Closed by: close button (X), clicking backdrop, or completing action
- Z-index: backdrop at `z-[90]`, modal panel at `z-[95]`

### Form Interactions

- Label floats above field (static, not floating-label pattern)
- Error messages appear below the field on blur or submit attempt
- Required fields marked with `*` in `text-error`
- Submit buttons show loading spinner during async operations
- Fields disabled during loading state (`opacity-60`, `cursor-not-allowed`)

### Loading States

- **Button loading:** spinner icon replaces/prepends label; button is `pointer-events-none`
- **Page loading:** full-page or section-level spinner centered in container
- **Table loading:** skeleton rows or spinner overlay

### Error Handling UI

- Field-level errors: `text-xs text-error` message below input
- Toast/notification errors: not observed as a standalone component (handled inline)
- Empty states: `EmptyState` component with descriptive message and optional action

### Feedback Patterns

- Success actions navigate away or update badge status (e.g., invoice status → `paid`)
- Destructive actions (delete) require a confirmation modal before proceeding
- Status changes reflected immediately via `StatusBadge` re-render

---

## 8. Responsiveness

### Breakpoints

Standard Tailwind breakpoints. The application uses `lg` as the only significant layout breakpoint.

| Breakpoint | Width | Layout Switch |
|---|---|---|
| `sm` | 640px | Minor element adjustments |
| `md` | 768px | Minor element adjustments |
| `lg` | **1024px** | **Primary: sidebar visible, bottom nav hidden, 2-col grids** |
| `xl` | 1280px | Not actively used |
| `2xl` | 1536px | Not actively used |

### Responsive Behavior

| Element | Mobile (< 1024px) | Desktop (≥ 1024px) |
|---|---|---|
| Header | Full width, hamburger visible | Full width, hamburger hidden |
| Sidebar | Hidden, slide-in drawer on hamburger tap | Fixed left, always visible |
| Bottom Nav | Visible (64px fixed) | Hidden (`lg:hidden`) |
| Main padding | `p-4` (16px) | `p-8` (32px) |
| Main margin-left | 0 | 250px (`ml-sidebar`) |
| Main padding-bottom | 64px (above bottom nav) | 32px |
| Dashboard grid | 1 column | 2 columns (`lg:grid-cols-2`) |
| Sidebar overlay | `bg-black/40` backdrop | No overlay |

---

## 9. Accessibility

### Touch Targets

- Minimum interactive element height: 44px (compliant with WCAG 2.5.5)
- Button sizes: small (32px — below target, used only for supplementary actions), medium (40px), large (48px)
- Navigation items: minimum 44px height

### Semantic HTML

- Page uses semantic elements: `<header>`, `<nav>`, `<main>`, `<aside>`
- Forms use `<label>` elements associated with inputs via `htmlFor`
- Tables use `<thead>`, `<tbody>`, `<th scope="col">`

### Focus States

- Inputs: focus ring using `brand.DEFAULT` color via Tailwind `focus:ring` / `focus:border-brand`
- Buttons inherit browser default focus ring (not explicitly overridden)

### Reduced Motion

- The custom `slide-up` animation is defined in Tailwind config
- The codebase does not currently include explicit `prefers-reduced-motion` media query overrides at the component level

### ARIA

- Toggle component uses hidden checkbox input (inherits native ARIA)
- Modal components use `role="dialog"` pattern
- Navigation items use `aria-current="page"` for active route indication

---

## 10. File & Component Organization

### Directory Structure

```
src/
├── assets/                   # Logo images (logo-white.png, logo-blue.png)
├── components/
│   ├── forms/                # Button, Input, Select, Toggle
│   ├── layout/               # Header, Sidebar, BottomNav, Layout
│   ├── invoice/              # InvoiceTable, InvoiceHeader, InvoiceFooter,
│   │                         #   InvoiceLayout, InvoiceSummary
│   ├── tables/               # DataTable, StatusBadge
│   ├── ui/                   # Logo, EmptyState, WelcomeModal, ConnectWalletModal
│   └── routing/              # PrivateRoute
├── context/                  # AuthContext, DataContext
├── pages/
│   ├── auth/                 # SignIn, SignUp, Onboarding
│   ├── checkouts/            # CheckoutList, CheckoutDetail, CreateCheckout, MailCheckout
│   ├── customers/            # CustomerList, CustomerDetail, AddCustomer
│   ├── dashboard/            # Home
│   ├── invoices/             # InvoiceList, InvoiceDetail, CreateInvoice, InvoicePreview
│   ├── items/                # ItemsList, ItemDetail, AddItem
│   └── settings/             # Settings, ProfileSettings, PaymentSettings,
│                             #   PasswordSettings, NotificationSettings
├── services/                 # API layer
├── hooks/                    # Custom React hooks
├── utils/                    # Helpers and formatters
├── data/                     # Mock/seed data
└── index.css                 # Global styles (Tailwind imports + base rules)
```

### Naming Conventions

| Type | Convention | Example |
|---|---|---|
| Component files | PascalCase `.jsx` | `InvoiceTable.jsx` |
| Page files | PascalCase `.jsx` | `InvoiceList.jsx` |
| Context files | PascalCase + `Context` | `AuthContext.jsx` |
| Hook files | camelCase + `use` prefix | `useAuth.js` |
| Service files | camelCase | `invoiceService.js` |
| CSS tokens | kebab-case in Tailwind | `t-primary`, `brand-bg` |

### Styling Conventions

- All styling via Tailwind utility classes — no inline `style` props except for dynamic values
- Component-specific styling lives in the component file (no separate `.module.css` files)
- Global rules (font, reset, scrollbar) in `src/index.css` `@layer base`
- Design tokens defined once in `tailwind.config.js` — referenced by name everywhere

### Component Authoring Pattern

1. Props are destructured at the top with defaults
2. Variant/size → className mapping defined as a `const` object inside the component
3. Conditional classes composed with template literals or `clsx`
4. No external class-name library (no `clsx` dependency confirmed) — uses template literals

---

## Appendix: Design Token Quick Reference

```js
// tailwind.config.js — full color token map
colors: {
  brand: { DEFAULT: '#3C3CEF', dark: '#2E2ED4', light: '#5A5AF5', bg: '#EDEDFD' },
  accent: { orange: '#F5A623', blue: '#3C3CEF' },
  page: '#F5F6FA',
  sidebar: '#FFFFFF',
  't-primary': '#1E293B',
  't-secondary': '#64748B',
  't-muted': '#94A3B8',
  't-light': '#CBD5E1',
  border: { DEFAULT: '#E2E8F0', medium: '#CBD5E1' },
  success: { DEFAULT: '#10B981', bg: '#D1FAE5' },
  warning: { DEFAULT: '#F59E0B', bg: '#FEF3C7' },
  error:   { DEFAULT: '#EF4444', bg: '#FEE2E2' },
  info:    { DEFAULT: '#3B82F6', bg: '#DBEAFE' },
}

// Custom spacing
spacing: { sidebar: '250px', header: '72px' }

// Border radius — all zero except full
borderRadius: { ...(all variants): '0px', full: '9999px' }

// Custom font size
fontSize: { '2xs': ['10px', { lineHeight: '14px' }] }

// Custom animation
animation: { 'slide-up': 'slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1)' }
```
