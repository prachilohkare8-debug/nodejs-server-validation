const ALLOWED_TOPICS = new Set(["General question", "Technical issue", "Course enquiry", "Feedback"]);

function validateContact(input) {
  const errors = {};
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const topic = typeof input.topic === "string" ? input.topic.trim() : "";
  const message = typeof input.message === "string" ? input.message.trim() : "";

  if (name.length < 2 || name.length > 60) {
    errors.name = "Name must contain between 2 and 60 characters.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120) {
    errors.email = "Enter a valid email address (maximum 120 characters).";
  }
  if (!ALLOWED_TOPICS.has(topic)) {
    errors.topic = "Choose a topic from the provided list.";
  }
  if (message.length < 10 || message.length > 1000) {
    errors.message = "Message must contain between 10 and 1000 characters.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    cleaned: { name, email, topic, message }
  };
}

module.exports = { validateContact };
