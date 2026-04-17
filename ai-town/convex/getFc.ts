import { query } from "./_generated/server";

export const get = query({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.db.query("havenUsers").collect();
        return users.map(u => ({ username: u.username, familyCode: u.familyCode }));
    },
});
