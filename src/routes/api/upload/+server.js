import { json } from "@sveltejs/kit";
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";

const FILE_PATHS = [
    path.resolve("/Users/ishanghosh/Downloads/Scouting Excel Files/All team OPR's(smallDB).xlsx"),
    path.resolve("/Users/ishanghosh/Downloads/Scouting Excel Files/all_teams_stats(mediumDB).xlsx"),
    path.resolve("/Users/ishanghosh/Downloads/Scouting Excel Files/scouting data with all info(bigDB WA).xlsx")
];

/**
 * ✅ Reads an Excel file and converts it to JSON
 */
function parseExcel(filePath) {
    try {
        console.log(`📂 Checking file: "${filePath}"`);
        
        if (!fs.existsSync(filePath)) {
            console.error(`❌ ERROR: File not found: "${filePath}"`);
            return []; // Return empty array if file is missing
        }

        console.log(`✅ File found: "${filePath}", Reading...`);
        const workbook = XLSX.readFile(filePath, { cellDates: true }); // ✅ Ensure dates are parsed properly
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        if (!sheet) {
            console.error(`❌ ERROR: No sheet found in file: "${filePath}"`);
            return [];
        }

        const data = XLSX.utils.sheet_to_json(sheet);
        console.log(`📊 Loaded ${data.length} rows from "${filePath}"`);
        return data.length > 0 ? data : [];
    } catch (error) {
        console.error(`❌ ERROR reading file: "${filePath}"`, error);
        return [];
    }
}

/**
 * ✅ Handles GET request to auto-upload files
 */
export async function GET() {
    try {
        console.log("🔍 Checking all file paths...");
        
        // ✅ Load all datasets
        const allFiles = FILE_PATHS.map(filePath => ({
            fileName: path.basename(filePath),
            data: parseExcel(filePath)
        })).filter(file => file.data.length > 0); // ✅ Remove empty datasets

        if (allFiles.length === 0) {
            console.error("❌ No valid files found!");
            return json({ success: false, message: "No valid files found!" });
        }

        console.log("✅ Successfully loaded files:", allFiles.map(f => f.fileName));
        return json({ success: true, files: allFiles });
    } catch (error) {
        console.error("❌ Unexpected Server Error:", error);
        return json({ success: false, message: "File upload failed", error: error.message }, { status: 500 });
    }
}