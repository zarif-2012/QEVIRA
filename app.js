
// ============================================================
// QEVIRA — REAL WEBRTC CALL ENGINE
// GitHub Pages + Supabase Realtime signaling
// Voice + Video
// ============================================================


// ============================================================
// WEBRTC CONFIG
// ============================================================

const QEVIRA_ICE_SERVERS = [
  {
    urls: "stun:stun.l.google.com:19302"
  },
  {
    urls: "stun:stun1.l.google.com:19302"
  }
];


// ============================================================
// CALL STATE
// ============================================================

let peerConnection = null;

let localStream = null;
let remoteStream = null;

let callInboxChannel = null;

let activeCallPeerId = null;
let activeCallId = null;

let activeCallRole = null;
let activeCallType = null;

let activeCallStartedAt = null;
let activeCallConnectedAt = null;

let pendingIncomingCall = null;
let pendingOffer = null;

let pendingIceCandidates = [];

let activeCallAccepted = false;
let activeCallConnected = false;
let callHistorySaved = false;

let isMuted = false;
let isCameraOff = false;


// ============================================================
// ELEMENTS
// ============================================================

const incomingCallOverlay =
  document.getElementById("incomingCallOverlay");

const incomingCallAvatar =
  document.getElementById("incomingCallAvatar");

const incomingCallName =
  document.getElementById("incomingCallName");

const incomingCallType =
  document.getElementById("incomingCallType");

const acceptCallBtn =
  document.getElementById("acceptCallBtn");

const declineCallBtn =
  document.getElementById("declineCallBtn");


const activeCallOverlay =
  document.getElementById("activeCallOverlay");

const remoteVideo =
  document.getElementById("remoteVideo");

const localVideo =
  document.getElementById("localVideo");

const activeCallAvatar =
  document.getElementById("activeCallAvatar");

const activeCallName =
  document.getElementById("activeCallName");

const activeCallStatus =
  document.getElementById("activeCallStatus");

const muteCallBtn =
  document.getElementById("muteCallBtn");

const cameraCallBtn =
  document.getElementById("cameraCallBtn");

const endCallBtn =
  document.getElementById("endCallBtn");


// ============================================================
// RANDOM CALL ID
// ============================================================

function createCallId() {

  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return (
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2)
  );
}


// ============================================================
// GET USER NAME
// ============================================================

function getCurrentUserDisplayName() {

  if (
    typeof currentProfile !== "undefined" &&
    currentProfile
  ) {

    return (
      currentProfile.display_name ||
      currentProfile.full_name ||
      currentProfile.username ||
      currentUser?.email?.split("@")[0] ||
      "QEVIRA User"
    );

  }

  return (
    currentUser?.email?.split("@")[0] ||
    "QEVIRA User"
  );
}


// ============================================================
// GET PROFILE NAME
// ============================================================

function getProfileDisplayName(profile) {

  if (!profile) {
    return "QEVIRA User";
  }

  return (
    profile.display_name ||
    profile.full_name ||
    profile.username ||
    "QEVIRA User"
  );
}


// ============================================================
// SHOW / HIDE ELEMENT
// ============================================================

function showCallElement(element) {

  if (!element) return;

  element.style.display = "flex";
}


function hideCallElement(element) {

  if (!element) return;

  element.style.display = "none";
}


// ============================================================
// SET CALL STATUS
// ============================================================

function setCallStatus(text) {

  if (activeCallStatus) {
    activeCallStatus.textContent = text;
  }
}


// ============================================================
// OPEN ACTIVE CALL UI
// ============================================================

function openActiveCallUI(profile, type, status = "Calling...") {

  if (activeCallName) {
    activeCallName.textContent =
      getProfileDisplayName(profile);
  }

  if (activeCallAvatar) {

    const avatar =
      profile?.avatar_url ||
      "";

    if (avatar) {

      activeCallAvatar.src = avatar;

    } else {

      activeCallAvatar.src =
        "https://ui-avatars.com/api/?name=" +
        encodeURIComponent(
          getProfileDisplayName(profile)
        );

    }
  }

  setCallStatus(status);

  showCallElement(activeCallOverlay);

}


// ============================================================
// CLOSE INCOMING CALL UI
// ============================================================

function closeIncomingCallUI() {

  hideCallElement(incomingCallOverlay);

}


