// ======================================================
// QEVIRA — REAL SUPABASE AUTH + REAL 1-TO-1 MESSAGING
// ======================================================

// ======================================================
// 1. SUPABASE CONFIGURATION
// ======================================================

const SUPABASE_URL =
  "https://wcdywnkxtuexjbjgerzd.supabase.co";

// 🔴 PASTE YOUR SUPABASE PUBLISHABLE KEY BETWEEN THE QUOTES
const SUPABASE_URL =
  "https://wcdywnkxtuexjbjgerzd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
 sb_publishable_bD3ajWNbZPoUw4uUwYhK3w_P-iZIAhw 
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);


// ======================================================
// 2. DOM ELEMENTS
// ======================================================

const authScreen = document.getElementById("authScreen");
const app = document.getElementById("app");

const signupForm = document.getElementById("signupForm");
const loginForm = document.getElementById("loginForm");

const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");

const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");

const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");

const authMessage = document.getElementById("authMessage");
const authSubtitle = document.getElementById("authSubtitle");

const switchAuthBtn = document.getElementById("switchAuthBtn");
const switchText = document.getElementById("switchText");

const logoutBtn = document.getElementById("logoutBtn");

const currentUserEmail = document.getElementById("currentUserEmail");
const profileEmail = document.getElementById("profileEmail");

const chatList = document.getElementById("chatList");
const contactsList = document.getElementById("contactsList");

const searchInput = document.getElementById("searchInput");

const chatModal = document.getElementById("chatModal");
const closeChatModal = document.getElementById("closeChatModal");

const chatTitle = document.getElementById("chatTitle");
const messages = document.getElementById("messages");

const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");


// ======================================================
// 3. APP STATE
// ======================================================

let currentUser = null;
let currentProfile = null;
let currentChatUser = null;

let realtimeChannel = null;
let authMode = "login";


// ======================================================
// 4. SMALL HELPERS
// ======================================================

function setAuthMessage(message, isError = false) {
  if (!authMessage) return;

  authMessage.textContent = message;
  authMessage.style.color = isError ? "red" : "";
}

function setButtonLoading(button, loading, normalText) {
  if (!button) return;

  button.disabled = loading;
  button.textContent = loading ? "Please wait..." : normalText;
}


// ======================================================
// 5. SHOW LOGIN
// ======================================================

function showLogin() {
  authMode = "login";

  if (loginForm) loginForm.style.display = "block";
  if (signupForm) signupForm.style.display = "none";

  if (authSubtitle) {
    authSubtitle.textContent = "Login to continue to QEVIRA";
  }

  if (switchText) {
    switchText.textContent = "Don't have an account?";
  }

  if (switchAuthBtn) {
    switchAuthBtn.textContent = "Create account";
  }

  setAuthMessage("");
}


// ======================================================
// 6. SHOW SIGNUP
// ======================================================

function showSignup() {
  authMode = "signup";

  if (loginForm) loginForm.style.display = "none";
  if (signupForm) signupForm.style.display = "block";

  if (authSubtitle) {
    authSubtitle.textContent = "Create your QEVIRA account";
  }

  if (switchText) {
    switchText.textContent = "Already have an account?";
  }

  if (switchAuthBtn) {
    switchAuthBtn.textContent = "Login";
  }

  setAuthMessage("");
}


// ======================================================
// 7. SWITCH LOGIN / SIGNUP
// ======================================================

if (switchAuthBtn) {
  switchAuthBtn.addEventListener("click", () => {
    if (authMode === "login") {
      showSignup();
    } else {
      showLogin();
    }
  });
}


// ======================================================
// 8. SIGN UP
// ======================================================

async function signUp() {
  if (!signupEmail || !signupPassword) return;

  const email = signupEmail.value.trim();
  const password = signupPassword.value;

  if (!email || !password) {
    setAuthMessage("Please enter your email and password.", true);
    return;
  }

  if (password.length < 6) {
    setAuthMessage(
      "Password must contain at least 6 characters.",
      true
    );
    return;
  }

  setButtonLoading(signupBtn, true, "Create account");
  setAuthMessage("Creating your account...");

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password
    });

    if (error) {
      throw error;
    }

    if (data.user) {
      setAuthMessage(
        "Account created successfully. You can now login."
      );
    } else {
      setAuthMessage(
        "Check your email to confirm your account."
      );
    }

    if (signupPassword) {
      signupPassword.value = "";
    }

  } catch (error) {
    console.error("Signup error:", error);

    setAuthMessage(
      error.message || "Unable to create account.",
      true
    );
  }

  setButtonLoading(signupBtn, false, "Create account");
}


