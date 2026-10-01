/* =========================================================
   QEVIRA
   MAIN APPLICATION ENGINE
   Auth + Profiles + Chats + Status + Quiz + Leaderboard
   Notifications + Referral + Calls + Dark Mode
========================================================= */


/* =========================================================
   1. SUPABASE
========================================================= */

const SUPABASE_URL =
  "https://wcdywnkxtuexjbjgerzd.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_bD3ajWNbZPoUw4uUwYhK3w_P-iZIAhw";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );


/* =========================================================
   2. GLOBAL STATE
========================================================= */

let currentUser = null;
let currentProfile = null;

let currentPage = "chatsPage";

let currentChatUser = null;
let currentChatChannel = null;

let contactsCache = [];
let profilesCache = {};

let notificationsCache = [];

let currentStatusList = [];
let currentStatusIndex = 0;

let quizMode = null;
let quizClass = null;
let quizSubject = null;
let quizQuestions = [];
let quizIndex = 0;
let quizCorrect = 0;
let quizCoins = 0;

let callInboxChannel = null;
let callPairChannel = null;

let peerConnection = null;
let localStream = null;
let remoteStream = null;

let activeCallPeerId = null;
let activeCallType = null;
let activeCallRole = null;
let activeCallStartedAt = null;
let activeCallConnectedAt = null;
let activeCallId = null;

let pendingIncomingCall = null;
let pendingOffer = null;
let pendingIceCandidates = [];

let isMuted = false;
let isCameraOff = false;
let callHistorySaved = false;


/* =========================================================
   3. DOM HELPERS
========================================================= */

const $ = (id) =>
  document.getElementById(id);

const show = (el) => {
  if (el) el.classList.remove("hidden");
};

const hide = (el) => {
  if (el) el.classList.add("hidden");
};

