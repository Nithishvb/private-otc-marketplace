use anchor_lang::prelude::*;

declare_id!("8uVcSaPs6ANxnK8uSooLj8vPrjtZ6vFWgx98aw4CnWmJ");

#[program]
pub mod prediction_market {
    use super::*;

    pub fn create_events(ctx: Context<CreateEvents>, name: String, yes_price: usize, no_price: usize) -> Result<()> {
        let event = &mut ctx.accounts.event;
        event.name = name;
        event.yes_price = yes_price;
        event.no_price = no_price;
        event.yes_pool = 0;
        event.no_pool = 0;
        msg!("Event Created successfully");
        Ok(())
    }

    pub fn buy_yes_event(ctx: Context<BuyYesPrice>, total_buy_lot: usize) -> Result<()> {
        let event = &mut ctx.accounts.event;
        event.yes_pool = event.yes_price * total_buy_lot;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateEvents<'info> {
    #[account(init, payer=signer, space = 108)]
    pub event: Account<'info, MarketEvent>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
pub struct BuyYesPrice<'info> {
    #[account(mut)]
    pub event: Account<'info, MarketEvent>,
}

#[account]
pub struct MarketEvent {
    pub name: String,
    pub yes_pool: usize,
    pub no_pool: usize,
    pub yes_price: usize,
    pub no_price: usize
}
