// ============================================================
// QEVIRA
// FILE 3 — app.js
// ============================================================
// REAL SUPABASE AUTH
// REAL PROFILES
// REAL 1-TO-1 REALTIME MESSAGING
// REAL WEBRTC VOICE + VIDEO CALLING
// SEARCH
// DARK MODE
// STATUS / DAILY / QUIZ UI FOUNDATION
// NOTIFICATIONS
// ============================================================


// ============================================================
// 1. SUPABASE CONFIG
// ============================================================

const SUPABASE_URL =
  "https://wcdywnkxtuexjbjgerzd.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_bD3ajWNbZPoUw4uUwYhK3w_P-iZIAhw";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );


// ============================================================
// 2. GLOBAL STATE
// ============================================================

let currentUser = null;
let currentProfile = null;
let currentChatUser = null;

let authSubscription = null;

let messagesChannel = null;
let profileChannel = null;

let callInboxChannel = null;
let callPairChannel = null;

let peerConnection = null;

let localStream = null;
let remoteStream = null;

let pendingIceCandidates = [];

let activeCallPeerId = null;
let activeCallRole = null;
let activeCallType = null;

let incomingCallData = null;

let activeCallAccepted = false;

let isMuted = false;
let isCameraOff = false;

let allContacts = [];
let allChats = [];

let currentMessages = [];

let currentDailyCategory = "india";

let quizMode = null;
let quizClass = null;
let quizSubject = null;

let darkModeEnabled = false;


// ============================================================
// 3. WEBRTC CONFIGURATION
// ============================================================

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


// ============================================================
// 4. DOM HELPERS
// ============================================================

function $(id) {
  return document.getElementById(id);
}


const authScreen = $("authScreen");
const app = $("app");

const signupForm = $("signupForm");
const loginForm = $("loginForm");

const signupEmail = $("signupEmail");
const signupPassword = $("signupPassword");

const loginEmail = $("loginEmail");
const loginPassword = $("loginPassword");

const signupBtn = $("signupBtn");
const loginBtn = $("loginBtn");

const switchAuthBtn = $("switchAuthBtn");
const authMessage = $("authMessage");

const notificationBtn = $("notificationBtn");
const darkModeBtn = $("darkModeBtn");

const notificationPanel = $("notificationPanel");
const notificationTitle = $("notificationTitle");
const closeNotificationBtn = $("closeNotificationBtn");
const notificationList = $("notificationList");

const chatsPage = $("chatsPage");
const contactsPage = $("contactsPage");
const statusPage = $("statusPage");
const dailyPage = $("dailyPage");
const quizPage = $("quizPage");
const profilePage = $("profilePage");

const chatsNavBtn = $("chatsNavBtn");
const statusNavBtn = $("statusNavBtn");
const contactsNavBtn = $("contactsNavBtn");
const dailyNavBtn = $("dailyNavBtn");
const profileNavBtn = $("profileNavBtn");

const newChatBtn = $("newChatBtn");
const searchInput = $("searchInput");

const chatList = $("chatList");
const chatEmpty = $("chatEmpty");

const contactsSearchInput = $("contactsSearchInput");
const contactsList = $("contactsList");

const createStatusBtn = $("createStatusBtn");
const myStatus = $("myStatus");
const statusList = $("statusList");

const dailyCategories = $("dailyCategories");
const dailyList = $("dailyList");

const quizStart = $("quizStart");
const quizContent = $("quizContent");

const profileAvatar = $("profileAvatar");
const profileName = $("profileName");
const profileUsername = $("profileUsername");
const profileEmail = $("profileEmail");
const profileOnlineStatus = $("profileOnlineStatus");
const profileBio = $("profileBio");
const referralCode = $("referralCode");

const editProfileBtn = $("editProfileBtn");
const profileEdit = $("profileEdit");

const editDisplayName = $("editDisplayName");
const editUsername = $("editUsername");
const editBio = $("editBio");
const editAvatarUrl = $("editAvatarUrl");

const saveProfileBtn = $("saveProfileBtn");
const cancelProfileEditBtn = $("cancelProfileEditBtn");

const logoutBtn = $("logoutBtn");

const chatModal = $("chatModal");
const closeChatModal = $("closeChatModal");

const chatAvatar = $("chatAvatar");
const chatTitle = $("chatTitle");
const chatStatus = $("chatStatus");

const voiceCallBtn = $("voiceCallBtn");
const videoCallBtn = $("videoCallBtn");

const messagesBox = $("messages");

const messageForm = $("messageForm");
const messageInput = $("messageInput");
const sendMessageBtn = $("sendMessageBtn");

const incomingCallOverlay = $("incomingCallOverlay");
const incomingCallAvatar = $("incomingCallAvatar");
const incomingCallName = $("incomingCallName");
const incomingCallType = $("incomingCallType");

const acceptCallBtn = $("acceptCallBtn");
const declineCallBtn = $("declineCallBtn");

const activeCallOverlay = $("activeCallOverlay");
const remoteVideo = $("remoteVideo");
const localVideo = $("localVideo");

const activeCallAvatar = $("activeCallAvatar");
const activeCallName = $("activeCallName");
const activeCallStatus = $("activeCallStatus");

const muteCallBtn = $("muteCallBtn");
const cameraCallBtn = $("cameraCallBtn");
const endCallBtn = $("endCallBtn");


// ============================================================
// 5. BASIC HELPERS
// ============================================================

function escapeHtml(value) {

  if (
    value === null ||
    value === undefined
  ) {
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

  const text =
    String(name || "Q").trim();

  return (
    text.charAt(0).toUpperCase() ||
    "Q"
  );

}


function getDisplayName(profile) {

  if (!profile) {
    return "QEVIRA User";
  }

  return (
    profile.display_name ||
    profile.username ||
    "QEVIRA User"
  );

}


function getUsername(profile) {

  if (!profile) {
    return "";
  }

  return profile.username
    ? `@${profile.username}`
    : "";

}


function getAvatar(profile) {

  if (!profile) {
    return "";
  }

  return (
    profile.avatar_url ||
    profile.photo_url ||
    ""
  );

}


function formatTime(dateValue) {

  if (!dateValue) {
    return "";
  }

  const date =
    new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit"
    }
  );

}


function formatDate(dateValue) {

  if (!dateValue) {
    return "";
  }

  const date =
    new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString(
    [],
    {
      day: "2-digit",
      month: "short"
    }
  );

}


function getPairId(userA, userB) {

  return [
    String(userA),
    String(userB)
  ]
    .sort()
    .join("-");

}


function getCallInboxName(userId) {

  return `qevira-call-inbox-${userId}`;

}


function getCallPairName(userA, userB) {

  return `qevira-call-${getPairId(userA, userB)}`;

}


