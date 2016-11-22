import mongoPrebuilt from 'mongodb-prebuilt';
import { MongoClient } from 'mongodb';
import denodeify from 'denodeify';

export default async function connectToMongo(port) {
  const mongoUrl = `mongodb://localhost:${port}/database`;

  // This prebuilt guy is pretty jankeriffic, we can't await because it doesn't
  // call the callback when it succeeds
  denodeify(mongoPrebuilt.start_server.bind(mongoPrebuilt))({
    args: {
      port,
      dbpath: './db',
    },
  });

  return await MongoClient.connect(mongoUrl);
};
