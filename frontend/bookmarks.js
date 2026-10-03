const API_BASE = window.API_BASE_URL.replace(/\/$/, "");
const list = document.querySelector("#resource-list");
const notice = document.querySelector("#notice");
const emptyState = document.querySelector("#empty-state");

function getUserId() {
  let userId = localStorage.getItem("resource-finder-user");
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem("resource-finder-user", userId);
  }
  return userId;
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  if (!response.ok) throw new Error("Couldn't update your bookmarks. Please try again.");
  return response.status === 204 ? null : response.json();
}

function cardFor(resource) {
  const card = document.createElement("article");
  card.className = "resource-card";
  const heading = document.createElement("h3");
  heading.textContent = resource.title;
  const subject = document.createElement("p");
  subject.className = "subject-name";
  subject.textContent = resource.subject;
  const description = document.createElement("p");
  description.className = "description";
  description.textContent = resource.description;
  const meta = document.createElement("p");
  meta.className = "resource-meta";
  meta.textContent = `Semester ${resource.semester} · Unit ${resource.unit} · ${resource.resource_type}`;
  const actions = document.createElement("div");
  actions.className = "card-actions";
  const open = document.createElement("a");
  open.className = "button";
  open.href = resource.url;
  open.target = "_blank";
  open.rel = "noopener noreferrer";
  open.setAttribute("aria-label", `Open ${resource.title} in a new tab`);
  open.textContent = "Open resource (new tab)";
  const remove = document.createElement("button");
  remove.className = "button button-secondary";
  remove.type = "button";
  remove.textContent = "Remove bookmark";
  remove.addEventListener("click", async () => {
    remove.disabled = true;
    try {
      await request(`/api/bookmarks/${resource.id}?user_id=${encodeURIComponent(getUserId())}`, { method: "DELETE" });
      card.remove();
      if (!list.children.length) emptyState.hidden = false;
      notice.textContent = "Bookmark removed.";
      notice.hidden = false;
    } catch (error) {
      remove.disabled = false;
      notice.textContent = error.message;
      notice.classList.add("error");
      notice.hidden = false;
    }
  });
  actions.append(open, remove);
  card.append(heading, subject, description, meta, actions);
  return card;
}

async function loadBookmarks() {
  list.setAttribute("aria-busy", "true");
  try {
    const resources = await request(`/api/bookmarks?user_id=${encodeURIComponent(getUserId())}`);
    list.replaceChildren(...resources.map(cardFor));
    emptyState.hidden = resources.length > 0;
  } catch (_) {
    notice.textContent = "Couldn't load your bookmarks. Check your connection and try again.";
    notice.classList.add("error");
    notice.hidden = false;
  } finally {
    list.setAttribute("aria-busy", "false");
  }
}

loadBookmarks();
