// This reads the backend URL from the Vite environment variable.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// These grab the forms and page elements from index.html.
const authSection = document.querySelector("#auth-section");
const registerForm = document.querySelector("#register-form");
const loginForm = document.querySelector("#login-form");
const treeForm = document.querySelector("#tree-form");
const skillForm = document.querySelector("#skill-form");
const treeList = document.querySelector("#tree-list");
const skillList = document.querySelector("#skill-list");
const skillMap = document.querySelector("#skill-map");
const statusMessage = document.querySelector("#status-message");
const currentUserMessage = document.querySelector("#current-user-message");
const logoutButton = document.querySelector("#logout-button");
const treeDetailSection = document.querySelector("#tree-detail-section");
const selectedTreeTitle = document.querySelector("#selected-tree-title");
const selectedTreeDescription = document.querySelector("#selected-tree-description");
const treeSummaryMessage = document.querySelector("#tree-summary-message");
const editTreeButton = document.querySelector("#edit-tree-button");
const deleteTreeButton = document.querySelector("#delete-tree-button");

// These store the current state while the page is open.
let currentUser = null;
let currentTrees = [];
let selectedTree = null;
let selectedTreeSkills = [];

// This updates the status message on the page.
function setStatus(message) {
  statusMessage.textContent = message;
}

// This stores the current user in local storage.
function saveCurrentUser() {
  if (!currentUser) {
    localStorage.removeItem("skill-tree-user-id");
    return;
  }

  localStorage.setItem("skill-tree-user-id", String(currentUser.id));
}

// This clears the selected tree state.
function clearSelectedTree() {
  selectedTree = null;
  selectedTreeSkills = [];
  treeDetailSection.classList.add("hidden");
  selectedTreeTitle.textContent = "Tree Details";
  selectedTreeDescription.textContent = "Choose a tree to manage its skills.";
  treeSummaryMessage.textContent = "No tree selected.";
  skillList.innerHTML = "";
  skillMap.innerHTML = "";
}

// This updates the page when the user logs in or logs out.
function updatePageForCurrentUser() {
  if (!currentUser) {
    authSection.classList.remove("hidden");
    treeForm.classList.add("hidden");
    logoutButton.classList.add("hidden");
    currentUserMessage.textContent = "Log in to see your trees.";
    treeList.innerHTML = "";
    clearSelectedTree();
    return;
  }

  authSection.classList.add("hidden");
  treeForm.classList.remove("hidden");
  logoutButton.classList.remove("hidden");
  currentUserMessage.textContent = `Welcome, ${currentUser.name}.`;
}

// This sends a JSON request to the backend.
async function sendRequest(path, options = {}) {
  // This sends the request to the API.
  const response = await fetch(`${API_URL}${path}`, options);
  // This turns the response into JSON.
  const data = await response.json();

  // This throws an error when the request fails.
  if (!response.ok) {
    throw new Error(data.error || "Something went wrong.");
  }

  // This returns the JSON data when the request succeeds.
  return data;
}

// This turns a skill status into readable text.
function getStatusLabel(status) {
  if (status === "in_progress") {
    return "In Progress";
  }

  if (status === "completed") {
    return "Completed";
  }

  if (status === "available") {
    return "Available";
  }

  return "Locked";
}

// This shows the list of trees on the page.
function renderTrees(trees) {
  // This clears the old list before rendering again.
  treeList.innerHTML = "";

  // This loops through each tree and adds it to the page.
  trees.forEach((tree) => {
    const listItem = document.createElement("li");
    listItem.className = "tree-item";

    // This highlights the currently selected tree.
    if (selectedTree && selectedTree.id === tree.id) {
      listItem.classList.add("is-selected");
    }

    listItem.innerHTML = `
      <h3>${tree.title}</h3>
      <p>${tree.description || "No description yet."}</p>
      <p><strong>Visibility:</strong> ${tree.is_public ? "Public" : "Private"}</p>
    `;

    // This creates the button row for each tree.
    const actions = document.createElement("div");
    actions.className = "tree-actions";

    // This opens the tree detail view.
    const viewButton = document.createElement("button");
    viewButton.className = "small-button";
    viewButton.type = "button";
    viewButton.textContent = "Open Tree";
    viewButton.addEventListener("click", () => {
      loadTreeDetails(tree.id);
    });

    actions.appendChild(viewButton);
    listItem.appendChild(actions);
    treeList.appendChild(listItem);
  });
}

