/**
 * src/services/api.js
 *
 * ISSUE: #99 (Vulnerable outdated package referenced in API gateway)
 * Category: Security & Compliance
 * Affected Area: API gateway
 * Description: Outdated project dependencies were referenced in the gateway stack.
 * This has been remediated by updating package.json and implementing explicit
 * catch logic and secure headers in the centralized apiFetch wrapper.
 *
 * ADR-001 (API gateway / Fetch stack): documented in docs/adr/001-api-gateway-stack.md
 * Issue Reference: #201, #99, #122 (Bulk-delete functionality for items in API gateway)
 */

import {
    mockCustomers,
    mockInvoices,
    mockCheckouts,
    mockItems,
} from "../data/mockData";

// Base URL for the backend API
// In development, this can be an environment variable or proxy
const API_BASE_URL =
    import.meta.env.VITE_API_URL || "http://localhost:3000/api";

// Helper to simulate API delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Slice an array into a single page of results.
 *
 * @param {Array}  items
 * @param {number} page   - 1-based page number. Values < 1 are clamped to 1.
 * @param {number} limit  - Items per page (default 10).
 * @returns {{ data: Array, page: number, limit: number, total: number, totalPages: number }}
 */
export function paginate(items, page = 1, limit = 10) {
    // BUG FIX #31: clamp page to minimum of 1 to prevent page-0 underflow
    const safePage = Math.max(1, Math.floor(page));
    const safeLimit = Math.max(1, Math.floor(limit));
    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / safeLimit));
    //if the requested page exceeds the available pages,clamp to last page
    const clampedPage = Math.min(safePage, totalPages);
    const start = (clampedPage - 1) * safeLimit;
    return {
        data: items.slice(start, start + safeLimit),
        page: clampedPage,
        limit: safeLimit,
        total,
        totalPages,
    };
}
// ---------------------------------------------------------------------------
// 401 / token-expiration interceptor
// ---------------------------------------------------------------------------

/**
 * Callback invoked whenever apiFetch receives a 401 Unauthorized response.
 *
 * Default behaviour: hard-redirect to the sign-in page so the user is always
 * prompted to reconnect, even without a running React tree (e.g. a background
 * fetch that fires after the component unmounts).
 *
 * Override at app initialisation to use React Router's navigate instead:
 * ```js
 * import { setUnauthorizedHandler } from './services/api';
 * setUnauthorizedHandler(() => {
 * logout();
 * navigate('/signin?reason=expired');
 * });
 * ```
 */
let _onUnauthorized = () => {
    const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
    window.location.assign(`${base}/signin?reason=expired`);
};

/**
 * Register a custom handler for 401 responses.
 * Call this once during app initialisation inside a component that has access
 * to both `useAuth` and `useNavigate` (e.g. a child of BrowserRouter).
 *
 * @param {() => void} handler
 */
export function setUnauthorizedHandler(handler) {
    _onUnauthorized = handler;
}

/**
 * Thin fetch wrapper that centralises authentication-error handling.
 *
 * - Returns parsed JSON on 2xx responses.
 * - On 401: calls _onUnauthorized() and returns
 * `{ ok: false, error: 'ERR_TOKEN_EXPIRED', status: 401 }` so callers
 * receive a machine-readable code rather than an unhandled rejection.
 * - On other non-2xx: throws an error enriched with `status` and `body`.
 *
 * Migration guide — replace each TODO mock with:
 * ```js
 * return apiFetch(`${API_BASE_URL}/resource`);
 * ```
 *
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<unknown>}
 */
async function apiFetch(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'X-Content-Type-Options': 'nosniff',
            ...options.headers
        },
        ...options
    };
    const response = await fetch(url, defaultOptions);

    if (response.status === 401) {
        _onUnauthorized();
        return { ok: false, error: 'ERR_TOKEN_EXPIRED', status: 401 };
    }

    /**
     * BUG FIX #16: Empty catch block in API gateway obscured underlying network errors.
     *
     * - On 2xx: explicitly return parsed JSON (previously fell through with undefined).
     * - On non-2xx: the .catch() on response.json() now logs the parse failure and
     *   includes the HTTP status in the fallback body so callers and CI pipelines
     *   can diagnose the root cause instead of receiving an opaque error.
     * - Network-level failures (e.g. DNS, CORS, timeout) are caught by the outer
     *   try/catch in callers or by the fetch rejection itself; this wrapper focuses
     *   on HTTP-layer error propagation.
     */
    if (!response.ok) {
        const body = await response.json().catch((parseError) => {
            console.error(
                `[API Gateway] Failed to parse error response as JSON (status ${response.status}): ${parseError.message}`
            );
            return { message: `API error ${response.status}` };
        });

        throw Object.assign(
            new Error(body.message || `API error ${response.status}`),
            { status: response.status, body }
        );
    }
    return await response.json();
}

// Expose for tests and future real-fetch migrations (not needed by mock callers)
export { apiFetch };

const api = {
    // Customers
    customers: {
        list: async (page = 1, limit = 10) => {
            // TODO: Replace with fetch(`${API_BASE_URL}/customers?page=${page}&limit=${limit}`)
            await delay(500);
            return paginate(mockCustomers, page, limit);
        },
        get: async (id) => {
            await delay(300);
            return mockCustomers.find(c => c.id === id);
        },
        create: async (data) => {
            await delay(800);
            return { id: Date.now().toString(), ...data };
        },
        update: async (id, data) => {
            await delay(500);
            return { id, ...data };
        },
        delete: async (id) => {
            await delay(500);
            console.log("API Delete Customer:", id);
            return true;
        },
    },

    // Invoices
    invoices: {
        list: async (page = 1, limit = 10) => {
            await delay(500);
            return paginate(mockInvoices, page, limit);
        },
        get: async (id) => {
            await delay(300);
            return mockInvoices.find(i => i.id === id);
        },
        create: async (data) => {
            await delay(800);
            return { id: `INV-${Date.now()}`, ...data };
        },
    },

    // Checkouts
    checkouts: {
        list: async (page = 1, limit = 10) => {
            await delay(500);
            return paginate(mockCheckouts, page, limit);
        },
        create: async (data) => {
            await delay(800);
            return { id: `CHK-${Date.now()}`, ...data };
        },
    },

    // Items
    items: {
        list: async (page = 1, limit = 10) => {
            await delay(500);
            return paginate(mockItems, page, limit);
        },
        create: async (data) => {
            await delay(800);
            return { id: Date.now().toString(), ...data };
        },
        delete: async (id) => {
            await delay(500);
            return true;
        },
        bulkDelete: async (ids) => {
            return apiFetch(`${API_BASE_URL}/items/bulk`, {
                method: 'DELETE',
                body: JSON.stringify({ ids })
            });
        },
    },
};

export default api;