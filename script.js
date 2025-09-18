// Global State Management
let expenses = JSON.parse(localStorage.getItem('studyspend_expenses')) || [];
let recurringBills = JSON.parse(localStorage.getItem('studyspend_bills')) || [];
let budgetSettings = JSON.parse(localStorage.getItem('studyspend_budget')) || {
    monthlyLimit: 10000,
    warningThreshold: 80,
    categoryBudgets: {}
};
let notificationSettings = JSON.parse(localStorage.getItem('studyspend_notifications')) || {
    reminderTime: '21:30',
    budgetWarnings: true,
    billReminders: true
};

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    checkNotificationPermission();
    setupDailyReminder();
});

function initializeApp() {
    showSection('dashboard');
    updateDashboard();
    displayRecentTransactions();
    displayRecurringBills();
    loadBudgetSettings();
    loadNotificationSettings();
    
    // Set today's date as default
    document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];
}

// Navigation Management
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            showSection(section);
            
            // Update active nav state
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });
    
    // Notification permission
    document.getElementById('enable-notifications').addEventListener('click', requestNotificationPermission);
    
    // Form submissions
    document.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.target.closest('#add-expense')) {
            addExpense();
        }
    });
}

function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionId).classList.add('active');
    
    // Update specific section data
    if (sectionId === 'statistics') {
        updateStatistics();
    } else if (sectionId === 'recurring-bills') {
        displayRecurringBills();
    } else if (sectionId === 'budget-limits') {
        displayCategoryBudgets();
    }
}

// Expense Management
function addExpense() {
    const description = document.getElementById('expense-description').value.trim();
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const category = document.getElementById('expense-category').value;
    const date = document.getElementById('expense-date').value;
    const notes = document.getElementById('expense-notes').value.trim();
    
    // Validation
    if (!description || !amount || amount <= 0) {
        showNotification('Please enter valid description and amount!', 'danger');
        return;
    }
    
    const expense = {
        id: Date.now(),
        description,
        amount,
        category,
        date: date || new Date().toISOString().split('T')[0],
        notes,
        timestamp: new Date().toISOString()
    };
    
    expenses.push(expense);
    saveData();
    
    // Check budget limits
    checkBudgetLimits();
    
    // Update UI
    updateDashboard();
    displayRecentTransactions();
    clearExpenseForm();
    
    showNotification(`Expense of ₹${amount} added successfully!`, 'success');
}

function clearExpenseForm() {
    document.getElementById('expense-description').value = '';
    document.getElementById('expense-amount').value = '';
    document.getElementById('expense-category').value = 'Food';
    document.getElementById('expense-notes').value = '';
    document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];
}

// Recurring Bills Management
function showAddBillModal() {
    document.getElementById('add-bill-modal').style.display = 'block';
    // Set next due date to next month
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    document.getElementById('bill-due-date').value = nextMonth.toISOString().split('T')[0];
}

function closeAddBillModal() {
    document.getElementById('add-bill-modal').style.display = 'none';
    clearBillForm();
}

function addRecurringBill() {
    const name = document.getElementById('bill-name').value.trim();
    const amount = parseFloat(document.getElementById('bill-amount').value);
    const frequency = document.getElementById('bill-frequency').value;
    const dueDate = document.getElementById('bill-due-date').value;
    const category = document.getElementById('bill-category').value;
    
    if (!name || !amount || amount <= 0 || !dueDate) {
        showNotification('Please fill all required fields!', 'danger');
        return;
    }
    
    const bill = {
        id: Date.now(),
        name,
        amount,
        frequency,
        dueDate,
        category,
        isActive: true,
        lastPaid: null,
        createdAt: new Date().toISOString()
    };
    
    recurringBills.push(bill);
    saveData();
    displayRecurringBills();
    closeAddBillModal();
    updateDashboard();
    
    showNotification(`Recurring bill "${name}" added successfully!`, 'success');
}

function clearBillForm() {
    document.getElementById('bill-name').value = '';
    document.getElementById('bill-amount').value = '';
    document.getElementById('bill-frequency').value = 'monthly';
    document.getElementById('bill-due-date').value = '';
    document.getElementById('bill-category').value = 'Housing';
}