// ============================================================
// SHOW INCOMING CALL
// ============================================================

function showIncomingCallUI(callData) {

  if (!callData) return;

  pendingIncomingCall = callData;

  if (incomingCallName) {

    incomingCallName.textContent =
      callData.callerName ||
      "QEVIRA User";

  }

  if (incomingCallType) {

    incomingCallType.textContent =
      callData.callType === "video"
        ? "Incoming Video Call"
        : "Incoming Voice Call";

  }

  if (incomingCallAvatar) {

    if (callData.callerAvatar) {

      incomingCallAvatar.src =
        callData.callerAvatar;

    } else {

      incomingCallAvatar.src =
        "https://ui-avatars.com/api/?name=" +
        encodeURIComponent(
          callData.callerName ||
          "QEVIRA User"
        );

    }
  }

  showCallElement(incomingCallOverlay);

}


// ============================================================
// CREATE WEBRTC PEER
// ============================================================

function createPeerConnection(peerId) {

  if (peerConnection) {

    try {
      peerConnection.close();
    } catch (error) {}

  }

  peerConnection =
    new RTCPeerConnection({
      iceServers: QEVIRA_ICE_SERVERS
    });


  remoteStream =
    new MediaStream();


  if (remoteVideo) {

    remoteVideo.srcObject =
      remoteStream;

  }


  peerConnection.ontrack = function(event) {

    console.log(
      "[QEVIRA] Remote track received"
    );

    event.streams[0]
      .getTracks()
      .forEach(track => {

        if (
          !remoteStream
            .getTracks()
            .some(existing =>
              existing.id === track.id
            )
        ) {

          remoteStream.addTrack(track);

        }

      });


    if (remoteVideo) {

      remoteVideo.srcObject =
        remoteStream;

      remoteVideo.play()
        .catch(() => {});

    }

  };


  peerConnection.onicecandidate =
    async function(event) {

      if (!event.candidate) {
        return;
      }

      if (!activeCallPeerId) {
        return;
      }

      await sendCallSignal(
        activeCallPeerId,
        {
          type: "ice-candidate",

          callId:
            activeCallId,

          candidate:
            event.candidate
        }
      );

    };


  peerConnection.onconnectionstatechange =
    function() {

      const state =
        peerConnection?.connectionState;

      console.log(
        "[QEVIRA] Connection state:",
        state
      );


      if (state === "connected") {

        activeCallConnected = true;

        activeCallConnectedAt =
          Date.now();

        setCallStatus(
          "Connected"
        );

      }


      if (
        state === "failed" ||
        state === "disconnected"
      ) {

        setCallStatus(
          "Connection problem..."
        );

      }


      if (state === "closed") {

        setCallStatus(
          "Call ended"
        );

      }

    };


  peerConnection.oniceconnectionstatechange =
    function() {

      console.log(
        "[QEVIRA] ICE state:",
        peerConnection?.iceConnectionState
      );

    };


  return peerConnection;

}


// ============================================================
// GET MEDIA
// ============================================================

async function getCallMedia(type) {

  if (!navigator.mediaDevices) {

    throw new Error(
      "Your browser does not support media devices."
    );

  }


  const constraints = {

    audio: true,

    video:
      type === "video"
        ? {
            facingMode: "user"
          }
        : false

  };


  const stream =
    await navigator.mediaDevices
      .getUserMedia(constraints);


  localStream = stream;


  if (localVideo) {

    localVideo.srcObject =
      localStream;

    localVideo.muted = true;

    localVideo.playsInline = true;

    localVideo.play()
      .catch(() => {});

  }


  return stream;

}


// ============================================================
// ADD LOCAL TRACKS
// ============================================================

function addLocalTracks() {

  if (!peerConnection) {
    return;
  }

  if (!localStream) {
    return;
  }


  const senders =
    peerConnection.getSenders();


  localStream
    .getTracks()
    .forEach(track => {

      const alreadyAdded =
        senders.some(
          sender =>
            sender.track &&
            sender.track.id === track.id
        );


      if (!alreadyAdded) {

        peerConnection.addTrack(
          track,
          localStream
        );

      }

    });

}


// ============================================================
// SIGNALING CHANNEL
// ============================================================

