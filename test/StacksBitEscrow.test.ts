import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("StacksBitEscrow - Test Suite", function () {
  
  it("should deploy successfully", async function () {
    const [owner] = await ethers.getSigners();
    const escrow: any = await ethers.deployContract("StacksBitEscrow");
    expect(await escrow.owner()).to.equal(owner.address);
  });

  it("should register a merchant", async function () {
    const [_, merchant] = await ethers.getSigners();
    const escrow: any = await ethers.deployContract("StacksBitEscrow");

    await expect(
      escrow.connect(merchant).registerMerchant("Test Merchant", "merchant@test.com")
    ).to.emit(escrow, "MerchantRegistered");

    const merchantData = await escrow.merchants(merchant.address);
    expect(merchantData.registered).to.equal(true);
  });

  it("should create payment (description only, no amount)", async function () {
    const [_, merchant] = await ethers.getSigners();
    const escrow: any = await ethers.deployContract("StacksBitEscrow");

    await escrow.connect(merchant).registerMerchant("Test Merchant", "merchant@test.com");
    
    await expect(
      escrow.connect(merchant).createPayment("Test Product")
    ).to.emit(escrow, "PaymentCreated");
  });

  it("should lock payment when buyer pays", async function () {
    const [_, merchant, buyer] = await ethers.getSigners();
    const escrow: any = await ethers.deployContract("StacksBitEscrow");
    const amount = ethers.parseEther("1.0");

    await escrow.connect(merchant).registerMerchant("Test Merchant", "merchant@test.com");
    await escrow.connect(merchant).createPayment("Test Product");

    await expect(
      escrow.connect(buyer).payInvoice(1, { value: amount })
    ).to.emit(escrow, "PaymentLocked");
  });

  it("should confirm delivery", async function () {
    const [_, merchant, buyer] = await ethers.getSigners();
    const escrow: any = await ethers.deployContract("StacksBitEscrow");
    const amount = ethers.parseEther("1.0");

    await escrow.connect(merchant).registerMerchant("Test Merchant", "merchant@test.com");
    await escrow.connect(merchant).createPayment("Test Product");
    await escrow.connect(buyer).payInvoice(1, { value: amount });

    await expect(
      escrow.connect(buyer).confirmDelivery(1)
    ).to.emit(escrow, "DeliveryConfirmed");
  });

  it("should raise dispute", async function () {
    const [_, merchant, buyer] = await ethers.getSigners();
    const escrow: any = await ethers.deployContract("StacksBitEscrow");
    const amount = ethers.parseEther("1.0");

    await escrow.connect(merchant).registerMerchant("Test Merchant", "merchant@test.com");
    await escrow.connect(merchant).createPayment("Test Product");
    await escrow.connect(buyer).payInvoice(1, { value: amount });

    await expect(
      escrow.connect(buyer).raiseDispute(1)
    ).to.emit(escrow, "DisputeRaised");
  });
});