<script>
    import { onMount } from "svelte";
    import * as XLSX from 'xlsx';

    const API_URL = "https://api.ftcscout.org/graphql";
    let loading = false;
    let message = "";
    let eventData = [];

    /**
     * Fetches event statistics for all teams in the given region and season.
     * It retrieves team numbers, event names, and average sample/specimen points.
     * 
     * @returns {Promise<Array>} - Returns an array of team event statistics.
     */
    async function fetchEventStats() {
        const query = `
        query {
            eventsSearch(season: 2024, region: USWA) {
                teams {
                    teamNumber
                    event {
                        name
                    }
                    stats {
                        ... on TeamEventStats2024 {
                            tot {
                                dcSampleLowPoints
                                dcSampleHighPoints
                                dcSpecimenLowPoints
                                dcSpecimenHighPoints
                            }
                        }
                    }
                }
            }
        }`;

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query })
            });

            const json = await response.json();
            console.log("✅ Full API Response:", json);

            if (!json?.data?.eventsSearch) {
                console.error("❌ No events found in API response.");
                return [];
            }

            let teamsData = json.data.eventsSearch.flatMap(event => event.teams || []);

            // Ensure stats exist before accessing properties
            return teamsData
                .filter(team => team.stats?.tot) // ✅ Only include teams with stats
                .map(team => ({
                    teamNumber: team.teamNumber || "N/A",
                    eventName: team.event?.name || "Unknown Event",
                    avgSampleLow: team.stats?.tot?.dcSampleLowPoints || 0,
                    avgSampleHigh: team.stats?.tot?.dcSampleHighPoints || 0,
                    avgSpecimenLow: team.stats?.tot?.dcSpecimenLowPoints || 0,
                    avgSpecimenHigh: team.stats?.tot?.dcSpecimenHighPoints || 0
                }));

        } catch (error) {
            console.error("❌ Error fetching event stats:", error);
            return []; // Return empty array on error
        }
    }

    /**
     * Generates and downloads an Excel file containing team event statistics.
     * The file includes team numbers, event names, and average scores.
     */
    async function generateExcel() {
        loading = true;
        message = "Fetching event stats...";

        eventData = await fetchEventStats();

        if (eventData.length === 0) {
            message = "❌ No valid event stats found!";
            loading = false;
            return;
        }

        message = "Generating Excel file...";

        const headers = [
            ["Team Number", "Event Name", "Avg Sample Low basket Score", "Avg number of low samples", "Avg Sample High basket Score", "avg number of high samples", "Avg Specimen Low rung Score", "Avg number of low specimen on the runf", "Avg Specimen High rung score", "avg number of specimen on the high rung"]
        ];

        // Convert data into an array of arrays
        const formattedData = eventData.map(row => [
            row.teamNumber,
            row.eventName,
            row.avgSampleLow,
            row.avgSampleLow/4,
            row.avgSampleHigh,
            row.avgSampleHigh/8,
            row.avgSpecimenLow,
            row.avgSpecimenLow/6,
            row.avgSpecimenHigh,
            row.avgSpecimenHigh/10
        ]);

        // ✅ Generate Excel Sheet
        const worksheet = XLSX.utils.aoa_to_sheet([...headers, ...formattedData]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Event Stats");

        // ✅ Save Excel File
        XLSX.writeFile(workbook, "team_event_averages.xlsx");

        message = "✅ Excel file downloaded as 'team_event_averages.xlsx'!";
        loading = false;
    }
</script>

<!-- UI Elements -->
<button on:click={generateExcel} disabled={loading}>
    {loading ? "Fetching Data..." : "Download Event Stats Excel"}
</button>
<p>{message}</p>