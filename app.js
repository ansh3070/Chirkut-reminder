import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, query, limit, orderBy, getDocs, deleteDoc, enableIndexedDbPersistence, onSnapshot, addDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDJotA_xL6AOHUEJS-Hr4ft5DdOiMzNDog",
    authDomain: "reminder-4f2f7.firebaseapp.com",
    projectId: "reminder-4f2f7",
    storageBucket: "reminder-4f2f7.firebasestorage.app",
    messagingSenderId: "283593484172",
    appId: "1:283593484172:web:6530e100a16f4839f2d8a9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
enableIndexedDbPersistence(db).catch(err => console.log("Persistence Error:", err.code));

const USER_ID = "chirkut_user_001";

// --- MEMORY RESET FIX ---
// This deletes the old names (Ansh/Harshita) so the gateway asks for Zenitsu/Nezuko
let currentSavedName = localStorage.getItem('chirkut_username');
if (currentSavedName === "Ansh" || currentSavedName === "Harshita") {
    localStorage.removeItem('chirkut_username');
    currentSavedName = null;
}
let MY_NAME = currentSavedName;

// --- DATE HELPER ---
const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getDocRef = () => doc(db, "users", USER_ID, "dailyLogs", getTodayStr());
let lastLoadedDate = getTodayStr();

// --- DOM ELEMENTS ---
const appContainer = document.getElementById('app-container');
const loadingScreen = document.getElementById('loading-screen');
const identityModal = document.getElementById('identity-modal');
const idBtns = document.querySelectorAll('.id-btn');

const affirmationText = document.getElementById('affirmation-text');
const dateBadge = document.getElementById('display-date');
const streakBadge = document.getElementById('streak-badge');
const streakCountSpan = streakBadge.querySelector('span');
const secretLogo = document.getElementById('secret-logo');

const btnWater = document.getElementById('btn-water');
const lblWaterCount = document.getElementById('water-count');
const lblWaterTime = document.getElementById('water-last-time');
const btnMed = document.getElementById('btn-med');
const lblMed = document.getElementById('med-status');
const inpSleep = document.getElementById('sleep-input');
const btnSleep = document.getElementById('btn-sleep');
const lblSleep = document.getElementById('sleep-status');

const btnHistory = document.getElementById('btn-history');
const modalHistory = document.getElementById('history-modal');
const closeHistory = document.getElementById('close-history');
const historyList = document.getElementById('history-list');

// Cozy DOM
const btnCozy = document.getElementById('btn-cozy');
const modalCozy = document.getElementById('cozy-modal');
const closeCozy = document.getElementById('close-cozy');
const gestureBtns = document.querySelectorAll('.gesture-btn');
const chatInput = document.getElementById('chat-input');
const btnSendChat = document.getElementById('btn-send-chat');
const chatMessages = document.getElementById('chat-messages');

const sweetPopup = document.getElementById('sweet-popup');
const popupEmoji = document.getElementById('popup-emoji');
const popupText = document.getElementById('popup-text');

const affirmations = [
    "Your brain needs water to think clearly. Sip sip! 💧",
    "Meds are a form of self-love, not a chore. 💊",
    "Good sleep tonight means a better tomorrow. 🌙",
    "Hydration is the key to glowing energy. ✨",
    "You deserve to feel healthy and rested.",
    "Be gentle with yourself today 💙"
];

// --- CONFETTI ---
function triggerConfetti() {
    if (typeof confetti === 'function') {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#ffb7b2', '#8ac6d1', '#ffffff'] });
    }
}

// --- INIT ---
window.addEventListener('load', async () => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
    dateBadge.innerText = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    
    // 1. Identity Check
    if (!MY_NAME) {
        loadingScreen.style.display = 'none';
        identityModal.classList.remove('hidden');
    } else {
        await bootApp();
    }

    // Identity Buttons
    idBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            MY_NAME = e.target.getAttribute('data-name');
            localStorage.setItem('chirkut_username', MY_NAME);
            identityModal.classList.add('hidden');
            loadingScreen.style.display = 'flex';
            await bootApp();
        });
    });
});

