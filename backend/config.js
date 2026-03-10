const path = require('path');

const isWindows = process.platform === 'win32';
const engineFileName = isWindows ? 'route_engine.exe' : 'route_engine';

module.exports = {
    port: process.env.PORT || 3000,
    enginePath: path.join(__dirname, '..', 'engine', engineFileName),
    dataDirPath: path.join(__dirname, '..', 'master_train_data.json'),
    pdfDirPath: path.join(__dirname, '..', 'train_pdf'),
    pdfBaseUrl: process.env.PDF_BASE_URL || null,
    isWindows
};
