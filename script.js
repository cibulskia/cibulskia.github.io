const inputField = document.getElementById('inputField');
const submitButton = document.getElementById('submitButton');
const responseArea = document.getElementById('responseArea');
const loggedInContent = document.getElementById('loggedInContent'); // Div koji sadrži input/dugme
const loginStatus = document.getElementById('loginStatus'); // Za poruke o statusu prijave

// Promenljiva za praćenje stanja prijave
let isAuthenticated = false; 
let googleIdToken = null; // Čuvamo token za slanje na server

// Funkcija koja ažurira UI na osnovu stanja prijave
function updateUI(loggedIn) {
    if (loggedIn) {
        loggedInContent.style.display = 'block'; // Prikaži input i submit dugme
        loginStatus.innerText = `Prijavljeni ste kao: ${isAuthenticated.user_email}`; // Ažurira se u handleCredentialResponse
    } else {
        loggedInContent.style.display = 'none'; // Sakrij input i submit dugme
        loginStatus.innerText = 'Molimo prijavite se putem Google-a da biste koristili aplikaciju.';
    }
}

// Google OAuth konfiguracija
function handleCredentialResponse(response) {
    googleIdToken = response.credential; // Sačuvaj token
    
    // Uvek pošalji token serveru na verifikaciju i obradu
    fetch('https://botanica.ngrok.app/oauth_callback', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ credential: googleIdToken })
    })
    .then(serverResponse => serverResponse.json())
    .then(data => {
        if (data.status === 'success') {
            isAuthenticated = data; // Postavi stanje na uspešno
            updateUI(true); // Ažuriraj UI da pokaže ulogovan sadržaj
            responseArea.innerText = 'Google prijava: ' + JSON.stringify(data);
            localStorage.setItem('google_id_token', googleIdToken); // Sačuvaj token za sledeće posete
        } else {
            isAuthenticated = false; // Neuspešna prijava
            updateUI(false); // Sakrij ulogovan sadržaj
            loginStatus.innerText = 'Greška pri prijavi: ' + (data.message || 'Nepoznata greška');
            console.error('Greška pri Google prijavi:', data.message);
            localStorage.removeItem('google_id_token'); // Ukloni nevalidan token
        }
    })
    .catch(error => {
        console.error('Greška pri Google prijavi:', error);
        isAuthenticated = false; // Neuspešna prijava
        updateUI(false); // Sakrij ulogovan sadržaj
        loginStatus.innerText = 'Greška pri Google prijavi. Proverite konzolu.';
        localStorage.removeItem('google_id_token'); // Ukloni token pri grešci
    });
}

window.onload = function () {
    google.accounts.id.initialize({
        client_id: "VAŠ_GOOGLE_CLIENT_ID.apps.googleusercontent.com", // Zamenite sa vašim Client ID-jem
        callback: handleCredentialResponse
    });

    // Pokušaj da povratiš token iz localStorage-a
    const storedToken = localStorage.getItem('google_id_token');
    if (storedToken) {
        // Ako postoji sačuvan token, simuliraj odgovor kao da je ponovo primljen
        // (Ovo je pojednostavljenje; u produkciji bi se token poslao serveru na re-verifikaciju)
        googleIdToken = storedToken; // Postavi ga kao trenutni token
        // Server bi trebalo da ima endpoint za proveru tokena bez ponovnog slanja creds
        // Za sada, samo pretpostavljamo da je validan za UI prikaz dok se ne pošalje prva stvarna akcija
        // i čekamo pravi oauth_callback poziv
        
        // Prikazujemo poruku da se status proverava
        loginStatus.innerText = "Proveravam status prijave...";
        // Odmah pozovi handleCredentialResponse sa sačuvanim tokenom
        // da bi se verifikovao i ažurirao UI
        handleCredentialResponse({ credential: storedToken });

    } else {
        // Ako nema sačuvanog tokena, prikaži prompt
        google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                console.log("Google One Tap prompt nije prikazan:", notification.getMomentReason());
                updateUI(false); // Osiguraj da je sadržaj sakriven
            }
        });
        updateUI(false); // Uvek sakrij sadržaj dok ne dobijemo potvrdu
    }
};

submitButton.addEventListener('click', () => {
    // PREPREKA: Proveri da li je korisnik ulogovan pre slanja
    if (!isAuthenticated || !googleIdToken) {
        responseArea.innerText = 'Morate biti prijavljeni na Google da biste poslali podatke!';
        return; // Zaustavi slanje ako korisnik nije ulogovan
    }

    const data = inputField.value;
    
    fetch('https://botanica.ngrok.app/submit', {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain',
            'Authorization': `Bearer ${googleIdToken}` // Uvek šalji token!
        },
        body: data
    })
    .then(response => {
        if (response.status === 401) { // Ako server vrati Unauthorized
            isAuthenticated = false;
            googleIdToken = null;
            localStorage.removeItem('google_id_token');
            updateUI(false);
            responseArea.innerText = 'Vaša prijava je istekla ili je nevažeća. Molimo prijavite se ponovo.';
            // Opcionalno, ponovo pokreni prompt: google.accounts.id.prompt();
            return Promise.reject('Unauthorized'); // Prekini dalju obradu
        }
        return response.text();
    })
    .then(result => {
        responseArea.innerText = 'Odgovor servera: ' + result;
    })
    .catch(error => {
        console.error('Greška pri slanju:', error);
        if (error !== 'Unauthorized') { // Izbegni duplu poruku
            responseArea.innerText = 'Greška pri slanju podataka.';
        }
    });
});
