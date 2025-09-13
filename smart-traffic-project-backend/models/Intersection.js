// D:\attempt 1 traffic\smart-traffic-project\backend\models\Intersection.js
const mongoose = require('mongoose');

const trafficLightSchema = new mongoose.Schema({
    direction: { type: String, required: true }, // e.g., 'NORTH_SOUTH', 'EAST_WEST'
    state: { type: String, enum: ['RED', 'YELLOW', 'GREEN'], default: 'RED' },
    timer: { type: Number, default: 0 }, // Time remaining for current state
    lastChanged: { type: Date, default: Date.now } // When light last changed
}, { _id: false }); // Do not create a default _id for subdocuments

const laneDataSchema = new mongoose.Schema({
    laneId: { type: String, required: true }, // e.g., 'NS_STRAIGHT', 'EW_LEFT'
    vehicleCount: { type: Number, default: 0 },
    averageSpeed: { type: Number, default: 0 }, // in km/h or mph
    congestionLevel: { type: Number, default: 0 } // A calculated value, 0-100
}, { _id: false });

const intersectionSchema = new mongoose.Schema({
    intersectionId: { type: String, required: true, unique: true },
    location: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true }
    },
    trafficLights: [trafficLightSchema], // Array of traffic lights at this intersection
    lanes: [laneDataSchema], // Array of data for each lane
    lastUpdated: { type: Date, default: Date.now },
    // Historical data can be stored in a separate collection or sub-documents if needed later
});

module.exports = mongoose.model('Intersection', intersectionSchema);