export const User = {
  userRoles: {
    create: ['admin'],
    read: ['admin'],
    readOne: ['admin'],
    readMany: ['admin'],
    update: ['admin'],
    delete: ['admin'],
  },
  docRoles: {
    create: [],
    read: [],
    readOne: ['_id'], // == 'this'
    readMany: [],
    update: ['_id'],
    delete: ['_id'],
  }
};
