/**
 * API contract tests: real responses must match docs/openapi.json.
 * Every documented path is exercised, every feature module is documented,
 * and every response is validated against the schema for its status code.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const Ajv2020 = require('ajv/dist/2020');

const { createContainer } = require('../src/container');
const { createApp } = require('../src/app');
const modules = require('../src/modules');

const spec = require(path.resolve(__dirname, '..', '..', 'docs', 'openapi.json'));

// Re-home component schemas under $defs so a strict JSON Schema validator can resolve $refs.
const defs = JSON.parse(JSON.stringify(spec.components.schemas).replaceAll('#/components/schemas/', 'railyatra#/$defs/'));
const ajv = new Ajv2020({ allErrors: true, strict: true });
ajv.addSchema({ $id: 'railyatra', $defs: defs });

const CASES = [
    ['GET', '/api/route', '/api/route?from=NDLS&to=CSMT&date=2026-10-20&top_k=5', 200],
    ['GET', '/api/route', '/api/route?from=CITY:MUMBAI&to=CITY:DELHI&date=2026-10-20&top_k=5', 200],
    ['GET', '/api/route', '/api/route?from=NDLS', 400],
    ['GET', '/api/route', '/api/route?from=NDLS&to=NDLS&date=2026-10-20', 400],
    ['POST', '/api/route', '/api/route', 200, { from: 'KOP', to: 'HWH', date: '2026-10-20', max_switches: 2, top_k: 3 }],
    ['POST', '/api/route', '/api/route', 400, { from: 'KOP' }],
    ['GET', '/api/route/pareto', '/api/route/pareto?from=NDLS&to=CSMT&date=2026-10-20&max_switches=3', 200],
    ['GET', '/api/route/pareto', '/api/route/pareto?from=XXXX&to=CSMT&date=2026-10-20', 400],
    ['GET', '/api/stations', '/api/stations?q=mumbai', 200],
    ['GET', '/api/stations', '/api/stations?q=a', 200],
    ['GET', '/api/schedule/{trainNumber}', '/api/schedule/12138', 200],
    ['GET', '/api/schedule/{trainNumber}', '/api/schedule/99999', 404],
    ['GET', '/api/schedule/{trainNumber}', '/api/schedule/abc', 400],
    ['GET', '/api/category/{category}', '/api/category/vandebharat', 200],
    ['GET', '/api/category/{category}', '/api/category/nope', 404],
    ['GET', '/api/pdf/{trainNumber}', '/api/pdf/abc', 400],
    ['GET', '/api/pdf/{trainNumber}', '/api/pdf/12138', 404],
    ['GET', '/api/livestatus/{trainNumber}', '/api/livestatus/12138', 200],
    ['GET', '/api/livestatus/{trainNumber}', '/api/livestatus/99999', 404],
    ['GET', '/api/livestatus/{trainNumber}', '/api/livestatus/abc', 400],
    ['GET', '/api/health', '/api/health', 200],
];

const container = createContainer({ env: { ...process.env, RATE_LIMIT_ENABLED: '0', ENGINE_POOL_SIZE: '1' } });
let server, base;

before(async () => {
    container.start();
    server = createApp(container).listen(0);
    base = `http://127.0.0.1:${server.address().port}`;
    for (let i = 0; i < 200 && !container.routing.isReady(); i++) await new Promise((r) => setTimeout(r, 50));
    assert.ok(container.routing.isReady(), 'engine did not become ready');
});

after(async () => { await container.shutdown(); server.close(); });

for (const [method, specPath, url, expected, body] of CASES) {
    test(`${method} ${url} -> ${expected} matches the contract`, async () => {
        const op = spec.paths[specPath] && spec.paths[specPath][method.toLowerCase()];
        assert.ok(op, `${method} ${specPath} is not documented`);
        const documented = op.responses[String(expected)];
        assert.ok(documented, `status ${expected} is not documented for ${method} ${specPath}`);

        const res = await fetch(base + url, body
            ? { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
            : { method, redirect: 'manual' });
        assert.strictEqual(res.status, expected);

        const schema = documented.content && documented.content['application/json'] && documented.content['application/json'].schema;
        if (schema) {
            const validate = ajv.compile({ $ref: schema.$ref.replace('#/components/schemas/', 'railyatra#/$defs/') });
            const json = await res.json();
            assert.ok(validate(json), `${url}: ${ajv.errorsText(validate.errors)}`);
        }
    });
}

test('every documented path is exercised and every feature module is documented', () => {
    const exercised = new Set(CASES.map((c) => c[1]));
    for (const p of Object.keys(spec.paths)) assert.ok(exercised.has(p), `documented path ${p} has no contract test`);
    for (const m of modules.filter((m) => m.mountPath.startsWith('/api'))) {
        assert.ok(Object.keys(spec.paths).some((p) => p.startsWith(m.mountPath)), `module ${m.name} (${m.mountPath}) is not documented`);
    }
});
