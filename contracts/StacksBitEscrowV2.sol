// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title StacksBit Escrow v2
 * @author Terkaa Tarkighir (Rogers) — Jos, Nigeria
 * @notice Fraud-protection escrow for African commerce. Built for BOT Chain (EVM),
 *         originally developed and first deployed on Flare.
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
 *      2. Merchant creates a payment request: a price, a delivery window
 *         (1-14 days) and a description
 *      3. Buyer pays at least the price, in the chain's native asset (BOT),
 *         into the escrow contract
 *      4. Funds are LOCKED — neither party can access them
 *      5. Merchant delivers the goods or service
 *      6. Buyer confirms delivery — funds release to the merchant
 *         automatically, minus the 2.5% platform fee
 *      7. Merchant missed the deadline? The buyer can claim a refund.
 *         Buyer inactive for 7 days after that window? The merchant can claim.
 *      8. Dispute? Funds stay locked until the owner resolves
 *
 * @dev FRAUD DETECTION:
 *      Every merchant has an on-chain risk score (0-100) calculated from the
 *      share of their finished payments that ended in a refund to the buyer
 *      (disputes the merchant lost). High refund rate = high risk score =
 *      flagged for manual review.
 *
 * @dev VALIDATED WITH:
 *      Real merchants in Jos, Plateau State, Nigeria through the
 *      Stacks Foundry Validate program (5-week structured validation, Q2 2026).
 *      Every merchant interviewed confirmed experiencing bilateral fraud with
 *      no recourse (an early, small sample).
 *
 * @dev STATUS: DRAFT v2. Not deployed. Not audited. Do not use with real funds before
 *      tests and a security review.
 *
 * @dev CHANGES FROM v1 (same architecture, same function names where possible):
 *      1. Fees are tracked separately. withdrawFees() can only withdraw fees, never escrowed funds.
 *      2. Merchant sets a required amount and a delivery window (1-14 days) at creation (decisions #15, #9).
 *      3. Buyer may overpay (tip). The 2.5% fee applies to the full amount paid.
 *      4. Delivery deadline: after it, the buyer can claim a refund. If the buyer does nothing for
 *         a further 7 days, the merchant can claim the funds. Disputes can be raised at any time while locked.
 *      5. Merchant can request an extension; it only takes effect if the buyer approves.
 *      6. Dispute outcomes update merchant reputation correctly. The risk score is based on
 *         refunds (disputes the merchant lost), not on every dispute.
 *      7. A merchant cannot pay their own invoice.
 *      8. Reentrancy guard, emergency pause for new activity, ownership transfer (to a multisig).
 *      9. getTotalLockedFunds() is O(1) instead of looping over every payment.
 *     10. NotParticipant error replaces the misleading NotBuyer in raiseDispute().
 *
 * @dev KNOWN LIMITS (by design for the MVP):
 *      - Disputes are resolved by a single owner (use a multisig as owner; DAO governance is Phase 2).
 *      - The merchant "email" string is public blockchain data. Do not send personal emails from the UI.
 */
contract StacksBitEscrowV2 {

    // ============================================
    // TYPES
    // ============================================

    enum PaymentStatus {
        Pending,    // Created by merchant, awaiting buyer
        Locked,     // Buyer paid, funds held in escrow
        Confirmed,  // Funds released to merchant
        Disputed,   // Dispute raised, funds held until the owner resolves
        Refunded    // Funds returned to buyer
    }

    struct Merchant {
        address wallet;
        string businessName;
        string email;
        uint256 totalVolume;     // Total value released to this merchant (before fee)
        uint256 disputeCount;    // Disputes raised on this merchant's payments
        uint256 completedCount;  // Payments that ended with the merchant being paid
        uint256 refundedCount;   // Payments that ended with the buyer being refunded
        bool registered;
    }

    struct Payment {
        uint256 id;
        address merchant;
        address buyer;
        uint256 price;            // Minimum amount the buyer must pay (set by merchant)
        uint256 amount;           // Amount actually locked (price or more)
        string description;
        PaymentStatus status;
        uint256 createdAt;
        uint256 deliveryDays;     // Delivery window chosen by merchant (1-14 days)
        uint256 lockedAt;         // When the buyer paid
        uint256 deadline;         // lockedAt + deliveryDays (can be extended with buyer approval)
        uint256 pendingExtensionDays; // Extension requested by merchant, awaiting buyer approval
    }

    // ============================================
    // CONSTANTS AND STATE
    // ============================================

    uint256 public constant feePercent = 25;           // 25 per 1000 = 2.5%
    uint256 public constant MIN_DELIVERY_DAYS = 1;
    uint256 public constant MAX_DELIVERY_DAYS = 14;
    uint256 public constant MAX_EXTENSION_DAYS = 14;
    uint256 public constant REFUND_WINDOW = 7 days;    // Buyer's window after the deadline to claim a refund

    address public owner;
    bool public paused;

    uint256 public paymentCount;
    uint256 public merchantCount;
    uint256 public accumulatedFees;   // Fees owed to the owner. Only this amount can be withdrawn.
    uint256 public totalLocked;       // Value held for Locked and Disputed payments

    mapping(address => Merchant) public merchants;
    mapping(uint256 => Payment) public payments;

    uint256 private _guard = 1;       // Reentrancy guard: 1 = open, 2 = entered

    // ============================================
    // EVENTS
    // ============================================

    event MerchantRegistered(address indexed merchant, string businessName);
    event PaymentCreated(uint256 indexed paymentId, address indexed merchant, uint256 amount, string description);
    event PaymentLocked(uint256 indexed paymentId, address indexed buyer, uint256 amount);
    event DeliveryConfirmed(uint256 indexed paymentId, uint256 payout, uint256 fee);
    event PaymentRefunded(uint256 indexed paymentId, address indexed buyer, uint256 amount);
    event DisputeRaised(uint256 indexed paymentId, address indexed raisedBy);
    event DisputeResolved(uint256 indexed paymentId, bool refunded);
    event ExtensionRequested(uint256 indexed paymentId, uint256 extraDays);
    event ExtensionApproved(uint256 indexed paymentId, uint256 newDeadline);
    event FeesWithdrawn(address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event PausedSet(bool paused);

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
    error NotParticipant();
    error InsufficientAmount();
    error InvalidPrice();
    error InvalidDays();
    error TransferFailed();
    error TooEarly();
    error TooLate();
    error NoPendingExtension();
    error MerchantCannotBeBuyer();
    error NothingToWithdraw();
    error ZeroAddress();
    error ContractPaused();
    error Reentrancy();

    // ============================================
    // MODIFIERS
    // ============================================

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyRegistered() {
        if (!merchants[msg.sender].registered) revert NotRegistered();
        _;
    }

    /// @dev Pause only blocks NEW activity. Buyers and merchants can always finish existing payments.
    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    modifier nonReentrant() {
        if (_guard == 2) revert Reentrancy();
        _guard = 2;
        _;
        _guard = 1;
    }

    constructor() {
        owner = msg.sender;
    }

    // ============================================
    // MERCHANT FUNCTIONS
    // ============================================

    function registerMerchant(
        string calldata businessName,
        string calldata email
    ) external whenNotPaused {
        if (merchants[msg.sender].registered) revert AlreadyRegistered();

        merchantCount++;
        merchants[msg.sender] = Merchant({
            wallet: msg.sender,
            businessName: businessName,
            email: email,
            totalVolume: 0,
            disputeCount: 0,
            completedCount: 0,
            refundedCount: 0,
            registered: true
        });

        emit MerchantRegistered(msg.sender, businessName);
    }

    /**
     * @notice Create a payment request with a fixed price and delivery window.
     * @param price Minimum amount the buyer must pay (in wei of the native asset)
     * @param deliveryDays Days the merchant has to deliver after the buyer pays (1-14)
     * @param description What is being purchased
     */
    function createPayment(
        uint256 price,
        uint256 deliveryDays,
        string calldata description
    ) external onlyRegistered whenNotPaused returns (uint256) {
        if (price == 0) revert InvalidPrice();
        if (deliveryDays < MIN_DELIVERY_DAYS || deliveryDays > MAX_DELIVERY_DAYS) revert InvalidDays();

        paymentCount++;
        uint256 paymentId = paymentCount;

        payments[paymentId] = Payment({
            id: paymentId,
            merchant: msg.sender,
            buyer: address(0),
            price: price,
            amount: 0,
            description: description,
            status: PaymentStatus.Pending,
            createdAt: block.timestamp,
            deliveryDays: deliveryDays,
            lockedAt: 0,
            deadline: 0,
            pendingExtensionDays: 0
        });

        emit PaymentCreated(paymentId, msg.sender, price, description);
        return paymentId;
    }

    /**
     * @notice Ask for more delivery time. Takes effect only if the buyer approves.
     */
    function requestExtension(uint256 paymentId, uint256 extraDays) external {
        Payment storage p = payments[paymentId];
        if (p.id == 0) revert PaymentNotFound();
        if (msg.sender != p.merchant) revert NotMerchant();
        if (p.status != PaymentStatus.Locked) revert WrongStatus();
        if (block.timestamp > p.deadline) revert TooLate();
        if (extraDays == 0 || extraDays > MAX_EXTENSION_DAYS) revert InvalidDays();

        p.pendingExtensionDays = extraDays;
        emit ExtensionRequested(paymentId, extraDays);
    }

    /**
     * @notice After the buyer's refund window has passed with no action, the merchant can claim the funds.
     * @dev Protects merchants from buyers who receive goods and then disappear.
     *      The buyer can still raise a dispute at any time before this is called.
     */
    function claimAfterGrace(uint256 paymentId) external nonReentrant {
        Payment storage p = payments[paymentId];
        if (p.id == 0) revert PaymentNotFound();
        if (msg.sender != p.merchant) revert NotMerchant();
        if (p.status != PaymentStatus.Locked) revert WrongStatus();
        if (block.timestamp <= p.deadline + REFUND_WINDOW) revert TooEarly();

        _release(p);
    }

    // ============================================
    // BUYER FUNCTIONS
    // ============================================

    /**
     * @notice Pay an invoice. Funds are locked in escrow.
     * @dev Must send at least the price. Anything above the price is an optional tip to the merchant
     *      and is included in the amount the 2.5% fee is calculated on.
     */
    function payInvoice(uint256 paymentId) external payable whenNotPaused {
        Payment storage p = payments[paymentId];
        if (p.id == 0) revert PaymentNotFound();
        if (p.status != PaymentStatus.Pending) revert WrongStatus();
        if (msg.sender == p.merchant) revert MerchantCannotBeBuyer();
        if (msg.value < p.price) revert InsufficientAmount();

        p.buyer = msg.sender;
        p.amount = msg.value;
        p.status = PaymentStatus.Locked;
        p.lockedAt = block.timestamp;
        p.deadline = block.timestamp + (p.deliveryDays * 1 days);
        totalLocked += msg.value;

        emit PaymentLocked(paymentId, msg.sender, msg.value);
    }

    /**
     * @notice Confirm delivery. Releases funds to the merchant minus the platform fee.
     * @dev Only the buyer can do this, so a merchant cannot release funds to themselves.
     */
    function confirmDelivery(uint256 paymentId) external nonReentrant {
        Payment storage p = payments[paymentId];
        if (p.id == 0) revert PaymentNotFound();
        if (p.status != PaymentStatus.Locked) revert WrongStatus();
        if (msg.sender != p.buyer) revert NotBuyer();

        _release(p);
    }

    /**
     * @notice Approve the merchant's request for more delivery time.
     */
    function approveExtension(uint256 paymentId) external {
        Payment storage p = payments[paymentId];
        if (p.id == 0) revert PaymentNotFound();
        if (msg.sender != p.buyer) revert NotBuyer();
        if (p.status != PaymentStatus.Locked) revert WrongStatus();
        if (p.pendingExtensionDays == 0) revert NoPendingExtension();
        if (block.timestamp > p.deadline) revert TooLate();

        p.deadline += p.pendingExtensionDays * 1 days;
        p.pendingExtensionDays = 0;
        emit ExtensionApproved(paymentId, p.deadline);
    }

    /**
     * @notice Claim a refund if the merchant missed the delivery deadline.
     * @dev Available from the deadline until REFUND_WINDOW later. After that the merchant may claim.
     */
    function claimRefund(uint256 paymentId) external nonReentrant {
        Payment storage p = payments[paymentId];
        if (p.id == 0) revert PaymentNotFound();
        if (msg.sender != p.buyer) revert NotBuyer();
        if (p.status != PaymentStatus.Locked) revert WrongStatus();
        if (block.timestamp <= p.deadline) revert TooEarly();
        if (block.timestamp > p.deadline + REFUND_WINDOW) revert TooLate();

        _refund(p);
    }

    // ============================================
    // DISPUTES
    // ============================================

    /**
     * @notice Raise a dispute. Funds stay locked until the owner resolves it.
     * @dev Buyer or merchant, while the payment is Locked.
     */
    function raiseDispute(uint256 paymentId) external {
        Payment storage p = payments[paymentId];
        if (p.id == 0) revert PaymentNotFound();
        if (p.status != PaymentStatus.Locked) revert WrongStatus();
        if (msg.sender != p.buyer && msg.sender != p.merchant) revert NotParticipant();

        p.status = PaymentStatus.Disputed;
        merchants[p.merchant].disputeCount++;

        emit DisputeRaised(paymentId, msg.sender);
    }

    /**
     * @notice Resolve a dispute: refund the buyer or pay the merchant.
     * @dev Owner only. Use a multisig as owner. Phase 2: DAO governance.
     */
    function resolveDispute(uint256 paymentId, bool refundBuyer) external onlyOwner nonReentrant {
        Payment storage p = payments[paymentId];
        if (p.id == 0) revert PaymentNotFound();
        if (p.status != PaymentStatus.Disputed) revert WrongStatus();

        if (refundBuyer) {
            _refund(p);
        } else {
            _release(p);
        }

        emit DisputeResolved(paymentId, refundBuyer);
    }

    // ============================================
    // OWNER FUNCTIONS
    // ============================================

    /// @notice Withdraw platform fees. Escrowed funds can never be withdrawn here.
    function withdrawFees() external onlyOwner nonReentrant {
        uint256 amount = accumulatedFees;
        if (amount == 0) revert NothingToWithdraw();
        accumulatedFees = 0;

        (bool success, ) = owner.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit FeesWithdrawn(owner, amount);
    }

    /// @notice Pause new registrations, payment requests and payments. Existing payments can still finish.
    function setPaused(bool value) external onlyOwner {
        paused = value;
        emit PausedSet(value);
    }

    /// @notice Hand ownership to a new address (for example a multisig wallet).
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ============================================
    // INTERNAL
    // ============================================

    /// @dev Pays the merchant, keeps the fee, updates reputation. State changes happen before the transfer.
    function _release(Payment storage p) internal {
        p.status = PaymentStatus.Confirmed;

        uint256 amount = p.amount;
        uint256 fee = (amount * feePercent) / 1000;
        uint256 payout = amount - fee;

        accumulatedFees += fee;
        totalLocked -= amount;

        Merchant storage m = merchants[p.merchant];
        m.totalVolume += amount;
        m.completedCount++;

        (bool success, ) = p.merchant.call{value: payout}("");
        if (!success) revert TransferFailed();

        emit DeliveryConfirmed(p.id, payout, fee);
    }

    /// @dev Returns the full amount to the buyer (no fee). Updates the merchant's refund count.
    function _refund(Payment storage p) internal {
        p.status = PaymentStatus.Refunded;

        uint256 amount = p.amount;
        totalLocked -= amount;
        merchants[p.merchant].refundedCount++;

        (bool success, ) = p.buyer.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit PaymentRefunded(p.id, p.buyer, amount);
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    function getMerchant(address wallet) external view returns (Merchant memory) {
        return merchants[wallet];
    }

    function getPayment(uint256 paymentId) external view returns (Payment memory) {
        return payments[paymentId];
    }

    /**
     * @notice Fraud risk score from 0 (safe) to 100 (high risk).
     * @dev Based on the share of finished payments that ended in a refund, not on every dispute.
     *      0-10 low, 35 medium, 60-90 high.
     */
    function getRiskScore(address merchantWallet) external view returns (uint256) {
        Merchant memory m = merchants[merchantWallet];
        uint256 finished = m.completedCount + m.refundedCount;
        if (finished == 0) return 0;

        uint256 refundRate = (m.refundedCount * 100) / finished;

        if (refundRate >= 30) return 90;
        if (refundRate >= 15) return 60;
        if (refundRate >= 5) return 35;
        return 10;
    }

    function getMerchantCount() external view returns (uint256) {
        return merchantCount;
    }

    function getPaymentCount() external view returns (uint256) {
        return paymentCount;
    }

    /// @notice Value currently held in escrow (Locked and Disputed payments).
    function getTotalLockedFunds() external view returns (uint256) {
        return totalLocked;
    }

    function isMerchantRegistered(address wallet) external view returns (bool) {
        return merchants[wallet].registered;
    }

    function paymentExists(uint256 paymentId) external view returns (bool) {
        return payments[paymentId].id != 0;
    }

    function isPaymentCompleted(uint256 paymentId) external view returns (bool) {
        PaymentStatus s = payments[paymentId].status;
        return s == PaymentStatus.Confirmed || s == PaymentStatus.Refunded;
    }
}
