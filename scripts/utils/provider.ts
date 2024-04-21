import * as anchor from "@project-serum/anchor";
import { ConfirmOptions } from "@solana/web3.js";
import bs58 from "bs58";
require("dotenv").config();

export const rpc = "https://api.devnet.solana.com";
export const options: ConfirmOptions = {
  commitment: "confirmed",
};

export const getProvider = (deployer: anchor.web3.Keypair) => {
  const connection = new anchor.web3.Connection(rpc, "confirmed");

  return new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(deployer),
    options
  );
};

export const getDeployer = () => {
  try {
    const keypair = require(`/Users/kien6034/.config/solana/id.json`);
    const key = anchor.web3.Keypair.fromSecretKey(Uint8Array.from(keypair));
    return key;
  } catch {
    console.log("ERROR ********* CAN NOT GET THE PRIVATE KEY ****************");
    process.exit(1);
  }
};
