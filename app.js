// ======================================================
// QEVIRA
// REAL SUPABASE AUTH + REAL 1-TO-1 MESSAGING
// REAL WEBRTC VOICE + VIDEO CALLING
// ======================================================


// ======================================================
// 1. SUPABASE CONFIG
// ======================================================

const SUPABASE_URL =
  "https://wcdywnkxtuexjbjgerzd.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_bD3ajWNbZPoUw4uUwYhK3w_P-iZIAhw";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );


// ======================================================
// 2. STATE
// ======================================================

let currentUser = null;
let currentProfile = null;
let currentChatUser = null;

let realtimeChannel = null;


// ======================================================
// CALL STATE
// ======================================================

let callInboxChannel = null;
let callPairChannel = null;

let peerConnection = null;

let localStream = null;
let remoteStream = null;

let isVideoCall = false;
let isCallMuted = false;
let isCameraOff = false;

let incomingOffer = null;
let incomingCaller = null;

let pendingIceCandidates = [];

let activeCallPeerId = null;
let activeCallRole = null;


// ======================================================
// 3. DOM HELPER
// ======================================================

const $ = id => document.getElementById(id);


// ======================================================
// 4. AUTH UI
// ======================================================

let authMode = "signup";


function showLogin() {

  authMode = "login";

  $("signupForm").classList.add("hidden");
  $("loginForm").classList.remove("hidden");

  $("authSubtitle").textContent =
    "Welcome back";

  $("switchText").textContent =
    "Don't have an account?";

  $("switchAuthBtn").textContent =
    "Sign up";

  $("authMessage").textContent = "";
}


function showSignup() {

  authMode = "signup";

  $("loginForm").classList.add("hidden");
  $("signupForm").classList.remove("hidden");

  $("authSubtitle").textContent =
    "Create your account";

  $("switchText").textContent =
    "Already have an account?";

  $("switchAuthBtn").textContent =
    "Login";

  $("authMessage").textContent = "";
}


$("switchAuthBtn").addEventListener(
  "click",
  () => {

    if (authMode === "signup") {
      showLogin();
    } else {
      showSignup();
    }

  }
);


// ======================================================
// 5. SIGN UP
// ======================================================

async function signUp() {

  const email =
    $("signupEmail").value.trim();

  const password =
    $("signupPassword").value;

  $("authMessage").textContent =
    "Creating account...";

  if (!email) {

    $("authMessage").textContent =
      "Please enter your email.";

    return;
  }

  if (password.length < 6) {

    $("authMessage").textContent =
      "Password must be at least 6 characters.";

    return;
  }


  const { data, error } =
    await supabaseClient.auth.signUp({
      email,
      password
    });


  if (error) {

    $("authMessage").textContent =
      error.message;

    return;
  }


  if (data.user) {

    $("authMessage").textContent =
      "Account created. Check your email if confirmation is required.";

  }

}


$("signupForm").addEventListener(
  "submit",
  event => {

    event.preventDefault();

    signUp();

  }
);


// ======================================================
// 6. LOGIN
// ======================================================

async function signInWithPassword() {

  const email =
    $("loginEmail").value.trim();

  const password =
    $("loginPassword").value;

  $("authMessage").textContent =
    "Logging in...";


  const { data, error } =
    await supabaseClient.auth.signInWithPassword({
      email,
      password
    });


  if (error) {

    $("authMessage").textContent =
      error.message;

    return;
  }


  currentUser =
    data.user;

  await showApp();

}


$("loginForm").addEventListener(
  "submit",
  event => {

    event.preventDefault();

    signInWithPassword();

  }
);


// ======================================================
// 7. SHOW APP
// ======================================================

async function showApp() {

  if (!currentUser) return;

  $("authScreen").classList.add("hidden");
  $("app").classList.remove("hidden");

  $("currentUserEmail").textContent =
    currentUser.email || "";

  $("profileEmail").textContent =
    currentUser.email || "";


  await loadCurrentProfile();

  await loadContacts();

  await loadChatList();

  setupRealtime();

  await setupCallChannel();

}


// ======================================================
// 8. PROFILE
// ======================================================

