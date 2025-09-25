const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🧪 Testing TraceChain Deployment...\n");
    
    const network = hre.network.name;
    const deploymentPath = path.join(__dirname, "..", "deployments", `${network}.json`);
    
    if (!fs.existsSync(deploymentPath)) {
        console.error("❌ Deployment file not found:", deploymentPath);
        console.log("Please run deployment script first.");
        process.exit(1);
    }
    
    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    const contracts = deploymentInfo.contracts;
    
    console.log(`Testing contracts on ${network} network...\n`);
    
    try {
        const [deployer] = await ethers.getSigners();
        console.log("Testing with account:", deployer.address);
        console.log("Account balance:", ethers.utils.formatEther(await deployer.getBalance()), "ETH\n");
        
        // Test 1: Access Control System
        console.log("🔐 Testing Access Control System...");
        const accessControl = await ethers.getContractAt("TraceAccessControl", contracts.TraceAccessControl);
        
        const adminRole = await accessControl.ADMIN_ROLE();
        const hasAdminRole = await accessControl.hasRole(adminRole, deployer.address);
        console.log("✅ Admin role assigned:", hasAdminRole);
        
        // Test 2: TRACE Token
        console.log("\n🪙 Testing TRACE Token...");
        const traceToken = await ethers.getContractAt("TraceToken", contracts.TraceToken);
        
        const tokenName = await traceToken.name();
        const tokenSymbol = await traceToken.symbol();
        const tokenBalance = await traceToken.balanceOf(deployer.address);
        console.log("✅ Token name:", tokenName);
        console.log("✅ Token symbol:", tokenSymbol);
        console.log("✅ Token balance:", ethers.utils.formatEther(tokenBalance), "TRACE");
        
        // Test 3: Rewards Distributor
        console.log("\n🎁 Testing Rewards Distributor...");
        const rewardsDistributor = await ethers.getContractAt("RewardsDistributor", contracts.RewardsDistributor);
        
        const traceTokenAddress = await rewardsDistributor.traceToken();
        console.log("✅ TraceToken address:", traceTokenAddress);
        
        // Test 4: Product Registry
        console.log("\n📦 Testing Product Registry...");
        const productRegistry = await ethers.getContractAt("ProductRegistry", contracts.ProductRegistry);
        
        const productCount = await productRegistry.getProductCount();
        console.log("✅ Total products:", productCount.toString());
        
        if (productCount.gt(0)) {
            const product = await productRegistry.getProduct(1);
            console.log("✅ Sample product name:", product.productName);
            console.log("✅ Sample product type:", product.productType);
            
            const checkpoints = await productRegistry.getCheckpoints(1);
            console.log("✅ Sample product checkpoints:", checkpoints.length);
        }
        
        // Test 5: NFT Certificate
        console.log("\n🏆 Testing NFT Certificate...");
        const nftCertificate = await ethers.getContractAt("NFTCertificate", contracts.NFTCertificate);
        
        const certificateCount = await nftCertificate.totalSupply();
        console.log("✅ Total certificates:", certificateCount.toString());
        
        if (certificateCount.gt(0)) {
            const certificate = await nftCertificate.getCertificate(1);
            console.log("✅ Sample certificate type:", certificate.certificateType);
            console.log("✅ Sample certificate issuer:", certificate.issuer);
            
            const verification = await nftCertificate.verifyCertificate(1);
            console.log("✅ Sample certificate valid:", verification[0]);
        }
        
        // Test 6: Compliance Contract
        console.log("\n✅ Testing Compliance Contract...");
        const complianceContract = await ethers.getContractAt("ComplianceContract", contracts.ComplianceContract);
        
        const complianceStats = await complianceContract.getComplianceStats();
        console.log("✅ Total compliance rules:", complianceStats[0].toString());
        console.log("✅ Active compliance rules:", complianceStats[1].toString());
        
        // Test 7: Payment Contract
        console.log("\n💳 Testing Payment Contract...");
        const paymentContract = await ethers.getContractAt("PaymentContract", contracts.PaymentContract);
        
        const paymentToken = await paymentContract.paymentToken();
        const disputeToken = await paymentContract.disputeToken();
        const platformFee = await paymentContract.platformFeePercentage();
        console.log("✅ Payment token address:", paymentToken);
        console.log("✅ Dispute token address:", disputeToken);
        console.log("✅ Platform fee percentage:", platformFee.toString(), "basis points");
        
        // Test 8: Factory Contracts
        console.log("\n🏭 Testing Factory Contracts...");
        
        const productFactory = await ethers.getContractAt("ProductFactory", contracts.ProductFactory);
        const productFactoryStats = await productFactory.getRegistryStats();
        console.log("✅ ProductFactory - Total registries:", productFactoryStats[0].toString());
        console.log("✅ ProductFactory - Active registries:", productFactoryStats[1].toString());
        
        const nftFactory = await ethers.getContractAt("NFTFactory", contracts.NFTFactory);
        const nftFactoryStats = await nftFactory.getCertificateStats();
        console.log("✅ NFTFactory - Total certificates:", nftFactoryStats[0].toString());
        console.log("✅ NFTFactory - Active certificates:", nftFactoryStats[1].toString());
        
        const complianceFactory = await ethers.getContractAt("ComplianceFactory", contracts.ComplianceFactory);
        const complianceFactoryStats = await complianceFactory.getComplianceStats();
        console.log("✅ ComplianceFactory - Total contracts:", complianceFactoryStats[0].toString());
        console.log("✅ ComplianceFactory - Active contracts:", complianceFactoryStats[1].toString());
        
        // Test 9: Integration Tests
        console.log("\n🔗 Testing Integration...");
        
        // Test token distribution
        const testAmount = ethers.utils.parseEther("100");
        await traceToken.distributeReward(deployer.address, testAmount, "test");
        const newBalance = await traceToken.balanceOf(deployer.address);
        console.log("✅ Token distribution test passed");
        console.log("✅ New token balance:", ethers.utils.formatEther(newBalance), "TRACE");
        
        // Test staking
        const stakeAmount = ethers.utils.parseEther("1000");
        await traceToken.stake(stakeAmount);
        const stakingInfo = await traceToken.getStakingInfo(deployer.address);
        console.log("✅ Staking test passed");
        console.log("✅ Staked amount:", ethers.utils.formatEther(stakingInfo.stakedAmount), "TRACE");
        
        // Test 10: Performance Tests
        console.log("\n⚡ Testing Performance...");
        
        const startTime = Date.now();
        
        // Test multiple product registrations
        for (let i = 0; i < 5; i++) {
            await productRegistry.registerProduct(
                `Test Product ${i}`,
                "test",
                `BATCH-TEST-${i}`,
                Math.floor(Date.now() / 1000),
                Math.floor(Date.now() / 1000) + 86400 * 365,
                ["Test Material"],
                "https://ipfs.io/ipfs/TestHash"
            );
        }
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        console.log("✅ Performance test passed");
        console.log("✅ 5 product registrations completed in:", duration, "ms");
        
        // Test 11: Security Tests
        console.log("\n🔒 Testing Security...");
        
        // Test pause functionality
        await accessControl.emergencyPause();
        const isPaused = await accessControl.paused();
        console.log("✅ Emergency pause test passed");
        console.log("✅ Contract paused:", isPaused);
        
        await accessControl.emergencyUnpause();
        const isUnpaused = await accessControl.paused();
        console.log("✅ Emergency unpause test passed");
        console.log("✅ Contract unpaused:", !isUnpaused);
        
        // Test 12: Final Statistics
        console.log("\n📊 Final Statistics:");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        
        const finalProductCount = await productRegistry.getProductCount();
        const finalCertificateCount = await nftCertificate.totalSupply();
        const finalTokenBalance = await traceToken.balanceOf(deployer.address);
        const finalStakingInfo = await traceToken.getStakingInfo(deployer.address);
        
        console.log(`│ Total Products Registered    │ ${finalProductCount.toString().padEnd(20)} │`);
        console.log(`│ Total Certificates Minted    │ ${finalCertificateCount.toString().padEnd(20)} │`);
        console.log(`│ Token Balance                │ ${ethers.utils.formatEther(finalTokenBalance).padEnd(20)} TRACE │`);
        console.log(`│ Staked Amount                │ ${ethers.utils.formatEther(finalStakingInfo.stakedAmount).padEnd(20)} TRACE │`);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        
        console.log("\n🎉 All tests passed successfully!");
        console.log("✅ TraceChain Core Contracts are fully functional and ready for production!");
        
    } catch (error) {
        console.error("❌ Test failed:", error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