function setAuthMessage(
  message,
  isError = false
) {

  if (!authMessage) {
    return;
  }

  authMessage.textContent =
    message || "";

  authMessage.style.color =
    isError
      ? "#e74c3c"
      : "#00b894";

}


function showApp() {

  authScreen?.classList.add("hidden");
  app?.classList.remove("hidden");

}


function showAuth() {

  app?.classList.add("hidden");
  authScreen?.classList.remove("hidden");

}


function safeClick(element, callback) {

  if (!element) {
    return;
  }

  element.addEventListener(
    "click",
    callback
  );

}


// ============================================================
// 6. AUTH MODE SWITCH
// ============================================================

safeClick(
  switchAuthBtn,
  () => {

    signupForm?.classList.toggle(
      "hidden"
    );

    loginForm?.classList.toggle(
      "hidden"
    );

    setAuthMessage("");

    if (
      loginForm &&
      !loginForm.classList.contains(
        "hidden"
      )
    ) {

      switchAuthBtn.textContent =
        "Don't have an account? Sign up";

    } else {

      switchAuthBtn.textContent =
        "Already have an account? Login";

    }

  }
);


// ============================================================
// 7. SIGN UP
// ============================================================

signupForm?.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    const email =
      signupEmail?.value
        ?.trim();

    const password =
      signupPassword?.value || "";

    if (!email || !password) {

      setAuthMessage(
        "Please enter email and password.",
        true
      );

      return;
    }

    if (password.length < 6) {

      setAuthMessage(
        "Password must be at least 6 characters.",
        true
      );

      return;
    }

    if (signupBtn) {

      signupBtn.disabled = true;

      signupBtn.textContent =
        "Creating account...";

    }

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

      signupPassword.value = "";

      if (
        data?.session &&
        data?.user
      ) {

        await startApp(
          data.user
        );

        return;
      }

      setAuthMessage(
        "Account created! Check your email, confirm your account, then login."
      );

      signupForm?.classList.add(
        "hidden"
      );

      loginForm?.classList.remove(
        "hidden"
      );

      if (switchAuthBtn) {

        switchAuthBtn.textContent =
          "Don't have an account? Sign up";

      }

    } catch (error) {

      console.error(
        "QEVIRA signup error:",
        error
      );

      setAuthMessage(
        error?.message ||
        "Signup failed.",
        true
      );

    } finally {

      if (signupBtn) {

        signupBtn.disabled = false;

        signupBtn.textContent =
          "Create Account";

      }

    }

  }
);


// ============================================================
// 8. LOGIN
// ============================================================

loginForm?.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    const email =
      loginEmail?.value
        ?.trim();

    const password =
      loginPassword?.value || "";

    if (!email || !password) {

      setAuthMessage(
        "Please enter email and password.",
        true
      );

      return;
    }

    if (loginBtn) {

      loginBtn.disabled = true;

      loginBtn.textContent =
        "Logging in...";

    }

    setAuthMessage("");

    try {

      const {
        data,
        error
      } =
        await supabaseClient.auth
          .signInWithPassword({
            email,
            password
          });

      if (error) {
        throw error;
      }

      if (!data?.user) {

        throw new Error(
          "No user returned from Supabase."
        );

      }

      await startApp(
        data.user
      );

    } catch (error) {

      console.error(
        "QEVIRA login error:",
        error
      );

      setAuthMessage(
        error?.message ||
        "Login failed.",
        true
      );

    } finally {

      if (loginBtn) {

        loginBtn.disabled = false;

        loginBtn.textContent =
          "Login";

      }

    }

  }
);


// ============================================================
// 9. AUTH SESSION
// ============================================================

async function restoreSession() {

  try {

    const {
      data,
      error
    } =
      await supabaseClient.auth
        .getSession();

    if (error) {
      throw error;
    }

    if (data?.session?.user) {

      await startApp(
        data.session.user
      );

    } else {

      showAuth();

    }

  } catch (error) {

    console.error(
      "Session restore error:",
      error
    );

    showAuth();

  }

}


async function setupAuthListener() {

  const result =
    await supabaseClient.auth
      .onAuthStateChange(
        async (
          event,
          session
        ) => {

          console.log(
            "QEVIRA AUTH EVENT:",
            event
          );

          if (
            event === "SIGNED_IN" &&
            session?.user
          ) {

            if (
              !currentUser ||
              currentUser.id !==
                session.user.id
            ) {

              await startApp(
                session.user
              );

            }

          }

          if (
            event === "SIGNED_OUT"
          ) {

            await cleanupApp();

            showAuth();

          }

        }
      );

    authSubscription =
      result?.data?.subscription ||
      null;

}


// ============================================================
// 10. PROFILE
// ============================================================

async function ensureProfile() {

  if (!currentUser) {
    return null;
  }

  const {
    data,
    error
  } =
    await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .maybeSingle();

  if (error) {

    console.error(
      "Profile lookup error:",
      error
    );

    return null;
  }

  if (data) {

    currentProfile = data;

    return data;
  }

  const usernameBase =
    (
      currentUser.email
        ?.split("@")[0] ||
      "user"
    )
      .toLowerCase()
      .replace(
        /[^a-z0-9_]/g,
        ""
      )
      .slice(0, 20);

  const username =
    usernameBase ||
    `user${Date.now()
      .toString()
      .slice(-6)}`;

  const newProfile = {

    id: currentUser.id,

    display_name:
      usernameBase || "QEVIRA User",

    username,

    bio: "",

    avatar_url: "",

    updated_at:
      new Date().toISOString()

  };

  const {
    data: created,
    error: createError
  } =
    await supabaseClient
      .from("profiles")
      .insert(newProfile)
      .select("*")
      .single();

  if (createError) {

    console.error(
      "Profile creation error:",
      createError
    );

    return null;
  }

  currentProfile =
    created;

  return created;

}


async function loadProfile() {

  if (!currentUser) {
    return;
  }

  const {
    data,
    error
  } =
    await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .maybeSingle();

  if (error) {

    console.error(
      "loadProfile:",
      error
    );

    return;
  }

  if (data) {

    currentProfile =
      data;

    renderProfile();

  }

}


function renderProfile() {

  const profile =
    currentProfile;

  if (!profile) {
    return;
  }

  const name =
    getDisplayName(profile);

  const username =
    getUsername(profile);

  const avatar =
    getAvatar(profile);

  if (profileName) {

    profileName.textContent =
      name;

  }

  if (profileUsername) {

    profileUsername.textContent =
      username;

  }

  if (profileEmail) {

    profileEmail.textContent =
      currentUser?.email || "";

  }

  if (profileBio) {

    profileBio.textContent =
      profile.bio ||
      "No bio added yet.";

  }

  if (profileOnlineStatus) {

    profileOnlineStatus.textContent =
      "● Online";

  }

  if (profileAvatar) {

    if (avatar) {

      profileAvatar.innerHTML =
        `<img src="${escapeHtml(
          avatar
        )}" alt="Profile photo">`;

    } else {

      profileAvatar.textContent =
        getInitial(name);

    }

  }

  if (referralCode) {

    referralCode.textContent =
      profile.referral_code ||
      generateReferralCode(
        currentUser?.id
      );

  }

}


