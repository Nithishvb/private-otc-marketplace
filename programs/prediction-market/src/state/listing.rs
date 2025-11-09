use anchor_lang::prelude::*;

#[account]
pub struct Listing {
    pub token_mint: Pubkey,
    pub total_tokens: u64,
    pub authority: Pubkey,
    pub locking_period: i64,
    pub token_amount: u64,
    pub bump: u8,
    pub escrow_token_account: Pubkey,
}