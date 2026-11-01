# Riichi Atelier

A browser-based riichi mahjong calculator with fast tile entry and a clear breakdown of every score. Served by [Perl](https://perl.org/) and [Mojolicious](https://mojolicious.org/), with all scoring performed locally in your browser.

## Features

- Click, drag, or type to build a hand, declare calls, and set bonus indicators.
- Inspect hand decompositions, yaku, fu, and per-player payments in the scoring panel.
- Browse built-in han, fu, and payment references.
- Switch between English, Hepburn rōmaji, and Japanese, with dark and parchment themes.
- Copy and restore complete setups, undo edits, or explore 100 example hands.

No database, frontend build step, or JavaScript runtime dependency is required. Hand state and preferences are saved in your browser.

## Quick start

Requires **Perl 5.20+**, **Mojolicious 9.41+**, and [`cpanm`](https://metacpan.org/pod/App::cpanminus) to install dependencies.

```sh
cpanm --installdeps .
hypnotoad -f app.pl
```

Then open **http://localhost:8080**.

To use a different port:

```sh
PORT=9999 hypnotoad -f app.pl
```

For development with automatic restarts:

```sh
morbo -l http://127.0.0.1:8080 app.pl
```

`PORT` configures Hypnotoad; Morbo uses its `-l` option.

## Usage

Choose a slot and click or drag a tile into it, or type tile codes directly. With no slot selected, tiles go into the next free hand slot. The final hand slot holds the winning tile; sorting preserves it.

Mark open sets with **Called**, enter the **indicator tiles** for dora and ura-dora, and set the winds and win conditions. Open **Score** for the calculation and payment breakdown. Missing required indicators are highlighted; scores remain provisional until they are filled.

### Tile notation

| Code | Tiles |
| --- | --- |
| `123m` | Characters 1, 2, 3 |
| `456p` | Circles 4, 5, 6 |
| `789s` | Bamboo 7, 8, 9 |
| `0m`, `0p`, `0s` | Red five of that suit |
| `1z`–`7z` | East, South, West, North, white, green, red |
| `n123m` | Called sequence |
| `n444123s` | Called triplet and sequence |

Each code is added as soon as you type its suit letter. Grouping uses the entire hand, so splitting the same tiles across several codes does not change the interpretation. Codes can be combined: `1230m456p789s11z`. The `n` prefix applies to the next suit code and requires complete sets.

### Keyboard shortcuts

| Key | Action |
| --- | --- |
| `h` | Enter hand tiles |
| `d` | Enter dora indicators |
| `u` | Enter ura-dora indicators |
| `w` | Set seat wind |
| `r` | Set round wind |
| `o` | Sort the hand |
| `q` | Clear the setup |
| `Escape` | Cancel pending input and return to automatic hand entry |
| `Ctrl/Cmd+Z` | Undo |
| `Ctrl/Cmd+C` | Copy the complete setup |
| `Ctrl/Cmd+V` | Parse pasted notation, commands, or a copied setup |

For example, `d4m1z` enters two dora indicators, and `w1z` sets the seat wind to East. Clipboard shortcuts retain their normal behavior in text fields. The keyboard’s **i** panel includes a quick-entry field and further examples.

### Win conditions

Add `c` after one or more digits to select conditions, or uppercase `C` to remove them.

| Digit | Condition |
| --- | --- |
| `1` | Ron — discard win |
| `2` | Tsumo — self-draw |
| `3` | Rīchi |
| `4` | Double rīchi |
| `5` | Ippatsu — one shot |
| `6` | Last tile |
| `7` | After a kan |
| `8` | Robbing a kan |

`235c` selects tsumo, rīchi, and ippatsu; `5C` removes ippatsu. Bare `C` clears optional conditions and ura-dora. Negating the active win method selects the other method.

The first listed choice takes priority within mutually exclusive groups. Rīchi requires a closed hand, ippatsu requires rīchi, and after-kan requires a kan. After-kan implies tsumo; robbing a kan implies ron unless an explicit win method takes priority.

### Kan groups and incomplete hands

Automatic grouping uses the whole hand, not the boundaries between typed codes. It chooses the arrangement with the fewest tiles left outside, up to four complete sets and one pair. Ties prefer fewer kans. A complete hand must also fit its physical tile count: 14 tiles plus one per kan.

| Input | Automatic interpretation |
| --- | --- |
| `111123p` | `111p` + `123p` — no kan |
| `1111234p` | `1111p` + `234p` — one kan |
| `123p111m111p` | Two triplets and a sequence — no kan |

Incomplete hands can change their automatic grouping as tiles are added. The **Quad** checkbox pins your choice instead. `k1p` forces the four 1-circle copies to be a kan; `K1p` keeps them separate. These commands set the interpretation without adding tiles. Clear removes overrides. Tile count determines the number of kans in a complete hand, but may not uniquely identify which four-copy group is a kan; use an override when needed.

### Copy and restore

Copy exports **readable command notation**, not JSON. Pasting those commands restores the setup in one undoable operation. Ordinary tile codes append to the selected area; copied setups begin with `q` to clear first.

```text
q K1p h111999p111m123p w1z r1z 1c h
q k1p h1111999p111m234p w1z r1z 1c h
```

These restore the same incomplete hand with a split group or a kan, respectively. Copy explicitly records every four-copy interpretation so it will not be guessed differently when restored.

| Command | Meaning |
| --- | --- |
| `k1p` / `K1p` | Force / exclude a kan of 1 circles |
| `v5s` | Put 5 bamboo in the winning slot |
| `_` | Skip one empty slot in the current area |
| `n(123p)` | Mark an **existing** sequence called, without adding tiles |
| `n123p` | Add a called sequence as usual |

The generated string preserves tile order, empty slots, winning tile, calls, indicators, winds, and conditions. It ends with `h` to return entry to the hand. Language and theme are local preferences. Existing JSON exports remain accepted for compatibility.

## Deployment

### Docker

Build and run locally:

```sh
docker build -t riichi-atelier .
docker run --rm -p 8080:8080 riichi-atelier
```

The image runs Hypnotoad as a non-root user and includes a `/health` check.

To use the GHCR image after a release has been published:

```sh
cp docker-compose.example.yml docker-compose.yml
cp .env.example .env
docker compose up -d
```

Compose uses `ghcr.io/justinnamilee/riichi-atelier:latest`. Set `PORT` in `.env` to change the host port; the container listens on `8080`. No persistent volume is needed.

### PM2

Install the Perl dependencies and PM2, with `hypnotoad` available on `PATH`:

```sh
cp ecosystem.config.example.js ecosystem.config.js
PORT=8080 pm2 start ecosystem.config.js
pm2 save
```

To change the port of an existing process:

```sh
PORT=9999 pm2 restart ecosystem.config.js --update-env
```

## Development

Run the Perl tests and JavaScript tests separately. JavaScript tests require Node.js 18+.

```sh
prove -l t
node --test t/*.test.js
```

Alternatively, run the Perl suite through MakeMaker:

```sh
perl Makefile.PL
make test
```

| Path | Purpose |
| --- | --- |
| `app.pl` | Mojolicious server and health endpoint |
| `public/` | Browser interface, styles, and tile artwork |
| `public/hand.js` | Tile entry, set detection, and calls |
| `public/scoring.js` | Scoring engine |
| `public/terminology.js` | Language and terminology mappings |
| `public/examples.js` | Example hands |
| `t/` | Perl and JavaScript tests |
| `scripts/generate-examples.cjs` | Example catalog generator |

### Releases

Update `VERSION` in `Makefile.PL`, commit and push the changes, then push a stable version tag:

```sh
git tag v1.0.1
git push origin v1.0.1
```

The GitHub Actions workflow tests the app, builds and smoke-tests the container, and publishes `1.0.1`, `v1.0.1`, and `latest` tags to GHCR. It runs only for stable `vMAJOR.MINOR.PATCH` tag pushes; prereleases and leading-zero versions are excluded.

## Scoring rules and limitations

The engine evaluates valid hand decompositions and winning-tile placements, then selects the highest-paying interpretation.

- Red fives are enabled. Dora alone cannot supply the required yaku.
- Counted yakuman applies at 13+ han. Distinct yakuman stack; double-yakuman variants count as single yakuman.
- No kiriage mangan. Double-wind pairs earn 4 fu; seven pairs stays 25 fu; pinfu self-draw stays 20 fu. Payments round up to 100 points.
- Four-copy groups use the automatic interpretation described above. **Quad** (RŌ: **Kan**, JP: **槓**) explicitly overrides it.
- Honba, rīchi deposits, liability payments, first-turn yakuman, and local yaku are not modeled.
- Conditions dependent on game history are supplied by the user; furiten and event eligibility cannot be inferred from the hand alone.

## Attribution

Tile artwork by [FluffyStuff](https://github.com/FluffyStuff/riichi-mahjong-tiles), released under CC0. The original license is included in [`public/assets/tiles/LICENSE.md`](public/assets/tiles/LICENSE.md).