function text(el, value) {
  if (el) el.textContent = value ?? "";
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function initials(name) {
  const n = String(name || "Q")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(x => x[0])
    .join("")
    .toUpperCase();

  return n || "Q";
}

function avatarURL(profile, name) {
  return (
    profile?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name || "QEVIRA User"
    )}&background=6c5ce7&color=ffffff`
  );
}

function profileName(profile) {
  return (
    profile?.display_name ||
    profile?.full_name ||
    profile?.username ||
    "QEVIRA User"
  );
}

function currentName() {
  return profileName(currentProfile) ||
    currentUser?.email?.split("@")[0] ||
    "QEVIRA User";
}

function formatTime(date) {
  if (!date) return "";

  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDate(date) {
  if (!date) return "";

  return new Date(date).toLocaleDateString([], {
    day: "2-digit",
    month: "short"
  });
}

function toast(message) {
  let box = $("qeviraToast");

  if (!box) {
    box = document.createElement("div");
    box.id = "qeviraToast";

    Object.assign(box.style, {
      position: "fixed",
      left: "50%",
      bottom: "90px",
      transform: "translateX(-50%)",
      zIndex: "99999",
      padding: "12px 18px",
      borderRadius: "20px",
      background: "#202124",
      color: "white",
      fontSize: "13px",
      boxShadow: "0 10px 30px rgba(0,0,0,.2)",
      maxWidth: "90%",
      textAlign: "center"
    });

    document.body.appendChild(box);
  }

  box.textContent = message;
  box.style.display = "block";

  clearTimeout(box._timer);

  box._timer = setTimeout(() => {
    box.style.display = "none";
  }, 2500);
}


/* =========================================================
   4. AUTH ELEMENTS
========================================================= */

const authScreen = $("authScreen");
const app = $("app");

const loginForm = $("loginForm");
const signupForm = $("signupForm");

const showSignupBtn = $("showSignupBtn");
const showLoginBtn = $("showLoginBtn");

const loginEmail = $("loginEmail");
const loginPassword = $("loginPassword");

const signupName = $("signupName");
const signupUsername = $("signupUsername");
const signupEmail = $("signupEmail");
const signupPassword = $("signupPassword");

const loginMessage = $("loginMessage");
const signupMessage = $("signupMessage");


/* =========================================================
   5. AUTH
========================================================= */

function showLogin() {
  if (loginForm) show(loginForm);
  if (signupForm) hide(signupForm);

  if (loginMessage) text(loginMessage, "");
  if (signupMessage) text(signupMessage, "");
}

function showSignup() {
  if (loginForm) hide(loginForm);
  if (signupForm) show(signupForm);

  if (loginMessage) text(loginMessage, "");
  if (signupMessage) text(signupMessage, "");
}

showSignupBtn?.addEventListener(
  "click",
  showSignup
);

showLoginBtn?.addEventListener(
  "click",
  showLogin
);

loginForm?.addEventListener(
  "submit",
  async (e) => {
    e.preventDefault();

    text(loginMessage, "Signing in...");

    const email =
      loginEmail?.value.trim();

    const password =
      loginPassword?.value;

    if (!email || !password) {
      text(
        loginMessage,
        "Enter email and password."
      );
      return;
    }

    const { error } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      text(loginMessage, error.message);
      return;
    }

    text(
      loginMessage,
      "Login successful!"
    );
  }
);


signupForm?.addEventListener(
  "submit",
  async (e) => {
    e.preventDefault();

    text(signupMessage, "Creating account...");

    const name =
      signupName?.value.trim();

    const username =
      signupUsername?.value.trim().toLowerCase();

    const email =
      signupEmail?.value.trim();

    const password =
      signupPassword?.value;

    if (!name || !username || !email || !password) {
      text(
        signupMessage,
        "Please fill all fields."
      );
      return;
    }

    if (username.length < 3) {
      text(
        signupMessage,
        "Username must have at least 3 characters."
      );
      return;
    }

    const { data, error } =
      await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: name,
            username
          }
        }
      });

    if (error) {
      text(
        signupMessage,
        error.message
      );
      return;
    }

    if (data.user) {
      await createOrUpdateProfile(
        data.user,
        {
          display_name: name,
          username,
          full_name: name
        }
      );
    }

    text(
      signupMessage,
      "Account created. Check your email if confirmation is enabled."
    );
  }
);


/* =========================================================
   6. PROFILE
========================================================= */

async function createOrUpdateProfile(
  user,
  extra = {}
) {
  if (!user) return;

  const fallbackUsername =
    user.email
      ?.split("@")[0]
      ?.replace(/[^a-zA-Z0-9_]/g, "")
      .slice(0, 20) ||
    `user${Date.now()}`;

  const payload = {
    id: user.id,
    username:
      extra.username ||
      fallbackUsername,
    display_name:
      extra.display_name ||
      extra.full_name ||
      user.user_metadata?.display_name ||
      fallbackUsername,
    full_name:
      extra.full_name ||
      extra.display_name ||
      user.user_metadata?.display_name ||
      fallbackUsername,
    last_seen: new Date().toISOString(),
    is_online: true,
    updated_at: new Date().toISOString()
  };

  const { data, error } =
    await supabaseClient
      .from("profiles")
      .upsert(payload, {
        onConflict: "id"
      })
      .select()
      .single();

  if (!error) {
    currentProfile = data;
  }

  return data;
}


async function loadMyProfile() {
  if (!currentUser) return;

  const { data, error } =
    await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .maybeSingle();

  if (error) {
    console.error(error);
    return;
  }

  if (!data) {
    currentProfile =
      await createOrUpdateProfile(
        currentUser
      );
  } else {
    currentProfile = data;

    await supabaseClient
      .from("profiles")
      .update({
        is_online: true,
        last_seen: new Date().toISOString()
      })
      .eq("id", currentUser.id);
  }

  renderProfile();
}


async function loadProfileById(id) {
  if (!id) return null;

  if (profilesCache[id]) {
    return profilesCache[id];
  }

  const { data } =
    await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();

  if (data) {
    profilesCache[id] = data;
  }

  return data;
}


/* =========================================================
   7. PROFILE UI
========================================================= */

function renderProfile() {
  if (!currentProfile) return;

  const name =
    profileName(currentProfile);

  const username =
    currentProfile.username
      ? `@${currentProfile.username}`
      : "";

  const avatar =
    avatarURL(currentProfile, name);

  if ($("profileName"))
    text($("profileName"), name);

  if ($("profileUsername"))
    text($("profileUsername"), username);

  if ($("profileBio"))
    text(
      $("profileBio"),
      currentProfile.bio ||
      "Hey! I am using QEVIRA."
    );

  if ($("profileEmail"))
    text(
      $("profileEmail"),
      currentUser?.email || ""
    );

  if ($("profileOnlineStatus"))
    text(
      $("profileOnlineStatus"),
      currentProfile.is_online
        ? "● Online"
        : "○ Offline"
    );

  if ($("profileAvatarImg"))
    $("profileAvatarImg").src = avatar;

  if ($("profileCoins"))
    text(
      $("profileCoins"),
      "0"
    );

  loadWallet();
  loadReferralCount();
}


async function saveProfile() {
  if (!currentUser) return;

  const displayName =
    $("editDisplayName")?.value.trim();

  const username =
    $("editUsername")?.value.trim().toLowerCase();

  const bio =
    $("editBio")?.value.trim();

  const avatar =
    $("editAvatarUrl")?.value.trim();

  if (!displayName || !username) {
    toast("Name and username are required.");
    return;
  }

  const { error } =
    await supabaseClient
      .from("profiles")
      .update({
        display_name: displayName,
        full_name: displayName,
        username,
        bio,
        avatar_url: avatar || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", currentUser.id);

  if (error) {
    toast(error.message);
    return;
  }

  await loadMyProfile();

  hide($("profileEdit"));

  toast("Profile updated!");
}


$("editProfileBtn")?.addEventListener(
  "click",
  () => {
    if (!currentProfile) return;

    $("editDisplayName").value =
      currentProfile.display_name || "";

    $("editUsername").value =
      currentProfile.username || "";

    $("editBio").value =
      currentProfile.bio || "";

    $("editAvatarUrl").value =
      currentProfile.avatar_url || "";

    show($("profileEdit"));
  }
);

$("cancelProfileEditBtn")?.addEventListener(
  "click",
  () => {
    hide($("profileEdit"));
  }
);

$("saveProfileBtn")?.addEventListener(
  "click",
  saveProfile
);


/* =========================================================
   8. NAVIGATION
========================================================= */

function openPage(pageId) {
  document
    .querySelectorAll(".page")
    .forEach(page => {
      hide(page);
    });

  show($(pageId));

  currentPage = pageId;

  document
    .querySelectorAll(".nav-btn")
    .forEach(btn => {
      btn.classList.remove("active");
    });

  const map = {
    chatsPage: "chatsNavBtn",
    statusPage: "statusNavBtn",
    contactsPage: "contactsNavBtn",
    dailyPage: "dailyNavBtn",
    quizPage: "quizNavBtn",
    profilePage: "profileNavBtn"
  };

  $(map[pageId])
    ?.classList.add("active");

  if (pageId === "chatsPage")
    loadChats();

  if (pageId === "contactsPage")
    loadContacts();

  if (pageId === "statusPage")
    loadStatuses();

  if (pageId === "dailyPage")
    loadDaily();

  if (pageId === "quizPage")
    loadQuizHome();

  if (pageId === "profilePage")
    renderProfile();
}


$("chatsNavBtn")?.addEventListener(
  "click",
  () => openPage("chatsPage")
);

$("statusNavBtn")?.addEventListener(
  "click",
  () => openPage("statusPage")
);

$("contactsNavBtn")?.addEventListener(
  "click",
  () => openPage("contactsPage")
);

$("dailyNavBtn")?.addEventListener(
  "click",
  () => openPage("dailyPage")
);

$("quizNavBtn")?.addEventListener(
  "click",
  () => openPage("quizPage")
);

$("profileNavBtn")?.addEventListener(
  "click",
  () => openPage("profilePage")
);


/* =========================================================
   9. CHATS
========================================================= */

async function loadChats() {
  if (!currentUser) return;

  const list = $("chatList");

  if (!list) return;

  list.innerHTML = "";

  const { data, error } =
    await supabaseClient
      .from("messages")
      .select(
        "sender_id,receiver_id,body,content,created_at"
      )
      .or(
        `sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`
      )
      .order("created_at", {
        ascending: false
      })
      .limit(100);

  if (error) {
    console.error(error);
    return;
  }

  const users = new Map();

  for (const msg of data || []) {
    const other =
      msg.sender_id === currentUser.id
        ? msg.receiver_id
        : msg.sender_id;

    if (!users.has(other)) {
      users.set(other, msg);
    }
  }

  if (!users.size) {
    show($("chatEmpty"));
    return;
  }

  hide($("chatEmpty"));

  for (const [
    userId,
    lastMessage
  ] of users) {

    const profile =
      await loadProfileById(userId);

    if (!profile) continue;

    const item =
      document.createElement("div");

    item.className = "chat-item";

    const name =
      profileName(profile);

    const body =
      lastMessage.body ??
      lastMessage.content ??
      "";

    item.innerHTML = `
      <div class="chat-avatar">
        <img src="${escapeHTML(
          avatarURL(profile, name)
        )}">
        ${
          profile.is_online
            ? `<span class="online-dot"></span>`
            : ""
        }
      </div>

      <div class="chat-info">
        <div class="chat-info-top">
          <h3>${escapeHTML(name)}</h3>
          <span class="chat-time">
            ${formatTime(lastMessage.created_at)}
          </span>
        </div>

        <div class="chat-preview">
          ${escapeHTML(body)}
        </div>
      </div>
    `;

    item.addEventListener(
      "click",
      () => openChat(profile)
    );

    list.appendChild(item);
  }
}


async function loadContacts() {
  if (!currentUser) return;

  const list =
    $("contactsList");

  if (!list) return;

  list.innerHTML = "";

  const { data, error } =
    await supabaseClient
      .from("profiles")
      .select("*")
      .neq("id", currentUser.id)
      .order("display_name");

  if (error) {
    console.error(error);
    return;
  }

  contactsCache = data || [];

  renderContacts(contactsCache);
}


function renderContacts(list) {
  const container =
    $("contactsList");

  if (!container) return;

  container.innerHTML = "";

  if (!list.length) {
    container.innerHTML =
      `<div class="empty-state">
        <div class="empty-icon">👥</div>
        <h3>No users found</h3>
        <p>Try another search.</p>
      </div>`;
    return;
  }

  list.forEach(profile => {
    const item =
      document.createElement("div");

    item.className = "contact-item";

    const name =
      profileName(profile);

    item.innerHTML = `
      <div class="chat-avatar">
        <img src="${escapeHTML(
          avatarURL(profile, name)
        )}">
        ${
          profile.is_online
            ? `<span class="online-dot"></span>`
            : ""
        }
      </div>

      <div class="contact-info">
        <h3>${escapeHTML(name)}</h3>
        <p>
          ${
            profile.username
              ? "@" + escapeHTML(profile.username)
              : "QEVIRA User"
          }
        </p>
      </div>

      <button class="contact-chat-btn">
        💬
      </button>
    `;

    item
      .querySelector(".contact-chat-btn")
      .addEventListener(
        "click",
        () => openChat(profile)
      );

    container.appendChild(item);
  });
}


$("contactsSearchInput")
  ?.addEventListener(
    "input",
    e => {
      const q =
        e.target.value
          .trim()
          .toLowerCase();

      renderContacts(
        contactsCache.filter(p =>
          profileName(p)
            .toLowerCase()
            .includes(q) ||
          String(p.username || "")
            .toLowerCase()
            .includes(q)
        )
      );
    }
  );


$("searchInput")
  ?.addEventListener(
    "input",
    e => {
      const q =
        e.target.value
          .trim()
          .toLowerCase();

      document
        .querySelectorAll(".chat-item")
        .forEach(item => {
          item.style.display =
            item.textContent
              .toLowerCase()
              .includes(q)
                ? ""
                : "none";
        });
    }
  );


/* =========================================================
   10. CHAT WINDOW
========================================================= */

async function openChat(profile) {
  currentChatUser = profile;

  show($("chatModal"));

  const name =
    profileName(profile);

  if ($("chatTitle"))
    text($("chatTitle"), name);

  if ($("chatStatus"))
    text(
      $("chatStatus"),
      profile.is_online
        ? "Online"
        : "Offline"
    );

  if ($("chatAvatarImg"))
    $("chatAvatarImg").src =
      avatarURL(profile, name);

  await loadMessages();

  subscribeToChat();
}


$("closeChatModal")
  ?.addEventListener(
    "click",
    closeChat
  );


function closeChat() {
  hide($("chatModal"));

  if (currentChatChannel) {
    supabaseClient.removeChannel(
      currentChatChannel
    );
    currentChatChannel = null;
  }

  currentChatUser = null;
}


async function loadMessages() {
  if (!currentUser || !currentChatUser)
    return;

  const box =
    $("messages");

  if (!box) return;

  box.innerHTML = "";

  const { data, error } =
    await supabaseClient
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${currentUser.id},receiver_id.eq.${currentChatUser.id}),and(sender_id.eq.${currentChatUser.id},receiver_id.eq.${currentUser.id})`
      )
      .order("created_at", {
        ascending: true
      });

  if (error) {
    console.error(error);
    return;
  }

  (data || []).forEach(
    renderMessage
  );

  scrollMessages();
}


