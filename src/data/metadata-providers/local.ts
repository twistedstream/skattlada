import { SimpleMetadataStatement } from "../../types/entity";
import { BaseMetadataProvider } from "./base";

const LOCAL_TEST_FILE_PATH = "./test-metadata.json";

export class LocalMetadataProvider extends BaseMetadataProvider {
  constructor() {
    super();

    // bind method "this"'s to instance "this"
    this.loadStatements = this.loadStatements.bind(this);
  }

  protected async loadStatements(): Promise<SimpleMetadataStatement[]> {
    const data: any = require(LOCAL_TEST_FILE_PATH);

    return Object.keys(data).map((aaguid) => {
      const { name: description, icon_light: icon } = data[aaguid];

      return {
        aaguid,
        description,
        icon,
      };
    });
  }
}
