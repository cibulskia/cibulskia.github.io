const submitButton = document.getElementById('submitButton');
const responseArea = document.getElementById('responseArea');
const loggedInContent = document.getElementById('loggedInContent');
const loginStatus = document.getElementById('loginStatus');

// --- Stanje prijave ---
let isAuthenticated = false;
let googleIdToken = null;

// --- Ažuriranje UI ---
function updateUI(loggedIn) {
    if (loggedIn) {
        loggedInContent.style.display = 'block';
        loginStatus.innerText = `Prijavljeni ste kao: ${isAuthenticated.user_email}`;
    } else {
        loggedInContent.style.display = 'none';
        loginStatus.innerText = 'Molimo prijavite se putem Google-a da biste koristili aplikaciju.';
    }
}

// --- Google OAuth ---
function handleCredentialResponse(response) {
    googleIdToken = response.credential;

    fetch('https://botanica.ngrok.app/oauth_callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: googleIdToken })
    })
    .then(serverResponse => serverResponse.json())
    .then(data => {
        if (data.status === 'success') {
            isAuthenticated = data;
            updateUI(true);
            responseArea.innerText = 'Google prijava: ' + JSON.stringify(data);
            localStorage.setItem('google_id_token', googleIdToken);
        } else {
            isAuthenticated = false;
            updateUI(false);
            loginStatus.innerText = 'Greška pri prijavi: ' + (data.message || 'Nepoznata greška');
            localStorage.removeItem('google_id_token');
        }
    })
    .catch(error => {
        console.error('Greška pri Google prijavi:', error);
        isAuthenticated = false;
        updateUI(false);
        loginStatus.innerText = 'Greška pri Google prijavi. Proverite konzolu.';
        localStorage.removeItem('google_id_token');
    });
}

window.onload = function () {
    google.accounts.id.initialize({
        client_id: "VAŠ_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
        callback: handleCredentialResponse
    });

    const storedToken = localStorage.getItem('google_id_token');
    if (storedToken) {
        loginStatus.innerText = "Proveravam status prijave...";
        handleCredentialResponse({ credential: storedToken });
    } else {
        google.accounts.id.prompt(notification => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                console.log("Google One Tap prompt nije prikazan:", notification.getMomentReason());
                updateUI(false);
            }
        });
        updateUI(false);
    }
};

// --- Slanje podataka ---
submitButton.addEventListener('click', () => {
    if (!isAuthenticated || !googleIdToken) {
        responseArea.innerText = 'Morate biti prijavljeni na Google da biste poslali podatke!';
        return;
    }

    // Prikupljanje svih 48 input polja
    const payload = {};
    for (let i = 1; i <= 48; i++) {
        const field = document.getElementById(`input${i}`);
        payload[`field${i}`] = field ? field.value : "";
    }

    fetch('https://botanica.ngrok.app/submit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${googleIdToken}`
        },
        body: JSON.stringify(payload)
    })
    .then(response => {
        if (response.status === 401) {
            isAuthenticated = false;
            googleIdToken = null;
            localStorage.removeItem('google_id_token');
            updateUI(false);
            responseArea.innerText = 'Vaša prijava je istekla ili je nevažeća. Molimo prijavite se ponovo.';
            return Promise.reject('Unauthorized');
        }
        return response.text();
    })
    .then(result => {
        responseArea.innerText = 'Odgovor servera: ' + result;
    })
    .catch(error => {
        console.error('Greška pri slanju:', error);
        if (error !== 'Unauthorized') {
            responseArea.innerText = 'Greška pri slanju podataka.';
        }
    });
});
