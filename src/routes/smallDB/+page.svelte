<script>
    import { onMount } from "svelte";
    import * as XLSX from 'xlsx';

    const API_URL = "https://api.ftcscout.org/graphql";
    let loading = false;
    let message = "";
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
    
    /**
     * Rounds a number to the nearest hundredth.
     * 
     * @param {number} value - The number to round.
     * @returns {number} - Rounded value to two decimal places.
     */
    function roundToHundredth(value) {
        return Math.round(value * 100) / 100;
    }

    /**
     * Fetches quick statistics for a specific team.
     * Retrieves total, auto, driver control (dc), and endgame (eg) stats.
     * 
     * @param {number} teamNumber - The team number to fetch stats for.
     * @returns {Promise<Object>} - Returns an object containing quick stats.
     */
    async function fetchTeamStats(teamNumber) {
        const query = `
        query {
            teamByNumber(number: ${teamNumber}) {
                quickStats(season: 2024, region: USWA) {
                    tot { value }
                    auto { value }
                    dc { value }
                    eg { value }
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
            console.log(`✅ API Response for Team ${teamNumber}:`, json);

            const stats = json?.data?.teamByNumber?.quickStats;
            if (!stats) {
                console.warn(`⚠️ No stats found for team ${teamNumber}`);
                return null;
            }

            return {
                teamNumber: teamNumber,
                totalPoints: roundToHundredth(stats.tot?.value || 0),
                autoPoints: roundToHundredth(stats.auto?.value || 0),
                dcPoints: roundToHundredth(stats.dc?.value || 0),
                endgamePoints: roundToHundredth(stats.eg?.value || 0)
            };

        } catch (error) {
            console.error(`❌ Error fetching stats for team ${teamNumber}:`, error);
            return null;
        }
    }

    /**
     * Fetches quick stats for all specified teams and generates an Excel file.
     */
    async function generateExcel() {
        loading = true;
        message = "Fetching stats for all teams...";

        const allStats = [];

        for (const teamNumber of teamNumbers) {
            console.log(`🔄 Fetching stats for Team ${teamNumber}...`);
            const teamStat = await fetchTeamStats(teamNumber);
            if (teamStat) {
                allStats.push(teamStat);
            }
        }

        if (allStats.length === 0) {
            message = "❌ No stats found for any teams!";
            loading = false;
            return;
        }

        message = "Generating Excel file...";

        const headers = [["Team Number", "Total Points", "Auto Points", "Driver-Controlled Points", "Endgame Points"]];

        // Convert data into an array of arrays
        const formattedData = allStats.map(row => [
            row.teamNumber,
            row.totalPoints,
            row.autoPoints,
            row.dcPoints,
            row.endgamePoints
        ]);

        // ✅ Generate Excel Sheet
        const worksheet = XLSX.utils.aoa_to_sheet([...headers, ...formattedData]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "All Teams Stats");

        // ✅ Save Excel File
        XLSX.writeFile(workbook, "all_teams_stats.xlsx");

        message = `✅ Excel file downloaded as 'all_teams_stats.xlsx'!`;
        loading = false;
    }
</script>

<!-- UI Elements -->
<div>
    <button on:click={generateExcel} disabled={loading}>
        {loading ? "Fetching Data..." : "Download All Teams Stats"}
    </button>
</div>
<p>{message}</p>