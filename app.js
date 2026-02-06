import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, query, limit, orderBy, getDocs, deleteDoc, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

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

// Enable Offline Persistence
enableIndexedDbPersistence(db).catch(err => console.log("Persistence Error:", err.code));

const USER_ID = "chirkut_user_001";

// --- DATE HELPER (Manual Fix) ---
const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getDocRef = () => doc(db, "users", USER_ID, "dailyLogs", getTodayStr());

let lastLoadedDate = getTodayStr();

// --- DOM ELEMENTS ---
const appContainer = document.getElementById('app-container');
const loadingScreen = document.getElementById('loading-screen');
const affirmationText = document.getElementById('affirmation-text');
const dateBadge = document.getElementById('display-date');
const streakBadge = document.getElementById('streak-badge');
const streakCountSpan = streakBadge.querySelector('span');
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
const btnInstall = document.getElementById('btn-install');
const btnCalendar = document.getElementById('btn-calendar'); // Ensure this exists in HTML

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
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');

    dateBadge.innerText = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    startAffirmations();

    await loadTodayData();
    await checkStreak();

    setTimeout(() => {
        loadingScreen.style.display = 'none';
        appContainer.classList.remove('hidden');
    }, 1500);

    // Check every minute
    setInterval(backgroundLoop, 60000);
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
        const snap = await getDoc(getDocRef());
        if (snap.exists()) {
            updateUI(snap.data());
        } else {
            const initialData = {
                waterCount: 0, lastWaterTime: null, medTaken: false, sleepHours: 0,
                date: getTodayStr(), timestamp: Date.now(),
                // Store regular notification status in cloud
                notifsSent: { med: false, sleep: false }
            };
            await setDoc(getDocRef(), initialData);
            updateUI(initialData);
        }
        lastLoadedDate = getTodayStr();
    } catch (e) {
        console.error(e);
        affirmationText.innerText = "Offline Mode (Saved Locally)";
    }
}

function updateUI(data) {
    lblWaterCount.innerText = `${data.waterCount || 0} cups`;
    if (data.lastWaterTime) {
        const d = new Date(data.lastWaterTime);
        lblWaterTime.innerText = `Last: ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
    } else {
        lblWaterTime.innerText = "No water yet";
    }

    if (data.medTaken) {
        btnMed.innerText = "Taken ✔"; btnMed.classList.add('taken'); btnMed.disabled = true;
        lblMed.innerText = "Good job! 💙";
    } else {
        btnMed.innerText = "Mark Taken"; btnMed.classList.remove('taken'); btnMed.disabled = false;
        lblMed.innerText = "Not taken";
    }

    if (data.sleepHours) {
        inpSleep.value = data.sleepHours;
        lblSleep.innerText = "Saved ✔";
    } else {
        inpSleep.value = "";
        lblSleep.innerText = "Log hours";
    }
}

// --- BUTTONS ---
btnWater.addEventListener('click', async () => {
    const now = Date.now();
    let count = parseInt(lblWaterCount.innerText) || 0;
    count++;
    lblWaterCount.innerText = `${count} cups`;
    
    await updateDoc(getDocRef(), { waterCount: count, lastWaterTime: now });
    
    const d = new Date(now);
    lblWaterTime.innerText = `Last: ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
    markActiveToday(); 
});

btnMed.addEventListener('click', async () => {
    btnMed.innerText = "Taken ✔"; btnMed.classList.add('taken'); btnMed.disabled = true;
    lblMed.innerText = "Good job! 💙";
    await updateDoc(getDocRef(), { medTaken: true });
    markActiveToday();
});

btnSleep.addEventListener('click', async () => {
    const h = parseFloat(inpSleep.value);
    if (!h) return;
    lblSleep.innerText = "Saving...";
    await updateDoc(getDocRef(), { sleepHours: h });
    lblSleep.innerText = "Saved ✔";
    markActiveToday();
});

