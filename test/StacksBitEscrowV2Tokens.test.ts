import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

// ---------- helpers ----------
const DAY = 86400;
const fee = (x: bigint) => (x * BigInt(25)) / BigInt(1000); // 2.5%
const usdt = (n: number | string) => ethers.parseUnits(String(n), 6); // 6 decimals, like USDT

async function jump(seconds: number) {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

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

describe("StacksBitEscrowV2: stablecoin payments", function () {
  let c: any, token: any, token18: any;
  let owner: any, merchant: any, buyer: any, other: any;
  let asMerchant: any, asBuyer: any, asOther: any;
  let tokenAddr: string, escrowAddr: string;

  // merchant creates a token payment, buyer approves and pays it. Returns the payment id.
  async function lockedTokenPayment(price: bigint, days: number, pay?: bigint, tok: any = token) {
    const addr = await tok.getAddress();
    await (await asMerchant.createTokenPayment(addr, price, days, "order")).wait();
    const id = await c.paymentCount();
    const amount = pay ?? price;
    await (await tok.connect(buyer).approve(escrowAddr, amount)).wait();
    await (await asBuyer.payInvoiceToken(id, amount)).wait();
    return id;
  }

  beforeEach(async function () {
    [owner, merchant, buyer, other] = await ethers.getSigners();
    const Escrow = await ethers.getContractFactory("StacksBitEscrowV2");
    c = await Escrow.deploy();
    await c.waitForDeployment();
    escrowAddr = await c.getAddress();
    asMerchant = c.connect(merchant);
    asBuyer = c.connect(buyer);
    asOther = c.connect(other);

    // A USDT-style token (6 decimals, no return values) and a normal 18-decimal token
    token = await (await ethers.getContractFactory("NoReturnToken")).deploy();
    await token.waitForDeployment();
    token18 = await (await ethers.getContractFactory("TestToken")).deploy("Dollar", "USD18", 18);
    await token18.waitForDeployment();
    tokenAddr = await token.getAddress();
    await (await token.mint(buyer.address, usdt(10000))).wait();
    await (await token18.mint(buyer.address, ethers.parseEther("10000"))).wait();

    await (await c.setTokenApproved(tokenAddr, true)).wait();
    await (await c.setTokenApproved(await token18.getAddress(), true)).wait();
    await (await asMerchant.registerMerchant("Shop", "shop@example.com")).wait();
  });

  // ---------- the approved list ----------
  describe("approved token list", function () {
    it("only the owner can approve a token", async function () {
      await expectRevert(asOther.setTokenApproved(tokenAddr, true), c, "NotOwner");
    });
    it("rejects an address that is not a token contract", async function () {
      await expectRevert(c.setTokenApproved(other.address, true), c, "InvalidToken");
    });
    it("cannot create an invoice in a token that is not approved", async function () {
      const unapproved = await (await ethers.getContractFactory("TestToken")).deploy("X", "X", 6);
      await unapproved.waitForDeployment();
      await expectRevert(
        asMerchant.createTokenPayment(await unapproved.getAddress(), usdt(10), 3, "x"),
        c,
        "TokenNotApproved"
      );
    });
    it("validates price and delivery days like BOT payments", async function () {
      await expectRevert(asMerchant.createTokenPayment(tokenAddr, 0, 3, "x"), c, "InvalidPrice");
      await expectRevert(asMerchant.createTokenPayment(tokenAddr, usdt(10), 0, "x"), c, "InvalidDays");
      await expectRevert(asMerchant.createTokenPayment(tokenAddr, usdt(10), 15, "x"), c, "InvalidDays");
    });
    it("only registered merchants can create token invoices", async function () {
      await expectRevert(asBuyer.createTokenPayment(tokenAddr, usdt(10), 3, "x"), c, "NotRegistered");
    });
  });

  // ---------- paying ----------
  describe("paying in a stablecoin", function () {
    beforeEach(async function () {
      await (await asMerchant.createTokenPayment(tokenAddr, usdt(100), 3, "order")).wait();
    });
    it("stores the token and price", async function () {
      const p = await c.getPayment(1);
      expect(p.token).to.equal(tokenAddr);
      expect(p.price).to.equal(usdt(100));
    });
    it("locks the tokens in the contract", async function () {
      await (await token.connect(buyer).approve(escrowAddr, usdt(100))).wait();
      await (await asBuyer.payInvoiceToken(1, usdt(100))).wait();
      expect(await token.balanceOf(escrowAddr)).to.equal(usdt(100));
      expect(await c.getTokenLockedFunds(tokenAddr)).to.equal(usdt(100));
      expect((await c.getPayment(1)).status).to.equal(BigInt(1)); // Locked
    });
    it("accepts a tip above the price", async function () {
      await (await token.connect(buyer).approve(escrowAddr, usdt(110))).wait();
      await (await asBuyer.payInvoiceToken(1, usdt(110))).wait();
      expect((await c.getPayment(1)).amount).to.equal(usdt(110));
    });
    it("rejects an amount below the price", async function () {
      await (await token.connect(buyer).approve(escrowAddr, usdt(50))).wait();
      await expectRevert(asBuyer.payInvoiceToken(1, usdt(50)), c, "InsufficientAmount");
    });
    it("fails clearly when the buyer has not approved the contract", async function () {
      await expectRevert(asBuyer.payInvoiceToken(1, usdt(100)), c, "TransferFailed");
    });
    it("does not let a merchant pay their own invoice", async function () {
      await expectRevert(asMerchant.payInvoiceToken(1, usdt(100)), c, "MerchantCannotBeBuyer");
    });
    it("BOT payment function refuses a token invoice, and the token function refuses a BOT invoice", async function () {
      await expectRevert(asBuyer.payInvoice(1, { value: ethers.parseEther("1") }), c, "WrongToken");
      await (await asMerchant.createPayment(ethers.parseEther("1"), 3, "bot order")).wait();
      await expectRevert(asBuyer.payInvoiceToken(2, usdt(100)), c, "WrongToken");
    });
    it("cannot be paid twice", async function () {
      await (await token.connect(buyer).approve(escrowAddr, usdt(100))).wait();
      await (await asBuyer.payInvoiceToken(1, usdt(100))).wait();
      await expectRevert(asBuyer.payInvoiceToken(1, usdt(100)), c, "WrongStatus");
    });
    it("rejects a token that takes a fee on transfer", async function () {
      const feeToken = await (await ethers.getContractFactory("FeeToken")).deploy();
      await feeToken.waitForDeployment();
      const feeAddr = await feeToken.getAddress();
      await (await feeToken.mint(buyer.address, ethers.parseEther("1000"))).wait();
      await (await c.setTokenApproved(feeAddr, true)).wait();
      await (await asMerchant.createTokenPayment(feeAddr, ethers.parseEther("100"), 3, "fee order")).wait();
      await (await feeToken.connect(buyer).approve(escrowAddr, ethers.parseEther("100"))).wait();
      await expectRevert(asBuyer.payInvoiceToken(2, ethers.parseEther("100")), c, "FeeOnTransferToken");
    });
    it("works with a normal 18-decimal token as well", async function () {
      const id = await lockedTokenPayment(ethers.parseEther("100"), 3, undefined, token18);
      await (await asBuyer.confirmDelivery(id)).wait();
      expect(await token18.balanceOf(merchant.address)).to.equal(
        ethers.parseEther("100") - fee(ethers.parseEther("100"))
      );
    });
  });

  // ---------- confirming, fees, volume ----------
  describe("releasing funds", function () {
    it("pays the merchant minus the 2.5% fee, all in the token", async function () {
      const id = await lockedTokenPayment(usdt(100), 3);
      await (await asBuyer.confirmDelivery(id)).wait();
      expect(await token.balanceOf(merchant.address)).to.equal(usdt(100) - fee(usdt(100)));
      expect(await c.tokenFees(tokenAddr)).to.equal(fee(usdt(100)));
      expect(await c.getTokenLockedFunds(tokenAddr)).to.equal(BigInt(0));
      expect(await token.balanceOf(escrowAddr)).to.equal(fee(usdt(100)));
    });
    it("charges the fee on the full amount including a tip", async function () {
      const id = await lockedTokenPayment(usdt(100), 3, usdt(120));
      await (await asBuyer.confirmDelivery(id)).wait();
      expect(await token.balanceOf(merchant.address)).to.equal(usdt(120) - fee(usdt(120)));
    });
    it("tracks token volume separately and leaves BOT accounting untouched", async function () {
      const id = await lockedTokenPayment(usdt(100), 3);
      await (await asBuyer.confirmDelivery(id)).wait();
      expect(await c.merchantTokenVolume(merchant.address, tokenAddr)).to.equal(usdt(100));
      const m = await c.getMerchant(merchant.address);
      expect(m.totalVolume).to.equal(BigInt(0)); // BOT volume only
      expect(m.completedCount).to.equal(BigInt(1));
      expect(await c.accumulatedFees()).to.equal(BigInt(0));
      expect(await c.getTotalLockedFunds()).to.equal(BigInt(0));
    });
    it("only the buyer can confirm a token payment", async function () {
      const id = await lockedTokenPayment(usdt(100), 3);
      await expectRevert(asMerchant.confirmDelivery(id), c, "NotBuyer");
    });
  });

  // ---------- fee isolation for tokens ----------
  describe("token fee isolation", function () {
    it("withdrawTokenFees takes only the fees and never escrowed tokens", async function () {
      const first = await lockedTokenPayment(usdt(100), 3);
      await (await asBuyer.confirmDelivery(first)).wait();
      await lockedTokenPayment(usdt(500), 3); // stays locked
      expect(await token.balanceOf(escrowAddr)).to.equal(fee(usdt(100)) + usdt(500));
      await (await c.withdrawTokenFees(tokenAddr)).wait();
      expect(await token.balanceOf(escrowAddr)).to.equal(usdt(500));
      expect(await token.balanceOf(owner.address)).to.equal(fee(usdt(100)));
      expect(await c.tokenFees(tokenAddr)).to.equal(BigInt(0));
    });
    it("only the owner can withdraw token fees, and only when there are some", async function () {
      await expectRevert(asOther.withdrawTokenFees(tokenAddr), c, "NotOwner");
      await expectRevert(c.withdrawTokenFees(tokenAddr), c, "NothingToWithdraw");
    });
    it("the plain BOT fee withdrawal cannot touch token funds", async function () {
      await lockedTokenPayment(usdt(500), 3);
      await expectRevert(c.withdrawFees(), c, "NothingToWithdraw");
      expect(await token.balanceOf(escrowAddr)).to.equal(usdt(500));
    });
  });

  // ---------- refunds and disputes ----------
  describe("refunds and disputes in tokens", function () {
    it("buyer gets the full token amount back after the deadline", async function () {
      const id = await lockedTokenPayment(usdt(200), 2);
      const before = await token.balanceOf(buyer.address);
      await jump(2 * DAY + 10);
      await (await asBuyer.claimRefund(id)).wait();
      expect((await token.balanceOf(buyer.address)) - before).to.equal(usdt(200));
      expect(await c.getTokenLockedFunds(tokenAddr)).to.equal(BigInt(0));
      expect((await c.getMerchant(merchant.address)).refundedCount).to.equal(BigInt(1));
    });
    it("merchant can claim a token payment after the grace period", async function () {
      const id = await lockedTokenPayment(usdt(200), 1);
      await jump(1 * DAY + 7 * DAY + 10);
      await (await asMerchant.claimAfterGrace(id)).wait();
      expect(await token.balanceOf(merchant.address)).to.equal(usdt(200) - fee(usdt(200)));
    });
    it("dispute resolved for the merchant pays them", async function () {
      const id = await lockedTokenPayment(usdt(300), 3);
      await (await asBuyer.raiseDispute(id)).wait();
      await (await c.resolveDispute(id, false)).wait();
      expect(await token.balanceOf(merchant.address)).to.equal(usdt(300) - fee(usdt(300)));
    });
    it("dispute resolved for the buyer refunds the full amount", async function () {
      const id = await lockedTokenPayment(usdt(300), 3);
      const before = await token.balanceOf(buyer.address);
      await (await asBuyer.raiseDispute(id)).wait();
      await (await c.resolveDispute(id, true)).wait();
      expect((await token.balanceOf(buyer.address)) - before).to.equal(usdt(300));
    });
  });

  // ---------- a blacklisted recipient cannot lock the funds ----------
  describe("blacklisted recipients", function () {
    let bl: any, blAddr: string;
    beforeEach(async function () {
      bl = await (await ethers.getContractFactory("BlacklistToken")).deploy();
      await bl.waitForDeployment();
      blAddr = await bl.getAddress();
      await (await bl.mint(buyer.address, usdt(10000))).wait();
      await (await c.setTokenApproved(blAddr, true)).wait();
    });
    it("a blacklisted merchant does not block confirmation; the payout becomes claimable", async function () {
      const id = await lockedTokenPayment(usdt(100), 3, undefined, bl);
      await (await bl.setBlacklisted(merchant.address, true)).wait();
      await (await asBuyer.confirmDelivery(id)).wait(); // does not revert
      const payout = usdt(100) - fee(usdt(100));
      expect((await c.getPayment(id)).status).to.equal(BigInt(2)); // Confirmed
      expect(await c.tokenClaimable(blAddr, merchant.address)).to.equal(payout);
      expect(await bl.balanceOf(merchant.address)).to.equal(BigInt(0));
      // still blacklisted: claiming fails, nothing is lost
      await expectRevert(asMerchant.claimToken(blAddr), c, "TransferFailed");
      expect(await c.tokenClaimable(blAddr, merchant.address)).to.equal(payout);
      // once the blacklist is lifted, the merchant can claim
      await (await bl.setBlacklisted(merchant.address, false)).wait();
      await (await asMerchant.claimToken(blAddr)).wait();
      expect(await bl.balanceOf(merchant.address)).to.equal(payout);
      expect(await c.tokenClaimable(blAddr, merchant.address)).to.equal(BigInt(0));
      expect(await c.tokenOwed(blAddr)).to.equal(BigInt(0));
    });
    it("a blacklisted buyer does not block a refund; the amount becomes claimable", async function () {
      const id = await lockedTokenPayment(usdt(100), 2, undefined, bl);
      await (await bl.setBlacklisted(buyer.address, true)).wait();
      await jump(2 * DAY + 10);
      await (await asBuyer.claimRefund(id)).wait(); // does not revert
      expect((await c.getPayment(id)).status).to.equal(BigInt(4)); // Refunded
      expect(await c.tokenClaimable(blAddr, buyer.address)).to.equal(usdt(100));
    });
    it("nothing to claim reverts clearly", async function () {
      await expectRevert(asOther.claimToken(blAddr), c, "NothingToClaim");
    });
  });

  // ---------- removing a token ----------
  describe("removing a token from the list", function () {
    it("payments already locked still complete, but new activity is blocked", async function () {
      const locked = await lockedTokenPayment(usdt(100), 3);
      await (await asMerchant.createTokenPayment(tokenAddr, usdt(50), 3, "unpaid")).wait();
      const unpaid = await c.paymentCount();
      await (await c.setTokenApproved(tokenAddr, false)).wait();

      await expectRevert(asMerchant.createTokenPayment(tokenAddr, usdt(10), 3, "x"), c, "TokenNotApproved");
      await (await token.connect(buyer).approve(escrowAddr, usdt(50))).wait();
      await expectRevert(asBuyer.payInvoiceToken(unpaid, usdt(50)), c, "TokenNotApproved");

      await (await asBuyer.confirmDelivery(locked)).wait(); // still works
      expect(await token.balanceOf(merchant.address)).to.equal(usdt(100) - fee(usdt(100)));
      await (await c.withdrawTokenFees(tokenAddr)).wait(); // fees still withdrawable
    });
  });

  // ---------- mixing BOT and tokens, pause, accounting ----------
  describe("mixed use", function () {
    it("BOT and token payments run side by side without mixing balances", async function () {
      const tokenId = await lockedTokenPayment(usdt(100), 3);
      await (await asMerchant.createPayment(ethers.parseEther("2"), 3, "bot order")).wait();
      const botId = await c.paymentCount();
      await (await asBuyer.payInvoice(botId, { value: ethers.parseEther("2") })).wait();

      expect(await c.getTotalLockedFunds()).to.equal(ethers.parseEther("2"));
      expect(await c.getTokenLockedFunds(tokenAddr)).to.equal(usdt(100));

      await (await asBuyer.confirmDelivery(tokenId)).wait();
      await (await asBuyer.confirmDelivery(botId)).wait();
      expect(await c.accumulatedFees()).to.equal(fee(ethers.parseEther("2")));
      expect(await c.tokenFees(tokenAddr)).to.equal(fee(usdt(100)));
    });
    it("pausing blocks new token activity but not existing payments", async function () {
      const id = await lockedTokenPayment(usdt(100), 3);
      await (await asMerchant.createTokenPayment(tokenAddr, usdt(10), 3, "pending")).wait();
      const pending = await c.paymentCount();
      await (await c.setPaused(true)).wait();
      await expectRevert(asMerchant.createTokenPayment(tokenAddr, usdt(10), 3, "x"), c, "ContractPaused");
      await (await token.connect(buyer).approve(escrowAddr, usdt(10))).wait();
      await expectRevert(asBuyer.payInvoiceToken(pending, usdt(10)), c, "ContractPaused");
      await (await asBuyer.confirmDelivery(id)).wait();
      expect((await c.getPayment(id)).status).to.equal(BigInt(2)); // Confirmed
    });
    it("token balance always equals locked + fees + owed", async function () {
      const a = await lockedTokenPayment(usdt(100), 3);
      const b = await lockedTokenPayment(usdt(200), 3, usdt(230));
      const d = await lockedTokenPayment(usdt(300), 1);
      await (await asBuyer.confirmDelivery(a)).wait();
      await (await asBuyer.raiseDispute(b)).wait();
      await (await c.resolveDispute(b, false)).wait();
      await jump(1 * DAY + 10);
      await (await asBuyer.claimRefund(d)).wait();
      const balance = await token.balanceOf(escrowAddr);
      const expected =
        (await c.getTokenLockedFunds(tokenAddr)) + (await c.tokenFees(tokenAddr)) + (await c.tokenOwed(tokenAddr));
      expect(balance).to.equal(expected);
    });
  });
});
