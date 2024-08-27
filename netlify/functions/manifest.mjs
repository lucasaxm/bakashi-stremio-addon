import {getManifest, netlifyResponse} from "../../src/bakashiService.mjs";

export default async (req, context) => {
    return netlifyResponse(await getManifest());
};

export const config = {
    path: "/manifest.json"
};