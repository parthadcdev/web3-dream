// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract NFTCertificate is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;

    struct Certificate {
        uint256 productId;
        string certificateType; // "authenticity", "compliance", "quality"
        uint256 issueDate;
        uint256 expiryDate;
        string issuer;
        string standards; // ISO, FDA, etc.
        bool isValid;
        string verificationCode; // Unique QR code data
    }

    mapping(uint256 => Certificate) public certificates;
    mapping(uint256 => uint256) public productToCertificate; // productId => tokenId
    mapping(string => bool) public usedVerificationCodes;

    Counters.Counter private _tokenIdCounter;
    address public productRegistry;

    event CertificateMinted(
        uint256 indexed tokenId,
        uint256 indexed productId,
        string certificateType,
        address indexed owner
    );

    event CertificateVerified(
        uint256 indexed tokenId,
        bool isValid,
        string reason
    );

    modifier onlyProductRegistry() {
        require(msg.sender == productRegistry, "Only product registry");
        _;
    }

    modifier validTokenId(uint256 _tokenId) {
        require(_exists(_tokenId), "Certificate does not exist");
        _;
    }

    constructor(address _productRegistry) ERC721("ProductCertificate", "PCERT") {
        productRegistry = _productRegistry;
    }

    function mintCertificate(
        address _to,
        uint256 _productId,
        string memory _certificateType,
        uint256 _expiryDate,
        string memory _issuer,
        string memory _standards,
        string memory _tokenURI,
        string memory _verificationCode
    ) external onlyProductRegistry nonReentrant returns (uint256) {
        require(_to != address(0), "Invalid recipient");
        require(!usedVerificationCodes[_verificationCode], "Verification code already used");
        require(bytes(_verificationCode).length > 0, "Verification code required");
        require(_expiryDate > block.timestamp, "Expiry date must be in future");

        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        certificates[tokenId] = Certificate({
            productId: _productId,
            certificateType: _certificateType,
            issueDate: block.timestamp,
            expiryDate: _expiryDate,
            issuer: _issuer,
            standards: _standards,
            isValid: true,
            verificationCode: _verificationCode
        });

        productToCertificate[_productId] = tokenId;
        usedVerificationCodes[_verificationCode] = true;

        _safeMint(_to, tokenId);
        _setTokenURI(tokenId, _tokenURI);

        emit CertificateMinted(tokenId, _productId, _certificateType, _to);
        
        return tokenId;
    }

    function verifyCertificate(uint256 _tokenId) external view validTokenId(_tokenId) returns (bool, string memory) {
        Certificate memory cert = certificates[_tokenId];
        
        if (!cert.isValid) {
            return (false, "Certificate has been invalidated");
        }
        
        if (block.timestamp > cert.expiryDate) {
            return (false, "Certificate has expired");
        }
        
        return (true, "Certificate is valid");
    }

    function verifyByCode(string memory _verificationCode) external view returns (uint256, bool, string memory) {
        require(bytes(_verificationCode).length > 0, "Verification code required");
        
        // Find certificate by verification code
        for (uint256 i = 0; i < _tokenIdCounter.current(); i++) {
            if (keccak256(bytes(certificates[i].verificationCode)) == keccak256(bytes(_verificationCode))) {
                // Call the internal verification logic directly instead of external function
                Certificate memory cert = certificates[i];
                
                if (!cert.isValid) {
                    return (i, false, "Certificate has been invalidated");
                }
                
                if (block.timestamp > cert.expiryDate) {
                    return (i, false, "Certificate has expired");
                }
                
                return (i, true, "Certificate is valid");
            }
        }
        
        return (0, false, "Certificate not found");
    }

    function invalidateCertificate(uint256 _tokenId) external validTokenId(_tokenId) {
        require(ownerOf(_tokenId) == msg.sender || msg.sender == owner(), "Not authorized");
        
        certificates[_tokenId].isValid = false;
        
        emit CertificateVerified(_tokenId, false, "Certificate invalidated by owner");
    }

    function getCertificate(uint256 _tokenId) external view validTokenId(_tokenId) returns (Certificate memory) {
        return certificates[_tokenId];
    }

    function getCertificateByProduct(uint256 _productId) external view returns (uint256) {
        return productToCertificate[_productId];
    }

    function updateProductRegistry(address _newProductRegistry) external onlyOwner {
        require(_newProductRegistry != address(0), "Invalid address");
        productRegistry = _newProductRegistry;
    }

    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter.current();
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }
}
