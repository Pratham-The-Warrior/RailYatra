/**
 * Minimal structured logger.
 * LOG_FORMAT=json emits one JSON object per line (for Loki/CloudWatch/ELK);
 * anything else emits human-readable lines for local development.
 */
const json = process.env.LOG_FORMAT === 'json';

function write(level, msg, fields) {
    if (json) {
        const line = JSON.stringify({ ts: new Date().toISOString(), level, msg, ...fields });
        (level === 'error' ? process.stderr : process.stdout).write(line + '\n');
        return;
    }
    const extra = fields && Object.keys(fields).length ? ' ' + JSON.stringify(fields) : '';
    (level === 'error' ? console.error : console.log)(`[${level}] ${msg}${extra}`);
}

module.exports = {
    info: (msg, fields) => write('info', msg, fields),
    warn: (msg, fields) => write('warn', msg, fields),
    error: (msg, fields) => write('error', msg, fields)
};
