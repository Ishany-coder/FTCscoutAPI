<script>
    import { onMount } from "svelte";
  
    let teamNumber = 23270; // Default team number
    let data = [];
    let error = null;
    let loading = false;
  
    const API_URL = "https://api.ftcscout.org/graphql";
  
    function determineMatchType(matchId) {
      const matchIdStr = matchId.toString();
      let matchType, matchNumber;
  
      if (matchIdStr.length > 4) {
        matchType = "Playoff";
        matchNumber = matchIdStr[1]; // ✅ Extract the **second** digit as the Playoff match number
      } else {
        matchType = "Qualification";
        matchNumber = matchId;
      }
  
      return { matchType, matchNumber };
    }
  
    async function fetchMatches() {
      loading = true;
      error = null;
      data = [];
  
      const query = `
        query {
          teamByNumber(number: ${teamNumber}) {
            events(season: 2024) {
              matches {
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
  
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
  
        const json = await response.json();
  
        data = json?.data?.teamByNumber?.events?.flatMap(event =>
          event.matches.map(m => {
            const { matchType, matchNumber } = determineMatchType(m.matchId);
            return {
              matchId: m.matchId,
              matchType,
              matchNumber,
            };
          })
        ) || [];
  
        console.log("Filtered Matches:", data);
  
      } catch (err) {
        error = err.message;
        console.error("Error fetching data:", err);
      } finally {
        loading = false;
      }
    }
  
    onMount(fetchMatches);
  </script>
  
  <style>
    .container {
      max-width: 600px;
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
    .input-group {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin-bottom: 15px;
    }
    input {
      padding: 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
      width: 100px;
      text-align: center;
    }
    button {
      padding: 8px 15px;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    button:hover {
      background-color: #0056b3;
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
    .error {
      text-align: center;
      color: red;
    }
    .loading {
      text-align: center;
      font-style: italic;
    }
  </style>
  
  <div class="container">
    <h1>FTC Matches</h1>
  
    <div class="input-group">
      <input
        type="number"
        bind:value={teamNumber}
        placeholder="Enter Team #"
      />
      <button on:click={fetchMatches}>Get Data</button>
    </div>
  
    {#if loading}
      <p class="loading">Loading...</p>
    {:else if error}
      <p class="error">Error: {error}</p>
    {:else if data.length === 0}
      <p class="loading">No matches found for Team {teamNumber}.</p>
    {:else}
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Match ID</th>
              <th>Match Type</th>
              <th>Match Number</th>
            </tr>
          </thead>
          <tbody>
            {#each data as match, index}
              <tr>
                <td>{match.matchId}</td>
                <td>{match.matchType}</td>
                <td>{match.matchNumber}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>