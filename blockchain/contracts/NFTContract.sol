//SPDX-License-Identifier: None

pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract NFTContract is ERC1155 {
    uint256 public constant nftTokenA = 0;
    uint256 public constant nftTokenB = 1;
    uint256 public constant nftTokenC = 2;

    constructor() ERC1155("https://game.example/api/item/{id}.json") {
        _mint(msg.sender, nftTokenA, 10 * 10 ** 18, "");
        _mint(msg.sender, nftTokenB, 10 * 10 ** 18, "");
        _mint(msg.sender, nftTokenC, 10 * 10 ** 18, "");
    }

    function mintNFT(
        address ownerAddress, 
        uint256 nftTokenId, 
        uint nftTokenAmount) public {
            _mint(ownerAddress, nftTokenId, nftTokenAmount, "");
        }
}