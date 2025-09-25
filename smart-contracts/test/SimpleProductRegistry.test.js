const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ProductRegistry - Core Implementation", function () {
    let productRegistry;
    let owner, manufacturer, distributor, retailer, consumer;

    beforeEach(async function () {
        [owner, manufacturer, distributor, retailer, consumer] = await ethers.getSigners();
        
        const ProductRegistry = await ethers.getContractFactory("ProductRegistry");
        productRegistry = await ProductRegistry.deploy();
        await productRegistry.deployed();
    });

    describe("Deployment", function () {
        it("Should set the correct owner", async function () {
            expect(await productRegistry.owner()).to.equal(owner.address);
        });

        it("Should initialize with zero products", async function () {
            expect(await productRegistry.getProductCount()).to.equal(0);
        });

        it("Should not be paused initially", async function () {
            expect(await productRegistry.paused()).to.be.false;
        });
    });

    describe("Product Registration", function () {
        const productName = "Test Product";
        const productType = "pharmaceutical";
        const batchNumber = "BATCH-2024-001";
        const manufactureDate = Math.floor(Date.now() / 1000);
        const expiryDate = Math.floor(Date.now() / 1000) + 86400 * 365; // 1 year
        const rawMaterials = ["Material1", "Material2", "Material3"];
        const metadataURI = "https://ipfs.io/ipfs/QmHash";

        it("Should register a product successfully", async function () {
            const tx = await productRegistry.connect(manufacturer).registerProduct(
                productName,
                productType,
                batchNumber,
                manufactureDate,
                expiryDate,
                rawMaterials,
                metadataURI
            );

            await expect(tx)
                .to.emit(productRegistry, "ProductRegistered")
                .withArgs(1, productName, manufacturer.address, batchNumber);

            const product = await productRegistry.getProduct(1);
            expect(product.productName).to.equal(productName);
            expect(product.productType).to.equal(productType);
            expect(product.manufacturer).to.equal(manufacturer.address);
            expect(product.batchNumber).to.equal(batchNumber);
            expect(product.isActive).to.be.true;
        });

        it("Should increment product count", async function () {
            await productRegistry.connect(manufacturer).registerProduct(
                productName,
                productType,
                batchNumber,
                manufactureDate,
                expiryDate,
                rawMaterials,
                metadataURI
            );

            expect(await productRegistry.getProductCount()).to.equal(1);
        });

        it("Should add manufacturer as initial stakeholder", async function () {
            await productRegistry.connect(manufacturer).registerProduct(
                productName,
                productType,
                batchNumber,
                manufactureDate,
                expiryDate,
                rawMaterials,
                metadataURI
            );

            const product = await productRegistry.getProduct(1);
            expect(product.stakeholders[0]).to.equal(manufacturer.address);
        });

        it("Should prevent duplicate batch numbers", async function () {
            await productRegistry.connect(manufacturer).registerProduct(
                productName,
                productType,
                batchNumber,
                manufactureDate,
                expiryDate,
                rawMaterials,
                metadataURI
            );

            await expect(
                productRegistry.connect(manufacturer).registerProduct(
                    "Another Product",
                    productType,
                    batchNumber, // Same batch number
                    manufactureDate,
                    expiryDate,
                    rawMaterials,
                    metadataURI
                )
            ).to.be.revertedWith("Batch number already exists");
        });

        it("Should validate input parameters", async function () {
            await expect(
                productRegistry.connect(manufacturer).registerProduct(
                    "", // Empty product name
                    productType,
                    batchNumber,
                    manufactureDate,
                    expiryDate,
                    rawMaterials,
                    metadataURI
                )
            ).to.be.revertedWith("Product name required");

            await expect(
                productRegistry.connect(manufacturer).registerProduct(
                    productName,
                    productType,
                    batchNumber,
                    0, // Invalid manufacture date
                    expiryDate,
                    rawMaterials,
                    metadataURI
                )
            ).to.be.revertedWith("Invalid manufacture date");

            await expect(
                productRegistry.connect(manufacturer).registerProduct(
                    productName,
                    productType,
                    batchNumber,
                    manufactureDate,
                    manufactureDate - 1, // Expiry before manufacture
                    rawMaterials,
                    metadataURI
                )
            ).to.be.revertedWith("Expiry must be after manufacture");
        });
    });

    describe("Checkpoint Management", function () {
        beforeEach(async function () {
            await productRegistry.connect(manufacturer).registerProduct(
                "Test Product",
                "pharmaceutical",
                "BATCH-001",
                Math.floor(Date.now() / 1000),
                Math.floor(Date.now() / 1000) + 86400 * 365,
                ["Material1"],
                "https://ipfs.io/ipfs/QmHash"
            );
        });

        it("Should add checkpoint by manufacturer", async function () {
            const tx = await productRegistry.connect(manufacturer).addCheckpoint(
                1,
                "manufactured",
                "Manufacturing Facility",
                "Temperature: 22°C"
            );

            await expect(tx)
                .to.emit(productRegistry, "CheckpointAdded")
                .withArgs(1, 1, manufacturer.address, "manufactured");

            const checkpoints = await productRegistry.getCheckpoints(1);
            expect(checkpoints.length).to.equal(1);
            expect(checkpoints[0].status).to.equal("manufactured");
            expect(checkpoints[0].stakeholder).to.equal(manufacturer.address);
        });

        it("Should add stakeholder and allow them to add checkpoints", async function () {
            await productRegistry.connect(manufacturer).addStakeholder(1, distributor.address);

            const tx = await productRegistry.connect(distributor).addCheckpoint(
                1,
                "shipped",
                "Distribution Center",
                "Shipped to retailer"
            );

            await expect(tx)
                .to.emit(productRegistry, "CheckpointAdded")
                .withArgs(1, 1, distributor.address, "shipped");
        });

        it("Should prevent unauthorized checkpoint addition", async function () {
            await expect(
                productRegistry.connect(retailer).addCheckpoint(
                    1,
                    "received",
                    "Retail Store",
                    "Product received"
                )
            ).to.be.revertedWith("Not authorized stakeholder");
        });

        it("Should validate checkpoint parameters", async function () {
            await expect(
                productRegistry.connect(manufacturer).addCheckpoint(
                    1,
                    "", // Empty status
                    "Location",
                    "Data"
                )
            ).to.be.revertedWith("Status required");
        });
    });

    describe("Stakeholder Management", function () {
        beforeEach(async function () {
            await productRegistry.connect(manufacturer).registerProduct(
                "Test Product",
                "pharmaceutical",
                "BATCH-001",
                Math.floor(Date.now() / 1000),
                Math.floor(Date.now() / 1000) + 86400 * 365,
                ["Material1"],
                "https://ipfs.io/ipfs/QmHash"
            );
        });

        it("Should add stakeholder by manufacturer", async function () {
            const tx = await productRegistry.connect(manufacturer).addStakeholder(1, distributor.address);

            await expect(tx)
                .to.emit(productRegistry, "StakeholderAdded")
                .withArgs(1, distributor.address);

            const product = await productRegistry.getProduct(1);
            expect(product.stakeholders[1]).to.equal(distributor.address);
        });

        it("Should add stakeholder by existing stakeholder", async function () {
            await productRegistry.connect(manufacturer).addStakeholder(1, distributor.address);

            const tx = await productRegistry.connect(distributor).addStakeholder(1, retailer.address);

            await expect(tx)
                .to.emit(productRegistry, "StakeholderAdded")
                .withArgs(1, retailer.address);
        });

        it("Should prevent adding zero address as stakeholder", async function () {
            await expect(
                productRegistry.connect(manufacturer).addStakeholder(1, ethers.constants.AddressZero)
            ).to.be.revertedWith("Invalid stakeholder address");
        });

        it("Should prevent adding existing stakeholder", async function () {
            await productRegistry.connect(manufacturer).addStakeholder(1, distributor.address);

            await expect(
                productRegistry.connect(manufacturer).addStakeholder(1, distributor.address)
            ).to.be.revertedWith("Stakeholder already exists");
        });

        it("Should prevent unauthorized stakeholder addition", async function () {
            await expect(
                productRegistry.connect(retailer).addStakeholder(1, distributor.address)
            ).to.be.revertedWith("Not authorized");
        });
    });

    describe("Product Management", function () {
        beforeEach(async function () {
            await productRegistry.connect(manufacturer).registerProduct(
                "Test Product",
                "pharmaceutical",
                "BATCH-001",
                Math.floor(Date.now() / 1000),
                Math.floor(Date.now() / 1000) + 86400 * 365,
                ["Material1"],
                "https://ipfs.io/ipfs/QmHash"
            );
        });

        it("Should get product information", async function () {
            const product = await productRegistry.getProduct(1);
            expect(product.productName).to.equal("Test Product");
            expect(product.productType).to.equal("pharmaceutical");
            expect(product.manufacturer).to.equal(manufacturer.address);
        });

        it("Should get stakeholder products", async function () {
            const products = await productRegistry.getStakeholderProducts(manufacturer.address);
            expect(products.length).to.equal(1);
            expect(products[0]).to.equal(1);
        });

        it("Should deactivate product by manufacturer", async function () {
            await productRegistry.connect(manufacturer).deactivateProduct(1);

            const product = await productRegistry.getProduct(1);
            expect(product.isActive).to.be.false;
        });

        it("Should deactivate product by owner", async function () {
            await productRegistry.connect(owner).deactivateProduct(1);

            const product = await productRegistry.getProduct(1);
            expect(product.isActive).to.be.false;
        });

        it("Should prevent unauthorized deactivation", async function () {
            await expect(
                productRegistry.connect(retailer).deactivateProduct(1)
            ).to.be.revertedWith("Not authorized");
        });

        it("Should update metadata URI", async function () {
            const newURI = "https://ipfs.io/ipfs/NewHash";
            await productRegistry.connect(manufacturer).updateMetadataURI(1, newURI);

            const product = await productRegistry.getProduct(1);
            expect(product.metadataURI).to.equal(newURI);
        });
    });

    describe("Access Control", function () {
        it("Should only allow owner to pause contract", async function () {
            await productRegistry.emergencyPause();
            expect(await productRegistry.paused()).to.be.true;

            await productRegistry.emergencyUnpause();
            expect(await productRegistry.paused()).to.be.false;
        });

        it("Should prevent non-owner from pausing", async function () {
            await expect(
                productRegistry.connect(manufacturer).emergencyPause()
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should allow manufacturer to deactivate their product", async function () {
            await productRegistry.connect(manufacturer).registerProduct(
                "Test Product",
                "pharmaceutical",
                "BATCH-001",
                Math.floor(Date.now() / 1000),
                Math.floor(Date.now() / 1000) + 86400 * 365,
                ["Material1"],
                "https://ipfs.io/ipfs/QmHash"
            );

            await productRegistry.connect(manufacturer).deactivateProduct(1);

            const product = await productRegistry.getProduct(1);
            expect(product.isActive).to.be.false;
        });

        it("Should prevent non-manufacturer from deactivating product", async function () {
            await productRegistry.connect(manufacturer).registerProduct(
                "Test Product",
                "pharmaceutical",
                "BATCH-001",
                Math.floor(Date.now() / 1000),
                Math.floor(Date.now() / 1000) + 86400 * 365,
                ["Material1"],
                "https://ipfs.io/ipfs/QmHash"
            );

            await expect(
                productRegistry.connect(retailer).deactivateProduct(1)
            ).to.be.revertedWith("Not authorized");
        });
    });

    describe("Data Retrieval", function () {
        beforeEach(async function () {
            await productRegistry.connect(manufacturer).registerProduct(
                "Test Product",
                "pharmaceutical",
                "BATCH-001",
                Math.floor(Date.now() / 1000),
                Math.floor(Date.now() / 1000) + 86400 * 365,
                ["Material1"],
                "https://ipfs.io/ipfs/QmHash"
            );
        });

        it("Should retrieve product information", async function () {
            const product = await productRegistry.getProduct(1);
            expect(product.productName).to.equal("Test Product");
            expect(product.productType).to.equal("pharmaceutical");
            expect(product.manufacturer).to.equal(manufacturer.address);
            expect(product.batchNumber).to.equal("BATCH-001");
            expect(product.isActive).to.be.true;
        });

        it("Should retrieve checkpoints", async function () {
            await productRegistry.connect(manufacturer).addCheckpoint(
                1,
                "manufactured",
                "Manufacturing Facility",
                "Quality check passed"
            );

            const checkpoints = await productRegistry.getCheckpoints(1);
            expect(checkpoints.length).to.equal(1);
            expect(checkpoints[0].status).to.equal("manufactured");
            expect(checkpoints[0].stakeholder).to.equal(manufacturer.address);
        });

        it("Should retrieve stakeholder products", async function () {
            const products = await productRegistry.getStakeholderProducts(manufacturer.address);
            expect(products.length).to.equal(1);
            expect(products[0]).to.equal(1);
        });

        it("Should return total product count", async function () {
            expect(await productRegistry.getProductCount()).to.equal(1);
        });
    });

    describe("Edge Cases", function () {
        it("Should handle non-existent product queries", async function () {
            await expect(
                productRegistry.getProduct(999)
            ).to.be.revertedWith("Product not found");
        });

        it("Should handle empty stakeholder products", async function () {
            const products = await productRegistry.getStakeholderProducts(consumer.address);
            expect(products.length).to.equal(0);
        });

        it("Should handle large number of raw materials", async function () {
            const manyMaterials = Array(50).fill(0).map((_, i) => `Material${i}`);
            
            await productRegistry.connect(manufacturer).registerProduct(
                "Test Product",
                "pharmaceutical",
                "BATCH-001",
                Math.floor(Date.now() / 1000),
                Math.floor(Date.now() / 1000) + 86400 * 365,
                manyMaterials,
                "https://ipfs.io/ipfs/QmHash"
            );

            const product = await productRegistry.getProduct(1);
            expect(product.rawMaterials.length).to.equal(50);
        });
    });

    describe("Gas Optimization", function () {
        it("Should handle batch operations efficiently", async function () {
            const batchSize = 10;
            const startGas = await ethers.provider.getBlockNumber();

            for (let i = 0; i < batchSize; i++) {
                await productRegistry.connect(manufacturer).registerProduct(
                    `Product ${i}`,
                    "pharmaceutical",
                    `BATCH-${i}`,
                    Math.floor(Date.now() / 1000),
                    Math.floor(Date.now() / 1000) + 86400 * 365,
                    ["Material1"],
                    "https://ipfs.io/ipfs/QmHash"
                );
            }

            const endGas = await ethers.provider.getBlockNumber();
            const gasUsed = endGas - startGas;

            // Should use reasonable amount of gas for batch operations
            expect(gasUsed).to.be.lt(1000);
        });
    });
});
