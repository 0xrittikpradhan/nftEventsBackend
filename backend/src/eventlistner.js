// const hre = require('hardhat');
// const { ethers } = require("hardhat");
// const mongoose = require("mongoose");

const { MongoClient } = require("mongodb");
const express = require("express");
const Web3 = require("web3");
const secrets = require("../secrets.json");
// require("dotenv").config();

const ALCHEMY_Provider = secrets.url;
const web3 = new Web3(new Web3.providers.WebsocketProvider(ALCHEMY_Provider));
const app = express();

const contractAddress = "0xfC86b39464DF08e1d55E492AF2BdF273975f9e6F";
// const contractAbi = require("../build/newTokenABI.json");
const contractAbi = require("../../blockchain/build/newTokenABI.json");

const NFTContract = new web3.eth.Contract(contractAbi, contractAddress);

// var blockNumber = web3.eth.getBlock("latest");
// web3.eth.getBlock("latest").then(console.log);
// console.log(blockNumber, "is the current block no.");

const uri =
  "mongodb+srv://0xrittikpradhan:s3ni79lQcElpJS4v@cluster0.fuglox2.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri);

//Listning Transfer Events which are being emitted on ERC1155 Token Transfer.

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
          Tx_Hash: event.transactionHash,
          Block_Number: event.blockNumber.toString(),
          Event_Name: event.event.toString(),
          Operator_Address: event.returnValues.operator.toString(),
          From_Address: event.returnValues.from.toString(),
          To_Address: event.returnValues.to.toString(),
          Token_Id: event.returnValues.id.toString(),
          Token_Amount: event.returnValues.value.toString(),
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
        var arr = {0: {}, 1: {}, 2: {}};
        for(let i=0; i< event.returnValues.ids.length; i++) {

          var id = event.returnValues.ids[i];
          var eventKeys = arr[id];
          var value;

          if(eventKeys.Token_Amount !== undefined) {
            value = parseInt(eventKeys.Token_Amount) + parseInt(event.returnValues.values[i]);
          }
          else {
            value = event.returnValues.values[i];
          }
          var eventDetails = {
            Tx_Hash: event.transactionHash,
            Block_Number: event.blockNumber.toString(),
            Event_Name: event.event.toString(),
            Operator_Address: event.returnValues.operator.toString(),
            From_Address: event.returnValues.from.toString(),
            To_Address: event.returnValues.to.toString(),
            Token_Id: id.toString(),
            Token_Amount: value.toString(),
          };
          arr[id] = eventDetails;
        }
        parseEventsArray(client, arr);
      } 
      catch (e) {
        console.error(e);
      }
    }
  )
  .on("connected", (subscriptionId) => {
    console.log({ subscriptionId });
  });

async function parseEventsArray(client, eventsArr) {
  for(let i= 0; i< 3; i++) {
    if(eventsArr[i].Token_Amount === undefined) {
      continue;
    }
    console.log("createListing for Token " + eventsArr[i].Token_Id );
    createListing(client, eventsArr[i]);
  }
}

async function createListing(client, eventDetails) {
  const checkDuplicateTxHash = await client
    .db("Addresses")
    .collection("TransferEvent")
    .findOne({
      Tx_Hash: eventDetails.Tx_Hash,
      Token_Id: eventDetails.Token_Id,
    });
  // console.log(checkDuplicateTxHash);
  // const checkSameTokeninBatch = await client
  //   .db("Addresses")
  //   .collection("TransferEvent")
  //   .findOne({
  //     Tx_Hash: eventDetails.Tx_Hash,
  //     Token_Id: eventDetails.Token_Id,
  //     Block_Number: eventDetails.Block_Number,
  //   });
  // // console.log(checkSameTokeninBatch);
  if (checkDuplicateTxHash === null) {
    console.log("Inserting into DB Collection...");
    const result = await client
      .db("Addresses")
      .collection("TransferEvent")
      .insertOne(eventDetails);
    console.log(
      `New listing created with the following Id: ${result.insertedId}`
    );
  } 
  // else if (
  //   checkDuplicateTxHash !== null &&
  //   (checkSameTokeninBatch !== null) &
  //     (eventDetails.Event_Name === "TransferBatch")
  // ) {
  //   console.log("Updating existing record...");
  //   const tokenSum = (
  //     parseInt(checkSameTokeninBatch.Token_Amount) +
  //     parseInt(eventDetails.Token_Amount)
  //   ).toString();
  //   const objectId = checkSameTokeninBatch._id;
  //   const result = await client
  //     .db("Addresses")
  //     .collection("TransferEvent")
  //     .updateOne(
  //       { _id: objectId },
  //       { $set: { Token_Amount: tokenSum } },
  //       { upsert: true }
  //     );
  //   console.log("Record Updated, Id: " + objectId);
  // } 
  else {
    console.log("Hash Already Exists");
  }
}

// main().catch(console.error);
