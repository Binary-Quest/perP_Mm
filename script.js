// Enhanced Global State Management
class ExpenseTrackerPro {
    constructor() {
        this.expenses = JSON.parse(localStorage.getItem('studyspend_pro_expenses')) || [];
        this.recurringBills = JSON.parse(localStorage.getItem('studyspend_pro_bills')) || [];
        this.budgetSettings = JSON.parse(localStorage.getItem('studyspend_pro_budget')) || {
            monthlyLimit: 10000,
            warningThreshold: 80,
            categoryBudgets: {}
        };
        this.trackingPeriods = JSON.parse(localStorage.getItem('studyspend_pro_periods')) || [];
        this.currentPeriod = JSON.parse(localStorage.getItem('studyspend_pro_current_period')) || this.createDefaultPeriod();
        this.archivedData = JSON.parse(localStorage.getItem('studyspend_pro_archived')) || [];
        this.notificationSettings = JSON.parse(localStorage.getItem('studyspend_pro_notifications')) || {
            reminderTime: '21:30',
            budgetWarnings: true,
            billReminders: true
        };
        
        this.init();
    }

    createDefaultPeriod() {
        const now = new Date();
        const endDate = new Date(now);
        endDate.setDate(now.getDate() + 30);
        
        return {
            id: Date.now(),
            name: 'Default Period',
            startDate: now.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            duration: 30,
            unit: 'days',
            budgetLimit: 10000,
            isActive: true,
            createdAt: now.toISOString()
        };
    }

    async init() {
        await this.showWelcomeScreen();
        this.setupEventListeners();
        this.checkNotificationPermission();
        this.setupDailyReminder();
        this.updateDashboard();
        this.displayRecentActivity();
    }

