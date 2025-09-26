const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ProductRegistry Basic CRUD Tests", function () {
    let productRegistry;
    let owner, manufacturer, distributor, retailer;

    beforeEach(async function () {
        [owner, manufacturer, distributor, retailer] = await ethers.getSigners();

        // Deploy a simplified ProductRegistry for testing
        const ProductRegistry = await ethers.getContractFactory("ProductRegistry");
        productRegistry = await ProductRegistry.deploy();
        await productRegistry.deployed();
    });

    describe("Contract Deployment", function () {
        it("Should deploy successfully", async function () {
            expect(productRegistry.address).to.not.equal(ethers.constants.AddressZero);
        });

        it("Should have correct initial state", async function () {
            expect(await productRegistry.owner()).to.equal(owner.address);
            expect(await productRegistry.totalProducts()).to.equal(0);
            expect(await productRegistry.nextProductId()).to.equal(1);
        });
    });

    describe("Product Registration (CREATE)", function () {
        it("Should register a new product successfully", async function () {
            const productName = "Test Product";
            const productType = "pharmaceutical";
            const batchNumber = "BATCH-001";
            const manufactureDate = Math.floor(Date.now() / 1000);
            const expiryDate = manufactureDate + 86400 * 365; // 1 year
            const rawMaterials = ["Material1", "Material2"];
            const metadataURI = "https://ipfs.io/test";

            const tx = await productRegistry.connect(manufacturer).registerProduct(
                productName,
                productType,
                batchNumber,
                manufactureDate,
                expiryDate,
                rawMaterials,
                metadataURI
            );

            // Check event emission
            await expect(tx)
                .to.emit(productRegistry, "ProductRegistered")
                .withArgs(1, productName, manufacturer.address, batchNumber);

            // Check product data
            const product = await productRegistry.getProduct(1);
            expect(product.productName).to.equal(productName);
            expect(product.productType).to.equal(productType);
            expect(product.manufacturer).to.equal(manufacturer.address);
            expect(product.batchNumber).to.equal(batchNumber);
            expect(product.isActive).to.be.true;

            // Check counters
            expect(await productRegistry.totalProducts()).to.equal(1);
            expect(await productRegistry.nextProductId()).to.equal(2);
        });

        it("Should prevent duplicate batch numbers", async function () {
            const batchNumber = "DUPLICATE-001";
            
            // Register first product
            await productRegistry.connect(manufacturer).registerProduct(
                "Product 1", "pharmaceutical", batchNumber,
                Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000) + 86400 * 365,
                ["Material1"], "https://ipfs.io/1"
            );

            // Try to register second product with same batch number
            await expect(
                productRegistry.connect(manufacturer).registerProduct(
                    "Product 2", "pharmaceutical", batchNumber,
                    Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000) + 86400 * 365,
                    ["Material2"], "https://ipfs.io/2"
                )
            ).to.be.revertedWith("Batch number already exists");
        });

        it("Should prevent registration with empty product name", async function () {
            await expect(
                productRegistry.connect(manufacturer).registerProduct(
                    "", "pharmaceutical", "BATCH-001",
                    Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000) + 86400 * 365,
                    ["Material"], "https://ipfs.io/hash"
                )
            ).to.be.revertedWith("Product name required");
        });
    });

    describe("Product Retrieval (READ)", function () {
        beforeEach(async function () {
            // Register a test product
            await productRegistry.connect(manufacturer).registerProduct(
                "Test Product",
                "pharmaceutical",
                "TEST-001",
                Math.floor(Date.now() / 1000),
                Math.floor(Date.now() / 1000) + 86400 * 365,
                ["Material1", "Material2"],
                "https://ipfs.io/test"
            );
        });

        it("Should retrieve product by ID", async function () {
            const product = await productRegistry.getProduct(1);
            
            expect(product.productId).to.equal(1);
            expect(product.productName).to.equal("Test Product");
            expect(product.productType).to.equal("pharmaceutical");
            expect(product.manufacturer).to.equal(manufacturer.address);
            expect(product.batchNumber).to.equal("TEST-001");
            expect(product.isActive).to.be.true;
        });

        it("Should retrieve product by batch number", async function () {
            const productId = await productRegistry.getProductIdByBatch("TEST-001");
            expect(productId).to.equal(1);
        });

        it("Should return 0 for non-existent product", async function () {
            const productId = await productRegistry.getProductIdByBatch("NON-EXISTENT");
            expect(productId).to.equal(0);
        });

        it("Should retrieve products by stakeholder", async function () {
            const productIds = await productRegistry.getProductsByStakeholder(manufacturer.address);
            expect(productIds.length).to.equal(1);
            expect(productIds[0]).to.equal(1);
        });

        it("Should return correct total products count", async function () {
            expect(await productRegistry.totalProducts()).to.equal(1);
        });
    });

    describe("Product Updates (UPDATE)", function () {
        beforeEach(async function () {
            // Register a test product
            await productRegistry.connect(manufacturer).registerProduct(
                "Original Product",
                "pharmaceutical",
                "UPDATE-001",
                Math.floor(Date.now() / 1000),
                Math.floor(Date.now() / 1000) + 86400 * 365,
                ["Material1"],
                "https://ipfs.io/original"
            );
        });

        it("Should update product metadata URI", async function () {
            const newMetadataURI = "https://ipfs.io/ipfs/QmNewHash";
            
            await productRegistry.connect(manufacturer).updateProductMetadata(1, newMetadataURI);
            
            const product = await productRegistry.getProduct(1);
            expect(product.metadataURI).to.equal(newMetadataURI);
        });

        it("Should prevent non-stakeholder from updating metadata", async function () {
            await expect(
                productRegistry.connect(retailer).updateProductMetadata(1, "https://ipfs.io/hack")
            ).to.be.revertedWith("Not authorized stakeholder");
        });

        it("Should add new stakeholders", async function () {
            await productRegistry.connect(manufacturer).addStakeholder(1, distributor.address);
            
            const product = await productRegistry.getProduct(1);
            expect(product.stakeholders).to.include(distributor.address);
        });

        it("Should prevent duplicate stakeholder addition", async function () {
            // Add distributor as stakeholder
            await productRegistry.connect(manufacturer).addStakeholder(1, distributor.address);
            
            // Try to add same stakeholder again
            await expect(
                productRegistry.connect(manufacturer).addStakeholder(1, distributor.address)
            ).to.be.revertedWith("Stakeholder already exists");
        });
    });

    describe("Product Deactivation (DELETE)", function () {
        beforeEach(async function () {
            // Register a test product
            await productRegistry.connect(manufacturer).registerProduct(
                "Deactivation Test",
                "pharmaceutical",
                "DEACT-001",
                Math.floor(Date.now() / 1000),
                Math.floor(Date.now() / 1000) + 86400 * 365,
                ["Material1"],
                "https://ipfs.io/deact"
            );
        });

        it("Should deactivate product", async function () {
            await productRegistry.connect(manufacturer).deactivateProduct(1);
            
            const product = await productRegistry.getProduct(1);
            expect(product.isActive).to.be.false;
        });

        it("Should prevent non-stakeholder from deactivating product", async function () {
            await expect(
                productRegistry.connect(retailer).deactivateProduct(1)
            ).to.be.revertedWith("Not authorized stakeholder");
        });

        it("Should emit ProductDeactivated event", async function () {
            await expect(productRegistry.connect(manufacturer).deactivateProduct(1))
                .to.emit(productRegistry, "ProductDeactivated")
                .withArgs(1, manufacturer.address);
        });
    });

    describe("Checkpoint Operations", function () {
        beforeEach(async function () {
            // Register a test product
            await productRegistry.connect(manufacturer).registerProduct(
                "Checkpoint Test",
                "pharmaceutical",
                "CHECK-001",
                Math.floor(Date.now() / 1000),
                Math.floor(Date.now() / 1000) + 86400 * 365,
                ["Material1"],
                "https://ipfs.io/check"
            );
        });

        it("Should add checkpoint successfully", async function () {
            const tx = await productRegistry.connect(manufacturer).addCheckpoint(
                1,
                "manufactured",
                "Manufacturing Facility A",
                "Quality control passed"
            );

            await expect(tx)
                .to.emit(productRegistry, "CheckpointAdded")
                .withArgs(1, 1, manufacturer.address, "manufactured");

            const checkpoints = await productRegistry.getCheckpoints(1);
            expect(checkpoints.length).to.equal(2); // Initial checkpoint + new one
            expect(checkpoints[1].status).to.equal("manufactured");
            expect(checkpoints[1].location).to.equal("Manufacturing Facility A");
        });

        it("Should prevent non-stakeholder from adding checkpoint", async function () {
            await expect(
                productRegistry.connect(retailer).addCheckpoint(
                    1, "shipped", "Location", "Data"
                )
            ).to.be.revertedWith("Not authorized stakeholder");
        });

        it("Should retrieve checkpoints", async function () {
            // Add multiple checkpoints
            await productRegistry.connect(manufacturer).addCheckpoint(
                1, "manufactured", "Facility A", "Data 1"
            );
            await productRegistry.connect(manufacturer).addCheckpoint(
                1, "packaged", "Facility B", "Data 2"
            );

            const checkpoints = await productRegistry.getCheckpoints(1);
            expect(checkpoints.length).to.equal(3); // Initial + 2 added
            expect(checkpoints[1].status).to.equal("manufactured");
            expect(checkpoints[2].status).to.equal("packaged");
        });

        it("Should retrieve latest checkpoint", async function () {
            await productRegistry.connect(manufacturer).addCheckpoint(
                1, "manufactured", "Facility A", "Data 1"
            );
            await productRegistry.connect(manufacturer).addCheckpoint(
                1, "packaged", "Facility B", "Data 2"
            );

            const latestCheckpoint = await productRegistry.getLatestCheckpoint(1);
            expect(latestCheckpoint.status).to.equal("packaged");
        });
    });

    describe("Access Control", function () {
        beforeEach(async function () {
            // Register a test product
            await productRegistry.connect(manufacturer).registerProduct(
                "Access Test",
                "pharmaceutical",
                "ACCESS-001",
                Math.floor(Date.now() / 1000),
                Math.floor(Date.now() / 1000) + 86400 * 365,
                ["Material1"],
                "https://ipfs.io/access"
            );
        });

        it("Should allow only owner to pause contract", async function () {
            await expect(productRegistry.connect(manufacturer).emergencyPause())
                .to.be.revertedWith("Ownable: caller is not the owner");
            
            await productRegistry.connect(owner).emergencyPause();
            expect(await productRegistry.paused()).to.be.true;
        });

        it("Should prevent operations when paused", async function () {
            await productRegistry.connect(owner).emergencyPause();
            
            await expect(
                productRegistry.connect(manufacturer).registerProduct(
                    "Paused Test", "pharmaceutical", "PAUSED-001",
                    Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000) + 86400 * 365,
                    ["Material"], "https://ipfs.io/paused"
                )
            ).to.be.revertedWith("Pausable: paused");
        });

        it("Should allow owner to unpause contract", async function () {
            await productRegistry.connect(owner).emergencyPause();
            await productRegistry.connect(owner).emergencyUnpause();
            expect(await productRegistry.paused()).to.be.false;
        });
    });

    describe("Edge Cases", function () {
        it("Should handle empty raw materials array", async function () {
            await expect(
                productRegistry.connect(manufacturer).registerProduct(
                    "Test Product", "pharmaceutical", "EMPTY-001",
                    Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000) + 86400 * 365,
                    [], "https://ipfs.io/hash"
                )
            ).to.be.revertedWith("Raw materials required");
        });

        it("Should handle invalid product ID", async function () {
            await expect(
                productRegistry.getProduct(999)
            ).to.be.revertedWith("Product does not exist");
        });

        it("Should handle checkpoint operations on non-existent product", async function () {
            await expect(
                productRegistry.connect(manufacturer).addCheckpoint(
                    999, "status", "location", "data"
                )
            ).to.be.revertedWith("Product does not exist");
        });
    });
});
