import * as express from "express";

import * as moment from "moment";

import mustacheExpress = require("mustache-express");
import { URL } from "url";

import { ClientEnvironment } from "../common/ClientEnvironment";
import { probablyUniqueString, ParseJSONOrDefault } from "../common/Toolbox";
import { configureBasicRulesContent } from "./configureBasicRulesContent";
import { getAccount, upsertUser } from "./dbconnection";
import { configureMetricsRoutes } from "./metrics";
import {
  configureLoginRedirect,
  configureLogout,
  configurePatreonWebhookReceiver,
  startNewsUpdates,
  updateSessionAccountFeatures
} from "./patreon";
import { PlayerViewManager } from "./playerviewmanager";
import { shutdownServer } from "./shutdown";
import configureStorageRoutes from "./storageroutes";
import { AccountStatus } from "./user";
import { configureOpen5eContent } from "./configureOpen5eContent";
import { configureAffiliateRoutes } from "./configureAffiliateRoutes";
import { configureImportRoutes } from "./configureImportRoutes";

const baseUrl = process.env.BASE_URL || "";
const patreonClientId = process.env.PATREON_CLIENT_ID || "PATREON_CLIENT_ID";
const defaultAccountLevel = process.env.DEFAULT_ACCOUNT_LEVEL || "none";
const googleAnalyticsId = process.env.GOOGLE_ANALYTICS_ID || "";
// Opt-in only: this codebase also runs as the public hosted service, so a
// route that stops the process must never exist unless explicitly enabled
// for a local, single-user instance.
const allowServerShutdown = process.env.ALLOW_SERVER_SHUTDOWN === "true";
// A per-process secret required by /shutdown, generated fresh on each server
// start. Only the DM-facing tracker page is handed this token (see
// getClientOptions) - the Player View page, which other devices on the LAN
// can reach, never receives it, so those devices can't call /shutdown even
// though they share an origin with it.
const shutdownToken = probablyUniqueString();

export type Req = Express.Request & express.Request;
export type Res = Express.Response & express.Response;

const appVersion = require("../package.json").version;

const getClientOptions = (
  session: Express.Session,
  options?: { includeShutdownCapability?: boolean }
) => {
  const includeShutdownCapability =
    allowServerShutdown && (options?.includeShutdownCapability ?? false);
  const encounterId = session.encounterId || probablyUniqueString();
  const patreonLoginUrl =
    "http://www.patreon.com/oauth2/authorize" +
    `?response_type=code&client_id=${patreonClientId}` +
    `&redirect_uri=${baseUrl}/r/patreon` +
    `&scope=` +
    encodeURIComponent(`identity identity.memberships identity[email]`) +
    `&state=${encounterId}`;

  const environment: ClientEnvironment = {
    EncounterId: encounterId,
    BaseUrl: baseUrl,
    PatreonLoginUrl: patreonLoginUrl,
    IsLoggedIn: session.isLoggedIn || false,
    HasStorage: session.hasStorage || false,
    HasEpicInitiative: session.hasEpicInitiative || false,
    HasMythic: session.hasMythic || false,
    SendMetrics: process.env.METRICS_DB_CONNECTION_STRING != undefined,
    GoogleAnalyticsId: googleAnalyticsId,
    PostedEncounter: null,
    SentryDSN: process.env.SENTRY_DSN || null,
    CanShutdownServer: includeShutdownCapability,
    ShutdownToken: includeShutdownCapability ? shutdownToken : null
  };

  if (session.postedEncounter) {
    environment.PostedEncounter = session.postedEncounter;
    delete session.postedEncounter;
  }

  return {
    environmentJSON: JSON.stringify(environment),
    baseUrl,
    appVersion,
    googleAnalyticsId
  };
};

