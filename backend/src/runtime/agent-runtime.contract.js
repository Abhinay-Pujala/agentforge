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
 * @typedef {Object} ModelMessage
 * @property {"system"|"user"|"assistant"} role
 * @property {string} content
 */

/**
 * @typedef {Object} ModelRequest
 * @property {string} model
 * @property {ModelMessage[]} messages
 * @property {Object} [configuration]
 * @property {Object[]} [tools]
 */

/**
 * @typedef {Object} ToolCall
 * @property {string} id
 * @property {string} tool
 * @property {Object} arguments
 */

/**
 * @typedef {Object} ModelResponse
 * @property {string|null} output
 * @property {ToolCall[]} [toolCalls]
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
