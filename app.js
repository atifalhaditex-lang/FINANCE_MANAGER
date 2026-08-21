/* =========================================================
   FINANCE MANAGER
   COMPLETE APP.JS
========================================================= */

"use strict";


/* =========================================================
   STORAGE
========================================================= */

const STORAGE_KEY = "financeManagerData_v1";
const SUPABASE_URL = "https://cdnxkqjklzcteuojayll.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_m4gpy-uVfv8Hpld7wfo_Xw_Vh8wUeIO";
const PRODUCTION_APP_URL = "https://atifalhaditex-lang.github.io/FINANCE_MANAGER/";

const defaultData = {
    transactions: [],
    loans: [],
    committees: [],
    creditCards: [],
    cashWithdrawals: [],
    creditPurchases: [],
    installments: []
};

let data = structuredClone(defaultData);
let currentUser = null;
let currentProfile = null;
let remoteSaveTimer = null;
let isLoadingAccountData = false;


function validateSupabasePublicKeySafety() {
    const key = String(SUPABASE_PUBLISHABLE_KEY || "");
    if (/service[_-]?role/i.test(key) || key.startsWith("sb_secret_")) {
        throw new Error("Unsafe Supabase secret key detected in browser code.");
    }
validateSupabasePublicKeySafety();

}

const supabaseClient =
    window.supabase?.createClient
        ? window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_PUBLISHABLE_KEY,
            {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true
                }
            }
        )
        : null;

