// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title PaymentContract
 * @dev Automated payments and escrow for supply chain transactions
 * @notice This contract handles payments, escrow, and dispute resolution
 */
contract PaymentContract is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    struct Payment {
        uint256 paymentId;
        address payer;
        address payee;
        uint256 amount;
        uint256 productId;
        string paymentType; // "escrow", "milestone", "final", "penalty"
        bool isCompleted;
        bool isDisputed;
        bool isCancelled;
        uint256 createdDate;
        uint256 dueDate;
        uint256 releaseDate;
        string conditions;
        string metadata;
    }

    struct Dispute {
        uint256 disputeId;
        uint256 paymentId;
        address initiator;
        string reason;
        string evidence;
        bool isResolved;
        address arbitrator;
        uint256 resolutionDate;
        bool favorPayer;
        string resolution;
    }

    struct Milestone {
        uint256 milestoneId;
        uint256 paymentId;
        string description;
        uint256 amount;
        bool isCompleted;
        uint256 dueDate;
        string deliverables;
    }

    // Mappings
    mapping(uint256 => Payment) public payments;
    mapping(uint256 => Dispute) public disputes;
    mapping(uint256 => Milestone[]) public paymentMilestones;
    mapping(address => uint256[]) public userPayments;
    mapping(address => uint256[]) public userDisputes;
    mapping(address => bool) public authorizedArbitrators;
    
    // Payment configuration
    uint256 public platformFeePercentage = 250; // 2.5%
    uint256 public disputeResolutionFee = 100 * 10**18; // 100 tokens
    uint256 public constant MAX_PLATFORM_FEE = 1000; // 10%
    uint256 public constant MIN_PAYMENT_AMOUNT = 1 * 10**18; // 1 token minimum
    uint256 public constant MAX_PAYMENT_AMOUNT = 1000000 * 10**18; // 1M tokens maximum
    uint256 public constant DISPUTE_TIMEOUT = 7 days;
    uint256 public constant MIN_ESCROW_DURATION = 1 days;
    
    // State variables
    uint256 public nextPaymentId = 1;
    uint256 public nextDisputeId = 1;
    address public feeRecipient;
    IERC20 public paymentToken; // USDC or similar stablecoin
    IERC20 public disputeToken; // TRACE token for dispute fees
    
    // Events
    event PaymentCreated(
        uint256 indexed paymentId,
        address indexed payer,
        address indexed payee,
        uint256 amount,
        string paymentType
    );
    event PaymentCompleted(uint256 indexed paymentId, uint256 amount);
    event PaymentCancelled(uint256 indexed paymentId, string reason);
    event DisputeInitiated(uint256 indexed disputeId, uint256 indexed paymentId, address initiator);
    event DisputeResolved(uint256 indexed disputeId, bool favorPayer, string resolution);
    event MilestoneCreated(uint256 indexed paymentId, uint256 indexed milestoneId, uint256 amount);
    event MilestoneCompleted(uint256 indexed paymentId, uint256 indexed milestoneId);
    event ArbitratorAuthorized(address indexed arbitrator, bool authorized);
    event PlatformFeeUpdated(uint256 newFeePercentage);
    event FeeRecipientUpdated(address newRecipient);
    
    modifier validPaymentId(uint256 paymentId) {
        require(paymentId > 0 && paymentId < nextPaymentId, "Payment not found");
        _;
    }
    
    modifier validDisputeId(uint256 disputeId) {
        require(disputeId > 0 && disputeId < nextDisputeId, "Dispute not found");
        _;
    }
    
    modifier onlyArbitrator() {
        require(authorizedArbitrators[msg.sender] || msg.sender == owner(), "Not authorized arbitrator");
        _;
    }
    
    constructor(address _paymentToken, address _disputeToken, address _feeRecipient) {
        require(_paymentToken != address(0), "Invalid payment token address");
        require(_disputeToken != address(0), "Invalid dispute token address");
        require(_feeRecipient != address(0), "Invalid fee recipient address");
        
        paymentToken = IERC20(_paymentToken);
        disputeToken = IERC20(_disputeToken);
        feeRecipient = _feeRecipient;
        
        // Authorize owner as arbitrator
        authorizedArbitrators[owner()] = true;
    }
    
    /**
     * @dev Create an escrow payment
     * @param payee Address to receive payment
     * @param amount Amount to pay
     * @param productId Associated product ID
     * @param dueDate When payment should be released
     * @param conditions Conditions for release
     * @param metadata Additional metadata
     */
    function createEscrowPayment(
        address payee,
        uint256 amount,
        uint256 productId,
        uint256 dueDate,
        string memory conditions,
        string memory metadata
    ) external whenNotPaused nonReentrant returns (uint256) {
        require(payee != address(0), "Invalid payee address");
        require(amount >= MIN_PAYMENT_AMOUNT, "Amount below minimum");
        require(amount <= MAX_PAYMENT_AMOUNT, "Amount above maximum");
        require(dueDate > block.timestamp, "Due date must be in future");
        require(dueDate <= block.timestamp.add(365 days), "Due date too far in future");
        
        uint256 paymentId = nextPaymentId++;
        uint256 platformFee = amount.mul(platformFeePercentage).div(10000);
        uint256 totalAmount = amount.add(platformFee);
        
        // Transfer tokens to contract
        paymentToken.safeTransferFrom(msg.sender, address(this), totalAmount);
        
        payments[paymentId] = Payment({
            paymentId: paymentId,
            payer: msg.sender,
            payee: payee,
            amount: amount,
            productId: productId,
            paymentType: "escrow",
            isCompleted: false,
            isDisputed: false,
            isCancelled: false,
            createdDate: block.timestamp,
            dueDate: dueDate,
            releaseDate: 0,
            conditions: conditions,
            metadata: metadata
        });
        
        userPayments[msg.sender].push(paymentId);
        userPayments[payee].push(paymentId);
        
        emit PaymentCreated(paymentId, msg.sender, payee, amount, "escrow");
        
        return paymentId;
    }
    
    /**
     * @dev Create a milestone-based payment
     * @param payee Address to receive payment
     * @param totalAmount Total amount for all milestones
     * @param productId Associated product ID
     * @param dueDate When payment should be completed
     * @param milestones Array of milestone descriptions and amounts
     */
    function createMilestonePayment(
        address payee,
        uint256 totalAmount,
        uint256 productId,
        uint256 dueDate,
        string[] memory milestones,
        uint256[] memory milestoneAmounts
    ) external whenNotPaused nonReentrant returns (uint256) {
        require(payee != address(0), "Invalid payee address");
        require(totalAmount >= MIN_PAYMENT_AMOUNT, "Amount below minimum");
        require(totalAmount <= MAX_PAYMENT_AMOUNT, "Amount above maximum");
        require(milestones.length == milestoneAmounts.length, "Arrays length mismatch");
        require(milestones.length > 0 && milestones.length <= 10, "Invalid milestones count");
        
        // Verify milestone amounts sum to total
        uint256 sum = 0;
        for (uint256 i = 0; i < milestoneAmounts.length; i++) {
            sum = sum.add(milestoneAmounts[i]);
        }
        require(sum == totalAmount, "Milestone amounts don't sum to total");
        
        uint256 paymentId = nextPaymentId++;
        uint256 platformFee = totalAmount.mul(platformFeePercentage).div(10000);
        uint256 totalAmountWithFee = totalAmount.add(platformFee);
        
        // Transfer tokens to contract
        paymentToken.safeTransferFrom(msg.sender, address(this), totalAmountWithFee);
        
        payments[paymentId] = Payment({
            paymentId: paymentId,
            payer: msg.sender,
            payee: payee,
            amount: totalAmount,
            productId: productId,
            paymentType: "milestone",
            isCompleted: false,
            isDisputed: false,
            isCancelled: false,
            createdDate: block.timestamp,
            dueDate: dueDate,
            releaseDate: 0,
            conditions: "Milestone-based payment",
            metadata: ""
        });
        
        // Create milestones
        for (uint256 i = 0; i < milestones.length; i++) {
            paymentMilestones[paymentId].push(Milestone({
                milestoneId: i,
                paymentId: paymentId,
                description: milestones[i],
                amount: milestoneAmounts[i],
                isCompleted: false,
                dueDate: dueDate,
                deliverables: ""
            }));
            
            emit MilestoneCreated(paymentId, i, milestoneAmounts[i]);
        }
        
        userPayments[msg.sender].push(paymentId);
        userPayments[payee].push(paymentId);
        
        emit PaymentCreated(paymentId, msg.sender, payee, totalAmount, "milestone");
        
        return paymentId;
    }
    
    /**
     * @dev Release payment to payee
     * @param paymentId Payment identifier
     */
    function releasePayment(uint256 paymentId) external validPaymentId(paymentId) whenNotPaused nonReentrant {
        Payment storage payment = payments[paymentId];
        require(!payment.isCompleted, "Payment already completed");
        require(!payment.isDisputed, "Payment is disputed");
        require(!payment.isCancelled, "Payment is cancelled");
        require(payment.payer == msg.sender, "Only payer can release");
        require(block.timestamp >= payment.createdDate.add(MIN_ESCROW_DURATION), "Minimum hold period not met");
        
        payment.isCompleted = true;
        payment.releaseDate = block.timestamp;
        
        // Transfer payment to payee
        paymentToken.safeTransfer(payment.payee, payment.amount);
        
        // Transfer platform fee to fee recipient
        uint256 platformFee = payment.amount.mul(platformFeePercentage).div(10000);
        paymentToken.safeTransfer(feeRecipient, platformFee);
        
        emit PaymentCompleted(paymentId, payment.amount);
    }
    
    /**
     * @dev Complete a milestone and release partial payment
     * @param paymentId Payment identifier
     * @param milestoneId Milestone identifier
     * @param deliverables Deliverables for the milestone
     */
    function completeMilestone(
        uint256 paymentId,
        uint256 milestoneId,
        string memory deliverables
    ) external validPaymentId(paymentId) whenNotPaused nonReentrant {
        Payment storage payment = payments[paymentId];
        require(payment.paymentType == "milestone", "Not a milestone payment");
        require(!payment.isCompleted, "Payment already completed");
        require(!payment.isDisputed, "Payment is disputed");
        require(payment.payee == msg.sender, "Only payee can complete milestone");
        require(milestoneId < paymentMilestones[paymentId].length, "Invalid milestone ID");
        
        Milestone storage milestone = paymentMilestones[paymentId][milestoneId];
        require(!milestone.isCompleted, "Milestone already completed");
        
        milestone.isCompleted = true;
        milestone.deliverables = deliverables;
        
        // Release milestone payment
        paymentToken.safeTransfer(payment.payee, milestone.amount);
        
        emit MilestoneCompleted(paymentId, milestoneId);
        
        // Check if all milestones are completed
        bool allCompleted = true;
        for (uint256 i = 0; i < paymentMilestones[paymentId].length; i++) {
            if (!paymentMilestones[paymentId][i].isCompleted) {
                allCompleted = false;
                break;
            }
        }
        
        if (allCompleted) {
            payment.isCompleted = true;
            payment.releaseDate = block.timestamp;
            
            // Transfer platform fee
            uint256 platformFee = payment.amount.mul(platformFeePercentage).div(10000);
            paymentToken.safeTransfer(feeRecipient, platformFee);
            
            emit PaymentCompleted(paymentId, payment.amount);
        }
    }
    
    /**
     * @dev Cancel a payment
     * @param paymentId Payment identifier
     * @param reason Reason for cancellation
     */
    function cancelPayment(uint256 paymentId, string memory reason) 
        external 
        validPaymentId(paymentId) 
        whenNotPaused 
        nonReentrant 
    {
        Payment storage payment = payments[paymentId];
        require(!payment.isCompleted, "Payment already completed");
        require(!payment.isDisputed, "Payment is disputed");
        require(!payment.isCancelled, "Payment already cancelled");
        require(
            msg.sender == payment.payer || msg.sender == payment.payee,
            "Only parties can cancel"
        );
        
        payment.isCancelled = true;
        
        // Refund to payer (including platform fee)
        uint256 platformFee = payment.amount.mul(platformFeePercentage).div(10000);
        uint256 totalRefund = payment.amount.add(platformFee);
        paymentToken.safeTransfer(payment.payer, totalRefund);
        
        emit PaymentCancelled(paymentId, reason);
    }
    
    /**
     * @dev Initiate a dispute
     * @param paymentId Payment identifier
     * @param reason Reason for dispute
     * @param evidence Evidence supporting the dispute
     */
    function initiateDispute(
        uint256 paymentId,
        string memory reason,
        string memory evidence
    ) external validPaymentId(paymentId) whenNotPaused nonReentrant returns (uint256) {
        Payment storage payment = payments[paymentId];
        require(!payment.isCompleted, "Payment already completed");
        require(!payment.isDisputed, "Dispute already initiated");
        require(!payment.isCancelled, "Payment is cancelled");
        require(
            msg.sender == payment.payer || msg.sender == payment.payee,
            "Only parties can dispute"
        );
        require(bytes(reason).length > 0, "Reason required");
        
        // Collect dispute fee
        disputeToken.safeTransferFrom(msg.sender, address(this), disputeResolutionFee);
        
        uint256 disputeId = nextDisputeId++;
        
        disputes[disputeId] = Dispute({
            disputeId: disputeId,
            paymentId: paymentId,
            initiator: msg.sender,
            reason: reason,
            evidence: evidence,
            isResolved: false,
            arbitrator: address(0),
            resolutionDate: 0,
            favorPayer: false,
            resolution: ""
        });
        
        payment.isDisputed = true;
        userDisputes[msg.sender].push(disputeId);
        
        emit DisputeInitiated(disputeId, paymentId, msg.sender);
        
        return disputeId;
    }
    
    /**
     * @dev Resolve a dispute
     * @param disputeId Dispute identifier
     * @param favorPayer Whether to favor the payer
     * @param resolution Resolution details
     */
    function resolveDispute(
        uint256 disputeId,
        bool favorPayer,
        string memory resolution
    ) external onlyArbitrator validDisputeId(disputeId) whenNotPaused nonReentrant {
        Dispute storage dispute = disputes[disputeId];
        require(!dispute.isResolved, "Dispute already resolved");
        
        Payment storage payment = payments[dispute.paymentId];
        require(payment.isDisputed, "Payment not disputed");
        
        dispute.isResolved = true;
        dispute.arbitrator = msg.sender;
        dispute.resolutionDate = block.timestamp;
        dispute.favorPayer = favorPayer;
        dispute.resolution = resolution;
        
        // Resolve payment based on decision
        if (favorPayer) {
            // Refund to payer
            uint256 platformFee = payment.amount.mul(platformFeePercentage).div(10000);
            uint256 totalRefund = payment.amount.add(platformFee);
            paymentToken.safeTransfer(payment.payer, totalRefund);
        } else {
            // Release to payee
            paymentToken.safeTransfer(payment.payee, payment.amount);
            
            uint256 platformFee = payment.amount.mul(platformFeePercentage).div(10000);
            paymentToken.safeTransfer(feeRecipient, platformFee);
        }
        
        payment.isCompleted = true;
        payment.releaseDate = block.timestamp;
        
        // Refund dispute fee to initiator
        disputeToken.safeTransfer(dispute.initiator, disputeResolutionFee);
        
        emit DisputeResolved(disputeId, favorPayer, resolution);
        emit PaymentCompleted(dispute.paymentId, payment.amount);
    }
    
    /**
     * @dev Get payment information
     * @param paymentId Payment identifier
     * @return payment Payment details
     * @return milestones Array of milestones (if applicable)
     */
    function getPayment(uint256 paymentId) 
        external 
        view 
        validPaymentId(paymentId)
        returns (Payment memory payment, Milestone[] memory milestones) 
    {
        payment = payments[paymentId];
        milestones = paymentMilestones[paymentId];
    }
    
    /**
     * @dev Get dispute information
     * @param disputeId Dispute identifier
     * @return dispute Dispute details
     */
    function getDispute(uint256 disputeId) 
        external 
        view 
        validDisputeId(disputeId)
        returns (Dispute memory dispute) 
    {
        dispute = disputes[disputeId];
    }
    
    /**
     * @dev Get user's payments
     * @param user User address
     * @return paymentIds Array of payment IDs
     */
    function getUserPayments(address user) external view returns (uint256[] memory paymentIds) {
        return userPayments[user];
    }
    
    /**
     * @dev Get user's disputes
     * @param user User address
     * @return disputeIds Array of dispute IDs
     */
    function getUserDisputes(address user) external view returns (uint256[] memory disputeIds) {
        return userDisputes[user];
    }
    
    /**
     * @dev Set platform fee percentage
     * @param feePercentage New fee percentage (in basis points)
     */
    function setPlatformFee(uint256 feePercentage) external onlyOwner {
        require(feePercentage <= MAX_PLATFORM_FEE, "Fee too high");
        platformFeePercentage = feePercentage;
        emit PlatformFeeUpdated(feePercentage);
    }
    
    /**
     * @dev Set fee recipient
     * @param newRecipient New fee recipient address
     */
    function setFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid address");
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(newRecipient);
    }
    
    /**
     * @dev Set arbitrator authorization
     * @param arbitrator Arbitrator address
     * @param authorized Whether to authorize or deauthorize
     */
    function setArbitrator(address arbitrator, bool authorized) external onlyOwner {
        require(arbitrator != address(0), "Invalid arbitrator address");
        authorizedArbitrators[arbitrator] = authorized;
        emit ArbitratorAuthorized(arbitrator, authorized);
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
    
    /**
     * @dev Emergency withdraw function
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
}