function renderMessage(msg) {
  const box =
    $("messages");

  if (!box) return;

  const sent =
    msg.sender_id === currentUser.id;

  const content =
    msg.body ??
    msg.content ??
    "";

  const div =
    document.createElement("div");

  div.className =
    `message ${sent ? "sent" : "received"}`;

  div.innerHTML = `
    <div>
      ${escapeHTML(content)}
    </div>
    <span class="message-time">
      ${formatTime(msg.created_at)}
    </span>
  `;

  box.appendChild(div);
}


function scrollMessages() {
  const box = $("messages");

  if (box)
    box.scrollTop =
      box.scrollHeight;
}


function subscribeToChat() {
  if (
    !currentUser ||
    !currentChatUser
  ) return;

  if (currentChatChannel) {
    supabaseClient.removeChannel(
      currentChatChannel
    );
  }

  const ids = [
    currentUser.id,
    currentChatUser.id
  ].sort();

  currentChatChannel =
    supabaseClient
      .channel(
        `qevira-chat-${ids[0]}-${ids[1]}`
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages"
        },
        payload => {

          const msg =
            payload.new;

          const relevant =
            (
              msg.sender_id === currentUser.id &&
              msg.receiver_id === currentChatUser.id
            ) ||
            (
              msg.sender_id === currentChatUser.id &&
              msg.receiver_id === currentUser.id
            );

          if (relevant) {
            renderMessage(msg);
            scrollMessages();
          }
        }
      )
      .subscribe();
}


$("messageForm")
  ?.addEventListener(
    "submit",
    async e => {
      e.preventDefault();

      if (
        !currentUser ||
        !currentChatUser
      ) return;

      const input =
        $("messageInput");

      const body =
        input?.value.trim();

      if (!body) return;

      input.value = "";

      const { error } =
        await supabaseClient
          .from("messages")
          .insert({
            sender_id: currentUser.id,
            receiver_id: currentChatUser.id,
            body,
            content: body
          });

      if (error) {
        toast(error.message);
        return;
      }

      await loadChats();
    }
  );


/* =========================================================
   11. STATUS
========================================================= */

async function loadStatuses() {
  const list =
    $("statusList");

  if (!list) return;

  list.innerHTML = "";

  const now =
    new Date().toISOString();

  const { data, error } =
    await supabaseClient
      .from("statuses")
      .select("*")
      .gt("expires_at", now)
      .order("created_at", {
        ascending: false
      });

  if (error) {
    console.error(error);
    return;
  }

  const grouped = {};

  for (const status of data || []) {
    if (!grouped[status.user_id])
      grouped[status.user_id] = [];

    grouped[status.user_id].push(status);
  }

  currentStatusList = [];

  for (const userId in grouped) {
    const profile =
      await loadProfileById(userId);

    if (!profile) continue;

    currentStatusList.push({
      profile,
      statuses: grouped[userId]
    });

    const item =
      document.createElement("div");

    item.className = "status-item";

    const name =
      profileName(profile);

    item.innerHTML = `
      <div class="status-ring">
        <img src="${escapeHTML(
          avatarURL(profile, name)
        )}">
      </div>

      <div class="status-info">
        <h3>${escapeHTML(name)}</h3>
        <p>
          ${grouped[userId].length}
          status${grouped[userId].length > 1 ? "es" : ""}
        </p>
      </div>
    `;

    const index =
      currentStatusList.length - 1;

    item.addEventListener(
      "click",
      () => openStatusViewer(index)
    );

    list.appendChild(item);
  }

  if (!Object.keys(grouped).length)
    show($("statusEmpty"));
  else
    hide($("statusEmpty"));
}


async function createTextStatus() {
  const content =
    $("statusTextInput")
      ?.value.trim();

  if (!content) {
    toast("Write something first.");
    return;
  }

  const created =
    new Date();

  const expires =
    new Date(
      created.getTime() +
      24 * 60 * 60 * 1000
    );

  const { error } =
    await supabaseClient
      .from("statuses")
      .insert({
        user_id: currentUser.id,
        content,
        created_at:
          created.toISOString(),
        expires_at:
          expires.toISOString()
      });

  if (error) {
    toast(error.message);
    return;
  }

  $("statusTextInput").value = "";

  hide($("statusCreatorModal"));

  await loadStatuses();

  toast("Status posted!");
}


$("statusTextBtn")
  ?.addEventListener(
    "click",
    () => {
      show($("statusCreatorModal"));
      $("statusTextInput")?.focus();
    }
  );

$("createStatusBtn")
  ?.addEventListener(
    "click",
    () => {
      show($("statusCreatorModal"));
    }
  );

$("chooseStatusPhotoBtn")
  ?.addEventListener(
    "click",
    () => {
      toast(
        "Photo upload needs a Supabase Storage bucket."
      );
    }
  );

