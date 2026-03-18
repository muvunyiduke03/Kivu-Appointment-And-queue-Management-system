document.addEventListener("DOMContentLoaded", () => {
  const patientNameEl = document.getElementById("patientName");
  const logoutBtnEl = document.getElementById("logoutBtn");

  const bookingFormEl = document.getElementById("bookingForm");
  const appointmentDateEl = document.getElementById("appointmentDate");
  const reasonEl = document.getElementById("reason");

  const appointmentsTableBodyEl = document.getElementById("appointmentsTableBody");
  const nextAppointmentEl = document.getElementById("nextAppointment");
  const queueNumberEl = document.getElementById("queueNumber");
  const currentStatusEl = document.getElementById("currentStatus");
  const totalAppointmnetsEl = document.getElementById("totalAppointments");

  const notificationBox = document.getElementById("notificationBox");

  const API = {
    me:"/api/auth/me",
    logout: "/api/auth/logout",
    myAppointments: "/api/appointments/my",
    bookAppointment: "/api/appointments/book",
    cancelAppointment: (id) => `/api/appointments/${id}/cancel`,
  };

  let appointments = [];

  function showNotification(message, type = "success") {
    if (!notificationBox) return;

    notificationBox.textContent = message;
    notificationBox.className = `notification ${type}`;
    notificationBox.style.display = "block";

    setTimeout(() => {
      notificationBox.style.display = "none";
      notificationBox.textContent = "";
    }, 4000);
  }

  function formatDate(dateString) {
    if(!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }

  function getStatusClass(status) {
    if (!status) return "";
    return status.toLowerCase();
  }

  function getNextActiveAppointment(list) {
    const activeAppointments = list
      .filter((appointment) => appointment.status !== "cancelled")
      .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date));
    
      return activeAppointments.length ? activeAppointments[0] : null;
  }

  function updateSummaryCards(){
    if (!appointments.length) {
      if (nextAppointmentEl) nextAppointmentEl.textContent = "N/A";
      if (queueNumberEl) queueNumberEl.textContent = "N/A";
      if (currentStatusEl) {
        currentStatusEl.textContent = "N/A";
        currentStatusEl.className = "status";
      }
      if (totalAppointmnetsEl) totalAppointmnetsEl.textContent = "0";
      return;
    }

    const nextAppointment = getNextActiveAppointment(appointments);

    if (nextAppointmentEl) {
      nextAppointmentEl.textContent = nextAppointment ? formatDate(nextAppointment.appointment_date) : "N/A";
    }

    if (queueNumberEl) {
      queueNumberEl.textContent = nextAppointment ? nextAppointment.queue_number : "N/A";
    }

    if (currentStatusEl) {
      currentStatusEl.textContent = nextAppointment ? nextAppointment.status : "N/A";
      currentStatusEl.className = `status ${nextAppointment ? getStatusClass(nextAppointment.status) : ""}`;
    }

    if (totalAppointmnetsEl) {
      totalAppointmnetsEl.textContent = String(appointments.length);
    }
  }

  function renderAppointments() {
    if (!appointmentsTableBodyEl) return;

    appointmentsTableBodyEl.innerHTML = "";

    if (!appointments.length) {
      appointmentsTableBodyEl.innerHTML = `
      <tr>
        <td colspan="5">No appointments found.</td>
      </tr>
      `;
      updateSummaryCards();
      return;
    }

    appointments
      .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date))
      .forEach((appointment) => {
        const row = document.createElement("tr");

        const canCancel = appointment.status === "pending";

        row.innerHTML = `
        <td>${formatDate(appointment.appointment_date)}</td>
        <td>${appointment.reason || "N/A"}</td>
        <td>${appointment.queue_number}</td>
        <td>
          <span class="status ${getStatusClass(appointment.status)}">${appointment.status}</span>
        </td>
        <td>${canCancel
              ? `<button class="cancel-btn" data-id="${appointment.id}">Cancel</button>`
              : `<button class="disabled-btn" disabled>N/A</button>`
        }
        </td>
        `;

        appointmentsTableBodyEl.appendChild(row);
      });
    addCancelButtonListeners();
    updateSummaryCards();
  }

  function addCancelButtonListeners() {
    const cancelButtons = document.querySelectorAll(".cancel-btn");

    cancelButtons.forEach((button) => {
      button.addEventListener("click", async () => {
        const appointmentId = button.dataset.id;
        if (!appointmentId) return;

        const confirmed = window.confirm("Are you sure you want to cancel this appointment?");
        if (!confirmed) return;

        try {
          const response = await fetch(API.cancelAppointment(appointmentId), {
            method: "PUT",
            headers: {
              "content-type": "application/json",
            },
            credentials: "include",
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || "Failed to cancel appointment.");
          }

          showNotification(data.message || "Appointment cancelled successfully.", "success");
          await loadAppointments();
        } catch (error) {
          showNotification(error.message || "Something went wrong.", "error");
        }
      });
    });
  }

  async function loadCurrentUser() {
    try {
      const response = await fetch(API.me, {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        window.location.href = "/auth/login";
        return;
      }

      if (patientNameEl) {
        patientNameEl.textContent = data.data.name || "Patient";
      }
    } catch (error) {
      window.location.href = "/auth/login";
    }
  }

  async function loadAppointments() {
    try {
      const response = await fetch(API.myAppointments, {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load appointments.");
      }

      appointments = data.data || [];
      renderAppointments();
    } catch (error) {
      showNotification(error.message || "Failed to load appointments.", "error");
    }
  }

  async function handleBooking(event) {
    event.preventDefault();

    const appointmentDate = appointmentDateEl ? appointmentDateEl.value : "";
    const reason = reasonEl ? reasonEl.value.trim() : "";

    if (!appointmentDate) {
      showNotification("Please select an appointment date.", "error");
      return;
    }

    try {
      const response = await fetch(API.bookAppointment, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          appointment_date: appointmentDate,
          reason: reason,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to book appointment.");
      }

      showNotification(
        `${data.message} Queue number: ${data.data.queue_number}`,
        "success"
      );

      if (bookingFormEl) bookingFormEl.reset();

      await loadAppointments();
    } catch (error) {
      showNotification(error.message || "Ooops! Something went wrong.", "error");
    }
  }

  async function handleLogout() {
    try {
      const response = await fetch(API.logout, {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Logout failed");
      }

      window.location.href = "/auth/login";
    } catch (error) {
      showNotification(error.message || "Failed to logout.", "error");
    }
  }

  async function initDashboard() {
    await loadCurrentUser();
    await loadAppointments();
  }

  if (bookingFormEl) {
    bookingFormEl.addEventListener("submit", handleBooking);
  }

  if (logoutBtnEl) {
    logoutBtnEl.addEventListener("click", handleLogout);
  }

  initDashboard();
});
