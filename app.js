// ======================================================
// QEVIRA - REAL SUPABASE AUTHENTICATION
// ======================================================

// Your Supabase project URL
const SUPABASE_URL = "https://wcdywnkxtuexjbjgerzd.supabase.co";

// IMPORTANT:
// Paste your SUPABASE PUBLISHABLE KEY between the quotes below.
// Do NOT use a secret/service_role key.
const SUPABASE_PUBLISHABLE_KEY = "PASTE_YOUR_PUBLISHABLE_KEY_HERE";


// Create Supabase client
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);


// ======================================================
// ELEMENTS
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


// ======================================================
// AUTH SCREEN
// ======================================================

let loginMode = false;

function showMessage(message) {
  authMessage.textContent = message;
}

function showLogin() {

  loginMode = true;

  signupForm.style.display = "none";
  loginForm.style.display = "block";

  authSubtitle.textContent = "Welcome back";
  switchText.textContent = "Don't have an account?";
  switchAuthBtn.textContent = "Create account";

  showMessage("");
}


function showSignup() {

  loginMode = false;

  signupForm.style.display = "block";
  loginForm.style.display = "none";

  authSubtitle.textContent = "Create your account";
  switchText.textContent = "Already have an account?";
  switchAuthBtn.textContent = "Log in";

  showMessage("");
}


switchAuthBtn.addEventListener("click", () => {

  if (loginMode) {
    showSignup();
  } else {
    showLogin();
  }

});


// ======================================================
// SIGN UP
// ======================================================

signupForm.addEventListener("submit", async (event) => {

  event.preventDefault();

  const email = signupEmail.value.trim();
  const password = signupPassword.value;

  if (!email || !password) {
    showMessage("Please enter your email and password.");
    return;
  }

  signupBtn.disabled = true;
  signupBtn.textContent = "Creating account...";

  showMessage("");

  try {

    const { data, error } =
      await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
          emailRedirectTo: window.location.origin + window.location.pathname
        }
      });

    if (error) {
      throw error;
    }

    // If Supabase requires email confirmation
    if (data.user && !data.session) {

      showMessage(
        "Account created! Check your email to confirm your account."
      );

      signupForm.reset();

    } else {

      showMessage("Account created successfully! 🎉");

    }

  } catch (error) {

    console.error(error);

    showMessage(error.message || "Could not create account.");

  } finally {

    signupBtn.disabled = false;
    signupBtn.textContent = "Create account";

  }

});


// ======================================================
// LOGIN
// ======================================================

