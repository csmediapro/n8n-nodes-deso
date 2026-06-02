# n8n-nodes-deso

Community node for publishing to the [DeSo](https://deso.org) blockchain from [n8n](https://n8n.io) workflows.

Use DeSo Identity once, store the resulting credential securely in n8n, then publish text posts, attach images, and look up DeSo profiles from workflows.

## Features

- **DeSo Identity credentials** — connect a DeSo account and store the resulting auth payload as an encrypted n8n credential.
- **Post to DeSo** — publish public text posts with the selected credential.
- **Image posts** — attach an existing image URL or upload image binary data from an n8n workflow before posting.
- **Profile lookup** — fetch the selected account profile or look up another DeSo username/public key.
- **Multiple identities** — create one n8n credential per DeSo account and choose the credential per node instance.

This package intentionally does not include follow/unfollow or DESO transfer operations.

## Install

In self-hosted n8n, install the package from **Settings -> Community Nodes**:

```text
n8n-nodes-deso
```

For manual installs:

```bash
cd ~/.n8n/nodes
npm install n8n-nodes-deso
```

Restart n8n after installation if your deployment does not reload community nodes automatically.

## Credential Setup

The node uses a DeSo Identity credential. Each credential represents one DeSo account.

1. In n8n, create a **DeSo Identity API** credential.
2. Click **Connect DeSo Wallet**.
3. Complete the DeSo Identity authorization flow.
4. Confirm the connected DeSo account shown in the credential.
5. Save the credential.

n8n encrypts credential fields at rest. Do not put DeSo credential values in workflow parameters, logs, or execution data.

### Multiple DeSo Accounts

Create a separate n8n credential for each DeSo account:

```text
DeSo - Main Account
DeSo - Brand Account
DeSo - Test Account
```

Each DeSo node instance uses whichever credential you select. The node builds an isolated DeSo Identity session from that credential, so accounts do not share auth state.

## Operations

### Post

Publishes a public DeSo post.

Inputs:

- `Post Body`
- `Image Source`
  - `None`
  - `Binary Data`
  - `Image URL`
- `Binary Property`, default `data`
- `Image URL`
- `Append Image URL to Body`

For binary images, the node uploads the image first, receives a DeSo `ImageURL`, then submits the post with that URL in `BodyObj.ImageURLs`.

Output includes:

- `postedAs`
- `publicKey`
- `postHash`
- `txnHash`
- `transactionIdBase58Check`
- `postUrl`
- `imageUrls`
- `inMempool`
- `confirmationBlockHeight`

### Get Profile

Fetches a DeSo profile.

Inputs:

- `Public Key or Username`, optional

If blank, the node fetches the profile for the selected credential.

Output includes profile username, public key, description, profile image URL, balances, selected credential username, and selected credential public key.

## Image Posting Flow

When using binary image data:

1. The node reads the configured n8n binary property.
2. It gets a DeSo JWT from the selected credential.
3. It uploads the image to DeSo's image endpoint.
4. DeSo returns an `ImageURL`.
5. The node submits the post with that image URL attached.

This keeps the workflow simple: pass binary image data into the DeSo node, and the node handles upload-before-post.

## Security Notes

- DeSo posts are public.
- The credential payload contains derived signing material.
- Workflow output never includes JWT, seed, messaging private key, or raw credential payload.
- Store credentials only in n8n credentials, not workflow JSON.
- Revoke and re-authorize derived keys through DeSo Identity if a credential is exposed.

## Development

```bash
npm install
npm run build
```

Local validation:

```bash
npm run test:profile
npm run test:post
DESO_TEST_IMAGE_PATH=/path/to/image.jpg npm run test:image-post
```

The post tests create real public DeSo posts.

## Built By CSMediaPro

[CSMediaPro](https://csmediapro.com) builds custom software, n8n workflow automation, AI integrations, and internal tools for teams that need practical systems instead of demo-ware.

For custom n8n nodes, workflow automation, DeSo integrations, or AI-assisted operations work, visit [csmediapro.com](https://csmediapro.com).

## License

MIT
