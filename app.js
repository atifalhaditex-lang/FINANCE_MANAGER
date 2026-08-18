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

    creditCards: [],

    cashWithdrawals: [],

    installments: []

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
                    : [],

            cashWithdrawals:
                Array.isArray(parsed.cashWithdrawals)
                    ? parsed.cashWithdrawals
                    : [],

            installments:
                Array.isArray(parsed.installments)
                    ? parsed.installments
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
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        console.error("Could not save finance data:", error);
        showToast("Could not save data. Browser storage may be full.");
    }
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
    "Installment",
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


function dateNumber(dateString) {
    if (!dateString) return 0;
    const parts = String(dateString).split("-").map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return 0;
    return parts[0] * 10000 + parts[1] * 100 + parts[2];
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
            "My complete financial overview"

    },

    transactions: {

        title: "Transactions",

        subtitle:
            "Manage my income and expenses."

    },

    reports: {

        title: "Reports & Analytics",

        subtitle:
            "Understand where my money goes."

    },

    loans: {

        title: "Loans / Udhaar",

        subtitle:
            "Manage money given to or received from people."

    },

    committee: {

        title: "Committee",

        subtitle:
            "Track my monthly committee payments."

    },

    installments: {

        title: "Installments",

        subtitle:
            "Track my purchases and payments over time."

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


    if (id === "transactionModal" && !editingTransactionId) {

        setDefaultTransactionForm();
        const modalTitle = document.querySelector("#transactionModal .modal-header h2");
        const submitButton = document.querySelector("#transactionForm button[type=submit]");
        if (modalTitle) modalTitle.textContent = "Add Transaction";
        if (submitButton) submitButton.textContent = "Add Transaction";

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
    if (id === "transactionModal") {
        editingTransactionId = null;
        const modalTitle = document.querySelector("#transactionModal .modal-header h2");
        const submitButton = document.querySelector("#transactionForm button[type=submit]");
        if (modalTitle) modalTitle.textContent = "Add Transaction";
        if (submitButton) submitButton.textContent = "Add Transaction";
    }
    if (id === "loanModal") {
        editingLoanId = null;
        const title = document.querySelector("#loanModal .modal-header h2"); const submit = document.querySelector("#loanForm button[type=submit]");
        if (title) title.textContent = "Add Loan / Udhaar"; if (submit) submit.textContent = "Add Loan";
    }
    if (id === "committeeModal") {
        editingCommitteeId = null;
        const title = document.querySelector("#committeeModal .modal-header h2"); const submit = document.querySelector("#committeeForm button[type=submit]");
        if (title) title.textContent = "Add Committee"; if (submit) submit.textContent = "Add Committee";
    }

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


let editingTransactionId = null;

function openTransactionForEdit(id) {
    const transaction = data.transactions.find(item => item.id === id);
    if (!transaction) return;
    if (transaction.source === "installment") {
        showToast("Edit this payment from Installments so the linked records stay synchronized.");
        return;
    }
    editingTransactionId = id;
    $("transactionType").value = transaction.type;
    updateTransactionCategories();
    $("transactionCategory").value = transaction.category;
    $("transactionTitle").value = transaction.title;
    $("transactionAmount").value = transaction.amount;
    $("transactionDate").value = transaction.date;
    const title = document.querySelector("#transactionModal .modal-header h2");
    const submit = document.querySelector("#transactionForm button[type=submit]");
    if (title) title.textContent = "Edit Transaction";
    if (submit) submit.textContent = "Save Changes";
    openModal("transactionModal");
}
window.openTransactionForEdit = openTransactionForEdit;

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


    if (editingTransactionId) {
        const transaction = data.transactions.find(item => item.id === editingTransactionId);
        if (transaction) {
            transaction.type = type;
            transaction.category = category;
            transaction.title = title;
            transaction.amount = amount;
            transaction.date = date;
        }
        showToast("Transaction updated successfully.");
    } else {
        data.transactions.push({
            id: uniqueId("txn"),
            type,
            category,
            title,
            amount,
            date,
            createdAt: new Date().toISOString()
        });
        showToast(type === "income" ? "Income added successfully." : "Expense added successfully.");
    }

    editingTransactionId = null;
    const modalTitle = document.querySelector("#transactionModal .modal-header h2");
    const submitButton = document.querySelector("#transactionForm button[type=submit]");
    if (modalTitle) modalTitle.textContent = "Add Transaction";
    if (submitButton) submitButton.textContent = "Add Transaction";
    saveData();
    closeModal("transactionModal");
    updateAll();

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
            dateNumber(b.date) -
            dateNumber(a.date)
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

                            <button class="text-btn" onclick="openTransactionForEdit('${transaction.id}')">Edit</button>
                            <button class="delete-btn" onclick="deleteTransaction('${transaction.id}')">Delete</button>

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

    if (transaction.source === "installment" && transaction.installmentId) {
        const plan = data.installments.find(item => item.id === transaction.installmentId);
        if (plan) {
            plan.payments = (plan.payments || []).filter(payment => payment.id !== transaction.paymentId);
        }
    }

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
                    dateNumber(b.date) -
                    dateNumber(a.date)
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


let editingLoanId = null;

function openLoanForEdit(id) {
    const loan = data.loans.find(item => item.id === id);
    if (!loan) return;
    editingLoanId = id;
    $("loanType").value = loan.type; $("loanPerson").value = loan.person; $("loanAmount").value = loan.amount; $("loanDate").value = loan.date; $("loanNote").value = loan.note || "";
    const title = document.querySelector("#loanModal .modal-header h2"); const submit = document.querySelector("#loanForm button[type=submit]");
    if (title) title.textContent = "Edit Loan / Udhaar"; if (submit) submit.textContent = "Save Changes";
    openModal("loanModal");
}
window.openLoanForEdit = openLoanForEdit;

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


    if (editingLoanId) {
        const loan = data.loans.find(item => item.id === editingLoanId);
        if (loan) Object.assign(loan, {type,person,amount,date,note});
        showToast("Loan updated successfully.");
    } else {
        data.loans.push({id:uniqueId("loan"),type,person,amount,date,note,paid:0,createdAt:new Date().toISOString()});
        showToast("Loan added successfully.");
    }
    editingLoanId = null;
    const title = document.querySelector("#loanModal .modal-header h2"); const submit = document.querySelector("#loanForm button[type=submit]");
    if (title) title.textContent = "Add Loan / Udhaar"; if (submit) submit.textContent = "Add Loan";
    saveData(); closeModal("loanModal"); updateAll();

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
                    dateNumber(b.date) -
                    dateNumber(a.date)
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

                            <button class="text-btn" onclick="openLoanForEdit('${loan.id}')">Edit</button>
                            <button class="delete-btn" onclick="deleteLoan('${loan.id}')">Delete</button>

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


let editingCommitteeId = null;

function openCommitteeForEdit(id) {
    const committee = data.committees.find(item => item.id === id);
    if (!committee) return;
    editingCommitteeId = id;
    $("committeeName").value = committee.name; $("committeeAmount").value = committee.amount; $("committeeMonths").value = committee.months; $("committeeStart").value = committee.start;
    const title = document.querySelector("#committeeModal .modal-header h2"); const submit = document.querySelector("#committeeForm button[type=submit]");
    if (title) title.textContent = "Edit Committee"; if (submit) submit.textContent = "Save Changes";
    openModal("committeeModal");
}
window.openCommitteeForEdit = openCommitteeForEdit;

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


    if (editingCommitteeId) {
        const committee = data.committees.find(item => item.id === editingCommitteeId);
        if (committee) Object.assign(committee, {name,amount,months,start});
        showToast("Committee updated successfully.");
    } else {
        data.committees.push({id:uniqueId("committee"),name,amount,months,start,paid:0,paidMonths:0,payments:[],createdAt:new Date().toISOString()});
        showToast("Committee created successfully.");
    }
    editingCommitteeId = null;
    const title = document.querySelector("#committeeModal .modal-header h2"); const submit = document.querySelector("#committeeForm button[type=submit]");
    if (title) title.textContent = "Add Committee"; if (submit) submit.textContent = "Add Committee";
    saveData(); closeModal("committeeModal"); updateAll();

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

                            <button class="text-btn" onclick="openCommitteeForEdit('${committee.id}')">Edit</button>
                            <button class="delete-btn" onclick="deleteCommittee('${committee.id}')">Delete</button>

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

    committee.payments = Array.isArray(committee.payments) ? committee.payments : [];
    const paymentId = uniqueId("cmpay");
    const transactionId = uniqueId("cmptxn");
    committee.payments.push({id:paymentId, amount:Math.min(monthly,total-paid), date:today(), transactionId});
    data.transactions.push({id:transactionId,type:"expense",category:"Committee",title:`${committee.name} — Committee Payment`,amount:Math.min(monthly,total-paid),date:today(),source:"committee",committeeId:committee.id,paymentId,createdAt:new Date().toISOString()});

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


    const removedCommittee = data.committees.find(committee => committee.id === id);
    const linkedTransactions = new Set((removedCommittee?.payments || []).map(payment => payment.transactionId));
    data.transactions = data.transactions.filter(transaction => !linkedTransactions.has(transaction.id));
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

        renderCashWithdrawals();
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

                        <div style="position:relative;z-index:3;margin-top:14px;">
                            <button
                                type="button"
                                class="primary-btn"
                                onclick="openCashWithdrawalModal('${card.id}')"
                            >
                                💵 Cash Withdrawal — 2% Charge
                            </button>
                        </div>

                    </div>

                `;

            })
            .join("");

    renderCashWithdrawals();

}


/* =========================================================
   CREDIT CARD CASH WITHDRAWAL — 2% CHARGE
========================================================= */

function ensureWithdrawalModal() {

    if ($("cashWithdrawalModal")) return;

    const modal = document.createElement("div");
    modal.className = "modal";
    modal.id = "cashWithdrawalModal";

    modal.innerHTML = `
        <div class="modal-box">
            <div class="modal-header">
                <div>
                    <h2>Cash Withdrawal</h2>
                    <p>Withdraw cash from your credit card. A 2% charge applies.</p>
                </div>
                <button type="button" class="close-btn" onclick="closeModal('cashWithdrawalModal')">×</button>
            </div>
            <form id="cashWithdrawalForm">
                <div class="form-grid">
                    <div class="form-group full">
                        <label>Credit Card</label>
                        <select id="withdrawalCard" required></select>
                    </div>
                    <div class="form-group">
                        <label>Cash Amount</label>
                        <input type="number" id="withdrawalAmount" min="1" step="0.01" placeholder="0" required>
                    </div>
                    <div class="form-group">
                        <label>2% Withdrawal Charge</label>
                        <input type="text" id="withdrawalCharge" value="₨ 0" readonly>
                    </div>
                    <div class="form-group full">
                        <label>Total Added to Card Used</label>
                        <input type="text" id="withdrawalTotal" value="₨ 0" readonly>
                    </div>
                    <div class="form-group full">
                        <label>Note</label>
                        <input type="text" id="withdrawalNote" placeholder="e.g. Emergency cash">
                    </div>
                </div>
                <div class="modal-actions">
                    <button type="button" class="secondary-btn" onclick="closeModal('cashWithdrawalModal')">Cancel</button>
                    <button type="submit" class="primary-btn">Withdraw Cash</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener("click", event => {
        if (event.target === modal) closeModal("cashWithdrawalModal");
    });

    $("cashWithdrawalForm")?.addEventListener("submit", processCashWithdrawal);
    $("withdrawalAmount")?.addEventListener("input", updateWithdrawalPreview);
    $("withdrawalCard")?.addEventListener("change", updateWithdrawalPreview);
}

function populateWithdrawalCards() {
    const select = $("withdrawalCard");
    if (!select) return;

    if (!data.creditCards.length) {
        select.innerHTML = `<option value="">No credit card available</option>`;
        return;
    }

    const current = select.value;
    select.innerHTML = data.creditCards.map(card => {
        const available = Math.max(numberValue(card.limit) - numberValue(card.used), 0);
        return `<option value="${escapeHTML(card.id)}">${escapeHTML(card.name)} — Available ${money(available)}</option>`;
    }).join("");

    if (data.creditCards.some(card => card.id === current)) select.value = current;
}

function getSelectedWithdrawalCard() {
    const id = $("withdrawalCard")?.value;
    return id ? data.creditCards.find(card => card.id === id) || null : null;
}

function updateWithdrawalPreview() {
    const amount = numberValue($("withdrawalAmount")?.value);
    const charge = amount * 0.02;
    const total = amount + charge;
    if ($("withdrawalCharge")) $("withdrawalCharge").value = money(charge);
    if ($("withdrawalTotal")) $("withdrawalTotal").value = money(total);
}

function openCashWithdrawalModal(cardId = "") {
    ensureWithdrawalModal();
    populateWithdrawalCards();

    if (!data.creditCards.length) {
        showToast("Please add a credit card first.");
        return;
    }

    if (cardId && $("withdrawalCard")) $("withdrawalCard").value = cardId;
    if ($("withdrawalAmount")) $("withdrawalAmount").value = "";
    if ($("withdrawalNote")) $("withdrawalNote").value = "";
    updateWithdrawalPreview();
    openModal("cashWithdrawalModal");
}

function processCashWithdrawal(event) {
    event.preventDefault();

    const card = getSelectedWithdrawalCard();
    const amount = numberValue($("withdrawalAmount")?.value);
    const note = ($( "withdrawalNote")?.value || "").trim();

    if (!card) {
        showToast("Please select a credit card.");
        return;
    }

    if (amount <= 0) {
        showToast("Please enter a valid withdrawal amount.");
        return;
    }

    const limit = numberValue(card.limit);
    const used = numberValue(card.used);
    const available = Math.max(limit - used, 0);
    const charge = amount * 0.02;
    const total = amount + charge;

    if (total > available) {
        showToast(`Insufficient available credit. Required: ${money(total)}.`);
        return;
    }

    const withdrawalId = uniqueId("withdrawal");

    card.used = used + total;

    data.cashWithdrawals.push({
        id: withdrawalId,
        cardId: card.id,
        cardName: card.name,
        amount,
        charge,
        total,
        note: note || "Cash withdrawal",
        date: today(),
        createdAt: new Date().toISOString()
    });

    /* Only the 2% fee is an expense. The withdrawn cash itself is borrowed money. */
    data.transactions.push({
        id: uniqueId("txn"),
        type: "expense",
        category: "Other Expense",
        title: `Credit Card Cash Withdrawal Charge — ${card.name}`,
        amount: charge,
        date: today(),
        createdAt: new Date().toISOString(),
        source: "credit-withdrawal",
        withdrawalId
    });

    saveData();
    closeModal("cashWithdrawalModal");
    updateAll();

    showToast(`${money(amount)} withdrawn. 2% charge: ${money(charge)}.`);
}

function deleteCashWithdrawal(id) {
    const withdrawal = data.cashWithdrawals.find(item => item.id === id);
    if (!withdrawal) return;

    if (!confirm("Delete this cash withdrawal and reverse its credit usage?")) return;

    const card = data.creditCards.find(item => item.id === withdrawal.cardId);
    if (card) {
        card.used = Math.max(numberValue(card.used) - numberValue(withdrawal.total), 0);
    }

    data.transactions = data.transactions.filter(
        transaction => transaction.withdrawalId !== withdrawal.id
    );

    data.cashWithdrawals = data.cashWithdrawals.filter(
        item => item.id !== id
    );

    saveData();
    updateAll();
    showToast("Cash withdrawal deleted.");
}

window.openCashWithdrawalModal = openCashWithdrawalModal;
window.deleteCashWithdrawal = deleteCashWithdrawal;

function renderCashWithdrawals() {
    const container = $("cashWithdrawalList");
    if (!container) return;

    if (!data.cashWithdrawals.length) {
        container.innerHTML = `<div class="empty">No cash withdrawals yet.</div>`;
        return;
    }

    const list = [...data.cashWithdrawals].sort(
        (a, b) => dateNumber(b.date) - dateNumber(a.date)
    );

    container.innerHTML = `
        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Card</th>
                        <th>Cash</th>
                        <th>2% Charge</th>
                        <th>Total Used</th>
                        <th>Note</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${list.map(item => `
                        <tr>
                            <td>${formatDate(item.date)}</td>
                            <td>${escapeHTML(item.cardName)}</td>
                            <td class="amount-income">${money(item.amount)}</td>
                            <td class="amount-expense">${money(item.charge)}</td>
                            <td class="amount-expense">${money(item.total)}</td>
                            <td>${escapeHTML(item.note)}</td>
                            <td><button class="delete-btn" onclick="deleteCashWithdrawal('${item.id}')">Delete</button></td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
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

    const removedWithdrawalIds =
        data.cashWithdrawals
            .filter(item => item.cardId === id)
            .map(item => item.id);

    data.cashWithdrawals =
        data.cashWithdrawals.filter(
            item => item.cardId !== id
        );

    data.transactions =
        data.transactions.filter(
            transaction =>
                !removedWithdrawalIds.includes(
                    transaction.withdrawalId
                )
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
   INSTALLMENTS — COMPLETE TRACKING
========================================================= */

function installmentTotal(plan) {
    const base = numberValue(plan.totalPrice);
    const markup = numberValue(plan.markupPercent);
    return base + (base * markup / 100);
}

function installmentPaid(plan) {
    return (plan.payments || []).reduce((sum, payment) => sum + numberValue(payment.amount), 0);
}

function installmentRemaining(plan) {
    return Math.max(0, installmentTotal(plan) - numberValue(plan.downPayment) - installmentPaid(plan));
}

function installmentMonthly(plan) {
    if (numberValue(plan.monthlyAmount) > 0) return numberValue(plan.monthlyAmount);
    const count = Math.max(1, numberValue(plan.numberOfInstallments));
    return Math.max(0, (installmentTotal(plan) - numberValue(plan.downPayment)) / count);
}

function addMonthsLocal(dateString, months) {
    const [y,m,d] = String(dateString).split("-").map(Number);
    if (!y || !m || !d) return dateString;
    const date = new Date(y, m - 1 + Number(months || 0), 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(d, lastDay));
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

function openInstallmentModal(editId = null) {
    const modal = $("installmentModal");
    const form = $("installmentForm");
    if (!modal || !form) return;
    form.reset();
    $("installmentEditId").value = editId || "";
    $("installmentFirstDueDate").value = today();
    $("installmentMarkup").value = "0";
    $("installmentDownPayment").value = "0";
    $("installmentCount").value = "12";
    $("installmentMonthly").value = "";
    const plan = editId ? data.installments.find(item => item.id === editId) : null;
    if (plan) {
        $("installmentItem").value = plan.item;
        $("installmentTotalPrice").value = plan.totalPrice;
        $("installmentDownPayment").value = plan.downPayment || 0;
        $("installmentCount").value = plan.numberOfInstallments;
        $("installmentMonthly").value = plan.monthlyAmount || "";
        $("installmentFirstDueDate").value = plan.firstDueDate;
        $("installmentMarkup").value = plan.markupPercent || 0;
        $("installmentNote").value = plan.note || "";
    }
    const title = modal.querySelector(".modal-header h2");
    const submit = form.querySelector("button[type=submit]");
    if (title) title.textContent = plan ? "Edit Installment Plan" : "Add Installment Plan";
    if (submit) submit.textContent = plan ? "Save Changes" : "Save Installment Plan";
    modal.classList.add("show");
    updateInstallmentPreview();
}
window.openInstallmentModal = openInstallmentModal;

function updateInstallmentPreview() {
    const total = numberValue($("installmentTotalPrice")?.value);
    const down = numberValue($("installmentDownPayment")?.value);
    const markup = numberValue($("installmentMarkup")?.value);
    const count = Math.max(1, numberValue($("installmentCount")?.value));
    const payable = total + total * markup / 100;
    const monthly = Math.max(0, (payable - down) / count);
    if ($("installmentMonthlyPreview")) $("installmentMonthlyPreview").textContent = money(monthly);
    if ($("installmentPayablePreview")) $("installmentPayablePreview").textContent = money(payable);
}

function saveInstallmentPlan(event) {
    event.preventDefault();
    const id = $("installmentEditId").value || null;
    const item = $("installmentItem").value.trim();
    const totalPrice = numberValue($("installmentTotalPrice").value);
    const downPayment = numberValue($("installmentDownPayment").value);
    const numberOfInstallments = Math.floor(numberValue($("installmentCount").value));
    const firstDueDate = $("installmentFirstDueDate").value;
    const markupPercent = numberValue($("installmentMarkup").value);
    const monthlyAmount = numberValue($("installmentMonthly").value) || Math.max(0, (totalPrice + totalPrice * markupPercent / 100 - downPayment) / Math.max(1, numberOfInstallments));
    const note = $("installmentNote").value.trim();
    if (!item || totalPrice <= 0 || numberOfInstallments <= 0 || !firstDueDate) return showToast("Please complete the installment details.");
    if (downPayment < 0 || downPayment > totalPrice + totalPrice * markupPercent / 100) return showToast("Down payment is not valid.");
    if (id) {
        const plan = data.installments.find(x => x.id === id);
        if (plan) Object.assign(plan, {item,totalPrice,downPayment,numberOfInstallments,firstDueDate,markupPercent,monthlyAmount,note});
        showToast("Installment plan updated.");
    } else {
        data.installments.push({id:uniqueId("inst"),item,totalPrice,downPayment,numberOfInstallments,firstDueDate,markupPercent,monthlyAmount,note,payments:[],createdAt:new Date().toISOString()});
        showToast("Installment plan added.");
    }
    saveData(); closeModal("installmentModal"); updateAll();
}

function openInstallmentPaymentModal(planId) {
    const plan = data.installments.find(x => x.id === planId);
    if (!plan) return;
    if (installmentRemaining(plan) <= 0) return showToast("This installment plan is already fully paid.");
    $("paymentPlanId").value = planId;
    $("paymentAmount").value = Math.min(installmentMonthly(plan), installmentRemaining(plan)).toFixed(2).replace(/\.00$/,"");
    $("paymentDate").value = today();
    $("paymentNote").value = "";
    $("paymentPlanName").textContent = plan.item;
    $("paymentRemaining").textContent = money(installmentRemaining(plan));
    $("installmentPaymentModal").classList.add("show");
}
window.openInstallmentPaymentModal = openInstallmentPaymentModal;

function saveInstallmentPayment(event) {
    event.preventDefault();
    const planId = $("paymentPlanId").value;
    const plan = data.installments.find(x => x.id === planId);
    if (!plan) return;
    const amount = numberValue($("paymentAmount").value);
    const date = $("paymentDate").value;
    const note = $("paymentNote").value.trim();
    if (amount <= 0 || !date) return showToast("Enter a valid payment amount and date.");
    if (amount > installmentRemaining(plan) + 0.01) return showToast("Payment cannot exceed the remaining balance.");
    const duplicate = (plan.payments || []).find(p => p.amount === amount && p.date === date && p.note === note);
    if (duplicate) return showToast("This payment entry already exists.");
    const transactionId = uniqueId("insttxn");
    plan.payments = Array.isArray(plan.payments) ? plan.payments : [];
    plan.payments.push({id:uniqueId("pay"),amount,date,note,transactionId,createdAt:new Date().toISOString()});
    data.transactions.push({id:transactionId,type:"expense",category:"Installment",title:`${plan.item} — Installment Payment`,amount,date,source:"installment",installmentId:plan.id,paymentId:plan.payments.at(-1).id,createdAt:new Date().toISOString()});
    saveData(); closeModal("installmentPaymentModal"); updateAll(); showToast("Installment payment recorded and added to Expenses.");
}

function deleteInstallmentPayment(planId, paymentId) {
    const plan = data.installments.find(x => x.id === planId);
    if (!plan) return;
    const payment = (plan.payments || []).find(x => x.id === paymentId);
    if (!payment) return;
    if (!confirm(`Delete the payment of ${money(payment.amount)}? The linked expense will also be removed.`)) return;
    plan.payments = plan.payments.filter(x => x.id !== paymentId);
    data.transactions = data.transactions.filter(t => t.id !== payment.transactionId);
    saveData(); updateAll(); showToast("Installment payment deleted and reversed.");
}
window.deleteInstallmentPayment = deleteInstallmentPayment;

function deleteInstallmentPlan(id) {
    const plan = data.installments.find(x => x.id === id);
    if (!plan) return;
    if (!confirm(`Delete ${plan.item}? All linked installment payment expenses will also be removed.`)) return;
    const linked = new Set((plan.payments || []).map(p => p.transactionId));
    data.transactions = data.transactions.filter(t => !linked.has(t.id));
    data.installments = data.installments.filter(x => x.id !== id);
    saveData(); updateAll(); showToast("Installment plan deleted.");
}
window.deleteInstallmentPlan = deleteInstallmentPlan;

function renderInstallments() {
    const list = $("installmentList");
    if (!list) return;
    const plans = [...data.installments];
    const active = plans.filter(p => installmentRemaining(p) > 0);
    const monthly = active.reduce((sum,p) => sum + Math.min(installmentMonthly(p), installmentRemaining(p)),0);
    const remaining = active.reduce((sum,p) => sum + installmentRemaining(p),0);
    if ($("installmentActiveCount")) $("installmentActiveCount").textContent = active.length;
    if ($("installmentMonthlyTotal")) $("installmentMonthlyTotal").textContent = money(monthly);
    if ($("installmentRemainingTotal")) $("installmentRemainingTotal").textContent = money(remaining);
    let next = null;
    active.forEach(p => {
        const paidCount = (p.payments || []).length;
        const due = addMonthsLocal(p.firstDueDate, paidCount);
        if (!next || due < next) next = due;
    });
    if ($("installmentNextDue")) $("installmentNextDue").textContent = next ? formatDate(next) : "—";
    if (!plans.length) { list.innerHTML = `<div class="empty">No installment plans yet. Add your first purchase plan above.</div>`; return; }
    list.innerHTML = plans.map(plan => {
        const paid = installmentPaid(plan), remainingBal = installmentRemaining(plan), total = installmentTotal(plan), paidCount=(plan.payments||[]).length;
        const percent = total ? Math.min(100, ((numberValue(plan.downPayment)+paid)/total)*100) : 0;
        const payments = [...(plan.payments||[])].sort((a,b)=>b.date.localeCompare(a.date));
        return `<div class="installment-card">
            <div class="installment-card-head"><div><span class="small-label">PURCHASE PLAN</span><h3>${escapeHTML(plan.item)}</h3><p>${numberValue(plan.markupPercent)}% markup · ${plan.numberOfInstallments} installments</p></div><div class="installment-actions"><button class="text-btn" onclick="openInstallmentModal('${plan.id}')">Edit</button><button class="delete-btn" onclick="deleteInstallmentPlan('${plan.id}')">Delete</button></div></div>
            <div class="installment-metrics"><div><span>Total Payable</span><strong>${money(total)}</strong></div><div><span>Paid</span><strong class="amount-income">${money(numberValue(plan.downPayment)+paid)}</strong></div><div><span>Remaining</span><strong class="amount-expense">${money(remainingBal)}</strong></div><div><span>Payments</span><strong>${paidCount}/${plan.numberOfInstallments}</strong></div></div>
            <div class="installment-progress"><span style="width:${percent}%"></span></div>
            <div class="installment-meta"><span>Next due: <b>${remainingBal>0?formatDate(addMonthsLocal(plan.firstDueDate,paidCount)):"Completed"}</b></span><span>Monthly: <b>${money(installmentMonthly(plan))}</b></span><button class="primary-btn" onclick="openInstallmentPaymentModal('${plan.id}')" ${remainingBal<=0?'disabled':''}>+ Add Payment</button></div>
            <div class="installment-payments">${payments.length?payments.map(p=>`<div class="installment-payment-row"><div><strong>${formatDate(p.date)}</strong><small>${escapeHTML(p.note||"Installment payment")}</small></div><b>${money(p.amount)}</b><button class="delete-btn" onclick="deleteInstallmentPayment('${plan.id}','${p.id}')">Delete</button></div>`).join(""):`<div class="empty">No payments recorded yet.</div>`}</div>
        </div>`;
    }).join("");
}
window.renderInstallments = renderInstallments;

/* =========================================================
   EXPORT / BACKUP
========================================================= */
function downloadFile(filename, content, type) {
    const blob = new Blob([content], {type});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportBackup() {
    downloadFile(`finance-assistant-backup-${today()}.json`, JSON.stringify(data,null,2), "application/json");
    showToast("Backup exported successfully.");
}
function exportTransactionsCSV() {
    const rows = [["Date","Type","Category","Title","Amount","Source"], ...data.transactions.map(t=>[t.date,t.type,t.category,t.title,t.amount,t.source||"manual"])];
    const csv = rows.map(row=>row.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n");
    downloadFile(`transactions-${today()}.csv`, csv, "text/csv;charset=utf-8");
    showToast("Transactions exported successfully.");
}
window.exportBackup = exportBackup;
window.exportTransactionsCSV = exportTransactionsCSV;

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

    renderInstallments();

    ensureWithdrawalModal();
    populateWithdrawalCards();
    renderCashWithdrawals();

}


/* =========================================================
   INITIALIZATION
========================================================= */

function init() {

    $("installmentForm")?.addEventListener("submit", saveInstallmentPlan);
    $("installmentPaymentForm")?.addEventListener("submit", saveInstallmentPayment);
    ["installmentTotalPrice","installmentDownPayment","installmentCount","installmentMarkup"].forEach(id => $(id)?.addEventListener("input", updateInstallmentPreview));

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