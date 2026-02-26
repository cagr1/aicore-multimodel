/**
 * Dashboard Seed Script for Grafana
 * 
 * Run with: node scripts/dashboard-seed.js
 * 
 * This script provides dashboard configuration for Grafana to visualize
 * the Prometheus metrics exposed by the ai-core MCP server.
 */

const DASHBOARD_JSON = {
  "dashboard": {
    "title": "AI Core MCP Server",
    "uid": "ai-core-mcp",
    "timezone": "browser",
    "schemaVersion": 38,
    "version": 1,
    "refresh": "10s",
    "panels": [
      {
        "id": 1,
        "title": "Proposals Analyzed",
        "type": "stat",
        "gridPos": { "x": 0, "y": 0, "w": 6, "h": 4 },
        "targets": [
          {
            "expr": "sum(ai_core_proposals_analyzed_total)",
            "legendFormat": "Total"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": { "mode": "thresholds" },
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "value": 0, "color": "green" },
                { "value": 100, "color": "yellow" },
                { "value": 500, "color": "red" }
              ]
            }
          }
        }
      },
      {
        "id": 2,
        "title": "Proposals Generated",
        "type": "stat",
        "gridPos": { "x": 6, "y": 0, "w": 6, "h": 4 },
        "targets": [
          {
            "expr": "sum(ai_core_proposals_generated_total)",
            "legendFormat": "Total"
          }
        ]
      },
      {
        "id": 3,
        "title": "Apply Success Rate",
        "type": "gauge",
        "gridPos": { "x": 12, "y": 0, "w": 6, "h": 4 },
        "targets": [
          {
            "expr": "sum(rate(ai_core_apply_result_total{success=\"true\"}[5m])) / sum(rate(ai_core_apply_result_total[5m])) * 100",
            "legendFormat": "Success Rate %"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "min": 0,
            "max": 100,
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "value": 0, "color": "red" },
                { "value": 50, "color": "yellow" },
                { "value": 80, "color": "green" }
              ]
            },
            "unit": "percent"
          }
        }
      },
      {
        "id": 4,
        "title": "Proposal Analysis Latency",
        "type": "graph",
        "gridPos": { "x": 0, "y": 4, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(ai_core_analyze_latency_seconds_bucket[5m])) by (le))",
            "legendFormat": "p95"
          },
          {
            "expr": "histogram_quantile(0.50, sum(rate(ai_core_analyze_latency_seconds_bucket[5m])) by (le))",
            "legendFormat": "p50"
          }
        ],
        "yaxes": [
          { "format": "s", "label": "Latency" }
        ]
      },
      {
        "id": 5,
        "title": "Apply Latency",
        "type": "graph",
        "gridPos": { "x": 12, "y": 4, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(ai_core_apply_latency_seconds_bucket[5m])) by (le))",
            "legendFormat": "p95"
          },
          {
            "expr": "histogram_quantile(0.50, sum(rate(ai_core_apply_latency_seconds_bucket[5m])) by (le))",
            "legendFormat": "p50"
          }
        ],
        "yaxes": [
          { "format": "s", "label": "Latency" }
        ]
      },
      {
        "id": 6,
        "title": "Proposals by Agent Type",
        "type": "piechart",
        "gridPos": { "x": 0, "y": 12, "w": 8, "h": 8 },
        "targets": [
          {
            "expr": "sum(ai_core_proposals_generated_total) by (agent)",
            "legendFormat": "{{agent}}"
          }
        ]
      },
      {
        "id": 7,
        "title": "Secrets Detected",
        "type": "stat",
        "gridPos": { "x": 8, "y": 12, "w": 8, "h": 4 },
        "targets": [
          {
            "expr": "sum(ai_core_secrets_detected_total)",
            "legendFormat": "Total"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": { "mode": "thresholds" },
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "value": 0, "color": "green" },
                { "value": 1, "color": "orange" },
                { "value": 5, "color": "red" }
              ]
            }
          }
        }
      },
      {
        "id": 8,
        "title": "Memory Entries",
        "type": "stat",
        "gridPos": { "x": 16, "y": 12, "w": 8, "h": 4 },
        "targets": [
          {
            "expr": "ai_core_memory_entries",
            "legendFormat": "Entries"
          }
        ]
      },
      {
        "id": 9,
        "title": "Scan Errors",
        "type": "stat",
        "gridPos": { "x": 8, "y": 16, "w": 8, "h": 4 },
        "targets": [
          {
            "expr": "sum(ai_core_scan_errors_total)",
            "legendFormat": "Errors"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": { "mode": "thresholds" },
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "value": 0, "color": "green" },
                { "value": 1, "color": "red" }
              ]
            }
          }
        }
      }
    ],
    "templating": {
      "list": []
    },
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "timepicker": {
      "refresh_intervals": ["5s", "10s", "30s", "1m", "5m"]
    }
  }
};

