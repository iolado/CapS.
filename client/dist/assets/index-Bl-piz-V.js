(function () {
  const e = document.createElement("link").relList;
  if (e && e.supports && e.supports("modulepreload")) return;
  for (const i of document.querySelectorAll('link[rel="modulepreload"]')) o(i);
  new MutationObserver((i) => {
    for (const c of i)
      if (c.type === "childList")
        for (const u of c.addedNodes)
          u.tagName === "LINK" && u.rel === "modulepreload" && o(u);
  }).observe(document, { childList: !0, subtree: !0 });
  function r(i) {
    const c = {};
    return (
      i.integrity && (c.integrity = i.integrity),
      i.referrerPolicy && (c.referrerPolicy = i.referrerPolicy),
      i.crossOrigin === "use-credentials"
        ? (c.credentials = "include")
        : i.crossOrigin === "anonymous"
        ? (c.credentials = "omit")
        : (c.credentials = "same-origin"),
      c
    );
  }
  function o(i) {
    if (i.ep) return;
    i.ep = !0;
    const c = r(i);
    fetch(i.href, c);
  }
})();
const W = "http://localhost:3001",
  O = document.querySelector("#auth-section"),
  x = document.querySelector("#register-form"),
  M = document.querySelector("#login-form"),
  q = document.querySelector("#tree-form"),
  D = document.querySelector("#skill-form"),
  $ = document.querySelector("#tree-list"),
  v = document.querySelector("#skill-list"),
  b = document.querySelector("#skill-map"),
  K = document.querySelector("#status-message"),
  H = document.querySelector("#current-user-message"),
  N = document.querySelector("#logout-button"),
  U = document.querySelector("#tree-detail-section"),
  j = document.querySelector("#selected-tree-title"),
  A = document.querySelector("#selected-tree-description"),
  B = document.querySelector("#tree-summary-message"),
  V = document.querySelector("#edit-tree-button"),
  Y = document.querySelector("#delete-tree-button");
let a = null,
  L = [],
  s = null,
  g = [];