function normalizeFinanceData(parsed) {
    const source = parsed && typeof parsed === "object" ? parsed : {};
    const dedupe = value => {
        if (!Array.isArray(value)) return [];
        const seen = new Set();
        return value.filter(item => {
            if (!item || typeof item !== "object") return false;
            const key = item.id || JSON.stringify(item);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    };
    return {
        transactions: dedupe(source.transactions),
        loans: dedupe(source.loans),
        committees: dedupe(source.committees),
        creditCards: dedupe(source.creditCards),
        cashWithdrawals: dedupe(source.cashWithdrawals),
        creditPurchases: dedupe(source.creditPurchases),
        installments: dedupe(source.installments)
    };
}

function userStorageKey(userId) {
    return `financeAssistantUser_${userId}`;
}

function loadLocalUserCache(userId) {
    try {
        const saved = localStorage.getItem(userStorageKey(userId));
        return saved ? normalizeFinanceData(JSON.parse(saved)) : null;
    } catch (error) {
        console.warn("Could not read local user cache:", error);
        return null;
    }
}

function isFinanceDataEmpty(value) {
    const normalized = normalizeFinanceData(value);
    return Object.values(normalized).every(list => Array.isArray(list) && list.length === 0);
}

function setCloudStatus(text, state = "idle") {
    const label = $("cloudSyncText");
    const holder = $("cloudSyncStatus");
    if (label) label.textContent = text;
    if (holder) {
        holder.dataset.state = state;
        holder.setAttribute("aria-label", text);
        if (state === "saved") {
            holder.title = `Last secure sync: ${new Date().toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}`;
        }
    }
}

async function syncFinanceDataNow() {
    if (!supabaseClient || !currentUser?.id || isLoadingAccountData) return;

    try {
        setCloudStatus("Saving securely…", "saving");

        const { error } = await supabaseClient
            .from("finance_data")
            .upsert(
                {
                    user_id: currentUser.id,
                    data
                },
                { onConflict: "user_id" }
            );

        if (error) throw error;

        setCloudStatus("Securely synced", "saved");
    } catch (error) {
        console.error("Cloud save failed:", error);
        setCloudStatus("Offline — not synced", "error");
    }
}

function queueRemoteSave() {
    if (!currentUser || isLoadingAccountData) return;
    clearTimeout(remoteSaveTimer);
    remoteSaveTimer = setTimeout(syncFinanceDataNow, 650);
}

function saveData() {
    if (!currentUser) return;

    try {
        localStorage.setItem(
            userStorageKey(currentUser.id),
            JSON.stringify(data)
        );
        queueRemoteSave();
    } catch (error) {
        console.error("Could not save finance data:", error);
        showToast("Could not save local data.");
    }
}

async function loadAccountFinanceData(user) {
    if (!supabaseClient || !user) return;

    isLoadingAccountData = true;
    setCloudStatus("Loading private data…", "saving");

    try {
        const { data: row, error } = await supabaseClient
            .from("finance_data")
            .select("data")
            .eq("user_id", user.id)
            .maybeSingle();

        if (error) throw error;

        const hasRemoteRow = Boolean(row);

        // STRICT ACCOUNT ISOLATION:
        // Never copy browser-cached data into a different/new account.
        // Existing accounts load only their own Supabase row.
        // New accounts always start empty.
        data = hasRemoteRow
            ? normalizeFinanceData(row.data)
            : structuredClone(defaultData);

        localStorage.setItem(userStorageKey(user.id), JSON.stringify(data));

        isLoadingAccountData = false;
        updateAll();

        // Create this user's own empty/private cloud row when needed.
        await syncFinanceDataNow();
        setCloudStatus("Securely synced", "saved");
    } catch (error) {
        console.error("Could not load account finance data:", error);
        const cached = loadLocalUserCache(user.id);
        data = cached || structuredClone(defaultData);
        isLoadingAccountData = false;
        updateAll();
        setCloudStatus("Offline — local cache only", "error");
        showToast("Cloud data could not load. Using this device's saved copy.");
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
    if (!dateString) return "-";
    const [year, month, day] = String(dateString).slice(0,10).split("-").map(Number);
    if (!year || !month || !day) return String(dateString);
    const date = new Date(year, month - 1, day, 12, 0, 0);
    if (Number.isNaN(date.getTime())) return String(dateString);
    return date.toLocaleDateString("en-PK", {day:"2-digit", month:"short", year:"numeric"});
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

            const isActive = button.dataset.section === sectionId;
            button.classList.toggle("active", isActive);
            if (isActive) button.setAttribute("aria-current","page");
            else button.removeAttribute("aria-current");

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


    // Each tool behaves like a real app page: switch first, then start at the top.
    window.scrollTo(0, 0);


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



let activeModalTrigger = null;

function getModalFocusable(modal) {
    return [...modal.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    )].filter(el => el.offsetParent !== null);
}

function enhanceModalAccessibility(modal) {
    if (!modal) return;
    modal.setAttribute("aria-hidden", modal.classList.contains("show") ? "false" : "true");
    const box = modal.querySelector(".modal-box");
    if (box) {
        if (!box.hasAttribute("role")) box.setAttribute("role", "dialog");
        box.setAttribute("aria-modal", "true");
        if (!box.hasAttribute("tabindex")) box.setAttribute("tabindex", "-1");

        const heading = box.querySelector("h2");
        if (heading && !heading.id) heading.id = `${modal.id}Title`;
        if (heading && !box.hasAttribute("aria-labelledby")) {
            box.setAttribute("aria-labelledby", heading.id);
        }

        const description = box.querySelector(".modal-header p");
        if (description && !description.id) description.id = `${modal.id}Description`;
        if (description && !box.hasAttribute("aria-describedby")) {
            box.setAttribute("aria-describedby", description.id);
        }
    }
    modal.querySelectorAll(".close-btn").forEach(btn => {
        if (!btn.getAttribute("aria-label")) btn.setAttribute("aria-label", "Close dialog");
    });
}


/* =========================================================
   MODALS
========================================================= */

function openModal(id) {
    const modal = $(id);
    if (!modal) return;

    activeModalTrigger = document.activeElement;
    enhanceModalAccessibility(modal);
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    if (id === "transactionModal" && !editingTransactionId) {
        setDefaultTransactionForm();
        const modalTitle = document.querySelector("#transactionModal .modal-header h2");
        const submitButton = document.querySelector("#transactionForm button[type=submit]");
        if (modalTitle) modalTitle.textContent = "Add Transaction";
        if (submitButton) submitButton.textContent = "Add Transaction";
    }

    if (id === "loanModal") setDefaultLoanForm();
    if (id === "committeeModal") setDefaultCommitteeForm();

    requestAnimationFrame(() => {
        const first = getModalFocusable(modal)[0];
        (first || modal.querySelector(".modal-box"))?.focus();
    });
}

function closeModal(id) {
    const modal = $(id);
    if (!modal) return;

    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");

    if (id === "transactionModal") {
        editingTransactionId = null;
        const modalTitle = document.querySelector("#transactionModal .modal-header h2");
        const submitButton = document.querySelector("#transactionForm button[type=submit]");
        if (modalTitle) modalTitle.textContent = "Add Transaction";
        if (submitButton) submitButton.textContent = "Add Transaction";
    }
    if (id === "loanModal") {
        editingLoanId = null;
        const title = document.querySelector("#loanModal .modal-header h2");
        const submit = document.querySelector("#loanForm button[type=submit]");
        if (title) title.textContent = "Add Loan / Udhaar";
        if (submit) submit.textContent = "Add Loan";
    }
    if (id === "committeeModal") {
        editingCommitteeId = null;
        const title = document.querySelector("#committeeModal .modal-header h2");
        const submit = document.querySelector("#committeeForm button[type=submit]");
        if (title) title.textContent = "Add Committee";
        if (submit) submit.textContent = "Add Committee";
    }

    const previous = activeModalTrigger;
    activeModalTrigger = null;
    requestAnimationFrame(() => previous?.focus?.());
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
    if (transaction.source) {
        const sourceNames={installment:"Installments",committee:"Committee","credit-withdrawal":"Credit Card","credit-purchase":"Credit Card"};
        showToast(`Edit this linked record from ${sourceNames[transaction.source] || "its source section"} so balances stay synchronized.`);
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
        setFieldError($("transactionTitle"),"Enter a title for this transaction.");
        showToast("Please enter transaction title.");
        $("transactionTitle")?.focus();
        return;
    }
    clearFieldError($("transactionTitle"));


    if (amount <= 0) {
        setFieldError($("transactionAmount"),"Amount must be greater than zero.");
        showToast("Please enter a valid amount.");
        $("transactionAmount")?.focus();
        return;
    }
    clearFieldError($("transactionAmount"));


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

                            <button class="text-btn" onclick="printFinanceRecord('transaction','${transaction.id}')">Report</button><button class="text-btn" onclick="openTransactionForEdit('${transaction.id}')">Edit</button>
                            <button class="delete-btn" onclick="deleteTransaction('${transaction.id}')">Delete</button>

                        </td>

                    </tr>

                `).join("")}

            </tbody>

        </table>

    `;

}


async function deleteTransaction(id) {

    const transaction =
        data.transactions.find(
            item => item.id === id
        );


    if (!transaction) {

        return;

    }

    if (transaction.source) {
        const sourceNames={installment:"Installments",committee:"Committee","credit-withdrawal":"Credit Card","credit-purchase":"Credit Card"};
        showToast(`Delete this linked record from ${sourceNames[transaction.source] || "its source section"} so balances stay synchronized.`);
        return;
    }


    const confirmed=await confirmAction(`Delete "${transaction.title}"?`,{title:"Delete transaction",confirmText:"Delete"}); if(!confirmed) return;


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
    if (period === "all") return [...data.transactions];
    const months = Number(period) || 0;
    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth() - months, now.getDate(), 12);
    const cutoffNumber = cutoff.getFullYear()*10000 + (cutoff.getMonth()+1)*100 + cutoff.getDate();
    return data.transactions.filter(transaction => dateNumber(transaction.date) >= cutoffNumber);
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

                            <button class="text-btn report-btn" onclick="printFinanceRecord('loan','${loan.id}')">View Report</button><button class="text-btn" onclick="openLoanForEdit('${loan.id}')">Edit</button>
                            <button class="delete-btn" onclick="deleteLoan('${loan.id}')">Delete</button>

                        </td>

                    </tr>

                `).join("")}

            </tbody>

        </table>

    `;

}


async function deleteLoan(id) {

    if(!(await confirmAction("Delete this loan record?",{title:"Delete loan",confirmText:"Delete"}))) return;


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

                            <button class="text-btn report-btn" onclick="printFinanceRecord('committee','${committee.id}')">View Report</button><button class="text-btn" onclick="openCommitteeForEdit('${committee.id}')">Edit</button>
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


async function deleteCommittee(id) {

    if(!(await confirmAction("Delete this committee and its linked payment transactions?",{title:"Delete committee",confirmText:"Delete"}))) return;


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
   CREDIT CARD PURCHASES — no cash withdrawal fee
========================================================= */
function populatePurchaseCards() {
    const select = $("purchaseCard");
    if (!select) return;
    const current = select.value;
    select.innerHTML = data.creditCards.length
        ? data.creditCards.map(card =>
            `<option value="${card.id}">${escapeHTML(card.name)} — ${money(Math.max(numberValue(card.limit)-numberValue(card.used),0))} available</option>`
          ).join("")
        : `<option value="">No credit card available</option>`;
    if (data.creditCards.some(card => card.id === current)) select.value = current;

    const category = $("purchaseCategory");
    if (category && !category.options.length) {
        category.innerHTML = expenseCategories
            .map((item,index) => `<option value="${escapeHTML(item)}"${index === 0 ? " selected" : ""}>${escapeHTML(item)}</option>`)
            .join("");
    }
}

function openCreditPurchaseModal() {
    if (!data.creditCards.length) {
        showToast("Add a credit card first.");
        return;
    }
    populatePurchaseCards();
    if ($("purchaseDate")) $("purchaseDate").value = today();
    $("creditPurchaseForm")?.reset();
    populatePurchaseCards();
    if ($("purchaseDate")) $("purchaseDate").value = today();
    openModal("creditPurchaseModal");
}
window.openCreditPurchaseModal = openCreditPurchaseModal;

function saveCreditPurchase(event) {
    event.preventDefault();
    const cardId = $("purchaseCard")?.value;
    const card = data.creditCards.find(item => item.id === cardId);
    const amount = numberValue($("purchaseAmount")?.value);
    const date = $("purchaseDate")?.value;
    const title = ($("purchaseTitle")?.value || "").trim();
    const category = $("purchaseCategory")?.value || "Shopping";

    let valid = true;
    if (!card) {
        setFieldError($("purchaseCard"), "Select a credit card.");
        valid = false;
    } else clearFieldError($("purchaseCard"));

    if (amount <= 0) {
        setFieldError($("purchaseAmount"), "Purchase amount must be greater than zero.");
        valid = false;
    } else clearFieldError($("purchaseAmount"));

    if (!date) {
        setFieldError($("purchaseDate"), "Select the purchase date.");
        valid = false;
    } else clearFieldError($("purchaseDate"));

    if (!title) {
        setFieldError($("purchaseTitle"), "Enter the purchase description.");
        valid = false;
    } else clearFieldError($("purchaseTitle"));

    if (!valid) {
        showToast("Please correct the highlighted purchase fields.");
        document.querySelector('#creditPurchaseForm [aria-invalid="true"]')?.focus();
        return;
    }

    const available = Math.max(numberValue(card.limit) - numberValue(card.used), 0);
    if (amount > available) {
        setFieldError($("purchaseAmount"), `Available credit is ${money(available)}.`);
        $("purchaseAmount")?.focus();
        showToast("Purchase exceeds available credit.");
        return;
    }

    const purchaseId = uniqueId("ccpurchase");
    const transactionId = uniqueId("cctxn");

    card.used = numberValue(card.used) + amount;
    data.creditPurchases = Array.isArray(data.creditPurchases) ? data.creditPurchases : [];
    data.creditPurchases.push({
        id: purchaseId,
        cardId: card.id,
        cardName: card.name,
        amount,
        date,
        title,
        category,
        transactionId,
        createdAt: new Date().toISOString()
    });

    data.transactions.push({
        id: transactionId,
        type: "expense",
        category,
        title: `${title} — ${card.name}`,
        amount,
        date,
        source: "credit-purchase",
        purchaseId,
        cardId: card.id,
        createdAt: new Date().toISOString()
    });

    saveData();
    closeModal("creditPurchaseModal");
    updateAll();
    showToast("Card purchase recorded as an expense. No withdrawal fee applied.");
}

async function deleteCreditPurchase(id) {
    const purchase = (data.creditPurchases || []).find(item => item.id === id);
    if (!purchase) return;

    if (!(await confirmAction(
        `Delete "${purchase.title}" and reverse ${money(purchase.amount)} from card usage?`,
        { title: "Delete card purchase", confirmText: "Delete" }
    ))) return;

    const card = data.creditCards.find(item => item.id === purchase.cardId);
    if (card) card.used = Math.max(numberValue(card.used) - numberValue(purchase.amount), 0);

    data.transactions = data.transactions.filter(item => item.id !== purchase.transactionId);
    data.creditPurchases = data.creditPurchases.filter(item => item.id !== id);

    saveData();
    updateAll();
    showToast("Card purchase deleted and reversed.");
}
window.deleteCreditPurchase = deleteCreditPurchase;

function renderCreditPurchases() {
    const container = $("creditPurchaseList");
    if (!container) return;
    const purchases = [...(data.creditPurchases || [])].sort((a,b) => dateNumber(b.date)-dateNumber(a.date));
    if (!purchases.length) {
        container.innerHTML = `<div class="empty">No card purchases recorded yet.</div>`;
        return;
    }
    container.innerHTML = `
        <div class="table-wrap">
            <table>
                <thead><tr><th>Date</th><th>Card</th><th>Purchase</th><th>Category</th><th>Amount</th><th>Action</th></tr></thead>
                <tbody>
                    ${purchases.map(p => `
                        <tr>
                            <td>${formatDate(p.date)}</td>
                            <td>${escapeHTML(p.cardName || "")}</td>
                            <td>${escapeHTML(p.title)}</td>
                            <td>${escapeHTML(p.category || "Shopping")}</td>
                            <td class="amount-expense">${money(p.amount)}</td>
                            <td><button type="button" class="delete-btn" onclick="deleteCreditPurchase('${p.id}')">Delete</button></td>
                        </tr>`).join("")}
                </tbody>
            </table>
        </div>`;
}


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
        setFieldError($("creditName"), "Enter a card name.");
        showToast("Please enter card name.");
        $("creditName")?.focus();
        return;
    }
    clearFieldError($("creditName"));


    if (limit <= 0) {
        setFieldError($("creditLimit"), "Credit limit must be greater than zero.");
        showToast("Please enter a valid credit limit.");
        $("creditLimit")?.focus();
        return;
    }
    clearFieldError($("creditLimit"));


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


$("creditForm")?.addEventListener("submit", addCreditCard);
$("creditPurchaseForm")?.addEventListener("submit", saveCreditPurchase);


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
    modal.setAttribute("aria-hidden", "true");

    modal.innerHTML = `
        <div class="modal-box" role="dialog" aria-modal="true"
             aria-labelledby="cashWithdrawalModalTitle"
             aria-describedby="cashWithdrawalModalDescription"
             tabindex="-1">
            <div class="modal-header">
                <div>
                    <h2 id="cashWithdrawalModalTitle">Cash Withdrawal</h2>
                    <p id="cashWithdrawalModalDescription">Withdraw cash from your credit card. A 2% charge applies.</p>
                </div>
                <button type="button" class="close-btn" aria-label="Close cash withdrawal form" onclick="closeModal('cashWithdrawalModal')">×</button>
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
    enhanceModalAccessibility(modal);

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
        setFieldError($("withdrawalCard"), "Select a credit card.");
        showToast("Please select a credit card.");
        $("withdrawalCard")?.focus();
        return;
    }
    clearFieldError($("withdrawalCard"));

    if (amount <= 0) {
        setFieldError($("withdrawalAmount"), "Withdrawal amount must be greater than zero.");
        showToast("Please enter a valid withdrawal amount.");
        $("withdrawalAmount")?.focus();
        return;
    }
    clearFieldError($("withdrawalAmount"));

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

async function deleteCashWithdrawal(id) {
    const withdrawal = data.cashWithdrawals.find(item => item.id === id);
    if (!withdrawal) return;

    if(!(await confirmAction("Delete this cash withdrawal, reverse the card usage and remove its linked fee transaction?",{title:"Delete cash withdrawal",confirmText:"Delete"}))) return;

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


async function deleteCreditCard(id) {

    if (!(await confirmAction(
        "Delete this credit card and all linked purchases, cash withdrawals and linked expense records?",
        { title: "Delete credit card", confirmText: "Delete" }
    ))) return;


    const removedPurchaseIds = new Set(
        (data.creditPurchases || []).filter(item => item.cardId === id).map(item => item.transactionId)
    );
    data.creditPurchases = (data.creditPurchases || []).filter(item => item.cardId !== id);
    data.transactions = data.transactions.filter(transaction => !removedPurchaseIds.has(transaction.id));

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
    return (Array.isArray(plan.payments) ? plan.payments : [])
        .reduce((sum, payment) => sum + numberValue(payment.amount), 0);
}

function installmentHistoricalCount(plan) {
    const totalCount = Math.max(0, Math.floor(numberValue(plan.numberOfInstallments)));
    return Math.min(
        totalCount,
        Math.max(0, Math.floor(numberValue(plan.historicalPaidCount)))
    );
}

function installmentHistoricalPaid(plan) {
    const payableAfterDown = Math.max(
        0,
        installmentTotal(plan) - numberValue(plan.downPayment)
    );
    return Math.min(
        payableAfterDown,
        installmentMonthly(plan) * installmentHistoricalCount(plan)
    );
}

function installmentRemaining(plan) {
    return Math.max(
        0,
        installmentTotal(plan)
            - numberValue(plan.downPayment)
            - installmentHistoricalPaid(plan)
            - installmentPaid(plan)
    );
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

    if (!modal || !form) {
        console.error("Installment modal or form is missing.");
        showToast("Installment form could not be opened.");
        return;
    }

    // Open the dialog FIRST. This prevents any data/form issue from making
    // the button look completely dead.
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    try {
        activeModalTrigger = document.activeElement;
        enhanceModalAccessibility(modal);

        form.reset();

        const safeInstallments = Array.isArray(data?.installments)
            ? data.installments
            : [];

        const plan = editId
            ? safeInstallments.find(item => item?.id === editId)
            : null;

        const setValue = (id, value) => {
            const el = $(id);
            if (el) el.value = value ?? "";
        };

        setValue("installmentEditId", editId || "");
        setValue("installmentFirstDueDate", today());
        setValue("installmentMarkup", "0");
        setValue("installmentDownPayment", "0");
        setValue("installmentCount", "12");
        setValue("installmentMonthly", "");
        setValue("installmentHistoricalCount", "0");

        if (plan) {
            setValue("installmentItem", plan.item);
            setValue("installmentTotalPrice", plan.totalPrice);
            setValue("installmentDownPayment", plan.downPayment || 0);
            setValue("installmentCount", plan.numberOfInstallments || 12);
            setValue("installmentMonthly", plan.monthlyAmount || "");
            setValue("installmentFirstDueDate", plan.firstDueDate || today());
            setValue("installmentMarkup", plan.markupPercent || 0);
            setValue("installmentHistoricalCount", installmentHistoricalCount(plan));
            setValue("installmentNote", plan.note || "");
        }

        const title = modal.querySelector(".modal-header h2");
        const submit = form.querySelector('button[type="submit"]');

        if (title) {
            title.textContent = plan
                ? "Edit Installment Plan"
                : "Add Installment Plan";
        }

        if (submit) {
            submit.textContent = plan
                ? "Save Changes"
                : "Save Installment Plan";
        }

        updateInstallmentPreview();

        requestAnimationFrame(() => {
            $("installmentItem")?.focus();
        });
    } catch (error) {
        console.error("Installment form setup failed:", error);
        // Keep modal open even if prefill fails.
        showToast("Installment form opened. Some saved values could not be loaded.");
    }
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
    const historicalPaidCount = Math.max(0, Math.floor(numberValue($("installmentHistoricalCount")?.value)));
    const note = $("installmentNote").value.trim();
    if (!item || totalPrice <= 0 || numberOfInstallments <= 0 || !firstDueDate) return showToast("Please complete the installment details.");
    if (downPayment < 0 || downPayment > totalPrice + totalPrice * markupPercent / 100) return showToast("Down payment is not valid.");
    if (historicalPaidCount > numberOfInstallments) {
        setFieldError($("installmentHistoricalCount"), "Already-paid installments cannot exceed the total installments.");
        $("installmentHistoricalCount")?.focus();
        return showToast("Check the number of installments already paid.");
    }
    clearFieldError($("installmentHistoricalCount"));
    if (id) {
        const plan = data.installments.find(x => x.id === id);
        if (plan) Object.assign(plan, {item,totalPrice,downPayment,numberOfInstallments,firstDueDate,markupPercent,monthlyAmount,historicalPaidCount,note});
        showToast("Installment plan updated.");
    } else {
        data.installments.push({id:uniqueId("inst"),item,totalPrice,downPayment,numberOfInstallments,firstDueDate,markupPercent,monthlyAmount,historicalPaidCount,note,payments:[],createdAt:new Date().toISOString()});
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
    openModal("installmentPaymentModal");
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
    if (amount <= 0) {
        setFieldError($("paymentAmount"), "Payment amount must be greater than zero.");
        $("paymentAmount")?.focus();
        return showToast("Enter a valid payment amount.");
    }
    clearFieldError($("paymentAmount"));
    if (!date) {
        setFieldError($("paymentDate"), "Select the payment date.");
        $("paymentDate")?.focus();
        return showToast("Select a payment date.");
    }
    clearFieldError($("paymentDate"));
    if (amount > installmentRemaining(plan) + 0.01) return showToast("Payment cannot exceed the remaining balance.");
    const duplicate = (plan.payments || []).find(p => p.amount === amount && p.date === date && p.note === note);
    if (duplicate) return showToast("This payment entry already exists.");
    const transactionId = uniqueId("insttxn");
    plan.payments = Array.isArray(plan.payments) ? plan.payments : [];
    plan.payments.push({id:uniqueId("pay"),amount,date,note,transactionId,createdAt:new Date().toISOString()});
    data.transactions.push({id:transactionId,type:"expense",category:"Installment",title:`${plan.item} — Installment Payment`,amount,date,source:"installment",installmentId:plan.id,paymentId:plan.payments.at(-1).id,createdAt:new Date().toISOString()});
    saveData(); closeModal("installmentPaymentModal"); updateAll(); showToast("Installment payment recorded and added to Expenses.");
}

async function deleteInstallmentPayment(planId, paymentId) {
    const plan = data.installments.find(x => x.id === planId);
    if (!plan) return;
    const payment = (plan.payments || []).find(x => x.id === paymentId);
    if (!payment) return;
    if(!(await confirmAction(`Delete the payment of ${money(payment.amount)}? Its linked expense will also be removed.`,{title:"Delete installment payment",confirmText:"Delete"}))) return;
    plan.payments = plan.payments.filter(x => x.id !== paymentId);
    data.transactions = data.transactions.filter(t => t.id !== payment.transactionId);
    saveData(); updateAll(); showToast("Installment payment deleted and reversed.");
}
window.deleteInstallmentPayment = deleteInstallmentPayment;

async function deleteInstallmentPlan(id) {
    const plan = data.installments.find(x => x.id === id);
    if (!plan) return;
    if(!(await confirmAction(`Delete ${plan.item}? All linked installment payment expenses will also be removed.`,{title:"Delete installment plan",confirmText:"Delete"}))) return;
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
        const recordedPayments = Array.isArray(p.payments)
            ? [...p.payments].sort((a,b) => String(a.date || "").localeCompare(String(b.date || "")))
            : [];
        const paidCount = installmentHistoricalCount(p) + recordedPayments.length;
        const due = addMonthsLocal(p.firstDueDate, paidCount);
        if (!next || due < next) next = due;
    });
    if ($("installmentNextDue")) $("installmentNextDue").textContent = next ? formatDate(next) : "—";
    if (!plans.length) { list.innerHTML = `<div class="empty">No installment plans yet. Add your first purchase plan above.</div>`; return; }
    list.innerHTML = plans.map(plan => {
        const paid = installmentPaid(plan);
        const historicalPaid = installmentHistoricalPaid(plan);
        const historicalCount = installmentHistoricalCount(plan);
        const remainingBal = installmentRemaining(plan);
        const total = installmentTotal(plan);
        const recordedCount = Array.isArray(plan.payments) ? plan.payments.length : 0;
        const paidCount = historicalCount + recordedCount;
        const totalPaid = numberValue(plan.downPayment) + historicalPaid + paid;
        const percent = total ? Math.min(100, (totalPaid/total)*100) : 0;
        const payments = [...(plan.payments||[])].sort((a,b)=>b.date.localeCompare(a.date));
        return `<div class="installment-card">
            <div class="installment-card-head"><div><span class="small-label">PURCHASE PLAN</span><h3>${escapeHTML(plan.item)}</h3><p>${numberValue(plan.markupPercent)}% markup · ${plan.numberOfInstallments} installments</p></div><div class="installment-actions"><button class="text-btn report-btn" onclick="printFinanceRecord('installment','${plan.id}')">View Report</button><button class="text-btn" onclick="openInstallmentModal('${plan.id}')">Edit</button><button class="delete-btn" onclick="deleteInstallmentPlan('${plan.id}')">Delete</button></div></div>
            <div class="installment-metrics"><div><span>Total Payable</span><strong>${money(total)}</strong></div><div><span>Paid</span><strong class="amount-income">${money(totalPaid)}</strong></div><div><span>Remaining</span><strong class="amount-expense">${money(remainingBal)}</strong></div><div><span>Payments</span><strong>${paidCount}/${plan.numberOfInstallments}</strong></div></div>
            <div class="installment-progress"><span style="width:${percent}%"></span></div>
            <div class="installment-meta"><span>Next due: <b>${remainingBal>0?formatDate(addMonthsLocal(plan.firstDueDate,paidCount)):"Completed"}</b></span><span>Monthly: <b>${money(installmentMonthly(plan))}</b></span><button class="primary-btn" onclick="openInstallmentPaymentModal('${plan.id}')" ${remainingBal<=0?'disabled':''}>+ Add Payment</button></div>
            <div class="installment-payments">${payments.length?payments.map(p=>`<div class="installment-payment-row"><div><strong>${formatDate(p.date)}</strong><small>${escapeHTML(p.note||"Installment payment")}</small></div><b>${money(p.amount)}</b><button class="delete-btn" onclick="deleteInstallmentPayment('${plan.id}','${p.id}')">Delete</button></div>`).join(""):`<div class="empty">No payments recorded yet.</div>`}</div>
        </div>`;
    }).join("");
}
window.renderInstallments = renderInstallments;


/* =========================================================
   UNIVERSAL RECORD REPORT / PRINT / SAVE PDF
========================================================= */
function reportAccountName(){
    return currentProfile?.full_name || currentUser?.user_metadata?.full_name ||
        currentUser?.email?.split("@")[0] || "Finance Assistant User";
}
function reportLabel(key){
    return String(key).replace(/([A-Z])/g," $1").trimStart().replace(/^./,s=>s.toUpperCase());
}
function reportValue(value){
    if(value===null || value===undefined || value==="") return "—";
    if(typeof value==="number") return String(value);
    if(typeof value==="boolean") return value ? "Yes" : "No";
    return escapeHTML(String(value));
}
function buildGenericRows(obj, skip=[]){
    return Object.entries(obj||{})
      .filter(([k,v])=>!skip.includes(k) && typeof v!=="object")
      .map(([k,v])=>`<tr><th>${escapeHTML(reportLabel(k))}</th><td>${reportValue(v)}</td></tr>`).join("");
}
function printFinanceRecord(type,id){
    let title="Financial Record", subtitle="", rows="", history="";
    if(type==="installment"){
        const p=data.installments.find(x=>x.id===id); if(!p) return;
        title=`Installment Report — ${escapeHTML(p.item)}`;
        subtitle="Complete purchase plan and payment history";
        rows=`
          <tr><th>Total Payable</th><td>${money(installmentTotal(p))}</td></tr>
          <tr><th>Down Payment</th><td>${money(numberValue(p.downPayment))}</td></tr>
          <tr><th>Markup</th><td>${numberValue(p.markupPercent)}%</td></tr>
          <tr><th>Total Installments</th><td>${p.numberOfInstallments}</td></tr>
          <tr><th>Monthly Installment</th><td>${money(installmentMonthly(p))}</td></tr>
          <tr><th>Historical Installments Paid</th><td>${installmentHistoricalCount(p)} (${money(installmentHistoricalPaid(p))})</td></tr>
          <tr><th>Total Paid</th><td>${money(numberValue(p.downPayment)+installmentHistoricalPaid(p)+installmentPaid(p))}</td></tr>
          <tr><th>Remaining</th><td>${money(installmentRemaining(p))}</td></tr>
          <tr><th>First Due Date</th><td>${formatDate(p.firstDueDate)}</td></tr>
          <tr><th>Note</th><td>${escapeHTML(p.note || "-")}</td></tr>`;
        const pays=[...(p.payments||[])].sort((a,b)=>a.date.localeCompare(b.date));
        history=pays.length?`<h3>Payment History</h3><table><thead><tr><th>Date</th><th>Note</th><th>Amount</th></tr></thead><tbody>${pays.map(x=>`<tr><td>${formatDate(x.date)}</td><td>${escapeHTML(x.note||"Installment payment")}</td><td>${money(x.amount)}</td></tr>`).join("")}</tbody></table>`:"<p>No recorded payments.</p>";
    } else if(type==="transaction"){
        const x=data.transactions.find(v=>v.id===id); if(!x) return;
        title=`Transaction Report — ${escapeHTML(x.title||x.category||"Record")}`;
        subtitle="Individual income / expense record";
        rows=buildGenericRows(x,["id","createdAt"]);
    } else if(type==="loan"){
        const x=data.loans.find(v=>v.id===id); if(!x) return;
        title=`Loan Report — ${escapeHTML(x.person||"Record")}`;
        subtitle="Complete loan record";
        rows=buildGenericRows(x,["id","createdAt","payments"]);
        if(Array.isArray(x.payments)&&x.payments.length) history=`<h3>Payment History</h3><table><tbody>${x.payments.map(p=>`<tr><td>${formatDate(p.date)}</td><td>${money(p.amount)}</td></tr>`).join("")}</tbody></table>`;
    } else if(type==="committee"){
        const x=data.committees.find(v=>v.id===id); if(!x) return;
        title=`Committee Report — ${escapeHTML(x.name||"Record")}`;
        subtitle="Committee plan and payment record";
        rows=buildGenericRows(x,["id","createdAt","payments"]);
        if(Array.isArray(x.payments)&&x.payments.length) history=`<h3>Payment History</h3><table><thead><tr><th>Date</th><th>Amount</th></tr></thead><tbody>${x.payments.map(p=>`<tr><td>${formatDate(p.date)}</td><td>${money(p.amount)}</td></tr>`).join("")}</tbody></table>`;
    } else if(type==="credit"){
        const x=data.creditCards.find(v=>v.id===id); if(!x) return;
        title=`Credit Card Report — ${escapeHTML(x.name||x.bank||"Card")}`;
        subtitle="Credit card record";
        rows=buildGenericRows(x,["id","createdAt"]);
    } else return;

    const w=window.open("","_blank","width=900,height=900");
    if(!w){ showToast("Please allow pop-ups to open the report."); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title.replace(/<[^>]+>/g,"")}</title>
    <style>
    *{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#17231e;margin:0;background:#eef4ef}
    .sheet{width:min(820px,calc(100% - 28px));margin:28px auto;background:white;padding:42px;border:1px solid #dfe8e1;border-radius:18px}
    .brand{font-size:11px;letter-spacing:.18em;color:#688173;font-weight:800}.head{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #e7eee9;padding-bottom:22px;margin-bottom:25px}
    h1{font-size:26px;margin:8px 0 5px}h3{margin-top:28px}p{color:#68766e;font-size:12px}.meta{text-align:right;font-size:11px;color:#718078}
    table{width:100%;border-collapse:collapse;margin-top:12px}th,td{padding:11px 10px;border-bottom:1px solid #e8eeea;text-align:left;font-size:12px}th{color:#62746a;width:38%;font-weight:700}
    thead th{background:#f5f8f6}.actions{display:flex;gap:8px;margin:0 auto 28px;width:min(820px,calc(100% - 28px))}
    button{border:0;border-radius:10px;padding:11px 17px;font-weight:700;cursor:pointer;background:#275b46;color:white}.secondary{background:#dfe9e3;color:#27483a}
    .foot{margin-top:34px;padding-top:16px;border-top:1px solid #e5ece7;font-size:10px;color:#87938c}
    @media print{body{background:white}.actions{display:none}.sheet{width:100%;margin:0;border:0;border-radius:0;padding:20mm 16mm}}
    </style></head><body><div class="actions"><button onclick="window.print()">Print / Save PDF</button><button class="secondary" onclick="window.close()">Close</button></div>
    <main class="sheet"><div class="head"><div><div class="brand">FINANCE ASSISTANT</div><h1>${title}</h1><p>${subtitle}</p></div><div class="meta"><b>${escapeHTML(reportAccountName())}</b><br>${escapeHTML(currentUser?.email||"")}<br>Generated: ${new Date().toLocaleString("en-PK")}</div></div>
    <table><tbody>${rows}</tbody></table>${history}<div class="foot">Private financial report generated from the signed-in Finance Assistant account.</div></main></body></html>`);
    w.document.close();
}
window.printFinanceRecord=printFinanceRecord;

/* =========================================================
   EXPORT / BACKUP
========================================================= */
function downloadFile(filename, content, type) {
    const blob = new Blob([content], {type});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function withExportLoading(buttonId, busyText, task) {
    const button = $(buttonId);
    const original = button?.textContent || "";
    if (button) {
        button.disabled = true;
        button.setAttribute("aria-busy","true");
        button.textContent = busyText;
    }
    try {
        await new Promise(resolve => requestAnimationFrame(resolve));
        await task();
    } finally {
        if (button) {
            button.disabled = false;
            button.removeAttribute("aria-busy");
            button.textContent = original;
        }
    }
}
async function exportBackup() {
    await withExportLoading("backupBtn","Preparing…", async () => {
        downloadFile(`finance-assistant-backup-${today()}.json`, JSON.stringify(data,null,2), "application/json");
        showToast("Backup exported successfully.");
    });
}
async function exportTransactionsCSV() {
    await withExportLoading("exportCsvBtn","Preparing…", async () => {
        const rows = [["Date","Type","Category","Title","Amount","Source"], ...data.transactions.map(t=>[t.date,t.type,t.category,t.title,t.amount,t.source||"manual"])];
        const csv = rows.map(row=>row.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n");
        downloadFile(`transactions-${today()}.csv`, csv, "text/csv;charset=utf-8");
        showToast("Transactions exported successfully.");
    });
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


function safeRenderCharts() {
    if (typeof Chart === "undefined") return;
    safeRenderCharts();
}

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
   ACCESSIBLE VALIDATION + CONFIRMATION
========================================================= */
function clearFieldError(input) {
    if (!input) return;
    input.removeAttribute("aria-invalid");
    const group = input.closest(".form-group, label");
    group?.querySelector(".field-error")?.remove();
}
function setFieldError(input, message) {
    if (!input) return false;
    clearFieldError(input);
    input.setAttribute("aria-invalid","true");
    const error = document.createElement("small");
    error.className = "field-error";
    error.textContent = message;
    (input.closest(".form-group, label") || input.parentElement)?.appendChild(error);
    return false;
}
function focusFirstInvalid(form) {
    form?.querySelector('[aria-invalid="true"]')?.focus();
}

function passwordStrength(password) {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return Math.min(score,4);
}
function updatePasswordStrength(inputId, holderId) {
    const input=$(inputId), holder=$(holderId);
    if (!input || !holder) return;
    const score=passwordStrength(input.value);
    holder.dataset.score=String(score);
    const labels=["Too weak","Weak","Fair","Good","Strong"];
    const small=holder.querySelector("small");
    if (small) small.textContent=input.value
        ? `${labels[score]} — use upper/lowercase, a number and preferably a symbol.`
        : "Use 8+ characters with upper/lowercase and a number.";
}
let confirmResolver=null;
let confirmPreviousFocus=null;

function trapConfirmDialogFocus(event) {
    const modal = $("confirmDialog");
    if (!modal?.classList.contains("show") || event.key !== "Tab") return;
    const focusables = [...modal.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )].filter(el => el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
}
document.addEventListener("keydown", trapConfirmDialogFocus);

function confirmAction(message, options={}) {
    const modal=$("confirmDialog");
    if (!modal) return Promise.resolve(false);
    confirmPreviousFocus=document.activeElement;
    $("confirmDialogTitle").textContent=options.title || "Confirm action";
    $("confirmDialogMessage").textContent=message;
    $("confirmOkBtn").textContent=options.confirmText || "Confirm";
    modal.classList.add("show");
    modal.setAttribute("aria-hidden","false");
    document.body.classList.add("modal-open");
    return new Promise(resolve=>{
        confirmResolver=resolve;
        requestAnimationFrame(()=>$("confirmCancelBtn")?.focus());
    });
}
function resolveConfirm(value) {
    const modal=$("confirmDialog");
    if (!modal) return;
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden","true");
    document.body.classList.remove("modal-open");
    const resolve=confirmResolver;
    confirmResolver=null;
    resolve?.(value);
    confirmPreviousFocus?.focus?.();
}
window.confirmAction=confirmAction;


/* =========================================================
   SECURE ACCOUNT / SUPABASE AUTH
========================================================= */


function friendlyAuthError(error) {
    const message = String(error?.message || "Authentication request failed.");
    if (/error sending confirmation email/i.test(message)) {
        return "Confirmation email could not be sent. Please try again in a moment.";
    }
    if (/email rate limit/i.test(message)) {
        return "Too many confirmation emails were requested. Please wait and try again.";
    }
    if (/invalid login credentials/i.test(message)) {
        return "Email or password is incorrect.";
    }
    if (/email not confirmed/i.test(message)) {
        return "Please confirm your email before signing in.";
    }
    return message;
}

function setAuthMessage(message = "", type = "") {
    const box = $("authMessage");
    if (!box) return;
    box.textContent = message;
    box.className = "auth-message" + (type ? ` ${type}` : "");
}

function setAuthBusy(buttonId, busy, busyText) {
    const button = $(buttonId);
    if (!button) return;
    if (!button.dataset.originalText) {
        button.dataset.originalText = button.querySelector("span")?.textContent || "";
    }
    button.disabled = busy;
    const span = button.querySelector("span");
    if (span) span.textContent = busy ? busyText : button.dataset.originalText;
}

function switchAuthMode(mode) {
    const login = mode === "login";
    const register = mode === "register";
    const recovery = mode === "recovery";

    $("loginForm")?.classList.toggle("hidden", !login);
    $("registerForm")?.classList.toggle("hidden", !register);
    $("recoveryForm")?.classList.toggle("hidden", !recovery);

    $("loginTab")?.classList.toggle("active", login);
    $("registerTab")?.classList.toggle("active", register);
    $("loginTab")?.setAttribute("aria-selected", String(login));
    $("registerTab")?.setAttribute("aria-selected", String(register));
    document.querySelector(".auth-tabs")?.classList.toggle("hidden", recovery);

    if ($("authHeading")) {
        $("authHeading").textContent = login
            ? "Continue to my finances"
            : register
                ? "Create my private workspace"
                : "Set a new password";
    }
    if ($("authSubheading")) {
        $("authSubheading").textContent = login
            ? "Sign in securely to open my private financial workspace."
            : register
                ? "Create an account and keep every financial record separate and private."
                : "Choose a new password for my private Finance Assistant account.";
    }
    setAuthMessage("");
}

function togglePassword(inputId, button) {
    const input = $(inputId);
    if (!input) return;
    const showing = input.type === "text";
    input.type = showing ? "password" : "text";
    if (button) button.textContent = showing ? "Show" : "Hide";
}

async function fetchCurrentProfile() {
    if (!supabaseClient || !currentUser) return null;

    const { data: profile, error } = await supabaseClient
        .from("profiles")
        .select("full_name")
        .eq("id", currentUser.id)
        .maybeSingle();

    if (error) {
        console.warn("Profile could not load:", error);
        return null;
    }
    return profile;
}

function applyAccountIdentity() {
    const fallbackName =
        currentUser?.user_metadata?.full_name ||
        currentUser?.email?.split("@")[0] ||
        "My Finance";

    const name = currentProfile?.full_name || fallbackName;
    const email = currentUser?.email || "";

    if ($("sidebarAccountName")) $("sidebarAccountName").textContent = name;
    if ($("sidebarAccountEmail")) $("sidebarAccountEmail").textContent = email;

    document
        .querySelectorAll(".name-marquee-group span:not(:nth-child(even))")
        .forEach(span => {
            span.textContent = name;
        });

    document
        .querySelector(".name-marquee")
        ?.setAttribute("aria-label", name);
}


let appUiInitialized=false;
function setAuthenticatedVisibility(isAuthenticated) {
    const app = $("financeApp");
    const auth = $("authShell");

    if (app) {
        app.classList.toggle("auth-hidden", !isAuthenticated);
        app.setAttribute("aria-hidden", isAuthenticated ? "false" : "true");
    }

    if (auth) {
        auth.classList.toggle("auth-hidden", isAuthenticated);
        auth.setAttribute("aria-hidden", isAuthenticated ? "true" : "false");
    }

    document.body.classList.toggle("authenticated", isAuthenticated);
}
function initializeAppUiOnce() {
    if (appUiInitialized) return;
    appUiInitialized=true;
    init();
}

async function openAuthenticatedApp(user) {
    if (!user?.id) {
        setAuthenticatedVisibility(false);
        return;
    }

    // Clear previous account data before switching identity.
    data = structuredClone(defaultData);
    if (appUiInitialized) updateAll();

    currentUser = user;

    try {
        currentProfile = await fetchCurrentProfile();
        initializeAppUiOnce();
        applyAccountIdentity();

        // Load account data first. This prevents a blank transition if loading fails.
        await loadAccountFinanceData(user);

        setAuthenticatedVisibility(true);
    } catch (error) {
        console.error("Could not open authenticated app:", error);
        setAuthenticatedVisibility(false);
        setAuthMessage(
            "Your account is signed in, but the dashboard could not load. Please refresh once.",
            "error"
        );
    }
}

function closeAuthenticatedApp() {
    currentUser=null;
    currentProfile=null;
    data=structuredClone(defaultData);
    if (appUiInitialized) updateAll();
    setAuthenticatedVisibility(false);
    setCloudStatus("Signed out","idle");
}

async function handleLogin(event) {
    event.preventDefault();
    if (!supabaseClient) {
        setAuthMessage("Secure login service could not load. Check internet connection.", "error");
        return;
    }

    const email = $("loginEmail")?.value.trim() || "";
    const password = $("loginPassword")?.value || "";

    setAuthBusy("loginSubmit", true, "Opening securely…");
    setAuthMessage("");

    try {
        const { data: result, error } =
            await supabaseClient.auth.signInWithPassword({ email, password });

        if (error) throw error;
        if (!result.user) throw new Error("Login could not be completed.");

        await openAuthenticatedApp(result.user);
        $("loginForm")?.reset();
    } catch (error) {
        console.error("Login error:", error);
        setAuthMessage(friendlyAuthError(error), "error");
    } finally {
        setAuthBusy("loginSubmit", false, "");
    }
}

async function handleRegister(event) {
    event.preventDefault();
    if (!supabaseClient) {
        setAuthMessage("Secure registration service could not load.", "error");
        return;
    }

    const fullName = $("registerName")?.value.trim() || "";
    const email = $("registerEmail")?.value.trim() || "";
    const password = $("registerPassword")?.value || "";
    const confirmPassword = $("registerPasswordConfirm")?.value || "";

    const registerPasswordInput=$("registerPassword");
    if (password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
        setFieldError(registerPasswordInput,"Use 8+ characters with uppercase, lowercase and a number.");
        setAuthMessage("Please strengthen the password before creating the account.","error");
        registerPasswordInput?.focus();
        return;
    }
    clearFieldError(registerPasswordInput);
    if (password !== confirmPassword) {
        setFieldError($("registerPasswordConfirm"),"Passwords do not match.");
        setAuthMessage("The two passwords do not match.","error");
        $("registerPasswordConfirm")?.focus();
        return;
    }
    clearFieldError($("registerPasswordConfirm"));
    setAuthBusy("registerSubmit", true, "Creating private account…");
    setAuthMessage("");

    try {
        const { data: result, error } =
            await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName
                    },
                    emailRedirectTo: PRODUCTION_APP_URL
                }
            });

        if (error) throw error;

        if (result.session && result.user) {
            await openAuthenticatedApp(result.user);
        } else {
            switchAuthMode("login");
            if ($("loginEmail")) $("loginEmail").value = email;
            setAuthMessage(
                "Account created. Please confirm the email, then sign in.",
                "success"
            );
        }

        $("registerForm")?.reset();
    } catch (error) {
        console.error("Registration error:", error);
        setAuthMessage(friendlyAuthError(error), "error");
    } finally {
        setAuthBusy("registerSubmit", false, "");
    }
}

