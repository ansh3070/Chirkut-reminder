import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, query, limit, orderBy, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// --- FIREBASE CONFIG (Already Correct) ---
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

const affirmations = [
    "You are worthy of care 💙", "One sip at a time.", "Gentle reminder: Unclench your jaw.",
    "You are doing enough.", "Rest is productive too.", "Be kind to yourself today."
];

// --- INITIALIZATION ---
window.addEventListener('load', async () => {
    // 1. Service Worker Register
    if ('serviceWorker' in navigator) {
        try {
            const reg = await navigator.serviceWorker.register('./sw.js');
            console.log("SW Registered:", reg);
        } catch (err) {
            console.log("SW Failed:", err);
        }
    }

    // 2. UI Setup
    dateBadge.innerText = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    startAffirmations();

    // 3. Load Data
    await loadTodayData();

    // 4. Reveal App
    setTimeout(() => {
        loadingScreen.style.display = 'none';
        appContainer.classList.remove('hidden'); // This triggers CSS opacity transition
    }, 1500);
});

// --- AFFIRMATION ROTATION ---
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

// --- DATA HANDLING ---
async function loadTodayData() {
    try {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            updateUI(snap.data());
        } else {
            const initialData = {
                waterCount: 0, lastWaterTime: null, medTaken: false, sleepHours: 0,
                date: getTodayStr(), timestamp: Date.now()
            };
            await setDoc(docRef, initialData);
            updateUI(initialData);
        }
    } catch (e) {
        console.error("Firebase Error:", e);
        // Alert user if permission issue
        if(e.code === 'permission-denied') {
            affirmationText.innerText = "Error: Database locked. Fix Rules in Console.";
            affirmationText.style.color = "red";
        }
    }
}

function updateUI(data) {
    lblWaterCount.innerText = `${data.waterCount || 0} cups`;
    if (data.lastWaterTime) {
        const d = new Date(data.lastWaterTime);
        lblWaterTime.innerText = `Last: ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
    }
    if (data.medTaken) {
        btnMed.innerText = "Taken ✔";
        btnMed.classList.add('taken');
        btnMed.disabled = true;
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
    lblWaterCount.innerText = `${count} cups`; // Optimistic update
    
    await updateDoc(docRef, { waterCount: count, lastWaterTime: now });
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

// --- HISTORY & DELETE LOGIC ---
btnHistory.addEventListener('click', loadHistory);
closeHistory.addEventListener('click', () => modalHistory.classList.add('hidden'));

async function loadHistory() {
    modalHistory.classList.remove('hidden');
    historyList.innerHTML = '<p style="text-align:center; margin-top:20px;">Loading...</p>';

    const historyRef = collection(db, "users", USER_ID, "dailyLogs");
    const q = query(historyRef, orderBy("date", "desc"), limit(10));
    const snaps = await getDocs(q);

    historyList.innerHTML = "";
    if (snaps.empty) {
        historyList.innerHTML = "<p style='text-align:center; padding:20px;'>No history yet.</p>";
        return;
    }

    snaps.forEach((docSnap) => {
        const d = docSnap.data();
        const dateObj = new Date(d.date);
        const dateNice = dateObj.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
        
        // Create Item
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <div class="h-info">
                <span class="h-date">${dateNice}</span>
                <span class="h-stats">💧 ${d.waterCount || 0} | 😴 ${d.sleepHours || 0}h | ${d.medTaken ? '💊 Yes' : 'No Meds'}</span>
            </div>
            <div class="h-actions">
                <button class="btn-delete" data-date="${d.date}">🗑️</button>
            </div>
        `;
        historyList.appendChild(div);
    });

    // Attach Delete Events
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => deleteEntry(e.target.dataset.date));
    });
}

async function deleteEntry(dateStr) {
    if(!confirm("Delete this entry?")) return;
    
    // UI Remove immediately
    loadHistory(); 

    // DB Delete
    const entryRef = doc(db, "users", USER_ID, "dailyLogs", dateStr);
    await deleteDoc(entryRef);
}

// --- NOTIFICATION FIX ---
btnTestNotif.addEventListener('click', () => {
    // 1. Request Permission if not granted
    if (Notification.permission !== "granted") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") sendTestNotif();
            else alert("Permission blocked. Reset browser settings for this site.");
        });
    } else {
        sendTestNotif();
    }
});

function sendTestNotif() {
    const title = "Chirkut Reminder 🔔";
    const options = {
        body: "This is a test! You are amazing.",
        icon: 'https://via.placeholder.com/128/8ac6d1/ffffff?text=💙'
    };

    // METHOD A: Service Worker (Better for Android)
    if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'NOTIFY', title: title, body: options.body
        });
        console.log("Sent via Service Worker");
    } 
    // METHOD B: Direct (Fallback)
    else {
        new Notification(title, options);
        console.log("Sent via Direct API");
    }
}