$("chooseStatusVideoBtn")
  ?.addEventListener(
    "click",
    () => {
      toast(
        "Video upload needs a Supabase Storage bucket."
      );
    }
  );

$("publishStatusBtn")
  ?.addEventListener(
    "click",
    createTextStatus
  );


/* =========================================================
   12. STATUS VIEWER
========================================================= */

function openStatusViewer(index) {
  currentStatusIndex = index;

  renderCurrentStatus();

  show($("statusViewer"));
}


function closeStatusViewer() {
  hide($("statusViewer"));
}


$("statusViewer")
  ?.querySelector(".close-btn")
  ?.addEventListener(
    "click",
    closeStatusViewer
  );


$("statusPreviousBtn")
  ?.addEventListener(
    "click",
    () => {
      if (!currentStatusList.length)
        return;

      currentStatusIndex--;

      if (currentStatusIndex < 0)
        currentStatusIndex =
          currentStatusList.length - 1;

      renderCurrentStatus();
    }
  );


$("statusNextBtn")
  ?.addEventListener(
    "click",
    () => {
      if (!currentStatusList.length)
        return;

      currentStatusIndex++;

      if (
        currentStatusIndex >=
        currentStatusList.length
      )
        currentStatusIndex = 0;

      renderCurrentStatus();
    }
  );


function renderCurrentStatus() {
  const group =
    currentStatusList[currentStatusIndex];

  if (!group) return;

  const profile =
    group.profile;

  const status =
    group.statuses[0];

  text(
    $("viewerName"),
    profileName(profile)
  );

  text(
    $("viewerTime"),
    formatTime(status.created_at)
  );

  $("viewerAvatar").src =
    avatarURL(
      profile,
      profileName(profile)
    );

  const content =
    $("statusViewerContent");

  if (!content) return;

  content.innerHTML = "";

  if (status.image_url) {

    const img =
      document.createElement("img");

    img.src =
      status.image_url;

    content.appendChild(img);

  } else {

    const div =
      document.createElement("div");

    div.className =
      "status-text";

    div.textContent =
      status.content || "";

    content.appendChild(div);
  }

  recordStatusView(status.id);
}


async function recordStatusView(statusId) {
  if (!statusId || !currentUser)
    return;

  if (
    currentStatusList[currentStatusIndex]
      ?.profile?.id === currentUser.id
  ) return;

  await supabaseClient
    .from("status_views")
    .insert({
      status_id: statusId,
      viewer_id: currentUser.id
    });
}


$("statusReplyBtn")
  ?.addEventListener(
    "click",
    async () => {

      const input =
        $("statusReplyInput");

      const body =
        input?.value.trim();

      if (!body) return;

      const group =
        currentStatusList[currentStatusIndex];

      if (!group) return;

      await supabaseClient
        .from("messages")
        .insert({
          sender_id: currentUser.id,
          receiver_id: group.profile.id,
          body,
          content: body
        });

      input.value = "";

      toast("Reply sent!");
    }
  );


/* =========================================================
   13. QEVIRA DAILY
========================================================= */

const dailyData = {
  India: [
    {
      title: "QEVIRA Daily",
      description:
        "Daily updates from India will appear here."
    }
  ],

  World: [
    {
      title: "World Updates",
      description:
        "Global news will appear here."
    }
  ],

  Technology: [
    {
      title: "Technology",
      description:
        "Technology stories will appear here."
    }
  ],

  Sports: [
    {
      title: "Sports",
      description:
        "Sports updates will appear here."
    }
  ],

  Trending: [
    {
      title: "Trending",
      description:
        "Trending stories will appear here."
    }
  ]
};


let currentDailyCategory =
  "India";


async function loadDaily(
  category = currentDailyCategory
) {
  currentDailyCategory =
    category;

  const list =
    $("dailyList");

  if (!list) return;

  list.innerHTML = "";

  const data =
    dailyData[category] ||
    dailyData.India;

  data.forEach(article => {

    const card =
      document.createElement("article");

    card.className =
      "news-card";

    card.innerHTML = `
      <div class="news-content">
        <div class="news-source">
          QEVIRA DAILY
        </div>

        <h3>
          ${escapeHTML(article.title)}
        </h3>

        <p>
          ${escapeHTML(article.description)}
        </p>

        <div class="news-meta">
          Updated ${formatTime(new Date())}
        </div>
      </div>
    `;

    list.appendChild(card);
  });
}


document
  .querySelectorAll(".daily-category")
  .forEach(btn => {

    btn.addEventListener(
      "click",
      () => {

        document
          .querySelectorAll(
            ".daily-category"
          )
          .forEach(x =>
            x.classList.remove("active")
          );

        btn.classList.add("active");

        loadDaily(
          btn.dataset.category ||
          "India"
        );
      }
    );
  });


/* =========================================================
   14. QUIZ
========================================================= */

function loadQuizHome() {
  loadWallet();
}


document
  .querySelectorAll(".quiz-exam-card")
  .forEach(card => {

    card.addEventListener(
      "click",
      () => {

        quizMode =
          card.dataset.exam;

        show(
          $("quizClassSelector")
        );

        hide(
          $("quizSubjectSelector")
        );

        hide(
          $("quizContent")
        );

        hide(
          $("quizResult")
        );

        toast(
          `${quizMode.toUpperCase()} selected`
        );
      }
    );
  });


document
  .querySelectorAll(
    ".quiz-class-grid button"
  )
  .forEach(btn => {

    btn.addEventListener(
      "click",
      () => {

        document
          .querySelectorAll(
            ".quiz-class-grid button"
          )
          .forEach(x =>
            x.classList.remove("active")
          );

        btn.classList.add("active");

        quizClass =
          btn.dataset.class;

        show(
          $("quizSubjectSelector")
        );
      }
    );
  });


document
  .querySelectorAll(
    ".quiz-subject-grid button"
  )
  .forEach(btn => {

    btn.addEventListener(
      "click",
      () => {

        document
          .querySelectorAll(
            ".quiz-subject-grid button"
          )
          .forEach(x =>
            x.classList.remove("active")
          );

        btn.classList.add("active");

        quizSubject =
          btn.dataset.subject;
      }
    );
  });


$("quizStart")
  ?.addEventListener(
    "click",
    startQuiz
  );


async function startQuiz() {
  if (!quizMode) {
    toast("Choose an exam.");
    return;
  }

  if (
    quizMode === "foundation" &&
    !quizClass
  ) {
    toast("Choose your class.");
    return;
  }

  if (!quizSubject) {
    toast("Choose a subject.");
    return;
  }

  const query =
    supabaseClient
      .from("qevira_quiz_questions")
      .select("*")
      .eq("active", true)
      .limit(10);

  if (quizMode !== "foundation") {
    query.eq(
      "category",
      quizMode
    );
  }

  if (quizClass) {
    query.eq(
      "class_level",
      String(quizClass)
    );
  }

  query.eq(
    "subject",
    quizSubject
  );

  const { data, error } =
    await query;

  if (error) {
    toast(error.message);
    return;
  }

  quizQuestions =
    shuffle(
      data || []
    ).slice(0, 10);

  if (!quizQuestions.length) {
    toast(
      "No questions available yet."
    );
    return;
  }

  quizIndex = 0;
  quizCorrect = 0;
  quizCoins = 0;

  hide($("quizHome"));
  hide($("quizResult"));
  show($("quizContent"));

  renderQuizQuestion();
}


