// This is the built JavaScript file for the frontend.
// It contains the code that runs the page in the browser.
(function () {
  // This gets the browser support list for link rel values.
  const e = document.createElement("link").relList;
  // This stops the extra preload work if the browser already supports modulepreload.
  if (e && e.supports && e.supports("modulepreload")) return;
  // This looks through all existing modulepreload links on the page.
  for (const t of document.querySelectorAll('link[rel="modulepreload"]')) f(t);
  // This watches the page for new modulepreload links that might be added later.
  new MutationObserver((t) => {
    // This loops through each page change.
    for (const n of t)
      // This checks if the change added new child elements.
      if (n.type === "childList")
        // This loops through the new nodes that were added.
        for (const u of n.addedNodes)
          // This checks if the new node is a modulepreload link.
          u.tagName === "LINK" && u.rel === "modulepreload" && f(u);
    // This tells the observer to watch the whole document.
  }).observe(document, { childList: !0, subtree: !0 });
  // This builds the fetch options for a preload request.
  function o(t) {
    // This stores the fetch settings in an object.
    const n = {};
    return (
      // This copies the integrity setting if there is one.
      t.integrity && (n.integrity = t.integrity),
      // This copies the referrer policy if there is one.
      t.referrerPolicy && (n.referrerPolicy = t.referrerPolicy),
      // This chooses the correct credentials mode for the request.
      t.crossOrigin === "use-credentials"
        ? (n.credentials = "include")
        : t.crossOrigin === "anonymous"
        ? (n.credentials = "omit")
        : (n.credentials = "same-origin"),
      // This returns the finished fetch options object.
      n
    );
  }
  // This preloads one module file.
  function f(t) {
    // This stops the same file from being preloaded more than once.
    if (t.ep) return;
    // This marks the link as already processed.
    t.ep = !0;
    // This gets the fetch options for the preload request.
    const n = o(t);
    // This fetches the module file in advance.
    fetch(t.href, n);
  }
})();
// This stores the backend API URL from the frontend environment.
const a = void 0,
  // This gets the section that contains the auth forms.
  p = document.querySelector("#auth-section"),
  // This gets the register form.
  y = document.querySelector("#register-form"),
  // This gets the login form.
  g = document.querySelector("#login-form"),
  // This gets the create-tree form.
  c = document.querySelector("#tree-form"),
  // This gets the list that will show saved trees.
  d = document.querySelector("#tree-list"),
  // This gets the status message area.
  v = document.querySelector("#status-message"),
  // This gets the text area that welcomes the current user.
  h = document.querySelector("#current-user-message"),
  // This gets the logout button.
  l = document.querySelector("#logout-button");
// This stores the logged-in user in memory.
let s = null;
// This updates the status message on the page.
function i(r) {
  // This puts the message text on the page.
  v.textContent = r;
}
// This switches the page between logged-out and logged-in states.
function m() {
  // This checks if there is no logged-in user.
  if (!s) {
    // This shows the auth section.
    p.classList.remove("hidden"),
      // This hides the tree form.
      c.classList.add("hidden"),
      // This hides the logout button.
      l.classList.add("hidden"),
      // This shows the default dashboard message.
      (h.textContent = "Log in to see your trees."),
      // This clears the tree list.
      (d.innerHTML = "");
    // This stops the function here for the logged-out state.
    return;
  }
  // This hides the auth section after login.
  p.classList.add("hidden"),
    // This shows the tree form.
    c.classList.remove("hidden"),
    // This shows the logout button.
    l.classList.remove("hidden"),
    // This shows the current user's name.
    (h.textContent = `Welcome, ${s.name}.`);
}
// This renders the list of saved trees.
function w(r) {
  // This clears the old tree list first.
  (d.innerHTML = ""),
    // This loops through every tree.
    r.forEach((e) => {
      // This creates one list item for the tree.
      const o = document.createElement("li");
      // This gives the list item its CSS class.
      (o.className = "tree-item"),
        // This fills the list item with the tree title and description.
        (o.innerHTML = `
      <h3>${e.title}</h3>
      <p>${e.description || "No description yet."}</p>
    `),
        // This adds the finished tree item to the page.
        d.appendChild(o);
    });
}
// This loads the current user's trees from the backend.
async function S() {
  // This stops the function if nobody is logged in.
  if (!s) return;
  // This fetches the current user's trees and turns the response into JSON.
  const e = await (await fetch(`${a}/api/trees?userId=${s.id}`)).json();
  // This shows the tree list on the page.
  w(e.trees);
}
// This saves the logged-in user and refreshes the dashboard.
async function L(r, e) {
  // This stores the user in memory.
  (s = r), m(), i(e), await S();
}
// This handles the register form.
y.addEventListener("submit", async (r) => {
  // This stops the browser from reloading the page.
  r.preventDefault();
  // This sends the register form values to the backend.
  const e = await fetch(`${a}/api/auth/register`, {
      // This tells fetch to use POST.
      method: "POST",
      // This tells the backend that JSON is being sent.
      headers: { "Content-Type": "application/json" },
      // This builds the JSON body from the form values.
      body: JSON.stringify({
        name: document.querySelector("#register-name").value,
        email: document.querySelector("#register-email").value,
        password: document.querySelector("#register-password").value,
      }),
    }),
    // This turns the response into JSON.
    o = await e.json();
  // This shows an error if the request failed.
  if (!e.ok) {
    i(o.error);
    return;
  }
  // This clears the register form.
  y.reset(), await L(o.user, "Account created. You are now logged in.");
});
// This handles the login form.
g.addEventListener("submit", async (r) => {
  // This stops the browser from reloading the page.
  r.preventDefault();
  // This sends the login form values to the backend.
  const e = await fetch(`${a}/api/auth/login`, {
      // This tells fetch to use POST.
      method: "POST",
      // This tells the backend that JSON is being sent.
      headers: { "Content-Type": "application/json" },
      // This builds the JSON body from the form values.
      body: JSON.stringify({
        email: document.querySelector("#login-email").value,
        password: document.querySelector("#login-password").value,
      }),
    }),
    // This turns the response into JSON.
    o = await e.json();
  // This shows an error if the request failed.
  if (!e.ok) {
    i(o.error);
    return;
  }
  // This clears the login form and updates the page.
  g.reset(), await L(o.user, "Logged in successfully.");
});
// This handles creating a new tree.
c.addEventListener("submit", async (r) => {
  // This stops the browser from reloading the page.
  r.preventDefault();
  // This sends the tree form values to the backend.
  const e = await fetch(`${a}/api/trees`, {
      // This tells fetch to use POST.
      method: "POST",
      // This tells the backend that JSON is being sent.
      headers: { "Content-Type": "application/json" },
      // This builds the JSON body from the form values.
      body: JSON.stringify({
        userId: s.id,
        title: document.querySelector("#tree-title").value,
        description: document.querySelector("#tree-description").value,
        isPublic: document.querySelector("#tree-public").checked,
      }),
    }),
    // This turns the response into JSON.
    o = await e.json();
  // This shows an error if the request failed.
  if (!e.ok) {
    i(o.error);
    return;
  }
  // This shows a success message, clears the form, and reloads the trees.
  i("Tree created."), c.reset(), await S();
});
// This handles logging out on the page.
l.addEventListener("click", () => {
  // This clears the current user and switches the page back to logged out.
  (s = null), m(), i("Logged out.");
});
// This sets the right page state when the app first loads.
m();
