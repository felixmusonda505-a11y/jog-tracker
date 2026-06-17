let map = null;
let pathLine = null;
let runCoordinates = [];
let watchId = null;
let timerId = null;
let startTime = null;
let totalDistance = 0;
let lastPosition = null;
let nextMilestone = 1;

// Interface Core Elements
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const distanceDisplay = document.getElementById('distance');
const durationDisplay = document.getElementById('duration');
const themeToggle = document.getElementById('theme-toggle');
const streakVal = document.getElementById('streak-val');
const recordVal = document.getElementById('record-val');
const historyFeed = document.getElementById('history-feed');

// 1. Theme Configuration Engine
const currentTheme = localStorage.getItem('ios_theme') || 'light';
if (currentTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeToggle.textContent = 'Light Mode';
}

themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        themeToggle.textContent = 'Dark Mode';
        localStorage.setItem('ios_theme', 'light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.textContent = 'Light Mode';
        localStorage.setItem('ios_theme', 'dark');
    }
    setTimeout(() => { map.invalidateSize(); }, 200); // Forces structural redraw of Leaflet container canvas
});

// 2. Embedded Leaflet Mapping Engine Framework Initializer
function initializeMap() {
    // Default fallback display target to coordinates centered roughly over Europe if geolocation drops out
    map = L.map('map-container', {
        zoomControl: false,
        attributionControl: false
    }).setView([51.505, -0.09], 15);

    L.tileLayer('https://{s}://{z}/{x}/{y}{r}.png', {
        maxZoom: 19
    }).addTo(map);

    pathLine = L.polyline([], { color: '#007aff', weight: 5, opacity: 0.9 }).addTo(map);

    // Attempt to quickly reposition local view map canvas directly over runner prior to tracking activation
    navigator.geolocation.getCurrentPosition((pos) => {
        map.setView([pos.coords.latitude, pos.coords.longitude], 16);
    }, () => {}, { enableHighAccuracy: true });
}

// 3. Precise Tracking Execution Engine
const geoOptions = {
    enableHighAccuracy: true,
    timeout: 8000,
    maximumAge: 0
};

startBtn.addEventListener('click', () => {
    if (!navigator.geolocation) return alert("System Hardware Error: Geolocation Missing.");

    // Clean tracking metrics memory cache arrays
    totalDistance = 0;
    lastPosition = null;
    nextMilestone = 1;
    runCoordinates = [];
    pathLine.setLatLngs([]);
    distanceDisplay.textContent = "0.00";
    durationDisplay.textContent = "00:00";
    startTime = Date.now();

    startBtn.style.display = 'none';
    stopBtn.style.display = 'block';

    speak("Starting outdoor workout.");
    timerId = setInterval(updateUIClock, 1000);
    watchId = navigator.geolocation.watchPosition(processGPSHit, () => {}, geoOptions);
});

stopBtn.addEventListener('click', () => {
    if (watchId) navigator.geolocation.clearWatch(watchId);
    if (timerId) clearInterval(timerId);

    speak(`Workout complete. Distance ${totalDistance.toFixed(2)} kilometers.`);
    saveWorkoutToMemory(totalDistance.toFixed(2), durationDisplay.textContent);

    startBtn.style.display = 'block';
    stopBtn.style.display = 'none';
    evaluateRecordsAndStreaks();
});

function processGPSHit(position) {
    const coords = position.coords;
    if (coords.accuracy > 20) return; // Drop low-grade noisy bounce pings

    const currentLatLng = [coords.latitude, coords.longitude];
    runCoordinates.push(currentLatLng);
    pathLine.setLatLngs(runCoordinates);
    map.panTo(currentLatLng);

    if (lastPosition) {
        const delta = computeHaversineMath(
            lastPosition.latitude, lastPosition.longitude,
            coords.latitude, coords.longitude
        );

        if (delta > 0.002) { // 2-meter physical movement filter threshold barrier
            totalDistance += delta;
            distanceDisplay.textContent = totalDistance.toFixed(2);
            if (totalDistance >= nextMilestone) {
                speak(`Milestone: ${nextMilestone} kilometers.`);
                if (navigator.vibrate) navigator.vibrate(200);
                nextMilestone++;
            }
        }
    }
    lastPosition = coords;
}

function computeHaversineMath(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth KM radius constant integer value
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * dLon/2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function updateUIClock() {
    const secondsElapsed = Math.floor((Date.now() - startTime) / 1000);
    const m = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
    const s = (secondsElapsed % 60).toString().padStart(2, '0');
    durationDisplay.textContent = `${m}:${s}`;
}

function speak(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    }
}

// 4. Personal Records, Streaks, & Logs Pipeline Management Engine
function saveWorkoutToMemory(dist, time) {
    let history = JSON.parse(localStorage.getItem('ios_jog_logs')) || [];
    const todayStr = new Date().toLocaleDateString();
    history.unshift({ date: todayStr, distance: parseFloat(dist), duration: time, timestamp: Date.now() });
    localStorage.setItem('ios_jog_logs', JSON.stringify(history));
}

function evaluateRecordsAndStreaks() {
    let history = JSON.parse(localStorage.getItem('ios_jog_logs')) || [];
    historyFeed.innerHTML = '';

    if (history.length === 0) {
        historyFeed.innerHTML = '<div style="color:var(--text-sub); font-size:14px; padding:10px 0;">No active logs.</div>';
        streakVal.textContent = "0 🔥";
        recordVal.textContent = "0.00 🏆";
        return;
    }

    // Process Personal Best Parameter Match
    let bestRun = 0;
    history.forEach(run => {
        if (run.distance > bestRun) bestRun = run.distance;
        
        const card = document.createElement('div');
        card.className = 'history-item';
        card.innerHTML = `
            <div class="history-date">${run.date}</div>
            <div class="history-meta">${run.distance.toFixed(2)} km &nbsp;&bull;&nbsp; ${run.duration}</div>
        `;
        historyFeed.appendChild(card);
    });
    recordVal.textContent = `${bestRun.toFixed(2)} 🏆`;

    // Process Streak Logic Engine Pipeline
    let uniqueRunningDates = new Set(history.map(run => new Date(run.timestamp).toDateString()));
    let streakCount = 0;
    let checkDate = new Date();

    while (uniqueRunningDates.has(checkDate.toDateString())) {
        streakCount++;
        checkDate.setDate(checkDate.getDate() - 1);
    }
    
    // If user skipped running today, check if they ran yesterday to keep streak active
    if (streakCount === 0) {
        checkDate = new Date();
        checkDate.setDate(checkDate.getDate() - 1);
        while (uniqueRunningDates.has(checkDate.toDateString())) {
            streakCount++;
            checkDate.setDate(checkDate.getDate() - 1);
        }
    }
    streakVal.textContent = `${streakCount} 🔥`;
}

// Start Lifecycle Routine Execution
initializeMap();
evaluateRecordsAndStreaks();
