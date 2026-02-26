'use client';

import { useState } from 'react';
import { ConsensusPipelineResult, AIProvider, VoteType } from '@/types';

const PROVIDER_META: Record<AIProvider, { label: string; color: string; bg: string }> = {
  openai:     { label: 'OpenAI',     color: '#10a37f', bg: 'rgba(16,163,127,0.08)' },
  gemini:     { label: 'Gemini',     color: '#4285f4', bg: 'rgba(66,133,244,0.08)' },
  perplexity: { label: 'Perplexity', color: '#20b2aa', bg: 'rgba(32,178,170,0.08)' },
  openrouter: { label: 'OpenRouter', color: '#9b59b6', bg: 'rgba(155,89,182,0.08)' },
};

const VOTE_META: Record<VoteType, { label: string; color: string }> = {
  agree:    { label: 'Agree',    color: '#4caf84' },
  partial:  { label: 'Partial',  color: '#f0a444' },
  disagree: { label: 'Disagree', color: '#e05555' },
};

interface Props {
  data: ConsensusPipelineResult;
}

export default function ConsensusResult({ data }: Props) {
  const [expanded, setExpanded] = useState<'responses' | 'critiques' | null>(null);
  const { consensus, initialResponses, critiques } = data;
  const score = consensus.confidenceScore ?? (consensus as any).confidence_score ?? 0;
  const label = consensus.confidenceLabel ?? (consensus as any).confidence_label ?? 'low';
  const finalAnswer = consensus.finalAnswer ?? (consensus as any).final_answer ?? '';

  const scoreColor =
    score === 100 ? '#4caf84' :
    score >= 75  ? '#a8d94c' :
    score >= 50  ? '#f0a444' : '#e05555';

  return (
    <div style={{
      background: '#111111',
      border: '1px solid #1e1e1e',
      borderRadius: '14px',
      overflow: 'hidden',
      animation: 'fadeIn 0.4s ease',
    }}>
      {/* Confidence header */}
      <div style={{
        padding: '1rem 1.25rem',
        borderBottom: '1px solid #1a1a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            fontSize: '0.7rem',
            color: '#555550',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            Confidence
          </span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            {/* Progress bar */}
            <div style={{
              width: '120px', height: '4px',
              background: '#1e1e1e',
              borderRadius: '2px',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${score}%`,
                background: scoreColor,
                borderRadius: '2px',
                transition: 'width 1s ease',
              }} />
            </div>
            <span style={{
              color: scoreColor,
              fontSize: '0.85rem',
              fontFamily: 'DM Mono, monospace',
              fontWeight: '500',
            }}>
              {score}%
            </span>
            <span style={{
              color: '#444',
              fontSize: '0.7rem',
              padding: '2px 8px',
              background: '#1a1a1a',
              borderRadius: '20px',
            }}>
              {label}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          {/* Provider dots */}
          {initialResponses.map(r => (
            <div
              key={r.provider}
              title={`${PROVIDER_META[r.provider]?.label}: ${r.status}`}
              style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: r.status === 'success'
                  ? PROVIDER_META[r.provider]?.color
                  : '#333',
              }}
            />
          ))}
        </div>
      </div>

      {/* Final answer */}
      <div style={{
        padding: '1.25rem',
        borderBottom: '1px solid #1a1a1a',
      }}>
        <div style={{
          fontSize: '0.9rem',
          lineHeight: 1.75,
          color: '#e8e4df',
          whiteSpace: 'pre-wrap',
        }}>
          {finalAnswer}
        </div>
      </div>

      {/* Stats row */}
      <div style={{
        padding: '0.75rem 1.25rem',
        borderBottom: '1px solid #1a1a1a',
        display: 'flex',
        gap: '1.5rem',
        flexWrap: 'wrap',
      }}>
        <Stat
          label="Processing"
          value={`${((consensus.processingTimeMs ?? (consensus as any).processing_time_ms ?? 0) / 1000).toFixed(1)}s`}
        />
        <Stat
          label="Tokens"
          value={(consensus.totalTokens ?? (consensus as any).total_tokens ?? 0).toLocaleString()}
        />
        <Stat
          label="Est. Cost"
          value={`$${((consensus.totalCostUsd ?? (consensus as any).total_cost_usd ?? 0)).toFixed(4)}`}
        />
        <Stat
          label="Refinement"
          value={(consensus.refinementApplied ?? (consensus as any).refinement_applied) ? 'Applied' : 'Not needed'}
        />
      </div>

      {/* Expandable sections */}
      <div style={{ padding: '0.5rem' }}>
        <ExpandSection
          id="responses"
          label="Individual AI Responses"
          count={initialResponses.length}
          expanded={expanded === 'responses'}
          onToggle={() => setExpanded(e => e === 'responses' ? null : 'responses')}
        >
          <IndividualResponses responses={initialResponses} />
        </ExpandSection>

        <ExpandSection
          id="critiques"
          label="Cross-Verification Matrix"
          count={critiques.length}
          expanded={expanded === 'critiques'}
          onToggle={() => setExpanded(e => e === 'critiques' ? null : 'critiques')}
        >
          <CritiqueMatrix critiques={critiques} responses={initialResponses} />
        </ExpandSection>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline' }}>
      <span style={{ color: '#444', fontSize: '0.7rem' }}>{label}</span>
      <span style={{
        color: '#666',
        fontSize: '0.75rem',
        fontFamily: 'DM Mono, monospace',
      }}>
        {value}
      </span>
    </div>
  );
}

function ExpandSection({
  id, label, count, expanded, onToggle, children
}: {
  id: string;
  label: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      borderRadius: '8px',
      overflow: 'hidden',
      marginBottom: '2px',
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '0.625rem 0.875rem',
          background: expanded ? '#1a1a1a' : 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: '8px',
          transition: 'background 0.1s',
        }}
        onMouseEnter={e => {
          if (!expanded) (e.currentTarget as HTMLButtonElement).style.background = '#141414';
        }}
        onMouseLeave={e => {
          if (!expanded) (e.currentTarget as HTMLButtonElement).style.background = 'none';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#666', fontSize: '0.78rem' }}>{label}</span>
          <span style={{
            background: '#1e1e1e',
            color: '#555',
            fontSize: '0.65rem',
            padding: '1px 7px',
            borderRadius: '10px',
            fontFamily: 'DM Mono, monospace',
          }}>
            {count}
          </span>
        </div>
        <svg
          width="12" height="12"
          viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2"
          style={{
            transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.2s',
          }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {expanded && (
        <div style={{ padding: '0 0.5rem 0.5rem' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function IndividualResponses({ responses }: { responses: ConsensusPipelineResult['initialResponses'] }) {
  const [active, setActive] = useState(responses[0]?.provider);

  return (
    <div>
      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: '4px',
        marginBottom: '10px',
        padding: '0.5rem 0 0',
      }}>
        {responses.map(r => {
          const meta = PROVIDER_META[r.provider];
          if (!meta) return null;
          return (
            <button
              key={r.provider}
              onClick={() => setActive(r.provider)}
              style={{
                padding: '4px 12px',
                background: active === r.provider ? meta.bg : 'none',
                border: `1px solid ${active === r.provider ? meta.color + '44' : '#2a2a2a'}`,
                borderRadius: '6px',
                color: active === r.provider ? meta.color : '#555',
                fontSize: '0.72rem',
                cursor: 'pointer',
                transition: 'all 0.1s',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              {meta.label}
              {r.status !== 'success' && (
                <span style={{ marginLeft: '4px', color: '#e05555' }}>⚠</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active response */}
      {responses.map(r => {
        if (r.provider !== active) return null;
        const meta = PROVIDER_META[r.provider];
        return (
          <div key={r.provider} style={{
            background: '#0d0d0d',
            border: `1px solid ${meta?.color ?? '#333'}22`,
            borderRadius: '10px',
            padding: '1rem',
          }}>
            {r.status !== 'success' ? (
              <p style={{ color: '#e05555', fontSize: '0.8rem' }}>
                {r.error || `Provider responded with status: ${r.status}`}
              </p>
            ) : (
              <>
                <p style={{
                  color: '#c8c4bf',
                  fontSize: '0.85rem',
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                  marginBottom: '0.75rem',
                }}>
                  {r.content}
                </p>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <span style={{ color: '#444', fontSize: '0.65rem', fontFamily: 'DM Mono, monospace' }}>
                    {r.latencyMs}ms
                  </span>
                  <span style={{ color: '#444', fontSize: '0.65rem', fontFamily: 'DM Mono, monospace' }}>
                    {r.tokensInput + r.tokensOutput} tokens
                  </span>
                  <span style={{ color: '#444', fontSize: '0.65rem', fontFamily: 'DM Mono, monospace' }}>
                    ${r.costUsd.toFixed(5)}
                  </span>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CritiqueMatrix({
  critiques,
  responses,
}: {
  critiques: ConsensusPipelineResult['critiques'];
  responses: ConsensusPipelineResult['initialResponses'];
}) {
  const providers = responses.filter(r => r.content).map(r => r.provider);

  return (
    <div>
      {/* Matrix table */}
      <div style={{
        overflowX: 'auto',
        marginBottom: '1rem',
        padding: '0.5rem 0',
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.72rem',
        }}>
          <thead>
            <tr>
              <th style={{
                padding: '6px 10px',
                textAlign: 'left',
                color: '#444',
                fontWeight: '400',
                borderBottom: '1px solid #1e1e1e',
              }}>
                Reviewer ↓ / Reviewed →
              </th>
              {providers.map(p => (
                <th key={p} style={{
                  padding: '6px 10px',
                  color: PROVIDER_META[p]?.color ?? '#888',
                  fontWeight: '400',
                  borderBottom: '1px solid #1e1e1e',
                  textAlign: 'center',
                }}>
                  {PROVIDER_META[p]?.label ?? p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {providers.map(reviewer => (
              <tr key={reviewer}>
                <td style={{
                  padding: '6px 10px',
                  color: PROVIDER_META[reviewer]?.color ?? '#888',
                  borderBottom: '1px solid #111',
                }}>
                  {PROVIDER_META[reviewer]?.label ?? reviewer}
                </td>
                {providers.map(reviewed => {
                  if (reviewer === reviewed) {
                    return (
                      <td key={reviewed} style={{
                        padding: '6px 10px',
                        textAlign: 'center',
                        color: '#2a2a2a',
                        borderBottom: '1px solid #111',
                      }}>—</td>
                    );
                  }
                  const critique = critiques.find(
                    c => (c.reviewerProvider ?? (c as any).reviewer_provider) === reviewer
                      && (c.reviewedProvider ?? (c as any).reviewed_provider) === reviewed
                  );
                  const vote = (critique?.vote as VoteType) || 'partial';
                  const meta = VOTE_META[vote];
                  return (
                    <td key={reviewed} style={{
                      padding: '6px 10px',
                      textAlign: 'center',
                      borderBottom: '1px solid #111',
                    }}>
                      <span style={{
                        color: meta.color,
                        fontSize: '0.65rem',
                        padding: '2px 8px',
                        background: `${meta.color}15`,
                        borderRadius: '20px',
                      }}>
                        {meta.label}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Critique details */}
      {critiques.slice(0, 6).map((c, i) => {
        const reviewer = c.reviewerProvider ?? (c as any).reviewer_provider as AIProvider;
        const reviewed = c.reviewedProvider ?? (c as any).reviewed_provider as AIProvider;
        const vote = c.vote as VoteType;
        const text = c.critiqueText ?? (c as any).critique_text ?? '';
        const reviewerMeta = PROVIDER_META[reviewer];
        const voteMeta = VOTE_META[vote];

        return (
          <div key={i} style={{
            padding: '0.75rem',
            background: '#0d0d0d',
            borderRadius: '8px',
            marginBottom: '6px',
            border: '1px solid #1a1a1a',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              marginBottom: '6px',
            }}>
              <span style={{ color: reviewerMeta?.color ?? '#888', fontSize: '0.7rem', fontWeight: '500' }}>
                {reviewerMeta?.label ?? reviewer}
              </span>
              <span style={{ color: '#333', fontSize: '0.65rem' }}>→</span>
              <span style={{ color: PROVIDER_META[reviewed]?.color ?? '#888', fontSize: '0.7rem' }}>
                {PROVIDER_META[reviewed]?.label ?? reviewed}
              </span>
              <span style={{
                color: voteMeta.color,
                fontSize: '0.65rem',
                padding: '1px 7px',
                background: `${voteMeta.color}15`,
                borderRadius: '10px',
                marginLeft: 'auto',
              }}>
                {voteMeta.label}
              </span>
            </div>
            {text && (
              <p style={{
                color: '#666',
                fontSize: '0.78rem',
                lineHeight: 1.5,
              }}>
                {text.substring(0, 200)}{text.length > 200 ? '...' : ''}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
