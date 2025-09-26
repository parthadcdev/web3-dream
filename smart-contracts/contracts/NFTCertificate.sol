// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
// Counters utility removed in OpenZeppelin v5.0.0 - using simple counter

/**
 * @title NFTCertificate
 * @dev ERC-721 NFT contract for product certificates with verification and metadata
 */
contract NFTCertificate is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable, ReentrancyGuard, Pausable {
    struct Certificate {
        uint256 tokenId;
        uint256 productId;
        address owner;
        string certificateType;
        string verificationCode;
        string metadataURI;
        bool isValid;
        uint256 mintedAt;
        uint256 expiresAt;
        address minter;
        string[] complianceStandards;
    }

    struct VerificationData {
        uint256 timestamp;
        address verifier;
        string verificationMethod;
        bool isValid;
        string additionalData;
    }

    uint256 private _tokenIdCounter;

    mapping(uint256 => Certificate) public certificates;
    mapping(string => uint256) public verificationCodeToTokenId;
    mapping(uint256 => VerificationData[]) public verificationHistory;
    mapping(address => bool) public authorizedMinters;
    mapping(string => bool) public usedVerificationCodes;
    mapping(string => bool) public validVerificationCodes;

    string private _baseTokenURI;
    uint256 public verificationFee = 0.001 ether;
    uint256 public mintingFee = 0.01 ether;
    uint256 public maxSupply = 1000000;

    event CertificateMinted(
        uint256 indexed tokenId,
        uint256 indexed productId,
        address indexed owner,
        string certificateType,
        string verificationCode
    );

    event CertificateVerified(
        uint256 indexed tokenId,
        address indexed verifier,
        string verificationMethod,
        bool isValid
    );
    
    event CertificateInvalidated(
        uint256 indexed tokenId,
        string reason
    );

    modifier onlyAuthorizedMinter() {
        require(authorizedMinters[msg.sender] || msg.sender == owner(), "Not authorized to mint");
        _;
    }
    
    modifier validTokenId(uint256 tokenId) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        _;
    }

    constructor(
        string memory name,
        string memory symbol,
        string memory baseTokenURI
    ) ERC721(name, symbol) Ownable(msg.sender) {
        _baseTokenURI = baseTokenURI;
        authorizedMinters[msg.sender] = true;
    }

    function mintCertificate(
        address to,
        uint256 productId,
        string memory certificateType,
        string memory metadataURI,
        string[] memory complianceStandards,
        uint256 expiresAt
    ) external payable onlyAuthorizedMinter whenNotPaused nonReentrant returns (uint256) {
        require(to != address(0), "Cannot mint to zero address");
        require(bytes(certificateType).length > 0, "Certificate type required");
        require(bytes(metadataURI).length > 0, "Metadata URI required");
        require(totalSupply() < maxSupply, "Max supply reached");
        require(msg.value >= mintingFee, "Insufficient minting fee");
        
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        string memory verificationCode = _generateVerificationCode(tokenId, productId);
        
        Certificate storage cert = certificates[tokenId];
        cert.tokenId = tokenId;
        cert.productId = productId;
        cert.owner = to;
        cert.certificateType = certificateType;
        cert.verificationCode = verificationCode;
        cert.metadataURI = metadataURI;
        cert.isValid = true;
        cert.mintedAt = block.timestamp;
        cert.expiresAt = expiresAt;
        cert.minter = msg.sender;
        
        for (uint256 i = 0; i < complianceStandards.length; i++) {
            cert.complianceStandards.push(complianceStandards[i]);
        }
        
        verificationCodeToTokenId[verificationCode] = tokenId;
        validVerificationCodes[verificationCode] = true;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataURI);
        
        emit CertificateMinted(tokenId, productId, to, certificateType, verificationCode);
        
        if (msg.value > mintingFee) {
            payable(msg.sender).transfer(msg.value - mintingFee);
        }
        
        return tokenId;
    }

    function verifyCertificate(
        uint256 tokenId,
        string memory verificationMethod,
        string memory additionalData
    ) external payable validTokenId(tokenId) whenNotPaused nonReentrant {
        require(msg.value >= verificationFee, "Insufficient verification fee");
        
        Certificate storage cert = certificates[tokenId];
        require(cert.isValid, "Certificate is invalid");
        require(cert.expiresAt == 0 || block.timestamp <= cert.expiresAt, "Certificate expired");
        
        VerificationData memory verification = VerificationData({
            timestamp: block.timestamp,
            verifier: msg.sender,
            verificationMethod: verificationMethod,
            isValid: true,
            additionalData: additionalData
        });
        
        verificationHistory[tokenId].push(verification);
        
        emit CertificateVerified(tokenId, msg.sender, verificationMethod, true);
        
        if (msg.value > verificationFee) {
            payable(msg.sender).transfer(msg.value - verificationFee);
        }
    }

    function verifyByCode(
        string memory verificationCode,
        string memory verificationMethod,
        string memory additionalData
    ) external payable whenNotPaused nonReentrant {
        require(bytes(verificationCode).length > 0, "Verification code required");
        require(msg.value >= verificationFee, "Insufficient verification fee");
        
        require(validVerificationCodes[verificationCode], "Invalid verification code");
        uint256 tokenId = verificationCodeToTokenId[verificationCode];
        
        // Call the internal verification logic directly
        Certificate storage cert = certificates[tokenId];
        require(cert.isValid, "Certificate is invalid");
        require(cert.expiresAt == 0 || block.timestamp <= cert.expiresAt, "Certificate has expired");
        
        VerificationData memory verification = VerificationData({
            timestamp: block.timestamp,
            verifier: msg.sender,
            verificationMethod: verificationMethod,
            isValid: true,
            additionalData: additionalData
        });
        
        verificationHistory[tokenId].push(verification);
        
        emit CertificateVerified(tokenId, msg.sender, verificationMethod, true);
        
        if (msg.value > verificationFee) {
            payable(msg.sender).transfer(msg.value - verificationFee);
        }
    }

    function getCertificate(uint256 tokenId) 
        external 
        view 
        validTokenId(tokenId) 
        returns (
            uint256 productId,
            address owner,
            string memory certificateType,
            string memory verificationCode,
            string memory metadataURI,
            bool isValid,
            uint256 mintedAt,
            uint256 expiresAt,
            address minter,
            string[] memory complianceStandards
        ) 
    {
        Certificate storage cert = certificates[tokenId];
        return (
            cert.productId,
            cert.owner,
            cert.certificateType,
            cert.verificationCode,
            cert.metadataURI,
            cert.isValid,
            cert.mintedAt,
            cert.expiresAt,
            cert.minter,
            cert.complianceStandards
        );
    }

    function getVerificationHistory(uint256 tokenId) 
        external 
        view 
        validTokenId(tokenId) 
        returns (VerificationData[] memory) 
    {
        return verificationHistory[tokenId];
    }

    function isCertificateValid(uint256 tokenId) 
        external 
        view 
        validTokenId(tokenId) 
        returns (bool) 
    {
        Certificate storage cert = certificates[tokenId];
        return cert.isValid && (cert.expiresAt == 0 || block.timestamp <= cert.expiresAt);
    }

    function addAuthorizedMinter(address minter) external onlyOwner {
        require(minter != address(0), "Invalid minter address");
        authorizedMinters[minter] = true;
    }

    function removeAuthorizedMinter(address minter) external onlyOwner {
        require(minter != address(0), "Invalid minter address");
        authorizedMinters[minter] = false;
    }

    function updateMintingFee(uint256 newFee) external onlyOwner {
        require(newFee >= 0, "Fee must be non-negative");
        mintingFee = newFee;
    }

    function updateVerificationFee(uint256 newFee) external onlyOwner {
        require(newFee >= 0, "Fee must be non-negative");
        verificationFee = newFee;
    }

    function emergencyPause() external onlyOwner {
        _pause();
    }

    function emergencyUnpause() external onlyOwner {
        _unpause();
    }

    function invalidateCertificate(uint256 tokenId, string memory reason) external onlyOwner validTokenId(tokenId) {
        certificates[tokenId].isValid = false;
        emit CertificateInvalidated(tokenId, reason);
    }

    function addComplianceStandard(uint256 tokenId, string memory standard) external onlyOwner validTokenId(tokenId) {
        certificates[tokenId].complianceStandards.push(standard);
    }

    function getBaseTokenURI() external view returns (string memory) {
        return _baseTokenURI;
    }

    function _generateVerificationCode(uint256 tokenId, uint256 productId) 
        internal 
        returns (string memory) 
    {
        bytes32 hash = keccak256(abi.encodePacked(
            tokenId,
            productId,
            block.timestamp,
            block.difficulty,
            msg.sender
        ));
        
        string memory code = _bytes32ToString(hash);
        
        while (usedVerificationCodes[code]) {
            hash = keccak256(abi.encodePacked(hash, block.timestamp));
            code = _bytes32ToString(hash);
        }
        
        usedVerificationCodes[code] = true;
        return code;
    }
    
    function _bytes32ToString(bytes32 data) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        bytes memory str = new bytes(8);
        
        for (uint256 i = 0; i < 8; i++) {
            str[i] = alphabet[uint8(data[i] >> 4) & 0x0f];
        }
        
        return string(str);
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
    
    function _update(address to, uint256 tokenId, address auth) 
        internal 
        override(ERC721, ERC721Enumerable) 
        returns (address) 
    {
        return super._update(to, tokenId, auth);
    }
    
    function _increaseBalance(address account, uint128 value) 
        internal 
        override(ERC721, ERC721Enumerable) 
    {
        super._increaseBalance(account, value);
    }
    
    // _burn function is not virtual in OpenZeppelin v5.0.0, so we can't override it
    // The parent implementation will handle burning correctly

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        override(ERC721, ERC721Enumerable, ERC721URIStorage) 
        returns (bool) 
    {
        return super.supportsInterface(interfaceId);
    }
}