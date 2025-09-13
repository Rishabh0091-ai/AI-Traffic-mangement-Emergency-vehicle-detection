// D:\attempt 1 traffic\smart-traffic-project\frontend\src\components\TrafficMap.jsx
import React from 'react';
import './TrafficMap.css'; // Create this CSS file next

// Helper function to get light state for a given intersection and direction
const getLightState = (intersection, direction) => {
    return intersection?.trafficLights.find(light => light.direction === direction)?.state || 'UNKNOWN';
};

// Helper to get congestion level for a given intersection and lane part
const getCongestionLevel = (intersection, lanePart) => {
    return intersection?.lanes.find(lane => lane.laneId.includes(lanePart))?.congestionLevel || 0;
};


function TrafficMap({ intersections, emergencyStatus }) {
    // Find intersection A and B from the data
    const intersectionA = intersections.find(i => i.intersectionId === 'A');
    const intersectionB = intersections.find(i => i.intersectionId === 'B');

    // Get traffic light states for Intersection A
    const lightA_NS = getLightState(intersectionA, 'NORTH_SOUTH');
    const lightA_EW = getLightState(intersectionA, 'EAST_WEST');

    // Get traffic light states for Intersection B
    const lightB_NS = getLightState(intersectionB, 'NORTH_SOUTH');
    const lightB_EW = getLightState(intersectionB, 'EAST_WEST');

    // Get congestion levels for displaying on roads
    const congestionA_NS = getCongestionLevel(intersectionA, 'NS');
    const congestionA_EW = getCongestionLevel(intersectionA, 'EW');
    const congestionB_NS = getCongestionLevel(intersectionB, 'NS');
    const congestionB_EW = getCongestionLevel(intersectionB, 'EW');
    
    let evPosition = null;
    if (emergencyStatus && emergencyStatus.isActive && emergencyStatus.currentIntersectionId) {
        // Simple mapping of intersectionId to map coordinates
        // You can refine these coordinates for better visual placement
        if (emergencyStatus.currentIntersectionId === 'A') {
            evPosition = { x: 350, y: 300 }; // Center of Intersection A on map
        } else if (emergencyStatus.currentIntersectionId === 'B') {
            evPosition = { x: 650, y: 300 }; // Center of Intersection B on map
        }
        // Add more conditions if you introduce more intersections or path movement logic
    }

    // Function to determine road color based on congestion
    const getRoadColor = (congestion) => {
        if (congestion > 70) return '#e74c3c'; // High congestion (Red)
        if (congestion > 40) return '#f1c40f'; // Medium congestion (Yellow)
        return '#2ecc71'; // Low congestion (Green)
    };

    return (
        <div className="traffic-map-container">
            <h3>City Traffic Map</h3>
            <svg viewBox="0 0 1000 600" className="traffic-map-svg">
                {/* Background Roads */}
                <rect x="0" y="250" width="1000" height="100" fill="#444" /> {/* East-West Road */}
                <rect x="450" y="0" width="100" height="600" fill="#444" /> {/* North-South Road */}

                {/* Intersection A Roads & Labels (Top-Left) */}
                <rect x="300" y="250" width="100" height="100" fill="#333" stroke="#888" strokeWidth="2" /> {/* Intersection A core */}
                <text x="350" y="230" className="intersection-label">A</text>

                {/* Intersection B Roads & Labels (Bottom-Right) */}
                <rect x="600" y="250" width="100" height="100" fill="#333" stroke="#888" strokeWidth="2" /> {/* Intersection B core */}
                <text x="650" y="230" className="intersection-label">B</text>

                {/* Horizontal Road Segments with Congestion Colors */}
                <rect x="0" y="285" width="300" height="30" className="road-segment horizontal" fill={getRoadColor(congestionA_EW)} /> {/* Left to A */}
                <rect x="400" y="285" width="200" height="30" className="road-segment horizontal" fill={getRoadColor(congestionA_EW)} /> {/* A to B */}
                <rect x="700" y="285" width="300" height="30" className="road-segment horizontal" fill={getRoadColor(congestionB_EW)} /> {/* B to Right */}

                {/* Vertical Road Segments with Congestion Colors */}
                <rect x="485" y="0" width="30" height="250" className="road-segment vertical" fill={getRoadColor(congestionA_NS)} /> {/* Top to A */}
                <rect x="485" y="350" width="30" height="250" className="road-segment vertical" fill={getRoadColor(congestionB_NS)} /> {/* B to Bottom */}


                {/* Traffic Lights for Intersection A */}
                {/* NS Light A */}
                <circle cx="490" cy="260" r="8" className={`traffic-light ${lightA_NS.toLowerCase()}`} />
                {/* EW Light A */}
                <circle cx="360" cy="340" r="8" className={`traffic-light ${lightA_EW.toLowerCase()}`} />


                {/* Traffic Lights for Intersection B */}
                {/* NS Light B */}
                <circle cx="690" cy="260" r="8" className={`traffic-light ${lightB_NS.toLowerCase()}`} />
                {/* EW Light B */}
                <circle cx="660" cy="340" r="8" className={`traffic-light ${lightB_EW.toLowerCase()}`} />

                                {/* NEW: Emergency Vehicle Marker */}
                {evPosition && (
                    <circle
                        cx={evPosition.x}
                        cy={evPosition.y}
                        r="15" // Size of the emergency vehicle marker
                        className="emergency-vehicle-marker"
                        fill="#FF0000" // Bright red for emergency
                        stroke="#FFF"
                        strokeWidth="2"
                    />
                )}


                {/* Optional: Simple Vehicle Markers (simulated) - can add more complex logic later */}
                {/* Example: Display number of vehicles on a lane */}
                <text x="150" y="275" className="vehicle-count">{congestionA_EW > 0 ? `C:${congestionA_EW}%` : ''}</text>
                <text x="850" y="275" className="vehicle-count">{congestionB_EW > 0 ? `C:${congestionB_EW}%` : ''}</text>
                <text x="495" y="125" className="vehicle-count vehicle-count-vertical">{congestionA_NS > 0 ? `C:${congestionA_NS}%` : ''}</text>
                <text x="495" y="475" className="vehicle-count vehicle-count-vertical">{congestionB_NS > 0 ? `C:${congestionB_NS}%` : ''}</text>

                {/* Emergency Vehicle Path Highlight (Conceptual) */}
                {/* This would require specific logic to draw the path when an emergency is active */}
                {/* For example, drawing a thicker line along intersection A to B if an emergency vehicle is active */}
            </svg>
            <p className="map-note">Road colors indicate congestion: Green (Low), Yellow (Medium), Red (High)</p>
            {emergencyStatus && emergencyStatus.isActive && (
                <p className="map-note emergency-map-alert">
                    ⚡️ Emergency vehicle ({emergencyStatus.type}) active! Prioritizing route.
                </p>
            )}

        </div>
    );
}

export default TrafficMap;