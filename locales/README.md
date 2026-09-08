# Maintaining translations

The nine `translation.json` files in this repository are the source of truth.
English is the source language. Translations are maintained with AI assistance
and reviewed in the same PR as the English and UI changes. Crowdin upload and
download are no longer part of this workflow. Keep any old local credentials
ignored; do not copy them into prompts or commits. Disable any external Crowdin
integration before allowing it to write to this repository again.

## Workflow

1. Run `yarn translation:extract` after adding or changing UI text. Review the
   English diff: keys are literal English phrases, including punctuation and
   intentional whitespace. The extractor recognizes `t` and `translate`, but
   dynamic keys must be added explicitly. `keepRemoved` preserves these keys.
2. Translate the added or changed messages into every supported language. Give
   the AI the English value, relevant component/call site, interpolation values
   and their meaning, this glossary, and adjacent UI labels. Do not send secrets
   or user data. Keep existing translations unless fixing a specific defect or
   applying these documented conventions.
3. Review the translation diff in a separate AI pass using the same UI context.
   Check negation, actions versus states, amounts/fees, security instructions,
   and consistency with adjacent controls. This is semantic review, not a
   guarantee provided by the structural checks. Document any remaining wording
   uncertainty in the PR.
4. Run `yarn translation:check`. It requires complete local coverage, checks
   interpolation names and multiplicity, markup, literal braces, JSON format,
   and real i18next v3 plural resolution. It never edits the catalogs.
5. Inspect whitespace and length warnings with
   `node scripts/check-translations.js --report`. A value more than 60% longer
   than English is a layout candidate, not necessarily a bad translation. Check
   its actual control at small screen sizes and larger text settings. Character
   counts do not measure CJK glyph widths. Preserve short, clear button labels.

Missing translations fail CI. Runtime English fallback remains a resilience
mechanism, not the normal delivery workflow. Changes to English meaning require
translation review even when placeholder checks pass. Shared words, names,
tickers and established technical terms may legitimately equal English.

## Voice and glossary

Use sentence case for prose and ordinary action labels. Preserve acronyms,
brands and deliberate all-capital field labels. Follow the inflection and word
order of the destination language; do not replace words inside placeholders.

| Language | Address / variant | Wallet | Cryptographic key | Keyshare | Recovery phrase | Backup |
|---|---|---|---|---|---|---|
| en | Clear, direct | wallet | key | keyshare | recovery phrase | backup / back up |
| es | Neutral Spanish, formal usted | billetera | clave | fragmento de clave | frase de recuperación | respaldo / respaldar |
| de | Formal Sie | Wallet | Schlüssel | Keyshare | Wiederherstellungsphrase | Sicherung / sichern |
| fr | Formal vous | portefeuille | clé | fragment de clé | phrase de récupération | sauvegarde / sauvegarder |
| nl | Formal u | wallet | sleutel | sleutelaandeel | herstelzin | back-up / back-up maken |
| pt | Brazilian Portuguese, você | carteira | chave | fragmento de chave | frase de recuperação | backup / fazer backup |
| ru | Formal вы | кошелёк | ключ | доля ключа | фраза восстановления | резервная копия |
| ja | Polite instructions; concise nominal labels | ウォレット | 鍵 | キーシェア | リカバリーフレーズ | バックアップ |
| zh | Simplified Chinese, 您 | 钱包 | 密钥 | 密钥分片 | 恢复短语 | 备份 |

Cryptographic key is distinct from keyboard key, API identifiers, passkey and
keyshare. Preserve technology names and service brands such as WalletConnect,
BitPay Wallet, Ledger and THORSwap. German multisig copayers/co-signers use
Mitunterzeichner; French cosignataire, Dutch medeondertekenaar, Spanish
cofirmante, Portuguese cossignatário, Japanese 共同署名者 and Chinese 共同签署人
describe co-signers. Russian соплательщик (multisig copayer) and соподписант
(co-signer) may remain distinct when the source roles differ.

Translate transaction `change` as returned funds, not modification. Translate
miner fees as blockchain fees, not mining-industry charges. Fee, fee rate and
exchange rate are different concepts; choose the word appropriate to the
context. A keyshare is a share of the secret key, not the act of sharing it.

## Interpolation and plurals

Preserve every `{{variable}}` exactly, including spelling, case and repeated
occurrences. Legacy English keys may contain bare names such as
`spendableAmount coin`; translate their English **values**, which contain
`{{spendableAmount}} {{coin}}`. Preserve numbered `Trans` tags, Markdown link
destinations, and literal `{...}` / `{}` used in backup instructions.

The app uses i18next `compatibilityJSON: 'v3'`. For each English base plus
`_plural` family, supply the language's native suffixes:

| Languages | Required keys |
|---|---|
| en, de, es, fr, nl, pt | base and `_plural` |
| ru | `_0` (1, 21), `_1` (2–4, 22), `_2` (0, 5, 11–14) |
| ja, zh | `_0` |

Pass a numeric `count` at the call site. Do not copy English plural suffixes into
Russian, Japanese or Chinese. Use whole messages with interpolation or `Trans`
for new sentences spanning links or styled fragments. Existing fragments must
be checked in their composed order. Preserve surrounding whitespace needed by
Latin/Cyrillic concatenation; Japanese and Chinese may use local punctuation
without the English spaces.
