const users = [
  {
    id: 1,
    name: "Alex",
    letter: "A",
    status: "online",
    last: "Hey! Welcome to QEVIRA 👋"
  },
  {
    id: 2,
    name: "Maya",
    letter: "M",
    status: "online",
    last: "See you tomorrow!"
  },
  {
    id: 3,
    name: "Arun",
    letter: "R",
    status: "offline",
    last: "That sounds great."
  },
  {
    id: 4,
    name: "Sara",
    letter: "S",
    status: "online",
    last: "Thanks 😊"
  }
];

let messages = JSON.parse(
  localStorage.getItem("qeviraMessages") || "{}"
);

let currentUser = null;


/* SAVE */

function saveMessages() {
  localStorage.setItem(
    "qeviraMessages",
    JSON.stringify(messages)
  );
}


/* CHAT LIST */

function showChats(search = "") {

  const list = document.getElementById("chatList");

  list.innerHTML = "";

  users
    .filter(user =>
      user.name.toLowerCase().includes(search.toLowerCase())
    )
    .forEach(user => {

      const userMessages = messages[user.id] || [];

      const lastMessage =
        userMessages.length > 0
          ? userMessages[userMessages.length - 1].text
          : user.last;

      list.innerHTML += `
        <div class="chat" onclick="openChat(${user.id})">

          <div class="avatar">
            ${user.letter}
          </div>

          <div class="info">
            <strong>${user.name}</strong>
            <p>${escapeHTML(lastMessage)}</p>
          </div>

        </div>
      `;
    });
}


/* CONTACTS */

function showContacts(search = "") {

  const list = document.getElementById("contactsList");

  list.innerHTML = "";

  users
    .filter(user =>
      user.name.toLowerCase().includes(search.toLowerCase())
    )
    .forEach(user => {

      list.innerHTML += `
        <div class="contact"
             onclick="openChat(${user.id})">

          <div class="avatar">
            ${user.letter}
          </div>

          <div class="info">
            <strong>${user.name}</strong>
            <p>${user.status}</p>
          </div>

        </div>
      `;
    });
}


/* OPEN CHAT */

function openChat(id) {

  currentUser = users.find(user => user.id === id);

  document.getElementById("chatName").textContent =
    currentUser.name;

  document.getElementById("chatAvatar").textContent =
    currentUser.letter;

  document.getElementById("chatStatus").textContent =
    currentUser.status;

  document.getElementById("chatBox").style.display =
    "flex";

  showMessages();
}


/* CLOSE CHAT */

document.getElementById("close").onclick = function () {

  document.getElementById("chatBox").style.display =
    "none";
};


/* SHOW MESSAGES */

function showMessages() {

  const box = document.getElementById("messages");

  box.innerHTML = "";

  const chatMessages =
    messages[currentUser.id] || [];

  chatMessages.forEach(msg => {

    box.innerHTML += `
      <div class="message ${msg.me ? "me" : ""}">

        ${escapeHTML(msg.text)}

        <small>${msg.time}</small>

      </div>
    `;
  });

  box.scrollTop = box.scrollHeight;
}


/* SEND MESSAGE */

document.getElementById("messageForm").onsubmit =
  function (event) {

    event.preventDefault();

    const input =
      document.getElementById("message");

    const text = input.value.trim();

    if (!text) return;

    if (!messages[currentUser.id]) {
      messages[currentUser.id] = [];
    }

    messages[currentUser.id].push({

      text: text,

      me: true,

      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      })

    });

    saveMessages();

    input.value = "";

    showMessages();

    showChats();
  };


/* SEARCH */

document.getElementById("search").oninput =
  function () {
    showChats(this.value);
  };


document.getElementById("contactSearch").oninput =
  function () {
    showContacts(this.value);
  };


/* NAVIGATION */

document.querySelectorAll(".nav").forEach(button => {

  button.onclick = function () {

    document.querySelectorAll(".nav")
      .forEach(btn =>
        btn.classList.remove("active")
      );

    this.classList.add("active");

    document.querySelectorAll(".screen")
      .forEach(screen =>
        screen.classList.remove("active")
      );

    document
      .getElementById(this.dataset.screen)
      .classList.add("active");
  };

});


/* DARK MODE */

document.getElementById("theme").onclick =
  function () {

    document.body.classList.toggle("dark");

    localStorage.setItem(
      "qeviraDark",
      document.body.classList.contains("dark")
    );
  };


if (
  localStorage.getItem("qeviraDark") === "true"
) {
  document.body.classList.add("dark");
}


/* SAFE TEXT */

function escapeHTML(text) {

  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* START */

showChats();
showContacts();