// ======================================================
// 9. LOGIN
// ======================================================

async function signInWithPassword() {
  if (!loginEmail || !loginPassword) return;

  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  if (!email || !password) {
    setAuthMessage("Please enter your email and password.", true);
    return;
  }

  setButtonLoading(loginBtn, true, "Login");
  setAuthMessage("Logging in...");

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

    await showApp();

  } catch (error) {
    console.error("Login error:", error);

    setAuthMessage(
      error.message || "Login failed.",
      true
    );
  }

  setButtonLoading(loginBtn, false, "Login");
}


// ======================================================
// 10. SHOW APP
// ======================================================

async function showApp() {
  if (!currentUser) return;

  if (authScreen) {
    authScreen.style.display = "none";
  }

  if (app) {
    app.style.display = "block";
  }

  if (currentUserEmail) {
    currentUserEmail.textContent =
      currentUser.email || "";
  }

  if (profileEmail) {
    profileEmail.textContent =
      currentUser.email || "";
  }

  await loadCurrentProfile();
  await loadContacts();
  await loadChatList();

  setupRealtime();
}


// ======================================================
// 11. LOAD CURRENT PROFILE
// ======================================================

async function loadCurrentProfile() {
  if (!currentUser) return;

  try {
    const { data, error } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    currentProfile = data;

  } catch (error) {
    console.error("Profile loading error:", error);
  }
}


// ======================================================
// 12. LOAD CONTACTS
// ======================================================

async function loadContacts() {
  if (!contactsList || !currentUser) return;

  contactsList.innerHTML = "Loading users...";

  try {
    const { data, error } = await supabaseClient
      .from("profiles")
      .select("*")
      .neq("id", currentUser.id)
      .order("display_name", {
        ascending: true
      });

    if (error) {
      throw error;
    }

    contactsList.innerHTML = "";

    if (!data || data.length === 0) {
      contactsList.innerHTML =
        "<p>No other users yet.</p>";
      return;
    }

    data.forEach(profile => {
      const item = createContactElement(profile);
      contactsList.appendChild(item);
    });

  } catch (error) {
    console.error("Contacts error:", error);

    contactsList.innerHTML =
      "<p>Unable to load users.</p>";
  }
}


// ======================================================
// 13. CREATE CONTACT ELEMENT
// ======================================================

function createContactElement(profile) {
  const item = document.createElement("div");

  item.className = "contact-item";

  const name =
    profile.display_name ||
    profile.username ||
    "QEVIRA User";

  const username =
    profile.username
      ? "@" + profile.username
      : "";

  item.innerHTML = `
    <div class="contact-avatar">
      ${escapeHtml(name.charAt(0).toUpperCase())}
    </div>

    <div class="contact-info">
      <strong>${escapeHtml(name)}</strong>
      <span>${escapeHtml(username)}</span>
    </div>
  `;

  item.addEventListener("click", () => {
    openChat(profile);
  });

  return item;
}


// ======================================================
// 14. LOAD CHAT LIST
// ======================================================

async function loadChatList() {
  if (!chatList || !currentUser) return;

  chatList.innerHTML = "Loading chats...";

  try {
    const { data, error } = await supabaseClient
      .from("messages")
      .select("*")
      .or(
        `sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`
      )
      .order("created_at", {
        ascending: false
      });

    if (error) {
      throw error;
    }

    chatList.innerHTML = "";

    if (!data || data.length === 0) {
      chatList.innerHTML =
        "<p>No chats yet.</p>";
      return;
    }

    const userIds = new Set();

    data.forEach(message => {
      const otherUserId =
        message.sender_id === currentUser.id
          ? message.receiver_id
          : message.sender_id;

      userIds.add(otherUserId);
    });

    for (const userId of userIds) {
      await addChatListUser(userId, data);
    }

  } catch (error) {
    console.error("Chat list error:", error);

    chatList.innerHTML =
      "<p>Unable to load chats.</p>";
  }
}


// ======================================================
// 15. ADD CHAT USER TO CHAT LIST
// ======================================================

