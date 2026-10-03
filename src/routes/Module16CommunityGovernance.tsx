/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Module 16 — Community & Governance · DAO · Treasury · Proposals
 *  Route: /module/16-community-governance
 *  Owning layer: L2 (Financial) · Accent: TC.indigo
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrinityShell, Crumb } from '../components/TrinityShell'
import { TC, V5FX, glassCardStyle, glassCardAccent } from '../lib/trinityTokens'
import { SvScale, SvActivity, SvCoins, SvUserCheck, SvSparkles, SvGitPull } from '../lib/icons/glyphs'
import {
  TiltCard, MagneticTile, SpotlightCard, RippleButton, PulseDot,
  CountUpText, StaggerContainer, staggerChildVariant,
} from '../lib/v5Interactions'
import { trackEvent } from '../lib/analytics'

type PropStatus = 'ACTIVE' | 'QUEUED' | 'PASSED' | 'REJECTED' | 'EXECUTED'
interface Proposal { id: string; title: string; author: string; status: PropStatus; forVotes: number; againstVotes: number; quorumPct: number; endsIn: string; category: 'Treasury' | 'CapEx' | 'Governance' | 'Utility' }
const PROPOSALS: Proposal[] = [
  { id: 'PRP-042', title: 'Allocate $180k for rooftop solar array', author: '0xAisha…4b21', status: 'ACTIVE',   forVotes: 34_120, againstVotes: 6_940,  quorumPct: 68, endsIn: '2d 14h', category: 'CapEx' },
  { id: 'PRP-041', title: 'Raise reserve floor to 6mo OpEx',        author: '0xKenji…9c30', status: 'ACTIVE',   forVotes: 41_800, againstVotes: 4_120,  quorumPct: 82, endsIn: '19h',    category: 'Treasury' },
  { id: 'PRP-040', title: 'Adopt EIP-4337 for smart wallets',       author: '0xPriya…7fa8', status: 'PASSED',   forVotes: 52_100, againstVotes: 3_940,  quorumPct: 94, endsIn: 'closed', category: 'Governance' },
  { id: 'PRP-039', title: 'Distribute Q2 loyalty rewards',          author: '0xMarco…1e77', status: 'EXECUTED', forVotes: 48_620, againstVotes: 2_180,  quorumPct: 89, endsIn: 'closed', category: 'Utility' },
  { id: 'PRP-038', title: 'Sponsor Building 7 EV charging',         author: '0xZara…8b42',  status: 'QUEUED',   forVotes: 0,      againstVotes: 0,      quorumPct: 0,  endsIn: '3d start',category: 'CapEx' },
  { id: 'PRP-037', title: 'Cut concierge markup by 3%',             author: '0xLeo…5a19',   status: 'REJECTED', forVotes: 18_400, againstVotes: 29_800, quorumPct: 88, endsIn: 'closed', category: 'Utility' },
]

interface TreasuryLine { asset: string; symbol: string; balance: number; usd: number; pct: number; color: string }
const TREASURY: TreasuryLine[] = [
  { asset: 'USDC',        symbol: 'USDC', balance: 1_820_400, usd: 1_820_400, pct: 46.2, color: TC.emeraldV5 },
  { asset: 'Ether',       symbol: 'ETH',  balance: 240.3,     usd: 892_400,   pct: 22.6, color: TC.indigo   },
  { asset: 'Wrapped BTC', symbol: 'wBTC', balance: 8.42,      usd: 720_200,   pct: 18.3, color: TC.amberV5  },
  { asset: 'Building-A NAV',symbol:'ESTA', balance: 41_800,   usd: 512_000,   pct: 12.9, color: TC.violetV5 },
]

interface Member { id: string; ens: string; role: 'Steward' | 'Delegate' | 'Holder'; votingPower: number; joined: string }
const MEMBERS: Member[] = [
  { id: 'M01', ens: 'aisha.eth',  role: 'Steward',  votingPower: 12_840, joined: '2yr' },
  { id: 'M02', ens: 'kenji.eth',  role: 'Delegate', votingPower: 8_420,  joined: '18mo' },
  { id: 'M03', ens: 'priya.eth',  role: 'Steward',  votingPower: 7_960,  joined: '2yr' },
  { id: 'M04', ens: 'marco.eth',  role: 'Delegate', votingPower: 4_820,  joined: '9mo' },
  { id: 'M05', ens: 'zara.eth',   role: 'Holder',   votingPower: 3_240,  joined: '6mo' },
  { id: 'M06', ens: 'leo.eth',    role: 'Holder',   votingPower: 2_180,  joined: '4mo' },
]

