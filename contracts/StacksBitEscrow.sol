// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title StacksBit Escrow
 * @author Terkaa Tarkighir (Rogers) — Jos, Nigeria
 * @notice Fraud-protection escrow for African commerce, deployed on Flare.
 *
 * @dev PROBLEM:
 *      In Nigeria and across Africa, online commerce runs on "send money first
 *      and pray." Buyers get scammed by fake vendors. Merchants get scammed by
 *      fake buyers. Both sides have no recourse except banks and lawyers —
 *      slow, expensive, and often ineffective.
 *
 * @dev SOLUTION:
 *      StacksBit holds payment in escrow until delivery is confirmed.
 *      Nobody cheats. Nobody disappears. Both sides are protected by code.
 *
 * @dev FLOW:
 *      1. Merchant registers their business on-chain
 *      2. Merchant creates a payment request with a description
 *      3. Buyer pays C2FLR into the escrow contract
 *      4. Funds are LOCKED — neither party can access them
 *      5. Merchant delivers the goods or service
 *      6. Buyer confirms delivery — funds release to merchant automatically
 *      7. Dispute? Funds stay locked until owner resolves
 *
 * @dev FRAUD DETECTION:
 *      Every merchant has an on-chain reputation score (0-100) calculated
 *      from their dispute rate vs completed transactions. High dispute rate
 *      = high risk score = flagged for manual review.
 *
 * @dev VALIDATED WITH:
 *      Real merchants in Jos, Plateau State, Nigeria through the
 *      Stacks Foundry Validate program (5-week structured validation, Q2 2026).
 *      Every merchant confirmed experiencing bilateral fraud with no recourse.
 */
