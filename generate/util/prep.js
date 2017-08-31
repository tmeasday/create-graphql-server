// @flow

/**
 * prepare roles for code generator
 * convert array to String value
 * replace " by '
 * @private
 * @param {array} role - name of role
 * @return {string} roleString - role string
 */

export function prep(role) {
  return JSON.stringify(role).replace(/"/g, "'").replace(/,/g, ', ');
}