const STATUS_COLOR: Record<PropStatus, string> = { ACTIVE: TC.cyanV5, QUEUED: TC.amberV5, PASSED: TC.emeraldV5, EXECUTED: TC.violetV5, REJECTED: '#EF4444' }
const CAT_COLOR: Record<Proposal['category'], string> = { Treasury: TC.emeraldV5, CapEx: TC.amberV5, Governance: TC.indigo, Utility: TC.violetV5 }
const ROLE_COLOR: Record<Member['role'], string> = { Steward: TC.violetV5, Delegate: TC.cyanV5, Holder: TC.textV5Muted }

const fmtCount = (v: number) => Math.round(v).toLocaleString()
const fmtUsdM = (v: number) => `$${(v / 1_000_000).toFixed(2)}M`
const fmtUsd  = (v: number) => `$${Math.round(v).toLocaleString()}`
const fmtPct  = (v: number) => `${v.toFixed(1)}%`

export default function Module16CommunityGovernance() {
  const [selectedPropId, setSelectedPropId] = useState<string>(PROPOSALS[0].id)
  const [voting, setVoting] = useState<null | 'FOR' | 'AGAINST'>(null)

  useEffect(() => { trackEvent('module16_view', {}) }, [])

  const selectedProp = useMemo(() => PROPOSALS.find(p => p.id === selectedPropId) || PROPOSALS[0], [selectedPropId])

  const totalTvl = TREASURY.reduce((s, t) => s + t.usd, 0)
  const totalMembers = MEMBERS.length
  const activeProps = PROPOSALS.filter(p => p.status === 'ACTIVE').length
  const avgQuorum = PROPOSALS.filter(p => p.quorumPct > 0).reduce((s, p) => s + p.quorumPct, 0) / PROPOSALS.filter(p => p.quorumPct > 0).length

  const castVote = (side: 'FOR' | 'AGAINST') => { setVoting(side); trackEvent('module16_proposal_voted', { proposal: selectedPropId, side }); setTimeout(() => setVoting(null), 1600) }

  const S = {
    root: { display: 'flex', flexDirection: 'column' as const, gap: 16, padding: '16px 20px 32px', color: TC.textV5Primary, fontFamily: V5FX.fontMono },
    hero: { ...glassCardStyle, ...glassCardAccent(TC.indigo, `${TC.indigo}44`), padding: '18px 20px 20px', display: 'flex', flexDirection: 'column' as const, gap: 12 },
    heroTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 12 },
    heroTitle: { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 },
    layerChip: { padding: '3px 10px', borderRadius: 999, fontSize: 9, letterSpacing: 1.6, textTransform: 'uppercase' as const, background: `${TC.indigo}22`, color: TC.indigo, border: `1px solid ${TC.indigo}55` },
    heroLabel: { fontSize: 'clamp(16px, 3.4vw, 22px)', fontWeight: 700, letterSpacing: -0.2, color: TC.textV5Primary },
    heroSub: { fontSize: 11, color: TC.textV5Muted, letterSpacing: 0.4 },
    kpiCard: { ...glassCardStyle, padding: '12px 14px', display: 'flex', flexDirection: 'column' as const, gap: 4 },
    kpiLabel: { fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase' as const, color: TC.textV5Muted },
    kpiVal: { fontSize: 'clamp(18px, 3.6vw, 22px)', fontWeight: 700, ...V5FX.tabularNums, color: TC.textV5Highlight },
    kpiHint: { fontSize: 10, color: TC.textV5Muted },
    section: { ...glassCardStyle, padding: 16, display: 'flex', flexDirection: 'column' as const, gap: 12, minWidth: 0 },
    sectionTitle: { fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase' as const, color: TC.textV5Muted, display: 'flex', alignItems: 'center', gap: 8 },
    propRow: (selected: boolean, color: string) => ({ ...glassCardStyle, padding: 12, borderColor: selected ? `${color}66` : TC.borderGlass, background: selected ? `${color}11` : TC.bgGlass, display: 'flex', flexDirection: 'column' as const, gap: 6, cursor: 'pointer', transition: V5FX.transitionFast }),
    badge: (color: string) => ({ padding: '3px 8px', borderRadius: 4, fontSize: 9, letterSpacing: 0.8, background: `${color}22`, color, border: `1px solid ${color}55`, textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const }),
    voteBar: { height: 6, borderRadius: 3, background: TC.borderGlass, overflow: 'hidden' as const, display: 'flex' },
    rowStat: { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4 },
    rowStatVal: { color: TC.textV5Primary, ...V5FX.tabularNums },
    ctaRow: { display: 'flex', gap: 8, flexWrap: 'wrap' as const },
    ellip: { whiteSpace: 'nowrap' as const, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const },
    treasuryBar: { height: 12, borderRadius: 6, background: TC.borderGlass, overflow: 'hidden' as const, display: 'flex' },
    treasurySegment: (c: TreasuryLine) => ({ width: `${c.pct}%`, height: '100%', background: c.color }),
    memberTile: { ...glassCardStyle, padding: 10, display: 'flex', alignItems: 'center', gap: 10 },
    avatar: (color: string) => ({ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg, ${color}55, ${color}22)`, border: `1px solid ${color}66`, display: 'grid', placeItems: 'center', color, fontSize: 11, fontWeight: 700, flex: '0 0 auto' as const }),
  }

  return (
    <TrinityShell activePath="/module/16-community-governance" headerAccent={TC.indigo}>
      <div style={S.root}>
        <Crumb items={['STRATERA™', 'L2 Financial', 'M16 · Community & Governance']} />

        <div style={S.hero}>
          <div style={S.heroTop}>
            <div style={S.heroTitle}>
              <SvScale size={22} color={TC.indigo} />
              <div style={{ minWidth: 0 }}>
                <div style={S.heroLabel}>M16 · Community & Governance</div>
                <div style={S.heroSub}>DAO proposals · treasury vault · voting power · loyalty economy</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={S.layerChip}>Layer 2 · Financial</span>
              <PulseDot color={TC.indigo} />
              <span style={{ fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4 }}>LIVE</span>
            </div>
          </div>
          <div className="v5-kpi-4">
            <div style={S.kpiCard}><div style={S.kpiLabel}>Treasury TVL</div><div style={{ ...S.kpiVal, color: TC.emeraldV5 }}><CountUpText to={totalTvl} format={fmtUsdM} /></div><div style={S.kpiHint}>{TREASURY.length} asset classes</div></div>
            <div style={S.kpiCard}><div style={S.kpiLabel}>Active Proposals</div><div style={S.kpiVal}><CountUpText to={activeProps} format={fmtCount} /></div><div style={S.kpiHint}>of {PROPOSALS.length} total</div></div>
            <div style={S.kpiCard}><div style={S.kpiLabel}>Members</div><div style={S.kpiVal}><CountUpText to={totalMembers} format={fmtCount} /></div><div style={S.kpiHint}>{MEMBERS.filter(m => m.role === 'Steward').length} stewards</div></div>
            <div style={S.kpiCard}><div style={S.kpiLabel}>Avg Quorum</div><div style={{ ...S.kpiVal, color: TC.violetV5 }}><CountUpText to={avgQuorum} format={fmtPct} /></div><div style={S.kpiHint}>▲ +8 pts YoY</div></div>
          </div>
        </div>

        <div className="v5-split-2">
          <div style={S.section}>
            <div style={S.sectionTitle}><SvGitPull size={12} color={TC.indigo} /><span>Governance Proposals · {PROPOSALS.length}</span></div>
            <StaggerContainer style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {PROPOSALS.map(p => {
                const total = p.forVotes + p.againstVotes
                const forPct = total > 0 ? (p.forVotes / total) * 100 : 0
                const isSel = p.id === selectedPropId
                const color = STATUS_COLOR[p.status]
                return (
                  <motion.div key={p.id} variants={staggerChildVariant} style={S.propRow(isSel, color)} onClick={() => setSelectedPropId(p.id)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 10, color: TC.textV5Muted, ...V5FX.tabularNums, flexShrink: 0 }}>{p.id}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: TC.textV5Highlight, ...S.ellip, minWidth: 0 }}>{p.title}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <div style={S.badge(CAT_COLOR[p.category])}>{p.category}</div>
                        <div style={S.badge(color)}>{p.status}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 9, color: TC.textV5Muted, letterSpacing: 0.4 }}>{p.author} · ends {p.endsIn}</div>
                    {total > 0 && (
                      <>
                        <div style={S.voteBar}>
                          <div style={{ width: `${forPct}%`, background: TC.emeraldV5 }} />
                          <div style={{ width: `${100 - forPct}%`, background: '#EF4444' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: TC.textV5Muted, ...V5FX.tabularNums }}>
                          <span style={{ color: TC.emeraldV5 }}>FOR {p.forVotes.toLocaleString()}</span>
                          <span>Quorum {p.quorumPct}%</span>
                          <span style={{ color: '#EF4444' }}>AGAINST {p.againstVotes.toLocaleString()}</span>
                        </div>
                      </>
                    )}
                  </motion.div>
                )
              })}
            </StaggerContainer>

            <SpotlightCard accent={TC.indigo} style={{ padding: 14, marginTop: 4, borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <SvActivity size={14} color={TC.indigo} />
                <span style={{ fontSize: 11, color: TC.textV5Muted, letterSpacing: 1.2, textTransform: 'uppercase' }}>Cast Vote · {selectedProp.id}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: TC.textV5Highlight, marginBottom: 8 }}>{selectedProp.title}</div>
              {selectedProp.status === 'ACTIVE' ? (
                <div style={S.ctaRow}>
                  <RippleButton onClick={() => castVote('FOR')} accent={TC.emeraldV5}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><SvSparkles size={12} color={TC.emeraldV5} />{voting === 'FOR' ? 'Signing…' : 'Vote FOR'}</span>
                  </RippleButton>
                  <RippleButton onClick={() => castVote('AGAINST')} accent="#EF4444">
                    <span style={{ fontSize: 10 }}>{voting === 'AGAINST' ? 'Signing…' : 'Vote AGAINST'}</span>
                  </RippleButton>
                  <RippleButton onClick={() => trackEvent('module16_quorum_reached', { proposal: selectedProp.id })} accent={TC.textV5Muted}>
                    <span style={{ fontSize: 10 }}>DELEGATE</span>
                  </RippleButton>
                </div>
              ) : (
                <div style={{ fontSize: 11, color: TC.textV5Muted, letterSpacing: 0.4 }}>Voting {selectedProp.status.toLowerCase()} · no active ballot</div>
              )}
            </SpotlightCard>
          </div>

          <div style={S.section}>
            <div style={S.sectionTitle}><SvCoins size={12} color={TC.indigo} /><span>Treasury Vault · {fmtUsdM(totalTvl)}</span></div>
            <div style={S.treasuryBar}>
              {TREASURY.map(t => <div key={t.symbol} style={S.treasurySegment(t)} />)}
            </div>
            <StaggerContainer style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {TREASURY.map(t => (
                <motion.div key={t.symbol} variants={staggerChildVariant} style={{ display: 'grid', gridTemplateColumns: '12px minmax(0, 1fr) auto auto', gap: 10, alignItems: 'center', padding: '6px 10px', borderRadius: 8, background: TC.bgGlass, border: `1px solid ${TC.borderGlass}` }}>
                  <div style={{ width: 12, height: 12, borderRadius: 4, background: t.color }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: TC.textV5Primary, fontWeight: 600 }}>{t.asset}</div>
                    <div style={{ fontSize: 9, color: TC.textV5Muted, ...V5FX.tabularNums }}>{t.balance.toLocaleString()} {t.symbol}</div>
                  </div>
                  <div style={{ fontSize: 12, color: TC.textV5Highlight, ...V5FX.tabularNums }}>{fmtUsd(t.usd)}</div>
                  <div style={{ fontSize: 10, color: t.color, ...V5FX.tabularNums }}>{t.pct.toFixed(1)}%</div>
                </motion.div>
              ))}
            </StaggerContainer>
            <RippleButton onClick={() => trackEvent('module16_treasury_moved', {})} accent={TC.emeraldV5}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><SvCoins size={12} color={TC.emeraldV5} />Move Treasury</span>
            </RippleButton>

            <div style={S.sectionTitle}><SvUserCheck size={12} color={TC.indigo} /><span>Voting Power · {MEMBERS.length} members</span></div>
            <StaggerContainer className="v5-cards">
              {MEMBERS.map(m => (
                <MagneticTile key={m.id} strength={0.2}>
                  <div style={{ ...S.memberTile, ...glassCardAccent(ROLE_COLOR[m.role], `${ROLE_COLOR[m.role]}22`) }}>
                    <div style={S.avatar(ROLE_COLOR[m.role])}>{m.ens.charAt(0).toUpperCase()}</div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: TC.textV5Highlight, ...S.ellip }}>{m.ens}</div>
                      <div style={{ fontSize: 9, color: TC.textV5Muted, letterSpacing: 0.4 }}>{m.role} · {m.joined}</div>
                      <div style={{ fontSize: 10, color: ROLE_COLOR[m.role], ...V5FX.tabularNums }}>{m.votingPower.toLocaleString()} vp</div>
                    </div>
                  </div>
                </MagneticTile>
              ))}
            </StaggerContainer>
          </div>
        </div>

        <div className="v5-footer-stamp" style={{ padding: '16px 20px 12px', borderTop: `1px solid ${TC.borderGlass}`, fontFamily: V5FX.fontMono, fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4 }}>
          <span>STRATERA™ v5.0.0-delta</span><span>·</span><span>Module 16 · Community & Governance</span><span>·</span><span>Layer 2 · Financial</span><span>·</span><span>DAO · Treasury · Delegates · Loyalty</span>
        </div>
      </div>
    </TrinityShell>
  )
}
