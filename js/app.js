// =============================================
//   ExpenseIQ - Expense Tracker Dashboard
//   Author: [Your Name]
//   Project: Internship Project 1
// =============================================

// ---- STATE ----
// Load transactions from localStorage (so data persists on refresh)
let transactions = JSON.parse(localStorage.getItem('expenseiq_transactions')) || [];
let budgets      = JSON.parse(localStorage.getItem('expenseiq_budgets'))      || {};
let currentType  = 'expense'; // currently selected type in form
let pieChart, barChart; // chart instances

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  setDefaultDate();
  setCurrentMonth();
  renderAll();
  initCharts();
  setupNavigation();
});

// ---- NAVIGATION ----
function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const section = item.dataset.section;
      showSection(section);
      // Update active nav item
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
    });
  });
}

function showSection(name) {
  // Hide all sections
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  // Show target
  document.getElementById(name).classList.add('active');
  // Update page title
  const titles = {
    'dashboard':   'Dashboard',
    'add-expense': 'Add Transaction',
    'history':     'Transaction History',
    'budget':      'Budget Manager'
  };
  document.getElementById('page-title').textContent = titles[name] || 'ExpenseIQ';
  // Update nav highlight
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.section === name);
  });
  // Refresh data on section switch
  if (name === 'dashboard') updateDashboard();
  if (name === 'history')   renderHistory();
  if (name === 'budget')    renderBudgets();
}

// ---- SET DEFAULT DATE ----
function setDefaultDate() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('date').value = today;
}

function setCurrentMonth() {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const now = new Date();
  document.getElementById('current-month').textContent =
    `${months[now.getMonth()]} ${now.getFullYear()}`;
}

// ---- SAVE TO LOCALSTORAGE ----
function saveData() {
  localStorage.setItem('expenseiq_transactions', JSON.stringify(transactions));
  localStorage.setItem('expenseiq_budgets', JSON.stringify(budgets));
}

// ---- ADD TRANSACTION ----
function addTransaction() {
  // Get values
  const desc     = document.getElementById('desc').value.trim();
  const amount   = parseFloat(document.getElementById('amount').value);
  const category = document.getElementById('category').value;
  const date     = document.getElementById('date').value;
  const note     = document.getElementById('note').value.trim();

  // Validate
  if (!desc || !amount || !category || !date) {
    showFormMsg('Please fill all required fields!', 'error');
    return;
  }
  if (amount <= 0) {
    showFormMsg('Amount must be greater than 0!', 'error');
    return;
  }

  // Create transaction object
  const txn = {
    id: Date.now(),          // unique id using timestamp
    desc,
    amount,
    category,
    date,
    note,
    type: currentType        // 'expense' or 'income'
  };

  // Add to array
  transactions.unshift(txn); // add to beginning
  saveData();

  // Reset form & show success
  showFormMsg(`✅ ${currentType === 'expense' ? 'Expense' : 'Income'} of ₹${amount} added!`, 'success');
  showToast('Transaction saved successfully!', 'success');
  resetForm();
  updateDashboard();
}

// ---- SET TYPE (expense/income) ----
function setType(type) {
  currentType = type;
  document.getElementById('btn-expense').classList.toggle('active', type === 'expense');
  document.getElementById('btn-income').classList.toggle('active',  type === 'income');
}

// ---- RESET FORM ----
function resetForm() {
  document.getElementById('desc').value     = '';
  document.getElementById('amount').value   = '';
  document.getElementById('category').value = '';
  document.getElementById('note').value     = '';
  setDefaultDate();
  setType('expense');
}

// ---- SHOW FORM MESSAGE ----
function showFormMsg(msg, type) {
  const el = document.getElementById('form-msg');
  el.textContent = msg;
  el.className   = `form-msg ${type}`;
  // Auto-hide after 3s
  setTimeout(() => { el.className = 'form-msg'; el.textContent = ''; }, 3000);
}

// ---- RENDER ALL ----
function renderAll() {
  updateDashboard();
  renderHistory();
  renderBudgets();
}

