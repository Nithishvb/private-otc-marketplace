use anchor_lang::prelude::*; 

#[error_code]
pub enum ErrorCode {
    #[msg("Seller not the owner of this token")]
    SellerNotOwner,
    #[msg("Invalid mint account")]
    MintMismatch,
}