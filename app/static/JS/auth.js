document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const authMessage = document.getElementById("authMessage");
  const roleField = document.getElementById("role");
  const adminCodeGroup = document.getElementById("adminCodeGroup");
  const adminCodeField = document.getElementById("adminCode");

  function showMessage(message, type = "success") {
    if (!authMessage) return;
    authMessage.textContent = message;
    authMessage.className = `notification ${type}`;
    authMessage.style.display = "block";
  }

  function toggleAdminCodeField() {
    if (!roleField || !adminCodeGroup || !adminCodeField) return;

    const isAdmin = roleField.value === "admin";
    adminCodeGroup.classList.toggle("hidden", !isAdmin);
    adminCodeField.required = isAdmin;

    if (!isAdmin) {
      adminCodeField.value = "";
    }
  }

  async function parseApiResponse(response) {
    const rawBody = await response.text();

    if (!rawBody.trim()) {
      throw new Error(
        "The server returned an empty response. Make sure you opened the app through the flask server, not the HTML file."
      );
    }

    try {
      return JSON.parse(rawBody);
    } catch (error) {
      throw new Error(
        "The server did not return JSON. Make sure you opened the app through the flask server, not raw HTML file."
      );
    }
  }

  if (roleField) {
    toggleAdminCodeField();
    roleField.addEventListener("change", toggleAdminCodeField);
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;

      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({ email, password })
        });

        const data = await parseApiResponse(response);

        if (!response.ok) {
          throw new Error(data.message || "Login failed.");
        }

        showMessage(data.message || "Login successful.", "success");

        if (data.data.role === "patient") {
          window.location.href = "/patient/dashboard";
        } else if (data.data.role === "admin") {
          window.location.href = "/admin/dashboard";
        }
      } catch (error) {
        showMessage(error.message || "Something went wrong.", "error");
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const role = roleField ? roleField.value : "patient";
      const name = document.getElementById("name").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      const adminCode = adminCodeField ? adminCodeField.value.trim() : "";

      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ name, email, password, role, admin_code: adminCode })
        });

        const data = await parseApiResponse(response);

        if (!response.ok) {
          throw new Error(data.message || "Registration failed.");
        }

        showMessage(data.message || "Registration successful. Redirecting to login...", "success");

        setTimeout(() => {
          window.location.href = "/auth/login";
        }, 1500);
      } catch (error) {
        showMessage(error.message || "Ooops!! Something went wrong.", "error");
      }
    });
  }
});
