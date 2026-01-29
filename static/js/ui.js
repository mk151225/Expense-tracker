const UI = {
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    },

    formatDate(dateString) {
        if (!dateString) return '';
        const d = new Date(dateString);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '/');
    },

    getCategoryIcon(catName) {
        // Simple mapping or default
        const icons = {
            'Salary': 'banknote', 'Business': 'briefcase', 'Investment': 'trending-up',
            'Food': 'utensils', 'Transport': 'car', 'Shopping': 'shopping-bag',
            'Bills': 'file-text', 'Entertainment': 'film', 'Health': 'heart',
            'Education': 'book-open'
        };
        // Normalize
        for (let key in icons) {
            if (catName && catName.toLowerCase().includes(key.toLowerCase())) return icons[key];
        }
        return 'tag';
    },

    renderDashboard(data, activePeriod = 'monthly') {
        const content = document.getElementById('dashboard-content');

        const getActive = (p) => p === activePeriod ? 'active' : '';

        content.innerHTML = `
            <div class="summary-cards">
                <div class="stat-card card-income">
                    <h3>Total Income</h3>
                    <div class="amount" style="color:var(--success-color)">${this.formatCurrency(data.summary.income)}</div>
                </div>
                <div class="stat-card card-expense">
                    <h3>Total Expenses</h3>
                    <div class="amount" style="color:var(--danger-color)">${this.formatCurrency(data.summary.expenses)}</div>
                </div>
                <div class="stat-card card-balance">
                    <h3>Current Balance</h3>
                    <div class="amount">${this.formatCurrency(data.summary.balance)}</div>
                </div>
            </div>

            <div class="charts-grid">
                <div class="chart-section" style="grid-column: span 2;">
                    <div class="chart-header">
                        <h3>Analytics</h3>
                        <div class="pills">
                            <button class="pill-btn ${getActive('monthly')}" data-period="monthly">Monthly</button>
                            <button class="pill-btn ${getActive('weekly')}" data-period="weekly">Weekly</button>
                            <button class="pill-btn ${getActive('daily')}" data-period="daily">Daily</button>
                        </div>
                    </div>
                    <canvas id="incomeExpenseChart" height="280"></canvas>
                </div>
                <div class="chart-section" style="grid-column: span 1;">
                    <div class="chart-header">
                        <h3>Spending by Category</h3>
                    </div>
                    <canvas id="categoryChart" height="280"></canvas>
                </div>
            </div>
        `;
        this.renderCharts(data);
    },

    renderCharts(data) {
        // Line Chart
        const lineCtx = document.getElementById('incomeExpenseChart').getContext('2d');
        // Set chart default font color
        Chart.defaults.color = '#a3a3a3';

        new Chart(lineCtx, {
            type: 'line',
            data: {
                labels: data.line_chart.labels,
                datasets: [
                    {
                        label: 'Income',
                        borderColor: '#10b981', // Keep Green for money
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        data: data.line_chart.income,
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: '#10b981'
                    },
                    {
                        label: 'Expense',
                        borderColor: '#ef4444', // Keep Red for money
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        data: data.line_chart.expense,
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: '#ef4444'
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'top', labels: { color: '#f5f5f5' } }, title: { display: false } },
                scales: {
                    y: { grid: { borderDash: [4, 4], color: '#333333' }, beginAtZero: true },
                    x: { grid: { display: false } }
                }
            }
        });

        // Bar/Doughnut Chart for Categories
        const catCtx = document.getElementById('categoryChart').getContext('2d');
        new Chart(catCtx, {
            type: 'doughnut',
            data: {
                labels: data.bar_chart.labels,
                datasets: [{
                    data: data.bar_chart.data,
                    // Gold Palette for categories
                    backgroundColor: ['#d4af37', '#fcd34d', '#b4941f', '#fafafa', '#a3a3a3', '#525252'],
                    borderColor: '#1a1a1a',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'bottom', labels: { color: '#f5f5f5' } } },
                cutout: '70%'
            }
        });
    },

    renderTransactions(transactions, categories = []) {
        const content = document.getElementById('transactions-content');

        // Simplified Filter UI
        const filterHTML = `
            <div class="filters-container" style="margin-bottom: 1rem; padding: 1rem; background: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <div class="filter-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    
                    <!-- Date Range -->
                    <div class="filter-group">
                        <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary); font-size: 0.875rem;">Date Range</label>
                        <select id="filter-date" style="width: 100%; padding: 0.5rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: var(--bg-color); color: var(--text-primary);">
                            <option value="all">All Time</option>
                            <option value="today">Today</option>
                            <option value="7days">Last 7 Days</option>
                            <option value="month">This Month</option>
                            <option value="last_month">Last Month</option>
                        </select>
                    </div>

                    <!-- Type -->
                    <div class="filter-group">
                        <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary); font-size: 0.875rem;">Transaction Type</label>
                        <select id="filter-type" style="width: 100%; padding: 0.5rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: var(--bg-color); color: var(--text-primary);">
                            <option value="all">All Transactions</option>
                            <option value="income">Income Only</option>
                            <option value="expense">Expenses Only</option>
                        </select>
                    </div>

                </div>
            </div>
        `;

        const listHTML = `
            <div class="transaction-list" id="t-list-container">
                ${this.generateTransactionList(transactions)}
            </div>
        `;

        content.innerHTML = filterHTML + listHTML;
        lucide.createIcons();
    },

    generateTransactionList(transactions) {
        if (!transactions || transactions.length === 0) return '<div class="text-center" style="color:var(--text-secondary); padding:2rem;">No transactions found.</div>';

        return transactions.map(t => `
            <div class="transaction-item" onclick="app.editTransaction(${t.id})">
                <div style="display:flex; align-items:center; flex:1">
                    <div class="t-icon-container">
                        <i data-lucide="${this.getCategoryIcon(t.category_name)}"></i>
                    </div>
                    <div class="t-content">
                        <div class="t-title">${t.description || t.category_name}</div>
                        <div class="t-date">${this.formatDate(t.date)} • ${t.category_name}</div>
                    </div>
                </div>
                <div style="text-align:right">
                    <div class="t-amount ${t.type}">${t.type === 'income' ? '+' : '-'} ${this.formatCurrency(t.amount)}</div>
                    <button class="btn-icon" onclick="event.stopPropagation(); app.deleteTransaction(${t.id})" style="background:none; border:none; padding:8px; cursor:pointer; color:var(--text-secondary)">
                        <i data-lucide="trash-2" style="width:16px; height:16px;"></i>
                    </button>
                </div>
            </div>
        `).join('');
    },

    renderManage(categories) {
        const container = document.getElementById('manage-content');

        const incomeCats = categories.filter(c => c.type === 'income');
        const expenseCats = categories.filter(c => c.type === 'expense');

        const renderCatList = (cats, type) => {
            return `
            <div id="manage-${type}-error" class="error-msg hidden"></div>
            <ul class="category-list">
                ${cats.map(c => `
                    <li>
                        <span style="font-weight: 500;">${c.name}</span> 
                        <button class="delete-cat-btn" data-id="${c.id}" style="color:var(--text-secondary); border:none; background:none; cursor:pointer;">
                            <i data-lucide="trash" style="width:18px;"></i>
                        </button>
                    </li>`).join('')}
            </ul>
            <div class="add-cat-form" style="display:flex; gap:0.5rem; margin-top:1rem;">
                <input type="text" placeholder="Add new ${type} category..." id="new-${type}-cat" style="flex:1; padding: 0.75rem; border:1px solid var(--border-color); border-radius: var(--radius-sm); background:var(--bg-color); color:var(--text-primary);">
                <button class="btn btn-primary" id="add-${type}-cat"><i data-lucide="plus"></i></button>
            </div>`;
        };

        container.innerHTML = `
            <div class="accordion">
                <!-- Expense Categories -->
                <div class="accordion-item">
                    <button class="accordion-header">
                        <div style="display:flex; align-items:center; gap:0.75rem;">
                            <div style="background:#fee2e2; width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; color:var(--danger-color);">
                                <i data-lucide="shopping-bag" style="width:18px;"></i>
                            </div>
                            <span>Expense Categories</span>
                        </div>
                        <i data-lucide="chevron-down"></i>
                    </button>
                    <div class="accordion-content">
                        ${renderCatList(expenseCats, 'expense')}
                    </div>
                </div>

                <!-- Income Categories -->
                <div class="accordion-item">
                    <button class="accordion-header">
                        <div style="display:flex; align-items:center; gap:0.75rem;">
                            <div style="background:#d1fae5; width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; color:var(--success-color);">
                                <i data-lucide="banknote" style="width:18px;"></i>
                            </div>
                            <span>Income Categories</span>
                        </div>
                        <i data-lucide="chevron-down"></i>
                    </button>
                    <div class="accordion-content">
                        ${renderCatList(incomeCats, 'income')}
                    </div>
                </div>

                <!-- Security -->
                <div class="accordion-item">
                    <button class="accordion-header">
                        <div style="display:flex; align-items:center; gap:0.75rem;">
                             <div style="background:#e0e7ff; width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; color:var(--primary-color);">
                                <i data-lucide="shield" style="width:18px;"></i>
                            </div>
                            <span>Security</span>
                        </div>
                        <i data-lucide="chevron-down"></i>
                    </button>
                    <div class="accordion-content">
                         <div id="security-error" class="error-msg hidden"></div>
                         <div id="security-success" class="error-msg hidden" style="background-color: #d1fae5; color: var(--success-color); border-color: #34d399;"></div>
                         <div style="display: grid; gap: 1rem; max-width: 400px;">
                            <div class="form-group">
                                <label>Current PIN</label>
                                <input type="password" id="current-pin" maxlength="4">
                            </div>
                            <div class="form-group">
                                <label>New PIN (4 digits)</label>
                                <input type="password" id="new-pin" maxlength="4">
                            </div>
                            <button class="btn btn-primary" id="update-pin-btn">Update PIN</button>
                        </div>
                    </div>
                </div>
                
                <button class="btn btn-secondary" id="logout-btn" style="width: 100%; border: 1px solid #fee2e2; color: var(--danger-color); justify-content: center; margin-top: 1rem;">
                    <i data-lucide="log-out"></i> Log Out
                </button>
            </div>
        `;
        lucide.createIcons();
    },

    populateCategoryDropdown(categories) {
        const select = document.getElementById('t-category');
        const typeSelect = document.getElementById('t-type');
        if (!select) return;

        const type = typeSelect ? typeSelect.value : 'expense';
        const filtered = categories.filter(c => c.type === type);

        if (filtered.length === 0) {
            select.innerHTML = `<option value="">No ${type} categories available</option>`;
        } else {
            select.innerHTML = filtered.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
    }
};
