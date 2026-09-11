# StacksBit

**Trust Infrastructure for African Commerce**

One Escrow. Multiple Blockchains. Safe Transactions for Africa.

StacksBit is open-source, non-custodial trust infrastructure designed to help African merchants and buyers transact safely using blockchain-based escrow, transparent settlement, risk assessment, and dispute resolution.

---

## The Problem

```mermaid
graph TD
    A["African Merchant"] -->|"Worry: Will buyer pay?"| B["Bilateral Trust Problem"]
    C["African Buyer"] -->|"Worry: Will I get goods?"| B
    B -->|"Result: Transaction doesn't happen"| D["Millions of lost commerce"]
```

- **Merchants ask:** How do I know the buyer will actually pay after I send goods?
- **Buyers ask:** How do I know I'll actually receive what I paid for?

Without trust infrastructure, these transactions don't happen.

---

## The Solution

```mermaid
graph LR
    A["Buyer sends funds"] --> B["Smart Contract Escrow<br/>Funds locked until conditions met"]
    B --> C["Merchant delivers"]
    C --> D["Buyer confirms"]
    D --> E["Funds released automatically"]
    
    style B fill:#4CAF50,stroke:#2E7D32,color:#fff
```

StacksBit uses **blockchain escrow** to solve both risks simultaneously:

- Funds locked in auditable smart contracts
- No company wallet touches merchant money
- Both parties have recourse if dispute occurs
- Settlement is automatic and final
- On-chain reputation prevents repeat bad actors

---

## Architecture: One Protocol, Multiple Blockchains

```mermaid
graph TD
    A["StacksBit Trust Protocol"] 
    A -->|"Same Escrow Engine"| B["Merchant Registration<br/>Payment Lifecycle<br/>Dispute Resolution"]
    
    A -->|"Deployed on"| C["Stacks Testnet"]
    A -->|"Deployed on"| D["BOT Chain Mainnet"]
    A -->|"Deployed on"| E["Flare Coston2"]
    
    C -->|"USSD/SMS"| F["Nigeria Merchants<br/>Offline-first"]
    D -->|"MetaMask"| G["African Merchants<br/>Continent-wide"]
    E -->|"Research"| H["Testing & Validation"]
    
    style A fill:#2196F3,stroke:#1565C0,color:#fff
    style F fill:#FF9800,stroke:#E65100,color:#fff
    style G fill:#4CAF50,stroke:#2E7D32,color:#fff
```

**Key Principle:** Same trust protocol. Different reach strategies.

- **Stacks Path:** Optimal for offline Nigerian merchants (USSD, SMS, no-internet confirmation)
- **BOT Chain Path:** Scalable reach across Africa (MetaMask, developer APIs, EVM ecosystem)
- **Flare Path:** Reference implementation and multi-chain research

---

## Current Development Status

### BOT Chain Mainnet: Escrow MVP (Phase 3)

```mermaid
graph LR
    A["Merchant<br/>Registration"] -->|"Create"| B["Payment"]
    B -->|"Fund"| C["Escrow"]
    C -->|"Deliver"| D["Confirmation"]
    D -->|"Settle"| E["Released"]
    
    C -->|"Refund Path"| F["Refund"]
    C -->|"Dispute Path"| G["Resolution"]
    
    style A fill:#FFC107
    style B fill:#FFC107
    style C fill:#FF5722
    style D fill:#FFC107
    style E fill:#4CAF50
    style F fill:#FF9800
    style G fill:#FF9800
```

**Status:**
- ✅ Smart contract deployed on mainnet
- ✅ Full wallet integration working
- ✅ End-to-end escrow flow tested
- 🟡 Contract unit tests expanding
- 🔴 **NOT approved for real customer funds**
- ⏳ Security audit in progress (Arctek Audits)

---

## Deployment Status

| Environment | Chain ID | Status | Purpose |
|---|---|---|---|
| **BOT Chain Mainnet** | 677 | ✅ Deployed / 🔴 Audit Pending | Primary EVM deployment |
| BOT Chain Testnet | 968 | ✅ Testing | Integration testing |
| Flare Coston2 | 114 | ✅ Historical | Reference deployment |
| Stacks Testnet | — | ✅ Reference | Original Clarity implementation |

### ⚠️ Security Notice

**Deployment ≠ Production Ready**

StacksBit is deployed on BOT Chain Mainnet but **NOT approved for real customer funds**. Pre-audit remediation is in progress. The contract will not accept intentional customer deposits until:

1. Security review completed
2. Audit findings remediated
3. Retest passed
4. Production approval granted

---

## Development Roadmap

```mermaid
timeline
    title StacksBit Development Phases
    
    section Complete
    Phase 1: Bitcoin/Stacks Foundation
    Phase 2: Multichain/EVM Expansion
    
    section Current
    Phase 3: BOT Chain Escrow MVP
        : Complete lifecycle testing
        : Stabilize mainnet contract
        : Expand unit tests
    
    section Planned
    Phase 4: Trust & Risk Layer
        : Merchant reputation
        : Risk assessment
        : Fraud detection
    Phase 5: Security & Audit
        : Pre-audit remediation
        : Formal security review
        : Remediation & retest
    Phase 6: Merchant Pilot
        : Controlled real transactions
        : Nigeria merchant testing
        : Feedback & iteration
    Phase 7: Multichain Expansion
        : Additional EVM networks
        : Cross-chain infrastructure
    Phase 8: Developer Infrastructure
        : REST API
        : JavaScript SDK
        : Webhooks & integrations
```

---

## Stacks Implementation: Nigeria-First Path

