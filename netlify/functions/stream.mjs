import {netlifyResponse, getStream} from "../../src/bakashiService.mjs";

export default async (req, context) => {
    return netlifyResponse(await getStream(context.params.id));
};

export const config = {
    path: "/stream/:type/:id.json"
};