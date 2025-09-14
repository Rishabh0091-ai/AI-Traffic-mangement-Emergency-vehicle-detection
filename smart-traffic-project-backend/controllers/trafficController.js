// D:\attempt 1 traffic\smart-traffic-project\backend\controllers\trafficController.js
const Intersection = require('../models/Intersection');
const EmergencyVehicle = require('../models/EmergencyVehicle');

// --- Initial Intersection Data ---
const initialIntersections = [
    {
        intersectionId: 'A',
        location: { latitude: 26.4499, longitude: 80.3319 },
        trafficLights: [
            { direction: 'NORTH_SOUTH', state: 'RED', timer: 30 },
            { direction: 'EAST_WEST', state: 'GREEN', timer: 30 }
        ],
        lanes: [
            { laneId: 'A_NS_IN', vehicleCount: 10, averageSpeed: 30, congestionLevel: 40 },
            { laneId: 'A_EW_IN', vehicleCount: 25, averageSpeed: 15, congestionLevel: 70 }
        ]
    },
    {
        intersectionId: 'B',
        location: { latitude: 26.4550, longitude: 80.3400 },
        trafficLights: [
            { direction: 'NORTH_SOUTH', state: 'GREEN', timer: 30 },
            { direction: 'EAST_WEST', state: 'RED', timer: 30 }
        ],
        lanes: [
            { laneId: 'B_NS_IN', vehicleCount: 20, averageSpeed: 20, congestionLevel: 60 },
            { laneId: 'B_EW_IN', vehicleCount: 5, averageSpeed: 40, congestionLevel: 20 }
        ]
    }
];

// --- Function to Initialize Intersections in DB ---
async function initializeIntersections() {
    try {
        await Intersection.deleteMany({});
        await EmergencyVehicle.deleteMany({});
        await Intersection.insertMany(initialIntersections);
        console.log('Initial intersection data inserted into MongoDB.');
    } catch (error) {
        console.error('Error initializing intersections:', error);
    }
}

// --- AI/Simulation Logic ---
let simulationInterval;
const trafficLightCycleDuration = 60;
const greenLightDuration = 45;
const yellowLightDuration = 5;
const redLightDuration = 10;

async function simulateTrafficAndControl(io) {
    console.log('Backend: simulateTrafficAndControl is running its cycle...');

    // Fetch all intersections (not for saving, but to get current state)
    const intersections = await Intersection.find({});
    console.log(`Backend: Found ${intersections.length} intersections.`);

    for (const intersection of intersections) {
        // Create a new object with the updates we want to apply
        const updates = {};

        // --- 1. Simulate Traffic Changes (Randomly adjust vehicle counts) ---
        const updatedLanes = intersection.lanes.map(lane => {
            const newLane = { ...lane.toObject() };
            newLane.vehicleCount = Math.max(0, newLane.vehicleCount + Math.floor(Math.random() * 7) - 3);
            newLane.averageSpeed = Math.max(10, Math.min(60, newLane.averageSpeed + Math.floor(Math.random() * 5) - 2));
            newLane.congestionLevel = Math.min(100, Math.max(0, Math.round((newLane.vehicleCount / 30) * 100 + (60 - newLane.averageSpeed))));
            return newLane;
        });
        updates.lanes = updatedLanes;

        // --- 2. AI Traffic Light Control Logic ---
        let nsTraffic = 0;
        let ewTraffic = 0;
        for (const lane of updatedLanes) {
            if (lane.laneId.includes('NS')) nsTraffic += lane.vehicleCount;
            if (lane.laneId.includes('EW')) ewTraffic += lane.vehicleCount;
        }

        const updatedTrafficLights = intersection.trafficLights.map(light => ({ ...light.toObject() }));
        const nsLight = updatedTrafficLights.find(l => l.direction === 'NORTH_SOUTH');
        const ewLight = updatedTrafficLights.find(l => l.direction === 'EAST_WEST');

        if (nsLight && ewLight) {
            const emergencyOverride = await EmergencyVehicle.findOne({
                isActive: true,
                currentIntersectionId: intersection.intersectionId,
                priorityOverrideActive: true
            });

            if (emergencyOverride) {
                // Simplified Emergency Override logic
                const timeSinceLastChange = (new Date() - nsLight.lastChanged) / 1000;
                if (timeSinceLastChange > 2) { // Force green after a small delay
                    if (nsLight.state !== 'GREEN') {
                        nsLight.state = 'GREEN'; ewLight.state = 'RED';
                        nsLight.timer = greenLightDuration; ewLight.timer = redLightDuration;
                        nsLight.lastChanged = new Date(); ewLight.lastChanged = new Date();
                    }
                }
                console.log(`[AI Override] Intersection ${intersection.intersectionId}: Forced NORTH_SOUTH GREEN for Emergency.`);
            } else {
                // Normal AI Logic
                const timeSinceLastChangeNS = (new Date() - nsLight.lastChanged) / 1000;
                const timeSinceLastChangeEW = (new Date() - ewLight.lastChanged) / 1000;

                if (nsLight.state === 'GREEN' && timeSinceLastChangeNS > greenLightDuration) {
                    nsLight.state = 'YELLOW'; nsLight.timer = yellowLightDuration; nsLight.lastChanged = new Date();
                } else if (nsLight.state === 'YELLOW' && timeSinceLastChangeNS > yellowLightDuration) {
                    nsLight.state = 'RED'; nsLight.timer = redLightDuration; nsLight.lastChanged = new Date();
                    ewLight.state = 'GREEN'; ewLight.timer = greenLightDuration; ewLight.lastChanged = new Date();
                } else if (ewLight.state === 'GREEN' && timeSinceLastChangeEW > greenLightDuration) {
                    ewLight.state = 'YELLOW'; ewLight.timer = yellowLightDuration; ewLight.lastChanged = new Date();
                } else if (ewLight.state === 'YELLOW' && timeSinceLastChangeEW > yellowLightDuration) {
                    ewLight.state = 'RED'; ewLight.timer = redLightDuration; ewLight.lastChanged = new Date();
                    nsLight.state = 'GREEN'; nsLight.timer = greenLightDuration; nsLight.lastChanged = new Date();
                }
            }
        }
        updates.trafficLights = updatedTrafficLights;

        // --- 3. Atomic Update in DB and Emit via Socket.IO ---
        updates.lastUpdated = new Date();

        // Use findByIdAndUpdate for atomic, concurrent-safe updates
        const updatedIntersection = await Intersection.findByIdAndUpdate(
            intersection._id,
            updates,
            { new: true, useFindAndModify: false }
        );

        if (updatedIntersection) {
            console.log(`Backend: Emitting traffic_update for Intersection ${updatedIntersection.intersectionId}.`);
            io.emit('traffic_update', updatedIntersection);
        } else {
            console.error(`Backend: Failed to find and update intersection with id ${intersection._id}`);
        }
    }
}


