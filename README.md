# StacksBit — Flare

**Fraud-protection escrow for African commerce — ported to Flare for cross-chain interoperability.**

> In Nigeria, "send money first and pray" is how most online commerce works.  
> Buyers get scammed by fake vendors. Merchants get scammed by fake buyers.  
> Both sides lose. Every day. With no recourse.  
>
> StacksBit fixes this — payment locks in escrow until delivery is confirmed.  
> Nobody loses. Both sides protected by code, not trust.

---

## Flare Summer Signal — Hackathon Submission

| Field | Detail |
|-------|--------|
| Track | Bounty 1 — Interoperable Asset Products |
| Network | Flare Coston2 Testnet |
| Contract | `0xd0D794E8ea1B7048a1E0F9afddB188a309EA6F66` |
| Explorer | [View on Flarescan](https://coston2.testnet.flarescan.com/address/0xd0D794E8ea1B7048a1E0F9afddB188a309EA6F66) |
| Demo | https://stacksbit-react.vercel.app |
| Original project | https://github.com/rogersterkaa/StacksBit |

---

## What Was Built Before the Hackathon

StacksBit is an existing project — originally built on Stacks (Bitcoin L2) using Clarity smart contracts. Before this hackathon:

- 9 Clarity contracts deployed on Stacks Testnet covering escrow, merchant registry, and fraud detection
- Full payment lifecycle verified on-chain: register → invoice → pay → confirm delivery → dispute
- React + TypeScript frontend deployed at stacksbit-react.vercel.app
- 5-week structured merchant validation through Stacks Foundry Validate program
- Real pilot sessions with merchants in Jos, Plateau State, Nigeria
- Every merchant confirmed bilateral fraud pain (both buyers AND merchants get scammed)

---

## What Was Newly Built During the Hackathon

For Flare Summer Signal, the following was newly built:

1. **Solidity escrow contract** — complete rewrite of the Clarity escrow logic in Solidity, optimized for Flare's EVM environment. Includes merchant registration, payment creation, escrow locking, delivery confirmation, dispute handling, and on-chain fraud risk scoring.

2. **Flare deployment** — contract deployed and verified on Coston2 testnet at `0xd0D794E8ea1B7048a1E0F9afddB188a309EA6F66`.

3. **Cross-chain architecture** — the original StacksBit settles in sBTC on Stacks. The Flare version settles in C2FLR/FLR, enabling StacksBit to serve merchants who hold Flare-native assets rather than Bitcoin-native assets.

---

## How StacksBit Uses Flare

StacksBit uses Flare as the settlement and trust enforcement layer for African commerce escrow:

**EVM-compatible smart contracts** — the escrow logic is enforced by Solidity contracts on Flare, making it accessible to any EVM wallet (MetaMask, Rabby, etc.) — much lower onboarding friction than Bitcoin-native wallets.

**Interoperable asset settlement** — Flare's FAssets system (XRP, BTC, DOGE bridged to Flare) means future versions of StacksBit can settle in XRP or BTC while using Flare's smart contract layer for escrow enforcement. This directly serves the "Interoperable Asset Products" bounty theme.

**FTSO price feeds (planned)** — Flare's decentralized oracle (FTSO) can provide real-time NGN/FLR exchange rates for Nigerian merchant invoicing — allowing merchants to price in naira while settling in FLR. This is the next integration milestone.

---

## How the Escrow Works

```
Merchant registers → Creates invoice → Shares Payment ID with buyer
→ Buyer pays C2FLR into escrow → Funds LOCKED on-chain
→ Merchant delivers goods → Buyer confirms → Funds released automatically
→ Dispute? Funds stay locked until resolved
```

Neither party can cheat:
- Merchant cannot take funds without delivering (buyer must confirm)
- Buyer cannot claim non-delivery and keep goods (funds are locked, not refunded automatically)
- Both sides are protected by the same contract

---

## Contract Functions

| Function | Who calls it | What it does |
|----------|-------------|--------------|
| `registerMerchant(name, email)` | Merchant | Registers business on-chain |
| `createPayment(description)` | Merchant | Creates an invoice, returns Payment ID |
| `payInvoice(paymentId)` | Buyer | Locks C2FLR in escrow |
| `confirmDelivery(paymentId)` | Buyer | Releases funds to merchant (minus 2.5% fee) |
| `raiseDispute(paymentId)` | Buyer or Merchant | Freezes funds pending resolution |
| `resolveDispute(paymentId, refund)` | Owner | Resolves dispute — refunds buyer or releases to merchant |
| `getRiskScore(merchant)` | Anyone | Returns fraud risk score 0-100 based on dispute rate |
| `getMerchant(wallet)` | Anyone | Returns full merchant profile |
| `getPayment(id)` | Anyone | Returns payment details and status |

---

## Fraud Detection — On-Chain Risk Scoring

Every merchant has an on-chain reputation score calculated from their dispute rate:

| Score | Zone | Action |
|-------|------|--------|
| 0–10 | 🟢 Green | Auto-release — clean history |
| 35 | 🟡 Yellow | Extra verification required |
| 60–90 | 🔴 Red | Manual review — high dispute rate |

This is calculated transparently on-chain via `getRiskScore()` — no black box, no centralized database.

---

## Validation Evidence

StacksBit was validated through **Stacks Foundry Validate** (5-week structured program, Q2 2026) with real merchants in Jos, Plateau State, Nigeria:

| Actor | Type | Signal |
|-------|------|--------|
| Donald Aondoakura (Errandboy Logistics) | Merchant | Completed walkthrough, asked "what do I do next?" — strong follow-through |
| Elias Ahile (Brisk Global) | Merchant | Multiple follow-up calls, asked about dispute resolution timeline |
| Jaram Comfort Mayat (LiveBetter Fashion) | Merchant | Confirmed fraud pain, willing to adopt |
| Lucy Ejembi | Buyer | Opened app independently, explored flow without prompting |
| Tristan Linardos (Founder, Lorica Labs) | Ecosystem | Sustained architectural engagement |
| Parth Goel | Web3 Builder | Deep technical feedback on escrow/reputation architecture |

**Key finding:** two separate merchants, in two separate sessions, independently asked the same unprompted question — *"What does the customer need to do?"* — confirming fraud protection is bilateral, not just a merchant problem.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart contract | Solidity 0.8.24 |
| Development | Hardhat + TypeScript |
| Network | Flare Coston2 Testnet (Chain ID: 114) |
| Frontend | React + TypeScript (existing, on Stacks) |
| Original contracts | Clarity on Stacks Testnet |

---

## Project Structure

```
stacksbit-flare/
  contracts/
    StacksBitEscrow.sol   — core escrow contract with fraud detection
  scripts/
    deploy.ts             — Hardhat deployment script
  hardhat.config.ts       — Coston2 network configuration
```

---

## Roadmap

**Phase 1 (complete):** Core escrow on Flare Coston2
**Phase 2:** FTSO integration for NGN/FLR price feeds — merchant invoices in naira, settlement in FLR
**Phase 3:** FAssets integration — settle in bridged BTC or XRP via Flare's trust-minimized bridge
**Phase 4:** USSD offline confirmation — merchants confirm deliveries by dialing *384# on any phone (Africa's Talking API)
**Phase 5:** Mainnet deployment across both Stacks and Flare

---

## Related Repos

- **Original Clarity contracts:** https://github.com/rogersterkaa/StacksBit
- **React frontend:** https://github.com/rogersterkaa/stacksbit-react
- **Stacks MCP Server:** https://github.com/rogersterkaa/stacks-mcp-server

---

## Builder

**Terkaa Tarkighir (Rogers)**  
Blockchain developer — Jos, Plateau State, Nigeria  
📧 rogersterkaa@gmail.com  
🐙 github.com/rogersterkaa  
🔗 stacksbit-react.vercel.app

---

## License

MIT