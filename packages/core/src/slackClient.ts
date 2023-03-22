import { WebClient } from "@slack/web-api";

export * as SlackClient from "./slackClient";

export function slackClient (token: string) {
    const web = new WebClient(token);
    return web
}
