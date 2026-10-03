const API_BASE = window.API_BASE_URL.replace(/\/$/, "");
const form = document.querySelector("#resource-form");
const message = document.querySelector("#form-message");
const fieldNames = ["title", "description", "subject", "semester", "unit", "resource_type", "url"];
const urlKind = document.querySelector("#url-kind");
const urlInput = document.querySelector("#url");
const urlHint = document.querySelector("#url-hint");

function localPathToFileUrl(value) {
  if (/^file:/i.test(value)) return value;
  if (/^[A-Za-z]:[\\/]/.test(value)) {
    return `file:///${value.replaceAll("\\", "/")}`;
  }
  if (value.startsWith("/")) return `file://${value}`;
  return value;
}

async function loadSuggestions() {
  try {
    const response = await fetch(`${API_BASE}/api/subjects`);
    if (!response.ok) return;
    const subjects = await response.json();
    const options = document.querySelector("#subjects-list");
    subjects.forEach((subject) => {
      const option = document.createElement("option");
      option.value = subject.name;
      options.append(option);
    });
  } catch (_) {
    // Students can still enter a subject while the suggestion service is unavailable.
  }
}

function addChoices(id, count, label) {
  const select = document.getElementById(id);
  for (let value = 1; value <= count; value += 1) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = `${label} ${value}`;
    select.append(option);
  }
}

function validateField(name) {
  const control = form.elements[name];
  const error = document.getElementById(`${name}-error`);
  let problem = "";
  if (!control.value.trim()) problem = "Please fill in this field.";
  else if ((name === "title" || name === "subject") && control.value.trim().length < 2) problem = "Enter at least 2 characters.";
  else if (name === "description" && control.value.trim().length < 2) problem = "Enter a short description.";
  else if (name === "url") {
    const value = urlKind.value === "file" ? localPathToFileUrl(control.value.trim()) : control.value.trim();
    try {
      const parsed = new URL(value);
      const isFileUrl = parsed.protocol === "file:";
      const validProtocol = urlKind.value === "file"
        ? isFileUrl && (parsed.pathname || parsed.hostname)
        : ["http:", "https:"].includes(parsed.protocol) && parsed.hostname;
      if (!validProtocol) {
        problem = urlKind.value === "file"
          ? "Enter a file:/// URL or an absolute local path."
          : "Use a link starting with http:// or https://.";
      }
    } catch (_) {
      problem = urlKind.value === "file"
        ? "Enter a file:/// URL or an absolute local path."
        : "Enter a complete web address, including https://.";
    }
  }
  error.textContent = problem;
  error.hidden = !problem;
  control.setAttribute("aria-invalid", String(Boolean(problem)));
  return !problem;
}

fieldNames.forEach((name) => {
  const control = form.elements[name];
  control.addEventListener("blur", () => validateField(name));
  control.addEventListener("input", () => {
    if (control.getAttribute("aria-invalid") === "true") validateField(name);
  });
  control.addEventListener("change", () => {
    if (control.getAttribute("aria-invalid") === "true") validateField(name);
  });
});

urlKind.addEventListener("change", () => {
  const localFile = urlKind.value === "file";
  urlInput.placeholder = localFile ? "file:///home/student/notes.pdf" : "https://...";
  urlInput.inputMode = localFile ? "text" : "url";
  urlHint.textContent = localFile
    ? "Use a file URL such as file:///home/student/notes.pdf. The file is not uploaded."
    : "Use a link starting with https:// or http://.";
  if (urlInput.value) validateField("url");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.hidden = true;
  const invalid = fieldNames.filter((name) => !validateField(name));
  if (invalid.length) {
    message.textContent = `Please fix ${invalid.length === 1 ? "the highlighted field" : "the highlighted fields"} before submitting.`;
    message.classList.add("error");
    message.hidden = false;
    document.getElementById(invalid[0]).focus();
    return;
  }
  const submit = form.querySelector("[type='submit']");
  submit.disabled = true;
  submit.textContent = "Adding…";
  const data = Object.fromEntries(new FormData(form));
  if (urlKind.value === "file") data.url = localPathToFileUrl(data.url.trim());
  data.semester = Number(data.semester);
  data.unit = Number(data.unit);
  try {
    const response = await fetch(`${API_BASE}/api/resources`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    if (!response.ok) {
      let detail = "The resource could not be added. Please check the details and try again.";
      try {
        const result = await response.json();
        if (typeof result.detail === "string") detail = result.detail;
      } catch (_) { /* Use the plain-language fallback. */ }
      throw new Error(detail);
    }
    form.reset();
    urlInput.placeholder = "https://...";
    urlInput.inputMode = "url";
    urlHint.textContent = "Use a link starting with https:// or http://.";
    message.classList.remove("error");
    message.replaceChildren(document.createTextNode("Resource added. "));
    const backLink = document.createElement("a");
    backLink.href = "index.html";
    backLink.textContent = "Return to the resource list";
    message.append(backLink, document.createTextNode("."));
    message.hidden = false;
    message.focus();
  } catch (error) {
    message.textContent = error.message || "Couldn't add this resource. Please check your connection and try again.";
    message.classList.add("error");
    message.hidden = false;
    message.focus();
  } finally {
    submit.disabled = false;
    submit.textContent = "Add resource";
  }
});

addChoices("semester", 8, "Semester");
addChoices("unit", 10, "Unit");
const typeSelect = document.querySelector("#resource_type");
["Notes", "Question Paper", "Assignment", "Reference", "Video", "Other"].forEach((type) => {
  const option = document.createElement("option");
  option.value = type;
  option.textContent = type;
  typeSelect.append(option);
});
loadSuggestions();