async function loadCurrentProfile() {

  if (!currentUser) return;


  const { data, error } =
    await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .maybeSingle();


  if (error) {

    console.log(
      "Profile loading error:",
      error.message
    );

    return;
  }


  currentProfile = data;


  if (!data) return;


  const name =
    data.display_name ||
    "QEVIRA User";


  const username =
    data.username ||
    "user";


  $("profileName").textContent =
    name;

  $("profileUsername").textContent =
    "@" + username;


  $("profileAvatar").textContent =
    name.charAt(0).toUpperCase();

}


// ======================================================
// 9. CONTACTS
// ======================================================

let allContacts = [];


async function loadContacts() {

  if (!currentUser) return;


  const { data, error } =
    await supabaseClient
      .from("profiles")
      .select("*")
      .neq("id", currentUser.id)
      .order("display_name", {
        ascending: true
      });


  if (error) {

    console.log(
      "Contacts error:",
      error.message
    );

    return;
  }


  allContacts =
    data || [];

  renderContacts(
    allContacts
  );

}


function renderContacts(users) {

  const list =
    $("contactsList");

  list.innerHTML = "";


  if (!users.length) {

    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">👥</div>
        <h3>No contacts yet</h3>
        <p>Other QEVIRA users will appear here.</p>
      </div>
    `;

    return;
  }


  users.forEach(user => {

    const element =
      createUserElement(user);

    list.appendChild(element);

  });

}


function createUserElement(user) {

  const div =
    document.createElement("div");

  div.className =
    "user-card";


  const name =
    user.display_name ||
    user.username ||
    "QEVIRA User";


  const username =
    user.username ||
    "user";


  const firstLetter =
    name.charAt(0).toUpperCase();


  div.innerHTML = `
    <div class="avatar">
      ${escapeHtml(firstLetter)}
    </div>

    <div class="user-info">
      <strong>
        ${escapeHtml(name)}
      </strong>

      <small>
        @${escapeHtml(username)}
      </small>
    </div>

    <button
      class="chat-open-btn"
      type="button"
    >
      Chat
    </button>
  `;


  div
    .querySelector(".chat-open-btn")
    .addEventListener(
      "click",
      () => openChat(user)
    );


  return div;

}


// ======================================================
// CONTACT SEARCH
// ======================================================

$("contactsSearchInput").addEventListener(
  "input",
  () => {

    const query =
      $("contactsSearchInput")
        .value
        .trim()
        .toLowerCase();


    const filtered =
      allContacts.filter(user => {

        const name =
          (
            user.display_name ||
            ""
          ).toLowerCase();

        const username =
          (
            user.username ||
            ""
          ).toLowerCase();


        return (
          name.includes(query) ||
          username.includes(query)
        );

      });


    renderContacts(
      filtered
    );

  }
);


// ======================================================
// 10. CHAT LIST
// ======================================================

let chatUsers = [];


async function loadChatList() {

  if (!currentUser) return;


  const { data, error } =
    await supabaseClient
      .from("messages")
      .select(
        "sender_id,receiver_id,created_at"
      )
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

    console.log(
      "Chat list error:",
      error.message
    );

    return;
  }


  const ids = [];


  (data || []).forEach(
    message => {

      const otherId =
        message.sender_id === currentUser.id
          ? message.receiver_id
          : message.sender_id;


      if (
        otherId &&
        !ids.includes(otherId)
      ) {

        ids.push(otherId);

      }

    }
  );


  if (!ids.length) {

    chatUsers = [];

    renderChatList();

    return;
  }


  const { data: profiles } =
    await supabaseClient
      .from("profiles")
      .select("*")
      .in("id", ids);


  chatUsers =
    profiles || [];


  renderChatList();

}


function renderChatList() {

  const list =
    $("chatList");

  list.innerHTML = "";


  const empty =
    $("chatEmpty");


  if (!chatUsers.length) {

    empty.classList.remove(
      "hidden"
    );

    return;
  }


  empty.classList.add(
    "hidden"
  );


  chatUsers.forEach(
    user => {

      list.appendChild(
        createUserElement(user)
      );

    }
  );

}


// ======================================================
// CHAT SEARCH
// ======================================================

$("searchInput").addEventListener(
  "input",
  () => {

    const query =
      $("searchInput")
        .value
        .trim()
        .toLowerCase();


    const filtered =
      chatUsers.filter(user => {

        const name =
          (
            user.display_name ||
            ""
          ).toLowerCase();

        const username =
          (
            user.username ||
            ""
          ).toLowerCase();


        return (
          name.includes(query) ||
          username.includes(query)
        );

      });


    const list =
      $("chatList");

    list.innerHTML = "";


    filtered.forEach(
      user => {

        list.appendChild(
          createUserElement(user)
        );

      }
    );

  }
);


// ======================================================
// 11. OPEN CHAT
// ======================================================

async function openChat(user) {

  currentChatUser =
    user;


  const name =
    user.display_name ||
    user.username ||
    "QEVIRA User";


  $("chatTitle").textContent =
    name;


  $("chatAvatar").textContent =
    name.charAt(0).toUpperCase();


  $("chatModal")
    .classList
    .remove("hidden");


  await loadMessages();

}


// ======================================================
// NEW CHAT
// ======================================================

$("newChatBtn").addEventListener(
  "click",
  () => {

    document
      .querySelector(
        '[data-page="contactsPage"]'
      )
      .click();

    $("contactsSearchInput")
      .focus();

  }
);


// ======================================================
// 12. LOAD MESSAGES
// ======================================================

async function loadMessages() {

  if (
    !currentUser ||
    !currentChatUser
  ) {
    return;
  }


  const { data, error } =
    await supabaseClient
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${currentUser.id},receiver_id.eq.${currentChatUser.id}),and(sender_id.eq.${currentChatUser.id},receiver_id.eq.${currentUser.id})`
      )
      .order(
        "created_at",
        {
          ascending: true
        }
      );


  if (error) {

    console.log(
      "Messages error:",
      error.message
    );

    return;
  }


  renderMessages(
    data || []
  );

}


