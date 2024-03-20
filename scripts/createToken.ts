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
  createFreezeAccountInstruction,
  getMint,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { DecimalUtil } from "@orca-so/common-sdk";
require("dotenv").config();

const endpoint = "https://api.mainnet-beta.solana.com";
const solanaConnection = new anchor.web3.Connection(endpoint, "confirmed");

const MINT_CONFIG = {
  numDecimals: 9,
  numberTokens: "300000000000000000",
};

const ON_CHAIN_METADATA = {
  name: "DragonX Token",
  symbol: "DRX",
  uri: "https://bafkreigwfyxv7w2raeaind2htm6ntb6yh4n6kbvfupfe333xaobjtjks7q.ipfs.nftstorage.link/",
  sellerFeeBasisPoints: 0,
  creators: null,
  collection: null,
  uses: null,
} as DataV2;

const deployer: anchor.web3.Keypair = getDeployer();
const provider: anchor.AnchorProvider = getProvider(deployer);

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
      freezeAuthority, //Freeze Authority
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
      BigInt(MINT_CONFIG.numberTokens) //Amount (in smallest unit of the token, i.e. 1 token = 1 * 10^decimals
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
      null, // Authority type (MintTokens indicates we're changing the minting authority)
      [] // Multi-signature owners, if applicable (empty if not using multi-sig)
    )
  );

  return createNewTokenTransaction;
};

const createToken = async (wallet: anchor.web3.Keypair) => {
  let mint_pk = Keypair.generate();
  console.log(`New token Address: `, mint_pk.publicKey.toString());

  const newMintTransaction: Transaction = await createNewMintTransaction(
    solanaConnection,
    wallet,
    mint_pk,
    wallet.publicKey,
    wallet.publicKey,
    wallet.publicKey
  );

  console.log("solana connection: ", solanaConnection.rpcEndpoint);
  const { blockhash } = await solanaConnection.getLatestBlockhash();

  newMintTransaction.recentBlockhash = blockhash;
  console.log("fee payer: pubkey: ", wallet.publicKey.toString());
  newMintTransaction.feePayer = wallet.publicKey;

  const signers = [wallet, mint_pk];

  if (signers.length > 0) {
    newMintTransaction.partialSign(...signers);
  }

  const serializedTransaction = newMintTransaction.serialize();

  const transactionId = await solanaConnection.sendRawTransaction(
    serializedTransaction,
    {
      skipPreflight: true,
      maxRetries: 10,
    }
  );

  const confirmation = await solanaConnection.confirmTransaction(
    transactionId,
    "processed"
  );

  if (confirmation.value.err) {
    console.error("Transaction failed", confirmation.value.err);
  } else {
    console.log("Transaction confirmed");
  }

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
  anchor.setProvider(provider);
  const wallet = new anchor.Wallet(deployer);

  console.log("wallet: ", wallet.publicKey.toString());
  console.log("wallet.payer: ", wallet.payer.publicKey.toString());

  createToken(wallet.payer);
};

main().catch((error) => console.log(error));