// ---- UPDATE DASHBOARD ----
function updateDashboard() {
  // Calculate totals
  let totalIncome  = 0;
  let totalExpense = 0;

  transactions.forEach(t => {
    if (t.type === 'income')  totalIncome  += t.amount;
    if (t.type === 'expense') totalExpense += t.amount;
  });

  const balance = totalIncome - totalExpense;

  // Update summary cards
  document.getElementById('total-income').textContent  = `₹${totalIncome.toLocaleString('en-IN')}`;
  document.getElementById('total-expense').textContent = `₹${totalExpense.toLocaleString('en-IN')}`;
  document.getElementById('balance').textContent       = `₹${balance.toLocaleString('en-IN')}`;
  document.getElementById('txn-count').textContent     = transactions.length;

  // Render recent transactions (top 5)
  renderRecentTable();
  updateCharts();
}

// ---- RENDER RECENT TABLE ----
function renderRecentTable() {
  const tbody = document.getElementById('recent-tbody');
  const recent = transactions.slice(0, 5);

  if (recent.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-msg">No transactions yet. Add one!</td></tr>`;
    return;
  }

  tbody.innerHTML = recent.map(t => `
    <tr>
      <td>${formatDate(t.date)}</td>
      <td>${t.desc}</td>
      <td><span style="font-size:13px;">${getCategoryEmoji(t.category)} ${t.category}</span></td>
      <td><span class="badge badge-${t.type}">${t.type}</span></td>
      <td class="amount-${t.type}">${t.type === 'expense' ? '-' : '+'}₹${t.amount.toLocaleString('en-IN')}</td>
    </tr>
  `).join('');
}

// ---- RENDER HISTORY TABLE ----
function renderHistory(filtered = null) {
  const data  = filtered !== null ? filtered : transactions;
  const tbody = document.getElementById('history-tbody');

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-msg">No transactions found.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(t => `
    <tr>
      <td>${formatDate(t.date)}</td>
      <td>${t.desc}</td>
      <td>${getCategoryEmoji(t.category)} ${t.category}</td>
      <td style="color:var(--text-muted);font-size:13px;">${t.note || '—'}</td>
      <td><span class="badge badge-${t.type}">${t.type}</span></td>
      <td class="amount-${t.type}">${t.type === 'expense' ? '-' : '+'}₹${t.amount.toLocaleString('en-IN')}</td>
      <td>
        <button class="delete-btn" onclick="deleteTransaction(${t.id})" title="Delete">🗑️</button>
      </td>
    </tr>
  `).join('');
}

// ---- FILTER TRANSACTIONS ----
function filterTransactions() {
  const search   = document.getElementById('search-input').value.toLowerCase();
  const category = document.getElementById('filter-category').value;
  const type     = document.getElementById('filter-type').value;

  const filtered = transactions.filter(t => {
    const matchSearch   = t.desc.toLowerCase().includes(search) ||
                          t.category.toLowerCase().includes(search);
    const matchCategory = !category || t.category === category;
    const matchType     = !type     || t.type === type;
    return matchSearch && matchCategory && matchType;
  });

  renderHistory(filtered);
}

// ---- DELETE TRANSACTION ----
function deleteTransaction(id) {
  if (!confirm('Delete this transaction?')) return;
  transactions = transactions.filter(t => t.id !== id);
  saveData();
  renderAll();
  showToast('Transaction deleted.', 'info');
}

// ---- CLEAR ALL DATA ----
function clearAllData() {
  if (!confirm('Delete ALL transactions? This cannot be undone!')) return;
  transactions = [];
  saveData();
  renderAll();
  showToast('All transactions cleared.', 'info');
}

// ---- SET BUDGET ----
function setBudget() {
  const category = document.getElementById('budget-category').value;
  const amount   = parseFloat(document.getElementById('budget-amount').value);

  if (!category || !amount || amount <= 0) {
    showToast('Please enter a valid category and amount.', 'error');
    return;
  }

  budgets[category] = amount;
  saveData();
  renderBudgets();
  document.getElementById('budget-amount').value = '';
  showToast(`Budget set for ${category}: ₹${amount}`, 'success');
}

// ---- RENDER BUDGETS ----
function renderBudgets() {
  const container = document.getElementById('budget-list');

  if (Object.keys(budgets).length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted);font-size:14px;">No budgets set yet. Add one above!</p>`;
    return;
  }

  // Calculate spent per category
  const spent = {};
  transactions.forEach(t => {
    if (t.type === 'expense') {
      spent[t.category] = (spent[t.category] || 0) + t.amount;
    }
  });

  container.innerHTML = Object.entries(budgets).map(([cat, budget]) => {
    const usedAmount = spent[cat] || 0;
    const percent    = Math.min((usedAmount / budget) * 100, 100).toFixed(1);
    const remaining  = budget - usedAmount;
    let   colorClass = 'progress-ok';
    if (percent >= 90) colorClass = 'progress-danger';
    else if (percent >= 70) colorClass = 'progress-warn';

    return `
      <div class="budget-item">
        <div class="budget-item-header">
          <span>${getCategoryEmoji(cat)} ${cat}</span>
          <span class="budget-spent">₹${usedAmount.toLocaleString('en-IN')} / ₹${budget.toLocaleString('en-IN')}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill ${colorClass}" style="width:${percent}%"></div>
        </div>
        <div class="budget-note">
          ${remaining >= 0
            ? `✅ ₹${remaining.toLocaleString('en-IN')} remaining (${percent}% used)`
            : `⚠️ Over budget by ₹${Math.abs(remaining).toLocaleString('en-IN')}`
          }
        </div>
      </div>
    `;
  }).join('');
}