function displayRecurringBills() {
    const container = document.getElementById('recurring-bills-list');
    
    if (recurringBills.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-plus" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 1rem;"></i>
                <h3>No recurring bills yet</h3>
                <p>Add your regular expenses like rent, electricity, phone bills</p>
                <button onclick="showAddBillModal()" class="premium-btn" style="margin-top: 1rem;">
                    <i class="fas fa-plus"></i> Add Your First Bill
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = recurringBills.map(bill => {
        const daysUntilDue = getDaysUntilDue(bill.dueDate);
        const statusClass = daysUntilDue <= 3 ? 'urgent' : daysUntilDue <= 7 ? 'warning' : 'normal';
        
        return `
            <div class="bill-card ${statusClass}">
                <div class="bill-header">
                    <div class="bill-info">
                        <h4>${bill.name}</h4>
                        <p>${bill.category}</p>
                    </div>
                    <div class="bill-amount">₹${bill.amount.toFixed(2)}</div>
                </div>
                <div class="bill-meta">
                    <div class="bill-frequency">
                        <i class="fas fa-clock"></i> ${bill.frequency}
                        <br><small>Due: ${formatDate(bill.dueDate)} (${daysUntilDue} days)</small>
                    </div>
                    <div class="bill-actions">
                        <button class="edit-btn" onclick="editBill(${bill.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-btn" onclick="deleteBill(${bill.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function deleteBill(id) {
    if (confirm('Are you sure you want to delete this recurring bill?')) {
        recurringBills = recurringBills.filter(bill => bill.id !== id);
        saveData();
        displayRecurringBills();
        updateDashboard();
        showNotification('Recurring bill deleted successfully!', 'success');
    }
}

// Budget Management
function updateBudgetSettings() {
    const monthlyBudget = parseFloat(document.getElementById('monthly-budget').value);
    const warningThreshold = parseInt(document.getElementById('warning-threshold').value);
    
    if (!monthlyBudget || monthlyBudget <= 0) {
        showNotification('Please enter a valid monthly budget!', 'danger');
        return;
    }
    
    if (!warningThreshold || warningThreshold < 1 || warningThreshold > 100) {
        showNotification('Warning threshold must be between 1-100%!', 'danger');
        return;
    }
    
    budgetSettings.monthlyLimit = monthlyBudget;
    budgetSettings.warningThreshold = warningThreshold;
    
    saveData();
    updateDashboard();
    showNotification('Budget settings updated successfully!', 'success');
}

function loadBudgetSettings() {
    document.getElementById('monthly-budget').value = budgetSettings.monthlyLimit;
    document.getElementById('warning-threshold').value = budgetSettings.warningThreshold;
}

function checkBudgetLimits() {
    const monthlySpent = getMonthlyTotal();
    const percentage = (monthlySpent / budgetSettings.monthlyLimit) * 100;
    
    if (percentage >= 100) {
        showNotification(
            `🚨 Budget Exceeded! You've spent ₹${monthlySpent.toFixed(2)} (${percentage.toFixed(1)}%) of your ₹${budgetSettings.monthlyLimit} monthly budget.`,
            'danger'
        );
        
        // Browser notification
        if (Notification.permission === 'granted') {
            new Notification('Budget Exceeded!', {
                body: `You've exceeded your monthly budget of ₹${budgetSettings.monthlyLimit}`,
                icon: '💸'
            });
        }
    } else if (percentage >= budgetSettings.warningThreshold) {
        showNotification(
            `⚠️ Budget Warning! You've spent ₹${monthlySpent.toFixed(2)} (${percentage.toFixed(1)}%) of your monthly budget.`,
            'warning'
        );
        
        if (Notification.permission === 'granted') {
            new Notification('Budget Warning!', {
                body: `You've reached ${percentage.toFixed(1)}% of your monthly budget`,
                icon: '⚠️'
            });
        }
    }
}

// Dashboard Updates
function updateDashboard() {
    const monthlyTotal = getMonthlyTotal();
    const remaining = Math.max(0, budgetSettings.monthlyLimit - monthlyTotal);
    const recurringTotal = getRecurringTotal();
    const todaySpent = getTodayTotal();
    const dailyAverage = getDailyAverage();
    const daysLeft = getDaysLeftInMonth();
    
    // Update card values
    document.getElementById('monthly-total').textContent = monthlyTotal.toFixed(2);
    document.getElementById('monthly-limit').textContent = budgetSettings.monthlyLimit.toFixed(2);
    document.getElementById('remaining-budget').textContent = remaining.toFixed(2);
    document.getElementById('recurring-total').textContent = recurringTotal.toFixed(2);
    document.getElementById('today-spent').textContent = todaySpent.toFixed(2);
    document.getElementById('daily-average').textContent = dailyAverage.toFixed(2);
    document.getElementById('days-left').textContent = `${daysLeft} days left`;
    document.getElementById('upcoming-bills').textContent = getUpcomingBillsCount();
    
    // Update progress ring
    updateProgressRing(monthlyTotal, budgetSettings.monthlyLimit);
}

function updateProgressRing(spent, limit) {
    const percentage = Math.min((spent / limit) * 100, 100);
    const circumference = 188.5; // 2 * π * 30 (radius)
    const offset = circumference - (percentage / 100) * circumference;
    
    let progressRing = document.getElementById('monthly-progress');
    
    // Create SVG if it doesn't exist
    if (!progressRing.querySelector('svg')) {
        progressRing.innerHTML = `
            <svg width="60" height="60">
                <circle class="bg" cx="30" cy="30" r="30"></circle>
                <circle class="progress" cx="30" cy="30" r="30"></circle>
            </svg>
        `;
    }
    
    const progressCircle = progressRing.querySelector('.progress');
    progressCircle.style.strokeDashoffset = offset;
    
    // Change color based on percentage
    if (percentage >= 100) {
        progressCircle.style.stroke = 'var(--danger-color)';
    } else if (percentage >= budgetSettings.warningThreshold) {
        progressCircle.style.stroke = 'var(--warning-color)';
    } else {
        progressCircle.style.stroke = 'var(--success-color)';
    }
}

// Calculation Functions
function getMonthlyTotal() {
    const currentMonth = new Date().toISOString().slice(0, 7);
    return expenses
        .filter(exp => exp.date.startsWith(currentMonth))
        .reduce((sum, exp) => sum + exp.amount, 0);
}

function getTodayTotal() {
    const today = new Date().toISOString().split('T')[0];
    return expenses
        .filter(exp => exp.date === today)
        .reduce((sum, exp) => sum + exp.amount, 0);
}

function getRecurringTotal() {
    return recurringBills
        .filter(bill => bill.isActive)
        .reduce((sum, bill) => {
            if (bill.frequency === 'monthly') return sum + bill.amount;
            if (bill.frequency === 'yearly') return sum + (bill.amount / 12);
            if (bill.frequency === 'quarterly') return sum + (bill.amount / 3);
            if (bill.frequency === 'weekly') return sum + (bill.amount * 4.33);
            return sum;
        }, 0);
}

function getDailyAverage() {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyExpenses = expenses.filter(exp => exp.date.startsWith(currentMonth));
    const daysWithExpenses = new Set(monthlyExpenses.map(exp => exp.date)).size;
    const total = monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    return daysWithExpenses > 0 ? total / daysWithExpenses : 0;
}

function getDaysLeftInMonth() {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDay.getDate() - now.getDate();
}

function getUpcomingBillsCount() {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return recurringBills.filter(bill => {
        const dueDate = new Date(bill.dueDate);
        return dueDate >= today && dueDate <= nextWeek;
    }).length;
}

function getDaysUntilDue(dueDate) {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Recent Transactions Display
function displayRecentTransactions() {
    const container = document.getElementById('recent-list');
    const recent = expenses
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 5);
    
    if (recent.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No transactions yet. Add your first expense!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = recent.map(expense => `
        <div class="transaction-item">
            <div class="transaction-details">
                <h4>${expense.description}</h4>
                <p>${expense.category} • ${formatDate(expense.date)}</p>
            </div>
            <div class="transaction-amount">₹${expense.amount.toFixed(2)}</div>
        </div>
    `).join('');
}

// Statistics
function updateStatistics() {
    const dailyAvg = getDailyAverage();
    const weeklyAvg = getWeeklyAverage();
    const topCategory = getTopCategory();
    const overspendDays = getOverspendDays();
    
    document.getElementById('stat-daily-avg').textContent = dailyAvg.toFixed(2);
    document.getElementById('stat-weekly-avg').textContent = weeklyAvg.toFixed(2);
    document.getElementById('stat-top-category').textContent = topCategory;
    document.getElementById('stat-overspend-days').textContent = overspendDays;
    
    displayCategoryChart();
    displayTrendAnalysis();
}

function getWeeklyAverage() {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const weeklyExpenses = expenses.filter(exp => new Date(exp.date) >= oneWeekAgo);
    const total = weeklyExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    return total / 7;
}

function getTopCategory() {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyExpenses = expenses.filter(exp => exp.date.startsWith(currentMonth));
    
    const categoryTotals = {};
    monthlyExpenses.forEach(exp => {
        categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });
    
    const entries = Object.entries(categoryTotals);
    if (entries.length === 0) return 'None';
    
    return entries.reduce((a, b) => a[1] > b[1] ? a : b)[0];
}

function getOverspendDays() {
    const dailyBudget = budgetSettings.monthlyLimit / 30;
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const dailyTotals = {};
    expenses
        .filter(exp => exp.date.startsWith(currentMonth))
        .forEach(exp => {
            dailyTotals[exp.date] = (dailyTotals[exp.date] || 0) + exp.amount;
        });
    
    return Object.values(dailyTotals).filter(total => total > dailyBudget).length;
}

function displayCategoryChart() {
    const container = document.getElementById('category-chart');
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyExpenses = expenses.filter(exp => exp.date.startsWith(currentMonth));
    
    const categoryTotals = {};
    monthlyExpenses.forEach(exp => {
        categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });
    
    const entries = Object.entries(categoryTotals)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
    
    if (entries.length === 0) {
        container.innerHTML = '<p>No data available for this month</p>';
        return;
    }
    
    const total = entries.reduce((sum, [,amount]) => sum + amount, 0);
    
    container.innerHTML = entries.map(([category, amount]) => {
        const percentage = ((amount / total) * 100).toFixed(1);
        return `
            <div class="category-bar">
                <div class="category-info">
                    <span>${category}</span>
                    <span>₹${amount.toFixed(2)} (${percentage}%)</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

function displayTrendAnalysis() {
    const container = document.getElementById('trend-analysis');
    const weeklyData = getWeeklyTrendData();
    
    container.innerHTML = weeklyData.map((week, index) => `
        <div class="trend-item">
            <div class="trend-label">Week ${index + 1}</div>
            <div class="trend-bar">
                <div class="trend-fill" style="width: ${(week.amount / weeklyData[0].amount) * 100}%"></div>
            </div>
            <div class="trend-amount">₹${week.amount.toFixed(2)}</div>
        </div>
    `).join('');
}

function getWeeklyTrendData() {
    const weeks = [];
    const today = new Date();
    
    for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - (i * 7) - 6);
        const weekEnd = new Date(today);
        weekEnd.setDate(today.getDate() - (i * 7));
        
        const weekExpenses = expenses.filter(exp => {
            const expDate = new Date(exp.date);
            return expDate >= weekStart && expDate <= weekEnd;
        });
        
        const amount = weekExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        weeks.push({ amount, start: weekStart, end: weekEnd });
    }
    
    return weeks;
}

// Notification System
function requestNotificationPermission() {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                showNotification('Daily reminders enabled! You will receive notifications at your set time.', 'success');
                setupDailyReminder();
            } else {
                showNotification('Please enable notifications in your browser settings for daily reminders.', 'warning');
            }
        });
    } else {
        showNotification('Your browser does not support notifications.', 'warning');
    }
}

function checkNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'granted') {
        document.getElementById('enable-notifications').innerHTML = '<i class="fas fa-check"></i> Reminders Enabled';
        document.getElementById('enable-notifications').style.background = 'var(--success-color)';
        setupDailyReminder();
    }
}

function setupDailyReminder() {
    if (Notification.permission !== 'granted') return;
    
    function checkForReminder() {
        const now = new Date();
        const [hours, minutes] = notificationSettings.reminderTime.split(':');
        
        if (now.getHours() === parseInt(hours) && now.getMinutes() === parseInt(minutes)) {
            sendDailyReminder();
        }
        
        // Check for upcoming bills
        checkUpcomingBills();
    }
    
    // Check every minute
    setInterval(checkForReminder, 60000);
}

function sendDailyReminder() {
    const todaySpent = getTodayTotal();
    const monthlySpent = getMonthlyTotal();
    const remaining = budgetSettings.monthlyLimit - monthlySpent;
    
    new Notification('StudySpend Daily Reminder', {
        body: `Today: ₹${todaySpent.toFixed(2)} | Remaining budget: ₹${remaining.toFixed(2)}`,
        icon: '📊',
        tag: 'daily-reminder'
    });
}

function checkUpcomingBills() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const upcomingBills = recurringBills.filter(bill => {
        const dueDate = new Date(bill.dueDate);
        return dueDate.toDateString() === tomorrow.toDateString();
    });
    
    upcomingBills.forEach(bill => {
        new Notification('Upcoming Bill Reminder', {
            body: `${bill.name} (₹${bill.amount}) is due tomorrow`,
            icon: '💸',
            tag: `bill-${bill.id}`
        });
    });
}

// Utility Functions
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 5000);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function saveData() {
    localStorage.setItem('studyspend_expenses', JSON.stringify(expenses));
    localStorage.setItem('studyspend_bills', JSON.stringify(recurringBills));
    localStorage.setItem('studyspend_budget', JSON.stringify(budgetSettings));
    localStorage.setItem('studyspend_notifications', JSON.stringify(notificationSettings));
}

function loadNotificationSettings() {
    document.getElementById('reminder-time').value = notificationSettings.reminderTime;
    document.getElementById('budget-warnings').checked = notificationSettings.budgetWarnings;
    document.getElementById('bill-reminders').checked = notificationSettings.billReminders;
}

// Settings Management
function exportData() {
    const data = {
        expenses,
        recurringBills,
        budgetSettings,
        notificationSettings,
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studyspend-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('Data exported successfully!', 'success');
}

function clearAllData() {
    if (confirm('Are you sure you want to delete all data? This cannot be undone!')) {
        localStorage.clear();
        expenses = [];
        recurringBills = [];
        budgetSettings = { monthlyLimit: 10000, warningThreshold: 80, categoryBudgets: {} };
        notificationSettings = { reminderTime: '21:30', budgetWarnings: true, billReminders: true };
        
        updateDashboard();
        displayRecentTransactions();
        displayRecurringBills();
        loadBudgetSettings();
        loadNotificationSettings();
        
        showNotification('All data cleared successfully!', 'success');
    }
}

// Category Budget Management
function displayCategoryBudgets() {
    const container = document.getElementById('category-budget-list');
    const categories = ['Food', 'Transport', 'Education', 'Entertainment', 'Health', 'Shopping', 'Personal', 'Emergency', 'Other'];
    
    container.innerHTML = categories.map(category => {
        const currentBudget = budgetSettings.categoryBudgets[category] || 0;
        const spent = getCurrentMonthCategorySpending(category);
        const percentage = currentBudget > 0 ? (spent / currentBudget) * 100 : 0;
        
        return `
            <div class="category-budget-item">
                <div class="category-info">
                    <h4>${category}</h4>
                    <p>Spent: ₹${spent.toFixed(2)} / ₹${currentBudget.toFixed(2)}</p>
                </div>
                <div class="category-input">
                    <input type="number" value="${currentBudget}" onchange="updateCategoryBudget('${category}', this.value)" placeholder="Set limit">
                </div>
                <div class="category-progress">
                    <div class="progress-bar">
                        <div class="progress-fill ${percentage > 100 ? 'over-budget' : ''}" style="width: ${Math.min(percentage, 100)}%"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function getCurrentMonthCategorySpending(category) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    return expenses
        .filter(exp => exp.date.startsWith(currentMonth) && exp.category === category)
        .reduce((sum, exp) => sum + exp.amount, 0);
}

function updateCategoryBudget(category, amount) {
    budgetSettings.categoryBudgets[category] = parseFloat(amount) || 0;
    saveData();
    displayCategoryBudgets();
}

// Mobile Menu Toggle (for responsive design)
function toggleMobileMenu() {
    document.querySelector('.sidebar').classList.toggle('open');
}

// Additional CSS for mobile responsiveness and category budgets
const additionalCSS = `
.category-budget-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--surface);
    border-radius: var(--radius);
    margin-bottom: 1rem;
    box-shadow: var(--shadow);
}

.category-info {
    flex: 1;
}

.category-info h4 {
    margin-bottom: 0.25rem;
    color: var(--text-primary);
}

.category-info p {
    color: var(--text-secondary);
    font-size: 0.875rem;
}

.category-input {
    width: 120px;
}

.category-input input {
    width: 100%;
    padding: 0.5rem;
    border: 2px solid var(--border-color);
    border-radius: 6px;
    text-align: center;
}

.category-progress {
    width: 100px;
}

.progress-bar {
    width: 100%;
    height: 8px;
    background: #e5e7eb;
    border-radius: 4px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background: var(--success-color);
    transition: width 0.3s ease;
}

.progress-fill.over-budget {
    background: var(--danger-color);
}

.empty-state {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--text-secondary);
}

.trend-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
}

.trend-label {
    width: 80px;
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.trend-bar {
    flex: 1;
    height: 20px;
    background: #e5e7eb;
    border-radius: 10px;
    overflow: hidden;
}

.trend-fill {
    height: 100%;
    background: var(--primary-color);
    transition: width 0.3s ease;
}

.trend-amount {
    width: 80px;
    text-align: right;
    font-weight: 600;
    color: var(--text-primary);
}

.category-bar {
    margin-bottom: 1rem;
}

.category-info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
}

@keyframes slideOutRight {
    to {
        opacity: 0;
        transform: translateX(100%);
    }
}
`;

// Add additional CSS to the page
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalCSS;
document.head.appendChild(styleSheet);
