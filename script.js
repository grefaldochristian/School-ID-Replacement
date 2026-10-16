"use strict";

/* =====================================================
   VERITAS COLLEGE OF IROSIN
   SCHOOL ID REPLACEMENT PORTAL
   Front-end demonstration using localStorage
===================================================== */

const REQUESTS_KEY = "veritas_id_requests";
const ACCOUNTS_KEY = "veritas_demo_accounts";

const ADMIN_DEMO_PASSWORD = "demoAdmin2026";

let isRegisterMode = false;
let isAdminLoggedIn = false;
let lastGeneratedRef = "";
let selectedFile = null;
let toastTimer;

// ---------------- SAFE LOCAL STORAGE ----------------

function readStorage(key, fallback = []) {
  try {
    const value = localStorage.getItem(key);
    if (value === null) return fallback;

    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    console.error("Unable to read browser storage:", error);
    return fallback;
  }
}

function saveStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error("Unable to save browser storage:", error);
    showToast("Unable to save data. Browser storage may be full or disabled.");
    return false;
  }
}

let requestsDB = readStorage(REQUESTS_KEY);
let accountsDB = readStorage(ACCOUNTS_KEY);

// ---------------- INITIALIZATION ----------------

document.addEventListener("DOMContentLoaded", () => {
  initializeLevelSelectors();
  updateFullProgramString();
  updateLivePreview();

  document.getElementById("academicLevel")
    .addEventListener("change", handleLevelChange);

  ["programSelect", "shsStrandSelect",
    "yearLevelSelect", "sectionSelect"].forEach(id => {
      document.getElementById(id).addEventListener(
        "change", updateFullProgramString
      );
    });

  ["studentName", "studentIdNumber"].forEach(id => {
    document.getElementById(id).addEventListener(
      "input", updateLivePreview
    );
  });


  document.getElementById("studentName")?.addEventListener("blur", event => {
    event.target.value = formatPersonName(event.target.value);
    updateLivePreview();
  });


  document.getElementById("regName")?.addEventListener("input", event => {
    const input = event.target;
    input.value = formatPersonName(input.value);
  });

  document.getElementById("replacementForm")
    .addEventListener("submit", handleFormSubmit);


  const studentIdInput = document.getElementById("studentIdNumber");
  const studentIdError = document.getElementById("studentIdError");

  studentIdInput.addEventListener("input", () => {
    // Allow digits only, maximum 8 digits.
    const numbers = studentIdInput.value
      .replace(/\D/g, "")
      .slice(0, 8);

    // Automatically add a hyphen after 4 digits.
    studentIdInput.value = numbers.length > 4
      ? numbers.slice(0, 4) + "-" + numbers.slice(4)
      : numbers;

    // Validate the Student ID
    if (numbers.length === 0) {
      studentIdError.textContent = "";
      studentIdInput.setCustomValidity("");
    } else if (numbers.length < 8) {
      studentIdError.textContent =
        "Student ID must contain 8 digits. Example: 2024-0873";
      studentIdInput.setCustomValidity(
        "Enter exactly 8 digits."
      );
    } else {
      studentIdError.textContent = "";
      studentIdInput.setCustomValidity("");
    }

    updateLivePreview();
  });

  studentIdInput.addEventListener("blur", () => {
    if (
      studentIdInput.value &&
      !/^\d{4}-\d{4}$/.test(studentIdInput.value)
    ) {
      studentIdError.textContent =
        "Invalid Student ID. Example: 2024-0873";
    }
  });

  studentIdInput.addEventListener("blur", () => {
    if (studentIdInput.value && !studentIdInput.validity.valid) {
      studentIdError.textContent =
        "Invalid Student ID. Use this format: 2024-00129";
    }
  });

  document.getElementById("replacementForm")
    .addEventListener("reset", () => {
      setTimeout(() => {
        selectedFile = null;
        updateFileNameDisplay();
        initializeLevelSelectors();
        updateFullProgramString();
        updateLivePreview();
      }, 0);
    });

  document.getElementById("trackForm")
    .addEventListener("submit", event => {
      event.preventDefault();
      trackRequest();
    });

  document.getElementById("contactForm")
    .addEventListener("submit", handleContactSubmit);

  document.getElementById("authForm")
    .addEventListener("submit", handleAuthSubmit);

  document.getElementById("adminLoginForm")
    .addEventListener("submit", handleAdminLogin);

  document.getElementById("adminSearch")
    .addEventListener("input", renderAdminTable);

  document.getElementById("adminStatusFilter")
    .addEventListener("change", renderAdminTable);

  document.getElementById("adminLogoutBtn")
    .addEventListener("click", logoutAdmin);

  document.getElementById("copyReferenceBtn")
    .addEventListener("click", copyReference);

  document.getElementById("authSwitchLink")
    .addEventListener("click", event => {
      event.preventDefault();
      openAuthModal(isRegisterMode ? "login" : "register");
    });

  setupMobileMenu();
  setupFileUpload();
  setupModalKeyboard();

  // Show a friendly starting page.
  switchPage("home");
});