// ======================================================
// 13. RENDER MESSAGES
// ======================================================

function renderMessages(messages) {

  const container =
    $("messages");

  container.innerHTML = "";


  messages.forEach(
    message => {

      const sent =
        message.sender_id ===
        currentUser.id;


      const wrapper =
        document.createElement("div");


      wrapper.className =
        "message " +
        (
          sent
            ? "sent"
            : "received"
        );


      const bubble =
        document.createElement("div");


      bubble.className =
        "message-bubble";


      bubble.innerHTML = `
        ${escapeHtml(
          message.body || ""
        )}

        <span class="message-time">
          ${formatTime(
            message.created_at
          )}
        </span>
      `;


      wrapper.appendChild(
        bubble
      );

      container.appendChild(
        wrapper
      );

    }
  );


  container.scrollTop =
    container.scrollHeight;

}


// ======================================================
// 14. SEND MESSAGE
// ======================================================

async function sendMessage() {

  const body =
    $("messageInput")
      .value
      .trim();


  if (
    !body ||
    !currentUser ||
    !currentChatUser
  ) {
    return;
  }


  $("messageInput").value =
    "";


  const { error } =
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

    console.log(
      "Send message error:",
      error.message
    );

    $("messageInput").value =
      body;

  }

}


$("messageForm").addEventListener(
  "submit",
  event => {

    event.preventDefault();

    sendMessage();

  }
);


// ======================================================
// 15. REALTIME CHAT
// ======================================================

function setupRealtime() {

  if (
    realtimeChannel &&
    currentUser
  ) {

    supabaseClient
      .removeChannel(
        realtimeChannel
      );

  }


  realtimeChannel =
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
        async payload => {

          const message =
            payload.new;


          if (
            !message ||
            !currentUser
          ) {
            return;
          }


          if (
            currentChatUser &&
            (
              (
                message.sender_id ===
                currentUser.id &&
                message.receiver_id ===
                currentChatUser.id
              ) ||
              (
                message.sender_id ===
                currentChatUser.id &&
                message.receiver_id ===
                currentUser.id
              )
            )
          ) {

            await loadMessages();

          }


          await loadChatList();

        }
      )
      .subscribe();

}


// ======================================================
// 16. CLOSE CHAT
// ======================================================

$("closeChatModal").addEventListener(
  "click",
  () => {

    $("chatModal")
      .classList
      .add("hidden");

    currentChatUser =
      null;

  }
);


// ======================================================
// 17. LOGOUT
// ======================================================

