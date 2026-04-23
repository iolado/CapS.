// This reads the backend URL from the Vite environment variable.
// If the deployed URL is not available, it falls back to the local backend URL.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// These lines grab page elements from client/index.html.
// script.js uses these variables later to read form values or update the page.
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
const registerNameInput = document.querySelector("#register-name");
const registerEmailInput = document.querySelector("#register-email");
const registerPasswordInput = document.querySelector("#register-password");
const loginEmailInput = document.querySelector("#login-email");
const loginPasswordInput = document.querySelector("#login-password");

// These variables store the current frontend state while the page is open.
// They are updated after login, tree selection, and API responses.
let currentUser = null;
let currentTrees = [];
let selectedTree = null;
let selectedTreeSkills = [];

// This helper writes a message into the status area on the page.
function setStatus(message) {
  // This changes the text inside the status paragraph in client/index.html.
  statusMessage.textContent = message;
}

// WHY (Code Style + Documentation): Centralized input trimming keeps register/login logic
// easier to read and avoids repeated selector + trim code in multiple handlers.
function getTrimmedInputValue(inputElement) {
  return String(inputElement?.value || "").trim();
}

// WHY (Functionality): Clearing auth fields after success/logout avoids stale credentials
// staying in form inputs, which is safer and less confusing for users.
function clearAuthForms() {
  registerForm.reset();
  loginForm.reset();
}

// WHY (Functionality + Code Style): One logout helper ensures manual logout and automatic
// session-expiry logout keep the same UI state and localStorage behavior.
function logoutCurrentUser(message = "Logged out.") {
  currentUser = null;
  saveCurrentUser();
  updatePageForCurrentUser();
  clearAuthForms();
  setStatus(message);
}

// This helper saves the current user id in the browser's local storage.
function saveCurrentUser() {
  // This checks whether there is a logged-in user right now.
  if (!currentUser) {
    // This removes the saved user id when no one is logged in.
    localStorage.removeItem("skill-tree-user-id");
    return;
  }

  // This saves the current user id so the app can restore it after a refresh.
  localStorage.setItem("skill-tree-user-id", String(currentUser.id));
}

// This helper clears all selected tree data and hides the detail section.
function clearSelectedTree() {
  // This removes the selected tree object from memory.
  selectedTree = null;

  // This removes the selected tree's skills from memory.
  selectedTreeSkills = [];

  // This hides the tree detail section in the UI.
  treeDetailSection.classList.add("hidden");

  // This resets the tree detail heading.
  selectedTreeTitle.textContent = "Tree Details";

  // This resets the tree detail description text.
  selectedTreeDescription.textContent = "Choose a tree to manage its skills.";

  // This resets the summary message.
  treeSummaryMessage.textContent = "No tree selected.";

  // This clears the visible skill list.
  skillList.innerHTML = "";

  // This clears the visual skill map.
  skillMap.innerHTML = "";
}

// This helper switches the page between logged-out mode and logged-in mode.
function updatePageForCurrentUser() {
  // This checks whether a user is currently logged in.
  if (!currentUser) {
    // This shows the register and login section.
    authSection.classList.remove("hidden");

    // This hides the create tree form because only logged-in users should see it.
    treeForm.classList.add("hidden");

    // This hides the logout button.
    logoutButton.classList.add("hidden");

    // This changes the dashboard message to the logged-out version.
    currentUserMessage.textContent = "Log in to see your trees.";

    // This clears the visible tree list.
    treeList.innerHTML = "";

    // This clears and hides the selected tree view.
    clearSelectedTree();
    return;
  }

  // This hides the auth section after login.
  authSection.classList.add("hidden");

  // This shows the create tree form.
  treeForm.classList.remove("hidden");

  // This shows the logout button.
  logoutButton.classList.remove("hidden");

  // This updates the message with the logged-in user's name.
  currentUserMessage.textContent = `Welcome, ${currentUser.name}.`;
}

// This helper sends a request to the backend and returns parsed JSON.
async function sendRequest(path, options = {}) {
  // This sends a fetch request to the backend URL plus the route path.
  const response = await fetch(`${API_URL}${path}`, options);

  // This turns the JSON response body into a JavaScript object.
  const data = await response.json();

  // This checks whether the backend responded with an error status.
  if (!response.ok) {
    // WHY (Functionality): If a protected request returns 401 while a user appears logged in,
    // we reset frontend auth state so the app does not stay stuck in a broken "logged-in" UI.
    if (response.status === 401 && currentUser && !path.startsWith("/api/auth/login")) {
      logoutCurrentUser("Your session expired. Please log in again.");
    }

    // This throws a JavaScript error so the calling code can show the message in the UI.
    throw new Error(data.error || "Something went wrong.");
  }

  // This returns the successful response data back to the caller.
  return data;
}

