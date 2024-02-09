import { SimpleMetadataStatement } from "../../types/entity";
import { BaseMetadataProvider } from "./base";

const DATA_URL =
  "https://raw.githubusercontent.com/passkeydeveloper/passkey-authenticator-aaguids/main/combined_aaguid.json";

export class PasskeyProviderAaguidsMetadataProvider extends BaseMetadataProvider {
  constructor() {
    super();

    // bind method "this"'s to instance "this"
    this.loadStatements = this.loadStatements.bind(this);
  }

  protected async loadStatements(): Promise<SimpleMetadataStatement[]> {
    const fetchResponse = await fetch(DATA_URL, {
      method: "GET",
    });
    const data: any = await fetchResponse.json();

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
