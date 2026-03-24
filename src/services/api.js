// API Service for Tradazone
// Handles data fetching and backend integration
//
// ADR-API-001 (Accepted, 2026-03-24):
// We use a centralized JavaScript gateway module as the API boundary for UI features.
// Context: backend endpoints are still being phased in while pages need stable contracts.
// Decision: keep `api` domain groups (`customers`, `invoices`, `checkouts`, `items`)
// in this file and resolve base URL from `VITE_API_URL` with a local fallback.
// Consequence: feature pages can ship against consistent async interfaces now and
// migrate method-by-method to real HTTP calls without rewriting page-level logic.

import { mockCustomers, mockInvoices, mockCheckouts, mockItems } from '../data/mockData';

// Base URL for the backend API
// In development, this can be an environment variable or proxy
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Helper to simulate API delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const api = {
    // Customers
    customers: {
        list: async () => {
            // TODO: Replace with fetch(`${API_BASE_URL}/customers`)
            await delay(500);
            return mockCustomers;
        },
        get: async (id) => {
            await delay(300);
            return mockCustomers.find(c => c.id === id);
        },
        create: async (data) => {
            await delay(800);
            console.log('API Create Customer:', data);
            return { id: Date.now().toString(), ...data };
        },
        update: async (id, data) => {
            await delay(500);
            console.log('API Update Customer:', id, data);
            return { id, ...data };
        },
        delete: async (id) => {
            await delay(500);
            console.log('API Delete Customer:', id);
            return true;
        }
    },

    // Invoices
    invoices: {
        list: async () => {
            await delay(500);
            return mockInvoices;
        },
        get: async (id) => {
            await delay(300);
            return mockInvoices.find(i => i.id === id);
        },
        create: async (data) => {
            await delay(800);
            console.log('API Create Invoice:', data);
            return { id: `INV-${Date.now()}`, ...data };
        }
    },

    // Checkouts
    checkouts: {
        list: async () => {
            await delay(500);
            return mockCheckouts;
        },
        create: async (data) => {
            await delay(800);
            console.log('API Create Checkout:', data);
            return { id: `CHK-${Date.now()}`, ...data };
        }
    },

    // Items
    items: {
        list: async () => {
            await delay(500);
            return mockItems;
        },
        create: async (data) => {
            await delay(800);
            console.log('API Create Item:', data);
            return { id: Date.now().toString(), ...data };
        }
    }
};

export default api;
