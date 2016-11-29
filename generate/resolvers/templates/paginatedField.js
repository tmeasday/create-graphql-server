const paginatedField = {
  fieldName(typeName, { lastCreatedAt, limit }, { ModelName }) {
    return ModelName.modelMethod(modelArgument, { lastCreatedAt, limit });
  },
};
