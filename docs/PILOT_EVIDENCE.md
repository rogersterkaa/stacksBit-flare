# StacksBit Pilot Evidence

Two Nigerian merchants have run the full escrow flow on **BOT Chain testnet** (Chain ID 968) using **test tokens only**.

**Status:** pre-launch. No production volume. No real customer funds. The contract is not audited.

- Testnet contract (StacksBitEscrow): [`0xd0D794E8ea1B7048a1E0F9afddB188a309EA6F66`](https://scan.bohr.life/address/0xd0D794E8ea1B7048a1E0F9afddB188a309EA6F66)
- Explorer: https://scan.bohr.life
- Live app: https://stacksbit-react.vercel.app (open in MetaMask's browser on mobile)

## The flow that was tested

1. The merchant registers their business on-chain.
2. The merchant creates a payment request.
3. The buyer pays, and the funds are locked in the contract.
4. The buyer confirms delivery.
5. The merchant receives the payment minus the 2.5% platform fee.

Only the buyer can release the funds. The merchant cannot release them to themselves.

## Pilot 1: LiveBetter Fashion (30 September 2026)

Payment ID 6. The buyer was the founder's own test wallet.

| Step | Method | Transaction |
|------|--------|-------------|
| 1 | `registerMerchant` | [`0x2918a9bd...48ab`](https://scan.bohr.life/tx/0x2918a9bd419fdf421aa9170df8c7817ff68ec3ee2b39a209bbd00cc1347648ab) |
| 2 | `createPayment` | [`0x11688348...2046`](https://scan.bohr.life/tx/0x11688348748f73e052964a1c444a9da4ec513c9c0e89c953a817a21a464f2046) |
| 3 | `payInvoice` (0.1 BOT) | [`0xb5b27264...7ee2`](https://scan.bohr.life/tx/0xb5b272648d2ad400e59fc69afdcf1c649710a826c0cb5caf3c6f08f3dd057ee2) |
| 4 | `confirmDelivery` | [`0x6ffe6e79...f12d`](https://scan.bohr.life/tx/0x6ffe6e797090ebdac9a8d470b2addc288d4af1f11747e78cf16c5adf4f74f12d) |

Decoded events: `PaymentCreated` (payment 6), `PaymentLocked` (0.1 BOT), `DeliveryConfirmed` (payout 0.0975 BOT, fee 0.0025 BOT).

## Pilot 2: 4-Keeps Enterprise (3 October 2026)

Payment ID 7. The buyer was an independent person.

| Step | Method | Transaction |
|------|--------|-------------|
| 1 | `registerMerchant` | [`0x8c94dde9...c912`](https://scan.bohr.life/tx/0x8c94dde931eaf68287788b882e70ef3290bfe957fea4077e24f8a635bc4ac912) |
| 2 | `createPayment` | [`0x16e9ec04...7e87`](https://scan.bohr.life/tx/0x16e9ec044d0f742a27b22613b4b8c2920a0551e60d598854db8738dfb0257e87) |
| 3 | `payInvoice` (0.1 BOT) | [`0x6f3ad67d...107a`](https://scan.bohr.life/tx/0x6f3ad67d04659d2c12b40793c1a0e5e908509a5b1fce60701ea6eeda6659107a) |
| 4 | `confirmDelivery` | [`0x399de08c...9b77`](https://scan.bohr.life/tx/0x399de08c620289e702e1e9fb6ba7cbcfff7e073eb7b39986f80796cca4d59b77) |

Decoded event: `DeliveryConfirmed` (payout 0.0975 BOT, fee 0.0025 BOT).

## Wallets

| Role | Address |
|------|---------|
| LiveBetter Fashion (merchant) | `0xEa75B28BC2cc76d77a9996f81D02828ae08a3b57` |
| Founder's test wallet (buyer, payment 6) | `0x0c47C051d99A2A176ca98C58d93f98C9161A2392` |
| 4-Keeps Enterprise (merchant) | `0x2bBdA5B8B3c26d4d98c39a053666CFC5938f9E0a` |
| Independent buyer (payment 7) | `0x8D9994bB7aC1D2421D95cB55E2dd89E45e56aDC7` |

## What this does not show

- It does not show production use. All tokens were faucet test tokens.
- The first pilot's buyer was the founder's own wallet, so it demonstrates the contract flow, not independent demand.
- It does not show a mainnet escrow flow. That test has not been run.

## How to verify

Open any transaction link above on the testnet explorer. Each one shows the method, the status, and the events in the **Logs** tab.
