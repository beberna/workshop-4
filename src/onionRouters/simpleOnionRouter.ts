import bodyParser from "body-parser";
import express from "express";
import { BASE_ONION_ROUTER_PORT } from "../config";
import { BASE_USER_PORT } from "../config";
import { REGISTRY_PORT } from "../config";
import { generateRsaKeyPair, exportPrvKey, exportPubKey } from '../crypto';


export async function simpleOnionRouter(nodeId: number) {
  const onionRouter = express();
  const nodes = new Map<number, string>();
  onionRouter.use(express.json());
  onionRouter.use(bodyParser.json());
  const keyPair = await generateRsaKeyPair();
  let privateKey: string | null = await exportPrvKey(keyPair.privateKey);
  let publicKey: string | null = await exportPubKey(keyPair.publicKey);
  
  onionRouter.get("/status", (req, res) => {res.send('live');});
  onionRouter.get("/getLastReceivedEncryptedMessage", (req, res) => {
    res.json({ result: null });
  });
  onionRouter.get("/getLastReceivedDecryptedMessage", (req, res) => {
    res.json({ result: null });
  });
  onionRouter.get("/getLastMessageDestination", (req, res) => {
    if (req === null) {
      res.json(null);
    } else {
      res.json({ result: null });
    }
  });  

  await fetch(`http://localhost:${REGISTRY_PORT}/registerNode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nodeId, pubKey: publicKey }),
  });

  onionRouter.get("/getPrivateKey", (req, res) => {
    res.json({ result: privateKey });
  });

  const server = onionRouter.listen(BASE_ONION_ROUTER_PORT + nodeId, () => {
    console.log(`Onion router ${nodeId} is listening on port ${BASE_ONION_ROUTER_PORT + nodeId}`);
  });

  return server;
}
