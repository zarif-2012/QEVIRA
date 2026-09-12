// ======================================================
// QEVIRA
// AUTH + PROFILES + CONTACTS + MESSAGING
// REALTIME WEBRTC VOICE + VIDEO CALLING
// ======================================================


// ======================================================
// 1. SUPABASE CONFIG
// ======================================================

const SUPABASE_URL =
  "https://wcdywnkxtuexjbjgerzd.supabase.co";

// PASTE YOUR EXISTING SUPABASE ANON/PUBLISHABLE KEY HERE
const SUPABASE_ANON_KEY =
  "PASTE_YOUR_EXISTING_SUPABASE_ANON_KEY_HERE";

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

let isSpeakerOn = false;


// ======================================================
// 3. DOM
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

const darkModeBtn =
  document.getElementById("darkModeBtn");

const chatsPage =
  document.getElementById("chatsPage");

const contactsPage =
  document.getElementById("contactsPage");

const profilePage =
  document.getElementById("profilePage");

const chatList =
  document.getElementById("chatList");

const chatEmpty =
  document.getElementById("chatEmpty");

const contactsList =
  document.getElementById("contactsList");

const searchInput =
  document.getElementById("searchInput");

const contactsSearchInput =
  document.getElementById("contactsSearchInput");

const newChatBtn =
  document.getElementById("newChatBtn");

const logoutBtn =
  document.getElementById("logoutBtn");

const profileAvatar =
  document.getElementById("profileAvatar");

const profileName =
  document.getElementById("profileName");

const profileUsername =
  document.getElementById("profileUsername");

const profileEmail =
  document.getElementById("profileEmail");

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

const voiceCallBtn =
  document.getElementById("voiceCallBtn");

const videoCallBtn =
  document.getElementById("videoCallBtn");


// ======================================================
// CALL DOM
// ======================================================

const incomingCallOverlay =
  document.getElementById("incomingCallOverlay");

const incomingCallAvatar =
  document.getElementById("incomingCallAvatar");

const incomingCallName =
  document.getElementById("incomingCallName");

const incomingCallType =
  document.getElementById("incomingCallType");

const declineCallBtn =
  document.getElementById("declineCallBtn");

const acceptCallBtn =
  document.getElementById("acceptCallBtn");

const activeCallOverlay =
  document.getElementById("activeCallOverlay");

const remoteVideo =
  document.getElementById("remoteVideo");

const localVideo =
  document.getElementById("localVideo");

const voiceCallDisplay =
  document.getElementById("voiceCallDisplay");

const activeCallAvatar =
  document.getElementById("activeCallAvatar");

const activeCallName =
  document.getElementById("activeCallName");

const activeCallType =
  document.getElementById("activeCallType");

const muteCallBtn =
  document.getElementById("muteCallBtn");

const cameraCallBtn =
  document.getElementById("cameraCallBtn");

const speakerCallBtn =
  document.getElementById("speakerCallBtn");

const switchCameraBtn =
  document.getElementById("switchCameraBtn");

const endCallBtn =
  document.getElementById("endCallBtn");


// ======================================================
// 4. WEBRTC CONFIG
// ======================================================

const rtcConfig = {
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
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function getInitial(value) {

  if (!value) {
    return "Q";
  }

  return String(value)
    .trim()
    .charAt(0)
    .toUpperCase() || "Q";
}


function setAuthMessage(message, error = true) {

  authMessage.textContent = message;

  authMessage.style.color =
    error
      ? "var(--danger)"
      : "var(--green)";
}


function showApp() {

  authScreen.classList.add("hidden");

  app.classList.remove("hidden");
}


function showAuth() {

  app.classList.add("hidden");

  authScreen.classList.remove("hidden");
}


function getPairId(userA, userB) {

  return [
    String(userA),
    String(userB)
  ].sort().join("-");
}


function getCallInboxName(userId) {

  return `qevira-call-inbox-${userId}`;
}


function getCallPairName(userA, userB) {

  return `qevira-call-${getPairId(userA, userB)}`;
}


function isForCurrentUser(payload) {

  if (!payload) {
    return false;
  }

  return (
    !payload.to ||
    String(payload.to) === String(currentUser.id)
  );
}


// ======================================================
// 6. AUTH MODE
// ======================================================

switchAuthBtn.addEventListener(
  "click",
  () => {

    const signupVisible =
      !signupForm.classList.contains("hidden");

    if (signupVisible) {

      signupForm.classList.add("hidden");

      loginForm.classList.remove("hidden");

      switchAuthBtn.textContent =
        "Don't have an account? Sign up";

    } else {

      loginForm.classList.add("hidden");

      signupForm.classList.remove("hidden");

      switchAuthBtn.textContent =
        "Already have an account? Login";
    }

    setAuthMessage("");
  }
);


// ======================================================
// 7. SIGN UP
// ======================================================

signupForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    const email =
      signupEmail.value.trim();

    const password =
      signupPassword.value;

    if (!email || !password) {
      setAuthMessage(
        "Please enter email and password."
      );

      return;
    }

    signupBtn.disabled = true;

    signupBtn.textContent =
      "Creating...";

    const {
      data,
      error
    } =
      await supabaseClient.auth.signUp({
        email,
        password
      });

    signupBtn.disabled = false;

    signupBtn.textContent =
      "Create Account";

    if (error) {

      setAuthMessage(
        error.message
      );

      return;
    }

    if (data.user) {

      setAuthMessage(
        "Account created. Check your email if confirmation is required.",
        false
      );

      signupPassword.value = "";
    }

  }
);