// Generate curl commands to import the dashboard
function generateImportCommands() {
  const dashboardJson = JSON.stringify(DASHBOARD_JSON, null, 2);
  
  console.log('# =============================================');
  console.log('# AI Core MCP Server - Grafana Dashboard');
  console.log('# =============================================\n');
  
  console.log('# Option 1: Import via Grafana UI');
  console.log('# 1. Open Grafana at http://localhost:3000');
  console.log('# 2. Go to Dashboards -> Import');
  console.log('# 3. Paste the dashboard JSON below\n');
  
  console.log('# Option 2: Import via API');
  console.log('# Run these commands:\n');
  
  console.log('## Create API key (if needed)');
  console.log('# curl -X POST "http://admin:admin@localhost:3000/api/auth/keys" \\');
  console.log('#   -H "Content-Type: application/json" \\');
  console.log('#   -d \'{"name": "grafana-api", "role": "Admin"}\'\n');
  
  console.log('## Import dashboard');
  console.log('DASHBOARD_JSON=\'' + dashboardJson + '\'');
  console.log('curl -X POST "http://admin:admin@localhost:3000/api/dashboards/db" \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d "$DASHBOARD_JSON"\n');
  
  console.log('# =============================================');
  console.log('# Dashboard JSON (copy from here):');
  console.log('# =============================================\n');
  
  console.log(dashboardJson);
}

// Generate Prometheus recording rules
function generateRecordingRules() {
  console.log('\n# =============================================');
  console.log('# Prometheus Recording Rules');
  console.log('# Add to prometheus.yml');
  console.log('# =============================================\n');
  
  const rules = {
    groups: [{
      name: 'ai_core_mcp',
      interval: '30s',
      rules: [
        {
          expr: 'sum(rate(ai_core_proposals_analyzed_total[5m]))',
          record: 'ai_core:proposals_analyzed:rate5m'
        },
        {
          expr: 'sum(rate(ai_core_proposals_generated_total[5m]))',
          record: 'ai_core:proposals_generated:rate5m'
        },
        {
          expr: 'sum(rate(ai_core_apply_result_total{success="true"}[5m])) / sum(rate(ai_core_apply_result_total[5m]))',
          record: 'ai_core:apply_success_rate:rate5m'
        },
        {
          expr: 'sum(ai_core_apply_latency_seconds_sum) / sum(ai_core_apply_latency_seconds_count)',
          record: 'ai_core:apply_latency_seconds:avg'
        },
        {
          expr: 'sum(ai_core_analyze_latency_seconds_sum) / sum(ai_core_analyze_latency_seconds_count)',
          record: 'ai_core:analyze_latency_seconds:avg'
        }
      ]
    }]
  };
  
  console.log(JSON.stringify(rules, null, 2));
}

// Main
if (require.main === module) {
  generateImportCommands();
  generateRecordingRules();
  
  console.log('\n# =============================================');
  console.log('# Setup Instructions');
  console.log('# =============================================\n');
  console.log('1. Start the MCP server with metrics:');
  console.log('   npm run start:metrics');
  console.log('   # or');
  console.log('   node src/metrics-server.js');
  console.log('\n2. Configure Prometheus to scrape metrics:');
  console.log('   Add to prometheus.yml:');
  console.log('   - job_name: "ai-core-mcp"');
  console.log('     static_configs:');
  console.log('       - targets: ["localhost:9091"]');
  console.log('\n3. Import the dashboard in Grafana');
  console.log('\n4. Metrics will be available at: http://localhost:9091/metrics');
}

module.exports = { DASHBOARD_JSON };
