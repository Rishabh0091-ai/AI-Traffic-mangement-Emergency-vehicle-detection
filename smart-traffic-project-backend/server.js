// D:\attempt 1 traffic\smart-traffic-project\backend\server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const trafficController = require('./controllers/trafficController'); // Import the controller

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL,
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

// --- MongoDB Connection ---
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('MongoDB connected successfully!');
        // Initialize intersections once DB is connected
        trafficController.initializeIntersections();
        trafficController.startSimulation(io);
    })
    .catch(err => console.error('MongoDB connection error:', err));

// --- Socket.IO Connection and Logic ---
io.on('connection', (socket) => {
    console.log(`A user connected: ${socket.id}`);

    // Start simulation when the first user connects (or keep it running always)
    // You might want to move startSimulation call outside of here if you want it to run without client
    // if (io.engine.clientsCount === 1) { // Start only if this is the first client
        // trafficController.startSimulation(io);
    // }

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        // Optionally stop simulation if no clients are connected
        if (io.engine.clientsCount === 0) {
            trafficController.stopSimulation();
        }
    });
});

// --- API Routes ---
app.get('/', (req, res) => {
    res.send('Smart Traffic System Backend is running and ready!');
});

// NEW API to start simulation
app.post('/api/simulation/start', (req, res) => {
    trafficController.startSimulation(io); // Pass the io instance
    res.status(200).json({ message: 'Simulation started' });
});

// NEW API to stop simulation
app.post('/api/simulation/stop', (req, res) => {
    trafficController.stopSimulation();
    res.status(200).json({ message: 'Simulation stopped' });
});

// API to get current intersection data
app.get('/api/intersections', trafficController.getIntersections);

// API to trigger emergency vehicle
app.post('/api/emergency/trigger', async (req, res) => {
    const { vehicleType, startIntersectionId, destinationIntersectionId } = req.body;
    if (!vehicleType || !startIntersectionId) {
        return res.status(400).json({ message: 'Missing vehicleType or startIntersectionId' });
    }
    await trafficController.triggerEmergencyVehicle(io, vehicleType, startIntersectionId, destinationIntersectionId);
    res.status(200).json({ message: 'Emergency vehicle triggered' });
});

// API to clear all emergency vehicles
app.post('/api/emergency/clear', async (req, res) => {
    await trafficController.clearEmergencyVehicles(io);
    res.status(200).json({ message: 'Emergency vehicles cleared' });
});

// --- Start Server ---
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});