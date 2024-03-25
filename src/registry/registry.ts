import bodyParser from "body-parser";
import express, { Request, Response } from "express";
import { REGISTRY_PORT } from "../config";
import { generateRsaKeyPair, exportPrvKey, exportPubKey } from '../crypto';


export type Node = { nodeId: number; pubKey: string };

export type RegisterNodeBody = {
  nodeId: number;
  pubKey: string;
};

export type GetNodeRegistryBody = {
  nodes: Node[];
};

const nodes: Node[] = [];

export function getNodeRegistry(): Node[] {
  return nodes;
}

export async function launchRegistry() {
  const _registry = express();
  const nodes: Node[] = [];
  _registry.use(express.json());
  _registry.use(bodyParser.json());
  _registry.get("/status", (req, res) => {res.send('live');});

  _registry.post("/registerNode", (req: Request<{}, {}, RegisterNodeBody>, res: Response) => {
    const { nodeId, pubKey } = req.body;
    if (typeof nodeId === 'number' && typeof pubKey === 'string') {
      nodes.push({ nodeId, pubKey });
      res.json({ message: 'Node registered successfully' });
    } else {
      res.status(400).json({ message: 'Invalid request' });
    }
  });

  _registry.get("/getNodeRegistry", (req, res) => {
    res.json({ nodes });
  });

  const server = _registry.listen(REGISTRY_PORT, () => {
    console.log(`registry is listening on port ${REGISTRY_PORT}`);
  });

  return server;
}
