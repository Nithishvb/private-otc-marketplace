use anchor_lang::prelude::*;

pub const LISTING_SEEDS: &[u8] = b"user-listing-seed";

pub const ESCROW_SEEDS: &[u8] = b"escrow-seed";

pub const PAYMENT_ESCROW_TOKEN_SEEDS: &[u8] = b"payment-token-escrow-seed";

pub const PAYMENT_ESCROW_SEEDS: &[u8] = b"payment-escrow-seed";

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum ListingState {
    Committed,
    Locked,
}