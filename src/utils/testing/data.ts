import { isoBase64URL } from "@simplewebauthn/server/helpers";
import {
  AuthenticatorTransport,
  CredentialDeviceType,
} from "@simplewebauthn/typescript-types";
import crypto from "crypto";
import { DateTime } from "luxon";
import {
  Authenticator,
  FileInfo,
  Invite,
  Share,
  User,
} from "../../types/entity";

type TestShareOptions = {
  file?: FileInfo;
  claimedBy?: User;
};

// reusable test objects

export const testNowDate = DateTime.fromObject(
  {
    year: 2023,
    month: 6,
    day: 1,
  },
  { zone: "utc" }
);

export const testUser1Identifier: string = "123abc";

export function testUser1(): User {
  return {
    id: testUser1Identifier,
    created: DateTime.fromObject(
      {
        year: 2023,
        month: 1,
        day: 1,
      },
      { zone: "utc" }
    ),
    username: "bob",
    displayName: "Bob User",
    isAdmin: false,
  };
}

export const testUser2Identifier: string = "abc123";

export function testUser2(): User {
  return {
    id: testUser2Identifier,
    created: DateTime.fromObject(
      {
        year: 2023,
        month: 4,
        day: 1,
      },
      { zone: "utc" }
    ),
    username: "jim",
    displayName: "Jim User",
    isAdmin: true,
  };
}

const testCredential1Identifier = isoBase64URL.fromBuffer(
  crypto.randomBytes(8)
);
const testCredential1PublicKey = isoBase64URL.fromBuffer(
  crypto.randomBytes(42)
);

export function testCredential1(): Authenticator {
  return {
    created: DateTime.fromObject(
      {
        year: 2023,
        month: 2,
        day: 1,
      },
      { zone: "utc" }
    ),
    credentialID: testCredential1Identifier,
    credentialPublicKey: testCredential1PublicKey,
    counter: 24,
    aaguid: "AUTH_GUID_1",
    credentialDeviceType: <CredentialDeviceType>"multiDevice",
    credentialBackedUp: true,
    transports: <AuthenticatorTransport[]>["internal"],
  };
}

const testCredential2Identifier = isoBase64URL.fromBuffer(
  crypto.randomBytes(8)
);
const testCredential2PublicKey = isoBase64URL.fromBuffer(
  crypto.randomBytes(42)
);

export function testCredential2(): Authenticator {
  return {
    created: DateTime.fromObject(
      {
        year: 2023,
        month: 3,
        day: 1,
      },
      { zone: "utc" }
    ),
    credentialID: testCredential2Identifier,
    credentialPublicKey: testCredential2PublicKey,
    counter: 42,
    aaguid: "AUTH_GUID_2",
    credentialDeviceType: <CredentialDeviceType>"singleDevice",
    credentialBackedUp: false,
    transports: <AuthenticatorTransport[]>["usb", "nfc"],
  };
}

export function testInvite1(createdBy: User, claimedBy?: User): Invite {
  return {
    id: "INVITE_1",
    sourceType: "invite",
    isAdmin: true,
    created: DateTime.fromObject(
      {
        year: 2023,
        month: 1,
        day: 1,
      },
      { zone: "utc" }
    ),
    createdBy,
    ...(claimedBy && {
      claimed: DateTime.fromObject(
        {
          year: 2023,
          month: 1,
          day: 2,
        },
        { zone: "utc" }
      ),
      claimedBy,
    }),
  };
}

export function testShare1(
  createdBy: User,
  options: TestShareOptions = {}
): Share {
  const { claimedBy } = options;
  const file = options.file || testFile1();

  return {
    id: "SHARE_1",
    sourceType: "share",
    isAdmin: false,
    created: DateTime.fromObject(
      {
        year: 2023,
        month: 1,
        day: 1,
      },
      { zone: "utc" }
    ),
    createdBy,
    ...(claimedBy && {
      claimed: DateTime.fromObject(
        {
          year: 2023,
          month: 1,
          day: 2,
        },
        { zone: "utc" }
      ),
      claimedBy,
    }),
    backingUrl: `https://example.com/${file.id}`,
    fileTitle: file.title,
    fileType: file.type,
    availableMediaTypes: file.availableMediaTypes,
  };
}

