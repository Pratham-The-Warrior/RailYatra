const express = require('express');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const engine = require('./engine');

const app = express();

app.use(express.json());

// Routes
const routeRouter = require('./routes/route');
const stationsRouter = require('./routes/stations');
const scheduleRouter = require('./routes/schedule');
const pdfRouter = require('./routes/pdf');
const categoryRouter = require('./routes/category');

app.use('/api/route', routeRouter);
app.use('/api/stations', stationsRouter);
app.use('/api/schedule', scheduleRouter);
app.use('/api/pdf', pdfRouter);
app.use('/api/category', categoryRouter);

app.get('/api/health', (req, res) => {
    res.json({
        status: "ok",
        engine: !!engine.getEngineProcess(),
        platform: process.platform
    });
});

// Static Files (Frontend)
const distPath = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.use((req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });
}

const server = app.listen(config.port, () => {
    console.log(`Server running at http://localhost:${config.port}`);
    engine.spawnEngine();
});
