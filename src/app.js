// const path = require("path");
const express = require("express");
const eventListner = require("./eventlistner");
//const eventListner = require("./eventlistner2");

const app = express();

//Define paths for Express config
const scriptsDirectoryPath = __dirname;

//Setup static directory to serve
app.use(express.static(scriptsDirectoryPath));

// app.get("/", (req, res) => {
//     return "Run";
//     // res.render("eventlistner", {
//     //     title: ".."
//     // });
//     });

app.listen(8545, () => {
console.log("Server is up on port 8545");
});
