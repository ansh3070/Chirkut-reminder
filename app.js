import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, query, limit, orderBy, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// --- FIREBASE CONFIG ---
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

// --- CONSTANTS ---
const USER_ID = "chirkut_user_001";
const getTodayStr = () => new Date().toISOString().split('T')[0];
const docRef = doc(db, "users", USER_ID, "dailyLogs", getTodayStr());

// --- DOM ELEMENTS ---
const appContainer = document.getElementById('app-container');
const loadingScreen = document.getElementById('loading-screen');
const affirmationText = document.getElementById('affirmation-text');
const dateBadge = document.getElementById('display-date');
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
const btnTestNotif = document.getElementById('btn-test-notif');

// --- AFFIRMATIONS ---
const affirmations = [
    "Your brain needs water to think clearly. Sip sip! 💧",
    "Meds are a form of self-love, not a chore. 💊",
    "Good sleep tonight means a better tomorrow. 🌙",
    "Hydration is the key to glowing energy. ✨",
    "You deserve to feel healthy and rested.",
    "Be gentle with yourself today 💙"
];

// --- INITIALIZATION ---
window.addEventListener('load', async () => {
    // 1. Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js');
    }

    // 2. Setup UI
    dateBadge.innerText = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    startAffirmations();

    // 3. Load Data
    await loadTodayData();

    // 4. Reveal App
    setTimeout(() => {
        loadingScreen.style.display = 'none';
        appContainer.classList.remove('hidden');
    }, 1500);

    // 5. START AUTOMATIC CHECKS (Every 1 minute)
    setInterval(checkReminders, 60000);
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

// --- DATA LOGIC ---
async function loadTodayData() {
    try {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            updateUI(snap.data());
        } else {
            const initialData = {
                waterCount: 0, lastWaterTime: Date.now(), medTaken: false, sleepHours: 0,
                date: getTodayStr(), timestamp: Date.now()
            };
            await setDoc(docRef, initialData);
            updateUI(initialData);
        }
    } catch (e) {
        console.error(e);
        affirmationText.innerText = "Offline Mode (Check Console)";
    }
}

function updateUI(data) {
    lblWaterCount.innerText = `${data.waterCount || 0} cups`;
    if (data.lastWaterTime) {
        const d = new Date(data.lastWaterTime);
        lblWaterTime.innerText = `Last: ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
    }
    if (data.medTaken) {
        btnMed.innerText = "Taken ✔"; btnMed.classList.add('taken'); btnMed.disabled = true;
        lblMed.innerText = "Good job! 💙";
    }
    if (data.sleepHours) {
        inpSleep.value = data.sleepHours;
        lblSleep.innerText = "Saved ✔";
    }
}

// --- BUTTONS ---
btnWater.addEventListener('click', async () => {
    const now = Date.now();
    let count = parseInt(lblWaterCount.innerText) || 0;
    count++;
    lblWaterCount.innerText = `${count} cups`;
    
    // Save to DB
    await updateDoc(docRef, { waterCount: count, lastWaterTime: now });
    
    // Update UI Time
    const d = new Date(now);
    lblWaterTime.innerText = `Last: ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
});

btnMed.addEventListener('click', async () => {
    btnMed.innerText = "Taken ✔"; btnMed.classList.add('taken'); btnMed.disabled = true;
    lblMed.innerText = "Good job! 💙";
    await updateDoc(docRef, { medTaken: true });
});

btnSleep.addEventListener('click', async () => {
    const h = parseFloat(inpSleep.value);
    if (!h) return;
    lblSleep.innerText = "Saving...";
    await updateDoc(docRef, { sleepHours: h });
    lblSleep.innerText = "Saved ✔";
});

