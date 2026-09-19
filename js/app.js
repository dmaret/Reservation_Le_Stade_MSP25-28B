// ===== DATA =====
const platsData = {
    "Pizzas au Feu de Bois": [
        "Margherita", "Romana", "Napoli", "4 Saisons", "Paradis Hawaïen",
        "La Stade", "Tonno 2", "Norma 2", "Mortazza", "Calzone",
        "Diavoletta", "La Sam", "La Parma", "Verdurosa", "Nord",
        "Norvégienne", "Primavera", "Sud", "Calabre", "Deliziosa"
    ],
    "Autres Plats": [
        "Salade mélée",
        "Tartare de bœuf avec toasts et frites",
        "Entrecôte sauce poivre + frites",
        "Filets de perches meunières + frites",
        "Pâtes aux fruits de mer",
        "Piccata milanaise + pâte"
    ],
    "Texte Libre 1": [],
    "Texte Libre 2": [],
    "Texte Libre 3": []
};

let commandes = {};
let currentPlat = null;
let isConnected = false;
let app, database;

// ===== FIREBASE INITIALIZATION =====
async function initFirebase() {
    try {
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
        const { getDatabase, ref, set, get, onValue, remove, push } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');
        
        const firebaseConfig = {
            apiKey: "AIzaSyCWfu8huw83Y5GRitPBOYvgkd6bFamfEp8",
            authDomain: "commande-repas-equipe.firebaseapp.com",
            databaseURL: "https://commande-repas-equipe-default-rtdb.europe-west1.firebasedatabase.app",
            projectId: "commande-repas-equipe",
            storageBucket: "commande-repas-equipe.firebasestorage.app",
            messagingSenderId: "415211846953",
            appId: "1:415211846953:web:8e4b1b704c4598eafecb38"
        };
        
        app = initializeApp(firebaseConfig);
        database = getDatabase(app);
        
        window.firebase = { getDatabase, ref, set, get, onValue, remove, push };
        console.log('Firebase initialisé avec succès');
        
        // Listen for connection status
        const connectedRef = window.firebase.ref(database, '.info/connected');
        window.firebase.onValue(connectedRef, (snap) => {
            updateConnectionStatus(snap.val() === true);
        });
        
        return { getDatabase, ref, set, get, onValue, remove, push };
    } catch (error) {
        console.error('Erreur Firebase:', error);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error-container').innerHTML = `
            <div class="error-message">
                <strong>Erreur de connexion Firebase</strong><br>
                ${error.message}
            </div>
        `;
        throw error;
    }
}

// ===== CONNECTION STATUS =====
function updateConnectionStatus(connected) {
    isConnected = connected;
    const statusEl = document.getElementById('connection-status');
    const dot = statusEl.querySelector('.status-dot');
    const text = statusEl.querySelector('span');
    
    if (connected) {
        statusEl.className = 'connection-status connected';
        dot.className = 'status-dot connected';
        text.textContent = 'En ligne';
    } else {
        statusEl.className = 'connection-status disconnected';
        dot.className = 'status-dot disconnected';
        text.textContent = 'Hors ligne';
    }
}

// ===== LOAD DATA =====
async function loadData() {
    try {
        const fb = await initFirebase();
        
        // Load commandes
        const commandesRef = fb.ref(database, 'commandes');
        const snapshot = await fb.get(commandesRef);
        if (snapshot.exists()) {
            commandes = snapshot.val();
        }
        
        // Load plats personnalisés
        const platsRef = fb.ref(database, 'platsData');
        const platsSnapshot = await fb.get(platsRef);
        if (platsSnapshot.exists()) {
            const savedPlats = platsSnapshot.val();
            Object.keys(savedPlats).forEach(key => {
                if (key.startsWith('Texte Libre')) {
                    platsData[key] = savedPlats[key];
                }
            });
        }
        
        document.getElementById('loading').style.display = 'none';
        document.getElementById('plats-container').style.display = 'block';
        document.getElementById('summary').style.display = 'block';
        document.getElementById('actions').style.display = 'flex';
        
        renderPlats();
        updateSummary();
        
        // Listen for real-time changes
        fb.onValue(commandesRef, (snapshot) => {
            if (snapshot.exists()) {
                commandes = snapshot.val();
            } else {
                commandes = {};
            }
            renderPlats();
            updateSummary();
        });
        
        fb.onValue(platsRef, (snapshot) => {
            if (snapshot.exists()) {
                const savedPlats = snapshot.val();
                Object.keys(savedPlats).forEach(key => {
                    if (key.startsWith('Texte Libre')) {
                        platsData[key] = savedPlats[key];
                    }
                });
                renderPlats();
            }
        });
        
    } catch (error) {
        console.error('Erreur de chargement:', error);
        document.getElementById('loading').innerHTML = `
            <div class="error-message">
                Erreur de chargement des données: ${error.message}
            </div>
        `;
    }
}

// ===== RENDER PLATS =====
function renderPlats() {
    const container = document.getElementById('plats-container');
    container.innerHTML = '';
    
    for (const [category, plats] of Object.entries(platsData)) {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category';
        
        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'category-header';
        
        const categoryTitle = document.createElement('h3');
        categoryTitle.textContent = category;
        categoryHeader.appendChild(categoryTitle);
        
        if (category.startsWith('Texte Libre')) {
            const addPlatBtn = document.createElement('button');
            addPlatBtn.className = 'add-btn';
            addPlatBtn.textContent = '+ Ajouter un plat';
            addPlatBtn.onclick = () => addCustomPlat(category);
            categoryHeader.appendChild(addPlatBtn);
        }
        
        categoryDiv.appendChild(categoryHeader);
        
        plats.forEach(plat => {
            const platDiv = document.createElement('div');
            platDiv.className = 'plat-item';
            
            const platName = document.createElement('div');
            platName.className = 'plat-name';
            platName.textContent = plat;
            
            // Add delete button for custom plats
            if (category.startsWith('Texte Libre')) {
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '🗑️';
                deleteBtn.className = 'delete-plat-btn';
                deleteBtn.title = 'Supprimer ce plat';
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    deleteCustomPlat(category, plat);
                };
                platName.appendChild(deleteBtn);
            }
            
            platDiv.appendChild(platName);
            
            const personnesList = document.createElement('div');
            personnesList.className = 'personnes-list';
            
            if (commandes[plat] && commandes[plat].length > 0) {
                commandes[plat].forEach(nom => {
                    const tag = document.createElement('div');
                    tag.className = 'personne-tag';
                    tag.innerHTML = `
                        <span>${nom}</span>
                        <span class="remove" onclick="removePersonne('${plat}', '${nom}', event)">✕</span>
                    `;
                    personnesList.appendChild(tag);
                });
            }
            
            const addBtn = document.createElement('button');
            addBtn.className = 'add-btn';
            addBtn.textContent = '+ Ajouter';
            addBtn.onclick = (e) => {
                e.stopPropagation();
                openModal(plat);
            };
            personnesList.appendChild(addBtn);
            
            platDiv.appendChild(personnesList);
            categoryDiv.appendChild(platDiv);
        });
        
        container.appendChild(categoryDiv);
    }
}

// ===== MODAL FUNCTIONS =====
function openModal(plat) {
    currentPlat = plat;
    document.getElementById('modal-title').textContent = `Ajouter votre nom pour : ${plat}`;
    document.getElementById('nom-input').value = '';
    document.getElementById('modal').classList.add('active');
    document.getElementById('nom-input').focus();
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
    currentPlat = null;
}

async function confirmAdd() {
    const nom = document.getElementById('nom-input').value.trim();
    if (nom && currentPlat) {
        if (!commandes[currentPlat]) {
            commandes[currentPlat] = [];
        }
        commandes[currentPlat].push(nom);
        
        try {
            await window.firebase.set(window.firebase.ref(database, 'commandes'), commandes);
            closeModal();
        } catch (error) {
            alert('Erreur lors de l\'ajout: ' + error.message);
        }
    }
}

// ===== REMOVE PERSONNE =====
window.removePersonne = async function(plat, nom, event) {
    event.stopPropagation();
    if (confirm(`Retirer ${nom} de ${plat} ?`)) {
        const index = commandes[plat].indexOf(nom);
        if (index > -1) {
            commandes[plat].splice(index, 1);
            if (commandes[plat].length === 0) {
                delete commandes[plat];
            }
            try {
                await window.firebase.set(window.firebase.ref(database, 'commandes'), commandes);
            } catch (error) {
                alert('Erreur lors de la suppression: ' + error.message);
            }
        }
    }
};

// ===== CUSTOM PLAT FUNCTIONS =====
async function addCustomPlat(category) {
    const platName = prompt(`Entrez le nom du plat pour "${category}" :`);
    if (platName && platName.trim()) {
        const trimmedName = platName.trim();
        if (!platsData[category]) {
            platsData[category] = [];
        }
        if (!platsData[category].includes(trimmedName)) {
            platsData[category].push(trimmedName);
            try {
                await window.firebase.set(window.firebase.ref(database, 'platsData'), platsData);
            } catch (error) {
                alert('Erreur lors de l\'ajout: ' + error.message);
            }
        } else {
            alert('Ce plat existe déjà dans cette catégorie.');
        }
    }
}

async function deleteCustomPlat(category, plat) {
    if (confirm(`Supprimer "${plat}" de la liste ?`)) {
        const index = platsData[category].indexOf(plat);
        if (index > -1) {
            platsData[category].splice(index, 1);
            
            // Supprimer aussi les commandes associées à ce plat
            if (commandes[plat]) {
                delete commandes[plat];
                try {
                    await window.firebase.set(window.firebase.ref(database, 'commandes'), commandes);
                } catch (error) {
                    alert('Erreur lors de la suppression des commandes: ' + error.message);
                }
            }
            
            try {
                await window.firebase.set(window.firebase.ref(database, 'platsData'), platsData);
            } catch (error) {
                alert('Erreur lors de la suppression: ' + error.message);
            }
        }
    }
}

// ===== SUMMARY =====
function updateSummary() {
    const summaryContent = document.getElementById('summary-content');
    
    if (Object.keys(commandes).length === 0) {
        summaryContent.innerHTML = '<p style="color: #999;">Aucune commande pour le moment</p>';
        return;
    }
    
    let html = '';
    const personnesCount = {};
    let totalPlats = 0;
    
    for (const [plat, noms] of Object.entries(commandes)) {
        if (noms.length > 0) {
            html += `<div class="summary-item"><strong>${plat}</strong> : ${noms.join(', ')}</div>`;
            totalPlats += noms.length;
            
            noms.forEach(nom => {
                personnesCount[nom] = (personnesCount[nom] || 0) + 1;
            });
        }
    }
    
    // Add stats at the top
    const totalPersonnes = Object.keys(personnesCount).length;
    html = `
        <div class="summary-stats">
            <div>
                <div class="count">${totalPersonnes}</div>
                <div class="label">Participant${totalPersonnes > 1 ? 's' : ''}</div>
            </div>
            <div>
                <div class="count">${totalPlats}</div>
                <div class="label">Plat${totalPlats > 1 ? 's' : ''} commandé${totalPlats > 1 ? 's' : ''}</div>
            </div>
        </div>
    ` + html;
    
    html += '<hr style="margin: 20px 0;">';
    html += '<div style="font-weight: bold; margin-bottom: 10px;">Nombre de plats par personne :</div>';
    for (const [nom, count] of Object.entries(personnesCount)) {
        html += `<div class="summary-item">${nom} : ${count} plat${count > 1 ? 's' : ''}</div>`;
    }
    
    summaryContent.innerHTML = html;
}

// ===== EXPORT DATA =====
window.exportData = function() {
    let text = '=== COMMANDE REPAS D\'ÉQUIPE ===\n\n';
    
    for (const [plat, noms] of Object.entries(commandes)) {
        if (noms.length > 0) {
            text += `${plat} : ${noms.join(', ')}\n`;
        }
    }
    
    text += '\n=== PAR PERSONNE ===\n\n';
    const personnesPlats = {};
    for (const [plat, noms] of Object.entries(commandes)) {
        noms.forEach(nom => {
            if (!personnesPlats[nom]) personnesPlats[nom] = [];
            personnesPlats[nom].push(plat);
        });
    }
    
    for (const [nom, plats] of Object.entries(personnesPlats)) {
        text += `${nom} :\n`;
        plats.forEach(plat => text += `  - ${plat}\n`);
        text += '\n';
    }
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commande-repas-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
};

// ===== RESET ALL =====
window.resetAll = async function() {
    if (confirm('⚠️ Êtes-vous sûr de vouloir réinitialiser toutes les commandes ? Cette action est irréversible et affectera tous les utilisateurs.')) {
        try {
            await window.firebase.set(window.firebase.ref(database, 'commandes'), {});
            commandes = {};
        } catch (error) {
            alert('Erreur lors de la réinitialisation: ' + error.message);
        }
    }
};

// ===== CONDITIONS MODAL =====
function openConditionsModal(e) {
    if (e) e.preventDefault();
    const modal = document.getElementById('conditionsModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeConditionsModal() {
    const modal = document.getElementById('conditionsModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
    }
}

// ===== EVENT LISTENERS =====
window.closeModal = closeModal;
window.confirmAdd = confirmAdd;
window.openConditionsModal = openConditionsModal;
window.closeConditionsModal = closeConditionsModal;

document.getElementById('nom-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        confirmAdd();
    }
});

window.onclick = (event) => {
    const modal = document.getElementById('modal');
    if (event.target === modal) {
        closeModal();
    }
    
    const conditionsModal = document.getElementById('conditionsModal');
    if (event.target === conditionsModal) {
        closeConditionsModal();
    }
};

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeConditionsModal();
    }
});

// ===== INITIALIZE =====
// Start the application
loadData();
