<script>
    import { onMount } from "svelte";
    import * as XLSX from 'xlsx';

    // List of all teams in WA
    // 3543, 3861, 4053, 4054, 5604, 5971, 6128, 6188, 6424, 6427, 6559, 7299, 7732, 7759, 7760, 7830, 
    // 7935, 8099, 8103, 8548, 8693, 9330, 9876, 9884, 11109, 11138, 11186, 11990, 12005, 12069, 12217, 
    //     13052, 13480, 13484, 13601, 13648, 14822, 15010, 15203, 15324, 15337, 16451, 16655, 16750, 17077, 
    //     17239, 17303, 17595, 18079, 18104, 18215, 18225, 18249, 18282, 18693, 19589, 19669, 19708, 19800, 
    //     20021, 20118, 20219, 20403, 20654, 21229, 21336, 21379, 21764, 21939, 22149, 22152, 22237, 22271, 
    //     22333, 22334, 22347, 22356, 22484, 22485, 23206, 23244, 23269, 23270, 23305, 23368, 23383, 23398, 
    //     23442, 23795, 23801, 23849, 24046, 24112, 24131, 24175, 24196, 24211, 24214, 24245, 24291, 24305, 
    //     24317, 24336, 24386, 24489, 24620, 24621, 24744, 24860, 24861, 25531, 25717, 25734, 25741, 25778, 
    //     25984, 26021, 26135, 26165, 26215, 26251, 26336, 26861, 27059, 27152, 27189, 27288, 27349, 27366, 
    //     27393, 27516, 27588, 27603, 27782

    let teamNumbers = [
    3543, 3861, 4053, 4054, 5604, 5971, 6128, 6188, 6424, 6427, 6559, 7299, 7732, 7759, 7760, 7830, 
    7935, 8099, 8103, 8548, 8693, 9330, 9876, 9884, 11109, 11138, 11186, 11990, 12005, 12069, 12217, 
    13052, 13480, 13484, 13601, 13648, 14822, 15010, 15203, 15324, 15337, 16451, 16655, 16750, 17077, 
    17239, 17303, 17595, 18079, 18104, 18215, 18225, 18249, 18282, 18693, 19589, 19669, 19708, 19800, 
    20021, 20118, 20219, 20403, 20654, 21229, 21336, 21379, 21764, 21939, 22149, 22152, 22237, 22271, 
    22333, 22334, 22347, 22356, 22484, 22485, 23206, 23244, 23269, 23270, 23305, 23368, 23383, 23398, 
    23442, 23795, 23801, 23849, 24046, 24112, 24131, 24175, 24196, 24211, 24214, 24245, 24291, 24305, 
    24317, 24336, 24386, 24489, 24620, 24621, 24744, 24860, 24861, 25531, 25717, 25734, 25741, 25778, 
    25984, 26021, 26135, 26165, 26215, 26251, 26336, 26861, 27059, 27152, 27189, 27288, 27349, 27366, 
    27393, 27516, 27588, 27603, 27782
    ];

    const API_URL = "https://api.ftcscout.org/graphql";
    let loading = false;
    let message = "";
    let eventNamesCache = {}; // ✅ Cache for event names

    function determineMatchTypeAndNumber(matchId) {
        if (matchId > 20000) {
            console.log("got MatchID > 20000", matchId);
            let matchNumber = (matchId - 20001) / 1000;
            console.log("matchNumber", matchNumber);
            return { matchType: "Playoff", matchNumber: (matchId - 20001) / 1000 };
        }
        return { matchType: "Qualification", matchNumber: matchId };
    }

    async function fetchEventName(eventCode) {
        // ✅ Check cache first to avoid unnecessary API calls
        if (eventNamesCache[eventCode]) {
            return eventNamesCache[eventCode];
        }

        const query = `
        query {
            eventByCode(code: "${eventCode}", season: 2024) {
                name
            }
        }`;

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query }),
            });

            const json = await response.json();
            const eventName = json?.data?.eventByCode?.name || "Unknown Event";

            // ✅ Store in cache for future requests
            eventNamesCache[eventCode] = eventName;
            return eventName;
        } catch (error) {
            console.error(`❌ Error fetching event name for ${eventCode}:`, error);
            return "Unknown Event";
        }
    }

    async function fetchMatchDataForTeam(teamNumber) {
        const query = `
        query {
            teamByNumber(number: ${teamNumber}) {
                events(season: 2024) {
                    matches {
                        alliance
                        match {
                            matchNum
                            scores {
                                ... on MatchScores2024 {
                                    red {
                                        eventCode
                                        matchId
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
            if (!json?.data?.teamByNumber?.events) {
                console.warn(`⚠️ No events found for team ${teamNumber}`);
                return [];
            }

            return await Promise.all(json.data.teamByNumber.events.flatMap(async (event) =>
                await Promise.all(event.matches.map(async (m) => {
                    const teamAlliance = m.alliance; // ✅ Team's actual alliance

                    if (!m.match?.scores) {
                        console.warn(`⚠️ No score data for match ${m.match?.matchNum} (Team ${teamNumber})`);
                        return null;
                    }

                    const matchScore = m.match.scores[teamAlliance.toLowerCase()] || {}; // ✅ Get only correct alliance score
                    const { matchType, matchNumber } = determineMatchTypeAndNumber(matchScore.matchId);
                    console.log("match number", matchNumber);
                    console.log("MatchType", matchType);
                    const eventName = matchScore.eventCode ? await fetchEventName(matchScore.eventCode) : "Unknown Event"; // ✅ Fetch event name

                    return matchScore.matchId ? [
                        teamNumber,
                        matchScore.matchId,
                        eventName, // ✅ Replace event code with event name
                        matchType,
                        matchNumber,
                        teamAlliance,
                        (matchScore.autoSampleHigh || 0) + (matchScore.dcSampleHigh || 0),
                        (matchScore.autoSampleLow || 0) + (matchScore.dcSampleLow || 0),
                        (matchScore.autoSpecimenHigh || 0) + (matchScore.dcSpecimenHigh || 0),
                        (matchScore.autoSpecimenLow || 0) + (matchScore.dcSpecimenLow || 0),
                        matchScore.autoPoints || 0,
                        matchScore.dcPoints || 0,
                        matchScore.totalPoints || 0,
                        matchScore.penaltyPointsCommitted || 0
                    ] : null;
                }))
            ));
        } catch (err) {
            console.error(`❌ Error fetching data for team ${teamNumber}:`, err);
            return [];
        }
    }

    async function generateExcel() {
        loading = true;
        message = "Fetching data...";

        const allMatchData = [];
        for (const teamNumber of teamNumbers) {
            console.log(`🔄 Fetching data for team ${teamNumber}...`);
            const teamMatchData = await fetchMatchDataForTeam(teamNumber);
            allMatchData.push(...teamMatchData);
        }

        if (allMatchData.length === 0) {
            message = "❌ No match data found!";
            loading = false;
            return;
        }

        message = "Generating Excel...";

        const headers = [
            ["Team Number", "Match ID", "Event Name", "Match Type", "Match Number", "Alliance", 
            "High Basket", "Low Basket", "High Chamber", "Low Chamber", "Auto Score", "Teleop Score", 
            "Total Points", "Penalties"]
        ];

        // ✅ Ensure the data format is correct (Array of Arrays)
        const worksheet = XLSX.utils.aoa_to_sheet([...headers, ...allMatchData.flat()]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "All Teams Match Data");

        // ✅ Download the file
        XLSX.writeFile(workbook, "all_teams_match_data.xlsx");

        message = "✅ Excel file downloaded!";
        loading = false;
    }
</script>

<button on:click={generateExcel} disabled={loading}>
    {loading ? "Fetching Data..." : "Download Excel"}
</button>
<p>{message}</p>