const BACKEND_URL = 'https://botanica.ngrok.app'; // Proverite da li je URL ispravan!
let currentUser = null; // Sadrži id, email, name
let currentUserSettings = { // Sadrži discord_token, discord_bot_active, client_email
    discord_token: '',
    discord_bot_active: 0
};

function handleCredentialResponse(response) {
    console.log("Google Credential Response:", response);
    if (response.credential) {
        fetch(`${BACKEND_URL}/oauth_callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: response.credential })
        })
        .then(res => res.json())
        .then(data => {
            console.log("Backend OAuth Response:", data);
            if (data.status === 'success') {
                currentUser = {
                    id: data.user_id,
                    email: data.user_email,
                    name: data.user_name
                };
                displayAuthInfo();
                showCategorySection();
                fetchCategories();
                fetchUserSettings(); // Dohvati i Discord postavke
                saveSession();
            } else {
                alert('Greška pri prijavi: ' + data.message);
                console.error('Google prijava neuspešna:', data.message);
            }
        })
        .catch(error => {
            console.error('Greška pri komunikaciji sa backendom za OAuth:', error);
            alert('Došlo je do greške pri prijavi. Pokušajte ponovo.');
        });
    } else {
        console.error('Nema credentiala u Google odgovoru.');
    }
}

function displayAuthInfo() {
    if (currentUser) {
        document.getElementById('user-name').textContent = currentUser.name;
        document.getElementById('user-email').textContent = currentUser.email;
        document.getElementById('user-id').textContent = currentUser.id;
        document.getElementById('auth-info').style.display = 'block';
        document.querySelector('.g_id_signin').style.display = 'none';
        document.getElementById('client_email').value = currentUser.email;
    }
}

function showCategorySection() {
    document.getElementById('category-section').style.display = 'block';
}

function signOut() {
    google.accounts.id.disableAutoSelect();
    currentUser = null;
    currentUserSettings = { discord_token: '', discord_bot_active: 0 };
    document.getElementById('auth-info').style.display = 'none';
    document.querySelector('.g_id_signin').style.display = 'block';
    document.getElementById('category-section').style.display = 'none';
    document.getElementById('categories-container').innerHTML = '';
    document.getElementById('no-categories').style.display = 'block';
    document.getElementById('widget-code').style.display = 'none';
    document.getElementById('embedded-widget-container').innerHTML = '';
    localStorage.removeItem("userSession");
    localStorage.removeItem("userSettings"); // Ukloni i Discord postavke iz sesije
    console.log("Korisnik odjavljen.");
}

document.getElementById('category-form').addEventListener('submit', function(event) {
    event.preventDefault();
    if (!currentUser) {
        showMessage('Morate biti prijavljeni da biste sačuvali kategorije.', 'error');
        return;
    }

    const clientEmail = document.getElementById('client_email').value;
    const sequenceNumber = parseInt(document.getElementById('sequence_number').value);
    const priority = parseInt(document.getElementById('priority').value);
    const rule = document.getElementById('rule').value;
    const response = document.getElementById('response').value;
    const tagsInput = document.getElementById('tags').value;
    const tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag !== '');

    const categoryData = {
        google_user_id: currentUser.id,
        client_email: clientEmail,
        sequence_number: sequenceNumber,
        priority: priority,
        rule: rule,
        response: response,
        tags: tags
    };

    fetch(`${BACKEND_URL}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData)
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            showMessage(data.message, 'success');
            document.getElementById('category-form').reset();
            document.getElementById('client_email').value = currentUser.email;
            fetchCategories();
        } else {
            showMessage('Greška: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Greška pri slanju kategorije:', error);
        showMessage('Došlo je do greške pri čuvanju kategorije.', 'error');
    });
});

