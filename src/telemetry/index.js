// Telemetry Module - Prometheus-compatible metrics
import { EventEmitter } from 'events';
import os from 'os';

/**
 * Simple counter implementation (Prometheus-compatible)
 */
class Counter {
  constructor(name, help, labels = []) {
    this.name = name;
    this.help = help;
    this.labels = labels;
    this.values = new Map();
  }

  inc(labels = {}, value = 1) {
    const key = JSON.stringify(labels);
    const current = this.values.get(key) || 0;
    this.values.set(key, current + value);
  }

  getValue(labels = {}) {
    const key = JSON.stringify(labels);
    return this.values.get(key) || 0;
  }

  toPrometheus() {
    let output = `# HELP ${this.help}\n`;
    output += `# TYPE ${this.name} counter\n`;
    
    for (const [labels, value] of this.values.entries()) {
      const labelStr = labels === '{}' ? '' : `{${labels.substring(1, labels.length - 1)}}`;
      output += `${this.name}${labelStr} ${value}\n`;
    }
    
    return output;
  }
}

/**
 * Simple gauge implementation (Prometheus-compatible)
 */
class Gauge {
  constructor(name, help, labels = []) {
    this.name = name;
    this.help = help;
    this.labels = labels;
    this.values = new Map();
  }

  set(labels = {}, value) {
    const key = JSON.stringify(labels);
    this.values.set(key, value);
  }

  inc(labels = {}, value = 1) {
    const key = JSON.stringify(labels);
    const current = this.values.get(key) || 0;
    this.values.set(key, current + value);
  }

  dec(labels = {}, value = 1) {
    const key = JSON.stringify(labels);
    const current = this.values.get(key) || 0;
    this.values.set(key, current - value);
  }

  toPrometheus() {
    let output = `# HELP ${this.help}\n`;
    output += `# TYPE ${this.name} gauge\n`;
    
    for (const [labels, value] of this.values.entries()) {
      const labelStr = labels === '{}' ? '' : `{${labels.substring(1, labels.length - 1)}}`;
      output += `${this.name}${labelStr} ${value}\n`;
    }
    
    return output;
  }
}

/**
 * Simple histogram implementation (Prometheus-compatible)
 */
class Histogram {
  constructor(name, help, buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]) {
    this.name = name;
    this.help = help;
    this.buckets = buckets;
    this.values = new Map();
    this.sum = new Map();
    this.count = new Map();
  }

  observe(labels = {}, value) {
    const key = JSON.stringify(labels);
    
    // Update buckets
    const bucketValues = this.values.get(key) || {};
    for (const bucket of this.buckets) {
      bucketValues[bucket] = (bucketValues[bucket] || 0) + (value <= bucket ? 1 : 0);
    }
    bucketValues[+Infinity] = (bucketValues[+Infinity] || 0) + 1;
    this.values.set(key, bucketValues);
    
    // Update sum
    const currentSum = this.sum.get(key) || 0;
    this.sum.set(key, currentSum + value);
    
    // Update count
    const currentCount = this.count.get(key) || 0;
    this.count.set(key, currentCount + 1);
  }

  toPrometheus() {
    let output = `# HELP ${this.help}\n`;
    output += `# TYPE ${this.name} histogram\n`;
    
    for (const [labels] of this.values.entries()) {
      const labelStr = labels === '{}' ? '' : `{${labels.substring(1, labels.length - 1)}}`;
      
      // Buckets
      const bucketValues = this.values.get(labels);
      for (const bucket of [...this.buckets, '+Inf']) {
        output += `${this.name}_bucket{${labelStr ? labelStr.substring(1) + ',' : ''}le="${bucket}"} ${bucketValues[bucket] || 0}\n`;
      }
      
      // Sum and count
      output += `${this.name}_sum${labelStr} ${this.sum.get(labels) || 0}\n`;
      output += `${this.name}_count${labelStr} ${this.count.get(labels) || 0}\n`;
    }
    
    return output;
  }
}

/**
 * Telemetry singleton
 */
class Telemetry extends EventEmitter {
  constructor() {
    super();
    this.startTime = Date.now();
    
    // Initialize counters
    this.counters = {
      prompt_received: new Counter('ai_core_prompt_received_total', 'Total prompts received'),
      agents_activated: new Counter('ai_core_agents_activated_total', 'Total agents activated', ['agent']),
      route_decision: new Counter('ai_core_route_decision_total', 'Route decisions', ['route', 'agent']),
      fallback_invoked: new Counter('ai_core_fallback_invoked_total', 'Fallback invocations', ['reason']),
      apply_attempt: new Counter('ai_core_apply_attempt_total', 'Apply attempts', ['result']),
      apply_result: new Counter('ai_core_apply_result_total', 'Apply results', ['result']),
      secret_detected: new Counter('ai_core_secret_detected_total', 'Secrets detected', ['type']),
      tokens_saved_estimate: new Counter('ai_core_tokens_saved_estimate_total', 'Estimated tokens saved'),
      auto_apply_attempt: new Counter('ai_core_auto_apply_attempt_total', 'Auto-apply attempts'),
      auto_apply_blocked: new Counter('ai_core_auto_apply_blocked_total', 'Auto-apply blocked (limit exceeded)'),
      auto_apply_alert: new Counter('ai_core_auto_apply_alert_total', 'Auto-apply alerts'),
    };
    
    // Initialize gauges
    this.gauges = {
      active_agents: new Gauge('ai_core_active_agents', 'Currently active agents'),
      score: new Gauge('ai_core_score_current', 'Current routing score', ['agent']),
      pending_proposals: new Gauge('ai_core_pending_proposals', 'Pending proposals count'),
      auto_apply_daily_count: new Gauge('ai_core_auto_apply_daily_count', 'Auto-apply count today'),
    };
    
    // Initialize histograms
    this.histograms = {
      latency_ms: new Histogram('ai_core_latency_ms', 'Operation latency in milliseconds'),
      score_distribution: new Histogram('ai_core_score_distribution', 'Score distribution'),
      apply_duration_ms: new Histogram('ai_core_apply_duration_ms', 'Apply operation duration'),
    };
  }