async function bootApp() {
    startAffirmations();
    await loadTodayData();
    await checkStreak();
    
    listenForBroadcasts();
    listenForGestures();
    listenForChats();

    setTimeout(() => {
        loadingScreen.style.display = 'none';
        appContainer.classList.remove('hidden');
    }, 1000);

    setInterval(backgroundLoop, 60000);
}

// --- FUN: SECRET LOGO ---
let tapCount = 0;
secretLogo.addEventListener('click', () => {
    tapCount++;
    if (tapCount === 5) {
        alert("A secret message for Nezuko: I see how hard you're trying, and I'm so incredibly proud of you. You've got this! 🌸");
        triggerConfetti();
        tapCount = 0;
    }
});

function startAffirmations() {
    let i = 0;
    setInterval(() => {
        affirmationText.style.opacity = 0;
        setTimeout(() => {
            i = (i + 1) % affirmations.length;
            affirmationText.innerText = affirmations[i];
            affirmationText.style.opacity = 1;
        }, 500);
    }, 15000);
}

// --- BUG FIX: COZY MODAL BUTTON ---
btnCozy.addEventListener('click', () => {
    modalCozy.classList.remove('hidden');
    // Scroll chat to bottom when opened
    setTimeout(() => { chatMessages.scrollTop = chatMessages.scrollHeight; }, 100);
});
closeCozy.addEventListener('click', () => {
    modalCozy.classList.add('hidden');
});

// --- GESTURES LOGIC ---
gestureBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
        const type = e.target.getAttribute('data-type');
        let emoji = "🫂"; let actionText = "a hug";
        if(type === "kiss") { emoji = "💋"; actionText = "a kiss"; }
        if(type === "nudge") { emoji = "👈"; actionText = "a nudge"; }

        // Give immediate visual feedback
        btn.innerText = "Sent! ✔";
        setTimeout(() => { btn.innerText = `${emoji} ${type.charAt(0).toUpperCase() + type.slice(1)}`; }, 2000);

        await setDoc(doc(db, "cozy_room", "latest_gesture"), {
            sender: MY_NAME,
            type: type,
            emoji: emoji,
            text: actionText,
            timestamp: Date.now()
        });
    });
});

function listenForGestures() {
    onSnapshot(doc(db, "cozy_room", "latest_gesture"), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const lastGestureTime = parseInt(localStorage.getItem('last_gesture_time')) || 0;
            const now = Date.now();

            if (data.timestamp > lastGestureTime && data.timestamp > (now - 86400000) && data.sender !== MY_NAME) {
                
                popupEmoji.innerText = data.emoji;
                popupText.innerText = `${data.sender} sent ${data.text}!`;
                sweetPopup.classList.remove('hidden');
                
                if (data.type === "kiss" || data.type === "hug") triggerConfetti();
                if (Notification.permission === "granted") sendNotification(`💖 ${data.sender} sent ${data.text}!`, "Open the app to reply.");

                setTimeout(() => { sweetPopup.classList.add('hidden'); }, 4000);
                localStorage.setItem('last_gesture_time', data.timestamp);
            }
        }
    });
}

// --- CHAT LOGIC ---
btnSendChat.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChatMessage(); });

async function sendChatMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    
    chatInput.value = "";
    await addDoc(collection(db, "cozy_room_chats"), {
        sender: MY_NAME,
        text: text,
        timestamp: Date.now()
    });
}