async function sendCallSignal(
  receiverId,
  payload
) {

  if (!receiverId) {
    return;
  }

  if (
    typeof supabaseClient ===
    "undefined"
  ) {

    console.error(
      "[QEVIRA] Supabase client missing."
    );

    return;

  }


  const channelName =
    `qevira-call-inbox-${receiverId}`;


  const channel =
    supabaseClient.channel(
      channelName +
      "-sender-" +
      createCallId()
    );


  return new Promise(
    async resolve => {

      let finished = false;


      const finish = () => {

        if (finished) {
          return;
        }

        finished = true;

        try {
          supabaseClient.removeChannel(
            channel
          );
        } catch (error) {}

        resolve();

      };


      channel.subscribe(
        async status => {

          console.log(
            "[QEVIRA] Signal channel:",
            status
          );


          if (status === "SUBSCRIBED") {

            try {

              await channel.send({

                type: "broadcast",

                event: "call-signal",

                payload

              });

            } catch (error) {

              console.error(
                "[QEVIRA] Signal send error:",
                error
              );

            }


            setTimeout(
              finish,
              100
            );

          }


          if (status === "CHANNEL_ERROR") {

            console.error(
              "[QEVIRA] Signal channel error"
            );

            finish();

          }


          if (status === "TIMED_OUT") {

            console.error(
              "[QEVIRA] Signal timeout"
            );

            finish();

          }

        }
      );

    }
  );

}


// ============================================================
// SETUP CALL INBOX
// ============================================================

async function setupCallInbox() {

  if (
    typeof supabaseClient ===
    "undefined"
  ) {
    return;
  }


  if (
    typeof currentUser ===
    "undefined" ||
    !currentUser
  ) {
    return;
  }


  if (callInboxChannel) {

    try {

      await supabaseClient.removeChannel(
        callInboxChannel
      );

    } catch (error) {}

  }


  const channelName =
    `qevira-call-inbox-${currentUser.id}`;


  callInboxChannel =
    supabaseClient.channel(
      channelName
    );


  callInboxChannel.on(

    "broadcast",

    {
      event: "call-signal"
    },

    async ({ payload }) => {

      try {

        await handleCallSignal(
          payload
        );

      } catch (error) {

        console.error(
          "[QEVIRA] Signal handling error:",
          error
        );

      }

    }

  );


  callInboxChannel.subscribe(
    status => {

      console.log(
        "[QEVIRA] Call inbox:",
        status
      );

    }
  );

}


// ============================================================
// HANDLE SIGNAL
// ============================================================

