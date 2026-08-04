# Content Studio

Single responsibility: the Content Studio module (content generation, images, video, Asset Library, review, publishing) — file locations and rules unique to this domain. The platform's largest and most-established module.

## Files
- Backend: `backend/src/{controllers,services,repositories}/{content,image,video,brand-kit,asset}*`
- Frontend: `frontend/src/features/content-studio` (largest feature directory in the repo)

## Rules
- QA review and version history are **polymorphic** (`AssetReview`/`AssetVersion`), applied uniformly across `GeneratedContent`, `GeneratedImage`, and project-scoped `SavedPrompt` rows — not a separate review table per asset type. Video was added later without refactoring this.
- Publishing has an **independent lifecycle** from QA review — never overload `ReviewStatus`/`AssetReview` with publishing states.
- `ContentProject` and `GeneratedContent` enforce per-user ownership (any authenticated user could otherwise read/delete another user's content).

## Decisions
ADR-0006 (SavedPrompt ownership), ADR-0007 (ContentProject/GeneratedContent ownership), ADR-0008 (Asset Library — polymorphic review/versioning), ADR-0009 (Creative Review Workspace), ADR-0010 (Publishing Pipeline), ADR-0011 (Analytics Foundation) — `docs/architecture/decisions/`.
