export const Tweet = {
  userRoles: {
    create: ['admin'],
    read: ['admin', 'world'],
    readOne: ['admin', 'world'],
    readMany: ['admin', 'world'],
    update: ['admin'],
    delete: ['admin'],
  },
  docRoles: {
    create: ['authorId'],
    read: ['authorId', 'coauthorsIds'],
    readOne: ['authorId', 'coauthorsIds'],
    readMany: ['authorId', 'coauthorsIds'],
    update: ['authorId', 'coauthorsIds'],
    delete: ['authorId'],
  }
};
