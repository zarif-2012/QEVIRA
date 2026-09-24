// ============================================================
// QEVIRA
// STEP 2 — PROFILE + BIO + ONLINE/LAST SEEN
// AUTH + 1-TO-1 CHAT + REALTIME MESSAGES
// ============================================================


// ============================================================
// 1. SUPABASE CONFIG
// ============================================================

const SUPABASE_URL =
  "https://wcdywnkxtuexjbjgerzd.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_bD3ajWNbZPoUw4uUwYhK3w_P-iZIAhw";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);


// ============================================================
// 2. GLOBAL VARIABLES
// ============================================================

let currentUser = null;
let currentProfile = null;
let currentChatUser = null;
let messageSubscription = null;
let presenceInterval = null;

let authMode = "login";


// ============================================================
// 3. BASIC HELPERS
// ============================================================

function $(id) {
  return document.getElementById(id);
}

function show(element) {
  if (element) element.classList.remove("hidden");
}

function hide(element) {
  if (element) element.classList.add("hidden");
}

function escapeHTML(value) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatTime(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatLastSeen(dateString) {
  if (!dateString) return "Offline";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Offline";
  }

  return "Last seen " + date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short"
  });
}


// ============================================================
// 4. AUTH SCREEN
// ============================================================

function showLoginMode() {
  authMode = "login";

  hide($("signupForm"));
  show($("loginForm"));

  const message = $("authMessage");

  if (message) {
    message.textContent = "";
  }
}

function showSignupMode() {
  authMode = "signup";

  hide($("loginForm"));
  show($("signupForm"));

  const message = $("authMessage");

  if (message) {
    message.textContent = "";
  }
}


// ============================================================
// 5. AUTH MESSAGE
// ============================================================

function setAuthMessage(message, type = "") {
  const box = $("authMessage");

  if (!box) return;

  box.textContent = message;

  box.className = "";

  if (type) {
    box.classList.add(type);
  }
}


// ============================================================
// 6. SIGN UP
// ============================================================

async function signup() {
  const email = $("signupEmail")?.value.trim();
  const password = $("signupPassword")?.value;

  if (!email || !password) {
    setAuthMessage("Please enter email and password.");
    return;
  }

  if (password.length < 6) {
    setAuthMessage("Password must be at least 6 characters.");
    return;
  }

  const button = $("signupBtn");

  if (button) {
    button.disabled = true;
    button.textContent = "Creating account...";
  }

  try {
    const { data, error } =
      await supabaseClient.auth.signUp({
        email,
        password
      });

    if (error) {
      throw error;
    }

    if (data.session) {
      setAuthMessage("Account created successfully.", "success");
    } else {
      setAuthMessage(
        "Account created. Check your email to confirm your account.",
        "success"
      );
    }

  } catch (error) {
    console.error("Signup error:", error);

    setAuthMessage(
      error.message || "Signup failed."
    );

  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Create Account";
    }
  }
}


// ============================================================
// 7. LOGIN
// ============================================================

async function login() {
  const email = $("loginEmail")?.value.trim();
  const password = $("loginPassword")?.value;

  if (!email || !password) {
    setAuthMessage("Please enter email and password.");
    return;
  }

  const button = $("loginBtn");

  if (button) {
    button.disabled = true;
    button.textContent = "Logging in...";
  }

  try {
    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      throw error;
    }

    currentUser = data.user;

    await startApp();

  } catch (error) {
    console.error("Login error:", error);

    setAuthMessage(
      error.message || "Login failed."
    );

  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Login";
    }
  }
}


// ============================================================
// 8. SHOW MAIN APP
// ============================================================

function showApp() {
  hide($("authScreen"));
  show($("app"));
}


// ============================================================
// 9. SHOW AUTH
// ============================================================

function showAuth() {
  hide($("app"));
  show($("authScreen"));
}


// ============================================================
// 10. ENSURE PROFILE EXISTS
// ============================================================

