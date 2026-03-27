document.addEventListener("DOMContentLoaded", () => {
  const adminNameEl = document.getElementById("adminName");
  const logoutBtnEl = document.getElementById("logoutBtn");
  const notificationBoxEl = document.getElementById("notificationBox");
  const auditLogsTableBodyEl = document.getElementById("auditLogsTableBody");

  const API = {
    me: "/api/auth/me",
    logout: "/api/auth/logout",
    auditLogs: "/admin/audit-logs",
  };

  function showNotification(message, type = "error") {
    if (!notificationBoxEl) return;
    notificationBoxEl.textContent = message;
    notificationBoxEl.className = `notification ${type}`;
    notificationBoxEl.style.display = "block";
  }

  function formatDateTime(value) {
    if (!value) return "N/A";
    return new Date(value).toLocaleString();
  }

  function renderLogs(logs) {
    auditLogsTableBodyEl.innerHTML = "";

    if (!logs.length) {
      auditLogsTableBodyEl.innerHTML = '<tr><td colspan="8">No Audit Logs Here.</td></tr>';
      return;
    }

    logs.forEach((log) => {
      const row = document.createElement("tr");
      row.innerHTML = `
      <td>${log.id}</td>
      <td>#${log.appointment_id}</td>
      <td>${log.action}</td>
      <td>${log.old_status}</td>
      <td>${log.new_status}</td>
      <td>${log.admin_name}</td>
      <td>${formatDateTime(log.performed_at)}</td>
      <td>${log.notes || "-"}</td>
      `;
      auditLogsTableBodyEl.appendChild(row);
    });
  }

  async function loadCurrentUser() {
    const response = await fetch(API.me, { credentials: "include" });
    const data = await response.json();

    if (!response.ok || !data.data.role !== "admin") {
      window.location.href = "/auth/login";
      return;
    }

    adminNameEl.textContent = `Welcome, ${data.data.name}`;
  }

  async function loadAuditLogs() {
    const response = await fetch(API.auditLogs, { credentials: "include"});
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to load audit logs.");
    }

    renderLogs(data.data || []);
  }

  async function handleLogout() {
    await fetch(API.logout, { method: "POST", credentials: "include" });
    window.location.href = "/auth/login";
  }

  async function init() {
    try {
      await loadCurrentUser();
      await loadAuditLogs();
    } catch (error) {
      showNotification(error.message || "Unable to load audit logs.");
    }
  }

  logoutBtnEl?.addEventListener("click", handleLogout);

  init();
});
