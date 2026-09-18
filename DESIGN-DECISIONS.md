DECISION #9: TIMEOUT/EXPIRY MECHANISM ✅ LOCKED

Hybrid with Merchant-Specified Timeline

Implementation:
1. Merchant creates payment: createPayment(description, deliveryDeadlineDays)
   - Default options: 1, 3, 7, 14 days (based on distance/complexity)
   
2. Buyer sees deadline BEFORE paying
   - Displays: "Delivery expected within X days"
   
3. Funds locked during delivery window
   
4. After deadline passes:
   - Buyer can call claimRefund(paymentId)
   - Funds return automatically
   
5. Extension mechanism:
   - Merchant can request extension (e.g., +3 days)
   - Buyer must approve (or auto-approve after time)
   - Both see extension status

Realistic for Nigerian commerce:
- Same-day/next-day: 1-2 days (Jos local delivery)
- Inter-city: 3-5 days (Jos ↔ Lagos, Jos ↔ Abuja)
- Far regions: 7-14 days
- International: negotiable

Rationale:
✅ Accounts for actual inter-city travel times
✅ Both parties know expectations upfront
✅ Merchant gets realistic window
✅ Buyer protection after deadline
✅ Extensions prevent disputes

DECISION #15: INVOICE AMOUNT SPECIFICATION ✅ LOCKED

Hybrid (Merchant Pre-Specifies + Optional Overpayment)

Implementation:
1. Merchant creates payment with FIXED AMOUNT:
   createPayment(description, amount: 50000)
   
2. Buyer sees required amount:
   "Fabric: 50,000 Naira"
   
3. Payment logic:
   payInvoice(paymentId) {
     if (msg.value < requiredAmount) revert("Insufficient");
     if (msg.value >= requiredAmount) accept();
   }
   
4. Merchant receives FULL amount (including any overpayment):
   - If buyer pays 50,000 → merchant gets 50,000
   - If buyer pays 55,000 → merchant gets 55,000
   - Overpayment = optional tip for good service
   
5. Fee deducted from total received:
   - Total: 55,000
   - Fee (2.5%): 1,375
   - Merchant keeps: 53,625

Why this works for African commerce:
✅ Merchant sets FIRM price (no price ambiguity disputes)
✅ Merchant can reward satisfied buyers (tips)
✅ Buyer cannot underpay (protects merchant)
✅ Simple contract logic (easier to audit, fewer bugs)
✅ No complex in-contract negotiation (reduces failure points)
✅ Transparent: buyer knows exact cost upfront

Rationale:
- Prevents "I thought it was 30k not 50k" disputes
- Rewards good merchants with tips
- Simplicity = fewer bugs = easier audit
- Clear expectations = fewer refunds/disputes