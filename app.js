// --- FIREBASE CONFIGURATION ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// REPLACE WITH YOUR ACTUAL FIREBASE CONFIG
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- STATE & UTILS ---
const USER_ID = "chirkut_user_001"; // In a real app, use Auth or UUID
const docRef = doc(db, "users", USER_ID);

const affirmations = [
    "You are doing your best, and that is enough.",
    "Breathe in calm, breathe out stress.",
    "Small steps lead to big changes.",
    "You are loved, you are valued.",
    "Take your time, there is no rush.",
    "Be gentle with yourself today.",
    "Sending you a virtual hug.",
    "Your health is your wealth, take care.",
    "It's okay to rest."
];

// --- DOM ELEMENTS ---
const loadingScreen = document.getElementById('loading-screen');
const appContent = document.getElementById('app-content');
const affirmationText = document.getElementById('affirmation-text');
const btnWater = document.getElementById('btn-water');
const statusWater = document.getElementById('water-status');
const inputSleep = document.getElementById('sleep-input');
const btnSleep = document.getElementById('btn-sleep');
const msgSleep = document.getElementById('sleep-msg');
const btnMed = document.getElementById('btn-med');
const statusMed = document.getElementById('med-status');

// --- 1. LOADING SCREEN & INIT ---
window.addEventListener('load', () => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('Service Worker Registered'));
    }

    // Request Notification Permission
    if (Notification.permission !== "granted") {
        Notification.requestPermission();
    }

    // 1.5s Loading Delay
    setTimeout(() => {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            appContent.classList.remove('hidden');
            // Trigger reflow
            void appContent.offsetWidth; 
            appContent.classList.add('visible');
            loadUserData(); // Fetch from Firebase
        }, 500);
    }, 1500);

    // Start Affirmation Rotation
    startAffirmations();
    
    // Start Background Checks
    setInterval(checkReminders, 60000); // Check every minute
});

// --- 2. AFFIRMATION SYSTEM ---
function startAffirmations() {
    let index = 0;
    setInterval(() => {
        affirmationText.classList.add('fade-out');
        
        setTimeout(() => {
            index = (index + 1) % affirmations.length;
            affirmationText.innerText = affirmations[index];
            affirmationText.classList.remove('fade-out');
        }, 800); // Wait for fade out
    }, 20000); // Change every 20 seconds
}

// --- DATA LOGIC (FIREBASE) ---

// Helper to get today's date string (YYYY-MM-DD) for reset logic
const getTodayStr = () => new Date().toISOString().split('T')[0];

async function loadUserData() {
    try {
        const docSnap = await getDoc(docRef);
        const today = getTodayStr();
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Check Midnight Reset
            if (data.currentDate !== today) {
                // Reset daily values
                await resetDailyValues(today);
            } else {
                updateUI(data);
            }
        } else {
            // First time user
            await resetDailyValues(today);
        }
    } catch (e) {
        console.error("Error loading data:", e);
    }
}

async function resetDailyValues(dateStr) {
    const freshData = {
        currentDate: dateStr,
        dailyWaterCount: 0,
        lastWaterTime: Date.now(), // Reset timer
        sleepHours: 0,
        medicineTaken: false,
        medicineTakenAt: null
    };
    await setDoc(docRef, freshData);
    updateUI(freshData);
}

function updateUI(data) {
    // Water
    if(data.lastWaterTime) {
        const date = new Date(data.lastWaterTime);
        statusWater.innerText = `Last sip: ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    }

    // Sleep
    if(data.sleepHours > 0) {
        inputSleep.value = data.sleepHours;
        msgSleep.innerText = "Sleep logged 🌙";
    }

    // Medicine
    if (data.medicineTaken) {
        btnMed.innerText = "Medicine Taken 💙";
        btnMed.classList.add('active');
        btnMed.disabled = true;
        statusMed.innerText = "Good job taking care of yourself!";
    }
}

// --- 4. WATER TRACKER ---
btnWater.addEventListener('click', async () => {
    const now = Date.now();
    
    // Optimistic UI update
    const date = new Date(now);
    statusWater.innerText = `Last sip: ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    
    // Update Firebase
    await updateDoc(docRef, {
        lastWaterTime: now,
        // increment count logic if needed
    });
});

// --- 5. SLEEP TRACKER ---
btnSleep.addEventListener('click', async () => {
    const hours = parseFloat(inputSleep.value);
    if (!hours || hours < 0) return;

    msgSleep.innerText = "Saving...";
    
    await updateDoc(docRef, {
        sleepHours: hours
    });
    
    msgSleep.innerText = "Sleep logged successfully 🌙";
});

// --- 6. MEDICINE TRACKER ---
btnMed.addEventListener('click', async () => {
    btnMed.innerText = "Medicine Taken 💙";
    btnMed.classList.add('active');
    btnMed.disabled = true;
    statusMed.innerText = "Good job taking care of yourself!";

    await updateDoc(docRef, {
        medicineTaken: true,
        medicineTakenAt: Date.now()
    });
});

// --- 7. NOTIFICATION LOGIC ---
function sendNotification(title, body) {
    if (Notification.permission === "granted") {
        // Try Service Worker notification first (for mobile support)
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'NOTIFY',
                title: title,
                body: body
            });
        } else {
            // Fallback
            new Notification(title, { body: body, icon: '💙' });
        }
    }
}

async function checkReminders() {
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;
    
    const data = docSnap.data();
    const now = Date.now();

    // A) WATER REMINDER (2 hours = 7200000 ms)
    // Check if 2 hours passed since last water
    if (now - data.lastWaterTime > 7200000) {
        sendNotification("Chirkut Reminder", "Pani pilo kiddo 💧");
        // Update lastWaterTime to now so we don't spam every minute
        // In a real app, we might have a 'lastNotificationSent' field instead
        await updateDoc(docRef, { lastWaterTime: now }); 
    }

    // B) MEDICINE REMINDER (10:00 PM = 22:00)
    const currentHour = new Date().getHours();
    
    // Trigger only if it's past 10 PM, med not taken, and we haven't notified today
    // Note: Simple logic here. Ideally, store 'medNotificationSent: boolean' in DB
    if (currentHour >= 22 && !data.medicineTaken) {
        // We need a local storage check to ensure we only send this ONCE per session/day
        const lastMedNotif = localStorage.getItem('lastMedNotification');
        const today = getTodayStr();

        if (lastMedNotif !== today) {
            sendNotification("Chirkut Reminder", "Did you take your medicine today? 💊");
            localStorage.setItem('lastMedNotification', today);
        }
    }
}

