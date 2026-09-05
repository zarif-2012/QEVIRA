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


// ======================================================
// PASTE YOUR EXISTING PUBLISHABLE KEY BETWEEN THE QUOTES
// ======================================================

const SUPABASE_PUBLISHABLE_KEY =
  "PASTE_YOUR_EXISTING_PUBLISHABLE_KEY_HERE";


// ======================================================

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


// CALL STATE

let callChannel = null;
let peerConnection = null;

let localStream = null;
let remoteStream = null;

let isVideoCall = false;
let isCallMuted = false;
let isCameraOff = false;

let incomingOffer = null;
let incomingCaller = null;


// ======================================================
// 3. DOM HELPERS
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


  currentUser = data.user;

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

  setupCallChannel();

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


  allContacts = data || [];

  renderContacts(allContacts);

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

const contactsSearchInput =
  $("contactsSearchInput");


contactsSearchInput.addEventListener(
  "input",
  () => {

    const query =
      contactsSearchInput.value
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


    renderContacts(filtered);

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


  (data || []).forEach(message => {

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

  });


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

    empty.classList.remove("hidden");

    return;
  }


  empty.classList.add("hidden");


  chatUsers.forEach(user => {

    list.appendChild(
      createUserElement(user)
    );

  });

}


// ======================================================
// CHAT SEARCH
// ======================================================

