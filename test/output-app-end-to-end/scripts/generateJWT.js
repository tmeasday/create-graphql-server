import jwt from '../../output-app/node_modules/jwt-simple';
import fs from 'fs';

const KEY = 'test-key';

const userFile = fs.readFileSync('../../seeds/User.json', 'utf8');
const re = new RegExp("{.*}", 'g');
let arr;

while ((arr = re.exec(userFile)) !== null) {
  let user = JSON.parse(arr[0]);
  console.log(user);
  console.log('------------------------------------');
  console.log('Generated JWT Token for tests:');
  const payload = {
    userId: user._id.$oid.toString(), 
  };
 const token = jwt.encode(payload, KEY); 
 console.log(token);
 console.log('######################################');
}