$("logoutBtn").addEventListener(
  "click",
  async () => {

    await endCall(
      false
    );

    if (callInboxChannel) {

      await supabaseClient
        .removeChannel(
          callInboxChannel
        );

      callInboxChannel =
        null;

    }

    await supabaseClient
      .auth
      .signOut();

    currentUser =
      null;

    location.reload();

  }
);


// ======================================================
// 18. WEBRTC CONFIG
// ======================================================

const rtcConfiguration = {

  iceServers: [

    {
      urls:
        "stun:stun.l.google.com:19302"
    },

    {
      urls:
        "stun:stun1.l.google.com:19302"
    }

  ]

};


// ======================================================
// 19. CALL CHANNEL NAMES
// ======================================================

function getCallInboxName(
  userId
) {

  return (
    "qevira-call-inbox-" +
    userId
  );

}


function getCallPairName(
  userA,
  userB
) {

  const ids = [
    userA,
    userB
  ].sort();


  return (
    "qevira-call-" +
    ids[0] +
    "-" +
    ids[1]
  );

}


// ======================================================
// 20. CALL INBOX
// ======================================================

async function setupCallChannel() {

  if (!currentUser) {
    return;
  }


  if (callInboxChannel) {

    await supabaseClient
      .removeChannel(
        callInboxChannel
      );

    callInboxChannel =
      null;

  }


  callInboxChannel =
    supabaseClient
      .channel(
        getCallInboxName(
          currentUser.id
        )
      );


  callInboxChannel
    .on(
      "broadcast",
      {
        event:
          "incoming-call"
      },
      async event => {

        const data =
          event.payload;


        if (!data) {
          return;
        }


        if (
          data.receiverId !==
          currentUser.id
        ) {
          return;
        }


        if (
          data.callerId ===
          currentUser.id
        ) {
          return;
        }


        incomingCaller =
          data;


        showIncomingCall(
          data
        );

      }
    )
    .on(
      "broadcast",
      {
        event:
          "call-offer"
      },
      async event => {

        const data =
          event.payload;


        if (!data) {
          return;
        }


        if (
          data.receiverId !==
          currentUser.id
        ) {
          return;
        }


        if (
          data.callerId ===
          currentUser.id
        ) {
          return;
        }


        incomingOffer =
          data;


        if (!incomingCaller) {

          incomingCaller =
            data;

          showIncomingCall(
            data
          );

        }

      }
    )
    .on(
      "broadcast",
      {
        event:
          "call-hangup"
      },
      async event => {

        const data =
          event.payload;


        if (
          data?.receiverId !==
          currentUser.id
        ) {
          return;
        }


        await endCall(
          false
        );

      }
    )
    .on(
      "broadcast",
      {
        event:
          "call-decline"
      },
      async event => {

        const data =
          event.payload;


        if (
          data?.receiverId !==
          currentUser.id
        ) {
          return;
        }


        await endCall(
          false
        );

        alert(
          "The call was declined."
        );

      }
    );


  return new Promise(
    resolve => {

      callInboxChannel.subscribe(
        status => {

          if (
            status ===
            "SUBSCRIBED"
          ) {

            console.log(
              "QEVIRA call inbox connected."
            );

            resolve(
              callInboxChannel
            );

          }

        }
      );

    }
  );

}


// ======================================================
// 21. ACTIVE PAIR CHANNEL
// ======================================================

async function subscribeToPairChannel(
  otherUserId
) {

  if (
    !currentUser ||
    !otherUserId
  ) {
    return null;
  }


  if (callPairChannel) {

    await supabaseClient
      .removeChannel(
        callPairChannel
      );

    callPairChannel =
      null;

  }


  const channelName =
    getCallPairName(
      currentUser.id,
      otherUserId
    );


  callPairChannel =
    supabaseClient
      .channel(
        channelName
      );


  callPairChannel
    .on(
      "broadcast",
      {
        event:
          "call-answer"
      },
      async event => {

        const data =
          event.payload;


        if (
          !isForCurrentUser(
            data
          )
        ) {
          return;
        }


        await handleCallAnswer(
          data
        );

      }
    )
    .on(
      "broadcast",
      {
        event:
          "ice-candidate"
      },
      async event => {

        const data =
          event.payload;


        if (
          !isForCurrentUser(
            data
          )
        ) {
          return;
        }


        await handleIceCandidate(
          data
        );

      }
    )
    .on(
      "broadcast",
      {
        event:
          "call-hangup"
      },
      async event => {

        const data =
          event.payload;


        if (
          !isForCurrentUser(
            data
          )
        ) {
          return;
        }


        await endCall(
          false
        );

      }
    )
    .on(
      "broadcast",
      {
        event:
          "call-decline"
      },
      async event => {

        const data =
          event.payload;


        if (
          !isForCurrentUser(
            data
          )
        ) {
          return;
        }


        await endCall(
          false
        );

        alert(
          "The call was declined."
        );

      }
    );


  return new Promise(
    resolve => {

      callPairChannel.subscribe(
        status => {

          if (
            status ===
            "SUBSCRIBED"
          ) {

            console.log(
              "QEVIRA call pair connected."
            );

            resolve(
              callPairChannel
            );

          }

        }
      );

    }
  );

}