// ======================================================
// 8. LOGIN
// ======================================================

loginForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    const email =
      loginEmail.value.trim();

    const password =
      loginPassword.value;

    if (!email || !password) {

      setAuthMessage(
        "Please enter email and password."
      );

      return;
    }

    loginBtn.disabled = true;

    loginBtn.textContent =
      "Logging in...";

    const {
      data,
      error
    } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    loginBtn.disabled = false;

    loginBtn.textContent =
      "Login";

    if (error) {

      setAuthMessage(
        error.message
      );

      return;
    }

    if (data.user) {

      await startApp(data.user);

    }

  }
);


// ======================================================
// 9. AUTH STATE
// ======================================================

async function initAuth() {

  const {
    data: {
      session
    }
  } =
    await supabaseClient.auth.getSession();

  if (session?.user) {

    await startApp(session.user);

  } else {

    showAuth();

  }


  authSubscription =
    supabaseClient.auth.onAuthStateChange(
      async (_event, sessionData) => {

        if (sessionData?.user) {

          if (!currentUser) {
            await startApp(sessionData.user);
          }

        } else {

          await stopApp();

        }

      }
    );

}


async function startApp(user) {

  currentUser = user;

  currentUserEmail.textContent =
    user.email || "";

  showApp();

  await ensureProfile();

  await loadProfile();

  await loadContacts();

  await loadChats();

  setupCallChannel();

}


async function stopApp() {

  currentUser = null;

  await cleanupCall(false);

  if (callInboxChannel) {

    await supabaseClient.removeChannel(
      callInboxChannel
    );

    callInboxChannel = null;
  }

  if (callPairChannel) {

    await supabaseClient.removeChannel(
      callPairChannel
    );

    callPairChannel = null;
  }

  showAuth();

}


// ======================================================
// 10. PROFILE
// ======================================================

async function ensureProfile() {

  if (!currentUser) {
    return;
  }

  const {
    data,
    error
  } =
    await supabaseClient
      .from("profiles")
      .select("id")
      .eq("id", currentUser.id)
      .maybeSingle();

  if (error) {

    console.warn(
      "Profile check:",
      error.message
    );

    return;
  }

  if (!data) {

    const emailName =
      currentUser.email
        ? currentUser.email.split("@")[0]
        : "user";

    await supabaseClient
      .from("profiles")
      .insert({
        id: currentUser.id,
        username: emailName,
        full_name: emailName
      });

  }

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

    console.warn(
      "Profile load:",
      error.message
    );

    profileEmail.textContent =
      currentUser.email || "";

    return;
  }

  const profile =
    data || {};

  const name =
    profile.full_name ||
    profile.username ||
    "QEVIRA User";

  const username =
    profile.username
      ? `@${profile.username}`
      : "@user";

  const initial =
    getInitial(name);

  profileName.textContent =
    name;

  profileUsername.textContent =
    username;

  profileEmail.textContent =
    currentUser.email || "";

  profileAvatar.textContent =
    initial;

}


// ======================================================
// 11. CONTACTS
// ======================================================

