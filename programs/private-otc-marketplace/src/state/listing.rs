use anchor_lang::prelude::*;

use crate::constants::ListingState;

#[account]
pub struct Listing {
    pub token_mint: Pubkey,
    pub total_tokens: u64,
    pub authority: Pubkey,
    pub locking_period: i64,
    pub is_active: bool,
    pub token_amount: u64,
    pub buyer_payment_mint: Pubkey,
    pub state: ListingState,
    pub payment_mint: Pubkey,
    pub buyer: Pubkey,
    pub commit_amount: u64,
    pub payment_escrow_bump:u8 ,
    pub payment_escrow: Pubkey,
    pub bump: u8,
    pub escrow_token_account: Pubkey,
}