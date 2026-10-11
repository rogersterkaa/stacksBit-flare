import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

// ---------- helpers ----------
const eth = (n: string) => ethers.parseEther(n);
const DAY = 86400;
const fee = (x: bigint) => (x * BigInt(25)) / BigInt(1000); // 2.5%

async function jump(seconds: number) {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

// Checks that a call reverts with a specific custom error from the contract.
async function expectRevert(promise: Promise<any>, contract: any, errorName: string) {
  try {
    const tx = await promise;
    if (tx && tx.wait) await tx.wait();
  } catch (e: any) {
    let decoded: string | undefined = e?.revert?.name;
    if (!decoded && e?.data) {
      try {
        decoded = contract.interface.parseError(e.data)?.name;
      } catch {
        decoded = undefined;
      }
    }
    const text = String(e?.message ?? "") + String(e?.shortMessage ?? "");
    expect(
      decoded === errorName || text.includes(errorName),
      `expected revert ${errorName}, got ${decoded ?? text}`
    ).to.equal(true);
    return;
  }
  expect.fail(`expected revert ${errorName}, but the call succeeded`);
}

describe("StacksBitEscrowV2", function () {
  let c: any; // contract (owner)
  let owner: any, merchant: any, buyer: any, other: any, merchant2: any;
  let asMerchant: any, asBuyer: any, asOther: any, asMerchant2: any;

  // merchant creates a payment, buyer pays it. Returns the payment id.
  async function lockedPayment(price: string, days: number, pay?: string) {
    await (await asMerchant.createPayment(eth(price), days, "order")).wait();
    const id = await c.paymentCount();
    await (await asBuyer.payInvoice(id, { value: eth(pay ?? price) })).wait();
    return id;
  }

  beforeEach(async function () {
    [owner, merchant, buyer, other, merchant2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("StacksBitEscrowV2");
    c = await Factory.deploy();
    await c.waitForDeployment();
    asMerchant = c.connect(merchant);
    asBuyer = c.connect(buyer);
    asOther = c.connect(other);
    asMerchant2 = c.connect(merchant2);
    await (await asMerchant.registerMerchant("Shop", "shop@example.com")).wait();
    await (await asMerchant2.registerMerchant("Shop Two", "two@example.com")).wait();
  });

  // ---------- creating payments ----------
  describe("creating payments", function () {
    it("rejects a price of zero", async function () {
      await expectRevert(asMerchant.createPayment(0, 3, "x"), c, "InvalidPrice");
    });
    it("rejects a delivery window of 0 days", async function () {
      await expectRevert(asMerchant.createPayment(eth("1"), 0, "x"), c, "InvalidDays");
    });
    it("rejects a delivery window of more than 14 days", async function () {
      await expectRevert(asMerchant.createPayment(eth("1"), 15, "x"), c, "InvalidDays");
    });
    it("only lets registered merchants create payments", async function () {
      await expectRevert(asBuyer.createPayment(eth("1"), 3, "x"), c, "NotRegistered");
    });
    it("stores the price and delivery window", async function () {
      await (await asMerchant.createPayment(eth("2"), 5, "order")).wait();
      const p = await c.getPayment(1);
      expect(p.price).to.equal(eth("2"));
      expect(p.deliveryDays).to.equal(BigInt(5));
      expect(p.status).to.equal(BigInt(0)); // Pending
    });
  });

  // ---------- paying ----------
  describe("paying an invoice", function () {
    beforeEach(async function () {
      await (await asMerchant.createPayment(eth("1"), 3, "order")).wait();
    });
    it("rejects an amount below the price", async function () {
      await expectRevert(asBuyer.payInvoice(1, { value: eth("0.5") }), c, "InsufficientAmount");
    });
    it("does not let a merchant pay their own invoice", async function () {
      await expectRevert(asMerchant.payInvoice(1, { value: eth("1") }), c, "MerchantCannotBeBuyer");
    });
    it("locks the funds and sets the deadline", async function () {
      await (await asBuyer.payInvoice(1, { value: eth("1") })).wait();
      const p = await c.getPayment(1);
      expect(p.status).to.equal(BigInt(1)); // Locked
      expect(p.buyer).to.equal(buyer.address);
      expect(p.deadline - p.lockedAt).to.equal(BigInt(3 * DAY));
      expect(await c.getTotalLockedFunds()).to.equal(eth("1"));
    });
    it("accepts an overpayment as a tip", async function () {
      await (await asBuyer.payInvoice(1, { value: eth("1.2") })).wait();
      expect((await c.getPayment(1)).amount).to.equal(eth("1.2"));
    });
    it("cannot be paid twice", async function () {
      await (await asBuyer.payInvoice(1, { value: eth("1") })).wait();
      await expectRevert(asOther.payInvoice(1, { value: eth("1") }), c, "WrongStatus");
    });
    it("rejects an unknown payment id", async function () {
      await expectRevert(asBuyer.payInvoice(99, { value: eth("1") }), c, "PaymentNotFound");
    });
  });

  // ---------- confirming delivery ----------
  describe("confirming delivery", function () {
    it("only the buyer can confirm", async function () {
      const id = await lockedPayment("1", 3);
      await expectRevert(asMerchant.confirmDelivery(id), c, "NotBuyer");
      await expectRevert(asOther.confirmDelivery(id), c, "NotBuyer");
    });
    it("pays the merchant minus 2.5% fee, calculated on the full amount including a tip", async function () {
      const id = await lockedPayment("1", 3, "1.2");
      const before = await ethers.provider.getBalance(merchant.address);
      await (await asBuyer.confirmDelivery(id)).wait();
      const after = await ethers.provider.getBalance(merchant.address);
      expect(after - before).to.equal(eth("1.2") - fee(eth("1.2")));
      expect(await c.accumulatedFees()).to.equal(fee(eth("1.2")));
      expect(await c.getTotalLockedFunds()).to.equal(BigInt(0));
    });
    it("updates merchant reputation", async function () {
      const id = await lockedPayment("1", 3);
      await (await asBuyer.confirmDelivery(id)).wait();
      const m = await c.getMerchant(merchant.address);
      expect(m.completedCount).to.equal(BigInt(1));
      expect(m.totalVolume).to.equal(eth("1"));
    });
    it("cannot be confirmed twice", async function () {
      const id = await lockedPayment("1", 3);
      await (await asBuyer.confirmDelivery(id)).wait();
      await expectRevert(asBuyer.confirmDelivery(id), c, "WrongStatus");
    });
  });

  // ---------- fee isolation (the critical v1 flaw) ----------
  describe("fee isolation", function () {
    it("withdrawFees takes only the fees and never escrowed funds", async function () {
      const first = await lockedPayment("1", 3);
      await (await asBuyer.confirmDelivery(first)).wait(); // creates 0.025 in fees
      await lockedPayment("5", 3); // 5 BOT stays locked
      const contractAddr = await c.getAddress();
      expect(await ethers.provider.getBalance(contractAddr)).to.equal(fee(eth("1")) + eth("5"));
      await (await c.withdrawFees()).wait();
      expect(await ethers.provider.getBalance(contractAddr)).to.equal(eth("5"));
      expect(await c.accumulatedFees()).to.equal(BigInt(0));
    });
    it("escrowed funds can still be released after fees are withdrawn", async function () {
      const first = await lockedPayment("1", 3);
      await (await asBuyer.confirmDelivery(first)).wait();
      const second = await lockedPayment("5", 3);
      await (await c.withdrawFees()).wait();
      await (await asBuyer.confirmDelivery(second)).wait();
      expect((await c.getPayment(second)).status).to.equal(BigInt(2)); // Confirmed
    });
    it("only the owner can withdraw fees", async function () {
      const id = await lockedPayment("1", 3);
      await (await asBuyer.confirmDelivery(id)).wait();
      await expectRevert(asOther.withdrawFees(), c, "NotOwner");
    });
    it("reverts when there are no fees to withdraw", async function () {
      await lockedPayment("5", 3); // only escrow, no fees yet
      await expectRevert(c.withdrawFees(), c, "NothingToWithdraw");
    });
  });

  // ---------- deadline, refund and grace ----------
  describe("delivery deadline", function () {
    it("buyer cannot claim a refund before the deadline", async function () {
      const id = await lockedPayment("1", 3);
      await expectRevert(asBuyer.claimRefund(id), c, "TooEarly");
    });
    it("buyer can claim a full refund after the deadline", async function () {
      const id = await lockedPayment("5", 3);
      await jump(3 * DAY + 10);
      const before = await ethers.provider.getBalance(buyer.address);
      const receipt = await (await asBuyer.claimRefund(id)).wait();
      const after = await ethers.provider.getBalance(buyer.address);
      expect(after - before + receipt.fee).to.equal(eth("5"));
      expect((await c.getPayment(id)).status).to.equal(BigInt(4)); // Refunded
      expect(await c.getTotalLockedFunds()).to.equal(BigInt(0));
      expect((await c.getMerchant(merchant.address)).refundedCount).to.equal(BigInt(1));
    });
    it("only the buyer can claim the refund", async function () {
      const id = await lockedPayment("1", 3);
      await jump(3 * DAY + 10);
      await expectRevert(asOther.claimRefund(id), c, "NotBuyer");
    });
    it("merchant cannot claim right after the deadline", async function () {
      const id = await lockedPayment("1", 3);
      await jump(3 * DAY + 10);
      await expectRevert(asMerchant.claimAfterGrace(id), c, "TooEarly");
    });
    it("merchant can claim after the 7 day grace period, and the buyer's refund window closes", async function () {
      const id = await lockedPayment("2", 1);
      await jump(1 * DAY + 7 * DAY + 10);
      await expectRevert(asBuyer.claimRefund(id), c, "TooLate");
      const before = await ethers.provider.getBalance(merchant.address);
      const receipt = await (await asMerchant.claimAfterGrace(id)).wait();
      const after = await ethers.provider.getBalance(merchant.address);
      expect(after - before + receipt.fee).to.equal(eth("2") - fee(eth("2")));
      expect((await c.getPayment(id)).status).to.equal(BigInt(2)); // Confirmed
    });
    it("only the merchant can use claimAfterGrace", async function () {
      const id = await lockedPayment("1", 1);
      await jump(1 * DAY + 7 * DAY + 10);
      await expectRevert(asOther.claimAfterGrace(id), c, "NotMerchant");
    });
  });

  // ---------- disputes ----------
  describe("disputes", function () {
    it("only the buyer or merchant can raise a dispute", async function () {
      const id = await lockedPayment("1", 3);
      await expectRevert(asOther.raiseDispute(id), c, "NotParticipant");
    });
    it("a dispute blocks the merchant's claim after grace", async function () {
      const id = await lockedPayment("1", 1);
      await (await asBuyer.raiseDispute(id)).wait();
      await jump(10 * DAY);
      await expectRevert(asMerchant.claimAfterGrace(id), c, "WrongStatus");
    });
    it("only the owner can resolve", async function () {
      const id = await lockedPayment("1", 3);
      await (await asBuyer.raiseDispute(id)).wait();
      await expectRevert(asBuyer.resolveDispute(id, true), c, "NotOwner");
    });
    it("resolving for the merchant pays them and counts as completed", async function () {
      const id = await lockedPayment("2", 3);
      await (await asBuyer.raiseDispute(id)).wait();
      const before = await ethers.provider.getBalance(merchant.address);
      await (await c.resolveDispute(id, false)).wait();
      const after = await ethers.provider.getBalance(merchant.address);
      expect(after - before).to.equal(eth("2") - fee(eth("2")));
      const m = await c.getMerchant(merchant.address);
      expect(m.completedCount).to.equal(BigInt(1));
      expect(m.disputeCount).to.equal(BigInt(1));
      expect(await c.accumulatedFees()).to.equal(fee(eth("2")));
    });
    it("resolving for the buyer refunds the full amount and counts as refunded", async function () {
      const id = await lockedPayment("3", 3);
      await (await asBuyer.raiseDispute(id)).wait();
      const before = await ethers.provider.getBalance(buyer.address);
      await (await c.resolveDispute(id, true)).wait();
      const after = await ethers.provider.getBalance(buyer.address);
      expect(after - before).to.equal(eth("3"));
      expect((await c.getMerchant(merchant.address)).refundedCount).to.equal(BigInt(1));
      expect(await c.getTotalLockedFunds()).to.equal(BigInt(0));
    });
    it("a dispute cannot be resolved twice", async function () {
      const id = await lockedPayment("1", 3);
      await (await asBuyer.raiseDispute(id)).wait();
      await (await c.resolveDispute(id, true)).wait();
      await expectRevert(c.resolveDispute(id, true), c, "WrongStatus");
    });
  });

  // ---------- risk score ----------
  describe("risk score", function () {
    it("is 0 for a merchant with no finished payments", async function () {
      expect(await c.getRiskScore(merchant.address)).to.equal(BigInt(0));
    });
    it("is low when every payment completes", async function () {
      const id = await lockedPayment("1", 3);
      await (await asBuyer.confirmDelivery(id)).wait();
      expect(await c.getRiskScore(merchant.address)).to.equal(BigInt(10));
    });
    it("is high when refunds dominate", async function () {
      const id = await lockedPayment("1", 3);
      await jump(3 * DAY + 10);
      await (await asBuyer.claimRefund(id)).wait();
      expect(await c.getRiskScore(merchant.address)).to.equal(BigInt(90));
    });
    it("a dispute the merchant wins does not raise the risk score", async function () {
      const id = await lockedPayment("1", 3);
      await (await asBuyer.raiseDispute(id)).wait();
      await (await c.resolveDispute(id, false)).wait();
      expect(await c.getRiskScore(merchant.address)).to.equal(BigInt(10));
    });
  });

  // ---------- extensions ----------
  describe("extensions", function () {
    it("does nothing until the buyer approves", async function () {
      const id = await lockedPayment("1", 2);
      const before = (await c.getPayment(id)).deadline;
      await (await asMerchant.requestExtension(id, 3)).wait();
      expect((await c.getPayment(id)).deadline).to.equal(before);
    });
    it("adds the extra days once the buyer approves", async function () {
      const id = await lockedPayment("1", 2);
      const before = (await c.getPayment(id)).deadline;
      await (await asMerchant.requestExtension(id, 3)).wait();
      await (await asBuyer.approveExtension(id)).wait();
      expect((await c.getPayment(id)).deadline).to.equal(before + BigInt(3 * DAY));
    });
    it("the merchant cannot approve their own request", async function () {
      const id = await lockedPayment("1", 2);
      await (await asMerchant.requestExtension(id, 3)).wait();
      await expectRevert(asMerchant.approveExtension(id), c, "NotBuyer");
    });
    it("cannot be approved twice", async function () {
      const id = await lockedPayment("1", 2);
      await (await asMerchant.requestExtension(id, 3)).wait();
      await (await asBuyer.approveExtension(id)).wait();
      await expectRevert(asBuyer.approveExtension(id), c, "NoPendingExtension");
    });
    it("only the merchant can request one", async function () {
      const id = await lockedPayment("1", 2);
      await expectRevert(asBuyer.requestExtension(id, 3), c, "NotMerchant");
    });
    it("cannot be requested after the deadline", async function () {
      const id = await lockedPayment("1", 1);
      await jump(1 * DAY + 10);
      await expectRevert(asMerchant.requestExtension(id, 3), c, "TooLate");
    });
  });

  // ---------- pause and ownership ----------
  describe("pause and ownership", function () {
    it("pausing blocks new registrations and payments but not existing ones", async function () {
      const id = await lockedPayment("1", 3);
      await (await c.setPaused(true)).wait();
      await expectRevert(asMerchant.createPayment(eth("1"), 2, "x"), c, "ContractPaused");
      await expectRevert(asOther.registerMerchant("N", "n@n.n"), c, "ContractPaused");
      await (await asBuyer.confirmDelivery(id)).wait();
      expect((await c.getPayment(id)).status).to.equal(BigInt(2)); // Confirmed
    });
    it("only the owner can pause", async function () {
      await expectRevert(asOther.setPaused(true), c, "NotOwner");
    });
    it("ownership can be transferred, and the old owner loses access", async function () {
      await expectRevert(c.transferOwnership(ethers.ZeroAddress), c, "ZeroAddress");
      await (await c.transferOwnership(other.address)).wait();
      expect(await c.owner()).to.equal(other.address);
      const id = await lockedPayment("1", 3);
      await (await asBuyer.confirmDelivery(id)).wait();
      await expectRevert(c.withdrawFees(), c, "NotOwner");
      await (await asOther.withdrawFees()).wait();
    });
  });

  // ---------- accounting invariant ----------
  describe("accounting", function () {
    it("contract balance always equals locked funds plus accumulated fees", async function () {
      const a = await lockedPayment("1", 3);
      const b = await lockedPayment("2", 3, "2.4");
      const d = await lockedPayment("3", 1);
      await (await asBuyer.confirmDelivery(a)).wait();
      await (await asBuyer.raiseDispute(b)).wait();
      await (await c.resolveDispute(b, false)).wait();
      await jump(1 * DAY + 10);
      await (await asBuyer.claimRefund(d)).wait();
      const addr = await c.getAddress();
      const balance = await ethers.provider.getBalance(addr);
      expect(balance).to.equal((await c.getTotalLockedFunds()) + (await c.accumulatedFees()));
    });
  });
});
