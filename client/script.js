// This is the deployed backend URL.
const API_URL = "https://caps-api.onrender.com";

// These grab the forms and page elements from index.html.
const authSection = document.querySelector("#auth-section");
const registerForm = document.querySelector("#register-form");
const loginForm = document.querySelector("#login-form");
const treeForm = document.querySelector("#tree-form");
const treeList = document.querySelector("#tree-list");
const statusMessage = document.querySelector("#status-message");
const currentUserMessage = document.querySelector("#current-user-message");
const logoutButton = document.querySelector("#logout-button");

// This stores the logged-in user in the browser while the page is open.
let currentUser = null;

// This updates the status message on the page.
function setStatus(message) {
  statusMessage.textContent = message;
}

// This updates the page when the user logs in or logs out.
function updatePageForCurrentUser() {
  if (!currentUser) {
    authSection.classList.remove("hidden");
    treeForm.classList.add("hidden");
    logoutButton.classList.add("hidden");
    currentUserMessage.textContent = "Log in to see your trees.";
    treeList.innerHTML = "";
    return;
  }

  authSection.classList.add("hidden");
  treeForm.classList.remove("hidden");
  logoutButton.classList.remove("hidden");
  currentUserMessage.textContent = `Welcome, ${currentUser.name}.`;
}

// This shows the list of trees on the page.
function renderTrees(trees) {
  // This clears the old list before rendering again.
  treeList.innerHTML = "";

  // This loops through each tree and adds it to the page.
  trees.forEach((tree) => {
    const listItem = document.createElement("li");
    listItem.className = "tree-item";
    listItem.innerHTML = `
      <h3>${tree.title}</h3>
      <p>${tree.description || "No description yet."}</p>
    `;
    treeList.appendChild(listItem);
  });
}

// This loads the current user's trees from the server.
async function loadTrees() {
  // This stops the function if no one is logged in.
  if (!currentUser) {
    return;
  }

  // This sends a request to get the user's trees.
  const response = await fetch(`${API_URL}/api/trees?userId=${currentUser.id}`);
  // This turns the response into JSON.
  const data = await response.json();
  // This shows the trees on the page.
  renderTrees(data.trees);
}

// This logs the user into the page after register or login.
async function setCurrentUser(user, message) {
  currentUser = user;
  updatePageForCurrentUser();
  setStatus(message);
  await loadTrees();
}

// This runs when the register form is submitted.
registerForm.addEventListener("submit", async (event) => {
  // This stops the page from reloading.
  event.preventDefault();

  // This sends the register form values to the server.
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: document.querySelector("#register-name").value,
      email: document.querySelector("#register-email").value,
      password: document.querySelector("#register-password").value,
    }),
  });

  // This turns the response into JSON.
  const data = await response.json();

  // This shows an error message if the request failed.
  if (!response.ok) {
    setStatus(data.error);
    return;
  }

  // This clears the form fields.
  registerForm.reset();
  // This updates the page and treats the new account like a logged-in user.
  await setCurrentUser(data.user, "Account created. You are now logged in.");
});

// This runs when the login form is submitted.
loginForm.addEventListener("submit", async (event) => {
  // This stops the page from reloading.
  event.preventDefault();

  // This sends the login form values to the server.
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: document.querySelector("#login-email").value,
      password: document.querySelector("#login-password").value,
    }),
  });

  // This turns the response into JSON.
  const data = await response.json();

  // This shows an error message if the request failed.
  if (!response.ok) {
    setStatus(data.error);
    return;
  }

  // This clears the login form.
  loginForm.reset();
  // This updates the page and saves the logged-in user.
  await setCurrentUser(data.user, "Logged in successfully.");
});

// This runs when the tree form is submitted.
treeForm.addEventListener("submit", async (event) => {
  // This stops the page from reloading.
  event.preventDefault();

  // This sends the tree form values to the server.
  const response = await fetch(`${API_URL}/api/trees`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: currentUser.id,
      title: document.querySelector("#tree-title").value,
      description: document.querySelector("#tree-description").value,
      isPublic: document.querySelector("#tree-public").checked,
    }),
  });

  // This turns the response into JSON.
  const data = await response.json();

  // This shows an error message if the request failed.
  if (!response.ok) {
    setStatus(data.error);
    return;
  }

  // This shows a success message.
  setStatus("Tree created.");
  // This clears the form.
  treeForm.reset();
  // This reloads the tree list.
  await loadTrees();
});

// This logs the user out on the page.
logoutButton.addEventListener("click", () => {
  currentUser = null;
  updatePageForCurrentUser();
  setStatus("Logged out.");
});

// This sets the correct page view when the page first loads.
updatePageForCurrentUser();
