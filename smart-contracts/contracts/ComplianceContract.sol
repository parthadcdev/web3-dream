// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title ComplianceContract
 * @dev Automated compliance checking and certification with industry standards
 * @notice This contract manages compliance rules and automated checking for products
 */
contract ComplianceContract is Ownable, ReentrancyGuard, Pausable {
    using SafeMath for uint256;

    struct ComplianceRule {
        string ruleId;
        string ruleName;
        string productType;
        string requirement;
        string standard; // ISO, FDA, CE, etc.
        uint256 severity; // 1-5, where 5 is critical
        bool isActive;
        uint256 createdDate;
        address creator;
    }

    struct ComplianceCheck {
        uint256 productId;
        string ruleId;
        bool passed;
        string evidence;
        uint256 checkDate;
        address auditor;
        uint256 confidence; // 0-100, confidence level of the check
        string notes;
    }

    struct ComplianceStatus {
        uint256 productId;
        bool isCompliant;
        uint256 lastCheckDate;
        uint256 totalChecks;
        uint256 passedChecks;
        uint256 failedChecks;
        string[] failedRules;
    }

    // Mappings
    mapping(string => ComplianceRule) public complianceRules;
    mapping(uint256 => ComplianceCheck[]) public productComplianceChecks;
    mapping(uint256 => ComplianceStatus) public productComplianceStatus;
    mapping(address => bool) public authorizedAuditors;
    mapping(string => bool) public supportedStandards;
    
    // Arrays for iteration
    string[] public activeRuleIds;
    string[] public supportedProductTypes;
    
    // External contract addresses
    address public productRegistry;
    address public nftContract;
    address public traceToken;
    
    // Compliance thresholds
    uint256 public constant MIN_CONFIDENCE_THRESHOLD = 80; // 80% confidence required
    uint256 public constant CRITICAL_SEVERITY_THRESHOLD = 4; // Rules with severity >= 4 are critical
    uint256 public constant MAX_EVIDENCE_LENGTH = 1000; // Max evidence string length
    
    // Events
    event RuleAdded(string indexed ruleId, string ruleName, string productType, string standard);
    event RuleUpdated(string indexed ruleId, bool isActive);
    event ComplianceChecked(uint256 indexed productId, string indexed ruleId, bool passed, uint256 confidence);
    event ProductCompliant(uint256 indexed productId, bool isCompliant, uint256 totalChecks);
    event AuditorAuthorized(address indexed auditor, bool authorized);
    event StandardSupported(string standard, bool supported);
    event EvidenceUpdated(uint256 indexed productId, string indexed ruleId, string evidence);
    
    modifier onlyAuthorized() {
        require(
            msg.sender == owner() || 
            msg.sender == productRegistry || 
            msg.sender == nftContract ||
            authorizedAuditors[msg.sender],
            "Not authorized"
        );
        _;
    }
    
    modifier validRuleId(string memory ruleId) {
        require(bytes(ruleId).length > 0, "Rule ID required");
        require(_ruleExists(ruleId), "Rule does not exist");
        _;
    }
    
    modifier validProductId(uint256 productId) {
        require(productId > 0, "Invalid product ID");
        _;
    }
    
    constructor(address _productRegistry, address _nftContract, address _traceToken) {
        require(_productRegistry != address(0), "Invalid product registry address");
        require(_nftContract != address(0), "Invalid NFT contract address");
        require(_traceToken != address(0), "Invalid token address");
        
        productRegistry = _productRegistry;
        nftContract = _nftContract;
        traceToken = _traceToken;
        
        // Initialize supported standards
        _initializeStandards();
        
        // Add default compliance rules
        _addDefaultRules();
        
        // Authorize owner as auditor
        authorizedAuditors[owner()] = true;
    }
    
    /**
     * @dev Add a new compliance rule
     * @param ruleId Unique identifier for the rule
     * @param ruleName Human-readable name
     * @param productType Type of product this applies to
     * @param requirement Detailed requirement description
     * @param standard Industry standard (ISO, FDA, etc.)
     * @param severity Severity level (1-5)
     */
    function addComplianceRule(
        string memory ruleId,
        string memory ruleName,
        string memory productType,
        string memory requirement,
        string memory standard,
        uint256 severity
    ) external onlyOwner {
        require(bytes(ruleId).length > 0, "Rule ID required");
        require(bytes(ruleName).length > 0, "Rule name required");
        require(bytes(productType).length > 0, "Product type required");
        require(bytes(requirement).length > 0, "Requirement required");
        require(bytes(standard).length > 0, "Standard required");
        require(severity >= 1 && severity <= 5, "Severity must be 1-5");
        require(!_ruleExists(ruleId), "Rule already exists");
        require(supportedStandards[standard], "Standard not supported");
        
        complianceRules[ruleId] = ComplianceRule({
            ruleId: ruleId,
            ruleName: ruleName,
            productType: productType,
            requirement: requirement,
            standard: standard,
            severity: severity,
            isActive: true,
            createdDate: block.timestamp,
            creator: msg.sender
        });
        
        activeRuleIds.push(ruleId);
        
        // Add product type if new
        if (!_isProductTypeSupported(productType)) {
            supportedProductTypes.push(productType);
        }
        
        emit RuleAdded(ruleId, ruleName, productType, standard);
    }
    
    /**
     * @dev Update an existing compliance rule
     * @param ruleId Rule identifier
     * @param isActive Whether the rule is active
     */
    function updateComplianceRule(string memory ruleId, bool isActive) 
        external 
        onlyOwner 
        validRuleId(ruleId) 
    {
        complianceRules[ruleId].isActive = isActive;
        emit RuleUpdated(ruleId, isActive);
    }
    
    /**
     * @dev Perform a compliance check for a product
     * @param productId Product identifier
     * @param ruleId Rule to check against
     * @param passed Whether the check passed
     * @param evidence Evidence supporting the check
     * @param confidence Confidence level (0-100)
     * @param notes Additional notes
     */
    function checkCompliance(
        uint256 productId,
        string memory ruleId,
        bool passed,
        string memory evidence,
        uint256 confidence,
        string memory notes
    ) external onlyAuthorized validProductId(productId) validRuleId(ruleId) nonReentrant whenNotPaused {
        require(complianceRules[ruleId].isActive, "Rule is inactive");
        require(confidence <= 100, "Confidence must be <= 100");
        require(bytes(evidence).length <= MAX_EVIDENCE_LENGTH, "Evidence too long");
        
        // Only allow high-confidence checks for critical rules
        if (complianceRules[ruleId].severity >= CRITICAL_SEVERITY_THRESHOLD) {
            require(confidence >= MIN_CONFIDENCE_THRESHOLD, "Insufficient confidence for critical rule");
        }
        
        ComplianceCheck memory check = ComplianceCheck({
            productId: productId,
            ruleId: ruleId,
            passed: passed,
            evidence: evidence,
            checkDate: block.timestamp,
            auditor: msg.sender,
            confidence: confidence,
            notes: notes
        });
        
        productComplianceChecks[productId].push(check);
        
        emit ComplianceChecked(productId, ruleId, passed, confidence);
        
        // Update overall compliance status
        _updateProductComplianceStatus(productId);
    }
    
    /**
     * @dev Batch compliance check for multiple rules
     * @param productId Product identifier
     * @param ruleIds Array of rule identifiers
     * @param results Array of pass/fail results
     * @param evidenceArray Array of evidence strings
     * @param confidenceArray Array of confidence levels
     * @param notesArray Array of notes
     */
    function batchComplianceCheck(
        uint256 productId,
        string[] memory ruleIds,
        bool[] memory results,
        string[] memory evidenceArray,
        uint256[] memory confidenceArray,
        string[] memory notesArray
    ) external onlyAuthorized validProductId(productId) nonReentrant whenNotPaused {
        require(ruleIds.length == results.length, "Arrays length mismatch");
        require(results.length == evidenceArray.length, "Arrays length mismatch");
        require(evidenceArray.length == confidenceArray.length, "Arrays length mismatch");
        require(confidenceArray.length == notesArray.length, "Arrays length mismatch");
        require(ruleIds.length <= 20, "Too many rules in batch");
        
        for (uint256 i = 0; i < ruleIds.length; i++) {
            if (_ruleExists(ruleIds[i]) && complianceRules[ruleIds[i]].isActive) {
                checkCompliance(
                    productId,
                    ruleIds[i],
                    results[i],
                    evidenceArray[i],
                    confidenceArray[i],
                    notesArray[i]
                );
            }
        }
    }
    
    /**
     * @dev Update evidence for an existing compliance check
     * @param productId Product identifier
     * @param ruleId Rule identifier
     * @param checkIndex Index of the check in the array
     * @param newEvidence Updated evidence
     */
    function updateEvidence(
        uint256 productId,
        string memory ruleId,
        uint256 checkIndex,
        string memory newEvidence
    ) external onlyAuthorized validProductId(productId) validRuleId(ruleId) {
        require(checkIndex < productComplianceChecks[productId].length, "Invalid check index");
        require(bytes(newEvidence).length <= MAX_EVIDENCE_LENGTH, "Evidence too long");
        
        ComplianceCheck storage check = productComplianceChecks[productId][checkIndex];
        require(keccak256(bytes(check.ruleId)) == keccak256(bytes(ruleId)), "Rule ID mismatch");
        
        check.evidence = newEvidence;
        
        emit EvidenceUpdated(productId, ruleId, newEvidence);
    }
    
    /**
     * @dev Get compliance status for a product
     * @param productId Product identifier
     * @return status Complete compliance status
     * @return checks Array of all compliance checks
     */
    function getProductCompliance(uint256 productId) 
        external 
        view 
        validProductId(productId)
        returns (ComplianceStatus memory status, ComplianceCheck[] memory checks) 
    {
        checks = productComplianceChecks[productId];
        status = productComplianceStatus[productId];
    }
    
    /**
     * @dev Get rules applicable to a product type
     * @param productType Type of product
     * @return ruleIds Array of applicable rule IDs
     */
    function getRulesForProductType(string memory productType) 
        external 
        view 
        returns (string[] memory ruleIds) 
    {
        uint256 count = 0;
        
        // Count matching rules
        for (uint256 i = 0; i < activeRuleIds.length; i++) {
            if (
                keccak256(bytes(complianceRules[activeRuleIds[i]].productType)) == 
                keccak256(bytes(productType)) &&
                complianceRules[activeRuleIds[i]].isActive
            ) {
                count++;
            }
        }
        
        // Create result array
        ruleIds = new string[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < activeRuleIds.length; i++) {
            if (
                keccak256(bytes(complianceRules[activeRuleIds[i]].productType)) == 
                keccak256(bytes(productType)) &&
                complianceRules[activeRuleIds[i]].isActive
            ) {
                ruleIds[index] = activeRuleIds[i];
                index++;
            }
        }
    }
    
    /**
     * @dev Get compliance statistics
     * @return totalRules Total number of rules
     * @return activeRules Number of active rules
     * @return supportedStandardsCount Number of supported standards
     * @return productTypesCount Number of supported product types
     */
    function getComplianceStats() external view returns (
        uint256 totalRules,
        uint256 activeRules,
        uint256 supportedStandardsCount,
        uint256 productTypesCount
    ) {
        totalRules = activeRuleIds.length;
        
        for (uint256 i = 0; i < activeRuleIds.length; i++) {
            if (complianceRules[activeRuleIds[i]].isActive) {
                activeRules++;
            }
        }
        
        supportedStandardsCount = 0;
        // Count supported standards (would need to track this separately in production)
        
        productTypesCount = supportedProductTypes.length;
    }
    
    /**
     * @dev Authorize or deauthorize an auditor
     * @param auditor Address of the auditor
     * @param authorized Whether to authorize or deauthorize
     */
    function setAuditor(address auditor, bool authorized) external onlyOwner {
        require(auditor != address(0), "Invalid auditor address");
        authorizedAuditors[auditor] = authorized;
        emit AuditorAuthorized(auditor, authorized);
    }
    
    /**
     * @dev Add or remove supported standard
     * @param standard Standard name
     * @param supported Whether to support or not
     */
    function setStandard(string memory standard, bool supported) external onlyOwner {
        require(bytes(standard).length > 0, "Standard name required");
        supportedStandards[standard] = supported;
        emit StandardSupported(standard, supported);
    }
    
    /**
     * @dev Update product compliance status
     * @param productId Product identifier
     */
    function _updateProductComplianceStatus(uint256 productId) internal {
        ComplianceCheck[] memory checks = productComplianceChecks[productId];
        
        bool allPassed = true;
        uint256 totalChecks = checks.length;
        uint256 passedChecks = 0;
        uint256 failedChecks = 0;
        string[] memory failedRules = new string[](totalChecks);
        uint256 failedRuleIndex = 0;
        
        for (uint256 i = 0; i < checks.length; i++) {
            if (checks[i].passed) {
                passedChecks++;
            } else {
                failedChecks++;
                failedRules[failedRuleIndex] = checks[i].ruleId;
                failedRuleIndex++;
                allPassed = false;
            }
        }
        
        // Resize failed rules array
        string[] memory finalFailedRules = new string[](failedChecks);
        for (uint256 i = 0; i < failedChecks; i++) {
            finalFailedRules[i] = failedRules[i];
        }
        
        productComplianceStatus[productId] = ComplianceStatus({
            productId: productId,
            isCompliant: allPassed,
            lastCheckDate: block.timestamp,
            totalChecks: totalChecks,
            passedChecks: passedChecks,
            failedChecks: failedChecks,
            failedRules: finalFailedRules
        });
        
        emit ProductCompliant(productId, allPassed, totalChecks);
    }
    
    /**
     * @dev Check if a rule exists
     * @param ruleId Rule identifier
     * @return exists Whether the rule exists
     */
    function _ruleExists(string memory ruleId) internal view returns (bool exists) {
        return bytes(complianceRules[ruleId].ruleId).length > 0;
    }
    
    /**
     * @dev Check if a product type is supported
     * @param productType Product type to check
     * @return supported Whether the product type is supported
     */
    function _isProductTypeSupported(string memory productType) internal view returns (bool supported) {
        for (uint256 i = 0; i < supportedProductTypes.length; i++) {
            if (keccak256(bytes(supportedProductTypes[i])) == keccak256(bytes(productType))) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * @dev Initialize supported standards
     */
    function _initializeStandards() internal {
        supportedStandards["ISO"] = true;
        supportedStandards["FDA"] = true;
        supportedStandards["CE"] = true;
        supportedStandards["GMP"] = true;
        supportedStandards["HACCP"] = true;
        supportedStandards["HALAL"] = true;
        supportedStandards["KOSHER"] = true;
        supportedStandards["FSC"] = true;
        supportedStandards["FAIRTRADE"] = true;
        supportedStandards["BREEAM"] = true;
    }
    
    /**
     * @dev Add default compliance rules
     */
    function _addDefaultRules() internal {
        // Pharmaceutical compliance rules
        _addRule("FDA_001", "FDA Manufacturing Standards", "pharmaceutical", 
                "Manufacturing facility must be FDA approved", "FDA", 5);
        _addRule("HIPAA_001", "HIPAA Data Protection", "pharmaceutical", 
                "Patient data must be HIPAA compliant", "FDA", 4);
        _addRule("GMP_001", "Good Manufacturing Practices", "pharmaceutical", 
                "Must follow GMP guidelines", "GMP", 4);
        
        // Luxury goods compliance rules
        _addRule("AUTH_001", "Authenticity Verification", "luxury", 
                "Product must pass authenticity verification", "ISO", 5);
        _addRule("ETHICS_001", "Ethical Sourcing", "luxury", 
                "Materials must be ethically sourced", "FAIRTRADE", 3);
        _addRule("CERT_001", "Certification Requirements", "luxury", 
                "Must have valid certification", "ISO", 4);
        
        // Electronics compliance rules
        _addRule("CE_001", "CE Marking", "electronics", 
                "Product must have valid CE marking", "CE", 4);
        _addRule("ROHS_001", "RoHS Compliance", "electronics", 
                "Must comply with RoHS directive", "CE", 3);
        _addRule("WEEE_001", "WEEE Compliance", "electronics", 
                "Must comply with WEEE directive", "CE", 3);
        
        // Food and beverage compliance rules
        _addRule("HACCP_001", "HACCP System", "food", 
                "Must implement HACCP system", "HACCP", 5);
        _addRule("ALLERGEN_001", "Allergen Declaration", "food", 
                "Must declare all allergens", "ISO", 4);
        _addRule("TRACE_001", "Traceability System", "food", 
                "Must have traceability system", "ISO", 3);
    }
    
    /**
     * @dev Internal function to add a rule
     */
    function _addRule(
        string memory ruleId,
        string memory ruleName,
        string memory productType,
        string memory requirement,
        string memory standard,
        uint256 severity
    ) internal {
        complianceRules[ruleId] = ComplianceRule({
            ruleId: ruleId,
            ruleName: ruleName,
            productType: productType,
            requirement: requirement,
            standard: standard,
            severity: severity,
            isActive: true,
            createdDate: block.timestamp,
            creator: owner()
        });
        
        activeRuleIds.push(ruleId);
        
        if (!_isProductTypeSupported(productType)) {
            supportedProductTypes.push(productType);
        }
    }
    
    /**
     * @dev Emergency pause function
     */
    function emergencyPause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Emergency unpause function
     */
    function emergencyUnpause() external onlyOwner {
        _unpause();
    }
}
