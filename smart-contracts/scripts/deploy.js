const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy ProductRegistry
  console.log("\nDeploying ProductRegistry...");
  const ProductRegistry = await ethers.getContractFactory("ProductRegistry");
  const productRegistry = await ProductRegistry.deploy();
  await productRegistry.deployed();
  console.log("ProductRegistry deployed to:", productRegistry.address);

  // Deploy NFTCertificate
  console.log("\nDeploying NFTCertificate...");
  const NFTCertificate = await ethers.getContractFactory("NFTCertificate");
  const nftCertificate = await NFTCertificate.deploy(productRegistry.address);
  await nftCertificate.deployed();
  console.log("NFTCertificate deployed to:", nftCertificate.address);

  // Save deployment addresses
  const deploymentInfo = {
    network: network.name,
    chainId: network.config.chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      ProductRegistry: productRegistry.address,
      NFTCertificate: nftCertificate.address
    }
  };

  console.log("\n=== Deployment Summary ===");
  console.log("Network:", deploymentInfo.network);
  console.log("Chain ID:", deploymentInfo.chainId);
  console.log("Deployer:", deploymentInfo.deployer);
  console.log("ProductRegistry:", deploymentInfo.contracts.ProductRegistry);
  console.log("NFTCertificate:", deploymentInfo.contracts.NFTCertificate);
  console.log("Timestamp:", deploymentInfo.timestamp);

  // Save to file for frontend integration
  const fs = require('fs');
  const deploymentPath = './deployments.json';
  
  let deployments = {};
  if (fs.existsSync(deploymentPath)) {
    deployments = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  }
  
  deployments[network.name] = deploymentInfo;
  fs.writeFileSync(deploymentPath, JSON.stringify(deployments, null, 2));
  
  console.log("\nDeployment info saved to deployments.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
