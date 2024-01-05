import { Router } from "express";

import assertion from "./assertion";
import attestation from "./attestation";
import errorHandler from "./error-handler";

const router = Router();

router.use("/assertion", assertion);
router.use("/attestation", attestation);

// configure FIDO2 endpoint error handler
errorHandler(router);

export default router;