function generateReferralCode(userId) {

  if (!userId) {
    return "QEVIRA";
  }

  return (
    "QEV-" +
    userId
      .replace(/-/g, "")
      .slice(0, 8)
      .toUpperCase()
  );

}


async function updateProfile() {

  if (!currentUser) {
    return;
  }

  const displayName =
    editDisplayName?.value
      ?.trim() || "";

  const username =
    editUsername?.value
      ?.trim()
      .toLowerCase() || "";

  const bio =
    editBio?.value
      ?.trim() || "";

  const avatarUrl =
    editAvatarUrl?.value
      ?.trim() || "";

  if (!displayName) {

    alert(
      "Please enter a display name."
    );

    return;
  }

  const updates = {

    display_name:
      displayName,

    username:
      username || null,

    bio,

    avatar_url:
      avatarUrl,

    updated_at:
      new Date().toISOString()

  };

  if (saveProfileBtn) {

    saveProfileBtn.disabled =
      true;

    saveProfileBtn.textContent =
      "Saving...";

  }

  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("profiles")
        .update(updates)
        .eq("id", currentUser.id)
        .select("*")
        .single();

    if (error) {
      throw error;
    }

    currentProfile =
      data;

    renderProfile();

    profileEdit?.classList.add(
      "hidden"
    );

  } catch (error) {

    console.error(
      "Profile update:",
      error
    );

    alert(
      error?.message ||
      "Could not update profile."
    );

  } finally {

    if (saveProfileBtn) {

      saveProfileBtn.disabled =
        false;

      saveProfileBtn.textContent =
        "Save Profile";

    }

  }

}


safeClick(
  editProfileBtn,
  () => {

    if (!currentProfile) {
      return;
    }

    profileEdit?.classList.remove(
      "hidden"
    );

    if (editDisplayName) {

      editDisplayName.value =
        currentProfile.display_name ||
        "";

    }

    if (editUsername) {

      editUsername.value =
        currentProfile.username ||
        "";

    }

    if (editBio) {

      editBio.value =
        currentProfile.bio ||
        "";

    }

    if (editAvatarUrl) {

      editAvatarUrl.value =
        currentProfile.avatar_url ||
        "";

    }

  }
);


safeClick(
  cancelProfileEditBtn,
  () => {

    profileEdit?.classList.add(
      "hidden"
    );

  }
);


safeClick(
  saveProfileBtn,
  updateProfile
);


// ============================================================
// 11. CONTACTS
// ============================================================

async function loadContacts() {

  if (!currentUser) {
    return;
  }

  const {
    data,
    error
  } =
    await supabaseClient
      .from("profiles")
      .select("*")
      .neq("id", currentUser.id)
      .order(
        "display_name",
        {
          ascending: true
        }
      );

  if (error) {

    console.error(
      "Contacts error:",
      error
    );

    renderContacts([]);

    return;
  }

  allContacts =
    data || [];

  renderContacts(
    allContacts
  );

}


function renderContacts(
  contacts
) {

  if (!contactsList) {
    return;
  }

  if (!contacts.length) {

    contactsList.innerHTML =
      `<div class="empty-state">
        No users found yet.
      </div>`;

    return;
  }

  contactsList.innerHTML =
    contacts
      .map(user => {

        const name =
          getDisplayName(user);

        const avatar =
          getAvatar(user);

        const avatarHtml =
          avatar
            ? `<img src="${escapeHtml(
                avatar
              )}" alt="">`
            : escapeHtml(
                getInitial(name)
              );

        return `
          <button
            class="contact-item"
            data-user-id="${escapeHtml(
              user.id
            )}"
          >
            <div class="avatar">
              ${avatarHtml}
            </div>

            <div class="contact-info">
              <strong>
                ${escapeHtml(name)}
              </strong>

              <span>
                ${escapeHtml(
                  getUsername(user)
                )}
              </span>
            </div>

            <span class="online-dot">
              ●
            </span>
          </button>
        `;

      })
      .join("");

  contactsList
    .querySelectorAll(
      "[data-user-id]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          const user =
            allContacts.find(
              item =>
                item.id ===
                button.dataset.userId
            );

          if (user) {

            await openChat(
              user
            );

          }

        }
      );

    });

}


contactsSearchInput?.addEventListener(
  "input",
  () => {

    const query =
      contactsSearchInput.value
        .trim()
        .toLowerCase();

    const filtered =
      allContacts.filter(
        user => {

          const name =
            String(
              user.display_name ||
              ""
            ).toLowerCase();

          const username =
            String(
              user.username ||
              ""
            ).toLowerCase();

          return (
            name.includes(query) ||
            username.includes(query)
          );

        }
      );

    renderContacts(
      filtered
    );

  }
);


// ============================================================
// 12. CHATS
// ============================================================

async function loadChats() {

  if (!currentUser) {
    return;
  }

  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("messages")
        .select("*")
        .or(
          `sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        );

    if (error) {
      throw error;
    }

    const map =
      new Map();

    for (const message of data || []) {

      const otherId =
        message.sender_id ===
        currentUser.id
          ? message.receiver_id
          : message.sender_id;

      if (
        otherId &&
        !map.has(otherId)
      ) {

        map.set(
          otherId,
          message
        );

      }

    }

    const ids =
      [...map.keys()];

    if (!ids.length) {

      allChats = [];

      renderChats([]);

      return;
    }

    const {
      data: profiles,
      error: profilesError
    } =
      await supabaseClient
        .from("profiles")
        .select("*")
        .in(
          "id",
          ids
        );

    if (profilesError) {
      throw profilesError;
    }

    const profileMap =
      new Map(
        (profiles || [])
          .map(
            profile =>
              [
                profile.id,
                profile
              ]
          )
      );

    allChats =
      ids
        .map(id => {

          const profile =
            profileMap.get(id);

          const last =
            map.get(id);

          if (!profile) {
            return null;
          }

          return {

            ...profile,

            last_message:
              last?.body || "",

            last_message_at:
              last?.created_at || ""

          };

        })
        .filter(Boolean);

    renderChats(
      allChats
    );

  } catch (error) {

    console.error(
      "loadChats:",
      error
    );

    renderChats([]);

  }

}


function renderChats(
  chats
) {

  if (!chatList) {
    return;
  }

  if (!chats.length) {

    chatList.innerHTML = "";

    chatEmpty?.classList.remove(
      "hidden"
    );

    return;
  }

  chatEmpty?.classList.add(
    "hidden"
  );

  chatList.innerHTML =
    chats
      .map(user => {

        const name =
          getDisplayName(user);

        const avatar =
          getAvatar(user);

        const avatarHtml =
          avatar
            ? `<img src="${escapeHtml(
                avatar
              )}" alt="">`
            : escapeHtml(
                getInitial(name)
              );

        return `
          <button
            class="chat-item"
            data-chat-user-id="${escapeHtml(
              user.id
            )}"
          >

            <div class="avatar">
              ${avatarHtml}
            </div>

            <div class="chat-item-info">

              <div class="chat-item-top">
                <strong>
                  ${escapeHtml(name)}
                </strong>

                <span>
                  ${escapeHtml(
                    formatTime(
                      user.last_message_at
                    )
                  )}
                </span>
              </div>

              <div class="chat-item-bottom">

                <span>
                  ${escapeHtml(
                    user.last_message ||
                    "Start chatting"
                  )}
                </span>

              </div>

            </div>

          </button>
        `;

      })
      .join("");

  chatList
    .querySelectorAll(
      "[data-chat-user-id]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          const user =
            allChats.find(
              item =>
                item.id ===
                button.dataset.chatUserId
            );

          if (user) {

            await openChat(
              user
            );

          }

        }
      );

    });

}


