import { ethers } from "ethers";
import * as hardhat from "hardhat";

const CONTRACT_ADDRESS = "0xd0D794E8ea1B7048a1E0F9afddB188a309EA6F66";
const RPC_URL = "https://coston2-api.flare.network/ext/C/rpc";
const PRIVATE_KEY = process.env.PRIVATE_KEY!;

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("Testing with account:", wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log("Balance:", ethers.formatEther(balance), "C2FLR");

  // Load contract ABI from artifacts
  const artifact = await hardhat.artifacts.readArtifact("StacksBitEscrow");
  const escrow = new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, wallet);

  // Step 1 — Register as merchant
  console.log("\n1. Registering merchant...");
  const tx1 = await escrow.registerMerchant("Errandboy Logistics", "donald@errandboy.com");
  await tx1.wait();
  console.log("✅ Merchant registered! TX:", tx1.hash);

  // Step 2 — Create a payment
  console.log("\n2. Creating payment request...");
  const tx2 = await escrow.createPayment("Delivery of 1 bag of rice — Jos");
  const receipt2 = await tx2.wait();
  console.log("✅ Payment created! TX:", tx2.hash);

  // Get payment ID from event
  const iface = new ethers.Interface(artifact.abi);
  let paymentId = BigInt(1);
  for (const log of receipt2.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === "PaymentCreated") {
        paymentId = parsed.args[0];
        break;
      }
    } catch { continue; }
  }
  console.log("   Payment ID:", paymentId.toString());

  // Step 3 — Pay invoice
  console.log("\n3. Paying invoice...");
  const amount = ethers.parseEther("0.01");
  const tx3 = await escrow.payInvoice(paymentId, { value: amount });
  await tx3.wait();
  console.log("✅ Invoice paid! TX:", tx3.hash);

  // Step 4 — Confirm delivery
  console.log("\n4. Confirming delivery...");
  const tx4 = await escrow.confirmDelivery(paymentId);
  await tx4.wait();
  console.log("✅ Delivery confirmed! Funds released! TX:", tx4.hash);

  // Step 5 — Risk score
  console.log("\n5. Checking risk score...");
  const score = await escrow.getRiskScore(wallet.address);
  console.log("✅ Risk score:", score.toString());

  console.log("\n🎉 Full escrow flow completed on Flare Coston2!");
  console.log("🔗 Explorer: https://coston2.testnet.flarescan.com/address/" + CONTRACT_ADDRESS);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});