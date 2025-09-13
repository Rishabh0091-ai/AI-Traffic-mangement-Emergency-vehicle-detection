// D:\attempt 1 traffic\smart-traffic-project\backend\controllers\trafficController.js
const Intersection = require('../models/Intersection');
const EmergencyVehicle = require('../models/EmergencyVehicle'); // Will use this later

// --- Initial Intersection Data ---
const initialIntersections = [
    {
        intersectionId: 'A',
        location: { latitude: 26.4499, longitude: 80.3319 }, // Example coordinates for Kanpur
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
        location: { latitude: 26.4550, longitude: 80.3400 }, // Another example intersection
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
        // Clear existing data (for fresh start each time server runs)
        await Intersection.deleteMany({});
        await EmergencyVehicle.deleteMany({}); // Also clear emergency vehicles

        // Insert initial data
        await Intersection.insertMany(initialIntersections);
        console.log('Initial intersection data inserted into MongoDB.');
    } catch (error) {
        console.error('Error initializing intersections:', error);
    }
}

// --- AI/Simulation Logic ---
let simulationInterval  = null;
const trafficLightCycleDuration = 2000; // Total seconds for a full cycle (e.g., 30s GREEN + 30s RED for a direction)
const greenLightDuration = 45; // Default green light duration
const yellowLightDuration = 5; // Default yellow light duration
const redLightDuration = 10; // Default red light duration (sum of yellow + green of other direction)

async function simulateTrafficAndControl(io) {
    console.log('Backend: simulateTrafficAndControl is running its cycle...');
    // Fetch all intersections
    const intersections = await Intersection.find({});
    console.log(`Backend: Found ${intersections.length} intersections.`); 

    for (const intersection of intersections) {
        // --- 1. Simulate Traffic Changes (Randomly adjust vehicle counts) ---
        for (const lane of intersection.lanes) {
            // Introduce some randomness for dynamic simulation
            lane.vehicleCount = Math.max(0, lane.vehicleCount + Math.floor(Math.random() * 7) - 3); // -3 to +3 vehicles
            lane.averageSpeed = Math.max(10, Math.min(60, lane.averageSpeed + Math.floor(Math.random() * 5) - 2)); // Adjust speed
            // Simple congestion calculation: Higher count, lower speed = higher congestion
            lane.congestionLevel = Math.min(100, Math.max(0, Math.round((lane.vehicleCount / 30) * 100 + (60 - lane.averageSpeed))));
        }

        // --- 2. AI Traffic Light Control Logic ---
        // Simplified logic: Prioritize direction with more traffic
        let nsTraffic = 0;
        let ewTraffic = 0;

        for (const lane of intersection.lanes) {
            if (lane.laneId.includes('NS')) {
                nsTraffic += lane.vehicleCount;
            } else if (lane.laneId.includes('EW')) {
                ewTraffic += lane.vehicleCount;
            }
        }

        // Find current active green light direction
        let currentGreenLightDirection = '';
        for (const light of intersection.trafficLights) {
            if (light.state === 'GREEN') {
                currentGreenLightDirection = light.direction;
                break;
            }
        }

        // Simple AI decision: Switch if current green is significantly less busy
        // Or if current green has been green for max duration
        const nsLight = intersection.trafficLights.find(l => l.direction === 'NORTH_SOUTH');
        const ewLight = intersection.trafficLights.find(l => l.direction === 'EAST_WEST');

        if (nsLight && ewLight) {
             // Check if any emergency vehicle is currently overriding
            const emergencyOverride = await EmergencyVehicle.findOne({
                isActive: true,
                currentIntersectionId: intersection.intersectionId,
                priorityOverrideActive: true
            });

            if (emergencyOverride) {
                // Force the path of the emergency vehicle to green
                // This is a simplified example, real pathfinding would be complex
                if (emergencyOverride.currentPath && emergencyOverride.currentPath.includes(intersection.intersectionId)) {
                    const nextIntersectionIndex = emergencyOverride.currentPath.indexOf(intersection.intersectionId) + 1;
                    if (nextIntersectionIndex < emergencyOverride.currentPath.length) {
                         // Assuming next intersection dictates which light to turn green
                         // For simplicity, let's say if moving N-S, N-S light should be green
                        if (nsTraffic > ewTraffic) { // Placeholder logic to determine main direction
                            if (nsLight.state !== 'GREEN') {
                                nsLight.state = 'GREEN';
                                ewLight.state = 'RED';
                                nsLight.timer = greenLightDuration;
                                ewLight.timer = redLightDuration;
                                nsLight.lastChanged = new Date();
                                ewLight.lastChanged = new Date();
                                console.log(`[AI Override] Intersection ${intersection.intersectionId}: Forced NORTH_SOUTH GREEN for Emergency.`);
                            }
                        } else {
                            if (ewLight.state !== 'GREEN') {
                                ewLight.state = 'GREEN';
                                nsLight.state = 'RED';
                                ewLight.timer = greenLightDuration;
                                nsLight.timer = redLightDuration;
                                ewLight.lastChanged = new Date();
                                nsLight.lastChanged = new Date();
                                console.log(`[AI Override] Intersection ${intersection.intersectionId}: Forced EAST_WEST GREEN for Emergency.`);
                            }
                        }
                    }
                }

            } else {
                // Normal AI Logic
                const timeSinceLastChangeNS = (new Date() - nsLight.lastChanged) / 1000; // in seconds
                const timeSinceLastChangeEW = (new Date() - ewLight.lastChanged) / 1000; // in seconds

                if (nsLight.state === 'GREEN' && timeSinceLastChangeNS > greenLightDuration) {
                    nsLight.state = 'YELLOW';
                    nsLight.timer = yellowLightDuration;
                    nsLight.lastChanged = new Date();
                } else if (nsLight.state === 'YELLOW' && timeSinceLastChangeNS > yellowLightDuration) {
                    nsLight.state = 'RED';
                    nsLight.timer = redLightDuration;
                    nsLight.lastChanged = new Date();
                    // Turn EW green
                    ewLight.state = 'GREEN';
                    ewLight.timer = greenLightDuration;
                    ewLight.lastChanged = new Date();
                } else if (ewLight.state === 'GREEN' && timeSinceLastChangeEW > greenLightDuration) {
                    ewLight.state = 'YELLOW';
                    ewLight.timer = yellowLightDuration;
                    ewLight.lastChanged = new Date();
                } else if (ewLight.state === 'YELLOW' && timeSinceLastChangeEW > yellowLightDuration) {
                    ewLight.state = 'RED';
                    ewLight.timer = redLightDuration;
                    ewLight.lastChanged = new Date();
                    // Turn NS green
                    nsLight.state = 'GREEN';
                    nsLight.timer = greenLightDuration;
                    nsLight.lastChanged = new Date();
                }
                // TODO: Implement more intelligent switching based on nsTraffic/ewTraffic
                // For now, it's time-based cycling with a future override possibility
            }
        }


        // --- 3. Update in DB and Emit via Socket.IO ---
        await intersection.save(); // Save changes to MongoDB
        console.log(`Backend: Emitting traffic_update for Intersection ${intersection.intersectionId}. New state: ${JSON.stringify(intersection.trafficLights)}`);
        io.emit('traffic_update', intersection); // Emit updated intersection data
    }
}


