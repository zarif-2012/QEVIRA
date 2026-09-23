// ======================================================
// QEVIRA
// PHASE 1 STABLE BUILD
//
// AUTH
// PROFILES
// 1-TO-1 REALTIME MESSAGING
// PRESENCE
//
// Calls are reserved for PHASE 2.
// ======================================================


// ======================================================
// 1. SUPABASE CONFIG
// ======================================================

const SUPABASE_URL =
  "https://wcdywnkxtuexjbjgerzd.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_bD3ajWNbZPoUw4uUwYhK3w_P-iZIAhw";


// ======================================================
// 2. CREATE SUPABASE CLIENT
// ======================================================

if (!window.supabase) {

  console.error(
    "QEVIRA ERROR: Supabase library did not load."
  );

} else {

  console.log(
    "QEVIRA: Supabase library loaded."
  );

}


const supabaseClient =
  window.supabase
    ? window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
      )
    : null;


// ======================================================
// 3. GLOBAL STATE
// ======================================================

let currentUser = null;

let currentProfile = null;

let currentChatUser = null;

let messageChannel = null;

let presenceTimer = null;

let authSubscription = null;


// ======================================================
// 4. DOM ELEMENTS
// ======================================================


// ---------- AUTH ----------

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


// ---------- TOP BAR ----------

const currentUserEmail =
  document.getElementById("currentUserEmail");

const darkModeBtn =
  document.getElementById("darkModeBtn");


// ---------- PROFILE ----------

const profileAvatar =
  document.getElementById("profileAvatar");

const profileName =
  document.getElementById("profileName");

const profileUsername =
  document.getElementById("profileUsername");

const profileEmail =
  document.getElementById("profileEmail");

const logoutBtn =
  document.getElementById("logoutBtn");


// ---------- CHATS ----------

const chatList =
  document.getElementById("chatList");

const chatEmpty =
  document.getElementById("chatEmpty");

const searchInput =
  document.getElementById("searchInput");

const newChatBtn =
  document.getElementById("newChatBtn");


// ---------- CONTACTS ----------

const contactsList =
  document.getElementById("contactsList");

const contactsSearchInput =
  document.getElementById(
    "contactsSearchInput"
  );


// ---------- CHAT MODAL ----------

const chatModal =
  document.getElementById("chatModal");

const closeChatModal =
  document.getElementById("closeChatModal");

const chatAvatar =
  document.getElementById("chatAvatar");

const chatTitle =
  document.getElementById("chatTitle");

const chatStatus =
  document.getElementById("chatStatus");

const messages =
  document.getElementById("messages");

const messageForm =
  document.getElementById("messageForm");

const messageInput =
  document.getElementById("messageInput");


// ---------- CALL BUTTONS ----------

const voiceCallBtn =
  document.getElementById("voiceCallBtn");

const videoCallBtn =
  document.getElementById("videoCallBtn");


// ======================================================
// 5. BASIC HELPERS
// ======================================================


function escapeHtml(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


function getInitial(name) {

  const text =
    String(name || "Q")
      .trim();

  return (
    text.charAt(0).toUpperCase()
    || "Q"
  );

}


function getDisplayName(profile) {

  if (!profile) {
    return "QEVIRA User";
  }

  return (
    profile.display_name ||
    profile.username ||
    profile.email ||
    "QEVIRA User"
  );

}


function formatTime(value) {

  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
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


function showAuth() {

  authScreen?.classList.remove(
    "hidden"
  );

  app?.classList.add(
    "hidden"
  );

}


function showApp() {

  authScreen?.classList.add(
    "hidden"
  );

  app?.classList.remove(
    "hidden"
  );

}


function updateAuthSwitchText() {

  if (!switchAuthBtn) {
    return;
  }

  const loginVisible =
    loginForm &&
    !loginForm.classList.contains(
      "hidden"
    );

  if (loginVisible) {

    switchAuthBtn.textContent =
      "Don't have an account? Sign up";

  } else {

    switchAuthBtn.textContent =
      "Already have an account? Login";

  }

}


// ======================================================
// 6. AUTH MODE SWITCH
// ======================================================

switchAuthBtn?.addEventListener(
  "click",
  () => {

    signupForm?.classList.toggle(
      "hidden"
    );

    loginForm?.classList.toggle(
      "hidden"
    );

    setAuthMessage("");

    updateAuthSwitchText();

  }
);


// ======================================================
// 7. SIGN UP
// ======================================================

signupForm?.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    if (!supabaseClient) {

      setAuthMessage(
        "QEVIRA authentication is unavailable.",
        true
      );

      return;
    }


    const email =
      signupEmail?.value
        .trim();

    const password =
      signupPassword?.value || "";


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


      console.log(
        "QEVIRA SIGNUP:",
        data
      );


      // If email confirmation is disabled
      // Supabase may give us a session.

      if (
        data?.session &&
        data?.user
      ) {

        await startApp(
          data.user
        );

        return;
      }


      // Normal email-confirmation flow.

      setAuthMessage(
        "Account created! Check your email, confirm your account, then login."
      );


      signupForm?.classList.add(
        "hidden"
      );

      loginForm?.classList.remove(
        "hidden"
      );

      updateAuthSwitchText();


      if (loginEmail) {

        loginEmail.value =
          email;

      }


    } catch (error) {

      console.error(
        "QEVIRA SIGNUP ERROR:",
        error
      );


      setAuthMessage(
        error?.message ||
        "Signup failed.",
        true
      );


    } finally {

      signupBtn.disabled =
        false;

      signupBtn.textContent =
        "Create Account";

    }

  }
);