function shuffle(array) {
  return [...array]
    .sort(
      () => Math.random() - 0.5
    );
}


function renderQuizQuestion() {
  const q =
    quizQuestions[quizIndex];

  if (!q) {
    finishQuiz();
    return;
  }

  const content =
    $("quizContent");

  if (!content) return;

  let options =
    Array.isArray(q.options)
      ? q.options
      : Object.values(q.options || {});

  options =
    options.map(String);

  content.innerHTML = `
    <div class="quiz-question-card">

      <div class="quiz-question-number">
        QUESTION ${quizIndex + 1}
        / ${quizQuestions.length}
      </div>

      <h3>
        ${escapeHTML(q.question)}
      </h3>

      <div class="quiz-options">
        ${options.map((option, i) => `
          <button
            class="quiz-option"
            data-answer="${escapeHTML(option)}"
          >
            ${String.fromCharCode(65 + i)}.
            ${escapeHTML(option)}
          </button>
        `).join("")}
      </div>

    </div>
  `;

  content
    .querySelectorAll(".quiz-option")
    .forEach(btn => {

      btn.addEventListener(
        "click",
        () =>
          answerQuiz(
            btn,
            q.correct_answer
          )
      );
    });
}


function answerQuiz(
  button,
  correctAnswer
) {
  const buttons =
    document.querySelectorAll(
      ".quiz-option"
    );

  buttons.forEach(
    b => b.disabled = true
  );

  const selected =
    button.dataset.answer;

  if (
    selected.trim().toLowerCase() ===
    String(correctAnswer)
      .trim()
      .toLowerCase()
  ) {

    button.classList.add("correct");

    quizCorrect++;

  } else {

    button.classList.add("wrong");

    buttons.forEach(b => {

      if (
        b.dataset.answer
          ?.trim()
          .toLowerCase() ===
        String(correctAnswer)
          .trim()
          .toLowerCase()
      ) {
        b.classList.add("correct");
      }

    });
  }

  setTimeout(
    () => {
      quizIndex++;
      renderQuizQuestion();
    },
    650
  );
}


async function finishQuiz() {
  quizCoins =
    quizCorrect * 5;

  const percentage =
    Math.round(
      (quizCorrect /
        quizQuestions.length) *
      100
    );

  hide($("quizContent"));
  show($("quizResult"));

  text(
    $("quizScore"),
    `${quizCorrect}/${quizQuestions.length}`
  );

  text(
    $("quizResultMessage"),
    `${percentage}% completed`
  );

  text(
    $("quizEarnedCoins"),
    `🪙 +${quizCoins} coins`
  );

  await saveQuizAttempt();

  if (quizCoins > 0) {
    await addCoins(
      quizCoins,
      "quiz"
    );
  }

  loadWallet();
}


async function saveQuizAttempt() {
  if (!currentUser) return;

  await supabaseClient
    .from("qevira_quiz_attempts")
    .insert({
      user_id: currentUser.id,
      category: quizMode,
      subject: quizSubject,
      question_count:
        quizQuestions.length,
      correct_count:
        quizCorrect,
      coins_earned:
        quizCoins
    });
}


$("quizAgainBtn")
  ?.addEventListener(
    "click",
    () => {

      hide($("quizResult"));
      show($("quizHome"));

      quizQuestions = [];
      quizIndex = 0;
      quizCorrect = 0;
    }
  );


/* =========================================================
   15. COINS
========================================================= */

async function loadWallet() {
  if (!currentUser) return;

  const { data } =
    await supabaseClient
      .from("qevira_wallets")
      .select("coins")
      .eq(
        "user_id",
        currentUser.id
      )
      .maybeSingle();

  const coins =
    data?.coins || 0;

  if ($("quizCoinBalance"))
    text(
      $("quizCoinBalance"),
      coins
    );

  if ($("profileCoins"))
    text(
      $("profileCoins"),
      coins
    );
}


async function addCoins(
  amount,
  reason
) {
  if (!currentUser || !amount)
    return;

  /*
    Wallet writes require appropriate
    Supabase RLS or a secure RPC.
    We record the transaction here.
  */

  await supabaseClient
    .from(
      "qevira_coin_transactions"
    )
    .insert({
      user_id: currentUser.id,
      amount,
      reason
    });
}


/* =========================================================
   16. LEADERBOARD
========================================================= */

async function loadLeaderboard(
  board = "global"
) {
  const list =
    $("leaderboardList");

  if (!list) return;

  list.innerHTML =
    `<div class="empty-state">
      Loading leaderboard...
    </div>`;

  const { data } =
    await supabaseClient
      .from(
        "qevira_coin_transactions"
      )
      .select(
        "user_id,amount"
      );

  const totals = {};

  (data || []).forEach(row => {

    totals[row.user_id] =
      (totals[row.user_id] || 0) +
      Number(row.amount || 0);
  });

  const sorted =
    Object.entries(totals)
      .sort(
        (a, b) => b[1] - a[1]
      )
      .slice(0, 50);

  list.innerHTML = "";

  for (
    let i = 0;
    i < sorted.length;
    i++
  ) {

    const [id, coins] =
      sorted[i];

    const profile =
      await loadProfileById(id);

    if (!profile) continue;

    const row =
      document.createElement("div");

    row.className =
      "leaderboard-row";

    row.innerHTML = `
      <div class="leaderboard-rank">
        #${i + 1}
      </div>

      <div class="leaderboard-avatar">
        <img src="${escapeHTML(
          avatarURL(
            profile,
            profileName(profile)
          )
        )}">
      </div>

      <div class="leaderboard-user">
        <strong>
          ${escapeHTML(
            profileName(profile)
          )}
        </strong>
        <small>
          @${escapeHTML(
            profile.username || ""
          )}
        </small>
      </div>

      <div class="leaderboard-coins">
        🪙 ${coins}
      </div>
    `;

    list.appendChild(row);
  }
}


$("viewLeaderboardBtn")
  ?.addEventListener(
    "click",
    () => {
      show($("leaderboardModal"));
      loadLeaderboard();
    }
  );

$("closeLeaderboardBtn")
  ?.addEventListener(
    "click",
    () => {
      hide($("leaderboardModal"));
    }
  );

document
  .querySelectorAll(
    ".leaderboard-tab"
  )
  .forEach(tab => {

    tab.addEventListener(
      "click",
      () => {

        document
          .querySelectorAll(
            ".leaderboard-tab"
          )
          .forEach(x =>
            x.classList.remove("active")
          );

        tab.classList.add("active");

        loadLeaderboard(
          tab.dataset.board ||
          "global"
        );
      }
    );
  });


/* =========================================================
   17. REFERRAL
========================================================= */

function createReferralCode() {
  return (
    currentProfile?.username ||
    currentUser?.id
      ?.slice(0, 8) ||
    "QEVIRA"
  )
    .toUpperCase();
}


async function loadReferralCount() {
  if (!currentUser) return;

  const { count } =
    await supabaseClient
      .from("referrals")
      .select(
        "id",
        {
          count: "exact",
          head: true
        }
      )
      .eq(
        "inviter_id",
        currentUser.id
      );

  if ($("profileReferralCount"))
    text(
      $("profileReferralCount"),
      count || 0
    );

  if ($("referralCode"))
    text(
      $("referralCode"),
      createReferralCode()
    );
}


