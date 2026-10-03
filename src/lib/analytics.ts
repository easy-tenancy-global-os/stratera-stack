// ── Analytics instrumentation — production-grade ─────────────
type EventName =
  | 'page_view'
  | 'feature_clicked'
  | 'roi_engaged'
  | 'demo_started'
  | 'compliance_panel_opened'
  | 'micro_tour_started'
  | 'micro_tour_completed'
  | 'ai_feed_clicked'
  | 'radial_node_clicked'
  | 'waitlist_submitted'
  | 'cta_clicked'
  | 'pricing_toggled'
  | 'metrics_viewed'
  | 'deep_link_activated'
  | 'property_viewed'
  | 'section_navigated'
  | 'notice_generated'
  | 'demo_cta_clicked'
  | 'mobile_nav_clicked'
  | 'hero_widget_launched'
  | 'success_fee_demo'
  | 'copilot_used'
  | 'ai_assistant_used'
  | 'banner_clicked'
  | 'tab_switched'
  | 'staging_complete'
  | 'tour_generated'
  | 'compliance_checked'
  | 'arr_viewed'
  | 'radial_map_click'
  | 'lease_action'
  | 'maintenance_action'
  | 'cmdk_opened'
  | 'cmdk_run'
  | 'status_clicked'
  | 'changelog_clicked'
  | 'roadmap_card_clicked'
  | 'sw_installed'
  | 'pwa_install_prompt'
  | 'pwa_install_accepted'
  | 'brain_ask'
  | 'brain_tab'
  // ── v4.9 · STRATERA Estate Fleet Core (Robotics & Spatial Automation) ──
  | 'fleet_view'
  | 'fleet_tab_switched'
  | 'fleet_robot_selected'
  | 'fleet_incident_dispatched'
  | 'fleet_action_triggered'
  | 'fleet_lockdown'
  | 'fleet_privacy_toggled'
  | 'fleet_protocol_inspected'
  | 'fleet_stream_toggled'
  | 'fleet_escort_requested'
  // ── v4.10 · Holy Trinity Blueprint (Construct / Market / Capital / Reach / Project / Trinity) ──
  | 'trinity_view'
  | 'trinity_layer_switched'
  | 'trinity_router_action'
  | 'construct_view'
  | 'construct_tab_switched'
  | 'construct_bom_generated'
  | 'market_view'
  | 'market_tab_switched'
  | 'market_dispatch'
  | 'market_purchase_intent'
  | 'capital_view'
  | 'capital_tab_switched'
  | 'capital_escrow_action'
  | 'capital_underwrite_run'
  | 'reach_view'
  | 'reach_tab_switched'
  | 'reach_tour_launched'
  | 'reach_price_adjusted'
  | 'project_view'
  | 'project_tab_switched'
  | 'project_risk_investigated'
  | 'popp_verified'
  | 'interop_inspected'
  // ── v5.0 · STRATERA™ Transaction Layer (Path 3a) ──────────────────
  | 'estate_os_view'
  | 'control_room_view'
  | 'control_room_module_clicked'
  | 'ai_core_view'
  | 'ai_core_tab_switched'
  | 'ai_core_tool_invoked'
  | 'ai_core_mcp_ping'
  | 'ai_core_mcp_probe'
  | 'inventory_launch_view'
  | 'inventory_wave_adjusted'
  | 'inventory_unit_reserved'
  | 'crm_pipeline_view'
  | 'crm_intent_recalc'
  | 'crm_identity_verified'
  | 'deal_room_view'
  | 'deal_room_jurisdiction_switched'
  | 'deal_room_clause_reviewed'
  | 'deal_room_escrow_stepped'
  | 'property_ops_view'
  | 'property_ops_alert_ack'
  | 'property_ops_workorder_paid'
  | 'brokerage_view'
  | 'brokerage_split_calculated'
  | 'brokerage_payout_triggered'
  | 'project_tracker_view'
  | 'project_tracker_photogrammetry_diffed'
  | 'mcp_client_call'
  // v5.0.0 Capital Layer suite (Modules 08 / 10 / 19 / 22 / 23)
  | 'module08_view'
  | 'module08_rail_switched'
  | 'module08_transfer_estimated'
  | 'module08_escrow_disbursed'
  | 'module08_lender_check'
  | 'module10_view'
  | 'module10_waterfall_adjusted'
  | 'module10_lp_step_advanced'
  | 'module19_view'
  | 'module19_property_selected'
  | 'module19_action_ack'
  | 'module22_view'
  | 'module22_framework_toggled'
  | 'module22_dividend_disbursed'
  | 'module23_view'
  | 'module23_order_placed'
  | 'module23_rail_selected'
  // v5.0.0-beta — remaining Capital Layer / Ops modules
  | 'module03_view'
  | 'module03_channel_toggled'
  | 'module03_wave_price_synced'
  | 'module03_portal_synced'
  | 'module04_view'
  | 'module04_lead_selected'
  | 'module04_zk_proved'
  | 'module04_intent_recomputed'
  | 'module05_view'
  | 'module05_clause_flagged'
  | 'module05_conveyance_verified'
  | 'module05_escrow_step_advanced'
  | 'module06_view'
  | 'module06_alert_ack'
  | 'module06_work_order_dispatched'
  | 'module06_sla_escrow_debited'
  | 'module12_view'
  | 'module12_agent_selected'
  | 'module12_payout_executed'
  | 'module12_tier_promoted'
  | 'module24_view'
  | 'module24_milestone_verified'
  | 'module24_drone_dispatched'
  | 'module24_bim_layer_toggled'
  // v5.0.0-delta — remaining 14 module events
  | 'module02_view' | 'module02_twin_layer_toggled' | 'module02_geo_zoomed' | 'module02_asset_pinned'
  | 'module07_view' | 'module07_portal_synced' | 'module07_listing_boosted' | 'module07_mls_pushed'
  | 'module09_view' | 'module09_applicant_scored' | 'module09_kyc_ran' | 'module09_fraud_flagged'
  | 'module11_view' | 'module11_jurisdiction_toggled' | 'module11_sanction_checked' | 'module11_policy_diffed'
  | 'module13_view' | 'module13_workorder_dispatched' | 'module13_vendor_selected' | 'module13_coi_verified'
  | 'module14_view' | 'module14_policy_bound' | 'module14_claim_filed' | 'module14_parametric_triggered'
  | 'module15_view' | 'module15_concierge_pinged' | 'module15_service_booked' | 'module15_message_sent'
  | 'module16_view' | 'module16_proposal_voted' | 'module16_treasury_moved' | 'module16_quorum_reached'
  | 'module17_view' | 'module17_scope_toggled' | 'module17_offset_purchased' | 'module17_report_generated'
  | 'module18_view' | 'module18_doc_versioned' | 'module18_qa_answered' | 'module18_diligence_exported'
  | 'module20_view' | 'module20_cat_bond_priced' | 'module20_reinsurance_bound' | 'module20_trigger_armed'
  | 'module21_view' | 'module21_letter_generated' | 'module21_benchmark_ran' | 'module21_dashboard_exported'
  | 'module25_view' | 'module25_visa_checked' | 'module25_passport_verified' | 'module25_residency_scored'
  // v5.0.0-epsilon — AppDemo + PredictiveLifeOS
  | 'appdemo_persona_switched' | 'appdemo_module_launch' | 'appdemo_cta_click' | 'appdemo_upgrade_click'
  | 'predictive_persona_switched' | 'predictive_node_clicked' | 'predictive_action_launched'
  | 'predictive_cert_started' | 'predictive_copilot_prompt'
  // v5.2.3-alpha — Module 27 · Family Bank / Infinite Banking
  | 'module27_view' | 'module27_wizard_step' | 'module27_wizard_complete'
  | 'module27_deferral_toggled' | 'module27_horizon_selected'
  | 'module27_deploy_modal_open' | 'module27_deploy_execute'
  // ── v5.3.0-alpha · Internal Sales & Marketing Team Engine ────────────
  | 'sales_engine_view' | 'sales_engine_tab_switched'
  | 'sales_engine_lead_moved' | 'sales_engine_lead_opened' | 'sales_engine_lead_created'
  | 'sales_engine_task_completed' | 'sales_engine_task_created'
  | 'sales_engine_template_used' | 'sales_engine_template_copied'
  | 'sales_engine_interaction_logged'
  | 'sales_engine_inventory_reserved' | 'sales_engine_order_created' | 'sales_engine_order_advanced'
  | 'sales_engine_owner_switched' | 'sales_engine_filter_changed'

