class PaginatedAssociation {
  fieldName(typeName, argsStr) {
    return this.context.ReturnTypeName.collection.find({
      query,
      createdAt: { $gt: lastCreatedAt },
    }).sort({ createdAt: 1 }).limit(limit).toArray();
  }

}
