// const mongoose = require("mongoose");

const { MongoClient } = require("mongodb");
const express = require("express");
const Web3 = require("web3");
require("dotenv").config();

const ALCHEMY_Provider = `${process.env.ALCHEMY_GOERLI_URL}`;
const web3 = new Web3(new Web3.providers.WebsocketProvider(ALCHEMY_Provider));

const app = express();
const port = process.env.PORT || 3000; //POR = Port (heroku) || fallbackvalue (port 3000 - local)

// const contractAddress = "0xfC86b39464DF08e1d55E492AF2BdF273975f9e6F";
const contractAddress = "0x005799C697B5789Ba480905094388Fdb85C7BA3D";
const contractAbi = require("../build/nftContractABI.json");

const NFTContract = new web3.eth.Contract(contractAbi, contractAddress);

// var blockNumber = web3.eth.getBlock("latest");
// web3.eth.getBlock("latest").then(console.log);
// console.log(blockNumber, "is the current block no.");

const uri =
  "mongodb+srv://0xrittikpradhan:s3ni79lQcElpJS4v@cluster0.fuglox2.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri);

// Get NFT APIs

//tokenTransfers
app.get("/getNFTTransfers/:tokenId", async (req, res) => {
  if (req.params.tokenId) {
    const reqTokenId = req.params.tokenId;
    const data = await getTokenTransfers(client, reqTokenId);
    return res.send(data);
  }
});

//tokenOwners
app.get("/getNFTOwners/:tokenId", async (req, res) => {
  if (req.params.tokenId) {
    ownersArr = {};
    finalOwnersArr = {};
    const reqTokenId = req.params.tokenId;
    const data = await getTokenTransfers(client, reqTokenId);

    data.forEach((element) => {
      var key = element.toAddress;
      if (
        ownersArr[key] !== undefined &&
        ownersArr[key].toAddress !== undefined
      ) {
        const receiverAmount = ownersArr[key].tokenAmount;

        const newReceiverAmount = parseInt(receiverAmount) + parseInt(element.tokenAmount);
        ownersArr[key].tokenAmount = newReceiverAmount.toString();
        subtractSenderAmount(ownersArr, element);

      } else {
        ownersArr[key] = element;
        subtractSenderAmount(ownersArr, element);
      }
    });

    (Object.values(ownersArr)).forEach(element => {
      finalOwnersArr[element.toAddress] = {
        "ownerAddress": element.toAddress, 
        "tokenAddress": element.tokenAddress, 
        "tokenId": element.tokenId, 
        "tokenAmount": element.tokenAmount, 
        "contractType": element.contractType
      }
      
    });
    return res.send(Object.values(finalOwnersArr));
  }
});

async function subtractSenderAmount(ownersArr, element) {
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  const fromAddress = element.fromAddress;

  if (fromAddress !== ZERO_ADDRESS) {
    const senderAmount = ownersArr[fromAddress].tokenAmount;
    const newSenderAmount =
      parseInt(senderAmount) - parseInt(element.tokenAmount);
    ownersArr[fromAddress].tokenAmount = newSenderAmount.toString();
  }
}

async function getTokenTransfers(client, reqTokenId) {
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

// Listning Transfer Events which are being emitted on ERC1155 Token Transfer.
// await mongoose.connect("mongodb+srv://0xrittikpradhan:s3ni79lQcElpJS4v@cluster0.fuglox2.mongodb.net/?retryWrites=true&w=majority");

//tokenURI
//contractType
NFTContract.events
  .TransferSingle(
    // {
    //   fromBlock: blockNumber,
    // },
    (error, event) => {
      try {
        client.connect();
        console.log(event);
        const eventDetails = {
          txHash: event.transactionHash,
          blockNumber: event.blockNumber.toString(),
          tokenAddress: contractAddress,
          contractType: "ERC1155",
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
        console.log(event);
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
            tokenAddress: contractAddress,
            contractType: "ERC1155",
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
});
