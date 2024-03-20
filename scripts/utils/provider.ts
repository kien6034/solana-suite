import * as anchor from "@project-serum/anchor";
import { ConfirmOptions } from "@solana/web3.js";
import bs58 from "bs58";
require("dotenv").config();

const rpc = "https://api.mainnet-beta.solana.com";
const options: ConfirmOptions = {
  preflightCommitment: "processed",
};

export const getSigner = () => {
  var bs = bs58.decode(
    "38eQ8ATuiXM5c9G3CPF5BFea1KJFyFzKnsjEKoGMPaLQoZmWF9ZDHeM32Nnv53NhV4dGk7tyZqJz1z67XG51dXQ7"
  );
  var js = new Uint8Array(
    bs.buffer,
    bs.byteOffset,
    bs.byteLength / Uint8Array.BYTES_PER_ELEMENT
  );
  return anchor.web3.Keypair.fromSecretKey(js);
};

export const getAdminKp = () => {
  var ba = bs58.decode(
    "4AtcXmZzdBEe6zhETa9BtHv7eHJWkPcoc77WiFAL2NJfsRwQesJaaJdBeGpKV8MoHtjGh8HsRQYpcpm6HLvzFud3"
  );
  var ja = new Uint8Array(
    ba.buffer,
    ba.byteOffset,
    ba.byteLength / Uint8Array.BYTES_PER_ELEMENT
  );
  return anchor.web3.Keypair.fromSecretKey(ja);
};

export const getUserKp = () => {
  var b = bs58.decode(
    "oNAPR1w29irRwEzPCRnp7Wyr7vCuWzAENCcZfyFw27qhbWzRV6Bp5vj9EMxebMQxgKoTMwQc6w2DMLMp8y6TUct"
  );
  var j = new Uint8Array(
    b.buffer,
    b.byteOffset,
    b.byteLength / Uint8Array.BYTES_PER_ELEMENT
  );
  return anchor.web3.Keypair.fromSecretKey(j);
};


// export const getController = async () => {
//     return new anchor.web3.PublicKey(process.env.CONTROLLER_ADDRESS)
// }

export const getFeeReceiver = () => {
  return new anchor.web3.PublicKey(process.env.FEE_RECEIVER);
};

export const sleep = async (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

export function getPdaFromSeeds(seeds: any) {
  return anchor.web3.PublicKey.findProgramAddressSync(
    [Uint8Array.from(seeds)],
    new anchor.web3.PublicKey(process.env.PROGRAM_ID)
  );
}

export const getMessBytes = (
  bumpy: number,
  token_pool: anchor.web3.PublicKey,
  user_token: anchor.web3.PublicKey,
  controller: anchor.web3.PublicKey,
  amount: number,
  expired_time: number,
  txId: String
) => {
  var amount_bytes = Uint8Array.from(
    new anchor.BN(amount).toArray(undefined, 8)
  );
  var expired_time_bytes = Uint8Array.from(
    new anchor.BN(expired_time).toArray(undefined, 8)
  );
  const bumpy_bytes = Uint8Array.from([bumpy]);
  const txId_bytes = Uint8Array.from(Buffer.from(txId));
  const token_pool_bytes = token_pool.toBytes();
  const user_token_bytes = user_token.toBytes();
  const controller_bytes = controller.toBytes();
  var msg_bytes = new Uint8Array(
    amount_bytes.length +
      bumpy_bytes.length +
      txId_bytes.length +
      token_pool_bytes.length +
      user_token_bytes.length +
      controller_bytes.length +
      expired_time_bytes.length
  );
  var offset = 0;
  msg_bytes.set(bumpy_bytes, offset);
  offset += bumpy_bytes.length;
  msg_bytes.set(token_pool_bytes, offset);
  offset += token_pool_bytes.length;
  msg_bytes.set(user_token_bytes, offset);
  offset += user_token_bytes.length;
  msg_bytes.set(controller_bytes, offset);
  offset += controller_bytes.length;
  msg_bytes.set(amount_bytes, offset);
  offset += amount_bytes.length;
  msg_bytes.set(expired_time_bytes, offset);
  offset += expired_time_bytes.length;
  msg_bytes.set(txId_bytes, offset);

  return msg_bytes;
};

export function makeid(length) {
  var result = "";
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

export function getPdaFromString(program: anchor.Program, string: string) {
  return anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(string)],
    program.programId
  );
}