// This shows a simple visual map of the current tree.
function renderSkillMap(skills) {
  // This clears the old map first.
  skillMap.innerHTML = "";

  // This shows a simple message when no skills exist yet.
  if (!skills.length) {
    skillMap.innerHTML = "<p>No skills yet. Add your first skill below.</p>";
    return;
  }

  // This loops through each skill and builds one map card.
  skills.forEach((skill) => {
    const card = document.createElement("article");
    card.className = `skill-map-card status-${skill.status}`;
    card.innerHTML = `
      <h3>${skill.title}</h3>
      <p>${skill.description || "No description yet."}</p>
      <p><strong>Status:</strong> ${getStatusLabel(skill.status)}</p>
      <p><strong>Difficulty:</strong> ${skill.difficulty || "Not set"}</p>
      <p><strong>Prerequisites:</strong> ${
        skill.prerequisites.length
          ? skill.prerequisites.map((prerequisite) => prerequisite.prerequisite_title).join(", ")
          : "None"
      }</p>
    `;
    skillMap.appendChild(card);
  });
}

// This creates one status button for a skill.
function createProgressButton(skillId, status, label) {
  // This makes a new button element.
  const button = document.createElement("button");
  button.className = "progress-button";
  button.type = "button";
  button.textContent = label;

  // This updates the skill status when clicked.
  button.addEventListener("click", async () => {
    try {
      await sendRequest(`/api/skills/${skillId}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          status,
        }),
      });
      setStatus("Progress updated.");
      await loadTreeDetails(selectedTree.id);
    } catch (error) {
      setStatus(error.message);
    }
  });

  // This returns the finished button.
  return button;
}

// This shows the list of skills on the page.
function renderSkills(skills) {
  // This clears the old list before rendering again.
  skillList.innerHTML = "";

  // This shows a simple message when no skills exist yet.
  if (!skills.length) {
    skillList.innerHTML = "<li class='skill-item'>No skills yet. Add one above.</li>";
    return;
  }

  // This loops through each skill and builds one list item.
  skills.forEach((skill) => {
    const listItem = document.createElement("li");
    listItem.className = "skill-item";
    listItem.innerHTML = `
      <h3>${skill.title}</h3>
      <p>${skill.description || "No description yet."}</p>
      <p><strong>Difficulty:</strong> ${skill.difficulty || "Not set"}</p>
      <p><strong>Status:</strong> ${getStatusLabel(skill.status)}</p>
    `;

    // This creates the prerequisite list for the skill.
    const prerequisiteList = document.createElement("ul");
    prerequisiteList.className = "prerequisite-list";

    // This adds a simple empty state for prerequisite rows.
    if (!skill.prerequisites.length) {
      prerequisiteList.innerHTML = "<li>No prerequisites yet.</li>";
    }

    // This adds each prerequisite row.
    skill.prerequisites.forEach((prerequisite) => {
      const prerequisiteItem = document.createElement("li");
      prerequisiteItem.textContent = prerequisite.prerequisite_title;

      // This adds a delete button for each prerequisite.
      const removeButton = document.createElement("button");
      removeButton.className = "small-button";
      removeButton.type = "button";
      removeButton.textContent = "Remove";
      removeButton.addEventListener("click", async () => {
        try {
          await sendRequest(
            `/api/skills/${skill.id}/prerequisites/${prerequisite.id}?userId=${currentUser.id}`,
            {
              method: "DELETE",
            }
          );
          setStatus("Prerequisite removed.");
          await loadTreeDetails(selectedTree.id);
        } catch (error) {
          setStatus(error.message);
        }
      });

      prerequisiteItem.appendChild(document.createTextNode(" "));
      prerequisiteItem.appendChild(removeButton);
      prerequisiteList.appendChild(prerequisiteItem);
    });

    listItem.appendChild(prerequisiteList);

    // This builds the progress button row.
    const progressRow = document.createElement("div");
    progressRow.className = "progress-row";
    progressRow.appendChild(createProgressButton(skill.id, "locked", "Set Locked"));
    progressRow.appendChild(createProgressButton(skill.id, "in_progress", "Start"));
    progressRow.appendChild(createProgressButton(skill.id, "completed", "Complete"));
    listItem.appendChild(progressRow);

    // This creates the skill action buttons.
    const skillActions = document.createElement("div");
    skillActions.className = "skill-actions";

    // This lets the user edit a skill with simple prompt windows.
    const editButton = document.createElement("button");
    editButton.className = "small-button";
    editButton.type = "button";
    editButton.textContent = "Edit Skill";
    editButton.addEventListener("click", async () => {
      const title = prompt("Update the skill title:", skill.title);
      if (!title) {
        return;
      }

      const description = prompt("Update the skill description:", skill.description || "");
      const difficulty = prompt("Update the skill difficulty:", skill.difficulty || "");

      try {
        await sendRequest(`/api/skills/${skill.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            title,
            description: description || "",
            difficulty: difficulty || "",
          }),
        });
        setStatus("Skill updated.");
        await loadTreeDetails(selectedTree.id);
      } catch (error) {
        setStatus(error.message);
      }
    });

    // This lets the user delete a skill.
    const deleteButton = document.createElement("button");
    deleteButton.className = "small-button";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete Skill";
    deleteButton.addEventListener("click", async () => {
      const confirmed = confirm(`Delete "${skill.title}"?`);
      if (!confirmed) {
        return;
      }

      try {
        await sendRequest(`/api/skills/${skill.id}?userId=${currentUser.id}`, {
          method: "DELETE",
        });
        setStatus("Skill deleted.");
        await loadTreeDetails(selectedTree.id);
      } catch (error) {
        setStatus(error.message);
      }
    });

    skillActions.appendChild(editButton);
    skillActions.appendChild(deleteButton);
    listItem.appendChild(skillActions);

    // This builds the prerequisite dropdown row.
    const prerequisiteRow = document.createElement("div");
    prerequisiteRow.className = "inline-select-row";

    // This creates the select element for choosing a prerequisite skill.
    const prerequisiteSelect = document.createElement("select");
    const availableSkills = skills.filter((candidate) => candidate.id !== skill.id);

    prerequisiteSelect.innerHTML = `
      <option value="">Choose prerequisite</option>
      ${availableSkills
        .map((candidate) => `<option value="${candidate.id}">${candidate.title}</option>`)
        .join("")}
    `;

    // This creates the button that saves a new prerequisite.
    const addPrerequisiteButton = document.createElement("button");
    addPrerequisiteButton.className = "small-button";
    addPrerequisiteButton.type = "button";
    addPrerequisiteButton.textContent = "Add Prerequisite";
    addPrerequisiteButton.addEventListener("click", async () => {
      if (!prerequisiteSelect.value) {
        setStatus("Choose a skill first.");
        return;
      }

      try {
        await sendRequest(`/api/skills/${skill.id}/prerequisites`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            prerequisiteSkillId: Number(prerequisiteSelect.value),
          }),
        });
        setStatus("Prerequisite added.");
        await loadTreeDetails(selectedTree.id);
      } catch (error) {
        setStatus(error.message);
      }
    });

    prerequisiteRow.appendChild(prerequisiteSelect);
    prerequisiteRow.appendChild(addPrerequisiteButton);
    listItem.appendChild(prerequisiteRow);
    skillList.appendChild(listItem);
  });
}

