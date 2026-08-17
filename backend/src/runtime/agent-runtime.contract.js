/**
 * Generic Agent Runtime Contract
 *
 * The runtime executes a Worker configuration without
 * depending on a specific AI provider.
 */

/**
 * @typedef {Object} RuntimeRequest
 * @property {Object} worker
 * @property {string} worker.id
 * @property {string} worker.name
 * @property {string} worker.instructions
 * @property {string} worker.model
 * @property {Object} worker.configuration
 * @property {string} input
 * @property {Object} [context]
 */

/**
 * @typedef {Object} RuntimeResult
 * @property {boolean} success
 * @property {string|null} output
 * @property {Object} [metadata]
 * @property {Object} [error]
 */

/**
 * @typedef {Object} ModelRequest
 * @property {string} model
 * @property {string} prompt
 * @property {Object} [configuration]
 */

/**
 * @typedef {Object} ModelResponse
 * @property {string} output
 * @property {Object} [metadata]
 */

/**
 * Model providers must expose a generate method
 * that accepts a provider-agnostic ModelRequest
 * and returns a ModelResponse.
 *
 * @typedef {Object} ModelProvider
 * @property {(request: ModelRequest) => Promise<ModelResponse>} generate
 */

export {};