// ---------------- NAVIGATION ----------------

function switchPage(pageId) {
  const page = document.getElementById(`page-${pageId}`);
  if (!page) return;

  document.querySelectorAll(".page-section").forEach(section => {
    section.classList.remove("active");
  });

  page.classList.add("active");

  document.querySelectorAll(".nav-item").forEach(link => {
    const active = link.dataset.page === pageId;
    link.classList.toggle("active", active);

    if (active) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  closeMobileMenu();
  window.scrollTo({ top: 0, behavior: "smooth" });
  history.replaceState(null, "", `#${pageId}`);
}

function setupMobileMenu() {
  const button = document.getElementById("mobileToggle");

  button.addEventListener("click", () => {
    const links = document.getElementById("navLinks");
    const isOpen = links.classList.toggle("open");

    button.setAttribute("aria-expanded", String(isOpen));
    button.innerHTML = isOpen
      ? '<i class="fa-solid fa-xmark"></i>'
      : '<i class="fa-solid fa-bars"></i>';
  });
}

function closeMobileMenu() {
  document.getElementById("navLinks").classList.remove("open");

  const button = document.getElementById("mobileToggle");
  button.setAttribute("aria-expanded", "false");
  button.innerHTML = '<i class="fa-solid fa-bars"></i>';
}

// ---------------- ACADEMIC SELECTORS ----------------

function initializeLevelSelectors() {
  handleLevelChange();
}

function handleLevelChange() {
  const level = document.getElementById("academicLevel").value;
  const collegeGroup = document.getElementById("collegeProgramGroup");
  const shsGroup = document.getElementById("shsStrandGroup");
  const yearSelect = document.getElementById("yearLevelSelect");
  const sectionSelect = document.getElementById("sectionSelect");
  const sectionLabel = document.getElementById("sectionLabelText");
  const programSelect = document.getElementById("programSelect");
  const strandSelect = document.getElementById("shsStrandSelect");

  if (level === "SHS") {
    collegeGroup.classList.add("hidden");
    shsGroup.classList.remove("hidden");

    programSelect.required = false;
    strandSelect.required = true;

    yearSelect.innerHTML = `
      <option value="Grade 11">Grade 11</option>
      <option value="Grade 12">Grade 12</option>
    `;

    sectionLabel.textContent = "Section *";
    sectionSelect.innerHTML = `
      <option value="A">Section A</option>
      <option value="B">Section B</option>
      <option value="C">Section C</option>
      <option value="D">Section D</option>
      <option value="E">Section E</option>
    `;
  } else {
    collegeGroup.classList.remove("hidden");
    shsGroup.classList.add("hidden");

    programSelect.required = true;
    strandSelect.required = false;

    yearSelect.innerHTML = `
      <option value="1">1st Year</option>
      <option value="2">2nd Year</option>
      <option value="3">3rd Year</option>
      <option value="4">4th Year</option>
    `;

    sectionLabel.textContent = "Block *";
    sectionSelect.innerHTML = `
      <option value="A">Block A</option>
      <option value="B">Block B</option>
      <option value="C">Block C</option>
      <option value="D">Block D</option>
      <option value="E">Block E</option>
    `;
  }

  yearSelect.selectedIndex = level === "SHS" ? 0 : 1;
  sectionSelect.value = "C";

  updateFullProgramString();
}

function updateFullProgramString() {
  const level = document.getElementById("academicLevel").value;
  const year = document.getElementById("yearLevelSelect").value;
  const section = document.getElementById("sectionSelect").value;

  let courseText;

  if (level === "College") {
    const program = document.getElementById("programSelect").value;
    const yearLabel = {
      "1": "1st Year",
      "2": "2nd Year",
      "3": "3rd Year",
      "4": "4th Year"
    }[year] || year;

    courseText = `${program} - ${yearLabel} (Block ${section})`;
  } else {
    const strand = document.getElementById("shsStrandSelect").value;
    courseText = `SHS ${strand} - ${year} (Section ${section})`;
  }

  document.getElementById("studentCourse").value = courseText;

  const preview = document.getElementById("previewCourse");
  if (preview) preview.textContent = courseText;
}

function updateLivePreview() {
  const nameInput = document.getElementById("studentName");
  const idInput = document.getElementById("studentIdNumber");

  // Read the name without changing the input field.
  const name = nameInput.value;
  const id = idInput.value.trim();

  // Update only the ID card preview.
  document.getElementById("previewName").textContent =
    name || "Your Name";

  document.getElementById("previewId").textContent =
    "ID: " + (id || "Your Student ID");
}


// ---------------- FILE UPLOAD ----------------

function setupFileUpload() {
  const zone = document.getElementById("dropZone");
  const input = document.getElementById("idUpload");

  input.addEventListener("change", () => {
    const file = input.files[0] || null;

    if (!file) {
      selectedFile = null;
      updateFileNameDisplay();
      return;
    }

    if (!validateFile(file)) {
      input.value = "";
      selectedFile = null;
      updateFileNameDisplay();
      return;
    }

    selectedFile = file;
    updateFileNameDisplay();
  });

  ["dragenter", "dragover"].forEach(type => {
    zone.addEventListener(type, event => {
      event.preventDefault();
      zone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach(type => {
    zone.addEventListener(type, event => {
      event.preventDefault();
      zone.classList.remove("dragover");
    });
  });

  zone.addEventListener("drop", event => {
    const file = event.dataTransfer.files[0];
    if (!file) return;

    if (!validateFile(file)) return;

    selectedFile = file;

    // Populate the native input when supported by the browser.
    try {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
    } catch (error) {
      // Keep the selected file in memory for this page session.
    }

    updateFileNameDisplay();
  });
}

function validateFile(file) {
  const allowedTypes = [
    "image/png",
    "image/jpeg",
    "image/webp",
    "application/pdf"
  ];

  if (!allowedTypes.includes(file.type)) {
    showToast("Choose a PNG, JPG, WEBP, or PDF file.");
    return false;
  }

  if (file.size > 5 * 1024 * 1024) {
    showToast("The file must be 5 MB or smaller.");
    return false;
  }

  return true;
}

function updateFileNameDisplay() {
  const display = document.getElementById("fileNameDisplay");

  display.textContent = selectedFile
    ? `Selected: ${selectedFile.name}`
    : "Choose a photo or PDF";
}

// ---------------- REQUEST SUBMISSION ----------------

function generateReference() {
  let reference;

  do {
    const random = Math.floor(100000 + Math.random() * 900000);
    reference = `VERITAS-${random}`;
  } while (requestsDB.some(request => request.refNumber === reference));

  return reference;
}

function handleFormSubmit(event) {
  event.preventDefault();

  const form = document.getElementById("replacementForm");

  if (!form.reportValidity()) return;

  const studentName =
    document.getElementById("studentName").value.trim();
  const studentId =
    document.getElementById("studentIdNumber").value.trim();
  const email =
    document.getElementById("studentEmail").value.trim().toLowerCase();

  // Prevent multiple demo requests for the same ID from being
  // accidentally submitted as duplicates.
  const duplicate = requestsDB.some(request =>
    String(request.studentId).toLowerCase() === studentId.toLowerCase() &&
    request.status !== "Completed"
  );

  if (duplicate) {
    showToast(
      "An unfinished request already exists for this student ID. Track the existing request or contact the Registrar."
    );
    return;
  }

  const request = {
    refNumber: generateReference(),
    studentName,
    studentId,
    course: document.getElementById("studentCourse").value,
    email,
    reason: document.getElementById("replacementReason").value,
    details: document.getElementById("reasonDetails").value.trim(),
    fileName: selectedFile ? selectedFile.name : "",
    date: new Date().toISOString(),
    status: "Pending"
  };

  requestsDB.unshift(request);

  if (!saveStorage(REQUESTS_KEY, requestsDB)) {
    requestsDB.shift();
    return;
  }

  lastGeneratedRef = request.refNumber;

  document.getElementById("modalRefNumber").textContent =
    request.refNumber;

  openModal("successModal");
}

function closeModal() {
  closeModalById("successModal");

  document.getElementById("replacementForm").reset();
  selectedFile = null;
  updateFileNameDisplay();
  updateLivePreview();
}

function closeModalAndTrack() {
  const reference = lastGeneratedRef;

  closeModalById("successModal");
  switchPage("track");

  document.getElementById("trackInput").value = reference;
  trackRequest();
}

async function copyReference() {
  const reference = document.getElementById("modalRefNumber").textContent;

  try {
    await navigator.clipboard.writeText(reference);
    showToast("Tracking reference copied.");
  } catch (error) {
    // Fallback for browsers that do not permit clipboard access.
    const textArea = document.createElement("textarea");
    textArea.value = reference;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.select();

    const copied = document.execCommand("copy");
    textArea.remove();

    showToast(copied
      ? "Tracking reference copied."
      : "Please copy your tracking reference manually.");
  }
}

// ---------------- REQUEST TRACKING ----------------

function trackRequest() {
  const query = document.getElementById("trackInput")
    .value.trim().toLowerCase();

  const result = document.getElementById("trackingResultContainer");
  const message = document.getElementById("trackingMessage");

  result.classList.add("hidden");
  message.classList.add("hidden");

  if (!query) {
    showMessage(message, "Please enter a tracking reference or student ID.", "error");
    return;
  }

  const found = requestsDB.find(request =>
    String(request.refNumber).toLowerCase() === query ||
    String(request.studentId).toLowerCase() === query
  );

  if (!found) {
    showMessage(
      message,
      "No matching request was found. Check your reference and try again.",
      "error"
    );
    return;
  }

  document.getElementById("resRefNumber").textContent = found.refNumber;
  document.getElementById("resStudentName").textContent = found.studentName;
  document.getElementById("resStudentId").textContent = found.studentId;
  document.getElementById("resCourse").textContent = found.course || "Not specified";
  document.getElementById("resReason").textContent = found.reason;

  const date = new Date(found.date);
  document.getElementById("resDate").textContent =
    "Filed: " + (Number.isNaN(date.getTime())
      ? found.date
      : date.toLocaleString());

  const badge = document.getElementById("resStatusBadge");
  badge.textContent = found.status;
  badge.className = `status-badge ${statusClass(found.status)}`;

  renderTrackingTimeline(found.status);

  result.classList.remove("hidden");
  result.scrollIntoView({ behavior: "smooth", block: "start" });
}

function statusClass(status) {
  if (status === "Approved") return "approved";
  if (status === "Completed") return "completed";
  return "pending";
}

function renderTrackingTimeline(status) {
  const timeline = document.getElementById("trackingTimeline");
  timeline.replaceChildren();

  const steps = [
    { title: "Request Submitted", description: "Your request has been recorded." },
    { title: "Request Approved", description: "The request has been approved for processing." },
    { title: "ID Completed", description: "The replacement request has been marked completed." }
  ];

  const progress = {
    Pending: 0,
    Approved: 1,
    Completed: 2
  }[status] ?? 0;

  const heading = document.createElement("h3");
  heading.textContent = "Request Progress";
  timeline.appendChild(heading);

  steps.forEach((step, index) => {
    const row = document.createElement("div");
    row.className = "timeline-step" + (index <= progress ? " done" : "");

    const dot = document.createElement("span");
    dot.className = "timeline-dot";
    dot.innerHTML = index <= progress
      ? '<i class="fa-solid fa-check"></i>'
      : String(index + 1);

    const content = document.createElement("div");
    const title = document.createElement("strong");
    const description = document.createElement("small");

    title.textContent = step.title;
    description.textContent = step.description;

    content.append(title, description);
    row.append(dot, content);
    timeline.appendChild(row);
  });
}

// ---------------- AUTHENTICATION DEMO ----------------

function openAuthModal(mode) {
  isRegisterMode = mode === "register";

  const form = document.getElementById("authForm");
  const nameGroup = document.getElementById("regNameGroup");
  const nameInput = document.getElementById("regName");
  const password = document.getElementById("authPassword");

  document.getElementById("authModalTitle").textContent =
    isRegisterMode ? "Create Student Account" : "Student Login";

  document.getElementById("authDescription").textContent =
    isRegisterMode
      ? "Create a demo account for this browser."
      : "Sign in using your registered demo account.";

  document.getElementById("authSubmitBtn").textContent =
    isRegisterMode ? "Create Account" : "Login";

  nameGroup.classList.toggle("hidden", !isRegisterMode);
  nameInput.required = isRegisterMode;

  password.autocomplete = isRegisterMode
    ? "new-password"
    : "current-password";

  document.getElementById("authSwitchText").innerHTML =
    isRegisterMode
      ? 'Already registered? <a href="#login" id="authSwitchLink">Login here</a>'
      : 'No account yet? <a href="#register" id="authSwitchLink">Create an account</a>';

  document.getElementById("authSwitchLink")
    .addEventListener("click", event => {
      event.preventDefault();
      openAuthModal(isRegisterMode ? "login" : "register");
    });

  document.getElementById("authMessage").classList.add("hidden");

  openModal("authModal");
}

function closeAuthModal() {
  closeModalById("authModal");
}

async function handleAuthSubmit(event) {
  event.preventDefault();

  const email = document.getElementById("authEmail")
    .value.trim().toLowerCase();

  const password = document.getElementById("authPassword").value;
  const message = document.getElementById("authMessage");

  if (password.length < 8) {
    showMessage(message, "Password must contain at least 8 characters.", "error");
    return;
  }

  if (isRegisterMode) {
    const name = document.getElementById("regName").value.trim();

    if (!name) {
      showMessage(message, "Please enter your full name.", "error");
      return;
    }

    if (accountsDB.some(account => account.email === email)) {
      showMessage(message, "An account with this email already exists.", "error");
      return;
    }

    try {
      // Demo convenience only. This is NOT production-safe
      // password storage. Use server-side password hashing in production.
      const passwordHash = await hashDemoPassword(password);

      accountsDB.push({
        name,
        email,
        passwordHash,
        createdAt: new Date().toISOString()
      });

      if (!saveStorage(ACCOUNTS_KEY, accountsDB)) {
        accountsDB.pop();
        return;
      }

      showMessage(
        message,
        "Account created in this browser. You can now log in.",
        "success"
      );

      showToast("Demo account created.");
      openAuthModal("login");
      document.getElementById("authEmail").value = email;
      return;

    } catch (error) {
      showMessage(message, "Account creation failed in this browser.", "error");
      return;
    }
  }

  const account = accountsDB.find(item => item.email === email);

  if (!account) {
    showMessage(
      message,
      "Account not found. Register a demo account first.",
      "error"
    );
    return;
  }

  const suppliedHash = await hashDemoPassword(password);

  if (suppliedHash !== account.passwordHash) {
    showMessage(message, "Incorrect email or password.", "error");
    return;
  }

  closeAuthModal();

  // This only changes the local UI; it is not secure authorization.
  document.getElementById("navAuth").innerHTML = `
    <span class="btn btn-outline-light">
      <i class="fa-solid fa-user"></i> ${escapeHTML(account.name)}
    </span>
    <button class="btn btn-gold" onclick="demoLogout()">Log Out</button>
  `;

  showToast("Demo login successful.");
}

async function hashDemoPassword(password) {
  // SHA-256 here is only for a browser demonstration.
  // It is NOT a replacement for server-side password hashing.
  if (window.crypto && window.crypto.subtle) {
    const bytes = new TextEncoder().encode(password);
    const digest = await crypto.subtle.digest("SHA-256", bytes);

    return Array.from(new Uint8Array(digest))
      .map(byte => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  // Simple fallback for local demos. Never use this for real accounts.
  return "demo:" + password;
}

function demoLogout() {
  document.getElementById("navAuth").innerHTML = `
    <button class="btn btn-outline-light" onclick="openAuthModal('login')">Login</button>
    <button class="btn btn-gold" onclick="openAuthModal('register')">
      <i class="fa-solid fa-user-plus"></i> Register
    </button>
  `;

  showToast("Logged out of the demo UI.");
}

// ---------------- ADMIN DEMO ----------------

function openAdminModal() {
  document.getElementById("adminLoginPanel").classList.remove("hidden");
  document.getElementById("adminDashboard").classList.add("hidden");
  document.getElementById("adminLoginForm").reset();
  document.getElementById("adminLoginMessage").classList.add("hidden");

  openModal("adminModal");

  if (isAdminLoggedIn) {
    showAdminDashboard();
  }
}

function handleAdminLogin(event) {
  event.preventDefault();

  const password = document.getElementById("adminPassword").value;
  const message = document.getElementById("adminLoginMessage");

  if (password !== ADMIN_DEMO_PASSWORD) {
    showMessage(message, "Incorrect demo admin password.", "error");
    return;
  }

  isAdminLoggedIn = true;
  showAdminDashboard();
}

function showAdminDashboard() {
  document.getElementById("adminLoginPanel").classList.add("hidden");
  document.getElementById("adminDashboard").classList.remove("hidden");

  renderAdminTable();
}

function closeAdminModal() {
  closeModalById("adminModal");
}

function logoutAdmin() {
  isAdminLoggedIn = false;
  document.getElementById("adminDashboard").classList.add("hidden");
  document.getElementById("adminLoginPanel").classList.remove("hidden");
  document.getElementById("adminLoginForm").reset();
  showToast("Admin demo session closed.");
}

function renderAdminTable() {
  if (!isAdminLoggedIn) return;

  const tbody = document.getElementById("adminTableBody");
  const query = document.getElementById("adminSearch")
    .value.trim().toLowerCase();

  const filter = document.getElementById("adminStatusFilter").value;

  document.getElementById("adminTotalCount").textContent = requestsDB.length;
  document.getElementById("adminPendingCount").textContent =
    requestsDB.filter(request => request.status === "Pending").length;
  document.getElementById("adminApprovedCount").textContent =
    requestsDB.filter(request => request.status === "Approved").length;
  document.getElementById("adminCompletedCount").textContent =
    requestsDB.filter(request => request.status === "Completed").length;

  tbody.replaceChildren();

  const filtered = requestsDB
    .map((request, index) => ({ request, index }))
    .filter(({ request }) => {
      const matchesQuery = [
        request.refNumber,
        request.studentName,
        request.studentId,
        request.reason
      ].some(value => String(value || "").toLowerCase().includes(query));

      const matchesStatus =
        filter === "all" || request.status === filter;

      return matchesQuery && matchesStatus;
    });

  if (filtered.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 7;
    cell.textContent = "No requests match your search.";
    cell.style.textAlign = "center";
    cell.style.padding = "30px";

    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  filtered.forEach(({ request, index }) => {
    const row = document.createElement("tr");

    const date = new Date(request.date);
    const dateText = Number.isNaN(date.getTime())
      ? request.date
      : date.toLocaleDateString();

    const values = [
      request.refNumber,
      request.studentName,
      request.studentId,
      request.reason,
      dateText
    ];

    values.forEach(value => {
      const cell = document.createElement("td");
      cell.textContent = value || "—";
      row.appendChild(cell);
    });

    const statusCell = document.createElement("td");
    const badge = document.createElement("span");

    badge.className = `status-badge ${statusClass(request.status)}`;
    badge.textContent = request.status;

    statusCell.appendChild(badge);
    row.appendChild(statusCell);

    const actionCell = document.createElement("td");
    const select = document.createElement("select");

    select.setAttribute("aria-label", `Update ${request.refNumber} status`);

    ["Pending", "Approved", "Completed"].forEach(status => {
      const option = document.createElement("option");
      option.value = status;
      option.textContent = status;
      option.selected = request.status === status;
      select.appendChild(option);
    });

    select.addEventListener("change", () => {
      updateStatus(index, select.value);
    });

    actionCell.appendChild(select);
    row.appendChild(actionCell);

    tbody.appendChild(row);
  });
}

function updateStatus(index, newStatus) {
  if (!isAdminLoggedIn) {
    showToast("Please log in to the admin demo.");
    return;
  }

  if (!["Pending", "Approved", "Completed"].includes(newStatus)) {
    showToast("Invalid status.");
    return;
  }

  if (!requestsDB[index]) return;

  const previous = requestsDB[index].status;
  requestsDB[index].status = newStatus;

  if (!saveStorage(REQUESTS_KEY, requestsDB)) {
    requestsDB[index].status = previous;
    return;
  }

  renderAdminTable();
  showToast(`Request status updated to ${newStatus}.`);
}

// ---------------- CONTACT FORM ----------------

function handleContactSubmit(event) {
  event.preventDefault();

  if (!event.target.reportValidity()) return;

  event.target.reset();

  showToast(
    "Demo only: your message was not emailed. Connect a backend to send real messages."
  );
}

// ---------------- MODAL HELPERS ----------------

function openModal(id) {
  document.getElementById(id).classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeModalById(id) {
  document.getElementById(id).classList.remove("active");

  const anyOpen = document.querySelector(".modal-overlay.active");
  if (!anyOpen) document.body.style.overflow = "";
}

function setupModalKeyboard() {
  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", event => {
      if (event.target !== overlay) return;

      if (overlay.id === "adminModal") closeAdminModal();
      else if (overlay.id === "authModal") closeAuthModal();
      else if (overlay.id === "successModal") closeModal();
    });
  });

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;

    if (document.getElementById("adminModal").classList.contains("active")) {
      closeAdminModal();
    } else if (document.getElementById("authModal").classList.contains("active")) {
      closeAuthModal();
    } else if (document.getElementById("successModal").classList.contains("active")) {
      closeModal();
    }
  });
}

// ---------------- UI HELPERS ----------------

function showMessage(element, message, type) {
  element.textContent = message;
  element.className = `message-box ${type}`;
}

function showToast(message) {
  const toast = document.getElementById("toast");

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3500);
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function formatPersonName(value) {
  if (!value) return "";

  const trimmed = value.replace(/\s+/g, " ").trim();

  return trimmed
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}