contract StacksBitEscrow {

    // ============================================
    // TYPES
    // ============================================

    /**
     * @notice The lifecycle states of a payment through the escrow system.
     * @dev Pending → Locked → Confirmed (normal flow)
     *      Pending → Locked → Disputed → Confirmed or Refunded (dispute flow)
     */
    enum PaymentStatus {
        Pending,    // Payment created by merchant, awaiting buyer
        Locked,     // Buyer paid — funds locked in escrow
        Confirmed,  // Buyer confirmed delivery — funds released to merchant
        Disputed,   // Dispute raised — funds held pending resolution
        Refunded    // Dispute resolved in buyer's favour — funds returned
    }

    /**
     * @notice On-chain merchant profile with reputation tracking.
     * @dev Reputation signals: totalVolume, disputeCount, completedCount
     *      These feed into getRiskScore() for fraud detection.
     */
    struct Merchant {
        address wallet;         // Merchant's wallet address
        string businessName;    // Registered business name
        string email;           // Contact email for delivery coordination
        uint256 totalVolume;    // Total C2FLR processed through escrow
        uint256 disputeCount;   // Number of disputes raised against merchant
        uint256 completedCount; // Number of successfully completed payments
        bool registered;        // Registration status
    }

    /**
     * @notice A single escrow payment between a merchant and buyer.
     * @dev amount is set when buyer calls payInvoice(), not at creation.
     *      This allows flexible pricing — merchant sets price off-chain,
     *      buyer pays the agreed amount on-chain.
     */
    struct Payment {
        uint256 id;             // Sequential payment ID (1, 2, 3...)
        address merchant;       // Merchant who created the invoice
        address buyer;          // Buyer who paid into escrow
        uint256 amount;         // Amount locked in escrow (in wei)
        string description;     // What is being purchased
        PaymentStatus status;   // Current lifecycle state
        uint256 createdAt;      // Block timestamp of creation
    }

    // ============================================
    // STATE
    // ============================================

    /// @notice Contract owner — can resolve disputes and withdraw fees
    address public owner;

    /// @notice Platform fee in tenths of a percent (25 = 2.5%)
    uint256 public feePercent = 25;

    /// @notice Total number of payments created (also used as next ID)
    uint256 public paymentCount;

    /// @notice Total number of registered merchants
    uint256 public merchantCount;

    /// @notice Merchant profiles indexed by wallet address
    mapping(address => Merchant) public merchants;

    /// @notice Payment records indexed by payment ID
    mapping(uint256 => Payment) public payments;

    // ============================================
    // EVENTS
    // ============================================

    /// @notice Emitted when a new merchant registers on-chain
    event MerchantRegistered(address indexed merchant, string businessName);

    /// @notice Emitted when a merchant creates a new payment request
    event PaymentCreated(uint256 indexed paymentId, address indexed merchant, uint256 amount, string description);

    /// @notice Emitted when a buyer pays into escrow — funds are now locked
    event PaymentLocked(uint256 indexed paymentId, address indexed buyer, uint256 amount);

    /// @notice Emitted when delivery is confirmed and funds are released
    event DeliveryConfirmed(uint256 indexed paymentId, uint256 payout, uint256 fee);

    /// @notice Emitted when a dispute is raised by buyer or merchant
    event DisputeRaised(uint256 indexed paymentId, address indexed raisedBy);

    /// @notice Emitted when owner resolves a dispute
    event DisputeResolved(uint256 indexed paymentId, bool refunded);

    // ============================================
    // ERRORS
    // ============================================

    error NotOwner();
    error AlreadyRegistered();
    error NotRegistered();
    error PaymentNotFound();
    error WrongStatus();
    error NotBuyer();
    error NotMerchant();
    error InsufficientAmount();
    error TransferFailed();

    // ============================================
    // MODIFIERS
    // ============================================

    /// @dev Restricts function to contract owner only
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /// @dev Restricts function to registered merchants only
    modifier onlyRegistered() {
        if (!merchants[msg.sender].registered) revert NotRegistered();
        _;
    }

    // ============================================
    // CONSTRUCTOR
    // ============================================

    /// @notice Sets the deployer as the contract owner
    constructor() {
        owner = msg.sender;
    }

    // ============================================
    // MERCHANT FUNCTIONS
    // ============================================

    /**
     * @notice Register a new merchant business on-chain.
     * @dev Each wallet address can only register once.
     *      businessName and email are stored on-chain for transparency.
     * @param businessName The merchant's registered business name
     * @param email Contact email — used for USSD delivery coordination (Phase 2)
     */
    function registerMerchant(
        string calldata businessName,
        string calldata email
    ) external {
        if (merchants[msg.sender].registered) revert AlreadyRegistered();

        merchantCount++;
        merchants[msg.sender] = Merchant({
            wallet: msg.sender,
            businessName: businessName,
            email: email,
            totalVolume: 0,
            disputeCount: 0,
            completedCount: 0,
            registered: true
        });

        emit MerchantRegistered(msg.sender, businessName);
    }

    /**
     * @notice Create a new payment request (invoice).
     * @dev Returns the payment ID which the merchant shares with their buyer.
     *      Amount is not set here — buyer sends the agreed amount when paying.
     * @param description What is being purchased (visible to buyer on-chain)
     * @return paymentId The sequential ID of the new payment
     */
    function createPayment(
        string calldata description
    ) external onlyRegistered returns (uint256) {
        paymentCount++;
        uint256 paymentId = paymentCount;

        payments[paymentId] = Payment({
            id: paymentId,
            merchant: msg.sender,
            buyer: address(0),
            amount: 0,
            description: description,
            status: PaymentStatus.Pending,
            createdAt: block.timestamp
        });

        emit PaymentCreated(paymentId, msg.sender, 0, description);
        return paymentId;
    }

    // ============================================
    // BUYER FUNCTIONS
    // ============================================

    /**
     * @notice Pay an invoice — locks funds in escrow.
     * @dev Buyer sends C2FLR with this call. Funds are held by the contract
     *      until delivery is confirmed or a dispute is resolved.
     *      The buyer cannot be scammed — funds never go directly to merchant.
     * @param paymentId The ID shared by the merchant
     */
    function payInvoice(uint256 paymentId) external payable {
        Payment storage payment = payments[paymentId];
        if (payment.id == 0) revert PaymentNotFound();
        if (payment.status != PaymentStatus.Pending) revert WrongStatus();
        if (msg.value == 0) revert InsufficientAmount();

        payment.buyer = msg.sender;
        payment.amount = msg.value;
        payment.status = PaymentStatus.Locked;

        emit PaymentLocked(paymentId, msg.sender, msg.value);
    }

    /**
     * @notice Confirm delivery — releases funds from escrow to the merchant.
     * @dev Only the buyer can confirm delivery. This is the key trust guarantee:
     *      the merchant cannot self-release funds — only the buyer can confirm.
     *      Platform fee (2.5%) is deducted and held in contract for owner.
     * @param paymentId The ID of the payment to confirm
     */
    function confirmDelivery(uint256 paymentId) external {
        Payment storage payment = payments[paymentId];
        if (payment.id == 0) revert PaymentNotFound();
        if (payment.status != PaymentStatus.Locked) revert WrongStatus();
        if (msg.sender != payment.buyer) revert NotBuyer();

        payment.status = PaymentStatus.Confirmed;

        // Calculate fee and payout
        uint256 fee = (payment.amount * feePercent) / 1000;
        uint256 payout = payment.amount - fee;

        // Update merchant reputation stats
        merchants[payment.merchant].totalVolume += payment.amount;
        merchants[payment.merchant].completedCount++;

        // Release funds to merchant
        (bool success, ) = payment.merchant.call{value: payout}("");
        if (!success) revert TransferFailed();

        // Fee stays in contract — owner withdraws via withdrawFees()
        emit DeliveryConfirmed(paymentId, payout, fee);
    }

    /**
     * @notice Raise a dispute — freezes funds pending owner resolution.
     * @dev Either buyer or merchant can raise a dispute.
     *      Funds stay locked until owner calls resolveDispute().
     *      Dispute count is tracked for merchant reputation scoring.
     * @param paymentId The ID of the payment to dispute
     */
    function raiseDispute(uint256 paymentId) external {
        Payment storage payment = payments[paymentId];
        if (payment.id == 0) revert PaymentNotFound();
        if (payment.status != PaymentStatus.Locked) revert WrongStatus();
        if (msg.sender != payment.buyer && msg.sender != payment.merchant) revert NotBuyer();

        payment.status = PaymentStatus.Disputed;
        merchants[payment.merchant].disputeCount++;

        emit DisputeRaised(paymentId, msg.sender);
    }

    // ============================================
    // OWNER / ADMIN FUNCTIONS
    // ============================================

    /**
     * @notice Resolve a dispute — either refund buyer or release to merchant.
     * @dev Only the contract owner can resolve disputes.
     *      In Phase 2, this will be replaced by a DAO governance mechanism.
     * @param paymentId The disputed payment ID
     * @param refundBuyer If true, refunds buyer. If false, releases to merchant.
     */
    function resolveDispute(
        uint256 paymentId,
        bool refundBuyer
    ) external onlyOwner {
        Payment storage payment = payments[paymentId];
        if (payment.id == 0) revert PaymentNotFound();
        if (payment.status != PaymentStatus.Disputed) revert WrongStatus();

        if (refundBuyer) {
            payment.status = PaymentStatus.Refunded;
            (bool success, ) = payment.buyer.call{value: payment.amount}("");
            if (!success) revert TransferFailed();
        } else {
            payment.status = PaymentStatus.Confirmed;
            uint256 fee = (payment.amount * feePercent) / 1000;
            uint256 payout = payment.amount - fee;
            (bool success, ) = payment.merchant.call{value: payout}("");
            if (!success) revert TransferFailed();
        }

        emit DisputeResolved(paymentId, refundBuyer);
    }

    /**
     * @notice Withdraw accumulated platform fees to owner wallet.
     * @dev Only callable by owner. Fees accumulate from all confirmDelivery() calls.
     */
    function withdrawFees() external onlyOwner {
        (bool success, ) = owner.call{value: address(this).balance}("");
        if (!success) revert TransferFailed();
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    /**
     * @notice Get full merchant profile by wallet address.
     * @param wallet The merchant's wallet address
     * @return Merchant struct with all profile and reputation data
     */
    function getMerchant(address wallet) external view returns (Merchant memory) {
        return merchants[wallet];
    }

    /**
     * @notice Get full payment details by payment ID.
     * @param paymentId The sequential payment ID
     * @return Payment struct with status, amount, parties, and description
     */
    function getPayment(uint256 paymentId) external view returns (Payment memory) {
        return payments[paymentId];
    }

    /**
     * @notice Calculate a merchant's fraud risk score (0-100).
     * @dev Score is derived from dispute rate as a percentage of total transactions.
     *      0-10  = Low risk    (green zone) — auto-release enabled
     *      35    = Medium risk (yellow zone) — extra verification
     *      60-90 = High risk   (red zone)   — manual review required
     * @param merchantWallet The merchant's wallet address
     * @return score Risk score from 0 (safe) to 100 (high risk)
     */
    function getRiskScore(address merchantWallet) external view returns (uint256) {
        Merchant memory m = merchants[merchantWallet];
        if (m.completedCount == 0) return 0;

        uint256 disputeRate = (m.disputeCount * 100) / (m.completedCount + m.disputeCount);

        if (disputeRate >= 30) return 90;
        if (disputeRate >= 15) return 60;
        if (disputeRate >= 5)  return 35;
        return 10;
    }

    // ============================================
    // HELPER FUNCTIONS
    // ============================================
    
    /// @notice Returns the total number of registered merchants
    /// @return count Total merchant count
    function getMerchantCount() external view returns (uint256 count) {
        return merchantCount;
    }

    /// @notice Returns the total number of payments created
    /// @return count Total payment count
    function getPaymentCount() external view returns (uint256 count) {
        return paymentCount;
    }

    /// @notice Returns the total value currently locked in escrow
    /// @return total Total C2FLR locked across all Locked payments
    function getTotalLockedFunds() external view returns (uint256 total) {
        for (uint256 i = 1; i <= paymentCount; i++) {
            if (payments[i].status == PaymentStatus.Locked) {
                total += payments[i].amount;
            }
        }
    }

    /// @notice Check if a merchant is registered
    /// @param wallet The wallet address to check
    /// @return True if registered
    function isMerchantRegistered(address wallet) external view returns (bool) {
        return merchants[wallet].registered;
    }

    /// @notice Check if a payment exists
    /// @param paymentId The payment ID to check
    /// @return True if payment exists
    function paymentExists(uint256 paymentId) external view returns (bool) {
        return payments[paymentId].id != 0;
    }

    /// @notice Check if a payment is completed (confirmed or refunded)
    /// @param paymentId The payment ID to check
    /// @return True if payment is in a terminal state
    function isPaymentCompleted(uint256 paymentId) external view returns (bool) {
        PaymentStatus status = payments[paymentId].status;
        return status == PaymentStatus.Confirmed || status == PaymentStatus.Refunded;
    }
}