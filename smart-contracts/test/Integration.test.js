const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("TraceChain Integration Tests", function () {
    let traceToken, productRegistry, nftCertificate, complianceContract, paymentContract;
    let rewardsDistributor, accessControl;
    let owner, manufacturer, distributor, retailer, consumer, auditor;

    beforeEach(async function () {
        [owner, manufacturer, distributor, retailer, consumer, auditor] = await ethers.getSigners();

        // Deploy Access Control
        const TraceAccessControl = await ethers.getContractFactory("TraceAccessControl");
        accessControl = await TraceAccessControl.deploy();
        await accessControl.deployed();

        // Deploy TRACE Token
        const TraceToken = await ethers.getContractFactory("TraceToken");
        traceToken = await TraceToken.deploy();
        await traceToken.deployed();

        // Deploy Rewards Distributor
        const RewardsDistributor = await ethers.getContractFactory("RewardsDistributor");
        const mockPriceFeed = "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0";
        rewardsDistributor = await RewardsDistributor.deploy(traceToken.address, mockPriceFeed);
        await rewardsDistributor.deployed();

        // Deploy Product Registry
        const ProductRegistry = await ethers.getContractFactory("ProductRegistry");
        productRegistry = await ProductRegistry.deploy();
        await productRegistry.deployed();

        // Deploy NFT Certificate
        const NFTCertificate = await ethers.getContractFactory("NFTCertificate");
        nftCertificate = await NFTCertificate.deploy(productRegistry.address);
        await nftCertificate.deployed();

        // Deploy Compliance Contract
        const ComplianceContract = await ethers.getContractFactory("ComplianceContract");
        complianceContract = await ComplianceContract.deploy(
            productRegistry.address,
            nftCertificate.address,
            traceToken.address
        );
        await complianceContract.deployed();

        // Deploy Payment Contract
        const PaymentContract = await ethers.getContractFactory("PaymentContract");
        const usdcAddress = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"; // Mock USDC
        paymentContract = await PaymentContract.deploy(usdcAddress, traceToken.address, owner.address);
        await paymentContract.deployed();

        // Configure contracts
        await traceToken.setDistributor(rewardsDistributor.address, true);
        await accessControl.grantRole(await accessControl.REWARDS_ROLE(), rewardsDistributor.address);
        await accessControl.grantRole(await accessControl.COMPLIANCE_ROLE(), complianceContract.address);
        await accessControl.grantRole(await accessControl.PAYMENT_ROLE(), paymentContract.address);
    });

    describe("End-to-End Product Traceability Flow", function () {
        it("Should complete full product lifecycle", async function () {
            // 1. Register Product
            const productName = "Organic Cotton T-Shirt";
            const productType = "clothing";
            const batchNumber = "BATCH-2024-001";
            const manufactureDate = Math.floor(Date.now() / 1000);
            const expiryDate = Math.floor(Date.now() / 1000) + 86400 * 365;
            const rawMaterials = ["Organic Cotton", "Natural Dyes", "Recycled Packaging"];
            const metadataURI = "https://ipfs.io/ipfs/QmProductHash";

            const registerTx = await productRegistry.connect(manufacturer).registerProduct(
                productName,
                productType,
                batchNumber,
                manufactureDate,
                expiryDate,
                rawMaterials,
                metadataURI
            );

            await expect(registerTx)
                .to.emit(productRegistry, "ProductRegistered")
                .withArgs(1, productName, manufacturer.address, batchNumber);

            // 2. Add Stakeholders
            await productRegistry.connect(manufacturer).addStakeholder(1, distributor.address);
            await productRegistry.connect(manufacturer).addStakeholder(1, retailer.address);

            // 3. Add Checkpoints
            await productRegistry.connect(manufacturer).addCheckpoint(
                1,
                "manufactured",
                "Eco-Friendly Manufacturing Facility",
                "Temperature: 22°C, Humidity: 45%"
            );

            await productRegistry.connect(distributor).addCheckpoint(
                1,
                "shipped",
                "Distribution Center A",
                "Shipped to retailer via eco-friendly transport"
            );

            await productRegistry.connect(retailer).addCheckpoint(
                1,
                "received",
                "Retail Store Downtown",
                "Product received and stored in eco-friendly conditions"
            );

            // 4. Mint Certificate
            const tokenURI = "https://ipfs.io/ipfs/QmCertificateHash";
            const verificationCode = "VERIFY-" + Date.now();

            const mintTx = await nftCertificate.mintCertificate(
                manufacturer.address,
                1,
                "authenticity",
                expiryDate,
                "TraceChain Certification Authority",
                "GOTS, Fair Trade",
                tokenURI,
                verificationCode
            );

            await expect(mintTx)
                .to.emit(nftCertificate, "CertificateMinted")
                .withArgs(1, 1, "authenticity", manufacturer.address);

            // 5. Verify Certificate
            const verification = await nftCertificate.verifyCertificate(1);
            expect(verification[0]).to.be.true; // Valid
            expect(verification[1]).to.equal("Certificate is valid");

            // 6. Add Compliance Rules
            await complianceContract.addComplianceRule(
                "ORGANIC_001",
                "Organic Material Verification",
                "clothing",
                "Must contain at least 95% organic materials",
                "GOTS",
                4
            );

            // 7. Perform Compliance Check
            await complianceContract.checkCompliance(
                1,
                "ORGANIC_001",
                true,
                "Laboratory test results confirm 98% organic cotton content",
                95,
                "Tested by certified laboratory"
            );

            // 8. Distribute Rewards
            const rewardAmount = ethers.utils.parseEther("100");
            await traceToken.connect(rewardsDistributor).distributeReward(
                manufacturer.address,
                rewardAmount,
                "first_trace"
            );

            // 9. Verify Final State
            const product = await productRegistry.getProduct(1);
            expect(product.productName).to.equal(productName);
            expect(product.stakeholders.length).to.equal(3); // manufacturer, distributor, retailer

            const checkpoints = await productRegistry.getCheckpoints(1);
            expect(checkpoints.length).to.equal(3);

            const certificate = await nftCertificate.getCertificate(1);
            expect(certificate.productId).to.equal(1);
            expect(certificate.certificateType).to.equal("authenticity");

            const manufacturerBalance = await traceToken.balanceOf(manufacturer.address);
            expect(manufacturerBalance).to.be.gt(0);
        });
    });

    describe("Multi-Contract Interactions", function () {
        beforeEach(async function () {
            // Register a product first
            await productRegistry.connect(manufacturer).registerProduct(
                "Test Product",
                "pharmaceutical",
                "BATCH-001",
                Math.floor(Date.now() / 1000),
                Math.floor(Date.now() / 1000) + 86400 * 365,
                ["Active Ingredient"],
                "https://ipfs.io/ipfs/QmHash"
            );
        });

        it("Should handle payment with product traceability", async function () {
            // Create payment for product
            const paymentAmount = ethers.utils.parseEther("1000");
            const dueDate = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days
            const conditions = "Payment upon successful delivery and quality verification";

            // Note: This would require USDC tokens, so we'll test the contract logic
            const paymentId = await paymentContract.createEscrowPayment.call(
                retailer.address,
                paymentAmount,
                1, // productId
                dueDate,
                conditions,
                "Payment for traced product"
            );

            expect(paymentId).to.be.gt(0);
        });

        it("Should handle compliance with rewards", async function () {
            // Add compliance rule
            await complianceContract.addComplianceRule(
                "FDA_001",
                "FDA Manufacturing Standards",
                "pharmaceutical",
                "Manufacturing facility must be FDA approved",
                "FDA",
                5
            );

            // Perform compliance check
            await complianceContract.checkCompliance(
                1,
                "FDA_001",
                true,
                "FDA inspection certificate #12345",
                100,
                "Passed FDA inspection"
            );

            // Distribute compliance reward
            const rewardAmount = ethers.utils.parseEther("50");
            await traceToken.connect(rewardsDistributor).distributeReward(
                manufacturer.address,
                rewardAmount,
                "compliance_check"
            );

            const balance = await traceToken.balanceOf(manufacturer.address);
            expect(balance).to.equal(rewardAmount);
        });

        it("Should handle certificate verification with product lookup", async function () {
            // Mint certificate
            await nftCertificate.mintCertificate(
                manufacturer.address,
                1,
                "quality",
                Math.floor(Date.now() / 1000) + 86400 * 365,
                "Quality Assurance Authority",
                "ISO 9001",
                "https://ipfs.io/ipfs/QmCert",
                "QUALITY-001"
            );

            // Verify certificate
            const verification = await nftCertificate.verifyCertificate(1);
            expect(verification[0]).to.be.true;

            // Get product info from certificate
            const certificate = await nftCertificate.getCertificate(1);
            const product = await productRegistry.getProduct(certificate.productId);
            expect(product.productName).to.equal("Test Product");
        });
    });

    describe("Error Handling and Edge Cases", function () {
        it("Should handle contract pauses gracefully", async function () {
            // Pause access control
            await accessControl.emergencyPause();

            // Try to register product (should fail)
            await expect(
                productRegistry.connect(manufacturer).registerProduct(
                    "Test Product",
                    "pharmaceutical",
                    "BATCH-001",
                    Math.floor(Date.now() / 1000),
                    Math.floor(Date.now() / 1000) + 86400 * 365,
                    ["Material"],
                    "https://ipfs.io/ipfs/QmHash"
                )
            ).to.be.revertedWith("Pausable: paused");
        });

        it("Should handle invalid product references", async function () {
            // Try to mint certificate for non-existent product
            await expect(
                nftCertificate.mintCertificate(
                    manufacturer.address,
                    999, // Non-existent product
                    "authenticity",
                    Math.floor(Date.now() / 1000) + 86400 * 365,
                    "Issuer",
                    "Standard",
                    "https://ipfs.io/ipfs/QmHash",
                    "VERIFY-001"
                )
            ).to.be.revertedWith("Only product registry");
        });

        it("Should handle expired certificates", async function () {
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

            // Mint certificate with past expiry
            const pastExpiry = Math.floor(Date.now() / 1000) - 86400; // Yesterday
            await nftCertificate.mintCertificate(
                manufacturer.address,
                1,
                "authenticity",
                pastExpiry,
                "Issuer",
                "Standard",
                "https://ipfs.io/ipfs/QmHash",
                "VERIFY-001"
            );

            // Verify certificate (should be expired)
            const verification = await nftCertificate.verifyCertificate(1);
            expect(verification[0]).to.be.false;
            expect(verification[1]).to.equal("Certificate has expired");
        });
    });

    describe("Performance and Gas Optimization", function () {
        it("Should handle large batch operations efficiently", async function () {
            const batchSize = 20;
            const startTime = Date.now();

            // Register multiple products
            for (let i = 0; i < batchSize; i++) {
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
            expect(duration).to.be.lt(30000); // 30 seconds

            const productCount = await productRegistry.getProductCount();
            expect(productCount).to.equal(batchSize);
        });

        it("Should handle complex stakeholder networks", async function () {
            // Register product
            await productRegistry.connect(manufacturer).registerProduct(
                "Complex Product",
                "pharmaceutical",
                "BATCH-001",
                Math.floor(Date.now() / 1000),
                Math.floor(Date.now() / 1000) + 86400 * 365,
                ["Material"],
                "https://ipfs.io/ipfs/QmHash"
            );

            // Add many stakeholders
            const stakeholders = [distributor, retailer, consumer, auditor];
            for (let i = 0; i < stakeholders.length; i++) {
                await productRegistry.connect(manufacturer).addStakeholder(1, stakeholders[i].address);
            }

            // Each stakeholder adds checkpoints
            for (let i = 0; i < stakeholders.length; i++) {
                await productRegistry.connect(stakeholders[i]).addCheckpoint(
                    1,
                    `status_${i}`,
                    `location_${i}`,
                    `data_${i}`
                );
            }

            const product = await productRegistry.getProduct(1);
            expect(product.stakeholders.length).to.equal(stakeholders.length + 1); // +1 for manufacturer

            const checkpoints = await productRegistry.getCheckpoints(1);
            expect(checkpoints.length).to.equal(stakeholders.length + 1); // +1 for initial checkpoint
        });
    });

    describe("Security and Access Control", function () {
        it("Should enforce proper access controls across contracts", async function () {
            // Try to distribute rewards without authorization
            await expect(
                traceToken.connect(manufacturer).distributeReward(
                    distributor.address,
                    ethers.utils.parseEther("100"),
                    "test"
                )
            ).to.be.revertedWith("Not authorized distributor");

            // Try to add compliance rule without authorization
            await expect(
                complianceContract.connect(manufacturer).addComplianceRule(
                    "TEST_001",
                    "Test Rule",
                    "pharmaceutical",
                    "Test requirement",
                    "TEST",
                    1
                )
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should handle role-based permissions correctly", async function () {
            // Grant compliance role to auditor
            await accessControl.grantRole(await accessControl.COMPLIANCE_ROLE(), auditor.address);

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

            // Add compliance rule
            await complianceContract.addComplianceRule(
                "AUDIT_001",
                "Audit Requirement",
                "pharmaceutical",
                "Must pass audit",
                "AUDIT",
                3
            );

            // Auditor can perform compliance check
            await complianceContract.connect(auditor).checkCompliance(
                1,
                "AUDIT_001",
                true,
                "Audit passed",
                100,
                "Audit completed successfully"
            );

            // Verify compliance was recorded
            const compliance = await complianceContract.getProductCompliance(1);
            expect(compliance.isCompliant).to.be.true;
        });
    });
});