async function loadContacts(search = "") {

  if (!currentUser) {
    return;
  }

  let query =
    supabaseClient
      .from("profiles")
      .select("*")
      .neq("id", currentUser.id)
      .order("username", {
        ascending: true
      })
      .limit(100);

  if (search.trim()) {

    const term =
      search.trim();

    query =
      query.or(
        `username.ilike.%${term}%,full_name.ilike.%${term}%`
      );

  }

  const {
    data,
    error
  } = await query;

  if (error) {

    console.error(
      "Contacts error:",
      error.message
    );

    contactsList.innerHTML =
      `<div class="empty-state">
        Unable to load contacts.
      </div>`;

    return;
  }

  contactsList.innerHTML = "";

  if (!data || data.length === 0) {

    contactsList.innerHTML =
      `<div class="empty-state">
        <div class="empty-icon">♙</div>
        <h3>No users found</h3>
        <p>Try another search.</p>
      </div>`;

    return;
  }

  data.forEach(profile => {

    const card =
      document.createElement("div");

    card.className =
      "user-card";

    const name =
      profile.full_name ||
      profile.username ||
      "QEVIRA User";

    card.innerHTML = `
      <div class="user-avatar">
        ${escapeHtml(getInitial(name))}
      </div>

      <div class="user-info">
        <strong>
          ${escapeHtml(name)}
        </strong>

        <span>
          ${profile.username
            ? "@" + escapeHtml(profile.username)
            : "QEVIRA user"}
        </span>
      </div>

      <span class="online-dot"></span>
    `;

    card.addEventListener(
      "click",
      () => openChat(profile)
    );

    contactsList.appendChild(card);

  });

}


// ======================================================
// 12. CHATS
// ======================================================

async function loadChats() {

  chatList.innerHTML = "";

  chatEmpty.classList.remove("hidden");

  // This section can later be expanded with
  // a dedicated conversations table.
  //
  // For now QEVIRA keeps the chat list simple
  // and contacts can open conversations directly.

}


async function openChat(profile) {

  currentChatUser =
    profile;

  chatModal.classList.remove("hidden");

  const name =
    profile.full_name ||
    profile.username ||
    "QEVIRA User";

  chatTitle.textContent =
    name;

  chatAvatar.textContent =
    getInitial(name);

  chatStatus.textContent =
    "QEVIRA";

  messages.innerHTML = "";

  await loadMessages();

  setupChatRealtime();

  messageInput.focus();

}


function closeChat() {

  chatModal.classList.add("hidden");

  if (chatChannel) {

    supabaseClient.removeChannel(
      chatChannel
    );

    chatChannel = null;
  }

  currentChatUser = null;

}


closeChatModal.addEventListener(
  "click",
  closeChat
);


// ======================================================
// 13. MESSAGES
// ======================================================