async function sendPasswordReset() {
    if (!supabaseClient) return;

    const email = $("loginEmail")?.value.trim();
    if (!email) {
        setAuthMessage("Enter the email address first, then choose Forgot password.", "error");
        $("loginEmail")?.focus();
        return;
    }

    try {
        setAuthMessage("Sending password reset link…");
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: PRODUCTION_APP_URL
        });
        if (error) throw error;
        setAuthMessage("Password reset email sent. Check the inbox.", "success");
    } catch (error) {
        setAuthMessage(error?.message || "Could not send reset email.", "error");
    }
}

async function handlePasswordRecovery(event) {
    event.preventDefault();

    const password = $("recoveryPassword")?.value || "";
    const confirmPassword = $("recoveryPasswordConfirm")?.value || "";

    const recoveryInput=$("recoveryPassword");
    if (password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
        setFieldError(recoveryInput,"Use 8+ characters with uppercase, lowercase and a number.");
        setAuthMessage("Please strengthen the new password.","error");
        recoveryInput?.focus();
        return;
    }
    clearFieldError(recoveryInput);
    if (password !== confirmPassword) {
        setAuthMessage("The two passwords do not match.", "error");
        return;
    }

    setAuthBusy("recoverySubmit", true, "Updating password…");

    try {
        const { error } = await supabaseClient.auth.updateUser({ password });
        if (error) throw error;

        $("recoveryForm")?.reset();
        switchAuthMode("login");
        setAuthMessage("Password updated successfully. You can continue securely.", "success");
    } catch (error) {
        setAuthMessage(error?.message || "Could not update the password.", "error");
    } finally {
        setAuthBusy("recoverySubmit", false, "");
    }
}

