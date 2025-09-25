const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🚀 Starting TraceChain Core Contracts Deployment...\n");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", ethers.utils.formatEther(await deployer.getBalance()), "ETH\n");

    const deploymentInfo = {
        network: hre.network.name,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: {}
    };

    try {
        // 1. Deploy Access Control System
        console.log("📋 Deploying Access Control System...");
        const TraceAccessControl = await ethers.getContractFactory("TraceAccessControl");
        const accessControl = await TraceAccessControl.deploy();
        await accessControl.deployed();
        console.log("✅ TraceAccessControl deployed to:", accessControl.address);
        deploymentInfo.contracts.TraceAccessControl = accessControl.address;

        // 2. Deploy TRACE Token
        console.log("\n🪙 Deploying TRACE Token...");
        const TraceToken = await ethers.getContractFactory("TraceToken");
        const traceToken = await TraceToken.deploy();
        await traceToken.deployed();
        console.log("✅ TraceToken deployed to:", traceToken.address);
        deploymentInfo.contracts.TraceToken = traceToken.address;

        // 3. Deploy Rewards Distributor
        console.log("\n🎁 Deploying Rewards Distributor...");
        const RewardsDistributor = await ethers.getContractFactory("RewardsDistributor");
        const priceFeedAddress = "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0"; // MATIC/USD on Polygon
        const rewardsDistributor = await RewardsDistributor.deploy(traceToken.address, priceFeedAddress);
        await rewardsDistributor.deployed();
        console.log("✅ RewardsDistributor deployed to:", rewardsDistributor.address);
        deploymentInfo.contracts.RewardsDistributor = rewardsDistributor.address;

        // 4. Deploy Product Registry
        console.log("\n📦 Deploying Product Registry...");
        const ProductRegistry = await ethers.getContractFactory("ProductRegistry");
        const productRegistry = await ProductRegistry.deploy();
        await productRegistry.deployed();
        console.log("✅ ProductRegistry deployed to:", productRegistry.address);
        deploymentInfo.contracts.ProductRegistry = productRegistry.address;

        // 5. Deploy NFT Certificate
        console.log("\n🏆 Deploying NFT Certificate...");
        const NFTCertificate = await ethers.getContractFactory("NFTCertificate");
        const nftCertificate = await NFTCertificate.deploy(productRegistry.address);
        await nftCertificate.deployed();
        console.log("✅ NFTCertificate deployed to:", nftCertificate.address);
        deploymentInfo.contracts.NFTCertificate = nftCertificate.address;

        // 6. Deploy Compliance Contract
        console.log("\n✅ Deploying Compliance Contract...");
        const ComplianceContract = await ethers.getContractFactory("ComplianceContract");
        const complianceContract = await ComplianceContract.deploy(
            productRegistry.address,
            nftCertificate.address,
            traceToken.address
        );
        await complianceContract.deployed();
        console.log("✅ ComplianceContract deployed to:", complianceContract.address);
        deploymentInfo.contracts.ComplianceContract = complianceContract.address;

        // 7. Deploy Payment Contract
        console.log("\n💳 Deploying Payment Contract...");
        const PaymentContract = await ethers.getContractFactory("PaymentContract");
        // Using USDC address on Polygon (replace with actual USDC address)
        const usdcAddress = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
        const paymentContract = await PaymentContract.deploy(usdcAddress, traceToken.address, deployer.address);
        await paymentContract.deployed();
        console.log("✅ PaymentContract deployed to:", paymentContract.address);
        deploymentInfo.contracts.PaymentContract = paymentContract.address;

        // 8. Deploy Factory Contracts
        console.log("\n🏭 Deploying Factory Contracts...");
        
        const ProductFactory = await ethers.getContractFactory("ProductFactory");
        const productFactory = await ProductFactory.deploy();
        await productFactory.deployed();
        console.log("✅ ProductFactory deployed to:", productFactory.address);
        deploymentInfo.contracts.ProductFactory = productFactory.address;

        const NFTFactory = await ethers.getContractFactory("NFTFactory");
        const nftFactory = await NFTFactory.deploy();
        await nftFactory.deployed();
        console.log("✅ NFTFactory deployed to:", nftFactory.address);
        deploymentInfo.contracts.NFTFactory = nftFactory.address;

        const ComplianceFactory = await ethers.getContractFactory("ComplianceFactory");
        const complianceFactory = await ComplianceFactory.deploy();
        await complianceFactory.deployed();
        console.log("✅ ComplianceFactory deployed to:", complianceFactory.address);
        deploymentInfo.contracts.ComplianceFactory = complianceFactory.address;

        // 9. Configure Contracts
        console.log("\n⚙️  Configuring Contracts...");
        
        // Authorize rewards distributor to distribute tokens
        await traceToken.setDistributor(rewardsDistributor.address, true);
        console.log("✅ Authorized RewardsDistributor to distribute tokens");

        // Set up access control roles
        await accessControl.grantRole(await accessControl.REWARDS_ROLE(), rewardsDistributor.address);
        await accessControl.grantRole(await accessControl.COMPLIANCE_ROLE(), complianceContract.address);
        await accessControl.grantRole(await accessControl.PAYMENT_ROLE(), paymentContract.address);
        await accessControl.grantRole(await accessControl.FACTORY_ROLE(), productFactory.address);
        await accessControl.grantRole(await accessControl.FACTORY_ROLE(), nftFactory.address);
        await accessControl.grantRole(await accessControl.FACTORY_ROLE(), complianceFactory.address);
        console.log("✅ Configured access control roles");

        // 10. Initialize with sample data
        console.log("\n🌱 Initializing with sample data...");
        
        // Register a sample product
        const sampleRawMaterials = ["Organic Cotton", "Natural Dyes", "Recycled Packaging"];
        const sampleMetadataURI = "https://ipfs.io/ipfs/QmSampleHash";
        
        const tx = await productRegistry.registerProduct(
            "Sample Organic T-Shirt",
            "clothing",
            "BATCH-2024-001",
            Math.floor(Date.now() / 1000),
            Math.floor(Date.now() / 1000) + 86400 * 365, // 1 year
            sampleRawMaterials,
            sampleMetadataURI
        );
        await tx.wait();
        console.log("✅ Registered sample product");

        // Add a sample checkpoint
        await productRegistry.addCheckpoint(
            1,
            "manufactured",
            "Eco-Friendly Manufacturing Facility",
            "Temperature: 22°C, Humidity: 45%"
        );
        console.log("✅ Added sample checkpoint");

        // Mint a sample certificate
        const sampleTokenURI = "https://ipfs.io/ipfs/QmCertificateHash";
        const sampleVerificationCode = "VERIFY-" + Date.now();
        
        await nftCertificate.mintCertificate(
            deployer.address,
            1,
            "authenticity",
            Math.floor(Date.now() / 1000) + 86400 * 365, // 1 year
            "TraceChain Certification Authority",
            "ISO 9001, GOTS",
            sampleTokenURI,
            sampleVerificationCode
        );
        console.log("✅ Minted sample certificate");

        // Add sample compliance rules
        await complianceContract.addComplianceRule(
            "ORGANIC_001",
            "Organic Material Verification",
            "clothing",
            "Must contain at least 95% organic materials",
            "GOTS",
            4
        );
        console.log("✅ Added sample compliance rule");

        // 11. Verify deployments
        console.log("\n🔍 Verifying deployments...");
        
        const tokenBalance = await traceToken.balanceOf(deployer.address);
        console.log("✅ TRACE Token balance:", ethers.utils.formatEther(tokenBalance), "TRACE");
        
        const productCount = await productRegistry.getProductCount();
        console.log("✅ Total products registered:", productCount.toString());
        
        const certificateCount = await nftCertificate.totalSupply();
        console.log("✅ Total certificates minted:", certificateCount.toString());
        
        const complianceStats = await complianceContract.getComplianceStats();
        console.log("✅ Compliance rules:", complianceStats[0].toString());

        // 12. Save deployment information
        const deploymentPath = path.join(__dirname, "..", "deployments", `${hre.network.name}.json`);
        const deploymentDir = path.dirname(deploymentPath);
        
        if (!fs.existsSync(deploymentDir)) {
            fs.mkdirSync(deploymentDir, { recursive: true });
        }
        
        fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
        console.log(`\n💾 Deployment info saved to: ${deploymentPath}`);

        // 13. Generate verification commands
        console.log("\n🔐 Contract Verification Commands:");
        console.log("npx hardhat verify --network", hre.network.name, accessControl.address);
        console.log("npx hardhat verify --network", hre.network.name, traceToken.address);
        console.log("npx hardhat verify --network", hre.network.name, rewardsDistributor.address, traceToken.address, priceFeedAddress);
        console.log("npx hardhat verify --network", hre.network.name, productRegistry.address);
        console.log("npx hardhat verify --network", hre.network.name, nftCertificate.address, productRegistry.address);
        console.log("npx hardhat verify --network", hre.network.name, complianceContract.address, productRegistry.address, nftCertificate.address, traceToken.address);
        console.log("npx hardhat verify --network", hre.network.name, paymentContract.address, usdcAddress, traceToken.address, deployer.address);
        console.log("npx hardhat verify --network", hre.network.name, productFactory.address);
        console.log("npx hardhat verify --network", hre.network.name, nftFactory.address);
        console.log("npx hardhat verify --network", hre.network.name, complianceFactory.address);

        console.log("\n🎉 TraceChain Core Contracts Deployment Completed Successfully!");
        console.log("\n📊 Deployment Summary:");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("│ Contract                │ Address                                    │");
        console.log("├─────────────────────────┼────────────────────────────────────────────┤");
        console.log(`│ TraceAccessControl      │ ${accessControl.address.padEnd(42)} │`);
        console.log(`│ TraceToken              │ ${traceToken.address.padEnd(42)} │`);
        console.log(`│ RewardsDistributor      │ ${rewardsDistributor.address.padEnd(42)} │`);
        console.log(`│ ProductRegistry         │ ${productRegistry.address.padEnd(42)} │`);
        console.log(`│ NFTCertificate          │ ${nftCertificate.address.padEnd(42)} │`);
        console.log(`│ ComplianceContract      │ ${complianceContract.address.padEnd(42)} │`);
        console.log(`│ PaymentContract         │ ${paymentContract.address.padEnd(42)} │`);
        console.log(`│ ProductFactory          │ ${productFactory.address.padEnd(42)} │`);
        console.log(`│ NFTFactory              │ ${nftFactory.address.padEnd(42)} │`);
        console.log(`│ ComplianceFactory       │ ${complianceFactory.address.padEnd(42)} │`);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    } catch (error) {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
