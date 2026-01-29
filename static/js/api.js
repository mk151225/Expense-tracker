const API = {
    async login(pin) {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin })
        });
        if (!res.ok) throw new Error('Invalid PIN');
        return res.json();
    },

    async checkAuth() {
        const res = await fetch('/api/me');
        return res.json();
    },

    async logout() {
        await fetch('/api/logout', { method: 'POST' });
        window.location.reload();
    },

    async getDashboardData(period = 'monthly') {
        const res = await fetch(`/api/dashboard?period=${period}`);
        if (res.status === 401) window.location.reload();
        return res.json();
    },

    async getTransactions(filters = {}) {
        const params = new URLSearchParams(filters);
        const res = await fetch(`/api/transactions?${params}`);
        if (res.status === 401) window.location.reload();
        return res.json();
    },

    async addTransaction(data) {
        const res = await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to add transaction');
        }
        return res.json();
    },

    async deleteTransaction(id) {
        const res = await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete');
        return res.json();
    },

    async getCategories() {
        const res = await fetch('/api/categories');
        if (res.status === 401) window.location.reload();
        return res.json();
    },

    async addCategory(name, type) {
        const res = await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, type })
        });
        if (!res.ok) throw new Error('Failed to add category');
        return res.json();
    },

    async deleteCategory(id) {
        const res = await fetch(`/api/categories?id=${id}`, { method: 'DELETE' });
        return res.json();
    },

    async changePin(currentPin, newPin) {
        const res = await fetch('/api/change-pin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ current_pin: currentPin, new_pin: newPin })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to change PIN');
        }
        return res.json();
    }
};
