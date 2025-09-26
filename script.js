const inputField = document.getElementById('inputField');
const submitButton = document.getElementById('submitButton');
// const googleLoginButton = document.getElementById('googleLoginButton'); // Ova linija više nije potrebna
const responseArea = document.getElementById('responseArea');

// Google OAuth konfiguracija
function handleCredentialResponse(response) {
    fetch('https://botanica.ngrok.app/oauth_callback', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ credential: response.credential })
    })
    .then(response => response.json())
    .then(data => {
        responseArea.innerText = 'Google prijava: ' + JSON.stringify(data);
    })
    .catch(error => {
        console.error('Greška pri Google prijavi:', error);
        responseArea.innerText = 'Greška pri Google prijavi.';
    });
}

window.onload = function () {
    google.accounts.id.initialize({
        client_id: "VAŠ_GOOGLE_CLIENT_ID.apps.googleusercontent.com", // Zamenite sa vašim Client ID-jem
        callback: handleCredentialResponse
    });
    // google.accounts.id.renderButton (...) // Ova funkcija više nije potrebna
    google.accounts.id.prompt(); // Ovo će pokrenuti automatski prompt
};

submitButton.addEventListener('click', () => {
    const data = inputField.value;
    fetch('https://botanica.ngrok.app/submit', {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain'
        },
        body: data
    })
    .then(response => response.text())
    .then(result => {
        responseArea.innerText = 'Odgovor servera: ' + result;
    })
    .catch(error => {
        console.error('Greška pri slanju:', error);
        responseArea.innerText = 'Greška pri slanju.';
    });
});