export default async function (
  app: express.Application,
  playerViews: PlayerViewManager
): Promise<void> {
  const mustacheEngine = mustacheExpress();

  let cacheMaxAge = moment.duration(7, "days").asMilliseconds();
  if (process.env.NODE_ENV === "development") {
    mustacheEngine.cache._max = 0;
    cacheMaxAge = 0;
  }

  if (!process.env.BASE_URL?.length) {
    console.error(
      "BASE_URL environment variable is not set. Cannot start server."
    );
    process.exit(1);
  }

  app.engine("html", mustacheEngine);
  app.set("view engine", "html");
  app.set("views", __dirname + "/../html");

  app.use(express.static(__dirname + "/../public", { maxAge: cacheMaxAge }));

  app.use(
    express.json({
      verify: function (req, res, buf, encoding) {
        req["rawBody"] = buf.toString();
      }
    })
  );
  app.use(express.urlencoded({ extended: false }));

  configureMetricsRoutes(app);

  app.get("/", async (req: Req, res: Res) => {
    const session = req.session;
    if (session === undefined) {
      throw "Session is not available";
    }

    // A locally-hosted instance always has the same default DM - the
    // marketing landing page (aimed at anonymous first-time visitors to the
    // hosted service) doesn't apply, and sending them through it risks
    // "Build an Encounter" discarding their in-progress autosaved encounter.
    if (defaultAccountLevel !== "none") {
      return res.redirect("/e/");
    }

    session.encounterId = await playerViews.InitializeNew();

    const renderOptions = getClientOptions(session);
    return res.render("landing", renderOptions);
  });

  configureAffiliateRoutes(app);

  app.get("/e/:id", (req: Req, res: Res) => {
    const session = req.session;
    if (session === undefined) {
      throw "Session is not available";
    }
    session.encounterId = req.params.id;
    const urlObject = new URL(req.url, baseUrl);
    const queryString = urlObject.search;

    res.redirect("/e/" + queryString);
  });

  app.get("/e/", async (req: Req, res: Res) => {
    const session = req.session;
    if (session === undefined) {
      throw "Session is not available";
    }

    if (defaultAccountLevel !== "none") {
      await setupLocalDefaultUser(session);
    }

    updateSession(session);

    const options = getClientOptions(session, {
      includeShutdownCapability: true
    });
    return res.render("tracker", options);
  });

  app.get("/p/:id", (req: Req, res: Res) => {
    const session = req.session;
    if (session == null) {
      throw "Session is not available";
    }

    session.encounterId = req.params.id;
    res.render("playerview", getClientOptions(session));
  });

  app.get("/playerviews/:id", async (req: Req, res: Res) => {
    const playerView = await playerViews.Get(req.params.id);
    res.json(playerView);
  });

  configureBasicRulesContent(app);
  const configureOpen5eContentPromise = configureOpen5eContent(app);

  configureImportRoutes(app, playerViews);
  app.get("/transferlocalstorage/", (req: Req, res: Res) => {
    res.render("transferlocalstorage", { baseUrl });
  });

  configureLoginRedirect(app);
  configureLogout(app);
  configurePatreonWebhookReceiver(app);
  configureStorageRoutes(app);
  startNewsUpdates(app);

  if (allowServerShutdown) {
    app.post("/shutdown", (req: Req, res: Res) => {
      // Requiring a JSON content-type means a plain HTML form (as used by
      // cross-site request forgery) cannot trigger this - the browser will
      // not send this content-type without a same-origin script doing so,
      // and this server does not send CORS headers permitting cross-origin
      // access to this content-type from another origin.
      if (req.headers["content-type"] !== "application/json") {
        return res.sendStatus(400);
      }
      // The content-type check above only rules out classic form-based CSRF.
      // This local instance can also be reached by other devices on the LAN
      // (e.g. a player's tablet showing the Player View), which share this
      // origin and so aren't stopped by that check alone - requiring this
      // per-process token, only ever sent to the DM-facing tracker page,
      // keeps them from triggering a shutdown themselves.
      if (req.body?.token !== shutdownToken) {
        return res.sendStatus(403);
      }
      res.sendStatus(200);
      res.on("finish", () => {
        shutdownServer();
      });
    });
  }

  return configureOpen5eContentPromise;
}

async function setupLocalDefaultUser(session: Express.Session) {
  let accountStatus = AccountStatus.None;
  if (defaultAccountLevel === "accountsync") {
    session.hasStorage = true;
    accountStatus = AccountStatus.Pledge;
  }

  if (defaultAccountLevel === "epicinitiative") {
    session.hasStorage = true;
    session.hasEpicInitiative = true;
    accountStatus = AccountStatus.Epic;
  }

  if (defaultAccountLevel === "mythic") {
    session.hasStorage = true;
    session.hasEpicInitiative = true;
    session.hasMythic = true;
    accountStatus = AccountStatus.Mythic;
  }

  session.isLoggedIn = true;

  const user = await upsertUser(
    process.env.DEFAULT_PATREON_ID || "defaultPatreonId",
    accountStatus,
    ""
  );

  if (user) {
    session.userId = user._id;
  }

  return;
}

async function updateSession(session: Express.Session) {
  if (session.userId) {
    const account = await getAccount(session.userId);
    if (account) {
      updateSessionAccountFeatures(session, account.accountStatus);
    }
  }
}
