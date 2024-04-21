import * as anchor from "@project-serum/anchor";
import { getDeployer, getProvider } from "./utils/provider";
import { findMetadataPda, keypairIdentity } from "@metaplex-foundation/js";
import {
  DataV2,
  createCreateMetadataAccountV3Instruction,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  AuthorityType,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  getAssociatedTokenAddress,
  getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { DecimalUtil } from "@orca-so/common-sdk";
import Decimal from "decimal.js";

import * as utils from "./utils/provider";
require("dotenv").config();

const MINT_CONFIG = {
  numDecimals: 9,
  numberTokens: 300000000,
};
// fixed supply

const ON_CHAIN_METADATA = {
  name: "2CbGgNhvoN8danimsvB",
  symbol: "TKA",
  uri: "https://bafkreie3ob7gvb24lojqym4vx7bwr6smzxuvf3dcydgjfockebpc423vy4.ipfs.nftstorage.link/",
  sellerFeeBasisPoints: 0,
  creators: null,
  collection: null,
  uses: null,
} as DataV2;

const createNewMintTransaction = async (
  connection: Connection,
  payer: Keypair,
  mintKeypair: Keypair,
  destinationWallet: PublicKey,
  mintAuthority: PublicKey,
  freezeAuthority: PublicKey
) => {
  //Get the minimum lamport balance to create a new account and avoid rent payments
  const requiredBalance = await getMinimumBalanceForRentExemptMint(connection);
  //metadata account associated with mint
  const metadataPDA = await findMetadataPda(mintKeypair.publicKey);
  //get associated token account of your wallet
  const tokenATA = await getAssociatedTokenAddress(
    mintKeypair.publicKey,
    destinationWallet
  );

  const createNewTokenTransaction = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: MINT_SIZE,
      lamports: requiredBalance,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(
      mintKeypair.publicKey, //Mint Address
      MINT_CONFIG.numDecimals, //Number of Decimals of New mint
      mintAuthority, //Mint Authority
      null, //Freeze Authority
      TOKEN_PROGRAM_ID
    ),
    createAssociatedTokenAccountInstruction(
      payer.publicKey, //Payer
      tokenATA, //Associated token account
      payer.publicKey, //token owner
      mintKeypair.publicKey //Mint
    ),
    createMintToInstruction(
      mintKeypair.publicKey, //Mint
      tokenATA, //Destination Token Account
      mintAuthority, //Authority
      BigInt(
        DecimalUtil.toBN(
          new Decimal(MINT_CONFIG.numberTokens),
          MINT_CONFIG.numDecimals
        ).toString()
      ) //Amount (in smallest unit of the token, i.e. 1 token = 1 * 10^decimals
    ),
    createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataPDA,
        mint: mintKeypair.publicKey,
        mintAuthority: mintAuthority,
        payer: payer.publicKey,
        updateAuthority: mintAuthority,
      },
      {
        createMetadataAccountArgsV3: {
          data: ON_CHAIN_METADATA,
          isMutable: true,
          collectionDetails: null,
        },
      }
    ),
    createSetAuthorityInstruction(
      mintKeypair.publicKey, // Mint
      mintAuthority, // Current authority
      AuthorityType.MintTokens, // New authority (null disables minting)
      null, //TODO: make the function generic
      [] // Multi-signature owners, if applicable (empty if not using multi-sig)
    )
  );

  return createNewTokenTransaction;
};

const createToken = async (
  provider: anchor.AnchorProvider,
  wallet: anchor.web3.Keypair
) => {
  let mint_pk = Keypair.generate();
  console.log(`New token Address: `, mint_pk.publicKey.toString());

  const newMintTransaction: Transaction = await createNewMintTransaction(
    provider.connection,
    wallet,
    mint_pk,
    wallet.publicKey,
    wallet.publicKey,
    wallet.publicKey
  );

  console.log("Sending transaction...");
  const transactionId = await provider.sendAndConfirm(
    newMintTransaction,
    [wallet, mint_pk],
    {
      commitment: "confirmed",
    }
  );

  console.log(`Transaction ID: `, transactionId);
  console.log(
    `Succesfully minted ${MINT_CONFIG.numberTokens} ${
      ON_CHAIN_METADATA.symbol
    } to ${wallet.publicKey.toString()}.`
  );
  console.log(
    `View Transaction: https://explorer.solana.com/tx/${transactionId}?cluster=devnet`
  );
  console.log(
    `View Token Mint: https://explorer.solana.com/address/${mint_pk.publicKey.toString()}?cluster=devnet`
  );
};

const main = async () => {
  const deployer: anchor.web3.Keypair = getDeployer();
  const provider = utils.getProvider(deployer);

  console.log("wallet: ", deployer.publicKey.toString());
  console.log("provider: ", provider.connection.rpcEndpoint);

  createToken(provider, deployer);
};

main().catch((error) => console.log(error));
