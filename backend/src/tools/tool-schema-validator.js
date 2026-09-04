function validateType(value, type) {
  switch (type) {
    case "object":
      return (
        value !== null && typeof value === "object" && !Array.isArray(value)
      );

    case "string":
      return typeof value === "string";

    case "number":
      return typeof value === "number" && Number.isFinite(value);

    case "integer":
      return Number.isInteger(value);

    case "boolean":
      return typeof value === "boolean";

    default:
      return true;
  }
}

function validateSchema(value, schema, path = "arguments") {
  if (!schema || typeof schema !== "object") {
    return {
      valid: false,
      errors: [`Invalid schema at ${path}`],
    };
  }

  const errors = [];

  if (schema.type && !validateType(value, schema.type)) {
    errors.push(`${path} must be of type ${schema.type}`);

    return {
      valid: false,
      errors,
    };
  }

  if (schema.type === "object") {
    const properties = schema.properties || {};
    const required = schema.required || [];

    for (const field of required) {
      if (!(field in value)) {
        errors.push(`${path}.${field} is required`);
      }
    }

    for (const [key, propertySchema] of Object.entries(properties)) {
      if (key in value) {
        const result = validateSchema(
          value[key],
          propertySchema,
          `${path}.${key}`,
        );

        errors.push(...result.errors);
      }
    }

    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!(key in properties)) {
          errors.push(`${path}.${key} is not allowed`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateToolArguments(argumentsValue, schema) {
  return validateSchema(argumentsValue, schema);
}
