# Phase 12: Batch Port, Migration & Discovery - Discussion Log

> **Audit trail only.**

**Date:** 2026-04-05
**Phase:** 12-batch-port-migration-discovery
**Areas discussed:** Batch porting, OMZ migration, AI discovery, Theme integration
**Mode:** Auto

---

## Batch Porting Strategy
| Option | Description | Selected |
|--------|-------------|----------|
| Programmatic generation from OMZ data | Parse OMZ aliases, generate TS data files | ✓ |
| Manual port one-by-one | Hand-write each plugin | |
| Wrapper that shells out to OMZ | Run OMZ plugins via subprocess | |

**User's choice:** [auto] Programmatic generation (recommended)

## OMZ Migration Detection
| Option | Description | Selected |
|--------|-------------|----------|
| Scan ~/.oh-my-zsh + parse .zshrc | Detect installation, read plugins=() array, cross-reference | ✓ |
| Manual plugin list input | User provides their list | |
| No migration support | Users figure it out | |

**User's choice:** [auto] Scan + parse + cross-reference (recommended)

## AI-Enhanced Discovery
| Option | Description | Selected |
|--------|-------------|----------|
| Existing AI integration with catalog prompt | Embed catalog in prompt, natural language matching | ✓ |
| Vector search with embeddings | Pre-compute embeddings for plugins | |
| Keyword search only | No AI, just string matching | |

**User's choice:** [auto] Existing AI with catalog prompt (recommended)

## Theme Integration
| Option | Description | Selected |
|--------|-------------|----------|
| Segment registration API | Plugins register prompt segments via init() | ✓ |
| Template override | Plugins replace entire template | |
| No theme support | Themes deferred | |

**User's choice:** [auto] Segment registration API (recommended)

## Claude's Discretion
- Full OMZ plugin list and category mapping, partial equivalents, AI prompt format, missing plugin handling

## Deferred Ideas
None — final phase.
