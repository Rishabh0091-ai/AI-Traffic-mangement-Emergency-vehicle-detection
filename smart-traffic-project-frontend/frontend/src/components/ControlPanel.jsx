// D:\attempt 1 traffic\smart-traffic-project\frontend\src\components\ControlPanel.jsx
import React, { useState } from 'react';
import './ControlPanel.css';

function ControlPanel({ onTriggerEmergency, onClearEmergency, emergencyStatus, onStartSimulation, onStopSimulation }) { // Add new props
    const [vehicleType, setVehicleType] = useState('Ambulance');
    const [startIntersection, setStartIntersection] = useState('A');
    const [destinationIntersection, setDestinationIntersection] = useState('B');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleTrigger = async () => {
        setLoading(true);
        setError(null);
        try {
            await onTriggerEmergency({
                vehicleType,
                startIntersection,
                destinationIntersection,
            });
            alert('Emergency triggered!');
        } catch (err) {
            console.error("Failed to trigger emergency:", err);
            setError("Failed to trigger emergency.");
        } finally {
            setLoading(false);
        }
    };
    const handleClear = async () => {
        setLoading(true);
        setError(null);
        try {
            await onClearEmergency();
            alert('All emergencies cleared!');
        } catch (err) {
            console.error("Failed to clear emergencies:", err);
            setError("Failed to clear emergencies.");
        } finally {
            setLoading(false);
        }
    };

    const handleStartSim = async () => { // New function for starting simulation
        setLoading(true);
        setError(null);
        try {
            await onStartSimulation();
            alert('Simulation started!');
        } catch (err) {
            console.error("Failed to start simulation:", err);
            setError("Failed to start simulation.");
        } finally {
            setLoading(false);
        }
    };

    const handleStopSim = async () => { // New function for stopping simulation
        setLoading(true);
        setError(null);
        try {
            await onStopSimulation();
            alert('Simulation stopped!');
        } catch (err) {
            console.error("Failed to stop simulation:", err);
            setError("Failed to stop simulation.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="control-panel">
            <h3>Simulation Control</h3> {/* New heading for overall simulation controls */}
            <div className="button-group">
                <button onClick={handleStartSim} disabled={loading} className="start-sim-button">
                    {loading ? 'Starting...' : 'Start Simulation'}
                </button>
                <button onClick={handleStopSim} disabled={loading} className="stop-sim-button">
                    {loading ? 'Stopping...' : 'Stop Simulation'}
                </button>
            </div>
            <hr className="divider"/> {/* Optional visual divider */}

            <h3>Emergency Vehicle Control</h3>
            <div className="input-group">
                <label htmlFor="vehicleType">Vehicle Type:</label>
                <select id="vehicleType" value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
                    <option value="Ambulance">Ambulance</option>
                    <option value="Fire Truck">Fire Truck</option>
                    <option value="Police Car">Police Car</option>
                </select>
            </div>
            <div className="input-group">
                <label htmlFor="startIntersection">Start Intersection:</label>
                <select id="startIntersection" value={startIntersection} onChange={(e) => setStartIntersection(e.target.value)}>
                    <option value="A">A</option>
                    <option value="B">B</option>
                </select>
            </div>
            <div className="input-group">
                <label htmlFor="destinationIntersection">Destination:</label>
                <select id="destinationIntersection" value={destinationIntersection} onChange={(e) => setDestinationIntersection(e.target.value)}>
                    <option value="B">B</option>
                    <option value="A">A</option>
                </select>
            </div>
            <div className="button-group">
                <button onClick={handleTrigger} disabled={loading}>
                    {loading ? 'Triggering...' : 'Trigger Emergency'}
                </button>
                <button onClick={handleClear} disabled={loading} className="clear-button">
                    {loading ? 'Clearing...' : 'Clear All Emergency'}
                </button>
            </div>
            {error && <p className="error-message">{error}</p>}
            {emergencyStatus && emergencyStatus.isActive && (
                <p className="emergency-alert">
                    ⚡️ **EMERGENCY!** {emergencyStatus.type} at {emergencyStatus.currentIntersectionId} is active!
                </p>
            )}
             {emergencyStatus && !emergencyStatus.isActive && emergencyStatus.vehicleId && (
                <p className="emergency-alert cleared">
                   ✅ Emergency Vehicle {emergencyStatus.vehicleId} cleared.
                </p>
            )}
        </div>
    );
}

export default ControlPanel;