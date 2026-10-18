/**
 * Minimal structured logger.
 * LOG_FORMAT=json emits one JSON object per line (for Loki/CloudWatch/ELK);
 * anything else emits human-readable lines for local development.
 */
const json = process.env.LOG_FORMAT === 'json';
// Which replica wrote the line. The container sets this to config.instanceId so
// logs match the X-Instance-Id header and /api/health.
let instance = process.env.RAILWAY_REPLICA_ID || process.env.INSTANCE_ID || undefined;

function write(level, msg, fields) {
    if (json) {
        const line = JSON.stringify({ ts: new Date().toISOString(), level, msg, instance, ...fields });
        (level === 'error' ? process.stderr : process.stdout).write(line + '\n');
        return;
    }
    const extra = fields && Object.keys(fields).length ? ' ' + JSON.stringify(fields) : '';
    (level === 'error' ? console.error : console.log)(`[${level}] ${msg}${extra}`);
}

module.exports = {
    setInstance: (id) => { instance = id; },
    info: (msg, fields) => write('info', msg, fields),
    warn: (msg, fields) => write('warn', msg, fields),
    error: (msg, fields) => write('error', msg, fields)
};