// ---- CHARTS ----
function initCharts() {
  // Pie Chart - Category wise spending
  const pieCtx = document.getElementById('pieChart').getContext('2d');
  pieChart = new Chart(pieCtx, {
    type: 'doughnut',
    data: {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: ['#6366f1','#22c55e','#ef4444','#f59e0b','#3b82f6','#a855f7','#ec4899','#14b8a6'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#8892a4', font: { size: 11 }, padding: 10 }
        }
      }
    }
  });

  // Bar Chart - Weekly spending
  const barCtx = document.getElementById('barChart').getContext('2d');
  barChart = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
      datasets: [{
        label: 'Expenses (₹)',
        data: [0,0,0,0,0,0,0],
        backgroundColor: 'rgba(99,102,241,0.6)',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#8892a4' } }
      },
      scales: {
        x: { ticks: { color: '#8892a4' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#8892a4' }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });

  updateCharts();
}

function updateCharts() {
  // --- Pie: Category-wise expense totals ---
  const categoryTotals = {};
  transactions.forEach(t => {
    if (t.type === 'expense') {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    }
  });

  pieChart.data.labels   = Object.keys(categoryTotals);
  pieChart.data.datasets[0].data = Object.values(categoryTotals);
  pieChart.update();

  // --- Bar: Spending for last 7 days ---
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const weekData = {};
  const today    = new Date();

  // Build labels for last 7 days
  const labels = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().split('T')[0];
    labels.push({ label: dayNames[d.getDay()], key });
    weekData[key] = 0;
  }

  transactions.forEach(t => {
    if (t.type === 'expense' && weekData.hasOwnProperty(t.date)) {
      weekData[t.date] += t.amount;
    }
  });

  barChart.data.labels = labels.map(l => l.label);
  barChart.data.datasets[0].data = labels.map(l => weekData[l.key]);
  barChart.update();
}

// ---- HELPER: Format Date ----
function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ---- HELPER: Category Emoji ----
function getCategoryEmoji(cat) {
  const map = {
    Food: '🍕', Transport: '🚌', Shopping: '🛍️',
    Entertainment: '🎬', Health: '💊', Education: '📚',
    Utilities: '💡', Salary: '💼', Other: '📦'
  };
  return map[cat] || '💰';
}

// ---- TOAST NOTIFICATION ----
function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className   = `toast toast-${type} show`;
  setTimeout(() => { toast.className = 'toast'; }, 3000);
}