async function ensureProfile() {
  if (!currentUser) return null;

  const { data: existingProfile, error: selectError } =
    await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .maybeSingle();

  if (selectError) {
    console.error("Profile select error:", selectError);
    return null;
  }

  if (existingProfile) {
    currentProfile = existingProfile;
    return existingProfile;
  }

  const defaultUsername =
    "user" + currentUser.id.substring(0, 8);

  const newProfile = {
    id: currentUser.id,
    email: currentUser.email,
    display_name: "QEVIRA User",
    username: defaultUsername,
    bio: "",
    last_seen: new Date().toISOString(),
    is_online: true
  };

  const { data, error } =
    await supabaseClient
      .from("profiles")
      .insert(newProfile)
      .select()
      .single();

  if (error) {
    console.error("Profile creation error:", error);

    // Fallback in case some optional columns don't exist yet
    const basicProfile = {
      id: currentUser.id,
      email: currentUser.email,
      display_name: "QEVIRA User",
      username: defaultUsername
    };

    const retry =
      await supabaseClient
        .from("profiles")
        .insert(basicProfile)
        .select()
        .single();

    if (retry.error) {
      console.error("Basic profile creation error:", retry.error);
      return null;
    }

    currentProfile = retry.data;
    return retry.data;
  }

  currentProfile = data;

  return data;
}


// ============================================================
// 11. LOAD CURRENT PROFILE
// ============================================================

async function loadCurrentProfile() {
  if (!currentUser) return;

  const { data, error } =
    await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .maybeSingle();

  if (error) {
    console.error("Load profile error:", error);
    return;
  }

  if (data) {
    currentProfile = data;
    renderCurrentProfile();
  }
}


// ============================================================
// 12. RENDER PROFILE
// ============================================================

function renderCurrentProfile() {
  if (!currentProfile) return;

  const displayName =
    currentProfile.display_name ||
    "QEVIRA User";

  const username =
    currentProfile.username ||
    "user";

  const email =
    currentProfile.email ||
    currentUser?.email ||
    "";

  const bio =
    currentProfile.bio ||
    "";

  const avatar =
    $("profileAvatar");

  if (avatar) {
    const firstLetter =
      displayName
        .trim()
        .charAt(0)
        .toUpperCase() || "Q";

    avatar.textContent = firstLetter;
  }

  const nameElement =
    $("profileName");

  if (nameElement) {
    nameElement.textContent = displayName;
  }

  const usernameElement =
    $("profileUsername");

  if (usernameElement) {
    usernameElement.textContent =
      "@" + username.replace(/^@/, "");
  }

  const emailElement =
    $("profileEmail");

  if (emailElement) {
    emailElement.textContent = email;
  }

  const bioElement =
    $("profileBio");

  if (bioElement) {
    bioElement.textContent =
      bio || "No bio yet.";
  }

  const onlineElement =
    $("profileOnlineStatus");

  if (onlineElement) {
    if (currentProfile.is_online) {
      onlineElement.textContent = "● Online";
    } else {
      onlineElement.textContent =
        formatLastSeen(currentProfile.last_seen);
    }
  }

  // Fill edit fields if they exist
  const editName =
    $("editDisplayName");

  if (editName) {
    editName.value =
      currentProfile.display_name || "";
  }

  const editUsername =
    $("editUsername");

  if (editUsername) {
    editUsername.value =
      currentProfile.username || "";
  }

  const editBio =
    $("editBio");

  if (editBio) {
    editBio.value =
      currentProfile.bio || "";
  }
}


// ============================================================
// 13. SAVE PROFILE
// ============================================================

