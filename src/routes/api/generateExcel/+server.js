import { json } from '@sveltejs/kit';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const FILE_PATH = path.resolve('static/generated.xlsx'); // ✅ Save in `static/`

// Function to determine match type and match number
function determineMatchTypeAndNumber(matchId) {
    if (matchId > 20000) {
        return { matchType: "Playoff", matchNumber: (matchId - 20001) / 1000 };
    }
    return { matchType: "Qualification", matchNumber: matchId };
}

export async function POST({ fetch, request }) {
    try {
        const { teamNumbers } = await request.json();
        if (!Array.isArray(teamNumbers) || teamNumbers.length === 0) {
            return json({ error: "Invalid teamNumbers format. Expected an array." }, { status: 400 });
        }

        console.log("📥 Fetching merged team data from /api/fetchTeams...");

        const response = await fetch('/api/fetchTeams', {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ teamNumbers })
        });

        if (!response.ok) {
            console.error("❌ Failed to fetch team data:", response.statusText);
            return json({ error: `Failed to fetch team data: ${response.statusText}` }, { status: 500 });
        }

        const data = await response.json();
        console.log("✅ Team Data Fetched:", data);

        if (!data.success || !Array.isArray(data.data) || data.data.length === 0) {
            return json({ error: "Invalid data format from fetchTeams API" }, { status: 400 });
        }

        // ✅ Add Column Headers
        const header = [
            ["Team Number", "Match ID", "Event Name", "Match Type", "Match Number", "Alliance", 
             "Auto High Basket", "Auto Low Basket", "Teleop High Basket", "Teleop Low Basket", 
             "Auto Points", "Teleop Points", "Total Points", "Penalty Points"]
        ];

        // ✅ Properly Extract and Filter Data
        const formattedData = data.data
            .filter(row => teamNumbers.includes(row.teamNumber)) // ✅ Only include the requested team's matches
            .map(row => {
                const { matchType, matchNumber } = determineMatchTypeAndNumber(row.matchId);

                // ✅ Only include the requested team's alliance scores
                if (row.alliance !== "Red" && row.alliance !== "Blue") {
                    console.warn(`⚠️ Skipping match ${row.matchId} - invalid alliance`);
                    return null;
                }

                return [
                    row.teamNumber || "Unknown",
                    row.matchId || "N/A",
                    row.eventName || "Unknown Event",
                    matchType,
                    matchNumber,
                    row.alliance || "N/A",
                    row.autoHighBasket || 0,
                    row.autoLowBasket || 0,
                    row.teleopHighBasket || 0,
                    row.teleopLowBasket || 0,
                    row.autoPoints || 0,
                    row.teleopPoints || 0,
                    row.totalPoints || 0,
                    row.penaltyPoints || 0
                ];
            })
            .filter(Boolean); // ✅ Remove any null values

        // ✅ Ensure There's Data Before Writing to File
        if (formattedData.length === 0) {
            console.error("❌ No valid match data found!");
            return json({ error: "No valid match data found!", status: 400 });
        }

        // ✅ Convert to Excel format
        const worksheet = XLSX.utils.aoa_to_sheet([...header, ...formattedData]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Teams Data");

        // ✅ Save the file locally inside `static/`
        XLSX.writeFile(workbook, FILE_PATH);

        console.log("✅ Excel file successfully created:", FILE_PATH);
        return json({ success: true, message: "Excel file generated!", filePath: "/generated.xlsx" });

    } catch (error) {
        console.error("❌ Excel Generation Error:", error);
        return json({ error: "Internal server error", details: error.message }, { status: 500 });
    }
}