interface EventPayload {
  [key: string]: string | number | boolean | undefined
}

interface QueuedEvent {
  name: EventName
  payload: EventPayload
  ts: number
  session: string
  url: string
  _retries?: number
}

// ── Session ID (persisted per tab) ─────────────────────────────
function getSessionId(): string {
  try {
    let id = sessionStorage.getItem('et_sid')
    if (!id) {
      id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
      sessionStorage.setItem('et_sid', id)
    }
    return id
  } catch {
    return `s_${Date.now().toString(36)}`
  }
}

const SESSION_ID = getSessionId()
const queue: QueuedEvent[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
let flushing = false

// ── Flush logic ────────────────────────────────────────────────
async function flush() {
  if (queue.length === 0 || flushing) return
  flushing = true
  const batch = queue.splice(0, queue.length) // drain atomically

  if (import.meta.env.DEV) {
    // Dev: pretty-print to console
    console.groupCollapsed(`%c[Analytics] ${batch.length} event(s)`, 'color:#39bff6;font-weight:600')
    batch.forEach(e => console.log(`  %c${e.name}`, 'color:#a78bfa', e.payload))
    console.groupEnd()
    flushing = false
    return
  }

  // Production: POST to /api/analytics with retry
  try {
    const res = await fetch('/api/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Id': SESSION_ID,
      },
      body: JSON.stringify({ events: batch }),
      keepalive: true,
    })
    if (!res.ok) {
      // Re-queue on server error (max 3 retries, don't re-queue 4xx)
      if (res.status >= 500) {
        const retries = batch[0]?._retries ?? 0
        if (retries < 3) {
          batch.forEach(e => { e._retries = (e._retries ?? 0) + 1 })
          queue.unshift(...batch)
        }
      }
    }
  } catch {
    // Network offline — re-queue silently (max 3 attempts)
    const retries = batch[0]?._retries ?? 0
    if (retries < 3) {
      batch.forEach(e => { e._retries = retries + 1 })
      queue.unshift(...batch)
    }
  } finally {
    flushing = false
  }
}

// ── Flush on page unload via sendBeacon ────────────────────────
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    if (queue.length === 0) return
    const body = JSON.stringify({ events: queue.splice(0) })
    try {
      navigator.sendBeacon('/api/analytics', body)
    } catch {
      // sendBeacon not available — ignore
    }
  })
}

// ── Public API ─────────────────────────────────────────────────
export function trackEvent(name: EventName, payload: EventPayload = {}) {
  const event: QueuedEvent = {
    name,
    payload,
    ts: Date.now(),
    session: SESSION_ID,
    url: typeof window !== 'undefined' ? window.location.pathname + window.location.search : '',
  }
  queue.push(event)
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = setTimeout(flush, 500)
}

export function trackPageView(path: string) {
  trackEvent('page_view', {
    path,
    referrer: typeof document !== 'undefined' ? document.referrer : '',
    ua: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 80) : '',
  })
}

// ── Flush immediately (e.g. before navigation) ─────────────────
export function flushNow() {
  if (flushTimer) clearTimeout(flushTimer)
  flush()
}
