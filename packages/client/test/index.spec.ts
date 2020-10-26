import { SessionTypes } from "@walletconnect/types";

import Client from "../src";
import { CLIENT_EVENTS, SESSION_EVENTS } from "../src/constants";

const TEST_RELAY_PROVIDER_URL = "http://localhost:5555";

const TEST_SESSION_CHAINS = ["eip155:1"];
const TEST_SESSION_JSONRPC = ["eth_sendTransaction", "eth_signTypedData", "personal_sign"];

const TEST_APP_METADATA_A: SessionTypes.Metadata = {
  name: "App A",
  description: "Description of App run by client A",
  url: "#",
  icons: ["https://walletconnect.org/walletconnect-logo.png"],
};

const TEST_APP_METADATA_B: SessionTypes.Metadata = {
  name: "App B",
  description: "Description of App run by client B",
  url: "#",
  icons: ["https://walletconnect.org/walletconnect-logo.png"],
};

const TEST_SESSION_STATE = {
  accounts: ["0x1d85568eEAbad713fBB5293B45ea066e552A90De@eip155:1"],
};

describe("Client", () => {
  it("instantiate successfully", async () => {
    const client = await Client.init({ relayProvider: TEST_RELAY_PROVIDER_URL });
    expect(client).toBeTruthy();
  });
  it("connect two clients", async () => {
    const clientA = await Client.init({ relayProvider: TEST_RELAY_PROVIDER_URL });
    const clientB = await Client.init({ relayProvider: TEST_RELAY_PROVIDER_URL });
    await Promise.all([
      new Promise(async (resolve, reject) => {
        clientA.on(CLIENT_EVENTS.share_uri, async ({ uri }) => {
          const connectionTopic = await clientB.respond({
            approved: true,
            proposal: uri,
          });

          const connection = await clientB.connection.get(connectionTopic);

          expect(connection).toBeTruthy();
          resolve();
        });
      }),
      new Promise(async (resolve, reject) => {
        clientB.on(SESSION_EVENTS.proposed, async (proposal: SessionTypes.Proposal) => {
          expect(proposal.peer.metadata).toEqual(TEST_APP_METADATA_A);
          expect(proposal.stateParams.chains).toEqual(TEST_SESSION_CHAINS);
          expect(proposal.ruleParams.jsonrpc).toEqual(TEST_SESSION_JSONRPC);
          const sessionTopic = await clientB.respond({
            approved: true,
            proposal,
            response: {
              app: TEST_APP_METADATA_B,
              state: TEST_SESSION_STATE,
            },
          });
          const session = await clientB.connection.get(sessionTopic);

          expect(session).toBeTruthy();
        });
      }),
      new Promise(async (resolve, reject) => {
        const sessionState = await clientA.connect({
          app: TEST_APP_METADATA_A,
          chains: TEST_SESSION_CHAINS,
          jsonrpc: TEST_SESSION_JSONRPC,
        });
        expect(sessionState.accounts).toEqual(TEST_SESSION_STATE.accounts);
      }),
    ]);
  });
});
