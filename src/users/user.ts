import bodyParser from "body-parser";
import express from "express";
import axios from 'axios';
import { Request, Response } from 'express';
import { BASE_USER_PORT, REGISTRY_PORT,BASE_ONION_ROUTER_PORT } from "../config";
import {createRandomSymmetricKey, rsaEncrypt,symEncrypt,importSymKey,exportSymKey} from '../crypto';
import { Node, getNodeRegistry, launchRegistry } from "../registry/registry"; 

export type SendMessageBody = {
  message: string;
  destinationUserId: number;
};

function createCircuit(){
  const nodes: Node[] = getNodeRegistry();
  for (let i = nodes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [nodes[i], nodes[j]] = [nodes[j], nodes[i]];
  }
  return nodes.slice(0, 3);
}

async function getPublicKey(nodeId: number): Promise<string> {
  const response = await axios.get(`http://localhost:${REGISTRY_PORT}/getNodeRegistry`);
  const nodes: Node[] = response.data.nodes;
  const node = nodes.find(node => node.nodeId === nodeId);
  if (!node) {
    throw new Error(`Node with id ${nodeId} not found`);
  }
  return node.pubKey;
}


export async function user(userId: number) {
  const _user = express();
  _user.use(express.json());
  _user.use(bodyParser.json());  
  let lastReceivedMessage: string | null = null; //initialize it null, updated when received
  let lastSentMessage: string | null = null; //initialize it null, updated when sent
  _user.get("/status", (req, res) => {res.send('live');});

  _user.get("/getLastReceivedMessage", (req, res) => {
    res.json({ result: lastReceivedMessage });
  });
  _user.get("/getLastSentMessage", (req, res) => {
    res.json({ result: lastSentMessage });
  });

  _user.post("/message", (req, res) => {
    const { message } = req.body as SendMessageBody;
    lastReceivedMessage = message;

    res.send('success');
  });

  _user.post('/sendMessage', async (req, res) => {
    const { message, destinationUserId } = req.body;
    const circuit = createCircuit(); 
    let encryptedMessage = message;
    
    for (const node of circuit) {
      const symmetricKey = await createRandomSymmetricKey();
      const publicKey = await getPublicKey(BASE_ONION_ROUTER_PORT + node.nodeId);
    
      const destination = destinationUserId.toString().padStart(10, '0');
      const messageWithDestination = `${destination}:${encryptedMessage}`;
      const encryptedMessageResult = await symEncrypt(symmetricKey, messageWithDestination);
      const encryptedKey = await rsaEncrypt(await exportSymKey(symmetricKey), publicKey);
    
      encryptedMessage = `${encryptedKey}:${encryptedMessageResult}`;
    }
    
    axios.post(`http://localhost:${BASE_ONION_ROUTER_PORT + circuit[0].nodeId}/message`, {
      message: encryptedMessage,
      nextNode: circuit[1],
      destinationUserId
    });
    lastSentMessage = message;
    res.send('success');
  });

  const server = _user.listen(BASE_USER_PORT + userId, () => {
    console.log(
      `User ${userId} is listening on port ${BASE_USER_PORT + userId}`
    );
  });

  return server;
}
