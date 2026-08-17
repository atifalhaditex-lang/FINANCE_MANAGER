/* =========================================================
   FINANCE MANAGER
   COMPLETE APP.JS
========================================================= */

"use strict";


/* =========================================================
   STORAGE
========================================================= */

const STORAGE_KEY = "financeManagerData_v1";


const defaultData = {

    transactions: [],

    loans: [],

    committees: [],

    creditCards: []

};


let data = loadData();


function loadData() {

    try {

        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {

            return structuredClone(defaultData);

        }

        const parsed = JSON.parse(saved);

        return {

            transactions:
                Array.isArray(parsed.transactions)
                    ? parsed.transactions
                    : [],

            loans:
                Array.isArray(parsed.loans)
                    ? parsed.loans
                    : [],

            committees:
                Array.isArray(parsed.committees)
                    ? parsed.committees
                    : [],

            creditCards:
                Array.isArray(parsed.creditCards)
                    ? parsed.creditCards
                    : []

        };

    } catch (error) {

        console.error(
            "Could not load saved data:",
            error
        );

        return structuredClone(defaultData);

    }

}


function saveData() {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(data)
    );

}


/* =========================================================
   CATEGORIES
========================================================= */

const incomeCategories = [

    "Salary",
    "Bonus",
    "Business",
    "Freelance",
    "Other Income"

];


const expenseCategories = [

    "Fuel",
    "Food",
    "Shopping",
    "Bills",
    "Rent",
    "Transport",
    "Medical",
    "Education",
    "Other Expense"

];


/* =========================================================
   HELPERS
========================================================= */

function $(id) {

    return document.getElementById(id);

}


function money(value) {

    const number = Number(value) || 0;

    return "₨ " + number.toLocaleString(
        "en-PK",
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }
    );

}


function numberValue(value) {

    return Number(value) || 0;

}


function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function today() {

    const d = new Date();

    const year = d.getFullYear();

    const month =
        String(d.getMonth() + 1)
            .padStart(2, "0");

    const day =
        String(d.getDate())
            .padStart(2, "0");

    return `${year}-${month}-${day}`;

}


function formatDate(dateString) {

    if (!dateString) {

        return "-";

    }

    const date = new Date(
        dateString + "T00:00:00"
    );

    if (Number.isNaN(date.getTime())) {

        return dateString;

    }

    return date.toLocaleDateString(
        "en-PK",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


function monthKey(dateString) {

    if (!dateString) {

        return "";

    }

    return dateString.slice(0, 7);

}


function monthLabel(key) {

    if (!key) {

        return "";

    }

    const date = new Date(
        key + "-01T00:00:00"
    );

    return date.toLocaleDateString(
        "en-PK",
        {
            month: "long",
            year: "numeric"
        }
    );

}


function uniqueId(prefix) {

    return (
        prefix +
        "_" +
        Date.now() +
        "_" +
        Math.random()
            .toString(36)
            .slice(2, 8)
    );

}


/* =========================================================
   TOAST
========================================================= */

let toastTimer;


function showToast(message) {

    const toast = $("toast");

    if (!toast) {

        return;

    }

    toast.textContent = message;

    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {

        toast.classList.remove("show");

    }, 2500);

}


/* =========================================================
   NAVIGATION
========================================================= */

const pageInfo = {

    dashboard: {

        title: "Dashboard",

        subtitle:
            "Your complete financial overview"

    },

    transactions: {

        title: "Transactions",

        subtitle:
            "Manage your income and expenses."

    },

    reports: {

        title: "Reports & Analytics",

        subtitle:
            "Understand where your money goes."

    },

    loans: {

        title: "Loans / Udhaar",

        subtitle:
            "Manage money given to or received from people."

    },

    committee: {

        title: "Committee",

        subtitle:
            "Track your monthly committee payments."

    },

    credit: {

        title: "Credit Card",

        subtitle:
            "Manage credit limit and cash withdrawals."

    }

};


function showSection(sectionId) {

    document
        .querySelectorAll(".section")
        .forEach(section => {

            section.classList.remove("active");

        });


    const section =
        $(sectionId);

    if (section) {

        section.classList.add("active");

    }


    document
        .querySelectorAll(".nav-btn")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.section === sectionId
            );

        });


    const info =
        pageInfo[sectionId] ||
        pageInfo.dashboard;


    if ($("pageTitle")) {

        $("pageTitle").textContent =
            info.title;

    }


    if ($("pageSubtitle")) {

        $("pageSubtitle").textContent =
            info.subtitle;

    }


    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });


    if (sectionId === "reports") {

        updateReports();

    }

}


document
    .querySelectorAll(".nav-btn")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                showSection(
                    button.dataset.section
                );

            }
        );

    });


/* =========================================================
   MODALS
========================================================= */

function openModal(id) {

    const modal = $(id);

    if (!modal) {

        return;

    }

    modal.classList.add("show");


    if (id === "transactionModal") {

        setDefaultTransactionForm();

    }

    if (id === "loanModal") {

        setDefaultLoanForm();

    }

    if (id === "committeeModal") {

        setDefaultCommitteeForm();

    }

}


function closeModal(id) {

    const modal = $(id);

    if (!modal) {

        return;

    }

    modal.classList.remove("show");

}


