import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, query, limit, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// --- YOUR FIREBASE CONFIG ---
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
const getTodayStr = () => new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
const docRef = doc(db, "users", USER_ID, "dailyLogs", getTodayStr()); // New Structure

// --- DOM ELEMENTS ---
const appContainer = document.getElementById('app-container');
const loadingScreen = document.getElementById('loading-screen');
const affirmationText = document.getElementById('affirmation-text');
const dateBadge = document.getElementById('display-date');

// Trackers
const btnWater = document.getElementById('btn-water');
const lblWaterCount = document.getElementById('water-count');
const lblWaterTime = document.getElementById('water-last-time');
const btnMed = document.getElementById('btn-med');
const lblMed = document.getElementById('med-status');
const inpSleep = document.getElementById('sleep-input');
const btnSleep = document.getElementById('btn-sleep');
const lblSleep = document.getElementById('sleep-status');

// History & Modals
const btnHistory = document.getElementById('btn-history');
const modalHistory = document.getElementById('history-modal');
const closeHistory = document.getElementById('close-history');
const historyList = document.getElementById('history-list');
const btnTestNotif = document.getElementById('btn-test-notif');

// --- AFFIRMATIONS ---
const affirmations = [
    "You are worthy of care 💙",
    "One sip at a time.",
    "Gentle reminder: Unclench your jaw.",
    "You are doing enough.",
    "Rest is productive too.",
    "Be kind to yourself today."
];

// --- INIT ---
window.addEventListener('load', async () => {
    // 1. Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js');
    }
    
    // 2. Permission
    if (Notification.permission !== "granted") {
        Notification.requestPermission();
    }

    // 3. UI Init
    dateBadge.innerText = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    startAffirmations();

    // 4. Data Load
    await loadTodayData();

    // 5. Hide Loader
    setTimeout(() => {
        loadingScreen.style.display = 'none';
        appContainer.classList.remove('hidden');
        appContainer.classList.add('visible');
    }, 1500);
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

// --- DATA LOGIC (DB) ---
async function loadTodayData() {
    try {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            updateUI(snap.data());
        } else {
            // New day, create doc
            const initialData = {
                waterCount: 0,
                lastWaterTime: null,
                medTaken: false,
                sleepHours: 0,
                date: getTodayStr(),
                timestamp: Date.now() // For sorting
            };
            await setDoc(docRef, initialData);
            updateUI(initialData);
        }
    } catch (e) {
        console.error("Firebase Error:", e);
        affirmationText.innerText = "Offline Mode 💙";
    }
}

function updateUI(data) {
    // Water
    lblWaterCount.innerText = `${data.waterCount || 0} cups`;
    if (data.lastWaterTime) {
        const d = new Date(data.lastWaterTime);
        lblWaterTime.innerText = `Last: ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
    }

    // Meds
    if (data.medTaken) {
        btnMed.innerText = "Taken ✔";
        btnMed.classList.add('taken');
        lblMed.innerText = "Good job! 💙";
        btnMed.disabled = true;
    }

    // Sleep
    if (data.sleepHours) {
        inpSleep.value = data.sleepHours;
        lblSleep.innerText = "Saved ✔";
    }
}

// --- ACTIONS ---

// 1. Water
btnWater.addEventListener('click', async () => {
    const now = Date.now();
    // Optimistic UI
    let currentCount = parseInt(lblWaterCount.innerText) || 0;
    lblWaterCount.innerText = `${currentCount + 1} cups`;
    
    // DB Update
    const snap = await getDoc(docRef); // Get fresh to be safe or use increment
    const count = (snap.exists() ? snap.data().waterCount : 0) + 1;
    
    await updateDoc(docRef, {
        waterCount: count,
        lastWaterTime: now
    });
    
    const d = new Date(now);
    lblWaterTime.innerText = `Last: ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
});

// 2. Medicine
btnMed.addEventListener('click', async () => {
    btnMed.innerText = "Taken ✔";
    btnMed.classList.add('taken');
    btnMed.disabled = true;
    lblMed.innerText = "Good job! 💙";

    await updateDoc(docRef, { medTaken: true });
});

// 3. Sleep
btnSleep.addEventListener('click', async () => {
    const hours = parseFloat(inpSleep.value);
    if (!hours) return;
    
    lblSleep.innerText = "Saving...";
    await updateDoc(docRef, { sleepHours: hours });
    lblSleep.innerText = "Saved ✔";
});

// --- HISTORY VIEWER ---
btnHistory.addEventListener('click', async () => {
    modalHistory.classList.remove('hidden');
    historyList.innerHTML = '<p class="loading-text" style="text-align:center; margin-top:20px;">Loading...</p>';

    // Query last 7 days
    const historyRef = collection(db, "users", USER_ID, "dailyLogs");
    const q = query(historyRef, orderBy("date", "desc"), limit(7));
    
    const querySnapshot = await getDocs(q);
    historyList.innerHTML = ""; // Clear loader

    if(querySnapshot.empty) {
        historyList.innerHTML = "<p style='text-align:center; padding:20px;'>No history yet.</p>";
        return;
    }

    querySnapshot.forEach((doc) => {
        const d = doc.data();
        const dateObj = new Date(d.date);
        const dateNice = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

        const html = `
            <div class="history-item">
                <div>
                    <span class="h-date">${dateNice}</span>
                    <div class="h-stats">
                        💧 ${d.waterCount || 0} cups &nbsp;|&nbsp; 
                        😴 ${d.sleepHours || 0} hrs
                    </div>
                </div>
                <div style="font-size:1.2rem;">
                    ${d.medTaken ? '💊' : '❌'}
                </div>
            </div>
        `;
        historyList.innerHTML += html;
    });
});

closeHistory.addEventListener('click', () => {
    modalHistory.classList.add('hidden');
});

// --- NOTIFICATION TESTER ---
btnTestNotif.addEventListener('click', () => {
    if (Notification.permission === "granted") {
        const title = "Chirkut Test 🔔";
        const body = "This is how your caring reminders will look!";
        
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'NOTIFY', title, body
            });
        } else {
            new Notification(title, { body });
        }
    } else {
        alert("Please enable notifications in your browser settings first.");
        Notification.requestPermission();
    }
});

