import { IMetadataProvider } from "../../types/data";
import { SimpleMetadataStatement } from "../../types/entity";
import { logger } from "../../utils/logger";

export abstract class BaseMetadataProvider implements IMetadataProvider {
  constructor() {
    // bind method "this"'s to instance "this"
    this.loadStatements = this.loadStatements.bind(this);
    this.initialize = this.initialize.bind(this);
    this.getStatements = this.getStatements.bind(this);
  }

  private statements: Record<string, SimpleMetadataStatement> | undefined;

  protected async loadStatements(): Promise<SimpleMetadataStatement[]> {
    throw new Error("Method not implemented.");
  }

  // IMetadataProvider implementation

  async initialize(): Promise<void> {
    const statementsList = await this.loadStatements();

    this.statements = statementsList.reduce(
      (p, c) => {
        p[c.aaguid] = c;
        return p;
      },
      <Record<string, SimpleMetadataStatement>>{}
    );

    logger.info(
      `Metadata provider loaded ${statementsList.length} statement(s)`
    );
  }

  getStatements(): Record<string, SimpleMetadataStatement> {
    if (!this.statements) {
      throw new Error("Provider not initialized");
    }

    return this.statements;
  }
}