// --- STREAK ---
async function checkStreak() {
    const userDocRef = doc(db, "users", USER_ID);
    const snap = await getDoc(userDocRef);
    const today = getTodayStr();
    let streak = 0;
    let lastActive = null;

    if (snap.exists()) {
        const d = snap.data();
        streak = d.streak || 0;
        lastActive = d.lastActiveDate;
    }

    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yesterdayStr = `${y.getFullYear()}-${String(y.getMonth()+1).padStart(2,'0')}-${String(y.getDate()).padStart(2,'0')}`;

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

// --- HISTORY ---
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
                <div class="h-info"><span class="h-date">${dateNice}</span><span class="h-stats">💧 ${d.waterCount || 0} | 😴 ${d.sleepHours || 0}h</span></div>
                <button class="btn-delete" style="border:none; background:none; font-size:1.2rem;">🗑️</button>
            `;
            div.querySelector('.btn-delete').addEventListener('click', () => deleteEntry(d.date));
            historyList.appendChild(div);
        });
    } catch (error) {
        console.error("History Error:", error);
    }
}

async function deleteEntry(dateStr) {
    if(!confirm("Delete this log?")) return;
    await deleteDoc(doc(db, "users", USER_ID, "dailyLogs", dateStr));
    await renderHistoryList(); 
}

// --- BACKGROUND CHECK LOOP (The "Robot") ---
async function backgroundLoop() {
    const currentDay = getTodayStr();
    
    // 1. Midnight Reset
    if (currentDay !== lastLoadedDate) {
        console.log("Midnight! Refreshing...");
        dateBadge.innerText = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        await loadTodayData(); 
        return; 
    }

    // 2. CHECK FOR BROADCASTS (Admin Messages)
    try {
        const broadcastRef = doc(db, "broadcasts", "latest");
        const broadcastSnap = await getDoc(broadcastRef);

        if (broadcastSnap.exists()) {
            const msg = broadcastSnap.data();
            
            // We use LocalStorage here purely to remember "I have seen this specific message"
            const lastMsgTime = parseInt(localStorage.getItem('last_broadcast_id')) || 0;
            const now = Date.now();

            // Is the message newer than the last one we saw?
            // AND is it less than 24 hours old? (Don't show ancient news to new users)
            if (msg.timestamp > lastMsgTime && msg.timestamp > (now - 86400000)) {
                
                console.log("New System Broadcast Received:", msg.title);
                
                if (Notification.permission === "granted") {
                    sendNotification(msg.title, msg.body);
                } else {
                    affirmationText.innerText = `📢 ${msg.title}: ${msg.body}`;
                    setTimeout(() => startAffirmations(), 15000);
                }
                
                // Mark this specific message timestamp as seen
                localStorage.setItem('last_broadcast_id', msg.timestamp);
            }
        }
    } catch (e) {
        console.log("Broadcast check silent fail");
    }

    // 3. REGULAR REMINDERS (Water, Meds, Sleep)
    if (Notification.permission !== "granted") return;
    const snap = await getDoc(getDocRef());
    if (!snap.exists()) return;
    
    const data = snap.data();
    const now = Date.now();
    const currentHour = new Date().getHours();

    // Water
    if (currentHour >= 7 && data.lastWaterTime && (now - data.lastWaterTime > 7200000)) {
        sendNotification("Kiddo, have some water! 💧", "Hydrate now!");
        await updateDoc(getDocRef(), { lastWaterTime: now }); 
    }
    
    // Meds
    if (currentHour === 22 && !data.medTaken) {
        if (!data.notifsSent || !data.notifsSent.med) {
            sendNotification("Medicine Reminder 💊", "Please take your meds now!");
            await updateDoc(getDocRef(), { "notifsSent.med": true });
        }
    }
    
    // Sleep
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

// --- CALENDAR LOGIC (Optional) ---
if (btnCalendar) {
    btnCalendar.addEventListener('click', () => {
        const medLink = "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Medicine+Reminder+💊&details=Time+for+self-care!&dates=20240201T220000/20240201T221500&recur=RRULE:FREQ=DAILY";
        const sleepLink = "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Go+to+Sleep+😴&details=Put+the+phone+away.&dates=20240201T230000/20240201T233000&recur=RRULE:FREQ=DAILY";

        if(confirm("Open Google Calendar to set permanent alarms?")) {
            window.open(medLink, '_blank');
            setTimeout(() => { if(confirm("Add Sleep Reminder too?")) window.open(sleepLink, '_blank'); }, 1000);
        }
    });
}

btnTestNotif.addEventListener('click', () => {
    if (Notification.permission !== "granted") Notification.requestPermission();
    sendNotification("Chirkut Test 🔔", "This is how I will remind you!");
});

// INSTALL APP
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
