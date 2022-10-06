const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log(deployer.address);

    const nftcontract = await ethers.getContractFactory('NFTContract');
    const NFTContract = nftcontract.deploy();
    (await NFTContract).deployed();

    console.log((await NFTContract).address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});