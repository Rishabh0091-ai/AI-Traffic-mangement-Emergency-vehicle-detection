// D:\attempt 1 traffic\smart-traffic-project\frontend\src\components\IntersectionCard.jsx
import React from 'react';
import './IntersectionCard.css'; // Create this CSS file next

function IntersectionCard({ intersection }) {
    if (!intersection) {
        return <div className="intersection-card">No data for intersection</div>;
    }

    // Helper to find specific lane/light data
    const getLane = (lanes, idPart) => lanes.find(lane => lane.laneId.includes(idPart));
    const getLight = (lights, direction) => lights.find(light => light.direction === direction);

    const nsLane = getLane(intersection.lanes, 'NS');
    const ewLane = getLane(intersection.lanes, 'EW');
    const nsLight = getLight(intersection.trafficLights, 'NORTH_SOUTH');
    const ewLight = getLight(intersection.trafficLights, 'EAST_WEST');

    return (
        <div className="intersection-card">
            <h3>Intersection ID: {intersection.intersectionId}</h3>
            <p>Location: ({intersection.location.latitude.toFixed(4)}, {intersection.location.longitude.toFixed(4)})</p>

            <div className="traffic-lights">
                <h4>Traffic Lights:</h4>
                <div className="light-status">
                    <span className="direction">N-S:</span>
                    <span className={`light ${nsLight?.state.toLowerCase()}`}>{nsLight?.state}</span>
                    <span className="timer">({nsLight?.timer}s)</span>
                </div>
                <div className="light-status">
                    <span className="direction">E-W:</span>
                    <span className={`light ${ewLight?.state.toLowerCase()}`}>{ewLight?.state}</span>
                    <span className="timer">({ewLight?.timer}s)</span>
                </div>
            </div>

            <div className="lane-data">
                <h4>Lane Data:</h4>
                <div className="lane-details">
                    <h5>North-South Lanes:</h5>
                    <p>Vehicles: {nsLane?.vehicleCount || 0}</p>
                    <p>Avg Speed: {nsLane?.averageSpeed || 0} km/h</p>
                    <p>Congestion: {nsLane?.congestionLevel || 0}%</p>
                </div>
                <div className="lane-details">
                    <h5>East-West Lanes:</h5>
                    <p>Vehicles: {ewLane?.vehicleCount || 0}</p>
                    <p>Avg Speed: {ewLane?.averageSpeed || 0} km/h</p>
                    <p>Congestion: {ewLane?.congestionLevel || 0}%</p>
                </div>
            </div>
            <p className="last-updated">Last Updated: {new Date(intersection.lastUpdated).toLocaleTimeString()}</p>
        </div>
    );
}

export default IntersectionCard;