async function handleCallSignal(data) {

  if (!data) {
    return;
  }


  const type =
    data.type;


  console.log(
    "[QEVIRA] Incoming signal:",
    type
  );


  // ----------------------------------------------------------
  // INCOMING CALL
  // ----------------------------------------------------------

  if (type === "incoming-call") {

    pendingIncomingCall =
      data;


    activeCallPeerId =
      data.callerId;


    activeCallId =
      data.callId;


    activeCallType =
      data.callType;


    showIncomingCallUI(
      data
    );


    return;
  }


  // ----------------------------------------------------------
  // CALL OFFER
  // ----------------------------------------------------------

  if (type === "call-offer") {

    console.log(
      "[QEVIRA] Offer received"
    );


    if (
      activeCallId &&
      data.callId &&
      activeCallId !== data.callId
    ) {

      console.log(
        "[QEVIRA] Ignoring offer from another call."
      );

      return;

    }


    pendingOffer =
      data.offer;


    if (
      data.callId
    ) {

      activeCallId =
        data.callId;

    }


    if (
      data.senderId
    ) {

      activeCallPeerId =
        data.senderId;

    }


    /*
     * IMPORTANT:
     *
     * We don't immediately create an answer here
     * unless the user has accepted the call.
     *
     * The offer is saved so ACCEPT can process it.
     */


    if (
      activeCallAccepted &&
      activeCallRole === "receiver"
    ) {

      await processPendingOffer();

    }


    return;
  }


  // ----------------------------------------------------------
  // CALL ANSWER
  // ----------------------------------------------------------

  if (type === "call-answer") {

    console.log(
      "[QEVIRA] Answer received"
    );


    if (!peerConnection) {

      console.warn(
        "[QEVIRA] No peer connection for answer."
      );

      return;

    }


    if (
      activeCallId &&
      data.callId &&
      activeCallId !== data.callId
    ) {

      return;

    }


    try {

      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(
          data.answer
        )
      );


      console.log(
        "[QEVIRA] Remote answer applied."
      );


      await flushPendingIceCandidates();


      setCallStatus(
        "Connecting..."
      );

    } catch (error) {

      console.error(
        "[QEVIRA] Failed to apply answer:",
        error
      );

    }


    return;
  }


  // ----------------------------------------------------------
  // ICE CANDIDATE
  // ----------------------------------------------------------

  if (type === "ice-candidate") {

    if (!data.candidate) {
      return;
    }


    /*
     * ICE can arrive BEFORE remoteDescription.
     *
     * Therefore queue it.
     */

    if (
      !peerConnection ||
      !peerConnection.remoteDescription
    ) {

      pendingIceCandidates.push(
        data.candidate
      );

      return;

    }


    try {

      await peerConnection.addIceCandidate(
        new RTCIceCandidate(
          data.candidate
        )
      );

    } catch (error) {

      console.error(
        "[QEVIRA] ICE candidate error:",
        error
      );

    }


    return;
  }


  // ----------------------------------------------------------
  // CALL DECLINED
  // ----------------------------------------------------------

  if (type === "call-decline") {

    if (
      activeCallId &&
      data.callId &&
      activeCallId !== data.callId
    ) {

      return;

    }


    setCallStatus(
      "Call declined"
    );


    await saveOutgoingCallHistory(
      "declined"
    );


    setTimeout(
      () => cleanupCall(false),
      700
    );


    return;
  }


  // ----------------------------------------------------------
  // CALL HANGUP
  // ----------------------------------------------------------

  if (type === "call-hangup") {

    if (
      activeCallId &&
      data.callId &&
      activeCallId !== data.callId
    ) {

      return;

    }


    setCallStatus(
      "Call ended"
    );


    await saveOutgoingCallHistory(
      activeCallConnected
        ? "completed"
        : "cancelled"
    );


    setTimeout(
      () => cleanupCall(false),
      500
    );


    return;
  }

}


// ============================================================
// PROCESS OFFER
// ============================================================

async function processPendingOffer() {

  if (!pendingOffer) {
    return;
  }


  if (
    !peerConnection
  ) {

    return;

  }


  if (
    !activeCallAccepted
  ) {

    return;

  }


  try {

    console.log(
      "[QEVIRA] Processing offer..."
    );


    await peerConnection.setRemoteDescription(

      new RTCSessionDescription(
        pendingOffer
      )

    );


    console.log(
      "[QEVIRA] Remote offer applied."
    );


    await flushPendingIceCandidates();


    const answer =
      await peerConnection.createAnswer();


    await peerConnection.setLocalDescription(
      answer
    );


    console.log(
      "[QEVIRA] Answer created."
    );


    await sendCallSignal(
      activeCallPeerId,
      {

        type:
          "call-answer",

        senderId:
          currentUser.id,

        callId:
          activeCallId,

        answer:
          peerConnection.localDescription

      }
    );


    console.log(
      "[QEVIRA] Answer sent."
    );


    pendingOffer =
      null;


    setCallStatus(
      "Connecting..."
    );

  } catch (error) {

    console.error(
      "[QEVIRA] Failed to process offer:",
      error
    );


    setCallStatus(
      "Call connection failed"
    );

  }

}


// ============================================================
// FLUSH ICE
// ============================================================

async function flushPendingIceCandidates() {

  if (
    !peerConnection ||
    !peerConnection.remoteDescription
  ) {

    return;

  }


  if (
    pendingIceCandidates.length === 0
  ) {

    return;

  }


  const candidates =
    [...pendingIceCandidates];


  pendingIceCandidates =
    [];


  for (
    const candidate
    of candidates
  ) {

    try {

      await peerConnection.addIceCandidate(
        new RTCIceCandidate(
          candidate
        )
      );

    } catch (error) {

      console.error(
        "[QEVIRA] Queued ICE error:",
        error
      );

    }

  }

}


// ============================================================
// START OUTGOING CALL
// ============================================================

