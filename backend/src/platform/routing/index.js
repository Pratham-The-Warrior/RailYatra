const { createEnginePool } = require('./enginePool');

/**
 * RoutingPort: the only way feature modules reach the route-finding engine.
 *
 * @typedef {Object} RoutingPort
 * @property {() => void} start
 * @property {(payload: object) => Promise<any>} request  engine protocol request (see engine/handlers.hpp)
 * @property {() => Promise<string>} reload               zero-downtime data reload; resolves with the data version
 * @property {() => Promise<boolean>} shutdown   resolves true once every engine has exited
 * @property {() => boolean} isReady
 * @property {() => Array<object>} status
 * @property {() => (string|null)} dataVersion
 *
 * Adapters: "local" (engine processes inside this instance). A remote adapter
 * (engine as its own horizontally scaled service) can implement the same
 * interface when routing CPU needs to scale independently of the API tier.
 */
function createRouting(deps) {
    switch (deps.config.routingAdapter) {
        case 'local':
            return createEnginePool(deps);
        default:
            throw new Error(`Unknown routing adapter: ${deps.config.routingAdapter}`);
    }
}

module.exports = { createRouting };