// ======================================================
// 8. LOGIN
// ======================================================

loginForm?.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    if (!supabaseClient) {

      setAuthMessage(
        "QEVIRA authentication is unavailable.",
        true
      );

      return;
    }


    const email =
      loginEmail?.value
        .trim();

    const password =
      loginPassword?.value || "";


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
          "Login succeeded but no user was returned."
        );

      }


      console.log(
        "QEVIRA LOGIN SUCCESS:",
        data.user.email
      );


      await startApp(
        data.user
      );


    } catch (error) {

      console.error(
        "QEVIRA LOGIN ERROR:",
        error
      );


      setAuthMessage(
        error?.message ||
        "Login failed.",
        true
      );


    } finally {

      loginBtn.disabled =
        false;

      loginBtn.textContent =
        "Login";

    }

  }
);


// ======================================================
// 9. PROFILE — ENSURE
// ======================================================

async function ensureProfile() {

  if (
    !currentUser ||
    !supabaseClient
  ) {
    return;
  }


  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("profiles")
        .select(
          "id,email,display_name,username"
        )
        .eq(
          "id",
          currentUser.id
        )
        .maybeSingle();


    if (error) {

      console.error(
        "Profile lookup error:",
        error
      );

      return;

    }


    if (data) {

      currentProfile =
        data;

      return;

    }


    const emailName =
      currentUser.email
        ?.split("@")[0]
        ?.toLowerCase()
        .replace(
          /[^a-z0-9_]/g,
          ""
        )
        .slice(0, 20)
      || "qevirauser";


    const {
      data: created,
      error: createError
    } =
      await supabaseClient
        .from("profiles")
        .insert({
          id: currentUser.id,
          email:
            currentUser.email ||
            null,
          display_name:
            currentUser.email
              ?.split("@")[0]
              || "QEVIRA User",
          username:
            emailName
        })
        .select()
        .single();


    if (createError) {

      console.error(
        "Profile creation error:",
        createError
      );

      return;

    }


    currentProfile =
      created;


  } catch (error) {

    console.error(
      "ensureProfile exception:",
      error
    );

  }

}


// ======================================================
// 10. LOAD PROFILE
// ======================================================

async function loadProfile() {

  if (
    !currentUser ||
    !supabaseClient
  ) {
    return;
  }


  const {
    data,
    error
  } =
    await supabaseClient
      .from("profiles")
      .select(
        "id,email,display_name,username"
      )
      .eq(
        "id",
        currentUser.id
      )
      .maybeSingle();


  if (error) {

    console.error(
      "Load profile error:",
      error
    );

    return;

  }


  currentProfile =
    data || currentProfile;


  const name =
    getDisplayName(
      currentProfile
    );


  if (profileName) {

    profileName.textContent =
      name;

  }


  if (profileUsername) {

    profileUsername.textContent =
      currentProfile?.username
        ? "@" +
          currentProfile.username
        : "@user";

  }


  if (profileEmail) {

    profileEmail.textContent =
      currentUser.email || "";

  }


  if (profileAvatar) {

    profileAvatar.textContent =
      getInitial(name);

  }


  if (currentUserEmail) {

    currentUserEmail.textContent =
      currentUser.email || "";

  }

}


// ======================================================
// 11. PRESENCE
// ======================================================