$("copyReferralBtn")
  ?.addEventListener(
    "click",
    async () => {

      const code =
        createReferralCode();

      const link =
        `${location.origin}${location.pathname}?ref=${encodeURIComponent(code)}`;

      try {
        await navigator.clipboard.writeText(
          link
        );

        toast(
          "Referral link copied!"
        );

      } catch {
        toast(link);
      }
    }
  );


/* =========================================================
   18. NOTIFICATIONS
========================================================= */

async function loadNotifications() {
  if (!currentUser) return;

  const { data, error } =
    await supabaseClient
      .from("notifications")
      .select("*")
      .eq(
        "user_id",
        currentUser.id
      )
      .order("created_at", {
        ascending: false
      })
      .limit(50);

  if (error) {
    console.error(error);
    return;
  }

  notificationsCache =
    data || [];

  renderNotifications();
}


function renderNotifications() {
  const list =
    $("notificationList");

  if (!list) return;

  list.innerHTML = "";

  if (!notificationsCache.length) {
    list.innerHTML =
      `<div class="empty-state">
        <div class="empty-icon">🔔</div>
        <h3>No notifications</h3>
        <p>You're all caught up.</p>
      </div>`;
    return;
  }

  notificationsCache.forEach(n => {

    const item =
      document.createElement("div");

    item.className =
      "notification-item";

    item.innerHTML = `
      <div>🔔</div>

      <div>
        <strong>
          ${escapeHTML(n.title || "QEVIRA")}
        </strong>

        <p>
          ${escapeHTML(n.body || "")}
        </p>

        <small>
          ${formatDate(n.created_at)}
        </small>
      </div>
    `;

    list.appendChild(item);
  });

  const unread =
    notificationsCache
      .filter(n => !n.is_read)
      .length;

  const badge =
    $("notificationBadge");

  if (badge) {
    if (unread) {
      text(badge, unread > 9 ? "9+" : unread);
      show(badge);
    } else {
      hide(badge);
    }
  }
}


$("notificationBtn")
  ?.addEventListener(
    "click",
    async () => {

      const panel =
        $("notificationPanel");

      if (!panel) return;

      if (panel.classList.contains("hidden")) {
        show(panel);
        await loadNotifications();
      } else {
        hide(panel);
      }
    }
  );


/* =========================================================
   19. DARK MODE
========================================================= */

function setDarkMode(enabled) {
  document.body.classList.toggle(
    "dark",
    enabled
  );

  localStorage.setItem(
    "qevira-dark-mode",
    enabled ? "1" : "0"
  );
}


$("darkModeBtn")
  ?.addEventListener(
    "click",
    () => {
      const enabled =
        !document.body.classList.contains(
          "dark"
        );

      setDarkMode(enabled);
    }
  );


function loadDarkMode() {
  const enabled =
    localStorage.getItem(
      "qevira-dark-mode"
    ) === "1";

  setDarkMode(enabled);
}


/* =========================================================
   20. CALL ENGINE
========================================================= */

const ICE_SERVERS = [
  {
    urls:
      "stun:stun.l.google.com:19302"
  },
  {
    urls:
      "stun:stun1.l.google.com:19302"
  }
];


function callId() {
  if (
    window.crypto &&
    crypto.randomUUID
  ) {
    return crypto.randomUUID();
  }

  return (
    Date.now().toString(36) +
    "-" +
    Math.random()
      .toString(36)
      .slice(2)
  );
}


function callChannelForUser(userId) {
  return `qevira-call-inbox-${userId}`;
}


function callPairName(a, b) {
  const ids =
    [a, b].sort();

  return `qevira-call-${ids[0]}-${ids[1]}`;
}


function callProfileName(profile) {
  return profileName(profile);
}


function openCallUI(
  profile,
  type,
  status
) {
  text(
    $("activeCallName"),
    callProfileName(profile)
  );

  text(
    $("activeCallStatus"),
    status
  );

  $("activeCallAvatar").src =
    avatarURL(
      profile,
      callProfileName(profile)
    );

  show($("activeCallOverlay"));
}


function closeCallUI() {
  hide($("activeCallOverlay"));

  if ($("remoteVideo")) {
    $("remoteVideo").srcObject = null;
  }

  if ($("localVideo")) {
    $("localVideo").srcObject = null;
  }
}


async function getMedia(type) {
  return navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: type === "video"
    });
}


function createPeer(peerId) {
  if (peerConnection) {
    try {
      peerConnection.close();
    } catch {}
  }

  peerConnection =
    new RTCPeerConnection({
      iceServers: ICE_SERVERS
    });

  remoteStream =
    new MediaStream();

  if ($("remoteVideo"))
    $("remoteVideo").srcObject =
      remoteStream;

  peerConnection.ontrack =
    event => {

      event.streams[0]
        ?.getTracks()
        .forEach(track => {

          if (
            !remoteStream
              .getTracks()
              .includes(track)
          ) {
            remoteStream.addTrack(
              track
            );
          }

        });
    };


  peerConnection.onicecandidate =
    async event => {

      if (!event.candidate)
        return;

      await sendCallSignal(
        peerId,
        {
          type: "ice-candidate",
          callId: activeCallId,
          candidate:
            event.candidate.toJSON()
        }
      );
    };


  peerConnection.onconnectionstatechange =
    async () => {

      const state =
        peerConnection.connectionState;

      if (
        state === "connected"
      ) {
        activeCallConnected = true;

        activeCallConnectedAt =
          new Date();

        text(
          $("activeCallStatus"),
          "Connected"
        );
      }

      if (
        [
          "failed",
          "disconnected",
          "closed"
        ].includes(state)
      ) {
        if (state !== "closed") {
          await endCall(false);
        }
      }
    };


  if (localStream) {
    localStream
      .getTracks()
      .forEach(track => {

        peerConnection.addTrack(
          track,
          localStream
        );
      });
  }

  return peerConnection;
}


async function sendCallSignal(
  receiverId,
  payload
) {
  /*
    IMPORTANT:
    Sender and receiver use the SAME
    inbox channel name.

    This fixes the previous mismatch.
  */

  const channelName =
    callChannelForUser(
      receiverId
    );

  const channel =
    supabaseClient.channel(
      channelName
    );

  await channel.subscribe();

  await channel.send({
    type: "broadcast",
    event: "call-signal",
    payload: {
      senderId:
        currentUser.id,
      ...payload
    }
  });

  /*
    Keep the channel alive briefly so
    the broadcast is delivered.
  */

  setTimeout(
    () => {
      try {
        supabaseClient.removeChannel(
          channel
        );
      } catch {}
    },
    1000
  );
}


async function startCall(
  profile,
  type
) {
  if (
    !currentUser ||
    !profile
  ) return;

  if (
    peerConnection ||
    activeCallPeerId
  ) {
    toast(
      "A call is already active."
    );
    return;
  }

  activeCallPeerId =
    profile.id;

  activeCallType =
    type;

  activeCallRole =
    "caller";

  activeCallId =
    callId();

  activeCallStartedAt =
    new Date();

  activeCallConnected =
    false;

  callHistorySaved =
    false;

  try {

    localStream =
      await getMedia(type);

    if ($("localVideo")) {
      $("localVideo").srcObject =
        localStream;

      $("localVideo").style.display =
        type === "video"
          ? "block"
          : "none";
    }

    openCallUI(
      profile,
      type,
      "Calling..."
    );

    createPeer(profile.id);

    const offer =
      await peerConnection
        .createOffer();

    await peerConnection
      .setLocalDescription(
        offer
      );

    await sendCallSignal(
      profile.id,
      {
        type: "incoming-call",
        callId:
          activeCallId,
        callType:
          type,
        callerName:
          currentName(),
        callerAvatar:
          currentProfile?.avatar_url ||
          "",
        offer:
          peerConnection
            .localDescription
      }
    );

  } catch (error) {

    console.error(error);

    toast(
      "Could not start call. Check microphone/camera permission."
    );

    await cleanupCall();
  }
}


