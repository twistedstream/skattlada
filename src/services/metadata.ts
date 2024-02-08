import { getMetadataProvider } from "../data";
import { SimpleMetadataStatement } from "../types/entity";

const provider = getMetadataProvider();
const { getStatements } = provider;

export function fetchMetadataById(aaguid: string): SimpleMetadataStatement {
  const statements = getStatements();

  return statements[aaguid];
}