searchInput?.addEventListener(
  "input",
  () => {

    const query =
      searchInput.value
        .trim()
        .toLowerCase();

    const filtered =
      allChats.filter(
        user => {

          const name =
            String(
              user.display_name ||
              ""
            ).toLowerCase();

          const username =
            String(
              user.username ||
              ""
            ).toLowerCase();

          return (
            name.includes(query) ||
            username.includes(query)
          );

        }
      );

    renderChats(
      filtered
    );

  }
);


// ============================================================
// 13. OPEN CHAT
// ============================================================

async function openChat(user) {

  if (!user || !currentUser) {
    return;
  }

  currentChatUser =
    user;

  if (chatTitle) {

    chatTitle.textContent =
      getDisplayName(user);

  }

  if (chatStatus) {

    chatStatus.textContent =
      "Online";

  }

  if (chatAvatar) {

    const avatar =
      getAvatar(user);

    if (avatar) {

      chatAvatar.innerHTML =
        `<img src="${escapeHtml(
          avatar
        )}" alt="">`;

    } else {

      chatAvatar.textContent =
        getInitial(
          getDisplayName(user)
        );

    }

  }

  chatModal?.classList.remove(
    "hidden"
  );

  await loadMessages(
    user.id
  );

  messageInput?.focus();

}


safeClick(
  closeChatModal,
  () => {

    chatModal?.classList.add(
      "hidden"
    );

    currentChatUser = null;

  }
);


// ============================================================
// 14. LOAD MESSAGES
// ============================================================

