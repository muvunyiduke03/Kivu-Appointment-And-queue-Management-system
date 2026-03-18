document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const RegisterForm = document.getElementById("registerForm");
  const authMessage = document.getElementById("authMessage");

  function showMessage(message, type = "success") {
    if (!authMessage) return;
    authMessage.textContent = message;
    authMessage.className = `notification ${type}`;
    authMessage.style.display = "block";
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;

      try{
        const response = await fetch ("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();

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

      const name = document.getElementById("name").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;

      try{
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

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