    async showWelcomeScreen() {
        return new Promise((resolve) => {
            setTimeout(() => {
                document.getElementById('welcome-screen').style.animation = 'fadeOut 1s ease-in-out forwards';
                setTimeout(() => {
                    document.getElementById('welcome-screen').style.display = 'none';
                    document.getElementById('main-app').style.animation = 'fadeIn 1s ease-in-out forwards';
                    resolve();
                }, 1000);
            }, 3000);
        });
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                this.showSection(section);
                this.updateActiveNav(link);
            });
        });

        // Form submissions
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.closest('#add-expense')) {
                this.addExpense();
            }
        });

        // Period selector
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.updateQuickStats(btn.dataset.period);
            });
        });

        // Set today's date as default
        document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];

        // Notification permission
        document.getElementById('enable-notifications').addEventListener('click', () => {
            this.requestNotificationPermission();
        });
    }

    showSection(sectionId) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        // Show selected section
        document.getElementById(sectionId).classList.add('active');

        // Update section-specific data
        switch(sectionId) {
            case 'analytics':
                this.updateAnalytics();
                break;
            case 'history':
                this.displayHistory();
                break;
            case 'settings':
                this.loadSettings();
                break;
        }
    }

    updateActiveNav(activeLink) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        activeLink.classList.add('active');
    }

    // Expense Management
    addExpense() {
        const description = document.getElementById('expense-description').value.trim();
        const amount = parseFloat(document.getElementById('expense-amount').value);
        const category = document.getElementById('expense-category').value;
        const date = document.getElementById('expense-date').value;
        const notes = document.getElementById('expense-notes').value.trim();

        // Enhanced validation
        if (!description || !amount || amount <= 0 || !category) {
            this.showNotification('Please fill in all required fields!', 'danger');
            return;
        }

        const expense = {
            id: Date.now(),
            description,
            amount,
            category,
            date: date || new Date().toISOString().split('T')[0],
            notes,
            timestamp: new Date().toISOString(),
            periodId: this.currentPeriod.id
        };

        this.expenses.push(expense);
        this.saveData();
        
        // Check budget limits
        this.checkBudgetLimits();
        
        // Update UI with smooth animations
        this.updateDashboard();
        this.displayRecentActivity();
        this.clearExpenseForm();
        
        this.showNotification(`₹${amount} expense added successfully!`, 'success');
        this.animateCardUpdate();
    }

    animateCardUpdate() {
        const cards = document.querySelectorAll('.premium-card');
        cards.forEach(card => {
            card.style.transform = 'scale(1.02)';
            setTimeout(() => {
                card.style.transform = 'scale(1)';
            }, 200);
        });
    }

    setQuickAmount(amount) {
        document.getElementById('expense-amount').value = amount;
        document.getElementById('expense-amount').focus();
    }

    clearExpenseForm() {
        document.getElementById('expense-description').value = '';
        document.getElementById('expense-amount').value = '';
        document.getElementById('expense-category').value = '';
        document.getElementById('expense-notes').value = '';
        document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];
    }

    // Dashboard Updates
    updateDashboard() {
        const currentExpenses = this.getCurrentPeriodExpenses();
        const totalSpent = currentExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const remaining = Math.max(0, this.currentPeriod.budgetLimit - totalSpent);
        const todaySpent = this.getTodayTotal();
        const dailyAvg = this.getDailyAverage();
        const daysRemaining = this.getDaysRemaining();
        const spendingRate = this.getSpendingRate();

        // Update dashboard values
        document.getElementById('current-total').textContent = totalSpent.toFixed(0);
        document.getElementById('current-limit').textContent = this.currentPeriod.budgetLimit.toFixed(0);
        document.getElementById('remaining-amount').textContent = remaining.toFixed(0);
        document.getElementById('today-total').textContent = todaySpent.toFixed(0);
        document.getElementById('daily-avg').textContent = dailyAvg.toFixed(0);
        document.getElementById('days-remaining').textContent = `${daysRemaining} days`;
        document.getElementById('spending-rate').textContent = spendingRate.toFixed(1);

        // Update progress bar
        const percentage = Math.min((totalSpent / this.currentPeriod.budgetLimit) * 100, 100);
        document.getElementById('spending-progress').style.width = `${percentage}%`;

        // Update progress bar color based on percentage
        const progressBar = document.getElementById('spending-progress');
        if (percentage >= 90) {
            progressBar.style.background = 'rgba(255, 255, 255, 0.9)';
        } else if (percentage >= 70) {
            progressBar.style.background = 'rgba(255, 255, 255, 0.8)';
        } else {
            progressBar.style.background = 'rgba(255, 255, 255, 0.7)';
        }

        // Update trend indicator
        const trendElement = document.getElementById('trend-indicator');
        if (spendingRate > 3.5) {
            trendElement.textContent = '📈 High Spending';
        } else if (spendingRate > 2) {
            trendElement.textContent = '↗️ Increasing';
        } else {
            trendElement.textContent = '↘️ Moderate';
        }

        // Update current period display
        document.getElementById('current-period-display').textContent = `${this.currentPeriod.duration} ${this.currentPeriod.unit}`;

        this.updateQuickStats('current');
    }

    updateQuickStats(period) {
        let expenses = [];
        
        switch(period) {
            case 'current':
                expenses = this.getCurrentPeriodExpenses();
                break;
            case 'week':
                expenses = this.getWeekExpenses();
                break;
            case 'month':
                expenses = this.getMonthExpenses();
                break;
        }

        const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const topCategory = this.getTopCategory(expenses);
        const activeDays = new Set(expenses.map(exp => exp.date)).size;
        const avgPerDay = activeDays > 0 ? totalExpenses / activeDays : 0;

        document.getElementById('stat-total-expenses').textContent = `₹${totalExpenses.toFixed(0)}`;
        document.getElementById('stat-top-category').textContent = topCategory || 'None';
        document.getElementById('stat-active-days').textContent = activeDays;
        document.getElementById('stat-avg-per-day').textContent = `₹${avgPerDay.toFixed(0)}`;
    }

    // Calculation Functions
    getCurrentPeriodExpenses() {
        return this.expenses.filter(exp => exp.periodId === this.currentPeriod.id);
    }

    getWeekExpenses() {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return this.expenses.filter(exp => new Date(exp.date) >= oneWeekAgo);
    }

    getMonthExpenses() {
        const currentMonth = new Date().toISOString().slice(0, 7);
        return this.expenses.filter(exp => exp.date.startsWith(currentMonth));
    }

    getTodayTotal() {
        const today = new Date().toISOString().split('T')[0];
        return this.getCurrentPeriodExpenses()
            .filter(exp => exp.date === today)
            .reduce((sum, exp) => sum + exp.amount, 0);
    }

    getDailyAverage() {
        const expenses = this.getCurrentPeriodExpenses();
        const daysActive = new Set(expenses.map(exp => exp.date)).size;
        const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        return daysActive > 0 ? total / daysActive : 0;
    }

    getDaysRemaining() {
        const today = new Date();
        const endDate = new Date(this.currentPeriod.endDate);
        const diffTime = endDate - today;
        return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    getSpendingRate() {
        const expenses = this.getCurrentPeriodExpenses();
        const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const daysElapsed = this.getDaysElapsed();
        return daysElapsed > 0 ? (totalSpent / this.currentPeriod.budgetLimit) * 100 / daysElapsed : 0;
    }

    getDaysElapsed() {
        const today = new Date();
        const startDate = new Date(this.currentPeriod.startDate);
        const diffTime = today - startDate;
        return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    getTopCategory(expenses = null) {
        const exp = expenses || this.getCurrentPeriodExpenses();
        const categoryTotals = {};
        
        exp.forEach(expense => {
            categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
        });

        const entries = Object.entries(categoryTotals);
        if (entries.length === 0) return null;

        return entries.reduce((a, b) => a[1] > b[1] ? a : b)[0];
    }

    // Recent Activity
    displayRecentActivity() {
        const container = document.getElementById('recent-activity-list');
        const recent = this.getCurrentPeriodExpenses()
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 5);

        if (recent.length === 0) {
            container.innerHTML = `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas fa-plus"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-title">No expenses yet</div>
                        <div class="activity-meta">Add your first expense to get started</div>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = recent.map(expense => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-${this.getCategoryIcon(expense.category)}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${expense.description}</div>
                    <div class="activity-meta">${expense.category} • ${this.formatDate(expense.date)}</div>
                </div>
                <div class="activity-amount">₹${expense.amount.toFixed(2)}</div>
            </div>
        `).join('');
    }

    getCategoryIcon(category) {
        const icons = {
            'Food': 'utensils',
            'Transport': 'bus',
            'Education': 'book',
            'Entertainment': 'film',
            'Health': 'heartbeat',
            'Shopping': 'shopping-bag',
            'Personal': 'user',
            'Emergency': 'exclamation-triangle',
            'Other': 'tag'
        };
        return icons[category] || 'tag';
    }

    // Period Management
    showPeriodModal() {
        const modal = document.getElementById('period-modal');
        modal.style.display = 'block';
        
        // Set defaults
        document.getElementById('new-period-duration').value = 30;
        document.getElementById('new-period-unit').value = 'days';
        document.getElementById('new-period-start').value = new Date().toISOString().split('T')[0];
        document.getElementById('new-period-budget').value = 10000;
        
        this.updatePeriodPreview();
        
        // Update preview on changes
        ['new-period-duration', 'new-period-unit', 'new-period-start'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => {
                this.updatePeriodPreview();
            });
        });
    }

    closePeriodModal() {
        document.getElementById('period-modal').style.display = 'none';
    }

    updatePeriodPreview() {
        const duration = parseInt(document.getElementById('new-period-duration').value);
        const unit = document.getElementById('new-period-unit').value;
        const startDate = new Date(document.getElementById('new-period-start').value);
        
        const endDate = new Date(startDate);
        switch(unit) {
            case 'days':
                endDate.setDate(startDate.getDate() + duration);
                break;
            case 'weeks':
                endDate.setDate(startDate.getDate() + (duration * 7));
                break;
            case 'months':
                endDate.setMonth(startDate.getMonth() + duration);
                break;
        }
        
        const preview = `${duration} ${unit} from ${this.formatDate(startDate.toISOString().split('T')[0])} to ${this.formatDate(endDate.toISOString().split('T')[0])}`;
        document.getElementById('period-preview-text').textContent = preview;
    }

    createNewPeriod() {
        const duration = parseInt(document.getElementById('new-period-duration').value);
        const unit = document.getElementById('new-period-unit').value;
        const startDate = document.getElementById('new-period-start').value;
        const budget = parseFloat(document.getElementById('new-period-budget').value);
        
        if (!duration || !startDate || !budget) {
            this.showNotification('Please fill in all required fields!', 'danger');
            return;
        }
        
        // Archive current period
        this.archiveCurrentPeriod();
        
        // Calculate end date
        const start = new Date(startDate);
        const end = new Date(start);
        
        switch(unit) {
            case 'days':
                end.setDate(start.getDate() + duration);
                break;
            case 'weeks':
                end.setDate(start.getDate() + (duration * 7));
                break;
            case 'months':
                end.setMonth(start.getMonth() + duration);
                break;
        }
        
        // Create new period
        this.currentPeriod = {
            id: Date.now(),
            name: `${duration} ${unit} period`,
            startDate: startDate,
            endDate: end.toISOString().split('T')[0],
            duration: duration,
            unit: unit,
            budgetLimit: budget,
            isActive: true,
            createdAt: new Date().toISOString()
        };
        
        this.trackingPeriods.push(this.currentPeriod);
        this.saveData();
        this.updateDashboard();
        this.closePeriodModal();
        
        this.showNotification('New tracking period created successfully!', 'success');
    }

    archiveCurrentPeriod() {
        const currentExpenses = this.getCurrentPeriodExpenses();
        
        if (currentExpenses.length > 0) {
            const archiveEntry = {
                period: { ...this.currentPeriod },
                expenses: currentExpenses,
                archivedAt: new Date().toISOString(),
                totalSpent: currentExpenses.reduce((sum, exp) => sum + exp.amount, 0)
            };
            
            this.archivedData.push(archiveEntry);
            
            // Remove archived expenses from active expenses
            this.expenses = this.expenses.filter(exp => exp.periodId !== this.currentPeriod.id);
        }
    }

    // Reset Functionality
    showResetModal() {
        document.getElementById('reset-modal').style.display = 'block';
    }

    closeResetModal() {
        document.getElementById('reset-modal').style.display = 'none';
    }

    resetCurrentPeriod() {
        const archiveBeforeReset = document.getElementById('archive-before-reset').checked;
        
        if (archiveBeforeReset) {
            this.archiveCurrentPeriod();
        } else {
            // Just remove current period expenses
            this.expenses = this.expenses.filter(exp => exp.periodId !== this.currentPeriod.id);
        }
        
        this.saveData();
        this.updateDashboard();
        this.displayRecentActivity();
        this.closeResetModal();
        
        this.showNotification('Period reset successfully!', 'success');
    }

    // Budget Management
    checkBudgetLimits() {
        const currentExpenses = this.getCurrentPeriodExpenses();
        const totalSpent = currentExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const percentage = (totalSpent / this.currentPeriod.budgetLimit) * 100;

        if (percentage >= 100) {
            this.showNotification(
                `🚨 Budget Exceeded! You've spent ₹${totalSpent.toFixed(2)} (${percentage.toFixed(1)}%) of your ₹${this.currentPeriod.budgetLimit} budget.`,
                'danger'
            );
            
            if (Notification.permission === 'granted') {
                new Notification('Budget Exceeded!', {
                    body: `You've exceeded your budget of ₹${this.currentPeriod.budgetLimit}`,
                    icon: '💸'
                });
            }
        } else if (percentage >= this.budgetSettings.warningThreshold) {
            this.showNotification(
                `⚠️ Budget Warning! You've spent ₹${totalSpent.toFixed(2)} (${percentage.toFixed(1)}%) of your budget.`,
                'warning'
            );
            
            if (Notification.permission === 'granted') {
                new Notification('Budget Warning!', {
                    body: `You've reached ${percentage.toFixed(1)}% of your budget`,
                    icon: '⚠️'
                });
            }
        }
    }

    // Analytics
    updateAnalytics() {
        this.generateInsights();
        // Note: Chart implementation would require Chart.js or similar library
        // For now, we'll create placeholder content
        this.createAnalyticsPlaceholder();
    }

    createAnalyticsPlaceholder() {
        const categoryChart = document.getElementById('category-chart');
        const trendChart = document.getElementById('trend-chart');
        const dailyChart = document.getElementById('daily-chart');
        
        // Create placeholder content
        if (categoryChart) {
            categoryChart.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 200px; color: #64748b;">Category distribution chart will appear here</div>';
        }
        
        if (trendChart) {
            trendChart.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 200px; color: #64748b;">Spending trends chart will appear here</div>';
        }
        
        if (dailyChart) {
            dailyChart.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 300px; color: #64748b;">Daily breakdown chart will appear here</div>';
        }
    }

    generateInsights() {
        const container = document.getElementById('insights-container');
        const expenses = this.getCurrentPeriodExpenses();
        
        if (expenses.length === 0) {
            container.innerHTML = '<div class="insight-card">No data available for insights</div>';
            return;
        }
        
        const insights = [];
        
        // Spending pattern insight
        const avgDaily = this.getDailyAverage();
        const todaySpent = this.getTodayTotal();
        
        if (todaySpent > avgDaily * 1.5) {
            insights.push({
                type: 'warning',
                title: 'High Spending Alert',
                description: `Today's spending (₹${todaySpent.toFixed(2)}) is ${((todaySpent / avgDaily - 1) * 100).toFixed(0)}% higher than your daily average.`,
                icon: '📈'
            });
        }
        
        // Budget pace insight
        const daysElapsed = this.getDaysElapsed();
        const totalDays = this.getDaysElapsed() + this.getDaysRemaining();
        const expectedSpending = (this.currentPeriod.budgetLimit * daysElapsed) / totalDays;
        const actualSpending = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        
        if (actualSpending > expectedSpending * 1.2) {
            insights.push({
                type: 'danger',
                title: 'Budget Pace Warning',
                description: 'You\'re spending faster than planned. Consider reducing expenses to stay within budget.',
                icon: '⏰'
            });
        }
        
        // Category insight
        const topCategory = this.getTopCategory();
        if (topCategory) {
            const categoryTotal = expenses
                .filter(exp => exp.category === topCategory)
                .reduce((sum, exp) => sum + exp.amount, 0);
            const categoryPercentage = (categoryTotal / actualSpending) * 100;
            
            insights.push({
                type: 'info',
                title: 'Top Spending Category',
                description: `${categoryPercentage.toFixed(0)}% of your budget goes to ${topCategory} (₹${categoryTotal.toFixed(2)})`,
                icon: '📊'
            });
        }
        
        container.innerHTML = insights.map(insight => `
            <div class="insight-card ${insight.type}">
                <div class="insight-icon">${insight.icon}</div>
                <div class="insight-content">
                    <h4>${insight.title}</h4>
                    <p>${insight.description}</p>
                </div>
            </div>
        `).join('');
    }

    // History Management
    displayHistory() {
        // This would display historical data from archived periods
        // Implementation depends on UI requirements
        console.log('Displaying history:', this.archivedData);
    }

    // Settings Management
    loadSettings() {
        document.getElementById('period-duration').value = this.currentPeriod.duration;
        document.getElementById('period-unit').value = this.currentPeriod.unit;
        document.getElementById('period-start-date').value = this.currentPeriod.startDate;
        document.getElementById('reminder-time').value = this.notificationSettings.reminderTime;
        document.getElementById('budget-warnings').checked = this.notificationSettings.budgetWarnings;
        document.getElementById('bill-reminders').checked = this.notificationSettings.billReminders;
    }

    updateTrackingPeriod() {
        const duration = parseInt(document.getElementById('period-duration').value);
        const unit = document.getElementById('period-unit').value;
        const startDate = document.getElementById('period-start-date').value;
        
        if (!duration || !startDate) {
            this.showNotification('Please fill in all required fields!', 'danger');
            return;
        }
        
        // Calculate new end date
        const start = new Date(startDate);
        const end = new Date(start);
        
        switch(unit) {
            case 'days':
                end.setDate(start.getDate() + duration);
                break;
            case 'weeks':
                end.setDate(start.getDate() + (duration * 7));
                break;
            case 'months':
                end.setMonth(start.getMonth() + duration);
                break;
        }
        
        this.currentPeriod.duration = duration;
        this.currentPeriod.unit = unit;
        this.currentPeriod.startDate = startDate;
        this.currentPeriod.endDate = end.toISOString().split('T')[0];
        
        this.saveData();
        this.updateDashboard();
        
        this.showNotification('Tracking period updated successfully!', 'success');
    }

    // Data Management
    exportAllData() {
        const data = {
            expenses: this.expenses,
            recurringBills: this.recurringBills,
            budgetSettings: this.budgetSettings,
            trackingPeriods: this.trackingPeriods,
            currentPeriod: this.currentPeriod,
            archivedData: this.archivedData,
            notificationSettings: this.notificationSettings,
            exportDate: new Date().toISOString(),
            version: '2.0'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `studyspend-pro-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.showNotification('Data exported successfully!', 'success');
    }

    exportHistoricalData() {
        const data = {
            archivedData: this.archivedData,
            currentPeriod: {
                period: this.currentPeriod,
                expenses: this.getCurrentPeriodExpenses(),
                totalSpent: this.getCurrentPeriodExpenses().reduce((sum, exp) => sum + exp.amount, 0)
            },
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `studyspend-history-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.showNotification('Historical data exported successfully!', 'success');
    }

    importData(fileInput) {
        const file = fileInput.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (confirm('This will replace all current data. Are you sure?')) {
                    this.expenses = data.expenses || [];
                    this.recurringBills = data.recurringBills || [];
                    this.budgetSettings = data.budgetSettings || this.budgetSettings;
                    this.trackingPeriods = data.trackingPeriods || [];
                    this.currentPeriod = data.currentPeriod || this.currentPeriod;
                    this.archivedData = data.archivedData || [];
                    this.notificationSettings = data.notificationSettings || this.notificationSettings;
                    
                    this.saveData();
                    this.updateDashboard();
                    this.displayRecentActivity();
                    this.loadSettings();
                    
                    this.showNotification('Data imported successfully!', 'success');
                }
            } catch (error) {
                this.showNotification('Invalid file format!', 'danger');
            }
        };
        reader.readAsText(file);
        
        // Reset file input
        fileInput.value = '';
    }

    showClearDataModal() {
        if (confirm('This will permanently delete ALL data including archived periods. This cannot be undone!\n\nAre you absolutely sure?')) {
            localStorage.clear();
            location.reload();
        }
    }

    // Notification System
    requestNotificationPermission() {
        if ('Notification' in window) {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    this.showNotification('Smart reminders enabled! You will receive notifications at your set time.', 'success');
                    document.getElementById('enable-notifications').innerHTML = '<i class="fas fa-check"></i><span>Reminders Enabled</span>';
                    document.getElementById('enable-notifications').style.background = 'var(--gradient-success)';
                    this.setupDailyReminder();
                } else {
                    this.showNotification('Please enable notifications in your browser settings for daily reminders.', 'warning');
                }
            });
        } else {
            this.showNotification('Your browser does not support notifications.', 'warning');
        }
    }

    checkNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'granted') {
            document.getElementById('enable-notifications').innerHTML = '<i class="fas fa-check"></i><span>Reminders Enabled</span>';
            document.getElementById('enable-notifications').style.background = 'var(--gradient-success)';
            this.setupDailyReminder();
        }
    }

    setupDailyReminder() {
        if (Notification.permission !== 'granted') return;

        const checkForReminder = () => {
            const now = new Date();
            const [hours, minutes] = this.notificationSettings.reminderTime.split(':');

            if (now.getHours() === parseInt(hours) && now.getMinutes() === parseInt(minutes)) {
                this.sendDailyReminder();
            }
        };

        // Check every minute
        setInterval(checkForReminder, 60000);
    }

    sendDailyReminder() {
        const todaySpent = this.getTodayTotal();
        const currentExpenses = this.getCurrentPeriodExpenses();
        const totalSpent = currentExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const remaining = this.currentPeriod.budgetLimit - totalSpent;

        new Notification('StudySpend Pro Daily Reminder', {
            body: `Today: ₹${todaySpent.toFixed(2)} | Remaining budget: ₹${remaining.toFixed(2)}`,
            icon: '📊',
            tag: 'daily-reminder'
        });
    }

    // Utility Functions
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--white);
            padding: 1rem 1.5rem;
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-xl);
            border-left: 4px solid var(--${type === 'success' ? 'success' : type === 'danger' ? 'danger' : type === 'warning' ? 'warning' : 'primary'}-500);
            z-index: 10001;
            animation: slideInRight 0.3s ease;
            max-width: 400px;
            color: var(--gray-800);
        `;

        const icons = {
            success: 'check-circle',
            danger: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };

        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <i class="fas fa-${icons[type]}" style="color: var(--${type === 'success' ? 'success' : type === 'danger' ? 'danger' : type === 'warning' ? 'warning' : 'primary'}-500);"></i>
                <span style="font-weight: 500;">${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    }

    saveData() {
        localStorage.setItem('studyspend_pro_expenses', JSON.stringify(this.expenses));
        localStorage.setItem('studyspend_pro_bills', JSON.stringify(this.recurringBills));
        localStorage.setItem('studyspend_pro_budget', JSON.stringify(this.budgetSettings));
        localStorage.setItem('studyspend_pro_periods', JSON.stringify(this.trackingPeriods));
        localStorage.setItem('studyspend_pro_current_period', JSON.stringify(this.currentPeriod));
        localStorage.setItem('studyspend_pro_archived', JSON.stringify(this.archivedData));
        localStorage.setItem('studyspend_pro_notifications', JSON.stringify(this.notificationSettings));
    }
}

// Global Functions (for HTML onclick handlers)
let app;

function showSection(sectionId) {
    app.showSection(sectionId);
}

function showPeriodModal() {
    app.showPeriodModal();
}

function closePeriodModal() {
    app.closePeriodModal();
}

function createNewPeriod() {
    app.createNewPeriod();
}

function showResetModal() {
    app.showResetModal();
}

function closeResetModal() {
    app.closeResetModal();
}

function resetCurrentPeriod() {
    app.resetCurrentPeriod();
}

function addExpense() {
    app.addExpense();
}

function setQuickAmount(amount) {
    app.setQuickAmount(amount);
}

function clearExpenseForm() {
    app.clearExpenseForm();
}

function updateTrackingPeriod() {
    app.updateTrackingPeriod();
}

function exportAllData() {
    app.exportAllData();
}

function exportHistoricalData() {
    app.exportHistoricalData();
}

function importData(fileInput) {
    app.importData(fileInput);
}

function showClearDataModal() {
    app.showClearDataModal();
}

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    app = new ExpenseTrackerPro();
});

// Additional CSS for animations
const additionalCSS = `
@keyframes slideInRight {
    from {
        opacity: 0;
        transform: translateX(100%);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

@keyframes slideOutRight {
    to {
        opacity: 0;
        transform: translateX(100%);
    }
}

.insight-card {
    background: var(--white);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
    box-shadow: var(--shadow-md);
    border: 1px solid var(--gray-200);
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
    transition: all var(--transition-normal);
}

.insight-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
}

.insight-card.warning {
    border-left: 4px solid var(--warning-500);
}

.insight-card.danger {
    border-left: 4px solid var(--danger-500);
}

.insight-card.info {
    border-left: 4px solid var(--primary-500);
}

.insight-icon {
    font-size: 2rem;
    width: 60px;
    text-align: center;
}

.insight-content h4 {
    font-weight: 600;
    color: var(--gray-900);
    margin-bottom: 0.25rem;
}

.insight-content p {
    color: var(--gray-600);
    font-size: 0.875rem;
}
`;

const styleElement = document.createElement('style');
styleElement.textContent = additionalCSS;
document.head.appendChild(styleElement);
