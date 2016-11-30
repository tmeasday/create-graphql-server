class SingularAssociation {
  fieldName(typeName) {
    return this.context.ReturnTypeName.findOneById(typeName.fieldNameId);
  }
}