// --- Emergency Vehicle Simulation Functions ---
async function triggerEmergencyVehicle(io, vehicleType, startIntersectionId, destinationIntersectionId) {
    console.log(`Triggering emergency vehicle: ${vehicleType} from ${startIntersectionId} to ${destinationIntersectionId}`);
    await EmergencyVehicle.deleteMany({});

    const emergencyVehicle = new EmergencyVehicle({
        vehicleId: `EV-${Date.now()}`, type: vehicleType, currentIntersectionId: startIntersectionId, destinationIntersectionId,
        isActive: true, entryTime: new Date(), currentPath: [startIntersectionId, destinationIntersectionId].filter(Boolean),
        priorityOverrideActive: true
    });
    await emergencyVehicle.save();

    io.emit('emergency_vehicle_alert', emergencyVehicle);
    console.log('Emergency vehicle saved and initial alert emitted.');

    if (destinationIntersectionId && startIntersectionId !== destinationIntersectionId) {
        setTimeout(async () => {
            const updatedEV = await EmergencyVehicle.findByIdAndUpdate(emergencyVehicle._id, { currentIntersectionId: destinationIntersectionId }, { new: true, useFindAndModify: false });
            if (updatedEV && updatedEV.isActive) {
                io.emit('emergency_vehicle_alert', updatedEV);
                console.log(`Emergency vehicle ${updatedEV.vehicleId} moved to ${destinationIntersectionId}.`);

                setTimeout(async () => {
                    const finalEV = await EmergencyVehicle.findByIdAndUpdate(updatedEV._id, { isActive: false, priorityOverrideActive: false, exitTime: new Date() }, { new: true, useFindAndModify: false });
                    if (finalEV) {
                        io.emit('emergency_vehicle_alert_cleared', finalEV.vehicleId);
                        console.log(`Emergency vehicle ${finalEV.vehicleId} cleared after reaching destination.`);
                    }
                }, 10000);
            }
        }, 10000);
    } else {
        setTimeout(async () => {
            const finalEV = await EmergencyVehicle.findByIdAndUpdate(emergencyVehicle._id, { isActive: false, priorityOverrideActive: false, exitTime: new Date() }, { new: true, useFindAndModify: false });
            if (finalEV) {
                io.emit('emergency_vehicle_alert_cleared', finalEV.vehicleId);
                console.log(`Emergency vehicle ${finalEV.vehicleId} cleared.`);
            }
        }, 15000);
    }
}

async function clearEmergencyVehicles(io) {
    await EmergencyVehicle.deleteMany({});
    io.emit('emergency_vehicle_alert_cleared', 'all');
    console.log('All emergency vehicles cleared.');
}

// --- Control Simulation Start/Stop ---
const simulationIntervalDuration = 2000;

function startSimulation(ioObj) {
    if (simulationInterval) clearInterval(simulationInterval);
    console.log('Starting traffic simulation...');
    simulateTrafficAndControl(ioObj);
    simulationInterval = setInterval(() => simulateTrafficAndControl(ioObj), simulationIntervalDuration);
}

function stopSimulation() {
    console.log('Stopping traffic simulation...');
    if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
    }
}

// Export functions
module.exports = {
    initializeIntersections, startSimulation, stopSimulation,
    triggerEmergencyVehicle, clearEmergencyVehicles,
    getIntersections: async (req, res) => {
        try {
            const intersections = await Intersection.find({});
            res.json(intersections);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching intersections', error });
        }
    }
};