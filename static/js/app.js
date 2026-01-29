// Main App Controller
let categories = [];
let currentView = 'dashboard';
let allTransactions = []; // Store raw transaction data for filtering
let currentFilters = {
    type: 'all',
    date: 'all'
};

// --- View Logic (Global) ---

async function switchView(target) {
    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll(`.nav-item[data-target="${target}"]`).forEach(b => b.classList.add('active'));

    // Hide all sub-views
    document.querySelectorAll('.sub-view').forEach(v => v.classList.add('hidden'));

    // Show target content container
    const targetContent = document.getElementById(`${target}-content`);
    if (targetContent) targetContent.classList.remove('hidden');

    // Update Title
    document.getElementById('page-title').textContent = target.charAt(0).toUpperCase() + target.slice(1);

    currentView = target;
    await loadViewData(target);
}

async function loadViewData(view) {
    // Ensure global categories are loaded (useful for multiple views)
    if (categories.length === 0) categories = await API.getCategories();

    if (view === 'dashboard') {
        const data = await API.getDashboardData();
        UI.renderDashboard(data);
        setupFilterListeners();
    } else if (view === 'transactions') {
        const tData = await API.getTransactions();
        allTransactions = tData;
        UI.renderTransactions(allTransactions, categories);
        setupTransactionFilters(); // Initialize filters
        setupAddTransactionListeners();
    } else if (view === 'manage') {
        // Always reload categories when viewing manage page
        categories = await API.getCategories();
        UI.renderManage(categories);
        setupManageListeners();
    }
}

function showApp() {
    document.getElementById('main-view').classList.remove('hidden');
    loadData(); // Load initial data
    switchView('dashboard');
}

async function loadData() {
    categories = await API.getCategories();
}


// --- Transaction Filters & Actions ---

function setupTransactionFilters() {
    const dateSelect = document.getElementById('filter-date');
    const typeSelect = document.getElementById('filter-type');

    if (dateSelect) {
        const newDate = dateSelect.cloneNode(true);
        dateSelect.parentNode.replaceChild(newDate, dateSelect);
        newDate.addEventListener('change', () => {
            currentFilters.date = newDate.value;
            applyFilters();
        });
    }

    if (typeSelect) {
        const newType = typeSelect.cloneNode(true);
        typeSelect.parentNode.replaceChild(newType, typeSelect);
        newType.addEventListener('change', () => {
            currentFilters.type = newType.value;
            applyFilters();
        });
    }
}

function applyFilters() {
    let filtered = [...allTransactions];
    const now = new Date();

    // 1. Type
    if (currentFilters.type !== 'all') {
        filtered = filtered.filter(t => t.type === currentFilters.type);
    }

    // 2. Date
    if (currentFilters.date !== 'all') {
        filtered = filtered.filter(t => {
            const tDate = new Date(t.date);
            if (currentFilters.date === 'today') {
                const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
                return t.date === todayStr;
            }
            if (currentFilters.date === '7days') {
                const limit = new Date(); limit.setDate(now.getDate() - 7);
                return tDate >= limit;
            }
            if (currentFilters.date === 'month') {
                return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
            }
            if (currentFilters.date === 'last_month') {
                const last = new Date(); last.setMonth(now.getMonth() - 1);
                return tDate.getMonth() === last.getMonth() && tDate.getFullYear() === last.getFullYear();
            }
            return true;
        });
    }

    // Always Sort Newest First
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Update UI
    const listContainer = document.getElementById('t-list-container');
    if (listContainer) {
        listContainer.innerHTML = UI.generateTransactionList(filtered);
        lucide.createIcons();
    }
}


function setupAddTransactionListeners() {
    const modal = document.getElementById('transaction-modal');
    const openBtns = document.querySelectorAll('#add-transaction-btn-desktop, #add-transaction-fab');
    openBtns.forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', () => {
            if (document.getElementById('t-date')) {
                document.getElementById('t-date').valueAsDate = new Date();
            }
            UI.populateCategoryDropdown(categories);
            document.getElementById('transaction-error').classList.add('hidden');
            modal.classList.remove('hidden');
        });
    });
}

function setupFilterListeners() {
    document.querySelectorAll('.pill-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const period = e.target.dataset.period;
            const data = await API.getDashboardData(period);
            UI.renderDashboard(data, period);
            setupFilterListeners();
        });
    });
}

