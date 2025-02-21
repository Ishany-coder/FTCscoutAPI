<script>
    import { onMount } from "svelte";

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
            return { matchType: "Playoff", matchNumber: (matchId - 20001)/1000 };
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
query{
	teamByNumber(number:${teamNumber}){
    events(season:2024){
      matches{
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

            const json = await response.json();
            data1 = json?.data?.teamByNumber?.events?.flatMap(event =>
                event.matches.map(m => {
                    const { matchType, matchNumber } = determineMatchType(m.matchId);
                    return {
                        matchId: m.matchId,
                        matchType,
                        matchNumber,
                        eventName: event.name,
                    };
                })
            ) || [];

            console.log("Filtered Matches:", data1);
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
            data2 = json?.data?.teamByNumber?.events?.flatMap(event =>
                event.matches.map(m => {
                    const scoreData = m.match.scores?.red;
                    if (!scoreData) return null;

                    return {
                        matchId: scoreData.matchId,
                        eventCode: scoreData.eventCode || "N/A",
                        alliance: scoreData.alliance || "Unknown",
                        highBasket: scoreData.autoSampleHigh + scoreData.dcSampleHigh,
                        lowBasket: scoreData.autoSampleLow + scoreData.dcSampleLow,
                        highChamber: scoreData.autoSpecimenHigh + scoreData.dcSpecimenHigh,
                        lowChamber: scoreData.autoSpecimenLow + scoreData.dcSpecimenLow,
                        autoPoints: scoreData.autoPoints,
                        dcPoints: scoreData.dcPoints,
                        totalPoints: scoreData.totalPoints,
                        penaltyPointsCommitted: scoreData.penaltyPointsCommitted,
                    };
                })
            ).filter(Boolean) || [];

            for (let match of data2) {
                if (match.eventCode && match.eventCode !== "N/A") {
                    await fetchEventName(match.eventCode);
                }
            }

            console.log("Filtered Scores:", data2);
        } catch (err) {
            console.error("Error fetching data2:", err);
        }
    }

    function mergeData() {
        const matchMap = new Map();

        data1.forEach(match => {
            matchMap.set(match.matchId, { ...match });
        });

        data2.forEach(score => {
            if (matchMap.has(score.matchId)) {
                matchMap.set(score.matchId, { ...matchMap.get(score.matchId), ...score });
            }
        });

        mergedData = Array.from(matchMap.values());
        console.log("Merged Data:", mergedData);
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
                    {#each mergedData as match}
                        <tr>
                            <td>{match.matchNumber}</td>
                            <td>{match.matchType}</td>
                            <td>{eventNames[match.eventCode] || match.eventName}</td>
                            <td>{match.alliance}</td>
                            <td>{match.highBasket}</td>
                            <td>{match.lowBasket}</td>
                            <td>{match.highChamber}</td>
                            <td>{match.lowChamber}</td>
                            <td>{match.autoPoints}</td>
                            <td>{match.dcPoints}</td>
                            <td>{match.totalPoints}</td>
                            <td style="color: red;">{match.penaltyPointsCommitted}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}
</div>