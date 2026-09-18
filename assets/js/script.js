// Budget & Cashflow State Management
const STORAGE_KEY = 'budget_cashflow_app_data_v2';

const PERIOD_NAMES = {
    month: 'Monthly',
    week: 'Weekly',
    day: 'Daily'
};

// Initial default state
let appState = {
    activePeriod: 'month',
    periods: {
        month: { budget: 0, spendings: [] },
        week: { budget: 0, spendings: [] },
        day: { budget: 0, spendings: [] }
    }
};

// DOM Selectors
const tabButtons = document.querySelectorAll('.tab-btn');
const periodLabel = document.querySelector('#periodLabel');
const displayBudget = document.querySelector('#displayBudget');
const displaySpent = document.querySelector('#displaySpent');
const displayBalance = document.querySelector('#displayBalance');
const balanceStatus = document.querySelector('#balanceStatus');

const inputBudget = document.querySelector('#inputBudget');
const btnAddBudget = document.querySelector('#btnAddBudget');
const btnSetBudget = document.querySelector('#btnSetBudget');

const inputSpendingAmount = document.querySelector('#inputSpendingAmount');
const inputSpendingNote = document.querySelector('#inputSpendingNote');
const btnAddSpending = document.querySelector('#btnAddSpending');

const spendingsList = document.querySelector('#spendingsList');
const spendingsCount = document.querySelector('#spendingsCount');
const btnResetPeriod = document.querySelector('#btnResetPeriod');

// Philippine Peso Currency Formatter
const formatPHP = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2
});

// Format timestamp for display (e.g., "Sep 18, 4:15 PM")
function formatDate(isoString) {
    try {
        const d = new Date(isoString);
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    } catch {
        return '';
    }
}

// Persist state to localStorage
function saveToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    } catch (err) {
        console.warn('Could not save to localStorage:', err);
    }
}

// Load state from localStorage
function loadFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;

        const parsed = JSON.parse(raw);
        if (parsed && parsed.periods) {
            appState = {
                activePeriod: parsed.activePeriod || 'month',
                periods: {
                    month: parsed.periods.month || { budget: 0, spendings: [] },
                    week: parsed.periods.week || { budget: 0, spendings: [] },
                    day: parsed.periods.day || { budget: 0, spendings: [] }
                }
            };
        }
    } catch (err) {
        console.warn('Could not load from localStorage:', err);
    }
}

// Calculate totals for active period
function getPeriodMetrics() {
    const current = appState.periods[appState.activePeriod];
    const budget = Number(current.budget) || 0;
    const totalSpent = current.spendings.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const balance = budget - totalSpent;

    return { budget, totalSpent, balance };
}

// Render entire UI based on active state
function renderUI() {
    const { activePeriod } = appState;
    const currentPeriodData = appState.periods[activePeriod];
    const { budget, totalSpent, balance } = getPeriodMetrics();

    // 1. Update Tabs
    tabButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.period === activePeriod);
    });

    // 2. Update Period Label in Form
    periodLabel.textContent = PERIOD_NAMES[activePeriod] || 'Monthly';

    // 3. Update Metrics Overview
    displayBudget.textContent = formatPHP.format(budget);
    displaySpent.textContent = totalSpent > 0 ? `-${formatPHP.format(totalSpent)}` : formatPHP.format(0);
    displayBalance.textContent = formatPHP.format(balance);

    // Dynamic Balance Status Tag & Colors
    if (budget === 0 && totalSpent === 0) {
        balanceStatus.className = 'status-tag neutral';
        balanceStatus.textContent = 'No Budget';
        displayBalance.className = 'metric-value balance';
    } else if (balance > 0) {
        balanceStatus.className = 'status-tag positive';
        balanceStatus.textContent = 'Surplus';
        displayBalance.className = 'metric-value balance positive';
    } else if (balance === 0) {
        balanceStatus.className = 'status-tag neutral';
        balanceStatus.textContent = 'Exact';
        displayBalance.className = 'metric-value balance';
    } else {
        balanceStatus.className = 'status-tag negative';
        balanceStatus.textContent = 'Deficit';
        displayBalance.className = 'metric-value balance negative';
    }

    // 4. Update Spendings Count & List
    const items = currentPeriodData.spendings;
    spendingsCount.textContent = `${items.length} ${items.length === 1 ? 'item' : 'items'}`;

    if (items.length === 0) {
        spendingsList.innerHTML = `
            <div class="empty-state">
                No spendings recorded for this ${activePeriod} yet.
            </div>
        `;
    } else {
        spendingsList.innerHTML = items
            .slice()
            .reverse() // show latest first
            .map(item => `
                <div class="spending-item" data-id="${item.id}">
                    <div class="spending-info">
                        <span class="spending-note">${escapeHTML(item.note)}</span>
                        <span class="spending-meta">${formatDate(item.date)}</span>
                    </div>
                    <div class="spending-right">
                        <span class="spending-amount">-${formatPHP.format(item.amount)}</span>
                        <button type="button" class="btn-delete-item" title="Delete spending" aria-label="Delete spending">
                            ✕
                        </button>
                    </div>
                </div>
            `)
            .join('');
    }
}

