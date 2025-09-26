const submitButton = document.getElementById('submitButton');
const googleLoginButton = document.getElementById('googleLoginButton');
const responseArea = document.getElementById('responseArea');
const inputFieldsContainer = document.getElementById('inputFieldsContainer');

const numberOfFields = 47;
let inputFields = [];

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
        responseArea.innerText = 'Google prijava: ' + JSON.stringify(data);
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
    const dataToSend = JSON.stringify(allData);

    fetch('https://botanica.ngrok.app/submit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: dataToSend
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
