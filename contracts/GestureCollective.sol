// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "erc721a/contracts/ERC721A.sol";

contract GestureCollective is Ownable, ERC721A, ReentrancyGuard {
  
  uint public constant collectionSize = 25;

  // metadata URI
  string private _baseTokenURI;

  constructor() ERC721A("Gesture Collective", "GESTURE") {
  }

  modifier callerIsUser() {
    require(tx.origin == msg.sender, "The caller is another contract");
    _;
  }

  function ownerMintAll() external payable onlyOwner {
    _safeMint(msg.sender, collectionSize);
  }

  function safeMint(uint256 count) external payable callerIsUser {
    _safeMint(msg.sender, count);
  }

  function burn(uint256 tokenId, bool approval) external callerIsUser {
    _burn(tokenId, approval);
  }

  function _baseURI() internal view virtual override returns (string memory) {
    return _baseTokenURI;
  }

  function setBaseURI(string calldata baseURI) external onlyOwner {
    _baseTokenURI = baseURI;
  }

  function withdrawMoney() external onlyOwner nonReentrant {
    (bool success, ) = msg.sender.call{value: address(this).balance}("");
    require(success, "Transfer failed.");
  }

  function exists(uint256 tokenId) public view returns (bool) {
    return _exists(tokenId);
  }

  function totalMinted() public view returns (uint256) {
    return _totalMinted();
  }

  function numberMinted(address owner) public view returns (uint256) {
    return _numberMinted(owner);
  }

  function getOwnershipData(uint256 tokenId)
    external
    view
    returns (TokenOwnership memory)
  {
    return _ownershipOf(tokenId);
  }
}