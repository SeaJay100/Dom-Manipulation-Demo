const currBalance = document.querySelector('#currBalance');
const totalBudget = document.querySelector('#totalBudget');
const btnCalculate = document.querySelector('#btnCalculate');
const btnReset = document.querySelector('#btnReset');
const resultContainer = document.querySelector('#resultContainer');
const resultBadge = document.querySelector('#resultBadge');
const badgeTotal = document.querySelector('#badgeTotal');
const resultDesc = document.querySelector('#resultDesc');

const STORAGE_KEY = 'budget_calc_saved_data';

const formatPHP = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2
});

function getCurrBalance() {
    return Number(currBalance.value) || 0;
}

function getTotalBudget() {
    return Number(totalBudget.value) || 0;
}

// Persist user inputs to localStorage
function saveState() {
    try {
        const data = {
            balance: currBalance.value,
            budget: totalBudget.value
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
        console.warn('Unable to save to localStorage:', err);
    }
}

// Render calculated result into DOM
function renderResult(balance, budget) {
    const difference = balance - budget;
    resultContainer.style.display = 'block';

    if (balance > budget) {
        resultBadge.className = 'status-tag positive';
        resultBadge.textContent = 'Surplus';
        badgeTotal.className = 'result-amount positive';
        badgeTotal.textContent = `+${formatPHP.format(difference)}`;
        resultDesc.textContent = 'Remaining funds available after budgeted expenses.';
    } else if (balance === budget) {
        resultBadge.className = 'status-tag neutral';
        resultBadge.textContent = 'Balanced';
        badgeTotal.className = 'result-amount neutral';
        badgeTotal.textContent = formatPHP.format(0);
        resultDesc.textContent = 'Current balance exactly covers total budget.';
    } else {
        const deficit = Math.abs(difference);
        resultBadge.className = 'status-tag negative';
        resultBadge.textContent = 'Deficit';
        badgeTotal.className = 'result-amount negative';
        badgeTotal.textContent = `-${formatPHP.format(deficit)}`;
        resultDesc.textContent = `Allocated budget exceeds available balance by ${formatPHP.format(deficit)}.`;
    }
}

// Calculate action handler
function totalDifference() {
    const rawBalance = currBalance.value.trim();
    const rawBudget = totalBudget.value.trim();

    if (rawBalance === '' || rawBudget === '') {
        resultContainer.style.display = 'block';
        resultBadge.className = 'status-tag neutral';
        resultBadge.textContent = 'Required';
        badgeTotal.className = 'result-amount neutral';
        badgeTotal.textContent = '—';
        resultDesc.textContent = 'Please provide both balance and budget amounts.';
        return;
    }

    const balance = getCurrBalance();
    const budget = getTotalBudget();

    renderResult(balance, budget);
    saveState();
}

// Clear all inputs and wipe localStorage
function resetCalculator() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
        console.warn('Unable to remove from localStorage:', err);
    }

    currBalance.value = '';
    totalBudget.value = '';
    resultContainer.style.display = 'none';
    currBalance.focus();
}

// Restore saved balance/budget from localStorage when page loads
function restoreSavedState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;

        const data = JSON.parse(raw);
        if (data.balance !== undefined && data.balance !== '') {
            currBalance.value = data.balance;
        }
        if (data.budget !== undefined && data.budget !== '') {
            totalBudget.value = data.budget;
        }

        // If both values exist, auto-calculate and display result
        if (data.balance !== '' && data.budget !== '') {
            renderResult(Number(data.balance) || 0, Number(data.budget) || 0);
        }
    } catch (err) {
        console.warn('Unable to load from localStorage:', err);
    }
}

// Event Listeners
btnCalculate.addEventListener('click', totalDifference);
btnReset.addEventListener('click', resetCalculator);

// Auto-save typing changes so exiting midway still preserves state
[currBalance, totalBudget].forEach(input => {
    input.addEventListener('input', saveState);

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            totalDifference();
        }
    });
});

// Run restore on page load
restoreSavedState();