async function saveProfile() {
  if (!currentUser) return;

  const displayName =
    $("editDisplayName")?.value.trim() ||
    "QEVIRA User";

  let username =
    $("editUsername")?.value.trim() ||
    ("user" + currentUser.id.substring(0, 8));

  const bio =
    $("editBio")?.value.trim() || "";

  username = username.replace(/^@/, "");

  if (!/^[a-zA-Z0-9_.]+$/.test(username)) {
    alert(
      "Username can contain only letters, numbers, _ and ."
    );
    return;
  }

  const button =
    $("saveProfileBtn");

  if (button) {
    button.disabled = true;
    button.textContent = "Saving...";
  }

  try {
    // Check if username is already used
    const { data: existingUser, error: usernameError } =
      await supabaseClient
        .from("profiles")
        .select("id")
        .eq("username", username)
        .neq("id", currentUser.id)
        .maybeSingle();

    if (usernameError) {
      console.error(
        "Username check error:",
        usernameError
      );
    }

    if (existingUser) {
      alert("That username is already taken.");
      return;
    }

    const updates = {
      display_name: displayName,
      username,
      bio
    };

    const { data, error } =
      await supabaseClient
        .from("profiles")
        .update(updates)
        .eq("id", currentUser.id)
        .select()
        .single();

    if (error) {
      throw error;
    }

    currentProfile = data;

    renderCurrentProfile();

    hide($("profileEdit"));

    alert("Profile updated successfully!");

  } catch (error) {
    console.error(
      "Save profile error:",
      error
    );

    alert(
      error.message ||
      "Could not update profile."
    );

  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Save Profile";
    }
  }
}


// ============================================================
// 14. UPDATE ONLINE STATUS
// ============================================================

async function updatePresence(isOnline = true) {
  if (!currentUser) return;

  const updateData = {
    last_seen: new Date().toISOString(),
    is_online: isOnline
  };

  const { error } =
    await supabaseClient
      .from("profiles")
      .update(updateData)
      .eq("id", currentUser.id);

  if (error) {
    console.warn(
      "Presence update failed:",
      error.message
    );
  }
}


// ============================================================
// 15. START PRESENCE SYSTEM
// ============================================================

function startPresence() {
  stopPresence();

  updatePresence(true);

  presenceInterval =
    setInterval(() => {
      updatePresence(true);
    }, 30000);
}


// ============================================================
// 16. STOP PRESENCE
// ============================================================

function stopPresence() {
  if (presenceInterval) {
    clearInterval(presenceInterval);
    presenceInterval = null;
  }
}


// ============================================================
// 17. PAGE VISIBILITY PRESENCE
// ============================================================

document.addEventListener(
  "visibilitychange",
  () => {
    if (!currentUser) return;

    if (document.visibilityState === "visible") {
      updatePresence(true);
    } else {
      updatePresence(false);
    }
  }
);


// ============================================================
// 18. BEFORE PAGE CLOSE
// ============================================================

window.addEventListener(
  "beforeunload",
  () => {
    if (!currentUser) return;

    // Best-effort update
    supabaseClient
      .from("profiles")
      .update({
        is_online: false,
        last_seen: new Date().toISOString()
      })
      .eq("id", currentUser.id);
  }
);


// ============================================================
// 19. LOAD CONTACTS
// ============================================================

async function loadContacts() {
  const list =
    $("contactsList");

  if (!list || !currentUser) return;

  list.innerHTML =
    '<div class="loading-state">Loading contacts...</div>';

  const { data, error } =
    await supabaseClient
      .from("profiles")
      .select("*")
      .neq("id", currentUser.id)
      .order("display_name", {
        ascending: true
      });

  if (error) {
    console.error(
      "Contacts error:",
      error
    );

    list.innerHTML =
      '<div class="loading-state">Could not load contacts.</div>';

    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML =
      '<div class="loading-state">No other users yet.</div>';

    return;
  }

  renderContacts(data);
}


// ============================================================
// 20. RENDER CONTACTS
// ============================================================

