const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("NFTCertificate", function () {
    let nftCertificate, productRegistry;
    let owner, manufacturer, distributor, retailer, consumer;
    let productId;

    beforeEach(async function () {
        [owner, manufacturer, distributor, retailer, consumer] = await ethers.getSigners();
        
        // Deploy ProductRegistry first
        const ProductRegistry = await ethers.getContractFactory("ProductRegistry");
        productRegistry = await ProductRegistry.deploy();
        await productRegistry.deployed();
        
        // Deploy NFTCertificate
        const NFTCertificate = await ethers.getContractFactory("NFTCertificate");
        nftCertificate = await NFTCertificate.deploy(productRegistry.address);
        await nftCertificate.deployed();
        
        // Register a test product
        await productRegistry.connect(manufacturer).registerProduct(
            "Test Product",
            "pharmaceutical",
            "BATCH-001",
            Math.floor(Date.now() / 1000),
            Math.floor(Date.now() / 1000) + 86400 * 365,
            ["Active Ingredient"],
            "https://ipfs.io/ipfs/QmHash"
        );
        productId = 1;
    });

    describe("Deployment", function () {
        it("Should set the correct name and symbol", async function () {
            expect(await nftCertificate.name()).to.equal("TraceChain Certificate");
            expect(await nftCertificate.symbol()).to.equal("TRACECERT");
        });

        it("Should set the correct owner", async function () {
            expect(await nftCertificate.owner()).to.equal(owner.address);
        });

        it("Should set the correct product registry", async function () {
            expect(await nftCertificate.productRegistry()).to.equal(productRegistry.address);
        });

        it("Should initialize with zero token count", async function () {
            expect(await nftCertificate.totalSupply()).to.equal(0);
        });
    });

    describe("Certificate Minting", function () {
        const certificateType = "authenticity";
        const expiryDate = Math.floor(Date.now() / 1000) + 86400 * 365; // 1 year
        const issuer = "TraceChain Certification Authority";
        const standards = "ISO 9001, FDA Approved";
        const tokenURI = "https://ipfs.io/ipfs/QmCertificateHash";
        const verificationCode = "VERIFY-12345";

        it("Should mint certificate successfully", async function () {
            const tx = await nftCertificate.mintCertificate(
                manufacturer.address,
                productId,
                certificateType,
                expiryDate,
                issuer,
                standards,
                tokenURI,
                verificationCode
            );

            await expect(tx)
                .to.emit(nftCertificate, "CertificateMinted")
                .withArgs(1, productId, certificateType, manufacturer.address);

            const certificate = await nftCertificate.getCertificate(1);
            expect(certificate.productId).to.equal(productId);
            expect(certificate.certificateType).to.equal(certificateType);
            expect(certificate.issuer).to.equal(issuer);
            expect(certificate.standards).to.equal(standards);
            expect(certificate.isValid).to.be.true;
            expect(certificate.verificationCode).to.equal(verificationCode);
        });

        it("Should increment token counter", async function () {
            await nftCertificate.mintCertificate(
                manufacturer.address,
                productId,
                certificateType,
                expiryDate,
                issuer,
                standards,
                tokenURI,
                verificationCode
            );

            expect(await nftCertificate.totalSupply()).to.equal(1);
        });

        it("Should set correct token owner", async function () {
            await nftCertificate.mintCertificate(
                manufacturer.address,
                productId,
                certificateType,
                expiryDate,
                issuer,
                standards,
                tokenURI,
                verificationCode
            );

            expect(await nftCertificate.ownerOf(1)).to.equal(manufacturer.address);
        });

        it("Should map product to certificate", async function () {
            await nftCertificate.mintCertificate(
                manufacturer.address,
                productId,
                certificateType,
                expiryDate,
                issuer,
                standards,
                tokenURI,
                verificationCode
            );

            const tokenId = await nftCertificate.productToCertificate(productId);
            expect(tokenId).to.equal(1);
        });

        it("Should mark verification code as used", async function () {
            await nftCertificate.mintCertificate(
                manufacturer.address,
                productId,
                certificateType,
                expiryDate,
                issuer,
                standards,
                tokenURI,
                verificationCode
            );

            expect(await nftCertificate.usedVerificationCodes(verificationCode)).to.be.true;
        });

        it("Should prevent duplicate verification codes", async function () {
            await nftCertificate.mintCertificate(
                manufacturer.address,
                productId,
                certificateType,
                expiryDate,
                issuer,
                standards,
                tokenURI,
                verificationCode
            );

            // Try to mint another certificate with same verification code
            await expect(
                nftCertificate.mintCertificate(
                    distributor.address,
                    productId,
                    "quality",
                    expiryDate,
                    issuer,
                    standards,
                    tokenURI,
                    verificationCode // Same verification code
                )
            ).to.be.revertedWith("Verification code already used");
        });

        it("Should prevent minting for non-existent product", async function () {
            await expect(
                nftCertificate.mintCertificate(
                    manufacturer.address,
                    999, // Non-existent product
                    certificateType,
                    expiryDate,
                    issuer,
                    standards,
                    tokenURI,
                    verificationCode
                )
            ).to.be.revertedWith("Only product registry");
        });

        it("Should validate certificate parameters", async function () {
            await expect(
                nftCertificate.mintCertificate(
                    manufacturer.address,
                    productId,
                    "", // Empty certificate type
                    expiryDate,
                    issuer,
                    standards,
                    tokenURI,
                    verificationCode
                )
            ).to.be.revertedWith("Certificate type required");

            await expect(
                nftCertificate.mintCertificate(
                    manufacturer.address,
                    productId,
                    certificateType,
                    Math.floor(Date.now() / 1000) - 86400, // Past expiry date
                    issuer,
                    standards,
                    tokenURI,
                    verificationCode
                )
            ).to.be.revertedWith("Invalid expiry date");
        });

        it("Should prevent zero address recipient", async function () {
            await expect(
                nftCertificate.mintCertificate(
                    ethers.constants.AddressZero,
                    productId,
                    certificateType,
                    expiryDate,
                    issuer,
                    standards,
                    tokenURI,
                    verificationCode
                )
            ).to.be.revertedWith("Invalid recipient address");
        });
    });

    describe("Certificate Verification", function () {
        const certificateType = "authenticity";
        const expiryDate = Math.floor(Date.now() / 1000) + 86400 * 365;
        const issuer = "TraceChain Certification Authority";
        const standards = "ISO 9001";
        const tokenURI = "https://ipfs.io/ipfs/QmCertificateHash";
        const verificationCode = "VERIFY-12345";

        beforeEach(async function () {
            await nftCertificate.mintCertificate(
                manufacturer.address,
                productId,
                certificateType,
                expiryDate,
                issuer,
                standards,
                tokenURI,
                verificationCode
            );
        });

        it("Should verify valid certificate", async function () {
            const verification = await nftCertificate.verifyCertificate(1);
            expect(verification[0]).to.be.true; // isValid
            expect(verification[1]).to.equal("Certificate is valid");
        });

        it("Should verify certificate by verification code", async function () {
            const verification = await nftCertificate.verifyByCode(verificationCode);
            expect(verification[0]).to.be.true;
            expect(verification[1]).to.equal("Certificate is valid");
        });

        it("Should return false for non-existent certificate", async function () {
            const verification = await nftCertificate.verifyCertificate(999);
            expect(verification[0]).to.be.false;
            expect(verification[1]).to.equal("Certificate does not exist");
        });

        it("Should return false for non-existent verification code", async function () {
            const verification = await nftCertificate.verifyByCode("NON-EXISTENT");
            expect(verification[0]).to.be.false;
            expect(verification[1]).to.equal("Certificate not found");
        });

        it("Should handle expired certificates", async function () {
            // Fast forward time to after expiry
            await time.increase(86400 * 366); // 1 year + 1 day

            const verification = await nftCertificate.verifyCertificate(1);
            expect(verification[0]).to.be.false;
            expect(verification[1]).to.equal("Certificate has expired");
        });

        it("Should handle invalidated certificates", async function () {
            // Invalidate the certificate
            await nftCertificate.invalidateCertificate(1, "Product recalled");

            const verification = await nftCertificate.verifyCertificate(1);
            expect(verification[0]).to.be.false;
            expect(verification[1]).to.equal("Certificate has been invalidated");
        });
    });

    describe("Certificate Management", function () {
        const certificateType = "authenticity";
        const expiryDate = Math.floor(Date.now() / 1000) + 86400 * 365;
        const issuer = "TraceChain Certification Authority";
        const standards = "ISO 9001";
        const tokenURI = "https://ipfs.io/ipfs/QmCertificateHash";
        const verificationCode = "VERIFY-12345";

        beforeEach(async function () {
            await nftCertificate.mintCertificate(
                manufacturer.address,
                productId,
                certificateType,
                expiryDate,
                issuer,
                standards,
                tokenURI,
                verificationCode
            );
        });

        it("Should invalidate certificate", async function () {
            const reason = "Product quality issue";
            const tx = await nftCertificate.invalidateCertificate(1, reason);

            await expect(tx)
                .to.emit(nftCertificate, "CertificateVerified")
                .withArgs(1, false, reason);

            const certificate = await nftCertificate.getCertificate(1);
            expect(certificate.isValid).to.be.false;
        });

        it("Should update certificate metadata", async function () {
            const newTokenURI = "https://ipfs.io/ipfs/QmNewHash";
            await nftCertificate.updateCertificateMetadata(1, newTokenURI);

            expect(await nftCertificate.tokenURI(1)).to.equal(newTokenURI);
        });

        it("Should get certificate by product ID", async function () {
            const tokenId = await nftCertificate.getCertificateByProduct(productId);
            expect(tokenId).to.equal(1);
        });

        it("Should return zero for non-existent product certificate", async function () {
            const tokenId = await nftCertificate.getCertificateByProduct(999);
            expect(tokenId).to.equal(0);
        });

        it("Should get all certificates for owner", async function () {
            // Mint another certificate for the same owner
            await productRegistry.connect(manufacturer).registerProduct(
                "Test Product 2",
                "pharmaceutical",
                "BATCH-002",
                Math.floor(Date.now() / 1000),
                Math.floor(Date.now() / 1000) + 86400 * 365,
                ["Active Ingredient 2"],
                "https://ipfs.io/ipfs/QmHash2"
            );

            await nftCertificate.mintCertificate(
                manufacturer.address,
                2,
                "quality",
                expiryDate,
                issuer,
                standards,
                tokenURI,
                "VERIFY-54321"
            );

            const certificates = await nftCertificate.getCertificatesByOwner(manufacturer.address);
            expect(certificates.length).to.equal(2);
            expect(certificates[0]).to.equal(1);
            expect(certificates[1]).to.equal(2);
        });

        it("Should prevent unauthorized metadata update", async function () {
            await expect(
                nftCertificate.connect(distributor).updateCertificateMetadata(1, "new-uri")
            ).to.be.revertedWith("Not certificate owner or authorized");
        });

        it("Should prevent invalidating non-existent certificate", async function () {
            await expect(
                nftCertificate.invalidateCertificate(999, "reason")
            ).to.be.revertedWith("Certificate does not exist");
        });
    });

    describe("Access Control", function () {
        it("Should only allow owner to mint certificates", async function () {
            await expect(
                nftCertificate.connect(manufacturer).mintCertificate(
                    manufacturer.address,
                    productId,
                    "authenticity",
                    Math.floor(Date.now() / 1000) + 86400 * 365,
                    "issuer",
                    "standards",
                    "tokenURI",
                    "verificationCode"
                )
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should only allow owner to invalidate certificates", async function () {
            await nftCertificate.mintCertificate(
                manufacturer.address,
                productId,
                "authenticity",
                Math.floor(Date.now() / 1000) + 86400 * 365,
                "issuer",
                "standards",
                "tokenURI",
                "verificationCode"
            );

            await expect(
                nftCertificate.connect(manufacturer).invalidateCertificate(1, "reason")
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should only allow owner to update product registry", async function () {
            await expect(
                nftCertificate.connect(manufacturer).setProductRegistry(distributor.address)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("Pausable Functionality", function () {
        it("Should pause and unpause correctly", async function () {
            await nftCertificate.emergencyPause();
            expect(await nftCertificate.paused()).to.be.true;

            await nftCertificate.emergencyUnpause();
            expect(await nftCertificate.paused()).to.be.false;
        });

        it("Should prevent minting when paused", async function () {
            await nftCertificate.emergencyPause();

            await expect(
                nftCertificate.mintCertificate(
                    manufacturer.address,
                    productId,
                    "authenticity",
                    Math.floor(Date.now() / 1000) + 86400 * 365,
                    "issuer",
                    "standards",
                    "tokenURI",
                    "verificationCode"
                )
            ).to.be.revertedWith("Pausable: paused");
        });

        it("Should prevent transfers when paused", async function () {
            await nftCertificate.mintCertificate(
                manufacturer.address,
                productId,
                "authenticity",
                Math.floor(Date.now() / 1000) + 86400 * 365,
                "issuer",
                "standards",
                "tokenURI",
                "verificationCode"
            );

            await nftCertificate.emergencyPause();

            await expect(
                nftCertificate.connect(manufacturer).transferFrom(
                    manufacturer.address,
                    distributor.address,
                    1
                )
            ).to.be.revertedWith("Pausable: paused");
        });
    });

    describe("Edge Cases", function () {
        it("Should handle multiple certificate types", async function () {
            const types = ["authenticity", "quality", "compliance"];
            const verificationCodes = ["VERIFY-001", "VERIFY-002", "VERIFY-003"];

            for (let i = 0; i < types.length; i++) {
                // Register new product for each certificate
                await productRegistry.connect(manufacturer).registerProduct(
                    `Product ${i}`,
                    "pharmaceutical",
                    `BATCH-${i}`,
                    Math.floor(Date.now() / 1000),
                    Math.floor(Date.now() / 1000) + 86400 * 365,
                    ["Material"],
                    "https://ipfs.io/ipfs/QmHash"
                );

                await nftCertificate.mintCertificate(
                    manufacturer.address,
                    i + 1,
                    types[i],
                    Math.floor(Date.now() / 1000) + 86400 * 365,
                    "issuer",
                    "standards",
                    "tokenURI",
                    verificationCodes[i]
                );
            }

            expect(await nftCertificate.totalSupply()).to.equal(3);
        });

        it("Should handle long verification codes", async function () {
            const longCode = "VERIFY-" + "A".repeat(100);
            
            await nftCertificate.mintCertificate(
                manufacturer.address,
                productId,
                "authenticity",
                Math.floor(Date.now() / 1000) + 86400 * 365,
                "issuer",
                "standards",
                "tokenURI",
                longCode
            );

            const verification = await nftCertificate.verifyByCode(longCode);
            expect(verification[0]).to.be.true;
        });

        it("Should handle special characters in verification codes", async function () {
            const specialCode = "VERIFY-123!@#$%^&*()";
            
            await nftCertificate.mintCertificate(
                manufacturer.address,
                productId,
                "authenticity",
                Math.floor(Date.now() / 1000) + 86400 * 365,
                "issuer",
                "standards",
                "tokenURI",
                specialCode
            );

            const verification = await nftCertificate.verifyByCode(specialCode);
            expect(verification[0]).to.be.true;
        });
    });

    describe("Gas Optimization", function () {
        it("Should handle batch certificate minting efficiently", async function () {
            const batchSize = 10;
            const startGas = await ethers.provider.getBlockNumber();

            for (let i = 0; i < batchSize; i++) {
                // Register new product for each certificate
                await productRegistry.connect(manufacturer).registerProduct(
                    `Product ${i}`,
                    "pharmaceutical",
                    `BATCH-${i}`,
                    Math.floor(Date.now() / 1000),
                    Math.floor(Date.now() / 1000) + 86400 * 365,
                    ["Material"],
                    "https://ipfs.io/ipfs/QmHash"
                );

                await nftCertificate.mintCertificate(
                    manufacturer.address,
                    i + 1,
                    "authenticity",
                    Math.floor(Date.now() / 1000) + 86400 * 365,
                    "issuer",
                    "standards",
                    "tokenURI",
                    `VERIFY-${i}`
                );
            }

            const endGas = await ethers.provider.getBlockNumber();
            const gasUsed = endGas - startGas;

            // Should use reasonable amount of gas for batch operations
            expect(gasUsed).to.be.lt(2000);
        });
    });

    describe("Integration with ProductRegistry", function () {
        it("Should maintain correct product-to-certificate mapping", async function () {
            await nftCertificate.mintCertificate(
                manufacturer.address,
                productId,
                "authenticity",
                Math.floor(Date.now() / 1000) + 86400 * 365,
                "issuer",
                "standards",
                "tokenURI",
                "VERIFY-123"
            );

            // Verify the mapping
            const tokenId = await nftCertificate.productToCertificate(productId);
            expect(tokenId).to.equal(1);

            // Verify the certificate references the correct product
            const certificate = await nftCertificate.getCertificate(1);
            expect(certificate.productId).to.equal(productId);
        });

        it("Should handle product registry address updates", async function () {
            // Deploy new product registry
            const NewProductRegistry = await ethers.getContractFactory("ProductRegistry");
            const newProductRegistry = await NewProductRegistry.deploy();
            await newProductRegistry.deployed();

            // Update the registry address
            await nftCertificate.setProductRegistry(newProductRegistry.address);
            expect(await nftCertificate.productRegistry()).to.equal(newProductRegistry.address);
        });
    });
});