$("searchInput").addEventListener(
  "input",
  () => {

    const query =
      $("searchInput").value
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


    filtered.forEach(user => {

      list.appendChild(
        createUserElement(user)
      );

    });

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


  $("chatModal").classList.remove(
    "hidden"
  );


  await loadMessages();

}


// ======================================================
// NEW CHAT
// ======================================================

$("newChatBtn").addEventListener(
  "click",
  () => {

    document.querySelector(
      '[data-page="contactsPage"]'
    ).click();

    $("contactsSearchInput").focus();

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


  renderMessages(data || []);

}


// ======================================================
// 13. RENDER MESSAGES
// ======================================================

function renderMessages(messages) {

  const container =
    $("messages");

  container.innerHTML = "";


  messages.forEach(message => {

    const sent =
      message.sender_id === currentUser.id;


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
      ${escapeHtml(message.body || "")}
      <span class="message-time">
        ${formatTime(message.created_at)}
      </span>
    `;


    wrapper.appendChild(bubble);

    container.appendChild(wrapper);

  });


  container.scrollTop =
    container.scrollHeight;

}


// ======================================================
// 14. SEND MESSAGE
// ======================================================

async function sendMessage() {

  const body =
    $("messageInput").value.trim();


  if (
    !body ||
    !currentUser ||
    !currentChatUser
  ) {
    return;
  }


  $("messageInput").value = "";


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

  if (realtimeChannel) {

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

    $("chatModal").classList.add(
      "hidden"
    );

    currentChatUser = null;

  }
);


// ======================================================
// 17. LOGOUT
// ======================================================

$("logoutBtn").addEventListener(
  "click",
  async () => {

    await endCall(false);

    await supabaseClient.auth.signOut();

    currentUser = null;

    location.reload();

  }
);


// ======================================================
// ======================================================
// REAL VOICE + VIDEO CALLING
// ======================================================
// ======================================================


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
// 19. CALL CHANNEL
// ======================================================

function getCallChannelName(
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


function setupCallChannel() {

  if (!currentUser) return;


  if (callChannel) {

    supabaseClient
      .removeChannel(
        callChannel
      );

  }


  callChannel =
    supabaseClient
      .channel(
        getCallChannelName(
          currentUser.id,
          currentUser.id
        )
      );

}


// ======================================================
// 20. CREATE CALL CHANNEL FOR USER
// ======================================================

function subscribeToCallChannel(
  otherUserId,
  callback
) {

  if (callChannel) {

    supabaseClient
      .removeChannel(
        callChannel
      );

  }


  callChannel =
    supabaseClient
      .channel(
        getCallChannelName(
          currentUser.id,
          otherUserId
        )
      );


  callChannel
    .on(
      "broadcast",
      {
        event: "call-offer"
      },
      payload => {

        callback(
          "offer",
          payload.payload
        );

      }
    )
    .on(
      "broadcast",
      {
        event: "call-answer"
      },
      payload => {

        callback(
          "answer",
          payload.payload
        );

      }
    )
    .on(
      "broadcast",
      {
        event: "ice-candidate"
      },
      payload => {

        callback(
          "ice",
          payload.payload
        );

      }
    )
    .on(
      "broadcast",
      {
        event: "incoming-call"
      },
      payload => {

        callback(
          "incoming",
          payload.payload
        );

      }
    )
    .on(
      "broadcast",
      {
        event: "call-hangup"
      },
      payload => {

        callback(
          "hangup",
          payload.payload
        );

      }
    )
    .on(
      "broadcast",
      {
        event: "call-decline"
      },
      payload => {

        callback(
          "decline",
          payload.payload
        );

      }
    );


  return new Promise(resolve => {

    callChannel.subscribe(
      status => {

        if (status === "SUBSCRIBED") {

          resolve(callChannel);

        }

      }
    );

  });

}


// ======================================================
// 21. START VOICE CALL
// ======================================================

$("voiceCallBtn").addEventListener(
  "click",
  () => startCall(false)
);


// ======================================================
// 22. START VIDEO CALL
// ======================================================

$("videoCallBtn").addEventListener(
  "click",
  () => startCall(true)
);


// ======================================================
// 23. START CALL
// ======================================================

async function startCall(video) {

  if (
    !currentUser ||
    !currentChatUser
  ) {
    return;
  }


  if (peerConnection) {

    alert(
      "A call is already active."
    );

    return;

  }


  isVideoCall =
    video;


  try {

    localStream =
      await navigator.mediaDevices.getUserMedia({

        audio: true,

        video: video

      });


  } catch (error) {

    alert(
      "Microphone/camera permission was not granted."
    );

    console.log(error);

    return;

  }


  await subscribeToCallChannel(
    currentChatUser.id,
    handleCallSignal
  );


  createPeerConnection();


  localStream
    .getTracks()
    .forEach(track => {

      peerConnection.addTrack(
        track,
        localStream
      );

    });


  const offer =
    await peerConnection.createOffer();


  await peerConnection.setLocalDescription(
    offer
  );


  await callChannel.send({

    type: "broadcast",

    event: "incoming-call",

    payload: {

      callerId:
        currentUser.id,

      callerName:
        currentProfile?.display_name ||
        currentProfile?.username ||
        currentUser.email,

      callType:
        video
          ? "video"
          : "voice"

    }

  });


  await callChannel.send({

    type: "broadcast",

    event: "call-offer",

    payload: {

      callerId:
        currentUser.id,

      offer,

      callType:
        video
          ? "video"
          : "voice"

    }

  });


  showActiveCall(
    currentChatUser,
    video
  );

}


// ======================================================
// 24. CREATE PEER CONNECTION
// ======================================================

function createPeerConnection() {

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

      event.streams[0]
        .getTracks()
        .forEach(track => {

          remoteStream.addTrack(
            track
          );

        });

      $("remoteVideo").play()
        .catch(() => {});

    };


  peerConnection.onicecandidate =
    async event => {

      if (
        !event.candidate ||
        !callChannel
      ) {
        return;
      }


      await callChannel.send({

        type: "broadcast",

        event: "ice-candidate",

        payload: {

          candidate:
            event.candidate

        }

      });

    };


  peerConnection.onconnectionstatechange =
    () => {

      const state =
        peerConnection.connectionState;


      if (
        state === "failed" ||
        state === "disconnected" ||
        state === "closed"
      ) {

        endCall(false);

      }

    };

}


// ======================================================
// 25. CALL SIGNAL HANDLER
// ======================================================

async function handleCallSignal(
  type,
  data
) {

  if (type === "incoming") {

    incomingCaller =
      data;


    showIncomingCall(
      data
    );


    return;
  }


  if (type === "offer") {

    incomingOffer =
      data;


    return;
  }


  if (type === "answer") {

    if (!peerConnection) {
      return;
    }


    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(
        data.answer
      )
    );


    return;
  }


  if (type === "ice") {

    if (
      peerConnection &&
      data.candidate
    ) {

      try {

        await peerConnection.addIceCandidate(
          new RTCIceCandidate(
            data.candidate
          )
        );

      } catch (error) {

        console.log(
          "ICE error:",
          error
        );

      }

    }

    return;
  }


  if (type === "hangup") {

    await endCall(false);

    return;
  }


  if (type === "decline") {

    await endCall(false);

    alert(
      "The call was declined."
    );

  }

}


// ======================================================
// 26. INCOMING CALL UI
// ======================================================

function showIncomingCall(data) {

  const name =
    data.callerName ||
    "QEVIRA User";


  $("incomingCallName").textContent =
    name;


  $("incomingCallType").textContent =
    data.callType === "video"
      ? "Incoming video call"
      : "Incoming voice call";


  $("incomingCallAvatar").textContent =
    name.charAt(0).toUpperCase();


  $("incomingCallOverlay")
    .classList.remove("hidden");

}


// ======================================================
// 27. ACCEPT CALL
// ======================================================

$("acceptCallBtn").addEventListener(
  "click",
  acceptIncomingCall
);


async function acceptIncomingCall() {

  $("incomingCallOverlay")
    .classList.add("hidden");


  if (
    !incomingOffer ||
    !incomingCaller
  ) {
    return;
  }


  isVideoCall =
    incomingOffer.callType ===
    "video";


  const callerProfile =
    allContacts.find(
      user =>
        user.id ===
        incomingCaller.callerId
    );


  currentChatUser =
    callerProfile || {

      id:
        incomingCaller.callerId,

      display_name:
        incomingCaller.callerName

    };


  try {

    localStream =
      await navigator.mediaDevices.getUserMedia({

        audio: true,

        video: isVideoCall

      });

  } catch (error) {

    alert(
      "Microphone/camera permission was not granted."
    );

    incomingOffer = null;
    incomingCaller = null;

    return;

  }


  await subscribeToCallChannel(
    incomingCaller.callerId,
    handleCallSignal
  );


  createPeerConnection();


  localStream
    .getTracks()
    .forEach(track => {

      peerConnection.addTrack(
        track,
        localStream
      );

    });


  await peerConnection.setRemoteDescription(

    new RTCSessionDescription(
      incomingOffer.offer
    )

  );


  const answer =
    await peerConnection.createAnswer();


  await peerConnection.setLocalDescription(
    answer
  );


  await callChannel.send({

    type: "broadcast",

    event: "call-answer",

    payload: {

      answer

    }

  });


  showActiveCall(
    currentChatUser,
    isVideoCall
  );


  incomingOffer = null;
  incomingCaller = null;

}


// ======================================================
// 28. DECLINE CALL
// ======================================================

$("declineCallBtn").addEventListener(
  "click",
  async () => {

    $("incomingCallOverlay")
      .classList.add("hidden");


    if (
      incomingCaller
    ) {

      await subscribeToCallChannel(
        incomingCaller.callerId,
        handleCallSignal
      );


      await callChannel.send({

        type: "broadcast",

        event: "call-decline",

        payload: {

          userId:
            currentUser.id

        }

      });

    }


    incomingOffer = null;
    incomingCaller = null;

  }
);


// ======================================================
// 29. ACTIVE CALL SCREEN
// ======================================================

function showActiveCall(
  user,
  video
) {

  const name =
    user.display_name ||
    user.username ||
    "QEVIRA User";


  $("activeCallName").textContent =
    name;


  $("activeCallAvatar").textContent =
    name.charAt(0).toUpperCase();


  $("activeCallType").textContent =
    video
      ? "Video call"
      : "Voice call";


  $("activeCallOverlay")
    .classList.remove("hidden");


  $("localVideo").srcObject =
    localStream;


  if (video) {

    $("remoteVideo")
      .classList.remove("hidden");

    $("localVideo")
      .classList.remove("hidden");

    $("voiceCallDisplay")
      .classList.add("hidden");

  } else {

    $("remoteVideo")
      .classList.add("hidden");

    $("localVideo")
      .classList.add("hidden");

    $("voiceCallDisplay")
      .classList.remove("hidden");

  }

}


// ======================================================
// 30. MUTE
// ======================================================

$("muteCallBtn").addEventListener(
  "click",
  () => {

    if (!localStream) return;


    const audioTracks =
      localStream.getAudioTracks();


    audioTracks.forEach(track => {

      track.enabled =
        !track.enabled;

    });


    isCallMuted =
      !isCallMuted;


    $("muteCallBtn").textContent =
      isCallMuted
        ? "🔇"
        : "🎤";

  }
);


// ======================================================
// 31. CAMERA
// ======================================================

$("cameraCallBtn").addEventListener(
  "click",
  () => {

    if (!localStream) return;


    const videoTracks =
      localStream.getVideoTracks();


    if (!videoTracks.length) {
      return;
    }


    videoTracks.forEach(track => {

      track.enabled =
        !track.enabled;

    });


    isCameraOff =
      !isCameraOff;


    $("cameraCallBtn").textContent =
      isCameraOff
        ? "🚫"
        : "📹";

  }
);


// ======================================================
// 32. END CALL
// ======================================================

$("endCallBtn").addEventListener(
  "click",
  () => endCall(true)
);


async function endCall(sendSignal = true) {

  if (
    sendSignal &&
    callChannel
  ) {

    try {

      await callChannel.send({

        type: "broadcast",

        event: "call-hangup",

        payload: {

          userId:
            currentUser?.id

        }

      });

    } catch (error) {

      console.log(error);

    }

  }


  if (peerConnection) {

    peerConnection.close();

    peerConnection = null;

  }


  if (localStream) {

    localStream
      .getTracks()
      .forEach(track => {

        track.stop();

      });

    localStream = null;

  }


  if (remoteStream) {

    remoteStream
      .getTracks()
      .forEach(track => {

        track.stop();

      });

    remoteStream = null;

  }


  $("localVideo").srcObject =
    null;

  $("remoteVideo").srcObject =
    null;


  $("activeCallOverlay")
    .classList.add("hidden");


  $("incomingCallOverlay")
    .classList.add("hidden");


  incomingOffer = null;
  incomingCaller = null;

  isVideoCall = false;
  isCallMuted = false;
  isCameraOff = false;


  $("muteCallBtn").textContent =
    "🎤";

  $("cameraCallBtn").textContent =
    "📹";


  if (callChannel) {

    await supabaseClient
      .removeChannel(
        callChannel
      );

    callChannel = null;

  }

}


// ======================================================
// 33. ESCAPE HTML
// ======================================================

function escapeHtml(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


// ======================================================
// 34. FORMAT TIME
// ======================================================

function formatTime(date) {

  if (!date) return "";


  try {

    return new Date(date)
      .toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });

  } catch {

    return "";

  }

}


// ======================================================
// 35. AUTH STATE
// ======================================================

supabaseClient.auth.onAuthStateChange(
  async (event, session) => {

    if (session?.user) {

      currentUser =
        session.user;


      if (
        document
          .getElementById("authScreen")
          .classList
          .contains("hidden")
      ) {

        return;

      }


      await showApp();

    } else {

      currentUser = null;

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
// 36. CHECK SESSION
// ======================================================

async function checkSession() {

  const {
    data: {
      session
    }
  } =
    await supabaseClient.auth.getSession();


  if (session?.user) {

    currentUser =
      session.user;

    await showApp();

  } else {

    showSignup();

  }

}


// ======================================================
// 37. START QEVIRA
// ======================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    checkSession();

  }
);
