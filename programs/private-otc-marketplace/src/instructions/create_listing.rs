use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;
use anchor_spl::token::{ self, Transfer };

use crate::state::*;
use crate::accounts_ix::*;

pub fn create_listing(
    ctx: Context<CreateListing>, 
    token: Pubkey, 
    total_tokens: u64,
    token_amount: u64, 
    locking_period: i64,
    payment_mint: Pubkey,
) -> Result<()> {
    {
        let listings: &mut Account<Listing> = &mut ctx.accounts.listing;

        listings.token_mint = token;
        listings.total_tokens = total_tokens;
        listings.locking_period = locking_period;
        listings.token_amount = token_amount;
        listings.authority = ctx.accounts.signer.key();
        listings.payment_mint = payment_mint;

        let (_, escrow_bump) = Pubkey::find_program_address(
            &[b"escrow", listings.key().as_ref()],
            ctx.program_id
        );
        listings.bump = escrow_bump;
        listings.escrow_token_account = ctx.accounts.escrow_token_account.key();

        let seller: &Account<'_, TokenAccount> = &ctx.accounts.seller_token_account;
        let escrow_account= &ctx.accounts.escrow_token_account;
        let signer= &ctx.accounts.signer;
        let token_program = &ctx.accounts.token_program;

        let cpi_account = Transfer {
            from:  seller.to_account_info(),
            to: escrow_account.to_account_info(),
            authority: signer.to_account_info()
        };

        let cpi_ctx = CpiContext::new(
            token_program.to_account_info(), 
            cpi_account
        );
        token::transfer(cpi_ctx, total_tokens)?;

        listings.is_active = true;
    }

    msg!("Listing {} has been created", ctx.accounts.listing.key());

    Ok(())
}
