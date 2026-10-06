# L'Oréal Claims Intelligence Engine

A small full-stack prototype for assessing whether study evidence supports a cosmetic product claim. It models the hand-off from business proposal to claim-manager review, scientist formulation, evaluator evidence submission, and an AI-assisted assessment.

> **Decision support, not a substantiation decision.** The model only evaluates the evidence supplied to it. A qualified evaluator and regulatory reviewer must verify the study and approve any claim before use.

## Business process understanding

1. **Business proposes** a product, formula concept, and candidate claims.
2. **Claim managers triage** claims for applicability, feasibility, and evidence needs; unsuitable claims are returned or rejected.
3. **R&I scientists formulate and test** the product, then submit the product details and available study protocol/results.
4. **Evaluators review evidence** against each claim, record the supporting study, and submit the evidence package.
5. **The engine assists assessment** by comparing the exact claim wording with the submitted evidence, saving its conclusion and caveats. Evaluators review the output and submit the final report.

The prototype implements step 5 and captures enough claim/evidence context to make the preceding hand-offs understandable. Human review remains an explicit requirement.

## Research and design considerations

The design is grounded in the interfaces and engineering guidance of the chosen stack:

- NestJS modules/controllers/services keep HTTP handling separate from assessment and persistence.
- Prisma models the one-to-many relationship between a claim and its assessment history, and provides a database transaction for saving them together.
- OpenAI Chat Completions structured JSON output constrains the model response to a machine-readable shape; the API response is still parsed and validated before persistence.
- React manages request, loading, error, and result states explicitly; the API origin is configurable for local development.
- The assessment prompt distinguishes statistical significance from practical relevance and instructs the model not to infer missing information. The result includes limitations and a human-review flag rather than presenting an AI score as proof.

References:

- [NestJS controllers](https://docs.nestjs.com/controllers) and [providers](https://docs.nestjs.com/providers)
- [Prisma schema](https://www.prisma.io/docs/orm/prisma-schema) and [transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)
- [OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)
- [React: synchronizing with effects](https://react.dev/learn/synchronizing-with-effects)

## Technical architecture

```text
React form
  └─ POST /api/claims/assess
       └─ NestJS controller (DTO validation)
            └─ ClaimsService
                 ├─ OpenAI structured assessment
                 └─ Prisma transaction → Claim + Assessment
       ← assessment JSON returned to the UI
```

**Why this architecture:** a modular monolith is the smallest sensible starting point for a one-day prototype. The service owns orchestration, the database retains each assessment as a history record, and the UI consumes a stable JSON contract. The LLM is behind the service boundary so it can later be replaced, evaluated, or disabled without changing the UI or database contract. The assessment is generated before the transaction so a slow external call does not hold database locks; the claim and result are then persisted atomically.

### API contract

`POST /api/claims/assess` (`Content-Type: application/json`)

```json
{
  "productName": "Example serum",
  "claimText": "Reduces wrinkles by 20% in 4 weeks",
  "formulaSummary": "Formula and usage context (optional)",
  "evidence": {
    "studyType": "Randomized controlled clinical study",
    "population": "Adults aged 40-60, n=80",
    "duration": "4 weeks",
    "method": "Validated wrinkle imaging; baseline and week 4",
    "results": "Mean wrinkle score reduced by 21%; control reduced by 4%",
    "limitations": "Single site; details of blinding not provided"
  }
}
```

Successful response (`201 Created`):

```json
{
  "claimId": "uuid",
  "assessment": {
    "id": "uuid",
    "justified": true,
    "confidenceScore": 0.82,
    "reasoning": "The reported four-week reduction is directionally consistent with the claim...",
    "limitations": ["Blinding details were not provided."],
    "humanReviewRequired": true,
    "model": "gpt-4o-mini"
  }
}
```

Invalid input returns `400`; a missing `OPENAI_API_KEY` prevents the API from starting, and a failed provider call returns `503`. Scores are model-estimated confidence, not statistical confidence or a probability of regulatory acceptance.

## Run locally

Requirements: Node.js 20+, npm, and a PostgreSQL database.

1. Copy `backend/.env.example` to `backend/.env`; set the required `DATABASE_URL` and `OPENAI_API_KEY`. The other backend settings are optional and have local defaults. Do not commit `.env` files containing real secrets.
2. In `backend/`, run `npm install`, `npx prisma generate`, `npx prisma migrate dev --name init`, and `npm run start:dev`.
3. In `frontend/`, run `npm install` and `npm run dev`.
4. Open the Vite URL, fill the form, and submit. The frontend defaults to `http://localhost:3000`; copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_URL` only if the API runs elsewhere.

The backend exposes Swagger at `/api/docs` while running.

## Product roadmap with no constraints

1. **Production foundations:** authentication/SSO, role-based access, tenant boundaries, audit trails, encrypted evidence storage, retention/deletion controls, rate limits, secrets management, monitoring, and resilient provider timeouts/retries.
2. **Workflow:** explicit product/formula, claim, study, evaluator, and approval entities; review queues; claim-manager applicability/feasibility decisions; assignment, versioning, comments, and notifications.
3. **Evidence quality:** document upload and extraction with provenance/page references; structured study-design and endpoint data; missing-data checks; evaluator corrections and sign-off.
4. **Responsible AI:** benchmark against expert-labelled cases; rubric-based evaluation; model/prompt versioning; calibrated confidence; bias and drift monitoring; regression tests; abstention when evidence is insufficient; model/provider comparison.
5. **Regulatory operations:** jurisdiction-specific claim rules and approved wording libraries, traceable evidence-to-claim links, localized workflows, exportable substantiation dossiers, and mandatory human/regulatory approval.
6. **Scale and integrations:** asynchronous assessment jobs, queueing, idempotency, document/object storage, event-driven integrations with formulation, clinical-study, and product-lifecycle systems, plus analytics on review cycle time and claim outcomes.

## Repository layout

```text
backend/   NestJS API, Prisma schema, and API-level tests
frontend/  React/Vite claim assessment form
```