```mermaid
graph TD
    A["StacksBit on Stacks"]
    
    A -->|"Features"| B1["USSD Confirmation<br/>*384*paymentID#"]
    A -->|"Features"| B2["SMS Confirmation"]
    A -->|"Features"| B3["Agent Confirmation"]
    A -->|"Features"| B4["No Smartphone<br/>Required"]
    
    A -->|"Reach"| C["Nigerian Merchants<br/>Especially offline/rural"]
    
    A -->|"Settlement"| D1["Bitcoin"]
    A -->|"Settlement"| D2["Naira via Paystack"]
    
    A -->|"Status"| E["✅ Ready for<br/>Merchant Pilot"]
    
    style A fill:#FF9800,stroke:#E65100,color:#fff
    style E fill:#4CAF50,stroke:#2E7D32,color:#fff
```

**Target:** Nigerian merchants with intermittent internet, need offline confirmation.

---

## BOT Chain Implementation: Africa-Scale Path

```mermaid
graph TD
    A["StacksBit on BOT Chain"]
    
    A -->|"Features"| B1["MetaMask<br/>One-click connection"]
    A -->|"Features"| B2["Mobile-First<br/>Smartphone-optimized"]
    A -->|"Features"| B3["EVM Compatible<br/>Familiar tooling"]
    A -->|"Features"| B4["Fast Settlement<br/>Practical for commerce"]
    
    A -->|"Reach"| C["African Merchants<br/>Across the continent"]
    
    A -->|"Ecosystem"| D1["Gas Rebates"]
    A -->|"Ecosystem"| D2["Grant Program"]
    A -->|"Ecosystem"| D3["Infrastructure Support"]
    
    A -->|"Status"| E["🟡 Audit Pending<br/>Not Yet Production"]
    
    style A fill:#4CAF50,stroke:#2E7D32,color:#fff
    style E fill:#FFC107,stroke:#F57F17,color:#000
```

**Target:** African merchants with internet access across the continent.

---

## Why Multichain?

```mermaid
graph LR
    A["One Trust Protocol"] 
    
    A -->|"Stacks: Offline-first"| B["Nigeria merchants<br/>intermittent internet"]
    
    A -->|"BOT Chain: Scalable"| C["Africa-wide merchants<br/>internet-connected"]
    
    A -->|"Flare: Research"| D["Proof of concept<br/>testing"]
    
    style A fill:#2196F3,stroke:#1565C0,color:#fff
```

We deploy strategically to **maximize reach across different African markets at different blockchain adoption scales**—not for "multichain" as marketing.

---

## Deployments

**BOT Chain Mainnet:**
- Chain ID: 677
- Contract: `0x7D4d65AA41dA0e321ad52e46E9120F07D55B5284`
- Explorer: https://scan.botchain.ai/address/0x7D4d65AA41dA0e321ad52e46E9120F07D55B5284
- Status: Deployed, audit pending

**BOT Chain Testnet:**
- Chain ID: 968
- Faucet: https://faucet.botchain.ai
- Status: Integration testing

**Stacks Testnet:**
- Status: Ready for merchant pilot

---

## Repository Structure

stacksbit-flare/
├── contracts/
│ └── StacksBitEscrow.sol
├── scripts/
│ ├── deploy.ts
│ ├── test-bot-testnet.ts
│ └── test-bot-mainnet.ts
├── hardhat.config.ts
├── PRE_AUDIT_REMEDIATION.md
└── README.md


---

## Development

### Prerequisites
```bash
Node.js 18+
npm or yarn
Hardhat
```

### Install
```bash
git clone https://github.com/rogersterkaa/stacksbit-flare.git
cd stacksbit-flare
npm install
```

### Compile
```bash
npx hardhat compile
```

### Deploy to BOT Chain
```bash
npx hardhat run scripts/deploy.ts --network botMainnet
npx hardhat verify --network botMainnet 0x7D4d65AA41dA0e321ad52e46E9120F07D55B5284
```

### Test
```bash
npx hardhat test
npx hardhat run scripts/test-bot-mainnet.ts --network botMainnet
```

---

## Frontend

**React Frontend:** https://github.com/rogersterkaa/stacksbit-react  
**Live Demo:** https://stacksbit-react.vercel.app

Supports:
- Stacks wallet integration (Leather, Xverse)
- EVM wallet integration (MetaMask)
- BOT Chain interaction
- Buyer and merchant workflows

---

## Security & Audit

**Auditor:** Arctek Audits (https://arctekaudits.com)  
**Current Status:** Pre-audit remediation in progress  
**Formal Audit:** TBD (funding dependent)

See `PRE_AUDIT_REMEDIATION.md` for detailed security roadmap.

**Principle:** Security is a prerequisite for real customer funds.

---

## Support This Project

If you believe in trust infrastructure for African commerce, sponsor development:

[![Sponsor on GitHub](https://img.shields.io/badge/Sponsor-GitHub-blue?style=for-the-badge)](https://github.com/sponsors/rogersterkaa)

Your sponsorship helps:
- ✅ Security audits
- ✅ Escrow infrastructure
- ✅ Risk assessment
- ✅ Merchant onboarding
- ✅ Full-time development

---

## Related Repositories

- **Main (BOT Chain):** https://github.com/rogersterkaa/stacksbit-flare
- **Frontend:** https://github.com/rogersterkaa/stacksbit-react
- **Original (Stacks):** https://github.com/rogersterkaa/StacksBit
- **Stacks MCP:** https://github.com/rogersterkaa/stacks-mcp-server

---

## Developer

**Rogers Terkaa**  
Blockchain developer building trust infrastructure for African commerce.

**Email:** rogersterkaa@gmail.com  
**GitHub:** https://github.com/rogersterkaa

---

**Last Updated:** September 11, 2026  
**Mission:** Safe commerce for Africa. One escrow. Multiple blockchains.