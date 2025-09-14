// src/App.jsx
import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './App.css';
import IntersectionCard from './components/IntersectionCard';
import ControlPanel from './components/ControlPanel';
import TrafficCharts from './components/TrafficCharts';
import TrafficMap from './components/TrafficMap';

const BACKEND_URL = 'http://localhost:5000';

function App() {
  const [intersections, setIntersections] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('Connecting to backend...');
  const [emergencyStatus, setEmergencyStatus] = useState(null);

  useEffect(() => {
    const socket = io(BACKEND_URL);

    socket.on('connect', () => {
      console.log('Frontend: Connected to backend Socket.IO server!');
      setConnectionStatus('Connected to backend!');
    });

    socket.on('traffic_update', (data) => {
      setIntersections(prevIntersections => {
        const existingIndex = prevIntersections.findIndex(i => i.intersectionId === data.intersectionId);
        if (existingIndex > -1) {
          const updatedIntersections = [...prevIntersections];
          updatedIntersections[existingIndex] = data;
          return updatedIntersections;
        } else {
          return [...prevIntersections, data].sort((a, b) => a.intersectionId.localeCompare(b.intersectionId));
        }
      });
    });

    socket.on('emergency_vehicle_alert', (data) => {
      console.log('Frontend: Emergency alert received:', data);
      setEmergencyStatus(data);
    });

    socket.on('emergency_vehicle_alert_cleared', (vehicleId) => {
      console.log('Frontend: Emergency vehicle cleared:', vehicleId);
      setEmergencyStatus(prevStatus => ({ ...prevStatus, isActive: false, vehicleId: vehicleId }));
    });

    socket.on('disconnect', () => {
      console.log('Frontend: Disconnected from backend Socket.IO server.');
      setConnectionStatus('Disconnected from backend.');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const triggerEmergency = async (vehicleType, startIntersectionId, destinationIntersectionId) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/emergency/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', // <--- Ensure this is a string
      },
      body: JSON.stringify({ vehicleType, startIntersectionId, destinationIntersectionId }), // <--- Ensure the variables are in the body
    });
    // ...
  } catch (error) {
    console.error("Error triggering emergency:", error);
    throw error;
  }
};

  const clearEmergency = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/emergency/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      console.log(data.message);
    } catch (error) {
      console.error("Error clearing emergency:", error);
      throw error;
    }
  };

  const startSimulation = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/simulation/start`, { method: 'POST' });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      console.log(data.message);
      setConnectionStatus('Connected & Simulation Running!');
    } catch (error) {
      console.error("Error starting simulation:", error);
      setConnectionStatus('Error starting simulation.');
      throw error;
    }
  };

  const stopSimulation = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/simulation/stop`, { method: 'POST' });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      console.log(data.message);
      setConnectionStatus('Connected & Simulation Paused!');
    } catch (error) {
      console.error("Error stopping simulation:", error);
      setConnectionStatus('Error stopping simulation.');
      throw error;
    }
  };

  return (
    <div className="App">
      <h1>Smart Traffic Control System</h1>
      <p className="status-message">Status: {connectionStatus}</p>
      <ControlPanel
        onTriggerEmergency={triggerEmergency}
        onClearEmergency={clearEmergency}
        emergencyStatus={emergencyStatus}
        onStartSimulation={startSimulation}
        onStopSimulation={stopSimulation}
      />
      <TrafficMap intersections={intersections} emergencyStatus={emergencyStatus} />
      <TrafficCharts intersections={intersections} />
      <div className="intersections-container">
        {intersections.length > 0 ? (
          intersections.map(intersection => (
            <IntersectionCard key={intersection.intersectionId} intersection={intersection} />
          ))
        ) : (
          <p>Waiting for live traffic data from backend...</p>
        )}
      </div>
    </div>
  );
}

export default App;