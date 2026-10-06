import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

const initialForm = {
  productName: 'Example serum',
  claimText: 'Reduces wrinkles by 20% in 4 weeks',
  formulaSummary: '',
  studyType: 'Randomized controlled clinical study',
  population: 'Adults aged 40-60, n=80',
  duration: '4 weeks',
  method: 'Validated wrinkle imaging; baseline and week 4',
  results: 'Mean wrinkle score reduced by 21%; control reduced by 4%',
  limitations: 'Single site; details of blinding not provided',
};

export default function App() {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/api/claims/assess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: form.productName,
          claimText: form.claimText,
          formulaSummary: form.formulaSummary || undefined,
          evidence: {
            studyType: form.studyType,
            population: form.population,
            duration: form.duration,
            method: form.method,
            results: form.results,
            limitations: form.limitations || undefined,
          },
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message ?? `Assessment failed (${response.status}).`);
      }
      setResult(payload);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to complete assessment.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="layout">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="Claims Intelligence home">CI<span>.</span></a>
        <div className="topbar-label">R&I / CLAIMS REVIEW</div>
        <div className="status"><span /> Evidence workspace</div>
      </header>

      <section className="intro">
        <p className="eyebrow">CLAIMS INTELLIGENCE ENGINE <span> / </span> EVIDENCE REVIEW</p>
        <h1>Does the evidence<br /><em>support the claim?</em></h1>
        <p className="intro-copy">Compare a product claim with its study evidence. The assessment is a decision-support signal for evaluator review, not a regulatory approval.</p>
      </section>

      <div className="workspace">
        <form className="form-card" onSubmit={submit}>
          <div className="section-heading">
            <div><span className="step">01</span><h2>Claim &amp; evidence</h2></div>
            <span className="required-note">ALL FIELDS REQUIRED EXCEPT WHERE MARKED</span>
          </div>

          <label>
            Product name
            <input name="productName" value={form.productName} onChange={update} required maxLength={200} />
          </label>
          <label>
            Proposed claim
            <textarea name="claimText" value={form.claimText} onChange={update} required rows="2" maxLength={1000} />
          </label>
          <label>
            Formula summary <span className="optional">OPTIONAL</span>
            <textarea name="formulaSummary" value={form.formulaSummary} onChange={update} rows="2" maxLength={4000} placeholder="Key ingredients, use conditions, or formulation context" />
          </label>

          <div className="evidence-title"><span className="step">02</span><h3>Study evidence</h3></div>
          <div className="field-grid">
            <label>
              Study type
              <input name="studyType" value={form.studyType} onChange={update} required maxLength={200} />
            </label>
            <label>
              Population
              <input name="population" value={form.population} onChange={update} required maxLength={2000} />
            </label>
            <label>
              Study duration
              <input name="duration" value={form.duration} onChange={update} required maxLength={200} />
            </label>
            <label>
              Measurement method
              <input name="method" value={form.method} onChange={update} required maxLength={4000} />
            </label>
          </div>
          <label>
            Key results
            <textarea name="results" value={form.results} onChange={update} required rows="3" maxLength={8000} />
          </label>
          <label>
            Known limitations <span className="optional">OPTIONAL</span>
            <textarea name="limitations" value={form.limitations} onChange={update} rows="2" maxLength={4000} placeholder="Missing details, study limitations, or caveats" />
          </label>

          <div className="submit-row">
            <p>Assessment uses only the information submitted here.</p>
            <button type="submit" disabled={loading}>
              {loading ? 'Assessing…' : 'Assess evidence'} <span aria-hidden="true">↗</span>
            </button>
          </div>
        </form>

        <aside className={`result-card${result ? ' has-result' : ''}`} aria-live="polite">
          <div className="section-heading">
            <div><span className="step">03</span><h2>Assessment</h2></div>
          </div>
          {error ? (
            <div className="error-box" role="alert"><strong>Assessment unavailable</strong><p>{error}</p><span>Check that the API is running and configured, then try again.</span></div>
          ) : result ? (
            <AssessmentResult result={result} />
          ) : (
            <div className="empty-state">
              <div className="empty-mark">↗</div>
              <p>Your assessment will appear here</p>
              <span>Submit claim wording and evidence to receive an AI-assisted review.</span>
            </div>
          )}
          <div className="review-note">
            <span className="note-icon">i</span>
            <p>Every assessment requires qualified evaluator and regulatory review before a claim is used.</p>
          </div>
        </aside>
      </div>
      <footer>INTERNAL R&amp;I TOOL <span>•</span> AI-ASSISTED DECISION SUPPORT</footer>
    </main>
  );
}

function AssessmentResult({ result }) {
  const { assessment, claimId } = result;
  const confidencePercent = Math.round(assessment.confidenceScore * 100);

  return (
    <div className="assessment">
      <div className={`verdict ${assessment.justified ? 'positive' : 'negative'}`}>
        <span className="verdict-dot" />
        <div><span className="result-label">EVIDENCE ASSESSMENT</span><strong>{assessment.justified ? 'Justified' : 'Not justified'}</strong></div>
      </div>
      <div className="confidence">
        <div><span>Confidence score</span><strong>{confidencePercent}%</strong></div>
        <div className="meter" role="meter" aria-label="Confidence score" aria-valuemin="0" aria-valuemax="100" aria-valuenow={confidencePercent}>
          <span style={{ width: `${confidencePercent}%` }} />
        </div>
        <small>Model-estimated confidence; not statistical confidence.</small>
      </div>
      <div className="reasoning">
        <span className="result-label">REASONING</span>
        <p>{assessment.reasoning}</p>
      </div>
      {assessment.limitations.length > 0 && (
        <div className="limitations">
          <span className="result-label">LIMITATIONS TO REVIEW</span>
          <ul>{assessment.limitations.map((limitation, index) => <li key={index}>{limitation}</li>)}</ul>
        </div>
      )}
      <div className="saved-id">SAVED ASSESSMENT <code>{claimId}</code></div>
    </div>
  );
}
