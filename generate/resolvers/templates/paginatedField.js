const paginatedField = {
  fieldName(typeName, { lastCreatedAt, limit }, { TypeName }) {
    return TypeName.fieldName(typeName, { lastCreatedAt, limit });
  },
};
