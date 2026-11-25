# AI search on the Tower (design)

Status: designed, not running. Today the site uses ranked keyword search in the browser (assets/cb2.js: word scores, title boost, synonyms, prefix match). It needs no server and works offline once the index is loaded.

## What AI search adds
Someone types what they want in their own words ("help my mom write to her landlord about mold"). The Tower finds the prompts that mean the same thing, even with no shared words, then a small model picks the one best prompt, or two or three to choose from, and says in one line why each fits. If nothing fits, it says so and links /build/ with their words filled in.

## How it works
1. Index, once per library change: an embedding model on the Tower turns every prompt (title, summary, first 1,000 characters) into a vector. About 3,500 prompts take a few minutes on one GPU, then the GPU is free again.
2. Query: the site sends the search words to `https://search.<domain>/q?text=...`. The Tower embeds the words (milliseconds), finds the 20 nearest prompts, and a small chat model reranks them and writes the one-line reasons.
3. Answer: JSON with 1 to 3 prompt links and reasons. The site shows them above its own results.
4. Fallback: if the Tower does not answer within 1.5 seconds, the site shows its own keyword results. Nothing breaks when the Tower is off.

## Pieces
- Embedding model: a small open one (for example Qwen3-Embedding-0.6B or bge-m3), under 2 GB of GPU memory.
- Reranker and reasons: a small open chat model (4B to 8B), loaded only while serving.
- Server: a short Python web app (FastAPI) with one endpoint, run by systemd.
- Tunnel: Cloudflare Tunnel (cloudflared) so the Tower is reachable without opening ports on the home router.
- Privacy: no logging of search words by default. Only counts.

## What is needed
1. A free Cloudflare account (new account: Leo's yes and his sign-up).
2. A domain on Cloudflare DNS for the tunnel's name. claudebomb.com is served by GitHub Pages; its DNS can move to Cloudflare and keep pointing at GitHub Pages, or a spare domain can host search.<domain>.
3. Tower steps (batched into one yes): install cloudflared, create a Python environment, download the two models, add the systemd service.
4. GPU use: the GPU that does not run dictation, within the UPS limit. The models load on demand and unload when idle.
