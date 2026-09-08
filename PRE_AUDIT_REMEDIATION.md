# PRE-AUDIT REMEDIATION ROADMAP
**StacksBit Escrow Smart Contract**  
**Prepared:** September 8, 2026  
**Status:** IN PROGRESS  

---

## OVERVIEW

This document tracks critical design decisions and security remediations required before formal audit with Arctek Audits.

The contract has been deployed and verified on BOT Chain Mainnet (0x7D4d65AA41dA0e321ad52e46E9120F07D55B5284). Before handling real customer funds, we must make explicit and test critical economic invariants, authority boundaries, and lifecycle transitions.

**Current deployment state: Deployed ≠ production-ready ≠ safe for real funds**

The BOT Chain mainnet contract is deployed and verified, but is maintained in a non-production state pending security review completion.

---

## CRITICAL COMMITMENT

**StacksBit will not intentionally accept real customer funds into the production escrow contract until the required security review, remediation, retest, and launch approvals have been completed.**

---

## CRITICAL DESIGN DECISIONS

### #1: SOURCE & DEPLOYMENT FREEZE
- [ ] Exact commit hash documented
- [ ] Deployment transaction recorded
- [ ] Compiler settings (Solidity version, optimization) locked
- [ ] No unpushed production changes
- [ ] Artifact reproducibility verified

**Status:** PENDING  
**Owner:** Rogers Terkaa  

---

### #5: CONTRACT-SPECIFIC TEST SUITE
- [ ] Unit tests for all 8 functions
- [ ] Integration tests (register → create → pay → confirm → release)
- [ ] Dispute flow tests
- [ ] Fee accounting tests
- [ ] Edge cases (timeout, multiple payments, fee withdrawal)
- [ ] Test coverage >90%

**Status:** IN PROGRESS  
**Owner:** Rogers Terkaa  

---

### #9: TIMEOUT & EXPIRY MECHANICS
**Decision required:** What happens if buyer/merchant disappear after lock?

- [ ] Is there a delivery deadline?
- [ ] Is there an automatic expiry period?
- [ ] Who can trigger timeout?
- [ ] Can buyer reclaim funds after timeout?
- [ ] Can merchant request extension?
- [ ] What happens if both parties disappear?
- [ ] What happens if delivery occurs but buyer refuses to confirm?

**Current state:** UNDEFINED  
**Priority:** HIGH (blocks release flow)  
**Owner:** Rogers Terkaa  

---

### #15: INVOICE TERMS & PAYMENT AMOUNT
**Decision required:** How is payment amount enforced?

- [ ] Should merchant specify amount on-chain at creation?
- [ ] Should buyer specify amount at payment?
- [ ] Should invoice contain expected amount with validation?
- [ ] Should buyer be prevented from paying incorrect amount?
- [ ] How does buyer know agreed amount (on-chain or off-chain)?
- [ ] Is the agreement intentionally off-chain?
- [ ] Does invoice need expiry?
- [ ] Should payment terms be cryptographically committed?

**Current state:** Buyer determines amount at pay time (no pre-defined amount)  
**Priority:** HIGH (affects trust model)  
**Owner:** Rogers Terkaa  

---

## OPERATIONAL DECISIONS

### FEE ACCOUNTING & GOVERNANCE
- [ ] Fee calculation logic documented
- [ ] Fee withdrawal safety tested
- [ ] Fee rounding behavior specified
- [ ] Escrow liabilities separated conceptually
- [ ] Fee accounting audited

**Status:** PENDING  

### OWNER AUTHORITY
- [ ] Owner authority documented
- [ ] Owner key security plan documented
- [ ] Dispute authority documented
- [ ] Future multisig/governance path outlined
- [ ] Timeout/recovery policy defined

**Status:** PENDING  

---

## AUDIT-READINESS ROADMAP

This roadmap represents StacksBit's internal security remediation plan. **The formal Arctek Audits engagement is not yet commissioned and timeline is dependent on project funding.**

| Phase | Target | Status |
|-------|--------|--------|
| Critical design decisions | Sep 10 | IN PROGRESS |
| Contract-specific test suite | Sep 15 | IN PROGRESS |
| Security invariants & economic model | Sep 17 | PENDING |
| Deployment/reproducibility package | Sep 18 | PENDING |
| Audit-ready release candidate | Sep 20 | PENDING |
| Funding & security-audit preparation | TBD | **FUNDING DEPENDENT** |
| Scoping discussion with Arctek | TBD | **NOT YET SCHEDULED** |
| Formal audit | TBD | **FUNDING DEPENDENT** |
| Remediation & retest | TBD | AFTER AUDIT |
| Production launch with real funds | TBD | AUDIT + APPROVAL DEPENDENT |

---

## AUDIT PACKAGE CHECKLIST

When audit is commissioned, Arctek Audits will require:

- [ ] Exact commit hash: _________
- [ ] Deployment TX: _________
- [ ] Contract address: 0x7D4d65AA41dA0e321ad52e46E9120F07D55B5284 ✅
- [ ] Compiler settings: Solidity ^0.8.0, optimization enabled
- [ ] Test report: (to be attached)
- [ ] Security invariants documented
- [ ] Architecture document
- [ ] Known limitations documented
- [ ] Audit scope finalized

---

## FUNDING & AUDIT READINESS

StacksBit is currently in an early-stage, self-funded development phase. The formal Arctek Audits engagement has not yet been commissioned because the indicative audit cost ($5,000–$7,500) exceeds current available funding.

**Current approach:**
- Continue internal security remediation against Arctek's pre-audit findings
- Complete contract-specific testing
- Document economic and security invariants
- Freeze and document the production release candidate
- Maintain clear deployment evidence
- Keep communication open with Arctek Audits
- Actively seek project/ecosystem funding for formal security review

**Formal audit will be scheduled when:**
1. Remediation roadmap is substantially complete
2. Production release candidate is frozen with evidence
3. Deployment documentation is finalized
4. Funding for security review is secured
5. Audit scope is agreed with Arctek Audits

---

## CONTACT & NEXT STEPS

**StacksBit Team:**
- Rogers Terkaa (Founder): rogersterkaa@gmail.com
- GitHub: github.com/rogersterkaa

**Security Auditor (Communication Open):**
- Reuben Kassongo (Arctek Audits): reuben@arctekaudits.com

---

**Last updated:** September 8, 2026  
**Next internal review:** September 10, 2026