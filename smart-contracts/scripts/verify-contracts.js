const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🔐 Starting Contract Verification...\n");
    
    const network = hre.network.name;
    const deploymentPath = path.join(__dirname, "..", "deployments", `${network}.json`);
    
    if (!fs.existsSync(deploymentPath)) {
        console.error("❌ Deployment file not found:", deploymentPath);
        console.log("Please run deployment script first.");
        process.exit(1);
    }
    
    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    const contracts = deploymentInfo.contracts;
    
    console.log(`Verifying contracts on ${network} network...\n`);
    
    try {
        // Verify Access Control
        if (contracts.TraceAccessControl) {
            console.log("🔍 Verifying TraceAccessControl...");
            await hre.run("verify:verify", {
                address: contracts.TraceAccessControl,
                constructorArguments: []
            });
            console.log("✅ TraceAccessControl verified");
        }
        
        // Verify TRACE Token
        if (contracts.TraceToken) {
            console.log("🔍 Verifying TraceToken...");
            await hre.run("verify:verify", {
                address: contracts.TraceToken,
                constructorArguments: []
            });
            console.log("✅ TraceToken verified");
        }
        
        // Verify Rewards Distributor
        if (contracts.RewardsDistributor) {
            console.log("🔍 Verifying RewardsDistributor...");
            const priceFeedAddress = "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0"; // MATIC/USD on Polygon
            await hre.run("verify:verify", {
                address: contracts.RewardsDistributor,
                constructorArguments: [contracts.TraceToken, priceFeedAddress]
            });
            console.log("✅ RewardsDistributor verified");
        }
        
        // Verify Product Registry
        if (contracts.ProductRegistry) {
            console.log("🔍 Verifying ProductRegistry...");
            await hre.run("verify:verify", {
                address: contracts.ProductRegistry,
                constructorArguments: []
            });
            console.log("✅ ProductRegistry verified");
        }
        
        // Verify NFT Certificate
        if (contracts.NFTCertificate) {
            console.log("🔍 Verifying NFTCertificate...");
            await hre.run("verify:verify", {
                address: contracts.NFTCertificate,
                constructorArguments: [contracts.ProductRegistry]
            });
            console.log("✅ NFTCertificate verified");
        }
        
        // Verify Compliance Contract
        if (contracts.ComplianceContract) {
            console.log("🔍 Verifying ComplianceContract...");
            await hre.run("verify:verify", {
                address: contracts.ComplianceContract,
                constructorArguments: [contracts.ProductRegistry, contracts.NFTCertificate, contracts.TraceToken]
            });
            console.log("✅ ComplianceContract verified");
        }
        
        // Verify Payment Contract
        if (contracts.PaymentContract) {
            console.log("🔍 Verifying PaymentContract...");
            const usdcAddress = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"; // USDC on Polygon
            const [deployer] = await ethers.getSigners();
            await hre.run("verify:verify", {
                address: contracts.PaymentContract,
                constructorArguments: [usdcAddress, contracts.TraceToken, deployer.address]
            });
            console.log("✅ PaymentContract verified");
        }
        
        // Verify Product Factory
        if (contracts.ProductFactory) {
            console.log("🔍 Verifying ProductFactory...");
            await hre.run("verify:verify", {
                address: contracts.ProductFactory,
                constructorArguments: []
            });
            console.log("✅ ProductFactory verified");
        }
        
        // Verify NFT Factory
        if (contracts.NFTFactory) {
            console.log("🔍 Verifying NFTFactory...");
            await hre.run("verify:verify", {
                address: contracts.NFTFactory,
                constructorArguments: []
            });
            console.log("✅ NFTFactory verified");
        }
        
        // Verify Compliance Factory
        if (contracts.ComplianceFactory) {
            console.log("🔍 Verifying ComplianceFactory...");
            await hre.run("verify:verify", {
                address: contracts.ComplianceFactory,
                constructorArguments: []
            });
            console.log("✅ ComplianceFactory verified");
        }
        
        console.log("\n🎉 All contracts verified successfully!");
        
    } catch (error) {
        console.error("❌ Verification failed:", error.message);
        
        // Try to verify contracts individually
        console.log("\n🔄 Attempting individual verification...");
        
        const contractsToVerify = [
            { name: "TraceAccessControl", address: contracts.TraceAccessControl, args: [] },
            { name: "TraceToken", address: contracts.TraceToken, args: [] },
            { name: "RewardsDistributor", address: contracts.RewardsDistributor, args: [contracts.TraceToken, "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0"] },
            { name: "ProductRegistry", address: contracts.ProductRegistry, args: [] },
            { name: "NFTCertificate", address: contracts.NFTCertificate, args: [contracts.ProductRegistry] },
            { name: "ComplianceContract", address: contracts.ComplianceContract, args: [contracts.ProductRegistry, contracts.NFTCertificate, contracts.TraceToken] },
            { name: "PaymentContract", address: contracts.PaymentContract, args: ["0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", contracts.TraceToken, contracts.TraceAccessControl] },
            { name: "ProductFactory", address: contracts.ProductFactory, args: [] },
            { name: "NFTFactory", address: contracts.NFTFactory, args: [] },
            { name: "ComplianceFactory", address: contracts.ComplianceFactory, args: [] }
        ];
        
        for (const contract of contractsToVerify) {
            if (contract.address) {
                try {
                    console.log(`🔍 Verifying ${contract.name}...`);
                    await hre.run("verify:verify", {
                        address: contract.address,
                        constructorArguments: contract.args
                    });
                    console.log(`✅ ${contract.name} verified`);
                } catch (verifyError) {
                    console.log(`❌ ${contract.name} verification failed:`, verifyError.message);
                }
            }
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