async function acceptIncomingCall() {
  const call =
    pendingIncomingCall;

  if (!call) return;

  pendingIncomingCall = null;

  hide(
    $("incomingCallOverlay")
  );

  activeCallPeerId =
    call.senderId;

  activeCallType =
    call.callType;

  activeCallRole =
    "receiver";

  activeCallId =
    call.callId;

  activeCallStartedAt =
    new Date();

  activeCallConnected =
    false;

  callHistorySaved =
    false;

  try {

    localStream =
      await getMedia(
        call.callType
      );

    if ($("localVideo")) {
      $("localVideo").srcObject =
        localStream;

      $("localVideo").style.display =
        call.callType === "video"
          ? "block"
          : "none";
    }

    const profile =
      await loadProfileById(
        call.senderId
      );

    openCallUI(
      profile,
      call.callType,
      "Connecting..."
    );

    createPeer(
      call.senderId
    );

    pendingOffer =
      call.offer;

    if (pendingOffer) {

      await peerConnection
        .setRemoteDescription(
          new RTCSessionDescription(
            pendingOffer
          )
        );

      const answer =
        await peerConnection
          .createAnswer();

      await peerConnection
        .setLocalDescription(
          answer
        );

      await sendCallSignal(
        call.senderId,
        {
          type:
            "call-answer",
          callId:
            call.callId,
          answer:
            peerConnection
              .localDescription
        }
      );
    }

    for (
      const candidate of
      pendingIceCandidates
    ) {

      try {
        await peerConnection
          .addIceCandidate(
            new RTCIceCandidate(
              candidate
            )
          );
      } catch {}
    }

    pendingIceCandidates = [];

  } catch (error) {

    console.error(error);

    toast(
      "Could not accept call."
    );

    await cleanupCall();
  }
}


async function declineIncomingCall() {
  const call =
    pendingIncomingCall;

  if (!call) return;

  await sendCallSignal(
    call.senderId,
    {
      type: "call-decline",
      callId: call.callId
    }
  );

  pendingIncomingCall = null;

  hide(
    $("incomingCallOverlay")
  );
}


async function handleCallSignal(
  payload
) {
  if (!payload) return;

  if (
    payload.type ===
    "incoming-call"
  ) {

    if (
      peerConnection ||
      activeCallPeerId
    ) {

      await sendCallSignal(
        payload.senderId,
        {
          type: "call-decline",
          callId:
            payload.callId
        }
      );

      return;
    }

    showIncomingCall(
      payload
    );

    return;
  }


  if (
    payload.type ===
    "call-answer"
  ) {

    if (
      !peerConnection ||
      payload.callId !==
        activeCallId
    ) return;

    await peerConnection
      .setRemoteDescription(
        new RTCSessionDescription(
          payload.answer
        )
      );

    return;
  }


  if (
    payload.type ===
    "ice-candidate"
  ) {

    if (
      payload.callId !==
      activeCallId
    ) return;

    if (
      peerConnection?.remoteDescription
        ?.type
    ) {

      try {

        await peerConnection
          .addIceCandidate(
            new RTCIceCandidate(
              payload.candidate
            )
          );

      } catch (error) {
        console.error(error);
      }

    } else {

      pendingIceCandidates
        .push(
          payload.candidate
        );
    }

    return;
  }


  if (
    payload.type ===
    "call-decline"
  ) {

    if (
      payload.callId !==
      activeCallId
    ) return;

    toast("Call declined.");

    await saveCallHistory(
      "declined"
    );

    await cleanupCall();

    return;
  }


  if (
    payload.type ===
    "call-hangup"
  ) {

    if (
      payload.callId !==
      activeCallId
    ) return;

    await saveCallHistory(
      activeCallConnected
        ? "completed"
        : "cancelled"
    );

    await cleanupCall();

    return;
  }
}


