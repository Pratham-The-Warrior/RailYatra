/**
 * Feature module registry.
 *
 * A module is { name, mountPath, createRouter(deps) -> express.Router }.
 * It receives its dependencies (config, routing, caches, referenceData, log,
 * metrics) and must not import other modules. Adding a feature = adding a
 * folder here and one line below; nothing else changes.
 */
module.exports = [
    require('./system'),
    require('./journeys'),
    require('./stations'),
    require('./schedule'),
    require('./categories'),
    require('./pdf'),
    require('./livestatus')
];
