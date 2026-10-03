/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Module 18 — Data Room & Diligence · Versioned Docs · Q&A · Export
 *  Route: /module/18-data-room
 *  Owning layer: L3 (Operational) · Accent: TC.indigo
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrinityShell, Crumb } from '../components/TrinityShell'
import { TC, V5FX, glassCardStyle, glassCardAccent } from '../lib/trinityTokens'
import { SvFileText, SvActivity, SvLock, SvSparkles, SvClipboardChk, SvUserCheck } from '../lib/icons/glyphs'
import {
  TiltCard, MagneticTile, SpotlightCard, RippleButton, PulseDot,
  CountUpText, StaggerContainer, staggerChildVariant,
} from '../lib/v5Interactions'
import { trackEvent } from '../lib/analytics'

interface DocFolder { id: string; name: string; docs: number; sizeMb: number; access: 'PUBLIC' | 'BUYERS' | 'ADVISORS' | 'INTERNAL'; updated: string }
const FOLDERS: DocFolder[] = [
  { id: 'F01', name: 'Financials · Audited FY25', docs: 24, sizeMb: 128,  access: 'ADVISORS',  updated: '2h ago' },
  { id: 'F02', name: 'Rent Roll · Live',           docs:  6, sizeMb:  42,  access: 'BUYERS',    updated: '18m ago' },
  { id: 'F03', name: 'Title · Deeds · Surveys',    docs: 41, sizeMb: 312,  access: 'BUYERS',    updated: '1d ago' },
  { id: 'F04', name: 'Leases · Master · Amendments',docs:88, sizeMb: 640,  access: 'ADVISORS',  updated: '3h ago' },
  { id: 'F05', name: 'Environmental · Phase I/II', docs: 12, sizeMb:  84,  access: 'ADVISORS',  updated: '2d ago' },
  { id: 'F06', name: 'ESG · GRESB Reports',        docs:  8, sizeMb:  56,  access: 'PUBLIC',    updated: '4d ago' },
  { id: 'F07', name: 'Legal · Litigation · NDAs',  docs: 34, sizeMb: 180,  access: 'INTERNAL',  updated: '5h ago' },
  { id: 'F08', name: 'Insurance · Policies · Claims',docs:22,sizeMb: 108,  access: 'INTERNAL',  updated: '1d ago' },
]

type QaStatus = 'OPEN' | 'ANSWERED' | 'ESCALATED'
interface QaThread { id: string; question: string; askedBy: string; status: QaStatus; days: number; answer?: string }
const QA_THREADS: QaThread[] = [
  { id: 'QA-01', question: 'Any pending litigation on Building 4?',   askedBy: 'Blackstone Adv.', status: 'ANSWERED',  days: 1, answer: 'No active suits. One dismissed 2024-11.' },
  { id: 'QA-02', question: 'Rent-roll delta April vs May?',            askedBy: 'KKR Deal Team',   status: 'ANSWERED',  days: 2, answer: '+2.1% GAV growth; occupancy 96.4%.' },
  { id: 'QA-03', question: 'Any material capex planned Q3?',           askedBy: 'CalPERS',         status: 'OPEN',      days: 0 },
  { id: 'QA-04', question: 'ESG target for 2027 vs baseline?',         askedBy: 'GIC Sing.',       status: 'OPEN',      days: 1 },
  { id: 'QA-05', question: 'Confirm carrier for cyber policy #70025?', askedBy: 'Ashurst LLP',     status: 'ESCALATED', days: 3 },
]

interface Activity { id: string; user: string; action: string; folder: string; time: string }
const ACTIVITY: Activity[] = [
  { id: 'A1', user: 'blackstone_adv',  action: 'downloaded',       folder: 'Financials FY25',   time: '4m ago' },
  { id: 'A2', user: 'gic_analyst_3',   action: 'viewed',           folder: 'Rent Roll · Live',  time: '11m ago' },
  { id: 'A3', user: 'kkr_deal_team',   action: 'requested access', folder: 'Legal · Litigation',time: '38m ago' },
  { id: 'A4', user: 'ashurst_partner', action: 'commented',        folder: 'Insurance Policies',time: '1h ago' },
  { id: 'A5', user: 'calpers_deputy',  action: 'exported',         folder: 'ESG · GRESB',       time: '2h ago' },
]

const ACCESS_COLOR: Record<DocFolder['access'], string> = { PUBLIC: TC.emeraldV5, BUYERS: TC.cyanV5, ADVISORS: TC.amberV5, INTERNAL: TC.violetV5 }
const QA_COLOR: Record<QaStatus, string> = { OPEN: TC.amberV5, ANSWERED: TC.emeraldV5, ESCALATED: '#EF4444' }

const fmtCount = (v: number) => Math.round(v).toString()
const fmtMb = (v: number) => `${Math.round(v)} MB`
const fmtGb = (v: number) => `${(v / 1024).toFixed(2)} GB`

