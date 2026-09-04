/**
 * Generic AgentForge Tool Contract
 *
 * Every tool exposes a common interface so the runtime
 * can discover and execute tools without knowing their
 * implementation details.
 */

/**
 * @typedef {Object} Tool
 * @property {string} name
 * @property {string} description
 * @property {Object} schema
 * @property {string} [permission]
 * @property {(input: Object) => Promise<*>} execute
 */

export {};
