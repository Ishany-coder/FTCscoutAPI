<script>
    import { onMount } from "svelte";
    import * as XLSX from "xlsx";

    let teamNumber = 23270; // Default team number
    let data1 = [];
    let data2 = [];
    let mergedData = [];
    let eventNames = {};
    let error = null;
    let loading = false;

    const API_URL = "https://api.ftcscout.org/graphql";

    function determineMatchType(matchId) {
        if (matchId > 20000) {
            return { matchType: "Playoff", matchNumber: (matchId-20001)/1000 };
        }
        else if (matchId == 'N/A'){
            return { matchType: "unknown", matchNumber: matchId };
        }
        return { matchType: "Qualification", matchNumber: matchId };
    }

    async function fetchEventName(eventCode) {
        console.log("fetching event name for", eventCode);
        if (eventNames[eventCode]) return eventNames[eventCode];

        const eventQuery = `
        query {
            eventByCode(code: "${eventCode}", season: 2024) {
                name
            }
        }
        `;

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: eventQuery }),
            });

            const json = await response.json();
            eventNames[eventCode] = json?.data?.eventByCode?.name || "Unknown Event";
        } catch (err) {
            console.error(`Error fetching event name for ${eventCode}:`, err);
            eventNames[eventCode] = "Unknown Event";
        }
    }

    async function fetchData1() {
    console.log("fetching data1");
    const query = `
    query {
        teamByNumber(number: ${teamNumber}) {
            events(season: 2024) {
                matches {
                    alliance
                    matchId
                }
            }
        }
    }
    `;

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query }),
        });
        console.log("Data1:", response);

        const json = await response.json();

        data1 = json?.data?.teamByNumber?.events?.flatMap(event =>
            event.matches.map(m => {
                const { matchType, matchNumber } = determineMatchType(m.matchId);
                return {
                    matchId: m.matchId,
                    matchType,
                    matchNumber,
                    eventName: event.eventName || eventNames[event.eventCode] || "Unknown Event", // Properly map eventName
                    alliance: m.alliance // ✅ Now correctly extracting alliance
                };
            })
        ) || [];

        console.log("Filtered Matches from Data1:", data1);
    } catch (err) {
        console.error("Error fetching data1:", err);
    }
}

