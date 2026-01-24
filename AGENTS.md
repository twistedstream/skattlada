# AGENTS.md

This document provides guidance for AI agents and developers working with the **Skattlada** codebase.

## Project Overview

**Skattlada** is a Swedish file-sharing server that prioritizes security, low friction, and minimal user effort. It enables users to securely share files using FIDO2/WebAuthn (passkeys) for authentication, eliminating the need for traditional passwords.

- **Runtime**: Node.js v22.11.0+
- **Language**: TypeScript v5.7+
- **Framework**: Express.js v5
- **Authentication**: FIDO2/WebAuthn via `@simplewebauthn/server`
- **License**: MIT

## Project Structure

```
src/
├── app.ts                 # Express app configuration
├── server.ts              # HTTP/HTTPS server initialization
├── website.ts             # Session/auth middleware setup
├── error-handler.ts       # Global error handling
├── routes/                # API & page route handlers
│   ├── index.ts           # Main router (/register, /login, /logout)
│   ├── shares.ts          # File share routes
│   ├── invites.ts         # User invitation routes
│   ├── fido2/             # FIDO2 authentication endpoints
│   └── profile/           # User profile management
├── services/              # Business logic layer
│   ├── index.ts           # Service initialization
│   ├── invite.ts          # Invite creation/management
│   ├── share.ts           # Share creation/access logic
│   └── user/              # User-related operations
├── data/                  # Data access layer
│   ├── data-providers/    # Data persistence implementations
│   │   ├── in-memory.ts   # Non-persistent (testing)
│   │   └── google-sheets/ # Google Sheets as database
│   ├── file-providers/    # File source implementations
│   │   ├── local.ts       # Local test files
│   │   └── google-drive.ts
│   └── metadata-providers/ # FIDO authenticator metadata
├── types/                 # TypeScript interfaces & types
│   ├── entity.ts          # Domain models (User, Invite, Share, FileInfo)
│   ├── data.ts            # Provider interfaces
│   ├── auth.ts            # Authentication state types
│   └── express.ts         # Express request/response extensions
├── utils/                 # Utility functions
│   ├── auth/              # Auth helpers & middleware
│   ├── config.ts          # Environment configuration
│   ├── error.ts           # Custom error classes
│   └── logger.ts          # Pino logger setup
└── integration-tests/     # End-to-end tests

views/                     # Handlebars templates
public/                    # Static assets (CSS, JS, images)
```

## Key Files

| File | Purpose |
|------|---------|
| `src/utils/config.ts` | Environment configuration loading |
| `src/types/entity.ts` | Core domain models |
| `src/types/data.ts` | Provider interfaces (`IDataProvider`, `IFileProvider`, `IMetadataProvider`) |
| `src/utils/auth/index.ts` | Session management, `requiresAuth()`, `requiresAdmin()` middleware |
| `src/data/index.ts` | Provider factory/initialization |
| `CONFIG.md` | Comprehensive environment variable documentation |

## Architecture Patterns

### Provider Pattern

The codebase uses a provider pattern for pluggable implementations:

- **`IDataProvider`**: User, credential, invite, and share persistence
- **`IFileProvider`**: File access and streaming
- **`IMetadataProvider`**: FIDO authenticator metadata

Implementations can be swapped via environment variables without code changes.

### Separation of Concerns

- **Routes**: HTTP endpoint handlers (thin, delegate to services)
- **Services**: Business logic
- **Data layer**: Abstracted persistence
- **Utils**: Reusable functions

## Development Commands

```bash
# Install dependencies
npm install

# Run development server (HTTPS with self-signed cert)
npm run dev

# Build TypeScript
npm run build

# Format code
npm run format

# Check formatting
npm run format:check
```

## Testing

The project uses [TAP](https://node-tap.org/) (Test Anything Protocol) for testing.

```bash
# Run all unit tests
npm run test:unit

# Run specific unit test
npm run test:unit ./src/app.test.ts

# Run all integration tests
npm run test:integration-all

# Run specific integration test
npm run test:integration-single ./src/integration-tests/simple-registration-and-signin.ts
```

### Test File Conventions

- Unit tests: `*.test.ts` colocated with source files
- Integration tests: `src/integration-tests/`
- Test utilities: `src/utils/testing/`

## Coding Conventions

### Naming

- **Functions/variables**: camelCase
- **Classes/types**: PascalCase
- **Interfaces**: Prefixed with `I` (e.g., `IDataProvider`)
- **Test files**: `*.test.ts` suffix

### Code Style

- Async/await for asynchronous operations
- Dependency injection via function parameters
- Prettier for formatting (trailing commas enabled)
- No semicolons enforced by Prettier config

### Error Handling

- Custom error classes in `src/utils/error.ts` with HTTP status codes
- Global error handler middleware in `src/error-handler.ts`
- Correlation IDs for request tracing

## Environment Configuration

Key environment variables (see `CONFIG.md` for complete list):

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | development or production |
| `PORT` | HTTP listening port |
| `RP_ID` | FIDO relying party hostname |
| `BASE_URL` | Full URL (protocol + hostname) |
| `DATA_PROVIDER_NAME` | `in-memory` or `google-sheets` |
| `FILE_PROVIDER_NAME` | `local` or `google-drive` |
| `COOKIE_SECRET` | Session encryption key |
| `CSRF_SECRET` | CSRF token encryption key |

## CI/CD Pipeline

GitHub Actions workflows in `.github/workflows/`:

1. **build.yml**: Runs on every push
   - Installs dependencies
   - Builds TypeScript
   - Checks formatting (Prettier)
   - Runs unit and integration tests

2. **release.yml**: Triggered on main branch merge
   - Automated version bumping
   - Creates GitHub release

3. **deploy.yml**: Triggered on new tags
   - Builds and pushes Docker image
   - Deploys to Portainer

## Common Tasks

### Adding a New Route

1. Create route handler in `src/routes/`
2. Register route in `src/routes/index.ts`
3. Add corresponding Handlebars template in `views/`
4. Write tests in `*.test.ts` file

### Adding a New Data Provider

1. Implement `IDataProvider` interface from `src/types/data.ts`
2. Add provider in `src/data/data-providers/`
3. Register in `src/data/index.ts` factory
4. Document configuration in `CONFIG.md`

### Adding a New File Provider

1. Implement `IFileProvider` interface from `src/types/data.ts`
2. Add provider in `src/data/file-providers/`
3. Register in `src/data/index.ts` factory
4. Document configuration in `CONFIG.md`

## Security Considerations

- FIDO2/WebAuthn for phishing-resistant authentication
- CSRF protection via `csrf-csrf` package
- Helmet.js for security headers
- Cookie-based sessions with encryption
- Input validation at route boundaries

## Dependencies

Key runtime dependencies:

- `express` v5 - Web framework
- `@simplewebauthn/server` - FIDO2/WebAuthn
- `express-handlebars` - Templating
- `helmet` - Security headers
- `pino` - Logging
- `@googleapis/drive`, `@googleapis/sheets` - Google integrations

## Troubleshooting

### Schema Issues

```bash
# Reset data provider schema
npm run schema:drop
npm run schema:apply
```

### TLS Certificate Issues

```bash
# Regenerate development certificates
sudo ./cert/create-dev-cert.sh
sudo ./cert/install-dev-cert.sh
```

### DNS Issues

Ensure `/etc/hosts` contains:
```
127.0.0.1  skattlada.dev
```