function n(t) {
  K.textContent = t;
}
function J() {
  if (!a) {
    localStorage.removeItem("skill-tree-user-id");
    return;
  }
  localStorage.setItem("skill-tree-user-id", String(a.id));
}
function k() {
  (s = null),
    (g = []),
    U.classList.add("hidden"),
    (j.textContent = "Tree Details"),
    (A.textContent = "Choose a tree to manage its skills."),
    (B.textContent = "No tree selected."),
    (v.innerHTML = ""),
    (b.innerHTML = "");
}
function P() {
  if (!a) {
    O.classList.remove("hidden"),
      q.classList.add("hidden"),
      N.classList.add("hidden"),
      (H.textContent = "Log in to see your trees."),
      ($.innerHTML = ""),
      k();
    return;
  }
  O.classList.add("hidden"),
    q.classList.remove("hidden"),
    N.classList.remove("hidden"),
    (H.textContent = `Welcome, ${a.name}.`);
}
async function d(t, e = {}) {
  const r = await fetch(`${W}${t}`, e),
    o = await r.json();
  if (!r.ok) throw new Error(o.error || "Something went wrong.");
  return o;
}
function _(t) {
  return t === "in_progress"
    ? "In Progress"
    : t === "completed"
    ? "Completed"
    : t === "available"
    ? "Available"
    : "Locked";
}
function F(t) {
  ($.innerHTML = ""),
    t.forEach((e) => {
      const r = document.createElement("li");
      (r.className = "tree-item"),
        s && s.id === e.id && r.classList.add("is-selected"),
        (r.innerHTML = `
      <h3>${e.title}</h3>
      <p>${e.description || "No description yet."}</p>
      <p><strong>Visibility:</strong> ${e.is_public ? "Public" : "Private"}</p>
    `);
      const o = document.createElement("div");
      o.className = "tree-actions";
      const i = document.createElement("button");
      (i.className = "small-button"),
        (i.type = "button"),
        (i.textContent = "Open Tree"),
        i.addEventListener("click", () => {
          m(e.id);
        }),
        o.appendChild(i),
        r.appendChild(o),
        $.appendChild(r);
    });
}
function z(t) {
  if (((b.innerHTML = ""), !t.length)) {
    b.innerHTML = "<p>No skills yet. Add your first skill below.</p>";
    return;
  }
  t.forEach((e) => {
    const r = document.createElement("article");
    (r.className = `skill-map-card status-${e.status}`),
      (r.innerHTML = `
      <h3>${e.title}</h3>
      <p>${e.description || "No description yet."}</p>
      <p><strong>Status:</strong> ${_(e.status)}</p>
      <p><strong>Difficulty:</strong> ${e.difficulty || "Not set"}</p>
      <p><strong>Prerequisites:</strong> ${
        e.prerequisites.length
          ? e.prerequisites.map((o) => o.prerequisite_title).join(", ")
          : "None"
      }</p>
    `),
      b.appendChild(r);
  });
}
function w(t, e, r) {
  const o = document.createElement("button");
  return (
    (o.className = "progress-button"),
    (o.type = "button"),
    (o.textContent = r),
    o.addEventListener("click", async () => {
      try {
        await d(`/api/skills/${t}/progress`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: a.id, status: e }),
        }),
          n("Progress updated."),
          await m(s.id);
      } catch (i) {
        n(i.message);
      }
    }),
    o
  );
}
function G(t) {
  if (((v.innerHTML = ""), !t.length)) {
    v.innerHTML = "<li class='skill-item'>No skills yet. Add one above.</li>";
    return;
  }
  t.forEach((e) => {
    const r = document.createElement("li");
    (r.className = "skill-item"),
      (r.innerHTML = `
      <h3>${e.title}</h3>
      <p>${e.description || "No description yet."}</p>
      <p><strong>Difficulty:</strong> ${e.difficulty || "Not set"}</p>
      <p><strong>Status:</strong> ${_(e.status)}</p>
    `);
    const o = document.createElement("ul");
    (o.className = "prerequisite-list"),
      e.prerequisites.length ||
        (o.innerHTML = "<li>No prerequisites yet.</li>"),
      e.prerequisites.forEach((l) => {
        const p = document.createElement("li");
        p.textContent = l.prerequisite_title;
        const y = document.createElement("button");
        (y.className = "small-button"),
          (y.type = "button"),
          (y.textContent = "Remove"),
          y.addEventListener("click", async () => {
            try {
              await d(
                `/api/skills/${e.id}/prerequisites/${l.id}?userId=${a.id}`,
                { method: "DELETE" }
              ),
                n("Prerequisite removed."),
                await m(s.id);
            } catch (E) {
              n(E.message);
            }
          }),
          p.appendChild(document.createTextNode(" ")),
          p.appendChild(y),
          o.appendChild(p);
      }),
      r.appendChild(o);
    const i = document.createElement("div");
    (i.className = "progress-row"),
      i.appendChild(w(e.id, "locked", "Set Locked")),
      i.appendChild(w(e.id, "in_progress", "Start")),
      i.appendChild(w(e.id, "completed", "Complete")),
      r.appendChild(i);
    const c = document.createElement("div");
    c.className = "skill-actions";
    const u = document.createElement("button");
    (u.className = "small-button"),
      (u.type = "button"),
      (u.textContent = "Edit Skill"),
      u.addEventListener("click", async () => {
        const l = prompt("Update the skill title:", e.title);
        if (!l) return;
        const p = prompt("Update the skill description:", e.description || ""),
          y = prompt("Update the skill difficulty:", e.difficulty || "");
        try {
          await d(`/api/skills/${e.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: a.id,
              title: l,
              description: p || "",
              difficulty: y || "",
            }),
          }),
            n("Skill updated."),
            await m(s.id);
        } catch (E) {
          n(E.message);
        }
      });
    const f = document.createElement("button");
    (f.className = "small-button"),
      (f.type = "button"),
      (f.textContent = "Delete Skill"),
      f.addEventListener("click", async () => {
        if (confirm(`Delete "${e.title}"?`))
          try {
            await d(`/api/skills/${e.id}?userId=${a.id}`, { method: "DELETE" }),
              n("Skill deleted."),
              await m(s.id);
          } catch (p) {
            n(p.message);
          }
      }),
      c.appendChild(u),
      c.appendChild(f),
      r.appendChild(c);
    const S = document.createElement("div");
    S.className = "inline-select-row";
    const C = document.createElement("select"),
      R = t.filter((l) => l.id !== e.id);
    C.innerHTML = `
      <option value="">Choose prerequisite</option>
      ${R.map((l) => `<option value="${l.id}">${l.title}</option>`).join("")}
    `;
    const h = document.createElement("button");
    (h.className = "small-button"),
      (h.type = "button"),
      (h.textContent = "Add Prerequisite"),
      h.addEventListener("click", async () => {
        if (!C.value) {
          n("Choose a skill first.");
          return;
        }
        try {
          await d(`/api/skills/${e.id}/prerequisites`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: a.id,
              prerequisiteSkillId: Number(C.value),
            }),
          }),
            n("Prerequisite added."),
            await m(s.id);
        } catch (l) {
          n(l.message);
        }
      }),
      S.appendChild(C),
      S.appendChild(h),
      r.appendChild(S),
      v.appendChild(r);
  });
}
function Q(t) {
  const e = t.filter((r) => r.status === "completed").length;
  B.textContent = `${e} of ${t.length} skills completed.`;
}
async function T() {
  if (a)
    try {
      if (
        ((L = (await d(`/api/trees?userId=${a.id}`)).trees),
        F(L),
        s && L.find((r) => r.id === s.id))
      ) {
        await m(s.id);
        return;
      }
      k();
    } catch (t) {
      n(t.message);
    }
}
async function m(t) {
  try {
    const e = await d(`/api/trees/${t}?userId=${a.id}`);
    (s = e.tree),
      (g = e.skills),
      (j.textContent = e.tree.title),
      (A.textContent = e.tree.description || "No description yet."),
      U.classList.remove("hidden"),
      F(L),
      Q(g),
      z(g),
      G(g);
  } catch (e) {
    n(e.message);
  }
}
async function I(t, e) {
  (a = t), J(), P(), n(e), await T();
}
async function X() {
  const t = localStorage.getItem("skill-tree-user-id");
  if (t)
    try {
      const e = await d(`/api/auth/me?userId=${t}`);
      await I(e.user, "Welcome back.");
    } catch {
      localStorage.removeItem("skill-tree-user-id");
    }
}
x.addEventListener("submit", async (t) => {
  t.preventDefault();
  try {
    const e = await d("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: document.querySelector("#register-name").value,
        email: document.querySelector("#register-email").value,
        password: document.querySelector("#register-password").value,
      }),
    });
    x.reset(), await I(e.user, "Account created. You are now logged in.");
  } catch (e) {
    n(e.message);
  }
});
M.addEventListener("submit", async (t) => {
  t.preventDefault();
  try {
    const e = await d("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: document.querySelector("#login-email").value,
        password: document.querySelector("#login-password").value,
      }),
    });
    M.reset(), await I(e.user, "Logged in successfully.");
  } catch (e) {
    n(e.message);
  }
});
q.addEventListener("submit", async (t) => {
  t.preventDefault();
  try {
    await d("/api/trees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: a.id,
        title: document.querySelector("#tree-title").value,
        description: document.querySelector("#tree-description").value,
        isPublic: document.querySelector("#tree-public").checked,
      }),
    }),
      n("Tree created."),
      q.reset(),
      await T();
  } catch (e) {
    n(e.message);
  }
});
D.addEventListener("submit", async (t) => {
  if ((t.preventDefault(), !s)) {
    n("Choose a tree first.");
    return;
  }
  try {
    await d(`/api/trees/${s.id}/skills`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: a.id,
        title: document.querySelector("#skill-title").value,
        description: document.querySelector("#skill-description").value,
        difficulty: document.querySelector("#skill-difficulty").value,
      }),
    }),
      D.reset(),
      n("Skill added."),
      await m(s.id);
  } catch (e) {
    n(e.message);
  }
});
V.addEventListener("click", async () => {
  if (!s) {
    n("Choose a tree first.");
    return;
  }
  const t = prompt("Update the tree title:", s.title);
  if (!t) return;
  const e = prompt("Update the tree description:", s.description || "");
  try {
    await d(`/api/trees/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: a.id,
        title: t,
        description: e || "",
        isPublic: s.is_public,
      }),
    }),
      n("Tree updated."),
      await T();
  } catch (r) {
    n(r.message);
  }
});
Y.addEventListener("click", async () => {
  if (!s) {
    n("Choose a tree first.");
    return;
  }
  if (confirm(`Delete "${s.title}"?`))
    try {
      await d(`/api/trees/${s.id}?userId=${a.id}`, { method: "DELETE" }),
        k(),
        await T(),
        n("Tree deleted.");
    } catch (e) {
      n(e.message);
    }
});
N.addEventListener("click", () => {
  (a = null), J(), P(), n("Logged out.");
});
P();
X();