async function loadMessages(
  otherUserId
) {

  if (
    !currentUser ||
    !otherUserId
  ) {
    return;
  }

  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`
        )
        .order(
          "created_at",
          {
            ascending: true
          }
        );

    if (error) {
      throw error;
    }

    currentMessages =
      data || [];

    renderMessages(
      currentMessages
    );

  } catch (error) {

    console.error(
      "loadMessages:",
      error
    );

    if (messagesBox) {

      messagesBox.innerHTML =
        `<div class="empty-state">
          Unable to load messages.
        </div>`;

    }

  }

}


function renderMessages(
  list
) {

  if (!messagesBox) {
    return;
  }

  if (!list.length) {

    messagesBox.innerHTML =
      `<div class="empty-state">
        No messages yet. Say hello 👋
      </div>`;

    return;
  }

  messagesBox.innerHTML =
    list
      .map(message => {

        const mine =
          message.sender_id ===
          currentUser?.id;

        return `
          <div
            class="message-row ${
              mine
                ? "sent"
                : "received"
            }"
          >

            <div class="message-bubble">

              <div class="message-text">
                ${escapeHtml(
                  message.body
                )}
              </div>

              <div class="message-time">
                ${escapeHtml(
                  formatTime(
                    message.created_at
                  )
                )}
              </div>

            </div>

          </div>
        `;

      })
      .join("");

  messagesBox.scrollTop =
    messagesBox.scrollHeight;

}


// ============================================================
// 15. SEND MESSAGE
// ============================================================

messageForm?.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    if (
      !currentUser ||
      !currentChatUser
    ) {
      return;
    }

    const body =
      messageInput?.value
        ?.trim();

    if (!body) {
      return;
    }

    if (sendMessageBtn) {

      sendMessageBtn.disabled =
        true;

    }

    try {

      const {
        error
      } =
        await supabaseClient
          .from("messages")
          .insert({

            sender_id:
              currentUser.id,

            receiver_id:
              currentChatUser.id,

            body

          });

      if (error) {
        throw error;
      }

      messageInput.value =
        "";

      await loadMessages(
        currentChatUser.id
      );

      await loadChats();

    } catch (error) {

      console.error(
        "Send message:",
        error
      );

      alert(
        error?.message ||
        "Message could not be sent."
      );

    } finally {

      if (sendMessageBtn) {

        sendMessageBtn.disabled =
          false;

      }

    }

  }
);


// ============================================================
// 16. REALTIME MESSAGES
// ============================================================

async function setupRealtimeMessages() {

  if (!currentUser) {
    return;
  }

  if (messagesChannel) {

    try {

      await supabaseClient
        .removeChannel(
          messagesChannel
        );

    } catch (_) {}

  }

  messagesChannel =
    supabaseClient
      .channel(
        `qevira-messages-${currentUser.id}`
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages"
        },
        async payload => {

          const message =
            payload.new;

          if (!message) {
            return;
          }

          const relevant =
            message.sender_id ===
              currentUser.id ||
            message.receiver_id ===
              currentUser.id;

          if (!relevant) {
            return;
          }

          if (
            currentChatUser &&
            (
              (
                message.sender_id ===
                  currentChatUser.id &&
                message.receiver_id ===
                  currentUser.id
              ) ||
              (
                message.sender_id ===
                  currentUser.id &&
                message.receiver_id ===
                  currentChatUser.id
              )
            )
          ) {

            await loadMessages(
              currentChatUser.id
            );

          }

          await loadChats();

          if (
            message.sender_id !==
            currentUser.id
          ) {

            showNotification(
              "New message",
              "You received a new message."
            );

          }

        }
      )
      .subscribe();

}


// ============================================================
// 17. DARK MODE
// ============================================================

function loadTheme() {

  try {

    darkModeEnabled =
      localStorage.getItem(
        "qevira-dark-mode"
      ) === "true";

  } catch (_) {

    darkModeEnabled =
      false;

  }

  applyTheme();

}


function applyTheme() {

  document.body.classList.toggle(
    "dark-mode",
    darkModeEnabled
  );

  if (darkModeBtn) {

    darkModeBtn.textContent =
      darkModeEnabled
        ? "☀️"
        : "🌙";

  }

}


safeClick(
  darkModeBtn,
  () => {

    darkModeEnabled =
      !darkModeEnabled;

    try {

      localStorage.setItem(
        "qevira-dark-mode",
        String(
          darkModeEnabled
        )
      );

    } catch (_) {}

    applyTheme();

  }
);


// ============================================================
// 18. PAGE NAVIGATION
// ============================================================

const pages = {

  chats:
    chatsPage,

  status:
    statusPage,

  contacts:
    contactsPage,

  daily:
    dailyPage,

  profile:
    profilePage,

  quiz:
    quizPage

};


function showPage(
  pageName
) {

  Object.values(pages)
    .forEach(page => {

      page?.classList.add(
        "hidden"
      );

    });

  pages[
    pageName
  ]?.classList.remove(
    "hidden"
  );

  document
    .querySelectorAll(
      ".bottom-nav button"
    )
    .forEach(button => {

      button.classList.remove(
        "active"
      );

    });

  const activeButton = {

    chats:
      chatsNavBtn,

    status:
      statusNavBtn,

    contacts:
      contactsNavBtn,

    daily:
      dailyNavBtn,

    profile:
      profileNavBtn

  }[pageName];

  activeButton?.classList.add(
    "active"
  );

}


safeClick(
  chatsNavBtn,
  () => showPage("chats")
);

safeClick(
  statusNavBtn,
  () => showPage("status")
);

safeClick(
  contactsNavBtn,
  () => showPage("contacts")
);

safeClick(
  dailyNavBtn,
  () => showPage("daily")
);

safeClick(
  profileNavBtn,
  () => {

    renderProfile();

    showPage("profile");

  }
);


// ============================================================
// 19. NEW CHAT
// ============================================================

safeClick(
  newChatBtn,
  () => {

    showPage(
      "contacts"
    );

    contactsSearchInput?.focus();

  }
);


// ============================================================
// 20. NOTIFICATIONS
// ============================================================

function showNotification(
  title,
  body
) {

  if (
    notificationTitle &&
    !notificationTitle.textContent
  ) {

    notificationTitle.textContent =
      title;

  }

  if (notificationList) {

    const item =
      document.createElement(
        "div"
      );

    item.className =
      "notification-item";

    item.innerHTML = `
      <strong>
        ${escapeHtml(title)}
      </strong>

      <p>
        ${escapeHtml(body)}
      </p>

      <small>
        ${escapeHtml(
          formatTime(
            new Date()
          )
        )}
      </small>
    `;

    notificationList.prepend(
      item
    );

  }

}


safeClick(
  notificationBtn,
  () => {

    notificationPanel?.classList.toggle(
      "hidden"
    );

  }
);


safeClick(
  closeNotificationBtn,
  () => {

    notificationPanel?.classList.add(
      "hidden"
    );

  }
);


// ============================================================
// 21. STATUS FOUNDATION
// ============================================================

safeClick(
  createStatusBtn,
  () => {

    const text =
      prompt(
        "Enter your status:"
      );

    if (!text?.trim()) {
      return;
    }

    if (myStatus) {

      myStatus.innerHTML = `
        <div class="status-card">
          <strong>
            Your status
          </strong>

          <p>
            ${escapeHtml(
              text.trim()
            )}
          </p>

          <small>
            Just now
          </small>
        </div>
      `;

    }

  }
);


// ============================================================
// 22. QEVIRA DAILY
// ============================================================

const dailySampleData = {

  india: [

    {
      title:
        "QEVIRA Daily — India",
      text:
        "India news will appear here when the Daily backend is connected."
    }

  ],

  world: [

    {
      title:
        "QEVIRA Daily — World",
      text:
        "World news will appear here."
    }

  ],

  technology: [

    {
      title:
        "QEVIRA Daily — Technology",
      text:
        "Technology news will appear here."
    }

  ],

  sports: [

    {
      title:
        "QEVIRA Daily — Sports",
      text:
        "Sports news will appear here."
    }

  ],

  trending: [

    {
      title:
        "QEVIRA Daily — Trending",
      text:
        "Trending stories will appear here."
    }

  ]

};


function renderDaily(
  category
) {

  if (!dailyList) {
    return;
  }

  const items =
    dailySampleData[
      category
    ] || [];

  dailyList.innerHTML =
    items
      .map(item => `
        <article class="daily-card">

          <h3>
            ${escapeHtml(
              item.title
            )}
          </h3>

          <p>
            ${escapeHtml(
              item.text
            )}
          </p>

        </article>
      `)
      .join("");

}


if (dailyCategories) {

  dailyCategories
    .querySelectorAll(
      "[data-category]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          currentDailyCategory =
            button.dataset.category;

          dailyCategories
            .querySelectorAll(
              "[data-category]"
            )
            .forEach(item => {

              item.classList.remove(
                "active"
              );

            });

          button.classList.add(
            "active"
          );

          renderDaily(
            currentDailyCategory
          );

        }
      );

    });

}


// ============================================================
// 23. QUIZ FOUNDATION
// ============================================================

const quizSubjects = {

  foundation: [
    "Mathematics",
    "Science",
    "English"
  ],

  jee: [
    "Physics",
    "Chemistry",
    "Mathematics"
  ],

  neet: [
    "Physics",
    "Chemistry",
    "Biology"
  ]

};


function renderQuizStart() {

  if (!quizContent) {
    return;
  }

  quizContent.innerHTML = `

    <div class="quiz-container">

      <h3>
        Choose your preparation
      </h3>

      <div class="quiz-options">

        <button
          class="quiz-option"
          data-quiz-mode="foundation"
        >
          📚 Foundation
        </button>

        <button
          class="quiz-option"
          data-quiz-mode="jee"
        >
          🧪 JEE
        </button>

        <button
          class="quiz-option"
          data-quiz-mode="neet"
        >
          🧬 NEET
        </button>

      </div>

    </div>

  `;

  quizContent
    .querySelectorAll(
      "[data-quiz-mode]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          quizMode =
            button.dataset.quizMode;

          renderQuizSubjects();

        }
      );

    });

}


function renderQuizSubjects() {

  if (!quizContent) {
    return;
  }

  const subjects =
    quizSubjects[
      quizMode
    ] || [];

  quizContent.innerHTML = `

    <div class="quiz-container">

      <h3>
        Choose a subject
      </h3>

      <div class="quiz-options">

        ${
          subjects
            .map(
              subject => `
                <button
                  class="quiz-option"
                  data-subject="${escapeHtml(
                    subject
                  )}"
                >
                  ${escapeHtml(
                    subject
                  )}
                </button>
              `
            )
            .join("")
        }

      </div>

      <button
        class="secondary-btn"
        id="quizBackBtn"
      >
        ← Back
      </button>

    </div>

  `;

  quizContent
    .querySelectorAll(
      "[data-subject]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          quizSubject =
            button.dataset.subject;

          renderQuizMessage();

        }
      );

    });

  $("quizBackBtn")
    ?.addEventListener(
      "click",
      renderQuizStart
    );

}


function renderQuizMessage() {

  if (!quizContent) {
    return;
  }

  quizContent.innerHTML = `

    <div class="quiz-container">

      <h3>
        ${escapeHtml(
          quizMode?.toUpperCase() ||
          ""
        )}
        — ${escapeHtml(
          quizSubject ||
          ""
        )}
      </h3>

      <p>
        Your NCERT-based quiz engine will appear here.
      </p>

      <button
        class="primary-btn"
        id="startActualQuizBtn"
      >
        Start Quiz
      </button>

    </div>

  `;

}


safeClick(
  quizStart,
  () => {

    showPage(
      "quiz"
    );

    renderQuizStart();

  }
);


// ============================================================
// 24. WEBRTC — CREATE PEER
// ============================================================

function createPeerConnection(
  peerId
) {

  if (peerConnection) {

    try {

      peerConnection.close();

    } catch (_) {}

  }

  pendingIceCandidates = [];

  peerConnection =
    new RTCPeerConnection(
      rtcConfiguration
    );

  peerConnection.onicecandidate =
    async event => {

      if (
        !event.candidate ||
        !activeCallPeerId
      ) {
        return;
      }

      await sendCallSignal(
        activeCallPeerId,
        {
          type:
            "ice-candidate",

          candidate:
            event.candidate
        }
      );

    };

  peerConnection.ontrack =
    event => {

      if (
        !remoteStream
      ) {

        remoteStream =
          new MediaStream();

      }

      event.streams?.[0]
        ?.getTracks()
        .forEach(track => {

          if (
            !remoteStream
              .getTracks()
              .some(
                existing =>
                  existing.id ===
                  track.id
              )
          ) {

            remoteStream.addTrack(
              track
            );

          }

        });

      if (remoteVideo) {

        remoteVideo.srcObject =
          remoteStream;

      }

    };

  peerConnection.onconnectionstatechange =
    () => {

      const state =
        peerConnection
          ?.connectionState;

      if (activeCallStatus) {

        if (
          state ===
          "connected"
        ) {

          activeCallStatus.textContent =
            "Connected";

        } else if (
          state ===
          "connecting"
        ) {

          activeCallStatus.textContent =
            "Connecting...";

        } else if (
          state ===
          "disconnected"
        ) {

          activeCallStatus.textContent =
            "Disconnected";

        }

      }

    };

  return peerConnection;

}


// ============================================================
// 25. GET LOCAL MEDIA
// ============================================================

async function getLocalMedia(
  callType
) {

  const video =
    callType ===
    "video";

  try {

    localStream =
      await navigator
        .mediaDevices
        .getUserMedia({

          audio: true,

          video

        });

    localStream
      .getTracks()
      .forEach(track => {

        peerConnection?.addTrack(
          track,
          localStream
        );

      });

    if (localVideo) {

      localVideo.srcObject =
        video
          ? localStream
          : null;

    }

    return true;

  } catch (error) {

    console.error(
      "Media permission error:",
      error
    );

    alert(
      video
        ? "Camera and microphone permission is required for video calls."
        : "Microphone permission is required for voice calls."
    );

    return false;

  }

}


// ============================================================
// 26. CALL UI
// ============================================================

function showActiveCallUI(
  user,
  callType
) {

  activeCallOverlay?.classList.remove(
    "hidden"
  );

  if (activeCallName) {

    activeCallName.textContent =
      getDisplayName(user);

  }

  if (activeCallAvatar) {

    const avatar =
      getAvatar(user);

    if (avatar) {

      activeCallAvatar.innerHTML =
        `<img src="${escapeHtml(
          avatar
        )}" alt="">`;

    } else {

      activeCallAvatar.textContent =
        getInitial(
          getDisplayName(user)
        );

    }

  }

  if (activeCallStatus) {

    activeCallStatus.textContent =
      "Connecting...";

  }

  if (cameraCallBtn) {

    cameraCallBtn.style.display =
      callType === "video"
        ? ""
        : "none";

  }

}


