# Build script for RailYatra Engine
# Requires g++ (MinGW-w64)

$output = "route_engine.exe"

Write-Host "Compiling RailYatra Engine..." -ForegroundColor Cyan

g++ -O2 -std=c++17 main.cpp graph.cpp dijkstra.cpp -o $output

if ($LASTEXITCODE -eq 0) {
    Write-Host "Build Successful! Output: $output" -ForegroundColor Green
}
else {
    Write-Host "Build Failed!" -ForegroundColor Red
    exit 1
}
