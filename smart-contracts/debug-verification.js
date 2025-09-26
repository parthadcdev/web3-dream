const { ethers } = require("hardhat");

async function main() {
  const [owner, minter, user1, user2] = await ethers.getSigners();
  
  const NFTCertificate = await ethers.getContractFactory("NFTCertificate");
  const nftCertificate = await NFTCertificate.deploy(
    "Test Certificates",
    "TEST",
    "https://api.test.com/metadata/"
  );
  await nftCertificate.deployed();
  
  console.log("Contract deployed at:", nftCertificate.address);
  
  // Add minter as authorized
  await nftCertificate.addAuthorizedMinter(minter.address);
  console.log("Added minter as authorized");
  
  // Mint a certificate
  const mintingFee = await nftCertificate.mintingFee();
  console.log("Minting fee:", ethers.utils.formatEther(mintingFee));
  
  const tx = await nftCertificate.connect(minter).mintCertificate(
    user1.address,
    1,
    "authenticity",
    "https://ipfs.io/ipfs/test123",
    ["ISO 9001"],
    0, // No expiration
    { value: mintingFee }
  );
  
  const receipt = await tx.wait();
  const event = receipt.events.find(e => e.event === "CertificateMinted");
  const tokenId = event.args.tokenId;
  
  console.log("Minted token ID:", tokenId.toString());
  
  // Get certificate details
  const cert = await nftCertificate.getCertificate(tokenId);
  console.log("Certificate verification code:", cert.verificationCode);
  
  // Check if verification code is in mapping
  const mappedTokenId = await nftCertificate.verificationCodeToTokenId(cert.verificationCode);
  console.log("Mapped token ID:", mappedTokenId.toString());
  
  // Try to verify by code
  const verificationFee = await nftCertificate.verificationFee();
  console.log("Verification fee:", ethers.utils.formatEther(verificationFee));
  
  try {
    const verifyTx = await nftCertificate.connect(user2).verifyByCode(
      cert.verificationCode,
      "code",
      "Code verification",
      { value: verificationFee }
    );
    console.log("Verification successful!");
  } catch (error) {
    console.log("Verification failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
