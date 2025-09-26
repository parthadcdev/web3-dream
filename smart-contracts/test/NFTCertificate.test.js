const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NFTCertificate", function () {
  let nftCertificate;
  let owner;
  let minter;
  let user1;
  let user2;

    beforeEach(async function () {
    [owner, minter, user1, user2] = await ethers.getSigners();

        const NFTCertificate = await ethers.getContractFactory("NFTCertificate");
    nftCertificate = await NFTCertificate.deploy(
      "Test Certificates",
      "TEST",
      "https://api.test.com/metadata/"
    );
        await nftCertificate.waitForDeployment();
        
    // Add minter as authorized minter
    await nftCertificate.addAuthorizedMinter(minter.address);
    });

    describe("Deployment", function () {
        it("Should set the correct name and symbol", async function () {
      expect(await nftCertificate.name()).to.equal("Test Certificates");
      expect(await nftCertificate.symbol()).to.equal("TEST");
    });

    it("Should set the correct base URI", async function () {
      expect(await nftCertificate.getBaseTokenURI()).to.equal("https://api.test.com/metadata/");
    });

    it("Should set owner as authorized minter", async function () {
      expect(await nftCertificate.authorizedMinters(owner.address)).to.be.true;
    });
  });

  describe("Minting", function () {
    const productId = 1;
    const certificateType = "authenticity";
    const metadataURI = "https://ipfs.io/ipfs/test123";
    const complianceStandards = ["ISO 9001", "FDA Approved"];
    const expiresAt = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60; // 1 year from now

    it("Should mint a certificate successfully", async function () {
      const mintingFee = await nftCertificate.mintingFee();
      
      const tx = await nftCertificate.connect(minter).mintCertificate(
        user1.address,
                productId,
                certificateType,
        metadataURI,
        complianceStandards,
        expiresAt,
        { value: mintingFee }
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          const parsed = nftCertificate.interface.parseLog(log);
          return parsed && parsed.name === "CertificateMinted";
        } catch (e) {
          return false;
        }
      });
      
      expect(event).to.not.be.undefined;
      const parsedEvent = nftCertificate.interface.parseLog(event);
      expect(parsedEvent.args.tokenId).to.equal(0);
      expect(parsedEvent.args.productId).to.equal(productId);
      expect(parsedEvent.args.owner).to.equal(user1.address);
      expect(parsedEvent.args.certificateType).to.equal(certificateType);
    });

    it("Should fail to mint without sufficient fee", async function () {
      const mintingFee = await nftCertificate.mintingFee();
      
      await expect(
        nftCertificate.connect(minter).mintCertificate(
          user1.address,
                productId,
                certificateType,
          metadataURI,
          complianceStandards,
          expiresAt,
          { value: mintingFee - 1n }
        )
      ).to.be.revertedWith("Insufficient minting fee");
    });

    it("Should fail to mint from unauthorized address", async function () {
      const mintingFee = await nftCertificate.mintingFee();

            await expect(
        nftCertificate.connect(user1).mintCertificate(
          user2.address,
                    productId,
                    certificateType,
          metadataURI,
          complianceStandards,
          expiresAt,
          { value: mintingFee }
        )
      ).to.be.revertedWith("Not authorized to mint");
    });

    it("Should fail to mint to zero address", async function () {
      const mintingFee = await nftCertificate.mintingFee();
      
            await expect(
        nftCertificate.connect(minter).mintCertificate(
                    ethers.ZeroAddress,
                    productId,
                    certificateType,
          metadataURI,
          complianceStandards,
          expiresAt,
          { value: mintingFee }
        )
      ).to.be.revertedWith("Cannot mint to zero address");
    });
  });

  describe("Verification", function () {
    let tokenId;

        beforeEach(async function () {
      const mintingFee = await nftCertificate.mintingFee();
      
      const tx = await nftCertificate.connect(minter).mintCertificate(
        user1.address,
        1,
        "authenticity",
        "https://ipfs.io/ipfs/test123",
        ["ISO 9001"],
        0, // No expiration
        { value: mintingFee }
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          const parsed = nftCertificate.interface.parseLog(log);
          return parsed && parsed.name === "CertificateMinted";
        } catch (e) {
          return false;
        }
      });
      const parsedEvent = nftCertificate.interface.parseLog(event);
      tokenId = parsedEvent.args.tokenId;
    });

    it("Should verify certificate successfully", async function () {
      const verificationFee = await nftCertificate.verificationFee();
      
      const tx = await nftCertificate.connect(user2).verifyCertificate(
        tokenId,
        "qr",
        "Additional verification data",
        { value: verificationFee }
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          const parsed = nftCertificate.interface.parseLog(log);
          return parsed && parsed.name === "CertificateVerified";
        } catch (e) {
          return false;
        }
      });
      
      expect(event).to.not.be.undefined;
      const parsedEvent = nftCertificate.interface.parseLog(event);
      expect(parsedEvent.args.tokenId).to.equal(tokenId);
      expect(parsedEvent.args.verifier).to.equal(user2.address);
      expect(parsedEvent.args.verificationMethod).to.equal("qr");
      expect(parsedEvent.args.isValid).to.be.true;
    });

    it("Should verify certificate by code", async function () {
      const verificationFee = await nftCertificate.verificationFee();
      
      // Get verification code from certificate
      const cert = await nftCertificate.getCertificate(tokenId);
      const verificationCode = cert.verificationCode;
      
      const tx = await nftCertificate.connect(user2).verifyByCode(
        verificationCode,
        "code",
        "Code verification",
        { value: verificationFee }
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          const parsed = nftCertificate.interface.parseLog(log);
          return parsed && parsed.name === "CertificateVerified";
        } catch (e) {
          return false;
        }
      });
      
      expect(event).to.not.be.undefined;
      const parsedEvent = nftCertificate.interface.parseLog(event);
      expect(parsedEvent.args.tokenId).to.equal(tokenId);
    });

    it("Should fail verification with invalid code", async function () {
      const verificationFee = await nftCertificate.verificationFee();
      
      await expect(
        nftCertificate.connect(user2).verifyByCode(
          "INVALID123",
          "code",
          "Invalid code",
          { value: verificationFee }
        )
      ).to.be.revertedWith("Invalid verification code");
        });
    });

    describe("Certificate Management", function () {
    let tokenId;

        beforeEach(async function () {
      const mintingFee = await nftCertificate.mintingFee();
      
      const tx = await nftCertificate.connect(minter).mintCertificate(
        user1.address,
        1,
        "authenticity",
        "https://ipfs.io/ipfs/test123",
        ["ISO 9001"],
        0,
        { value: mintingFee }
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          const parsed = nftCertificate.interface.parseLog(log);
          return parsed && parsed.name === "CertificateMinted";
        } catch (e) {
          return false;
        }
      });
      const parsedEvent = nftCertificate.interface.parseLog(event);
      tokenId = parsedEvent.args.tokenId;
    });

    it("Should get certificate details", async function () {
      const cert = await nftCertificate.getCertificate(tokenId);
      
      expect(cert.productId).to.equal(1);
      expect(cert.owner).to.equal(user1.address);
      expect(cert.certificateType).to.equal("authenticity");
      expect(cert.isValid).to.be.true;
      expect(cert.complianceStandards).to.deep.equal(["ISO 9001"]);
    });

    it("Should check certificate validity", async function () {
      const isValid = await nftCertificate.isCertificateValid(tokenId);
      expect(isValid).to.be.true;
    });

    it("Should invalidate certificate", async function () {
      const tx = await nftCertificate.connect(owner).invalidateCertificate(
        tokenId,
        "Fraud detected"
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          const parsed = nftCertificate.interface.parseLog(log);
          return parsed && parsed.name === "CertificateInvalidated";
        } catch (e) {
          return false;
        }
      });
      
      expect(event).to.not.be.undefined;
      const parsedEvent = nftCertificate.interface.parseLog(event);
      expect(parsedEvent.args.tokenId).to.equal(tokenId);
      expect(parsedEvent.args.reason).to.equal("Fraud detected");

      const cert = await nftCertificate.getCertificate(tokenId);
      expect(cert.isValid).to.be.false;
    });

    it("Should add compliance standard", async function () {
      const tx = await nftCertificate.connect(owner).addComplianceStandard(
        tokenId,
        "FDA Approved"
      );

      const receipt = await tx.wait();
      // Note: No event is emitted in the current implementation
      // This test just verifies the function executes successfully
    });
  });

  describe("Access Control", function () {
    it("Should add authorized minter", async function () {
      await nftCertificate.addAuthorizedMinter(user1.address);
      expect(await nftCertificate.authorizedMinters(user1.address)).to.be.true;
    });

    it("Should remove authorized minter", async function () {
      await nftCertificate.addAuthorizedMinter(user1.address);
      await nftCertificate.removeAuthorizedMinter(user1.address);
      expect(await nftCertificate.authorizedMinters(user1.address)).to.be.false;
    });

    it("Should fail to add minter from non-owner", async function () {
            await expect(
        nftCertificate.connect(user1).addAuthorizedMinter(user2.address)
            ).to.be.revertedWithCustomError(nftCertificate, "OwnableUnauthorizedAccount");
    });
  });

  describe("Fee Management", function () {
    it("Should update minting fee", async function () {
      const newFee = ethers.parseEther("0.02");
      await nftCertificate.updateMintingFee(newFee);
      expect(await nftCertificate.mintingFee()).to.equal(newFee);
    });

    it("Should update verification fee", async function () {
      const newFee = ethers.parseEther("0.002");
      await nftCertificate.updateVerificationFee(newFee);
      expect(await nftCertificate.verificationFee()).to.equal(newFee);
    });

    it("Should fail to update fees from non-owner", async function () {
      const newFee = ethers.parseEther("0.02");

            await expect(
        nftCertificate.connect(user1).updateMintingFee(newFee)
            ).to.be.revertedWithCustomError(nftCertificate, "OwnableUnauthorizedAccount");
        });
    });

  describe("Pausable", function () {
    it("Should pause and unpause", async function () {
            await nftCertificate.emergencyPause();
            expect(await nftCertificate.paused()).to.be.true;

            await nftCertificate.emergencyUnpause();
            expect(await nftCertificate.paused()).to.be.false;
        });

    it("Should fail to mint when paused", async function () {
            await nftCertificate.emergencyPause();

      const mintingFee = await nftCertificate.mintingFee();

            await expect(
        nftCertificate.connect(minter).mintCertificate(
          user1.address,
          1,
          "authenticity",
          "https://ipfs.io/ipfs/test123",
          [],
          0,
          { value: mintingFee }
                )
            ).to.be.revertedWithCustomError(nftCertificate, "EnforcedPause");
        });
    });
});