async function startQeviraCall(
  peerId,
  type = "voice",
  profile = null
) {

  if (!currentUser) {

    alert(
      "Please login to QEVIRA first."
    );

    return;

  }


  if (!peerId) {

    console.error(
      "[QEVIRA] No peer ID."
    );

    return;

  }


  if (peerId === currentUser.id) {

    alert(
      "You cannot call yourself."
    );

    return;

  }


  if (peerConnection) {

    console.warn(
      "[QEVIRA] Already in a call."
    );

    return;

  }


  try {

    activeCallPeerId =
      peerId;

    activeCallId =
      createCallId();

    activeCallRole =
      "caller";

    activeCallType =
      type;

    activeCallAccepted =
      true;

    activeCallConnected =
      false;

    activeCallStartedAt =
      Date.now();

    activeCallConnectedAt =
      null;

    callHistorySaved =
      false;


    openActiveCallUI(
      profile,
      type,
      "Calling..."
    );


    /*
     * STEP 1
     * Get microphone/camera.
     */

    await getCallMedia(
      type
    );


    /*
     * STEP 2
     * Create PeerConnection.
     */

    createPeerConnection(
      peerId
    );


    /*
     * STEP 3
     * Add local audio/video.
     */

    addLocalTracks();


    /*
     * STEP 4
     * Create WebRTC offer.
     */

    const offer =
      await peerConnection.createOffer();


    /*
     * STEP 5
     * Set local description.
     */

    await peerConnection.setLocalDescription(
      offer
    );


    /*
     * STEP 6
     * Tell receiver that a call is coming.
     */

    await sendCallSignal(
      peerId,
      {

        type:
          "incoming-call",

        callerId:
          currentUser.id,

        callerName:
          getCurrentUserDisplayName(),

        callerAvatar:
          currentProfile?.avatar_url ||
          null,

        callType:
          type,

        callId:
          activeCallId

      }
    );


    /*
     * Small delay helps ensure the receiver
     * has already processed the incoming-call event.
     */

    await new Promise(
      resolve =>
        setTimeout(
          resolve,
          200
        )
    );


    /*
     * STEP 7
     * Send actual WebRTC offer.
     */

    await sendCallSignal(
      peerId,
      {

        type:
          "call-offer",

        senderId:
          currentUser.id,

        callId:
          activeCallId,

        offer:
          peerConnection.localDescription

      }
    );


    /*
     * Send offer one more time shortly afterward.
     *
     * This helps when mobile network timing causes
     * the first broadcast to arrive too early.
     */

    setTimeout(
      async () => {

        if (
          peerConnection &&
          activeCallPeerId === peerId &&
          activeCallId
        ) {

          try {

            await sendCallSignal(
              peerId,
              {

                type:
                  "call-offer",

                senderId:
                  currentUser.id,

                callId:
                  activeCallId,

                offer:
                  peerConnection.localDescription

              }
            );

          } catch (error) {

            console.error(
              "[QEVIRA] Offer retry failed:",
              error
            );

          }

        }

      },
      1000
    );


  } catch (error) {

    console.error(
      "[QEVIRA] Call failed:",
      error
    );


    alert(
      "Unable to start the call.\n\n" +
      "Please allow microphone/camera permission and try again."
    );


    cleanupCall(
      false
    );

  }

}


// ============================================================
// ACCEPT INCOMING CALL
// ============================================================

async function acceptQeviraCall() {

  if (
    !pendingIncomingCall
  ) {

    return;

  }


  const call =
    pendingIncomingCall;


  try {

    closeIncomingCallUI();


    activeCallPeerId =
      call.callerId;

    activeCallId =
      call.callId;

    activeCallRole =
      "receiver";

    activeCallType =
      call.callType ||
      "voice";

    activeCallAccepted =
      true;

    activeCallConnected =
      false;

    activeCallStartedAt =
      Date.now();

    activeCallConnectedAt =
      null;

    callHistorySaved =
      false;


    openActiveCallUI(
      {
        display_name:
          call.callerName,

        full_name:
          call.callerName,

        avatar_url:
          call.callerAvatar

      },

      activeCallType,

      "Connecting..."
    );


    /*
     * STEP 1
     * Get receiver's microphone/camera.
     */

    await getCallMedia(
      activeCallType
    );


    /*
     * STEP 2
     * Create peer connection.
     */

    createPeerConnection(
      activeCallPeerId
    );


    /*
     * STEP 3
     * Add local tracks.
     */

    addLocalTracks();


    /*
     * The caller's offer may have already arrived.
     *
     * If it has, createAnswer().
     */

    if (pendingOffer) {

      await processPendingOffer();

    } else {

      setCallStatus(
        "Waiting for caller..."
      );

    }


  } catch (error) {

    console.error(
      "[QEVIRA] Accept call failed:",
      error
    );


    await sendCallSignal(
      call.callerId,
      {

        type:
          "call-decline",

        senderId:
          currentUser.id,

        callId:
          call.callId

      }
    );


    cleanupCall(
      false
    );


    alert(
      "Microphone/camera permission is required for calls."
    );

  }


  pendingIncomingCall =
    null;

}


