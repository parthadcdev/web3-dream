const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ProductRegistry", function () {
  let productRegistry;
  let owner, manufacturer, distributor, retailer;

  beforeEach(async function () {
    [owner, manufacturer, distributor, retailer] = await ethers.getSigners();
    
    const ProductRegistry = await ethers.getContractFactory("ProductRegistry");
    productRegistry = await ProductRegistry.deploy();
    await productRegistry.deployed();
  });

  describe("Product Registration", function () {
    it("Should register a product successfully", async function () {
      const rawMaterials = ["Material1", "Material2"];
      const metadataURI = "https://ipfs.io/ipfs/QmHash";
      
      const tx = await productRegistry.connect(manufacturer).registerProduct(
        "Test Product",
        "pharmaceutical",
        "BATCH001",
        Math.floor(Date.now() / 1000),
        Math.floor(Date.now() / 1000) + 86400 * 365, // 1 year
        rawMaterials,
        metadataURI
      );

      await expect(tx)
        .to.emit(productRegistry, "ProductRegistered")
        .withArgs(1, "Test Product", manufacturer.address, "BATCH001");

      const product = await productRegistry.getProduct(1);
      expect(product.productName).to.equal("Test Product");
      expect(product.manufacturer).to.equal(manufacturer.address);
      expect(product.batchNumber).to.equal("BATCH001");
      expect(product.isActive).to.be.true;
    });

    it("Should prevent duplicate batch numbers", async function () {
      const rawMaterials = ["Material1"];
      const metadataURI = "https://ipfs.io/ipfs/QmHash";
      
      // Register first product
      await productRegistry.connect(manufacturer).registerProduct(
        "Product 1",
        "pharmaceutical",
        "BATCH001",
        Math.floor(Date.now() / 1000),
        Math.floor(Date.now() / 1000) + 86400 * 365,
        rawMaterials,
        metadataURI
      );

      // Try to register second product with same batch number
      await expect(
        productRegistry.connect(manufacturer).registerProduct(
          "Product 2",
          "pharmaceutical",
          "BATCH001", // Same batch number
          Math.floor(Date.now() / 1000),
          Math.floor(Date.now() / 1000) + 86400 * 365,
          rawMaterials,
          metadataURI
        )
      ).to.be.revertedWith("Batch number already exists");
    });

    it("Should prevent invalid expiry date", async function () {
      const rawMaterials = ["Material1"];
      const metadataURI = "https://ipfs.io/ipfs/QmHash";
      
      await expect(
        productRegistry.connect(manufacturer).registerProduct(
          "Test Product",
          "pharmaceutical",
          "BATCH001",
          Math.floor(Date.now() / 1000),
          Math.floor(Date.now() / 1000) - 86400, // Expiry in the past
          rawMaterials,
          metadataURI
        )
      ).to.be.revertedWith("Expiry must be after manufacture");
    });
  });

  describe("Checkpoint Management", function () {
    beforeEach(async function () {
      // Register a product first
      const rawMaterials = ["Material1"];
      const metadataURI = "https://ipfs.io/ipfs/QmHash";
      
      await productRegistry.connect(manufacturer).registerProduct(
        "Test Product",
        "pharmaceutical",
        "BATCH001",
        Math.floor(Date.now() / 1000),
        Math.floor(Date.now() / 1000) + 86400 * 365,
        rawMaterials,
        metadataURI
      );
    });

    it("Should add checkpoint by manufacturer", async function () {
      const tx = await productRegistry.connect(manufacturer).addCheckpoint(
        1,
        "shipped",
        "Warehouse A",
        "Temperature: 2-8°C"
      );

      await expect(tx)
        .to.emit(productRegistry, "CheckpointAdded")
        .withArgs(1, 0, manufacturer.address, "shipped");

      const checkpoints = await productRegistry.getCheckpoints(1);
      expect(checkpoints.length).to.equal(2); // 1 initial + 1 added
      expect(checkpoints[1].status).to.equal("shipped");
      expect(checkpoints[1].location).to.equal("Warehouse A");
    });

    it("Should prevent unauthorized checkpoint", async function () {
      await expect(
        productRegistry.connect(retailer).addCheckpoint(
          1,
          "shipped",
          "Warehouse A",
          ""
        )
      ).to.be.revertedWith("Not authorized stakeholder");
    });
  });

  describe("Stakeholder Management", function () {
    beforeEach(async function () {
      // Register a product first
      const rawMaterials = ["Material1"];
      const metadataURI = "https://ipfs.io/ipfs/QmHash";
      
      await productRegistry.connect(manufacturer).registerProduct(
        "Test Product",
        "pharmaceutical",
        "BATCH001",
        Math.floor(Date.now() / 1000),
        Math.floor(Date.now() / 1000) + 86400 * 365,
        rawMaterials,
        metadataURI
      );
    });

    it("Should add stakeholder", async function () {
      const tx = await productRegistry.connect(manufacturer).addStakeholder(1, distributor.address);

      await expect(tx)
        .to.emit(productRegistry, "StakeholderAdded")
        .withArgs(1, distributor.address);

      const product = await productRegistry.getProduct(1);
      expect(product.stakeholders.length).to.equal(2);
      expect(product.stakeholders[1]).to.equal(distributor.address);
    });

    it("Should prevent adding existing stakeholder", async function () {
      // Try to add manufacturer as stakeholder again
      await expect(
        productRegistry.connect(manufacturer).addStakeholder(1, manufacturer.address)
      ).to.be.revertedWith("Stakeholder already exists");
    });

    it("Should prevent unauthorized stakeholder addition", async function () {
      await expect(
        productRegistry.connect(retailer).addStakeholder(1, distributor.address)
      ).to.be.revertedWith("Not authorized stakeholder");
    });
  });

  describe("Access Control", function () {
    beforeEach(async function () {
      // Register a product first
      const rawMaterials = ["Material1"];
      const metadataURI = "https://ipfs.io/ipfs/QmHash";
      
      await productRegistry.connect(manufacturer).registerProduct(
        "Test Product",
        "pharmaceutical",
        "BATCH001",
        Math.floor(Date.now() / 1000),
        Math.floor(Date.now() / 1000) + 86400 * 365,
        rawMaterials,
        metadataURI
      );
    });

    it("Should allow owner to pause contract", async function () {
      await productRegistry.connect(owner).emergencyPause();
      
      await expect(
        productRegistry.connect(manufacturer).registerProduct(
          "Test Product 2",
          "pharmaceutical",
          "BATCH002",
          Math.floor(Date.now() / 1000),
          Math.floor(Date.now() / 1000) + 86400 * 365,
          ["Material1"],
          "https://ipfs.io/ipfs/QmHash"
        )
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should prevent non-owner from pausing", async function () {
      await expect(
        productRegistry.connect(manufacturer).emergencyPause()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow manufacturer to deactivate their product", async function () {
      await productRegistry.connect(manufacturer).deactivateProduct(1);
      
      const product = await productRegistry.getProduct(1);
      expect(product.isActive).to.be.false;
    });

    it("Should prevent non-manufacturer from deactivating product", async function () {
      await expect(
        productRegistry.connect(retailer).deactivateProduct(1)
      ).to.be.revertedWith("Not authorized");
    });
  });

  describe("Data Retrieval", function () {
    beforeEach(async function () {
      // Register a product with stakeholder
      const rawMaterials = ["Material1", "Material2"];
      const metadataURI = "https://ipfs.io/ipfs/QmHash";
      
      await productRegistry.connect(manufacturer).registerProduct(
        "Test Product",
        "pharmaceutical",
        "BATCH001",
        Math.floor(Date.now() / 1000),
        Math.floor(Date.now() / 1000) + 86400 * 365,
        rawMaterials,
        metadataURI
      );

      await productRegistry.connect(manufacturer).addStakeholder(1, distributor.address);
      await productRegistry.connect(manufacturer).addCheckpoint(1, "shipped", "Warehouse A", "");
    });

    it("Should retrieve product information", async function () {
      const product = await productRegistry.getProduct(1);
      
      expect(product.productName).to.equal("Test Product");
      expect(product.productType).to.equal("pharmaceutical");
      expect(product.batchNumber).to.equal("BATCH001");
      expect(product.stakeholders.length).to.equal(2);
      expect(product.rawMaterials.length).to.equal(2);
    });

    it("Should retrieve checkpoints", async function () {
      const checkpoints = await productRegistry.getCheckpoints(1);
      
      expect(checkpoints.length).to.equal(2); // 1 initial + 1 added
      expect(checkpoints[0].status).to.equal("manufactured");
      expect(checkpoints[1].status).to.equal("shipped");
    });

    it("Should retrieve stakeholder products", async function () {
      const manufacturerProducts = await productRegistry.getStakeholderProducts(manufacturer.address);
      const distributorProducts = await productRegistry.getStakeholderProducts(distributor.address);
      
      expect(manufacturerProducts.length).to.equal(1);
      expect(distributorProducts.length).to.equal(1);
      expect(manufacturerProducts[0]).to.equal(1);
      expect(distributorProducts[0]).to.equal(1);
    });

    it("Should return total product count", async function () {
      const totalProducts = await productRegistry.getProductCount();
      expect(totalProducts).to.equal(1);
    });
  });
});