// ======================================================
// 22. PAYLOAD CHECK
// ======================================================

function isForCurrentUser(
  data
) {

  if (!data) {
    return false;
  }


  if (
    data.receiverId &&
    data.receiverId !==
    currentUser.id
  ) {
    return false;
  }


  if (
    data.senderId &&
    data.senderId ===
    currentUser.id
  ) {
    return false;
  }


  return true;

}


// ======================================================
// 23. SEND TO USER INBOX
// ======================================================

async function sendToUserInbox(
  userId,
  event,
  payload
) {

  const temporaryChannel =
    supabaseClient.channel(
      getCallInboxName(
        userId
      )
    );


  return new Promise(
    resolve => {

      temporaryChannel.subscribe(
        async status => {

          if (
            status !==
            "SUBSCRIBED"
          ) {
            return;
          }


          try {

            await temporaryChannel.send({

              type:
                "broadcast",

              event,

              payload

            });

          } catch (error) {

            console.log(
              "Call inbox send error:",
              error
            );

          }


          setTimeout(
            async () => {

              await supabaseClient
                .removeChannel(
                  temporaryChannel
                );

              resolve();

            },
            200
          );

        }
      );

    }
  );

}


// ======================================================
// 24. VOICE CALL BUTTON
// ======================================================

$("voiceCallBtn").addEventListener(
  "click",
  () => startCall(false)
);


// ======================================================
// 25. VIDEO CALL BUTTON
// ======================================================

$("videoCallBtn").addEventListener(
  "click",
  () => startCall(true)
);


// ======================================================
// 26. START CALL
// ======================================================

async function startCall(
  video
) {

  if (
    !currentUser ||
    !currentChatUser
  ) {
    return;
  }


  if (
    peerConnection ||
    activeCallPeerId
  ) {

    alert(
      "A call is already active."
    );

    return;
  }


  isVideoCall =
    video;

  activeCallPeerId =
    currentChatUser.id;

  activeCallRole =
    "caller";

  pendingIceCandidates =
    [];


  try {

    localStream =
      await navigator.mediaDevices
        .getUserMedia({

          audio: true,

          video: video

        });

  } catch (error) {

    activeCallPeerId =
      null;

    activeCallRole =
      null;

    alert(
      "Microphone/camera permission was not granted."
    );

    console.log(
      "Media permission error:",
      error
    );

    return;

  }


  await subscribeToPairChannel(
    currentChatUser.id
  );


  createPeerConnection();


  localStream
    .getTracks()
    .forEach(
      track => {

        peerConnection.addTrack(
          track,
          localStream
        );

      }
    );


  const offer =
    await peerConnection
      .createOffer();


  await peerConnection
    .setLocalDescription(
      offer
    );


  const callData = {

    callerId:
      currentUser.id,

    senderId:
      currentUser.id,

    receiverId:
      currentChatUser.id,

    callerName:
      currentProfile?.display_name ||
      currentProfile?.username ||
      currentUser.email,

    callType:
      video
        ? "video"
        : "voice"

  };


  await sendToUserInbox(
    currentChatUser.id,
    "incoming-call",
    callData
  );


  await sendToUserInbox(
    currentChatUser.id,
    "call-offer",
    {

      ...callData,

      offer

    }
  );


  showActiveCall(
    currentChatUser,
    video
  );

}


// ======================================================
// 27. CREATE PEER CONNECTION
// ======================================================

