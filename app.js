// ======================================================
// QEVIRA
// REAL SUPABASE AUTH
// REAL 1-TO-1 MESSAGING
// REAL WEBRTC VOICE + VIDEO CALLING
// ======================================================


// ======================================================
// 1. SUPABASE CONFIG
// ======================================================

const SUPABASE_URL =
  "https://wcdywnkxtuexjbjgerzd.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_bD3ajWNbZPoUw4uUwYhK3w_P-iZIAhw";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );


// ======================================================
// 2. GLOBAL STATE
// ======================================================

let currentUser = null;
let currentChatUser = null;

let authSubscription = null;

let chatChannel = null;

let callInboxChannel = null;
let callPairChannel = null;

let peerConnection = null;

let localStream = null;
let remoteStream = null;

let pendingIceCandidates = [];

let activeCallPeerId = null;
let activeCallRole = null;
let activeCallType = null;

let activeCallAccepted = false;

let isMuted = false;
let isCameraOff = false;
let isSpeakerOn = true;


// ======================================================
// 3. DOM ELEMENTS
// ======================================================

const authScreen =
  document.getElementById("authScreen");

const app =
  document.getElementById("app");

const signupForm =
  document.getElementById("signupForm");

const loginForm =
  document.getElementById("loginForm");

const signupEmail =
  document.getElementById("signupEmail");

const signupPassword =
  document.getElementById("signupPassword");

const loginEmail =
  document.getElementById("loginEmail");

const loginPassword =
  document.getElementById("loginPassword");

const signupBtn =
  document.getElementById("signupBtn");

const loginBtn =
  document.getElementById("loginBtn");

const switchAuthBtn =
  document.getElementById("switchAuthBtn");

const authMessage =
  document.getElementById("authMessage");

const currentUserEmail =
  document.getElementById("currentUserEmail");

const profileAvatar =
  document.getElementById("profileAvatar");

const profileName =
  document.getElementById("profileName");

const profileUsername =
  document.getElementById("profileUsername");

const profileEmail =
  document.getElementById("profileEmail");

const contactsList =
  document.getElementById("contactsList");

const chatsList =
  document.getElementById("chatsList");

const contactSearch =
  document.getElementById("contactSearch");

const chatSearch =
  document.getElementById("chatSearch");

const chatModal =
  document.getElementById("chatModal");

const chatTitle =
  document.getElementById("chatTitle");

const messages =
  document.getElementById("messages");

const messageForm =
  document.getElementById("messageForm");

const messageInput =
  document.getElementById("messageInput");

const newChatBtn =
  document.getElementById("newChatBtn");

const logoutBtn =
  document.getElementById("logoutBtn");

const darkModeBtn =
  document.getElementById("darkModeBtn");

const voiceCallBtn =
  document.getElementById("voiceCallBtn");

const videoCallBtn =
  document.getElementById("videoCallBtn");

const incomingCallOverlay =
  document.getElementById("incomingCallOverlay");

const activeCallOverlay =
  document.getElementById("activeCallOverlay");

const incomingCallerName =
  document.getElementById("incomingCallerName");

const incomingCallType =
  document.getElementById("incomingCallType");

const acceptCallBtn =
  document.getElementById("acceptCallBtn");

const declineCallBtn =
  document.getElementById("declineCallBtn");

const endCallBtn =
  document.getElementById("endCallBtn");

const muteCallBtn =
  document.getElementById("muteCallBtn");

const cameraCallBtn =
  document.getElementById("cameraCallBtn");


// ======================================================
// 4. WEBRTC CONFIG
// ======================================================

const rtcConfiguration = {

  iceServers: [

    {
      urls: "stun:stun.l.google.com:19302"
    },

    {
      urls: "stun:stun1.l.google.com:19302"
    }

  ]

};


// ======================================================
// 5. HELPERS
// ======================================================