async function fetchData2() {
    const query = `
    query {
        teamByNumber(number: ${teamNumber}) {
            events(season: 2024) {
                matches {
                    match {
                        matchNum
                        scores {
                            ... on MatchScores2024 {
                                red {
                                    eventCode
                                    matchId
                                    alliance
                                    autoSampleHigh
                                    autoSampleLow
                                    autoSpecimenHigh
                                    autoSpecimenLow
                                    dcSampleHigh
                                    dcSampleLow
                                    dcSpecimenHigh
                                    dcSpecimenLow
                                    autoPoints
                                    dcPoints
                                    totalPoints
                                    penaltyPointsCommitted
                                }
                                blue {
                                    eventCode
                                    matchId
                                    alliance
                                    autoSampleHigh
                                    autoSampleLow
                                    autoSpecimenHigh
                                    autoSpecimenLow
                                    dcSampleHigh
                                    dcSampleLow
                                    dcSpecimenHigh
                                    dcSpecimenLow
                                    autoPoints
                                    dcPoints
                                    totalPoints
                                    penaltyPointsCommitted
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    `;

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query }),
        });

        const json = await response.json();
        console.log("Data2:", json);

        data2 = json?.data?.teamByNumber?.events?.flatMap(event =>
            event.matches.flatMap(m => {
                const redScore = m.match.scores?.red;
                const blueScore = m.match.scores?.blue;

                // Extract both red and blue alliance data if available
                return [
                    redScore ? {
                        matchId: redScore.matchId,
                        eventCode: redScore.eventCode || "N/A",
                        alliance: "Red",
                        highBasket: (redScore.autoSampleHigh || 0) + (redScore.dcSampleHigh || 0),
                        lowBasket: (redScore.autoSampleLow || 0) + (redScore.dcSampleLow || 0),
                        highChamber: (redScore.autoSpecimenHigh || 0) + (redScore.dcSpecimenHigh || 0),
                        lowChamber: (redScore.autoSpecimenLow || 0) + (redScore.dcSpecimenLow || 0),
                        autoPoints: redScore.autoPoints || 0,
                        dcPoints: redScore.dcPoints || 0,
                        totalPoints: redScore.totalPoints || 0,
                        penaltyPointsCommitted: redScore.penaltyPointsCommitted || 0,
                    } : null,
                    
                    blueScore ? {
                        matchId: blueScore.matchId,
                        eventCode: blueScore.eventCode || "N/A",
                        alliance: "Blue",
                        highBasket: (blueScore.autoSampleHigh || 0) + (blueScore.dcSampleHigh || 0),
                        lowBasket: (blueScore.autoSampleLow || 0) + (blueScore.dcSampleLow || 0),
                        highChamber: (blueScore.autoSpecimenHigh || 0) + (blueScore.dcSpecimenHigh || 0),
                        lowChamber: (blueScore.autoSpecimenLow || 0) + (blueScore.dcSpecimenLow || 0),
                        autoPoints: blueScore.autoPoints || 0,
                        dcPoints: blueScore.dcPoints || 0,
                        totalPoints: blueScore.totalPoints || 0,
                        penaltyPointsCommitted: blueScore.penaltyPointsCommitted || 0,
                    } : null
                ];
            })
        ).flat().filter(Boolean) || [];

        for (let match of data2) {
            if (match.eventCode && match.eventCode !== "N/A") {
                await fetchEventName(match.eventCode);
            }
        }

        console.log("Filtered Scores (Including Red & Blue):", data2);
    } catch (err) {
        console.error("Error fetching data2:", err);
    }
}

 function mergeData() {
    const matchMap = new Map();

    // First, store all matches from data1
    data1.forEach(match => {
        matchMap.set(match.matchId, { ...match });
    });

    // Then merge with data2, ensuring the correct alliance is kept
    for (const score of data2) {
        let existingMatch = matchMap.get(score.matchId);

        if (existingMatch) {
            matchMap.set(score.matchId, { 
                ...existingMatch, 
                ...score,
                alliance: existingMatch.alliance || score.alliance  // ✅ Keep `alliance` from data1 if available
            });
        } else {
            matchMap.set(score.matchId, { 
                matchId: score.matchId,
                matchType: "Unknown",
                matchNumber: "N/A",
                eventCode: score.eventCode || null,
                eventName: eventNames[score.eventCode] || null, 
                ...score
            });
        }
    }

    mergedData = Array.from(matchMap.values());
    const headers = [
        ["Match #", "Match Type", "Event Name", "Alliance", 
         "High Basket", "Low Basket", "High Chamber", "Low Chamber", 
         "Auto Score", "Teleop Score", "Total Points", "Penalties"]
    ];

    // Prepare data for the Excel sheet
    const formattedData = [];

    mergedData.forEach(match => {
        // Push match data into the formatted data array
        formattedData.push([
            match.matchNumber || "N/A",
            match.matchType || "N/A",
            match.eventCode ? eventNames[match.eventCode] : match.eventName,
            match.alliance || "N/A",
            match.highBasket || 0,
            match.lowBasket || 0,
            match.highChamber || 0,
            match.lowChamber || 0,
            match.autoPoints || 0,
            match.dcPoints || 0,
            match.totalPoints || 0,
            match.penaltyPointsCommitted || 0
        ]);
    });

    // Create worksheet and workbook
    const worksheet = XLSX.utils.aoa_to_sheet([...headers, ...formattedData]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Match Data");

    // Generate file
    XLSX.writeFile(workbook, "match_data.xlsx");

    console.log("✅ Excel file generated: match_data.xlsx");
}

    async function fetchAllData() {
        loading = true;
        error = null;
        console.log("fetching all data");
        await fetchData1();
        await fetchData2();
        mergeData();
        loading = false;
    }

    onMount(fetchAllData);
</script>

<style>
    .container {
        max-width: 1200px;
        margin: 20px auto;
        padding: 20px;
        border: 1px solid #ddd;
        border-radius: 8px;
        box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.1);
        background: #f9f9f9;
    }
    h1 {
        text-align: center;
    }
    .table-container {
        overflow-x: auto;
    }
    table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
    }
    th, td {
        padding: 10px;
        border: 1px solid #ddd;
        text-align: center;
    }
    th {
        background-color: #007bff;
        color: white;
    }
</style>

<div class="container">
    <h1>FTC Matches & Scores</h1>

    <div class="input-group">
        <input type="number" bind:value={teamNumber} placeholder="Enter Team #" />
        <button on:click={fetchAllData}>Get Data</button>
    </div>

    {#if loading}
        <p class="loading">Loading...</p>
    {:else if error}
        <p class="error">Error: {error}</p>
    {:else}
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Match #</th>
                        <th>Match Type</th>
                        <th>Event Name</th>
                        <th>Alliance</th>
                        <th>High Basket</th>
                        <th>Low Basket</th>
                        <th>High Chamber</th>
                        <th>Low Chamber</th>
                        <th>Auto Score</th>
                        <th>Teleop Score</th>
                        <th>Total Points</th>
                        <th>Penalties</th>
                    </tr>
                </thead>
                <tbody>
                    {#each mergedData as match (match.matchId)}
                        <tr>
                            <td>{match.matchNumber}</td>
                            <td>{match.matchType}</td>
                            <td>{match.eventCode ? eventNames[match.eventCode] : match.eventName}</td>
                            <td>{match.alliance}</td>
            
                            <!-- ✅ Check if the match is on Red or Blue alliance and display relevant data -->
                            {#if match.alliance === "Red"}
                                <td>{match.highBasket}</td>
                                <td>{match.lowBasket}</td>
                                <td>{match.highChamber}</td>
                                <td>{match.lowChamber}</td>
                                <td>{match.autoPoints}</td>
                                <td>{match.dcPoints}</td>
                                <td>{match.totalPoints}</td>
                                <td style="color: red;">{match.penaltyPointsCommitted}</td>
                            {:else if match.alliance === "Blue"}
                                <td>{match.highBasket}</td>
                                <td>{match.lowBasket}</td>
                                <td>{match.highChamber}</td>
                                <td>{match.lowChamber}</td>
                                <td>{match.autoPoints}</td>
                                <td>{match.dcPoints}</td>
                                <td>{match.totalPoints}</td>
                                <td style="color: blue;">{match.penaltyPointsCommitted}</td>
                            {/if}
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}
</div>