async function loadMessages() {

  if (
    !currentUser ||
    !currentChatUser
  ) {
    return;
  }

  const {
    data,
    error
  } =
    await supabaseClient
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${currentUser.id},receiver_id.eq.${currentChatUser.id}),and(sender_id.eq.${currentChatUser.id},receiver_id.eq.${currentUser.id})`
      )
      .order("created_at", {
        ascending: true
      })
      .limit(300);

  if (error) {

    console.warn(
      "Messages load:",
      error.message
    );

    messages.innerHTML =
      `<div class="empty-state">
        <p>No messages yet.</p>
      </div>`;

    return;
  }

  messages.innerHTML = "";

  if (!data || data.length === 0) {

    messages.innerHTML =
      `<div class="empty-state">
        <div class="empty-icon">💬</div>
        <h3>Start chatting</h3>
        <p>Send your first message.</p>
      </div>`;

    return;
  }

  data.forEach(
    renderMessage
  );

  scrollMessages();

}


function renderMessage(message) {

  const sent =
    message.sender_id === currentUser.id;

  const div =
    document.createElement("div");

  div.className =
    `message ${sent ? "sent" : "received"}`;

  const date =
    message.created_at
      ? new Date(message.created_at)
      : new Date();

  div.innerHTML = `
    <div>
      ${escapeHtml(message.content || "")}
    </div>

    <span class="message-time">
      ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      })}
    </span>
  `;

  messages.appendChild(div);

}


function scrollMessages() {

  messages.scrollTop =
    messages.scrollHeight;

}


messageForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    const content =
      messageInput.value.trim();

    if (
      !content ||
      !currentUser ||
      !currentChatUser
    ) {
      return;
    }

    messageInput.value = "";

    const {
      error
    } =
      await supabaseClient
        .from("messages")
        .insert({
          sender_id: currentUser.id,
          receiver_id: currentChatUser.id,
          content
        });

    if (error) {

      console.error(
        "Send message:",
        error.message
      );

      messageInput.value =
        content;

      return;
    }

  }
);


// ======================================================
// 14. CHAT REALTIME
// ======================================================

function setupChatRealtime() {

  if (!currentChatUser || !currentUser) {
    return;
  }

  if (chatChannel) {

    supabaseClient.removeChannel(
      chatChannel
    );

    chatChannel = null;
  }

  chatChannel =
    supabaseClient
      .channel(
        `qevira-chat-${getPairId(
          currentUser.id,
          currentChatUser.id
        )}`
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

          const related =
            (
              message.sender_id === currentUser.id &&
              message.receiver_id === currentChatUser.id
            ) ||
            (
              message.sender_id === currentChatUser.id &&
              message.receiver_id === currentUser.id
            );

          if (!related) {
            return;
          }

          const existing =
            [...messages.children].some(
              element => {

                return (
                  element.dataset &&
                  element.dataset.messageId ===
                  String(message.id)
                );

              }
            );

          if (!existing) {

            const element =
              document.createElement("div");

            element.dataset.messageId =
              String(message.id);

            const sent =
              message.sender_id ===
              currentUser.id;

            element.className =
              `message ${sent ? "sent" : "received"}`;

            const date =
              message.created_at
                ? new Date(message.created_at)
                : new Date();

            element.innerHTML = `
              <div>
                ${escapeHtml(message.content || "")}
              </div>

              <span class="message-time">
                ${date.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </span>
            `;

            messages.appendChild(
              element
            );

            scrollMessages();

          }

        }
      )
      .subscribe();

}


// ======================================================
// 15. CALL INBOX
// ======================================================

function setupCallChannel() {

  if (!currentUser) {
    return;
  }

  if (callInboxChannel) {

    supabaseClient.removeChannel(
      callInboxChannel
    );

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
          event: "incoming-call"
        },
        async payload => {

          const data =
            payload.payload;

          if (!data) {
            return;
          }

          if (
            data.to &&
            String(data.to) !==
            String(currentUser.id)
          ) {
            return;
          }

          if (
            activeCallPeerId ||
            activeCallAccepted
          ) {
            return;
          }

          await handleIncomingCall(
            data
          );

        }
      )
      .on(
        "broadcast",
        {
          event: "call-offer"
        },
        async payload => {

          const data =
            payload.payload;

          if (!data) {
            return;
          }

          if (
            data.to &&
            String(data.to) !==
            String(currentUser.id)
          ) {
            return;
          }

          await handleIncomingOffer(
            data
          );

        }
      )
      .on(
        "broadcast",
        {
          event: "call-hangup"
        },
        async payload => {

          const data =
            payload.payload;

          if (
            !data ||
            !isForCurrentUser(data)
          ) {
            return;
          }

          if (
            data.from &&
            String(data.from) ===
            String(activeCallPeerId)
          ) {

            await cleanupCall(true);

          }

        }
      )
      .on(
        "broadcast",
        {
          event: "call-decline"
        },
        async payload => {

          const data =
            payload.payload;

          if (
            !data ||
            !isForCurrentUser(data)
          ) {
            return;
          }

          if (
            data.from &&
            String(data.from) ===
            String(activeCallPeerId)
          ) {

            await cleanupCall(true);

          }

        }
      )
      .subscribe(
        status => {

          console.log(
            "Call inbox:",
            status
          );

        }
      );

}


// ======================================================
// 16. SEND TO USER INBOX
// ======================================================

async function sendToUserInbox(
  userId,
  event,
  payload
) {

  if (!userId) {
    return false;
  }

  const channel =
    supabaseClient.channel(
      getCallInboxName(userId)
    );

  return new Promise(
    resolve => {

      let finished = false;

      const finish =
        result => {

          if (finished) {
            return;
          }

          finished = true;

          try {
            supabaseClient.removeChannel(
              channel
            );
          } catch (_) {}

          resolve(result);

        };


      channel.subscribe(
        async status => {

          if (status !== "SUBSCRIBED") {
            return;
          }

          try {

            await channel.send({
              type: "broadcast",
              event,
              payload
            });

            setTimeout(
              () => finish(true),
              150
            );

          } catch (error) {

            console.error(
              "Call inbox send:",
              error
            );

            finish(false);

          }

        }
      );


      setTimeout(
        () => finish(false),
        5000
      );

    }
  );

}


// ======================================================
// 17. PAIR CHANNEL
// ======================================================

async function subscribeToPairChannel(
  peerId
) {

  if (!currentUser || !peerId) {
    return;
  }

  if (callPairChannel) {

    await supabaseClient.removeChannel(
      callPairChannel
    );

    callPairChannel = null;

  }

  const channelName =
    getCallPairName(
      currentUser.id,
      peerId
    );

  callPairChannel =
    supabaseClient
      .channel(channelName)

      .on(
        "broadcast",
        {
          event: "call-answer"
        },
        async payload => {

          const data =
            payload.payload;

          if (
            !data ||
            !isForCurrentUser(data)
          ) {
            return;
          }

          if (
            !peerConnection ||
            !data.answer
          ) {
            return;
          }

          try {

            await peerConnection.setRemoteDescription(
              new RTCSessionDescription(
                data.answer
              )
            );

            await flushPendingIceCandidates();

            setCallStatus(
              "Connected"
            );

          } catch (error) {

            console.error(
              "Answer error:",
              error
            );

          }

        }
      )

      .on(
        "broadcast",
        {
          event: "ice-candidate"
        },
        async payload => {

          const data =
            payload.payload;

          if (
            !data ||
            !isForCurrentUser(data) ||
            !data.candidate
          ) {
            return;
          }

          await handleRemoteIce(
            data.candidate
          );

        }
      )

      .on(
        "broadcast",
        {
          event: "call-hangup"
        },
        async payload => {

          const data =
            payload.payload;

          if (
            !data ||
            !isForCurrentUser(data)
          ) {
            return;
          }

          await cleanupCall(true);

        }
      )

      .on(
        "broadcast",
        {
          event: "call-decline"
        },
        async payload => {

          const data =
            payload.payload;

          if (
            !data ||
            !isForCurrentUser(data)
          ) {
            return;
          }

          await cleanupCall(true);

        }
      )

      .subscribe(
        status => {

          console.log(
            "Call pair:",
            status
          );

        }
      );

}


// ======================================================
// 18. CREATE PEER CONNECTION
// ======================================================

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
      rtcConfig
    );


  peerConnection.onicecandidate =
    async event => {

      if (
        !event.candidate ||
        !currentUser ||
        !peerId
      ) {
        return;
      }

      if (callPairChannel) {

        await callPairChannel.send({
          type: "broadcast",
          event: "ice-candidate",
          payload: {
            from: currentUser.id,
            to: peerId,
            candidate:
              event.candidate.toJSON()
          }
        });

      }

    };


  peerConnection.ontrack =
    event => {

      if (!remoteStream) {

        remoteStream =
          new MediaStream();

      }

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

      remoteVideo.srcObject =
        remoteStream;

      remoteVideo.play()
        .catch(() => {});

    };


  peerConnection.onconnectionstatechange =
    () => {

      if (!peerConnection) {
        return;
      }

      const state =
        peerConnection.connectionState;

      console.log(
        "WebRTC connection:",
        state
      );

      if (state === "connected") {

        setCallStatus(
          "Connected"
        );

      }

      if (
        state === "disconnected" ||
        state === "failed" ||
        state === "closed"
      ) {

        if (activeCallAccepted) {

          setCallStatus(
            "Connection lost"
          );

        }

      }

    };


  peerConnection.oniceconnectionstatechange =
    () => {

      if (!peerConnection) {
        return;
      }

      console.log(
        "ICE:",
        peerConnection.iceConnectionState
      );

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


// ======================================================
// 19. MEDIA
// ======================================================

async function getCallMedia(
  type
) {

  const constraints =
    type === "video"
      ? {
          audio: true,
          video: {
            facingMode: "user"
          }
        }
      : {
          audio: true,
          video: false
        };

  localStream =
    await navigator.mediaDevices.getUserMedia(
      constraints
    );

  remoteStream =
    new MediaStream();

  localVideo.srcObject =
    localStream;

  localVideo.play()
    .catch(() => {});

}


// ======================================================
// 20. CALL UI
// ======================================================

function setCallStatus(
  text
) {

  activeCallType.textContent =
    text;
}


function showActiveCall(
  profile,
  type
) {

  const name =
    profile?.full_name ||
    profile?.username ||
    "QEVIRA User";

  activeCallName.textContent =
    name;

  activeCallAvatar.textContent =
    getInitial(name);

  activeCallType.textContent =
    "Connecting...";

  activeCallOverlay.classList.remove(
    "hidden"
  );

  if (type === "video") {

    voiceCallDisplay.classList.add(
      "hidden"
    );

    remoteVideo.classList.remove(
      "hidden"
    );

    localVideo.classList.remove(
      "hidden"
    );

  } else {

    voiceCallDisplay.classList.remove(
      "hidden"
    );

    remoteVideo.classList.add(
      "hidden"
    );

    localVideo.classList.add(
      "hidden"
    );

  }

}


function hideActiveCall() {

  activeCallOverlay.classList.add(
    "hidden"
  );

  remoteVideo.srcObject =
    null;

  localVideo.srcObject =
    null;

}


function showIncomingCall(
  data
) {

  incomingCallName.textContent =
    data.name ||
    "QEVIRA User";

  incomingCallAvatar.textContent =
    getInitial(
      data.name
    );

  incomingCallType.textContent =
    data.type === "video"
      ? "Incoming video call"
      : "Incoming voice call";

  incomingCallOverlay.classList.remove(
    "hidden"
  );

}


function hideIncomingCall() {

  incomingCallOverlay.classList.add(
    "hidden"
  );

}


// ======================================================
// 21. START VOICE / VIDEO CALL
// ======================================================

async function startCall(
  type
) {

  if (
    !currentUser ||
    !currentChatUser
  ) {
    return;
  }

  if (activeCallPeerId) {

    alert(
      "You are already in a call."
    );

    return;
  }

  const peer =
    currentChatUser;

  activeCallPeerId =
    peer.id;

  activeCallRole =
    "caller";

  activeCallType =
    type;

  activeCallAccepted =
    false;

  isMuted = false;

  isCameraOff = false;

  try {

    await getCallMedia(
      type
    );

    await subscribeToPairChannel(
      peer.id
    );

    createPeerConnection(
      peer.id
    );

    showActiveCall(
      peer,
      type
    );

    const offer =
      await peerConnection.createOffer();

    await peerConnection.setLocalDescription(
      offer
    );

    const callData = {

      from: currentUser.id,

      to: peer.id,

      type,

      name:
        profileName.textContent ||
        currentUser.email ||
        "QEVIRA User",

      offer:
        peerConnection.localDescription

    };


    await sendToUserInbox(
      peer.id,
      "incoming-call",
      {
        from: currentUser.id,
        to: peer.id,
        type,
        name: callData.name
      }
    );


    await sendToUserInbox(
      peer.id,
      "call-offer",
      callData
    );


    setCallStatus(
      "Calling..."
    );

  } catch (error) {

    console.error(
      "Start call:",
      error
    );

    alert(
      "Could not start the call. Please check microphone/camera permission."
    );

    await cleanupCall(
      false
    );

  }

}


// ======================================================
// 22. INCOMING CALL
// ======================================================

async function handleIncomingCall(
  data
) {

  if (
    activeCallPeerId ||
    activeCallAccepted
  ) {
    return;
  }

  activeCallPeerId =
    data.from;

  activeCallRole =
    "receiver";

  activeCallType =
    data.type;

  activeCallAccepted =
    false;

  showIncomingCall(
    data
  );

}


async function handleIncomingOffer(
  data
) {

  if (!data.offer) {
    return;
  }

  if (
    activeCallPeerId &&
    String(activeCallPeerId) !==
    String(data.from)
  ) {
    return;
  }

  activeCallPeerId =
    data.from;

  activeCallRole =
    "receiver";

  activeCallType =
    data.type;

  window.pendingIncomingOffer =
    data.offer;

}


// ======================================================
// 23. ACCEPT CALL
// ======================================================

acceptCallBtn.addEventListener(
  "click",
  async () => {

    hideIncomingCall();

    if (!activeCallPeerId) {
      return;
    }

    try {

      const {
        data: profile
      } =
        await supabaseClient
          .from("profiles")
          .select("*")
          .eq(
            "id",
            activeCallPeerId
          )
          .maybeSingle();

      const peerProfile =
        profile || {
          id: activeCallPeerId,
          full_name: "QEVIRA User"
        };

      await getCallMedia(
        activeCallType
      );

      await subscribeToPairChannel(
        activeCallPeerId
      );

      createPeerConnection(
        activeCallPeerId
      );

      showActiveCall(
        peerProfile,
        activeCallType
      );

      activeCallAccepted =
        true;

      setCallStatus(
        "Connecting..."
      );


      const offer =
        window.pendingIncomingOffer;

      if (!offer) {

        setCallStatus(
          "Waiting for caller..."
        );

        return;
      }


      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(
          offer
        )
      );

      await flushPendingIceCandidates();


      const answer =
        await peerConnection.createAnswer();

      await peerConnection.setLocalDescription(
        answer
      );


      if (callPairChannel) {

        await callPairChannel.send({
          type: "broadcast",
          event: "call-answer",
          payload: {
            from: currentUser.id,
            to: activeCallPeerId,
            answer:
              peerConnection.localDescription
          }
        });

      }

      setCallStatus(
        "Connecting..."
      );

      window.pendingIncomingOffer =
        null;

    } catch (error) {

      console.error(
        "Accept call:",
        error
      );

      alert(
        "Could not accept the call. Please check your permissions."
      );

      await cleanupCall(
        true
      );

    }

  }
);


// ======================================================
// 24. DECLINE CALL
// ======================================================

declineCallBtn.addEventListener(
  "click",
  async () => {

    const peerId =
      activeCallPeerId;

    hideIncomingCall();

    if (peerId) {

      if (callPairChannel) {

        await callPairChannel.send({
          type: "broadcast",
          event: "call-decline",
          payload: {
            from: currentUser.id,
            to: peerId
          }
        });

      }

      await sendToUserInbox(
        peerId,
        "call-decline",
        {
          from: currentUser.id,
          to: peerId
        }
      );

    }

    await cleanupCall(
      false
    );

  }
);


// ======================================================
// 25. FLUSH ICE
// ======================================================

async function flushPendingIceCandidates() {

  if (
    !peerConnection ||
    !peerConnection.remoteDescription
  ) {
    return;
  }

  const candidates =
    [...pendingIceCandidates];

  pendingIceCandidates = [];

  for (
    const candidate of candidates
  ) {

    try {

      await peerConnection.addIceCandidate(
        new RTCIceCandidate(
          candidate
        )
      );

    } catch (error) {

      console.warn(
        "ICE candidate error:",
        error
      );

    }

  }

}


// ======================================================
// 26. REMOTE ICE
// ======================================================

async function handleRemoteIce(
  candidate
) {

  if (
    !peerConnection ||
    !peerConnection.remoteDescription
  ) {

    pendingIceCandidates.push(
      candidate
    );

    return;
  }

  try {

    await peerConnection.addIceCandidate(
      new RTCIceCandidate(
        candidate
      )
    );

  } catch (error) {

    console.warn(
      "Remote ICE:",
      error
    );

  }

}


// ======================================================
// 27. MUTE
// ======================================================

muteCallBtn.addEventListener(
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

    const micOn =
      muteCallBtn.querySelector(
        ".mic-on"
      );

    const micOff =
      muteCallBtn.querySelector(
        ".mic-off"
      );

    micOn.classList.toggle(
      "hidden",
      isMuted
    );

    micOff.classList.toggle(
      "hidden",
      !isMuted
    );

    muteCallBtn.classList.toggle(
      "active",
      isMuted
    );

  }
);


// ======================================================
// 28. CAMERA
// ======================================================

cameraCallBtn.addEventListener(
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

    const cameraOn =
      cameraCallBtn.querySelector(
        ".camera-on"
      );

    const cameraOff =
      cameraCallBtn.querySelector(
        ".camera-off"
      );

    cameraOn.classList.toggle(
      "hidden",
      isCameraOff
    );

    cameraOff.classList.toggle(
      "hidden",
      !isCameraOff
    );

    cameraCallBtn.classList.toggle(
      "active",
      isCameraOff
    );

  }
);


// ======================================================
// 29. SPEAKER
// ======================================================

speakerCallBtn.addEventListener(
  "click",
  () => {

    isSpeakerOn =
      !isSpeakerOn;

    try {

      remoteVideo.volume =
        isSpeakerOn
          ? 1
          : 0.7;

    } catch (_) {}

    speakerCallBtn.classList.toggle(
      "active",
      isSpeakerOn
    );

  }
);


// ======================================================
// 30. SWITCH CAMERA
// ======================================================

switchCameraBtn.addEventListener(
  "click",
  async () => {

    if (!localStream) {
      return;
    }

    const videoTracks =
      localStream.getVideoTracks();

    if (!videoTracks.length) {
      return;
    }

    const currentTrack =
      videoTracks[0];

    const settings =
      currentTrack.getSettings();

    const currentFacing =
      settings.facingMode ||
      "user";

    const nextFacing =
      currentFacing === "user"
        ? "environment"
        : "user";

    try {

      const newStream =
        await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: {
              exact: nextFacing
            }
          }
        });

      const newTrack =
        newStream.getVideoTracks()[0];

      const sender =
        peerConnection
          ?.getSenders()
          .find(
            item =>
              item.track &&
              item.track.kind === "video"
          );

      if (sender) {

        await sender.replaceTrack(
          newTrack
        );

      }

      localStream.removeTrack(
        currentTrack
      );

      currentTrack.stop();

      localStream.addTrack(
        newTrack
      );

      localVideo.srcObject =
        localStream;

    } catch (error) {

      console.warn(
        "Switch camera:",
        error
      );

    }

  }
);


// ======================================================
// 31. END CALL
// ======================================================

endCallBtn.addEventListener(
  "click",
  async () => {

    const peerId =
      activeCallPeerId;

    if (peerId) {

      try {

        if (callPairChannel) {

          await callPairChannel.send({
            type: "broadcast",
            event: "call-hangup",
            payload: {
              from: currentUser.id,
              to: peerId
            }
          });

        }

        await sendToUserInbox(
          peerId,
          "call-hangup",
          {
            from: currentUser.id,
            to: peerId
          }
        );

      } catch (error) {

        console.warn(
          "Hangup signal:",
          error
        );

      }

    }

    await cleanupCall(
      false
    );

  }
);


// ======================================================
// 32. CLEANUP CALL
// ======================================================

async function cleanupCall(
  remoteEnded = false
) {

  hideIncomingCall();

  hideActiveCall();


  if (localStream) {

    localStream
      .getTracks()
      .forEach(track => {
        try {
          track.stop();
        } catch (_) {}
      });

  }

  localStream = null;

  remoteStream = null;


  if (peerConnection) {

    try {
      peerConnection.close();
    } catch (_) {}

  }

  peerConnection = null;


  if (callPairChannel) {

    try {

      await supabaseClient.removeChannel(
        callPairChannel
      );

    } catch (_) {}

    callPairChannel = null;

  }


  pendingIceCandidates = [];

  activeCallPeerId = null;

  activeCallRole = null;

  activeCallType = null;

  activeCallAccepted = false;

  isMuted = false;

  isCameraOff = false;

  isSpeakerOn = false;

  window.pendingIncomingOffer =
    null;


  const micOn =
    muteCallBtn.querySelector(
      ".mic-on"
    );

  const micOff =
    muteCallBtn.querySelector(
      ".mic-off"
    );

  micOn.classList.remove(
    "hidden"
  );

  micOff.classList.add(
    "hidden"
  );

  muteCallBtn.classList.remove(
    "active"
  );


  const cameraOn =
    cameraCallBtn.querySelector(
      ".camera-on"
    );

  const cameraOff =
    cameraCallBtn.querySelector(
      ".camera-off"
    );

  cameraOn.classList.remove(
    "hidden"
  );

  cameraOff.classList.add(
    "hidden"
  );

  cameraCallBtn.classList.remove(
    "active"
  );

  speakerCallBtn.classList.remove(
    "active"
  );

}


// ======================================================
// 33. VOICE / VIDEO BUTTONS
// ======================================================

voiceCallBtn.addEventListener(
  "click",
  () => {

    startCall(
      "voice"
    );

  }
);


videoCallBtn.addEventListener(
  "click",
  () => {

    startCall(
      "video"
    );

  }
);


// ======================================================
// 34. NAVIGATION
// ======================================================

document
  .querySelectorAll(".nav-item")
  .forEach(button => {

    button.addEventListener(
      "click",
      async () => {

        const pageId =
          button.dataset.page;

        document
          .querySelectorAll(".page")
          .forEach(page => {
            page.classList.add(
              "hidden"
            );
          });

        const target =
          document.getElementById(
            pageId
          );

        if (target) {
          target.classList.remove(
            "hidden"
          );
        }

        document
          .querySelectorAll(".nav-item")
          .forEach(item => {
            item.classList.remove(
              "active"
            );
          });

        button.classList.add(
          "active"
        );

        if (
          pageId ===
          "contactsPage"
        ) {

          await loadContacts(
            contactsSearchInput.value
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

  });


// ======================================================
// 35. SEARCH
// ======================================================

contactsSearchInput.addEventListener(
  "input",
  () => {

    loadContacts(
      contactsSearchInput.value
    );

  }
);


// ======================================================
// 36. NEW CHAT
// ======================================================

newChatBtn.addEventListener(
  "click",
  () => {

    document
      .querySelector(
        '[data-page="contactsPage"]'
      )
      ?.click();

    setTimeout(
      () => {
        contactsSearchInput.focus();
      },
      100
    );

  }
);


// ======================================================
// 37. CHAT SEARCH
// ======================================================

searchInput.addEventListener(
  "input",
  () => {

    const term =
      searchInput.value
        .trim()
        .toLowerCase();

    document
      .querySelectorAll(
        "#chatList .user-card"
      )
      .forEach(card => {

        card.style.display =
          card.textContent
            .toLowerCase()
            .includes(term)
              ? ""
              : "none";

      });

  }
);


// ======================================================
// 38. DARK MODE
// ======================================================

function loadTheme() {

  const saved =
    localStorage.getItem(
      "qevira-theme"
    );

  if (saved === "dark") {

    document.body.classList.add(
      "dark"
    );

    darkModeBtn
      .querySelector(".icon")
      .textContent =
      "☀";

  } else {

    document.body.classList.remove(
      "dark"
    );

    darkModeBtn
      .querySelector(".icon")
      .textContent =
      "☾";

  }

}


darkModeBtn.addEventListener(
  "click",
  () => {

    const dark =
      document.body.classList.toggle(
        "dark"
      );

    localStorage.setItem(
      "qevira-theme",
      dark
        ? "dark"
        : "light"
    );

    darkModeBtn
      .querySelector(".icon")
      .textContent =
      dark
        ? "☀"
        : "☾";

  }
);


// ======================================================
// 39. LOGOUT
// ======================================================

logoutBtn.addEventListener(
  "click",
  async () => {

    await supabaseClient.auth.signOut();

  }
);


// ======================================================
// 40. START QEVIRA
// ======================================================

loadTheme();

initAuth();


// ======================================================
// DEBUG
// ======================================================

console.log(
  "QEVIRA loaded successfully."
);
