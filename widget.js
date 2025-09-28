(function() {
    const SERVER_URL = "https://botanica.ngrok.app"; // Tvoj ngrok URL

    // Kreiraj button za otvaranje chata
    const openChatBtn = document.createElement("button");
    openChatBtn.id = "openChatBtn";
    openChatBtn.textContent = "Chat";
    document.body.appendChild(openChatBtn);

    // Kreiraj popup za chat
    const qaPopup = document.createElement("div");
    qaPopup.id = "qaPopup";
    qaPopup.innerHTML = `
        <div id="chatHistory"></div>
        <textarea id="userQuestion" placeholder="Postavi pitanje..."></textarea>
        <div id="chatControls">
            <button id="closeChatBtn">Zatvori</button>
            <button id="sendBtn">Pošalji</button>
        </div>
    `;
    document.body.appendChild(qaPopup);

    // Dodaj stilove sa tranzicijom
    const style = document.createElement("style");
    style.textContent = `
        #qaPopup {
            position: fixed; bottom: 20px; right: 20px;
            width: 100%; max-width: 400px;
            border-radius: 10px; background: #f9f9f9;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            border: 1px solid #ccc; display: flex; flex-direction: column;
            z-index: 1006; overflow: hidden;
            transform: translateY(100%);
            opacity: 0;
            transition: transform 0.3s ease, opacity 0.3s ease;
        }
        #qaPopup.active {
            transform: translateY(0);
            opacity: 1;
        }
        #chatHistory {
            padding: 10px; max-height: 50vh; overflow-y: auto; font-size: 0.95em;
        }
        .chat-message { margin-bottom: 10px; word-wrap: break-word; }
        .chat-message.user { text-align: right; color: #007BFF; }
        .chat-message.bot { text-align: left; color: #333333; }
        #qaPopup textarea {
            padding:10px; width: calc(100% - 20px); font-size:1em;
            margin:10px; display:block; resize:none; min-height:40px; overflow:hidden; box-sizing:border-box;
        }
        #chatControls {
            display: flex; justify-content: flex-end; gap: 10px; margin: 0 10px 10px 10px;
        }
        #chatControls button {
            padding:10px 15px; font-size:1em; cursor:pointer; border-radius: 5px; border: none;
        }
        #sendBtn { background-color: #888; color: white; }
        #sendBtn:hover { background-color: #007BFF; }
        #closeChatBtn { background-color: #888; color: white; }
        #closeChatBtn:hover { background-color: #FF0000; }
        #openChatBtn {
            position: fixed; bottom: 20px; right: 20px; z-index:1005;
            padding: 15px 25px; font-size: 1.2em; cursor: pointer;
            border-radius: 50px; border: none; background-color: #888; color: white;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        }
        #openChatBtn:hover { background-color: #007BFF; }
        @media screen and (max-width:768px) {
            #qaPopup { width:90%; right:5%; bottom:10px; max-width:none; }
            #qaPopup textarea { width: calc(100% - 20px); }
        }
    `;
    document.head.appendChild(style);

    // Identifikacija posetioca
    let visitorId = localStorage.getItem("visitor_id");
    if (!visitorId) {
        visitorId = "user_" + Math.random().toString(36).substring(2, 10);
        localStorage.setItem("visitor_id", visitorId);
    }

    // Uzmi site iz URL parametra iframe-a
    const urlParams = new URLSearchParams(window.location.search);
    const site = urlParams.get('site') || 'unknown_site';

    const chatHistory = qaPopup.querySelector("#chatHistory");
    const sendBtn = qaPopup.querySelector("#sendBtn");
    const closeChatBtn = qaPopup.querySelector("#closeChatBtn");
    const userQuestion = qaPopup.querySelector("#userQuestion");

    let loadingInterval = null;
    let pollingInterval = null;

    function startLoading() {
        let dots = 0;
        loadingInterval = setInterval(() => {
            dots = (dots + 1) % 4;
            userQuestion.placeholder = "Obrada" + ".".repeat(dots);
        }, 500);
    }

    function stopLoading() {
        clearInterval(loadingInterval);
        loadingInterval = null;
        userQuestion.placeholder = "Postavi pitanje...";
    }

    function appendMessage(sender, text) {
        const div = document.createElement("div");
        div.className = `chat-message ${sender}`;
        div.textContent = text;
        chatHistory.appendChild(div);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    userQuestion.addEventListener('input', e => {
        e.target.style.height = 'auto';
        e.target.style.height = (e.target.scrollHeight) + 'px';
    });

    async function sendQuestion() {
        const question = userQuestion.value.trim();
        if(!question) return;
        appendMessage("user", question);
        userQuestion.value = '';
        userQuestion.style.height = 'auto';
        startLoading();

        try {
            const timestamp = new Date().getTime();
            const fullId = `(${site})${visitorId}`; // site u zagrade da bude legalno u Windows fajlovima
            const response = await fetch(`${SERVER_URL}/ask?id=${encodeURIComponent(fullId)}&question=${encodeURIComponent(question)}&_t=${timestamp}`, {
                headers: { "ngrok-skip-browser-warning": "true" }
            });
            const data = await response.json();
            if (!response.ok) {
                appendMessage("bot", `Greška: ${data.message || 'Nepoznata greška'}`);
                stopLoading();
            }
        } catch (err) {
            appendMessage("bot", "Greška u komunikaciji sa serverom.");
            stopLoading();
        }
    }

    async function pollForAnswer() {
        try {
            const timestamp = new Date().getTime();
            const fullId = `(${site})${visitorId}`;
            const response = await fetch(`${SERVER_URL}/check_answer?id=${encodeURIComponent(fullId)}&_t=${timestamp}`, {
                headers: { "ngrok-skip-browser-warning": "true" }
            });
            const data = await response.json();
            if (response.ok && data.status === "success") {
                stopLoading();
                appendMessage("bot", data.answer);
            }
        } catch (err) {
            console.error("Polling greška:", err);
        }
    }

    function startPolling() {
        if (!pollingInterval) {
            pollingInterval = setInterval(pollForAnswer, 5000);
        }
    }

    function stopPolling() {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
    }

    function openChat() {
        qaPopup.classList.add("active");
        startPolling();
    }

    function closeChat() {
        qaPopup.classList.remove("active");
        stopPolling();
    }

    openChatBtn.addEventListener("click", () => {
        if (qaPopup.classList.contains("active")) {
            closeChat();
        } else {
            openChat();
        }
    });

    closeChatBtn.addEventListener("click", closeChat);
    sendBtn.addEventListener("click", sendQuestion);
    userQuestion.addEventListener("keydown", e => {
        if(e.key === "Enter" && !e.shiftKey){
            e.preventDefault();
            sendQuestion();
        }
    });

})();