function hideIncomingCall() {

  incomingCallOverlay?.classList.add(
    "hidden"
  );

  incomingCallData =
    null;

}


function showIncomingCall(
  data
) {

  incomingCallData =
    data;

  incomingCallOverlay?.classList.remove(
    "hidden"
  );

  if (incomingCallName) {

    incomingCallName.textContent =
      data.callerName ||
      "QEVIRA User";

  }

  if (incomingCallType) {

    incomingCallType.textContent =
      data.callType === "video"
        ? "Incoming video call"
        : "Incoming voice call";

  }

}


// ============================================================
// 27. CALL SIGNALING CHANNEL
// ============================================================

async function setupCallInbox() {

  if (!currentUser) {
    return;
  }

  if (callInboxChannel) {

    try {

      await supabaseClient
        .removeChannel(
          callInboxChannel
        );

    } catch (_) {}

  }

  callInboxChannel =
    supabaseClient
      .channel(
        getCallInboxName(
          currentUser.id
        )
      )
      .on(
        "broadcast",
        {
          event:
            "call-signal"
        },
        payload => {

          handleCallSignal(
            payload?.payload
          );

        }
      )
      .subscribe();

}


async function setupCallPairChannel(
  peerId
) {

  if (!currentUser || !peerId) {
    return;
  }

  if (callPairChannel) {

    try {

      await supabaseClient
        .removeChannel(
          callPairChannel
        );

    } catch (_) {}

  }

  callPairChannel =
    supabaseClient
      .channel(
        getCallPairName(
          currentUser.id,
          peerId
        )
      )
      .on(
        "broadcast",
        {
          event:
            "call-signal"
        },
        payload => {

          handleCallSignal(
            payload?.payload
          );

        }
      )
      .subscribe();

}


async function sendCallSignal(
  peerId,
  payload
) {

  if (
    !currentUser ||
    !peerId
  ) {
    return;
  }

  const channelName =
    getCallInboxName(
      peerId
    );

  const channel =
    supabaseClient
      .channel(
        channelName
      );

  try {

    await channel.subscribe();

    await channel.send({

      type:
        "broadcast",

      event:
        "call-signal",

      payload: {

        ...payload,

        from:
          currentUser.id,

        to:
          peerId

      }

    });

  } catch (error) {

    console.error(
      "Call signal error:",
      error
    );

  } finally {

    try {

      await supabaseClient
        .removeChannel(
          channel
        );

    } catch (_) {}

  }

}