// This updates the summary message for one tree.
function renderTreeSummary(skills) {
  // This counts completed skills.
  const completedCount = skills.filter((skill) => skill.status === "completed").length;
  // This writes a simple summary line.
  treeSummaryMessage.textContent = `${completedCount} of ${skills.length} skills completed.`;
}

// This loads all trees for the current user.
async function loadDashboard() {
  // This stops the function if no one is logged in.
  if (!currentUser) {
    return;
  }

  try {
    // This gets the current user's trees from the server.
    const data = await sendRequest(`/api/trees?userId=${currentUser.id}`);
    currentTrees = data.trees;
    renderTrees(currentTrees);

    // This reloads the selected tree if it still exists.
    if (selectedTree) {
      const treeStillExists = currentTrees.find((tree) => tree.id === selectedTree.id);

      if (treeStillExists) {
        await loadTreeDetails(selectedTree.id);
        return;
      }
    }

    clearSelectedTree();
  } catch (error) {
    setStatus(error.message);
  }
}

// This loads the details for one selected tree.
async function loadTreeDetails(treeId) {
  try {
    // This gets the full tree detail object from the backend.
    const data = await sendRequest(`/api/trees/${treeId}?userId=${currentUser.id}`);
    selectedTree = data.tree;
    selectedTreeSkills = data.skills;
    selectedTreeTitle.textContent = data.tree.title;
    selectedTreeDescription.textContent = data.tree.description || "No description yet.";
    treeDetailSection.classList.remove("hidden");
    renderTrees(currentTrees);
    renderTreeSummary(selectedTreeSkills);
    renderSkillMap(selectedTreeSkills);
    renderSkills(selectedTreeSkills);
  } catch (error) {
    setStatus(error.message);
  }
}

// This logs the user into the page after register or login.
async function setCurrentUser(user, message) {
  currentUser = user;
  saveCurrentUser();
  updatePageForCurrentUser();
  setStatus(message);
  await loadDashboard();
}

// This restores the logged-in user when the page reloads.
async function restoreSavedUser() {
  // This reads the saved user id from local storage.
  const savedUserId = localStorage.getItem("skill-tree-user-id");

  // This stops when no user id is saved.
  if (!savedUserId) {
    return;
  }

  try {
    // This asks the backend for the saved user.
    const data = await sendRequest(`/api/auth/me?userId=${savedUserId}`);
    await setCurrentUser(data.user, "Welcome back.");
  } catch {
    localStorage.removeItem("skill-tree-user-id");
  }
}