async function logoutFinanceAssistant() {
    if (!supabaseClient) return;

    try {
        await syncFinanceDataNow();
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        closeAuthenticatedApp();
        switchAuthMode("login");
        setAuthMessage("Signed out securely.", "success");
    } catch (error) {
        console.error("Logout error:", error);
        showToast("Could not sign out. Please try again.");
    }
}

window.switchAuthMode = switchAuthMode;
window.togglePassword = togglePassword;
window.sendPasswordReset = sendPasswordReset;
window.logoutFinanceAssistant = logoutFinanceAssistant;


function bindAuthControls() {
    const shell = $("authShell");
    if (!shell || shell.dataset.controlsBound === "true") return;
    shell.dataset.controlsBound = "true";

    document.querySelectorAll("[data-auth-mode]").forEach(button => {
        button.addEventListener("click", () => {
            switchAuthMode(button.dataset.authMode);
        });
    });

    document.querySelectorAll("[data-toggle-password]").forEach(button => {
        button.addEventListener("click", () => {
            togglePassword(button.dataset.togglePassword, button);
        });
    });

    $("forgotPasswordBtn")?.addEventListener("click", sendPasswordReset);

    // Make Enter submit the visible auth form naturally.
    ["loginForm", "registerForm", "recoveryForm"].forEach(formId => {
        const form = $(formId);
        if (!form) return;
        form.querySelectorAll("input").forEach(input => {
            input.addEventListener("keydown", event => {
                if (event.key === "Enter" && !event.shiftKey) {
                    const visibleForm = !form.classList.contains("hidden");
                    if (visibleForm) {
                        event.preventDefault();
                        form.requestSubmit();
                    }
                }
            });
        });
    });
}


