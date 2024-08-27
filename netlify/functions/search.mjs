import {getSearch, netlifyResponse} from "../../src/bakashiService.mjs";

export default async (req, context) => {
    return netlifyResponse(await getSearch(context.params.search));
};

export const config = {
    path: "/catalog/:type/bakashi_search/search=:search.json"
};
