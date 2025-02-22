<script>
    import { onMount } from "svelte";
    import * as XLSX from "xlsx";

    let uploadedFiles = [];
    let message = "📂 Upload your Excel files";
    let selectedFiles = [];
    let chatResponse = "";
    let question = "";

    /**
     * ✅ Handle file selection
     */
    function handleFileUpload(event) {
        selectedFiles = Array.from(event.target.files);
    }

    /**
     * ✅ Read Excel file and convert to JSON
     */
    async function parseExcel(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: "array" });
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];

                    if (!sheet) {
                        console.error(`❌ ERROR: No sheet found in file: "${file.name}"`);
                        resolve(null);
                    }

                    const jsonData = XLSX.utils.sheet_to_json(sheet);
                    console.log(`📊 Loaded ${jsonData.length} rows from "${file.name}"`);
                    resolve({ fileName: file.name, data: jsonData });
                } catch (error) {
                    console.error(`❌ ERROR reading file: "${file.name}"`, error);
                    resolve(null);
                }
            };

            reader.onerror = (error) => reject(error);
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * ✅ Upload & Process Files
     */
    async function uploadFiles() {
        message = "⏳ Processing files...";
        uploadedFiles = [];

        for (const file of selectedFiles) {
            const parsedData = await parseExcel(file);
            if (parsedData) uploadedFiles.push(parsedData);
        }

        if (uploadedFiles.length === 0) {
            message = "❌ No valid files uploaded.";
            console.error("❌ Upload Failed: No valid files found!");
            return;
        }

        message = `✅ Successfully uploaded ${uploadedFiles.length} files!`;
        console.log("📊 Uploaded Data:", uploadedFiles);
    }

    /**
     * ✅ Send JSON to ChatGPT
     */
    async function askChatGPT() {
        if (!question.trim()) {
            chatResponse = "❌ Please enter a question.";
            return;
        }

        if (uploadedFiles.length === 0) {
            chatResponse = "❌ No files uploaded yet.";
            return;
        }

        chatResponse = "⏳ Asking ChatGPT...";
        console.log("🔍 Sending to ChatGPT:", { files: uploadedFiles, query: question });

        try {
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer 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`
                },
                body: JSON.stringify({
                    model: "gpt-4-turbo",
                    messages: [
                        { role: "system", content: "You are an AI that answers questions based on uploaded Excel data." },
                        { role: "user", content: `Here is the data: ${JSON.stringify(uploadedFiles)}. Answer this: ${question}` }
                    ]
                })
            });

            const json = await response.json();
            chatResponse = json.choices?.[0]?.message?.content || "❌ No response from ChatGPT.";
        } catch (error) {
            console.error("❌ ChatGPT Error:", error);
            chatResponse = "❌ Failed to connect to ChatGPT.";
        }
    }
</script>

<style>
    .container { max-width: 90%; margin: 20px auto; padding: 20px; text-align: center; }
    .table-container { max-height: 500px; overflow: auto; margin-top: 20px; border: 1px solid #ddd; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px; border: 1px solid #ddd; text-align: left; white-space: nowrap; }
    th { background-color: #007bff; color: white; }
    textarea { width: 80%; height: 80px; margin-top: 10px; }
</style>

<div class="container">
    <h1>📊 Upload Scouting Data</h1>
    
    <!-- File Upload -->
    <input type="file" multiple on:change={handleFileUpload} accept=".xls,.xlsx" />
    <button on:click={uploadFiles}>Upload Files</button>
    <p>{message}</p>

    <!-- Display Uploaded Files -->
    {#if uploadedFiles.length > 0}
        {#each uploadedFiles as file}
            <h2>{file.fileName}</h2>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            {#each Object.keys(file.data[0]) as key}
                                <th>{key}</th>
                            {/each}
                        </tr>
                    </thead>
                    <tbody>
                        {#each file.data as row}
                            <tr>
                                {#each Object.values(row) as value}
                                    <td>{value}</td>
                                {/each}
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/each}
    {/if}

    <!-- Ask ChatGPT -->
    <h2>🔍 Ask ChatGPT</h2>
    <textarea bind:value={question} placeholder="Ask something about the data..."></textarea>
    <button on:click={askChatGPT}>Ask</button>
    <p>{chatResponse}</p>
</div>