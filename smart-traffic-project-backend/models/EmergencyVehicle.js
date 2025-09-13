// D:\attempt 1 traffic\smart-traffic-project\backend\models\EmergencyVehicle.js
const mongoose = require('mongoose');

const emergencyVehicleSchema = new mongoose.Schema({
    vehicleId: { type: String, required: true, unique: true },
    type: { type: String, enum: ['Ambulance', 'Fire Truck', 'Police Car'], required: true },
    currentIntersectionId: { type: String, required: true }, // Current intersection ID
    destinationIntersectionId: { type: String, required: false }, // Where it's heading
    isActive: { type: Boolean, default: false }, // Is it currently active/on an emergency run?
    entryTime: { type: Date }, // When it entered the system
    exitTime: { type: Date }, // When it left the system
    currentPath: [{ type: String }], // Array of intersection IDs representing its current path
    priorityOverrideActive: { type: Boolean, default: false } // Is system prioritizing this vehicle?
});

module.exports = mongoose.model('EmergencyVehicle', emergencyVehicleSchema);