export default function Module18DataRoomDiligence() {
  const [selectedFolderId, setSelectedFolderId] = useState<string>(FOLDERS[0].id)
  const [answering, setAnswering] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => { trackEvent('module18_view', {}) }, [])

  const selectedFolder = useMemo(() => FOLDERS.find(f => f.id === selectedFolderId) || FOLDERS[0], [selectedFolderId])

  const totalDocs = FOLDERS.reduce((s, f) => s + f.docs, 0)
  const totalMb = FOLDERS.reduce((s, f) => s + f.sizeMb, 0)
  const openQa = QA_THREADS.filter(q => q.status === 'OPEN').length
  const escalated = QA_THREADS.filter(q => q.status === 'ESCALATED').length

  const versionDoc = () => { trackEvent('module18_doc_versioned', { folder: selectedFolder.id }) }
  const answerQa = (id: string) => { setAnswering(id); trackEvent('module18_qa_answered', { thread: id }); setTimeout(() => setAnswering(null), 1400) }
  const exportDiligence = () => { setExporting(true); trackEvent('module18_diligence_exported', { format: 'PDF' }); setTimeout(() => setExporting(false), 1800) }

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
    folderTile: { padding: 12, display: 'flex', flexDirection: 'column' as const, gap: 6, cursor: 'pointer' },
    badge: (color: string) => ({ padding: '3px 8px', borderRadius: 4, fontSize: 9, letterSpacing: 0.8, background: `${color}22`, color, border: `1px solid ${color}55`, textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const }),
    rowStat: { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4 },
    rowStatVal: { color: TC.textV5Primary, ...V5FX.tabularNums },
    ctaRow: { display: 'flex', gap: 8, flexWrap: 'wrap' as const },
    ellip: { whiteSpace: 'nowrap' as const, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const },
    qaCard: (color: string) => ({ ...glassCardStyle, padding: 12, borderColor: `${color}55`, background: `${color}0d`, display: 'flex', flexDirection: 'column' as const, gap: 6 }),
    activityRow: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 10, padding: '8px 10px', borderRadius: 8, background: TC.bgGlass, border: `1px solid ${TC.borderGlass}` },
  }

  return (
    <TrinityShell activePath="/module/18-data-room" headerAccent={TC.indigo}>
      <div style={S.root}>
        <Crumb items={['STRATERA™', 'L3 Operational', 'M18 · Data Room & Diligence']} />

        <div style={S.hero}>
          <div style={S.heroTop}>
            <div style={S.heroTitle}>
              <SvFileText size={22} color={TC.indigo} />
              <div style={{ minWidth: 0 }}>
                <div style={S.heroLabel}>M18 · Data Room & Diligence</div>
                <div style={S.heroSub}>Versioned folders · watermarked PDFs · Q&A workflow · deal-ready export</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={S.layerChip}>Layer 3 · Operational</span>
              <PulseDot color={TC.indigo} />
              <span style={{ fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4 }}>LIVE</span>
              <RippleButton onClick={exportDiligence} accent={TC.indigo}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><SvClipboardChk size={12} color={TC.indigo} />{exporting ? 'Exporting…' : 'Export Diligence'}</span>
              </RippleButton>
            </div>
          </div>
          <div className="v5-kpi-4">
            <div style={S.kpiCard}><div style={S.kpiLabel}>Documents</div><div style={S.kpiVal}><CountUpText to={totalDocs} format={fmtCount} /></div><div style={S.kpiHint}>{FOLDERS.length} folders</div></div>
            <div style={S.kpiCard}><div style={S.kpiLabel}>Storage</div><div style={{ ...S.kpiVal, color: TC.cyanV5 }}><CountUpText to={totalMb} format={fmtGb} /></div><div style={S.kpiHint}>versioned + audit</div></div>
            <div style={S.kpiCard}><div style={S.kpiLabel}>Open Q&A</div><div style={{ ...S.kpiVal, color: TC.amberV5 }}><CountUpText to={openQa} format={fmtCount} /></div><div style={S.kpiHint}>of {QA_THREADS.length} threads</div></div>
            <div style={S.kpiCard}><div style={S.kpiLabel}>Escalated</div><div style={{ ...S.kpiVal, color: escalated > 0 ? '#EF4444' : TC.emeraldV5 }}><CountUpText to={escalated} format={fmtCount} /></div><div style={S.kpiHint}>require attention</div></div>
          </div>
        </div>

        <div className="v5-split-2">
          <div style={S.section}>
            <div style={S.sectionTitle}><SvLock size={12} color={TC.indigo} /><span>Folder Directory · {FOLDERS.length}</span></div>
            <StaggerContainer className="v5-cards">
              {FOLDERS.map(f => {
                const color = ACCESS_COLOR[f.access]
                const isSel = f.id === selectedFolderId
                return (
                  <MagneticTile key={f.id} strength={0.2}>
                    <TiltCard onClick={() => setSelectedFolderId(f.id)} style={{ ...glassCardStyle, ...glassCardAccent(color, isSel ? `${color}66` : `${color}22`), ...S.folderTile }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: TC.textV5Highlight, ...S.ellip, minWidth: 0 }}>{f.name}</div>
                        <div style={S.badge(color)}>{f.access}</div>
                      </div>
                      <div style={S.rowStat}><span>Docs</span><span style={S.rowStatVal}>{f.docs}</span></div>
                      <div style={S.rowStat}><span>Size</span><span style={S.rowStatVal}>{fmtMb(f.sizeMb)}</span></div>
                      <div style={S.rowStat}><span>Updated</span><span style={S.rowStatVal}>{f.updated}</span></div>
                    </TiltCard>
                  </MagneticTile>
                )
              })}
            </StaggerContainer>

            <SpotlightCard accent={TC.indigo} style={{ padding: 14, marginTop: 4, borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <SvActivity size={14} color={TC.indigo} />
                <span style={{ fontSize: 11, color: TC.textV5Muted, letterSpacing: 1.2, textTransform: 'uppercase' }}>Folder Detail · {selectedFolder.id}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: TC.textV5Highlight }}>{selectedFolder.name}</div>
              <div style={{ fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4, marginBottom: 8 }}>Access: {selectedFolder.access} · {selectedFolder.docs} docs · {fmtMb(selectedFolder.sizeMb)}</div>
              <div style={S.ctaRow}>
                <RippleButton onClick={versionDoc} accent={TC.indigo}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><SvSparkles size={12} color={TC.indigo} />New Version</span>
                </RippleButton>
                <RippleButton onClick={() => trackEvent('module18_doc_versioned', { folder: selectedFolder.id, action: 'watermark' })} accent={TC.violetV5}>
                  <span style={{ fontSize: 10 }}>WATERMARK</span>
                </RippleButton>
                <RippleButton onClick={() => trackEvent('module18_doc_versioned', { folder: selectedFolder.id, action: 'audit_log' })} accent={TC.textV5Muted}>
                  <span style={{ fontSize: 10 }}>AUDIT LOG</span>
                </RippleButton>
              </div>
            </SpotlightCard>
          </div>

          <div style={S.section}>
            <div style={S.sectionTitle}><SvUserCheck size={12} color={TC.indigo} /><span>Q&A Workflow · {QA_THREADS.length} threads</span></div>
            <StaggerContainer style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {QA_THREADS.map(q => (
                <motion.div key={q.id} variants={staggerChildVariant} style={S.qaCard(QA_COLOR[q.status])}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 10, color: TC.textV5Muted, ...V5FX.tabularNums }}>{q.id} · {q.askedBy}</div>
                    <div style={S.badge(QA_COLOR[q.status])}>{q.status}</div>
                  </div>
                  <div style={{ fontSize: 12, color: TC.textV5Highlight, lineHeight: 1.4 }}>{q.question}</div>
                  {q.answer && <div style={{ fontSize: 11, color: TC.textV5Muted, lineHeight: 1.4, paddingLeft: 8, borderLeft: `2px solid ${QA_COLOR[q.status]}55` }}>{q.answer}</div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                    <div style={{ fontSize: 9, color: TC.textV5Muted, letterSpacing: 0.4 }}>{q.days}d ago</div>
                    {q.status === 'OPEN' && (
                      <RippleButton onClick={() => answerQa(q.id)} accent={TC.emeraldV5}>
                        <span style={{ fontSize: 9 }}>{answering === q.id ? 'ANSWERING…' : 'ANSWER'}</span>
                      </RippleButton>
                    )}
                  </div>
                </motion.div>
              ))}
            </StaggerContainer>

            <div style={S.sectionTitle}><SvActivity size={12} color={TC.indigo} /><span>Recent Activity</span></div>
            <StaggerContainer style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {ACTIVITY.map(a => (
                <motion.div key={a.id} variants={staggerChildVariant} style={S.activityRow}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: TC.textV5Highlight, ...S.ellip }}>
                      <span style={{ color: TC.indigo, fontWeight: 600 }}>{a.user}</span>
                      <span style={{ color: TC.textV5Muted }}> {a.action} </span>
                      <span>{a.folder}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 9, color: TC.textV5Muted, letterSpacing: 0.4, whiteSpace: 'nowrap' }}>{a.time}</div>
                </motion.div>
              ))}
            </StaggerContainer>
          </div>
        </div>

        <div className="v5-footer-stamp" style={{ padding: '16px 20px 12px', borderTop: `1px solid ${TC.borderGlass}`, fontFamily: V5FX.fontMono, fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4 }}>
          <span>STRATERA™ v5.0.0-delta</span><span>·</span><span>Module 18 · Data Room</span><span>·</span><span>Layer 3 · Operational</span><span>·</span><span>Versioning · Watermark · Q&A · Export</span>
        </div>
      </div>
    </TrinityShell>
  )
}