window.openModal = openModal;

window.closeModal = closeModal;


document
    .querySelectorAll(".modal")
    .forEach(modal => {

        modal.addEventListener(
            "click",
            event => {

                if (
                    event.target === modal
                ) {

                    closeModal(modal.id);

                }

            }
        );

    });


document.addEventListener(
    "keydown",
    event => {

        if (event.key !== "Escape") {

            return;

        }

        document
            .querySelectorAll(".modal.show")
            .forEach(modal => {

                closeModal(modal.id);

            });

    }
);


/* =========================================================
   TRANSACTION FORM
========================================================= */

function updateTransactionCategories() {

    const type =
        $("transactionType")?.value ||
        "income";

    const select =
        $("transactionCategory");

    if (!select) {

        return;

    }


    const categories =
        type === "income"
            ? incomeCategories
            : expenseCategories;


    select.innerHTML =
        categories
            .map(category => {

                return `
                    <option value="${escapeHTML(category)}">
                        ${escapeHTML(category)}
                    </option>
                `;

            })
            .join("");

}


function setDefaultTransactionForm() {

    const form =
        $("transactionForm");

    if (form) {

        form.reset();

    }


    if ($("transactionType")) {

        $("transactionType").value =
            "income";

    }


    updateTransactionCategories();


    if ($("transactionDate")) {

        $("transactionDate").value =
            today();

    }

}


function addTransaction(event) {

    event.preventDefault();


    const type =
        $("transactionType").value;

    const category =
        $("transactionCategory").value;

    const title =
        $("transactionTitle").value.trim();

    const amount =
        numberValue(
            $("transactionAmount").value
        );

    const date =
        $("transactionDate").value;


    if (!title) {

        showToast(
            "Please enter transaction title."
        );

        return;

    }


    if (amount <= 0) {

        showToast(
            "Please enter a valid amount."
        );

        return;

    }


    if (!date) {

        showToast(
            "Please select a date."
        );

        return;

    }


    data.transactions.push({

        id:
            uniqueId("txn"),

        type,

        category,

        title,

        amount,

        date,

        createdAt:
            new Date().toISOString()

    });


    saveData();

    closeModal("transactionModal");

    updateAll();

    showToast(
        type === "income"
            ? "Income added successfully."
            : "Expense added successfully."
    );

}


$("transactionType")?.addEventListener(
    "change",
    updateTransactionCategories
);


$("transactionForm")?.addEventListener(
    "submit",
    addTransaction
);


/* =========================================================
   TRANSACTION RENDER
========================================================= */

function getTotals(transactions = data.transactions) {

    let income = 0;

    let expense = 0;


    transactions.forEach(transaction => {

        if (transaction.type === "income") {

            income +=
                numberValue(transaction.amount);

        } else {

            expense +=
                numberValue(transaction.amount);

        }

    });


    return {

        income,

        expense,

        balance:
            income - expense,

        savings:
            income - expense

    };

}


function renderTransactions() {

    const container =
        $("transactionList");

    if (!container) {

        return;

    }


    const filter =
        $("transactionFilter")?.value ||
        "all";

    const search =
        (
            $("transactionSearch")?.value ||
            ""
        )
        .trim()
        .toLowerCase();


    const month =
        $("transactionMonthFilter")?.value ||
        "all";


    let list =
        [...data.transactions];


    if (filter !== "all") {

        list =
            list.filter(
                transaction =>
                    transaction.type === filter
            );

    }


    if (search) {

        list =
            list.filter(transaction => {

                return (

                    transaction.title
                        .toLowerCase()
                        .includes(search)

                    ||

                    transaction.category
                        .toLowerCase()
                        .includes(search)

                    ||

                    transaction.date
                        .toLowerCase()
                        .includes(search)

                );

            });

    }


    if (month !== "all") {

        list =
            list.filter(
                transaction =>
                    monthKey(transaction.date) === month
            );

    }


    list.sort(
        (a, b) =>
            new Date(b.date) -
            new Date(a.date)
    );


    if (!list.length) {

        container.innerHTML = `

            <div class="empty">

                No transactions found.

            </div>

        `;

        return;

    }


    container.innerHTML = `

        <table>

            <thead>

                <tr>

                    <th>Date</th>

                    <th>Title</th>

                    <th>Category</th>

                    <th>Type</th>

                    <th>Amount</th>

                    <th>Action</th>

                </tr>

            </thead>

            <tbody>

                ${list.map(transaction => `

                    <tr>

                        <td>
                            ${formatDate(transaction.date)}
                        </td>

                        <td>
                            <strong>
                                ${escapeHTML(transaction.title)}
                            </strong>
                        </td>

                        <td>
                            ${escapeHTML(transaction.category)}
                        </td>

                        <td>

                            <span class="
                                badge
                                ${
                                    transaction.type === "income"
                                        ? "badge-income"
                                        : "badge-expense"
                                }
                            ">

                                ${
                                    transaction.type === "income"
                                        ? "Income"
                                        : "Expense"
                                }

                            </span>

                        </td>

                        <td class="
                            ${
                                transaction.type === "income"
                                    ? "amount-income"
                                    : "amount-expense"
                            }
                        ">

                            ${
                                transaction.type === "income"
                                    ? "+"
                                    : "-"
                            }

                            ${money(transaction.amount)}

                        </td>

                        <td>

                            <button
                                class="delete-btn"
                                onclick="deleteTransaction('${transaction.id}')"
                            >
                                Delete
                            </button>

                        </td>

                    </tr>

                `).join("")}

            </tbody>

        </table>

    `;

}