async function updatePresence() {

  if (
    !currentUser ||
    !supabaseClient
  ) {
    return;
  }


  // This is safe even if last_seen
  // has not been added yet.
  //
  // If your profiles table already has
  // last_seen, it will update normally.

  const {
    error
  } =
    await supabaseClient
      .from("profiles")
      .update({
        last_seen:
          new Date().toISOString()
      })
      .eq(
        "id",
        currentUser.id
      );


  if (error) {

    console.warn(
      "Presence update:",
      error.message
    );

  }

}


// ======================================================
// 12. CONTACTS
// ======================================================

async function loadContacts(
  search = ""
) {

  if (
    !currentUser ||
    !supabaseClient ||
    !contactsList
  ) {
    return;
  }


  contactsList.innerHTML =
    `
      <div class="loading-state">
        Loading contacts...
      </div>
    `;


  let query =
    supabaseClient
      .from("profiles")
      .select(
        "id,email,display_name,username"
      )
      .neq(
        "id",
        currentUser.id
      )
      .order(
        "display_name",
        {
          ascending: true
        }
      )
      .limit(100);


  const term =
    search.trim();


  if (term) {

    const safeTerm =
      term.replace(
        /[%_]/g,
        ""
      );


    query =
      query.or(
        "display_name.ilike.%" +
        safeTerm +
        "%," +
        "username.ilike.%" +
        safeTerm +
        "%," +
        "email.ilike.%" +
        safeTerm +
        "%"
      );

  }


  const {
    data,
    error
  } =
    await query;


  if (error) {

    console.error(
      "Contacts error:",
      error
    );


    contactsList.innerHTML =
      `
        <div class="empty-state">
          <h3>Contacts unavailable</h3>
          <p>Check your Supabase profiles table.</p>
        </div>
      `;

    return;

  }


  if (!data?.length) {

    contactsList.innerHTML =
      `
        <div class="empty-state">
          <h3>No users found</h3>
          <p>Try another search.</p>
        </div>
      `;

    return;

  }


  contactsList.innerHTML =
    data
      .map(
        (profile) => {

          const name =
            getDisplayName(
              profile
            );


          return `
            <button
              class="contact-item"
              type="button"
              data-user-id="${escapeHtml(profile.id)}"
            >

              <div class="mini-avatar">
                ${escapeHtml(
                  getInitial(name)
                )}
              </div>

              <div class="contact-info">

                <strong>
                  ${escapeHtml(name)}
                </strong>

                <span>
                  @${escapeHtml(
                    profile.username ||
                    "user"
                  )}
                </span>

              </div>

            </button>
          `;

        }
      )
      .join("");


  contactsList
    .querySelectorAll(
      "[data-user-id]"
    )
    .forEach(
      (button) => {

        button.addEventListener(
          "click",
          async () => {

            const userId =
              button.dataset.userId;


            const profile =
              data.find(
                (item) =>
                  item.id === userId
              );


            if (profile) {

              await openChat(
                profile
              );

            }

          }
        );

      }
    );

}


// ======================================================
// 13. GET CHAT USERS
// ======================================================

async function getChatUsers() {

  if (
    !currentUser ||
    !supabaseClient
  ) {
    return [];
  }


  const sentResult =
    await supabaseClient
      .from("messages")
      .select(
        "receiver_id,created_at"
      )
      .eq(
        "sender_id",
        currentUser.id
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      )
      .limit(100);


  const receivedResult =
    await supabaseClient
      .from("messages")
      .select(
        "sender_id,created_at"
      )
      .eq(
        "receiver_id",
        currentUser.id
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      )
      .limit(100);


  if (
    sentResult.error ||
    receivedResult.error
  ) {

    console.error(
      "Chat query error:",
      sentResult.error ||
      receivedResult.error
    );

    return [];

  }


  const ids =
    new Set();


  (sentResult.data || [])
    .forEach(
      (row) => {

        if (row.receiver_id) {

          ids.add(
            row.receiver_id
          );

        }

      }
    );


  (receivedResult.data || [])
    .forEach(
      (row) => {

        if (row.sender_id) {

          ids.add(
            row.sender_id
          );

        }

      }
    );


  if (!ids.size) {

    return [];

  }


  const {
    data,
    error
  } =
    await supabaseClient
      .from("profiles")
      .select(
        "id,email,display_name,username"
      )
      .in(
        "id",
        [...ids]
      );


  if (error) {

    console.error(
      "Chat profile error:",
      error
    );

    return [];

  }


  return data || [];

}