// ============================================================
// 28. START CALL
// ============================================================

async function startCall(
  callType
) {

  if (
    !currentUser ||
    !currentChatUser
  ) {
    return;
  }

  if (
    activeCallPeerId
  ) {

    return;
  }

  activeCallPeerId =
    currentChatUser.id;

  activeCallRole =
    "caller";

  activeCallType =
    callType;

  activeCallAccepted =
    false;

  isMuted =
    false;

  isCameraOff =
    false;

  createPeerConnection(
    activeCallPeerId
  );

  const mediaReady =
    await getLocalMedia(
      callType
    );

  if (!mediaReady) {

    await cleanupCall();

    return;
  }

  await setupCallPairChannel(
    activeCallPeerId
  );

  showActiveCallUI(
    currentChatUser,
    callType
  );

  try {

    const offer =
      await peerConnection
        .createOffer();

    await peerConnection
      .setLocalDescription(
        offer
      );

    await sendCallSignal(
      activeCallPeerId,
      {

        type:
          "incoming-call",

        callerName:
          getDisplayName(
            currentProfile
          ),

        callerAvatar:
          getAvatar(
            currentProfile
          ),

        callType

      }
    );

    await sendCallSignal(
      activeCallPeerId,
      {

        type:
          "call-offer",

        offer,

        callType

      }
    );

  } catch (error) {

    console.error(
      "Start call:",
      error
    );

    await cleanupCall();

  }

}


safeClick(
  voiceCallBtn,
  () =>
    startCall("voice")
);


safeClick(
  videoCallBtn,
  () =>
    startCall("video")
);


// ============================================================
// 29. HANDLE CALL SIGNAL
// ============================================================

async function handleCallSignal(
  payload
) {

  if (
    !payload ||
    !currentUser
  ) {
    return;
  }

  if (
    payload.to &&
    payload.to !==
      currentUser.id
  ) {
    return;
  }

  const from =
    payload.from;

  if (!from) {
    return;
  }

  // ----------------------------------------------------------
  // Incoming call
  // ----------------------------------------------------------

  if (
    payload.type ===
    "incoming-call"
  ) {

    incomingCallData = {

      from,

      callerName:
        payload.callerName ||
        "QEVIRA User",

      callerAvatar:
        payload.callerAvatar ||
        "",

      callType:
        payload.callType ||
        "voice"

    };

    showIncomingCall(
      incomingCallData
    );

    return;
  }


  // ----------------------------------------------------------
  // Offer
  // ----------------------------------------------------------

  if (
    payload.type ===
    "call-offer"
  ) {

    activeCallPeerId =
      from;

    activeCallRole =
      "receiver";

    activeCallType =
      payload.callType ||
      "voice";

    await setupCallPairChannel(
      from
    );

    if (!peerConnection) {

      createPeerConnection(
        from
      );

    }

    if (!localStream) {

      const ready =
        await getLocalMedia(
          activeCallType
        );

      if (!ready) {
        return;
      }

    }

    try {

      await peerConnection
        .setRemoteDescription(
          new RTCSessionDescription(
            payload.offer
          )
        );

      await processPendingIce();

    } catch (error) {

      console.error(
        "Set remote offer:",
        error
      );

    }

    return;
  }


  // ----------------------------------------------------------
  // Answer
  // ----------------------------------------------------------

  if (
    payload.type ===
    "call-answer"
  ) {

    if (
      !peerConnection
    ) {
      return;
    }

    try {

      await peerConnection
        .setRemoteDescription(
          new RTCSessionDescription(
            payload.answer
          )
        );

      activeCallAccepted =
        true;

      await processPendingIce();

    } catch (error) {

      console.error(
        "Set answer:",
        error
      );

    }

    return;
  }


  // ----------------------------------------------------------
  // ICE candidate
  // ----------------------------------------------------------

  if (
    payload.type ===
    "ice-candidate"
  ) {

    const candidate =
      payload.candidate;

    if (
      peerConnection &&
      peerConnection
        .remoteDescription
    ) {

      try {

        await peerConnection
          .addIceCandidate(
            new RTCIceCandidate(
              candidate
            )
          );

      } catch (error) {

        console.error(
          "ICE candidate:",
          error
        );

      }

    } else {

      pendingIceCandidates.push(
        candidate
      );

    }

    return;
  }


  // ----------------------------------------------------------
  // Hang up
  // ----------------------------------------------------------

  if (
    payload.type ===
    "call-hangup"
  ) {

    await cleanupCall(
      false
    );

    return;
  }


  // ----------------------------------------------------------
  // Declined
  // ----------------------------------------------------------

  if (
    payload.type ===
    "call-decline"
  ) {

    alert(
      "Call declined."
    );

    await cleanupCall(
      false
    );

  }

}


// ============================================================
// 30. PROCESS ICE
// ============================================================

async function processPendingIce() {

  if (
    !peerConnection ||
    !peerConnection
      .remoteDescription
  ) {
    return;
  }

  while (
    pendingIceCandidates.length
  ) {

    const candidate =
      pendingIceCandidates.shift();

    try {

      await peerConnection
        .addIceCandidate(
          new RTCIceCandidate(
            candidate
          )
        );

    } catch (error) {

      console.error(
        "Pending ICE:",
        error
      );

    }

  }

}


// ============================================================
// 31. ACCEPT CALL
// ============================================================

acceptCallBtn?.addEventListener(
  "click",
  async () => {

    if (
      !incomingCallData
    ) {
      return;
    }

    const data =
      incomingCallData;

    hideIncomingCall();

    activeCallPeerId =
      data.from;

    activeCallRole =
      "receiver";

    activeCallType =
      data.callType ||
      "voice";

    activeCallAccepted =
      true;

    createPeerConnection(
      activeCallPeerId
    );

    const ready =
      await getLocalMedia(
        activeCallType
      );

    if (!ready) {

      await cleanupCall();

      return;
    }

    await setupCallPairChannel(
      activeCallPeerId
    );

    showActiveCallUI(
      {
        display_name:
          data.callerName,

        avatar_url:
          data.callerAvatar

      },
      activeCallType
    );

    // The offer is received through
    // the pair channel after this point.

  }
);


// ============================================================
// 32. DECLINE CALL
// ============================================================

declineCallBtn?.addEventListener(
  "click",
  async () => {

    if (
      incomingCallData?.from
    ) {

      await sendCallSignal(
        incomingCallData.from,
        {
          type:
            "call-decline"
        }
      );

    }

    hideIncomingCall();

  }
);