// Nova forma za Discord postavke
document.getElementById('discord-settings-form').addEventListener('submit', function(event) {
    event.preventDefault();
    if (!currentUser) {
        showMessage('Morate biti prijavljeni da biste sačuvali Discord postavke.', 'error');
        return;
    }

    const discordToken = document.getElementById('discord_token').value;
    const discordBotActive = document.getElementById('discord_bot_active').checked ? 1 : 0;

    const settingsData = {
        google_user_id: currentUser.id,
        discord_token: discordToken,
        discord_bot_active: discordBotActive
    };

    fetch(`${BACKEND_URL}/user_settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsData)
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            showMessage(data.message, 'success');
            currentUserSettings.discord_token = discordToken;
            currentUserSettings.discord_bot_active = discordBotActive;
            saveUserSettings(); // Sačuvaj ažurirane postavke
        } else {
            showMessage('Greška pri čuvanju Discord postavki: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Greška pri slanju Discord postavki:', error);
        showMessage('Došlo je do greške pri čuvanju Discord postavki.', 'error');
    });
});

// Funkcija za dohvatanje Discord postavki
function fetchUserSettings() {
    if (!currentUser) return;
    fetch(`${BACKEND_URL}/get_user_settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ google_user_id: currentUser.id })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            currentUserSettings = {
                discord_token: data.discord_token,
                discord_bot_active: data.discord_bot_active
            };
            document.getElementById('discord_token').value = currentUserSettings.discord_token;
            document.getElementById('discord_bot_active').checked = currentUserSettings.discord_bot_active === 1;
            saveUserSettings(); // Sačuvaj u lokalnu sesiju
        } else if (data.status === 'not_found') {
            console.log('Korisničke Discord postavke nisu pronađene, korišćenje podrazumevanih.');
            // Ako nisu pronađene, forma će prikazati prazna polja, što je ok
            currentUserSettings = { discord_token: '', discord_bot_active: 0 };
            document.getElementById('discord_token').value = '';
            document.getElementById('discord_bot_active').checked = false;
            saveUserSettings();
        } else {
            showMessage('Greška pri dohvatanju Discord postavki: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Greška pri dohvatanju Discord postavki:', error);
        showMessage('Došlo je do greške pri učitavanju Discord postavki.', 'error');
    });
}


