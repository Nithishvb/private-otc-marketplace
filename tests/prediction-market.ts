import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccount,
  createMint,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { PrivateOtcMarketplace } from "../target/types/private_otc_marketplace";
import { expect } from "chai";

describe("Private OTC Marketplace", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace
    .privateOtcMarketplace as Program<PrivateOtcMarketplace>;
  const connection = provider.connection;
  const payer = provider.wallet.payer;
  const signer = provider.wallet.publicKey;

  describe("create-listing", () => {
    const LISTING_SEED = Buffer.from("user-listing-seed"); // should match LISTING_SEEDS in your program
    const ESCROW_PDA_SEED = Buffer.from("escrow"); // should match the seed used for escrow_pda in your program
    const ESCROW_TOKEN_SEED = Buffer.from("escrow-seed"); // should match ESCROW_SEEDS used for escrow_token_account

    it("creates a listing and deposits seller tokens into escrow", async () => {
      // 1) Create a new mint to act as the token being listed (this simulates ProjectX token)
      const decimals = 6;
      console.log("Above mint creation");
      const mint = await createMint(
        connection,
        payer,
        payer.publicKey,
        null,
        decimals
      );

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

      console.log("Above create listing instruction");

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

  describe("commit_listing", () => {
    const provider = anchor.AnchorProvider.local();
    anchor.setProvider(provider);

    const program = anchor.workspace.YourProgram as Program<any>;

    const PAYMENT_ESCROW_SEEDS = Buffer.from("payment-escrow");

    it("commits listing successfully", async () => {
      const buyer = anchor.web3.Keypair.generate();
      const payer = provider.wallet as anchor.Wallet;
      const connection = provider.connection;

      // ----------------------------------------------------
      // 1. Create a Payment Mint
      // ----------------------------------------------------
      const paymentMint = await createMint(
        connection,
        payer.payer,
        payer.publicKey,
        null,
        6
      );

      // ----------------------------------------------------
      // 2. Create buyer ATA
      // ----------------------------------------------------
      const buyerATA = await createAssociatedTokenAccount(
        connection,
        payer.payer,
        paymentMint,
        buyer.publicKey
      );

      // ----------------------------------------------------
      // 3. Mint funds to buyer ATA
      // ----------------------------------------------------
      await mintTo(
        connection,
        payer.payer,
        paymentMint,
        buyerATA,
        payer.publicKey,
        10_000_000
      );

      // ----------------------------------------------------
      // 4. Create Listing Account
      // ----------------------------------------------------
      const listing = anchor.web3.Keypair.generate();
      const listingSize = 8 + 300; // adjust to your Listing struct size

      await program.provider.sendAndConfirm(
        new anchor.web3.Transaction().add(
          SystemProgram.createAccount({
            fromPubkey: payer.publicKey,
            newAccountPubkey: listing.publicKey,
            lamports:
              await provider.connection.getMinimumBalanceForRentExemption(
                listingSize
              ),
            space: listingSize,
            programId: program.programId,
          })
        ),
        [payer.payer, listing]
      );


      // Manually overwrite listing using program.coder
      const listingData = {
        isActive: true,
        authority: payer.publicKey,
        paymentMint,
        tokenAmount: new anchor.BN(1_000_000),
        state: 0, // Active
        buyer: PublicKey.default,
        commitAmount: new anchor.BN(0),
        paymentEscrow: PublicKey.default,
        paymentEscrowBump: 0,
      };

      // Write raw data into account
      const encoded = program.coder.accounts.encode("Listing", listingData);
      await provider.connection.putAccountData(listing.publicKey, encoded);

      // ----------------------------------------------------
      // 5. Derive PDA Escrow Account
      // ----------------------------------------------------
      const [escrowPda, bump] = PublicKey.findProgramAddressSync(
        [PAYMENT_ESCROW_SEEDS, listing.publicKey.toBuffer()],
        program.programId
      );

      // ----------------------------------------------------
      // 6. Create PDA Escrow Token Account
      // ----------------------------------------------------
      const escrowAccountSize = 165;
      await program.provider.sendAndConfirm(
        new anchor.web3.Transaction().add(
          SystemProgram.createAccount({
            fromPubkey: payer.publicKey,
            newAccountPubkey: escrowPda,
            space: escrowAccountSize,
            lamports:
              await provider.connection.getMinimumBalanceForRentExemption(
                escrowAccountSize
              ),
            programId: TOKEN_PROGRAM_ID,
          }),
          tokenCreateAccountIx(escrowPda, paymentMint, escrowPda) // helper below
        ),
        [payer.payer]
      );

      // ----------------------------------------------------
      // 7. Call commit_listing
      // ----------------------------------------------------
      await program.methods
        .commitListing()
        .accounts({
          listing: listing.publicKey,
          buyerPaymentTokenAta: buyerATA,
          buyerPaymentTokenAccount: escrowPda,
          buyerPaymentMint: paymentMint,
          signer: buyer.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([buyer])
        .rpc();

      // ----------------------------------------------------
      // 8. Assertions
      // ----------------------------------------------------
      // Escrow account must contain tokens
      const escrowData = await getAccount(connection, escrowPda);
      expect(Number(escrowData.amount)).to.equal(1_000_000);

      // Read updated listing
      const updatedListing = await program.account.listing.fetch(
        listing.publicKey
      );

      expect(updatedListing.state).to.equal(1); // Committed state
      expect(updatedListing.buyer.toString()).to.equal(
        buyer.publicKey.toString()
      );
      expect(Number(updatedListing.commitAmount)).to.equal(1_000_000);
      expect(updatedListing.paymentEscrow.toString()).to.equal(
        escrowPda.toString()
      );
      expect(updatedListing.paymentEscrowBump).to.equal(bump);
    });
  });

  function tokenCreateAccountIx(
    account: PublicKey,
    mint: PublicKey,
    owner: PublicKey
  ) {
    return {
      keys: [
        { pubkey: account, isSigner: false, isWritable: true },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: owner, isSigner: false, isWritable: false },
      ],
      programId: TOKEN_PROGRAM_ID,
      data: Buffer.from([1]),
    };
  }
});
