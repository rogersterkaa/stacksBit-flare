# StacksBit

**Trust Infrastructure for Bitcoin Commerce**

> Non-custodial escrow infrastructure designed to help buyers and merchants transact safely using blockchain-based escrow and transparent settlement across Bitcoin and compatible networks.

> **⚠️ MAINNET NOTICE**
>
> StacksBit is deployed and verified on BOT Chain Mainnet, but the production escrow contract is **not yet approved for real customer funds**. Pre-audit security remediation is currently in progress. Formal security review, remediation, retesting, and launch approval are required before real customer deposits are accepted.

---

## DEPLOYMENT & SECURITY STATUS

| Environment | Status | Customer Funds | Details |
|---|---|---|---|
| BOT Chain Mainnet | Deployed & verified | ❌ Not approved | Audit pending |
| BOT Chain Testnet | Testing | ❌ No real funds | For integration testing |
| Flare Coston2 | Historical | ❌ No real funds | Reference deployment |
| Stacks Testnet | Reference | ❌ No real funds | Original Clarity implementation |

> **Important:** Mainnet deployment does not mean production approval. The BOT Chain Mainnet contract is currently undergoing pre-audit remediation. StacksBit will not intentionally accept real customer funds until the required security review, remediation, retesting, and launch approvals have been completed.

---

## 🟢 MAINNET DEPLOYMENT — AUDIT PENDING

**Network:** BOT Chain Mainnet (ChainID 677)  
**Contract Address:** `0x7D4d65AA41dA0e321ad52e46E9120F07D55B5284`  
**Explorer:** https://scan.botchain.ai/address/0x7D4d65AA41dA0e321ad52e46E9120F07D55B5284  
**Status:** Deployed and verified on-chain  
**Last Deploy TX:** 0xa1728062cd09ce135bb864ed6614b116470cb671508235d6466a8ea3f1002f88  
**Compiler:** Solidity ^0.8.0  

---

## ARCHITECTURE
                    StacksBit
                       │
          ┌────────────┴────────────┐
          │                         │
   Stacks Testnet            BOT Chain Mainnet
          │                         │
  Clarity Contracts        Solidity Escrow Contract
          │                         │
      Reference             Deployed / Verified
                                    │
                              Audit Pending
                                    │
                          Real Funds NOT Approved

---

## QUICK START

### For Testing

BOT Chain Testnet (ChainID 968) is available for network/integration testing.

- Faucet: https://faucet.botchain.ai
- Network: BOT Chain Testnet
- Chain ID: 968

> The current production escrow deployment is on BOT Chain Mainnet.
> Do not use the mainnet contract for testing with real funds.

### For Audit/Review

Review the mainnet deployment:
- Repository: https://github.com/rogersterkaa/stacksbit-flare
- Branch: `main`
- Contract: `contracts/StacksBitEscrow.sol`
- Deployment: BOT Chain Mainnet

---

## REPOSITORY STRUCTURE

stacksbit-flare/
├── contracts/
│ └── StacksBitEscrow.sol # Main escrow contract (Solidity)
├── scripts/
│ ├── deploy.ts # BOT Chain mainnet deployment
│ ├── test-bot-testnet.ts # Testnet verification
│ └── test-bot-mainnet.ts # Mainnet verification
├── hardhat.config.ts # Network configuration
├── PRE_AUDIT_REMEDIATION.md # Security remediation roadmap
└── README.md # This file


---

## SECURITY & AUDIT

**Auditor:** Arctek Audits (https://arctekaudits.com)  
**Recommended Audit Scope:** Package 3 — Critical Path Review  
**Current Status:** Pre-audit remediation in progress; formal audit not yet commissioned.

See `PRE_AUDIT_REMEDIATION.md` for detailed security roadmap and timeline.

**Critical commitment:** StacksBit will not accept real customer funds until security review and audit completion.

---

## NETWORKS & CONTRACTS

| Network | ChainID | Contract | Status | Purpose |
|---------|---------|----------|--------|---------|
| BOT Chain Mainnet | 677 | 0x7D4d65AA41dA0e321ad52e46E9120F07D55B5284 | Deployed | Audit pending |
| BOT Chain Testnet | 968 | Available | Testing | Network/integration testing |
| Flare Coston2 | 114 | 0xd0D794E8ea1B7048a1E0F9afddB188a309EA6F66 | Historical | Reference only |
| Stacks Testnet | - | (Clarity) | Reference | Original implementation |

---

## WHAT IS STACKSBIT?

StacksBit solves the bilateral trust problem in Bitcoin commerce:

- **Merchant Risk:** How do I know the buyer will pay after I send goods?
- **Buyer Risk:** How do I know I'll receive goods after I send payment?

**Solution:** Non-custodial smart contract escrow where:
1. Buyer locks funds in the contract
2. Merchant delivers goods
3. Buyer confirms delivery
4. Funds are released to merchant automatically
5. If dispute, on-chain resolution

---

## DEVELOPMENT

### Prerequisites
- Node.js 18+
- npm or yarn
- Hardhat

### Install & Deploy

```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Deploy to BOT Chain mainnet
npx hardhat run scripts/deploy.ts --network botMainnet

# Verify on-chain
npx hardhat verify --network botMainnet <CONTRACT_ADDRESS>
```

### Testing

```bash
# Run test suite
npx hardhat test

# Test mainnet deployment
npx hardhat run scripts/test-bot-mainnet.ts --network botMainnet
```

---

## FRONTEND

**React Frontend:** https://github.com/rogersterkaa/stacksbit-react  
**Live Demo:** https://stacksbit-react.vercel.app  

Dual-chain support:
- Stacks wallets (Leather, Xverse)
- EVM wallets (MetaMask) on BOT Chain

---

## CONTACT & SUPPORT

**Developer:** Rogers Terkaa (rogersterkaa@gmail.com)  
**GitHub:** https://github.com/rogersterkaa  
**StacksBit:** https://stacksbit.com  

---

**Last Updated:** September 8, 2026  
**Repository:** https://github.com/rogersterkaa/stacksbit-flare