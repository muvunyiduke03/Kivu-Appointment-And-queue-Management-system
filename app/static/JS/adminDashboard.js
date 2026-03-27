document.addEventListener("DOMContentLoaded", () => {
  const adminNameEl = document.getElementById("adminName");
  const logoutBtnEl = document.getElementById("logoutBtn");
  const queueDateEl = document.getElementById("queueDate");
  const serveNextBtnEl = document.getElementById("serveNextBtn");
  const notificationBoxEl = document.getElementById("notificationBox");
  const saveAvailabilityBtnEl = document.getElementById("saveAvailabilityBtn");
  const availabilityDaysContainerEl = document.getElementById("availabilityDaysContainer");
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
    summary: (appointmentDate) => `/admin/dashboard-summary?appointment_date=${encodeURIComponent(appointmentDate)}`,
    serveNext: "/admin/appointments/serve-next",
    updateStatus: (id) => `/admin/appointments/${id}/status`,
    auditLogs: "/admin/audit-logs",
    availabilityDays: "/admin/availability-days",
  };

  const WEEKDAY_LABELS = {
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    sunday: "Sunday",
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
    pendingAppointmentsEl.textContent = summary.pending_appointments ?? 0;
    servedAppointmentsEl.textContent = summary.served_appointments ?? 0;
    nextPatientEl.textContent = summary.next_patient_name ? `${summary.next_patient_name} (#${summary.next_queue_number})` : "N/A";
  }

  function renderQueue(appointments) {
    queueTableBodyEl.innerHTML = "";

    if (!appointments.length) {
      queueTableBodyEl.innerHTML = '<tr><td colspan="8">No appointments for the selected date.</td></tr>';
      return;
    }

    appointments.forEach((appointment) => {
      const row = document.createElement("tr");
      row.innerHTML = `
      <td>${appointment.queue_number}</td>
      <td>${appointment.patient_name || "N/A"}</td>
      <td>${appointment.patient_email || "N/A"}</td>
      <td>${formatDate(appointment.appointment_date)}</td>
      <td>${appointment.appointment_time || "N/A"}</td>
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
      select.addEventListener("change", async (event) => {
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

    if (!logs.length) {
      auditLogListEl.innerHTML = "<li>No activity yet.</li>";
      return;
    }

    logs.slice(0, 6).forEach((log) => {
      const item = document.createElement("li");
      item.textContent = `${log.action} appointment #${log.appointment_id} -> ${log.new_status || "n/a"} by ${log.admin_name || "System"}`;
      auditLogListEl.appendChild(item);
    });
  }

  function renderAvailabilityDays(days) {
    if (!availabilityDaysContainerEl) return;
    availabilityDaysContainerEl.innerHTML = "";

    days.forEach((day) => {
      const wrapper = document.createElement("label");
      wrapper.className = "weekday-item";
      wrapper.innerHTML = `
        <input type="checkbox" class="weekday-checkbox" value="${day.weekday}" ${day.enabled ? "checked" : ""}>
        <span>${WEEKDAY_LABELS[day.weekday] || day.weekday}</span>
      `;
      availabilityDaysContainerEl.appendChild(wrapper);
    });
  }

  function getSelectedAvailabilityDays() {
    return Array.from(document.querySelectorAll(".weekday-checkbox:checked")).map((checkbox) => checkbox.value);
  }

  async function  loadCurrentUser() {
    const response = await fetch(API.me, { credentials: "include" });
    const data = await response.json();

    if (!response.ok || !data.success || data.data.role !== "admin") {
      window.location.href = "/auth/login";
      return;
    }

    adminNameEl.textContent = `Welcome, ${data.data.name}`;
  }

  async function loadSummary() {
    const appointmentDate = queueDateEl.value || getToday();
    const response = await fetch(API.summary(appointmentDate), { credentials: "include" });
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
    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to load audit logs.");
    }
    renderAuditLogs(data.data || []);
  }

  async function loadAvailabilityDays() {
    const response = await fetch(API.availabilityDays, { credentials: "include" });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to load available appointment days.");
    }
    renderAvailabilityDays(data.data || []);
  }

  async function saveAvailabilityDays() {
    const selectedDays = getSelectedAvailabilityDays();
    const response = await fetch(API.availabilityDays, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days: selectedDays }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to update appointment days.");
    }

    renderAvailabilityDays(data.data || []);
    showNotification(data.message || "Appointment days updated successfully!!", "success");
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
      await Promise.all([loadSummary(), loadQueue(), loadAuditLogs(), loadAvailabilityDays()]);
    } catch (error) {
      showNotification(error.message || "Failed to load dashboard.", "error");
    }
  }

  queueDateEl?.addEventListener("change", () => {
    Promise.all([loadQueue(), loadSummary()]).catch((error) => showNotification(error.message || "Failed to load dashboard data.", "error"));
  });
  serveNextBtnEl?.addEventListener("click", handleServeNext);
  saveAvailabilityBtnEl?.addEventListener("click", () => {
    saveAvailabilityDays().catch((error) => showNotification(error.message || "Failed to update appointment days.", "error"));
  });
  logoutBtnEl?.addEventListener("click", handleLogout);

  init();
});
