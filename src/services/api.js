// API Service for Tradazone
// Handles data fetching and backend integration

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
