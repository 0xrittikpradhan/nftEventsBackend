const { MongoClient } = require("mongodb");

async function main() {
  const uri =
    "mongodb+srv://0xrittikpradhan:s3ni79lQcElpJS4v@cluster0.fuglox2.mongodb.net/?retryWrites=true&w=majority";

  const client = new MongoClient(uri);
  // console.log(client);

  try {
    await client.connect();
    // console.log(client);
    await listDatabases(client);
  } catch (e) {
    console.error(e);
  } 
  finally {
    await client.close();
  }
}

async function listDatabases(client) {
  databasesList = await client.db().admin().listDatabases();
  console.log("Databases:");
  databasesList.databases.forEach((db) => console.log(` -${db.name}`));
}

main().catch(console.error);