// ============================================================
// DECLINE INCOMING CALL
// ============================================================

async function declineQeviraCall() {

  const call =
    pendingIncomingCall;


  if (!call) {

    closeIncomingCallUI();

    return;

  }


  try {

    await sendCallSignal(
      call.callerId,
      {

        type:
          "call-decline",

        senderId:
          currentUser.id,

        callId:
          call.callId

      }
    );

  } catch (error) {

    console.error(
      "[QEVIRA] Decline error:",
      error
    );

  }


  pendingIncomingCall =
    null;

  pendingOffer =
    null;

  closeIncomingCallUI();

}


// ============================================================
// END CALL
// ============================================================

async function endQeviraCall() {

  const peerId =
    activeCallPeerId;

  const callId =
    activeCallId;


  if (
    peerId &&
    callId
  ) {

    try {

      await sendCallSignal(
        peerId,
        {

          type:
            "call-hangup",

          senderId:
            currentUser.id,

          callId

        }
      );

    } catch (error) {

      console.error(
        "[QEVIRA] Hangup signal error:",
        error
      );

    }

  }


  await saveOutgoingCallHistory(
    activeCallConnected
      ? "completed"
      : "cancelled"
  );


  cleanupCall(
    false
  );

}


// ============================================================
// SAVE OUTGOING CALL HISTORY
// ============================================================

async function saveOutgoingCallHistory(
  status
) {

  if (callHistorySaved) {
    return;
  }


  if (
    typeof supabaseClient ===
    "undefined"
  ) {

    return;

  }


  if (!currentUser) {
    return;
  }


  if (
    !activeCallPeerId ||
    !activeCallType
  ) {

    return;

  }


  /*
   * Your call_history table allows the caller
   * to insert the record.
   */

  if (
    activeCallRole !== "caller"
  ) {

    return;

  }


  callHistorySaved =
    true;


  const endedAt =
    new Date();


  const startedAt =
    activeCallStartedAt
      ? new Date(activeCallStartedAt)
      : endedAt;


  const durationSeconds =
    activeCallConnectedAt
      ? Math.max(
          0,
          Math.floor(
            (
              Date.now() -
              activeCallConnectedAt
            ) /
            1000
          )
        )
      : 0;


  try {

    const { error } =
      await supabaseClient
        .from("call_history")
        .insert({

          caller_id:
            currentUser.id,

          receiver_id:
            activeCallPeerId,

          call_type:
            activeCallType,

          direction:
            "outgoing",

          status:
            status,

          started_at:
            startedAt.toISOString(),

          ended_at:
            endedAt.toISOString(),

          duration_seconds:
            durationSeconds

        });


    if (error) {

      /*
       * History failure must NOT break
       * the actual call.
       */

      console.warn(
        "[QEVIRA] Call history:",
        error.message
      );

    }

  } catch (error) {

    console.warn(
      "[QEVIRA] Call history exception:",
      error
    );

  }

}


// ============================================================
// MUTE / UNMUTE
// ============================================================