loginForm.addEventListener("submit", async (event) => {

  event.preventDefault();

  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  if (!email || !password) {
    showMessage("Please enter your email and password.");
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = "Logging in...";

  showMessage("");

  try {

    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

    if (error) {
      throw error;
    }

    if (data.user) {

      showMessage("Login successful! 🎉");

      await showApp(data.user);

    }

  } catch (error) {

    console.error(error);

    showMessage(error.message || "Login failed.");

  } finally {

    loginBtn.disabled = false;
    loginBtn.textContent = "Log in";

  }

});


// ======================================================
// SHOW APP
// ======================================================

async function showApp(user) {

  authScreen.style.display = "none";
  app.style.display = "block";

  const email = user.email || "";

  if (currentUserEmail) {
    currentUserEmail.textContent = email;
  }

  if (profileEmail) {
    profileEmail.textContent = email;
  }

  loadDemoChats();

}


// ======================================================
// LOGOUT
// ======================================================

logoutBtn.addEventListener("click", async () => {

  logoutBtn.disabled = true;
  logoutBtn.textContent = "Logging out...";

  const { error } = await supabaseClient.auth.signOut();

  if (error) {

    console.error(error);

    logoutBtn.disabled = false;
    logoutBtn.textContent = "Log out";

    alert(error.message);

    return;
  }

  app.style.display = "none";
  authScreen.style.display = "flex";

  loginEmail.value = "";
  loginPassword.value = "";

  showLogin();

  logoutBtn.disabled = false;
  logoutBtn.textContent = "Log out";

});


// ======================================================
// CHECK EXISTING SESSION
// ======================================================

async function checkSession() {

  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (session && session.user) {

    await showApp(session.user);

  } else {

    authScreen.style.display = "flex";
    app.style.display = "none";

  }

}


// ======================================================
// AUTH STATE LISTENER
// ======================================================

supabaseClient.auth.onAuthStateChange(
  async (event, session) => {

    console.log("Auth event:", event);

    if (
      (event === "SIGNED_IN" ||
       event === "INITIAL_SESSION") &&
      session &&
      session.user
    ) {

      await showApp(session.user);

    }

  }
);


// ======================================================
// DEMO CHAT DATA
// This will be replaced with the REAL DATABASE later.
// ======================================================

const demoChats = [

  {
    name: "Alex",
    message: "Hey! 👋",
    time: "10:30"
  },

  {
    name: "Maya",
    message: "See you soon!",
    time: "09:45"
  },

  {
    name: "Arun",
    message: "Nice 👍",
    time: "Yesterday"
  },

  {
    name: "Sara",
    message: "Hello!",
    time: "Yesterday"
  }

];


function loadDemoChats() {

  const chatList = document.getElementById("chatList");

  if (!chatList) return;

  chatList.innerHTML = "";

  demoChats.forEach((chat) => {

    const item = document.createElement("div");

    item.className = "chat-item";

    item.innerHTML = `
      <div class="chat-avatar">
        ${escapeHtml(chat.name.charAt(0))}
      </div>

      <div class="chat-info">

        <div class="chat-name">
          ${escapeHtml(chat.name)}
        </div>

        <div class="chat-message">
          ${escapeHtml(chat.message)}
        </div>

      </div>

      <div class="chat-time">
        ${escapeHtml(chat.time)}
      </div>
    `;

    item.addEventListener("click", () => {

      openChat(chat.name);

    });

    chatList.appendChild(item);

  });

}


// ======================================================
// SAFE HTML
// ======================================================

function escapeHtml(value) {

  return String(value).replace(
    /[&<>"']/g,
    function (match) {

      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"

      }[match];

    }
  );

}


// ======================================================
// CHAT MODAL
// ======================================================

const chatModal = document.getElementById("chatModal");
const closeChatModal = document.getElementById("closeChatModal");
const chatTitle = document.getElementById("chatTitle");
const messages = document.getElementById("messages");

const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");


function openChat(name) {

  if (!chatModal) return;

  chatModal.style.display = "flex";

  if (chatTitle) {
    chatTitle.textContent = name;
  }

  if (messages) {

    messages.innerHTML = `
      <div class="message received">
        Hey! This is the QEVIRA demo chat. 👋
      </div>
    `;

  }

}


if (closeChatModal) {

  closeChatModal.addEventListener("click", () => {

    chatModal.style.display = "none";

  });

}


if (messageForm) {

  messageForm.addEventListener("submit", (event) => {

    event.preventDefault();

    const text = messageInput.value.trim();

    if (!text || !messages) return;

    const message = document.createElement("div");

    message.className = "message sent";

    message.textContent = text;

    messages.appendChild(message);

    messageInput.value = "";

    messages.scrollTop = messages.scrollHeight;

  });

}


// ======================================================
// SEARCH
// ======================================================

const searchInput = document.getElementById("searchInput");

if (searchInput) {

  searchInput.addEventListener("input", () => {

    const query =
      searchInput.value.trim().toLowerCase();

    const chatItems =
      document.querySelectorAll(".chat-item");

    chatItems.forEach((item) => {

      const text =
        item.textContent.toLowerCase();

      item.style.display =
        text.includes(query) ? "flex" : "none";

    });

  });

}


// ======================================================
// NAVIGATION
// ======================================================

const navButtons =
  document.querySelectorAll(".nav-btn");

navButtons.forEach((button) => {

  button.addEventListener("click", () => {

    const target =
      button.dataset.page;

    document
      .querySelectorAll(".page")
      .forEach((page) => {

        page.style.display =
          page.id === target ? "block" : "none";

      });

    navButtons.forEach((btn) => {

      btn.classList.remove("active");

    });

    button.classList.add("active");

  });

});


// ======================================================
// DARK MODE
// ======================================================

const darkModeBtn =
  document.getElementById("darkModeBtn");

if (darkModeBtn) {

  darkModeBtn.addEventListener("click", () => {

    document.body.classList.toggle("dark-mode");

    const dark =
      document.body.classList.contains("dark-mode");

    localStorage.setItem(
      "qevira_dark_mode",
      dark ? "1" : "0"
    );

  });

}


if (
  localStorage.getItem("qevira_dark_mode") === "1"
) {

  document.body.classList.add("dark-mode");

}


// ======================================================
// START QEVIRA
// ======================================================

checkSession();
