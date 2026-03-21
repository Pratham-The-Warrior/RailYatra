const path = require('path');

const isWindows = process.platform === 'win32';
const engineFileName = isWindows ? 'route_engine.exe' : 'route_engine';

// Base directory for the entire project (RailYatra root)
// __dirname is backend/src/config
const projectRoot = path.join(__dirname, '..', '..', '..');

module.exports = {
    port: process.env.PORT || 3000,
    enginePath: path.join(projectRoot, 'engine', engineFileName),
    dataDirPath: path.join(projectRoot, 'master_train_data.json'),
    pdfDirPath: path.join(projectRoot, 'train_pdf'),
    pdfBaseUrl: process.env.PDF_BASE_URL || null,
    isWindows
};