async function initializeSecureFinanceAssistant() {
    bindAuthControls();

    const authShell = $("authShell");
    if (authShell?.dataset.authSubmitBound !== "true") {
        $("loginForm")?.addEventListener("submit", handleLogin);
        $("registerForm")?.addEventListener("submit", handleRegister);
        $("recoveryForm")?.addEventListener("submit", handlePasswordRecovery);
        if (authShell) authShell.dataset.authSubmitBound = "true";
    }
    $("registerPassword")?.addEventListener("input", () => updatePasswordStrength("registerPassword","registerPasswordStrength"));
    $("recoveryPassword")?.addEventListener("input", () => updatePasswordStrength("recoveryPassword","recoveryPasswordStrength"));
    $("confirmCancelBtn")?.addEventListener("click",()=>resolveConfirm(false));
    $("confirmOkBtn")?.addEventListener("click",()=>resolveConfirm(true));
    $("confirmDialog")?.addEventListener("click",event=>{ if(event.target===$("confirmDialog")) resolveConfirm(false); });

    if (!supabaseClient) {
        setAuthenticatedVisibility(false);
        switchAuthMode("login");
        setAuthMessage(
            "Secure login service could not load. Check the internet connection and refresh.",
            "error"
        );
        return;
    }

    // Verify the current Supabase user. If the network check fails temporarily,
    // use the SDK session only to keep the login UI stable; database RLS still
    // protects every finance_data request server-side.
    let resolvedUser = null;

    try {
        const { data: verifiedUserData, error } = await supabaseClient.auth.getUser();
        if (!error && verifiedUserData?.user) {
            resolvedUser = verifiedUserData.user;
        } else if (error && error.name !== "AuthSessionMissingError") {
            console.warn("Verified session check failed:", error);
        }
    } catch (error) {
        console.warn("Verified session request failed:", error);
    }

    // No local-session fallback here. Financial UI is exposed only after
    // Supabase has verified the user token with getUser().
if (resolvedUser) await openAuthenticatedApp(resolvedUser); else closeAuthenticatedApp();

    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
            setAuthenticatedVisibility(false);
            switchAuthMode("recovery");
            setAuthMessage("Reset link verified. Set a new password below.", "success");
            return;
        }

        if (event === "SIGNED_OUT") {
            closeAuthenticatedApp();
            return;
        }

        if (
            (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") &&
            session?.user &&
            session.user.id !== currentUser?.id
        ) {
            await openAuthenticatedApp(session.user);
        }
    });
}