function fetchCategories() {
    if (!currentUser) return Promise.resolve([]);
    return fetch(`${BACKEND_URL}/get_categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ google_user_id: currentUser.id })
    })
    .then(res => res.json())
    .then(data => {
        const container = document.getElementById('categories-container');
        container.innerHTML = '';

        if (data.status === 'success' && data.categories.length > 0) {
            document.getElementById('no-categories').style.display = 'none';
            data.categories.forEach(category => {
                const item = document.createElement('div');
                item.classList.add('category-item');
                item.innerHTML = `
                    <p><strong>Email klijenta:</strong> ${category.client_email}</p>
                    <p><strong>Redni broj:</strong> ${category.sequence_number}</p>
                    <p><strong>Prioritet:</strong> ${category.priority}</p>
                    <p><strong>Pravilo:</strong> ${category.rule}</p>
                    <p><strong>Odgovor:</strong> ${category.response.length > 100 ? category.response.substring(0, 100) + '...' : category.response}</p>
                    <p><strong>Tagovi:</strong> ${category.tags.join(', ')}</p>
                `;
                container.appendChild(item);
            });
            return data.categories;
        } else {
            document.getElementById('no-categories').style.display = 'block';
            return [];
        }
    })
    .catch(error => {
        console.error('Greška pri dohvatanju kategorija:', error);
        showMessage('Došlo je do greške pri učitavanju kategorija.', 'error');
        document.getElementById('no-categories').style.display = 'block';
        return [];
    });
}

function showMessage(msg, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = msg;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    setTimeout(() => { messageDiv.style.display = 'none'; }, 5000);
}

// Dugme za generisanje kod za kopiranje
document.getElementById('generate-widget-btn').addEventListener('click', function() {
    if (currentUser) {
        const widgetCode = `<iframe \n  src="https://cibulskia.github.io/widget?site=${currentUser.id}"  \n  style="position: fixed; bottom: 0; right: 0; width: 100%; max-width: 400px; height: 600px; border: none; z-index: 9999;"\n  scrolling="no"\n></iframe>`;
        const codeDiv = document.getElementById('widget-code');
        codeDiv.textContent = widgetCode;
        codeDiv.style.display = 'block';
        navigator.clipboard.writeText(widgetCode)
            .then(() => alert('Kod je kopiran u clipboard!'))
            .catch(() => alert('Greška pri kopiranju u clipboard.'));
    } else {
        alert('Morate biti prijavljeni da biste generisali kod.');
    }
});

// Novo dugme: embedovanje widgeta direktno na stranicu
document.getElementById('embed-widget-btn').addEventListener('click', function() {
    if (currentUser) {
        const container = document.getElementById('embedded-widget-container');
        container.innerHTML = `<iframe src="https://cibulskia.github.io/widget?site=${currentUser.id}" style="position: fixed; bottom: 0; right: 0; width: 100%; max-width: 400px; height: 600px; border: none; z-index: 9999;" scrolling="no"></iframe>`;
        showMessage('Widget je uspešno embedovan na stranicu.', 'success');
    } else {
        alert('Morate biti prijavljeni da biste embedovali widget.');
    }
});

// Dugme "Učitaj Botanicu"
document.getElementById('load-category-btn').addEventListener('click', async function() {
    if (!currentUser) {
        showMessage('Morate biti prijavljeni da biste učitali kategoriju.', 'error');
        return;
    }

    const seqInput = document.getElementById('sequence_number').value;
    const categories = await fetchCategories(); // Osiguraj da su kategorije učitane

    if (categories.length === 0) {
        showMessage('Botanica je prazna.', 'error');
        return;
    }

    let categoryToLoad = null;

    if (seqInput === '') {
        // Učitaj kategoriju sa najmanjim rednim brojem ako polje za broj nije popunjeno
        categoryToLoad = categories.reduce((prev, curr) => prev.sequence_number < curr.sequence_number ? prev : curr);
    } else {
        const seqNumber = parseInt(seqInput);
        categoryToLoad = categories.find(cat => cat.sequence_number === seqNumber);
        if (!categoryToLoad) {
            showMessage('Nema takve Botanice.', 'error');
            return;
        }
    }

    if (categoryToLoad) {
        document.getElementById('client_email').value = categoryToLoad.client_email;
        document.getElementById('sequence_number').value = categoryToLoad.sequence_number;
        document.getElementById('priority').value = categoryToLoad.priority;
        document.getElementById('rule').value = categoryToLoad.rule;
        document.getElementById('response').value = categoryToLoad.response;
        document.getElementById('tags').value = categoryToLoad.tags.join(', ');
        showMessage('Botanica je uspešno učitana.', 'success');
    }
});

// Čuvanje sesije (Google info)
function saveSession() {
    if (currentUser) {
        localStorage.setItem("userSession", JSON.stringify(currentUser));
    }
}

// Čuvanje korisničkih postavki (Discord info)
function saveUserSettings() {
    if (currentUserSettings) {
        localStorage.setItem("userSettings", JSON.stringify(currentUserSettings));
    }
}

// Učitavanje sesije i postavki pri učitavanju stranice
window.onload = function() {
    const savedUser = localStorage.getItem("userSession");
    const savedUserSettings = localStorage.getItem("userSettings");

    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        displayAuthInfo();
        showCategorySection();
        fetchCategories();
        // Pokušaj da učitaš Discord postavke iz localStorage-a, ako postoje
        if (savedUserSettings) {
            currentUserSettings = JSON.parse(savedUserSettings);
            document.getElementById('discord_token').value = currentUserSettings.discord_token;
            document.getElementById('discord_bot_active').checked = currentUserSettings.discord_bot_active === 1;
        }
        fetchUserSettings(); // Uvek dohvati najnovije sa servera
    }
};