function createPeerConnection() {

  if (peerConnection) {

    peerConnection.close();

  }


  peerConnection =
    new RTCPeerConnection(
      rtcConfiguration
    );


  remoteStream =
    new MediaStream();


  $("remoteVideo").srcObject =
    remoteStream;


  peerConnection.ontrack =
    event => {

      const tracks =
        event.streams?.[0]
          ?.getTracks() || [];


      tracks.forEach(
        track => {

          if (
            !remoteStream
              .getTracks()
              .includes(track)
          ) {

            remoteStream.addTrack(
              track
            );

          }

        }
      );


      $("remoteVideo")
        .play()
        .catch(
          () => {}
        );

    };


  peerConnection.onicecandidate =
    async event => {

      if (
        !event.candidate ||
        !activeCallPeerId
      ) {
        return;
      }


      const payload = {

        senderId:
          currentUser.id,

        receiverId:
          activeCallPeerId,

        candidate:
          event.candidate

      };


      if (callPairChannel) {

        try {

          await callPairChannel.send({

            type:
              "broadcast",

            event:
              "ice-candidate",

            payload

          });

        } catch (error) {

          console.log(
            "ICE send error:",
            error
          );

        }

      }

    };


  peerConnection.onconnectionstatechange =
    () => {

      if (!peerConnection) {
        return;
      }


      const state =
        peerConnection.connectionState;


      console.log(
        "WebRTC connection state:",
        state
      );


      if (
        state === "failed" ||
        state === "closed"
      ) {

        endCall(
          false
        );

      }

    };

}


// ======================================================
// 28. HANDLE ANSWER
// ======================================================

async function handleCallAnswer(
  data
) {

  if (
    !peerConnection ||
    !data?.answer
  ) {
    return;
  }


  try {

    await peerConnection
      .setRemoteDescription(
        new RTCSessionDescription(
          data.answer
        )
      );


    await flushPendingIceCandidates();

  } catch (error) {

    console.log(
      "Answer error:",
      error
    );

  }

}


// ======================================================
// 29. HANDLE ICE
// ======================================================

async function handleIceCandidate(
  data
) {

  if (
    !data?.candidate
  ) {
    return;
  }


  const candidate =
    new RTCIceCandidate(
      data.candidate
    );


  if (
    peerConnection &&
    peerConnection.remoteDescription
  ) {

    try {

      await peerConnection
        .addIceCandidate(
          candidate
        );

    } catch (error) {

      console.log(
        "ICE candidate error:",
        error
      );

    }

  } else {

    pendingIceCandidates.push(
      candidate
    );

  }

}


// ======================================================
// 30. FLUSH ICE
// ======================================================

async function flushPendingIceCandidates() {

  if (
    !peerConnection ||
    !peerConnection.remoteDescription
  ) {
    return;
  }


  const candidates =
    pendingIceCandidates;


  pendingIceCandidates =
    [];


  for (
    const candidate of candidates
  ) {

    try {

      await peerConnection
        .addIceCandidate(
          candidate
        );

    } catch (error) {

      console.log(
        "Queued ICE error:",
        error
      );

    }

  }

}


// ======================================================
// 31. INCOMING CALL UI
// ======================================================

function showIncomingCall(
  data
) {

  if (
    peerConnection ||
    activeCallPeerId
  ) {
    return;
  }


  const name =
    data.callerName ||
    "QEVIRA User";


  $("incomingCallName")
    .textContent =
    name;


  $("incomingCallType")
    .textContent =
    data.callType ===
    "video"
      ? "Incoming video call"
      : "Incoming voice call";


  $("incomingCallAvatar")
    .textContent =
    name
      .charAt(0)
      .toUpperCase();


  $("incomingCallOverlay")
    .classList
    .remove("hidden");

}


// ======================================================
// 32. ACCEPT CALL
// ======================================================

$("acceptCallBtn").addEventListener(
  "click",
  acceptIncomingCall
);


