import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * StacksBit Escrow Deployment Module
 * Deploys the StacksBitEscrow contract to Flare Coston2 testnet
 */
const StacksBitEscrowModule = buildModule("StacksBitEscrowModule", (m) => {
  const escrow = m.contract("StacksBitEscrow");

  return { escrow };
});

export default StacksBitEscrowModule;