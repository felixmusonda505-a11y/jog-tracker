let watchId = null;
let timerId = null;
let startTime = null;
let totalDistance = 0;
let lastPosition = null;
let nextMilestone = 1; 

// DOM Elements
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const distanceDisplay = document.getElementById('distance');
const durationDisplay = document.getElementById('duration');
const gpsStatus = document.getElementById('gps-status');
const historyList = document.getElementById('history-list');

// High-Accuracy GPS Configurations
const geoOptions = {
    enableHighAccuracy: true, 
    timeout: 10000,            
    maximumAge: 0             
};

// Start Tracking Session
startBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your device.");
        return;
    }

    // Reset values
    totalDistance = 0;
    lastPosition = null;
    nextMilestone = 1;
    distanceDisplay.textContent = "0.00";
    durationDisplay.textContent = "00:00";
    startTime = Date.now();

    // Toggle Buttons UI
    startBtn.style.display = 'none';
    stopBtn.style.display = 'block';
    gpsStatus.textContent = "GPS Active - Tracking";
    gpsStatus.style.background = "#e6f4ea";
    gpsStatus.style.color = "#137333";

    // Play starting voice audio
    speak("Starting tracking. Have a great run!");

    // Start UI Clock Timer
    timerId = setInterval(updateTimer, 1000);

    // Watch Moving Coordinates
    watchId = navigator.geolocation.watchPosition(handleGPSUpdate, handleGPSError, geoOptions);
});

// Stop and Save Session
stopBtn.addEventListener('click', () => {
    if (watchId) navigator.geolocation.clearWatch(watchId);
    if (timerId) clearInterval(timerId);

    speak(`Run complete. You traveled ${totalDistance.toFixed(2)} kilometers.`);

    saveRunToStorage(totalDistance.toFixed(2), durationDisplay.textContent);
    
    // Reset Buttons UI
    startBtn.style.display = 'block';
    stopBtn.style.display = 'none';
    gpsStatus.textContent = "Session Saved Successfully";
    gpsStatus.style.background = "#e8f0fe";
    gpsStatus.style.color = "#1a73e8";

    loadRunHistory();
});

// Handle incoming GPS hits
function handleGPSUpdate(position) {
    const coords = position.coords;

    // Reject low-accuracy signals (accuracy over 20 meters is noisy)
    if (coords.accuracy > 20) return;

    if (lastPosition) {
        const distanceMoved = calculateHaversineDistance(
            lastPosition.latitude, lastPosition.longitude,
            coords.latitude, coords.longitude
        );

        // Filter out tiny drift updates (Must move more than 2 meters)
        if (distanceMoved > 0.002) {
            totalDistance += distanceMoved;
            distanceDisplay.textContent = totalDistance.toFixed(2);
            checkAudioMilestones(totalDistance);
        }
    }
    lastPosition = coords;
}

function handleGPSError(err) {
    console.warn(`GPS Error (${err.code}): ${err.message}`);
    gpsStatus.textContent = "GPS Signal Weak";
    gpsStatus.style.background = "#fce8e6";
    gpsStatus.style.color = "#c5221f";
}

// Haversine Geolocation Calculation Formula
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth Radius in KM
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
}

// Update runtime clock UI
function updateTimer() {
    const elapsedMs = Date.now() - startTime;
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    durationDisplay.textContent = `${mins}:${secs}`;
}

// Text to Speech Audio Updates
function speak(message) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(message);
        window.speechSynthesis.speak(utterance);
    }
}

// Track mileage checkpoints
function checkAudioMilestones(currentDistance) {
    if (currentDistance >= nextMilestone) {
        speak(`Milestone reached. Total distance: ${nextMilestone} kilometers.`);
        if (navigator.vibrate) navigator.vibrate(300); // Pulse phone vibration
        nextMilestone++;
    }
}

// Local Storage Management
function saveRunToStorage(kms, time) {
    let runs = JSON.parse(localStorage.getItem('jog_history')) || [];
    const runDate = new Date().toLocaleDateString();
    runs.unshift({ date: runDate, distance: kms, duration: time });
    localStorage.setItem('jog_history', JSON.stringify(runs));
}

function loadRunHistory() {
    historyList.innerHTML = '';
    let runs = JSON.parse(localStorage.getItem('jog_history')) || [];
    if(runs.length === 0) {
        historyList.innerHTML = '<div style="color:#888; font-size:13px;">No runs saved yet.</div>';
        return;
    }
    runs.forEach(run => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `<strong>${run.date}</strong> - ${run.distance} km in ${run.duration}`;
        historyList.appendChild(item);
    });
}

// Initialize history display on load
loadRunHistory();