function showIncomingCall(
  call
) {
  pendingIncomingCall =
    call;

  text(
    $("incomingCallName"),
    call.callerName ||
    "QEVIRA User"
  );

  text(
    $("incomingCallType"),
    call.callType === "video"
      ? "Incoming Video Call"
      : "Incoming Voice Call"
  );

  $("incomingCallAvatar").src =
    call.callerAvatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      call.callerName ||
      "QEVIRA"
    )}`;

  show(
    $("incomingCallOverlay")
  );
}


async function endCall(
  notifyPeer = true
) {
  if (
    notifyPeer &&
    activeCallPeerId
  ) {

    await sendCallSignal(
      activeCallPeerId,
      {
        type: "call-hangup",
        callId:
          activeCallId
      }
    );
  }

  await saveCallHistory(
    activeCallConnected
      ? "completed"
      : "cancelled"
  );

  await cleanupCall();
}


async function cleanupCall() {
  if (localStream) {

    localStream
      .getTracks()
      .forEach(
        track =>
          track.stop()
      );

  }

  if (peerConnection) {

    try {
      peerConnection.close();
    } catch {}

  }

  peerConnection = null;
  localStream = null;
  remoteStream = null;

  activeCallPeerId = null;
  activeCallType = null;
  activeCallRole = null;
  activeCallId = null;

  activeCallStartedAt = null;
  activeCallConnectedAt = null;

  pendingOffer = null;
  pendingIceCandidates = [];

  isMuted = false;
  isCameraOff = false;

  if ($("remoteVideo"))
    $("remoteVideo").srcObject =
      null;

  if ($("localVideo"))
    $("localVideo").srcObject =
      null;

  closeCallUI();
}


async function saveCallHistory(
  status
) {
  if (
    callHistorySaved ||
    !currentUser ||
    !activeCallPeerId
  ) return;

  callHistorySaved = true;

  const started =
    activeCallStartedAt ||
    new Date();

  const ended =
    new Date();

  const duration =
    activeCallConnectedAt
      ? Math.max(
          0,
          Math.floor(
            (ended -
              activeCallConnectedAt) /
            1000
          )
        )
      : 0;

  await supabaseClient
    .from("call_history")
    .insert({
      caller_id:
        activeCallRole === "caller"
          ? currentUser.id
          : activeCallPeerId,

      receiver_id:
        activeCallRole === "caller"
          ? activeCallPeerId
          : currentUser.id,

      call_type:
        activeCallType === "video"
          ? "video"
          : "voice",

      direction:
        activeCallRole === "caller"
          ? "outgoing"
          : "incoming",

      status,

      started_at:
        started.toISOString(),

      ended_at:
        ended.toISOString(),

      duration_seconds:
        duration
    });
}


/* =========================================================
   21. CALL INBOX
========================================================= */

function subscribeCallInbox() {
  if (
    !currentUser ||
    callInboxChannel
  ) return;

  const channelName =
    callChannelForUser(
      currentUser.id
    );

  callInboxChannel =
    supabaseClient
      .channel(channelName)
      .on(
        "broadcast",
        {
          event: "call-signal"
        },
        async ({ payload }) => {

          if (
            payload?.senderId ===
            currentUser.id
          ) return;

          await handleCallSignal(
            payload
          );
        }
      )
      .subscribe();
}


/* =========================================================
   22. CALL BUTTONS
========================================================= */

$("voiceCallBtn")
  ?.addEventListener(
    "click",
    () => {

      if (!currentChatUser) return;

      startCall(
        currentChatUser,
        "voice"
      );
    }
  );


$("videoCallBtn")
  ?.addEventListener(
    "click",
    () => {

      if (!currentChatUser) return;

      startCall(
        currentChatUser,
        "video"
      );
    }
  );


$("acceptCallBtn")
  ?.addEventListener(
    "click",
    acceptIncomingCall
  );


$("declineCallBtn")
  ?.addEventListener(
    "click",
    declineIncomingCall
  );


$("endCallBtn")
  ?.addEventListener(
    "click",
    () => endCall(true)
  );


$("muteCallBtn")
  ?.addEventListener(
    "click",
    () => {

      if (!localStream)
        return;

      isMuted = !isMuted;

      localStream
        .getAudioTracks()
        .forEach(
          track =>
            track.enabled =
              !isMuted
        );

      text(
        $("muteCallBtn"),
        isMuted ? "🔇" : "🎙️"
      );
    }
  );


$("cameraCallBtn")
  ?.addEventListener(
    "click",
    () => {

      if (!localStream)
        return;

      isCameraOff =
        !isCameraOff;

      localStream
        .getVideoTracks()
        .forEach(
          track =>
            track.enabled =
              !isCameraOff
        );

      text(
        $("cameraCallBtn"),
        isCameraOff ? "📷" : "🎥"
      );
    }
  );


/* =========================================================
   23. CALL HISTORY UI
========================================================= */

$("callHistoryBtn")
  ?.addEventListener(
    "click",
    async () => {

      show(
        $("callHistoryModal")
      );

      await loadCallHistory();
    }
  );


$("closeCallHistoryBtn")
  ?.addEventListener(
    "click",
    () => {
      hide(
        $("callHistoryModal")
      );
    }
  );


async function loadCallHistory() {
  if (!currentUser) return;

  const list =
    $("callHistoryList");

  if (!list) return;

  list.innerHTML = "";

  const { data } =
    await supabaseClient
      .from("call_history")
      .select("*")
      .or(
        `caller_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`
      )
      .order("created_at", {
        ascending: false
      })
      .limit(50);

  if (!data?.length) {

    list.innerHTML =
      `<div class="empty-state">
        <div class="empty-icon">📞</div>
        <h3>No call history</h3>
        <p>Your calls will appear here.</p>
      </div>`;

    return;
  }

  for (const call of data) {

    const otherId =
      call.caller_id === currentUser.id
        ? call.receiver_id
        : call.caller_id;

    const profile =
      await loadProfileById(
        otherId
      );

    const row =
      document.createElement("div");

    row.className =
      "call-history-item";

    row.innerHTML = `
      <div class="call-history-icon">
        ${
          call.call_type === "video"
            ? "🎥"
            : "📞"
        }
      </div>

      <div class="call-history-info">
        <strong>
          ${escapeHTML(
            profileName(profile)
          )}
        </strong>

        <small>
          ${call.direction === "outgoing"
            ? "Outgoing"
            : "Incoming"}
          •
          ${call.status}
          •
          ${formatDate(call.created_at)}
        </small>
      </div>
    `;

    list.appendChild(row);
  }
}


/* =========================================================
   24. REWARDS
========================================================= */

$("rewardsBtn")
  ?.addEventListener(
    "click",
    async () => {

      show(
        $("rewardsModal")
      );

      await loadRewards();
    }
  );


$("closeRewardsBtn")
  ?.addEventListener(
    "click",
    () => {
      hide(
        $("rewardsModal")
      );
    }
  );


async function loadRewards() {
  const list =
    $("rewardsList");

  if (!list) return;

  list.innerHTML = "";

  const { data } =
    await supabaseClient
      .from("qevira_rewards")
      .select("*")
      .eq("active", true)
      .order("cost");

  if (!data?.length) {

    list.innerHTML =
      `<div class="empty-state">
        <div class="empty-icon">🎁</div>
        <h3>No rewards yet</h3>
        <p>New rewards will appear here.</p>
      </div>`;

    return;
  }

  data.forEach(reward => {

    const card =
      document.createElement("div");

    card.className =
      "reward-card";

    card.innerHTML = `
      <h3>
        ${escapeHTML(
          reward.title
        )}
      </h3>

      <p>
        ${escapeHTML(
          reward.description || ""
        )}
      </p>

      <div class="reward-cost">
        <strong>
          🪙 ${reward.cost}
        </strong>

        <button
          class="secondary-btn small-btn"
          data-reward="${reward.id}"
        >
          Redeem
        </button>
      </div>
    `;

    list.appendChild(card);
  });
}


/* =========================================================
   25. LOGOUT
========================================================= */

$("logoutBtn")
  ?.addEventListener(
    "click",
    async () => {

      if (currentUser) {
        await supabaseClient
          .from("profiles")
          .update({
            is_online: false,
            last_seen:
              new Date().toISOString()
          })
          .eq(
            "id",
            currentUser.id
          );
      }

      await supabaseClient.auth.signOut();
    }
  );


/* =========================================================
   26. AUTH STATE
========================================================= */

async function startApp(user) {
  if (!user) return;

  currentUser = user;

  hide(authScreen);
  show(app);

  await loadMyProfile();

  subscribeCallInbox();

  await loadNotifications();

  openPage("chatsPage");

  loadDarkMode();
}


supabaseClient.auth
  .onAuthStateChange(
    (_event, session) => {

      setTimeout(
        async () => {

          if (session?.user) {
            await startApp(
              session.user
            );
          } else {

            currentUser = null;
            currentProfile = null;

            show(authScreen);
            hide(app);
          }

        },
        0
      );
    }
  );


/* =========================================================
   27. INITIAL SESSION
========================================================= */

async function initQevira() {
  loadDarkMode();

  const {
    data: {
      session
    }
  } =
    await supabaseClient.auth
      .getSession();

  if (session?.user) {

    await startApp(
      session.user
    );

  } else {

    show(authScreen);
    hide(app);
  }
}


/* =========================================================
   28. ONLINE / OFFLINE
========================================================= */

window.addEventListener(
  "beforeunload",
  async () => {

    if (!currentUser)
      return;

    await supabaseClient
      .from("profiles")
      .update({
        is_online: false,
        last_seen:
          new Date().toISOString()
      })
      .eq(
        "id",
        currentUser.id
      );
  }
);


window.addEventListener(
  "online",
  async () => {

    if (!currentUser)
      return;

    await supabaseClient
      .from("profiles")
      .update({
        is_online: true,
        last_seen:
          new Date().toISOString()
      })
      .eq(
        "id",
        currentUser.id
      );
  }
);


window.addEventListener(
  "offline",
  async () => {

    if (!currentUser)
      return;

    await supabaseClient
      .from("profiles")
      .update({
        is_online: false,
        last_seen:
          new Date().toISOString()
      })
      .eq(
        "id",
        currentUser.id
      );
  }
);


/* =========================================================
   29. START
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    initQevira();
  }
);
