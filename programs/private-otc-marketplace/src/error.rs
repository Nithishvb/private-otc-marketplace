use anchor_lang::prelude::*; 

#[error_code]
pub enum ErrorCode {
    #[msg("Seller not the owner of this token")]
    SellerNotOwner,
    #[msg("Invalid mint account")]
    MintMismatch,
    #[msg("Listing was not active")]
    InvalidListing,
    #[msg("Insufficient balacne to commit this listing")]
    InsufficientToken,
    #[msg("Listing has already been commited by another buyer")]
    ListingCommited,
    #[msg("Invalid payment mint")]
    InvalidPaymentMint,
    #[msg("Invalid Buyer")]
    InvalidBuyer,
    #[msg("Invalid Escrow account")]
    InvalidEscrowAccount
}