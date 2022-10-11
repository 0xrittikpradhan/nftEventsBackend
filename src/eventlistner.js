// const hre = require('hardhat');
// const { ethers } = require("hardhat");
// const mongoose = require("mongoose");

const { MongoClient } = require("mongodb");
const express = require("express");
const Web3 = require("web3");
require("dotenv").config();

const ALCHEMY_Provider = `${process.env.ALCHEMY_GOERLI_URL}`;

const web3 = new Web3(new Web3.providers.WebsocketProvider(ALCHEMY_Provider));

const app = express();
const port = process.env.PORT || 3000; //POR = Port (heroku) || fallbackvalue (port 3000 - local)

const contractAddress = "0xfC86b39464DF08e1d55E492AF2BdF273975f9e6F";
const contractAbi = require("../build/newTokenABI.json");

const NFTContract = new web3.eth.Contract(contractAbi, contractAddress);

// var blockNumber = web3.eth.getBlock("latest");
// web3.eth.getBlock("latest").then(console.log);
// console.log(blockNumber, "is the current block no.");

const uri =
  "mongodb+srv://0xrittikpradhan:s3ni79lQcElpJS4v@cluster0.fuglox2.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri);

// Get NFT APIs

//tokenTransfers
app.get("/getByTokenId/:tokenId", async (req, res) => {
  if (req.params.tokenId) {
    const reqTokenId = req.params.tokenId;
    const data = await displayTokenTransfers(client, reqTokenId);
    return res.send(data);
  }
});

//tokenOwners
app.get("/getTokenOwners", (req, res) => {
  displayTokenOwners(client);
});

async function displayTokenTransfers(client, reqTokenId) {
  const arr = [];
  const cursor = client
    .db("Addresses")
    .collection("TransferEvent")
    .find({ tokenId: reqTokenId });

  if (await cursor.hasNext()) {
    await cursor.forEach((element) => {
      arr.push(element);
    });
  }
  return arr;
}

async function displayTokenOwners(client) {
  const cursor = client.db("Addresses").collection("TrasnferEvent").find();
  if (!(await cursor.hasNext())) {
    console.log("No more records found");
  }
  // await cursor.forEach(console.dir);
  await cursor.forEach((element) => {
    console.log(element);
  });
}

// Listning Transfer Events which are being emitted on ERC1155 Token Transfer.
// await mongoose.connect("mongodb+srv://0xrittikpradhan:s3ni79lQcElpJS4v@cluster0.fuglox2.mongodb.net/?retryWrites=true&w=majority");

NFTContract.events
  .TransferSingle(
    // {
    //   fromBlock: blockNumber,
    // },
    (error, event) => {
      try {
        client.connect();
        const eventDetails = {
          txHash: event.transactionHash,
          blockNumber: event.blockNumber.toString(),
          eventName: event.event.toString(),
          operatorAddress: event.returnValues.operator.toString(),
          fromAddress: event.returnValues.from.toString(),
          toAddress: event.returnValues.to.toString(),
          tokenId: event.returnValues.id.toString(),
          tokenAmount: event.returnValues.value.toString(),
        };
        createListing(client, eventDetails);
      } catch (e) {
        console.error(e);
      }
    }
  )
  .on("connected", (subscriptionId) => {
    console.log({ subscriptionId });
  });

NFTContract.events
  .TransferBatch(
    // {
    //   fromBlock: blockNumber,
    // },
    (error, event) => {
      try {
        client.connect();
        var arr = {};
        for (let i = 0; i < event.returnValues.ids.length; i++) {
          var id = event.returnValues.ids[i];
          var eventKeys = arr[id];
          var value;

          // console.log(eventKeys);
          if (eventKeys !== undefined && eventKeys.tokenAmount !== undefined) {
            value =
              parseInt(eventKeys.tokenAmount) +
              parseInt(event.returnValues.values[i]);
          } else {
            value = event.returnValues.values[i];
          }
          var eventDetails = {
            txHash: event.transactionHash,
            blockNumber: event.blockNumber.toString(),
            eventName: event.event.toString(),
            operatorAddress: event.returnValues.operator.toString(),
            fromAddress: event.returnValues.from.toString(),
            toAddress: event.returnValues.to.toString(),
            tokenId: id.toString(),
            tokenAmount: value.toString(),
          };
          arr[id] = eventDetails;
        }
        parseEventsArray(client, arr);
      } catch (e) {
        console.error(e);
      }
    }
  )
  .on("connected", (subscriptionId) => {
    console.log({ subscriptionId });
  });

async function parseEventsArray(client, eventsArr) {
  Object.values(eventsArr).forEach((eventDetails) => {
    console.log("createListing for Token " + eventDetails.tokenId);
    createListing(client, eventDetails);
  });
}

async function createListing(client, eventDetails) {
  const checkDuplicateTxHash = await client
    .db("Addresses")
    .collection("TransferEvent")
    .findOne({
      txHash: eventDetails.txHash,
      tokenId: eventDetails.tokenId,
    });

  if (checkDuplicateTxHash === null) {
    console.log("Inserting into DB Collection...");
    const result = await client
      .db("Addresses")
      .collection("TransferEvent")
      .insertOne(eventDetails);
    console.log(
      `New listing created with the following Id: ${result.insertedId}`
    );
  } else {
    console.log("Hash Already Exists");
  }
}

app.listen(port, () => {
  console.log("Server is up on port " + port);
}); //
