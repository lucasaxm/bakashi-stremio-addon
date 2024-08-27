import {getMeta, netlifyResponse} from "../../src/bakashiService.mjs";

export default async (req, context) => {
    return netlifyResponse(await getMeta(context.params.id));
};

export const config = {
    path: "/meta/:type/:id.json"
};