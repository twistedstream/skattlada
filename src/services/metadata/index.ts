import { SimpleMetadataStatement } from "../../types/entity";
import { metadataUrl } from "../../utils/config";
import { logger } from "../../utils/logger";

const LOCAL_TEST_FILE_PATH = "./test-metadata.json";

let statements: Record<string, SimpleMetadataStatement>;

export async function loadMetadata(): Promise<void> {
  statements = {};
  const data = metadataUrl
    ? await (await fetch(metadataUrl)).json()
    : require(LOCAL_TEST_FILE_PATH);

  const aaguids = Object.keys(data);
  let count = 0;
  for (const aaguid of aaguids) {
    const entry = data[aaguid];
    const statement: SimpleMetadataStatement = {
      aaguid,
      description: entry.name,
      icon: entry.icon_light,
    };

    statements[aaguid] = statement;
    count++;
  }

  logger.info(
    `Loaded ${count} metadata statement(s) from: ${metadataUrl ?? LOCAL_TEST_FILE_PATH}`
  );
}

export function findMetadata(
  aaguid: string
): SimpleMetadataStatement | undefined {
  if (!statements) {
    throw new Error("Metadata statements have not been loaded");
  }

  return statements[aaguid];
}
