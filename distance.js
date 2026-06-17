import React, { useState, useRef } from "react";
import { getDistanceFromLatLonInKm } from "./distance";

export default function App() {
  const [tracking, setTracking] = useState(false);
  const [distance, setDistance] = useState(0);
  const [time, setTime] = useState(0);
  const [runs, setRuns] = useState(() => {
    return JSON.parse(localStorage.getItem("runs") || "[]");
  });

  const watchId = useRef(null);
  const lastPosition = useRef(null);
  const intervalRef = useRef(null);

  const startTimer = () => {
    intervalRef.current = setInterval(() => {
      setTime((t) => t + 1);
    }, 1000);
  };

  const stopTimer = () => clearInterval(intervalRef.current);

  const startRun = () => {
    setTracking(true);
    setDistance(0);
    setTime(0);

    startTimer();

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;

        if (lastPosition.current) {
          const d = getDistanceFromLatLonInKm(
            lastPosition.current.latitude,
            lastPosition.current.longitude,
            latitude,
            longitude
          );
          setDistance((prev) => prev + d);
        }

        lastPosition.current = { latitude, longitude };
      },
      (err) => console.log(err),
      { enableHighAccuracy: true }
    );
  };

  const stopRun = () => {
    setTracking(false);
    stopTimer();
    navigator.geolocation.clearWatch(watchId.current);

    const newRun = {
      date: new Date().toLocaleString(),
      distance: distance.toFixed(2),
      time,
    };

    const updated = [newRun, ...runs];
    setRuns(updated);
    localStorage.setItem("runs", JSON.stringify(updated));
  };

  const formatTime = (t) => {
    const min = Math.floor(t / 60);
    const sec = t % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>Jog Tracker</h1>

      <h2>Distance: {distance.toFixed(2)} km</h2>
      <h2>Time: {formatTime(time)}</h2>

      {!tracking ? (
        <button onClick={startRun}>Start Run</button>
      ) : (
        <button onClick={stopRun}>Stop Run</button>
      )}

      <hr />

      <h3>History</h3>
      {runs.map((r, i) => (
        <div key={i}>
          {r.date} — {r.distance} km — {formatTime(r.time)}
        </div>
      ))}
    </div>
  );
}