function listenForChats() {
    const q = query(collection(db, "cozy_room_chats"), orderBy("timestamp", "asc"), limit(50));
    onSnapshot(q, (snapshot) => {
        chatMessages.innerHTML = "";
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const isMine = data.sender === MY_NAME;
            
            const bubble = document.createElement('div');
            bubble.className = `msg-bubble ${isMine ? 'msg-mine' : 'msg-theirs'}`;
            
            const time = new Date(data.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            bubble.innerHTML = `
                ${!isMine ? `<div class="msg-sender">${data.sender}</div>` : ''}
                <div>${data.text}</div>
                <div style="font-size:0.6rem; text-align:right; margin-top:3px; opacity:0.7;">${time}</div>
            `;
            chatMessages.appendChild(bubble);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

// --- TRACKER DATA LOGIC ---
async function loadTodayData() {
    try {
        const snap = await getDoc(getDocRef());
        if (snap.exists()) {
            updateUI(snap.data());
        } else {
            const initialData = { waterCount: 0, lastWaterTime: null, medTaken: false, sleepHours: 0, date: getTodayStr(), timestamp: Date.now(), notifsSent: { med: false, sleep: false } };
            await setDoc(getDocRef(), initialData);
            updateUI(initialData);
        }
        lastLoadedDate = getTodayStr();
    } catch (e) {
        affirmationText.innerText = "Offline Mode";
    }
}

function updateUI(data) {
    lblWaterCount.innerText = `${data.waterCount || 0} cups`;
    if (data.lastWaterTime) {
        const d = new Date(data.lastWaterTime);
        lblWaterTime.innerText = `Last: ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
    } else lblWaterTime.innerText = "No water yet";

    if (data.medTaken) {
        btnMed.innerText = "Taken ✔"; btnMed.classList.add('taken'); btnMed.disabled = true;
        lblMed.innerText = "Good job! 💙";
    } else {
        btnMed.innerText = "Mark Taken"; btnMed.classList.remove('taken'); btnMed.disabled = false;
        lblMed.innerText = "Not taken";
    }

    if (data.sleepHours) {
        inpSleep.value = data.sleepHours; lblSleep.innerText = "Saved ✔";
    } else {
        inpSleep.value = ""; lblSleep.innerText = "Log hours";
    }
}

btnWater.addEventListener('click', async () => {
    const now = Date.now();
    let count = parseInt(lblWaterCount.innerText) || 0; count++;
    lblWaterCount.innerText = `${count} cups`;
    await updateDoc(getDocRef(), { waterCount: count, lastWaterTime: now });
    const d = new Date(now);
    lblWaterTime.innerText = `Last: ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
    markActiveToday(); 
});

btnMed.addEventListener('click', async () => {
    btnMed.innerText = "Taken ✔"; btnMed.classList.add('taken'); btnMed.disabled = true;
    lblMed.innerText = "Good job! 💙";
    triggerConfetti();
    await updateDoc(getDocRef(), { medTaken: true });
    markActiveToday();
});

btnSleep.addEventListener('click', async () => {
    const h = parseFloat(inpSleep.value);
    if (!h) return;
    lblSleep.innerText = "Saving...";
    triggerConfetti();
    await updateDoc(getDocRef(), { sleepHours: h });
    lblSleep.innerText = "Saved ✔";
    markActiveToday();
});

// --- STREAK LOGIC ---
async function checkStreak() {
    const userDocRef = doc(db, "users", USER_ID);
    const snap = await getDoc(userDocRef);
    const today = getTodayStr();
    let streak = 0; let lastActive = null;

    if (snap.exists()) { const d = snap.data(); streak = d.streak || 0; lastActive = d.lastActiveDate; }

    const y = new Date(); y.setDate(y.getDate() - 1);
    const yStr = `${y.getFullYear()}-${String(y.getMonth()+1).padStart(2,'0')}-${String(y.getDate()).padStart(2,'0')}`;

    if (lastActive === today) updateStreakUI(streak, true);
    else if (lastActive === yStr) updateStreakUI(streak, false);
    else {
        if (streak > 0) { streak = 0; await updateDoc(userDocRef, { streak: 0 }); }
        updateStreakUI(0, false);
    }
}

function updateStreakUI(count, isTodayDone) {
    streakBadge.classList.remove('hidden');
    let title = "🔥";
    if (count >= 30) title = "💎 Hashira"; // Demon Slayer Theme!
    else if (count >= 14) title = "⚡ Thunder";
    else if (count >= 7) title = "🌟 Star";
    else if (count >= 3) title = "✨ On Fire";

    if (isTodayDone) {
        streakBadge.classList.add('active'); streakBadge.innerHTML = `${title} ${count} (Saved!)`;
    } else {
        streakBadge.classList.remove('active'); streakBadge.innerHTML = `${title} ${count}`;
    }
}

async function markActiveToday() {
    const userDocRef = doc(db, "users", USER_ID);
    const snap = await getDoc(userDocRef);
    const today = getTodayStr();
    let currentStreak = 0; let lastActive = "";

    if (snap.exists()) { const d = snap.data(); currentStreak = d.streak || 0; lastActive = d.lastActiveDate; }

    if (lastActive !== today) {
        const newStreak = currentStreak + 1;
        await setDoc(userDocRef, { streak: newStreak, lastActiveDate: today }, { merge: true });
        updateStreakUI(newStreak, true);
        affirmationText.innerText = "Streak Increased! You're on fire! 🔥";
    }
}

// --- HISTORY LOGIC ---
btnHistory.addEventListener('click', async () => { modalHistory.classList.remove('hidden'); await renderHistoryList(); });
closeHistory.addEventListener('click', () => modalHistory.classList.add('hidden'));

async function renderHistoryList() {
    historyList.innerHTML = '<p style="text-align:center;">Loading...</p>';
    try {
        const q = query(collection(db, "users", USER_ID, "dailyLogs"), orderBy("date", "desc"), limit(10));
        const snaps = await getDocs(q);
        historyList.innerHTML = "";
        if (snaps.empty) { historyList.innerHTML = "<p style='text-align:center;'>No history yet.</p>"; return; }
        snaps.forEach((docSnap) => {
            const d = docSnap.data();
            const dateNice = new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
            const div = document.createElement('div'); div.className = 'history-item';
            div.innerHTML = `<div class="h-info"><span class="h-date">${dateNice}</span><span class="h-stats">💧 ${d.waterCount || 0} | 😴 ${d.sleepHours || 0}h</span></div><button class="btn-delete" style="border:none; background:none; font-size:1.2rem;">🗑️</button>`;
            div.querySelector('.btn-delete').addEventListener('click', () => deleteEntry(d.date));
            historyList.appendChild(div);
        });
    } catch (e) { console.error(e); }
}

async function deleteEntry(dateStr) {
    if(!confirm("Delete this log?")) return;
    await deleteDoc(doc(db, "users", USER_ID, "dailyLogs", dateStr));
    await renderHistoryList(); 
}

// --- BACKGROUND TASKS & ADMIN BROADCASTS ---
function listenForBroadcasts() {
    onSnapshot(doc(db, "broadcasts", "latest"), (docSnap) => {
        if (docSnap.exists()) {
            const msg = docSnap.data();
            const lastMsgTime = parseInt(localStorage.getItem('last_broadcast_id')) || 0;
            const now = Date.now();
            if (msg.timestamp > lastMsgTime && msg.timestamp > (now - 86400000)) {
                if (Notification.permission === "granted") sendNotification(msg.title, msg.body);
                affirmationText.innerText = `📢 ${msg.title}: ${msg.body}`;
                setTimeout(() => startAffirmations(), 15000);
                localStorage.setItem('last_broadcast_id', msg.timestamp);
            }
        }
    });
}

async function backgroundLoop() {
    const currentDay = getTodayStr();
    if (currentDay !== lastLoadedDate) {
        dateBadge.innerText = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        await loadTodayData(); return; 
    }

    if (Notification.permission !== "granted") return;
    const snap = await getDoc(getDocRef());
    if (!snap.exists()) return;
    
    const data = snap.data(); const now = Date.now(); const currentHour = new Date().getHours();
    if (currentHour >= 0 && currentHour < 6) return; // Quiet hours

    if (data.lastWaterTime && (now - data.lastWaterTime > 7200000)) {
        sendNotification("Kiddo, have some water! 💧", "Hydrate now!");
        await updateDoc(getDocRef(), { lastWaterTime: now }); 
    } else if (data.waterCount === 0 && currentHour >= 9) {
        sendNotification("Good morning! ☀️", "Start your day with a glass of water 💧");
        await updateDoc(getDocRef(), { lastWaterTime: now }); 
    }
    
    if (currentHour === 22 && !data.medTaken) {
        if (!data.notifsSent || !data.notifsSent.med) {
            sendNotification("Medicine Reminder 💊", "Please take your meds now!");
            await updateDoc(getDocRef(), { "notifsSent.med": true });
        }
    }
    
    if (currentHour === 23 && !data.sleepHours) {
        if (!data.notifsSent || !data.notifsSent.sleep) {
            sendNotification("Go to sleep, kiddo 😴", "It's late.");
            await updateDoc(getDocRef(), { "notifsSent.sleep": true });
        }
    }
}

function sendNotification(title, body) {
    if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'NOTIFY', title, body });
    } else {
        new Notification(title, { body, icon: "https://via.placeholder.com/128/8ac6d1/ffffff?text=💙" });
    }
}