// ======================================================
// 14. LOAD CHATS
// ======================================================

async function loadChats(
  search = ""
) {

  if (
    !currentUser ||
    !chatList
  ) {
    return;
  }


  chatList.innerHTML =
    `
      <div class="loading-state">
        Loading chats...
      </div>
    `;


  const profiles =
    await getChatUsers();


  const term =
    search.trim()
      .toLowerCase();


  const filtered =
    profiles.filter(
      (profile) => {

        if (!term) {
          return true;
        }


        const text =
          (
            getDisplayName(
              profile
            ) +
            " " +
            (profile.username || "") +
            " " +
            (profile.email || "")
          )
          .toLowerCase();


        return text.includes(
          term
        );

      }
    );


  if (chatEmpty) {

    chatEmpty.classList.toggle(
      "hidden",
      filtered.length > 0
    );

  }


  if (!filtered.length) {

    chatList.innerHTML =
      "";

    return;

  }


  chatList.innerHTML =
    filtered
      .map(
        (profile) => {

          const name =
            getDisplayName(
              profile
            );


          return `
            <button
              class="chat-item"
              type="button"
              data-user-id="${escapeHtml(profile.id)}"
            >

              <div class="mini-avatar">
                ${escapeHtml(
                  getInitial(name)
                )}
              </div>

              <div class="chat-info">

                <strong>
                  ${escapeHtml(name)}
                </strong>

                <span>
                  @${escapeHtml(
                    profile.username ||
                    "user"
                  )}
                </span>

              </div>

            </button>
          `;

        }
      )
      .join("");


  chatList
    .querySelectorAll(
      "[data-user-id]"
    )
    .forEach(
      (button) => {

        button.addEventListener(
          "click",
          async () => {

            const profile =
              filtered.find(
                (item) =>
                  item.id ===
                  button.dataset.userId
              );


            if (profile) {

              await openChat(
                profile
              );

            }

          }
        );

      }
    );

}


// ======================================================
// 15. OPEN CHAT
// ======================================================

async function openChat(
  profile
) {

  if (!profile) {
    return;
  }


  currentChatUser =
    profile;


  chatModal?.classList.remove(
    "hidden"
  );


  const name =
    getDisplayName(
      profile
    );


  if (chatTitle) {

    chatTitle.textContent =
      name;

  }


  if (chatAvatar) {

    chatAvatar.textContent =
      getInitial(name);

  }


  if (chatStatus) {

    chatStatus.textContent =
      "Online";

  }


  await loadMessages();

  subscribeToMessages();


  messageInput?.focus();

}


// ======================================================
// 16. CLOSE CHAT
// ======================================================

function closeChat() {

  chatModal?.classList.add(
    "hidden"
  );


  currentChatUser =
    null;


  if (
    messageChannel &&
    supabaseClient
  ) {

    supabaseClient.removeChannel(
      messageChannel
    );

    messageChannel =
      null;

  }

}


closeChatModal?.addEventListener(
  "click",
  closeChat
);


chatModal?.addEventListener(
  "click",
  (event) => {

    if (
      event.target ===
      chatModal
    ) {

      closeChat();

    }

  }
);


// ======================================================
// 17. LOAD MESSAGES
// ======================================================

async function loadMessages() {

  if (
    !currentUser ||
    !currentChatUser ||
    !supabaseClient ||
    !messages
  ) {
    return;
  }


  messages.innerHTML =
    `
      <div class="loading-state">
        Loading messages...
      </div>
    `;


  const userA =
    currentUser.id;

  const userB =
    currentChatUser.id;


  const {
    data,
    error
  } =
    await supabaseClient
      .from("messages")
      .select(
        "id,sender_id,receiver_id,body,created_at"
      )
      .or(
        "and(sender_id.eq." +
        userA +
        ",receiver_id.eq." +
        userB +
        ")," +
        "and(sender_id.eq." +
        userB +
        ",receiver_id.eq." +
        userA +
        ")"
      )
      .order(
        "created_at",
        {
          ascending: true
        }
      );


  if (error) {

    console.error(
      "Messages error:",
      error
    );


    messages.innerHTML =
      `
        <div class="empty-state">
          <h3>Messages unavailable</h3>
          <p>Check your Supabase messages table and policies.</p>
        </div>
      `;

    return;

  }


  renderMessages(
    data || []
  );

}


// ======================================================
// 18. RENDER MESSAGES
// ======================================================

