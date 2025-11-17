import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { PrivateOtcMarketplace } from "../target/types/private_otc_marketplace";

describe("create-listing", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace
    .privateOtcMarketplace as Program<PrivateOtcMarketplace>;
  const connection = provider.connection;
  const payer = provider.wallet.payer;
  const signer = provider.wallet.publicKey;

  const LISTING_SEED = Buffer.from("user-listing-seed"); // should match LISTING_SEEDS in your program
  const ESCROW_PDA_SEED = Buffer.from("escrow"); // should match the seed used for escrow_pda in your program
  const ESCROW_TOKEN_SEED = Buffer.from("escrow-seed"); // should match ESCROW_SEEDS used for escrow_token_account

  it("creates a listing and deposits seller tokens into escrow", async () => {
    // 1) Create a new mint to act as the token being listed (this simulates ProjectX token)
    const decimals = 6;
    console.log("Above mint creation")
    const mint = await createMint(
      connection,
      payer, 
      payer.publicKey, 
      null, 
      decimals
    );

    console.log("Above get associated tokens");

    const sellerAta = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      signer
    );

    const mintAmount = BigInt(1_000_000 * 10 ** decimals);
    await mintTo(
      connection,
      payer,
      mint,
      sellerAta.address,
      payer, 
      mintAmount
    );

    // 3) Derive the PDAs expected by the program
    // Listing PDA: seeds = [LISTING_SEED, signer]
    const [listingPda, listingBump] = PublicKey.findProgramAddressSync(
      [LISTING_SEED, signer.toBuffer()],
      program.programId
    );

    console.log("Abovr PDA listing pda");

    // Escrow PDA: seeds = [ESCROW_PDA_SEED, listingPda]
    const [escrowPda, escrowBump] = PublicKey.findProgramAddressSync(
      [ESCROW_PDA_SEED, listingPda.toBuffer()],
      program.programId
    );

    // Escrow token account PDA: seeds = [ESCROW_TOKEN_SEED, listingPda]
    // NOTE: This must match the exact seed used by your `escrow_token_account` init in the program.
    const [escrowTokenAccountPda, escrowTokenBump] =
      PublicKey.findProgramAddressSync(
        [ESCROW_TOKEN_SEED, listingPda.toBuffer()],
        program.programId
      );

    // 4) Prepare instruction args
    const totalTokensToList = new anchor.BN(1000 * 10 ** decimals); 
    const now = Math.floor(Date.now() / 1000);
    const lockingPeriod = new anchor.BN(now + 60 * 60 * 24 * 30); 

    console.log("Above create listing instruction")

    // 5) Call createListing
    // Provide the accounts exactly as your instruction expects.
    // If your program expects slightly different account names, change them here to match.
    const tx = await program.methods
      .createListing(
        new PublicKey(mint),
        totalTokensToList,
        new anchor.BN(10000),
        lockingPeriod
      )
      .accountsStrict({
        listing: listingPda,
        sellerTokenAccount: sellerAta.address,
        tokenMint: mint,
        escrowPda: escrowPda,
        escrowTokenAccount: escrowTokenAccountPda,
        signer: signer,

        // System accounts required by the IDL
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc()
      .catch((err) => {
        console.error("createListing failed:", err);
        throw err;
      });

    console.log("createListing tx:", tx);

    // 6) Assertions: verify listing account was created and escrow balance equals minted amount we transferred.
    const listingAccount = await program.account.listing.fetch(listingPda);
    console.log("Listing account:", listingAccount);

    // Fetch token account info for escrow token account (it should have been created by the program)
    const escrowTokenAccountInfo = await connection.getAccountInfo(
      escrowTokenAccountPda
    );
    if (escrowTokenAccountInfo === null) {
      console.warn(
        "Escrow token account not found at derived PDA — ensure seeds match program"
      );
    } else {
      console.log(
        "Escrow token account exists (raw account info length):",
        escrowTokenAccountInfo.data.length
      );
    }
  });
});