function deleteTransaction(id) {

    const transaction =
        data.transactions.find(
            item => item.id === id
        );


    if (!transaction) {

        return;

    }


    const confirmed =
        confirm(
            `Delete "${transaction.title}"?`
        );


    if (!confirmed) {

        return;

    }


    data.transactions =
        data.transactions.filter(
            item => item.id !== id
        );


    saveData();

    updateAll();

    showToast(
        "Transaction deleted."
    );

}


window.deleteTransaction =
    deleteTransaction;


/* =========================================================
   TRANSACTION MONTH FILTER
========================================================= */

function populateTransactionMonths() {

    const select =
        $("transactionMonthFilter");

    if (!select) {

        return;

    }


    const current =
        select.value || "all";


    const months =
        [
            ...new Set(
                data.transactions
                    .map(item =>
                        monthKey(item.date)
                    )
                    .filter(Boolean)
            )
        ]
        .sort()
        .reverse();


    select.innerHTML = `

        <option value="all">
            All Months
        </option>

        ${
            months.map(month => `
                <option value="${month}">
                    ${monthLabel(month)}
                </option>
            `).join("")
        }

    `;


    if (
        current === "all" ||
        months.includes(current)
    ) {

        select.value =
            current;

    }

}


/* =========================================================
   DASHBOARD
========================================================= */

function updateDashboard() {

    const totals =
        getTotals();


    if ($("dashBalance")) {

        $("dashBalance").textContent =
            money(totals.balance);

    }


    if ($("dashIncome")) {

        $("dashIncome").textContent =
            money(totals.income);

    }


    if ($("dashExpense")) {

        $("dashExpense").textContent =
            money(totals.expense);

    }


    if ($("dashSavings")) {

        $("dashSavings").textContent =
            money(totals.savings);

    }


    if ($("transIncome")) {

        $("transIncome").textContent =
            money(totals.income);

    }


    if ($("transExpense")) {

        $("transExpense").textContent =
            money(totals.expense);

    }


    if ($("transBalance")) {

        $("transBalance").textContent =
            money(totals.balance);

    }


    renderRecentTransactions();

    updateFinancialSummary();

    renderIncomeExpenseChart();

    renderExpenseCategoryChart();

}


function renderRecentTransactions() {

    const container =
        $("recentTransactions");

    if (!container) {

        return;

    }


    const list =
        [...data.transactions]
            .sort(
                (a, b) =>
                    new Date(b.date) -
                    new Date(a.date)
            )
            .slice(0, 6);


    if (!list.length) {

        container.innerHTML = `

            <div class="empty">

                No transactions yet.

            </div>

        `;

        return;

    }


    container.innerHTML = `

        <table>

            <thead>

                <tr>

                    <th>Title</th>

                    <th>Category</th>

                    <th>Date</th>

                    <th>Amount</th>

                </tr>

            </thead>

            <tbody>

                ${list.map(transaction => `

                    <tr>

                        <td>
                            <strong>
                                ${escapeHTML(transaction.title)}
                            </strong>
                        </td>

                        <td>
                            ${escapeHTML(transaction.category)}
                        </td>

                        <td>
                            ${formatDate(transaction.date)}
                        </td>

                        <td class="
                            ${
                                transaction.type === "income"
                                    ? "amount-income"
                                    : "amount-expense"
                            }
                        ">

                            ${
                                transaction.type === "income"
                                    ? "+"
                                    : "-"
                            }

                            ${money(transaction.amount)}

                        </td>

                    </tr>

                `).join("")}

            </tbody>

        </table>

    `;

}


function updateFinancialSummary() {

    const given =
        data.loans
            .filter(
                loan => loan.type === "given"
            )
            .reduce(
                (sum, loan) =>
                    sum + numberValue(loan.amount),
                0
            );


    const received =
        data.loans
            .filter(
                loan => loan.type === "received"
            )
            .reduce(
                (sum, loan) =>
                    sum + numberValue(loan.amount),
                0
            );


    const committeeRemaining =
        data.committees
            .reduce(
                (sum, committee) => {

                    const total =
                        numberValue(
                            committee.amount
                        ) *
                        numberValue(
                            committee.months
                        );

                    const paid =
                        numberValue(
                            committee.paid
                        );

                    return sum +
                        Math.max(
                            total - paid,
                            0
                        );

                },
                0
            );


    const creditUsed =
        data.creditCards
            .reduce(
                (sum, card) =>
                    sum +
                    numberValue(card.used),
                0
            );


    if ($("summaryGiven")) {

        $("summaryGiven").textContent =
            money(given);

    }


    if ($("summaryReceived")) {

        $("summaryReceived").textContent =
            money(received);

    }


    if ($("summaryCommittee")) {

        $("summaryCommittee").textContent =
            money(committeeRemaining);

    }


    if ($("summaryCredit")) {

        $("summaryCredit").textContent =
            money(creditUsed);

    }

}