/* =========================================================
   INITIALIZATION
========================================================= */

function init() {
    $("installmentForm")?.addEventListener("submit",saveInstallmentPlan);
    $("installmentPaymentForm")?.addEventListener("submit",saveInstallmentPayment);
    ["installmentTotalPrice","installmentDownPayment","installmentCount","installmentMarkup","installmentMonthly","installmentHistoricalCount"]
        .forEach(id=>$(id)?.addEventListener("input",updateInstallmentPreview));
    updateTransactionCategories();
    setDefaultTransactionForm();
    updateCurrentDate();
    document.querySelectorAll(".modal").forEach(enhanceModalAccessibility);
}


/* =========================================================
   START APP
========================================================= */

async function bootFinanceAssistant() {
    // Always show the login shell first. It is the safe fallback.
    setAuthenticatedVisibility(false);

    try {
        await initializeSecureFinanceAssistant();
    } catch (error) {
        console.error("Finance Assistant startup failed:", error);
        setAuthenticatedVisibility(false);
        setAuthMessage(
            "The app could not finish loading. Please refresh the page.",
            "error"
        );
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootFinanceAssistant);
} else {
    bootFinanceAssistant();
}

document.addEventListener("keydown",event=>{
    const confirmModal=$("confirmDialog");
    if(!confirmModal?.classList.contains("show")) return;
    if(event.key==="Escape"){event.preventDefault();resolveConfirm(false);return;}
    if(event.key==="Tab"){
        const items=[...confirmModal.querySelectorAll('button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')];
        if(!items.length) return;
        const first=items[0], last=items[items.length-1];
        if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
        else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
    }
});

