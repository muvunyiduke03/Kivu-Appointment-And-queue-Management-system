document.addEventListener("DOMContentLoaded", () => {
  const adminNameEl = document.getElementById("adminName");
  const logoutBtnEl = document.getElementById("logoutBtn");
  const queueDateEl = document.getElementById("queueDate");
  const serveNextBtnEl = document.getElementById("serveNextBtn");
  const notificationBoxEl = document.getElementById("notificationBox");
  const queueTableBodyEl = document.getElementById("queueTableBody");
  const auditLogListEl = document.getElementById("auditLogList");
  const totalAppointmentsEl = document.getElementById("totalAppointments");
  const pendingAppointmentsEl = document.getElementById("pendingAppointments");
  const servedAppointmentsEl = document.getElementById("servedAppointments");
  const nextPatientEl = document.getElementById("nextPatient");

  const API = {
    me: "/api/auth/me",
    logout: "/api/auth/logout",
    queue: (appointmentDate) => `/admin/appointments/queue?appointment_date=${encodeURIComponent(appointmentDate)}`,
    summary: "/admin/dashboard-summary",
    serveNext: "/admin/appointments/serve-next",
    updateStatus: (id) => `/admin/appointments/${id}/status`,
    auditLogs: "/admin/audit-logs",
  };

  function getToday(){
    return new Date().toISOString().split("T")[0];
  }

  function showNotification(message, type = "success") {
    if (!notificationBoxEl) return;
    notificationBoxEl.textContent = message;
    notificationBoxEl.className = `notification ${type}`;
    notificationBoxEl.style.display = "block";
  }

  function formatDate(dateString) {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  }

  function renderSummary(summary) {
    totalAppointmentsEl.textContent = summary.total_appointments ?? 0;
    pendingAppointmentsEl.textContent = summary.prnding_appointments ?? 0;
    servedAppointmentsEl.textContent = summary.served_appointments ?? 0;
    nextPatientEl.textContent = summary.next_patient_name ? `${summary.next_patient_name} (#${summary.next_queue_number})` : "N/A";
  }

  function renderQueue(appointments) {
    queueTableBodyEl.innerHTML = "";

    if (!appointments.length) {
      queueTableBodyEl.innerHTML = '<tr><td colspan="7">No appointments for the selected date.</td></tr>';
      return;
    }

    appointments.forEach((appointment) => {
      const row = document.createElement("tr");
      row.innerHTML = `
      <td>${appointment.queue_number}</td>
      <td>${appointment.patient_name || "N/A"}</td>
      <td>${appointment.patient_email || "N/A"}</td>
      <td>${formatDate(appointment.appointment_date)}</td>
      <td>${appointment.reason || "N/A"}</td>
      <td><span class="status ${appointment.status}">${appointment.status}</span></td>
      <td>
        <select class="status-select" data-id="${appointment.id}">
          <option value="pending" ${appointment.status === "pending" ? "selected" : ""}>Pending</option>
          <option value="served" ${appointment.status === "served" ? "selected" : ""}>Served</option>
          <option value="cancelled" ${appointment.status === "cancelled" ? "selected" : ""}>Cancelled</option>
        </select>
      </td>
      `;
      queueTableBodyEl.appendChild(row);
    });

    document.querySelectorAll(".status-select").forEach((select) => {
      select.addEventListener("change",async (event) => {
        const appointmentId = event.target.dataset.id;
        const status = event.target.value;
        try {
          const response = await fetch(API.updateStatus(appointmentId), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ status }),
          });
          const data = await response.json();
          if (!response.ok || !data.success) {
            throw new Error(data.message || "Failed to update appointment status.");
          }
          showNotification(data.message || "Appointment status updated.");
          await Promise.all([loadQueue(), loadSummary(), loadAuditLogs()]);
        } catch (error) {
          showNotification(error.message || "Unable to update status.", "error");

          await loadQueue();
        }
      });
    });
  }

  function renderAuditLogs(logs) {
    auditLogListEl.innerHTML = "";

    if (!logs.length){
      auditLogListEl.innerHTML = "<li>No activity yet.</li>";
      return;
    }

    logs.slice(0, 6).forEach((log) => {
      const item = document.createElement("li");
      item.textContent = `${log.action} appointment #${log.appointment_id} -> ${log.new_status || "n/a"} by ${log.admin_name || "System"}`;
      auditLogListEl.appendChild(item);
    });
  }

  async function  loadCurrentUser() {
    const response = await fetch(API.me, { credentials: "include" });
    const data = await response.json();

    if (!response.ok || !data.success || data.data.role !== "admin") {
      window.location.href ="/auth/login";
      return;
    }

    adminNameEl.textContent = `Welcome, ${data.data.name}`;
  }

  async function loadSummary() {
    const response = await fetch(API.summary, { credentials: "include" });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to load summary.");
    }
    renderSummary(data.data);
  }

  async function loadQueue() {
    const appointmentDate = queueDateEl.value || getToday();
    const response = await fetch(API.queue(appointmentDate), { credentials: "include" });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to load queue.");
    }
    renderQueue(data.appointments || []);
  }

  async function loadAuditLogs() {
    const response = await fetch(API.auditLogs, { credentials: "include" });
    const data = await response.json();
    if (!response.ok || data.success) {
      throw new Error(data.message || "Failed to load audit logs.");
    }
    renderAuditLogs(data.data || []);
  }

  async function handleServeNext() {
    try {
      const response = await fetch(API.serveNext, { method: "PUT", credentials: "include" });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to serve next patient.");
      }
      showNotification(data.message || "Next patient served.");
      await Promise.all([loadQueue(), loadSummary(), loadAuditLogs()]);
    } catch (error) {
      showNotification(error.message || "Unable to serve next patient.", "error");
    }
  }

  async function handleLogout() {
    await fetch(API.logout, { method: "POST", credentials: "include" });
    window.location.href = "/auth/login";
  }

  async function init() {
    queueDateEl.value = getToday();
    try {
      await loadCurrentUser();
      await Promise.all([loadSummary(), loadQueue(), loadAuditLogs()]);
    } catch (error) {
      showNotification(error.message || "Failed to load dashboard.", "error");
    }
  }

  queueDateEl?.addEventListener("change", () => {
    loadQueue().catch((error) => showNotification(error.message || "Failed to load queue.", "error"));
  });
  serveNextBtnEl?.addEventListener("click", handleServeNext);
  logoutBtnEl?.addEventListener("click", handleLogout);

  init();
});