function renderMessages(
  rows
) {

  if (!messages) {
    return;
  }


  if (!rows.length) {

    messages.innerHTML =
      `
        <div class="empty-state">
          <h3>No messages yet</h3>
          <p>Say hello 👋</p>
        </div>
      `;

    return;

  }


  messages.innerHTML =
    rows
      .map(
        (row) => {

          const mine =
            row.sender_id ===
            currentUser?.id;


          return `
            <div
              class="message-row ${
                mine
                  ? "mine"
                  : "theirs"
              }"
            >

              <div class="message-bubble">

                <div>
                  ${escapeHtml(
                    row.body
                  )}
                </div>

                <small>
                  ${escapeHtml(
                    formatTime(
                      row.created_at
                    )
                  )}
                </small>

              </div>

            </div>
          `;

        }
      )
      .join("");


  messages.scrollTop =
    messages.scrollHeight;

}


// ======================================================
// 19. REALTIME MESSAGES
// ======================================================

function subscribeToMessages() {

  if (
    !currentUser ||
    !currentChatUser ||
    !supabaseClient
  ) {
    return;
  }


  if (messageChannel) {

    supabaseClient.removeChannel(
      messageChannel
    );

    messageChannel =
      null;

  }


  const channelName =
    "qevira-messages-" +
    currentUser.id +
    "-" +
    currentChatUser.id;


  messageChannel =
    supabaseClient
      .channel(
        channelName
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages"
        },
        (payload) => {

          const row =
            payload.new;


          if (!row) {
            return;
          }


          const belongs =
            (
              row.sender_id ===
              currentUser.id &&
              row.receiver_id ===
              currentChatUser.id
            ) ||
            (
              row.sender_id ===
              currentChatUser.id &&
              row.receiver_id ===
              currentUser.id
            );


          if (belongs) {

            loadMessages();

          }

        }
      )
      .subscribe(
        (status) => {

          console.log(
            "QEVIRA realtime:",
            status
          );

        }
      );

}


// ======================================================
// 20. SEND MESSAGE
// ======================================================

messageForm?.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();


    if (
      !currentUser ||
      !currentChatUser ||
      !supabaseClient
    ) {
      return;
    }


    const body =
      messageInput?.value
        .trim();


    if (!body) {
      return;
    }


    const sendButton =
      messageForm.querySelector(
        "button[type='submit']"
      );


    if (sendButton) {

      sendButton.disabled =
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

            body:
              body
          });


      if (error) {
        throw error;
      }


      if (messageInput) {

        messageInput.value =
          "";

      }


      await loadMessages();


    } catch (error) {

      console.error(
        "Send message error:",
        error
      );


      setAuthMessage(
        error?.message ||
        "Message failed to send.",
        true
      );


    } finally {

      if (sendButton) {

        sendButton.disabled =
          false;

      }

    }

  }
);


// ======================================================
// 21. NAVIGATION
// ======================================================

function showPage(
  pageId
) {

  document
    .querySelectorAll(".page")
    .forEach(
      (page) => {

        page.classList.toggle(
          "hidden",
          page.id !== pageId
        );

      }
    );


  document
    .querySelectorAll(
      ".nav-item[data-page]"
    )
    .forEach(
      (item) => {

        item.classList.toggle(
          "active",
          item.dataset.page ===
          pageId
        );

      }
    );

}


document
  .querySelectorAll(
    ".nav-item[data-page]"
  )
  .forEach(
    (item) => {

      item.addEventListener(
        "click",
        async () => {

          const pageId =
            item.dataset.page;


          showPage(
            pageId
          );


          if (
            pageId ===
            "contactsPage"
          ) {

            await loadContacts(
              contactsSearchInput?.value ||
              ""
            );

          }


          if (
            pageId ===
            "chatsPage"
          ) {

            await loadChats(
              searchInput?.value ||
              ""
            );

          }


          if (
            pageId ===
            "profilePage"
          ) {

            await loadProfile();

          }

        }
      );

    }
  );


// ======================================================
// 22. CONTACT SEARCH
// ======================================================

contactsSearchInput?.addEventListener(
  "input",
  () => {

    loadContacts(
      contactsSearchInput.value
    );

  }
);


// ======================================================
// 23. CHAT SEARCH
// ======================================================

searchInput?.addEventListener(
  "input",
  () => {

    loadChats(
      searchInput.value
    );

  }
);


// ======================================================
// 24. NEW CHAT
// ======================================================

