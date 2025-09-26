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
  console.log("Certificate verification code length:", cert.verificationCode.length);
  console.log("Certificate verification code bytes:", ethers.utils.toUtf8Bytes(cert.verificationCode));
  
  // Check if verification code is in mapping
  const mappedTokenId = await nftCertificate.verificationCodeToTokenId(cert.verificationCode);
  console.log("Mapped token ID:", mappedTokenId.toString());
  
  // Let's try to check if the mapping is working by checking a different approach
  console.log("Checking if the mapping is working...");
  
  // Let's try to verify by code with the exact same code
  const verificationFee = await nftCertificate.verificationFee();
  console.log("Verification fee:", ethers.utils.formatEther(verificationFee));
  
  // Let's try to call the function directly to see what happens
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
    
    // Let's check if the issue is with the mapping lookup
    console.log("Checking mapping directly...");
    const directLookup = await nftCertificate.verificationCodeToTokenId(cert.verificationCode);
    console.log("Direct lookup result:", directLookup.toString());
    
    // Let's also check if there are any other verification codes
    console.log("Checking with a different code...");
    try {
      const wrongCodeTx = await nftCertificate.connect(user2).verifyByCode(
        "WRONGCODE",
        "code",
        "Code verification",
        { value: verificationFee }
      );
    } catch (error) {
      console.log("Wrong code error:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
