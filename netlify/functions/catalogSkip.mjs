import {netlifyResponse, getCatalog} from "../../src/bakashiService.mjs";

export default async (req, context) => {
    return netlifyResponse(await getCatalog(context.params.id, context.params.skip));
};

export const config = {
    path: "/catalog/:type/:id/skip=:skip.json"
};