/* =========================================================
   CHARTS
========================================================= */

let incomeExpenseChart = null;

let expenseCategoryChart = null;

let monthlyChart = null;

let reportCategoryChart = null;


function chartColors(count) {

    const colors = [

        "#635BFF",
        "#10B981",
        "#EF4444",
        "#F59E0B",
        "#3B82F6",
        "#8B5CF6",
        "#EC4899",
        "#14B8A6",
        "#F97316",
        "#64748B"

    ];


    return Array.from(
        {
            length: count
        },
        (_, index) =>
            colors[index % colors.length]
    );

}


function getPeriodTransactions(period) {

    if (period === "all") {

        return [...data.transactions];

    }


    const months =
        Number(period) || 0;


    const cutoff =
        new Date();

    cutoff.setMonth(
        cutoff.getMonth() - months
    );


    return data.transactions.filter(
        transaction =>
            new Date(
                transaction.date +
                "T00:00:00"
            ) >= cutoff
    );

}


function renderIncomeExpenseChart() {

    const canvas =
        $("incomeExpenseChart");

    if (
        !canvas ||
        typeof Chart === "undefined"
    ) {

        return;

    }


    const period =
        $("dashboardPeriod")?.value ||
        "all";


    const transactions =
        getPeriodTransactions(period);


    const monthMap = {};


    transactions.forEach(transaction => {

        const key =
            monthKey(transaction.date);

        if (!key) {

            return;

        }


        if (!monthMap[key]) {

            monthMap[key] = {

                income: 0,

                expense: 0

            };

        }


        if (transaction.type === "income") {

            monthMap[key].income +=
                numberValue(
                    transaction.amount
                );

        } else {

            monthMap[key].expense +=
                numberValue(
                    transaction.amount
                );

        }

    });


    const keys =
        Object.keys(monthMap)
            .sort();


    const labels =
        keys.map(monthLabel);


    const income =
        keys.map(
            key =>
                monthMap[key].income
        );


    const expense =
        keys.map(
            key =>
                monthMap[key].expense
        );


    if (incomeExpenseChart) {

        incomeExpenseChart.destroy();

    }


    incomeExpenseChart =
        new Chart(
            canvas.getContext("2d"),
            {

                type: "line",

                data: {

                    labels,

                    datasets: [

                        {

                            label: "Income",

                            data: income,

                            borderColor:
                                "#10B981",

                            backgroundColor:
                                "rgba(16,185,129,.10)",

                            fill: true,

                            tension: .35,

                            borderWidth: 2

                        },

                        {

                            label: "Expense",

                            data: expense,

                            borderColor:
                                "#EF4444",

                            backgroundColor:
                                "rgba(239,68,68,.08)",

                            fill: true,

                            tension: .35,

                            borderWidth: 2

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    interaction: {

                        mode: "index",

                        intersect: false

                    },

                    plugins: {

                        legend: {

                            position: "bottom",

                            labels: {

                                boxWidth: 10,

                                font: {

                                    size: 10

                                }

                            }

                        }

                    },

                    scales: {

                        y: {

                            beginAtZero: true,

                            ticks: {

                                callback:
                                    value =>
                                        "₨ " +
                                        Number(value)
                                            .toLocaleString()

                            }

                        }

                    }

                }

            }
        );

}


function renderExpenseCategoryChart() {

    const canvas =
        $("expenseCategoryChart");

    if (
        !canvas ||
        typeof Chart === "undefined"
    ) {

        return;

    }


    const totals = {};


    data.transactions
        .filter(
            transaction =>
                transaction.type === "expense"
        )
        .forEach(transaction => {

            const category =
                transaction.category ||
                "Other Expense";


            totals[category] =
                (totals[category] || 0) +
                numberValue(
                    transaction.amount
                );

        });


    const labels =
        Object.keys(totals);


    const values =
        Object.values(totals);


    if (expenseCategoryChart) {

        expenseCategoryChart.destroy();

    }


    if (!labels.length) {

        expenseCategoryChart =
            new Chart(
                canvas.getContext("2d"),
                {

                    type: "doughnut",

                    data: {

                        labels: ["No Expenses"],

                        datasets: [

                            {

                                data: [1],

                                backgroundColor:
                                    ["#e5e7eb"],

                                borderWidth: 0

                            }

                        ]

                    },

                    options: {

                        responsive: true,

                        maintainAspectRatio: false,

                        plugins: {

                            legend: {

                                position: "bottom"

                            }

                        }

                    }

                }
            );

        return;

    }


    expenseCategoryChart =
        new Chart(
            canvas.getContext("2d"),
            {

                type: "doughnut",

                data: {

                    labels,

                    datasets: [

                        {

                            data: values,

                            backgroundColor:
                                chartColors(
                                    labels.length
                                ),

                            borderWidth: 2,

                            borderColor:
                                "#ffffff"

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    cutout: "62%",

                    plugins: {

                        legend: {

                            position: "bottom",

                            labels: {

                                boxWidth: 10,

                                font: {

                                    size: 9

                                }

                            }

                        }

                    }

                }

            }
        );

}


$("dashboardPeriod")?.addEventListener(
    "change",
    renderIncomeExpenseChart
);


/* =========================================================
   REPORTS
========================================================= */

function populateReportMonths() {

    const select =
        $("reportMonth");

    if (!select) {

        return;

    }


    const current =
        select.value || "all";


    const months =
        [
            ...new Set(
                data.transactions
                    .map(item =>
                        monthKey(item.date)
                    )
                    .filter(Boolean)
            )
        ]
        .sort()
        .reverse();


    select.innerHTML = `

        <option value="all">
            All Time
        </option>

        ${
            months.map(month => `
                <option value="${month}">
                    ${monthLabel(month)}
                </option>
            `).join("")
        }

    `;


    if (
        current === "all" ||
        months.includes(current)
    ) {

        select.value =
            current;

    }

}


function getReportTransactions() {

    const selected =
        $("reportMonth")?.value ||
        "all";


    if (selected === "all") {

        return [...data.transactions];

    }


    return data.transactions.filter(
        transaction =>
            monthKey(transaction.date) ===
            selected
    );

}


function updateReports() {

    const transactions =
        getReportTransactions();


    const totals =
        getTotals(transactions);


    const rate =
        totals.income > 0
            ? (
                totals.savings /
                totals.income
            ) * 100
            : 0;


    if ($("reportIncome")) {

        $("reportIncome").textContent =
            money(totals.income);

    }


    if ($("reportExpense")) {

        $("reportExpense").textContent =
            money(totals.expense);

    }


    if ($("reportSavings")) {

        $("reportSavings").textContent =
            money(totals.savings);

    }


    if ($("reportRate")) {

        $("reportRate").textContent =
            `${rate.toFixed(1)}%`;

    }


    renderMonthlyChart();

    renderReportCategoryChart();

    renderCategoryAnalysis();

}


function renderMonthlyChart() {

    const canvas =
        $("monthlyChart");

    if (
        !canvas ||
        typeof Chart === "undefined"
    ) {

        return;

    }


    const map = {};


    data.transactions.forEach(transaction => {

        const key =
            monthKey(transaction.date);

        if (!key) {

            return;

        }


        if (!map[key]) {

            map[key] = {

                income: 0,

                expense: 0

            };

        }


        if (transaction.type === "income") {

            map[key].income +=
                numberValue(
                    transaction.amount
                );

        } else {

            map[key].expense +=
                numberValue(
                    transaction.amount
                );

        }

    });


    const keys =
        Object.keys(map)
            .sort()
            .slice(-12);


    if (monthlyChart) {

        monthlyChart.destroy();

    }


    monthlyChart =
        new Chart(
            canvas.getContext("2d"),
            {

                type: "bar",

                data: {

                    labels:
                        keys.map(monthLabel),

                    datasets: [

                        {

                            label: "Income",

                            data:
                                keys.map(
                                    key =>
                                        map[key].income
                                ),

                            backgroundColor:
                                "#10B981",

                            borderRadius: 6

                        },

                        {

                            label: "Expense",

                            data:
                                keys.map(
                                    key =>
                                        map[key].expense
                                ),

                            backgroundColor:
                                "#EF4444",

                            borderRadius: 6

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {

                            position: "bottom"

                        }

                    },

                    scales: {

                        y: {

                            beginAtZero: true,

                            ticks: {

                                callback:
                                    value =>
                                        "₨ " +
                                        Number(value)
                                            .toLocaleString()

                            }

                        }

                    }

                }

            }
        );

}


function renderReportCategoryChart() {

    const canvas =
        $("reportCategoryChart");

    if (
        !canvas ||
        typeof Chart === "undefined"
    ) {

        return;

    }


    const transactions =
        getReportTransactions();


    const totals = {};


    transactions
        .filter(
            transaction =>
                transaction.type === "expense"
        )
        .forEach(transaction => {

            const category =
                transaction.category ||
                "Other Expense";


            totals[category] =
                (totals[category] || 0) +
                numberValue(
                    transaction.amount
                );

        });


    const labels =
        Object.keys(totals);


    const values =
        Object.values(totals);


    if (reportCategoryChart) {

        reportCategoryChart.destroy();

    }


    reportCategoryChart =
        new Chart(
            canvas.getContext("2d"),
            {

                type: "doughnut",

                data: {

                    labels:
                        labels.length
                            ? labels
                            : ["No Expenses"],

                    datasets: [

                        {

                            data:
                                values.length
                                    ? values
                                    : [1],

                            backgroundColor:
                                labels.length
                                    ? chartColors(
                                        labels.length
                                    )
                                    : ["#e5e7eb"],

                            borderWidth: 2,

                            borderColor:
                                "#ffffff"

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    cutout: "60%",

                    plugins: {

                        legend: {

                            position: "bottom"

                        }

                    }

                }

            }
        );

}


function renderCategoryAnalysis() {

    const container =
        $("categoryAnalysis");

    if (!container) {

        return;

    }


    const transactions =
        getReportTransactions()
            .filter(
                transaction =>
                    transaction.type === "expense"
            );


    const categories = {};


    transactions.forEach(transaction => {

        const category =
            transaction.category ||
            "Other Expense";


        categories[category] =
            (categories[category] || 0) +
            numberValue(
                transaction.amount
            );

    });


    const entries =
        Object.entries(categories)
            .sort(
                (a, b) =>
                    b[1] - a[1]
            );


    if (!entries.length) {

        container.innerHTML = `

            <div class="empty">

                No expense data available.

            </div>

        `;

        return;

    }


    const total =
        entries.reduce(
            (sum, [, value]) =>
                sum + value,
            0
        );


    container.innerHTML = `

        <table>

            <thead>

                <tr>

                    <th>Category</th>

                    <th>Amount</th>

                    <th>Percentage</th>

                </tr>

            </thead>

            <tbody>

                ${entries.map(
                    ([category, amount]) => {

                        const percentage =
                            total > 0
                                ? (
                                    amount /
                                    total
                                ) * 100
                                : 0;


                        return `

                            <tr>

                                <td>
                                    <strong>
                                        ${escapeHTML(category)}
                                    </strong>
                                </td>

                                <td class="amount-expense">
                                    ${money(amount)}
                                </td>

                                <td>
                                    ${percentage.toFixed(1)}%
                                </td>

                            </tr>

                        `;

                    }
                ).join("")}

            </tbody>

        </table>

    `;

}


$("reportMonth")?.addEventListener(
    "change",
    updateReports
);


/* =========================================================
   LOANS
========================================================= */

function setDefaultLoanForm() {

    const form =
        $("loanForm");

    if (form) {

        form.reset();

    }


    if ($("loanType")) {

        $("loanType").value =
            "given";

    }


    if ($("loanDate")) {

        $("loanDate").value =
            today();

    }

}


function addLoan(event) {

    event.preventDefault();


    const type =
        $("loanType").value;

    const person =
        $("loanPerson").value.trim();

    const amount =
        numberValue(
            $("loanAmount").value
        );

    const date =
        $("loanDate").value;

    const note =
        $("loanNote").value.trim();


    if (!person) {

        showToast(
            "Please enter person name."
        );

        return;

    }


    if (amount <= 0) {

        showToast(
            "Please enter a valid loan amount."
        );

        return;

    }


    data.loans.push({

        id:
            uniqueId("loan"),

        type,

        person,

        amount,

        date,

        note,

        paid: 0,

        createdAt:
            new Date().toISOString()

    });


    saveData();

    closeModal("loanModal");

    updateAll();

    showToast(
        "Loan added successfully."
    );

}


$("loanForm")?.addEventListener(
    "submit",
    addLoan
);


function renderLoans() {

    const container =
        $("loanList");

    if (!container) {

        return;

    }


    const given =
        data.loans
            .filter(
                loan =>
                    loan.type === "given"
            )
            .reduce(
                (sum, loan) =>
                    sum +
                    numberValue(loan.amount),
                0
            );


    const received =
        data.loans
            .filter(
                loan =>
                    loan.type === "received"
            )
            .reduce(
                (sum, loan) =>
                    sum +
                    numberValue(loan.amount),
                0
            );


    const outstanding =
        given - received;


    if ($("loanGiven")) {

        $("loanGiven").textContent =
            money(given);

    }


    if ($("loanReceived")) {

        $("loanReceived").textContent =
            money(received);

    }


    if ($("loanOutstanding")) {

        $("loanOutstanding").textContent =
            money(Math.max(outstanding, 0));

    }


    if (!data.loans.length) {

        container.innerHTML = `

            <div class="empty">

                No loan records yet.

            </div>

        `;

        return;

    }


    const list =
        [...data.loans]
            .sort(
                (a, b) =>
                    new Date(b.date) -
                    new Date(a.date)
            );


    container.innerHTML = `

        <table>

            <thead>

                <tr>

                    <th>Date</th>

                    <th>Person</th>

                    <th>Type</th>

                    <th>Amount</th>

                    <th>Note</th>

                    <th>Action</th>

                </tr>

            </thead>

            <tbody>

                ${list.map(loan => `

                    <tr>

                        <td>
                            ${formatDate(loan.date)}
                        </td>

                        <td>
                            <strong>
                                ${escapeHTML(loan.person)}
                            </strong>
                        </td>

                        <td>

                            <span class="
                                badge
                                ${
                                    loan.type === "given"
                                        ? "badge-given"
                                        : "badge-received"
                                }
                            ">

                                ${
                                    loan.type === "given"
                                        ? "Given"
                                        : "Received"
                                }

                            </span>

                        </td>

                        <td>

                            ${money(loan.amount)}

                        </td>

                        <td>

                            ${escapeHTML(
                                loan.note || "-"
                            )}

                        </td>

                        <td>

                            <button
                                class="delete-btn"
                                onclick="deleteLoan('${loan.id}')"
                            >
                                Delete
                            </button>

                        </td>

                    </tr>

                `).join("")}

            </tbody>

        </table>

    `;

}


function deleteLoan(id) {

    if (
        !confirm(
            "Delete this loan record?"
        )
    ) {

        return;

    }


    data.loans =
        data.loans.filter(
            loan => loan.id !== id
        );


    saveData();

    updateAll();

    showToast(
        "Loan deleted."
    );

}


window.deleteLoan =
    deleteLoan;


/* =========================================================
   COMMITTEE
========================================================= */

function setDefaultCommitteeForm() {

    const form =
        $("committeeForm");

    if (form) {

        form.reset();

    }


    if ($("committeeStart")) {

        $("committeeStart").value =
            today();

    }

}


function addCommittee(event) {

    event.preventDefault();


    const name =
        $("committeeName").value.trim();

    const amount =
        numberValue(
            $("committeeAmount").value
        );

    const months =
        parseInt(
            $("committeeMonths").value,
            10
        );

    const start =
        $("committeeStart").value;


    if (!name) {

        showToast(
            "Please enter committee name."
        );

        return;

    }


    if (amount <= 0) {

        showToast(
            "Please enter monthly amount."
        );

        return;

    }


    if (!months || months < 1) {

        showToast(
            "Please enter total months."
        );

        return;

    }


    data.committees.push({

        id:
            uniqueId("committee"),

        name,

        amount,

        months,

        start,

        paid: 0,

        paidMonths: 0,

        createdAt:
            new Date().toISOString()

    });


    saveData();

    closeModal("committeeModal");

    updateAll();

    showToast(
        "Committee created successfully."
    );

}


$("committeeForm")?.addEventListener(
    "submit",
    addCommittee
);


function renderCommittees() {

    const container =
        $("committeeList");

    if (!container) {

        return;

    }


    let totalCommittee = 0;

    let paidAmount = 0;

    let remainingAmount = 0;


    data.committees.forEach(committee => {

        const total =
            numberValue(
                committee.amount
            ) *
            numberValue(
                committee.months
            );


        const paid =
            numberValue(
                committee.paid
            );


        totalCommittee += total;

        paidAmount += paid;

        remainingAmount +=
            Math.max(
                total - paid,
                0
            );

    });


    if ($("committeeTotal")) {

        $("committeeTotal").textContent =
            money(totalCommittee);

    }


    if ($("committeePaid")) {

        $("committeePaid").textContent =
            money(paidAmount);

    }


    if ($("committeeRemaining")) {

        $("committeeRemaining").textContent =
            money(remainingAmount);

    }


    if (!data.committees.length) {

        container.innerHTML = `

            <div class="empty">

                No committee created yet.

            </div>

        `;

        return;

    }


    container.innerHTML =
        data.committees
            .map(committee => {

                const total =
                    numberValue(
                        committee.amount
                    ) *
                    numberValue(
                        committee.months
                    );


                const paid =
                    numberValue(
                        committee.paid
                    );


                const remaining =
                    Math.max(
                        total - paid,
                        0
                    );


                const percentage =
                    total > 0
                        ? Math.min(
                            100,
                            (
                                paid /
                                total
                            ) * 100
                        )
                        : 0;


                const paidMonths =
                    numberValue(
                        committee.paidMonths
                    );


                return `

                    <div class="committee-card">

                        <div class="committee-top">

                            <div>

                                <h3>
                                    ${escapeHTML(
                                        committee.name
                                    )}
                                </h3>

                                <p>
                                    Started:
                                    ${formatDate(
                                        committee.start
                                    )}
                                </p>

                            </div>

                            <button
                                class="delete-btn"
                                onclick="deleteCommittee('${committee.id}')"
                            >
                                Delete
                            </button>

                        </div>


                        <div class="committee-amount">

                            <strong>
                                ${money(
                                    committee.amount
                                )}
                            </strong>

                            <span>
                                / month
                            </span>

                        </div>


                        <div class="progress">

                            <div
                                class="progress-bar"
                                style="width:${percentage}%"
                            ></div>

                        </div>


                        <div class="committee-meta">

                            <span>
                                ${paidMonths}
                                /
                                ${committee.months}
                                months paid
                            </span>

                            <strong>
                                ${percentage.toFixed(0)}%
                            </strong>

                        </div>


                        <div class="committee-meta">

                            <span>
                                Remaining
                            </span>

                            <strong>
                                ${money(remaining)}
                            </strong>

                        </div>


                        <div class="committee-actions">

                            ${
                                remaining > 0
                                    ? `
                                        <button
                                            class="primary-btn"
                                            onclick="payCommittee('${committee.id}')"
                                        >
                                            + Pay Monthly
                                        </button>
                                      `
                                    : `
                                        <span class="badge badge-income">
                                            Completed
                                        </span>
                                      `
                            }

                        </div>

                    </div>

                `;

            })
            .join("");

}


function payCommittee(id) {

    const committee =
        data.committees.find(
            item => item.id === id
        );


    if (!committee) {

        return;

    }


    const monthly =
        numberValue(
            committee.amount
        );


    const total =
        monthly *
        numberValue(
            committee.months
        );


    const paid =
        numberValue(
            committee.paid
        );


    if (paid >= total) {

        showToast(
            "This committee is already completed."
        );

        return;

    }


    const newPaid =
        Math.min(
            paid + monthly,
            total
        );


    committee.paid =
        newPaid;


    committee.paidMonths =
        Math.min(
            numberValue(
                committee.paidMonths
            ) + 1,
            numberValue(
                committee.months
            )
        );


    saveData();

    updateAll();

    showToast(
        "Committee payment recorded."
    );

}


function deleteCommittee(id) {

    if (
        !confirm(
            "Delete this committee?"
        )
    ) {

        return;

    }


    data.committees =
        data.committees.filter(
            committee =>
                committee.id !== id
        );


    saveData();

    updateAll();

    showToast(
        "Committee deleted."
    );

}


window.payCommittee =
    payCommittee;

window.deleteCommittee =
    deleteCommittee;


/* =========================================================
   CREDIT CARDS
========================================================= */

function addCreditCard(event) {

    event.preventDefault();


    const name =
        $("creditName").value.trim();

    const limit =
        numberValue(
            $("creditLimit").value
        );

    const used =
        numberValue(
            $("creditUsed").value
        );


    if (!name) {

        showToast(
            "Please enter card name."
        );

        return;

    }


    if (limit <= 0) {

        showToast(
            "Please enter a valid credit limit."
        );

        return;

    }


    if (used < 0 || used > limit) {

        showToast(
            "Used amount must be between 0 and the credit limit."
        );

        return;

    }


    data.creditCards.push({

        id:
            uniqueId("card"),

        name,

        limit,

        used,

        createdAt:
            new Date().toISOString()

    });


    saveData();

    closeModal("creditModal");

    $("creditForm").reset();

    updateAll();

    showToast(
        "Credit card added successfully."
    );

}


$("creditForm")?.addEventListener(
    "submit",
    addCreditCard
);


function renderCreditCards() {

    const container =
        $("creditList");

    if (!container) {

        return;

    }


    if (!data.creditCards.length) {

        container.innerHTML = `

            <div class="empty">

                No credit card added yet.

            </div>

        `;

        return;

    }


    container.innerHTML =
        data.creditCards
            .map(card => {

                const available =
                    Math.max(
                        numberValue(card.limit) -
                        numberValue(card.used),
                        0
                    );


                const usage =
                    numberValue(card.limit) > 0
                        ? (
                            numberValue(card.used) /
                            numberValue(card.limit)
                        ) * 100
                        : 0;


                return `

                    <div class="credit-card">

                        <div
                            style="
                                position:relative;
                                z-index:2;
                                display:flex;
                                justify-content:space-between;
                                align-items:center;
                            "
                        >

                            <strong>
                                ${escapeHTML(card.name)}
                            </strong>

                            <button
                                class="delete-btn"
                                onclick="deleteCreditCard('${card.id}')"
                            >
                                Delete
                            </button>

                        </div>


                        <div class="credit-card-number">

                            •••• •••• •••• ••••

                        </div>


                        <div class="credit-bottom">

                            <div>

                                <small>
                                    CREDIT LIMIT
                                </small>

                                <strong>
                                    ${money(card.limit)}
                                </strong>

                            </div>


                            <div>

                                <small>
                                    USED
                                </small>

                                <strong>
                                    ${money(card.used)}
                                </strong>

                            </div>


                            <div>

                                <small>
                                    AVAILABLE
                                </small>

                                <strong>
                                    ${money(available)}
                                </strong>

                            </div>

                        </div>


                        <div
                            style="
                                position:relative;
                                z-index:2;
                                margin-top:16px;
                            "
                        >

                            <div
                                style="
                                    height:5px;
                                    background:rgba(255,255,255,.16);
                                    border-radius:20px;
                                    overflow:hidden;
                                "
                            >

                                <div
                                    style="
                                        width:${Math.min(
                                            usage,
                                            100
                                        )}%;
                                        height:100%;
                                        background:#ffffff;
                                        border-radius:20px;
                                    "
                                ></div>

                            </div>


                            <div
                                style="
                                    display:flex;
                                    justify-content:space-between;
                                    margin-top:6px;
                                    font-size:8px;
                                    opacity:.7;
                                "
                            >

                                <span>
                                    ${usage.toFixed(0)}% used
                                </span>

                                <span>
                                    ${money(available)} available
                                </span>

                            </div>

                        </div>

                    </div>

                `;

            })
            .join("");

}


function deleteCreditCard(id) {

    if (
        !confirm(
            "Delete this credit card?"
        )
    ) {

        return;

    }


    data.creditCards =
        data.creditCards.filter(
            card => card.id !== id
        );


    saveData();

    updateAll();

    showToast(
        "Credit card deleted."
    );

}


window.deleteCreditCard =
    deleteCreditCard;


/* =========================================================
   CURRENT DATE
========================================================= */

function updateCurrentDate() {

    const element =
        $("currentDate");

    if (!element) {

        return;

    }


    const date =
        new Date();


    element.textContent =
        date.toLocaleDateString(
            "en-PK",
            {
                weekday: "short",
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );

}


/* =========================================================
   UPDATE EVERYTHING
========================================================= */

function updateAll() {

    saveData();

    updateCurrentDate();

    populateTransactionMonths();

    populateReportMonths();

    updateDashboard();

    renderTransactions();

    updateReports();

    renderLoans();

    renderCommittees();

    renderCreditCards();

}


/* =========================================================
   INITIALIZATION
========================================================= */

function init() {

    updateTransactionCategories();

    setDefaultTransactionForm();

    updateCurrentDate();

    updateAll();

}


/* =========================================================
   START APP
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        init
    );

} else {

    init();

}