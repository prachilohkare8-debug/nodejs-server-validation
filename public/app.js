const form = document.querySelector("#contact-form");
const submitButton = document.querySelector("#submit-button");
const messageInput = document.querySelector("#message");
const charCount = document.querySelector("#char-count");
const feedback = document.querySelector("#form-feedback");
let attempted = false;

function clearErrors() {
  document.querySelectorAll("[data-error]").forEach((node) => { node.textContent = ""; });
}
function showErrors(errors = {}) {
  clearErrors();
  Object.entries(errors).forEach(([field, message]) => {
    const node = document.querySelector(`[data-error="${field}"]`);
    if (node) node.textContent = message;
  });
}
function readForm() {
  return {
    name: document.querySelector("#name").value,
    email: document.querySelector("#email").value,
    topic: document.querySelector("#topic").value,
    message: messageInput.value
  };
}
function showFeedback(status, data) {
  feedback.hidden = false;
  feedback.className = `form-feedback ${status >= 200 && status < 300 ? "success" : "failure"}`;
  const label = status === 201 ? "201 Created" : status === 422 ? "422 Validation Error" : status === 400 ? "400 Bad Request" : status === 413 ? "413 Payload Too Large" : status === 0 ? "Server unavailable" : `${status} Response`;
  feedback.replaceChildren();
  const title = document.createElement("strong");
  title.textContent = `${label} — ${data.message || (status >= 200 && status < 300 ? "Message submitted successfully." : "Please check the details and try again.")}`;
  feedback.appendChild(title);
}
messageInput.addEventListener("input", () => {
  charCount.textContent = `${messageInput.value.length} / 1000`;
  if (attempted) clearErrors();
});
form.addEventListener("input", () => { if (attempted) clearErrors(); });
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  attempted = true;
  submitButton.disabled = true;
  submitButton.textContent = "Sending request…";
  feedback.hidden = true;
  try {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(readForm())
    });
    const data = await response.json();
    showErrors(data.errors || {});
    showFeedback(response.status, data);
    if (response.ok) {
      form.reset();
      charCount.textContent = "0 / 1000";
      attempted = false;
    }
  } catch (error) {
    showFeedback(0, { message: "Could not reach the Node.js server. Make sure it is running." });
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = 'Submit message <span>→</span>';
  }
});
