import { describe, it } from 'mocha';
import { assert } from 'chai';
import { sendQuery, defaultUser, roleUser, adminUser } from './sendQuery';

describe('test-1: roles', () => {

  describe('adminUser: stubailo', () => {
    it('has role "admin"', () => {
      return sendQuery({query:
        `query { 
          user(id: "${adminUser}") {
            role
            username
          }
        }`,
        userId: adminUser
      }).then(result => {
        assert.isDefined(result.data);
        assert.isDefined(result.data.user);
        assert.isDefined(result.data.user.role);
        assert.equal(result.data.user.role, 'admin');
        assert.equal(result.data.user.username, 'stubailo');
        return false;
      })
    })
  });

  describe('roleUser: tmeasday', () => {
    it('has role "editor"', () => {
      return sendQuery({query:
        `query { 
          user(id: "${roleUser}") {
            role
            username
          }
        }`,
        userId: adminUser
      }).then(result => {
        assert.isDefined(result.data);
        assert.isDefined(result.data.user);
        assert.isDefined(result.data.user.role);
        assert.equal(result.data.user.role, 'editor');
        assert.equal(result.data.user.username, 'tmeasday');
        return false;
      })
    })
  });

  describe('defaultUser: lacker', () => {
    it('has role "user"', () => {
      return sendQuery({query:
        `query { 
          user(id: "${defaultUser}") {
            role
            username
          }
        }`,
        userId: adminUser
      }).then(result => {
        assert.isDefined(result.data);
        assert.isDefined(result.data.user);
        assert.isDefined(result.data.user.role);
        assert.equal(result.data.user.role, 'user');
        assert.equal(result.data.user.username, 'lacker');
        return false;
      })
    })
  });

});