// --- HISTORY LOGIC ---
btnHistory.addEventListener('click', async () => {
    modalHistory.classList.remove('hidden');
    historyList.innerHTML = '<p style="text-align:center;">Loading...</p>';
    
    const historyRef = collection(db, "users", USER_ID, "dailyLogs");
    const q = query(historyRef, orderBy("date", "desc"), limit(10));
    const snaps = await getDocs(q);

    historyList.innerHTML = "";
    if (snaps.empty) {
        historyList.innerHTML = "<p style='text-align:center;'>No history yet.</p>";
        return;
    }

    snaps.forEach((docSnap) => {
        const d = docSnap.data();
        const dateNice = new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
        
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <div class="h-info">
                <span class="h-date">${dateNice}</span>
                <span class="h-stats">💧 ${d.waterCount || 0} | 😴 ${d.sleepHours || 0}h | ${d.medTaken ? '💊 Yes' : '❌'}</span>
            </div>
            <button class="btn-delete" data-date="${d.date}">🗑️</button>
        `;
        historyList.appendChild(div);
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => deleteEntry(e.target.dataset.date));
    });
});

closeHistory.addEventListener('click', () => modalHistory.classList.add('hidden'));

async function deleteEntry(dateStr) {
    if(!confirm("Delete this?")) return;
    await deleteDoc(doc(db, "users", USER_ID, "dailyLogs", dateStr));
    btnHistory.click();
}

// --- AUTOMATIC NOTIFICATIONS ---
async function checkReminders() {
    if (Notification.permission !== "granted") return;

    const snap = await getDoc(docRef);
    if (!snap.exists()) return;
    
    const data = snap.data();
    const now = Date.now();
    const currentHour = new Date().getHours();

    // 1. WATER CHECK (2 Hours = 7200000 ms)
    // We verify if data.lastWaterTime exists to avoid error on fresh start
    if (data.lastWaterTime && (now - data.lastWaterTime > 7200000)) {
        sendNotification("Kiddo, have some water! 💧", "You haven't drunk water in the past 2 hrs. Hydrate now!");
        
        // Update lastWaterTime so we don't spam every minute.
        // We cheat slightly by updating the DB timestamp so it waits another 2 hours
        await updateDoc(docRef, { lastWaterTime: now }); 
    }

    // 2. MEDICINE CHECK (10 PM)
    if (currentHour === 22 && !data.medTaken) {
        // Simple check: use localStorage to ensure we only send ONCE per day
        const todayStr = getTodayStr();
        if (localStorage.getItem('med_notif') !== todayStr) {
            sendNotification("Medicine Reminder 💊", "Please take your meds now. Your health is the most important thing!");
            localStorage.setItem('med_notif', todayStr);
        }
    }

    // 3. SLEEP CHECK (11 PM)
    if (currentHour === 23 && !data.sleepHours) {
        const todayStr = getTodayStr();
        if (localStorage.getItem('sleep_notif') !== todayStr) {
            sendNotification("Go to sleep, kiddo 😴", "It's late. Put the phone away and get some rest.");
            localStorage.setItem('sleep_notif', todayStr);
        }
    }
}

// Helper for sending
function sendNotification(title, body) {
    if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'NOTIFY', title: title, body: body
        });
    } else {
        new Notification(title, { body: body, icon: "https://via.placeholder.com/128/8ac6d1/ffffff?text=💙" });
    }
}

// --- MANUAL TEST BUTTON (Now cycles through messages) ---
btnTestNotif.addEventListener('click', () => {
    const msgs = [
        { t: "Kiddo, have some water! 💧", b: "You haven't drunk water in the past 2 hrs. Hydrate now!" },
        { t: "Medicine Reminder 💊", b: "Please take your meds now. Your health is the most important thing!" },
        { t: "Go to sleep, kiddo 😴", b: "It's late. Put the phone away and get some rest." }
    ];
    // Pick a random one for testing
    const randomMsg = msgs[Math.floor(Math.random() * msgs.length)];
    
    if (Notification.permission === "granted") {
        sendNotification(randomMsg.t, randomMsg.b);
    } else {
        Notification.requestPermission().then(p => {
            if (p === "granted") sendNotification(randomMsg.t, randomMsg.b);
        });
    }



    // --- INSTALL APP LOGIC ---
const btnInstall = document.getElementById('btn-install');
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    // 1. Prevent Chrome 67+ from automatically showing the prompt
    e.preventDefault();
    // 2. Stash the event so it can be triggered later.
    deferredPrompt = e;
    // 3. Show our custom install button
    btnInstall.classList.remove('hidden');
});

btnInstall.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    // 1. Show the install prompt
    deferredPrompt.prompt();
    // 2. Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    // 3. We've used the prompt, so it can't be used again
    deferredPrompt = null;
    // 4. Hide the button
    btnInstall.classList.add('hidden');
});

// Hide button if app is successfully installed
window.addEventListener('appinstalled', () => {
    btnInstall.classList.add('hidden');
    console.log('App Installed');
});


    
});