// This runs when the register form is submitted.
registerForm.addEventListener("submit", async (event) => {
  // This stops the page from reloading.
  event.preventDefault();

  try {
    // This sends the register form values to the server.
    const data = await sendRequest("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: document.querySelector("#register-name").value,
        email: document.querySelector("#register-email").value,
        password: document.querySelector("#register-password").value,
      }),
    });

    // This clears the form fields.
    registerForm.reset();
    // This updates the page and treats the new account like a logged-in user.
    await setCurrentUser(data.user, "Account created. You are now logged in.");
  } catch (error) {
    setStatus(error.message);
  }
});

// This runs when the login form is submitted.
loginForm.addEventListener("submit", async (event) => {
  // This stops the page from reloading.
  event.preventDefault();

  try {
    // This sends the login form values to the server.
    const data = await sendRequest("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: document.querySelector("#login-email").value,
        password: document.querySelector("#login-password").value,
      }),
    });

    // This clears the login form.
    loginForm.reset();
    // This updates the page and saves the logged-in user.
    await setCurrentUser(data.user, "Logged in successfully.");
  } catch (error) {
    setStatus(error.message);
  }
});

// This runs when the tree form is submitted.
treeForm.addEventListener("submit", async (event) => {
  // This stops the page from reloading.
  event.preventDefault();

  try {
    // This sends the tree form values to the server.
    await sendRequest("/api/trees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUser.id,
        title: document.querySelector("#tree-title").value,
        description: document.querySelector("#tree-description").value,
        isPublic: document.querySelector("#tree-public").checked,
      }),
    });

    // This shows a success message.
    setStatus("Tree created.");
    // This clears the form.
    treeForm.reset();
    // This reloads the dashboard.
    await loadDashboard();
  } catch (error) {
    setStatus(error.message);
  }
});

// This runs when the skill form is submitted.
skillForm.addEventListener("submit", async (event) => {
  // This stops the page from reloading.
  event.preventDefault();

  // This stops the request if no tree is selected.
  if (!selectedTree) {
    setStatus("Choose a tree first.");
    return;
  }

  try {
    // This sends the skill form values to the server.
    await sendRequest(`/api/trees/${selectedTree.id}/skills`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUser.id,
        title: document.querySelector("#skill-title").value,
        description: document.querySelector("#skill-description").value,
        difficulty: document.querySelector("#skill-difficulty").value,
      }),
    });

    // This clears the form.
    skillForm.reset();
    // This shows a success message.
    setStatus("Skill added.");
    // This reloads the selected tree.
    await loadTreeDetails(selectedTree.id);
  } catch (error) {
    setStatus(error.message);
  }
});

// This opens a simple prompt flow for editing the selected tree.
editTreeButton.addEventListener("click", async () => {
  // This stops the action when no tree is selected.
  if (!selectedTree) {
    setStatus("Choose a tree first.");
    return;
  }

  const title = prompt("Update the tree title:", selectedTree.title);
  if (!title) {
    return;
  }

  const description = prompt(
    "Update the tree description:",
    selectedTree.description || ""
  );

  try {
    // This sends the updated tree values to the backend.
    await sendRequest(`/api/trees/${selectedTree.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUser.id,
        title,
        description: description || "",
        isPublic: selectedTree.is_public,
      }),
    });

    // This shows a success message.
    setStatus("Tree updated.");
    // This reloads the dashboard and tree detail.
    await loadDashboard();
  } catch (error) {
    setStatus(error.message);
  }
});

// This deletes the selected tree.
deleteTreeButton.addEventListener("click", async () => {
  // This stops the action when no tree is selected.
  if (!selectedTree) {
    setStatus("Choose a tree first.");
    return;
  }

  const confirmed = confirm(`Delete "${selectedTree.title}"?`);
  if (!confirmed) {
    return;
  }

  try {
    // This sends the delete request to the backend.
    await sendRequest(`/api/trees/${selectedTree.id}?userId=${currentUser.id}`, {
      method: "DELETE",
    });

    // This clears the selected tree state.
    clearSelectedTree();
    // This reloads the dashboard list.
    await loadDashboard();
    // This shows a success message.
    setStatus("Tree deleted.");
  } catch (error) {
    setStatus(error.message);
  }
});

// This logs the user out on the page.
logoutButton.addEventListener("click", () => {
  currentUser = null;
  saveCurrentUser();
  updatePageForCurrentUser();
  setStatus("Logged out.");
});

// This sets the correct page view when the page first loads.
updatePageForCurrentUser();
// This restores the user if local storage already has one saved.
restoreSavedUser();