  // Counter methods
  incPromptReceived() {
    this.counters.prompt_received.inc();
    this.emit('prompt_received', { timestamp: Date.now() });
  }

  incAgentsActivated(agent) {
    this.counters.agents_activated.inc({ agent });
    this.emit('agents_activated', { agent, timestamp: Date.now() });
  }

  incRouteDecision(route, agent) {
    this.counters.route_decision.inc({ route, agent });
    this.emit('route_decision', { route, agent, timestamp: Date.now() });
  }

  incFallbackInvoked(reason) {
    this.counters.fallback_invoked.inc({ reason });
    this.emit('fallback_invoked', { reason, timestamp: Date.now() });
  }

  incApplyAttempt(result) {
    this.counters.apply_attempt.inc({ result });
    this.emit('apply_attempt', { result, timestamp: Date.now() });
  }

  incApplyResult(result, latencyMs) {
    this.counters.apply_result.inc({ result });
    this.histograms.apply_duration_ms.observe({}, latencyMs);
    this.emit('apply_result', { result, latencyMs, timestamp: Date.now() });
  }

  incSecretDetected(type) {
    this.counters.secret_detected.inc({ type });
    this.emit('secret_detected', { type, timestamp: Date.now() });
  }

  incTokensSavedEstimate(tokens) {
    this.counters.tokens_saved_estimate.inc({}, tokens);
    this.emit('tokens_saved_estimate', { tokens, timestamp: Date.now() });
  }

  // Auto-apply methods
  incAutoApplyAttempt() {
    this.counters.auto_apply_attempt.inc();
    this.emit('auto_apply_attempt', { timestamp: Date.now() });
  }

  incAutoApplyBlocked() {
    this.counters.auto_apply_blocked.inc();
    this.emit('auto_apply_blocked', { timestamp: Date.now() });
  }

  incAutoApplyAlert() {
    this.counters.auto_apply_alert.inc();
    this.emit('auto_apply_alert', { timestamp: Date.now() });
    console.error('[ALERT] Auto-apply daily limit exceeded!');
  }

  setAutoApplyDailyCount(count) {
    this.gauges.auto_apply_daily_count.set({}, count);
  }

  // Gauge methods
  setScore(agent, score) {
    this.gauges.score.set({ agent }, score);
    this.histograms.score_distribution.observe({ agent }, score);
    this.emit('score', { agent, score, timestamp: Date.now() });
  }

  setActiveAgents(count) {
    this.gauges.active_agents.set({}, count);
  }

  setPendingProposals(count) {
    this.gauges.pending_proposals.set({}, count);
  }

  // Histogram methods
  recordLatency(operation, latencyMs) {
    this.histograms.latency_ms.observe({ operation }, latencyMs);
    this.emit('latency', { operation, latencyMs, timestamp: Date.now() });
  }

  // Generate Prometheus metrics
  getMetrics() {
    let output = '';
    
    // Add process info
    output += `# HELP ai_core_info AI Core information\n`;
    output += `# TYPE ai_core_info gauge\n`;
    output += `ai_core_info{version="1.0.0",hostname="${os.hostname()}"} 1\n\n`;
    
    // Add uptime
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    output += `# HELP ai_core_uptime_seconds AI Core uptime in seconds\n`;
    output += `# TYPE ai_core_uptime_seconds gauge\n`;
    output += `ai_core_uptime_seconds ${uptime}\n\n`;
    
    // Add all counters
    for (const counter of Object.values(this.counters)) {
      output += counter.toPrometheus() + '\n';
    }
    
    // Add all gauges
    for (const gauge of Object.values(this.gauges)) {
      output += gauge.toPrometheus() + '\n';
    }
    
    // Add all histograms
    for (const histogram of Object.values(this.histograms)) {
      output += histogram.toPrometheus() + '\n';
    }
    
    return output;
  }

  // Get metrics as JSON (for debugging)
  getMetricsJSON() {
    const metrics = {
      counters: {},
      gauges: {},
      histograms: {},
      timestamp: new Date().toISOString()
    };
    
    for (const [name, counter] of Object.entries(this.counters)) {
      metrics.counters[name] = Object.fromEntries(counter.values);
    }
    
    for (const [name, gauge] of Object.entries(this.gauges)) {
      metrics.gauges[name] = Object.fromEntries(gauge.values);
    }
    
    return metrics;
  }

  // Reset all metrics (for testing)
  reset() {
    for (const counter of Object.values(this.counters)) {
      counter.values.clear();
    }
    for (const gauge of Object.values(this.gauges)) {
      gauge.values.clear();
    }
    for (const histogram of Object.values(this.histograms)) {
      histogram.values.clear();
      histogram.sum.clear();
      histogram.count.clear();
    }
    this.startTime = Date.now();
  }
}

// Singleton instance
const telemetry = new Telemetry();

export default telemetry;
export { Telemetry, Counter, Gauge, Histogram };