function renderContacts(users) {
  const list =
    $("contactsList");

  if (!list) return;

  list.innerHTML = "";

  users.forEach(user => {
    const item =
      document.createElement("div");

    item.className = "contact-item";

    const name =
      user.display_name ||
      "QEVIRA User";

    const username =
      user.username ||
      "user";

    const initial =
      name.charAt(0).toUpperCase();

    let status =
      "Offline";

    if (user.is_online) {
      status = "Online";
    } else if (user.last_seen) {
      status = formatLastSeen(
        user.last_seen
      );
    }

    item.innerHTML = `
      <div class="contact-avatar">
        ${escapeHTML(initial)}
      </div>

      <div class="contact-info">
        <div class="contact-name">
          ${escapeHTML(name)}
        </div>

        <div class="contact-username">
          @${escapeHTML(username)}
        </div>

        <div class="contact-status">
          ${escapeHTML(status)}
        </div>
      </div>
    `;

    item.addEventListener(
      "click",
      () => {
        openChat(user);
      }
    );

    list.appendChild(item);
  });
}


// ============================================================
// 21. LOAD CHAT USERS
// ============================================================

async function loadChats() {
  const list =
    $("chatList");

  if (!list || !currentUser) return;

  list.innerHTML =
    '<div class="loading-state">Loading chats...</div>';

  const { data: sent, error: sentError } =
    await supabaseClient
      .from("messages")
      .select("receiver_id")
      .eq("sender_id", currentUser.id);

  const { data: received, error: receivedError } =
    await supabaseClient
      .from("messages")
      .select("sender_id")
      .eq("receiver_id", currentUser.id);

  if (sentError || receivedError) {
    console.error(
      "Chat loading error:",
      sentError || receivedError
    );

    list.innerHTML =
      '<div class="loading-state">Could not load chats.</div>';

    return;
  }

  const ids = new Set();

  (sent || []).forEach(row => {
    if (row.receiver_id) {
      ids.add(row.receiver_id);
    }
  });

  (received || []).forEach(row => {
    if (row.sender_id) {
      ids.add(row.sender_id);
    }
  });

  if (ids.size === 0) {
    show($("chatEmpty"));
    list.innerHTML = "";
    return;
  }

  hide($("chatEmpty"));

  const idArray =
    Array.from(ids);

  const { data: users, error } =
    await supabaseClient
      .from("profiles")
      .select("*")
      .in("id", idArray);

  if (error) {
    console.error(
      "Chat users error:",
      error
    );

    return;
  }

  renderChatList(users || []);
}


// ============================================================
// 22. RENDER CHAT LIST
// ============================================================

function renderChatList(users) {
  const list =
    $("chatList");

  if (!list) return;

  list.innerHTML = "";

  if (!users.length) {
    show($("chatEmpty"));
    return;
  }

  hide($("chatEmpty"));

  users.forEach(user => {
    const item =
      document.createElement("div");

    item.className = "chat-item";

    const name =
      user.display_name ||
      "QEVIRA User";

    const initial =
      name.charAt(0).toUpperCase();

    const status =
      user.is_online
        ? "Online"
        : "Offline";

    item.innerHTML = `
      <div class="chat-avatar">
        ${escapeHTML(initial)}
      </div>

      <div class="chat-info">
        <div class="chat-name">
          ${escapeHTML(name)}
        </div>

        <div class="chat-status">
          ${escapeHTML(status)}
        </div>
      </div>
    `;

    item.addEventListener(
      "click",
      () => {
        openChat(user);
      }
    );

    list.appendChild(item);
  });
}


// ============================================================
// 23. OPEN CHAT
// ============================================================

async function openChat(user) {
  if (!user || !currentUser) return;

  currentChatUser = user;

  const modal =
    $("chatModal");

  if (!modal) return;

  show(modal);

  const name =
    user.display_name ||
    "QEVIRA User";

  const initial =
    name.charAt(0).toUpperCase();

  if ($("chatTitle")) {
    $("chatTitle").textContent =
      name;
  }

  if ($("chatAvatar")) {
    $("chatAvatar").textContent =
      initial;
  }

  if ($("chatStatus")) {
    if (user.is_online) {
      $("chatStatus").textContent =
        "Online";
    } else {
      $("chatStatus").textContent =
        formatLastSeen(user.last_seen);
    }
  }

  await loadMessages(user.id);

  subscribeToMessages();
}


