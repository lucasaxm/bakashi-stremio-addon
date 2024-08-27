import {getCatalog, netlifyResponse} from "../../src/bakashiService.mjs";

export default async (req, context) => {
    return netlifyResponse(await getCatalog(context.params.id, 0));
};

export const config = {
    path: "/catalog/:type/:id.json"
};