async function acceptIncomingCall() {

  if (
    !incomingCaller ||
    !incomingOffer
  ) {

    $("incomingCallOverlay")
      .classList
      .add("hidden");

    return;
  }


  $("incomingCallOverlay")
    .classList
    .add("hidden");


  const callerId =
    incomingCaller.callerId;


  if (!callerId) {
    return;
  }


  isVideoCall =
    incomingOffer.callType ===
    "video";


  activeCallPeerId =
    callerId;

  activeCallRole =
    "callee";

  pendingIceCandidates =
    [];


  const callerProfile =
    allContacts.find(
      user =>
        user.id ===
        callerId
    );


  currentChatUser =
    callerProfile || {

      id:
        callerId,

      display_name:
        incomingCaller.callerName ||
        "QEVIRA User"

    };


  try {

    localStream =
      await navigator.mediaDevices
        .getUserMedia({

          audio: true,

          video: isVideoCall

        });

  } catch (error) {

    alert(
      "Microphone/camera permission was not granted."
    );

    activeCallPeerId =
      null;

    activeCallRole =
      null;

    incomingOffer =
      null;

    incomingCaller =
      null;

    return;

  }


  await subscribeToPairChannel(
    callerId
  );


  createPeerConnection();


  localStream
    .getTracks()
    .forEach(
      track => {

        peerConnection.addTrack(
          track,
          localStream
        );

      }
    );


  try {

    await peerConnection
      .setRemoteDescription(

        new RTCSessionDescription(
          incomingOffer.offer
        )

      );


    await flushPendingIceCandidates();


    const answer =
      await peerConnection
        .createAnswer();


    await peerConnection
      .setLocalDescription(
        answer
      );


    if (callPairChannel) {

      await callPairChannel.send({

        type:
          "broadcast",

        event:
          "call-answer",

        payload: {

          senderId:
            currentUser.id,

          receiverId:
            callerId,

          answer

        }

      });

    }


    showActiveCall(
      currentChatUser,
      isVideoCall
    );


    incomingOffer =
      null;

    incomingCaller =
      null;

  } catch (error) {

    console.log(
      "Accept call error:",
      error
    );

    await endCall(
      false
    );

  }

}


// ======================================================
// 33. DECLINE CALL
// ======================================================

$("declineCallBtn").addEventListener(
  "click",
  async () => {

    $("incomingCallOverlay")
      .classList
      .add("hidden");


    if (
      incomingCaller?.callerId
    ) {

      const callerId =
        incomingCaller.callerId;


      const payload = {

        senderId:
          currentUser.id,

        receiverId:
          callerId

      };


      try {

        const channel =
          supabaseClient.channel(
            getCallPairName(
              currentUser.id,
              callerId
            )
          );


        channel.subscribe(
          async status => {

            if (
              status !==
              "SUBSCRIBED"
            ) {
              return;
            }


            await channel.send({

              type:
                "broadcast",

              event:
                "call-decline",

              payload

            });


            setTimeout(
              async () => {

                await supabaseClient
                  .removeChannel(
                    channel
                  );

              },
              200
            );

          }
        );

      } catch (error) {

        console.log(
          "Decline error:",
          error
        );

      }


      await sendToUserInbox(
        callerId,
        "call-decline",
        payload
      );

    }


    incomingOffer =
      null;

    incomingCaller =
      null;

  }
);


// ======================================================
// 34. ACTIVE CALL SCREEN
// ======================================================

function showActiveCall(
  user,
  video
) {

  const name =
    user.display_name ||
    user.username ||
    "QEVIRA User";


  $("activeCallName")
    .textContent =
    name;


  $("activeCallAvatar")
    .textContent =
    name
      .charAt(0)
      .toUpperCase();


  $("activeCallType")
    .textContent =
    video
      ? "Video call"
      : "Voice call";


  $("activeCallOverlay")
    .classList
    .remove("hidden");


  $("localVideo").srcObject =
    localStream;


  if (video) {

    $("remoteVideo")
      .classList
      .remove("hidden");

    $("localVideo")
      .classList
      .remove("hidden");

    $("voiceCallDisplay")
      .classList
      .add("hidden");

  } else {

    $("remoteVideo")
      .classList
      .add("hidden");

    $("localVideo")
      .classList
      .add("hidden");

    $("voiceCallDisplay")
      .classList
      .remove("hidden");

  }

}


// ======================================================
// 35. MUTE
// ======================================================

$("muteCallBtn").addEventListener(
  "click",
  () => {

    if (!localStream) {
      return;
    }


    const audioTracks =
      localStream.getAudioTracks();


    audioTracks.forEach(
      track => {

        track.enabled =
          !track.enabled;

      }
    );


    isCallMuted =
      !isCallMuted;


    $("muteCallBtn")
      .textContent =
      isCallMuted
        ? "🔇"
        : "🎤";

  }
);


