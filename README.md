# n8n-nodes-deso

Community node for publishing to the [DeSo](https://deso.org) blockchain from [n8n](https://n8n.io) workflows.

Connect your DeSo wallet via DeSo Identity, copy the credential payload into n8n, then publish text posts, attach images, and look up DeSo profiles from workflows.

## Features

- **DeSo Identity credentials** — connect a DeSo wallet from any browser that has the DeSo Identity browser extension installed.
- **Post to DeSo** — publish public text posts with the selected credential.
- **Image posts** — attach an existing image URL or upload image binary data from your workflow.
- **Profile lookup** — fetch a DeSo profile by username or public key.
- **Multiple accounts** — create one credential per DeSo wallet and pick the right one per node instance.

## Install

In **Settings → Community Nodes**, enter:

```text
n8n-nodes-deso
```

For manual installs:

```bash
cd ~/.n8n/nodes
npm install n8n-nodes-deso
```

Restart n8n after installing.

## Credential Setup

Each DeSo Identity credential represents one DeSo wallet/account. You need the [DeSo Identity browser extension](https://identity.deso.org) installed in your browser.

1. In n8n, create a **DeSo Identity API** credential.
2. Open the **DeSo Auth Page** in a browser that has the DeSo Identity extension:

   ```
   https://csmediapro.github.io/n8n-nodes-deso/auth/
   ```

3. Click **Connect DeSo Wallet** and complete the DeSo Identity authorization flow.
4. Copy the credential payload that appears (click **Copy to Clipboard**).
5. In n8n, paste the payload into the **DeSo Auth Page** field in the credential.
6. The remaining fields (Public Key, JWT, Derived Key, Identity Storage, Username) will populate automatically.
7. Save the credential.

> n8n encrypts all credential fields at rest. The auth page does not send your credential data anywhere — it runs entirely in your browser and only displays it for you to copy.

### Multiple DeSo Accounts

Create a separate credential for each DeSo account:

```text
DeSo - Main Account
DeSo - Brand Account
DeSo - Test Account
```

Each node instance uses whichever credential you select. Accounts do not share auth state.

## Operations

### Post

Publishes a public DeSo post.

**Fields**

| Field | Description |
|-------|-------------|
| Post Body | Text content of the post |
| Image Source | `None`, `Binary Data`, or `Image URL` |
| Binary Property | Name of the incoming binary field (default: `data`) |
| Image URL | URL of an existing image to attach |
| Append Image URL to Body | Append the uploaded image URL to the post body text |

**Output**

```json
{
  "postedAs": "Username",
  "publicKey": "BC1YL...",
  "postHash": "abcdef...",
  "txnHash": "1234...",
  "postUrl": "https://deso.org/posts/abcdef...",
  "imageUrls": [],
  "inMempool": true,
  "confirmationBlockHeight": null
}
```

### Get Profile

Fetches a DeSo profile by public key or username. Leave the input blank to fetch the profile belonging to the selected credential.

**Output**

```json
{
  "username": "Username",
  "publicKey": "BC1YL...",
  "description": "...",
  "isVerified": false,
  "desoBalance": 0.5,
  "profilePictureUrl": "https://node.deso.org/...",
  "coinPriceDesoNanos": 1000
}
```

## Image Posting

When using binary image data, the node uploads the image to DeSo's image endpoint before submitting the post. The image URL is automatically attached to the post — no need to upload images separately.

## Security

- DeSo posts are public.
- The credential payload contains derived signing material — treat it like a password.
- Workflow output never includes the JWT, seed, or raw credential payload.
- Revoke derived keys through [DeSo Identity](https://identity.deso.org) if a credential is exposed.

## Development

```bash
npm install
npm run build-auth     # bundle DeSo Protocol for the auth page
npm run build          # compile TypeScript
```

Local validation:

```bash
npm run test:profile
npm run test:post
IMAGE_PATH=/path/to/image.jpg npm run test:image-post
```

The post tests create real public DeSo posts.

## Built By

[CSMediaPro](https://csmediapro.com) — custom software, n8n automation, AI integrations, and internal tools for teams that need practical systems.

## License

MIT
