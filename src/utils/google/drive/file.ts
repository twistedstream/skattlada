const FILE_ID_PATTERNS = [
  /^https:\/\/docs\.google\.com\/(?:spreadsheets|document|presentation)\/d\/(?<fileId>[^\/\?#]*)/,
  /^https:\/\/drive\.google\.com\/file\/d\/(?<fileId>[^\/\?#]*)/,
];

export function fileIdFromUrl(url: string): string | undefined {
  for (const pattern of FILE_ID_PATTERNS) {
    const fileId = pattern.exec(url)?.groups?.fileId;
    if (fileId) {
      return fileId;
    }
  }
}
