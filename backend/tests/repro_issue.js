const { transformLiveStatus } = require('../src/services/transformer.service');

const mockStatusData = {
    meta: {
        current_location: "ARRIVED AT BURHANPUR AT 20:42 22-MAR",
        start_date: "22-MAR-2026"
    },
    itinerary: [
        {
            station: "BURHANPUR",
            station_code: "BAU",
            timings: {
                sch_arr: "20:03 22-MAR",
                sch_dep: "20:05 22-MAR",
                act_arr: "20:42 22-MAR",
                act_dep: "20:05 22-MAR" // This is the issue: scheduled departure shown instead of delayed
            },
            status: "DELAYED BY 39 MIN"
        }
    ]
};

const result = transformLiveStatus(mockStatusData);
const bau = result.itinerary[0];

console.log("Station:", bau.station);
console.log("Scheduled Arrival:", bau.timings.sch_arr);
console.log("Scheduled Departure:", bau.timings.sch_dep);
console.log("Actual Arrival:", bau.timings.act_arr);
console.log("Actual Departure (before fix):", bau.timings.act_dep);

if (bau.timings.act_dep === "20:05 22-MAR") {
    console.log("❌ REPRODUCTION SUCCESSFUL: Expected Departure is still scheduled time.");
} else {
    console.log("✅ FIXED: Expected Departure updated to:", bau.timings.act_dep);
}
