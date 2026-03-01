const { spawn } = require('child_process');
const path = require('path');

const enginePath = path.join(__dirname, '..', 'engine', 'route_engine.exe');
const dataDirPath = path.join(__dirname, '..', 'master_train_data.json');

async function testEngine(request) {
    return new Promise((resolve, reject) => {
        const proc = spawn(enginePath, [dataDirPath]);
        let output = '';
        let error = '';

        proc.stdout.on('data', (data) => output += data.toString());
        proc.stderr.on('data', (data) => error += data.toString());

        proc.stdin.write(JSON.stringify({ ...request, request_id: "test" }) + '\n');

        // Wait a bit for engine to process
        setTimeout(() => {
            proc.kill();
            try {
                const json = JSON.parse(output.trim().split('\n').pop());
                resolve(json);
            } catch (e) {
                reject(new Error(`Failed to parse output: ${output}\nStderr: ${error}`));
            }
        }, 5000);
    });
}

async function runTests() {
    console.log("--- Starting Engine Tests ---");

    // 1. KOP to CSMT (Direct or with switches)
    console.log("Test 1: KOP to CSMT...");
    try {
        const res = await testEngine({ from: "KOP", to: "CSMT", date: "2024-03-01", max_switches: 1 });
        if (res.results && res.results.length > 0) {
            console.log(`✅ Success: Found ${res.results.length} routes. First route: ${res.results[0].total_time_formatted}`);
        } else {
            console.error("❌ Failed: No routes found for KOP -> CSMT");
        }
    } catch (e) {
        console.error("❌ Test 1 Error:", e.message);
    }

    // 2. Same Station
    console.log("\nTest 2: Same Station (KOP to KOP)...");
    try {
        const res = await testEngine({ from: "KOP", to: "KOP", date: "2024-03-01" });
        if (res.error) {
            console.log("✅ Success: Received expected error:", res.error);
        } else {
            console.error("❌ Failed: Did not receive erorr for KOP -> KOP");
        }
    } catch (e) {
        console.error("❌ Test 2 Error:", e.message);
    }

    // 3. Invalid Station
    console.log("\nTest 3: Invalid Station...");
    try {
        const res = await testEngine({ from: "XXXX", to: "YYYY", date: "2024-03-01" });
        if (res.error || (res.results && res.results.length === 0)) {
            console.log("✅ Success: Handled invalid stations correctly");
        } else {
            console.error("❌ Failed: Did not handle invalid stations correctly");
        }
    } catch (e) {
        console.error("❌ Test 3 Error:", e.message);
    }

    console.log("\n--- Engine Tests Complete ---");
    process.exit(0);
}

runTests();
