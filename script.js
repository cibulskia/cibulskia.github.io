const submitButton = document.getElementById('submitButton');
const googleLoginButton = document.getElementById('googleLoginButton');
const responseArea = document.getElementById('responseArea');
const inputFieldsContainer = document.getElementById('inputFieldsContainer');

const numberOfFields = 47;
let inputFields = [];
let currentUserGoogleId = null; // Ovde ćemo čuvati Google ID korisnika

for (let i = 0; i < numberOfFields; i++) {
    const div = document.createElement('div');
    div.classList.add('input-group');
    const input = document.createElement('input');
    input.type = 'text';
    input.id = `inputField_${i}`;
    input.placeholder = `Unesite tekst za polje ${i + 1}`;
    div.appendChild(input);
    inputFieldsContainer.appendChild(div);
    inputFields.push(input);
}

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
        if (data.status === 'success') {
            responseArea.innerText = `Google prijava: Dobrodošli, ${data.user_name} (${data.user_email})`;
            currentUserGoogleId = data.user_id; // Sačuvaj Google ID
            console.log("Prijavljeni korisnik ID:", currentUserGoogleId);
            // Opcionalno: Prikaži nešto korisniku što ukazuje da je prijavljen
        } else {
            responseArea.innerText = 'Greška pri Google prijavi: ' + data.message;
        }
    })
    .catch(error => {
        console.error('Greška pri Google prijavi:', error);
        responseArea.innerText = 'Greška pri Google prijavi.';
    });
}

window.onload = function () {
    google.accounts.id.initialize({
        client_id: "748161753679-207vasmi8poi0lc0gqvmqv9fphrv6op1.apps.googleusercontent.com",
        callback: handleCredentialResponse
    });
    google.accounts.id.renderButton(
        document.getElementById("googleLoginButton"),
        { theme: "outline", size: "large" }
    );
    google.accounts.id.prompt();
};

submitButton.addEventListener('click', () => {
    const allData = inputFields.map(field => field.value);
    
    // Dodajemo Google ID ako je korisnik prijavljen
    const dataToSend = {
        google_user_id: currentUserGoogleId, // Biće null ako nije prijavljen
        fields_data: allData
    };

    fetch('https://botanica.ngrok.app/submit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend) // Šaljemo JSON objekat
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