document.addEventListener("keydown", event => {
    const modal = document.querySelector(".modal.show");
    if (!modal) return;

    if (event.key === "Escape" && modal.id !== "confirmDialog") {
        event.preventDefault();
        closeModal(modal.id);
        return;
    }

    if (event.key === "Tab") {
        const focusable = getModalFocusable(modal);
        if (!focusable.length) {
            event.preventDefault();
            modal.querySelector(".modal-box")?.focus();
            return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }
});



function bindInstallmentsNavigationFix() {
    const buttons = [
        ...document.querySelectorAll('[data-section="installments"]'),
        ...document.querySelectorAll('[data-open-section="installments"]')
    ];

    buttons.forEach(button => {
        if (button.dataset.installmentsFixBound === "true") return;
        button.dataset.installmentsFixBound = "true";

        button.addEventListener("click", event => {
            event.preventDefault();

            const target = document.getElementById("installments");
            if (!target) {
                console.error("Installments section not found.");
                return;
            }

            if (typeof showSection === "function") {
                showSection("installments");
                return;
            }

            document.querySelectorAll(".section").forEach(section => {
                section.classList.toggle("active", section.id === "installments");
            });

            document.querySelectorAll("[data-section]").forEach(nav => {
                nav.classList.toggle(
                    "active",
                    nav.getAttribute("data-section") === "installments"
                );
            });

            window.scrollTo(0, 0);
        });
    });
}


if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindInstallmentsNavigationFix, { once: true });
} else {
    bindInstallmentsNavigationFix();
}



function bindAddInstallmentButton() {
    const button = $("addInstallmentBtn");
    if (!button || button.dataset.bound === "true") return;

    button.dataset.bound = "true";
    button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        openInstallmentModal();
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindAddInstallmentButton, { once: true });
} else {
    bindAddInstallmentButton();
}