function toggleQeviraMute() {

  if (!localStream) {
    return;
  }


  const audioTracks =
    localStream.getAudioTracks();


  if (
    audioTracks.length === 0
  ) {

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


  if (muteCallBtn) {

    muteCallBtn.textContent =
      isMuted
        ? "🔇"
        : "🎙️";

  }


  setCallStatus(
    isMuted
      ? "Muted"
      : activeCallConnected
        ? "Connected"
        : "Connecting..."
  );

}


// ============================================================
// CAMERA ON/OFF
// ============================================================

function toggleQeviraCamera() {

  if (!localStream) {
    return;
  }


  const videoTracks =
    localStream.getVideoTracks();


  if (
    videoTracks.length === 0
  ) {

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


  if (cameraCallBtn) {

    cameraCallBtn.textContent =
      isCameraOff
        ? "📷"
        : "🎥";

  }

}


// ============================================================
// CLEANUP CALL
// ============================================================

async function cleanupCall(
  saveHistory = true
) {

  if (
    saveHistory &&
    activeCallRole === "caller"
  ) {

    await saveOutgoingCallHistory(
      activeCallConnected
        ? "completed"
        : "cancelled"
    );

  }


  /*
   * Stop local microphone/camera.
   */

  if (localStream) {

    localStream
      .getTracks()
      .forEach(
        track => {

          try {
            track.stop();
          } catch (error) {}

        }
      );

  }


  /*
   * Stop remote tracks.
   */

  if (remoteStream) {

    remoteStream
      .getTracks()
      .forEach(
        track => {

          try {
            track.stop();
          } catch (error) {}

        }
      );

  }


  /*
   * Close PeerConnection.
   */

  if (peerConnection) {

    try {

      peerConnection.ontrack =
        null;

      peerConnection.onicecandidate =
        null;

      peerConnection.close();

    } catch (error) {}

  }


  peerConnection =
    null;


  if (localVideo) {

    localVideo.srcObject =
      null;

  }


  if (remoteVideo) {

    remoteVideo.srcObject =
      null;

  }


  localStream =
    null;

  remoteStream =
    null;


  pendingIceCandidates =
    [];

  pendingOffer =
    null;

  pendingIncomingCall =
    null;


  activeCallPeerId =
    null;

  activeCallId =
    null;

  activeCallRole =
    null;

  activeCallType =
    null;

  activeCallStartedAt =
    null;

  activeCallConnectedAt =
    null;


  activeCallAccepted =
    false;

  activeCallConnected =
    false;

  callHistorySaved =
    false;


  isMuted =
    false;

  isCameraOff =
    false;


  closeIncomingCallUI();


  hideCallElement(
    activeCallOverlay
  );


}


// ============================================================
// BUTTON EVENTS
// ============================================================

if (acceptCallBtn) {

  acceptCallBtn.addEventListener(
    "click",
    acceptQeviraCall
  );

}


if (declineCallBtn) {

  declineCallBtn.addEventListener(
    "click",
    declineQeviraCall
  );

}


if (endCallBtn) {

  endCallBtn.addEventListener(
    "click",
    endQeviraCall
  );

}


if (muteCallBtn) {

  muteCallBtn.addEventListener(
    "click",
    toggleQeviraMute
  );

}


if (cameraCallBtn) {

  cameraCallBtn.addEventListener(
    "click",
    toggleQeviraCamera
  );

}


// ============================================================
// CONNECT YOUR EXISTING CHAT CALL BUTTONS
// ============================================================

/*
 * Your existing chat UI should call:
 *
 * startQeviraCall(userId, "voice", profile)
 *
 * or:
 *
 * startQeviraCall(userId, "video", profile)
 *
 *
 * If your existing functions are named:
 *
 * startVoiceCall()
 * startVideoCall()
 *
 * connect them to the engine below.
 */


window.startQeviraCall =
  startQeviraCall;


window.acceptQeviraCall =
  acceptQeviraCall;


window.declineQeviraCall =
  declineQeviraCall;


window.endQeviraCall =
  endQeviraCall;


// ============================================================
// RESTART CALL INBOX WHEN USER LOGS IN
// ============================================================

async function initializeQeviraCalling() {

  if (
    typeof currentUser ===
    "undefined" ||
    !currentUser
  ) {

    return;

  }


  console.log(
    "[QEVIRA] Initializing real WebRTC calling..."
  );


  await setupCallInbox();


  console.log(
    "[QEVIRA] WebRTC calling ready."
  );

}


// ============================================================
// EXPORT
// ============================================================

window.initializeQeviraCalling =
  initializeQeviraCalling;


// ============================================================
// IMPORTANT:
// CALL initializeQeviraCalling() AFTER LOGIN
// ============================================================