// ======================================================
// 36. CAMERA
// ======================================================

$("cameraCallBtn").addEventListener(
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


    videoTracks.forEach(
      track => {

        track.enabled =
          !track.enabled;

      }
    );


    isCameraOff =
      !isCameraOff;


    $("cameraCallBtn")
      .textContent =
      isCameraOff
        ? "🚫"
        : "📹";

  }
);


// ======================================================
// 37. END CALL
// ======================================================

$("endCallBtn").addEventListener(
  "click",
  () => endCall(true)
);


async function endCall(
  sendSignal = true
) {

  const peerId =
    activeCallPeerId;


  if (
    sendSignal &&
    peerId &&
    currentUser
  ) {

    const payload = {

      senderId:
        currentUser.id,

      receiverId:
        peerId

    };


    if (callPairChannel) {

      try {

        await callPairChannel.send({

          type:
            "broadcast",

          event:
            "call-hangup",

          payload

        });

      } catch (error) {

        console.log(
          "Hangup send error:",
          error
        );

      }

    }


    try {

      await sendToUserInbox(
        peerId,
        "call-hangup",
        payload
      );

    } catch (error) {

      console.log(
        "Inbox hangup error:",
        error
      );

    }

  }


  if (peerConnection) {

    peerConnection.ontrack =
      null;

    peerConnection.onicecandidate =
      null;

    peerConnection.onconnectionstatechange =
      null;

    peerConnection.close();

    peerConnection =
      null;

  }


  if (localStream) {

    localStream
      .getTracks()
      .forEach(
        track => {

          track.stop();

        }
      );

    localStream =
      null;

  }


  if (remoteStream) {

    remoteStream
      .getTracks()
      .forEach(
        track => {

          track.stop();

        }
      );

    remoteStream =
      null;

  }


  $("localVideo").srcObject =
    null;

  $("remoteVideo").srcObject =
    null;


  $("activeCallOverlay")
    .classList
    .add("hidden");

  $("incomingCallOverlay")
    .classList
    .add("hidden");


  incomingOffer =
    null;

  incomingCaller =
    null;

  pendingIceCandidates =
    [];


  activeCallPeerId =
    null;

  activeCallRole =
    null;


  isVideoCall =
    false;

  isCallMuted =
    false;

  isCameraOff =
    false;


  $("muteCallBtn")
    .textContent =
    "🎤";

  $("cameraCallBtn")
    .textContent =
    "📹";


  if (callPairChannel) {

    await supabaseClient
      .removeChannel(
        callPairChannel
      );

    callPairChannel =
      null;

  }

}


// ======================================================
// 38. ESCAPE HTML
// ======================================================

function escapeHtml(
  value
) {

  return String(value)
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );

}


// ======================================================
// 39. FORMAT TIME
// ======================================================

function formatTime(
  date
) {

  if (!date) {
    return "";
  }


  try {

    return new Date(date)
      .toLocaleTimeString(
        [],
        {
          hour: "2-digit",
          minute: "2-digit"
        }
      );

  } catch {

    return "";

  }

}


// ======================================================
// 40. AUTH STATE
// ======================================================

supabaseClient.auth.onAuthStateChange(
  async (
    event,
    session
  ) => {

    if (session?.user) {

      currentUser =
        session.user;


      if (
        $("authScreen")
          .classList
          .contains("hidden")
      ) {

        return;

      }


      await showApp();

    } else {

      currentUser =
        null;


      if (callInboxChannel) {

        await supabaseClient
          .removeChannel(
            callInboxChannel
          );

        callInboxChannel =
          null;

      }


      $("authScreen")
        .classList
        .remove("hidden");

      $("app")
        .classList
        .add("hidden");

    }

  }
);


// ======================================================
// 41. CHECK SESSION
// ======================================================

async function checkSession() {

  const {
    data: {
      session
    }
  } =
    await supabaseClient
      .auth
      .getSession();


  if (session?.user) {

    currentUser =
      session.user;

    await showApp();

  } else {

    showSignup();

  }

}


// ======================================================
// 42. START QEVIRA
// ======================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    checkSession();

  }
);