// --- Emergency Vehicle Simulation Functions (Will be triggered by API later) ---
async function triggerEmergencyVehicle(io, vehicleType, startIntersectionId, destinationIntersectionId) {
    console.log(`Triggering emergency vehicle: ${vehicleType} from ${startIntersectionId}`);
    // Clear any previous emergency vehicles for simplicity
    await EmergencyVehicle.deleteMany({});

    const emergencyVehicle = new EmergencyVehicle({
        vehicleId: `EV-${Date.now()}`,
        type: vehicleType,
        currentIntersectionId: startIntersectionId,
        destinationIntersectionId: destinationIntersectionId,
        isActive: true,
        entryTime: new Date(),
        currentPath: [startIntersectionId], // Simplified path
        priorityOverrideActive: true // Assume priority override is active upon trigger
    });
    await emergencyVehicle.save();

    io.emit('emergency_vehicle_alert', emergencyVehicle);
    console.log('Emergency vehicle saved and alert emitted.');

    // Simulate movement (very basic: moves after some time)
    setTimeout(async () => {
        const currentEV = await EmergencyVehicle.findOne({ vehicleId: emergencyVehicle.vehicleId });
        if (currentEV && currentEV.isActive) {
            // For demonstration, let's just move it to the next intersection in its path or clear it
            // A more complex system would calculate a dynamic path
            console.log(`Emergency vehicle ${currentEV.vehicleId} moved/cleared.`);
            // For simplicity, let's deactivate it after 30 seconds
            currentEV.isActive = false;
            currentEV.priorityOverrideActive = false;
            currentEV.exitTime = new Date();
            await currentEV.save();
            io.emit('emergency_vehicle_alert_cleared', currentEV.vehicleId); // Notify frontend cleared
        }
    }, 30000); // Emergency vehicle active for 30 seconds for simulation
}

async function clearEmergencyVehicles(io) {
    await EmergencyVehicle.deleteMany({});
    io.emit('emergency_vehicle_alert_cleared', 'all'); // Notify frontend
    console.log('All emergency vehicles cleared.');
}


// --- Control Simulation Start/Stop ---
let ioInstance; // To store the Socket.IO instance
const simulationIntervalDuration = 2000; // 2 seconds

function startSimulation(ioObj) {
    if (simulationInterval) {
        clearInterval(simulationInterval);
    }
    console.log('Starting traffic simulation...');
        simulateTrafficAndControl(ioObj); // Run once immediately
    simulationInterval = setInterval(() => simulateTrafficAndControl(ioObj), simulationIntervalDuration);
}
   

function stopSimulation() {
    console.log('Stopping traffic simulation...');
    if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
    }
}

// Export functions to be used in server.js
module.exports = {
    initializeIntersections,
    startSimulation,
    stopSimulation,
    triggerEmergencyVehicle,
    clearEmergencyVehicles,
    // Add API endpoints here if needed directly from controller
    getIntersections: async (req, res) => {
        try {
            const intersections = await Intersection.find({});
            res.json(intersections);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching intersections', error });
        }
    }
};