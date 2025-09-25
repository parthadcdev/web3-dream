const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("TraceChain Core Implementation", function () {
    let productRegistry, nftCertificate, traceToken;
    let owner, manufacturer, distributor, retailer, consumer, auditor;
    let productId;

    beforeEach(async function () {
        [owner, manufacturer, distributor, retailer, consumer, auditor] = await ethers.getSigners();
        
        // Deploy core contracts
        const ProductRegistry = await ethers.getContractFactory("ProductRegistry");
        productRegistry = await ProductRegistry.deploy();
        await productRegistry.deployed();

        const NFTCertificate = await ethers.getContractFactory("NFTCertificate");
        nftCertificate = await NFTCertificate.deploy(productRegistry.address);
        await nftCertificate.deployed();

        const TraceToken = await ethers.getContractFactory("TraceToken");
        traceToken = await TraceToken.deploy();
        await traceToken.deployed();
    });

    describe("Core Traceability Flow", function () {
        beforeEach(async function () {
            // Register a test product
            await productRegistry.connect(manufacturer).registerProduct(
                "Organic Coffee Beans",
                "food",
                "COFFEE-2024-001",
                Math.floor(Date.now() / 1000),
                Math.floor(Date.now() / 1000) + 86400 * 365,
                ["Organic Coffee Beans", "Fair Trade Certified", "Biodegradable Packaging"],
                "https://ipfs.io/ipfs/QmCoffeeHash"
            );
            productId = 1;
        });

        it("Should complete end-to-end traceability workflow", async function () {
            // 1. Product Registration
            const product = await productRegistry.getProduct(productId);
            expect(product.productName).to.equal("Organic Coffee Beans");
            expect(product.manufacturer).to.equal(manufacturer.address);
            expect(product.isActive).to.be.true;

            // 2. Add Stakeholders
            await productRegistry.connect(manufacturer).addStakeholder(productId, distributor.address);
            await productRegistry.connect(manufacturer).addStakeholder(productId, retailer.address);

            const updatedProduct = await productRegistry.getProduct(productId);
            expect(updatedProduct.stakeholders.length).to.equal(3); // manufacturer + 2 added

            // 3. Add Checkpoints
            await productRegistry.connect(manufacturer).addCheckpoint(
                productId,
                "harvested",
                "Farm Location: Colombia",
                "Temperature: 25°C, Humidity: 60%"
            );

            await productRegistry.connect(distributor).addCheckpoint(
                productId,
                "shipped",
                "Port of Cartagena",
                "Shipped via refrigerated container"
            );

            await productRegistry.connect(retailer).addCheckpoint(
                productId,
                "received",
                "Retail Store Downtown",
                "Stored in climate-controlled warehouse"
            );

            const checkpoints = await productRegistry.getCheckpoints(productId);
            expect(checkpoints.length).to.equal(3);

            // 4. Mint Certificate
            await nftCertificate.mintCertificate(
                manufacturer.address,
                productId,
                "authenticity",
                Math.floor(Date.now() / 1000) + 86400 * 365,
                "Fair Trade Certification Authority",
                "Fair Trade, Organic",
                "https://ipfs.io/ipfs/QmCertificateHash",
                "FAIRTRADE-12345"
            );

            // 5. Verify Certificate
            const verification = await nftCertificate.verifyCertificate(1);
            expect(verification[0]).to.be.true;
            expect(verification[1]).to.equal("Certificate is valid");

            // 6. Verify End-to-End Traceability
            const finalProduct = await productRegistry.getProduct(productId);
            const finalCheckpoints = await productRegistry.getCheckpoints(productId);
            const certificate = await nftCertificate.getCertificate(1);

            expect(finalProduct.productName).to.equal("Organic Coffee Beans");
            expect(finalCheckpoints.length).to.equal(3);
            expect(certificate.productId).to.equal(productId);
            expect(certificate.certificateType).to.equal("authenticity");
        });

        it("Should handle complex stakeholder networks", async function () {
            // Add multiple stakeholders
            const stakeholders = [distributor, retailer, consumer, auditor];
            for (let i = 0; i < stakeholders.length; i++) {
                await productRegistry.connect(manufacturer).addStakeholder(productId, stakeholders[i].address);
            }

            // Each stakeholder adds a checkpoint
            const statuses = ["shipped", "received", "purchased", "audited"];
            for (let i = 0; i < stakeholders.length; i++) {
                await productRegistry.connect(stakeholders[i]).addCheckpoint(
                    productId,
                    statuses[i],
                    `Location ${i}`,
                    `Data from ${await stakeholders[i].getAddress()}`
                );
            }

            const product = await productRegistry.getProduct(productId);
            const checkpoints = await productRegistry.getCheckpoints(productId);

            expect(product.stakeholders.length).to.equal(5); // manufacturer + 4 stakeholders
            expect(checkpoints.length).to.equal(4); // 4 stakeholder checkpoints
        });

        it("Should handle multiple certificate types for same product", async function () {
            // Mint different types of certificates
            const certificateTypes = ["authenticity", "quality", "compliance"];
            const verificationCodes = ["AUTH-001", "QUAL-001", "COMP-001"];

            for (let i = 0; i < certificateTypes.length; i++) {
                await nftCertificate.mintCertificate(
                    manufacturer.address,
                    productId,
                    certificateTypes[i],
                    Math.floor(Date.now() / 1000) + 86400 * 365,
                    `Authority ${i}`,
                    `Standard ${i}`,
                    `https://ipfs.io/ipfs/QmHash${i}`,
                    verificationCodes[i]
                );
            }

            expect(await nftCertificate.totalSupply()).to.equal(3);

            // Verify all certificates
            for (let i = 1; i <= 3; i++) {
                const verification = await nftCertificate.verifyCertificate(i);
                expect(verification[0]).to.be.true;
            }
        });
    });

    describe("Security and Access Control", function () {
        beforeEach(async function () {
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

        it("Should enforce proper access controls", async function () {
            // Only manufacturer should add stakeholders initially
            await expect(
                productRegistry.connect(retailer).addStakeholder(productId, distributor.address)
            ).to.be.revertedWith("Not authorized");

            // Only stakeholders should add checkpoints
            await expect(
                productRegistry.connect(retailer).addCheckpoint(
                    productId,
                    "received",
                    "Store",
                    "Data"
                )
            ).to.be.revertedWith("Not authorized stakeholder");

            // Only owner should mint certificates
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

        it("Should handle unauthorized access attempts", async function () {
            // Try to deactivate product without authorization
            await expect(
                productRegistry.connect(retailer).deactivateProduct(productId)
            ).to.be.revertedWith("Not authorized");

            // Try to update metadata without authorization
            await expect(
                productRegistry.connect(retailer).updateMetadataURI(productId, "new-uri")
            ).to.be.revertedWith("Not authorized");

            // Try to invalidate certificate without authorization
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
    });

    describe("Data Integrity and Validation", function () {
        it("Should validate all input parameters", async function () {
            // Test product registration validation
            await expect(
                productRegistry.connect(manufacturer).registerProduct(
                    "", // Empty name
                    "pharmaceutical",
                    "BATCH-001",
                    Math.floor(Date.now() / 1000),
                    Math.floor(Date.now() / 1000) + 86400 * 365,
                    ["Material"],
                    "https://ipfs.io/ipfs/QmHash"
                )
            ).to.be.revertedWith("Product name required");

            await expect(
                productRegistry.connect(manufacturer).registerProduct(
                    "Product",
                    "pharmaceutical",
                    "BATCH-001",
                    0, // Invalid manufacture date
                    Math.floor(Date.now() / 1000) + 86400 * 365,
                    ["Material"],
                    "https://ipfs.io/ipfs/QmHash"
                )
            ).to.be.revertedWith("Invalid manufacture date");

            // Test checkpoint validation
            await productRegistry.connect(manufacturer).registerProduct(
                "Test Product",
                "pharmaceutical",
                "BATCH-001",
                Math.floor(Date.now() / 1000),
                Math.floor(Date.now() / 1000) + 86400 * 365,
                ["Material"],
                "https://ipfs.io/ipfs/QmHash"
            );

            await expect(
                productRegistry.connect(manufacturer).addCheckpoint(
                    1,
                    "", // Empty status
                    "Location",
                    "Data"
                )
            ).to.be.revertedWith("Status required");
        });

        it("Should prevent duplicate data", async function () {
            // Register first product
            await productRegistry.connect(manufacturer).registerProduct(
                "Product 1",
                "pharmaceutical",
                "BATCH-001",
                Math.floor(Date.now() / 1000),
                Math.floor(Date.now() / 1000) + 86400 * 365,
                ["Material"],
                "https://ipfs.io/ipfs/QmHash"
            );

            // Try to register product with same batch number
            await expect(
                productRegistry.connect(manufacturer).registerProduct(
                    "Product 2",
                    "pharmaceutical",
                    "BATCH-001", // Same batch number
                    Math.floor(Date.now() / 1000),
                    Math.floor(Date.now() / 1000) + 86400 * 365,
                    ["Material"],
                    "https://ipfs.io/ipfs/QmHash"
                )
            ).to.be.revertedWith("Batch number already exists");
        });

        it("Should maintain data consistency", async function () {
            // Register product and mint certificate
            await productRegistry.connect(manufacturer).registerProduct(
                "Test Product",
                "pharmaceutical",
                "BATCH-001",
                Math.floor(Date.now() / 1000),
                Math.floor(Date.now() / 1000) + 86400 * 365,
                ["Material"],
                "https://ipfs.io/ipfs/QmHash"
            );

            await nftCertificate.mintCertificate(
                manufacturer.address,
                1,
                "authenticity",
                Math.floor(Date.now() / 1000) + 86400 * 365,
                "issuer",
                "standards",
                "tokenURI",
                "verificationCode"
            );

            // Verify data consistency
            const product = await productRegistry.getProduct(1);
            const certificate = await nftCertificate.getCertificate(1);
            const tokenId = await nftCertificate.productToCertificate(1);

            expect(certificate.productId).to.equal(product.productId);
            expect(tokenId).to.equal(1);
            expect(await nftCertificate.ownerOf(1)).to.equal(manufacturer.address);
        });
    });

    describe("Performance and Scalability", function () {
        it("Should handle large number of products efficiently", async function () {
            const productCount = 50;
            const startTime = Date.now();

            // Register multiple products
            for (let i = 0; i < productCount; i++) {
                await productRegistry.connect(manufacturer).registerProduct(
                    `Product ${i}`,
                    "pharmaceutical",
                    `BATCH-${i}`,
                    Math.floor(Date.now() / 1000),
                    Math.floor(Date.now() / 1000) + 86400 * 365,
                    ["Material"],
                    "https://ipfs.io/ipfs/QmHash"
                );
            }

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Should complete in reasonable time
            expect(duration).to.be.lt(60000); // 1 minute
            expect(await productRegistry.getProductCount()).to.equal(productCount);
        });

        it("Should handle large number of checkpoints efficiently", async function () {
            // Register product
            await productRegistry.connect(manufacturer).registerProduct(
                "Test Product",
                "pharmaceutical",
                "BATCH-001",
                Math.floor(Date.now() / 1000),
                Math.floor(Date.now() / 1000) + 86400 * 365,
                ["Material"],
                "https://ipfs.io/ipfs/QmHash"
            );

            // Add many checkpoints
            const checkpointCount = 100;
            const startTime = Date.now();

            for (let i = 0; i < checkpointCount; i++) {
                await productRegistry.connect(manufacturer).addCheckpoint(
                    1,
                    `status_${i}`,
                    `location_${i}`,
                    `data_${i}`
                );
            }

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Should complete in reasonable time
            expect(duration).to.be.lt(30000); // 30 seconds
            expect((await productRegistry.getCheckpoints(1)).length).to.equal(checkpointCount);
        });

        it("Should handle concurrent operations", async function () {
            // Register multiple products concurrently
            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(
                    productRegistry.connect(manufacturer).registerProduct(
                        `Product ${i}`,
                        "pharmaceutical",
                        `BATCH-${i}`,
                        Math.floor(Date.now() / 1000),
                        Math.floor(Date.now() / 1000) + 86400 * 365,
                        ["Material"],
                        "https://ipfs.io/ipfs/QmHash"
                    )
                );
            }

            await Promise.all(promises);
            expect(await productRegistry.getProductCount()).to.equal(10);
        });
    });

    describe("Error Handling and Edge Cases", function () {
        it("Should handle non-existent product queries gracefully", async function () {
            await expect(
                productRegistry.getProduct(999)
            ).to.be.revertedWith("Product not found");

            await expect(
                productRegistry.getCheckpoints(999)
            ).to.be.revertedWith("Product not found");
        });

        it("Should handle expired certificates correctly", async function () {
            // Register product and mint certificate with past expiry
            await productRegistry.connect(manufacturer).registerProduct(
                "Test Product",
                "pharmaceutical",
                "BATCH-001",
                Math.floor(Date.now() / 1000),
                Math.floor(Date.now() / 1000) + 86400 * 365,
                ["Material"],
                "https://ipfs.io/ipfs/QmHash"
            );

            const pastExpiry = Math.floor(Date.now() / 1000) - 86400; // Yesterday
            await nftCertificate.mintCertificate(
                manufacturer.address,
                1,
                "authenticity",
                pastExpiry,
                "issuer",
                "standards",
                "tokenURI",
                "verificationCode"
            );

            const verification = await nftCertificate.verifyCertificate(1);
            expect(verification[0]).to.be.false;
            expect(verification[1]).to.equal("Certificate has expired");
        });

        it("Should handle contract pauses gracefully", async function () {
            // Register product
            await productRegistry.connect(manufacturer).registerProduct(
                "Test Product",
                "pharmaceutical",
                "BATCH-001",
                Math.floor(Date.now() / 1000),
                Math.floor(Date.now() / 1000) + 86400 * 365,
                ["Material"],
                "https://ipfs.io/ipfs/QmHash"
            );

            // Pause contract
            await productRegistry.emergencyPause();

            // Try to add checkpoint (should fail)
            await expect(
                productRegistry.connect(manufacturer).addCheckpoint(
                    1,
                    "status",
                    "location",
                    "data"
                )
            ).to.be.revertedWith("Pausable: paused");

            // Unpause contract
            await productRegistry.emergencyUnpause();

            // Should work again
            await productRegistry.connect(manufacturer).addCheckpoint(
                1,
                "status",
                "location",
                "data"
            );
        });

        it("Should handle maximum values correctly", async function () {
            // Test with maximum string lengths
            const longString = "A".repeat(1000);
            
            await productRegistry.connect(manufacturer).registerProduct(
                longString, // Long product name
                "pharmaceutical",
                "BATCH-001",
                Math.floor(Date.now() / 1000),
                Math.floor(Date.now() / 1000) + 86400 * 365,
                [longString, longString], // Long material names
                longString // Long metadata URI
            );

            const product = await productRegistry.getProduct(1);
            expect(product.productName).to.equal(longString);
            expect(product.rawMaterials[0]).to.equal(longString);
        });
    });

    describe("Integration and Interoperability", function () {
        it("Should work with external contract interactions", async function () {
            // Register product
            await productRegistry.connect(manufacturer).registerProduct(
                "Test Product",
                "pharmaceutical",
                "BATCH-001",
                Math.floor(Date.now() / 1000),
                Math.floor(Date.now() / 1000) + 86400 * 365,
                ["Material"],
                "https://ipfs.io/ipfs/QmHash"
            );

            // Mint certificate
            await nftCertificate.mintCertificate(
                manufacturer.address,
                1,
                "authenticity",
                Math.floor(Date.now() / 1000) + 86400 * 365,
                "issuer",
                "standards",
                "tokenURI",
                "verificationCode"
            );

            // Verify cross-contract data consistency
            const product = await productRegistry.getProduct(1);
            const certificate = await nftCertificate.getCertificate(1);
            const tokenId = await nftCertificate.productToCertificate(1);

            expect(certificate.productId).to.equal(product.productId);
            expect(tokenId).to.equal(1);
            expect(await nftCertificate.ownerOf(1)).to.equal(manufacturer.address);
        });

        it("Should handle contract upgrades gracefully", async function () {
            // Register product
            await productRegistry.connect(manufacturer).registerProduct(
                "Test Product",
                "pharmaceutical",
                "BATCH-001",
                Math.floor(Date.now() / 1000),
                Math.floor(Date.now() / 1000) + 86400 * 365,
                ["Material"],
                "https://ipfs.io/ipfs/QmHash"
            );

            // Update product registry in NFT contract
            const NewProductRegistry = await ethers.getContractFactory("ProductRegistry");
            const newProductRegistry = await NewProductRegistry.deploy();
            await newProductRegistry.deployed();

            await nftCertificate.setProductRegistry(newProductRegistry.address);
            expect(await nftCertificate.productRegistry()).to.equal(newProductRegistry.address);
        });
    });
});
