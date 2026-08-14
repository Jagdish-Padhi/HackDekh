import { getDynamoDBClient } from "../db/dynamo.ts";
import { BatchGetCommand } from "@aws-sdk/lib-dynamodb";

export interface PopulateSpec {
  path: string;
  table: string;
  isArray?: boolean;
}

type PopulateTarget = {
  parent: Record<string, any>;
  key: string;
};

function collectTargets(node: any, parts: string[], index = 0, out: PopulateTarget[] = []): PopulateTarget[] {
  if (node == null) return out;
  if (index >= parts.length) return out;

  if (Array.isArray(node)) {
    for (const item of node) {
      collectTargets(item, parts, index, out);
    }
    return out;
  }

  if (typeof node !== "object") return out;

  const part = parts[index];
  if (!(part in node)) return out;

  if (index === parts.length - 1) {
    out.push({ parent: node as Record<string, any>, key: part });
    return out;
  }

  collectTargets((node as Record<string, any>)[part], parts, index + 1, out);
  return out;
}

export async function populate(docs: any | any[], specs: PopulateSpec | PopulateSpec[]): Promise<any> {
  const isSingleDoc = !Array.isArray(docs);
  const documents = isSingleDoc ? [docs] : docs;
  const populateSpecs = Array.isArray(specs) ? specs : [specs];

  if (!documents || documents.length === 0) return isSingleDoc ? null : [];

  for (const spec of populateSpecs) {
    const idsToFetch = new Set<string>();
    const pathParts = spec.path.split(".").filter(Boolean);
    if (pathParts.length === 0) continue;
    
    for (const doc of documents) {
      if (!doc) continue;
      const targets = collectTargets(doc, pathParts);

      for (const target of targets) {
        const val = target.parent[target.key];
        if (!val) continue;

        if (Array.isArray(val)) {
          for (const id of val) {
            if (typeof id === "string") idsToFetch.add(id);
          }
        } else if (typeof val === "string") {
          idsToFetch.add(val);
        }
      }
    }

    if (idsToFetch.size === 0) continue;

    const client = getDynamoDBClient();
    const idsArray = Array.from(idsToFetch);
    const fetchedItems = new Map<string, any>();

    for (let i = 0; i < idsArray.length; i += 100) {
      const batchIds = idsArray.slice(i, i + 100);
      const keys = batchIds.map(id => ({ _id: id }));
      
      const response = await client.send(
        new BatchGetCommand({
          RequestItems: {
            [spec.table]: {
              Keys: keys,
            },
          },
        })
      );

      if (response.Responses && response.Responses[spec.table]) {
        response.Responses[spec.table].forEach((item: any) => {
          fetchedItems.set(item._id, item);
        });
      }
    }

    for (const doc of documents) {
      if (!doc) continue;
      const targets = collectTargets(doc, pathParts);

      for (const target of targets) {
        const val = target.parent[target.key];
        if (!val) continue;

        if (Array.isArray(val)) {
          target.parent[target.key] = val
            .map((id) => (typeof id === "string" ? fetchedItems.get(id) || null : id))
            .filter(Boolean);
        } else if (typeof val === "string") {
          target.parent[target.key] = fetchedItems.get(val) || null;
        }
      }
    }
  }

  return isSingleDoc ? documents[0] : documents;
}