async function addChatListUser(userId, allMessages) {
  if (!chatList) return;

  try {
    const { data: profile, error } =
      await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

    if (error) {
      throw error;
    }

    if (!profile) return;

    const latestMessage =
      allMessages.find(message =>
        message.sender_id === userId ||
        message.receiver_id === userId
      );

    const item = document.createElement("div");

    item.className = "chat-list-item";

    const name =
      profile.display_name ||
      profile.username ||
      "QEVIRA User";

    const preview =
      latestMessage?.body || "";

    item.innerHTML = `
      <div class="contact-avatar">
        ${escapeHtml(name.charAt(0).toUpperCase())}
      </div>

      <div class="contact-info">
        <strong>${escapeHtml(name)}</strong>
        <span>${escapeHtml(preview)}</span>
      </div>
    `;

    item.addEventListener("click", () => {
      openChat(profile);
    });

    chatList.appendChild(item);

  } catch (error) {
    console.error("Chat user error:", error);
  }
}


// ======================================================
// 16. OPEN CHAT
// ======================================================

async function openChat(profile) {
  if (!profile || !currentUser) return;

  currentChatUser = profile;

  const name =
    profile.display_name ||
    profile.username ||
    "QEVIRA User";

  if (chatTitle) {
    chatTitle.textContent = name;
  }

  if (chatModal) {
    chatModal.style.display = "flex";
  }

  await loadMessages();
}


// ======================================================
// 17. LOAD MESSAGES
// ======================================================

