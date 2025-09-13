// D:\attempt 1 traffic\smart-traffic-project\frontend\src\components\TrafficCharts.jsx
import React, { useRef, useEffect } from 'react'; // Import useRef and useEffect
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './TrafficCharts.css'; // Make sure this CSS file exists and is correct

const MAX_DATA_POINTS = 20; // Keep last 20 updates for the chart

function TrafficCharts({ intersections }) {
    // useRef to store mutable historical chart data without causing re-renders
    const historicalData = useRef([]); // Initialize with an empty array

    useEffect(() => {
        if (!intersections || intersections.length === 0) {
            historicalData.current = []; // Reset if no data
            return;
        }

        // Generate a time label for the current data point
        const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

        // Create a single data point object for the current timestamp, combining data from all intersections
        const currentCombinedPoint = { time: currentTime };

        // Iterate over the received intersections to gather data for this specific time point
        intersections.forEach(intersection => {
            const nsLane = intersection.lanes.find(l => l.laneId.includes('NS'));
            const ewLane = intersection.lanes.find(l => l.laneId.includes('EW'));

            // Safely add data to the combined point, defaulting to 0 if a lane is not found
            currentCombinedPoint[`${intersection.intersectionId}_nsVehicles`] = nsLane?.vehicleCount || 0;
            currentCombinedPoint[`${intersection.intersectionId}_ewVehicles`] = ewLane?.vehicleCount || 0;
            currentCombinedPoint[`${intersection.intersectionId}_nsCongestion`] = nsLane?.congestionLevel || 0;
            currentCombinedPoint[`${intersection.intersectionId}_ewCongestion`] = ewLane?.congestionLevel || 0;
        });

        // --- CRUCIAL CHANGE HERE ---
        // Always create a NEW array for the historical data
        let updatedHistory = [...historicalData.current, currentCombinedPoint];

        // Trim the array to MAX_DATA_POINTS
        if (updatedHistory.length > MAX_DATA_POINTS) {
            updatedHistory = updatedHistory.slice(updatedHistory.length - MAX_DATA_POINTS);
        }

        // Assign the NEW, updated array back to historicalData.current
        historicalData.current = updatedHistory;

        // Optional: Log to check the data being stored
        // console.log("Chart Data History (current ref):", historicalData.current);

    }, [intersections]); // Re-run this effect only when the 'intersections' prop (real-time data) changes

    // The data for Recharts is now simply historicalData.current
    const chartData = historicalData.current; // This will be the array passed to LineChart


    return (
        <div className="traffic-charts-container">
            <h3>Live Traffic Metrics Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart
                    data={chartData} // Use the updated chartData from useRef
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#555" />
                    <XAxis dataKey="time" stroke="#ccc" />
                    <YAxis stroke="#ccc" />
                    <Tooltip contentStyle={{ backgroundColor: '#444', border: 'none' }} itemStyle={{ color: '#fff' }} />
                    <Legend wrapperStyle={{ color: '#fff' }} />

                    {/* Lines for Intersection A - Vehicle Counts */}
                    <Line type="monotone" dataKey="A_nsVehicles" stroke="#8884d8" name="A (N-S) Vehicles" dot={false} />
                    <Line type="monotone" dataKey="A_ewVehicles" stroke="#82ca9d" name="A (E-W) Vehicles" dot={false} />
                    {/* Lines for Intersection B - Vehicle Counts */}
                    <Line type="monotone" dataKey="B_nsVehicles" stroke="#ffc658" name="B (N-S) Vehicles" dot={false} />
                    <Line type="monotone" dataKey="B_ewVehicles" stroke="#ff7300" name="B (E-W) Vehicles" dot={false} />

                    {/* Optional: Lines for Congestion - uncomment if you want to see them on the chart */}
                    {/* <Line type="monotone" dataKey="A_nsCongestion" stroke="#e74c3c" name="A (N-S) Congestion" dot={false} />
                    <Line type="monotone" dataKey="A_ewCongestion" stroke="#c0392b" name="A (E-W) Congestion" dot={false} />
                    <Line type="monotone" dataKey="B_nsCongestion" stroke="#3498db" name="B (N-S) Congestion" dot={false} />
                    <Line type="monotone" dataKey="B_ewCongestion" stroke="#2980b9" name="B (E-W) Congestion" dot={false} /> */}

                </LineChart>
            </ResponsiveContainer>
            <p className="chart-note">Showing data for the last {MAX_DATA_POINTS} updates.</p>
        </div>
    );
}

export default TrafficCharts;