const { ethers } = require("hardhat");

const { expect } = require("chai");
const { constants } = require("@openzeppelin/test-helpers");
const { ZERO_ADDRESS } = constants;

const deployContract = async function () {
  let factory;
  try {
    factory = await ethers.getContractFactory("GestureCollective");
  } catch (e) {
    console.log(e);
  }
  let contract = await factory.deploy();
  await contract.deployed();
  return contract;
};

const createTestSuite = () =>
  function () {
    beforeEach(async function () {
      this.gestureCollective = await deployContract();
      this.startTokenId = this.gestureCollective.startTokenId
        ? (await this.gestureCollective._startTokenId()).toNumber()
        : 0;
    });

    describe("EIP-165 support", async function () {
      it("supports IERC721", async function () {
        expect(
          await this.gestureCollective.supportsInterface("0x80ac58cd")
        ).to.eq(true);
      });

      it("supports ERC721Metadata", async function () {
        expect(
          await this.gestureCollective.supportsInterface("0x5b5e139f")
        ).to.eq(true);
      });

      it("does not support ERC721Enumerable", async function () {
        expect(
          await this.gestureCollective.supportsInterface("0x780e9d63")
        ).to.eq(false);
      });

      it("does not support random interface", async function () {
        expect(
          await this.gestureCollective.supportsInterface("0x00000042")
        ).to.eq(false);
      });
    });

    context("with no minted tokens", async function () {
      it("has 0 totalSupply", async function () {
        const supply = await this.gestureCollective.totalSupply();
        expect(supply).to.equal(0);
      });

      it("has 0 totalMinted", async function () {
        const totalMinted = await this.gestureCollective.totalMinted();
        expect(totalMinted).to.equal(0);
      });
    });

    context("with minted tokens", async function () {
      beforeEach(async function () {
        const [owner, addr1, addr2, addr3] = await ethers.getSigners();
        this.owner = owner;
        this.addr1 = addr1;
        this.addr2 = addr2;
        this.addr3 = addr3;
        await this.gestureCollective.ownerMintAll();
      });

      describe("ERC721Metadata support", async function () {
        it("responds with the right name", async function () {
          expect(await this.gestureCollective.name()).to.eq(
            "Gesture Collective"
          );
        });

        it("responds with the right symbol", async function () {
          expect(await this.gestureCollective.symbol()).to.eq("GESTURE");
        });

        describe("tokenURI", async function () {
          it("sends an emtpy uri by default", async function () {
            const uri = await this.gestureCollective["tokenURI(uint256)"](1);
            expect(uri).to.eq("");
          });

          it("reverts when tokenid is invalid", async function () {
            await expect(
              this.gestureCollective["tokenURI(uint256)"](42)
            ).to.be.reverted;
          });
        });
      });

      describe("exists", async function () {
        it("verifies valid tokens", async function () {
          for (
            let tokenId = this.startTokenId;
            tokenId < 25 + this.startTokenId;
            tokenId++
          ) {
            const exists = await this.gestureCollective.exists(tokenId);
            expect(exists).to.be.true;
          }
        });

        it("verifies invalid tokens", async function () {
          expect(
            await this.gestureCollective.exists(26 + this.startTokenId)
          ).to.be.false;
        });
      });

      describe("balanceOf", async function () {
        it("returns the amount for a given address", async function () {
          expect(
            await this.gestureCollective.balanceOf(this.owner.address)
          ).to.equal("25");
        });

        it("throws an exception for the 0 address", async function () {
          await expect(
            this.gestureCollective.balanceOf(ZERO_ADDRESS)
          ).to.be.revertedWith("BalanceQueryForZeroAddress");
        });
      });

      describe("numberMinted", async function () {
        it("returns the amount for a given address", async function () {
          expect(
            await this.gestureCollective.numberMinted(this.owner.address)
          ).to.equal("25");
        });
      });

      context("totalMinted", async function () {
        it("has 25 totalMinted", async function () {
          const totalMinted = await this.gestureCollective.totalMinted();
          expect(totalMinted).to.equal("25");
        });
      });

      describe("ownerOf", async function () {
        it("returns the right owner", async function () {
          const ownerAddress = this.owner.address;
          const ownerOf1 = await this.gestureCollective.ownerOf(1);
          const ownerOf10 = await this.gestureCollective.ownerOf(1);
          const ownerOf25 = await this.gestureCollective.ownerOf(1);
          expect(ownerOf1).to.equal(ownerAddress);
          expect(ownerOf10).to.equal(this.owner.address);
          expect(ownerOf25).to.equal(this.owner.address);
        });

        it("reverts for an invalid token", async function () {
          await expect(this.gestureCollective.ownerOf(26)).to.be.revertedWith(
            "OwnerQueryForNonexistentToken"
          );
        });
      });

      describe("approve", async function () {
        beforeEach(function () {
          this.tokenId = this.startTokenId;
          this.tokenId2 = this.startTokenId + 1;
        });

        it("sets approval for the target address", async function () {
          await this.gestureCollective
            .connect(this.owner)
            .approve(this.addr1.address, this.tokenId);
          const approval = await this.gestureCollective.getApproved(
            this.tokenId
          );
          expect(approval).to.equal(this.addr1.address);
        });

        it("rejects an invalid token owner", async function () {
          await expect(
            this.gestureCollective
              .connect(this.addr2)
              .approve(this.owner.address, this.tokenId2)
          ).to.be.revertedWith("ApprovalToCurrentOwner");
        });

        it("rejects an unapproved caller", async function () {
          await expect(
            this.gestureCollective
              .connect(this.addr2)
              .approve(this.addr3.address, this.tokenId)
          ).to.be.revertedWith("ApprovalCallerNotOwnerNorApproved");
        });

        it("does not get approved for invalid tokens", async function () {
          await expect(
            this.gestureCollective.getApproved(26)
          ).to.be.revertedWith("ApprovalQueryForNonexistentToken");
        });
      });

      describe("setApprovalForAll", async function () {
        it("sets approval for all properly", async function () {
          const approvalTx = await this.gestureCollective
            .connect(this.owner)
            .setApprovalForAll(this.addr1.address, true);
          await expect(approvalTx)
            .to.emit(this.gestureCollective, "ApprovalForAll")
            .withArgs(this.owner.address, this.addr1.address, true);
          expect(
            await this.gestureCollective.isApprovedForAll(
              this.owner.address,
              this.addr1.address
            )
          ).to.be.true;
        });

        it("sets rejects approvals for non msg senders", async function () {
          await expect(
            this.gestureCollective
              .connect(this.addr1)
              .setApprovalForAll(this.addr1.address, true)
          ).to.be.revertedWith("ApproveToCaller");
        });
      });

      context("test transfer functionality", function () {
        const testSuccessfulTransfer = function (transferFn) {
          beforeEach(async function () {
            this.tokenId = this.startTokenId + 1;
            this.from = this.owner.address;
            this.to = this.addr1.address;
            await this.gestureCollective
              .connect(this.owner)
              .setApprovalForAll(this.to, true);
            this.transferTx = await this.gestureCollective
              .connect(this.owner)
              [transferFn](this.from, this.to, this.tokenId);
          });

          it("transfers the ownership of the given token ID to the given address", async function () {
            expect(
              await this.gestureCollective.ownerOf(this.tokenId)
            ).to.be.equal(this.to);
          });

          it("emits a Transfer event", async function () {
            await expect(this.transferTx)
              .to.emit(this.gestureCollective, "Transfer")
              .withArgs(this.from, this.to, this.tokenId);
          });

          it("clears the approval for the token ID", async function () {
            expect(
              await this.gestureCollective.getApproved(this.tokenId)
            ).to.be.equal(ZERO_ADDRESS);
          });

          it("emits an Approval event", async function () {
            await expect(this.transferTx)
              .to.emit(this.gestureCollective, "Approval")
              .withArgs(this.from, ZERO_ADDRESS, this.tokenId);
          });

          it("adjusts owners balances", async function () {
            expect(
              await this.gestureCollective.balanceOf(this.from)
            ).to.be.equal("24");
          });
        };

        const testUnsuccessfulTransfer = function (transferFn) {
          beforeEach(function () {
            this.tokenId = 2;
          });

          it("rejects unapproved transfer", async function () {
            await expect(
              this.gestureCollective
                .connect(this.addr3)
                [transferFn](
                  this.owner.address,
                  this.addr2.address,
                  this.tokenId
                )
            ).to.be.revertedWith("TransferCallerNotOwnerNorApproved");
          });

          it("rejects transfer from incorrect owner", async function () {
            await this.gestureCollective
              .connect(this.addr1)
              .setApprovalForAll(this.addr2.address, true);
            await expect(
              this.gestureCollective
                .connect(this.addr2)
                [transferFn](
                  this.addr3.address,
                  this.addr2.address,
                  this.tokenId
                )
            ).to.be.revertedWith("TransferFromIncorrectOwner");
          });

          it("rejects transfer to zero address", async function () {
            await this.gestureCollective
              .connect(this.owner)
              .setApprovalForAll(this.addr2.address, true);
            await expect(
              this.gestureCollective
                .connect(this.addr2)
                [transferFn](this.owner.address, ZERO_ADDRESS, this.tokenId)
            ).to.be.revertedWith("TransferToZeroAddress");
          });
        };

        context("successful transfers", function () {
          describe("transferFrom", function () {
            testSuccessfulTransfer("transferFrom");
          });
        });

        context("unsuccessful transfers", function () {
          describe("transferFrom", function () {
            testUnsuccessfulTransfer("transferFrom");
          });

          describe("safeTransferFrom", function () {
            testUnsuccessfulTransfer(
              "safeTransferFrom(address,address,uint256)"
            );
          });
        });
      });

      describe("_burn", async function () {
        beforeEach(function () {
          this.tokenIdToBurn = this.startTokenId;
        });

        it("can burn if approvalCheck is false", async function () {
          await this.gestureCollective
            .connect(this.owner)
            .burn(this.tokenIdToBurn, false);
          expect(
            await this.gestureCollective.exists(this.tokenIdToBurn)
          ).to.be.false;
        });

        it("revert if approvalCheck is true", async function () {
          await expect(
            this.gestureCollective
              .connect(this.addr3)
              .burn(this.tokenIdToBurn, true)
          ).to.be.revertedWith("TransferCallerNotOwnerNorApproved");
        });
      });
    });

    context("mint", async function () {
      beforeEach(async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        this.owner = owner;
        this.addr1 = addr1;
        this.addr2 = addr2;
      });

      describe("safeMint", function () {
        it("successfully mints a single token", async function () {
          const mintTx = await this.gestureCollective
            .connect(this.addr1)
            .safeMint(1);
          await expect(mintTx)
            .to.emit(this.gestureCollective, "Transfer")
            .withArgs(ZERO_ADDRESS, this.addr1.address, this.startTokenId);
          expect(
            await this.gestureCollective.ownerOf(this.startTokenId)
          ).to.equal(this.addr1.address);
        });

        it("successfully mints multiple tokens", async function () {
          const mintTx = await this.gestureCollective
            .connect(this.addr2)
            .safeMint(5);
          for (
            let tokenId = this.startTokenId;
            tokenId < 5 + this.startTokenId;
            tokenId++
          ) {
            await expect(mintTx)
              .to.emit(this.gestureCollective, "Transfer")
              .withArgs(ZERO_ADDRESS, this.addr2.address, tokenId);
            expect(await this.gestureCollective.ownerOf(tokenId)).to.equal(
              this.addr2.address
            );
          }
        });

        it("requires quantity to be greater than 0", async function () {
          await expect(
            this.gestureCollective.connect(this.owner).safeMint(0)
          ).to.be.revertedWith("MintZeroQuantity");
        });
      });
    });
  };

describe("ERC721A", createTestSuite());