export function testShare2(
  createdBy: User,
  options: TestShareOptions = {}
): Share {
  const { claimedBy } = options;
  const file = options.file || testFile2();

  return {
    id: "SHARE_2",
    sourceType: "share",
    isAdmin: false,
    created: DateTime.fromObject(
      {
        year: 2023,
        month: 2,
        day: 1,
      },
      { zone: "utc" }
    ),
    createdBy,
    ...(claimedBy && {
      claimed: DateTime.fromObject(
        {
          year: 2023,
          month: 2,
          day: 2,
        },
        { zone: "utc" }
      ),
      claimedBy,
    }),
    backingUrl: `https://example.com/${file.id}`,
    fileTitle: file.title,
    fileType: file.type,
    availableMediaTypes: file.availableMediaTypes,
  };
}

export function testShare3(
  createdBy: User,
  options: TestShareOptions = {}
): Share {
  const { claimedBy } = options;
  const file = options.file || testFile3();

  return {
    id: "SHARE_3",
    sourceType: "share",
    isAdmin: false,
    created: DateTime.fromObject(
      {
        year: 2023,
        month: 3,
        day: 1,
      },
      { zone: "utc" }
    ),
    createdBy,
    ...(claimedBy && {
      claimed: DateTime.fromObject(
        {
          year: 2023,
          month: 3,
          day: 2,
        },
        { zone: "utc" }
      ),
      claimedBy,
    }),
    backingUrl: `https://example.com/${file.id}`,
    fileTitle: file.title,
    fileType: file.type,
    availableMediaTypes: file.availableMediaTypes,
  };
}

export function testShare4(
  createdBy: User,
  options: TestShareOptions = {}
): Share {
  const { claimedBy } = options;
  const file = options.file || testFile4();

  return {
    id: "SHARE_4",
    sourceType: "share",
    isAdmin: false,
    created: DateTime.fromObject(
      {
        year: 2023,
        month: 4,
        day: 1,
      },
      { zone: "utc" }
    ),
    createdBy,
    ...(claimedBy && {
      claimed: DateTime.fromObject(
        {
          year: 2023,
          month: 4,
          day: 2,
        },
        { zone: "utc" }
      ),
      claimedBy,
    }),
    backingUrl: `https://example.com/${file.id}`,
    fileTitle: file.title,
    fileType: file.type,
    availableMediaTypes: file.availableMediaTypes,
  };
}

export function testFile1(): FileInfo {
  return {
    id: "doc1",
    type: "document",
    title: "Example Doc",
    availableMediaTypes: [
      {
        name: "application/msword",
        description: "Microsoft Word",
        extension: "doc",
      },
    ],
  };
}

export function testFile2(): FileInfo {
  return {
    id: "sheet1",
    type: "spreadsheet",
    title: "Example Spreadsheet",
    availableMediaTypes: [
      {
        name: "application/vnd.ms-excel",
        description: "Microsoft Excel",
        extension: "xls",
      },
    ],
  };
}

export function testFile3(): FileInfo {
  return {
    id: "pres1",
    type: "presentation",
    title: "Example Presentation",
    availableMediaTypes: [
      {
        name: "application/vnd.ms-powerpoint",
        description: "Microsoft PowerPoint",
        extension: "ppt",
      },
    ],
  };
}

export function testFile4(): FileInfo {
  return {
    id: "pdf1",
    type: "pdf",
    title: "Example PDF",
    availableMediaTypes: [
      {
        name: "application/pdf",
        description: "PDF Document",
        extension: "pdf",
      },
    ],
  };
}
