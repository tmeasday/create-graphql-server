class PaginatedAssociation {
  fieldName(typeName, { lastCreatedAt = 0, limit = 10 }) {
    return this.context.ReturnTypeName.collection.find({
      query,
      createdAt: { $gt: lastCreatedAt },
    }).sort({ createdAt: 1 }).limit(limit).toArray();
  }

}
