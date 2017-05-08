const authorizations = {};

function isArray(anything) {
  // for easier reading
  if (Object.prototype.toString.call(anything) === '[object Array]') {
    return true;
  }
  return false;
}

function isObject(anything) {
  // for easier reading
  if (typeof anything === 'object') {
    return true;
  }
  return false;
}

function removeFields(doc, rmFields) {
  // remove the fields from the document, which aren't allowed to query or mutate
  const newDoc = Object.assign({}, doc);
  if (rmFields && isArray(rmFields)) {
    rmFields.forEach((field) => {
      if (field && field !== '' && newDoc[field]) {
        delete newDoc[field];
      }
    });
  }
  return newDoc;
}

function getConfig(type) {
  return authorizations[type]
    ? authorizations[type]
    : {
      name: '',
      field: {
        ownerField: 'ownerId',
        roleField: 'role',
      },
      rules: [
        {
          mode: 'create',
          roles: ['owner'],
          removeFields: [],
        },
        {
          mode: 'read',
          roles: ['owner'],
          removeFields: [],
        },
        {
          mode: 'update',
          roles: ['owner', 'admin'],
          removeFields: [],
        },
        {
          mode: 'delete',
          roles: ['owner', 'admin'],
          removeFields: [],
        },
      ],
    };
}

async function makeFirstUserAdmin(type, Type, mode, user, doc) {
  const config = getConfig(type);
  let newDoc = Object.assign({}, doc);
  if (config.isUser && mode === 'create') {
    let role = 'user';
    delete newDoc.role;
    const countUser = await Type.collection.find().count();
    if (countUser === 0) {
      role = config.firstUserRole || 'admin';
    } else {
      role = config.defaultUserRole || 'user';
    }
    const newRole = { [config.field.roleField]: role };
    newDoc = Object.assign({}, newDoc, newRole);
  }
  return newDoc;
}

function isUserDocumentOwner(user, doc, fieldContainingOwner) {
  // checks if the authenticated user is the owner of the document
  if (
    user &&
    doc &&
    doc[fieldContainingOwner] &&
    user.id === doc[fieldContainingOwner]
  ) {
    return true;
  }
  return false;
}

function hasUserRole(user, role, fieldContainingRole) {
  // checks if the authenticated user has the necessary role to be authorized
  if (
    user &&
    role &&
    user[fieldContainingRole] &&
    user[fieldContainingRole] === role
  ) {
    return true;
  }
  return false;
}

async function check_rules(type, Type, mode, user, doc) {
  // check all provided rules from the type, only if one leads to an authorization
  // the document will be returned
  const config = getConfig(type);
  let authorized = false;
  let newDoc = Object.assign({}, doc);
  // check all rules, now...
  config.rules.forEach((rule) => {
    if (rule.mode === mode) {
      // check only the rules for the current mode: e.g. create, read, update, delete

      rule.roles.forEach((role) => {
        // check all roles, if one fires

        if (role === 'world') {
          // everyone is authorized
          // console.log('authorize rule:', mode, role, 'authorized');
          authorized = true;
          // if some fields aren't allowed for the world, removing them here
          newDoc = Object.assign({}, removeFields(doc, rule.removeFields));
        }

        if (role === 'owner') {
          // only the owner of the document should be allowed
          // we need to know, which field contains the owner id, see type input file for generator
          if (isUserDocumentOwner(user, doc, config.field.ownerField)) {
            // owner is authorized,
            // console.log('authorize rule:', mode, role, 'authorized');
            authorized = true;
            // if some fields aren't allowed for the owner, removing them here
            newDoc = Object.assign({}, removeFields(doc, rule.removeFields));
          }
        }

        if (hasUserRole(user, role, config.field.roleField)) {
          // specific role is authorized: e.g. admin, user, etc.
          // console.log('authorize rule:', mode, role, 'authorized');
          authorized = true;
          // if some fields aren't allowed for this role, removing them here
          newDoc = Object.assign({}, removeFields(doc, rule.removeFields));
        }
      });
    }
  });

  if (authorized) {
    if (config.isUser && mode === 'create') {
      newDoc = Object.assign(
        {},
        await makeFirstUserAdmin(type, Type, mode, user, newDoc)
      );
    }
    // at least one rule fired, so the authenticated user is allowed to work with the document
    return newDoc;
  }

  // user or role was NOT authorized, return null
  return null;
}

export default async function authorize(type, Type, mode, user, data) {
  // main authorize function, which is called by all resolvers
  if (isArray(data)) {
    // if data is an array, check each document individually
    const result = [];
    data.forEach((doc) => {
      return async () => {
        const newDoc = await check_rules(type, Type, mode, user, doc);
        if (newDoc) result.push(newDoc);
      };
    });
    return result;
  } else if (isObject(data)) {
    // if data is an object, check it directly
    const doc = data;
    const newDoc = await check_rules(type, Type, mode, user, doc);
    return newDoc;
  }
  // otherwise return nothing
  /* console.error(
  'Error in authorize:  authorization rules for type not available.'
  );
  */
  return null;
}
