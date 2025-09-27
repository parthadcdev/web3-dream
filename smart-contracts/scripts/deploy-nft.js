const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting NFT Certificate deployment...");

  // Get the contract factories
  const NFTCertificate = await ethers.getContractFactory("NFTCertificate");
  const NFTFactory = await ethers.getContractFactory("NFTFactory");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy NFT Certificate contract
  console.log("\n📄 Deploying NFTCertificate contract...");
  const nftCertificate = await NFTCertificate.deploy(
    "TraceChain Certificates",
    "TRACE",
    "https://api.tracechain.com/metadata/"
  );
  await nftCertificate.waitForDeployment();
  console.log("✅ NFTCertificate deployed to:", await nftCertificate.getAddress());

  // Deploy NFT Factory contract
  console.log("\n🏭 Deploying NFTFactory contract...");
  const nftFactory = await NFTFactory.deploy();
  await nftFactory.waitForDeployment();
  console.log("✅ NFTFactory deployed to:", await nftFactory.getAddress());

  // Configure the factory to use the NFT Certificate contract
  console.log("\n⚙️ Configuring factory...");
  await nftFactory.updateDeploymentFee(ethers.parseEther("0.1"));
  console.log("✅ Factory configured");

  // Verify contracts on block explorer (if not on local network)
  const network = await ethers.provider.getNetwork();
  if (network.chainId !== 31337) { // Not localhost
    console.log("\n🔍 Waiting for block confirmations...");
    await nftCertificate.deploymentTransaction().wait(5);
    await nftFactory.deploymentTransaction().wait(5);

    console.log("\n🔍 Verifying contracts on block explorer...");
    try {
      await hre.run("verify:verify", {
        address: await nftCertificate.getAddress(),
        constructorArguments: [
          "TraceChain Certificates",
          "TRACE",
          "https://api.tracechain.com/metadata/"
        ],
      });
      console.log("✅ NFTCertificate verified");
    } catch (error) {
      console.log("❌ NFTCertificate verification failed:", error.message);
    }

    try {
      await hre.run("verify:verify", {
        address: await nftFactory.getAddress(),
        constructorArguments: [],
      });
      console.log("✅ NFTFactory verified");
    } catch (error) {
      console.log("❌ NFTFactory verification failed:", error.message);
    }
  }

  // Display deployment summary
  console.log("\n📋 Deployment Summary:");
  console.log("======================");
  console.log("Network:", network.name, `(Chain ID: ${network.chainId})`);
  console.log("Deployer:", deployer.address);
  console.log("NFTCertificate:", nftCertificate.address);
  console.log("NFTFactory:", nftFactory.address);
  console.log("\n🎉 NFT Certificate deployment completed successfully!");

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    nftCertificate: nftCertificate.address,
    nftFactory: nftFactory.address,
    timestamp: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber()
  };

  const fs = require('fs');
  const path = require('path');
  const deploymentsDir = path.join(__dirname, '../deployments');
  
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const filename = `nft-deployment-${network.name}-${Date.now()}.json`;
  const filepath = path.join(deploymentsDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`📁 Deployment info saved to: ${filepath}`);

  return {
    nftCertificate,
    nftFactory,
    deploymentInfo
  };
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
