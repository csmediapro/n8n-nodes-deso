# n8n-nodes-deso

Community node for publishing to the [DeSo](https://deso.org) blockchain from [n8n](https://n8n.io) workflows.

Connect your DeSo wallet via DeSo Identity, copy the credential payload into n8n, then publish text posts, attach images, and look up DeSo profiles from your workflows.

## Features

- **DeSo Identity credentials** — connect a DeSo wallet from any browser that has the DeSo Identity browser extension installed.
- **Post to DeSo** — publish public text posts with the selected credential.
- **Image posts** — attach an existing image URL or use image binary data from a previous workflow node.
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
5. In n8n, paste the full JSON payload into the **Credential Payload** field.
6. Leave **Node URL** as `https://node.deso.org` unless you intentionally use another DeSo node.
7. Leave **Spending Limit (Nanos)** at the default unless you need a different DeSo Identity spending limit.
8. Save the credential.

> n8n encrypts credential fields at rest. The auth page runs in your browser and does not save, log, or transmit your DeSo credentials to CSMediaPro.

### Multiple DeSo Accounts

Create a separate credential for each DeSo account and name each credential clearly in n8n:

```text
DeSo - Main Account
DeSo - Brand Account
DeSo - Test Account
```

Each node instance uses whichever credential you select. Accounts do not share auth state.

If n8n creates a generic name such as `DeSo Identity account`, rename it from **Settings → Credentials** using the credential list menu.

## Operations

### Post

Publishes a public DeSo post.

**Fields**

| Field | Description |
|-------|-------------|
| Post Text | Text content of the post |
| Image | `None`, `From Previous Node`, or `From URL` |
| Image Field | Binary field from the previous node that contains the image. Most n8n image/file nodes use `data`. |
| Image URL | URL of an existing image to attach |
| Include Image URL in Post Text | Also append the image URL as plain text at the end of the post |

#### Text Post

For a plain text post, set **Post Text** and leave **Image** as `None`.

#### Image Post From a Previous Node

Use this when a workflow starts with an image from a webhook, chat app, form upload, HTTP Request node, or another n8n node.

1. Add a node before DeSo that outputs the image as binary data.
2. Connect that node to the DeSo node.
3. In the DeSo node, set **Image** to `From Previous Node`.
4. Set **Image Field** to the binary field name from the previous node. The default is usually `data`.
5. Set **Post Text** and run the node.

The DeSo node uploads the binary image first, then attaches the resulting image URL to the DeSo post.

#### Image Post From a URL

Use this when you already have a public image URL.

1. Set **Image** to `From URL`.
2. Paste the URL into **Image URL**.
3. Set **Post Text** and run the node.

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

## Image Notes

When using binary image data, the node uploads the image to DeSo's image endpoint before submitting the post. The image URL is automatically attached to the post, so you do not need to upload images separately.

For best compatibility, keep images at or below 10 MB.

## Security

- DeSo posts are public.
- The credential payload contains derived signing material — treat it like a password.
- Workflow output never includes the JWT, seed, or raw credential payload.
- The auth page runs client-side in your browser and does not save, log, or transmit your DeSo credentials to CSMediaPro.
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
