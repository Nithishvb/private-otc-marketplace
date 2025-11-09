use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{ Mint, Token, TokenAccount };

use crate::constants::*;
use crate::state::*;
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct CreateListing<'info> {
    #[account(
        init, 
        payer = signer, 
        space = CreateListing::SPACE, 
        seeds=[LISTING_SEEDS, signer.key().as_ref()], 
        bump
    )]
    pub listing: Account<'info, Listing>,

    #[account(
        mut, 
        constraint= seller_token_account.owner == signer.key() @ ErrorCode::SellerNotOwner, 
        constraint = seller_token_account.mint == token_mint.key() @ ErrorCode::MintMismatch
    )]
    pub seller_token_account: Account<'info, TokenAccount>,

    /// CHECK: This is a PDA derived inside the program, so we trust it.
    #[account(
        seeds = [b"escrow", listing.key().as_ref()], 
        bump
    )]
    pub escrow_pda: UncheckedAccount<'info>,

    #[account(
        init,
        payer = signer,
        token::mint = token_mint,
        token::authority = escrow_pda,
        seeds = [ESCROW_SEEDS, listing.key().as_ref()],
        bump,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    pub token_mint: Account<'info, Mint>,

    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

impl<'info> CreateListing<'info> {
    pub const SPACE: usize = 8 + 32 + 8 + 32 + 8 + 8 + 1 + 32;
}