async function loadMessages() {
  if (
    !messages ||
    !currentUser ||
    !currentChatUser
  ) {
    return;
  }

  messages.innerHTML = "Loading messages...";

  try {
    const myId = currentUser.id;
    const otherId = currentChatUser.id;

    const { data, error } = await supabaseClient
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${myId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${myId})`
      )
      .order("created_at", {
        ascending: true
      });

    if (error) {
      throw error;
    }

    renderMessages(data || []);

  } catch (error) {
    console.error("Messages error:", error);

    messages.innerHTML =
      "<p>Unable to load messages.</p>";
  }
}


// ======================================================
// 18. RENDER MESSAGES
// ======================================================

function renderMessages(messageList) {
  if (!messages || !currentUser) return;

  messages.innerHTML = "";

  if (messageList.length === 0) {
    messages.innerHTML =
      "<p>No messages yet. Say hello! 👋</p>";

    return;
  }

  messageList.forEach(message => {
    const bubble = document.createElement("div");

    const mine =
      message.sender_id === currentUser.id;

    bubble.className =
      mine
        ? "message message-sent"
        : "message message-received";

    let body = message.body || "";

    if (message.deleted_at) {
      body = "Message deleted";
    }

    bubble.innerHTML = `
      <div class="message-body">
        ${escapeHtml(body)}
      </div>
    `;

    messages.appendChild(bubble);
  });

  messages.scrollTop = messages.scrollHeight;
}


// ======================================================
// 19. SEND MESSAGE
// ======================================================

async function sendMessage() {
  if (
    !currentUser ||
    !currentChatUser ||
    !messageInput
  ) {
    return;
  }

  const body = messageInput.value.trim();

  if (!body) return;

  messageInput.disabled = true;

  try {
    const { error } = await supabaseClient
      .from("messages")
      .insert({
        sender_id: currentUser.id,
        receiver_id: currentChatUser.id,
        body: body
      });

    if (error) {
      throw error;
    }

    messageInput.value = "";

    await loadMessages();
    await loadChatList();

  } catch (error) {
    console.error("Send message error:", error);

    alert(
      error.message ||
      "Message could not be sent."
    );
  }

  messageInput.disabled = false;
}


// ======================================================
// 20. MESSAGE FORM
// ======================================================

if (messageForm) {
  messageForm.addEventListener("submit", async event => {
    event.preventDefault();

    await sendMessage();
  });
}


// ======================================================
// 21. REALTIME MESSAGES
// ======================================================

function setupRealtime() {
  if (!currentUser) return;

  if (realtimeChannel) {
    try {
      supabaseClient.removeChannel(
        realtimeChannel
      );
    } catch (error) {
      console.log(error);
    }
  }

  realtimeChannel =
    supabaseClient
      .channel("qevira-messages-" + currentUser.id)

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages"
        },
        async payload => {

          const message = payload.new;

          if (!message) return;

          const belongsToCurrentUser =
            message.sender_id === currentUser.id ||
            message.receiver_id === currentUser.id;

          if (!belongsToCurrentUser) return;

          if (
            currentChatUser &&
            (
              (
                message.sender_id === currentUser.id &&
                message.receiver_id === currentChatUser.id
              )
              ||
              (
                message.sender_id === currentChatUser.id &&
                message.receiver_id === currentUser.id
              )
            )
          ) {
            await loadMessages();
          }

          await loadChatList();
        }
      )

      .subscribe(status => {
        console.log(
          "QEVIRA realtime status:",
          status
        );
      });
}


// ======================================================
// 22. CLOSE CHAT
// ======================================================

if (closeChatModal) {
  closeChatModal.addEventListener(
    "click",
    () => {
      if (chatModal) {
        chatModal.style.display = "none";
      }

      currentChatUser = null;
    }
  );
}


// Close when clicking outside modal

if (chatModal) {
  chatModal.addEventListener(
    "click",
    event => {
      if (event.target === chatModal) {
        chatModal.style.display = "none";
        currentChatUser = null;
      }
    }
  );
}


// ======================================================
// 23. LOGOUT
// ======================================================

async function logout() {
  try {
    if (realtimeChannel) {
      await supabaseClient.removeChannel(
        realtimeChannel
      );

      realtimeChannel = null;
    }

    await supabaseClient.auth.signOut();

    currentUser = null;
    currentProfile = null;
    currentChatUser = null;

    if (app) {
      app.style.display = "none";
    }

    if (authScreen) {
      authScreen.style.display = "block";
    }

    showLogin();

  } catch (error) {
    console.error("Logout error:", error);
  }
}


if (logoutBtn) {
  logoutBtn.addEventListener(
    "click",
    logout
  );
}


// ======================================================
// 24. SEARCH USERS
// ======================================================

if (searchInput) {
  searchInput.addEventListener(
    "input",
    async () => {

      const query =
        searchInput.value
          .trim()
          .toLowerCase();

      if (!contactsList) return;

      const items =
        contactsList.querySelectorAll(
          ".contact-item"
        );

      items.forEach(item => {
        const text =
          item.textContent
            .toLowerCase();

        item.style.display =
          text.includes(query)
            ? ""
            : "none";
      });
    }
  );
}


// ======================================================
// 25. LOGIN BUTTON
// ======================================================

if (loginForm) {
  loginForm.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      await signInWithPassword();
    }
  );
}

if (loginBtn) {
  loginBtn.addEventListener(
    "click",
    async event => {
      event.preventDefault();

      await signInWithPassword();
    }
  );
}


// ======================================================
// 26. SIGNUP BUTTON
// ======================================================

if (signupForm) {
  signupForm.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      await signUp();
    }
  );
}

if (signupBtn) {
  signupBtn.addEventListener(
    "click",
    async event => {
      event.preventDefault();

      await signUp();
    }
  );
}


// ======================================================
// 27. ESCAPE HTML
// ======================================================

function escapeHtml(value) {
  const div = document.createElement("div");

  div.textContent =
    value == null
      ? ""
      : String(value);

  return div.innerHTML;
}


// ======================================================
// 28. AUTH STATE
// ======================================================

supabaseClient.auth.onAuthStateChange(
  async (event, session) => {

    console.log(
      "Auth event:",
      event
    );

    if (session && session.user) {
      currentUser = session.user;

      await showApp();

    } else {
      currentUser = null;

      if (app) {
        app.style.display = "none";
      }

      if (authScreen) {
        authScreen.style.display = "block";
      }
    }
  }
);


// ======================================================
// 29. CHECK EXISTING SESSION
// ======================================================

async function checkSession() {
  try {
    const {
      data: {
        session
      }
    } =
      await supabaseClient.auth.getSession();

    if (session && session.user) {

      currentUser = session.user;

      await showApp();

    } else {

      if (app) {
        app.style.display = "none";
      }

      if (authScreen) {
        authScreen.style.display = "block";
      }

      showLogin();
    }

  } catch (error) {

    console.error(
      "Session error:",
      error
    );

    showLogin();
  }
}


// ======================================================
// 30. START QEVIRA
// ======================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    console.log(
      "QEVIRA started successfully."
    );

    checkSession();

  }
);