function escapeHtml(value) {

  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


function getInitial(name) {

  if (!name) {
    return "Q";
  }

  return String(name)
    .trim()
    .charAt(0)
    .toUpperCase();

}


function setAuthMessage(message, error = false) {

  if (!authMessage) {
    return;
  }

  authMessage.textContent = message || "";

  authMessage.style.color =
    error ? "#e74c3c" : "#00b894";

}


function showApp() {

  if (authScreen) {
    authScreen.classList.add("hidden");
  }

  if (app) {
    app.classList.remove("hidden");
  }

}


function showAuth() {

  if (app) {
    app.classList.add("hidden");
  }

  if (authScreen) {
    authScreen.classList.remove("hidden");
  }

}


function getPairId(userA, userB) {

  return [userA, userB]
    .sort()
    .join("-");

}


function getCallInboxName(userId) {

  return `qevira-call-inbox-${userId}`;

}


function getCallPairName(userA, userB) {

  return `qevira-call-${getPairId(userA, userB)}`;

}


function isForCurrentUser(payload) {

  return (
    payload &&
    payload.to === currentUser?.id
  );

}


// ======================================================
// 6. AUTH MODE SWITCH
// ======================================================

if (switchAuthBtn) {

  switchAuthBtn.addEventListener(
    "click",
    () => {

      signupForm?.classList.toggle("hidden");
      loginForm?.classList.toggle("hidden");

      setAuthMessage("");

      if (
        loginForm &&
        !loginForm.classList.contains("hidden")
      ) {

        switchAuthBtn.textContent =
          "Don't have an account? Sign up";

      } else {

        switchAuthBtn.textContent =
          "Already have an account? Login";

      }

    }
  );

}


// ======================================================
// 7. SIGNUP
// ======================================================

if (signupForm) {

  signupForm.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      const email =
        signupEmail.value.trim();

      const password =
        signupPassword.value;

      if (!email || !password) {

        setAuthMessage(
          "Please enter email and password.",
          true
        );

        return;

      }

      signupBtn.disabled = true;

      signupBtn.textContent =
        "Creating account...";

      setAuthMessage("");

      try {

        const {
          data,
          error
        } =
          await supabaseClient.auth.signUp({
            email,
            password
          });

        if (error) {
          throw error;
        }


        // ==========================================
        // IF SUPABASE RETURNS A SESSION
        // OPEN QEVIRA DIRECTLY
        // ==========================================

        if (data?.session && data?.user) {

          signupPassword.value = "";

          await startApp(data.user);

          return;

        }


        // ==========================================
        // EMAIL CONFIRMATION REQUIRED
        // ==========================================

        signupPassword.value = "";

        setAuthMessage(
          "Account created! Check your email, confirm your account, then login."
        );

        if (loginForm) {
          loginForm.classList.remove("hidden");
        }

        if (signupForm) {
          signupForm.classList.add("hidden");
        }

        if (switchAuthBtn) {
          switchAuthBtn.textContent =
            "Don't have an account? Sign up";
        }

      } catch (error) {

        console.error(
          "Signup error:",
          error
        );

        setAuthMessage(
          error?.message ||
          "Signup failed. Please try again.",
          true
        );

      } finally {

        signupBtn.disabled = false;

        signupBtn.textContent =
          "Create Account";

      }

    }
  );

}


// ======================================================
// 8. LOGIN
// ======================================================

if (loginForm) {

  loginForm.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      const email =
        loginEmail.value.trim();

      const password =
        loginPassword.value;

      if (!email || !password) {

        setAuthMessage(
          "Please enter email and password.",
          true
        );

        return;

      }

      loginBtn.disabled = true;

      loginBtn.textContent =
        "Logging in...";

      setAuthMessage("");

      try {

        const {
          data,
          error
        } =
          await supabaseClient.auth.signInWithPassword({
            email,
            password
          });

        if (error) {
          throw error;
        }

        if (!data?.user) {

          throw new Error(
            "Login succeeded but no user was returned."
          );

        }

        console.log(
          "QEVIRA LOGIN SUCCESS:",
          data.user.email
        );

        await startApp(data.user);

      } catch (error) {

        console.error(
          "Login error:",
          error
        );

        setAuthMessage(
          error?.message ||
          "Login failed. Please try again.",
          true
        );

      } finally {

        loginBtn.disabled = false;

        loginBtn.textContent =
          "Login";

      }

    }
  );

}


// ======================================================
// 9. START APP
// ======================================================

async function startApp(user) {

  if (!user) {

    showAuth();

    return;

  }


  // ==========================================
  // SET CURRENT USER
  // ==========================================

  currentUser = user;

  if (currentUserEmail) {

    currentUserEmail.textContent =
      user.email || "";

  }


  // ==========================================
  // OPEN QEVIRA IMMEDIATELY
  // ==========================================

  showApp();

  console.log(
    "QEVIRA: APP OPENED",
    user.email
  );


  // ==========================================
  // PROFILE
  // ==========================================

  try {

    await ensureProfile();

  } catch (error) {

    console.error(
      "ensureProfile failed:",
      error
    );

  }


  try {

    await loadProfile();

  } catch (error) {

    console.error(
      "loadProfile failed:",
      error
    );

  }


  // ==========================================
  // CONTACTS
  // ==========================================

  try {

    await loadContacts();

  } catch (error) {

    console.error(
      "loadContacts failed:",
      error
    );

  }


  // ==========================================
  // CHATS
  // ==========================================

  try {

    await loadChats