// Simple HTML escaping for security
function escapeHTML(str) {
    const p = document.createElement('p');
    p.textContent = str;
    return p.innerHTML;
}

// Switch timeframe tab
function switchPeriod(period) {
    if (!appState.periods[period]) return;
    appState.activePeriod = period;
    inputBudget.value = '';
    renderUI();
    saveToStorage();
}

// Action: Add Funds to Existing Allotted Budget (Preserves existing spendings)
function handleAddBudget() {
    const value = parseFloat(inputBudget.value);
    if (isNaN(value) || value <= 0) {
        alert('Please enter a valid positive amount to add to your budget.');
        inputBudget.focus();
        return;
    }

    const currentPeriod = appState.periods[appState.activePeriod];
    currentPeriod.budget = (Number(currentPeriod.budget) || 0) + value;

    inputBudget.value = '';
    renderUI();
    saveToStorage();
    inputBudget.focus();
}

// Action: Set / Overwrite Allotted Budget Directly (Preserves existing spendings)
function handleSetBudget() {
    const value = parseFloat(inputBudget.value);
    if (isNaN(value) || value < 0) {
        alert('Please enter a valid positive budget amount.');
        inputBudget.focus();
        return;
    }

    appState.periods[appState.activePeriod].budget = value;
    inputBudget.value = '';
    renderUI();
    saveToStorage();
    inputBudget.focus();
}

// Action: Add Spending Deduction
function handleAddSpending() {
    const amount = parseFloat(inputSpendingAmount.value);
    if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid spending amount.');
        inputSpendingAmount.focus();
        return;
    }

    const note = inputSpendingNote.value.trim() || 'General Expense';
    const newEntry = {
        id: 'sp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        amount,
        note,
        date: new Date().toISOString()
    };

    appState.periods[appState.activePeriod].spendings.push(newEntry);

    // Clear inputs
    inputSpendingAmount.value = '';
    inputSpendingNote.value = '';

    renderUI();
    saveToStorage();
    inputSpendingAmount.focus();
}

// Action: Delete Single Spending
function handleDeleteSpending(id) {
    const period = appState.activePeriod;
    appState.periods[period].spendings = appState.periods[period].spendings.filter(item => item.id !== id);
    renderUI();
    saveToStorage();
}

// Action: Reset Current Period
function handleResetPeriod() {
    const periodName = PERIOD_NAMES[appState.activePeriod];
    if (confirm(`Reset all budget and spendings for ${periodName}?`)) {
        appState.periods[appState.activePeriod] = {
            budget: 0,
            spendings: []
        };
        inputBudget.value = '';
        renderUI();
        saveToStorage();
    }
}

// Event Listeners Setup
tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        switchPeriod(btn.dataset.period);
    });
});

btnAddBudget.addEventListener('click', handleAddBudget);
btnSetBudget.addEventListener('click', handleSetBudget);
inputBudget.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        // If current period already has a budget, Enter adds to it; otherwise sets it
        if (appState.periods[appState.activePeriod].budget > 0) {
            handleAddBudget();
        } else {
            handleSetBudget();
        }
    }
});

btnAddSpending.addEventListener('click', handleAddSpending);
[inputSpendingAmount, inputSpendingNote].forEach(input => {
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddSpending();
        }
    });
});

// Event delegation for delete buttons in spendings list
spendingsList.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.btn-delete-item');
    if (!deleteBtn) return;

    const itemEl = deleteBtn.closest('.spending-item');
    if (itemEl && itemEl.dataset.id) {
        handleDeleteSpending(itemEl.dataset.id);
    }
});

btnResetPeriod.addEventListener('click', handleResetPeriod);

// Initialize application
loadFromStorage();
renderUI();

// Register Service Worker for offline PWA support
if ('serviceWorker' in navigator && (window.location.protocol.startsWith('http') || window.location.hostname === 'localhost')) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => {
                console.log('Service Worker registered for offline use:', reg.scope);
            })
            .catch(err => {
                console.log('Service Worker registration note:', err);
            });
    });
}