// ============================================================
// 24. CLOSE CHAT
// ============================================================

function closeChat() {
  hide($("chatModal"));

  currentChatUser = null;

  if (messageSubscription) {
    supabaseClient.removeChannel(
      messageSubscription
    );

    messageSubscription = null;
  }
}


// ============================================================
// 25. LOAD MESSAGES
// ============================================================

async function loadMessages(otherUserId) {
  const container =
    $("messages");

  if (!container) return;

  container.innerHTML =
    '<div class="loading-state">Loading messages...</div>';

  const { data, error } =
    await supabaseClient
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`
      )
      .order("created_at", {
        ascending: true
      });

  if (error) {
    console.error(
      "Messages error:",
      error
    );

    container.innerHTML =
      '<div class="loading-state">Could not load messages.</div>';

    return;
  }

  renderMessages(data || []);

  scrollMessagesToBottom();
}


// ============================================================
// 26. RENDER MESSAGES
// ============================================================

function renderMessages(messages) {
  const container =
    $("messages");

  if (!container) return;

  container.innerHTML = "";

  if (!messages.length) {
    container.innerHTML = `
      <div class="loading-state">
        No messages yet. Say hello 👋
      </div>
    `;

    return;
  }

  messages.forEach(message => {
    appendMessage(message);
  });
}


// ============================================================
// 27. APPEND MESSAGE
// ============================================================

function appendMessage(message) {
  const container =
    $("messages");

  if (!container) return;

  const isMine =
    message.sender_id === currentUser.id;

  const row =
    document.createElement("div");

  row.className =
    "message-row " +
    (isMine ? "mine" : "theirs");

  const bubble =
    document.createElement("div");

  bubble.className =
    "message-bubble";

  bubble.innerHTML = `
    <div class="message-text">
      ${escapeHTML(message.body)}
    </div>

    <div class="message-time">
      ${escapeHTML(
        formatTime(message.created_at)
      )}
    </div>
  `;

  row.appendChild(bubble);

  container.appendChild(row);
}


// ============================================================
// 28. SEND MESSAGE
// ============================================================

async function sendMessage(event) {
  if (event) {
    event.preventDefault();
  }

  if (!currentUser || !currentChatUser) {
    return;
  }

  const input =
    $("messageInput");

  if (!input) return;

  const body =
    input.value.trim();

  if (!body) return;

  const button =
    $("sendMessageBtn");

  if (button) {
    button.disabled = true;
  }

  try {
    const { data, error } =
      await supabaseClient
        .from("messages")
        .insert({
          sender_id: currentUser.id,
          receiver_id: currentChatUser.id,
          body
        })
        .select()
        .single();

    if (error) {
      throw error;
    }

    input.value = "";

    // Add immediately if realtime does not return it to this client
    if (data) {
      const existing =
        document.querySelector(
          `[data-message-id="${data.id}"]`
        );

      if (!existing) {
        appendMessage(data);
      }
    }

    scrollMessagesToBottom();

    loadChats();

  } catch (error) {
    console.error(
      "Send message error:",
      error
    );

    alert(
      error.message ||
      "Message could not be sent."
    );

  } finally {
    if (button) {
      button.disabled = false;
    }

    input.focus();
  }
}


// ============================================================
// 29. REALTIME MESSAGE SUBSCRIPTION
// ============================================================

function subscribeToMessages() {
  if (!currentUser) return;

  if (messageSubscription) {
    supabaseClient.removeChannel(
      messageSubscription
    );

    messageSubscription = null;
  }

  messageSubscription =
    supabaseClient
      .channel(
        "qevira-messages-" +
        currentUser.id
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages"
        },
        payload => {
          const message =
            payload.new;

          if (!currentChatUser) {
            return;
          }

          const belongsToCurrentChat =
            (
              message.sender_id === currentUser.id &&
              message.receiver_id === currentChatUser.id
            ) ||
            (
              message.sender_id === currentChatUser.id &&
              message.receiver_id === currentUser.id
            );

          if (!belongsToCurrentChat) {
            loadChats();
            return;
          }

          // Avoid duplicate messages
          const existing =
            document.querySelector(
              `[data-message-id="${message.id}"]`
            );

          if (existing) return;

          appendMessage(message);

          scrollMessagesToBottom();

          loadChats();
        }
      )
      .subscribe();
}


// ============================================================
// 30. SCROLL MESSAGES
// ============================================================

function scrollMessagesToBottom() {
  const container =
    $("messages");

  if (!container) return;

  setTimeout(() => {
    container.scrollTop =
      container.scrollHeight;
  }, 50);
}


// ============================================================
// 31. NAVIGATION
// ============================================================

function showPage(pageName) {
  const pages =
    document.querySelectorAll(".page");

  pages.forEach(page => {
    hide(page);
  });

  const target =
    $(pageName);

  if (target) {
    show(target);
  }

  if (pageName === "chatsPage") {
    loadChats();
  }

  if (pageName === "contactsPage") {
    loadContacts();
  }

  if (pageName === "profilePage") {
    loadCurrentProfile();
  }
}


// ============================================================
// 32. CONTACT SEARCH
// ============================================================

function filterContacts() {
  const search =
    $("contactsSearchInput")?.value
      .trim()
      .toLowerCase() || "";

  const items =
    document.querySelectorAll(
      "#contactsList .contact-item"
    );

  items.forEach(item => {
    const text =
      item.textContent
        .toLowerCase();

    if (!search || text.includes(search)) {
      show(item);
    } else {
      hide(item);
    }
  });
}


// ============================================================
// 33. CHAT SEARCH
// ============================================================

function filterChats() {
  const search =
    $("searchInput")?.value
      .trim()
      .toLowerCase() || "";

  const items =
    document.querySelectorAll(
      "#chatList .chat-item"
    );

  items.forEach(item => {
    const text =
      item.textContent
        .toLowerCase();

    if (!search || text.includes(search)) {
      show(item);
    } else {
      hide(item);
    }
  });
}


// ============================================================
// 34. NEW CHAT
// ============================================================

function startNewChat() {
  showPage("contactsPage");
}


// ============================================================
// 35. PROFILE EDIT TOGGLE
// ============================================================

function toggleProfileEdit() {
  const edit =
    $("profileEdit");

  if (!edit) return;

  if (edit.classList.contains("hidden")) {
    renderCurrentProfile();
    show(edit);
  } else {
    hide(edit);
  }
}


// ============================================================
// 36. DARK MODE
// ============================================================

function toggleDarkMode() {
  document.body.classList.toggle("dark");

  const isDark =
    document.body.classList.contains("dark");

  localStorage.setItem(
    "qevira-dark-mode",
    isDark ? "true" : "false"
  );
}

function loadDarkMode() {
  const saved =
    localStorage.getItem(
      "qevira-dark-mode"
    );

  if (saved === "true") {
    document.body.classList.add("dark");
  }
}


// ============================================================
// 37. VOICE CALL — PHASE 2
// ============================================================

function startVoiceCall() {
  if (!currentChatUser) return;

  alert(
    "Voice calling will be activated in QEVIRA Phase 2."
  );
}


// ============================================================
// 38. VIDEO CALL — PHASE 2
// ============================================================

function startVideoCall() {
  if (!currentChatUser) return;

  alert(
    "Video calling will be activated in QEVIRA Phase 2."
  );
}


// ============================================================
// 39. LOGOUT
// ============================================================

async function logout() {
  try {
    stopPresence();

    if (messageSubscription) {
      await supabaseClient.removeChannel(
        messageSubscription
      );

      messageSubscription = null;
    }

    if (currentUser) {
      await updatePresence(false);
    }

    await supabaseClient.auth.signOut();

  } catch (error) {
    console.error(
      "Logout error:",
      error
    );

  } finally {
    currentUser = null;
    currentProfile = null;
    currentChatUser = null;

    showAuth();
    showLoginMode();
  }
}


// ============================================================
// 40. START APP
// ============================================================

async function startApp() {
  if (!currentUser) return;

  // Show app FIRST.
  // Database problems should never prevent login screen
  // from changing to the main app.
  showApp();

  try {
    await ensureProfile();

    await loadCurrentProfile();

    startPresence();

    loadChats();

    showPage("chatsPage");

  } catch (error) {
    console.error(
      "App startup error:",
      error
    );
  }
}


// ============================================================
// 41. AUTH STATE
// ============================================================

supabaseClient.auth.onAuthStateChange(
  async (event, session) => {
    console.log(
      "Auth event:",
      event
    );

    if (session?.user) {
      currentUser =
        session.user;

      if (
        event === "SIGNED_IN" ||
        event === "INITIAL_SESSION"
      ) {
        await startApp();
      }

    } else {
      currentUser = null;
      currentProfile = null;

      stopPresence();

      showAuth();
    }
  }
);


// ============================================================
// 42. EVENT LISTENERS
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    // Dark mode
    loadDarkMode();


    // Auth switch
    $("switchAuthBtn")?.addEventListener(
      "click",
      () => {
        if (authMode === "login") {
          showSignupMode();
        } else {
          showLoginMode();
        }
      }
    );


    // Signup
    $("signupBtn")?.addEventListener(
      "click",
      signup
    );


    // Login
    $("loginBtn")?.addEventListener(
      "click",
      login
    );


    // Enter key login
    $("loginPassword")?.addEventListener(
      "keydown",
      event => {
        if (event.key === "Enter") {
          login();
        }
      }
    );


    // Enter key signup
    $("signupPassword")?.addEventListener(
      "keydown",
      event => {
        if (event.key === "Enter") {
          signup();
        }
      }
    );


    // Navigation
    $("chatsNavBtn")?.addEventListener(
      "click",
      () => showPage("chatsPage")
    );

    $("contactsNavBtn")?.addEventListener(
      "click",
      () => showPage("contactsPage")
    );

    $("profileNavBtn")?.addEventListener(
      "click",
      () => showPage("profilePage")
    );


    // Chat close
    $("closeChatModal")?.addEventListener(
      "click",
      closeChat
    );


    // Message form
    $("messageForm")?.addEventListener(
      "submit",
      sendMessage
    );


    // Search
    $("searchInput")?.addEventListener(
      "input",
      filterChats
    );

    $("contactsSearchInput")?.addEventListener(
      "input",
      filterContacts
    );


    // New chat
    $("newChatBtn")?.addEventListener(
      "click",
      startNewChat
    );


    // Dark mode
    $("darkModeBtn")?.addEventListener(
      "click",
      toggleDarkMode
    );


    // Profile edit
    $("editProfileBtn")?.addEventListener(
      "click",
      toggleProfileEdit
    );


    // Profile save
    $("saveProfileBtn")?.addEventListener(
      "click",
      saveProfile
    );


    // Profile cancel
    $("cancelProfileEditBtn")?.addEventListener(
      "click",
      () => hide($("profileEdit"))
    );


    // Logout
    $("logoutBtn")?.addEventListener(
      "click",
      logout
    );


    // Calls
    $("voiceCallBtn")?.addEventListener(
      "click",
      startVoiceCall
    );

    $("videoCallBtn")?.addEventListener(
      "click",
      startVideoCall
    );


    // Start with login mode
    showLoginMode();
  }
);


// ============================================================
// 43. CHECK EXISTING SESSION
// ============================================================

(async function checkExistingSession() {
  try {
    const {
      data,
      error
    } =
      await supabaseClient.auth.getSession();

    if (error) {
      console.error(
        "Session error:",
        error
      );

      showAuth();
      return;
    }

    if (data?.session?.user) {
      currentUser =
        data.session.user;

      await startApp();

    } else {
      showAuth();
    }

  } catch (error) {
    console.error(
      "Initial session error:",
      error
    );

    showAuth();
  }
})();
