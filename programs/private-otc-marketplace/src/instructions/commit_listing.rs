use anchor_lang::prelude::*;
use anchor_spl::token::{self, Transfer};

use crate::constants::{ListingState, PAYMENT_ESCROW_SEEDS};
use crate::error::ErrorCode;
use crate::{accounts_ix::*, state::Listing};

pub fn commit_listing(ctx: Context<CommitListing>) -> Result<()> {
    let listing: &mut Account<Listing> = &mut ctx.accounts.listing;

    if !listing.is_active {
        return Err(ErrorCode::InvalidListing.into());
    }

    if listing.authority.key() == ctx.accounts.buyer_payment_token_ata.key() {
        return Err(ErrorCode::InvalidBuyer.into());
    }

    let buyer_payment_token = &ctx.accounts.buyer_payment_token_ata;
    let buyer_payment_escrow = &ctx.accounts.buyer_payment_token_account;

    if buyer_payment_token.amount < listing.token_amount {
        return Err(ErrorCode::InsufficientToken.into());
    }

    if listing.state == ListingState::Committed {
        return Err(ErrorCode::ListingCommited.into());
    }

    if listing.payment_mint.key() != ctx.accounts.buyer_payment_mint.key() {
        return Err(ErrorCode::InvalidPaymentMint.into());
    }

    let (_pda, bump) = Pubkey::find_program_address(
        &[PAYMENT_ESCROW_SEEDS, listing.key().as_ref()],
        ctx.program_id,
    );

    require_keys_eq!(
        buyer_payment_escrow.key(),
        _pda,
        ErrorCode::InvalidEscrowAccount
    );

    let signer = &ctx.accounts.signer;
    let token_program = &ctx.accounts.token_program;

    let cpi_account = Transfer {
        from: buyer_payment_token.to_account_info(),
        to: buyer_payment_escrow.to_account_info(),
        authority: signer.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(token_program.to_account_info(), cpi_account);
    token::transfer(cpi_ctx, listing.token_amount)?;

    listing.buyer = signer.key();
    listing.commit_amount = listing.token_amount;
    listing.payment_escrow_bump = bump;
    listing.payment_escrow = ctx.accounts.buyer_payment_token_account.key();
    listing.state = ListingState::Committed;

    Ok(())
}
