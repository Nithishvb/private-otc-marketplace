use anchor_lang::prelude::*;

use accounts_ix::*;

pub mod constants;
pub mod state;
pub mod accounts_ix;
pub mod instructions;
pub mod error;

declare_id!("8uVcSaPs6ANxnK8uSooLj8vPrjtZ6vFWgx98aw4CnWmJ");

#[program]
pub mod private_otc_marketplace {
    use super::*;

    pub fn create_listing(
        ctx: Context<CreateListing>, 
        token: Pubkey,
        total_token: u64,
        token_amount: u64,
        locking_period: i64
    ) -> Result<()> {
        instructions::create_listing(ctx, token, total_token, token_amount, locking_period)?;   
        Ok(())     
    }
}