function setupManageListeners() {
    document.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            content.classList.toggle('open');
        });
    });

    const handleAddCat = async (type) => {
        const input = document.getElementById(`new-${type}-cat`);
        const name = input.value.trim();
        const errorDiv = document.getElementById(`manage-${type}-error`);
        errorDiv.classList.add('hidden');

        if (name) {
            try {
                await API.addCategory(name, type);
                input.value = ''; // Clear input after successful addition
                loadViewData('manage');
            } catch (err) {
                errorDiv.textContent = err.message || 'Failed to add category';
                errorDiv.classList.remove('hidden');
            }
        }
    };

    if (document.getElementById('add-expense-cat'))
        document.getElementById('add-expense-cat').addEventListener('click', () => handleAddCat('expense'));
    if (document.getElementById('add-income-cat'))
        document.getElementById('add-income-cat').addEventListener('click', () => handleAddCat('income'));

    document.querySelectorAll('.delete-cat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const errorDiv = e.target.closest('.accordion-content').querySelector('.error-msg');

            if (confirm('Delete Category?')) {
                API.deleteCategory(id).then(() => loadViewData('manage')).catch(err => {
                    if (errorDiv) {
                        errorDiv.textContent = err.message;
                        errorDiv.classList.remove('hidden');
                    }
                });
            }
        });
    });

    const updatePinBtn = document.getElementById('update-pin-btn');
    if (updatePinBtn) {
        updatePinBtn.addEventListener('click', async () => {
            const current = document.getElementById('current-pin').value;
            const newPin = document.getElementById('new-pin').value;
            const errorDiv = document.getElementById('security-error');
            const successDiv = document.getElementById('security-success');

            errorDiv.classList.add('hidden');
            successDiv.classList.add('hidden');

            try {
                await API.changePin(current, newPin);
                successDiv.textContent = 'PIN Updated Successfully';
                successDiv.classList.remove('hidden');
                document.getElementById('current-pin').value = '';
                document.getElementById('new-pin').value = '';
            } catch (e) {
                errorDiv.textContent = e.message;
                errorDiv.classList.remove('hidden');
            }
        });
    }

    if (document.getElementById('logout-btn')) {
        document.getElementById('logout-btn').addEventListener('click', async () => {
            await API.logout();
            location.reload();
        });
    }
}


// --- Initialization ---

document.addEventListener('DOMContentLoaded', async () => {
    lucide.createIcons();

    // Check Auth
    const auth = await API.checkAuth();
    if (auth.authenticated) {
        showApp();
    } else {
        document.getElementById('login-view').classList.remove('hidden');
    }

    // Login Form
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const pin = document.getElementById('pin-input').value;
        const errorDiv = document.getElementById('login-error');
        errorDiv.classList.add('hidden');

        try {
            await API.login(pin);
            document.getElementById('login-view').classList.add('hidden');
            showApp();
        } catch (err) {
            errorDiv.textContent = err.message || 'Invalid PIN';
            errorDiv.classList.remove('hidden');
        }
    });

    // Navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            switchView(target);
        });
    });

    // Modal Close (Generic)
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').classList.add('hidden');
        });
    });

    // Transaction Form
    document.getElementById('t-type').addEventListener('change', () => {
        UI.populateCategoryDropdown(categories);
    });

    document.getElementById('transaction-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorDiv = document.getElementById('transaction-error');
        errorDiv.classList.add('hidden');

        const categoryId = document.getElementById('t-category').value;
        const transactionType = document.getElementById('t-type').value;

        // Validate category selection
        if (!categoryId || categoryId === '') {
            errorDiv.textContent = `Please add a ${transactionType} category in Manage & Settings first.`;
            errorDiv.classList.remove('hidden');
            return;
        }

        const data = {
            type: transactionType,
            amount: document.getElementById('t-amount').value,
            category_id: categoryId,
            date: document.getElementById('t-date').value,
            description: document.getElementById('t-desc').value
        };

        try {
            await API.addTransaction(data);
            document.getElementById('transaction-modal').classList.add('hidden');
            e.target.reset();
            loadViewData(currentView);
        } catch (err) {
            errorDiv.textContent = err.message;
            errorDiv.classList.remove('hidden');
        }
    });

    // Delete Confirmation Logic
    const confirmYes = document.getElementById('confirm-yes');
    if (confirmYes) {
        confirmYes.addEventListener('click', async () => {
            if (pendingDeleteId) {
                try {
                    const res = await API.deleteTransaction(pendingDeleteId);
                    if (res && res.success) {
                        document.getElementById('confirm-modal').classList.add('hidden');

                        // Show Success
                        const successModal = document.getElementById('success-modal');
                        if (successModal) {
                            successModal.classList.remove('hidden');
                            setTimeout(() => successModal.classList.add('hidden'), 1500);
                        }

                        // Update Local State & UI
                        allTransactions = allTransactions.filter(t => t.id != pendingDeleteId);
                        applyFilters();
                    }
                } catch (e) {
                    console.error('Delete failed', e);
                    alert('Failed to delete transaction');
                }
            }
        });
    }

    const confirmCancel = document.getElementById('confirm-cancel');
    if (confirmCancel) {
        confirmCancel.addEventListener('click', () => {
            document.getElementById('confirm-modal').classList.add('hidden');
        });
    }

});

// Global Window App Actions
let pendingDeleteId = null;

window.app = {
    deleteTransaction: (id) => {
        pendingDeleteId = id;
        document.getElementById('confirm-modal').classList.remove('hidden');
    },
    editTransaction: (id) => {
        // Placeholder or implement logic
    }
};
