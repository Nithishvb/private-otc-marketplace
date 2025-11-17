use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::state::Listing;
use crate::constants::*;
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct CommitListing<'info> {
    #[account(mut)]
    pub listing: Account<'info, Listing>,

    #[account(
        mut,
        constraint= buyer_payment_mint.key() == listing.buyer_payment_mint.key() @ ErrorCode::MintMismatch, 
    )]
    pub buyer_payment_mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint= buyer_payment_token_ata.owner == signer.key() @ ErrorCode::SellerNotOwner, 
        constraint = buyer_payment_token_ata.mint == buyer_payment_mint.key() @ ErrorCode::MintMismatch
    )]
    pub buyer_payment_token_ata: Account<'info, TokenAccount>,

    #[account(
        seeds = [PAYMENT_ESCROW_SEEDS, listing.key().as_ref()], 
        bump
    )]
    pub buyer_payment_escrow_pda: UncheckedAccount<'info>,

    #[account(
        init,
        payer = signer,
        token::mint = buyer_payment_mint,
        token::authority = buyer_payment_escrow_pda,
        seeds = [PAYMENT_ESCROW_TOKEN_SEEDS, listing.key().as_ref()],
        bump,
    )]
    pub buyer_payment_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub signer: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}