// This helper turns the backend status value into easier text for the user.
function getStatusLabel(status) {
  // This checks whether the status is in_progress.
  if (status === "in_progress") {
    // This returns the readable label.
    return "In Progress";
  }

  // This checks whether the status is completed.
  if (status === "completed") {
    // This returns the readable label.
    return "Completed";
  }

  // This checks whether the status is available.
  if (status === "available") {
    // This returns the readable label.
    return "Available";
  }

  // This is the default label when none of the conditions above matched.
  return "Locked";
}

// This function renders the tree list in the dashboard.
function renderTrees(trees) {
  // This clears the old tree list before drawing the new one.
  treeList.innerHTML = "";

  // This loops through each tree in the array.
  trees.forEach((tree) => {
    // This creates one list item element for the tree.
    const listItem = document.createElement("li");

    // This gives the list item the tree-item CSS class.
    listItem.className = "tree-item";

    // This checks whether this tree is the one currently selected.
    if (selectedTree && selectedTree.id === tree.id) {
      // This adds a CSS class that visually highlights the selected tree.
      listItem.classList.add("is-selected");
    }

    // This fills the list item with the tree's title, description, and visibility text.
    listItem.innerHTML = `
      <h3>${tree.title}</h3>
      <p>${tree.description || "No description yet."}</p>
      <p><strong>Visibility:</strong> ${tree.is_public ? "Public" : "Private"}</p>
    `;

    // This creates a container for the tree action buttons.
    const actions = document.createElement("div");

    // This gives the actions container the tree-actions CSS class.
    actions.className = "tree-actions";

    // This creates the button that opens a tree.
    const viewButton = document.createElement("button");

    // This gives the button the small-button CSS class.
    viewButton.className = "small-button";

    // This makes the button behave like a normal button, not a form submit button.
    viewButton.type = "button";

    // This sets the text the user sees.
    viewButton.textContent = "Open Tree";

    // This adds a click listener that loads the full tree detail from the backend.
    viewButton.addEventListener("click", () => {
      loadTreeDetails(tree.id);
    });

    // This puts the button inside the actions container.
    actions.appendChild(viewButton);

    // This puts the actions container inside the tree item.
    listItem.appendChild(actions);

    // This puts the finished tree item into the tree list in the page.
    treeList.appendChild(listItem);
  });
}

// This function renders the simple visual skill map.
function renderSkillMap(skills) {
  // This clears the old skill map first.
  skillMap.innerHTML = "";

  // This checks whether the selected tree has any skills.
  if (!skills.length) {
    // This shows a simple empty state message when there are no skills yet.
    skillMap.innerHTML = "<p>No skills yet. Add your first skill below.</p>";
    return;
  }

  // This loops through each skill in the selected tree.
  skills.forEach((skill) => {
    // This creates one article element for the skill map card.
    const card = document.createElement("article");

    // This gives the card a base CSS class plus a status class like status-completed.
    card.className = `skill-map-card status-${skill.status}`;

    // This fills the card with text about the skill.
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

    // This puts the finished card into the skill map area in the page.
    skillMap.appendChild(card);
  });
}

