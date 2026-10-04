const API_BASE = window.API_BASE_URL.replace(/\/$/, "");
const resourceList = document.querySelector("#resource-list");
const notice = document.querySelector("#notice");
const emptyState = document.querySelector("#empty-state");
const searchInput = document.querySelector("#search");
let searchTimer;

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
    if (!response.ok) {
        let message = "Something went wrong. Please try again.";
        try {
            const body = await response.json();
            message = body.detail || message;
        } catch (_) {
            /* Keep the helpful fallback message. */
        }
        throw new Error(message);
    }
    return response.status === 204 ? null : response.json();
}

function showNotice(message, isError = false) {
    notice.textContent = message;
    notice.classList.toggle("error", isError);
    notice.hidden = false;
}

async function copyResourceLink(url) {
    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        return;
    }
    const fallback = document.createElement("textarea");
    fallback.value = url;
    fallback.setAttribute("readonly", "");
    fallback.style.position = "fixed";
    fallback.style.opacity = "0";
    document.body.append(fallback);
    fallback.select();
    const copied = document.execCommand("copy");
    fallback.remove();
    if (!copied) throw new Error("The link could not be copied automatically.");
}

function addOption(select, value, label = value) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.append(option);
}

async function loadFilters() {
    const [subjects, bookmarkData] = await Promise.all([
        request("/api/subjects"),
        request(`/api/bookmarks?user_id=${encodeURIComponent(getUserId())}`),
    ]);
    const subjectSelect = document.querySelector("#subject-filter");
    subjects.forEach((subject) => addOption(subjectSelect, subject.name));
    for (let semester = 1; semester <= 8; semester += 1)
        addOption(document.querySelector("#semester-filter"), semester, `Semester ${semester}`);
    for (let unit = 1; unit <= 10; unit += 1) addOption(document.querySelector("#unit-filter"), unit, `Unit ${unit}`);
    ["Notes", "Question Paper", "Assignment", "Reference", "Video", "Other"].forEach((type) =>
        addOption(document.querySelector("#type-filter"), type),
    );
    return new Set(bookmarkData.map((resource) => resource.id));
}

function makeCard(resource, bookmarked) {
    const article = document.createElement("article");
    article.className = "resource-card";
    const top = document.createElement("div");
    top.className = "card-top";
    const titleGroup = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = resource.title;
    const subject = document.createElement("p");
    subject.className = "subject-name";
    subject.textContent = resource.subject;
    titleGroup.append(title, subject);
    const type = document.createElement("span");
    type.className = "eyebrow";
    type.textContent = resource.resource_type;
    top.append(titleGroup, type);
    const description = document.createElement("p");
    description.className = "description";
    description.textContent = resource.description;
    const meta = document.createElement("p");
    meta.className = "resource-meta";
    [`Semester ${resource.semester}`, `Unit ${resource.unit}`].forEach((text) => {
        const item = document.createElement("span");
        item.textContent = text;
        meta.append(item);
    });
    const actions = document.createElement("div");
    actions.className = "card-actions";
    const open = document.createElement("a");
    open.className = "button";
    open.href = resource.url;
    open.target = "_blank";
    open.rel = "noopener noreferrer";
    open.textContent = "Open resource (new tab)";
    open.setAttribute("aria-label", `Open ${resource.title} in a new tab`);
    const copy = document.createElement("button");
    copy.className = "button button-secondary";
    copy.type = "button";
    copy.textContent = "Copy link";
    copy.setAttribute("aria-label", `Copy link for ${resource.title}`);
    copy.addEventListener("click", async () => {
        copy.disabled = true;
        try {
            await copyResourceLink(resource.url);
            showNotice("Resource link copied.");
        } catch (error) {
            showNotice(error.message || "Couldn't copy the resource link.", true);
        } finally {
            copy.disabled = false;
        }
    });
    const bookmark = document.createElement("button");
    bookmark.className = "button button-secondary";
    bookmark.type = "button";
    bookmark.textContent = bookmarked ? "Remove bookmark" : "Bookmark";
    bookmark.addEventListener("click", (event) => changeBookmark(event.currentTarget, resource, bookmarked));
    actions.append(open, copy, bookmark);
    article.append(top, description, meta, actions);
    return article;
}

async function changeBookmark(button, resource, alreadyBookmarked) {
    button.disabled = true;
    try {
        const userId = encodeURIComponent(getUserId());
        if (alreadyBookmarked) {
            await request(`/api/bookmarks/${resource.id}?user_id=${userId}`, { method: "DELETE" });
            await loadResources();
            showNotice("Bookmark removed.");
        } else {
            await request("/api/bookmarks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ resource_id: resource.id, user_id: getUserId() }),
            });
            await loadResources();
            showNotice("Resource saved to your bookmarks.");
        }
    } catch (error) {
        showNotice(error.message || "Couldn't update your bookmark. Please try again.", true);
        button.disabled = false;
    }
}

async function loadResources() {
    resourceList.setAttribute("aria-busy", "true");
    emptyState.hidden = true;
    try {
        const params = new URLSearchParams();
        if (searchInput.value.trim()) params.set("search", searchInput.value.trim());
        for (const [id, key] of [
            ["subject-filter", "subject"],
            ["semester-filter", "semester"],
            ["unit-filter", "unit"],
            ["type-filter", "type"],
        ]) {
            const value = document.getElementById(id).value;
            if (value) params.set(key, value);
        }
        const suffix = params.toString() ? `?${params}` : "";
        const [list, bookmarkData] = await Promise.all([
            request(`/api/resources${suffix}`),
            request(`/api/bookmarks?user_id=${encodeURIComponent(getUserId())}`),
        ]);
        const saved = new Set(bookmarkData.map((resource) => resource.id));
        resourceList.replaceChildren(...list.map((resource) => makeCard(resource, saved.has(resource.id))));
        document.querySelector("#result-count").textContent =
            `${list.length} ${list.length === 1 ? "resource" : "resources"} found`;
        emptyState.hidden = list.length > 0;
        notice.hidden = true;
    } catch (error) {
        resourceList.replaceChildren();
        showNotice(error.message || "Couldn't load resources. Please try again.", true);
    } finally {
        resourceList.setAttribute("aria-busy", "false");
    }
}

document
    .querySelectorAll("#subject-filter, #semester-filter, #unit-filter, #type-filter")
    .forEach((select) => select.addEventListener("change", loadResources));
searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadResources, 180);
});
document.querySelector("#clear-filters").addEventListener("click", () => {
    searchInput.value = "";
    document.querySelectorAll(".filter-grid select").forEach((select) => {
        select.value = "";
    });
    searchInput.focus();
    loadResources();
});
document.addEventListener("keydown", (event) => {
    const target = event.target;
    const typing = target.matches("input, textarea, select, [contenteditable='true']");
    if (event.key === "/" && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        searchInput.focus();
    }
});

loadFilters()
    .then(loadResources)
    .catch((error) => {
        resourceList.setAttribute("aria-busy", "false");
        showNotice(error.message || "Couldn't connect to the resource service.", true);
    });
