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

// --- STATE ---
const USER_ID = "chirkut_user_001";
const getTodayStr = () => new Date().toISOString().split('T')[0];
const docRef = doc(db, "users", USER_ID, "dailyLogs", getTodayStr());

// --- DOM ELEMENTS ---
const appContainer = document.getElementById('app-container');
const loadingScreen = document.getElementById('loading-screen');
const affirmationText = document.getElementById('affirmation-text');
const dateBadge = document.getElementById('display-date');
const streakBadge = document.getElementById('streak-badge');
const streakCountSpan = streakBadge.querySelector('span');

// Trackers
const btnWater = document.getElementById('btn-water');
const lblWaterCount = document.getElementById('water-count');
const lblWaterTime = document.getElementById('water-last-time');
const btnMed = document.getElementById('btn-med');
const lblMed = document.getElementById('med-status');
const inpSleep = document.getElementById('sleep-input');
const btnSleep = document.getElementById('btn-sleep');
const lblSleep = document.getElementById('sleep-status');

// Footer & Modals
const btnHistory = document.getElementById('btn-history');
const modalHistory = document.getElementById('history-modal');
const closeHistory = document.getElementById('close-history');
const historyList = document.getElementById('history-list');
const btnTestNotif = document.getElementById('btn-test-notif');
const btnInstall = document.getElementById('btn-install');

const affirmations = [
    "Your brain needs water to think clearly. Sip sip! 💧",
    "Meds are a form of self-love, not a chore. 💊",
    "Good sleep tonight means a better tomorrow. 🌙",
    "Hydration is the key to glowing energy. ✨",
    "You deserve to feel healthy and rested.",
    "Be gentle with yourself today 💙"
];

// --- INIT ---
window.addEventListener('load', async () => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js');
    }

    dateBadge.innerText = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    startAffirmations();

    await loadTodayData();
    await checkStreak();

    // Reveal App
    setTimeout(() => {
        loadingScreen.style.display = 'none';
        appContainer.classList.remove('hidden');
    }, 1500);

    // Background Checks
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

// --- BUTTON ACTIONS ---
btnWater.addEventListener('click', async () => {
    const now = Date.now();
    let count = parseInt(lblWaterCount.innerText) || 0;
    count++;
    lblWaterCount.innerText = `${count} cups`;
    
    await updateDoc(docRef, { waterCount: count, lastWaterTime: now });
    const d = new Date(now);
    lblWaterTime.innerText = `Last: ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
    
    markActiveToday(); 
});

btnMed.addEventListener('click', async () => {
    btnMed.innerText = "Taken ✔"; btnMed.classList.add('taken'); btnMed.disabled = true;
    lblMed.innerText = "Good job! 💙";
    await updateDoc(docRef, { medTaken: true });
    
    markActiveToday();
});

btnSleep.addEventListener('click', async () => {
    const h = parseFloat(inpSleep.value);
    if (!h) return;
    lblSleep.innerText = "Saving...";
    await updateDoc(docRef, { sleepHours: h });
    lblSleep.innerText = "Saved ✔";
    
    markActiveToday();
});

// --- STREAK LOGIC ---
async function checkStreak() {
    const userDocRef = doc(db, "users", USER_ID);
    const snap = await getDoc(userDocRef);
    const today = getTodayStr();
    
    let streak = 0;
    let lastActive = null;

    if (snap.exists()) {
        const data = snap.data();
        streak = data.streak || 0;
        lastActive = data.lastActiveDate;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastActive === today) updateStreakUI(streak, true);
    else if (lastActive === yesterdayStr) updateStreakUI(streak, false);
    else {
        if (streak > 0) {
            streak = 0;
            await updateDoc(userDocRef, { streak: 0 });
        }
        updateStreakUI(0, false);
    }
}

function updateStreakUI(count, isTodayDone) {
    streakBadge.classList.remove('hidden');
    streakCountSpan.innerText = count;
    if (isTodayDone) {
        streakBadge.classList.add('active');
        streakBadge.innerHTML = `🔥 ${count} (Day Saved!)`;
    } else {
        streakBadge.classList.remove('active');
        streakBadge.innerHTML = `🔥 ${count}`;
    }
}

async function markActiveToday() {
    const userDocRef = doc(db, "users", USER_ID);
    const snap = await getDoc(userDocRef);
    const today = getTodayStr();
    let currentStreak = 0;
    let lastActive = "";

    if (snap.exists()) {
        const d = snap.data();
        currentStreak = d.streak || 0;
        lastActive = d.lastActiveDate;
    }

    if (lastActive !== today) {
        const newStreak = currentStreak + 1;
        await setDoc(userDocRef, { streak: newStreak, lastActiveDate: today }, { merge: true });
        updateStreakUI(newStreak, true);
        affirmationText.innerText = "Streak Increased! You're on fire! 🔥";
    }
}

// --- HISTORY & DELETE (Corrected) ---
btnHistory.addEventListener('click', async () => {
    modalHistory.classList.remove('hidden');
    await renderHistoryList();
});

closeHistory.addEventListener('click', () => {
    modalHistory.classList.add('hidden');
});

async function renderHistoryList() {
    historyList.innerHTML = '<p style="text-align:center;">Loading...</p>';
    
    try {
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
                    <span class="h-stats">💧 ${d.waterCount || 0} | 😴 ${d.sleepHours || 0}h</span>
                </div>
                <button class="btn-delete" style="border:none; background:none; font-size:1.2rem;">🗑️</button>
            `;
            
            // Attach event listener directly to element
            div.querySelector('.btn-delete').addEventListener('click', () => deleteEntry(d.date));
            historyList.appendChild(div);
        });
    } catch (error) {
        console.error("History Error:", error);
    }
}

async function deleteEntry(dateStr) {
    if(!confirm("Delete this?")) return;
    await deleteDoc(doc(db, "users", USER_ID, "dailyLogs", dateStr));
    await renderHistoryList(); // Refresh without reloading page
}

// --- NOTIFICATIONS ---
async function checkReminders() {
    if (Notification.permission !== "granted") return;
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;
    
    const data = snap.data();
    const now = Date.now();
    const currentHour = new Date().getHours();

    // Water (2 Hours)
    if (data.lastWaterTime && (now - data.lastWaterTime > 7200000)) {
        sendNotification("Kiddo, have some water! 💧", "You haven't drunk water in the past 2 hrs. Hydrate now!");
        await updateDoc(docRef, { lastWaterTime: now }); 
    }
    // Meds (10 PM)
    if (currentHour === 22 && !data.medTaken) {
        const todayStr = getTodayStr();
        if (localStorage.getItem('med_notif') !== todayStr) {
            sendNotification("Medicine Reminder 💊", "Please take your meds now!");
            localStorage.setItem('med_notif', todayStr);
        }
    }
    // Sleep (11 PM)
    if (currentHour === 23 && !data.sleepHours) {
        const todayStr = getTodayStr();
        if (localStorage.getItem('sleep_notif') !== todayStr) {
            sendNotification("Go to sleep, kiddo 😴", "It's late. Get some rest.");
            localStorage.setItem('sleep_notif', todayStr);
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

// Test Button
btnTestNotif.addEventListener('click', () => {
    if (Notification.permission !== "granted") Notification.requestPermission();
    sendNotification("Chirkut Test 🔔", "This is how I will remind you!");
});

// --- INSTALL APP ---
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    btnInstall.classList.remove('hidden');
});
btnInstall.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    btnInstall.classList.add('hidden');
});
window.addEventListener('appinstalled', () => {
    btnInstall.classList.add('hidden');
});