// ============================================================
// 33. END CALL
// ============================================================

endCallBtn?.addEventListener(
  "click",
  async () => {

    if (
      activeCallPeerId
    ) {

      await sendCallSignal(
        activeCallPeerId,
        {
          type:
            "call-hangup"
        }
      );

    }

    await cleanupCall();

  }
);


// ============================================================
// 34. MUTE
// ============================================================

muteCallBtn?.addEventListener(
  "click",
  () => {

    if (!localStream) {
      return;
    }

    const audioTracks =
      localStream.getAudioTracks();

    if (!audioTracks.length) {
      return;
    }

    isMuted =
      !isMuted;

    audioTracks.forEach(
      track => {

        track.enabled =
          !isMuted;

      }
    );

    muteCallBtn.textContent =
      isMuted
        ? "🔇"
        : "🎙️";

  }
);


// ============================================================
// 35. CAMERA
// ============================================================

cameraCallBtn?.addEventListener(
  "click",
  () => {

    if (!localStream) {
      return;
    }

    const videoTracks =
      localStream.getVideoTracks();

    if (!videoTracks.length) {
      return;
    }

    isCameraOff =
      !isCameraOff;

    videoTracks.forEach(
      track => {

        track.enabled =
          !isCameraOff;

      }
    );

    cameraCallBtn.textContent =
      isCameraOff
        ? "📷"
        : "🎥";

  }
);


// ============================================================
// 36. CLEANUP CALL
// ============================================================

async function cleanupCall(
  notifyPeer = false
) {

  if (
    notifyPeer &&
    activeCallPeerId
  ) {

    await sendCallSignal(
      activeCallPeerId,
      {
        type:
          "call-hangup"
      }
    );

  }

  try {

    peerConnection
      ?.getSenders()
      ?.forEach(
        sender => {

          try {

            sender.track?.stop();

          } catch (_) {}

        }
      );

  } catch (_) {}

  if (localStream) {

    localStream
      .getTracks()
      .forEach(
        track => {

          try {

            track.stop();

          } catch (_) {}

        }
      );

  }

  if (remoteStream) {

    remoteStream
      .getTracks()
      .forEach(
        track => {

          try {

            track.stop();

          } catch (_) {}

        }
      );

  }

  if (peerConnection) {

    try {

      peerConnection.close();

    } catch (_) {}

  }

  if (callPairChannel) {

    try {

      await supabaseClient
        .removeChannel(
          callPairChannel
        );

    } catch (_) {}

  }

  peerConnection =
    null;

  localStream =
    null;

  remoteStream =
    null;

  callPairChannel =
    null;

  activeCallPeerId =
    null;

  activeCallRole =
    null;

  activeCallType =
    null;

  activeCallAccepted =
    false;

  pendingIceCandidates =
    [];

  isMuted =
    false;

  isCameraOff =
    false;

  if (remoteVideo) {

    remoteVideo.srcObject =
      null;

  }

  if (localVideo) {

    localVideo.srcObject =
      null;

  }

  activeCallOverlay?.classList.add(
    "hidden"
  );

  incomingCallOverlay?.classList.add(
    "hidden"
  );

}


// ============================================================
// 37. PROFILE REALTIME
// ============================================================

async function setupProfileRealtime() {

  if (!currentUser) {
    return;
  }

  if (profileChannel) {

    try {

      await supabaseClient
        .removeChannel(
          profileChannel
        );

    } catch (_) {}

  }

  profileChannel =
    supabaseClient
      .channel(
        `qevira-profile-${currentUser.id}`
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter:
            `id=eq.${currentUser.id}`
        },
        payload => {

          if (payload?.new) {

            currentProfile =
              payload.new;

            renderProfile();

          }

        }
      )
      .subscribe();

}


// ============================================================
// 38. LOGOUT
// ============================================================

logoutBtn?.addEventListener(
  "click",
  async () => {

    if (
      !confirm(
        "Log out of QEVIRA?"
      )
    ) {
      return;
    }

    try {

      await cleanupApp();

      const {
        error
      } =
        await supabaseClient.auth
          .signOut();

      if (error) {
        throw error;
      }

      currentUser =
        null;

      currentProfile =
        null;

      showAuth();

    } catch (error) {

      console.error(
        "Logout:",
        error
      );

      alert(
        error?.message ||
        "Logout failed."
      );

    }

  }
);


// ============================================================
// 39. CLEANUP APP
// ============================================================

async function cleanupApp() {

  await cleanupCall(
    false
  );

  if (messagesChannel) {

    try {

      await supabaseClient
        .removeChannel(
          messagesChannel
        );

    } catch (_) {}

  }

  if (profileChannel) {

    try {

      await supabaseClient
        .removeChannel(
          profileChannel
        );

    } catch (_) {}

  }

  if (callInboxChannel) {

    try {

      await supabaseClient
        .removeChannel(
          callInboxChannel
        );

    } catch (_) {}

  }

  messagesChannel =
    null;

  profileChannel =
    null;

  callInboxChannel =
    null;

  currentChatUser =
    null;

}


// ============================================================
// 40. START APPLICATION
// ============================================================

async function startApp(
  user
) {

  if (!user) {

    showAuth();

    return;
  }

  currentUser =
    user;

  showApp();

  try {

    await ensureProfile();

  } catch (error) {

    console.error(
      "ensureProfile:",
      error
    );

  }

  try {

    await loadProfile();

  } catch (error) {

    console.error(
      "loadProfile:",
      error
    );

  }

  try {

    await loadContacts();

  } catch (error) {

    console.error(
      "loadContacts:",
      error
    );

  }

  try {

    await loadChats();

  } catch (error) {

    console.error(
      "loadChats:",
      error
    );

  }

  try {

    await setupRealtimeMessages();

  } catch (error) {

    console.error(
      "Realtime messages:",
      error
    );

  }

  try {

    await setupCallInbox();

  } catch (error) {

    console.error(
      "Call inbox:",
      error
    );

  }

  try {

    await setupProfileRealtime();

  } catch (error) {

    console.error(
      "Profile realtime:",
      error
    );

  }

  loadTheme();

  showPage(
    "chats"
  );

  renderDaily(
    currentDailyCategory
  );

}


// ============================================================
// 41. INITIALIZE QEVIRA
// ============================================================

async function initializeQevira() {

  console.log(
    "🔥 QEVIRA initializing..."
  );

  try {

    await setupAuthListener();

  } catch (error) {

    console.error(
      "Auth listener:",
      error
    );

  }

  await restoreSession();

  console.log(
    "🔥 QEVIRA ready."
  );

}


// ============================================================
// 42. START
// ============================================================

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initializeQevira
  );

} else {

  initializeQevira();

                      }
