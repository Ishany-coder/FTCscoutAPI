import { json } from '@sveltejs/kit';

const API_URL = "https://api.ftcscout.org/graphql";

async function fetchTeamData(teamNumber) {
    console.log(`📥 Fetching data for team ${teamNumber}...`);

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
        console.log(`✅ Data fetched for team ${teamNumber}:`, json);

        return json?.data?.teamByNumber?.events?.flatMap(event =>
            event.matches.flatMap(m => {
                const redScore = m.match.scores?.red;
                const blueScore = m.match.scores?.blue;

                return [
                    redScore ? {
                        teamNumber,
                        matchId: redScore.matchId,
                        eventName: event.name,
                        alliance: "Red",
                        autoHighBasket: redScore.autoSampleHigh || 0,
                        autoLowBasket: redScore.autoSampleLow || 0,
                        teleopHighBasket: redScore.dcSampleHigh || 0,
                        teleopLowBasket: redScore.dcSampleLow || 0,
                        autoPoints: redScore.autoPoints || 0,
                        teleopPoints: redScore.dcPoints || 0,
                        totalPoints: redScore.totalPoints || 0,
                        penaltyPoints: redScore.penaltyPointsCommitted || 0
                    } : null,

                    blueScore ? {
                        teamNumber,
                        matchId: blueScore.matchId,
                        eventName: event.name,
                        alliance: "Blue",
                        autoHighBasket: blueScore.autoSampleHigh || 0,
                        autoLowBasket: blueScore.autoSampleLow || 0,
                        teleopHighBasket: blueScore.dcSampleHigh || 0,
                        teleopLowBasket: blueScore.dcSampleLow || 0,
                        autoPoints: blueScore.autoPoints || 0,
                        teleopPoints: blueScore.dcPoints || 0,
                        totalPoints: blueScore.totalPoints || 0,
                        penaltyPoints: blueScore.penaltyPointsCommitted || 0
                    } : null
                ].filter(Boolean);
            })
        ) || [];

    } catch (err) {
        console.error(`❌ Error fetching data for team ${teamNumber}:`, err);
        return [];
    }
}

export async function POST({ request }) {
    try {
        const { teamNumbers } = await request.json();
        if (!Array.isArray(teamNumbers) || teamNumbers.length === 0) {
            return json({ error: "Invalid teamNumbers format. Expected an array." }, { status: 400 });
        }

        let allTeamData = [];

        for (const teamNumber of teamNumbers) {
            const teamData = await fetchTeamData(teamNumber);
            allTeamData = [...allTeamData, ...teamData];
        }

        return json({ success: true, data: allTeamData });

    } catch (error) {
        console.error("❌ Error fetching team data:", error);
        return json({ error: "Failed to fetch team data", details: error.message }, { status: 500 });
    }
}