// This helper creates one progress button for a skill.
function createProgressButton(skillId, status, label) {
  // This creates a button element.
  const button = document.createElement("button");

  // This gives the button the progress-button CSS class.
  button.className = "progress-button";

  // This makes the button act like a regular button instead of a form submit button.
  button.type = "button";

  // This sets the text shown on the button.
  button.textContent = label;

  // This adds the click logic for updating progress.
  button.addEventListener("click", async () => {
    try {
      // This sends the new progress status to the backend route in server/app.js.
      await sendRequest(`/api/skills/${skillId}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          status,
        }),
      });

      // This shows a success message to the user.
      setStatus("Progress updated.");

      // This reloads the selected tree so the UI shows the new status.
      await loadTreeDetails(selectedTree.id);
    } catch (error) {
      // This shows the error message if the backend rejects the update.
      setStatus(error.message);
    }
  });

  // This returns the finished button to the code that called this helper.
  return button;
}

// This function renders the detailed skill list for the selected tree.
function renderSkills(skills) {
  // This clears the old skill list before rendering again.
  skillList.innerHTML = "";

  // This checks whether the selected tree has any skills.
  if (!skills.length) {
    // This shows a simple empty state message.
    skillList.innerHTML = "<li class='skill-item'>No skills yet. Add one above.</li>";
    return;
  }

  // This loops through each skill in the selected tree.
  skills.forEach((skill) => {
    // This creates one list item for the skill.
    const listItem = document.createElement("li");

    // This gives the list item the skill-item CSS class.
    listItem.className = "skill-item";

    // This fills the list item with the basic skill information.
    listItem.innerHTML = `
      <h3>${skill.title}</h3>
      <p>${skill.description || "No description yet."}</p>
      <p><strong>Difficulty:</strong> ${skill.difficulty || "Not set"}</p>
      <p><strong>Status:</strong> ${getStatusLabel(skill.status)}</p>
    `;

    // This creates the list that will hold prerequisite rows for the skill.
    const prerequisiteList = document.createElement("ul");

    // This gives the list the prerequisite-list CSS class.
    prerequisiteList.className = "prerequisite-list";

    // This checks whether the skill has any prerequisites yet.
    if (!skill.prerequisites.length) {
      // This shows a simple empty message when there are no prerequisites.
      prerequisiteList.innerHTML = "<li>No prerequisites yet.</li>";
    }

    // This loops through each prerequisite attached to this skill.
    skill.prerequisites.forEach((prerequisite) => {
      // This creates one list item for the prerequisite row.
      const prerequisiteItem = document.createElement("li");

      // This shows the prerequisite skill title.
      prerequisiteItem.textContent = prerequisite.prerequisite_title;

      // This creates a remove button for the prerequisite row.
      const removeButton = document.createElement("button");

      // This gives the button the small-button CSS class.
      removeButton.className = "small-button";

      // This makes the button act like a regular button.
      removeButton.type = "button";

      // This sets the text shown on the button.
      removeButton.textContent = "Remove";

      // This adds the click logic for deleting the prerequisite relationship.
      removeButton.addEventListener("click", async () => {
        try {
          // This calls the backend delete prerequisite route in server/app.js.
          await sendRequest(
            `/api/skills/${skill.id}/prerequisites/${prerequisite.id}?userId=${currentUser.id}`,
            {
              method: "DELETE",
            }
          );

          // This shows a success message.
          setStatus("Prerequisite removed.");

          // This reloads the selected tree so the UI updates.
          await loadTreeDetails(selectedTree.id);
        } catch (error) {
          // This shows the backend error message if something goes wrong.
          setStatus(error.message);
        }
      });

      // This adds a space before the button so the text and button do not touch.
      prerequisiteItem.appendChild(document.createTextNode(" "));

      // This adds the button into the prerequisite row.
      prerequisiteItem.appendChild(removeButton);

      // This adds the finished prerequisite row into the prerequisite list.
      prerequisiteList.appendChild(prerequisiteItem);
    });

    // This adds the prerequisite list into the skill item.
    listItem.appendChild(prerequisiteList);

    // This creates a row to hold the progress buttons.
    const progressRow = document.createElement("div");

    // This gives the row the progress-row CSS class.
    progressRow.className = "progress-row";

    // This adds the locked progress button into the row.
    progressRow.appendChild(createProgressButton(skill.id, "locked", "Set Locked"));

    // This adds the in-progress button into the row.
    progressRow.appendChild(createProgressButton(skill.id, "in_progress", "Start"));

    // This adds the completed button into the row.
    progressRow.appendChild(createProgressButton(skill.id, "completed", "Complete"));

    // This adds the finished progress button row into the skill item.
    listItem.appendChild(progressRow);

    // This creates a row to hold the edit and delete skill buttons.
    const skillActions = document.createElement("div");

    // This gives the row the skill-actions CSS class.
    skillActions.className = "skill-actions";

    // This creates the edit skill button.
    const editButton = document.createElement("button");

    // This gives the button the small-button CSS class.
    editButton.className = "small-button";

    // This makes the button act like a regular button.
    editButton.type = "button";

    // This sets the text shown on the button.
    editButton.textContent = "Edit Skill";

    // This adds the click logic for editing a skill.
    editButton.addEventListener("click", async () => {
      // This asks the user for the new skill title.
      const title = prompt("Update the skill title:", skill.title);

      // This stops if the user cancels or leaves the title empty.
      if (!title) {
        return;
      }

      // This asks the user for the new description.
      const description = prompt("Update the skill description:", skill.description || "");

      // This asks the user for the new difficulty.
      const difficulty = prompt("Update the skill difficulty:", skill.difficulty || "");

      try {
        // This sends the updated skill data to the backend route in server/app.js.
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

        // This shows a success message.
        setStatus("Skill updated.");

        // This reloads the selected tree so the UI updates.
        await loadTreeDetails(selectedTree.id);
      } catch (error) {
        // This shows the backend error message if something goes wrong.
        setStatus(error.message);
      }
    });

    // This creates the delete skill button.
    const deleteButton = document.createElement("button");

    // This gives the button the small-button CSS class.
    deleteButton.className = "small-button";

    // This makes the button act like a regular button.
    deleteButton.type = "button";

    // This sets the text shown on the button.
    deleteButton.textContent = "Delete Skill";

    // This adds the click logic for deleting a skill.
    deleteButton.addEventListener("click", async () => {
      // This asks the user to confirm the delete action.
      const confirmed = confirm(`Delete "${skill.title}"?`);

      // This stops if the user chooses Cancel.
      if (!confirmed) {
        return;
      }

      try {
        // This sends the delete request to the backend route in server/app.js.
        await sendRequest(`/api/skills/${skill.id}?userId=${currentUser.id}`, {
          method: "DELETE",
        });

        // This shows a success message.
        setStatus("Skill deleted.");

        // This reloads the selected tree so the UI updates.
        await loadTreeDetails(selectedTree.id);
      } catch (error) {
        // This shows the backend error message if something goes wrong.
        setStatus(error.message);
      }
    });

    // This adds the edit button into the action row.
    skillActions.appendChild(editButton);

    // This adds the delete button into the action row.
    skillActions.appendChild(deleteButton);

    // This adds the action row into the skill item.
    listItem.appendChild(skillActions);

    // This creates the row that holds the prerequisite dropdown and add button.
    const prerequisiteRow = document.createElement("div");

    // This gives the row the inline-select-row CSS class.
    prerequisiteRow.className = "inline-select-row";

    // This creates the dropdown for choosing a prerequisite skill.
    const prerequisiteSelect = document.createElement("select");

    // This creates a new array that leaves out the current skill.
    // A skill cannot be its own prerequisite.
    const availableSkills = skills.filter((candidate) => candidate.id !== skill.id);

    // This fills the dropdown with one default option plus every other skill in the tree.
    prerequisiteSelect.innerHTML = `
      <option value="">Choose prerequisite</option>
      ${availableSkills
        .map((candidate) => `<option value="${candidate.id}">${candidate.title}</option>`)
        .join("")}
    `;

    // This creates the add prerequisite button.
    const addPrerequisiteButton = document.createElement("button");

    // This gives the button the small-button CSS class.
    addPrerequisiteButton.className = "small-button";

    // This makes the button act like a regular button.
    addPrerequisiteButton.type = "button";

    // This sets the text shown on the button.
    addPrerequisiteButton.textContent = "Add Prerequisite";

    // This adds the click logic for creating a prerequisite relationship.
    addPrerequisiteButton.addEventListener("click", async () => {
      // This checks whether the user picked a skill in the dropdown.
      if (!prerequisiteSelect.value) {
        // This shows a message if nothing was selected.
        setStatus("Choose a skill first.");
        return;
      }

      try {
        // This sends the new prerequisite data to the backend route in server/app.js.
        await sendRequest(`/api/skills/${skill.id}/prerequisites`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            prerequisiteSkillId: Number(prerequisiteSelect.value),
          }),
        });

        // This shows a success message.
        setStatus("Prerequisite added.");

        // This reloads the selected tree so the UI updates.
        await loadTreeDetails(selectedTree.id);
      } catch (error) {
        // This shows the backend error message if something goes wrong.
        setStatus(error.message);
      }
    });

    // This adds the dropdown into the prerequisite row.
    prerequisiteRow.appendChild(prerequisiteSelect);

    // This adds the add button into the prerequisite row.
    prerequisiteRow.appendChild(addPrerequisiteButton);

    // This adds the prerequisite row into the skill item.
    listItem.appendChild(prerequisiteRow);

    // This adds the finished skill item into the visible skill list.
    skillList.appendChild(listItem);
  });
}

// This function updates the summary message for the selected tree.
function renderTreeSummary(skills) {
  // This counts how many skills are completed.
  const completedCount = skills.filter((skill) => skill.status === "completed").length;

  // This writes the summary text into the page.
  treeSummaryMessage.textContent = `${completedCount} of ${skills.length} skills completed.`;
}

// This function loads the dashboard tree list for the current user.
async function loadDashboard() {
  // This stops immediately when no one is logged in.
  if (!currentUser) {
    return;
  }

  try {
    // This asks the backend route in server/app.js for all trees for the current user.
    const data = await sendRequest(`/api/trees?userId=${currentUser.id}`);

    // This saves the tree list in memory.
    currentTrees = data.trees;

    // This redraws the visible tree list in the page.
    renderTrees(currentTrees);

    // This checks whether there is already a selected tree.
    if (selectedTree) {
      // This checks whether that selected tree still exists in the new dashboard list.
      const treeStillExists = currentTrees.find((tree) => tree.id === selectedTree.id);

      // This reloads the selected tree if it still exists.
      if (treeStillExists) {
        await loadTreeDetails(selectedTree.id);
        return;
      }
    }

    // This clears the selected tree when there is no valid selected tree anymore.
    clearSelectedTree();
  } catch (error) {
    // This shows the backend error message if the dashboard request fails.
    setStatus(error.message);
  }
}

// This function loads the full details for one selected tree.
async function loadTreeDetails(treeId) {
  try {
    // This asks the backend route in server/app.js for one full tree detail object.
    const data = await sendRequest(`/api/trees/${treeId}?userId=${currentUser.id}`);

    // This saves the selected tree object in memory.
    selectedTree = data.tree;

    // This saves the selected tree's skills in memory.
    selectedTreeSkills = data.skills;

    // This updates the tree title shown in the page.
    selectedTreeTitle.textContent = data.tree.title;

    // This updates the tree description shown in the page.
    selectedTreeDescription.textContent = data.tree.description || "No description yet.";

    // This shows the tree detail section now that a tree is selected.
    treeDetailSection.classList.remove("hidden");

    // This redraws the tree list so the selected tree can be highlighted.
    renderTrees(currentTrees);

    // This updates the summary section.
    renderTreeSummary(selectedTreeSkills);

    // This redraws the visual skill map.
    renderSkillMap(selectedTreeSkills);

    // This redraws the detailed skill list.
    renderSkills(selectedTreeSkills);
  } catch (error) {
    // This shows the backend error message if the tree detail request fails.
    setStatus(error.message);
  }
}

// This helper logs the user into the frontend state after register or login.
async function setCurrentUser(user, message) {
  // This stores the current user in memory.
  currentUser = user;

  // This saves the current user id into local storage.
  saveCurrentUser();

  // This updates the visible page layout for the logged-in state.
  updatePageForCurrentUser();

  // WHY (Functionality): Clearing auth inputs after login/register success prevents showing
  // old credentials if the auth section appears again later.
  clearAuthForms();

  // This shows the success message.
  setStatus(message);

  // This loads the dashboard data for the logged-in user.
  await loadDashboard();
}

// This helper restores the saved user when the page reloads.
async function restoreSavedUser() {
  // This reads the user id from local storage.
  const savedUserId = localStorage.getItem("skill-tree-user-id");

  // This stops when there is no saved user id.
  if (!savedUserId) {
    return;
  }

  try {
    // This asks the backend route in server/app.js for the saved user row.
    const data = await sendRequest(`/api/auth/me?userId=${savedUserId}`);

    // This logs that user into the frontend state.
    await setCurrentUser(data.user, "Welcome back.");
  } catch {
    // This clears the bad saved user id if the backend says the user no longer exists.
    localStorage.removeItem("skill-tree-user-id");
  }
}

// This event listener runs when the register form is submitted.
registerForm.addEventListener("submit", async (event) => {
  // This stops the browser from doing a normal form page reload.
  event.preventDefault();

  try {
    const name = getTrimmedInputValue(registerNameInput);
    const email = getTrimmedInputValue(registerEmailInput);
    const password = registerPasswordInput.value;

    // WHY (Functionality): Basic client-side checks give faster feedback and reduce avoidable
    // auth request failures for blank/invalid register fields.
    if (!name || !email || !password) {
      setStatus("Name, email, and password are required.");
      return;
    }

    if (!email.includes("@")) {
      setStatus("Please enter a valid email address.");
      return;
    }

    // This sends the register data to the backend register route in server/app.js.
    const data = await sendRequest("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
      }),
    });

    // This treats the new account as logged in right away.
    await setCurrentUser(data.user, "Account created. You are now logged in.");
  } catch (error) {
    // This shows the backend error message if the register request fails.
    setStatus(error.message);
  }
});

// This event listener runs when the login form is submitted.
loginForm.addEventListener("submit", async (event) => {
  // This stops the browser from doing a normal form page reload.
  event.preventDefault();

  try {
    const email = getTrimmedInputValue(loginEmailInput);
    const password = loginPasswordInput.value;

    // WHY (Functionality): Basic validation avoids sending incomplete login payloads and gives
    // immediate, clearer feedback when required fields are missing.
    if (!email || !password) {
      setStatus("Email and password are required.");
      return;
    }

    // This sends the login data to the backend login route in server/app.js.
    const data = await sendRequest("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    // This stores the logged-in user and loads their dashboard.
    await setCurrentUser(data.user, "Logged in successfully.");
  } catch (error) {
    // This shows the backend error message if the login request fails.
    setStatus(error.message);
  }
});

// This event listener runs when the create tree form is submitted.
treeForm.addEventListener("submit", async (event) => {
  // This stops the browser from doing a normal form page reload.
  event.preventDefault();

  try {
    // This sends the new tree data to the backend create tree route in server/app.js.
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

    // This clears the tree form after success.
    treeForm.reset();

    // This reloads the dashboard tree list.
    await loadDashboard();
  } catch (error) {
    // This shows the backend error message if the create tree request fails.
    setStatus(error.message);
  }
});

// This event listener runs when the add skill form is submitted.
skillForm.addEventListener("submit", async (event) => {
  // This stops the browser from doing a normal form page reload.
  event.preventDefault();

  // This checks that a tree is selected before trying to create a skill.
  if (!selectedTree) {
    // This shows a message when the user has not opened a tree yet.
    setStatus("Choose a tree first.");
    return;
  }

  try {
    // This sends the new skill data to the backend create skill route in server/app.js.
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

    // This clears the skill form after success.
    skillForm.reset();

    // This shows a success message.
    setStatus("Skill added.");

    // This reloads the selected tree so the new skill appears.
    await loadTreeDetails(selectedTree.id);
  } catch (error) {
    // This shows the backend error message if the create skill request fails.
    setStatus(error.message);
  }
});

// This event listener runs when the edit tree button is clicked.
editTreeButton.addEventListener("click", async () => {
  // This checks that a tree is selected before trying to edit it.
  if (!selectedTree) {
    // This shows a message when no tree is selected.
    setStatus("Choose a tree first.");
    return;
  }

  // This asks the user for a new tree title.
  const title = prompt("Update the tree title:", selectedTree.title);

  // This stops if the user cancels or clears the title.
  if (!title) {
    return;
  }

  // This asks the user for a new tree description.
  const description = prompt(
    "Update the tree description:",
    selectedTree.description || ""
  );

  try {
    // This sends the updated tree data to the backend update tree route in server/app.js.
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

    // This reloads the dashboard so the UI uses the new tree values.
    await loadDashboard();
  } catch (error) {
    // This shows the backend error message if the update tree request fails.
    setStatus(error.message);
  }
});

// This event listener runs when the delete tree button is clicked.
deleteTreeButton.addEventListener("click", async () => {
  // This checks that a tree is selected before trying to delete it.
  if (!selectedTree) {
    // This shows a message when no tree is selected.
    setStatus("Choose a tree first.");
    return;
  }

  // This asks the user to confirm the delete action.
  const confirmed = confirm(`Delete "${selectedTree.title}"?`);

  // This stops if the user chooses Cancel.
  if (!confirmed) {
    return;
  }

  try {
    // This sends the delete request to the backend delete tree route in server/app.js.
    await sendRequest(`/api/trees/${selectedTree.id}?userId=${currentUser.id}`, {
      method: "DELETE",
    });

    // This clears the selected tree from memory and the UI.
    clearSelectedTree();

    // This reloads the dashboard tree list.
    await loadDashboard();

    // This shows a success message.
    setStatus("Tree deleted.");
  } catch (error) {
    // This shows the backend error message if the delete tree request fails.
    setStatus(error.message);
  }
});

// This event listener runs when the logout button is clicked.
logoutButton.addEventListener("click", () => {
  // WHY (Code Style + Functionality): Reusing one logout helper keeps logout behavior
  // consistent anywhere auth state needs to be reset.
  logoutCurrentUser("Logged out.");
});

// This sets the page to the correct visual state when the page first loads.
updatePageForCurrentUser();

// This tries to restore the saved user from local storage after the page loads.
restoreSavedUser();