newChatBtn?.addEventListener(
  "click",
  async () => {

    showPage(
      "contactsPage"
    );


    await loadContacts(
      contactsSearchInput?.value ||
      ""
    );


    contactsSearchInput?.focus();

  }
);


// ======================================================
// 25. DARK MODE
// ======================================================

function applyDarkMode(
  enabled
) {

  document.body.classList.toggle(
    "dark",
    enabled
  );


  localStorage.setItem(
    "qevira-dark",
    enabled
      ? "1"
      : "0"
  );


  const icon =
    darkModeBtn?.querySelector(
      ".icon"
    );


  if (icon) {

    icon.textContent =
      enabled
        ? "☀"
        : "☾";

  }

}


darkModeBtn?.addEventListener(
  "click",
  () => {

    applyDarkMode(
      !document.body.classList.contains(
        "dark"
      )
    );

  }
);


applyDarkMode(
  localStorage.getItem(
    "qevira-dark"
  ) === "1"
);


// ======================================================
// 26. CALL BUTTONS
// PHASE 2
// ======================================================

voiceCallBtn?.addEventListener(
  "click",
  () => {

    alert(
      "QEVIRA Voice Calling will be activated in Phase 2."
    );

  }
);


videoCallBtn?.addEventListener(
  "click",
  () => {

    alert(
      "QEVIRA Video Calling will be activated in Phase 2."
    );

  }
);


// ======================================================
// 27. LOGOUT
// ======================================================

logoutBtn?.addEventListener(
  "click",
  async () => {

    try {

      if (presenceTimer) {

        clearInterval(
          presenceTimer
        );

        presenceTimer =
          null;

      }


      if (
        messageChannel &&
        supabaseClient
      ) {

        await supabaseClient
          .removeChannel(
            messageChannel
          );

        messageChannel =
          null;

      }


      if (
        authSubscription
      ) {

        authSubscription.unsubscribe();

        authSubscription =
          null;

      }


      if (supabaseClient) {

        await supabaseClient
          .auth
          .signOut();

      }

    } catch (error) {

      console.error(
        "Logout error:",
        error
      );

    }


    currentUser =
      null;

    currentProfile =
      null;

    currentChatUser =
      null;


    showAuth();

    setAuthMessage(
      "Logged out."
    );

  }
);


// ======================================================
// 28. AUTH STATE
// ======================================================

async function initAuth() {

  if (!supabaseClient) {

    showAuth();

    setAuthMessage(
      "Supabase could not load. Please refresh.",
      true
    );

    return;

  }


  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .auth
        .getSession();


    if (error) {

      console.error(
        "Session error:",
        error
      );

      showAuth();

    } else if (
      data?.session?.user
    ) {

      await startApp(
        data.session.user
      );

    } else {

      showAuth();

    }


    const {
      data: listener
    } =
      supabaseClient.auth
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
              session?.user &&
              event ===
                "SIGNED_IN"
            ) {

              await startApp(
                session.user
              );

            }


            if (
              event ===
              "SIGNED_OUT"
            ) {

              showAuth();

            }

          }
        );


    authSubscription =
      listener?.subscription ||
      null;


  } catch (error) {

    console.error(
      "QEVIRA AUTH START ERROR:",
      error
    );


    showAuth();


    setAuthMessage(
      "Authentication could not start. Refresh the page.",
      true
    );

  }

}


// ======================================================
// 29. START APP
// ======================================================

async function startApp(
  user
) {

  if (!user) {

    showAuth();

    return;

  }


  currentUser =
    user;


  if (currentUserEmail) {

    currentUserEmail.textContent =
      user.email || "";

  }


  // IMPORTANT:
  // Open the app FIRST.
  // Database errors must not trap
  // the user on the login screen.

  showApp();


  console.log(
    "QEVIRA APP OPENED:",
    user.email
  );


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

    await updatePresence();

  } catch (error) {

    console.error(
      "Presence:",
      error
    );

  }


  if (presenceTimer) {

    clearInterval(
      presenceTimer
    );

  }


  presenceTimer =
    setInterval(
      updatePresence,
      60000
    );

}


// ======================================================
// 30. START QEVIRA
// ======================================================

console.log(
  "======================================"
);

console.log(
  "QEVIRA PHASE 1 JS LOADED"
);

console.log(
  "Auth + Profiles + Chat + Presence"
);

console.log(
  "======================================"
);


updateAuthSwitchText();


initAuth();
